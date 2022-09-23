export abstract class Enum
{
    private readonly _name: string | undefined;

    protected constructor(name?: string)
    {
            this._name = name;
    }

    public toString(): string
    {
        return this.name;
    }

    public get name(): string
    {
        return this._name || this.constructor.name;
    }
}