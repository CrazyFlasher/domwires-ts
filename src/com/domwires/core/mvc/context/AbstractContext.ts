/* eslint-disable @typescript-eslint/no-empty-function */

import {inject, optional, postConstruct} from "inversify";
import {Factory, IFactory} from "../../factory/IFactory";
import {HierarchyObjectContainer} from "../hierarchy/IHierarchyObjectContainer";
import {IContext, IContextImmutable} from "./IContext";
import {ICommandMapper, MappingConfig, MappingConfigList} from "../command/ICommandMapper";
import {Enum} from "../../Enum";
import {IMessage, IMessageDispatcher} from "../message/IMessageDispatcher";
import {Class, instanceOf} from "../../Global";
import {ICommand} from "../command/ICommand";
import {IGuards} from "../command/IGuards";
import {Logger, LogLevel} from "../../../logger/ILogger";
import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";
import ArrayUtils from "../../utils/ArrayUtils";

export type ContextConfig = {
    readonly forwardMessageFromMediatorsToModels: boolean;
    readonly forwardMessageFromMediatorsToMediators: boolean;
    readonly forwardMessageFromModelsToMediators: boolean;
    readonly forwardMessageFromModelsToModels: boolean;
};

export class ContextConfigBuilder
{
    public forwardMessageFromMediatorsToModels = false;
    public forwardMessageFromMediatorsToMediators = true;
    public forwardMessageFromModelsToMediators = true;
    public forwardMessageFromModelsToModels = false;

    public build(): ContextConfig
    {
        return {
            forwardMessageFromMediatorsToModels: this.forwardMessageFromMediatorsToModels,
            forwardMessageFromMediatorsToMediators: this.forwardMessageFromMediatorsToMediators,
            forwardMessageFromModelsToMediators: this.forwardMessageFromModelsToMediators,
            forwardMessageFromModelsToModels: this.forwardMessageFromModelsToModels
        };
    }
}

export abstract class AbstractContext extends HierarchyObjectContainer implements IContext
{
    @inject("IFactory") @optional()
    protected factory!: IFactory;

    @inject("ContextConfig") @optional()
    protected config!: ContextConfig;

    // protected modelContainer!: IHierarchyObjectContainer;
    // protected mediatorContainer!: IHierarchyObjectContainer;

    protected commandMapper!: ICommandMapper;

    private modelList: IHierarchyObject[] = [];
    private mediatorList: IHierarchyObject[] = [];

    @postConstruct()
    protected init(): void
    {
        if (!this.config)
        {
            this.config = new ContextConfigBuilder().build();
        }

        if (!this.factory)
        {
            this.factory = new Factory(new Logger(LogLevel.INFO));
            this.factory.mapToValue("IFactory", this.factory);
        }

        // this.modelContainer = this.factory.instantiateValueUnmapped("IHierarchyObjectContainer");
        // this.modelContainer.setId("modelContainer");
        // this.add(this.modelContainer);

        // this.mediatorContainer = this.factory.instantiateValueUnmapped("IHierarchyObjectContainer");
        // this.mediatorContainer.setId("mediatorContainer");
        // this.add(this.mediatorContainer);

        this.commandMapper = this.factory.instantiateValueUnmapped("ICommandMapper");
    }

    public isMediator(child: IHierarchyObject): boolean
    {
        return this.containsMediator(child);
    }

    public isModel(child: IHierarchyObject): boolean
    {
        return this.containsModel(child);
    }

    public addModel(value: IHierarchyObject, index?: number): IContext
    {
        this.checkIfDisposed();

        if (this.add(value, index))
        {
            this.modelList.push(value);
        }

        return this;
    }

    public removeModel(value: IHierarchyObject, dispose = false): IContext
    {
        this.checkIfDisposed();

        if (this.remove(value, dispose))
        {
            ArrayUtils.remove(this.modelList, value);
        }

        return this;
    }

    public removeAllModels(dispose = false): IContext
    {
        this.checkIfDisposed();

        this.modelList.map(value => this.remove(value, dispose));

        ArrayUtils.clear(this.modelList);

        return this;
    }

    public containsModel(value: IHierarchyObject): boolean
    {
        this.checkIfDisposed();

        return this.modelList.indexOf(value) != -1;
    }

    public get models(): ReadonlyArray<IHierarchyObject>
    {
        this.checkIfDisposed();

        return this.modelList;
    }

    public get modelsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>
    {
        this.checkIfDisposed();

        return this.modelList;
    }

    public addMediator(value: IHierarchyObject): IContext
    {
        this.checkIfDisposed();

        if (this.add(value))
        {
            this.mediatorList.push(value);
        }

        return this;
    }

    public removeMediator(value: IHierarchyObject, dispose?: boolean): IContext
    {
        this.checkIfDisposed();

        if (this.removeModel(value, dispose))
        {
            ArrayUtils.remove(this.mediatorList, value);
        }

        return this;
    }

    public removeAllMediators(dispose?: boolean): IContext
    {
        this.checkIfDisposed();

        this.mediatorList.map(value => this.remove(value, dispose));

        ArrayUtils.clear(this.mediatorList);

        return this;
    }

    public containsMediator(value: IHierarchyObject): boolean
    {
        this.checkIfDisposed();

        return this.mediatorList.indexOf(value) != -1;
    }

    public get mediators(): ReadonlyArray<IHierarchyObject>
    {
        this.checkIfDisposed();

        return this.mediatorList;
    }

    public get mediatorsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>
    {
        this.checkIfDisposed();

        return this.mediatorList;
    }

    public override dispose(): void
    {
        this.commandMapper.dispose();

        this.nullifyContainers();

        super.dispose();
    }

    private nullifyContainers(): void
    {
        // this.commandMapper = undefined;
    }

    public override onMessageBubbled<DataType>(message: IMessage, data?: DataType): boolean
    {
        super.onMessageBubbled(message, data);

        return false;
    }

    public override handleMessage<DataType>(message: IMessage, data?: DataType): IMessageDispatcher
    {
        super.handleMessage(message, data);

        this.tryToExecuteCommand(message.type, data);

        const initialTarget = message.initialTarget as IHierarchyObject;

        if (instanceOf(initialTarget.root, "IContext"))
        {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // we check above, that initialTarget.root is IContext
            const context = initialTarget.root as IContextImmutable;

            if (context.isModel(initialTarget))
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
            else if (context.isMediator(initialTarget))
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
        }

        return this;
    }

    public map<T>(messageType: Enum, commandClass: Class<ICommand>, data?: T, stopOnExecute?: boolean, once?: boolean): MappingConfig<T>;
    public map<T>(messageType: Enum, commandClassList: Class<ICommand>[], data?: T, stopOnExecute?: boolean, once?: boolean): MappingConfigList<T>;
    public map<T>(messageTypeList: Enum[], commandClass: Class<ICommand>, data?: T, stopOnExecute?: boolean, once?: boolean): MappingConfigList<T>;
    public map<T>(messageTypeList: Enum[], commandClassList: Class<ICommand>[], data?: T, stopOnExecute?: boolean, once?: boolean): MappingConfigList<T>;
    public map<T>(messageType: Enum | Enum[], commandClass: Class<ICommand> | Class<ICommand>[], data?: T, stopOnExecute?: boolean, once?: boolean): MappingConfig<T> | MappingConfigList<T>;
    public map<T>(messageType: Enum | Enum[], commandClass: Class<ICommand> | Class<ICommand>[], data?: T, stopOnExecute?: boolean, once?: boolean): MappingConfig<T> | MappingConfigList<T>
    {
        this.checkIfDisposed();

        return this.commandMapper.map(messageType, commandClass, data, stopOnExecute, once);
    }

    public unmap(messageType: Enum, commandClass: Class<ICommand>): ICommandMapper
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

    public tryToExecuteCommand<T>(messageType: Enum, messageData?: T): void
    {
        this.checkIfDisposed();

        this.commandMapper.tryToExecuteCommand(messageType, messageData);
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

    public executeCommand<T>(commandClass: Class<ICommand>, data?: T, guardList?: Class<IGuards>[],
                             guardNotList?: Class<IGuards>[]): Promise<void>
    {
        this.checkIfDisposed();

        return this.commandMapper.executeCommand(commandClass, data, guardList, guardNotList);
    }

    public isIContext(): void
    {
    }

    protected checkIfDisposed(): void
    {
        if (this.isDisposed)
        {
            throw new Error("Context already disposed!");
        }
    }
}