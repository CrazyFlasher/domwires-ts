import {Logger} from "tslog";

export type Class<T> = new(...args: any[]) => T;

export const logger: Logger = new Logger();

const defaultImplMap: Map<string | Class<any>, Class<any>> = new Map<string | Class<any>, Class<any>>();

export function definableFromString<T>(clazz:Class<T>): void
{
    logger.info("Manually defined classes: ", clazz.name);
    (global as any)[clazz.name] = clazz;
}

export function setDefaultImplementation(key: string | Class<any>, value: Class<any>): void
{
    if (defaultImplMap.has(key))
    {
        throw new Error("Default implementation already defined for " + key + " : " + value.name);
    }

    defaultImplMap.set(key, value);
}

export function getDefaultImplementation(key: string | Class<any>): Class<any>
{
    return typeof key === "string" ? defaultImplMap.get(key) : key;
}