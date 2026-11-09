(function(){
var items=[],bin=[],pays=[],PYK="dividas-pagamentos-v1",people={},col=null,first=true,KEY="dividas-v1",PK="dividas-pessoas-v1";
var $=function(i){return document.getElementById(i)};
var brl=function(n){return "R$ "+n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})};
var esc=function(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML};
var monthName=function(m){var p=m.split("-");var n=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];return n[+p[1]-1]+"/"+p[0]};
var calm=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
var pad=function(n){return String(n).padStart(2,"0")};
var today=function(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}};
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
function themeNow(){return root.dataset.theme||"dark"}
function themeBtn(){$("th").value=root.dataset.theme==="light"?"":"dark"}
var _th=LS.get("dv-th");root.dataset.theme=_th===""?"light":(_th||"dark");
$("th").addEventListener("change",function(){var v=$("th").value;root.dataset.theme=v?"dark":"light";LS.set("dv-th",v?"dark":"");snd("tap")});themeBtn();

/* ---------- aviso com desfazer ---------- */
var tt,undoFn=null,t2fn=null;
function toast(msg,fn,l2,f2){
  $("tm").textContent=priv?String(msg).replace(/R\$\s?[\d.,]+/g,"R$ ••••"):msg;undoFn=fn||null;t2fn=f2||null;$("tu").hidden=!fn;$("t2").hidden=!f2;$("t2").textContent=l2||"";$("toast").classList.add("on");
  clearTimeout(tt);tt=setTimeout(function(){$("toast").classList.remove("on");undoFn=null;t2fn=null},f2?8000:6000);
}
$("tu").addEventListener("click",function(){if(undoFn){undoFn();snd("undo")}$("toast").classList.remove("on");undoFn=null});
$("t2").addEventListener("click",function(){var f=t2fn;$("toast").classList.remove("on");t2fn=null;if(f)f()});

/* ---------- salvar ---------- */
function pid(n){return "p_"+Array.from(new TextEncoder().encode(n)).map(function(b){return b.toString(16).padStart(2,"0")}).join("")}
function saveLocal(){var a=LS.set(KEY,JSON.stringify(items.concat(bin))),b=LS.set(PK,JSON.stringify(people)),c=LS.set(PYK,JSON.stringify(pays));if(!(a&&b&&c)&&!saveLocal.w){saveLocal.w=1;toast("Memória do aparelho cheia! Baixe o backup e apague comprovantes antigos.")}}
function loadLocal(){try{var all=JSON.parse(LS.get(KEY)||"[]");items=all.filter(function(x){return !x.deleted});bin=all.filter(function(x){return x.deleted})}catch(e){items=[];bin=[]}try{people=JSON.parse(LS.get(PK)||"{}")}catch(e){people={}}try{pays=JSON.parse(LS.get(PYK)||"[]")}catch(e){pays=[]}}
function fxBurst(el){try{if(window.QMD)QMD.burst(el)}catch(e){}}
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
  var o={phone:p.phone||"",photo:p.photo||"",code:p.code||(people[n]&&people[n].code)||"",obs:p.obs!==undefined?p.obs:((people[n]&&people[n].obs)||"")};
  if(col){people[n]=o;col.doc(pid(n)).set(Object.assign({type:"person",name:n},o)).catch(function(){alert("Erro ao salvar")})}
  else{people[n]=o;saveLocal();render()}
}
function putPay(p){
  var b=Object.assign({},p);delete b.id;b.type="pay";
  if(col)col.doc(p.id).set(b).catch(function(){alert("Erro ao salvar")});
  else{var i=pays.findIndex(function(x){return x.id===p.id});if(i>=0)pays[i]=p;else pays.push(p);saveLocal();render()}
}
function delPay(id){if(col)col.doc(id).delete();else{pays=pays.filter(function(x){return x.id!==id});saveLocal();render()}}
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
  ensureCodes();
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
    return !q||(x.desc+" "+x.who+" "+cd(x.who)+" #"+(x.dn||"")+" "+(x.cat||"")+" "+(x.note||"")+" "+monthName(x.month)).toLowerCase().indexOf(q)>=0;
  });
  var tp=0,tk=0;v.forEach(function(x){tp+=rem(x);tk+=got(x)});
  var cp=0,ck=0;v.forEach(function(x){if(rem(x)>0)cp++;if(got(x)>0)ck++});$("kpn").textContent=cp+" em aberto";$("kpp").textContent=cp;$("kkn").textContent=ck+" com pagamento";$("ktn").textContent=v.length+" dívidas";$("cnt").textContent=v.length+" de "+items.length;
  $("h_p").textContent=new Set(items.map(function(x){return x.who})).size;$("h_n").textContent=items.filter(function(x){return rem(x)>0}).length;$("h_k").textContent=items.filter(function(x){return x.paid}).length;
  num($("tp"),tp);num($("tk"),tk);num($("tt"),tp+tk);
  var g={};v.forEach(function(x){(g[x.who]=g[x.who]||[]).push(x)});
  var h="",n=0,cls=first?" in":"",jn=joined&&!selMode;
  Object.keys(g).sort().forEach(function(w){
    var pend=0,gT=0,gG=0;g[w].forEach(function(x){pend+=rem(x);gT+=x.amount;gG+=got(x)});var pc=gT?Math.round(gG/gT*100):0;
    var ew=encodeURIComponent(w);
    h+='<div class="group'+(jn?" jn"+(openJ[w]?" open":""):(shutP[w]?" shut":""))+'"><div class="gh"><button class="tgl pt" data-gp="'+ew+'" aria-label="Abrir ou fechar" title="Abrir ou fechar"><span class="chev">▾</span></button>'+av(w)+'<button class="gn" data-r="'+ew+'" title="Editar pessoa">'+esc(w)+'</button>'+cdh(w)+'<span class="gp">pendente '+brl(pend)+'</span><button class="gear" data-r="'+ew+'" title="Total da dívida, foto e telefone" aria-label="Configurações de '+esc(w).replace(/"/g,"")+'">⚙</button><div class="ga"><button class="wa" data-w="'+ew+'">Cobrar no WhatsApp</button><button data-pay="'+ew+'">💵 Pagamento</button><button data-nd="'+ew+'">＋ Dívida</button><button data-x="'+ew+'">Extrato</button><button data-rb="'+ew+'">Recibo</button><button data-q="'+ew+'">Quitar tudo</button></div></div>'+pobBlock(w)+'<div class="pb gpb" title="'+pc+'% pago"><i style="width:'+pc+'%"></i></div>';
    var gk={},ord=[];
    g[w].forEach(function(x){
      var s=sib(x.id),k=s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id;
      if(!gk[k]){gk[k]={all:s.length?s:[x],rows:[],o:"9999"};ord.push(gk[k])}
      gk[k].rows.push(x);
      if(rem(x)>0){var dk=x.date||x.month+"-01";if(dk<gk[k].o)gk[k].o=dk}
    });
    ord.sort(function(a,b){return a.o<b.o?-1:a.o>b.o?1:0});
    if(jn){
      var jt=0,jp=0,jnm=ord.map(function(G){return G.all[0].desc.replace(/\s*\d+\/\d+$/,"")});
      g[w].forEach(function(x){jt+=x.amount;jp+=got(x)});
      h+='<div class="jsum"><b>'+ord.length+' dívida'+(ord.length>1?"s":"")+' juntas</b> · '+esc(jnm.join(", "))+'<span>Pago '+brl(jp)+' de '+brl(jt)+'</span></div>';
    }
    ord.forEach(function(G){
      var multi=G.all.length>1,np=0,dT=0,dP=0,dR=0;
      G.all.forEach(function(y){if(y.paid)np++;dT+=y.amount;dP+=got(y);dR+=rem(y)});
      var dkey=multi?G.all[0].id.slice(0,G.all[0].id.lastIndexOf("_")+1):"",isOpen=selMode||!!$("q").value.trim()||!!openD[dkey];
      h+='<div class="debt'+(multi?(isOpen?" open":""):" one")+'"'+(multi?' data-dk="'+dkey+'"':"")+'>';
      if(multi){
        var dp=dT?Math.round(dP/dT*100):0,nx=G.all.filter(function(y){return rem(y)>0})[0];
        h+='<div class="dh"><button class="dt tgl" data-o="'+dkey+'" title="Abrir ou fechar as parcelas"><span class="chev">▾</span><span><b>'+esc(G.all[0].desc.replace(/\s*\d+\/\d+$/,""))+'</b>'+(G.all[0].dn?'<span class="cd">Nº '+G.all[0].dn+'</span>':"")+'<span class="s">'+np+' de '+G.all.length+' pagas · falta '+brl(dR)+(nx?' · próxima '+(nx.date?fdate(nx.date):monthName(nx.month)):' · quitada ✓')+'</span></span></button><div class="dbtn"><button class="pcs" data-pay="'+ew+'" data-pk="'+dkey+'">💵 Pagar</button><button class="pcs" data-k="'+G.all[0].id+'">Parcelas</button><button class="pcs" data-rc="'+G.all[0].id+'">Recibo</button><button class="gear" data-gd="'+G.all[0].id+'" title="Editar nome da dívida" aria-label="Editar dívida">⚙</button></div></div><div class="pb" title="'+dp+'% pago"><i style="width:'+dp+'%"></i></div>';
      }
      G.rows.sort(function(a,b){return (a.paid?1:0)-(b.paid?1:0)||((a.date||a.month)<(b.date||b.month)?-1:1)}).forEach(function(x){
      var gt=got(x),part=!x.paid&&gt>0,sub=[x.date?fdate(x.date):monthName(x.month)];
      var meta=(x.cat?'<span class="c">'+esc(x.cat)+'</span>':"")+sub[0]+(x.note?" · "+esc(x.note):"")+(x.paid&&x.paidAt?" · pago em "+ddmm(x.paidAt):"");
      h+='<div class="it'+(x.paid?" paid":"")+(sel.has(x.id)?" sel":"")+cls+'" style="animation-delay:'+Math.min(n++,12)*45+'ms">'+(selMode?'<input type="checkbox" class="sk" data-s="'+x.id+'"'+(sel.has(x.id)?" checked":"")+' aria-label="Selecionar">':"")+'<div class="m"><div class="d">'+esc(x.desc)+'</div><div class="s">'+meta+'</div>'+(part?'<div class="pb"><i style="width:'+Math.round(gt/x.amount*100)+'%"></i></div>':"")+'</div><div class="v">'+brl(x.amount)+(part?'<small>falta '+brl(rem(x))+'</small>':"")+'</div><button class="tg '+(x.paid?"o":"p")+'" data-t="'+x.id+'">'+(x.paid?"Pago":"Pendente")+'</button>'+(pfs(x).length?'<button class="pcs" data-v="'+x.id+'">📎 '+pfs(x).length+'</button>':(x.paid||got(x)>0)?'<button class="pcs" data-a="'+x.id+'">+ Comprovante</button>':"")+(multi||rem(x)<=0?"":'<button class="x" data-pay="'+ew+'" data-pk="'+x.id+'" title="Registrar pagamento">💵</button>')+(multi?"":'<button class="x" data-gd="'+x.id+'" title="Editar nome da dívida">⚙</button>')+'<button class="x" data-e="'+x.id+'" title="Editar">✎</button><button class="x" data-d="'+x.id+'" title="Apagar">✕</button></div>';
      });
      h+='</div>';
    });
    h+='</div>';
  });
  $("list").innerHTML=(view==="table"&&!selMode)?tableHTML(v):h||'<div class="empty">Nenhuma dívida encontrada. Adicione no formulário ou ajuste os filtros.</div>';
  if(v.length)first=false;
  if($("kd").open&&kRef)openParcels(kRef);
  if($("pg").open)pgRefresh();
  sel.forEach(function(i){if(!items.some(function(x){return x.id===i}))sel.delete(i)});
  dash(v,tp,tk);recv();renderBin();selN();expLbl();
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
function backupText(){return "// Backup Quem Me Deve, "+today()+"\nwindow.DIVIDAS_BACKUP = "+JSON.stringify(items,null,2)+";\nwindow.DIVIDAS_PESSOAS = "+JSON.stringify(people)+";\nwindow.DIVIDAS_PAGAMENTOS = "+JSON.stringify(pays)+";\n"}
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
  var rows=[["Código","Nº","Descrição","Pessoa","Origem","Data","Valor","Pago","Falta","Situação","Pago em","Observação"]].concat(items.map(function(x){return [cd(x.who),x.dn||"",x.desc,x.who,x.cat||"",x.date||x.month,m(x.amount),m(got(x)),m(rem(x)),x.paid?"Pago":"Pendente",x.paidAt||"",x.note||""]}));
  saveFile("dividas-"+today()+".csv","\ufeff"+rows.map(function(r){return r.map(q).join(";")}).join("\r\n"),"text/csv","Planilha CSV baixada. Abra no Excel.");
});
$("br").addEventListener("click",function(){$("bf").click()});
$("bf").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;var r=new FileReader();
  r.onload=function(){
    try{
      var s=String(r.result),pi=s.lastIndexOf("DIVIDAS_PESSOAS"),pg=s.lastIndexOf("DIVIDAS_PAGAMENTOS"),it=s.slice(0,pi>0?pi:(pg>0?pg:s.length));
      var a=it.indexOf("["),b=it.lastIndexOf("]"),arr=JSON.parse(it.slice(a,b+1)),n=0;
      arr.forEach(function(o){if(o&&o.id&&o.desc&&typeof o.amount==="number"&&o.who&&o.month){put({id:String(o.id),desc:String(o.desc),who:String(o.who),amount:o.amount,date:String(o.date||""),month:String(o.month),paid:!!o.paid,note:String(o.note||""),cat:String(o.cat||""),got:+o.got||0,paidAt:String(o.paidAt||""),proofs:Array.isArray(o.proofs)?o.proofs:(o.proof?[o.proof]:[]),dn:o.dn||0,ts:o.ts||Date.now()});n++}});
      if(pi>0){var sg=s.slice(pi,pg>pi?pg:s.length),ps=JSON.parse(sg.slice(sg.indexOf("{"),sg.lastIndexOf("}")+1));Object.keys(ps).forEach(function(k){putPerson(k,ps[k])})}
      if(pg>0){var sp=s.slice(pg),pa=JSON.parse(sp.slice(sp.indexOf("["),sp.lastIndexOf("]")+1));pa.forEach(function(p){if(p&&p.id)putPay(p)})}
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
function openEdit(it){
    var id=it.id;editId=id;sibs=sib(id);$("e_allw").hidden=!sibs.length;$("e_n").textContent=sibs.length;$("e_all").checked=true;
    $("e_desc").value=it.desc;$("e_who").value=it.who;$("e_cat").value=it.cat||"";$("e_val").value=it.amount;$("e_got").value=got(it)||"";$("e_mon").value=it.date||it.month+"-01";$("e_note").value=it.note||"";$("e_pw").hidden=!it.paid;$("e_pa").value=it.paidAt||"";$("e_pt").value=it.paidTm||"";
    $("e_h").innerHTML=histHTML(it);
    $("ed").showModal();
}
function openParcels(id){
  var r=sib(id);if(!r.length)r=items.filter(function(x){return x.id===id});if(!r.length)return;
  var keep={};if($("kd").open)document.querySelectorAll("#k_l input").forEach(function(i){keep[i.dataset.k]=i.checked});
  kIds=r.map(function(x){return x.id});kRef=r[0].id;
  $("k_t").textContent=r[0].who+" · marque as parcelas pagas, edite ou anexe o comprovante";
  $("k_l").innerHTML=r.map(function(x){
    var ck=keep[x.id]!==undefined?keep[x.id]:x.paid;
    return '<div class="pl"><label class="plc"><input type="checkbox" data-k="'+x.id+'"'+(ck?" checked":"")+'><span>'+esc(x.desc)+' <small class="s">'+(x.date?fdate(x.date):monthName(x.month))+(x.paid&&x.paidAt?" · pago em "+fdate(x.paidAt):"")+'</small></span><b>'+brl(x.amount)+'</b></label>'+
    '<button type="button" class="x" data-pe="'+x.id+'" title="Editar valor, data e nome">✎</button>'+
    '<button type="button" class="x'+(pfs(x).length?" on":"")+'" data-'+(pfs(x).length?"pv":"pa")+'="'+x.id+'" title="'+(pfs(x).length?"Ver comprovantes":"Anexar comprovante")+'">'+(pfs(x).length?"📎 "+pfs(x).length:"＋📎")+'</button></div>';
  }).join("");
  if(!$("kd").open)$("kd").showModal();
}
function kWho(){var it=items.find(function(x){return x.id===kRef});return it?it.who:""}
$("k_l").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;var D=b.dataset;
  if(D.pe){var it=items.find(function(x){return x.id===D.pe});if(it){closeDlg($("kd"));openEdit(it)}}
  else if(D.pa){attach(D.pa)}
  else if(D.pv){openGal({k:"item",id:D.pv},0)}
});
$("k_w").addEventListener("click",function(){cobrar(kWho())});
$("k_x").addEventListener("click",function(){var w=kWho();closeDlg($("kd"));openStmt(w)});
$("k_g").addEventListener("click",function(){var id=kRef;closeDlg($("kd"));openDebt(id)});
$("k_p").addEventListener("click",function(){var w=kWho();closeDlg($("kd"));openPerson(w)});
$("k_all").addEventListener("click",function(){document.querySelectorAll("#k_l input").forEach(function(i){i.checked=true})});
$("kf").addEventListener("submit",function(e){
  e.preventDefault();var prev=[];
  document.querySelectorAll("#k_l input").forEach(function(i){
    var it=items.find(function(x){return x.id===i.dataset.k});if(!it||it.paid===i.checked)return;
    prev.push(it);
    put(i.checked?Object.assign({},it,{paid:true,got:it.amount,paidAt:today(),paidTm:nowTm()}):Object.assign({},it,{paid:false,got:0,paidAt:"",paidTm:""}));
  });
  closeDlg($("kd"));
  if(prev.length){snd("ok");if(prev.some(function(x){return !x.paid}))fxBurst();toast(prev.length+" parcela(s) atualizada(s).",function(){prev.forEach(function(x){put(x)})})}
});

/* ---------- extrato ---------- */
var xName="";
function stmt(w){
  var r=items.filter(function(x){return x.who===w}).sort(function(a,b){return a.month<b.month?-1:a.month>b.month?1:0});
  var tp=0,tk=0;r.forEach(function(x){tp+=rem(x);tk+=got(x)});
  var lbl=function(x){return x.desc+" ("+monthName(x.month)+")"};
  return {tp:tp,tk:tk,sec:[
    {t:"Pendente",c:"#b45309",r:r.filter(function(x){return rem(x)>0}).map(function(x){return [lbl(x),brl(rem(x))]})},
    {t:"Já pago",c:"#14803c",r:r.filter(function(x){return got(x)>0}).map(function(x){return [lbl(x)+(x.paid&&x.paidAt?" · pago em "+ddmm(x.paidAt):x.paid?"":" · parcial"),brl(got(x))]})},
    {t:"Pagamentos recebidos",c:"#1a5fe0",r:pays.filter(function(p){return p.who===w}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0}).map(function(p){return [fdate(p.date)+" · "+p.method+((p.proofs||[]).length?" · "+p.proofs.length+" comp.":""),brl(p.amount)]})}
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
  var cv=document.createElement("canvas"),sc=Math.max(.6,Math.min(2,Math.sqrt(12e6/(W*(H+rows*L+120)))));cv.width=Math.round(W*sc);cv.height=Math.round((H+rows*L+120)*sc);
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
function dayDef(){var n=+LS.get("dv-day");return n>=1&&n<=31?n:17}
function closeDef(){var n=+LS.get("dv-close");return n>=1&&n<=31?n:10}
function nowTm(){var n=new Date();return pad(n.getHours())+":"+pad(n.getMinutes())}
function nextDue(day,close){
  var n=new Date(),y=n.getFullYear(),m=n.getMonth();
  close=Math.max(1,Math.min(31,+close||closeDef()));
  function mk(yy,mm){var last=new Date(yy,mm+1,0).getDate();return new Date(yy,mm,Math.min(day,last))}
  var d=n.getDate()<=close?mk(y,m):mk(y,m+1);
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
}
function debtBlock(n){
  return '<div class="dbk"><div class="dbk-h"><b>Dívida '+n+'</b><button type="button" class="x" data-rm title="Remover esta dívida">✕</button></div><div class="fg">'+
  '<div class="full"><label>Nome da dívida</label><input class="d-name" required placeholder="Ex.: Celular"></div>'+
  '<div><label>Valor total (R$)</label><input class="d-val" type="number" step="0.01" min="0.01" required placeholder="0,00"></div>'+
  '<div><label>Parcelas</label><input class="d-np" type="number" min="1" max="60" value="1"></div>'+
  '<div><label>1º vencimento</label><input class="d-date" type="date" required></div>'+
  '<div><label>Parcelas já pagas</label><input class="d-pd" type="number" min="0" value="0"></div>'+
  '<div class="full qk"><button type="button" class="pcs" data-q="0">Tudo pendente</button><button type="button" class="pcs" data-q="all">Tudo pago</button><span class="d-pv"></span></div>'+
  '<div><label>Origem</label><input class="d-cat" list="cats" placeholder="Ex.: Nubank"></div>'+
  '<div><label>Observação</label><input class="d-note" placeholder="Opcional"></div></div></div>';
}
function addBlock(){
  var box=$("r_debts"),n=box.querySelectorAll(".dbk").length+1,w=document.createElement("div");
  w.innerHTML=debtBlock(n);var bk=w.firstChild;box.appendChild(bk);
  bk.querySelector(".d-date").value=nextDue(Math.max(1,Math.min(31,+$("r_day").value||dayDef())),$("r_close").value);
  return bk;
}
function renumber(){document.querySelectorAll("#r_debts .dbk").forEach(function(b,i){b.querySelector(".dbk-h b").textContent="Dívida "+(i+1)});document.querySelectorAll("#r_debts [data-rm]").forEach(function(x,i,a){x.hidden=a.length<2})}
function blkPrev(bk){
  var a=parseFloat(bk.querySelector(".d-val").value),n=Math.max(1,Math.min(60,parseInt(bk.querySelector(".d-np").value)||1)),pdi=bk.querySelector(".d-pd"),p=Math.max(0,Math.min(n,parseInt(pdi.value)||0));
  if(+pdi.value>n)pdi.value=n;
  var out=bk.querySelector(".d-pv");
  if(isNaN(a)||a<=0){out.textContent="";return}
  var base=Math.floor(a/n*100)/100,last=Math.round((a-base*(n-1))*100)/100;
  out.textContent=(n>1?n+"x de "+brl(base)+(last!==base?" (última "+brl(last)+")":""):brl(a))+(p?" · "+p+" paga"+(p>1?"s":""):" · tudo pendente");
}
function regHint(){
  var nm=$("who").value.trim(),r=items.filter(function(x){return x.who===nm}),seen={},names=[];
  r.forEach(function(x){var s=sib(x.id),k=s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id;if(seen[k])return;seen[k]=1;names.push(x.desc.replace(/\s*\d+\/\d+$/,""))});
  $("r_hint").textContent=names.length?nm+" já tem "+names.length+" dívida"+(names.length>1?"s":"")+": "+names.join(", ")+". As novas serão somadas às que já existem.":"";
}
function openReg(name){
  rphoto="";$("r_phone").value="";$("r_code").value="";$("r_obs").value=(name&&people[name]&&people[name].obs)||"";delete $("r_code").dataset.man;$("who").value=name||"";$("r_day").value=dayDef();$("r_close").value=closeDef();
  $("r_debts").innerHTML="";addBlock();renumber();
  $("who").dispatchEvent(new Event("input"));updR();regHint();
  $("rd").showModal();setTimeout(function(){(name?$("r_debts").querySelector(".d-name"):$("who")).focus()},60);
}
$("r_add").addEventListener("click",function(){var bk=addBlock();renumber();snd("tap");bk.scrollIntoView({behavior:calm?"auto":"smooth",block:"center"});bk.querySelector(".d-name").focus()});
$("r_day").addEventListener("input",function(){
  var d=Math.max(1,Math.min(31,+$("r_day").value||dayDef()));
  document.querySelectorAll("#r_debts .dbk").forEach(function(b){var dt=b.querySelector(".d-date");if(!dt.dataset.man)dt.value=nextDue(d)});
});
$("r_code").addEventListener("input",function(){$("r_code").dataset.man="1"});
$("r_debts").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  var bk=b.closest(".dbk");
  if(b.hasAttribute("data-rm")){if($("r_debts").querySelectorAll(".dbk").length>1){bk.remove();renumber();snd("tap")}return}
  if(b.dataset.q!==undefined){bk.querySelector(".d-pd").value=b.dataset.q==="all"?(bk.querySelector(".d-np").value||1):0;blkPrev(bk)}
});
$("r_debts").addEventListener("input",function(e){
  var bk=e.target.closest(".dbk");if(!bk)return;
  if(e.target.classList.contains("d-date"))e.target.dataset.man="1";
  blkPrev(bk);
});
$("cfg_day").addEventListener("change",function(){var n=Math.max(1,Math.min(31,parseInt($("cfg_day").value)||10));$("cfg_day").value=n;LS.set("dv-day",String(n));toast("Dia de vencimento padrão: "+n+".")});
$("p_n").addEventListener("click",function(){var w=editName;closeDlg($("pd"));openReg(w)});
$("k_n").addEventListener("click",function(){var w=kWho();closeDlg($("kd"));openReg(w)});
$("rg").addEventListener("click",function(){snd("tap");openReg()});
$("fab").addEventListener("click",function(){snd("tap");openReg()});
$("who").addEventListener("input",function(){var p=people[$("who").value.trim()];if(p&&p.phone&&!$("r_phone").value)$("r_phone").value=p.phone;if(p&&p.code&&!$("r_code").dataset.man)$("r_code").value=p.code;if(p&&p.obs&&!$("r_obs").value)$("r_obs").value=p.obs;updR();regHint()});
$("r_pick").addEventListener("click",function(){$("r_file").click()});
$("r_file").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;var img=new Image(),u=URL.createObjectURL(f);
  img.onload=function(){var c=document.createElement("canvas");c.width=c.height=96;var q=Math.min(img.width,img.height);c.getContext("2d").drawImage(img,(img.width-q)/2,(img.height-q)/2,q,q,0,0,96,96);rphoto=c.toDataURL("image/jpeg",.8);URL.revokeObjectURL(u);updR()};
  img.src=u;$("r_file").value="";
});
function tickHello(){
  var n=new Date(),p=function(x){return String(x).padStart(2,"0")};
  var d=n.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  d=d.replace(/(^|\s)(\p{L})/gu,function(m,x,y){return x+y.toUpperCase()}).replace(/ De /g," de ");
  $("hello").textContent=d+" · "+p(n.getHours())+":"+p(n.getMinutes())+":"+p(n.getSeconds());
}
tickHello();setInterval(tickHello,1000);

/* ---------- comprovante ---------- */
var attachOwner=null,gal={list:[],i:0,owner:null};
function pfs(x){var a=(x.proofs||[]).slice();if(x.proof)a.unshift(x.proof);return a}
function shrink(file,cb){
  var img=new Image(),u=URL.createObjectURL(file);
  img.onload=function(){
    var out="";[[720,.55],[520,.5],[400,.42]].some(function(p){
      var k=Math.min(1,p[0]/Math.max(img.width,img.height)),c=document.createElement("canvas");
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      out=c.toDataURL("image/jpeg",p[1]);return out.length<110000;
    });
    URL.revokeObjectURL(u);cb(out);
  };
  img.onerror=function(){cb("")};
  img.src=u;
}
function shrinkAll(files,cb){
  var out=[],n=files.length;if(!n)return cb(out);
  Array.prototype.forEach.call(files,function(f,i){shrink(f,function(d){out[i]=d;if(--n===0)cb(out.filter(Boolean))})});
}
function ownerProofs(o){
  if(o.k==="item"){var it=items.find(function(x){return x.id===o.id});return it?pfs(it):[]}
  var p=pays.find(function(x){return x.id===o.id});return p?(p.proofs||[]):[];
}
function setOwnerProofs(o,arr){
  if(o.k==="item"){var it=items.find(function(x){return x.id===o.id});if(!it)return false;var n=Object.assign({},it,{proofs:arr});delete n.proof;put(n);return true}
  var p=pays.find(function(x){return x.id===o.id});if(!p)return false;putPay(Object.assign({},p,{proofs:arr}));return true;
}
function attach(id){attachTo({k:"item",id:id})}
function attachTo(o){attachOwner=o;$("pfile").click()}
$("pfile").addEventListener("change",function(e){
  var fs=e.target.files,o=attachOwner;if(!fs.length||!o)return;
  shrinkAll(fs,function(urls){
    if(!urls.length){toast("Não consegui ler essas imagens.");return}
    if(o.k==="form"){pgS.proofs=pgS.proofs.concat(urls).slice(0,6);pgThumbs();return}
    var cur=ownerProofs(o).concat(urls).slice(0,8);
    if(setOwnerProofs(o,cur)){snd("ok");toast(urls.length+" comprovante"+(urls.length>1?"s":"")+" guardado"+(urls.length>1?"s":"")+".");if($("vd").open){gal.list=cur;gal.i=cur.length-1;galShow()}}
  });
  $("pfile").value="";
});
function galShow(){
  $("v_img").src=gal.list[gal.i]||"";
  $("v_th").innerHTML=gal.list.map(function(u,i){return '<img src="'+u+'" data-gi="'+i+'" class="'+(i===gal.i?"on":"")+'" alt="">'}).join("");
  $("v_c").textContent=gal.list.length?"Comprovante "+(gal.i+1)+" de "+gal.list.length:"";
}
function openGal(o,idx){
  gal.owner=o;gal.list=ownerProofs(o);
  if(!gal.list.length){attachTo(o);return}
  gal.i=Math.min(idx||0,gal.list.length-1);galShow();if(!$("vd").open)$("vd").showModal();
}
$("v_th").addEventListener("click",function(e){var im=e.target.closest("img[data-gi]");if(im){gal.i=+im.dataset.gi;galShow()}});
$("v_dl").addEventListener("click",function(){
  var a=document.createElement("a");a.href=$("v_img").src;a.download="comprovante-"+(gal.i+1)+".jpg";document.body.appendChild(a);a.click();a.remove();
});
$("v_re").addEventListener("click",function(){attachTo(gal.owner)});
$("v_rm").addEventListener("click",function(){
  var o=gal.owner,arr=ownerProofs(o),i=gal.i,gone=arr.splice(i,1)[0];if(gone===undefined)return;
  setOwnerProofs(o,arr);snd("del");
  toast("Comprovante removido.",function(){var b=ownerProofs(o).slice();b.splice(i,0,gone);setOwnerProofs(o,b)});
  if(!arr.length)closeDlg($("vd"));else{gal.list=arr;gal.i=Math.min(i,arr.length-1);galShow()}
});

/* ---------- código/ID e número da dívida ---------- */
var dnLast=0;
function cd(n){return (people[n]||{}).code||""}
function pobh(n){var o=(people[n]||{}).obs;return o?'<small class="pob" title="'+esc(o).replace(/"/g,"&quot;")+'">'+esc(o)+'</small>':""}
function pobBlock(n){var o=(people[n]||{}).obs;return o?'<div class="pobs">📝 '+esc(o)+'</div>':""}
function cdh(n){return cd(n)?'<span class="cd">'+esc(cd(n))+'</span>':""}
function keyOfX(x){var s=sib(x.id);return s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id}
function nextDn(){var m=dnLast;items.concat(bin).forEach(function(x){if(x.dn>m)m=x.dn});dnLast=m+1;return dnLast}
function codeTaken(c,who){var u=c.toUpperCase();return Object.keys(people).some(function(k){return k!==who&&String(people[k].code||"").toUpperCase()===u})}
function patchIt(x,f){Object.assign(x,f);if(col){var b=Object.assign({},x);delete b.id;col.doc(x.id).set(b)}}
function ensureCodes(){
  var ch=false,mx=0,seen={},names=[];
  Object.keys(people).forEach(function(n){var m=/^C?(\d+)$/i.exec(people[n].code||"");if(m)mx=Math.max(mx,+m[1])});
  items.slice().sort(function(a,b){return (a.ts||0)-(b.ts||0)}).forEach(function(x){if(!seen[x.who]){seen[x.who]=1;names.push(x.who)}});
  names.forEach(function(n){
    var p=people[n];
    if(!p||!p.code){mx++;var np=Object.assign({phone:"",photo:""},p||{},{code:"C"+String(mx).padStart(3,"0")});people[n]=np;ch=true;if(col)col.doc(pid(n)).set(Object.assign({type:"person",name:n},np))}
  });
  var dm=dnLast,gs={};
  items.concat(bin).forEach(function(x){if(x.dn>dm)dm=x.dn});
  items.forEach(function(x){var k=keyOfX(x);(gs[k]=gs[k]||[]).push(x)});
  Object.keys(gs).map(function(k){return gs[k]}).sort(function(a,b){var f=function(g){return Math.min.apply(null,g.map(function(x){return x.ts||0}))};return f(a)-f(b)}).forEach(function(g){
    var ex=g.filter(function(x){return x.dn})[0],n=ex?ex.dn:++dm;
    g.forEach(function(x){if(x.dn!==n){patchIt(x,{dn:n});ch=true}});
  });
  dnLast=dm;
  if(ch&&!col)saveLocal();
}

/* ---------- pagamentos (Pix, dinheiro...) ---------- */
var pgS={who:"",key:"",proofs:[]};
function round2(n){return Math.round(n*100)/100}
function pTargets(who,key){
  return items.filter(function(x){return x.who===who&&rem(x)>0&&(!key||keyOfX(x)===key)}).sort(function(a,b){var p=a.date||a.month+"-01",q=b.date||b.month+"-01";return p<q?-1:p>q?1:a.id<b.id?-1:1});
}
function pRem(who,key){var t=0;pTargets(who,key).forEach(function(x){t+=rem(x)});return round2(t)}
function applyPay(who,key,amount,method,date,note,proofs){
  var left=round2(amount),al=[];
  pTargets(who,key).forEach(function(x){
    if(left<=0.004)return;
    var take=round2(Math.min(rem(x),left)),ng=round2(got(x)+take),full=ng>=x.amount-0.004;
    put(Object.assign({},x,full?{paid:true,got:x.amount,paidAt:date,paidTm:($("pg_tm").value||nowTm())}:{got:ng}));
    al.push({id:x.id,amt:take});left=round2(left-take);
  });
  var p={id:"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),who:who,key:key||"",amount:round2(amount-left),method:method,date:date,tm:($("pg_tm").value||nowTm()),note:note,proofs:proofs,alloc:al,ts:Date.now()};
  putPay(p);return p;
}
function undoPay(p){
  var prev=[];
  (p.alloc||[]).forEach(function(a){
    var x=items.find(function(i){return i.id===a.id});if(!x)return;prev.push(x);
    var ng=round2((x.paid?x.amount:(x.got||0))-a.amt);
    put(Object.assign({},x,{paid:false,got:ng>0.004?ng:0,paidAt:"",paidTm:""}));
  });
  delPay(p.id);
  return function(){prev.forEach(function(x){put(x)});putPay(p)};
}
function pgThumbs(){
  $("pg_th").innerHTML=pgS.proofs.map(function(u,i){return '<div class="th"><img src="'+u+'" alt=""><button type="button" data-pgx="'+i+'" aria-label="Remover">✕</button></div>'}).join("");
}
function pgAfter(){
  var r=pRem(pgS.who,pgS.key),v=parseFloat($("pg_v").value)||0;
  $("pg_rem").textContent=brl(r);$("pg_after").textContent=brl(Math.max(0,round2(r-v)));
  $("pg_ex").textContent=v>r+0.004?"O valor passa do que falta ("+brl(r)+"). Só "+brl(r)+" será descontado.":"";
  $("pg_go").disabled=r<=0;
}
function pgHist(){
  var ids={};items.forEach(function(x){if(!pgS.key||keyOfX(x)===pgS.key)ids[x.id]=1});
  var l=pays.filter(function(p){return p.who===pgS.who&&(!pgS.key||(p.alloc||[]).some(function(a){return ids[a.id]}))}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0});
  $("pg_h").innerHTML=l.length?'<div class="ph-title">Pagamentos registrados</div>'+l.map(function(p){
    return '<div class="ph-row"><div><b>'+brl(p.amount)+'</b><span class="mt">'+esc(p.method)+'</span><div class="s">'+fdate(p.date)+(p.note?" · "+esc(p.note):"")+'</div></div>'+
      ((p.proofs||[]).length?'<div class="thumbs">'+p.proofs.slice(0,3).map(function(u,i){return '<img src="'+u+'" data-pv="'+p.id+'" data-i="'+i+'" alt="">'}).join("")+((p.proofs||[]).length>3?'<span class="s">+'+(p.proofs.length-3)+'</span>':"")+'</div>':'<button type="button" class="pcs" data-pa="'+p.id+'">＋📎</button>')+
      '<button type="button" class="x" data-dp="'+p.id+'" title="Apagar este pagamento">🗑</button></div>';
  }).join(""):"";
}
function pgRefresh(){pgAfter();pgHist()}
function pgTitle(){
  var who=pgS.who,key=pgS.key,it=key?items.filter(function(x){return keyOfX(x)===key})[0]:null;
  $("pg_t").innerHTML=who?((it?"Dívida: <b>"+esc(it.desc.replace(/\s*\d+\/\d+$/,""))+"</b> · ":"Todas as dívidas · ")+esc(who)+(cd(who)?" ("+esc(cd(who))+")":"")+(key?"":". O valor desconta primeiro das parcelas mais antigas.")):"";
}
function mSync(){var m=$("pg_m").value;document.querySelectorAll("#pg_ch button").forEach(function(b){b.classList.toggle("on",b.dataset.m===m)})}
function fillWho(sel){
  var by={};items.forEach(function(x){if(rem(x)>0)by[x.who]=(by[x.who]||0)+rem(x)});
  var ns=Object.keys(by).sort(function(a,b){return a.localeCompare(b)});
  $("pg_who").innerHTML=ns.map(function(n){return '<option value="'+esc(n).replace(/"/g,"&quot;")+'">'+esc(n)+(cd(n)?" ("+esc(cd(n))+")":"")+" · falta "+brl(by[n])+'</option>'}).join("");
  if(sel&&ns.indexOf(sel)>=0)$("pg_who").value=sel;
  return ns.length;
}
function fillDbt(){
  var who=$("pg_who").value,seen={},o='<option value="">Todas as dívidas (mais antigas primeiro)</option>';
  items.filter(function(x){return x.who===who&&rem(x)>0}).forEach(function(x){
    var k=keyOfX(x);if(seen[k])return;seen[k]=1;
    o+='<option value="'+k+'">'+esc(x.desc.replace(/\s*\d+\/\d+$/,""))+(x.dn?" · Nº "+x.dn:"")+" · falta "+brl(pRem(who,k))+'</option>';
  });
  $("pg_dbt").innerHTML=o;
}
function openPay(who,key,quick){
  pgS={who:who||"",key:key||"",proofs:[]};
  $("pgq").hidden=!quick;
  if(quick){
    if(!fillWho(who)){toast("Ninguém está devendo no momento.");return}
    pgS.who=$("pg_who").value;fillDbt();$("pg_q").value="";
  }
  pgTitle();
  $("pg_v").value="";$("pg_n").value="";$("pg_d").value=today();$("pg_tm").value=nowTm();$("pg_m").value=LS.get("dv-pm")||(quick?"Dinheiro":"Pix");mSync();
  pgThumbs();pgRefresh();
  $("pg").showModal();setTimeout(function(){(quick?$("pg_q"):$("pg_v")).focus()},60);
}
$("pg_ch").addEventListener("click",function(e){var b=e.target.closest("button");if(b){$("pg_m").value=b.dataset.m;mSync();snd("tap")}});
$("pg_m").addEventListener("change",mSync);
$("pg_who").addEventListener("change",function(){pgS.who=$("pg_who").value;pgS.key="";fillDbt();pgTitle();pgRefresh()});
$("pg_dbt").addEventListener("change",function(){pgS.key=$("pg_dbt").value;pgTitle();pgRefresh()});
function nrmT(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
$("pg_q").addEventListener("input",function(){
  var t=nrmT($("pg_q").value),m=t.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if(m){var n=m[1];n=n.indexOf(",")>=0&&n.indexOf(".")>=0?n.replace(/\./g,"").replace(",","."):n.replace(",",".");$("pg_v").value=n}
  var mm=/pix/.test(t)?"Pix":/dinheiro|especie|cash|mao/.test(t)?"Dinheiro":/cartao/.test(t)?"Cartão":/transfer|ted|doc/.test(t)?"Transferência":/boleto/.test(t)?"Boleto":"";
  if(mm){$("pg_m").value=mm;mSync()}
  var opts=[].slice.call($("pg_who").options),hit=opts.filter(function(o){var nm=nrmT(o.value);return nm&&t.indexOf(nm)>=0})[0]||opts.filter(function(o){var f=nrmT(o.value).split(" ")[0];return f.length>2&&t.split(/\s+/).indexOf(f)>=0})[0];
  if(hit&&hit.value!==$("pg_who").value){$("pg_who").value=hit.value;pgS.who=hit.value;pgS.key="";fillDbt();pgTitle()}
  pgRefresh();
});
$("qpay").addEventListener("click",function(){snd("tap");openPay("","",true)});
$("qpay2").addEventListener("click",function(){snd("tap");openPay("","",true)});
$("pg_v").addEventListener("input",pgAfter);
$("pg_all").addEventListener("click",function(){$("pg_v").value=pRem(pgS.who,pgS.key)||"";pgAfter()});
$("pg_add").addEventListener("click",function(){attachTo({k:"form"})});
$("pg_th").addEventListener("click",function(e){var b=e.target.closest("[data-pgx]");if(b){pgS.proofs.splice(+b.dataset.pgx,1);pgThumbs()}});
$("pg_h").addEventListener("click",function(e){
  var im=e.target.closest("img[data-pv]");if(im){openGal({k:"pay",id:im.dataset.pv},+im.dataset.i);return}
  var pa=e.target.closest("[data-pa]");if(pa){attachTo({k:"pay",id:pa.dataset.pa});return}
  var dp=e.target.closest("[data-dp]");
  if(dp){var p=pays.find(function(x){return x.id===dp.dataset.dp});if(!p)return;if(!confirm("Apagar este pagamento de "+brl(p.amount)+"? O valor volta a ficar devendo."))return;var undo=undoPay(p);snd("del");toast("Pagamento apagado.",undo)}
});
$("pgf").addEventListener("submit",function(e){
  e.preventDefault();
  var v=round2(parseFloat($("pg_v").value)),r=pRem(pgS.who,pgS.key);
  if(!(v>0)||!$("pg_d").value)return;
  if(r<=0){toast("Não há nada pendente aqui.");return}
  var ap=Math.min(v,r),m=$("pg_m").value;LS.set("dv-pm",m);
  var p=applyPay(pgS.who,pgS.key,ap,m,$("pg_d").value,$("pg_n").value.trim(),pgS.proofs.slice());
  var after=round2(r-ap);
  closeDlg($("pg"));snd("ok");if(after<=0)fxBurst($("pg_go"));
  toast("Pagamento de "+brl(ap)+" ("+m+") registrado. "+(after>0?"Falta "+brl(after)+".":"Quitado! 🎉")+(v>ap?" O que passou ("+brl(round2(v-ap))+") foi ignorado.":""),function(){undoPay(p)});
});
$("k_pay").addEventListener("click",function(){var it=items.find(function(x){return x.id===kRef});if(!it)return;var w=it.who,k=keyOfX(it);closeDlg($("kd"));openPay(w,k)});
$("p_pay").addEventListener("click",function(){var w=editName;closeDlg($("pd"));openPay(w,"")});

/* ---------- ações da lista ---------- */
var editId=null,editName=null,photo="";
function closeDlg(d){if(d.open)d.close()}
document.querySelectorAll("[data-close]").forEach(function(b){b.addEventListener("click",function(){closeDlg($(b.dataset.close))})});
["ed","pd","kd","xd","vd","td","rd","cd","rk","im","sd","recd","dg","pg"].forEach(function(i){$(i).addEventListener("click",function(e){if(e.target===$(i))closeDlg($(i))})});

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
  $("p_name").value=w;$("p_code").value=(people[w]||{}).code||"";$("p_obs").value=(people[w]||{}).obs||"";$("p_phone").value=p.phone||"";$("p_av").innerHTML=av(w);accFill(w);
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
$("p_w").addEventListener("click",function(){cobrar(editName)});
$("p_x").addEventListener("click",function(){var w=editName;closeDlg($("pd"));openStmt(w)});
$("p_r").addEventListener("click",function(){var w=editName;closeDlg($("pd"));openRecibo(w)});
$("p_q").addEventListener("click",function(){
  var w=editName,prev=items.filter(function(x){return x.who===w&&!x.paid});
  if(!prev.length){toast("Nada pendente para "+w+".");return}
  if(!confirm("Marcar "+prev.length+" item(ns) de "+w+" como pagos?"))return;
  prev.forEach(function(x){put(Object.assign({},x,{paid:true,got:x.amount,paidAt:today(),paidTm:nowTm()}))});
  closeDlg($("pd"));snd("ok");fxBurst($("p_q"));toast(prev.length+" item(ns) quitados.",function(){prev.forEach(function(x){put(x)})});
});
$("pf").addEventListener("submit",function(e){
  e.preventDefault();
  var nn=$("p_name").value.trim(),old=editName;if(!nn)return;
  var pcode=$("p_code").value.trim().toUpperCase();if(pcode&&codeTaken(pcode,old)){toast("Esse código já é de outra pessoa.");return}
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
  putPerson(nn,{phone:$("p_phone").value.trim(),photo:photo,code:pcode,obs:$("p_obs").value.trim()});
  var npw=$("p_pwd").value.trim(),ncd=cd(nn);
  if(npw&&npw!==(accPw()[ncd]||"")){
    if(noCrypto()){}
    else accMake(nn,npw).then(function(){toast("Senha salva.")}).catch(function(err){toast("Não consegui salvar a senha: "+err.message)});
  }
  closeDlg($("pd"));snd("ok");
});

$("list").addEventListener("click",function(e){
  var tg=e.target.closest("[data-o],[data-gp]");
  if(tg){
    if(tg.dataset.o){var d=tg.closest(".debt"),on=d.classList.toggle("open");if(on)openD[tg.dataset.o]=1;else delete openD[tg.dataset.o];LS.set("dv-open",JSON.stringify(openD))}
    else{var pw=decodeURIComponent(tg.dataset.gp),gp=tg.closest(".group");if(gp.classList.contains("jn")){if(gp.classList.toggle("open"))openJ[pw]=1;else delete openJ[pw]}else{var sh=gp.classList.toggle("shut");if(sh)shutP[pw]=1;else delete shutP[pw];LS.set("dv-shut",JSON.stringify(shutP))}}
    snd("tap");expLbl();return;
  }
  var tr=e.target.closest("tr.gr");if(tr&&!e.target.closest("button")){snd("tap");if(tr.dataset.gj)openStmt(decodeURIComponent(tr.dataset.gj));else openParcels(tr.dataset.g);return}
  if(e.target.classList&&e.target.classList.contains("sk")){
    var sid=e.target.dataset.s;if(e.target.checked)sel.add(sid);else sel.delete(sid);
    e.target.closest(".it").classList.toggle("sel",e.target.checked);selN();return;
  }
  var b=e.target.closest("button");if(!b)return;
  var D=b.dataset;
  if(D.w){cobrar(decodeURIComponent(D.w));return}
  if(D.gd){snd("tap");openDebt(D.gd);return}
  if(D.dd){var gr=sib(D.dd);if(!gr.length)return;gr.forEach(function(x){put(Object.assign({},x,{deleted:Date.now()}))});snd("del");toast("Dívida movida para a lixeira.",function(){gr.forEach(function(x){put(x)})});return}
  if(D.nd){snd("tap");openReg(decodeURIComponent(D.nd));return}
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
    prev.forEach(function(x){put(Object.assign({},x,{paid:true,got:x.amount,paidAt:today(),paidTm:nowTm()}))});
    snd("ok");fxBurst(b);toast(prev.length+" item(ns) quitados.",function(){prev.forEach(put)});return;
  }
  if(D.a){attach(D.a);return}
  if(D.v){snd("tap");openGal({k:"item",id:D.v},0);return}
  if(D.pay){snd("tap");openPay(decodeURIComponent(D.pay),D.pk||"");return}
  if(D.k){snd("tap");openParcels(D.k);return}
  var id=D.t||D.e||D.d,it=items.find(function(x){return x.id===id});if(!it)return;
  if(D.t){
    var old=it;
    put(it.paid?Object.assign({},it,{paid:false,got:0,paidAt:"",paidTm:""}):Object.assign({},it,{paid:true,got:it.amount,paidAt:today(),paidTm:nowTm()}));
    snd(old.paid?"tap":"ok");if(!old.paid)fxBurst(b);if(!old.paid)toast("Marcado como pago.",function(){put(old)},"Anexar comprovante",function(){attach(old.id)});
  }else if(D.d){
    put(Object.assign({},it,{deleted:Date.now()}));snd("del");toast("Item movido para a lixeira.",function(){put(it)});
  }else{
    openEdit(it);
  }
});
$("ef").addEventListener("submit",function(e){
  e.preventDefault();
  var it=items.find(function(x){return x.id===editId}),a=parseFloat($("e_val").value);
  if(!it||isNaN(a)){closeDlg($("ed"));return}
  var g0=Math.max(0,parseFloat($("e_got").value)||0),keep=it.paid&&g0===it.amount,g=keep?a:g0,paid=g>=a;
  put(Object.assign({},it,{desc:$("e_desc").value.trim(),who:$("e_who").value.trim(),cat:$("e_cat").value.trim(),amount:a,got:paid?a:g,paid:paid,paidAt:paid?($("e_pa").value||(it.paid&&it.paidAt?it.paidAt:today())):"",paidTm:paid?($("e_pa").value?$("e_pt").value:(it.paid&&it.paidTm?it.paidTm:nowTm())):"",date:$("e_mon").value,month:$("e_mon").value.slice(0,7),note:$("e_note").value.trim()}));
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
  var who=$("who").value.trim();if(!who)return;
  var rcode=$("r_code").value.trim().toUpperCase();if(rcode&&codeTaken(rcode,who)){toast("Esse código já é de outra pessoa.");return}
  var made=0,tp=0,tpd=0,cur0=people[who]||{};
  document.querySelectorAll("#r_debts .dbk").forEach(function(bk,bi){
    var q=function(c){return bk.querySelector(c).value},a=parseFloat(q(".d-val")),name=q(".d-name").trim(),date=q(".d-date");
    if(isNaN(a)||a<=0||!name||!date)return;
    var n=Math.max(1,Math.min(60,parseInt(q(".d-np"))||1)),pn=Math.max(0,Math.min(n,parseInt(q(".d-pd"))||0));
    var dn=nextDn(),base=Math.floor(a/n*100)/100,uid="d"+Date.now().toString(36)+bi+Math.random().toString(36).slice(2,5),cat=q(".d-cat").trim(),note=q(".d-note").trim();
    for(var i=0;i<n;i++){
      var amt=i<n-1?base:Math.round((a-base*(n-1))*100)/100,dt=addDate(date,i),pd=i<pn;
      put({id:uid+"_"+i,desc:n>1?name+" "+(i+1)+"/"+n:name,who:who,dn:dn,cat:cat,amount:amt,date:dt,month:dt.slice(0,7),paid:pd,got:pd?amt:0,paidAt:pd?(dt>today()?today():dt):"",note:note,ts:Date.now()+i+bi*100});
    }
    made++;tp+=n;tpd+=pn;
  });
  if(!made){toast("Preencha o nome, o valor e o vencimento da dívida.");return}
  var ph=$("r_phone").value.trim();
  var robs=$("r_obs").value.trim();
  if(ph||rphoto||rcode||robs!==(cur0.obs||"")){var cur=people[who]||{};putPerson(who,{phone:ph||cur.phone||"",photo:rphoto||cur.photo||"",code:rcode||cur.code||"",obs:robs})}
  var cl=parseInt($("r_close").value);if(cl>=1&&cl<=31)LS.set("dv-close",String(cl));var dy=parseInt($("r_day").value);if(dy>=1&&dy<=31)LS.set("dv-day",String(dy));
  snd("add");closeDlg($("rd"));
  toast(made+" dívida"+(made>1?"s":"")+" registrada"+(made>1?"s":"")+" para "+who+" ("+tp+" parcela"+(tp>1?"s":"")+(tpd?", "+tpd+" já paga"+(tpd>1?"s":""):"")+").");
  rphoto="";
});
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

/* ---------- abrir/fechar e editar dívida ---------- */
var openD={},shutP={};
try{openD=JSON.parse(LS.get("dv-open")||"{}");shutP=JSON.parse(LS.get("dv-shut")||"{}")}catch(e){}
function expLbl(){
  var ds=document.querySelectorAll("#list .debt:not(.one)");
  var anyClosed=Array.prototype.some.call(ds,function(d){return !d.classList.contains("open")})||!!document.querySelector("#list .group.shut");
  $("expb").textContent=anyClosed?"⇣ Abrir tudo":"⇡ Fechar tudo";$("expb").hidden=!ds.length||joined;
}
$("expb").addEventListener("click",function(){
  var ds=document.querySelectorAll("#list .debt:not(.one)"),anyClosed=Array.prototype.some.call(ds,function(d){return !d.classList.contains("open")})||!!document.querySelector("#list .group.shut");
  ds.forEach(function(d){d.classList.toggle("open",anyClosed);if(anyClosed)openD[d.dataset.dk]=1;else delete openD[d.dataset.dk]});
  if(anyClosed){document.querySelectorAll("#list .group.shut").forEach(function(g){g.classList.remove("shut")});shutP={}}
  LS.set("dv-open",JSON.stringify(openD));LS.set("dv-shut",JSON.stringify(shutP));snd("tap");expLbl();
});
var dgIds=[];
function openDebt(id){
  var r=sib(id);if(!r.length)r=items.filter(function(x){return x.id===id});if(!r.length)return;
  dgIds=r.map(function(x){return x.id});var multi=r.length>1;
  $("dg_t").textContent=multi?r.length+" parcelas. O novo nome vale para todas elas.":"Dívida de uma parcela.";
  $("dg_n").value=multi?r[0].desc.replace(/\s*\d+\/\d+$/,""):r[0].desc;
  $("dg_w").value=r[0].who;$("dg_o").value=(r.filter(function(x){return x.note})[0]||{}).note||"";$("dg_c").value=(r.filter(function(x){return x.cat})[0]||{}).cat||"";
  $("dg").showModal();
}
$("dgf").addEventListener("submit",function(e){
  e.preventDefault();
  var base=$("dg_n").value.trim(),w=$("dg_w").value.trim(),c=$("dg_c").value.trim(),nt=$("dg_o").value.trim();if(!base||!w)return;
  var r=items.filter(function(x){return dgIds.indexOf(x.id)>=0}),multi=r.length>1;
  r.forEach(function(x){var m=x.desc.match(/\s*(\d+\/\d+)$/);put(Object.assign({},x,{desc:multi?base+(m?" "+m[1]:""):base,who:w,cat:c,note:nt}))});
  closeDlg($("dg"));snd("ok");toast("Dívida atualizada.",function(){r.forEach(function(x){put(x)})});
});
$("dg_x").addEventListener("click",function(){
  var r=items.filter(function(x){return dgIds.indexOf(x.id)>=0});if(!r.length)return;
  if(!confirm("Apagar a dívida inteira ("+r.length+" parcela(s))? Ela vai para a lixeira."))return;
  r.forEach(function(x){put(Object.assign({},x,{deleted:Date.now()}))});
  closeDlg($("dg"));snd("del");toast("Dívida na lixeira.",function(){r.forEach(function(x){put(x)})});
});

/* ---------- menu lateral ---------- */
function showV(v){
  $("v_home").hidden=v!=="home";$("v_rep").hidden=v!=="rep";
  document.querySelectorAll(".nv[data-nv]").forEach(function(b){b.classList.toggle("on",b.dataset.nv===v||(v==="home"&&b.dataset.nv==="home"))});
}
document.querySelectorAll(".nv[data-nv]").forEach(function(b){
  b.addEventListener("click",function(){
    var d=b.dataset.nv;snd("tap");
    if(d==="nova"){$("rg").click();return}
    if(d==="rel"){showV("rep");render();window.scrollTo({top:0});return}
    showV("home");
    document.querySelectorAll(".nv[data-nv]").forEach(function(x){x.classList.toggle("on",x===b)});
    if(d==="minhas")$("minhas").scrollIntoView({behavior:calm?"auto":"smooth",block:"start"});else window.scrollTo({top:0,behavior:calm?"auto":"smooth"});
  });
});
$("usr").addEventListener("click",function(){$("cfg").click()});
$("rkb2").addEventListener("click",function(){$("rkb").click()});
$("sair").addEventListener("click",function(){$("pin_l").click()});

/* ---------- modo privacidade ---------- */
var priv=LS.get("dv-priv")==="1";
var EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
var EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/></svg>';
function privApply(){
  root.classList.toggle("priv",priv);
  $("priv").innerHTML=priv?EYE_OFF:EYE;$("priv").classList.toggle("on",priv);
  $("priv").title=priv?"Valores escondidos. Toque para mostrar":"Esconder valores (modo privacidade)";
  $("privb").textContent=priv?"Ativado":"Desativado";
}
function privToggle(){priv=!priv;LS.set("dv-priv",priv?"1":"0");privApply();snd("tap");toast(priv?"Valores escondidos.":"Valores visíveis.")}
$("priv").addEventListener("click",privToggle);
$("privb").addEventListener("click",privToggle);
privApply();

/* ---------- recibo ---------- */
var recCur=null;
function recData(w,id,join){
  var keyOf=function(x){var s=sib(x.id);return s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id};
  var ref=id?items.find(function(x){return x.id===id}):null,want=ref?keyOf(ref):null,seen={},debts=[],td=today();
  items.filter(function(x){return x.who===w}).forEach(function(x){
    var k=keyOf(x);if((want&&k!==want)||seen[k])return;seen[k]=1;
    var s=sib(x.id),r=(s.length?s:[x]).slice().sort(function(a,b){var p=a.date||a.month,q=b.date||b.month;return p<q?-1:p>q?1:0});
    var d={title:r[0].desc.replace(/\s*\d+\/\d+$/,""),dn:r[0].dn||0,n:r.length,np:0,tot:0,pd:0,rs:0,late:0,proofs:0,cat:"",note:"",day:r[0].date?+r[0].date.slice(8,10):0,next:null,parcels:[]};
    r.forEach(function(y){
      d.tot+=y.amount;d.pd+=got(y);d.rs+=rem(y);if(y.paid)d.np++;if(rem(y)>0&&!d.next)d.next=y;
      if(!d.cat&&y.cat)d.cat=y.cat;if(!d.note&&y.note)d.note=y.note;
      var late=rem(y)>0&&(y.date||y.month+"-31")<td;if(late)d.late++;d.proofs+=pfs(y).length;
      var m=y.desc.match(/(\d+\/\d+)$/);
      d.parcels.push({lbl:m?m[1]:"Única",amount:y.amount,paid:!!y.paid,part:(!y.paid&&got(y)>0)?got(y):0,when:y.paid&&y.paidAt?fdate(y.paidAt):"",due:y.date?fdate(y.date):monthName(y.month),late:late,proof:pfs(y).length,dk:y.date||y.month+"-01"});
    });
    d.nextDue=d.next?(d.next.date?fdate(d.next.date):monthName(d.next.month)):"";
    d.pct=d.tot?Math.round(d.pd/d.tot*100):0;
    d.meta=[d.cat?"Origem: "+d.cat:"",d.day?"vence todo dia "+d.day:"",d.note?"Obs.: "+d.note:""].filter(Boolean).join(" · ");
    debts.push(d);
  });
  var nd=debts.length,ids={};
  items.filter(function(x){return x.who===w&&(!want||keyOf(x)===want)}).forEach(function(x){ids[x.id]=1});
  var pyl=pays.filter(function(p){return p.who===w&&(!want||(p.alloc||[]).some(function(a){return ids[a.id]}))}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0}).map(function(p){
    var am=want?round2((p.alloc||[]).reduce(function(t,a){return t+(ids[a.id]?a.amt:0)},0)):p.amount;
    return {date:fdate(p.date),method:p.method,amount:am,note:p.note||"",nc:(p.proofs||[]).length};
  });
  if(join&&debts.length>1){
    var m={title:"Todas as dívidas ("+nd+")",n:0,np:0,tot:0,pd:0,rs:0,late:0,proofs:0,cat:"",note:"",day:0,wide:true,parcels:[],meta:"Dívidas: "+debts.map(function(d){return d.title}).join(" · ")};
    debts.forEach(function(d){m.n+=d.n;m.np+=d.np;m.tot+=d.tot;m.pd+=d.pd;m.rs+=d.rs;m.late+=d.late;m.proofs+=d.proofs;d.parcels.forEach(function(p){m.parcels.push(Object.assign({},p,{lbl:d.title+" "+p.lbl}))})});
    m.parcels.sort(function(a,b){return a.dk<b.dk?-1:a.dk>b.dk?1:0});
    var nx=m.parcels.filter(function(p){return !p.paid})[0];
    m.nextDue=nx?nx.due:"";m.pct=m.tot?Math.round(m.pd/m.tot*100):0;
    debts=[m];
  }
  var tk=0,tr=0,pp=0,pt=0,lt=0;debts.forEach(function(d){tk+=d.pd;tr+=d.rs;pp+=d.np;pt+=d.n;lt+=d.late});
  var n=new Date();
  return {name:w,code:cd(w),pays:pyl,nd:nd,debts:debts,tk:tk,tr:tr,pp:pp,pt:pt,late:lt,date:n.toLocaleDateString("pt-BR"),no:n.getFullYear()+pad(n.getMonth()+1)+pad(n.getDate())+"-"+pad(n.getHours())+pad(n.getMinutes())};
}
function pStat(p){return p.paid?(p.when?"pago em "+p.when:"pago")+(p.proof?" · "+p.proof+" comprovante"+(p.proof>1?"s":""):""):p.late?"ATRASADA":(p.part?"parcial "+brl(p.part)+" · ":"")+"pendente"}
function dtl(d){return d.title+(d.dn?" · Nº "+d.dn:"")}
function recSum(R){var nd=R.nd||R.debts.length;return nd+" dívida"+(nd>1?"s":"")+" · "+R.pp+" de "+R.pt+" parcelas pagas"+(R.late?" · "+R.late+" atrasada"+(R.late>1?"s":""):"")}
function recText(R){
  var t="RECIBO · Quem Me Deve\nNº "+R.no+"\nCliente: "+R.name+(R.code?" ("+R.code+")":"")+"\nEmitido em "+R.date+"\nResumo: "+recSum(R)+"\n";
  R.debts.forEach(function(d,i){
    t+="\n"+(R.debts.length>1?"DÍVIDA "+(i+1)+" · ":"")+dtl(d).toUpperCase()+"\n"+(d.meta?d.meta+"\n":"")+
    "Valor total: "+brl(d.tot)+(d.n>1?" em "+d.n+" parcelas":" (à vista)")+"\nJá pago: "+brl(d.pd)+" ("+d.pct+"%) · Falta: "+brl(d.rs)+"\n"+
    "Parcelas pagas: "+d.np+" de "+d.n+" · pendentes: "+(d.n-d.np)+(d.late?" · atrasadas: "+d.late:"")+"\n";
    d.parcels.forEach(function(p){t+=(p.paid?"✓ ":p.late?"! ":"• ")+p.lbl+" · vence "+p.due+" · "+brl(p.amount)+" · "+pStat(p)+"\n"});
    t+=d.nextDue?"Próximo vencimento: "+d.nextDue+"\n":"Dívida quitada ✓\n";
  });
  if(R.pays.length){t+="\nPAGAMENTOS RECEBIDOS\n";R.pays.forEach(function(p){t+=p.date+" · "+p.method+" · "+brl(p.amount)+(p.nc?" · "+p.nc+" comprovante"+(p.nc>1?"s":""):"")+(p.note?" · "+p.note:"")+"\n"})}
  return t+"\nTOTAL PAGO: "+brl(R.tk)+"\nFALTA PAGAR: "+brl(R.tr)+"\n\nObrigado!";
}
function recHTML(R){
  return '<div class="rc-h"><img src="logo.png" alt=""><div><h2>Recibo</h2><div class="s">Quem Me Deve · Nº '+R.no+'</div><div class="s">Emitido em '+R.date+'</div></div></div>'+
  '<div class="rc-cl"><span class="s">Cliente</span><b>'+esc(R.name)+(R.code?' <span class="cd">'+esc(R.code)+'</span>':"")+'</b></div>'+
  '<div class="rc-sum"><span>'+(R.nd||R.debts.length)+' dívida'+((R.nd||R.debts.length)>1?"s":"")+'</span><span>'+R.pp+' de '+R.pt+' parcelas pagas</span>'+(R.late?'<span class="late">'+R.late+' atrasada'+(R.late>1?"s":"")+'</span>':"")+'</div>'+
  R.debts.map(function(d,i){
    return '<div class="rc-debt"><div class="rc-dt"><b>'+(R.debts.length>1?"Dívida "+(i+1)+" · ":"")+esc(dtl(d))+'</b><span class="s">'+d.np+' de '+d.n+' parcela(s) paga(s)</span></div>'+
    (d.meta?'<div class="rc-meta">'+esc(d.meta)+'</div>':"")+'<div class="pb"><i style="width:'+d.pct+'%"></i></div>'+
    '<div class="rc-stats"><div><small>Total</small><b>'+brl(d.tot)+'</b></div><div class="ok"><small>Já pago ('+d.pct+'%)</small><b>'+brl(d.pd)+'</b></div><div class="pe"><small>Falta</small><b>'+brl(d.rs)+'</b></div></div>'+
    d.parcels.map(function(p){return '<div class="rc-p'+(p.paid?" ok":p.late?" late":"")+(d.wide?" wide":"")+'"><span>'+(p.paid?"✓":p.late?"!":"•")+" "+p.lbl+'</span><span class="s">vence '+p.due+' · '+(p.late?'<span class="lt">ATRASADA</span>':esc(pStat(p)))+'</span><b>'+brl(p.amount)+'</b></div>'}).join("")+
    (d.nextDue?'<div class="s" style="margin-top:10px">Próximo vencimento: <b>'+d.nextDue+'</b></div>':'<div class="rc-q">Dívida quitada ✓</div>')+'</div>';
  }).join("")+
  (R.pays.length?'<div class="rc-pays"><div class="xs">Pagamentos recebidos</div>'+R.pays.map(function(p){return '<div class="rc-p ok"><span>'+p.date+'</span><span class="s">'+esc(p.method)+(p.nc?' · '+p.nc+' comprovante'+(p.nc>1?'s':''):'')+(p.note?' · '+esc(p.note):'')+'</span><b>'+brl(p.amount)+'</b></div>'}).join('')+'</div>':'')+'<div class="rc-t"><div><small>Total pago</small><b>'+brl(R.tk)+'</b></div><div><small>Falta pagar</small><b>'+brl(R.tr)+'</b></div></div>'+
  '<p class="s" style="text-align:center;margin:12px 0 0">Este recibo confirma os pagamentos registrados até '+R.date+'. Obrigado!</p>';
}
var recW="",recId;
function recShow(){recCur=recData(recW,recId,$("rc_j").checked&&!recId);$("rc_b").innerHTML=recHTML(recCur)}
function openRecibo(w,id){
  var base=recData(w,id);
  if(!base.debts.length){toast("Nada para o recibo.");return}
  recW=w;recId=id;$("rc_jw").hidden=!(base.debts.length>1&&!id);$("rc_j").checked=joined;
  recShow();$("recd").showModal();
}
$("rc_j").addEventListener("change",function(){recShow();snd("tap")});
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
    var W=800,P=34,LH=30,x0=P+22,xr=W-P-22,H=300;
    R.debts.forEach(function(d){H+=192+d.parcels.length*LH+44+18});
    H+=110+70+(R.pays.length?44+R.pays.length*LH:0);
    var cv=document.createElement("canvas"),sc=Math.max(.6,Math.min(2,Math.sqrt(12e6/(W*H))));cv.width=Math.round(W*sc);cv.height=Math.round(H*sc);
    var g=cv.getContext("2d");g.scale(sc,sc);
    var fit=function(t,mw){while(g.measureText(t).width>mw&&t.length>4)t=t.slice(0,-2);return t};
    g.fillStyle="#fff";g.fillRect(0,0,W,H);
    var gr=g.createLinearGradient(0,0,W,150);gr.addColorStop(0,"#071f6e");gr.addColorStop(1,"#1d6bff");g.fillStyle=gr;g.fillRect(0,0,W,150);
    if(ok)g.drawImage(lg,P,24,102,102);
    g.textAlign="left";g.fillStyle="#ffd21f";g.font="800 38px system-ui,sans-serif";g.fillText("RECIBO",P+120,70);
    g.fillStyle="#fff";g.font="600 16px system-ui,sans-serif";g.fillText("Quem Me Deve",P+120,98);
    g.textAlign="right";g.font="14px system-ui,sans-serif";g.fillText("Nº "+R.no,W-P,62);g.fillText("Emitido em "+R.date,W-P,86);
    g.textAlign="left";g.fillStyle="#6a79a8";g.font="700 12px system-ui,sans-serif";g.fillText("CLIENTE",P,184);
    g.fillStyle="#0a1a45";g.font="800 28px system-ui,sans-serif";g.fillText(R.name+(R.code?"   ·   "+R.code:""),P,214);
    g.fillStyle=R.late?"#c62828":"#6a79a8";g.font="700 14px system-ui,sans-serif";g.fillText(recSum(R),P,242);
    var y=268;
    R.debts.forEach(function(d,di){
      var bh=192+d.parcels.length*LH+44;
      g.strokeStyle="#cfdaf7";g.lineWidth=1.5;g.setLineDash([6,5]);rr(g,P,y,W-2*P,bh,18);g.stroke();g.setLineDash([]);
      g.textAlign="left";g.fillStyle="#0a1a45";g.font="800 20px system-ui,sans-serif";g.fillText(fit((R.debts.length>1?"Dívida "+(di+1)+" · ":"")+dtl(d),xr-x0-170),x0,y+36);
      g.textAlign="right";g.fillStyle="#6a79a8";g.font="600 14px system-ui,sans-serif";g.fillText(d.np+" de "+d.n+" parcela(s) paga(s)",xr,y+36);
      g.fillStyle="#e3eaff";rr(g,x0,y+50,xr-x0,8,4);g.fill();
      if(d.pct>0){g.fillStyle="#16a34a";rr(g,x0,y+50,Math.max(8,(xr-x0)*d.pct/100),8,4);g.fill()}
      var bw=(xr-x0-30)/4,st=[["TOTAL",brl(d.tot),"#0a1a45"],["JÁ PAGO ("+d.pct+"%)",brl(d.pd),"#15803d"],["FALTA",brl(d.rs),"#b45309"],["PARCELAS",d.np+" de "+d.n,"#0a1a45"]];
      st.forEach(function(q,i){var bx=x0+i*(bw+10);g.fillStyle="#f1f5ff";rr(g,bx,y+72,bw,58,12);g.fill();g.textAlign="center";g.fillStyle="#6a79a8";g.font="700 10px system-ui,sans-serif";g.fillText(q[0],bx+bw/2,y+92);g.fillStyle=q[2];g.font="800 16px system-ui,sans-serif";g.fillText(q[1],bx+bw/2,y+115)});
      g.textAlign="left";g.fillStyle="#6a79a8";g.font="600 13px system-ui,sans-serif";g.fillText(fit(d.meta||"—",xr-x0),x0,y+156);
      g.fillStyle="#e3eaff";g.fillRect(x0,y+168,xr-x0,1.5);
      d.parcels.forEach(function(p,i){
        var py=y+196+i*LH,o1=d.wide?200:78,o2=d.wide?330:240;
        g.textAlign="left";g.font="700 15px system-ui,sans-serif";g.fillStyle=p.paid?"#15803d":p.late?"#c62828":"#0a1a45";g.fillText(d.wide?fit((p.paid?"✓ ":p.late?"! ":"• ")+p.lbl,o1-14):(p.paid?"✓ ":p.late?"! ":"• ")+p.lbl,x0,py);
        g.font="14px system-ui,sans-serif";g.fillStyle="#6a79a8";g.fillText("vence "+p.due,x0+o1,py);
        g.font=p.late?"800 13px system-ui,sans-serif":"13px system-ui,sans-serif";g.fillStyle=p.paid?"#15803d":p.late?"#c62828":"#6a79a8";g.fillText(fit(pStat(p),xr-x0-o2-110),x0+o2,py);
        g.textAlign="right";g.font="700 15px system-ui,sans-serif";g.fillStyle="#0a1a45";g.fillText(brl(p.amount),xr,py);
      });
      var ly=y+196+d.parcels.length*LH+12;
      g.textAlign="left";g.font="700 14px system-ui,sans-serif";
      if(d.nextDue){g.fillStyle="#6a79a8";g.fillText("Próximo vencimento: "+d.nextDue,x0,ly)}else{g.fillStyle="#15803d";g.fillText("Dívida quitada ✓",x0,ly)}
      y+=bh+18;
    });
    if(R.pays.length){
      g.textAlign="left";g.fillStyle="#6a79a8";g.font="700 12px system-ui,sans-serif";g.fillText("PAGAMENTOS RECEBIDOS",x0,y+16);y+=28;
      R.pays.forEach(function(p){
        g.textAlign="left";g.font="14px system-ui,sans-serif";g.fillStyle="#0a1a45";
        g.fillText(fit(p.date+" · "+p.method+(p.nc?" · "+p.nc+" comprovante"+(p.nc>1?"s":""):"")+(p.note?" · "+p.note:""),xr-x0-130),x0,y+10);
        g.textAlign="right";g.font="700 15px system-ui,sans-serif";g.fillText(brl(p.amount),xr,y+10);y+=LH;
      });
      y+=16;
    }
    var yg=g.createLinearGradient(P,y,W-P,y+90);yg.addColorStop(0,"#ffd21f");yg.addColorStop(1,"#ffb300");g.fillStyle=yg;rr(g,P,y,W-2*P,90,20);g.fill();
    g.fillStyle="#0a1a45";g.textAlign="left";g.font="800 11px system-ui,sans-serif";g.fillText("TOTAL PAGO",x0,y+30);g.font="800 28px system-ui,sans-serif";g.fillText(brl(R.tk),x0,y+66);
    g.textAlign="right";g.font="800 11px system-ui,sans-serif";g.fillText("FALTA PAGAR",xr,y+30);g.font="800 28px system-ui,sans-serif";g.fillText(brl(R.tr),xr,y+66);
    g.textAlign="center";g.fillStyle="#6a79a8";g.font="12px system-ui,sans-serif";g.fillText("Este recibo confirma os pagamentos registrados até "+R.date+". Obrigado!",W/2,y+90+36);
    var cb=function(b){
      if(!b){if(ok){draw(false);return}toast("Não consegui gerar a imagem do recibo. Use Imprimir / PDF.");return}
      var f=new File([b],"recibo-"+R.name.replace(/\s+/g,"-")+".png",{type:"image/png"});
      var dg=$("recimg");
      if(!dg){
        dg=document.createElement("dialog");dg.id="recimg";
        dg.innerHTML='<div style="display:grid;gap:12px;max-width:min(560px,92vw);padding:4px"><img id="recimg_i" alt="Recibo" style="width:100%;height:auto;border-radius:12px;background:#fff"><p class="s" style="margin:0;text-align:center">Toque e segure na imagem para salvar ou compartilhar.</p><div class="fg"><a class="add" id="recimg_d" style="text-align:center;text-decoration:none;padding:12px">Baixar</a><button class="sec" type="button" id="recimg_s">Compartilhar</button></div><button class="sec" type="button" id="recimg_x">Fechar</button></div>';
        document.body.appendChild(dg);
        $("recimg_x").addEventListener("click",function(){closeDlg(dg)});
        dg.addEventListener("click",function(e){if(e.target===dg)closeDlg(dg)});
      }
      if(dg._u)URL.revokeObjectURL(dg._u);
      dg._u=URL.createObjectURL(b);dg._f=f;
      $("recimg_i").src=dg._u;$("recimg_d").href=dg._u;$("recimg_d").download=f.name;
      $("recimg_s").hidden=!(navigator.canShare&&navigator.canShare({files:[f]}));
      $("recimg_s").onclick=function(){navigator.share({files:[dg._f]}).catch(function(){})};
      if(!dg.open)dg.showModal();snd("ok");
    };
    try{cv.toBlob(cb,"image/png")}catch(e){if(ok)draw(false);else toast("Não consegui gerar a imagem do recibo. Use Imprimir / PDF.")}
  }
});

/* ---------- juntar dívidas por pessoa ---------- */
var joined=LS.get("dv-join")==="1",openJ={};
function jsegApply(){document.querySelectorAll("#jseg button").forEach(function(b){b.classList.toggle("on",(b.dataset.j==="1")===joined)})}
document.querySelectorAll("#jseg button").forEach(function(b){b.addEventListener("click",function(){
  joined=b.dataset.j==="1";LS.set("dv-join",joined?"1":"0");jsegApply();snd("tap");render();
  toast(joined?"Dívidas juntas: uma linha por pessoa.":"Dívidas separadas: uma linha por dívida.");
})});
jsegApply();

/* ---------- visão em tabela ---------- */
var view=LS.get("dv-view")==="cards"?"cards":"table";
function vwBtn(){$("vw").textContent=view==="table"?"☰ Cards":"▦ Tabela"}
vwBtn();
$("vw").addEventListener("click",function(){view=view==="table"?"cards":"table";LS.set("dv-view",view);vwBtn();snd("tap");render()});
var IC_E='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
var IC_G='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
var IC_W='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2-5.5A8.4 8.4 0 1 1 21 11.5z"/></svg>';
var IC_D='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
var IC_P='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
var IC_R='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
var IC_N='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
function tableJoined(v){
  var by={},td=today();
  v.forEach(function(x){
    var p=by[x.who]=by[x.who]||{who:x.who,keys:{},names:[],n:0,np:0,tot:0,pd:0,rs:0,nx:null,late:false};
    var s=sib(x.id),k=s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id;
    if(!p.keys[k]){p.keys[k]=1;p.names.push(x.desc.replace(/\s*\d+\/\d+$/,""))}
    p.n++;p.tot+=x.amount;p.pd+=got(x);p.rs+=rem(x);if(x.paid)p.np++;
    if(rem(x)>0){var dk=x.date||x.month+"-01";if(!p.nx||dk<p.nx.k)p.nx={k:dk,x:x};if((x.date||x.month+"-31")<td)p.late=true}
  });
  var ps=Object.keys(by).sort(function(a,b){return a.localeCompare(b)});
  if(!ps.length)return '<div class="empty">Nenhuma dívida encontrada. Use o botão verde para adicionar ou ajuste os filtros.</div>';
  var T=0,P=0,R=0;
  var rows=ps.map(function(k,i){
    var p=by[k],nm=Object.keys(p.keys).length;T+=p.tot;P+=p.pd;R+=p.rs;
    var e=encodeURIComponent(p.who),x=p.nx&&p.nx.x,due=x?(x.date?fdate(x.date):monthName(x.month)):'<span class="q">Quitado</span>';
    var st=p.rs<=0?['st-ok','Quitado']:p.late?['st-late','Atrasado']:p.pd>0?['st-ok','Em dia']:['st-pe','Pendente'];
    var nms=p.names.slice(0,3).join(", ")+(p.names.length>3?" +"+(p.names.length-3):"");
    return '<tr class="gr" data-gj="'+e+'" title="Ver extrato" style="animation-delay:'+Math.min(i,10)*40+'ms"><td class="n">'+av(p.who)+'<span class="nm">'+esc(p.who)+cdh(p.who)+pobh(p.who)+'</span></td><td class="dsc"><b>'+nm+' dívida'+(nm>1?"s":"")+'</b><small title="'+esc(p.names.join(", "))+'">'+esc(nms)+'</small></td><td class="v">'+brl(p.tot)+'</td><td class="num">'+p.n+'x<small>'+p.np+(p.np===1?" paga":" pagas")+'</small></td><td class="num">'+brl(p.pd)+'</td><td class="r'+(p.rs<=0?" z":"")+'">'+brl(p.rs)+'</td><td class="num">'+due+'</td><td><span class="st '+st[0]+'">'+st[1]+'</span></td><td class="ac">'+
      '<button class="ab ab-p" data-pay="'+e+'" title="Registrar pagamento (Pix, dinheiro...)" aria-label="Registrar pagamento">'+IC_P+'</button><button class="ab ab-g" data-r="'+e+'" title="Pessoa: total, foto e telefone" aria-label="Configurações da pessoa">'+IC_G+'</button>'+
      '<button class="ab ab-w" data-w="'+e+'" title="Cobrar no WhatsApp" aria-label="Cobrar no WhatsApp">'+IC_W+'</button>'+
      '<button class="ab ab-r" data-rb="'+e+'" title="Recibo com todas as dívidas" aria-label="Recibo">'+IC_R+'</button>'+
      '<button class="ab ab-n" data-nd="'+e+'" title="Nova dívida para esta pessoa" aria-label="Nova dívida">'+IC_N+'</button></td></tr>';
  }).join("");
  return '<div class="tw"><table><thead><tr><th>Nome</th><th>Dívidas</th><th>Valor Total</th><th>Parcelas</th><th>Já Pago</th><th>Restante</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td colspan="2">Total · '+ps.length+' pessoa(s)</td><td>'+brl(T)+'</td><td></td><td>'+brl(P)+'</td><td>'+brl(R)+'</td><td colspan="3"></td></tr></tfoot></table></div>';
}
function tableHTML(v){
  if(joined)return tableJoined(v);
  var seen={},gs=[],td=today();
  v.forEach(function(x){
    var s=sib(x.id),k=s.length?x.id.slice(0,x.id.lastIndexOf("_")+1):x.id;
    if(seen[k])return;seen[k]=1;
    var r=s.length?s:[x],o={id:x.id,kk:k,dn:(r[0]||x).dn||0,note:(r.filter(function(y){return y.note})[0]||{}).note||"",who:x.who,desc:r[0].desc.replace(/\s*\d+\/\d+$/,""),n:r.length,tot:0,pd:0,rs:0,np:0,nx:null};
    r.forEach(function(y){o.tot+=y.amount;o.pd+=got(y);o.rs+=rem(y);if(y.paid)o.np++;if(rem(y)>0&&!o.nx)o.nx=y});
    o.key=o.nx?(o.nx.date||o.nx.month+"-01"):"9999";
    gs.push(o);
  });
  if(!gs.length)return '<div class="empty">Nenhuma dívida encontrada. Use o botão verde para adicionar ou ajuste os filtros.</div>';
  gs.sort(function(a,b){return a.who.localeCompare(b.who)||(a.key<b.key?-1:a.key>b.key?1:0)});
  var T=0,P=0,R=0;
  var rows=gs.map(function(o,i){
    T+=o.tot;P+=o.pd;R+=o.rs;
    var due=o.nx?(o.nx.date?fdate(o.nx.date):monthName(o.nx.month)):'<span class="q">Quitado</span>';
    var sub=o.n>1?'<small>'+o.np+(o.np===1?" paga":" pagas")+'</small>':(o.np?'<small>paga</small>':"");
    var late=o.nx&&(o.nx.date||o.nx.month+"-31")<td;
    var st=o.rs<=0?['st-ok','Quitado']:late?['st-late','Atrasado']:o.pd>0?['st-ok','Em dia']:['st-pe','Pendente'];
    var multi=o.n>1;
    return '<tr class="gr" data-g="'+o.id+'" title="Ver parcelas" style="animation-delay:'+Math.min(i,10)*40+'ms"><td class="n">'+av(o.who)+'<span class="nm">'+esc(o.who)+cdh(o.who)+pobh(o.who)+'</span></td><td>'+esc(o.desc)+(o.dn||o.note?'<small title="'+esc(o.note||"").replace(/"/g,"&quot;")+'">'+(o.dn?'Nº '+o.dn:"")+(o.dn&&o.note?" · ":"")+esc(o.note||"")+'</small>':"")+'</td><td class="v">'+brl(o.tot)+'</td><td class="num">'+o.n+'x'+sub+'</td><td class="num">'+brl(o.pd)+'</td><td class="r'+(o.rs<=0?" z":"")+'">'+brl(o.rs)+'</td><td class="num">'+due+'</td><td><span class="st '+st[0]+'">'+st[1]+'</span></td><td class="ac"><button class="ab ab-p" data-pay="'+encodeURIComponent(o.who)+'" data-pk="'+o.kk+'" title="Registrar pagamento (Pix, dinheiro...)" aria-label="Registrar pagamento">'+IC_P+'</button><button class="ab ab-g" data-r="'+encodeURIComponent(o.who)+'" title="Pessoa: total, foto, telefone, extrato e recibo" aria-label="Configurações da pessoa">'+IC_G+'</button><button class="ab ab-w" data-w="'+encodeURIComponent(o.who)+'" title="Cobrar no WhatsApp" aria-label="Cobrar no WhatsApp">'+IC_W+'</button><button class="ab ab-e" '+(multi?'data-gd':'data-e')+'="'+o.id+'" title="Editar" aria-label="Editar">'+IC_E+'</button><button class="ab ab-d" '+(multi?'data-dd':'data-d')+'="'+o.id+'" title="Apagar" aria-label="Apagar">'+IC_D+'</button></td></tr>';
  }).join("");
  return '<div class="tw"><table><thead><tr><th>Nome</th><th>Descrição</th><th>Valor Total</th><th>Parcelas</th><th>Já Pago</th><th>Restante</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td colspan="2">Total · '+gs.length+' dívida(s)</td><td>'+brl(T)+'</td><td></td><td>'+brl(P)+'</td><td>'+brl(R)+'</td><td colspan="3"></td></tr></tfoot></table></div>';
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
  p.forEach(function(x){put(Object.assign({},x,{paid:true,got:x.amount,paidAt:today(),paidTm:nowTm()}))});
  snd("ok");fxBurst();toast(p.length+" dívida(s) pagas.",function(){p.forEach(function(x){put(x)})});selEnd();render();
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
  r.ok.forEach(function(o,i){var id=uid+"_"+i;ids.push(id);put(Object.assign({id:id,dn:nextDn(),got:o.paid?o.amount:0,ts:Date.now()+i},o))});
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
  sndBtn();themeBtn();pinBtn();$("cfg_day").value=dayDef();cfgFill();
  $("i_hint").textContent=standalone?"Você já está usando o app instalado.":"Instala o site como app, com ícone e tela cheia no celular. Precisa estar hospedado em https.";
  snd("tap");$("cd").showModal();
});
(async function(){if(!LS.get("dv-pin")){LS.set("dv-pin",await hash("1234"));LS.set("dv-pinlen","4")}})();

window.addEventListener("error",function(e){toast("Erro: "+e.message)});


/* ---------- acesso do devedor, Pix e configurações ---------- */
function lsj(k,d){try{var v=JSON.parse(LS.get(k)||"null");return v==null?d:v}catch(e){return d}}
function waMine(){return LS.get("dv-wa")||"88982293900"}
function pixList(){return lsj("dv-pix",[])}
function pixSave(a){LS.set("dv-pix",JSON.stringify(a))}
function copyTxt(t,msg){
  function fb(){var a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;top:0;left:0;opacity:0;font-size:16px";a.setAttribute("readonly","");document.body.appendChild(a);a.focus();a.select();a.setSelectionRange(0,a.value.length);var ok=false;try{ok=document.execCommand("copy")}catch(e){}a.remove();toast(ok?msg:"Não consegui copiar. Copie manualmente.")}
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(function(){toast(msg)},fb);else fb();
}
$("cfg_close").addEventListener("change",function(){var n=Math.max(1,Math.min(31,parseInt($("cfg_close").value)||10));$("cfg_close").value=n;LS.set("dv-close",String(n));toast("Cartão fecha dia "+n+".")});
$("cfg_wa").addEventListener("change",function(){LS.set("dv-wa",$("cfg_wa").value.replace(/\D/g,""));toast("WhatsApp salvo.")});
function cfgFill(){$("cfg_close").value=closeDef();$("cfg_wa").value=waMine();pxDraw()}
/* chaves Pix */
function pxDraw(){
  var a=pixList();
  $("pix_l").innerHTML=a.length?a.map(function(k,i){return '<div class="cr"><span><b>'+esc(k.type)+(i===0?" · principal":"")+'</b><br><small class="s">'+esc(k.key)+(k.name?" · "+esc(k.name):"")+(k.bank?" · "+esc(k.bank):"")+'</small></span><span><button class="sec" type="button" data-pe="'+i+'">Editar</button> '+(i>0?'<button class="sec" type="button" data-pm="'+i+'">★</button> ':"")+'<button class="sec" type="button" data-pd="'+i+'">✕</button></span></div>'}).join(""):'<p class="s">Nenhuma chave cadastrada ainda.</p>';
}
function pxClear(){["px_k","px_n","px_b","px_c"].forEach(function(i){$(i).value=""});$("px_id").value="";$("px_t").selectedIndex=0}
$("px_x").addEventListener("click",pxClear);
$("px_s").addEventListener("click",function(){
  var k=$("px_k").value.trim();if(!k){toast("Digite a chave Pix.");return}
  var a=pixList(),o={type:$("px_t").value,key:k,name:$("px_n").value.trim(),bank:$("px_b").value.trim(),city:$("px_c").value.trim()},ix=$("px_id").value;
  if(ix!==""&&a[+ix])a[+ix]=o;else a.push(o);
  pixSave(a);pxClear();pxDraw();snd("ok");toast("Chave Pix salva. Atualize os acessos para o devedor ver.");
});
$("pix_l").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;var a=pixList();
  if(b.dataset.pe!=null){var k=a[+b.dataset.pe];$("px_t").value=k.type;$("px_k").value=k.key;$("px_n").value=k.name||"";$("px_b").value=k.bank||"";$("px_c").value=k.city||"";$("px_id").value=b.dataset.pe}
  else if(b.dataset.pm!=null){var m=a.splice(+b.dataset.pm,1)[0];a.unshift(m);pixSave(a);pxDraw()}
  else if(b.dataset.pd!=null){if(!confirm("Remover esta chave Pix?"))return;a.splice(+b.dataset.pd,1);pixSave(a);pxDraw()}
});
/* dados que o devedor enxerga */
function accCode(w){
  var c=cd(w);if(c)return c;
  var mx=0;Object.keys(people).forEach(function(n){var m=/^C?(\d+)$/i.exec(people[n].code||"");if(m)mx=Math.max(mx,+m[1])});
  c="C"+String(mx+1).padStart(3,"0");var p=people[w]||{};
  putPerson(w,{phone:p.phone,photo:p.photo,code:c,obs:p.obs});return c;
}
function buildData(w){
  var G={},order=[];
  items.filter(function(x){return x.who===w}).forEach(function(x){var k=keyOfX(x);if(!G[k]){G[k]=[];order.push(k)}G[k].push(x)});
  var debts=order.map(function(k){
    var l=G[k].slice().sort(function(a,b){var p=a.date||a.month+"-01",q=b.date||b.month+"-01";return p<q?-1:p>q?1:a.id<b.id?-1:1}),f=l[0];
    return {name:f.desc.replace(/\s*\d+\/\d+$/,""),cat:f.cat||"",dn:f.dn||"",note:f.note||"",parcels:l.map(function(x,i){
      var m=/(\d+\/\d+)$/.exec(x.desc);
      return {n:m?m[1]:(l.length>1?(i+1)+"/"+l.length:"Única"),amount:x.amount,due:x.date||"",month:x.month,paid:!!x.paid,got:x.got||0,at:x.paidAt||"",tm:x.paidTm||""};
    })};
  });
  var py=pays.filter(function(p){return p.who===w}).map(function(p){return {date:p.date,tm:p.tm||"",method:p.method||"",label:p.note||"",amount:p.amount}});
  var pix=pixList().map(function(k,i){return {type:k.type,key:k.key,name:k.name,bank:k.bank,city:k.city,main:i===0}});
  return {person:{name:w,code:accCode(w)},cfg:{wa:waMine(),pix:pix},debts:debts,pays:py,gen:new Date().toISOString()};
}
function accPw(){return lsj("dv-accpw",{})}
function accTk(){return lsj("dv-acctk",{})}
function noCrypto(){if(!(window.crypto&&crypto.subtle)){toast("Para criar o acesso, abra o site em https (hospedado) ou em localhost.");return true}return false}
var accBusy=null;
async function accMake(w,pw,force){
  var d=buildData(w),code=d.person.code,sig=pw+"|"+JSON.stringify({p:d.person,c:d.cfg,d:d.debts,y:d.pays});
  var C=accTk()[code],S=lsj("dv-accsig",{});
  if(!force&&C&&S[code]===sig&&accPw()[code]===pw)return {code:code,token:C,cached:true};
  var t=await QM.seal(d,pw,code);S[code]=sig;LS.set("dv-accsig",JSON.stringify(S));
  var P=accPw(),T=accTk();P[code]=pw;T[code]=t;LS.set("dv-accpw",JSON.stringify(P));LS.set("dv-acctk",JSON.stringify(T));
  return {code:code,token:t};
}
function accLink(code,t){return location.href.replace(/[#?].*$/,"").replace(/[^\/]*$/,"")+"devedor.html#a="+code+"."+t}
function accFill(w){
  var c=cd(w),P=accPw();
  $("p_aid").textContent=c||"(será criado ao salvar o acesso)";
  $("p_pwd").value=c&&P[c]?P[c]:"";$("p_pwd").type="text";$("p_sh").textContent="🙈 Ocultar senha";
  $("p_am").textContent=c&&accTk()[c]?"Acesso criado. Use ‘Criar / atualizar acesso’ sempre que mudar dívidas ou pagamentos.":"Ainda sem acesso.";
}
$("p_cp").addEventListener("click",function(){var v=$("p_pwd").value;if(!v){toast("Ainda não tem senha. Digite ou gere uma.");return}copyTxt(v,"Senha copiada!")});
$("p_sh").addEventListener("click",function(){var i=$("p_pwd"),h=i.type==="password";i.type=h?"text":"password";$("p_sh").textContent=h?"🙈 Ocultar senha":"👁 Mostrar senha"});
$("p_pg").addEventListener("click",function(){$("p_pwd").value=QM.genPass(6);snd("tap");toast("Senha gerada. Toque em ‘Criar / atualizar acesso’.")});
$("p_ac").addEventListener("click",async function(){
  if(noCrypto())return;
  var w=editName,pw=$("p_pwd").value.trim();
  if(!pw){pw=QM.genPass(6);$("p_pwd").value=pw}
    try{var r=await accMake(w,pw);accFill(w);$("p_am").textContent="Acesso pronto. ID "+r.code+" · senha "+pw+". Agora copie o link ou baixe o acessos.json.";snd("ok");render()}catch(e){toast("Erro ao criar acesso: "+e.message)}
});
async function accEnsure(btn){
  var w=editName,pw=$("p_pwd").value.trim();
  if(noCrypto())return null;
  if(!pw){toast("Gere ou digite uma senha primeiro.");return null}
  if(accBusy)return null;
  var old=btn&&btn.textContent;accBusy=1;if(btn){btn.disabled=true;btn.textContent="⏳ Gerando…"}
  await new Promise(function(r){setTimeout(r,30)});
  try{var r=await accMake(w,pw);accFill(w);return {code:r.code,token:r.token,pw:pw}}catch(e){toast("Erro: "+e.message);return null}
  finally{accBusy=null;if(btn){btn.disabled=false;btn.textContent=old}}
}
function accText(r){var w=editName;return "Olá, "+w.split(" ")[0]+"! Seu acesso para ver suas dívidas:\n"+accLink(r.code,r.token)+"\n\nLogin (ID): "+r.code+"\nSenha: "+r.pw}
$("p_al").addEventListener("click",async function(){var r=await accEnsure(this);if(!r)return;copyTxt(accLink(r.code,r.token),"Link copiado! Passe também o ID e a senha.")});
$("p_aa").addEventListener("click",async function(){var r=await accEnsure(this);if(!r)return;copyTxt(accText(r),"Acesso copiado: link, login e senha!")});
$("p_aw").addEventListener("click",async function(){
  var r=await accEnsure(this);if(!r)return;var w=editName,num=waNum((people[w]||{}).phone);
  var msg="Olá, "+w.split(" ")[0]+"! Seu acesso para ver suas dívidas:\n"+accLink(r.code,r.token)+"\n\nID: "+r.code+"\nSenha: "+r.pw;
  snd("wa");window.open("https://wa.me/"+num+"?text="+encodeURIComponent(msg),"_blank","noopener");
  if(!num)toast("Sem telefone salvo: escolha o contato no WhatsApp.");
});
$("p_ar").addEventListener("click",async function(){
  if(noCrypto())return;
  var w=editName,pw=$("p_pwd").value.trim(),c=cd(w),old=c?accPw()[c]:"";
  if(!pw){toast("Digite a nova senha no campo acima e toque em Alterar senha.");$("p_pwd").focus();return}
  if(old&&pw===old){toast("Essa já é a senha atual do devedor.");return}
  try{
    var r=await accMake(w,pw);accFill(w);
    $("p_am").textContent="Senha alterada para: "+pw+" · ID "+r.code+". Baixe o acessos.json (ou envie o acesso) para valer para o devedor.";
    snd("ok");toast("Senha alterada.");
  }catch(e){toast("Não consegui alterar a senha: "+e.message)}
});
$("acc_all").addEventListener("click",async function(){
  if(noCrypto())return;
  var P=accPw(),out={},n=0;
  var names=Object.keys(people).filter(function(w){var c=cd(w);return c&&P[c]});
  for(var i=0;i<names.length;i++){var w=names[i];try{var r=await accMake(w,P[cd(w)]);out[r.code]=r.token;n++}catch(e){}}
  if(!n){toast("Nenhum devedor com acesso criado ainda.");return}
  var b=new Blob([JSON.stringify(out)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(b);a.download="acessos.json";document.body.appendChild(a);a.click();a.remove();
  snd("ok");toast("acessos.json com "+n+" devedor(es). Coloque na pasta do devedor.html.");
});

/* ---------- início ---------- */
loadLocal();purge();render();
$("mode").textContent="Salvo neste aparelho.";
(async function(){
  try{
    if(!window.claude)return;
    var user=await claude.use("user"),db=await claude.use("db");
    if(!db||!user)return;
    var id=await user.id();if(!id)return;
    var c=db.collection("data/users/"+id),mi=items.concat(bin),mp=Object.assign({},people),mpy=pays.slice();
    col=c;$("mode").textContent="Salvo na sua conta, só você vê.";
    c.onSnapshot(function(s){
      items=[];bin=[];people={};pays=[];
      s.docs.forEach(function(d){var o=d.data();if(o.type==="person")people[o.name]={phone:o.phone||"",photo:o.photo||"",code:o.code||"",obs:o.obs||""};else if(o.type==="pay")pays.push(Object.assign({id:d.id},o));else (o.deleted?bin:items).push(Object.assign({id:d.id},o))});
      purge();render();
    },function(){col=null;loadLocal();render();$("mode").textContent="Salvo neste aparelho."});
    if(mi.length||Object.keys(mp).length||mpy.length){
      mi.forEach(function(o){var b=Object.assign({},o);delete b.id;c.doc(o.id).set(b)});
      Object.keys(mp).forEach(function(n){putPerson(n,mp[n])});mpy.forEach(function(p){putPay(p)});
      LS.set(KEY,"");LS.set(PK,"");LS.set(PYK,"");
    }
  }catch(e){}
})();
})();
