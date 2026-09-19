import {AbstractCommand, inject} from "domwires";
import {COUNTER_MODEL, ICounterModel} from "./CounterModel";
import {ChangeCounterData} from "./AppMessage";

export class ChangeCounterCommand extends AbstractCommand<ChangeCounterData>
{
    @inject(COUNTER_MODEL)
    private model!: ICounterModel;

    public override execute(input: ChangeCounterData): void
    {
        this.model.setValue(this.model.value + input.delta);
    }
}
