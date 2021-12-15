/* eslint-disable @typescript-eslint/no-explicit-any */

import {Container} from "inversify";
import getDecorators from "inversify-inject-decorators";
import ArrayUtils from "../utils/ArrayUtils";
import {IDisposable, IDisposableImmutable} from "../common/IDisposable";
import {AbstractDisposable} from "../common/AbstractDisposable";
import {Class, getClassFromString, getDefaultImplementation, logger, Type} from "../Global";
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
    private factory: IFactory;
    private readonly isBusyFlagGetterName: string;

    public constructor(factory: Factory, capacity: number, isBusyFlagGetterName: string)
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

export interface IFactoryImmutable extends IDisposableImmutable
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

export interface IFactory extends IFactoryImmutable, IDisposable
{
    mapToType<T>(type: Type<T>, to: Class<T>, name?: string): IFactory;

    mapToValue<T>(type: Type<T>, to: T, name?: string): IFactory;

    unmapFromType<T>(type: Type<T>, name?: string): IFactory;

    unmapFromValue<T>(type: Type<T>, name?: string): IFactory;

    instantiateValueUnmapped<T>(type: Type<T>): T;

    clear(): IFactory;

    registerPool<T>(type: Type<T>, capacity?: number, instantiateNow?: boolean,
                    isBusyFlagGetterName?: string): IFactory;

    unregisterPool<T>(type: Type<T>): IFactory;

    increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IFactory;

    setSafePool(value: boolean): IFactory;

    appendMappingConfig(config: Map<string, DependencyVo>): IFactory;

    mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IFactory;

    mergeIntoLazy(): IFactory;

    clearLazy(): IFactory;
}

export class Factory extends AbstractDisposable implements IFactory
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

    public override dispose()
    {
        this.clear();

        super.dispose();
    }

    private static getTypeForType<T>(type: Type<T>): string
    {
        return "__$" + Factory.getTypeName(type) + "$__";
    }

    private map<T>(type: Type<T>, to: T | Class<T>, name: string, map: Map<any, MappingData[]>, unmapMethod: (type: Type<T>, name?: string) => void): boolean
    {
        let mappedToTypeOrValueList: MappingData[] = map.get(type);
        let mapOrRemap = true;

        if (!this.autoMapAfterUnmap)
        {
            if (mappedToTypeOrValueList)
            {
                const currentMapping = Factory.includesName(mappedToTypeOrValueList, name);

                if (currentMapping)
                {
                    const typeName = Factory.getTypeName(type);
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

    private unmap<T>(type: Type<T>, name: string, map: Map<any, MappingData[]>, mapMethod: (type: Type<T>, to: Class<T>, name?: string) => IFactory)
    {
        const mappingList = map.get(type);
        if (mappingList)
        {
            const mapping: MappingData = Factory.includesName(mappingList, name);
            if (mapping)
            {
                ArrayUtils.remove(mappingList, mapping);
                this.injector.unbind(map === this.typeMap ? Factory.getTypeForType(type) : type);

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
            logger.warn("All pool items are busy for class '" + Factory.getTypeName(type) + "'. Extending pool...");

            this.increasePoolCapacity(type, 1);

            logger.info("Pool capacity for '" + Factory.getTypeName(type) + "' increased!");
        }

        return poolModel.get(type, createNewIfNeeded);
    }

    private clearPools(): IFactory
    {
        this.poolModelMap.forEach((value) => value.dispose());

        this.poolModelMap.clear();

        return this;
    }

    private checkPoolHasType<T>(type: Type<T>)
    {
        if (!this.poolModelMap.has(type))
        {
            throw new Error("Pool '" + Factory.getTypeName(type) + "' is not registered! Call registerPool.");
        }
    }

    private static getTypeName<T>(type: Type<T>): string
    {
        return typeof type === "string" ? type : type.name;
    }

    public mapToType<T>(type: Type<T>, to: Class<T>, name?: string): IFactory
    {
        const mapSuccess: boolean = this.map(type, to, name, this.typeMap, this.unmapFromType.bind(this));

        if (mapSuccess)
        {
            const bs = this.injector.bind(Factory.getTypeForType(type)).to(to);

            if (name)
            {
                bs.whenTargetNamed(name);
            }
        }

        return this;
    }

    public mapToValue<T>(type: Type<T>, to: T, name?: string,): IFactory
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
        const mappingData: MappingData = Factory.includesName(this.valueMap.get(type));

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
            resolvedType = Factory.getTypeForType(type);
        }

        return name ? this.injector.getNamed(resolvedType, name) : this.injector.get(resolvedType);
    }

    public hasTypeMapping<T>(type: Type<T>, name?: string): boolean
    {
        return Factory.includesName(this.typeMap.get(type), name) != null;
    }

    public hasValueMapping<T>(type: Type<T>, name?: string): boolean
    {
        return Factory.includesName(this.valueMap.get(type), name) != null;
    }

    public unmapFromType<T>(type: Type<T>, name?: string): IFactory
    {
        if (this.hasTypeMapping(type, name))
        {
            this.unmap(type, name, this.typeMap, this.mapToType.bind(this));
        }

        return this;
    }

    public unmapFromValue<T>(type: Type<T>, name?: string): IFactory
    {
        if (this.hasValueMapping(type, name))
        {
            this.unmap(type, name, this.valueMap, this.mapToValue.bind(this));
        }

        return this;
    }

    public clear(): IFactory
    {
        this.injector.unbindAll();
        this.typeMap.clear();
        this.valueMap.clear();

        this.clearPools();

        return this;
    }

    public mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IFactory
    {
        const bs = lazyContainer.bind(type).toConstantValue(to);

        if (name)
        {
            bs.whenTargetNamed(name);
        }

        return this;
    }

    public mergeIntoLazy(): IFactory
    {
        mergeIntoLazyOne(this.injector);

        return this;
    }

    public clearLazy(): IFactory
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

    public increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IFactory
    {
        this.checkPoolHasType(type);

        this.poolModelMap.get(type).increaseCapacity(additionalCapacity);

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
            logger.warn("Pool '" + Factory.getTypeName(type) + "' already registered! Call unregisterPool before.");
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

    public setSafePool(value: boolean): IFactory
    {
        this._safePool = value;

        return this;
    }

    public appendMappingConfig(config: Map<string, DependencyVo>): IFactory
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

    public unregisterPool<T>(type: Type<T>): IFactory
    {
        if (this.poolModelMap.has(type))
        {
            this.poolModelMap.get(type).dispose();

            this.poolModelMap.delete(type);
        }

        return this;
    }
}