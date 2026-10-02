(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const root=$('welcome-window'),footer=$('welcome-footer'),cta=$('welcome-continue');
  const message=root.querySelector('.welcome-message');
  const raisedFooterRadius='18px 18px 0px 0px';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const initialDefaults=window.JamDefaults.get('handoff');
  const settings={...initialDefaults.settings};
  let rate=initialDefaults.rate??1,showPath=initialDefaults.showPath,browserMode=initialDefaults.browserMode;
  let loop=initialDefaults.loop??false,permissionRate=1,permissionLoop=false;
  try {const defaults=window.JamDefaults.get('permissions');permissionRate=defaults.rate;permissionLoop=defaults.loop??false;} catch {} // Older shared files migrate on their next save.
  const listeners=new Set();
  const notify=()=>listeners.forEach(listener=>listener());
  const playbackRate=()=>kind==='out'?rate:permissionRate;
  const looping=()=>kind==='out'?loop:permissionLoop;
  const loopHold=600;
  let stage='welcome',kind='out',time=0,total=1900,playing=false,active=false,raf=0;
  let poses=[],cursor=null,animations=[],transportClock=null,pendingReturn=false,actualHandoff=false,browserStatus='';
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
  const easeOut=t=>1-Math.pow(1-clamp(t),3);
  // The Figma artwork points upper-left; its white tip is the flight anchor.
  const pointer={tip:{x:3.7158,y:2.8775},center:{x:39.07,y:40},heading:-131.9497};
  const radians=Math.PI/180;
  const nearestAngle=(from,to)=>from+((to-from+180)%360+360)%360-180;
  let landingTransform='';
  function tipAt(center,rotation,scale){
    const x=(pointer.tip.x-pointer.center.x)*scale,y=(pointer.tip.y-pointer.center.y)*scale;
    const angle=rotation*radians;
    return {x:center.x+x*Math.cos(angle)-y*Math.sin(angle),y:center.y+x*Math.sin(angle)+y*Math.cos(angle)};
  }
  function pointerTransform(point,rotation,scale,roll=0){
    // Roll along the pointer's own axis, keeping the tip and heading fixed in 3D.
    const axis=pointer.heading*radians;
    return `translate(${point.x-pointer.tip.x}px,${point.y-pointer.tip.y}px) rotate(${rotation}deg) rotate3d(${Math.cos(axis)},${Math.sin(axis)},0,${roll}deg) scale(${scale})`;
  }
  root.dataset.flow=stage;

  const permissionCanvas=document.createElement('canvas');
  permissionCanvas.id='permission-grid-canvas';permissionCanvas.hidden=true;permissionCanvas.setAttribute('aria-hidden','true');root.prepend(permissionCanvas);
  const permissionContent=document.createElement('div');
  permissionContent.className='welcome-permission-content';permissionContent.id='welcome-permissions';permissionContent.hidden=true;permissionContent.inert=true;root.append(permissionContent);
  const permissionCTA=document.createElement('button');
  permissionCTA.className='welcome-permission-continue';permissionCTA.id='welcome-permission-continue';permissionCTA.hidden=true;footer.append(permissionCTA);
  const browser=document.createElement('div');
  browser.className='welcome-flow-browser';browser.hidden=true;browser.inert=true;
  browser.innerHTML='<div class="welcome-browser-bar" aria-hidden="true"><span class="welcome-browser-dots"><i></i><i></i><i></i></span><span class="welcome-browser-address"></span></div><div class="welcome-browser-content"><p>Finish signing in to Jam</p><button class="welcome-open-browser" id="welcome-open-browser">Open browser</button></div>';
  footer.append(browser);
  const buddy=document.createElement('div');buddy.className='welcome-buddy';buddy.hidden=true;buddy.setAttribute('aria-hidden','true');buddy.innerHTML='<img src="assets/welcome/sticker-cursor.svg" alt="" draggable="false">';root.append(buddy);
  // This SVG is only a path inspector, never a replacement for a Figma asset.
  const ns='http://www.w3.org/2000/svg';
  const debug=document.createElementNS(ns,'svg');debug.classList.add('welcome-path-debug');debug.setAttribute('viewBox','0 0 700 500');debug.setAttribute('aria-hidden','true');debug.setAttribute('hidden','');
  buddy.style.transformOrigin=`${pointer.tip.x}px ${pointer.tip.y}px`;
  const debugPath=document.createElementNS(ns,'path');debug.append(debugPath);root.append(debug);
  // The inspector follows its toggle, independent of playback, landing, or reduced motion.
  function syncPathVisibility(){debug.toggleAttribute('hidden',!showPath||!debugPath.getAttribute('d'));}

  // The custom easing editor is mounted by the playground presentation layer.
  // Its solver and moving progress marker remain attached to the existing clock.
  const easingHost=document.createElement('div');easingHost.className='welcome-glide-editor';
  const glideEasing=window.JamGlideEasing.mount(easingHost,{value:initialDefaults.easing,onChange:()=>{
    refreshExitMotion();window.JamDefaults.changed('handoff');notify();
  }});
  const onboardingScreens=['welcome','waiting','permissions','onboarding'];

  window.JamPermissions.mount(permissionContent,permissionCTA,{onContinue:()=>{window.JamPlayground.setSurface('onboarding');}});
  function setStage(next){
    stage=next;root.dataset.flow=next;
    root.setAttribute('aria-label',next==='permissions'?'Permissions onboarding':next==='welcome'?'Welcome screen':'Browser sign-in');
    document.dispatchEvent(new CustomEvent('welcomeflowchange',{detail:{stage}}));
    notify();
  }
  function cancelAnimations(){animations.forEach(a=>a.cancel());animations=[];transportClock=null;}
  function animate(el,frames,delay,duration,easing='cubic-bezier(.23,1,.32,1)'){
    const a=el.animate(frames,{delay,duration,easing,fill:'both'});a.pause();a.playbackRate=playbackRate();a.currentTime=time;animations.push(a);return a;
  }
  function readClock(){
    const position=transportClock?.currentTime;
    if(typeof position==='number'&&Number.isFinite(position))time=clamp(position,0,total);
  }
  function buildClock(){
    // A visual-free WAAPI clock includes the settling pause and shares the document timeline.
    transportClock=animate(root,[],0,total+loopHold,'linear');
  }
  function sync(){
    animations.forEach(a=>{a.pause();a.playbackRate=playbackRate();a.currentTime=time;if(playing&&active&&!document.hidden&&time<a.effect.getComputedTiming().endTime)a.play();});
    updateGlideProgress();notify();
  }
  function updateGlideProgress(){
    glideEasing.setProgress(reduced.matches?clamp(time/total):kind==='out'?clamp((time-settings.wiggleDelay-settings.wiggle-130)/settings.glide):1);
  }
  function refreshExitMotion(){
    if(stage!=='exiting'&&stage!=='waiting')return;
    readClock();const fraction=clamp(time/total),settled=stage==='waiting';
    buildExit();time=fraction*total;run();
    if(settled) buddy.hidden=reduced.matches;
  }
  function getSettings(){return {settings:{...settings},easing:glideEasing.getValue(),showPath,browserMode,rate,loop};}
  function updateSettings(patch,markChanged=true){
    readClock();
    let motionChanged=false;
    if(patch.settings) for(const key of Object.keys(settings)){
      if(!Object.hasOwn(patch.settings,key))continue;
      const value=patch.settings[key];
      if(key==='flip'?typeof value!=='boolean':!Number.isFinite(value))continue;
      if(settings[key]!==value){settings[key]=value;motionChanged=true;}
    }
    if(Array.isArray(patch.easing)){
      const previous=glideEasing.getValue();glideEasing.setValue(patch.easing);
      motionChanged ||= glideEasing.getValue().some((value,index)=>value!==previous[index]);
    }
    if(typeof patch.showPath==='boolean')showPath=patch.showPath;
    if(['auto','popup'].includes(patch.browserMode))browserMode=patch.browserMode;
    if(Number.isFinite(patch.rate)&&patch.rate>0)rate=patch.rate;
    if(typeof patch.loop==='boolean')loop=patch.loop;
    if(motionChanged)refreshExitMotion();else run();
    syncPathVisibility();
    if(markChanged)window.JamDefaults.changed('handoff');
    notify();
  }
  function getPermissionSettings(){return {rate:permissionRate,loop:permissionLoop};}
  function updatePermissionSettings(patch,markChanged=true){
    readClock();
    if(Number.isFinite(patch.rate)&&patch.rate>0)permissionRate=patch.rate;
    if(typeof patch.loop==='boolean')permissionLoop=patch.loop;
    run();
    if(markChanged)window.JamDefaults.changed('permissions');
    notify();
  }
  function getStatus(){
    const handoff=actualHandoff&&(stage==='exiting'||stage==='waiting');
    const detail=handoff?({opening:'Opening browser…',waiting:'Waiting for browser',blocked:'Browser didn’t open. Try Open browser.',closed:'Browser closed. Open it again.',unavailable:'Couldn’t open browser. Try again.'})[browserStatus]:'';
    return detail||({welcome:'Welcome',exiting:'Heading to browser',waiting:'Waiting for browser',returning:'Back to Jam',permissions:'Permissions'})[stage];
  }
  function getPlayerState(){
    return {playing:playing&&active&&!document.hidden,time:stage==='welcome'?0:time/1000,duration:stage==='welcome'?0:total/1000,rate:playbackRate(),loop:looping(),ready:stage!=='welcome'&&Boolean(cursor),status:getStatus(),reducedMotion:reduced.matches};
  }
  function bezierPoint(points,t){
    const work=points.map(point=>({...point}));
    for(let count=work.length-1;count>0;count--){
      for(let i=0;i<count;i++){
        work[i].x+=(work[i+1].x-work[i].x)*t;
        work[i].y+=(work[i+1].y-work[i].y)*t;
      }
    }
    return work[0];
  }
  function smoothFlightSegment(start,end,departure,arrival){
    const offset=(point,velocity,amount)=>({x:point.x+velocity.x*amount,y:point.y+velocity.y*amount});
    // Collinear, evenly spaced endpoint controls give zero endpoint curvature.
    const points=[start,offset(start,departure,.2),offset(start,departure,.4),offset(end,arrival,-.4),offset(end,arrival,-.2),end];
    const derivative=points.slice(1).map((point,i)=>({x:5*(point.x-points[i].x),y:5*(point.y-points[i].y)}));
    return t=>({point:bezierPoint(points,t),tangent:bezierPoint(derivative,t)});
  }
  function browserLandingTarget(footerMotion,browserMotion){
    const motions=[footerMotion,browserMotion],times=motions.map(motion=>motion.currentTime);
    try{
      // Measure the letter in the settled layout, even when rebuilding a paused entrance.
      motions.forEach(motion=>{motion.currentTime=motion.effect.getComputedTiming().endTime;});
      const bounds=root.getBoundingClientRect();
      if(!bounds.width||!bounds.height)return {x:310.836,y:304.25};
      const label=$('welcome-open-browser').firstChild,range=document.createRange();
      range.setStart(label,0);range.setEnd(label,1);
      const letter=range.getBoundingClientRect();
      return {x:(letter.left+letter.width/2-bounds.left)*root.offsetWidth/bounds.width,y:(letter.top+letter.height/2-bounds.top)*root.offsetHeight/bounds.height};
    }finally{motions.forEach((motion,index)=>{motion.currentTime=times[index];});}
  }
  function flight(target){
    // Keep even the smallest arc broad enough for a rounded lower turn.
    const extent=.7+.3*settings.arc/100;
    const initialRotation=nearestAngle(cursor.rotation,Math.atan2(-40,230)/radians-pointer.heading);
    const start=tipAt(cursor,initialRotation,cursor.scale),end={x:284.3835648,y:340.5382777};
    const dx=target.x-end.x,dy=target.y-end.y,distance=Math.hypot(dx,dy)||1;
    const finalRotation=Math.atan2(dy,dx)/radians-pointer.heading;
    const middle={x:375,y:220};
    const departure={x:650*extent,y:-650*40/230*extent};
    const crossing={x:-680*extent,y:150*extent};
    const arrival={x:dx/distance*340*extent,y:dy/distance*340*extent};
    // Share velocity and zero acceleration at the join: no sudden change in bend.
    const upper=smoothFlightSegment(start,middle,departure,crossing);
    const lower=smoothFlightSegment(middle,end,crossing,arrival);
    function sampleParameter(t){
      const {point,tangent}=t<.5?upper(t*2):lower((t-.5)*2);
      return {point,rotation:Math.atan2(tangent.y,tangent.x)/radians-pointer.heading};
    }
    // SVG supports cubic paths; short Hermite spans accurately trace the quintics.
    let guide=`M${start.x},${start.y}`;
    for(const segment of [upper,lower]){
      for(let i=0;i<32;i++){
        const from=segment(i/32),to=segment((i+1)/32),step=1/96;
        guide+=` C${from.point.x+from.tangent.x*step},${from.point.y+from.tangent.y*step} ${to.point.x-to.tangent.x*step},${to.point.y-to.tangent.y*step} ${to.point.x},${to.point.y}`;
      }
    }
    debugPath.setAttribute('d',guide);syncPathVisibility();
    // Easing controls distance travelled, so the two bends do not add speed changes.
    const lengths=[0],segments=400;let previous=start;
    for(let i=1;i<=segments;i++){
      const point=sampleParameter(i/segments).point;
      lengths.push(lengths[i-1]+Math.hypot(point.x-previous.x,point.y-previous.y));previous=point;
    }
    return {initialRotation,end,finalRotation,sample(progress){
      const distance=clamp(progress)*lengths[segments];let low=0,high=segments;
      while(high-low>1){const middle=(low+high)>>1;if(lengths[middle]<distance)low=middle;else high=middle;}
      const fraction=(distance-lengths[low])/(lengths[high]-lengths[low]||1);
      return sampleParameter((low+fraction)/segments);
    }};
  }
  function buildExit(){
    cancelAnimations();const gentle=reduced.matches;
    const wiggleStart=settings.wiggleDelay,wiggleEnd=wiggleStart+settings.wiggle;
    const liftStart=gentle?0:160,liftDuration=gentle?160:720,flyStart=gentle?0:wiggleEnd+130;
    total=gentle?200:Math.max(liftStart+liftDuration,flyStart+settings.glide)+120;
    const fade=gentle?140:300;
    animate(message,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:gentle?'none':'translateY(-8px)'}],0,fade);
    for(const pose of poses){
      if(pose.name==='cursor'){pose.el.style.opacity='0';continue;}
      const x=pose.x-350,y=pose.y-320,len=Math.hypot(x,y)||1;
      const transform=(dx,dy,turn)=>`translate(${pose.x-pose.w/2+dx}px,${pose.y-pose.h/2+dy}px) rotate(${pose.rotation+turn}deg) scale(${pose.scale},${pose.scale*pose.flip})`;
      animate(pose.el,gentle?[{opacity:1},{opacity:0}]:[{opacity:1,transform:transform(0,0,0)},{opacity:0,transform:transform(x/len*settings.fan,y/len*settings.fan,8)}],0,gentle?140:520);
    }
    // Corner rounding shares the slide's clock and easing, including pause and scrubbing.
    const footerMotion=animate(footer,gentle?[{transform:'translateY(-402px)',borderRadius:raisedFooterRadius,opacity:0},{transform:'translateY(-402px)',borderRadius:raisedFooterRadius,opacity:1}]:[{transform:'translateY(0)',borderRadius:'0px'},{transform:'translateY(-402px)',borderRadius:raisedFooterRadius}],liftStart,liftDuration,'cubic-bezier(.32,.72,0,1)');
    const browserMotion=animate(browser,[{opacity:0,transform:gentle?'none':'translateY(12px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],gentle?0:liftStart+200,gentle?140:420);
    buddy.hidden=gentle;
    const path=flight(browserLandingTarget(footerMotion,browserMotion));
    landingTransform=pointerTransform(path.end,path.finalRotation,.388,settings.flip?180:0);
    if(!gentle){
      const frames=[],steps=Math.ceil(total/(1000/120));let rotation=cursor.rotation;
      const samples=[...new Set([...Array.from({length:steps+1},(_,i)=>i/steps*total),wiggleStart,wiggleEnd,flyStart,flyStart+settings.glide])].sort((a,b)=>a-b);
      for(const ms of samples){
        const wiggleT=clamp((ms-wiggleStart)/settings.wiggle),p=glideEasing.ease(clamp((ms-flyStart)/settings.glide));
        const wiggle=ms>=wiggleStart&&ms<wiggleEnd?Math.sin(wiggleT*Math.PI*5)*9*Math.sin(wiggleT*Math.PI):0;
        const scale=cursor.scale+(.388-cursor.scale)*easeOut(p);
        let point;
        if(ms<flyStart){
          // Finish the wiggle, then face the first tangent before leaving the orbit.
          rotation=cursor.rotation+wiggle+(path.initialRotation-cursor.rotation)*smooth((ms-wiggleEnd)/130);
          point=tipAt(cursor,rotation,scale);
        }else{
          const sample=path.sample(p);point=sample.point;
          rotation=nearestAngle(rotation,sample.rotation);
        }
        const roll=settings.flip?180*smooth((p-.66)/.34):0;
        frames.push({offset:ms/total,opacity:1,transform:pointerTransform(point,rotation,scale,roll)});
      }
      landingTransform=frames[frames.length-1].transform;
      animate(buddy,frames,0,total,'linear');
    }
    buildClock();sync();
  }
  function buildReturn(){
    // Persist known exit endpoints without commitStyles(), which requires rendered targets.
    poses.forEach(pose=>{pose.el.style.opacity='0';});
    message.hidden=true;message.style.opacity='0';
    footer.style.transform='translateY(-402px)';footer.style.opacity='1';
    browser.style.opacity='1';browser.style.transform='translateY(0) scale(1)';
    cta.style.opacity='1';buddy.style.opacity='1';
    buddy.style.transform=landingTransform;
    cancelAnimations();const gentle=reduced.matches;total=gentle?200:880;buddy.hidden=gentle;
    animate(browser,[{opacity:1},{opacity:0}],0,gentle?100:180);
    animate(buddy,[{opacity:1},{opacity:0}],0,gentle?100:140);
    animate(cta,[{opacity:1},{opacity:0}],0,100);
    animate(footer,gentle?[{transform:'translateY(0)',borderRadius:'0px',opacity:0},{transform:'translateY(0)',borderRadius:'0px',opacity:1}]:[{transform:'translateY(-402px)',borderRadius:raisedFooterRadius},{transform:'translateY(0)',borderRadius:'0px'}],0,gentle?160:680,'cubic-bezier(.32,.72,0,1)');
    animate(permissionContent.querySelector('.permission-header'),[{opacity:0,transform:gentle?'none':'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],gentle?0:160,gentle?140:300);
    permissionContent.querySelectorAll('.permission-row').forEach((row,i)=>animate(row,[{opacity:0,transform:gentle?'none':'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],gentle?0:240+i*65,gentle?140:300));
    animate(permissionCTA,[{opacity:0},{opacity:1}],gentle?0:570,gentle?140:180);buildClock();sync();
  }
  function preparePlaybackState(){
    const outgoing=kind==='out';
    message.hidden=!outgoing;message.inert=true;
    browser.hidden=false;browser.inert=true;
    cta.hidden=false;cta.disabled=true;buddy.hidden=reduced.matches;
    permissionContent.hidden=outgoing;permissionCanvas.hidden=outgoing;permissionCTA.hidden=outgoing;
    window.JamPermissions.setActive(false);permissionContent.inert=true;permissionCTA.disabled=true;
    window.JamPermissionGrid?.setActive(false);$('welcome-grid-reveal').hidden=!outgoing;
  }
  function finish(focusHeading=true){
    playing=false;time=total;sync();
    if(kind==='out'){
      setStage('waiting');browser.inert=!active;message.inert=true;message.hidden=true;
      if(pendingReturn)returnToApp();
    }else{
      setStage('permissions');window.JamPermissions.setActive(active);window.JamPermissionGrid?.setActive(active);
      permissionContent.querySelector('h2')?.setAttribute('tabindex','-1');if(focusHeading&&active&&!document.hidden)permissionContent.querySelector('h2')?.focus({preventScroll:true});
      browser.hidden=true;browser.inert=true;cta.hidden=true;buddy.hidden=true;
    }
  }
  function tick(){raf=0;if(!playing||!active||document.hidden)return;readClock();
    updateGlideProgress();notify();
    if(time>=total){
      // Only the local preview repeats; a real browser handoff finishes normally.
      if(looping()&&!actualHandoff&&!pendingReturn&&!reduced.matches){
        if(transportClock.currentTime>=total+loopHold){restart();return;}
      }else{finish();return;}
    }
    raf=requestAnimationFrame(tick);
  }
  function run(){cancelAnimationFrame(raf);raf=0;sync();if(playing&&active&&!document.hidden)raf=requestAnimationFrame(tick);}
  function handoffStatus(value){browserStatus=value;notify();}
  function start(launch=false){
    if(stage==='exiting'||stage==='returning')return;
    if(stage!=='welcome')reset(false);
    poses=window.JamWelcome.freezeForHandoff();cursor=poses.find(p=>p.name==='cursor');
    pendingReturn=false;actualHandoff=launch;browserStatus='';time=0;kind='out';playing=true;
    setStage('exiting');preparePlaybackState();
    buildExit();run();
    if(launch)window.JamBrowserHandoff.start({mode:browserMode,onComplete:()=>{pendingReturn=true;if(stage==='waiting')returnToApp();},onStatus:handoffStatus});
  }
  function returnToApp(){
    if(stage!=='exiting'&&stage!=='waiting')return;
    pendingReturn=true;
    if(stage!=='waiting'||!active||document.hidden)return;
    pendingReturn=false;kind='back';time=0;playing=true;setStage('returning');
    window.JamPermissions.setActive(true);window.JamPermissions.reset();
    preparePlaybackState();buildReturn();run();
  }
  function reset(replay=true){
    cancelAnimationFrame(raf);raf=0;playing=false;time=0;pendingReturn=false;actualHandoff=false;browserStatus='';
    window.JamBrowserHandoff.cancel();cancelAnimations();
    poses.forEach(p=>{p.el.style.opacity='';p.el.style.transform='';});poses=[];
    for(const el of [footer,cta,message,browser,buddy,permissionCTA,...permissionContent.querySelectorAll('.permission-header,.permission-row')]){el.style.opacity='';el.style.transform='';}
    cta.disabled=false;cta.hidden=false;message.hidden=false;message.inert=false;browser.hidden=true;browser.inert=true;buddy.hidden=true;
    permissionContent.hidden=true;permissionContent.inert=true;permissionCTA.hidden=true;permissionCanvas.hidden=true;$('welcome-grid-reveal').hidden=false;
    window.JamPermissions.setActive(false);window.JamPermissionGrid?.setActive(false);setStage('welcome');
    glideEasing.setProgress(0);notify();
    if(replay)window.JamWelcome.replay();
  }
  $('welcome-open-browser').addEventListener('click',()=>{
    if(actualHandoff)window.JamBrowserHandoff.reopen();
    else{actualHandoff=true;window.JamBrowserHandoff.start({mode:browserMode,onComplete:()=>{pendingReturn=true;if(stage==='waiting')returnToApp();},onStatus:handoffStatus});}
  });
  function goToScreen(value){
    if(!onboardingScreens.includes(value))return;
    reset(false);
    if(value==='onboarding'){window.JamPlayground.setSurface('onboarding');return;}
    if(window.JamPlayground.getSurface()!=='welcome')window.JamPlayground.setSurface('welcome');
    if(value==='welcome'){window.JamWelcome.replay();return;}
    start(false);playing=false;time=total;sync();finish();
    if(value==='permissions'){returnToApp();playing=false;time=total;sync();finish();}
  }
  function play(){
    if(stage==='welcome'){start(false);return;}
    readClock();
    if(time>=total){restart();return;}
    playing=true;run();
  }
  function pause(){readClock();playing=false;run();}
  function restart(){
    // Replay is local choreography, never a browser launch or permission reset.
    if(stage==='welcome'){start(false);return;}
    readClock();window.JamBrowserHandoff.cancel();actualHandoff=false;pendingReturn=false;
    time=0;playing=true;setStage(kind==='out'?'exiting':'returning');preparePlaybackState();
    if(kind==='out')buildExit();else buildReturn();run();
  }
  function seek(seconds){
    if(stage==='welcome')return;
    playing=false;time=clamp(Number(seconds)||0,0,total/1000)*1000;
    setStage(kind==='out'?'exiting':'returning');preparePlaybackState();
    run();if(time>=total)finish(false);
  }
  function setRate(value){if(kind==='out')updateSettings({rate:value});else updatePermissionSettings({rate:value});}
  function setLoop(value){if(kind==='out')updateSettings({loop:Boolean(value)});else updatePermissionSettings({loop:Boolean(value)});}
  document.addEventListener('visibilitychange',()=>{readClock();if(!document.hidden&&active&&pendingReturn&&stage==='waiting')returnToApp();else run();});
  reduced.addEventListener('change',()=>{
    readClock();const fraction=clamp(time/total),settled=stage==='waiting'||stage==='permissions';
    if(stage==='exiting'||stage==='waiting')buildExit();
    else if(stage==='returning'||stage==='permissions')buildReturn();
    time=fraction*total;run();if(settled)finish(false);
  });
  window.JamWelcomeFlow={
    start,reset,returnToApp,goToScreen,play,pause,restart,seek,setRate,setLoop,
    getSettings,updateSettings,getPermissionSettings,updatePermissionSettings,getPlayerState,
    getEasingElement:()=>easingHost,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    simulateReturn(){window.JamBrowserHandoff.cancel();returnToApp();},
    setActive(value){
      readClock();active=Boolean(value);
      window.JamPermissions.setActive(active&&stage==='permissions');window.JamPermissionGrid?.setActive(active&&stage==='permissions');
      if(stage==='waiting')browser.inert=!active;
      if(active&&pendingReturn&&stage==='waiting')returnToApp();else run();
    },
    getState:()=>({stage,kind,time,total,playing,actualHandoff,pendingReturn,settings:{...settings},glideEasing:glideEasing.getValue()}),
  };
  window.JamDefaults.register('handoff', {
    groups:['handoff'],read:()=>({handoff:getSettings()}),apply:({handoff})=>updateSettings(handoff,false),
  });
})();
