import {CommandExecution, ServiceToken} from "../../src";

export type BulletView = {
    readonly x: number;
    readonly y: number;
};

export interface SceneModelImmutable
{
    readonly scene: string;
    readonly level: string;
    readonly ticks: number;
    readonly shots: number;
    readonly bullets: readonly BulletView[];
}

export interface SceneModelMutable extends SceneModelImmutable
{
    fire(): void;

    tick(delta: number): void;

    loaded(level: string): void;
}

export const SCENE_MODEL = new ServiceToken<SceneModelMutable>("SceneModel");
export const SCENE_MODEL_IMMUTABLE = new ServiceToken<SceneModelImmutable>("SceneModelImmutable");
export const SCENE_NAME = new ServiceToken<string>("SceneName");

export interface LevelLoader
{
    load(level: string, delay: number, signal: AbortSignal): Promise<string>;
}

export const LEVEL_LOADER = new ServiceToken<LevelLoader>("LevelLoader");

export interface HudImmutable
{
    readonly lastLoaded: string;
    readonly loads: number;
}

export interface HudMutable extends HudImmutable
{
    update(level: string): void;
}

export const HUD_MODEL = new ServiceToken<HudMutable>("HudModel");
export const HUD_MODEL_IMMUTABLE = new ServiceToken<HudImmutable>("HudModelImmutable");

export interface SceneSwitcher
{
    switchScene(scene: string, execution: CommandExecution): Promise<void>;
}

export const SCENE_SWITCHER = new ServiceToken<SceneSwitcher>("SceneSwitcher");
