import {Enum} from "../../src";

export class MockMessageType extends Enum
{
    public static readonly HELLO:MockMessageType = new MockMessageType("HELLO");
    public static readonly GOODBYE:MockMessageType = new MockMessageType("GOODBYE");
    public static readonly SHALOM:MockMessageType = new MockMessageType("SHALOM");
    public static readonly PREVED:MockMessageType = new MockMessageType("PREVED");
}

export class MockMessageType2 extends Enum
{
    public static readonly HELLO:MockMessageType = new MockMessageType("HELLO");
    public static readonly GOODBYE:MockMessageType = new MockMessageType("GOODBYE");
    public static readonly SHALOM:MockMessageType = new MockMessageType("SHALOM");
    public static readonly PREVED:MockMessageType = new MockMessageType("PREVED");
}