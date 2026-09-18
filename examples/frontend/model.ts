import {AbstractHierarchyObject} from "domwires";
import {AppMessage} from "./messages";

/**
 * The read only view of the model. Mediators get only this interface, so they cannot change the state.
 */
export interface ICounterModelImmutable
{
    get value(): number;

    get maxValue(): number;
}

/**
 * The mutable interface is bound to the factory, so commands can change the state.
 */
export interface ICounterModel extends ICounterModelImmutable
{
    setValue(value: number): ICounterModel;
}

export class CounterModel extends AbstractHierarchyObject implements ICounterModel
{
    private _value = 0;
    private readonly _maxValue = 10;

    public get value(): number
    {
        return this._value;
    }

    public get maxValue(): number
    {
        return this._maxValue;
    }

    public setValue(value: number): ICounterModel
    {
        this._value = Math.max(0, Math.min(value, this._maxValue));

        // the model does not know, who listens: the message bubbles up and the context forwards it
        this.dispatchMessage(AppMessage.COUNTER_CHANGED, {value: this._value});

        return this;
    }
}
