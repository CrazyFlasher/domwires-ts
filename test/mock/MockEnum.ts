import {Enum} from "../../src/com/domwires/core/Enum";

export class MockEnum extends Enum
{
    static readonly PREVED:MockEnum = new MockEnum("preved");

    constructor(name: string)
    {
        super(name);
    }
}