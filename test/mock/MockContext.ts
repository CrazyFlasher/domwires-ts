import {AbstractContext} from "../../src/com/domwires/core/mvc/context/AbstractContext";
import {IMessage} from "../../src/com/domwires/core/mvc/message/IMessageDispatcher";
import {MockModel2, MockModel3, MockModel4, MockModel6} from "./MockModels";
import {MockMessageType} from "./MockMessageType";
import {MockCommand10, MockCommand11, MockCommand12, MockCommand16} from "./MockCommands";
import {MockMediator2, MockMediator3, MockMediator4} from "./MockMediators";
import {inject, postConstruct} from "inversify";
import {Class} from "../../src/com/domwires/core/Global";
import {ICommand} from "../../src/com/domwires/core/mvc/command/ICommand";

export class MockContext1 extends AbstractContext
{
    override onMessageBubbled(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        // bubble up!
        return true;
    }
}

export class MockContext2 extends AbstractContext
{
    private testModel: MockModel2;

    override init(): void
    {
        super.init();

        this.testModel = this.factory.instantiateValueUnmapped(MockModel2);
        this.addModel(this.testModel);

        this.factory.mapToValue(MockModel2, this.testModel);

        this.map(MockMessageType.HELLO, MockCommand10);
    }

    getTestModel(): MockModel2
    {
        return this.testModel;
    }
}

export class MockContext3 extends AbstractContext
{
    private testMediator: MockMediator2;
    private testModel2: MockModel3;

    override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel2 = this.factory.instantiateValueUnmapped(MockModel3);
        this.addModel(this.testModel2);

        this.factory.mapToValue(MockModel3, this.testModel2);

        this.map(MockMessageType.HELLO, MockCommand11);
    }

    getTestModel(): MockModel3
    {
        return this.testModel2;
    }

    ready(): void
    {
        this.testMediator.dispatch();
    }

    override onMessageBubbled(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext4 extends AbstractContext
{
    private testMediator: MockMediator2;
    private testModel2: MockModel3;

    override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel2 = this.factory.instantiateValueUnmapped(MockModel3);
        this.addModel(this.testModel2);

        this.factory.mapToValue(MockModel3, this.testModel2);

        this.map(MockMessageType.HELLO, MockCommand11);
    }

    getTestModel(): MockModel3
    {
        return this.testModel2;
    }

    ready(): void
    {
        this.testMediator.dispatch();
    }

    override onMessageBubbled(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext5 extends AbstractContext
{
    private v: MockMediator3;
    private m: MockModel4;

    @postConstruct()
    override init(): void
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

        this.addModel(this.factory.instantiateValueUnmapped(MockContext6));

        this.map(MockMessageType.HELLO, MockCommand12);

        this.v.dispatch();
    }

    getModel(): MockModel4
    {
        return this.m;
    }
}

export class MockContext6 extends AbstractContext
{
    @postConstruct()
    override init(): void
    {
        super.init();

        this.addMediator(this.factory.instantiateValueUnmapped(MockMediator4));
    }
}

export class MockContext7 extends AbstractContext
{
    @inject("Class<ICommand>")
    private commandImpl: Class<ICommand>;

    private testMediator: MockMediator2;
    private testModel: MockModel2;

    override init(): void
    {
        super.init();

        this.testMediator = this.factory.instantiateValueUnmapped(MockMediator2);
        this.addMediator(this.testMediator);

        this.testModel = this.factory.instantiateValueUnmapped(MockModel2);
        this.addModel(this.testModel);

        this.factory.mapToValue(MockModel2, this.testModel);

        this.map(MockMessageType.HELLO, this.commandImpl);
    }

    getTestModel(): MockModel2
    {
        return this.testModel;
    }

    ready(): void
    {
        this.testMediator.dispatch();
    }

    override onMessageBubbled(message: IMessage): boolean
    {
        super.onMessageBubbled(message);

        // to pass message to parent context
        return true;
    }
}

export class MockContext8 extends AbstractContext
{
    public testModel: MockModel6;

    override init(): void
    {
        super.init();

        this.map(MockMessageType.HELLO, MockCommand16);

        this.testModel = this.factory.getInstance(MockModel6);

        this.factory.mapToValue(MockModel6, this.testModel);

        this.addModel(this.testModel);
    }
}