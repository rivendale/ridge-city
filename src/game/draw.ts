import type {
  Building,
  Envelope,
  Marker,
  Particle,
  Ped,
  Prop,
  Skid,
  Vehicle,
} from "./types";
import { CHOP_SHOP, DISTRICTS, DOCK_RAMP, GARAGE_BAY, GARAGE_DROP, MOTEL, PAY_SPRAY, PIER_DROP, ROAD, STEP, WORLD, hash, inGaragePark } from "./world";

export interface DrawState {
  buildings: Building[];
  parks: { x: number; y: number; w: number; h: number }[];
  parked: Vehicle[];
  cops: Vehicle[];
  traffic: Vehicle[];
  peds: Ped[];
  markers: Marker[];
  envelopes: Envelope[];
  props: Prop[];
  skids: Skid[];
  particles: Particle[];
  player: { x: number; y: number; angle: number; vehicle: Vehicle | null; wanted: number };
  camera: { x: number; y: number; shakeX: number; shakeY: number };
  hour: number;
  vs: { w: number; h: number };
  nav: { x: number; y: number } | null;
  lift: number;
  fare: boolean;
}

const PROP_SRC = [
  import.meta.env.BASE_URL + "game/props/prop-1.png",
  import.meta.env.BASE_URL + "game/props/prop-2.png",
  import.meta.env.BASE_URL + "game/props/prop-3.png",
  import.meta.env.BASE_URL + "game/props/prop-4.png",
  import.meta.env.BASE_URL + "game/props/prop-5.png",
  import.meta.env.BASE_URL + "game/props/prop-6.png",
  import.meta.env.BASE_URL + "game/props/prop-7.png",
  import.meta.env.BASE_URL + "game/props/prop-8.png",
  import.meta.env.BASE_URL + "game/props/prop-9.png",
];

export interface Assets {
  asphalt: CanvasPattern | null;
  grass: CanvasPattern | null;
  water: CanvasPattern | null;
  props: HTMLImageElement[];
  ready: boolean;
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadAssets(ctx: CanvasRenderingContext2D): Promise<Assets> {
  const assets: Assets = { asphalt: null, grass: null, water: null, props: [], ready: false };
  try {
    const [asphalt, grass, water, ...props] = await Promise.all([
      loadImg(import.meta.env.BASE_URL + "game/asphalt.jpg"),
      loadImg(import.meta.env.BASE_URL + "game/grass.jpg"),
      loadImg(import.meta.env.BASE_URL + "game/water.jpg"),
      ...PROP_SRC.map((s) => loadImg(s)),
    ]);
    assets.asphalt = ctx.createPattern(asphalt, "repeat");
    assets.grass = ctx.createPattern(grass, "repeat");
    assets.water = ctx.createPattern(water, "repeat");
    assets.props = props;
    assets.ready = true;
  } catch {
    assets.ready = false;
  }
  return assets;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function drawCar(ctx: CanvasRenderingContext2D, c: Vehicle, siren: boolean, now: number) {
  const w = c.w;
  const h = c.h;
  const type = c.type;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(1.5, 2.5, w * 0.48, h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  const rad = type === "sport" ? 4.2 : type === "van" ? 2.2 : 3;
  const ww = Math.max(5.5, w * 0.2);
  const wh = 3.4;
  ctx.fillStyle = "#141618";
  ctx.fillRect(-w * 0.34, -h / 2 - 1.4, ww, wh);
  ctx.fillRect(w * 0.12, -h / 2 - 1.4, ww, wh);
  ctx.fillRect(-w * 0.34, h / 2 - 2, ww, wh);
  ctx.fillRect(w * 0.12, h / 2 - 2, ww, wh);
  ctx.fillStyle = c.color;
  rr(ctx, -w / 2, -h / 2, w, h, rad);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(-w / 2, 0.4, w, h / 2 - 0.4);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  rr(ctx, -w / 2, -h / 2, w, h, rad);
  ctx.stroke();
  const cabinW = type === "van" ? w * 0.46 : type === "sport" ? w * 0.34 : type === "compact" ? w * 0.32 : w * 0.36;
  const cabinX = type === "van" ? -w * 0.04 : type === "sport" ? w * 0.02 : -w * 0.04;
  ctx.fillStyle = "rgba(48, 68, 86, 0.92)";
  rr(ctx, cabinX - cabinW / 2, -h / 2 + 2.2, cabinW, h - 4.4, 1.8);
  ctx.fill();
  ctx.fillStyle = "rgba(210, 228, 240, 0.22)";
  ctx.fillRect(cabinX - cabinW / 2 + 1, -h / 2 + 2.2, Math.max(3, cabinW * 0.32), h - 4.4);
  ctx.fillStyle = "#efe4b4";
  ctx.fillRect(w / 2 - 3.2, -h / 2 + 1.8, 3.2, 3.4);
  ctx.fillRect(w / 2 - 3.2, h / 2 - 5.2, 3.2, 3.4);
  ctx.fillStyle = "#b83a32";
  ctx.fillRect(-w / 2, -h / 2 + 1.8, 2.4, 3.4);
  ctx.fillRect(-w / 2, h / 2 - 5.2, 2.4, 3.4);
  if (c.panic > 0 && c.traffic) {
    ctx.fillStyle = "#ff4a3a";
    ctx.fillRect(-w / 2 - 1.2, -h / 2 + 1.4, 4, 4.2);
    ctx.fillRect(-w / 2 - 1.2, h / 2 - 5.6, 4, 4.2);
  }
  if (type === "taxi") {
    ctx.fillStyle = "#161616";
    ctx.fillRect(-5, -h / 2 - 3.8, 10, 4);
    ctx.fillStyle = "#e8c547";
    ctx.fillRect(-4, -h / 2 - 3.2, 8, 2.6);
  }
  if (type === "sport") {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(-w / 2 + 3, -1, w - 8, 2);
  }
  if (type === "van") {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, 6, h - 6);
  }
  if (siren || type === "cop") {
    const on = Math.sin(now / 85) > 0;
    ctx.fillStyle = "#1a2026";
    ctx.fillRect(-7, -h / 2 - 4.4, 14, 4.4);
    ctx.fillStyle = on ? "#e23d3d" : "#2c4fd6";
    ctx.fillRect(-6.4, -h / 2 - 3.8, 6, 3.2);
    ctx.fillStyle = on ? "#2c4fd6" : "#e23d3d";
    ctx.fillRect(0.4, -h / 2 - 3.8, 6, 3.2);
  }
  ctx.restore();
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
  kind: string,
  down: number,
) {
  ctx.save();
  ctx.translate(x, y);
  if (down > 0) ctx.rotate(1.15);
  else ctx.rotate(angle || 0);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(2, 6, 7, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === "player") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(-8, -5, 16, 14);
    ctx.fillStyle = "#d97a32";
    ctx.fillRect(-7, -4, 14, 12);
    ctx.fillStyle = "#d9c39a";
    ctx.beginPath();
    ctx.arc(0, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(-5, -3, 10, 9);
  ctx.fillStyle = kind === "mack" ? "#d9c39a" : "#d7c4a6";
  ctx.beginPath();
  ctx.arc(0, -6, 4.2, 0, Math.PI * 2);
  ctx.fill();
  if (kind === "mack") {
    ctx.fillStyle = "#1e2a28";
    ctx.fillRect(-6, -9, 12, 3);
    ctx.fillStyle = "#d97a32";
    ctx.fillRect(-5, -2, 10, 6);
    ctx.restore();
    ctx.font = "700 10px IBM Plex Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8edf2";
    ctx.fillText("MACK", x, y + 16);
    return;
  }
  ctx.restore();
}

function nightFactor(hour: number) {
  if (hour > 20 || hour < 6) return 0.72;
  if (hour > 18) return (hour - 18) / 2 * 0.72;
  if (hour < 8) return (8 - hour) / 2 * 0.72;
  return 0;
}

export function drawWorld(ctx: CanvasRenderingContext2D, s: DrawState, assets: Assets) {
  const { vs, camera } = s;
  const left = camera.x;
  const top = camera.y;
  const right = camera.x + vs.w;
  const bot = camera.y + vs.h;
  const inView = (x: number, y: number, w = 0, h = 0) =>
    x + w >= left - 40 && x <= right + 40 && y + h >= top - 40 && y <= bot + 40;

  if (assets.grass) {
    ctx.save();
    ctx.fillStyle = assets.grass;
    ctx.fillRect(left, top, vs.w, vs.h);
    ctx.restore();
  } else {
    ctx.fillStyle = "#1a261c";
    ctx.fillRect(left, top, vs.w, vs.h);
  }

  for (const p of s.parks) {
    ctx.fillStyle = "rgba(36, 72, 42, 0.55)";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = "rgba(180, 200, 140, 0.25)";
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }

  if (assets.water) {
    ctx.save();
    ctx.fillStyle = assets.water;
    ctx.fillRect(0, WORLD.h - 170, WORLD.w, 190);
    ctx.restore();
  } else {
    ctx.fillStyle = "#163038";
    ctx.fillRect(0, WORLD.h - 170, WORLD.w, 190);
  }
  ctx.fillStyle = "#1c3c44";
  ctx.fillRect(0, WORLD.h - 170, WORLD.w, 10);

  if (assets.asphalt) {
    ctx.save();
    ctx.fillStyle = assets.asphalt;
    for (let x = 0; x < WORLD.w; x += STEP) ctx.fillRect(x, 0, ROAD, WORLD.h);
    for (let y = 0; y < WORLD.h; y += STEP) ctx.fillRect(0, y, WORLD.w, ROAD);
    ctx.fillRect(0, WORLD.h - 250, WORLD.w, 88);
    ctx.restore();
  } else {
    for (let x = 0; x < WORLD.w; x += STEP) {
      ctx.fillStyle = "#4a4240";
      ctx.fillRect(x - 8, 0, ROAD + 16, WORLD.h);
      ctx.fillStyle = "#3a4148";
      ctx.fillRect(x, 0, ROAD, WORLD.h);
    }
    for (let y = 0; y < WORLD.h; y += STEP) {
      ctx.fillStyle = "#4a4240";
      ctx.fillRect(0, y - 8, WORLD.w, ROAD + 16);
      ctx.fillStyle = "#3a4148";
      ctx.fillRect(0, y, WORLD.w, ROAD);
    }
  }

  ctx.fillStyle = "#4a4240";
  for (let x = 0; x < WORLD.w; x += STEP) {
    ctx.fillRect(x - 6, 0, 6, WORLD.h);
    ctx.fillRect(x + ROAD, 0, 6, WORLD.h);
  }
  for (let y = 0; y < WORLD.h; y += STEP) {
    ctx.fillRect(0, y - 6, WORLD.w, 6);
    ctx.fillRect(0, y + ROAD, WORLD.w, 6);
  }

  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 14]);
  for (let x = 0; x < WORLD.w; x += STEP) {
    if (x + 48 < left - 20 || x > right + 20) continue;
    ctx.beginPath();
    ctx.moveTo(x + 48, Math.max(0, top - 20));
    ctx.lineTo(x + 48, Math.min(WORLD.h, bot + 20));
    ctx.stroke();
  }
  for (let y = 0; y < WORLD.h; y += STEP) {
    if (y + 48 < top - 20 || y > bot + 20) continue;
    ctx.beginPath();
    ctx.moveTo(Math.max(0, left - 20), y + 48);
    ctx.lineTo(Math.min(WORLD.w, right + 20), y + 48);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const DISTRICT_WASH: Record<string, string> = {
    HEIGHTS: "rgba(52, 82, 42, 0.16)",
    WESTSIDE: "rgba(78, 58, 36, 0.12)",
    DOWNTOWN: "rgba(16, 24, 38, 0.2)",
    "EAST END": "rgba(48, 40, 56, 0.1)",
    DOCKS: "rgba(28, 50, 56, 0.18)",
  };
  for (const d of DISTRICTS) {
    if (d.x + d.w < left || d.x > right || d.y + d.h < top || d.y > bot) continue;
    ctx.fillStyle = DISTRICT_WASH[d.name] ?? "transparent";
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }

  ctx.fillStyle = "#d8dde2";
  for (let x = 0; x < WORLD.w; x += STEP) {
    for (let y = 0; y < WORLD.h; y += STEP) {
      if (!inView(x, y, 96, 96)) continue;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 8 + i * 16, y + 2, 10, 6);
        ctx.fillRect(x + 2, y + 8 + i * 16, 6, 10);
      }
    }
  }

  for (const sk of s.skids) {
    ctx.save();
    ctx.translate(sk.x, sk.y);
    ctx.rotate(sk.a);
    ctx.globalAlpha = Math.max(0, sk.life * 0.35);
    ctx.fillStyle = "#1a1c1e";
    ctx.fillRect(-10, -7, 16, 2);
    ctx.fillRect(-10, 5, 16, 2);
    ctx.restore();
  }

  const night = nightFactor(s.hour);
  for (let x = 0; x < WORLD.w; x += STEP) {
    for (let y = 0; y < WORLD.h; y += STEP) {
      if (!inView(x, y, 96, 96)) continue;
      const g = ctx.createRadialGradient(x + 48, y + 48, 4, x + 48, y + 48, 70);
      g.addColorStop(0, `rgba(232,196,110,${0.16 + night * 0.35})`);
      g.addColorStop(1, "rgba(232,196,110,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + 48, y + 48, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2418";
      ctx.fillRect(x + 44, y + 20, 5, 28);
      ctx.fillStyle = "#e8c46e";
      ctx.beginPath();
      ctx.arc(x + 46.5, y + 20, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#2e343a";
  ctx.fillRect(GARAGE_DROP.x, GARAGE_DROP.y, GARAGE_DROP.w, GARAGE_DROP.h);
  ctx.strokeStyle = "#c9c4a8";
  ctx.lineWidth = 1;
  const stallW = (GARAGE_DROP.w - 16) / 5;
  for (let i = 0; i < 5; i++) ctx.strokeRect(GARAGE_DROP.x + 8 + i * stallW, GARAGE_DROP.y + 10, stallW - 6, GARAGE_DROP.h - 28);
  ctx.fillStyle = "#d97a32";
  ctx.font = "700 13px Barlow Condensed, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GARAGE  ·  HIDE", GARAGE_DROP.x + GARAGE_DROP.w / 2, GARAGE_DROP.y + 14);

  ctx.fillStyle = "#5a4a32";
  ctx.fillRect(PIER_DROP.x, PIER_DROP.y, PIER_DROP.w, PIER_DROP.h);
  ctx.fillStyle = "#6a5640";
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(PIER_DROP.x, PIER_DROP.y + 6 + i * 15, PIER_DROP.w, 4);
  }
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 2;
  ctx.strokeRect(PIER_DROP.x + 10, PIER_DROP.y + 18, 80, 88);
  ctx.strokeRect(PIER_DROP.x + 102, PIER_DROP.y + 18, 80, 88);
  ctx.fillStyle = "#d97a32";
  ctx.font = "700 13px Barlow Condensed, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DROP", PIER_DROP.x + PIER_DROP.w / 2, PIER_DROP.y + 14);
  ctx.fillText("DROP", PIER_DROP.x + 50, PIER_DROP.y + 70);
  ctx.fillText("DROP", PIER_DROP.x + 142, PIER_DROP.y + 70);

  ctx.fillStyle = "#c9a24a";
  ctx.fillRect(DOCK_RAMP.x, DOCK_RAMP.y, DOCK_RAMP.w, DOCK_RAMP.h);
  ctx.fillStyle = "#f2e2a0";
  for (let i = 0; i < 5; i++) ctx.fillRect(DOCK_RAMP.x + 8 + i * 16, DOCK_RAMP.y + 6, 8, DOCK_RAMP.h - 12);
  ctx.fillStyle = "#1a1c20";
  ctx.beginPath();
  ctx.moveTo(DOCK_RAMP.x + DOCK_RAMP.w - 6, DOCK_RAMP.y + 4);
  ctx.lineTo(DOCK_RAMP.x + DOCK_RAMP.w + 16, DOCK_RAMP.y + DOCK_RAMP.h / 2);
  ctx.lineTo(DOCK_RAMP.x + DOCK_RAMP.w - 6, DOCK_RAMP.y + DOCK_RAMP.h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d97a32";
  ctx.font = "700 11px Barlow Condensed, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RAMP", DOCK_RAMP.x + DOCK_RAMP.w / 2, DOCK_RAMP.y + 16);

  for (const b of s.buildings) {
    if (!inView(b.x, b.y, b.w, b.h)) continue;
    if (b.label === "GARAGE") {
      const doorX = b.x + (b.w - GARAGE_BAY.door) / 2;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = "#2a2422";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#16181c";
      ctx.fillRect(b.x + 16, b.y + 16, b.w - 32, b.h - 16);
      ctx.strokeStyle = "#c9c4a8";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 28, b.y + 28, (b.w - 64) / 2 - 6, b.h - 70);
      ctx.strokeRect(b.x + b.w / 2 + 6, b.y + 28, (b.w - 64) / 2 - 6, b.h - 70);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, 16);
      ctx.fillRect(b.x, b.y, 16, b.h);
      ctx.fillRect(b.x + b.w - 16, b.y, 16, b.h);
      ctx.fillRect(b.x, b.y + b.h - 16, doorX - b.x, 16);
      ctx.fillRect(doorX + GARAGE_BAY.door, b.y + b.h - 16, b.x + b.w - doorX - GARAGE_BAY.door, 16);
      ctx.fillStyle = "#d97a32";
      ctx.font = "700 12px Barlow Condensed, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GARAGE BAY", b.x + b.w / 2, b.y + 28);
      continue;
    }
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const dname = DISTRICTS.find((d) => b.x >= d.x && b.x < d.x + d.w && b.y >= d.y && b.y < d.y + d.h)?.name;
    const overlay: Record<string, string> = {
      HEIGHTS: "rgba(96, 52, 28, 0.2)",
      WESTSIDE: "rgba(72, 54, 32, 0.16)",
      DOWNTOWN: "rgba(10, 18, 32, 0.26)",
      "EAST END": "rgba(42, 36, 54, 0.14)",
      DOCKS: "rgba(90, 44, 28, 0.22)",
    };
    if (dname && overlay[dname]) {
      ctx.fillStyle = overlay[dname];
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(b.x + b.w - 10, b.y, 10, b.h);
    ctx.fillRect(b.x, b.y + b.h - 8, b.w, 8);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(b.x, b.y, b.w, 8);
    const cols = Math.max(2, Math.floor(b.w / 44));
    const rows = Math.max(1, Math.floor((b.h - 28) / 32));
    const lit = night > 0.3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = ((b.x + c * 13 + r) % 3) !== 0;
        ctx.fillStyle = on
          ? lit
            ? "rgba(232,196,110,0.7)"
            : "rgba(232,196,110,0.35)"
          : "rgba(20,24,28,0.45)";
        ctx.fillRect(b.x + 12 + c * 40, b.y + 22 + r * 30, 12, 12);
      }
    }
    ctx.fillStyle = "rgba(40,44,48,0.8)";
    ctx.fillRect(b.x + b.w * 0.55, b.y + 4, 16, 10);
    if (b.shop) {
      ctx.fillStyle = "#c45a2a";
      ctx.fillRect(b.x + 16, b.y + b.h - 8, b.w - 32, 4);
      ctx.fillStyle = "#1a1410";
      ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h - 18, 16, 16);
    }
    if (b.label) {
      ctx.fillStyle = "#d5dde4";
      ctx.font = "700 11px IBM Plex Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h - 10);
    }
  }

  for (const pr of s.props) {
    if (!inView(pr.x - 20, pr.y - 20, 40, 40)) continue;
    const img = assets.props[pr.frame];
    if (img && img.complete) {
      const sz = pr.kind === "tree" ? 36 : 22;
      ctx.drawImage(img, pr.x - sz / 2, pr.y - sz / 2, sz, sz);
    } else {
      ctx.fillStyle =
        pr.kind === "tree" ? "#2f5a3a" : pr.kind === "hydrant" ? "#b83a32" : "#3a4148";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawActors(ctx: CanvasRenderingContext2D, s: DrawState, now: number) {
  const pulse = 0.45 + 0.55 * Math.sin(now / 220);
  for (const m of s.markers) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(217,122,50,${0.2 + pulse * 0.25})`;
    ctx.arc(m.x, m.y, 28 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#d97a32";
    ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  drawWorldNav(ctx, s, now);
  for (const e of s.envelopes) {
    if (e.taken) continue;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = "#e8c547";
    ctx.fillRect(-6, -4, 12, 8);
    ctx.strokeStyle = "#3a3220";
    ctx.strokeRect(-6, -4, 12, 8);
    ctx.restore();
  }
  for (const v of s.parked) if (!v.taken) drawCar(ctx, v, false, now);
  for (const t of s.traffic) if (t.alive) drawCar(ctx, t, false, now);
  for (const c of s.cops) if (c.alive) drawCar(ctx, c, true, now);
  for (const p of s.peds) drawPerson(ctx, p.x, p.y, p.wander, p.color, p.kind, p.down);
  const player = s.player;
  if (player.vehicle) {
    const v = player.vehicle;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);
    const night = nightFactor(s.hour);
    const beam = ctx.createLinearGradient(v.w / 2, 0, v.w / 2 + 70, 0);
    beam.addColorStop(0, `rgba(255,230,170,${0.22 + night * 0.35})`);
    beam.addColorStop(1, "rgba(255,230,170,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(v.w / 2, -5);
    ctx.lineTo(v.w / 2 + 72, -22);
    ctx.lineTo(v.w / 2 + 72, 22);
    ctx.lineTo(v.w / 2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (s.lift > 0) {
      ctx.save();
      ctx.translate(-10, -16);
      drawCar(ctx, v, false, now);
      ctx.restore();
    } else drawCar(ctx, v, false, now);
    if (s.fare) {
      drawPerson(
        ctx,
        v.x - Math.cos(v.angle) * 6,
        v.y - Math.sin(v.angle) * 6,
        v.angle,
        "#e8c547",
        "civ",
        0,
      );
    }
  } else {
    drawPerson(ctx, player.x, player.y, player.angle, "#2a3a38", "player", 0);
  }
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    if (p.text) {
      ctx.fillStyle = p.color;
      ctx.font = "700 13px Barlow Condensed, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawWorldNav(ctx: CanvasRenderingContext2D, s: DrawState, now: number) {
  const t = s.nav;
  if (!t) return;
  const dx = t.x - s.player.x;
  const dy = t.y - s.player.y;
  const d = Math.hypot(dx, dy);
  if (d < 52) return;
  const ang = Math.atan2(dy, dx);
  const reach = (s.player.vehicle ? 54 : 36) + Math.min(18, d * 0.02);
  const ax = s.player.x + Math.cos(ang) * reach;
  const ay = s.player.y + Math.sin(ang) * reach;
  const pulse = 1 + 0.1 * Math.sin(now / 140);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "rgba(217,122,50,0.95)";
  ctx.strokeStyle = "rgba(18, 12, 8, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-14, 15);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-14, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawHudNav(
  ctx: CanvasRenderingContext2D,
  s: DrawState,
  vs: { w: number; h: number },
  now: number,
) {
  const t = s.nav;
  if (!t) return;
  const dx = t.x - s.player.x;
  const dy = t.y - s.player.y;
  const d = Math.hypot(dx, dy);
  if (d < 90) return;
  const ang = Math.atan2(dy, dx);
  const meters = Math.max(1, Math.round(d / 8));
  const radar = Math.max(118, Math.min(172, Math.min(vs.w, vs.h) * 0.22));
  const padL = 22;
  const padR = radar + 26;
  const padT = 22;
  const padB = 110;
  const sx = t.x - s.camera.x + s.camera.shakeX;
  const sy = t.y - s.camera.y + s.camera.shakeY;
  const onScreen = sx > padL && sx < vs.w - padR && sy > padT && sy < vs.h - padB;
  if (onScreen) return;

  const cx = vs.w / 2;
  const cy = vs.h / 2;
  const vx = sx - cx;
  const vy = sy - cy;
  const k = Math.min(
    (vs.w / 2 - padR) / Math.max(1, Math.abs(vx)),
    (vs.h / 2 - padB) / Math.max(1, Math.abs(vy)),
  );
  const ex = Math.max(padL + 24, Math.min(vs.w - padR, cx + vx * k));
  const ey = Math.max(padT + 36, Math.min(vs.h - padB, cy + vy * k));
  const pulse = 1 + 0.08 * Math.sin(now / 120);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(ang);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#d97a32";
  ctx.strokeStyle = "rgba(7,9,12,0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, 14);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-14, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#e8edf2";
  ctx.font = "700 14px Barlow Condensed, sans-serif";
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(7,9,12,0.8)";
  ctx.lineWidth = 4;
  ctx.strokeText(meters + " m", ex, ey + 26);
  ctx.fillText(meters + " m", ex, ey + 26);
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  s: DrawState,
  vs: { w: number; h: number },
  now = 0,
) {
  const size = Math.max(118, Math.min(172, Math.min(vs.w, vs.h) * 0.22));
  const rad = size / 2;
  const cx = vs.w - rad - 12;
  const cy = rad + 12;
  const range = 900;
  const scale = rad / range;
  const px = s.player.x;
  const py = s.player.y;
  const toX = (x: number) => cx + (x - px) * scale;
  const toY = (y: number) => cy + (y - py) * scale;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(7, 10, 14, 0.55)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = s.player.wanted > 0 ? "rgba(226, 61, 61, 0.7)" : "rgba(232, 237, 242, 0.22)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(10, 16, 20, 0.92)";
  ctx.fill();

  ctx.fillStyle = "#2c353c";
  for (let x = 0; x < WORLD.w; x += STEP) ctx.fillRect(toX(x), toY(0), Math.max(3, ROAD * scale), WORLD.h * scale);
  for (let y = 0; y < WORLD.h; y += STEP) ctx.fillRect(toX(0), toY(y), WORLD.w * scale, Math.max(3, ROAD * scale));

  ctx.fillStyle = "#1a261c";
  for (const p of s.parks) ctx.fillRect(toX(p.x), toY(p.y), p.w * scale, p.h * scale);

  ctx.fillStyle = "#394249";
  for (const b of s.buildings) {
    if (Math.abs(b.x + b.w / 2 - px) > range + 80 || Math.abs(b.y + b.h / 2 - py) > range + 80) continue;
    ctx.fillRect(toX(b.x), toY(b.y), Math.max(2, b.w * scale), Math.max(2, b.h * scale));
  }

  const pois: { x: number; y: number; color: string }[] = [
    { x: GARAGE_DROP.x + GARAGE_DROP.w / 2, y: GARAGE_DROP.y + GARAGE_DROP.h / 2, color: "#c6f06a" },
    { x: PAY_SPRAY.x + PAY_SPRAY.w / 2, y: PAY_SPRAY.y + PAY_SPRAY.h / 2, color: "#7ec8e3" },
    { x: CHOP_SHOP.x + CHOP_SHOP.w / 2, y: CHOP_SHOP.y + CHOP_SHOP.h / 2, color: "#c6a06a" },
    { x: MOTEL.x + MOTEL.w / 2, y: MOTEL.y + MOTEL.h / 2, color: "#9aa7b2" },
  ];
  for (const p of pois) {
    if (Math.hypot(p.x - px, p.y - py) > range) continue;
    ctx.fillStyle = p.color;
    ctx.fillRect(toX(p.x) - 2, toY(p.y) - 2, 4, 4);
  }

  for (const v of s.parked) {
    if (v.cop || v === s.player.vehicle) continue;
    if (!v.owned && !(v.hot && inGaragePark(v.x, v.y))) continue;
    const dx = v.x - px;
    const dy = v.y - py;
    const d = Math.hypot(dx, dy) || 1;
    const on = d <= range * 0.92;
    const bx = on ? toX(v.x) : cx + (dx / d) * rad * 0.84;
    const by = on ? toY(v.y) : cy + (dy / d) * rad * 0.84;
    ctx.fillStyle = v.owned ? "#e8c547" : "#c6f06a";
    ctx.fillRect(bx - 2.5, by - 2.5, 5, 5);
  }

  ctx.fillStyle = "#e23d3d";
  for (const c of s.cops) {
    if (!c.alive || Math.hypot(c.x - px, c.y - py) > range) continue;
    ctx.fillRect(toX(c.x) - 2, toY(c.y) - 2, 4, 4);
  }

  const pulse = 3.4 + Math.sin(now / 160) * 1.6;
  const pings = s.nav ? [s.nav, ...s.markers.filter((m) => Math.hypot(m.x - s.nav!.x, m.y - s.nav!.y) > 24)] : s.markers;
  pings.forEach((m, i) => {
    const dx = m.x - px;
    const dy = m.y - py;
    const d = Math.hypot(dx, dy) || 1;
    const on = d <= range * 0.92;
    const sx = on ? toX(m.x) : cx + (dx / d) * rad * 0.88;
    const sy = on ? toY(m.y) : cy + (dy / d) * rad * 0.88;
    ctx.fillStyle = "#d97a32";
    ctx.beginPath();
    ctx.arc(sx, sy, i === 0 ? (on ? pulse : 4) : 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(s.player.angle);
  ctx.fillStyle = "#e8edf2";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, 5.5);
  ctx.lineTo(-2.5, 0);
  ctx.lineTo(-6, -5.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#d97a32";
  ctx.font = "700 11px Barlow Condensed, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - rad + 13);
}

export function drawMapOverlay(ctx: CanvasRenderingContext2D, s: DrawState, vs: { w: number; h: number }) {
  const pad = 28;
  const mw = vs.w - pad * 2;
  const mh = vs.h - pad * 2;
  const mx = pad;
  const my = pad;
  ctx.fillStyle = "rgba(7,9,12,0.82)";
  ctx.fillRect(0, 0, vs.w, vs.h);
  ctx.fillStyle = "#0e141a";
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.strokeRect(mx, my, mw, mh);
  const sx = mw / WORLD.w;
  const sy = mh / WORLD.h;
  ctx.fillStyle = "#1a261c";
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = "#3a4148";
  for (let x = 0; x < WORLD.w; x += STEP) ctx.fillRect(mx + x * sx, my, ROAD * sx, mh);
  for (let y = 0; y < WORLD.h; y += STEP) ctx.fillRect(mx, my + y * sy, mw, ROAD * sy);
  ctx.fillStyle = "#2a333a";
  for (const b of s.buildings) {
    ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(3, b.w * sx), Math.max(3, b.h * sy));
    if (b.label) {
      ctx.fillStyle = "#d5dde4";
      ctx.font = "600 10px IBM Plex Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(b.label, mx + (b.x + b.w / 2) * sx, my + (b.y + b.h / 2) * sy);
      ctx.fillStyle = "#2a333a";
    }
  }
  ctx.fillStyle = "#d97a32";
  for (const m of s.markers) {
    ctx.beginPath();
    ctx.arc(mx + m.x * sx, my + m.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e8c547";
  for (const e of s.envelopes) {
    if (!e.taken) ctx.fillRect(mx + e.x * sx - 2, my + e.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = "#e23d3d";
  for (const c of s.cops) {
    if (c.alive) ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = "#e8c547";
  for (const v of s.parked) {
    if (v.owned || (v.hot && inGaragePark(v.x, v.y))) ctx.fillRect(mx + v.x * sx - 3, my + v.y * sy - 3, 6, 6);
  }
  ctx.fillStyle = "#c6f06a";
  ctx.fillRect(mx + (GARAGE_DROP.x + GARAGE_DROP.w / 2) * sx - 3, my + (GARAGE_DROP.y + GARAGE_DROP.h / 2) * sy - 3, 6, 6);
  ctx.fillStyle = "#e8edf2";
  ctx.beginPath();
  ctx.arc(mx + s.player.x * sx, my + s.player.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8edf2";
  ctx.font = "700 18px Barlow Condensed, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("RIDGE CITY", mx + 12, my + 24);
}

export { hash };
