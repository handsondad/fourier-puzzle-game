import type { Line, Who } from "../data/voice-lines";
import { isSpeaking, say, useSpeaking } from "../lib/speech";
import { stopTone } from "../lib/tone";
import { Avatar } from "./Avatar";

export type Settings = {
  sound: boolean;
  setSound: (sound: boolean) => void;
};

export function SpeakButton({ who, text, label }: { who: Who; text: string; label?: string }) {
  const speaking = isSpeaking(useSpeaking(), who, text);
  return (
    <button type="button" className={`speak-btn${speaking ? " is-speaking" : ""}`} aria-label={label ?? `听${who === "nian" ? "小念" : "爸爸"}读：${text}`}
      onClick={() => { stopTone(); say({ who, text }); }}>
      🔊
    </button>
  );
}

type TopBarProps = { emoji: string; title: string; onBack: () => void; backLabel?: string; settings: Settings };

export function TopBar({ emoji, title, onBack, backLabel = "回到首页", settings }: TopBarProps) {
  const { sound, setSound } = settings;
  return (
    <header className="topbar">
      <button type="button" className="pill-btn" onClick={onBack}>← {backLabel}</button>
      <h1><span aria-hidden="true">{emoji}</span> {title}</h1>
      <div className="topbar-tools">
        <button type="button" className="pill-btn sound-btn" aria-pressed={sound} onClick={() => setSound(!sound)}
          aria-label={sound ? "小念和爸爸自动说话：开" : "小念和爸爸自动说话：关"} title={sound ? "小念和爸爸会自动说话" : "只有点 🔊 才说话"}>
          {sound ? "🔊" : "🔇"}
        </button>
      </div>
    </header>
  );
}

function Says({ who, children }: { who: Who; children: string }) {
  const speaking = isSpeaking(useSpeaking(), who, children);
  const name = who === "nian" ? "小念" : "爸爸";
  return (
    <div className={`says is-${who}${speaking ? " is-speaking" : ""}`}>
      <span className="says-avatar"><Avatar who={who} /></span>
      <div className="says-bubble">
        <b>{name}说 <SpeakButton who={who} text={children} label={`听${name}说`} /></b>
        <p>{children}</p>
      </div>
    </div>
  );
}

export const DadSays = ({ children }: { children: string }) => <Says who="dad">{children}</Says>;

export const NianSays = ({ children }: { children: string }) => <Says who="nian">{children}</Says>;

/** 小念和爸爸一句接一句；有 playLabel 时多一个按钮，从头到尾读一遍。 */
export function Chat({ lines, playLabel }: { lines: readonly Line[]; playLabel?: string }) {
  const speaking = useSpeaking();
  const playing = lines.some((line) => isSpeaking(speaking, line.who, line.text));
  return (
    <div className="chat">
      {playLabel && (
        <button type="button" className={`pill-btn chat-play${playing ? " is-speaking" : ""}`} onClick={() => { stopTone(); say(...lines); }}>
          {playing ? "🔊" : "▶"} {playLabel}
        </button>
      )}
      {lines.map((line, i) => <Says key={i} who={line.who}>{line.text}</Says>)}
    </div>
  );
}
