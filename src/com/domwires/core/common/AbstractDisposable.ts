import {inject, injectable, optional} from "inversify";
import {IDisposable} from "./IDisposable";
import {ILogger} from "../../logger/ILogger";

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

    public debug(...args: unknown[]): ILogger
    {
        if (this.logger) this.callLogger(this.logger.debug.bind(this.logger), ...args);

        return this;
    }

    public error(...args: unknown[]): ILogger
    {
        if (this.logger) this.callLogger(this.logger.error.bind(this.logger), ...args);

        return this;
    }

    public fatal(...args: unknown[]): ILogger
    {
        if (this.logger) this.callLogger(this.logger.fatal.bind(this.logger), ...args);

        return this;
    }

    public info(...args: unknown[]): ILogger
    {
        if (this.logger) this.callLogger(this.logger.info.bind(this.logger), ...args);

        return this;
    }

    public trace(...args: unknown[]): ILogger
    {
        if (this.logger) this.callLogger(this.logger.trace.bind(this.logger), ...args);

        return this;
    }

    public warn(...args: unknown[]): ILogger
    {
        if (this.logger) this.callLogger(this.logger.warn.bind(this.logger), ...args);

        return this;
    }

    private callLogger(method: (...args: unknown[]) => void, ...args: unknown[]): void
    {
        if (!this.logger) return;

        const currentStackLineIndex = this.stackLineIndex;
        this.setStackLineIndex(5);
        method(...args);
        this.setStackLineIndex(currentStackLineIndex);
    }

    public setStackLineIndex(value: number): void
    {
        if (this.logger) this.logger.setStackLineIndex(value);
    }

    public get stackLineIndex(): number
    {
        return this.logger ? this.logger.stackLineIndex : 0;
    }
}