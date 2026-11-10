import { discLevels } from "./discLevels.ts";
import { chats, dadLines, gameLines, introTalks, programs, radioLines, recipeLines, rightLine, type Pair } from "./lines.ts";
import { planets, skyLines, skyTalk } from "./sky.ts";
import { talks, type Talk } from "./talks.ts";
import { waveLevels } from "./waveLevels.ts";

export type Who = "nian" | "dad";
export type Line = { who: Who; text: string };

export const pairLines = ([nian, dad]: Pair): Line[] => [{ who: "nian", text: nian }, { who: "dad", text: dad }];

/** 一问一答读下来，最后小念总结。 */
export const talkLines = (talk: Talk): Line[] => [
  ...talk.turns.flatMap(({ nian, dad }) => pairLines([nian, dad])),
  { who: "nian", text: talk.wrap }
];

/** 游戏里所有要配音的句子，`npm run voice` 按这张单子生成。 */
export function voiceLines(): Line[] {
  const lines = new Map<string, Line>();
  const add = (who: Who, text: string) => lines.set(`${who}|${text}`, { who, text });
  const addAll = (list: readonly Line[]) => list.forEach(({ who, text }) => add(who, text));

  for (const pair of [...chats, ...Object.values(introTalks), skyLines.model]) addAll(pairLines(pair));
  for (const talk of [...talks, skyTalk]) addAll(talkLines(talk));
  add("dad", skyLines.watch);
  for (const planet of planets) add("dad", planet.fit);
  add("nian", rightLine);
  for (const text of Object.values(dadLines)) add("dad", text);
  for (const level of [...waveLevels, ...discLevels]) {
    add("dad", level.story);
    add("dad", level.hint);
    add("dad", level.win);
  }
  for (const { done } of Object.values(gameLines)) for (const text of done) add("dad", text);
  for (const text of Object.values(radioLines)) add("dad", text);
  for (const program of programs) add("nian", program.line);
  add("dad", recipeLines.wave);
  add("dad", recipeLines.recipe);
  for (const text of recipeLines.explain) add("dad", text);
  return [...lines.values()];
}
