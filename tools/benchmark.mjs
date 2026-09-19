import {createRequire} from "node:module";
import {performance} from "node:perf_hooks";
const require = createRequire(import.meta.url);
const dw = require("../dist/index.js");
const iterations = Number(process.env.BENCH_ITERATIONS ?? 10000);
const results = [];
for (const mapped of [false, true])
{
    const samples = [];
    for (let repeat = 0; repeat < 5; repeat++)
    {
        const factory = new dw.Factory();
        factory.mapToValue("IFactory", factory);
        factory.mapToValue("CommandMapperConfig", {defaultLifetime: "execution", defaultDataMode: "merge"});
        class Context extends dw.AbstractContext {}
        class Command extends dw.AbstractCommand { execute() {} }
        const context = factory.getInstance(Context), event = new dw.MessageType("tick");
        if (mapped) context.map(event, Command);
        global.gc?.();
        const heapBefore = process.memoryUsage().heapUsed;
        const started = performance.now();
        for (let i = 0; i < iterations; i++) context.dispatchMessage(event);
        const dispatchMs = performance.now() - started;
        await new Promise(resolve => setImmediate(resolve));
        global.gc?.();
        const retainedHeapBytes = process.memoryUsage().heapUsed - heapBefore;
        const pending = context.pendingCount ?? Reflect.get(context, "pendingCommands")?.length;
        samples.push({dispatchMs, retainedHeapBytes, pending});
        await context.settle();
        context.dispose();
        factory.dispose();
    }
    results.push({scenario: mapped ? "synchronous mapped messages" : "unmapped messages", iterations,
        medianDispatchMs: samples.map(sample => sample.dispatchMs).sort((a, b) => a - b)[2],
        samples});
}
console.log(JSON.stringify({node: process.version, results}, null, 2));
