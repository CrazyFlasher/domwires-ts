/* eslint-disable @typescript-eslint/no-empty-function */

import {AbstractHierarchyObject} from "../hierarchy/AbstractHierarchyObject";
import {IMediator} from "./IMediator";

export abstract class AbstractMediator<MessageDataType> extends AbstractHierarchyObject<MessageDataType> implements IMediator<MessageDataType>
{
    public isIMediator(): void {}
}