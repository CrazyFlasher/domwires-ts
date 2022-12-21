import {IDisposable, IDisposableImmutable} from "../core/common/IDisposable";
import {AbstractDisposable} from "../core/common/AbstractDisposable";
import {Enum} from "../core/Enum";

export class LogLevel extends Enum
{
    public static readonly VERBOSE:LogLevel = new LogLevel(4);
    public static readonly INFO:LogLevel = new LogLevel(3);
    public static readonly WARN:LogLevel = new LogLevel(2);
    public static readonly ERROR:LogLevel = new LogLevel(1);
    public static readonly NONE:LogLevel = new LogLevel();
    
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

export interface ILoggerImmutable extends IDisposableImmutable
{

}

export interface ILogger extends ILoggerImmutable, IDisposable
{
    verbose(...args: unknown[]): ILogger;

    info(...args: unknown[]): ILogger;

    warn(...args: unknown[]): ILogger;

    error(...args: unknown[]): ILogger;

    fatal(...args: unknown[]): ILogger;
}

export class Logger extends AbstractDisposable implements ILogger
{
    private readonly loglevel:LogLevel;
    
    public constructor(loglevel:LogLevel = LogLevel.NONE)
    {
        super();
        
        this.loglevel = loglevel;
    }
    
    private get t(): string
    {
        const date = new Date();

        return "[" + date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " - " +
            date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "]";
    }

    public override warn(...args: unknown[]): ILogger
    {
        if (this.loglevel.level >= LogLevel.WARN.level)
        {
            console.warn(Logger.paintPrefix(this.caller(args), this.t) + " " +
                Logger.paintArgs(Color.TP_ANSI_FG_YELLOW, ...args));
        }

        return this;
    }

    public override error(...args: unknown[]): ILogger
    {
        if (this.loglevel.level >= LogLevel.ERROR.level)
        {
            console.error(Logger.paintPrefix(this.caller(args), this.t) + " " +
                Logger.paintArgs(Color.TP_ANSI_FG_RED, ...args));
        }

        return this;
    }

    public override fatal(...args: unknown[]): ILogger
    {
        if (this.loglevel.level >= LogLevel.ERROR.level)
        {
            console.error(Logger.paintPrefix(this.caller(args), this.t) + " " +
                Logger.paintArgs(Color.TP_ANSI_FG_RED, ...args));
        }

        return this;
    }

    public override verbose(...args: unknown[]): ILogger
    {
        if (this.loglevel.level >= LogLevel.VERBOSE.level)
        {
            console.info(Logger.paintPrefix(this.caller(args), this.t) + " " +
                Logger.paintArgs(Color.TP_ANSI_FG_LIGHT_GRAY, ...args));
        }

        return this;
    }

    public override info(...args: unknown[]): ILogger
    {
        if (this.loglevel.level >= LogLevel.INFO.level)
        {
            console.info(Logger.paintPrefix(this.caller(args), this.t) + " " +
                Logger.paintArgs(Color.TP_ANSI_FG_GREEN, ...args));
        }

        return this;
    }

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    private caller(...args: any[]): string
    {
        let firstArgClassName = "";

        if (args && args.length > 0 && args[0] && args[0] instanceof Array && args[0].length > 0)
        {
            args[0].map(value => {
                if (value && value.constructor && value.constructor.name === "Object")
                {
                    const index = args[0].indexOf(value);
                    args[0].splice(index, 1, JSON.stringify(value));
                }
            });

            /* eslint-disable-next-line no-type-assertion/no-type-assertion */
            const firstArg = args[0][0] as string;

            try
            {
                if (firstArg && firstArg.indexOf("__<!$") === 0 && firstArg.lastIndexOf("$>!__") === firstArg.length - 5)
                {
                    firstArgClassName = firstArg.replace("__<!$", "").replace("$>!__", "");

                    args[0].splice(0, 1);
                }
            } catch (e)
            {
                console.log("First arg parse error:", firstArg);
            }
        }

        try
        {
            throw new Error();
        } catch (e)
        {
            if (e instanceof Error)
            {
                /* eslint-disable-next-line no-type-assertion/no-type-assertion */
                const stack = (e as Error).stack;

                if (!stack) return firstArgClassName;

                const arr = stack.split("\n");
                let result = "";

                if (firstArgClassName === "")
                {
                    result = arr.length > 3 ? arr[3] : "";
                } else
                {
                    let found = false;

                    for (const line of arr)
                    {
                        if (line.indexOf(firstArgClassName + ".ts:") != -1)
                        {
                            result = line;

                            found = true;

                            break;
                        }
                    }

                    if (!found)
                    {
                        for (const line of arr.reverse())
                        {
                            if (line.indexOf(" at " + firstArgClassName + ".") != -1)
                            {
                                result = line;

                                break;
                            }
                        }
                    }
                }

                if (result.length > 4)
                {
                    let splittedResult = result.split("(");
                    if (splittedResult.length > 1)
                    {
                        result = splittedResult[1].split(")")[0];
                    } else
                    {
                        splittedResult = result.split(" at ");
                        if (splittedResult.length > 1)
                        {
                            result = splittedResult[1];
                        }
                    }
                }

                return result;
            }

            return firstArgClassName;
        }
    }

    private static paintPrefix(prefix: string, time: string): string
    {
        return "\x1b[" + Color.TP_ANSI_FG_LIGHT_GRAY + "m" + prefix + "\x1b[0m" + " " + "\x1b[" + Color.TP_ANSI_FG_WHITE + "m" + time + "\x1b[0m";
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
    public static readonly TP_ANSI_FG_LIGHT_GRAY: string = "90";
    public static readonly TP_ANSI_BG_LIGHT_GRAY: string = "100";
}