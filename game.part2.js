  function setWanted(n) {
    player.wanted = Math.max(0, Math.min(5, n));
    player.heatTimer = player.wanted ? 8 + player.wanted * 4 : 0;
    player.unseen = 0;
    renderWanted();
    if (player.wanted > 0) ensureCops();
  }
  function bumpWanted(n) {
    if (n > player.wanted) setWanted(n);
    else if (n > 0) player.heatTimer = Math.max(player.heatTimer, 6);
  }
  function viewSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return { w: canvas.width / dpr, h: canvas.height / dpr };
  }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    return Math.hypot(cx - nx, cy - ny) < r;
  }
  function resolveBuildings(ent, rad) {
    for (const b of buildings) {
      if (!circleRect(ent.x, ent.y, rad, b.x, b.y, b.w, b.h)) continue;
      const left = ent.x - b.x, right = b.x + b.w - ent.x;
      const top = ent.y - b.y, bot = b.y + b.h - ent.y;
      const m = Math.min(left, right, top, bot);
      if (m === left) ent.x = b.x - rad - 0.5;
      else if (m === right) ent.x = b.x + b.w + rad + 0.5;
      else if (m === top) ent.y = b.y - rad - 0.5;
      else ent.y = b.y + b.h + rad + 0.5;
      if (ent.speed) ent.speed *= 0.35;
    }
    ent.x = Math.max(18, Math.min(WORLD.w - 18, ent.x));
    ent.y = Math.max(18, Math.min(WORLD.h - 18, ent.y));
  }
  function nearestFreeCar(range) {
    let best = null, bestD = range;
    for (const v of parked) {
      if (v.taken || v.cop) continue;
      const d = dist(player.x, player.y, v.x, v.y);
      if (d < bestD) { best = v; bestD = d; }
    }
    return best;
  }
  const holdJack = {
    on: false,
    start() {
      if (!gameStarted || busted) return;
      if (player.vehicle) { exitCar(); toast("BAILED"); return; }
      const v = nearestFreeCar(80);
      if (v) enterCar(v);
      else toast("WALK ONTO THE CAR  ·  TAP E");
    },
    cancel() { this.on = false; player.jacking = 0; },
  };
  function exitCar() {
    const v = player.vehicle;
    if (!v) return;
    v.taken = false; v.speed = 0;
    v.x = player.x + Math.cos(player.angle + Math.PI / 2) * 28;
    v.y = player.y + Math.sin(player.angle + Math.PI / 2) * 28;
    player.vehicle = null;
    document.getElementById("vehicle-chip").textContent = "ON FOOT";
  }
  function enterCar(v) {
    v.taken = true;
    v.speed = Math.max(v.speed, 1.6);
    player.vehicle = v;
    player.x = v.x; player.y = v.y;
    player.angle = v.angle;
    player.jacking = 0;
    holdJack.on = false;
    document.getElementById("vehicle-chip").textContent = v.name;
    toast("YOU'RE IN  ·  HOLD W");
    setTimeout(() => { if (player.vehicle === v) bumpWanted(Math.max(player.wanted, 1)); }, 1400);
    if (currentJob === "boost1" && jobProg === 0) {
      jobProg = 1; markers.length = 0; markers.push({ x: 2980, y: 2580, kind: "drop" }); setJobText();
    }
    if (currentJob === "boost2" && v.type === "sport" && jobProg === 0) {
      jobProg = 1; markers.length = 0; markers.push({ x: 2980, y: 2580, kind: "drop" }); setJobText();
    }
    if (currentJob === "taxi" && v.type === "taxi" && jobProg === 0) {
      jobProg = 1; markers.length = 0; markers.push({ x: 3800, y: 2920, kind: "drop" }); setJobText();
    }
  }
  function tryAct() {
    if (!gameStarted || busted) return;
    if (!player.vehicle) {
      const v = nearestFreeCar(80);
      if (v) { enterCar(v); return; }
    }
    const mack = peds.find((p) => p.kind === "mack");
    if (mack && dist(player.x, player.y, mack.x, mack.y) < 48) { talkMack(); return; }
    for (const s of shops) {
      const b = s.b;
      const doorX = b.x + b.w / 2, doorY = b.y + b.h + 8;
      if (dist(player.x, player.y, doorX, doorY) < 42 || circleRect(player.x, player.y, 16, b.x - 8, b.y - 8, b.w + 16, b.h + 24)) {
        robShop(s); return;
      }
    }
  }
  function robShop(s) {
    if (s.robbed && s.cooldown > 0) { toast("ALREADY HIT"); return; }
    s.robbed = true; s.cooldown = 40;
    const bag = 80 + Math.floor(Math.random() * 70);
    drops.push({ x: player.x, y: player.y, cash: bag, life: 999 });
    addCash(bag);
    bumpWanted(Math.max(player.wanted, 2));
    toast("ALARM  ·  +$" + bag);
    if (currentJob === "shop1" && s.b.label === "SLICE CO." && jobProg === 0) {
      jobProg = 1; markers.length = 0; markers.push({ x: 2980, y: 2580, kind: "drop" }); setJobText();
    }
    if (currentJob === "shop2" && (s.b.label === "MART" || s.b.label === "POST")) {
      jobProg++; setJobText();
      if (jobProg >= 2) { markers.length = 0; markers.push({ x: 2980, y: 2580, kind: "drop" }); }
    }
    if (currentJob === "finale" && s.b.label === "ARCADE" && jobProg === 0) {
      jobProg = 1; markers.length = 0; markers.push({ x: 2920, y: 2680, kind: "mack" }); setJobText();
    }
  }
  function talkMack() {
    if (currentJob === "meet") { advanceJob(); return; }
    if (currentJob === "evade" && jobProg >= 1 && player.wanted === 0) { advanceJob(); return; }
    if (currentJob === "finale" && jobProg >= 1 && player.wanted === 0) { advanceJob(); return; }
    if (["boost1", "boost2", "shop1", "shop2"].includes(currentJob)) {
      const nearDrop = dist(player.x, player.y, 2980, 2580) < 90;
      if (nearDrop && jobProg >= (currentJob === "shop2" ? 2 : 1)) {
        if (currentJob.startsWith("boost") && !player.vehicle) { toast("BRING THE CAR"); return; }
        advanceJob(); return;
      }
    }
    toast("MACK  ·  " + jobs[currentJob].text, 2400);
  }
  function advanceJob() {
    const j = jobs[currentJob];
    if (j.pay) { addCash(j.pay); toast("JOB DONE  ·  +$" + j.pay); }
    else toast("MACK  ·  FIRST JOB'S A BOOST");
    const idx = jobOrder.indexOf(currentJob);
    const next = jobOrder[idx + 1];
    markers.length = 0;
    if (!next) {
      currentJob = "done";
      document.getElementById("mission-text").textContent = "Mack's quiet. City's still open. Keep boosting.";
      return;
    }
    currentJob = next; jobProg = 0; jobNeed = next === "shop2" ? 2 : 1; targetCar = null;
    if (next === "boost2") {
      const sport = parked.find((c) => c.type === "sport" && !c.taken);
      if (sport) markers.push({ x: sport.x, y: sport.y, kind: "car" });
    }
    if (next === "shop1") markers.push({ x: 560 + 105, y: 1680 + 170, kind: "shop" });
    if (next === "shop2") {
      markers.push({ x: 3440 + 100, y: 1680 + 160, kind: "shop" });
      markers.push({ x: 1180 + 90, y: 1180 + 150, kind: "shop" });
    }
    if (next === "taxi") {
      const taxi = parked.find((c) => c.type === "taxi" && !c.taken);
      if (taxi) markers.push({ x: taxi.x, y: taxi.y, kind: "car" });
    }
    if (next === "finale") markers.push({ x: 2580 + 105, y: 1080 + 160, kind: "shop" });
    if (next === "boost1" || next === "evade") markers.push({ x: 2920, y: 2680, kind: "mack" });
    setJobText();
  }
  function snapRoadX(x) { return Math.round((x - 48) / 400) * 400 + 48; }
  function snapRoadY(y) { return Math.round((y - 48) / 400) * 400 + 48; }
  function onVertRoad(x) { return Math.abs((x % 400) - 48) < 42; }
  function onHorzRoad(y) { return Math.abs((y % 400) - 48) < 42; }
  function copSteerTarget(c) {
    const close = dist(c.x, c.y, player.x, player.y) < (difficulty === "beginner" ? 70 : 90);
    if (close) return { x: player.x, y: player.y };
    const gx = snapRoadX(player.x), gy = snapRoadY(player.y);
    const v = onVertRoad(c.x), h = onHorzRoad(c.y);
    if (!v && !h) {
      const dx = Math.abs((c.x % 400) - 48), dy = Math.abs((c.y % 400) - 48);
      return dx <= dy ? { x: snapRoadX(c.x), y: c.y } : { x: c.x, y: snapRoadY(c.y) };
    }
    if (v && Math.abs(c.y - gy) > 28) return { x: snapRoadX(c.x), y: gy };
    if (h && Math.abs(c.x - gx) > 28) return { x: gx, y: snapRoadY(c.y) };
    return { x: gx, y: gy };
  }
  function ensureCops() {
    const need = Math.min(1 + player.wanted, difficulty === "beginner" ? 3 : 5);
    while (cops.filter((c) => c.alive).length < need) spawnCop();
  }
  function spawnCop() {
    const vs = viewSize();
    const side = Math.floor(Math.random() * 4);
    let x = camera.x, y = camera.y;
    if (side === 0) { x = camera.x + Math.random() * vs.w; y = camera.y - 80; }
    if (side === 1) { x = camera.x + Math.random() * vs.w; y = camera.y + vs.h + 80; }
    if (side === 2) { x = camera.x - 80; y = camera.y + Math.random() * vs.h; }
    if (side === 3) { x = camera.x + vs.w + 80; y = camera.y + Math.random() * vs.h; }
    x = snapRoadX(Math.max(40, Math.min(WORLD.w - 40, x)));
    y = snapRoadY(Math.max(40, Math.min(WORLD.h - 40, y)));
    const easy = difficulty === "beginner";
    cops.push({ x, y, angle: 0, speed: 0, w: 34, h: 17, max: (easy ? 2.15 : 3.05) + player.wanted * (easy ? 0.06 : 0.1), acc: easy ? 0.07 : 0.11, turn: easy ? 0.045 : 0.055, alive: true, color: "#d8dde2", type: "cop" });
  }
  function knockPed(p) {
    if (p.kind === "mack" || p.down > 0) return;
    p.down = 1.4;
    if (p.kind === "civ") bumpWanted(Math.max(player.wanted, 1));
  }
  function doBust() {
    if (busted) return;
    busted = true; holdJack.cancel();
    const fine = Math.min(player.cash, 80 + player.wanted * 40);
    player.cash -= fine;
    document.getElementById("cash").textContent = player.cash;
    document.getElementById("bust-detail").textContent = fine ? `Caught. They kept $${fine}.` : "Caught. Walk from lockup.";
    document.getElementById("bust-screen").classList.remove("hidden");
    if (player.vehicle) {
      player.vehicle.taken = false; player.vehicle.speed = 0; player.vehicle = null;
      document.getElementById("vehicle-chip").textContent = "ON FOOT";
    }
    cops.length = 0; setWanted(0);
  }
  document.getElementById("btn-respawn").addEventListener("click", () => {
    document.getElementById("bust-screen").classList.add("hidden");
    player.x = lockup.x; player.y = lockup.y; player.angle = 0; busted = false; toast("RELEASED");
  });
  function inputVec() {
