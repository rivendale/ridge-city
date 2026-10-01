import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  Map as MapIcon,
  Radio,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createGame, type GameApi } from "./engine";
import type { HudSnapshot } from "./types";
import { CATALOG } from "./world";
import { hasSave, saveStamp } from "./save";

const emptyHud: HudSnapshot = {
  cash: 0,
  vehicle: "ON FOOT",
  wanted: 0,
  jobId: "meet",
  jobText: "Find Mack behind the garage on the south side.",
  toast: "",
  hint: "",
  speed: 0,
  heat: 0,
  hour: 16,
  district: "DOCKS",
  envelopes: 0,
  envelopesTotal: 12,
  radioName: "RIDGE FM",
  paused: false,
  screen: "start",
  bustDetail: "Caught. Walk from lockup.",
  respect: 0,
  hasSave: false,
  ownedCount: 0,
  shake: true,
  muted: true,
  music: false,
  navDist: null,
  navAngle: 0,
  jobLabel: "JOB",
  onClock: true,
  mackNext: "Find Mack",
  heatPct: 0,
  cooling: false,
  saveNote: "",
};

function clockLabel(hour: number) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, "0")} ${ap}`;
}

function padHold(game: RefObject<GameApi | null>, code: string) {
  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    game.current?.hold(code, true);
  };
  const up = () => game.current?.hold(code, false);
  return {
    onPointerDown: down,
    onPointerUp: up,
    onPointerCancel: up,
    onLostPointerCapture: up,
  };
}

function Stick({ game }: { game: RefObject<GameApi | null> }) {
  const zone = useRef<HTMLDivElement>(null);
  const pid = useRef(-1);
  const origin = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0, show: false, ox: 0, oy: 0 });

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pid.current !== -1) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* untrusted pointer */
    }
    const rect = e.currentTarget.getBoundingClientRect();
    pid.current = e.pointerId;
    origin.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setKnob({ x: 0, y: 0, show: true, ox: origin.current.x, oy: origin.current.y });
    game.current?.setStick(0, 0, true);
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pid.current || !zone.current) return;
    e.preventDefault();
    const rect = zone.current.getBoundingClientRect();
    const dx = e.clientX - rect.left - origin.current.x;
    const dy = e.clientY - rect.top - origin.current.y;
    const max = 58;
    const mag = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(max, mag);
    const kx = (dx / mag) * clamped;
    const ky = (dy / mag) * clamped;
    setKnob({ x: kx, y: ky, show: true, ox: origin.current.x, oy: origin.current.y });
    const nx = kx / max;
    const ny = ky / max;
    const m = Math.hypot(nx, ny);
    if (m < 0.18) game.current?.setStick(0, 0, true);
    else {
      const s = (m - 0.18) / 0.82 / m;
      game.current?.setStick(nx * s, ny * s, true);
    }
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pid.current) return;
    pid.current = -1;
    setKnob((k) => ({ ...k, x: 0, y: 0, show: false }));
    game.current?.setStick(0, 0, false);
  };

  return (
    <div
      ref={zone}
      className="stick-zone"
      aria-label="Steer"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {!knob.show && <div className="stick idle" />}
      {knob.show && (
        <div className="stick" style={{ left: knob.ox, top: knob.oy }}>
          <div className="stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
        </div>
      )}
    </div>
  );
}

export function RidgeCity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameApi | null>(null);
  const [stamp] = useState(() => saveStamp());
  const [hud, setHud] = useState<HudSnapshot>({ ...emptyHud, hasSave: hasSave() });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas, setHud);
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const g = gameRef;
  const playing = hud.screen !== "start" && hud.screen !== "settings";

  return (
    <div ref={wrapRef} className="game-root">
      <canvas ref={canvasRef} id="game" width={960} height={540} />

      {playing && hud.screen !== "map" && (
        <div className="hud" aria-hidden={hud.screen !== "play"}>
          <div className="hud-left">
            <div className="hud-chip cash">
              ${hud.cash}
            </div>
            <div className="hud-chip">{hud.vehicle}</div>
            <div className="wanted" aria-label="wanted level">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < hud.wanted ? "star on" : "star"} />
              ))}
            </div>
            {hud.wanted > 0 && (
              <div className={"heat-meter" + (hud.cooling ? " cooling" : "")}>
                <span>{hud.cooling ? "COOLING" : "HEAT"}</span>
                <div className="heat-track">
                  <div className="heat-fill" style={{ width: `${hud.heatPct}%` }} />
                </div>
              </div>
            )}
            <div className="hud-meta">
              <span>{hud.district}</span>
              <span>{clockLabel(hud.hour)}</span>
              <span>{Math.round(hud.speed)} MPH</span>
            </div>
          </div>
          <div className="hud-mission">
            <div className={"mission-label" + (hud.jobLabel === "FREE" ? " free" : "")}>{hud.jobLabel}</div>
            <div className="mission-text">{hud.jobText}</div>
            {hud.navDist != null && hud.screen === "play" && hud.onClock && (
              <div className="nav-line">
                <span className="nav-arrow" style={{ transform: `rotate(${hud.navAngle + Math.PI / 2}rad)` }} />
                <span>{hud.navDist} m</span>
              </div>
            )}
            <div className="hud-meta tight">
              <span>{hud.radioName}</span>
              <span>
                {hud.envelopes}/{hud.envelopesTotal} envelopes
              </span>
            </div>
          </div>
        </div>
      )}

      {hud.toast && <div className="toast">{hud.toast}</div>}
      {hud.hint && hud.screen === "play" && <div className="hint">{hud.hint}</div>}

      {hud.screen === "play" && (
        <div className="controls-hint">
          <span>WASD, arrows, or the stick</span>
          <span>E jack / bail</span>
          <span>SPACE act</span>
          <span>SHIFT slide</span>
          <span>M map</span>
          <span>R radio</span>
        </div>
      )}

      {playing && hud.screen === "play" && (
        <div className="hud-tools">
          <button type="button" className="icon-btn" onClick={() => g.current?.toggleMap()} aria-label="Map">
            <MapIcon size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={() => g.current?.pause()} aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>
      )}

      {hud.screen === "play" && (
        <div className="mobile-controls">
          <Stick game={g} />
          <div className="action-btns">
            <div className="cmd-row">
              <button type="button" className="act sm radio" aria-label="Radio" {...padHold(g, "KeyR")}>
                <Radio size={18} />
                RADIO
              </button>
              <button type="button" className="act sm map" aria-label="Map" {...padHold(g, "KeyM")}>
                <MapIcon size={18} />
                MAP
              </button>
            </div>
            <div className="cmd-row">
              <button type="button" className="act sm brake" aria-label="Brake" {...padHold(g, "ShiftLeft")}>
                BRAKE
              </button>
              <button type="button" className="act jack" aria-label="Jack or bail" {...padHold(g, "KeyE")}>
                JACK
              </button>
            </div>
            <button type="button" className="act go" aria-label="Act" {...padHold(g, "Space")}>
              ACT
            </button>
          </div>
        </div>
      )}

      {hud.screen === "start" && (
        <div className="overlay start">
          <div className="start-card">
            <div className="kicker">AGES 10+ · NO GORE</div>
            <h1>RIDGE CITY</h1>
            <p className="tagline">Boost cars. Lose the tail. Get paid.</p>
            <p className="blurb">
              Top-down open city in the vein of early GTA. Steal parked cars, knock over shops, and
              shake Ridge City PD. People get knocked down and get back up. Nobody dies on screen.
              No guns. No blood.
            </p>
            <ul className="feature-list">
              <li>Jobs from Mack when you want them — or go free and take radio gigs</li>
              <li>Sport slides, a van shoves traffic, a taxi stays calm if you don't ram</li>
              <li>Clear the dock ramp for cash. Your cars stay on the radar</li>
              <li>Wanted stars — hide in Mack's garage or Pay 'n' Spray to lose heat</li>
              <li>Cruisers pin and arrest you; 5 stars they box the block</li>
            </ul>
            <div className="mode-row">
              <button type="button" className="btn primary" onClick={() => g.current?.start("beginner")}>
                Beginner
              </button>
              <button type="button" className="btn ghost" onClick={() => g.current?.start("experienced")}>
                Experienced
              </button>
              {hud.hasSave && (
                <button type="button" className="btn ghost" onClick={() => g.current?.continue()}>
                  Continue{stamp ? ` · ${stamp}` : ""}
                </button>
              )}
              <button type="button" className="btn ghost" onClick={() => g.current?.openSettings()}>
                Settings
              </button>
            </div>
            <p className="fine">
              Sound starts off. Open Settings to turn it on. WASD, arrows, or numpad to drive. Esc pauses.
            </p>
          </div>
        </div>
      )}

      {hud.screen === "bust" && (
        <div className="overlay">
          <div className="start-card bust">
            <div className="kicker">RIDGE CITY PD</div>
            <h2>ARRESTED</h2>
            <p className="blurb">{hud.bustDetail || "Caught. They kept some of the take."}</p>
            <button type="button" className="btn primary" onClick={() => g.current?.respawn()}>
              Walk from lockup
            </button>
          </div>
        </div>
      )}

      {(hud.screen === "pause" || hud.screen === "settings") && (
        <div className="overlay">
          <div className="start-card">
            <div className="kicker">{hud.screen === "settings" ? "OPTIONS" : "PAUSED"}</div>
            <h2>SETTINGS</h2>
            {hud.screen === "pause" && (
              <>
                <p className="blurb">
                  ${hud.cash} on you · {hud.respect} jobs in · {hud.district}
                </p>
                <div className="jobs-strip">
                  <div>
                    <span>NOW</span> {hud.jobLabel} · {hud.jobText}
                  </div>
                  <div>
                    <span>MACK</span> {hud.mackNext}
                  </div>
                  {hud.saveNote && (
                    <div>
                      <span>FILE</span> {hud.saveNote}
                    </div>
                  )}
                </div>
              </>
            )}
            {hud.screen === "settings" && <p className="blurb">Sound is off until you turn it on here.</p>}
            <div className="settings-list">
              <button type="button" className="set-row" onClick={() => g.current?.setMuted(!hud.muted)}>
                <span className="set-label">
                  {hud.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  Sound
                </span>
                <span className={hud.muted ? "set-val off" : "set-val on"}>{hud.muted ? "Off" : "On"}</span>
              </button>
              <button type="button" className="set-row" onClick={() => g.current?.setMusic(!hud.music)}>
                <span className="set-label">
                  <Volume1 size={16} />
                  Radio
                </span>
                <span className={!hud.music ? "set-val off" : "set-val on"}>{hud.music ? "On" : "Off"}</span>
              </button>
              <button type="button" className="set-row" onClick={() => g.current?.setShake(!hud.shake)}>
                <span className="set-label">Camera shake</span>
                <span className={hud.shake ? "set-val on" : "set-val off"}>{hud.shake ? "On" : "Off"}</span>
              </button>
            </div>
            <div className="mode-row">
              {hud.screen === "pause" ? (
                <>
                  <button type="button" className="btn primary" onClick={() => g.current?.pause()}>
                    Resume
                  </button>
                  <button type="button" className="btn ghost" onClick={() => g.current?.saveGame()}>
                    Save game
                  </button>
                  <button type="button" className="btn ghost" onClick={() => g.current?.toggleMap()}>
                    Map
                  </button>
                </>
              ) : (
                <button type="button" className="btn primary" onClick={() => g.current?.openSettings()}>
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {hud.screen === "garage" && (
        <div className="overlay">
          <div className="start-card">
            <div className="kicker">MACK'S LOT</div>
            <h2>GARAGE</h2>
            <p className="blurb">Duck in to lose heat. Buy a beater, paint the one you're in, or get back on the street.</p>
            <div className="catalog">
              {CATALOG.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  className="cat-row"
                  onClick={() => g.current?.buyCar(c.type)}
                >
                  <span>{c.type.toUpperCase()}</span>
                  <span>${c.price}</span>
                </button>
              ))}
            </div>
            <div className="mode-row">
              <button type="button" className="btn ghost" onClick={() => g.current?.paintCar()}>
                Paint $80
              </button>
              <button type="button" className="btn primary" onClick={() => g.current?.closeOverlay()}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {hud.screen === "map" && (
        <button type="button" className="map-close" onClick={() => g.current?.closeOverlay()}>
          Close map
        </button>
      )}
    </div>
  );
}
