// Seeded Math.random and a frozen clock, following
// three.js test/e2e/deterministic-injection.js.
// rAF keeps firing so the canvas can paint after images decode.
// Every callback still receives the same timestamp, so the frame does not advance.
(function () {
  if (globalThis._e2eInjected === true) return;
  globalThis._e2eInjected = true;

  Math._random = Math.random;
  let seed = Math.PI / 4;
  Math.random = function () {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  performance._now = performance.now;
  const now = () => 0;
  Date.now = now;
  Date.prototype.getTime = now;
  performance.now = now;

  const nativeFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (callback) {
    return nativeFrame(function () {
      callback(now());
    });
  };

  window.TESTING = true;
})();
