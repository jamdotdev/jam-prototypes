const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, '../recording.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}
function harness(stage = 'recording', elapsed = 10) {
  const context = vm.createContext({ console });
  vm.runInContext(`
    let stage=${JSON.stringify(stage)},elapsed=${elapsed},active=true,raf=0,lastFrame=1000;
    let clockStamp=1000,clockTimer=0,previewTime=0,previewPlaying=true,loopHold=0;
    const LIMIT=1800,IDLE_WIDTH=607,ACTIVE_WIDTH=185;
    const settings={loop:true,rate:1,beltDamping:28,beltSpring:280,warningSeconds:10,mode:'screen',camera:false,followCursor:false};
    const reduced={matches:false},document={hidden:false};
    const pointer={vx:0,vy:0,ax:0,ay:0};
    let velocity={x:0,y:0,width:0},pose={x:0,y:0,width:607},cameraSnap=null,selectedWindow=null;
    let transition={from:{...pose},to:{x:0,y:0,width:185},velocity:{...velocity}};
    let frames=0,now=1000,finished=0,finishedAt=null;
    const performance={now:()=>now};
    const requestAnimationFrame=()=>++frames;
    const clockRunning=()=>stage==='recording'||stage==='limit';
    const renderCamera=()=>{},renderBelt=()=>{},syncControls=()=>{},syncTimer=()=>{},emit=()=>{},syncSelection=()=>{},scheduleClock=()=>{};
    const selectWindow=name=>selectedWindow=name;
    const beltHome=width=>({x:0,y:0,width});
    function finishRecording(){finished++;finishedAt=elapsed;active=false;stage='idle';elapsed=0;previewPlaying=false;}
    ${['duration','advanceClock','animateBelt','loopBeltAnimation','tick','wake','restart'].map(extract).join('\n')}
    globalThis.state=()=>({stage,elapsed,frames,previewTime,finished,finishedAt,active,transition});
    globalThis.step=()=>{now+=1000/60;tick(now);};
    globalThis.restartRecording=restart;
  `, context);
  return context;
}
function run(h, count) {
  let loops=0,previous=h.state().previewTime;
  for(let i=0;i<count;i++){
    h.step();const state=h.state();
    if(state.previewTime<previous)loops++;
    previous=state.previewTime;
    if(!state.active)break;
  }
  return loops;
}
{
  const h=harness();assert.ok(run(h,360)>=2);const state=h.state();
  assert.ok(Math.abs(state.elapsed-16)<1e-7, `Deadline advanced to ${state.elapsed}`);
  assert.equal(state.frames,360,'Only one animation frame is scheduled per tick');
  assert.equal(state.stage,'recording');
}
for(const stage of ['paused','idle']){
  const initial=stage==='paused'?42:0,h=harness(stage,initial);
  assert.ok(run(h,360)>=2);assert.equal(h.state().stage,stage);assert.equal(h.state().elapsed,initial);
}
{
  const h=harness('limit',1794);assert.ok(run(h,361)>=2);
  assert.equal(h.state().finished,1);assert.equal(h.state().finishedAt,1800);
}
{
  const h=harness('paused',42);h.restartRecording();assert.equal(h.state().stage,'recording');assert.equal(h.state().elapsed,0);
}
console.log('PASS: repeated belt loops preserve elapsed time, paused/idle stages, the 30-minute deadline, and one RAF per tick; explicit restart resets elapsed.');
