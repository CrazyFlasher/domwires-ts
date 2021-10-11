import {injectable} from "inversify";
import {ICommand} from "./ICommand";

@injectable()
export abstract class AbstractCommand implements ICommand
{
    execute(): void
    {
    }
}