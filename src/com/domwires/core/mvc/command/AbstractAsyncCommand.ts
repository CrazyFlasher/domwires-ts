import {AbstractCommand} from "./AbstractCommand";
import {IAsyncCommand} from "./IAsyncCommand";

export class AbstractAsyncCommand extends AbstractCommand implements IAsyncCommand
{
    protected resolve!: () => void;
    protected reject!: (reason?: unknown) => void;

    public executeAsync(): Promise<void>
    {
        return new Promise<void>((resolve: () => void, reject: (reason?: unknown) => void) =>
        {
            this.resolve = resolve;
            this.reject = reject;

            // an exception, thrown by execute(), rejects the promise as well
            this.execute();
        });
    }
}
