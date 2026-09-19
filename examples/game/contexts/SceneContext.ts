import {AbstractContext, inject, optional} from "../../../src";
import {TimerLevelLoader} from "../adapters/TimerLevelLoader";
import {Fire} from "../commands/Fire";
import {Load} from "../commands/Load";
import {Tick} from "../commands/Tick";
import {LEVEL_LOADER, SCENE_MODEL, SCENE_MODEL_IMMUTABLE, SCENE_NAME, SceneModelImmutable} from "../contracts";
import {FIRE, LOAD, TICK} from "../messages";
import {SceneModel} from "../models/SceneModel";
import {SceneMediator} from "../mediators/SceneMediator";
import {IGameViewFactory} from "../views/IGameViewFactory";
import {VIEW_FACTORY} from "../views/ViewTokens";

export class SceneContext extends AbstractContext
{
    public model!: SceneModelImmutable;

    @inject(VIEW_FACTORY)
    @optional()
    private viewFactory?: IGameViewFactory;

    protected override init(): void
    {
        super.init();

        this.provide(SCENE_NAME, this.factory.getInstance(SCENE_NAME), ["model"]);

        this.model = this.registerModel({
            mutable: SCENE_MODEL,
            immutable: SCENE_MODEL_IMMUTABLE,
            implementation: SceneModel
        });

        this.provide(LEVEL_LOADER, this.own(this.createAdapter(TimerLevelLoader)), ["command"]);

        this.map(FIRE, Fire);
        this.map(TICK, Tick);
        this.map(LOAD, Load, {concurrency: "latest"});

        if (this.viewFactory)
        {
            this.provide(VIEW_FACTORY, this.viewFactory, ["mediator"]);
            this.createMediator(SceneMediator, "scene");
        }
    }
}
