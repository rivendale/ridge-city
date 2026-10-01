type Bus = { ctx: AudioContext; master: GainNode; sfx: GainNode; music: GainNode };

let bus: Bus | null = null;
let muted = true;
let musicOn = false;
let musicTimer = 0;
let musicOsc: OscillatorNode[] = [];
let engine: { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
let siren: { a: OscillatorNode; b: OscillatorNode; g: GainNode } | null = null;
let radioIndex = 0;
const STATIONS = ["RIDGE FM", "DOCKS AM", "WEST 91"];

export function unlockAudio() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!bus) {
    const ctx = new Ctx({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    const music = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    sfx.gain.value = 0.9;
    music.gain.value = musicOn && !muted ? 0.22 : 0;
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);
    bus = { ctx, master, sfx, music };
  }
  if (bus.ctx.state === "suspended") void bus.ctx.resume();
  return bus;
}

export function setMuted(m: boolean) {
  muted = m;
  if (!bus) return;
  bus.master.gain.setTargetAtTime(m ? 0 : 0.7, bus.ctx.currentTime, 0.03);
}

export function setMusicOn(on: boolean) {
  musicOn = on;
  if (!bus) return;
  bus.music.gain.setTargetAtTime(on && !muted ? 0.22 : 0, bus.ctx.currentTime, 0.05);
}

export function radioName() {
  return STATIONS[radioIndex];
}

export function cycleRadio() {
  radioIndex = (radioIndex + 1) % STATIONS.length;
  stopMusic();
  return STATIONS[radioIndex];
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number, dest?: GainNode) {
  if (!bus) return;
  const t = bus.ctx.currentTime;
  const o = bus.ctx.createOscillator();
  const g = bus.ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest ?? bus.sfx);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfx(kind: string) {
  if (!bus || muted) return;
  const r = () => 0.92 + Math.random() * 0.16;
  switch (kind) {
    case "jack":
      beep(140 * r(), 0.12, "square", 0.12);
      beep(90, 0.18, "sawtooth", 0.08);
      break;
    case "cash":
      beep(880, 0.08, "triangle", 0.1);
      beep(1320, 0.12, "triangle", 0.08);
      break;
    case "alarm":
      beep(740, 0.18, "square", 0.09);
      beep(520, 0.22, "square", 0.07);
      break;
    case "bust":
      beep(110, 0.4, "sawtooth", 0.16);
      beep(70, 0.5, "sine", 0.12);
      break;
    case "hit":
      beep(70 * r(), 0.08, "square", 0.1);
      break;
    case "horn":
      beep(310, 0.28, "square", 0.14);
      beep(390, 0.28, "square", 0.08);
      break;
    case "spray":
      beep(400, 0.3, "sawtooth", 0.06);
      break;
    case "job":
      beep(520, 0.1, "triangle", 0.1);
      beep(780, 0.16, "triangle", 0.08);
      break;
    case "click":
      beep(240, 0.04, "square", 0.05);
      break;
    default:
      beep(200, 0.06, "triangle", 0.05);
  }
}

export function startEngineLoop() {
  if (!bus || engine) return;
  const osc = bus.ctx.createOscillator();
  const gain = bus.ctx.createGain();
  const filter = bus.ctx.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.value = 40;
  filter.type = "lowpass";
  filter.frequency.value = 400;
  gain.gain.value = 0;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(bus.sfx);
  osc.start();
  engine = { osc, gain, filter };
}

export function updateEngine(speed: number, max: number, inCar: boolean) {
  if (!bus || !engine) return;
  const t = bus.ctx.currentTime;
  if (!inCar) {
    engine.gain.gain.setTargetAtTime(0, t, 0.05);
    return;
  }
  const n = Math.min(1, Math.abs(speed) / Math.max(80, max));
  engine.osc.frequency.setTargetAtTime(42 + n * 140, t, 0.05);
  engine.filter.frequency.setTargetAtTime(280 + n * 900, t, 0.05);
  engine.gain.gain.setTargetAtTime(0.015 + n * 0.05, t, 0.05);
}

export function setSiren(on: boolean) {
  if (!bus) return;
  if (on && !siren) {
    const a = bus.ctx.createOscillator();
    const b = bus.ctx.createOscillator();
    const g = bus.ctx.createGain();
    a.type = "sine";
    b.type = "sine";
    a.frequency.value = 680;
    b.frequency.value = 860;
    g.gain.value = 0.035;
    a.connect(g);
    b.connect(g);
    g.connect(bus.sfx);
    a.start();
    b.start();
    siren = { a, b, g };
  }
  if (!on && siren) {
    try {
      siren.a.stop();
      siren.b.stop();
    } catch {
      /* already stopped */
    }
    siren = null;
  }
}

export function tickSiren(now: number) {
  if (!bus || !siren) return;
  const wob = Math.sin(now / 180) > 0;
  siren.a.frequency.setTargetAtTime(wob ? 720 : 560, bus.ctx.currentTime, 0.04);
  siren.b.frequency.setTargetAtTime(wob ? 920 : 740, bus.ctx.currentTime, 0.04);
}

function stopMusic() {
  for (const o of musicOsc) {
    try {
      o.stop();
    } catch {
      /* ok */
    }
  }
  musicOsc = [];
}

export function tickMusic(dt: number) {
  if (!bus) return;
  musicTimer -= dt;
  if (musicTimer > 0) return;
  stopMusic();
  const t = bus.ctx.currentTime;
  const root = [110, 98, 146][radioIndex];
  const scale = radioIndex === 1 ? [0, 3, 5, 7, 10] : [0, 2, 3, 7, 8];
  const notes = 4 + (radioIndex % 3);
  for (let i = 0; i < notes; i++) {
    const o = bus.ctx.createOscillator();
    const g = bus.ctx.createGain();
    o.type = radioIndex === 2 ? "square" : "triangle";
    const n = scale[(i * 2 + radioIndex) % scale.length];
    o.frequency.value = root * Math.pow(2, n / 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.04 + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 + i * 0.2);
    o.connect(g);
    g.connect(bus.music);
    o.start(t + i * 0.14);
    o.stop(t + 2.1 + i * 0.2);
    musicOsc.push(o);
  }
  musicTimer = 2.4 + radioIndex * 0.3;
}

export function resumeAudio() {
  if (bus && bus.ctx.state === "suspended") void bus.ctx.resume();
}

export function destroyAudio() {
  setSiren(false);
  stopMusic();
  if (engine) {
    try {
      engine.osc.stop();
    } catch {
      /* ok */
    }
    engine = null;
  }
  if (bus) {
    void bus.ctx.close();
    bus = null;
  }
}
