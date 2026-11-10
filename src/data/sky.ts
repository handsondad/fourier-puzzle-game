import type { Orbit } from "../lib/sky.ts";
import type { Pair } from "./lines.ts";
import type { Talk } from "./talks.ts";

export type PlanetId = "mars" | "jupiter" | "saturn";

export type Planet = Orbit & {
  id: PlanetId;
  name: string;
  emoji: string;
  color: string;
  /** 画面上看几次倒着走 */
  loops: number;
  /** 《至大论》里写的本轮半径（均轮是 60 份） */
  ptolemy: number;
  /** 均轮转一圈要多久，给人看的说法 */
  turn: string;
  /** 多久倒着走一次 */
  retro: string;
  /** 拼对以后爸爸说的话，念出来的，不要写字母 */
  fit: string;
};

/** 火星、木星、土星，轨道半径和周期是今天测的值；本轮半径是托勒密书里写的。 */
export const planets: readonly Planet[] = [
  {
    id: "mars", name: "火星", emoji: "🔴", color: "#ff6b4a", a: 1.524, period: 1.881, loops: 2, ptolemy: 39.5,
    turn: "1 年 11 个月", retro: "大约每 2 年 2 个月倒着走一次，一次倒退两个多月",
    fit: "对上了！托勒密书里写的火星本轮是 39.5 份，跟你调的几乎一样。而且它正好一年转一圈。"
  },
  {
    id: "jupiter", name: "木星", emoji: "🟠", color: "#e8a95b", a: 5.203, period: 11.86, loops: 3, ptolemy: 11.5,
    turn: "差不多 12 年", retro: "大约每 1 年 1 个月倒着走一次，一次倒退四个月",
    fit: "对上了！木星的本轮小多了，托勒密写的是 11.5 份。你发现没有，它也是一年转一圈。"
  },
  {
    id: "saturn", name: "土星", emoji: "🪐", color: "#d9b46a", a: 9.537, period: 29.46, loops: 3, ptolemy: 6.5,
    turn: "29 年半", retro: "差不多每年倒着走一次，一次倒退四个多月",
    fit: "对上了！土星离得最远，本轮最小，托勒密写的是 6.5 份。还是一年转一圈！"
  }
];

export const skyLines = {
  watch: "地球在正中间。行星大多时候往前走，可每过一阵子，就会打一个小圈，倒着走一段。粉色的那几段，就是在倒着走。",
  model: ["只用一个圆，转不出小圈圈，怎么办？", "托勒密的办法是：让行星在一个小圆上转，这个小圆叫本轮；本轮的中心，再沿着一个大圆转，这个大圆叫均轮。调一调本轮有多大、转多快，让它盖住白色的观测记录。"] as Pair
} as const;

/** 看完托勒密，引到圆上圆画画和傅里叶。 */
export const skyTalk: Talk = {
  emoji: "🔭",
  title: "从两个圆到很多个圆",
  turns: [
    {
      nian: "火星、木星、土星的本轮，为什么都正好一年转一圈？",
      dad: "问得好！一千四百年后，哥白尼想明白了：本轮其实就是我们的地球在绕着太阳转，一年正好一圈。站在会动的地球上看，别的行星就像在打圈圈。"
    },
    {
      nian: "那要是不止两个圆，再多套几个呢？",
      dad: "那就什么都能画了！圆上套圆，套得越多，画得越像，星星、爱心都行。怎么算出每个圆该多大、转多快，就是傅里叶变换。"
    }
  ],
  wrap: "原来托勒密的大圆套小圆，就是圆上圆画画的老祖宗！"
};
