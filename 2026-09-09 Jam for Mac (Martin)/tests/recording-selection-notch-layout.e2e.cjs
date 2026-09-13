const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1360,height:1000}});
    await page.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');
    await page.waitForFunction(()=>window.JamSelectionNotch);
    await page.evaluate(()=>{
      const root=document.createElement('div');root.id='notch-fixture';
      root.style.cssText='position:fixed;inset:0 auto auto 0;width:1000px;height:800px;z-index:9999';document.body.append(root);
      const noop=()=>{};
      const instance=JamSelectionNotch.create(root,{icon:()=>'<span class="rb-sf"></span>',onSize:noop,onRatio:noop,onOrientation:noop,onPreset:noop,onChangeWindow:noop,onOpen:noop,onClose:noop});
      const context={enabled:true,key:'area',mode:'area',rect:{x:200,y:150,width:600,height:300},sizing:{preset:'custom',orientation:'horizontal'},bounds:{width:1000,height:800},minimum:{width:12,height:12}};
      window.notchFixture={root,instance,context};instance.render(context);
    });
    const render=props=>page.evaluate(props=>{
      const f=notchFixture;Object.assign(f.context,props);f.instance.render(f.context);
      const el=f.root.querySelector('.rb-selection-notch');return {width:el.offsetWidth,height:el.offsetHeight,x:el.offsetLeft,y:el.offsetTop,floating:el.classList.contains('is-floating'),compact:el.classList.contains('is-compact'),above:el.classList.contains('is-above'),radius:getComputedStyle(el).borderTopLeftRadius,animations:el.getAnimations({subtree:true}).length};
    },props);
    const size=width=>render({rect:{x:200,y:150,width,height:300}});
    let box=await render({});assert.equal(box.animations,0,'No animation on first render');
    const width=box.width;
    box=await size(width-1);assert.ok(box.floating);assert.equal(box.y,458,'Floating panel has 8px gap');assert.equal(box.radius,'18px');assert.ok(box.animations>0,'Detachment animates');
    for(const w of [width+1,width-1,width+11,width+2])assert.ok((await size(w)).floating,'Buffer prevents threshold flicker');
    box=await size(width+12);assert.ok(!box.floating,'Reattach with 12px spare width');assert.equal(box.y,450);
    // Reverse mid-transition and compare actual rendered positions on the same frame.
    await size(width-1);await page.waitForTimeout(55);
    const jump=await page.evaluate(width=>{
      const f=notchFixture,el=f.root.querySelector('.rb-notch-sizing'),before=el.getBoundingClientRect();
      f.context.rect.width=width+12;f.instance.render(f.context);const after=el.getBoundingClientRect();return Math.hypot(after.x-before.x,after.y-before.y);
    },width);
    assert.ok(jump<.6,`Interrupted motion stays continuous (${jump})`);
    await page.waitForTimeout(260);assert.equal((await render({})).animations,0,'Motion settles');
    box=await render({rect:{x:200,y:700,width:83,height:90}});assert.ok(box.above);assert.equal(box.y+box.height,692,'Bottom-edge panel floats 8px above');
    box=await render({rect:{x:0,y:0,width:12,height:800}});assert.ok(box.x>=8&&box.y>=0&&box.y+box.height<=800,'Panel remains visible when neither outside edge fits');
    box=await render({key:'window',mode:'window',rect:{x:100,y:100,width:800,height:300}});assert.ok(!box.compact&&!box.floating);
    box=await render({rect:{x:100,y:100,width:470,height:300}});assert.ok(box.compact&&!box.floating,'Stack before detaching');
    box=await render({rect:{x:100,y:100,width:200,height:300}});assert.ok(box.compact&&box.floating,'Stacked window detaches when still too wide');
    assert.equal(await page.locator('#notch-fixture .rb-notch-logs-label').innerText(),'Not capturing logs');
    assert.equal(await page.locator('#notch-fixture .rb-notch-ratio').getAttribute('title'),'Change ratio');
    await page.emulateMedia({reducedMotion:'reduce'});box=await size(800);assert.equal(box.animations,0,'Reduced motion applies immediately');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#notch-fixture .rb-notch-width').focus();await page.keyboard.press('Shift');box=await size(200);assert.equal(box.animations,0,'Keyboard sizing stays instant');
    console.log('PASS: attachment, 8px gap, hysteresis, interruption, stacking, edge fallback, tooltips, reduced motion and keyboard input.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
