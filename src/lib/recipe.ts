import { sampleWaves, shuffle, waveMatch, type Random, type Wave } from "./fourier.ts";

export type Recipe = readonly Wave[];

/** wave：给一条波，挑配方；recipe：给一份配方，挑波。 */
export type RecipeQuestion = { key: string; kind: "wave" | "recipe"; answer: Recipe; options: Recipe[] };

export const RECIPE_N = 6;
export const RECIPE_COUNT = 8;
const sizes = [1, 1, 1, 2, 2, 2, 3, 3] as const;
const amps = [1, 0.5, -1, -0.5];

const byN = (parts: Wave[]) => parts.sort((a, b) => a.n - b.n);
const pick = <T>(list: readonly T[], random: Random) => list[Math.floor(random() * list.length)];

function randomRecipe(size: number, random: Random): Wave[] {
  const ns = shuffle(Array.from({ length: RECIPE_N }, (_, i) => i + 1), random).slice(0, size);
  return byN(ns.map((n, i) => ({ n, amp: i === 0 ? pick([1, -1], random) : pick(amps, random), phase: 0 })));
}

/** 改一处：换个号、翻个面，或者高矮换一换。 */
function mutate(recipe: Recipe, random: Random): Wave[] {
  const out = recipe.map((w) => ({ ...w }));
  const i = Math.floor(random() * out.length);
  const how = Math.floor(random() * 3);
  if (how === 0) {
    const free = Array.from({ length: RECIPE_N }, (_, j) => j + 1).filter((n) => !out.some((w) => w.n === n));
    out[i].n = pick(free, random);
  } else if (how === 1) {
    out[i].amp = -out[i].amp;
  } else {
    out[i].amp = Math.sign(out[i].amp) * (Math.abs(out[i].amp) === 1 ? 0.5 : 1);
  }
  return byN(out);
}

/** 两份配方拼出来的波差得够远，孩子才分得出来。 */
export function distinct(a: Recipe, b: Recipe): boolean {
  const sa = sampleWaves(a);
  const sb = sampleWaves(b);
  return waveMatch(sa, sb) < 0.6 && waveMatch(sb, sa) < 0.6;
}

export function recipeQuestion(index: number, random: Random = Math.random): RecipeQuestion {
  const size = sizes[index];
  const answer = randomRecipe(size, random);
  const options: Wave[][] = [answer];
  for (let tries = 0; options.length < 3 && tries < 200; tries++) {
    const other = tries < 100 ? mutate(answer, random) : randomRecipe(size, random);
    if (options.every((o) => distinct(o, other))) options.push(other);
  }
  return { key: `${index}-${answer.map((w) => `${w.n}:${w.amp}`).join(",")}`, kind: index % 2 ? "recipe" : "wave", answer, options: shuffle(options, random) };
}

export const recipeRound = (random: Random = Math.random) =>
  Array.from({ length: RECIPE_COUNT }, (_, i) => recipeQuestion(i, random));

export const ampText = (amp: number) => (amp < 0 ? "−" : "") + (Math.abs(amp) === 0.5 ? "½" : "1");
