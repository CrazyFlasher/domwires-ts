/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {IMessage, Message, messageAtTarget} from "./IMessage";
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
    declare private readonly payloadContract: (value: DataType) => DataType;
    public constructor(name?: string) { super(name); }
}

/**
 * A message is always passed to a listener, so only the data is optional: a message without data
 * gives undefined here.
 */
export type MessageListener<DataType> = (message: IMessage, data: DataType) => void;
export type MessageArguments<T> = undefined extends T ? [data?: NoInfer<T>, bubbles?: boolean] : [data: NoInfer<T>, bubbles?: boolean];

/** Independently owned listener registration returned by subscribe(). */
export interface Subscription
{
    /** Removes this subscription only. Repeated disposal is harmless. */
    dispose(): void;
}

/** Live observation and listener registration without dispatch or bulk-removal operations. */
export interface IMessageDispatcherImmutable extends IDisposableImmutable
{
    /**
     * Whether this exact message type has at least one live listener.
     */
    hasMessageListener<DataType>(type: MessageType<DataType>): boolean;

    /**
     * Registers a listener once per type/callback identity. Higher priority runs first; ties keep insertion order.
     * A once listener is removed before invocation, including recursive dispatch. Callback this is the dispatcher.
     */
    addMessageListener<DataType>(type: MessageType<DataType>, listener: MessageListener<DataType>, once?: boolean, priority?: number): void;

    /**
     * Removes the matching callback; absence is harmless. Removal takes effect during active delivery.
     */
    removeMessageListener<DataType>(type: MessageType<DataType>, listener: MessageListener<DataType>): void;

    /**
     * Creates an independent disposable subscription, even when the same callback is already registered.
     * Defaults: once false, priority 0. Repeated disposal is harmless.
     */
    subscribe<T>(type: MessageType<T>, listener: MessageListener<NoInfer<T>>, options?: {once?: boolean; priority?: number}): Subscription;

    /**
     * Hierarchy routing hook for a message arriving from below. Return false to stop upward traversal.
     * The base dispatcher returns false; hierarchy containers override delivery behavior.
     */
    onMessageBubbled<DataType>(message: IMessage, data?: DataType): boolean;
}

/** Synchronous message delivery with stable frames and typed payloads. */
export interface IMessageDispatcher extends IMessageDispatcherImmutable, IDisposable
{
    /**
     * Delivers to a listener snapshot at this target. Added listeners wait for the next delivery; removed ones are skipped.
     * Listener exceptions propagate synchronously and stop this delivery. Does not initiate upward bubbling.
     */
    handleMessage<DataType>(message: IMessage, data?: DataType): IMessageDispatcher;

    /**
     * Removes all subscriptions, including pending listeners in an active delivery; returns this dispatcher.
     */
    removeAllMessageListeners(): IMessageDispatcher;

    /**
     * Creates a message and synchronously delivers it locally, then bubbles when allowed (default true).
     * Payload is passed by reference. Context commands may continue asynchronously; await context.settle() for them.
     * @throws If disposed or a synchronous listener throws.
     */
    dispatchMessage<DataType>(type: MessageType<DataType>, ...args: MessageArguments<DataType>): IMessageDispatcher;
}

export class MessageDispatcher extends AbstractDisposable implements IMessageDispatcher
{
    public subscribe<T>(type: MessageType<T>, listener: MessageListener<NoInfer<T>>, options: {once?: boolean; priority?: number} = {}): Subscription
    {
        // A unique wrapper lets each handle own its registration independently.
        const callback: MessageListener<T> = (message, data) => listener(message, data);
        this.addMessageListener(type, callback, options.once, options.priority);
        return {dispose: () => this.removeMessageListener(type, callback)};
    }
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
                if (l.func === listener && !l.removed)
                {
                    return l;
                }
            }
        }

        return undefined;
    }

    public dispatchMessage<DataType>(type: MessageType<DataType>, ...args: MessageArguments<DataType>): IMessageDispatcher
    {
        if (this.isDisposed) throw new Error("Message dispatcher already disposed!");
        const [data, bubbles = true] = args;
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

    private bubbleUpMessage<DataType>(message: IMessage, data?: DataType): void
    {
        this.isBubbling = true;

        try
        {
            let currentTarget: IMessageDispatcherImmutable | undefined = message.initialTarget;
            let parent: IMessageDispatcherImmutable | undefined;

            while (currentTarget && !message.isPropagationStopped)
            {
                parent = Reflect.get(Object(currentTarget), "parentImmutable");

                if (!parent)
                {
                    break;
                }

                currentTarget = parent;
                message = messageAtTarget(message, currentTarget);

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
            const snapshot = listeners.slice();
            for (let i = 0; i < snapshot.length; i++)
            {
                const listener: Listener<any> | undefined = snapshot[i];

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
            return this._messageMap.get(type)?.some(listener => !listener.removed) ?? false;
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
