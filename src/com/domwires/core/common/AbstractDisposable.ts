import {inject, injectable, optional} from "../di/Decorators";
import {IDisposable} from "./IDisposable";
import {ILogger, markAsOwner} from "../../logger/ILogger";

type LogMethod = "verbose" | "info" | "warn" | "error" | "fatal";

@injectable()
export abstract class AbstractDisposable implements IDisposable, ILogger
{
    @inject("ILogger") @optional()
    protected logger!: ILogger;

    private _isDisposed = false;

    public get isDisposed(): boolean
    {
        return this._isDisposed;
    }

    public dispose(): void
    {
        if (this._isDisposed)
        {
            throw new Error("Object already disposed!");
        }

        this._isDisposed = true;
    }

    public error(...args: unknown[]): ILogger
    {
        this.callLogger("error", args);

        return this;
    }

    public fatal(...args: unknown[]): ILogger
    {
        this.callLogger("fatal", args);

        return this;
    }

    public verbose(...args: unknown[]): ILogger
    {
        this.callLogger("verbose", args);

        return this;
    }

    public info(...args: unknown[]): ILogger
    {
        this.callLogger("info", args);

        return this;
    }

    public warn(...args: unknown[]): ILogger
    {
        this.callLogger("warn", args);

        return this;
    }

    private callLogger(method: LogMethod, args: unknown[]): void
    {
        const logger: ILogger | undefined = this.logger;

        if (!logger)
        {
            return;
        }

        logger[method](markAsOwner(this.constructor.name), ...args);
    }
}
