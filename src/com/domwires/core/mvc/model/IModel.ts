import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface IModelImmutable<MessageDataType> extends IHierarchyObjectImmutable<MessageDataType>
{

}

export interface IModel<MessageDataType> extends IModelImmutable<MessageDataType>, IHierarchyObject<MessageDataType>
{
    isIModel(): void;
}