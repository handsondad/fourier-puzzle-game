import assert from "node:assert/strict";
import { test } from "node:test";
import { HEARD, lockAt, RADIO_COUNT, radioRound, tune } from "../src/lib/radio.ts";
import { distinct, RECIPE_COUNT, recipeRound } from "../src/lib/recipe.ts";

function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
const unique = (list) => new Set(list).size === list.length;

test("调台收音机：三个不同的电台，转到就听得见，空的地方一点声音也没有", () => {
  for (const seed of seeds) {
    const stations = radioRound(seeded(seed));
    assert.equal(stations.length, RADIO_COUNT);
    assert.ok(unique(stations.map((s) => s.k)));
    assert.ok(unique(stations.map((s) => s.program.name)));
    for (const s of stations) {
      const { strength } = tune(stations, s.k);
      assert.ok(Math.abs(strength - s.amp) < 1e-6, `${s.k} 号台强度 ${strength}`);
      assert.equal(lockAt(stations, s.k).kind, "found");
    }
    for (let k = 1; k <= 12; k++) {
      if (stations.some((s) => s.k === k)) continue;
      assert.ok(tune(stations, k).strength < 1e-6);
      assert.equal(lockAt(stations, k).kind, "empty");
    }
    const near = stations[0].k + 0.2;
    assert.ok(tune(stations, near).strength >= HEARD, "电台旁边也听得到一点");
  }
});

test("波形配方：8 道题，三个选项，答案在里面，选项长得不一样", () => {
  for (const seed of seeds) {
    const round = recipeRound(seeded(seed));
    assert.equal(round.length, RECIPE_COUNT);
    round.forEach((q, i) => {
      assert.equal(q.options.length, 3, `第 ${i + 1} 题`);
      assert.ok(q.options.includes(q.answer));
      for (const a of q.options) for (const b of q.options) if (a !== b) assert.ok(distinct(a, b));
      assert.ok(unique(q.answer.map((w) => w.n)));
    });
    assert.deepEqual(round.map((q) => q.answer.length), [1, 1, 1, 2, 2, 2, 3, 3]);
  }
});
