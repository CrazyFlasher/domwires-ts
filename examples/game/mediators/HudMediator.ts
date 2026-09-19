import {AbstractHierarchyObject, inject, postConstruct, ResourceScope} from "../../../src";
import {HUD_MODEL_IMMUTABLE, HudImmutable} from "../contracts";
import {HUD_CHANGED} from "../messages";
import {IHudView} from "../views/HudView";
import {IGameViewFactory} from "../views/IGameViewFactory";
import {VIEW_FACTORY} from "../views/ViewTokens";

export class HudMediator extends AbstractHierarchyObject
{
    @inject(HUD_MODEL_IMMUTABLE)
    private model!: HudImmutable;

    @inject(VIEW_FACTORY)
    private viewFactory!: IGameViewFactory;

    private view!: IHudView;
    private readonly resources = new ResourceScope();

    @postConstruct()
    private init(): void
    {
        this.view = this.resources.own(this.viewFactory.createHud());
        this.subscribe(HUD_CHANGED, () => this.render());
        this.render();
    }

    private render(): void
    {
        this.view.render({lastLoaded: this.model.lastLoaded, loads: this.model.loads});
    }

    public override dispose(): void
    {
        this.resources.dispose();
        super.dispose();
    }
}
