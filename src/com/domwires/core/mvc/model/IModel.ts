import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";

export interface IModelImmutable extends IHierarchyObjectImmutable
{

}

export interface IModel extends IModelImmutable, IHierarchyObject
{

}