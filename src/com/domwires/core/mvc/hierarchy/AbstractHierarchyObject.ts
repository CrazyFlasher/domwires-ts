/* eslint-disable @typescript-eslint/no-explicit-any */

import {IHierarchyObject} from "./IHierarchyObject";
import {IHierarchyObjectContainer, IHierarchyObjectContainerImmutable} from "./IHierarchyObjectContainer";
import {MessageDispatcher} from "../message/IMessageDispatcher";
import {IS_HIERARCHY_OBJECT, isContext} from "../../Global";

export abstract class AbstractHierarchyObject extends MessageDispatcher implements IHierarchyObject
{
    private _parent: IHierarchyObjectContainer | undefined;

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public isIHierarchyObject(): void {}

    public override dispose()
    {
        this._parent?.remove(this);
        this._parent = undefined;

        super.dispose();
    }

    public get parent(): IHierarchyObjectContainer | undefined
    {
        return this._parent;
    }

    public get parentImmutable(): IHierarchyObjectContainerImmutable | undefined
    {
        return this.parent;
    }

    public get root(): IHierarchyObjectContainer | undefined
    {
        if (isContext(this))
        {
            return this;
        }

        let parent: IHierarchyObjectContainer | undefined = this.parent;

        while (parent && !isContext(parent))
        {
            parent = parent.parent;
        }

        return parent;
    }

    public get rootImmutable(): IHierarchyObjectContainerImmutable | undefined
    {
        return this.root;
    }

    public setParent(value: IHierarchyObjectContainer | undefined): IHierarchyObject
    {
        if (value === this._parent) return this;
        for (let ancestor = value; ancestor; ancestor = ancestor.parent)
            if (Object.is(ancestor, this)) throw new Error("Hierarchy cycle is not allowed");
        if (value && !value.contains(this)) { value.add(this); return this; }
        if (this._parent?.contains(this)) this._parent.remove(this);
        const hasParent: boolean = this._parent != undefined;

        this._parent = value;

        if (!hasParent && this._parent != undefined)
        {
            this.addedToHierarchy();
        }
        else if (hasParent && this._parent == undefined)
        {
            this.removedFromHierarchy();
        }

        return this;
    }

    /** Synchronous hook after this object is detached; parent is already undefined. */
    /* eslint-disable @typescript-eslint/no-empty-function */
    protected removedFromHierarchy(): void
    {
    }

    /** Synchronous hook after this object is attached; parent is already available. */
    /* eslint-disable @typescript-eslint/no-empty-function */
    protected addedToHierarchy(): void
    {
    }

}

Reflect.set(AbstractHierarchyObject.prototype, IS_HIERARCHY_OBJECT, true);
