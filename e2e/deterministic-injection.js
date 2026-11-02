// Virtual frame clock for `?seed=` screenshot runs. Installed only by Playwright,
// before the game scripts. Normal visits never load this file.
(() => {
  const raw = new URLSearchParams(location.search).get("seed");
  if (raw == null || !/^\d+$/.test(raw)) return;

  try {
    localStorage.removeItem("ridgecity-save-v1");
    localStorage.setItem(
      "ridgecity-settings-v3",
      JSON.stringify({ shake: true, muted: true, music: false }),
    );
  } catch {
    /* storage unavailable */
  }

  const STEP = 1000 / 60;
  let time = 0;
  const queue = [];
  let nextId = 1;

  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.push({ id, cb });
    return id;
  };

  window.cancelAnimationFrame = (id) => {
    const index = queue.findIndex((item) => item.id === id);
    if (index >= 0) queue.splice(index, 1);
  };

  window.__ridgeAdvance = (frames) => {
    const count = frames >>> 0;
    for (let i = 0; i < count; i++) {
      time += STEP;
      const batch = queue.splice(0, queue.length);
      for (const item of batch) item.cb(time);
    }
    return time;
  };
})();
