import {inject, injectable, optional} from "inversify";
import {IDisposable} from "./IDisposable";
import {ILogger} from "../../logger/ILogger";

@injectable()
export abstract class AbstractDisposable implements IDisposable, ILogger
{
    @inject("ILogger") @optional()
    protected logger: ILogger;

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

    public debug(...args: unknown[]): ILogger
    {
        if (this.logger) this.logger.debug(...args);

        return this;
    }

    public error(...args: unknown[]): ILogger
    {
        if (this.logger) this.logger.error(...args);

        return this;
    }

    public fatal(...args: unknown[]): ILogger
    {
        if (this.logger) this.logger.fatal(...args);

        return this;
    }

    public info(...args: unknown[]): ILogger
    {
        if (this.logger) this.logger.info(...args);

        return this;
    }

    public trace(...args: unknown[]): ILogger
    {
        if (this.logger) this.logger.trace(...args);

        return this;
    }

    public warn(...args: unknown[]): ILogger
    {
        if (this.logger) this.logger.warn(...args);

        return this;
    }
}