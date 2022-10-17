import {ICommand} from "./ICommand";

export interface IAsyncCommand extends ICommand
{
    isIAsyncCommand(): void;

    executeAsync(): Promise<void>;
}