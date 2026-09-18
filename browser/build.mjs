import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {bundleForBrowser} from "../tools/bundle.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, "..");
const distPath = path.resolve(projectDir, "dist_client");

fs.rmSync(distPath, {recursive: true, force: true});
fs.mkdirSync(distPath);

fs.copyFileSync(path.resolve(currentDir, "test.html"), path.resolve(distPath, "test.html"));
fs.copyFileSync(path.resolve(projectDir, "dev.json"), path.resolve(distPath, "dev.json"));

// no polyfills are required: the core has no dependencies on node built-ins
await bundleForBrowser({
    projectDir: projectDir,
    entryPoints: [path.resolve(projectDir, "test/index.ts")],
    outfile: path.resolve(distPath, "test.js")
});

console.log("⚡ Done");
