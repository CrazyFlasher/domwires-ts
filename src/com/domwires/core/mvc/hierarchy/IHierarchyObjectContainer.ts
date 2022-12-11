/* eslint-disable @typescript-eslint/no-unused-vars */

import {IHierarchyObject, IHierarchyObjectImmutable} from "./IHierarchyObject";
import {IMessage} from "../message/IMessageDispatcher";
import {AbstractHierarchyObject} from "./AbstractHierarchyObject";
import {instanceOf, setDefaultImplementation} from "../../Global";
import {ArrayUtils} from "../../utils/ArrayUtils";

export interface IHierarchyObjectContainerImmutable<TChildImmutable = IHierarchyObjectImmutable>
    extends IHierarchyObjectImmutable
{
    get numChildren(): number;

    contains(child: TChildImmutable): boolean;

    contains(id: string): boolean;

    getImmutable(id: string): TChildImmutable | undefined;

    getImmutable(index: number): TChildImmutable | undefined;

    get id(): string | undefined;

    isIHierarchyObjectContainer(): void;
}

export interface IHierarchyObjectContainer<TChild extends IHierarchyObject = IHierarchyObject, TChildImmutable extends IHierarchyObjectImmutable = IHierarchyObjectImmutable>
    extends IHierarchyObjectContainerImmutable<TChildImmutable>, IHierarchyObject
{
    get(id: string): TChild | undefined;

    get(index: number): TChild | undefined;

    add(child: TChild): boolean;

    add(child: TChild, index: number): boolean;

    add(child: TChild, id: string): boolean;

    remove(child: TChild, dispose?: boolean): boolean;

    remove(id: string, dispose?: boolean): boolean;

    removeAll(dispose?: boolean): IHierarchyObjectContainer<TChild, TChildImmutable>;

    dispatchMessageToChildren<DataType>(message: IMessage, data?: DataType, filter?: (child: TChild) => boolean): IHierarchyObjectContainer<TChild, TChildImmutable>;

    setId(value: string): IHierarchyObjectContainer<TChild, TChildImmutable>;

    get childrenMap():Map<string, TChild>;

    get childrenList():TChild[];
}

export class HierarchyObjectContainer<TChild extends TChildImmutable & IHierarchyObject, TChildImmutable extends IHierarchyObjectImmutable>
    extends AbstractHierarchyObject implements IHierarchyObjectContainer<TChild, TChildImmutable>
{
    private _childrenList: TChild[] = [];
    private _childrenMap: Map<string, TChild> = new Map<string, TChild>();

    private _id: string | undefined;

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    public isIHierarchyObjectContainer(): void {}

    public override dispose()
    {
        this.removeAll(true);

        // this._childrenList = null;
        // this._childrenMap = null;

        super.dispose();
    }

    public get id(): string | undefined
    {
        return this._id;
    }

    public setId(value: string): IHierarchyObjectContainer<TChild, TChildImmutable>
    {
        this._id = value;

        return this;
    }

    public get childrenList(): TChild[]
    {
        return this._childrenList;
    }

    public get childrenMap(): Map<string, TChild>
    {
        return this._childrenMap;
    }

    public add(child: TChild, index: number): boolean;
    public add(child: TChild, id: string): boolean;
    public add(child: TChild): boolean;
    public add(child: TChild, indexOrId?: number | string): boolean;
    public add(child: TChild, indexOrId?: number | string): boolean
    {
        let success = false;
        let index: number | undefined;
        let id: string | undefined;

        if (typeof indexOrId === "number")
        {
            index = indexOrId;
        } else
        if (typeof indexOrId === "string")
        {
            id = indexOrId;
        }

        if (index !== undefined && index > this._childrenList.length)
        {
            throw new Error("Invalid child index! Index shouldn't be bigger that children list length!");
        }

        const contains = this.contains(child);

        if (index !== undefined)
        {
            if (contains)
            {
                ArrayUtils.remove(this._childrenList, child);
            }

            this._childrenList.splice(index, 0, child);
        }

        if (!contains)
        {
            if (index === undefined)
            {
                if (!id)
                {
                    this._childrenList.push(child);
                } else
                {
                    this._childrenMap.set(id, child);
                }
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

    public get(id: string): TChild | undefined;
    public get(index: number): TChild | undefined;
    public get(indexOrId: number | string): TChild | undefined;
    public get(indexOrId: number | string): TChild | undefined
    {
        return typeof indexOrId === "string" ? this._childrenMap.get(indexOrId) : this._childrenList[indexOrId];
    }

    public getImmutable(id: string): TChildImmutable | undefined;
    public getImmutable(index: number): TChildImmutable | undefined;
    public getImmutable(indexOrId: number | string): TChildImmutable | undefined;
    public getImmutable(indexOrId: number | string): TChildImmutable | undefined
    {
        return this.get(indexOrId);
    }

    public contains(child: TChildImmutable): boolean;
    public contains(id: string): boolean;
    public contains(childOrId: TChildImmutable | string): boolean;
    public contains(childOrId: TChildImmutable | string): boolean
    {
        if (typeof childOrId === "string")
        {
            return this._childrenMap.has(childOrId);
        }

        /* eslint-disable-next-line no-type-assertion/no-type-assertion */
        if (this._childrenList.indexOf(childOrId as TChild) !== -1)
        {
            return true;
        }

        for (const [key, value] of this._childrenMap)
        {
            if (value == childOrId)
            {
                return true;
            }
        }

        return false;
    }

    public dispatchMessageToChildren<DataType>(message: IMessage, data?: DataType, filter?: (child: TChild) => boolean): IHierarchyObjectContainer<TChild, TChildImmutable>
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

    public remove(child: TChild, dispose?: boolean): boolean;
    public remove(id: string, dispose?: boolean): boolean;
    public remove(childOrId: TChild | string, dispose?: boolean): boolean;
    public remove(childOrId: TChild | string, dispose?: boolean): boolean
    {
        let success = false;

        let child: TChild | undefined;
        let id: string | undefined;

        if (typeof childOrId === "string")
        {
            id = childOrId;
            child = this.get(id);
        } else
        {
            child = childOrId;
        }

        if (child && this.contains(child))
        {
            if (id)
            {
                this._childrenMap.delete(id);
            } else
            {
                ArrayUtils.remove(this._childrenList, child);
            }

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

    public removeAll(dispose?: boolean): IHierarchyObjectContainer<TChild, TChildImmutable>
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

        this._childrenMap.clear();

        return this;
    }

    public get numChildren(): number
    {
        return this._childrenList.length + this._childrenMap.size;
    }
}

setDefaultImplementation<IHierarchyObjectContainer>("IHierarchyObjectContainer", HierarchyObjectContainer);