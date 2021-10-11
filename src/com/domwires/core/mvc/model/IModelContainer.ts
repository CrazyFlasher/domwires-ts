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
    addModel(model: IModel): IModelContainer;

    removeModel(model: IModel, dispose?: boolean): IModelContainer;

    removeAllModels(dispose?: boolean): IModelContainer;

    get modelList(): Array<IModel>;
}

export class ModelContainer extends HierarchyObjectContainer implements IModelContainer
{
    private _modelList: Array<IModel> = [];
    private _modelListImmutable: Array<IModelImmutable> = [];

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

    public removeModel(model: IModel, dispose: boolean = false): IModelContainer
    {
        const success: boolean = this.remove(model, dispose);

        if (success)
        {
            ArrayUtils.remove(this._modelList, model);
            ArrayUtils.remove(this._modelListImmutable, model);
        }

        return this;
    }

    public removeAllModels(dispose: boolean = false): IModelContainer
    {
        this.removeAll(dispose);

        ArrayUtils.clear(this._modelList);
        ArrayUtils.clear(this._modelListImmutable);

        return this;
    }

    get numModels(): number
    {
        return (this.children != null) ? this.children.length : 0;
    }

    public containsModel(model: IModelImmutable): boolean
    {
        return this.contains(model);
    }

    // better to return copy, but in sake of performance, we do that way.
    get modelList(): Array<IModel>
    {
        return this._modelList;
    }

    // better to return copy, but in sake of performance, we do that way.
    get modelListImmutable(): ReadonlyArray<IModelImmutable>
    {
        return this._modelListImmutable;
    }
}

setDefaultImplementation("IModelContainer", ModelContainer);