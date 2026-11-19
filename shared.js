/* Small helpers shared by the chart wall, the palette studio and the research chart.
   ES5, no dependencies. */
var TTEUI = (function () {
  'use strict';
  var NAMES = { protan: 'Protanopia', deutan: 'Deuteranopia', tritan: 'Tritanopia', normal: 'Typical vision' };
  var TYPES = ['protan', 'deutan', 'tritan'];
  var FILL = { protan: '#ff5b4a', deutan: '#7fd36b', tritan: '#46a6ff' };
  var PAT = { protan: 'url(#pat-hatch)', deutan: 'url(#pat-dots)', tritan: 'url(#pat-cross)' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function typeList(types) { return types.map(function (x) { return NAMES[x]; }).join(' / '); }
  function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* one flagged pair -> one list row. f = {a, b, types, sev, sim:{protan:[a,b],...}} */
  function pairLi(f, eye) {
    var hit = eye !== 'normal' && f.types.indexOf(eye) >= 0;
    var ca = eye === 'normal' ? f.a : f.sim[eye][0];
    var cb = eye === 'normal' ? f.b : f.sim[eye][1];
    var near = f.sev === 'high';
    var status = eye === 'normal' ? ('Affects ' + typeList(f.types)) : (hit ? (near ? 'Nearly identical for these eyes' : 'Harder to tell apart for these eyes') : 'Still distinct for these eyes');
    var sev = near ? 'nearly identical' : 'harder to tell apart, some lightness difference remains';
    return '<li class="apair' + (hit ? ' hit' : '') + '"><div class="aswatches" aria-hidden="true">' +
      '<span class="asw" style="background:' + ca + '"><i>A</i></span><span class="asw b" style="background:' + cb + '"><i>B</i></span></div>' +
      '<div class="ameta"><b>' + esc(f.a) + ' ↔ ' + esc(f.b) + '</b><span class="st">' + esc(status) + '</span>' + (eye === 'normal' ? ' · ' + esc(sev) : '') + '</div></li>';
  }
  function foundText(n, nHigh) {
    nHigh = nHigh || 0;
    if (n === 0) return 'No colour pair loses its difference for any of the three types.';
    return (n === 1 ? '1 colour pair loses much of its difference' : n + ' colour pairs lose much of their difference') + ' for at least one type of colour vision' +
      (nHigh ? '; ' + (nHigh === n && n > 1 ? 'all of them' : nHigh + (nHigh === 1 ? ' of them' : ' of them')) + ' become nearly identical.' : '; none become nearly identical.');
  }
  /* turn a raw CVDAnalyse finding into the shape pairLi expects */
  function fromRun(f) {
    var sim = {};
    TYPES.forEach(function (x) { sim[x] = [CVDAnalyse.rgb2hex(CVDAnalyse.simulate(f.a, x)), CVDAnalyse.rgb2hex(CVDAnalyse.simulate(f.b, x))]; });
    return { a: f.hexA, b: f.hexB, types: f.types, sev: f.severity, sim: sim };
  }
  /* decode a File/Blob to a canvas (longest side <= 480, flattened on white) and run the checker */
  function analyseImage(file, done, fail) {
    if (!file || !/^image\//.test(file.type) || typeof CVDAnalyse === 'undefined') { fail(); return; }
    var url = URL.createObjectURL(file), im = new Image();
    im.onerror = function () { URL.revokeObjectURL(url); fail(); };
    im.onload = function () {
      var s = Math.min(1, 480 / Math.max(im.naturalWidth, im.naturalHeight));
      var w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
      var res = CVDAnalyse.run(cx.getImageData(0, 0, w, h), w, h, []);
      done({ url: url, name: file.name, colours: res.colours.length, overloaded: !!res.colourOverloaded, findings: res.findings.map(fromRun) });
    };
    im.src = url;
  }
  /* grouped bar chart into an <svg>. groups: [{label, values:[v for each TYPE], texts:[optional label]}]
     Every bar = colour + pattern + printed value. Sizes itself to the svg's box so text stays readable on phones. */
  function groupedBars(svg, groups, maxV, opts) {
    opts = opts || {};
    var boxW = svg.getBoundingClientRect().width, W = boxW > 200 ? Math.round(boxW) : 640;
    var narrow = W < 520, left = narrow ? 30 : 44, right = 12, top = narrow ? 74 : 50, base = narrow ? 250 : 236, ph = base - top, H = base + 44;
    var gw = (W - left - right) / groups.length, gap = narrow ? 3 : 8;
    var bw = Math.max(10, Math.min(34, Math.floor((gw - 12 - 2 * gap) / 3)));
    var s = '<title id="' + svg.id + 'T">' + esc(opts.title || '') + '</title><desc id="' + svg.id + 'D">' + esc(opts.desc || '') + '</desc>';
    var step = opts.step || 1, suf = opts.suffix || '';
    for (var g = 0; g <= maxV; g += step) {
      var y = base - ph * g / maxV;
      s += '<line x1="' + left + '" x2="' + (W - right) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,' + (g === 0 ? '.45' : '.11') + ')"/>';
      s += '<text x="' + (left - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + g + suf + '</text>';
    }
    var lx = left, ly = 8;
    TYPES.forEach(function (x) {
      var w = 30 + NAMES[x].length * 8 + 22;
      if (lx + w > W - right && lx > left) { lx = left; ly += 24; }
      s += '<g><rect x="' + lx + '" y="' + ly + '" width="22" height="16" rx="3" fill="' + FILL[x] + '"/><rect x="' + lx + '" y="' + ly + '" width="22" height="16" rx="3" fill="' + PAT[x] + '"/></g>';
      s += '<text x="' + (lx + 30) + '" y="' + (ly + 13) + '">' + NAMES[x] + '</text>';
      lx += w;
    });
    groups.forEach(function (grp, gi) {
      var cx = left + gw * gi + gw / 2, x0 = cx - (3 * bw + 2 * gap) / 2;
      TYPES.forEach(function (x, k) {
        var v = grp.values[k], h = ph * v / maxV, bx = x0 + k * (bw + gap), by = base - h;
        s += '<g class="barg" tabindex="0"><title>' + esc(grp.label + ' · ' + NAMES[x] + ': ' + (grp.texts ? grp.texts[k] : v) + ' charts') + '</title>' +
             '<rect class="bar" x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + Math.max(h, 0) + '" fill="' + FILL[x] + '"/>' +
             '<rect class="bar" x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + Math.max(h, 0) + '" fill="' + PAT[x] + '"/></g>';
        s += '<text class="val" x="' + (bx + bw / 2) + '" y="' + (by - 6) + '">' + (grp.texts ? grp.texts[k] : v) + '</text>';
      });
      s += '<text x="' + cx + '" y="' + (base + 24) + '" text-anchor="middle">' + esc(grp.label) + '</text>';
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = s;
  }
  return { NAMES: NAMES, TYPES: TYPES, FILL: FILL, PAT: PAT, esc: esc, $: $, typeList: typeList, reduced: reduced,
           pairLi: pairLi, foundText: foundText, fromRun: fromRun, analyseImage: analyseImage, groupedBars: groupedBars };
})();
