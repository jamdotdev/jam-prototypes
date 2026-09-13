(() => {
  'use strict';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const edges=['left','right','top','bottom'];
  function create(region,{onChange,onBegin,onHoverChange=()=>{},onDragChange=()=>{},canDrag=()=>true}){
    const layer=document.createElement('div');layer.className='rb-selection-rulers';layer.hidden=true;
    layer.innerHTML=`<svg class="rb-area-center" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .5v15M.5 8h15"/></svg>${edges.map(edge=>`<i class="rb-ruler-line is-${edge}" aria-hidden="true"></i><button type="button" class="rb-ruler-handle is-${edge}" data-ruler="${edge}" role="slider" aria-label="${edge[0].toUpperCase()+edge.slice(1)} ruler margin" aria-description="Drag or use arrow keys. Option and Shift link all four margins." aria-orientation="${edge==='left'||edge==='right'?'horizontal':'vertical'}" aria-valuemin="0"><span aria-hidden="true"></span></button>`).join('')}<output class="rb-ruler-distance" aria-hidden="true" hidden></output>`;
    region.append(layer);
    const badge=layer.querySelector('.rb-ruler-distance');
    const handles=[...layer.querySelectorAll('.rb-ruler-handle')];
    let context=null,drag=null,hoverEdge=null,hoverPoint=null;
    const ENTER_DISTANCE=16,LEAVE_DISTANCE=20;
    const horizontal=edge=>edge==='left'||edge==='right';
    const sign=edge=>edge==='left'||edge==='top'?1:-1;
    const maximum=axis=>Math.max(0,Math.floor((context.rect[axis==='x'?'width':'height']-32)/2));
    function value(edge){return context.state[horizontal(edge)?'marginX':'marginY'];}
    function point(event){const r=region.getBoundingClientRect();return {x:(event.clientX-r.left)*context.rect.width/r.width,y:(event.clientY-r.top)*context.rect.height/r.height};}
    function placeHandles(){
      if(!context)return;
      const {width:w,height:h}=context.rect;
      for(const handle of handles){
        const edge=handle.dataset.ruler,n=value(edge),p=drag?.edge===edge?drag.point:hoverEdge===edge?hoverPoint:null;
        handle.style.left=`${edge==='left'?n:edge==='right'?w-n:clamp(p?.x??w/2,0,w)}px`;
        handle.style.top=`${edge==='top'?n:edge==='bottom'?h-n:clamp(p?.y??h/2,0,h)}px`;
      }
    }
    function reveal(edge,p=null){
      const previous=hoverEdge;hoverEdge=edge;hoverPoint=p;
      for(const handle of handles){
        const selected=handle.dataset.ruler===edge;
        // When changing lines, hide the old grip immediately so two never overlap.
        handle.classList.toggle('is-suppressed',!!edge&&!selected);
        handle.classList.toggle('is-revealed',selected);
      }
      placeHandles();
      if(previous!==edge)onHoverChange();
    }
    function hover(event){
      if(drag)return;
      if(layer.hidden||!context?.enabled||!canDrag()||event.buttons){reveal(null);return;}
      const p=point(event),{width:w,height:h}=context.rect;
      const blocker=event.target.closest?.('button,input,select,a,[role="menu"],.rb-camera,.rb-belt,.rb-selection-notch,.rb-area-handle,.rb-window-resizer');
      if(p.x<0||p.x>w||p.y<0||p.y>h||blocker&&!blocker.matches('.rb-ruler-handle')){reveal(null);return;}
      const distances={left:Math.abs(p.x-context.state.marginX),right:Math.abs(p.x-(w-context.state.marginX)),top:Math.abs(p.y-context.state.marginY),bottom:Math.abs(p.y-(h-context.state.marginY))};
      let edge=edges.reduce((best,candidate)=>distances[candidate]<distances[best]?candidate:best);
      // Prefer the current line near intersections instead of flickering between axes.
      if(hoverEdge&&distances[hoverEdge]<=LEAVE_DISTANCE&&distances[edge]>=distances[hoverEdge]-4)edge=hoverEdge;
      reveal(distances[edge]<=(edge===hoverEdge?LEAVE_DISTANCE:ENTER_DISTANCE)?edge:null,p);
    }
    document.addEventListener('pointermove',hover,true);
    document.documentElement.addEventListener('pointerleave',()=>{if(!drag)reveal(null);});
    function showBadge(edge){
      const w=context.rect.width,h=context.rect.height,n=value(edge);
      const handle=handles.find(el=>el.dataset.ruler===edge),x=parseFloat(handle.style.left),y=parseFloat(handle.style.top);
      badge.textContent=`${n} px`;badge.hidden=false;
      badge.style.left=`${clamp(x+20,4,Math.max(4,w-62))}px`;badge.style.top=`${clamp(y-30,4,Math.max(4,h-28))}px`;
    }
    function render(next){
      if(drag&&(!next.enabled||!next.state.rulers||next.key!==context?.key))finish(true);
      const changed=next.key!==context?.key;
      context=next;layer.hidden=!next.enabled||!next.state.rulers;
      if(layer.hidden||changed)reveal(null);
      if(layer.hidden)return;
      const {state,rect}=next;
      state.marginX=clamp(state.marginX??48,0,maximum('x'));state.marginY=clamp(state.marginY??48,0,maximum('y'));
      for(const edge of edges){
        const axis=horizontal(edge)?'x':'y',n=value(edge);
        layer.querySelector(`.rb-ruler-line.is-${edge}`).style[edge]=`${n}px`;
        const handle=handles.find(el=>el.dataset.ruler===edge);

        handle.setAttribute('aria-valuemax',maximum(axis));handle.setAttribute('aria-valuenow',n);handle.setAttribute('aria-valuetext',`${n} pixels from ${edge} edge`);
      }
      placeHandles();
      if(drag)showBadge(drag.edge);
    }
    function change(edge,n,linked){
      const axis=horizontal(edge)?'x':'y',limit=linked?Math.min(maximum('x'),maximum('y')):maximum(axis);
      n=clamp(Math.round(n),0,limit);
      if(linked)context.state.marginX=context.state.marginY=n;
      else context.state[axis==='x'?'marginX':'marginY']=n;
      onChange();showBadge(edge);
    }
    function move(event){
      if(!drag||event.pointerId!==drag.id)return;
      event.preventDefault();drag.point=point(event);
      const axis=horizontal(drag.edge)?'x':'y';
      change(drag.edge,drag.startValue+sign(drag.edge)*(drag.point[axis]-drag.start[axis]),event.altKey&&event.shiftKey);
    }
    function finish(cancel=false){
      if(!drag)return;
      const previous=drag;drag=null;onDragChange();
      if(cancel){context.state.marginX=previous.initial.x;context.state.marginY=previous.initial.y;}
      previous.handle.classList.remove('is-dragging');badge.hidden=true;
      if(previous.handle.hasPointerCapture(previous.id))previous.handle.releasePointerCapture(previous.id);
      if(cancel)onChange();
      reveal(cancel?null:previous.edge,previous.point);
    }
    for(const handle of handles){
      const edge=handle.dataset.ruler;
      handle.addEventListener('focus',()=>{if(!drag)reveal(edge,hoverEdge===edge?hoverPoint:null);});
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0||drag||!context?.enabled||!canDrag())return;
        event.preventDefault();event.stopPropagation();onBegin();handle.focus({preventScroll:true});
        const p=point(event);reveal(edge,p);drag={id:event.pointerId,handle,edge,start:p,point:p,startValue:value(edge),initial:{x:context.state.marginX,y:context.state.marginY}};
        handle.setPointerCapture(event.pointerId);handle.classList.add('is-dragging');showBadge(edge);onDragChange();
        if(event.altKey&&event.shiftKey)change(edge,value(edge),true);
      });
      handle.addEventListener('pointermove',move);
      handle.addEventListener('pointerup',event=>{if(event.pointerId===drag?.id){event.stopPropagation();finish();}});
      handle.addEventListener('pointercancel',event=>{if(event.pointerId===drag?.id)finish(true);});
      handle.addEventListener('lostpointercapture',()=>finish(true));
      handle.addEventListener('keydown',event=>{
        event.stopPropagation();
        if(!['Meta','Shift','Control','Alt','Tab'].includes(event.key))reveal(edge,hoverEdge===edge?hoverPoint:null);
        if(event.key==='Escape'){event.preventDefault();finish(true);reveal(null);badge.hidden=true;return;}
        const keys=horizontal(edge)?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];
        if(!keys.includes(event.key)&&event.key!=='Home'&&event.key!=='End')return;
        event.preventDefault();const linked=event.altKey&&event.shiftKey,step=event.shiftKey&&!event.altKey?10:1;
        const n=event.key==='Home'?0:event.key==='End'?maximum(horizontal(edge)?'x':'y'):value(edge)+(event.key===keys[0]?-1:1)*sign(edge)*step;
        change(edge,n,linked);
      });
      handle.addEventListener('blur',()=>{if(!drag){badge.hidden=true;if(hoverEdge===edge)reveal(null);}});
    }
    // Joining the margins mid-drag also works without another pointer movement.
    document.addEventListener('keydown',event=>{
      if(drag&&event.altKey&&event.shiftKey){const axis=horizontal(drag.edge)?'x':'y';change(drag.edge,drag.startValue+sign(drag.edge)*(drag.point[axis]-drag.start[axis]),true);}
    },true);
    window.addEventListener('blur',()=>{finish(true);reveal(null);});
    return {render,isDragging:()=>!!drag};
  }
  globalThis.JamSelectionRulers={create};
})();
