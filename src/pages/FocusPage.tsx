import { useEffect, useMemo, useRef, useState } from "react";
import { Burst, GameDone, GameIntro } from "../components/GameKit";
import { PhotoGrid } from "../components/PhotoGrid";
import { DadSays, SpeakButton, TopBar, type Settings } from "../components/Shared";
import { focusLines, gameLines, introTalks, rightLine } from "../data/lines";
import { photos } from "../data/photos";
import {
  decomposePhoto, filterPhoto, FOCUS_COUNT, FOCUS_STAGES, focusPoints, focusRound, focusStars, PHOTO_TOTAL
} from "../lib/photoWaves";
import { chime, dad, nian, say } from "../lib/speech";

type Props = { settings: Settings; onBack: () => void; onFinish: (stars: number) => void };

export function FocusPage({ settings, onBack, onFinish }: Props) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [questions, setQuestions] = useState(() => focusRound(photos));
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [points, setPoints] = useState(0);
  const later = useRef(0);

  const question = questions[index];
  const coeffs = useMemo(() => decomposePhoto(question.answer.pixels), [question]);
  const previewStage = useMemo(() => filterPhoto(coeffs, "low", FOCUS_STAGES[stage]), [coeffs, stage]);
  const fullView = useMemo(() => filterPhoto(coeffs, "low", PHOTO_TOTAL), [coeffs]);

  const rightCount = results.filter(Boolean).length;
  const stars = focusStars(points, rightCount);
  const right = picked !== null && question.options[picked].id === question.answer.id;
  const explain = right && stage === 0 ? focusLines.explainFast : focusLines.explainMore;

  useEffect(() => {
    if (phase === "play" && index === 0 && settings.sound) say(dad(focusLines.prompt));
    return () => window.clearTimeout(later.current);
  }, [phase, index]);

  function start() {
    window.clearTimeout(later.current);
    setQuestions(focusRound(photos));
    setIndex(0);
    setStage(0);
    setPicked(null);
    setResults([]);
    setPoints(0);
    setPhase("play");
  }

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const right = question.options[i].id === question.answer.id;
    setResults([...results, right]);
    if (right) setPoints(points + focusPoints(stage));
    if (!settings.sound) return;
    chime(right);
    later.current = window.setTimeout(() => say(...(right ? [nian(rightLine), dad(explain)] : [dad(focusLines.explainMore)])), 350);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setStage(0);
      setPicked(null);
      return;
    }
    setPhase("done");
    onFinish(stars);
    if (settings.sound) say(dad(gameLines.focus.done[stars - 1]));
  }

  const top = <TopBar emoji="🔍" title="迷雾显影" onBack={onBack} settings={settings} />;
  if (phase === "intro") {
    return <div className="page game-page">{top}<GameIntro emoji="🔍" title="迷雾显影" talk={introTalks.focus} settings={settings} onStart={start} /></div>;
  }
  if (phase === "done") {
    return (
      <div className="page game-page">
        {top}
        <GameDone
          stars={stars}
          summary={`认对 ${rightCount} / ${FOCUS_COUNT} 张小画 · 拿下 ${points} 分`}
          line={gameLines.focus.done[stars - 1]}
          onAgain={start}
          onBack={onBack}
        />
      </div>
    );
  }

  return (
    <div className="page game-page">
      {top}
      <div className="quiz-progress" aria-label={`第 ${index + 1} 题，共 ${FOCUS_COUNT} 题`}>
        {questions.map((q, i) => {
          const cls = i < results.length ? (results[i] ? "is-right" : "is-wrong") : i === index ? "is-now" : "";
          return <span key={q.key} className={cls} />;
        })}
        <small className="quiz-step">第 {index + 1} / {FOCUS_COUNT} 题 · {points} 分</small>
      </div>

      <section className="card quiz-card focus-card" aria-labelledby="focus-prompt">
        <h2 id="focus-prompt" className="quiz-prompt">
          {focusLines.prompt} <SpeakButton who="dad" text={focusLines.prompt} label="听爸爸读题" />
        </h2>

        <div className={`focus-stage${picked !== null ? " is-revealed" : ""}`}>
          <figure className="focus-frame">
            <PhotoGrid label={`只用 ${FOCUS_STAGES[stage]} 个慢波叠出来的神秘图案`} pixels={previewStage.pixels} />
            <figcaption>只用 <b>{FOCUS_STAGES[stage]}</b> / {PHOTO_TOTAL} 个慢波</figcaption>
          </figure>
          {picked !== null && (
            <figure className="focus-frame">
              <PhotoGrid label={`全部 ${PHOTO_TOTAL} 个波的原图：${question.answer.name}`} pixels={fullView.pixels} crisp />
              <figcaption>{question.answer.emoji} 原图：{question.answer.name}</figcaption>
            </figure>
          )}
        </div>

        <div className="focus-clue-bar">
          <span className="focus-badge">
            {picked === null ? `现在猜中得 +${focusPoints(stage)} 分` : `用了 ${FOCUS_STAGES[stage]} 个波（省掉 ${Math.round((1 - FOCUS_STAGES[stage] / PHOTO_TOTAL) * 100)}%）`}
          </span>
          {picked === null && stage < FOCUS_STAGES.length - 1 && (
            <button type="button" className="pill-btn" onClick={() => setStage(stage + 1)}>
              ➕ 再加几个快波（变 {FOCUS_STAGES[stage + 1]} 个波）
            </button>
          )}
        </div>

        <div className="focus-options">
          {question.options.map((option, i) => {
            const isAnswer = option.id === question.answer.id;
            const state = picked === null ? "" : isAnswer ? " is-right" : i === picked ? " is-wrong" : " is-dim";
            return (
              <button key={option.id} type="button" className={`option focus-option${state}`} onClick={() => choose(i)} disabled={picked !== null}>
                <span>{picked !== null ? `${option.emoji} ${option.name}` : option.name}</span>
                {state === " is-right" && <span className="option-mark" aria-hidden="true">✓</span>}
                {state === " is-wrong" && <span className="option-mark" aria-hidden="true">✗</span>}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="feedback" aria-live="polite">
            {right && <Burst key={index} />}
            <p className={`verdict${right ? " is-right" : " is-wrong"}`}>
              {right ? `🎉 猜中啦！是${question.answer.name}（+${focusPoints(stage)} 分）` : `😮 原来是${question.answer.name}！`}
            </p>
            <DadSays>{explain}</DadSays>
            <button type="button" className="primary-btn" onClick={next} autoFocus>
              {index + 1 < questions.length ? "下一张 →" : "看看我得了几颗星 →"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
