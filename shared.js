/* ==========================================================
   Quem Me Deve · funções compartilhadas (admin.html e devedor.html)
   Criptografia do acesso do devedor (AES-GCM + senha), Pix copia e cola
   e pequenos formatadores.
   ========================================================== */
(function(){
"use strict";
var te=new TextEncoder(),td=new TextDecoder();
function b64u(buf){var b=new Uint8Array(buf),s="";for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function unb64u(t){t=String(t).replace(/-/g,"+").replace(/_/g,"/");while(t.length%4)t+="=";var s=atob(t),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
function normId(id){return String(id||"").trim().toUpperCase()}
async function deriveKey(pass,id,salt){
  var base=await crypto.subtle.importKey("raw",te.encode(normId(id)+"|"+String(pass)),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:150000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function zip(u8){
  if(typeof CompressionStream==="undefined")return null;
  try{return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer())}catch(e){return null}
}
async function unzip(u8){
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
}
/* seal: objeto + senha + ID -> texto (base64url) */
async function seal(obj,pass,id){
  var raw=te.encode(JSON.stringify(obj)),z=await zip(raw),flag=z&&z.length<raw.length?1:0,data=flag?z:raw;
  var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  var ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},await deriveKey(pass,id,salt),data));
  var out=new Uint8Array(2+16+12+ct.length);out[0]=1;out[1]=flag;out.set(salt,2);out.set(iv,18);out.set(ct,30);
  return b64u(out);
}
/* open: texto + senha + ID -> objeto (lança erro se a senha estiver errada) */
async function open(token,pass,id){
  var u=unb64u(token);if(u[0]!==1)throw new Error("versao");
  var salt=u.slice(2,18),iv=u.slice(18,30),ct=u.slice(30);
  var pt=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:iv},await deriveKey(pass,id,salt),ct));
  if(u[1])pt=await unzip(pt);
  return JSON.parse(td.decode(pt));
}
/* senha aleatória fácil de ler (sem 0/O/1/I/L) */
function genPass(n){var a="ABCDEFGHJKMNPQRSTUVWXYZ23456789",b=crypto.getRandomValues(new Uint8Array(n||8)),s="";for(var i=0;i<b.length;i++)s+=a[b[i]%a.length];return s}

/* ---------- Pix copia e cola ---------- */
function tlv(id,v){v=String(v);return id+("0"+v.length).slice(-2)+v}
function crc16(s){var c=0xFFFF;for(var i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(var j=0;j<8;j++)c=(c&0x8000)?((c<<1)^0x1021):(c<<1);c&=0xFFFF}return ("000"+c.toString(16).toUpperCase()).slice(-4)}
function ascii(s,n){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9 ]/g,"").toUpperCase().trim().slice(0,n)}
/* chave no formato exigido pelo Pix */
function pixKey(type,key){
  var k=String(key||"").trim();
  if(type==="Celular"){var d=k.replace(/\D/g,"");if(d.length<=11)d="55"+d;return "+"+d}
  if(type==="CPF"||type==="CNPJ")return k.replace(/\D/g,"");
  if(type==="E-mail")return k.toLowerCase();
  return k;
}
function pixPayload(o){
  var gui=tlv("00","br.gov.bcb.pix")+tlv("01",pixKey(o.type,o.key));
  var p=tlv("00","01")+tlv("01","11")+tlv("26",gui)+tlv("52","0000")+tlv("53","986")+(o.amount>0?tlv("54",(Math.round(o.amount*100)/100).toFixed(2)):"")+tlv("58","BR")+tlv("59",ascii(o.name,25)||"RECEBEDOR")+tlv("60",ascii(o.city,15)||"BRASIL")+tlv("62",tlv("05","***"))+"6304";
  return p+crc16(p);
}
function qrSvg(text,size){
  if(typeof qrcode!=="function")return "";
  var q=qrcode(0,"M");q.addData(text);q.make();
  var n=q.getModuleCount(),cell=Math.max(2,Math.floor((size||220)/(n+8))),m=cell*4,full=cell*n+m*2,p="";
  for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.isDark(r,c))p+="M"+(m+c*cell)+" "+(m+r*cell)+"h"+cell+"v"+cell+"h-"+cell+"z";
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+full+' '+full+'" width="'+(size||220)+'" height="'+(size||220)+'" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="'+p+'" fill="#000"/></svg>';
}
window.QM={seal:seal,open:open,genPass:genPass,pixPayload:pixPayload,pixKey:pixKey,qrSvg:qrSvg,normId:normId,crc16:crc16};
})();
