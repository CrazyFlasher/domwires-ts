/* eslint-disable @typescript-eslint/no-explicit-any */

import {HierarchyObjectContainer} from "../../../src";

export class MockHierarchyObjectContainer<MessageDataType = any> extends HierarchyObjectContainer<MessageDataType>
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