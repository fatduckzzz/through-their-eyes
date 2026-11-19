/* Hero: letter-by-letter title, scroll parallax, and the "swap your eyes" wipe slider.
   All motion is skipped under prefers-reduced-motion. */
(function () {
  'use strict';
  var hero = document.getElementById('hero'); if (!hero) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- split the title into animated letters, keeping the <em> ---- */
  var title = document.getElementById('heroTitle');
  function split(el) {
    el.setAttribute('aria-label', el.textContent);
    var n = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'hw';
            tok.split('').forEach(function (ch) {
              var s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', n++);
              s.setAttribute('aria-hidden', 'true'); s.textContent = ch; w.appendChild(s);
            });
            frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
  }
  if (title && !title.querySelector('.ch')) split(title);
  function replay() {
    hero.classList.remove('hero-in'); void hero.offsetWidth; hero.classList.add('hero-in');
  }
  replay();
  if (window.TTE_APP) TTE_APP.onShow(function (id) { if (id === 'hero') replay(); });

  /* ---- parallax: title drifts up and fades, orbs drift slower ---- */
  var ticking = false;
  function frame() {
    ticking = false;
    if (!hero.classList.contains('active')) return;
    var y = window.scrollY, a = document.querySelector('.hero-a'), orbs = hero.querySelector('.orbs');
    if (a) { a.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)'; a.style.opacity = String(Math.max(0, 1 - y / 520)); }
    if (orbs) orbs.style.transform = 'translate3d(0,' + (y * 0.4).toFixed(1) + 'px,0)';
    var iris = hero.querySelector('.iris');
    if (iris) { iris.style.transform = 'translate(-50%,calc(-50% + ' + (y * 0.32).toFixed(1) + 'px)) scale(' + (1 + y / 2600).toFixed(3) + ')'; iris.style.opacity = String(Math.max(0.08, 0.7 - y / 900)); }
  }
  if (!reduce) window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });

  var more = document.getElementById('heroScroll');
  if (more) more.addEventListener('click', function () {
    var t = document.querySelector('.hero-b'); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---- wipe slider: typical vision on the left, deuteranopia on the right ---- */
  var wipe = document.getElementById('wipe'), range = document.getElementById('wipeRange');
  if (wipe && range) {
    function set(p) { p = Math.max(0, Math.min(100, p)); wipe.style.setProperty('--pos', p + '%'); range.value = p; }
    var dragging = false;
    function fromEvent(e) { var r = wipe.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }
    wipe.addEventListener('pointerdown', function (e) { dragging = true; wipe.classList.add('drag'); try { wipe.setPointerCapture(e.pointerId); } catch (x) {} fromEvent(e); });
    wipe.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    ['pointerup', 'pointercancel'].forEach(function (n) { wipe.addEventListener(n, function () { dragging = false; wipe.classList.remove('drag'); }); });
    range.addEventListener('input', function () { set(+range.value); });
    set(100);
    /* first time it scrolls into view, sweep once to show what it does */
    if ('IntersectionObserver' in window && !reduce) {
      var done = false;
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting || done) return; done = true;
          var t0 = performance.now(), from = 100, to = 38;
          (function tick(now) {
            var p = Math.min(1, (now - t0) / 1500), e = 1 - Math.pow(1 - p, 3);
            if (!dragging) set(from + (to - from) * e);
            if (p < 1) requestAnimationFrame(tick);
          })(t0);
        });
      }, { threshold: 0.55 }).observe(wipe);
    } else set(40);
  }
})();
