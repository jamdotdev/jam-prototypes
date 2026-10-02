const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const page = await browser.newPage({viewport:{width:1360,height:1000},permissions:['camera','microphone']});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const colors={default:'rgba(0, 0, 0, 0.45)',hover:'rgba(0, 0, 0, 0.65)',active:'rgb(0, 0, 0)'};
  const css=(selector,property)=>page.locator(selector).first().evaluate((el,p)=>getComputedStyle(el)[p],property);
  async function color(selector,property,expected){
    await page.waitForFunction(({selector,property,expected})=>getComputedStyle(document.querySelector(selector))[property]===expected,{selector,property,expected});
    assert.equal(await css(selector,property),expected);
  }
  try {
    await page.goto(process.env.RECORDING_TEST_URL || 'http://127.0.0.1:8765/?surface=recording');
    await page.waitForFunction(()=>window.JamRecording);
    await page.evaluate(async()=>{JamRecording.setStage('idle');JamRecording.setMode('screen');JamRecording.updateSettings({followCursor:false,cameraSize:120});await JamRecording.requestCamera();});
    await page.waitForFunction(()=>JamRecording.getCameraState().status==='live');
    const camera=page.locator('.rb-camera'),resize=page.locator('.rb-camera-resize');
    await color('.rb-camera-resize path','stroke',colors.default);
    assert.equal(await css('.rb-camera-resize path','strokeOpacity'),'1');
    await camera.hover();await resize.hover();
    await color('.rb-camera-resize path','stroke',colors.hover);
    await page.mouse.down();await color('.rb-camera-resize path','stroke',colors.active);
    await page.mouse.up();await color('.rb-camera-resize path','stroke',colors.hover);
    await page.mouse.move(800,120);await color('.rb-camera-resize path','stroke',colors.default);

    // Real drag shows default candidates and exactly one active destination.
    await camera.hover();await page.mouse.down();await page.mouse.move(600,420,{steps:3});
    await page.waitForSelector('.rb-camera-slots.is-visible');
    await color('.rb-camera-slot.is-nearest circle','stroke',colors.active);
    await color('.rb-camera-slots .rb-camera-slot:not(.is-nearest) circle','stroke',colors.default);
    await page.screenshot({path:'/tmp/jam-overlay-token-drag.png'});
    await page.mouse.up();

    // Pin hint stays default until held, then returns to default on cancellation.
    await page.evaluate(()=>JamRecording.updateSettings({followCursor:true}));
    await page.mouse.move(50,75);await page.waitForSelector('.rb-camera-pin.is-visible');
    await color('.rb-camera-pin circle','stroke',colors.default);
    await page.mouse.down();await color('.rb-camera-pin circle','stroke',colors.active);
    await page.mouse.up();await color('.rb-camera-pin circle','stroke',colors.default);
    assert.equal(await page.evaluate(()=>JamRecording.getSettings().followCursor),true);

    await page.evaluate(()=>{JamRecording.updateSettings({camera:false,followCursor:false});JamRecording.setMode('area');});
    await page.getByRole('button',{name:'Display rulers',exact:true}).click();
    const region=await page.locator('.rb-capture-region').boundingBox();
    const line='.rb-ruler-line.is-left',grip='[data-ruler="left"] span';
    await page.mouse.move(region.x+region.width/2,region.y+region.height/2);
    await color(line,'borderLeftColor',colors.default);assert.equal(await css(line,'opacity'),'1');
    await color('.rb-area-center path','stroke',colors.default);
    await page.mouse.move(region.x+48,region.y+160);
    await color(line,'borderLeftColor',colors.hover);await color(grip,'backgroundColor',colors.hover);
    await page.mouse.down();await color(line,'borderLeftColor',colors.active);await color(grip,'backgroundColor',colors.active);
    await page.mouse.up();await color(line,'borderLeftColor',colors.hover);
    await page.mouse.move(region.x+region.width/2,region.y+region.height/2);await color(line,'borderLeftColor',colors.default);

    // Live Playground edits propagate with sidebar both open and closed, and alpha is applied once.
    for(const open of [true,false]){
      await page.locator(open?'#playground-settings':'.collapse-button[aria-label="Close playground"]:visible').click();
      await page.waitForTimeout(400);
      await page.evaluate(()=>JamRecording.updateSettings({placeholderContrastColor:'rgba(40, 60, 80, 0.4)',placeholderContrastHoverColor:'rgba(40, 60, 80, 0.6)',placeholderContrastActiveColor:'#283c50'}));
      const r=await page.locator('.rb-capture-region').boundingBox();
      await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await color(line,'borderLeftColor','rgba(40, 60, 80, 0.4)');
      await color('.rb-camera-resize path','stroke','rgba(40, 60, 80, 0.4)');
      await color('.rb-camera-slots .rb-camera-slot circle','stroke','rgba(40, 60, 80, 0.4)');
      await page.mouse.move(r.x+48,r.y+160);await color(line,'borderLeftColor','rgba(40, 60, 80, 0.6)');
      await page.mouse.down();await color(line,'borderLeftColor','rgb(40, 60, 80)');await page.mouse.up();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: default/hover/active colors, camera resize and drag, pin hold/cancel, rulers and live shared edits with sidebar open/closed.');
  } finally {await browser.close();}
})();
