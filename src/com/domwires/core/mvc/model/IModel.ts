import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface IModelImmutable extends IHierarchyObjectImmutable
{

}

export interface IModel extends IModelImmutable, IHierarchyObject
{

}