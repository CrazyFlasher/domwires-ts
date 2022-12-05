/* eslint-disable @typescript-eslint/no-unused-vars */

import {inject, optional, postConstruct} from "inversify";
import {Factory, IFactory} from "../../factory/IFactory";
import {HierarchyObjectContainer, IHierarchyObjectContainer} from "../hierarchy/IHierarchyObjectContainer";
import {IContext, IContextImmutable} from "./IContext";
import {ICommandMapper, MappingConfig, MappingConfigList} from "../command/ICommandMapper";
import {Enum} from "../../Enum";
import {IMessage, IMessageDispatcher, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";
import {Class, instanceOf} from "../../Global";
import {ICommand} from "../command/ICommand";
import {IGuards} from "../command/IGuards";
import {Logger, LogLevel} from "../../../logger/ILogger";
import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";
import {ArrayUtils} from "../../utils/ArrayUtils";

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

export abstract class AbstractContext extends HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable> implements IContext
{
    private static readonly MEDIATOR_ID_PREFIX: string = "__<!$Mediator$!>__";
    private static readonly MODEL_ID_PREFIX: string = "__<!$Model$!>__";

    @inject("IFactory") @optional()
    protected factory!: IFactory;

    @inject("ContextConfig") @optional()
    protected config!: ContextConfig;

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
            this.factory = new Factory(new Logger(LogLevel.VERBOSE));
            this.factory.mapToValue("IFactory", this.factory);
        }

        this.commandMapper = this.factory.instantiateValueUnmapped("ICommandMapper");
    }

    public override add(child: IHierarchyObject, indexOrId?: number | string): boolean
    {
        throw new Error("use 'addModel' or 'addMediator instead");
    }

    public isMediator(child: IHierarchyObject): boolean
    {
        return this.contains(child) && this.mediatorList.indexOf(child) != -1;
    }

    public isModel(child: IHierarchyObject): boolean
    {
        return this.contains(child) && this.modelList.indexOf(child) != -1;
    }

    private _add(list: IHierarchyObject[], child: IHierarchyObject, indexOrId?: number | string): boolean
    {
        this.checkIfDisposed();

        const success = super.add(child, indexOrId);

        if (success)
        {
            list.push(child);
        }

        return success;
    }

    private _remove(list: IHierarchyObject[], childOrId: IHierarchyObject | string, dispose?: boolean): boolean
    {
        this.checkIfDisposed();

        const child = typeof childOrId === "string" ? this.get(childOrId) : childOrId;
        const success = this.remove(childOrId, dispose);

        if (success)
        {
            ArrayUtils.remove(list, child);
        }

        return success;
    }

    private _removeAll(list: IHierarchyObject[], dispose?: boolean): IContext
    {
        this.checkIfDisposed();

        list.map(value => this.remove(value, dispose));

        ArrayUtils.clear(list);

        return this;
    }

    private _get(list: IHierarchyObject[], indexOrId: number | string): IHierarchyObject | undefined
    {
        this.checkIfDisposed();

        const child = this.get(indexOrId);

        if (!child) return undefined;

        if (list.indexOf(child) != -1)
        {
            return child;
        }

        return undefined;
    }

    public getMediator(id: string): IHierarchyObject | undefined
    {
        return this._get(this.mediatorList, AbstractContext.MEDIATOR_ID_PREFIX + id);
    }

    public getMediatorImmutable(id: string): IHierarchyObjectImmutable | undefined
    {
        return this.getMediator(id);
    }

    public getModel(id: string): IHierarchyObject | undefined
    {
        return this._get(this.modelList, AbstractContext.MODEL_ID_PREFIX + id);
    }

    public getModelImmutable(id: string): IHierarchyObjectImmutable | undefined
    {
        return this.getModel(id);
    }

    public addModel(child: IHierarchyObject): IContext;
    public addModel(child: IHierarchyObject, id: string): IContext;
    public addModel(child: IHierarchyObject, id?: string): IContext
    {
        if (id) id = AbstractContext.MODEL_ID_PREFIX + id;

        this._add(this.modelList, child, id);

        return this;
    }

    public removeModel(child: IHierarchyObject, dispose?: boolean): IContext;
    public removeModel(id: string, dispose?: boolean): IContext;
    public removeModel(childOrId: IHierarchyObject | string, dispose?: boolean): IContext
    {
        if (typeof childOrId === "string") childOrId = AbstractContext.MODEL_ID_PREFIX + childOrId;

        this._remove(this.modelList, childOrId, dispose);

        return this;
    }

    public removeAllModels(dispose?: boolean): IContext
    {
        return this._removeAll(this.modelList, dispose);
    }

    public override removeAll(dispose?: boolean): IHierarchyObjectContainer
    {
        super.removeAll(dispose);

        ArrayUtils.clear(this.modelList);
        ArrayUtils.clear(this.mediatorList);

        return this;
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

    public addMediator(child: IHierarchyObject): IContext;
    public addMediator(child: IHierarchyObject, id: string): IContext;
    public addMediator(child: IHierarchyObject, id?: string): IContext
    {
        if (id) id = AbstractContext.MEDIATOR_ID_PREFIX + id;

        this._add(this.mediatorList, child, id);

        return this;
    }

    public removeMediator(child: IHierarchyObject, dispose?: boolean): IContext;
    public removeMediator(id: string, dispose?: boolean): IContext;
    public removeMediator(childOrId: IHierarchyObject | string, dispose?: boolean): IContext
    {
        if (typeof childOrId === "string") childOrId = AbstractContext.MEDIATOR_ID_PREFIX + childOrId;

        this._remove(this.mediatorList, childOrId, dispose);

        return this;
    }

    public removeAllMediators(dispose?: boolean): IContext
    {
        return this._removeAll(this.mediatorList, dispose);
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

        this.tryToExecuteCommand(message.type, data, message.initialTarget);

        /* eslint-disable-next-line no-type-assertion/no-type-assertion */
        const initialTarget = message.initialTarget as IHierarchyObject;

        if (instanceOf(initialTarget.root, "IContext"))
        {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // we check above, that initialTarget.root is IContext
            const context = initialTarget.root as IContextImmutable; // eslint-disable-line no-type-assertion/no-type-assertion

            if (context.isModel(initialTarget))
            {
                this.forwardMessageFromModel(message, data);
            }
            else if (context.isMediator(initialTarget))
            {
                this.forwardMessageFromMediator(message, data);
            }
        }

        return this;
    }

    protected forwardMessageFromModel<DataType>(message: IMessage, data?: DataType): void
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

    protected forwardMessageFromMediator<DataType>(message: IMessage, data?: DataType): void
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

    public tryToExecuteCommand<T>(messageType: Enum, messageData?: T, messageInitialTarget?: IMessageDispatcherImmutable): void
    {
        this.checkIfDisposed();

        this.commandMapper.tryToExecuteCommand(messageType, messageData, messageInitialTarget);
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

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public isIContext(): void {}

    protected checkIfDisposed(): void
    {
        if (this.isDisposed)
        {
            throw new Error("Context already disposed!");
        }
    }
}