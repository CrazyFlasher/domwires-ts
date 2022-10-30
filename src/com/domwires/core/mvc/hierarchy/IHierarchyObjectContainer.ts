/* eslint-disable @typescript-eslint/no-empty-function */

import {IHierarchyObject, IHierarchyObjectImmutable} from "./IHierarchyObject";
import {IMessage} from "../message/IMessageDispatcher";
import {AbstractHierarchyObject} from "./AbstractHierarchyObject";
import ArrayUtils from "../../utils/ArrayUtils";
import {instanceOf, setDefaultImplementation} from "../../Global";

export interface IHierarchyObjectContainerImmutable<TChildImmutable extends IHierarchyObjectImmutable = IHierarchyObjectImmutable>
    extends IHierarchyObjectImmutable
{
    get childrenImmutable(): ReadonlyArray<TChildImmutable>;

    contains(child: TChildImmutable): boolean;

    get id(): string | undefined;

    isIHierarchyObjectContainer(): void;
}

export interface IHierarchyObjectContainer<TChild extends IHierarchyObject = IHierarchyObject, TChildImmutable extends IHierarchyObjectImmutable = IHierarchyObjectImmutable>
    extends IHierarchyObjectContainerImmutable<TChildImmutable>, IHierarchyObject
{
    get children(): ReadonlyArray<TChild>;

    add(child: TChild, index?: number): boolean;

    remove(child: TChild, dispose?: boolean): boolean;

    removeAll(dispose?: boolean): IHierarchyObjectContainer<TChild>;

    dispatchMessageToChildren<DataType>(message: IMessage, data?: DataType, filter?: (child: TChild) => boolean): IHierarchyObjectContainer<TChild>;

    setId(value: string): IHierarchyObjectContainer<TChild>;
}

export class HierarchyObjectContainer extends AbstractHierarchyObject implements IHierarchyObjectContainer
{
    private _childrenList: IHierarchyObject[] = [];
    private _childrenListImmutable: IHierarchyObjectImmutable[] = [];

    private _id: string | undefined;

    public isIHierarchyObjectContainer(): void
    {
    }

    public override dispose()
    {
        this.removeAll(true);

        // this._childrenList = null;
        // this._childrenListImmutable = null;

        super.dispose();
    }

    public get id(): string | undefined
    {
        return this._id;
    }

    public setId(value: string): IHierarchyObjectContainer<IHierarchyObject>
    {
        this._id = value;

        return this;
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

            success = true;
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
        return this._childrenListImmutable && this._childrenListImmutable.indexOf(child) !== -1;
    }

    public dispatchMessageToChildren<DataType>(message: IMessage, data?: DataType, filter?: (child: IHierarchyObject) => boolean): IHierarchyObjectContainer
    {
        for (const child of this._childrenList)
        {
            if (!filter || filter(child))
            {
                if (message.previousTarget !== child)
                {
                    if (instanceOf(child, "IHierarchyObjectContainer") && !instanceOf(child, "IContext"))
                    {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        // we check above
                        child.dispatchMessageToChildren(message, data);
                    }
                    else
                    {
                        child.handleMessage(message, data);
                    }
                }
            }
        }

        return this;
    }

    public override onMessageBubbled<DataType>(message: IMessage, data?: DataType): boolean
    {
        this.handleMessage(message, data);

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
                child.setParent(undefined);
            }

            success = true;
        }

        return success;
    }

    public removeAll(dispose?: boolean): IHierarchyObjectContainer
    {
        if (this._childrenList)
        {
            for (const child of this._childrenList)
            {
                if (dispose)
                {
                    child.dispose();
                }
                else
                {
                    child.setParent(undefined);
                }
            }

            ArrayUtils.clear(this._childrenList);
            ArrayUtils.clear(this._childrenListImmutable);
        }
        return this;
    }
}

setDefaultImplementation<IHierarchyObjectContainer>("IHierarchyObjectContainer", HierarchyObjectContainer);