import {IModelContainer, IModelContainerImmutable} from "../model/IModelContainer";
import {IMediatorContainer, IMediatorContainerImmutable} from "../mediator/IMediatorContainer";
import {ICommandMapper, ICommandMapperImmutable} from "../command/ICommandMapper";
import {IMessage} from "../message/IMessageDispatcher";
import {IHierarchyObject} from "../hierarchy/IHierarchyObject";

export interface IContextImmutable extends IModelContainerImmutable, IMediatorContainerImmutable, ICommandMapperImmutable
{
    isIContext(): void;
}

export interface IContext extends IContextImmutable, IModelContainer, IMediatorContainer, ICommandMapper
{
    dispatchMessageToMediators<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;

    dispatchMessageToModels<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IContext;
}