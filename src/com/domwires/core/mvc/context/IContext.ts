import {IModelContainer, IModelContainerImmutable} from "../model/IModelContainer";
import {IMediatorContainer, IMediatorContainerImmutable} from "../mediator/IMediatorContainer";
import {ICommandMapper, ICommandMapperImmutable} from "../command/ICommandMapper";
import {IMessage} from "../message/IMessageDispatcher";

export interface IContextImmutable extends IModelContainerImmutable, IMediatorContainerImmutable, ICommandMapperImmutable
{
    isIContext(): void;
}

export interface IContext extends IContextImmutable, IModelContainer, IMediatorContainer, ICommandMapper
{
    dispatchMessageToMediators(message: IMessage): IContext;

    dispatchMessageToModels(message: IMessage): IContext;
}