import { useEffect, useMemo, useRef } from "react";
import type { Planet } from "../data/sky";
import type { Pt } from "../lib/fourier";
import { DEFERENT, longitude, ptolemy, retrograde, seen, skySpan, skyTimes, synodic, trueEpicycle, type Epicycle } from "../lib/sky";

type Props = {
  label: string;
  planet: Planet;
  /** 给了本轮就画托勒密的均轮和本轮，白点是真正的观测记录；不给就只看行星怎么走。 */
  epicycle?: Epicycle;
  playing: boolean;
  /** 下面加一条天空，只看方向：往前走还是倒着走。 */
  band?: boolean;
};

const COUNT = 900;
const SECONDS_PER_YEAR = 2.5;
const RETRO_COLOR = "#ff8fd0";
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 固定的一片星星，每次画都一样。 */
function starField(count: number, seed: number) {
  let s = seed;
  const next = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: count }, () => ({ x: next(), y: next(), r: 0.4 + next() * 1.1, a: 0.25 + next() * 0.6 }));
}
const skyStars = starField(110, 7);
const bandStars = starField(60, 11);

function fitCanvas(el: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const ratio = window.devicePixelRatio || 1;
  const { width, height } = el.getBoundingClientRect();
  el.width = Math.round(width * ratio);
  el.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, ring = "#fff") {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** 地球在正中间的星空：看行星打圈圈，或者看托勒密的均轮和本轮怎么画出这些圈。 */
export function SkyStage({ label, planet, epicycle, playing, band = false }: Props) {
  const sky = useRef<HTMLCanvasElement>(null);
  const strip = useRef<HTMLCanvasElement>(null);
  const times = useMemo(() => skyTimes(planet, planet.loops, COUNT), [planet]);
  const truth = useMemo(() => times.map((t) => seen(planet, t)), [planet, times]);
  const retro = useMemo(() => times.map((t) => retrograde(planet, t)), [planet, times]);
  const model = useMemo(() => (epicycle ? times.map((t) => ptolemy(planet, epicycle, t)) : null), [planet, times, epicycle]);
  const live = useRef({ planet, truth, retro, model, epicycle, playing, clock: 0 });
  live.current = { ...live.current, planet, truth, retro, model, epicycle, playing };

  useEffect(() => {
    live.current.clock = 0;
  }, [planet]);

  useEffect(() => {
    const el = sky.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const bandEl = strip.current;
    const bandCtx = bandEl?.getContext("2d") ?? null;
    let frame = 0;
    let last = performance.now();
    const still = reduceMotion();

    const fit = () => {
      fitCanvas(el, ctx);
      if (bandEl && bandCtx) fitCanvas(bandEl, bandCtx);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    if (bandEl) observer.observe(bandEl);

    const draw = (now: number) => {
      const state = live.current;
      const { planet: p, truth: path, retro: back, model: drawn, epicycle: epi } = state;
      const { span } = skySpan(p, p.loops);
      if (state.playing && !still) state.clock = (state.clock + Math.max(0, now - last) / 1000 / SECONDS_PER_YEAR) % span;
      last = Math.max(last, now);
      const fraction = still ? (synodic(p) / 2) / span : state.clock / span;
      const at = Math.max(0, Math.min(COUNT - 1, Math.floor(fraction * (COUNT - 1))));

      const { width, height } = el.getBoundingClientRect();
      const size = (DEFERENT + Math.max(trueEpicycle(p).r, epi?.r ?? 0)) * 1.08;
      const scale = (Math.min(width, height) / 2 - 14) / size;
      const px = (q: Pt) => [width / 2 + q.x * scale, height / 2 - q.y * scale] as const;
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of skyStars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.a})`;
        ctx.fillRect(s.x * width, s.y * height, s.r, s.r);
      }

      const earth = px({ x: 0, y: 0 });
      let planetAt: Pt;
      if (drawn && epi) {
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(earth[0], earth[1], DEFERENT * scale, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(170, 200, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        path.forEach((q, i) => {
          if (i % 15) return;
          ctx.beginPath();
          ctx.arc(...px(q), 2.2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.beginPath();
        drawn.slice(0, at + 1).forEach(({ planet: q }, i) => (i ? ctx.lineTo(...px(q)) : ctx.moveTo(...px(q))));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const { center, planet: q } = drawn[at];
        const c = px(center);
        ctx.beginPath();
        ctx.moveTo(...earth);
        ctx.lineTo(...c);
        ctx.strokeStyle = "rgba(170, 200, 255, 0.75)";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (epi.r * scale > 1) {
          ctx.beginPath();
          ctx.arc(c[0], c[1], epi.r * scale, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 214, 102, 0.75)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(...c);
        ctx.lineTo(...px(q));
        ctx.strokeStyle = "rgba(255, 214, 102, 0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();
        dot(ctx, c[0], c[1], 3.5, "#ffd666", "rgba(0,0,0,0)");
        planetAt = q;
      } else {
        ctx.beginPath();
        path.forEach((q, i) => (i ? ctx.lineTo(...px(q)) : ctx.moveTo(...px(q))));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (let i = 1; i <= at; i++) {
          ctx.beginPath();
          ctx.moveTo(...px(path[i - 1]));
          ctx.lineTo(...px(path[i]));
          ctx.strokeStyle = back[i] ? RETRO_COLOR : p.color;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        planetAt = path[at];
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(...earth);
        ctx.lineTo(...px(planetAt));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.font = "600 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      dot(ctx, earth[0], earth[1], 8, "#4d96ff");
      ctx.fillStyle = "#cfe3ff";
      ctx.fillText("地球", earth[0], earth[1] + 24);
      const [x, y] = px(planetAt);
      dot(ctx, x, y, 7, p.color);
      ctx.fillStyle = "#fff";
      ctx.fillText(p.name, x, y - 13);

      if (bandEl && bandCtx) {
        const box = bandEl.getBoundingClientRect();
        bandCtx.clearRect(0, 0, box.width, box.height);
        for (const s of bandStars) {
          bandCtx.fillStyle = `rgba(255, 255, 255, ${s.a})`;
          bandCtx.fillRect(s.x * box.width, s.y * box.height, s.r, s.r);
        }
        const mid = box.height / 2 + 8;
        const from = Math.max(0, at - 220);
        for (let i = from; i <= at; i += 4) {
          const fade = 0.15 + (0.85 * (i - from)) / Math.max(1, at - from);
          bandCtx.globalAlpha = fade;
          bandCtx.beginPath();
          bandCtx.arc((longitude(path[i]) / 360) * box.width, mid, 2.5, 0, Math.PI * 2);
          bandCtx.fillStyle = back[i] ? RETRO_COLOR : p.color;
          bandCtx.fill();
        }
        bandCtx.globalAlpha = 1;
        const lx = (longitude(path[at]) / 360) * box.width;
        dot(bandCtx, lx, mid, 6, back[at] ? RETRO_COLOR : p.color);
        bandCtx.font = "700 14px system-ui, sans-serif";
        bandCtx.textAlign = "left";
        bandCtx.fillStyle = back[at] ? RETRO_COLOR : "#cfe3ff";
        bandCtx.fillText(back[at] ? `↩ ${p.name}正在倒着走！` : `${p.name}往前走 →`, 10, 18);
      }

      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const redraw = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
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
    sky.current?.dispatchEvent(new Event("fp:redraw"));
  }, [planet, epicycle]);

  return (
    <div className="sky-wrap">
      <canvas ref={sky} className="sky-stage" role="img" aria-label={label} />
      {band && <canvas ref={strip} className="sky-band" role="img" aria-label={`从地球上看，${planet.name}在天上往哪边走`} />}
    </div>
  );
}
