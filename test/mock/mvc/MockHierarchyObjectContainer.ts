import {HierarchyObjectContainer} from "../../../src/com/domwires/core/mvc/hierarchy/IHierarchyObjectContainer";

export class MockHierarchyObjectContainer extends HierarchyObjectContainer
{
    private value: boolean;

    public dispose()
    {
        this.value = true;

        super.dispose();
    }

    public getValue(): boolean
    {
        return this.value;
    }
}