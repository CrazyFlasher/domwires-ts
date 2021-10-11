import {before, it, Suite} from "mocha";
import {expect} from "chai";
import ArrayUtils from "../src/com/domwires/core/utils/ArrayUtils";

let arr: number[];

before(() =>
{
    arr = [1, 2, 3, 4];
});

describe('ArrayUtilsTest', function (this: Suite)
{
    it("testIsLast", () =>
    {
        expect(ArrayUtils.isLast(arr, 4)).true;
        expect(ArrayUtils.isLast(arr, 1)).false;
        expect(ArrayUtils.isLast(arr, 0)).false;
    });

    it("testContains", () =>
    {
        expect(ArrayUtils.contains(arr, 4)).true;
        expect(ArrayUtils.contains(arr, 2)).true;
        expect(ArrayUtils.contains(arr, 2)).true;
        expect(ArrayUtils.contains(arr, 5)).false;
        expect(ArrayUtils.contains(arr, -5)).false;
        expect(ArrayUtils.contains(arr, -6)).false;
    });

    it("testRemove", () =>
    {
        ArrayUtils.remove(arr, 2);

        expect(arr[0]).equals(1);
        expect(arr[1]).equals(3);
        expect(arr[2]).equals(4);
        expect(arr.length).equals(3);
    });

    it("testClear", () =>
    {
        ArrayUtils.clear(arr);

        expect(arr.length).equals(0);
    });
});