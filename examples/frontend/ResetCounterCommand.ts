import {AbstractCommand, lazyInject} from "domwires";
import {ICounterModel} from "./CounterModel";

export class ResetCounterCommand extends AbstractCommand
{
    @lazyInject("ICounterModel")
    private model!: ICounterModel;

    public override execute(): void
    {
        this.model.setValue(0);
    }
}
