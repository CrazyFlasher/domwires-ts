/* eslint-disable @typescript-eslint/no-unused-vars */

export abstract class Enum<T = void>
{
    private readonly _name: string | undefined;

    protected constructor(name?: string)
    {
            this._name = name;
    }

    public toString(): string
    {
        return this._name || this.constructor.name;
    }

    public get name(): string | undefined
    {
        return this._name;
    }
}