    function drawPerson(x, y, angle, color, kind, down) {
      ctx.save();
      ctx.translate(x, y);
      if (down > 0) ctx.rotate(1.15); else ctx.rotate(angle || 0);
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath(); ctx.ellipse(2, 6, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      if (kind === "player") {
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(-8, -5, 16, 14);
        ctx.fillStyle = "#d97a32"; ctx.fillRect(-7, -4, 14, 12);
        ctx.fillStyle = "#d9c39a"; ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); return;
      }
      ctx.fillStyle = color; ctx.fillRect(-5, -3, 10, 9);
      ctx.fillStyle = kind === "mack" ? "#d9c39a" : "#d7c4a6";
      ctx.beginPath(); ctx.arc(0, -6, 4.2, 0, Math.PI * 2); ctx.fill();
      if (kind === "mack") {
        ctx.fillStyle = "#1e2a28"; ctx.fillRect(-6, -9, 12, 3);
        ctx.fillStyle = "#d97a32"; ctx.fillRect(-5, -2, 10, 6);
        ctx.restore();
        ctx.font = "700 10px IBM Plex Sans, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#e8edf2";
        ctx.fillText("MACK", x, y + 16); return;
      }
      ctx.restore();
    }
    function hash(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }
    function drawTiles() {
      const T = 24; const vs = viewSize();
      const x0 = Math.max(0, Math.floor(camera.x / T));
      const y0 = Math.max(0, Math.floor(camera.y / T));
      const x1 = Math.min(Math.ceil((camera.x + vs.w) / T), Math.ceil(WORLD.w / T));
      const y1 = Math.min(Math.ceil((camera.y + vs.h) / T), Math.ceil(WORLD.h / T));
      for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
        const x = tx * T, y = ty * T, mx = x % 400, my = y % 400, h = hash(tx, ty);
        if (y > WORLD.h - 170) {
          ctx.fillStyle = (h & 3) ? "#163038" : "#1a3a42"; ctx.fillRect(x, y, T, T); continue;
        }
        const road = mx < 96 || my < 96 || (y > WORLD.h - 250 && y < WORLD.h - 162);
        if (road) {
          const curb = mx < 8 || (mx > 88 && mx < 96) || my < 8 || (my > 88 && my < 96);
          ctx.fillStyle = curb ? "#4a4240" : "#3a4148"; ctx.fillRect(x, y, T, T); continue;
        }
        ctx.fillStyle = (h & 2) ? "#1a261c" : "#1e2a20"; ctx.fillRect(x, y, T, T);
      }
    }
    function drawHouses() {
      for (const b of buildings) {
        if (b.label) continue;
        if (b.x + b.w < camera.x - 20 || b.x > camera.x + viewSize().w + 20) continue;
        ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "#1a1410"; ctx.fillRect(b.x + b.w / 2 - 7, b.y + b.h - 16, 14, 16);
      }
    }
    function stallLot(x, y, w, h, cols) {
      ctx.fillStyle = "#2e343a"; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#c9c4a8"; ctx.lineWidth = 1;
      const cw = w / cols;
      for (let i = 0; i < cols; i++) ctx.strokeRect(x + i * cw + 3, y + 4, cw - 6, h - 8);
    }
    function labelAt(x, y, t) {
      ctx.font = "700 13px IBM Plex Sans, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#e8edf2"; ctx.fillText(t, x, y);
    }
    function kitBox(x, y, w, h, body) {
      ctx.fillStyle = body; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x + w - 12, y, 12, h);
    }
    function drawLandmarks() {
      kitBox(2260, 1680, 280, 200, "#2a3340"); labelAt(2400, 1868, "CITY HALL");
      kitBox(560, 1680, 210, 160, "#4a2c24"); ctx.fillStyle = "#e8c547"; ctx.fillRect(600, 1690, 130, 22); labelAt(665, 1706, "SLICE CO.");
      kitBox(2860, 2480, 240, 170, "#3a2424"); ctx.fillStyle = "#1a1414"; ctx.fillRect(2888, 2590, 70, 50); ctx.fillRect(2970, 2590, 70, 50); labelAt(2980, 2638, "GARAGE");
      kitBox(400, 2680, 180, 140, "#2b2830"); labelAt(490, 2808, "LOCKUP");
      ctx.fillStyle = "#4a3a28"; ctx.fillRect(3720, 2860, 170, 120); labelAt(3805, 2920, "PIER");
      kitBox(3440, 1680, 200, 150, "#24383a"); labelAt(3540, 1816, "MART");
      kitBox(2580, 1080, 210, 150, "#243040"); labelAt(2685, 1218, "ARCADE");
      kitBox(720, 480, 300, 210, "#3a3228"); labelAt(870, 676, "SCHOOL");
      kitBox(3380, 520, 260, 190, "#2c3548"); labelAt(3510, 696, "LIBRARY");
      stallLot(2860, 2660, 240, 70, 5);
    }
    function drawActors() {
      drawTiles(); drawHouses(); drawLandmarks();
      const pulse = 0.45 + 0.55 * Math.sin(performance.now() / 220);
      for (const m of markers) {
        ctx.beginPath(); ctx.fillStyle = `rgba(217,122,50,${0.2 + pulse * 0.25})`;
        ctx.arc(m.x, m.y, 28 + pulse * 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = "#d97a32"; ctx.arc(m.x, m.y, 8, 0, Math.PI * 2); ctx.fill();
      }
      for (const v of parked) if (!v.taken) drawCar(v, false);
      for (const c of cops) if (c.alive) drawCar(c, true);
      for (const p of peds) drawPerson(p.x, p.y, p.wander, p.color, p.kind, p.down);
      if (player.vehicle) {
        const v = player.vehicle;
        ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.angle);
        const beam = ctx.createLinearGradient(v.w / 2, 0, v.w / 2 + 70, 0);
        beam.addColorStop(0, "rgba(255,230,170,0.22)"); beam.addColorStop(1, "rgba(255,230,170,0)");
        ctx.fillStyle = beam;
        ctx.beginPath(); ctx.moveTo(v.w / 2, -5); ctx.lineTo(v.w / 2 + 72, -22); ctx.lineTo(v.w / 2 + 72, 22); ctx.lineTo(v.w / 2, 5); ctx.closePath(); ctx.fill();
        ctx.restore(); drawCar(v, false);
      } else drawPerson(player.x, player.y, player.angle, "#2a3a38", "player", 0);
    }
  function drawMinimap() {
    const vs = viewSize(); const mw = 156, mh = 118, mx = vs.w - mw - 12, my = 12;
    ctx.save(); ctx.globalAlpha = 0.86; ctx.fillStyle = "#0b1014"; ctx.fillRect(mx, my, mw, mh);
    const sx = mw / WORLD.w, sy = mh / WORLD.h;
    ctx.fillStyle = "#2a333a";
    for (const b of buildings) ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
    ctx.fillStyle = "#d97a32";
    for (const m of markers) { ctx.beginPath(); ctx.arc(mx + m.x * sx, my + m.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#e23d3d";
    for (const c of cops) if (c.alive) ctx.fillRect(mx + c.x * sx - 1, my + c.y * sy - 1, 3, 3);
    ctx.fillStyle = "#e8edf2"; ctx.beginPath(); ctx.arc(mx + player.x * sx, my + player.y * sy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function frame(t) {
    const dt = Math.min(0.033, (t - lastTime) / 1000);
    lastTime = t; update(dt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vs = viewSize();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, vs.w, vs.h); ctx.clip();
    ctx.translate(-camera.x, -camera.y); drawWorld(); drawActors(); ctx.restore();
    drawMinimap();
    if (player.wanted > 0 && gameStarted && !busted) {
      const g = ctx.createRadialGradient(vs.w/2, vs.h/2, vs.w*0.35, vs.w/2, vs.h/2, vs.w*0.72);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(180,30,30," + (0.12 + player.wanted * 0.05) + ")");
      ctx.fillStyle = g; ctx.fillRect(0, 0, vs.w, vs.h);
    }
    requestAnimationFrame(frame);
  }
  function clockIn(mode) {
    difficulty = mode;
    document.getElementById("start-screen").classList.add("hidden");
    gameStarted = true; setJobText(); renderWanted();
    toast(mode === "beginner" ? "BEGINNER" : "EXPERIENCED");
    markers.push({ x: 2920, y: 2680, kind: "mack" });
  }
  document.getElementById("btn-beginner").addEventListener("click", () => clockIn("beginner"));
  document.getElementById("btn-experienced").addEventListener("click", () => clockIn("experienced"));
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  setJobText(); renderWanted(); requestAnimationFrame(frame);
})();
