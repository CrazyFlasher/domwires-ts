import {IHierarchyObject, IHierarchyObjectImmutable} from "./IHierarchyObject";
import {IMessage} from "../message/IMessageDispatcher";
import {AbstractHierarchyObject} from "./AbstractHierarchyObject";
import ArrayUtils from "../../utils/ArrayUtils";
import {setDefaultImplementation} from "../../Global";

export interface IHierarchyObjectContainerImmutable<MessageDataType> extends IHierarchyObjectImmutable<MessageDataType>
{
    get childrenImmutable(): ReadonlyArray<IHierarchyObjectImmutable<MessageDataType>>;

    contains(child: IHierarchyObjectImmutable<MessageDataType>): boolean;
}

export interface IHierarchyObjectContainer<MessageDataType> extends IHierarchyObjectContainerImmutable<MessageDataType>, IHierarchyObject<MessageDataType>
{
    get children(): ReadonlyArray<IHierarchyObject<MessageDataType>>;

    add(child: IHierarchyObject<MessageDataType>, index?: number): boolean;

    remove(child: IHierarchyObject<MessageDataType>, dispose?: boolean): boolean;

    removeAll(dispose?: boolean): IHierarchyObjectContainer<MessageDataType>;

    dispatchMessageToChildren(message: IMessage<MessageDataType>): IHierarchyObjectContainer<MessageDataType>;
}

export class HierarchyObjectContainer<MessageDataType> extends AbstractHierarchyObject<MessageDataType> implements IHierarchyObjectContainer<MessageDataType>
{
    private _childrenList: IHierarchyObject<MessageDataType>[] = [];
    private _childrenListImmutable: IHierarchyObjectImmutable<MessageDataType>[] = [];

    public override dispose()
    {
        this.removeAll(true);

        this._childrenList = null;
        this._childrenListImmutable = null;

        super.dispose();
    }

    public add(child: IHierarchyObject<MessageDataType>, index?: number): boolean
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

    public get children(): ReadonlyArray<IHierarchyObject<MessageDataType>>
    {
        return this._childrenList;
    }

    public get childrenImmutable(): ReadonlyArray<IHierarchyObjectImmutable<MessageDataType>>
    {
        return this._childrenListImmutable;
    }

    public contains(child: IHierarchyObjectImmutable<MessageDataType>): boolean
    {
        return this._childrenListImmutable !== null && this._childrenListImmutable.indexOf(child) !== -1;
    }

    public dispatchMessageToChildren(message: IMessage<MessageDataType>): IHierarchyObjectContainer<MessageDataType>
    {
        for (const child of this._childrenList)
        {
            if (message.previousTarget !== child)
            {
                if (HierarchyObjectContainer.instanceOfIHierarchyObjectContainer(child))
                {
                    (child as IHierarchyObjectContainer<MessageDataType>).dispatchMessageToChildren(message);
                }
                else
                {
                    child.handleMessage(message);
                }
            }
        }

        return this;
    }

    private static instanceOfIHierarchyObjectContainer<MessageDataType>(object: IHierarchyObject<MessageDataType>): object is IHierarchyObjectContainer<MessageDataType>
    {
        return 'dispatchMessageToChildren' in object;
    }

    public override onMessageBubbled(message: IMessage<MessageDataType>): boolean
    {
        this.handleMessage(message);

        return true;
    }

    public remove(child: IHierarchyObject<MessageDataType>, dispose?: boolean): boolean
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

    public removeAll(dispose?: boolean): IHierarchyObjectContainer<MessageDataType>
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