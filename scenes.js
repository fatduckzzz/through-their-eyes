/* Scenes and voices polish:
   - a day rail in the HUD (8 steps; shape, not just colour, marks "now")
   - after answering a scene, hold a button to see it as most people do
   - voices: a line that ties the reader's own day to the voices
   ES5, respects prefers-reduced-motion through the CSS that goes with it. */
(function () {
  'use strict';
  var SC = ['w', 'b', 'c', 'f', 'e', 'm', 'g', 't'];
  var hud = document.getElementById('hud');

  /* ---- day rail ---- */
  var rail = document.createElement('div');
  rail.id = 'dayRail'; rail.setAttribute('role', 'img'); rail.setAttribute('aria-label', 'Scene progress');
  rail.innerHTML = SC.map(function (id) { return '<i data-s="' + id + '"></i>'; }).join('');
  var left = hud && hud.querySelector('.left'); if (left) left.appendChild(rail);
  function setRail(id) {
    var idx = SC.indexOf(id); if (idx < 0) return;
    [].forEach.call(rail.children, function (d, i) { d.className = i < idx ? 'done' : (i === idx ? 'now' : ''); });
    rail.setAttribute('aria-label', 'Scene ' + (idx + 1) + ' of ' + SC.length);
  }

  /* ---- give every answer button an accessible name that does not give the answer away ---- */
  var NOUN = { w: 'Shirt', b: 'Tomato', c: 'Signal light', e: 'Lift button', m: 'Bar', g: 'Phone case', t: 'Station' };
  SC.forEach(function (id) {
    var sc = document.getElementById(id); if (!sc) return;
    var ch = [].slice.call(sc.querySelectorAll('.choice'));
    ch.forEach(function (b, i) {
      if (!(b.getAttribute('aria-label') || b.textContent.trim())) b.setAttribute('aria-label', (NOUN[id] || 'Option') + ' ' + (i + 1) + ' of ' + ch.length);
    });
  });

  /* ---- hold to peek: same scene, typical vision ---- */
  SC.forEach(function (id) {
    var sc = document.getElementById(id); if (!sc) return;
    var world = sc.querySelector('.world'), panel = sc.querySelector('.panel'), fb = sc.querySelector('.feedback');
    if (!world || !panel || !fb) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'peek-btn'; btn.hidden = true;
    btn.innerHTML = '<span class="pk-ic" aria-hidden="true"></span><span>Hold to see it as most people do</span>';
    panel.insertBefore(btn, fb.nextSibling);
    function on() { world.classList.add('peek'); btn.classList.add('held'); }
    function off() { world.classList.remove('peek'); btn.classList.remove('held'); }
    btn.addEventListener('pointerdown', function (e) { on(); try { btn.setPointerCapture(e.pointerId); } catch (x) {} });
    ['pointerup', 'pointercancel', 'blur'].forEach(function (n) { btn.addEventListener(n, off); });
    btn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on(); } });
    btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') off(); });
    function sync() { btn.hidden = fb.classList.contains('hidden'); if (btn.hidden) off(); }
    if ('MutationObserver' in window) new MutationObserver(sync).observe(fb, { attributes: true, attributeFilter: ['class'] });
    sync();
  });

  /* ---- voices: tie the reader's day to the voices ---- */
  function voices() {
    var el = document.getElementById('vYou'); if (!el || !window.TTE_APP || !TTE_APP.getStats) return;
    var s = TTE_APP.getStats();
    if (!s.guesses) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = 'In your one day you ran into <b>' + s.frictions + '</b> ' + (s.frictions === 1 ? 'friction' : 'frictions') + ' and got <b>' + s.correct + ' of ' + s.guesses + '</b> right. The people below get no reset button.';
  }

  if (window.TTE_APP) TTE_APP.onShow(function (id) { setRail(id); if (id === 'voices') voices(); });
})();
