import { useEffect, useMemo, useRef, useState } from "react";
import { DiscStage } from "../components/DiscStage";
import { Chat, DadSays, TopBar, type Settings } from "../components/Shared";
import { PointsPlot } from "../components/PointsPlot";
import { dadLines, introTalks } from "../data/lines";
import { pairLines } from "../data/voice-lines";
import { centroid, readDisc, shuffle, trace, wind, type Disc } from "../lib/fourier";
import { chime, dad, say } from "../lib/speech";
import { spinText } from "./DiscLevelsPage";

const K_RANGE = 7;
const ks = Array.from({ length: K_RANGE * 2 + 1 }, (_, i) => i - K_RANGE);
/** 读出的半径小于这个，就当作没有这个盘。 */
const NONE = 0.02;

type Curve = { id: string; emoji: string; name: string; discs: Disc[] };

const fixedCurves: Curve[] = [
  { id: "trefoil", emoji: "🔱", name: "三尖瓣线", discs: [{ k: 1, r: 2, angle: 0 }, { k: -2, r: 1, angle: 0 }] },
  { id: "heart", emoji: "❤️", name: "心形线", discs: [{ k: 1, r: 2, angle: 0 }, { k: 2, r: 1, angle: 180 }] },
  { id: "snow", emoji: "❄️", name: "雪花", discs: [{ k: 1, r: 2, angle: 0 }, { k: -5, r: 0.6, angle: 0 }, { k: 7, r: 0.3, angle: 0 }] }
];

/** 神秘曲线：三个随机的圆盘，号码在 -5 到 5 之间。 */
function mystery(): Curve {
  const pool = shuffle(ks.filter((k) => k !== 0 && Math.abs(k) <= 5), Math.random).slice(0, 3);
  const discs = pool.map((k, i) => ({ k, r: [1.6, 0.8, 0.4][i], angle: Math.floor(Math.random() * 12) * 30 }));
  return { id: "mystery", emoji: "🎁", name: "神秘曲线", discs };
}

type Props = { settings: Settings; onBack: () => void };

export function WindPage({ settings, onBack }: Props) {
  const [curve, setCurve] = useState<Curve>(fixedCurves[0]);
  const [k, setK] = useState(0);
  const [shownK, setShownK] = useState(0);
  const [found, setFound] = useState<Disc[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.wind));
  }, []);

  const points = useMemo(() => trace(curve.discs, 360), [curve]);
  const view = curve.discs.reduce((sum, d) => sum + d.r, 0) * 1.08;
  const wound = wind(points, shownK);
  const center = centroid(wound);
  const reading = useMemo(() => readDisc(points, k), [points, k]);
  const settled = Math.abs(shownK - k) < 0.002;
  const goal = curve.discs.filter((d) => d.r > NONE).length;
  const complete = found.length === goal;

  /** 慢慢缠过去，看曲线怎么一圈圈卷起来。 */
  useEffect(() => {
    let current = shownK;
    const step = () => {
      current += (k - current) * 0.08;
      if (Math.abs(k - current) < 0.002) current = k;
      setShownK(current);
      if (current !== k) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [k]);

  useEffect(() => {
    if (!settled || k === 0) return;
    if (reading.r <= NONE) {
      if (settings.sound) say(dad(dadLines.windEmpty));
      return;
    }
    if (found.some((d) => d.k === k)) return;
    const next = [...found, reading];
    setFound(next);
    if (!settings.sound) return;
    chime(true);
    say(dad(next.length === goal ? dadLines.windAll : dadLines.windFound));
  }, [settled, k]);

  function pickCurve(next: Curve) {
    setCurve(next);
    setFound([]);
    setK(0);
  }

  return (
    <div className="page wind-page">
      <TopBar emoji="🌀" title="缠绕找重心" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.wind)} />

      <div className="play-actions">
        {fixedCurves.map((c) => (
          <button key={c.id} type="button" className="pill-btn" aria-pressed={curve.id === c.id} onClick={() => pickCurve(c)}>{c.emoji} {c.name}</button>
        ))}
        <button type="button" className="pill-btn" aria-pressed={curve.id === "mystery"} onClick={() => pickCurve(mystery())}>🎁 换一条神秘曲线</button>
      </div>

      <section className="card" aria-labelledby="wind-pick">
        <h2 id="wind-pick" className="section-title is-small">跟着几号盘一起转？</h2>
        <div className="k-row" role="group" aria-label="选择缠绕圈数">
          {ks.map((n) => {
            const got = found.some((d) => d.k === n);
            return (
              <button key={n} type="button" className={`k-btn${got ? " is-found" : ""}`} aria-pressed={k === n} onClick={() => setK(n)}>
                {n}
              </button>
            );
          })}
        </div>
        <p className="k-note">选 0 是不转。正数：画面跟着逆时针转；负数：跟着顺时针转。</p>
      </section>

      <div className="wind-layout">
        <figure className="card wind-figure">
          <figcaption>原来的曲线</figcaption>
          <PointsPlot label={`${curve.name}原来的样子`} points={points} view={view} center={centroid(points)} color="#f07b12" />
        </figure>
        <figure className="card wind-figure">
          <figcaption>跟着 {k} 号盘转着看（反着缠 {k} 圈）</figcaption>
          <PointsPlot label={`反着缠 ${k} 圈以后的曲线和它的重心`} points={wound} view={view} center={center} closed={settled} />
        </figure>
        <div className="card wind-reading" aria-live="polite">
          <h3>读一读重心</h3>
          {!settled ? <p>正在缠……</p> : k === 0 ? (
            <p>不转的时候，重心就在正中间：曲线没有偏向哪一边。</p>
          ) : reading.r > NONE ? (
            <>
              <p>重心离中心 <b>{reading.r.toFixed(2)}</b>，方向 <b>{Math.round(reading.angle)}°</b>。</p>
              <p className="reading-big">所以有一个 <b>{k} 号盘</b>：半径 {reading.r.toFixed(2)}，起始角度 {Math.round(reading.angle)}°</p>
            </>
          ) : (
            <p>重心正好在中心，曲线转成了对称的样子。<b>没有 {k} 号盘。</b></p>
          )}
          <h3>找到的圆盘（{found.length} / {goal}）</h3>
          {found.length ? (
            <ul className="found-list">
              {found.map((d) => <li key={d.k}><b>{d.k} 号</b> 半径 {d.r.toFixed(1)} · {spinText(d.k)}</li>)}
            </ul>
          ) : <p className="win-note">从 1 开始一个个试试。</p>}
        </div>
      </div>

      {complete && (
        <section className="card wind-done">
          <h2 className="section-title is-small">🎉 用找到的圆盘，画回原来的曲线</h2>
          <DadSays>{dadLines.windAll}</DadSays>
          <DiscStage label="用找到的圆盘重新画出来的曲线" discs={found} target={points} view={view} mode="trail" />
        </section>
      )}
    </div>
  );
}
