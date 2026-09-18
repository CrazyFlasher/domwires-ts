/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-type-assertion/no-type-assertion */

import {IDisposable, IDisposableImmutable} from "../common/IDisposable";
import {AbstractDisposable} from "../common/AbstractDisposable";
import {Class, getClassFromString, getDefaultImplementation, Type} from "../Global";
import {ILogger} from "../../logger/ILogger";
import {ArrayUtils} from "../utils/ArrayUtils";
import {DependencyContainer} from "../di/DependencyContainer";
import {IDependencyContainer} from "../di/IDependencyContainer";
import {clearLazyBindings, setLazyBinding} from "../di/LazyRegistry";

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

class PoolModel
{
    private readonly list: any[] = [];
    private _capacity: number;

    private currentIndex = 0;
    private readonly factory: Factory;
    private readonly isBusyFlagGetterName: string | undefined;

    public constructor(factory: Factory, capacity: number, isBusyFlagGetterName?: string)
    {
        this.factory = factory;
        this._capacity = capacity;
        this.isBusyFlagGetterName = isBusyFlagGetterName;
    }

    public get<T>(type: Type<T>, createNewIfNeeded = true): T
    {
        if (this.list.length < this._capacity && createNewIfNeeded)
        {
            return this.createAndStore(type);
        }

        if (this.list.length === 0)
        {
            throw new Error("Pool for '" + Factory.getTypeName(type) + "' is empty and creating of new instances is disabled!");
        }

        // scan for a not busy item, starting from the current index; the scan is bounded by the list length,
        // so it always terminates, even if all items are busy
        for (let i = 0; i < this.list.length; i++)
        {
            const instance: T = this.next();

            if (!this.isBusy(instance))
            {
                return instance;
            }
        }

        throw new Error("All items of pool '" + Factory.getTypeName(type) + "' are busy! " +
            "Increase the pool capacity or enable the safe pool mode.");
    }

    public increaseCapacity(value: number): void
    {
        this._capacity += value;
    }

    public dispose(): void
    {
        ArrayUtils.clear(this.list);

        this.currentIndex = 0;
        this._capacity = 0;
    }

    public get capacity(): number
    {
        return this._capacity;
    }

    public get instanceCount(): number
    {
        return this.list.length;
    }

    public get allItemsAreBusy(): boolean
    {
        if (this.list.length < this._capacity)
        {
            return false;
        }

        if (!this.isBusyFlagGetterName)
        {
            return false;
        }

        for (let i = 0; i < this._capacity; i++)
        {
            if (!this.isBusy(this.list[i]))
            {
                return false;
            }
        }

        return true;
    }

    public get busyItemsCount(): number
    {
        if (!this.isBusyFlagGetterName)
        {
            return 0;
        }

        let count = 0;

        for (const instance of this.list)
        {
            if (this.isBusy(instance))
            {
                count++;
            }
        }

        return count;
    }

    private createAndStore<T>(type: Type<T>): T
    {
        const instance: T = this.factory.getInstance(type, undefined, true);

        this.list.push(instance);

        return instance;
    }

    private next(): any
    {
        const instance: any = this.list[this.currentIndex];

        this.currentIndex++;

        if (this.currentIndex === this._capacity || this.currentIndex >= this.list.length)
        {
            this.currentIndex = 0;
        }

        return instance;
    }

    private isBusy(instance: any): boolean
    {
        return this.isBusyFlagGetterName != undefined && instance != undefined &&
            Boolean(instance[this.isBusyFlagGetterName]);
    }
}

export interface IFactoryImmutable extends IDisposableImmutable
{
    getInstance<T>(type: Type<T>, name?: string, ignorePool?: boolean): T;

    instantiateValueUnmapped<T>(type: Type<T>): T;

    hasTypeMapping<T>(type: Type<T>, name?: string): boolean;

    hasValueMapping<T>(type: Type<T>, name?: string): boolean;

    hasPoolForType<T>(type: Type<T>): boolean;

    getPoolCapacity<T>(type: Type<T>): number;

    getPoolInstanceCount<T>(type: Type<T>): number;

    getAllPoolItemsAreBusy<T>(type: Type<T>): boolean;

    getPoolBusyInstanceCount<T>(type: Type<T>): number;
}

export interface IFactory extends IFactoryImmutable, IDisposable
{
    mapToType<T>(type: Type<T>, to: Class<T>, name?: string): IFactory;

    mapToValue<T>(type: Type<T>, to: T, name?: string): IFactory;

    unmapFromType<T>(type: Type<T>, name?: string): IFactory;

    unmapFromValue<T>(type: Type<T>, name?: string): IFactory;

    clear(): IFactory;

    registerPool<T>(type: Type<T>, capacity?: number, instantiateNow?: boolean,
                    isBusyFlagGetterName?: string): IFactory;

    unregisterPool<T>(type: Type<T>): IFactory;

    increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IFactory;

    setSafePool(value: boolean): IFactory;

    appendMappingConfig(config: FactoryConfig): IFactory;

    mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IFactory;

    mergeIntoLazy(): IFactory;

    clearLazy(): IFactory;

    get injector(): IDependencyContainer;
}

export class Factory extends AbstractDisposable implements IFactory
{
    private readonly _injector: IDependencyContainer = new DependencyContainer();

    private readonly typeMap: Map<Type, MappingData[]> = new Map<Type, MappingData[]>();
    private readonly valueMap: Map<Type, MappingData[]> = new Map<Type, MappingData[]>();

    private readonly poolModelMap: Map<Type, PoolModel> = new Map<Type, PoolModel>();

    private _safePool = true;

    public constructor(logger?: ILogger)
    {
        super();

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
        this.clear();

        super.dispose();
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
        this.poolModelMap.forEach((value) => value.dispose());

        this.poolModelMap.clear();

        return this;
    }

    private checkPoolHasType<T>(type: Type<T>): void
    {
        if (!this.poolModelMap.has(type))
        {
            throw new Error("Pool '" + Factory.getTypeName(type) + "' is not registered! Call registerPool.");
        }
    }

    public mapToType<T>(type: Type<T>, to: Class<T>, name?: string): IFactory
    {
        this.addMapping(this.typeMap, type, to, name);
        this.syncBindings(type);

        return this;
    }

    public mapToValue<T>(type: Type<T>, to: T, name?: string): IFactory
    {
        this.addMapping(this.valueMap, type, to, name);
        this.syncBindings(type);

        return this;
    }

    public instantiateValueUnmapped<T>(type: Type<T>): T
    {
        const mappingData: MappingData | undefined = Factory.includesName(this.valueMap.get(type));

        if (!mappingData)
        {
            return this.getInstance(type);
        }

        this.unmapFromValue(type);

        const instance: T = this.getInstance(type);

        this.mapToValue(type, mappingData.typeOrValue);

        return instance;
    }

    public getInstance<T>(type: Type<T>, name?: string, ignorePool?: boolean): T
    {
        if (!ignorePool && this.hasPoolForType(type))
        {
            return this.getFromPool(type);
        }

        if (!this.hasValueMapping(type, name) && !this.hasTypeMapping(type, name))
        {
            const defaultImpl: Class<any> | undefined = getDefaultImplementation(type);

            if (defaultImpl)
            {
                this.verbose("Mapping to default implementation '" + defaultImpl.name + "'.");

                this.mapToType(type, defaultImpl);
            }
        }

        return name ? this._injector.resolve(type, name) : this._injector.resolve(type);
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

    public mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IFactory
    {
        setLazyBinding(type, to, name);

        return this;
    }

    public mergeIntoLazy(): IFactory
    {
        for (const [type, mappingList] of this.valueMap)
        {
            for (const mapping of mappingList)
            {
                setLazyBinding(type, mapping.typeOrValue, mapping.name);
            }
        }

        return this;
    }

    public clearLazy(): IFactory
    {
        clearLazyBindings();

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
        if (capacity === 0)
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

                        this.mapToType(interfaceDefinition, getClassFromString(value.implementation), name);
                    }

                    if (value.newInstance)
                    {
                        this.info("Creating new instance and mapping to value: '" + interfaceDefinition + "'" +
                            (name ? " with name '" + name + "'" : ""));

                        this.mapToValue(interfaceDefinition, this.getInstance(interfaceDefinition), name);
                    }
                }
            }
        }

        return this;
    }
}
