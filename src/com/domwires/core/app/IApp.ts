import {MessageDispatcher, MessageType} from "../mvc/message/IMessageDispatcher";

export class AppMessageType extends MessageType
{
    public static readonly INITIALIZED: AppMessageType = new AppMessageType();
}

export abstract class AbstractApp<TAppConfig = unknown> extends MessageDispatcher
{
    protected _appConfigJson!: TAppConfig;

    public get appConfigJson(): TAppConfig
    {
        return this._appConfigJson;
    }

    public async init(): Promise<void>
    {
        try
        {
            this.warn("Loading app config:", this.configPath);

            const fileContent = await this.readFile();

            this._appConfigJson = JSON.parse(fileContent);

            this.initComplete();

        } catch (e)
        {
            this.warn("Failed to load app config:", this.configPath);
        }
    }

    protected readFile(): Promise<string>
    {
        throw new Error("Override!");
    }

    protected get configPath(): string
    {
        throw new Error("Override!");
    }

    private initComplete(): void
    {
        this.dispatchMessage(AppMessageType.INITIALIZED);
    }
}

export abstract class AbstractClientApp<TAppConfig = unknown> extends AbstractApp<TAppConfig>
{
    protected override get configPath(): string
    {
        return (process.env.NODE_ENV == "development" ? "dev" : "prod") + ".json";
    }

    protected override async readFile(): Promise<string>
    {
        const response = await fetch(this.configPath);
        return response.text();
    }
}