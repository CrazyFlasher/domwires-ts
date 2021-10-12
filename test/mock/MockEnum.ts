import {Enum} from "../../src/com/domwires/core/Enum";

export class MockEnum extends Enum
{
    public static readonly PREVED:MockEnum = new MockEnum("preved");

    public constructor(name: string)
    {
        super(name);
    }
}