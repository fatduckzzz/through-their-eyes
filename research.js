/* Research section: prevalence chart built from the numbers in the cited papers.
   Every bar has a pattern, a printed value and a source tag, so it reads without colour. */
(function () {
  'use strict';
  var svg = document.getElementById('prevChart'); if (!svg) return;
  var sec = document.getElementById('evidence');
  /* [label, low, high or null, source, kind]  kind: review -> hatch on gold, measured -> dots on blue */
  var ROWS = [
    ['Men, European ancestry', 8, null, 'Birch 2012 review', 'review'],
    ['Men, Chinese and Japanese ancestry', 4, 6.5, 'Birch 2012 review (range)', 'review'],
    ['Male undergraduates, China', 4.11, null, 'Gao 2023, 17,303 screened', 'measured'],
    ['Women, European ancestry', 0.4, null, 'Birch 2012 review', 'review'],
    ['Female undergraduates, China', 0.16, null, 'Gao 2023, 8,352 women', 'measured']
  ];
  function draw() {
    var box = svg.getBoundingClientRect().width, W = box > 220 ? Math.round(box) : 640, narrow = W < 520;
    var labW = narrow ? 0 : 230, left = labW + 14, right = 70, rowH = narrow ? 64 : 46, top = 14, plotW = W - left - right, max = 9;
    var H = top + ROWS.length * rowH + 40, s = '<defs><pattern id="pv-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.7" fill="#08080b"/></pattern></defs>';
    s += '<title id="prevChartT">Prevalence of colour vision deficiency by group</title><desc id="prevChartD">' +
      ROWS.map(function (r) { return r[0] + ': ' + (r[2] ? r[1] + ' to ' + r[2] : r[1]) + ' percent'; }).join('; ') + '</desc>';
    for (var g = 0; g <= max; g += 3) {
      var x = left + plotW * g / max;
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + top + '" y2="' + (H - 34) + '" stroke="rgba(255,255,255,' + (g === 0 ? '.4' : '.1') + ')"/>';
      s += '<text x="' + x + '" y="' + (H - 16) + '" text-anchor="middle">' + g + '%</text>';
    }
    ROWS.forEach(function (r, i) {
      var y = top + i * rowH, bh = 22, by = y + (narrow ? 26 : (rowH - bh) / 2);
      var w1 = plotW * r[1] / max, w2 = r[2] ? plotW * (r[2] - r[1]) / max : 0;
      var fill = r[4] === 'review' ? '#ffb24a' : '#46a6ff', pat = r[4] === 'review' ? 'url(#pat-hatch)' : 'url(#pv-dots)';
      if (narrow) s += '<text x="0" y="' + (y + 16) + '" class="rl">' + r[0] + '</text>'; else s += '<text x="' + (labW) + '" y="' + (by + 16) + '" text-anchor="end" class="rl">' + r[0] + '</text>';
      s += '<g class="pbar" style="transition-delay:' + (i * 90) + 'ms"><rect x="' + left + '" y="' + by + '" width="' + Math.max(w1, 2) + '" height="' + bh + '" fill="' + fill + '"/>' +
           '<rect x="' + left + '" y="' + by + '" width="' + Math.max(w1, 2) + '" height="' + bh + '" fill="' + pat + '"/>';
      if (r[2]) s += '<rect x="' + (left + w1) + '" y="' + by + '" width="' + w2 + '" height="' + bh + '" fill="' + fill + '" opacity=".38"/><rect x="' + (left + w1) + '" y="' + by + '" width="' + w2 + '" height="' + bh + '" fill="none" stroke="' + fill + '" stroke-dasharray="4 3"/>';
      s += '</g>';
      var endX = left + plotW * (r[2] || r[1]) / max;
      s += '<text x="' + (endX + 8) + '" y="' + (by + 16) + '" class="val2">' + (r[2] ? r[1] + '–' + r[2] : r[1]) + '%</text>';
      s += '<text x="' + left + '" y="' + (by + bh + 14) + '" class="src">' + r[3] + '</text>';
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = s;
  }
  function go() { draw(); if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { sec.classList.add('prev-anim'); sec.classList.remove('prev-in'); setTimeout(function () { sec.classList.add('prev-in'); }, 80); } }
  if (window.TTE_APP) TTE_APP.onShow(function (id) { if (id === 'evidence') go(); });
  window.addEventListener('resize', function () { clearTimeout(window.__prevRz); window.__prevRz = setTimeout(function () { if (sec.classList.contains('active')) draw(); }, 180); });
  draw();

  /* ---- opening screen: the random-sample result, before the story begins ---- */
  var hd = document.getElementById('heroDataChart');
  function drawHeroData() {
    if (!hd || typeof SAMPLE === 'undefined') return;
    var P = function (k) { return Math.round(100 * k / SAMPLE.n); };
    var head = document.getElementById('hdHead');
    if (head) head.textContent = P(SAMPLE.any) + '% of ' + SAMPLE.n + ' randomly drawn charts hold a pair of colours that is much harder to tell apart for some kind of colour vision.' + (SAMPLE.high ? ' ' + P(SAMPLE.high) + '% hold a pair that becomes nearly identical.' : '');
    var rows = [['At least one type', SAMPLE.any, '#ffb24a', 'url(#pat-vert)'], ['Nearly identical', SAMPLE.high || 0, '#e9e4d8', 'url(#pat-vert)'], ['Protanopia', SAMPLE.protan, '#ff5b4a', 'url(#pat-hatch)'], ['Deuteranopia', SAMPLE.deutan, '#7fd36b', 'url(#pat-dots)'], ['Tritanopia', SAMPLE.tritan, '#46a6ff', 'url(#pat-cross)']];
    var box = hd.getBoundingClientRect().width, W = box > 200 ? Math.round(box) : 640, narrow = W < 520;
    var labW = narrow ? 0 : 150, left = labW + 6, right = 118, rowH = narrow ? 54 : 44, plotW = W - left - right, H = rows.length * rowH + 14, s = '';
    s += '<title id="heroDataChartT">Share of 120 random charts with a collapsing colour pair</title><desc id="heroDataChartD">' + rows.map(function (r) { return r[0] + ' ' + r[1] + ' of ' + SAMPLE.n + ' charts'; }).join('; ') + '</desc>';
    rows.forEach(function (r, i) {
      var y = i * rowH + 6, bh = 24, by = y + (narrow ? 22 : 8), w = Math.max(3, plotW * r[1] / SAMPLE.n);
      if (narrow) s += '<text x="0" y="' + (y + 14) + '" class="hl">' + r[0] + '</text>'; else s += '<text x="' + labW + '" y="' + (by + 17) + '" text-anchor="end" class="hl">' + r[0] + '</text>';
      s += '<g class="hbar" style="transition-delay:' + (i * 110) + 'ms"><rect x="' + left + '" y="' + by + '" width="' + w + '" height="' + bh + '" rx="3" fill="' + r[2] + '"/><rect x="' + left + '" y="' + by + '" width="' + w + '" height="' + bh + '" rx="3" fill="' + r[3] + '"/></g>';
      s += '<text x="' + (left + w + 10) + '" y="' + (by + 17) + '" class="hv">' + P(r[1]) + '%<tspan class="hc"> ' + r[1] + '/' + SAMPLE.n + '</tspan></text>';
    });
    hd.setAttribute('viewBox', '0 0 ' + W + ' ' + H); hd.innerHTML = s;
  }
  function animHeroData() {
    var box = document.getElementById('heroData'); if (!box) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    box.classList.add('hd-anim'); box.classList.remove('hd-in');
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { box.classList.add('hd-in'); o.disconnect(); } }); }, { threshold: .35 });
      o.observe(box);
    } else box.classList.add('hd-in');
  }
  drawHeroData(); animHeroData();
  window.addEventListener('resize', function () { clearTimeout(window.__hdRz); window.__hdRz = setTimeout(drawHeroData, 180); });
  if (window.TTE_APP) TTE_APP.onShow(function (id) { if (id === 'hero') { drawHeroData(); animHeroData(); } });
})();
