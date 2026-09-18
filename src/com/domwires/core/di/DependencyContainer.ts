/* eslint-disable @typescript-eslint/no-explicit-any */

import {Class, Type} from "../Global";
import {getPostConstructMethodName, getPropertyInjections, PropertyInjection} from "./Decorators";
import {IDependencyContainer} from "./IDependencyContainer";
import {getLazyBinding, hasLazyBinding} from "./LazyRegistry";

const DEFAULT_NAME = "";

type Binding<T = any> = {
    type?: Class<T>;
    value?: T;
};

export class DependencyContainer implements IDependencyContainer
{
    private readonly bindings: Map<Type, Map<string, Binding>> = new Map<Type, Map<string, Binding>>();

    public bindToType<T>(serviceIdentifier: Type<T>, to: Class<T>, name?: string): void
    {
        this.getBindingForWriting(serviceIdentifier, name).type = to;
    }

    public bindToValue<T>(serviceIdentifier: Type<T>, value: T, name?: string): void
    {
        this.getBindingForWriting(serviceIdentifier, name).value = value;
    }

    public has(serviceIdentifier: Type, name?: string): boolean
    {
        const binding: Binding | undefined = this.findBinding(serviceIdentifier, name);

        return binding != undefined && (binding.value !== undefined || binding.type != undefined);
    }

    public unbind(serviceIdentifier: Type, name?: string): void
    {
        if (name === undefined)
        {
            this.bindings.delete(serviceIdentifier);

            return;
        }

        const names: Map<string, Binding> | undefined = this.bindings.get(serviceIdentifier);

        if (!names)
        {
            return;
        }

        names.delete(name);

        if (names.size === 0)
        {
            this.bindings.delete(serviceIdentifier);
        }
    }

    public unbindAll(): void
    {
        this.bindings.clear();
    }

    public resolve<T>(serviceIdentifier: Type<T>, name?: string): T
    {
        const binding: Binding | undefined = this.findBinding(serviceIdentifier, name);

        if (binding)
        {
            if (binding.value !== undefined)
            {
                return binding.value;
            }

            if (binding.type != undefined)
            {
                return this.create(binding.type);
            }
        }

        // a class, that is not bound explicitly, is instantiated as is
        if (typeof serviceIdentifier !== "string" && name === undefined)
        {
            return this.create(serviceIdentifier);
        }

        throw new Error("No binding found for service identifier \"" + serviceIdentifier + "\"" +
            (name === undefined ? "" : " with name \"" + name + "\"") + "!");
    }

    public create<T>(type: Class<T>): T
    {
        const instance: T = new type();

        this.injectProperties(instance, type);
        this.invokePostConstruct(instance, type);

        return instance;
    }

    private injectProperties(instance: any, type: Class<unknown>): void
    {
        for (const injection of getPropertyInjections(type))
        {
            const serviceIdentifier: Type | undefined = injection.serviceIdentifier;

            if (serviceIdentifier === undefined)
            {
                continue;
            }

            if (injection.lazy)
            {
                DependencyContainer.defineLazyProperty(instance, type, injection);

                continue;
            }

            if (!this.canResolve(serviceIdentifier, injection.named))
            {
                if (injection.optional)
                {
                    continue;
                }

                throw new Error(DependencyContainer.getMissingBindingMessage(type, injection));
            }

            Reflect.set(instance, injection.propertyKey, this.resolve(serviceIdentifier, injection.named));
        }
    }

    private invokePostConstruct(instance: any, type: Class<unknown>): void
    {
        const methodName: string | symbol | undefined = getPostConstructMethodName(type);

        if (methodName === undefined)
        {
            return;
        }

        const method: unknown = Reflect.get(instance, methodName);

        if (typeof method === "function")
        {
            method.call(instance);
        }
    }

    private canResolve(serviceIdentifier: Type, name?: string): boolean
    {
        if (this.has(serviceIdentifier, name))
        {
            return true;
        }

        return typeof serviceIdentifier !== "string" && name === undefined;
    }

    /**
     * Lazy injections are resolved on every access, so a command, that is reused from a pool, always gets
     * the value, that is actual for the current execution.
     */
    private static defineLazyProperty(instance: any, type: Class<unknown>, injection: PropertyInjection): void
    {
        const serviceIdentifier: Type | undefined = injection.serviceIdentifier;

        Object.defineProperty(instance, injection.propertyKey, {
            configurable: true,
            enumerable: true,
            get: (): unknown =>
            {
                if (serviceIdentifier === undefined || !hasLazyBinding(serviceIdentifier, injection.named))
                {
                    if (injection.optional)
                    {
                        return undefined;
                    }

                    throw new Error(DependencyContainer.getMissingBindingMessage(type, injection));
                }

                return getLazyBinding(serviceIdentifier, injection.named);
            }
        });
    }

    private static getMissingBindingMessage(type: Class<unknown>, injection: PropertyInjection): string
    {
        return "Cannot inject \"" + DependencyContainer.getIdentifierName(injection.serviceIdentifier) + "\"" +
            (injection.named === undefined ? "" : " with name \"" + injection.named + "\"") +
            " into \"" + type.name + "." + String(injection.propertyKey) + "\": no binding found!";
    }

    private static getIdentifierName(serviceIdentifier: Type | undefined): string
    {
        if (typeof serviceIdentifier === "string")
        {
            return serviceIdentifier;
        }

        if (typeof serviceIdentifier === "function")
        {
            return serviceIdentifier.name;
        }

        return String(serviceIdentifier);
    }

    private findBinding(serviceIdentifier: Type, name?: string): Binding | undefined
    {
        const names: Map<string, Binding> | undefined = this.bindings.get(serviceIdentifier);

        if (!names)
        {
            return undefined;
        }

        return names.get(name === undefined ? DEFAULT_NAME : name);
    }

    private getBindingForWriting<T>(serviceIdentifier: Type<T>, name?: string): Binding<T>
    {
        let names: Map<string, Binding> | undefined = this.bindings.get(serviceIdentifier);

        if (!names)
        {
            names = new Map<string, Binding>();

            this.bindings.set(serviceIdentifier, names);
        }

        const key: string = name === undefined ? DEFAULT_NAME : name;
        let binding: Binding | undefined = names.get(key);

        if (!binding)
        {
            binding = {};

            names.set(key, binding);
        }

        // the binding is created above
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return binding;
    }
}
