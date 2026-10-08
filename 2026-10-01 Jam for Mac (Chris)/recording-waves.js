// Organic gleam waves that sweep diagonally across a canvas, from its top-left corner to its bottom-right.
(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const PERIOD=2.2,LAYERS=24,STEP=6,DIAGONAL=Math.SQRT1_2;
  // Each pass is a broad gleam trailed by two fainter ripples, each bending to its own rhythm.
  const BANDS=[{lag:0,width:.2,alpha:.48,phase:0},{lag:.16,width:.08,alpha:.26,phase:1.9},{lag:.27,width:.05,alpha:.16,phase:3.7}];

  function create(canvas){
    const ctx=canvas.getContext('2d');
    let raf=0,origin=0,width=0,height=0,scale=0;

    function fit(){
      const dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;
      if(w===width&&h===height&&dpr===scale)return;
      width=w;height=h;scale=dpr;
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function draw(time){
      fit();ctx.clearRect(0,0,width,height);
      // Waves travel down the 45° diagonal, so their fronts run from the bottom-left corner up to the top-right.
      const travel=(width+height)*DIAGONAL,uMin=-width*DIAGONAL,uMax=height*DIAGONAL,span=uMax-uMin;
      const amplitude=travel*.045,margin=travel*.16+amplitude*1.5;
      for(const band of BANDS){
        const progress=((time/PERIOD-band.lag)%1+1)%1,center=-margin+progress*(travel+2*margin),half=band.width*travel/2;
        const offset=u=>amplitude*(Math.sin(u/span*7.2+time*1.7+band.phase)+.5*Math.sin(u/span*15.5-time*2.4+band.phase*1.3));
        const thickness=u=>half*(.78+.22*Math.sin(u/span*9.4+time*1.3+band.phase));
        const points=[];
        for(let u=uMin-STEP;u<=uMax+STEP;u+=STEP)points.push({u,s:center+offset(u),half:thickness(u)});
        // Stacked layers narrow towards the middle, so the band is brightest along its crest and fades at its edges.
        const alpha=1-Math.pow(1-band.alpha,1/LAYERS);
        ctx.fillStyle=`rgba(255,244,240,${alpha})`;
        for(let layer=1;layer<=LAYERS;layer++){
          const share=layer/LAYERS;
          ctx.beginPath();
          for(const p of points)lineTo(p.s+p.half*share,p.u);
          for(let i=points.length-1;i>=0;i--)lineTo(points[i].s-points[i].half*share,points[i].u);
          ctx.closePath();ctx.fill();
        }
      }
    }
    // `s` runs along the diagonal from the top-left corner and `u` across it.
    function lineTo(s,u){ctx.lineTo((s-u)*DIAGONAL,(s+u)*DIAGONAL);}
    function frame(now){
      // Once the canvas is no longer rendered, as on an inactive surface, the loop ends until the waves are started again.
      if(!canvas.getClientRects().length){stop();return;}
      draw((now-origin)/1000);
      raf=requestAnimationFrame(frame);
    }
    function start(){
      if(raf||reduced.matches)return;
      origin=performance.now();canvas.dataset.waves='running';raf=requestAnimationFrame(frame);
    }
    function stop(){
      cancelAnimationFrame(raf);raf=0;delete canvas.dataset.waves;
      if(width)ctx.clearRect(0,0,width,height);
    }

    return {start,stop};
  }

  window.JamWaves={create};
})();
