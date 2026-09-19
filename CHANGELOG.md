# Changelog

## 5.0.0-rc.1

First release candidate for DomWires 5.0. This is a breaking redesign of 2.x;
the previous implementation is maintained on `v2.x`.

- Typed message payloads, service tokens and command inputs, including constructor injection.
- Explicit model mutation/read contracts and scoped dependencies for commands, models, mediators and adapters.
- Child contexts with explicit dependency sharing and message routes.
- Unified `map` / `execute` API, execution/context command lifetimes and parallel/serial/latest/drop concurrency.
- Cooperative cancellation, per-invocation command scopes, guards and disposable mappings.
- Explicit resource ownership, asynchronous startup/cleanup and bounded task tracking.
- Optional command tracing with dispatch, mapping and execution identities.
- Scoped default implementation registries, factory providers and reusable object pools.
- Corrected listener mutation, reentrant dispatch, routing metadata, injection and lifecycle behavior.
- CommonJS and native Node ESM entry points sharing runtime identity; native browser ESM output.
- Counter, scoped-request and game examples, API documentation and new architecture diagrams.
- Runtime, compile-time, packed-consumer, browser and lifecycle stress checks.

Migration requires replacing the old command mapping/execution methods with `map` and `execute`,
declaring payloads on `MessageType<T>`, and making cross-context dependencies and routing explicit.
`Immutable` interfaces remain live read contracts, not frozen snapshots.
