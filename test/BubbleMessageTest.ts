/* eslint-disable @typescript-eslint/no-explicit-any */

import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {
    AbstractContext, AbstractHierarchyObject,
    Enum,
    Factory, HierarchyObjectContainer,
    IContext,
    IFactory, IHierarchyObject, IHierarchyObjectImmutable,
    IMessage, LogLevel
} from "../src";
import {MockContext1} from "./mock/MockContext";
import {MockModel1} from "./mock/MockModels";
import {MockMediator1} from "./mock/MockMediators";
import "../src/com/domwires/core/mvc/command/ICommandMapper";
import {MockMessageType} from "./mock/MockMessageType";
import {Logger} from "../src";

/**
 *            c1
 *         /    |  \
 *        c2    c3    c4
 *        |    |    |
 *        mc1    mc3    mc4
 *        |
 *        mc2
 *        |
 *        m1
 */

describe('BubbleMessageTest', function (this: Suite)
{
    const logger = new Logger(LogLevel.INFO);

    let m1: AbstractHierarchyObject;
    let c1: AbstractContext;
    let c2: AbstractContext;
    let c3: AbstractContext;
    let c4: AbstractContext;
    let mc1: HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>;
    let mc2: HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>;
    let mc3: HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>;
    let mc4: HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>;
    let v1: AbstractHierarchyObject;

    let factory: IFactory;

    beforeEach(() =>
    {
        factory = new Factory(logger);
        factory.mapToValue("IFactory", factory);

        c1 = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        c2 = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        c3 = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        c4 = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        mc1 = factory.instantiateValueUnmapped<HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>>(HierarchyObjectContainer);
        mc2 = factory.instantiateValueUnmapped<HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>>(HierarchyObjectContainer);
        mc3 = factory.instantiateValueUnmapped<HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>>(HierarchyObjectContainer);
        mc4 = factory.instantiateValueUnmapped<HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>>(HierarchyObjectContainer);
        m1 = factory.instantiateValueUnmapped<MockModel1>(MockModel1);
        v1 = factory.instantiateValueUnmapped<MockMediator1>(MockMediator1);

        mc2.add(m1);
        mc1.add(mc2);
        c4.addModel(mc4);
        c3.addModel(mc3);
        c2.addModel(mc1);
        c1.addModel(c2);
        c1.addModel(c3);
        c1.addModel(c4);
        c1.addMediator(v1);
    });

    afterEach(() =>
    {
        c1.dispose();
        factory.dispose();
    });

    it('testBubblingFromBottomToTop', () =>
    {
        let bubbledEventType: Enum | undefined = undefined;

        const successFunc: (message?: IMessage) => void = (message?: IMessage) =>
        {
            // message came from bottom to top
            if (message)
            {
                bubbledEventType = message.type;
            }
        };

        // top element
        c1.addMessageListener(MockMessageType.GOODBYE, successFunc);

        // bottom element
        m1.dispatchMessage(MockMessageType.GOODBYE, {name: "Anton"}, true);

        expect(bubbledEventType).equals(MockMessageType.GOODBYE);

        bubbledEventType = undefined;

        v1.dispatchMessage(MockMessageType.GOODBYE, {name: "Anton"}, true);

        expect(bubbledEventType).equals(MockMessageType.GOODBYE);
    });

    it('testBubblingFromBottomToTopPerf', () =>
    {
        const successFunc: () => void = () =>
        {
            /* eslint-disable @typescript-eslint/no-empty-function */
        };

        const c1: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c2: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c3: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c4: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c5: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c6: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c7: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c8: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c9: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);
        const c10: IContext = factory.instantiateValueUnmapped<MockContext1>(MockContext1);

        c1.addModel(
            c2.addModel(
                c3.addModel(
                    c4.addModel(
                        c5.addModel(
                            c6.addModel(
                                c7.addModel(
                                    c8.addModel(
                                        c9.addModel(
                                            c10)))))))));


        const time: number = new Date().getTime();

        for (let i = 0; i < 100000; i++)
        {
            // top element
            c1.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c2.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c3.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c4.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c5.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c6.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c7.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c8.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c9.addMessageListener(MockMessageType.GOODBYE, successFunc);
            c10.addMessageListener(MockMessageType.GOODBYE, successFunc);

            // bottom element
            c10.dispatchMessage(MockMessageType.GOODBYE, {name: "Anton"}, false);
        }

        const timePassed: number = new Date().getTime() - time;
        logger.info("timePassed", timePassed);
        expect(timePassed < 500).true;
    });

    it('testHierarchy', () =>
    {
        expect(mc3.parent).equals(c3);
        expect(mc3.root).equals(c3);
        expect(mc4.parent).equals(c4);
        expect(m1.parent).equals(mc2);
        expect(m1.parent).not.equals(mc1);
        expect(mc2.parent).equals(mc1);
        expect(mc2.parent).not.equals(c2);
        expect(m1.parent).not.equals(c1);
    });
});