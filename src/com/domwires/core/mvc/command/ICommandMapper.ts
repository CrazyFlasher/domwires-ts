/* eslint-disable unicorn/no-useless-spread -- Registrations and abort listeners may mutate collections. */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-type-assertion/no-type-assertion */
import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {Enum} from "../../Enum";
import {Class, setDefaultImplementation} from "../../Global";
import {ICommand} from "./ICommand";
import {MessageType} from "../message/IMessageDispatcher";
import {IMessage} from "../message/IMessage";
import {CommandArguments, CommandDataMode, CommandLifetime, CommandMappingOptions, CommandCancelledError, CommandOptions} from "./CommandOptions";
import {MappingConfig, MappingConfigList} from "./CommandMapping";
import {CommandTrace, CommandTraceEvent} from "./CommandTrace";
import {AbstractDisposable} from "../../common/AbstractDisposable";
import {TaskTracker} from "../../common/TaskTracker";
import {inject, optional} from "../../di/Decorators";
import {IFactory} from "../../factory/IFactory";
import {SERVICE_IDENTIFIER} from "../../Decorators";
import {CommandExecution, COMMAND_EXECUTION, COMMAND_INPUT} from "./CommandExecution";

/** Defaults injected under the CommandMapperConfig identifier; individual mappings may override them. */
export type CommandMapperConfig = {
    /** Default command lifetime; execution when omitted. */
    readonly defaultLifetime?: CommandLifetime;
    /** Default payload/default composition; merge when omitted. */
    readonly defaultDataMode?: CommandDataMode;
    /** Initial observer, overridden by assigning the mapper's trace property. */
    readonly trace?: CommandTrace;
};

export type MappedMessages = MessageType<any> | readonly MessageType<any>[];
export type MappedPayload<M> = M extends readonly (infer E)[] ? MappedPayload<E> : M extends MessageType<infer T> ? T : never;
export type MappedCommands<T> = Class<ICommand<T>> | readonly Class<ICommand<T>>[];
export type MappingResult<M, C> = M extends readonly unknown[] ? MappingConfigList<MappedPayload<M>> :
    C extends readonly unknown[] ? MappingConfigList<MappedPayload<M>> : MappingConfig<MappedPayload<M>>;

/** Read access to command registrations, pending work and trace diagnostics. */
export interface ICommandMapperImmutable extends IDisposableImmutable
{
    /**
     * Whether at least one live registration exists for this exact message identity.
     */
    hasMapping(messageType: Enum): boolean;
    /**
     * Number of tracked, unfinished dispatch chains and direct executions; completed work is released.
     */
    readonly pendingCount: number;
    /**
     * Process-local identity used to correlate trace events from this mapper.
     */
    readonly mapperId: number;
    /**
     * Cumulative synchronous and asynchronous observer failures; observers never fail a command.
     */
    readonly traceErrorCount: number;
}
/** Maps typed messages to commands and owns command execution lifetimes. */
export interface ICommandMapper extends ICommandMapperImmutable, IDisposable
{
    /**
     * Registers every selected message/command pair in order. Required input is checked against each message.
     * Each registration has its own concurrency queue. Guards run when an invocation starts.
     * @param options - Defaults: execution lifetime, parallel concurrency, shallow data merge.
     * @returns A disposable mapping, or a group handle when either argument is an array.
     * @throws If disposed, or latest concurrency is combined with context lifetime.
     */
    map<M extends MappedMessages, C extends MappedCommands<NoInfer<MappedPayload<M>>>>(
        messages: M, commands: C, options?: CommandMappingOptions<NoInfer<MappedPayload<M>>>): MappingResult<M, C>;
    /**
     * Runs a command directly, including guards and invocation-scoped injection.
     * Synchronous command code runs before this method returns.
     * @returns A promise rejected on command/cleanup failure or cancellation. Guard rejection resolves normally.
     * Failures are also reported by the next settle(); handling this promise does not consume that report.
     */
    execute<T>(command: Class<ICommand<T>>, ...args: CommandArguments<T>): Promise<void>;
    /**
     * Routes an existing delivery frame through a snapshot of its mappings.
     * Application code normally uses typed dispatchMessage(). An asynchronous mapping delays the next mapping
     * in this dispatch chain; failure or cancellation stops that chain. Other dispatches remain independent.
     */
    route(message: IMessage): Promise<void>;
    /**
     * Optional observer. No history is retained; asynchronous observers are not included in settle().
     */
    trace: CommandTrace | undefined;
    /**
     * Waits until currently tracked work and work started by it drain.
     * Rejects with AggregateError for buffered command/cleanup failures, then clears that failure buffer.
     * Expected CommandCancelledError outcomes are excluded. Concurrent calls share the same wait.
     * This does not stop resources that may dispatch new work later.
     */
    settle(): Promise<void>;
    /**
     * Removes the first registration for this message/class pair and cancels its active and queued work.
     * Use the returned mapping handle to remove a particular duplicate registration.
     */
    unmap(messageType: Enum, commandClass: Class<ICommand<any>>): ICommandMapper;
    /**
     * Removes all mappings and cancels their work. Direct executions are unaffected.
     * Retained command instances remain owned by the mapper until mapper disposal.
     */
    clear(): ICommandMapper;
    /**
     * Removes every mapping for this message identity and cancels their active and queued work.
     */
    unmapAll(messageType: Enum): ICommandMapper;
}
export {MappingConfig, MappingConfigList} from "./CommandMapping";
export * from "./CommandOptions";
export * from "./CommandTrace";

const COMPLETED = Promise.resolve();
let nextMapperId = 0;
type TraceDetails = Omit<CommandTraceEvent, "phase" | "mapperId">;

/** Default command router and invocation owner. Construct through a factory supplying IFactory. */
export class CommandMapper extends AbstractDisposable implements ICommandMapper
{
    public readonly mapperId = ++nextMapperId;
    @inject("CommandMapperConfig") @optional()
    private config: CommandMapperConfig = {};
    @inject("IFactory")
    private factory!: IFactory;
    private readonly commandMap = new Map<Enum, MappingConfig<any>[]>();
    private readonly retainedCommands = new Map<Class<ICommand<any>>, ICommand<any>>();
    private readonly busy = new Set<ICommand<any>>();
    private readonly controllers = new Set<AbortController>();
    private readonly tasks = new TaskTracker(error => error instanceof CommandCancelledError);
    private traceOverride?: CommandTrace;
    private hasTraceOverride = false;
    private traceErrors = 0;

    public get trace(): CommandTrace | undefined { return this.hasTraceOverride ? this.traceOverride : this.config.trace; }
    public set trace(value: CommandTrace | undefined) { this.hasTraceOverride = true; this.traceOverride = value; }
    public get traceErrorCount(): number { return this.traceErrors; }
    public get pendingCount(): number { return this.tasks.size; }
    public settle(): Promise<void> { return this.tasks.settle(); }

    private emit(phase: CommandTraceEvent["phase"], details: TraceDetails): void
    {
        try
        {
            const result = this.trace?.({phase, mapperId: this.mapperId, ...details});
            if (result && typeof result.then === "function")
                Promise.resolve(result).catch(() => { this.traceErrors++; });
        }
        catch { this.traceErrors++; }
    }

    public map<M extends MappedMessages, C extends MappedCommands<NoInfer<MappedPayload<M>>>>(
        messages: M, commands: C, options: CommandMappingOptions<NoInfer<MappedPayload<M>>> = {}): MappingResult<M, C>
    {
        if (this.isDisposed) throw new Error("Command mapper already disposed");
        if ((options.lifetime ?? this.config.defaultLifetime) === "context" && options.concurrency === "latest")
            throw new Error("latest requires execution lifetime; a cancelled context command may still be running");
        const batch = Array.isArray(messages) || Array.isArray(commands);
        const result = new MappingConfigList<MappedPayload<M>>();
        let single!: MappingConfig<MappedPayload<M>>;
        const commandList: readonly Class<ICommand<any>>[] = Array.isArray(commands) ? commands : [commands];
        const messageList: readonly Enum[] = Array.isArray(messages) ? messages : [messages];
        for (const message of messageList)
            commandList.forEach((command, index) => {
                const list = this.commandMap.get(message) ?? [];
                this.commandMap.set(message, list);
                const mapping = MappingConfig.create<MappedPayload<M>>(command, {...options,
                    stopOnExecute: options.stopOnExecute && index === commandList.length - 1}, () => {
                    const position = list.indexOf(mapping);
                    if (position >= 0) list.splice(position, 1);
                    if (!list.length && this.commandMap.get(message) === list) this.commandMap.delete(message);
                });
                list.push(mapping); result.push(mapping); single = mapping;
            });
        return (batch ? result : single) as MappingResult<M, C>;
    }

    public unmap(messageType: Enum, commandClass: Class<ICommand<any>>): this
    { this.commandMap.get(messageType)?.find(mapping => mapping.commandClass === commandClass)?.dispose(); return this; }
    public hasMapping(messageType: Enum): boolean { return !!this.commandMap.get(messageType)?.length; }
    public clear(): this
    {
        for (const list of [...this.commandMap.values()]) for (const mapping of [...list]) mapping.dispose();
        return this;
    }
    public unmapAll(messageType: Enum): this
    { for (const mapping of [...(this.commandMap.get(messageType) ?? [])]) mapping.dispose(); return this; }

    public route(message: IMessage): Promise<void>
    {
        if (this.trace) this.emit("message", {messageId: message.id, message: message.type.name});
        if (this.isDisposed) return COMPLETED;
        const mappings = [...(this.commandMap.get(message.type) ?? [])];
        let index = 0;
        const next = (): void | Promise<void> => {
            while (index < mappings.length && !this.isDisposed)
            {
                const mapping = mappings[index++]!;
                if (mapping.isDisposed) continue;
                const trace: TraceDetails | undefined = this.trace ? {messageId: message.id, message: message.type.name,
                    mappingId: mapping.id, command: mapping.commandClass.name, concurrency: mapping.scheduler.policy} : undefined;
                if (trace && mapping.scheduler.busy && mapping.scheduler.policy === "serial") this.emit("queued", trace);
                if (trace && mapping.scheduler.busy && mapping.scheduler.policy === "drop") this.emit("skipped", {...trace, reason: "busy"});
                let entered = false;
                const result = mapping.scheduler.schedule(controller => {
                    entered = true;
                    if (mapping.isDisposed || this.isDisposed) return false;
                    const data = this.mergeData(message.data, mapping.data, mapping.options.dataMode);
                    return this.run(mapping.commandClass, data, {...mapping.options,
                        guards: mapping.guardList, guardsNot: mapping.oppositeGuardList, target: message.initialTarget},
                        controller, trace, mapping.verifyTarget, () => { if (mapping.once) mapping.consume(); });
                });
                if (result instanceof Promise)
                    return result.then(allowed => allowed && mapping.stopOnExecute ? undefined : next(), error => {
                        if (trace && !entered) this.emit(error instanceof CommandCancelledError ? "cancelled" : "failed", {...trace, error});
                        throw error;
                    });
                if (result && mapping.stopOnExecute) return;
            }
        };
        try { const pending = next(); return pending ? this.tasks.track(pending) : COMPLETED; }
        catch (error) { return this.tasks.track(Promise.reject(error)); }
    }

    public execute<T>(command: Class<ICommand<T>>, ...args: CommandArguments<T>): Promise<void>
    {
        try
        {
            const result = this.run(command, args[0], args[1] ?? {}, new AbortController(),
                this.trace ? {command: command.name} : undefined);
            return result instanceof Promise ? this.tasks.track(result.then(() => undefined)) : COMPLETED;
        }
        catch (error) { return this.tasks.track(Promise.reject(error)); }
    }

    private run(commandClass: Class<ICommand<any>>, data: unknown, options: CommandOptions,
        controller: AbortController, trace?: TraceDetails, verifyTarget?: {target: unknown; equals: boolean},
        beforeExecute?: () => void): boolean | Promise<boolean>
    {
        if (this.isDisposed) throw new CommandCancelledError("mapper disposed");
        const scope = this.factory.createScope();
        const execution = new CommandExecution(scope, controller.signal, options.target);
        this.controllers.add(controller);
        const abort = (): void => controller.abort(options.signal?.reason);
        options.signal?.addEventListener("abort", abort, {once: true});
        if (options.signal?.aborted) abort();
        const details = trace ? {...trace, executionId: execution.id} : undefined;
        const started = details ? performance.now() : 0;
        let command: ICommand<any> | undefined, acquired = false, cleaned = false;
        const retained = (options.lifetime ?? this.config.defaultLifetime ?? "execution") === "context";
        const cleanup = (): void => {
            if (cleaned) return;
            cleaned = true;
            options.signal?.removeEventListener("abort", abort);
            this.controllers.delete(controller);
            try {
                if (command && acquired) {
                    this.busy.delete(command);
                    if (!retained || this.isDisposed) this.disposeCommand(command);
                }
            } finally { scope.dispose(); }
        };
        const finish = (allowed: boolean, error?: unknown, failed = false): boolean => {
            let failure = failed ? (controller.signal.aborted && (error === controller.signal.reason ||
                error instanceof CommandCancelledError || (error instanceof Error && error.name === "AbortError"))
                ? new CommandCancelledError(controller.signal.reason) : error) : undefined;
            if (!failed && controller.signal.aborted) { failed = true; failure = new CommandCancelledError(controller.signal.reason); }
            try { cleanup(); }
            catch (cleanupError) { failure = failed ? new AggregateError([failure, cleanupError], "Command and cleanup failed") : cleanupError; failed = true; }
            if (details) this.emit(failed ? failure instanceof CommandCancelledError ? "cancelled" : "failed" : allowed ? "completed" : "skipped",
                {...details, durationMs: performance.now() - started, ...(failed ? {error: failure} : !allowed ? {reason: "guard"} : {})});
            if (failed) throw failure;
            return allowed;
        };
        try
        {
            execution.throwIfCancelled();
            scope.mapToValue("IFactory", scope);
            scope.mapToValue(COMMAND_EXECUTION, execution);
            scope.mapToValue(COMMAND_INPUT, data);
            for (const key of Object.keys(Object(data))) this.mapPropertyValue(scope, Reflect.get(Object(data), key), key);
            if (options.target && !Object.prototype.hasOwnProperty.call(Object(data), "target"))
                this.mapPropertyValue(scope, options.target, "target");
            let allowed = !verifyTarget || (verifyTarget.target === options.target) === verifyTarget.equals;
            for (const [types, opposite] of [[options.guards ?? [], false], [options.guardsNot ?? [], true]] as const)
                for (const type of types) {
                    if (!allowed) break;
                    allowed = scope.getInstance(type).allows !== opposite;
                    if (details) this.emit("guard", {...details, guard: type.name, allowed});
                }
            if (!allowed) return finish(false);
            command = retained ? this.retainedCommands.get(commandClass) : undefined;
            if (command && this.busy.has(command)) throw new Error("A context command cannot overlap itself: " + commandClass.name);
            if (command) scope.injector.injectInto(command);
            else {
                command = scope.instantiateValueUnmapped(commandClass);
                if (retained) this.retainedCommands.set(commandClass, command);
            }
            this.busy.add(command); acquired = true;
            beforeExecute?.();
            execution.throwIfCancelled();
            if (details) this.emit("started", details);
            execution.throwIfCancelled();
            const callbackExecute = Reflect.get(command, "executeAsync");
            const returned = typeof callbackExecute === "function" ? callbackExecute.call(command) : command.execute(data, execution);
            if (returned && typeof returned.then === "function")
                return Promise.resolve(returned).then(() => finish(true), error => finish(true, error, true));
            return finish(true);
        }
        catch (error) { if (cleaned) throw error; return finish(false, error, true); }
    }

    public override dispose(): void
    {
        if (this.isDisposed) return;
        // Mark first: abort listeners must not start new work while disposal is in progress.
        super.dispose();
        for (const controller of [...this.controllers]) controller.abort("mapper disposed");
        this.clear();
        const errors: unknown[] = [];
        for (const command of this.retainedCommands.values())
            try { if (!this.busy.has(command)) this.disposeCommand(command); } catch (error) { errors.push(error); }
        this.retainedCommands.clear();
        if (errors.length) throw new AggregateError(errors, "Command disposal failed");
    }

    private disposeCommand(command: ICommand<any>): void
    {
        const dispose = Reflect.get(command, "dispose");
        if (typeof dispose === "function" && !Reflect.get(command, "isDisposed")) dispose.call(command);
    }
    private mergeData(messageData: unknown, mappingData: unknown, mode = this.config.defaultDataMode ?? "merge"): unknown
    {
        if (mode === "fallback") return messageData === undefined ? mappingData : messageData;
        if (mappingData === undefined) return messageData;
        if (messageData === undefined) return mappingData;
        if (messageData !== null && mappingData !== null && typeof messageData === "object" && typeof mappingData === "object")
            return {...messageData, ...mappingData};
        return mappingData;
    }
    private mapPropertyValue(scope: IFactory, value: any, name: string): void
    {
        const constructor = value?.constructor;
        const identifier = constructor?.[SERVICE_IDENTIFIER];
        const typeName = typeof identifier === "string" && identifier ? identifier : constructor?.name;
        const type = typeName === "String" ? "string" : typeName === "Number" ? "number" :
            typeName === "Boolean" ? "boolean" : !typeName || typeName === "Object" ? "any" : typeName;
        scope.mapToValue(type, value, name);
        if (typeof constructor === "function") scope.mapToValue(constructor, value, name);
    }
}
setDefaultImplementation<ICommandMapper>("ICommandMapper", CommandMapper);
