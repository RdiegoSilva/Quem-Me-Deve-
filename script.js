(function(){
var items=[],bin=[],people={},col=null,first=true,KEY="dividas-v1",PK="dividas-pessoas-v1";
var $=function(i){return document.getElementById(i)};
var brl=function(n){return "R$ "+n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})};
var esc=function(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML};
var monthName=function(m){var p=m.split("-");var n=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];return n[+p[1]-1]+"/"+p[0]};
var calm=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
var pad=function(n){return String(n).padStart(2,"0")};
var today=function(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
$("mon").value=today();
try{if(LS.get("dv-pin-on")==="0"||sessionStorage.getItem("dv-ok")==="1")$("lock").hidden=true}catch(e){}

/* ---------- valores ---------- */
function got(x){return x.paid?x.amount:Math.min(x.amount,x.got||0)}
function rem(x){return Math.max(0,x.amount-got(x))}

/* ---------- som ---------- */
var ac,muted=LS.get("dv-mute")==="1";
var SEQ={tap:[[520,.05]],ok:[[660,.09],[880,.12],[1175,.2]],undo:[[440,.08],[330,.12]],del:[[300,.1],[200,.16]],add:[[587,.08],[784,.16]],wa:[[700,.06],[900,.06],[700,.1]]};
function snd(k){
  if(muted)return;
  try{
    ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();
    var t=ac.currentTime;
    (SEQ[k]||[]).forEach(function(n){
      var o=ac.createOscillator(),g=ac.createGain();o.type="triangle";o.frequency.value=n[0];
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+n[1]);
      o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+n[1]+.03);t+=n[1]*.8;
    });
  }catch(e){}
}
function sndBtn(){$("snd").textContent=muted?"Desligado":"Ligado"}
$("snd").addEventListener("click",function(){muted=!muted;LS.set("dv-mute",muted?"1":"0");sndBtn();snd("tap")});sndBtn();

/* ---------- tema ---------- */
var root=document.documentElement;
function themeNow(){return root.dataset.theme||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}
function themeBtn(){$("th").value=root.dataset.theme||""}
if(LS.get("dv-th"))root.dataset.theme=LS.get("dv-th");
$("th").addEventListener("change",function(){var v=$("th").value;if(v){root.dataset.theme=v;LS.set("dv-th",v)}else{delete root.dataset.theme;LS.set("dv-th","")}snd("tap")});themeBtn();

/* ---------- aviso com desfazer ---------- */
var tt,undoFn=null,t2fn=null;
function toast(msg,fn,l2,f2){
  $("tm").textContent=msg;undoFn=fn||null;t2fn=f2||null;$("tu").hidden=!fn;$("t2").hidden=!f2;$("t2").textContent=l2||"";$("toast").classList.add("on");
  clearTimeout(tt);tt=setTimeout(function(){$("toast").classList.remove("on");undoFn=null;t2fn=null},f2?8000:6000);
}
$("tu").addEventListener("click",function(){if(undoFn){undoFn();snd("undo")}$("toast").classList.remove("on");undoFn=null});
$("t2").addEventListener("click",function(){var f=t2fn;$("toast").classList.remove("on");t2fn=null;if(f)f()});

/* ---------- salvar ---------- */
function pid(n){return "p_"+Array.from(new TextEncoder().encode(n)).map(function(b){return b.toString(16).padStart(2,"0")}).join("")}
function saveLocal(){LS.set(KEY,JSON.stringify(items.concat(bin)));LS.set(PK,JSON.stringify(people))}
function loadLocal(){try{var all=JSON.parse(LS.get(KEY)||"[]");items=all.filter(function(x){return !x.deleted});bin=all.filter(function(x){return x.deleted})}catch(e){items=[];bin=[]}try{people=JSON.parse(LS.get(PK)||"{}")}catch(e){people={}}}
function put(o){
  var old=items.find(function(x){return x.id===o.id})||bin.find(function(x){return x.id===o.id});
  if(old){o=Object.assign({},o);var lg=(old.log||[]).concat(logOf(old,o)).slice(-40);if(lg.length)o.log=lg;else delete o.log}
  if(col){var b=Object.assign({},o);delete b.id;col.doc(o.id).set(b).catch(function(){alert("Erro ao salvar")})}
  else{var A=o.deleted?bin:items,B=o.deleted?items:bin;B=B.filter(function(x){return x.id!==o.id});var i=A.findIndex(function(x){return x.id===o.id});if(i>=0)A[i]=o;else A.push(o);if(o.deleted){bin=A;items=B}else{items=A;bin=B}saveLocal();render()}
}
function remove(id){
  if(col)col.doc(id).delete();else{items=items.filter(function(x){return x.id!==id});bin=bin.filter(function(x){return x.id!==id});saveLocal();render()}
}
function putPerson(n,p){
  if(col)col.doc(pid(n)).set({type:"person",name:n,phone:p.phone||"",photo:p.photo||""}).catch(function(){alert("Erro ao salvar")});
  else{people[n]={phone:p.phone||"",photo:p.photo||""};saveLocal();render()}
}
function delPerson(n){if(col)col.doc(pid(n)).delete();else{delete people[n];saveLocal()}}

/* ---------- pessoas ---------- */
function av(n){
  var p=people[n];
  if(p&&p.photo)return '<img class="av" alt="" src="'+p.photo+'">';
  var h=0;for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%360;
  return '<span class="av" style="--h:'+h+'">'+esc(n.trim().charAt(0).toUpperCase()||"?")+'</span>';
}
function waNum(p){var d=(p||"").replace(/\D/g,"");if(d&&d.length<=11)d="55"+d;return d}

/* ---------- tela ---------- */
function num(el,to){
  var from=el._v||0,k=el._k=(el._k||0)+1;el._v=to;
  if(calm||from===to){el.textContent=brl(to);return}
  var t0=performance.now();
  (function f(t){if(el._k!==k)return;var q=Math.min(1,(t-t0)/600),e=1-Math.pow(1-q,3);el.textContent=brl(from+(to-from)*e);if(q<1)requestAnimationFrame(f)})(t0);
}
function fill(sel,vals,label,cur){
  sel.innerHTML="";var o=document.createElement("option");o.value="";o.textContent=label;sel.appendChild(o);
  vals.forEach(function(v){var e=document.createElement("option");e.value=v[0];e.textContent=v[1];sel.appendChild(e)});
  sel.value=vals.some(function(v){return v[0]===cur})?cur:"";
}
function opts(a){return a.map(function(p){return '<option value="'+esc(p).replace(/"/g,"&quot;")+'">'}).join("")}
function fdate(d){var p=d.split("-");return p[2]+"/"+p[1]+"/"+p[0]}
function ddmm(d){var p=d.split("-");return p[2]+"/"+p[1]}

function render(){
  var fm=$("fm").value,fp=$("fp").value;
  var months=[...new Set(items.map(function(x){return x.month}))].sort().reverse();
  var names=[...new Set(items.map(function(x){return x.who}))].sort();
  var allNames=[...new Set(names.concat(Object.keys(people)))].sort();
  var cats=[...new Set(items.map(function(x){return x.cat}).filter(Boolean))].sort();
  fill($("fm"),months.map(function(m){return [m,monthName(m)]}),"Todos os meses",fm);
  fill($("fp"),names.map(function(p){return [p,p]}),"Todos",fp);
  $("ppl").innerHTML=opts(allNames);$("cats").innerHTML=opts(cats);
  fm=$("fm").value;fp=$("fp").value;var fs=$("fs").value,q=$("q").value.trim().toLowerCase();
  var v=items.filter(function(x){
    if(fm&&x.month!==fm||fp&&x.who!==fp)return false;
    if(fs!==""&&String(+!!x.paid)!==fs&&!(fs==="0"&&rem(x)>0))return false;
    if(fs==="1"&&!x.paid)return false;
    return !q||(x.desc+" "+x.who+" "+(x.cat||"")+" "+(x.note||"")+" "+monthName(x.month)).toLowerCase().indexOf(q)>=0;
  });
  var tp=0,tk=0;v.forEach(function(x){tp+=rem(x);tk+=got(x)});
  var cp=0,ck=0;v.forEach(function(x){if(rem(x)>0)cp++;if(got(x)>0)ck++});$("kpn").textContent=cp+" em aberto";$("kkn").textContent=ck+" com pagamento";$("ktn").textContent=v.length+" dívidas";$("cnt").textContent=v.length+" de "+items.length;
  $("h_p").textContent=new Set(items.map(function(x){return x.who})).size;$("h_n").textContent=items.filter(function(x){return rem(x)>0}).length;$("h_k").textContent=items.filter(function(x){return x.paid}).length;
  num($("tp"),tp);num($("tk"),tk);num($("tt"),tp+tk);
  var g={};v.forEach(function(x){(g[x.who]=g[x.who]||[]).push(x)});
  var h="",n=0,cls=first?" in":"";
  Object.keys(g).sort().forEach(function(w){
    var pend=0,gT=0,gG=0;g[w].forEach(function(x){pend+=rem(x);gT+=x.amount;gG+=got(x)});var pc=gT?Math.round(gG/gT*100):0;
    var ew=encodeURIComponent(w);
    h+='<div class="group"><div class="gh">'+av(w)+'<button class="gn" data-r="'+ew+'" title="Editar pessoa">'+esc(w)+'</button><span class="gp">pendente '+brl(pend)+'</span><button class="gear" data-r="'+ew+'" title="Total da dívida, foto e telefone" aria-label="Configurações de '+esc(w).replace(/"/g,"")+'">⚙</button><div class="ga"><button class="wa" data-w="'+ew+'">Cobrar no WhatsApp</button><button data-x="'+ew+'">Extrato</button><button data-rb="'+ew+'">Recibo</button><button data-q="'+ew+'">Quitar tudo</button></div></div><div class="pb gpb" title="'+pc+'% pago"><i style="width:'+pc+'%"></i></div>';
    var gk={},ord=[];
    g[w].forEach(function(x){
      var s=sib(x.id),k=s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id;
      if(!gk[k]){gk[k]={all:s.length?s:[x],rows:[],o:"9999"};ord.push(gk[k])}
      gk[k].rows.push(x);
      if(rem(x)>0){var dk=x.date||x.month+"-01";if(dk<gk[k].o)gk[k].o=dk}
    });
    ord.sort(function(a,b){return a.o<b.o?-1:a.o>b.o?1:0});
    ord.forEach(function(G){
      var multi=G.all.length>1,np=0,dT=0,dP=0,dR=0;
      G.all.forEach(function(y){if(y.paid)np++;dT+=y.amount;dP+=got(y);dR+=rem(y)});
      h+='<div class="debt'+(multi?"":" one")+'">';
      if(multi){var dp=dT?Math.round(dP/dT*100):0;
        h+='<div class="dh"><div class="dt"><b>'+esc(G.all[0].desc.replace(/\s*\d+\/\d+$/,""))+'</b><span class="s">'+np+' de '+G.all.length+' parcelas pagas · falta '+brl(dR)+'</span></div><div class="dbtn"><button class="pcs" data-k="'+G.all[0].id+'">Parcelas</button><button class="pcs" data-rc="'+G.all[0].id+'">Recibo</button></div></div><div class="pb" title="'+dp+'% pago"><i style="width:'+dp+'%"></i></div>';
      }
      G.rows.sort(function(a,b){return (a.paid?1:0)-(b.paid?1:0)||((a.date||a.month)<(b.date||b.month)?-1:1)}).forEach(function(x){
      var gt=got(x),part=!x.paid&&gt>0,sub=[x.date?fdate(x.date):monthName(x.month)];
      var meta=(x.cat?'<span class="c">'+esc(x.cat)+'</span>':"")+sub[0]+(x.note?" · "+esc(x.note):"")+(x.paid&&x.paidAt?" · pago em "+ddmm(x.paidAt):"");
      h+='<div class="it'+(x.paid?" paid":"")+(sel.has(x.id)?" sel":"")+cls+'" style="animation-delay:'+Math.min(n++,12)*45+'ms">'+(selMode?'<input type="checkbox" class="sk" data-s="'+x.id+'"'+(sel.has(x.id)?" checked":"")+' aria-label="Selecionar">':"")+'<div class="m"><div class="d">'+esc(x.desc)+'</div><div class="s">'+meta+'</div>'+(part?'<div class="pb"><i style="width:'+Math.round(gt/x.amount*100)+'%"></i></div>':"")+'</div><div class="v">'+brl(x.amount)+(part?'<small>falta '+brl(rem(x))+'</small>':"")+'</div><button class="tg '+(x.paid?"o":"p")+'" data-t="'+x.id+'">'+(x.paid?"Pago":"Pendente")+'</button>'+(x.proof?'<button class="pcs" data-v="'+x.id+'">📎 Comprovante</button>':x.paid?'<button class="pcs" data-a="'+x.id+'">+ Comprovante</button>':"")+'<button class="x" data-e="'+x.id+'" title="Editar">✎</button><button class="x" data-d="'+x.id+'" title="Apagar">✕</button></div>';
      });
      h+='</div>';
    });
    h+='</div>';
  });
  $("list").innerHTML=(view==="table"&&!selMode)?tableHTML(v):h||'<div class="empty">Nenhuma dívida encontrada. Adicione no formulário ou ajuste os filtros.</div>';
  if(v.length)first=false;
  sel.forEach(function(i){if(!items.some(function(x){return x.id===i}))sel.delete(i)});
  dash(v,tp,tk);recv();renderBin();selN();
}

function addM(ym,i){var p=ym.split("-"),d=new Date(+p[0],+p[1]-1+i,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
function recv(){
  var fp=$("fp").value,map={},cur=today().slice(0,7);
  items.forEach(function(x){if(!x.paid||(fp&&x.who!==fp))return;var m=(x.paidAt||x.month).slice(0,7);map[m]=(map[m]||0)+x.amount});
  var ks=Object.keys(map).sort(),end=ks.length&&ks[ks.length-1]>cur?ks[ks.length-1]:cur;
  var e=ks.length?ks[0]:end,ep=e.split("-"),np=end.split("-"),diff=(+np[0]-+ep[0])*12+(+np[1]-+ep[1]);
  var span=Math.min(11,Math.max(5,diff)),ms=[];
  for(var i=-span;i<=0;i++)ms.push(addM(end,i));
  var mx=Math.max.apply(null,ms.map(function(m){return map[m]||0}).concat([1])),sum=0;
  $("rc").innerHTML=ms.map(function(m){
    var v=map[m]||0;sum+=v;
    return '<div class="col'+(m===cur?" now":"")+'" title="'+monthName(m)+': '+brl(v)+'"><span class="cv">'+(v?"R$ "+Math.round(v).toLocaleString("pt-BR"):"–")+'</span><div class="cb"><i style="height:'+(v/mx*100)+'%"></i></div><span class="cm">'+monthName(m).replace(/\/\d\d(\d\d)/,"/$1")+'</span></div>';
  }).join("");
  $("rtot").textContent="Recebido: "+brl(sum)+" · média "+brl(sum/ms.length)+"/mês";
  var sc=$("rc");sc.scrollLeft=sc.scrollWidth;
}
function bars(el,map,empty){
  var k=Object.keys(map).sort(function(a,b){return map[b]-map[a]});
  var mx=Math.max.apply(null,k.map(function(x){return map[x]}).concat([1]));
  el.innerHTML=k.map(function(x){return '<div class="br"><span>'+esc(x)+'</span><div class="t"><b class="b" style="width:'+map[x]/mx*100+'%"></b></div><span>'+brl(map[x])+'</span></div>'}).join("")||'<div class="s">'+empty+'</div>';
}
function dash(v,tp,tk){
  var tot=tp+tk,pct=tot>0?Math.max(0,Math.min(100,Math.round(tk/tot*100))):0;
  $("dn").classList.toggle("e",!(tot>0));
  requestAnimationFrame(function(){$("dn").style.setProperty("--p",pct)});
  $("pct").innerHTML=pct+"%<small>pago</small>";
  var pp={},oo={},mm={};
  v.forEach(function(x){
    var r=rem(x),m=mm[x.month]=mm[x.month]||{a:0,b:0};
    if(r>0){pp[x.who]=(pp[x.who]||0)+r;var c=x.cat||"Sem origem";oo[c]=(oo[c]||0)+r}
    m.a+=got(x);m.b+=r;
  });
  bars($("bp"),pp,"Nada pendente.");bars($("bo"),oo,"Nada pendente.");
  var ms=Object.keys(mm).sort(),mx=Math.max.apply(null,ms.map(function(k){return mm[k].a+mm[k].b}).concat([1]));
  $("bm").innerHTML=ms.map(function(k){var o=mm[k];return '<div class="br"><span>'+monthName(k)+'</span><div class="t"><b class="a" style="width:'+o.a/mx*100+'%"></b><b class="b" style="width:'+o.b/mx*100+'%"></b></div><span>'+brl(o.a+o.b)+'</span></div>'}).join("")||'<div class="s">Sem dados.</div>';
}

/* ---------- arquivos (backup e CSV) ---------- */
function say(t){$("bs").textContent=t}
function backupText(){return "// Backup Quem Me Deve, "+today()+"\nwindow.DIVIDAS_BACKUP = "+JSON.stringify(items,null,2)+";\nwindow.DIVIDAS_PESSOAS = "+JSON.stringify(people)+";\n"}
async function saveFile(name,text,mime,okMsg){
  try{var d=window.claude?await claude.use("downloads"):null;if(d){await d.save({filename:name,data:text});say(okMsg);return}}catch(e){}
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.appendChild(a);a.click();a.remove();say(okMsg);
}
$("bc").addEventListener("click",function(){
  var t=backupText(),ok="Backup copiado. Cole em um arquivo dividas-backup.js.";
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){say(ok)},function(){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");say(ok)}catch(e){say("Não consegui copiar. Use o botão de baixar.")}a.remove()});
});
$("bd").addEventListener("click",function(){saveFile("dividas-backup-"+today()+".js",backupText(),"text/javascript","Backup baixado.")});
$("cv").addEventListener("click",function(){
  var q=function(s){return '"'+String(s==null?"":s).replace(/"/g,'""')+'"'},m=function(n){return n.toFixed(2).replace(".",",")};
  var rows=[["Descrição","Pessoa","Origem","Data","Valor","Pago","Falta","Situação","Pago em","Observação"]].concat(items.map(function(x){return [x.desc,x.who,x.cat||"",x.date||x.month,m(x.amount),m(got(x)),m(rem(x)),x.paid?"Pago":"Pendente",x.paidAt||"",x.note||""]}));
  saveFile("dividas-"+today()+".csv","\ufeff"+rows.map(function(r){return r.map(q).join(";")}).join("\r\n"),"text/csv","Planilha CSV baixada. Abra no Excel.");
});
$("br").addEventListener("click",function(){$("bf").click()});
$("bf").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;var r=new FileReader();
  r.onload=function(){
    try{
      var s=String(r.result),pi=s.lastIndexOf("DIVIDAS_PESSOAS"),it=pi>0?s.slice(0,pi):s;
      var a=it.indexOf("["),b=it.lastIndexOf("]"),arr=JSON.parse(it.slice(a,b+1)),n=0;
      arr.forEach(function(o){if(o&&o.id&&o.desc&&typeof o.amount==="number"&&o.who&&o.month){put({id:String(o.id),desc:String(o.desc),who:String(o.who),amount:o.amount,date:String(o.date||""),month:String(o.month),paid:!!o.paid,note:String(o.note||""),cat:String(o.cat||""),got:+o.got||0,paidAt:String(o.paidAt||""),proof:String(o.proof||""),ts:o.ts||Date.now()});n++}});
      if(pi>0){var ps=JSON.parse(s.slice(s.indexOf("{",pi),s.lastIndexOf("}")+1));Object.keys(ps).forEach(function(k){putPerson(k,ps[k])})}
      say(n+" itens restaurados.");
    }catch(x){say("Arquivo de backup inválido.")}
    $("bf").value="";
  };
  r.readAsText(f);
});

/* ---------- parcelas ---------- */
function sib(id){
  var i=id.lastIndexOf("_");if(i<1)return [];var p=id.slice(0,i+1);
  var r=items.filter(function(x){return x.id.indexOf(p)===0}).sort(function(a,b){return a.month<b.month?-1:a.month>b.month?1:0});
  return r.length>1?r:[];
}
var kIds=[],sibs=[],kRef="";
function openParcels(id){
  var r=sib(id);if(!r.length)r=items.filter(function(x){return x.id===id});if(!r.length)return;kIds=r.map(function(x){return x.id});kRef=r[0].id;
  $("k_t").textContent=r[0].who+" · marque as parcelas pagas";
  $("k_l").innerHTML=r.map(function(x){return '<label class="pl"><input type="checkbox" data-k="'+x.id+'"'+(x.paid?" checked":"")+'><span>'+esc(x.desc)+' <small class="s">'+monthName(x.month)+'</small></span><b>'+brl(x.amount)+'</b></label>'}).join("");
  $("kd").showModal();
}
$("k_all").addEventListener("click",function(){document.querySelectorAll("#k_l input").forEach(function(i){i.checked=true})});
$("kf").addEventListener("submit",function(e){
  e.preventDefault();var prev=[];
  document.querySelectorAll("#k_l input").forEach(function(i){
    var it=items.find(function(x){return x.id===i.dataset.k});if(!it||it.paid===i.checked)return;
    prev.push(it);
    put(i.checked?Object.assign({},it,{paid:true,got:it.amount,paidAt:today()}):Object.assign({},it,{paid:false,got:0,paidAt:""}));
  });
  closeDlg($("kd"));
  if(prev.length){snd("ok");toast(prev.length+" parcela(s) atualizada(s).",function(){prev.forEach(function(x){put(x)})})}
});

/* ---------- extrato ---------- */
var xName="";
function stmt(w){
  var r=items.filter(function(x){return x.who===w}).sort(function(a,b){return a.month<b.month?-1:a.month>b.month?1:0});
  var tp=0,tk=0;r.forEach(function(x){tp+=rem(x);tk+=got(x)});
  var lbl=function(x){return x.desc+" ("+monthName(x.month)+")"};
  return {tp:tp,tk:tk,sec:[
    {t:"Pendente",c:"#b45309",r:r.filter(function(x){return rem(x)>0}).map(function(x){return [lbl(x),brl(rem(x))]})},
    {t:"Já pago",c:"#14803c",r:r.filter(function(x){return got(x)>0}).map(function(x){return [lbl(x)+(x.paid&&x.paidAt?" · pago em "+ddmm(x.paidAt):x.paid?"":" · parcial"),brl(got(x))]})}
  ]};
}
function stmtText(w){
  var s=stmt(w),d=new Date().toLocaleDateString("pt-BR");
  var t="Extrato de "+w+" ("+d+")\n";
  s.sec.forEach(function(x){if(x.r.length)t+="\n"+x.t.toUpperCase()+"\n"+x.r.map(function(r){return "• "+r[0]+": "+r[1]}).join("\n")+"\n"});
  return t+"\nTotal pago: "+brl(s.tk)+"\nFalta pagar: "+brl(s.tp);
}
function openStmt(w){
  xName=w;var s=stmt(w);
  $("x_b").innerHTML='<h2 class="xh">'+esc(w)+'</h2><div class="s">Extrato em '+new Date().toLocaleDateString("pt-BR")+'</div>'+
    s.sec.map(function(x){return x.r.length?'<div class="xs">'+x.t+'</div>'+x.r.map(function(r){return '<div class="xr"><span>'+esc(r[0])+'</span><b>'+r[1]+'</b></div>'}).join(""):""}).join("")+
    '<div class="xt"><span class="ok">Pago '+brl(s.tk)+'</span><span class="pe">Falta '+brl(s.tp)+'</span></div>';
  $("xd").showModal();
}
$("x_c").addEventListener("click",function(){
  var t=stmtText(xName);
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast("Extrato copiado.");snd("ok")},function(){toast("Não consegui copiar. Use o WhatsApp.")});
});
$("x_w").addEventListener("click",function(){snd("wa");window.open("https://wa.me/"+waNum((people[xName]||{}).phone)+"?text="+encodeURIComponent(stmtText(xName)),"_blank","noopener")});
$("x_i").addEventListener("click",function(){
  var s=stmt(xName),W=720,P=32,L=36,H=130,y=H+10;
  var rows=0;s.sec.forEach(function(x){if(x.r.length)rows+=x.r.length+1});
  var cv=document.createElement("canvas"),sc=2;cv.width=W*sc;cv.height=(H+rows*L+120)*sc;
  var g=cv.getContext("2d");g.scale(sc,sc);
  g.fillStyle="#fff";g.fillRect(0,0,W,cv.height);
  var gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,"#4a0988");gr.addColorStop(1,"#b13fe0");g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.fillStyle="#fff";g.font="700 30px system-ui,sans-serif";g.fillText(xName,P,64);
  g.font="16px system-ui,sans-serif";g.globalAlpha=.85;g.fillText("Extrato de dívidas · "+new Date().toLocaleDateString("pt-BR"),P,96);g.globalAlpha=1;
  var fit=function(t,mw){while(g.measureText(t).width>mw&&t.length>3)t=t.slice(0,-2);return t};
  s.sec.forEach(function(x){
    if(!x.r.length)return;
    y+=L-6;g.fillStyle=x.c;g.font="700 15px system-ui,sans-serif";g.textAlign="left";g.fillText(x.t.toUpperCase(),P,y);y+=8;
    x.r.forEach(function(r){
      y+=L;g.font="16px system-ui,sans-serif";g.fillStyle="#1b1a24";g.textAlign="left";
      var vw=g.measureText(r[1]).width;g.fillText(fit(r[0],W-P*2-vw-16),P,y-8);
      g.font="700 16px system-ui,sans-serif";g.textAlign="right";g.fillText(r[1],W-P,y-8);
      g.fillStyle="#e7e2f3";g.fillRect(P,y,W-P*2,1);
    });
  });
  y+=44;g.textAlign="left";g.font="700 20px system-ui,sans-serif";
  g.fillStyle="#14803c";g.fillText("Pago "+brl(s.tk),P,y);
  g.fillStyle="#b45309";g.textAlign="right";g.fillText("Falta "+brl(s.tp),W-P,y);
  cv.toBlob(function(b){
    var f=new File([b],"extrato-"+xName.replace(/\s+/g,"-")+".png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f]}).catch(function(){});return}
    var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();toast("Imagem baixada.");snd("ok");
  });
});

/* ---------- lixeira ---------- */
function undel(x){var c=Object.assign({},x);delete c.deleted;return c}
function purge(){var lim=Date.now()-30*864e5;bin.filter(function(x){return x.deleted<lim}).forEach(function(x){remove(x.id)})}
function renderBin(){
  $("bn").hidden=!bin.length;$("bn").textContent=bin.length;
  if(!$("td").open)return;
  $("t_l").innerHTML=bin.slice().sort(function(a,b){return b.deleted-a.deleted}).map(function(x){
    return '<div class="xr tr"><span><strong>'+esc(x.desc)+'</strong><br><small class="s">'+esc(x.who)+' · '+monthName(x.month)+' · apagado em '+ddmm(new Date(x.deleted).toISOString().slice(0,10))+'</small></span><b>'+brl(x.amount)+'</b><button class="pcs" data-u="'+x.id+'">Restaurar</button><button class="x" data-z="'+x.id+'" title="Apagar de vez">✕</button></div>';
  }).join("")||'<div class="empty">A lixeira está vazia.</div>';
}
$("tb").addEventListener("click",function(){snd("tap");$("td").showModal();renderBin()});
$("t_l").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  var x=bin.find(function(y){return y.id===(b.dataset.u||b.dataset.z)});if(!x)return;
  if(b.dataset.u){put(undel(x));snd("ok");toast("Item restaurado.")}
  else if(confirm("Apagar de vez? Isso não pode ser desfeito.")){remove(x.id);snd("del")}
});
$("t_e").addEventListener("click",function(){
  if(!bin.length)return;
  if(confirm("Esvaziar a lixeira? Isso não pode ser desfeito.")){bin.map(function(x){return x.id}).forEach(remove);snd("del")}
});
var rphoto="";
function updR(){var n=$("who").value.trim();$("r_av").innerHTML=rphoto?'<img class="av" alt="" src="'+rphoto+'">':av(n||"?")}
function openReg(){rphoto="";$("r_phone").value="";updR();$("rd").showModal();setTimeout(function(){$("who").focus()},60)}
$("rg").addEventListener("click",function(){snd("tap");openReg()});
$("fab").addEventListener("click",function(){snd("tap");openReg()});
$("who").addEventListener("input",function(){var p=people[$("who").value.trim()];if(p&&p.phone&&!$("r_phone").value)$("r_phone").value=p.phone;updR()});
$("r_pick").addEventListener("click",function(){$("r_file").click()});
$("r_file").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;var img=new Image(),u=URL.createObjectURL(f);
  img.onload=function(){var c=document.createElement("canvas");c.width=c.height=96;var q=Math.min(img.width,img.height);c.getContext("2d").drawImage(img,(img.width-q)/2,(img.height-q)/2,q,q,0,0,96,96);rphoto=c.toDataURL("image/jpeg",.8);URL.revokeObjectURL(u);updR()};
  img.src=u;$("r_file").value="";
});
$("hello").textContent=(function(){var d=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});return d.charAt(0).toUpperCase()+d.slice(1)+" · quem deve, quanto falta e o que já foi pago"})();

/* ---------- comprovante ---------- */
var attachId=null,viewId=null;
function shrink(file,cb){
  var img=new Image(),u=URL.createObjectURL(file);
  img.onload=function(){
    var out="";[[800,.6],[560,.5],[420,.45]].some(function(p){
      var k=Math.min(1,p[0]/Math.max(img.width,img.height)),c=document.createElement("canvas");
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      out=c.toDataURL("image/jpeg",p[1]);return out.length<180000;
    });
    URL.revokeObjectURL(u);cb(out);
  };
  img.onerror=function(){toast("Não consegui ler essa imagem.")};
  img.src=u;
}
function attach(id){attachId=id;$("pfile").click()}
$("pfile").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;
  shrink(f,function(d){
    var it=items.find(function(x){return x.id===attachId});if(!it)return;
    put(Object.assign({},it,{proof:d}));snd("ok");toast("Comprovante guardado.");
  });
  $("pfile").value="";
});
$("v_dl").addEventListener("click",function(){
  var a=document.createElement("a");a.href=$("v_img").src;a.download="comprovante.jpg";document.body.appendChild(a);a.click();a.remove();
});
$("v_re").addEventListener("click",function(){closeDlg($("vd"));attach(viewId)});
$("v_rm").addEventListener("click",function(){
  var it=items.find(function(x){return x.id===viewId});if(!it)return;
  put(Object.assign({},it,{proof:""}));closeDlg($("vd"));snd("del");toast("Comprovante removido.",function(){put(it)});
});

/* ---------- ações da lista ---------- */
var editId=null,editName=null,photo="";
function closeDlg(d){if(d.open)d.close()}
document.querySelectorAll("[data-close]").forEach(function(b){b.addEventListener("click",function(){closeDlg($(b.dataset.close))})});
["ed","pd","kd","xd","vd","td","rd","cd","rk","im","sd","recd"].forEach(function(i){$(i).addEventListener("click",function(e){if(e.target===$(i))closeDlg($(i))})});

function cobrar(w){
  var p=items.filter(function(x){return x.who===w&&rem(x)>0});
  if(!p.length){toast("Nada pendente para "+w+".");return}
  var first=w.trim().split(" ")[0],tot=0;p.forEach(function(x){tot+=rem(x)});
  var line=function(x){return x.desc+" ("+monthName(x.month)+")"};
  var msg=p.length===1?"Oi "+first+", falta "+brl(tot)+": "+line(p[0])+"."
    :"Oi "+first+", tudo bem? Estão pendentes:\n"+p.map(function(x){return "• "+line(x)+": "+brl(rem(x))}).join("\n")+"\nTotal: "+brl(tot)+".";
  var num=waNum((people[w]||{}).phone);
  snd("wa");window.open("https://wa.me/"+num+"?text="+encodeURIComponent(msg),"_blank","noopener");
  if(!num)toast("Sem telefone salvo: escolha o contato no WhatsApp.");
}
function openPerson(w){
  editName=w;var p=people[w]||{};photo=p.photo||"";
  var ps=items.filter(function(x){return x.who===w}),T=0,G=0,R=0;ps.forEach(function(x){T+=x.amount;G+=got(x);R+=rem(x)});
  $("p_sum").innerHTML='<div class="t"><small>Total da dívida · '+ps.length+' registro(s)</small><input id="p_total" type="number" step="0.01" min="0" value="'+T.toFixed(2)+'" aria-label="Total da dívida"></div><div><small>Já pagou</small><b>'+brl(G)+'</b></div><div><small>Falta pagar</small><b>'+brl(R)+'</b></div>';
  $("p_name").value=w;$("p_phone").value=p.phone||"";$("p_av").innerHTML=av(w);
  $("pd").showModal();
}
$("p_pick").addEventListener("click",function(){$("p_file").click()});
$("p_rm").addEventListener("click",function(){photo="";var s=people[editName];delete people[editName];$("p_av").innerHTML=av(editName);if(s)people[editName]=s});
$("p_file").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;var img=new Image(),u=URL.createObjectURL(f);
  img.onload=function(){
    var c=document.createElement("canvas");c.width=c.height=96;var s=Math.min(img.width,img.height);
    c.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,96,96);
    photo=c.toDataURL("image/jpeg",.8);URL.revokeObjectURL(u);
    $("p_av").innerHTML='<img class="av" alt="" src="'+photo+'">';
  };img.src=u;$("p_file").value="";
});
$("pf").addEventListener("submit",function(e){
  e.preventDefault();
  var nn=$("p_name").value.trim(),old=editName;if(!nn)return;
  var ps=items.filter(function(x){return x.who===old}),T0=0,G0=0,R0=0;
  ps.forEach(function(x){T0+=x.amount;G0+=got(x);R0+=rem(x)});
  var T1=parseFloat($("p_total").value),adj=ps.length&&!isNaN(T1)&&Math.abs(T1-T0)>=0.005,map={};
  if(adj){
    var Rn=Math.round((T1-G0)*100)/100;
    if(Rn<0){toast("O total não pode ser menor que o já pago ("+brl(G0)+").");return}
    if(R0<=0){toast("Não há dívida pendente para ajustar. Use Registrar para somar uma nova.");return}
    var pend=ps.filter(function(x){return rem(x)>0}),left=Rn;
    pend.forEach(function(x,i){
      var r=i<pend.length-1?Math.round(Rn*rem(x)/R0*100)/100:Math.round(left*100)/100;
      left-=r;map[x.id]=Math.round((got(x)+r)*100)/100;
    });
  }
  if(nn!==old||adj){
    ps.forEach(function(x){var o=Object.assign({},x);if(nn!==old)o.who=nn;if(map[x.id]!=null)o.amount=map[x.id];put(o)});
    if(adj&&nn===old)toast("Total ajustado para "+brl(T1)+".",function(){ps.forEach(function(x){put(x)})});
  }
  if(nn!==old)delPerson(old);
  putPerson(nn,{phone:$("p_phone").value.trim(),photo:photo});
  closeDlg($("pd"));snd("ok");
});

$("list").addEventListener("click",function(e){
  var tr=e.target.closest("tr.gr");if(tr){snd("tap");openParcels(tr.dataset.g);return}
  if(e.target.classList&&e.target.classList.contains("sk")){
    var sid=e.target.dataset.s;if(e.target.checked)sel.add(sid);else sel.delete(sid);
    e.target.closest(".it").classList.toggle("sel",e.target.checked);selN();return;
  }
  var b=e.target.closest("button");if(!b)return;
  var D=b.dataset;
  if(D.w){cobrar(decodeURIComponent(D.w));return}
  if(D.rb){snd("tap");openRecibo(decodeURIComponent(D.rb));return}
  if(D.rc){var ri=items.find(function(x){return x.id===D.rc});if(ri){snd("tap");openRecibo(ri.who,D.rc)}return}
  if(D.x){snd("tap");openStmt(decodeURIComponent(D.x));return}
  if(D.r){snd("tap");openPerson(decodeURIComponent(D.r));return}
  if(D.q){
    var w=decodeURIComponent(D.q),vis=$("list").querySelectorAll("[data-t]");
    var ids=Array.prototype.map.call(vis,function(x){return x.dataset.t});
    var prev=items.filter(function(x){return x.who===w&&!x.paid&&ids.indexOf(x.id)>=0});
    if(!prev.length){toast("Nada pendente para "+w+".");return}
    if(!confirm("Marcar "+prev.length+" item(ns) de "+w+" como pagos?"))return;
    prev.forEach(function(x){put(Object.assign({},x,{paid:true,got:x.amount,paidAt:today()}))});
    snd("ok");toast(prev.length+" item(ns) quitados.",function(){prev.forEach(put)});return;
  }
  if(D.a){attach(D.a);return}
  if(D.v){var pi=items.find(function(x){return x.id===D.v});if(pi){viewId=D.v;$("v_img").src=pi.proof;snd("tap");$("vd").showModal()}return}
  if(D.k){snd("tap");openParcels(D.k);return}
  var id=D.t||D.e||D.d,it=items.find(function(x){return x.id===id});if(!it)return;
  if(D.t){
    var old=it;
    put(it.paid?Object.assign({},it,{paid:false,got:0,paidAt:""}):Object.assign({},it,{paid:true,got:it.amount,paidAt:today()}));
    snd(old.paid?"tap":"ok");if(!old.paid)toast("Marcado como pago.",function(){put(old)},"Anexar comprovante",function(){attach(old.id)});
  }else if(D.d){
    put(Object.assign({},it,{deleted:Date.now()}));snd("del");toast("Item movido para a lixeira.",function(){put(it)});
  }else{
    editId=id;sibs=sib(id);$("e_allw").hidden=!sibs.length;$("e_n").textContent=sibs.length;$("e_all").checked=true;
    $("e_desc").value=it.desc;$("e_who").value=it.who;$("e_cat").value=it.cat||"";$("e_val").value=it.amount;$("e_got").value=got(it)||"";$("e_mon").value=it.date||it.month+"-01";$("e_note").value=it.note||"";
    $("e_h").innerHTML=histHTML(it);
    $("ed").showModal();
  }
});
$("ef").addEventListener("submit",function(e){
  e.preventDefault();
  var it=items.find(function(x){return x.id===editId}),a=parseFloat($("e_val").value);
  if(!it||isNaN(a)){closeDlg($("ed"));return}
  var g0=Math.max(0,parseFloat($("e_got").value)||0),keep=it.paid&&g0===it.amount,g=keep?a:g0,paid=g>=a;
  put(Object.assign({},it,{desc:$("e_desc").value.trim(),who:$("e_who").value.trim(),cat:$("e_cat").value.trim(),amount:a,got:paid?a:g,paid:paid,paidAt:paid?(it.paid&&it.paidAt?it.paidAt:today()):"",date:$("e_mon").value,month:$("e_mon").value.slice(0,7),note:$("e_note").value.trim()}));
  if(sibs.length&&$("e_all").checked){
    var base=$("e_desc").value.trim().replace(/\s*\d+\/\d+$/,"");
    sibs.forEach(function(x){
      if(x.id===editId)return;
      var m=x.desc.match(/\s*(\d+\/\d+)$/);
      put(Object.assign({},x,{desc:base+(m?" "+m[1]:""),who:$("e_who").value.trim(),cat:$("e_cat").value.trim()}));
    });
  }
  closeDlg($("ed"));snd("ok");
});

/* ---------- formulário de nova dívida ---------- */
function addDate(s,i){var p=s.split("-"),y=+p[0],m=+p[1]-1+i,dd=+p[2]||1,last=new Date(y,m+1,0).getDate(),d=new Date(y,m,Math.min(dd,last));return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
$("f").addEventListener("submit",function(e){
  e.preventDefault();
  var a=parseFloat($("val").value);if(isNaN(a))return;
  var n=Math.max(1,Math.min(60,parseInt($("np").value)||1));
  var base=Math.floor(a/n*100)/100,uid="d"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),d0=$("desc").value.trim();
  for(var i=0;i<n;i++){
    var amt=i<n-1?base:Math.round((a-base*(n-1))*100)/100,pd=i===0&&$("st").value==="1";
    put({id:uid+"_"+i,desc:n>1?d0+" "+(i+1)+"/"+n:d0,who:$("who").value.trim(),cat:$("cat").value.trim(),amount:amt,date:addDate($("mon").value,i),month:addDate($("mon").value,i).slice(0,7),paid:pd,got:pd?amt:0,paidAt:pd?$("mon").value:"",note:$("note").value.trim(),ts:Date.now()+i});
  }
  var nm=$("who").value.trim(),ph=$("r_phone").value.trim();
  if(ph||rphoto){var cur=people[nm]||{};putPerson(nm,{phone:ph||cur.phone||"",photo:rphoto||cur.photo||""})}
  snd("add");closeDlg($("rd"));toast("Dívida registrada.");
  ["who","desc","val","note","cat","r_phone"].forEach(function(i){$(i).value=""});$("np").value=1;$("st").value="0";rphoto="";prev();
});
function prev(){
  var a=parseFloat($("val").value),n=Math.max(1,Math.min(60,parseInt($("np").value)||1));
  if(isNaN(a)||a<=0||n<2){$("pv").textContent="";return}
  var base=Math.floor(a/n*100)/100,last=Math.round((a-base*(n-1))*100)/100;
  $("pv").textContent=n+"x de "+brl(base)+(last!==base?" (última "+brl(last)+")":"");
}
["val","np"].forEach(function(i){$(i).addEventListener("input",prev)});
["fm","fp","fs"].forEach(function(i){$(i).addEventListener("change",render)});
$("q").addEventListener("input",render);

/* ---------- instalar como app ---------- */
var ip=null,ios=/iphone|ipad/i.test(navigator.userAgent),standalone=matchMedia("(display-mode:standalone)").matches||navigator.standalone;
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();ip=e});
$("inst").addEventListener("click",function(){
  if(standalone){toast("O app já está instalado.");return}
  if(ip){ip.prompt();ip=null}
  else alert(ios?"No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.":"No Android: abra o menu ⋮ do navegador e toque em Instalar app (ou Adicionar à tela inicial).\n\nO site precisa estar hospedado em https.");
});
window.addEventListener("appinstalled",function(){toast("App instalado!")});
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)){navigator.serviceWorker.register("sw.js").catch(function(){})}

/* ---------- recibo ---------- */
var recCur=null;
function recData(w,id){
  var keyOf=function(x){var s=sib(x.id);return s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id};
  var ref=id?items.find(function(x){return x.id===id}):null,want=ref?keyOf(ref):null,seen={},debts=[];
  items.filter(function(x){return x.who===w}).forEach(function(x){
    var k=keyOf(x);if((want&&k!==want)||seen[k])return;seen[k]=1;
    var s=sib(x.id),r=(s.length?s:[x]).slice().sort(function(a,b){var p=a.date||a.month,q=b.date||b.month;return p<q?-1:p>q?1:0});
    var d={title:r[0].desc.replace(/\s*\d+\/\d+$/,""),n:r.length,np:0,tot:0,pd:0,rs:0,next:null,parcels:[]};
    r.forEach(function(y){
      d.tot+=y.amount;d.pd+=got(y);d.rs+=rem(y);if(y.paid)d.np++;if(rem(y)>0&&!d.next)d.next=y;
      var m=y.desc.match(/(\d+\/\d+)$/);
      d.parcels.push({lbl:m?m[1]:"Única",amount:y.amount,paid:!!y.paid,part:(!y.paid&&got(y)>0)?got(y):0,when:y.paid&&y.paidAt?fdate(y.paidAt):"",due:y.date?fdate(y.date):monthName(y.month)});
    });
    d.nextDue=d.next?(d.next.date?fdate(d.next.date):monthName(d.next.month)):"";
    debts.push(d);
  });
  var tk=0,tr=0;debts.forEach(function(d){tk+=d.pd;tr+=d.rs});
  var n=new Date();
  return {name:w,debts:debts,tk:tk,tr:tr,date:n.toLocaleDateString("pt-BR"),no:n.getFullYear()+pad(n.getMonth()+1)+pad(n.getDate())+"-"+pad(n.getHours())+pad(n.getMinutes())};
}
function recText(R){
  var t="RECIBO · Quem Me Deve\nNº "+R.no+"\nCliente: "+R.name+"\nEmitido em "+R.date+"\n";
  R.debts.forEach(function(d){
    t+="\n"+d.title.toUpperCase()+"\nParcelas pagas: "+d.np+" de "+d.n+"\nValor total: "+brl(d.tot)+"\nJá pago: "+brl(d.pd)+"\nFalta: "+brl(d.rs)+"\n";
    d.parcels.forEach(function(p){t+=(p.paid?"✓ ":"• ")+p.lbl+" · "+brl(p.amount)+" · "+(p.paid?(p.when?"pago em "+p.when:"pago"):(p.part?"parcial "+brl(p.part)+" · ":"")+"vence "+p.due)+"\n"});
    t+=d.nextDue?"Próximo vencimento: "+d.nextDue+"\n":"Dívida quitada ✓\n";
  });
  return t+"\nTOTAL PAGO: "+brl(R.tk)+"\nFALTA PAGAR: "+brl(R.tr)+"\n\nObrigado!";
}
function recHTML(R){
  return '<div class="rc-h"><img src="logo.png" alt=""><div><h2>Recibo</h2><div class="s">Quem Me Deve · Nº '+R.no+'</div><div class="s">Emitido em '+R.date+'</div></div></div>'+
  '<div class="rc-cl"><span class="s">Cliente</span><b>'+esc(R.name)+'</b></div>'+
  R.debts.map(function(d){
    var pc=d.tot?Math.round(d.pd/d.tot*100):0;
    return '<div class="rc-debt"><div class="rc-dt"><b>'+esc(d.title)+'</b><span class="s">'+d.np+' de '+d.n+' parcela(s) paga(s)</span></div><div class="pb"><i style="width:'+pc+'%"></i></div>'+
    '<div class="rc-stats"><div><small>Total</small><b>'+brl(d.tot)+'</b></div><div class="ok"><small>Já pago</small><b>'+brl(d.pd)+'</b></div><div class="pe"><small>Falta</small><b>'+brl(d.rs)+'</b></div></div>'+
    d.parcels.map(function(p){return '<div class="rc-p'+(p.paid?" ok":"")+'"><span>'+(p.paid?"✓":"•")+" "+p.lbl+'</span><span class="s">'+(p.paid?(p.when?"pago em "+p.when:"pago"):(p.part?"parcial "+brl(p.part)+" · ":"")+"vence "+p.due)+'</span><b>'+brl(p.amount)+'</b></div>'}).join("")+
    (d.nextDue?'<div class="s" style="margin-top:10px">Próximo vencimento: <b>'+d.nextDue+'</b></div>':'<div class="rc-q">Dívida quitada ✓</div>')+'</div>';
  }).join("")+
  '<div class="rc-t"><div><small>Total pago</small><b>'+brl(R.tk)+'</b></div><div><small>Falta pagar</small><b>'+brl(R.tr)+'</b></div></div>'+
  '<p class="s" style="text-align:center;margin:12px 0 0">Este recibo confirma os pagamentos registrados até '+R.date+'. Obrigado!</p>';
}
function openRecibo(w,id){
  recCur=recData(w,id);
  if(!recCur.debts.length){toast("Nada para o recibo.");return}
  $("rc_b").innerHTML=recHTML(recCur);$("recd").showModal();
}
$("k_rc").addEventListener("click",function(){var it=items.find(function(x){return x.id===kRef});if(!it)return;closeDlg($("kd"));openRecibo(it.who,kRef)});
$("rc_c").addEventListener("click",function(){
  (navigator.clipboard?navigator.clipboard.writeText(recText(recCur)):Promise.reject()).then(function(){toast("Recibo copiado.");snd("ok")},function(){toast("Não consegui copiar. Use o WhatsApp.")});
});
$("rc_w").addEventListener("click",function(){snd("wa");window.open("https://wa.me/"+waNum((people[recCur.name]||{}).phone)+"?text="+encodeURIComponent(recText(recCur)),"_blank","noopener")});
$("rc_p").addEventListener("click",function(){window.print()});
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
$("rc_i").addEventListener("click",function(){
  var R=recCur,lg=new Image();
  lg.onload=function(){draw(true)};lg.onerror=function(){draw(false)};lg.src="logo.png";
  function draw(ok){
    var W=760,P=34,LH=30,H=240;
    R.debts.forEach(function(d){H+=148+d.parcels.length*LH+34+18});
    H+=110+70;
    var cv=document.createElement("canvas"),sc=2;cv.width=W*sc;cv.height=H*sc;
    var g=cv.getContext("2d");g.scale(sc,sc);
    g.fillStyle="#fff";g.fillRect(0,0,W,H);
    var gr=g.createLinearGradient(0,0,W,150);gr.addColorStop(0,"#071f6e");gr.addColorStop(1,"#1d6bff");g.fillStyle=gr;g.fillRect(0,0,W,150);
    if(ok)g.drawImage(lg,P,24,102,102);
    g.textAlign="left";g.fillStyle="#ffd21f";g.font="800 38px system-ui,sans-serif";g.fillText("RECIBO",P+120,70);
    g.fillStyle="#fff";g.font="600 16px system-ui,sans-serif";g.fillText("Quem Me Deve",P+120,98);
    g.textAlign="right";g.font="14px system-ui,sans-serif";g.fillText("Nº "+R.no,W-P,62);g.fillText("Emitido em "+R.date,W-P,86);
    g.textAlign="left";g.fillStyle="#6a79a8";g.font="700 12px system-ui,sans-serif";g.fillText("CLIENTE",P,184);
    g.fillStyle="#0a1a45";g.font="800 28px system-ui,sans-serif";g.fillText(R.name,P,214);
    var y=240,x0=P+20,xr=W-P-20;
    R.debts.forEach(function(d){
      var bh=148+d.parcels.length*LH+34;
      g.strokeStyle="#cfdaf7";g.lineWidth=1.5;g.setLineDash([6,5]);rr(g,P,y,W-2*P,bh,18);g.stroke();g.setLineDash([]);
      g.textAlign="left";g.fillStyle="#0a1a45";g.font="800 20px system-ui,sans-serif";g.fillText(d.title,x0,y+36);
      g.textAlign="right";g.fillStyle="#6a79a8";g.font="600 14px system-ui,sans-serif";g.fillText(d.np+" de "+d.n+" parcela(s) paga(s)",xr,y+36);
      g.fillStyle="#e3eaff";rr(g,x0,y+50,xr-x0,8,4);g.fill();
      var pc=d.tot?d.pd/d.tot:0;if(pc>0){g.fillStyle="#16a34a";rr(g,x0,y+50,Math.max(8,(xr-x0)*pc),8,4);g.fill()}
      var bw=(xr-x0-20)/3,st=[["TOTAL",brl(d.tot),"#0a1a45"],["JÁ PAGO",brl(d.pd),"#15803d"],["FALTA",brl(d.rs),"#b45309"]];
      st.forEach(function(q,i){var bx=x0+i*(bw+10);g.fillStyle="#f1f5ff";rr(g,bx,y+72,bw,58,12);g.fill();g.textAlign="center";g.fillStyle="#6a79a8";g.font="700 10px system-ui,sans-serif";g.fillText(q[0],bx+bw/2,y+92);g.fillStyle=q[2];g.font="800 17px system-ui,sans-serif";g.fillText(q[1],bx+bw/2,y+115)});
      d.parcels.forEach(function(p,i){
        var py=y+158+i*LH;
        g.textAlign="left";g.font="700 15px system-ui,sans-serif";g.fillStyle=p.paid?"#15803d":"#0a1a45";g.fillText((p.paid?"✓ ":"• ")+p.lbl,x0,py);
        g.font="14px system-ui,sans-serif";g.fillStyle="#6a79a8";g.fillText(p.paid?(p.when?"pago em "+p.when:"pago"):(p.part?"parcial "+brl(p.part)+" · ":"")+"vence "+p.due,x0+100,py);
        g.textAlign="right";g.font="700 15px system-ui,sans-serif";g.fillStyle="#0a1a45";g.fillText(brl(p.amount),xr,py);
      });
      var ly=y+158+d.parcels.length*LH+8;
      g.textAlign="left";g.font="700 14px system-ui,sans-serif";
      if(d.nextDue){g.fillStyle="#6a79a8";g.fillText("Próximo vencimento: "+d.nextDue,x0,ly)}else{g.fillStyle="#15803d";g.fillText("Dívida quitada ✓",x0,ly)}
      y+=bh+18;
    });
    var yg=g.createLinearGradient(P,y,W-P,y+90);yg.addColorStop(0,"#ffd21f");yg.addColorStop(1,"#ffb300");g.fillStyle=yg;rr(g,P,y,W-2*P,90,20);g.fill();
    g.fillStyle="#0a1a45";g.textAlign="left";g.font="800 11px system-ui,sans-serif";g.fillText("TOTAL PAGO",x0,y+30);g.font="800 28px system-ui,sans-serif";g.fillText(brl(R.tk),x0,y+66);
    g.textAlign="right";g.font="800 11px system-ui,sans-serif";g.fillText("FALTA PAGAR",xr,y+30);g.font="800 28px system-ui,sans-serif";g.fillText(brl(R.tr),xr,y+66);
    g.textAlign="center";g.fillStyle="#6a79a8";g.font="12px system-ui,sans-serif";g.fillText("Este recibo confirma os pagamentos registrados até "+R.date+". Obrigado!",W/2,y+90+36);
    cv.toBlob(function(b){
      var f=new File([b],"recibo-"+R.name.replace(/\s+/g,"-")+".png",{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f]}).catch(function(){});return}
      var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();toast("Imagem do recibo baixada.");snd("ok");
    });
  }
});

/* ---------- visão em tabela ---------- */
var view=LS.get("dv-view")==="table"?"table":"cards";
function vwBtn(){$("vw").textContent=view==="table"?"☰ Cards":"▦ Tabela"}
vwBtn();
$("vw").addEventListener("click",function(){view=view==="table"?"cards":"table";LS.set("dv-view",view);vwBtn();snd("tap");render()});
function tableHTML(v){
  var seen={},gs=[];
  v.forEach(function(x){
    var s=sib(x.id),k=s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id;
    if(seen[k])return;seen[k]=1;
    var r=s.length?s:[x],o={id:x.id,who:x.who,desc:r[0].desc.replace(/\s*\d+\/\d+$/,""),n:r.length,tot:0,pd:0,rs:0,np:0,nx:null};
    r.forEach(function(y){o.tot+=y.amount;o.pd+=got(y);o.rs+=rem(y);if(y.paid)o.np++;if(rem(y)>0&&!o.nx)o.nx=y});
    o.key=o.nx?(o.nx.date||o.nx.month+"-01"):"9999";
    gs.push(o);
  });
  if(!gs.length)return '<div class="empty">Nenhuma dívida encontrada. Adicione no botão Registrar ou ajuste os filtros.</div>';
  gs.sort(function(a,b){return a.who.localeCompare(b.who)||(a.key<b.key?-1:a.key>b.key?1:0)});
  var T=0,P=0,R=0;
  var rows=gs.map(function(o){
    T+=o.tot;P+=o.pd;R+=o.rs;
    var due=o.nx?(o.nx.date?fdate(o.nx.date):monthName(o.nx.month)):'<span class="q">Quitado</span>';
    var sub=o.n>1?'<small>'+o.np+(o.np===1?" paga":" pagas")+'</small>':(o.np?'<small>paga</small>':"");
    return '<tr class="gr" data-g="'+o.id+'" title="Ver parcelas"><td class="n">'+av(o.who)+esc(o.who)+'</td><td>'+esc(o.desc)+'</td><td class="v">'+brl(o.tot)+'</td><td class="num">'+o.n+'x'+sub+'</td><td class="num">'+brl(o.pd)+'</td><td class="r'+(o.rs<=0?" z":"")+'">'+brl(o.rs)+'</td><td class="num">'+due+'</td></tr>';
  }).join("");
  return '<div class="tw"><table><thead><tr><th>Nome</th><th>Descrição</th><th>Valor total</th><th>Parcelas</th><th>Já pago</th><th>Restante</th><th>Vencimento</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td colspan="2">Total · '+gs.length+' dívida(s)</td><td>'+brl(T)+'</td><td></td><td>'+brl(P)+'</td><td>'+brl(R)+'</td><td></td></tr></tfoot></table></div>';
}

/* ---------- histórico de mudanças ---------- */
var TRK={desc:"Descrição",who:"Nome",cat:"Origem",amount:"Valor",date:"Data",note:"Observação",paid:"Situação",got:"Pago parcial"};
function fv(f,v){if(v===""||v==null)return "—";if(f==="amount"||f==="got")return brl(+v);if(f==="date")return fdate(v);if(f==="paid")return v?"Pago":"Pendente";return String(v)}
function nv(f,v){return f==="paid"?!!v:(f==="amount"||f==="got")?(+v||0):(v||"")}
function logOf(old,o){
  var e=[],t=Date.now();
  for(var f in TRK){
    if(f==="got"&&(o.paid||old.paid))continue;
    var a=nv(f,old[f]),b=nv(f,o[f]);
    if(f==="date"&&!a)continue;
    if(a!==b)e.push({t:t,f:f,a:a,b:b});
  }
  return e;
}
function histHTML(it){
  var l=(it.log||[]).slice().reverse();
  return '<details class="hist"><summary>Histórico de mudanças ('+l.length+')</summary>'+(l.length?l.map(function(e){
    return '<div class="hr"><span class="s">'+new Date(e.t).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"})+'</span><span><b>'+TRK[e.f]+'</b>: '+esc(fv(e.f,e.a))+' → '+esc(fv(e.f,e.b))+'</span></div>';
  }).join(""):'<p class="s">Nenhuma mudança registrada ainda.</p>')+'<p class="s">Criada em '+(it.ts?new Date(it.ts).toLocaleDateString("pt-BR"):"—")+'</p></details>';
}

/* ---------- selecionar várias ---------- */
var selMode=false,sel=new Set();
function selN(){$("sel_n").textContent=sel.size+(sel.size===1?" selecionada":" selecionadas")}
$("selb").addEventListener("click",function(){
  selMode=!selMode;if(!selMode)sel.clear();
  $("selb").textContent=selMode?"✕ Cancelar":"☑ Selecionar";$("selbar").hidden=!selMode;snd("tap");render();
});
function selEnd(){sel.clear();selN()}
$("s_x").addEventListener("click",function(){$("selb").click()});
$("s_all").addEventListener("click",function(){
  document.querySelectorAll("#list .sk").forEach(function(c){c.checked=true;sel.add(c.dataset.s);c.closest(".it").classList.add("sel")});selN();snd("tap");
});
function selItems(){return items.filter(function(x){return sel.has(x.id)})}
$("s_pay").addEventListener("click",function(){
  var p=selItems().filter(function(x){return !x.paid});
  if(!p.length){toast("Nenhuma pendente selecionada.");return}
  p.forEach(function(x){put(Object.assign({},x,{paid:true,got:x.amount,paidAt:today()}))});
  snd("ok");toast(p.length+" dívida(s) pagas.",function(){p.forEach(function(x){put(x)})});selEnd();render();
});
$("s_del").addEventListener("click",function(){
  var p=selItems();if(!p.length){toast("Selecione alguma dívida.");return}
  p.forEach(function(x){put(Object.assign({},x,{deleted:Date.now()}))});
  snd("del");toast(p.length+" item(ns) na lixeira.",function(){p.forEach(function(x){put(x)})});selEnd();render();
});
$("s_date").addEventListener("click",function(){
  var p=selItems();if(!p.length){toast("Selecione alguma dívida.");return}
  $("s_t").textContent=p.length+" dívida(s) vão para a data escolhida.";$("s_d").value=today();$("sd").showModal();
});
$("sf").addEventListener("submit",function(e){
  e.preventDefault();var d=$("s_d").value;if(!d)return;
  var p=selItems();p.forEach(function(x){put(Object.assign({},x,{date:d,month:d.slice(0,7)}))});
  closeDlg($("sd"));snd("ok");toast(p.length+" dívida(s) movidas para "+fdate(d)+".",function(){p.forEach(function(x){put(x)})});selEnd();render();
});

/* ---------- ranking ---------- */
$("rkb").addEventListener("click",function(){
  var by={};
  items.forEach(function(x){
    var p=by[x.who]=by[x.who]||{n:x.who,d:0,c:0,pend:0};
    if(x.paid){if(x.paidAt){var a=new Date((x.date||x.month+"-01")+"T00:00:00"),b=new Date(x.paidAt+"T00:00:00");p.d+=Math.max(0,Math.round((b-a)/864e5));p.c++}}
    else p.pend+=rem(x);
  });
  var l=Object.keys(by).map(function(k){var p=by[k];p.avg=p.c?p.d/p.c:null;return p});
  l.sort(function(a,b){return a.avg==null?(b.avg==null?0:1):b.avg==null?-1:a.avg-b.avg});
  $("rk_l").innerHTML=l.length?l.map(function(p,i){
    var b=p.avg==null?["n","Sem histórico"]:p.avg<=3?["g","⭐ Muito pontual"]:p.avg<=15?["g","👍 Bom pagador"]:p.avg<=45?["m","⏳ Demora"]:["r","⚠ Atrasa muito"];
    return '<div class="rk-row"><span class="rk-pos">'+(p.avg==null?"·":["🥇","🥈","🥉"][i]||i+1)+'</span>'+av(p.n)+'<div class="mm"><b>'+esc(p.n)+'</b><span class="s">'+(p.avg==null?"nenhum pagamento com data":"média de "+Math.round(p.avg)+" dia(s) · "+p.c+" paga(s)")+(p.pend>0?" · deve "+brl(p.pend):"")+'</span></div><span class="rk-b '+b[0]+'">'+b[1]+'</span></div>';
  }).join(""):'<div class="empty">Sem dados ainda.</div>';
  snd("tap");$("rk").showModal();
});

/* ---------- importar CSV ---------- */
function parseCSV(t){
  var f=t.split("\n")[0]||"",d=";",best=0;
  [";",",","\t"].forEach(function(c){var n=f.split(c).length;if(n>best){best=n;d=c}});
  var rows=[],row=[],cur="",q=false;
  for(var i=0;i<t.length;i++){
    var ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}
    else if(ch==='"')q=true;
    else if(ch===d){row.push(cur);cur=""}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&t[i+1]==="\n")i++;row.push(cur);cur="";rows.push(row);row=[]}
    else cur+=ch;
  }
  if(cur||row.length){row.push(cur);rows.push(row)}
  return rows.filter(function(r){return r.some(function(c){return c.trim()})});
}
function nrm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function parseMoney(s){
  s=String(s||"").replace(/R\$|\s/g,"");if(!s)return NaN;
  if(s.indexOf(",")>=0&&s.indexOf(".")>=0)s=s.replace(/\./g,"").replace(",",".");else s=s.replace(",",".");
  return Math.round(parseFloat(s)*100)/100;
}
function parseDate(s){
  s=String(s||"").trim();var m;
  if(m=s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/))return m[3]?{date:s,month:m[1]+"-"+m[2]}:{date:"",month:m[1]+"-"+m[2]};
  if(m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)){var y=m[3].length===2?"20"+m[3]:m[3];return {date:y+"-"+pad(+m[2])+"-"+pad(+m[1]),month:y+"-"+pad(+m[2])}}
  if(m=s.match(/^(\d{1,2})\/(\d{4})$/))return {date:"",month:m[2]+"-"+pad(+m[1])};
  return null;
}
var HN={desc:["descricao","item","divida"],who:["pessoa","nome","quem","devedor"],amount:["valor","valor total","total"],date:["data","mes","data da divida"],cat:["origem","categoria","cartao"],st:["situacao","status"],pg:["pago"],note:["observacao","obs","observacoes"],pa:["pago em"]};
function readRows(t){
  var rows=parseCSV(t),ok=[],bad=0,ix={desc:0,who:1,amount:2,date:3,cat:4,st:5,note:6};
  if(rows.length){
    var h=rows[0].map(nrm);
    if(h.some(function(c){return HN.desc.indexOf(c)>=0||HN.who.indexOf(c)>=0||HN.amount.indexOf(c)>=0})){
      ix={};Object.keys(HN).forEach(function(k){var j=h.findIndex(function(c){return HN[k].indexOf(c)>=0});if(j>=0)ix[k]=j});rows.shift();
    }
  }
  rows.forEach(function(r){
    var g=function(k){return ix[k]==null?"":String(r[ix[k]]||"").trim()};
    var desc=g("desc"),who=g("who"),am=parseMoney(g("amount")),dt=parseDate(g("date"));
    if(!desc||!who||!(am>0)){bad++;return}
    var paid=/^(pago|paga|sim|s|1|true|x|ok)$/.test(nrm(g("st")||g("pg"))),pa=parseDate(g("pa"));
    var date=dt?dt.date:"";
    ok.push({desc:desc,who:who,cat:g("cat"),amount:am,date:date,month:dt?dt.month:today().slice(0,7),paid:paid,paidAt:paid?((pa&&pa.date)||date||today()):"",note:g("note")});
  });
  return {ok:ok,bad:bad};
}
function impPrev(){
  var r=readRows($("i_txt").value);
  $("i_pv").textContent=$("i_txt").value.trim()?r.ok.length+" dívida(s) reconhecida(s)"+(r.bad?" · "+r.bad+" linha(s) ignorada(s)":""):"";
  return r;
}
$("imb").addEventListener("click",function(){closeDlg($("cd"));$("i_txt").value="";impPrev();$("im").showModal()});
$("i_txt").addEventListener("input",impPrev);
$("i_file").addEventListener("click",function(){$("i_f").click()});
$("i_f").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;
  var r=new FileReader();r.onload=function(){
    var t=String(r.result);
    if(t.indexOf("\uFFFD")>=0){var r2=new FileReader();r2.onload=function(){$("i_txt").value=String(r2.result);impPrev()};r2.readAsText(f,"windows-1252")}
    else{$("i_txt").value=t;impPrev()}
  };r.readAsText(f);$("i_f").value="";
});
$("i_tpl").addEventListener("click",function(){saveFile("modelo-dividas.csv","\ufeffDescrição;Nome;Valor;Data;Origem;Situação;Observação\r\nMercado;Maria;120,50;10/11/2026;Nubank;Pendente;parcela 1\r\n","text/csv","Modelo baixado.")});
$("i_go").addEventListener("click",function(){
  var r=impPrev();if(!r.ok.length){toast("Nenhuma dívida reconhecida.");return}
  var uid="i"+Date.now().toString(36),ids=[];
  r.ok.forEach(function(o,i){var id=uid+"_"+i;ids.push(id);put(Object.assign({id:id,got:o.paid?o.amount:0,ts:Date.now()+i},o))});
  closeDlg($("im"));snd("add");toast(ids.length+" dívida(s) importadas.",function(){ids.forEach(remove)});
});

/* ---------- configurações e PIN ---------- */
async function hash(t){
  try{var b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("dv:"+t));return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")}
  catch(e){return "p:"+btoa(t)}
}
var buf="";
function pinOn(){return LS.get("dv-pin-on")!=="0"}
function plen(){return +LS.get("dv-pinlen")||4}
function dots(){var h="";for(var i=0;i<plen();i++)h+='<i class="'+(i<buf.length?"f":"")+'"></i>';$("lk_d").innerHTML=h}
function pinBtn(){$("pin_t").textContent=pinOn()?"Ativado":"Desativado"}
(function(){var h="";[1,2,3,4,5,6,7,8,9].forEach(function(n){h+='<button data-k="'+n+'">'+n+'</button>'});h+='<button class="nb" disabled></button><button data-k="0">0</button><button data-k="x" aria-label="Apagar">⌫</button>';$("lk_p").innerHTML=h})();
async function key(k){
  if(k==="x")buf=buf.slice(0,-1);else if(buf.length<plen())buf+=k;
  dots();snd("tap");
  if(buf.length===plen()){
    var ok=(await hash(buf))===(LS.get("dv-pin")||await hash("1234"));
    if(ok){try{sessionStorage.setItem("dv-ok","1")}catch(e){}$("lock").hidden=true;$("lk_m").textContent="Digite seu PIN";snd("ok")}
    else{$("lk_d").classList.add("bad");$("lk_m").textContent="PIN incorreto";snd("del");setTimeout(function(){$("lk_d").classList.remove("bad")},450)}
    buf="";setTimeout(dots,300);
  }
}
$("lk_p").addEventListener("click",function(e){var b=e.target.closest("button");if(b&&b.dataset.k)key(b.dataset.k)});
document.addEventListener("keydown",function(e){if($("lock").hidden)return;if(/^\d$/.test(e.key))key(e.key);else if(e.key==="Backspace")key("x")});
dots();
$("pin_t").addEventListener("click",function(){LS.set("dv-pin-on",pinOn()?"0":"1");pinBtn();snd("tap");toast(pinOn()?"PIN ativado.":"PIN desativado.")});
$("pin_c").addEventListener("click",async function(){
  var n=prompt("Novo PIN (4 a 6 números):");if(n===null)return;n=n.trim();
  if(!/^\d{4,6}$/.test(n)){toast("Use de 4 a 6 números.");return}
  LS.set("dv-pin",await hash(n));LS.set("dv-pinlen",String(n.length));buf="";dots();snd("ok");toast("PIN alterado.");
});
$("pin_l").addEventListener("click",function(){
  if(!pinOn()){toast("Ative o PIN primeiro.");return}
  try{sessionStorage.removeItem("dv-ok")}catch(e){}
  closeDlg($("cd"));buf="";dots();$("lk_m").textContent="Digite seu PIN";$("lock").hidden=false;
});
$("cfg").addEventListener("click",function(){
  sndBtn();themeBtn();pinBtn();
  $("i_hint").textContent=standalone?"Você já está usando o app instalado.":"Instala o site como app, com ícone e tela cheia no celular. Precisa estar hospedado em https.";
  snd("tap");$("cd").showModal();
});
(async function(){if(!LS.get("dv-pin")){LS.set("dv-pin",await hash("1234"));LS.set("dv-pinlen","4")}})();

window.addEventListener("error",function(e){toast("Erro: "+e.message)});

/* ---------- início ---------- */
loadLocal();purge();render();
$("mode").textContent="Salvo neste aparelho.";
(async function(){
  try{
    if(!window.claude)return;
    var user=await claude.use("user"),db=await claude.use("db");
    if(!db||!user)return;
    var id=await user.id();if(!id)return;
    var c=db.collection("data/users/"+id),mi=items.concat(bin),mp=Object.assign({},people);
    col=c;$("mode").textContent="Salvo na sua conta, só você vê.";
    c.onSnapshot(function(s){
      items=[];bin=[];people={};
      s.docs.forEach(function(d){var o=d.data();if(o.type==="person")people[o.name]={phone:o.phone||"",photo:o.photo||""};else (o.deleted?bin:items).push(Object.assign({id:d.id},o))});
      purge();render();
    },function(){col=null;loadLocal();render();$("mode").textContent="Salvo neste aparelho."});
    if(mi.length||Object.keys(mp).length){
      mi.forEach(function(o){var b=Object.assign({},o);delete b.id;c.doc(o.id).set(b)});
      Object.keys(mp).forEach(function(n){putPerson(n,mp[n])});
      LS.set(KEY,"");LS.set(PK,"");
    }
  }catch(e){}
})();
})();
