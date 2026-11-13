import assert from "node:assert/strict";
import { test } from "node:test";
import { photos } from "../src/data/photos.ts";
import {
  basisStripe, composePhoto, decomposePhoto, filterPhoto, FOCUS_COUNT, FOCUS_STAGES, focusPoints, focusRound, focusStars, PHOTO_TOTAL
} from "../src/lib/photoWaves.ts";

function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

test("照片里的波：二维余弦分解再叠回来，和原图一模一样", () => {
  for (const item of photos) {
    assert.equal(item.pixels.length, PHOTO_TOTAL, item.id);
    const coeffs = decomposePhoto(item.pixels);
    const rebuilt = composePhoto(coeffs);
    for (let i = 0; i < PHOTO_TOTAL; i++) {
      assert.ok(Math.abs(rebuilt[i] - item.pixels[i]) < 1e-12, `${item.name} 像素 ${i}`);
    }
    // 留 32 个最重要的条纹波（只占 12.5%），清晰度已经在 75% 以上
    const compressed = filterPhoto(coeffs, "compress", 32);
    assert.equal(compressed.kept, 32);
    assert.ok(compressed.quality > 0.75, `${item.name} 压缩后清晰度 ${compressed.quality}`);
    assert.ok(filterPhoto(coeffs, "compress", 8).quality < compressed.quality);
  }
});

test("照片里的波：只留快波会去掉平均底色，单张条纹波在 -1 到 1 之间", () => {
  const coeffs = decomposePhoto(photos[1].pixels);
  const edge = filterPhoto(coeffs, "high", 80);
  assert.equal(edge.mask[0], false);
  const stripe = basisStripe(3, 2);
  assert.equal(stripe.length, PHOTO_TOTAL);
  assert.ok(stripe.every((v) => v >= -1 - 1e-9 && v <= 1 + 1e-9));
});

test("迷雾显影：6 道不重复的题，四个不同选项，线索越少得分越高", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const round = focusRound(photos, seeded(seed));
    assert.equal(round.length, FOCUS_COUNT);
    assert.equal(new Set(round.map((q) => q.answer.id)).size, FOCUS_COUNT);
    for (const q of round) {
      assert.equal(q.options.length, 4);
      assert.ok(q.options.some((o) => o.id === q.answer.id));
      assert.equal(new Set(q.options.map((o) => o.id)).size, 4);
    }
  }
  assert.ok(FOCUS_STAGES[0] < FOCUS_STAGES[1] && FOCUS_STAGES[1] < FOCUS_STAGES[2]);
  assert.ok(focusPoints(0) > focusPoints(1) && focusPoints(1) > focusPoints(2));
  assert.equal(focusStars(18, 6), 3);
  assert.equal(focusStars(8, 4), 2);
  assert.equal(focusStars(2, 1), 1);
});
