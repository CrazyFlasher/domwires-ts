import {MessageType} from "../../src";

export const LOAD = new MessageType<{id: string}>("load");
export const RESULT_CHANGED = new MessageType<{id: string}>("resultChanged");
