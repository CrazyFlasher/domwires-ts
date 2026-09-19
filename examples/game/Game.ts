import {Factory} from "../../src";
import {GameContext} from "./contexts/GameContext";

export function createGame(): GameContext
{
    const factory = new Factory();
    const game = factory.getInstance(GameContext);

    game.defer(() => factory.dispose());

    return game;
}
