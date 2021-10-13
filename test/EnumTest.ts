import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {MockEnum} from "./mock/MockEnum";

describe('EnumTest', function (this: Suite)
{
    it('testName', () =>
    {
        expect(MockEnum.PREVED.name).equals("preved");
    });
});