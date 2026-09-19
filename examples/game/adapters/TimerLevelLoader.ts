import {LevelLoader} from "../contracts";
import {gameResources} from "../gameResources";

/** An infrastructure adapter owns the timer; the command decides what to load and where to commit. */
export class TimerLevelLoader implements LevelLoader
{
    private closed = false;

    public constructor()
    {
        gameResources.adapters++;
    }

    public load(level: string, delay: number, signal: AbortSignal): Promise<string>
    {
        if (this.closed)
        {
            return Promise.reject(new Error("Loader is closed"));
        }

        if (signal.aborted)
        {
            return Promise.reject(signal.reason);
        }

        gameResources.requests++;

        return new Promise((resolve, reject) =>
        {
            const cleanup = (): void =>
            {
                clearTimeout(timer);
                signal.removeEventListener("abort", abort);
                gameResources.requests--;
            };

            const abort = (): void =>
            {
                cleanup();
                reject(signal.reason);
            };

            const timer = setTimeout(() =>
            {
                cleanup();
                resolve(level);
            }, delay);

            signal.addEventListener("abort", abort, {once: true});
        });
    }

    public close(): void
    {
        if (!this.closed)
        {
            this.closed = true;
            gameResources.adapters--;
        }
    }
}
