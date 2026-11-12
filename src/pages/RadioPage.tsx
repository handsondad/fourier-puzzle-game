import { useEffect, useMemo, useRef, useState } from "react";
import { Burst, GameDone, GameIntro } from "../components/GameKit";
import { DadSays, NianSays, TopBar, type Settings } from "../components/Shared";
import { fixed, Slider } from "../components/Slider";
import { PointsPlot } from "../components/PointsPlot";
import { WavePlot } from "../components/WavePlot";
import { gameLines, introTalks, radioLines } from "../data/lines";
import { DIAL, HEARD, lockAt, RADIO_COUNT, radioRound, radioStars, signalAt, tune, type Station } from "../lib/radio";
import { chime, dad, nian, say } from "../lib/speech";
import { playTone, useTone } from "../lib/tone";

type Props = { settings: Settings; onBack: () => void; onFinish: (stars: number) => void };

const slot = (dial: number) => Math.round(dial * 10);
const SLOTS = Array.from({ length: slot(DIAL.max) - slot(DIAL.min) + 1 }, (_, i) => slot(DIAL.min) + i);

export function RadioPage({ settings, onBack, onFinish }: Props) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [stations, setStations] = useState<Station[]>(() => radioRound());
  const [dial, setDial] = useState<number>(DIAL.min);
  const [found, setFound] = useState<Station[]>([]);
  const [wrong, setWrong] = useState(0);
  const [message, setMessage] = useState<{ who: "nian" | "dad"; text: string } | null>(null);
  const heard = useRef(new Map<number, number>());
  const later = useRef(0);
  const tone = useTone();

  useEffect(() => () => window.clearTimeout(later.current), []);

  const signal = useMemo(() => Array.from({ length: 321 }, (_, i) => signalAt(stations, i / 320)), [stations]);
  const tuning = useMemo(() => tune(stations, dial), [stations, dial]);
  heard.current.set(slot(dial), tuning.strength);
  const view = stations.reduce((sum, s) => sum + s.amp, 0) * 1.05;
  const stars = radioStars(wrong);
  const foundBySlot = new Set(found.map((s) => slot(s.k)));

  function start() {
    window.clearTimeout(later.current);
    setStations(radioRound());
    setDial(DIAL.min);
    setFound([]);
    setWrong(0);
    setMessage(null);
    heard.current = new Map();
    setPhase("play");
  }

  function lock() {
    const result = lockAt(stations, dial);
    if (result.kind === "found") {
      if (found.includes(result.station)) return;
      const next = [...found, result.station];
      setFound(next);
      const line = result.station.program.line;
      setMessage({ who: "nian", text: line });
      if (settings.sound) {
        chime(true);
        say(nian(line));
      }
      if (next.length === RADIO_COUNT) {
        later.current = window.setTimeout(() => {
          setPhase("done");
          onFinish(stars);
          if (settings.sound) say(nian(line), dad(gameLines.radio.done[stars - 1]));
        }, 1400);
      }
      return;
    }
    const text = result.kind === "near" ? radioLines.near : radioLines.empty;
    if (result.kind === "empty") setWrong(wrong + 1);
    setMessage({ who: "dad", text });
    if (settings.sound) {
      if (result.kind === "empty") chime(false);
      say(dad(text));
    }
  }

  const top = <TopBar emoji="📻" title="调台收音机" onBack={onBack} settings={settings} />;
  if (phase === "intro") {
    return <div className="page game-page">{top}<GameIntro emoji="📻" title="调台收音机" talk={introTalks.radio} settings={settings} onStart={start} /></div>;
  }
  if (phase === "done") {
    return (
      <div className="page game-page">
        {top}
        <GameDone stars={stars} summary={`找到 ${RADIO_COUNT} 个电台，按错 ${wrong} 次`} line={gameLines.radio.done[stars - 1]} onAgain={start} onBack={onBack}>
          <p className="door-haul" aria-label="找到的电台">{found.map((s) => s.program.emoji).join(" ")}</p>
        </GameDone>
      </div>
    );
  }

  const meter = Math.min(1, tuning.strength / 1.2);
  return (
    <div className="page radio-page">
      {top}
      <p className="game-score">
        <span>找到 {found.length} / {RADIO_COUNT} 个电台</span>
        <span>按错 {wrong} 次</span>
      </p>

      <section className="card plot-card" aria-label="混在一起的信号">
        <h2 className="section-title is-small">天线收到的信号（一秒钟）</h2>
        <WavePlot label="三个电台混在一起的信号" sum={signal} yMax={view} periods={1} />
      </section>

      <div className="radio-layout">
        <figure className="card wind-figure">
          <figcaption>跟着每秒 {dial.toFixed(1)} 圈一起转</figcaption>
          <PointsPlot label="把信号缠在圆上以后的样子和它的重心" points={tuning.wound} view={view} center={tuning.center} closed={false} />
        </figure>
        <div className="card radio-controls">
          <Slider label="旋钮" value={dial} min={DIAL.min} max={DIAL.max} step={DIAL.step} onChange={setDial} format={fixed(1)} color="#4dc3c3" />
          <div className="strength" aria-label={`信号强度 ${Math.round(meter * 100)}%`}>
            <span>信号强度</span>
            <span className="meter-track"><span className={`meter-fill${tuning.strength >= HEARD ? " is-done" : ""}`} style={{ width: `${meter * 100}%` }} /></span>
          </div>
          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={lock}>📻 就是这个台！</button>
            <button type="button" className="pill-btn" aria-pressed={tone === "radio"}
              onClick={() => playTone("radio", stations.map((s) => ({ n: s.k, amp: s.amp, phase: s.phase + 90 })), 1.6, 110)}>🎵 听听信号</button>
          </div>
          <div className="radio-slots" aria-label="电台收集栏">
            {Array.from({ length: RADIO_COUNT }, (_, i) => {
              const station = found[i];
              return station ? (
                <button key={station.k} type="button" className="radio-slot is-found" onClick={() => setDial(station.k)}>
                  <span>{station.program.emoji}</span>
                  <b>{station.program.name}</b>
                  <small>每秒 {station.k} 圈</small>
                </button>
              ) : (
                <div key={`empty-${i}`} className="radio-slot">
                  <span aria-hidden="true">📡</span>
                  <small>待寻找</small>
                </div>
              );
            })}
          </div>
          {message && (message.who === "nian" ? <NianSays>{message.text}</NianSays> : <DadSays>{message.text}</DadSays>)}
          {message?.who === "nian" && <Burst key={found.length} />}
        </div>
      </div>

      <section className="card plot-card" aria-label="转过的地方，信号有多强">
        <h2 className="section-title is-small">转过的地方，信号有多强</h2>
        <div className="spectrum-box">
          <svg className="spectrum" viewBox={`0 0 ${SLOTS.length * 6} 100`} preserveAspectRatio="none" role="img" aria-label="信号强度图">
            <line x1="0" x2={SLOTS.length * 6} y1="98" y2="98" className="plot-axis" />
            {SLOTS.map((s, i) => {
              const v = heard.current.get(s);
              if (v === undefined) return null;
              const h = Math.min(1, v / 1.5) * 92;
              const cls = s === slot(dial) ? "is-now" : foundBySlot.has(s) ? "is-found" : "";
              return <rect key={s} x={i * 6 + 0.6} width="4.8" y={98 - h} height={Math.max(h, 1.5)} rx="1.5" className={cls} />;
            })}
          </svg>
          <div className="spectrum-ticks" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => {
              const hit = found.find((s) => s.k === k);
              return (
                <span key={k} className={hit ? "is-found" : ""} style={{ left: `${((slot(k) - slot(DIAL.min) + 0.5) / SLOTS.length) * 100}%` }}>
                  {hit ? `${hit.program.emoji}${k}` : k}
                </span>
              );
            })}
          </div>
        </div>
        <p className="legend">
          {found.length ? found.map((s) => <span key={s.k}>{s.program.emoji} {s.program.name}：每秒 {s.k} 圈</span>) : <span>慢慢转旋钮，柱子会一根根长出来。</span>}
        </p>
      </section>
    </div>
  );
}
