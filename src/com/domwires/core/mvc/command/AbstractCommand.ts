import {injectable} from "inversify";
import {ICommand} from "./ICommand";

@injectable()
export abstract class AbstractCommand implements ICommand
{
    /* tslint:disable:no-empty */
    execute(): void
    {
    }
}