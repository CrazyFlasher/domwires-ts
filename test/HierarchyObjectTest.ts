/* eslint-disable @typescript-eslint/no-explicit-any */

import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {MockHierarchyObject} from "./mock/mvc/MockHierarchyObject";
import {IHierarchyObject} from "../src";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainer
} from "../src";

describe('HierarchyObjectTest', function (this: Suite)
{
    let ho: IHierarchyObject<any>;

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

        const hoc: IHierarchyObjectContainer<any> = addToContainer(ho);

        expect(ho.parent).equals(hoc);
    });
});

export function addToContainer(ho: IHierarchyObject<any>): IHierarchyObjectContainer<any>
{
    const hoc: IHierarchyObjectContainer<any> = new HierarchyObjectContainer();
    hoc.add(ho);

    return hoc;
}