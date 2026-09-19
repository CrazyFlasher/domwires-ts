import {IHierarchyObjectContainer, IHierarchyObjectContainerImmutable} from "./IHierarchyObjectContainer";
import {IMessageDispatcher, IMessageDispatcherImmutable} from "../message/IMessageDispatcher";

/** Read access to a hierarchy node and its message subscriptions. */
export interface IHierarchyObjectImmutable extends IMessageDispatcherImmutable
{
    /**
     * Immediate parent through its immutable contract, or undefined when detached.
     */
    get parentImmutable(): IHierarchyObjectContainerImmutable | undefined;

    /**
     * Nearest context (including this object when it is a context), or undefined if no context exists.
     */
    get rootImmutable(): IHierarchyObjectContainerImmutable | undefined;

    /**
     * Legacy structural marker; runtime identification uses the framework brand.
     */
    isIHierarchyObject(): void;
}

/** Mutable hierarchy membership and message dispatch. */
export interface IHierarchyObject extends IHierarchyObjectImmutable, IMessageDispatcher
{
    /**
     * Reparents with cycle checks and synchronized container membership. Undefined detaches without disposal.
     */
    setParent(value: IHierarchyObjectContainer | undefined): IHierarchyObject;

    /**
     * Immediate parent, or undefined when detached.
     */
    get parent(): IHierarchyObjectContainer | undefined;

    /**
     * Nearest context (including this object when it is a context), or undefined if no context exists.
     */
    get root(): IHierarchyObjectContainer | undefined;
}