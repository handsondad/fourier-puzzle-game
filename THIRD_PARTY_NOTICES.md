# 第三方素材和代码

## 配音（Microsoft Edge 在线语音）

`public/voice/` 里的小念和爸爸的配音由 [edge-tts](https://github.com/rany2/edge-tts)（GPL-3.0，只在生成时使用，不随网站发布）调用微软 Edge"大声朗读"的在线神经语音生成，和 bodyverse、family-tree-player 用的是同样的声音：小念 `zh-CN-YunxiaNeural`，爸爸 `zh-CN-YunxiNeural`（语速 -5%）。这项服务没有为批量生成音频单独给出授权条款，所以这些音频只按家庭和非商业用途考虑；公开发布或商用前，应改用有明确商用授权的语音服务（如 Azure AI Speech）重新生成。

## 小念和爸爸的形象

头像画法照着 bodyverse 项目里的小念和爸爸。

## 内容参考

- 圆上套圆、"跟着转、找重心"、方波 1/n 的讲法参考了漫士沉思录的傅里叶变换科普视频（https://www.youtube.com/watch?v=gbe_NHwkRCI）。
- "大象"预设的四个复数傅里叶参数来自 Jürgen Mayer, Khaled Khairy & Jonathon Howard (2010), *Drawing an elephant with four complex parameters*, American Journal of Physics 78(6), 648–649；"蝴蝶"预设参考 Temple H. Fay (1989), *The Butterfly Curve*, American Mathematical Monthly 96(5), 442–443。
- 乐器泛音音色、欧姆声学定律与耳蜗基底膜频率分析、开尔文潮汐预言机、迈克尔逊 80 弹簧谐波分析仪与吉布斯现象历史、二维离散余弦变换（JPEG 图像压缩原理）等科普素材整理自公开声学与科学史文献及交互教程（PhET *Fourier: Making Waves*、Jez Swanson *An Interactive Introduction to Fourier Transforms* 等）。游戏里的文字、像素画和关卡均为原创编写。
