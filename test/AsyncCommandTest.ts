import {Suite} from "mocha";
import {expect} from "chai";
import {AbstractAsyncCommand, AbstractCommand, AbstractContext, Factory, IAsyncCommand, MessageType} from "../src";

class AsyncMessage extends MessageType
{
    public static readonly DO_ASYNC: AsyncMessage = new AsyncMessage("DO_ASYNC");
}

class RejectingCommand extends AbstractAsyncCommand
{
    public override execute(): void
    {
        this.reject(new Error("async command error"));
    }
}

class HandMadeAsyncCommand implements IAsyncCommand
{
    public static completed = 0;

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public execute(): void
    {
    }

    public executeAsync(): Promise<void>
    {
        return new Promise<void>((resolve: () => void) =>
        {
            setTimeout(() =>
            {
                HandMadeAsyncCommand.completed++;
                resolve();
            }, 10);
        });
    }
}

class AsyncContext extends AbstractContext
{
    protected override init(): void
    {
        super.init();

        this.map(AsyncMessage.DO_ASYNC, RejectingCommand);
    }
}

describe('AsyncCommandTest', function (this: Suite)
{
    let factory: Factory;

    beforeEach(() =>
    {
        factory = new Factory();
        factory.mapToValue("IFactory", factory);
    });

    afterEach(() =>
    {
        if (!factory.isDisposed) factory.dispose();
    });

    it('testRejectedAsyncCommandRejectsSettle', async () =>
    {
        const context: AsyncContext = factory.getInstance<AsyncContext>(AsyncContext);

        context.dispatchMessage(AsyncMessage.DO_ASYNC);

        let error: unknown = undefined;

        await context.settle().catch((e: unknown) =>
        {
            error = e;
        });

        expect(error).instanceof(Error);
        expect(error instanceof Error ? error.message : "").equals("async command error");
    });

    it('testCommandWithoutBaseClassIsAwaited', async () =>
    {
        HandMadeAsyncCommand.completed = 0;

        const context: AsyncContext = factory.getInstance<AsyncContext>(AsyncContext);

        await context.executeCommand(HandMadeAsyncCommand);

        expect(HandMadeAsyncCommand.completed).equals(1);
    });

    it('testSynchronousCommandIsExecutedInsideDispatch', () =>
    {
        class CountingCommand extends AbstractCommand
        {
            public static executions = 0;

            public override execute(): void
            {
                CountingCommand.executions++;
            }
        }

        const context: AsyncContext = factory.getInstance<AsyncContext>(AsyncContext);

        context.executeCommand(CountingCommand);

        expect(CountingCommand.executions).equals(1);
    });
});
