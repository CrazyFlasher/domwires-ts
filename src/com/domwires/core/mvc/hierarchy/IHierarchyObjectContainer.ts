import {IHierarchyObject, IHierarchyObjectImmutable} from "./IHierarchyObject";
import {IMessage} from "../message/IMessageDispatcher";
import {AbstractHierarchyObject} from "./AbstractHierarchyObject";
import ArrayUtils from "../../utils/ArrayUtils";
import {setDefaultImplementation} from "../../Global";

export interface IHierarchyObjectContainerImmutable extends IHierarchyObjectImmutable
{
    get childrenImmutable(): ReadonlyArray<IHierarchyObjectImmutable>;

    contains(child: IHierarchyObjectImmutable): boolean;
}

export interface IHierarchyObjectContainer extends IHierarchyObjectContainerImmutable, IHierarchyObject
{
    get children(): ReadonlyArray<IHierarchyObject>;

    add(child: IHierarchyObject, index?: number): boolean;

    remove(child: IHierarchyObject, dispose?: boolean): boolean;

    removeAll(dispose?: boolean): IHierarchyObjectContainer;

    dispatchMessageToChildren(message: IMessage): IHierarchyObjectContainer;
}

export class HierarchyObjectContainer extends AbstractHierarchyObject implements IHierarchyObjectContainer
{
    private _childrenList: IHierarchyObject[] = [];
    private _childrenListImmutable: IHierarchyObjectImmutable[] = [];

    public override dispose()
    {
        this.removeAll(true);

        this._childrenList = null;
        this._childrenListImmutable = null;

        super.dispose();
    }

    public add(child: IHierarchyObject, index?: number): boolean
    {
        let success = false;

        if (index !== undefined && index > this._childrenList.length)
        {
            throw new Error("Invalid child index! Index shouldn't be bigger that children list length!");
        }

        const contains: boolean = this._childrenList.indexOf(child) !== -1;

        if (index !== undefined)
        {
            if (contains)
            {
                ArrayUtils.remove(this._childrenList, child);
                ArrayUtils.remove(this._childrenListImmutable, child);
            }

            this._childrenList.splice(index, 0, child);
            this._childrenListImmutable.splice(index, 0, child);

            success = true;
        }

        if (!contains)
        {
            if (index === undefined)
            {
                this._childrenList.push(child);
                this._childrenListImmutable.push(child);
            }

            if (child.parent)
            {
                child.parent.remove(child);
            }

            child.setParent(this);
        }

        return success;
    }

    public get children(): ReadonlyArray<IHierarchyObject>
    {
        return this._childrenList;
    }

    public get childrenImmutable(): ReadonlyArray<IHierarchyObjectImmutable>
    {
        return this._childrenListImmutable;
    }

    public contains(child: IHierarchyObjectImmutable): boolean
    {
        return this._childrenListImmutable !== null && this._childrenListImmutable.indexOf(child) !== -1;
    }

    public dispatchMessageToChildren(message: IMessage): IHierarchyObjectContainer
    {
        for (const child of this._childrenList)
        {
            if (message.previousTarget !== child)
            {
                if (HierarchyObjectContainer.instanceOfIHierarchyObjectContainer(child))
                {
                    child.dispatchMessageToChildren(message);
                }
                else
                {
                    child.handleMessage(message);
                }
            }
        }

        return this;
    }

    private static instanceOfIHierarchyObjectContainer(object: IHierarchyObject): object is IHierarchyObjectContainer
    {
        return 'dispatchMessageToChildren' in object;
    }

    public override onMessageBubbled(message: IMessage): boolean
    {
        this.handleMessage(message);

        return true;
    }

    public remove(child: IHierarchyObject, dispose?: boolean): boolean
    {
        let success = false;

        if (this.contains(child))
        {
            ArrayUtils.remove(this._childrenList, child);
            ArrayUtils.remove(this._childrenListImmutable, child);

            if (dispose)
            {
                child.dispose();
            }
            else
            {
                child.setParent(null);
            }

            success = true;
        }

        return success;
    }

    public removeAll(dispose?: boolean): IHierarchyObjectContainer
    {
        if (this._childrenList !== null)
        {
            for (const child of this._childrenList)
            {
                if (dispose)
                {
                    child.dispose();
                }
                else
                {
                    child.setParent(null);
                }
            }

            ArrayUtils.clear(this._childrenList);
            ArrayUtils.clear(this._childrenListImmutable);
        }
        return this;
    }
}

setDefaultImplementation("IHierarchyObjectContainer", HierarchyObjectContainer);