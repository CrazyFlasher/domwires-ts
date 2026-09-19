import {AbstractCommand, CommandExecution} from "../../../src";
import {SCENE_SWITCHER, SceneSwitcher} from "../contracts";

export class SwitchScene extends AbstractCommand<{scene: string}>
{
    public static readonly inject = [SCENE_SWITCHER];

    public constructor(private readonly game: SceneSwitcher)
    {
        super();
    }

    public override execute(input: {scene: string}, execution: CommandExecution): Promise<void>
    {
        return this.game.switchScene(input.scene, execution);
    }
}
