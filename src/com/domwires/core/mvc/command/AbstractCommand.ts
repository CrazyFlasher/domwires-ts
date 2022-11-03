import {injectable} from "inversify";
import {ICommand} from "./ICommand";

@injectable()
export abstract class AbstractCommand implements ICommand
{
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public execute(): void {}
}