/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {Enum} from "../../Enum";
import {AbstractDisposable} from "../../common/AbstractDisposable";
import {ArrayUtils} from "../../utils/ArrayUtils";
import {setDefaultImplementation} from "../../Global";

/**
 * A message type. Data type is stored in the generic parameter only, so a message
 * type is a strict type marker for the data, that can be dispatched with it.
 */
export class MessageType<DataType = void> extends Enum
{

}

/**
 * A message is always passed to a listener, so only the data is optional: a message without data
 * gives undefined here.
 */
export type MessageListener<DataType> = (message: IMessage, data?: DataType) => void;

export interface IMessageDispatcherImmutable extends IDisposableImmutable
{
    hasMessageListener<DataType>(type: MessageType<DataType>): boolean;

    addMessageListener<DataType>(type: MessageType<DataType>, listener: MessageListener<DataType>, once?: boolean, priority?: number): void;

    removeMessageListener<DataType>(type: MessageType<DataType>, listener: MessageListener<DataType>): void;

    onMessageBubbled<DataType>(message: IMessage, data?: DataType): boolean;
}

export interface IMessageDispatcher extends IMessageDispatcherImmutable, IDisposable
{
    handleMessage<DataType>(message: IMessage, data?: DataType): IMessageDispatcher;

    removeAllMessageListeners(): IMessageDispatcher;

    dispatchMessage<DataType>(type: MessageType<DataType>, data?: DataType, bubbles?: boolean): IMessageDispatcher;
}

export interface IMessage
{
    get type(): MessageType<any>;

    get data(): unknown;

    get initialTarget(): IMessageDispatcherImmutable;

    get currentTarget(): IMessageDispatcherImmutable;

    get previousTarget(): IMessageDispatcherImmutable | undefined;

    get bubbles(): boolean;

    get isPropagationStopped(): boolean;

    /**
     * Stops the further propagation of the message: it will not be delivered to the next target.
     */
    stopPropagation(): void;
}

/**
 * An immutable message snapshot. Every dispatch creates its own instance, so nested and
 * delayed handling never corrupts the message of the outer dispatch.
 */
export class Message implements IMessage
{
    private readonly _type: MessageType<any>;
    private readonly _data: unknown;
    private readonly _bubbles: boolean;
    private readonly _initialTarget: IMessageDispatcherImmutable;

    private _currentTarget: IMessageDispatcherImmutable;
    private _previousTarget: IMessageDispatcherImmutable | undefined;

    private _isPropagationStopped = false;

    public constructor(type: MessageType<any>, initialTarget: IMessageDispatcherImmutable, data?: unknown, bubbles = true)
    {
        this._type = type;
        this._initialTarget = initialTarget;
        this._currentTarget = initialTarget;
        this._data = data;
        this._bubbles = bubbles;
    }

    /**
     * Moves the message to the next target of the hierarchy.
     */
    public setCurrentTarget(value: IMessageDispatcherImmutable): IMessageDispatcherImmutable
    {
        this._previousTarget = this._currentTarget;

        this._currentTarget = value;

        return this._currentTarget;
    }

    public stopPropagation(): void
    {
        this._isPropagationStopped = true;
    }

    public get isPropagationStopped(): boolean
    {
        return this._isPropagationStopped;
    }

    public get bubbles(): boolean
    {
        return this._bubbles;
    }

    public get currentTarget(): IMessageDispatcherImmutable
    {
        return this._currentTarget;
    }

    public get previousTarget(): IMessageDispatcherImmutable | undefined
    {
        return this._previousTarget;
    }

    public get initialTarget(): IMessageDispatcherImmutable
    {
        return this._initialTarget;
    }

    public get type(): MessageType<any>
    {
        return this._type;
    }

    public get data(): unknown
    {
        return this._data;
    }
}

export class MessageDispatcher extends AbstractDisposable implements IMessageDispatcher
{
    private _messageMap: Map<Enum, Listener<any>[]> | undefined;

    /**
     * Count of the currently handled messages. Listeners are removed lazily while a dispatch is in progress,
     * so a listener list is never modified in the middle of the iteration.
     */
    private dispatchCount = 0;

    private isBubbling = false;

    public addMessageListener<DataType>(type: MessageType<DataType>, listener: MessageListener<DataType>,
                                        once?: boolean, priority?: number): void
    {
        if (!this._messageMap)
        {
            this._messageMap = new Map<Enum, Listener<any>[]>();
        }

        let messageMapForType: Listener<any>[] | undefined = this._messageMap.get(type);

        if (!messageMapForType)
        {
            messageMapForType = [new Listener<DataType>(listener, this, priority, once)];

            this._messageMap.set(type, messageMapForType);
        }
        else if (!MessageDispatcher.getListenerWithPriority(messageMapForType, listener))
        {
            messageMapForType.push(new Listener<DataType>(listener, this, priority, once));
            MessageDispatcher.sortOnPriority(messageMapForType);
        }
    }

    private static sortOnPriority<DataType>(messageMapForType: Listener<DataType>[]): void
    {
        messageMapForType.sort((e1: Listener<DataType>, e2: Listener<DataType>) =>
        {
            if (e1.priority < e2.priority) return 1;
            if (e1.priority > e2.priority) return -1;
            return 0;
        });
    }

    private static getListenerWithPriority<DataType>(messageMapForType: Listener<DataType>[] | undefined,
                                                     listener: MessageListener<DataType>): Listener<DataType> | undefined
    {
        if (messageMapForType)
        {
            for (const l of messageMapForType)
            {
                if (l.func === listener)
                {
                    return l;
                }
            }
        }

        return undefined;
    }

    public dispatchMessage<DataType>(type: MessageType<DataType>, data?: DataType, bubbles = true): IMessageDispatcher
    {
        if (this.isBubbling)
        {
            this.warn("WARNING: You try to dispatch '" + type.name +
                "' while another message is bubbling. The message is a new instance of IMessage");
        }

        const message: Message = new Message(type, this, data, bubbles);

        this.handleMessage(message, data);

        if (!this.isDisposed && message.bubbles && !message.isPropagationStopped)
        {
            this.bubbleUpMessage(message, data);
        }

        return this;
    }

    private bubbleUpMessage<DataType>(message: Message, data?: DataType): void
    {
        this.isBubbling = true;

        try
        {
            let currentTarget: IMessageDispatcherImmutable | undefined = message.initialTarget;
            let parent: IMessageDispatcherImmutable | undefined;

            while (currentTarget && !message.isPropagationStopped)
            {
                parent = Reflect.get(Object(currentTarget), "_parent");

                if (!parent)
                {
                    break;
                }

                currentTarget = parent;
                message.setCurrentTarget(currentTarget);

                // onMessageBubbled() can stop the bubbling by returning false
                if (!currentTarget.onMessageBubbled(message, data))
                {
                    break;
                }
            }
        }
        finally
        {
            this.isBubbling = false;
        }
    }

    public onMessageBubbled(message: IMessage): boolean
    {
        return false;
    }

    public handleMessage<DataType>(message: IMessage, data?: DataType): IMessageDispatcher
    {
        const listeners: Listener<any>[] | undefined = this._messageMap ? this._messageMap.get(message.type) : undefined;

        if (!listeners || listeners.length === 0)
        {
            return this;
        }

        this.dispatchCount++;

        try
        {
            for (let i = 0; i < listeners.length; i++)
            {
                const listener: Listener<any> | undefined = listeners[i];

                if (!listener || listener.removed)
                {
                    continue;
                }

                if (listener.once)
                {
                    // removal is deferred: the current iteration is not affected by it
                    this.removeMessageListener(message.type, listener.func);
                }

                listener.bindedFunc(message, data);
            }
        }
        finally
        {
            this.dispatchCount--;

            if (this.dispatchCount === 0)
            {
                this.compactListeners();
            }
        }

        return this;
    }

    public hasMessageListener<DataType>(type: MessageType<DataType>): boolean
    {
        if (this._messageMap)
        {
            return this._messageMap.get(type) != undefined;
        }

        return false;
    }

    public removeAllMessageListeners(): IMessageDispatcher
    {
        if (this._messageMap)
        {
            this._messageMap.forEach((listeners: Listener<unknown>[]) =>
            {
                for (const listener of listeners)
                {
                    listener.markAsRemoved();
                }

                ArrayUtils.clear(listeners);
            });

            this._messageMap = undefined;
        }

        return this;
    }

    public removeMessageListener<DataType>(type: MessageType<DataType>, listener: MessageListener<DataType>): void
    {
        const messageMapForType: Listener<any>[] | undefined = this._messageMap ? this._messageMap.get(type) : undefined;

        if (!messageMapForType)
        {
            return;
        }

        const l: Listener<any> | undefined = MessageDispatcher.getListenerWithPriority(messageMapForType, listener);

        if (!l)
        {
            return;
        }

        l.markAsRemoved();

        if (this.dispatchCount === 0)
        {
            this.compactListeners();
        }
    }

    public override dispose()
    {
        this.removeAllMessageListeners();

        super.dispose();
    }

    private compactListeners(): void
    {
        if (!this._messageMap)
        {
            return;
        }

        for (const [type, listeners] of this._messageMap)
        {
            for (let i = listeners.length - 1; i >= 0; i--)
            {
                const listener: Listener<any> | undefined = listeners[i];

                if (listener && listener.removed)
                {
                    listeners.splice(i, 1);
                }
            }

            if (listeners.length === 0)
            {
                this._messageMap.delete(type);
            }
        }
    }
}

class Listener<DataType>
{
    private readonly _func: MessageListener<DataType>;
    private readonly _priority: number;
    private readonly _once: boolean | undefined;
    private readonly _bindedFunc: MessageListener<DataType>;

    private _removed = false;

    public constructor(func: MessageListener<DataType>, bind: IMessageDispatcherImmutable,
                       priority?: number, once?: boolean)
    {
        if (!priority) priority = 0;

        this._func = func;
        this._priority = priority;
        this._once = once;
        this._bindedFunc = func.bind(bind);
    }

    public markAsRemoved(): void
    {
        this._removed = true;
    }

    public get removed(): boolean
    {
        return this._removed;
    }

    public get priority(): number
    {
        return this._priority;
    }

    public get once(): boolean | undefined
    {
        return this._once;
    }

    public get func(): MessageListener<DataType>
    {
        return this._func;
    }

    public get bindedFunc(): MessageListener<DataType>
    {
        return this._bindedFunc;
    }
}

// the registration lives next to the class, so a bundler can not drop it as an unused side effect
setDefaultImplementation<IMessageDispatcher>("IMessageDispatcher", MessageDispatcher);
