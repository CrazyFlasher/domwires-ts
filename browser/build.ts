import {build} from "esbuild";
import {transformSync} from "esbuild";
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill';
import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill';
import fs from "fs";
import path from "path";


class Build
{
    private readonly distName = "../dist_client";
    private readonly distPath = path.resolve(__dirname, this.distName);

    public constructor()
    {
        fs.rmSync(this.distPath, {recursive: true, force: true});
        fs.mkdirSync(this.distPath);

        this.copy("./test.html", "/test.html");
        this.copy("../dev.json", "/dev.json");

        transformSync("isBrowser", {define: {isBrowser: "true"}});
        build({
                plugins: [NodeModulesPolyfills(), GlobalsPolyfills({process: true, buffer: true})],
                entryPoints: [
                    './test/index.ts',
                ],
                outfile: "./dist_client" + "/test.js",
                bundle: true,
                loader: {".ts": "ts"},
                define: {
                    "global": 'window'
                }
            }
        ).then(() => console.log("⚡ Done")).catch(() => process.exit(1));
    }

    private copy(from: string, to: string): void
    {
        fs.copyFileSync(
            path.resolve(__dirname, from),
            path.resolve(__dirname, this.distName + to)
        );
    }
}

new Build();