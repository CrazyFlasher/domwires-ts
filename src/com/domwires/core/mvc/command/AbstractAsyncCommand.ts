import {AbstractCommand} from "./AbstractCommand";
import {IAsyncCommand} from "./IAsyncCommand";

export class AbstractAsyncCommand extends AbstractCommand implements IAsyncCommand
{
    protected resolve!: () => void;

    public executeAsync(): Promise<void>
    {
        /* eslint-disable-next-line @typescript-eslint/no-this-alias */
        const that = this;

        return new Promise<void>((resolve: () => void) =>
        {
            that.resolve = resolve;

            that.execute();
        });
    }

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public isIAsyncCommand(): void {}
}