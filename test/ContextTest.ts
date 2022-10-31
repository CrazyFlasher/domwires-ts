/* eslint-disable @typescript-eslint/no-explicit-any */

import "reflect-metadata";
import {Suite} from "mocha";
import {ContextConfigBuilder, Factory, IContext, IFactory, Logger, LogLevel} from "../src";
import {expect} from "chai";
import {MockContext1, MockContext2, MockContext3, MockContext5, MockContext7, MockContext8} from "./mock/MockContext";
import {MockMediator1, MockMediator4} from "./mock/MockMediators";
import {MockCommand10, MockCommand13, MockCommand14, MockCommand15} from "./mock/MockCommands";
import {MockObj1} from "./mock/IMockObject";
import {MockMessageType} from "./mock/MockMessageType";
import {MockModel1} from "./mock/MockModels";
import "../src/com/domwires/core/mvc/command/ICommandMapper";

describe('ContextTest', function (this: Suite)
{
    let f: IFactory;
    let c: IContext;

    beforeEach(() =>
    {
        f = new Factory(new Logger(LogLevel.INFO));
        f.mapToType<IContext>("IContext", MockContext1);
        f.mapToValue<IFactory>("IFactory", f);

        const configBuilder = new ContextConfigBuilder();
        configBuilder.forwardMessageFromMediatorsToModels = true;

        f.mapToValue("ContextConfig", configBuilder.build());

        c = f.getInstance("IContext");
        c.addModel(f.instantiateValueUnmapped<MockModel1>(MockModel1));
        c.addMediator(f.instantiateValueUnmapped<MockMediator1>(MockMediator1));
    });

    afterEach(() =>
    {
        if (!c.isDisposed)
        {
            c.dispose();
        }

        f.dispose();
    });

    it('testAddRemoveGet', () =>
    {
        c.removeAll();

        const mo1 = f.getInstance<MockModel1>(MockModel1);
        const mo2 = f.getInstance<MockModel1>(MockModel1);
        const mo3 = f.getInstance<MockModel1>(MockModel1);

        c.addModel(mo1);
        c.addModel(mo2, "mo");
        c.addModel(mo3);

        expect(c.getModel("mo")).equals(mo2);

        const m1 = f.getInstance<MockMediator1>(MockMediator1);
        const m2 = f.getInstance<MockMediator1>(MockMediator1);
        const m3 = f.getInstance<MockMediator1>(MockMediator1);

        c.addMediator(m1);
        c.addMediator(m2, "mo");
        c.addMediator(m3);

        expect(c.getMediator("mo")).equals(m2);

        expect(c.getModel("mo")).not.equals(c.getMediator("mo"));
    });

    it('testDisposeWithAllChildren', () =>
    {
        c.dispose();

        expect(c.isDisposed).true;
    });

    it('testExecuteCommandFromBubbledMessage', () =>
    {
        const c2: MockContext2 = f.instantiateValueUnmapped<MockContext2>(MockContext2);
        const c3: MockContext3 = f.instantiateValueUnmapped<MockContext3>(MockContext3);
        c.addModel(c2);
        c.addModel(c3);

        c3.ready();

        expect(c2.getTestModel().testVar).equals(1);
    });

    it('testBubbledMessageNotRedirectedToContextItCameFrom', () =>
    {
        const c1: MockContext2 = f.instantiateValueUnmapped<MockContext2>(MockContext2);
        const c2: MockContext3 = f.instantiateValueUnmapped<MockContext3>(MockContext3);
        c.addModel(c1);
        c.addModel(c2);

        c2.ready();

        expect(c2.getTestModel().testVar).equals(1);
    });

    it('testMediatorMessageBubbledOnceForChildContext', () =>
    {
        MockMediator4.val = 0;
        const c: MockContext5 = f.instantiateValueUnmapped<MockContext5>(MockContext5);
        expect(c.getModel4().testVar).equals(1);
        expect(MockMediator4.val).equals(1);
    });

    it('testMapToInterface', () =>
    {
        const factory: IFactory = new Factory(new Logger(LogLevel.INFO));
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("Class<ICommand>", MockCommand10);
        const c: MockContext7 = factory.getInstance<MockContext7>(MockContext7);
        c.ready();

        factory.mapToValue("Class<ICommand>", MockCommand13);
        const c2: MockContext7 = factory.getInstance<MockContext7>(MockContext7);
        c2.ready();

        expect(c2).not.equals(c);
        expect(c.getTestModel().testVar).equals(1);
        expect(c2.getTestModel().testVar).equals(2);
    });

    it('testStopOnExecute', () =>
    {
        const m: MockObj1 = f.instantiateValueUnmapped<MockObj1>(MockObj1);
        f.mapToValue<MockObj1>(MockObj1, m);
        f.mapToValue("string", "test", "olo");
        c.map(MockMessageType.GOODBYE, MockCommand14, null, false, true);
        c.map(MockMessageType.GOODBYE, MockCommand15);
        c.tryToExecuteCommand(MockMessageType.GOODBYE);
        expect(m.d).equals(0);
    });

    it('testCommandMappedToOtherMessageType', () =>
    {
        const c: MockContext8 = f.getInstance<MockContext8>(MockContext8);

        expect(c.testModel.v).equals(0);
    });
});