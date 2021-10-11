export abstract class Enum
{
    private readonly _name: string;

    protected constructor(name: string)
    {
        this._name = name;
    }

    toString(): string
    {
        return this._name;
    }

    get name(): string
    {
        return this._name;
    }
}