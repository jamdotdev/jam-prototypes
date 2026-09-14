(() => {
  'use strict';
  const root=document.getElementById('recording-window');
  if(!root)return;
  const desktop=document.getElementById('desktop');
  const IDLE_WIDTH=607,ACTIVE_WIDTH=185,LIMIT=1800;
  let W=desktop.clientWidth,H=desktop.clientHeight;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const symbols={close:'xmark',restart:'arrow.counterclockwise',pause:'pause.fill',play:'play.fill',stop:'stop.fill',record:'record.circle',window:'macwindow',area:'rectangle.dashed',display:'display',camera:'video.fill',cameraOff:'video.slash.fill',microphone:'mic.fill',microphoneOff:'mic.slash.fill',resize:'arrow.up.left.and.arrow.down.right',change:'arrow.2.squarepath',logs:'terminal',folder:'folder.fill',clock:'clock',document:'doc',download:'arrow.down.circle',cloud:'icloud',sidebar:'sidebar.left',minus:'minus',zoom:'arrow.up.backward.and.arrow.down.forward',follow:'cursorarrow.motionlines',mirror:'arrow.left.arrow.right',rulers:'lines.measurement.horizontal.aligned.bottom',aspect:'aspectratio',horizontal:'rectangle',vertical:'rectangle.portrait',status:'circle.fill'};
  const icon=name=>`<span class="rb-sf" data-symbol="${symbols[name]}" style="--sf-image:url('assets/recording/sf/${symbols[name]}.png')" aria-hidden="true"></span>`;
  const lights='<div class="traffic-lights" aria-hidden="true"><span class="traffic close">'+icon('close')+'</span><span class="traffic minimize">'+icon('minus')+'</span><span class="traffic zoom">'+icon('zoom')+'</span></div>';
  root.innerHTML=`
    <div class="rb-desktop-windows">
      <article class="rb-mock-window rb-finder" data-window="finder" aria-label="Finder window">
        <header class="rb-window-titlebar" tabindex="0" aria-label="Move Finder window">${lights}<strong>Design files</strong><span class="rb-window-drag-icon">${icon("sidebar")}</span></header>
        <div class="rb-finder-body"><aside><span>Favorites</span><b>${icon("clock")}Recents</b><b class="selected">${icon("document")}Documents</b><b>${icon("download")}Downloads</b><span>iCloud</span><b>${icon("cloud")}iCloud Drive</b></aside><div class="rb-files">${['Brand assets','Design system','Recordings','Feedback'].map((name,i)=>`<div><span class="rb-file-folder">${icon("folder")}</span><span>${name}</span><small>${[12,8,4,6][i]} items</small></div>`).join('')}</div></div>
        <button class="rb-window-selector" aria-label="Select Finder window"><span class="rb-selection-callout">Click to select this window</span></button>
        <button class="rb-window-resizer" aria-label="Resize Finder window">${icon("resize")}</button>
      </article>
      <article class="rb-mock-window rb-browser" data-window="browser" aria-label="Browser window">
        <header class="rb-window-titlebar" tabindex="0" aria-label="Move browser window">${lights}<div class="rb-browser-address">jam.dev / design-system</div><span class="rb-window-drag-icon">${icon("sidebar")}</span></header>
        <div class="rb-browser-content"><div class="rb-browser-nav"><img src="assets/strawberry.svg" alt="Jam"><strong>Design system</strong><span>Foundations</span><span>Components</span></div><div class="rb-design-document"><span class="rb-eyebrow">MADE FOR YOUR TEAM</span><h2>A little more<br>room for ideas.</h2><p>A shared place for everything we’re building.</p><div class="rb-design-cards"><div><img src="assets/welcome/sticker-squiggle.svg" alt=""><span>Make it playful.</span></div><div><img src="assets/welcome/sticker-cursor.svg" alt=""><span>Keep it simple.</span></div><div><img src="assets/welcome/sticker-star.svg" alt=""><span>Make it yours.</span></div></div></div></div>
        <button class="rb-window-selector" aria-label="Select browser window"><span class="rb-selection-app"><img src="assets/recording/chrome.png" alt=""><span class="rb-selection-callout">Click to select this window</span></span></button>
        <button class="rb-window-resizer" aria-label="Resize browser window">${icon("resize")}</button>
      </article>
    </div>
    <div class="rb-selection-mask" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="rb-capture-region" tabindex="0" role="group" aria-label="Recording area. Drag to move, arrow keys to nudge, Shift for ten pixels.">${['nw','n','ne','e','se','s','sw','w'].map(handle=>`<button class="rb-area-handle rb-handle-${handle}" data-handle="${handle}" aria-label="Resize recording area ${handle}"></button>`).join('')}</div>
    <button class="rb-area-draw" aria-label="Draw a new recording area" hidden></button>
    <div class="rb-bounds-guide" aria-hidden="true" hidden></div>
    <div class="rb-camera-slots" aria-hidden="true">${['nw','n','ne','w','e','sw','s','se'].map(name=>`<i class="rb-camera-slot" data-slot="${name}">${JamCameraPlaceholders.borderMarkup()}</i>`).join('')}</div>
    <div class="rb-camera" tabindex="0" role="group" aria-label="Camera bubble. Drag to snap to an edge; plus and minus resize."><div class="rb-camera-preview"><video class="rb-camera-video" autoplay muted playsinline aria-label="Live camera preview" hidden></video><div class="rb-camera-placeholder">${icon('camera')}</div><button class="rb-camera-connect" aria-label="Use Mac camera">${icon('camera')}</button></div><div class="rb-camera-resize-orbit"><button class="rb-camera-resize" aria-label="Resize camera bubble"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path transform="translate(17.5 6.5)" d="M1.50028 1.50028C3.03942 9.41846 3.06782 17.5562 1.584 25.485"/></svg></button></div></div>
    <div class="rb-belt" role="toolbar" aria-label="Recording controls">
      <div class="rb-belt-idle">
        <button class="rb-icon-button rb-close" title="Close recording belt" aria-label="Close recording belt">${icon('close')}</button>
        <div class="rb-inputs"><div class="rb-modes" role="group" aria-label="Recording source">${[['screen','display'],['window','window'],['area','area']].map(([name,glyph])=>`<button type="button" class="rb-mode" data-mode="${name}" aria-label="Record ${name}" aria-pressed="false" title="${name[0].toUpperCase()+name.slice(1)}">${icon(glyph)}</button>`).join('')}</div>
        <button class="rb-device" id="rb-camera-button" aria-haspopup="menu" aria-expanded="false" aria-controls="rb-camera-menu">${icon('camera')}<span class="rb-camera-label"></span></button>
        <button class="rb-device rb-microphone" id="rb-microphone-button" aria-haspopup="menu" aria-expanded="false" aria-controls="rb-microphone-menu">${icon('microphone')}<span class="rb-microphone-label"></span></button></div>
        <button class="rb-record">${icon('record')}<span class="rb-record-label">Record screen</span></button>
      </div>
      <div class="rb-belt-active" hidden><button class="rb-icon-button rb-restart" title="Restart recording" aria-label="Restart recording">${icon('restart')}</button><div class="rb-active-controls"><button class="rb-icon-button rb-pause" title="Pause recording" aria-label="Pause recording"><span class="rb-pause-icon">${icon('pause')}</span><span class="rb-resume-icon">${icon('play')}</span></button><button class="rb-stop" title="Stop recording" aria-label="Stop recording">${icon('stop')}<span class="rb-stop-time">0:00</span><i class="rb-urgency-ring" aria-hidden="true"></i></button></div></div>
    </div>
    <div class="native-menu rb-device-menu" id="rb-camera-menu" role="menu" aria-label="Camera" hidden></div>
    <div class="native-menu rb-device-menu" id="rb-microphone-menu" role="menu" aria-label="Microphone" hidden></div>
    <div class="rb-capture-status" role="status" aria-live="polite"></div>
  `;
  const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
  const belt=$('.rb-belt'),bubble=$('.rb-camera'),region=$('.rb-capture-region');
  const cameraDragOverlay=JamCameraPlaceholders.createOverlay(root);
  const settings={cameraZoom:1,...JamDefaults.get('recording')};
  function beltHome(width=IDLE_WIDTH){
    return {x:W/2,y:Math.max(60,H-44),width};
  }
  function fitRect(rect,top=0){
    rect.width=Math.min(rect.width,W);rect.height=Math.min(rect.height,H-top);
    rect.x=clamp(rect.x,0,W-rect.width);rect.y=clamp(rect.y,top,H-rect.height);return rect;
  }
  function defaultWindows(){
    const left=Math.max(0,(W-1100)/2),top=Math.max(52,(beltHome().y-578)/2);
    return {finder:fitRect({x:left+58,y:top,width:Math.min(470,W-32),height:376},28),browser:fitRect({x:left+355,y:top+80,width:Math.min(686,W-48),height:414},28)};
  }
  const defaultArea=()=>({x:W/4,y:H/4,width:W/2,height:H/2});
  const windows=defaultWindows();
  let area=defaultArea();
  const selectionSizing={area:{preset:'custom',orientation:'horizontal',rulers:false,marginX:48,marginY:48},finder:{preset:'custom',orientation:'horizontal',rulers:false,marginX:48,marginY:48},browser:{preset:'custom',orientation:'horizontal',rulers:false,marginX:48,marginY:48}};
  let selectionNotch=null,selectionRulers=null;
  let selectedWindow=null,stage='idle',elapsed=0,active=false,raf=0,lastFrame=0,drag=null;
  let openMenu=null,menuTrigger=null;
  let pointer={x:W/2,y:H/2,vx:0,vy:0,ax:0,ay:0},pointerTime=0,pointerClient=null;
  let fixedCamera={x:84,y:H-84},cameraPlaced=false;
  let pose=beltHome(),velocity={x:0,y:0,width:0};
  let transition=null,previewTime=0,previewPlaying=false,loopHold=0;
  const follower=JamCameraMotion.create({x:84,y:H-84,size:120});
  const listeners=new Set();
  let fixedAnchor=null,cameraSnap=null,cursorElement=null,resizeAngle=45,cornerPin=null;
  const cameraPositions=loadCameraPositions();
  let clockStamp=0,clockTimer=0;
  const camera=JamRecordingCamera.create($('.rb-camera-video'),{onChange:syncCamera});
  function getCameraStatus(){const s=camera.getState();return s.error||({idle:'Not connected',requesting:'Waiting for camera access…',live:s.label,denied:'Camera access blocked',unavailable:'No camera available',error:'Camera could not start'}[s.status]);}
  function syncCamera(){
    const s=camera.getState(),live=s.status==='live';
    $('.rb-camera-video').hidden=!live;$('.rb-camera-placeholder').hidden=live;
    $('.rb-camera-connect').hidden=live||s.status==='requesting';
    bubble.dataset.media=s.status;bubble.title=s.error||s.label||'Use Mac camera';
    cornerPin?.refresh();syncControls();emit();if(live)wake();
  }
  function requestCamera(deviceId=''){
    // An explicit device choice must start only that device, not an extra default request.
    settings.camera=true;syncSelection();JamDefaults.changed('recording');emit();wake();
    return camera.request(deviceId);
  }
  const ranges={followShrink:[0,30],placeholderTargetScale:[1,1.3],placeholderOtherOpacity:[0,100],placeholderStroke:[.5,4],placeholderActiveStroke:[0,4],placeholderDash:[1,16],placeholderGap:[1,24],placeholderOpacity:[0,100],placeholderActiveOpacity:[0,100],placeholderOverlayOpacity:[0,80],cameraZoom:[1,3],cameraSize:[12,480],cameraMinSize:[12,480],cameraMaxSize:[12,480],followSize:[12,160],gap:[8,64],stiffness:[80,500],damping:[10,50],anticipation:[0,100],beltSpring:[80,500],beltDamping:[10,50],warningSeconds:[5,30],pulseStart:[600,1600],pulseEnd:[350,600],pulseStrength:[0,8],rate:[.5,2]};
  function emit(){listeners.forEach(fn=>fn());}
  function rectStyle(el,r){el.style.left=`${r.x}px`;el.style.top=`${r.y}px`;el.style.width=`${r.width}px`;el.style.height=`${r.height}px`;}
  function local(event,constrain=true){
    const r=root.getBoundingClientRect(),p={x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};
    return constrain?{x:clamp(p.x,0,W),y:clamp(p.y,0,H)}:p;
  }
  function syncPointerPosition(){
    // Keep the pointer in browser coordinates while the desktop insets around it.
    const p=pointerClient?local(pointerClient,false):{x:clamp(pointer.x,0,W),y:clamp(pointer.y,0,H)};
    pointer={...pointer,...p};
  }
  function trackPointer(event){
    if(!active||event.isPrimary===false||(drag&&event.pointerId!==drag.pointerId))return;
    pointerClient={clientX:event.clientX,clientY:event.clientY};
    const p=local(event,false),now=performance.now(),dt=pointerTime?clamp((now-pointerTime)/1000,.004,.1):.016;
    const vx=clamp((p.x-pointer.x)/dt,-4000,4000),vy=clamp((p.y-pointer.y)/dt,-4000,4000);
    pointer={...p,vx,vy,ax:clamp((vx-pointer.vx)/dt,-20000,20000),ay:clamp((vy-pointer.vy)/dt,-20000,20000)};pointerTime=now;syncCursor();
    if(settings.camera&&settings.followCursor)wake();
  }
  function syncCursor(){
    const bounds=captureBounds(),inside=pointer.x>=bounds.x&&pointer.x<=bounds.x+bounds.width&&pointer.y>=bounds.y&&pointer.y<=bounds.y+bounds.height;
    const frame=root.getBoundingClientRect();
    const target=active&&pointerTime&&!drag&&!selectionRulers?.isDragging()&&(settings.mode!=='window'||selectedWindow)&&inside
      ?document.elementFromPoint(frame.left+pointer.x,frame.top+pointer.y):null;
    const action=target?.closest('button,a,input,select,textarea,[role="button"],[role="slider"],[role="menu"],.desktop-menubar,.toolbar,.pg-shell,.rb-window-titlebar,.rb-window-resizer,.rb-camera,.rb-belt,.rb-selection-notch');
    const next=target&&!action?target:null;
    if(next===cursorElement)return;
    cursorElement?.classList.remove('rb-custom-pointer');cursorElement=next;cursorElement?.classList.add('rb-custom-pointer');
  }
  function captureBounds(){return settings.mode==='area'?{...area}:settings.mode==='window'&&selectedWindow?{...windows[selectedWindow]}:{x:0,y:0,width:W,height:H};}
  function isIdle(){return stage==='idle';}
  function selectionState(name=settings.mode==='area'?'area':selectedWindow){return selectionSizing[name]||{preset:'custom',orientation:'horizontal',rulers:false,marginX:48,marginY:48};}
  function selectionBounds(windowMode=settings.mode==='window'){return {x:0,y:windowMode?28:0,width:W,height:Math.max(1,H-(windowMode?28:0))};}
  function selectionMinimum(windowMode=settings.mode==='window'){return windowMode?{width:320,height:220}:{width:50,height:50};}
  function applySelectionRect(rect){
    if(!active||!isIdle()||settings.mode==='screen'||settings.mode==='window'&&!selectedWindow)return;
    if(settings.mode==='area')area=rect;else Object.assign(windows[selectedWindow],rect);
    syncWindows();syncSelection();emit();wake();
  }
  function sizeSelection(axis,value){
    const rect=captureBounds();
    applySelectionRect(JamSelectionGeometry.size(rect,{...rect,[axis]:value},selectionBounds(),selectionMinimum(),JamSelectionGeometry.ratio(selectionState()),axis));
  }
  function setSelectionRatio(preset){
    if(!['custom','1:1','4:3','16:9','16:10'].includes(preset))return;
    selectionState().preset=preset;
    sizeSelection('width',captureBounds().width);
  }
  function setSelectionOrientation(orientation){
    if(!['horizontal','vertical'].includes(orientation)||selectionState().orientation===orientation)return;
    const rect=captureBounds();selectionState().orientation=orientation;
    applySelectionRect(JamSelectionGeometry.size(rect,{width:rect.height,height:rect.width},selectionBounds(),selectionMinimum(),JamSelectionGeometry.ratio(selectionState())));
  }
  function syncWindows(){for(const [name,value]of Object.entries(windows))rectStyle($(`[data-window="${name}"]`),value);}
  function loadCameraPositions(){
    try{
      const saved=JSON.parse(sessionStorage.getItem('jam-recording-camera-positions-v1')||'{}'),valid={};
      for(const key of ['screen','area','window:finder','window:browser']){
        const p=saved?.[key];
        if(p&&Number.isFinite(p.u)&&Number.isFinite(p.v))valid[key]={u:clamp(p.u,0,1),v:clamp(p.v,0,1),anchor:['nw','n','ne','w','e','sw','s','se'].includes(p.anchor)?p.anchor:null};
      }
      return valid;
    }catch(_){return {};}
  }
  function cameraPositionKey(){return settings.mode==='window'?(selectedWindow?`window:${selectedWindow}`:null):settings.mode;}
  function rememberCameraPosition(){
    const key=cameraPositionKey();if(!key||!cameraPlaced||settings.followCursor)return;
    const b=captureBounds();
    cameraPositions[key]={u:clamp((fixedCamera.x-b.x)/b.width,0,1),v:clamp((fixedCamera.y-b.y)/b.height,0,1),anchor:fixedAnchor};
    // Placement belongs to this preview session, not the shared playground defaults.
    try{sessionStorage.setItem('jam-recording-camera-positions-v1',JSON.stringify(cameraPositions));}catch(_){}
  }
  function placeCamera(){
    const b=captureBounds(),saved=cameraPositions[cameraPositionKey()],size=Math.min(settings.followCursor?settings.followSize:settings.cameraSize,b.width-8,b.height-8);
    fixedAnchor=saved?saved.anchor:'sw';cameraSnap=null;
    const anchor=fixedAnchor&&cameraSlots().find(slot=>slot.name===fixedAnchor);
    fixedCamera=anchor?{x:anchor.x,y:anchor.y}:{x:b.x+b.width*saved.u,y:b.y+b.height*saved.v};
    cameraPlaced=true;follower.snap({...fixedCamera,size});
  }
  function syncCameraZoom(){
    $('.rb-camera-video').style.transform=`scale(${settings.cameraZoom}) scaleX(${settings.mirror?-1:1})`;
  }
  function syncCameraSizing(){
    const sizing=active&&isIdle()&&settings.mode==='area'&&settings.followCursor&&(drag?.kind==='area-resize'||selectionRulers?.isDragging());
    bubble.classList.toggle('is-sizing-area',!!sizing);
  }
  function syncSelection(){
    root.dataset.mode=settings.mode;root.dataset.stage=stage;root.dataset.picking=String(settings.mode==='window'&&!selectedWindow&&isIdle());
    const bounds=captureBounds(),idle=isIdle();
    region.hidden=settings.mode==='window'&&!selectedWindow;
    rectStyle(region,bounds);
    region.classList.toggle('is-area',settings.mode==='area');
    region.classList.toggle('is-selected-window',settings.mode==='window'&&!!selectedWindow);
    region.tabIndex=settings.mode==='area'&&idle?0:-1;
    selectionRulers?.render({enabled:active&&idle&&settings.mode==='area',key:settings.mode==='area'?'area':selectedWindow,state:selectionState(),rect:bounds});
    selectionNotch?.render({enabled:active&&idle&&(settings.mode==='area'||settings.mode==='window'&&!!selectedWindow),key:settings.mode==='area'?'area':selectedWindow,mode:settings.mode,rect:bounds,sizing:selectionState(),bounds:selectionBounds(),minimum:selectionMinimum()});
    $$('.rb-area-handle').forEach(el=>{el.hidden=settings.mode!=='area'||!idle;});
    $('.rb-area-draw').hidden=settings.mode!=='area'||!idle;
    const mask=$('.rb-selection-mask');mask.hidden=settings.mode!=='area';
    const parts=[{x:0,y:0,width:W,height:bounds.y},{x:0,y:bounds.y,width:bounds.x,height:bounds.height},{x:bounds.x+bounds.width,y:bounds.y,width:W-bounds.x-bounds.width,height:bounds.height},{x:0,y:bounds.y+bounds.height,width:W,height:H-bounds.y-bounds.height}];
    [...mask.children].forEach((el,i)=>rectStyle(el,parts[i]));
    $$('.rb-mock-window').forEach(el=>el.classList.toggle('is-selected',el.dataset.window===selectedWindow&&settings.mode==='window'));
    const guide=$('.rb-bounds-guide');guide.hidden=!settings.showBounds;rectStyle(guide,bounds);
    bubble.hidden=!settings.camera||(settings.mode==='window'&&!selectedWindow); bubble.classList.toggle('is-following',settings.followCursor);bubble.tabIndex=settings.followCursor?-1:0;
    syncCameraZoom();syncCameraSizing();
    if(!cameraPlaced)placeCamera();
    renderCamera(0);renderSlots();syncControls();syncCursor();cornerPin?.refresh();
  }
  function syncControls(){
    $$('.rb-mode').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.mode===settings.mode));el.disabled=!isIdle();});
    $('.rb-record-label').textContent=`Record ${settings.mode}`;
    $('.rb-record').disabled=settings.mode==='window'&&!selectedWindow;
    $('.rb-camera-label').textContent=settings.camera?(camera.getState().label||'Use camera'):'No Camera';
    $('.rb-microphone-label').textContent=settings.microphone?settings.microphoneDevice:'No Microphone';
    $('#rb-camera-button').setAttribute('aria-label',`Camera: ${settings.camera?(camera.getState().label||'Use Mac camera'):'No Camera'}`);
    $('#rb-microphone-button').setAttribute('aria-label',`Microphone: ${settings.microphone?settings.microphoneDevice:'No Microphone'}`);
    $('#rb-camera-button').classList.toggle('is-off',!settings.camera);$('#rb-microphone-button').classList.toggle('is-off',!settings.microphone);
    for(const [button,name]of [['#rb-camera-button',settings.camera?'camera':'cameraOff'],['#rb-microphone-button',settings.microphone?'microphone':'microphoneOff']]){const el=$(button+' .rb-sf'),symbol=symbols[name];if(el.dataset.symbol!==symbol){el.dataset.symbol=symbol;el.style.setProperty('--sf-image',`url('assets/recording/sf/${symbol}.png')`);}}
    $('.rb-belt-idle').hidden=!isIdle();$('.rb-belt-active').hidden=isIdle();
    belt.dataset.stage=stage;
    const pause=$('.rb-pause'),paused=stage==='paused';pause.classList.toggle('is-paused',paused);pause.setAttribute('aria-label',paused?'Resume recording':'Pause recording');pause.title=pause.getAttribute('aria-label');
    syncTimer();
  }
  function syncTimer(){
    const t=Math.floor(elapsed),stop=$('.rb-stop'),ring=$('.rb-urgency-ring');
    $('.rb-stop-time').textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
    stop.setAttribute('aria-label',`Stop recording, ${Math.floor(t/60)} minutes ${t%60} seconds`);
    const warning=stage==='limit'&&!reduced.matches,seconds=Math.max(0,elapsed-(LIMIT-settings.warningSeconds));
    const f0=1000/settings.pulseStart,f1=1000/settings.pulseEnd;
    const phase=2*Math.PI*(f0*seconds+(f1-f0)*seconds*seconds/(2*settings.warningSeconds));
    const pulse=warning?(1-Math.cos(phase))/2:0,strength=settings.pulseStrength/100;
    stop.style.transform=`scale(${1+pulse*strength})`;
    ring.style.opacity=String(pulse*strength*6);ring.style.transform=`scale(${1+pulse*.22})`;
  }
  const clockRunning=()=>stage==='recording'||stage==='limit';
  function advanceClock(now=performance.now()){
    if(!active||!clockRunning())return true;
    if(clockStamp)elapsed=Math.min(LIMIT,elapsed+(now-clockStamp)/1000);
    clockStamp=now;
    if(elapsed>=LIMIT){finishRecording();return false;}
    const next=elapsed>=LIMIT-settings.warningSeconds?'limit':'recording';
    if(next!==stage){stage=next;syncControls();}
    syncTimer();return true;
  }
  function scheduleClock(){
    clearTimeout(clockTimer);clockTimer=0;
    if(active&&clockRunning())clockTimer=setTimeout(()=>{if(advanceClock()){scheduleClock();emit();}},Math.max(1,(LIMIT-elapsed)*1000+1));
  }
  function setElapsed(value){
    if(isIdle())setStage('recording');
    elapsed=clamp(Number(value)||0,0,LIMIT);clockStamp=performance.now();
    if(elapsed>=LIMIT){finishRecording();return;}
    if(stage!=='paused')stage=elapsed>=LIMIT-settings.warningSeconds?'limit':'recording';
    scheduleClock();syncSelection();emit();wake();
  }
  function previewLimit(){setStage('recording');setElapsed(LIMIT-10);}

  // Analytic spring sampling keeps scrubbing deterministic, while carrying velocity on interruption.
  function sample(t,from,v,target,k=settings.beltSpring,c=settings.beltDamping){
    const a=c/2,d=k-a*a,q=from-target;
    let displacement,speed;
    if(Math.abs(d)<.001){const b=v+a*q,e=Math.exp(-a*t);displacement=e*(q+b*t);speed=e*(b-a*(q+b*t));}
    else if(d>0){const w=Math.sqrt(d),b=(v+a*q)/w,e=Math.exp(-a*t),cos=Math.cos(w*t),sin=Math.sin(w*t);displacement=e*(q*cos+b*sin);speed=e*((-q*w*sin+b*w*cos)-a*(q*cos+b*sin));}
    else{const w=Math.sqrt(-d),r1=-a+w,r2=-a-w,A=(v-r2*q)/(r1-r2),B=q-A;displacement=A*Math.exp(r1*t)+B*Math.exp(r2*t);speed=A*r1*Math.exp(r1*t)+B*r2*Math.exp(r2*t);}
    return {value:target+displacement,velocity:speed};
  }
  function duration(){
    const a=settings.beltDamping/2;
    const slowRate=a-Math.sqrt(Math.max(0,a*a-settings.beltSpring));
    return Math.max(1.6,Math.min(8,-Math.log(.0001)/slowRate));
  }
  function renderBelt(){
    if(transition){if(reduced.matches||previewTime>=duration()){pose={...transition.to};velocity={x:0,y:0,width:0};}else for(const key of ['x','y','width']){const s=sample(previewTime,transition.from[key],transition.velocity[key],transition.to[key]);pose[key]=s.value;velocity[key]=s.velocity;}}
    // Preserve the native belt size, scaling only this control on narrow displays.
    const width=clamp(pose.width,170,650),s=Math.min(1,(W-16)/IDLE_WIDTH),displayWidth=width*s;
    belt.style.width=`${width}px`;belt.style.transform=`translate3d(${clamp(pose.x,displayWidth/2+8,W-displayWidth/2-8)-displayWidth/2}px,${clamp(pose.y,28+26*s,H-26*s)-26*s}px,0) scale(${s})`;
  }
  function animateBelt(to,from=pose){transition={from:{...from},velocity:{...velocity},to:{...to}};previewTime=0;previewPlaying=!reduced.matches;loopHold=0;if(reduced.matches)previewTime=duration();renderBelt();wake();}
  function loopBeltAnimation(){
    if(!transition)return;
    transition.velocity={x:0,y:0,width:0};previewTime=0;loopHold=0;
    renderBelt();
  }
  function setStage(next){
    if(!['idle','recording','paused','limit'].includes(next))return;
    if(next!=='idle'&&settings.mode==='window'&&!selectedWindow)selectWindow('browser');
    if(!advanceClock())return;
    closeMenu(false);
    const previous=stage;stage=next;
    if(next==='idle'){elapsed=0;animateBelt(beltHome(IDLE_WIDTH));}
    else if(previous==='idle'){elapsed=next==='limit'?LIMIT-settings.warningSeconds:0;animateBelt(beltHome(ACTIVE_WIDTH));}
    else if(next==='limit')elapsed=LIMIT-settings.warningSeconds;
    else if(next==='recording'&&previous==='limit')elapsed=0;
    clockStamp=performance.now();scheduleClock();
    syncSelection();$('.rb-capture-status').textContent=next==='idle'?'':next==='paused'?'Recording paused':next==='limit'?'Recording limit approaching':'Recording started';emit();wake();
  }
  function inheritWindowArea(previousMode,nextMode){
    if(previousMode!=='window'||nextMode!=='area'||!selectedWindow)return;
    // Copy before clearing selection; a previous area ratio must not reshape the window.
    area={...windows[selectedWindow]};
    Object.assign(selectionSizing.area,{preset:'custom',orientation:area.width>=area.height?'horizontal':'vertical'});
  }
  function setMode(mode){
    if(!['screen','window','area'].includes(mode))return;
    rememberCameraPosition();if(!isIdle())setStage('idle');inheritWindowArea(settings.mode,mode);settings.mode=mode;selectedWindow=null;cameraPlaced=false;syncSelection();JamDefaults.changed('recording');emit();
  }
  function selectWindow(name){if(!windows[name])return;rememberCameraPosition();selectedWindow=name;cameraPlaced=false;syncSelection();emit();}
  function resetSelection(){if(!isIdle())setStage('idle');closeMenu(false);selectedWindow=null;area=defaultArea();Object.assign(windows,defaultWindows());Object.values(selectionSizing).forEach(state=>Object.assign(state,{preset:'custom',orientation:'horizontal',rulers:false,marginX:48,marginY:48}));cameraPlaced=false;fixedAnchor=null;cameraSnap=null;syncWindows();syncSelection();emit();}
  function updateSettings(patch={}){
    const oldMode=settings.mode,oldFollow=settings.followCursor,oldCamera=settings.camera;
    if(('mode' in patch&&patch.mode!==oldMode)||('followCursor' in patch&&Boolean(patch.followCursor)!==oldFollow)||('camera' in patch&&!patch.camera))rememberCameraPosition();
    for(const key of Object.keys(settings)){
      if(!(key in patch))continue;
      if(ranges[key]&&Number.isFinite(Number(patch[key])))settings[key]=clamp(Number(patch[key]),...ranges[key]);
      else if(typeof settings[key]==='boolean')settings[key]=Boolean(patch[key]);
      else if(key==='mode'&&['screen','window','area'].includes(patch.mode))settings.mode=patch.mode;
      else if(key==='cameraDevice'&&typeof patch[key]==='string'&&patch[key].length<=64)settings[key]=patch[key];
      else if(['placeholderColor','placeholderContrastColor','placeholderContrastHoverColor','placeholderContrastActiveColor','placeholderContrastEdgeColor','placeholderOverlayColor'].includes(key)&&typeof patch[key]==='string'&&patch[key].length<=64&&CSS.supports('color',patch[key])&&!/var\(|currentcolor|inherit|initial|unset/i.test(patch[key]))settings[key]=patch[key];
      else if(key==='microphoneDevice'&&['MacBook','AirPods Pro 3','ZoomAudioDevice','BoseQC Ultra Headphones','Mac Studio Display Microphone'].includes(patch[key]))settings[key]=patch[key];
    }
    if(settings.cameraMinSize>settings.cameraMaxSize){
      if('cameraMinSize' in patch && !('cameraMaxSize' in patch))settings.cameraMaxSize=settings.cameraMinSize;
      else settings.cameraMinSize=settings.cameraMaxSize;
    }
    settings.cameraSize=clamp(settings.cameraSize,settings.cameraMinSize,settings.cameraMaxSize);
    if(oldMode!==settings.mode){inheritWindowArea(oldMode,settings.mode);selectedWindow=null;cameraPlaced=false;}
    if(oldFollow!==settings.followCursor){cameraSnap=null;pointerTime=0;if(!settings.followCursor)cameraPlaced=false;}
    if(!settings.camera)camera.stop();
    else if(active&&!oldCamera)camera.request(camera.getState().deviceId);
    syncSelection();renderBelt();JamDefaults.changed('recording');emit();wake();return {...settings};
  }
  function resizeCamera(value,event){
    const previous=bubble.offsetWidth,b=captureBounds();
    const maximum=Math.max(settings.cameraMinSize,Math.min(settings.cameraMaxSize,b.width-8,b.height-8));
    const size=clamp(Math.round(value),settings.cameraMinSize,maximum);
    if(drag?.kind==='camera-resize'&&!fixedAnchor){
      const {initial,initialSize,direction:{gx,gy}}=drag;
      const delta=(Math.min(size,b.width-8,b.height-8)-initialSize)/2;
      fixedCamera={x:initial.x+gx*delta,y:initial.y+gy*delta};
    }
    // Only a deliberate shrinking gesture enters Follow; saved settings stay independent.
    const follow=!settings.followCursor&&size<56&&size<previous;
    if(!follow){updateSettings({cameraSize:size});return;}
    settings.cameraSize=size;
    renderCamera(0); // Start the follower's spring at the bubble's final resized pose.
    const resizing=drag?.kind==='camera-resize'?drag:null;
    if(resizing){
      // Releasing capture can dispatch lostpointercapture immediately. Clear the drag first.
      drag=null;bubble.classList.remove('is-resizing');
      if(resizing.target.hasPointerCapture(resizing.pointerId))resizing.target.releasePointerCapture(resizing.pointerId);
    }
    updateSettings({followCursor:true});
    if(Number.isFinite(event?.clientX)&&Number.isFinite(event?.clientY))trackPointer(event);
    else if(event?.type==='keydown')$('#rb-camera-button').focus({preventScroll:true});
  }
  function cameraResizeDirection(){
    const dock=fixedAnchor||nearestSlot().name;
    const gx=dock.includes('w')?1:dock.includes('e')?-1:0;
    const gy=dock.includes('n')?1:dock.includes('s')?-1:0;
    const length=Math.hypot(gx,gy),ux=gx/length,uy=gy/length;
    return {dock,gx,gy,ux,uy,angle:Math.atan2(uy,ux)*180/Math.PI,cursor:gx&&gy?(gx===gy?'nwse-resize':'nesw-resize'):gx?'ew-resize':'ns-resize'};
  }
  function renderCameraResizer(size){
    if(settings.followCursor)return;
    const direction=drag?.kind==='camera-resize'?drag.direction:cameraResizeDirection();
    // Unwrap angles so crossing the left side never spins the long way around.
    resizeAngle+=((direction.angle-resizeAngle+540)%360)-180;
    const orbit=$('.rb-camera-resize-orbit'),handle=$('.rb-camera-resize');
    orbit.style.transform=`rotate(${resizeAngle}deg)`;
    // Only the gap follows the diameter; the arc and its centered hit area stay full size.
    const gap=clamp(size/30,3,8)+2,radius=size/2+gap-2;
    handle.querySelector('path').setAttribute('transform','translate(-0.08807 6.5074)');
    handle.style.setProperty('--resize-radius',`${radius}px`);handle.style.cursor=direction.cursor;
    handle.dataset.direction=direction.dock;
    handle.setAttribute('aria-label',`Resize camera bubble from ${direction.dock}. Arrow keys resize; Shift for ten pixels.`);
  }
  function cameraSlots(){
    const b=captureBounds(),size=Math.max(12,Math.min(settings.cameraSize,b.width-8,b.height-8)),r=size/2;
    const ix=Math.min(24,Math.max(4,(b.width-size)/4)),iy=Math.min(24,Math.max(4,(b.height-size)/4));
    const xs=[b.x+r+ix,b.x+b.width/2,b.x+b.width-r-ix],ys=[b.y+r+iy,b.y+b.height/2,b.y+b.height-r-iy];
    return [['nw',0,0],['n',1,0],['ne',2,0],['w',0,1],['e',2,1],['sw',0,2],['s',1,2],['se',2,2]].map(([name,x,y])=>({name,x:xs[x],y:ys[y],size}));
  }
  function nearestSlot(){return cameraSlots().sort((a,b)=>Math.hypot(a.x-fixedCamera.x,a.y-fixedCamera.y)-Math.hypot(b.x-fixedCamera.x,b.y-fixedCamera.y))[0];}
  function renderSlots(){
    JamCameraPlaceholders.paintPalette(root,settings);
    const show=active&&drag?.kind==='camera'&&!settings.followCursor,layer=$('.rb-camera-slots');layer.classList.toggle('is-visible',show);
    root.classList.toggle('is-camera-dragging',show);
    const slots=cameraSlots(),nearest=show?nearestSlot().name:null;
    cameraDragOverlay.update(captureBounds(),slots,show,settings,nearest);
    for(const slot of slots){const el=layer.querySelector(`[data-slot="${slot.name}"]`),diameter=Math.max(24,slot.size);rectStyle(el,{x:slot.x-diameter/2,y:slot.y-diameter/2,width:diameter,height:diameter});el.classList.toggle('is-nearest',slot.name===nearest);JamCameraPlaceholders.paintPlacement(el,settings,slot.name===nearest,show);JamCameraPlaceholders.paintBorder(el,diameter,settings,show&&slot.name===nearest);}
  }
  function snapCamera(target=nearestSlot(),from=follower.getState()){
    fixedAnchor=target.name;
    cameraSnap={from:{...from},to:target,time:0,velocity:cameraSnap?.velocity||{x:0,y:0}};
    if(reduced.matches){fixedCamera={x:target.x,y:target.y};cameraSnap=null;}
    rememberCameraPosition();renderCamera(0);wake();
  }
  function pinCamera(name,keyboard=false){
    if(!active||!isIdle()||!settings.camera||!settings.followCursor||camera.getState().status!=='live'||(settings.mode==='window'&&!selectedWindow))return;
    const target=cameraSlots().find(slot=>slot.name===name&&['nw','ne','sw','se'].includes(name));
    if(!target)return;
    // Transfer the current follower pose into the same spring used for drag docking.
    // updateSettings normally restores the previous dock when Follow is switched off.
    const from=follower.getState();settings.followCursor=false;cameraPlaced=true;
    fixedCamera={x:from.x,y:from.y};
    snapCamera(target,from);
    if(keyboard){fixedCamera={x:target.x,y:target.y};cameraSnap=null;}
    syncSelection();rememberCameraPosition();JamDefaults.changed('recording');emit();
    $('.rb-capture-status').textContent=`Camera pinned to ${{nw:'top left',ne:'top right',sw:'bottom left',se:'bottom right'}[name]}`;
    if(keyboard)bubble.focus({preventScroll:true});
  }
  function renderCamera(dt){
    if(!settings.camera)return;
    const b=captureBounds();let size=settings.followCursor?settings.followSize:settings.cameraSize;
    let value;
    // Stay at the restored dock until a real pointer position is available.
    if(settings.followCursor&&pointerClient){value=follower.step({pointer,bounds:b,pinOutside:true,size,gap:settings.gap,stiffness:settings.stiffness,damping:settings.damping,anticipation:settings.anticipation,shrink:settings.followShrink,dt,reducedMotion:reduced.matches});}
    else{
      const anchor=fixedAnchor&&cameraSlots().find(slot=>slot.name===fixedAnchor);
      if(cameraSnap){
        cameraSnap.time+=dt;if(anchor)cameraSnap.to=anchor;
        if(cameraSnap.time>=.6||reduced.matches){fixedCamera={x:cameraSnap.to.x,y:cameraSnap.to.y};cameraSnap=null;}
        else{
          for(const key of ['x','y']){const s=sample(cameraSnap.time,cameraSnap.from[key],cameraSnap.velocity[key],cameraSnap.to[key],440,38);fixedCamera[key]=s.value;}
          size=sample(cameraSnap.time,cameraSnap.from.size??size,0,size,440,38).value;
        }
      }else if(anchor&&drag?.kind!=='camera')fixedCamera={x:anchor.x,y:anchor.y};
      const diameter=Math.max(12,Math.min(size,b.width-8,b.height-8)),r=diameter/2;
      fixedCamera.x=clamp(fixedCamera.x,b.x+r+4,b.x+b.width-r-4);fixedCamera.y=clamp(fixedCamera.y,b.y+r+4,b.y+b.height-r-4);
      value={...fixedCamera,size:diameter};follower.snap(value);
    }
    renderCameraResizer(value.size);bubble.dataset.small=String(value.size<48);
    bubble.style.width=`${value.size}px`;bubble.style.height=`${value.size}px`;bubble.style.transform=`translate3d(${value.x-value.size/2}px,${value.y-value.size/2}px,0) scale(${value.motionScale??1})`;
    bubble.dataset.side=value.side||'fixed';bubble.dataset.followState=settings.followCursor?(value.mode||'following'):'fixed';
  }
  function tick(now){
    raf=0;if(!active||document.hidden)return;
    const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):0;lastFrame=now;
    if(previewPlaying){previewTime=Math.min(duration(),previewTime+dt*settings.rate);renderBelt();if(previewTime>=duration()){if(settings.loop&&!reduced.matches){loopHold+=dt*settings.rate;if(loopHold>.65)loopBeltAnimation();}else previewPlaying=false;}}
    if(!advanceClock(now))return;
    // Decay velocity between pointer events so a resting buddy returns beside the pointer.
    const decay=Math.exp(-dt*12);pointer.vx*=decay;pointer.vy*=decay;pointer.ax*=decay;pointer.ay*=decay;
    renderCamera(dt);emit();if(previewPlaying||cameraSnap||clockRunning()||(settings.camera&&settings.followCursor))raf=requestAnimationFrame(tick);
  }
  function wake(){if(active&&!document.hidden&&!raf){lastFrame=0;raf=requestAnimationFrame(tick);}}
  function setActive(value){
    if(active&&!value){advanceClock();rememberCameraPosition();}active=Boolean(value);syncCursor();
    if(!active)cornerPin?.clear();
    if(!active){cancelAnimationFrame(raf);clearTimeout(clockTimer);raf=0;lastFrame=0;clockStamp=0;closeMenu(false);drag=null;camera.stop();}
    else{clockStamp=performance.now();scheduleClock();layout();syncSelection();renderBelt();if(settings.camera)camera.request(camera.getState().deviceId);wake();}
  }
  function restart(){
    if(settings.mode==='window'&&!selectedWindow)selectWindow('browser');
    stage='recording';elapsed=0;clockStamp=performance.now();scheduleClock();velocity={x:0,y:0,width:0};animateBelt(beltHome(ACTIVE_WIDTH),beltHome(IDLE_WIDTH));syncSelection();emit();
  }
  function finishRecording(){clearTimeout(clockTimer);clockStamp=0;stage='idle';elapsed=0;previewPlaying=false;transition=null;pose=beltHome();velocity={x:0,y:0,width:0};syncSelection();renderBelt();JamPlayground.setSurface('draft');JamPlayground.notify('Recording preview complete');}
  function menuItem(label,checked,run,role='menuitemradio'){
    const b=document.createElement('button');b.className='native-menu-item';b.type='button';b.role=role;b.tabIndex=-1;b.textContent=label;b.setAttribute('aria-checked',String(checked));b.addEventListener('click',()=>{run();closeMenu();});b.addEventListener('pointermove',()=>b.focus({preventScroll:true}));return b;
  }
  function closeMenu(restore=true){if(!openMenu)return;if(selectionNotch?.owns(openMenu)){selectionNotch.close(restore);return;}openMenu.hidden=true;menuTrigger?.setAttribute('aria-expanded','false');if(restore)menuTrigger?.focus({preventScroll:true});openMenu=null;menuTrigger=null;}
  function showMenu(kind){
    const menu=$(`#rb-${kind}-menu`),trigger=$(`#rb-${kind}-button`);if(openMenu===menu){closeMenu();return;}closeMenu(false);
    menu.replaceChildren();const add=(...args)=>menu.append(menuItem(...args)),separator=()=>{const s=document.createElement('div');s.className='native-menu-separator';s.role='separator';menu.append(s);};
    if(kind==='camera'){
      const state=camera.getState();
      if(!state.devices.length)add(state.status==='requesting'?'Waiting for access…':'Use Mac camera',false,()=>requestCamera(),'menuitem');
      for(const device of state.devices)add(device.label,settings.camera&&state.status==='live'&&state.deviceId===device.deviceId,()=>{settings.cameraDevice=device.label.slice(0,64);requestCamera(device.deviceId);});
      if(state.devices.length&&state.status!=='live')add('Start camera',false,()=>requestCamera(state.deviceId),'menuitem');
      if(state.error){const note=document.createElement('div');note.className='rb-camera-error';note.textContent=state.error;menu.append(note);}
      separator();add('Follow cursor',settings.followCursor,()=>updateSettings({followCursor:!settings.followCursor}),'menuitemcheckbox');add('Mirror Camera',settings.mirror,()=>updateSettings({mirror:!settings.mirror}),'menuitemcheckbox');separator();add('Don’t Record Camera',!settings.camera,()=>updateSettings({camera:false}));
    }else{
      for(const name of ['MacBook','AirPods Pro 3','ZoomAudioDevice','BoseQC Ultra Headphones','Mac Studio Display Microphone'])add(name,settings.microphone&&settings.microphoneDevice===name,()=>{settings.microphoneDevice=name;updateSettings({microphone:true});});
      separator();add('Don’t Record Microphone',!settings.microphone,()=>updateSettings({microphone:false}));
    }
    openMenu=menu;menuTrigger=trigger;menu.hidden=false;trigger.setAttribute('aria-expanded','true');cornerPin?.clear();
    const tr=trigger.getBoundingClientRect(),rr=root.getBoundingClientRect(),s=rr.width/W;
    menu.style.left=`${clamp((tr.left-rr.left)/s,8,W-menu.offsetWidth-8)}px`;
    menu.style.top=`${Math.max(8,(tr.top-rr.top)/s-menu.offsetHeight-8)}px`;
    menu.querySelector('[aria-checked="true"]')?.focus({preventScroll:true});
    if(!menu.contains(document.activeElement))menu.querySelector('button').focus({preventScroll:true});
  }
  let typeBuffer='',typeTimer=0;
  root.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.target.closest('input,textarea,select'))return;
    if(openMenu){const items=[...openMenu.querySelectorAll('button')],index=items.indexOf(document.activeElement);let next;
      if(event.key==='Escape'||event.key==='Tab'){closeMenu();if(event.key==='Escape')event.preventDefault();return;}
      if(event.key==='ArrowDown')next=(index+1)%items.length;if(event.key==='ArrowUp')next=(index-1+items.length)%items.length;if(event.key==='Home')next=0;if(event.key==='End')next=items.length-1;
      if(event.key.length===1&&!event.metaKey&&!event.ctrlKey&&event.key!==' '){typeBuffer+=event.key.toLowerCase();clearTimeout(typeTimer);typeTimer=setTimeout(()=>typeBuffer='',500);next=items.findIndex(b=>b.textContent.toLowerCase().startsWith(typeBuffer));}
      if(next>=0){event.preventDefault();items[next].focus();}return;
    }
    if(event.key==='Escape'&&isIdle()){if(selectedWindow&&settings.mode==='window'){rememberCameraPosition();selectedWindow=null;syncSelection();}else JamPlayground.setSurface('onboarding');}
    if(event.target===bubble&&!settings.followCursor){if(event.key.startsWith('Arrow')){fixedAnchor=null;cameraSnap=null;}const amount=event.shiftKey?10:2;let used=true;if(event.key==='ArrowLeft')fixedCamera.x-=amount;else if(event.key==='ArrowRight')fixedCamera.x+=amount;else if(event.key==='ArrowUp')fixedCamera.y-=amount;else if(event.key==='ArrowDown')fixedCamera.y+=amount;else if(event.key==='+'||event.key==='=')resizeCamera(settings.cameraSize+4,event);else if(event.key==='-')resizeCamera(settings.cameraSize-4,event);else used=false;if(used){event.preventDefault();renderCamera(0);rememberCameraPosition();}}
    if(event.target===region&&settings.mode==='area'&&isIdle()){let x=area.x,y=area.y,n=event.shiftKey?10:1;if(event.key==='ArrowLeft')x-=n;else if(event.key==='ArrowRight')x+=n;else if(event.key==='ArrowUp')y-=n;else if(event.key==='ArrowDown')y+=n;else return;event.preventDefault();area.x=clamp(x,0,W-area.width);area.y=clamp(y,0,H-area.height);syncSelection();}
  });
  document.addEventListener('pointerdown',e=>{if(openMenu&&!openMenu.contains(e.target)&&e.target!==menuTrigger&&!menuTrigger.contains(e.target))closeMenu(false);},true);
  $('.rb-camera-connect').addEventListener('click',e=>{if(e.detail===0)requestCamera();});
  $('#rb-camera-button').addEventListener('click',()=>showMenu('camera'));$('#rb-microphone-button').addEventListener('click',()=>showMenu('microphone'));
  $$('.rb-mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('.rb-record').addEventListener('click',()=>setStage('recording'));
  $('.rb-pause').addEventListener('click',()=>setStage(stage==='paused'?'recording':'paused'));
  $('.rb-stop').addEventListener('click',finishRecording);$('.rb-restart').addEventListener('click',restart);
  $('.rb-close').addEventListener('click',()=>JamPlayground.setSurface('onboarding'));
  $$('.rb-window-selector').forEach(b=>b.addEventListener('click',()=>selectWindow(b.closest('[data-window]').dataset.window)));
  function startDrag(event,kind,extra={}){if(event.button!==0||drag||selectionRulers?.isDragging())return;cornerPin?.clear();if(document.activeElement?.closest('.rb-selection-notch input'))document.activeElement.blur();event.preventDefault();const p=local(event);drag={kind,start:p,pointerId:event.pointerId,target:event.currentTarget,shiftKey:event.shiftKey,altKey:event.altKey,...extra};event.currentTarget.setPointerCapture(event.pointerId);closeMenu(false);syncCursor();syncCameraSizing();}
  $$('.rb-window-titlebar').forEach(el=>{
    el.addEventListener('pointerdown',e=>{if(root.dataset.picking==='true')return;const name=el.closest('[data-window]').dataset.window;startDrag(e,'window',{name,initial:{...windows[name]}});el.closest('[data-window]').style.zIndex=String(++windowLayer);});
    el.addEventListener('keydown',e=>{const name=el.closest('[data-window]').dataset.window,r=windows[name],n=e.shiftKey?10:2;if(e.key==='ArrowLeft')r.x-=n;else if(e.key==='ArrowRight')r.x+=n;else if(e.key==='ArrowUp')r.y-=n;else if(e.key==='ArrowDown')r.y+=n;else return;e.preventDefault();r.x=clamp(r.x,0,W-r.width);r.y=clamp(r.y,28,H-r.height);syncWindows();syncSelection();});
  });
  let windowLayer=2;
  $$('.rb-window-resizer').forEach(el=>el.addEventListener('pointerdown',e=>{if(!isIdle())return;const name=el.closest('[data-window]').dataset.window;startDrag(e,'window-resize',{name,handle:'se',initial:{...windows[name]}});}));
  region.addEventListener('pointerdown',e=>{if(settings.mode!=='area'||!isIdle()||e.target.closest('button'))return;startDrag(e,'area-move',{initial:{...area}});});
  $$('.rb-area-handle').forEach(el=>el.addEventListener('pointerdown',e=>{e.stopPropagation();if(!isIdle())return;startDrag(e,'area-resize',{handle:el.dataset.handle,initial:{...area}});}));
  $('.rb-area-draw').addEventListener('pointerdown',e=>startDrag(e,'area-draw',{initial:{...area}}));
  bubble.addEventListener('pointerdown',e=>{if(settings.followCursor||e.target.closest('.rb-camera-resize'))return;cameraSnap=null;fixedAnchor=null;startDrag(e,'camera',{initial:{...fixedCamera},connect:Boolean(e.target.closest('.rb-camera-connect'))});renderSlots();});
  $('.rb-camera-resize').addEventListener('pointerdown',e=>{
    e.stopPropagation();if(settings.followCursor||e.button!==0)return;
    cameraSnap=null;const initialSize=bubble.offsetWidth,direction=cameraResizeDirection();
    startDrag(e,'camera-resize',{initialSize,direction,initial:{...fixedCamera}});bubble.classList.add('is-resizing');
  });
  $('.rb-camera-resize').addEventListener('keydown',e=>{
    const direction=cameraResizeDirection(),step=e.shiftKey?10:2;
    const delta=e.key==='ArrowRight'?direction.ux:e.key==='ArrowLeft'?-direction.ux:e.key==='ArrowDown'?direction.uy:e.key==='ArrowUp'?-direction.uy:e.key==='+'||e.key==='='?1:e.key==='-'?-1:0;
    if(!delta)return;e.preventDefault();resizeCamera(settings.cameraSize+Math.sign(delta)*step,e);
  });
  belt.addEventListener('pointerdown',e=>{if(e.target.closest('button')||!isIdle())return;transition=null;previewPlaying=false;startDrag(e,'belt',{initial:{...pose}});});
  function resizedSelection(d,dx,dy,event){
    const windowMode=d.kind==='window-resize',state=selectionState(windowMode?d.name:'area');
    return JamSelectionGeometry.resize(d.initial,d.handle,dx,dy,{bounds:selectionBounds(windowMode),minimum:selectionMinimum(windowMode),ratio:JamSelectionGeometry.ratio(state),shiftKey:event.shiftKey,altKey:event.altKey});
  }
  // Capture also sees moves over sidebar controls; drags keep their bounded coordinates.
  document.addEventListener('pointermove',trackPointer,true);
  desktop.addEventListener('pointermove',e=>{
    if(!active||!drag||e.pointerId!==drag.pointerId)return;
    const p=local(e),d=drag;
    if(d.kind==='area-resize'||d.kind==='window-resize'){
      const preset=selectionState(d.kind==='area-resize'?'area':d.name).preset;
      if(e.altKey!==d.altKey||preset==='custom'&&e.shiftKey!==d.shiftKey){
        // A modifier change locks the current shape without jumping back to the drag start.
        d.initial={...(d.kind==='area-resize'?area:windows[d.name])};d.start=p;d.altKey=e.altKey;d.shiftKey=e.shiftKey;
      }
    }
    const dx=p.x-d.start.x,dy=p.y-d.start.y;
    if(d.kind==='window'){windows[d.name].x=clamp(d.initial.x+dx,0,W-d.initial.width);windows[d.name].y=clamp(d.initial.y+dy,28,H-d.initial.height);syncWindows();}
    if(d.kind==='window-resize'){Object.assign(windows[d.name],resizedSelection(d,dx,dy,e));syncWindows();}
    if(d.kind==='area-move'){area.x=clamp(d.initial.x+dx,0,W-area.width);area.y=clamp(d.initial.y+dy,0,H-area.height);}
    if(d.kind==='area-resize')area=resizedSelection(d,dx,dy,e);
    if(d.kind==='area-draw')area=JamSelectionGeometry.draw(d.start,p,{bounds:selectionBounds(false),minimum:selectionMinimum(false),ratio:JamSelectionGeometry.ratio(selectionState('area'))||(e.shiftKey?d.initial.width/d.initial.height:null),altKey:e.altKey});
    if(d.kind==='camera'){fixedCamera={x:d.initial.x+dx,y:d.initial.y+dy};}
    if(d.kind==='camera-resize'){
      const {ux,uy,gx,gy}=d.direction;
      const travel=dx*ux+dy*uy,leverage=(1+ux*gx+uy*gy)/2;
      resizeCamera(d.initialSize+travel/leverage,e);
      return;
    }
    if(d.kind==='belt'){const half=Math.min(IDLE_WIDTH,W-16)/2;pose.x=clamp(d.initial.x+dx,half+8,W-half-8);pose.y=clamp(d.initial.y+dy,30,H-30);renderBelt();}
    syncSelection();
  });
  function endDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;const d=drag,kind=d.kind,p=local(e),moved=Math.hypot(p.x-d.start.x,p.y-d.start.y)>4;drag=null;bubble.classList.remove('is-resizing');if(kind==='camera'&&e.type==='pointerup'){if(d.connect&&!moved)requestCamera();else snapCamera();}renderSlots();syncSelection();if(kind==='camera-resize')rememberCameraPosition();emit();}
  root.addEventListener('pointerup',endDrag);root.addEventListener('pointercancel',endDrag);root.addEventListener('lostpointercapture',endDrag);
  document.documentElement.addEventListener('pointerleave',e=>{trackPointer(e);pointer.vx=0;pointer.vy=0;pointer.ax=0;pointer.ay=0;pointerTime=0;syncCursor();});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;lastFrame=0;if(!document.hidden){advanceClock();wake();}});
  reduced.addEventListener('change',()=>{if(reduced.matches){previewTime=duration();previewPlaying=false;renderBelt();}renderCamera(0);emit();});
  let lastHome=beltHome();
  function layout(){
    const width=desktop.clientWidth,height=desktop.clientHeight;
    const resized=width!==W||height!==H;
    W=width;H=height;
    if(resized){
      closeMenu(false);drag=null;
      area=JamSelectionGeometry.fit(area,selectionBounds(false),selectionMinimum(false),JamSelectionGeometry.ratio(selectionState('area')));
      for(const [name,rect] of Object.entries(windows))Object.assign(rect,JamSelectionGeometry.fit(rect,selectionBounds(true),selectionMinimum(true),JamSelectionGeometry.ratio(selectionState(name))));
      syncPointerPosition();
      syncWindows();syncSelection();
    }
    const home=beltHome(isIdle()?IDLE_WIDTH:ACTIVE_WIDTH);
    if(home.x!==lastHome.x||home.y!==lastHome.y){
      const docked=transition||!isIdle()||(Math.abs(pose.x-lastHome.x)<1&&Math.abs(pose.y-lastHome.y)<1);
      // Translate both endpoints, preserving spring progress and velocity during layout changes.
      if(transition){
        const dx=home.x-transition.to.x,dy=home.y-transition.to.y;
        transition.from.x+=dx;transition.from.y+=dy;transition.to={...home};
      }else if(docked){pose.x=home.x;pose.y=home.y;}
      else{pose.x=clamp(pose.x,Math.min(IDLE_WIDTH,W-16)/2+8,W-Math.min(IDLE_WIDTH,W-16)/2-8);pose.y=clamp(pose.y,54,H-30);}
      lastHome=home;
    }
    renderBelt();renderCamera(0);
  }
  // The sidebar sits outside the desktop; recording geometry follows the desktop bounds.
  new ResizeObserver(()=>{if(active)layout();}).observe(desktop);
  window.JamRecording={
    getSettings:()=>({...settings}),getState:()=>({stage,elapsed,selectedWindow,area:{...area},bounds:captureBounds(),sizing:{...selectionState()},camera:follower.getState(),cameraAnchor:fixedAnchor,belt:{...pose}}),
    updateSettings,setMode,setStage,selectWindow,resetSelection,setActive,layout,requestCamera,getCameraStatus,setElapsed,previewLimit,getCameraState:()=>camera.getState(),
    getPlayerState:()=>({playing:previewPlaying,time:previewTime,duration:duration(),rate:settings.rate,loop:settings.loop,ready:true,status:stage==='idle'?'Ready':stage==='paused'?'Paused':stage==='limit'?'Approaching limit':'Recording',reducedMotion:reduced.matches}),
    play(){if(!transition||previewTime>=duration())restart();else{previewPlaying=true;wake();emit();}},pause(){previewPlaying=false;emit();},restart,
    seek(time){if(!transition){restart();}previewPlaying=false;previewTime=clamp(time,0,duration());renderBelt();emit();},
    setRate:rate=>updateSettings({rate}),setLoop:loop=>updateSettings({loop}),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  };
  selectionRulers=JamSelectionRulers.create(region,{onChange:syncSelection,onHoverChange:syncCursor,onDragChange:()=>{syncCameraSizing();syncCursor();},onBegin:()=>{closeMenu(false);cornerPin?.clear();},canDrag:()=>!drag});
  selectionNotch=JamSelectionNotch.create(root,{icon,onSize:sizeSelection,onRatio:setSelectionRatio,onOrientation:setSelectionOrientation,
    onPreset:preset=>{
      const bounds=selectionBounds(),minimum=selectionMinimum();
      if(preset.width>bounds.width||preset.height>bounds.height||preset.width<minimum.width||preset.height<minimum.height)return;
      applySelectionRect(JamSelectionGeometry.size(captureBounds(),preset,bounds,minimum,JamSelectionGeometry.ratio(selectionState())));
    },
    onToggleRulers:()=>{if(settings.mode!=='area')return;const state=selectionState();state.rulers=!state.rulers;syncSelection();},
    onChangeWindow:()=>{closeMenu(false);rememberCameraPosition();selectedWindow=null;syncSelection();emit();},
    onOpen:(menu,trigger)=>{closeMenu(false);openMenu=menu;menuTrigger=trigger;cornerPin?.clear();},
    onClose:menu=>{if(openMenu===menu){openMenu=null;menuTrigger=null;}},
  });
  cornerPin=JamCameraPin.create(root,{local,onPin:pinCamera,context:()=>({
    enabled:active&&isIdle()&&settings.camera&&settings.followCursor&&camera.getState().status==='live'&&!drag&&!openMenu&&(settings.mode!=='window'||!!selectedWindow),
    key:cameraPositionKey(),window:settings.mode==='window'?selectedWindow:null,bounds:captureBounds(),slots:cameraSlots(),style:JamCameraPlaceholders.borderStyle(settings),
  })});
  syncWindows();
  JamDefaults.register('recording',{groups:['recording'],read:()=>({recording:{...settings}}),apply:values=>updateSettings(values.recording),onReset(){clearTimeout(clockTimer);clockStamp=0;fixedAnchor=null;cameraSnap=null;stage='idle';elapsed=0;previewPlaying=false;previewTime=0;transition=null;pose=beltHome();velocity={x:0,y:0,width:0};resetSelection();renderBelt();emit();}});
  syncSelection();renderBelt();setActive(JamPlayground.getSurface()==='recording');
})();
