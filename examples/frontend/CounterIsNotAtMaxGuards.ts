import {AbstractGuards, lazyInject} from "domwires";
import {ICounterModel} from "./CounterModel";

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
