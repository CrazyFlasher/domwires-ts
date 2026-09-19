# API reference

The public API is documented beside its source contracts with TSDoc-compatible comments. The generated reference includes method signatures, inherited contracts, configuration types and lifecycle semantics.

From the repository root:

```sh
npm ci
npm ci --prefix tools/docs
npm run docs:build
```

Open `docs/api/index.html`. This is a local build artifact, not a published documentation URL. The normal source package carries the comments in its generated declarations for editor tooltips.

## Entry points

| Area | Start with |
| --- | --- |
| Composition | IContext, AbstractContext, ContextConfigBuilder |
| Commands | ICommandMapper, CommandMapper, ICommand, CommandExecution |
| Registration | MappingConfig, MappingConfigList, CommandMappingOptions |
| Observation | IMessage, IMessageDispatcher, MessageType |
| Dependencies | IFactory, Factory, IDependencyContainer, ServiceToken |
| Lifetime | IDisposable, ResourceScope |
| Infrastructure | ILogger, Logger, ImplementationRegistry |
| Node-only | createNodeConfigLoader from domwires/node |

Interfaces define behavior; default implementations and interface pairs remain together in the ordinary interface's source file. Abstract extension bases have their own files. Private implementation details are excluded from the reference.

## Documentation toolchain

The framework builds and typechecks with TypeScript 7. TypeDoc 0.28.20 currently declares TypeScript support through 6.0, so the documentation generator has an isolated, locked installation in `tools/docs` using TypeScript 6.0.2. It analyzes the same source; it does not replace the framework compiler or enter the published runtime dependency graph.

`npm run docs:check` verifies local documentation links, the checked quick-start snippet, generated public interface-member comments and selected inherited implementation docs. CI builds the reference and uploads it as an artifact. See [TypeDoc](https://typedoc.org/) and [TSDoc](https://tsdoc.org/) for tool/markup documentation.

## Extension points

- Override `AbstractContext.init()` for synchronous composition and call `super.init()` first. Use owned resources for async startup.
- Override `AbstractHierarchyObject.addedToHierarchy()` / `removedFromHierarchy()` to observe the updated parent reference.
- Container `childAdded()` / `childRemoved()` run after collection changes but before the child parent reference changes. Context overrides must call the superclass hook to preserve role bindings and routes.
- Native async commands implement `execute(input, execution)`. The callback bridge `AbstractAsyncCommand` exposes `resolve` / `reject` for its active invocation.
- Forwarding hooks on `AbstractContext` are synchronous; call the superclass implementation when extending the default forwarding policy.

Injection metadata, runtime branding symbols, delivery-frame helpers and mapping schedulers are internal. They are excluded from the root API or public declarations. Obtain mapping handles through `map()`; no deep imports are supported.
