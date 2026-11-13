import { useEffect, useMemo, useState } from "react";
import { PhotoGrid } from "../components/PhotoGrid";
import { Chat, TopBar, type Settings } from "../components/Shared";
import { Slider } from "../components/Slider";
import { dadLines, introTalks } from "../data/lines";
import { photos } from "../data/photos";
import { pairLines } from "../data/voice-lines";
import { basisStripe, decomposePhoto, filterPhoto, PHOTO_SIZE, PHOTO_TOTAL, type PhotoFilter } from "../lib/photoWaves";
import { dad, say } from "../lib/speech";

const INSPECT_N = 8;
const blankGrid = () => new Array<number>(PHOTO_TOTAL).fill(0);

type Props = { settings: Settings; onBack: () => void };

export function PhotoPage({ settings, onBack }: Props) {
  const [photoId, setPhotoId] = useState(photos[1].id);
  const [custom, setCustom] = useState<number[] | null>(null);
  const [mode, setMode] = useState<PhotoFilter>("compress");
  const [count, setCount] = useState(32);
  const [pickedCell, setPickedCell] = useState<[number, number]>([1, 1]);

  useEffect(() => {
    if (settings.sound) say(...pairLines(introTalks.photo));
  }, []);

  const currentItem = photos.find((p) => p.id === photoId) ?? photos[0];
  const source = custom ?? currentItem.pixels;
  const coeffs = useMemo(() => decomposePhoto(source), [source]);
  const result = useMemo(() => filterPhoto(coeffs, mode, count), [coeffs, mode, count]);

  const [u, v] = pickedCell;
  const stripe = useMemo(() => basisStripe(u, v), [u, v]);
  const cellIndex = v * PHOTO_SIZE + u;
  const cellWeight = coeffs[cellIndex] ?? 0;
  const maxWeight = useMemo(
    () => Math.max(0.2, ...coeffs.slice(1).map((c) => Math.abs(c))),
    [coeffs]
  );

  function choosePreset(id: string) {
    setPhotoId(id);
    setCustom(null);
  }

  function startCustom() {
    if (!custom) setCustom([...source]);
    say(dad(dadLines.photoOwn));
  }

  function paintCell(index: number, erase: boolean) {
    setCustom((prev) => {
      const next = [...(prev ?? source)];
      next[index] = erase ? 0 : 1;
      return next;
    });
  }

  const savedPct = Math.round((1 - result.kept / PHOTO_TOTAL) * 100);
  const qualityPct = Math.round(result.quality * 100);

  return (
    <div className="page photo-page">
      <TopBar emoji="🖼️" title="照片里的波" onBack={onBack} settings={settings} />
      <Chat lines={pairLines(introTalks.photo)} />

      <div className="play-actions">
        {photos.slice(0, 6).map((item) => (
          <button key={item.id} type="button" className="pill-btn" aria-pressed={!custom && photoId === item.id} onClick={() => choosePreset(item.id)}>
            {item.emoji} {item.name}
          </button>
        ))}
        <button type="button" className="pill-btn" aria-pressed={!!custom} onClick={startCustom}>✏️ 我自己涂</button>
        {custom && <button type="button" className="pill-btn" onClick={() => setCustom(blankGrid())}>🧹 清空方格</button>}
      </div>

      <div className="photo-layout">
        <figure className="card wind-figure">
          <figcaption>{custom ? "按住方格涂一涂（再点擦掉）" : `原来的小画（${PHOTO_TOTAL} 个方格）`}</figcaption>
          <PhotoGrid label="原来的 16 乘 16 小画" pixels={source} crisp onPaint={custom ? paintCell : undefined} />
        </figure>

        <figure className="card wind-figure">
          <figcaption>
            {mode === "high" ? `只留 ${result.kept} 个快波（抓边缘）` : `用 ${result.kept} 个条纹波叠出来`}
          </figcaption>
          <PhotoGrid
            label={`用 ${result.kept} 个条纹波重建的画面`}
            pixels={result.pixels}
            palette={mode === "high" ? "edge" : "ink"}
          />
        </figure>

        <div className="card photo-controls">
          <div className="play-actions is-tight" role="group" aria-label="留波方式">
            <button type="button" className="pill-btn" aria-pressed={mode === "compress"} onClick={() => { setMode("compress"); setCount(32); }}>
              📦 照片瘦身
            </button>
            <button type="button" className="pill-btn" aria-pressed={mode === "low"} onClick={() => { setMode("low"); setCount(24); }}>
              🌫️ 只留慢波
            </button>
            <button type="button" className="pill-btn" aria-pressed={mode === "high"} onClick={() => { setMode("high"); setCount(120); }}>
              ✏️ 只留快波
            </button>
          </div>

          <Slider
            label="留几个波"
            value={count}
            min={1}
            max={PHOTO_TOTAL}
            step={1}
            color="#4d96ff"
            onChange={setCount}
            format={(n) => `${n} 个`}
          />

          <div className="play-actions is-tight">
            <button type="button" className="pill-btn" onClick={() => setCount(8)}>8 个</button>
            <button type="button" className="pill-btn" onClick={() => setCount(32)}>32 个（省 87%）</button>
            <button type="button" className="pill-btn" onClick={() => setCount(PHOTO_TOTAL)}>全部 256 个</button>
          </div>

          {mode === "compress" && (
            <p className="story-callout">
              📷 <b>手机省空间的秘密（JPEG 原理）：</b>现在只留了最重要的 <b>{result.kept}</b> 个条纹波，扔掉了 <b>{savedPct}%</b> 的数据，却还原了 <b>{qualityPct}%</b> 的画面细节！
            </p>
          )}
          {mode === "low" && (
            <p className="story-callout">
              🌫️ <b>慢波管大色块：</b>宽宽的慢条纹把图案的大概位置和胖瘦铺了出来，但没有细条纹帮忙，边缘就像隔着毛玻璃一样柔光模糊。
            </p>
          )}
          {mode === "high" && (
            <p className="story-callout">
              ✏️ <b>快波管边缘轮廓：</b>把慢波抽走、只留密密麻麻的快条纹，大色块全不见了，只剩下颜色突然跳变的轮廓线，像一张素描！
            </p>
          )}
        </div>
      </div>

      <section className="card basis-section" aria-labelledby="basis-title">
        <h2 id="basis-title" className="section-title is-small">🔍 点小格子，看看每一张“条纹毯子”（前 8×8 个波）</h2>
        <div className="basis-layout">
          <div>
            <div className="basis-matrix" role="grid" aria-label="前 8 乘 8 个二维条纹波">
              {Array.from({ length: INSPECT_N * INSPECT_N }, (_, i) => {
                const cu = i % INSPECT_N;
                const cv = Math.floor(i / INSPECT_N);
                const idx = cv * PHOTO_SIZE + cu;
                const w = coeffs[idx];
                const active = result.mask[idx];
                const selected = cu === u && cv === v;
                const strength = idx === 0 ? 0.55 : Math.min(1, Math.abs(w) / maxWeight);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`basis-cell${selected ? " is-selected" : ""}${active ? " is-kept" : " is-dropped"}`}
                    onClick={() => setPickedCell([cu, cv])}
                    aria-label={`横向 ${cu} 次，纵向 ${cv} 次，权重 ${w.toFixed(2)}`}
                  >
                    <span
                      className="basis-dot"
                      style={{
                        opacity: 0.18 + strength * 0.82,
                        background: idx === 0 ? "#8b7a5c" : w >= 0 ? "#f07b12" : "#4d96ff"
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <p className="legend basis-legend" aria-hidden="true">
              <span>左上角最慢，往右、往下越来越密 · 实框是当前留下的波，虚框是省掉的波</span>
            </p>
          </div>

          <div className="basis-detail">
            <PhotoGrid label={`横向 ${u} 次、纵向 ${v} 次的条纹毯子`} pixels={stripe} palette="wave" />
            <div>
              <h3>{u === 0 && v === 0 ? "平均底色（0 号慢波）" : `横着起伏 ${u} 次 · 竖着起伏 ${v} 次`}</h3>
              <p className="win-note">
                这张条纹毯子在当前小画里的分量是 <b>{cellWeight >= 0 ? "+" : "−"}{Math.abs(cellWeight).toFixed(2)}</b>
                （{result.mask[cellIndex] ? "✅ 当前已保留" : "💨 当前已省掉"}）。
              </p>
              <p className="win-note">
                橙色是往亮处加，蓝色是往暗处减。把所有保留下来的条纹毯子按分量叠在一起，就拼出了上面的图！
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
