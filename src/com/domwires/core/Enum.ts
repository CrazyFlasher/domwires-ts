/* eslint-disable @typescript-eslint/no-unused-vars */

export abstract class Enum<T = void>
{
    private readonly _name: string;

    protected constructor(name?: string)
    {
        this._name = name;
    }

    public toString(): string
    {
        return this._name;
    }

    public get name(): string
    {
        return this._name;
    }
}