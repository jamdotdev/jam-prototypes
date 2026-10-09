// A gleam that sweeps diagonally across a canvas, again and again,, from its top-left corner to its bottom-right.
(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const PERIOD=2.2,LAYERS=24,STEP=6,BEND=.05,MARGIN=.18,WIDTH=.2,ALPHA=.48;

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
      const dq=STEP/(Math.hypot(width,height)/2),center=-MARGIN+(time/PERIOD%1)*(1+2*MARGIN);
      // The front is a straight line that only trails back as it nears the corners at either end.
      const points=[];
      for(let q=-1.1;q<=1.1+dq;q+=dq){const end=Math.max(0,(Math.abs(q)-.4)/.6);points.push({q,p:center-BEND*end*end});}
      // Stacked layers narrow towards the middle, so the gleam is brightest along its crest and fades at its edges.
      ctx.fillStyle=`rgba(255,244,240,${1-Math.pow(1-ALPHA,1/LAYERS)})`;
      for(let layer=1;layer<=LAYERS;layer++){
        const share=WIDTH/2*layer/LAYERS;
        ctx.beginPath();
        for(const point of points)lineTo(point.p+share,point.q);
        for(let i=points.length-1;i>=0;i--)lineTo(points[i].p-share,points[i].q);
        ctx.closePath();ctx.fill();
      }
    }
    // `p` runs from the top-left corner (0) to the bottom-right (1), and `q` along a front, which at p = .5 joins the
    // bottom-left corner (1) to the top-right (-1).
    function lineTo(p,q){ctx.lineTo(width*(p-q/2),height*(p+q/2));}
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
