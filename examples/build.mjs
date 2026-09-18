import {build} from "esbuild";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, "..");
const frontendDir = path.resolve(currentDir, "frontend");
const distPath = path.resolve(projectDir, "dist_example");

fs.rmSync(distPath, {recursive: true, force: true});
fs.mkdirSync(distPath);

fs.copyFileSync(path.resolve(frontendDir, "index.html"), path.resolve(distPath, "index.html"));

// the example imports the package by its public name, exactly as it is written in the README
await build({
    absWorkingDir: projectDir,
    entryPoints: [path.resolve(frontendDir, "main.ts")],
    outfile: path.resolve(distPath, "main.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    loader: {".ts": "ts"},
    alias: {
        domwires: path.resolve(projectDir, "src/index.ts")
    },
    logLevel: "info"
});

console.log("⚡ Example built");
