const assert = require('node:assert/strict');
require(process.env.CAMERA_MOTION_PATH || '../recording-camera-motion.js');
const EPS = 1e-5;
let frames = 0;
function checkGeometry(state, bounds, pointer) {
  for (const value of [state.x, state.y, state.size]) assert(Number.isFinite(value));
  const r = state.size / 2;
  assert(state.size >= 0);
  assert(state.x - r >= bounds.x - EPS && state.x + r <= bounds.x + bounds.width + EPS, 'horizontal capture containment');
  assert(state.y - r >= bounds.y - EPS && state.y + r <= bounds.y + bounds.height + EPS, 'vertical capture containment');
  const inset = Math.min(4, Math.max(0, (Math.min(bounds.width, bounds.height) - 12) / 2));
  const minX = bounds.x + inset + r, maxX = bounds.x + bounds.width - inset - r;
  const minY = bounds.y + inset + r, maxY = bounds.y + bounds.height - inset - r;
  const exclusion = r + Math.min(6, Math.max(2, r / 8));
  if (maxY >= pointer.y + r - EPS) assert(state.y - r >= pointer.y - EPS, 'whole camera must remain below tip when possible');
  const farthest = Math.max(...[[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]].map(([x, y]) => Math.hypot(x - pointer.x, y - pointer.y)));
  const distance = Math.hypot(state.x - pointer.x, state.y - pointer.y);
  if (farthest >= exclusion - EPS) assert(distance >= exclusion - EPS, `tip clearance: ${distance} < ${exclusion}`);
  else assert(Math.abs(distance - farthest) < EPS, 'impossible captures maximize tip clearance');
  frames++;
}
for (const size of [12, 96, 160]) for (const stiffness of [80, 220, 500]) for (const damping of [10, 26, 50]) {
  const follower = JamCameraMotion.create({ x: 0, y: 0, size });
  for (let n = 0; n < 1200; n++) {
    const bounds = n < 300 ? { x: 0, y: 0, width: 1100, height: 660 }
      : n < 600 ? { x: 200, y: 200, width: 360, height: 230 }
      : n < 900 ? { x: 400, y: 300, width: 50, height: 50 }
      : { x: 0, y: 0, width: 6, height: 9 };
    const pointer = { x: 550 + 650 * Math.sin(n * .12), y: 330 + 400 * Math.cos(n * .07), vx: 3000 * Math.cos(n * .12), vy: -2400 * Math.sin(n * .07), ax: 20000 * Math.sin(n * .1), ay: 18000 * Math.cos(n * .1) };
    const state = follower.step({ pointer, bounds, size, gap: 20, stiffness, damping, anticipation: 100, dt: n % 71 ? 1 / 60 : 5 });
    checkGeometry(state, bounds, pointer);
  }
}
const bounds = { x: 0, y: 0, width: 1100, height: 660 };
for (const size of [12, 96, 160]) {
  const follower = JamCameraMotion.create({ x: 500, y: 300, size });
  const options = { bounds, size, gap: 20, dt: 1 / 60, stiffness: 500, damping: 10, anticipation: 100 };
  // Teleport to all edges/corners and directly onto the old camera center.
  for (const pointer of [{ x: 0, y: 0 }, { x: 1100, y: 0 }, { x: 1100, y: 660 }, { x: 0, y: 660 }, { x: 550, y: 660 }, { x: 550, y: 0 }, { x: 0, y: 330 }, { x: 1100, y: 330 }]) {
    for (let n = 0; n < 90; n++) checkGeometry(follower.step({ ...options, pointer }), bounds, pointer);
  }
  for (let n = 0; n < 100; n++) {
    const pointer = { ...follower.getState(), vx: 9000, vy: 9000, ax: -20000, ay: -20000 };
    checkGeometry(follower.step({ ...options, pointer }), bounds, pointer);
  }
  const rest = { x: 500, y: 300 };
  for (let n = 0; n < 600; n++) follower.step({ ...options, pointer: rest });
  const state = follower.getState();
  assert(Math.abs(state.x - (rest.x + size / 2 + 20)) < .01);
  assert(Math.abs(state.y - (rest.y + size / 2 + 20)) < .01);
  assert(Math.abs(state.size - size) < .001);
  const reduced = follower.step({ ...options, pointer: { x: 20, y: 20, vx: 9000, vy: 9000 }, reducedMotion: true });
  assert.equal(reduced.x, 20 + size / 2 + 20);
  assert.equal(reduced.y, 20 + size / 2 + 20);
}
// Hysteresis: chatter around the side-change threshold must not flip it back.
const edgeFollower = JamCameraMotion.create({ size: 96 });
const edgeOptions = { bounds, size: 96, gap: 20, reducedMotion: true };
assert.equal(edgeFollower.step({ ...edgeOptions, pointer: { x: 995, y: 300 } }).side, 'bottom-left');
for (let n = 0; n < 100; n++) assert.equal(edgeFollower.step({ ...edgeOptions, pointer: { x: 980 + Math.sin(n) * 5, y: 300 } }).side, 'bottom-left');
assert.equal(edgeFollower.step({ ...edgeOptions, pointer: { x: 950, y: 300 } }).side, 'bottom-right');
assert.match(edgeFollower.step({ ...edgeOptions, pointer: { x: 550, y: 660 } }).side, /^(right|left)$/);
// Acceleration changes the trailing target; the arrow's orientation stays fixed.
const neutral = JamCameraMotion.create({ x: 568, y: 368, size: 96 });
const accelerating = JamCameraMotion.create({ x: 568, y: 368, size: 96 });
const trailOptions = { bounds, size: 96, gap: 20, dt: 1 / 60, anticipation: 100 };
const neutralState = neutral.step({ ...trailOptions, pointer: { x: 500, y: 300 } });
const acceleratedState = accelerating.step({ ...trailOptions, pointer: { x: 500, y: 300, ax: 20000, ay: 20000 } });
assert(acceleratedState.x < neutralState.x && acceleratedState.y < neutralState.y);
checkGeometry(acceleratedState, bounds, { x: 500, y: 300 });
// A normal retarget carries existing momentum into the next frame.
const momentum = JamCameraMotion.create({ x: 168, y: 368, size: 96 });
const momentumOptions = { bounds, size: 96, gap: 20, dt: 1 / 120, stiffness: 220, damping: 26, anticipation: 0 };
let before;
for (let n = 0; n < 6; n++) before = momentum.step({ ...momentumOptions, pointer: { x: 500, y: 300 } });
const after = momentum.step({ ...momentumOptions, pointer: { x: 100, y: 300 } });
assert(after.x > before.x, 'retarget preserves velocity rather than restarting');
// Unusual dimensions and malformed optional input remain bounded and finite.
for (const tiny of [{ x: 0, y: 0, width: 0, height: 0 }, { x: 20, y: 30, width: 1, height: 1 }, { x: 20, y: 30, width: 14, height: 500 }]) {
  const pointer = { x: tiny.x + tiny.width / 2, y: tiny.y + tiny.height - 2 };
  const state = edgeFollower.step({ bounds: tiny, pointer, size: 12, dt: NaN, stiffness: Infinity, damping: NaN, anticipation: NaN });
  checkGeometry(state, tiny, pointer);
}
console.log(`${frames} geometry-constrained frames passed; size, settle, reduced motion, hysteresis, acceleration, momentum and tiny-capture checks passed.`);

// Outside a selected capture, settle at the nearest interior point on each edge.
const pinBounds={x:200,y:100,width:600,height:400};
for(const size of [12,96,160]){
 const pin=JamCameraMotion.create({x:500,y:300,size});
 const opts={bounds:pinBounds,size,pinOutside:true,gap:20,dt:1/120,stiffness:220,damping:26};
 for(const pointer of [{x:100,y:300},{x:900,y:300},{x:500,y:0},{x:500,y:600},{x:900,y:600}]){
  pin.step({...opts,pointer:{x:500,y:300}});
  let s;for(let n=0;n<600;n++)s=pin.step({...opts,pointer});
  const r=size/2;
  assert.equal(s.mode,'pinned');
  assert(Math.abs(s.x-Math.max(200+r+4,Math.min(800-r-4,pointer.x)))<.01,'nearest interior x');
  assert(Math.abs(s.y-Math.max(100+r+4,Math.min(500-r-4,pointer.y)))<.01,'nearest interior y');
 }
 // A parked bubble stays fixed while the pointer moves elsewhere outside.
 const parked=pin.getState();
 for(const pointer of [{x:100,y:200},{x:500,y:0},{x:900,y:400},{x:700,y:600}]){
  for(let n=0;n<120;n++)pin.step({...opts,pointer});
  const held=pin.getState();assert.equal(held.mode,'pinned');
  assert(Math.hypot(held.x-parked.x,held.y-parked.y)<.01,'outside cursor cannot move the parked camera');
 }
 pin.step({...opts,pointer:{x:500,y:300}});
 // Boundary reentry continues from the parked position and can be interrupted.
 for(let n=0;n<600;n++)pin.step({...opts,pointer:{x:190,y:300}});
 const before=pin.getState();const first=pin.step({...opts,pointer:{x:201,y:300}});
 assert.equal(first.mode,'reconnecting');
 assert(Math.hypot(first.x-before.x,first.y-before.y)<10,'no jump on reentry');
 const interrupted=pin.step({...opts,pointer:{x:190,y:300}});assert.equal(interrupted.mode,'pinned');
 for(let n=0;n<600;n++)pin.step({...opts,pointer:{x:400,y:250}});
 const joined=pin.getState();assert.equal(joined.mode,'following');
 assert(Math.abs(joined.x-(400+size/2+20))<.01);assert(Math.abs(joined.y-(250+size/2+20))<.01);
 const reducedPin=pin.step({...opts,pointer:{x:900,y:300},reducedMotion:true});assert.equal(reducedPin.mode,'pinned');assert.equal(reducedPin.x,800-size/2-4);
 const reducedJoin=pin.step({...opts,pointer:{x:400,y:250},reducedMotion:true});assert.equal(reducedJoin.mode,'following');assert.equal(reducedJoin.x,400+size/2+20);
 // Rapid repeated exits, reentries and moving capture bounds remain contained.
 for(let n=0;n<1200;n++){
  const b={...pinBounds,x:200+Math.sin(n*.02)*20};
  const pointer={x:500+Math.sin(n*.08)*430,y:300+Math.cos(n*.065)*280};
  const s=pin.step({...opts,bounds:b,pointer});const r=s.size/2;
  assert(s.x-r>=b.x-EPS&&s.x+r<=b.x+b.width+EPS&&s.y-r>=b.y-EPS&&s.y+r<=b.y+b.height+EPS);
  assert(Math.hypot(s.x-pointer.x,s.y-pointer.y)>=r-1e-5,'pointer head stays clear during boundary crossing');
 }
}
console.log('PASS: nearest-edge pinning, continuous reconnect, interruption, moving bounds and reduced motion at 12/96/160px.');

// Motion shrink is bounded, frame-rate independent, reversible and visual only.
for (const hz of [30,60,120]) for (const shrink of [0,10,30]) {
 const motion=JamCameraMotion.create({x:500,y:300,size:96});
 const opts={bounds,size:96,shrink,dt:1/hz,pinOutside:true};
 let s;
 for(let i=0;i<hz;i++)s=motion.step({...opts,pointer:{x:500,y:300,vx:2400,ax:20000}});
 assert(Math.abs(s.motionScale-(1-shrink/100))<.001);
 assert.equal(s.size,96,'Visual shrink does not alter saved size or collision geometry');
 for(let i=0;i<hz;i++)s=motion.step({...opts,pointer:{x:500,y:300}});
 assert.equal(s.motionScale,1,'Rest restores the original visual size');
 for(let i=0;i<hz;i++)motion.step({...opts,pointer:{x:500,y:300,vx:2400}});
 for(let i=0;i<hz;i++)s=motion.step({...opts,pointer:{x:-100,y:300,vx:2400}});
 assert.equal(s.motionScale,1,'Moving outside cannot keep the parked bubble shrunk');
 assert.equal(motion.step({...opts,pointer:{x:500,y:300,vx:2400},reducedMotion:true}).motionScale,1);
 motion.snap({x:500,y:300});assert.equal(motion.getState().motionScale,1);
}
console.log('PASS: motion shrink limits, rest recovery, parking, reduced motion and frame-rate independence.');
