import { useRef, useState, type CSSProperties } from "react";
import type { Best, Stars } from "../App";
import { Avatar } from "../components/Avatar";
import { starRow } from "../components/GameKit";
import { Chat } from "../components/Shared";
import { discLevels } from "../data/discLevels";
import { chats } from "../data/lines";
import { talks } from "../data/talks";
import { talkLines } from "../data/voice-lines";
import { waveLevels } from "../data/waveLevels";
import { dad, isSpeaking, nian, say, stopSpeaking, useSpeaking } from "../lib/speech";

type Props = { waveStars: Stars; discStars: Stars; best: Best; onGo: (hash: string) => void };

const total = (stars: Stars) => Object.values(stars).reduce<number>((sum, n) => sum + (n ?? 0), 0);

export function HomePage({ waveStars, discStars, best, onGo }: Props) {
  const [chat, setChat] = useState(0);
  const [nianLine, dadLine] = chats[chat];
  const [openTalk, setOpenTalk] = useState<number | null>(null);
  const speaking = useSpeaking();

  /** 打开就从头聊一遍，收起就不说了。 */
  function toggleTalk(i: number) {
    if (openTalk === i) {
      setOpenTalk(null);
      stopSpeaking();
      return;
    }
    setOpenTalk(i);
    say(...talkLines(talks[i]));
  }

  /** 第一次点先把眼前这一段说出来，之后每点一次换下一段。 */
  const heard = useRef(false);

  function talk() {
    const next = heard.current ? (chat + 1) % chats.length : chat;
    heard.current = true;
    setChat(next);
    say(nian(chats[next][0]), dad(chats[next][1]));
  }

  const bestOf = (game: keyof Best) => (best[game] ? starRow(best[game]) : "还没玩过");

  const learn: Mode[] = [
    { emoji: "🔭", title: "托勒密的天空", hook: "火星为什么会倒着走？学两千年前的托勒密，用均轮套本轮，画出行星打的圈圈。", count: "从这里开始", color: "#3d5a99", hash: "#/sky" },
    { emoji: "🎛️", title: "拼波工作台", hook: "六个正弦波随你调，试试长笛、单簧管、小提琴的泛音配方，再打乱出发点考考耳朵。", count: "名波 + 乐器音色", color: "#4d96ff", hash: "#/lab" },
    { emoji: "🎡", title: "圆上圆画板", hook: "圆盘一个套一个地转，八个圆盘就能画出冯·诺依曼的大象！还能自己画一圈。", count: "大象 · 蝴蝶 · 手绘", color: "#6bcb77", hash: "#/draw" },
    { emoji: "🌀", title: "缠绕找重心", hook: "把曲线反着缠几圈，找它的重心，就知道里面藏着哪些圆盘。", count: "傅里叶的秘密武器", color: "#a66cff", hash: "#/wind" },
    { emoji: "🖼️", title: "照片里的波", hook: "把波铺成横竖交错的条纹毯子叠成图画！扔掉八成细波，看手机怎么给照片瘦身。", count: "二维条纹波与压缩", color: "#ff7a5c", hash: "#/photo" }
  ];
  const play: Mode[] = [
    { emoji: "🏆", title: "拼波闯关", hook: "调好每个波的高矮、快慢和出发点，拼出名波、乐器音色、潮汐和双重降噪。", count: `⭐ ${total(waveStars)} / ${waveLevels.length * 3}`, color: "#ff9f43", hash: "#/waves" },
    { emoji: "🎯", title: "圆盘画图", hook: "挑圆盘、调半径，让笔尖画出心形线、雪花、四叶草、小金鱼和太空齿轮。", count: `⭐ ${total(discStars)} / ${discLevels.length * 3}`, color: "#ff6b6b", hash: "#/discs" },
    { emoji: "📻", title: "调台收音机", hook: "三个电台混成一锅粥。转旋钮，跟着转，把它们一个个找出来。", count: bestOf("radio"), color: "#4dc3c3", hash: "#/radio" },
    { emoji: "🧪", title: "波形配方", hook: "看一条波，猜它的配方；看一份配方，猜它拼出哪条波。", count: bestOf("recipe"), color: "#ffb347", hash: "#/recipe" },
    { emoji: "🔍", title: "迷雾显影", hook: "只给你看最慢的几个条纹波，在一团朦胧影子里猜出藏着哪张画，用波越少分越高！", count: bestOf("focus"), color: "#7a6cff", hash: "#/focus" }
  ];

  return (
    <div className="page home">
      <header className="home-title">
        <h1><span aria-hidden="true">🌊</span> 拼波大冒险</h1>
        <p>小念和爸爸用一个个正弦波、一个个转圈的圆盘，拼出各种形状</p>
      </header>

      <section aria-labelledby="home-duo-title">
        <h2 id="home-duo-title" className="section-title">小念和爸爸</h2>
        <div className="duo">
          <svg className="duo-waves" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 210 Q 100 150 200 210 T 400 210 T 600 210 T 800 210 T 1000 210" />
            <path d="M0 230 Q 50 200 100 230 T 200 230 T 300 230 T 400 230 T 500 230 T 600 230 T 700 230 T 800 230 T 900 230 T 1000 230" />
          </svg>
          <button type="button" className={`duo-bubble is-nian${isSpeaking(speaking, "nian", nianLine) ? " is-speaking" : ""}`} onClick={talk}><b>小念</b>{nianLine}</button>
          <button type="button" className={`duo-bubble is-dad${isSpeaking(speaking, "dad", dadLine) ? " is-speaking" : ""}`} onClick={talk}><b>爸爸</b>{dadLine}</button>
          <button type="button" className="duo-people" onClick={talk} aria-label="点一下，小念和爸爸接着聊">
            <span className="duo-dad"><Avatar who="dad" /></span>
            <span className="duo-nian"><Avatar who="nian" /></span>
          </button>
          <span className="duo-hint" aria-hidden="true">点他们，接着聊 👆</span>
        </div>
      </section>

      <Modes id="home-learn-title" title="看一看" modes={learn} onGo={onGo} />
      <Modes id="home-play-title" title="玩一玩" modes={play} onGo={onGo} />

      <section aria-labelledby="home-talks-title">
        <h2 id="home-talks-title" className="section-title">小念问爸爸</h2>
        <div className="talks">
          {talks.map((talk, i) => (
            <article key={talk.title} className={`talk-card${openTalk === i ? " is-open" : ""}`} style={{ "--i": i } as CSSProperties}>
              <button type="button" className="talk-head" aria-expanded={openTalk === i} onClick={() => toggleTalk(i)}>
                <span className="talk-emoji" aria-hidden="true">{talk.emoji}</span>
                <span className="talk-title">
                  <span className="talk-asker"><Avatar who="nian" /></span>
                  <strong>{talk.title}</strong>
                </span>
                <small>{openTalk === i ? "收起 ▲" : "听他们聊 ▶"}</small>
              </button>
              {openTalk === i && <Chat lines={talkLines(talk)} playLabel="从头再听一遍" />}
            </article>
          ))}
        </div>
      </section>

      <p className="home-credit">
        圆上套圆、缠绕找重心的讲法，来自漫士沉思录讲傅里叶变换的科普视频（
        <a href="https://www.youtube.com/watch?v=gbe_NHwkRCI" target="_blank" rel="noreferrer">去看视频</a>）
      </p>
    </div>
  );
}

type Mode = { emoji: string; title: string; hook: string; count: string; color: string; hash: string };

function Modes({ id, title, modes, onGo }: { id: string; title: string; modes: readonly Mode[]; onGo: (hash: string) => void }) {
  const layout = modes.length === 5 ? " is-five" : modes.length === 4 ? " is-four" : "";
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="section-title">{title}</h2>
      <div className={`modes${layout}`}>
        {modes.map((mode) => (
          <button key={mode.title} type="button" className="mode-card" style={{ "--bubble": mode.color } as CSSProperties} onClick={() => onGo(mode.hash)}>
            <span className="mode-emoji" aria-hidden="true">{mode.emoji}</span>
            <strong>{mode.title}</strong>
            <small>{mode.hook}</small>
            <span className="mode-count">{mode.count} →</span>
          </button>
        ))}
      </div>
    </section>
  );
}
