import {AbstractApp} from "./IApp";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";

export abstract class AbstractServerApp<TAppConfig = unknown> extends AbstractApp<TAppConfig>
{
    public override async init()
    {
        dotenv.config();

        await super.init();
    }

    protected override get configPath(): string
    {
        return path.resolve(__dirname, process.env.CONFIG || "dev" + ".json");
    }

    protected override async readFile(): Promise<string>
    {
        return fs.readFile(this.configPath, "utf-8");
    }
}