/* eslint-disable @typescript-eslint/no-empty-interface */

import {IDisposable, IDisposableImmutable} from "../core/common/IDisposable";
import {AbstractDisposable} from "../core/common/AbstractDisposable";

export interface ILoggerImmutable extends IDisposableImmutable
{

}

export interface ILogger extends ILoggerImmutable, IDisposable
{
    setStackLineIndex(value: number): void;

    get stackLineIndex(): number;

    info(...args: unknown[]): ILogger;

    warn(...args: unknown[]): ILogger;

    error(...args: unknown[]): ILogger;

    fatal(...args: unknown[]): ILogger;

    debug(...args: unknown[]): ILogger;

    trace(...args: unknown[]): ILogger;
}

export class Logger extends AbstractDisposable implements ILogger
{
    private _stackLineIndex = 3;

    private get t(): string
    {
        const date = new Date();

        return "[" + date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " - " +
            date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "]";
    }

    public override setStackLineIndex(value: number): void
    {
        this._stackLineIndex = value;
    }

    public override get stackLineIndex(): number
    {
        return this._stackLineIndex;
    }

    public override trace(...args: unknown[]): ILogger
    {
        console.trace(this.caller + " " + this.t, ...args);

        return this;
    }

    public override warn(...args: unknown[]): ILogger
    {
        console.warn(this.caller + " " + this.t, ...args);

        return this;
    }

    public override debug(...args: unknown[]): ILogger
    {
        console.debug(this.caller + " " + this.t, ...args);

        return this;
    }

    public override error(...args: unknown[]): ILogger
    {
        console.error(this.caller + " " + this.t, ...args);

        return this;
    }

    public override fatal(...args: unknown[]): ILogger
    {
        return this.error(args);
    }

    public override info(...args: unknown[]): ILogger
    {
        console.info(this.caller + " " + this.t, ...args);

        return this;
    }

    private get caller(): string
    {
        try
        {
            throw new Error();
        } catch (e)
        {
            if (!e.stack) return "";

            const arr = e.stack.split("\n");
            let result = arr.length > this._stackLineIndex ? arr[this._stackLineIndex] : "";
            if (result.length > 4)
            {
                result = result.split("(")[1].split(")")[0];
            }

            return result;
        }
    }

}