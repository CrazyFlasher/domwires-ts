# Scene lab walkthrough

[Documentation](index.md)

Run `npm run example` and choose **Open the scene lab**. The counter is the smaller introduction; the scene lab shows composition and asynchronous lifetime in one runnable application.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/scene-contexts-dark.svg">
  <img src="assets/scene-contexts-light.svg" alt="GameContext owns SceneContext and HudContext. TICK, FIRE and LOAD enter the scene. LEVEL_LOADED leaves the scene and enters HUD. Closing a scene cancels its loading command and releases its owned resources.">
</picture>

## Fire and render

The Fire button in [main.ts](../examples/game/main.ts) dispatches `FIRE` from `GameContext`. Its explicit receive predicate admits that message into `SceneContext`, where `map(FIRE, Fire)` runs the [Fire command](../examples/game/commands/Fire.ts).

The command receives the mutable scene-model token. `SceneModel.fire()` obtains a projectile, changes model state and emits `STATE_CHANGED`. The scene context forwards the notification to `SceneView`, which reads the same live model through its Immutable token and draws it. The [view](../examples/game/views/SceneView.ts) is attached by the browser bootstrap; the model/commands can also run without a DOM.

The diagram in the README shows only this route. It intentionally leaves out the independent tick loop, loading and HUD routes.

## Load and update HUD

`LOAD` maps to [Load](../examples/game/commands/Load.ts) with `concurrency: "latest"`. It awaits a [TimerLevelLoader](../examples/game/adapters/TimerLevelLoader.ts), forwarding its abort signal, then commits a model update if still current.

`SceneModel.loaded()` emits local `STATE_CHANGED` and cross-context `LEVEL_LOADED`. The scene's bubble predicate allows only `LEVEL_LOADED` out. The root forwards it to `HudContext` through that child's receive predicate. [UpdateHud](../examples/game/commands/UpdateHud.ts) updates HUD state, and `HudView` renders it.

The adapter owns the timer mechanics. The command owns the application decision to apply a loaded result. No additional Service base class is required.

## Switch a scene

`SWITCH` maps to a serial [SwitchScene](../examples/game/commands/SwitchScene.ts) command. The root awaits the old scene's close before creating the new one. Closing cancels active loads and releases the scene's adapter, model pool and view. The root clock and HUD have their own lifetimes and survive a scene switch.

The root provides `SCENE_NAME` to the new child explicitly. Other dependencies do not cross that boundary automatically. Only the configured message predicates cross the routing boundary.

## Pool and diagnostics

`SceneModel` preallocates 12 bullets. Its fire method enforces the active limit before acquisition; inactive bullets are reused. The generic factory's safe-pool mode can otherwise grow capacity, so this demo's bound comes from the model's explicit active-count check.

The trace panel keeps a bounded history in the example. The framework does not retain that history. Resource counters and browser tests verify repeated scene switching and remounting; inspect [verification commands](contributing.md) to reproduce them.
