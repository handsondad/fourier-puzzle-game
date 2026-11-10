import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { Pair } from "../data/lines";
import { pairLines } from "../data/voice-lines";
import { say } from "../lib/speech";
import { Chat, DadSays, type Settings } from "./Shared";

export const starRow = (count: number, of = 3) => "⭐".repeat(count) + "☆".repeat(of - count);

const burst = ["🎉", "⭐", "✨", "🌟", "🎊", "💛", "⭐", "✨"];

export function Burst() {
  return (
    <div className="burst" aria-hidden="true">
      {burst.map((emoji, i) => <span key={i} style={{ "--a": `${i * 45}deg` } as CSSProperties}>{emoji}</span>)}
    </div>
  );
}

type IntroProps = { emoji: string; title: string; talk: Pair; settings: Settings; onStart: () => void };

/** 开场：小念先问，爸爸把玩法讲一遍。 */
export function GameIntro({ emoji, title, talk, settings, onStart }: IntroProps) {
  useEffect(() => {
    if (settings.sound) say(...pairLines(talk));
  }, []);
  return (
    <section className="card game-intro" aria-labelledby="game-intro-title">
      <span className="game-intro-emoji" aria-hidden="true">{emoji}</span>
      <h2 id="game-intro-title">{title}</h2>
      <Chat lines={pairLines(talk)} />
      <button type="button" className="primary-btn" onClick={onStart} autoFocus>开始！</button>
    </section>
  );
}

type DoneProps = { stars: number; summary: string; line: string; onAgain: () => void; onBack: () => void; children?: ReactNode };

/** 结束：星星、成绩、爸爸的话。 */
export function GameDone({ stars, summary, line, onAgain, onBack, children }: DoneProps) {
  return (
    <section className="card quiz-done" aria-labelledby="game-done-title">
      <p className="done-stars" aria-hidden="true">{starRow(stars)}</p>
      <h2 id="game-done-title">{summary}</h2>
      {children}
      <DadSays>{line}</DadSays>
      <div className="done-actions">
        <button type="button" className="primary-btn" onClick={onAgain}>🔁 再玩一次</button>
        <button type="button" className="pill-btn" onClick={onBack}>← 回到首页</button>
      </div>
    </section>
  );
}
