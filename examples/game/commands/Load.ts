import {AbstractCommand, CommandExecution} from "../../../src";
import {LEVEL_LOADER, LevelLoader, SCENE_MODEL, SceneModelMutable} from "../contracts";

export class Load extends AbstractCommand<{level: string; delay: number}>
{
    public static readonly inject = [SCENE_MODEL, LEVEL_LOADER];

    public constructor(private readonly model: SceneModelMutable, private readonly loader: LevelLoader)
    {
        super();
    }

    public override async execute(input: {level: string; delay: number}, execution: CommandExecution): Promise<void>
    {
        const level = await this.loader.load(input.level, input.delay, execution.signal);

        execution.commit(() => this.model.loaded(level));
    }
}
