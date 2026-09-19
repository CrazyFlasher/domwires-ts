import {ICommandMapper, ICommandMapperImmutable} from "../command/ICommandMapper";
import {IMessage} from "../message/IMessage";
import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";
import {IHierarchyObjectContainer} from "../hierarchy/IHierarchyObjectContainer";
import type {Class, Type} from "../../Global";
import type {Resource, Cleanup} from "../../common/ResourceScope";
import type {ModelRegistration, ChildContextOptions, ComponentRole} from "./ContextRegistration";
import type {AbstractContext} from "./AbstractContext";

/** Live read access to attached models, mediators and command diagnostics. */
export interface IContextImmutable extends IHierarchyObjectImmutable, ICommandMapperImmutable
{
    /**
     * Snapshot of model membership; each element remains a live object through its immutable contract.
     */
    get modelsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>;

    /**
     * Snapshot of mediator membership through immutable contracts.
     */
    get mediatorsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>;

    /**
     * Finds a directly attached model by its registration id; returns undefined when absent.
     */
    getModelImmutable(id: string): IHierarchyObjectImmutable | undefined;

    /**
     * Finds a directly attached mediator by its registration id; returns undefined when absent.
     */
    getMediatorImmutable(id: string): IHierarchyObjectImmutable | undefined;

    /**
     * Whether this exact object is currently a direct model child of this context.
     */
    isModel(child: IHierarchyObjectImmutable): boolean;

    /**
     * Whether this exact object is currently a direct mediator child of this context.
     */
    isMediator(child: IHierarchyObjectImmutable): boolean;

    /**
     * Legacy structural marker. Runtime context identification uses the framework brand.
     */
    isIContext(): void;
}

/** Composition boundary for roles, messages, commands and explicitly owned resources. */
export interface IContext extends IContextImmutable, IHierarchyObjectContainer, ICommandMapper
{
    /**
     * Shares a borrowed value with the selected roles; defaults to all four roles.
     * Binding does not transfer ownership. Use own() when this context must close the value.
     */
    provide<T>(token: Type<T>, value: NoInfer<T>, roles?: readonly ComponentRole[]): IContext;
    /**
     * Attaches and owns a model, publishing distinct mutable and immutable tokens.
     * Commands/guards receive both tokens; models, mediators and adapters receive the immutable token.
     * Use either implementation or value. Removing the model removes these role bindings.
     * @throws If tokens coincide, are already registered, or the model is already attached.
     */
    registerModel<M, R>(registration: ModelRegistration<M, R>): M & R & IHierarchyObject;
    /**
     * Constructs with the mediator role scope and attaches an owned mediator.
     * Initialization/attachment failure attempts to dispose the new instance.
     */
    createMediator<T extends IHierarchyObject>(type: Class<T>, id?: string): T;
    /**
     * Constructs infrastructure with the adapter role scope. The caller owns its lifetime.
     * Wrap the result in own() to arrange context cleanup.
     */
    createAdapter<T>(type: Class<T>): T;
    /**
     * Attaches an existing child context. Routing is opt-in via receive and bubble predicates.
     * Parent teardown closes attached children; this method does not start the child's resources.
     */
    addContext(child: AbstractContext, options?: ChildContextOptions): IContext;
    /**
     * Constructs and attaches an owned child with an isolated dependency scope.
     * Only tokens listed in inherit cross the dependency boundary. Routing is separately opt-in.
     * Call start() on the child when it owns startable resources.
     */
    createContext<T extends AbstractContext>(type: Class<T>, options?: ChildContextOptions & {inherit?: readonly Type[]}): T;
    /**
     * Registers one resource for reverse-order cleanup and returns the same object.
     * A resource needs close() or dispose(); close() takes precedence.
     * @throws If already owned, closed, or a startable resource is registered after start() begins.
     */
    own<T extends Resource>(resource: T): T;
    /**
     * Registers a synchronous or asynchronous cleanup callback for reverse-order teardown.
     */
    defer(cleanup: Cleanup): void;
    /**
     * Starts this context's explicitly owned resources in registration order.
     * Repeated calls share the start promise. Does not recursively start child contexts.
     * If startup fails, closes the context and reports startup and cleanup failures.
     */
    start(): Promise<void>;
    /**
     * Initiates disposal and cooperative command cancellation, then waits for tracked commands,
     * child-context closure and owned-resource cleanup. Repeated calls share one promise.
     * Rejects with AggregateError after cleanup has been attempted; expected cancellation is excluded.
     * A command that never finishes can keep this promise pending.
     */
    close(): Promise<void>;
    /**
     * Forwards an existing message to matching mediator children, retaining delivery identity.
     * An optional filter further narrows recipients; it does not create a new dispatch.
     */
    dispatchMessageToMediators<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;

    /**
     * Forwards an existing message to matching model children, retaining delivery identity.
     */
    dispatchMessageToModels<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;

    /**
     * Attaches an owned model, optionally under an id. Does not register dependency tokens.
     * Use registerModel() for role-based read/write injection.
     */
    addModel(child: IHierarchyObject): IContext;

    /**
     * Attaches an owned model, optionally under an id. Does not register dependency tokens.
     * Use registerModel() for role-based read/write injection.
     */
    addModel(child: IHierarchyObject, id: string): IContext;

    /**
     * Attaches an already constructed owned mediator, optionally under an id.
     * Use createMediator() to also apply the mediator dependency scope.
     */
    addMediator(child: IHierarchyObject): IContext;

    /**
     * Attaches an already constructed owned mediator, optionally under an id.
     * Use createMediator() to also apply the mediator dependency scope.
     */
    addMediator(child: IHierarchyObject, id: string): IContext;

    /**
     * Detaches a model and removes its role bindings; dispose defaults to false.
     */
    removeModel(child: IHierarchyObject, dispose?: boolean): IContext;

    /**
     * Detaches a model and removes its role bindings; dispose defaults to false.
     */
    removeModel(id: string, dispose?: boolean): IContext;

    /**
     * Detaches a mediator; dispose defaults to false.
     */
    removeMediator(child: IHierarchyObject, dispose?: boolean): IContext;

    /**
     * Detaches a mediator; dispose defaults to false.
     */
    removeMediator(id: string, dispose?: boolean): IContext;

    /**
     * Finds a direct model by its registration id, returning undefined when absent.
     */
    getModel(id: string): IHierarchyObject | undefined;

    /**
     * Finds a direct mediator by its registration id, returning undefined when absent.
     */
    getMediator(id: string): IHierarchyObject | undefined;

    /**
     * Snapshot of directly attached models through their mutable hierarchy contracts.
     */
    get models(): ReadonlyArray<IHierarchyObject>;

    /**
     * Snapshot of directly attached mediators through their mutable hierarchy contracts.
     */
    get mediators(): ReadonlyArray<IHierarchyObject>;

    /**
     * Detaches every model and removes its role bindings; dispose defaults to false.
     */
    removeAllModels(dispose?: boolean): IContext;

    /**
     * Detaches every mediator; dispose defaults to false.
     */
    removeAllMediators(dispose?: boolean): IContext;

    /**
     * Drains mapped and direct commands in this context and its currently attached child contexts.
     * Rejects with AggregateError for buffered failures; expected cancellation is excluded.
     * It does not stop producers, start/close resources, or wait for detached child cleanup; use close() for teardown.
     */
    settle(): Promise<void>;
}
