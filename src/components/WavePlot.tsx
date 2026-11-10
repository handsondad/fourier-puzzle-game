import { TAU, type Wave } from "../lib/fourier";

/** 每个号的波用自己的颜色：1 号蓝、2 号绿……拼波、配方、工作台里都一样。 */
export const waveColors = ["#4d96ff", "#3bb273", "#a66cff", "#ff6bd6", "#21a6b5", "#e0a800", "#ff6b6b", "#7a6cff"];
export const colorOf = (n: number) => waveColors[(n - 1) % waveColors.length];
export const SUM_COLOR = "#f07b12";

const W = 800;
const H = 260;
/** 画两个周期，好数波峰；每个周期取 160 段。 */
export const PLOT_PERIODS = 2;
const STEPS = 320;

export const plotValues = (fn: (x: number) => number) =>
  Array.from({ length: STEPS + 1 }, (_, i) => fn((i / STEPS) * TAU * PLOT_PERIODS));

export const plotWaves = (parts: readonly Wave[]) =>
  plotValues((x) => parts.reduce((sum, { n, amp, phase }) => sum + amp * Math.sin(n * x + (phase * Math.PI) / 180), 0));

function toPath(values: readonly number[], yMax: number, height: number) {
  const mid = height / 2;
  const scale = (height / 2 - 10) / yMax;
  return values
    .map((v, i) => {
      const y = Math.max(-6, Math.min(height + 6, mid - v * scale));
      return `${i ? "L" : "M"}${((i / (values.length - 1)) * W).toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
}

type Props = {
  label: string;
  target?: readonly number[];
  noise?: readonly number[];
  parts?: readonly { values: readonly number[]; color: string }[];
  missing?: readonly number[];
  sum?: readonly number[];
  yMax?: number;
  mini?: boolean;
};

/** 一张波形图：灰色粗线是目标，橙色是加起来的总和，细彩线是每个波，虚线是还差的部分。 */
export function WavePlot({ label, target, noise, parts = [], missing, sum, yMax = 2, mini = false }: Props) {
  const height = mini ? 140 : H;
  const unit = (height / 2 - 10) / yMax;
  return (
    <svg className={`wave-plot${mini ? " is-mini" : ""}`} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <g className="plot-grid">
        {!mini && [-1, 1].map((v) => <line key={v} x1="0" x2={W} y1={height / 2 - v * unit} y2={height / 2 - v * unit} className="plot-unit" />)}
        <line x1="0" x2={W} y1={height / 2} y2={height / 2} className="plot-axis" />
        {Array.from({ length: PLOT_PERIODS + 1 }, (_, i) => {
          const x = Math.min(W - 1.5, Math.max(1.5, (i / PLOT_PERIODS) * W));
          return <line key={i} x1={x} x2={x} y1="0" y2={height} className="plot-period" />;
        })}
      </g>
      {target && <path d={toPath(target, yMax, height)} className="plot-target" />}
      {noise && <path d={toPath(noise, yMax, height)} className="plot-noise" />}
      {parts.map((part, i) => <path key={i} d={toPath(part.values, yMax, height)} className="plot-part" style={{ stroke: part.color }} />)}
      {missing && <path d={toPath(missing, yMax, height)} className="plot-missing" />}
      {sum && <path d={toPath(sum, yMax, height)} className="plot-sum" />}
    </svg>
  );
}

type BarsProps = { recipe: readonly Wave[]; nMax?: number; label: string; mini?: boolean };

/** 配方：每个号一根柱子，往上是正的，往下是倒着的。 */
export function RecipeBars({ recipe, nMax = 6, label, mini = false }: BarsProps) {
  const w = 300;
  const h = 150;
  const slot = w / nMax;
  const mid = 66;
  return (
    <svg className={`recipe-bars${mini ? " is-mini" : ""}`} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <line x1="4" x2={w - 4} y1={mid} y2={mid} className="plot-axis" />
      {Array.from({ length: nMax }, (_, i) => {
        const n = i + 1;
        const wave = recipe.find((p) => p.n === n);
        const amp = wave ? wave.amp * Math.cos((wave.phase * Math.PI) / 180) : 0;
        const bar = Math.abs(amp) * 54;
        const x = i * slot + slot * 0.22;
        return (
          <g key={n}>
            {wave && <rect x={x} width={slot * 0.56} y={amp >= 0 ? mid - bar : mid} height={Math.max(bar, 2)} rx="5" fill={colorOf(n)} />}
            <text x={i * slot + slot / 2} y={h - 6} className="bars-n">{n}</text>
          </g>
        );
      })}
    </svg>
  );
}
