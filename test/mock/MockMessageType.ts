import {Enum} from "../../src";

export type MockMessageDataType1 = {
    readonly prop: string;
};

export type MockMessageDataType2 = {
    readonly name: string;
};

export class MockMessageType<T = void> extends Enum<T>
{
    public static readonly HELLO: Enum<MockMessageDataType1> = new MockMessageType<MockMessageDataType1>();
    public static readonly GOODBYE: Enum<MockMessageDataType2> = new MockMessageType<MockMessageDataType2>();
    public static readonly SHALOM: MockMessageType = new MockMessageType();
}

export class MockMessageType2<T = void> extends Enum<T>
{
    public static readonly HELLO: MockMessageType2 = new MockMessageType();
}