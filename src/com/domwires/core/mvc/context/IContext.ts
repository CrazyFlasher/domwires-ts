import {ICommandMapper, ICommandMapperImmutable} from "../command/ICommandMapper";
import {IMessage} from "../message/IMessageDispatcher";
import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";
import {IHierarchyObjectContainer} from "../hierarchy/IHierarchyObjectContainer";

export interface IContextImmutable extends IHierarchyObjectImmutable, ICommandMapperImmutable
{
    containsModel(value: IHierarchyObject): boolean;

    containsMediator(value: IHierarchyObject): boolean;

    get modelsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>;

    get mediatorsImmutable(): ReadonlyArray<IHierarchyObjectImmutable>;

    isModel(child: IHierarchyObject): boolean;

    isMediator(child: IHierarchyObject): boolean;

    isIContext(): void;
}

export interface IContext extends IContextImmutable, IHierarchyObjectContainer, ICommandMapper
{
    dispatchMessageToMediators<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;

    dispatchMessageToModels<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;

    addModel(value: IHierarchyObject, index?: number): IContext;

    addMediator(value: IHierarchyObject, index?: number): IContext;

    removeModel(value: IHierarchyObject, dispose?: boolean): IContext;

    removeMediator(value: IHierarchyObject, dispose?: boolean): IContext;

    get models(): ReadonlyArray<IHierarchyObject>;

    get mediators(): ReadonlyArray<IHierarchyObject>;

    removeAllModels(dispose?: boolean): IContext;

    removeAllMediators(dispose?: boolean): IContext;
}