# Ownership and lifetime

[Documentation](index.md)

Dependency access and ownership are separate. A value supplied to `mapToValue()` or `provide()` is borrowed. `own()` transfers cleanup responsibility to a context or `ResourceScope`; `defer()` registers a cleanup callback.

## What owns what?

| Object | Lifetime owner |
| --- | --- |
| Model registered/attached to a context | Context while attached |
| Mediator created/attached to a context | Context while attached |
| Child attached with createContext/addContext | Parent while attached |
| Result of createAdapter | Caller, until explicitly passed to own() |
| Shared injected value | Its creator or explicitly designated owner |
| Pool objects | Factory that registered the pool |
| Command with execution lifetime | Invocation |
| Command with context lifetime | Command mapper |

Removing a child defaults to detaching without disposal. That transfers cleanup responsibility back to the caller. Model role bindings are removed on detachment. Reparenting detaches from the old parent without disposing the object.

## Initialization and startup

Construct framework components through a factory. Construction injects constructor dependencies, injects properties, then invokes the synchronous post-construction hook. Context overrides call `super.init()` before registration. A rejected/throwing initialization attempts cleanup of the partially initialized object.

Register asynchronous initialization as a resource `start(signal)` hook and call `context.start()` after composition. Resources start sequentially in ownership order. Startable resources must be registered before startup begins. Startup failure closes the context and aggregates cleanup failures when necessary.

`start()` applies to the context's own registered resources. It does not recursively start child contexts; the parent decides when each child should start.

## Three different operations

| Method | What it does |
| --- | --- |
| `settle()` | Waits for mapped/direct commands in the context and attached child contexts, and reports buffered failures. It leaves the context and producers running. |
| `dispose()` | Marks/disposes synchronous state, aborts commands and starts owned-resource/child cleanup. It does not wait for asynchronous completion. |
| `close()` | Initiates disposal if needed, then waits for commands, child closure and resource cleanup. Repeated calls share a promise. |

Prefer `await close()` when commands or cleanup can be asynchronous. Most `AbstractDisposable` objects reject repeated `dispose()` calls, so use their `isDisposed` flag when necessary. Do not assume every disposable has an idempotent dispose method; subscription handles and mapping handles do.

Cleanup callbacks/resources execute in reverse registration order. If a resource has both `close()` and `dispose()`, close wins. Cleanup waits for that resource's in-progress startup, attempts the remaining resources after a failure, then reports an `AggregateError`.

Commands are cancelled before context teardown. An adapter must support cooperative cancellation; a never-finishing command can prevent `close()` from completing. `settle()` is not a guarantee that a timer will never dispatch another command. Detached child cleanup is outside the parent's ordinary settle operation; parent close includes child work that it started closing during teardown.

See [scene replacement](../examples/game/commands/SwitchScene.ts) and the [request context](../examples/scoped/RequestContext.ts) for complete examples.
