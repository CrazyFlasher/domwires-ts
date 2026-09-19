import {ServiceToken} from "../../src";

export interface ResultModelImmutable
{
    get(id: string): string | undefined;
}

export interface ResultModel extends ResultModelImmutable
{
    set(id: string, value: string): void;
}

export const RESULT_MODEL = new ServiceToken<ResultModel>("ResultModel");
export const RESULT_MODEL_IMMUTABLE = new ServiceToken<ResultModelImmutable>("ResultModelImmutable");

export interface RequestAdapter
{
    load(id: string, signal: AbortSignal): Promise<string>;
}

export const REQUEST_ADAPTER = new ServiceToken<RequestAdapter>("RequestAdapter");
