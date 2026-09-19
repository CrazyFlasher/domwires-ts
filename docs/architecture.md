# Architecture and contracts

[Documentation](index.md)

## Concept

DomWires separates state, presentation, actions and composition. A model owns state. Its mutable interface exposes state-changing operations; its immutable interface exposes live readable state. A mediator translates external input into intentions and renders model state. A command performs an application action. A context composes these objects, maps intentions to commands and forwards notifications.

The AS3/Haxe concept is preserved. The 5.0 changes concern dependency boundaries, execution lifetime, routing correctness and explicit cleanup. External infrastructure is represented by ordinary adapters, not a required fifth MVC base class. A command may await an adapter and then update a model; a long-lived connection belongs to a context or resource scope.

## Dependency scopes

A `Factory` owns its local bindings and object pools. Its values are borrowed unless explicitly owned elsewhere. `createScope()` creates a child that resolves local bindings first. With no options it inherits bindings; `{inherit: []}` is isolated, and `{inherit: [TOKEN]}` imports selected identifiers. Selected identifiers include their named bindings. An inherited transient implementation/provider resolves against the requesting child scope.

Bindings distinguish an explicitly bound `undefined` from an absent value. Value bindings take precedence over providers and classes. Providers are transient; bind an already created value when you need shared identity. Class construction supports a static `inject` token list, property injection, then a synchronous post-construction hook. Async initialization belongs in `start()`.

A lazy property captures the scope which created/injected the object. Execution payloads never change the parent factory. Every invocation has fresh named payload bindings, `COMMAND_INPUT`, `COMMAND_EXECUTION` and its own `IFactory`. Reused explicit singleton commands are reinjected only when idle. Constructor dependencies of a singleton remain the dependencies from its construction; do not inject request-specific data into a singleton constructor.

Property metadata is inherited from base to derived, with derived declarations overriding the same property. Injection plans are cached and invalidated when decorators are applied programmatically. Resolution cycles report the identifier path. Constructor and provider errors do not temporarily erase existing value bindings.

`ServiceToken<T>` carries an invariant compile-time type and unique runtime identity. Its name is diagnostic. String identifiers and legacy property decorators cannot guarantee that a consumer's declared property type matches the binding. Role separation is an architectural boundary, not a sandbox against casts, direct object construction or intentional access to a composition factory.

## Context composition

Every context created through a factory creates an owned local factory, even when its input factory is shared. A context creates separate command, model, mediator and adapter scopes. The command scope inherits the context factory; the other role scopes inherit only the logger. `provide(token, value, roles)` exports a borrowed dependency to selected roles.

`registerModel({mutable, immutable, implementation/value, id})` registers one hierarchy object and publishes its two contracts. Commands/guards see both; the reader roles see only the immutable contract. The immutable interface may contain only data/getters; it need not expose hierarchy operations. Tokens must be distinct. Removing or reparenting the model also removes its local role bindings.

`createMediator()` attaches a mediator with the reader scope. `createAdapter()` constructs an ordinary infrastructure object with read access; it does not automatically own it. `own(adapter)` makes ownership explicit. There is no built-in HTTP, database, Socket.IO, email, authentication or rendering dependency.

`createContext()` constructs a child with an explicit dependency export list. `addContext()` attaches an existing context. A receive predicate selects messages sent into a child; a bubble predicate selects messages leaving it. Without those predicates, messages stop at that context boundary. The usual model-to-mediator and mediator-to-mediator forwarding defaults remain inside each context; the four `ContextConfig` flags control these routes.

Using the lower-level `factory` or manually constructing and attaching components intentionally leaves composition to the caller.

## Execution and mapping

`ICommand<Input>.execute(input, execution)` returns void or a promise-like value. No base class is required. `AbstractCommand<Input>` is a convenience; `AbstractAsyncCommand` remains a callback adapter for code using `resolve/reject`, with fresh instances by default.

`map(message, Command, options)` checks message input against the command and checks mapping data, including batch registrations. `execute(Command, input, options)` checks direct input. Options name guards, lifetime, concurrency and once/stop flags. `route(message)` is the low-level boundary for an already received message; applications normally use typed dispatch. Object mapping data overwrites corresponding message fields; absent values use the present side, and primitives use the mapping value. This is shallow composition. `dataMode: "fallback"` uses mapping data only when message data is undefined.

An invocation performs these steps:

1. Create its dependency scope and execution signal view.
2. Evaluate target guards, guards and opposite guards in that scope.
3. Create a command (or obtain an idle explicitly retained instance).
4. Reserve a once registration by removing that exact handle.
5. Invoke the command and inspect its actual returned value.
6. Await a promise-like result before the next mapping; dispose invocation resources in the completion path.

Commands use `lifetime: "execution"` by default. `lifetime: "context"` retains one instance per command class and mapper; overlapping or recursive use is rejected. `CommandMapperConfig.defaultLifetime` changes that default. Generic pools do not determine command or guard lifetime. Optional property injection restores the original field default when a later invocation has no binding, preventing stale payload values.

A dispatch iterates a snapshot of mappings. Removed handles are skipped, newly added mappings wait for a subsequent dispatch, and removing one once mapping does not skip its successor. Guard rejection does not consume once. Once is consumed before command user code, including a command that later throws. A stop flag stops only after an allowed execution; in a batch it applies to the final command for every registered message. Execution failure rejects that command chain and stops subsequent mappings in the chain.

Guards expose a synchronous boolean `allows` contract. Guard implementations should be side-effect free.

Each mapping owns a scheduler. `parallel` starts independently; `serial` queues FIFO and continues after an earlier failure; `latest` aborts earlier active executions; `drop` skips a busy mapping. Guards run when queued work actually starts. Separate mappings have separate queues even for the same command class. Context-lifetime instances are shared by class, so different serial mappings can still contend for one instance. `latest` with context lifetime is rejected during registration.

Explicit unmap/dispose cancels active and queued work. Automatic once consumption lets its reserved command finish. A skip does not trigger stopOnExecute. Failure or cancellation stops the rest of that dispatch chain, without preventing unrelated queued requests.

Trace is an optional callback per mapper/context. Events include mapper/message/mapping/execution IDs, guard decisions, command outcome and duration. All delivery frames retain the original message ID. The framework stores no event history or payloads. The observer owns any buffer; failures are isolated and counted. Async observers are observed for rejection but not awaited by commands or settle. Set trace on every participating context, as the game example does. Trace observers should avoid mutating application state.

## Messages and hierarchy

A message type carries its payload contract. Required payloads cannot be omitted, listeners receive that payload, and explicit generic arguments cannot change a token's contract.

Each dispatch creates a message. Each delivery receives stable `initialTarget`, `currentTarget` and `previousTarget` metadata; retaining a listener's message does not later turn its current target into another recipient. Payload objects are not deep-frozen. `stopPropagation()` is shared between delivery frames. It stops subsequent targets; it does not interrupt the remaining listeners at the current target.

Listeners run by priority, preserving registration order among equal priorities. Each delivery iterates a snapshot. A listener added during delivery waits for a later dispatch; a removed listener is skipped immediately. A once listener is removed before invocation, making recursive dispatch safe. `subscribe()` provides an independent disposable registration, convenient for `ResourceScope`.

All children occupy one ordered collection. IDs are a secondary index into that collection. Numeric lookup therefore includes named children. Duplicate IDs, invalid indices, self-parenting and ancestor cycles are rejected. Removal by instance, removal by ID, reparenting and child disposal all update parent membership and context role indexes. Public child collections are read-only snapshots.

Direct context add calls still require an explicit role through `addModel`, `addMediator` or `addContext`. `root` means the nearest containing context (or the context itself), preserving the framework's routing interpretation.

## Completion, cancellation and cleanup

Only unresolved asynchronous work is kept in a mapper's active set. Successful synchronous commands and unmapped messages create no task bookkeeping. Completed failures are held until settle, with a bounded buffer (32 error objects plus a count of further failures).

`settle()` drains work to quiescence, including directly launched commands and attached child contexts. It uses all-settled behavior: one failure does not make it forget slower work. Concurrent calls share a drain. After all outstanding work finishes it raises an aggregate of failures; a subsequent settle starts a new drain.

`CommandExecution.signal` is aborted on mapper/context or mapping disposal, on superseding latest requests, and on cancellation of an explicitly supplied signal. Adapters should accept that signal. `commit(update)` checks cancellation before changing state. A command that ignores cancellation is not intercepted and can keep close pending. Expected cancellation rejects with `CommandCancelledError`, which is excluded from settle failures; actual command and cleanup errors still fail even during cancellation.

`ResourceScope` owns explicitly registered objects with `close()` or `dispose()`, and cleanup callbacks registered with `defer()`. Startable resources are registered before start. Subscriptions or other resources without a start hook may also be registered after start. Cleanup runs in reverse ownership order, waits for asynchronous cleanup, continues after individual failures and aggregates errors. Closing while a resource is starting aborts its signal and waits for that start attempt before cleaning it up. Close is idempotent.

A context owns attached hierarchy components and its local factories. Provided external values remain borrowed. Context `dispose()` initiates cancellation/cleanup and detaches children; `close()` waits for commands, child closes and resource cleanup. Use close when asynchronous work exists.

After a successful constructor, failed injection or a failed synchronous post-construction hook attempts synchronous disposal of the partially initialized object. Constructors that themselves throw must clean up resources acquired before throwing. Rejected child/mediator attachment disposes the newly created object. Failed context startup closes its components and resources.

## Pools and configuration

Generic pools serve reusable application objects independently of commands. Capacities and increases must be positive safe integers. Pools create their own instances rather than repeating a mapped value. Busy scanning is bounded. Safe mode grows the pool when every item is busy; disabling it makes exhaustion an error. Pool removal/disposal calls synchronous dispose on owned disposable items.

Each factory has an implementation registry with explicit aliases. Child registries inherit aliases without modifying the parent. The dynamic config loader supports named implementations and named new instances. Legacy `definableFromString` registration uses a module-local map, not `globalThis`. Framework default-implementation registration remains a module side effect; the package does not claim `sideEffects: false`.

## Verification boundaries

Runtime tests cover the 21 original defect scenarios plus scope, ownership and integration behavior. Negative compile-time tests cover the typed API. The package consumer fixture installs a tarball and checks CJS, ESM, declarations and a minified browser bundle; the node-only config loader stays in a separate subpath.

The VM smoke check is a fast bundle check. Playwright additionally exercises both examples in Chromium, including 100 scene switches and 100 restarts with DOM/listener/heap checks. A Node stress run performs 2800 game lifecycles, checking explicit zero resource counts and retained heap after warmup. CI runs these checks and uploads the browser report. Their scope is the tested workloads, not arbitrary application leak freedom.

The benchmark is a reproducible microbenchmark of mapped and unmapped synchronous messages. Its time and heap samples are diagnostic, not a promise of application performance. Profile actual scene updates or request workloads before adopting pooling or additional concurrency policies.
