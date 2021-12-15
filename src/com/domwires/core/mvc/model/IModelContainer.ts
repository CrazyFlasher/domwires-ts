/* eslint-disable @typescript-eslint/no-empty-function */

import {IModel, IModelImmutable} from "./IModel";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainer,
    IHierarchyObjectContainerImmutable
} from "../hierarchy/IHierarchyObjectContainer";
import ArrayUtils from "../../utils/ArrayUtils";
import {setDefaultImplementation} from "../../Global";

export interface IModelContainerImmutable<MessageDataType> extends IModelImmutable<MessageDataType>, IHierarchyObjectContainerImmutable<MessageDataType>
{
    get numModels(): number;

    get modelListImmutable(): ReadonlyArray<IModelImmutable<MessageDataType>>;

    containsModel(model: IModelImmutable<MessageDataType>): boolean;
}

export interface IModelContainer<MessageDataType> extends IModelContainerImmutable<MessageDataType>, IModel<MessageDataType>, IHierarchyObjectContainer<MessageDataType>
{
    isIModelContainer(): void;

    addModel(model: IModel<MessageDataType>): IModelContainer<MessageDataType>;

    removeModel(model: IModel<MessageDataType>, dispose?: boolean): IModelContainer<MessageDataType>;

    removeAllModels(dispose?: boolean): IModelContainer<MessageDataType>;

    get modelList(): IModel<MessageDataType>[];
}

export class ModelContainer<MessageDataType> extends HierarchyObjectContainer<MessageDataType> implements IModelContainer<MessageDataType>
{
    private _modelList: IModel<MessageDataType>[] = [];
    private _modelListImmutable: IModelImmutable<MessageDataType>[] = [];

    public addModel(model: IModel<MessageDataType>): IModelContainer<MessageDataType>
    {
        const success: boolean = this.add(model);

        if (success)
        {
            this._modelList.push(model);
            this._modelListImmutable.push(model);
        }

        return this;
    }

    public removeModel(model: IModel<MessageDataType>, dispose = false): IModelContainer<MessageDataType>
    {
        const success: boolean = this.remove(model, dispose);

        if (success)
        {
            ArrayUtils.remove(this._modelList, model);
            ArrayUtils.remove(this._modelListImmutable, model);
        }

        return this;
    }

    public removeAllModels(dispose = false): IModelContainer<MessageDataType>
    {
        this.removeAll(dispose);

        ArrayUtils.clear(this._modelList);
        ArrayUtils.clear(this._modelListImmutable);

        return this;
    }

    public get numModels(): number
    {
        return (this.children != null) ? this.children.length : 0;
    }

    public containsModel(model: IModelImmutable<MessageDataType>): boolean
    {
        return this.contains(model);
    }

    // better to return copy, but in sake of performance, we do that way.
    public get modelList(): IModel<MessageDataType>[]
    {
        return this._modelList;
    }

    // better to return copy, but in sake of performance, we do that way.
    public get modelListImmutable(): ReadonlyArray<IModelImmutable<MessageDataType>>
    {
        return this._modelListImmutable;
    }

    public isIModel(): void
    {
    }

    public isIModelContainer(): void
    {
    }
}

setDefaultImplementation("IModelContainer", ModelContainer);