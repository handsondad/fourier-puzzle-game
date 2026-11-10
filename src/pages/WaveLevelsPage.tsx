import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Stars } from "../App";
import { Burst, starRow } from "../components/GameKit";
import { Chat, DadSays, NianSays, TopBar, type Settings } from "../components/Shared";
import { degrees, fixed, Slider } from "../components/Slider";
import { colorOf, plotValues, plotWaves, WavePlot } from "../components/WavePlot";
import { introTalks, rightLine } from "../data/lines";
import { pairLines } from "../data/voice-lines";
import { chapters, waveLevels, type WaveLevel } from "../data/waveLevels";
import { shapeNames, shapeRecipe, type Wave } from "../lib/fourier";
import { chime, dad, nian, say } from "../lib/speech";
import { playTone, stopTone, useTone } from "../lib/tone";
import {
  AMP, matchOf, N_MAX, PHASE_STEP, realMatch, revealOne, rightChannels, startWaves, sumParts, targetAt, WAVE_GOAL, waveStars
} from "../lib/waveGame";

const chapterColors = ["#4d96ff", "#6bcb77", "#a66cff", "#ff9f43"];

type HomeProps = { settings: Settings; stars: Stars; onBack: () => void; onPlay: (id: number) => void };

export function WaveHome({ settings, stars, onBack, onPlay }: HomeProps) {
  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.waves));
  }, []);
  return (
    <div className="page">
      <TopBar emoji="🏆" title="拼波闯关" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.waves)} />
      {chapters.map((chapter) => (
        <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
          <h2 id={`chapter-${chapter.id}`} className="section-title chapter-title">
            <span aria-hidden="true">{chapter.emoji}</span> 第 {chapter.id} 章 · {chapter.title}
            <small>{chapter.hook}</small>
          </h2>
          <div className="stages">
            {waveLevels.filter((l) => l.chapter === chapter.id).map((level) => (
              <button key={level.id} type="button" className="stage-card" onClick={() => onPlay(level.id)}
                style={{ "--bubble": chapterColors[chapter.id - 1] } as CSSProperties}>
                <span className="stage-emoji" aria-hidden="true">{level.emoji}</span>
                <strong>{level.id}. {level.title}</strong>
                <span className="level-stars" aria-label={`最好成绩 ${stars[level.id] ?? 0} 颗星`}>{starRow(stars[level.id] ?? 0)}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

type PlayProps = {
  level: WaveLevel;
  settings: Settings;
  onBack: () => void;
  onAgain: () => void;
  onNext: (id: number) => void;
  onFinish: (id: number, stars: number) => void;
};

/** 目标的声音：名波用前 15 个号近似。 */
const targetParts = (level: WaveLevel): Wave[] =>
  "shape" in level.target ? shapeRecipe(level.target.shape, 15) : [...level.target.parts];

export function WavePlay({ level, settings, onBack, onAgain, onNext, onFinish }: PlayProps) {
  const [waves, setWaves] = useState(() => startWaves(level));
  const [hinted, setHinted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const later = useRef(0);
  const tone = useTone();

  const target = useMemo(() => plotValues((x) => targetAt(level, x)), [level]);
  const noise = useMemo(() => (level.noise ? plotWaves(level.noise) : undefined), [level]);
  const all = sumParts(level, waves);
  const sum = plotWaves(all);
  const score = useMemo(() => matchOf(level, waves), [level, waves]);
  const right = hinted ? rightChannels(level, waves) : [];
  const next = waveLevels.find((l) => l.id === level.id + 1);
  const shape = "shape" in level.target ? level.target.shape : null;

  useEffect(() => {
    if (settings.sound) say(dad(level.story));
    return () => window.clearTimeout(later.current);
  }, []);

  useEffect(() => {
    if (won !== null || score < WAVE_GOAL) return;
    const stars = waveStars(hinted, revealed);
    setWon(stars);
    onFinish(level.id, stars);
    stopTone();
    if (!settings.sound) return;
    chime(true);
    later.current = window.setTimeout(() => say(nian(rightLine), dad(level.win)), 350);
  }, [score]);

  const setWave = (i: number, change: Partial<Wave>) => setWaves(waves.map((w, j) => (j === i ? { ...w, ...change } : w)));

  function hint() {
    setHinted(true);
    say(dad(level.hint));
  }

  function reveal() {
    setHinted(true);
    setRevealed(true);
    setWaves(revealOne(level, waves));
  }

  const pct = Math.round(score * 100);
  return (
    <div className="page wave-page">
      <TopBar emoji={level.emoji} title={`第 ${level.id} 关 · ${level.title}`} onBack={onBack} backLabel="选关" settings={settings} />
      <DadSays>{level.story}</DadSays>

      <section className="card plot-card" aria-label="波形">
        <Meter pct={pct} goal={Math.round(WAVE_GOAL * 100)} />
        <WavePlot label={`目标波和你拼的波，吻合度 ${pct}%`} target={target} noise={noise}
          parts={waves.filter((w) => Math.abs(w.amp) > 0.001).map((w) => ({ values: plotWaves([w]), color: colorOf(w.n) }))}
          missing={hinted && won === null ? target.map((v, i) => v - sum[i]) : undefined} sum={sum} />
        <p className="legend" aria-hidden="true">
          <span className="is-target">目标{shape ? `：${shapeNames[shape]}` : ""}</span>
          {level.noise && <span className="is-noise">噪音</span>}
          <span className="is-sum">加起来</span>
          {hinted && won === null && <span className="is-missing">还差的</span>}
        </p>
      </section>

      <div className="channels">
        {waves.map((wave, i) => (
          <article key={i} className="channel" style={{ "--c": colorOf(wave.n) } as CSSProperties}>
            <header className="channel-head">
              <span className="channel-dot" aria-hidden="true" />
              {level.channels[i].free ? (
                <span className="picker">
                  <button type="button" className="nudge" disabled={wave.n <= 1} onClick={() => setWave(i, { n: wave.n - 1 })} aria-label="号码小一点">◀</button>
                  <b>{wave.n} 号波</b>
                  <button type="button" className="nudge" disabled={wave.n >= N_MAX} onClick={() => setWave(i, { n: wave.n + 1 })} aria-label="号码大一点">▶</button>
                </span>
              ) : <b>{wave.n} 号波</b>}
              <small>一段起伏 {wave.n} 次</small>
              {right[i] && <span className="tick" aria-label="这个调对了">✓</span>}
            </header>
            <Slider label="高矮" value={wave.amp} min={AMP.min} max={AMP.max} step={AMP.step} format={fixed(2)}
              color={colorOf(wave.n)} onChange={(amp) => setWave(i, { amp })} />
            {level.phase && (
              <Slider label="挪一挪" value={wave.phase} min={0} max={360 - PHASE_STEP} step={PHASE_STEP} wrap format={degrees}
                color={colorOf(wave.n)} onChange={(phase) => setWave(i, { phase })} />
            )}
          </article>
        ))}
      </div>

      <div className="play-actions">
        <button type="button" className="pill-btn" onClick={hint} disabled={won !== null}>💡 提示</button>
        <button type="button" className="pill-btn" onClick={reveal} disabled={won !== null}>🔑 爸爸帮我调一个</button>
        <button type="button" className="pill-btn" aria-pressed={tone === "target"} onClick={() => playTone("target", targetParts(level))}>🎯 听目标</button>
        <button type="button" className="pill-btn" aria-pressed={tone === "mine"} onClick={() => playTone("mine", all)}>🎵 听我的</button>
        <button type="button" className="pill-btn" onClick={() => setWaves(startWaves(level))}>↺ 重来</button>
      </div>

      {won !== null && (
        <section className="card win-card" aria-live="polite">
          <Burst />
          <p className="done-stars" aria-label={`${won} 颗星`}>{starRow(won)}</p>
          <p className="verdict is-right">🎉 对上啦！</p>
          <NianSays>{rightLine}</NianSays>
          <DadSays>{level.win}</DadSays>
          {shape && (
            <p className="win-note">
              只用 {level.channels.length} 个波，和真正的{shapeNames[shape]}有 {Math.round(realMatch(level, waves) * 100)}% 像。波越多，就越像。
            </p>
          )}
          <div className="done-actions">
            {next && <button type="button" className="primary-btn" onClick={() => onNext(next.id)} autoFocus>下一关：{next.title} →</button>}
            <button type="button" className="pill-btn" onClick={onAgain}>🔁 再玩一次</button>
            <button type="button" className="pill-btn" onClick={onBack}>选关</button>
          </div>
        </section>
      )}
    </div>
  );
}

export function Meter({ pct, goal, label = "吻合度" }: { pct: number; goal: number; label?: string }) {
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${label} ${pct}%，到 ${goal}% 过关`}>
      <span className="meter-label">{label}</span>
      <span className="meter-track">
        <span className={`meter-fill${pct >= goal ? " is-done" : ""}`} style={{ width: `${pct}%` }} />
        <span className="meter-goal" style={{ left: `${goal}%` }} />
      </span>
      <b>{pct}%</b>
    </div>
  );
}
