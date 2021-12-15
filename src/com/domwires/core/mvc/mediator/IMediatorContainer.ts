/* eslint-disable @typescript-eslint/no-empty-function */

import {IMediator, IMediatorImmutable} from "./IMediator";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainer,
    IHierarchyObjectContainerImmutable
} from "../hierarchy/IHierarchyObjectContainer";
import ArrayUtils from "../../utils/ArrayUtils";
import {setDefaultImplementation} from "../../Global";

export interface IMediatorContainerImmutable<MessageDataType> extends IMediatorImmutable<MessageDataType>, IHierarchyObjectContainerImmutable<MessageDataType>
{
    get numMediators(): number;

    get mediatorListImmutable(): ReadonlyArray<IMediatorImmutable<MessageDataType>>;

    containsMediator(mediator: IMediatorImmutable<MessageDataType>): boolean;
}

export interface IMediatorContainer<MessageDataType> extends IMediatorContainerImmutable<MessageDataType>, IMediator<MessageDataType>, IHierarchyObjectContainer<MessageDataType>
{
    isIMediatorContainer(): void;

    addMediator(mediator: IMediator<MessageDataType>): IMediatorContainer<MessageDataType>;

    removeMediator(mediator: IMediator<MessageDataType>, dispose?: boolean): IMediatorContainer<MessageDataType>;

    removeAllMediators(dispose?: boolean): IMediatorContainer<MessageDataType>;

    get mediatorList(): IMediator<MessageDataType>[];
}

export class MediatorContainer<MessageDataType> extends HierarchyObjectContainer<MessageDataType> implements IMediatorContainer<MessageDataType>
{
    private _mediatorList: IMediator<MessageDataType>[] = [];
    private _mediatorListImmutable: IMediatorImmutable<MessageDataType>[] = [];

    public addMediator(mediator: IMediator<MessageDataType>): IMediatorContainer<MessageDataType>
    {
        const success: boolean = this.add(mediator);

        if (success)
        {
            this._mediatorList.push(mediator);
            this._mediatorListImmutable.push(mediator);
        }

        return this;
    }

    public removeMediator(mediator: IMediator<MessageDataType>, dispose = false): IMediatorContainer<MessageDataType>
    {
        const success: boolean = this.remove(mediator, dispose);

        if (success)
        {
            ArrayUtils.remove(this._mediatorList, mediator);
            ArrayUtils.remove(this._mediatorListImmutable, mediator);
        }

        return this;
    }

    public removeAllMediators(dispose = false): IMediatorContainer<MessageDataType>
    {
        this.removeAll(dispose);

        ArrayUtils.clear(this._mediatorList);
        ArrayUtils.clear(this._mediatorListImmutable);

        return this;
    }

    public get numMediators(): number
    {
        return (this.children != null) ? this.children.length : 0;
    }

    public containsMediator(mediator: IMediatorImmutable<MessageDataType>): boolean
    {
        return this.contains(mediator);
    }

    // better to return copy, but in sake of performance, we do that way.
    public get mediatorList(): IMediator<MessageDataType>[]
    {
        return this._mediatorList;
    }

    // better to return copy, but in sake of performance, we do that way.
    public get mediatorListImmutable(): ReadonlyArray<IMediatorImmutable<MessageDataType>>
    {
        return this._mediatorListImmutable;
    }

    public isIMediator(): void
    {
    }

    public isIMediatorContainer(): void
    {
    }
}

setDefaultImplementation("IMediatorContainer", MediatorContainer);