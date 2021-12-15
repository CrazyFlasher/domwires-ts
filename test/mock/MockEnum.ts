import {Enum} from "../../src";

export class MockEnum extends Enum
{
    public static readonly PREVED:MockEnum = new MockEnum("preved");

    public constructor(name: string)
    {
        super(name);
    }
}