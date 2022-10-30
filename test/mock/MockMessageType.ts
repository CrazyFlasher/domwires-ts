import {MessageType} from "../../src";

export type MockMessageDataType1 = {
    readonly prop: string;
};

export type MockMessageDataType2 = {
    readonly name: string;
};

export class MockMessageType<T = void> extends MessageType<T>
{
    public static readonly HELLO: MessageType<MockMessageDataType1> = new MockMessageType<MockMessageDataType1>("HELLO");
    public static readonly GOODBYE: MessageType<MockMessageDataType2> = new MockMessageType<MockMessageDataType2>("GOODBYE");
    public static readonly SHALOM: MockMessageType = new MockMessageType("SHALOM");
}

export class MockMessageType2<T = void> extends MessageType<T>
{
    public static readonly HELLO: MockMessageType2 = new MockMessageType();
}