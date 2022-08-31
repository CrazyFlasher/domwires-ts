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
        console.trace(Logger.paintPrefix(Color.TP_ANSI_FG_WHITE, this.caller + " " + this.t),
            Logger.paintArgs(Color.TP_ANSI_BOLD_ON, ...args));

        return this;
    }

    public override warn(...args: unknown[]): ILogger
    {
        console.warn(Logger.paintPrefix(Color.TP_ANSI_FG_WHITE, this.caller + " " + this.t),
            Logger.paintArgs(Color.TP_ANSI_FG_YELLOW, ...args));

        return this;
    }

    public override debug(...args: unknown[]): ILogger
    {
        console.debug(Logger.paintPrefix(Color.TP_ANSI_FG_WHITE, this.caller + " " + this.t),
            Logger.paintArgs(Color.TP_ANSI_BG_YELLOW, ...args));

        return this;
    }

    public override error(...args: unknown[]): ILogger
    {
        console.error(Logger.paintPrefix(Color.TP_ANSI_FG_WHITE, this.caller + " " + this.t),
            Logger.paintArgs(Color.TP_ANSI_FG_RED, ...args));

        return this;
    }

    public override fatal(...args: unknown[]): ILogger
    {
        console.error(Logger.paintPrefix(Color.TP_ANSI_FG_WHITE, this.caller + " " + this.t),
            Logger.paintArgs(Color.TP_ANSI_BG_RED, ...args));

        return this;
    }

    public override info(...args: unknown[]): ILogger
    {
        console.info(Logger.paintPrefix(Color.TP_ANSI_RESET, this.caller + " " + this.t),
            Logger.paintArgs(Color.TP_ANSI_FG_GREEN, ...args));

        return this;
    }

    private get caller(): string
    {
        try
        {
            throw new Error();
        } catch (e)
        {
            if (e instanceof Error)
            {
                const stack = (e as Error).stack;

                if (!stack) return "";

                const arr = stack.split("\n");
                let result = arr.length > this._stackLineIndex ? arr[this._stackLineIndex] : "";
                if (result.length > 4)
                {
                    result = result.split("(")[1].split(")")[0];
                }

                return result;
            }

            return "";
        }
    }

    private static paintPrefix(color: string, prefix: string): string
    {
        return "\x1b[" + color + "m" + prefix + "\x1b[0m";
    }

    private static paintArgs(color: string, ...args: unknown[]): string
    {
        let argsStr = "";
        args.map(value => argsStr += value + " ");

        return '\x1b[' + color + 'm' + argsStr + '\x1b[0m';
    }
}

class Color
{
    public static readonly TP_ANSI_RESET: string = "0";
    public static readonly TP_ANSI_BOLD_ON: string = "1";
    public static readonly TP_ANSI_INVERSE_ON: string = "7";
    public static readonly TP_ANSI_BOLD_OFF: string = "22";
    public static readonly TP_ANSI_FG_BLACK: string = "30";
    public static readonly TP_ANSI_FG_RED: string = "31";
    public static readonly TP_ANSI_FG_GREEN: string = "32";
    public static readonly TP_ANSI_FG_YELLOW: string = "33";
    public static readonly TP_ANSI_FG_BLUE: string = "34";
    public static readonly TP_ANSI_FG_MAGENTA: string = "35";
    public static readonly TP_ANSI_FG_CYAN: string = "36";
    public static readonly TP_ANSI_FG_WHITE: string = "37";
    public static readonly TP_ANSI_BG_RED: string = "41";
    public static readonly TP_ANSI_BG_GREEN: string = "42";
    public static readonly TP_ANSI_BG_YELLOW: string = "43";
    public static readonly TP_ANSI_BG_BLUE: string = "44";
    public static readonly TP_ANSI_BG_MAGENTA: string = "45";
    public static readonly TP_ANSI_BG_CYAN: string = "46";
    public static readonly TP_ANSI_BG_WHITE: string = "47";
}