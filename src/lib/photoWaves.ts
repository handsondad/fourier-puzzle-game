import { shuffle, type Random } from "./fourier.ts";

/** 一张小画是 16×16 个小方格，一共 256 个格，刚好拆成 256 张二维条纹波。 */
export const PHOTO_SIZE = 16;
export const PHOTO_TOTAL = PHOTO_SIZE * PHOTO_SIZE;

export type PhotoFilter = "compress" | "low" | "high";

export type WaveTerm = {
  /** 横着起伏几次（0 到 15） */
  u: number;
  /** 竖着起伏几次（0 到 15） */
  v: number;
  /** 这张条纹波在图里占多少（正负代表明暗反没反） */
  weight: number;
};

/** 预计算 16×16 正交离散余弦矩阵 D：D[u][x] = α(u)·cos(π(2x+1)u / 2N)。 */
const BASIS: readonly (readonly number[])[] = Array.from({ length: PHOTO_SIZE }, (_, k) => {
  const scale = k === 0 ? Math.sqrt(1 / PHOTO_SIZE) : Math.sqrt(2 / PHOTO_SIZE);
  return Array.from({ length: PHOTO_SIZE }, (_, x) => scale * Math.cos((Math.PI * (2 * x + 1) * k) / (2 * PHOTO_SIZE)));
});

/** 把 16×16 的图拆成 16×16 个二维余弦条纹波系数：C[v * N + u]，u 是横向次数，v 是纵向次数。 */
export function decomposePhoto(pixels: readonly number[]): number[] {
  const N = PHOTO_SIZE;
  const temp = new Array<number>(PHOTO_TOTAL).fill(0);
  for (let y = 0; y < N; y++) {
    for (let u = 0; u < N; u++) {
      let sum = 0;
      const row = BASIS[u];
      for (let x = 0; x < N; x++) sum += pixels[y * N + x] * row[x];
      temp[y * N + u] = sum;
    }
  }
  const coeffs = new Array<number>(PHOTO_TOTAL).fill(0);
  for (let v = 0; v < N; v++) {
    const col = BASIS[v];
    for (let u = 0; u < N; u++) {
      let sum = 0;
      for (let y = 0; y < N; y++) sum += temp[y * N + u] * col[y];
      coeffs[v * N + u] = sum;
    }
  }
  return coeffs;
}

/** 把选出来的二维条纹波系数叠回 16×16 的图。 */
export function composePhoto(coeffs: readonly number[]): number[] {
  const N = PHOTO_SIZE;
  const temp = new Array<number>(PHOTO_TOTAL).fill(0);
  for (let y = 0; y < N; y++) {
    for (let u = 0; u < N; u++) {
      let sum = 0;
      for (let v = 0; v < N; v++) sum += coeffs[v * N + u] * BASIS[v][y];
      temp[y * N + u] = sum;
    }
  }
  const pixels = new Array<number>(PHOTO_TOTAL).fill(0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let sum = 0;
      for (let u = 0; u < N; u++) sum += temp[y * N + u] * BASIS[u][x];
      pixels[y * N + x] = sum;
    }
  }
  return pixels;
}

/** 单独画出 (u, v) 那一张条纹毯子，范围归一化到 -1…1，方便看清横竖斜条纹。 */
export function basisStripe(u: number, v: number): number[] {
  const N = PHOTO_SIZE;
  const out = new Array<number>(PHOTO_TOTAL);
  for (let y = 0; y < N; y++) {
    const cy = u === 0 && v === 0 ? 0.6 : Math.cos((Math.PI * (2 * y + 1) * v) / (2 * N));
    for (let x = 0; x < N; x++) {
      const cx = u === 0 && v === 0 ? 1 : Math.cos((Math.PI * (2 * x + 1) * u) / (2 * N));
      out[y * N + x] = cx * cy;
    }
  }
  return out;
}

/** 按模式挑选要留下的条纹波下标（0..255），返回保留的掩码。 */
export function selectWaveMask(coeffs: readonly number[], mode: PhotoFilter, count: number): boolean[] {
  const keep = Math.max(1, Math.min(PHOTO_TOTAL, Math.round(count)));
  const indices = Array.from({ length: PHOTO_TOTAL }, (_, i) => i);

  if (mode === "compress") {
    indices.sort((a, b) => {
      if (a === 0) return -1;
      if (b === 0) return 1;
      return Math.abs(coeffs[b]) - Math.abs(coeffs[a]) || a - b;
    });
  } else if (mode === "low") {
    indices.sort((a, b) => {
      const ua = a % PHOTO_SIZE, va = Math.floor(a / PHOTO_SIZE);
      const ub = b % PHOTO_SIZE, vb = Math.floor(b / PHOTO_SIZE);
      return ua * ua + va * va - (ub * ub + vb * vb) || ua + va - (ub + vb) || a - b;
    });
  } else {
    // 只留快波（抓边缘）：去掉平均值 (0,0) 和慢波，从最快的条纹往回选
    indices.sort((a, b) => {
      if (a === 0) return 1;
      if (b === 0) return -1;
      const ua = a % PHOTO_SIZE, va = Math.floor(a / PHOTO_SIZE);
      const ub = b % PHOTO_SIZE, vb = Math.floor(b / PHOTO_SIZE);
      return ub * ub + vb * vb - (ua * ua + va * va) || b - a;
    });
  }

  const mask = new Array<boolean>(PHOTO_TOTAL).fill(false);
  for (let i = 0; i < keep; i++) mask[indices[i]] = true;
  if (mode === "high") mask[0] = false;
  return mask;
}

/** 用选中的条纹波重建图像，并算出保留了多少画面细节能量（0..1）。 */
export function filterPhoto(coeffs: readonly number[], mode: PhotoFilter, count: number): {
  pixels: number[];
  mask: boolean[];
  kept: number;
  quality: number;
} {
  const mask = selectWaveMask(coeffs, mode, count);
  const filtered = coeffs.map((c, i) => (mask[i] ? c : 0));
  const raw = composePhoto(filtered);
  // 只留快波时没有平均亮度，加 0.5 让正负边缘都能看清
  const pixels = mode === "high"
    ? raw.map((v) => Math.max(0, Math.min(1, 0.5 + v * 1.35)))
    : raw.map((v) => Math.max(0, Math.min(1, v)));

  let totalVar = 0;
  let keptVar = 0;
  for (let i = 1; i < PHOTO_TOTAL; i++) {
    const e = coeffs[i] * coeffs[i];
    totalVar += e;
    if (mask[i]) keptVar += e;
  }
  const quality = totalVar < 1e-9 ? 1 : Math.sqrt(keptVar / totalVar);
  const kept = mask.filter(Boolean).length;
  return { pixels, mask, kept, quality };
}

// ———————————————————— 迷雾显影小游戏 ————————————————————

export type PhotoItem = {
  id: string;
  emoji: string;
  name: string;
  pixels: readonly number[];
};

/** 每一档给你几个慢波：越早认出来，说明越懂慢波抓大轮廓。 */
export const FOCUS_STAGES = [5, 12, 28, 72] as const;
export const FOCUS_COUNT = 6;

export type FocusQuestion = {
  key: string;
  answer: PhotoItem;
  options: PhotoItem[];
};

export function focusRound(pool: readonly PhotoItem[], random: Random = Math.random): FocusQuestion[] {
  const targets = shuffle(pool, random).slice(0, FOCUS_COUNT);
  return targets.map((answer, i) => {
    const others = shuffle(pool.filter((p) => p.id !== answer.id), random).slice(0, 3);
    const options = shuffle([answer, ...others], random);
    return { key: `${i}-${answer.id}`, answer, options };
  });
}

/** 星星：按平均用了几档线索和答对几题来算。满分 18 分（每题一上来就答对得 3 分，加一次波少 1 分，最少 1 分）。 */
export const focusPoints = (stage: number) => Math.max(1, 3 - stage);

export function focusStars(points: number, rightCount: number): number {
  if (rightCount >= 5 && points >= 12) return 3;
  if (rightCount >= 4 || points >= 7) return 2;
  return 1;
}
