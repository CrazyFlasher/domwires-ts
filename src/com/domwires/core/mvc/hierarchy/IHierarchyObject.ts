import {IHierarchyObjectContainer, IHierarchyObjectContainerImmutable} from "./IHierarchyObjectContainer";
import {IMessageDispatcher, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";

export interface IHierarchyObjectImmutable extends IMessageDispatcherImmutable
{
    get parentImmutable(): IHierarchyObjectContainerImmutable;
}

export interface IHierarchyObject extends IHierarchyObjectImmutable, IMessageDispatcher
{
    setParent(value: IHierarchyObjectContainer): IHierarchyObject;

    get parent(): IHierarchyObjectContainer;
}