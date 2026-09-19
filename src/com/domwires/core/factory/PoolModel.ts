/* eslint-disable @typescript-eslint/no-explicit-any */
import type {Factory} from "./IFactory";
import type {Type} from "../Global";
import {ArrayUtils} from "../utils/ArrayUtils";

/** @internal Storage and busy-item selection for a factory-owned pool. */
export class PoolModel
{
    private readonly list: any[] = [];
    private _capacity: number;

    private currentIndex = 0;
    private readonly factory: Factory;
    private readonly isBusyFlagGetterName: string | undefined;

    public constructor(factory: Factory, capacity: number, isBusyFlagGetterName?: string)
    {
        this.factory = factory;
        this._capacity = capacity;
        this.isBusyFlagGetterName = isBusyFlagGetterName;
    }

    public get<T>(type: Type<T>, createNewIfNeeded = true): T
    {
        if (this.list.length < this._capacity && createNewIfNeeded)
        {
            return this.createAndStore(type);
        }

        if (this.list.length === 0)
        {
            throw new Error("Pool for '" + (typeof type === "string" ? type : type.name) + "' is empty and creating of new instances is disabled!");
        }

        // scan for a not busy item, starting from the current index; the scan is bounded by the list length,
        // so it always terminates, even if all items are busy
        for (let i = 0; i < this.list.length; i++)
        {
            const instance: T = this.next();

            if (!this.isBusy(instance))
            {
                return instance;
            }
        }

        throw new Error("All items of pool '" + (typeof type === "string" ? type : type.name) + "' are busy! " +
            "Increase the pool capacity or enable the safe pool mode.");
    }

    public increaseCapacity(value: number): void
    {
        if (!Number.isSafeInteger(value) || value <= 0 || !Number.isSafeInteger(this._capacity + value))
            throw new Error("Additional capacity must be a positive safe integer!");
        this._capacity += value;
    }

    public dispose(): void
    {
        const errors: unknown[] = [];
        for (const instance of this.list)
        {
            try
            {
                if (typeof instance?.dispose === "function" && !instance.isDisposed) instance.dispose();
            }
            catch (error) { errors.push(error); }
        }
        ArrayUtils.clear(this.list);

        this.currentIndex = 0;
        this._capacity = 0;
        if (errors.length) throw new AggregateError(errors, "Pool disposal failed");
    }

    public get capacity(): number
    {
        return this._capacity;
    }

    public get instanceCount(): number
    {
        return this.list.length;
    }

    public get allItemsAreBusy(): boolean
    {
        if (this.list.length < this._capacity)
        {
            return false;
        }

        if (!this.isBusyFlagGetterName)
        {
            return false;
        }

        for (let i = 0; i < this._capacity; i++)
        {
            if (!this.isBusy(this.list[i]))
            {
                return false;
            }
        }

        return true;
    }

    public get busyItemsCount(): number
    {
        if (!this.isBusyFlagGetterName)
        {
            return 0;
        }

        let count = 0;

        for (const instance of this.list)
        {
            if (this.isBusy(instance))
            {
                count++;
            }
        }

        return count;
    }

    private createAndStore<T>(type: Type<T>): T
    {
        const instance: T = this.factory.instantiateValueUnmapped(type);

        this.list.push(instance);

        return instance;
    }

    private next(): any
    {
        const instance: any = this.list[this.currentIndex];

        this.currentIndex++;

        if (this.currentIndex === this._capacity || this.currentIndex >= this.list.length)
        {
            this.currentIndex = 0;
        }

        return instance;
    }

    private isBusy(instance: any): boolean
    {
        return this.isBusyFlagGetterName != undefined && instance != undefined &&
            Boolean(instance[this.isBusyFlagGetterName]);
    }
}
