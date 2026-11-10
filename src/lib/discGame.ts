import type { DiscLevel } from "../data/discLevels.ts";
import { shapeMatch, trace, type Disc } from "./fourier.ts";

export const RADIUS = { min: 0, max: 3, step: 0.1 } as const;
export const ANGLE_STEP = 15;
export const K_MAX = 7;
export const DISC_GOAL = 0.85;
const POINTS = 200;

export const startDiscs = (level: DiscLevel): Disc[] => level.slots.map(({ k }) => ({ k, r: 1, angle: 0 }));

export const discMatch = (level: DiscLevel, discs: readonly Disc[]) =>
  shapeMatch(trace(discs, POINTS), trace(level.target, POINTS));

/** 号码定好的盘对上同号的目标盘；号码自己挑的，按顺序分剩下的。 */
export function solveDiscs(level: DiscLevel): Disc[] {
  const spare = level.target.filter((d) => !level.slots.some((s) => !s.free && s.k === d.k));
  return level.slots.map((slot) => ({ ...(slot.free ? spare.shift()! : level.target.find((d) => d.k === slot.k)!) }));
}

const near = (a: Disc, b: Disc, angle: boolean) =>
  a.k === b.k && Math.abs(a.r - b.r) < 0.05 && (!angle || Math.abs(((a.angle - b.angle + 540) % 360) - 180) < 1);

export function rightDiscs(level: DiscLevel, discs: readonly Disc[]): boolean[] {
  const answer = solveDiscs(level);
  return discs.map((d, i) => {
    const same = level.slots[i].free ? answer.find((a) => a.k === d.k) : answer[i];
    return !!same && near(d, same, !!level.angle);
  });
}

export function revealDisc(level: DiscLevel, discs: readonly Disc[]): Disc[] {
  const answer = solveDiscs(level);
  const right = rightDiscs(level, discs);
  const i = right.findIndex((ok) => !ok);
  if (i < 0) return [...discs];
  const taken = new Set(discs.filter((_, j) => right[j]).map((d) => d.k));
  const pick = level.slots[i].free ? answer.find((a) => !taken.has(a.k)) ?? answer[i] : answer[i];
  return discs.map((old, j) => (j === i ? { ...pick } : old));
}

/** 自己挑号时跳过 0 号：0 号盘不转，放在这里没意思。 */
export function stepK(k: number, by: 1 | -1): number {
  let next = k + by;
  if (next === 0) next += by;
  return Math.max(-K_MAX, Math.min(K_MAX, next));
}
