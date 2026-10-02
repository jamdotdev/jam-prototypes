const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const page=await browser.newPage({viewport:{width:1360,height:1000},permissions:['camera','microphone']});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const settings=patch=>page.evaluate(p=>JamRecording.updateSettings(p),patch);
 const scale=()=>page.evaluate(()=>JamRecording.getState().camera.motionScale);
 const dragStyles=()=>page.locator('.rb-camera-slots .rb-camera-slot').evaluateAll(nodes=>nodes.map(el=>({target:el.classList.contains('is-nearest'),scale:getComputedStyle(el).scale,opacity:getComputedStyle(el).opacity})));
 try {
  await page.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');
  await page.waitForFunction(()=>window.JamRecording);
  await page.evaluate(async()=>{JamRecording.setStage('idle');JamRecording.setMode('screen');JamRecording.updateSettings({followCursor:true,followSize:96,followShrink:20});await JamRecording.requestCamera();});
  await page.waitForFunction(()=>JamRecording.getCameraState().status==='live');
  await page.mouse.move(500,300);await page.waitForTimeout(800);
  let minimum=1;
  for(let i=0;i<16;i++){await page.mouse.move(i%2?600:500,300);await page.waitForTimeout(16);minimum=Math.min(minimum,await scale());}
  assert(minimum<.95&&minimum>=.8,'Moving shrinks within the configured amount');
  assert.equal(await page.evaluate(()=>JamRecording.getSettings().followSize),96);
  await page.waitForTimeout(1200);assert((await scale())>.999,'Stopping restores size');
  await settings({followShrink:0});await page.mouse.move(700,300);await page.waitForTimeout(80);assert.equal(await scale(),1);
  await settings({followShrink:20});await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(500,300);await page.waitForTimeout(80);assert.equal(await scale(),1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await settings({followCursor:false,cameraSize:120,placeholderTargetScale:1.1,placeholderOtherOpacity:50});
  await page.locator('.rb-camera').hover();await page.mouse.down();await page.mouse.move(650,420);await page.waitForTimeout(240);
  let styles=await dragStyles();assert.equal(styles.filter(s=>s.target).length,1);
  for(const s of styles){assert.equal(s.scale,s.target?'1.1':'1');assert.equal(s.opacity,s.target?'1':'0.5');}
  let holes=await page.locator('.rb-camera-drag-overlay mask circle').evaluateAll(nodes=>nodes.map(el=>({scale:getComputedStyle(el).scale,opacity:getComputedStyle(el).opacity})));
  assert.deepEqual(holes,styles.map(({scale,opacity})=>({scale,opacity})),'Transparent cutouts match border emphasis');
  await page.mouse.move(1200,800);await page.mouse.move(200,200);await page.waitForTimeout(240);
  styles=await dragStyles();assert.equal(styles.filter(s=>s.target).length,1);assert.equal(styles.filter(s=>s.scale==='1.1').length,1);
  await settings({placeholderTargetScale:1,placeholderOtherOpacity:100});await page.waitForTimeout(240);
  assert((await dragStyles()).every(s=>s.scale==='1'&&s.opacity==='1'),'Neutral settings disable emphasis live');
  await settings({placeholderTargetScale:1.2,placeholderOtherOpacity:35});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(240);
  styles=await dragStyles();assert(styles.every(s=>s.scale==='1'));assert(styles.filter(s=>!s.target).every(s=>s.opacity==='0.35'));
  await page.mouse.up();await page.waitForTimeout(240);assert((await dragStyles()).every(s=>s.opacity==='1'));
  await page.emulateMedia({reducedMotion:'no-preference'});await settings({placeholderTargetScale:1.1,placeholderOtherOpacity:50});
  await page.locator('.rb-camera').hover();await page.mouse.down();await page.mouse.move(900,500);await page.waitForTimeout(240);
  await page.screenshot({path:'/tmp/jam-microinteractions.png'});await page.mouse.up();
  assert.deepEqual(errors,[]);console.log('PASS: follower shrink/rest/disable/reduced motion, placeholder scale/dimming/cutout alignment, retarget and release.');
 }finally{await browser.close();}
})();
