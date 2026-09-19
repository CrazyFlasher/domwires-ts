/* eslint-disable @typescript-eslint/no-explicit-any */
import type {IMessageDispatcherImmutable, MessageType} from "./IMessageDispatcher";

/** Stable delivery metadata; payload and propagation state are shared across recipient frames. */
export interface IMessage
{
    /**
     * Process-local dispatch identity, shared by all frames from the same dispatch.
     */
    readonly id: number;
    /**
     * Message-type identity used for subscription and command lookup.
     */
    get type(): MessageType<any>;

    /**
     * Original payload by reference. This untyped routing boundary does not clone or freeze it.
     */
    get data(): unknown;

    /**
     * Dispatcher that originally created this message.
     */
    get initialTarget(): IMessageDispatcherImmutable;

    /**
     * Recipient represented by this frame; remains stable if the listener retains it.
     */
    get currentTarget(): IMessageDispatcherImmutable;

    /**
     * Previous recipient in the route, or undefined for the initial frame.
     */
    get previousTarget(): IMessageDispatcherImmutable | undefined;

    /**
     * Whether the original dispatch allows traversal toward parents.
     */
    get bubbles(): boolean;

    /**
     * Shared propagation flag, visible to every frame of this dispatch.
     */
    get isPropagationStopped(): boolean;

    /**
     * Stops delivery to subsequent targets. Remaining listeners at the current target still run.
     */
    stopPropagation(): void;
}

let nextMessageId = 0;

/**
 * The initial delivery frame. Payload is held by reference; propagation state is shared
 * with frames returned by messageAtTarget().
 */
export class Message implements IMessage
{
    public readonly id = ++nextMessageId;
    private readonly _type: MessageType<any>;
    private readonly _data: unknown;
    private readonly _bubbles: boolean;
    private readonly _initialTarget: IMessageDispatcherImmutable;

    private readonly _currentTarget: IMessageDispatcherImmutable;
    private readonly _previousTarget: IMessageDispatcherImmutable | undefined = undefined;

    private _isPropagationStopped = false;

    public constructor(type: MessageType<any>, initialTarget: IMessageDispatcherImmutable, data?: unknown, bubbles = true)
    {
        this._type = type;
        this._initialTarget = initialTarget;
        this._currentTarget = initialTarget;
        this._data = data;
        this._bubbles = bubbles;
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

/** Stable delivery metadata; stopPropagation is shared with the original dispatch. */
export function messageAtTarget(message: IMessage, target: IMessageDispatcherImmutable): IMessage
{
    return {
        id: message.id, type: message.type, data: message.data, initialTarget: message.initialTarget,
        currentTarget: target, previousTarget: message.currentTarget, bubbles: message.bubbles,
        get isPropagationStopped() { return message.isPropagationStopped; },
        stopPropagation: () => message.stopPropagation()
    };
}
