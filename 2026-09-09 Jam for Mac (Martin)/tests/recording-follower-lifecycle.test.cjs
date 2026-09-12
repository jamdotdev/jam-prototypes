const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const directory=process.env.RECORDING_SOURCE_DIR||path.join(__dirname,'..');
const source=fs.readFileSync(path.join(directory,'recording.js'),'utf8');
function extract(name){
 const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1,`Missing ${name}`);
 const next=source.indexOf('\n  function ',start+1);return source.slice(start,next<0?undefined:next);
}
const context=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(directory,'recording-camera-motion.js'),'utf8'),context);
vm.runInContext(`
 let active=true,raf=0,lastFrame=0,previewPlaying=false,cameraSnap=null;
 let cameraRequested=false,pointerTime=0,pointerClient=null,drag=null,W=1000,H=700;
 let pointer={x:200,y:200,vx:0,vy:0,ax:0,ay:0};
 const settings={camera:false,followCursor:true,rate:1};
 const document={hidden:false};const reduced={matches:false};
 const frames=new Map();let frameId=0,now=1000,requests=0,renders=0;
 const performance={now:()=>now};
 const requestAnimationFrame=cb=>{frames.set(++frameId,cb);return frameId;};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 let rect={left:0,top:0,width:1000,height:700};
 const root={getBoundingClientRect:()=>rect};
 const JamDefaults={changed(){}};
 const camera={request(){requests++;return Promise.resolve({status:'live'});}};
 const emit=()=>{},syncSelection=()=>{},syncCursor=()=>{},clockRunning=()=>false,advanceClock=()=>true;
 const follower=JamCameraMotion.create({x:100,y:100,size:48});
 const renderCamera=dt=>{renders++;follower.step({pointer,bounds:{x:0,y:0,width:W,height:H},size:48,gap:12,pinOutside:true,dt});};
 function updateSettings(patch){Object.assign(settings,patch);syncSelection();wake();}
 ${['local','requestCamera','tick','wake'].map(extract).join('\n')}
 globalThis.move=(x,y)=>{pointer.x=x;pointer.y=y;};
 globalThis.run=count=>{for(let i=0;i<count;i++){now+=1000/60;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(now));}};
 globalThis.state=()=>({camera:follower.getState(),pending:frames.size,requests,renders});
 globalThis.activate=requestCamera;
`,context);
(async()=>{
 await context.activate();assert.equal(context.state().requests,1);
 assert.equal(context.state().pending,1,'Enabling the camera must restart its idle animation loop');
 context.move(250,200);context.run(90);const first=context.state().camera;
 context.move(650,300);context.run(90);const second=context.state().camera;
 assert.ok(second.x-first.x>350,'The reactivated live camera follows new pointer positions');
 assert.equal(context.state().pending,1,'Motion retains exactly one pending animation frame');
 vm.runInContext(`${['syncPointerPosition','trackPointer'].map(extract).join('\n')}`,context);
 vm.runInContext(`trackPointer({clientX:980,clientY:300,pointerId:1,isPrimary:true});rect={left:12,top:12,width:680,height:676};W=680;H=676;syncPointerPosition();`,context);
 context.run(90);assert.equal(context.state().camera.mode,'pinned','Resizing the desktop reprojects the stationary pointer outside capture bounds');
 vm.runInContext(`trackPointer({clientX:850,clientY:500,pointerId:1,isPrimary:true});`,context);context.run(90);
 const parked=context.state().camera;
 vm.runInContext(`trackPointer({clientX:950,clientY:600,pointerId:1,isPrimary:true});`,context);context.run(90);
 assert.ok(Math.hypot(context.state().camera.x-parked.x,context.state().camera.y-parked.y)<.01,'The camera holds its dock while the pointer moves over the sidebar');
 vm.runInContext(`trackPointer({clientX:400,clientY:300,pointerId:1,isPrimary:true});`,context);context.run(90);
 assert.equal(context.state().camera.mode,'following','Reentering the inset canvas reconnects the follower');
 vm.runInContext(`frames.clear();raf=0;trackPointer({clientX:410,clientY:300,pointerId:1,isPrimary:true});`,context);
 assert.equal(context.state().pending,1,'Pointer movement wakes an idle follower');
 console.log('PASS: camera reactivation, one motion loop, inset coordinate reprojection, sidebar parking, reentry, and pointer wakeup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
