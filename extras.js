/* extras.js: the "viral clip" explainer on the cure screen, and the "keep digging" tiles. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- clip explainer: 0 flat scene, 1 glasses arrive, 2 glasses on, 3 end ---- */
  var clip = document.getElementById('clipDemo');
  if (clip) {
    var sub = document.getElementById('clipSub'), timers = [];
    var SUB = ['Everything looks a little flat…', 'A friend hands over a pair of glasses.', 'Put them on.', 'And that is where most clips end.'];
    function setStep(n) {
      clip.setAttribute('data-step', String(n));
      if (sub) sub.textContent = SUB[n];
      [].forEach.call(clip.querySelectorAll('.clip-steps li'), function (li) { li.classList.toggle('on', +li.getAttribute('data-s') === n); });
    }
    function play() {
      timers.forEach(clearTimeout); timers = [];
      if (reduce) { setStep(3); return; }
      setStep(0);
      timers.push(setTimeout(function () { setStep(1); }, 1700));
      timers.push(setTimeout(function () { setStep(2); }, 3500));
      timers.push(setTimeout(function () { setStep(3); }, 5600));
    }
    var rb = document.getElementById('clipReplay'); if (rb) rb.addEventListener('click', play);
    if (window.TTE_APP) TTE_APP.onShow(function (id) { if (id === 'twist') play(); else timers.forEach(clearTimeout); });
    setStep(reduce ? 3 : 0);
  }

  /* ---- keep digging: one panel open at a time ---- */
  var dig = document.querySelector('.dig');
  if (dig) {
    dig.addEventListener('click', function (e) {
      var t = e.target.closest('.dig-tile[data-panel]'); if (!t) return;
      var name = t.getAttribute('data-panel'), panel = dig.querySelector('.dig-panel[data-for="' + name + '"]');
      var open = !panel.hidden;
      [].forEach.call(dig.querySelectorAll('.dig-panel'), function (p) { p.hidden = true; });
      [].forEach.call(dig.querySelectorAll('.dig-tile[data-panel]'), function (b) { b.setAttribute('aria-expanded', 'false'); b.classList.remove('on'); });
      if (!open) {
        panel.hidden = false; t.setAttribute('aria-expanded', 'true'); t.classList.add('on');
        setTimeout(function () { panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); }, 60);
      }
    });
  }

  /* ---- real-world fixes: filter chips by kind ---- */
  var bar = document.getElementById('winsFilter');
  if (bar) {
    var MAP = { 'apps.design': 'Apps', 'settings.apple': 'System', 'npa.go.jp': 'Transport', 'colorbrewer2': 'Data viz', 'w3.org': 'Standards', 'tfl.gov': 'Transport', 'fda.gov': 'Medical', 'ema.europa': 'Medical', 'enchroma': 'Glasses' };
    var cards = [].slice.call(document.querySelectorAll('.wins-band .brow'));
    cards.forEach(function (c) {
      var a = (c.querySelector('.baddr') || {}).textContent || '', cat = c.getAttribute('data-cat');
      if (!cat) Object.keys(MAP).forEach(function (k) { if (a.indexOf(k) >= 0) cat = MAP[k]; });
      c.setAttribute('data-cat', cat || 'Other');
    });
    var cats = ['All']; cards.forEach(function (c) { var k = c.getAttribute('data-cat'); if (cats.indexOf(k) < 0) cats.push(k); });
    bar.innerHTML = cats.map(function (k, i) { return '<button class="wchip" type="button" data-f="' + k + '" aria-pressed="' + (i === 0) + '">' + k + '</button>'; }).join('') + '<div class="wf-count" id="wfCount"></div>';
    function apply(k) {
      var n = 0;
      cards.forEach(function (c) { var show = k === 'All' || c.getAttribute('data-cat') === k; c.hidden = !show; if (show) n++; });
      [].forEach.call(bar.querySelectorAll('.wchip'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === k)); });
      document.getElementById('wfCount').textContent = n + ' of ' + cards.length + ' fixes shown';
    }
    bar.addEventListener('click', function (e) { var b = e.target.closest('.wchip'); if (b) apply(b.getAttribute('data-f')); });
    apply('All');
  }
})();
