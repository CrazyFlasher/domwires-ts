import {AbstractHierarchyObject} from "../../src";
import {RESULT_MODEL_IMMUTABLE, ResultModelImmutable} from "./contracts";
import {LOAD, RESULT_CHANGED} from "./messages";

export class ResultMediator extends AbstractHierarchyObject
{
    public static readonly inject = [RESULT_MODEL_IMMUTABLE];

    public readonly updates: string[] = [];

    public constructor(public readonly model: ResultModelImmutable)
    {
        super();

        this.addMessageListener(RESULT_CHANGED, (_message, data) =>
        {
            this.updates.push(data.id + ":" + this.model.get(data.id));
        });
    }

    public load(id: string): void
    {
        this.dispatchMessage(LOAD, {id});
    }
}
