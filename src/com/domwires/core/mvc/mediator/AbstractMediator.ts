/* eslint-disable @typescript-eslint/no-empty-function */

import {AbstractHierarchyObject} from "../hierarchy/AbstractHierarchyObject";
import {IMediator} from "./IMediator";

export abstract class AbstractMediator extends AbstractHierarchyObject implements IMediator
{
    public isIMediator(): void {}
}