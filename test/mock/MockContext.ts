/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractContext, Class, ContextConfigBuilder, ICommand, IMessage} from "../../src";
import {MockModel2, MockModel3, MockModel4, MockModel6} from "./MockModels";
import {MockMessageType} from "./MockMessageType";
import {
    MockCommand10,
    MockCommand11,
    MockCommand12,
    MockCommand16,
    MockCommand20,
    MockCommand21,
    MockCommand23, MockCommand24,
    MockVo5,
    MockVo6
} from "./MockCommands";
import {MockMediator2, MockMediator3, MockMediator4} from "./MockMediators";
import {inject, postConstruct} from "inversify";
import {MockTargetIsMockVo1, MockTargetIsMockVo2} from "./MockGuards";

export class MockContext1 extends AbstractContext
{
    public override onMessageBubbled(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        // bubble up!
        return true;
    }
}

export class MockContext2 extends AbstractContext
{
    private testModel!: MockModel2;

    protected override init(): void
    {
        super.init();

        this.testModel = this.factory.instantiateValueUnmapped<MockModel2>(MockModel2);
        this.addModel(this.testModel);

        this.factory.mapToValue<MockModel2>(MockModel2, this.testModel);

        this.map(MockMessageType.HELLO, MockCommand10);
    }

    public getTestModel(): MockModel2
    {
        return this.testModel;
    }
}

export class MockContext3 extends AbstractContext
{
    private testMediator!: MockMediator2;
    private testModel2!: MockModel3;

    protected override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped<MockMediator2>(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel2 = this.factory.instantiateValueUnmapped<MockModel3>(MockModel3);
        this.addModel(this.testModel2);

        this.factory.mapToValue<MockModel3>(MockModel3, this.testModel2);

        this.map(MockMessageType.HELLO, MockCommand11);
    }

    public getTestModel(): MockModel3
    {
        return this.testModel2;
    }

    public ready(): void
    {
        this.testMediator.dispatch();
    }

    public override onMessageBubbled(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext5 extends AbstractContext
{
    private v!: MockMediator3;
    private m!: MockModel4;

    protected override init(): void
    {
        const cb = new ContextConfigBuilder();
        cb.forwardMessageFromMediatorsToModels = true;
        this.config = cb.build();

        super.init();

        this.v = this.factory.instantiateValueUnmapped<MockMediator3>(MockMediator3);
        this.addMediator(this.v);

        this.m = this.factory.instantiateValueUnmapped<MockModel4>(MockModel4);
        this.factory.mapToValue<MockModel4>(MockModel4, this.m);
        this.addModel(this.m);

        const c: MockContext6 = this.factory.instantiateValueUnmapped<MockContext6>(MockContext6);
        this.addModel(c);

        this.map(MockMessageType.HELLO, MockCommand12);

        this.v.dispatch();
    }

    public getModel4(): MockModel4
    {
        return this.m;
    }
}

export class MockContext6 extends AbstractContext
{
    @postConstruct()
    public override init(): void
    {
        super.init();

        const m: MockMediator4 = this.factory.instantiateValueUnmapped<MockMediator4>(MockMediator4);
        this.addMediator(m);
    }
}

export class MockContext7 extends AbstractContext
{
    @inject("Class<ICommand>")
    private commandImpl!: Class<ICommand>;

    private testMediator!: MockMediator2;
    private testModel!: MockModel2;

    public override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped<MockMediator2>(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel = this.factory.instantiateValueUnmapped<MockModel2>(MockModel2);
        this.addModel(this.testModel);

        this.factory.mapToValue<MockModel2>(MockModel2, this.testModel);

        this.map(MockMessageType.HELLO, this.commandImpl);
    }

    public getTestModel(): MockModel2
    {
        return this.testModel;
    }

    public ready(): void
    {
        this.testMediator.dispatch();
    }

    public override onMessageBubbled(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext8 extends AbstractContext
{
    public testModel!: MockModel6;

    public override init(): void
    {
        super.init();

        this.map(MockMessageType.HELLO, MockCommand16);

        this.testModel = this.factory.getInstance<MockModel6>(MockModel6);

        this.factory.mapToValue<MockModel6>(MockModel6, this.testModel);

        this.addModel(this.testModel);
    }
}

export class MockContext9 extends AbstractContext
{
    public vo1!: MockVo5;
    public vo2!: MockVo6;

    public override init(): void
    {
        super.init();

        this.vo1 = new MockVo5();
        this.vo2 = new MockVo6();

        this.addModel(this.vo1);
        this.addModel(this.vo2);

        this.factory.mapToValue<MockVo5>(MockVo5, this.vo1);
        this.factory.mapToValue<MockVo6>(MockVo6, this.vo2);

        this.map(MockMessageType.SHALOM, MockCommand21, {vo: this.vo2}).addGuards(MockTargetIsMockVo1);
        this.map(MockMessageType.SHALOM, MockCommand23, {vo1: this.vo1, vo2: this.vo2}).addGuards(MockTargetIsMockVo2);

        this.executeCommand(MockCommand20, {vo: this.vo1});
    }
}

export class MockContext10 extends AbstractContext
{
    private testModel!: MockModel2;

    protected override init(): void
    {
        super.init();

        this.testModel = this.factory.instantiateValueUnmapped<MockModel2>(MockModel2);
        this.addModel(this.testModel);

        this.factory.mapToValue<MockModel2>(MockModel2, this.testModel);

        this.map(MockMessageType.HELLO, MockCommand24);

        this.testModel.dispatchMessage(MockMessageType.HELLO);
    }

    public getTestModel(): MockModel2
    {
        return this.testModel;
    }
}

export class MockContext11 extends AbstractContext
{

}
