import {IGuards} from "./IGuards";
import {injectable} from "../../di/Decorators";

@injectable()
export class AbstractGuards implements IGuards
{
    public get allows(): boolean
    {
        return false;
    }
}
