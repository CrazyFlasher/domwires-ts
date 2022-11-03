import "reflect-metadata";

export const SERVICE_IDENTIFIER = "serviceIdentifier";

export function serviceIdentifier(value: string)
{
    return Reflect.metadata(SERVICE_IDENTIFIER, value);
}