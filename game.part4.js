    function drawPerson(x, y, angle, color, kind, down) {
      ctx.save();
      ctx.translate(x, y);
      if (down > 0) ctx.rotate(1.15); else ctx.rotate(angle || 0);
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath(); ctx.ellipse(2, 6, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.fillRect(-5, -3, 10, 9);
      ctx.fillStyle = kind === "mack" ? "#d9c39a" : "#d7c4a6";
      ctx.beginPath(); ctx.arc(0, -6, 4.2, 0, Math.PI * 2); ctx.fill();
      if (kind === "mack") {
        ctx.fillStyle = "#1e2a28"; ctx.fillRect(-6, -9, 12, 3);
        ctx.fillStyle = "#d97a32"; ctx.fillRect(-5, -2, 10, 6);
        ctx.restore();
        ctx.font = "700 10px IBM Plex Sans, sans-serif";
        ctx.textAlign = "center"; ctx.fillStyle = "#e8edf2";
        ctx.fillText("MACK", x, y + 16);
        return;
      }
      ctx.restore();
    }
    function hash(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }
    function drawTiles() {
      const T = 24;
      const vs = viewSize();
      const x0 = Math.max(0, Math.floor(camera.x / T));
      const y0 = Math.max(0, Math.floor(camera.y / T));
      const x1 = Math.min(Math.ceil((camera.x + vs.w) / T), Math.ceil(WORLD.w / T));
      const y1 = Math.min(Math.ceil((camera.y + vs.h) / T), Math.ceil(WORLD.h / T));
      for (let ty = y0; ty < y1; ty++) {
        for (let tx = x0; tx < x1; tx++) {
          const x = tx * T, y = ty * T;
          const mx = x % 400, my = y % 400;
          const h = hash(tx, ty);
          if (y > WORLD.h - 170) {
            ctx.fillStyle = (h & 3) ? "#163038" : "#1a3a42";
            ctx.fillRect(x, y, T, T);
            if ((h & 7) === 0) { ctx.fillStyle = "rgba(180,210,220,0.12)"; ctx.fillRect(x + 4, y + 8, 10, 2); }
            continue;
          }
          const road = mx < 96 || my < 96 || (y > WORLD.h - 250 && y < WORLD.h - 162);
          if (road) {
            const curb = mx < 8 || (mx > 88 && mx < 96) || my < 8 || (my > 88 && my < 96);
            ctx.fillStyle = curb ? "#4a4240" : ((h & 7) === 0 ? "#3e454c" : "#3a4148");
            ctx.fillRect(x, y, T, T);
            if (!curb && (h & 15) === 1) { ctx.fillStyle = "#2e343a"; ctx.fillRect(x + 6, y + 10, 5, 3); }
            continue;
          }
          const park = x > 2280 && x < 2760 && y > 1680 && y < 2000;
          if (park) {
            ctx.fillStyle = (h & 2) ? "#243428" : "#2a3a2e";
            ctx.fillRect(x, y, T, T);
            if ((h & 5) === 0) { ctx.fillStyle = "#1e2c22"; ctx.fillRect(x + 8, y + 6, 4, 8); }
            continue;
          }
          const g = (h & 3);
          ctx.fillStyle = g === 0 ? "#1a261c" : g === 1 ? "#1e2a20" : g === 2 ? "#17241c" : "#203024";
          ctx.fillRect(x, y, T, T);
          if ((h & 11) === 0) { ctx.fillStyle = "#2a3a28"; ctx.fillRect(x + (h % 16), y + ((h >> 3) % 16), 3, 5); }
        }
      }
    }
    function drawHouses() {
      for (const b of buildings) {
        if (b.label) continue;
        if (b.x + b.w < camera.x - 20 || b.x > camera.x + viewSize().w + 20) continue;
        if (b.y + b.h < camera.y - 20 || b.y > camera.y + viewSize().h + 20) continue;
        const k = hash(b.x | 0, b.y | 0);
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
        ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(b.x + b.w - 10, b.y, 10, b.h);
        ctx.fillStyle = (k & 1) ? "#3a342c" : "#2a3036";
        ctx.fillRect(b.x + 10, b.y - 8, b.w - 20, 10);
        ctx.fillStyle = "#1a1410"; ctx.fillRect(b.x + b.w / 2 - 7, b.y + b.h - 16, 14, 16);
        ctx.fillStyle = "rgba(232,196,110,0.28)";
        ctx.fillRect(b.x + 14, b.y + 18, 12, 12);
        ctx.fillRect(b.x + b.w - 28, b.y + 18, 12, 12);
        if ((k & 2) === 0) {
          ctx.fillStyle = "#2e343a"; ctx.fillRect(b.x + b.w + 2, b.y + 20, 28, 50);
        } else {
          ctx.fillStyle = "#1e2c22"; ctx.beginPath(); ctx.arc(b.x - 10, b.y + b.h - 8, 8, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    function stallLot(x, y, w, h, cols) {
      ctx.fillStyle = "#2e343a"; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#c9c4a8"; ctx.lineWidth = 1;
      const cw = w / cols;
      for (let i = 0; i < cols; i++) ctx.strokeRect(x + i * cw + 3, y + 4, cw - 6, h - 8);
    }
    function alley(x, y, w, h) { ctx.fillStyle = "#23262a"; ctx.fillRect(x, y, w, h); }
    function labelAt(x, y, t) {
      ctx.font = "700 11px IBM Plex Sans, sans-serif";
      ctx.textAlign = "center"; ctx.fillStyle = "#e8edf2"; ctx.fillText(t, x, y);
    }
    function drawLots() {
      stallLot(2860, 2660, 240, 70, 5);
      stallLot(540, 1850, 230, 64, 4);
      stallLot(3440, 1840, 210, 64, 4);
      stallLot(1480, 2660, 250, 60, 5);
      stallLot(380, 2830, 200, 56, 4);
      alley(560, 1840, 210, 16); alley(3440, 1830, 200, 14);
      alley(1180, 1320, 180, 16); alley(2580, 1230, 210, 16); alley(1480, 2650, 260, 14);
      ctx.fillStyle = "#2a382c"; ctx.fillRect(2180, 1900, 120, 90);
      ctx.fillStyle = "#1e2c22"; ctx.beginPath(); ctx.arc(2240, 1945, 22, 0, Math.PI * 2); ctx.fill();
    }
    function kitBox(x, y, w, h, body) {
      ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(x + 8, y + 10, w, h);
      ctx.fillStyle = body; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x + w - 12, y, 12, h); ctx.fillRect(x, y + h - 8, w, 8);
    }
    function drawLandmarks() {
      kitBox(2260, 1680, 280, 200, "#2a3340");
      ctx.fillStyle = "#3a4654"; ctx.fillRect(2320, 1668, 160, 16);
      ctx.fillStyle = "#1a2028"; ctx.fillRect(2378, 1848, 24, 32);
      ctx.fillStyle = "rgba(232,196,110,0.4)";
      for (let i = 0; i < 5; i++) { ctx.fillRect(2280 + i * 50, 1720, 16, 22); ctx.fillRect(2280 + i * 50, 1760, 16, 22); }
      labelAt(2400, 1868, "CITY HALL");
      kitBox(560, 1680, 210, 160, "#4a2c24");
      ctx.fillStyle = "#c45a2a"; ctx.fillRect(572, 1824, 186, 10);
      ctx.fillStyle = "#1a1410"; ctx.fillRect(648, 1820, 22, 20);
      ctx.fillStyle = "#e8c547"; ctx.fillRect(600, 1690, 130, 22);
      ctx.fillStyle = "#2a1810"; ctx.font = "700 12px IBM Plex Sans, sans-serif"; ctx.textAlign = "center"; ctx.fillText("SLICE CO.", 665, 1706);
      ctx.fillStyle = "rgba(232,196,110,0.45)";
      ctx.fillRect(590, 1730, 18, 16); ctx.fillRect(640, 1730, 18, 16); ctx.fillRect(690, 1730, 18, 16);
      kitBox(2860, 2480, 240, 170, "#3a2424");
      ctx.fillStyle = "#1a1414"; ctx.fillRect(2888, 2590, 70, 50); ctx.fillRect(2970, 2590, 70, 50);
      ctx.fillStyle = "#6a3030"; ctx.fillRect(2888, 2584, 152, 8);
      ctx.fillStyle = "#2a2020"; ctx.fillRect(3060, 2500, 28, 90);
      ctx.fillStyle = "#c9a227"; ctx.fillRect(2874, 2490, 90, 16);
      labelAt(2980, 2638, "GARAGE");
      kitBox(400, 2680, 180, 140, "#2b2830");
      ctx.fillStyle = "#1a181c"; ctx.fillRect(430, 2788, 50, 32);
      ctx.strokeStyle = "#6a6a70"; ctx.lineWidth = 2; ctx.strokeRect(430, 2788, 50, 32);
      ctx.fillStyle = "#3a3840"; ctx.fillRect(500, 2690, 64, 50);
      labelAt(490, 2808, "LOCKUP");
      ctx.fillStyle = "#4a3a28"; ctx.fillRect(3720, 2860, 170, 120);
      ctx.fillStyle = "#3a2e20"; for (let i = 0; i < 8; i++) ctx.fillRect(3730 + i * 20, 2860, 8, 120);
      ctx.fillStyle = "#2a2418"; for (let i = 0; i < 5; i++) ctx.fillRect(3734 + i * 32, 2974, 8, 18);
      ctx.fillStyle = "#163038"; ctx.fillRect(3720, 2980, 170, 40);
      labelAt(3805, 2920, "PIER");
      kitBox(3440, 1680, 200, 150, "#24383a");
      ctx.fillStyle = "#c45a2a"; ctx.fillRect(3456, 1814, 168, 8);
      ctx.fillStyle = "#d8dde2"; ctx.fillRect(3510, 1694, 70, 16);
      labelAt(3540, 1816, "MART");
      kitBox(2580, 1080, 210, 150, "#243040");
      ctx.fillStyle = "#2c4fd6"; ctx.fillRect(2620, 1092, 80, 14);
      ctx.fillStyle = "#e23d3d"; ctx.fillRect(2704, 1092, 50, 14);
      labelAt(2685, 1218, "ARCADE");
      kitBox(720, 480, 300, 210, "#3a3228");
      ctx.fillStyle = "#4a4034"; ctx.fillRect(820, 468, 100, 16);
      labelAt(870, 676, "SCHOOL");
      kitBox(3380, 520, 260, 190, "#2c3548");
      ctx.fillStyle = "#3a4658"; ctx.fillRect(3460, 508, 100, 14);
      labelAt(3510, 696, "LIBRARY");
    }
    function drawProps() {
      const props = [[2980,2620,"dump"],[2920,2540,"tire"],[3040,2550,"cone"],[580,1860,"dump"],[3480,1850,"dump"],[1220,1340,"cone"],[3800,2940,"crate"],[430,2760,"cone"],[2260,1640,"sign"],[2580,1260,"dump"],[1760,2180,"tire"],[700,700,"cone"]];
      for (const [x, y, k] of props) {
        ctx.save(); ctx.translate(x, y);
        if (k === "dump") { ctx.fillStyle = "#2f4a38"; ctx.fillRect(-8, -6, 16, 12); ctx.fillStyle = "#24382c"; ctx.fillRect(-9, -8, 18, 3); }
        else if (k === "tire") { ctx.fillStyle = "#1a1c1e"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); }
        else if (k === "cone") { ctx.fillStyle = "#d97a32"; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.fill(); }
        else if (k === "crate") { ctx.fillStyle = "#6a5344"; ctx.fillRect(-7, -6, 14, 12); }
        else { ctx.fillStyle = "#2a3036"; ctx.fillRect(-2, -18, 4, 22); ctx.fillStyle = "#d97a32"; ctx.fillRect(-16, -28, 32, 14); }
        ctx.restore();
      }
    }
    function drawActors() {
      drawTiles();
      drawHouses();
      drawLots();
      drawLandmarks();
      drawProps();
      const pulse = 0.45 + 0.55 * Math.sin(performance.now() / 220);
      for (const m of markers) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(217,122,50,${0.2 + pulse * 0.25})`;
        ctx.arc(m.x, m.y, 20 + pulse * 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = "#d97a32"; ctx.arc(m.x, m.y, 6, 0, Math.PI * 2); ctx.fill();
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
      if (player.jacking > 0 && !player.vehicle) {
        ctx.strokeStyle = "#d97a32"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y - 22, 10, -Math.PI / 2, -Math.PI / 2 + (player.jacking / 0.85) * Math.PI * 2);
        ctx.stroke();
      }
    }
  function drawMinimap() {
    const vs = viewSize();
    const mw = 156, mh = 118, mx = vs.w - mw - 12, my = 12;
    ctx.save(); ctx.globalAlpha = 0.86;
    ctx.fillStyle = "#0b1014"; ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.strokeRect(mx, my, mw, mh);
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
  document.getElementById("btn-start").addEventListener("click", () => {
    document.getElementById("start-screen").classList.add("hidden");
    gameStarted = true; setJobText(); renderWanted(); toast("RIDGE CITY");
    markers.push({ x: 2920, y: 2680, kind: "mack" });
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  setJobText(); renderWanted(); requestAnimationFrame(frame);
})();
