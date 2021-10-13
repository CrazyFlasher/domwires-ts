import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {MockHierarchyObject} from "./mock/mvc/MockHierarchyObject";
import {IHierarchyObject} from "../src/com/domwires/core/mvc/hierarchy/IHierarchyObject";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainer
} from "../src/com/domwires/core/mvc/hierarchy/IHierarchyObjectContainer";

describe('HierarchyObjectTest', function (this: Suite)
{
    let ho: IHierarchyObject;

    beforeEach(() =>
    {
        ho = new MockHierarchyObject();
    });

    afterEach(() =>
    {
        if (!ho.isDisposed)
        {
            ho.dispose();
        }
    });

    it('testDispose', () =>
    {
        addToContainer(ho);

        ho.dispose();

        expect(ho.isDisposed).true;
        expect(ho.parent).not.exist;
    });

    it('testParent', () =>
    {
        expect(ho.parent).not.exist;

        const hoc: IHierarchyObjectContainer = addToContainer(ho);

        expect(ho.parent).equals(hoc);
    });
});

export function addToContainer(ho: IHierarchyObject): IHierarchyObjectContainer
{
    const hoc: IHierarchyObjectContainer = new HierarchyObjectContainer();
    hoc.add(ho);

    return hoc;
}