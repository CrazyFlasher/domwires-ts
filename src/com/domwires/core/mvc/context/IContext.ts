import {IModelContainer, IModelContainerImmutable} from "../model/IModelContainer";
import {IMediatorContainer, IMediatorContainerImmutable} from "../mediator/IMediatorContainer";
import {ICommandMapper, ICommandMapperImmutable} from "../command/ICommandMapper";
import {IMessage} from "../message/IMessageDispatcher";

export interface IContextImmutable<MessageDataType> extends IModelContainerImmutable<MessageDataType>, IMediatorContainerImmutable<MessageDataType>, ICommandMapperImmutable
{
    isIContext(): void;
}

export interface IContext<MessageDataType> extends IContextImmutable<MessageDataType>, IModelContainer<MessageDataType>, IMediatorContainer<MessageDataType>, ICommandMapper
{
    dispatchMessageToMediators(message: IMessage<MessageDataType>): IContext<MessageDataType>;

    dispatchMessageToModels(message: IMessage<MessageDataType>): IContext<MessageDataType>;
}