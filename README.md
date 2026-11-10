# 拼波大冒险

给孩子玩的傅里叶小游戏：小念和爸爸带着用一个个正弦波、一个个转圈的圆盘，拼出方波、三角星、爱心和雪花。界面、小念和爸爸的形象与声音都照着 family-tree-player（认亲戚大冒险）。

在线访问：<https://handsondad.github.io/fourier-puzzle-game/>

讲法跟着漫士沉思录的科普视频走（[去看视频](https://www.youtube.com/watch?v=gbe_NHwkRCI)）：几号圆盘一圈时间里转几圈、圆上套圆画曲线、"跟着转、找重心"读出每个圆盘。

- **看一看**
  - 托勒密的天空（引子）：站在地球上看火星、木星、土星打圈圈倒着走；再学托勒密，用均轮带着本轮去盖住观测记录，跟《至大论》里的本轮半径（39½、11½、6½ 份，均轮 60 份）比一比；最后从哥白尼讲到"多套几个圆就是傅里叶"。
  - 拼波工作台：六个波随便调，一键拿到方波、锯齿波、三角波的配方，能听声音；还能看加到 40 个波时拐角的小尖角（吉布斯现象）。
  - 圆上圆画板：几个预设图案，或者自己画一圈，算出傅里叶系数，拖滑块看要多少个圆盘才画得像。
  - 缠绕找重心：把曲线反着缠几圈，看重心跑到哪，一个个找出曲线里藏的圆盘，再用它们画回原来的曲线。
- **玩一玩**
  - 拼波闯关：4 章 16 关，调振幅、挑几号波、调相位，盖住灰色的目标波；最后几关拼名波。
  - 圆盘画图：8 关，挑圆盘号码、调半径和起始角度，画出椭圆、三尖瓣线、心形线、玫瑰线、雪花。
  - 调台收音机：三个电台混在一起，转旋钮看缠绕后的重心和信号强度，把电台一个个找出来。
  - 波形配方：看波猜配方、看配方猜波，8 道题。

## 开发

```bash
npm install
npm run dev        # 本地预览
npm test           # 数学、每一关能不能过、出题、配音覆盖
npm run typecheck
npm run build
npm run voice      # 改了台词后重新配音
```

`npm run voice` 需要联网，还要先装好 `python -m pip install edge-tts`，PATH 里要有 ffmpeg / ffprobe。它只生成新的或改过的句子，可以随时中断再续。

推送到 `main` 后，`.github/workflows/deploy.yml` 会跑测试、构建，并发布到 GitHub Pages。仓库 Settings → Pages 的 Source 要选 **GitHub Actions**。

## 说明

- 全部数学在 `src/lib/fourier.ts`：正弦波相加、名波配方、圆盘链、缠绕找重心（离散傅里叶变换）、按形状比对。
- 关卡在 `src/data/waveLevels.ts`、`src/data/discLevels.ts`，答案由程序从目标里量出来，`npm test` 会检查每一关都拼得上、开局拼不上、差一格也过不了。
- 小念和爸爸的配音用微软 Edge 在线语音（edge-tts）生成，只按家庭和非商业使用考虑。

完整清单见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
