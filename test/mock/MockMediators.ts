/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractMediator} from "../../src";
import {MockMessageType} from "./MockMessageType";
import {postConstruct} from "inversify";

export class MockMediator1<MessageDataType = any> extends AbstractMediator<MessageDataType>
{

}

export class MockMediator2<MessageDataType = any> extends AbstractMediator<MessageDataType>
{
    public dispatch(): void
    {
        this.dispatchMessage(MockMessageType.HELLO);
    }
}

export class MockMediator3<MessageDataType = any> extends AbstractMediator<MessageDataType>
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

export class MockMediator4<MessageDataType = any> extends AbstractMediator<MessageDataType>
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