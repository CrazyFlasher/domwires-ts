/* eslint-disable @typescript-eslint/no-explicit-any */

import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {Enum} from "../../Enum";
import ArrayUtils from "../../utils/ArrayUtils";
import {AbstractDisposable} from "../../common/AbstractDisposable";
import {logger, setDefaultImplementation} from "../../Global";

export interface IMessageDispatcherImmutable<MessageDataType> extends IDisposableImmutable
{
    hasMessageListener(type: Enum): boolean;

    addMessageListener(type: Enum, listener: (message?: IMessage<MessageDataType>) => void, priority?: number): void;

    removeMessageListener(type: Enum, listener: (message?: IMessage<MessageDataType>) => void): void;

    onMessageBubbled(message: IMessage<MessageDataType>): boolean;
}

export interface IMessageDispatcher<MessageDataType> extends IMessageDispatcherImmutable<MessageDataType>, IDisposable
{
    handleMessage(message: IMessage<MessageDataType>): IMessageDispatcher<MessageDataType>;

    removeAllMessageListeners(): IMessageDispatcher<MessageDataType>;

    dispatchMessage(type: Enum, data?: MessageDataType, bubbles?: boolean): IMessageDispatcher<MessageDataType>;
}

export interface IMessage<MessageDataType>
{
    get type(): Enum;

    get data(): MessageDataType;

    get initialTarget(): IMessageDispatcherImmutable<MessageDataType>;

    get currentTarget(): IMessageDispatcherImmutable<MessageDataType>;

    get previousTarget(): IMessageDispatcherImmutable<MessageDataType>;
}

class Message<MessageDataType> implements IMessage<MessageDataType>
{
    private _type: Enum;
    private _data: MessageDataType;
    private _bubbles: boolean;

    private _initialTarget: IMessageDispatcherImmutable<MessageDataType>;
    private _previousTarget: IMessageDispatcherImmutable<MessageDataType>;
    private _currentTarget: IMessageDispatcherImmutable<MessageDataType>;

    public setCurrentTarget(value: IMessageDispatcherImmutable<MessageDataType>): IMessageDispatcherImmutable<MessageDataType>
    {
        this._previousTarget = this._currentTarget;

        this._currentTarget = value;

        return this._currentTarget;
    }

    public get bubbles(): boolean
    {
        return this._bubbles;
    }

    public set bubbles(value: boolean)
    {
        this._bubbles = value;
    }

    public get currentTarget(): IMessageDispatcherImmutable<MessageDataType>
    {
        return this._currentTarget;
    }

    public get data(): MessageDataType
    {
        return this._data;
    }

    public set data(value: MessageDataType)
    {
        this._data = value;
    }

    public get previousTarget(): IMessageDispatcherImmutable<MessageDataType>
    {
        return this._previousTarget;
    }

    public get initialTarget(): IMessageDispatcherImmutable<MessageDataType>
    {
        return this._initialTarget;
    }

    public set initialTarget(value: IMessageDispatcherImmutable<MessageDataType>)
    {
        this._initialTarget = value;
    }

    public get type(): Enum
    {
        return this._type;
    }

    public set type(value: Enum)
    {
        this._type = value;
    }
}

export class MessageDispatcher<MessageDataType> extends AbstractDisposable implements IMessageDispatcher<MessageDataType>
{
    private _messageMap: Map<Enum, Listener<MessageDataType>[]>;
    private _message: Message<MessageDataType>;

    private isBubbling: boolean;

    public addMessageListener(type: Enum, listener: (message?: IMessage<MessageDataType>) => void, priority?: number): void
    {
        if (!this._messageMap)
        {
            this._messageMap = new Map<Enum, Listener<MessageDataType>[]>();
        }

        let messageMapForType: Listener<MessageDataType>[] = this._messageMap.get(type);
        if (!messageMapForType)
        {
            messageMapForType = [new Listener<MessageDataType>(listener, this, priority)];

            this._messageMap.set(type, messageMapForType);
        }
        else if (MessageDispatcher.getListenerWithPriority(messageMapForType, listener) == null)
        {
            messageMapForType.push(new Listener<MessageDataType>(listener, this, priority));
            MessageDispatcher.sortOnPriority(messageMapForType);
        }
    }

    private static sortOnPriority<MessageDataType>(messageMapForType: Listener<MessageDataType>[]): void
    {
        messageMapForType.sort((e1: Listener<MessageDataType>, e2: Listener<MessageDataType>) =>
        {
            if (e1.priority < e2.priority) return 1;
            if (e1.priority > e2.priority) return -1;
            return 0;
        });
    }

    private static getListenerWithPriority<MessageDataType>(messageMapForType: Listener<MessageDataType>[],
                                                            listener: (message?: IMessage<MessageDataType>) => void): Listener<MessageDataType>
    {
        for (const l of messageMapForType)
        {
            if (l.func === listener)
            {
                return l;
            }
        }

        return null;
    }

    public dispatchMessage(type: Enum, data?: MessageDataType, bubbles = true): IMessageDispatcher<MessageDataType>
    {
        if (this.isBubbling)
        {
            logger.warn("WARNING: You try to dispatch '" + type.toString() + "' while '" + this._message.type.toString() +
                "' is bubbling. Making new instance of IMessage");
        }

        this._message = this.getMessage(type, data, bubbles, this.isBubbling);
        this._message.initialTarget = this;
        this._message.setCurrentTarget(this);

        this.handleMessage(this._message);

        if (!this.isDisposed)
        {
            this.bubbleUpMessage(this._message);
        }

        return this;
    }

    private bubbleUpMessage(message: Message<MessageDataType>): void
    {
        if (message.bubbles)
        {
            this.isBubbling = true;
            let currentTarget: IMessageDispatcherImmutable<MessageDataType> = message.initialTarget;
            let bubbleUp: boolean;

            while (currentTarget && Reflect.get(currentTarget, "_parent"))
            {
                currentTarget = Reflect.get(currentTarget, "_parent");

                if (!currentTarget)
                {
                    break;
                }

                // onMessageBubbled() can stop the bubbling by returning false.

                bubbleUp = message.setCurrentTarget(currentTarget).onMessageBubbled(message);

                if (!bubbleUp)
                {
                    break;
                }
            }
        }

        this.isBubbling = false;
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    public onMessageBubbled(message: IMessage<MessageDataType>): boolean
    {
        return false;
    }

    private getMessage(type: Enum, data: MessageDataType, bubbles: boolean, forceReturnNew = false): Message<MessageDataType>
    {
        if (!this._message || forceReturnNew)
        {
            this._message = new Message<MessageDataType>();
        }

        this._message.type = type;
        this._message.data = data;
        this._message.bubbles = bubbles;

        return this._message;
    }

    public handleMessage(message: IMessage<MessageDataType>): IMessageDispatcher<MessageDataType>
    {
        if (this._messageMap != null)
        {
            const messageMapForType: Listener<MessageDataType>[] = this._messageMap.get(message.type);

            if (messageMapForType != null)
            {
                messageMapForType.forEach((listener: Listener<MessageDataType>) => listener.bindedFunc(message));
            }
        }

        return this;
    }

    public hasMessageListener(type: Enum): boolean
    {
        if (this._messageMap != null)
        {
            return this._messageMap.get(type) != null;
        }

        return false;
    }

    public removeAllMessageListeners(): IMessageDispatcher<MessageDataType>
    {
        if (this._messageMap != null)
        {
            this._messageMap.forEach((v: Listener<MessageDataType>[]) => ArrayUtils.clear(v));

            this._messageMap = null;
        }

        return this;
    }

    public removeMessageListener(type: Enum, listener: (message?: IMessage<MessageDataType>) => void): void
    {
        if (this._messageMap != null)
        {
            if (this._messageMap.get(type) != null)
            {
                const l: Listener<MessageDataType> = MessageDispatcher.getListenerWithPriority(this._messageMap.get(type), listener);
                if (l != null)
                {
                    ArrayUtils.remove(this._messageMap.get(type), l);

                    if (this._messageMap.get(type).length === 0)
                    {
                        this._messageMap.delete(type);
                    }
                }
            }
        }
    }

    public override dispose()
    {
        this.removeAllMessageListeners();

        this._message = null;

        if (this._messageMap != null)
        {
            this._messageMap.clear();
            this._messageMap = null;
        }

        super.dispose();
    }
}

class Listener<MessageDataType>
{
    private readonly _func: (message?: IMessage<MessageDataType>) => void;
    private readonly _priority: number;
    private readonly _bindedFunc: (message?: IMessage<MessageDataType>) => void;

    public constructor(func: (message?: IMessage<MessageDataType>) => void, bind: IMessageDispatcherImmutable<MessageDataType>,
                       priority?: number)
    {
        if (priority == null) priority = 0;

        this._func = func;
        this._priority = priority;
        this._bindedFunc = func.bind(bind);
    }

    public get priority(): number
    {
        return this._priority;
    }

    public get func(): (message?: IMessage<MessageDataType>) => void
    {
        return this._func;
    }

    public get bindedFunc(): (message?: IMessage<MessageDataType>) => void
    {
        return this._bindedFunc;
    }
}

setDefaultImplementation("IMessageDispatcher", MessageDispatcher);