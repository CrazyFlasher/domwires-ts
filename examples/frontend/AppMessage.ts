import {MessageType} from "domwires";

export type CounterChangedData = {
    readonly value: number;
};

export type ChangeCounterData = {
    readonly delta: number;
};

/**
 * Message types carry the data type with them, so a listener and a command mapping cannot be
 * subscribed with the wrong data.
 */
export class AppMessage<T = void> extends MessageType<T>
{
    public static readonly COUNTER_CHANGED: MessageType<CounterChangedData> = new AppMessage<CounterChangedData>("COUNTER_CHANGED");

    public static readonly CHANGE_COUNTER: MessageType<ChangeCounterData> = new AppMessage<ChangeCounterData>("CHANGE_COUNTER");

    public static readonly RESET_COUNTER: MessageType<void> = new AppMessage("RESET_COUNTER");
}
