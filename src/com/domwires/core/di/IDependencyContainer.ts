import {Class, Type} from "../Global";

export interface IDependencyContainer
{
    /**
     * Binds a service identifier to a class. A new instance is created on each resolution.
     */
    bindToType<T>(serviceIdentifier: Type<T>, to: Class<T>, name?: string): void;

    /**
     * Binds a service identifier to a value. The value is returned as is on each resolution.
     */
    bindToValue<T>(serviceIdentifier: Type<T>, value: T, name?: string): void;

    has(serviceIdentifier: Type, name?: string): boolean;

    /**
     * Removes all bindings of the service identifier, if the name is not specified.
     */
    unbind(serviceIdentifier: Type, name?: string): void;

    unbindAll(): void;

    resolve<T>(serviceIdentifier: Type<T>, name?: string): T;

    /**
     * Instantiates the class, injects properties and calls the post construct method.
     */
    create<T>(type: Class<T>): T;
}
