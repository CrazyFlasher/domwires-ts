import assert from "node:assert/strict";
import {
    AbstractCommand, AbstractContext, AbstractGuards, AbstractHierarchyObject, CommandCancelledError,
    CommandConcurrency, CommandExecution, CommandMapper, CommandTraceEvent, Factory,
    Message, MessageDispatcher, MessageType, inject, postConstruct, optional, named
} from "../src";

class Context extends AbstractContext {}
function deferred() {
    let resolve!: () => void, reject!: (error: unknown) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
}
function setup() {
    const factory = new Factory();
    factory.mapToValue("IFactory", factory);
    return {factory, mapper: factory.getInstance(CommandMapper)};
}
const origin = new MessageDispatcher();
const REQUEST = new MessageType<{id: number}>("request");
const route = (mapper: CommandMapper, id: number) => mapper.route(new Message(REQUEST, origin, {id}));
async function ticks() { for (let i = 0; i < 20; i++) await Promise.resolve(); }

describe("Command policies and trace", () => {
    it("restores optional property defaults when retained commands are reinjected without a value", async () => {
        const {mapper} = setup(), seen: string[] = [];
        class Work extends AbstractCommand {
            @inject("string") @named("name") @optional() public name = "default";
            public override execute() { seen.push(this.name); }
        }
        await mapper.execute(Work, {name: "first"}, {lifetime: "context"});
        await mapper.execute(Work, {}, {lifetime: "context"});
        assert.deepEqual(seen, ["first", "default"]);
    });

    it("observes asynchronous trace failures without failing the command", async () => {
        const {mapper} = setup();
        class Work extends AbstractCommand {}
        mapper.trace = async () => { throw new Error("async observer"); };
        await mapper.execute(Work); await ticks(); await mapper.settle();
        assert.equal(mapper.traceErrorCount, 2);
    });

    it("traces cancellation of queued work which never started", async () => {
        const {mapper} = setup(), gate = deferred(), events: CommandTraceEvent[] = [];
        class Work extends AbstractCommand { public override async execute() { await gate.promise; } }
        mapper.trace = event => { events.push(event); };
        const mapping = mapper.map(REQUEST, Work, {concurrency: "serial"});
        const runs = [route(mapper, 0), route(mapper, 1)]; mapping.dispose(); gate.resolve();
        await Promise.allSettled(runs);
        assert.equal(events.filter(event => event.phase === "cancelled").length, 2);
        assert.equal(events.filter(event => event.phase === "started").length, 1);
    });
    for (const policy of ["parallel", "serial", "latest", "drop"] as const) {
        it(policy + " preserves its execution and commit order", async () => {
            const {factory, mapper} = setup(), gates = [deferred(), deferred(), deferred()];
            const started: number[] = [], committed: number[] = [], signals: AbortSignal[] = [];
            class Work extends AbstractCommand<{id: number}> {
                public override async execute(input: {id: number}, execution: CommandExecution) {
                    started.push(input.id); signals.push(execution.signal);
                    await gates[input.id]!.promise;
                    execution.commit(() => committed.push(input.id));
                }
            }
            mapper.map(REQUEST, Work, {concurrency: policy});
            const runs = [route(mapper, 0), route(mapper, 1), route(mapper, 2)];
            assert.deepEqual(started, policy === "serial" || policy === "drop" ? [0] : [0, 1, 2]);
            if (policy === "latest") assert.deepEqual(signals.map(signal => signal.aborted), [true, true, false]);
            gates[2]!.resolve(); gates[1]!.resolve(); await ticks(); gates[0]!.resolve();
            const results = await Promise.allSettled(runs);
            await mapper.settle();
            assert.deepEqual(committed, policy === "parallel" ? [2, 1, 0] : policy === "serial" ? [0, 1, 2] : policy === "latest" ? [2] : [0]);
            assert.equal(results.filter(result => result.status === "rejected").length, policy === "latest" ? 2 : 0);
            assert.equal(mapper.pendingCount, 0);
            mapper.dispose(); factory.dispose();
        });
    }

    it("uses separate queues for separate mappings, even to the same class", async () => {
        const {mapper} = setup(), gates = [deferred(), deferred()], seen: number[] = [];
        class Work extends AbstractCommand<{id: number}> {
            public override async execute(input: {id: number}) { seen.push(input.id); await gates[input.id]!.promise; }
        }
        const other = new MessageType<{id: number}>("other");
        mapper.map(REQUEST, Work, {concurrency: "serial"}); mapper.map(other, Work, {concurrency: "serial"});
        const a = route(mapper, 0), b = mapper.route(new Message(other, origin, {id: 1}));
        assert.deepEqual(seen, [0, 1]); gates.forEach(gate => gate.resolve()); await Promise.all([a, b]);
    });

    it("continues a serial queue after an error and retains that error for settle", async () => {
        const {mapper} = setup(), gate = deferred(), seen: number[] = [];
        class Work extends AbstractCommand<{id: number}> {
            public override async execute(input: {id: number}) {
                seen.push(input.id); if (!input.id) { await gate.promise; throw new Error("failed first"); }
            }
        }
        mapper.map(REQUEST, Work, {concurrency: "serial"});
        const a = route(mapper, 0), b = route(mapper, 1); gate.resolve();
        await assert.rejects(a, /failed first/); await b;
        assert.deepEqual(seen, [0, 1]); await assert.rejects(mapper.settle(), AggregateError);
    });

    for (const removal of ["dispose", "unmap", "close"] as const) {
        it(removal + " cancels running and queued work", async () => {
            const {mapper} = setup(), gate = deferred(), seen: number[] = [];
            class Work extends AbstractCommand<{id: number}> {
                public override async execute(input: {id: number}, execution: CommandExecution) {
                    seen.push(input.id); await gate.promise; execution.commit(() => seen.push(99));
                }
            }
            const mapping = mapper.map(REQUEST, Work, {concurrency: "serial"});
            const runs = [route(mapper, 0), route(mapper, 1)];
            if (removal === "dispose") mapping.dispose();
            else if (removal === "unmap") mapper.unmap(REQUEST, Work);
            else mapper.dispose();
            gate.resolve();
            const results = await Promise.allSettled(runs);
            assert(results.every(result => result.status === "rejected" && result.reason instanceof CommandCancelledError));
            assert.deepEqual(seen, [0]); await mapper.settle(); assert.equal(mapper.pendingCount, 0);
        });
    }

    it("reserves once before reentry and never cancels its own reserved command", async () => {
        const {mapper} = setup(), gate = deferred(); let calls = 0;
        class Work extends AbstractCommand<{id: number}> {
            public override async execute(_input: {id: number}, execution: CommandExecution) {
                calls++; void route(mapper, 1); await gate.promise; execution.throwIfCancelled();
            }
        }
        mapper.map(REQUEST, Work, {concurrency: "serial", once: true});
        const run = route(mapper, 0); assert.equal(mapper.hasMapping(REQUEST), false);
        gate.resolve(); await run; await mapper.settle(); assert.equal(calls, 1);
    });

    it("guard rejection does not consume once or stop the next mapping", async () => {
        const {mapper} = setup(); let called = 0;
        class Deny extends AbstractGuards { public override get allows() { return false; } }
        class Work extends AbstractCommand { public override execute() { called++; } }
        const mapping = mapper.map(REQUEST, Work, {guards: [Deny], once: true, stopOnExecute: true, concurrency: "serial"});
        mapper.map(REQUEST, Work);
        await route(mapper, 0); assert.equal(called, 1); assert.equal(mapping.isDisposed, false);
    });

    it("drop affects only its mapping, so a following mapping still runs", async () => {
        const {mapper} = setup(), gate = deferred(); let following = 0;
        class Slow extends AbstractCommand { public override async execute() { await gate.promise; } }
        class Next extends AbstractCommand { public override execute() { following++; } }
        mapper.map(REQUEST, Slow, {concurrency: "drop", stopOnExecute: true}); mapper.map(REQUEST, Next);
        const a = route(mapper, 0); await route(mapper, 1); assert.equal(following, 1);
        gate.resolve(); await a; assert.equal(following, 1);
    });

    it("supports an external AbortSignal without turning normal cancellation into a settle error", async () => {
        const {mapper} = setup(), gate = deferred(), controller = new AbortController(); let committed = false;
        class Work extends AbstractCommand {
            public override async execute(_input: unknown, execution: CommandExecution) {
                await gate.promise; execution.commit(() => { committed = true; });
            }
        }
        const run = mapper.execute(Work, undefined, {signal: controller.signal});
        controller.abort("navigation"); gate.resolve();
        await assert.rejects(run, CommandCancelledError); await mapper.settle(); assert.equal(committed, false);
        await assert.rejects(mapper.execute(Work, undefined, {signal: controller.signal}), CommandCancelledError);
    });

    it("preserves an actual error and a cleanup error during cancellation", async () => {
        const {mapper} = setup(), gate = deferred();
        class Work extends AbstractCommand {
            public override async execute() { await gate.promise; throw new Error("real failure"); }
            public dispose() { throw new Error("cleanup failure"); }
        }
        const run = mapper.execute(Work); mapper.dispose(); gate.resolve();
        await assert.rejects(run, error => error instanceof AggregateError &&
            error.errors.map((value: Error) => value.message).join(",") === "real failure,cleanup failure");
        await assert.rejects(mapper.settle(), AggregateError);
    });

    it("retains only commands explicitly given context lifetime", async () => {
        const {mapper} = setup(); let created = 0, disposed = 0;
        class Work extends AbstractCommand { public constructor() { super(); created++; } public dispose() { disposed++; } }
        await mapper.execute(Work); await mapper.execute(Work);
        await mapper.execute(Work, undefined, {lifetime: "context"}); await mapper.execute(Work, undefined, {lifetime: "context"});
        assert.equal(created, 3); assert.equal(disposed, 2); mapper.dispose(); assert.equal(disposed, 3);
        assert.throws(() => setup().mapper.map(REQUEST, Work, {lifetime: "context", concurrency: "latest"}), /requires execution/);
    });

    it("serial works with retained commands and drains synchronous queued work without recursion", async () => {
        const {mapper} = setup(), gate = deferred(); let created = 0, count = 0;
        class Work extends AbstractCommand<{id: number}> {
            public constructor() { super(); created++; }
            public override execute(input: {id: number}): void | Promise<void> {
                count++; if (!input.id) return gate.promise;
            }
        }
        mapper.map(REQUEST, Work, {concurrency: "serial", lifetime: "context"});
        const runs = Array.from({length: 3000}, (_, id) => route(mapper, id));
        gate.resolve(); await Promise.all(runs); assert.equal(count, 3000); assert.equal(created, 1);
    });

    it("latest survives a new request dispatched by an abort listener", async () => {
        const {mapper} = setup(), gate = deferred(), seen: number[] = [];
        class Work extends AbstractCommand<{id: number}> {
            public override async execute(input: {id: number}, execution: CommandExecution) {
                seen.push(input.id);
                if (!input.id) execution.signal.addEventListener("abort", () => { void route(mapper, 2); }, {once: true});
                await gate.promise; execution.throwIfCancelled();
            }
        }
        mapper.map(REQUEST, Work, {concurrency: "latest"});
        const a = route(mapper, 0), b = route(mapper, 1); gate.resolve();
        await Promise.allSettled([a, b]); await mapper.settle(); assert.deepEqual(seen, [0, 2]);
    });

    it("traces message, guard, start and result with stable correlation ids", async () => {
        const {mapper} = setup(), events: CommandTraceEvent[] = [];
        class Allow extends AbstractGuards { public override get allows() { return true; } }
        class Work extends AbstractCommand {}
        mapper.trace = event => { events.push(event); };
        const mapping = mapper.map(REQUEST, Work, {guards: [Allow]});
        await route(mapper, 0);
        assert.deepEqual(events.map(event => event.phase), ["message", "guard", "started", "completed"]);
        assert(events.every(event => event.mapperId === mapper.mapperId && event.messageId === events[0]!.messageId));
        assert(events.slice(1).every(event => event.mappingId === mapping.id && event.executionId === events[1]!.executionId));
        assert(events[3]!.durationMs! >= 0); assert(!("data" in events[0]!));
    });

    it("traces queued, skipped, failed and cancelled outcomes", async () => {
        for (const concurrency of ["serial", "drop", "latest"] as CommandConcurrency[]) {
            const {mapper} = setup(), gate = deferred(), events: CommandTraceEvent[] = [];
            class Work extends AbstractCommand { public override async execute() { await gate.promise; } }
            mapper.trace = event => { events.push(event); }; mapper.map(REQUEST, Work, {concurrency});
            const runs = [route(mapper, 0), route(mapper, 1)]; gate.resolve(); await Promise.allSettled(runs);
            assert(events.some(event => event.phase === (concurrency === "serial" ? "queued" : concurrency === "drop" ? "skipped" : "cancelled")));
        }
        const {mapper} = setup(), events: CommandTraceEvent[] = [];
        class Fail extends AbstractCommand { public override execute(): void { throw new Error("trace failure"); } }
        mapper.trace = event => { events.push(event); }; await assert.rejects(mapper.execute(Fail));
        assert.equal(events.at(-1)!.phase, "failed");
    });

    it("isolates trace callback failures and observes cancellation from a trace callback", async () => {
        const {mapper} = setup(); let calls = 0;
        class Work extends AbstractCommand { public override execute() { calls++; } }
        mapper.trace = () => { throw new Error("observer"); };
        await mapper.execute(Work); assert.equal(calls, 1); assert.equal(mapper.traceErrorCount, 2);
        mapper.trace = event => { if (event.phase === "started") mapper.dispose(); };
        await assert.rejects(mapper.execute(Work), CommandCancelledError); assert.equal(calls, 1);
    });
});

describe("Initialization and dispatch teardown", () => {
    it("disposes partially initialized contexts, models and dependencies after a hook failure", async () => {
        const factory = new Factory(); let closed = 0, child!: AbstractHierarchyObject;
        class Broken extends AbstractContext {
            protected override init() {
                super.init(); this.defer(() => { closed++; }); child = new class extends AbstractHierarchyObject {};
                this.addModel(child); throw new Error("setup");
            }
        }
        assert.throws(() => factory.getInstance(Broken), /setup/);
        await ticks(); assert.equal(closed, 1); assert.equal(child.isDisposed, true);
        class Missing {
            @inject("not present") public dependency!: unknown;
            public dispose() { closed++; }
        }
        assert.throws(() => factory.getInstance(Missing), /no binding/); assert.equal(closed, 2);
        class BadHook {
            @postConstruct() public initialize() { throw new Error("hook"); }
            public dispose() { throw new Error("cleanup"); }
        }
        assert.throws(() => factory.getInstance(BadHook), AggregateError);
    });

    it("disposes a child or mediator rejected during attachment", async () => {
        const factory = new Factory(), parent = factory.getInstance(Context); let closed = 0;
        class Child extends AbstractContext {
            protected override init() { super.init(); this.defer(() => { closed++; }); }
        }
        parent.createContext(Child, {id: "same"});
        assert.throws(() => parent.createContext(Child, {id: "same"}));
        assert.equal(closed, 1);
        class Mediator extends AbstractHierarchyObject { public override dispose() { closed++; super.dispose(); } }
        parent.createMediator(Mediator, "same");
        assert.throws(() => parent.createMediator(Mediator, "same")); assert.equal(closed, 2);
        await parent.close(); assert.equal(closed, 4);
    });

    it("closes the whole context when asynchronous startup fails", async () => {
        const context = new Factory().getInstance(Context), child = new class extends AbstractHierarchyObject {};
        context.addModel(child);
        context.own({start: () => Promise.reject(new Error("startup")), close: () => undefined});
        await assert.rejects(context.start()); assert.equal(context.isDisposed, true); assert.equal(child.isDisposed, true);
    });

    for (const source of ["listener", "command"] as const) {
        it("can dispose a context from its " + source + " during message delivery", async () => {
            const context = new Factory().getInstance(Context); let called = 0;
            class Close extends AbstractCommand { public override execute() { context.dispose(); } }
            class Next extends AbstractCommand { public override execute() { called++; } }
            if (source === "listener") context.subscribe(REQUEST, () => context.dispose());
            else context.map(REQUEST, Close);
            context.map(REQUEST, Next);
            assert.doesNotThrow(() => context.dispatchMessage(REQUEST, {id: 1}));
            await context.close(); assert.equal(called, 0);
        });
    }
});
