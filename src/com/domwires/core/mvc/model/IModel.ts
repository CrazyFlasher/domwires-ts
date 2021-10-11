import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";

/* tslint:disable:no-empty-interface */
export interface IModelImmutable extends IHierarchyObjectImmutable
{

}

export interface IModel extends IModelImmutable, IHierarchyObject
{

}