import {Type} from "../Global";

const lazyBindings: Map<Type, Map<string, unknown>> = new Map<Type, Map<string, unknown>>();

const DEFAULT_NAME = "";

function getName(name?: string): string
{
    return name === undefined ? DEFAULT_NAME : name;
}

/**
 * Puts a value into the global lazy registry. Values from the registry are available for @lazyInject properties.
 */
export function setLazyBinding<T>(serviceIdentifier: Type<T>, value: T, name?: string): void
{
    let names: Map<string, unknown> | undefined = lazyBindings.get(serviceIdentifier);

    if (!names)
    {
        names = new Map<string, unknown>();

        lazyBindings.set(serviceIdentifier, names);
    }

    names.set(getName(name), value);
}

export function hasLazyBinding(serviceIdentifier: Type, name?: string): boolean
{
    const names: Map<string, unknown> | undefined = lazyBindings.get(serviceIdentifier);

    return names != undefined && names.has(getName(name));
}

export function getLazyBinding<T = unknown>(serviceIdentifier: Type<T>, name?: string): T
{
    const names: Map<string, unknown> | undefined = lazyBindings.get(serviceIdentifier);
    const value: unknown = names ? names.get(getName(name)) : undefined;

    // the value is checked by hasLazyBinding() before the call
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return value;
}

export function clearLazyBindings(): void
{
    lazyBindings.clear();
}
