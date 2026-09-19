import {ResourceScope} from "../../src";
import {GameContext} from "./contexts/GameContext";
import {createGame} from "./Game";
import {FIRE, LEVEL_LOADED, LOAD, SCENE_CHANGED, SWITCH, TICK} from "./messages";
import {HudView} from "./views/HudView";
import {SceneView} from "./views/SceneView";
import {MOUNT} from "./views/ViewTokens";

const sceneMount = document.querySelector<HTMLElement>("#scene")!;
const hudMount = document.querySelector<HTMLElement>("#hud")!;
const toolbar = document.querySelector<HTMLElement>("#controls")!;
const trace = document.querySelector<HTMLElement>("#trace")!;
const status = document.querySelector<HTMLElement>("#status")!;
const restart = document.querySelector<HTMLButtonElement>("#restart")!;

let game: GameContext;
let nextScene = "B";
let traced = false;

const events: string[] = [];

function addTrace(context: GameContext): void
{
    context.observe(traced ? event =>
    {
        if (event.message === "tick" || event.message === "state changed")
        {
            return;
        }

        events.push(event.phase + " · " + (event.message ?? event.command ?? "") +
            (event.command ? " → " + event.command : "") + " · mapper " + event.mapperId +
            (event.executionId ? " · execution " + event.executionId : ""));

        if (events.length > 50)
        {
            events.shift();
        }

        trace.textContent = events.join("\n");
        trace.scrollTop = trace.scrollHeight;
    } : undefined);
}

function mountScene(): void
{
    game.scene.provide(MOUNT, sceneMount, ["mediator"]);
    game.scene.createMediator(SceneView);
}

function button(label: string, action: () => void, scope: ResourceScope): void
{
    const element = document.createElement("button");

    element.textContent = label;
    element.addEventListener("click", action);

    toolbar.append(element);

    scope.defer(() =>
    {
        element.removeEventListener("click", action);
        element.remove();
    });
}

async function mount(): Promise<void>
{
    game = createGame();
    nextScene = "B";
    events.length = 0;
    trace.textContent = "";

    const controls = game.own(new ResourceScope());

    game.own(game.subscribe(SCENE_CHANGED, () =>
    {
        mountScene();
        status.textContent = "Scene ready";
    }));

    game.own(game.subscribe(LEVEL_LOADED, () =>
    {
        status.textContent = "Level loaded";
    }));

    game.hud.provide(MOUNT, hudMount, ["mediator"]);
    game.hud.createMediator(HudView);

    mountScene();
    addTrace(game);

    button("Fire", () => game.dispatchMessage(FIRE), controls);
    button("Step", () => game.dispatchMessage(TICK, {delta: 0.25}), controls);

    button("Pause / resume", () =>
    {
        game.running = !game.running;
        status.textContent = game.running ? "Running" : "Paused";
    }, controls);

    button("Load slow", () =>
    {
        status.textContent = "Loading slow level…";
        game.dispatchMessage(LOAD, {level: "Slow meadow", delay: 1200});
    }, controls);

    button("Load fast", () =>
    {
        status.textContent = "Loading fast level…";
        game.dispatchMessage(LOAD, {level: "Fast orbit", delay: 40});
    }, controls);

    button("Switch scene", () =>
    {
        const scene = nextScene;

        nextScene = nextScene === "A" ? "B" : "A";
        game.dispatchMessage(SWITCH, {scene});
    }, controls);

    button("Trace on / off", () =>
    {
        traced = !traced;
        addTrace(game);
    }, controls);

    status.textContent = "Running";

    await game.start();
}

restart.addEventListener("click", async () =>
{
    restart.disabled = true;

    try
    {
        await game.close();
        await mount();
    }
    catch (error)
    {
        status.textContent = String(error);
    }
    finally
    {
        restart.disabled = false;
    }
});

window.addEventListener("pagehide", () =>
{
    game.dispose();
});

void mount().catch(error =>
{
    status.textContent = String(error);
});
