import {build} from "esbuild";

/**
 * Bundles an entry point for the browser with the settings, that every development bundle of the
 * repository shares: examples/frontend and the browser tests are built exactly the same way.
 */
export async function bundleForBrowser({projectDir, entryPoints, outfile, alias})
{
    const options = {
        absWorkingDir: projectDir,
        entryPoints: entryPoints,
        outfile: outfile,
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2022",
        // development builds: the browser debugger shows the original TypeScript sources
        sourcemap: true,
        sourcesContent: true,
        loader: {".ts": "ts"},
        logLevel: "info"
    };

    if (alias)
    {
        options.alias = alias;
    }

    await build(options);
}
