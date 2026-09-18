import {ICommand} from "./ICommand";

export interface IAsyncCommand extends ICommand
{
    executeAsync(): Promise<void>;
}
