// Ridge City media kit v1: gameplay stills from the LIVE site.
// Run from a folder with playwright-core installed:
//   node capture.mjs <outdir> [shot ...]      shots: mack car alarm wanted garage keyart; alts: map ramp
// Each shot runs in a fresh browser context. A crafted save sets the time of day; the game's own
// test hook (window.__ridgeCity) stages position and heat. Every frame is the game's renderer and HUD.
import { chromium } from "playwright-core";
import fs from "node:fs";

const out = process.argv[2] || "shots";
const want = process.argv.slice(3);
const BASE = process.env.RC_BASE || "https://ridgecity.icf.games/";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
const log = [];

function save(over = {}) {
  return {
    version: 2, cash: 640, jobId: "meet", jobProg: 0, wanted: 0, x: 2780, y: 2720, respect: 3,
    envelopes: [], owned: [], difficulty: "beginner", hour: 17, onClock: false, savedAt: Date.now(), ...over,
  };
}

// 960x540 CSS at 4/3 scale = a 1280x720 frame, the view a 125-150% Windows laptop shows
const VIEW = { width: Number(process.env.RC_W || 960), height: Number(process.env.RC_H || 540) };
const DSF = 1280 / VIEW.width;
async function session(saveBlob, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.view || VIEW, deviceScaleFactor: opts.dsf || DSF });
  await ctx.addInitScript((blob) => {
    try {
      localStorage.setItem("ridgecity-settings-v2", JSON.stringify({ shake: true, muted: true, music: false }));
      if (blob) localStorage.setItem("ridgecity-save-v1", JSON.stringify(blob));
    } catch {}
  }, saveBlob);
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(BASE, { waitUntil: "networkidle" });
  // the keyboard help strip is instructions, not the game; everything else stays
  await p.addStyleTag({
    content:
      ".controls-hint{display:none!important}" +
      (opts.hideHint ? ".hint{display:none!important}" : "") +
      // the FREE / job panel: idle free-roam text that would repeat in every still and cover the road
      (opts.hideMission ? ".hud-mission{display:none!important}" : "") +
      // key art for the card and banner: the game's world render only, no DOM HUD (the canvas radar is cropped off later)
      (opts.clean ? ".hud,.hud-tools,.toast,.hint,.mobile-controls{display:none!important}" : ""),
  });
  await p.waitForTimeout(800);
  if (saveBlob) await p.click("button:has-text('Continue')");
  else await p.click("button:has-text('Beginner')");
  await p.waitForTimeout(2600); // start toast clears
  return { ctx, p, errs };
}

const rc = (p, fn, ...args) => p.evaluate(([fn, args]) => window.__ridgeCity[fn](...args), [fn, args]);
const state = (p) => p.evaluate(() => window.__ridgeCity.getState());
async function snap(p, name) {
  const s = await state(p);
  await p.screenshot({ path: `${out}/${name}.png` });
  log.push(`${name}: screen=${s.screen} vehicle=${s.vehicle} wanted=${s.wanted} mph=${Math.round(s.speed)} toast="${s.toast}" hint="${s.hint}" ${s.district}`);
}
async function burst(p, name, n, gap) {
  for (let i = 0; i < n; i++) {
    await snap(p, `${name}-${String.fromCharCode(97 + i)}`);
    await p.waitForTimeout(gap);
  }
}
const down = (p, ...k) => Promise.all(k.map((x) => p.keyboard.down(x)));
const up = (p, ...k) => Promise.all(k.map((x) => p.keyboard.up(x)));

const press = async (p, k, ms = 120) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); };
async function jackSport(p) {
  await rc(p, "warp", 3180, 1820, 0);
  await p.waitForTimeout(300);
  await p.keyboard.press("KeyE");
  await p.waitForTimeout(300);
}

const shots = {
  // 1. On foot by Mack at the garage lot: the real opening of a new game
  async mack() {
    const { ctx, p, errs } = await session(null);
    await rc(p, "warp", 2876, 2712, -0.4);
    await p.waitForTimeout(900);
    await burst(p, "01-mack-pre", 2, 300);
    await p.keyboard.press("Space");
    await p.waitForTimeout(350);
    await burst(p, "01-mack-talk", 3, 400);
    await ctx.close(); return errs;
  },
  // 2. Jacked sport car, downtown, dusk: westbound so the car sits clear of the HUD, then a slide
  async car() {
    const out = [];
    for (const [tag, x0, y0, ang, steer] of (process.env.RC_CAR === "south"
      ? [["s", 2448, 1300, Math.PI / 2, "KeyA"], ["s2", 2848, 1300, Math.PI / 2, "KeyD"], ["s3", 2048, 1300, Math.PI / 2, "KeyD"]]
      : [["w", 3150, 1648, Math.PI, "KeyA"], ["w2", 3150, 2048, Math.PI, "KeyD"], ["n", 2448, 2300, -Math.PI / 2, "KeyA"]])) {
      const { ctx, p, errs } = await session(save({ hour: 19.1 }), { hideHint: true, hideMission: true });
      await jackSport(p);
      await rc(p, "warp", x0, y0, ang);
      await p.waitForTimeout(2600); // toast clears, car settles
      await down(p, "KeyW");
      await p.waitForTimeout(700);
      await burst(p, `02-car-${tag}`, 5, 150);
      await down(p, "ShiftLeft", steer);
      await p.waitForTimeout(120);
      await burst(p, `02-car-${tag}-slide`, 5, 110);
      await up(p, "ShiftLeft", steer);
      await up(p, "KeyW");
      out.push(...errs);
      await ctx.close();
    }
    return out;
  },
  // 3. Shop alarm at night
  async alarm() {
    const results = [];
    for (const [label, x, y] of [["mart", 3540, 1850], ["arcade", 2685, 1250], ["market", 1610, 2660]]) {
      const { ctx, p, errs } = await session(save({ hour: 21.0 }), { hideHint: true, hideMission: true });
      await rc(p, "warp", x, y + 40, -Math.PI / 2);
      await down(p, "KeyW"); await p.waitForTimeout(150); await up(p, "KeyW");
      await p.waitForTimeout(500);
      await p.keyboard.press("Space");
      await p.waitForTimeout(200);
      await burst(p, `03-alarm-${label}`, 4, 300);
      await down(p, "KeyS"); await p.waitForTimeout(500);
      await burst(p, `03-alarm-${label}-run`, 2, 250);
      await up(p, "KeyS");
      results.push(...errs);
      await ctx.close();
    }
    return results;
  },
  // 4. Three stars and cruisers on the tail: let them close in, then go west (away from the HUD panel)
  async wanted() {
    const out = [];
    for (const [tag, x0, y0, ang, hold] of [["w", 2900, 1248, Math.PI, 1400], ["n", 2048, 2150, -Math.PI / 2, 1400], ["w2", 3300, 1648, Math.PI, 1100]]) {
      const { ctx, p, errs } = await session(save({ hour: 20.4, difficulty: "experienced" }), { hideHint: true, hideMission: true });
      await jackSport(p);
      await rc(p, "warp", x0, y0, ang);
      await p.waitForTimeout(1800);
      await rc(p, "setWanted", 3);
      await p.waitForTimeout(hold);
      await down(p, "KeyW");
      await p.waitForTimeout(250);
      await burst(p, `04-wanted-${tag}`, 5, 150);
      await up(p, "KeyW");
      out.push(...errs);
      await ctx.close();
    }
    return out;
  },
  // 5. The map, mid-game: two cars bought at Mack's (yellow), a courier gig (orange), cruisers out (red).
  // Dropped from the v1 kit (flat grid, colliding labels drawn by the game); kept here as an alt.
  async map() {
    const { ctx, p, errs } = await session(save({ hour: 18, cash: 3200, respect: 4, envelopes: [true, true, false, true, false, true] }));
    await jackSport(p);
    await rc(p, "warp", 2980, 2600, -Math.PI / 2);
    await p.waitForTimeout(2500);
    await p.keyboard.press("Space"); // garage menu
    await p.waitForTimeout(500);
    await p.click("button.cat-row:has-text('COMPACT')");
    await p.waitForTimeout(200);
    await p.click("button.cat-row:has-text('COUPE')");
    await p.waitForTimeout(200);
    await p.click("button.btn:has-text('Back')");
    await p.waitForTimeout(300);
    await p.keyboard.press("KeyE"); // bail; the sport stays parked in the bay (shown on the map)
    await p.waitForTimeout(300);
    await rc(p, "warp", 2448, 1648, 0);
    await rc(p, "forceRadio", "courier");
    await rc(p, "setWanted", 4);
    await p.waitForTimeout(1500);
    await press(p, "KeyM", 150);
    await p.waitForTimeout(900);
    await burst(p, "05-map", 2, 400);
    await ctx.close(); return errs;
  },
  // 6. Hidden in Mack's garage bay; the cruisers can only wait at the door. The car is parked, so the
  // "SLOW DOWN · hide in the garage" hint would contradict the frame (and it covers Mack): hidden.
  async garage() {
    const out = [];
    for (const [tag, y0, wait] of [["a", 2600, 1200], ["b", 2630, 2000]]) {
      const { ctx, p, errs } = await session(save({ hour: 19.6 }), { hideHint: true, hideMission: true });
      await jackSport(p);
      await rc(p, "warp", 2980, y0, -Math.PI / 2);
      await p.waitForTimeout(2600);
      await rc(p, "setWanted", 2);
      await p.waitForTimeout(wait);
      await burst(p, `06-garage-${tag}`, 6, 400);
      out.push(...errs);
      await ctx.close();
    }
    // the garage menu itself
    const { ctx, p, errs } = await session(save({ hour: 19.6, cash: 1840 }));
    await jackSport(p);
    await rc(p, "warp", 2980, 2600, -Math.PI / 2);
    await p.waitForTimeout(2500);
    await p.keyboard.press("Space");
    await p.waitForTimeout(600);
    await snap(p, "06-garage-menu");
    out.push(...errs);
    await ctx.close();
    return out;
  },
  // key art: the chase at 2x, no DOM HUD, 1920x1080 frame; card and banner are cropped from it
  async keyart() {
    const out = [];
    const clean = { clean: true, view: { width: 960, height: 540 }, dsf: 2 };
    for (const [tag, x0, y0, hold, hour] of [["k1", 3300, 1648, 1100, 20.4], ["k2", 3700, 1248, 1200, 20.6], ["k3", 3300, 2048, 1000, 19.8]]) {
      const { ctx, p, errs } = await session(save({ hour, difficulty: "experienced" }), clean);
      await jackSport(p);
      await rc(p, "warp", x0, y0, Math.PI);
      await p.waitForTimeout(1800);
      await rc(p, "setWanted", 3);
      await p.waitForTimeout(hold);
      await down(p, "KeyW");
      await p.waitForTimeout(250);
      await burst(p, `08-keyart-${tag}`, 6, 120);
      await up(p, "KeyW");
      out.push(...errs);
      await ctx.close();
    }
    return out;
  },
  // alt: dock ramp jump
  async ramp() {
    const { ctx, p, errs } = await session(save({ hour: 18.4 }), { hideHint: true });
    await jackSport(p);
    await rc(p, "warp", 1150, 2850, 0);
    await p.waitForTimeout(2200);
    await down(p, "KeyW");
    await p.waitForTimeout(1000);
    await burst(p, "07-ramp", 7, 120);
    await up(p, "KeyW");
    await ctx.close(); return errs;
  },
};

for (const name of want.length ? want : Object.keys(shots)) {
  try {
    const errs = await shots[name]();
    log.push(`[${name}] page errors: ${JSON.stringify(errs.slice(0, 5))}`);
  } catch (e) {
    log.push(`[${name}] FAILED: ${e.message}`);
  }
}
await browser.close();
console.log(log.join("\n"));
