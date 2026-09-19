import {AbstractHierarchyObject, CommandTraceEvent, IMessageDispatcherImmutable, postConstruct, ResourceScope} from "../../../src";
import {CLOSE_DEMO, FIRE, LEVEL_LOADED, LOAD, RESTART_DEMO, RUNNING_CHANGED, SCENE_CHANGED, SWITCH, TICK, TOGGLE_RUNNING, TOGGLE_TRACE} from "../messages";
import {GameInput, IGameView} from "../views/GameView";
import {IGameViewFactory} from "../views/IGameViewFactory";
import {GAME_EVENTS, VIEW_FACTORY} from "../views/ViewTokens";

/** Owns the game view and translates its callbacks into messages from an attached mediator. */
export class GameMediator extends AbstractHierarchyObject
{
    public static readonly inject = [VIEW_FACTORY, GAME_EVENTS];

    private view!: IGameView;
    private readonly resources = new ResourceScope();
    private readonly events: string[] = [];
    private nextScene = "B";
    private readonly input = (input: GameInput): void => this.onInput(input);

    public constructor(private readonly viewFactory: IGameViewFactory, private readonly gameEvents: IMessageDispatcherImmutable)
    {
        super();
    }

    @postConstruct()
    private init(): void
    {
        this.view = this.resources.own(this.viewFactory.createGame());
        this.view.onInput = this.input;
        this.resources.defer(() =>
        {
            if (this.view.onInput === this.input)
            {
                this.view.onInput = undefined;
            }
        });

        this.resources.own(this.gameEvents.subscribe(SCENE_CHANGED, () => this.view.setStatus("Scene ready")));
        this.resources.own(this.gameEvents.subscribe(LEVEL_LOADED, () => this.view.setStatus("Level loaded")));
        this.resources.own(this.gameEvents.subscribe(RUNNING_CHANGED, (_message, data) =>
        {
            this.view.setStatus(data.running ? "Running" : "Paused");
        }));

        this.view.renderTrace(this.events);
        this.view.setStatus("Running");
    }

    private onInput(input: GameInput): void
    {
        switch (input)
        {
            case "fire":
                this.dispatchMessage(FIRE);
                break;
            case "step":
                this.dispatchMessage(TICK, {delta: 0.25});
                break;
            case "pause":
                this.dispatchMessage(TOGGLE_RUNNING);
                break;
            case "loadSlow":
                this.view.setStatus("Loading slow level…");
                this.dispatchMessage(LOAD, {level: "Slow meadow", delay: 1200});
                break;
            case "loadFast":
                this.view.setStatus("Loading fast level…");
                this.dispatchMessage(LOAD, {level: "Fast orbit", delay: 40});
                break;
            case "switchScene":
            {
                const scene = this.nextScene;

                this.nextScene = scene === "A" ? "B" : "A";
                this.dispatchMessage(SWITCH, {scene});
                break;
            }
            case "trace":
                this.dispatchMessage(TOGGLE_TRACE);
                break;
            case "restart":
                this.view.setRestarting(true);
                this.dispatchMessage(RESTART_DEMO);
                break;
            case "close":
                this.dispatchMessage(CLOSE_DEMO);
                break;
        }
    }

    public recordTrace(event: CommandTraceEvent): void
    {
        if (this.isDisposed || event.message === "tick" || event.message === "state changed")
        {
            return;
        }

        this.events.push(event.phase + " · " + (event.message ?? event.command ?? "") +
            (event.command ? " → " + event.command : "") + " · mapper " + event.mapperId +
            (event.executionId ? " · execution " + event.executionId : ""));

        if (this.events.length > 50)
        {
            this.events.shift();
        }

        this.view.renderTrace(this.events);
    }

    public override dispose(): void
    {
        this.resources.dispose();
        this.events.length = 0;
        super.dispose();
    }
}
