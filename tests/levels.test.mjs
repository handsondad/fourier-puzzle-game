import assert from "node:assert/strict";
import { test } from "node:test";
import { discLevels } from "../src/data/discLevels.ts";
import { chapters, waveLevels } from "../src/data/waveLevels.ts";
import { DISC_GOAL, discMatch, revealDisc, rightDiscs, solveDiscs, startDiscs } from "../src/lib/discGame.ts";
import { AMP, WAVE_GOAL, matchOf, revealOne, rightChannels, solve, startWaves } from "../src/lib/waveGame.ts";

test("拼波闯关：编号连着，每章都有关", () => {
  assert.deepEqual(waveLevels.map((l) => l.id), waveLevels.map((_, i) => i + 1));
  for (const { id } of chapters) assert.ok(waveLevels.some((l) => l.chapter === id));
});

test("拼波闯关：每一关都拼得上，开局拼不上", () => {
  for (const level of waveLevels) {
    const answer = solve(level);
    const goal = WAVE_GOAL;
    assert.ok(goal > 0.6, `第 ${level.id} 关过关线 ${goal}`);
    assert.ok(matchOf(level, answer) >= goal, `第 ${level.id} 关答案只有 ${matchOf(level, answer)}`);
    assert.ok(matchOf(level, startWaves(level)) < goal, `第 ${level.id} 关一开局就过了`);
    for (const wave of answer) {
      assert.ok(wave.amp >= AMP.min && wave.amp <= AMP.max, `第 ${level.id} 关振幅 ${wave.amp}`);
      assert.ok(level.phase || wave.phase === 0);
    }
    assert.ok(rightChannels(level, answer).every(Boolean), `第 ${level.id} 关答案没全打勾`);
  }
});

test("拼波闯关：差一格也不能糊弄过去（能拼满的关）", () => {
  for (const level of waveLevels.filter((l) => !("shape" in l.target))) {
    const answer = solve(level);
    const biggest = answer.reduce((best, w, i) => (Math.abs(w.amp) > Math.abs(answer[best].amp) ? i : best), 0);
    const off = answer.map((w, i) => (i === biggest ? { ...w, amp: w.amp - Math.sign(w.amp) * 0.15 } : w));
    assert.ok(matchOf(level, off) < WAVE_GOAL, `第 ${level.id} 关差 0.15 也过了`);
  }
});

test("拼波闯关：爸爸一个一个帮忙调，最后一定能过关", () => {
  for (const level of waveLevels) {
    let waves = startWaves(level);
    for (let i = 0; i < level.channels.length; i++) waves = revealOne(level, waves);
    assert.ok(matchOf(level, waves) >= WAVE_GOAL, `第 ${level.id} 关`);
  }
});

test("圆盘画图：每一关答案都画得上，开局和差一点都不行", () => {
  for (const level of discLevels) {
    const answer = solveDiscs(level);
    assert.ok(discMatch(level, answer) >= DISC_GOAL, `第 ${level.id} 关答案只有 ${discMatch(level, answer)}`);
    assert.ok(discMatch(level, startDiscs(level)) < DISC_GOAL, `第 ${level.id} 关一开局就过了`);
    assert.ok(rightDiscs(level, answer).every(Boolean));
    const off = answer.map((d, i) => (i === 0 ? { ...d, r: d.r - 0.3 } : d));
    assert.ok(discMatch(level, off) < DISC_GOAL, `第 ${level.id} 关半径差 0.3 也过了：${discMatch(level, off)}`);
    let discs = startDiscs(level);
    for (let i = 0; i < level.slots.length; i++) discs = revealDisc(level, discs);
    assert.ok(discMatch(level, discs) >= DISC_GOAL);
  }
});
