import { useEffect, useMemo, useRef, useState } from "react";
import { Burst } from "../components/GameKit";
import { Chat, DadSays, TopBar, type Settings } from "../components/Shared";
import { fixed, Slider } from "../components/Slider";
import { SkyStage } from "../components/SkyStage";
import { introTalks } from "../data/lines";
import { planets, skyLines, skyTalk, type Planet } from "../data/sky";
import { pairLines, talkLines } from "../data/voice-lines";
import { chime, dad, say } from "../lib/speech";
import { DEFERENT, EPI_RADIUS, EPI_SPEED, FIT_GOAL, skyMatch, snapEpicycle, trueEpicycle, type Epicycle } from "../lib/sky";
import { Meter } from "./WaveLevelsPage";

const start: Epicycle = { r: 0, speed: 0.5 };
const speedText = (v: number) => `${v} 圈`;

type Props = { settings: Settings; onBack: () => void; onGo: (hash: string) => void };

export function SkyPage({ settings, onBack, onGo }: Props) {
  const [planet, setPlanet] = useState<Planet>(planets[0]);
  const [playing, setPlaying] = useState(true);
  const [epi, setEpi] = useState<Epicycle>(start);
  const [won, setWon] = useState(false);
  const later = useRef(0);

  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.sky));
    return () => window.clearTimeout(later.current);
  }, []);

  const match = useMemo(() => skyMatch(planet, planet.loops, epi), [planet, epi]);
  const pct = Math.round(match * 100);

  useEffect(() => {
    if (won || match < FIT_GOAL) return;
    setWon(true);
    chime(true);
    later.current = window.setTimeout(() => say(dad(planet.fit)), 350);
  }, [match]);

  function pickPlanet(next: Planet) {
    setPlanet(next);
    setEpi(start);
    setWon(false);
  }

  return (
    <div className="page sky-page">
      <TopBar emoji="🔭" title="托勒密的天空" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.sky)} />

      <div className="play-actions">
        {planets.map((p) => (
          <button key={p.id} type="button" className="pill-btn" aria-pressed={planet.id === p.id} onClick={() => pickPlanet(p)}>{p.emoji} {p.name}</button>
        ))}
        <button type="button" className="pill-btn" aria-pressed={!playing} onClick={() => setPlaying(!playing)}>{playing ? "⏸ 停一停" : "▶ 接着转"}</button>
      </div>

      <h2 className="section-title">① 站在地球上看{planet.name}</h2>
      <div className="sky-layout">
        <section className="card sky-card" aria-label={`从地球上看${planet.name}`}>
          <SkyStage label={`地球在中间，${planet.name}一边往前走，一边打小圈`} planet={planet} playing={playing} band />
        </section>
        <div className="sky-side">
          <DadSays>{skyLines.watch}</DadSays>
          <div className="card sky-facts">
            <p><span aria-hidden="true">{planet.emoji}</span> {planet.name}{planet.retro}。</p>
            <p><span aria-hidden="true">🧭</span> 下面那条是天空：只看{planet.name}在哪个方向。粉色的点在往回走。</p>
            <p><span aria-hidden="true">🤔</span> 如果{planet.name}只沿着一个圆转，就永远只会往前走，打不出小圈。</p>
          </div>
        </div>
      </div>

      <h2 className="section-title">② 托勒密的办法：均轮 + 本轮</h2>
      <Chat lines={pairLines(skyLines.model)} />
      <div className="sky-layout">
        <section className="card sky-card" aria-label="托勒密的均轮和本轮">
          <SkyStage label={`均轮上带着本轮，本轮上带着${planet.name}；白点是观测记录`} planet={planet} epicycle={epi} playing={playing} />
          <p className="legend" aria-hidden="true">
            <span className="is-dots">白点：观测记录</span>
            <span className="is-deferent">虚线：均轮</span>
            <span className="is-epicycle">黄圈：本轮</span>
          </p>
        </section>
        <div className="sky-side">
          <div className="card sky-controls">
            {won && <Burst />}
            <Meter pct={pct} goal={Math.round(FIT_GOAL * 100)} />
            <p className="win-note">均轮已经给好了：半径 {DEFERENT} 份，{planet.turn}转一圈。</p>
            <Slider label="本轮多大" value={epi.r} min={EPI_RADIUS.min} max={EPI_RADIUS.max} step={EPI_RADIUS.step} format={(v) => `${fixed(1)(v)} 份`} color="#e0a800"
              onChange={(r) => setEpi({ ...epi, r })} />
            <Slider label="一年转几圈" value={epi.speed} min={EPI_SPEED.min} max={EPI_SPEED.max} step={EPI_SPEED.step} format={speedText} color="#e0a800"
              onChange={(speed) => setEpi({ ...epi, speed })} />
            <div className="play-actions">
              <button type="button" className="pill-btn" onClick={() => setEpi(snapEpicycle(trueEpicycle(planet)))} disabled={won}>💡 看答案</button>
              <button type="button" className="pill-btn" onClick={() => { setEpi(start); setWon(false); }}>↺ 重来</button>
            </div>
          </div>
          {won && (
            <div className="card sky-won" aria-live="polite">
              <DadSays>{planet.fit}</DadSays>
              <p className="win-note">
                你调的本轮：{fixed(1)(epi.r)} 份，一年转 {epi.speed} 圈。<br />
                托勒密《至大论》（大约公元 150 年）：{planet.ptolemy} 份。
              </p>
              {planets.some((p) => p.id !== planet.id) && <p className="win-note">换一颗行星试试，看看它的本轮一年转几圈。</p>}
            </div>
          )}
        </div>
      </div>

      <h2 className="section-title">③ 从两个圆，到很多个圆</h2>
      <section className="card sky-next">
        <Chat lines={talkLines(skyTalk)} playLabel="听小念和爸爸聊" />
        <div className="play-actions">
          <button type="button" className="primary-btn" onClick={() => onGo("#/draw")}>🎡 去圆上圆画板，用很多个圆画画</button>
          <button type="button" className="pill-btn" onClick={() => onGo("#/wind")}>🌀 怎么算出每个圆：缠绕找重心</button>
        </div>
      </section>
    </div>
  );
}
