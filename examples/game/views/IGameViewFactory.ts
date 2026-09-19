import {GameView, IGameView} from "./GameView";
import {HudView, IHudView} from "./HudView";
import {ISceneView, SceneView} from "./SceneView";

/** Creates fresh views. The requesting mediator owns each returned instance. */
export interface IGameViewFactory
{
    createGame(): IGameView;

    createScene(): ISceneView;

    createHud(): IHudView;
}

/** Borrows the page's mount points; no views are created until a mediator requests them. */
export class GameViewFactory implements IGameViewFactory
{
    public constructor(private readonly document: Document)
    {
    }

    public createGame(): IGameView
    {
        return new GameView(this.document);
    }

    public createScene(): ISceneView
    {
        return new SceneView(this.document.querySelector<HTMLElement>("#scene")!);
    }

    public createHud(): IHudView
    {
        return new HudView(this.document.querySelector<HTMLElement>("#hud")!);
    }
}
