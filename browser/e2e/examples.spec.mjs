import {test, expect} from "@playwright/test";
import {writeFile} from "node:fs/promises";

test.beforeEach(async ({page}) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(() => {
        window.addEventListener("unhandledrejection", event => console.error(String(event.reason)));
    });
    // Collected on the fixture so every test checks runtime failures at teardown.
    page.runtimeErrors = errors;
});
test.afterEach(async ({page}) => { expect(page.runtimeErrors).toEqual([]); });

test("counter survives repeated mount and disposal", async ({page}) => {
    await page.goto("/index.html");
    for (let i = 0; i < 25; i++) {
        await expect(page.locator("#app strong")).toHaveText("0");
        await page.getByRole("button", {name: "+1", exact: true}).click();
        await expect(page.locator("#app strong")).toHaveText("1");
        await page.getByRole("button", {name: "Remount", exact: true}).click();
    }
    await expect(page.locator("#app button")).toHaveCount(2);
    await expect(page.locator("#app strong")).toHaveText("0");
});

test("scene lab: pool, tick, latest load, boundary routing and trace", async ({page}) => {
    await page.goto("/game.html");
    await page.getByRole("button", {name: "Pause / resume", exact: true}).click();
    await expect(page.getByRole("status")).toHaveText("Paused");
    await page.getByRole("button", {name: "Fire", exact: true}).click();
    await expect(page.locator(".scene-status")).toContainText("Shots: 1 · Active: 1/12");
    for (let i = 0; i < 11; i++) await page.getByRole("button", {name: "Step", exact: true}).click();
    await expect(page.locator(".scene-status")).toContainText("Active: 0/12");
    await page.getByRole("button", {name: "Trace on / off", exact: true}).click();
    await page.getByText("Command trace", {exact: true}).click();
    await page.getByRole("button", {name: "Load slow", exact: true}).click();
    await page.getByRole("button", {name: "Load fast", exact: true}).click();
    await expect(page.locator(".scene-status")).toContainText("Fast orbit");
    await expect(page.locator(".hud-status")).toContainText("Completed loads: 1");
    await expect(page.locator("#trace")).toContainText("cancelled");
    await page.getByRole("button", {name: "Load slow", exact: true}).click();
    await page.getByRole("button", {name: "Switch scene", exact: true}).click();
    await expect(page.locator(".scene-status")).toContainText("Scene B · No level loaded · Shots: 0");
    await expect(page.locator(".hud-status")).toContainText("Completed loads: 1");
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.screenshot({path: "test-results/scene-lab.png", fullPage: true});
});

test("100 scene changes and 100 restarts do not accumulate DOM nodes or listeners", async ({page}, testInfo) => {
    await page.goto("/game.html");
    await expect(page.getByRole("status")).toHaveText("Running");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    async function metrics() {
        await cdp.send("HeapProfiler.collectGarbage");
        const {metrics} = await cdp.send("Performance.getMetrics");
        return Object.fromEntries(metrics.filter(metric =>
            ["JSHeapUsedSize", "Nodes", "Documents", "JSEventListeners"].includes(metric.name)).map(metric => [metric.name, metric.value]));
    }
    const restart = page.getByRole("button", {name: "Restart demo", exact: true});
    for (let i = 0; i < 5; i++) { await restart.click(); await expect(restart).toBeEnabled(); }
    const before = await metrics();
    for (let i = 0; i < 100; i++) {
        await page.getByRole("button", {name: "Load slow", exact: true}).click();
        await page.getByRole("button", {name: "Switch scene", exact: true}).click();
        await expect(page.locator(".scene-status")).toContainText("Scene " + (i % 2 ? "A" : "B") + " · No level loaded");
    }
    for (let i = 0; i < 100; i++) {
        await page.getByRole("button", {name: "Fire", exact: true}).click();
        await restart.click(); await expect(restart).toBeEnabled();
        await expect(page.locator(".scene-status")).toContainText("Scene A · No level loaded · Shots: 0");
    }
    const after = await metrics();
    const metricsPath = testInfo.outputPath("lifecycle-metrics.json");
    await writeFile(metricsPath, JSON.stringify({before, after}, null, 2));
    await testInfo.attach("browser-lifecycle-metrics", {path: metricsPath, contentType: "application/json"});
    expect(after.Nodes).toBeLessThanOrEqual(before.Nodes + 20);
    expect(after.JSEventListeners).toBeLessThanOrEqual(before.JSEventListeners + 10);
    expect(after.Documents).toBeLessThanOrEqual(before.Documents + 1);
    expect(after.JSHeapUsedSize - before.JSHeapUsedSize).toBeLessThan(2 * 1024 * 1024);
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.locator(".hud-status")).toHaveCount(1);
    await expect(page.locator("#controls button")).toHaveCount(7);
});
