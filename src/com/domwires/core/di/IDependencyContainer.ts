/* eslint-disable @typescript-eslint/no-explicit-any */
import {Class, Type} from "../Global";
import {getPostConstructMethodName, getPropertyInjections, PropertyInjection} from "./Decorators";

/** Scoped dependency resolution; resolved values are borrowed and never implicitly disposed. */
export interface IDependencyContainer
{
    /**
     * Binds a class, creating a new injected instance for each resolution unless a value/provider takes precedence.
     */
    bindToType<T>(serviceIdentifier: Type<T>, to: Class<NoInfer<T>>, name?: string): void;

    /**
     * Binds a borrowed value, including undefined, with precedence over provider and class bindings.
     */
    bindToValue<T>(serviceIdentifier: Type<T>, value: NoInfer<T>, name?: string): void;

    /**
     * Binds a transient provider; inherited providers receive the requesting child scope.
     */
    bindToProvider<T>(serviceIdentifier: Type<T>, provider: Provider<NoInfer<T>>, name?: string): void;
    /**
     * Creates a child scope. Omitted inherit permits all identifiers; [] isolates; a list permits selected tokens.
     */
    createScope(options?: ScopeOptions): IDependencyContainer;
    /**
     * Constructs using provider/class bindings while ignoring value bindings.
     * @throws If no implementation is available.
     */
    instantiate<T>(identifier: Type<T>, name?: string): T;
    /**
     * Applies property injection without calling the constructor or post-construction hook.
     * Lazy properties resolve in this scope; absent optional properties restore their original defaults.
     */
    injectInto(instance: object): void;

    /**
     * Whether a local or permitted inherited binding exists. Unbound constructible classes return false.
     */
    has(serviceIdentifier: Type, name?: string): boolean;

    /**
     * Removes local bindings for the identifier. Omitting name removes all local named variants.
     * Inherited bindings may become visible again.
     */
    unbind(serviceIdentifier: Type, name?: string): void;

    /**
     * Removes all local bindings without disposing their borrowed values or modifying the parent.
     */
    unbindAll(): void;

    /**
     * Resolves value, provider, class binding, or an unnamed class identifier, in that order.
     * @throws If unresolved or a dependency cycle is detected.
     */
    resolve<T>(serviceIdentifier: Type<T>, name?: string): T;

    /**
     * Constructs using static inject tokens, then property injection and a synchronous post-construction hook.
     * Initialization failure attempts disposal of the partially initialized instance. Async hooks are rejected.
     */
    create<T>(type: Class<T>): T;
}

export type Provider<T> = (scope: IDependencyContainer) => T;
export type ScopeOptions = {
    /** Omit to inherit all bindings; [] creates an explicitly isolated scope. */
    readonly inherit?: readonly Type[];
};
type Binding = {type?: Class<any>; value?: any; hasValue?: boolean; provider?: Provider<any>};
const optionalDefaults = new WeakMap<object, Map<PropertyKey, unknown>>();

/** Values are borrowed. Resource ownership belongs to a context or ResourceScope. */
export class DependencyContainer implements IDependencyContainer
{
    private readonly bindings = new Map<Type, Map<string, Binding>>();
    private readonly resolving: Array<{identifier: Type; name?: string}> = [];
    private readonly inherited: ReadonlySet<Type> | undefined;

    public constructor(private readonly parent?: DependencyContainer, options: ScopeOptions = {})
    {
        this.inherited = options.inherit === undefined ? undefined : new Set(options.inherit);
    }

    public createScope(options?: ScopeOptions): DependencyContainer { return new DependencyContainer(this, options); }

    public bindToType<T>(identifier: Type<T>, to: Class<NoInfer<T>>, name?: string): void
    {
        this.writable(identifier, name).type = to;
    }

    public bindToValue<T>(identifier: Type<T>, value: NoInfer<T>, name?: string): void
    {
        Object.assign(this.writable(identifier, name), {value, hasValue: true});
    }

    public bindToProvider<T>(identifier: Type<T>, provider: Provider<NoInfer<T>>, name?: string): void
    {
        this.writable(identifier, name).provider = provider;
    }

    public has(identifier: Type, name?: string): boolean { return this.find(identifier, name) !== undefined; }

    public unbind(identifier: Type, name?: string): void
    {
        if (name === undefined) this.bindings.delete(identifier);
        else
        {
            const names = this.bindings.get(identifier);
            names?.delete(name);
            if (names?.size === 0) this.bindings.delete(identifier);
        }
    }

    public unbindAll(): void { this.bindings.clear(); }

    public resolve<T>(identifier: Type<T>, name?: string): T
    {
        if (this.resolving.some(item => item.identifier === identifier && item.name === name))
        {
            const path = [...this.resolving, {identifier, name}].map(item =>
                (typeof item.identifier === "function" ? item.identifier.name : String(item.identifier)) +
                (item.name === undefined ? "" : ":" + item.name));
            throw new Error("Circular dependency: " + path.join(" -> "));
        }
        this.resolving.push({identifier, name});
        try
        {
            const binding = this.find(identifier, name);
            if (binding?.hasValue) return binding.value;
            if (binding?.provider) return binding.provider(this);
            if (binding?.type) return this.create(binding.type);
            if (typeof identifier === "function" && name === undefined) return this.create(identifier);
            throw new Error('No binding found for service identifier "' + identifier + '"' +
                (name === undefined ? "" : ' with name "' + name + '"') + "!");
        }
        finally { this.resolving.pop(); }
    }

    /** Create without a value binding; the selected implementation still respects the scope. */
    public instantiate<T>(identifier: Type<T>, name?: string): T
    {
        const binding = this.find(identifier, name);
        if (binding?.provider) return binding.provider(this);
        if (binding?.type) return this.create(binding.type);
        if (typeof identifier === "function" && name === undefined) return this.create(identifier);
        throw new Error('No implementation found for "' + identifier + '"!');
    }

    public create<T>(type: Class<T>): T
    {
        // Constructor injection needs neither decorators nor emitted reflection metadata.
        const tokens: readonly Type[] = Reflect.get(type, "inject") ?? [];
        const instance = new type(...tokens.map(token => this.resolve(token)));
        try
        {
            this.injectInto(instance);
            const hook = getPostConstructMethodName(type);
            if (hook !== undefined)
            {
                const result = Reflect.get(Object(instance), hook).call(instance);
                if (result && typeof result.then === "function")
                {
                    Promise.resolve(result).catch(() => undefined);
                    throw new Error("Post construct hook must be synchronous; use start() for async work: " + type.name);
                }
            }
            return instance;
        }
        catch (error)
        {
            // A constructor succeeded, so the partially initialized instance owns its resources.
            try
            {
                const dispose = Reflect.get(Object(instance), "dispose");
                if (typeof dispose === "function" && !Reflect.get(Object(instance), "isDisposed")) dispose.call(instance);
            }
            catch (cleanupError) { throw new AggregateError([error, cleanupError], "Initialization and cleanup failed"); }
            throw error;
        }
    }

    public injectInto(instance: any): void
    {
        const type = instance.constructor;
        for (const injection of getPropertyInjections(type))
        {
            if (injection.serviceIdentifier === undefined) continue;
            if (injection.optional && !injection.lazy)
            {
                let defaults = optionalDefaults.get(instance);
                if (!defaults) optionalDefaults.set(instance, defaults = new Map());
                if (!defaults.has(injection.propertyKey)) defaults.set(injection.propertyKey, Reflect.get(instance, injection.propertyKey));
                if (!this.has(injection.serviceIdentifier, injection.named) &&
                    !(typeof injection.serviceIdentifier === "function" && injection.named === undefined))
                {
                    Reflect.set(instance, injection.propertyKey, defaults.get(injection.propertyKey));
                    continue;
                }
            }
            if (injection.lazy)
            {
                Object.defineProperty(instance, injection.propertyKey, {
                    configurable: true, enumerable: true,
                    get: () => this.resolveProperty(type, injection)
                });
            }
            else Reflect.set(instance, injection.propertyKey, this.resolveProperty(type, injection));
        }
    }

    private resolveProperty(type: Class<unknown>, injection: PropertyInjection): unknown
    {
        const identifier = injection.serviceIdentifier!;
        if (!this.has(identifier, injection.named) && !(typeof identifier === "function" && injection.named === undefined))
        {
            if (injection.optional) return undefined;
            throw new Error('Cannot inject "' + identifier + '"' +
                (injection.named === undefined ? "" : ' with name "' + injection.named + '"') +
                ' into "' + type.name + "." + String(injection.propertyKey) + '": no binding found!');
        }
        return this.resolve(identifier, injection.named);
    }

    private find(identifier: Type, name?: string): Binding | undefined
    {
        return this.bindings.get(identifier)?.get(name ?? "") ??
            (this.inherited === undefined || this.inherited.has(identifier) ? this.parent?.find(identifier, name) : undefined);
    }

    private writable(identifier: Type, name?: string): Binding
    {
        let names = this.bindings.get(identifier);
        if (!names) this.bindings.set(identifier, names = new Map());
        let binding = names.get(name ?? "");
        if (!binding) names.set(name ?? "", binding = {});
        return binding;
    }
}
