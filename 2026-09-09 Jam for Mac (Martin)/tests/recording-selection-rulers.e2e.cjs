const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  try{
    await page.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await page.waitForFunction(()=>window.JamRecording);
    await page.evaluate(()=>{JamRecording.updateSettings({camera:false});JamRecording.setStage('idle');JamRecording.setMode('area');});
    const state=()=>page.evaluate(()=>JamRecording.getState()),toggle=page.getByRole('button',{name:'Display rulers',exact:true}),cross=page.locator('.rb-area-center'),badge=page.locator('.rb-ruler-distance');
    assert.equal(await toggle.getAttribute('title'),'Display rulers');assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.ok(!await cross.isVisible());
    assert.equal(await toggle.locator('.rb-sf').getAttribute('data-symbol'),'lines.measurement.horizontal.aligned.bottom');
    await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'true');assert.ok(await cross.isVisible());
    let s=await state();assert.equal(s.sizing.marginX,48);assert.equal(s.sizing.marginY,48);
    const c=await cross.boundingBox(),r=await page.locator('.rb-capture-region').boundingBox();assert.equal(c.width,16);assert.equal(c.height,16);assert.ok(Math.abs(c.x+8-r.x-r.width/2)<.1&&Math.abs(c.y+8-r.y-r.height/2)<.1);
    assert.deepEqual(await page.locator('.rb-ruler-line.is-left').evaluate(el=>({border:getComputedStyle(el).borderLeftStyle,opacity:getComputedStyle(el).opacity})),{border:'dashed',opacity:'1'});
    const revealed=page.locator('.rb-ruler-handle.is-revealed');
    assert.equal(await revealed.count(),0,'No grip is shown away from rulers');
    await page.mouse.move(r.x+48+10,r.y+160);
    assert.equal(await revealed.count(),1);assert.equal(await revealed.getAttribute('data-ruler'),'left');
    let grip=await revealed.boundingBox();assert.equal(grip.width,40);assert.equal(grip.height,40);assert.ok(Math.abs(grip.y+20-r.y-160)<.1);
    assert.equal(await revealed.evaluate(el=>getComputedStyle(el).cursor),'ew-resize');
    await page.mouse.move(r.x+48+10,r.y+270);
    grip=await revealed.boundingBox();assert.ok(Math.abs(grip.y+20-r.y-270)<.1,'Grip follows pointer down the whole line');
    await page.screenshot({path:'/tmp/jam-ruler-proximity.png'});
    await page.mouse.move(r.x+48,r.y+48);assert.equal(await revealed.getAttribute('data-ruler'),'left','Intersection retains current axis');
    await page.mouse.move(r.x+80,r.y+49);assert.equal(await revealed.count(),1);assert.equal(await revealed.getAttribute('data-ruler'),'top');
    assert.equal(await page.locator('[data-ruler="left"]').evaluate(el=>getComputedStyle(el).opacity),'0','Previous grip disappears immediately on axis switch');
    await page.mouse.move(r.x+r.width/2,r.y+r.height/2);assert.equal(await revealed.count(),0);
    await page.waitForTimeout(160);assert.equal(await page.locator('[data-ruler="top"]').evaluate(el=>getComputedStyle(el).opacity),'0','Grip fades away outside proximity');
    const initial={...s.area};
    async function drag(edge,dx,dy,linked=false){
      const handle=page.locator(`[data-ruler="${edge}"]`),box=await handle.boundingBox();
      if(linked){await page.keyboard.down('Alt');await page.keyboard.down('Shift');}
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:6});
      assert.ok(await badge.isVisible());const s=await state();assert.equal(await badge.textContent(),`${edge==='left'||edge==='right'?s.sizing.marginX:s.sizing.marginY} px`);
      await page.mouse.up();if(linked){await page.keyboard.up('Shift');await page.keyboard.up('Alt');}assert.ok(!await badge.isVisible());return s;
    }
    s=await drag('left',20,0);assert.equal(s.sizing.marginX,68);assert.equal(s.sizing.marginY,48);
    s=await drag('right',-12,0);assert.equal(s.sizing.marginX,80);
    s=await drag('top',0,8);assert.equal(s.sizing.marginY,56);
    s=await drag('bottom',0,-10);assert.equal(s.sizing.marginY,66);
    assert.deepEqual(s.area,initial,'Ruler drags do not move or resize the capture area');
    s=await drag('left',10,0,true);assert.equal(s.sizing.marginX,90);assert.equal(s.sizing.marginY,90);
    await page.locator('[data-ruler="top"]').focus();await page.keyboard.press('ArrowDown');s=await state();assert.equal(s.sizing.marginY,91);assert.equal(s.sizing.marginX,90);
    // Join all margins while already dragging, without a new pointer move.
    const h=await page.locator('[data-ruler="left"]').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+10,h.y+h.height/2);
    await page.keyboard.down('Alt');await page.keyboard.down('Shift');s=await state();assert.equal(s.sizing.marginY,s.sizing.marginX);await page.keyboard.up('Shift');await page.keyboard.up('Alt');
    await page.keyboard.press('Escape');await page.mouse.up();s=await state();assert.equal(s.sizing.marginX,90);assert.equal(s.sizing.marginY,91);assert.ok(!await badge.isVisible());
    await toggle.click();assert.ok(!await cross.isVisible());await toggle.click();assert.equal((await state()).sizing.marginX,90,'Toggle preserves adjusted margins');
    await page.screenshot({path:'/tmp/jam-rulers-area.png'});
    for(const stage of ['recording','paused','limit']){await page.evaluate(stage=>JamRecording.setStage(stage),stage);assert.ok(!await cross.isVisible());assert.equal(await page.locator('.rb-ruler-handle:visible').count(),0);}
    await page.evaluate(()=>{JamRecording.setStage('idle');JamRecording.setMode('window');JamRecording.selectWindow('browser');});
    assert.ok(!await toggle.isVisible(),'Window sizing has no ruler toggle');assert.ok(!await page.locator('.rb-notch-rulers-separator').isVisible(),'Window sizing has no trailing ruler separator');assert.ok(!await cross.isVisible());assert.equal(await page.locator('.rb-ruler-line:visible').count(),0,'Window selections never show rulers');
    await page.evaluate(()=>JamRecording.selectWindow('finder'));assert.ok(!await toggle.isVisible());assert.ok(!await cross.isVisible());
    await page.evaluate(()=>JamRecording.setMode('screen'));assert.ok(!await cross.isVisible());
    await page.evaluate(()=>JamRecording.setMode('area'));assert.ok(await toggle.isVisible());assert.ok(await cross.isVisible());assert.equal((await state()).sizing.marginX,90,'Returning to Area restores its rulers and margins');
    await page.locator('.rb-notch-width').fill('50');await page.locator('.rb-notch-width').press('Tab');s=await state();assert.ok(s.sizing.marginX>=0&&s.sizing.marginX<25,'Small selections clamp margins before guides cross');
    await page.evaluate(()=>JamRecording.resetSelection());assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.ok(!await cross.isVisible());
    assert.deepEqual(errors,[]);console.log('PASS: rulers off by default, 16px cross, dashed guides, paired/all-axis drags, badge, keyboard, cancellation, independent selections, bounds and recording visibility.');
  }catch(error){await page.screenshot({path:'/tmp/jam-rulers-failure.png'});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
