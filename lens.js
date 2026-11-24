/* Page lens: a small control that filters the whole site through one type of colour vision.
   The filter goes on <main> and the top bars (never on the control itself), so fixed elements keep working. */
(function () {
  'use strict';
  var root = document.getElementById('lens'); if (!root) return;
  var NAMES = { off: 'As designed', protan: 'Protanopia', deutan: 'Deuteranopia', tritan: 'Tritanopia', achro: 'Achromatopsia' };
  var tog = root.querySelector('.lens-toggle'), panel = root.querySelector('.lens-panel'),
      live = root.querySelector('.lens-live'), cur = root.querySelector('.lens-cur');
  function set(v) {
    if (v === 'off') document.body.removeAttribute('data-lens'); else document.body.setAttribute('data-lens', v);
    [].forEach.call(panel.querySelectorAll('[data-lens]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lens') === v)); });
    cur.textContent = v === 'off' ? '' : NAMES[v];
    root.classList.toggle('on', v !== 'off');
    live.textContent = v === 'off' ? 'Page lens off' : 'Page lens: ' + NAMES[v];
  }
  function open(o) { panel.hidden = !o; tog.setAttribute('aria-expanded', String(o)); root.classList.toggle('open', o); }
  tog.addEventListener('click', function () { open(panel.hidden); });
  panel.addEventListener('click', function (e) { var b = e.target.closest('[data-lens]'); if (b) set(b.getAttribute('data-lens')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { open(false); tog.focus(); } });
  document.addEventListener('click', function (e) { if (!root.contains(e.target)) open(false); });
  set('off');
  window.TTE_LENS = { set: set };
})();
