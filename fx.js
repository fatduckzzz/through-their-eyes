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


  /* ---- cursor: a dot that sticks to the pointer and a spectrum ring that follows it ----
     Only for mouse and trackpad, off for reduced motion, hidden until the first move, and the
     real cursor comes back over text fields, colour pickers and sliders. */
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var dotEl = document.getElementById('cursorDot'), ringEl = document.getElementById('cursorRing');
  if (!reduce && fine && dotEl && ringEl) {
    var tx = 0, ty = 0, rx = 0, ry = 0, spin = 0, on = false, running = false;
    var NATIVE = 'input,textarea,select,[contenteditable="true"],.ct-pick';
    var HOVER = 'a,button,[role="button"],summary,label,.choice,.field,.wipe,.dig-tile,.vcard,.psimrow,.pal-steps li,input[type=range],input[type=color],.switch';
    function frame() {
      rx += (tx - rx) * 0.2; ry += (ty - ry) * 0.2;
      ringEl.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      if (Math.abs(tx - rx) > 0.15 || Math.abs(ty - ry) > 0.15) requestAnimationFrame(frame); else running = false;
    }
    function show(v) { document.body.classList.toggle('cursor-on', v); on = v; }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      tx = e.clientX; ty = e.clientY;
      dotEl.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
      if (!on) { rx = tx; ry = ty; show(true); }
      var t = e.target, el = t && t.closest ? t : null;
      var native = !!(el && el.closest(NATIVE));
      document.body.classList.toggle('cursor-native', native);
      ringEl.classList.toggle('is-big', !native && !!(el && el.closest(HOVER)));
      if (!running) { running = true; requestAnimationFrame(frame); }
    }, { passive: true });
    document.addEventListener('pointerdown', function () { ringEl.classList.add('is-down'); }, { passive: true });
    document.addEventListener('pointerup', function () { ringEl.classList.remove('is-down'); }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { show(false); });
    window.addEventListener('blur', function () { show(false); });
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
