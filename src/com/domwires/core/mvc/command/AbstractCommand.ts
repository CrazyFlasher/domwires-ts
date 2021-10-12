import {injectable} from "inversify";
import {ICommand} from "./ICommand";

@injectable()
export abstract class AbstractCommand implements ICommand
{
    execute(): void
    {
        /* eslint-disable @typescript-eslint/no-empty-function */
    }
}