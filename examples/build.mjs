import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {bundleForBrowser} from "../tools/bundle.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, "..");
const frontendDir = path.resolve(currentDir, "frontend");
const distPath = path.resolve(projectDir, "dist_example");

fs.rmSync(distPath, {recursive: true, force: true});
fs.mkdirSync(distPath);

fs.copyFileSync(path.resolve(frontendDir, "index.html"), path.resolve(distPath, "index.html"));

// the example imports the package by its public name, exactly as it is written in the README
await bundleForBrowser({
    projectDir: projectDir,
    entryPoints: [path.resolve(frontendDir, "main.ts")],
    outfile: path.resolve(distPath, "main.js"),
    alias: {
        domwires: path.resolve(projectDir, "src/index.ts")
    }
});

fs.copyFileSync(path.resolve(currentDir, "game/index.html"), path.resolve(distPath, "game.html"));
await bundleForBrowser({
    projectDir,
    entryPoints: [path.resolve(currentDir, "game/main.ts")],
    outfile: path.resolve(distPath, "game.js")
});

console.log("⚡ Counter and game examples built");
