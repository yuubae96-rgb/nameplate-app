(function(root){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>1-Math.pow(1-clamp(x),3);
 function wrap(ctx,text,width){const lines=[];for(const paragraph of String(text||'').split('\n')){let line='';for(const ch of paragraph){if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line=''}line+=ch}lines.push(line)}return lines}
 function text(ctx,value,x,y,width,size,color){
   ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
   let lines;do{ctx.font=`700 ${size}px sans-serif`;lines=wrap(ctx,value,width);if(lines.length<=4)break;size-=1}while(size>12);
   lines.forEach((line,i)=>ctx.fillText(line,x,y+(i-(lines.length-1)/2)*size*1.3));
 }
 function layout(w,h){const vertical=h>w;return{vertical,nodes:vertical?[[w*.43,h*.23],[w*.43,h*.47],[w*.43,h*.71]]:[[w*.19,h*.43],[w*.5,h*.43],[w*.81,h*.43]],boxW:w*(vertical?.65:.26),boxH:h*(vertical?.125:.28),size:Math.min(w*.042,h*.053)}}
 function arrow(ctx,start,end,p,color,curve){
   p=ease(p);if(!p)return;const points=[];
   for(let i=0;i<=60*p;i++){const t=i/60;points.push(curve?[(1-t)*(1-t)*start[0]+2*(1-t)*t*curve[0]+t*t*end[0],(1-t)*(1-t)*start[1]+2*(1-t)*t*curve[1]+t*t*end[1]]:[start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t])}
   if(points.length<2)return;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Math.max(3,ctx.canvas.width*.006);ctx.lineCap='round';ctx.beginPath();points.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.stroke();const a=points.at(-2),b=points.at(-1),angle=Math.atan2(b[1]-a[1],b[0]-a[0]),s=ctx.lineWidth*3;ctx.beginPath();ctx.moveTo(...b);ctx.lineTo(b[0]-s*Math.cos(angle-.5),b[1]-s*Math.sin(angle-.5));ctx.lineTo(b[0]-s*Math.cos(angle+.5),b[1]-s*Math.sin(angle+.5));ctx.closePath();ctx.fill();
 }
 function render(ctx,cfg,time,assets=[]){
   const w=ctx.canvas.width,h=ctx.canvas.height,L=layout(w,h),color=cfg.color||'#a82e40';ctx.save();ctx.fillStyle=cfg.background||'#f7f4ec';ctx.fillRect(0,0,w,h);text(ctx,cfg.title,w/2,h*.065,w*.85,L.size*1.08,'#202c3d');
   for(let i=0;i<2;i++){const a=L.nodes[i],b=L.nodes[i+1],gap=L.vertical?L.boxH/2:L.boxW/2,start=L.vertical?[a[0],a[1]+gap]:[a[0]+gap,a[1]],end=L.vertical?[b[0],b[1]-gap]:[b[0]-gap,b[1]];const begin=Number(cfg.nodes[i+1].at)-.8;arrow(ctx,start,end,(time-begin)/.7,color);if(time>begin+.45)text(ctx,cfg.links[i],L.vertical?a[0]+w*.23:(a[0]+b[0])/2,L.vertical?(a[1]+b[1])/2:a[1]+h*.21,L.vertical?w*.28:w*.27,L.size*.65,color)}
   if(cfg.bypass){const a=L.nodes[0],b=L.nodes[2];arrow(ctx,L.vertical?[a[0]+L.boxW/2,a[1]]:[a[0],a[1]-L.boxH/2],L.vertical?[b[0]+L.boxW/2,b[1]]:[b[0],b[1]-L.boxH/2],(time-Number(cfg.nodes[2].at))/.9,color,L.vertical?[w*1.05,h*.47]:[w*.5,-h*.05]);if(time>Number(cfg.nodes[2].at)+.5)text(ctx,cfg.bypassLabel,L.vertical?w*.82:w*.5,L.vertical?h*.47:h*.17,L.vertical?w*.27:w*.4,L.size*.64,color)}
   cfg.nodes.forEach((node,i)=>{const p=clamp((time-Number(node.at))/.65);if(!p)return;const [x,y]=L.nodes[i],slide=ease(p);ctx.save();ctx.globalAlpha=p;ctx.translate(x,y);if(cfg.entrance==='slide')ctx.translate(-w*.24*(1-slide),0);else{const scale=p<.7?.65+.5*ease(p/.7):1.15-.15*ease((p-.7)/.3);ctx.scale(scale,scale)}ctx.fillStyle='#ffffff';ctx.strokeStyle=i===2?color:'#cbd3dc';ctx.lineWidth=w*.003;ctx.beginPath();ctx.roundRect(-L.boxW/2,-L.boxH/2,L.boxW,L.boxH,w*.022);ctx.fill();ctx.stroke();const iconH=L.boxH*.42;ctx.save();if(cfg.entrance==='mixed')ctx.translate(-w*.24*(1-slide),0);if(assets[i]){const im=assets[i],sc=Math.min(L.boxW*.65/im.width,iconH/im.height);ctx.drawImage(im,-im.width*sc/2,-L.boxH*.42,im.width*sc,im.height*sc)}else if(node.icon){text(ctx,node.icon,0,-L.boxH*.21,L.boxW*.8,iconH,'#22334b')}ctx.restore();text(ctx,node.label,0,node.icon||assets[i]?L.boxH*.22:0,L.boxW*.87,L.size*.8,'#202c3d');if(i===1&&cfg.cross&&time>Number(cfg.nodes[2].at)){ctx.strokeStyle=color;ctx.lineWidth=w*.009;ctx.beginPath();ctx.moveTo(-L.boxW*.45,-L.boxH*.43);ctx.lineTo(L.boxW*.45,L.boxH*.43);ctx.moveTo(L.boxW*.45,-L.boxH*.43);ctx.lineTo(-L.boxW*.45,L.boxH*.43);ctx.stroke()}ctx.restore()});ctx.restore();
 }
 const api={render,layout,wrap,clamp};root.AnimatedExplainer=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
