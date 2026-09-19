/* Review evidence, not changes to the library or its normal test suite.
 * Run after npm run build: node analysis/review-2026-09-19/runtime-probes.cjs
 * Each probe compares actual behavior with a stated invariant. Exit 1 means
 * one or more invariants failed. Pending promises in the overlap probe have
 * no timers or external resources and do not keep the process alive.
 */
const dw = require('../../dist/index.js');
const {isDeepStrictEqual} = require('node:util');
const fs = require('node:fs');
const path = require('node:path');

const results = [];
const message = name => new (class extends dw.MessageType {})(name);
class Context extends dw.AbstractContext {}
class Child extends dw.AbstractHierarchyObject {}
class Noop extends dw.AbstractCommand {}
class Deny extends dw.AbstractGuards { get allows() { return false; } }
function setup(config) {
    const factory = new dw.Factory();
    factory.mapToValue('IFactory', factory);
    if (config) factory.mapToValue('CommandMapperConfig', config);
    const mapper = factory.getInstance(dw.CommandMapper);
    return {factory, mapper};
}
function deferred() {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    return {promise, resolve};
}
async function ticks() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
async function probe(id, description, expected, run) {
    try {
        const actual = await run();
        results.push({id, description, expected, actual, passed: isDeepStrictEqual(actual, expected)});
    } catch (error) {
        results.push({id, description, expected, error: String(error), passed: false});
    }
    console.log(JSON.stringify(results.at(-1)));
}

(async () => {
    await probe('R01', 'Nested synchronous execution preserves outer command input', ['outer', 'outer'], async () => {
        const {mapper} = setup();
        const seen = [];
        let inner;
        class Outer extends dw.AbstractCommand {
            execute() {
                seen.push(this.id);
                inner = mapper.executeCommand(Noop, {id: 'inner'});
                seen.push(this.id);
            }
        }
        dw.lazyInjectNamed('string', 'id')(Outer.prototype, 'id');
        await mapper.executeCommand(Outer, {id: 'outer'});
        await inner;
        return seen;
    });

    await probe('R02', 'Async dependencies stay isolated across two factories', ['A', 'A'], async () => {
        const a = setup(), b = setup(), gate = deferred(), seen = [];
        a.factory.mapToValue('service', 'A');
        b.factory.mapToValue('service', 'B');
        class Waiting extends dw.AbstractCommand {
            async executeAsync() {
                seen.push(this.service);
                await gate.promise;
                seen.push(this.service);
            }
        }
        dw.lazyInject('service')(Waiting.prototype, 'service');
        const waiting = a.mapper.executeCommand(Waiting);
        await b.mapper.executeCommand(Noop);
        gate.resolve();
        await waiting;
        return seen;
    });

    await probe('R03', 'Two concurrent AbstractAsyncCommand calls both complete', ['fulfilled', 'fulfilled'], async () => {
        const {mapper} = setup(), callbacks = [], states = ['pending', 'pending'];
        class Waiting extends dw.AbstractAsyncCommand {
            execute() { callbacks.push(() => this.resolve()); }
        }
        mapper.executeCommand(Waiting).then(() => { states[0] = 'fulfilled'; });
        mapper.executeCommand(Waiting).then(() => { states[1] = 'fulfilled'; });
        callbacks.forEach(callback => callback());
        await ticks();
        return states;
    });

    await probe('R04', 'Awaiting executeCommand waits for an async execute method', true, async () => {
        const {mapper} = setup(), gate = deferred();
        let done = false;
        class NativeAsync extends dw.AbstractCommand {
            async execute() { await gate.promise; done = true; }
        }
        await mapper.executeCommand(NativeAsync);
        const result = done;
        gate.resolve();
        await ticks();
        return result;
    });

    await probe('R05', 'Removing a once mapping does not skip the next mapping', ['once', 'next'], async () => {
        const {mapper} = setup(), type = message('once'), seen = [];
        class Once extends dw.AbstractCommand { execute() { seen.push('once'); } }
        class Next extends dw.AbstractCommand { execute() { seen.push('next'); } }
        mapper.map(type, Once, undefined, false, true);
        mapper.map(type, Next);
        await mapper.tryToExecuteCommand(type);
        return seen;
    });

    await probe('R06', 'Once removes the executed mapping when the same class has two mappings', 1, async () => {
        const {mapper} = setup(), type = message('duplicate');
        let runs = 0;
        class Count extends dw.AbstractCommand { execute() { runs++; } }
        mapper.map(type, Count).addGuards(Deny);
        mapper.map(type, Count, undefined, false, true);
        await mapper.tryToExecuteCommand(type);
        await mapper.tryToExecuteCommand(type);
        return runs;
    });

    await probe('R07', 'A mediator registered by ID receives model messages', 1, async () => {
        const {factory} = setup(), context = factory.getInstance(Context);
        const model = new Child(), mediator = new Child(), type = message('changed');
        let received = 0;
        context.addModel(model);
        context.addMediator(mediator, 'ui');
        mediator.addMessageListener(type, () => received++);
        model.dispatchMessage(type);
        await context.settle();
        return received;
    });

    await probe('R08', 'Removing a named child by instance removes its registration', {removed: true, count: 0, contains: false}, () => {
        const container = new dw.HierarchyObjectContainer(), child = new Child();
        container.add(child, 'named');
        const removed = container.remove(child);
        return {removed, count: container.numChildren, contains: container.contains(child)};
    });

    await probe('R09', 'Replacing a duplicate child ID cannot leave a detached registration with a live parent', false, () => {
        const container = new dw.HierarchyObjectContainer(), a = new Child(), b = new Child();
        container.add(a, 'same');
        try { container.add(b, 'same'); } catch { return false; }
        return a.parent === container && !container.contains(a);
    });

    await probe('R10', 'Reparenting clears the old context role list', 0, () => {
        const {factory} = setup(), a = factory.getInstance(Context), b = factory.getInstance(Context), child = new Child();
        a.addModel(child);
        b.addMediator(child);
        return a.models.length;
    });

    await probe('R11', 'Adding a higher-priority listener does not invoke the current listener twice', 1, () => {
        const dispatcher = new dw.MessageDispatcher(), type = message('listeners');
        let calls = 0;
        const newlyAdded = () => undefined;
        dispatcher.addMessageListener(type, () => {
            calls++;
            dispatcher.addMessageListener(type, newlyAdded, false, 10);
        });
        dispatcher.addMessageListener(type, () => undefined);
        dispatcher.dispatchMessage(type);
        return calls;
    });

    await probe('R12', 'A forwarded message currentTarget identifies the receiving mediator', true, async () => {
        const {factory} = setup(), context = factory.getInstance(Context), model = new Child(), mediator = new Child();
        const type = message('target');
        let correct;
        context.addModel(model).addMediator(mediator);
        mediator.addMessageListener(type, msg => { correct = msg.currentTarget === mediator; });
        model.dispatchMessage(type);
        await context.settle();
        return correct;
    });

    await probe('R13', 'Completed dispatches are removed from pendingCommands without settle', 0, async () => {
        const {factory} = setup(), context = factory.getInstance(Context), type = message('unmapped');
        for (let i = 0; i < 1000; i++) context.dispatchMessage(type);
        await ticks();
        // Deliberate diagnostic access to the internal collection for retention evidence.
        return Reflect.get(context, 'pendingCommands').length;
    });

    await probe('R14', 'A rejected guard does not leak temporary DI bindings with pooling off', false, async () => {
        const {factory, mapper} = setup({singletonCommands: false, mergeMessageDataAndMappingData: true});
        await mapper.executeCommand(Noop, {requestId: 'private'}, [Deny]);
        return factory.hasValueMapping('string', 'requestId');
    });

    await probe('R15', 'A temporary payload binding restores the previous permanent binding', 'permanent', async () => {
        const {factory, mapper} = setup({singletonCommands: false, mergeMessageDataAndMappingData: true});
        factory.mapToValue('string', 'permanent', 'requestId');
        await mapper.executeCommand(Noop, {requestId: 'temporary'});
        return factory.hasValueMapping('string', 'requestId') ? factory.getInstance('string', 'requestId') : '<missing>';
    });

    await probe('R16', 'Hierarchy rejects ancestor cycles', true, () => {
        const a = new dw.HierarchyObjectContainer(), b = new dw.HierarchyObjectContainer();
        a.add(b);
        try { b.add(a); } catch { return true; }
        // Do not query root, dispatch or dispose the cycle, as those can loop indefinitely.
        return false;
    });

    await probe('R17', 'stopOnExecute applies to every message in a multi-message registration', ['first'], async () => {
        const {mapper} = setup(), a = message('a'), b = message('b'), seen = [];
        class First extends dw.AbstractCommand { execute() { seen.push('first'); } }
        class Extra extends dw.AbstractCommand { execute() { seen.push('extra'); } }
        mapper.map([a, b], First, undefined, true);
        mapper.map(a, Extra);
        await mapper.tryToExecuteCommand(a);
        return seen;
    });

    await probe('R18', 'settle waits for all dispatched work even when one command rejects', true, async () => {
        const {factory} = setup(), context = factory.getInstance(Context), slow = message('slow'), fail = message('fail');
        const gate = deferred();
        let completed = false;
        class Slow extends dw.AbstractCommand { async executeAsync() { await gate.promise; completed = true; } }
        class Fail extends dw.AbstractCommand { execute() { throw new Error('expected probe error'); } }
        context.map(slow, Slow);
        context.map(fail, Fail);
        context.dispatchMessage(slow);
        context.dispatchMessage(fail);
        await context.settle().catch(() => undefined);
        await context.settle();
        const result = completed;
        gate.resolve();
        await ticks();
        return result;
    });

    await probe('R19', 'instantiateValueUnmapped restores the existing value after a constructor error', true, () => {
        const {factory} = setup();
        class Fails extends dw.AbstractCommand { constructor() { super(); throw new Error('expected'); } }
        const original = {};
        factory.mapToType('failing', Fails);
        factory.mapToValue('failing', original);
        try { factory.instantiateValueUnmapped('failing'); } catch { /* intended constructor error */ }
        return factory.hasValueMapping('failing');
    });

    await probe('R20', 'Named newInstance config creates the named implementation', 'Named', () => {
        const {factory} = setup();
        class Default {}
        class Named {}
        factory.mapToType('review-service', Default);
        dw.definableFromString(Named, 'DomWiresReviewNamed');
        try {
            factory.appendMappingConfig(new Map([['review-service$named', {
                implementation: 'DomWiresReviewNamed', newInstance: true
            }]]));
            return factory.getInstance('review-service', 'named').constructor.name;
        } finally {
            delete globalThis.DomWiresReviewNamed;
        }
    });

    await probe('R21', 'Remapping a command to an async implementation preserves mapped order', ['async', 'next'], async () => {
        const {factory, mapper} = setup(), type = message('remapped'), gate = deferred(), seen = [];
        class Base extends dw.AbstractCommand {}
        class AsyncImplementation extends Base {
            async executeAsync() { await gate.promise; seen.push('async'); }
        }
        class Next extends dw.AbstractCommand { execute() { seen.push('next'); } }
        factory.mapToType(Base, AsyncImplementation);
        mapper.map(type, [Base, Next]);
        const pending = mapper.tryToExecuteCommand(type);
        gate.resolve();
        await pending;
        return seen;
    });

    const output = {commit: '08c80f955e63d652f0ab568ef0a38be760d8fd3f', node: process.version, results};
    fs.writeFileSync(path.join(__dirname, 'runtime-results.json'), JSON.stringify(output, null, 2) + '\n');
    console.log(`${results.filter(result => !result.passed).length}/${results.length} invariants failed`);
    process.exitCode = results.some(result => !result.passed) ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 2; });
