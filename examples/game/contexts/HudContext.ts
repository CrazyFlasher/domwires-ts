import {AbstractContext} from "../../../src";
import {UpdateHud} from "../commands/UpdateHud";
import {HUD_MODEL, HUD_MODEL_IMMUTABLE, HudImmutable} from "../contracts";
import {LEVEL_LOADED} from "../messages";
import {HudModel} from "../models/HudModel";

export class HudContext extends AbstractContext
{
    public model!: HudImmutable;

    protected override init(): void
    {
        super.init();

        this.model = this.registerModel({
            mutable: HUD_MODEL,
            immutable: HUD_MODEL_IMMUTABLE,
            implementation: HudModel
        });

        this.map(LEVEL_LOADED, UpdateHud);
    }
}
