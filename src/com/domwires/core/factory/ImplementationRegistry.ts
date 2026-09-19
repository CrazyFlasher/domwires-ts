import {Class} from "../Global";

/** Explicit config aliases. Does not read or write globalThis or depend on class names. */
export class ImplementationRegistry
{
    private readonly implementations = new Map<string, Class<unknown>>();
    /** Creates a local registry with optional inherited alias lookup. */
    public constructor(private readonly parent?: ImplementationRegistry) {}

    /** Registers a local alias; rejects a duplicate local alias but may shadow an inherited one. */
    public register<T>(alias: string, implementation: Class<T>): this
    {
        if (this.implementations.has(alias)) throw new Error("Implementation alias already registered: " + alias);
        this.implementations.set(alias, implementation);
        return this;
    }

    /** Looks up a local alias, then the parent chain; undefined when absent. */
    public get(alias: string): Class<unknown> | undefined
    {
        return this.implementations.get(alias) ?? this.parent?.get(alias);
    }

    /** Creates a child registry; child registration never changes its parent. */
    public createScope(): ImplementationRegistry { return new ImplementationRegistry(this); }
}
