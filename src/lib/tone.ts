import { useSyncExternalStore } from "react";
import { rad, type Wave } from "./fourier.ts";

/** 把拼好的波直接放出声音：1 号波是 220 赫兹，几号波就是它的几倍。 */
const BASE = 220;

let ctx: AudioContext | null = null;
let stop: (() => void) | null = null;
let playing: string | null = null;
const listeners = new Set<() => void>();

function setPlaying(id: string | null) {
  playing = id;
  listeners.forEach((listener) => listener());
}

export function stopTone() {
  stop?.();
  stop = null;
  if (playing) setPlaying(null);
}

export const hasSound = (parts: readonly Wave[]) => parts.some((p) => Math.abs(p.amp) > 1e-3);

/** 同一个 id 再点一次就停下。 */
export function playTone(id: string, parts: readonly Wave[], seconds = 1.6, base = BASE) {
  if (playing === id) return stopTone();
  stopTone();
  if (!hasSound(parts)) return;
  const top = Math.max(1, ...parts.map((p) => p.n));
  const real = new Float32Array(top + 1);
  const imag = new Float32Array(top + 1);
  for (const { n, amp, phase } of parts) {
    real[n] += amp * Math.sin(rad(phase));
    imag[n] += amp * Math.cos(rad(phase));
  }
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(ctx.createPeriodicWave(real, imag, { disableNormalization: true }));
    osc.frequency.value = base;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.setValueAtTime(0.12, now + seconds - 0.15);
    gain.gain.linearRampToValueAtTime(0, now + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds);
    const timer = window.setTimeout(() => {
      if (playing === id) setPlaying(null);
    }, seconds * 1000);
    stop = () => {
      window.clearTimeout(timer);
      try { osc.stop(); } catch { /* 已经停了 */ }
    };
    setPlaying(id);
  } catch {
    // 没有 WebAudio 就不出声
  }
}

export function useTone(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => playing
  );
}
