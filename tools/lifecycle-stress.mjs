import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
const {createGame} = require("../dist-test/examples/game/Game.js");
const {FIRE, LOAD, SWITCH, TICK} = require("../dist-test/examples/game/messages.js");
const {gameResources} = require("../dist-test/examples/game/gameResources.js");
const {MessageDispatcher} = require("../dist-test/src/index.js");
if (!global.gc) throw new Error("Run with --expose-gc");
const source = new MessageDispatcher();
const samples = [];
const empty = {bullets: 0, adapters: 0, requests: 0, clocks: 0};
async function cycle(index) {
    const game = createGame();
    game.running = false;
    game.own(source.subscribe(TICK, (_message, data) => game.dispatchMessage(TICK, data)));
    await game.start();
    for (let i = 0; i < 15; i++) game.dispatchMessage(FIRE);
    source.dispatchMessage(TICK, {delta: 3});
    game.dispatchMessage(LOAD, {level: "cancelled " + index, delay: 60000});
    game.dispatchMessage(SWITCH, {scene: "B"});
    await game.settle();
    game.dispatchMessage(LOAD, {level: "cancelled on close", delay: 60000});
    await game.close();
    assert.equal(game.pendingCount, 0);
    assert.equal(source.hasMessageListener(TICK), false);
    assert.deepEqual(gameResources, empty);
}
for (let round = 0; round < 7; round++) {
    for (let i = 0; i < 400; i++) await cycle(round * 400 + i);
    await new Promise(resolve => setImmediate(resolve));
    global.gc();
    samples.push({cycles: (round + 1) * 400, heapUsed: process.memoryUsage().heapUsed, ...gameResources});
}
const growth = samples.at(-1).heapUsed - samples[1].heapUsed;
assert(growth < 4 * 1024 * 1024, "Retained heap grew by " + growth + " bytes after warmup");
source.dispose();
console.log(JSON.stringify({node: process.version, cycles: 2800, growthAfterWarmup: growth, samples}, null, 2));
