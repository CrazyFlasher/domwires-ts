/* eslint-disable @typescript-eslint/no-explicit-any */
import {Class} from "../../Global";
import {ICommand} from "./ICommand";
import {IGuards} from "./IGuards";
import {CommandMappingOptions, CommandMappingData} from "./CommandOptions";
import {CommandScheduler} from "./CommandScheduler";

let nextMappingId = 0;
/** Disposable registration returned by map(); fluent guard additions affect this registration only. */
export class MappingConfig<T>
{
    /** Process-local registration identity included in trace events. */
    public readonly id = ++nextMappingId;
    private disposed = false;
    /** Whether explicitly removed or automatically consumed by once. */
    public get isDisposed(): boolean { return this.disposed; }
    /** @internal Per-registration execution scheduler. */
    public readonly scheduler: CommandScheduler;
    /** @internal Use addGuards() to append a guard. */
    public readonly guardList: Class<IGuards>[];
    /** @internal Use addGuardsNot() to append an opposite guard. */
    public readonly oppositeGuardList: Class<IGuards>[];
    /** @internal Use addTargetGuards() to set the target condition. */
    public verifyTarget?: {target: unknown; equals: boolean};

    /** Registrations are constructed by map(). */
    private constructor(public readonly commandClass: Class<ICommand<any>>,
        public readonly options: CommandMappingOptions<T>, private onDispose?: () => void)
    {
        this.scheduler = new CommandScheduler(options.concurrency ?? "parallel");
        this.guardList = [...(options.guards ?? [])];
        this.oppositeGuardList = [...(options.guardsNot ?? [])];
    }
    /** @internal Constructs a registration owned by the mapper. */
    public static create<T>(commandClass: Class<ICommand<any>>, options: CommandMappingOptions<T>,
        onDispose?: () => void): MappingConfig<T>
    {
        return new MappingConfig(commandClass, options, onDispose);
    }
    /** Mapping payload defaults/overrides, composed according to dataMode. */
    public get data(): CommandMappingData<T> | undefined { return this.options.data; }
    /** Whether the first allowed invocation consumes this registration. */
    public get once(): boolean { return !!this.options.once; }
    /** Whether an allowed invocation stops the rest of its dispatch chain. */
    public get stopOnExecute(): boolean { return !!this.options.stopOnExecute; }
    /** Appends a synchronous guard that must allow execution. */
    public addGuards(value: Class<IGuards>): this { this.guardList.push(value); return this; }
    /** Appends a synchronous guard that must deny execution. */
    public addGuardsNot(value: Class<IGuards>): this { this.oppositeGuardList.push(value); return this; }
    /** Requires sender identity to match target, or to differ when equals is false. */
    public addTargetGuards(target: unknown, equals = true): this { this.verifyTarget = {target, equals}; return this; }

    /** Removes this exact registration and cancels its active/queued work. Idempotent. */
    public dispose(): void { this.remove(true); }
    /** @internal Reserve once before user code can recursively dispatch the same message. */
    public consume(): void { this.remove(false); }
    private remove(abort: boolean): void
    {
        if (this.disposed) return;
        this.disposed = true;
        const remove = this.onDispose;
        this.onDispose = undefined;
        remove?.();
        this.scheduler.close(abort);
    }
}

/** Group handle returned when map() receives an array of messages or commands. */
export class MappingConfigList<T>
{
    private readonly list: MappingConfig<T>[] = [];
    /** @internal Adds a registration while constructing a batch. */
    public push(item: MappingConfig<T>): void { this.list.push(item); }
    /** Removes every registration in this batch and cancels their work. Idempotent. */
    public dispose(): void { for (const item of this.list) item.dispose(); }
    /** Appends an allowing guard to every registration in this batch. */
    public addGuards(value: Class<IGuards>): this { for (const item of this.list) item.addGuards(value); return this; }
    /** Appends an opposite guard to every registration in this batch. */
    public addGuardsNot(value: Class<IGuards>): this { for (const item of this.list) item.addGuardsNot(value); return this; }
    /** Applies the same sender-identity condition to every registration in the batch. */
    public addTargetGuards(target: unknown, equals = true): this
    { for (const item of this.list) item.addTargetGuards(target, equals); return this; }
}
