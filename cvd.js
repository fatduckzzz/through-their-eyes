/* ============================================================
   cvd.js — 色觉模拟与判据，全站唯一一份

   为什么要有这个文件：

   在这之前，站上两半各自带了一套模拟矩阵，而且是不同的两套。
   配色表（ctool.js）用 Machado 2009，图片检查（analyse.js）用
   Viénot 族矩阵。同一个颜色，两边给出的模拟结果最大差到 ΔE 17
   ——#A54BBB 在配色表里是 #A55D7C，在图片检查里是 #9A6363，肉眼
   能看出是两个颜色。README 里写着"保持两处工具行为一致"，实际
   并不一致。

   更要紧的是 tritan。Viénot 1999 那篇自己就写明：他把 Brettel
   的两个半平面简化成一个平面的做法，只对红色盲和绿色盲成立，
   对蓝黄色盲不成立。旧代码的 tritan 矩阵第二、三行完全相同，
   于是模拟结果永远满足 G == B，整个蓝黄模拟被压在一条轴上。

   这里统一换成 Brettel 1997 的完整实现（两个半平面，常数取自
   libDaltonLens）。DaltonLens 对各家开源实现做过横评，结论是二
   色视用 Brettel 1997 最准，且在色觉障碍者社群的盲评里排第一。

   换过之后两处实测的改判：

     #E41A1C / #4DAF4A（站上"Red / Green"预设按钮）
       旧：绿色盲下 ΔE 23.5，两条判据都差一点，一条都不报
       新：绿色盲下 ΔE 21.3，报"只剩明度差"
       ——这是最经典的红绿撞色，工具自己拿它当演示按钮，原先却
       判成没问题。

     #D47D08 / #A54BBB（用户在真实图表上质疑的一对）
       旧：蓝黄下 ΔE 21.8，刚好压在 22 的线内，报"只剩明度差"
       新：蓝黄下 ΔE 23.1，不报
       ——用旧的 tritan 矩阵它是假阳性，用户肉眼看模拟图能分开，
       是对的。

   判据本身没动。试过把 CIE76 换成 CIEDE2000，在一组手工标注的
   判例上两者都划不出干净的分界线（ΔE2000 的重叠区间反而更窄但
   依然重叠），说明真正在干活的是"色度塌陷 + 明度逃生"这两条规
   则的形状，不是距离公式的选择。既然换了没有可证实的好处，就
   不换。

   依赖：无。
   ============================================================ */

var CVD = (function () {
  'use strict';

  /* Brettel 1997，sRGB 线性空间。每种色觉两个半平面，外加一个
     法向量决定用哪一个。常数取自 libDaltonLens（public domain）。 */
  var BRETTEL = {
    protan: {
      p1: [0.14980, 1.19548, -0.34528, 0.10764, 0.84864, 0.04372, 0.00384, -0.00540, 1.00156],
      p2: [0.14570, 1.16172, -0.30742, 0.10816, 0.85291, 0.03892, 0.00386, -0.00524, 1.00139],
      n: [0.00048, 0.00393, -0.00441]
    },
    deutan: {
      p1: [0.36477, 0.86381, -0.22858, 0.26294, 0.64245, 0.09462, -0.02006, 0.02728, 0.99278],
      p2: [0.37298, 0.88166, -0.25464, 0.25954, 0.63506, 0.10540, -0.01980, 0.02784, 0.99196],
      n: [-0.00281, -0.00611, 0.00892]
    },
    tritan: {
      p1: [1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.80500, 0.11911],
      p2: [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.12320, -0.37562, 1.12767, 0.24796],
      n: [0.03901, -0.02788, -0.01113]
    }
  };

  function s2l(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

  /* 0–255 的查表，逐像素跑的时候 Math.pow 是热点 */
  var S2L = (function () {
    var t = new Float64Array(256);
    for (var i = 0; i < 256; i++) t[i] = s2l(i);
    return t;
  })();

  function l2s(v) {
    v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  }

  /* rgb 是 [0-255, 0-255, 0-255]，返回同样格式 */
  function simulate(rgb, type) {
    var b = BRETTEL[type];
    if (!b) return [rgb[0], rgb[1], rgb[2]];
    var r = S2L[rgb[0] | 0], g = S2L[rgb[1] | 0], bl = S2L[rgb[2] | 0];
    /* 点在分隔平面的哪一侧，决定用哪个半平面的矩阵 */
    var m = (r * b.n[0] + g * b.n[1] + bl * b.n[2]) >= 0 ? b.p1 : b.p2;
    return [
      l2s(m[0] * r + m[1] * g + m[2] * bl),
      l2s(m[3] * r + m[4] * g + m[5] * bl),
      l2s(m[6] * r + m[7] * g + m[8] * bl)
    ];
  }

  /* ---------- CIELAB ---------- */

  function rgb2lab(r, g, b) {
    var R = S2L[r | 0], G = S2L[g | 0], B = S2L[b | 0];
    var x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
    var y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750);
    var z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
    function f(t) { return t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + 16 / 116; }
    var fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function lab2rgb(L, A, B) {
    var fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
    function inv(t) { return t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787; }
    var x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883;
    var r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    var g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    var b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    return [l2s(r), l2s(g), l2s(b)];
  }

  /* 色度差：a*b* 平面上的距离。色觉障碍塌掉的正是这个平面。 */
  function chromaDelta(a, b) {
    var da = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(da * da + db * db);
  }
  function lightDelta(a, b) { return Math.abs(a[0] - b[0]); }
  function deltaE(a, b) {
    var dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  /* ---------- 判据 ----------

     校准目标（2026-09 复核）：拿 Paul Tol 自己的红绿模拟公式
     （technical note 式 1、2）跑 IBM / Okabe–Ito / Tol 三套配色，
     结论是——在红绿两型下它们基本干净，唯一稳定塌掉的是
     Okabe–Ito 的橙 #E69F00 / 黄 #F0E442（Tol 公式下模拟色度差
     只剩 2.7，这也是文献里公认的弱对）。判据要复现这个结果：
     红绿的清晰对不误报，橙黄这种真塌的要抓到。

     判据二原来只卡 "模拟后 ΔE < 22"，偏松，会把色相其实还在、
     只是 ΔE 十七八的对也报出来（Tol muted 的青/玫瑰之类）。收紧
     成：色相也得确实塌了（simChroma < 15）才用总色差兜底，上限
     从 22 收到 19。

     判据一（真·色相塌陷）不动。 */
  var TH = {
    ORIGINAL_CHROMA_MIN: 25, // 原图里本来就不靠颜色分的，不算问题
    SIM_CHROMA_MAX: 13,      // 模拟后色度差低于此 → 色相塌了
    CLOSE_CHROMA_MAX: 15,    // 判据二只在色相也塌到这个程度以下才生效
    SIM_DE_MAX: 19,          // 判据二：模拟后总色差低于此 → 剩下的差别不够用
    HIGH_DE_MAX: 13,         // 低于此 → 几乎无法分辨
    MIN_DE_LOSS: 12,         // 前后至少损失这么多，才算色觉障碍造成的
    SIM_LIGHT_SAFE: 18,      // 明度差够大就不报：明度三种色觉都保得住
    SIM_LIGHT_TARGET: 28     // 建议改法要达到的模拟后明度差
  };

  /* 红绿两型合计约占男性 8.5%，蓝黄型约万分之一。渲染时把只在蓝黄
     下才塌的对单独归一组、放后面，别让它淹没红绿的结论。 */
  var COMMON_TYPES = { protan: 1, deutan: 1 };

  var TYPES = ['protan', 'deutan', 'tritan'];

  /* 判一对颜色。labA/labB 是原色的 Lab。
     返回 null（没问题）或 {severity, types, detail, ...}。 */
  function judgePair(labA, labB, simLabA, simLabB) {
    var origChroma = chromaDelta(labA, labB);
    if (origChroma <= TH.ORIGINAL_CHROMA_MIN) return null;
    var origDE = deltaE(labA, labB);

    var hits = [];
    for (var i = 0; i < TYPES.length; i++) {
      var tp = TYPES[i];
      var sc = chromaDelta(simLabA[tp], simLabB[tp]);
      var sl = lightDelta(simLabA[tp], simLabB[tp]);
      var sd = deltaE(simLabA[tp], simLabB[tp]);

      /* 判据一：色相塌了，而且明度没能接住。 */
      var hueCollapse = sc < TH.SIM_CHROMA_MAX && sl < TH.SIM_LIGHT_SAFE;
      /* 判据二：色相也塌到 CLOSE_CHROMA_MAX 以下、总色差又太小，
         而且这个"小"确实是损失出来的。 */
      var tooClose = sc < TH.CLOSE_CHROMA_MAX && sd < TH.SIM_DE_MAX &&
                     sl < TH.SIM_LIGHT_SAFE && (origDE - sd) >= TH.MIN_DE_LOSS;
      if (!hueCollapse && !tooClose) continue;
      hits.push({ type: tp, simChroma: sc, simLight: sl, simDE: sd });
    }
    if (!hits.length) return null;

    var worst = hits[0];
    for (var j = 1; j < hits.length; j++) if (hits[j].simDE < worst.simDE) worst = hits[j];

    /* 只在蓝黄（tritan）下才塌、红绿两型都过的对，单独标出来。 */
    var commonOnly = hits.some(function (x) { return COMMON_TYPES[x.type]; });

    return {
      types: hits.map(function (x) { return x.type; }),
      detail: hits,
      severity: worst.simDE < TH.HIGH_DE_MAX ? 'high' : 'moderate',
      rareTypeOnly: !commonOnly,   // true = 只在蓝黄色盲下才成问题
      origChroma: origChroma,
      origDE: origDE,
      simChroma: worst.simChroma,
      simLight: worst.simLight,
      simDE: worst.simDE
    };
  }

  /* 三种色觉的模拟 Lab，一次算好给 judgePair 用 */
  function simLabs(rgb) {
    var o = {};
    for (var i = 0; i < TYPES.length; i++) {
      var s = simulate(rgb, TYPES[i]);
      o[TYPES[i]] = rgb2lab(s[0], s[1], s[2]);
    }
    return o;
  }

  function hex2rgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(c) {
    return '#' + c.map(function (v) {
      return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    }).join('');
  }
  function simulateHex(hex, type) { return rgb2hex(simulate(hex2rgb(hex), type)); }
  function hex2lab(hex) { var r = hex2rgb(hex); return rgb2lab(r[0], r[1], r[2]); }

  return {
    TYPES: TYPES,
    TH: TH,
    S2L: S2L,
    simulate: simulate,
    simulateHex: simulateHex,
    simLabs: simLabs,
    rgb2lab: rgb2lab,
    lab2rgb: lab2rgb,
    hex2lab: hex2lab,
    hex2rgb: hex2rgb,
    rgb2hex: rgb2hex,
    chromaDelta: chromaDelta,
    lightDelta: lightDelta,
    deltaE: deltaE,
    judgePair: judgePair
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CVD;
