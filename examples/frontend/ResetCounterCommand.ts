import {AbstractCommand, lazyInject} from "domwires";
import {ICounterModel, COUNTER_MODEL} from "./CounterModel";

export class ResetCounterCommand extends AbstractCommand
{
    @lazyInject(COUNTER_MODEL)
    private model!: ICounterModel;

    public override execute(): void
    {
        this.model.setValue(0);
    }
}
