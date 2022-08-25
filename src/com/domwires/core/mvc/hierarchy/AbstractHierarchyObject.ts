import {IHierarchyObject} from "./IHierarchyObject";
import {IHierarchyObjectContainer, IHierarchyObjectContainerImmutable} from "./IHierarchyObjectContainer";
import {MessageDispatcher} from "../message/IMessageDispatcher";

export abstract class AbstractHierarchyObject extends MessageDispatcher implements IHierarchyObject
{
    private _parent: IHierarchyObjectContainer | undefined;

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

    protected removedFromHierarchy(): void
    {
        /* eslint-disable @typescript-eslint/no-empty-function */
    }

    protected addedToHierarchy(): void
    {
        /* eslint-disable @typescript-eslint/no-empty-function */
    }

}