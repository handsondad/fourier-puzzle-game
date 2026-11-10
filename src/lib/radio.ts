import { programs, type Program } from "../data/lines.ts";
import { centroid, rad, shuffle, TAU, type Pt, type Random } from "./fourier.ts";

/** 一个电台：amp · cos(2π·k·t + phase)，一秒钟起伏 k 次。 */
export type Station = { k: number; amp: number; phase: number; program: Program };

export const DIAL = { min: 0.5, max: 12, step: 0.1 } as const;
export const RADIO_COUNT = 3;
/** 重心离中心远到这个程度，就算听得到电台。 */
export const HEARD = 0.3;
const POINTS = 360;

/** 电台之间至少隔 2 格，不然信号强度图上两座山会连成一座。 */
export function radioRound(random: Random = Math.random): Station[] {
  const ks: number[] = [];
  for (const k of shuffle(Array.from({ length: 11 }, (_, i) => i + 1), random)) {
    if (ks.length < RADIO_COUNT && ks.every((other) => Math.abs(other - k) >= 2)) ks.push(k);
  }
  const shows = shuffle(programs, random).slice(0, RADIO_COUNT);
  return ks.map((k, i) => ({
    k,
    amp: 0.8 + Math.floor(random() * 5) * 0.1,
    phase: Math.floor(random() * 12) * 30,
    program: shows[i]
  }));
}

export const signalAt = (stations: readonly Station[], t: number) =>
  stations.reduce((sum, s) => sum + s.amp * Math.cos(TAU * s.k * t + rad(s.phase)), 0);

export type Tuning = { wound: Pt[]; center: Pt; strength: number };

/** 把一秒钟的信号绕在圆上：每个时刻的高低当作离中心的距离，跟着旋钮的频率反着转。 */
export function tune(stations: readonly Station[], dial: number): Tuning {
  const wound = Array.from({ length: POINTS }, (_, j) => {
    const t = j / POINTS;
    const value = signalAt(stations, t);
    const a = -TAU * dial * t;
    return { x: value * Math.cos(a), y: value * Math.sin(a) };
  });
  const center = centroid(wound);
  return { wound, center, strength: 2 * Math.hypot(center.x, center.y) };
}

export type Lock = { kind: "found"; station: Station } | { kind: "near" } | { kind: "empty" };

export function lockAt(stations: readonly Station[], dial: number): Lock {
  const station = stations.find((s) => Math.abs(s.k - dial) < 0.05);
  if (station) return { kind: "found", station };
  return tune(stations, dial).strength >= HEARD ? { kind: "near" } : { kind: "empty" };
}

/** 一次没按错 3 颗星，错一两次 2 颗。差一点点不算错。 */
export const radioStars = (wrong: number) => (wrong === 0 ? 3 : wrong <= 2 ? 2 : 1);
