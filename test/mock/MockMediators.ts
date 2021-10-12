import {AbstractMediator} from "../../src/com/domwires/core/mvc/mediator/AbstractMediator";
import {MockMessageType} from "./MockMessageType";
import {postConstruct} from "inversify";

export class MockMediator1 extends AbstractMediator
{

}

export class MockMediator2 extends AbstractMediator
{
    public dispatch(): void
    {
        this.dispatchMessage(MockMessageType.HELLO);
    }
}

export class MockMediator3 extends AbstractMediator
{
    @postConstruct()
    private init(): void
    {
        this.addMessageListener(MockMessageType.GOODBYE, this.onBoga);
    }

    private onBoga()
    {
        this.dispatchMessage(MockMessageType.SHALOM);
    }

    public dispatch(): void
    {
        this.dispatchMessage(MockMessageType.HELLO);
    }

}

export class MockMediator4 extends AbstractMediator
{
    public static val = 0;

    @postConstruct()
    private init(): void
    {
        this.addMessageListener(MockMessageType.SHALOM, MockMediator4.onShalom);
    }

    private static onShalom()
    {
        MockMediator4.val++;
    }
}