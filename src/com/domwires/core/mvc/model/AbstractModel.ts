/* eslint-disable @typescript-eslint/no-empty-function */

import {AbstractHierarchyObject} from "../hierarchy/AbstractHierarchyObject";
import {IModel} from "./IModel";

export abstract class AbstractModel extends AbstractHierarchyObject implements IModel
{
    public isIModel(): void {}
}