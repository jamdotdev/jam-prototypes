(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const gridCanvas=$('welcome-grid-canvas');
  const gridRenderer=new window.JamWelcomeGrid(gridCanvas);
  let gridFrameKey='';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const initialDefaults = window.JamDefaults.get('welcome');
  const settings = { ...initialDefaults.settings };
  let keepRotating=initialDefaults.keepRotating,loop=initialDefaults.loop;
  const listeners=new Set();
  const notify=()=>listeners.forEach(listener=>listener());
  const ease = getComputedStyle($('welcome-window')).getPropertyValue('--ease-out').trim();
  // Centers, rotations, and image bounds come directly from Figma's sticker instances.
  const specs = [
    ['square',644.47,348.92,64,64,0,1,-1.488,-1.488,66.9767,68.4651],
    ['star',541.7965,100.574,72.727,80,-5.84,1,-1.818,-1.816,75.7636,84.9625],
    ['diamond',57.034,484.936,50.791,48,-6.87,1,-1.117,-1.118,52.5869,51.2078],
    ['bolt',617.2945,203.567,63.724,72,-11.35,1,-1.281,-2.815,66.0748,78.1868],
    ['play',69.9025,175.948,58.091,72,-10.68,1,0,0,57.6,72],
    ['cursor',181.0675,65.001,78.14,80,-172.63,1,-1.86,-1.864,81.0261,84.88],
    ['hexagon',356.3695,40.9255,75.349,81.86,6.82,1,.927,0,72.9754,80],
    ['selection',27.6755,319.117,55.356,54.72,6.78,1,-1.273,-1.273,57.596,58.4882],
    ['yellow',611.8095,500.612,47.814,48,.17,-1,-1.114,-1.118,50.0467,51.3488],
    ['red',517.69,610,48,48,0,-1,-1.118,-1.118,50.2326,51.3488],
    ['squiggle',170.155,616.281,56.93,47.442,0,1,-1.116,-1.115,58.7409,50.4237],
    ['play-small',362.305,664.01,39.628,49.116,-11.48,-1,0,0,39.293,49.1163],
  ];
  const stickers = specs.map(([name,x,y,w,h,rotation,flip,left,top,iw,ih]) => {
    const el = document.createElement('div');
    el.className = 'welcome-sticker'; el.style.width = `${w}px`; el.style.height = `${h}px`;
    const pop = document.createElement('div'); pop.className = 'welcome-sticker-pop';
    const img = document.createElement('img'); img.alt = ''; img.draggable = false;
    img.src = `assets/welcome/sticker-${name}.svg`;
    Object.assign(img.style,{left:`${left}px`,top:`${top}px`,width:`${iw}px`,height:`${ih}px`});
    pop.append(img); el.append(pop); $('welcome-stickers').append(el);
    return { name,el,pop,x:x-338.2334,y:y-344.5,w,h,rotation,flip };
  });
  const ordered = [...stickers].sort((a,b) => ((Math.atan2(a.y,a.x)+Math.PI*2.5)%(Math.PI*2))-((Math.atan2(b.y,b.x)+Math.PI*2.5)%(Math.PI*2)));
  let animations = [], elapsed = 0, total = 2000, frame = 0, last = 0, driftAngle = 0;
  let active = false, playing = false, playRequested = false, rate = initialDefaults.rate, loaded = false;
  let schedule = {};
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  // The same strong ease-out as the WAAPI entrance, sampled once per orbit frame.
  function easeOut(value) {
    const x=clamp(value,0,1); if(x===0||x===1) return x; let low=0,high=1,t=x;
    for(let i=0;i<14;i++) { const u=1-t; const bx=3*u*u*t*.23+3*u*t*t*.32+t*t*t; if(bx<x) low=t; else high=t; t=(low+high)/2; }
    return 1-Math.pow(1-t,3);
  }
  function addAnimation(el,frames,delay,duration) {
    const animation=el.animate(frames,{delay,duration,easing:ease,fill:'both'});
    animation.pause(); animations.push(animation);
  }
  function buildSequence() {
    animations.forEach(animation=>animation.cancel()); animations=[];
    const gentle=reduce.matches;
    const horizontalDelay=gentle ? Math.min(settings.hDelay*.15,120) : settings.hDelay;
    const horizontalDuration=gentle ? Math.min(settings.hDuration,120) : settings.hDuration;
    const verticalDuration=gentle ? Math.min(settings.vDuration,120) : settings.vDuration;
    const stickerStart=gentle ? 20 : 80;
    const logoStart=gentle ? stickerStart+120 : stickerStart+Math.max(670,11*settings.stagger+220);
    const footerStart=logoStart+(gentle ? 150 : 530);
    const ctaStart=footerStart+(gentle ? 50 : 120);
    const contentEnd=ctaStart+(gentle ? 120 : 350);
    // Both grid passes follow the complete welcome entrance, even when their timing overlaps.
    const gridStart=contentEnd+(gentle ? 20 : 80);
    const horizontalStart=gridStart+horizontalDelay;
    const verticalOffset=gentle ? clamp(settings.vDelay*.15,-100,150) : settings.vDelay;
    const verticalStart=Math.max(gridStart,horizontalStart+verticalOffset);
    schedule={
      horizontal:horizontalStart,horizontalDuration,vertical:verticalStart,verticalDuration,
      stickers:stickerStart,logo:logoStart,
      title:logoStart+(gentle ? 50 : 150),tagline:logoStart+(gentle ? 100 : 270),
      footer:footerStart,cta:ctaStart,contentEnd,
    };
    total=Math.max(horizontalStart+horizontalDuration,verticalStart+verticalDuration);
    ordered.forEach((sticker,i)=>addAnimation(sticker.pop,gentle ? [{opacity:0},{opacity:1}] : [
      {opacity:0,transform:'scale(.9) rotate(-18deg)'},
      {opacity:1,transform:'scale(1) rotate(0deg)'},
    ],stickerStart+(gentle ? 0 : i*settings.stagger),gentle ? 100 : 650));
    const enter=(id,delay,dy,scale=1)=>addAnimation($(id),gentle ? [{opacity:0},{opacity:1}] : [
      {opacity:0,transform:`translateY(${dy}px) scale(${scale})`},
      {opacity:1,transform:'translateY(0) scale(1)'},
    ],delay,gentle ? 120 : 350);
    enter('welcome-app-icon',schedule.logo,8,.95);
    enter('welcome-heading',schedule.title,8);
    enter('welcome-tagline',schedule.tagline,6);
    enter('welcome-footer',schedule.footer,8);
    enter('welcome-continue',schedule.cta,6,.96);
    synchronize(); renderOrbit(); renderGrid(); notify();
  }
  function synchronize() {
    animations.forEach(animation=>{
      animation.pause(); animation.playbackRate=rate; animation.currentTime=Math.min(elapsed,total);
      // Native WAAPI play() rewinds finished animations; keep completed content at rest.
      if(playing && active && !document.hidden && elapsed<animation.effect.getComputedTiming().endTime) animation.play();
    });
  }
  function renderGrid() {
    const hProgress=clamp((elapsed-schedule.horizontal)/schedule.horizontalDuration,0,1);
    const vProgress=clamp((elapsed-schedule.vertical)/schedule.verticalDuration,0,1);
    const key=[hProgress,vProgress,settings.gridStyle,settings.gridAmount,settings.gridSoftness,settings.hOpacity,settings.vOpacity,reduce.matches].join('|');
    if(key===gridFrameKey) return;
    gridFrameKey=key;
    // Finish on the original CSS grid. A short crossfade avoids a rasterization seam.
    const blend=progress=>{
      if(reduce.matches) return easeOut(progress);
      const t=clamp((progress-.88)/.12,0,1);
      return t*t*(3-2*t);
    };
    const hBlend=blend(hProgress),vBlend=blend(vProgress);
    $('welcome-grid-horizontal').style.opacity=settings.hOpacity/100*hBlend;
    $('welcome-grid-vertical').style.opacity=settings.vOpacity/100*vBlend;
    gridCanvas.hidden=reduce.matches||(hProgress<=0&&vProgress<=0)||(hProgress>=1&&vProgress>=1);
    if(!gridCanvas.hidden) gridRenderer.render({
      hProgress,vProgress,style:settings.gridStyle,amount:settings.gridAmount,softness:settings.gridSoftness,
      hOpacity:settings.hOpacity/100*(1-hBlend),vOpacity:settings.vOpacity/100*(1-vBlend),reducedMotion:false,
    });
  }
  const orbitProgress=()=>Math.max(0,elapsed-schedule.stickers)/1600;
  function renderOrbit() {
    const angle=reduce.matches ? 0 : -settings.turn*(1-easeOut(orbitProgress()))+driftAngle;
    const radians=angle*Math.PI/180, cos=Math.cos(radians),sin=Math.sin(radians);
    stickers.forEach(sticker=>{
      const x=sticker.x*cos-sticker.y*sin,y=sticker.x*sin+sticker.y*cos;
      const originalDepth=clamp((sticker.y/344.5+1)/2,0,1);
      const currentDepth=clamp((y/344.5+1)/2,0,1);
      const perspective=(1-settings.depth/100*currentDepth)/(1-.35*originalDepth);
      const px=350+x*settings.orbit/100-sticker.w/2,py=320+y*settings.orbit/100-sticker.h/2;
      sticker.pose={x:px+sticker.w/2,y:py+sticker.h/2,rotation:sticker.rotation+angle,scale:perspective};
      sticker.el.style.transform=`translate(${px}px,${py}px) rotate(${sticker.rotation+angle}deg) scale(${perspective},${perspective*sticker.flip})`;
    });
  }
  function getStatus() {
    const horizontalActive=elapsed>=schedule.horizontal && elapsed<schedule.horizontal+schedule.horizontalDuration;
    const verticalActive=elapsed>=schedule.vertical && elapsed<schedule.vertical+schedule.verticalDuration;
    if(reduce.matches) return 'Reduced motion';
    if(horizontalActive&&verticalActive) return 'Grid settling';
    if(horizontalActive) return 'Horizontal lines';
    if(verticalActive) return 'Vertical lines';
    return elapsed>=total ? 'Ready' : elapsed>=schedule.contentEnd ? 'Grid next' : elapsed>=schedule.cta ? 'Call to action' : elapsed>=schedule.footer ? 'Footer' : elapsed>=schedule.tagline ? 'Tagline' : elapsed>=schedule.title ? 'Title' : elapsed>=schedule.logo ? 'Jam icon' : elapsed>=schedule.stickers ? 'Stickers' : 'Starting';
  }
  function getPlayerState() {
    return {playing,time:Math.min(elapsed,total)/1000,duration:total/1000,rate,loop,ready:loaded,status:loaded?getStatus():'Loading artwork',reducedMotion:reduce.matches};
  }
  function getSettings() { return {settings:{...settings},rate,keepRotating,loop}; }
  function tick(now) {
    frame=0;
    if(!playing || !active || document.hidden) return;
    const dt=last ? Math.min(now-last,100)*rate : 0; last=now; elapsed+=dt;
    if(!reduce.matches && keepRotating) driftAngle+=settings.drift*dt/1000*easeOut(orbitProgress());
    if(elapsed>total+1600 && loop && !reduce.matches) { elapsed=0; driftAngle=0; synchronize(); }
    renderOrbit(); renderGrid(); notify();
    if(!canAdvance()) { refreshPlayback(); return; }
    frame=requestAnimationFrame(tick);
  }
  function canAdvance() {
    return elapsed<total || !reduce.matches && (loop || keepRotating && settings.drift>0);
  }
  function refreshPlayback() {
    // Natural completion, image loading, and a hidden tab suspend frames, not playback intent.
    playing=playRequested&&active&&loaded&&!document.hidden&&canAdvance();
    cancelAnimationFrame(frame); frame=0; last=0; synchronize(); notify();
    if(playing) frame=requestAnimationFrame(tick);
  }
  function setPlaying(value) { playRequested=Boolean(value); refreshPlayback(); }
  function replay() { window.JamWelcomeFlow?.reset(false); elapsed=0; driftAngle=0; buildSequence(); setPlaying(true); }
  function replayGrid() {
    if(window.JamWelcomeFlow?.getState().stage!=='welcome') window.JamWelcomeFlow?.reset(false);
    elapsed=Math.min(schedule.horizontal,schedule.vertical);
    renderOrbit(); renderGrid(); setPlaying(true);
  }
  function seek(seconds) { setPlaying(false); elapsed=clamp(Number(seconds)||0,0,total/1000)*1000; driftAngle=0; synchronize(); renderOrbit(); renderGrid(); notify(); }
  function applySettings(patch, markChanged=true) {
    const previous={...settings};
    if(patch.settings) for(const key of Object.keys(settings)) {
      if(!Object.hasOwn(patch.settings,key)) continue;
      const value=patch.settings[key];
      if(key==='gridStyle' ? ['wave','diffusion','magnetize','twist'].includes(value) : Number.isFinite(value)) settings[key]=value;
    }
    if(Number.isFinite(patch.rate)&&patch.rate>0) rate=patch.rate;
    if(typeof patch.keepRotating==='boolean') keepRotating=patch.keepRotating;
    if(typeof patch.loop==='boolean') loop=patch.loop;
    const changed=Object.keys(settings).filter(key=>settings[key]!==previous[key]);
    const atWelcome=!window.JamWelcomeFlow || window.JamWelcomeFlow.getState().stage==='welcome';
    if(atWelcome) {
      const sequenceChanged=schedule.horizontal===undefined||changed.some(key=>key==='stagger'||/^[hv](Delay|Duration|Opacity)$/.test(key));
      if(sequenceChanged) buildSequence();
      if(changed.includes('gridStyle')) replayGrid();
      else {
        if(!sequenceChanged){renderOrbit();renderGrid();}
        refreshPlayback();
      }
    }
    if(markChanged) window.JamDefaults.changed('welcome');
    notify();
  }
  $('welcome-continue').addEventListener('focus',()=>{ if(elapsed<total) seek(total/1000); });
  $('welcome-continue').addEventListener('click',()=>window.JamWelcomeFlow?.start(true));
  reduce.addEventListener('change',()=>{
    if(window.JamWelcomeFlow && window.JamWelcomeFlow.getState().stage!=='welcome') return;
    const progress=Math.min(elapsed/total,1);
    driftAngle=0; buildSequence(); elapsed=progress*total; synchronize(); renderOrbit(); renderGrid(); refreshPlayback();
  });
  document.addEventListener('visibilitychange',refreshPlayback);
  window.JamWelcome={
    setActive(value){
      const wasActive=active;active=Boolean(value);
      if(!active) setPlaying(false);
      else if(!wasActive && (!window.JamWelcomeFlow || window.JamWelcomeFlow.getState().stage==='welcome')) replay();
      window.JamWelcomeFlow?.setActive(active);
    },
    replay,restart:replay,replayGrid,seek,
    getSettings,updateSettings:applySettings,getPlayerState,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    play(){if(!canAdvance()) replay();else setPlaying(true);},
    pause(){setPlaying(false);},
    setRate(value){applySettings({rate:value});},
    setLoop(value){applySettings({loop:Boolean(value)});},
    freezeForHandoff(){
      if(elapsed<total) seek(total/1000);
      setPlaying(false);
      animations.forEach(animation=>animation.cancel()); animations=[];
      renderOrbit(); renderGrid();
      return stickers.map(sticker=>({name:sticker.name,el:sticker.el,pop:sticker.pop,w:sticker.w,h:sticker.h,flip:sticker.flip,...sticker.pose}));
    },
    getState:()=>({active,playing,elapsed,total,driftAngle,reducedMotion:reduce.matches,settings:{...settings}}),
  };
  window.JamPlayground.bindWindowDrag($('welcome-titlebar'));
  window.JamDefaults.register('welcome', {
    groups:['welcome'],read:()=>({welcome:getSettings()}),
    apply({welcome}) {
      applySettings(welcome,false);
      if(!window.JamWelcomeFlow || window.JamWelcomeFlow.getState().stage==='welcome') replay();
    },
  });
  Promise.all([...$('welcome-window').querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))).then(()=>{loaded=true;refreshPlayback();});
})();
