import {IHierarchyObjectContainer, IHierarchyObjectContainerImmutable} from "./IHierarchyObjectContainer";
import {IMessageDispatcher, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";

export interface IHierarchyObjectImmutable extends IMessageDispatcherImmutable
{
    get parentImmutable(): IHierarchyObjectContainerImmutable | undefined;

    get rootImmutable(): IHierarchyObjectContainerImmutable | undefined;
}

export interface IHierarchyObject extends IHierarchyObjectImmutable, IMessageDispatcher
{
    setParent(value: IHierarchyObjectContainer | undefined): IHierarchyObject;

    get parent(): IHierarchyObjectContainer | undefined;

    get root(): IHierarchyObjectContainer | undefined;
}