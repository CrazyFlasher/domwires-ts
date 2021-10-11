import {AbstractMediator} from "../../src/com/domwires/core/mvc/mediator/AbstractMediator";
import {MockMessageType} from "./MockMessageType";
import {postConstruct} from "inversify";
import {logger} from "../../src/com/domwires/core/Global";

export class MockMediator1 extends AbstractMediator
{

}

export class MockMediator2 extends AbstractMediator
{
    dispatch(): void
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

    dispatch(): void
    {
        this.dispatchMessage(MockMessageType.HELLO);
    }

}

export class MockMediator4 extends AbstractMediator
{
    static val: number = 0;

    @postConstruct()
    private init(): void
    {
        this.addMessageListener(MockMessageType.SHALOM, this.onShalom);
    }

    private onShalom()
    {
        MockMediator4.val++;
    }
}