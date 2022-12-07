const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const distName = "../dist_client";
const distPath = path.resolve(__dirname, distName);

const copy = (from, to) => {
    fs.copyFileSync(
        path.resolve(__dirname, from),
        path.resolve(__dirname, distName + to)
    );
}

fs.rmSync(distPath, {recursive: true, force: true});
fs.mkdirSync(distPath);

copy("./test.html", "/test.html");
copy("../dev.json", "/dev.json");

esbuild.build({
        entryPoints: [
            './test/index.ts',
        ],
        outfile: "./dist_client" + "/test.js",
        bundle: true,
        loader: {".ts": "ts"},
        define: {
            "global": 'window',
        }
    }
).then(() => console.log("⚡ Done")).catch(() => process.exit(1));