/* Ridge City */
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const WORLD = { w: 4800, h: 3600 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();
  const keys = Object.create(null);
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()) || e.key === " ") e.preventDefault();
    if (e.key.toLowerCase() === "e") holdJack.start();
    if (e.key === " " || e.code === "Space") tryAct();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key.toLowerCase() === "e") holdJack.cancel();
  });
  const stick = { active: false, dx: 0, dy: 0, id: null };
  const stickBase = document.getElementById("stick-base");
  const stickKnob = document.getElementById("stick-knob");
  function setStick(nx, ny) {
    const max = 36;
    const len = Math.hypot(nx, ny) || 1;
    const cl = Math.min(len, max);
    stick.dx = (nx / len) * (cl / max);
    stick.dy = (ny / len) * (cl / max);
    stickKnob.style.left = 34 + (nx / len) * cl + "px";
    stickKnob.style.top = 34 + (ny / len) * cl + "px";
  }
  function resetStick() {
    stick.active = false; stick.dx = 0; stick.dy = 0;
    stickKnob.style.left = "34px"; stickKnob.style.top = "34px";
  }
  stickBase.addEventListener("pointerdown", (e) => {
    stick.active = true; stick.id = e.pointerId;
    stickBase.setPointerCapture(e.pointerId);
    const r = stickBase.getBoundingClientRect();
    setStick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
  });
  stickBase.addEventListener("pointermove", (e) => {
    if (!stick.active || e.pointerId !== stick.id) return;
    const r = stickBase.getBoundingClientRect();
    setStick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
  });
  stickBase.addEventListener("pointerup", resetStick);
  stickBase.addEventListener("pointercancel", resetStick);
  document.getElementById("btn-e").addEventListener("pointerdown", () => holdJack.start());
  document.getElementById("btn-e").addEventListener("pointerup", () => holdJack.cancel());
  document.getElementById("btn-e").addEventListener("pointerleave", () => holdJack.cancel());
  document.getElementById("btn-space").addEventListener("click", () => tryAct());
  const buildings = [];
  const shops = [];
  const parked = [];
  const peds = [];
  const cops = [];
  const drops = [];
  const markers = [];
  const skids = [];
  function addBuilding(x, y, w, h, color, label, shop) {
    const b = { x, y, w, h, color, label: label || "", shop: !!shop };
    buildings.push(b);
    if (shop) shops.push({ b, robbed: false, cooldown: 0 });
  }
  addBuilding(2260, 1680, 280, 200, "#2a3340", "CITY HALL");
  addBuilding(720, 480, 300, 210, "#3a3228", "SCHOOL");
  addBuilding(3380, 520, 260, 190, "#2c3548", "LIBRARY");
  addBuilding(560, 1680, 210, 160, "#4a2c24", "SLICE CO.", true);
  addBuilding(3440, 1680, 200, 150, "#24383a", "MART", true);
  addBuilding(1480, 2480, 260, 170, "#2f3d2c", "MARKET", true);
  addBuilding(2860, 2480, 240, 170, "#3a2424", "GARAGE");
  addBuilding(3720, 2860, 170, 120, "#3a3424", "PIER");
  addBuilding(1180, 1180, 180, 140, "#2a2e28", "POST", true);
  addBuilding(2580, 1080, 210, 150, "#243040", "ARCADE", true);
  addBuilding(1760, 2040, 170, 130, "#33281f", "PARTS");
  addBuilding(400, 2680, 180, 140, "#2b2830", "LOCKUP");
  const houseCols = ["#2b3036", "#32302c", "#2c3330", "#353028", "#2a2f38", "#332c2c"];
  [[180,180],[480,200],[180,780],[1080,180],[1620,360],[2140,180],[2580,300],[2980,180],[3780,220],[3960,780],[180,2060],[180,2520],[500,2320],[2060,2920],[2460,3000],[1780,680],[1120,2920],[820,2780],[4000,1680],[4200,2400],[900,900],[2000,400]].forEach(([x, y], i) => addBuilding(x, y, 140, 110, houseCols[i % houseCols.length], ""));
  function carStats(type) {
    return {
      compact: { w: 28, h: 16, acc: 0.18, max: 4.2, turn: 0.07, name: "COMPACT", value: 40 },
      coupe:   { w: 32, h: 16, acc: 0.24, max: 5.2, turn: 0.065, name: "COUPE", value: 90 },
      sedan:   { w: 34, h: 17, acc: 0.16, max: 4.4, turn: 0.055, name: "SEDAN", value: 55 },
      van:     { w: 40, h: 20, acc: 0.12, max: 3.6, turn: 0.045, name: "VAN", value: 70 },
      sport:   { w: 32, h: 16, acc: 0.3,  max: 6.1, turn: 0.075, name: "SPORT", value: 160 },
      taxi:    { w: 34, h: 17, acc: 0.17, max: 4.3, turn: 0.06, name: "TAXI", value: 45 },
    }[type];
  }
  const carColors = ["#8a2d2d", "#2c4a7a", "#2f5a3a", "#c4b48a", "#1f1f22", "#6a3a1e", "#3a3a48", "#b84a2a"];
  function addCar(x, y, type, angle) {
    parked.push({ x, y, angle: angle || 0, type, color: carColors[(x + y) % carColors.length], ...carStats(type), vx: 0, vy: 0, speed: 0, taken: false, cop: false });
  }
  const carSpawns = [[2100,1620,"coupe"],[820,760,"compact"],[1520,1520,"sedan"],[1780,2200,"compact"],[3180,1820,"sport"],[620,1820,"van"],[2920,2660,"coupe"],[3780,2920,"compact"],[1240,380,"taxi"],[3480,780,"sedan"],[420,2620,"sport"],[2240,780,"van"],[980,1680,"coupe"],[2600,1680,"taxi"],[1900,1280,"sport"],[700,2480,"sedan"],[3200,2480,"compact"],[4000,2000,"coupe"],[1400,800,"van"],[2400,2400,"sedan"],[3600,1200,"sport"],[200,1400,"compact"],[4200,900,"taxi"],[3000,600,"sedan"],[1680,2800,"coupe"],[2600,320,"compact"],[800,3200,"van"]];
  carSpawns.forEach(([x, y, t], i) => addCar(x, y, t, (i % 2) * Math.PI / 2));
  function addPed(x, y, kind) {
    peds.push({ x, y, homeX: x, homeY: y, kind: kind || "civ", vx: 0, vy: 0, down: 0, color: kind === "mack" ? "#d97a32" : ["#c4b8a4", "#8a7a6a", "#4a5560", "#6a5344"][(x + y) % 4], wander: Math.random() * Math.PI * 2, r: 8 });
  }
  addPed(2920, 2680, "mack");
  [[900,900],[1600,600],[2000,1600],[2400,2000],[3200,900],[3600,1800],[800,2000],[1200,2600],[2000,2600],[2800,1400],[4000,1400],[600,600],[1800,1000],[3000,2000],[1000,3000],[2200,3000],[3800,2600],[1400,1800],[2600,600],[4200,2200],[400,1800],[3400,3000]].forEach(([x, y]) => addPed(x, y, "civ"));
  const player = { x: 2780, y: 2720, r: 11, angle: 0, speed: 3.55, vehicle: null, cash: 0, wanted: 0, heatTimer: 0, unseen: 0, jacking: 0 };
  const camera = { x: 0, y: 0 };
  const lockup = { x: 490, y: 2760 };
  let gameStarted = false, busted = false, currentJob = "meet", jobProg = 0, jobNeed = 1, targetCar = null, lastTime = performance.now();
  const jobs = {
    meet: { text: "Find Mack behind the garage on the south side.", pay: 0 },
    boost1: { text: "Jack any car and bring it to the garage drop.", pay: 180 },
    shop1: { text: "Hit SLICE CO. Grab the bag. Lose any heat before you bank it at the garage.", pay: 240 },
    boost2: { text: "Boost a SPORT car. Yellow marker. Drop it at the garage.", pay: 320 },
    shop2: { text: "Hit the MART, then the POST. Bank both bags at the garage.", pay: 400 },
    evade: { text: "Get 2 wanted stars (ram a cruiser or trip an alarm), then go cold before returning to Mack.", pay: 280 },
    taxi: { text: "Jack a TAXI and drop the unmarked envelope at the pier.", pay: 260 },
    finale: { text: "One more shop run: ARCADE, then lose the tail and see Mack.", pay: 500 },
  };
  const jobOrder = ["meet", "boost1", "shop1", "boost2", "shop2", "evade", "taxi", "finale"];
  function setJobText() {
    const j = jobs[currentJob];
    const extra = jobNeed > 1 ? `  (${jobProg}/${jobNeed})` : "";
    document.getElementById("mission-text").textContent = (j ? j.text : "City's yours.") + extra;
  }
  function toast(msg, ms = 2000) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), ms);
  }
  function addCash(n) {
    player.cash += n;
    document.getElementById("cash").textContent = player.cash;
  }
  function renderWanted() {
    const el = document.getElementById("wanted");
    el.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const s = document.createElement("div");
      s.className = "star" + (i < player.wanted ? " on" : "");
      el.appendChild(s);
    }
  }
