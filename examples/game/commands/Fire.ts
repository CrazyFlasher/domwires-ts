import {AbstractCommand} from "../../../src";
import {SCENE_MODEL, SceneModelMutable} from "../contracts";

export class Fire extends AbstractCommand<void>
{
    public static readonly inject = [SCENE_MODEL];

    public constructor(private readonly model: SceneModelMutable)
    {
        super();
    }

    public override execute(): void
    {
        this.model.fire();
    }
}
