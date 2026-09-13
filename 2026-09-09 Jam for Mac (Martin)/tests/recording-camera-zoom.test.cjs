const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const directory=process.env.RECORDING_SOURCE_DIR||path.join(__dirname,'..');
const source=fs.readFileSync(path.join(directory,'recording.js'),'utf8');
function extract(name){const start=source.indexOf(`  function ${name}(`);assert.notEqual(start,-1);return source.slice(start,source.indexOf('\n  function ',start+1));}
const context=vm.createContext({console});
vm.runInContext(`
  const settings={cameraZoom:1,cameraSize:120,cameraMinSize:12,cameraMaxSize:240,followSize:44,followCursor:false,camera:true,mirror:false,mode:'screen'};
  ${source.match(/^  const ranges=.*$/m)[0]}
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  let active=true,cameraSnap=null,pointerTime=100,cameraPlaced=true,selectedWindow=null,changes=0;
  const video={style:{}},$=()=>video,renderBelt=()=>{},emit=()=>{},wake=()=>{},rememberCameraPosition=()=>{};
  const camera={stop(){throw Error('Zoom must keep the video stream mounted');}},JamDefaults={changed(){changes++;}};
  ${['syncCameraZoom','updateSettings'].map(extract).join('\n')}
  const syncSelection=syncCameraZoom;
  globalThis.update=updateSettings;globalThis.transform=()=>video.style.transform;globalThis.state=()=>({...settings});
`,context);
context.update({cameraZoom:2});assert.equal(context.transform(),'scale(2) scaleX(1)');
context.update({mirror:true});assert.equal(context.transform(),'scale(2) scaleX(-1)');
context.update({followCursor:true});assert.equal(context.transform(),'scale(2) scaleX(-1)');assert.equal(context.state().cameraSize,120);assert.equal(context.state().followSize,44);
context.update({cameraZoom:20});assert.equal(context.state().cameraZoom,3);
context.update({cameraZoom:-1});assert.equal(context.state().cameraZoom,1);
context.update({cameraZoom:NaN});assert.equal(context.state().cameraZoom,1);
context.update({cameraZoom:1.75});assert.equal(context.transform(),'scale(1.75) scaleX(-1)');
assert.match(fs.readFileSync(path.join(directory,'recording.css'),'utf8'),/\.rb-camera-preview\{[^}]*overflow:hidden/);
assert.match(fs.readFileSync(path.join(directory,'playground-schema.js'),'utf8'),/recordingSetting\('cameraZoom','Camera zoom',1,3,\.05,'×'\)/);
console.log('PASS: zoom applies immediately, composes with mirroring, preserves bubble sizes and media, clamps values, and has a playground control.');
