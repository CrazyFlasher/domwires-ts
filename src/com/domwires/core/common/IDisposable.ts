export interface IDisposableImmutable
{
    /**
     * True if object has already been disposed.
     */
    get isDisposed(): boolean;
}

export interface IDisposable extends IDisposableImmutable
{
    /**
     * Removes all references, objects. After that object is ready to be cleaned by GC.
     */
    dispose(): void;
}