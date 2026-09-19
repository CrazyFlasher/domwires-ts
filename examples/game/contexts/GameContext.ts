import {AbstractContext, CommandExecution, CommandTrace} from "../../../src";
import {SwitchScene} from "../commands/SwitchScene";
import {SCENE_NAME, SCENE_SWITCHER, SceneSwitcher} from "../contracts";
import {gameResources} from "../gameResources";
import {FIRE, LEVEL_LOADED, LOAD, SCENE_CHANGED, SWITCH, TICK} from "../messages";
import {HudContext} from "./HudContext";
import {SceneContext} from "./SceneContext";

export class GameContext extends AbstractContext implements SceneSwitcher
{
    public scene!: SceneContext;
    public hud!: HudContext;
    public running = true;

    private observer?: CommandTrace;

    protected override init(): void
    {
        super.init();

        this.provide(SCENE_SWITCHER, this, ["command"]);

        this.hud = this.createContext(HudContext, {
            id: "hud",
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

    public observe(trace: CommandTrace | undefined): void
    {
        this.observer = trace;
        this.trace = trace;
        this.hud.trace = trace;
        this.scene.trace = trace;
    }

    private createScene(scene: string): void
    {
        this.provide(SCENE_NAME, scene, ["command"]);

        this.scene = this.createContext(SceneContext, {
            id: "scene",
            inherit: [SCENE_NAME],
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
