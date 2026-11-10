import assert from "node:assert/strict";
import { test } from "node:test";
import {
  centroid, fourierDiscs, measure, readDisc, resample, sampleFn, sampleWaves, shapeAmp, shapeAt, shapeMatch, trace, waveMatch, wind
} from "../src/lib/fourier.ts";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("名波的配方：方波 1/n 只要奇数，锯齿波一正一负，三角波 1/n²", () => {
  for (const shape of ["square", "saw", "triangle"]) {
    const values = sampleFn(shapeAt[shape], 4096);
    for (let n = 1; n <= 7; n++) {
      const { amp, phase } = measure(values, n);
      const signed = Math.abs(phase - 180) < 1 ? -amp : amp;
      close(signed, shapeAmp(shape, n), 2e-3);
    }
  }
});

test("一模一样的波吻合度是 1，差得越多越低", () => {
  const target = sampleWaves([{ n: 1, amp: 1, phase: 0 }]);
  assert.equal(waveMatch(target, target), 1);
  const a = waveMatch(sampleWaves([{ n: 1, amp: 0.9, phase: 0 }]), target);
  const b = waveMatch(sampleWaves([{ n: 1, amp: 0.5, phase: 0 }]), target);
  assert.ok(a > b && b > 0);
});

test("缠绕找重心：反着缠 k 圈，重心就是 k 号盘", () => {
  const discs = [{ k: 1, r: 2, angle: 30 }, { k: -2, r: 1, angle: 90 }, { k: 4, r: 0.5, angle: 200 }];
  const points = trace(discs);
  for (const d of discs) {
    const got = readDisc(points, d.k);
    close(got.r, d.r);
    close(got.angle, d.angle, 1e-6);
  }
  close(readDisc(points, 2).r, 0);
  close(Math.hypot(centroid(points).x, centroid(points).y), 0);
  assert.equal(wind(points, 0)[5].x, points[5].x);
});

test("傅里叶级数：把所有盘读一遍再叠起来，画回原来的曲线", () => {
  const square = resample([{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }]);
  const discs = fourierDiscs(square, 40);
  assert.ok(shapeMatch(trace(discs), square) > 0.95);
  assert.ok(shapeMatch(trace(discs.slice(0, 2)), square) < shapeMatch(trace(discs.slice(0, 12)), square));
});

test("比形状不管从哪一点开始画", () => {
  const a = trace([{ k: 1, r: 2, angle: 0 }, { k: -2, r: 1, angle: 0 }]);
  const shifted = trace([{ k: 1, r: 2, angle: 40 }, { k: -2, r: 1, angle: -80 }]);
  assert.ok(shapeMatch(shifted, a) > 0.9);
  const rotated = trace([{ k: 1, r: 2, angle: 60 }, { k: -2, r: 1, angle: 60 }]);
  assert.ok(shapeMatch(rotated, a) < 0.85);
});
