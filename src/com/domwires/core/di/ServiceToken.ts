/** An identity and a compile-time contract. Names are diagnostic, not lookup keys. */
export class ServiceToken<T>
{
    declare private readonly contract: (value: T) => T;
    /** Creates a unique identifier; two tokens with the same name remain different identifiers. */
    public constructor(public readonly name: string) {}
    /** Returns the diagnostic name without changing token identity. */
    public toString(): string { return this.name; }
}
