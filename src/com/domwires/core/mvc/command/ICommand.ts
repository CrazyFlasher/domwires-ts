import type {CommandExecution} from "./CommandExecution";

/** One invocation. Both synchronous and native async implementations are supported. */
/** One application action with an invocation-local scope and cooperative cancellation. */
export interface ICommand<Input = unknown>
{
    /**
     * Runs with typed input and execution metadata; returns void or a promise-like completion.
     * Pass execution.signal to asynchronous adapters and use execution.commit() before late model updates.
     * Thrown errors and rejected results stop this dispatch chain and are reported by settle().
     */
    execute: (input: Input, execution: CommandExecution) => void | PromiseLike<void>;
}
