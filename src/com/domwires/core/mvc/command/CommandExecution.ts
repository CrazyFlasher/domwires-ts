import {IFactory} from "../../factory/IFactory";
import {ServiceToken} from "../../di/ServiceToken";
import {IMessageDispatcherImmutable} from "../message/IMessageDispatcher";
import {CommandCancelledError} from "./CommandOptions";

let nextExecutionId = 0;
/** Per-invocation dependency scope, sender metadata and cooperative cancellation. */
export class CommandExecution
{
    /** Process-local invocation identity used by trace events. */
    public readonly id = ++nextExecutionId;
    /**
     * Creates invocation metadata. The mapper normally constructs and owns this object.
     * @param scope - Invocation factory, valid until command completion and cleanup.
     * @param signal - Linked mapper, mapping and external cancellation signal.
     * @param target - Original message sender, or the target supplied to execute().
     */
    public constructor(
        public readonly scope: IFactory,
        public readonly signal: AbortSignal,
        public readonly target?: IMessageDispatcherImmutable
    ) {}

    /** @throws CommandCancelledError when the invocation signal has been aborted. */
    public throwIfCancelled(): void { if (this.signal.aborted) throw new CommandCancelledError(this.signal.reason); }

    /**
     * Checks cancellation, then immediately invokes a synchronous model update.
     * This is not a transaction and provides no rollback. Do not pass an async callback:
     * cancellation is checked only before the callback begins.
     * @throws CommandCancelledError when cancelled, or the callback's own error.
     */
    public commit(update: () => void): void
    {
        this.throwIfCancelled();
        update();
    }
}
/** Injection token for the current invocation metadata. */
export const COMMAND_EXECUTION = new ServiceToken<CommandExecution>("CommandExecution");
/** Injection token for the complete invocation input; prefer the typed execute(input) parameter. */
export const COMMAND_INPUT = new ServiceToken<unknown>("CommandInput");
