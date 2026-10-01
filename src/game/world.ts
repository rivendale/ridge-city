import type {
  Building,
  CarType,
  Envelope,
  JobDef,
  JobId,
  Ped,
  Prop,
  PropKind,
  Rect,
  Shop,
  Vehicle,
} from "./types";

export const WORLD = { w: 4800, h: 3600 };
export const ROAD = 96;
export const STEP = 400;
export const LOCKUP = { x: 490, y: 2760 };
export const GARAGE_DROP = { x: 2848, y: 2664, w: 262, h: 96 };
export const GARAGE_BAY = { x: 2860, y: 2480, w: 240, h: 170, door: 112 };
export const PIER_DROP = { x: 3696, y: 2888, w: 196, h: 124 };
export const MACK_POS = { x: 2920, y: 2680 };
export const PAY_SPRAY = { x: 1760, y: 2480, w: 200, h: 140 };
export const CHOP_SHOP = { x: 4020, y: 1080, w: 200, h: 150 };
export const MOTEL = { x: 180, y: 2520, w: 160, h: 120 };


export const DISTRICTS = [
  { name: "HEIGHTS", x: 0, y: 0, w: 4800, h: 1200 },
  { name: "WESTSIDE", x: 0, y: 1200, w: 1600, h: 1200 },
  { name: "DOWNTOWN", x: 1600, y: 1200, w: 1600, h: 1200 },
  { name: "EAST END", x: 3200, y: 800, w: 1600, h: 1600 },
  { name: "DOCKS", x: 0, y: 2400, w: 4800, h: 1200 },
] as const;

export const JOBS: Record<JobId, JobDef> = {
  meet: { text: "Find Mack behind the garage on the south side.", short: "Find Mack", pay: 0 },
  boost1: { text: "Jack any car and park it in the garage lot.", short: "Jack a car, dump it at the garage", pay: 180 },
  shop1: { text: "Hit SLICE CO. Grab the bag. Bank it in the garage lot.", short: "Hit SLICE CO., bank the bag", pay: 240 },
  boost2: { text: "Boost a SPORT car. Park it in the garage lot.", short: "Boost a SPORT, garage drop", pay: 320 },
  shop2: { text: "Hit the MART, then the POST. Bank both bags in the garage lot.", short: "Hit MART and POST, then garage", pay: 400 },
  evade: {
    text: "Get 2 wanted stars (ram a cruiser or trip an alarm), then go cold before returning to Mack.",
    short: "Get 2 stars, go cold, see Mack",
    pay: 280,
  },
  taxi: { text: "Jack a TAXI and park it on the PIER drop stall.", short: "Taxi to the PIER drop", pay: 260 },
  finale: { text: "One more shop run: ARCADE, then lose the tail and see Mack.", short: "Hit ARCADE, lose heat, Mack", pay: 500 },
  radio: { text: "Stay on the radio. Jobs keep coming.", short: "Radio gigs", pay: 0 },
  done: { text: "Mack's quiet. City's still open. Keep boosting.", short: "Off the clock", pay: 0 },
};

export const JOB_ORDER: JobId[] = [
  "meet",
  "boost1",
  "shop1",
  "boost2",
  "shop2",
  "evade",
  "taxi",
  "finale",
];

export const CAR_COLORS = [
  "#8a2d2d",
  "#2c4a7a",
  "#2f5a3a",
  "#c4b48a",
  "#1f1f22",
  "#6a3a1e",
  "#3a3a48",
  "#b84a2a",
  "#4a6280",
  "#5a3a48",
];

export const DOCK_RAMP = { x: 1648, y: 2830, w: 92, h: 40 };

export function carFeel(type: CarType) {
  if (type === "sport") return { slide: 1.75, plant: 0.22, shove: 0.12, calm: false };
  if (type === "coupe") return { slide: 1.15, plant: 0.4, shove: 0.15, calm: false };
  if (type === "van") return { slide: 0.22, plant: 1.2, shove: 1, calm: false };
  if (type === "taxi") return { slide: 0.35, plant: 0.7, shove: 0.08, calm: true };
  return { slide: 0.6, plant: 0.6, shove: 0.2, calm: false };
}

export function carStats(type: CarType) {
  return {
    compact: { w: 28, h: 16, acc: 240, max: 248, turn: 2.6, name: "COMPACT", value: 40 },
    coupe: { w: 32, h: 16, acc: 310, max: 312, turn: 2.45, name: "COUPE", value: 90 },
    sedan: { w: 34, h: 17, acc: 210, max: 264, turn: 2.1, name: "SEDAN", value: 55 },
    van: { w: 40, h: 20, acc: 160, max: 216, turn: 1.7, name: "VAN", value: 70 },
    sport: { w: 32, h: 16, acc: 390, max: 368, turn: 2.85, name: "SPORT", value: 160 },
    taxi: { w: 34, h: 17, acc: 220, max: 258, turn: 2.25, name: "TAXI", value: 45 },
    cop: { w: 34, h: 17, acc: 260, max: 300, turn: 2.35, name: "CRUISER", value: 0 },
  }[type];
}

export const CATALOG: { type: CarType; price: number }[] = [
  { type: "compact", price: 420 },
  { type: "sedan", price: 640 },
  { type: "coupe", price: 980 },
  { type: "van", price: 760 },
  { type: "taxi", price: 540 },
  { type: "sport", price: 1680 },
];

const HOUSE_COLS = ["#2b3036", "#32302c", "#2c3330", "#353028", "#2a2f38", "#332c2c"];

function addBuilding(
  buildings: Building[],
  shops: Shop[],
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  label = "",
  shop = false,
) {
  const roof = shade(color, -18);
  const b: Building = { x, y, w, h, color, label, shop, roof };
  buildings.push(b);
  if (shop) shops.push({ b, robbed: false, cooldown: 0 });
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

export function hash(x: number, y: number) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

export function snapRoadX(x: number) {
  return Math.round((x - 48) / STEP) * STEP + 48;
}
export function snapRoadY(y: number) {
  return Math.round((y - 48) / STEP) * STEP + 48;
}
export function onVertRoad(x: number) {
  return Math.abs((x % STEP) - 48) < 42;
}
export function onHorzRoad(y: number) {
  return Math.abs((y % STEP) - 48) < 42;
}
export function onRoad(x: number, y: number) {
  const mx = ((x % STEP) + STEP) % STEP;
  const my = ((y % STEP) + STEP) % STEP;
  return mx < ROAD || my < ROAD || (y > WORLD.h - 250 && y < WORLD.h - 162) || inPierDrop(x, y) || inGarageDrop(x, y) || inGarageInterior(x, y);
}

export function districtAt(x: number, y: number) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return "RIDGE";
}

export function inGarageDrop(x: number, y: number) {
  return (
    x > GARAGE_DROP.x &&
    x < GARAGE_DROP.x + GARAGE_DROP.w &&
    y > GARAGE_DROP.y &&
    y < GARAGE_DROP.y + GARAGE_DROP.h
  );
}

export function inGarageInterior(x: number, y: number) {
  const b = GARAGE_BAY;
  return x > b.x + 14 && x < b.x + b.w - 14 && y > b.y + 18 && y < b.y + b.h + 6;
}

export function inGaragePark(x: number, y: number) {
  const b = GARAGE_BAY;
  const doorX = b.x + (b.w - b.door) / 2;
  const inMouth =
    x > doorX - 10 && x < doorX + b.door + 10 && y >= b.y + b.h - 20 && y <= GARAGE_DROP.y + 12;
  return inGarageDrop(x, y) || inGarageInterior(x, y) || inMouth;
}

export function garageDropPoint() {
  return { x: GARAGE_BAY.x + GARAGE_BAY.w / 2, y: GARAGE_BAY.y + GARAGE_BAY.h * 0.55 };
}

export function garageSolids(): Rect[] {
  const b = GARAGE_BAY;
  const wall = 16;
  const doorX = b.x + (b.w - b.door) / 2;
  return [
    { x: b.x, y: b.y, w: b.w, h: wall },
    { x: b.x, y: b.y, w: wall, h: b.h },
    { x: b.x + b.w - wall, y: b.y, w: wall, h: b.h },
    { x: b.x, y: b.y + b.h - wall, w: doorX - b.x, h: wall },
    { x: doorX + b.door, y: b.y + b.h - wall, w: b.x + b.w - doorX - b.door, h: wall },
  ];
}

export function inPierDrop(x: number, y: number) {
  return (
    x > PIER_DROP.x &&
    x < PIER_DROP.x + PIER_DROP.w &&
    y > PIER_DROP.y &&
    y < PIER_DROP.y + PIER_DROP.h
  );
}

export function pierDropPoint() {
  return { x: PIER_DROP.x + PIER_DROP.w / 2, y: PIER_DROP.y + PIER_DROP.h / 2 };
}

export function makeWorld() {
  const buildings: Building[] = [];
  const shops: Shop[] = [];

  addBuilding(buildings, shops, 2260, 1680, 280, 200, "#2a3340", "CITY HALL");
  addBuilding(buildings, shops, 720, 480, 300, 210, "#3a3228", "SCHOOL");
  addBuilding(buildings, shops, 3380, 520, 260, 190, "#2c3548", "LIBRARY");
  addBuilding(buildings, shops, 560, 1680, 210, 160, "#4a2c24", "SLICE CO.", true);
  addBuilding(buildings, shops, 3440, 1680, 200, 150, "#24383a", "MART", true);
  addBuilding(buildings, shops, 1480, 2480, 260, 170, "#2f3d2c", "MARKET", true);
  addBuilding(buildings, shops, 2860, 2480, 240, 170, "#3a2424", "GARAGE");
  addBuilding(buildings, shops, 3900, 2910, 96, 100, "#3a3424", "PIER");
  addBuilding(buildings, shops, 1180, 1180, 180, 140, "#2a2e28", "POST", true);
  addBuilding(buildings, shops, 2580, 1080, 210, 150, "#243040", "ARCADE", true);
  addBuilding(buildings, shops, 1760, 2040, 170, 130, "#33281f", "PARTS");
  addBuilding(buildings, shops, 400, 2680, 180, 140, "#2b2830", "LOCKUP");
  addBuilding(buildings, shops, PAY_SPRAY.x, PAY_SPRAY.y, PAY_SPRAY.w, PAY_SPRAY.h, "#3a3220", "PAY SPRAY");
  addBuilding(buildings, shops, CHOP_SHOP.x, CHOP_SHOP.y, CHOP_SHOP.w, CHOP_SHOP.h, "#3a2428", "CHOP");
  addBuilding(buildings, shops, 900, 2080, 190, 140, "#3a2a22", "DINER", true);
  addBuilding(buildings, shops, 2180, 680, 180, 140, "#24342c", "PHARM", true);
  addBuilding(buildings, shops, 2580, 2080, 200, 140, "#2a2834", "RADIO");
  addBuilding(buildings, shops, MOTEL.x, MOTEL.y, MOTEL.w, MOTEL.h, "#353028", "MOTEL");
  addBuilding(buildings, shops, 4180, 2480, 220, 160, "#2c2830", "WAREHOUSE");
  addBuilding(buildings, shops, 1480, 480, 200, 150, "#2a3038", "OFFICES");

  const houses: [number, number][] = [
    [180, 180],
    [480, 200],
    [180, 780],
    [1080, 180],
    [1620, 360],
    [2140, 180],
    [2580, 300],
    [2980, 180],
    [3780, 220],
    [3960, 780],
    [180, 2060],
    [500, 2320],
    [2060, 2920],
    [2460, 3000],
    [1780, 680],
    [1120, 2920],
    [820, 2780],
    [4000, 1680],
    [4200, 2400],
    [900, 900],
    [2000, 400],
    [3080, 3080],
    [3480, 3080],
    [1880, 3080],
    [580, 3080],
    [4180, 480],
    [1280, 2080],
    [3080, 1280],
    [1880, 1280],
    [480, 1280],
  ];
  houses.forEach(([x, y], i) =>
    addBuilding(buildings, shops, x, y, 140, 110, HOUSE_COLS[i % HOUSE_COLS.length], ""),
  );

  const parks = [
    { x: 1680, y: 1480, w: 280, h: 180 },
    { x: 880, y: 1480, w: 220, h: 160 },
    { x: 3080, y: 880, w: 240, h: 180 },
    { x: 200, y: 200, w: 260, h: 200 },
    { x: 1880, y: 180, w: 300, h: 160 },
    { x: 3480, y: 200, w: 220, h: 160 },
  ];

  const parked: Vehicle[] = [];
  const carSpawns: [number, number, CarType][] = [
    [2760, 2788, "compact"],
    [820, 760, "compact"],
    [1520, 1520, "sedan"],
    [1780, 2200, "compact"],
    [3180, 1820, "sport"],
    [620, 1820, "van"],
    [2920, 2660, "coupe"],
    [3480, 2848, "compact"],
    [1240, 380, "taxi"],
    [3480, 780, "sedan"],
    [420, 2620, "sport"],
    [2240, 780, "van"],
    [980, 1680, "coupe"],
    [2600, 1680, "taxi"],
    [1900, 1280, "sport"],
    [700, 2480, "sedan"],
    [3200, 2480, "compact"],
    [4000, 2000, "coupe"],
    [1400, 800, "van"],
    [2400, 2400, "sedan"],
    [3600, 1200, "sport"],
    [200, 1400, "compact"],
    [4200, 900, "taxi"],
    [3000, 600, "sedan"],
    [1680, 2800, "coupe"],
    [2600, 320, "compact"],
    [800, 3200, "van"],
    [1880, 1880, "sport"],
    [2280, 2280, "sedan"],
    [1080, 2280, "taxi"],
    [3480, 2280, "coupe"],
    [4280, 1480, "van"],
    [480, 480, "compact"],
    [2680, 2800, "sedan"],
  ];
  carSpawns.forEach(([x, y, t], i) => parked.push(makeCar(x, y, t, (i % 2) * (Math.PI / 2))));

  const peds: Ped[] = [];
  peds.push({
    x: MACK_POS.x,
    y: MACK_POS.y,
    homeX: MACK_POS.x,
    homeY: MACK_POS.y,
    kind: "mack",
    color: "#d97a32",
    wander: 0,
    r: 8,
    down: 0,
    panic: 0,
    crowd: false,
  });
  const civs: [number, number][] = [
    [900, 900],
    [1600, 600],
    [2000, 1600],
    [2400, 2000],
    [3200, 900],
    [3600, 1800],
    [800, 2000],
    [1200, 2600],
    [2000, 2600],
    [2800, 1400],
    [4000, 1400],
    [600, 600],
    [1800, 1000],
    [3000, 2000],
    [1000, 3000],
    [2200, 3000],
    [3800, 2600],
    [1400, 1800],
    [2600, 600],
    [4200, 2200],
    [400, 1800],
    [3400, 3000],
    [2400, 1200],
    [1600, 2200],
    [800, 1400],
    [3600, 600],
    [4400, 1800],
    [2000, 800],
    [2880, 2720],
    [3040, 2760],
    [2720, 2640],
    [620, 1780],
    [3480, 1760],
    [2280, 1760],
    [1220, 1280],
    [3960, 2920],
  ];
  const civCols = ["#c4b8a4", "#8a7a6a", "#4a5560", "#6a5344", "#7a8a74"];
  civs.forEach(([x, y]) =>
    peds.push({
      x,
      y,
      homeX: x,
      homeY: y,
      kind: "civ",
      color: civCols[(x + y) % civCols.length],
      wander: ((x * 13 + y) % 628) / 100,
      r: 8,
      down: 0,
      panic: 0,
      crowd: false,
    }),
  );

  const envelopes: Envelope[] = [
    { x: 240, y: 240, taken: false },
    { x: 4560, y: 240, taken: false },
    { x: 240, y: 3360, taken: false },
    { x: 4560, y: 3360, taken: false },
    { x: 2400, y: 1780, taken: false },
    { x: 870, y: 580, taken: false },
    { x: 3510, y: 620, taken: false },
    { x: 3805, y: 2920, taken: false },
    { x: 490, y: 2740, taken: false },
    { x: 2685, y: 1240, taken: false },
    { x: 4120, y: 1160, taken: false },
    { x: 1760, y: 1560, taken: false },
  ];

  const props = scatterProps(buildings, parks);
  for (const y of [2832, 2848, 2864]) {
    props.push({ x: 1764, y, kind: "barrier", r: 10, block: true, frame: 0 });
  }

  return { buildings, shops, parked, peds, parks, envelopes, props };
}

export function makeCar(x: number, y: number, type: CarType, angle = 0, extra?: Partial<Vehicle>): Vehicle {
  const s = carStats(type);
  return {
    x,
    y,
    angle,
    type,
    color: CAR_COLORS[Math.abs(Math.floor(x + y)) % CAR_COLORS.length],
    ...s,
    vx: 0,
    vy: 0,
    speed: 0,
    taken: false,
    cop: type === "cop",
    traffic: false,
    alive: true,
    dir: 0,
    pin: 0,
    owned: false,
    block: false,
    panic: 0,
    hot: false,
    slip: 0,
    ...extra,
  };
}

function scatterProps(
  buildings: Building[],
  parks: { x: number; y: number; w: number; h: number }[],
): Prop[] {
  const props: Prop[] = [];
  const kinds: PropKind[] = [
    "tree",
    "dumpster",
    "hydrant",
    "cone",
    "barrel",
    "crate",
    "news",
    "planter",
    "barrier",
  ];
  const radii: Record<PropKind, number> = {
    tree: 16,
    dumpster: 12,
    hydrant: 6,
    cone: 5,
    barrel: 8,
    crate: 9,
    news: 7,
    planter: 10,
    barrier: 10,
  };

  for (let bx = 0; bx < WORLD.w; bx += STEP) {
    for (let by = 0; by < WORLD.h; by += STEP) {
      const h = hash(bx, by);
      const count = 2 + (h % 3);
      for (let i = 0; i < count; i++) {
        const hh = hash(bx + i * 17, by + i * 31);
        const kind = kinds[hh % kinds.length];
        const x = bx + ROAD + 18 + (hh % Math.max(1, STEP - ROAD - 50));
        const y = by + ROAD + 18 + ((hh >> 8) % Math.max(1, STEP - ROAD - 50));
        if (y > WORLD.h - 180) continue;
        if (onRoad(x, y)) continue;
        if (inPierDrop(x, y) || inGaragePark(x, y)) continue;
        if (buildings.some((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h)) continue;
        props.push({
          x,
          y,
          kind,
          r: radii[kind],
          block: kind === "tree" || kind === "dumpster" || kind === "barrel" || kind === "planter",
          frame: kinds.indexOf(kind),
        });
      }
    }
  }
  for (const p of parks) {
    for (let i = 0; i < 6; i++) {
      const hx = hash(p.x + i, p.y);
      props.push({
        x: p.x + 24 + (hx % Math.max(1, p.w - 48)),
        y: p.y + 24 + ((hx >> 6) % Math.max(1, p.h - 48)),
        kind: "tree",
        r: 16,
        block: true,
        frame: 0,
      });
    }
  }
  return props;
}

export function doorOf(b: Building) {
  return { x: b.x + b.w / 2, y: b.y + b.h + 8 };
}
