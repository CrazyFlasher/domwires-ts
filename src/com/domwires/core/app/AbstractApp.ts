/* eslint-disable no-type-assertion/no-type-assertion */

import {MessageDispatcher} from "../mvc/message/IMessageDispatcher";
import {inject, optional} from "../di/Decorators";

/**
 * Loads a config of the application. Implementations can be platform specific: the default one uses
 * fetch, the node implementation reads a file from the file system.
 */
export type AppConfigLoader = (path: string) => Promise<unknown>;

export abstract class AbstractApp<TAppConfig = unknown> extends MessageDispatcher
{
    /** Optional platform loader; loadConfig() falls back to fetch when this is absent. */
    @inject("AppConfigLoader") @optional()
    protected configLoader: AppConfigLoader | undefined;

    /** Last successfully loaded configuration; initialized by loadConfig(). */
    protected _appConfigJson!: TAppConfig;

    public get appConfigJson(): TAppConfig
    {
        return this._appConfigJson;
    }

    /**
     * Loads and parses the config. The injected "AppConfigLoader" is used, if it is mapped,
     * otherwise the config is loaded with fetch.
     */
    public async loadConfig(configPath = "./dev.json"): Promise<TAppConfig>
    {
        this.info("Loading app config:", configPath);

        const loader: AppConfigLoader = this.configLoader ?? AbstractApp.loadByFetch;

        try
        {
            this._appConfigJson = await loader(configPath) as TAppConfig;
        }
        catch (e)
        {
            this.fatal("Failed to load app config:", configPath, e);

            throw e;
        }

        return this._appConfigJson;
    }

    private static async loadByFetch(path: string): Promise<unknown>
    {
        const response: Response = await fetch(path);

        if (!response.ok)
        {
            throw new Error("Cannot load config '" + path + "': " + response.status + " " + response.statusText);
        }

        return response.json();
    }
}
