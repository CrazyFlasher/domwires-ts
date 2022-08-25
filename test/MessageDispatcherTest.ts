/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */

import "reflect-metadata";
import {Suite} from "mocha";
import {expect} from "chai";
import {Enum, IMessageDispatcher, IMessageDispatcherImmutable, MessageDispatcher} from "../src";
import {MockMessageDataType1, MockMessageType} from "./mock/MockMessageType";

describe('MessageDispatcherTest', function (this: Suite)
{
    let d: IMessageDispatcher;

    beforeEach(() => d = new MessageDispatcher());
    afterEach(() =>
    {
        if (!d.isDisposed)
        {
            d.dispose();
        }
    });

    it('testDispatchMessage', () =>
    {
        let gotMessage = false;
        let gotMessageType: Enum;
        let gotMessageTarget: IMessageDispatcherImmutable;
        let gotMessageData: MockMessageDataType1 | undefined;

        d.addMessageListener(MockMessageType.HELLO, (m?, data?) =>
        {
            gotMessage = true;
            if (m)
            {
                gotMessageType = m.type;
                gotMessageTarget = m.initialTarget;
            }
            gotMessageData = data;

            expect(gotMessage).true;
            expect(gotMessageType).equals(MockMessageType.HELLO);
            expect(gotMessageTarget).equals(d);
            expect(gotMessageData && gotMessageData.prop).equals("prop1");
        });

        d.dispatchMessage(MockMessageType.HELLO, {prop: "prop1"});
    });

    it('testAddMessageListener', () =>
    {
        expect(d.hasMessageListener(MockMessageType.HELLO)).false;

        d.addMessageListener(MockMessageType.HELLO, () =>
        {
        });

        expect(d.hasMessageListener(MockMessageType.HELLO)).true;
    });

    it('testRemoveAllMessages', () =>
    {
        const listener: () => void = () =>
        {
        };

        d.addMessageListener(MockMessageType.HELLO, listener);
        d.addMessageListener(MockMessageType.SHALOM, listener);
        expect(d.hasMessageListener(MockMessageType.HELLO)).true;
        expect(d.hasMessageListener(MockMessageType.SHALOM)).true;

        d.removeAllMessageListeners();
        expect(d.hasMessageListener(MockMessageType.HELLO)).false;
        expect(d.hasMessageListener(MockMessageType.SHALOM)).false;
    });

    it('testRemoveMessageListener', () =>
    {
        expect(d.hasMessageListener(MockMessageType.HELLO)).false;

        const listener: () => void = () =>
        {
        };

        d.addMessageListener(MockMessageType.HELLO, listener);
        expect(d.hasMessageListener(MockMessageType.HELLO)).true;
        expect(d.hasMessageListener(MockMessageType.GOODBYE)).false;

        d.addMessageListener(MockMessageType.GOODBYE, listener);
        d.removeMessageListener(MockMessageType.HELLO, listener);
        expect(d.hasMessageListener(MockMessageType.HELLO)).false;
        expect(d.hasMessageListener(MockMessageType.GOODBYE)).true;

        d.removeMessageListener(MockMessageType.GOODBYE, listener);
        expect(d.hasMessageListener(MockMessageType.GOODBYE)).false;
    });

    it('testDispose', () =>
    {
        d.addMessageListener(MockMessageType.HELLO, () =>
        {
        });

        d.addMessageListener(MockMessageType.GOODBYE, () =>
        {
        });

        d.addMessageListener(MockMessageType.SHALOM, () =>
        {
        });

        d.dispose();

        expect(d.hasMessageListener(MockMessageType.HELLO)).false;
        expect(d.hasMessageListener(MockMessageType.GOODBYE)).false;
        expect(d.hasMessageListener(MockMessageType.SHALOM)).false;

        expect(d.isDisposed).true;
    });

    it('testHasMessageListener', () =>
    {
        const listener: () => void = () =>
        {
        };

        d.addMessageListener(MockMessageType.HELLO, listener);
        expect(d.hasMessageListener(MockMessageType.HELLO)).true;
    });

    it('testEveryBodyReceivedMessage', () =>
    {
        let a!: boolean;
        let b!: boolean;

        const listener1: () => void = () => a = true;
        const listener2: () => void = () => b = true;

        d.addMessageListener(MockMessageType.HELLO, listener1);
        d.addMessageListener(MockMessageType.HELLO, listener2);

        d.dispatchMessage(MockMessageType.HELLO);

        expect(a).true;
        expect(b).true;
    });

    it('testPriority_1', () =>
    {
        let x = 0;

        const listener1: () => void = () => x += 1;
        const listener2: () => void = () => x *= 2;

        d.addMessageListener(MockMessageType.HELLO, listener1, 0);
        d.addMessageListener(MockMessageType.HELLO, listener2, 1);

        d.dispatchMessage(MockMessageType.HELLO);

        expect(x).equals(1);
    });

    it('testPriority_2', () =>
    {
        let x = 0;

        const listener1: () => void = () => x += 1;
        const listener2: () => void = () => x *= 2;

        d.addMessageListener(MockMessageType.HELLO, listener1, 1);
        d.addMessageListener(MockMessageType.HELLO, listener2, 0);

        d.dispatchMessage(MockMessageType.HELLO);

        expect(x).equals(2);
    });

    // Expecting no errors
    it('testCallBackWithoutMessageArgument', () =>
    {
        d.addMessageListener(MockMessageType.HELLO, () =>
        {
        });
        d.dispatchMessage(MockMessageType.HELLO);
    });
});