import {Enum} from "../../src/com/domwires/core/Enum";

export class MockMessageType extends Enum
{
    public static readonly HELLO:MockMessageType = new MockMessageType("HELLO");
    public static readonly GOODBYE:MockMessageType = new MockMessageType("GOODBYE");
    public static readonly SHALOM:MockMessageType = new MockMessageType("SHALOM");
    public static readonly PREVED:MockMessageType = new MockMessageType("PREVED");

    public constructor(name: string)
    {
        super(name);
    }
}

export class MockMessageType2 extends Enum
{
    public static readonly HELLO:MockMessageType = new MockMessageType("HELLO");
    public static readonly GOODBYE:MockMessageType = new MockMessageType("GOODBYE");
    public static readonly SHALOM:MockMessageType = new MockMessageType("SHALOM");
    public static readonly PREVED:MockMessageType = new MockMessageType("PREVED");

    public constructor(name: string)
    {
        super(name);
    }
}