/* eslint-disable unicorn/no-useless-spread -- Abort listeners can change the running set. */
import {CommandCancelledError, CommandConcurrency} from "./CommandOptions";

type Work = (controller: AbortController) => boolean | Promise<boolean>;
type Waiting = {work: Work; resolve: (allowed: boolean | PromiseLike<boolean>) => void; reject: (error: unknown) => void};

/** One scheduler per mapping. Synchronous work stays synchronous, including serial work. */
export class CommandScheduler
{
    private readonly running = new Set<AbortController>();
    private readonly waiting: Waiting[] = [];
    private closed = false;
    private pumping = false;
    private generation = 0;

    public constructor(public readonly policy: CommandConcurrency) {}
    public get busy(): boolean { return this.running.size > 0; }

    public schedule(work: Work): boolean | Promise<boolean>
    {
        if (this.closed) return false;
        const generation = ++this.generation;
        if (this.policy === "drop" && this.busy) return false;
        if (this.policy === "serial" && this.busy)
            return new Promise((resolve, reject) => this.waiting.push({work, resolve, reject}));
        if (this.policy === "latest")
            for (const controller of [...this.running]) controller.abort("superseded");
        // An abort listener may have unmapped the registration.
        return this.closed || (this.policy === "latest" && generation !== this.generation) ? false : this.begin(work);
    }

    /** Consuming once cancels queued requests but allows the reserved invocation to finish. */
    public close(abortRunning = true): void
    {
        this.closed = true;
        for (const entry of this.waiting.splice(0)) entry.reject(new CommandCancelledError("mapping removed"));
        if (abortRunning) for (const controller of [...this.running]) controller.abort("mapping removed");
    }

    private begin(work: Work): boolean | Promise<boolean>
    {
        const controller = new AbortController();
        this.running.add(controller);
        const finish = (): void => { this.running.delete(controller); this.pump(); };
        try
        {
            const result = work(controller);
            if (result instanceof Promise) return result.finally(finish);
            finish();
            return result;
        }
        catch (error) { finish(); throw error; }
    }

    private pump(): void
    {
        if (this.pumping || this.closed) return;
        this.pumping = true;
        try
        {
            while (!this.busy && this.waiting.length)
            {
                const entry = this.waiting.shift()!;
                try { entry.resolve(this.begin(entry.work)); }
                catch (error) { entry.reject(error); }
            }
        }
        finally { this.pumping = false; }
    }
}
