import type { CarType, Difficulty, JobId } from "./types";

const KEY = "ridgecity-save-v1";
const SAVE_VERSION = 2;

export interface SaveBlob {
  version: number;
  cash: number;
  jobId: JobId;
  jobProg: number;
  wanted: number;
  x: number;
  y: number;
  respect: number;
  envelopes: boolean[];
  owned: { type: string; color: string; x: number; y: number }[];
  difficulty: Difficulty;
  hour: number;
  onClock?: boolean;
  savedAt?: number;
  heldJob?: JobId | null;
  ride?: { type: CarType; color: string; angle: number } | null;
}

const defaults: SaveBlob = {
  version: SAVE_VERSION,
  cash: 0,
  jobId: "meet",
  jobProg: 0,
  wanted: 0,
  x: 2780,
  y: 2720,
  respect: 0,
  envelopes: [],
  owned: [],
  difficulty: "beginner",
  hour: 16,
  onClock: true,
};

export function saveStamp() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "";
    const t = (JSON.parse(raw) as { savedAt?: number }).savedAt;
    if (!t) return "";
    return new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}
export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function loadSave(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveBlob>;
    return { ...defaults, ...parsed, version: SAVE_VERSION };
  } catch {
    return null;
  }
}

export function writeSave(blob: SaveBlob) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...blob, version: SAVE_VERSION }));
  } catch {
    /* private mode */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ok */
  }
}

export function loadSettings() {
  const fallback = { shake: true, muted: true, music: false };
  try {
    const raw = localStorage.getItem("ridgecity-settings-v2");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<{ shake: boolean; muted: boolean; music: boolean }>;
    return {
      shake: parsed.shake ?? true,
      muted: parsed.muted ?? true,
      music: parsed.music ?? false,
    };
  } catch {
    return fallback;
  }
}

export function writeSettings(s: { shake: boolean; muted: boolean; music: boolean }) {
  try {
    localStorage.setItem("ridgecity-settings-v2", JSON.stringify(s));
  } catch {
    /* ok */
  }
}
