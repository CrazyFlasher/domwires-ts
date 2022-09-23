import {MessageType} from "../../src";

export type MockMessageDataType1 = {
    readonly prop: string;
};

export type MockMessageDataType2 = {
    readonly name: string;
};

export class MockMessageType<T = void> extends MessageType<T>
{
    public static readonly HELLO: MessageType<MockMessageDataType1> = new MockMessageType<MockMessageDataType1>();
    public static readonly GOODBYE: MessageType<MockMessageDataType2> = new MockMessageType<MockMessageDataType2>();
    public static readonly SHALOM: MockMessageType = new MockMessageType();
}

export class MockMessageType2<T = void> extends MessageType<T>
{
    public static readonly HELLO: MockMessageType2 = new MockMessageType();
}