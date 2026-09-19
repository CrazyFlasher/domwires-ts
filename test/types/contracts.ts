import {
    AbstractCommand, AbstractContext, CommandExecution, CommandMapper, Factory,
    MessageDispatcher, MessageType, ServiceToken
} from "../../src";

/** Compiled by npm test; deliberately never executed. */
export function typeContracts(context: AbstractContext, mapper: CommandMapper): void
{
    const message = new MessageType<{id: number}>("typed");
    const dispatcher = new MessageDispatcher();
    dispatcher.dispatchMessage(message, {id: 1});
    // @ts-expect-error Required payload cannot be omitted.
    dispatcher.dispatchMessage(message);
    // @ts-expect-error Payload is tied to the token.
    dispatcher.dispatchMessage(message, {id: "wrong"});
    // @ts-expect-error Explicit generics cannot change a token's payload contract.
    dispatcher.dispatchMessage<{other: boolean}>(message, {other: true});
    // @ts-expect-error A listener must accept the token's payload.
    dispatcher.addMessageListener(message, (_message, data: {id: string}) => data.id);
    // @ts-expect-error Tokens with different payloads are incompatible.
    const other: MessageType<{name: string}> = message;
    void other;

    class Good extends AbstractCommand<{id: number}> {
        public override execute(input: {id: number}, execution: CommandExecution): void { execution.commit(() => void input.id); }
    }
    class Wrong extends AbstractCommand<{name: string}> {
        public override execute(input: {name: string}): void { void input.name; }
    }
    context.map(message, Good, {data: {id: 3}, once: true});
    // @ts-expect-error Command input is incompatible with message payload.
    context.map(message, Wrong);
    // @ts-expect-error Batch registration enforces the same payload contract.
    context.map([message], [Good, Wrong]);
    // @ts-expect-error No legacy positional flags on map.
    context.map(message, Good, undefined, true);
    // @ts-expect-error Aliases were removed from the unified API.
    context.mapCommand(message, Good);
    // @ts-expect-error Mapping data must match this message's payload.
    mapper.map(message, Good, {data: {wrong: true}});
    mapper.execute(Good, {id: 3});
    // @ts-expect-error Required command input.
    mapper.execute(Good);
    // @ts-expect-error Wrong command input.
    context.execute(Good, {id: "wrong"});
    // @ts-expect-error Options are named, not a positional guards array.
    mapper.execute(Good, {id: 1}, []);
    // @ts-expect-error Unsupported scheduling policy.
    mapper.map(message, Good, {concurrency: "queue"});

    const factory = new Factory(), count = new ServiceToken<number>("count");
    factory.mapToValue(count, 3);
    const value: number = factory.getInstance(count);
    void value;
    // @ts-expect-error Typed token does not accept a string.
    factory.mapToValue(count, "wrong");
    // @ts-expect-error Provider result must satisfy the token.
    factory.mapToProvider(count, () => "wrong");
    // @ts-expect-error Resolution infers number from the token.
    const text: string = factory.getInstance(count);
    void text;
    const reader = new ServiceToken<{readonly value: number}>("Immutable");
    // @ts-expect-error The immutable interface exposes no property mutation.
    factory.getInstance(reader).value = 3;
}
