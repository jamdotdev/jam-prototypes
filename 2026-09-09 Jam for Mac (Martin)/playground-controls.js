(() => {
  'use strict';
  const resolve=value=>typeof value==='function'?value():value;
  const disclosure=new Map();
  function mount(host,screen,sections){
    const mounts=[],refreshers=[],readouts=[],custom=[];
    function control(parent,item){
      const target=document.createElement('div');target.className='pg-control';target.dataset.control=item.id;parent.append(target);
      if(item.controls){
        target.classList.add('pg-section');
        target.classList.toggle('pg-section-nested',parent.classList.contains('dialkit-folder-inner'));
        const key=`${screen}/${item.id}`,open=disclosure.get(key)??item.open;
        const props={title:item.title,open,isSection:true,onOpenChange(value){disclosure.set(key,value);folder.update({...props,open:value});folder.body.parentElement.setAttribute("aria-hidden",String(!value));}};
        const folder=DialKit.mountFolder(target,props);mounts.push(folder);folder.body.parentElement.setAttribute("aria-hidden",String(!open));
        item.controls.forEach(child=>control(folder.body,child));return;
      }
      if(item.type==='custom'){const element=item.element();target.append(element);custom.push(element);return;}
      if(item.type==='action'){
        const button=document.createElement('button');button.type='button';button.className='pg-action';button.textContent=item.label;button.addEventListener('click',item.run);target.append(button);return;
      }
      if(item.type==='readout'){
        target.classList.add(item.label?'pg-readout':'pg-note');const label=document.createElement('span'),value=document.createElement('span');label.textContent=item.label;target.append(label,value);
        const refresh=()=>{const text=String(item.get());if(value.textContent!==text)value.textContent=text;};refresh();refreshers.push(refresh);readouts.push(refresh);return;
      }
      const props=()=>({label:resolve(item.label),value:item.get(),checked:item.get(),min:resolve(item.min),max:resolve(item.max),step:item.step,unit:item.unit,options:item.options,onChange(value){item.set(value);refresh();}});
      const factory={slider:'mountSlider',toggle:'mountToggle',select:'mountSelectControl',segments:'mountSegmentedControl',color:'mountColorControl'}[item.type];
      const component=DialKit[factory](target,props());mounts.push(component);
      const refresh=()=>{
        component.update(props());
        const value=target.querySelector(".dialkit-slider-value");if(value)value.dataset.unit=item.unit||"";
        const group=target.querySelector('[role="radiogroup"]');if(group)group.setAttribute('aria-label',resolve(item.label));
        const slider=target.querySelector('[role="slider"]');if(slider)slider.setAttribute('aria-label',resolve(item.label));
      };refresh();refreshers.push(refresh);
    }
    // Preserve section order in the shared sidebar's single scrolling column.
    const column=document.createElement('div');column.className='pg-column';host.append(column);
    host.classList.add('pg-single-column');
    sections.forEach(item=>control(column,item));
    return {refresh(){refreshers.forEach(fn=>fn());},refreshReadouts(){readouts.forEach(fn=>fn());},destroy(){custom.forEach(element=>element.remove());mounts.reverse().forEach(component=>component.destroy());host.replaceChildren();}};
  }
  window.JamPlaygroundControls={mount};
})();
