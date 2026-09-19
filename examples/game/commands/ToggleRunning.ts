import {AbstractCommand} from "../../../src";
import {GAME_CLOCK, GameClock} from "../contracts";

export class ToggleRunning extends AbstractCommand<void>
{
    public static readonly inject = [GAME_CLOCK];

    public constructor(private readonly clock: GameClock)
    {
        super();
    }

    public override execute(): void
    {
        this.clock.toggleRunning();
    }
}
