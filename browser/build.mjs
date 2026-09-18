import {build} from "esbuild";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, "..");
const distName = "../dist_client";
const distPath = path.resolve(currentDir, distName);

fs.rmSync(distPath, {recursive: true, force: true});
fs.mkdirSync(distPath);

function copy(from, to)
{
    fs.copyFileSync(path.resolve(currentDir, from), path.resolve(currentDir, distName + to));
}

copy("./test.html", "/test.html");
copy("../dev.json", "/dev.json");

// no polyfills are required: the core has no dependencies on node built-ins
await build({
    absWorkingDir: projectDir,
    entryPoints: [path.resolve(projectDir, "test/index.ts")],
    outfile: distPath + "/test.js",
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    loader: {".ts": "ts"},
    logLevel: "info"
});

console.log("⚡ Done");
