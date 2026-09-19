# DomWires 5.0 release checklist

[Documentation](index.md)

This checkout is release candidate `5.0.0-rc.1`. Publication uses npm tag `next`; `latest` stays on 2.x until stable validation is complete.

## Branch transition

The previous `main` and published tag `v2.1.0` resolve to `08c80f955e63d652f0ab568ef0a38be760d8fd3f`. Preserve that exact commit as `v2.x` before advancing `main`. Push the candidate branch, require a green remote CI matrix, then fast-forward `main`. Never rewrite the old history.

## Distribution

- Node 20+; remote CI covers Node 20, 22 and 24.
- Node `import` selects a native ESM facade; `require` selects the same CommonJS implementation. Both share runtime and declaration identity.
- Browser bundlers select a shared native ESM implementation for import and require, targeting ES2022. Automated browser support is currently checked in Chromium; Firefox/WebKit are not yet part of the verified matrix.
- Consumer declarations are checked with TypeScript 6 and 7, including both module modes and negative API tests.
- `npm pack` and `npm publish` rebuild via `prepack`. The explicit file list includes sources, declarations, maps, Markdown guides and SVG artwork, and excludes generated API HTML, tests and development tooling.
- Internal root exports are removed. Mapping construction/scheduling internals are stripped from declarations; supported protected extension points are documented in [API reference](api.md#extension-points).

## Release gates

- [x] Typed commands/messages, scoped dependencies and explicit model read/write contracts.
- [x] Async cancellation, mapping concurrency, ownership and trace hooks.
- [x] Counter, scoped request and game examples.
- [x] Agreed interface/default-implementation file organization.
- [x] Public API and protected extension-point review.
- [x] Source API comments, checked README snippet and generated-reference tooling.
- [x] ESM/CJS consumer and mixed-identity checks against the packed artifact.
- [x] RC version, lockfile, MIT license and changelog.
- [x] Complete final local checks and record results.
- [x] Preserve the previous main as v2.x.
- [x] Push the candidate branch.
- [ ] Require green remote CI, then fast-forward main.
- [ ] Publish the RC to next and verify an installation from npm.
- [ ] Publish stable 5.0.0 to latest after RC validation.

## Verification and publication

```sh
npm ci
npm ci --prefix tools/docs
npm run typecheck
npm test
npm run lint
npm run test:consumer
npm run docs:assets
npm run docs:build
npm run docs:check
npm run example:build
npm run example:smoke
npm run browser:install
npm run test:browser
npm run test:stress
npm publish --tag next
```

After publication, run the packed-consumer checks against the registry (PowerShell):

```powershell
$env:DOMWIRES_PACKAGE = "domwires@5.0.0-rc.1"
npm run test:consumer
Remove-Item Env:DOMWIRES_PACKAGE
```

For stable publication, update the manifest/lockfile to `5.0.0`, finalize the changelog and release notice, repeat package/CI validation, publish with `--tag latest`, and tag the actual published commit. Confirm registry version and integrity before recording a release as published. Do not assume publication succeeded after a network error.

Historical implementation reports: [stage one](v2-implementation.md), [stage two](v2-polish.md). Their original working name was v2; they describe development leading to 5.0, not a released 5.0 package.

## Local RC verification (2026-09-19)

Node 24.18: 192 runtime tests, 3 Chromium scenarios, typecheck/lint, packed consumers with TypeScript 6.0.2 and 7.0.2, example smoke and documentation checks pass. The API check covers 264 interface members and the documented extension hooks. The browser lifecycle scenario performs 100 scene changes and 100 restarts. The Node stress check completes 2,800 cycles with zero live bullets, adapters, requests or clocks; sampled heap growth after warmup is 462,928 bytes, below its limit. These measurements describe this local run, not a cross-platform performance guarantee.

The first remote matrix passed on candidate `bf04667` ([run](https://github.com/CrazyFlasher/domwires-ts/actions/runs/35458569587)). An additional mixed browser import/require regression was then added; the final candidate must pass the matrix again before main is advanced.
