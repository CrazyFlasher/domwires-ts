import {MessageType} from "../../src";

export const TICK = new MessageType<{delta: number}>("tick");
export const FIRE = new MessageType<void>("fire");
export const LOAD = new MessageType<{level: string; delay: number}>("load");
export const SWITCH = new MessageType<{scene: string}>("switch scene");
export const SCENE_CHANGED = new MessageType<void>("scene changed");
export const STATE_CHANGED = new MessageType<void>("state changed");
export const LEVEL_LOADED = new MessageType<{level: string}>("level loaded");
export const HUD_CHANGED = new MessageType<void>("hud changed");

export const TOGGLE_RUNNING = new MessageType<void>("toggle running");
export const RUNNING_CHANGED = new MessageType<{running: boolean}>("running changed");
export const TOGGLE_TRACE = new MessageType<void>("toggle trace");
export const RESTART_DEMO = new MessageType<void>("restart demo");
export const CLOSE_DEMO = new MessageType<void>("close demo");
