# Contributing

[Documentation](index.md)

## Source organization

A framework component keeps its ordinary interface, Immutable interface, default implementation and associated message type in **the ordinary interface's file**. For example, `ICommandMapper.ts` contains both contracts and `CommandMapper`. Abstract extension bases and standalone helpers may have separate files. `MappingConfig` and `MappingConfigList` deliberately stay together.

Extract a separate component as a whole: `IMessage.ts` contains both `IMessage` and `Message`. `PoolModel` is an internal factory helper, not an additional public framework component. Examples place application classes in separate files for navigation.

Use four-space indentation, double quotes, semicolons, no spaces inside named-import braces and Allman braces for classes, methods and blocks, matching the established framework style. Keep public behavioral contracts in interface comments. Explain ownership, defaults, cancellation and failure behavior; avoid comments that merely repeat a TypeScript type.

## Local checks

```sh
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run example:build
npm run example:smoke
npm run test:consumer
npm run test:stress
npm run browser:install
npm run test:browser
npm ci --prefix tools/docs
npm run docs:build
npm run docs:check
```

The consumer check runs `npm pack` including the `prepack` build, installs that tarball into a fixture, and checks CJS, native ESM entry points, shared runtime/type identity, public declarations and a minified browser ESM bundle. Generated API HTML is excluded from the package. Set `DOMWIRES_PACKAGE=domwires@5.0.0-rc.1` to repeat these consumer checks against an actual npm release. Set `DOMWIRES_TSC` to an alternate compiler entry point to check its declarations with another supported TypeScript version.

Browser tests exercise Chromium. The workflow also defines Node 20/22/24 jobs; local success does not establish that remote CI has run. Stress tests cover repeated game lifecycles and resource counts. `npm run benchmark` measures specific hot paths; retain environment and samples when comparing results.

## Documentation and assets

Edit comments in source, then regenerate the API reference. Edit the quick-start source in `docs/snippets/quick-start.ts` and update the matching README block; the checker rejects drift. Documentation snippets compile with the framework's TypeScript 7 configuration.

Logo and diagrams are repository-native SVG. Their editable generator is `tools/docs-assets.mjs`; run `npm run docs:assets` after changing it. [Brand notes](brand.md) record the preceding DW-logo comparison and the design decision. Inspect light/dark assets at README width after regenerating.
