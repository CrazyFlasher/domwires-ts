/* eslint-disable @typescript-eslint/no-explicit-any */

import {HierarchyObjectContainer, IHierarchyObject, IHierarchyObjectImmutable} from "../../../src";

export class MockHierarchyObjectContainer extends HierarchyObjectContainer<IHierarchyObject, IHierarchyObjectImmutable>
{
    private value!: boolean;

    public override dispose()
    {
        this.value = true;

        super.dispose();
    }

    public getValue(): boolean
    {
        return this.value;
    }
}