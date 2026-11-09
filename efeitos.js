/* ==========================================================
   Quem Me Deve · efeitos visuais
   Partículas (fundo e menu), confete, brilho do mouse,
   ondinha nos botões e sombra do topo ao rolar.
   Tudo pode ser desligado em Configurações.
   ========================================================== */
(function(){
"use strict";
var d=document,root=d.documentElement,$=function(i){return d.getElementById(i)};
var on=true;try{on=localStorage.getItem("dv-fx")!=="0"}catch(e){}
var lite=!!(window.matchMedia&&matchMedia("(hover:none),(max-width:700px)").matches);
var calm=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches);
var mouse={x:-9999,y:-9999};
addEventListener("pointermove",function(e){mouse.x=e.clientX;mouse.y=e.clientY},{passive:true});
root.addEventListener("mouseleave",function(){mouse.x=mouse.y=-9999});
function dark(){return root.dataset.theme==="dark"}

/* ---------- partículas ---------- */
var PAL={
  page:function(){return dark()?{dot:"242,201,76",dotA:.6,line:"242,201,76",lineA:.28,coin:"255,205,60"}:{dot:"184,134,11",dotA:.34,line:"184,134,11",lineA:.16,coin:"212,160,23"}},
  side:function(){return {dot:"255,255,255",dotA:.42,line:"255,255,255",lineA:.17,coin:"255,205,60"}}
};
function Field(cv,kind,density){
  var g=cv.getContext&&cv.getContext("2d");
  if(!g)return {start:function(){},stop:function(){},size:function(){}};
  var ps=[],W=0,H=0,raf=0,t=0;
  function seed(){
    var n=Math.max(12,Math.min(lite?22:64,Math.round(W*H/density)));ps=[];
    for(var i=0;i<n;i++){
      var coin=Math.random()<.14;
      ps.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3-(coin?.12:0),
        r:coin?7+Math.random()*5:1.2+Math.random()*2.4,coin:coin,rot:Math.random()*6.28,
        vr:(.012+Math.random()*.02)*(Math.random()<.5?-1:1),ph:Math.random()*6.28});
    }
  }
  function size(){
    var r=cv.getBoundingClientRect(),dpr=lite?1:Math.min(2,window.devicePixelRatio||1);
    W=Math.round(r.width);H=Math.round(r.height);
    cv.width=W*dpr;cv.height=H*dpr;g.setTransform(dpr,0,0,dpr,0,0);seed();
  }
  function frame(){
    raf=0;
    if(!on||!W||d.hidden)return;
    var p=PAL[kind](),rc=cv.getBoundingClientRect(),mx=mouse.x-rc.left,my=mouse.y-rc.top;
    var i,j,a,b,dx,dy,q;
    g.clearRect(0,0,W,H);t+=.016;
    for(i=0;i<ps.length;i++){
      a=ps[i];dx=a.x-mx;dy=a.y-my;q=dx*dx+dy*dy;
      if(q<12100&&q>1){q=Math.sqrt(q);var f=(110-q)/110*.9;a.x+=dx/q*f;a.y+=dy/q*f}
      a.x+=a.vx;a.y+=a.vy+Math.sin(t+a.ph)*.05;a.rot+=a.vr;
      if(a.x<-20)a.x=W+20;else if(a.x>W+20)a.x=-20;
      if(a.y<-20)a.y=H+20;else if(a.y>H+20)a.y=-20;
    }
    g.lineWidth=1;
    for(i=0;i<ps.length;i++){
      a=ps[i];if(a.coin)continue;
      for(j=i+1;j<ps.length;j++){
        b=ps[j];if(b.coin)continue;
        dx=a.x-b.x;dy=a.y-b.y;q=dx*dx+dy*dy;
        if(q<16900){g.strokeStyle="rgba("+p.line+","+(p.lineA*(1-q/16900))+")";g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke()}
      }
      dx=a.x-mx;dy=a.y-my;q=dx*dx+dy*dy;
      if(q<22500){g.strokeStyle="rgba("+p.line+","+(p.lineA*2.4*(1-q/22500))+")";g.beginPath();g.moveTo(a.x,a.y);g.lineTo(mx,my);g.stroke()}
    }
    for(i=0;i<ps.length;i++){
      a=ps[i];
      if(a.coin){
        var rw=Math.max(.8,a.r*Math.abs(Math.cos(a.rot)));
        g.fillStyle="rgba("+p.coin+",.85)";g.beginPath();g.ellipse(a.x,a.y,rw,a.r,0,0,6.283);g.fill();
        g.strokeStyle="rgba(255,255,255,.6)";g.lineWidth=1.2;g.beginPath();g.ellipse(a.x,a.y,rw*.62,a.r*.62,0,0,6.283);g.stroke();
      }else{
        g.fillStyle="rgba("+p.dot+","+(p.dotA*(.65+.35*Math.sin(t*1.5+a.ph)))+")";g.beginPath();g.arc(a.x,a.y,a.r,0,6.283);g.fill();
      }
    }
    if(!calm)raf=requestAnimationFrame(lite?function(){setTimeout(frame,33)}:frame);
  }
  function start(){if(!raf&&on&&cv.offsetWidth)raf=requestAnimationFrame(frame)}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;g.clearRect(0,0,W,H)}
  var rz;addEventListener("resize",function(){clearTimeout(rz);rz=setTimeout(function(){if(on){size();start()}},200)});
  d.addEventListener("visibilitychange",function(){if(d.hidden){if(raf)cancelAnimationFrame(raf);raf=0}else start()});
  size();
  return {start:start,stop:stop,size:size};
}
var fields=[];
function init(){
  root.classList.toggle("fx-off",!on);
  if($("fx"))fields.push(Field($("fx"),"page",22000));
  if($("fx2"))fields.push(Field($("fx2"),"side",12000));
  if(on)fields.forEach(function(f){f.start()});
}
var fb=$("fxb");
function lbl(){if(fb)fb.textContent=on?"Ligado":"Desligado"}
if(fb)fb.addEventListener("click",function(){
  on=!on;try{localStorage.setItem("dv-fx",on?"1":"0")}catch(e){}
  root.classList.toggle("fx-off",!on);lbl();
  fields.forEach(function(f){if(on){f.size();f.start()}else f.stop()});
});
lbl();init();

/* ---------- confete ---------- */
var cc=$("fxc"),cg=cc&&cc.getContext&&cc.getContext("2d"),cp=[],craf=0,cw=0,ch=0;
function csize(){var dpr=Math.min(2,window.devicePixelRatio||1);cw=innerWidth;ch=innerHeight;cc.width=cw*dpr;cc.height=ch*dpr;cg.setTransform(dpr,0,0,dpr,0,0)}
function cframe(){
  craf=0;cg.clearRect(0,0,cw,ch);
  cp=cp.filter(function(p){p.life++;p.vx*=.985;p.vy=p.vy*.985+.28;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;return p.life<p.max&&p.y<ch+30});
  cp.forEach(function(p){
    cg.save();cg.globalAlpha=Math.min(1,(p.max-p.life)/30);cg.translate(p.x,p.y);cg.rotate(p.rot);cg.fillStyle=p.c;
    if(p.circ){cg.beginPath();cg.arc(0,0,p.h/1.5,0,6.283);cg.fill()}else cg.fillRect(-p.w/2,-p.h/2,p.w,p.h);
    cg.restore();
  });
  if(cp.length)craf=requestAnimationFrame(cframe);else cg.clearRect(0,0,cw,ch);
}
function burst(el){
  if(!on||calm||!cg)return;
  csize();
  var x=cw/2,y=ch*.4;
  if(el&&el.getBoundingClientRect){var r=el.getBoundingClientRect();if(r.width){x=r.left+r.width/2;y=r.top+r.height/2}}
  var cols=["#ffc400","#1a6cf5","#16a34a","#ff7a45","#38bdf8","#ffffff"];
  for(var i=0;i<80;i++){
    var ang=-Math.PI/2+(Math.random()-.5)*Math.PI*1.1,sp=5+Math.random()*9;
    cp.push({x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,w:5+Math.random()*6,h:3+Math.random()*5,rot:Math.random()*6.28,vr:(Math.random()-.5)*.4,c:cols[i%cols.length],life:0,max:90+Math.random()*50,circ:Math.random()<.3});
  }
  if(!craf)craf=requestAnimationFrame(cframe);
}
window.QMD={burst:burst};

/* ---------- brilho do mouse, ondinha e sombra do topo ---------- */
d.addEventListener("pointermove",function(e){
  var t=e.target.closest&&e.target.closest(".kpi,.mot");
  if(t){var r=t.getBoundingClientRect();t.style.setProperty("--mx",(e.clientX-r.left)+"px");t.style.setProperty("--my",(e.clientY-r.top)+"px")}
},{passive:true});
d.addEventListener("click",function(e){
  if(!on||calm)return;
  var b=e.target.closest&&e.target.closest(".go,.add,.nv,.ab,.ga button");
  if(!b)return;
  var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),sp=d.createElement("span");
  sp.className="rip";sp.style.cssText="width:"+s+"px;height:"+s+"px;left:"+(e.clientX-r.left-s/2)+"px;top:"+(e.clientY-r.top-s/2)+"px";
  b.appendChild(sp);setTimeout(function(){sp.remove()},650);
});
var tb=d.querySelector(".topbar");
function sc(){if(tb)tb.classList.toggle("sc",window.scrollY>4)}
addEventListener("scroll",sc,{passive:true});sc();
})();
