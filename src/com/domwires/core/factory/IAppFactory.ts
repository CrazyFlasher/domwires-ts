import {Container} from "inversify";
import "reflect-metadata";
import getDecorators from "inversify-inject-decorators";
import ArrayUtils from "../utils/ArrayUtils";
import {IDisposable, IDisposableImmutable} from "../common/IDisposable";
import {AbstractDisposable} from "../common/AbstractDisposable";
import {Class, getDefaultImplementation, logger} from "../Global";
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

type MappingData = {
    readonly typeOrValue: any;
    readonly name?: string;
};

type Type<T> = string | Class<T>;

class PoolModel
{
    private list: any[] = [];
    private _capacity: number;

    private currentIndex: number = 0;
    private factory: IAppFactory;
    private readonly isBusyFlagGetterName: string;

    constructor(factory: AppFactory, capacity: number, isBusyFlagGetterName: string)
    {
        this.factory = factory;
        this._capacity = capacity;
        this.isBusyFlagGetterName = isBusyFlagGetterName;
    }

    public get<T>(type: Type<T>, createNewIfNeeded: boolean = true): T
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

        let count: number = 0;
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

    mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IAppFactory;

    mergeIntoLazy(): IAppFactory;

    clearLazy(): IAppFactory;
}

export class AppFactory extends AbstractDisposable implements IAppFactory
{
    private injector: Container = new Container();

    private typeMap: Map<Type<any>, MappingData[]> = new Map<Type<any>, MappingData[]>();
    private valueMap: Map<Type<any>, MappingData[]> = new Map<Type<any>, MappingData[]>();

    private autoMapAfterUnmap: boolean;

    private poolModelMap: Map<Type<any>, PoolModel> = new Map<Type<any>, PoolModel>();

    private _safePool: boolean = true;

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

    dispose()
    {
        this.clear();

        super.dispose();
    }

    private static getTypeForType<T>(type: Type<T>): string
    {
        return "__$" + AppFactory.getTypeName(type) + "$__";
    }

    private map<T>(type: Type<T>, to: T | Class<T>, name: string, map: Map<any, MappingData[]>, unmapMethod: (type: any, name?: any) => void): boolean
    {
        let mappedToTypeOrValueList: MappingData[] = map.get(type);
        let mapOrRemap: boolean = true;

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
                        logger.warn(typeName + " is already mapped to " + toName + ". No need to remap...");

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

    private getFromPool<T>(type: Type<T>, createNewIfNeeded: boolean = true): T
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

    mapToType<T>(type: Type<T>, to: Class<T>, name?: string): IAppFactory
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

    mapToValue<T>(type: Type<T>, to: T, name?: string,): IAppFactory
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

    instantiateValueUnmapped<T>(type: Type<T>): T
    {
        // const returnType = this.includesName(this.typeMap.get(type));
        // let value:any;
        //
        // if (!returnType)
        // {
        //     const defaultImpl:Class<T> = getDefaultImplementation(type);
        //
        //     if (defaultImpl)
        //     {
        //         logger.info("Returning instance of default implementation '" + defaultImpl.name + "'.");
        //
        //         value = defaultImpl;
        //     }
        // }

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

    getInstance<T>(type: Type<T>, name?: string, ignorePool?: boolean): T
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

    hasTypeMapping<T>(type: Type<T>, name?: string): boolean
    {
        return AppFactory.includesName(this.typeMap.get(type), name) != null;
    }

    hasValueMapping<T>(type: Type<T>, name?: string): boolean
    {
        return AppFactory.includesName(this.valueMap.get(type), name) != null;
    }

    unmapFromType<T>(type: Type<T>, name?: string): IAppFactory
    {
        if (this.hasTypeMapping(type, name))
        {
            this.unmap(type, name, this.typeMap, this.mapToType.bind(this));
        }

        return this;
    }

    unmapFromValue<T>(type: Type<T>, name?: string): IAppFactory
    {
        if (this.hasValueMapping(type, name))
        {
            this.unmap(type, name, this.valueMap, this.mapToValue.bind(this));
        }

        return this;
    }

    clear(): IAppFactory
    {
        this.injector.unbindAll();
        this.typeMap.clear();
        this.valueMap.clear();

        this.clearPools();

        return this;
    }

    mapValueToLazy<T>(type: Type<T>, to: T, name?: string): IAppFactory
    {
        const bs = lazyContainer.bind(type).toConstantValue(to);

        if (name)
        {
            bs.whenTargetNamed(name);
        }

        return this;
    }

    mergeIntoLazy(): IAppFactory
    {
        mergeIntoLazyOne(this.injector);

        return this;
    }

    clearLazy(): IAppFactory
    {
        clearLazyOne();

        return this;
    }

    getAllPoolItemsAreBusy<T>(type: Type<T>): boolean
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).allItemsAreBusy;
    }

    getPoolBusyInstanceCount<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).busyItemsCount;
    }

    getPoolCapacity<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).capacity;
    }

    getPoolInstanceCount<T>(type: Type<T>): number
    {
        this.checkPoolHasType(type);

        return this.poolModelMap.get(type).instanceCount;
    }

    hasPoolForType<T>(type: Type<T>): boolean
    {
        return this.poolModelMap.has(type);
    }

    increasePoolCapacity<T>(type: Type<T>, additionalCapacity: number): IAppFactory
    {
        this.checkPoolHasType(type);

        this.poolModelMap.get(type).increaseCapacity(additionalCapacity);

        return this;
    }

    registerPool<T>(type: Type<T>, capacity: number = 5, instantiateNow?: boolean, isBusyFlagGetterName?: string): IAppFactory
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

    setSafePool(value: boolean): IAppFactory
    {
        this._safePool = value;

        return this;
    }

    unregisterPool<T>(type: Type<T>): IAppFactory
    {
        if (this.poolModelMap.has(type))
        {
            this.poolModelMap.get(type).dispose();

            this.poolModelMap.delete(type);
        }

        return this;
    }
}