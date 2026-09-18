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

    /* eslint-disable @typescript-eslint/no-empty-function */
    protected removedFromHierarchy(): void
    {
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    protected addedToHierarchy(): void
    {
    }

}

Reflect.set(AbstractHierarchyObject.prototype, IS_HIERARCHY_OBJECT, true);
