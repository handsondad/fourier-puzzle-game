/** 游戏里用到的全部数学：正弦波相加、圆上套圆、缠绕找重心。 */

export const TAU = Math.PI * 2;
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (radians: number) => (((radians * 180) / Math.PI) % 360 + 360) % 360;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const wrap = (x: number) => ((x % TAU) + TAU) % TAU;

export type Random = () => number;

export function shuffle<T>(list: readonly T[], random: Random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ———————————————————— 正弦波 ————————————————————

/** 一个正弦波：amp · sin(n·x + phase)。n 是几号波（一段里起伏几次），phase 用角度。 */
export type Wave = { n: number; amp: number; phase: number };

export const waveAt = (parts: readonly Wave[], x: number) =>
  parts.reduce((sum, { n, amp, phase }) => sum + amp * Math.sin(n * x + rad(phase)), 0);

/** 比对用的采样点数：一个周期里均匀取这么多个点。 */
export const SAMPLES = 256;

export function sampleFn(fn: (x: number) => number, count = SAMPLES, periods = 1): number[] {
  return Array.from({ length: count }, (_, i) => fn((i / count) * TAU * periods));
}

export const sampleWaves = (parts: readonly Wave[], count = SAMPLES, periods = 1) =>
  sampleFn((x) => waveAt(parts, x), count, periods);

export type Shape = "square" | "saw" | "triangle";

export const shapeNames: Record<Shape, string> = { square: "方波", saw: "锯齿波", triangle: "三角波" };

/** 三种名波，都按"1 号波振幅正好是 1"的大小来画。 */
export const shapeAt: Record<Shape, (x: number) => number> = {
  square: (x) => (wrap(x) < Math.PI ? Math.PI / 4 : -Math.PI / 4),
  saw: (x) => (wrap(x + Math.PI) - Math.PI) / 2,
  triangle: (x) => (Math.PI / 4) * (Math.PI / 2 - Math.abs(wrap(x + Math.PI / 2) - Math.PI))
};

/** 名波的配方：n 号波该有多高。用不到的号返回 0。 */
export function shapeAmp(shape: Shape, n: number): number {
  const odd = n % 2 === 1;
  if (shape === "square") return odd ? 1 / n : 0;
  if (shape === "saw") return (odd ? 1 : -1) / n;
  return odd ? (n % 4 === 1 ? 1 : -1) / (n * n) : 0;
}

export const shapeRecipe = (shape: Shape, count: number): Wave[] =>
  Array.from({ length: count }, (_, i) => ({ n: i + 1, amp: shapeAmp(shape, i + 1), phase: 0 }));

const rms = (values: readonly number[]) => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);

/** 两条波有多像：1 是一模一样。目标是一条平线时，用 0.35 当尺子，免得除以 0。 */
export function waveMatch(mine: readonly number[], target: readonly number[]): number {
  const diff = mine.map((value, i) => value - target[i]);
  return clamp01(1 - rms(diff) / Math.max(rms(target), 0.35));
}

/** 从一条波里量出 n 号波：乘上同频的正弦、余弦再取平均。 */
export function measure(values: readonly number[], n: number): Wave {
  let s = 0;
  let c = 0;
  values.forEach((value, i) => {
    const x = (i / values.length) * TAU;
    s += value * Math.sin(n * x);
    c += value * Math.cos(n * x);
  });
  s = (2 * s) / values.length;
  c = (2 * c) / values.length;
  return { n, amp: Math.hypot(s, c), phase: deg(Math.atan2(c, s)) };
}

// ———————————————————— 圆上套圆 ————————————————————

export type Pt = { x: number; y: number };

/** 一个圆盘：k 号盘一圈时间里逆时针转 k 圈（负数就顺时针），孔打在半径 r、起始角度 angle 的地方。 */
export type Disc = { k: number; r: number; angle: number };

const arm = ({ k, r, angle }: Disc, t: number): Pt => {
  const a = TAU * k * t + rad(angle);
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
};

export function discPoint(discs: readonly Disc[], t: number): Pt {
  let x = 0;
  let y = 0;
  for (const disc of discs) {
    const p = arm(disc, t);
    x += p.x;
    y += p.y;
  }
  return { x, y };
}

/** 一节节接起来的箭头：从原点出发，每个圆盘的中心接在上一个的孔上。 */
export function discChain(discs: readonly Disc[], t: number): Pt[] {
  const joints: Pt[] = [{ x: 0, y: 0 }];
  for (const disc of discs) {
    const last = joints[joints.length - 1];
    const p = arm(disc, t);
    joints.push({ x: last.x + p.x, y: last.y + p.y });
  }
  return joints;
}

export const trace = (discs: readonly Disc[], count = SAMPLES): Pt[] =>
  Array.from({ length: count }, (_, i) => discPoint(discs, i / count));

/** 按时间等分取的点，求平均位置。 */
export function centroid(points: readonly Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** 反着缠 k 圈：第 j 个点（时间 j/M）往回转 2πk·j/M。k 可以是小数，用来做动画。 */
export function wind(points: readonly Pt[], k: number): Pt[] {
  return points.map((p, j) => {
    const a = (-TAU * k * j) / points.length;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
  });
}

export const toDisc = (k: number, c: Pt): Disc => ({ k, r: Math.hypot(c.x, c.y), angle: deg(Math.atan2(c.y, c.x)) });

/** 缠绕找重心读出 k 号盘。 */
export const readDisc = (points: readonly Pt[], k: number): Disc => toDisc(k, centroid(wind(points, k)));

/** 把 -kMax…kMax 号盘全读一遍（就是傅里叶级数），按半径从大到小排。 */
export function fourierDiscs(points: readonly Pt[], kMax: number): Disc[] {
  const discs: Disc[] = [];
  for (let k = -kMax; k <= kMax; k++) discs.push(readDisc(points, k));
  return discs.sort((a, b) => b.r - a.r);
}

/** 手画的线按长度均匀重取 count 个点，首尾相接成一圈。 */
export function resample(path: readonly Pt[], count = SAMPLES): Pt[] {
  if (path.length < 2) return path.length ? Array.from({ length: count }, () => path[0]) : [];
  const closed = [...path, path[0]];
  const lengths = [0];
  for (let i = 1; i < closed.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(closed[i].x - closed[i - 1].x, closed[i].y - closed[i - 1].y));
  }
  const total = lengths[lengths.length - 1] || 1;
  const out: Pt[] = [];
  let seg = 1;
  for (let i = 0; i < count; i++) {
    const want = (total * i) / count;
    while (seg < closed.length - 1 && lengths[seg] < want) seg++;
    const span = lengths[seg] - lengths[seg - 1] || 1;
    const f = (want - lengths[seg - 1]) / span;
    const a = closed[seg - 1];
    const b = closed[seg];
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  }
  return out;
}

const nearestAvg = (from: readonly Pt[], to: readonly Pt[]) => {
  let total = 0;
  for (const p of from) {
    let best = Infinity;
    for (const q of to) {
      const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      if (d < best) best = d;
    }
    total += Math.sqrt(best);
  }
  return total / from.length;
};

/** 两条曲线有多像：互相找最近的点，平均隔多远。从哪一点出发画不要紧，只看形状。 */
export function shapeMatch(mine: readonly Pt[], target: readonly Pt[]): number {
  const center = centroid(target);
  const size = Math.sqrt(target.reduce((sum, p) => sum + (p.x - center.x) ** 2 + (p.y - center.y) ** 2, 0) / target.length) || 1;
  const gap = (nearestAvg(mine, target) + nearestAvg(target, mine)) / 2;
  return clamp01(1 - gap / (0.25 * size));
}
