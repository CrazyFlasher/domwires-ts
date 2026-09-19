import {defineConfig} from "@playwright/test";
import {fileURLToPath} from "node:url";
export default defineConfig({
    testDir: "./e2e",
    outputDir: "../test-results",
    timeout: 90000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [["list"], ["html", {outputFolder: fileURLToPath(new URL("../playwright-report", import.meta.url)), open: "never"}]],
    use: {baseURL: "http://127.0.0.1:1236", headless: true, trace: "retain-on-failure", screenshot: "only-on-failure"},
    projects: [{name: "chromium", use: {browserName: "chromium"}}],
    webServer: {
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        command: "node node_modules/http-server/bin/http-server dist_example -a 127.0.0.1 -p 1236 -c-1 --silent",
        url: "http://127.0.0.1:1236",
        reuseExistingServer: false
    }
});
