/** Read access to disposal state. */
export interface IDisposableImmutable
{
    /**
     * Whether synchronous disposal has marked the object disposed. Async cleanup may still be pending.
     */
    get isDisposed(): boolean;
}

/** Synchronous teardown contract. Objects with asynchronous cleanup additionally expose close(). */
export interface IDisposable extends IDisposableImmutable
{
    /**
     * Releases owned synchronous state or initiates teardown. Idempotency depends on the implementation:
     * AbstractDisposable throws on repeated disposal; context.close() provides a repeatable async boundary.
     * Disposal does not guarantee garbage collection while external references remain.
     */
    dispose(): void;
}