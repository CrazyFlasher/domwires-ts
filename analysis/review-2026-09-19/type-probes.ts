// These intentionally invalid calls should be rejected by a strictly typed API.
// T01 is a positive control: it is rejected. The remaining invalid operations
// compile in 2.1.0. This file must never be executed.
import {MessageDispatcher, MessageType, Factory, AbstractCommand, CommandMapper} from '../../src';

declare const event: MessageType<{id: number}>;
const dispatcher = new MessageDispatcher();

// T01: wrong data shape.
// @ts-expect-error This direct literal is correctly rejected by the current API.
dispatcher.dispatchMessage(event, {unrelated: true});
// T02: missing required data.
dispatcher.dispatchMessage(event);
// T03: incompatible listener annotation.
dispatcher.addMessageListener(event, (_message, data?: {id: string}) => data?.id.toUpperCase());
// T04: incompatible message token assignment.
const other: MessageType<{name: string}> = event;
void other;
// T05: mapping payload is unrelated to the message contract.
declare const mapper: CommandMapper;
class Command extends AbstractCommand {}
mapper.map(event, Command, {wrong: true});
// T06: string service identifier carries no type information.
const factory = new Factory();
factory.mapToValue('count', 123);
const text: string = factory.getInstance<string>('count');
void text;
// T07: native async execute is accepted although the mapper does not await it.
class NativeAsync extends AbstractCommand { public override async execute(): Promise<void> {} }
void NativeAsync;
// T08: an explicit generic bypasses the event payload contract without a cast.
dispatcher.dispatchMessage<{unrelated: boolean}>(event, {unrelated: true});
