import {injectable} from "../../di/Decorators";
import {ICommand} from "./ICommand";
import {CommandExecution} from "./CommandExecution";

@injectable()
export abstract class AbstractCommand<Input = unknown> implements ICommand<Input>
{
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public execute(_input?: Input, _execution?: CommandExecution): void | PromiseLike<void> {}
}
