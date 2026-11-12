import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { discChain, trace, type Disc, type Pt } from "../lib/fourier";
import { SUM_COLOR } from "./WavePlot";

type Props = {
  label: string;
  discs: readonly Disc[];
  /** 每个圆盘对应的颜色（和右侧控制卡圆点一致）。 */
  colors?: readonly string[];
  /** 灰色的目标图案。 */
  target?: readonly Pt[];
  /** 画面半径（世界单位）。 */
  view?: number;
  /** full：整条轨迹一直显示；trail：笔尖走到哪，线画到哪。 */
  mode?: "full" | "trail";
  /** 转一圈要几秒。 */
  seconds?: number;
  /** 给了这个就能在画面上按住画画，松手时交回画好的点。 */
  onDraw?: (path: Pt[]) => void;
};

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 圆上套圆的舞台：每个圆盘画成一个圈和一根箭头，最后的笔尖画出图案。 */
export function DiscStage({ label, discs, colors, target, view = 3.6, mode = "full", seconds = 8, onDraw }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const path = useMemo(() => trace(discs, 720), [discs]);
  const chainOrder = useMemo(
    () => discs.map((disc, i) => ({ disc, color: colors?.[i] })).sort((a, b) => b.disc.r - a.disc.r),
    [discs, colors]
  );
  const live = useRef({ path, chainOrder, target, view, mode, seconds, drawing: null as Pt[] | null });
  live.current = { ...live.current, path, chainOrder, target, view, mode, seconds };

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const start = performance.now();
    const still = reduceMotion();

    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = el.getBoundingClientRect();
      el.width = Math.round(width * ratio);
      el.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);

    const draw = (now: number) => {
      const { path: points, chainOrder: order, target: goal, view: size, mode: how, seconds: period, drawing } = live.current;
      const { width, height } = el.getBoundingClientRect();
      const scale = (Math.min(width, height) / 2 - 14) / size;
      const px = (p: Pt) => [width / 2 + p.x * scale, height / 2 - p.y * scale] as const;
      const line = (list: readonly Pt[], close: boolean) => {
        ctx.beginPath();
        list.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
        if (close) ctx.closePath();
      };
      ctx.clearRect(0, 0, width, height);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.strokeStyle = "rgba(93, 78, 55, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
      ctx.stroke();

      if (goal?.length) {
        line(goal, true);
        ctx.strokeStyle = "rgba(110, 154, 224, 0.42)";
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.save();
        ctx.setLineDash([5, 5]);
        line(goal, true);
        ctx.strokeStyle = "rgba(74, 122, 198, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      if (drawing) {
        line(drawing, false);
        ctx.strokeStyle = SUM_COLOR;
        ctx.lineWidth = 4;
        ctx.stroke();
        frame = requestAnimationFrame(draw);
        return;
      }

      const t = still ? 0.12 : (((now - start) / 1000 / period) % 1);
      const upto = Math.floor(t * points.length);
      if (how === "full") {
        line(points, true);
        ctx.strokeStyle = SUM_COLOR;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        line(points, true);
        ctx.strokeStyle = "rgba(240, 123, 18, 0.18)";
        ctx.lineWidth = 2;
        ctx.stroke();
        line(points.slice(0, upto + 1), false);
        ctx.strokeStyle = SUM_COLOR;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const joints = discChain(order.map((item) => item.disc), t);
      order.forEach(({ disc: d, color }, i) => {
        const [cx, cy] = px(joints[i]);
        if (d.r * scale > 2) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, d.r * scale, 0, Math.PI * 2);
          if (color) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.36;
          } else {
            ctx.strokeStyle = "rgba(77, 150, 255, 0.3)";
          }
          ctx.lineWidth = 1.7;
          ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(...px(joints[i + 1]));
        if (color) {
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.88;
        } else {
          ctx.strokeStyle = "rgba(61, 52, 40, 0.75)";
        }
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();

        if (d.r * scale > 3) {
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fillStyle = color ?? "rgba(93, 78, 55, 0.65)";
          ctx.fill();
        }
      });

      if (order.length) {
        const [tx, ty] = px(joints[joints.length - 1]);
        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ff6b6b";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    el.addEventListener("fp:redraw", redraw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("fp:redraw", redraw);
    };
  }, []);

  useEffect(() => {
    canvas.current?.dispatchEvent(new Event("fp:redraw"));
  }, [path, chainOrder, target, view, mode]);

  const toWorld = (event: PointerEvent<HTMLCanvasElement>): Pt => {
    const box = event.currentTarget.getBoundingClientRect();
    const scale = (Math.min(box.width, box.height) / 2 - 14) / live.current.view;
    return { x: (event.clientX - box.left - box.width / 2) / scale, y: -(event.clientY - box.top - box.height / 2) / scale };
  };

  return (
    <canvas ref={canvas} className={`disc-stage${onDraw ? " is-drawable" : ""}`} role="img" aria-label={label}
      onPointerDown={onDraw && ((event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        live.current.drawing = [toWorld(event)];
        canvas.current?.dispatchEvent(new Event("fp:redraw"));
      })}
      onPointerMove={onDraw && ((event) => {
        const drawing = live.current.drawing;
        if (!drawing) return;
        const p = toWorld(event);
        const last = drawing[drawing.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) > 0.03) drawing.push(p);
      })}
      onPointerUp={onDraw && (() => {
        const drawing = live.current.drawing;
        live.current.drawing = null;
        if (drawing && drawing.length > 8) onDraw(drawing);
        canvas.current?.dispatchEvent(new Event("fp:redraw"));
      })} />
  );
}
