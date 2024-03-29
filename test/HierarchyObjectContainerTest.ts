/* eslint-disable @typescript-eslint/no-explicit-any */

import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {MockHierarchyObject} from "./mock/mvc/MockHierarchyObject";
import {HierarchyObjectContainer, IHierarchyObject, IHierarchyObjectContainer} from "../src";
import {MockMessageType} from "./mock/MockMessageType";
import {MockHierarchyObjectContainer} from "./mock/mvc/MockHierarchyObjectContainer";

describe('HierarchyObjectContainerTest', function (this: Suite)
{
    let hoc: IHierarchyObjectContainer;

    beforeEach(() =>
    {
        hoc = new HierarchyObjectContainer();
    });

    afterEach(() =>
    {
        if (!hoc.isDisposed)
        {
            hoc.dispose();
        }
    });

    it('testAddMessageListener', () =>
    {
        expect(hoc.hasMessageListener(MockMessageType.HELLO)).false;

        const eventHandler: () => void = () =>
        {
            /* eslint-disable @typescript-eslint/no-empty-function */
        };

        hoc.addMessageListener(MockMessageType.HELLO, eventHandler);

        expect(hoc.hasMessageListener(MockMessageType.HELLO)).true;
    });

    it('testAdd', () =>
    {
        expect(hoc.numChildren).equals(0);

        const child2 = new MockHierarchyObject();
        const child1 = new MockHierarchyObject();

        hoc.add(child1);
        hoc.add(child2, "olo");

        expect(hoc.numChildren).equals(2);
        expect(hoc.get("olo")).equals(child2);
        expect(hoc.get(0)).equals(child1);
    });

    it('testDisposeWithAllChildren', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        const ho_2: IHierarchyObject = new MockHierarchyObject();
        hoc.add(ho_1);
        hoc.add(ho_2);
        hoc.dispose();

        expect(hoc.isDisposed).true;
        expect(hoc.isDisposed).true;
        expect(hoc.isDisposed).true;

        expect(ho_1.parent).undefined;
        expect(ho_2.parent).undefined;
        // expect(hoc.children).undefined;
    });

    it('testDispose', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        const ho_2: IHierarchyObject = new MockHierarchyObject();
        hoc.add(ho_1);
        hoc.add(ho_2);
        hoc.dispose();

        expect(hoc.isDisposed).true;
        expect(hoc.numChildren).equals(0);
        expect(ho_1.isDisposed).true;
        expect(ho_2.isDisposed).true;
    });

    it('testRemove', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        const ho_2: IHierarchyObject = new MockHierarchyObject();
        hoc.add(ho_1);
        hoc.add(ho_2, "olo");

        expect(ho_1.parent).equals(hoc);

        hoc.remove(ho_1);
        expect(ho_1.parent).not.exist;
        expect(hoc.numChildren).equals(1);

        hoc.remove("olo");
        expect(ho_2.parent).not.exist;
        expect(hoc.numChildren).equals(0);
    });

    it('testRemoveMessageListener', () =>
    {
        const eventHandler: () => void = () =>
        {
            /* eslint-disable @typescript-eslint/no-empty-function */
        };

        hoc.addMessageListener(MockMessageType.HELLO, eventHandler);
        hoc.removeMessageListener(MockMessageType.HELLO, eventHandler);

        expect(hoc.hasMessageListener(MockMessageType.HELLO)).false;
    });

    it('testRemoveAll', () =>
    {
        hoc.add(new MockHierarchyObject());
        hoc.add(new MockHierarchyObject());
        hoc.removeAll();
        expect(hoc.numChildren).equals(0);
    });

    it('testRemoveAllMessageListeners', () =>
    {
        const eventHandler: () => void = () =>
        {
            /* eslint-disable @typescript-eslint/no-empty-function */
        };

        hoc.addMessageListener(MockMessageType.HELLO, eventHandler);
        hoc.addMessageListener(MockMessageType.GOODBYE, eventHandler);
        hoc.addMessageListener(MockMessageType.SHALOM, eventHandler);

        expect(hoc.hasMessageListener(MockMessageType.HELLO)).true;
        expect(hoc.hasMessageListener(MockMessageType.GOODBYE)).true;
        expect(hoc.hasMessageListener(MockMessageType.SHALOM)).true;

        hoc.removeAllMessageListeners();

        expect(hoc.hasMessageListener(MockMessageType.HELLO)).false;
        expect(hoc.hasMessageListener(MockMessageType.GOODBYE)).false;
        expect(hoc.hasMessageListener(MockMessageType.SHALOM)).false;
    });

    it('testChangeParent', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        hoc.add(ho_1);

        expect(ho_1.parent).equals(hoc);
        expect(hoc.numChildren).equals(1);

        const hoc_2: IHierarchyObjectContainer = new HierarchyObjectContainer();
        hoc_2.add(ho_1);

        expect(ho_1.parent).equals(hoc_2);
        expect(hoc.numChildren).equals(0);
    });

    it('testAddAt', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        const ho_2: IHierarchyObject = new MockHierarchyObject();
        const ho_3: IHierarchyObject = new MockHierarchyObject();

        hoc.add(ho_1);
        hoc.add(ho_2);
        hoc.add(ho_3);

        expect(hoc.get(0)).equals(ho_1);
        expect(hoc.get(1)).equals(ho_2);
        expect(hoc.get(2)).equals(ho_3);

        expect(ho_1.parent).equals(hoc);
        expect(ho_2.parent).equals(hoc);
        expect(ho_3.parent).equals(hoc);

        hoc.add(ho_3, 0);

        expect(hoc.get(0)).equals(ho_3);
        expect(hoc.get(1)).equals(ho_1);
        expect(hoc.get(2)).equals(ho_2);

        expect(ho_3.parent).equals(hoc);
    });

    it('testAddAtParent', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        hoc.add(ho_1, 0);
        expect(ho_1.parent).equals(hoc);
    });

    it('testOverridenDispose', () =>
    {
        const hoc2: MockHierarchyObjectContainer = new MockHierarchyObjectContainer();
        hoc.add(hoc2);
        hoc.remove(hoc2, true);
        expect(hoc2.getValue()).true;
    });
});