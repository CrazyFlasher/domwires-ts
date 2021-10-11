import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {Enum} from "../../Enum";
import {ICommand} from "./ICommand";
import {Class, setDefaultImplementation} from "../../Global";
import {IGuards} from "./IGuards";
import {inject, optional, postConstruct} from "inversify";
import {AbstractDisposable} from "../../common/AbstractDisposable";
import {IAppFactory} from "../../factory/IAppFactory";
import ArrayUtils from "../../utils/ArrayUtils";
import "reflect-metadata";

export type CommandMapperConfig = {
    readonly singletonCommands: boolean
}

export class MappingConfig<T>
{
    private readonly _commandClass: Class<ICommand>;
    private readonly _data: T
    private readonly _once: boolean;
    private _guardList: Array<Class<IGuards>>;
    private _oppositeGuardList: Array<Class<IGuards>>;
    private readonly _stopOnExecute: boolean;

    constructor(commandClass: Class<ICommand>, data: T, once: boolean, stopOnExecute: boolean = false)
    {
        this._commandClass = commandClass;
        this._data = data;
        this._once = once;
        this._stopOnExecute = stopOnExecute;
    }

    public addGuards(value: Class<IGuards>): MappingConfig<T>
    {
        if (this._guardList == null)
        {
            this._guardList = [];
        }
        this._guardList.push(value);

        return this;
    }

    public addGuardsNot(value: Class<IGuards>): MappingConfig<T>
    {
        if (this._oppositeGuardList == null)
        {
            this._oppositeGuardList = [];
        }
        this._oppositeGuardList.push(value);

        return this;
    }

    public get commandClass(): Class<ICommand>
    {
        return this._commandClass;
    }

    public get once(): boolean
    {
        return this._once;
    }

    public get data(): T
    {
        return this._data;
    }

    public get guardList(): Array<Class<IGuards>>
    {
        return this._guardList;
    }

    public get stopOnExecute(): boolean
    {
        return this._stopOnExecute;
    }

    public get oppositeGuardList(): Array<Class<IGuards>>
    {
        return this._oppositeGuardList;
    }
}

export class MappingConfigList<T>
{
    private readonly list: Array<MappingConfig<T>>;

    constructor()
    {
        this.list = [];
    }

    public push(item: MappingConfig<T>): void
    {
        this.list.push(item);
    }

    public addGuards(value: Class<IGuards>): MappingConfigList<T>
    {
        for (let mappingConfig of this.list)
        {
            mappingConfig.addGuards(value);
        }

        return this;
    }

    public addGuardsNot(value: Class<IGuards>): MappingConfigList<T>
    {
        for (let mappingConfig of this.list)
        {
            mappingConfig.addGuardsNot(value);
        }

        return this;
    }
}

class CommandMap<T = any> extends Map<Enum, Array<MappingConfig<T>>>
{

}

export interface ICommandMapperImmutable extends IDisposableImmutable
{
    hasMapping(messageType: Enum): boolean;
}

export interface ICommandMapper extends ICommandMapperImmutable, IDisposable
{
    map<T>(messageType: Enum, commandClass: Class<ICommand>, data?: T, once?: boolean,
           stopOnExecute?: boolean): MappingConfig<T>;

    map1<T>(messageType: Enum, commandClassList: Array<Class<ICommand>>, data?: T, once?: boolean,
            stopOnExecute?: boolean): MappingConfigList<T>;

    map2<T>(messageTypeList: Array<Enum>, commandClass: Class<ICommand>, data?: T, once?: boolean,
            stopOnExecute?: boolean): MappingConfigList<T>;

    map3<T>(messageTypeList: Array<Enum>, commandClassList: Array<Class<ICommand>>, data?: T, once?: boolean,
            stopOnExecute?: boolean): MappingConfigList<T>;

    unmap<T>(messageType: Enum, commandClass: Class<ICommand>): ICommandMapper;

    clear(): ICommandMapper;

    unmapAll<T>(messageType: Enum): ICommandMapper;

    tryToExecuteCommand<T>(messageType: Enum, messageData?: T): void;

    executeCommand<T>(commandClass: Class<ICommand>, data?: T, guardList?: Array<Class<IGuards>>,
                      guardNotList?: Array<Class<IGuards>>): boolean;

    setMergeMessageDataAndMappingData(value: boolean): ICommandMapper;
}

export class CommandMapper extends AbstractDisposable implements ICommandMapper
{
    @inject("CommandMapperConfig") @optional()
    private config: CommandMapperConfig;

    @inject("IAppFactory")
    private factory: IAppFactory;

    private commandMap: CommandMap = new CommandMap();

    private _mergeMessageDataAndMappingData: boolean;

    @postConstruct()
    private init(): void
    {
        if (!this.config)
        {
            this.config = {singletonCommands: true};
        }

        this.factory.mapToValue("ICommandMapper", this);
    }

    dispose()
    {
        this.clear();

        super.dispose();
    }

    map<T>(messageType: Enum, commandClass: Class<ICommand>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfig<T>
    {
        const mappingConfig: MappingConfig<T> = new MappingConfig(commandClass, data, once, stopOnExecute);

        let list: Array<MappingConfig<T>> = this.commandMap.get(messageType);

        if (list == null)
        {
            list = [mappingConfig];
            this.commandMap.set(messageType, list);
        }
        else if (this.mappingListContains(list, commandClass) == null)
        {
            list.push(mappingConfig);
        }

        return mappingConfig;
    }

    map1<T>(messageType: Enum, commandClassList: Array<Class<ICommand>>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>
    {
        const mappingConfigList: MappingConfigList<T> = new MappingConfigList();

        for (let commandClass of commandClassList)
        {
            const soe: boolean = stopOnExecute && commandClassList.indexOf(commandClass) == commandClassList.length - 1;
            mappingConfigList.push(this.map(messageType, commandClass, data, once, soe));
        }

        return mappingConfigList;
    }

    map2<T>(messageTypeList: Array<Enum>, commandClass: Class<ICommand>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>
    {
        const mappingConfigList: MappingConfigList<T> = new MappingConfigList();

        for (let messageType of messageTypeList)
        {
            const soe: boolean = stopOnExecute && messageTypeList.indexOf(messageType) == messageTypeList.length - 1;
            mappingConfigList.push(this.map(messageType, commandClass, data, once, soe));
        }

        return mappingConfigList;
    }

    map3<T>(messageTypeList: Array<Enum>, commandClassList: Array<Class<ICommand>>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>
    {
        const mappingConfigList: MappingConfigList<T> = new MappingConfigList();

        for (let commandClass of commandClassList)
        {
            for (let messageType of messageTypeList)
            {
                const soe: boolean = stopOnExecute
                    && messageTypeList.indexOf(messageType) == messageTypeList.length - 1
                    && commandClassList.indexOf(commandClass) == commandClassList.length - 1;

                mappingConfigList.push(this.map(messageType, commandClass, data, once, soe));
            }
        }

        return mappingConfigList;
    }

    unmap<T>(messageType: Enum, commandClass: Class<ICommand>): ICommandMapper
    {
        let list: Array<MappingConfig<T>> = this.commandMap.get(messageType);
        if (list != null)
        {
            const mappingVo: MappingConfig<T> = this.mappingListContains(list, commandClass, true);
            if (mappingVo != null)
            {
                ArrayUtils.remove(list, mappingVo);

                if (list.length == 0)
                {
                    list = null;

                    this.commandMap.delete(messageType);
                }
            }
        }

        return this;
    }

    hasMapping(messageType: Enum): boolean
    {
        return this.commandMap.get(messageType) != null;
    }

    clear(): ICommandMapper
    {
        this.commandMap.clear();

        return this;
    }

    unmapAll<T>(messageType: Enum): ICommandMapper
    {
        const list: Array<MappingConfig<T>> = this.commandMap.get(messageType);
        if (list != null)
        {
            this.commandMap.delete(messageType);
        }

        return this;
    }

    tryToExecuteCommand<T>(messageType: Enum, messageData?: T): void
    {
        const mappedToMessageCommands: Array<MappingConfig<T>> = this.commandMap.get(messageType);

        if (mappedToMessageCommands != null)
        {
            let commandClass: Class<ICommand>;
            let injectionData: T;
            for (let mappingVo of mappedToMessageCommands)
            {
                if (!this._mergeMessageDataAndMappingData)
                {
                    injectionData = messageData == null ? mappingVo.data : messageData;
                }
                else
                {
                    injectionData = this.mergeData(messageData, mappingVo.data);
                }

                commandClass = mappingVo.commandClass;

                const success: boolean = this.executeCommand(commandClass, injectionData, mappingVo.guardList, mappingVo.oppositeGuardList);

                if (success)
                {
                    if (mappingVo.once)
                    {
                        this.unmap(messageType, commandClass);
                    }

                    if (mappingVo.stopOnExecute)
                    {
                        break;
                    }
                }
            }
        }
    }

    private mergeData<T>(messageData: T, mappingData: T): T
    {
        if (messageData != null && mappingData == null) return messageData;
        if (messageData == null && mappingData != null) return mappingData;

        if (messageData != null && mappingData != null)
        {
            let propName: keyof T;

            for (propName in mappingData)
            {
                Reflect.set(messageData as any, propName, Reflect.get(mappingData as any, propName));
            }
        }

        return messageData;
    }

    executeCommand<T>(commandClass: Class<ICommand>, data?: T, guardList?: Array<Class<IGuards>>, guardNotList?: Array<Class<IGuards>>): boolean
    {
        if (this.config.singletonCommands)
        {
            this.factory.mergeIntoLazy();
        }

        if (data != null)
        {
            this.mapValues(data);
        }

        let result: boolean;

        if (
            (guardList == null || this.guardsAllow(guardList, data)) &&
            (guardNotList == null || this.guardsAllow(guardNotList, data, true))
        )
        {
            if (this.config.singletonCommands)
            {
                if (!this.factory.hasPoolForType(commandClass))
                {
                    this.factory.registerPool(commandClass, 1);
                }
            }

            const command: ICommand = this.factory.getInstance(commandClass);
            command.execute();

            if (!this.config.singletonCommands && data != null)
            {
                this.mapValues(data, false);
            }

            result = true;
        }
        else
        {
            result = false;
        }

        if (this.config.singletonCommands)
        {
            this.factory.clearLazy();
        }

        return result;
    }

    private guardsAllow<T>(guardList: Array<Class<IGuards>>, data?: T, opposite?: boolean): boolean
    {
        let guards: IGuards;

        let guardsAllow: boolean = true;

        for (let guardClass of guardList)
        {
            if (!this.factory.hasValueMapping(guardClass))
            {
                this.factory.mapToValue(guardClass, new guardClass());
            }

            guards = this.factory.getInstance(guardClass);

            const allows: boolean = !opposite ? guards.allows : !guards.allows;

            if (!allows)
            {
                return false;
            }
        }

        return guardsAllow;
    }

    private mapValues<T>(data: T, map: boolean = true): void
    {
        let propName: keyof T;

        for (propName in data)
        {
            this.mapProperty(data, propName, map);
        }
    }

    private mapProperty<T>(data: T, propertyName: string, map: boolean = true): void
    {
        const value = Reflect.get(data as any, propertyName);

        if (this.config.singletonCommands)
        {
            this.factory.mapValueToLazy(this.getType(value.constructor.name), value, propertyName);
        }
        else
        {
            if (map)
            {
                this.factory.mapToValue(this.getType(value.constructor.name), value, propertyName);
            } else
            {
                this.factory.unmapFromValue(this.getType(value.constructor.name), propertyName);
            }
        }
    }

    public getType(value: string): string
    {
        if (value == null) return null;

        if (value === "String" || value === "Number" || value === "Boolean")
        {
            return value.toLowerCase();
        }

        if (value === "Object")
        {
            return "any";
        }

        return value;
    }

    setMergeMessageDataAndMappingData(value: boolean): ICommandMapper
    {
        this._mergeMessageDataAndMappingData = value;

        return this;
    }

    private mappingListContains<T>(list: Array<MappingConfig<T>>, commandClass: Class<ICommand>, ignoreGuards: boolean = false): MappingConfig<T>
    {
        for (let mappingVo of list)
        {
            if (mappingVo.commandClass == commandClass)
            {
                const hasGuards: boolean = !ignoreGuards && mappingVo.guardList != null && mappingVo.guardList.length > 0;
                return hasGuards ? null : mappingVo;
            }
        }

        return null;
    }
}

setDefaultImplementation("ICommandMapper", CommandMapper);
