import fs from "fs";
import path from "path";
import vm from "vm";
import {fileURLToPath} from "url";

/**
 * Boots the built example with a minimal DOM, so a broken bundle (a missing binding, a dropped
 * registration, an import of a node built-in) fails the build instead of the browser.
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(currentDir, "../dist_example/main.js");

function createElement()
{
    return {
        textContent: "",
        disabled: false,
        append: () => undefined,
        addEventListener: () => undefined
    };
}

const silentConsole = {
    log: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined
};

const context = {
    document: {
        createElement: createElement,
        querySelector: () => null,
        body: createElement()
    },
    console: silentConsole,
    setTimeout: setTimeout
};

try
{
    vm.runInNewContext(fs.readFileSync(bundlePath, "utf-8"), context, {filename: bundlePath});
}
catch (e)
{
    console.error("The example failed to boot:", e.message);

    process.exit(1);
}

console.log("⚡ The example boots");
