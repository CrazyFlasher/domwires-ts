import {AbstractHierarchyObject, inject, postConstruct, ResourceScope} from "../../../src";
import {SCENE_MODEL_IMMUTABLE, SceneModelImmutable} from "../contracts";
import {STATE_CHANGED} from "../messages";
import {ISceneView} from "../views/SceneView";
import {IGameViewFactory} from "../views/IGameViewFactory";
import {VIEW_FACTORY} from "../views/ViewTokens";

export class SceneMediator extends AbstractHierarchyObject
{
    @inject(SCENE_MODEL_IMMUTABLE)
    private model!: SceneModelImmutable;

    @inject(VIEW_FACTORY)
    private viewFactory!: IGameViewFactory;

    private view!: ISceneView;
    private readonly resources = new ResourceScope();

    @postConstruct()
    private init(): void
    {
        this.view = this.resources.own(this.viewFactory.createScene());
        this.subscribe(STATE_CHANGED, () => this.render());
        this.render();
    }

    private render(): void
    {
        this.view.render({
            scene: this.model.scene,
            level: this.model.level,
            shots: this.model.shots,
            ticks: this.model.ticks,
            bullets: this.model.bullets.map(bullet => ({x: bullet.x, y: bullet.y}))
        });
    }

    public override dispose(): void
    {
        this.resources.dispose();
        super.dispose();
    }
}
