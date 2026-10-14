const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.emulateMedia({reducedMotion:'reduce'});
const hoverWindow=async name=>{const bb=await p.locator(`[data-window="${name}"]`).boundingBox(),x=bb.x+bb.width-50,y=bb.y+bb.height-30;await p.mouse.move(x-3,y-3);await p.mouse.move(x,y);await p.waitForTimeout(80);};
const hoverScreen=async()=>{await p.mouse.move(700,420);await p.mouse.move(704+Math.random()*10,424);await p.waitForTimeout(80);};
// The card's panel, from the bottom of the record pill to the bottom of the card, and its corner radii
const panel=()=>p.evaluate(()=>{
  const card=document.querySelector('.rb-record-card'),pill=card.querySelector('.rb-picker-start').getBoundingClientRect();
  const el=card.dataset.target==='screen'?card.querySelector('.rb-picker-controls'):document.querySelector('.rb-selection-notch.is-card');
  const style=getComputedStyle(el);return {below:Math.round(el.getBoundingClientRect().bottom-pill.bottom),top:style.borderTopLeftRadius,bottom:style.borderBottomLeftRadius};
});
const states={};
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window',browserLogs:'connected'});JamRecording.setMode('window');JamRecording.setBrowserApp('chrome');});
await hoverWindow('browser');states['Logs enabled label']=await panel();
await p.evaluate(()=>JamRecording.setChromeState('missing'));await hoverWindow('browser');states['blue setup button']=await panel();
await p.evaluate(()=>JamRecording.setSafariState('permission'));await hoverWindow('browser');states['yellow permission button']=await panel();
await hoverWindow('notion');states['Notion restart button']=await panel();
await p.evaluate(()=>JamRecording.updateSettings({electronLogs:'once'}));await hoverWindow('notion');states['Notion opt-in']=await panel();
await p.evaluate(()=>{JamRecording.updateSettings({electronLogs:'restart',browserLogs:'connected'});JamRecording.setMode('screen');});await hoverScreen();states['screen with logs']=await panel();
await p.evaluate(()=>JamRecording.setChromeState('missing'));await hoverScreen();states['screen without logs']=await panel();
assert.equal(await p.locator('.rb-picker-sources-label').textContent(),'Logs unavailable');
// Buttons and labels alike keep the card the same height, so it doesn't jump as a state changes
const [first,...rest]=Object.entries(states);
for(const [name,value] of rest)assert.equal(value.below,first[1].below,`${name} is as tall as ${first[0]}`);
// Each pair of corners is concentric with the button inside: the pill's 18px plus 8px above, the 12px row plus 8px below
for(const [name,value] of Object.entries(states))assert.deepEqual([value.top,value.bottom],['26px','20px'],`${name} corners`);
// A card with nothing under the pill keeps a dark panel, ringing the pill evenly
await p.evaluate(()=>JamRecording.setMode('window'));
// Finder's left edge, clear of the browser window over its right side
const finder=await p.locator('[data-window="finder"]').boundingBox();await p.mouse.move(finder.x+60,finder.y+finder.height-40);await p.mouse.move(finder.x+64,finder.y+finder.height-44);await p.waitForTimeout(80);
assert.equal(await p.evaluate(()=>document.querySelector('.rb-record-card').dataset.target),'finder');
const ring=await p.evaluate(()=>{const el=document.querySelector('.rb-record-card .rb-picker-controls'),style=getComputedStyle(el),pill=el.querySelector('.rb-picker-start').getBoundingClientRect(),box=el.getBoundingClientRect();return {radius:style.borderRadius,background:style.backgroundColor,below:Math.round(box.bottom-pill.bottom),above:Math.round(pill.top-box.top)};});
assert.deepEqual(ring,{radius:'26px',background:'rgba(28, 28, 30, 0.72)',below:8,above:8});
assert.deepEqual(errors,[]);
await b.close();console.log('recording-card-logs-row: ok');})().catch(e=>{console.error(e);process.exit(1);});
