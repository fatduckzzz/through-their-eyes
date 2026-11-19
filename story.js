/* Charts chapter: scroll-driven. Three real charts are pinned while the reader scrolls through
   steps that change the pair of eyes. The other 27 charts of the hand-picked set appear only in
   the summary chart. Nothing here is a prevalence estimate. */
(function () {
  'use strict';
  if (typeof AUDIT_DATA === 'undefined' || typeof TTEUI === 'undefined') return;
  var U = TTEUI, $ = U.$, sec = $('charts'), host = $('storyHost'); if (!sec || !host) return;

  var FEATURED = [
    { id: 'dev_stacked_05', tag: 'Case 1 · legend only',
      lead: 'Eight categories stacked into one bar per year. The only thing that tells them apart is a colour legend.',
      last: 'Nothing else separates the layers: no labels written on the chart, no patterns. A pattern per category, or labels on the bars, would give the reader a second way in.' },
    { id: 'dev_stacked_02', tag: 'Case 2 · labelled directly',
      lead: 'Six layers of CO₂ by source, each one named at the right-hand edge of the chart.',
      last: 'The labels are the second cue. Some layer colours still collapse, but nobody has to match a colour to a legend, so the chart stays readable. Flagged does not mean broken.' },
    { id: 'dev_scatter_01', tag: 'Case 3 · partly labelled',
      lead: 'Every dot is a country, coloured by continent. A few countries are named.',
      last: 'Naming some countries helps, but the continent groups are colour only. A different marker shape for each continent would let the groups survive any pair of eyes.' }
  ];
  function get(id) { for (var i = 0; i < AUDIT_DATA.length; i++) if (AUDIT_DATA[i].id === id) return AUDIT_DATA[i]; }
  function ofType(d, x) { return d.findings.filter(function (f) { return f.types.indexOf(x) >= 0; }); }
  function stepText(d, x) {
    var list = ofType(d, x), nm = U.NAMES[x];
    if (!list.length) return 'Under ' + nm.toLowerCase() + ' every pair of colours on this chart stays distinct.';
    var closest = list.slice().sort(function (a, b) { return a.de - b.de; })[0];
    return list.length + (list.length === 1 ? ' pair of colours collapses' : ' pairs of colours collapse') + ' under ' + nm.toLowerCase() +
      '. The closest: ' + closest.a + ' and ' + closest.b + ' end up almost the same colour.';
  }

  function build() {
    host.innerHTML = FEATURED.map(function (f, bi) {
      var d = get(f.id); if (!d) return '';
      var steps = [
        { eye: 'normal', h: 'Typical vision', p: f.lead },
        { eye: 'protan', h: U.NAMES.protan, p: stepText(d, 'protan') },
        { eye: 'deutan', h: U.NAMES.deutan, p: stepText(d, 'deutan') },
        { eye: 'tritan', h: U.NAMES.tritan, p: stepText(d, 'tritan') },
        { eye: 'cue', h: 'The second cue', p: f.last }
      ];
      return '<article class="scrolly" data-b="' + bi + '" data-eye="normal">' +
        '<div class="sc-sticky"><div class="sc-top"><span class="sc-tag">' + U.esc(f.tag) + '</span><span class="sc-eyetag">Seeing as: <b>Typical vision</b></span></div>' +
        '<div class="sc-imgwrap"><img class="sc-img" src="' + d.img + '" alt="' + U.esc(d.title) + '" loading="lazy" decoding="async"></div>' +
        '<div class="sc-foot"><h3>' + U.esc(d.title) + '</h3><a href="' + d.owid + '" target="_blank" rel="noopener">Our World in Data ↗</a></div>' +
        '<ul class="sc-pairs"></ul></div>' +
        '<div class="sc-steps">' + steps.map(function (s, si) {
          return '<div class="sc-step" data-eye="' + s.eye + '" data-s="' + si + '"><div class="sc-card"><span class="sc-num">' + (si + 1) + ' / 5</span><b>' + U.esc(s.h) + '</b><p>' + U.esc(s.p) + '</p></div></div>';
        }).join('') + '</div></article>';
    }).join('');
    [].forEach.call(host.querySelectorAll('.scrolly'), function (el) { apply(el, 'normal', 0); });
    observe();
  }
  function apply(block, eye, si) {
    var d = get(FEATURED[+block.getAttribute('data-b')].id), pic = eye === 'cue' ? 'normal' : eye;
    block.setAttribute('data-eye', pic);
    block.classList.toggle('fix-on', eye === 'cue');
    block.querySelector('.sc-eyetag b').textContent = eye === 'cue' ? 'Typical vision + a second cue' : U.NAMES[eye];
    var list = block.querySelector('.sc-pairs');
    list.innerHTML = d.findings.length ? d.findings.map(function (f) { return U.pairLi(f, pic); }).join('') :
      '<li class="apair"><div class="ameta"><b>No colour pair collapses.</b>Every pair stays distinct for all three types.</div></li>';
    [].forEach.call(block.querySelectorAll('.sc-step'), function (s) { s.classList.toggle('on', +s.getAttribute('data-s') === si); });
  }
  var io = null;
  function observe() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var st = en.target; apply(st.closest('.scrolly'), st.getAttribute('data-eye'), +st.getAttribute('data-s'));
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    [].forEach.call(host.querySelectorAll('.sc-step'), function (s) { io.observe(s); });
  }

  /* random sample of 120: share of charts of each kind with a collapsing pair, per type of vision */
  var LABEL = { line: 'Line', map: 'Map', stacked: 'Stacked', scatter: 'Scatter', bar: 'Bars' };
  function pct(k, n) { return n ? Math.round(100 * k / n) : 0; }
  function fillCards() {
    if (typeof SAMPLE === 'undefined') return;
    function card(key, big, text, ev) {
      var b = sec.querySelector('[data-sample="' + key + '"]'), t = sec.querySelector('[data-sample-t="' + key + '"]'), e = sec.querySelector('[data-sample-e="' + key + '"]');
      if (b) b.textContent = big; if (t) t.textContent = text; if (e) e.textContent = ev;
    }
    function kind(k) { for (var i = 0; i < SAMPLE.byKind.length; i++) if (SAMPLE.byKind[i].kind === k) return SAMPLE.byKind[i]; }
    card('all', pct(SAMPLE.any, SAMPLE.n) + '%', 'of the charts have at least one pair of colours that collapses for some type of colour vision', SAMPLE.any + ' of ' + SAMPLE.n + ' · 95% interval ' + SAMPLE.ci[0] + '–' + SAMPLE.ci[1] + '%');
    var st = kind('stacked'), ln = kind('line');
    card('stacked', pct(st.any, st.n) + '%', 'of stacked charts, where many layers rely on colour alone', st.any + ' of ' + st.n + ' · 95% interval ' + st.ci[0] + '–' + st.ci[1] + '%');
    card('line', pct(ln.any, ln.n) + '%', 'of line charts, which often label lines directly', ln.any + ' of ' + ln.n + ' · 95% interval ' + ln.ci[0] + '–' + ln.ci[1] + '%');
  }
  function summary() {
    if (typeof SAMPLE === 'undefined') return;
    fillCards();
    var groups = ['stacked', 'scatter', 'map', 'line', 'bar'].map(function (ty) {
      var k = SAMPLE.byKind.filter(function (x) { return x.kind === ty; })[0];
      var vals = [pct(k.protan, k.n), pct(k.deutan, k.n), pct(k.tritan, k.n)];
      return { label: LABEL[ty] + ' (' + k.n + ')', values: vals, texts: vals.map(function (v, i) { return [k.protan, k.deutan, k.tritan][i] + '/' + k.n; }) };
    });
    var desc = groups.map(function (g) { return g.label + ': ' + U.TYPES.map(function (x, k) { return U.NAMES[x] + ' ' + g.texts[k]; }).join(', '); }).join('; ');
    U.groupedBars($('storyChart'), groups, 100, { step: 25, suffix: '%', title: 'Share of randomly sampled charts with a collapsing colour pair, by chart kind and type of colour vision', desc: desc });
  }
  function animate() {
    if (U.reduced()) return;
    sec.classList.add('sum-anim'); sec.classList.remove('sum-in');
    var box = $('storyChart');
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { sec.classList.add('sum-in'); o.disconnect(); } }); }, { threshold: .3 });
      o.observe(box);
    } else sec.classList.add('sum-in');
  }
  window.addEventListener('resize', function () { clearTimeout(window.__stRz); window.__stRz = setTimeout(function () { if (sec.classList.contains('active')) summary(); }, 180); });
  build();
  if (window.TTE_APP) TTE_APP.onShow(function (id) { if (id === 'charts') { summary(); animate(); observe(); } });
})();
