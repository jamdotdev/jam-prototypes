const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const directory=process.env.RECORDING_SOURCE_DIR||path.join(__dirname,'..');
const source=fs.readFileSync(path.join(directory,'recording.js'),'utf8');
function extract(name){
 const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1,`Missing ${name}`);
 const line=source.slice(start,source.indexOf('\n',start));if(line.endsWith('}'))return line;
 const next=source.indexOf('\n  function ',start+1);return source.slice(start,next<0?undefined:next);
}
function environment({size=120,min=12,max=240,followSize=120,anchor='sw',hasCapture=true,reducedMotion=false,width=1000,height=700}={}){
 const context=vm.createContext({console});
 vm.runInContext(fs.readFileSync(path.join(directory,'recording-camera-motion.js'),'utf8'),context);
 vm.runInContext(`
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const settings={mode:'screen',camera:true,followCursor:false,cameraSize:${size},cameraMinSize:${min},cameraMaxSize:${max},followSize:${followSize},gap:20,stiffness:220,damping:26,anticipation:35};
 ${source.match(/^  const ranges=.*$/m)[0]}
 let W=${width},H=${height},active=true,pointerTime=100,pointerClient={clientX:700,clientY:400},pointer={x:700,y:400,vx:0,vy:0,ax:0,ay:0},selectedWindow=null;
 let fixedCamera={x:200,y:500},fixedAnchor=${JSON.stringify(anchor)},cameraPlaced=true,cameraSnap=null,drag=null,resizeAngle=45;
 let releases=0,releaseWasClean=true,snaps=0,remembered=0,wakes=0,changes=0,selectionSyncs=0,cursorSyncs=0,focused=false;
 const classes=new Set(),properties=new Map(),attributes=new Map();
 const bubble={dataset:{},style:{width:'${size}px'},get offsetWidth(){return parseFloat(this.style.width);},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
 const path={setAttribute:(name,value)=>attributes.set(name,value)};
 const handle={dataset:{},style:{setProperty:(name,value)=>properties.set(name,value)},querySelector:()=>path,setAttribute:(name,value)=>attributes.set(name,value),hasPointerCapture:id=>${hasCapture}&&id===7,releasePointerCapture(id){releases++;releaseWasClean=releaseWasClean&&!drag&&!classes.has('is-resizing');endDrag({pointerId:id,type:'lostpointercapture'});}};
 const orbit={style:{}},cameraButton={focus(){focused=true;}};const $=selector=>selector==='#rb-camera-button'?cameraButton:selector.includes('orbit')?orbit:handle;
 const root={getBoundingClientRect:()=>({left:0,top:0,width:W,height:H})};
 const reduced={matches:${reducedMotion}},performance={now:()=>1000},camera={stop(){},getState:()=>({deviceId:'mac'}),request(){throw Error('Resizing must not request camera media');}};
 const follower=JamCameraMotion.create({x:fixedCamera.x,y:fixedCamera.y,size:${size}});
 const captureBounds=()=>({x:0,y:0,width:W,height:H}),rememberCameraPosition=()=>remembered++,renderSlots=()=>{},renderBelt=()=>{},emit=()=>{},syncCursor=()=>cursorSyncs++,wake=()=>wakes++,JamDefaults={changed(){changes++;}};
 const snapCamera=()=>snaps++,requestCamera=()=>{throw Error('Resizing must not request camera media');};
 const sample=()=>{throw Error('Resize handoff must cancel a stale snap');};
 ${['local','trackPointer','updateSettings','cameraResizeDirection','renderCameraResizer','cameraSlots','nearestSlot','renderCamera','resizeCamera','endDrag'].map(extract).join('\n')}
 function syncSelection(){selectionSyncs++;renderCamera(0);}
 globalThis.begin=()=>{drag={kind:'camera-resize',pointerId:7,target:handle,initialSize:bubble.offsetWidth,initial:{...fixedCamera},direction:{gx:1,gy:-1,ux:Math.SQRT1_2,uy:-Math.SQRT1_2}};classes.add('is-resizing');};
 globalThis.resize=(size,keyboard=false)=>resizeCamera(size,keyboard?{type:'keydown',key:'-',target:handle}:{type:'pointermove',pointerId:7,clientX:710,clientY:390,target:handle});
 globalThis.up=()=>endDrag({type:'pointerup',pointerId:7,clientX:710,clientY:390});
 globalThis.settings=()=>({...settings});
 globalThis.state=()=>({releases,releaseWasClean,snaps,remembered,wakes,changes,selectionSyncs,cursorSyncs,focused,dragging:!!drag,resizing:classes.has('is-resizing'),pointerClient,pointerTime,camera:follower.getState(),fixedCamera:{...fixedCamera}});
 globalThis.update=updateSettings;
 globalThis.gapAt=size=>{renderCameraResizer(size);return properties.get('--resize-radius');};
 globalThis.arcAt=size=>{renderCameraResizer(size);return attributes.get('transform');};
 globalThis.frame=()=>renderCamera(1/60);
 `,context);
 return context;
}
{
 const e=environment();e.begin();e.resize(56);assert.equal(e.settings().followCursor,false,'Exactly 56px remains stationary');assert.equal(e.state().releases,0);
 e.resize(54);assert.equal(e.settings().followCursor,true,'Shrinking below the threshold enables Follow cursor');assert.equal(e.settings().followSize,120,'Resize handoff preserves the configured follower size');assert.equal(e.state().releases,1);assert.equal(e.state().releaseWasClean,true,'Release occurs after clearing drag and resize state');assert.equal(e.state().dragging,false);assert.equal(e.state().resizing,false);
 assert.deepEqual({...e.state().pointerClient},{clientX:710,clientY:390},'Pointer handoff retains the actual resize event coordinates');assert.ok(e.state().pointerTime>0,'The handoff restores a current pointer after follow resets it');
 const before=e.state();e.up();assert.equal(e.state().snaps,0,'The later pointerup cannot snap the follower back');assert.equal(e.state().releases,before.releases);
}
{
 const e=environment();e.begin();e.resize(18);assert.equal(e.settings().followCursor,true,'A fast shrink cannot skip the handoff band');assert.equal(e.settings().followSize,120,'Fast shrinking preserves the configured follower size');
}
{
 const e=environment({size:24});e.begin();e.resize(30);assert.equal(e.settings().followCursor,false,'Growing an already-small stationary bubble does not enable following');
}
{
 const e=environment({min:72});e.begin();e.resize(30);assert.equal(e.settings().cameraSize,72);assert.equal(e.settings().followCursor,false,'A minimum above the handoff threshold keeps the bubble stationary');
}
{
 const e=environment({size:58});e.resize(54,true);assert.equal(e.settings().followCursor,true,'Direct keyboard shrinking can hand off');assert.equal(e.state().releases,0,'Keyboard resizing has no pointer capture to release');assert.equal(e.state().focused,true,'Keyboard focus moves off the disappearing resize handle');assert.deepEqual({...e.state().pointerClient},{clientX:700,clientY:400},'Keyboard input keeps the observed pointer and invents no coordinates');
}
{
 const e=environment({hasCapture:false});e.begin();e.resize(54);assert.equal(e.settings().followCursor,true);assert.equal(e.state().releases,0,'Lost capture is not released again');assert.equal(e.state().dragging,false);
}
{
 const e=environment();e.update({cameraSize:48});assert.equal(e.settings().followCursor,false,'Playground sizes do not enable Follow cursor');e.update({cameraMinSize:12,cameraMaxSize:40});assert.equal(e.settings().followCursor,false,'Changing limits does not enable Follow cursor');
}
{
 const e=environment({anchor:null});e.begin();e.resize(54);assert.equal(e.state().camera.x,167);assert.equal(e.state().camera.y,533,'A free bubble starts the follow spring from its resized pose');
}
{
 const e=environment({reducedMotion:true,width:80,height:90});e.begin();e.resize(54);assert.equal(e.settings().followCursor,true);e.frame();assert.equal(e.state().camera.size,72,'Reduced motion applies the configured diameter within capture bounds immediately');
 for(let i=0;i<10;i++){e.frame();const p=e.state().camera,r=p.size/2;assert.ok(p.x-r>=4&&p.x+r<=76&&p.y-r>=4&&p.y+r<=86,'The reduced-motion handoff stays inside capture bounds');}
}
{
 const e=environment({width:80,height:90});e.begin();e.resize(18);assert.equal(e.settings().followCursor,true);
 for(let i=0;i<120;i++){e.frame();const p=e.state().camera,r=p.size/2;assert.ok(p.x-r>=4-1e-6&&p.x+r<=76+1e-6&&p.y-r>=4-1e-6&&p.y+r<=86+1e-6,'The animated handoff stays inside capture bounds while its diameter grows toward the configured follower size');}
 assert.ok(Math.abs(e.state().camera.size-72)<.01,'The fast-shrink handoff respects the available capture size');
}
{
 const e=environment();assert.equal(e.gapAt(12),'9px');assert.equal(e.gapAt(120),'64px');assert.equal(e.gapAt(240),'128px');assert.equal(e.gapAt(480),'248px');
 const fullSizeArc=e.arcAt(120);for(const size of [12,24,48,96,240,480])assert.equal(e.arcAt(size),fullSizeArc,'The visible resizer stays the same size across bubble diameters');
}
for(const target of [12,96,160]){
 const e=environment({followSize:48});e.update({followSize:target});e.begin();e.resize(30);
 assert.equal(e.settings().followSize,target,'Handoff keeps the latest playground value, including values outside the resize band');
 for(let i=0;i<120;i++)e.frame();
 assert.ok(Math.abs(e.state().camera.size-target)<.01,'The follower settles at the selected playground diameter');
}
console.log('PASS: resize threshold, fast shrink, follow size, capture release ordering, late pointerup, keyboard handoff, minimum limits, preset isolation, free-bubble continuity, capture bounds, reduced motion, and optical gap.');
