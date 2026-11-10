import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Stars } from "../App";
import { DiscStage } from "../components/DiscStage";
import { Burst, starRow } from "../components/GameKit";
import { Chat, DadSays, NianSays, TopBar, type Settings } from "../components/Shared";
import { degrees, fixed, Slider } from "../components/Slider";
import { discLevels, type DiscLevel } from "../data/discLevels";
import { introTalks, rightLine } from "../data/lines";
import { pairLines } from "../data/voice-lines";
import { ANGLE_STEP, DISC_GOAL, discMatch, RADIUS, revealDisc, rightDiscs, startDiscs, stepK } from "../lib/discGame";
import { trace, type Disc } from "../lib/fourier";
import { chime, dad, nian, say } from "../lib/speech";
import { waveStars } from "../lib/waveGame";
import { Meter } from "./WaveLevelsPage";

const discColors = ["#4d96ff", "#ff6b6b", "#6bcb77", "#a66cff"];

/** 几号盘怎么转：正的逆时针，负的顺时针。 */
export const spinText = (k: number) => (k === 0 ? "不转" : `${k > 0 ? "逆" : "顺"}时针转 ${Math.abs(k)} 圈`);

type HomeProps = { settings: Settings; stars: Stars; onBack: () => void; onPlay: (id: number) => void };

export function DiscHome({ settings, stars, onBack, onPlay }: HomeProps) {
  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.discs));
  }, []);
  return (
    <div className="page">
      <TopBar emoji="🎯" title="圆盘画图" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.discs)} />
      <div className="intro">
        <p><span aria-hidden="true">🎡</span>几号盘，就是转一圈的时间里它转几圈。负数号反着转（顺时针）。</p>
        <p><span aria-hidden="true">📍</span>半径是孔打得离中心多远。下一个圆盘的中心插在这个孔上。</p>
      </div>
      <div className="stages">
        {discLevels.map((level) => (
          <button key={level.id} type="button" className="stage-card" onClick={() => onPlay(level.id)} style={{ "--bubble": "#ff6b6b" } as CSSProperties}>
            <span className="stage-emoji" aria-hidden="true">{level.emoji}</span>
            <strong>{level.id}. {level.title}</strong>
            <span className="level-stars" aria-label={`最好成绩 ${stars[level.id] ?? 0} 颗星`}>{starRow(stars[level.id] ?? 0)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type PlayProps = {
  level: DiscLevel;
  settings: Settings;
  onBack: () => void;
  onAgain: () => void;
  onNext: (id: number) => void;
  onFinish: (id: number, stars: number) => void;
};

export function DiscPlay({ level, settings, onBack, onAgain, onNext, onFinish }: PlayProps) {
  const [discs, setDiscs] = useState<Disc[]>(() => startDiscs(level));
  const [hinted, setHinted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const later = useRef(0);

  const target = useMemo(() => trace(level.target, 400), [level]);
  const view = useMemo(() => Math.max(2.6, level.target.reduce((sum, d) => sum + d.r, 0) * 1.12), [level]);
  const score = useMemo(() => discMatch(level, discs), [level, discs]);
  const right = hinted ? rightDiscs(level, discs) : [];
  const next = discLevels.find((l) => l.id === level.id + 1);

  useEffect(() => {
    if (settings.sound) say(dad(level.story));
    return () => window.clearTimeout(later.current);
  }, []);

  useEffect(() => {
    if (won !== null || score < DISC_GOAL) return;
    const stars = waveStars(hinted, revealed);
    setWon(stars);
    onFinish(level.id, stars);
    if (!settings.sound) return;
    chime(true);
    later.current = window.setTimeout(() => say(nian(rightLine), dad(level.win)), 350);
  }, [score]);

  const setDisc = (i: number, change: Partial<Disc>) => setDiscs(discs.map((d, j) => (j === i ? { ...d, ...change } : d)));

  const pct = Math.round(score * 100);
  return (
    <div className="page disc-page">
      <TopBar emoji={level.emoji} title={`第 ${level.id} 关 · ${level.title}`} onBack={onBack} backLabel="选关" settings={settings} />
      <DadSays>{level.story}</DadSays>

      <div className="disc-layout">
        <section className="card stage-card-wrap" aria-label="圆盘舞台">
          <Meter pct={pct} goal={Math.round(DISC_GOAL * 100)} label="像不像" />
          <DiscStage label={`灰色是目标图案，橙色是你的圆盘画出来的，像不像 ${pct}%`} discs={discs} target={target} view={view} />
          <p className="legend" aria-hidden="true"><span className="is-target">目标</span><span className="is-sum">笔尖画出的</span></p>
        </section>

        <div className="disc-side">
          {discs.map((d, i) => (
            <article key={i} className="channel" style={{ "--c": discColors[i % discColors.length] } as CSSProperties}>
              <header className="channel-head">
                <span className="channel-dot" aria-hidden="true" />
                {level.slots[i].free ? (
                  <span className="picker">
                    <button type="button" className="nudge" onClick={() => setDisc(i, { k: stepK(d.k, -1) })} aria-label="号码小一点">◀</button>
                    <b>{d.k} 号盘</b>
                    <button type="button" className="nudge" onClick={() => setDisc(i, { k: stepK(d.k, 1) })} aria-label="号码大一点">▶</button>
                  </span>
                ) : <b>{d.k} 号盘</b>}
                <small>{spinText(d.k)}</small>
                {right[i] && <span className="tick" aria-label="这个调对了">✓</span>}
              </header>
              <Slider label="半径" value={d.r} min={RADIUS.min} max={RADIUS.max} step={RADIUS.step} format={fixed(1)}
                color={discColors[i % discColors.length]} onChange={(r) => setDisc(i, { r })} />
              {level.angle && (
                <Slider label="起始角度" value={d.angle} min={0} max={360 - ANGLE_STEP} step={ANGLE_STEP} wrap format={degrees}
                  color={discColors[i % discColors.length]} onChange={(angle) => setDisc(i, { angle })} />
              )}
            </article>
          ))}
          <div className="play-actions">
            <button type="button" className="pill-btn" onClick={() => { setHinted(true); say(dad(level.hint)); }} disabled={won !== null}>💡 提示</button>
            <button type="button" className="pill-btn" onClick={() => { setHinted(true); setRevealed(true); setDiscs(revealDisc(level, discs)); }} disabled={won !== null}>🔑 爸爸帮我调一个</button>
            <button type="button" className="pill-btn" onClick={() => setDiscs(startDiscs(level))}>↺ 重来</button>
          </div>
        </div>
      </div>

      {won !== null && (
        <section className="card win-card" aria-live="polite">
          <Burst />
          <p className="done-stars" aria-label={`${won} 颗星`}>{starRow(won)}</p>
          <p className="verdict is-right">🎉 画出来啦！</p>
          <NianSays>{rightLine}</NianSays>
          <DadSays>{level.win}</DadSays>
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
