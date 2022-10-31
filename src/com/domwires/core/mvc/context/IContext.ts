import {ICommandMapper, ICommandMapperImmutable} from "../command/ICommandMapper";
import {IMessage} from "../message/IMessageDispatcher";
import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";
import {IHierarchyObjectContainer} from "../hierarchy/IHierarchyObjectContainer";

export interface IContextImmutable extends IHierarchyObjectImmutable, ICommandMapperImmutable
{
    get modelsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>;

    get mediatorsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>;

    getModelImmutable(id: string): IHierarchyObjectImmutable | undefined;

    getMediatorImmutable(id: string): IHierarchyObjectImmutable | undefined;

    isModel(child: IHierarchyObject): boolean;

    isMediator(child: IHierarchyObject): boolean;

    isIContext(): void;
}

export interface IContext extends IContextImmutable, IHierarchyObjectContainer, ICommandMapper
{
    dispatchMessageToMediators<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;

    dispatchMessageToModels<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;

    addModel(value: IHierarchyObject): IContext;

    addModel(value: IHierarchyObject): IContext;

    addModel(value: IHierarchyObject, id: string): IContext;

    addMediator(value: IHierarchyObject): IContext;

    addMediator(value: IHierarchyObject): IContext;

    addMediator(value: IHierarchyObject, id: string): IContext;

    removeModel(value: IHierarchyObject, dispose?: boolean): IContext;

    removeModel(id: string, dispose?: boolean): IContext;

    removeMediator(value: IHierarchyObject, dispose?: boolean): IContext;

    removeMediator(id: string, dispose?: boolean): IContext;

    getModel(id: string): IHierarchyObject | undefined;

    getMediator(id: string): IHierarchyObject | undefined;

    get models(): ReadonlyArray<IHierarchyObject>;

    get mediators(): ReadonlyArray<IHierarchyObject>;

    removeAllModels(dispose?: boolean): IContext;

    removeAllMediators(dispose?: boolean): IContext;
}