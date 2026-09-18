import {readFile} from "node:fs/promises";
import {AppConfigLoader} from "../core/app/AbstractApp";

/**
 * Creates a config loader, that reads a JSON file from the file system. It is node specific, so it lives
 * outside of the core: a browser bundle stays free of node built-ins.
 */
export function createNodeConfigLoader(): AppConfigLoader
{
    return async (path: string): Promise<unknown> =>
    {
        const content: string = await readFile(path, "utf-8");

        return JSON.parse(content);
    };
}
