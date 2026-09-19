    let ix = 0, iy = 0;
    if (keys["arrowleft"] || keys["a"]) ix -= 1;
    if (keys["arrowright"] || keys["d"]) ix += 1;
    if (keys["arrowup"] || keys["w"]) iy -= 1;
    if (keys["arrowdown"] || keys["s"]) iy += 1;
    ix += stick.dx; iy += stick.dy;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    return { ix, iy, len: Math.min(1, len) };
  }
  function update(dt) {
    if (!gameStarted || busted) return;
    for (const s of shops) if (s.cooldown > 0) s.cooldown -= dt;
    if (holdJack.on && !player.vehicle) {
      const v = nearestFreeCar(46);
      if (v) { player.jacking += dt; if (player.jacking >= 0.85) enterCar(v); }
      else player.jacking = 0;
    }
    const { ix, iy, len } = inputVec();
    if (player.vehicle) {
      const v = player.vehicle;
      const throttle = (keys["arrowup"] || keys["w"] || stick.dy < -0.25) ? 1 : 0;
      const brake = (keys["arrowdown"] || keys["s"] || stick.dy > 0.35) ? 1 : 0;
      let steer = 0;
      if (keys["arrowleft"] || keys["a"] || stick.dx < -0.25) steer -= 1;
      if (keys["arrowright"] || keys["d"] || stick.dx > 0.25) steer += 1;
      if (throttle) v.speed = Math.min(v.max, v.speed + v.acc); else v.speed *= 0.985;
      if (brake) v.speed = Math.max(-v.max * 0.35, v.speed - v.acc * 1.4);
      v.speed *= 0.995;
      if (Math.abs(v.speed) > 0.15) v.angle += steer * v.turn * Math.sign(v.speed);
      player.angle = v.angle;
      player.x += Math.cos(v.angle) * v.speed;
      player.y += Math.sin(v.angle) * v.speed;
      v.x = player.x; v.y = player.y;
      resolveBuildings(player, 16);
      v.x = player.x; v.y = player.y;
    } else {
      if (len > 0.08) {
        player.x += ix * player.speed; player.y += iy * player.speed;
        player.angle = Math.atan2(iy, ix);
      }
      resolveBuildings(player, player.r);
    }
    for (const p of peds) {
      if (p.down > 0) { p.down -= dt; continue; }
      p.wander += dt * 0.6;
      p.x += Math.cos(p.wander) * 0.22;
      p.y += Math.sin(p.wander * 0.8) * 0.22;
      p.x += (p.homeX - p.x) * 0.008;
      p.y += (p.homeY - p.y) * 0.008;
      resolveBuildings(p, p.r);
      const d = dist(player.x, player.y, p.x, p.y);
      const hitR = player.vehicle ? 20 : 12;
      if (d < hitR && Math.abs((player.vehicle && player.vehicle.speed) || (len * player.speed)) > 1.2) knockPed(p);
    }
    if (player.wanted <= 0) {
      for (const c of cops) c.alive = false;
    } else {
      ensureCops();
      let seen = false;
      for (const c of cops) {
        if (!c.alive) continue;
        const ang = Math.atan2(player.y - c.y, player.x - c.x);
        let da = ang - c.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        c.angle += Math.max(-c.turn, Math.min(c.turn, da));
        c.speed = Math.min(c.max, c.speed + c.acc);
        c.x += Math.cos(c.angle) * c.speed;
        c.y += Math.sin(c.angle) * c.speed;
        resolveBuildings(c, 14);
        const d = dist(c.x, c.y, player.x, player.y);
        if (d < 520) seen = true;
        if (!player.vehicle && d < 16) doBust();
        if (player.vehicle && d < 24 && Math.abs(player.vehicle.speed) < 1.15) {
          c._pin = (c._pin || 0) + dt;
          if (c._pin > 0.7) doBust();
        } else c._pin = 0;
        if (player.vehicle && d < 30 && Math.abs(player.vehicle.speed) > 2.2) {
          c.speed *= 0.25; player.vehicle.speed *= 0.82;
          bumpWanted(Math.min(5, player.wanted + 1));
        }
      }
      if (seen) { player.unseen = 0; player.heatTimer = Math.max(player.heatTimer, 3); }
      else player.unseen += dt;
      player.heatTimer -= dt;
      if (player.unseen > 7 && player.heatTimer <= 0 && player.wanted > 0) {
        setWanted(player.wanted - 1);
        if (player.wanted === 0) toast("HEAT LOST");
      }
    }
    if (currentJob === "evade" && player.wanted >= 2 && jobProg === 0) {
      jobProg = 1; setJobText(); toast("NOW GO COLD  ·  BACK TO MACK");
      markers.length = 0; markers.push({ x: 2920, y: 2680, kind: "mack" });
    }
    if (currentJob === "taxi" && jobProg >= 1) {
      const m = markers[0];
      if (m && dist(player.x, player.y, m.x, m.y) < 55 && player.vehicle && player.vehicle.type === "taxi") advanceJob();
    }
    if (["boost1", "boost2", "shop1", "shop2"].includes(currentJob)) {
      const need = currentJob === "shop2" ? 2 : 1;
      if (jobProg >= need && dist(player.x, player.y, 2980, 2580) < 70) {
        if (!currentJob.startsWith("boost") || player.vehicle) advanceJob();
      }
    }
    const vs = viewSize();
    camera.x = player.x - vs.w / 2;
    camera.y = player.y - vs.h / 2;
    camera.x = Math.max(0, Math.min(WORLD.w - vs.w, camera.x));
    camera.y = Math.max(0, Math.min(WORLD.h - vs.h, camera.y));
    const hint = document.getElementById("interact-hint");
    const car = !player.vehicle && nearestFreeCar(46);
    const mack = peds.find((p) => p.kind === "mack");
    const nearMack = mack && dist(player.x, player.y, mack.x, mack.y) < 48;
    let shopNear = false;
    for (const s of shops) {
      const b = s.b;
      if (dist(player.x, player.y, b.x + b.w / 2, b.y + b.h + 8) < 42) shopNear = s;
    }
    if (car) {
      hint.classList.remove("hidden");
      const pct = Math.min(100, Math.floor((player.jacking / 0.85) * 100));
      hint.textContent = holdJack.on ? `HOTWIRE ${pct}%` : "HOLD E / JACK  to boost this car";
    } else if (nearMack) {
      hint.classList.remove("hidden"); hint.textContent = "SPACE / ACT  talk to Mack";
    } else if (shopNear) {
      hint.classList.remove("hidden"); hint.textContent = "SPACE / ACT  hit the register";
    } else if (player.vehicle) {
      hint.classList.remove("hidden"); hint.textContent = "E  bail out";
    } else hint.classList.add("hidden");
  }
  function rr(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function drawCar(c, siren) {
    const w = c.w, h = c.h;
    const type = c.type || (siren ? "cop" : "sedan");
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath(); ctx.ellipse(1.5, 2.5, w * 0.48, h * 0.46, 0, 0, Math.PI * 2); ctx.fill();
    const rad = type === "sport" ? 4.2 : type === "van" ? 2.2 : 3;
    const ww = Math.max(5.5, w * 0.2), wh = 3.4;
    ctx.fillStyle = "#141618";
    ctx.fillRect(-w * 0.34, -h / 2 - 1.4, ww, wh);
    ctx.fillRect(w * 0.12, -h / 2 - 1.4, ww, wh);
    ctx.fillRect(-w * 0.34, h / 2 - 2, ww, wh);
    ctx.fillRect(w * 0.12, h / 2 - 2, ww, wh);
    ctx.fillStyle = c.color;
    rr(-w / 2, -h / 2, w, h, rad); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(-w / 2, 0.4, w, h / 2 - 0.4);
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, 2.2);
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1;
    rr(-w / 2, -h / 2, w, h, rad); ctx.stroke();
    const cabinW = type === "van" ? w * 0.46 : type === "sport" ? w * 0.34 : type === "compact" ? w * 0.32 : w * 0.36;
    const cabinX = type === "van" ? -w * 0.04 : type === "sport" ? w * 0.02 : -w * 0.04;
    ctx.fillStyle = "rgba(48, 68, 86, 0.92)";
    rr(cabinX - cabinW / 2, -h / 2 + 2.2, cabinW, h - 4.4, 1.8); ctx.fill();
    ctx.fillStyle = "rgba(210, 228, 240, 0.22)";
    ctx.fillRect(cabinX - cabinW / 2 + 1, -h / 2 + 2.2, Math.max(3, cabinW * 0.32), h - 4.4);
    ctx.fillStyle = "#efe4b4";
    ctx.fillRect(w / 2 - 3.2, -h / 2 + 1.8, 3.2, 3.4);
    ctx.fillRect(w / 2 - 3.2, h / 2 - 5.2, 3.2, 3.4);
    ctx.fillStyle = "#b83a32";
    ctx.fillRect(-w / 2, -h / 2 + 1.8, 2.4, 3.4);
    ctx.fillRect(-w / 2, h / 2 - 5.2, 2.4, 3.4);
    if (type === "taxi") {
      ctx.fillStyle = "#161616"; ctx.fillRect(-5, -h / 2 - 3.8, 10, 4);
      ctx.fillStyle = "#e8c547"; ctx.fillRect(-4, -h / 2 - 3.2, 8, 2.6);
    }
    if (type === "sport") { ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(-w / 2 + 3, -1, w - 8, 2); }
    if (type === "van") { ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, 6, h - 6); }
    if (siren || type === "cop") {
      const on = Math.sin(performance.now() / 85) > 0;
      ctx.fillStyle = "#1a2026"; ctx.fillRect(-7, -h / 2 - 4.4, 14, 4.4);
      ctx.fillStyle = on ? "#e23d3d" : "#2c4fd6"; ctx.fillRect(-6.4, -h / 2 - 3.8, 6, 3.2);
      ctx.fillStyle = on ? "#2c4fd6" : "#e23d3d"; ctx.fillRect(0.4, -h / 2 - 3.8, 6, 3.2);
    }
    ctx.restore();
  }
  function drawWorld() {
    const vs = viewSize();
    const left = camera.x, top = camera.y, right = camera.x + vs.w, bot = camera.y + vs.h;
    ctx.fillStyle = "#1c2420"; ctx.fillRect(left, top, vs.w, vs.h);
    ctx.fillStyle = "#163038"; ctx.fillRect(0, WORLD.h - 160, WORLD.w, 180);
    ctx.fillStyle = "#243428"; rr(2280, 1680, 480, 320, 8); ctx.fill();
    ctx.fillStyle = "#3a4148";
    for (let x = 0; x < WORLD.w; x += 400) ctx.fillRect(x, 0, 96, WORLD.h);
    for (let y = 0; y < WORLD.h; y += 400) ctx.fillRect(0, y, WORLD.w, 96);
    ctx.fillRect(0, WORLD.h - 250, WORLD.w, 88);
    ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 2; ctx.setLineDash([16, 14]);
    for (let x = 0; x < WORLD.w; x += 400) { ctx.beginPath(); ctx.moveTo(x + 48, 0); ctx.lineTo(x + 48, WORLD.h); ctx.stroke(); }
    for (let y = 0; y < WORLD.h; y += 400) { ctx.beginPath(); ctx.moveTo(0, y + 48); ctx.lineTo(WORLD.w, y + 48); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const b of buildings) {
      if (b.x + b.w < left - 10 || b.x > right + 10 || b.y + b.h < top - 10 || b.y > bot + 10) continue;
      ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(b.x, b.y, b.w, 10);
      ctx.fillStyle = "rgba(220,200,140,0.18)";
      const cols = Math.max(2, Math.floor(b.w / 44));
      const rows = Math.max(1, Math.floor((b.h - 24) / 32));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ctx.fillRect(b.x + 12 + c * 40, b.y + 22 + r * 30, 12, 12);
      if (b.label) {
        ctx.fillStyle = "#d5dde4"; ctx.font = "700 11px IBM Plex Sans, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h - 8);
      }
    }
