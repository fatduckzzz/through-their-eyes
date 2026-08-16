(function(){
  /* 默认中文。被试全在国内，而对照站是 <html lang="zh-CN"> 的中文站——
     两组的默认语言若不一致，语言本身就成了组间差异。右上角的切换保留。 */
  var LANG='zh';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var html=document.documentElement, body=document.body;
  function t(key){ return (I18N[LANG] && I18N[LANG][key]!=null) ? I18N[LANG][key] : (I18N.en[key]||''); }
  function tv(base){ var k=base+'.'+state.type; return (I18N.en[k]!=null) ? t(k) : t(base); }

  function applyLang(){
    html.setAttribute('lang',LANG);
    document.querySelectorAll('[data-i]').forEach(function(el){ el.textContent=t(el.getAttribute('data-i')); });
    document.querySelectorAll('[data-i-html]').forEach(function(el){ el.innerHTML=t(el.getAttribute('data-i-html')); });
    document.querySelectorAll('[data-i-svg]').forEach(function(el){ el.textContent=t(el.getAttribute('data-i-svg')); });
    document.querySelectorAll('[data-ph]').forEach(function(el){ el.setAttribute('placeholder',t(el.getAttribute('data-ph'))); });
    document.querySelectorAll('.labcap').forEach(function(el){
      var on=el.closest('.labcard').classList.contains('fixed');
      el.textContent=t(el.getAttribute('data-cap')+(on?'.on':'.off'));
    });
    var act=document.querySelector('.screen.active');
    if(act) act.querySelectorAll('.tw').forEach(function(el){ el.textContent=t(el.getAttribute('data-i-tw')); el.classList.add('done'); });
    updateVisionBadge();
    document.querySelectorAll('#langtoggle button').forEach(function(b){ b.classList.toggle('on',b.getAttribute('data-lang')===LANG); });
  }
  document.getElementById('langtoggle').addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return; LANG=b.getAttribute('data-lang'); applyLang();
  });

  var hud=document.getElementById('hud'), prog=document.getElementById('prog');
  var order=['hero','choose','brief','w','b','c','f','e','m','g','t','sunset','flamingo','twist','voices','lab','wins','evidence','methods','bibliography','done'];
  var state={type:null,hidden:false,baseline:5,post:5,confidence:null,moment:null,open:"",recorded:false,
             shirt:null,frictions:0,correct:0,guesses:0,openedUp:null};
  var twTimer=null;

  function runTypewriter(scope){
    var el=scope.querySelector('.tw'); if(!el) return;
    var txt=t(el.getAttribute('data-i-tw'));
    el.classList.remove('done'); el.textContent="";
    var i=0; clearInterval(twTimer);
    twTimer=setInterval(function(){
      i+=2; el.textContent=txt.slice(0,i);
      if(i>=txt.length){ el.textContent=txt; el.classList.add('done'); clearInterval(twTimer); }
    },24);
  }
  function qnavGroup(id){
    if(['lab'].indexOf(id)>=0) return 'fixes';
    if(['wins'].indexOf(id)>=0) return 'cases';
    if(['evidence','methods','bibliography'].indexOf(id)>=0) return 'research';
    return 'experience';
  }
  function updateQuicknav(id){
    var group=qnavGroup(id);
    document.querySelectorAll('#quicknav .qnav-btn').forEach(function(b){
      b.classList.toggle('active',b.getAttribute('data-qnav')===group);
    });
  }
  function show(id){
    var cur=document.querySelector('.screen.active'); if(cur) cur.classList.remove('active');
    var el=document.getElementById(id); el.classList.add('active'); window.scrollTo(0,0);
    hud.classList.toggle('show',el.getAttribute('data-hud')==='1');
    if(el.hasAttribute('data-chapter')) document.getElementById('hudChapter').textContent=t(el.getAttribute('data-chapter'));
    if(el.hasAttribute('data-clock')) document.getElementById('hudClock').textContent=el.getAttribute('data-clock');
    var idx=order.indexOf(id); if(idx>=0) prog.style.width=((idx/(order.length-1))*100).toFixed(1)+'%';
    el.querySelectorAll('svg').forEach(function(s){ try{ if(s.setCurrentTime) s.setCurrentTime(0); }catch(e){} });
    runTypewriter(el);
    updateQuicknav(id);
    if(id==='sunset') prepSunset();
    if(id==='twist') setTimeout(animateTwist,120);
    /* 单页切屏时 IntersectionObserver 只看得到当前这一屏，
       这里补记一次，保证 sectionsSeen 覆盖真实的浏览路径 */
    if(window.TTE) TTE.seen(id);
  }
  document.querySelectorAll('[data-go]').forEach(function(b){ b.addEventListener('click',function(){ show(b.getAttribute('data-go')); }); });
  updateQuicknav('hero');

  function addFriction(n){ state.frictions+=n; document.getElementById('hudFr').textContent=state.frictions; }

  /* baseline/post survey sliders removed */

  var TYPEKEY={deutan:'t.deutan.name',protan:'t.protan.name',tritan:'t.tritan.name',achro:'t.achro.name',normal:'lab.p.normal'};
  function typeName(tp){ return t(TYPEKEY[tp]||'lab.p.normal'); }
  function updateVisionBadge(){
    var v=document.getElementById('hudVision'); if(!state.type){ v.textContent=t('hud.vision')+'\u2014'; return; }
    v.textContent=t('hud.vision')+((state.hidden&&!body.classList.contains('eyes-open'))?t('hud.hidden'):typeName(state.type));
  }
  function setVision(type,hiddenMode){
    state.type=type; if(hiddenMode!==undefined) state.hidden=hiddenMode;
    body.setAttribute('data-vision',type); updateVisionBadge();
    document.querySelectorAll('#visionPills .pill').forEach(function(p){p.classList.toggle('sel',p.getAttribute('data-v')===type);});
  }

  /* 分配 ≠ 切换。

     记进完成码的必须是**一开始分配到的那一种**，只写一次。
     无障碍实验室那一节允许来回切换视角（"也试试别的眼睛"），那是材料的
     一部分、要保留；但它走的也是 setVision，早先把 TTE.set 写在 setVision
     里，于是被试在实验室里点一下"全色盲"，完成码里记录的分配类型就被改成
     了全色盲。问卷 M1 问的是"系统为您分配的类型"，两边就对不上了，随机化
     的均衡性检查也就无从做起。 */
  var ASSIGNED = null;
  function assign(type,hiddenMode){
    ASSIGNED = type;
    setVision(type,hiddenMode);
    if(window.TTE) TTE.set('cvdType', type);   // 记入完成码，供随机化均衡性检查
  }

  /* ------------------------------------------------------------------
     Study mode — ?study=1

     公开版让访问者自选 CVD 类型，这在实验条件下不行：类型会变成组间
     比较的混杂变量。加上 ?study=1 后，页面跳过自选、直接均匀随机分配
     一种类型，并保留「揭晓」这一叙事装置（它属于体验的一部分，不是
     混杂因素）。

     注意公开版的 surprise 按钮用的是患病率加权（deutan 55% / protan 30%
     / tritan 10% / achro 5%）。那对科普是对的，对实验不对：achro 只会
     分到 5% 的人，按 n≈70 算不足 4 人，任何按类型分层的分析都做不了。
     所以 study 模式改用均匀分配。
     ------------------------------------------------------------------ */
  var STUDY_MODE = /[?&]study=1/.test(location.search);
  var TYPES = ['deutan','protan','tritan','achro'];

  function randomType(uniform){
    if(uniform) return TYPES[Math.floor(Math.random()*TYPES.length)];
    var r=Math.random();
    if(r<0.55) return 'deutan';
    if(r<0.85) return 'protan';
    if(r<0.95) return 'tritan';
    return 'achro';
  }

  /* study 模式下真的关掉自选。

     这里原本只把 randomType 的分布换成均匀，四张自选卡片照样能点——注释
     写着"跳过自选"，其实没实现。被试自己挑类型，"随机分配"这个说法就不
     成立，类型重新变回混杂变量，而问卷 M1 记到的会是"他自己选的"。 */
  if(STUDY_MODE){
    document.getElementById('choose').classList.add('assigned-only');
    var ll=document.querySelector('#choose .lede'); if(ll) ll.setAttribute('data-i','choose.lede.study');
    var sb=document.getElementById('surpriseBtn'); if(sb) sb.setAttribute('data-i','choose.surprise.study');
  }
  document.querySelectorAll('.vcard').forEach(function(c){ c.addEventListener('click',function(){
    if(STUDY_MODE) return;                       // 自选在实验条件下是混杂变量
    assign(c.getAttribute('data-type'),false); show('brief');
  }); });
  document.getElementById('surpriseBtn').addEventListener('click',function(){
    assign(randomType(STUDY_MODE), true); show('brief');
  });
  /* 实验室里的切换只改当前显示，不动已记录的分配类型 */
  document.getElementById('visionPills').addEventListener('click',function(e){
    var p=e.target.closest('.pill'); if(!p) return; state.hidden=false; setVision(p.getAttribute('data-v'));
  });


  /* 把场景答题表现记进完成码。

     这三处一直在数（页面结尾还把数字显示给被试看），却从没上报，
     于是「被试有没有真的在判断」这个最直接的行为证据被扔掉了：
     阅读时长只能说明页面开着，答对了几道才说明人在读、在判断。 */
  function reportScenes(){
    if(!window.TTE) return;
    TTE.set('correct', state.correct);
    TTE.set('guesses', state.guesses);
  }

  ['b','c','e','m','g','t'].forEach(function(sid){
    var sc=document.getElementById(sid); var choices=[].slice.call(sc.querySelectorAll('.choice'));
    choices.forEach(function(ch){
      ch.addEventListener('click',function(){
        if(sc.dataset.answered) return; sc.dataset.answered='1';
        var ok=ch.getAttribute('data-correct')==='1';
        state.guesses++; if(ok) state.correct++; else addFriction(1); reportScenes();
        choices.forEach(function(o){o.classList.add('dim');}); ch.classList.remove('dim'); ch.classList.add('picked');
        var fb=document.getElementById('fb-'+sid);
        var extra=(sid==='m'&&state.shirt==='pink')?t('fb.m.pink'):'';
        fb.innerHTML=tv('fb.'+sid+(ok?'.ok':'.no'))+extra; fb.classList.remove('hidden');
        setTimeout(function(){document.getElementById('dc-'+sid).classList.remove('hidden');},450);
        setTimeout(function(){sc.querySelector('.next').classList.remove('hidden');},750);
      });
    });
  });

  (function(){
    var sc=document.getElementById('w'); var choices=[].slice.call(sc.querySelectorAll('.choice'));
    choices.forEach(function(ch){
      ch.addEventListener('click',function(){
        if(sc.dataset.answered) return; sc.dataset.answered='1';
        var k=ch.getAttribute('data-k'); state.shirt=k; state.guesses++;
        if(k==='grey') state.correct++; else addFriction(1); reportScenes();
        choices.forEach(function(o){o.classList.add('dim');}); ch.classList.remove('dim'); ch.classList.add('picked');
        var fb=document.getElementById('fb-w'); fb.innerHTML=tv('fb.w.'+k); fb.classList.remove('hidden');
        setTimeout(function(){document.getElementById('dc-w').classList.remove('hidden');},450);
        setTimeout(function(){sc.querySelector('.next').classList.remove('hidden');},750);
      });
    });
  })();

  (function(){
    var sc=document.getElementById('f'); var fields=[].slice.call(sc.querySelectorAll('.field'));
    fields.forEach(function(fl){
      fl.addEventListener('click',function(){
        if(sc.dataset.answered) return; sc.dataset.answered='1';
        var ok=fl.classList.contains('err'); state.guesses++; addFriction(1); if(ok) state.correct++; reportScenes();
        fields.forEach(function(o){o.style.pointerEvents='none';o.style.opacity=.55;});
        fl.style.opacity=1; fl.style.borderColor='var(--gold)';
        var fb=document.getElementById('fb-f'); fb.innerHTML=tv(ok?'f.fb.ok':'f.fb.no'); fb.classList.remove('hidden');
        document.getElementById('dlg-f-text').textContent=t('f.dlg.start');
        setTimeout(function(){document.getElementById('dlg-f').classList.remove('hidden');},600);
      });
    });
    document.getElementById('rep-f').addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b) return; state.openedUp=b.getAttribute('data-r');
      document.getElementById('dlg-f-text').textContent=t(state.openedUp==='truth'?'f.dlg.truth':'f.dlg.laugh');
      this.remove();
      setTimeout(function(){document.getElementById('dc-f').classList.remove('hidden');},450);
      setTimeout(function(){document.getElementById('f').querySelector('.next').classList.remove('hidden');},750);
    });
  })();

  function prepSunset(){
    document.getElementById('dayStats').innerHTML=t('sun.stats').replace('{F}','<b>'+state.frictions+'</b>').replace('{C}','<b>'+state.correct+'</b>').replace('{G}','<b>'+state.guesses+'</b>');
  }
  document.getElementById('openEyes').addEventListener('click',function(){
    body.classList.add('eyes-open'); this.classList.add('hidden');
    var note=document.getElementById('revealNote');
    if(state.hidden){ note.textContent=t('sun.note.hidden').replace('{TYPE}',typeName(state.type)); updateVisionBadge(); }
    else note.textContent=t('sun.note.known');
    note.classList.remove('hidden');
    setTimeout(function(){document.getElementById('toFlamingo').classList.remove('hidden');},1400);
  });

  function animateTwist(){ document.querySelectorAll('#twist .twbar i').forEach(function(i){ i.style.width=i.getAttribute('data-w')+'%'; }); }

  document.querySelectorAll('.switch').forEach(function(sw){
    sw.addEventListener('click',function(){
      var card=document.getElementById(sw.getAttribute('data-lab')); var on=sw.classList.toggle('on');
      card.classList.toggle('fixed',on);
      var cap=card.querySelector('.labcap'); cap.textContent=t(cap.getAttribute('data-cap')+(on?'.on':'.off'));
    });
  });

  /* ---------- colour-vision palette simulator (replaces the survey) ---------- */
    /* 配色工具已移出，独立成站：
     https://github.com/fatduckzzz/through-their-eyes-palette
     那边还加了图片上传后的问题定位分析。 */

document.getElementById('restartBtn').addEventListener('click',function(){ location.reload(); });

  /* status markers on the wins/gaps cards — the section practises the site's own
     rule: never colour alone. Each badge carries a shape (✓ / ▲), a word and a
     colour, so it reads even to the eyes this whole page is about. */
  (function(){
    document.querySelectorAll('.wins-band .bento .brow, .gaps-band .bento .brow').forEach(function(card){
      var meta=card.querySelector('.bmeta'), tag=meta&&meta.querySelector('.tag');
      if(!meta||!tag||meta.querySelector('.bstatus')) return;
      var gap=!!card.closest('.gaps-band');
      var b=document.createElement('span');
      b.className='bstatus '+(gap?'gap':'win');
      b.setAttribute('data-i',gap?'wins.status.gap':'wins.status.win');
      var row=document.createElement('div'); row.className='btagrow';
      tag.parentNode.insertBefore(row,tag); row.appendChild(tag); row.appendChild(b);
    });
  })();

  applyLang();
})();
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* preloader: count to 100, then reveal */
  var loader=document.getElementById('loader');
  if(loader){
    var bar=loader.querySelector('.lbar i'), pct=loader.querySelector('.lpct');
    var dur=reduce?260:1250, t0=null, last=-1, finished=false;
    function finishLoad(){
      if(finished) return; finished=true;
      loader.classList.add('done');
      var hero=document.getElementById('hero');
      if(hero && hero.classList.contains('active') && !reduce){
        hero.classList.remove('active'); void hero.offsetWidth; hero.classList.add('active');
      }
      setTimeout(function(){ loader.style.display='none'; }, 950);
    }
    function step(now){
      if(t0===null) t0=now;
      var k=Math.min(1,(now-t0)/dur);
      var eased=1-Math.pow(1-k,2);
      var v=Math.round(eased*100);
      if(v!==last){ last=v; if(pct)pct.textContent=v+'%'; if(bar)bar.style.width=v+'%'; }
      if(k<1) requestAnimationFrame(step); else finishLoad();
    }
    requestAnimationFrame(step);
    setTimeout(finishLoad, 3200); /* safety net */
  }

  /* ambient flowing colour field */
  var cv=document.getElementById('ambient');
  if(cv && cv.getContext && !reduce){
    var ctx=cv.getContext('2d'), W=2, H=2, scale=0.42;
    function resize(){ W=cv.width=Math.max(2,Math.floor(innerWidth*scale)); H=cv.height=Math.max(2,Math.floor(innerHeight*scale)); }
    resize(); addEventListener('resize',resize);
    var hues=[6,30,140,178,210,266], blobs=[];
    for(var i=0;i<6;i++){ blobs.push({h:hues[i], ax:Math.random()*6.283, ay:Math.random()*6.283, sx:.10+Math.random()*.10, sy:.09+Math.random()*.10, r:.48+Math.random()*.34}); }
    var tt=0;
    function frame(){
      tt+=0.0022;
      ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation='lighter';
      for(var i=0;i<blobs.length;i++){ var b=blobs[i];
        var x=(0.5+0.43*Math.sin(b.ax+tt*b.sx*6.283))*W;
        var y=(0.5+0.43*Math.cos(b.ay+tt*b.sy*6.283))*H;
        var rad=b.r*Math.min(W,H);
        var hue=(b.h+tt*20)%360;
        var g=ctx.createRadialGradient(x,y,0,x,y,rad);
        g.addColorStop(0,'hsla('+hue+',85%,58%,0.40)');
        g.addColorStop(1,'hsla('+hue+',85%,58%,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,rad,0,6.2832); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* hero cursor-follow glow */
  var hero=document.getElementById('hero');
  if(hero && !reduce){
    hero.addEventListener('pointermove',function(e){
      var r=hero.getBoundingClientRect();
      hero.style.setProperty('--mx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
      hero.style.setProperty('--my',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
    });
  }
})();

/* ======================================================================
   FANCY-UP EFFECTS — fully additive, self-contained. Does not touch the
   original interaction logic above; only listens for clicks/movement and
   layers visuals on top. Everything here respects prefers-reduced-motion.
   ====================================================================== */
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // every effect below is purely decorative — skip entirely

  /* ---------- custom cursor ---------- */
  var dot = document.getElementById('cursorDot'), ring = document.getElementById('cursorRing');
  if (dot && ring && matchMedia('(pointer:fine)').matches) {
    document.body.classList.add('cursor-on');
    var rx = 0, ry = 0, tx = 0, ty = 0;
    window.addEventListener('mousemove', function(e){
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%)';
    });
    (function loop(){
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a,button,.choice,.field,input[type=range],.switch').forEach(function(el){
      el.addEventListener('mouseenter', function(){ ring.classList.add('is-big'); });
      el.addEventListener('mouseleave', function(){ ring.classList.remove('is-big'); });
    });
  }

  /* Pointer-driven effects below (magnetic hover, 3D tilt) are meaningless on a
     touch screen: mousemove only fires on tap, so the element lurches once and
     then sticks. Click ripples and scroll reveal further down stay enabled. */
  var finePointer = !window.matchMedia ||
    (matchMedia('(hover:hover)').matches && matchMedia('(pointer:fine)').matches);

  /* ---------- magnetic hover ---------- */
  function magnetize(selector, strength){
    if(!finePointer) return;
    document.querySelectorAll(selector).forEach(function(el){
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var mgx = (e.clientX - r.left - r.width/2) / (r.width/2);
        var mgy = (e.clientY - r.top - r.height/2) / (r.height/2);
        el.style.setProperty('--mgx', (mgx*strength).toFixed(1)+'px');
        el.style.setProperty('--mgy', (mgy*strength).toFixed(1)+'px');
      });
      el.addEventListener('mouseleave', function(){
        el.style.setProperty('--mgx','0px'); el.style.setProperty('--mgy','0px');
      });
    });
  }
  magnetize('.btn', 7);
  magnetize('.choice', 6);
  magnetize('.vcard', 5);
  magnetize('.brow', 5);

  /* ---------- 3D tilt on scene illustrations ---------- */
  if(finePointer) document.querySelectorAll('.scene .stage').forEach(function(stage){
    var box = stage.querySelector('.world, .formworld');
    if(!box) return;
    stage.addEventListener('mousemove', function(e){
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left)/r.width, py = (e.clientY - r.top)/r.height;
      box.style.setProperty('--ry', ((px-0.5)*7).toFixed(2)+'deg');
      box.style.setProperty('--rx', ((0.5-py)*5).toFixed(2)+'deg');
    });
    stage.addEventListener('mouseleave', function(){
      box.style.setProperty('--ry','0deg'); box.style.setProperty('--rx','0deg');
    });
  });

  /* ---------- click ripple on buttons & choices ---------- */
  document.querySelectorAll('.btn, .choice').forEach(function(el){ el.classList.add('ripple-host'); });
  document.addEventListener('click', function(e){
    var host = e.target.closest('.ripple-host');
    if(!host) return;
    var r = host.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 1.4;
    var sp = document.createElement('span');
    sp.className = 'ripple';
    sp.style.width = sp.style.height = size + 'px';
    sp.style.left = (e.clientX - r.left - size/2) + 'px';
    sp.style.top = (e.clientY - r.top - size/2) + 'px';
    host.appendChild(sp);
    setTimeout(function(){ sp.remove(); }, 650);
  });

  /* ---------- sparkle burst on correct guesses ---------- */
  document.addEventListener('click', function(e){
    var ch = e.target.closest('.choice[data-correct]');
    if(!ch || ch.getAttribute('data-correct') !== '1') return;
    var burst = document.createElement('div');
    burst.className = 'sparkle-burst';
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('i');
      var ang = Math.random()*6.283, dist = 26 + Math.random()*30;
      s.style.setProperty('--sx', (Math.cos(ang)*dist).toFixed(0)+'px');
      s.style.setProperty('--sy', (Math.sin(ang)*dist).toFixed(0)+'px');
      s.style.animationDelay = (Math.random()*0.12).toFixed(2)+'s';
      burst.appendChild(s);
    }
    ch.style.position = ch.style.position || 'relative';
    ch.appendChild(burst);
    setTimeout(function(){ burst.remove(); }, 1100);
  });

  /* ---------- scene wipe + HUD sun-arc, fired alongside the original show() ---------- */
  var wipe = null; /* scene-wipe removed */
  var sunDot = document.getElementById('sunDot'), arcFill = document.querySelector('#sunarc .arcfill');
  function clockPct(hhmm){
    var p = hhmm.split(':'); var mins = (+p[0])*60 + (+p[1]);
    var pct = (mins - 420) / (1140 - 420); // 07:00 -> 19:00 window
    return Math.max(0, Math.min(1, pct));
  }
  function updateSunArc(pct){
    if (sunDot) sunDot.style.offsetDistance = (pct*100).toFixed(1)+'%';
    if (arcFill) arcFill.style.strokeDashoffset = (64*(1-pct)).toFixed(1);
  }
  document.querySelectorAll('[data-go]').forEach(function(b){
    b.addEventListener('click', function(){
      var targetId = b.getAttribute('data-go');
      var target = document.getElementById(targetId);
      /* rainbow scene-wipe removed — it flashed full-screen saturated colour
         on every page change, which is an unnecessary photosensitivity risk */
      if (target && target.hasAttribute('data-clock')) {
        updateSunArc(clockPct(target.getAttribute('data-clock')));
      }
      requestAnimationFrame(function(){
        document.querySelectorAll('.screen.active .reveal-on-scroll').forEach(function(el){
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
        });
      });
    });
  });

  /* ---------- scroll-reveal for long sections ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.16 });
    document.querySelectorAll('.reveal-on-scroll').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('.reveal-on-scroll').forEach(function(el){ el.classList.add('in'); });
  }

  /* ---------- grouped before/after case studies ---------- */
  (function(){
    var cs = document.getElementById('caseStudies');
    if (!cs) return;
    var states = cs.querySelectorAll('.csstate');
    var pairs = cs.querySelectorAll('.cspair');
    var vizs = cs.querySelectorAll('.csviz');
    if (!states.length) return;
    function setActive(idx){
      states.forEach(function(s){
        s.classList.toggle('active', parseInt(s.getAttribute('data-step'),10)===idx);
      });
      pairs.forEach(function(p){
        var has = !!p.querySelector('.csstate[data-step="'+idx+'"]');
        p.classList.toggle('active', has);
      });
      vizs.forEach(function(v){ v.classList.toggle('active', parseInt(v.getAttribute('data-step'),10)===idx); });
    }
    states.forEach(function(s){
      s.addEventListener('click', function(){
        setActive(parseInt(s.getAttribute('data-step'),10));
      });
    });
    if ('IntersectionObserver' in window && !reduce) {
      var cio = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (en.isIntersecting) {
            var first = en.target.querySelector('.csstate');
            if (first) setActive(parseInt(first.getAttribute('data-step'),10));
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      pairs.forEach(function(p){ cio.observe(p); });
    } else {
      setActive(0);
    }
  })();

  /* ---------- loader colour-drain flourish ---------- */
  setTimeout(function(){
    var ld = document.getElementById('loader');
    if (ld) ld.classList.add('draining');
  }, 1000);

  /* ======================================================================
     REACT BITS INSPIRED EFFECTS — aurora, counters, spotlight cards,
     scene particles, extended scroll reveal, global click spark.
     All respect prefers-reduced-motion.
     ====================================================================== */

  /* ---------- hero stat counter animation ---------- */
  (function(){
    if (reduce) return;
    var strip = document.querySelector('.stat-strip');
    if (!strip) return;
    var targets = [].slice.call(strip.querySelectorAll('b'));
    if (!targets.length) return;
    var done = false;
    function parseStat(s){
      var frac = s.match(/^(\d+)\/(\d+)(.*)$/);
      if (frac) return {type:'frac', num:parseInt(frac[1],10), denom:parseInt(frac[2],10), suffix:frac[3]};
      var plain = s.match(/^(\d[\d,]*\.?\d*)([^\d.]*)$/);
      if (plain) return {type:'num', num:parseFloat(plain[1].replace(/,/g,'')), suffix:plain[2]};
      return {type:'raw', text:s};
    }
    var stats = targets.map(function(el){ return {el:el, info:parseStat(el.textContent)}; });
    function run(){
      if (done) return; done = true;
      var dur = 1400, start = performance.now();
      stats.forEach(function(s){ s.original = s.el.textContent; });
      function tick(now){
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        stats.forEach(function(s){
          if (s.info.type === 'raw') return;
          if (s.info.type === 'frac'){
            var cur = Math.max(1, Math.round(s.info.num * eased));
            s.el.textContent = cur + '/' + s.info.denom + s.info.suffix;
          } else {
            var cur = s.info.num * eased;
            s.el.textContent = (s.info.num % 1 === 0 ? Math.round(cur) : cur.toFixed(1)) + s.info.suffix;
          }
        });
        if (p < 1) requestAnimationFrame(tick);
        else stats.forEach(function(s){ s.el.textContent = s.original; });
      }
      requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ if (en.isIntersecting) { run(); io.disconnect(); } });
      }, {threshold:0.5});
      io.observe(strip);
    } else {
      run();
    }
  })();

  /* ---------- spotlight gradient on CVD cards ---------- */
  (function(){
    if (reduce) return;
    document.querySelectorAll('.vcard').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        card.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--sy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  })();

  /* ---------- particle background for scenes ---------- */
  (function(){
    if (reduce) return;
    var scenes = [].slice.call(document.querySelectorAll('.scene'));
    if (!scenes.length) return;
    var canvases = [];
    scenes.forEach(function(scene){
      var stage = scene.querySelector('.stage');
      if (!stage) return;
      var cvs = document.createElement('canvas');
      cvs.className = 'scene-particles';
      stage.insertBefore(cvs, stage.firstChild);
      canvases.push({cvs:cvs, ctx:cvs.getContext('2d'), particles:[]});
    });
    function resize(){
      canvases.forEach(function(o){
        var r = o.cvs.getBoundingClientRect();
        o.cvs.width = r.width;
        o.cvs.height = r.height;
      });
    }
    function initParticles(o){
      o.particles = [];
      var count = Math.max(12, Math.floor((o.cvs.width * o.cvs.height) / 25000));
      for (var i = 0; i < count; i++){
        o.particles.push({
          x:Math.random()*o.cvs.width,
          y:Math.random()*o.cvs.height,
          r:.6 + Math.random()*1.2,
          vy:.15 + Math.random()*.25,
          alpha:.15 + Math.random()*.35
        });
      }
    }
    resize();
    canvases.forEach(initParticles);
    window.addEventListener('resize', function(){ resize(); canvases.forEach(initParticles); });
    var running = true;
    function draw(){
      if (!running) return;
      canvases.forEach(function(o){
        var ctx = o.ctx, w = o.cvs.width, h = o.cvs.height;
        ctx.clearRect(0,0,w,h);
        o.particles.forEach(function(p){
          p.y -= p.vy;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random()*w; }
          ctx.beginPath();
          ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.fillStyle = 'rgba(243,239,230,' + p.alpha + ')';
          ctx.fill();
        });
      });
      requestAnimationFrame(draw);
    }
    draw();
    document.addEventListener('visibilitychange', function(){ running = !document.hidden; if (running) draw(); });
  })();

  /* ---------- extend reveal-on-scroll to headings and narrative text ---------- */
  (function(){
    if (reduce) return;
    var selectors = '#choose h2.title, #choose .lede, #choose .choose-note, #brief .narr, .scene .panel h2, .scene .panel .q, #done h2, #done .lede, #lab h2.title, #lab .lede, #wins h2.title, #wins .lede, #ctool h2.title, #evidence h2.title, #evidence .lede, #methods h2.title, #methods .lede, #bibliography h2.title, #bibliography .lede';
    document.querySelectorAll(selectors).forEach(function(el){
      el.classList.add('reveal-on-scroll');
    });
  })();

  /* ---------- global subtle click spark ---------- */
  (function(){
    if (reduce) return;
    var host = document.createElement('div');
    host.className = 'click-spark';
    document.body.appendChild(host);
    var colors = ['var(--gold)','var(--protan)','var(--deutan)','var(--tritan)'];
    document.addEventListener('click', function(e){
      if (e.target.closest('a,button,.choice,.field,input,.switch')) return;
      for (var i = 0; i < 5; i++){
        var s = document.createElement('i');
        var ang = Math.random()*6.283, dist = 18 + Math.random()*22;
        s.style.setProperty('--sx', (Math.cos(ang)*dist).toFixed(0)+'px');
        s.style.setProperty('--sy', (Math.sin(ang)*dist).toFixed(0)+'px');
        s.style.left = e.clientX + 'px';
        s.style.top = e.clientY + 'px';
        s.style.background = colors[Math.floor(Math.random()*colors.length)];
        s.style.animationDelay = (Math.random()*0.08).toFixed(2)+'s';
        host.appendChild(s);
        setTimeout(function(el){ return function(){ el.remove(); }; }(s), 600);
      }
    });
  })();

})();
