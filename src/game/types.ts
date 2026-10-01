export type CarType =
  | "compact"
  | "coupe"
  | "sedan"
  | "van"
  | "sport"
  | "taxi"
  | "cop";

export type JobId =
  | "meet"
  | "boost1"
  | "shop1"
  | "boost2"
  | "shop2"
  | "evade"
  | "taxi"
  | "finale"
  | "radio"
  | "done";

export type RadioKind = "boost" | "shop" | "courier" | "evade" | "sprint" | "jump" | "haul" | "fare";

export type MarkerKind = "mack" | "car" | "shop" | "drop" | "poi" | "envelope";

export type Screen = "start" | "play" | "bust" | "pause" | "map" | "garage" | "settings";

export type Difficulty = "beginner" | "experienced";

export type PropKind =
  | "tree"
  | "dumpster"
  | "hydrant"
  | "cone"
  | "barrel"
  | "crate"
  | "news"
  | "planter"
  | "barrier";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Building extends Rect {
  color: string;
  label: string;
  shop: boolean;
  roof: string;
}

export interface Shop {
  b: Building;
  robbed: boolean;
  cooldown: number;
}

export interface Vehicle {
  x: number;
  y: number;
  angle: number;
  type: CarType;
  color: string;
  w: number;
  h: number;
  acc: number;
  max: number;
  turn: number;
  name: string;
  value: number;
  vx: number;
  vy: number;
  speed: number;
  taken: boolean;
  cop: boolean;
  traffic: boolean;
  alive: boolean;
  dir: number;
  pin: number;
  owned: boolean;
  block: boolean;
  panic: number;
  hot: boolean;
  slip: number;
}

export interface Ped {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  kind: "civ" | "mack";
  color: string;
  wander: number;
  r: number;
  down: number;
  panic: number;
  crowd: boolean;
}

export interface Marker {
  x: number;
  y: number;
  kind: MarkerKind;
}

export interface Envelope {
  x: number;
  y: number;
  taken: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text?: string;
}

export interface Skid {
  x: number;
  y: number;
  a: number;
  life: number;
}

export interface Prop {
  x: number;
  y: number;
  kind: PropKind;
  r: number;
  block: boolean;
  frame: number;
}

export interface JobDef {
  text: string;
  short: string;
  pay: number;
}

export interface HudSnapshot {
  cash: number;
  vehicle: string;
  wanted: number;
  jobId: JobId;
  jobText: string;
  toast: string;
  hint: string;
  speed: number;
  heat: number;
  hour: number;
  district: string;
  envelopes: number;
  envelopesTotal: number;
  radioName: string;
  paused: boolean;
  screen: Screen;
  bustDetail: string;
  respect: number;
  hasSave: boolean;
  ownedCount: number;
  shake: boolean;
  muted: boolean;
  music: boolean;
  navDist: number | null;
  navAngle: number;
  jobLabel: string;
  onClock: boolean;
  mackNext: string;
  heatPct: number;
  cooling: boolean;
  saveNote: string;
}

export interface ControlsProbe {
  getYaw: () => number;
  getSpeed: () => number;
  setSteer: (v: number) => void;
  setKeys: (codes: string[]) => void;
}

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __ridgeCity?: {
      getState: () => HudSnapshot;
      jack: () => void;
      act: () => void;
      warp?: (x: number, y: number, angle?: number) => void;
      startTaxiDrop?: () => void;
      forceRadio?: (kind: RadioKind) => void;
      setWanted?: (n: number) => void;
      placeCop?: () => void;
      hold?: (code: string, down: boolean) => void;
    };
  }
}
