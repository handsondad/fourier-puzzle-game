import type { Pt } from "../lib/fourier";

type Props = {
  label: string;
  points: readonly Pt[];
  view: number;
  /** 重心：画一个点，再从中心拉一根箭头过去。 */
  center?: Pt;
  ghost?: readonly Pt[];
  closed?: boolean;
  color?: string;
};

const S = 300;

/** 一张方形的点图：缠绕后的曲线、它的重心和从中心指过去的箭头。 */
export function PointsPlot({ label, points, view, center, ghost, closed = true, color = "#4d96ff" }: Props) {
  const k = (S / 2 - 12) / view;
  const pt = (p: Pt) => `${(S / 2 + p.x * k).toFixed(1)} ${(S / 2 - p.y * k).toFixed(1)}`;
  const d = (list: readonly Pt[]) => list.map((p, i) => `${i ? "L" : "M"}${pt(p)}`).join("") + (closed ? "Z" : "");
  const far = center && Math.hypot(center.x, center.y) * k > 4;
  return (
    <svg className="points-plot" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={label}>
      <line x1="0" x2={S} y1={S / 2} y2={S / 2} className="plot-axis" />
      <line y1="0" y2={S} x1={S / 2} x2={S / 2} className="plot-axis" />
      {ghost && <path d={d(ghost)} className="points-ghost" />}
      <path d={d(points)} className="points-line" style={{ stroke: color }} />
      <circle cx={S / 2} cy={S / 2} r="4" className="points-origin" />
      {center && (
        <g className="points-center">
          {far && <line x1={S / 2} y1={S / 2} x2={S / 2 + center.x * k} y2={S / 2 - center.y * k} />}
          <circle cx={S / 2 + center.x * k} cy={S / 2 - center.y * k} r="8" />
        </g>
      )}
    </svg>
  );
}
