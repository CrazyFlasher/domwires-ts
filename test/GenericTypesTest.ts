/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import "reflect-metadata";
import {Suite} from "mocha";
import {Enum, HierarchyObjectContainer, MessageDispatcher} from "../src";
import {expect} from "chai";

describe('GenericTypesTest', function (this: Suite)
{
    it('testMessageWithStrictTypedData', () =>
    {
        const md = new MessageDispatcher();

        md.addMessageListener(MessageType.A, (message, data) =>
        {
            expect(data.n).equals(123);
        });

        md.addMessageListener(MessageType.B, (message, data) =>
        {
            expect(data.s).equals("asd");
        });

        md.addMessageListener(MessageType.C, (message, data) =>
        {
            expect(data.o.value[1]).equals(2);
        });

        md.addMessageListener(MessageType.D, (message, data) =>
        {
            expect(data).equals("some text");
        });

        md.addMessageListener(MessageType.E, (message) =>
        {
            expect(message.type).equals(MessageType.E);
        });

        md.dispatchMessage(MessageType.A, {n: 123});
        md.dispatchMessage(MessageType.B, {s: "asd"});
        md.dispatchMessage(MessageType.C, {o: {value: [1, 2, 3]}});
        md.dispatchMessage(MessageType.D, "some text");
    });

    it('testBubbledMessagesWithDifferentDataTypes', () =>
    {
        const ho_1 = new HierarchyObjectContainer();
        const ho_2 = new HierarchyObjectContainer();
        const ho_3 = new HierarchyObjectContainer();

        ho_1.add(ho_2);
        ho_2.add(ho_3);

        ho_1.addMessageListener(MessageType.A, (message, data) =>
        {
            expect(data.n).equals(123);
        });

        ho_3.dispatchMessage(MessageType.A, {n: 123});
    });
});

type Type_1 = { readonly n: number };
type Type_2 = { readonly s: string };
type Type_3 = { readonly o: any };

class MessageType<T = void> extends Enum
{
    // TODO: Weird shit 1: no error if doing this way (note: Type_1 and Type_2):
    // public static readonly A: MessageType<Type_1> = new MessageType<Type_2>("A");

    // TODO: Weird shit 2: error if doing this way (note: MessageType and MessageType):
    // public static readonly A: MessageType<Type_1> = new MessageType<Type_2>("A");

    public static readonly A: Enum<Type_1> = new MessageType<Type_1>();
    public static readonly B: Enum<Type_2> = new MessageType<Type_2>();
    public static readonly C: Enum<Type_3> = new MessageType<Type_3>();
    public static readonly D: Enum<string> = new MessageType<string>();
    public static readonly E: MessageType = new MessageType();
}
