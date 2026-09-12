const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const directory=process.env.RECORDING_SOURCE_DIR||path.join(__dirname,'..');
const source=fs.readFileSync(path.join(directory,'recording.js'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1,`Missing ${name}`);const next=source.indexOf('\n  function ',start+1);return source.slice(start,next<0?undefined:next);}
function environment(saved='{}'){
 const storage=new Map([['jam-recording-camera-positions-v1',saved]]),calls=[],tracks=[];
 let denied=false;
 const media={getUserMedia:async constraints=>{calls.push(constraints);if(denied)throw {name:'NotAllowedError'};const track={readyState:'live',label:'Mac camera',addEventListener(){},stop(){this.readyState='ended';},getSettings(){return{deviceId:'mac'};}};tracks.push(track);return{getTracks:()=>[track],getVideoTracks:()=>[track]};}};
 const context=vm.createContext({console,navigator:{mediaDevices:media},isSecureContext:true,addEventListener(){},removeEventListener(){},sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(path.join(directory,'recording-camera.js'),'utf8'),context);
 vm.runInContext(`
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 let W=1000,H=700,active=false,raf=0,lastFrame=0,clockStamp=0,clockTimer=0,drag=null,pointerTime=0,pointerClient=null;
 let stage='idle',selectedWindow=null,area={x:100,y:80,width:500,height:400};
 const windows={finder:{x:80,y:40,width:420,height:360},browser:{x:300,y:100,width:600,height:450}};
 const settings={mode:'screen',camera:true,followCursor:false,cameraSize:120,cameraMinSize:12,cameraMaxSize:240,followSize:60};
 let fixedCamera={x:84,y:616},cameraPlaced=false,fixedAnchor=null,cameraSnap=null;
 const reduced={matches:true},bubble={dataset:{},style:{}},pointer={x:400,y:300};
 const follower={steps:0,value:{x:84,y:616,size:120},snap(value){this.value={...value};},getState(){return this.value;},step(){this.steps++;return this.value;}};
 const camera=JamRecordingCamera.create({pause(){},play(){return Promise.resolve();}});
 const JamDefaults={changed(){}},performance={now:()=>1000};
 const emit=()=>{},wake=()=>{},renderBelt=()=>{},syncCursor=()=>{},renderCameraResizer=()=>{},scheduleClock=()=>{},advanceClock=()=>{},closeMenu=()=>{},cancelAnimationFrame=()=>{},layout=()=>{};
 ${['requestCamera','captureBounds','isIdle','loadCameraPositions','cameraPositionKey','rememberCameraPosition','placeCamera','setMode','selectWindow','updateSettings','cameraSlots','renderCamera','setActive'].map(extract).join('\n')}
 const cameraPositions=loadCameraPositions();
 function syncSelection(){if(!cameraPlaced)placeCamera();renderCamera(0);}
 function setStage(next){stage=next;}
 globalThis.engine={setActive,setMode,selectWindow,updateSettings,requestCamera,rememberCameraPosition,placeCamera,camera};
 globalThis.place=(x,y,anchor=null)=>{fixedCamera={x,y};fixedAnchor=anchor;cameraPlaced=true;renderCamera(0);rememberCameraPosition();};
 globalThis.position=()=>({...fixedCamera,anchor:fixedAnchor});
 globalThis.saved=()=>JSON.parse(JSON.stringify(cameraPositions));
 globalThis.followSteps=()=>follower.steps;
 globalThis.observePointer=()=>pointerClient={clientX:400,clientY:300};
 globalThis.followerMove=(x,y)=>{follower.value={x,y,size:60};};
 globalThis.resizeBounds=()=>{W=700;H=500;};
 `,context);
 return {context,engine:context.engine,calls,tracks,storage,deny:()=>denied=true};
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const e=environment();assert.equal(e.calls.length,0);
 e.engine.setActive(true);await turn();assert.equal(e.calls.length,1,'Enabled recording surface mounts camera automatically');assert.equal(e.engine.camera.getState().status,'live');
 assert.deepEqual({...e.context.position()},{x:84,y:616,anchor:'sw'},'First placement is bottom-left');
 e.context.place(750,140,'ne');const screen={...e.context.position()};
 e.engine.setMode('area');e.context.place(400,300,'e');const area={...e.context.position()};
 e.engine.setMode('window');e.engine.selectWindow('finder');e.context.place(200,200,'n');const finder={...e.context.position()};
 e.engine.selectWindow('browser');e.context.place(700,350,null);const browser={...e.context.position()};
 e.engine.selectWindow('finder');assert.deepEqual({...e.context.position()},finder,'Each selected window restores its own dock');
 e.engine.setMode('area');assert.deepEqual({...e.context.position()},area,'Area restores its last dock');
 e.engine.setMode('screen');assert.deepEqual({...e.context.position()},screen,'Screen restores its last dock');
 assert.equal(e.calls.length,1,'Changing capture modes keeps the existing stream');
 e.engine.updateSettings({followCursor:true});assert.equal(e.context.followSteps(),0,'Follow waits at the saved dock before the first real pointer event');assert.deepEqual({...e.context.position()},screen);e.context.observePointer();e.engine.updateSettings({followCursor:true});assert.equal(e.context.followSteps(),1,'A real pointer position enables following');e.context.followerMove(350,280);e.engine.updateSettings({followCursor:false});assert.deepEqual({...e.context.position()},screen,'Leaving Follow cursor restores the stationary placement');
 e.engine.setActive(false);assert.equal(e.tracks[0].readyState,'ended','Leaving the surface releases the camera');
 e.engine.setActive(true);await turn();assert.equal(e.calls.length,2);assert.deepEqual({...e.context.position()},screen);
 e.engine.updateSettings({camera:false});e.engine.setActive(false);e.engine.setActive(true);await turn();assert.equal(e.calls.length,2,'Explicit camera off survives surface switches');
 e.engine.updateSettings({camera:true});await turn();assert.equal(e.calls.length,3,'Enabling camera in the playground starts the stream');
 e.engine.updateSettings({camera:false});e.engine.setActive(false);e.engine.updateSettings({camera:true});await turn();assert.equal(e.calls.length,3,'Settings on an inactive surface do not acquire media');
 e.engine.setActive(true);await turn();assert.equal(e.calls.length,4);e.engine.setActive(false);
 const reload=environment(e.storage.get('jam-recording-camera-positions-v1'));reload.engine.setActive(true);await turn();assert.deepEqual({...reload.context.position()},screen,'Reload restores the last placement in this session');
 reload.engine.setMode('window');reload.engine.selectWindow('browser');assert.deepEqual({...reload.context.position()},browser,'Free positions survive reload and context switches');
 reload.engine.setActive(false);
 const clean=environment('{"screen":{"u":"bad","v":0}}');clean.engine.setActive(true);await turn();assert.equal(clean.context.position().anchor,'sw','Malformed saved positions use the bottom-left fallback');clean.engine.setActive(false);
 const denied=environment();denied.deny();denied.engine.setActive(true);await turn();assert.equal(denied.engine.camera.getState().status,'denied');denied.engine.updateSettings({followCursor:true});denied.engine.setMode('area');denied.engine.setActive(false);denied.engine.setActive(true);await turn();assert.equal(denied.calls.length,1,'A rejected camera request never enters an automatic prompt loop');denied.engine.setActive(false);
 console.log('PASS: automatic camera mount, camera-off preservation, surface release/remount, denial latch, per-context stationary placement, follow restoration, reload, and malformed storage fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
