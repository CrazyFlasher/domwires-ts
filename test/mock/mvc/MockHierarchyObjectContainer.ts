import {HierarchyObjectContainer} from "../../../src/com/domwires/core/mvc/hierarchy/IHierarchyObjectContainer";

export class MockHierarchyObjectContainer extends HierarchyObjectContainer
{
    private value: boolean;

    dispose()
    {
        this.value = true;

        super.dispose();
    }

    getValue(): boolean
    {
        return this.value;
    }
}