import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {build} from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const require = createRequire(import.meta.url);
rmSync(dist, {recursive: true, force: true});
mkdirSync(dist, {recursive: true});
const compiled = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),
    "-p", path.join(root, "tsconfig.json"), "--stripInternal"], {cwd: root, stdio: "inherit"});
if (compiled.status !== 0) process.exit(compiled.status ?? 1);

// Native Node ESM entry points share CJS classes, tokens and registration state.
// Independently compiling both implementations would split their runtime identity.
for (const entry of ["index", "node"])
{
    const names = Object.keys(require(path.join(dist, `${entry}.js`))).sort();
    writeFileSync(path.join(dist, `${entry}.mjs`),
        `import implementation from "./${entry}.js";\nexport const {${names.join(", ")}} = implementation;\n`);
    writeFileSync(path.join(dist, `${entry}.d.mts`), `export * from "./${entry}.js";\n`);
}

// Browser bundlers get a native ESM implementation, with no Node dependencies.
await build({
    absWorkingDir: root,
    entryPoints: ["src/index.ts"],
    outfile: "dist/browser.mjs",
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2022",
    sourcemap: true,
    keepNames: true,
    tsconfig: "tsconfig.json"
});
