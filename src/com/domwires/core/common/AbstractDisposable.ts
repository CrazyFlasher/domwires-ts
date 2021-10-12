import {injectable} from "inversify";
import {IDisposable} from "./IDisposable";

@injectable()
export abstract class AbstractDisposable implements IDisposable
{
    private _isDisposed = false;

    public get isDisposed(): boolean
    {
        return this._isDisposed;
    }

    public dispose(): void
    {
        if (this._isDisposed)
        {
            throw new Error("Object already disposed!");
        }

        this._isDisposed = true;
    }
}