import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = path.join(root, ".consumer-check");
fs.mkdirSync(temporaryRoot, {recursive: true});
const temporary = fs.mkdtempSync(path.join(temporaryRoot, "domwires-consumer-"));
const npm = process.env.npm_execpath;
const tsc = process.env.DOMWIRES_TSC ? path.resolve(root, process.env.DOMWIRES_TSC) : path.join(root, "node_modules/typescript/bin/tsc");
if (!npm) throw new Error("Run this check through npm run test:consumer");
const run = (args, cwd = temporary) => {
    const result = spawnSync(process.execPath, args, {
        cwd, encoding: "utf8", env: {...process.env, npm_config_cache: path.join(temporary, "cache")}
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
    return result.stdout;
};
try
{
    const published = process.env.DOMWIRES_PACKAGE;
    const packed = published ? undefined : JSON.parse(run([npm, "pack", "--json", "--pack-destination", temporary], root))[0];
    if (packed)
    {
        const paths = packed.files.map(file => file.path);
        assert.ok(paths.includes("LICENSE") && paths.includes("CHANGELOG.md"));
        assert.ok(paths.includes("dist/index.mjs") && paths.includes("dist/browser.mjs"));
        assert.ok(!paths.some(file => /^(?:docs\/api\/|test\/|tools\/|analysis\/|\.consumer-check\/)/.test(file)));
        console.log(`Tarball: ${paths.length} files, ${packed.size} bytes compressed, ${packed.unpackedSize} bytes unpacked.`);
    }
    fs.writeFileSync(path.join(temporary, "package.json"), JSON.stringify({name: "consumer", version: "1.0.0", private: true}));
    run([npm, "install", ...(published ? [] : ["--offline"]), "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false",
        published ?? path.join(temporary, packed.filename)]);

    const body = `
        const f = new dw.Factory(), token = new dw.ServiceToken("count");
        f.mapToValue(token, 7);
        if (f.getInstance(token) !== 7) throw new Error("Token resolution failed");
        if (typeof node.createNodeConfigLoader !== "function") throw new Error("Node subpath failed");
    `;
    fs.writeFileSync(path.join(temporary, "consumer.cjs"), 'const dw = require("domwires"); const node = require("domwires/node");' + body);
    fs.writeFileSync(path.join(temporary, "consumer.mjs"), 'import * as dw from "domwires"; import * as node from "domwires/node";' + body);
    run([path.join(temporary, "consumer.cjs")]);
    run([path.join(temporary, "consumer.mjs")]);

    fs.writeFileSync(path.join(temporary, "mixed.mjs"), `
        import * as esm from "domwires";
        import * as esmNode from "domwires/node";
        import {createRequire} from "node:module";
        import assert from "node:assert/strict";
        const require = createRequire(import.meta.url), cjs = require("domwires");
        assert.ok(import.meta.resolve("domwires").endsWith("/index.mjs"));
        assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());
        for (const key of Object.keys(cjs)) assert.equal(esm[key], cjs[key], key);
        assert.equal(esmNode.createNodeConfigLoader, require("domwires/node").createNodeConfigLoader);
        const token = new esm.ServiceToken("mixed"), factory = new cjs.Factory();
        class Service {}
        esm.setDefaultImplementation(token, Service);
        assert.ok(factory.getInstance(token) instanceof Service);
        class Context extends esm.AbstractContext {}
        const context = factory.getInstance(Context);
        assert.ok(cjs.isContext(context));
        await context.close();
        factory.dispose();
        for (const name of ["getPropertyInjections", "getPostConstructMethodName", "SERVICE_IDENTIFIER",
            "IS_CONTEXT", "IS_HIERARCHY_OBJECT", "IS_HIERARCHY_OBJECT_CONTAINER", "messageAtTarget"])
            assert.ok(!(name in esm), name);
    `);
    run([path.join(temporary, "mixed.mjs")]);

    fs.writeFileSync(path.join(temporary, "types.ts"), `
        import {Factory, MessageType, MessageDispatcher, ServiceToken, MappingConfig, AbstractContext, AbstractCommand} from "domwires";
        import {createNodeConfigLoader} from "domwires/node";
        // @ts-expect-error Injection metadata is internal.
        import {getPropertyInjections} from "domwires";
        // @ts-expect-error Runtime brands are internal.
        import {IS_CONTEXT} from "domwires";
        // @ts-expect-error Delivery frame construction is internal.
        import {messageAtTarget} from "domwires";
        const token = new ServiceToken<number>("number");
        const f = new Factory();
        f.mapToValue(token, 7);
        const n: number = f.getInstance(token);
        // @ts-expect-error The installed declarations must preserve the typed token.
        f.mapToValue(token, "wrong");
        const message = new MessageType<{id: number}>("typed");
        // @ts-expect-error The installed declarations must require the payload.
        new MessageDispatcher().dispatchMessage(message);
        class Context extends AbstractContext {}
        class Command extends AbstractCommand<void> {}
        const context = f.getInstance(Context);
        const mapping = context.map(new MessageType<void>("run"), Command);
        // @ts-expect-error Scheduler is not an application extension point.
        mapping.scheduler;
        // @ts-expect-error Once consumption belongs to the mapper.
        mapping.consume();
        // @ts-expect-error Registrations are constructed by map().
        new MappingConfig();
        // @ts-expect-error Internal constructor factory is not exported in declarations.
        MappingConfig.create;
        void n; void createNodeConfigLoader;
    `);
    for (const extension of ["cts", "mts"])
    {
        fs.copyFileSync(path.join(temporary, "types.ts"), path.join(temporary, `types.${extension}`));
        run([tsc, "--ignoreConfig", "--noEmit", "--strict", "--target", "es2022",
            "--module", "nodenext", `types.${extension}`]);
    }
    fs.writeFileSync(path.join(temporary, "mixed-types.mts"), `
        import {Factory, ServiceToken} from "domwires";
        import cjs = require("domwires");
        const factory: Factory = new cjs.Factory();
        const token: ServiceToken<number> = new cjs.ServiceToken<number>("shared type identity");
        factory.mapToValue(token, 42);
    `);
    run([tsc, "--ignoreConfig", "--noEmit", "--strict", "--target", "es2022",
        "--module", "nodenext", "mixed-types.mts"]);
    fs.writeFileSync(path.join(temporary, "browser.js"), `
        import {Factory, AbstractContext, AbstractCommand, MessageType} from "domwires";
        class Context extends AbstractContext {}
        const event = new MessageType("run"), context = new Factory().getInstance(Context);
        let count = 0;
        class Command extends AbstractCommand { execute() { count++; } }
        context.map(event, Command);
        context.dispatchMessage(event);
        globalThis.consumerResult = count;
        context.dispose();
    `);
    const bundle = await build({
        entryPoints: [path.join(temporary, "browser.js")], bundle: true, platform: "browser",
        format: "iife", minify: true, write: false, metafile: true, tsconfigRaw: {}
    });
    assert.ok(!Object.keys(bundle.metafile.inputs).some(input => /NodeConfigLoader|node:/.test(input)));
    assert.ok(Object.keys(bundle.metafile.inputs).some(input => input.endsWith("dist/browser.mjs")));
    const sandbox = {AbortController};
    vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
    assert.equal(sandbox.consumerResult, 1);
    console.log("Packed CJS, native ESM, shared runtime/type identities, public declarations and minified browser consumers pass.");
}
finally
{
    // Only the directory created above is removed; never a user-supplied path.
    if (path.dirname(temporary) === temporaryRoot && path.basename(temporary).startsWith("domwires-consumer-"))
        fs.rmSync(temporary, {recursive: true, force: true});
}
