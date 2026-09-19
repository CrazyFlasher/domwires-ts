import {AbstractCommand} from "../../../src";
import {HUD_MODEL, HudMutable} from "../contracts";

export class UpdateHud extends AbstractCommand<{level: string}>
{
    public static readonly inject = [HUD_MODEL];

    public constructor(private readonly model: HudMutable)
    {
        super();
    }

    public override execute(input: {level: string}): void
    {
        this.model.update(input.level);
    }
}
