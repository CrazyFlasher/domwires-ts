/* eslint-disable unicorn/no-useless-spread -- Snapshots protect iteration from removal and reentrant registration. */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {inject, optional, postConstruct} from "../../di/Decorators";
import {Factory, IFactory} from "../../factory/IFactory";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainerImmutable
} from "../hierarchy/IHierarchyObjectContainer";
import {ContextConfigBuilder} from "./ContextConfigBuilder";
import {IContext, IContextImmutable} from "./IContext";
import {CommandMapper, ICommandMapper, CommandMappingOptions, CommandArguments, MappedMessages, MappedPayload, MappedCommands, MappingResult, CommandTrace} from "../command/ICommandMapper";
import {Enum} from "../../Enum";
import {IMessageDispatcher, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";
import {IMessage, messageAtTarget} from "../message/IMessage";
import {Class, Type, isContext, IS_CONTEXT, isHierarchyObject} from "../../Global";
import {ICommand} from "../command/ICommand";
import {ResourceScope, Resource, Cleanup} from "../../common/ResourceScope";
import {TaskTracker} from "../../common/TaskTracker";
import {ComponentRole, ModelRegistration, ChildContextOptions} from "./ContextRegistration";
import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";
import {ArrayUtils} from "../../utils/ArrayUtils";

/** In-context forwarding policy; child-context boundaries additionally require explicit routes. */
export type ContextConfig = {
    /** Forward mediator intentions to model listeners. Default false. */
    readonly forwardMessageFromMediatorsToModels: boolean;
    /** Forward mediator messages to other mediators. Default true. */
    readonly forwardMessageFromMediatorsToMediators: boolean;
    /** Forward model notifications to mediators. Default true. */
    readonly forwardMessageFromModelsToMediators: boolean;
    /** Forward model notifications to other models. Default false. */
    readonly forwardMessageFromModelsToModels: boolean;
};

type ChildRole = "model" | "mediator" | undefined;

export abstract class AbstractContext extends HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable> implements IContext
{
    public execute<T>(command: Class<ICommand<T>>, ...args: CommandArguments<T>): Promise<void>
    {
        this.checkIfDisposed();
        return this.commandMapper.execute(command, ...args);
    }
    private static readonly MEDIATOR_ID_PREFIX: string = "__<!$Mediator$!>__";
    private static readonly MODEL_ID_PREFIX: string = "__<!$Model$!>__";

    /** Context-owned scope. Available after super.init(); prefer provide() for role-specific dependencies. */
    @inject("IFactory") @optional()
    protected factory!: IFactory;

    /** In-context forwarding policy. Supply ContextConfig through the factory before construction. */
    @inject("ContextConfig") @optional()
    protected config!: ContextConfig;

    /** Context-owned command router, initialized by super.init(). Prefer the context's public command methods. */
    protected commandMapper!: ICommandMapper;

    private modelList: IHierarchyObject[] = [];
    private mediatorList: IHierarchyObject[] = [];

    /**
     * Commands are executed asynchronously, while dispatchMessage() stays synchronous.
     * Every started command is tracked here, so it can be awaited with settle().
     */
    private readonly resources = new ResourceScope();
    private readonly roles = new Map<ComponentRole, IFactory>();
    private readonly registeredModels = new Map<IHierarchyObject, {mutable: Type; immutable: Type}>();
    private readonly contextRoutes = new Map<AbstractContext, ChildContextOptions>();
    private readonly pendingRoutes = new Map<AbstractContext, ChildContextOptions>();
    private bubbleToParent?: (message: IMessage) => boolean;
    private closing?: Promise<void>;
    private settling?: Promise<void>;
    private readonly detachedWork = new TaskTracker();
    private readonly provided = new Map<Type, unknown>();

    public get pendingCount(): number
    {
        return (this.commandMapper?.pendingCount ?? 0) + [...this.contextRoutes.keys()].reduce((sum, child) => sum + child.pendingCount, 0);
    }

    /** Explicitly share a borrowed dependency with selected component roles. */
    public provide<T>(token: Type<T>, value: NoInfer<T>, roles: readonly ComponentRole[] = ["command", "model", "mediator", "adapter"]): this
    {
        this.checkIfDisposed();
        this.provided.set(token, value);
        for (const role of roles) this.roles.get(role)!.mapToValue(token, value);
        return this;
    }

    public own<T extends Resource>(resource: T): T { return this.resources.own(resource); }
    public defer(cleanup: Cleanup): void { this.resources.defer(cleanup); }
    public async start(): Promise<void>
    {
        try { await this.resources.start(); }
        catch (error)
        {
            try { await this.close(); }
            catch (cleanupError) { throw new AggregateError([error, cleanupError], "Context start and cleanup failed"); }
            throw error;
        }
    }

    public registerModel<M, R>(registration: ModelRegistration<M, R>): M & R & IHierarchyObject
    {
        this.checkIfDisposed();
        const commands = this.roles.get("command")!;
        const readers = ["mediator", "adapter", "model"] as const;
        if (Object.is(registration.mutable, registration.immutable)) throw new Error("Mutable and immutable tokens must be distinct");
        if (commands.injector.has(registration.mutable) || commands.injector.has(registration.immutable) ||
            readers.some(role => this.roles.get(role)!.injector.has(registration.immutable)))
            throw new Error("Model token already registered");
        const model = registration.value ?? this.roles.get("model")!.getInstance(registration.implementation!);
        if (this.contains(model)) throw new Error("Model is already attached");
        commands.mapToValue(registration.mutable, model);
        commands.mapToValue(registration.immutable, model);
        for (const role of readers) this.roles.get(role)!.mapToValue(registration.immutable, model);
        this.registeredModels.set(model, {mutable: registration.mutable, immutable: registration.immutable});
        this.provided.set(registration.mutable, model);
        this.provided.set(registration.immutable, model);
        try { this.addModel(model, registration.id!); }
        catch (error)
        {
            this.childRemoved(model);
            if (!registration.value && !model.isDisposed) model.dispose();
            throw error;
        }
        return model;
    }

    public createMediator<T extends IHierarchyObject>(type: Class<T>, id?: string): T
    {
        this.checkIfDisposed();
        const mediator = this.roles.get("mediator")!.getInstance(type);
        try { this.addMediator(mediator, id!); }
        catch (error)
        {
            try { if (!mediator.isDisposed) mediator.dispose(); }
            catch (cleanupError) { throw new AggregateError([error, cleanupError], "Mediator attachment and cleanup failed"); }
            throw error;
        }
        return mediator;
    }

    /** Creates an infrastructure adapter with read access; call own() to transfer ownership. */
    public createAdapter<T>(type: Class<T>): T
    {
        this.checkIfDisposed();
        return this.roles.get("adapter")!.getInstance(type);
    }

    public addContext(child: AbstractContext, options: ChildContextOptions = {}): this
    {
        this.checkIfDisposed();
        this.pendingRoutes.set(child, options);
        try { super.add(child, options.id); }
        finally { this.pendingRoutes.delete(child); }
        return this;
    }

    /** Maintains role and context routing. Overrides must call super.childAdded(child). */
    protected override childAdded(child: IHierarchyObject): void
    {
        if (child instanceof AbstractContext)
        {
            const options = this.pendingRoutes.get(child);
            if (options)
            {
                this.contextRoutes.set(child, options);
                child.bubbleToParent = options.bubble;
            }
        }
    }

    /** Child dependencies cross the boundary only through the listed exports. */
    public createContext<T extends AbstractContext>(type: Class<T>, options: ChildContextOptions & {inherit?: readonly Type[]} = {}): T
    {
        this.checkIfDisposed();
        let child: T | undefined;
        const scope = this.factory.createScope({inherit: []});
        scope.mapToValue("IFactory", scope);
        try
        {
            for (const token of options.inherit ?? [])
                scope.mapToValue(token, this.provided.has(token) ? this.provided.get(token) : this.factory.getInstance(token));
            child = scope.getInstance(type);
            child.defer(() => scope.dispose());
            this.addContext(child, options);
            return child;
        }
        catch (error)
        {
            try { if (child && !child.isDisposed) child.dispose(); }
            catch (cleanupError) { throw new AggregateError([error, cleanupError], "Child initialization and cleanup failed"); }
            finally { if (!scope.isDisposed) scope.dispose(); }
            throw error;
        }
    }

    /** Removes role bindings and routes. Overrides must call super.childRemoved(child). */
    protected override childRemoved(child: IHierarchyObject): void
    {
        ArrayUtils.remove(this.modelList, child);
        ArrayUtils.remove(this.mediatorList, child);
        const registration = this.registeredModels.get(child);
        if (registration)
        {
            this.roles.get("command")!.unmapFromValue(registration.mutable);
            for (const scope of this.roles.values()) scope.unmapFromValue(registration.immutable);
            this.registeredModels.delete(child);
            this.provided.delete(registration.mutable);
            this.provided.delete(registration.immutable);
        }
        if (child instanceof AbstractContext)
        {
            this.contextRoutes.delete(child);
            child.bubbleToParent = undefined;
        }
    }

    /** Abort immediately, then wait for commands and owned resources to finish cleanup. */
    public close(): Promise<void>
    {
        if (this.closing) return this.closing;
        const errors: unknown[] = [];
        if (!this.isDisposed)
        {
            try { this.dispose(); } catch (error) { errors.push(error); }
        }
        this.closing = Promise.allSettled([this.settle(), this.resources.close(), this.detachedWork.settle()]).then(results => {
            for (const result of results) if (result.status === "rejected") errors.push(result.reason);
            if (errors.length) throw new AggregateError(errors, "Context close failed");
        });
        return this.closing;
    }


    /**
     * Synchronous composition hook invoked by factory construction.
     * Overrides must call super.init() before registration, mapping or role-based construction.
     * Register asynchronous startup through own(resource) and call start() after construction.
     */
    @postConstruct()
    protected init(): void
    {
        if (!this.config)
        {
            this.config = new ContextConfigBuilder().build();
        }

        this.factory = this.factory?.createScope() ?? new Factory();
        this.factory.mapToValue("IFactory", this.factory);
        this.defer(() => this.factory.dispose());
        for (const role of ["command", "model", "mediator", "adapter"] as const)
        {
            const scope = this.factory.createScope(role === "command" ? undefined : {inherit: ["ILogger"]});
            scope.mapToValue("IFactory", scope);
            this.roles.set(role, scope);
            this.defer(() => scope.dispose());
        }
        const commands = this.roles.get("command")!;
        const mapped = commands.injector.has("ICommandMapper");
        this.commandMapper = commands.instantiateValueUnmapped(mapped ? "ICommandMapper" : CommandMapper);
        commands.mapToValue("ICommandMapper", this.commandMapper);
    }

    public override add(child: IHierarchyObject, indexOrId?: number | string): boolean
    {
        throw new Error("use 'addModel' or 'addMediator instead");
    }

    public isMediator(child: IHierarchyObject): boolean
    {
        return this.contains(child) && AbstractContext.containsIdentity(this.mediatorList, child);
    }

    public isModel(child: IHierarchyObject): boolean
    {
        return this.contains(child) && AbstractContext.containsIdentity(this.modelList, child);
    }

    private static containsIdentity(list: IHierarchyObject[], child: IHierarchyObject): boolean
    {
        for (const item of list)
        {
            if (Object.is(item, child))
            {
                return true;
            }
        }

        return false;
    }

    /**
     * Defines, what role the object, that dispatched the message, plays in the given context:
     * the object itself can be deeply nested, so the direct child of the context is used.
     */
    private static getChildRole(context: IContextImmutable, initialTarget: IHierarchyObjectImmutable): ChildRole
    {
        let current: IHierarchyObjectImmutable | undefined = initialTarget;

        while (current && !Object.is(current.parentImmutable, context))
        {
            current = current.parentImmutable;
        }

        if (!current)
        {
            return undefined;
        }

        if (context.isModel(current))
        {
            return "model";
        }

        if (context.isMediator(current))
        {
            return "mediator";
        }

        return undefined;
    }

    private _add(list: IHierarchyObject[], child: IHierarchyObject, indexOrId?: number | string): boolean
    {
        this.checkIfDisposed();

        if (this.contains(child)) return false;
        list.push(child);
        try
        {
            return super.add(child, indexOrId);
        }
        catch (error) { ArrayUtils.remove(list, child); throw error; }
    }

    private _remove(list: IHierarchyObject[], childOrId: IHierarchyObject | string, dispose?: boolean): boolean
    {
        this.checkIfDisposed();

        const child = typeof childOrId === "string" ? this.get(childOrId) : childOrId;
        const success = this.remove(childOrId, dispose);

        if (success)
        {
            ArrayUtils.remove(list, child);
        }

        return success;
    }

    private _removeAll(list: IHierarchyObject[], dispose?: boolean): IContext
    {
        this.checkIfDisposed();

        [...list].forEach(value => this.remove(value, dispose));

        ArrayUtils.clear(list);

        return this;
    }

    private _get(list: IHierarchyObject[], indexOrId: number | string): IHierarchyObject | undefined
    {
        this.checkIfDisposed();

        const child = this.get(indexOrId);

        if (!child) return undefined;

        if (list.indexOf(child) != -1)
        {
            return child;
        }

        return undefined;
    }

    public getMediator(id: string): IHierarchyObject | undefined
    {
        return this._get(this.mediatorList, AbstractContext.MEDIATOR_ID_PREFIX + id);
    }

    public getMediatorImmutable(id: string): IHierarchyObjectImmutable | undefined
    {
        return this.getMediator(id);
    }

    public getModel(id: string): IHierarchyObject | undefined
    {
        return this._get(this.modelList, AbstractContext.MODEL_ID_PREFIX + id);
    }

    public getModelImmutable(id: string): IHierarchyObjectImmutable | undefined
    {
        return this.getModel(id);
    }

    public addModel(child: IHierarchyObject): IContext;
    public addModel(child: IHierarchyObject, id: string): IContext;
    public addModel(child: IHierarchyObject, id?: string): IContext
    {
        if (id !== undefined) id = AbstractContext.MODEL_ID_PREFIX + id;

        this._add(this.modelList, child, id);

        return this;
    }

    public removeModel(child: IHierarchyObject, dispose?: boolean): IContext;
    public removeModel(id: string, dispose?: boolean): IContext;
    public removeModel(childOrId: IHierarchyObject | string, dispose?: boolean): IContext
    {
        if (typeof childOrId === "string") childOrId = AbstractContext.MODEL_ID_PREFIX + childOrId;

        this._remove(this.modelList, childOrId, dispose);

        return this;
    }

    public removeAllModels(dispose?: boolean): IContext
    {
        return this._removeAll(this.modelList, dispose);
    }

    public override removeAll(dispose?: boolean): this
    {
        super.removeAll(dispose);

        ArrayUtils.clear(this.modelList);
        ArrayUtils.clear(this.mediatorList);

        return this;
    }

    public get models(): ReadonlyArray<IHierarchyObject>
    {
        this.checkIfDisposed();

        return this.modelList.slice();
    }

    public get modelsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>
    {
        this.checkIfDisposed();

        return this.modelList.slice();
    }

    public addMediator(child: IHierarchyObject): IContext;
    public addMediator(child: IHierarchyObject, id: string): IContext;
    public addMediator(child: IHierarchyObject, id?: string): IContext
    {
        if (id !== undefined) id = AbstractContext.MEDIATOR_ID_PREFIX + id;

        this._add(this.mediatorList, child, id);

        return this;
    }

    public removeMediator(child: IHierarchyObject, dispose?: boolean): IContext;
    public removeMediator(id: string, dispose?: boolean): IContext;
    public removeMediator(childOrId: IHierarchyObject | string, dispose?: boolean): IContext
    {
        if (typeof childOrId === "string") childOrId = AbstractContext.MEDIATOR_ID_PREFIX + childOrId;

        this._remove(this.mediatorList, childOrId, dispose);

        return this;
    }

    public removeAllMediators(dispose?: boolean): IContext
    {
        return this._removeAll(this.mediatorList, dispose);
    }

    public get mediators(): ReadonlyArray<IHierarchyObject>
    {
        this.checkIfDisposed();

        return this.mediatorList.slice();
    }

    public get mediatorsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>
    {
        this.checkIfDisposed();

        return this.mediatorList.slice();
    }

    public override dispose(): void
    {
        this.checkIfDisposed();
        const errors: unknown[] = [];
        try { this.commandMapper?.dispose(); }
        catch (error) { errors.push(error); }
        for (const child of [...this.contextRoutes.keys()])
        {
            const closing = child.close();
            this.detachedWork.track(closing);
        }
        this.resources.dispose();
        try { super.dispose(); }
        catch (error) { errors.push(error); }
        if (errors.length) throw new AggregateError(errors, "Context disposal failed");
    }

    public override onMessageBubbled<DataType>(message: IMessage, data?: DataType): boolean
    {
        super.onMessageBubbled(message, data);

        return this.bubbleToParent?.(message) ?? false;
    }

    public override handleMessage<DataType>(message: IMessage, data?: DataType): IMessageDispatcher
    {
        super.handleMessage(message, data);

        if (this.isDisposed) return this;
        if (this.trace || this.hasMapping(message.type)) void this.commandMapper.route(message);
        if (this.isDisposed) return this;

        const initialTarget: IMessageDispatcherImmutable = message.initialTarget;

        if (isHierarchyObject(initialTarget))
        {
            const root: IHierarchyObjectContainerImmutable | undefined = initialTarget.rootImmutable;

            if (isContext(root))
            {
                const role: ChildRole = AbstractContext.getChildRole(root, initialTarget);

                if (role === "model")
                {
                    this.forwardMessageFromModel(message, data);
                }
                else if (role === "mediator")
                {
                    this.forwardMessageFromMediator(message, data);
                }
            }
        }

        for (const [child, route] of [...this.contextRoutes])
        {
            if (message.isPropagationStopped) break;
            if (child === message.previousTarget || child === message.initialTarget || child.isDisposed) continue;
            if (route.receive?.(message)) child.handleMessage(messageAtTarget(message, child), data);
        }

        return this;
    }

    protected forwardMessageFromModel<DataType>(message: IMessage, data?: DataType): void
    {
        if (this.config.forwardMessageFromModelsToModels)
        {
            this.dispatchMessageToModels(message, data);
        }
        if (this.config.forwardMessageFromModelsToMediators)
        {
            this.dispatchMessageToMediators(message, data);
        }
    }

    protected forwardMessageFromMediator<DataType>(message: IMessage, data?: DataType): void
    {
        if (this.config.forwardMessageFromMediatorsToModels)
        {
            this.dispatchMessageToModels(message, data);
        }
        if (this.config.forwardMessageFromMediatorsToMediators)
        {
            this.dispatchMessageToMediators(message, data);
        }
    }

    public map<M extends MappedMessages, C extends MappedCommands<NoInfer<MappedPayload<M>>>>(
        messages: M, commands: C, options?: CommandMappingOptions<NoInfer<MappedPayload<M>>>): MappingResult<M, C>
    {
        this.checkIfDisposed();
        return this.commandMapper.map(messages, commands, options);
    }
    public get mapperId(): number { return this.commandMapper.mapperId; }
    public get traceErrorCount(): number { return this.commandMapper.traceErrorCount; }
    public get trace(): CommandTrace | undefined { return this.commandMapper.trace; }
    public set trace(value: CommandTrace | undefined) { this.commandMapper.trace = value; }

    public unmap(messageType: Enum, commandClass: Class<ICommand<any>>): ICommandMapper
    {
        this.checkIfDisposed();

        return this.commandMapper.unmap(messageType, commandClass);
    }

    public clear(): ICommandMapper
    {
        this.checkIfDisposed();

        return this.commandMapper.clear();
    }

    public unmapAll(messageType: Enum): ICommandMapper
    {
        this.checkIfDisposed();

        return this.commandMapper.unmapAll(messageType);
    }

    public hasMapping(messageType: Enum): boolean
    {
        this.checkIfDisposed();

        return this.commandMapper.hasMapping(messageType);
    }

    public route(message: IMessage): Promise<void>
    {
        this.checkIfDisposed();
        return this.commandMapper.route(message);
    }

    public settle(): Promise<void>
    {
        if (this.settling) return this.settling;
        this.settling = (async () => {
            const errors: unknown[] = [];
            do
            {
                const results = await Promise.allSettled([this.commandMapper?.settle() ?? Promise.resolve(),
                    ...[...this.contextRoutes.keys()].map(child => child.settle())]);
                for (const result of results) if (result.status === "rejected") errors.push(result.reason);
            } while (this.pendingCount);
            if (errors.length) throw new AggregateError(errors, "Context commands failed");
        })().finally(() => { this.settling = undefined; });
        return this.settling;
    }

    private finalFilter(typeFilter: (child: IHierarchyObject) => boolean,
                        filter?: (child: IHierarchyObject) => boolean): (child: IHierarchyObject) => boolean
    {
        return filter ? (child: IHierarchyObject) =>
        {
            return typeFilter(child) && filter(child);
        } : typeFilter;
    }

    public dispatchMessageToMediators<DataType>(message: IMessage, data?: DataType,
                                                filter?: (child: IHierarchyObject) => boolean): IContext
    {
        this.checkIfDisposed();

        const typeFilter = (child: IHierarchyObject) => this.isMediator(child);

        this.dispatchMessageToChildren(message, data, this.finalFilter(typeFilter, filter));

        return this;
    }

    public dispatchMessageToModels<DataType>(message: IMessage, data?: DataType,
                                             filter?: (child: IHierarchyObject) => boolean): IContext
    {
        this.checkIfDisposed();

        const typeFilter = (child: IHierarchyObject) => this.isModel(child);

        this.dispatchMessageToChildren(message, data, this.finalFilter(typeFilter, filter));

        return this;
    }

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public isIContext(): void {}

    protected checkIfDisposed(): void
    {
        if (this.isDisposed)
        {
            throw new Error("Context already disposed!");
        }
    }
}

Reflect.set(AbstractContext.prototype, IS_CONTEXT, true);
