/* Palette studio: build a palette, see it under four pairs of eyes, get the pairs that collapse
   (same checker as the chart wall) and a pattern-as-second-cue preview. Also checks an uploaded
   chart in the browser; nothing is uploaded anywhere. */
(function () {
  'use strict';
  var sec = document.getElementById('palette');
  if (!sec || typeof TTEUI === 'undefined' || typeof CVDAnalyse === 'undefined') return;
  var U = TTEUI, $ = U.$;
  var PRESETS = {
    'Okabe–Ito': ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7'],
    'Tol bright': ['#4477aa', '#ee6677', '#228833', '#ccbb44', '#66ccee', '#aa3377'],
    'IBM': ['#648fff', '#785ef0', '#dc267f', '#fe6100', '#ffb000'],
    'Tableau 10': ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'],
    'ColorBrewer Set1': ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf'],
    'Red / green': ['#d72d2d', '#3ca03c', '#3366cc', '#f4b400']
  };
  var MAXC = 10, MINC = 2;
  var cols = PRESETS['Okabe–Ito'].slice(), eye = 'normal', mine = null, mineUrl = null;
  var EYES = ['normal', 'protan', 'deutan', 'tritan'];
  var PATS = ['url(#pat-hatch)', 'url(#pat-dots)', 'url(#pat-cross)', 'url(#pat-vert)', 'url(#pp-diag2)', 'url(#pp-horiz)'];
  var PATCSS = [
    'repeating-linear-gradient(45deg,rgba(0,0,0,.62) 0 3px,transparent 3px 8px)',
    'radial-gradient(rgba(0,0,0,.65) 22%,transparent 24%) 0 0/9px 9px',
    'linear-gradient(rgba(0,0,0,.6) 2px,transparent 2px) 0 0/9px 9px,linear-gradient(90deg,rgba(0,0,0,.6) 2px,transparent 2px) 0 0/9px 9px',
    'repeating-linear-gradient(90deg,rgba(0,0,0,.6) 0 3px,transparent 3px 8px)',
    'repeating-linear-gradient(-45deg,rgba(0,0,0,.62) 0 3px,transparent 3px 8px)',
    'repeating-linear-gradient(0deg,rgba(0,0,0,.6) 0 3px,transparent 3px 8px)'
  ];
  function hex2rgb(h) { var v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  function sim(hex, type) { return type === 'normal' ? hex : CVDAnalyse.rgb2hex(CVDAnalyse.simulate(hex2rgb(hex), type)); }
  function validHex(s) { return /^#[0-9a-f]{6}$/i.test(s); }

  /* ---------- analysis: render the palette to a canvas and run the same checker as for images ---------- */
  function analyse() {
    var n = cols.length, cell = 70, gap = 18, w = n * cell + (n + 1) * gap, h = cell + 2 * gap;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
    cols.forEach(function (hx, i) { cx.fillStyle = hx; cx.fillRect(gap + i * (cell + gap), gap, cell, cell); });
    var res = CVDAnalyse.run(cx.getImageData(0, 0, w, h), w, h, []);
    var lab = cols.map(function (hx) { return CVDAnalyse.rgb2lab.apply(null, hex2rgb(hx)); });
    function idx(hex) {
      var l = CVDAnalyse.rgb2lab.apply(null, hex2rgb(hex)), best = 0, bd = 1e9;
      lab.forEach(function (m, i) { var d = CVDAnalyse.deltaE(l, m); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    var f = res.findings.map(function (x) { var o = U.fromRun(x); o.ia = idx(o.a); o.ib = idx(o.b); return o; });
    /* pairs already too close for anyone: the checker merges those into one colour */
    var close = [];
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (CVDAnalyse.deltaE(lab[i], lab[j]) < CVDAnalyse.CONFIG.MIN_SEP) close.push([i, j]);
    return { findings: f, close: close };
  }

  /* ---------- rendering ---------- */
  function renderList() {
    $('palList').innerHTML = cols.map(function (hx, i) {
      return '<li class="prow"><span class="pidx">' + (i + 1) + '</span>' +
        '<input type="color" value="' + hx + '" data-i="' + i + '" aria-label="Colour ' + (i + 1) + '">' +
        '<input type="text" class="phex" value="' + hx + '" data-i="' + i + '" maxlength="7" spellcheck="false" aria-label="Hex for colour ' + (i + 1) + '">' +
        '<button class="prm" data-rm="' + i + '" aria-label="Remove colour ' + (i + 1) + '"' + (cols.length <= MINC ? ' disabled' : '') + '>×</button></li>';
    }).join('');
    $('palAdd').disabled = cols.length >= MAXC;
  }
  function renderResult() {
    var a = analyse(), fix = sec.classList.contains('fix-on');
    $('palSim').innerHTML = EYES.map(function (ty) {
      return '<div class="psimrow' + (ty === eye ? ' on' : '') + '" data-eye-row="' + ty + '" role="button" tabindex="0" aria-label="Show ' + U.NAMES[ty] + ' in the chart"><span class="psimlab">' + U.NAMES[ty] + '</span><span class="psw">' +
        cols.map(function (hx, i) {
          return '<span class="pswatch" style="background:' + sim(hx, ty) + '"><i style="' + (fix ? 'background:' + PATCSS[i % PATCSS.length] : '') + '"></i><b>' + (i + 1) + '</b></span>';
        }).join('') + '</span><span class="psimgo">' + (ty === eye ? 'In chart' : 'Click to view') + '</span></div>';
    }).join('');
    var html = '';
    a.close.forEach(function (p) {
      html += '<li class="apair hit"><div class="aswatches" aria-hidden="true"><span class="asw" style="background:' + cols[p[0]] + '"><i>' + (p[0] + 1) + '</i></span><span class="asw" style="background:' + cols[p[1]] + '"><i>' + (p[1] + 1) + '</i></span></div>' +
        '<div class="ameta"><b>#' + (p[0] + 1) + ' ↔ #' + (p[1] + 1) + '</b><span class="st">Too similar for everyone</span> · already close with typical vision</div></li>';
    });
    a.findings.forEach(function (f) {
      var li = U.pairLi(f, eye).replace('<b>' + U.esc(f.a) + ' ↔ ' + U.esc(f.b) + '</b>', '<b>#' + (f.ia + 1) + ' ↔ #' + (f.ib + 1) + ' <span class="hx">' + U.esc(f.a) + ' / ' + U.esc(f.b) + '</span></b>');
      html += li;
    });
    var nHigh = a.findings.filter(function (f) { return f.sev === 'high'; }).length, nClose = a.close.length, nMod = a.findings.length - nHigh;
    var n = a.findings.length + nClose;
    $('palFound').textContent = n === 0 ? 'No colour pair loses its difference. This palette holds up for all three types.' :
      (nHigh + nMod === 0 ? '' : (nHigh + nMod) + (nHigh + nMod === 1 ? ' pair loses' : ' pairs lose') + ' much of the difference for at least one type' + (nHigh ? '; ' + nHigh + (nHigh === 1 ? ' becomes' : ' become') + ' nearly identical.' : '; none become nearly identical.') + ' ') +
      (nClose ? nClose + (nClose === 1 ? ' pair is' : ' pairs are') + ' already too close for everyone. ' : '') + 'A second cue helps most where colours become nearly identical.';
    $('palPairs').innerHTML = html;
    var pc = $('palCount'); if (pc) pc.textContent = n === 0 ? 'Pairs that lose difference: none' : 'Pairs that lose difference: ' + n + (nHigh ? ' (' + nHigh + ' nearly identical)' : '');
    var cap = $('palCap'); if (cap) cap.textContent = 'Chart shown through: ' + U.NAMES[eye];
    drawChart(fix);
  }
  function drawChart(fix) {
    var svg = $('palChart'), w = 560, h = 190, n = cols.length, gw = (w - 40) / n, bw = Math.min(46, gw - 10);
    var vals = [6, 9, 5, 8, 4, 7, 3, 6, 5, 8], s = '';
    s += '<defs><pattern id="pp-diag2" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#0c0c10" stroke-width="3"/></pattern>' +
         '<pattern id="pp-horiz" width="7" height="7" patternUnits="userSpaceOnUse"><line x1="0" y1="3.5" x2="7" y2="3.5" stroke="#0c0c10" stroke-width="2.6"/></pattern></defs>';
    s += '<line x1="20" x2="' + (w - 20) + '" y1="150" y2="150" stroke="rgba(255,255,255,.4)"/>';
    cols.forEach(function (hx, i) {
      var bh = vals[i % vals.length] * 12, x = 20 + gw * i + (gw - bw) / 2, y = 150 - bh;
      s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="3" fill="' + hx + '"/>';
      if (fix) s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="3" fill="' + PATS[i % PATS.length] + '" opacity=".9"/>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (y - 6) + '" text-anchor="middle" class="val">' + vals[i % vals.length] + '</text>';
      s += '<text x="' + (x + bw / 2) + '" y="170" text-anchor="middle">' + (i + 1) + '</text>';
    });
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.innerHTML = s;
  }
  function paintEyes() {
    sec.setAttribute('data-eye', eye);
    [].forEach.call(sec.querySelectorAll('[data-eye-btn]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-eye-btn') === eye)); });
  }

  /* ---------- events ---------- */
  var timer = null;
  function changed(rerenderList) { if (rerenderList) renderList(); clearTimeout(timer); timer = setTimeout(renderResult, 60); }
  sec.addEventListener('input', function (e) {
    var i = e.target.getAttribute('data-i'); if (i === null) return; i = +i;
    if (e.target.type === 'color') { cols[i] = e.target.value; var tx = sec.querySelector('.phex[data-i="' + i + '"]'); if (tx) tx.value = e.target.value; changed(false); }
    else if (e.target.classList.contains('phex')) {
      var v = e.target.value.trim(); if (v[0] !== '#') v = '#' + v;
      if (validHex(v)) { cols[i] = v.toLowerCase(); var cp = sec.querySelector('input[type=color][data-i="' + i + '"]'); if (cp) cp.value = cols[i]; changed(false); }
    }
  });
  sec.addEventListener('click', function (e) {
    var er = e.target.closest('[data-eye-row]'); if (er) { eye = er.getAttribute('data-eye-row'); paintEyes(); renderResult(); if (mine) renderMine(); return; }
    var eb = e.target.closest('[data-eye-btn]'); if (eb) { eye = eb.getAttribute('data-eye-btn'); paintEyes(); renderResult(); if (mine) renderMine(); return; }
    var pr = e.target.closest('[data-preset]'); if (pr) { cols = PRESETS[pr.getAttribute('data-preset')].slice(); [].forEach.call(sec.querySelectorAll('[data-preset]'), function (b) { b.setAttribute('aria-pressed', String(b === pr)); }); changed(true); return; }
    var rm = e.target.closest('[data-rm]'); if (rm && cols.length > MINC) { cols.splice(+rm.getAttribute('data-rm'), 1); changed(true); return; }
    if (e.target.closest('#palAdd') && cols.length < MAXC) {
      var NEXT = ['#8e44ad', '#16a085', '#e67e22', '#2c7fb8', '#c0392b', '#7fbf3f'];
      cols.push(NEXT[cols.length % NEXT.length]); [].forEach.call(sec.querySelectorAll('[data-preset]'), function (b) { b.setAttribute('aria-pressed', 'false'); }); changed(true);
    }
  });
  $('palFix').addEventListener('change', function () { sec.classList.toggle('fix-on', this.checked); renderResult(); });

  /* ---------- upload checker ---------- */
  function renderMine() {
    var out = $('mineOut'); if (!mine) { out.hidden = true; return; }
    out.hidden = false;
    $('mineFound').textContent = mine.colours < 2 ? 'Fewer than two distinct colours were found, so there is nothing to compare.' : U.foundText(mine.findings.length, mine.findings.filter(function (f) { return f.sev === 'high'; }).length);
    $('minePairs').innerHTML = mine.findings.map(function (f) { return U.pairLi(f, eye); }).join('');
    $('mineNote').textContent = (mine.overloaded ? 'This image uses many colours for categories. Matching that many colours to a legend is hard for everyone, so direct labels will help more than a new palette. ' : '') +
      'Works best on flat-colour charts. Photos, gradients and heavily compressed images can give false alarms.';
  }
  $('mineFile').addEventListener('change', function () {
    var file = this.files[0]; this.value = '';
    U.analyseImage(file, function (r) {
      if (mineUrl) URL.revokeObjectURL(mineUrl); mineUrl = r.url; $('mineImg').src = r.url; $('mineImg').alt = r.name; mine = r; renderMine();
    }, function () { alert('That file could not be read as an image.'); });
  });

  /* ---------- the tool as a short story: see -> fix -> add a cue -> your turn ---------- */
  var act = 1;
  var ACTS = [
    null,
    { t: 'You are the designer.', p: 'Your team asked for a chart palette. These four colours \u2014 red, green, blue and gold \u2014 look clearly different on your screen.', cta: 'Put on their eyes \u2192' },
    { t: 'Now put on their eyes.', p: 'Typical vision is shown first. Click any row to see what that type sees. With deuteranopia, red and green merge. Change the colours, or load a palette built for this, and watch the counter.', cta: 'Add a second cue \u2192' },
    { t: 'Colour does not have to carry it alone.', p: 'Patterns, labels and shapes survive any pair of eyes. With the pattern on, click through the rows again.', cta: 'Try it on a real chart \u2192' },
    { t: 'Your turn.', p: 'Pick a chart, a slide or a screenshot. The same checker shows where it breaks. Nothing leaves your browser.', cta: '' }
  ];
  function setPreset(name) {
    cols = PRESETS[name].slice();
    [].forEach.call(sec.querySelectorAll('[data-preset]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-preset') === name)); });
    renderList();
  }
  function setAct(n) {
    act = n; sec.setAttribute('data-act', String(n));
    if (n === 1) { setPreset('Red / green'); eye = 'normal'; sec.classList.remove('fix-on'); $('palFix').checked = false; }
    if (n === 2) { sec.classList.remove('fix-on'); $('palFix').checked = false; }
    if (n === 3) { sec.classList.add('fix-on'); $('palFix').checked = true; }
    if (n === 4) { eye = 'normal'; }
    $('palActT').textContent = ACTS[n].t; $('palActP').textContent = ACTS[n].p;
    var nx = $('palNext'); nx.textContent = ACTS[n].cta; nx.style.display = ACTS[n].cta ? '' : 'none';
    $('palBack').style.visibility = n === 1 ? 'hidden' : 'visible';
    [].forEach.call(sec.querySelectorAll('#palSteps li'), function (li) { var k = +li.getAttribute('data-act'); li.classList.toggle('on', k === n); li.classList.toggle('done', k < n); });
    paintEyes(); renderResult(); if (mine) renderMine();
  }
  $('palNext').addEventListener('click', function () { if (act < 4) setAct(act + 1); });
  $('palBack').addEventListener('click', function () { if (act > 1) setAct(act - 1); });
  $('palSteps').addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) setAct(+li.getAttribute('data-act')); });

  renderList(); paintEyes(); renderResult();
  setAct(1);
  [].forEach.call(sec.querySelectorAll('[data-preset]'), function (b, i) { b.setAttribute('aria-pressed', String(i === 0)); });
  if (window.TTE_APP) TTE_APP.onShow(function (id) { if (id === 'palette') setAct(1); });
})();
