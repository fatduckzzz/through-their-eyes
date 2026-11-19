/* ============================================================
   analyse.js — 找出一张图里"色觉障碍者分不开"的地方

   现有的 CVD 工具几乎都停在"并排模拟"：把原图和模拟图放在一起，
   剩下的靠设计师自己看。Geddes 等 (2025) 对 113 篇文献的范围综述
   把这件事说得很直接——绝大多数工具只做诊断，很少帮设计师找到
   解法；他们列出的第一条研究机会就是"开发能主动协助设计师选择
   可及颜色的工具，而不只是判断某组配色是否不可及"。

   这个模块试着往前走一步：不只是把图变色给你看，而是指出
   **哪两块颜色**在**哪种色觉**下会塌到一起、**它们在图的哪个位置
   贴在一起**，以及可以怎么改。

   判据
   ------------------------------------------------------------
   前提：原图里这两个颜色本来就靠色相区分（色度差 > ORIGINAL_CHROMA_MIN），
   且两者都在做分类编码（有明确彩度，底色文字灰阶不算）。

   在此之上，模拟后满足下面任一条即算一处问题：
     A. 色相塌了      色度差 < SIM_CHROMA_MAX
     B. 整体太近了    总 ΔE < SIM_DE_MAX，且比原来损失了 MIN_DE_LOSS 以上

   两条都要。只看 A 会漏：#D72D2D 与 #3CA03C 在绿色盲下变成 #878716 和
   #898942，色相完全一样、只是一个更灰，色度差 17 反而过不了 A 的阈值，
   最经典的红绿撞色就漏了。只看 B 也会漏：色觉障碍塌掉的是 a*b* 平面，
   明度基本不受影响，总 ΔE 会低估损失。

   两条都给明度留出路（simLight < SIM_LIGHT_SAFE）。明度是三种色觉障碍
   都保得住的线索，够大的明度差本身就是一条完整的编码——不留这条出路，
   每个"深色对浅色"的组合都会被报成问题。

   注意这里**没有**"两块颜色必须在图上接壤"这一条。曾经有过，是错的：
   柱状图的各系列本来就分行分列摆着、彼此不挨边，读者靠图例把它们联系
   起来——恰恰是最常见的排布，却被那条规则整个跳过。接壤与否降级成了
   元数据，只用来决定标记画在哪。

   验证
   ------------------------------------------------------------
   拿已知安全和已知有问题的配色做过回归：红/绿、红/棕、绿/棕、蓝/紫、
   粉/浅绿全部报出；灰阶、蓝色单色阶、蓝/橙、红/黑全部零告警；Tableau 10
   报出 13 处（Tableau 自己另出一套 Color Blind 配色，正是因为默认这套
   不安全）；Okabe-Ito 的红绿轴干净，只在蓝黄色盲下有塌陷——与该配色
   "只保证 protan/deutan"的设计声明一致。

   一对颜色只出一条结果，受影响的色觉类型合并进去。红绿两类色觉
   障碍高度重叠，分开报同一对颜色只会制造噪音。

   全部在浏览器本地完成，图片不会离开这台设备。
   ============================================================ */

var CVDAnalyse = (function () {
  'use strict';

  /* 判据用的是**色度**塌陷，不是总色差 ΔE。

     这一点很容易搞错。色觉障碍塌掉的是色度轴（a*b* 平面），明度
     基本不受影响。举个实测的例子：#D72D2D 与 #3CA03C 在绿色盲下
     分别变成 #878716 和 #898942——色相已经完全一样，只剩明度差；
     可总 ΔE 仍有 17.2，用总 ΔE 卡阈值就会漏报。

     所以分两级：
       严重  色度塌了，明度也没拉开     → 基本无法分辨
       中等  色度塌了，但还剩明度差     → 大色块尚可，小图标、
                                          不同屏幕亮度下仍会认错
     两级都报，但在文案里说清楚区别，让设计师自己判断要不要改。 */
  var CONFIG = {
    MAX_COLOURS: 24,       // 最多提取多少个主色
    COUNT_SLOTS: 14,       // 其中按"占比大"分配的名额，剩下的留给高彩度小元素
    BIN_BITS: 3,           // 直方图每通道右移位数（3 → 32 级，共 32768 格）
    MIN_BIN_SHARE: 0.0004, // 一格少于总像素的 0.04% 视为噪点
    MIN_SEP: 12,           // 两个主色之间至少要差这么多 ΔE，否则算同一个
    ASSIGN_MAX: 20,        // 像素离最近主色超过这个 ΔE 就不贴标签（多半是抗锯齿混色）
    /* 判断"是不是同一个设计色的不同透明度"：候选色到那束射线的**垂直
       距离**（0–255 的 RGB 单位）小于这个数就算是。

       别用固定角度。青 #03C8CE 与蓝 #11BDF7 的夹角是 8.5 度，和"同一个
       颜色的抗锯齿边缘"的角度误差在同一量级，卡角度必然会把这两个真正
       不同的设计色并掉——你一眼就能看出图里蓝和青是两根不同的柱子。

       垂直距离自动做对了这个权衡：低透明度的变体离底色近，同样的角度
       只对应很小的实际色差，该并；两个饱和的设计色离底色远，8.5 度就是
       38 个 RGB 单位的实际差别，不该并。 */
    RAY_PERP_MAX: 12,
    HUE_MERGE_DEG: 8,         // 色相角差小于这个度数，算同一个设计色的深浅
    HUE_MERGE_MIN_CHROMA: 18, // 彩度低于此不参与色相归并（色相角是噪声）
    ORIGINAL_CHROMA_MIN: 25, // 原图里这两色的色度差要够大，才说明设计本来指望靠颜色区分
    SIM_CHROMA_MAX: 13,    // 模拟后色度差小于这个值 → 色相塌陷
    /* 模拟后总色差小于这个值 → 不论色相有没有"塌"，两块颜色就是太近了。

       只测色度塌陷会漏掉一整类。教科书那对 #D72D2D / #3CA03C 在绿色盲
       下变成 #878716 和 #898942：明度差 1.1，色相完全一样，只剩一个比
       另一个灰一点——色度差 17.1，超过上面那条 13 的线，于是被判成
       "色相没塌"，最经典的红绿撞色就这么漏掉了绿色盲这一项。

       色度塌陷说的是"损失的是什么"，总 ΔE 说的是"剩下的够不够用"。
       两条都要。文件开头说过总 ΔE 会低估损失——那是对的，但那句话讲的
       是**前后对比**；判断**模拟之后还分不分得开**，总 ΔE 正是该用的量。 */
    SIM_DE_MAX: 22,
    HIGH_DE_MAX: 13,       // 模拟后总色差低于这个值 → 基本无法分辨
    MIN_DE_LOSS: 12,       // 前后总色差至少损失这么多，才算是色觉障碍造成的
    /* 模拟后明度差达到这个值就不报了——明度是三种色觉障碍都保得住的
       线索，够大的明度差本身就是一条完整的编码。

       色相塌陷本身不等于有问题：白底和青色柱在绿色盲下色相差会从 35
       掉到 2，但两者的明度差有 47，谁都分得开。那一对**本来就不是靠
       色相区分的**，损失掉的东西没人在用。不设这条线，每一个"深色对
       浅色"的组合都会被报成问题，工具随即变成噪音。

       18 这个数是量出来的，不是拍的。拿一组已知安全和已知有问题的配色
       跑下来，两边在这条轴上分得很干净：

         Viridis 相邻档（公认色觉安全）  ΔL 17.2 / 18.6 / 18.6
         红/绿、蓝/紫、粉/浅绿、红/棕    ΔL  1.1 /  0.9 /  3.2 / 11.7

       原来这条线在 30，于是 Viridis 被报出三处——一个设计师用了公认
       安全的色阶还挨三条告警，就不会再信这个工具了。 */
    SIM_LIGHT_SAFE: 18,
    SIM_LIGHT_TARGET: 28,  // 建议改法要达到的模拟后明度差
    CATEGORICAL_MAX: 5,    // 超过这么多主色在做分类编码，颜色本身就超载了
    CONTACT_MIN: 60,       // 相邻像素对少于这个数视为"没挨着"
    /* 占比低于这个数的主色忽略。

       这条线得设得很低。一张 800×500 的图上，一个 9px 半径的图例圆点
       只占 0.064%；按老的 0.4%（甚至 0.12%）来卡，图例整排都会被当成
       噪点扔掉——而图例恰恰是"靠颜色区分类别"最集中的地方，是最该
       检查的部分。放心放低的前提是上面那道直方图门槛：一个颜色要成为
       候选，得在**单个直方图格子里**占到 0.04%，抗锯齿的混色摊得太开，
       过不了这一关。 */
    MIN_SHARE: 0.0004
  };

  /* ---------- 色彩计算：全部走 cvd.js ----------

     这里原来自带一套矩阵和一套 Lab 实现，配色表那边又各自带了
     一套，两套还不一样。现在统一到 cvd.js，模拟换成 Brettel 1997
     的完整双半平面版本，理由写在那个文件开头。 */

  var chromaDelta = CVD.chromaDelta;
  var lightDelta = CVD.lightDelta;
  var deltaE = CVD.deltaE;
  var rgb2lab = CVD.rgb2lab;
  var S2L = CVD.S2L;
  var simulate = CVD.simulate;

  /* ---------- 主色提取（直方图峰值） ----------

     这里原来跑的是 k-means，那是错的，而且错得很安静。

     k-means 找的是像素的**平均值**。可是图表不是照片：一根 1.5px 的
     折线、一个 8px 的图例点，真正是纯色的像素只有中间那一两行，外面
     一圈全是它和底色的抗锯齿混合；线本身再带点透明度的话，纯色像素
     就一个都没有。数量上混色远多于纯色，均值于是被拖到两者中间。
     实测：一张深蓝底、十种颜色的桑基图，k-means 提出来的是
     #706449、#82908B、#A18A56——十个设计色一个都没对上，最后报出
     零处冲突。工具看上去在正常工作，只是什么都查不出来。

     换个思路。图表是合成图像，设计色会以**同一个精确色值重复成千
     上万次**，在颜色直方图上是尖峰；抗锯齿的混色则沿着两个峰之间
     的连线摊开，每一格都很浅。所以不该求平均，该找峰：

       1. 5 位精度的直方图（32 级/通道），统计每格的像素数和均色；
       2. 低于总量 0.04% 的格子丢掉——那是抗锯齿的尾巴；
       3. 按数量从多到少贪心取，新色与已取的色必须差 MIN_SEP 以上
          （ΔE），避免十个名额被底色的渐变吃光；
       4. 留几个名额按**彩度**再取一轮。占比大不等于重要：占 70% 的
          底色和占 0.4% 的红色警示点，后者才是要查的。只按数量排，
          小而饱和的元素永远进不来。

     贴标签时也加一条：像素离最近的主色超过 ASSIGN_MAX 就不贴。混色
     像素不该算进任何一个颜色的面积，也不该让两块颜色显得"接壤"。 */

  function extract(data, w, h) {
    var SH = CONFIG.BIN_BITS, N = 256 >> SH, n3 = N * N * N;
    var cnt = new Int32Array(n3);
    var sr = new Float64Array(n3), sg = new Float64Array(n3), sb = new Float64Array(n3);
    var total = 0, i, k, j;

    for (i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;                 // 忽略透明像素
      var r = data[i], g = data[i + 1], b = data[i + 2];
      k = (((r >> SH) * N) + (g >> SH)) * N + (b >> SH);
      cnt[k]++; sr[k] += r; sg[k] += g; sb[k] += b;
      total++;
    }
    if (total < 64) return null;

    var floorN = Math.max(6, Math.round(total * CONFIG.MIN_BIN_SHARE));
    var bins = [];
    for (k = 0; k < n3; k++) {
      if (cnt[k] < floorN) continue;
      var rgb = [Math.round(sr[k] / cnt[k]), Math.round(sg[k] / cnt[k]), Math.round(sb[k] / cnt[k])];
      var lab = rgb2lab(rgb[0], rgb[1], rgb[2]);
      bins.push({ rgb: rgb, lab: lab, n: cnt[k],
                  chroma: Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]) });
    }
    if (!bins.length) return null;

    var chosen = [];
    function tryAdd(bn) {
      if (chosen.length >= CONFIG.MAX_COLOURS) return;
      for (var q = 0; q < chosen.length; q++) {
        if (deltaE(bn.lab, chosen[q].lab) < CONFIG.MIN_SEP) return;
      }
      chosen.push(bn);
    }

    var byCount = bins.slice().sort(function (p, q) { return q.n - p.n; });
    for (i = 0; i < byCount.length && chosen.length < CONFIG.COUNT_SLOTS; i++) tryAdd(byCount[i]);
    var byChroma = bins.slice().sort(function (p, q) { return q.chroma - p.chroma; });
    for (i = 0; i < byChroma.length && chosen.length < CONFIG.MAX_COLOURS; i++) tryAdd(byChroma[i]);
    for (i = 0; i < byCount.length && chosen.length < CONFIG.MAX_COLOURS; i++) tryAdd(byCount[i]);

    /* 把同一个设计色的透明度变体收回去。

       一根 55% 不透明度的线画在渐变底上，屏幕上呈现的是合成色，而且
       底色每处不同、线与线还会交叠，于是**一个**黄色会以 #8C8A44、
       #8D7231、#6C7243、#5B5535 好几种面目被提出来。逐个报的结果是
       同一对"黄配红"重复出现三四遍，而且建议改的 #8C8A44 在设计文件
       里根本不存在——它是黄色的 55%，没人能去改它。

       合成是线性的：C = α·D + (1-α)·B，所以 C - B = α(D - B)。同一个
       设计色的所有变体，从底色 B 出发的**方向完全一样**，只是长短随
       α 变。所以按方向归并，取每束射线上最远的那个当代表——那就是
       不透明处的真实设计色（图例色块、实心标记）。

       注意要在 sRGB 里算：canvas 的 alpha 混合就发生在这个空间，不是
       线性光空间。 */
    var bgIdx = 0;
    for (i = 1; i < chosen.length; i++) if (chosen[i].n > chosen[bgIdx].n) bgIdx = i;
    var bg = chosen[bgIdx].rgb;

    var groups = [];                       // 每束射线一组
    var groupOf = new Int32Array(chosen.length);
    var order = chosen.map(function (o, ix) { return ix; }).sort(function (p, q) {
      var vp = chosen[p].rgb, vq = chosen[q].rgb;
      function len2(v) { var a=v[0]-bg[0], b=v[1]-bg[1], c=v[2]-bg[2]; return a*a+b*b+c*c; }
      return len2(vq) - len2(vp);          // 先放最远的：它才配当代表
    });
    order.forEach(function (ix) {
      var v = [chosen[ix].rgb[0]-bg[0], chosen[ix].rgb[1]-bg[1], chosen[ix].rgb[2]-bg[2]];
      var len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
      if (len < 1) { groupOf[ix] = -1; return; }        // 就是底色本身
      var dir = [v[0]/len, v[1]/len, v[2]/len];
      for (var gi = 0; gi < groups.length; gi++) {
        var d = groups[gi].dir;
        var proj = v[0]*d[0] + v[1]*d[1] + v[2]*d[2];
        if (proj <= 0) continue;                       // 在底色另一侧，不是同一束
        var px_ = v[0] - proj*d[0], py_ = v[1] - proj*d[1], pz_ = v[2] - proj*d[2];
        if (Math.sqrt(px_*px_ + py_*py_ + pz_*pz_) <= CONFIG.RAY_PERP_MAX) {
          groupOf[ix] = gi; groups[gi].members.push(ix); return;
        }
      }
      groupOf[ix] = groups.length;
      groups.push({ dir: dir, head: ix, members: [ix] });
    });

    /* 底色自成一组，且必须留下——它参与"这块颜色和底色分不分得开"。 */
    var bgGroup = groups.length;
    groups.push({ dir: [0,0,0], head: bgIdx, members: [bgIdx] });
    for (i = 0; i < chosen.length; i++) if (groupOf[i] < 0) groupOf[i] = bgGroup;

    /* 第二轮：把同一个色相的深浅并掉。

       渐变填充的柱子、3D 侧面的暗部、hover 态、JPEG 压缩噪点——这些都让
       **一个**设计色以好几个明度出现。上面那轮按射线归并治不了它们：柱子
       的渐变是"浅蓝到深蓝"，不是"底色到蓝"，方向对不上。

       一般性的判据是：设计色不是一个像素值，是一个**承担某个类别的色相**。
       色相之内的变化是渲染，不是设计。而且——这一条才是可以放心并的理由
       ——色相之内的变化正好是色觉障碍**保得住**的那部分：塌掉的是彩度
       平面，明度不受影响。所以并掉同色相的深浅，不可能因此漏报一处问题。

       8 度是扫出来的，不是拍的。实测同一根柱子的深浅差 1.0 和 5.8 度；
       跨 Okabe-Ito、Viridis、Tableau 10 和四张真实图表，任意两个真正不同
       的设计色最小差 15.3 度（Okabe-Ito 的 #0072B2 与 #56B4E9）。在 6/8/10/12
       度上各跑一遍全套：8 度是唯一每张图、每套配色都 100% 认出设计色的档，
       且 Tableau 10 仍报 13 处。放到 12 度就开始并掉真正不同的颜色（粉橙
       #EA8373 与红 #E8384F 只差 10 度），Tableau 10 掉到 7 处——变成漏报。

       近中性的颜色不参与：a*b* 接近零时色相角是数值噪声，算出来的方向没有
       意义。它们本来也过不了后面"承担分类编码"那道彩度门槛。 */
    function hueOf(lab) {
      var a = Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
      return a < 0 ? a + 360 : a;
    }
    var hueGroups = [], hueOfGroup = new Int32Array(groups.length);
    var gOrder = groups.map(function (g, gi) { return gi; }).sort(function (p, q) {
      return chosen[groups[q].head].chroma - chosen[groups[p].head].chroma;
    });                                   // 彩度最高的当代表：渐变和明暗只会让颜色变灰变暗
    gOrder.forEach(function (gi) {
      var head = chosen[groups[gi].head];
      /* 底色永远自成一组。它要参与"这块颜色和底色分不分得开"，
         被并进某个柱子的色相里就没法比了。 */
      if (gi !== bgGroup && head.chroma >= CONFIG.HUE_MERGE_MIN_CHROMA) {
        var hq = hueOf(head.lab);
        for (var hi = 0; hi < hueGroups.length; hi++) {
          if (hueGroups[hi].hue === null) continue;
          var dh = Math.abs(hq - hueGroups[hi].hue);
          if (dh > 180) dh = 360 - dh;
          if (dh <= CONFIG.HUE_MERGE_DEG) {
            hueOfGroup[gi] = hi; hueGroups[hi].members.push(gi); return;
          }
        }
        hueOfGroup[gi] = hueGroups.length;
        hueGroups.push({ head: groups[gi].head, hue: hq, members: [gi] });
        return;
      }
      hueOfGroup[gi] = hueGroups.length;
      hueGroups.push({ head: groups[gi].head, hue: null, members: [gi] });
    });
    /* 每组最终报哪一个色值？两级用两条不同的规则，因为两级对应的
       物理成因不同。

       射线组内（透明度合成）取**离底色最远**的那个，也就是 α 最接近 1 的。
       半透明的线每一个像素都是部分混合，面积多数本身就是混合色：一条
       55% 的黄线，占面积最大的是 #8B8540，而设计色 #F2D64B 只出现在不透明
       的图例圆点上。这里设计色是极值，不是众数。

       色相组内（渐变、3D 明暗、投影）取**面积最大**的那个射线组。阴影和
       暗部是少数覆盖在上面，柱子的主体才是设计色。按彩度取会挑中渐变
       顶端那一小条最鲜艳的：实测紫柱 #B44FE0 因此被报成 #9D45C3。

       两条规则各自都验证过：把射线组也改成按面积，半透明那张的平均偏差
       从 ΔE 0.3 跳到 34.4；把色相组改成按彩度，带投影的柱子就报不准。 */
    hueGroups.forEach(function (hg) {
      var best = hg.members[0], bn = -1;
      hg.members.forEach(function (gi) {
        var n = 0;
        groups[gi].members.forEach(function (ci) { n += chosen[ci].n; });
        if (n > bn) { bn = n; best = gi; }
      });
      hg.head = groups[best].head;      // 该射线组自己的代表（离底色最远的）
    });

    var kn = hueGroups.length;
    var cent = hueGroups.map(function (g) { return chosen[g.head].rgb; });

    /* 每格算一次归属，像素只查表。既比逐像素比对快，也让"混色不贴
       标签"这条规则落在格子上，前后一致。 */
    var binLabel = new Int32Array(n3);
    for (k = 0; k < n3; k++) {
      if (!cnt[k]) { binLabel[k] = -1; continue; }
      var m = rgb2lab(Math.round(sr[k] / cnt[k]), Math.round(sg[k] / cnt[k]), Math.round(sb[k] / cnt[k]));
      var best = -1, bd = Infinity;
      for (j = 0; j < chosen.length; j++) {          // 先找最近的**变体**
        var d = deltaE(m, chosen[j].lab);
        if (d < bd) { bd = d; best = j; }
      }
      // 再经射线组、色相组两级映射回设计色。抗锯齿的边缘、渐变的暗部
      // 于是都算进柱子本身，而不是各自成为一个颜色。
      binLabel[k] = bd <= CONFIG.ASSIGN_MAX ? hueOfGroup[groupOf[best]] : -1;
    }

    /* 给全图每个像素贴标签，顺便记下每个主色的外接框——
       后面判断这块颜色是线、是面还是散点要用。 */
    var labels = new Int32Array(w * h);
    var share = new Int32Array(kn);
    var bounds = [];
    var sumX = new Float64Array(kn), sumY = new Float64Array(kn);
    for (j = 0; j < kn; j++) bounds.push({ x0: w, y0: h, x1: 0, y1: 0 });

    for (i = 0; i < w * h; i++) {
      var o = i * 4;
      if (data[o + 3] < 128) { labels[i] = -1; continue; }
      var bi = binLabel[(((data[o] >> SH) * N) + (data[o + 1] >> SH)) * N + (data[o + 2] >> SH)];
      labels[i] = bi;
      if (bi < 0) continue;
      share[bi]++;
      var lx = i % w, ly = (i / w) | 0, bb = bounds[bi];
      if (lx < bb.x0) bb.x0 = lx;
      if (ly < bb.y0) bb.y0 = ly;
      if (lx > bb.x1) bb.x1 = lx;
      if (ly > bb.y1) bb.y1 = ly;
      sumX[bi] += lx; sumY[bi] += ly;
    }
    var centres = [];
    for (j = 0; j < kn; j++) {
      centres.push(share[j] ? { x: sumX[j] / share[j], y: sumY[j] / share[j] }
                            : { x: w / 2, y: h / 2 });
    }
    return { centroids: cent, labels: labels, share: share, bounds: bounds,
             centres: centres, total: total };
  }

  /* ---------- 相邻关系 ---------- */

  /* 扫一遍图，统计每一对标签有多少组"贴着的像素"。比形态学膨胀
     便宜得多，而且顺便记下接触位置，可以直接拿来画框。 */
  function contacts(labels, w, h, k) {
    var pair = {}, i, x, y;
    function bump(a, b, x, y) {
      if (a === b || a < 0 || b < 0) return;
      var key = a < b ? a + ',' + b : b + ',' + a;
      var p = pair[key];
      if (!p) p = pair[key] = { n: 0, x0: w, y0: h, x1: 0, y1: 0, pts: [] };
      p.n++;
      if (x < p.x0) p.x0 = x;
      if (y < p.y0) p.y0 = y;
      if (x > p.x1) p.x1 = x;
      if (y > p.y1) p.y1 = y;

      /* 抽样记下真正的接触像素，供标注时描出接缝。

         只给外接框的话，两块颜色沿一条长边相接时框会盖住整张图，
         看不出"到底哪儿撞了"。描出接缝就精确得多。每 7 个取 1、
         上限 400 个点：足够勾出形状，又不会让内存和绘制变重。 */
      if (p.n % 7 === 0 && p.pts.length < 400) p.pts.push(x, y);
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        if (x + 1 < w) bump(labels[i], labels[i + 1], x, y);
        if (y + 1 < h) bump(labels[i], labels[i + w], x, y);
      }
    }
    return pair;
  }

  /* ---------- 修改建议 ---------- */

  function rgb2hex(c) {
    return '#' + c.map(function (v) {
      var s = Math.max(0, Math.min(255, v)).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('').toUpperCase();
  }

  /* 在保持色相的前提下拉开明度，直到模拟后也能分开。明度差是
     三种色觉障碍都保留得住的线索，比换色相稳妥。 */
  var lab2rgb = CVD.lab2rgb;

  /* 建议改法：在 Lab 里固定色相与彩度，只推明度。

     上一版是按 RGB 乘一个系数，从 ±12% 起试，第一个过阈值的就返回
     ——结果给出 #66411F → #5A391B 这种同色暗一点点的建议，设计师看了
     等于没看。现在直接在 Lab 空间上找，并且要求模拟后的明度差达到
     SIM_LIGHT_TARGET（够肉眼可靠区分），同时保证改完在正常色觉下仍
     然像"同一个颜色的另一个深浅"，而不是变成另一种颜色。

     找不到就老实返回 null——那意味着这一对靠调颜色救不回来，得加
     颜色之外的线索。这比硬凑一个无效建议诚实。 */
  function suggest(a, b, types) {
    var labB = rgb2lab(b[0], b[1], b[2]);
    var best = null;

    for (var dL = 8; dL <= 55; dL += 3) {
      for (var dir = 0; dir < 2; dir++) {
        var L = labB[0] + (dir ? dL : -dL);
        if (L < 12 || L > 94) continue;                  // 太黑或太白都不好用

        var cand = lab2rgb(L, labB[1], labB[2]);
        var candLab = rgb2lab(cand[0], cand[1], cand[2]);

        /* 必须对**所有**受影响的色觉类型都成立，否则只是把问题
           从一种色觉挪到另一种。 */
        var worst = Infinity;
        for (var i = 0; i < types.length; i++) {
          var sa = simulate(a, types[i]), sb = simulate(cand, types[i]);
          var d = lightDelta(rgb2lab(sa[0], sa[1], sa[2]), rgb2lab(sb[0], sb[1], sb[2]));
          if (d < worst) worst = d;
        }
        if (worst < CONFIG.SIM_LIGHT_TARGET) continue;

        /* 与原色相比要看得出是改过的，但不能面目全非 */
        var shift = deltaE(labB, candLab);
        if (shift < 12) continue;

        if (!best || shift < best.shift) {
          best = { hex: rgb2hex(cand), rgb: cand, simLight: worst, shift: shift };
        }
      }
      if (best) break;          // 由小到大搜，第一个成立的档位就是改动最小的
    }
    return best;
  }

  /* 区域形状决定该补什么线索。给一条 1px 的折线加纹理没有意义，
     给一大块色块加标记形状也没有意义。Geddes 等 (2025) 提醒过：
     冗余编码要编码**信息**，不是编码颜色——具体补什么，得看这块
     颜色在图上是以什么形态出现的。 */
  function shapeOf(box, pixels, w, h) {
    var bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    var fill = pixels / Math.max(1, bw * bh);
    var area = pixels / (w * h);
    if (area < 0.012) return 'point';        // 零散小块：图例点、标记
    if (fill < 0.3) return 'line';           // 铺得开但填充稀疏：折线、描边
    return 'area';                           // 实心块：柱、扇区、色带
  }

  /* ---------- 主入口 ---------- */

  /* 把图里的主色对回使用者自己那套配色。

     不做这一步，报告只能说"图里这两块颜色撞了"；做了才能说"撞的是
     你配色里的 2 号和 4 号"。后者设计师才知道回去改哪个色值。
     容差用 ΔE 12——量化出来的主色会因抗锯齿和 JPEG 压缩偏离原始色值，
     卡太紧就一个也对不上。 */
  function matchPalette(rgb, paletteLabs) {
    if (!paletteLabs || !paletteLabs.length) return null;
    var lab = rgb2lab(rgb[0], rgb[1], rgb[2]);
    var best = null, bestD = Infinity;
    for (var i = 0; i < paletteLabs.length; i++) {
      var d = deltaE(lab, paletteLabs[i].lab);
      if (d < bestD) { bestD = d; best = i; }
    }
    return bestD <= 12 ? { index: best, hex: paletteLabs[best].hex, delta: bestD } : null;
  }

  function run(imageData, w, h, refPalette) {
    var paletteLabs = (refPalette || []).map(function (hex, i) {
      var m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
      if (!m) return null;
      var v = parseInt(m[1], 16);
      var rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
      return { hex: rgb2hex(rgb), rgb: rgb, lab: rgb2lab(rgb[0], rgb[1], rgb[2]), index: i };
    }).filter(Boolean);

    var q = extract(imageData.data, w, h);
    if (!q) return { colours: [], findings: [], contactPairs: {} };

    var keep = [];
    for (var c = 0; c < q.centroids.length; c++) {
      if (q.share[c] / q.total >= CONFIG.MIN_SHARE) keep.push(c);
    }

    var bounds = q.bounds;
    var pairs = contacts(q.labels, w, h, q.centroids.length);
    var labs = q.centroids.map(function (c) { return rgb2lab(c[0], c[1], c[2]); });

    /* 哪些主色在做"区分类别"这件事？把接近中性的底色、文字色、
       灰阶排除掉，剩下的才是承担分类编码的颜色。

       这套判断有两个用途：一是过滤比较对象（底色不参与），二是
       判断颜色本身是否超载——超过五种时，不论色觉如何，读者都记不住
       颜色与类别的对应关系，那时候该做的是直接标注而不是继续调色。 */
    var categorical = keep.filter(function (c) {
      var lab = labs[c];
      return Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]) > 18;
    });
    var categoricalSet = {};
    categorical.forEach(function (c) { categoricalSet[c] = 1; });

    var simLabs = {};
    ['protan', 'deutan', 'tritan'].forEach(function (tp) {
      simLabs[tp] = q.centroids.map(function (c) {
        var s = simulate(c, tp);
        return rgb2lab(s[0], s[1], s[2]);
      });
    });

    /* 一对颜色出一条，受影响的色觉类型合并进去。

       之前是每个类型各推一条，于是同一对红/棕会以"红色盲"和"绿色盲"
       的名义出现两次，位置一样、建议一样——看起来像是两个问题，实际
       是一个。红绿两类色觉障碍本来就高度重叠，分开报只会制造噪音。 */
    var byPair = {};
    for (var ii = 0; ii < keep.length; ii++) {
      for (var jj = ii + 1; jj < keep.length; jj++) {
        var a = keep[ii], b = keep[jj];

        /* 设计本来是不是指望靠颜色区分这两块？色度差不够大就不是。 */
        var origChroma = chromaDelta(labs[a], labs[b]);
        if (origChroma <= CONFIG.ORIGINAL_CHROMA_MIN) continue;

        /* 两者都得在做"分类编码"（有明确彩度）才比。

           这里原本要求两块颜色在图上**物理接壤**，那是个错误。柱状
           图的各系列本来就分行分列摆着、彼此不挨边，读者靠图例把它们
           联系起来——恰恰是最常见的排布，却被这条规则整个跳过。工具
           自己的配色表那半边（findCollisions）比的就是每一对，没有相邻
           要求；两半边的判据本就该一致。

           噪音改用彩度过滤：底色、文字、灰阶都不参与比较。接壤与否
           降级成元数据，只用来决定标记画在哪、以及排序时谁靠前。 */
        if (categoricalSet[a] !== 1 || categoricalSet[b] !== 1) continue;

        var key = a < b ? a + ',' + b : b + ',' + a;
        var contact = pairs[key] || null;
        var touching = !!(contact && contact.n >= CONFIG.CONTACT_MIN);

        var origDE = deltaE(labs[a], labs[b]);

        var hits = [];
        ['protan', 'deutan', 'tritan'].forEach(function (tp) {
          var simChroma = chromaDelta(simLabs[tp][a], simLabs[tp][b]);
          var simLight = lightDelta(simLabs[tp][a], simLabs[tp][b]);
          var simDE = deltaE(simLabs[tp][a], simLabs[tp][b]);

          /* 判据一：色相塌了，而且明度没能接住。

             色相塌了不等于分不开。白底和青色柱在绿色盲下色相差会从
             35 掉到 2，但两者的明度差有 47——谁都分得开，那一对本来
             就不是靠色相区分的。不设这条线就会把每个"深色对浅色"的
             组合都报成问题，工具随即变成噪音。 */
          var hueCollapse = simChroma < CONFIG.SIM_CHROMA_MAX &&
                            simLight < CONFIG.SIM_LIGHT_SAFE;

          /* 判据二：不管色相塌没塌，模拟之后两块颜色总色差就是太小了。
             同样给明度留出路——剩下的差别若主要是明度撑起来的，那条
             线索三种色觉下都在，不算问题。另外要求确实是**损失**出来
             的：本来就挨得近的一对不是色觉障碍造成的，那是配色本身的
             问题，不该记在这里。 */
          var tooClose = simDE < CONFIG.SIM_DE_MAX &&
                         simLight < CONFIG.SIM_LIGHT_SAFE &&
                         (origDE - simDE) >= CONFIG.MIN_DE_LOSS;

          if (!hueCollapse && !tooClose) return;
          hits.push({ type: tp, simChroma: simChroma, simLight: simLight, simDE: simDE });
        });
        if (!hits.length) continue;

        /* 以最糟的那一种色觉定严重程度 */
        var worst = hits.reduce(function (m, x) {
          return x.simDE < m.simDE ? x : m;
        }, hits[0]);

        byPair[key] = {
          types: hits.map(function (x) { return x.type; }),
          detail: hits,
          /* "几乎无法分辨"直接用模拟后的总色差判。原来分别卡色度和
             明度两个上限，结果色度 12、明度 12 这种边缘情况被打成 high
             ——合起来 ΔE 约 17，其实是"勉强能分"，标签过重会让人不信任
             整个工具。总色差是一个量，说的就是"还剩多少可用的差别"。 */
          severity: worst.simDE < CONFIG.HIGH_DE_MAX ? 'high' : 'moderate',
          a: q.centroids[a], b: q.centroids[b],
          hexA: rgb2hex(q.centroids[a]), hexB: rgb2hex(q.centroids[b]),
          origChroma: origChroma,
          origDE: origDE,
          simChroma: worst.simChroma,
          simLight: worst.simLight,
          simDE: worst.simDE,
          touching: touching,
          contact: contact ? contact.n : 0,
          box: contact ? { x0: contact.x0, y0: contact.y0, x1: contact.x1, y1: contact.y1 } : null,
          seam: touching ? contact.pts : null,
          centreA: q.centres[a],
          centreB: q.centres[b],
          shape: shapeOf(bounds[b], q.share[b], w, h),
          paletteA: matchPalette(q.centroids[a], paletteLabs),
          paletteB: matchPalette(q.centroids[b], paletteLabs),
          fix: suggest(q.centroids[a], q.centroids[b], hits.map(function (x) { return x.type; }))
        };
      }
    }

    var findings = Object.keys(byPair).map(function (k) { return byPair[k]; });

    /* 严重的排前面；同级别里接触面越大越靠前 */
    findings.sort(function (p, r) {
      if (p.severity !== r.severity) return p.severity === 'high' ? -1 : 1;
      if (p.touching !== r.touching) return p.touching ? -1 : 1;   // 挨着的更要紧
      return (p.simDE - r.simDE) || (r.contact - p.contact);
    });

    return {
      colours: keep.map(function (c) {
        return { rgb: q.centroids[c], hex: rgb2hex(q.centroids[c]),
                 share: q.share[c] / q.total,
                 palette: matchPalette(q.centroids[c], paletteLabs) };
      }),
      categoricalCount: categorical.length,
      colourOverloaded: categorical.length > CONFIG.CATEGORICAL_MAX,
      findings: findings,
      config: CONFIG
    };
  }

  return { run: run, simulate: simulate, rgb2hex: rgb2hex, deltaE: deltaE, rgb2lab: rgb2lab, CONFIG: CONFIG };
})();
