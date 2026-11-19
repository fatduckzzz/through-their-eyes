/* fx.js: cursor light, card spotlight, colour-bar chapter wipe. Nothing here is needed to read the site;
   it is all skipped for reduced motion and on touch screens. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  /* ---- card spotlight: the card under the pointer gets --mx/--my ---- */
  var CARD = '.vcard,.paper-card,.numc,.pal-card,.audit-panel,.sc-sticky,.wall-summary,.prev-box,.labcard,.cncard,.brow,.vmessage,.feedback,.ev-bridge,.source-panel,.method-row,.cnstat,.checklist,.case-composite,.csstage,.trello-card';
  if (!reduce && !coarse) {
    var lx = 0, ly = 0, raf = 0;
    document.addEventListener('pointermove', function (e) {
      lx = e.clientX; ly = e.clientY;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        var c = e.target.closest && e.target.closest(CARD);
        if (c) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (lx - r.left) + 'px'); c.style.setProperty('--my', (ly - r.top) + 'px'); }
      });
    }, { passive: true });
  }

  /* ---- chapter wipe: five colour bars sweep across when the story changes chapter ---- */
  var GROUP = { hero: 'intro', choose: 'prologue', brief: 'prologue', w: 'prologue', b: 'prologue', c: 'prologue', f: 'prologue', e: 'prologue',
                m: 'prologue', g: 'prologue', t: 'prologue', sunset: 'prologue', flamingo: 'prologue', twist: 'people', evidence: 'numbers',
                charts: 'charts', voices: 'people', lab: 'fix', wins: 'fix', palette: 'palette', done: 'epilogue' };
  if (!reduce) {
    var wipe = document.createElement('div'); wipe.id = 'fxWipe'; wipe.setAttribute('aria-hidden', 'true');
    wipe.innerHTML = '<i style="--n:0"></i><i style="--n:1"></i><i style="--n:2"></i><i style="--n:3"></i><i style="--n:4"></i>';
    document.body.appendChild(wipe);
    var last = 'intro', busy = false;
    if (window.TTE_APP) TTE_APP.onShow(function (id) {
      var g = GROUP[id] || 'intro';
      if (g !== last && !busy) {
        busy = true; wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go');
        setTimeout(function () { wipe.classList.remove('go'); busy = false; }, 1300);
      }
      last = g;
    });
  }
})();
