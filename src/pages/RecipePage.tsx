import { useEffect, useRef, useState } from "react";
import { Burst, GameDone, GameIntro } from "../components/GameKit";
import { DadSays, SpeakButton, TopBar, type Settings } from "../components/Shared";
import { plotWaves, RecipeBars, WavePlot } from "../components/WavePlot";
import { gameLines, introTalks, recipeLines, rightLine } from "../data/lines";
import { ampText, recipeRound, RECIPE_COUNT, type Recipe } from "../lib/recipe";
import { chime, dad, nian, say } from "../lib/speech";
import { playTone, useTone } from "../lib/tone";
import { starsFor } from "../lib/stars";

type Props = { settings: Settings; onBack: () => void; onFinish: (stars: number) => void };

const recipeText = (recipe: Recipe) => recipe.map((w) => `${w.n} 号波 ${ampText(w.amp)}`).join("，");

export function RecipePage({ settings, onBack, onFinish }: Props) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [questions, setQuestions] = useState(() => recipeRound());
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const later = useRef(0);
  const tone = useTone();
  const question = questions[index];
  const prompt = recipeLines[question.kind];
  const explain = recipeLines.explain[question.answer.length - 1];
  const score = results.filter(Boolean).length;
  const stars = starsFor(score, RECIPE_COUNT);

  useEffect(() => {
    if (phase === "play" && settings.sound) say(dad(prompt));
    return () => window.clearTimeout(later.current);
  }, [phase, index]);

  function start() {
    setQuestions(recipeRound());
    setIndex(0);
    setPicked(null);
    setResults([]);
    setPhase("play");
  }

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const right = question.options[i] === question.answer;
    setResults([...results, right]);
    if (!settings.sound) return;
    chime(right);
    later.current = window.setTimeout(() => say(...(right ? [nian(rightLine), dad(explain)] : [dad(explain)])), 350);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    setPhase("done");
    onFinish(stars);
    if (settings.sound) say(dad(gameLines.recipe.done[stars - 1]));
  }

  const top = <TopBar emoji="🧪" title="波形配方" onBack={onBack} settings={settings} />;
  if (phase === "intro") {
    return <div className="page game-page">{top}<GameIntro emoji="🧪" title="波形配方" talk={introTalks.recipe} settings={settings} onStart={start} /></div>;
  }
  if (phase === "done") {
    return (
      <div className="page game-page">
        {top}
        <GameDone stars={stars} summary={`认对了 ${score} / ${RECIPE_COUNT} 份配方`} line={gameLines.recipe.done[stars - 1]} onAgain={start} onBack={onBack} />
      </div>
    );
  }

  const right = picked !== null && question.options[picked] === question.answer;
  const showWave = question.kind === "wave";
  return (
    <div className="page game-page">
      {top}
      <div className="quiz-progress" aria-label={`第 ${index + 1} 题，共 ${RECIPE_COUNT} 题`}>
        {questions.map((q, i) => {
          const cls = i < results.length ? (results[i] ? "is-right" : "is-wrong") : i === index ? "is-now" : "";
          return <span key={q.key} className={cls} />;
        })}
        <small className="quiz-step">第 {index + 1} / {RECIPE_COUNT} 题</small>
      </div>

      <section className="card quiz-card recipe-card" aria-labelledby="recipe-prompt">
        <h2 id="recipe-prompt" className="quiz-prompt">
          {prompt} <SpeakButton who="dad" text={prompt} label="听爸爸读题" />
        </h2>
        <div className="recipe-show">
          {showWave
            ? <WavePlot label="要猜配方的这条波" sum={plotWaves(question.answer)} />
            : <RecipeBars recipe={question.answer} label={`配方：${recipeText(question.answer)}`} />}
          <button type="button" className="pill-btn" aria-pressed={tone === "question"} onClick={() => playTone("question", question.answer)}>🎵 听一听</button>
        </div>

        <div className="recipe-options">
          {question.options.map((option, i) => {
            const state = picked === null ? "" : option === question.answer ? " is-right" : i === picked ? " is-wrong" : " is-dim";
            return (
              <button key={i} type="button" className={`option recipe-option${state}`} onClick={() => choose(i)} disabled={picked !== null}
                aria-label={showWave ? `配方：${recipeText(option)}` : `第 ${i + 1} 条波`}>
                {showWave
                  ? <RecipeBars recipe={option} label={recipeText(option)} mini />
                  : <WavePlot label={`第 ${i + 1} 条波`} sum={plotWaves(option)} mini />}
                {state === " is-right" && <span className="option-mark" aria-hidden="true">✓</span>}
                {state === " is-wrong" && <span className="option-mark" aria-hidden="true">✗</span>}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="feedback" aria-live="polite">
            {right && <Burst key={index} />}
            <p className={`verdict${right ? " is-right" : " is-wrong"}`}>{right ? "🎉 认对啦！" : "😮 差一点！绿色的才是一对。"}</p>
            <DadSays>{explain}</DadSays>
            <button type="button" className="primary-btn" onClick={next} autoFocus>
              {index + 1 < questions.length ? "下一题 →" : "看看我得了几颗星 →"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
