import assert from "node:assert/strict";
import {createGame} from "../examples/game/Game";
import {FIRE, LOAD, SWITCH, TICK} from "../examples/game/messages";
import {gameResources} from "../examples/game/gameResources";
const emptyResources = {bullets: 0, adapters: 0, requests: 0, clocks: 0};
describe("Game integration", () => {
    it("uses a bounded projectile pool, isolates scenes, and keeps the HUD across switches", async () => {
        const game = createGame(); game.running = false; await game.start();
        assert.deepEqual(gameResources, {bullets: 12, adapters: 1, requests: 0, clocks: 1});
        for (let i = 0; i < 20; i++) game.dispatchMessage(FIRE);
        assert.equal(game.scene.model.shots, 12); assert.equal(game.scene.model.bullets.length, 12);
        game.dispatchMessage(TICK, {delta: 3}); assert.equal(game.scene.model.bullets.length, 0);
        game.dispatchMessage(FIRE); assert.equal(game.scene.model.shots, 13);
        game.dispatchMessage(LOAD, {level: "first", delay: 0}); await game.settle();
        assert.equal(game.hud.model.lastLoaded, "first"); assert.equal(game.hud.model.loads, 1);
        const oldScene = game.scene;
        game.dispatchMessage(LOAD, {level: "obsolete", delay: 60000});
        game.dispatchMessage(SWITCH, {scene: "B"}); await game.settle();
        assert.equal(oldScene.isDisposed, true); assert.equal(game.scene.model.scene, "B");
        assert.equal(game.scene.model.shots, 0); assert.equal(game.hud.model.loads, 1);
        assert.equal(gameResources.requests, 0); assert.equal(gameResources.bullets, 12);
        await game.close(); assert.deepEqual(gameResources, emptyResources);
    });
    it("applies only the latest level and closes while a switch is pending", async () => {
        const game = createGame();
        game.dispatchMessage(LOAD, {level: "old", delay: 60000});
        game.dispatchMessage(LOAD, {level: "new", delay: 0});
        await game.settle();
        assert.equal(game.scene.model.level, "new"); assert.equal(game.hud.model.loads, 1);
        game.dispatchMessage(SWITCH, {scene: "B"});
        game.dispatchMessage(SWITCH, {scene: "C"});
        await game.close(); assert.deepEqual(gameResources, emptyResources);
    });
});
