(() => {
  'use strict';
  // Time units are a shared display preference across player screens.
  let timeUnit='ms';
  const icons={play:'<path d="m6 3 9 6-9 6Z" fill="currentColor"/>',pause:'<path d="M6 3v12M12 3v12" stroke="currentColor" stroke-width="3"/>',restart:'<path d="M4 6a6 6 0 1 1-.5 5M4 2v4h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',loop:'<path d="m12 2 3 3-3 3M15 5H6a3 3 0 0 0-3 3m3 8-3-3 3-3m-3 3h9a3 3 0 0 0 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',loopOff:'<path d="m12 2 3 3-3 3M15 5H9M3 8a3 3 0 0 1 .88-2.12M6 16l-3-3 3-3m-3 3h6m5.12-.88A3 3 0 0 0 15 10M2 2l14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'};
  function button(label,icon){const el=document.createElement('button');el.type='button';el.className='pg-icon-button';el.title=label;el.setAttribute('aria-label',label);el.innerHTML=`<svg viewBox="0 0 18 18" aria-hidden="true">${icons[icon]}</svg>`;return el;}
  function mount(host,screen){
    const engine=JamPlaygroundSchema.engine(screen);
    const getState=()=>engine?.getPlayerState()??{playing:false,time:0,duration:0,rate:1,loop:false,ready:false,status:'Interactive preview'};
    const status=document.createElement('span');status.className='pg-player-status';
    const row=document.createElement('div');row.className='pg-player-transport';host.append(row);
    const play=button('Play','play'),restart=button('Restart preview','restart');row.append(play,restart);
    const timeline=document.createElement('div');timeline.className='pg-player-timeline';row.append(timeline);
    const seek=document.createElement('input');seek.type='range';seek.min='0';seek.step='any';seek.className='pg-player-seek';seek.setAttribute('aria-label',screen==='draft'?'Video position':'Animation position');timeline.append(seek,status);
    const readouts=document.createElement('div');readouts.className='pg-player-readouts';row.append(readouts);
    const time=document.createElement('output');time.className='pg-player-time';time.setAttribute('aria-live','off');readouts.append(time);
    const duration=document.createElement('output');duration.className='pg-player-time pg-player-duration';duration.setAttribute('aria-live','off');readouts.append(duration);
    const unit=document.createElement('button');unit.type='button';unit.className='pg-unit-button';readouts.append(unit);
    unit.addEventListener('click',()=>{timeUnit=timeUnit==='ms'?'s':'ms';refresh();});
    const speedHost=document.createElement('div');speedHost.className='pg-player-speed';readouts.append(speedHost);
    const rates=screen==='draft'?[.5,1,1.5,2]:[.5,.75,1,1.5,2];
    const speed=document.createElement('button');speed.type='button';speed.className='pg-speed-button';speedHost.append(speed);
    const nextRate=()=>rates[(rates.indexOf(getState().rate)+1)%rates.length];
    const loop=button(screen==='draft'?'Loop selection':screen==='welcome'?'Loop intro':'Loop preview','loop');loop.classList.add('pg-loop-button');
    loop.innerHTML=`<svg class="pg-loop-on" viewBox="0 0 18 18" aria-hidden="true">${icons.loop}</svg><svg class="pg-loop-off" viewBox="0 0 18 18" aria-hidden="true">${icons.loopOff}</svg>`;
    readouts.append(loop);loop.disabled=!engine;speed.disabled=!engine;
    if(engine){
      speed.addEventListener('click',()=>{engine.setRate(nextRate());refresh();});
      loop.addEventListener('click',()=>{engine.setLoop(!getState().loop);refresh();});
      play.addEventListener('click',()=>getState().playing?engine.pause():engine.play());
      restart.addEventListener('click',()=>engine.restart());
      seek.addEventListener('input',()=>engine.seek(Number(seek.value)));
    }
    let lastRate,lastLoop,lastPlaying,lastReady,lastUnit,lastTimeWidth;
    function refresh(){
      const state=getState();
      if(lastPlaying!==state.playing){lastPlaying=state.playing;play.innerHTML=`<svg viewBox="0 0 18 18" aria-hidden="true">${icons[state.playing?'pause':'play']}</svg>`;play.title=state.playing?'Pause':'Play';play.setAttribute('aria-label',play.title);}
      if(lastReady!==state.ready){lastReady=state.ready;play.disabled=!state.ready;restart.disabled=!state.ready;seek.disabled=!state.ready;}
      seek.min=String(state.start??0);seek.max=String(state.end??state.duration??0);seek.value=String(state.time||0);
      const fraction=(state.time-(state.start??0))/Math.max(.01,Number(seek.max)-Number(seek.min));seek.style.setProperty('--range-fill',`${Math.max(0,Math.min(1,fraction))*100}%`);
      const format=value=>timeUnit==='ms'?String(Math.round((value||0)*1000)):(value||0).toFixed(3);
      time.textContent=format(state.time);duration.textContent=format(state.end??state.duration);
      const timeWidth=`${Math.max(4,duration.textContent.length)}ch`;
      if(lastTimeWidth!==timeWidth){lastTimeWidth=timeWidth;readouts.style.setProperty('--pg-time-digits',timeWidth);}
      time.setAttribute('aria-label',`Current time: ${time.textContent} ${timeUnit}`);
      duration.setAttribute('aria-label',`Duration: ${duration.textContent} ${timeUnit}`);
      seek.setAttribute('aria-valuetext',`${time.textContent} of ${duration.textContent} ${timeUnit}`);
      if(lastUnit!==timeUnit){lastUnit=timeUnit;unit.textContent=timeUnit;unit.title=`Switch to ${timeUnit==='ms'?'seconds':'milliseconds'}`;unit.setAttribute('aria-label',`Time unit: ${timeUnit}. ${unit.title}`);}
      status.textContent=state.reducedMotion?'Reduced motion':state.status||'';
      if(lastRate!==state.rate){lastRate=state.rate;speed.textContent=`${state.rate}x`;speed.title=engine?`Change speed to ${nextRate()}x`:'No timed animation';speed.setAttribute('aria-label',`Playback speed: ${state.rate}x. ${speed.title}`);}
      if(lastLoop!==state.loop){lastLoop=state.loop;loop.setAttribute('aria-pressed',String(!!state.loop));loop.title=!engine?'No timed animation to loop':state.loop?'Turn loop off':'Turn loop on';}
    }
    refresh();return {refresh,destroy(){host.replaceChildren();}};
  }
  window.JamPlaygroundPlayer={mount};
})();
