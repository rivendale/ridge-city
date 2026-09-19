/* Ridge City loader — concatenates engine parts, then runs them. */
(async () => {
  const parts = ["game.part1.js", "game.part2.js", "game.part3.js", "game.part4.js"];
  const texts = await Promise.all(parts.map(async (p) => {
    const r = await fetch(p);
    if (!r.ok) throw new Error("missing " + p);
    return r.text();
  }));
  const s = document.createElement("script");
  s.textContent = texts.join("\n");
  document.body.appendChild(s);
})().catch((err) => {
  const pre = document.createElement("pre");
  pre.style.cssText = "color:#e8edf2;padding:24px;font:14px/1.4 monospace";
  pre.textContent = "Engine failed to load: " + err;
  document.body.appendChild(pre);
});
