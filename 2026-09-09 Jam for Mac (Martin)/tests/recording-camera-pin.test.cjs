const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const directory = process.env.RECORDING_SOURCE_DIR || path.join(__dirname, '..');
const source = fs.readFileSync(path.join(directory, 'recording.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1);
  const line = source.slice(start, source.indexOf('\n', start));
  return line.endsWith('}') ? line : source.slice(start, source.indexOf('\n  function ', start + 1));
}
class Element {
  constructor(parent = null) {
    this.parent = parent; this.dataset = {}; this.style = {}; this.listeners = new Map(); this.attributes = {}; this.nodes = new Map();
    this.classes = new Set(); this.classList = { toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key) };
  }
  append(child) { child.parent = this; this.child = child; }
  contains(el) { for (; el; el = el.parent) if (el === this) return true; return false; }
  closest(selector) { return selector === '[data-window]' ? this.window || null : this.action ? this : null; }
  setAttribute(key, value) { this.attributes[key] = value; }
  querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element(this)); return this.nodes.get(selector); }
  animate(frames, options) { this.animation = { frames, options, canceled: false, cancel() { this.canceled = true; } }; return this.animation; }
  addEventListener(type, fn, options = {}) {
    const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list);
    options.signal?.addEventListener('abort', () => this.listeners.set(type, list.filter(item => item !== fn)), { once: true });
  }
  dispatch(type, event = {}) {
    event.type = type; event.preventDefault ||= () => event.prevented = true;
    event.stopPropagation ||= () => event.stopped = true;
    event.stopImmediatePropagation ||= () => event.stopped = true;
    for (const fn of this.listeners.get(type) || []) fn(event);
    return event;
  }
  setPointerCapture(id) { this.capture = id; }
  hasPointerCapture(id) { return this.capture === id; }
  releasePointerCapture(id) { assert.equal(this.capture, id); this.capture = null; this.dispatch('lostpointercapture', { pointerId: id }); }
  focus() { this.focused = true; }
  remove() { this.removed = true; }
}
function environment(mode = 'screen', reducedMotion = false) {
  const root = new Element(), content = new Element(root), bubble = new Element(root), status = new Element(root);
  const document = new Element(), window = new Element();
  document.hidden = false; document.createElement = () => new Element();
  let hit = content, now = 0, timerId = 0; const timers = new Map();
  document.elementFromPoint = () => hit;
  const context = vm.createContext({ console, document, window, root, bubble, status, AbortController,
    setTimeout(fn, ms) { timers.set(++timerId, { fn, at: now + ms }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  // The actual pin eligibility, geometry, docking spring and settings remain under test.
  vm.runInContext(fs.readFileSync(path.join(directory, 'recording-camera-placeholders.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(directory, 'recording-camera-pin.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(directory, 'recording-camera-motion.js'), 'utf8'), context);
  const defaults = fs.readFileSync(path.join(directory, 'playground-defaults-data.js'), 'utf8').replace('window.JamDefaultValues', 'globalThis.JamDefaultValues');
  vm.runInContext(defaults, context);
  const factoryStart = source.indexOf('context:()=>({');
  const factoryEnd = source.indexOf('})});', factoryStart) + 2;
  const factory = source.slice(factoryStart + 'context:'.length, factoryEnd);
  vm.runInContext(`
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),reduced={matches:${reducedMotion}};
    const settings={...JamDefaultValues.groups.recording,placeholderActiveStroke:1,placeholderContrastColor:'#666666',placeholderContrastActiveColor:'#333333',placeholderContrastEdgeColor:'#ffffff',camera:true,cameraSize:120,followSize:44,followCursor:true,mode:${JSON.stringify(mode)}};
    let W=1000,H=700,active=true,stage='idle',selectedWindow=${mode === 'window' ? "'browser'" : 'null'},drag=null,openMenu=null,media='live';
    let area={x:200,y:120,width:600,height:450},windows={browser:{x:200,y:120,width:600,height:450}};
    let fixedCamera={x:350,y:300},fixedAnchor=null,cameraSnap=null,cameraPlaced=true,pointerClient={clientX:400,clientY:300},pointer={x:400,y:300};
    const follower=JamCameraMotion.create({x:350,y:300,size:44}),camera={getState:()=>({status:media})};
    let saves=0,notifications=0,wakes=0;
    const JamDefaults={changed(){notifications++;}},rememberCameraPosition=()=>saves++,wake=()=>wakes++,emit=()=>{};
    const $=()=>status,renderCameraResizer=()=>{};
    function syncSelection(){renderCamera(0);cornerPin?.refresh();}
    ${['captureBounds','isIdle','cameraPositionKey','cameraSlots','nearestSlot','sample','snapCamera','pinCamera','renderCamera'].map(extract).join('\n')}
    const local=p=>({x:p.clientX-12,y:p.clientY-12});
    const getContext=${factory};
    const cornerPin=JamCameraPin.create(root,{local,context:getContext,onPin:pinCamera});
    globalThis.engine={cornerPin,pinCamera,slots:cameraSlots,bounds:captureBounds,frame:()=>renderCamera(1/60),
      change(values){for(const [key,value]of Object.entries(values)){if(key==='stage')stage=value;else if(key==='active')active=value;else if(key==='selectedWindow')selectedWindow=value;else if(key==='media')media=value;else if(key==='drag')drag=value;else if(key==='openMenu')openMenu=value;else if(key==='bounds'){area={...value};windows.browser={...value};}else settings[key]=value;}cornerPin.refresh();},
      state:()=>({settings:{...settings},camera:follower.getState(),fixedAnchor,saves,notifications,wakes,snapping:!!cameraSnap,focused:bubble.focused})};
  `, context);
  const engine = context.engine, button = root.child;
  return { engine, root, button, document, window, bubble, status,
    move(x, y, buttons = 0, id = 1) { return document.dispatch('pointermove', { clientX: x + 12, clientY: y + 12, pointerId: id, buttons }); },
    down(x, y, extra = {}) { return root.dispatch('pointerdown', { clientX: x + 12, clientY: y + 12, pointerId: 1, button: 0, ...extra }); },
    up() { document.dispatch('pointerup', { pointerId: 1 }); },
    hit(kind) { const el = new Element(root); el.action = kind === 'action'; if (kind === 'other-window') el.window = { dataset: { window: 'finder' } }; hit = kind === 'sidebar' ? new Element() : kind === 'button' ? button : el; },
    time(ms) { const until = now + ms; while (true) { const next = [...timers].filter(([,t]) => t.at <= until).sort((a,b) => a[1].at-b[1].at)[0]; if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); } now = until; },
    pending: () => timers.size,
  };
}
for (const mode of ['screen', 'window', 'area']) for (const corner of ['nw','ne','sw','se']) {
  const e=environment(mode), slot=e.engine.slots().find(s=>s.name===corner);
  e.move(slot.x,slot.y); assert.ok(e.button.classes.has('is-visible'), `${mode} ${corner} is discoverable`);
  const border=e.button.querySelector('.rb-camera-slot-border').querySelector('circle');
  assert.equal(border.attributes['stroke-opacity'],.85);
  assert.equal(border.attributes.stroke,'#666666');
  const baseWidth=border.attributes['stroke-width'],radius=border.attributes.r,dashes=border.attributes['stroke-dasharray'];
  assert.equal(e.button.dataset.corner,corner);
  assert.ok(e.down(slot.x,slot.y).stopped, 'Corner holds cannot start area or window drags');
  assert.equal(border.attributes['stroke-opacity'],1);
  assert.equal(border.attributes.stroke,'#333333');
  assert.equal(border.attributes['stroke-width'],baseWidth+1);
  assert.equal(border.attributes.r,radius);assert.equal(border.attributes['stroke-dasharray'],dashes,'Holding thickens the same dashed circle');
  assert.equal(border.animation.options.duration,500);
  assert.ok(border.animation.frames.length>2, 'The existing dashed border connects gap by gap');
  assert.ok(border.animation.frames.every(frame=>!('strokeDashoffset' in frame)), 'No separate inset progress ring');
  e.time(499); assert.equal(e.engine.state().settings.followCursor,true); assert.equal(e.engine.state().saves,0);
  const before=e.engine.state().camera;
  e.time(1); const after=e.engine.state();
  assert.equal(after.settings.followCursor,false); assert.equal(after.fixedAnchor,corner); assert.equal(e.root.capture,null);
  assert.equal(after.settings.followSize,44, 'Pinning retains the follower preference');
  assert.equal(after.camera.size,before.size, 'Pinning starts at the current diameter');
  assert.ok(Math.hypot(after.camera.x-before.x,after.camera.y-before.y)<.001, 'No jump to a remembered stationary position');
  for(let i=0;i<45;i++){e.engine.frame();const p=e.engine.state().camera,b=e.engine.bounds(),r=p.size/2;assert.ok(p.x-r>=b.x+4-.001&&p.x+r<=b.x+b.width-4+.001&&p.y-r>=b.y+4-.001&&p.y+r<=b.y+b.height-4+.001);}
  const landed=e.engine.state();assert.equal(landed.camera.size,120);assert.equal(landed.camera.x,slot.x);assert.equal(landed.camera.y,slot.y);
  e.up();assert.equal(e.pending(),0);assert.equal(landed.notifications,1);
  assert.ok(e.root.dispatch('click',{detail:1}).prevented, 'Release does not activate content below the vanished placeholder');
  e.engine.cornerPin.destroy();
}
for (const cancel of ['release','move','outside','cancel','capture','blur','hidden','escape','recording','paused','limit','off','no-follow','no-video','surface','selection','bounds','drag','menu']) {
  const e=environment('window'),p=e.engine.slots().find(s=>s.name==='nw');e.move(p.x,p.y);e.down(p.x,p.y);e.time(250);
  if(cancel==='release')e.up();
  else if(cancel==='move')e.move(p.x+11,p.y,1);
  else if(cancel==='outside')e.move(-10,-10,1);
  else if(cancel==='cancel')e.document.dispatch('pointercancel',{pointerId:1});
  else if(cancel==='capture')e.root.releasePointerCapture(1);
  else if(cancel==='blur')e.window.dispatch('blur');
  else if(cancel==='hidden'){e.document.hidden=true;e.document.dispatch('visibilitychange');}
  else if(cancel==='escape')assert.ok(e.document.dispatch('keydown',{key:'Escape'}).stopped);
  else e.engine.change(cancel==='recording'||cancel==='paused'||cancel==='limit'?{stage:cancel}:cancel==='off'?{camera:false}:cancel==='no-follow'?{followCursor:false}:cancel==='no-video'?{media:'requesting'}:cancel==='surface'?{active:false}:cancel==='selection'?{selectedWindow:null}:cancel==='bounds'?{bounds:{x:180,y:120,width:600,height:450}}:cancel==='drag'?{drag:{}}:{openMenu:{}});
  e.time(600);assert.equal(e.engine.state().saves,0,`${cancel} cancels the hold`);assert.equal(e.pending(),0);assert.equal(e.root.capture,null);
  e.engine.cornerPin.destroy();
}
for(const kind of ['action','sidebar','other-window']){
  const e=environment('window'),p=e.engine.slots()[0];e.hit(kind);e.move(p.x,p.y);e.down(p.x,p.y);e.time(600);assert.equal(e.engine.state().saves,0,`Never intercept ${kind}`);assert.ok(!e.button.classes.has('is-visible'));e.engine.cornerPin.destroy();
}
{
  const e=environment(),p=e.engine.slots()[0];e.move(p.x,p.y);
  const border=e.button.querySelector('.rb-camera-slot-border').querySelector('circle'),baseWidth=border.attributes['stroke-width'];
  e.engine.change({placeholderActiveStroke:2.5});e.down(p.x,p.y);
  assert.equal(border.attributes['stroke-width'],baseWidth+2.5,'The hold uses the playground increase');
  e.time(250);e.up();assert.equal(border.attributes['stroke-width'],baseWidth,'Releasing restores the base stroke');
  assert.equal(e.pending(),0);
  e.down(p.x,p.y);e.time(250);e.engine.change({placeholderActiveStroke:.5});e.time(500);
  assert.equal(border.attributes['stroke-width'],baseWidth);assert.equal(e.engine.state().saves,0,'Changing the increase cancels a stale held gesture');
  e.engine.cornerPin.destroy();
}
{
  const e=environment(),p=e.engine.slots()[0];e.move(p.x,p.y);
  const border=e.button.querySelector('.rb-camera-slot-border').querySelector('circle');
  e.engine.change({placeholderContrastColor:'#445566',placeholderContrastActiveColor:'#112233'});
  assert.equal(border.attributes.stroke,'#445566','Normal pin stroke follows the playground color immediately');
  e.down(p.x,p.y);assert.equal(border.attributes.stroke,'#112233','Held pin stroke uses its own playground color');
  e.time(250);e.engine.change({placeholderContrastEdgeColor:'#ffffcc'});e.time(500);
  assert.equal(e.engine.state().saves,0,'Changing contrast styling cancels a held pin instead of finishing an outdated gesture');
  assert.equal(e.pending(),0);e.engine.cornerPin.destroy();
}
{
  const e=environment('screen',true),p=e.engine.slots()[0];e.move(p.x,p.y);e.down(p.x,p.y);e.time(500);assert.equal(e.engine.state().snapping,false);assert.equal(e.engine.state().camera.size,120);assert.equal(e.engine.state().camera.x,p.x);e.engine.cornerPin.destroy();
}
{
  const e=environment(),p=e.engine.slots()[0];e.move(p.x,p.y);e.hit('button');e.button.dispatch('click',{detail:0});assert.equal(e.engine.state().fixedAnchor,'nw');assert.equal(e.engine.state().snapping,false);assert.equal(e.engine.state().focused,true);e.engine.cornerPin.destroy();
}
{
  const e=environment('window');e.engine.change({selectedWindow:null});e.move(30,30);e.down(30,30);e.time(600);assert.equal(e.engine.state().saves,0);e.engine.cornerPin.destroy();
}
console.log('PASS: all capture corners, 500ms hold, cancellation, native actions, follow handoff, size/position continuity, bounds, keyboard and reduced motion.');
