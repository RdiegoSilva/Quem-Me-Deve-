/* ==========================================================
   Quem Me Deve · área do devedor
   O devedor só VÊ: o que deve, o que pagou, o que falta e como pagar.
   Os dados chegam criptografados e só abrem com ID + senha.
   ========================================================== */
(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
var pad=function(n){return String(n).padStart(2,"0")};
var brl=function(n){return "R$ "+n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})};
var esc=function(s){var d=document.createElement("div");d.textContent=s==null?"":s;return d.innerHTML};
var fdate=function(d){var p=String(d).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:String(d)};
var monthName=function(m){var p=m.split("-"),n=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];return n[+p[1]-1]+"/"+p[0]};
var today=function(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
var WA_DEFAULT="88982293900";
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var SS={get:function(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},del:function(k){try{sessionStorage.removeItem(k)}catch(e){}}};
var D=null,pid="",pwd="",tt;
function toast(m){$("tm").textContent=m;$("toast").classList.add("on");clearTimeout(tt);tt=setTimeout(function(){$("toast").classList.remove("on")},3500)}

/* ---------- data e hora ---------- */
function tick(){
  var n=new Date(),d=n.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  d=d.replace(/(^|\s)(\p{L})/gu,function(m,a,b){return a+b.toUpperCase()}).replace(/ De /g," de ");
  $("d_clk").textContent=d+" · "+pad(n.getHours())+":"+pad(n.getMinutes())+":"+pad(n.getSeconds());
}
setInterval(tick,1000);tick();

/* ---------- regras ---------- */
function got(p){return p.paid?p.amount:Math.min(p.amount,p.got||0)}
function rem(p){var r=Math.round((p.amount-got(p))*100)/100;return r>0.004?r:0}
function dk(p){return p.due||p.month+"-31"}
function stOf(ps){
  var td=today(),ym=td.slice(0,7),open=ps.filter(function(p){return rem(p)>0});
  if(!ps.length||!open.length)return {k:"quit",label:"Quitado",cls:"st-ok"};
  if(open.some(function(p){return dk(p)<td}))return {k:"late",label:"Atrasado",cls:"st-late"};
  var cm=ps.filter(function(p){return (p.due||p.month+"-01").slice(0,7)===ym});
  if(cm.length&&cm.every(function(p){return rem(p)<=0}))return {k:"dia",label:"Em dia",cls:"st-ok"};
  if(cm.length)return {k:"pend",label:"Pendente",cls:"st-pe"};
  return {k:"dia",label:"Em dia",cls:"st-ok"};
}
function waNum(){var d=String((D&&D.cfg&&D.cfg.wa)||LS.get("qmd-wa")||WA_DEFAULT).replace(/\D/g,"");if(d&&d.length<=11)d="55"+d;return d}

/* ---------- entrar ---------- */
function readHash(){
  var m=/[#&]a=([^&]+)/.exec(location.hash);if(!m)return null;
  var t=decodeURIComponent(m[1]),i=t.indexOf(".");return i>0?{id:QM.normId(t.slice(0,i)),t:t.slice(i+1)}:null;
}
var hashTok=readHash();
async function candidates(id){
  var l=[];
  if(hashTok&&hashTok.id===id)l.push(hashTok.t);
  try{var r=await fetch("acessos.json?t="+Date.now(),{cache:"no-store"});if(r.ok){var j=await r.json();if(j&&j[id])l.push(j[id])}}catch(e){}
  var s=LS.get("qmd-tk-"+id);if(s)l.push(s);
  return l;
}
async function tryLogin(id,pass){
  id=QM.normId(id);var l=await candidates(id),best=null;
  for(var i=0;i<l.length;i++){try{var d=await QM.open(l[i],pass,id);if(!best||(d.gen||"")>(best.d.gen||""))best={d:d,t:l[i]}}catch(e){}}
  if(!best)return {err:l.length?"ID ou senha incorretos.":"Não encontrei o seu acesso. Peça o link atualizado para quem cobra."};
  LS.set("qmd-tk-"+id,best.t);
  return {d:best.d};
}
function enter(d,id,pass){
  D=d;pid=QM.normId(id);pwd=pass;SS.set("qmd-s",JSON.stringify({id:pid,pw:pass}));
  if(d.cfg&&d.cfg.wa)LS.set("qmd-wa",d.cfg.wa);
  $("login").hidden=true;$("app").hidden=false;window.scrollTo(0,0);render();
}
$("lf").addEventListener("submit",async function(e){
  e.preventDefault();$("l_err").textContent="";
  var id=$("l_id").value,pw=$("l_pw").value;if(!id||!pw)return;
  $("l_go").disabled=true;$("l_go").textContent="Entrando...";
  var r=await tryLogin(id,pw);
  $("l_go").disabled=false;$("l_go").textContent="Entrar";
  if(r.err){$("l_err").textContent=r.err;return}
  if($("l_rm").checked)LS.set("qmd-id",QM.normId(id));
  enter(r.d,id,pw);
});
$("l_forgot").addEventListener("click",function(){
  var id=QM.normId($("l_id").value);
  var t="Olá! Esqueci a minha senha da Área do devedor."+(id?" Meu ID é "+id+".":"")+" Pode me enviar uma nova?";
  window.open("https://wa.me/"+waNum()+"?text="+encodeURIComponent(t),"_blank","noopener");
});
$("d_out").addEventListener("click",function(){SS.del("qmd-s");D=null;$("app").hidden=true;$("login").hidden=false;$("l_pw").value="";$("l_err").textContent=""});
$("d_print").addEventListener("click",function(){window.print()});
window.addEventListener("beforeprint",function(){document.querySelectorAll("details.dbt").forEach(function(d){d.open=true})});

/* ---------- painel ---------- */
function allParcels(){var a=[];D.debts.forEach(function(d){d.parcels.forEach(function(p){a.push(p)})});return a}
function render(){
  var P=D.person,ps=allParcels(),T=0,G=0,R=0,N=0;
  ps.forEach(function(p){T+=p.amount;G+=got(p);R+=rem(p);if(rem(p)>0)N++});
  $("d_hi").textContent="Olá, "+String(P.name).split(" ")[0]+"!";
  $("d_id").textContent="ID "+P.code+" · "+P.name;
  $("k_t").textContent=brl(T);$("k_p").textContent=brl(G);$("k_r").textContent=brl(Math.round(R*100)/100);$("k_n").textContent=N;
  var st=stOf(ps),td=today(),ym=td.slice(0,7);
  $("d_st").className="st "+st.cls;$("d_st").textContent=st.label;
  var open=ps.filter(function(p){return rem(p)>0}).sort(function(a,b){return dk(a)<dk(b)?-1:1}),nx=open[0];
  var late=open.filter(function(p){return dk(p)<td}),lateSum=0;late.forEach(function(p){lateSum+=rem(p)});
  var msg="";
  if(st.k==="quit")msg="Parabéns! Você quitou todas as suas dívidas. 🎉";
  else if(st.k==="late")msg="Você tem "+late.length+" parcela"+(late.length>1?"s":"")+" atrasada"+(late.length>1?"s":"")+" ("+brl(Math.round(lateSum*100)/100)+"). Pague o quanto antes.";
  else if(st.k==="dia"&&nx)msg="Você está em dia neste mês. Próxima parcela: "+(nx.due?fdate(nx.due):monthName(nx.month))+" · "+brl(rem(nx))+".";
  else if(nx)msg="Sua parcela vence em "+(nx.due?fdate(nx.due):monthName(nx.month))+": "+brl(rem(nx))+".";
  $("d_nx").textContent=msg;
  $("d_pay").hidden=st.k==="quit";
  // dívidas
  var h=D.debts.map(function(d,di){
    var t=0,g=0,r=0,np=0,nxp=null;
    d.parcels.forEach(function(p){t+=p.amount;g+=got(p);r+=rem(p);if(p.paid)np++;if(rem(p)>0&&!nxp)nxp=p});
    var pc=t?Math.round(g/t*100):0,s=stOf(d.parcels);
    var meta=[d.cat?"Origem: "+d.cat:"",d.parcels[0]&&d.parcels[0].due?"vence todo dia "+d.parcels[0].due.slice(8,10):"",d.note?d.note:"",nxp?"próxima: "+(nxp.due?fdate(nxp.due):monthName(nxp.month)):""].filter(Boolean).join(" · ");
    var rows=d.parcels.map(function(p){
      var st2,det="";
      if(rem(p)<=0){st2='<span class="stp" style="background:var(--okb);color:var(--ok)">Pago</span>';det=p.at?"pago em "+fdate(p.at)+(p.tm?" às "+p.tm:""):"pago"}
      else if(dk(p)<td){st2='<span class="stp" style="background:var(--pe);color:#fff">Atrasada</span>';det=got(p)>0?"pagou "+brl(got(p))+" · falta "+brl(rem(p)):""}
      else if((p.due||p.month+"-01").slice(0,7)===ym){st2='<span class="stp" style="background:var(--peb);color:var(--pe)">Vence neste mês</span>';det=got(p)>0?"pagou "+brl(got(p))+" · falta "+brl(rem(p)):""}
      else{st2='<span class="stp" style="background:var(--bd);color:var(--mu)">A vencer</span>'}
      return '<div class="dr"><span class="lb">'+esc(p.n)+'</span><span>vence '+(p.due?fdate(p.due):monthName(p.month))+(det?'<br><span class="s">'+esc(det)+'</span>':"")+'</span><b>'+brl(p.amount)+'</b>'+st2+'</div>';
    }).join("");
    return '<details class="dbt"'+(D.debts.length===1?" open":"")+'><summary><h3><span class="chev">▾</span>'+esc(d.name)+(d.dn?' <span class="cd">Nº '+d.dn+'</span>':"")+' <span class="st '+s.cls+'" style="font-size:11px;padding:3px 11px">'+s.label+'</span></h3><div class="amt">'+brl(t)+'<small>falta '+brl(Math.round(r*100)/100)+'</small></div><div class="meta">'+np+' de '+d.parcels.length+' parcelas pagas'+(meta?" · "+esc(meta):"")+'</div><div class="pb" title="'+pc+'% pago"><i style="width:'+pc+'%"></i></div></summary><div class="rows">'+rows+'</div></details>';
  }).join("");
  $("d_debts").innerHTML=h||'<div class="empty">Você não tem dívidas registradas.</div>';
  // pagamentos
  var py=(D.pays||[]).slice().sort(function(a,b){var x=a.date+(a.tm||""),y=b.date+(b.tm||"");return x<y?1:x>y?-1:0});
  $("d_pays").innerHTML=py.length?py.map(function(p){return '<div class="pyr"><div><b style="color:var(--tx)">'+fdate(p.date)+(p.tm?" às "+p.tm:"")+'</b><span class="mt">'+esc(p.method)+'</span>'+(p.label?'<div class="s">'+esc(p.label)+'</div>':"")+'</div><b>'+brl(p.amount)+'</b></div>'}).join(""):'<div class="empty" style="padding:24px">Nenhum pagamento registrado ainda.</div>';
  var g=D.gen?new Date(D.gen):null;
  $("d_upd").textContent=g&&!isNaN(g)?"Dados atualizados em "+g.toLocaleDateString("pt-BR")+" às "+pad(g.getHours())+":"+pad(g.getMinutes())+". Se você pagou depois disso, peça para atualizarem.":"";
}

/* ---------- pagar ---------- */
var pkS={v:0};
function copy(t,msg){
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast(msg||"Copiado!")},function(){
    var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast(msg||"Copiado!")}catch(e){toast("Não consegui copiar.")}a.remove();
  });
}
function amounts(){
  var ps=allParcels(),end=today().slice(0,7)+"-31",now=0,tot=0,nxt=0;
  ps.forEach(function(p){tot+=rem(p);if(dk(p)<=end)now+=rem(p)});
  var o=ps.filter(function(p){return rem(p)>0}).sort(function(a,b){return dk(a)<dk(b)?-1:1})[0];if(o)nxt=rem(o);
  var r=function(n){return Math.round(n*100)/100};
  return {now:r(now),next:r(nxt),tot:r(tot)};
}
function pixHtml(){
  var C=D.cfg||{},keys=(C.pix||[]).slice().sort(function(a,b){return (b.main?1:0)-(a.main?1:0)}),v=parseFloat($("pq_v").value)||0;
  if(!keys.length)return '<p class="s">Quem cobra ainda não cadastrou uma chave Pix. Fale pelo WhatsApp para combinar o pagamento.</p><button class="add" id="pk_wa">Falar no WhatsApp</button>';
  var m=keys[0],code=QM.pixPayload({type:m.type,key:m.key,name:m.name,city:m.city,amount:v});
  var h='<div class="pxk"><div class="row"><div><div class="s">'+esc(m.type)+(m.main?" · principal":"")+'</div><div class="key">'+esc(m.key)+'</div></div><button class="sec" data-ck="'+esc(m.key).replace(/"/g,"&quot;")+'">Copiar chave</button></div><div class="s">'+(m.name?"Titular: "+esc(m.name):"")+(m.bank?" · "+esc(m.bank):"")+'</div></div>';
  h+='<div class="pxqr">'+QM.qrSvg(code,210)+'</div><label for="pk_code">Pix copia e cola'+(v>0?" ("+brl(v)+")":"")+'</label><textarea id="pk_code" class="pxcode" readonly>'+esc(code)+'</textarea><button class="add" id="pk_copy" style="width:100%;margin-top:8px">Copiar Pix copia e cola</button>';
  if(keys.length>1)h+='<details class="more" style="margin-top:12px"><summary>Outras chaves Pix</summary>'+keys.slice(1).map(function(k){return '<div class="pxk"><div class="row"><div><div class="s">'+esc(k.type)+'</div><div class="key">'+esc(k.key)+'</div></div><button class="sec" data-ck="'+esc(k.key).replace(/"/g,"&quot;")+'">Copiar</button></div><div class="s">'+(k.name?"Titular: "+esc(k.name):"")+(k.bank?" · "+esc(k.bank):"")+'</div></div>'}).join("")+'</details>';
  return h;
}
function pkDraw(){$("pk_main").innerHTML=pixHtml()}
function openPay(){
  var a=amounts(),chips="";
  if(a.now>0)chips+='<button type="button" data-v="'+a.now+'">Em aberto agora · '+brl(a.now)+'</button>';
  if(a.next>0&&a.next!==a.now)chips+='<button type="button" data-v="'+a.next+'">Próxima parcela · '+brl(a.next)+'</button>';
  if(a.tot>0&&a.tot!==a.now)chips+='<button type="button" data-v="'+a.tot+'">Pagar tudo · '+brl(a.tot)+'</button>';
  $("pq").innerHTML=chips;
  $("pq_v").value=a.now>0?a.now:(a.next||a.tot||"");
  pkChips();pkDraw();$("pgd").showModal();
}
function pkChips(){var v=parseFloat($("pq_v").value)||0;document.querySelectorAll("#pq button").forEach(function(b){b.classList.toggle("on",Math.abs(parseFloat(b.dataset.v)-v)<0.005)})}
$("d_pay").addEventListener("click",openPay);
$("pq").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;$("pq_v").value=b.dataset.v;pkChips();pkDraw()});
$("pq_v").addEventListener("input",function(){pkChips();pkDraw()});
$("pk_main").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  if(b.dataset.ck)copy(b.dataset.ck,"Chave copiada!");
  else if(b.id==="pk_copy")copy($("pk_code").value,"Pix copia e cola copiado!");
  else if(b.id==="pk_wa")window.open("https://wa.me/"+waNum()+"?text="+encodeURIComponent("Olá! Sou "+D.person.name+" ("+D.person.code+"). Quero combinar o pagamento."),"_blank","noopener");
});
$("pq_wa").addEventListener("click",function(){
  var v=parseFloat($("pq_v").value)||0,n=new Date(),dt=n.toLocaleDateString("pt-BR"),tm=pad(n.getHours())+":"+pad(n.getMinutes());
  var t="Olá! Aqui é "+D.person.name+" (ID "+D.person.code+"). Fiz um pagamento"+(v>0?" de "+brl(v):"")+" ("+$("pq_m").value+") em "+dt+" às "+tm+". Pode conferir e dar baixa?";
  window.open("https://wa.me/"+waNum()+"?text="+encodeURIComponent(t),"_blank","noopener");
});
document.querySelectorAll("[data-close]").forEach(function(b){b.addEventListener("click",function(){var d=$(b.dataset.close);if(d.open)d.close()})});
$("pgd").addEventListener("click",function(e){if(e.target===$("pgd"))$("pgd").close()});

/* ---------- início ---------- */
var rid=LS.get("qmd-id");
if(hashTok)$("l_id").value=hashTok.id;else if(rid)$("l_id").value=rid;
(async function(){
  var s=SS.get("qmd-s");if(!s)return;
  try{var o=JSON.parse(s),r=await tryLogin(o.id,o.pw);if(r.d)enter(r.d,o.id,o.pw)}catch(e){}
})();
})();
