/* eslint-disable @typescript-eslint/no-explicit-any */

import {HierarchyObjectContainer} from "../../../src";

export class MockHierarchyObjectContainer extends HierarchyObjectContainer
{
    private value: boolean;

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