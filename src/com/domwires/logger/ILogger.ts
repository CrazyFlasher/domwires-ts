import {IDisposable, IDisposableImmutable} from "../core/common/IDisposable";
import {Enum} from "../core/Enum";

export class LogLevel extends Enum
{
    public static readonly VERBOSE: LogLevel = new LogLevel(4);
    public static readonly INFO: LogLevel = new LogLevel(3);
    public static readonly WARN: LogLevel = new LogLevel(2);
    public static readonly ERROR: LogLevel = new LogLevel(1);
    public static readonly NONE: LogLevel = new LogLevel();

    private readonly _level: number;

    private constructor(level = 0)
    {
        super();

        this._level = level;
    }

    public get level(): number
    {
        return this._level;
    }
}

const OWNER_PREFIX = "__<!$";
const OWNER_SUFFIX = "$>!__";

/**
 * Marks the first argument of a log message as the name of the object, the message came from.
 */
export function markAsOwner(name: string): string
{
    return OWNER_PREFIX + name + OWNER_SUFFIX;
}

/** Read access to logger disposal state. */
export interface ILoggerImmutable extends IDisposableImmutable
{

}

/** Level-filtered logging. Methods return the logger for chaining. */
export interface ILogger extends ILoggerImmutable, IDisposable
{
    /**
     * Writes at verbose level when enabled.
     */
    verbose(...args: unknown[]): ILogger;

    /**
     * Writes at info level when enabled.
     */
    info(...args: unknown[]): ILogger;

    /**
     * Writes at warning level when enabled.
     */
    warn(...args: unknown[]): ILogger;

    /**
     * Writes at error level when enabled.
     */
    error(...args: unknown[]): ILogger;

    /**
     * Writes a fatal entry when error-level logging is enabled; does not throw the supplied arguments.
     */
    fatal(...args: unknown[]): ILogger;
}

/**
 * Logger with the level based filtering: filtered out messages cost nothing, because nothing
 * is evaluated for them. Creation of a stack trace (to detect a call site) is opt-in, because
 * it is the most expensive part of logging.
 */
export class Logger implements ILogger
{
    private _level: LogLevel;
    private _colors = true;
    private _traceCaller = false;
    private _isDisposed = false;

    public constructor(level: LogLevel = LogLevel.NONE)
    {
        this._level = level;
    }

    public setLevel(value: LogLevel): Logger
    {
        this._level = value;

        return this;
    }

    public setColors(value: boolean): Logger
    {
        this._colors = value;

        return this;
    }

    /**
     * Turns on detection of a call site. It costs a creation of an Error instance for every message,
     * that is not filtered out by the level, so it should be used for debugging only.
     */
    public setTraceCaller(value: boolean): Logger
    {
        this._traceCaller = value;

        return this;
    }

    public get level(): LogLevel
    {
        return this._level;
    }

    public get isDisposed(): boolean
    {
        return this._isDisposed;
    }

    public dispose(): void
    {
        this._isDisposed = true;
    }

    public verbose(...args: unknown[]): ILogger
    {
        if (this._level.level >= LogLevel.VERBOSE.level)
        {
            console.debug(this.format(Color.TP_ANSI_FG_LIGHT_GRAY, args));
        }

        return this;
    }

    public info(...args: unknown[]): ILogger
    {
        if (this._level.level >= LogLevel.INFO.level)
        {
            console.info(this.format(Color.TP_ANSI_FG_GREEN, args));
        }

        return this;
    }

    public warn(...args: unknown[]): ILogger
    {
        if (this._level.level >= LogLevel.WARN.level)
        {
            console.warn(this.format(Color.TP_ANSI_FG_YELLOW, args));
        }

        return this;
    }

    public error(...args: unknown[]): ILogger
    {
        if (this._level.level >= LogLevel.ERROR.level)
        {
            console.error(this.format(Color.TP_ANSI_FG_RED, args));
        }

        return this;
    }

    public fatal(...args: unknown[]): ILogger
    {
        if (this._level.level >= LogLevel.ERROR.level)
        {
            console.error(this.format(Color.TP_ANSI_BG_RED, args));
        }

        return this;
    }

    private format(color: string, args: readonly unknown[]): string
    {
        let from = 0;
        let owner = "";

        const first: unknown = args[0];

        if (typeof first === "string" && first.startsWith(OWNER_PREFIX) && first.endsWith(OWNER_SUFFIX))
        {
            owner = " [" + first.slice(OWNER_PREFIX.length, first.length - OWNER_SUFFIX.length) + "]";
            from = 1;
        }

        const parts: string[] = [];

        for (let i = from; i < args.length; i++)
        {
            parts.push(Logger.stringify(args[i]));
        }

        const result: string = this.timestamp() + owner + (this._traceCaller ? this.caller() : "") + " " + parts.join(" ");

        return this._colors ? "\x1b[" + color + "m" + result + "\x1b[0m" : result;
    }

    private timestamp(): string
    {
        const date: Date = new Date();

        return "[" + date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " - " +
            date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "]";
    }

    private caller(): string
    {
        const stack: string[] = (new Error().stack ?? "").split("\n");
        const line: string | undefined = stack[3];

        return line === undefined ? "" : " " + line.trim();
    }

    private static stringify(value: unknown): string
    {
        if (value === undefined || value === null || typeof value === "string" || typeof value === "number" ||
            typeof value === "boolean" || typeof value === "bigint" || typeof value === "symbol")
        {
            return String(value);
        }

        if (typeof value === "function")
        {
            return value.name ? "[function " + value.name + "]" : "[function]";
        }

        if (value instanceof Error)
        {
            return value.stack ?? String(value);
        }

        try
        {
            return JSON.stringify(value) ?? String(value);
        }
        catch
        {
            return String(value);
        }
    }
}

class Color
{
    public static readonly TP_ANSI_FG_RED: string = "31";
    public static readonly TP_ANSI_FG_GREEN: string = "32";
    public static readonly TP_ANSI_FG_YELLOW: string = "33";
    public static readonly TP_ANSI_FG_LIGHT_GRAY: string = "90";
    public static readonly TP_ANSI_BG_RED: string = "41";
}
