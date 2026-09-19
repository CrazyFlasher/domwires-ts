import {Factory} from "../../src";
import {GameContext} from "./contexts/GameContext";
import {IGameViewFactory} from "./views/IGameViewFactory";
import {VIEW_FACTORY} from "./views/ViewTokens";

/** Omit the view factory to run the same contexts without a DOM. */
export function createGame(viewFactory?: IGameViewFactory): GameContext
{
    const factory = new Factory();

    if (viewFactory)
    {
        factory.mapToValue(VIEW_FACTORY, viewFactory);
    }

    const game = factory.getInstance(GameContext);

    game.defer(() => factory.dispose());

    return game;
}
