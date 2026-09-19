import {AbstractContext, inject, optional} from "../../../src";
import {UpdateHud} from "../commands/UpdateHud";
import {HUD_MODEL, HUD_MODEL_IMMUTABLE, HudImmutable} from "../contracts";
import {LEVEL_LOADED} from "../messages";
import {HudModel} from "../models/HudModel";
import {HudMediator} from "../mediators/HudMediator";
import {IGameViewFactory} from "../views/IGameViewFactory";
import {VIEW_FACTORY} from "../views/ViewTokens";

export class HudContext extends AbstractContext
{
    public model!: HudImmutable;

    @inject(VIEW_FACTORY)
    @optional()
    private viewFactory?: IGameViewFactory;

    protected override init(): void
    {
        super.init();

        this.model = this.registerModel({
            mutable: HUD_MODEL,
            immutable: HUD_MODEL_IMMUTABLE,
            implementation: HudModel
        });

        this.map(LEVEL_LOADED, UpdateHud);

        if (this.viewFactory)
        {
            this.provide(VIEW_FACTORY, this.viewFactory, ["mediator"]);
            this.createMediator(HudMediator, "hud");
        }
    }
}
