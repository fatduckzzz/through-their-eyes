/* Scene feedback that matches what the person actually picked.
   app.js writes a generic message first; this runs right after and rewrites the parts that
   name a colour, a line or a shirt, so the text can never contradict the choice. */
(function () {
  'use strict';
  var shirt = null;
  function type() { return window.TTE_APP ? TTE_APP.getType() : null; }
  function scene(id) { return document.getElementById(id); }
  function fbOf(sc) { return sc.querySelector('.feedback'); }
  function once(sc) { if (sc.dataset.fx2) return false; sc.dataset.fx2 = '1'; return true; }
  function bindChoices(id, fn) {
    var sc = scene(id); if (!sc) return;
    [].forEach.call(sc.querySelectorAll('.choice'), function (ch, i) {
      ch.addEventListener('click', function () { if (!once(sc)) return; fn(sc, ch, i, ch.getAttribute('data-correct') === '1'); });
    });
  }
  /* wardrobe: remember which shirt, so the presentation scene can refer to it */
  var w = scene('w');
  if (w) [].forEach.call(w.querySelectorAll('.choice'), function (ch) { ch.addEventListener('click', function () { if (!shirt) shirt = ch.getAttribute('data-k'); }); });

  /* presentation: name the bar the person really pointed at; shirt remark only when it applies */
  bindChoices('m', function (sc, ch, i, ok) {
    var fb = fbOf(sc), n = ch.getAttribute('data-name') || 'one', ty = type(), h = fb.innerHTML;
    h = h.replace(/\s*<em>\(Also:[\s\S]*?<\/em>/, '');
    if (!ok) {
      if (ty === 'tritan') h = '<b>You pointed at the ' + n + ' one.</b> Red and green you would usually nail; the pair that blurs for tritan eyes is blue and green.';
      else if (ty !== 'achro') h = h.replace(/the red one/g, 'the ' + n + ' one');
    }
    if (shirt === 'pink') h += ' <em>(Also: two people have now complimented your “bold orchid shirt”. You wore it for the grey.)</em>';
    else if (shirt === 'navy') h += ' <em>(Also: someone complimented your navy shirt. You had been aiming for the grey.)</em>';
    fb.innerHTML = h;
  });

  /* phone cases: say which case was really picked */
  bindChoices('g', function (sc, ch, i, ok) {
    if (ok) return;
    var fb = fbOf(sc), n = ch.getAttribute('data-name') || 'one', ty = type(), h = fb.innerHTML;
    h = h.replace(/dark green/g, 'dark ' + n).replace(/the green case/g, 'the ' + n + ' case').replace(/That’s the green case/g, 'That’s the ' + n + ' case');
    if (ty !== 'tritan' && ty !== 'achro') h = h.replace(/To your eyes today, red, green and brown are triplets holding hands\./, 'To your eyes the dark green and dark brown cases were near-twins, and the red one had gone a muddy olive-brown.');
    fb.innerHTML = h;
  });

  /* metro: A is only on the red line (which passes over blue), C only on blue, B is the green interchange */
  bindChoices('t', function (sc, ch, i, ok) {
    if (ok) return;
    var fb = fbOf(sc), line = ch.getAttribute('data-line') || 'red', ty = type();
    var tail = ' You realise it three stops later, somewhere unfamiliar, phone at 9%.';
    var h;
    if (ty === 'tritan' && line === 'blue') h = '<b>That station is only on the blue line \u2014 the tritan trap.</b> Blue and green both slide toward teal for you, so telling them apart was the hard part.' + tail;
    else if (line === 'red') h = '<b>That station is only on the red line.</b> It passes over the blue line without stopping, so there was never a change of trains there.' + tail;
    else h = '<b>That station is only on the blue line.</b> The change to the green line was back at the big interchange.' + tail;
    fb.innerHTML = h;
  });
})();
