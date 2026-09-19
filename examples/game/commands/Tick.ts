import {AbstractCommand} from "../../../src";
import {SCENE_MODEL, SceneModelMutable} from "../contracts";

export class Tick extends AbstractCommand<{delta: number}>
{
    public static readonly inject = [SCENE_MODEL];

    public constructor(private readonly model: SceneModelMutable)
    {
        super();
    }

    public override execute(input: {delta: number}): void
    {
        this.model.tick(input.delta);
    }
}
