import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { introTalks } from "../src/data/lines.ts";
import { skyLines, skyTalk } from "../src/data/sky.ts";
import { talks } from "../src/data/talks.ts";
import { pairLines, talkLines, voiceLines } from "../src/data/voice-lines.ts";
import { clipHash, voices } from "../tools/voice/voices.mjs";

const manifest = JSON.parse(readFileSync(new URL("../src/data/voice-manifest.json", import.meta.url), "utf8"));

test("小念和爸爸用的是 bodyverse 里同样的声音", () => {
  assert.deepEqual(voices.nian, { voice: "zh-CN-YunxiaNeural", rate: "+0%" });
  assert.deepEqual(voices.dad, { voice: "zh-CN-YunxiNeural", rate: "-5%" });
  assert.deepEqual(manifest.voices, voices);
});

test("讲解都是小念问、爸爸答，和 bodyverse 一样", () => {
  for (const pair of [...Object.values(introTalks), skyLines.model]) {
    assert.deepEqual(pairLines(pair).map((line) => line.who), ["nian", "dad"]);
    assert.match(pair[0], /？$/, `小念要先问：${pair[0]}`);
  }
  for (const talk of [...talks, skyTalk]) {
    assert.ok(talk.turns.length >= 2, `${talk.title} 至少追问一次`);
    for (const turn of talk.turns) assert.match(turn.nian, /？$/, `小念要问：${turn.nian}`);
    const lines = talkLines(talk);
    assert.deepEqual(lines.map((line) => line.who), [...talk.turns.flatMap(() => ["nian", "dad"]), "nian"], "一问一答，最后小念总结");
  }
});

test("念出来的句子里没有字母，免得读成英文", () => {
  assert.deepEqual(voiceLines().filter(({ text }) => /[A-Za-z]/.test(text)), []);
});

test("每一句台词都配好了音，而且是最新的", () => {
  const missing = voiceLines().filter(({ who, text }) => {
    const clip = manifest.clips[`${who}|${text}`];
    return !clip || clip.file !== `${who}/${clipHash(who, text)}` || !existsSync(new URL(`../public/voice/${clip.file}.mp3`, import.meta.url));
  });
  assert.deepEqual(missing.map(({ who, text }) => `${who}|${text}`), [], "运行 npm run voice 补上");
});
