import {AbstractCommand, CommandExecution} from "../../src";
import {RESULT_MODEL, REQUEST_ADAPTER, ResultModel, RequestAdapter} from "./contracts";

export class LoadResult extends AbstractCommand<{id: string}>
{
    public static readonly inject = [RESULT_MODEL, REQUEST_ADAPTER];

    public constructor(private readonly model: ResultModel, private readonly adapter: RequestAdapter)
    {
        super();
    }

    public override async execute(input: {id: string}, execution: CommandExecution): Promise<void>
    {
        const value = await this.adapter.load(input.id, execution.signal);

        execution.commit(() => this.model.set(input.id, value));
    }
}
