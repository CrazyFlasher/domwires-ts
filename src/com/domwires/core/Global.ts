/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-type-assertion/no-type-assertion */

import {Logger, LogLevel} from "../logger/ILogger";
import type {IHierarchyObject} from "./mvc/hierarchy/IHierarchyObject";
import type {IHierarchyObjectContainer} from "./mvc/hierarchy/IHierarchyObjectContainer";
import type {IContext} from "./mvc/context/IContext";

export type Class<T> = new(...args: any[]) => T;

export type Type<T = any> = string | Class<T>;

/**
 * Runtime brands. They are set on prototypes of the framework classes and allow fast
 * and safe checks instead of duck typing by method names.
 */
export const IS_HIERARCHY_OBJECT = Symbol("domwires:isHierarchyObject");
export const IS_HIERARCHY_OBJECT_CONTAINER = Symbol("domwires:isHierarchyObjectContainer");
export const IS_CONTEXT = Symbol("domwires:isContext");

export function isHierarchyObject(value: unknown): value is IHierarchyObject
{
    return value != undefined && Reflect.get(Object(value), IS_HIERARCHY_OBJECT) === true;
}

export function isHierarchyObjectContainer(value: unknown): value is IHierarchyObjectContainer
{
    return value != undefined && Reflect.get(Object(value), IS_HIERARCHY_OBJECT_CONTAINER) === true;
}

export function isContext(value: unknown): value is IContext
{
    return value != undefined && Reflect.get(Object(value), IS_CONTEXT) === true;
}

let logger: Logger = new Logger(LogLevel.NONE);

/**
 * Sets the level of the global logger, that is used by the framework itself (for example,
 * while mapping classes from a config).
 */
export function setGlobalLogLevel(value: LogLevel): void
{
    logger = new Logger(value);
}

const defaultImplMap: Map<string | Class<any>, Class<any>> = new Map<string | Class<any>, Class<any>>();

export function definableFromString<T>(clazz: Class<T>, alias?: string): void
{
    logger.verbose("Manually defined classes: " + clazz.name + (alias ? " to alias: " + alias : ""));

    const targets: any = globalThis;

    targets[alias ? alias : clazz.name] = clazz;
}

export function getClassFromString<T>(value: string): Class<T>
{
    const clazz = (globalThis as any)[value];

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

