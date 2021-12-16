import "reflect-metadata";
import {expect} from "chai";
import {Suite} from "mocha";
import {IDisposable} from "../src";
import {MockDisposable} from "./mock/common/MockDisposable";

describe('DisposableTest', function (this: Suite)
{
    it('testDispose', () =>
    {
        const d: IDisposable = new MockDisposable();
        expect(d.isDisposed).false;
        d.dispose();
        expect(d.isDisposed).true;
    });
});