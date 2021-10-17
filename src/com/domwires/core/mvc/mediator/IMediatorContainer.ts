/* eslint-disable @typescript-eslint/no-empty-function */

import {IMediator, IMediatorImmutable} from "./IMediator";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainer,
    IHierarchyObjectContainerImmutable
} from "../hierarchy/IHierarchyObjectContainer";
import ArrayUtils from "../../utils/ArrayUtils";
import {setDefaultImplementation} from "../../Global";

export interface IMediatorContainerImmutable extends IMediatorImmutable, IHierarchyObjectContainerImmutable
{
    get numMediators(): number;

    get mediatorListImmutable(): ReadonlyArray<IMediatorImmutable>;

    containsMediator(mediator: IMediatorImmutable): boolean;
}

export interface IMediatorContainer extends IMediatorContainerImmutable, IMediator, IHierarchyObjectContainer
{
    addMediator(mediator: IMediator): IMediatorContainer;

    removeMediator(mediator: IMediator, dispose?: boolean): IMediatorContainer;

    removeAllMediators(dispose?: boolean): IMediatorContainer;

    get mediatorList(): IMediator[];
}

export class MediatorContainer extends HierarchyObjectContainer implements IMediatorContainer
{
    private _mediatorList: IMediator[] = [];
    private _mediatorListImmutable: IMediatorImmutable[] = [];

    public addMediator(mediator: IMediator): IMediatorContainer
    {
        const success: boolean = this.add(mediator);

        if (success)
        {
            this._mediatorList.push(mediator);
            this._mediatorListImmutable.push(mediator);
        }

        return this;
    }

    public removeMediator(mediator: IMediator, dispose = false): IMediatorContainer
    {
        const success: boolean = this.remove(mediator, dispose);

        if (success)
        {
            ArrayUtils.remove(this._mediatorList, mediator);
            ArrayUtils.remove(this._mediatorListImmutable, mediator);
        }

        return this;
    }

    public removeAllMediators(dispose = false): IMediatorContainer
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

    public containsMediator(mediator: IMediatorImmutable): boolean
    {
        return this.contains(mediator);
    }

    // better to return copy, but in sake of performance, we do that way.
    public get mediatorList(): IMediator[]
    {
        return this._mediatorList;
    }

    // better to return copy, but in sake of performance, we do that way.
    public get mediatorListImmutable(): ReadonlyArray<IMediatorImmutable>
    {
        return this._mediatorListImmutable;
    }

    public isIMediator(): void
    {
    }
}

setDefaultImplementation("IMediatorContainer", MediatorContainer);