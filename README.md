# Through Their Eyes

### ▶ [**打开网站 · fatduckzzz.github.io/through-their-eyes**](https://fatduckzzz.github.io/through-their-eyes/)

关于色觉障碍（CVD）的沉浸式数据叙事网站。访问者被分配一种色觉类型，以第一人称走过一天：穿衣、早餐、过马路、填报销单、看会议图表、挑礼物、乘地铁，最后揭晓。之后是证据链、真实心声、包容性设计实验室与真实案例。

这是一项 RCT 的**实验组**材料。对照组是信息内容匹配的说明文：

- 对照组网站 → [fatduckzzz.github.io/through-their-eyes-control](https://fatduckzzz.github.io/through-their-eyes-control/)
- 独立配色工具 → [github.com/fatduckzzz/through-their-eyes-palette](https://github.com/fatduckzzz/through-their-eyes-palette)

## 常用链接

| 用途 | 链接 |
| --- | --- |
| 公开版（访问者自选色觉类型） | [`/through-their-eyes/`](https://fatduckzzz.github.io/through-their-eyes/) |
| **实验投放版** | [`?study=1&pid=测试`](https://fatduckzzz.github.io/through-their-eyes/?study=1&pid=TEST) |
| 英文 | 页面右上角切换 |

**`?study=1` 与公开版的区别**：色觉类型改为**均匀随机**分配，而不是公开版的患病率加权（绿色盲 55% / 全色盲 5%）。加权对科普是对的，对实验不对——按每组 70 人算，全色盲只会分到不到 4 人，任何按类型分层的分析都做不了。

`?pid=` 用于把问卷的答卷编号带进来，完成码据此与问卷行对应。

## 技术形态

纯静态：HTML + CSS + 原生 JavaScript（ES5），无框架、无构建步骤、无依赖。

```
index.html     单页结构、内联 SVG 滤镜、全部分屏
app.js         状态与导航、场景交互、氛围效果
i18n.js        中英文案
tracker.js     曝光计时 / 分节覆盖 / 完成码（与对照站逐字节相同）
style.css      样式
assets/fonts/  自托管拉丁字体
tools/         完成码解码脚本
AGENTS.md      给 AI 编码助手看的项目说明
```

本地预览：

```bash
python -m http.server 8000
```

字体自托管、中文走系统栈：Google Fonts 在中国大陆不可达，外链会阻塞首屏渲染直到超时。

## 曝光测量

`tracker.js` 记录有效阅读时长（页面不可见或长时间无操作时暂停）、分节覆盖、被分配的色觉类型，并在达到 `MIN_ACTIVE_SECONDS` 后生成完成码。

**这份文件与对照站的那份逐字节相同**，两组必须用同一套计时口径，否则曝光数据不可比。改这边就要同步改那边。

完成码不是哈希，而是**编码后的数据**——本站没有后端，被试把码填回问卷，数据才回得来：

```
TTE-N-3A6AGN  →  { minutes: 13, sectionsSeen: 8, cvdType: 'deutan',
                    ctoolOpened: false, valid: true }
```

解码整份答卷导出：

```bash
python tools/decode_codes.py 答卷.csv --column 完成码
```

完成码是纯前端生成的，**可以伪造**。它是依从性信号，请与问卷里的注意力检查题合并判断，不要单独作为剔除依据。

## 与对照组的信息匹配

> **⚠️ 目前有一处不匹配。** 配色工具移出本站之后，对照站第十一节「选择配色的基本原则」（约 317 字）在本站没有对应内容。两条路：对照站也删掉那一节，或本站补一小段静态文字讲同样的原则并链到独立工具。后者能保住匹配，也给工具一个入口。
