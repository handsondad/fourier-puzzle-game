import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chat, TopBar, type Settings } from "../components/Shared";
import { degrees, fixed, Slider } from "../components/Slider";
import { colorOf, plotValues, plotWaves, WavePlot } from "../components/WavePlot";
import { introTalks } from "../data/lines";
import { pairLines } from "../data/voice-lines";
import { sampleWaves, shapeAmp, shapeAt, shapeNames, shapeRecipe, type Shape, type Wave } from "../lib/fourier";
import { say } from "../lib/speech";
import { hasSound, playTone, useTone } from "../lib/tone";
import { AMP, PHASE_STEP } from "../lib/waveGame";

const COUNT = 6;
const empty = (): Wave[] => Array.from({ length: COUNT }, (_, i) => ({ n: i + 1, amp: i === 0 ? 1 : 0, phase: 0 }));
const shapes: Shape[] = ["square", "saw", "triangle"];
/** 有跳变的名波：平台多高、一跳跳多少。小尖角按跳的高度算百分比。 */
const jumps: Partial<Record<Shape, { top: number; jump: number }>> = {
  square: { top: Math.PI / 4, jump: Math.PI / 2 },
  saw: { top: Math.PI / 2, jump: Math.PI }
};

type Props = { settings: Settings; onBack: () => void };

export function LabPage({ settings, onBack }: Props) {
  const [waves, setWaves] = useState(empty);
  const [ghost, setGhost] = useState<Shape | null>(null);
  const [gibbsShape, setGibbsShape] = useState<Shape>("square");
  const [terms, setTerms] = useState(3);
  const tone = useTone();

  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.lab));
  }, []);

  const sum = plotWaves(waves);
  const target = useMemo(() => (ghost ? plotValues(shapeAt[ghost]) : undefined), [ghost]);

  /** 只数用得上的号：方波第 3 项是 5 号波。 */
  const recipe = useMemo(() => {
    const out: Wave[] = [];
    for (let n = 1; out.length < terms; n++) if (shapeAmp(gibbsShape, n)) out.push({ n, amp: shapeAmp(gibbsShape, n), phase: 0 });
    return out;
  }, [gibbsShape, terms]);
  const partial = plotWaves(recipe);
  const ideal = useMemo(() => plotValues(shapeAt[gibbsShape]), [gibbsShape]);
  const overshoot = useMemo(() => {
    const edge = jumps[gibbsShape];
    if (!edge) return null;
    return Math.max(0, (Math.max(...sampleWaves(recipe, 4096)) - edge.top) / edge.jump);
  }, [gibbsShape, recipe]);

  const setWave = (i: number, change: Partial<Wave>) => {
    setGhost(null);
    setWaves(waves.map((w, j) => (j === i ? { ...w, ...change } : w)));
  };
  const usePreset = (shape: Shape) => {
    setWaves(shapeRecipe(shape, COUNT).map((w) => ({ ...w, amp: Math.round(w.amp * 100) / 100 })));
    setGhost(shape);
  };

  return (
    <div className="page lab-page">
      <TopBar emoji="🎛️" title="拼波工作台" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.lab)} />

      <div className="play-actions">
        {shapes.map((shape) => (
          <button key={shape} type="button" className="pill-btn" aria-pressed={ghost === shape} onClick={() => usePreset(shape)}>
            {shape === "square" ? "🟦" : shape === "saw" ? "🪚" : "🔺"} {shapeNames[shape]}的配方
          </button>
        ))}
        <button type="button" className="pill-btn" onClick={() => { setWaves(empty()); setGhost(null); }}>↺ 只留 1 号波</button>
        <button type="button" className="pill-btn" aria-pressed={tone === "lab"} disabled={!hasSound(waves)} onClick={() => playTone("lab", waves)}>🎵 听一听</button>
      </div>

      <section className="card plot-card" aria-label="工作台波形">
        <WavePlot label="六个波加起来的样子" target={target} sum={sum}
          parts={waves.filter((w) => Math.abs(w.amp) > 0.001).map((w) => ({ values: plotWaves([w]), color: colorOf(w.n) }))} />
        <p className="legend" aria-hidden="true">
          {ghost && <span className="is-target">真正的{shapeNames[ghost]}</span>}
          <span className="is-sum">加起来</span>
          <span className="is-part">细线是每个波</span>
        </p>
      </section>

      <div className="channels is-lab">
        {waves.map((wave, i) => (
          <article key={wave.n} className="channel" style={{ "--c": colorOf(wave.n) } as CSSProperties}>
            <header className="channel-head">
              <span className="channel-dot" aria-hidden="true" />
              <b>{wave.n} 号波</b>
              <small>{220 * wave.n} 赫兹</small>
            </header>
            <Slider label="高矮" value={wave.amp} min={AMP.min} max={AMP.max} step={0.01} format={fixed(2)} color={colorOf(wave.n)}
              onChange={(amp) => setWave(i, { amp })} />
            <Slider label="挪一挪" value={wave.phase} min={0} max={360 - PHASE_STEP} step={PHASE_STEP} wrap format={degrees} color={colorOf(wave.n)}
              onChange={(phase) => setWave(i, { phase })} />
          </article>
        ))}
      </div>

      <h2 className="section-title">要多少个波才够？</h2>
      <Chat lines={pairLines(introTalks.gibbs)} />
      <section className="card plot-card" aria-label="越加越像">
        <div className="play-actions">
          {shapes.map((shape) => (
            <button key={shape} type="button" className="pill-btn" aria-pressed={gibbsShape === shape} onClick={() => setGibbsShape(shape)}>{shapeNames[shape]}</button>
          ))}
          <button type="button" className="pill-btn" aria-pressed={tone === "gibbs"} onClick={() => playTone("gibbs", recipe)}>🎵 听一听</button>
        </div>
        <Slider label="用几个波" value={terms} min={1} max={40} step={1} onChange={setTerms} format={(v) => `${v} 个`} />
        <WavePlot label={`用 ${terms} 个波拼${shapeNames[gibbsShape]}`} target={ideal} sum={partial} />
        <p className="win-note">
          用到了 {recipe.map((w) => w.n).slice(0, 8).join("、")}{recipe.length > 8 ? "……" : ""} 号波。
          {overshoot !== null && terms > 2 && ` 拐角旁边的小尖角还高出 ${Math.round(overshoot * 100)}%，这叫吉布斯现象，波再多也去不掉。`}
          {overshoot === null && " 三角波没有跳变，小尖角不会出现，很快就拼得很像。"}
        </p>
      </section>
    </div>
  );
}
