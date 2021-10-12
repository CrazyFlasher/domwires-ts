/* eslint-disable @typescript-eslint/no-explicit-any */

import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {Enum} from "../../Enum";
import ArrayUtils from "../../utils/ArrayUtils";
import {AbstractDisposable} from "../../common/AbstractDisposable";
import {logger, setDefaultImplementation} from "../../Global";

export interface IMessageDispatcherImmutable extends IDisposableImmutable
{
    hasMessageListener(type: Enum): boolean;

    addMessageListener<T>(type: Enum, listener: (message?: IMessage<T>) => void, priority?: number): void;

    removeMessageListener<T>(type: Enum, listener: (message?: IMessage<T>) => void): void;

    onMessageBubbled(message: IMessage): boolean;
}

export interface IMessageDispatcher extends IMessageDispatcherImmutable, IDisposable
{
    handleMessage(message: IMessage): IMessageDispatcher;

    removeAllMessageListeners(): IMessageDispatcher;

    dispatchMessage<T>(type: Enum, data?: T, bubbles?: boolean): IMessageDispatcher;
}

export interface IMessage<T = any>
{
    get type(): Enum;

    get data(): T;

    get initialTarget(): IMessageDispatcherImmutable;

    get currentTarget(): IMessageDispatcherImmutable;

    get previousTarget(): IMessageDispatcherImmutable;
}

class Message<T = any> implements IMessage
{
    private _type: Enum;
    private _data: T;
    private _bubbles: boolean;

    private _initialTarget: IMessageDispatcherImmutable;
    private _previousTarget: IMessageDispatcherImmutable;
    private _currentTarget: IMessageDispatcherImmutable;

    setCurrentTarget(value: IMessageDispatcherImmutable): IMessageDispatcherImmutable
    {
        this._previousTarget = this._currentTarget;

        this._currentTarget = value;

        return this._currentTarget;
    }

    get bubbles(): boolean
    {
        return this._bubbles;
    }

    set bubbles(value: boolean)
    {
        this._bubbles = value;
    }

    get currentTarget(): IMessageDispatcherImmutable
    {
        return this._currentTarget;
    }

    get data(): T
    {
        return this._data;
    }

    set data(value: T)
    {
        this._data = value;
    }

    get previousTarget(): IMessageDispatcherImmutable
    {
        return this._previousTarget;
    }

    get initialTarget(): IMessageDispatcherImmutable
    {
        return this._initialTarget;
    }

    set initialTarget(value: IMessageDispatcherImmutable)
    {
        this._initialTarget = value;
    }

    get type(): Enum
    {
        return this._type;
    }

    set type(value: Enum)
    {
        this._type = value;
    }
}

export class MessageDispatcher extends AbstractDisposable implements IMessageDispatcher
{
    private _messageMap: Map<Enum, Listener[]>;
    private _message: Message;

    private isBubbling: boolean;

    addMessageListener<T>(type: Enum, listener: (message?: IMessage<T>) => void, priority?: number): void
    {
        if (!this._messageMap)
        {
            this._messageMap = new Map<Enum, Listener[]>();
        }

        let messageMapForType: Listener[] = this._messageMap.get(type);
        if (!messageMapForType)
        {
            messageMapForType = [new Listener(listener, this, priority)];

            this._messageMap.set(type, messageMapForType);
        }
        else if (MessageDispatcher.getListenerWithPriority(messageMapForType, listener) == null)
        {
            messageMapForType.push(new Listener(listener, this, priority));
            MessageDispatcher.sortOnPriority(messageMapForType);
        }
    }

    private static sortOnPriority(messageMapForType: Listener[]): void
    {
        messageMapForType.sort((e1: Listener, e2: Listener) =>
        {
            if (e1.priority < e2.priority) return 1;
            if (e1.priority > e2.priority) return -1;
            return 0;
        });
    }

    private static getListenerWithPriority<T>(messageMapForType: Listener[], listener: (message?: IMessage<T>) => void): Listener
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

    dispatchMessage<T>(type: Enum, data?: T, bubbles = true): IMessageDispatcher
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

    private bubbleUpMessage<T>(message: Message<T>): void
    {
        if (message.bubbles)
        {
            this.isBubbling = true;
            let currentTarget: IMessageDispatcherImmutable = message.initialTarget;
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
    onMessageBubbled(message: IMessage): boolean
    {
        return false;
    }

    private getMessage<T>(type: Enum, data: T, bubbles: boolean, forceReturnNew = false): Message
    {
        if (!this._message || forceReturnNew)
        {
            this._message = new Message<T>();
        }

        this._message.type = type;
        this._message.data = data;
        this._message.bubbles = bubbles;

        return this._message;
    }

    handleMessage(message: IMessage): IMessageDispatcher
    {
        if (this._messageMap != null)
        {
            const messageMapForType: Listener[] = this._messageMap.get(message.type);

            if (messageMapForType != null)
            {
                messageMapForType.forEach((listener: Listener) => listener.bindedFunc(message));
            }
        }

        return this;
    }

    hasMessageListener(type: Enum): boolean
    {
        if (this._messageMap != null)
        {
            return this._messageMap.get(type) != null;
        }

        return false;
    }

    removeAllMessageListeners(): IMessageDispatcher
    {
        if (this._messageMap != null)
        {
            this._messageMap.forEach((v: Listener[]) => ArrayUtils.clear(v));

            this._messageMap = null;
        }

        return this;
    }

    removeMessageListener<T>(type: Enum, listener: (message?: IMessage<T>) => void): void
    {
        if (this._messageMap != null)
        {
            if (this._messageMap.get(type) != null)
            {
                const l: Listener = MessageDispatcher.getListenerWithPriority(this._messageMap.get(type), listener);
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

    dispose()
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

class Listener<T = any>
{
    private readonly _func: (message?: IMessage) => void;
    private readonly _priority: number;
    private readonly _bindedFunc: (message?: IMessage) => void;

    constructor(func: (message?: IMessage) => void, bind: T, priority?: number)
    {
        if (priority == null) priority = 0;

        this._func = func;
        this._priority = priority;
        this._bindedFunc = func.bind(bind);
    }

    get priority(): number
    {
        return this._priority;
    }

    get func(): (message?: IMessage) => void
    {
        return this._func;
    }

    get bindedFunc(): (message?: IMessage) => void
    {
        return this._bindedFunc;
    }
}

setDefaultImplementation("IMessageDispatcher", MessageDispatcher);