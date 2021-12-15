/* eslint-disable @typescript-eslint/no-explicit-any */

import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {AppFactory, IAppFactory} from "../src";
import {AbstractModel} from "../src";
import {AbstractContext} from "../src";
import {ModelContainer} from "../src";
import {AbstractMediator} from "../src";
import {MockContext1} from "./mock/MockContext";
import {MockModel1} from "./mock/MockModels";
import {MockMediator1} from "./mock/MockMediators";
import "../src/com/domwires/core/mvc/model/IModelContainer";
import "../src/com/domwires/core/mvc/mediator/IMediatorContainer";
import "../src/com/domwires/core/mvc/command/ICommandMapper";
import {Enum} from "../src";
import {MockMessageType} from "./mock/MockMessageType";
import {IContext} from "../src";
import {logger} from "../src";
import {IMessage} from "../src";

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
    let m1: AbstractModel<any>;
    let c1: AbstractContext<any>;
    let c2: AbstractContext<any>;
    let c3: AbstractContext<any>;
    let c4: AbstractContext<any>;
    let mc1: ModelContainer<any>;
    let mc2: ModelContainer<any>;
    let mc3: ModelContainer<any>;
    let mc4: ModelContainer<any>;
    let v1: AbstractMediator<any>;

    let factory: IAppFactory;

    beforeEach(() =>
    {
        factory = new AppFactory();
        factory.mapToValue("IAppFactory", factory);

        c1 = factory.instantiateValueUnmapped(MockContext1);
        c2 = factory.instantiateValueUnmapped(MockContext1);
        c3 = factory.instantiateValueUnmapped(MockContext1);
        c4 = factory.instantiateValueUnmapped(MockContext1);
        mc1 = factory.instantiateValueUnmapped(ModelContainer);
        mc2 = factory.instantiateValueUnmapped(ModelContainer);
        mc3 = factory.instantiateValueUnmapped(ModelContainer);
        mc4 = factory.instantiateValueUnmapped(ModelContainer);
        m1 = factory.instantiateValueUnmapped(MockModel1);
        v1 = factory.instantiateValueUnmapped(MockMediator1);

        mc2.addModel(m1);
        mc1.addModel(mc2);
        c4.addModel(mc4);
        c3.addModel(mc3);
        c2.addModel(mc1);
        c1.add(c2);
        c1.add(c3);
        c1.add(c4);
        c1.addMediator(v1);
    });

    afterEach(() =>
    {
        c1.dispose();
        factory.dispose();
    });

    it('testBubblingFromBottomToTop', () =>
    {
        let bubbledEventType: Enum;

        const successFunc: (message: IMessage<any>) => void = (message: IMessage<any>) =>
        {
            // message came from bottom to top
            bubbledEventType = message.type;
        };

        // top element
        c1.addMessageListener(MockMessageType.HELLO, successFunc);

        // bottom element
        m1.dispatchMessage(MockMessageType.HELLO, {name: "Anton"}, true);

        expect(bubbledEventType).equals(MockMessageType.HELLO);

        bubbledEventType = null;

        v1.dispatchMessage(MockMessageType.HELLO, {name: "Anton"}, true);

        expect(bubbledEventType).equals(MockMessageType.HELLO);
    });

    it('testBubblingFromBottomToTopPerf', () =>
    {
        const successFunc: () => void = () =>
        {
            /* eslint-disable @typescript-eslint/no-empty-function */
        };

        const c1: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c2: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c3: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c4: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c5: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c6: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c7: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c8: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c9: IContext<any> = factory.instantiateValueUnmapped(MockContext1);
        const c10: IContext<any> = factory.instantiateValueUnmapped(MockContext1);

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
            c1.addMessageListener(MockMessageType.HELLO, successFunc);
            c2.addMessageListener(MockMessageType.HELLO, successFunc);
            c3.addMessageListener(MockMessageType.HELLO, successFunc);
            c4.addMessageListener(MockMessageType.HELLO, successFunc);
            c5.addMessageListener(MockMessageType.HELLO, successFunc);
            c6.addMessageListener(MockMessageType.HELLO, successFunc);
            c7.addMessageListener(MockMessageType.HELLO, successFunc);
            c8.addMessageListener(MockMessageType.HELLO, successFunc);
            c9.addMessageListener(MockMessageType.HELLO, successFunc);
            c10.addMessageListener(MockMessageType.HELLO, successFunc);

            // bottom element
            c10.dispatchMessage(MockMessageType.HELLO, {name: "Anton"}, false);
        }

        const timePassed: number = new Date().getTime() - time;
        logger.info("timePassed", timePassed);
        expect(timePassed < 500).true;
    });

    it('testHierarchy', () =>
    {
        expect(mc3.parent).equals(c3);
        expect(mc4.parent).equals(c4);
        expect(m1.parent).equals(mc2);
        expect(m1.parent).not.equals(mc1);
        expect(mc2.parent).equals(mc1);
        expect(mc2.parent).not.equals(c2);
        expect(m1.parent).not.equals(c1);
    });
});