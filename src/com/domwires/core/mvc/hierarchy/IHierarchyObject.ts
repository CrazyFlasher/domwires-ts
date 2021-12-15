import {IHierarchyObjectContainer, IHierarchyObjectContainerImmutable} from "./IHierarchyObjectContainer";
import {IMessageDispatcher, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";

export interface IHierarchyObjectImmutable<MessageDataType> extends IMessageDispatcherImmutable<MessageDataType>
{
    get parentImmutable(): IHierarchyObjectContainerImmutable<MessageDataType>;
}

export interface IHierarchyObject<MessageDataType> extends IHierarchyObjectImmutable<MessageDataType>, IMessageDispatcher<MessageDataType>
{
    setParent(value: IHierarchyObjectContainer<MessageDataType>): IHierarchyObject<MessageDataType>;

    get parent(): IHierarchyObjectContainer<MessageDataType>;
}