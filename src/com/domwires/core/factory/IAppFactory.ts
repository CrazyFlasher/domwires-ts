/* eslint-disable @typescript-eslint/no-explicit-any */

import {Container} from "inversify";
import "reflect-metadata";
import getDecorators from "inversify-inject-decorators";
import ArrayUtils from "../utils/ArrayUtils";
import {IDisposable, IDisposableImmutable} from "../common/IDisposable";
import {AbstractDisposable} from "../common/AbstractDisposable";
import {Class, getClassFromString, getDefaultImplementation, logger} from "../Global";
import {getBindingDictionary} from "inversify/lib/planning/planner";

const lazyContainer: Container = new Container();

export const {lazyInject, lazyInjectNamed} = getDecorators(lazyContainer, false);

function clearLazyOne(): void
{
    lazyContainer.unbindAll();
}

function mergeIntoLazyOne(from: Container): void
{
    const origin = getBindingDictionary(from);
    const destination = getBindingDictionary(lazyContainer);
    origin.traverse((key, value) =>
    {
        value.forEach((binding) =>
        {
            destination.add(binding.serviceIdentifier, binding.clone());
        });
    });
}

type MappingData<T = any> = {
    readonly typeOrValue: T;
    readonly name?: string;
};

type Type<T = any> = string | Class<T>;

export class DependencyVo
{
    private readonly _implementation: string;
    private readonly _value: JSON;
    private readonly _newInstance: boolean;

    public constructor(json: any)
    {
        if (json.implementation == null)
        {
            logger.warn("'implementation' is not set in json!");
        }
        else
        {
            this._implementation = json.implementation;
        }

        this._value = json.value;

        if (json.newInstance)
        {
            this._newInstance = json.newInstance;
        }
    }

    public get implementation(): string
    {
        return this._implementation;
    }

    public get value(): any
    {
        return this._value;
    }

    public get newInstance(): boolean
    {
        return this._newInstance;
    }
}

export class MappingConfigDictionary
{
    private _map: Map<string, DependencyVo> = new Map();

    public constructor(json: any)
    {
        if (json != null)
        {
            for (const key of Object.keys(json))
            {
                this._map.set(key, new DependencyVo(Reflect.get(json, key)));
            }
        }
    }

    public get map(): Map<string, DependencyVo>
    {
        return this._map;
    }
}


class PoolModel
{
    private list: any[] = [];
    private _capacity: number;

    private currentIndex = 0;
    private factory: IAppFactory;
    private readonly isBusyFlagGetterName: string;

    public constructor(factory: AppFactory, capacity: number, isBusyFlagGetterName: string)
    {
        this.factory = factory;
        this._capacity = capacity;
        this.isBusyFlagGetterName = isBusyFlagGetterName;
    }

    public get<T>(type: Type<T>, createNewIfNeeded = true): T
    {
        let instance: T;

        if (this.list.length < this._capacity && createNewIfNeeded)
        {

            instance = this.factory.getInstance(type, null, true);

            this.list.push(instance);
        }
        else
        {
            instance = this.list[this.currentIndex];

            this.currentIndex++;

            if (this.currentIndex === this._capacity || this.currentIndex === this.list.length)
            {
                this.currentIndex = 0;
            }

            if (this.isBusyFlagGetterName != null)
            {
                if ((instance as any)[this.isBusyFlagGetterName])
                {
                    return this.get(type, createNewIfNeeded);
                }
            }
        }

        return instance;
    }

    public increaseCapacity(value: number): void
    {
        this._capacity += value;
    }

    public dispose(): void
    {
        this.list = null;
        this.factory = null;
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
        if (this.isBusyFlagGetterName == null)
        {
            return false;
        }

        let instance: any;

        for (let i = 0; i < this._capacity; i++)
        {
            instance = this.list[i];

            if (!(instance as any)[this.isBusyFlagGetterName])
            {
                return false;
            }
        }

        return true;
    }

    public get busyItemsCount(): number
    {
        if (this.isBusyFlagGetterName == null)
        {
            return 0;
        }

        let count = 0;
        for (const instance of this.list)
        {
            if ((instance as any)[this.isBusyFlagGetterName])
            {
                count++;
            }
        }

        return count;
    }
}

export interface IAppFactoryImmutable extends IDisposableImmutable
{
    getInstance<T>(type: Type<T>, name?: string, ignorePool?: boolean): T;

    hasTypeMapping<T>(type: Type<T>, name?: string): boolean;

    hasValueMapping<T>(type: Type<T>, name?: string): boolean;

    hasPoolForType<T>(type: Type<T>): boolean;

    getPoolCapacity<T>(type: Type<T>): number;

    getPoolInstanceCount<T>(type: Type<T>): number;

    getAllPoolItemsAreBusy<T>(type: Type<T>): boolean;

    getPoolBusyInstanceCount<T>(type: Type<T>): number;
}

export interface IAppFactory extends IAppFactoryImmutable, IDisposable
{
    mapToType<T>(type: Type<T>, to: Class<T>, name?: string): IAppFactory;

    mapToValue<T>(type: Type<T>, to: T, name?: string): IAppFactory;

    unmapFromType<T>(type: Type<T>, name?: string): IAppFactory;

    unmapFromValue<T>(type: Type<T>, name?: string): IAppFactory;

    instantiateValueUnmapped<T>(type: Type<T>): T;

    clear(): IAppFactory;

    registerPool<T>(type: Type<T>, capacity?: number, instantiateNow?: boolean,
                    isBusyFlagGetterName?: string): IAppFactory;

    unregisterPool<T>(type: Type<T>): IAppFactory;

    increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IAppFactory;

    setSafePool(value: boolean): IAppFactory;

    appendMappingConfig(config: Map<string, DependencyVo>): IAppFactory;

    mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IAppFactory;

    mergeIntoLazy(): IAppFactory;

    clearLazy(): IAppFactory;
}

export class AppFactory extends AbstractDisposable implements IAppFactory
{
    private injector: Container = new Container();

    private typeMap: Map<Type, MappingData[]> = new Map<Type, MappingData[]>();
    private valueMap: Map<Type, MappingData[]> = new Map<Type, MappingData[]>();

    private autoMapAfterUnmap: boolean;

    private poolModelMap: Map<Type, PoolModel> = new Map<Type, PoolModel>();

    private _safePool = true;

    private static includesName(list: MappingData[], name?: string): MappingData
    {
        if (!list) return null;

        for (const value of list)
        {
            if ((!value.name && !name) || value.name === name)
            {
                return value;
            }
        }

        return null;
    }

    public dispose()
    {
        this.clear();

        super.dispose();
    }

    private static getTypeForType<T>(type: Type<T>): string
    {
        return "__$" + AppFactory.getTypeName(type) + "$__";
    }

    private map<T>(type: Type<T>, to: T | Class<T>, name: string, map: Map<any, MappingData[]>, unmapMethod: (type: Type<T>, name?: string) => void): boolean
    {
        let mappedToTypeOrValueList: MappingData[] = map.get(type);
        let mapOrRemap = true;

        if (!this.autoMapAfterUnmap)
        {
            if (mappedToTypeOrValueList)
            {
                const currentMapping = AppFactory.includesName(mappedToTypeOrValueList, name);

                if (currentMapping)
                {
                    const typeName = AppFactory.getTypeName(type);
                    const toName = to.constructor.name;

                    if (currentMapping.typeOrValue === to)
                    {
                        // "type" is already mapped to "to". No need to remap

                        mapOrRemap = false;
                    }
                    else
                    {
                        if (!name)
                        {
                            logger.warn(typeName + " is already mapped to " + toName + ". Remapping...");
                        }
                        else
                        {
                            logger.warn(typeName + " is already mapped to " + toName + " with name \"" + name + "\". Remapping...");
                        }

                        unmapMethod(type, name);
                    }
                }
            }

            if (mapOrRemap)
            {
                if (!mappedToTypeOrValueList)
                {
                    mappedToTypeOrValueList = [];
                }

                if (!map.has(type))
                {
                    map.set(type, mappedToTypeOrValueList);
                }

                mappedToTypeOrValueList.push({typeOrValue: to, name});
            }
        }

        return mapOrRemap;
    }

    private unmap<T>(type: Type<T>, name: string, map: Map<any, MappingData[]>, mapMethod: (type: Type<T>, to: Class<T>, name?: string) => IAppFactory)
    {
        const mappingList = map.get(type);
        if (mappingList)
        {
            const mapping: MappingData = AppFactory.includesName(mappingList, name);
            if (mapping)
            {
                ArrayUtils.remove(mappingList, mapping);
                this.injector.unbind(map === this.typeMap ? AppFactory.getTypeForType(type) : type);

                if (mappingList.length)
                {
                    for (const currentMapping of mappingList)
                    {
                        this.autoMapAfterUnmap = true;

                        mapMethod(type, currentMapping.typeOrValue, currentMapping.name);

                        this.autoMapAfterUnmap = false;
                    }
                }
                else
                {
                    map.delete(type);
                }
            }
        }
    }

    private getFromPool<T>(type: Type<T>, createNewIfNeeded = true): T
    {
        this.checkPoolHasType(type);

        const poolModel: PoolModel = this.poolModelMap.get(type);

        if (this._safePool && this.getAllPoolItemsAreBusy(type))
        {
            logger.warn("All pool items are busy for class '" + AppFactory.getTypeName(type) + "'. Extending pool...");

            this.increasePoolCapacity(type, 1);

            logger.info("Pool capacity for '" + AppFactory.getTypeName(type) + "' increased!");
        }

        return poolModel.get(type, createNewIfNeeded);
    }

    private clearPools(): IAppFactory
    {
        this.poolModelMap.forEach((value) => value.dispose());

        this.poolModelMap.clear();

        return this;
    }

    private checkPoolHasType<T>(type: Type<T>)
    {
        if (!this.poolModelMap.has(type))
        {
            throw new Error("Pool '" + AppFactory.getTypeName(type) + "' is not registered! Call registerPool.");
        }
    }

    private static getTypeName<T>(type: Type<T>): string
    {
        return typeof type === "string" ? type : type.name;
    }

    public mapToType<T>(type: Type<T>, to: Class<T>, name?: string): IAppFactory
    {
        const mapSuccess: boolean = this.map(type, to, name, this.typeMap, this.unmapFromType.bind(this));

        if (mapSuccess)
        {
            const bs = this.injector.bind(AppFactory.getTypeForType(type)).to(to);

            if (name)
            {
                bs.whenTargetNamed(name);
            }
        }

        return this;
    }

    public mapToValue<T>(type: Type<T>, to: T, name?: string,): IAppFactory
    {
        const mapSuccess: boolean = this.map(type, to, name, this.valueMap, this.unmapFromValue.bind(this));

        if (mapSuccess)
        {
            const bs = this.injector.bind(type).toConstantValue(to);

            if (name)
            {
                bs.whenTargetNamed(name);
            }
        }

        return this;
    }

    public instantiateValueUnmapped<T>(type: Type<T>): T
    {
        const mappingData: MappingData = AppFactory.includesName(this.valueMap.get(type));

        if (mappingData)
        {
            this.unmapFromValue(type);
        }

        const instance = this.getInstance(type);

        if (mappingData)
        {
            this.mapToValue(type, mappingData.typeOrValue);
        }

        return instance;
    }

    public getInstance<T>(type: Type<T>, name?: string, ignorePool?: boolean): T
    {
        if (!ignorePool)
        {
            if (this.hasPoolForType(type))
            {
                return this.getFromPool(type);
            }
        }

        const hasValue: boolean = this.hasValueMapping(type, name);
        const hasType: boolean = this.hasTypeMapping(type, name);
        let resolvedType: Type<T> = type;

        if (!hasValue && !hasType)
        {
            const defaultImpl: Class<T> = getDefaultImplementation(type);

            if (defaultImpl)
            {
                logger.info("Mapping to default implementation '" + defaultImpl.name + "'.");

                this.mapToType(type, defaultImpl);
            }
        }

        if (!hasValue)
        {
            resolvedType = AppFactory.getTypeForType(type);
        }

        return name ? this.injector.getNamed(resolvedType, name) : this.injector.get(resolvedType);
    }

    public hasTypeMapping<T>(type: Type<T>, name?: string): boolean
    {
        return AppFactory.includesName(this.typeMap.get(type), name) != null;
    }

    public hasValueMapping<T>(type: Type<T>, name?: string): boolean
    {
        return AppFactory.includesName(this.valueMap.get(type), name) != null;
    }

    public unmapFromType<T>(type: Type<T>, name?: string): IAppFactory
    {
        if (this.hasTypeMapping(type, name))
        {
            this.unmap(type, name, this.typeMap, this.mapToType.bind(this));
        }

        return this;
    }

    public unmapFromValue<T>(type: Type<T>, name?: string): IAppFactory
    {
        if (this.hasValueMapping(type, name))
        {
            this.unmap(type, name, this.valueMap, this.mapToValue.bind(this));
        }

        return this;
    }

    public clear(): IAppFactory
    {
        this.injector.unbindAll();
        this.typeMap.clear();
        this.valueMap.clear();

        this.clearPools();

        return this;
    }

    public mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IAppFactory
    {
        const bs = lazyContainer.bind(type).toConstantValue(to);

        if (name)
        {
            bs.whenTargetNamed(name);
        }

        return this;
    }

    public mergeIntoLazy(): IAppFactory
    {
        mergeIntoLazyOne(this.injector);

        return this;
    }

    public clearLazy(): IAppFactory
    {
        clearLazyOne();

        return this;
    }

    public getAllPoolItemsAreBusy<T>(type: Type<T>): boolean
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).allItemsAreBusy;
    }

    public getPoolBusyInstanceCount<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).busyItemsCount;
    }

    public getPoolCapacity<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).capacity;
    }

    public getPoolInstanceCount<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).instanceCount;
    }

    public hasPoolForType<T>(type: Type<T>): boolean
    {
        return this.poolModelMap.has(type);
    }

    public increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IAppFactory
    {
        this.checkPoolHasType(type);

        this.poolModelMap.get(type).increaseCapacity(additionalCapacity);

        return this;
    }

    public registerPool<T>(type: Type<T>, capacity = 5, instantiateNow?: boolean, isBusyFlagGetterName?: string): IAppFactory
    {
        if (capacity === 0)
        {
            throw new Error("Capacity should be > 0!");
        }

        if (this.poolModelMap.has(type))
        {
            logger.warn("Pool '" + AppFactory.getTypeName(type) + "' already registered! Call unregisterPool before.");
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

    public setSafePool(value: boolean): IAppFactory
    {
        this._safePool = value;

        return this;
    }

    public appendMappingConfig(config: Map<string, DependencyVo>): IAppFactory
    {
        let name: string;
        let d: DependencyVo;
        let splitted: string[];

        for (let interfaceDefinition of config.keys())
        {
            name = undefined;
            d = config.get(interfaceDefinition);

            splitted = interfaceDefinition.split("$");
            if (splitted.length > 1)
            {
                name = splitted[1];
                interfaceDefinition = splitted[0];
            }

            if (d.value != null)
            {
                if (name)
                {
                    this.mapToValue(interfaceDefinition, d.value, name);
                }
                else
                {
                    this.mapToValue(interfaceDefinition, d.value);
                }
            }
            else
            {
                if (d.implementation != null)
                {
                    logger.info("Mapping '" + interfaceDefinition + "' to '" + d.implementation + "'");

                    this.mapToType(interfaceDefinition, getClassFromString(d.implementation), name);
                }

                if (d.newInstance)
                {
                    this.mapToValue(interfaceDefinition, this.getInstance(interfaceDefinition), name);
                }
            }
        }

        return this;
    }

    public unregisterPool<T>(type: Type<T>): IAppFactory
    {
        if (this.poolModelMap.has(type))
        {
            this.poolModelMap.get(type).dispose();

            this.poolModelMap.delete(type);
        }

        return this;
    }
}