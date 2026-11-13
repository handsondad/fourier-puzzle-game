import type { Shape, Wave } from "../lib/fourier.ts";

/** 玩家手里的一个波：n 是几号波；free 表示几号要自己挑，n 只是开局时的号。 */
export type Channel = { n: number; free?: boolean };

export type WaveTarget = { parts: readonly Wave[] } | { shape: Shape };

export type WaveLevel = {
  id: number;
  chapter: number;
  emoji: string;
  title: string;
  /** 开局时爸爸讲这一关要干什么。 */
  story: string;
  /** 点"提示"时爸爸说的话。 */
  hint: string;
  /** 拼上之后爸爸讲的道理。 */
  win: string;
  target: WaveTarget;
  channels: readonly Channel[];
  /** 已经混在里面、动不了的波（降噪那一关的噪音）。 */
  noise?: readonly Wave[];
  /** 这一关能不能左右挪（调相位）。 */
  phase?: boolean;
};

export type Chapter = { id: number; emoji: string; title: string; hook: string };

export const chapters: readonly Chapter[] = [
  { id: 1, emoji: "🌊", title: "一个波", hook: "先认识正弦波：多高、多快、正着还是倒着。" },
  { id: 2, emoji: "➕", title: "波加波", hook: "两三个波叠在一起，每个地方的高度相加。" },
  { id: 3, emoji: "↔️", title: "挪一挪", hook: "把波往旁边挪：正弦变余弦，还能把噪音抵消掉。" },
  { id: 4, emoji: "🎼", title: "拼出名波", hook: "只用弯弯的正弦波，拼出方波、锯齿波和三角波。" },
  { id: 5, emoji: "🎺", title: "声音与大海", hook: "乐器的音色、琴弦的拍频、大海的潮汐和双重降噪，全靠正弦波。" }
];

const sin = (n: number, amp: number, phase = 0): Wave => ({ n, amp, phase });

export const waveLevels: readonly WaveLevel[] = [
  {
    id: 1, chapter: 1, emoji: "📏", title: "调高矮",
    story: "灰色的粗线是目标。拖动滑块，把你的波调得和它一样高。",
    hint: "目标的波峰顶到了 1，把振幅也调到 1。",
    win: "振幅就是波有多高。波越高，声音就越响。",
    target: { parts: [sin(1, 1)] }, channels: [{ n: 1 }]
  },
  {
    id: 2, chapter: 1, emoji: "🤏", title: "矮一半",
    story: "这次的目标矮了一些。你的波要调到多高呢？",
    hint: "目标只有上一关的一半高，振幅调到 0.5 试试。",
    win: "振幅减一半，波就矮一半，听起来也小声一些。",
    target: { parts: [sin(1, 0.5)] }, channels: [{ n: 1 }]
  },
  {
    id: 3, chapter: 1, emoji: "🙃", title: "翻个跟头",
    story: "咦，这条波一出发就往下走。怎么让你的波也倒过来？",
    hint: "把振幅往左拖，调成负的 0.8，波就上下翻过来了。",
    win: "振幅是负数，波就上下翻个跟头：原来的山峰变成山谷。",
    target: { parts: [sin(1, -0.8)] }, channels: [{ n: 1 }]
  },
  {
    id: 4, chapter: 1, emoji: "🐇", title: "数波峰",
    story: "这条波跑得特别快。除了调高矮，还要挑一挑用几号波。",
    hint: "在两条竖线之间数一数，目标有三个波峰，所以要选 3 号波，振幅 0.7。",
    win: "几号波，就是在同样的时间里起伏几次。号越大，波越快，声音越尖。",
    target: { parts: [sin(3, 0.7)] }, channels: [{ n: 1, free: true }]
  },
  {
    id: 5, chapter: 2, emoji: "🤸", title: "叠罗汉",
    story: "目标是两个波加起来的。你也有两个波：1 号和 2 号。",
    hint: "1 号波管大起伏，调到 1；2 号波管小抖动，调到 0.5。",
    win: "两个波加在一起，就是每个地方的高度相加。这叫叠加。",
    target: { parts: [sin(1, 1), sin(2, 0.5)] }, channels: [{ n: 1 }, { n: 2 }]
  },
  {
    id: 6, chapter: 2, emoji: "🧱", title: "压平波峰",
    story: "这次是 1 号和 3 号波。拼好以后看看，波峰是不是变平了？",
    hint: "1 号调到 1，3 号调到 0.3。",
    win: "1 号波加上一点 3 号波，波峰就被压平，有点像方块了。后面我们要拼出真正的方波。",
    target: { parts: [sin(1, 1), sin(3, 0.3)] }, channels: [{ n: 1 }, { n: 3 }]
  },
  {
    id: 7, chapter: 2, emoji: "🔍", title: "自己挑波",
    story: "这条波看着乱糟糟的。它是哪两个波拼出来的？号码要你自己挑。",
    hint: "大起伏一段里有两个，选 2 号，振幅 0.6；小抖动有五个，选 5 号，振幅 0.4。",
    win: "看着乱糟糟的波，拆开来只是两个简单的波。把复杂的东西拆成简单的波，就是傅里叶的本事。",
    target: { parts: [sin(2, 0.6), sin(5, 0.4)] }, channels: [{ n: 1, free: true }, { n: 1, free: true }]
  },
  {
    id: 8, chapter: 2, emoji: "👨‍👩‍👦", title: "三兄弟",
    story: "三个波一起上！1 号、2 号、4 号，一个一个来。",
    hint: "从大的开始调：1 号是 0.8；2 号是倒着的，负 0.4；4 号最小，0.2。",
    win: "不管多少个波，从大到小一个一个调，总能拼出来。",
    target: { parts: [sin(1, 0.8), sin(2, -0.4), sin(4, 0.2)] }, channels: [{ n: 1 }, { n: 2 }, { n: 4 }]
  },
  {
    id: 9, chapter: 3, emoji: "⛰️", title: "余弦波",
    story: "这条波一开始就站在山顶上。现在你多了一个相位滑块，可以把波往旁边挪。",
    hint: "振幅调到 1，再把相位转到 90 度，波就往左挪了四分之一。",
    win: "从山顶出发的波叫余弦波。它和正弦波是一家人，只差 90 度。",
    target: { parts: [sin(1, 1, 90)] }, channels: [{ n: 1 }], phase: true
  },
  {
    id: 10, chapter: 3, emoji: "🎯", title: "对准山峰",
    story: "目标是一个 2 号波，但它的山峰不在老地方。先调高矮，再挪一挪。",
    hint: "振幅调到 0.8，相位转到 45 度。",
    win: "相位决定波从哪里出发。高矮、快慢、出发点，三样都对上，两条波就重合了。",
    target: { parts: [sin(2, 0.8, 45)] }, channels: [{ n: 2 }], phase: true
  },
  {
    id: 11, chapter: 3, emoji: "🫗", title: "歪向一边",
    story: "这条波好像往一边歪着。它是一个正弦波加一个余弦波。",
    hint: "1 号波就是普通的正弦波，振幅 1，相位 0；2 号波是余弦波，振幅 0.5，相位 90 度。",
    win: "正弦和余弦搭配起来，就能拼出歪向一边、左右不对称的形状。",
    target: { parts: [sin(1, 1), sin(2, 0.5, 90)] }, channels: [{ n: 1 }, { n: 2 }], phase: true
  },
  {
    id: 12, chapter: 3, emoji: "🎧", title: "降噪耳机",
    story: "耳机里混进了嗡嗡的噪音，就是那条红线。加一个一样高、正好反过来的波，把它抵消成一条平线！",
    hint: "振幅也调到 0.8，相位比噪音多转半圈：噪音是 60 度，你转到 240 度。",
    win: "两个一样的波差半圈，山峰对山谷，就互相抵消了。降噪耳机就是这么让噪音消失的。",
    target: { parts: [] }, noise: [sin(3, 0.8, 60)], channels: [{ n: 3 }], phase: true
  },
  {
    id: 13, chapter: 4, emoji: "🟦", title: "方波",
    story: "方波就像开关，一会儿开，一会儿关，方方正正的。我们只有三个弯弯的波，能拼出它吗？",
    hint: "方波只要奇数号的波。1 号调到 1，3 号调到三分之一，也就是 0.35 左右，5 号调到五分之一，0.2。",
    win: "方波的配方是 1、三分之一、五分之一，只用奇数号。波用得越多，就越方。",
    target: { shape: "square" }, channels: [{ n: 1 }, { n: 3 }, { n: 5 }]
  },
  {
    id: 14, chapter: 4, emoji: "🪚", title: "锯齿波",
    story: "锯齿波慢慢爬上去，再一下子掉下来，就像锯子的齿。这次给你四个波。",
    hint: "振幅是 1、二分之一、三分之一、四分之一，但 2 号和 4 号要倒过来，调成负的。",
    win: "锯齿波每个号的波都要，一正一负轮流来，越往后越小。",
    target: { shape: "saw" }, channels: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }]
  },
  {
    id: 15, chapter: 4, emoji: "🔺", title: "三角波",
    story: "三角波是一个个尖尖的小山。它也只用奇数号的波，可是配方不一样。",
    hint: "1 号调到 1；3 号要倒过来，很小，负 0.1；5 号更小，0.05。",
    win: "三角波没有突然的跳变，只有拐角，所以后面的波小得很快，三个就已经很像了。",
    target: { shape: "triangle" }, channels: [{ n: 1 }, { n: 3 }, { n: 5 }]
  },
  {
    id: 16, chapter: 4, emoji: "🏆", title: "方波大师",
    story: "第四章最后一关：四个波，号码全要你自己挑，拼出一个更方的方波。",
    hint: "选 1、3、5、7 号，振幅分别是 1、三分之一、五分之一、七分之一，大约 1、0.35、0.2、0.15。",
    win: "你自己找出了方波的配方！不过拐角旁边总有个小尖角，加多少波都去不掉，这叫吉布斯现象。",
    target: { shape: "square" }, channels: [{ n: 1, free: true }, { n: 1, free: true }, { n: 1, free: true }, { n: 1, free: true }]
  },
  {
    id: 17, chapter: 5, emoji: "🎷", title: "单簧管之歌",
    story: "单簧管是一头堵住的管子，吹低音时几乎只有奇数号的泛音。挑出后面两个号，拼出它的声音。",
    hint: "既然只有奇数号，就选 1、3、5 号波，振幅分别调到 0.9、0.6 和 0.35。",
    win: "拼好后点听目标和听我的听听看！同样唱一个音，泛音的高矮不同，乐器的音色就不一样。",
    target: { parts: [sin(1, 0.9), sin(3, 0.6), sin(5, 0.35)] },
    channels: [{ n: 1 }, { n: 1, free: true }, { n: 1, free: true }]
  },
  {
    id: 18, chapter: 5, emoji: "🔔", title: "调音师的耳朵",
    story: "两个快慢差一点点的波叠在一起，会画出忽胖忽瘦的枣核。找出是哪两个紧挨着的波。",
    hint: "数一数最密的地方，选紧挨着的 5 号波和 6 号波，振幅都调到 0.7。",
    win: "两个相近的波一会儿同向相加变响，一会儿反向抵消变轻，这叫拍频。调琴师就是听它把钢琴调准的。",
    target: { parts: [sin(5, 0.7), sin(6, 0.7)] },
    channels: [{ n: 1, free: true }, { n: 2, free: true }]
  },
  {
    id: 19, chapter: 5, emoji: "🌊", title: "潮汐预言机",
    story: "海水的涨潮退潮，主要是月亮引力的波加上太阳引力的波。调好高矮和出发点，算出今天的潮水。",
    hint: "2 号波振幅调到 0.9，相位 30 度；3 号波振幅调到 0.5，相位转到 120 度。",
    win: "一百五十年前，开尔文勋爵用齿轮和滑轮把十几个潮汐波加起来，摇四个小时手柄就能算出港口一整年的潮水。",
    target: { parts: [sin(2, 0.9, 30), sin(3, 0.5, 120)] },
    channels: [{ n: 2 }, { n: 3 }], phase: true
  },
  {
    id: 20, chapter: 5, emoji: "🛡️", title: "双重降噪大师",
    story: "终极挑战：机舱里同时混进了低沉的轰鸣和尖锐的哨音。连几号波都要你自己认出来，把噪音彻底清零！",
    hint: "噪音里藏着 1 号波和 4 号波。1 号振幅 0.8、相位 225 度；4 号振幅 0.6、相位 315 度，刚好和噪音反着。",
    win: "太厉害了！不管混进多少种周期噪音，傅里叶变换都能把它们一个个揪出来，再用反相波消得干干净净。",
    target: { parts: [] }, noise: [sin(1, 0.8, 45), sin(4, 0.6, 135)],
    channels: [{ n: 1, free: true }, { n: 2, free: true }], phase: true
  }
];
