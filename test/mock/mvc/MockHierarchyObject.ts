/* eslint-disable @typescript-eslint/no-explicit-any */

import {AbstractHierarchyObject} from "../../../src";

export class MockHierarchyObject<MessageDataType = any> extends AbstractHierarchyObject<MessageDataType>
{
    public constructor()
    {
        super();
    }
}