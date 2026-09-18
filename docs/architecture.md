# Architecture

How the framework works inside. Layers depend in one direction only:

```
Global (types, brands, class registry)
  └── di (container, decorators, lazy registry)
        └── common (IDisposable)
              └── mvc/message  (MessageType, Message, MessageDispatcher)
                    └── mvc/hierarchy (object, container)
                          └── mvc/context  (IContext, AbstractContext)
                                └── mvc/command (mapping, guards, execution)
                                      └── factory (bindings, pools, config mapping)
```

## Dependency binder

`DependencyContainer` keeps a map of `serviceIdentifier → name → binding`, where a binding holds
either a class (a new instance per resolution) or a value. A value binding wins over a class
binding for the same identifier.

* **Metadata.** A property decorator writes a record (`propertyKey`, `serviceIdentifier`, `named`,
  `optional`, `lazy`) into a symbol-keyed own property of the class constructor. Only own metadata is
  read, otherwise a derived class would push its injections into the list of its base class. The list
  is collected along the constructor chain, from the base class to the concrete one.
* **Injection.** `create()` instantiates the class, then writes the properties, then calls the post
  construct hook. Injection happens after the constructor body, so a field initializer can not
  overwrite an injected value. There is no `reflect-metadata` and no `emitDecoratorMetadata`: every
  identifier is written explicitly in the decorator, and signature metadata is not needed.
* **Unmapped identifiers.** A class identifier is instantiated as is (that is how `getInstance()` of
  an unmapped class works), a string identifier throws with the name of the class and of the property.
* **`optional()`** skips the injection instead of throwing, so an optional dependency stays `undefined`.
* **`lazyInject`** is a getter, not a value: the property is resolved on every access from a global
  lazy registry. The factory fills that registry right before a command execution (`clearLazy()` +
  `mergeIntoLazy()`), therefore a command object, taken from a pool, always sees the values of the
  current execution instead of the values of the execution it was created in.
* **`injectable()`** is a no-op marker, kept so class declarations stay readable; the binder does not
  need it.

## Messages and bubbling

`MessageType<Data>` extends `Enum` and carries the data type in the generic parameter only — it is a
compile time marker, the runtime object is just a named enum value.

Every `dispatchMessage()` creates a **new** `Message` instance:

1. `handleMessage()` runs the listeners of the current target;
2. if `bubbles` is true and nobody called `stopPropagation()`, the message is passed to the parent
   (`_parent`), each step updating `currentTarget` / `previousTarget` and calling `onMessageBubbled()`;
3. `onMessageBubbled()` returning `false` stops the propagation, `AbstractContext` overrides it and
   returns `false` by default, so a message does not leave a context unless the context allows it.

A single instance per dispatch is the reason why a nested `dispatchMessage()` inside a listener can
not rewrite the message of the outer dispatch (before 2.0 a single instance was reused and mutated).

**Listeners** are stored per message type in a `Map<Enum, Listener[]>`, sorted by descending priority.
Removal during a dispatch is deferred: a listener is marked as removed, the iteration over the array
is never broken, and the lists are compacted when the outermost dispatch finishes. That fixed a bug
where removing a listener (or firing an `once` listener) skipped the next listener in the list.

## Contexts and forwarding

A context is a `HierarchyObjectContainer` plus a `CommandMapper`. On every message it receives, it
does two things:

1. maps the message to commands (`tryToExecuteCommand`);
2. forwards the message to models and mediators according to `ContextConfig`.

The role of the originator (model or mediator) is resolved by walking up from `message.initialTarget`
to the direct child of the context, so a model, nested into a plain container, is still recognized as
a model of the context. `dispatchMessageToChildren()` never sends a message back to its
`previousTarget`, which is why the originator does not receive its own message twice.

Containers pass a message to a nested container and to the children of that container; a nested
context is treated as a leaf (it forwards on its own).

## Commands

A command map is `Enum → MappingConfig[]`. A `MappingConfig` holds the command class, optional
mapping data, guards (positive and negative), the target guard, `once` and `stopOnExecute` flags.

Execution of a message:

1. data of the message and data of the mapping are merged (the mapping wins, and a warning is logged,
   when it overwrites a property of the message);
2. the values are put into the lazy registry (`singletonCommands: true`) or into the container
   bindings (`singletonCommands: false`) under their type name and property name;
3. guards are resolved and asked for `allows`;
4. the command is taken from a pool of capacity 1 (singleton commands are created once per context)
   or instantiated, then executed;
5. with `once` the mapping is removed, with `stopOnExecute` the rest of the mappings are skipped.

`dispatchMessage()` stays synchronous: a command without an `await` is fully executed inside the
dispatch, and an asynchronous command (`AbstractAsyncCommand`) is awaited by the mapper, which keeps
the order of the mapped commands. A context tracks the started commands in `pendingCommands`, so
`settle()` can await them and rethrow a failure. Without `settle()` an error is reported through the
logger instead of becoming an unhandled rejection.

## Pools

`PoolModel` holds a list of instances, a capacity and a round-robin index. `get()`:

* creates and stores an instance while the list is shorter than the capacity;
* otherwise walks at most `list.length` items, starting from the current index, and returns the first
  one that is not busy (the busy flag is read by the name, given to `registerPool`);
* if everything is busy — the capacity is increased by one beforehand when the safe pool mode is on,
  and an exception is thrown when it is off.

The bounded walk replaced a recursive call that ended with a stack overflow when all pool items were
busy. `dispose()` clears the list, `unregisterPool()` and `clear()` release the pooled objects.

## Disposal

`AbstractDisposable.dispose()` is not idempotent on purpose: a second call throws, which surfaces
double disposal during development. `MessageDispatcher.dispose()` removes all listeners.
`HierarchyObjectContainer.dispose()` disposes children, including the ones stored by id.

## Logging

`Logger` checks the level first and does nothing when a message is filtered out, so logging costs
almost nothing in production. The name of the object, that wrote the message, is passed as a marker
argument by `AbstractDisposable`; a call site trace is optional (`setTraceCaller(true)`) because it
requires a stack trace per message.

The framework keeps a second, global logger for its own messages (for example, when a class is
registered by name). It is silent until `setGlobalLogLevel()` changes its level.

## Brands instead of duck typing

`isContext()`, `isHierarchyObject()` and `isHierarchyObjectContainer()` check a symbol-keyed flag,
that the framework sets on the prototypes. Before 2.0 the checks were done by method names
(`'isIContext' in object`), which allocated a string on every check in hot paths such as the message
bubbling.

## Known tradeoffs

* Service identifiers of interfaces are strings, so a typo can not be caught by the compiler.
  A typed identifier (`ServiceId<T>`) is the next step for the public API.
* The package is published as CommonJS with an `exports` map; a dual ESM build is not done yet.
* `@lazyInject` resolves on every access, which is what commands need, but it also means that a
  missing binding is reported at the moment of access and not at creation.
* `HierarchyObjectContainer.childrenList` and `childrenMap` are exposed for the framework internals;
  application code should use `children`-style accessors of the specific container instead.
