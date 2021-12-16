import {IHierarchyObject, IHierarchyObjectImmutable} from "../hierarchy/IHierarchyObject";

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface IMediatorImmutable extends IHierarchyObjectImmutable
{

}

export interface IMediator extends IMediatorImmutable, IHierarchyObject
{
    isIMediator(): void;
}