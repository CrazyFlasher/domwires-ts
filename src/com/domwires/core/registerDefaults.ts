import {setDefaultImplementation} from "./Global";
import {IMessageDispatcher, MessageDispatcher} from "./mvc/message/IMessageDispatcher";
import {HierarchyObjectContainer, IHierarchyObjectContainer} from "./mvc/hierarchy/IHierarchyObjectContainer";
import {CommandMapper, ICommandMapper} from "./mvc/command/ICommandMapper";

let isRegistered = false;

/**
 * Registers default implementations of the framework interfaces. It is called on the package import,
 * so the modules themselves stay free of side effects.
 */
export function registerDefaults(): void
{
    if (isRegistered)
    {
        return;
    }

    isRegistered = true;

    setDefaultImplementation<IMessageDispatcher>("IMessageDispatcher", MessageDispatcher);
    setDefaultImplementation<IHierarchyObjectContainer>("IHierarchyObjectContainer", HierarchyObjectContainer);
    setDefaultImplementation<ICommandMapper>("ICommandMapper", CommandMapper);
}
