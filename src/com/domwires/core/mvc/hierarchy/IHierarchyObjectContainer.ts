/* eslint-disable unicorn/no-useless-spread -- Snapshots protect iteration from removal and reentrant registration. */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {IHierarchyObject, IHierarchyObjectImmutable} from "./IHierarchyObject";
import {IMessage, messageAtTarget} from "../message/IMessage";
import {AbstractHierarchyObject} from "./AbstractHierarchyObject";
import {
    IS_HIERARCHY_OBJECT_CONTAINER,
    isContext,
    isHierarchyObjectContainer,
    setDefaultImplementation
} from "../../Global";

/** Direct-child lookup through immutable contracts. */
export interface IHierarchyObjectContainerImmutable<TChildImmutable = IHierarchyObjectImmutable>
    extends IHierarchyObjectImmutable
{
    /**
     * Number of direct children.
     */
    get numChildren(): number;

    /**
     * Whether a direct child exists by identity or registered id.
     */
    contains(child: TChildImmutable): boolean;

    /**
     * Whether a direct child exists by identity or registered id.
     */
    contains(id: string): boolean;

    /**
     * Finds a direct child by id or zero-based index; undefined when absent.
     */
    getImmutable(id: string): TChildImmutable | undefined;

    /**
     * Finds a direct child by id or zero-based index; undefined when absent.
     */
    getImmutable(index: number): TChildImmutable | undefined;

    /**
     * This container's optional registration id.
     */
    get id(): string | undefined;

    /**
     * Legacy structural marker; runtime identification uses the framework brand.
     */
    isIHierarchyObjectContainer(): void;
}

/** Owns direct children and routes messages without retaining live collection views. */
export interface IHierarchyObjectContainer<TChild extends IHierarchyObject = IHierarchyObject, TChildImmutable extends IHierarchyObjectImmutable = IHierarchyObjectImmutable>
    extends IHierarchyObjectContainerImmutable<TChildImmutable>, IHierarchyObject
{
    /**
     * Finds a direct child by id or zero-based index; undefined when absent.
     */
    get(id: string): TChild | undefined;

    /**
     * Finds a direct child by id or zero-based index; undefined when absent.
     */
    get(index: number): TChild | undefined;

    /**
     * Attaches a child, detaching it from a previous parent without disposal.
     * Returns false when already attached. Rejects cycles and duplicate ids before changing membership.
     */
    add(child: TChild): boolean;

    /**
     * Attaches a child, detaching it from a previous parent without disposal.
     * Returns false when already attached. Rejects cycles and duplicate ids before changing membership.
     */
    add(child: TChild, index: number): boolean;

    /**
     * Attaches a child, detaching it from a previous parent without disposal.
     * Returns false when already attached. Rejects cycles and duplicate ids before changing membership.
     */
    add(child: TChild, id: string): boolean;

    /**
     * Detaches a direct child by identity or id. Returns false when absent; dispose defaults to false.
     */
    remove(child: TChild, dispose?: boolean): boolean;

    /**
     * Detaches a direct child by identity or id. Returns false when absent; dispose defaults to false.
     */
    remove(id: string, dispose?: boolean): boolean;

    /**
     * Detaches a snapshot of all children, optionally disposing them; dispose defaults to false.
     */
    removeAll(dispose?: boolean): IHierarchyObjectContainer<TChild, TChildImmutable>;

    /**
     * Forwards a stable message frame to each matching child. Stops at propagation boundaries.
     */
    dispatchMessageToChildren<DataType>(message: IMessage, data?: DataType, filter?: (child: TChild) => boolean): IHierarchyObjectContainer<TChild, TChildImmutable>;

    /**
     * Sets this container's id and updates parent lookup; rejects conflicting ids.
     */
    setId(value: string): IHierarchyObjectContainer<TChild, TChildImmutable>;

    /**
     * Snapshot of named direct children; changing the returned collection cannot edit membership.
     */
    get childrenMap():ReadonlyMap<string, TChild>;

    /**
     * Snapshot of ordered direct children; child objects themselves remain live.
     */
    get childrenList():readonly TChild[];
}

export class HierarchyObjectContainer<
    TChild extends TChildImmutable & IHierarchyObject,
    TChildImmutable extends IHierarchyObjectImmutable>
    extends AbstractHierarchyObject implements IHierarchyObjectContainer<TChild, TChildImmutable>
{
    private readonly _childrenList: TChild[] = [];
    private readonly _childrenMap = new Map<string, TChild>();
    private readonly ids = new Map<TChildImmutable, string | undefined>();
    private _id?: string;

    public isIHierarchyObjectContainer(): void {}
    public override dispose(): void
    {
        const errors: unknown[] = [];
        for (const child of [...this._childrenList])
        {
            try { this.remove(child, true); } catch (error) { errors.push(error); }
        }
        super.dispose();
        if (errors.length) throw new AggregateError(errors, "Child disposal failed");
    }

    public get id(): string | undefined { return this._id; }
    public setId(value: string): this { this._id = value; return this; }
    public get childrenList(): readonly TChild[] { return this._childrenList.slice(); }
    public get childrenMap(): ReadonlyMap<string, TChild> { return new Map(this._childrenMap); }

    public add(child: TChild, indexOrId?: number | string): boolean
    {
        if (this.isDisposed || child.isDisposed) throw new Error("Cannot attach a disposed hierarchy object");
        const index = typeof indexOrId === "number" ? indexOrId : this._childrenList.length;
        const id = typeof indexOrId === "string" ? indexOrId : undefined;
        if (!Number.isInteger(index) || index < 0 || index > this._childrenList.length)
            throw new Error("Invalid child index!");
        // eslint-disable-next-line typescript/no-this-alias -- Walk the parent chain.
        for (let ancestor: IHierarchyObjectImmutable | undefined = this; ancestor; ancestor = ancestor.parentImmutable)
            if (Object.is(ancestor, child)) throw new Error("Hierarchy cycle is not allowed");
        if (id !== undefined && this._childrenMap.has(id) && this._childrenMap.get(id) !== child)
            throw new Error("Child id already registered: " + id);
        if (this.ids.has(child))
        {
            if (typeof indexOrId === "number")
            {
                this._childrenList.splice(this._childrenList.indexOf(child), 1);
                this._childrenList.splice(Math.min(index, this._childrenList.length), 0, child);
            }
            return false;
        }
        child.parent?.remove(child);
        this._childrenList.splice(index, 0, child);
        this.ids.set(child, id);
        if (id !== undefined) this._childrenMap.set(id, child);
        try
        {
            this.childAdded(child);
            child.setParent(this);
        }
        catch (error)
        {
            this.remove(child);
            throw error;
        }
        return true;
    }

    public get(indexOrId: number | string): TChild | undefined
    {
        return typeof indexOrId === "string" ? this._childrenMap.get(indexOrId) : this._childrenList[indexOrId];
    }
    public getImmutable(indexOrId: number | string): TChildImmutable | undefined { return this.get(indexOrId); }
    public contains(child: TChildImmutable): boolean;
    public contains(id: string): boolean;
    public contains(childOrId: TChildImmutable | string): boolean;
    public contains(childOrId: TChildImmutable | string): boolean
    {
        return typeof childOrId === "string" ? this._childrenMap.has(childOrId) : this.ids.has(childOrId);
    }

    public dispatchMessageToChildren<DataType>(message: IMessage, data?: DataType, filter?: (child: TChild) => boolean): this
    {
        for (const child of [...this._childrenList])
        {
            if (message.isPropagationStopped) break;
            if (!this.ids.has(child) || (filter && !filter(child))) continue;
            if (message.previousTarget === child || message.initialTarget === child) continue;
            const delivered = messageAtTarget(message, child);
            child.handleMessage(delivered, data);
            if (isHierarchyObjectContainer(child) && !isContext(child))
                child.dispatchMessageToChildren(delivered, data);
        }
        return this;
    }

    public override onMessageBubbled<DataType>(message: IMessage, data?: DataType): boolean
    {
        this.handleMessage(message, data);
        return true;
    }

    public remove(child: TChild, dispose?: boolean): boolean;
    public remove(id: string, dispose?: boolean): boolean;
    public remove(childOrId: TChild | string, dispose?: boolean): boolean;
    public remove(childOrId: TChild | string, dispose = false): boolean
    {
        const child = typeof childOrId === "string" ? this.get(childOrId) : childOrId;
        if (!child || !this.ids.has(child)) return false;
        const id = this.ids.get(child);
        this.ids.delete(child);
        this._childrenList.splice(this._childrenList.indexOf(child), 1);
        if (id !== undefined) this._childrenMap.delete(id);
        this.childRemoved(child);
        child.setParent(undefined);
        if (dispose) child.dispose();
        return true;
    }

    /** Synchronous hook after removal from this container, before child.setParent(undefined). */
    protected childRemoved(_child: TChild): void {}
    /** Synchronous hook after insertion into this container, before child.setParent(this). */
    protected childAdded(_child: TChild): void {}

    public removeAll(dispose = false): this
    {
        const errors: unknown[] = [];
        for (const child of [...this._childrenList])
        {
            try { this.remove(child, dispose); } catch (error) { errors.push(error); }
        }
        if (errors.length) throw new AggregateError(errors, "Removing children failed");
        return this;
    }
    public get numChildren(): number { return this._childrenList.length; }
}

Reflect.set(HierarchyObjectContainer.prototype, IS_HIERARCHY_OBJECT_CONTAINER, true);
setDefaultImplementation<IHierarchyObjectContainer>("IHierarchyObjectContainer", HierarchyObjectContainer);
