/* eslint-disable @typescript-eslint/no-explicit-any */

import "reflect-metadata";
import {Suite} from "mocha";
import {HierarchyObjectContainer, MessageDispatcher, MessageType} from "../src";
import {expect} from "chai";

describe('GenericTypesTest', function (this: Suite)
{
    it('testMessageWithStrictTypedData', () =>
    {
        const md = new MessageDispatcher();

        md.addMessageListener(MesType.A, (message, data) =>
        {
            expect(data.n).equals(123);
        });

        md.addMessageListener(MesType.B, (message, data) =>
        {
            expect(data.s).equals("asd");
        });

        md.addMessageListener(MesType.C, (message, data) =>
        {
            expect(data.o.value[1]).equals(2);
        });

        md.addMessageListener(MesType.D, (message, data) =>
        {
            expect(data).equals("some text");
        });

        md.dispatchMessage(MesType.A, {n: 123});
        md.dispatchMessage(MesType.B, {s: "asd"});
        md.dispatchMessage(MesType.C, {o: {value: [1, 2, 3]}});
        md.dispatchMessage(MesType.D, "some text");
    });

    it('testBubbledMessagesWithDifferentDataTypes', () =>
    {
        const ho_1 = new HierarchyObjectContainer();
        const ho_2 = new HierarchyObjectContainer();
        const ho_3 = new HierarchyObjectContainer();

        ho_1.add(ho_2);
        ho_2.add(ho_3);

        ho_1.addMessageListener(MesType.A, (message, data) =>
        {
            expect(data.n).equals(123);
        });

        ho_3.dispatchMessage(MesType.A, {n: 123});
    });
});

type Type_1 = { readonly n: number };
type Type_2 = { readonly s: string };
type Type_3 = { readonly o: any };

class MesType<T> extends MessageType<T>
{
    // TODO: Weird shit 1: no error if doing this way (note: Type_1 and Type_2):
    // public static readonly A: MessageType<Type_1> = new MesType<Type_2>("A");

    // TODO: Weird shit 2: error if doing this way (note: MesType and MesType):
    // public static readonly A: MesType<Type_1> = new MesType<Type_2>("A");

    public static readonly A: MessageType<Type_1> = new MesType<Type_1>("A");
    public static readonly B: MessageType<Type_2> = new MesType<Type_2>("B");
    public static readonly C: MessageType<Type_3> = new MesType<Type_3>("C");
    public static readonly D: MessageType<string> = new MesType<string>("D");
}
