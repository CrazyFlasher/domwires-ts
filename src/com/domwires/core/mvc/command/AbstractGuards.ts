import {IGuards} from "./IGuards";
import {injectable} from "inversify";

@injectable()
export class AbstractGuards implements IGuards
{
    get allows(): boolean
    {
        return false;
    }
}