/* Top menu bar: brand, grouped items with hover/focus dropdowns, active-section highlight,
   phone burger. Navigation itself is done by the existing [data-go] handlers in app.js. */
(function () {
  'use strict';
  var nav = document.getElementById('topnav'); if (!nav) return;
  var GROUP = { hero: 'intro', choose: 'prologue', brief: 'prologue', w: 'prologue', b: 'prologue', c: 'prologue', f: 'prologue', e: 'prologue',
                m: 'prologue', g: 'prologue', t: 'prologue', sunset: 'prologue', flamingo: 'prologue', twist: 'people', evidence: 'numbers',
                charts: 'charts', voices: 'people', lab: 'fix', wins: 'fix', palette: 'palette', done: 'epilogue' };
  function setActive(id) {
    var g = GROUP[id] || 'intro';
    [].forEach.call(nav.querySelectorAll('.tn-item'), function (it) { it.classList.toggle('on', it.getAttribute('data-group') === g); });
  }
  function closeAll() {
    nav.classList.remove('open');
    [].forEach.call(nav.querySelectorAll('.tn-item.open'), function (i) { i.classList.remove('open'); i.querySelector('.tn-top').setAttribute('aria-expanded', 'false'); });
    var b = nav.querySelector('.tn-burger'); if (b) b.setAttribute('aria-expanded', 'false');
  }
  nav.addEventListener('click', function (e) {
    var burger = e.target.closest('.tn-burger');
    if (burger) { var o = !nav.classList.contains('open'); nav.classList.toggle('open', o); burger.setAttribute('aria-expanded', String(o)); return; }
    var top = e.target.closest('.tn-top');
    if (top && top.parentNode.classList.contains('has-menu') && !top.hasAttribute('data-go')) {   // touch: tap opens the menu
      var item = top.parentNode, was = item.classList.contains('open');
      [].forEach.call(nav.querySelectorAll('.tn-item.open'), function (i) { i.classList.remove('open'); });
      item.classList.toggle('open', !was); top.setAttribute('aria-expanded', String(!was));
      return;
    }
    if (e.target.closest('[data-go]')) closeAll();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) closeAll(); });
  if (window.TTE_APP) TTE_APP.onShow(setActive);
  setActive('hero');
  window.addEventListener('scroll', function () { nav.classList.toggle('solid', window.scrollY > 24); }, { passive: true });
})();
