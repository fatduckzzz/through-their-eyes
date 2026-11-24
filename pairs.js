/* pairs.js: the pair rule, applied to exact colours (no image involved).
   It is the rule from analyse.js (the one frozen before the random audit), written out for a list of
   known colours, with every threshold read from CVDAnalyse.CONFIG so there is one set of numbers.
   Used by the palette studio and by the standalone palette table. ES5, depends on cvd.js and analyse.js. */
var TTEPairs = (function () {
  'use strict';
  var C = CVDAnalyse.CONFIG, TYPES = ['protan', 'deutan', 'tritan'];

  function hex2rgb(h) { var v = parseInt(String(h).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  function hex(rgb) { return CVDAnalyse.rgb2hex(rgb); }

  /* a, b: [r,g,b]. Returns null (no problem) or
     { types, severity, detail:[{type,simChroma,simLight,simDE}], simDE, origChroma, origDE, rareTypeOnly, sim:{type:[hexA,hexB]} } */
  function judge(a, b) {
    var la = CVD.rgb2lab(a[0], a[1], a[2]), lb = CVD.rgb2lab(b[0], b[1], b[2]);
    var origChroma = CVD.chromaDelta(la, lb);
    if (origChroma <= C.ORIGINAL_CHROMA_MIN) return null;      // never relied on colour to begin with
    var origDE = CVD.deltaE(la, lb), hits = [], sim = {};
    for (var i = 0; i < TYPES.length; i++) {
      var tp = TYPES[i], sa = CVD.simulate(a, tp), sb = CVD.simulate(b, tp);
      sim[tp] = [hex(sa), hex(sb)];
      var xa = CVD.rgb2lab(sa[0], sa[1], sa[2]), xb = CVD.rgb2lab(sb[0], sb[1], sb[2]);
      var sc = CVD.chromaDelta(xa, xb), sl = CVD.lightDelta(xa, xb), sd = CVD.deltaE(xa, xb);
      var hueCollapse = sc < C.SIM_CHROMA_MAX && sl < C.SIM_LIGHT_SAFE;
      var tooClose = sd < C.SIM_DE_MAX && sl < C.SIM_LIGHT_SAFE && (origDE - sd) >= C.MIN_DE_LOSS;
      if (hueCollapse || tooClose) hits.push({ type: tp, simChroma: sc, simLight: sl, simDE: sd });
    }
    if (!hits.length) return null;
    var worst = hits[0];
    for (var j = 1; j < hits.length; j++) if (hits[j].simDE < worst.simDE) worst = hits[j];
    var common = hits.some(function (h) { return h.type !== 'tritan'; });
    return {
      types: hits.map(function (h) { return h.type; }), detail: hits, sim: sim,
      severity: worst.simDE < C.HIGH_DE_MAX ? 'high' : 'moderate',
      simDE: worst.simDE, simLight: worst.simLight, simChroma: worst.simChroma,
      origChroma: origChroma, origDE: origDE, rareTypeOnly: !common
    };
  }

  /* every pair of a list of hex colours.
     findings: pairs that lose their difference for at least one type (worst first)
     close:    pairs already too similar for everybody (nothing for colour vision to take away) */
  function analyse(hexes) {
    var rgb = hexes.map(hex2rgb), labs = rgb.map(function (c) { return CVD.rgb2lab(c[0], c[1], c[2]); });
    var findings = [], close = [];
    for (var i = 0; i < rgb.length; i++) for (var j = i + 1; j < rgb.length; j++) {
      var v = judge(rgb[i], rgb[j]);
      if (v) { v.i = i; v.j = j; v.a = hex(rgb[i]); v.b = hex(rgb[j]); findings.push(v); }
      else if (CVD.deltaE(labs[i], labs[j]) < C.MIN_SEP) close.push([i, j]);
    }
    findings.sort(function (p, q) { if (p.severity !== q.severity) return p.severity === 'high' ? -1 : 1; return p.simDE - q.simDE; });
    return { findings: findings, close: close };
  }

  return { judge: judge, analyse: analyse, hex2rgb: hex2rgb };
})();
