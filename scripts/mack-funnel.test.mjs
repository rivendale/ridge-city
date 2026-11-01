import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
describe("mack funnel", () => {
  it("soft-pulls beginners toward Mack on the meet job", () => {
    const src = readFileSync(join(root, "src/game/engine.ts"), "utf8");
    assert.match(src, /mackNudgeIdle/);
    assert.match(src, /FOLLOW THE ARROW/);
    assert.match(src, /currentJob === "meet"/);
  });
});
