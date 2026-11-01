import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const world = readFileSync(join(root, "src/game/world.ts"), "utf8");

describe("guided first jobs", () => {
  it("exports GUIDED_STORY_JOBS as the first three story jobs", () => {
    assert.match(world, /export const GUIDED_STORY_JOBS: JobId\[] = \["meet", "boost1", "shop1"\]/);
    const order = world.match(/export const JOB_ORDER: JobId\[] = \[([\s\S]*?)\];/);
    assert.ok(order);
    assert.match(order[1], /"meet"/);
    assert.match(order[1], /"boost1"/);
    assert.match(order[1], /"shop1"/);
  });
});
