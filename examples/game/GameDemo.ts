import {createGame} from "./Game";
import {GameContext} from "./contexts/GameContext";
import {CLOSE_DEMO, RESTART_DEMO, TOGGLE_TRACE} from "./messages";
import {IGameViewFactory} from "./views/IGameViewFactory";

/** Starts and restarts contexts. Mediators own all views and report input through the context. */
export class GameDemo
{
    private game?: GameContext;
    private traced = false;
    private restarting = false;
    private disposed = false;

    public constructor(private readonly viewFactory: IGameViewFactory)
    {
    }

    public start(): Promise<void>
    {
        return this.mount();
    }

    private async mount(): Promise<void>
    {
        const game = createGame(this.viewFactory);

        this.game = game;

        try
        {
            game.own(game.subscribe(RESTART_DEMO, () =>
            {
                void this.restart().catch(error => console.error("Could not restart the demo:", error));
            }));
            game.own(game.subscribe(CLOSE_DEMO, () => this.dispose()));

            game.own(game.subscribe(TOGGLE_TRACE, () =>
            {
                this.traced = !this.traced;
                game.setTracing(this.traced);
            }));

            game.setTracing(this.traced);

            await game.start();
        }
        catch (error)
        {
            await game.close();
            throw error;
        }
    }

    private async restart(): Promise<void>
    {
        if (this.restarting || this.disposed)
        {
            return;
        }

        this.restarting = true;

        try
        {
            await this.game?.close();

            if (!this.disposed)
            {
                await this.mount();
            }
        }
        finally
        {
            this.restarting = false;
        }
    }

    public dispose(): void
    {
        if (this.disposed)
        {
            return;
        }

        this.disposed = true;

        if (this.game && !this.game.isDisposed)
        {
            this.game.dispose();
        }
    }
}
