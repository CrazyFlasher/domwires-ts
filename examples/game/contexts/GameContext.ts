import {AbstractContext, CommandExecution, CommandTrace, inject, optional} from "../../../src";
import {ToggleRunning} from "../commands/ToggleRunning";
import {SwitchScene} from "../commands/SwitchScene";
import {GAME_CLOCK, GameClock, SCENE_NAME, SCENE_SWITCHER, SceneSwitcher} from "../contracts";
import {gameResources} from "../gameResources";
import {GameMediator} from "../mediators/GameMediator";
import {FIRE, LEVEL_LOADED, LOAD, RUNNING_CHANGED, SCENE_CHANGED, SWITCH, TICK, TOGGLE_RUNNING} from "../messages";
import {HudContext} from "./HudContext";
import {SceneContext} from "./SceneContext";
import {IGameViewFactory} from "../views/IGameViewFactory";
import {GAME_EVENTS, VIEW_FACTORY} from "../views/ViewTokens";

export class GameContext extends AbstractContext implements SceneSwitcher, GameClock
{
    public scene!: SceneContext;
    public hud!: HudContext;
    public running = true;

    @inject(VIEW_FACTORY)
    @optional()
    private viewFactory?: IGameViewFactory;

    private mediator?: GameMediator;
    private observer?: CommandTrace;

    protected override init(): void
    {
        super.init();

        this.provide(SCENE_SWITCHER, this, ["command"]);
        this.provide(GAME_CLOCK, this, ["command"]);
        this.map(TOGGLE_RUNNING, ToggleRunning);

        if (this.viewFactory)
        {
            this.provide(VIEW_FACTORY, this.viewFactory, ["mediator"]);
            this.provide(GAME_EVENTS, this, ["mediator"]);
            this.mediator = this.createMediator(GameMediator, "game");
        }

        this.hud = this.createContext(HudContext, {
            id: "hud",
            inherit: this.viewFactory ? [VIEW_FACTORY] : [],
            receive: message => message.type === LEVEL_LOADED
        });

        this.createScene("A");
        this.map(SWITCH, SwitchScene, {concurrency: "serial"});

        let timer: ReturnType<typeof setInterval> | undefined;

        this.own({
            start: () =>
            {
                timer = setInterval(() =>
                {
                    if (this.running)
                    {
                        this.dispatchMessage(TICK, {delta: 0.05});
                    }
                }, 50);

                gameResources.clocks++;
            },
            close: () =>
            {
                if (timer !== undefined)
                {
                    clearInterval(timer);
                    timer = undefined;
                    gameResources.clocks--;
                }
            }
        });
    }

    public toggleRunning(): void
    {
        this.running = !this.running;
        this.dispatchMessage(RUNNING_CHANGED, {running: this.running});
    }

    public observe(trace: CommandTrace | undefined): void
    {
        this.observer = trace;
        this.trace = trace;
        this.hud.trace = trace;
        this.scene.trace = trace;
    }

    public setTracing(enabled: boolean): void
    {
        const mediator = this.mediator;

        this.observe(enabled && mediator ? event => mediator.recordTrace(event) : undefined);
    }

    private createScene(scene: string): void
    {
        this.provide(SCENE_NAME, scene, ["command"]);

        this.scene = this.createContext(SceneContext, {
            id: "scene",
            inherit: this.viewFactory ? [SCENE_NAME, VIEW_FACTORY] : [SCENE_NAME],
            receive: message => message.type === TICK || message.type === FIRE || message.type === LOAD,
            bubble: message => message.type === LEVEL_LOADED
        });

        this.scene.trace = this.observer;
    }

    public async switchScene(scene: string, execution: CommandExecution): Promise<void>
    {
        await this.scene.close();

        execution.throwIfCancelled();
        this.createScene(scene);
        this.dispatchMessage(SCENE_CHANGED);
    }
}
