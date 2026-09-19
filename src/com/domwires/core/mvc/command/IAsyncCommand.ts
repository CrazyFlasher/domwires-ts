import {ICommand} from "./ICommand";

/** Callback-style asynchronous command bridge; native async ICommand implementations also work. */
export interface IAsyncCommand extends ICommand
{
    /**
     * Starts the callback-style execution and resolves/rejects when the command signals completion.
     */
    executeAsync(): Promise<void>;
}
