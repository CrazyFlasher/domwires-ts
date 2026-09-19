import {AbstractHierarchyObject} from "../../src";
import {ResultModel} from "./contracts";
import {RESULT_CHANGED} from "./messages";

export class Results extends AbstractHierarchyObject implements ResultModel
{
    private readonly values = new Map<string, string>();

    public get(id: string): string | undefined
    {
        return this.values.get(id);
    }

    public set(id: string, value: string): void
    {
        this.values.set(id, value);

        this.dispatchMessage(RESULT_CHANGED, {id});
    }
}
