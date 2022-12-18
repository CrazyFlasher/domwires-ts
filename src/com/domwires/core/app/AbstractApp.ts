import {MessageDispatcher} from "../mvc/message/IMessageDispatcher";
import fs from "fs";
import * as dotenv from "dotenv";
import {isNode} from "browser-or-node";

dotenv.config();

export abstract class AbstractApp<TAppConfig = unknown> extends MessageDispatcher
{
    protected _appConfigJson!: TAppConfig;

    public get appConfigJson(): TAppConfig
    {
        return this._appConfigJson;
    }

    public loadConfig(configLoaded?: (success: boolean) => void): void
    {
        const configPath = process.env.CONFIG || "./dev" + ".json";

        try
        {
            this.warn("Loading app config:", configPath);

            if (isNode)
            {
                this._appConfigJson = JSON.parse(fs.readFileSync(configPath, "utf-8"));

                if (configLoaded) configLoaded(true);
            }
            else
            {
                fetch(configPath).then(() =>
                {
                    if (configLoaded) configLoaded(true);
                }).catch(() =>
                {
                    if (configLoaded) configLoaded(false);
                });
            }
        } catch (e)
        {
            this.warn("Failed to load app config:", configPath);

            if (configLoaded) configLoaded(false);
        }
    }
}