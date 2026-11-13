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

type Instrument = { id: string; emoji: string; name: string; amps: readonly number[]; note: string };

/** 真实声学特征：长笛开管泛音少而柔和；单簧管闭管低音几乎只有奇次泛音；小提琴弓弦粘滑奇偶泛音皆强；管风琴八度叠音。 */
const instruments: readonly Instrument[] = [
  { id: "flute", emoji: "🪈", name: "长笛", amps: [1, 0.35, 0.12, 0.05, 0.02, 0], note: "长笛两头通气，几乎只有 1 号基音和一点点 2 号泛音，所以波形圆润，声音温柔纯净。" },
  { id: "clarinet", emoji: "🎷", name: "单簧管", amps: [1, 0.06, 0.72, 0.05, 0.45, 0.04], note: "单簧管像一头堵住的管子，低音区几乎只有 1、3、5 奇数号泛音，波形像方波，声音空灵醇厚。" },
  { id: "violin", emoji: "🎻", name: "小提琴", amps: [0.9, 0.68, 0.55, 0.42, 0.34, 0.26], note: "琴弓拉弦一抓一放，奇偶号泛音都很丰富，波形接近锯齿波，所以声音明亮、有歌唱感。" },
  { id: "organ", emoji: "🎹", name: "管风琴", amps: [1, 0.65, 0, 0.45, 0, 0.25], note: "管风琴把 1 号、2 号、4 号八度音管叠在一起，听起来庄严饱满，像一座小教堂。" }
];

/** 有跳变的名波：平台多高、一跳跳多少。小尖角按跳的高度算百分比。 */
const jumps: Partial<Record<Shape, { top: number; jump: number }>> = {
  square: { top: Math.PI / 4, jump: Math.PI / 2 },
  saw: { top: Math.PI / 2, jump: Math.PI }
};

type Props = { settings: Settings; onBack: () => void };

export function LabPage({ settings, onBack }: Props) {
  const [waves, setWaves] = useState(empty);
  const [ghost, setGhost] = useState<Shape | null>(null);
  const [instId, setInstId] = useState<string | null>(null);
  const [phaseScrambled, setPhaseScrambled] = useState(false);
  const [gibbsShape, setGibbsShape] = useState<Shape>("square");
  const [terms, setTerms] = useState(3);
  const tone = useTone();

  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.lab));
  }, []);

  const sum = plotWaves(waves);
  const target = useMemo(() => (ghost ? plotValues(shapeAt[ghost]) : undefined), [ghost]);
  const activeInst = instruments.find((item) => item.id === instId) ?? null;

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
    setInstId(null);
    if ("amp" in change) setPhaseScrambled(false);
    setWaves(waves.map((w, j) => (j === i ? { ...w, ...change } : w)));
  };
  const usePreset = (shape: Shape) => {
    setWaves(shapeRecipe(shape, COUNT).map((w) => ({ ...w, amp: Math.round(w.amp * 100) / 100 })));
    setGhost(shape);
    setInstId(null);
    setPhaseScrambled(false);
  };
  const useInstrument = (inst: Instrument) => {
    const next = inst.amps.map((amp, i) => ({ n: i + 1, amp, phase: 0 }));
    setWaves(next);
    setGhost(null);
    setInstId(inst.id);
    setPhaseScrambled(false);
    playTone("lab", next);
  };
  const scramblePhases = () => {
    const next = waves.map((w, i) => (Math.abs(w.amp) > 0.001
      ? { ...w, phase: ((i * 5 + Math.floor(Math.random() * 11) + 2) * PHASE_STEP) % 360 }
      : w));
    setWaves(next);
    setPhaseScrambled(true);
    playTone("lab", next);
  };
  const resetPhases = () => {
    const next = waves.map((w) => ({ ...w, phase: 0 }));
    setWaves(next);
    setPhaseScrambled(false);
    playTone("lab", next);
  };

  const activeCount = waves.filter((w) => Math.abs(w.amp) > 0.001).length;

  return (
    <div className="page lab-page">
      <TopBar emoji="🎛️" title="拼波工作台" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.lab)} />

      <div className="preset-groups">
        <div className="play-actions">
          <small className="preset-label">名波配方</small>
          {shapes.map((shape) => (
            <button key={shape} type="button" className="pill-btn" aria-pressed={ghost === shape} onClick={() => usePreset(shape)}>
              {shape === "square" ? "🟦" : shape === "saw" ? "🪚" : "🔺"} {shapeNames[shape]}
            </button>
          ))}
          <button type="button" className="pill-btn" onClick={() => { setWaves(empty()); setGhost(null); setInstId(null); setPhaseScrambled(false); }}>↺ 只留 1 号波</button>
          <button type="button" className="pill-btn" aria-pressed={tone === "lab"} disabled={!hasSound(waves)} onClick={() => playTone("lab", waves)}>🎵 听一听</button>
        </div>

        <div className="play-actions">
          <small className="preset-label">乐器音色</small>
          {instruments.map((inst) => (
            <button key={inst.id} type="button" className="pill-btn" aria-pressed={instId === inst.id} onClick={() => useInstrument(inst)}>
              {inst.emoji} {inst.name}
            </button>
          ))}
          <button type="button" className="pill-btn" disabled={activeCount < 2} onClick={scramblePhases}>🎲 打乱出发点再听</button>
          {phaseScrambled && <button type="button" className="pill-btn" onClick={resetPhases}>↔️ 对齐出发点</button>}
        </div>
      </div>

      <section className="card plot-card" aria-label="工作台波形">
        <WavePlot label="六个波加起来的样子" target={target} sum={sum}
          parts={waves.filter((w) => Math.abs(w.amp) > 0.001).map((w) => ({ values: plotWaves([w]), color: colorOf(w.n) }))} />
        <p className="legend" aria-hidden="true">
          {ghost && <span className="is-target">真正的{shapeNames[ghost]}</span>}
          <span className="is-sum">加起来</span>
          <span className="is-part">细线是每个波</span>
        </p>
        {activeInst && !phaseScrambled && <p className="story-callout">{activeInst.emoji} <b>{activeInst.name}的泛音密码：</b>{activeInst.note}</p>}
        {phaseScrambled && (
          <p className="story-callout">
            👂 <b>耳朵的奇妙发现（欧姆声学定律）：</b>看！把各个波的出发点打乱以后，橙色总波形完全变了样，但你点“↔️ 对齐出发点”前后对比听听——<b>声音几乎一模一样！</b>因为人耳里的耳蜗像一排小琴键，只量每个号的波有多高，不太在乎它们谁先出发。
          </p>
        )}
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
        {overshoot !== null && terms >= 10 && (
          <p className="story-callout">
            ⚙️ <b>历史小故事：</b>1898 年，物理学家迈克尔逊用 80 根弹簧造了一台机械谐波分析仪。画方波和锯齿波时，他总看到拐角翘出这个小尖角，还以为是弹簧没调准，写信给《自然》杂志求教；数学家吉布斯算了又算，回信证明这不是机器坏了，而是无穷级数天生的脾气！
          </p>
        )}
      </section>
    </div>
  );
}
