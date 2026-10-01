import type {
  CarType,
  Difficulty,
  HudSnapshot,
  JobId,
  Marker,
  Particle,
  Ped,
  RadioKind,
  Screen,
  Skid,
  Vehicle,
} from "./types";
import {
  CATALOG,
  CAR_COLORS,
  CHOP_SHOP,
  DOCK_RAMP,
  GARAGE_DROP,
  JOBS,
  JOB_ORDER,
  LOCKUP,
  MACK_POS,
  MOTEL,
  PAY_SPRAY,
  WORLD,
  carFeel,
  carStats,
  districtAt,
  doorOf,
  garageDropPoint,
  garageSolids,
  inGarageDrop,
  inGaragePark,
  inPierDrop,
  makeCar,
  makeWorld,
  onHorzRoad,
  onRoad,
  onVertRoad,
  pierDropPoint,
  snapRoadX,
  snapRoadY,
} from "./world";
import {
  cycleRadio,
  destroyAudio,
  radioName,
  resumeAudio,
  setMuted,
  setMusicOn,
  setSiren,
  sfx,
  startEngineLoop,
  tickMusic,
  tickSiren,
  unlockAudio,
  updateEngine,
} from "./audio";
import { hasSave, loadSave, loadSettings, writeSave, writeSettings, type SaveBlob } from "./save";
import {
  drawActors,
  drawHudNav,
  drawMapOverlay,
  drawMinimap,
  drawWorld,
  loadAssets,
  type Assets,
  type DrawState,
} from "./draw";

const STEP = 1 / 60;
const WALK = 210;
const MOVE_UP = ["ArrowUp", "KeyW", "Numpad8"] as const;
const MOVE_DOWN = ["ArrowDown", "KeyS", "Numpad2"] as const;
const MOVE_LEFT = ["ArrowLeft", "KeyA", "Numpad4"] as const;
const MOVE_RIGHT = ["ArrowRight", "KeyD", "Numpad6"] as const;
const NUMPAD_MOVE = new Set([
  "Numpad1",
  "Numpad2",
  "Numpad3",
  "Numpad4",
  "Numpad6",
  "Numpad7",
  "Numpad8",
  "Numpad9",
]);

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function circleRect(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  return Math.hypot(cx - nx, cy - ny) < r;
}

export function createGame(
  canvas: HTMLCanvasElement,
  onHud: (h: HudSnapshot) => void,
) {
  const ctxRaw = canvas.getContext("2d");
  if (!ctxRaw) throw new Error("No 2d context");
  const ctx = ctxRaw;

  const world = makeWorld();
  const { buildings, shops, parked, peds, parks, envelopes, props } = world;
  const cops: Vehicle[] = [];
  const traffic: Vehicle[] = [];
  const markers: Marker[] = [];
  const skids: Skid[] = [];
  const particles: Particle[] = [];

  const player = {
    x: 2780,
    y: 2720,
    r: 11,
    angle: 0,
    vehicle: null as Vehicle | null,
    cash: 0,
    wanted: 0,
    heatTimer: 0,
    unseen: 0,
    respect: 0,
  };
  const camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };
  let trauma = 0;
  let hour = 16;
  let difficulty: Difficulty = "beginner";
  let gameStarted = false;
  let busted = false;
  let currentJob: JobId = "meet";
  let jobProg = 0;
  let jobNeed = 1;
  let onClock = true;
  let heldStory: JobId | null = null;
  let radioKind: RadioKind | null = null;
  let radioPay = 0;
  let radioClock = 0;
  let radioOffer: RadioKind | null = null;
  let radioOfferIn = 16;
  let screen: Screen = "start";
  let toastMsg = "";
  let toastT = 0;
  let hint = "";
  let lastTime = performance.now();
  let acc = 0;
  let raf = 0;
  let running = true;
  let assets: Assets = { asphalt: null, grass: null, water: null, props: [], ready: false };
  let settings = loadSettings();
  setMuted(settings.muted);
  setMusicOn(settings.music);
  let injectKeys: Set<string> | null = null;
  let injectSteer: number | null = null;
  let radioLabel = "RIDGE FM";
  let sprayLock = 0;
  let hideClock = 0;
  let coolMeter = 0;
  let lastSavedAt = 0;
  let air = 0;
  let spin = 0;
  let rampCd = 0;
  let fareRiding = false;
  let farePed: Ped | null = null;
  let alarm: { x: number; y: number; t: number } | null = null;
  let lastHud = 0;
  let bustFine = 0;
  let held = new Set<string>();
  let virtualHeld = new Set<string>();
  let prevHeld = new Set<string>();
  const stick = { active: false, dx: 0, dy: 0, id: -1 };
  let edgeAct = false;
  let edgeJack = false;
  let edgeMap = false;
  let edgePause = false;
  let edgeRadio = false;
  let edgeHorn = false;

  function viewSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return { w: canvas.width / dpr, h: canvas.height / dpr };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function toast(msg: string, ms = 2000) {
    toastMsg = msg;
    toastT = ms / 1000;
  }

  function addCash(n: number) {
    player.cash += n;
    if (n > 0) {
      particles.push({
        x: player.x,
        y: player.y - 18,
        vx: 0,
        vy: -28,
        life: 0.9,
        max: 0.9,
        color: "#c6f06a",
        size: 0,
        text: "+$" + n,
      });
      sfx("cash");
    }
  }

  function bang(amount: number) {
    if (settings.shake) trauma = Math.min(1, trauma + amount);
  }

  function emit(x: number, y: number, color: string, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 80;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.3,
        max: 0.6,
        color,
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  function scarePeds(ox: number, oy: number, radius: number, dur = 2.6) {
    for (const p of peds) {
      if (p.kind === "mack" || p.down > 0) continue;
      const d = dist(p.x, p.y, ox, oy);
      if (d > radius) continue;
      p.panic = Math.max(p.panic, dur * (0.45 + 0.55 * (1 - d / radius)));
      p.wander = Math.atan2(p.y - oy, p.x - ox);
    }
  }

  function tripAlarm(x: number, y: number) {
    alarm = { x, y, t: 8.5 };
    scarePeds(x, y, 340, 3.8);
    const cols = ["#c4b8a4", "#8a7a6a", "#4a5560", "#6a5344", "#7a8a74"];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      const r = 90 + Math.random() * 70;
      peds.push({
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r,
        homeX: x + Math.cos(a) * 38,
        homeY: y + Math.sin(a) * 38,
        kind: "civ",
        color: cols[i % cols.length],
        wander: a + Math.PI,
        r: 8,
        down: 0,
        panic: 7.5,
        crowd: true,
      });
    }
  }

  function resolveSolid(ent: { x: number; y: number; speed?: number; angle?: number }, rad: number) {
    let hit: { nx: number; ny: number } | null = null;
    for (const b of buildings) {
      const parts = b.label === "GARAGE" ? garageSolids() : [b];
      for (const part of parts) {
        if (!circleRect(ent.x, ent.y, rad, part.x, part.y, part.w, part.h)) continue;
        const left = ent.x - part.x;
        const right = part.x + part.w - ent.x;
        const top = ent.y - part.y;
        const bot = part.y + part.h - ent.y;
        const m = Math.min(left, right, top, bot);
        if (m === left) {
          ent.x = part.x - rad - 0.5;
          hit = { nx: -1, ny: 0 };
        } else if (m === right) {
          ent.x = part.x + part.w + rad + 0.5;
          hit = { nx: 1, ny: 0 };
        } else if (m === top) {
          ent.y = part.y - rad - 0.5;
          hit = { nx: 0, ny: -1 };
        } else {
          ent.y = part.y + part.h + rad + 0.5;
          hit = { nx: 0, ny: 1 };
        }
      }
    }
    for (const p of props) {
      if (!p.block) continue;
      const d = dist(ent.x, ent.y, p.x, p.y);
      if (d < rad + p.r * 0.6) {
        const nx = (ent.x - p.x) / (d || 1);
        const ny = (ent.y - p.y) / (d || 1);
        ent.x = p.x + nx * (rad + p.r * 0.6);
        ent.y = p.y + ny * (rad + p.r * 0.6);
        hit = { nx, ny };
      }
    }
    if (hit && ent.speed) {
      const vx = Math.cos(ent.angle ?? 0) * ent.speed;
      const vy = Math.sin(ent.angle ?? 0) * ent.speed;
      const vn = vx * hit.nx + vy * hit.ny;
      if (vn < 0) {
        const tx = vx - vn * hit.nx;
        const ty = vy - vn * hit.ny;
        ent.speed = Math.hypot(tx, ty) * 0.88;
        if (ent.angle != null && ent.speed > 12) ent.angle = Math.atan2(ty, tx);
      }
    }
    ent.x = clamp(ent.x, 18, WORLD.w - 18);
    ent.y = clamp(ent.y, 18, WORLD.h - 18);
    return hit;
  }

  function carParkedInGarage(sportOnly: boolean) {
    const pool: Vehicle[] = [];
    if (player.vehicle) pool.push(player.vehicle);
    for (const v of parked) pool.push(v);
    for (const v of traffic) if (v.alive) pool.push(v);
    return pool.some((v) => {
      if (v.cop || v.type === "cop" || !v.hot) return false;
      if (sportOnly && v.type !== "sport") return false;
      if (Math.abs(v.speed) > 130) return false;
      return inGaragePark(v.x, v.y);
    });
  }

  function nearestFreeCar(range: number) {
    let best: Vehicle | null = null;
    let bestD = range;
    for (const v of parked) {
      if (v.taken || v.cop) continue;
      const d = dist(player.x, player.y, v.x, v.y);
      if (d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  function setWanted(n: number) {
    player.wanted = clamp(n, 0, 5);
    player.heatTimer = player.wanted ? 8 + player.wanted * 4 : 0;
    player.unseen = 0;
    if (player.wanted > 0) {
      ensureCops();
      syncRoadblocks();
    }
    setSiren(player.wanted > 0 && gameStarted && !busted);
  }

  function bumpWanted(n: number) {
    if (n > player.wanted) setWanted(n);
    else if (n > 0) player.heatTimer = Math.max(player.heatTimer, 6);
  }

  function radioCopy(kind: RadioKind) {
    const map: Record<RadioKind, string> = {
      boost: "Boost the marked car and dump it at the garage",
      shop: "Hit the marked shop and bank the bag",
      courier: "Grab the drop and run it to the marker",
      evade: "Get 2 stars, go cold, see Mack",
      sprint: "Reach the marker before the clock dies",
      jump: "Clear the dock ramp in a SPORT",
      haul: "Haul a VAN to the garage",
      fare: "Pick up the fare. Drop them at the pier",
    };
    return map[kind];
  }

  function radioPrice(kind: RadioKind) {
    if (kind === "jump") return 260;
    if (kind === "haul") return 320;
    if (kind === "fare") return 240;
    return 180 + Math.floor(Math.random() * 220);
  }

  function jobLine() {
    if (radioOffer) return "RADIO  ·  " + radioCopy(radioOffer) + "  ·  ACT take  ·  R skip";
    if (!onClock) return "City's open. See Mack for a job, or wait on the radio.";
    const extra = jobNeed > 1 ? `  (${jobProg}/${jobNeed})` : "";
    if (currentJob === "radio" && radioKind) {
      return radioCopy(radioKind) + (radioClock > 0 ? `  ${Math.ceil(radioClock)}s` : extra);
    }
    const j = JOBS[currentJob];
    return (j ? j.short : JOBS.done.short) + extra;
  }

  function jobLabel() {
    if (radioOffer) return "RADIO";
    if (!onClock) return "FREE";
    return "JOB";
  }

  function mackNextLine() {
    const queued = heldStory ?? (onClock && currentJob === "radio" ? null : currentJob);
    if (!queued || queued === "radio" || queued === "done") return "Story's done  ·  radio gigs";
    if (onClock && currentJob === queued) return "On it  ·  " + JOBS[queued].short;
    return "Waiting  ·  " + JOBS[queued].short;
  }

  function clockOff() {
    onClock = false;
    radioKind = null;
    radioClock = 0;
    radioOffer = null;
    radioOfferIn = 12 + Math.random() * 10;
    markers.length = 0;
    fareRiding = false;
    if (heldStory) {
      currentJob = heldStory;
      heldStory = null;
    }
  }

  function armStory(id: JobId) {
    currentJob = id;
    jobProg = 0;
    jobNeed = id === "shop2" ? 2 : 1;
    radioKind = null;
    radioOffer = null;
    markers.length = 0;
    if (id === "meet" || id === "evade") markers.push({ x: MACK_POS.x, y: MACK_POS.y, kind: "mack" });
    if (id === "boost1" && player.vehicle) {
      player.vehicle.hot = true;
      jobProg = 1;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
    if (id === "boost2") {
      const sport = parked.find((c) => c.type === "sport" && !c.taken);
      if (sport) markers.push({ x: sport.x, y: sport.y, kind: "car" });
    }
    if (id === "shop1") markers.push({ x: 560 + 105, y: 1680 + 170, kind: "shop" });
    if (id === "shop2") {
      markers.push({ x: 3440 + 100, y: 1680 + 160, kind: "shop" });
      markers.push({ x: 1180 + 90, y: 1180 + 150, kind: "shop" });
    }
    if (id === "taxi") {
      const taxi = parked.find((c) => c.type === "taxi" && !c.taken);
      if (taxi) markers.push({ x: taxi.x, y: taxi.y, kind: "car" });
    }
    if (id === "finale") markers.push({ x: 2580 + 105, y: 1080 + 160, kind: "shop" });
  }

  function clearFarePed() {
    if (farePed) {
      const i = peds.indexOf(farePed);
      if (i >= 0) peds.splice(i, 1);
      farePed = null;
    }
    fareRiding = false;
  }

  function placeFare(x: number, y: number) {
    clearFarePed();
    farePed = {
      x,
      y,
      homeX: x,
      homeY: y,
      kind: "civ",
      color: "#e8c547",
      wander: 0,
      r: 8,
      down: 0,
      panic: 0,
      crowd: false,
    };
    peds.push(farePed);
  }

  function spoilFare(hard: boolean) {
    if (!hard) return;
    if (!(onClock && currentJob === "radio" && radioKind === "fare" && jobProg >= 1)) return;
    clearFarePed();
    toast("FARE SPOOKED");
    sfx("hit");
    clockOff();
  }

  function rampMarker() {
    return { x: DOCK_RAMP.x + DOCK_RAMP.w / 2, y: DOCK_RAMP.y + DOCK_RAMP.h / 2, kind: "drop" as const };
  }

  function fillRadioMarkers(kind: RadioKind) {
    markers.length = 0;
    if (kind === "boost") {
      const pool = parked.filter((c) => !c.taken);
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (c) markers.push({ x: c.x, y: c.y, kind: "car" });
    } else if (kind === "shop") {
      const open = shops.filter((s) => s.cooldown <= 0);
      const s = open[Math.floor(Math.random() * open.length)] ?? shops[0];
      const d = doorOf(s.b);
      markers.push({ x: d.x, y: d.y, kind: "shop" });
    } else if (kind === "courier") {
      markers.push({ x: player.x + 40, y: player.y, kind: "poi" });
      const dest = buildings[Math.floor(Math.random() * buildings.length)];
      markers.push({ x: dest.x + dest.w / 2, y: dest.y + dest.h + 12, kind: "drop" });
    } else if (kind === "evade") {
      markers.push({ x: MACK_POS.x, y: MACK_POS.y, kind: "mack" });
    } else if (kind === "jump") {
      const sport = parked.find((c) => c.type === "sport" && !c.taken);
      if (sport) markers.push({ x: sport.x, y: sport.y, kind: "car" });
      else markers.push(rampMarker());
    } else if (kind === "haul") {
      const van = parked.find((c) => c.type === "van" && !c.taken);
      if (van) markers.push({ x: van.x, y: van.y, kind: "car" });
      else markers.push({ ...garageDropPoint(), kind: "drop" });
    } else if (kind === "fare") {
      const spot = [
        { x: 1248, y: 448 },
        { x: 2048, y: 848 },
        { x: 848, y: 1648 },
        { x: 3248, y: 1248 },
      ][Math.floor(Math.random() * 4)];
      markers.push({ x: spot.x, y: spot.y, kind: "poi" });
      placeFare(spot.x, spot.y);
    } else {
      const dest = [pierDropPoint(), { x: 870, y: 580 }, { x: 3510, y: 620 }, { x: 490, y: 2760 }, { x: 2400, y: 1780 }][
        Math.floor(Math.random() * 5)
      ];
      markers.push({ x: dest.x, y: dest.y, kind: "drop" });
    }
  }

  function beginRadioOffer() {
    const kinds: RadioKind[] = ["boost", "shop", "courier", "evade", "sprint", "jump", "haul", "fare"];
    radioOffer = kinds[Math.floor(Math.random() * kinds.length)];
    if (radioOffer !== "fare") clearFarePed();
    radioPay = radioPrice(radioOffer);
    fillRadioMarkers(radioOffer);
    toast("RADIO  ·  ACT take  ·  R skip");
    sfx("job");
  }

  function acceptRadio() {
    if (!radioOffer) return;
    if (onClock && currentJob !== "radio" && JOB_ORDER.includes(currentJob)) heldStory = currentJob;
    radioKind = radioOffer;
    radioOffer = null;
    currentJob = "radio";
    onClock = true;
    jobProg = 0;
    jobNeed = 1;
    radioClock = radioKind === "sprint" ? 55 : 0;
    if (radioKind === "jump" && player.vehicle?.type === "sport") {
      jobProg = 1;
      markers.length = 0;
      markers.push(rampMarker());
    }
    if (radioKind === "haul" && player.vehicle?.type === "van") {
      jobProg = 1;
      markers.length = 0;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
    toast("JOB ON  ·  $" + radioPay);
    sfx("job");
  }

  function skipRadio() {
    if (!radioOffer) return;
    radioOffer = null;
    markers.length = 0;
    if (!fareRiding) clearFarePed();
    radioOfferIn = 10 + Math.random() * 12;
    toast("SKIPPED");
    sfx("click");
  }

  function exitCar() {
    const v = player.vehicle;
    if (!v) return;
    v.taken = false;
    v.speed = 0;
    v.x = player.x + Math.cos(player.angle + Math.PI / 2) * 28;
    v.y = player.y + Math.sin(player.angle + Math.PI / 2) * 28;
    player.vehicle = null;
    toast("BAILED");
    sfx("jack");
  }

  function enterCar(v: Vehicle) {
    v.taken = true;
    v.hot = true;
    v.speed = Math.max(v.speed, 90);
    player.vehicle = v;
    player.x = v.x;
    player.y = v.y;
    player.angle = v.angle;
    toast("YOU'RE IN  ·  HOLD W");
    sfx("jack");
    bang(0.18);
    window.setTimeout(() => {
      if (player.vehicle === v) bumpWanted(Math.max(player.wanted, 1));
    }, 1400);
    if (onClock && currentJob === "boost1" && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
    if (onClock && currentJob === "boost2" && v.type === "sport" && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
    if (onClock && currentJob === "taxi" && v.type === "taxi") {
      jobProg = Math.max(jobProg, 1);
      markers.length = 0;
      const drop = pierDropPoint();
      markers.push({ x: drop.x, y: drop.y, kind: "drop" });
    }
    if (onClock && currentJob === "radio" && radioKind === "boost" && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
    if (onClock && currentJob === "radio" && radioKind === "jump" && v.type === "sport" && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push(rampMarker());
    }
    if (onClock && currentJob === "radio" && radioKind === "haul" && v.type === "van" && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
  }

  function robShop(s: (typeof shops)[number]) {
    if (s.robbed && s.cooldown > 0) {
      toast("ALREADY HIT");
      return;
    }
    s.robbed = true;
    s.cooldown = 40;
    const bag = 80 + Math.floor(Math.random() * 70);
    addCash(bag);
    bumpWanted(Math.max(player.wanted, 2));
    toast("ALARM  ·  +$" + bag);
    sfx("alarm");
    bang(0.35);
    emit(player.x, player.y, "#e23d3d", 12);
    const door = doorOf(s.b);
    tripAlarm(door.x, door.y);
    if (onClock && currentJob === "shop1" && s.b.label === "SLICE CO." && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
    if (onClock && currentJob === "shop2" && (s.b.label === "MART" || s.b.label === "POST")) {
      jobProg++;
      if (jobProg >= 2) {
        markers.length = 0;
        markers.push({ ...garageDropPoint(), kind: "drop" });
      }
    }
    if (onClock && currentJob === "finale" && s.b.label === "ARCADE" && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push({ x: MACK_POS.x, y: MACK_POS.y, kind: "mack" });
    }
    if (onClock && currentJob === "radio" && radioKind === "shop" && jobProg === 0) {
      jobProg = 1;
      markers.length = 0;
      markers.push({ ...garageDropPoint(), kind: "drop" });
    }
  }

  function advanceJob() {
    const j = JOBS[currentJob];
    if (currentJob === "radio") {
      addCash(radioPay);
      toast("JOB DONE  ·  +$" + radioPay);
      player.respect += 1;
      persist();
      clockOff();
      return;
    }
    if (j.pay) {
      addCash(j.pay);
      toast("JOB DONE  ·  +$" + j.pay);
      sfx("job");
      player.respect += 1;
    } else toast("MACK  ·  CITY'S YOURS");
    const idx = JOB_ORDER.indexOf(currentJob);
    const next = JOB_ORDER[idx + 1];
    clockOff();
    if (!next) {
      currentJob = "radio";
      toast("RADIO'S OPEN  ·  TAKE GIGS OR DON'T");
      persist();
      return;
    }
    currentJob = next;
    jobProg = 0;
    jobNeed = next === "shop2" ? 2 : 1;
    toast("OFF THE CLOCK  ·  SEE MACK FOR WORK");
    persist();
  }

  function startQueuedStory() {
    if (onClock) return;
    if (!JOB_ORDER.includes(currentJob)) {
      toast("RADIO'S OPEN");
      return;
    }
    onClock = true;
    radioOffer = null;
    armStory(currentJob);
    toast(JOBS[currentJob].short.toUpperCase());
    sfx("job");
  }

  function talkMack() {
    if (!onClock) {
      startQueuedStory();
      return;
    }
    if (currentJob === "meet") {
      advanceJob();
      return;
    }
    if (currentJob === "evade" && jobProg >= 1 && player.wanted === 0) {
      advanceJob();
      return;
    }
    if (currentJob === "finale" && jobProg >= 1 && player.wanted === 0) {
      advanceJob();
      return;
    }
    if (currentJob === "radio" && radioKind === "evade" && jobProg >= 1 && player.wanted === 0) {
      advanceJob();
      return;
    }
    if (["boost1", "boost2", "shop1", "shop2"].includes(currentJob)) {
      const sport = currentJob === "boost2";
      const carThere = currentJob.startsWith("boost") && carParkedInGarage(sport);
      if (carThere) {
        advanceJob();
        return;
      }
      const nearDrop = inGaragePark(player.x, player.y);
      if (nearDrop && jobProg >= (currentJob === "shop2" ? 2 : 1) && !currentJob.startsWith("boost")) {
        advanceJob();
        return;
      }
      if (currentJob.startsWith("boost") && nearDrop && !player.vehicle) toast("LEAVE THE CAR IN THE BAY");
    }
    toast("MACK  ·  " + jobLine(), 2400);
  }

  function layLow(msg: string) {
    if (player.wanted <= 0 && cops.every((c) => !c.alive)) return;
    setWanted(0);
    for (const c of cops) c.alive = false;
    cops.length = 0;
    player.unseen = 0;
    player.heatTimer = 0;
    hideClock = 0;
    toast(msg);
    sfx("spray");
    persist();
  }

  function usePaySpray() {
    if (!player.vehicle) {
      toast("DRIVE IN");
      return;
    }
    if (player.cash < 150) {
      toast("NEED $150");
      return;
    }
    addCash(-150);
    setWanted(0);
    cops.length = 0;
    player.vehicle.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    sprayLock = 2.4;
    toast("RESPRAY  ·  HEAT LOST");
    sfx("spray");
    persist();
  }

  function useChop() {
    const v = player.vehicle;
    if (!v) {
      toast("BRING A CAR");
      return;
    }
    const pay = Math.floor(v.value * 2.4);
    addCash(pay);
    v.taken = false;
    v.x = -400;
    v.y = -400;
    player.vehicle = null;
    toast("FENCED  ·  +$" + pay);
    sfx("cash");
    persist();
  }

  function useMotel() {
    persist();
    if (player.wanted > 0) setWanted(Math.max(0, player.wanted - 1));
    toast("SAVED  ·  LAYING LOW");
    sfx("job");
  }

  function tryAct() {
    if (!gameStarted || busted || screen !== "play") return;
    if (radioOffer) {
      acceptRadio();
      return;
    }
    const mack = peds.find((p) => p.kind === "mack");
    if (mack && dist(player.x, player.y, mack.x, mack.y) < 48) {
      talkMack();
      return;
    }
    for (const s of shops) {
      const b = s.b;
      const door = doorOf(b);
      if (dist(player.x, player.y, door.x, door.y) < 42 || circleRect(player.x, player.y, 16, b.x - 8, b.y - 8, b.w + 16, b.h + 24)) {
        robShop(s);
        return;
      }
    }
    if (!player.vehicle) {
      const v = nearestFreeCar(110);
      if (v) {
        enterCar(v);
        return;
      }
    }
    if (circleRect(player.x, player.y, 20, PAY_SPRAY.x - 8, PAY_SPRAY.y, PAY_SPRAY.w + 16, PAY_SPRAY.h + 28)) {
      usePaySpray();
      return;
    }
    if (circleRect(player.x, player.y, 20, CHOP_SHOP.x - 8, CHOP_SHOP.y, CHOP_SHOP.w + 16, CHOP_SHOP.h + 28)) {
      useChop();
      return;
    }
    if (circleRect(player.x, player.y, 20, MOTEL.x - 8, MOTEL.y, MOTEL.w + 16, MOTEL.h + 28)) {
      useMotel();
      return;
    }
    if (inGaragePark(player.x, player.y)) {
      if (player.wanted > 0) layLow("HIDDEN  ·  HEAT LOST");
      screen = "garage";
      return;
    }
  }

  function tryJack() {
    if (!gameStarted || busted || screen !== "play") return;
    if (player.vehicle) {
      exitCar();
      return;
    }
    const v = nearestFreeCar(80);
    if (v) enterCar(v);
    else toast("WALK ONTO THE CAR  ·  TAP E");
  }

  function persist() {
    const ride = player.vehicle
      ? { type: player.vehicle.type, color: player.vehicle.color, angle: player.vehicle.angle }
      : null;
    lastSavedAt = Date.now();
    const blob: SaveBlob = {
      version: 2,
      cash: player.cash,
      jobId: currentJob,
      jobProg,
      wanted: player.wanted,
      x: player.x,
      y: player.y,
      respect: player.respect,
      envelopes: envelopes.map((e) => e.taken),
      owned: parked.filter((p) => p.owned).map((p) => ({ type: p.type, color: p.color, x: p.x, y: p.y })),
      difficulty,
      hour,
      onClock,
      savedAt: lastSavedAt,
      heldJob: heldStory,
      ride,
    };
    writeSave(blob);
  }

  function restoreMarkers() {
    markers.length = 0;
    if (!onClock) return;
    if ((currentJob === "boost1" || currentJob === "boost2") && jobProg >= 1) {
      markers.push({ ...garageDropPoint(), kind: "drop" });
    } else if (currentJob === "boost2") {
      const sport = parked.find((c) => c.type === "sport" && !c.taken);
      if (sport) markers.push({ x: sport.x, y: sport.y, kind: "car" });
    } else if ((currentJob === "shop1" || currentJob === "shop2") && jobProg >= (currentJob === "shop2" ? 2 : 1)) {
      markers.push({ ...garageDropPoint(), kind: "drop" });
    } else if (currentJob === "shop1") {
      markers.push({ x: 665, y: 1850, kind: "shop" });
    } else if (currentJob === "taxi" && jobProg >= 1) {
      const drop = pierDropPoint();
      markers.push({ x: drop.x, y: drop.y, kind: "drop" });
    } else if (currentJob === "taxi") {
      const taxi = parked.find((c) => c.type === "taxi" && !c.taken);
      if (taxi) markers.push({ x: taxi.x, y: taxi.y, kind: "car" });
    } else {
      markers.push({ x: MACK_POS.x, y: MACK_POS.y, kind: "mack" });
    }
  }

  function applySave(s: SaveBlob) {
    player.cash = s.cash;
    player.x = s.x;
    player.y = s.y;
    player.respect = s.respect;
    currentJob = s.jobId;
    jobProg = s.jobProg;
    difficulty = s.difficulty;
    hour = s.hour;
    onClock = s.onClock ?? s.jobId === "meet";
    heldStory = s.heldJob ?? null;
    lastSavedAt = s.savedAt ?? 0;
    s.envelopes.forEach((t, i) => {
      if (envelopes[i]) envelopes[i].taken = t;
    });
    if (s.ride) {
      const v = makeCar(player.x, player.y, s.ride.type, s.ride.angle, {
        color: s.ride.color,
        hot: true,
        taken: true,
      });
      parked.push(v);
      player.vehicle = v;
      player.angle = v.angle;
    }
    setWanted(s.wanted);
    restoreMarkers();
  }

  function currentNav() {
    if (!onClock) return null;
    if (currentJob === "boost1" && jobProg === 0) {
      let best: Vehicle | null = null;
      let bd = Infinity;
      for (const v of parked) {
        if (v.taken) continue;
        const d = dist(player.x, player.y, v.x, v.y);
        if (d < bd) {
          bd = d;
          best = v;
        }
      }
      if (best) return { x: best.x, y: best.y };
    }
    if (currentJob === "boost2" && jobProg === 0) {
      const sport = parked.find((c) => c.type === "sport" && !c.taken);
      if (sport) return { x: sport.x, y: sport.y };
    }
    if (currentJob === "taxi" && (jobProg === 0 || !player.vehicle || player.vehicle.type !== "taxi")) {
      const taxi = parked.find((c) => c.type === "taxi" && !c.taken);
      if (taxi) return { x: taxi.x, y: taxi.y };
    }
    if (currentJob === "radio" && radioKind === "boost" && jobProg === 0 && markers[0]) return markers[0];
    if (currentJob === "radio" && radioKind === "courier" && markers.length >= 2) {
      return jobProg >= 1 ? markers[1] : markers[0];
    }
    if (markers.length === 0) return null;
    let best = markers[0];
    let bd = dist(player.x, player.y, best.x, best.y);
    for (let i = 1; i < markers.length; i++) {
      const d = dist(player.x, player.y, markers[i].x, markers[i].y);
      if (d < bd) {
        best = markers[i];
        bd = d;
      }
    }
    return best;
  }

  function copSteerTarget(c: Vehicle) {
    if (inGaragePark(player.x, player.y)) {
      return { x: GARAGE_DROP.x + GARAGE_DROP.w / 2, y: GARAGE_DROP.y + GARAGE_DROP.h + 48 };
    }
    const close = dist(c.x, c.y, player.x, player.y) < (difficulty === "beginner" ? 90 : 140);
    if (close) return { x: player.x, y: player.y };
    const gx = snapRoadX(player.x);
    const gy = snapRoadY(player.y);
    const v = onVertRoad(c.x);
    const h = onHorzRoad(c.y);
    if (!v && !h) {
      const dx = Math.abs((c.x % 400) - 48);
      const dy = Math.abs((c.y % 400) - 48);
      return dx <= dy ? { x: snapRoadX(c.x), y: c.y } : { x: c.x, y: snapRoadY(c.y) };
    }
    if (v && Math.abs(c.y - gy) > 28) return { x: snapRoadX(c.x), y: gy };
    if (h && Math.abs(c.x - gx) > 28) return { x: gx, y: snapRoadY(c.y) };
    return { x: gx, y: gy };
  }

  function ensureCops() {
    const easy = difficulty === "beginner";
    const cap = easy ? (player.wanted >= 5 ? 4 : 3) : player.wanted >= 5 ? 7 : 5;
    const need =
      player.wanted <= 0
        ? 0
        : player.wanted === 1
          ? 1
          : player.wanted === 2
            ? 2
            : player.wanted === 3
              ? easy
                ? 3
                : 4
              : player.wanted === 4
                ? easy
                  ? 3
                  : 5
                : cap;
    while (cops.filter((c) => c.alive && !c.block).length < need) spawnCop();
  }

  function syncRoadblocks() {
    if (player.wanted < 5) {
      for (const c of cops) if (c.block) c.alive = false;
      return;
    }
    const want = difficulty === "beginner" ? 2 : 3;
    const have = cops.filter((c) => c.block && c.alive);
    if (have.length >= want) return;
    const gx = snapRoadX(player.x);
    const gy = snapRoadY(player.y);
    const spots = [
      { x: gx + 400, y: gy, angle: Math.PI / 2 },
      { x: gx - 400, y: gy, angle: Math.PI / 2 },
      { x: gx, y: gy + 400, angle: 0 },
      { x: gx, y: gy - 400, angle: 0 },
    ];
    for (const s of spots) {
      if (cops.filter((c) => c.block && c.alive).length >= want) break;
      if (dist(s.x, s.y, player.x, player.y) < 120) continue;
      const v = makeCar(clamp(s.x, 80, WORLD.w - 80), clamp(s.y, 80, WORLD.h - 80), "cop", s.angle, {
        cop: true,
        block: true,
        color: "#cfd5dc",
        max: 0,
        acc: 0,
        turn: 0,
        alive: true,
        speed: 0,
      });
      cops.push(v);
    }
  }

  function spawnCop() {
    const heading = player.vehicle?.angle ?? player.angle;
    let ang = heading + Math.PI + (Math.random() - 0.5) * 0.7;
    if (player.wanted >= 3 && Math.random() < 0.45) {
      ang = heading + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 0.25);
    }
    const back = 340 + Math.random() * 160;
    let x = player.x + Math.cos(ang) * back;
    let y = player.y + Math.sin(ang) * back;
    const vs = viewSize();
    if (x > camera.x - 20 && x < camera.x + vs.w + 20 && y > camera.y - 20 && y < camera.y + vs.h + 20) {
      x = player.x + Math.cos(ang) * (back + 240);
      y = player.y + Math.sin(ang) * (back + 240);
    }
    x = snapRoadX(clamp(x, 40, WORLD.w - 40));
    y = snapRoadY(clamp(y, 40, WORLD.h - 40));
    const easy = difficulty === "beginner";
    const v = makeCar(x, y, "cop", Math.atan2(player.y - y, player.x - x), {
      cop: true,
      color: "#d8dde2",
      max: (easy ? 128 : 186) + player.wanted * (easy ? 10 : 18) + (player.wanted >= 3 ? 28 : 0),
      acc: (easy ? 160 : 240) + (player.wanted >= 3 ? 40 : 0),
      turn: easy ? 1.9 : 2.35,
      alive: true,
      speed: 90,
    });
    cops.push(v);
  }

  function spawnTraffic() {
    const types: CarType[] = ["compact", "sedan", "coupe", "van", "taxi"];
    for (let i = 0; i < 14; i++) {
      const vert = i % 2 === 0;
      const lane = (1 + (i % 10)) * 400 + 48;
      const along = 200 + i * 220;
      const x = vert ? lane : along;
      const y = vert ? along : lane;
      const t = makeCar(clamp(x, 80, WORLD.w - 80), clamp(y, 80, WORLD.h - 80), types[i % types.length], vert ? Math.PI / 2 : 0, {
        traffic: true,
        speed: 90 + (i % 5) * 12,
        dir: i % 2 === 0 ? 1 : -1,
      });
      traffic.push(t);
    }
  }

  function doBust() {
    if (busted) return;
    busted = true;
    screen = "bust";
    const fine = Math.min(player.cash, 80 + player.wanted * 40);
    player.cash -= fine;
    bustFine = fine;
    toast("ARRESTED");
    sfx("bust");
    bang(0.7);
    if (player.vehicle) {
      player.vehicle.taken = false;
      player.vehicle.speed = 0;
      player.vehicle = null;
    }
    cops.length = 0;
    setWanted(0);
    persist();
  }

  function respawn() {
    screen = "play";
    player.x = LOCKUP.x;
    player.y = LOCKUP.y;
    player.angle = 0;
    busted = false;
    toast("RELEASED");
  }

  function keysHas(code: string) {
    if (injectKeys) return injectKeys.has(code);
    return held.has(code) || virtualHeld.has(code);
  }

  function anyHeld(codes: readonly string[]) {
    for (const c of codes) if (keysHas(c)) return true;
    return false;
  }

  function hold(code: string, down: boolean) {
    if (down) {
      const fresh = !virtualHeld.has(code) && !held.has(code);
      virtualHeld.add(code);
      if (fresh) {
        if (code === "KeyE") edgeJack = true;
        if (code === "Space") edgeAct = true;
        if (code === "KeyM") edgeMap = true;
        if (code === "KeyR") edgeRadio = true;
        if (code === "KeyH") edgeHorn = true;
        if (code === "Escape" || code === "KeyP") edgePause = true;
      }
    } else {
      virtualHeld.delete(code);
    }
  }

  function inputVec() {
    let ix = 0;
    let iy = 0;
    if (anyHeld(MOVE_LEFT) || keysHas("Numpad1") || keysHas("Numpad7")) ix -= 1;
    if (anyHeld(MOVE_RIGHT) || keysHas("Numpad3") || keysHas("Numpad9")) ix += 1;
    if (anyHeld(MOVE_UP) || keysHas("Numpad7") || keysHas("Numpad9")) iy -= 1;
    if (anyHeld(MOVE_DOWN) || keysHas("Numpad1") || keysHas("Numpad3")) iy += 1;
    if (!injectKeys) {
      ix += stick.dx;
      iy += stick.dy;
      const pads = navigator.getGamepads?.() ?? [];
      for (const p of pads) {
        if (!p) continue;
        const ax = p.axes[0] ?? 0;
        const ay = p.axes[1] ?? 0;
        const m = Math.hypot(ax, ay);
        if (m > 0.18) {
          const sc = ((m - 0.18) / 0.82) / m;
          ix += ax * sc;
          iy += ay * sc;
        }
        if (p.buttons[12]?.pressed) iy -= 1;
        if (p.buttons[13]?.pressed) iy += 1;
        if (p.buttons[14]?.pressed) ix -= 1;
        if (p.buttons[15]?.pressed) ix += 1;
      }
    }
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    return { ix, iy, len: Math.min(1, len) };
  }

  function just(code: string) {
    return held.has(code) && !prevHeld.has(code);
  }

  function physics(dt: number) {
    if (!gameStarted || screen === "start") {
      prevHeld = new Set(held);
      return;
    }

    if (edgeMap) screen = screen === "map" ? "play" : "map";
    if (edgePause) screen = screen === "pause" ? "play" : "pause";
    if (just("KeyM")) screen = screen === "map" ? "play" : "map";
    if (just("Escape") || just("KeyP")) {
      if (screen === "garage" || screen === "map") screen = "play";
      else if (screen === "settings") screen = gameStarted ? "play" : "start";
      else if (screen === "pause") screen = "play";
      else if (screen === "play") screen = "pause";
    }
    if (edgeJack) tryJack();
    if (edgeAct) tryAct();
    if (edgeRadio) {
      if (radioOffer) skipRadio();
      else {
        radioLabel = cycleRadio();
        toast(radioLabel);
      }
    }
    if (edgeHorn) {
      sfx("horn");
      scarePeds(player.x, player.y, 220, 2.2);
    }
    edgeJack = edgeAct = edgeMap = edgePause = edgeRadio = edgeHorn = false;
    if (just("KeyR") && screen === "play") {
      if (radioOffer) skipRadio();
      else {
        radioLabel = cycleRadio();
        toast(radioLabel);
      }
    }
    if (just("KeyH") && screen === "play") sfx("horn");

    if (toastT > 0) toastT -= dt;
    else toastMsg = "";

    if (busted || screen === "pause" || screen === "garage" || screen === "map" || screen === "settings") {
      prevHeld = new Set(held);
      return;
    }
    if (sprayLock > 0) {
      sprayLock -= dt;
      prevHeld = new Set(held);
      return;
    }

    hour = (hour + dt / 20) % 24;
    if (alarm) {
      alarm.t -= dt;
      if (alarm.t <= 0) {
        for (let i = peds.length - 1; i >= 0; i--) if (peds[i].crowd) peds.splice(i, 1);
        alarm = null;
      }
    }
    for (const s of shops) if (s.cooldown > 0) s.cooldown -= dt;
    for (let i = skids.length - 1; i >= 0; i--) {
      skids[i].life -= dt;
      if (skids[i].life <= 0) skids.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    if (screen !== "play") {
      prevHeld = new Set(held);
      return;
    }

    const { ix, iy, len } = inputVec();
    if (player.vehicle) {
      const v = player.vehicle;
      const throttle = iy < -0.22 ? 1 : 0;
      const brake = iy > 0.32 ? 1 : 0;
      let steer = 0;
      if (injectSteer != null) steer = injectSteer;
      else {
        if (ix < -0.22) steer -= 1;
        if (ix > 0.22) steer += 1;
      }
      const handbrake = keysHas("ShiftLeft") || keysHas("ShiftRight");
      const feel = carFeel(v.type);
      if (rampCd > 0) rampCd -= dt;
      if (air > 0) air -= dt;
      if (spin > 0) {
        spin -= dt;
        v.angle += 6.2 * dt;
        v.speed *= Math.exp(-1.4 * dt);
      }
      if (throttle) v.speed = Math.min(v.max, v.speed + v.acc * dt);
      else v.speed *= Math.exp((feel.calm ? -2.05 : -1.65) * dt);
      if (brake) v.speed = Math.max(-v.max * 0.35, v.speed - v.acc * 1.4 * dt);
      if (!onRoad(player.x, player.y) && air <= 0) {
        v.speed *= Math.exp(-1.1 * dt);
        v.speed = clamp(v.speed, -v.max * 0.45, v.max * 0.62);
      }
      if (handbrake) v.speed *= Math.exp((v.type === "sport" ? -0.45 : -0.9) * dt);
      const t = Math.min(1, Math.abs(v.speed) / Math.max(60, v.max));
      const spdFactor = 1.08 - 0.58 * t * t;
      const turnMul = v.type === "van" ? 0.78 : 1;
      if (Math.abs(v.speed) > 8 && spin <= 0) {
        v.angle += steer * v.turn * turnMul * Math.sign(v.speed) * spdFactor * dt * (handbrake ? 1.45 : 1);
      }
      const slipTarget = steer * Math.min(1, Math.abs(v.speed) / 170) * feel.slide * (handbrake ? 1.35 : 1);
      v.slip += (slipTarget * 0.7 - v.slip) * Math.min(1, dt * (v.type === "sport" ? 2.6 : 5.5));
      v.slip = clamp(v.slip, -0.72, 0.72);
      if (Math.abs(steer) > 0.25 && Math.abs(v.speed) > 80) v.speed *= Math.exp(-feel.plant * 0.7 * dt);
      player.angle = v.angle;
      const ox = player.x;
      const oy = player.y;
      const head = v.angle - v.slip;
      player.x += Math.cos(head) * v.speed * dt;
      player.y += Math.sin(head) * v.speed * dt;
      if (air <= 0 && spin <= 0 && rampCd <= 0) {
        const onRamp =
          player.x > DOCK_RAMP.x &&
          player.x < DOCK_RAMP.x + DOCK_RAMP.w &&
          player.y > DOCK_RAMP.y &&
          player.y < DOCK_RAMP.y + DOCK_RAMP.h;
        if (onRamp) {
          rampCd = 1.5;
          const straight = Math.cos(v.angle) > 0.62 && v.speed > 200;
          if (straight) {
            air = 0.5;
            v.speed = Math.min(v.max * 1.05, v.speed * 1.08);
            addCash(40);
            toast("CLEARED  ·  +$40");
            bang(0.18);
            sfx("cash");
            if (onClock && currentJob === "radio" && radioKind === "jump" && v.type === "sport" && jobProg >= 1) advanceJob();
          } else if (Math.abs(v.speed) > 70) {
            spin = 0.6;
            v.speed *= 0.4;
            toast("SPIN OUT");
            bang(0.26);
          }
        }
      }
      if (air <= 0) {
        const body = { x: player.x, y: player.y, speed: v.speed, angle: v.angle };
        const hit = resolveSolid(body, 16);
        player.x = body.x;
        player.y = body.y;
        v.speed = body.speed;
        v.angle = body.angle;
        player.angle = v.angle;
        if (hit && Math.abs(v.speed) > 140) bang(0.1);
        const moved = Math.hypot(player.x - ox, player.y - oy);
        if (!hit && moved < Math.abs(v.speed) * dt * 0.4 && Math.abs(v.speed) > 80) {
          bang(0.22);
          v.speed *= 0.4;
          emit(player.x, player.y, "#c9a227", 6);
          sfx("hit");
        }
      }
      v.x = player.x;
      v.y = player.y;
      if (Math.abs(v.speed) > 150 || handbrake || Math.abs(v.slip) > 0.28) {
        skids.push({ x: player.x, y: player.y, a: head, life: v.type === "sport" ? 2.1 : 1.4 });
        if (skids.length > 90) skids.shift();
      }
    } else {
      if (len > 0.08) {
        player.x += ix * WALK * dt;
        player.y += iy * WALK * dt;
        player.angle = Math.atan2(iy, ix);
      }
      resolveSolid(player, player.r);
    }

    if (inGaragePark(player.x, player.y)) {
      const spd = player.vehicle ? Math.abs(player.vehicle.speed) : 0;
      if (spd < 100 && player.wanted > 0) {
        coolMeter += dt / 1.7;
        if (coolMeter >= 1) {
          coolMeter = 0;
          setWanted(player.wanted - 1);
          toast(player.wanted === 0 ? "HEAT LOST" : "COOLING  ·  " + player.wanted + " STAR");
        }
      }
    } else if (coolMeter > 0) coolMeter = Math.max(0, coolMeter - dt * 0.35);

    for (const p of peds) {
      if (p.down > 0) {
        p.down -= dt;
        if (p.down <= 0 && p.kind !== "mack") {
          p.panic = Math.max(p.panic, 2.4);
          p.wander = Math.atan2(p.y - player.y, p.x - player.x);
        }
        continue;
      }
      const d = dist(player.x, player.y, p.x, p.y);
      const spd = player.vehicle ? Math.abs(player.vehicle.speed) : len * WALK;
      if (p.kind !== "mack") {
        if (player.vehicle && spd > 118 && d < 190) {
          p.panic = Math.max(p.panic, 1.8 + Math.min(1.6, spd / 180));
          p.wander = Math.atan2(p.y - player.y, p.x - player.x);
        } else if (player.wanted > 0 && d < 120) {
          p.panic = Math.max(p.panic, 1.4);
          p.wander = Math.atan2(p.y - player.y, p.x - player.x);
        }
        if (alarm && dist(p.x, p.y, alarm.x, alarm.y) < 280) p.panic = Math.max(p.panic, 1.2);
      }
      if (p.panic > 0 && p.kind !== "mack") {
        p.panic -= dt;
        if (p.crowd && alarm) {
          const hx = p.homeX - p.x;
          const hy = p.homeY - p.y;
          const hd = Math.hypot(hx, hy) || 1;
          if (hd > 30) {
            p.x += (hx / hd) * 86 * dt;
            p.y += (hy / hd) * 86 * dt;
            p.wander = Math.atan2(hy, hx);
          } else {
            p.wander += dt * 2.4;
            p.x += Math.cos(p.wander) * 18 * dt;
            p.y += Math.sin(p.wander) * 18 * dt;
          }
        } else {
          const run = 124;
          p.x += Math.cos(p.wander) * run * dt;
          p.y += Math.sin(p.wander) * run * dt;
        }
      } else {
        p.wander += dt * 0.6;
        p.x += Math.cos(p.wander) * 14 * dt;
        p.y += Math.sin(p.wander * 0.8) * 14 * dt;
        p.x += (p.homeX - p.x) * 0.5 * dt;
        p.y += (p.homeY - p.y) * 0.5 * dt;
      }
      resolveSolid(p, p.r);
      const hitR = player.vehicle ? 20 : 12;
      if (d < hitR && spd > 70 && p.kind !== "mack") {
        p.down = 1.4;
        p.panic = 0;
        bumpWanted(Math.max(player.wanted, 1));
        spoilFare(true);
        bang(0.12);
        scarePeds(p.x, p.y, 150, 2.2);
      }
    }

    for (const t of traffic) {
      if (!t.alive) continue;
      const d = dist(t.x, t.y, player.x, player.y);
      const pSpd = player.vehicle ? Math.abs(player.vehicle.speed) : 0;
      if (player.vehicle && pSpd > 95 && d < 260) {
        const fx = Math.cos(player.angle);
        const fy = Math.sin(player.angle);
        const rx = t.x - player.x;
        const ry = t.y - player.y;
        const ahead = rx * fx + ry * fy;
        const side = rx * -fy + ry * fx;
        if (ahead > 8 && ahead < 300 && Math.abs(side) < 78) {
          t.panic = Math.max(t.panic, 1.5);
          t.angle += Math.sign(side || 1) * 2.1 * dt;
        }
      }
      for (const o of traffic) {
        if (o === t || !o.alive) continue;
        if (dist(t.x, t.y, o.x, o.y) < 36 && (o.panic > 0.3 || t.panic > 0.3)) {
          t.panic = Math.max(t.panic, 1.8);
          break;
        }
      }
      if (onVertRoad(t.x)) {
        t.angle += (((t.dir > 0 ? Math.PI / 2 : -Math.PI / 2) - t.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.08;
      } else if (onHorzRoad(t.y)) {
        t.angle += (((t.dir > 0 ? 0 : Math.PI) - t.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.08;
      } else {
        t.x += (snapRoadX(t.x) - t.x) * 2 * dt;
        t.y += (snapRoadY(t.y) - t.y) * 2 * dt;
      }
      if (Math.abs((t.x % 400) - 48) < 10 && Math.abs((t.y % 400) - 48) < 10 && Math.random() < 0.01) t.dir *= -1;
      if (t.panic > 0) t.panic -= dt;
      const want =
        t.panic > 0 ? 16 : player.wanted > 0 && d < 140 ? 40 : t.max * 0.45;
      t.speed += (want - t.speed) * 2 * dt;
      t.x += Math.cos(t.angle) * t.speed * dt;
      t.y += Math.sin(t.angle) * t.speed * dt;
      resolveSolid(t, 14);
      if (player.vehicle && d < 28 && pSpd > 90) {
        const feel = carFeel(player.vehicle.type);
        const shove = feel.shove > 0.6;
        t.panic = Math.max(t.panic, shove ? 2.2 : 2.6);
        if (shove) {
          t.x += Math.cos(player.angle) * 22;
          t.y += Math.sin(player.angle) * 22;
          t.speed = Math.max(40, pSpd * 0.35);
          player.vehicle.speed *= 0.97;
        } else {
          t.speed *= 0.2;
          player.vehicle.speed *= 0.85;
        }
        bang(shove ? 0.12 : 0.2);
        if (!(feel.calm && pSpd < 170)) bumpWanted(Math.max(player.wanted, 1));
        spoilFare(!(feel.calm && pSpd < 170));
        scarePeds(t.x, t.y, 160, 2);
        emit(t.x, t.y, "#c9a227", shove ? 4 : 8);
      }
    }

    let pinning = false;
    if (player.wanted <= 0) {
      for (const c of cops) c.alive = false;
    } else {
      ensureCops();
      syncRoadblocks();
      let seen = false;
      const hiding = inGaragePark(player.x, player.y);
      for (const c of cops) {
        if (!c.alive) continue;
        const d = dist(c.x, c.y, player.x, player.y);
        if (c.block) {
          c.speed = 0;
          if (d < 560) seen = true;
          const catchR = player.vehicle ? 38 : 44;
          const playerSpd = player.vehicle ? Math.abs(player.vehicle.speed) : 0;
          const grab = !hiding && d < catchR && playerSpd < 80;
          if (grab) {
            c.pin += dt;
            pinning = true;
            if (c.pin >= 0.35) doBust();
          } else c.pin = Math.max(0, c.pin - dt * 2);
          continue;
        }
        const tgt = copSteerTarget(c);
        const ang = Math.atan2(tgt.y - c.y, tgt.x - c.x);
        let da = ang - c.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        c.angle += clamp(da, -c.turn * dt, c.turn * dt);
        const wantSpd = hiding ? 64 : d < 130 ? Math.min(c.max, 46 + d * 0.9) : c.max;
        if (c.speed < wantSpd) c.speed = Math.min(wantSpd, c.speed + c.acc * dt);
        else c.speed += (wantSpd - c.speed) * 4 * dt;
        c.x += Math.cos(c.angle) * c.speed * dt;
        c.y += Math.sin(c.angle) * c.speed * dt;
        resolveSolid(c, 14);
        if (d < 560) seen = true;
        const catchR = player.vehicle ? 38 : 44;
        const playerSpd = player.vehicle ? Math.abs(player.vehicle.speed) : 0;
        const grab = !hiding && d < catchR && playerSpd < 100;
        if (grab) {
          c.pin += dt;
          pinning = true;
          const need = player.vehicle ? (player.wanted >= 3 ? 0.38 : 0.52) : 0.2;
          if (c.pin >= need) doBust();
        } else c.pin = Math.max(0, c.pin - dt * 2);
        if (player.vehicle && d < 30 && playerSpd > 130) {
          c.speed *= 0.25;
          player.vehicle.speed *= 0.82;
          bumpWanted(Math.min(5, player.wanted + 1));
          spoilFare(true);
          bang(0.3);
          emit(c.x, c.y, "#e23d3d", 10);
        }
      }
      if (seen) {
        player.unseen = 0;
        player.heatTimer = Math.max(player.heatTimer, 3);
      } else player.unseen += dt;
      player.heatTimer -= dt;
      if (player.unseen > 6 && player.heatTimer <= 0 && player.wanted > 0) {
        setWanted(player.wanted - 1);
        player.unseen = 2.2;
        toast(player.wanted === 0 ? "HEAT LOST" : "COOLING  ·  " + player.wanted);
      }
    }

    if (onClock && currentJob === "evade" && player.wanted >= 2 && jobProg === 0) {
      jobProg = 1;
      toast("NOW GO COLD  ·  BACK TO MACK");
      markers.length = 0;
      markers.push({ x: MACK_POS.x, y: MACK_POS.y, kind: "mack" });
    }
    if (onClock && currentJob === "radio" && radioKind === "evade" && player.wanted >= 2 && jobProg === 0) {
      jobProg = 1;
      toast("NOW GO COLD  ·  BACK TO MACK");
    }
    if (onClock && currentJob === "taxi" && jobProg >= 1) {
      if (
        inPierDrop(player.x, player.y) &&
        player.vehicle &&
        player.vehicle.type === "taxi" &&
        Math.abs(player.vehicle.speed) < 110
      )
        advanceJob();
    }
    if (onClock && (["boost1", "boost2", "shop1", "shop2"].includes(currentJob) || (currentJob === "radio" && (radioKind === "boost" || radioKind === "shop")))) {
      const need = currentJob === "shop2" ? 2 : 1;
      const sport = currentJob === "boost2";
      const isBoost = currentJob.startsWith("boost") || radioKind === "boost";
      if (isBoost && carParkedInGarage(sport)) advanceJob();
      else if (!isBoost && jobProg >= need && inGaragePark(player.x, player.y)) advanceJob();
    }
    if (onClock && currentJob === "radio" && radioKind === "haul" && jobProg >= 1) {
      const vanIn = [player.vehicle, ...parked].some(
        (v) => v && v.type === "van" && v.hot && Math.abs(v.speed) < 130 && inGaragePark(v.x, v.y),
      );
      if (vanIn) advanceJob();
    }
    if (onClock && currentJob === "radio" && radioKind === "fare" && markers[0]) {
      const slow = Math.abs(player.vehicle?.speed ?? 0) < 120;
      if (jobProg === 0 && player.vehicle && slow && dist(player.x, player.y, markers[0].x, markers[0].y) < 52) {
        jobProg = 1;
        fareRiding = true;
        if (farePed) {
          const i = peds.indexOf(farePed);
          if (i >= 0) peds.splice(i, 1);
          farePed = null;
        }
        const drop = pierDropPoint();
        markers.length = 0;
        markers.push({ x: drop.x, y: drop.y, kind: "drop" });
        toast("FARE IN  ·  PIER");
      }
      if (jobProg >= 1 && inPierDrop(player.x, player.y) && player.vehicle && Math.abs(player.vehicle.speed) < 110) {
        const drop = pierDropPoint();
        peds.push({
          x: drop.x,
          y: drop.y + 30,
          homeX: drop.x,
          homeY: drop.y + 30,
          kind: "civ",
          color: "#e8c547",
          wander: 0,
          r: 8,
          down: 0,
          panic: 0,
          crowd: false,
        });
        fareRiding = false;
        advanceJob();
      }
    }
    if (onClock && currentJob === "radio" && radioKind === "courier" && markers.length >= 2) {
      if (jobProg === 0 && dist(player.x, player.y, markers[0].x, markers[0].y) < 40) {
        jobProg = 1;
        toast("PACKAGE  ·  MOVE");
      }
      if (jobProg >= 1 && dist(player.x, player.y, markers[1].x, markers[1].y) < 48) advanceJob();
    }
    if (onClock && currentJob === "radio" && radioKind === "sprint") {
      radioClock -= dt;
      if (radioClock <= 0) {
        toast("TOO SLOW");
        clockOff();
      } else if (markers[0] && dist(player.x, player.y, markers[0].x, markers[0].y) < 50) advanceJob();
    }

    if (!onClock && !radioOffer && screen === "play") {
      radioOfferIn -= dt;
      if (radioOfferIn <= 0) beginRadioOffer();
    }

    for (const e of envelopes) {
      if (!e.taken && dist(player.x, player.y, e.x, e.y) < 22) {
        e.taken = true;
        addCash(50);
        player.respect += 1;
        toast("ENVELOPE  ·  +$50");
        persist();
      }
    }

    trauma = Math.max(0, trauma - dt * 1.6);
    const sh = trauma * trauma;
    camera.shakeX = (Math.random() * 2 - 1) * sh * 14;
    camera.shakeY = (Math.random() * 2 - 1) * sh * 14;

    const vs = viewSize();
    const look = player.vehicle ? Math.abs(player.vehicle.speed) * 0.34 : 0;
    const tx = player.x + Math.cos(player.angle) * look - vs.w / 2;
    const ty = player.y + Math.sin(player.angle) * look - vs.h / 2;
    const k = 1 - Math.exp(-5.2 * dt);
    camera.x += (tx - camera.x) * k;
    camera.y += (ty - camera.y) * k;
    camera.x = clamp(camera.x, 0, Math.max(0, WORLD.w - vs.w));
    camera.y = clamp(camera.y, 0, Math.max(0, WORLD.h - vs.h));

    const car = !player.vehicle && nearestFreeCar(70);
    const mack = peds.find((p) => p.kind === "mack");
    const nearMack = mack && dist(player.x, player.y, mack.x, mack.y) < 48;
    let shopNear = false;
    for (const s of shops) {
      const b = s.b;
      if (dist(player.x, player.y, b.x + b.w / 2, b.y + b.h + 8) < 42) shopNear = true;
    }
    if (car) hint = "E / JACK  boost this car";
    else if (radioOffer) hint = "ACT take radio job  ·  R skip";
    else if (nearMack) hint = onClock ? "SPACE / ACT  talk to Mack" : "SPACE / ACT  take Mack's job";
    else if (shopNear) hint = "SPACE / ACT  hit the register";
    else if (circleRect(player.x, player.y, 20, PAY_SPRAY.x, PAY_SPRAY.y, PAY_SPRAY.w, PAY_SPRAY.h + 20))
      hint = "SPACE  Pay 'n' Spray  $150";
    else if (currentJob === "taxi" && jobProg >= 1 && player.vehicle?.type === "taxi" && inPierDrop(player.x, player.y))
      hint = Math.abs(player.vehicle.speed) < 110 ? "DROP  ·  hold still" : "SLOW DOWN  ·  park on DROP";
    else if (currentJob === "radio" && radioKind === "fare" && jobProg >= 1 && inPierDrop(player.x, player.y))
      hint = player.vehicle && Math.abs(player.vehicle.speed) < 110 ? "DROP THE FARE" : "SLOW DOWN  ·  drop the fare";
    else if (currentJob === "radio" && radioKind === "fare" && jobProg === 0 && markers[0] && dist(player.x, player.y, markers[0].x, markers[0].y) < 80)
      hint = player.vehicle ? "STOP FOR THE FARE" : "GET IN A CAR";
    else if (circleRect(player.x, player.y, 20, CHOP_SHOP.x, CHOP_SHOP.y, CHOP_SHOP.w, CHOP_SHOP.h + 20))
      hint = "SPACE  fence this car";
    else if (circleRect(player.x, player.y, 20, MOTEL.x, MOTEL.y, MOTEL.w, MOTEL.h + 20)) hint = "SPACE  save at the motel";
    else if (inGaragePark(player.x, player.y))
      hint =
        player.vehicle && Math.abs(player.vehicle.speed) >= 120
          ? "SLOW DOWN  ·  PARK IN THE BAY"
          : player.wanted > 0
            ? "SLOW DOWN  ·  hide in the garage"
            : "INSIDE  ·  SPACE garage";
    else if (
      player.vehicle &&
      player.x > DOCK_RAMP.x - 80 &&
      player.x < DOCK_RAMP.x + DOCK_RAMP.w + 40 &&
      player.y > DOCK_RAMP.y - 30 &&
      player.y < DOCK_RAMP.y + DOCK_RAMP.h + 30
    )
      hint = "RAMP  ·  east, fast, and straight";
    else if (pinning) hint = player.vehicle ? "THEY'RE BOXING YOU  ·  HIT THE GAS" : "THEY'RE ON YOU  ·  RUN";
    else if (player.vehicle) hint = "E bail  ·  SHIFT slide  ·  H horn  ·  R radio";
    else hint = "";

    prevHeld = new Set(held);
  }

  function snapshot(): HudSnapshot {
    const mph = player.vehicle ? Math.abs(player.vehicle.speed) * 0.22 : 0;
    const nav = currentNav();
    return {
      cash: Math.floor(player.cash),
      vehicle: player.vehicle ? player.vehicle.name : "ON FOOT",
      wanted: player.wanted,
      jobId: currentJob,
      jobText: jobLine(),
      toast: toastT > 0 ? toastMsg : "",
      hint,
      speed: mph,
      heat: player.heatTimer,
      heatPct: player.wanted <= 0 ? 0 : coolMeter > 0.02 && inGaragePark(player.x, player.y) ? Math.round(coolMeter * 100) : Math.round((player.heatTimer / (8 + player.wanted * 4)) * 100),
      cooling: player.wanted > 0 && inGaragePark(player.x, player.y) && (!player.vehicle || Math.abs(player.vehicle.speed) < 100),
      saveNote: lastSavedAt
        ? "Saved " + new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "",
      hour,
      district: districtAt(player.x, player.y),
      envelopes: envelopes.filter((e) => e.taken).length,
      envelopesTotal: envelopes.length,
      radioName: radioLabel,
      paused: screen === "pause" || screen === "settings",
      screen,
      bustDetail: bustFine ? `Arrested. They kept $${bustFine}. Walk from lockup.` : "Arrested. Walk from lockup.",
      respect: player.respect,
      hasSave: hasSave(),
      ownedCount: parked.filter((p) => p.owned).length,
      shake: settings.shake,
      muted: settings.muted,
      music: settings.music,
      navDist: nav ? Math.max(0, Math.round(dist(player.x, player.y, nav.x, nav.y) / 8)) : null,
      navAngle: nav ? Math.atan2(nav.y - player.y, nav.x - player.x) : 0,
      jobLabel: jobLabel(),
      onClock,
      mackNext: mackNextLine(),
    };
  }

  function drawFrame(now: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vs = viewSize();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, vs.w, vs.h);
    ctx.clip();
    ctx.translate(-camera.x + camera.shakeX, -camera.y + camera.shakeY);
    const state: DrawState = {
      buildings,
      parks,
      parked,
      cops,
      traffic,
      peds,
      markers,
      envelopes,
      props,
      skids,
      particles,
      player,
      camera,
      hour,
      vs,
      nav: currentNav(),
      lift: air,
      fare: fareRiding,
    };
    drawWorld(ctx, state, assets);
    drawActors(ctx, state, now);
    ctx.restore();
    if (player.wanted > 0 && gameStarted && !busted && screen === "play") {
      const g = ctx.createRadialGradient(vs.w / 2, vs.h / 2, vs.w * 0.35, vs.w / 2, vs.h / 2, vs.w * 0.72);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(180,30,30," + (0.12 + player.wanted * 0.05) + ")");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vs.w, vs.h);
    }
    if (gameStarted && screen !== "map" && screen !== "start") {
      drawMinimap(ctx, state, vs, now);
      if (screen === "play") drawHudNav(ctx, state, vs, now);
    }
    if (screen === "map") drawMapOverlay(ctx, state, vs);
  }

  function frame(t: number) {
    if (!running) return;
    const dt = Math.min(0.1, (t - lastTime) / 1000);
    lastTime = t;
    acc += dt;
    while (acc >= STEP) {
      physics(STEP);
      acc -= STEP;
    }
    if (gameStarted && screen === "play") {
      tickMusic(dt);
      tickSiren(t);
      updateEngine(player.vehicle?.speed ?? 0, player.vehicle?.max ?? 1, !!player.vehicle);
    }
    drawFrame(t);
    if (t - lastHud > 80) {
      lastHud = t;
      onHud(snapshot());
    }
    raf = requestAnimationFrame(frame);
  }

  function clockIn(mode: Difficulty, fromSave = false) {
    if (!settings.muted) {
      unlockAudio();
      startEngineLoop();
    }
    setMuted(settings.muted);
    setMusicOn(settings.music);
    difficulty = mode;
    gameStarted = true;
    screen = "play";
    if (fromSave) {
      const s = loadSave();
      if (s) applySave(s);
    } else {
      onClock = true;
      markers.length = 0;
      markers.push({ x: MACK_POS.x, y: MACK_POS.y, kind: "mack" });
    }
    toast(fromSave ? "BACK IN THE CITY" : mode === "beginner" ? "BEGINNER" : "EXPERIENCED");
    canvas.focus({ preventScroll: true });
    onHud(snapshot());
  }

  function buyCar(type: CarType) {
    const item = CATALOG.find((c) => c.type === type);
    if (!item) return;
    if (player.cash < item.price) {
      toast("NOT ENOUGH");
      return;
    }
    addCash(-item.price);
    const v = makeCar(GARAGE_DROP.x + 40 + Math.random() * 120, GARAGE_DROP.y + 30, type, 0, { owned: true });
    parked.push(v);
    toast("KEYS  ·  " + v.name);
    sfx("job");
    persist();
  }

  function paintCar() {
    if (!player.vehicle) {
      toast("GET IN A CAR");
      return;
    }
    if (player.cash < 80) {
      toast("NEED $80");
      return;
    }
    addCash(-80);
    player.vehicle.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    toast("FRESH COAT");
    persist();
  }

  function onKeyDown(e: KeyboardEvent) {
    const code = e.code || "";
    const arrow =
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      NUMPAD_MOVE.has(code);
    if (arrow || code === "Space" || e.key === " ") e.preventDefault();
    const mapped =
      code ||
      ({ ArrowUp: "ArrowUp", ArrowDown: "ArrowDown", ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight" }[e.key] ?? "");
    if (mapped) held.add(mapped);
    if (e.repeat) return;
    if (code === "KeyE") edgeJack = true;
    if (code === "Space" || code === "NumpadEnter") edgeAct = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    held.delete(e.code);
    if (e.key === "ArrowUp") held.delete("ArrowUp");
    if (e.key === "ArrowDown") held.delete("ArrowDown");
    if (e.key === "ArrowLeft") held.delete("ArrowLeft");
    if (e.key === "ArrowRight") held.delete("ArrowRight");
  }
  function onBlur() {
    held.clear();
    virtualHeld.clear();
  }

  const onResize = () => resize();
  const onCanvasPointer = () => canvas.focus({ preventScroll: true });

  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Ridge City");
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", onResize);
  canvas.addEventListener("pointerdown", onCanvasPointer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) persist();
    else resumeAudio();
    if (document.hidden) {
      held.clear();
      virtualHeld.clear();
    }
  });

  resize();
  spawnTraffic();
  void loadAssets(ctx).then((a) => {
    assets = a;
  });

  window.__controlsTest = {
    getYaw: () => -player.angle,
    getSpeed: () =>
      player.vehicle ? Math.abs(player.vehicle.speed) : anyHeld(MOVE_UP) ? WALK : 0,
    setSteer: (v) => {
      injectSteer = v;
    },
    setKeys: (codes) => {
      injectKeys = new Set(codes);
      if (codes.length === 0) {
        injectKeys = null;
        injectSteer = null;
      }
    },
  };
  window.__ridgeCity = {
    getState: snapshot,
    jack: () => {
      edgeJack = true;
    },
    act: () => {
      edgeAct = true;
    },
    warp: (x: number, y: number, angle?: number) => {
      player.x = x;
      player.y = y;
      if (angle != null) player.angle = angle;
      if (player.vehicle) {
        player.vehicle.x = x;
        player.vehicle.y = y;
        if (angle != null) player.vehicle.angle = angle;
      }
    },
    startTaxiDrop: () => {
      currentJob = "taxi";
      jobProg = 1;
      const drop = pierDropPoint();
      markers.length = 0;
      markers.push({ x: drop.x, y: drop.y, kind: "drop" });
    },
    forceRadio: (kind: RadioKind) => {
      onClock = false;
      radioOffer = kind;
      radioPay = radioPrice(kind);
      if (kind !== "fare") clearFarePed();
      fillRadioMarkers(kind);
    },
    setWanted,
    placeCop: () => {
      ensureCops();
      let c = cops.find((v) => v.alive);
      if (!c) {
        spawnCop();
        c = cops[cops.length - 1];
      }
      if (!c) return;
      c.alive = true;
      c.x = player.x + 8;
      c.y = player.y;
      c.speed = 20;
      c.pin = 0;
    },
    hold,
  };

  raf = requestAnimationFrame(frame);

  const api = {
    start: (mode: Difficulty) => clockIn(mode, false),
    continue: () => clockIn(loadSave()?.difficulty ?? "beginner", true),
    respawn,
    pause: () => {
      if (screen === "pause" || screen === "settings") screen = gameStarted ? "play" : "start";
      else if (screen === "play") screen = "pause";
      onHud(snapshot());
    },
    openSettings: () => {
      if (screen === "settings" || screen === "pause") screen = gameStarted ? "play" : "start";
      else if (screen === "start") screen = "settings";
      else if (screen === "play") screen = "pause";
      onHud(snapshot());
    },
    closeOverlay: () => {
      if (screen === "map" || screen === "garage" || screen === "pause" || screen === "settings")
        screen = gameStarted ? "play" : "start";
      onHud(snapshot());
    },
    buyCar,
    paintCar,
    saveGame: () => {
      if (!gameStarted) return;
      persist();
      toast("GAME SAVED");
      onHud(snapshot());
    },
    setStick: (dx: number, dy: number, active: boolean) => {
      stick.dx = dx;
      stick.dy = dy;
      stick.active = active;
    },
    hold,
    jack: () => {
      edgeJack = true;
    },
    act: () => {
      edgeAct = true;
    },
    toggleMap: () => {
      edgeMap = true;
    },
    horn: () => {
      edgeHorn = true;
    },
    setShake: (v: boolean) => {
      settings.shake = v;
      writeSettings(settings);
    },
    setMuted: (v: boolean) => {
      settings.muted = v;
      if (!v) {
        unlockAudio();
        startEngineLoop();
      }
      setMuted(v);
      setMusicOn(settings.music);
      writeSettings(settings);
      onHud(snapshot());
    },
    setMusic: (v: boolean) => {
      settings.music = v;
      if (v && !settings.muted) {
        unlockAudio();
        startEngineLoop();
      }
      setMusicOn(v);
      writeSettings(settings);
      onHud(snapshot());
    },
    catalog: CATALOG,
    carStats,
    snapshot,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onCanvasPointer);
      destroyAudio();
      delete window.__controlsTest;
    },
  };

  const qa = new URLSearchParams(window.location.search);
  if (qa.get("qa") === "1") clockIn("beginner", false);

  onHud(snapshot());
  return api;
}

export type GameApi = ReturnType<typeof createGame>;
