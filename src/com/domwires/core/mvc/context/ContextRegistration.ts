import {Class, Type} from "../../Global";
import {IHierarchyObject} from "../hierarchy/IHierarchyObject";
import {IMessage} from "../message/IMessage";

/** Dependency-access role selected by the context construction helpers. */
export type ComponentRole = "command" | "model" | "mediator" | "adapter";
/** Own a model instance or construct one, then expose distinct write and read contracts. */
export type ModelRegistration<M, R> = {
    /** Write contract published to commands and guards. */
    mutable: Type<M>;
    /** Live read contract published to every role; must be a distinct token. */
    immutable: Type<R>;
    /** Optional model lookup id within this context. */
    id?: string;
} & ({value: M & R & IHierarchyObject; implementation?: never} | {implementation: Class<M & R & IHierarchyObject>; value?: never});

/** Opt-in message routes for an attached child context. Dependencies are configured separately. */
export type ChildContextOptions = {
    /** Optional child lookup id in the parent hierarchy. */
    id?: string;
    /** Explicitly choose the messages this child receives from its parent. */
    receive?: (message: IMessage) => boolean;
    /** Explicitly choose which child messages may bubble into its parent. */
    bubble?: (message: IMessage) => boolean;
};
