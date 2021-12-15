/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractContext, Class, ICommand, IMessage} from "../../src";
import {MockModel2, MockModel3, MockModel4, MockModel6} from "./MockModels";
import {MockMessageType} from "./MockMessageType";
import {MockCommand10, MockCommand11, MockCommand12, MockCommand16} from "./MockCommands";
import {MockMediator2, MockMediator3, MockMediator4} from "./MockMediators";
import {inject, postConstruct} from "inversify";

export class MockContext1<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    public override onMessageBubbled(message: IMessage<MessageDataType>): boolean
    {
        super.onMessageBubbled(message);

        // bubble up!
        return true;
    }
}

export class MockContext2<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    private testModel: MockModel2;

    protected override init(): void
    {
        super.init();

        this.testModel = this.factory.instantiateValueUnmapped(MockModel2);
        this.addModel(this.testModel);

        this.factory.mapToValue(MockModel2, this.testModel);

        this.map(MockMessageType.HELLO, MockCommand10);
    }

    public getTestModel(): MockModel2
    {
        return this.testModel;
    }
}

export class MockContext3<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    private testMediator: MockMediator2;
    private testModel2: MockModel3;

    protected override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel2 = this.factory.instantiateValueUnmapped(MockModel3);
        this.addModel(this.testModel2);

        this.factory.mapToValue(MockModel3, this.testModel2);

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

    public override onMessageBubbled(message: IMessage<MessageDataType>): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext4<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    private testMediator: MockMediator2;
    private testModel2: MockModel3;

    protected override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel2 = this.factory.instantiateValueUnmapped(MockModel3);
        this.addModel(this.testModel2);

        this.factory.mapToValue(MockModel3, this.testModel2);

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

    public override onMessageBubbled(message: IMessage<MessageDataType>): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext5<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    private v: MockMediator3;
    private m: MockModel4;

    protected override init(): void
    {
        this.config = {
            forwardMessageFromMediatorsToModels: true,
            forwardMessageFromMediatorsToMediators: true,
            forwardMessageFromModelsToMediators: true,
            forwardMessageFromModelsToModels: false
        };

        super.init();

        this.v = this.factory.instantiateValueUnmapped(MockMediator3);
        this.addMediator(this.v);

        this.m = this.factory.instantiateValueUnmapped(MockModel4);
        this.factory.mapToValue(MockModel4, this.m);
        this.addModel(this.m);

        const c: MockContext6 = this.factory.instantiateValueUnmapped(MockContext6);
        this.addModel(c);

        this.map(MockMessageType.HELLO, MockCommand12);

        this.v.dispatch();
    }

    public getModel(): MockModel4
    {
        return this.m;
    }
}

export class MockContext6<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    @postConstruct()
    public override init(): void
    {
        super.init();

        const m: MockMediator4 = this.factory.instantiateValueUnmapped(MockMediator4);
        this.addMediator(m);
    }
}

export class MockContext7<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    @inject("Class<ICommand>")
    private commandImpl: Class<ICommand>;

    private testMediator: MockMediator2;
    private testModel: MockModel2;

    public override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel = this.factory.instantiateValueUnmapped(MockModel2);
        this.addModel(this.testModel);

        this.factory.mapToValue(MockModel2, this.testModel);

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

    public override onMessageBubbled(message: IMessage<MessageDataType>): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext8<MessageDataType = any> extends AbstractContext<MessageDataType>
{
    public testModel: MockModel6;

    public override init(): void
    {
        super.init();

        this.map(MockMessageType.HELLO, MockCommand16);

        this.testModel = this.factory.getInstance(MockModel6);

        this.factory.mapToValue(MockModel6, this.testModel);

        this.addModel(this.testModel);
    }
}