/** Opt-in lifetime hooks for an explicitly owned object. */
export type Resource = {
    /** Called in registration order by start(); pass the signal to cancellable initialization. */
    start?(signal: AbortSignal): void | PromiseLike<void>;
    /** Cleanup used when close is absent. */
    dispose?(): void | PromiseLike<void>;
    /** Preferred cleanup hook when both close and dispose exist. */
    close?(): void | PromiseLike<void>;
};
/** Cleanup callback, awaited when it returns a promise-like value. */
export type Cleanup = () => void | PromiseLike<void>;

/** Own explicitly registered resources; borrowed dependencies are never closed implicitly. */
export class ResourceScope
{
    private readonly entries: Array<{resource: Resource; starting?: Promise<void>}> = [];
    private readonly cancellation = new AbortController();
    private starting?: Promise<void>;
    private closing?: Promise<void>;
    private closed = false;

    /**
     * Transfers cleanup responsibility and returns the same object.
     * Requires close() or dispose(); rejects duplicate objects and registration after closure.
     * Startable resources must be registered before start() begins.
     */
    public own<T extends Resource>(resource: T): T
    {
        if (this.closed || (this.starting && resource.start)) throw new Error("Register startable resources before starting the scope");
        if (!resource.dispose && !resource.close) throw new Error("An owned resource needs dispose() or close()");
        if (this.entries.some(entry => entry.resource === resource)) throw new Error("Resource is already owned");
        this.entries.push({resource});
        return resource;
    }

    /** Registers a cleanup callback; callbacks and resources share reverse registration order. */
    public defer(cleanup: Cleanup): void { this.own({dispose: cleanup}); }

    /** Starts owned resources sequentially once; failure closes this scope before rejecting. */
    public start(): Promise<void>
    {
        if (this.closed) return Promise.reject(new Error("Resource scope already closed"));
        if (this.starting) return this.starting;
        this.starting = (async () => {
            try
            {
                for (const entry of this.entries)
                {
                    this.cancellation.signal.throwIfAborted();
                    entry.starting = Promise.resolve(entry.resource.start?.(this.cancellation.signal));
                    await entry.starting;
                }
            }
            catch (error)
            {
                try { await this.close(); }
                catch (cleanupError) { throw new AggregateError([error, cleanupError], "Resource start and cleanup failed"); }
                throw error;
            }
        })();
        return this.starting;
    }

    /** Initiates close without waiting. Call close() to await completion and observe cleanup failures. */
    public dispose(): void
    {
        this.close().catch(() => undefined);
    }

    /**
     * Aborts startup and cleans resources in reverse registration order; repeated calls share a promise.
     * Waits for an in-progress resource start before cleaning that resource.
     * Attempts remaining cleanup after failures, then rejects with AggregateError.
     */
    public close(): Promise<void>
    {
        if (this.closing) return this.closing;
        this.closed = true;
        this.cancellation.abort();
        const errors: unknown[] = [];
        const entries = [...this.entries].reverse();
        this.entries.length = 0;
        let index = 0;
        const next = (): void | Promise<void> => {
            while (index < entries.length)
            {
                const entry = entries[index++]!;
                const cleanup = (): void | PromiseLike<void> =>
                    entry.resource.close ? entry.resource.close() : entry.resource.dispose?.();
                try
                {
                    const result = entry.starting ? entry.starting.then(cleanup, cleanup) : cleanup();
                    if (result && typeof result.then === "function")
                        return Promise.resolve(result).then(next, error => { errors.push(error); return next(); });
                }
                catch (error) { errors.push(error); }
            }
        };
        this.closing = Promise.resolve(next()).then(() => {
            if (errors.length) throw new AggregateError(errors, "Resource cleanup failed");
        });
        return this.closing;
    }
}
