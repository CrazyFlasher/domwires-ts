import {AbstractContext} from "domwires";
import {AppMessage} from "./AppMessage";
import {ChangeCounterCommand} from "./ChangeCounterCommand";
import {CounterIsNotAtMaxGuards} from "./CounterIsNotAtMaxGuards";
import {CounterMediator} from "./CounterMediator";
import {CounterModel, ICounterModel} from "./CounterModel";
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

        const model: CounterModel = this.factory.getInstance<CounterModel>(CounterModel);

        this.addModel(model);

        // commands and guards work with the mutable model, mediators get the read only interface
        this.factory.mapToValue<ICounterModel>("ICounterModel", model);
        this.factory.mapToValue("ICounterModelImmutable", model);

        this.addMediator(this.factory.getInstance<CounterMediator>(CounterMediator));

        this.map(AppMessage.CHANGE_COUNTER, ChangeCounterCommand).addGuards(CounterIsNotAtMaxGuards);
        this.map(AppMessage.RESET_COUNTER, ResetCounterCommand);
    }
}
