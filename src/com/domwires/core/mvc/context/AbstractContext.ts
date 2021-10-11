import {inject, optional, postConstruct} from "inversify";
import {AppFactory, IAppFactory} from "../../factory/IAppFactory";
import {HierarchyObjectContainer, IHierarchyObjectContainer} from "../hierarchy/IHierarchyObjectContainer";
import {IContext} from "./IContext";
import {IModelContainer} from "../model/IModelContainer";
import {IMediatorContainer} from "../mediator/IMediatorContainer";
import {ICommandMapper, MappingConfig, MappingConfigList} from "../command/ICommandMapper";
import {IModel, IModelImmutable} from "../model/IModel";
import {IMediator, IMediatorImmutable} from "../mediator/IMediator";
import {Enum} from "../../Enum";
import {IMessage, IMessageDispatcher, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";
import {AbstractModel} from "../model/AbstractModel";
import {AbstractMediator} from "../mediator/AbstractMediator";
import {Class} from "../../Global";
import {ICommand} from "../command/ICommand";
import {IGuards} from "../command/IGuards";

export type ContextConfig = {
    readonly forwardMessageFromMediatorsToModels: boolean;
    readonly forwardMessageFromMediatorsToMediators: boolean;
    readonly forwardMessageFromModelsToMediators: boolean;
    readonly forwardMessageFromModelsToModels: boolean;
}

export abstract class AbstractContext extends HierarchyObjectContainer implements IContext
{
    @inject("IAppFactory") @optional()
    protected factory: IAppFactory;

    @inject("ContextConfig") @optional()
    protected config: ContextConfig;

    private modelContainer: IModelContainer;
    private mediatorContainer: IMediatorContainer;

    private commandMapper: ICommandMapper;

    @postConstruct()
    protected init(): void
    {
        if (this.config == null)
        {
            this.config = {
                forwardMessageFromMediatorsToModels: false,
                forwardMessageFromMediatorsToMediators: true,
                forwardMessageFromModelsToMediators: true,
                forwardMessageFromModelsToModels: false
            }
        }

        if (this.factory == null)
        {
            this.factory = new AppFactory();
        }

        this.factory.mapToValue("IAppFactory", this.factory);

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

    public removeModel(model: IModel, dispose: boolean = false): IModelContainer
    {
        this.checkIfDisposed();

        this.modelContainer.removeModel(model, dispose);

        return this;
    }

    public removeAllModels(dispose: boolean = false): IModelContainer
    {
        this.checkIfDisposed();

        this.modelContainer.removeAllModels(dispose);

        return this;
    }

    get numModels(): number
    {
        this.checkIfDisposed();

        return this.modelContainer.numModels;
    }

    public containsModel(model: IModelImmutable): boolean
    {
        this.checkIfDisposed();

        return this.modelContainer.containsModel(model);
    }

    get modelList(): Array<IModel>
    {
        this.checkIfDisposed();

        return this.modelContainer.modelList;
    }

    get modelListImmutable(): ReadonlyArray<IModelImmutable>
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

    get numMediators(): number
    {
        this.checkIfDisposed();

        return this.mediatorContainer.numMediators;
    }

    public containsMediator(mediator: IMediatorImmutable): boolean
    {
        this.checkIfDisposed();

        return this.mediatorContainer.containsMediator(mediator);
    }

    get mediatorList(): Array<IMediator>
    {
        this.checkIfDisposed();

        return this.mediatorContainer.mediatorList;
    }

    get mediatorListImmutable(): ReadonlyArray<IMediatorImmutable>
    {
        this.checkIfDisposed();

        return this.mediatorContainer.mediatorListImmutable;
    }

    override dispose(): void
    {
        this.commandMapper.dispose();

        this.nullifyContainers();

        super.dispose();
    }

    private nullifyContainers(): void
    {
        this.modelContainer = null;
        this.mediatorContainer = null;
        this.commandMapper = null;
    }

    override onMessageBubbled<T>(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        return false;
    }

    override handleMessage<T>(message: IMessage): IMessageDispatcher
    {
        super.handleMessage(message);

        this.tryToExecuteCommand(message.type, message.data);

        if (message.initialTarget instanceof AbstractModel)
        {
            if (this.config.forwardMessageFromModelsToModels)
            {
                this.dispatchMessageToModels(message);
            }
            if (this.config.forwardMessageFromModelsToMediators)
            {
                this.dispatchMessageToMediators(message);
            }
        }
        else if (message.initialTarget instanceof AbstractMediator)
        {
            if (this.config.forwardMessageFromMediatorsToModels)
            {
                this.dispatchMessageToModels(message);
            }
            if (this.config.forwardMessageFromMediatorsToMediators)
            {
                this.dispatchMessageToMediators(message);
            }
        }

        return this;
    }

    override dispatchMessageToChildren<T>(message: IMessage): IHierarchyObjectContainer
    {
        super.dispatchMessageToChildren(message);

        this.tryToExecuteCommand(message.type, message.data);

        return this;
    }

    public map<T>(messageType: Enum, commandClass: Class<ICommand>, data?: T, once?: boolean,
                  stopOnExecute?: boolean): MappingConfig<T>
    {
        this.checkIfDisposed();

        return this.commandMapper.map(messageType, commandClass, data, once, stopOnExecute);
    }

    public map1<T>(messageType: Enum, commandClassList: Array<Class<ICommand>>, data?: T, once?: boolean,
                   stopOnExecute?: boolean): MappingConfigList<T>
    {
        this.checkIfDisposed();

        return this.commandMapper.map1(messageType, commandClassList, data, once, stopOnExecute);
    }

    public map2<T>(messageTypeList: Array<Enum>, commandClass: Class<ICommand>, data?: T, once?: boolean,
                   stopOnExecute?: boolean): MappingConfigList<T>
    {
        this.checkIfDisposed();

        return this.commandMapper.map2(messageTypeList, commandClass, data, once, stopOnExecute);
    }

    public map3<T>(messageTypeList: Array<Enum>, commandClassList: Array<Class<ICommand>>, data?: T, once?: boolean,
                   stopOnExecute?: boolean): MappingConfigList<T>
    {
        this.checkIfDisposed();

        return this.commandMapper.map3(messageTypeList, commandClassList, data, once, stopOnExecute);
    }

    public unmap<T>(messageType: Enum, commandClass: Class<ICommand>): ICommandMapper
    {
        this.checkIfDisposed();

        return this.commandMapper.unmap(messageType, commandClass);
    }

    public clear(): ICommandMapper
    {
        this.checkIfDisposed();

        return this.commandMapper.clear();
    }

    public unmapAll<T>(messageType: Enum): ICommandMapper
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

    public dispatchMessageToMediators<T>(message: IMessage): IContext
    {
        this.checkIfDisposed();

        this.mediatorContainer.dispatchMessageToChildren(message);

        return this;
    }

    public dispatchMessageToModels<T>(message: IMessage): IContext
    {
        this.checkIfDisposed();

        this.modelContainer.dispatchMessageToChildren(message);

        return this;
    }

    public executeCommand<T>(commandClass: Class<ICommand>, data?: T, guardList?: Array<Class<IGuards>>,
                             guardNotList?: Array<Class<IGuards>>): boolean
    {
        this.checkIfDisposed();

        return this.commandMapper.executeCommand(commandClass, data, guardList, guardNotList);
    }

    setMergeMessageDataAndMappingData(value: boolean): ICommandMapper
    {
        return this.commandMapper.setMergeMessageDataAndMappingData(value);
    }

    private checkIfDisposed(): void
    {
        if (this.isDisposed)
        {
            throw new Error("Context already disposed!");
        }
    }
}