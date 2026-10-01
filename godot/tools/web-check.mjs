// Ridge City Godot week-one headless check (Playwright, Chromium headless shell, SwiftShader).
// Serve the build first: npm run build && npx vite preview --port 4317 --strictPort --host 127.0.0.1
// Then, from a folder with playwright-core installed: node web-check.mjs <outdir>
// RC_BASE overrides the URL (default http://127.0.0.1:4317/proto/godot-week1/). Exits 1 on any failed check.
import { chromium } from "playwright-core";
import fs from "node:fs";

const out = process.argv[2] || "shots";
const BASE = process.env.RC_BASE || "http://127.0.0.1:4317/proto/godot-week1/";
fs.mkdirSync(out, { recursive: true });

const results = [];
const problems = { console: [], pageerror: [], http: [], failed: [] };
function check(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function open(label, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const bytes = {};
  page.on("console", (m) => {
    if (m.type() === "error") problems.console.push(`[${label}] ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.pageerror.push(`[${label}] ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) problems.http.push(`[${label}] ${r.status()} ${r.url()}`);
    // vite preview answers a missing file with 200 + index.html; count that as a 404.
    const ct = r.headers()["content-type"] || "";
    if (r.url() !== BASE && r.request().resourceType() !== "document" && ct.includes("text/html"))
      problems.http.push(`[${label}] soft-404 (html for a sub-resource) ${r.url()}`);
  });
  page.on("requestfailed", (r) => problems.failed.push(`[${label}] ${r.failure()?.errorText} ${r.url()}`));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const urls = {};
  cdp.on("Network.requestWillBeSent", (e) => (urls[e.requestId] = e.request.url));
  cdp.on("Network.loadingFinished", (e) => {
    const u = urls[e.requestId] || "?";
    bytes[u] = e.encodedDataLength;
  });
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForFunction(() => window.__ridgeCity && window.__ridgeCity.state && window.__ridgeCity.state.ready, null, { timeout: 120000 });
  const readyMs = Date.now() - t0;
  return { ctx, page, cdp, bytes, readyMs };
}

const state = (page) => page.evaluate(() => window.__ridgeCity.state);
const cmd = (page, name, arg = {}) => page.evaluate(([n, a]) => window.__ridgeCity.cmd(n, a), [name, arg]);
async function waitFor(page, pred, ms = 5000, step = 50) {
  const end = Date.now() + ms;
  let s;
  while (Date.now() < end) {
    s = await state(page);
    if (pred(s)) return s;
    await sleep(step);
  }
  return s;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------------- Laptop: 1280x800, keyboard and mouse ----------------
{
  const { page, ctx, bytes, readyMs } = await open("laptop", { viewport: { width: 1280, height: 800 } });
  check("laptop: reaches the playable scene", true, `ready in ${readyMs} ms`);
  let s = await state(page);
  check("scene is week1_block with 20 props", s.scene === "week1_block" && s.props_total === 20, `${s.scene}, ${s.props_total} props`);
  await sleep(1500);
  await page.screenshot({ path: `${out}/laptop-1280x800.png` });

  // Focus the canvas without firing at anything important (top-left sky area of the HUD).
  await page.focus("canvas");
  await sleep(300);

  // Scripted drive: E to get in, W to accelerate, A+W to turn.
  s = await state(page);
  const carStart = s.car;
  await page.keyboard.press("e");
  s = await waitFor(page, (x) => x.in_car, 2000);
  check("E enters the car", s.in_car);
  await page.keyboard.down("w");
  await sleep(1600);
  s = await state(page);
  const peak = s.car.speed;
  await page.screenshot({ path: `${out}/laptop-drive.png` });
  await page.keyboard.down("a");
  await sleep(700);
  await page.keyboard.up("a");
  await page.keyboard.up("w");
  await sleep(600);
  s = await state(page);
  check("W drives the car forward", dist(s.car, carStart) > 8 && peak > 8, `moved ${dist(s.car, carStart).toFixed(1)} m, speed ${peak}`);
  check("A steers (heading changed)", Math.abs(s.car.heading - carStart.heading) > 0.3, `heading ${carStart.heading} -> ${s.car.heading}`);

  // Smash: line the car up on the west-road cones and floor it.
  const before = await state(page);
  await cmd(page, "place_car", { x: -25.5, z: 14, heading: 0 });
  await sleep(300);
  await page.keyboard.down("w");
  s = await waitFor(page, (x) => x.smashes > before.smashes, 4000);
  await sleep(150);
  await page.screenshot({ path: `${out}/laptop-smash.png` });
  await page.keyboard.up("w");
  s = await state(page);
  check("ramming a prop smashes it", s.smashes > before.smashes, `smashes ${before.smashes} -> ${s.smashes}`);
  check("a smash raises the wanted stars", s.stars > before.stars && s.stars >= 1, `stars ${before.stars} -> ${s.stars}`);
  await sleep(800);

  // Out of the car, blaster on a frozen pedestrian.
  await page.keyboard.press("e");
  s = await waitFor(page, (x) => !x.in_car, 2000);
  check("E gets out of the car", !s.in_car);
  await cmd(page, "freeze_peds", { on: true });
  await cmd(page, "place_player", { x: -16, z: 22, fx: 1, fz: 0 });
  await cmd(page, "place_ped", { i: 0, x: -10, z: 22 });
  await sleep(400);
  const tagsBefore = (await state(page)).tags;
  await page.keyboard.down("Space");
  await sleep(120);
  await page.keyboard.up("Space");
  s = await waitFor(page, (x) => x.peds[0].state === "dizzy", 2000);
  const tagT = Date.now();
  await sleep(250);
  await page.screenshot({ path: `${out}/laptop-tagged.png` });
  check("a blaster shot tags the pedestrian (dizzy)", s.peds[0].state === "dizzy" && s.tags > tagsBefore, `state ${s.peds[0].state}, tags ${tagsBefore} -> ${s.tags}`);
  s = await waitFor(page, (x) => x.peds[0].state !== "dizzy", 5000);
  const upMs = Date.now() - tagT;
  check("the pedestrian stands up again after about 3 s", s.peds[0].state !== "dizzy" && upMs > 2500 && upMs < 3800, `up after ${upMs} ms, state ${s.peds[0].state}`);
  check("no pedestrian state is named for death", !JSON.stringify(s.peds).match(/dead|kill|wasted|blood/i));

  // Break-in at the corner shop door pays cash.
  const cashBefore = (await state(page)).cash;
  await cmd(page, "place_player", { x: 12, z: 21.6, fx: 0, fz: -1 });
  await sleep(300);
  s = await state(page);
  const promptSeen = s.prompt;
  await page.keyboard.press("e");
  s = await waitFor(page, (x) => x.break_ins >= 1, 2000);
  check("break-in pays cash", s.cash === cashBefore + 150 && s.break_ins === 1, `cash ${cashBefore} -> ${s.cash}, prompt "${promptSeen}"`);
  await sleep(500);
  await page.keyboard.down("w");
  await sleep(1100);
  await page.keyboard.up("w");
  s = await state(page);
  check("the door opens and the player walks inside", s.player.z < 19.5, `player z ${s.player.z}`);
  await sleep(300);
  await page.screenshot({ path: `${out}/laptop-shop.png` });

  // FPS readout.
  s = await state(page);
  check("FPS readout present", /^FPS \d+$/.test(s.fps_text), `"${s.fps_text}" (swiftshader, not a device number)`);

  // Debris cap: smash everything at once and sample the live count.
  await cmd(page, "place_player", { x: 0, z: 30, fx: 0, fz: -1 });
  await cmd(page, "break_all");
  let maxLive = 0;
  const end = Date.now() + 2500;
  while (Date.now() < end) {
    s = await state(page);
    maxLive = Math.max(maxLive, s.debris_live);
    await sleep(40);
  }
  await page.screenshot({ path: `${out}/laptop-after-break-all.png` });
  check("all 20 props break", s.props_broken === 20, `${s.props_broken}/20`);
  check("debris never exceeds 64", maxLive <= 64 && s.debris_max_seen <= 64 && s.debris_spawned > 64,
    `sampled max ${maxLive}, engine max ${s.debris_max_seen}, spawned ${s.debris_spawned}`);
  fs.writeFileSync(`${out}/laptop-final-state.json`, JSON.stringify(s, null, 2));
  fs.writeFileSync(`${out}/laptop-bytes.json`, JSON.stringify(bytes, null, 2));
  await ctx.close();
}

// ---------------- Tablet: 1024x768, touch ----------------
{
  const { page, ctx, cdp, readyMs } = await open("tablet", { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  check("tablet: reaches the playable scene", true, `ready in ${readyMs} ms`);
  await sleep(1500);
  let s = await state(page);
  check("touch controls show on a touch device", s.touch_ui);
  await page.screenshot({ path: `${out}/tablet-1024x768.png` });

  // Canvas is 1280x960 in game units at this window (scale 0.8). Buttons: FIRE (1160,820), ACT (1010,868).
  const k = 0.8;
  const touch = async (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
  const press = async (x, y, ms = 150) => { await touch("touchStart", x, y); await sleep(ms); await touch("touchEnd", x, y); };

  // Stick: drag up on the left half, the player walks north.
  const p0 = s.player;
  await touch("touchStart", 160, 600);
  for (let i = 1; i <= 5; i++) { await touch("touchMove", 160, 600 - i * 16); await sleep(30); }
  await sleep(900);
  await page.screenshot({ path: `${out}/tablet-stick.png` });
  await touch("touchEnd", 160, 520);
  s = await state(page);
  check("touch stick moves the player", p0.z - s.player.z > 2, `z ${p0.z} -> ${s.player.z}`);

  // ACT near the car gets in; ACT again gets out.
  await cmd(page, "place_player", { x: -4, z: 24, fx: 0, fz: -1 });
  await cmd(page, "place_car", { x: -4, z: 27.5, heading: -Math.PI / 2 });
  await cmd(page, "place_player", { x: -4, z: 24, fx: 0, fz: -1 });
  await sleep(300);
  await press(1010 * k, 868 * k);
  s = await waitFor(page, (x) => x.in_car, 2000);
  check("touch ACT enters the car", s.in_car);
  const c0 = s.car;
  await touch("touchStart", 160, 600);
  for (let i = 1; i <= 5; i++) { await touch("touchMove", 160, 600 - i * 16); await sleep(30); }
  await sleep(1200);
  await touch("touchEnd", 160, 520);
  s = await state(page);
  check("touch stick drives the car", dist(s.car, c0) > 4, `moved ${dist(s.car, c0).toFixed(1)} m`);
  await press(1010 * k, 868 * k);
  s = await waitFor(page, (x) => !x.in_car, 2000);
  check("touch ACT gets out", !s.in_car);

  // FIRE button tags a pedestrian.
  await cmd(page, "freeze_peds", { on: true });
  await cmd(page, "place_player", { x: -16, z: 22, fx: 1, fz: 0 });
  await cmd(page, "place_ped", { i: 1, x: -10, z: 22 });
  await sleep(400);
  await press(1160 * k, 820 * k, 160);
  s = await waitFor(page, (x) => x.peds[1].state === "dizzy", 2000);
  await sleep(200);
  await page.screenshot({ path: `${out}/tablet-tagged.png` });
  check("touch FIRE tags a pedestrian", s.peds[1].state === "dizzy", `state ${s.peds[1].state}`);
  s = await state(page);
  check("tablet FPS readout present", /^FPS \d+$/.test(s.fps_text), `"${s.fps_text}" (swiftshader)`);
  await ctx.close();
}

await browser.close();
check("zero console errors", problems.console.length === 0 && problems.pageerror.length === 0, [...problems.console, ...problems.pageerror].slice(0, 5).join(" | "));
check("zero 404s or failed requests", problems.http.length === 0 && problems.failed.length === 0, [...problems.http, ...problems.failed].slice(0, 5).join(" | "));
fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, problems }, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
