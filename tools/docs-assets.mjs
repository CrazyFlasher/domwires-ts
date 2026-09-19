import {mkdirSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const output = fileURLToPath(new URL("../docs/assets/", import.meta.url));
mkdirSync(output, {recursive: true});
const themes = {
    light: {bg: "#f7fafb", panel: "#ffffff", ink: "#182635", muted: "#526475", line: "#cfdae2", teal: "#087e80", violet: "#6550bc", soft: "#edf5f5"},
    dark: {bg: "#101a24", panel: "#192735", ink: "#edf5fa", muted: "#b0c1d0", line: "#405565", teal: "#65d6c4", violet: "#b6a4ff", soft: "#182f36"}
};
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const text = (x, y, value, size = 18, color = "#182635", weight = 400, extra = "") =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${escape(value)}</text>`;
const rect = (x, y, w, h, fill, stroke, radius = 14) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
function svg(width, height, title, description, body)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escape(title)}</title><desc id="desc">${escape(description)}</desc>
<g font-family="Segoe UI, Arial, sans-serif">${body}</g></svg>\n`;
}
function mark(primary, accent)
{
    return `<g fill="none" stroke-linejoin="round" stroke-linecap="round">
<path d="M24 24 H65 L96 55 V97 H24 V65" stroke="${primary}" stroke-width="10"/>
<path d="M24 43 H50 V73 H75" stroke="${accent}" stroke-width="10"/>
<rect x="16" y="35" width="16" height="16" rx="3" fill="${accent}" stroke="none"/>
<rect x="67" y="65" width="16" height="16" rx="3" fill="${accent}" stroke="none"/>
</g>`;
}
function arrows(c)
{
    return `<defs>${[c.teal, c.violet, c.muted].map((color, i) => `<marker id="a${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="${color}"/></marker>`).join("")}</defs>`;
}
function path(d, c, kind = 0, dashed = false)
{
    return `<path d="${d}" fill="none" stroke="${[c.teal, c.violet, c.muted][kind]}" stroke-width="2.5" ${dashed ? 'stroke-dasharray="7 6"' : ""} marker-end="url(#a${kind})"/>`;
}
function box(c, x, y, w, title, detail, color = c.ink)
{
    return rect(x, y, w, 82, c.panel, c.line) + text(x + 18, y + 32, title, 21, color, 600) + text(x + 18, y + 59, detail, 16, c.muted);
}
for (const [name, c] of Object.entries(themes))
{
    const wordmark = `<g transform="translate(16 15)">${mark(c.ink, c.teal)}</g>` +
        text(160, 101, "DomWires", 74, c.ink, 650, 'letter-spacing="-3"');
    writeFileSync(output + `domwires-${name}.svg`, svg(590, 150, "DomWires", "Component boundary and connected ports beside the DomWires wordmark.", wordmark));
    const title = text(40, 48, "ONE MESSAGE. A COMPLETE ROUND TRIP.", 14, c.teal, 700, 'letter-spacing="2"') +
        text(40, 87, "Fire, update, render", 32, c.ink, 650);
    let flow = rect(0.5, 0.5, 1199, 719, c.bg, c.line, 20) + arrows(c) + title;
    flow += rect(24, 113, 1152, 550, c.panel, c.line, 18) + text(45, 140, "GameContext", 16, c.muted, 600);
    flow += rect(277, 279, 874, 362, c.soft, c.line, 16) + text(298, 308, "SceneContext", 17, c.teal, 650);
    flow += box(c, 48, 167, 182, "Fire button", "Browser input") + box(c, 322, 167, 248, "GameContext", "dispatchMessage(FIRE)");
    flow += box(c, 322, 351, 210, "Message mapping", "map(FIRE, Fire)");
    flow += box(c, 622, 351, 184, "Fire", "Command", c.violet);
    flow += box(c, 896, 351, 228, "SceneModel", "Owns scene state");
    flow += box(c, 322, 518, 240, "SceneView", "Mediator · render()");
    flow += path("M230 208 H310", c) + text(246, 191, "FIRE", 14, c.teal, 650);
    flow += path("M427 249 V339", c) + text(443, 270, "receive predicate", 14, c.teal);
    flow += path("M532 392 H610", c, 1) + text(551, 375, "run", 14, c.violet);
    flow += path("M806 392 H884", c, 1) + text(823, 375, "fire()", 14, c.violet);
    flow += path("M1006 433 V485 H442 V506", c);
    flow += text(687, 469, "STATE_CHANGED · context forwards", 15, c.teal, 600);
    flow += path("M562 559 H1089 V445", c, 2, true);
    flow += text(645, 546, "reads SceneModelImmutable", 16, c.muted);
    flow += text(322, 624, "One live model. Commands can change it; the view receives its read contract.", 16, c.muted);
    flow += text(40, 699, "Solid: messages / execution  ·  Dashed: read access  ·  Based on examples/game", 16, c.muted);
    writeFileSync(output + `message-flow-${name}.svg`, svg(1200, 720, "DomWires Fire message flow", "A Fire button dispatches FIRE through GameContext into SceneContext. Fire changes SceneModel. STATE_CHANGED is forwarded through SceneContext to SceneView, which reads the live Immutable model.", flow));

    let contexts = rect(0.5, 0.5, 1199, 789, c.bg, c.line, 20) + arrows(c);
    contexts += text(40, 49, "SCENE LAB / CONTEXT BOUNDARIES", 14, c.teal, 700, 'letter-spacing="2"') + text(40, 89, "Share messages. Own lifetimes.", 32, c.ink, 650);
    contexts += rect(24, 115, 1152, 640, c.panel, c.line, 18) + text(45, 148, "GameContext", 22, c.ink, 650);
    contexts += text(45, 177, "Owns the tick clock and the serial SwitchScene command", 17, c.muted);
    contexts += rect(48, 239, 660, 411, c.soft, c.line) + text(68, 272, "SceneContext", 23, c.teal, 650);
    contexts += rect(815, 239, 335, 411, c.soft, c.line) + text(835, 272, "HudContext", 23, c.teal, 650);
    contexts += path("M263 185 V226", c) + text(282, 215, "TICK · FIRE · LOAD", 16, c.teal, 600);
    contexts += box(c, 73, 311, 272, "Tick · Fire · Load", "Load uses latest", c.violet);
    contexts += box(c, 405, 311, 276, "TimerLevelLoader", "Owned adapter");
    contexts += path("M345 353 H393", c, 1) + text(350, 335, "Load", 13, c.violet);
    contexts += box(c, 73, 441, 272, "SceneModel", "Pool of reusable bullets");
    contexts += path("M209 393 V429", c, 1) + text(225, 420, "updates state", 15, c.violet);
    contexts += box(c, 405, 545, 276, "SceneView", "Immutable scene state");
    contexts += path("M209 523 V586 H393", c) + text(76, 572, "STATE_CHANGED", 14, c.teal);
    contexts += box(c, 840, 311, 286, "UpdateHud", "Command", c.violet);
    contexts += box(c, 840, 441, 286, "HudModel", "Loaded level / scene");
    contexts += box(c, 840, 545, 286, "HudView", "Immutable HUD state");
    contexts += path("M983 393 V429", c, 1) + path("M983 523 V533", c);
    contexts += path("M345 482 H755 V211 H983 V299", c);
    contexts += text(528, 203, "LEVEL_LOADED · bubble to root, then receive in HUD", 16, c.teal, 600);
    contexts += text(49, 692, "Switch scene", 20, c.ink, 650) + text(240, 692, "await oldScene.close()", 18, c.violet, 600) + text(545, 692, "→", 22, c.muted) + text(586, 692, "create the next SceneContext", 18, c.teal, 600);
    contexts += text(49, 725, "Closing aborts loading and releases the scene adapter, pool and view. The root clock and HUD survive.", 17, c.muted);
    writeFileSync(output + `scene-contexts-${name}.svg`, svg(1200, 790, "Scene lab context architecture", "GameContext owns the clock, replaceable SceneContext and persistent HudContext. Scene input and level-loaded notifications cross only explicit routes. Closing a scene cancels loads and releases its owned resources.", contexts));
}
writeFileSync(output + "domwires-mark.svg", svg(120, 120, "DomWires mark", "A component outline with a stepped connection between square ports.", mark("#263d51", "#087e80")));
writeFileSync(output + "domwires-mark-mono.svg", svg(120, 120, "DomWires monochrome mark", "The component and connection mark in one color.", mark("#182635", "#182635")));
let concepts = rect(0.5, 0.5, 1199, 359, "#f7fafb", "#cfdae2", 18) + text(36, 43, "DomWires / concept exploration", 24, "#182635", 650);
concepts += `<g transform="translate(112 85)">${mark("#263d51", "#087e80")}</g>`;
concepts += '<g transform="translate(515 95)" fill="none" stroke="#087e80" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M0 40 H37 L72 7 M37 40 L72 73"/><rect x="-8" y="32" width="16" height="16" rx="3"/><rect x="70" y="0" width="16" height="16" rx="3"/><rect x="70" y="66" width="16" height="16" rx="3"/></g>';
concepts += '<g transform="translate(874 105)" fill="none" stroke="#263d51" stroke-width="8" stroke-linejoin="round"><path d="M0 0 V75 H23 L43 55 V20 L23 0Z M56 0 L70 75 L89 30 L108 75 L122 0"/></g>';
for (const [x, label, detail] of [[36, "01  Routed boundary", "Selected · component + connection"], [430, "02  Signal fork", "Clear routing, weaker identity"], [824, "03  Wire monogram", "Literal DW, a crowded direction"]])
{
    concepts += text(x, 263, label, 22, "#182635", 650) + text(x, 293, detail, 17, "#526475");
}
writeFileSync(output + "logo-concepts.svg", svg(1200, 360, "DomWires logo concepts", "Three original geometric concepts, with routed boundary selected.", concepts));
console.log("Generated DomWires logos and light/dark architecture diagrams.");
