export const SERVICE_IDENTIFIER = "serviceIdentifier";

/**
 * Overrides the service identifier of a class: by default the name of the class is used.
 */
export function serviceIdentifier(value: string): ClassDecorator
{
    return (target: object): void =>
    {
        Reflect.set(target, SERVICE_IDENTIFIER, value);
    };
}
