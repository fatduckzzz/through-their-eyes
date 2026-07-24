(function(){
  var LANG='en';
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
    if(window.__ctoolRerender) window.__ctoolRerender();
  }
  document.getElementById('langtoggle').addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return; LANG=b.getAttribute('data-lang'); applyLang();
  });

  var hud=document.getElementById('hud'), prog=document.getElementById('prog');
  var order=['hero','choose','brief','w','b','c','f','e','m','g','t','sunset','flamingo','twist','voices','lab','wins','ctool','evidence','methods','bibliography','done'];
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
    if(['ctool'].indexOf(id)>=0) return 'palette';
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
  document.querySelectorAll('.vcard').forEach(function(c){ c.addEventListener('click',function(){ setVision(c.getAttribute('data-type'),false); show('brief'); }); });
  document.getElementById('surpriseBtn').addEventListener('click',function(){
    var r=Math.random(),tp; if(r<0.55)tp='deutan'; else if(r<0.85)tp='protan'; else if(r<0.95)tp='tritan'; else tp='achro';
    setVision(tp,true); show('brief');
  });
  document.getElementById('visionPills').addEventListener('click',function(e){
    var p=e.target.closest('.pill'); if(!p) return; state.hidden=false; setVision(p.getAttribute('data-v'));
  });

  ['b','c','e','m','g','t'].forEach(function(sid){
    var sc=document.getElementById(sid); var choices=[].slice.call(sc.querySelectorAll('.choice'));
    choices.forEach(function(ch){
      ch.addEventListener('click',function(){
        if(sc.dataset.answered) return; sc.dataset.answered='1';
        var ok=ch.getAttribute('data-correct')==='1';
        state.guesses++; if(ok) state.correct++; else addFriction(1);
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
        if(k==='grey') state.correct++; else addFriction(1);
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
        var ok=fl.classList.contains('err'); state.guesses++; addFriction(1); if(ok) state.correct++;
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
  (function(){
    var rowsEl=document.getElementById('ctRows'); if(!rowsEl) return;
    var DEFAULT=['#D81B60','#1E88E5','#FFC107','#004D40'];
    var palette=DEFAULT.slice();

    // sRGB <-> linear
    function s2l(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
    function l2s(c){c=c<=0.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-0.055;return Math.max(0,Math.min(255,Math.round(c*255)));}
    function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(function(x){return x+x;}).join('');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
    function rgb2hex(r){return '#'+r.map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('');}
    // Brettel/Viénot-style simulation matrices (linear RGB) for dichromacy
    var M={
      protan:[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
      deutan:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
      tritan:[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147610],[0.004733,0.691367,0.303900]]
    };
    function simulate(hex,type){
      var rgb=hex2rgb(hex); var lin=[s2l(rgb[0]),s2l(rgb[1]),s2l(rgb[2])]; var m=M[type];
      var out=[0,1,2].map(function(i){return m[i][0]*lin[0]+m[i][1]*lin[1]+m[i][2]*lin[2];});
      return rgb2hex([l2s(out[0]),l2s(out[1]),l2s(out[2])]);
    }

    /* ---------- accessibility check: collision detection + suggested fix ---------- */
    var COLLIDE_DE=12; // CIE76 ΔE below this = "hard to tell apart" in the simulated view
    function rgb2xyz(rgb){
      var lin=[s2l(rgb[0]),s2l(rgb[1]),s2l(rgb[2])];
      return [
        lin[0]*0.4124+lin[1]*0.3576+lin[2]*0.1805,
        lin[0]*0.2126+lin[1]*0.7152+lin[2]*0.0722,
        lin[0]*0.0193+lin[1]*0.1192+lin[2]*0.9505
      ];
    }
    function xyz2lab(xyz){
      var ref=[0.95047,1.0,1.08883];
      var f=xyz.map(function(v,i){ v=v/ref[i]; return v>0.008856?Math.pow(v,1/3):(7.787*v+16/116); });
      return [116*f[1]-16, 500*(f[0]-f[1]), 200*(f[1]-f[2])];
    }
    function hex2lab(hex){ return xyz2lab(rgb2xyz(hex2rgb(hex))); }
    function deltaE(lab1,lab2){
      var dl=lab1[0]-lab2[0], da=lab1[1]-lab2[1], db=lab1[2]-lab2[2];
      return Math.sqrt(dl*dl+da*da+db*db);
    }
    function hex2hsl(hex){
      var rgb=hex2rgb(hex).map(function(v){return v/255;});
      var max=Math.max.apply(null,rgb), min=Math.min.apply(null,rgb);
      var l=(max+min)/2, d=max-min, h=0, s=0;
      if(d!==0){
        s=d/(1-Math.abs(2*l-1));
        if(max===rgb[0]) h=60*(((rgb[1]-rgb[2])/d)%6);
        else if(max===rgb[1]) h=60*((rgb[2]-rgb[0])/d+2);
        else h=60*((rgb[0]-rgb[1])/d+4);
      }
      if(h<0) h+=360;
      return [h,s,l];
    }
    function hsl2hex(h,s,l){
      h=((h%360)+360)%360; s=Math.max(0,Math.min(1,s)); l=Math.max(0,Math.min(1,l));
      var c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2, rgb;
      if(h<60) rgb=[c,x,0]; else if(h<120) rgb=[x,c,0]; else if(h<180) rgb=[0,c,x];
      else if(h<240) rgb=[0,x,c]; else if(h<300) rgb=[x,0,c]; else rgb=[c,0,x];
      return rgb2hex(rgb.map(function(v){ return Math.round((v+m)*255); }));
    }
    function findCollisions(){
      var out=[];
      for(var i=0;i<palette.length;i++){
        for(var j=i+1;j<palette.length;j++){
          ['protan','deutan','tritan'].forEach(function(tp){
            var de=deltaE(hex2lab(simulate(palette[i],tp)), hex2lab(simulate(palette[j],tp)));
            if(de<COLLIDE_DE) out.push({i:i,j:j,type:tp,de:de});
          });
        }
      }
      return out;
    }
    // Heuristic search: rotate hue / shift lightness of colour B until it clears the
    // collision threshold under the given CVD type, while staying as close as possible
    // (true-colour ΔE) to the original B. Not a global optimum — a bounded grid search.
    function suggestFix(hexB,hexA,type){
      var hsl=hex2hsl(hexB);
      var labA=hex2lab(simulate(hexA,type));
      var labOrigB=hex2lab(hexB);
      var hueSteps=[0,20,-20,40,-40,60,-60,90,-90,120,-120,150,-150,180];
      var lSteps=[0,0.12,-0.12,0.22,-0.22,-0.32,0.32];
      var best=null, bestDist=Infinity;
      hueSteps.forEach(function(dh){
        lSteps.forEach(function(dl){
          var cand=hsl2hex(hsl[0]+dh, hsl[1], hsl[2]+dl);
          var deSim=deltaE(hex2lab(simulate(cand,type)),labA);
          if(deSim>=COLLIDE_DE+3){
            var deOrig=deltaE(hex2lab(cand),labOrigB);
            if(deOrig<bestDist){ bestDist=deOrig; best=cand; }
          }
        });
      });
      return best;
    }
    function renderCheck(){
      var el=document.getElementById('ctCheck'); if(!el) return;
      el.innerHTML='';
      var collisions=findCollisions();
      if(collisions.length===0){
        var ok=document.createElement('div'); ok.className='ct-check-ok';
        ok.textContent=t('ct.check.ok');
        el.appendChild(ok);
        return;
      }
      var title=document.createElement('div'); title.className='ct-check-title'; title.textContent=t('ct.check.title');
      el.appendChild(title);
      collisions.forEach(function(c){
        var row=document.createElement('div'); row.className='ct-warn';
        var head=document.createElement('div'); head.className='ct-warn-head';
        var swA=document.createElement('span'); swA.className='sw'; swA.style.background=palette[c.i];
        var swB=document.createElement('span'); swB.className='sw'; swB.style.background=palette[c.j];
        var msg=t('ct.check.row')
          .replace('{a}', palette[c.i].toUpperCase())
          .replace('{b}', palette[c.j].toUpperCase())
          .replace('{type}', t('ct.'+c.type))
          .replace('{de}', c.de.toFixed(1));
        head.appendChild(swA); head.appendChild(swB);
        var txt=document.createElement('span'); txt.textContent=msg;
        head.appendChild(txt);
        row.appendChild(head);

        var fix=suggestFix(palette[c.j], palette[c.i], c.type);
        var fixRow=document.createElement('div'); fixRow.className='ct-warn-fix';
        if(fix){
          var swOld=document.createElement('span'); swOld.className='sw'; swOld.style.background=palette[c.j];
          var arrow=document.createElement('span'); arrow.textContent='→';
          var swNew=document.createElement('span'); swNew.className='sw'; swNew.style.background=fix;
          var suggestTxt=document.createElement('span');
          suggestTxt.textContent=t('ct.check.suggest').replace('{b}', palette[c.j].toUpperCase()).replace('{new}', fix.toUpperCase());
          var applyBtn=document.createElement('button'); applyBtn.className='ct-fixbtn'; applyBtn.textContent=t('ct.check.apply');
          (function(jIdx,newHex){
            applyBtn.addEventListener('click',function(){ palette[jIdx]=newHex; render(); });
          })(c.j, fix);
          fixRow.appendChild(swOld); fixRow.appendChild(arrow); fixRow.appendChild(swNew);
          fixRow.appendChild(suggestTxt); fixRow.appendChild(applyBtn);
        } else {
          var noFix=document.createElement('span'); noFix.textContent=t('ct.check.nofix');
          fixRow.appendChild(noFix);
        }
        row.appendChild(fixRow);
        el.appendChild(row);
      });
    }

    function render(){
      rowsEl.innerHTML='';
      palette.forEach(function(hex,idx){
        var row=document.createElement('div'); row.className='ct-row';
        var swatchTrue=document.createElement('label'); swatchTrue.className='ct-cell ct-pick';
        swatchTrue.style.background=hex;
        var inp=document.createElement('input'); inp.type='color'; inp.value=hex;
        inp.addEventListener('input',function(){palette[idx]=inp.value;render();});
        swatchTrue.appendChild(inp);
        var code=document.createElement('span'); code.className='ct-code'; code.textContent=hex.toUpperCase();
        swatchTrue.appendChild(code);
        if(palette.length>2){
          var del=document.createElement('button'); del.className='ct-del'; del.innerHTML='&times;'; del.title='remove';
          del.addEventListener('click',function(e){e.preventDefault();palette.splice(idx,1);render();});
          swatchTrue.appendChild(del);
        }
        row.appendChild(swatchTrue);
        ['protan','deutan','tritan'].forEach(function(tp){
          var c=document.createElement('div'); c.className='ct-cell'; c.style.background=simulate(hex,tp);
          row.appendChild(c);
        });
        rowsEl.appendChild(row);
      });
      renderCheck();
    }
    document.getElementById('ctAdd').addEventListener('click',function(){
      if(palette.length>=8)return;
      palette.push('#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0')); render();
    });
    document.getElementById('ctReset').addEventListener('click',function(){palette=DEFAULT.slice();render();});
    document.querySelectorAll('.ct-preset').forEach(function(b){
      b.addEventListener('click',function(){palette=b.getAttribute('data-pal').split(',');render();});
    });

    /* ---------- export a plain-text accessibility report ---------- */
    function exportReport(){
      var lines=[];
      lines.push('Through Their Eyes — '+t('ct.check.title'));
      lines.push('');
      lines.push((LANG==='zh'?'配色：':'Palette: ')+palette.map(function(h){return h.toUpperCase();}).join(', '));
      lines.push('');
      var collisions=findCollisions();
      if(collisions.length===0){
        lines.push(t('ct.check.ok'));
      } else {
        collisions.forEach(function(c){
          lines.push('- '+t('ct.check.row')
            .replace('{a}', palette[c.i].toUpperCase())
            .replace('{b}', palette[c.j].toUpperCase())
            .replace('{type}', t('ct.'+c.type))
            .replace('{de}', c.de.toFixed(1)));
          var fix=suggestFix(palette[c.j], palette[c.i], c.type);
          lines.push('  '+(fix
            ? t('ct.check.suggest').replace('{b}', palette[c.j].toUpperCase()).replace('{new}', fix.toUpperCase())
            : t('ct.check.nofix')));
        });
      }
      var blob=new Blob([lines.join('\n')], {type:'text/plain'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a'); a.href=url; a.download='cvd-accessibility-report.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    }
    var exportBtn=document.getElementById('ctExport');
    if(exportBtn) exportBtn.addEventListener('click', exportReport);

    /* ---------- upload-your-own-image simulator (client-side only, nothing leaves the browser) ---------- */
    var IMG_MAXDIM=480;
    var S2L_LUT=(function(){ var a=new Float64Array(256); for(var i=0;i<256;i++) a[i]=s2l(i); return a; })();
    function simulatePixel(r,g,b,type){
      var m=M[type];
      var lin=[S2L_LUT[r],S2L_LUT[g],S2L_LUT[b]];
      return [
        l2s(m[0][0]*lin[0]+m[0][1]*lin[1]+m[0][2]*lin[2]),
        l2s(m[1][0]*lin[0]+m[1][1]*lin[1]+m[1][2]*lin[2]),
        l2s(m[2][0]*lin[0]+m[2][1]*lin[1]+m[2][2]*lin[2])
      ];
    }
    function simulateImageData(srcData){
      var out={};
      ['protan','deutan','tritan'].forEach(function(tp){
        var d=new ImageData(srcData.width, srcData.height);
        d.data.set(srcData.data);
        for(var i=0;i<d.data.length;i+=4){
          var rgb=simulatePixel(d.data[i], d.data[i+1], d.data[i+2], tp);
          d.data[i]=rgb[0]; d.data[i+1]=rgb[1]; d.data[i+2]=rgb[2];
        }
        out[tp]=d;
      });
      return out;
    }
    function renderImgGrid(srcData, sims, w, h){
      var grid=document.getElementById('ctImgGrid'); if(!grid) return;
      grid.innerHTML=''; grid.hidden=false;
      [
        {key:'true', ik:'ct.true', data:srcData},
        {key:'protan', ik:'ct.protan', data:sims.protan},
        {key:'deutan', ik:'ct.deutan', data:sims.deutan},
        {key:'tritan', ik:'ct.tritan', data:sims.tritan}
      ].forEach(function(p){
        var panel=document.createElement('div'); panel.className='ct-img-panel';
        var cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').putImageData(p.data,0,0);
        var lbl=document.createElement('div'); lbl.className='ct-img-panel-lbl';
        var name=document.createElement('span'); name.setAttribute('data-i',p.ik); name.textContent=t(p.ik);
        var dl=document.createElement('a'); dl.className='ct-img-dl'; dl.setAttribute('data-i','ct.img.download'); dl.textContent=t('ct.img.download');
        dl.href=cv.toDataURL('image/png'); dl.download='cvd-'+p.key+'.png';
        lbl.appendChild(name); lbl.appendChild(dl);
        panel.appendChild(cv); panel.appendChild(lbl);
        grid.appendChild(panel);
      });
    }
    function loadImageFile(file){
      var reader=new FileReader();
      reader.onload=function(e){
        var img=new Image();
        img.onload=function(){
          var scale=Math.min(1, IMG_MAXDIM/Math.max(img.naturalWidth,img.naturalHeight));
          var w=Math.max(1,Math.round(img.naturalWidth*scale)), h=Math.max(1,Math.round(img.naturalHeight*scale));
          var srcCanvas=document.createElement('canvas'); srcCanvas.width=w; srcCanvas.height=h;
          var sctx=srcCanvas.getContext('2d'); sctx.drawImage(img,0,0,w,h);
          var srcData=sctx.getImageData(0,0,w,h);
          var sims=simulateImageData(srcData);
          renderImgGrid(srcData, sims, w, h);
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
    }
    var imgInput=document.getElementById('ctImgInput');
    if(imgInput) imgInput.addEventListener('change', function(e){
      var f=e.target.files && e.target.files[0];
      if(f) loadImageFile(f);
    });

    render();
    window.__ctoolRerender=render; // re-run on language switch so ct.check.* text updates
  })();

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

  /* ---------- magnetic hover ---------- */
  function magnetize(selector, strength){
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
  document.querySelectorAll('.scene .stage').forEach(function(stage){
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
