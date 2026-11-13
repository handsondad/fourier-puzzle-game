import type { Disc } from "../lib/fourier.ts";

/** 玩家手里的一个圆盘：k 是几号盘；free 表示号码要自己挑，k 只是开局时的号。 */
export type DiscSlot = { k: number; free?: boolean };

export type DiscLevel = {
  id: number;
  emoji: string;
  title: string;
  story: string;
  hint: string;
  win: string;
  target: readonly Disc[];
  slots: readonly DiscSlot[];
  /** 这一关能不能转起始角度。 */
  angle?: boolean;
};

const disc = (k: number, r: number, angle = 0): Disc => ({ k, r, angle });

export const discLevels: readonly DiscLevel[] = [
  {
    id: 1, emoji: "⭕", title: "画个圆",
    story: "1 号圆盘转一圈，笔尖就画一圈。把孔打在合适的地方，画出和灰色一样大的圆。",
    hint: "灰色的圆半径是 2，把 1 号盘的半径调到 2。",
    win: "一个匀速转的圆盘，笔尖画出一个圆。笔尖的高低一上一下，正好就是一条正弦波。",
    target: [disc(1, 2)], slots: [{ k: 1 }]
  },
  {
    id: 2, emoji: "🥚", title: "压扁的圆",
    story: "再加一个负 1 号盘，它反着转。两个盘一正一反，圆会变成什么样？",
    hint: "1 号盘半径 2，负 1 号盘半径 1。",
    win: "两个圆盘一正一反地转，圆就被压扁成椭圆。行星绕太阳走的就是椭圆。",
    target: [disc(1, 2), disc(-1, 1)], slots: [{ k: 1 }, { k: -1 }]
  },
  {
    id: 3, emoji: "🔱", title: "三尖瓣线",
    story: "1 号盘套上负 2 号盘，负 2 号反着转两圈。调好两个半径，画出三个尖角的星星。",
    hint: "1 号盘半径 2，负 2 号盘半径 1。",
    win: "这条曲线叫三尖瓣线。小盘反着转两圈，大盘正着转一圈，正好拐出三个尖。",
    target: [disc(1, 2), disc(-2, 1)], slots: [{ k: 1 }, { k: -2 }]
  },
  {
    id: 4, emoji: "✴️", title: "四角星",
    story: "这次要四个尖角。第二个圆盘的号码要你自己挑。",
    hint: "选负 3 号盘，半径 0.8；1 号盘半径 2.4。",
    win: "反着转的盘决定有几个尖：负 2 号三个尖，负 3 号四个尖。小盘的半径正好是大盘的三分之一，尖角才尖。",
    target: [disc(1, 2.4), disc(-3, 0.8)], slots: [{ k: 1 }, { k: 2, free: true }]
  },
  {
    id: 5, emoji: "❤️", title: "心形线",
    story: "两个圆盘都正着转，画一颗心。这次还能转一转孔的起始角度。",
    hint: "1 号盘半径 2，角度 0；2 号盘半径 1，角度转到 180 度。",
    win: "两个圆盘同方向转，就画出一颗心，它叫心形线。起始角度不同，画出来的形状也不一样。",
    target: [disc(1, 2), disc(2, 1, 180)], slots: [{ k: 1 }, { k: 2 }], angle: true
  },
  {
    id: 6, emoji: "⭐", title: "五角星",
    story: "五个尖角的星星！想想刚才的规律，第二个盘该用几号？",
    hint: "五个尖要用负 4 号盘。它转得是 1 号的 4 倍快，半径就是四分之一：1 号盘 2，负 4 号盘 0.5。",
    win: "你找到规律了：负几号盘，就多一个尖。负 4 号，五个尖。",
    target: [disc(1, 2), disc(-4, 0.5)], slots: [{ k: 1 }, { k: -1, free: true }]
  },
  {
    id: 7, emoji: "🌸", title: "三叶玫瑰",
    story: "两个一样大的圆盘，可以画出一朵花。两个号码都要你自己挑。",
    hint: "选 4 号盘和负 2 号盘，半径都是 1.2。",
    win: "两个盘一样大，笔尖每转一会儿就回到中心，画出一片片花瓣。这叫玫瑰线。",
    target: [disc(4, 1.2), disc(-2, 1.2)], slots: [{ k: 1, free: true }, { k: -1, free: true }]
  },
  {
    id: 8, emoji: "❄️", title: "雪花",
    story: "三个圆盘一起转，画一片六个角的雪花。从大到小一个一个调。",
    hint: "1 号盘半径 2，负 5 号盘半径 0.6，7 号盘最小，半径 0.3。",
    win: "盘越多，能画的花样就越多。后面四关还有幸运草和小金鱼等着你。",
    target: [disc(1, 2), disc(-5, 0.6), disc(7, 0.3)], slots: [{ k: 1 }, { k: -5 }, { k: 7 }]
  },
  {
    id: 9, emoji: "🍀", title: "四叶幸运草",
    story: "还记得三叶玫瑰吗？两个一样大的圆盘，换一对号码，就能画出四片叶子的幸运草。",
    hint: "选 3 号盘和负 1 号盘，两个半径都调到 1.3。",
    win: "3 号和负 1 号相差 4，两个圆盘一样大，笔尖四次经过中心，正好画出四片叶子。",
    target: [disc(3, 1.3), disc(-1, 1.3)], slots: [{ k: 1, free: true }, { k: -1, free: true }]
  },
  {
    id: 10, emoji: "🐌", title: "蜗牛打圈",
    story: "画心形线的时候，小盘只有大盘一半大。要是把 2 号盘调得和 1 号盘一样大，会发生什么？",
    hint: "把 1 号盘和 2 号盘的半径都调到 1.5。",
    win: "小盘追上大盘，在肚子里面多绕出一个小圈圈！数学家管它叫帕斯卡蜗线。",
    target: [disc(1, 1.5), disc(2, 1.5)], slots: [{ k: 1 }, { k: 2 }]
  },
  {
    id: 11, emoji: "🐟", title: "小金鱼",
    story: "三个圆盘配合起来，连交叉的鱼尾巴都能一笔画出来！注意有一个盘的起始角度不一样。",
    hint: "1 号盘半径 1.8、角度 0；负 1 号盘半径 0.9、角度转到 180 度；负 2 号盘半径 0.8、角度 0。",
    win: "一正一反先把身体压成椭圆，再加上负 2 号盘一扭，小金鱼的尾巴就甩起来啦！",
    target: [disc(1, 1.8), disc(-1, 0.9, 180), disc(-2, 0.8)],
    slots: [{ k: 1 }, { k: -1 }, { k: -2 }], angle: true
  },
  {
    id: 12, emoji: "⚙️", title: "太空齿轮",
    story: "最后一关：大圆盘带着两个飞快转动的小圆盘，画出一个整整齐齐的六齿齿轮。",
    hint: "1 号盘半径 2.1、角度 0；另外两个选 7 号盘（半径 0.5、角度 0）和负 5 号盘（半径 0.5、角度 180 度）。",
    win: "恭喜通关！从圆、星星、花朵到小鱼和齿轮，圆上套圆真的什么形状都能画出来。",
    target: [disc(1, 2.1), disc(7, 0.5), disc(-5, 0.5, 180)],
    slots: [{ k: 1 }, { k: 2, free: true }, { k: -2, free: true }], angle: true
  }
];
