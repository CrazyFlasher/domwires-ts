import assert from "node:assert/strict";
import {createGame} from "../examples/game/Game";
import {FIRE} from "../examples/game/messages";
import {IGameView} from "../examples/game/views/GameView";
import {HudViewState} from "../examples/game/views/HudView";
import {SceneViewState} from "../examples/game/views/SceneView";
import {IGameViewFactory} from "../examples/game/views/IGameViewFactory";

describe("Game presentation", () =>
{
    it("creates and disposes views through mediators and routes their callbacks without a DOM", async () =>
    {
        const frames: SceneViewState[] = [];
        const created = {game: 0, scene: 0, hud: 0};
        const disposed = {game: 0, scene: 0, hud: 0};
        let view!: IGameView;
        let hud!: HudViewState;
        let status = "";
        let sender: unknown;
        const viewFactory: IGameViewFactory = {
            createGame: () =>
            {
                created.game++;
                view = {
                    setStatus: value => { status = value; },
                    setRestarting: () => undefined,
                    renderTrace: () => undefined,
                    dispose: () => { disposed.game++; }
                };

                return view;
            },
            createScene: () =>
            {
                created.scene++;

                return {
                    render: state => frames.push(state),
                    dispose: () => { disposed.scene++; }
                };
            },
            createHud: () =>
            {
                created.hud++;

                return {
                    render: state => { hud = state; },
                    dispose: () => { disposed.hud++; }
                };
            }
        };
        const game = createGame(viewFactory);

        try
        {
            assert.deepEqual(created, {game: 1, scene: 1, hud: 1});
            game.own(game.subscribe(FIRE, message => { sender = message.initialTarget; }));
            assert.equal(frames.at(-1)!.shots, 0);
            assert.equal(hud.loads, 0);

            view.onInput!("fire");

            assert.equal(sender, game.getMediator("game"));
            assert.equal(game.scene.model.shots, 1);
            assert.equal(frames.at(-1)!.shots, 1);
            assert.equal(frames[0]!.shots, 0);

            const projectileFrame = frames.at(-1)!;
            const originalX = projectileFrame.bullets[0]!.x;

            view.onInput!("pause");
            assert.equal(game.running, false);
            assert.equal(status, "Paused");
            view.onInput!("step");
            assert.equal(frames.at(-1)!.ticks, 1);
            assert.ok(frames.at(-1)!.bullets[0]!.x > originalX);
            assert.equal(projectileFrame.bullets[0]!.x, originalX);

            view.onInput!("loadFast");
            await game.settle();
            assert.equal(frames.at(-1)!.level, "Fast orbit");
            assert.equal(hud.loads, 1);
            assert.equal(hud.lastLoaded, "Fast orbit");
            assert.equal(status, "Level loaded");

            view.onInput!("switchScene");
            await game.settle();
            assert.deepEqual(created, {game: 1, scene: 2, hud: 1});
            assert.deepEqual(disposed, {game: 0, scene: 1, hud: 0});
            assert.equal(frames.at(-1)!.scene, "B");
            assert.equal(frames.at(-1)!.shots, 0);
            assert.equal(hud.loads, 1);

            view.onInput!("fire");
            assert.equal(frames.at(-1)!.shots, 1);
        }
        finally
        {
            await game.close();
        }

        assert.equal(view.onInput, undefined);
        assert.deepEqual(disposed, {game: 1, scene: 2, hud: 1});
    });
});
