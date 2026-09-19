import {AbstractContext} from "domwires";
import {AppMessage} from "./AppMessage";
import {ChangeCounterCommand} from "./ChangeCounterCommand";
import {CounterIsNotAtMaxGuards} from "./CounterIsNotAtMaxGuards";
import {CounterMediator, MOUNT_POINT} from "./CounterMediator";
import {CounterModel, COUNTER_MODEL, COUNTER_MODEL_IMMUTABLE} from "./CounterModel";
import {ResetCounterCommand} from "./ResetCounterCommand";

/**
 * A context is a composition root: it owns models and mediators, maps messages to commands and
 * forwards messages between them.
 */
export class CounterContext extends AbstractContext
{
    protected override init(): void
    {
        super.init();

        this.provide(MOUNT_POINT, this.factory.getInstance(MOUNT_POINT), ["mediator"]);
        this.registerModel({
            mutable: COUNTER_MODEL,
            immutable: COUNTER_MODEL_IMMUTABLE,
            implementation: CounterModel,
            id: "counter"
        });
        this.createMediator(CounterMediator, "counterView");

        this.map(AppMessage.CHANGE_COUNTER, ChangeCounterCommand).addGuards(CounterIsNotAtMaxGuards);
        this.map(AppMessage.RESET_COUNTER, ResetCounterCommand);
    }
}
