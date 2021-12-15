import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface IMediatorImmutable<MessageDataType> extends IHierarchyObjectImmutable<MessageDataType>
{

}

export interface IMediator<MessageDataType> extends IMediatorImmutable<MessageDataType>, IHierarchyObject<MessageDataType>
{
    isIMediator(): void;
}