import {Suite} from "mocha";
import {expect} from "chai";
import {MockHierarchyObject} from "./mock/mvc/MockHierarchyObject";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainer
} from "../src/com/domwires/core/mvc/hierarchy/IHierarchyObjectContainer";
import {MockMessageType} from "./mock/MockMessageType";
import {MockHierarchyObjectContainer} from "./mock/mvc/MockHierarchyObjectContainer";
import {IHierarchyObject} from "../src/com/domwires/core/mvc/hierarchy/IHierarchyObject";

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
        };

        hoc.addMessageListener(MockMessageType.HELLO, eventHandler);

        expect(hoc.hasMessageListener(MockMessageType.HELLO)).true;
    });

    it('testAdd', () =>
    {
        expect(hoc.children.length).equals(0);

        hoc.add(new MockHierarchyObject());
        hoc.add(new MockHierarchyObject());

        expect(hoc.children.length).equals(2);
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

        expect(ho_1.parent).null;
        expect(ho_2.parent).null;
        expect(hoc.children).null;
    });

    it('testDispose', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        const ho_2: IHierarchyObject = new MockHierarchyObject();
        hoc.add(ho_1);
        hoc.add(ho_2);
        hoc.dispose();

        expect(hoc.isDisposed).true;
        expect(hoc.children).not.exist;
        expect(ho_1.isDisposed).true;
        expect(ho_2.isDisposed).true;
    });

    it('testRemove', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        const ho_2: IHierarchyObject = new MockHierarchyObject();
        hoc.add(ho_1);
        hoc.add(ho_2);

        expect(ho_1.parent).equals(hoc);
        hoc.remove(ho_1);
        expect(ho_1.parent).not.exist;
        expect(hoc.children.length).equals(1);
    });

    it('testRemoveMessageListener', () =>
    {
        const eventHandler: () => void = () =>
        {
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
        expect(hoc.children.length).equals(0);
    });

    it('testRemoveAllMessageListeners', () =>
    {
        const eventHandler: () => void = () =>
        {
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
        expect(hoc.children.length).equals(1);

        const hoc_2: IHierarchyObjectContainer = new HierarchyObjectContainer();
        hoc_2.add(ho_1);

        expect(ho_1.parent).equals(hoc_2);
        expect(hoc.children.length).equals(0);
    });

    it('testAddAt', () =>
    {
        const ho_1: IHierarchyObject = new MockHierarchyObject();
        const ho_2: IHierarchyObject = new MockHierarchyObject();
        const ho_3: IHierarchyObject = new MockHierarchyObject();

        hoc.add(ho_1);
        hoc.add(ho_2);
        hoc.add(ho_3);

        expect(hoc.children.indexOf(ho_1)).equals(0);
        expect(hoc.children.indexOf(ho_2)).equals(1);
        expect(hoc.children.indexOf(ho_3)).equals(2);

        expect(ho_1.parent).equals(hoc);
        expect(ho_2.parent).equals(hoc);
        expect(ho_3.parent).equals(hoc);

        hoc.add(ho_3, 0);

        expect(hoc.children.indexOf(ho_3)).equals(0);

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