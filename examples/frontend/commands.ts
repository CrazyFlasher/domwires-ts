import {AbstractCommand, AbstractGuards, lazyInject, lazyInjectNamed} from "domwires";
import {ICounterModel} from "./model";

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

export class ResetCounterCommand extends AbstractCommand
{
    @lazyInject("ICounterModel")
    private model!: ICounterModel;

    public override execute(): void
    {
        this.model.setValue(0);
    }
}

/**
 * A guard decides, whether a command may be executed in the current state of the application.
 */
export class CounterIsNotAtMaxGuards extends AbstractGuards
{
    @lazyInject("ICounterModel")
    private model!: ICounterModel;

    public override get allows(): boolean
    {
        return this.model.value < this.model.maxValue;
    }
}
