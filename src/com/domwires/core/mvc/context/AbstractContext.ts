/* eslint-disable @typescript-eslint/no-empty-function */

import {inject, optional, postConstruct} from "inversify";
import {Factory, IFactory} from "../../factory/IFactory";
import {HierarchyObjectContainer, IHierarchyObjectContainer} from "../hierarchy/IHierarchyObjectContainer";
import {IContext} from "./IContext";
import {IModelContainer} from "../model/IModelContainer";
import {IMediatorContainer} from "../mediator/IMediatorContainer";
import {ICommandMapper, MappingConfig, MappingConfigList} from "../command/ICommandMapper";
import {IModel, IModelImmutable} from "../model/IModel";
import {IMediator, IMediatorImmutable} from "../mediator/IMediator";
import {Enum} from "../../Enum";
import {IMessage, IMessageDispatcher} from "../message/IMessageDispatcher";
import {Class, instanceOf} from "../../Global";
import {ICommand} from "../command/ICommand";
import {IGuards} from "../command/IGuards";
import {Logger, LogLevel} from "../../../logger/ILogger";
import {IHierarchyObject} from "../hierarchy/IHierarchyObject";

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

    protected modelContainer!: IModelContainer;
    protected mediatorContainer!: IMediatorContainer;

    protected commandMapper!: ICommandMapper;

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

        this.modelContainer = this.factory.instantiateValueUnmapped("IModelContainer");
        this.add(this.modelContainer);

        this.mediatorContainer = this.factory.instantiateValueUnmapped("IMediatorContainer");
        this.add(this.mediatorContainer);

        this.commandMapper = this.factory.instantiateValueUnmapped("ICommandMapper");
    }

    public addModel(model: IModel): IModelContainer
    {
        this.checkIfDisposed();

        this.modelContainer.addModel(model);
        model.setParent(this);

        return this;
    }

    public removeModel(model: IModel, dispose = false): IModelContainer
    {
        this.checkIfDisposed();

        this.modelContainer.removeModel(model, dispose);

        return this;
    }

    public removeAllModels(dispose = false): IModelContainer
    {
        this.checkIfDisposed();

        this.modelContainer.removeAllModels(dispose);

        return this;
    }

    public get numModels(): number
    {
        this.checkIfDisposed();

        return this.modelContainer.numModels;
    }

    public containsModel(model: IModelImmutable): boolean
    {
        this.checkIfDisposed();

        return this.modelContainer.containsModel(model);
    }

    public get modelList(): IModel[]
    {
        this.checkIfDisposed();

        return this.modelContainer.modelList;
    }

    public get modelListImmutable(): ReadonlyArray<IModelImmutable>
    {
        this.checkIfDisposed();

        return this.modelContainer.modelListImmutable;
    }

    public addMediator(mediator: IMediator): IMediatorContainer
    {
        this.checkIfDisposed();

        this.mediatorContainer.addMediator(mediator);
        mediator.setParent(this);

        return this;
    }

    public removeMediator(mediator: IMediator, dispose?: boolean): IMediatorContainer
    {
        this.checkIfDisposed();

        this.mediatorContainer.removeMediator(mediator, dispose);

        return this;
    }

    public removeAllMediators(dispose?: boolean): IMediatorContainer
    {
        this.checkIfDisposed();

        this.mediatorContainer.removeAllMediators(dispose);

        return this;
    }

    public get numMediators(): number
    {
        this.checkIfDisposed();

        return this.mediatorContainer.numMediators;
    }

    public containsMediator(mediator: IMediatorImmutable): boolean
    {
        this.checkIfDisposed();

        return this.mediatorContainer.containsMediator(mediator);
    }

    public get mediatorList(): IMediator[]
    {
        this.checkIfDisposed();

        return this.mediatorContainer.mediatorList;
    }

    public get mediatorListImmutable(): ReadonlyArray<IMediatorImmutable>
    {
        this.checkIfDisposed();

        return this.mediatorContainer.mediatorListImmutable;
    }

    public override dispose(): void
    {
        this.commandMapper.dispose();

        this.nullifyContainers();

        super.dispose();
    }

    private nullifyContainers(): void
    {
        // this.modelContainer = undefined;
        // this.mediatorContainer = undefined;
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

        if (instanceOf(message.initialTarget, "IModel"))
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
        else if (instanceOf(message.initialTarget, "IMediator"))
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

        return this;
    }

    public override dispatchMessageToChildren<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IHierarchyObjectContainer
    {
        super.dispatchMessageToChildren(message, data, filter);

        this.tryToExecuteCommand(message.type, data);

        return this;
    }

    public map<T>(messageType: Enum, commandClass: Class<ICommand>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfig<T>;
    public map<T>(messageType: Enum, commandClassList: Class<ICommand>[], data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>;
    public map<T>(messageTypeList: Enum[], commandClass: Class<ICommand>, data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>;
    public map<T>(messageTypeList: Enum[], commandClassList: Class<ICommand>[], data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfigList<T>;
    public map<T>(messageType: Enum | Enum[], commandClass: Class<ICommand> | Class<ICommand>[], data?: T, once?: boolean, stopOnExecute?: boolean): MappingConfig<T> | MappingConfigList<T>
    {
        this.checkIfDisposed();

        return this.commandMapper.map(messageType, commandClass, data, once, stopOnExecute);
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

    public dispatchMessageToMediators<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext
    {
        this.checkIfDisposed();

        this.mediatorContainer.dispatchMessageToChildren(message, data, filter);

        return this;
    }

    public dispatchMessageToModels<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext
    {
        this.checkIfDisposed();

        this.modelContainer.dispatchMessageToChildren(message, data, filter);

        return this;
    }

    public executeCommand<T>(commandClass: Class<ICommand>, data?: T, guardList?: Class<IGuards>[],
                             guardNotList?: Class<IGuards>[]): Promise<void>
    {
        this.checkIfDisposed();

        return this.commandMapper.executeCommand(commandClass, data, guardList, guardNotList);
    }

    public isIMediator(): void
    {
    }

    public isIModel(): void
    {
    }

    public isIContext(): void
    {
    }

    public isIMediatorContainer(): void
    {
    }

    public isIModelContainer(): void
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