import "reflect-metadata";
import {Suite} from "mocha";
import {AbstractHierarchyObject, Enum, HierarchyObjectContainer, IMessage, logger} from "../src";

describe('GenericTypesTest', function (this: Suite)
{
    it('testBubbledMessagesWithDifferentDataTypes', () =>
    {
        const h1 = new H1();
        const hc1 = new HC1();

        hc1.addMessageListener(MessageType.TEST, ((message:IMessage) =>
        {
            logger.info(message.data);
        }));

        hc1.add(h1);
    });
});

class MessageType extends Enum
{
    public static readonly TEST: MessageType = new MessageType("TEST");
}

type DT1 = {
    readonly s: string;
};

type DT2 = {
    readonly n: number;
};

type DT3 = {
    readonly b: boolean;
};

class H1 extends AbstractHierarchyObject
{
    protected override addedToHierarchy(): void
    {
        super.addedToHierarchy();

        this.dispatchMessage(MessageType.TEST, {s: "str"});
    }
}

class HC1 extends HierarchyObjectContainer
{

}
