import assert from "node:assert/strict";
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {build} from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = file => readFileSync(path.resolve(root, file), "utf8").replace(/\r\n/g, "\n");
const issues = [];
const pages = ["README.md"];
function collect(directory)
{
    for (const entry of readdirSync(path.join(root, directory), {withFileTypes: true}))
    {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory() && entry.name !== "api") collect(file);
        else if (entry.isFile() && entry.name.endsWith(".md")) pages.push(file);
    }
}
collect("docs");
for (const file of pages)
{
    const markdown = read(file).replace(/```[\s\S]*?```/g, "");
    const links = [...markdown.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g),
        ...markdown.matchAll(/(?:src|srcset)="([^"]+)"/g)];
    for (const [, raw] of links)
    {
        if (/^(?:[a-z]+:|#)/i.test(raw)) continue;
        const target = path.resolve(root, path.dirname(file), decodeURIComponent(raw.split("#")[0]));
        if (!existsSync(target)) issues.push(`${file}: missing local link ${raw}`);
    }
}
const snippet = read("docs/snippets/quick-start.ts").trim();
const shown = read("README.md").match(/<!-- snippet: docs\/snippets\/quick-start\.ts -->\s*```ts\n([\s\S]*?)\n```/);
assert.equal(shown?.[1].trim(), snippet, "README quick-start must match its checked source");

const apiPath = path.join(root, ".consumer-check/api.json");
assert.ok(existsSync(apiPath), "Run npm run docs:build before docs:check");
const api = JSON.parse(readFileSync(apiPath, "utf8"));
const apiModule = api.children.find(item => item.name === "index");
function documented(item)
{
    if (item.comment?.summary?.length || item.comment?.blockTags?.length) return true;
    if (item.signatures?.length) return item.signatures.every(documented);
    return Boolean(item.getSignature && documented(item.getSignature));
}
let memberCount = 0;
for (const item of apiModule.children.filter(item => item.kind === 256))
{
    for (const member of item.children ?? [])
    {
        memberCount++;
        if (!documented(member)) issues.push(`Undocumented public interface member: ${item.name}.${member.name}`);
    }
}
for (const [type, names] of Object.entries({
    AbstractContext: ["own", "close", "settle", "map", "execute", "init", "childAdded", "childRemoved"],
    AbstractHierarchyObject: ["addedToHierarchy", "removedFromHierarchy"],
    AbstractAsyncCommand: ["resolve", "reject"],
    Factory: ["getInstance", "createScope", "mapToProvider"],
    CommandMapper: ["map", "execute", "settle"],
    MessageDispatcher: ["subscribe", "dispatchMessage"],
    Message: ["data", "currentTarget", "stopPropagation"]
}))
{
    const item = apiModule.children.find(item => item.name === type);
    for (const name of names)
    {
        const member = item?.children?.find(member => member.name === name);
        if (!member || !documented(member)) issues.push(`Missing inherited implementation documentation: ${type}.${name}`);
    }
}
assert.deepEqual(issues, [], "Documentation links and public interface coverage");

const scratch = path.join(root, ".consumer-check/docs");
mkdirSync(scratch, {recursive: true});
writeFileSync(path.join(scratch, "tsconfig.json"), JSON.stringify({
    extends: path.join(root, "tsconfig.json"),
    compilerOptions: {noEmit: true, rootDir: root, paths: {domwires: [path.join(root, "src/index.ts")]}},
    files: [path.join(root, "docs/snippets/quick-start.ts")],
    include: []
}, null, 2));
const check = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-p", path.join(scratch, "tsconfig.json")], {cwd: root, encoding: "utf8"});
assert.equal(check.status, 0, check.stdout + check.stderr);
const bundle = await build({
    entryPoints: [path.join(root, "docs/snippets/quick-start.ts")], bundle: true, platform: "node", format: "cjs",
    write: false, alias: {domwires: path.join(root, "src/index.ts")}, tsconfig: path.join(root, "tsconfig.json")
});
const run = spawnSync(process.execPath, ["--input-type=commonjs", "-"], {cwd: root, encoding: "utf8", input: bundle.outputFiles[0].text});
assert.equal(run.status, 0, run.stderr);
assert.equal(run.stdout.trim(), "Hello, DomWires!");
console.log(`Documentation: ${pages.length} pages, ${memberCount} interface members, implementation inheritance and compiled/running README snippet passed.`);
