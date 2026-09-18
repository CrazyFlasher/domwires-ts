import {AbstractCommand, lazyInject, lazyInjectNamed} from "domwires";
import {ICounterModel} from "./CounterModel";

/**
 * A command changes the state. Dependencies are injected by the framework: the model is bound
 * to "ICounterModel" in the context, "delta" comes from the data of the message.
 */
export class ChangeCounterCommand extends AbstractCommand
{
    @lazyInject("ICounterModel")
    private model!: ICounterModel;

    @lazyInjectNamed("number", "delta")
    private delta!: number;

    public override execute(): void
    {
        this.model.setValue(this.model.value + this.delta);
    }
}
