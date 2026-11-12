import { useEffect, useMemo, useState } from "react";
import { DiscStage } from "../components/DiscStage";
import { Chat, TopBar, type Settings } from "../components/Shared";
import { Slider } from "../components/Slider";
import { dadLines, introTalks } from "../data/lines";
import { pairLines } from "../data/voice-lines";
import { centroid, fourierDiscs, resample, trace, TAU, type Pt } from "../lib/fourier";
import { dad, say } from "../lib/speech";
import { discColors, spinText } from "./DiscLevelsPage";

const VIEW = 3.4;
const MAX_DISCS = 61;

/** 挪到中心，放大到最远的点离中心 3。 */
function fit(points: readonly Pt[]): Pt[] {
  const c = centroid(points);
  const far = Math.max(...points.map((p) => Math.hypot(p.x - c.x, p.y - c.y))) || 1;
  return points.map((p) => ({ x: ((p.x - c.x) / far) * 3, y: ((p.y - c.y) / far) * 3 }));
}

const polygon = (corners: readonly Pt[]) => fit(resample(corners));
const star = Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI / 2 + (i * TAU) / 10;
  const r = i % 2 ? 1.2 : 3;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
});
const heart = Array.from({ length: 256 }, (_, i) => {
  const t = (i / 256) * TAU;
  return { x: 16 * Math.sin(t) ** 3, y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) };
});

type Preset = { id: string; emoji: string; name: string; points: Pt[] };

const presets: Preset[] = [
  { id: "trefoil", emoji: "🔱", name: "三尖瓣线", points: trace([{ k: 1, r: 2, angle: 0 }, { k: -2, r: 1, angle: 0 }]) },
  { id: "heart", emoji: "❤️", name: "爱心", points: fit(heart) },
  { id: "star", emoji: "⭐", name: "五角星", points: polygon(star) },
  { id: "square", emoji: "🟦", name: "方块", points: polygon([{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }]) }
];

type Props = { settings: Settings; onBack: () => void };

export function DrawPage({ settings, onBack }: Props) {
  const [preset, setPreset] = useState("trefoil");
  const [own, setOwn] = useState<Pt[] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [count, setCount] = useState(2);

  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.draw));
  }, []);

  const points = own ?? presets.find((p) => p.id === preset)!.points;
  const all = useMemo(() => fourierDiscs(points, (MAX_DISCS - 1) / 2), [points]);
  const used = all.slice(0, count);
  /** 没用上的圆盘半径平方加起来，占全部的多少（帕塞瓦尔定理：这就是画歪的程度）。 */
  const leftover = useMemo(() => {
    const total = all.reduce((sum, d) => sum + d.r * d.r, 0) || 1;
    let rest = total;
    return all.map((d) => Math.sqrt(Math.max(0, (rest -= d.r * d.r)) / total));
  }, [all]);
  /** 剩下的不到 1%，眼睛就看不出差别了。 */
  const first = leftover.findIndex((rest) => rest < 0.01);
  const enough = first < 0 ? all.length : first + 1;
  const exact = leftover[enough - 1] < 1e-4;

  function choose(id: string) {
    setPreset(id);
    setOwn(null);
    setDrawing(false);
    setCount(2);
  }

  function startDrawing() {
    setDrawing(true);
    say(dad(dadLines.drawOwn));
  }

  return (
    <div className="page draw-page">
      <TopBar emoji="🎡" title="圆上圆画板" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.draw)} />

      <div className="play-actions">
        {presets.map((p) => (
          <button key={p.id} type="button" className="pill-btn" aria-pressed={!own && !drawing && preset === p.id} onClick={() => choose(p.id)}>{p.emoji} {p.name}</button>
        ))}
        <button type="button" className="pill-btn" aria-pressed={drawing || !!own} onClick={startDrawing}>✏️ 我自己画</button>
      </div>

      <div className="disc-layout">
        <section className="card stage-card-wrap" aria-label="圆上圆">
          {drawing ? (
            <>
              <p className="draw-hint">在下面按住，画一圈，松手 ✋</p>
              <DiscStage label="画画区：按住画一圈" discs={[]} view={VIEW}
                onDraw={(path) => { setOwn(fit(resample(path))); setDrawing(false); setCount(8); }} />
            </>
          ) : (
            <>
              <DiscStage label={`用 ${count} 个圆盘画图案`} discs={used} colors={discColors}
                target={points} view={VIEW} mode="trail" seconds={count > 20 ? 14 : 10} />
              <p className="legend" aria-hidden="true">
                <span className="is-target">原来的图案</span>
                <span className="is-sum">圆盘画出的</span>
              </p>
            </>
          )}
        </section>

        <div className="disc-side">
          <div className="card">
            <Slider label="圆盘个数" value={count} min={1} max={MAX_DISCS} step={1} onChange={setCount} format={(v) => `${v} 个`} disabled={drawing} />
            <p className="win-note">
              用 <b>{enough}</b> 个圆盘就画得很像了。
              {exact ? "这个图案正好就是这几个圆盘画出来的，别的圆盘半径都是 0。" : "有尖角的地方，要很多很小、转得很快的圆盘。"}
            </p>
            <p className="win-note">现在还差 <b>{Math.round(leftover[count - 1] * 1000) / 10}%</b> 没画出来。</p>
            <button type="button" className="pill-btn" onClick={() => setCount(enough)} disabled={drawing}>🎯 就用 {enough} 个</button>
          </div>
          <div className="card disc-list">
            <h3>最大的几个圆盘</h3>
            <ol>
              {used.slice(0, 6).map((d, i) => (
                <li key={d.k}>
                  <span className="channel-dot is-inline" style={{ background: discColors[i % discColors.length] }} aria-hidden="true" />
                  <b>{d.k} 号盘</b> 半径 {d.r.toFixed(2)} <small>{spinText(d.k)}</small>
                </li>
              ))}
            </ol>
            {count > 6 && <p className="win-note">还有 {count - 6} 个更小的……</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
