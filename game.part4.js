    const pulse = 0.45 + 0.55 * Math.sin(performance.now() / 220);
    for (const m of markers) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(217,122,50,${0.2 + pulse * 0.25})`;
      ctx.arc(m.x, m.y, 20 + pulse * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "#d97a32";
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const v of parked) if (!v.taken) drawCar(v, false);
    for (const c of cops) if (c.alive) drawCar(c, true);
    function drawPerson(x, y, angle, color, kind, down) {
      ctx.save();
      ctx.translate(x, y);
      if (down > 0) ctx.rotate(1.15); else ctx.rotate(angle || 0);
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath(); ctx.ellipse(2, 6, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(-5, -3, 10, 9);
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
    function drawActors() {
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
        beam.addColorStop(0, "rgba(255,230,170,0.22)");
        beam.addColorStop(1, "rgba(255,230,170,0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(v.w / 2, -5); ctx.lineTo(v.w / 2 + 72, -22);
        ctx.lineTo(v.w / 2 + 72, 22); ctx.lineTo(v.w / 2, 5);
        ctx.closePath(); ctx.fill(); ctx.restore();
        drawCar(v, false);
      } else {
        drawPerson(player.x, player.y, player.angle, "#2a3a38", "player", 0);
      }
      if (player.jacking > 0 && !player.vehicle) {
        ctx.strokeStyle = "#d97a32"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y - 22, 10, -Math.PI / 2, -Math.PI / 2 + (player.jacking / 0.85) * Math.PI * 2);
        ctx.stroke();
      }
    }
  function drawMinimap() {
    const vs = viewSize();
    const mw = 156, mh = 118;
    const mx = vs.w - mw - 12, my = 12;
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
    ctx.fillStyle = "#e8edf2";
    ctx.beginPath(); ctx.arc(mx + player.x * sx, my + player.y * sy, 3, 0, Math.PI * 2); ctx.fill();
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
