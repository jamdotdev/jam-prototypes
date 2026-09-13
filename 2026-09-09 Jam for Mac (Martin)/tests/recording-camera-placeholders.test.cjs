const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const directory=path.join(__dirname,'..');
class Element {
  constructor(){this.attributes={};this.nodes=new Map();this.children=[];this.classes=new Set();this.classList={add:name=>this.classes.add(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};this.style={values:{},writes:0,setProperty(name,value){this.values[name]=value;this.writes++;}};}
  setAttribute(name,value){this.attributes[name]=value;}
  querySelector(name){if(!this.nodes.has(name))this.nodes.set(name,new Element());return this.nodes.get(name);}
  append(child){this.children.push(child);}
  animate(frames,options){this.animation={frames,options,cancel(){this.canceled=true;}};return this.animation;}
}
const context=vm.createContext({document:{createElementNS:()=>new Element()},window:{}});
vm.runInContext(fs.readFileSync(path.join(directory,'playground-defaults-data.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(directory,'recording-camera-placeholders.js'),'utf8'),context);
const P=context.JamCameraPlaceholders,settings={...context.window.JamDefaultValues.groups.recording,placeholderActiveStroke:1,placeholderContrastColor:'#666666',placeholderContrastActiveColor:'#333333',placeholderContrastEdgeColor:'#ffffff',placeholderStroke:1,placeholderOpacity:50,placeholderActiveOpacity:100,placeholderOverlayOpacity:32};
{
  const root=new Element();P.paintPalette(root,settings);
  assert.deepEqual(root.style.values,{'--rb-camera-border-color':'#666666','--rb-camera-border-active-color':'#333333','--rb-camera-border-edge-color':'#ffffff'});
  P.paintPalette(root,{...settings});assert.equal(root.style.writes,3,'Pointer movement does not rewrite the inherited palette');
  P.paintPalette(root,{...settings,placeholderContrastColor:'#445566',placeholderContrastActiveColor:'#112233',placeholderContrastEdgeColor:'#fffffff2'});
  assert.deepEqual(root.style.values,{'--rb-camera-border-color':'#445566','--rb-camera-border-active-color':'#112233','--rb-camera-border-edge-color':'#fffffff2'},'Both borders inherit live normal, active and edge colors');
}
for(const size of [12,24,44,56,96,172,240,480])for(const width of [.5,1,4])for(const dash of [1,4,16])for(const gap of [1,8,24]){
  const pattern=P.dashPattern(size,width,dash,gap),frames=P.holdFrames(pattern);
  assert.ok(pattern.radius>0&&pattern.dash>0&&pattern.gap>0);
  assert.ok(Math.abs((pattern.dash+pattern.gap)*pattern.count-2*Math.PI*pattern.radius)<1e-9,'Full repeats close the seam');
  assert.equal(frames.length,pattern.count+1);
  for(let closed=0;closed<frames.length;closed++){
    const segments=frames[closed].strokeDasharray.split(' ').map(Number);
    assert.equal(segments.length,pattern.count*2);
    assert.equal(frames[closed].offset,closed/pattern.count);
    for(let index=0;index<pattern.count;index++)assert.equal(segments[index*2+1],index<closed?0:pattern.gap,'Only successive clockwise gaps close');
  }
}
{
  const custom={...settings,placeholderPinContrast:false};
  const element=new Element();P.paintBorder(element,172,custom);
  const svg=element.querySelector('.rb-camera-slot-border'),circle=svg.querySelector('circle');
  assert.equal(circle.attributes['stroke-width'],1);assert.equal(circle.attributes['stroke-opacity'],.5);
  const dash=circle.attributes['stroke-dasharray'];P.paintBorder(element,172,custom,true);
  assert.equal(circle.attributes['stroke-opacity'],1);assert.equal(circle.attributes['stroke-dasharray'],dash);
  assert.equal(circle.attributes['stroke-width'],2);
  const hold=P.holdBorder(element,500);assert.equal(hold.options.duration,500);assert.equal(hold.options.easing,'linear');hold.cancel();assert.equal(hold.canceled,true);
  P.paintBorder(element,96,{...custom,placeholderColor:'#ff0000',placeholderStroke:2,placeholderDash:8,placeholderGap:12,placeholderOpacity:25});
  assert.equal(svg.attributes.viewBox,'0 0 96 96');assert.equal(circle.attributes.stroke,'#ff0000');assert.equal(circle.attributes['stroke-width'],2);assert.equal(circle.attributes['stroke-opacity'],.25);
  P.paintBorder(element,96,settings);
  assert.equal(circle.attributes.stroke,'#666666');assert.equal(circle.attributes['stroke-opacity'],.85);
  assert.ok(svg.classes.has('has-pin-contrast'));
  const pinDashes=circle.attributes['stroke-dasharray'];P.paintBorder(element,96,settings,true);
  assert.equal(circle.attributes.stroke,'#333333');assert.equal(circle.attributes['stroke-opacity'],1);
  assert.equal(circle.attributes['stroke-dasharray'],pinDashes,'Contrast retains the same hold geometry');
  P.paintBorder(element,96,{...settings,placeholderPinContrast:false,placeholderColor:'#ff0000'});
  assert.equal(circle.attributes.stroke,'#ff0000');assert.equal(circle.attributes['stroke-opacity'],.5);
  assert.ok(!svg.classes.has('has-pin-contrast'),'Custom styling applies when Border contrast is off');
}
{
  for(const size of [24,44,56,96,172,240])for(const width of [.5,1.5,4])for(const increase of [0,.5,1,4]){
    const element=new Element(),circle=element.querySelector('.rb-camera-slot-border').querySelector('circle');
    const style={...settings,placeholderStroke:width,placeholderActiveStroke:increase};
    P.paintBorder(element,size,style);const radius=circle.attributes.r,dashes=circle.attributes['stroke-dasharray'];
    P.paintBorder(element,size,style,true,true);assert.equal(circle.attributes['stroke-width'],width+increase);
    assert.equal(circle.attributes.r,radius);assert.equal(circle.attributes['stroke-dasharray'],dashes,'Emphasis preserves the dash geometry during a hold');
    P.paintBorder(element,size,style,true,false);assert.equal(circle.attributes['stroke-width'],width,'Other drag placements keep their base width');
    assert.equal(circle.attributes['stroke-opacity'],1,'All placements still brighten during dragging');
    P.paintBorder(element,size,style);assert.equal(circle.attributes['stroke-width'],width);
  }
}
{
  for(const size of [24,44,56,96,172,240])for(const active of [false,true]){
    const element=new Element(),svg=element.querySelector('.rb-camera-slot-border'),circle=svg.querySelector('circle');
    for(const contrast of [true,false,true,undefined]){
      P.paintBorder(element,size,{...settings,placeholderPinContrast:contrast,placeholderColor:'#ff0000',placeholderOpacity:25,placeholderActiveOpacity:70},active);
      assert.equal(svg.classes.has('has-pin-contrast'),contrast!==false,'Every placeholder uses contrast by default, including older saved settings');
      assert.equal(circle.attributes.stroke,contrast===false?'#ff0000':active?'#333333':'#666666');
      assert.equal(circle.attributes['stroke-opacity'],contrast===false?(active ? .7 : .25):active?1:.85);
    }
  }
}
{
  const element=new Element(),circle=element.querySelector('.rb-camera-slot-border').querySelector('circle');
  const colors={...settings,placeholderContrastColor:'#445566',placeholderContrastActiveColor:'#112233'};
  P.paintBorder(element,96,colors);assert.equal(circle.attributes.stroke,'#445566');
  const dashes=circle.attributes['stroke-dasharray'];P.paintBorder(element,96,colors,true);
  assert.equal(circle.attributes.stroke,'#112233');assert.equal(circle.attributes['stroke-dasharray'],dashes);
  P.paintBorder(element,96,{...colors,placeholderContrastActiveColor:'#225588'},true);
  assert.equal(circle.attributes.stroke,'#225588','Active contrast color updates without rebuilding geometry');
}
{
  const root=new Element(),overlay=P.createOverlay(root),svg=root.children[0];
  const slots=Array.from({length:8},(_,i)=>({x:100+i*25,y:80+i*15,size:96}));
  for(const bounds of [{x:0,y:0,width:1315,height:1186},{x:277,y:352,width:668,height:404},{x:100,y:60,width:500,height:350}]){
    overlay.update(bounds,slots,true,settings);assert.ok(svg.classes.has('is-visible'));
    const mask=svg.querySelector('mask'),fill=svg.querySelector('.rb-camera-overlay-fill');
    assert.equal(fill.attributes.fill,'#000000');assert.equal(fill.attributes['fill-opacity'],.32);
    assert.deepEqual(Object.fromEntries(Object.keys(bounds).map(key=>[key,fill.attributes[key]])),bounds);
    assert.equal(mask.children.length,8,'All eight placements are true transparent cutouts');
    slots.forEach((slot,i)=>assert.deepEqual(mask.children[i].attributes,{fill:'black',cx:slot.x,cy:slot.y,r:48}));
  }
  overlay.update({x:0,y:0,width:800,height:600},slots,true,{...settings,placeholderOverlayColor:'#112233',placeholderOverlayOpacity:60});
  assert.equal(svg.querySelector('.rb-camera-overlay-fill').attributes.fill,'#112233');assert.equal(svg.querySelector('.rb-camera-overlay-fill').attributes['fill-opacity'],.6);
  overlay.update({},[],false,{...settings,placeholderContrastEdgeColor:'#ffffcc'});assert.ok(!svg.classes.has('is-visible'));
  P.paintPalette(root,{...settings,placeholderContrastEdgeColor:'#ffffcc'});
  assert.equal(root.style.values['--rb-camera-border-edge-color'],'#ffffcc','The shared edge color updates while the drag overlay is hidden');
}
{
  const source=fs.readFileSync(path.join(directory,'recording.js'),'utf8');
  const start=source.indexOf('  function renderSlots('),end=source.indexOf('\n  function ',start+1);
  const root=new Element(),layer=new Element();
  const integration=vm.createContext({root,layer,settings,JamCameraPlaceholders:P});
  vm.runInContext(`
    let active=true,drag=null;
    const $=()=>layer,rectStyle=(el,r)=>Object.assign(el.attributes,r);
    let bounds={x:0,y:0,width:1000,height:700};
    const captureBounds=()=>bounds,cameraSlots=()=>Array.from({length:8},(_,i)=>({name:['nw','n','ne','w','e','sw','s','se'][i],x:100+i*50,y:100,size:96}));
    let nearestName='nw';const nearestSlot=()=>cameraSlots().find(slot=>slot.name===nearestName),calls=[];
    const cameraDragOverlay={update(b,s,visible){calls.push({bounds:b,visible});}};
    ${source.slice(start,end)}
    globalThis.render=(kind,follow,isActive=true,b=bounds,nearest='nw')=>{drag=kind?{kind}:null;settings.followCursor=follow;active=isActive;bounds=b;nearestName=nearest;renderSlots();};
    globalThis.calls=calls;
  `,integration);
  for(const bounds of [{x:0,y:0,width:1000,height:700},{x:200,y:100,width:500,height:400},{x:100,y:60,width:700,height:500}]){
    integration.render('camera',false,true,bounds);
    assert.ok(root.classes.has('is-camera-dragging'));assert.ok(layer.classes.has('is-visible'));
    assert.equal(integration.calls.at(-1).visible,true);assert.deepEqual(integration.calls.at(-1).bounds,bounds);
    for(const slot of layer.nodes.values()){
      const svg=slot.querySelector('.rb-camera-slot-border'),circle=svg.querySelector('circle');
      assert.ok(svg.classes.has('has-pin-contrast'),'All eight drag placements have the same light edge as Press to pin');
      assert.equal(circle.attributes.stroke,'#333333');assert.equal(circle.attributes['stroke-opacity'],1);
      assert.equal(circle.attributes['stroke-width'],slot.classes.has('is-nearest')?2:1,'Only the snap destination thickens');
      assert.equal(circle.animation,undefined,'Drag highlighting responds without a gap-fill animation');
    }
    integration.render('camera',false,true,bounds,'ne');
    for(const [selector,slot] of layer.nodes){
      const circle=slot.querySelector('.rb-camera-slot-border').querySelector('circle');
      assert.equal(circle.attributes['stroke-width'],selector==='[data-slot="ne"]'?2:1,'Emphasis moves with the drag destination');
      assert.equal(circle.animation,undefined,'A new drag destination retains its dashed border');
    }
    settings.placeholderActiveStroke=2.5;integration.render('camera',false,true,bounds);
    for(const slot of layer.nodes.values())assert.equal(slot.querySelector('.rb-camera-slot-border').querySelector('circle').attributes['stroke-width'],slot.classes.has('is-nearest')?3.5:1,'Tuning the increase applies during an active drag');
    settings.placeholderActiveStroke=1;
    settings.placeholderPinContrast=false;settings.placeholderColor='#ff0000';settings.placeholderActiveOpacity=70;
    integration.render('camera',false,true,bounds);
    for(const slot of layer.nodes.values()){
      const svg=slot.querySelector('.rb-camera-slot-border'),circle=svg.querySelector('circle');
      assert.ok(!svg.classes.has('has-pin-contrast'));assert.equal(circle.attributes.stroke,'#ff0000');assert.equal(circle.attributes['stroke-opacity'],.7);
    }
    settings.placeholderPinContrast=true;
    integration.render('camera',false,true,bounds);
    for(const slot of layer.nodes.values())assert.equal(slot.querySelector('.rb-camera-slot-border').querySelector('circle').attributes.stroke,'#333333','Contrast reapplies immediately without changing placement geometry');
  }
  for(const [kind,follow,active] of [[null,false,true],['camera-resize',false,true],['camera',true,true],['camera',false,false]]){
    integration.render(kind,follow,active);assert.ok(!root.classes.has('is-camera-dragging'));assert.ok(!layer.classes.has('is-visible'));assert.equal(integration.calls.at(-1).visible,false);
    for(const slot of layer.nodes.values())assert.equal(slot.querySelector('.rb-camera-slot-border').querySelector('circle').attributes['stroke-width'],1,'Ending the interaction restores all base strokes');
  }
  const changed={placeholderContrastColor:'#445566',placeholderContrastActiveColor:'#112233',placeholderContrastEdgeColor:'#eeddff'};
  Object.assign(settings,changed);integration.render(null,false);
  assert.equal(root.style.values['--rb-camera-border-color'],changed.placeholderContrastColor);
  assert.equal(root.style.values['--rb-camera-border-active-color'],changed.placeholderContrastActiveColor);
  assert.equal(root.style.values['--rb-camera-border-edge-color'],changed.placeholderContrastEdgeColor,'Idle color edits apply even when placeholders are hidden');
}
console.log('PASS: consistent dash geometry, clockwise hold/cancel, live shared border palette, transparent capture cutouts and immediate drag highlights without gap-fill animation.');
