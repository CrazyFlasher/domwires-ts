/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-this-alias */

import {AbstractCommand} from "./AbstractCommand";
import {IAsyncCommand} from "./IAsyncCommand";

export class AbstractAsyncCommand extends AbstractCommand implements IAsyncCommand
{
    protected resolve!: () => void;

    public executeAsync(): Promise<void>
    {
        const that = this;

        return new Promise<void>((resolve: () => void) =>
        {
            that.resolve = resolve;

            that.execute();
        });
    }

    public isIAsyncCommand(): void
    {
    }
}