import { useRef, type PointerEvent } from "react";
import { PHOTO_SIZE } from "../lib/photoWaves";

type Props = {
  label: string;
  pixels: readonly number[];
  /** ink：0..1 白底深墨画；wave：-1..1 蓝白橙条纹波；edge：0..1 以 0.5 为中性底色的边缘图。 */
  palette?: "ink" | "wave" | "edge";
  /** 是否保留微小的方格缝隙，原图用格子感更清楚，叠波图无缝更柔和。 */
  crisp?: boolean;
  /** 给了这个就能在 16×16 方格上按住涂画。 */
  onPaint?: (index: number, erase: boolean) => void;
};

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const rgb = (r: number, g: number, b: number) => `rgb(${r},${g},${b})`;

function inkColor(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  // 暖米白 (255, 250, 242) -> 靛蓝墨色 (38, 58, 110)
  return rgb(lerp(255, 38, t), lerp(250, 58, t), lerp(242, 110, t));
}

function waveColor(v: number): string {
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) {
    // 纯白 (251, 253, 255) -> 暖橙 (240, 123, 18)
    return rgb(lerp(251, 240, t), lerp(253, 123, t), lerp(255, 18, t));
  }
  const s = -t;
  // 纯白 (251, 253, 255) -> 天蓝 (65, 138, 245)
  return rgb(lerp(251, 65, s), lerp(253, 138, s), lerp(255, 245, s));
}

export function PhotoGrid({ label, pixels, palette = "ink", crisp = false, onPaint }: Props) {
  const eraseRef = useRef(false);
  const lastCell = useRef(-1);

  const cellAt = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - box.left) / box.width) * PHOTO_SIZE);
    const y = Math.floor(((event.clientY - box.top) / box.height) * PHOTO_SIZE);
    if (x < 0 || x >= PHOTO_SIZE || y < 0 || y >= PHOTO_SIZE) return -1;
    return y * PHOTO_SIZE + x;
  };

  return (
    <svg
      className={`photo-grid${onPaint ? " is-paintable" : ""}`}
      viewBox={`0 0 ${PHOTO_SIZE} ${PHOTO_SIZE}`}
      role="img"
      aria-label={label}
      onPointerDown={onPaint && ((event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const idx = cellAt(event);
        if (idx < 0) return;
        eraseRef.current = pixels[idx] > 0.5;
        lastCell.current = idx;
        onPaint(idx, eraseRef.current);
      })}
      onPointerMove={onPaint && ((event) => {
        if (lastCell.current < 0) return;
        const idx = cellAt(event);
        if (idx < 0 || idx === lastCell.current) return;
        lastCell.current = idx;
        onPaint(idx, eraseRef.current);
      })}
      onPointerUp={onPaint && (() => { lastCell.current = -1; })}
      onPointerCancel={onPaint && (() => { lastCell.current = -1; })}
    >
      <rect width={PHOTO_SIZE} height={PHOTO_SIZE} fill={palette === "ink" ? "#fffaf2" : "#fbfdff"} />
      {pixels.map((v, i) => {
        const x = i % PHOTO_SIZE;
        const y = Math.floor(i / PHOTO_SIZE);
        const fill = palette === "ink" ? inkColor(v) : palette === "edge" ? waveColor((v - 0.5) * 2) : waveColor(v);
        return crisp ? (
          <rect key={i} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={0.12} fill={fill} />
        ) : (
          <rect key={i} x={x - 0.02} y={y - 0.02} width={1.05} height={1.05} fill={fill} />
        );
      })}
    </svg>
  );
}
