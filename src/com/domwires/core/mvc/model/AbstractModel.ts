import {AbstractHierarchyObject} from "../hierarchy/AbstractHierarchyObject";
import {IModel} from "./IModel";
import {postConstruct} from "inversify";

export abstract class AbstractModel extends AbstractHierarchyObject implements IModel
{
    @postConstruct()
    protected init(): void
    {
        Object.setPrototypeOf(this, AbstractModel);
    }
}