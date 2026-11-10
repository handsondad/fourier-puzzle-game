import { TAU, type Pt } from "./fourier.ts";

/** 行星绕太阳的轨道：半径（地球是 1）和转一圈要几年。轨道都当成正圆。 */
export type Orbit = { a: number; period: number };

/** 托勒密把均轮的半径定成 60 份，本轮按这个比例说多大。 */
export const DEFERENT = 60;
export const EPI_RADIUS = { min: 0, max: 50, step: 0.5 } as const;
export const EPI_SPEED = { min: 0.25, max: 2, step: 0.25 } as const;
export const FIT_GOAL = 0.9;
/** 平均差这么多份，吻合度就是 0。 */
const FIT_SCALE = 15;

export type Epicycle = { r: number; speed: number };

/** 隔多久，地球再追上这颗行星一次，也就是隔多久倒着走一次（年）。 */
export const synodic = ({ period }: Orbit) => 1 / (1 - 1 / period);

/** 地球绕太阳的轨道，换成均轮的份数，就是本轮该有多大。 */
export const trueEpicycle = ({ a }: Orbit): Epicycle => ({ r: DEFERENT / a, speed: 1 });

/** 要看几年：从离冲半个周期开始，看 loops 次倒着走。 */
export const skySpan = (orbit: Orbit, loops: number) => ({ start: -synodic(orbit) / 2, span: loops * synodic(orbit) });

/** 托勒密的画法：本轮中心沿着均轮转，行星在本轮上转。t 是年，t = 0 时行星在冲（离地球最近）。 */
export function ptolemy(orbit: Orbit, epi: Epicycle, t: number): { center: Pt; planet: Pt } {
  const p = (TAU * t) / orbit.period;
  const e = TAU * epi.speed * t + Math.PI;
  const center = { x: DEFERENT * Math.cos(p), y: DEFERENT * Math.sin(p) };
  return { center, planet: { x: center.x + epi.r * Math.cos(e), y: center.y + epi.r * Math.sin(e) } };
}

/** 站在地球上看，行星在哪：行星的位置减去地球的位置（都绕太阳转），单位是均轮的份数。 */
export function seen(orbit: Orbit, t: number): Pt {
  const p = (TAU * t) / orbit.period;
  const e = TAU * t;
  const scale = DEFERENT / orbit.a;
  return {
    x: scale * (orbit.a * Math.cos(p) - Math.cos(e)),
    y: scale * (orbit.a * Math.sin(p) - Math.sin(e))
  };
}

export const skyTimes = (orbit: Orbit, loops: number, count: number) => {
  const { start, span } = skySpan(orbit, loops);
  return Array.from({ length: count }, (_, i) => start + (span * i) / (count - 1));
};

/** 在天上的方向（度），0 到 360。 */
export const longitude = (p: Pt) => ((Math.atan2(p.y, p.x) * 180) / Math.PI + 360) % 360;

/** 这一刻是不是在倒着走：天上的方向在往回转。 */
export function retrograde(orbit: Orbit, t: number) {
  const dt = 1e-3;
  const a = Math.atan2(seen(orbit, t).y, seen(orbit, t).x);
  const b = Math.atan2(seen(orbit, t + dt).y, seen(orbit, t + dt).x);
  return Math.atan2(Math.sin(b - a), Math.cos(b - a)) < 0;
}

/** 托勒密的画法和真正看到的有多像：按同一时刻比位置。 */
export function skyMatch(orbit: Orbit, loops: number, epi: Epicycle) {
  const times = skyTimes(orbit, loops, 240);
  const sq = times.reduce((sum, t) => {
    const a = ptolemy(orbit, epi, t).planet;
    const b = seen(orbit, t);
    return sum + (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }, 0);
  return Math.max(0, Math.min(1, 1 - Math.sqrt(sq / times.length) / FIT_SCALE));
}

export const snapEpicycle = (epi: Epicycle): Epicycle => ({
  r: Math.round(epi.r / EPI_RADIUS.step) * EPI_RADIUS.step,
  speed: Math.round(epi.speed / EPI_SPEED.step) * EPI_SPEED.step
});
