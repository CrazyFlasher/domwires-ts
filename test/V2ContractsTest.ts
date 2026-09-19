import {Message as RoutedMessage, MessageDispatcher as RouteOrigin} from "../src";
import assert from "node:assert/strict";
import {
    AbstractAsyncCommand, AbstractCommand, AbstractContext, AbstractGuards, AbstractHierarchyObject,
    CommandMapper, DependencyContainer, Factory, HierarchyObjectContainer,
    IMessage, MessageDispatcher, MessageType, ResourceScope, ServiceToken, inject, lazyInject, lazyInjectNamed
} from "../src";
import {RequestContext} from "../examples/scoped/RequestContext";
import {RESULT_MODEL, RESULT_MODEL_IMMUTABLE, RequestAdapter} from "../examples/scoped/contracts";
import {RESULT_CHANGED} from "../examples/scoped/messages";

class Context extends AbstractContext {}
class Child extends AbstractHierarchyObject {}
class Noop extends AbstractCommand {}
class Deny extends AbstractGuards { public override get allows(): boolean { return false; } }
const event = () => new MessageType<void>("event");
function deferred<T = void>()
{
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
}
async function ticks(): Promise<void> { for (let n = 0; n < 12; n++) await Promise.resolve(); }
function setup(singletonCommands = false)
{
    const factory = new Factory();
    factory.mapToValue("IFactory", factory);
    factory.mapToValue("CommandMapperConfig", {defaultLifetime: singletonCommands ? "context" : "execution", defaultDataMode: "merge"});
    return {factory, mapper: factory.getInstance(CommandMapper)};
}
function errors(error: unknown): unknown[]
{
    return error instanceof AggregateError ? error.errors.flatMap(errors) : [error];
}

describe("V2 execution and routing contracts", () => {
    it("isolates nested lazy input and two factories across await (R01, R02)", async () => {
        const a = setup(), b = setup(), gate = deferred(), seen: string[] = [];
        a.factory.mapToValue("service", "A"); b.factory.mapToValue("service", "B");
        class Outer extends AbstractCommand {
            @lazyInjectNamed("string", "id") private id!: string;
            @lazyInject("service") private service!: string;
            public override async execute(): Promise<void> {
                seen.push(this.id, this.service);
                await a.mapper.execute(Noop, {id: "inner"});
                await gate.promise;
                seen.push(this.id, this.service);
            }
        }
        const run = a.mapper.execute(Outer, {id: "outer"});
        await b.mapper.execute(Noop);
        gate.resolve();
        await run;
        assert.deepEqual(seen, ["outer", "A", "outer", "A"]);
    });

    it("allows overlapping callback commands and awaits native async commands (R03, R04)", async () => {
        const {mapper} = setup();
        const callbacks: Array<() => void> = [];
        class Callback extends AbstractAsyncCommand {
            public override execute(): void { callbacks.push(() => this.resolve()); }
        }
        const runs = [mapper.execute(Callback), mapper.execute(Callback)];
        callbacks.forEach(callback => callback());
        await Promise.all(runs);
        const gate = deferred(); let completed = false;
        class Native extends AbstractCommand { public override async execute(): Promise<void> { await gate.promise; completed = true; } }
        const pending = mapper.execute(Native);
        await ticks(); assert.equal(completed, false);
        gate.resolve(); await pending; assert.equal(completed, true);
    });

    it("rejects overlapping explicit singletons without corrupting the running invocation", async () => {
        const {mapper} = setup(true), gate = deferred(), seen: string[] = [];
        class Waiting extends AbstractCommand {
            @lazyInjectNamed("string", "id") private id!: string;
            public override async execute(): Promise<void> { await gate.promise; seen.push(this.id); }
        }
        const running = mapper.execute(Waiting, {id: "first"});
        await assert.rejects(mapper.execute(Waiting, {id: "second"}), /cannot overlap/);
        await assert.rejects(mapper.execute(Waiting, {id: "third"}), /cannot overlap/);
        gate.resolve(); await running;
        assert.deepEqual(seen, ["first"]);
    });

    it("reserves the exact once mapping before recursive dispatch (R05, R06)", async () => {
        const {mapper} = setup(), type = event(), seen: string[] = [];
        class First extends AbstractCommand { public override execute(): void { seen.push("once"); void mapper.route(new RoutedMessage(type, new RouteOrigin())); } }
        class Next extends AbstractCommand { public override execute(): void { seen.push("next"); } }
        mapper.map(type, First).addGuards(Deny);
        mapper.map(type, First, {stopOnExecute: false, once: true});
        mapper.map(type, Next);
        await mapper.route(new RoutedMessage(type, new RouteOrigin()));
        await mapper.settle();
        assert.deepEqual(seen, ["once", "next", "next"]);
    });

    it("disposes mapping handles precisely and applies stop to every batch message (R17)", async () => {
        const {mapper} = setup(), a = event(), b = event(), seen: number[] = [];
        class First extends AbstractCommand { public override execute(): void { seen.push(1); } }
        class Next extends AbstractCommand { public override execute(): void { seen.push(2); } }
        const first = mapper.map([a, b], First, {stopOnExecute: true});
        mapper.map(a, Next); mapper.map(b, Next);
        await mapper.route(new RoutedMessage(a, new RouteOrigin())); await mapper.route(new RoutedMessage(b, new RouteOrigin()));
        assert.deepEqual(seen, [1, 1]);
        first.dispose();
        await mapper.route(new RoutedMessage(a, new RouteOrigin()));
        assert.deepEqual(seen, [1, 1, 2]);
    });

    it("waits for the actual mapped async implementation before its successor (R21)", async () => {
        const {factory, mapper} = setup(), type = event(), gate = deferred(), seen: string[] = [];
        class Base extends AbstractCommand {}
        class AsyncImplementation extends Base { public override async execute(): Promise<void> { await gate.promise; seen.push("async"); } }
        class Next extends AbstractCommand { public override execute(): void { seen.push("next"); } }
        factory.mapToType(Base, AsyncImplementation);
        mapper.map(type, [Base, Next]);
        const run = mapper.route(new RoutedMessage(type, new RouteOrigin()));
        assert.deepEqual(seen, []);
        gate.resolve(); await run;
        assert.deepEqual(seen, ["async", "next"]);
    });

    it("keeps original bindings on guard skip and command failure (R14, R15)", async () => {
        const {factory, mapper} = setup();
        factory.mapToValue("string", "original", "id");
        class Fail extends AbstractCommand { public override execute(): void { throw new Error("failure"); } }
        await mapper.execute(Noop, {id: "skip"}, {guards: [Deny]});
        await assert.rejects(mapper.execute(Fail, {id: "fail"}));
        assert.equal(factory.getInstance("string", "id"), "original");
        assert.equal(factory.hasValueMapping("string", "request"), false);
    });

    it("does not retain completed work and both settlers wait through a failure (R13, R18)", async () => {
        const {factory} = setup(), context = factory.getInstance(Context), type = event(), gate = deferred();
        for (let i = 0; i < 1000; i++) context.dispatchMessage(type);
        assert.equal(context.pendingCount, 0);
        class Slow extends AbstractCommand { public override async execute(): Promise<void> { await gate.promise; } }
        class Fail extends AbstractCommand { public override execute(): void { throw new Error("expected"); } }
        void context.execute(Slow); void context.execute(Fail);
        const settling = context.settle(); const second = context.settle();
        assert.equal(settling, second);
        let finished = false;
        settling.catch(() => { finished = true; });
        await ticks(); assert.equal(finished, false);
        gate.resolve();
        await assert.rejects(settling, error => errors(error).some(item => item instanceof Error && item.message === "expected"));
        await context.settle(); assert.equal(context.pendingCount, 0);
        for (let i = 0; i < 50; i++) void context.execute(Noop);
        await ticks(); assert.equal(context.pendingCount, 0);
    });

    it("unifies named children, removes roles on reparent/dispose, rejects duplicate ids and cycles (R08-R10, R16)", () => {
        const {factory} = setup(), a = factory.getInstance(Context), b = factory.getInstance(Context);
        const child = new Child();
        a.addModel(child, "named");
        assert.equal(a.childrenList[0], child);
        b.addMediator(child);
        assert.equal(a.models.length, 0);
        assert.equal(a.numChildren, 0);
        child.dispose();
        assert.equal(b.mediators.length, 0);
        const parent = new HierarchyObjectContainer(), first = new HierarchyObjectContainer();
        parent.add(first, "same");
        assert.throws(() => parent.add(new Child(), "same"), /already registered/);
        assert.throws(() => first.add(parent), /cycle/);
        assert.equal(parent.remove(first), true);
        assert.equal(parent.numChildren, 0);
        assert.equal(parent.get("same"), undefined);
    });

    it("forwards to named mediators with stable delivery targets (R07, R12)", () => {
        const {factory} = setup(), context = factory.getInstance(Context), model = new Child(), a = new Child(), b = new Child(), type = event();
        const received: IMessage[] = [];
        context.addModel(model, "model").addMediator(a, "a").addMediator(b, "b");
        a.addMessageListener(type, msg => received.push(msg)); b.addMessageListener(type, msg => received.push(msg));
        model.dispatchMessage(type);
        assert.equal(received.length, 2);
        assert.equal(received[0]!.currentTarget, a); assert.equal(received[1]!.currentTarget, b);
        assert.equal(received[0]!.initialTarget, model); assert.equal(received[0]!.previousTarget, context);
    });

    it("snapshots priority listeners; disposed subscriptions and once handlers stay removed (R11)", () => {
        const d = new MessageDispatcher(), type = event(), seen: string[] = [];
        d.addMessageListener(type, () => { seen.push("old"); d.addMessageListener(type, added, false, 10); });
        const added = (): void => { seen.push("new"); };
        const subscription = d.subscribe(type, () => seen.push("subscription"));
        d.dispatchMessage(type); subscription.dispose(); d.dispatchMessage(type);
        assert.deepEqual(seen, ["old", "subscription", "new", "old"]);
        let once = 0;
        d.subscribe(type, () => { once++; d.dispatchMessage(type); }, {once: true, priority: 20});
        d.dispatchMessage(type); assert.equal(once, 1);
    });

    it("preserves values after constructor errors and resolves the named config implementation (R19, R20)", () => {
        const {factory} = setup();
        class Fails { public constructor() { throw new Error("expected"); } }
        const original = {};
        factory.mapToType("service", Fails).mapToValue("service", original);
        assert.throws(() => factory.instantiateValueUnmapped("service"), /expected/);
        assert.equal(factory.getInstance("service"), original);
        class Default {}
        class Named {}
        factory.registry.register("named", Named);
        factory.mapToType("configured", Default);
        factory.appendMappingConfig(new Map([["configured$special", {implementation: "named", newInstance: true}]]));
        assert.ok(factory.getInstance("configured", "special") instanceof Named);
    });
});

describe("V2 DI, ownership and devkit facilities", () => {
    it("supports typed tokens, undefined values, constructor/provider injection and explicit imports", () => {
        const root = new DependencyContainer(), count = new ServiceToken<number>("count"), hidden = new ServiceToken<string>("hidden");
        root.bindToValue(count, 7); root.bindToValue(hidden, "private");
        root.bindToValue(new ServiceToken<undefined>("undefined"), undefined);
        class ObjectWithCount {
            public static readonly inject = [count];
            public constructor(public readonly value: number) {}
        }
        const child = root.createScope({inherit: [count]});
        assert.equal(child.create(ObjectWithCount).value, 7);
        assert.throws(() => child.resolve(hidden), /No binding/);
        const result = new ServiceToken<{value: number}>("result");
        child.bindToProvider(result, scope => ({value: scope.resolve(count)}));
        assert.equal(child.resolve(result).value, 7);
        const missing = new ServiceToken<undefined>("present");
        child.bindToValue(missing, undefined);
        assert.equal(child.has(missing), true); assert.equal(child.resolve(missing), undefined);
    });

    it("diagnoses cycles and lets derived property metadata replace the base injection", () => {
        const scope = new DependencyContainer();
        const a = new ServiceToken<unknown>("a"), b = new ServiceToken<unknown>("b");
        scope.bindToProvider(a, s => s.resolve(b)); scope.bindToProvider(b, s => s.resolve(a));
        assert.throws(() => scope.resolve(a), /a -> b -> a/);
        class Base { @inject("base") public value!: number; }
        class Derived extends Base { @inject("derived") public override value = 0; }
        scope.bindToValue("derived", 9);
        assert.equal(scope.create(Derived).value, 9);
    });

    it("cleans resources in reverse order, waits for asynchronous cleanup and aggregates failures", async () => {
        const resources = new ResourceScope(), gate = deferred(), calls: string[] = [];
        resources.defer(() => { calls.push("first"); });
        resources.defer(() => { calls.push("error"); throw new Error("cleanup"); });
        resources.defer(async () => { calls.push("last"); await gate.promise; calls.push("last done"); });
        const close = resources.close();
        assert.deepEqual(calls, ["last"]);
        gate.resolve(); await assert.rejects(close, AggregateError);
        assert.deepEqual(calls, ["last", "last done", "error", "first"]);
        assert.equal(resources.close(), close);
    });

    it("preserves startup errors when cleanup also fails", async () => {
        const resources = new ResourceScope();
        resources.own({start: () => { throw new Error("start"); }, close: () => { throw new Error("cleanup"); }});
        await assert.rejects(resources.start(), error => {
            assert.deepEqual(errors(error).map(item => (item as Error).message), ["start", "cleanup"]);
            return true;
        });
    });

    it("continues context teardown after a retained command's dispose fails", async () => {
        const {factory} = setup(true), context = factory.getInstance(Context), child = new Child();
        let resourceClosed = false;
        class BadDispose extends AbstractCommand { public dispose(): void { throw new Error("dispose"); } }
        context.addModel(child);
        context.defer(() => { resourceClosed = true; });
        await context.execute(BadDispose);
        await assert.rejects(context.close(), AggregateError);
        assert.equal(context.isDisposed, true); assert.equal(child.isDisposed, true); assert.equal(resourceClosed, true);
    });

    it("waits for a resource starting during close and cleans it exactly once", async () => {
        const resources = new ResourceScope(), gate = deferred(), calls: string[] = [];
        resources.own({start: async () => { await gate.promise; calls.push("started"); }, close: () => { calls.push("closed"); }});
        const start = resources.start(), close = resources.close();
        gate.resolve(); await start; await close;
        assert.deepEqual(calls, ["started", "closed"]);
    });

    it("runs mediator -> command -> mutable model -> immutable mediator for concurrent requests", async () => {
        const factory = new Factory(), context = factory.getInstance(RequestContext);
        const gates = new Map([["a", deferred<string>()], ["b", deferred<string>()]]);
        context.useAdapter({load: id => gates.get(id)!.promise});
        context.mediator.load("a"); context.mediator.load("b");
        gates.get("b")!.resolve("second"); gates.get("a")!.resolve("first");
        await context.settle();
        assert.equal(context.model.get("a"), "first"); assert.equal(context.model.get("b"), "second");
        assert.deepEqual(context.mediator.updates, ["b:second", "a:first"]);
        class WrongMediator extends Child { @inject(RESULT_MODEL) public mutable!: unknown; }
        class ReadAdapter { @inject(RESULT_MODEL_IMMUTABLE) public model!: unknown; }
        assert.throws(() => context.createMediator(WrongMediator), /no binding/);
        assert.equal(context.createAdapter(ReadAdapter).model, context.model);
        await context.close();
    });

    it("isolates child contexts, routes only opted-in messages and prevents late commits after close", async () => {
        const factory = new Factory(), parent = factory.getInstance(Context);
        const a = parent.createContext(RequestContext, {id: "a", bubble: msg => msg.type === RESULT_CHANGED});
        const b = parent.createContext(RequestContext, {id: "b"});
        const gateA = deferred<string>(), gateB = deferred<string>();
        let borrowedClosed = 0, ownedClosed = 0;
        const borrowed: RequestAdapter & {close(): void} = {load: () => gateB.promise, close: () => { borrowedClosed++; }};
        a.useAdapter(a.own({load: () => gateA.promise, close: () => { ownedClosed++; }}));
        b.useAdapter(borrowed);
        let bubbled = 0;
        parent.addMessageListener(RESULT_CHANGED, () => { bubbled++; });
        a.mediator.load("same"); b.mediator.load("same");
        const closing = a.close();
        gateA.resolve("too late"); gateB.resolve("survives");
        await closing;
        await b.settle();
        assert.equal(a.model.get("same"), undefined);
        assert.equal(b.model.get("same"), "survives");
        assert.equal(bubbled, 0); assert.equal(ownedClosed, 1); assert.equal(borrowedClosed, 0);
        await parent.close(); assert.equal(borrowedClosed, 0);
    });

    it("forwards selected parent messages to a child and stops at the child boundary", async () => {
        const factory = new Factory(), parent = factory.getInstance(Context), type = event(), ignored = event();
        const child = parent.createContext(Context, {receive: message => message.type === type});
        let received = 0;
        child.addMessageListener(type, () => { received++; });
        child.addMessageListener(ignored, () => { received += 100; });
        parent.dispatchMessage(type); parent.dispatchMessage(ignored);
        assert.equal(received, 1);
        await parent.close();
    });

    it("exports selected dependencies to child contexts and makes registration available during attachment", async () => {
        const factory = new Factory(), parent = factory.getInstance(Context), token = new ServiceToken<string>("export");
        parent.provide(token, "shared", []);
        class WithExport extends Context { @inject(token) public value!: string; }
        assert.throws(() => parent.createContext(WithExport), /no binding/);
        const child = parent.createContext(WithExport, {inherit: [token]});
        assert.equal(child.value, "shared");
        const changed = event(); let deliveries = 0;
        class Announcing extends Child { protected override addedToHierarchy(): void { this.dispatchMessage(changed); } }
        const observer = new Child();
        observer.addMessageListener(changed, () => deliveries++);
        parent.addMediator(observer, "");
        parent.addModel(new Announcing());
        assert.equal(deliveries, 1);
        assert.equal(parent.getMediator(""), observer);
        await parent.close();
    });

    it("rolls back a failed attachment and frees owned pool instances", () => {
        const factory = new Factory(), context = factory.getInstance(Context);
        class BadChild extends Child { protected override addedToHierarchy(): void { throw new Error("attachment"); } }
        const child = new BadChild();
        assert.throws(() => context.addModel(child, "bad"), /attachment/);
        assert.equal(context.models.length, 0); assert.equal(context.numChildren, 0); assert.equal(child.parent, undefined);
        factory.registerPool(Child, 1);
        const pooled = factory.getInstance(Child);
        factory.unregisterPool(Child);
        assert.equal(pooled.isDisposed, true);
    });

    it("validates pool sizes", () => {
        const factory = new Factory();
        for (const capacity of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => factory.registerPool(Child, capacity));
        factory.registerPool(Child, 2);
        assert.throws(() => factory.increasePoolCapacity(Child, -1));
    });
});
