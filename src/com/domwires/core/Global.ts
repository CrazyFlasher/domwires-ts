/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-type-assertion/no-type-assertion */

import {Logger, LogLevel} from "../logger/ILogger";
import * as process from "process";
import * as dotenv from "dotenv";

dotenv.config();

export type Class<T> = new(...args: T[]) => T;

export type Type<T = any> = string | Class<T>;

const logger = new Logger(!process.env.DEBUG ? LogLevel.ERROR : LogLevel.INFO);

const defaultImplMap: Map<string | Class<any>, Class<any>> = new Map<string | Class<any>, Class<any>>();

export function definableFromString<T>(clazz: Class<T>, alias?: string): void
{
    logger.info("Manually defined classes: " + clazz.name + (alias ? " to alias: " + alias : ""));

    (global as any)[alias ? alias : clazz.name] = clazz;
}

export function getClassFromString<T>(value: string): Class<T>
{
    const clazz = (global as any)[value];

    if (!clazz)
    {
        throw new Error("Cannot get class from string '" + value + "'. Did you call 'definableFromString(value)?");
    }

    return clazz;
}

export function setDefaultImplementation<T>(key: string | Class<T>, value: Class<T>): void
{
    if (defaultImplMap.has(key))
    {
        throw new Error("Default implementation already defined for " + key + " : " + value.name);
    }

    defaultImplMap.set(key, value);
}

export function getDefaultImplementation(key: string | Class<any>): Class<any> | undefined
{
    return typeof key === "string" ? defaultImplMap.get(key) : key;
}

export function instanceOf<T>(object: T, typeName?: string, methodName?: string): object is T
{
    if (typeName)
    {
        return 'is' + typeName in object;
    }

    if (methodName)
    {
        return methodName in object;
    }

    throw new Error("typeName and/or methodName should be specified!");
}