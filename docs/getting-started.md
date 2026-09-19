# Getting started

[Documentation](index.md)

## Try the 5.0 release candidate

The package in this checkout is being prepared for DomWires 5.0. An unqualified `npm install domwires` may still install the published 2.x API. After RC publication, install it with `npm install domwires@next`. To try this checkout before publication:

```sh
npm ci
npm run build
npm run example
```

Open the printed localhost address. The counter page links to the scene lab. For a separate application, run `npm pack` here and install the resulting local `.tgz` file in that application. Import from `domwires`; use `domwires/node` only for Node-specific config loading.

The package is built with TypeScript 7 and targets ES2022. Property decorators require `experimentalDecorators: true`; emitted reflection metadata is unnecessary. Consumer code can use constructor injection (`static readonly inject`) and providers without decorators. A consumer does not need the compiler at runtime.

## Your first message

The [README quick start](../README.md#quick-start) is a complete program. Its [source](snippets/quick-start.ts) is compiled and run by `npm run docs:check`.

1. `MessageType<{name: string}>` defines a message identity with a payload contract. Reuse the same instance when dispatching and mapping.
2. `Greet` performs the action. Commands may return `void` or a promise-like value.
3. `AppContext.init()` calls `super.init()` before mapping. Construct it through `Factory.getInstance()` so injection and the synchronous initialization hook run.
4. `dispatchMessage()` delivers synchronously. `settle()` waits for command work and reports failures.
5. `close()` cancels and drains work, and closes owned resources. The independently created root factory is disposed separately.

## Add state and presentation

The [counter context](../examples/frontend/CounterContext.ts) is the smallest complete MVC example. Follow its imports in this order:

| File | Responsibility |
| --- | --- |
| [CounterModel](../examples/frontend/CounterModel.ts) | State, mutable/Immutable contracts, separate typed tokens and change notification |
| [AppMessage](../examples/frontend/AppMessage.ts) | Typed user intentions |
| [ChangeCounterCommand](../examples/frontend/ChangeCounterCommand.ts) | Changes the model through its mutable contract |
| [CounterIsNotAtMaxGuards](../examples/frontend/CounterIsNotAtMaxGuards.ts) | Synchronous precondition |
| [CounterMediator](../examples/frontend/CounterMediator.ts) | Translates DOM input, reads live model state and updates the view |
| [CounterContext](../examples/frontend/CounterContext.ts) | Registers the model, exports the mount point, creates the mediator and maps commands |

`registerModel()` publishes the mutable token to commands/guards and the Immutable token to all roles. The tokens refer to the same live model. Readers see current state without receiving model mutation methods. TypeScript access contracts do not freeze JavaScript objects.

Keep I/O in ordinary adapters. Let a command await the adapter and decide how to update the model. Give a context ownership of long-lived adapters using `own()`; merely sharing them through `provide()` borrows them.

Continue with [architecture](architecture.md), [commands](commands.md) and [lifetime](lifecycle.md).
