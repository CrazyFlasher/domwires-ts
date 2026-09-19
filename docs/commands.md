# Commands and asynchronous work

[Documentation](index.md)

## One action, one invocation

`ICommand<Input>.execute(input, execution)` accepts typed input and a `CommandExecution`. It returns `void` or a promise-like completion. A plain class implementing that contract works; `AbstractCommand` supplies disposal and optional logging. `AbstractAsyncCommand` bridges callback-style `resolve()`/`reject()` code.

Use `context.map(MESSAGE, Command, options)` for messages and `context.execute(Command, input, options)` for direct calls. Each invocation receives its own factory scope, `COMMAND_INPUT`, `COMMAND_EXECUTION`, named payload bindings and an abort signal. There is no global current-message state.

`map()` returns a disposable handle. Arrays of messages and/or commands register all pairs and return a `MappingConfigList`; each command must accept every selected payload type. Removing a specific handle removes that exact registration, even when duplicates exist.

## Options and lifetimes

| Option | Contract |
| --- | --- |
| `guards` / `guardsNot` | All guards must allow / all opposite guards must deny. Checks are synchronous and run just before execution. |
| `once` | Consumed before the first allowed command starts. Denied guards do not consume it; a later command failure does. |
| `stopOnExecute` | Stops subsequent mappings in that dispatch after an allowed execution. In a batch it applies to the final command for each message. |
| `data` / `dataMode` | Default `merge` shallowly composes objects with mapping data winning; primitive mapping data replaces input. `fallback` uses mapping data only for undefined message input. |
| `lifetime: "execution"` | Default: create and dispose a command for each invocation. |
| `lifetime: "context"` | Retain one instance per command class and mapper until mapper disposal. Overlapping/recursive use is rejected. |

`CommandMapperConfig.defaultLifetime` and `defaultDataMode` supply mapper defaults. Generic object pools do not control command lifetime. A retained command's constructor dependencies come from its first invocation; keep request-specific data in execute parameters or reinjected properties.

## Repeated messages

| Concurrency | Behavior for this mapping |
| --- | --- |
| `parallel` | Default. Start independent invocations. |
| `serial` | Queue FIFO. Continue processing later requests after a failure. |
| `latest` | Abort older active invocations and start the newest. Requires execution lifetime. |
| `drop` | Skip while this mapping is busy. A skip does not trigger stopOnExecute. |

Queues belong to mappings, not command classes. Two serial mappings using one context-lifetime class can still contend for its retained instance. These queue policies do not apply to direct `execute()` calls.

Within one dispatch, mappings run in registration order and an asynchronous command delays the next mapping. A rejected execution stops that dispatch chain. Independent dispatches continue according to their own mapping policies.

## Cancellation and errors

Pass `execution.signal` to the adapter. After an await, call `execution.commit(() => model.update(result))` or `throwIfCancelled()` before changing state. The [Load command](../examples/game/commands/Load.ts) demonstrates this pattern.

`commit()` checks cancellation immediately before a **synchronous** callback. It is neither a transaction nor rollback, and must not receive an async callback. Cancellation is cooperative: JavaScript that ignores the signal continues running; `close()` waits for it to finish.

Removing a mapping cancels its active and queued work. Automatic `once` consumption lets its reserved invocation finish. Mapper/context disposal also cancels direct invocations. A cancelled invocation rejects with `CommandCancelledError`; normal cancellation is excluded from `settle()` and `close()` failure reports. Cleanup failures remain real failures.

Await direct `execute()` calls to observe individual failures. For message-driven work, await `settle()`. A handled direct rejection is still reported by the next settle call. The tracker retains at most 32 completed failures per drain period and counts additional failures; draining reports and clears the buffer. Successful completed tasks are released.

## Trace

Assign `context.trace` to receive message, guard, queued/skipped, started and completed/failed/cancelled events. IDs identify mapper, message, mapping and execution; the original message ID survives forwarding.

The framework stores no history or payload log. The observer controls its own bounded buffer. Observer exceptions and rejected promises increment `traceErrorCount` without failing commands. Async observers are not awaited by commands or settle. Configure each participating context explicitly; the [game root](../examples/game/contexts/GameContext.ts) does this in `observe()`.
