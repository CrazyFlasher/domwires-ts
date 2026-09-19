/* eslint-disable @typescript-eslint/no-explicit-any */

import {Class, Type} from "../Global";

/**
 * Metadata is stored on the class constructor itself, so every class holds only
 * the injections, that are declared directly on it.
 */
const PROPERTY_INJECTIONS = Symbol("domwires:propertyInjections");
const POST_CONSTRUCT = Symbol("domwires:postConstruct");
let injectionPlans = new WeakMap<Class<unknown>, ReadonlyArray<PropertyInjection>>();

export type PropertyInjection = {
    readonly propertyKey: string | symbol;
    serviceIdentifier?: Type;
    named?: string;
    optional: boolean;
    lazy: boolean;
};

function getOwnInjections(clazz: any): PropertyInjection[]
{
    // only own metadata is used: an own property check is required here, because metadata
    // is stored on the constructor and a plain read would find the list of a base class
    if (!Object.prototype.hasOwnProperty.call(clazz, PROPERTY_INJECTIONS))
    {
        Reflect.set(clazz, PROPERTY_INJECTIONS, []);
    }

    return Reflect.get(clazz, PROPERTY_INJECTIONS);
}

function getInjection(target: object, propertyKey: string | symbol): PropertyInjection
{
    // Also supports applying decorators programmatically after a class was first instantiated.
    injectionPlans = new WeakMap();
    const injections: PropertyInjection[] = getOwnInjections(Reflect.get(target, "constructor"));
    let injection: PropertyInjection | undefined = undefined;

    for (const item of injections)
    {
        if (item.propertyKey === propertyKey)
        {
            injection = item;

            break;
        }
    }

    if (!injection)
    {
        injection = {propertyKey: propertyKey, optional: false, lazy: false};

        injections.push(injection);
    }

    return injection;
}

/**
 * Marks a property to be injected with an instance or a value, bound to the given service identifier.
 */
export function inject(serviceIdentifier: Type): PropertyDecorator
{
    return (target: object, propertyKey: string | symbol): void =>
    {
        getInjection(target, propertyKey).serviceIdentifier = serviceIdentifier;
    };
}

/**
 * Specifies the binding name. Use together with `@inject` or `@lazyInject`.
 */
export function named(name: string): PropertyDecorator
{
    return (target: object, propertyKey: string | symbol): void =>
    {
        getInjection(target, propertyKey).named = name;
    };
}

/**
 * Skips injection, if there is no binding, instead of throwing an error.
 */
export function optional(): PropertyDecorator
{
    return (target: object, propertyKey: string | symbol): void =>
    {
        getInjection(target, propertyKey).optional = true;
    };
}

/**
 * Resolves the property from the object's own dependency scope on access.
 */
export function lazyInject(serviceIdentifier: Type): PropertyDecorator
{
    return (target: object, propertyKey: string | symbol): void =>
    {
        const injection: PropertyInjection = getInjection(target, propertyKey);

        injection.serviceIdentifier = serviceIdentifier;
        injection.lazy = true;
    };
}

/**
 * Same as @lazyInject, but with the name of the binding.
 */
export function lazyInjectNamed(serviceIdentifier: Type, name: string): PropertyDecorator
{
    return (target: object, propertyKey: string | symbol): void =>
    {
        const injection: PropertyInjection = getInjection(target, propertyKey);

        injection.serviceIdentifier = serviceIdentifier;
        injection.lazy = true;
        injection.named = name;
    };
}

/**
 * Marks a method to be called right after all properties are injected.
 */
export function postConstruct(): MethodDecorator
{
    return (target: object, propertyKey: string | symbol): void =>
    {
        Reflect.set(Reflect.get(target, "constructor"), POST_CONSTRUCT, propertyKey);
    };
}

/**
 * Kept for API compatibility with the previous binder: mappings don't require a class to be marked as injectable.
 */
export function injectable(): ClassDecorator
{
    return (): void =>
    {
        // no-op: the binder works with explicit service identifiers only
    };
}

/**
 * Returns injections of the whole class hierarchy: from the base class to the given one.
 */
export function getPropertyInjections(type: Class<unknown>): ReadonlyArray<PropertyInjection>
{
    const cached = injectionPlans.get(type);
    if (cached) return cached;
    const chain: any[] = [];
    let current: any = type;

    while (current && current !== Function.prototype)
    {
        chain.push(current);

        current = Object.getPrototypeOf(current);
    }

    const injections: PropertyInjection[] = [];

    for (let i = chain.length - 1; i >= 0; i--)
    {
        const ownInjections: PropertyInjection[] | undefined =
            Object.prototype.hasOwnProperty.call(chain[i], PROPERTY_INJECTIONS)
                ? Reflect.get(chain[i], PROPERTY_INJECTIONS)
                : undefined;

        if (ownInjections)
        {
            for (const injection of ownInjections)
            {
                const existing = injections.findIndex(item => item.propertyKey === injection.propertyKey);
                if (existing >= 0) injections[existing] = injection;
                else injections.push(injection);
            }
        }
    }

    injectionPlans.set(type, injections);
    return injections;
}

/**
 * Returns the name of the method, that is marked as a post construct hook, or undefined, if there is none.
 */
export function getPostConstructMethodName(type: Class<unknown>): string | symbol | undefined
{
    let current: any = type;

    while (current && current !== Function.prototype)
    {
        const methodName: string | symbol | undefined =
            Object.prototype.hasOwnProperty.call(current, POST_CONSTRUCT)
                ? Reflect.get(current, POST_CONSTRUCT)
                : undefined;

        if (methodName)
        {
            return methodName;
        }

        current = Object.getPrototypeOf(current);
    }

    return undefined;
}
