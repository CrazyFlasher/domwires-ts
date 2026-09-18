/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {Suite} from "mocha";
import {expect} from "chai";
import {
    AbstractCommand,
    AbstractContext,
    AbstractDisposable,
    AbstractHierarchyObject,
    ContextConfigBuilder,
    Factory,
    HierarchyObjectContainer,
    MessageDispatcher,
    MessageType
} from "../src";

class TestMessageType extends MessageType
{
    public static readonly HELLO: TestMessageType = new TestMessageType("HELLO");
    public static readonly OTHER: TestMessageType = new TestMessageType("OTHER");
}

class TestObject extends AbstractHierarchyObject
{
}

class TestContext extends AbstractContext
{
}

describe('BugfixTest', function (this: Suite)
{
    describe('hierarchy', () =>
    {
        it('testRemoveAllDetachesChildrenWithId', () =>
        {
            const container = new HierarchyObjectContainer();
            const plain = new TestObject();
            const withId = new TestObject();

            container.add(plain);
            container.add(withId, "id");

            expect(container.numChildren).equals(2);

            container.removeAll();

            expect(container.numChildren).equals(0);
            expect(plain.parent).equals(undefined);
            // a child with an id is stored in a separate map, it should be detached as well
            expect(withId.parent).equals(undefined);
        });

        it('testRemoveAllDisposesChildrenWithId', () =>
        {
            const container = new HierarchyObjectContainer();
            const plain = new TestObject();
            const withId = new TestObject();

            container.add(plain);
            container.add(withId, "id");
            container.removeAll(true);

            expect(plain.isDisposed).true;
            expect(withId.isDisposed).true;
        });

        it('testNestedContainerReceivesMessage', () =>
        {
            const factory = new Factory();
            factory.mapToValue("IFactory", factory);

            const config = new ContextConfigBuilder();
            config.forwardMessageFromMediatorsToModels = true;
            factory.mapToValue("ContextConfig", config.build());

            const context: TestContext = factory.getInstance<TestContext>(TestContext);
            const modelContainer = new HierarchyObjectContainer();
            const nestedModel = new TestObject();
            const mediator = new TestObject();

            modelContainer.add(nestedModel);
            context.addModel(modelContainer);
            context.addMediator(mediator);

            const received: string[] = [];

            modelContainer.addMessageListener(TestMessageType.HELLO, () => received.push("container"));
            nestedModel.addMessageListener(TestMessageType.HELLO, () => received.push("nested"));

            mediator.dispatchMessage(TestMessageType.HELLO);

            expect(received).eql(["container", "nested"]);
        });

        it('testMessageOfNestedModelIsForwardedToMediator', () =>
        {
            const factory = new Factory();
            factory.mapToValue("IFactory", factory);

            const context: TestContext = factory.getInstance<TestContext>(TestContext);
            const modelContainer = new HierarchyObjectContainer();
            const nestedModel = new TestObject();
            const mediator = new TestObject();

            modelContainer.add(nestedModel);
            context.addModel(modelContainer);
            context.addMediator(mediator);

            let mediatorReceived = false;

            mediator.addMessageListener(TestMessageType.HELLO, () => mediatorReceived = true);

            nestedModel.dispatchMessage(TestMessageType.HELLO);

            expect(mediatorReceived).true;
        });
    });

    describe('messages', () =>
    {
        it('testAllOnceListenersAreCalledAndRemoved', () =>
        {
            const dispatcher = new MessageDispatcher();
            let result = 0;

            dispatcher.addMessageListener(TestMessageType.HELLO, () => result += 1, true);
            dispatcher.addMessageListener(TestMessageType.HELLO, () => result += 10, true);

            dispatcher.dispatchMessage(TestMessageType.HELLO);

            expect(result).equals(11);
            expect(dispatcher.hasMessageListener(TestMessageType.HELLO)).false;
        });

        it('testRemovedListenerDoesNotBreakTheRest', () =>
        {
            const dispatcher = new MessageDispatcher();
            const called: string[] = [];

            const second = (): void =>
            {
                called.push("second");
            };

            dispatcher.addMessageListener(TestMessageType.HELLO, () =>
            {
                called.push("first");
                dispatcher.removeMessageListener(TestMessageType.HELLO, second);
            }, false, 10);
            dispatcher.addMessageListener(TestMessageType.HELLO, second, false, 5);
            dispatcher.addMessageListener(TestMessageType.HELLO, () => called.push("third"), false, 1);

            dispatcher.dispatchMessage(TestMessageType.HELLO);

            expect(called).eql(["first", "third"]);
        });

        it('testNestedDispatchDoesNotCorruptMessage', () =>
        {
            const dispatcher = new MessageDispatcher();
            const types: string[] = [];

            dispatcher.addMessageListener(TestMessageType.HELLO, () =>
            {
                dispatcher.dispatchMessage(TestMessageType.OTHER);
            }, false, 10);

            dispatcher.addMessageListener(TestMessageType.HELLO, (message) =>
            {
                types.push(String(message && message.type));
            }, false, 1);

            dispatcher.dispatchMessage(TestMessageType.HELLO);

            expect(types).eql(["HELLO"]);
        });

        it('testBubblingStateIsResetAfterError', () =>
        {
            const parent = new HierarchyObjectContainer();
            const child = new TestObject();

            parent.add(child);
            parent.addMessageListener(TestMessageType.HELLO, () =>
            {
                throw new Error("boom");
            });

            expect(() => child.dispatchMessage(TestMessageType.HELLO)).to.throw("boom");
            expect(Reflect.get(child, "isBubbling")).false;
        });
    });

    describe('pool', () =>
    {
        class PooledObject extends AbstractDisposable
        {
            public isBusy = false;
        }

        it('testAllBusyItemsDoNotLeadToInfiniteRecursion', () =>
        {
            const factory = new Factory();

            factory.mapToType(PooledObject, PooledObject);
            factory.registerPool(PooledObject, 1, true, "isBusy");

            const instance: PooledObject = factory.getInstance<PooledObject>(PooledObject);

            instance.isBusy = true;
            factory.setSafePool(false);

            expect(() => factory.getInstance<PooledObject>(PooledObject)).to.throw("are busy");
        });

        it('testPoolIsClearedOnDispose', () =>
        {
            const factory = new Factory();

            factory.mapToType(PooledObject, PooledObject);
            factory.registerPool(PooledObject, 2, true);
            factory.unregisterPool(PooledObject);

            expect(factory.hasPoolForType(PooledObject)).false;
        });
    });

    describe('commands', () =>
    {
        class FailingCommand extends AbstractCommand
        {
            public override execute(): void
            {
                throw new Error("command error");
            }
        }

        class CommandContext extends AbstractContext
        {
            protected override init(): void
            {
                super.init();

                this.map(TestMessageType.HELLO, FailingCommand);
            }
        }

        it('testCommandErrorIsNotLost', async () =>
        {
            const factory = new Factory();
            factory.mapToValue("IFactory", factory);

            const context: CommandContext = factory.getInstance<CommandContext>(CommandContext);

            context.dispatchMessage(TestMessageType.HELLO);

            let error: unknown = undefined;

            await context.settle().catch((e: unknown) =>
            {
                error = e;
            });

            expect(error).instanceof(Error);
        });
    });
});
