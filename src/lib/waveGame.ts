import type { WaveLevel } from "../data/waveLevels.ts";
import { measure, rad, sampleFn, sampleWaves, shapeAt, waveAt, waveMatch, type Wave } from "./fourier.ts";

export const AMP = { min: -1.5, max: 1.5, step: 0.05 } as const;
export const PHASE_STEP = 15;
export const N_MAX = 8;

const round = (value: number, step: number) => Math.round(value / step) * step;
const tidy = (value: number) => Math.round(value * 1000) / 1000;

export function targetAt(level: WaveLevel, x: number): number {
  return "shape" in level.target ? shapeAt[level.target.shape](x) : waveAt(level.target.parts, x);
}

export const targetSamples = (level: WaveLevel, count?: number, periods?: number) =>
  sampleFn((x) => targetAt(level, x), count, periods);

/** 玩家听到、看到的总和：自己调的波，加上动不了的噪音。 */
export const sumParts = (level: WaveLevel, waves: readonly Wave[]) => [...(level.noise ?? []), ...waves];

export const startWaves = (level: WaveLevel): Wave[] => level.channels.map(({ n }) => ({ n, amp: 0, phase: 0 }));

/** 把一个波吸到滑块能调到的格子上；不让调相位的关，相位 180° 就当成负振幅。 */
export function snap(wave: Wave, phase: boolean): Wave {
  if (phase) {
    const p = ((round(wave.phase, PHASE_STEP) % 360) + 360) % 360;
    return { n: wave.n, amp: tidy(round(wave.amp, AMP.step)), phase: p };
  }
  const signed = wave.amp * Math.cos(rad(wave.phase));
  return { n: wave.n, amp: tidy(round(signed, AMP.step)), phase: 0 };
}

/** 每个滑块该调到哪：从"目标减去噪音"里，按号量出每个波。 */
export function solve(level: WaveLevel): Wave[] {
  const want = sampleFn((x) => targetAt(level, x) - waveAt(level.noise ?? [], x));
  const fixed = new Set(level.channels.filter((c) => !c.free).map((c) => c.n));
  const spare = Array.from({ length: N_MAX }, (_, i) => measure(want, i + 1))
    .filter((wave) => !fixed.has(wave.n))
    .sort((a, b) => b.amp - a.amp);
  return level.channels.map((channel) => snap(channel.free ? spare.shift()! : measure(want, channel.n), !!level.phase));
}

const rawMatch = (level: WaveLevel, waves: readonly Wave[]) =>
  waveMatch(sampleWaves(sumParts(level, waves)), targetSamples(level));

const best = new Map<number, number>();

/** 名波只用几个波怎么也拼不满，就按"这几个波最多能拼多像"来算，拼到最好就是 100%。 */
export function matchOf(level: WaveLevel, waves: readonly Wave[]): number {
  const raw = rawMatch(level, waves);
  if (!("shape" in level.target)) return raw;
  if (!best.has(level.id)) best.set(level.id, rawMatch(level, solve(level)));
  return Math.min(1, raw / best.get(level.id)!);
}

/** 名波原本能拼到多像（不换算），过关后告诉孩子"只用这几个波，最多这么像"。 */
export const realMatch = rawMatch;

export const WAVE_GOAL = 0.94;

const sameWave = (a: Wave, b: Wave) => {
  const dx = a.amp * Math.cos(rad(a.phase)) - b.amp * Math.cos(rad(b.phase));
  const dy = a.amp * Math.sin(rad(a.phase)) - b.amp * Math.sin(rad(b.phase));
  return Math.hypot(dx, dy) < 0.06;
};

/** 哪几个滑块已经调对了（提示时打勾用）。号码对上、高矮和出发点也对上才算。 */
export function rightChannels(level: WaveLevel, waves: readonly Wave[]): boolean[] {
  const answer = solve(level);
  return waves.map((wave, i) => {
    const same = level.channels[i].free ? answer.find((a) => a.n === wave.n) : answer[i];
    return !!same && same.n === wave.n && sameWave(wave, same);
  });
}

/** 爸爸帮忙把第一个还没对的波调好；号码自己挑的，就挑一个还没人用的号。 */
export function revealOne(level: WaveLevel, waves: readonly Wave[]): Wave[] {
  const answer = solve(level);
  const right = rightChannels(level, waves);
  const i = right.findIndex((ok) => !ok);
  if (i < 0) return [...waves];
  const taken = new Set(waves.filter((_, j) => right[j]).map((wave) => wave.n));
  const wave = level.channels[i].free ? answer.find((a) => !taken.has(a.n)) ?? answer[i] : answer[i];
  return waves.map((old, j) => (j === i ? wave : old));
}

/** 星星：没看提示 3 颗，看了提示 2 颗，让爸爸直接调好一个 1 颗。 */
export const waveStars = (hinted: boolean, revealed: boolean) => (revealed ? 1 : hinted ? 2 : 3);
