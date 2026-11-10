import { useSyncExternalStore } from "react";
import manifest from "../data/voice-manifest.json";
import type { Line, Who } from "../data/voice-lines";

const clips = (manifest as { clips: Record<string, { file: string; seconds: number }> }).clips;
const base = import.meta.env.BASE_URL;

export const hasClip = (who: Who, text: string) => !!clips[`${who}|${text}`];

const canSynth = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** 没有配好的句子才用浏览器语音，音高分开，听得出是小念还是爸爸。 */
function synth(who: Who, text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!canSynth()) return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    const voice = window.speechSynthesis.getVoices().find((item) => /^zh[-_]CN/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = who === "nian" ? 1.5 : 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

let audio: HTMLAudioElement | null = null;
let run = 0;
let speaking: Line | null = null;
const listeners = new Set<() => void>();

function setSpeaking(line: Line | null) {
  speaking = line;
  listeners.forEach((listener) => listener());
}

function play(who: Who, text: string, token: number): Promise<void> {
  const clip = clips[`${who}|${text}`];
  if (!clip) return synth(who, text);
  return new Promise((resolve) => {
    if (token !== run) return resolve();
    audio = new Audio(`${base}voice/${clip.file}.mp3`);
    audio.onended = () => resolve();
    audio.onerror = () => synth(who, text).then(resolve);
    audio.onpause = () => resolve();
    audio.play().catch(() => resolve());
  });
}

/** 小念和爸爸一句接一句地说；再调一次会打断上一段。 */
export async function say(...lines: Line[]) {
  stopSpeaking();
  const token = run;
  for (const line of lines) {
    if (token !== run) return;
    setSpeaking(line);
    await play(line.who, line.text, token);
  }
  if (token === run) setSpeaking(null);
}

export const nian = (text: string): Line => ({ who: "nian", text });
export const dad = (text: string): Line => ({ who: "dad", text });

export function stopSpeaking() {
  run += 1;
  audio?.pause();
  audio = null;
  if (canSynth()) window.speechSynthesis.cancel();
  if (speaking) setSpeaking(null);
}

/** 正在说的那一句，用来让对应的气泡亮起来。 */
export function useSpeaking(): Line | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => speaking
  );
}

export const isSpeaking = (line: Line | null, who: Who, text: string) => line?.who === who && line.text === text;

let tones: AudioContext | null = null;

/** 答对叮咚两声往上走，答错一声低低的。 */
export function chime(right: boolean) {
  try {
    tones ??= new AudioContext();
    const now = tones.currentTime;
    const notes = right ? [660, 880] : [220];
    notes.forEach((frequency, i) => {
      const osc = tones!.createOscillator();
      const gain = tones!.createGain();
      osc.type = right ? "triangle" : "sine";
      osc.frequency.value = frequency;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (right ? 0.25 : 0.4));
      osc.connect(gain).connect(tones!.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {
    // 没有 WebAudio 就不出声
  }
}
