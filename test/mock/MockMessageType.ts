/* eslint-disable @typescript-eslint/no-explicit-any */

import {MessageType} from "../../src";

export type MockMessageDataType1 = {
    readonly prop: string;
};

export type MockMessageDataType2 = {
    readonly name: string;
};

export class MockMessageType<T = any> extends MessageType<T>
{
    public static readonly HELLO: MessageType<MockMessageDataType1> = new MockMessageType<MockMessageDataType1>("HELLO");
    public static readonly GOODBYE: MessageType<MockMessageDataType2> = new MockMessageType<MockMessageDataType2>("GOODBYE");
    public static readonly SHALOM: MessageType<any> = new MockMessageType("SHALOM");
}

export class MockMessageType2 extends MessageType<any>
{
    public static readonly HELLO: MessageType<any> = new MockMessageType("HELLO");
}