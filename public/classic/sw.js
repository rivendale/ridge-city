const CACHE = "ridge-city-v2";
const ASSETS = ["./", "./index.html", "./style.css", "./game.js", "./game.part1.js", "./game.part2.js", "./game.part3.js", "./game.part4.js", "./manifest.json", "./icon.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
