/* eslint-disable @typescript-eslint/no-unused-vars */

import {IDisposable, IDisposableImmutable} from "../../common/IDisposable";
import {Enum} from "../../Enum";
import {AbstractDisposable} from "../../common/AbstractDisposable";
import {setDefaultImplementation} from "../../Global";
import {ArrayUtils} from "../../utils/ArrayUtils";

export class MessageType<DataType = void> extends Enum
{

}

export interface IMessageDispatcherImmutable extends IDisposableImmutable
{
    hasMessageListener<DataType>(type: MessageType<DataType>): boolean;

    addMessageListener<DataType>(type: MessageType<DataType>, listener: (message?: IMessage, data?: DataType) => void, once?: boolean, priority?: number): void;

    removeMessageListener<DataType>(type: MessageType<DataType>, listener: (message?: IMessage, data?: DataType) => void): void;

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
    get type(): Enum;

    get initialTarget(): IMessageDispatcherImmutable;

    get currentTarget(): IMessageDispatcherImmutable;

    get previousTarget(): IMessageDispatcherImmutable;
}

class Message implements IMessage
{
    private _type!: Enum;
    private _bubbles!: boolean;

    private _initialTarget!: IMessageDispatcherImmutable;
    private _previousTarget!: IMessageDispatcherImmutable;
    private _currentTarget!: IMessageDispatcherImmutable;

    public setCurrentTarget(value: IMessageDispatcherImmutable): IMessageDispatcherImmutable
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

    public get currentTarget(): IMessageDispatcherImmutable
    {
        return this._currentTarget;
    }

    public get previousTarget(): IMessageDispatcherImmutable
    {
        return this._previousTarget;
    }

    public get initialTarget(): IMessageDispatcherImmutable
    {
        return this._initialTarget;
    }

    public set initialTarget(value: IMessageDispatcherImmutable)
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

export class MessageDispatcher extends AbstractDisposable implements IMessageDispatcher
{
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    private _messageMap: Map<Enum, Listener<any>[]> | undefined;
    private _message!: Message;

    private isBubbling!: boolean;

    public addMessageListener<DataType>(type: MessageType<DataType>, listener: (message?: IMessage, data?: DataType) => void, once?: boolean, priority?: number): void
    {
        if (!this._messageMap)
        {
            this._messageMap = new Map<Enum, Listener<DataType>[]>();
        }

        let messageMapForType = this._messageMap.get(type);
        if (!messageMapForType)
        {
            messageMapForType = [new Listener<DataType>(listener, this, priority, once)];

            this._messageMap.set(type, messageMapForType);
        }
        else if (!MessageDispatcher.getListenerWithPriority(messageMapForType, listener))
        {
            messageMapForType.push(new Listener<DataType>(listener, this, priority, once));
            MessageDispatcher.sortOnPriority<DataType>(messageMapForType);
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
                                                     listener: (message?: IMessage, data?: DataType) => void): Listener<DataType> | undefined
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
            this.warn("WARNING: You try to dispatch '" + type.name + "' while '" + this._message.type.name +
                "' is bubbling. Making new instance of IMessage");
        }

        this._message = this.getMessage(type, bubbles, this.isBubbling);
        this._message.initialTarget = this;
        this._message.setCurrentTarget(this);

        this.handleMessage(this._message, data);

        if (!this.isDisposed)
        {
            this.bubbleUpMessage(this._message, data);
        }

        return this;
    }

    private bubbleUpMessage<DataType>(message: Message, data?: DataType): void
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

                bubbleUp = message.setCurrentTarget(currentTarget).onMessageBubbled(message, data);

                if (!bubbleUp)
                {
                    break;
                }
            }
        }

        this.isBubbling = false;
    }

    public onMessageBubbled(message: IMessage): boolean
    {
        return false;
    }

    private getMessage<DataType>(type: MessageType<DataType>, bubbles: boolean, forceReturnNew = false): Message
    {
        if (!this._message || forceReturnNew)
        {
            this._message = new Message();
        }

        this._message.type = type;
        this._message.bubbles = bubbles;

        return this._message;
    }

    public handleMessage<DataType>(message: IMessage, data?: DataType): IMessageDispatcher
    {
        if (this._messageMap)
        {
            const messageMapForType = this._messageMap.get(message.type);

            if (messageMapForType)
            {
                messageMapForType.forEach((listener: Listener<DataType>) =>
                {
                    if (listener.once)
                    {
                        this.removeMessageListener(message.type, listener.func);
                    }

                    listener.bindedFunc(message, data);
                });
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
            this._messageMap.forEach((v: Listener<unknown>[]) => ArrayUtils.clear(v));

            this._messageMap = undefined;
        }

        return this;
    }

    public removeMessageListener<DataType>(type: MessageType<DataType>, listener: (message?: IMessage, data?: DataType) => void): void
    {
        if (this._messageMap)
        {
            const messageMapForType = this._messageMap.get(type);

            if (messageMapForType)
            {
                const l = MessageDispatcher.getListenerWithPriority<DataType>(this._messageMap.get(type), listener);
                if (l)
                {
                    ArrayUtils.remove(messageMapForType, l);

                    if (messageMapForType.length === 0)
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

        if (this._messageMap)
        {
            this._messageMap.clear();
            this._messageMap = undefined;
        }

        super.dispose();
    }
}

class Listener<DataType>
{
    private readonly _func: (message?: IMessage, data?: DataType) => void;
    private readonly _priority: number;
    private readonly _once: boolean | undefined;
    private readonly _bindedFunc: (message?: IMessage, data?: DataType) => void;

    public constructor(func: (message?: IMessage) => void, bind: IMessageDispatcherImmutable,
                       priority?: number, once?: boolean)
    {
        if (!priority) priority = 0;

        this._func = func;
        this._priority = priority;
        this._once = once;
        this._bindedFunc = func.bind(bind);
    }

    public get priority(): number
    {
        return this._priority;
    }

    public get once(): boolean | undefined
    {
        return this._once;
    }

    public get func(): (message?: IMessage, data?: DataType) => void
    {
        return this._func;
    }

    public get bindedFunc(): (message?: IMessage, data?: DataType) => void
    {
        return this._bindedFunc;
    }
}

setDefaultImplementation<IMessageDispatcher>("IMessageDispatcher", MessageDispatcher);