/* eslint-disable @typescript-eslint/no-empty-function */

import {AbstractHierarchyObject} from "../hierarchy/AbstractHierarchyObject";
import {IModel} from "./IModel";

export abstract class AbstractModel<MessageDataType> extends AbstractHierarchyObject<MessageDataType> implements IModel<MessageDataType>
{
    public isIModel(): void {}
}