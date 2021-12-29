/* eslint-disable @typescript-eslint/no-empty-interface */

import {IDisposable, IDisposableImmutable} from "../core/common/IDisposable";
import {AbstractDisposable} from "../core/common/AbstractDisposable";

export interface ILoggerImmutable extends IDisposableImmutable
{

}

export interface ILogger extends ILoggerImmutable, IDisposable
{
    info(...args: unknown[]): ILogger;

    warn(...args: unknown[]): ILogger;

    error(...args: unknown[]): ILogger;

    fatal(...args: unknown[]): ILogger;

    debug(...args: unknown[]): ILogger;

    trace(...args: unknown[]): ILogger;
}

export class Logger extends AbstractDisposable implements ILogger
{
    private get t(): string
    {
        const date = new Date();

        return "[" + date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " - " +
            date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "]";
    }

    public override trace(...args: unknown[]): ILogger
    {
        console.trace(this.t, ...args);

        return this;
    }

    public override warn(...args: unknown[]): ILogger
    {
        console.warn(this.t, ...args);

        return this;
    }

    public override debug(...args: unknown[]): ILogger
    {
        console.debug(this.t, ...args);

        return this;
    }

    public override error(...args: unknown[]): ILogger
    {
        console.error(this.t, ...args);

        return this;
    }

    public override fatal(...args: unknown[]): ILogger
    {
        return this.error(args);
    }

    public override info(...args: unknown[]): ILogger
    {
        console.info(this.t, ...args);

        return this;
    }
}