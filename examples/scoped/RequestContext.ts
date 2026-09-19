import {AbstractContext} from "../../src";
import {RESULT_MODEL, RESULT_MODEL_IMMUTABLE, REQUEST_ADAPTER, ResultModel, RequestAdapter} from "./contracts";
import {LoadResult} from "./LoadResult";
import {LOAD} from "./messages";
import {ResultMediator} from "./ResultMediator";
import {Results} from "./Results";

export class RequestContext extends AbstractContext
{
    public model!: ResultModel;
    public mediator!: ResultMediator;

    protected override init(): void
    {
        super.init();

        this.model = this.registerModel({
            mutable: RESULT_MODEL,
            immutable: RESULT_MODEL_IMMUTABLE,
            implementation: Results,
            id: "results"
        });

        this.mediator = this.createMediator(ResultMediator, "resultView");
        this.map(LOAD, LoadResult);
    }

    public useAdapter(adapter: RequestAdapter): this
    {
        this.provide(REQUEST_ADAPTER, adapter, ["command"]);

        return this;
    }
}
