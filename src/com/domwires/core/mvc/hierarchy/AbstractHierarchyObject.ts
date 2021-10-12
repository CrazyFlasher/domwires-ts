import {IHierarchyObject} from "./IHierarchyObject";
import {IHierarchyObjectContainer, IHierarchyObjectContainerImmutable} from "./IHierarchyObjectContainer";
import {MessageDispatcher} from "../message/IMessageDispatcher";

export abstract class AbstractHierarchyObject extends MessageDispatcher implements IHierarchyObject
{
    private _parent: IHierarchyObjectContainer;

    dispose()
    {
        this._parent = null;

        super.dispose();
    }

    get parent(): IHierarchyObjectContainer
    {
        return this._parent;
    }

    get parentImmutable(): IHierarchyObjectContainerImmutable
    {
        return this.parent;
    }

    setParent(value: IHierarchyObjectContainer): IHierarchyObject
    {
        const hasParent: boolean = this._parent != null;

        this._parent = value;

        if (!hasParent && this._parent != null)
        {
            this.addedToHierarchy();
        }
        else if (hasParent && this._parent == null)
        {
            this.removedFromHierarchy();
        }

        return this;
    }

    protected removedFromHierarchy(): void
    {
        /* eslint-disable @typescript-eslint/no-empty-function */
    }

    protected addedToHierarchy(): void
    {
        /* eslint-disable @typescript-eslint/no-empty-function */
    }

}