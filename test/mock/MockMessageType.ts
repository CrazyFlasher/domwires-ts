import {Enum} from "../../src/com/domwires/core/Enum";

export class MockMessageType extends Enum
{
    static readonly HELLO:MockMessageType = new MockMessageType("HELLO");
    static readonly GOODBYE:MockMessageType = new MockMessageType("GOODBYE");
    static readonly SHALOM:MockMessageType = new MockMessageType("SHALOM");
    static readonly PREVED:MockMessageType = new MockMessageType("PREVED");

    constructor(name: string)
    {
        super(name);
    }
}

export class MockMessageType2 extends Enum
{
    static readonly HELLO:MockMessageType = new MockMessageType("HELLO");
    static readonly GOODBYE:MockMessageType = new MockMessageType("GOODBYE");
    static readonly SHALOM:MockMessageType = new MockMessageType("SHALOM");
    static readonly PREVED:MockMessageType = new MockMessageType("PREVED");

    constructor(name: string)
    {
        super(name);
    }
}