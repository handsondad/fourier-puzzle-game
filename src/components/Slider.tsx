import type { CSSProperties } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  /** 角度那样转一圈回到起点。 */
  wrap?: boolean;
  color?: string;
  disabled?: boolean;
};

const tidy = (value: number, step: number) => Math.round(Math.round(value / step) * step * 1000) / 1000;

/** 一根滑块，两头带 − / + 按钮，手指拖不准的时候一格一格点。 */
export function Slider({ label, value, min, max, step, onChange, format = String, wrap = false, color, disabled }: Props) {
  const nudge = (by: number) => {
    let next = tidy(value + by * step, step);
    if (wrap) next = tidy(((next - min) % (max - min + step) + (max - min + step)) % (max - min + step) + min, step);
    onChange(Math.max(min, Math.min(max, next)));
  };
  return (
    <div className="slider" style={color ? ({ "--c": color } as CSSProperties) : undefined}>
      <span className="slider-label">{label}</span>
      <button type="button" className="nudge" onClick={() => nudge(-1)} disabled={disabled || (!wrap && value <= min)} aria-label={`${label}减一点`}>−</button>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label} aria-valuetext={format(value)}
        onChange={(event) => onChange(tidy(Number(event.target.value), step))} />
      <button type="button" className="nudge" onClick={() => nudge(1)} disabled={disabled || (!wrap && value >= max)} aria-label={`${label}加一点`}>+</button>
      <output>{format(value)}</output>
    </div>
  );
}

export const fixed = (digits: number) => (value: number) => (value < 0 ? "−" : "") + Math.abs(value).toFixed(digits);
export const degrees = (value: number) => `${value}°`;
