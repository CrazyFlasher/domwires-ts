/* eslint-disable @typescript-eslint/no-explicit-any */

import {Type} from "../Global";

const lazyBindings: Map<Type, Map<string, any>> = new Map<Type, Map<string, any>>();

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
    let names: Map<string, any> | undefined = lazyBindings.get(serviceIdentifier);

    if (!names)
    {
        names = new Map<string, any>();

        lazyBindings.set(serviceIdentifier, names);
    }

    names.set(getName(name), value);
}

export function hasLazyBinding(serviceIdentifier: Type, name?: string): boolean
{
    const names: Map<string, any> | undefined = lazyBindings.get(serviceIdentifier);

    return names != undefined && names.has(getName(name));
}

export function getLazyBinding<T = unknown>(serviceIdentifier: Type<T>, name?: string): T | undefined
{
    const names: Map<string, any> | undefined = lazyBindings.get(serviceIdentifier);

    return names ? names.get(getName(name)) : undefined;
}

export function clearLazyBindings(): void
{
    lazyBindings.clear();
}
