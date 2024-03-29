/* eslint-disable @typescript-eslint/no-explicit-any */

import {MockMessageType} from "./MockMessageType";
import {postConstruct} from "inversify";
import {AbstractHierarchyObject} from "../../src";

export class MockMediator1 extends AbstractHierarchyObject
{

}

export class MockMediator2 extends AbstractHierarchyObject
{
    public dispatch(): void
    {
        this.dispatchMessage(MockMessageType.HELLO);
    }
}

export class MockMediator3 extends AbstractHierarchyObject
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

export class MockMediator4 extends AbstractHierarchyObject
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