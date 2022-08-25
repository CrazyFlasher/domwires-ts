/* eslint-disable @typescript-eslint/no-empty-function */

import {IModel, IModelImmutable} from "./IModel";
import {
    HierarchyObjectContainer,
    IHierarchyObjectContainer,
    IHierarchyObjectContainerImmutable
} from "../hierarchy/IHierarchyObjectContainer";
import ArrayUtils from "../../utils/ArrayUtils";
import {setDefaultImplementation} from "../../Global";

export interface IModelContainerImmutable extends IModelImmutable, IHierarchyObjectContainerImmutable
{
    get numModels(): number;

    get modelListImmutable(): ReadonlyArray<IModelImmutable>;

    containsModel(model: IModelImmutable): boolean;
}

export interface IModelContainer extends IModelContainerImmutable, IModel, IHierarchyObjectContainer
{
    isIModelContainer(): void;

    addModel(model: IModel): IModelContainer;

    removeModel(model: IModel, dispose?: boolean): IModelContainer;

    removeAllModels(dispose?: boolean): IModelContainer;

    get modelList(): IModel[];
}

export class ModelContainer extends HierarchyObjectContainer implements IModelContainer
{
    private _modelList: IModel[] = [];
    private _modelListImmutable: IModelImmutable[] = [];

    public addModel(model: IModel): IModelContainer
    {
        const success: boolean = this.add(model);

        if (success)
        {
            this._modelList.push(model);
            this._modelListImmutable.push(model);
        }

        return this;
    }

    public removeModel(model: IModel, dispose = false): IModelContainer
    {
        const success: boolean = this.remove(model, dispose);

        if (success)
        {
            ArrayUtils.remove(this._modelList, model);
            ArrayUtils.remove(this._modelListImmutable, model);
        }

        return this;
    }

    public removeAllModels(dispose = false): IModelContainer
    {
        this.removeAll(dispose);

        ArrayUtils.clear(this._modelList);
        ArrayUtils.clear(this._modelListImmutable);

        return this;
    }

    public get numModels(): number
    {
        return this.children ? this.children.length : 0;
    }

    public containsModel(model: IModelImmutable): boolean
    {
        return this.contains(model);
    }

    // better to return copy, but in sake of performance, we do that way.
    public get modelList(): IModel[]
    {
        return this._modelList;
    }

    // better to return copy, but in sake of performance, we do that way.
    public get modelListImmutable(): ReadonlyArray<IModelImmutable>
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

setDefaultImplementation<IModelContainer>("IModelContainer", ModelContainer);