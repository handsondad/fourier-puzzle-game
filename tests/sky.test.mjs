import assert from "node:assert/strict";
import { test } from "node:test";
import { planets } from "../src/data/sky.ts";
import { EPI_RADIUS, EPI_SPEED, FIT_GOAL, ptolemy, retrograde, seen, skyMatch, skyTimes, snapEpicycle, synodic, trueEpicycle } from "../src/lib/sky.ts";

test("托勒密的天空：均轮加本轮，正好就是从地球上看到的行星", () => {
  for (const planet of planets) {
    for (const t of skyTimes(planet, planet.loops, 50)) {
      const a = ptolemy(planet, trueEpicycle(planet), t).planet;
      const b = seen(planet, t);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-9, `${planet.name} t=${t}`);
    }
  }
});

test("托勒密的天空：离地球最近的时候倒着走，转到太阳另一边时往前走", () => {
  for (const planet of planets) {
    assert.ok(retrograde(planet, 0), `${planet.name}在冲的时候倒着走`);
    assert.ok(!retrograde(planet, synodic(planet) / 2), `${planet.name}在合的时候往前走`);
  }
});

test("托勒密的天空：算出来的本轮和《至大论》里写的差不多", () => {
  for (const planet of planets) assert.ok(Math.abs(trueEpicycle(planet).r - planet.ptolemy) < 0.3, planet.name);
});

test("托勒密的天空：调对了才算拼上，差一格转速、差几格半径都不行", () => {
  for (const planet of planets) {
    const answer = snapEpicycle(trueEpicycle(planet));
    assert.ok(skyMatch(planet, planet.loops, answer) >= FIT_GOAL, `${planet.name}答案`);
    assert.ok(skyMatch(planet, planet.loops, { r: 0, speed: 0.5 }) < FIT_GOAL, `${planet.name}开局`);
    for (const speed of [answer.speed - EPI_SPEED.step, answer.speed + EPI_SPEED.step]) {
      assert.ok(skyMatch(planet, planet.loops, { ...answer, speed }) < FIT_GOAL, `${planet.name}转速 ${speed}`);
    }
    for (const r of [answer.r - 5 * EPI_RADIUS.step, answer.r + 5 * EPI_RADIUS.step]) {
      assert.ok(skyMatch(planet, planet.loops, { ...answer, r }) < FIT_GOAL, `${planet.name}半径 ${r}`);
    }
    assert.ok(answer.r <= EPI_RADIUS.max && answer.speed <= EPI_SPEED.max);
  }
});
