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

    for (const p of peds) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.down > 0) ctx.rotate(1.2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === "mack") {
        ctx.fillStyle = "#d97a32";
        ctx.fillRect(-3, -p.r - 5, 6, 4);
        ctx.font = "700 10px IBM Plex Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#e8edf2";
        ctx.fillText("MACK", 0, p.r + 12);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (player.vehicle) {
      drawCar.player = true;
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(2, 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#d9c39a";
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e2a28";
      ctx.fillRect(-5, -3, 8, 6);
      ctx.fillStyle = "#d97a32";
      ctx.fillRect(4, -2, 7, 4);
    }
    ctx.restore();
    if (player.vehicle) drawCar(player.vehicle, false);

    if (player.jacking > 0 && !player.vehicle) {
      ctx.strokeStyle = "#d97a32";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 22, 10, -Math.PI / 2, -Math.PI / 2 + (player.jacking / 0.85) * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawMinimap() {
    const vs = viewSize();
    const mw = 156, mh = 118;
    const mx = vs.w - mw - 12, my = 12;
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "#0b1014";
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.strokeRect(mx, my, mw, mh);
    const sx = mw / WORLD.w, sy = mh / WORLD.h;
    ctx.fillStyle = "#2a333a";
    for (const b of buildings) ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
    ctx.fillStyle = "#d97a32";
    for (const m of markers) {
      ctx.beginPath();
      ctx.arc(mx + m.x * sx, my + m.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#e23d3d";
    for (const c of cops) if (c.alive) {
      ctx.fillRect(mx + c.x * sx - 1, my + c.y * sy - 1, 3, 3);
    }
    ctx.fillStyle = "#e8edf2";
    ctx.beginPath();
    ctx.arc(mx + player.x * sx, my + player.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function frame(t) {
    const dt = Math.min(0.033, (t - lastTime) / 1000);
    lastTime = t;
    update(dt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vs = viewSize();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, vs.w, vs.h);
    ctx.clip();
    ctx.translate(-camera.x, -camera.y);
    drawWorld();
    ctx.restore();
    drawMinimap();
    requestAnimationFrame(frame);
  }

  document.getElementById("btn-start").addEventListener("click", () => {
    document.getElementById("start-screen").classList.add("hidden");
    gameStarted = true;
    setJobText();
    renderWanted();
    toast("RIDGE CITY");
    markers.push({ x: 2920, y: 2680, kind: "mack" });
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  setJobText();
  renderWanted();
  requestAnimationFrame(frame);
})();
