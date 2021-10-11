import {IModelContainer, IModelContainerImmutable} from "../model/IModelContainer";
import {IMediatorContainer, IMediatorContainerImmutable} from "../mediator/IMediatorContainer";
import {ICommandMapper, ICommandMapperImmutable} from "../command/ICommandMapper";
import {Enum} from "../../Enum";
import {IMessage, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";

export interface IContextImmutable extends IModelContainerImmutable, IMediatorContainerImmutable, ICommandMapperImmutable
{

}

export interface IContext extends IContextImmutable, IModelContainer, IMediatorContainer, ICommandMapper
{
    dispatchMessageToMediators<T>(message: IMessage): IContext;

    dispatchMessageToModels<T>(message: IMessage): IContext;
}