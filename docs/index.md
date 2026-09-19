# DomWires 5.0 documentation

DomWires separates application state, presentation, actions and composition through typed contracts and messages. It runs in browsers and Node.js without runtime dependencies.

| Start here | What you will learn |
| --- | --- |
| [Getting started](getting-started.md) | Construct a context, send a message, run examples |
| [Architecture](architecture.md) | Roles, live Immutable interfaces, DI scopes and routing |
| [Commands](commands.md) | Input, guards, concurrency, cancellation and trace |
| [Lifetime](lifecycle.md) | Ownership, startup, disposal and asynchronous cleanup |
| [Scene lab walkthrough](examples.md) | Nested contexts, pooled bullets, loading and scene replacement |
| [API reference](api.md) | Generate and navigate the reference extracted from source comments |
| [Contributing](contributing.md) | Source organization, code style and verification |
| [5.0 release guide](release.md) | Verification, distribution and the main/v2.x branches |

Read the counter first if you are new to DomWires. Read the scene lab when you need a module with its own lifetime and asynchronous work.

The concepts originate in the [ActionScript 3](https://github.com/CrazyFlasher/domwires-as3) and [Haxe](https://github.com/CrazyFlasher/domwires-haxe) implementations. 5.0 is a new major API; application compatibility with 2.x is not a design constraint.
