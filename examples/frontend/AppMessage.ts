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
export class AppMessage extends MessageType
{
    public static readonly COUNTER_CHANGED: MessageType<CounterChangedData> = new AppMessage("COUNTER_CHANGED");

    public static readonly CHANGE_COUNTER: MessageType<ChangeCounterData> = new AppMessage("CHANGE_COUNTER");

    public static readonly RESET_COUNTER: MessageType<void> = new AppMessage("RESET_COUNTER");
}
