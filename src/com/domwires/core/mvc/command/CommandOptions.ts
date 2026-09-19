import {Class} from "../../Global";
import {IGuards} from "./IGuards";
import {IMessageDispatcherImmutable} from "../message/IMessageDispatcher";

/** Fresh instance per invocation, or one non-overlapping instance per class and mapper. */
export type CommandLifetime = "execution" | "context";
/** Per-mapping policy for repeated dispatches; direct execute() calls have no mapping queue. */
export type CommandConcurrency = "parallel" | "serial" | "latest" | "drop";
/** Shallow mapping-data override, or mapping data only when message data is undefined. */
export type CommandDataMode = "merge" | "fallback";
/** Object defaults may supply a subset of input fields; primitive defaults must match the input. */
export type CommandMappingData<T> = T extends object ? Partial<T> : T;

/** Guards, instance lifetime and cancellation for a direct invocation. */
export type CommandOptions = {
    /** Defaults to the mapper setting, then execution. Context instances reject overlapping use. */
    readonly lifetime?: CommandLifetime;
    /** Every guard must allow execution. Evaluated synchronously in the invocation scope. */
    readonly guards?: readonly Class<IGuards>[];
    /** Every opposite guard must deny execution. */
    readonly guardsNot?: readonly Class<IGuards>[];
    /** Original sender for direct invocations and target guards. */
    readonly target?: IMessageDispatcherImmutable;
    /** External cooperative cancellation, linked to the invocation signal. */
    readonly signal?: AbortSignal;
};

/** Registration options. Mapping disposal supplies cancellation for mapped invocations. */
export type CommandMappingOptions<T> = Omit<CommandOptions, "target" | "signal"> & {
    /** Defaults or overrides composed with the dispatched payload according to dataMode. */
    readonly data?: CommandMappingData<T>;
    /** Defaults to the mapper setting, then merge. Neither mode deep-clones input. */
    readonly dataMode?: CommandDataMode;
    /** Consume before the first allowed execution. Guard rejection does not consume the mapping. */
    readonly once?: boolean;
    /** Stop this dispatch chain after an allowed execution; a batch applies this to its final command. */
    readonly stopOnExecute?: boolean;
    /** Defaults to parallel. latest requires execution lifetime. Each mapping owns its own queue. */
    readonly concurrency?: CommandConcurrency;
};

/** Required inputs stay required; inputs accepting undefined may be omitted. */
export type CommandArguments<T> = undefined extends T
    ? [input?: NoInfer<T>, options?: CommandOptions]
    : [input: NoInfer<T>, options?: CommandOptions];

/** Cancellation is an expected outcome; cleanup errors still count as failures. */
export class CommandCancelledError extends Error
{
    public constructor(public readonly reason?: unknown)
    {
        super("Command cancelled", {cause: reason});
        this.name = "AbortError";
    }
}
