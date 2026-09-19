/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-type-assertion/no-type-assertion */

import {IDisposable, IDisposableImmutable} from "../common/IDisposable";
import {AbstractDisposable} from "../common/AbstractDisposable";
import {Class, getClassFromString, getDefaultImplementation, Type} from "../Global";
import {ILogger} from "../../logger/ILogger";
import {ArrayUtils} from "../utils/ArrayUtils";
import {DependencyContainer, Provider, ScopeOptions} from "../di/IDependencyContainer";
import {PoolModel} from "./PoolModel";
import {ImplementationRegistry} from "./ImplementationRegistry";
import {IDependencyContainer} from "../di/IDependencyContainer";

export type FactoryConfig = Map<string, {
    value?: string | boolean | number | object;
    implementation?: string;
    newInstance?: boolean;
}>;

type MappingData<T = any> = {
    readonly typeOrValue: T;
    readonly name?: string;
};

export type PoolConfig = {
    readonly capacity?: number;
    readonly instantiateNow?: boolean;
    readonly isBusyFlagGetterName?: string;
};

/** Resolution and pool queries without binding-management operations. */
export interface IFactoryImmutable extends IDisposableImmutable
{
    /**
     * Resolves a value, transient provider or implementation, using a registered pool unless ignored.
     * Class identifiers can construct themselves; token/string identifiers need a binding or default implementation.
     * @throws If disposed, unresolved, cyclic, or a bounded pool has no available item.
     */
    getInstance<T>(type: Type<T>, name?: string, ignorePool?: boolean): T;

    /**
     * Creates through a provider/class implementation, ignoring value bindings and object pools.
     * The selected implementation still uses this factory's dependency scope.
     */
    instantiateValueUnmapped<T>(type: Type<T>): T;

    /**
     * Whether this factory has a local class mapping for the identifier and optional name.
     */
    hasTypeMapping<T>(type: Type<T>, name?: string): boolean;

    /**
     * Whether this factory has a local value mapping for the identifier and optional name.
     */
    hasValueMapping<T>(type: Type<T>, name?: string): boolean;

    /**
     * Whether this factory owns a pool for this exact identifier.
     */
    hasPoolForType<T>(type: Type<T>): boolean;

    /**
     * Returns registered pool capacity; throws if no pool exists.
     */
    getPoolCapacity<T>(type: Type<T>): number;

    /**
     * Returns the number of instantiated pool objects; throws if no pool exists.
     */
    getPoolInstanceCount<T>(type: Type<T>): number;

    /**
     * Whether a full pool has every item marked busy; false when no busy getter is configured.
     * Throws if no pool exists.
     */
    getAllPoolItemsAreBusy<T>(type: Type<T>): boolean;

    /**
     * Counts items whose configured busy property is truthy; zero without a busy getter.
     * Throws if no pool exists.
     */
    getPoolBusyInstanceCount<T>(type: Type<T>): number;
}

/** Scoped dependency bindings, implementation aliases and owned object pools. */
export interface IFactory extends IFactoryImmutable, IDisposable
{
    /**
     * Binds a transient implementation. A value binding for the same token/name takes precedence.
     */
    mapToType<T>(type: Type<T>, to: Class<NoInfer<T>>, name?: string): IFactory;

    /**
     * Binds a borrowed value, including undefined. Unmapping or disposal does not dispose the value.
     */
    mapToValue<T>(type: Type<T>, to: NoInfer<T>, name?: string): IFactory;

    /**
     * Removes this factory's class mapping; preserves a separately registered value mapping.
     */
    unmapFromType<T>(type: Type<T>, name?: string): IFactory;

    /**
     * Removes this factory's value mapping; preserves a separately registered class mapping.
     */
    unmapFromValue<T>(type: Type<T>, name?: string): IFactory;

    /**
     * Removes local bindings and disposes all pooled objects. Borrowed values and the parent scope survive.
     * Pool cleanup failures are aggregated after all pools have been attempted.
     */
    clear(): IFactory;

    /**
     * Registers a factory-owned pool. Existing registration is kept with a warning.
     * @param capacity - Positive safe integer; defaults to 5.
     * @param instantiateNow - Preallocates all items when true.
     * @param isBusyFlagGetterName - Property identifying unavailable objects. Without it, objects are reused cyclically.
     */
    registerPool<T>(type: Type<T>, capacity?: number, instantiateNow?: boolean,
                    isBusyFlagGetterName?: string): IFactory;

    /**
     * Disposes objects in the local pool and removes it; does nothing if absent.
     */
    unregisterPool<T>(type: Type<T>): IFactory;

    /**
     * Adds a positive safe integer to the registered pool's capacity. Objects are created lazily.
     */
    increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IFactory;

    /**
     * Controls automatic growth when all items are busy. Enabled by default.
     * Disable for a bounded pool whose exhausted getInstance() calls must throw.
     */
    setSafePool(value: boolean): IFactory;

    /**
     * Applies dynamic value/class mappings. Implementation names resolve through the local registry
     * or explicitly registered legacy class aliases; arbitrary globals are not inspected.
     */
    appendMappingConfig(config: FactoryConfig): IFactory;

    /**
     * Creates an independently disposable child factory with inherited bindings and registry aliases.
     * Omitted inherit imports all identifiers; [] imports none; a list selects identifiers, including named bindings.
     * The caller owns this child factory. Parent pools are not inherited.
     */
    createScope(options?: ScopeOptions): IFactory;
    /**
     * Registers a transient provider called with the requesting dependency scope on each resolution.
     */
    mapToProvider<T>(type: Type<T>, provider: Provider<NoInfer<T>>, name?: string): IFactory;
    /**
     * Local implementation-alias registry, with parent lookup for factory scopes.
     */
    get registry(): ImplementationRegistry;
    /**
     * Low-level scoped dependency container. Direct edits bypass the factory's mapping bookkeeping.
     */
    get injector(): IDependencyContainer;
}

export class Factory extends AbstractDisposable implements IFactory
{
    private readonly _injector: IDependencyContainer;
    public readonly registry: ImplementationRegistry;

    private readonly typeMap: Map<Type, MappingData[]> = new Map<Type, MappingData[]>();
    private readonly valueMap: Map<Type, MappingData[]> = new Map<Type, MappingData[]>();

    private readonly poolModelMap: Map<Type, PoolModel> = new Map<Type, PoolModel>();

    private _safePool = true;

    public constructor(logger?: ILogger, injector: IDependencyContainer = new DependencyContainer(), registry = new ImplementationRegistry())
    {
        super();
        this._injector = injector;
        this.registry = registry;

        if (logger)
        {
            this.logger = logger;
            this.mapToValue("ILogger", logger);
        }
    }

    public get injector(): IDependencyContainer
    {
        return this._injector;
    }

    public createScope(options?: ScopeOptions): Factory
    {
        if (this.isDisposed) throw new Error("Factory already disposed!");
        return new Factory(undefined, this._injector.createScope(options), this.registry.createScope());
    }

    public mapToProvider<T>(type: Type<T>, provider: Provider<NoInfer<T>>, name?: string): IFactory
    {
        this._injector.bindToProvider(type, provider, name);
        return this;
    }

    private static includesName(list?: MappingData[], name?: string): MappingData | undefined
    {
        if (!list) return undefined;

        for (const value of list)
        {
            if ((!value.name && !name) || value.name === name)
            {
                return value;
            }
        }

        return undefined;
    }

    /**
     * Internal helper: returns a readable name of a type.
     */
    public static getTypeName<T>(type: Type<T>): string
    {
        return typeof type === "string" ? type : type.name;
    }

    public override dispose()
    {
        try { this.clear(); }
        finally { super.dispose(); }
    }

    private addMapping<T>(map: Map<Type, MappingData[]>, type: Type<T>, to: T | Class<T>, name?: string): void
    {
        let list: MappingData[] | undefined = map.get(type);

        if (!list)
        {
            list = [];

            map.set(type, list);
        }

        const currentMapping: MappingData | undefined = Factory.includesName(list, name);

        if (currentMapping)
        {
            if (currentMapping.typeOrValue === to)
            {
                // the type is already mapped to the given value, there is nothing to remap
                return;
            }

            const typeName: string = Factory.getTypeName(type);
            const toName: string = typeof to === "string" ? to
                : (typeof to === "function" ? (to as Class<T>).name : String(to));

            this.verbose(typeName + " is already mapped to " + toName +
                (name ? " with name \"" + name + "\"" : "") + ". Remapping...");

            ArrayUtils.remove(list, currentMapping);
        }

        list.push({typeOrValue: to, name: name});
    }

    private removeMapping<T>(map: Map<Type, MappingData[]>, type: Type<T>, name?: string): void
    {
        const list: MappingData[] | undefined = map.get(type);

        if (!list)
        {
            return;
        }

        const mapping: MappingData | undefined = Factory.includesName(list, name);

        if (!mapping)
        {
            return;
        }

        ArrayUtils.remove(list, mapping);

        if (list.length === 0)
        {
            map.delete(type);
        }
    }

    /**
     * Rebuilds bindings of the given type from the type and value mappings.
     * A value binding takes precedence over a type binding, as before.
     */
    private syncBindings<T>(type: Type<T>): void
    {
        this._injector.unbind(type);

        const typeMappingList: MappingData[] | undefined = this.typeMap.get(type);

        if (typeMappingList)
        {
            for (const mapping of typeMappingList)
            {
                this._injector.bindToType(type, mapping.typeOrValue, mapping.name);
            }
        }

        const valueMappingList: MappingData[] | undefined = this.valueMap.get(type);

        if (valueMappingList)
        {
            for (const mapping of valueMappingList)
            {
                this._injector.bindToValue(type, mapping.typeOrValue, mapping.name);
            }
        }
    }

    private getFromPool<T>(type: Type<T>, createNewIfNeeded = true): T
    {
        this.checkPoolHasType(type);

        const poolModel: PoolModel | undefined = this.poolModelMap.get(type);

        if (!poolModel)
        {
            throw new Error("Pool '" + Factory.getTypeName(type) + "' is not registered! Call registerPool.");
        }

        if (this._safePool && poolModel.allItemsAreBusy)
        {
            this.info("All pool items are busy for class '" + Factory.getTypeName(type) + "'. Extending pool...");

            poolModel.increaseCapacity(1);

            this.info("Pool capacity for '" + Factory.getTypeName(type) + "' increased!");
        }

        return poolModel.get(type, createNewIfNeeded);
    }

    private clearPools(): IFactory
    {
        const errors: unknown[] = [];
        this.poolModelMap.forEach(value => { try { value.dispose(); } catch (error) { errors.push(error); } });
        this.poolModelMap.clear();
        if (errors.length) throw new AggregateError(errors, "Pool disposal failed");
        return this;
    }

    private checkPoolHasType<T>(type: Type<T>): void
    {
        if (!this.poolModelMap.has(type))
        {
            throw new Error("Pool '" + Factory.getTypeName(type) + "' is not registered! Call registerPool.");
        }
    }

    public mapToType<T>(type: Type<T>, to: Class<NoInfer<T>>, name?: string): IFactory
    {
        this.addMapping(this.typeMap, type, to, name);
        this.syncBindings(type);

        return this;
    }

    public mapToValue<T>(type: Type<T>, to: NoInfer<T>, name?: string): IFactory
    {
        this.addMapping(this.valueMap, type, to, name);
        this.syncBindings(type);

        return this;
    }

    public instantiateValueUnmapped<T>(type: Type<T>): T
    {
        if (!this._injector.has(type))
        {
            const implementation = getDefaultImplementation(type);
            if (implementation) this.mapToType(type, implementation);
        }
        return this._injector.instantiate(type);
    }

    public getInstance<T>(type: Type<T>, name?: string, ignorePool?: boolean): T
    {
        if (this.isDisposed) throw new Error("Factory already disposed!");
        if (!ignorePool && this.hasPoolForType(type))
        {
            return this.getFromPool(type);
        }

        if (!this._injector.has(type, name))
        {
            const defaultImpl: Class<any> | undefined = getDefaultImplementation(type);

            if (defaultImpl)
            {
                this.verbose("Mapping to default implementation '" + defaultImpl.name + "'.");

                this.mapToType(type, defaultImpl, name);
            }
        }

        return this._injector.resolve(type, name);
    }

    public hasTypeMapping<T>(type: Type<T>, name?: string): boolean
    {
        return Factory.includesName(this.typeMap.get(type), name) != undefined;
    }

    public hasValueMapping<T>(type: Type<T>, name?: string): boolean
    {
        return Factory.includesName(this.valueMap.get(type), name) != undefined;
    }

    public unmapFromType<T>(type: Type<T>, name?: string): IFactory
    {
        this.removeMapping(this.typeMap, type, name);
        this.syncBindings(type);

        return this;
    }

    public unmapFromValue<T>(type: Type<T>, name?: string): IFactory
    {
        this.removeMapping(this.valueMap, type, name);
        this.syncBindings(type);

        return this;
    }

    public clear(): IFactory
    {
        this._injector.unbindAll();
        this.typeMap.clear();
        this.valueMap.clear();

        this.clearPools();

        return this;
    }

    public getAllPoolItemsAreBusy<T>(type: Type<T>): boolean
    {
        this.checkPoolHasType(type);

        return (this.poolModelMap.get(type) as PoolModel).allItemsAreBusy;
    }

    public getPoolBusyInstanceCount<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return (this.poolModelMap.get(type) as PoolModel).busyItemsCount;
    }

    public getPoolCapacity<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return (this.poolModelMap.get(type) as PoolModel).capacity;
    }

    public getPoolInstanceCount<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return (this.poolModelMap.get(type) as PoolModel).instanceCount;
    }

    public hasPoolForType<T>(type: Type<T>): boolean
    {
        return this.poolModelMap.has(type);
    }

    public increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IFactory
    {
        this.checkPoolHasType(type);

        (this.poolModelMap.get(type) as PoolModel).increaseCapacity(additionalCapacity);

        return this;
    }

    public registerPool<T>(type: Type<T>, capacity = 5, instantiateNow?: boolean, isBusyFlagGetterName?: string): IFactory
    {
        if (!Number.isSafeInteger(capacity) || capacity <= 0)
        {
            throw new Error("Capacity should be > 0!");
        }

        if (this.poolModelMap.has(type))
        {
            this.warn("Pool '" + Factory.getTypeName(type) + "' already registered! Call unregisterPool before.");
        }
        else
        {
            this.poolModelMap.set(type, new PoolModel(this, capacity, isBusyFlagGetterName));

            if (instantiateNow)
            {
                for (let i = 0; i < capacity; i++)
                {
                    this.getFromPool(type);
                }
            }
        }

        return this;
    }

    public unregisterPool<T>(type: Type<T>): IFactory
    {
        const poolModel: PoolModel | undefined = this.poolModelMap.get(type);

        if (poolModel)
        {
            poolModel.dispose();

            this.poolModelMap.delete(type);
        }

        return this;
    }

    public setSafePool(value: boolean): IFactory
    {
        this._safePool = value;

        return this;
    }

    public appendMappingConfig(config: FactoryConfig): IFactory
    {
        for (const [key, value] of config)
        {
            let name: string | undefined = undefined;
            let interfaceDefinition: string = key;

            if (value)
            {
                const splitted: string[] = interfaceDefinition.split("$");
                const head: string | undefined = splitted[0];

                if (splitted.length > 1 && head != undefined)
                {
                    name = splitted[1];
                    interfaceDefinition = head;
                }
                else if (value.value != undefined)
                {
                    const type: string = typeof value.value;

                    if (type != "object")
                    {
                        interfaceDefinition = type;

                        if (interfaceDefinition != key)
                        {
                            name = key;
                        }
                    }
                }

                if (value.value != undefined)
                {
                    this.info("Mapping value from config:", "'" + interfaceDefinition + "'", "to", "'" + value.value + "'"
                        + (name ? " with name '" + name + "'" : ""));

                    if (name)
                    {
                        this.mapToValue(interfaceDefinition, value.value, name);
                    }
                    else
                    {
                        this.mapToValue(interfaceDefinition, value.value);
                    }
                }
                else
                {
                    if (value.implementation)
                    {
                        this.info("Mapping type from config:", "'" + interfaceDefinition + "'", "to", "'" + value.implementation + "'"
                            + (name ? " with name '" + name + "'" : ""));

                        this.mapToType(interfaceDefinition, this.registry.get(value.implementation) ?? getClassFromString(value.implementation), name);
                    }

                    if (value.newInstance)
                    {
                        this.info("Creating new instance and mapping to value: '" + interfaceDefinition + "'" +
                            (name ? " with name '" + name + "'" : ""));

                        this.mapToValue(interfaceDefinition, this.getInstance(interfaceDefinition, name), name);
                    }
                }
            }
        }

        return this;
    }
}
