import {CommandConcurrency} from "./CommandOptions";

export type CommandTracePhase = "message" | "queued" | "skipped" | "guard" | "started" | "completed" | "cancelled" | "failed";

/** No payloads or component references are retained by the framework's tracer. */
export type CommandTraceEvent = {
    readonly phase: CommandTracePhase;
    readonly mapperId: number;
    readonly messageId?: number;
    readonly message?: string;
    readonly mappingId?: number;
    readonly executionId?: number;
    readonly command?: string;
    readonly concurrency?: CommandConcurrency;
    readonly guard?: string;
    readonly allowed?: boolean;
    readonly reason?: string;
    readonly durationMs?: number;
    readonly error?: unknown;
};

export type CommandTrace = (event: CommandTraceEvent) => void | PromiseLike<void>;
