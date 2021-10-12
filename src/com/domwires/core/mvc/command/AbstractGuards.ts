import {IGuards} from "./IGuards";
import {injectable} from "inversify";

@injectable()
export class AbstractGuards implements IGuards
{
    public get allows(): boolean
    {
        return false;
    }
}