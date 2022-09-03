/* eslint-disable @typescript-eslint/no-explicit-any */

import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {Enum} from "../../Enum";
import {ICommand} from "./ICommand";
import {Class, setDefaultImplementation} from "../../Global";
import {IGuards} from "./IGuards";
import {inject, optional, postConstruct} from "inversify";
import {AbstractDisposable} from "../../common/AbstractDisposable";
import {IFactory} from "../../factory/IFactory";
import ArrayUtils from "../../utils/ArrayUtils";

export type CommandMapperConfig = {
    readonly singletonCommands: boolean;
};

export class MappingConfig<T>
{
    private readonly _commandClass: Class<ICommand>;
    private readonly _data: T | undefined;
    private readonly _once: boolean;
    private _guardList!: Class<IGuards>[];
    private _oppositeGuardList!: Class<IGuards>[];
    private readonly _stopOnExecute: boolean;

    public constructor(commandClass: Class<ICommand>, data?: T, once = false, stopOnExecute = false)
    {
        this._commandClass = commandClass;
        this._data = data;
        this._once = once;
        this._stopOnExecute = stopOnExecute;
    }

    public addGuards(value: Class<IGuards>): MappingConfig<T>
    {
        if (!this._guardList)
        {
            this._guardList = [];
        }
        this._guardList.push(value);

        return this;
    }

    public addGuardsNot(value: Class<IGuards>): MappingConfig<T>
    {
        if (!this._oppositeGuardList)
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

    public get data(): T | undefined
    {
        return this._data;
    }

    public get guardList(): Class<IGuards>[]
    {
        return this._guardList;
    }

    public get stopOnExecute(): boolean
    {
        return this._stopOnExecute;
    }

    public get oppositeGuardList(): Class<IGuards>[]
    {
        return this._oppositeGuardList;
    }
}

export class MappingConfigList<T>
{
    private readonly list: MappingConfig<T>[];

    public constructor()
    {
        this.list = [];
    }

    public push(item: MappingConfig<T>): void
    {
        this.list.push(item);
    }

    public addGuards(value: Class<IGuards>): MappingConfigList<T>
    {
        for (const mappingConfig of this.list)
        {
            mappingConfig.addGuards(value);
        }

        return this;
    }

    public addGuardsNot(value: Class<IGuards>): MappingConfigList<T>
    {
        for (const mappingConfig of this.list)
        {
            mappingConfig.addGuardsNot(value);
        }

        return this;
    }
}

class CommandMap extends Map<Enum, MappingConfig<any>[]>
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

    map<T>(messageType: Enum, commandClassList: Class<ICommand>[], data?: T, once?: boolean,
           stopOnExecute?: boolean): MappingConfigList<T>;

    map<T>(messageTypeList: Enum[], commandClass: Class<ICommand>, data?: T, once?: boolean,
           stopOnExecute?: boolean): MappingConfigList<T>;

    map<T>(messageTypeList: Enum[], commandClassList: Class<ICommand>[], data?: T, once?: boolean,
           stopOnExecute?: boolean): MappingConfigList<T>;

    map<T>(messageType: Enum | Enum[], commandClass: Class<ICommand> | Class<ICommand>[], data?: T, once?: boolean,
           stopOnExecute?: boolean): MappingConfig<T> | MappingConfigList<T>;

    unmap(messageType: Enum, commandClass: Class<ICommand>): ICommandMapper;

    clear(): ICommandMapper;

    unmapAll(messageType: Enum): ICommandMapper;

    tryToExecuteCommand<T>(messageType: Enum, messageData?: T): void;

    executeCommand<T>(commandClass: Class<ICommand>, data?: T, guardList?: Class<IGuards>[],
                      guardNotList?: Class<IGuards>[]): boolean;

    setMergeMessageDataAndMappingData(value: boolean): ICommandMapper;
}

export class CommandMapper extends AbstractDisposable implements ICommandMapper
{
    @inject("CommandMapperConfig") @optional()
    private config!: CommandMapperConfig;

    @inject("IFactory")
    private factory!: IFactory;

    private commandMap: CommandMap = new CommandMap();

    private _mergeMessageDataAndMappingData!: boolean;

    @postConstruct()
    private init(): void
    {
        if (!this.config)
        {
            this.config = {singletonCommands: true};
        }
    }

    public override dispose()
    {
        this.clear();

        super.dispose();
    }

    private _map<T>(messageType: Enum, commandClass: Class<ICommand>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfig<T>
    {
        const mappingConfig:MappingConfig<T> = new MappingConfig<T>(commandClass, data, once, stopOnExecute);

        let list = this.commandMap.get(messageType);

        if (!list)
        {
            list = [mappingConfig];
            this.commandMap.set(messageType, list);
        }
        else if (!CommandMapper.mappingListContains(list, commandClass))
        {
            list.push(mappingConfig);
        }

        return mappingConfig;
    }

    public map<T>(messageType: Enum, commandClass: Class<ICommand>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfig<T>;
    public map<T>(messageType: Enum, commandClassList: Class<ICommand>[], data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>;
    public map<T>(messageTypeList: Enum[], commandClass: Class<ICommand>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>;
    public map<T>(messageTypeList: Enum[], commandClassList: Class<ICommand>[], data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>;
    public map<T>(messageType: Enum | Enum[], commandClass: Class<ICommand> | Class<ICommand>[], data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfig<T> | MappingConfigList<T>;
    public map<T>(messageType: Enum | Enum[], commandClass: Class<ICommand> | Class<ICommand>[], data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfig<T> | MappingConfigList<T>
    {
        if (!(messageType instanceof Array) && !(commandClass instanceof Array))
        {
            return this._map(messageType, commandClass, data, once, stopOnExecute);
        }

        const mappingConfigList:MappingConfigList<T> = new MappingConfigList();
        const commandClassList = commandClass as Class<ICommand>[];
        const messageTypeList = messageType as Enum[];

        if (!(messageType instanceof Array) && commandClass instanceof Array)
        {
            for (const commandClass of commandClassList)
            {
                const soe = stopOnExecute && commandClassList.indexOf(commandClass) === commandClassList.length - 1;
                mappingConfigList.push(this._map(messageType, commandClass, data, once, soe));
            }
        }
        else if (messageType instanceof Array && !(commandClass instanceof Array))
        {
            for (const messageType of messageTypeList)
            {
                const soe = stopOnExecute && messageTypeList.indexOf(messageType) === messageTypeList.length - 1;
                mappingConfigList.push(this._map(messageType, commandClass, data, once, soe));
            }
        }
        else if (messageType instanceof Array && commandClass instanceof Array)
        {
            for (const commandClass of commandClassList)
            {
                for (const messageType of messageTypeList)
                {
                    const soe = stopOnExecute
                        && messageTypeList.indexOf(messageType) === messageTypeList.length - 1
                        && commandClassList.indexOf(commandClass) === commandClassList.length - 1;

                    mappingConfigList.push(this._map(messageType, commandClass, data, once, soe));
                }
            }
        }

        return mappingConfigList;
    }

    public unmap(messageType: Enum, commandClass: Class<ICommand>): ICommandMapper
    {
        const list = this.commandMap.get(messageType);
        if (list)
        {
            const mappingVo = CommandMapper.mappingListContains(list, commandClass, true);
            if (mappingVo)
            {
                ArrayUtils.remove(list, mappingVo);

                if (list.length === 0)
                {
                    this.commandMap.delete(messageType);
                }
            }
        }

        return this;
    }

    public hasMapping(messageType: Enum): boolean
    {
        return this.commandMap.get(messageType) != undefined;
    }

    public clear(): ICommandMapper
    {
        this.commandMap.clear();

        return this;
    }

    public unmapAll(messageType: Enum): ICommandMapper
    {
        const list = this.commandMap.get(messageType);
        if (list)
        {
            this.commandMap.delete(messageType);
        }

        return this;
    }

    public tryToExecuteCommand<T>(messageType: Enum, messageData?: T): void
    {
        const mappedToMessageCommands = this.commandMap.get(messageType);

        if (mappedToMessageCommands)
        {
            let commandClass: Class<ICommand>;
            let injectionData: T;
            for (const mappingVo of mappedToMessageCommands)
            {
                if (!this._mergeMessageDataAndMappingData)
                {
                    injectionData = !messageData ? mappingVo.data : messageData;
                }
                else
                {
                    injectionData = CommandMapper.mergeData(messageData, mappingVo.data);
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

    private static mergeData<T>(messageData: T, mappingData: T): T
    {
        if (messageData && !mappingData) return messageData;
        if (!messageData && mappingData) return mappingData;

        if (messageData && mappingData)
        {
            for (const propName of Object.keys(mappingData))
            {
                Reflect.set(messageData as any, propName, Reflect.get(mappingData as any, propName));
            }
        }

        return messageData;
    }

    public executeCommand<T>(commandClass: Class<ICommand>, data?: T, guardList?: Class<IGuards>[], guardNotList?: Class<IGuards>[]): boolean
    {
        if (this.config.singletonCommands)
        {
            this.factory.mergeIntoLazy();
        }

        if (data)
        {
            this.mapValues(data);
        }

        let result: boolean;

        if (
            (!guardList || this.guardsAllow(guardList)) &&
            (!guardNotList || this.guardsAllow(guardNotList, true))
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

            if (!this.config.singletonCommands && data)
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

    private guardsAllow(guardList: Class<IGuards>[], opposite?: boolean): boolean
    {
        let guards: IGuards;

        const guardsAllow = true;

        for (const guardClass of guardList)
        {
            if (this.config.singletonCommands)
            {
                if (!this.factory.hasPoolForType(guardClass))
                {
                    this.factory.registerPool(guardClass, 1);
                }
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

    private mapValues<T>(data: T, map = true): void
    {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        for (const propName of Object.keys(data))
        {
            this.mapProperty(data, propName, map);
        }
    }

    private mapProperty<T>(data: T, propertyName: string, map = true): void
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
            }
            else
            {
                this.factory.unmapFromValue(this.getType(value.constructor.name), propertyName);
            }
        }
    }

    public getType(value: string): string
    {
        if (!value) throw new Error("Invalid type: " + value);

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

    public setMergeMessageDataAndMappingData(value: boolean): ICommandMapper
    {
        this._mergeMessageDataAndMappingData = value;

        return this;
    }

    private static mappingListContains<T>(list: MappingConfig<T>[], commandClass: Class<ICommand>, ignoreGuards = false): MappingConfig<T> | undefined
    {
        for (const mappingVo of list)
        {
            if (mappingVo.commandClass === commandClass)
            {
                const hasGuards: boolean = !ignoreGuards && mappingVo.guardList && mappingVo.guardList.length > 0;
                return hasGuards ? undefined : mappingVo;
            }
        }

        return undefined;
    }
}

setDefaultImplementation<ICommandMapper>("ICommandMapper", CommandMapper);
