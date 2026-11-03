function billPlan(W){
var cs=cashOf(),As=W.map(function(w){return w.A}),S=0,pl,fail="";
W.forEach(function(w){S+=w.A});
if(!cs.any){var inf=z();D.forEach(function(d){inf[d]=1e9});pl={p:alloc(As,inf),s:null,base:null,k:0}}
else{pl=plan(As,cs.n);if(!pl.p)fail=cs.t<S?"Наличных "+fmt(cs.t)+" ₽ меньше, чем к выдаче "+fmt(S)+" ₽: не хватает "+fmt(S-cs.t)+" ₽.":"Не удалось подобрать раскладку имеющимися купюрами даже с разменом. Проверьте количество купюр."}
var T=z();W.forEach(function(w,i){w.c=pl.p?pl.p.c[i]:z();D.forEach(function(d){T[d]+=w.c[d]})});
var st=cs.any?(pl.p?pl.s:cs.n):T,L=z();D.forEach(function(d){L[d]=st[d]-T[d]});
return{W:W,cash:cs,nostock:!cs.any,fail:fail,st:st,L:L,T:T,S:S,n:pl.p?pl.p.n:0,base:pl.base,k:pl.k,ex:pl.p&&pl.k?exOf(cs.n,pl.s):null}}
function cashOf(sid){var c=cashBox(sid||draft().sid),o=z(),t=0,any=false;D.forEach(function(d){if(String(c[d]==null?"":c[d]).trim()!=="")any=true;o[d]=cnt(c[d]);t+=o[d]*d});return{n:o,t:t,any:any}}
function pick(a,s){var M={};
function f(i,rem){if(rem===0)return 0;if(i>=D.length)return Infinity;var key=i+"|"+rem;if(M[key])return M[key].v;var d=D[i],bv=Infinity,bk=0;
for(var k=Math.min(s[d],Math.floor(rem/d));k>=0;k--){var v=k+f(i+1,rem-k*d);if(v<bv){bv=v;bk=k}}M[key]={v:bv,k:bk};return bv}
if(f(0,a)===Infinity)return null;var c=z(),rem=a;for(var i=0;i<D.length&&rem>0;i++){var k=M[i+"|"+rem].k;c[D[i]]=k;rem-=k*D[i]}return c}
function alloc(As,s){var ix=As.map(function(a,i){return i}),best=null;
[function(x,y){return As[y]-As[x]},function(x,y){return As[y]%1000-As[x]%1000||As[y]-As[x]},function(x,y){return As[x]-As[y]}].forEach(function(cmp){
var L={},cs=[],n=0,ok=true;D.forEach(function(d){L[d]=s[d]});
ix.slice().sort(cmp).forEach(function(i){if(!ok)return;var c=pick(As[i],L);if(!c){ok=false;return}cs[i]=c;D.forEach(function(d){L[d]-=c[d];n+=c[d]})});
if(ok&&(!best||n<best.n))best={c:cs,n:n}});return best}
var PEN=3;
function gave(a,b){var k=0;D.forEach(function(d){if(a[d]>b[d])k+=a[d]-b[d]});return k}
function recv(cur,d,m,need){var s={};D.forEach(function(e){s[e]=cur[e]});s[d]-=m;var V=m*d,sm=D.filter(function(e){return e<d&&e!==2000});
sm.forEach(function(e){var t=Math.min(Math.max(0,need[e]-s[e]),Math.floor(V/e));s[e]+=t;V-=t*e});
sm.forEach(function(e){var t=Math.floor(V/e);s[e]+=t;V-=t*e});return s}
function plan(As,s0){var base=alloc(As,s0),cur=s0,p=base,k=0,sc=base?base.n:Infinity;
for(var r=0;r<4;r++){var inf={},need=z(),ip;D.forEach(function(d){inf[d]=d===2000?cur[d]:1e9});ip=alloc(As,inf);if(ip)ip.c.forEach(function(c){D.forEach(function(d){need[d]+=c[d]})});
var bc=null;D.forEach(function(d){if(d===100)return;for(var m=1;m<=Math.min(cur[d],8);m++){var s=recv(cur,d,m,need),q=alloc(As,s);if(!q)continue;var kk=gave(s0,s),v=q.n+PEN*kk;if(v<sc&&(!bc||v<bc.v))bc={v:v,s:s,p:q,k:kk}}});
if(!bc)break;cur=bc.s;p=bc.p;sc=bc.v;k=bc.k}
return{p:p,s:cur,base:base,k:k}}
function exOf(a,b){var g=z(),r=z();D.forEach(function(d){if(a[d]>b[d])g[d]=a[d]-b[d];else r[d]=b[d]-a[d]});return{give:g,get:r}}
function exText(R){return R.ex?"отдать "+lst(R.ex.give)+", получить "+lst(R.ex.get):""}
function curErr(){var E=[];C.people.forEach(function(p){var s=amtOf(p);if(s&&isNaN(pa(s)))E.push("Сумма не понята: "+p.n+" «"+s+"»")});return E}
function curRows(){var W=[];C.people.forEach(function(p){var s=amtOf(p);if(!s)return;var a=pa(s);if(isNaN(a))return;W.push({n:p.n,raw:a,A:Math.floor(a/100)*100,kg:Math.round(pkg(p.n)*100)/100,sal:kgn(p.s),r:rateOf(p)})});return W}
function tsData(x){var B=[],S=[];
if(x.cur){boats().forEach(function(b){var no=String(b.b||"").trim();if(no||kgn(b.k)||kgn(b.m))B.push({b:no,c:String(b.c||"").trim(),kg:kgn(b.k),m:kgn(b.m)})});stages().forEach(function(st){S.push({b:String(st.b||"").trim(),s:String(st.s||"").trim(),kg:kgn(st.k),p:presentOf(st)})})}
else{var r=x.rec||{};(r.boats||[]).forEach(function(b){B.push({b:String(b.b||"").trim(),c:String(b.c||"").trim(),kg:+b.kg||0,m:+b.m||0})});(r.stages||[]).forEach(function(st){S.push({b:String(st.b||"").trim(),s:String(st.s||"").trim(),kg:+st.kg||0,p:st.p||[]})})}
if(!S.some(function(st){return st.p.length}))return null;
var bm={},bo=[];function bt(no){if(!bm[no]){bm[no]={b:no,c:"",w:null,m:0,ppl:{},po:[],sk:0,lost:0};bo.push(no)}return bm[no]}
B.forEach(function(b){var o=bt(b.b);if(b.c&&!o.c)o.c=b.c;o.w=(o.w||0)+b.kg+b.m;o.m+=b.m});
S.forEach(function(st){if(!st.kg&&!st.p.length)return;var o=bt(st.b);o.sk+=st.kg;if(!st.p.length){o.lost+=st.kg;return}var e=st.kg/st.p.length;st.p.forEach(function(n){if(!(n in o.ppl)){o.ppl[n]=0;o.po.push(n)}o.ppl[n]+=e})});
var L=bo.map(function(k){return bm[k]}).filter(function(o){return o.sk||o.w}),em={},eo=[];
L.forEach(function(o){o.po.forEach(function(n){if(!em[n]){em[n]={n:n,list:[],t:0};eo.push(n)}em[n].list.push({b:o.b,c:o.c,kg:o.ppl[n]});em[n].t+=o.ppl[n]})});
return{S:S,boats:L,emps:eo.map(function(n){return em[n]}).sort(function(a,b){return a.n.localeCompare(b.n,"ru")})}}
function tsMatrix(x){var d=tsData(x),names=[];if(!d)return null;
(x.rows||[]).forEach(function(w){if(names.indexOf(w.n)<0)names.push(w.n)});d.S.forEach(function(st){st.p.forEach(function(n){if(names.indexOf(n)<0)names.push(n)})});
names=names.filter(function(n){return d.boats.some(function(o){return n in o.ppl})});return{names:names,boats:d.boats}}
function bankOf(x){var kg=0,m=0,sl=0;if(x.cur){boats().forEach(function(b){kg+=kgn(b.k);m+=kgn(b.m)});C.people.forEach(function(p){sl+=kgn(p.s)})}else{var r=x.rec||{};(r.boats||[]).forEach(function(b){kg+=+b.kg||0;m+=+b.m||0});sl=r.salad!=null?+r.salad||0:(r.rows||[]).reduce(function(a,w){return a+(+w.sal||0)},0)}
return{kg:kg,m:m,s:sl,t:Math.round((kg+m)*500+sl*400)}}
function shifts(){var L=[{id:sidCur(),date:C.date||todayISO(),rows:curRows(),bank:bankAuto(),cur:true}];hist().forEach(function(r){L.push({id:r.id,date:r.date||ymd(r.ts),ts:r.ts,rows:r.rows||[],bank:r.bank,rec:r})});return L}
function findShift(id){return shifts().filter(function(x){return x.id===id})[0]||null}
function shiftBy(id){return findShift(id)||shifts()[0]}
function rateOfRow(w){if(w.r)return w.r;if(w.kg>0){var x=Math.round((w.raw-(w.sal||0)*400)/w.kg);if([500,480,450].indexOf(x)>=0)return x}return null}
function paidOf(sid){var o={};pays().forEach(function(op){if(op.sid!==sid)return;op.lines.forEach(function(l){var x=o[l.n]=o[l.n]||{adv:0,sal:0};x[op.type]+=l.amt})});return o}
function jlines(){var L=[];pays().forEach(function(op){op.lines.forEach(function(l){L.push({op:op,l:l,id:op.id+"/"+l.n})})});return L}
function payState(){var d=draft(),sh=shiftBy(d.sid),pd=paidOf(sh.id),rows=[],W=[],err=[],warn=[],tot=0;
sh.rows.forEach(function(w){var p=pd[w.n]||{adv:0,sal:0},paid=p.adv+p.sal,rem=w.A-paid,v=d.amt[w.n],def=d.type==="sal"?Math.max(0,rem):0,a=(v==null||v==="")?def:cnt(v);
if(a%100)err.push(w.n+": "+fmt(a)+" ₽ не делится на 100.");else if(a>Math.max(0,rem))warn.push(w.n+": "+fmt(a)+" ₽ больше остатка "+fmt(Math.max(0,rem))+" ₽.");
rows.push({n:w.n,A:w.A,paid:paid,adv:p.adv,rem:rem,v:v==null?"":v,def:def,a:a});tot+=a;if(a>0&&a%100===0)W.push({n:w.n,A:a})});
return{d:d,sh:sh,rows:rows,W:W,err:err,warn:warn,tot:tot,bud:cnt(d.budget)}}
function distAdv(B,rows){if(!(B>0))return{err:"Укажите сумму аванса."};if(B%100)return{err:"Сумма аванса должна делиться на 100 ₽."};
var P=rows.filter(function(x){return x.A>0&&x.rem>=100}).map(function(x){return{n:x.n,A:x.A,cap:Math.floor(x.rem/100)}}),tot=0;P.forEach(function(x){tot+=x.cap});
if(B/100>tot)return{err:"Сумма "+fmt(B)+" ₽ больше общего остатка к выплате "+fmt(tot*100)+" ₽. Уменьшите сумму или распределите вручную."};
var U=B/100,fix={},act=P.slice(),used,wA,rem;
function upd(){used=0;wA=0;Object.keys(fix).forEach(function(k){used+=fix[k]});act.forEach(function(x){wA+=x.A});rem=U-used}
for(;;){upd();var nx=act.filter(function(x){return rem*x.A/wA>=x.cap});if(!nx.length)break;nx.forEach(function(x){fix[x.n]=x.cap});act=act.filter(function(x){return!(x.n in fix)})}
upd();var out={},sm=0,sh=act.map(function(x){var q=rem*x.A/wA,f=Math.floor(q+1e-9);sm+=f;return{n:x.n,q:q,f:f}});
Object.keys(fix).forEach(function(k){out[k]=fix[k]});sh.forEach(function(o){out[o.n]=o.f});
sh.sort(function(a,b){return(b.q-b.f)-(a.q-a.f)});for(var i=0;i<rem-sm;i++)out[sh[i].n]++;
var amt={};rows.forEach(function(x){amt[x.n]=String((out[x.n]||0)*100)});return{amt:amt}}
function salOf(n){var q=C.people.filter(function(p){return p.n===n})[0];return q?kgn(q.s):0}
function withPaid(rec){var o={};pays().forEach(function(op){if(op.sid!==rec.id||!op.synced)return;op.lines.forEach(function(l){var x=o[l.n]=o[l.n]||{adv:0,pd:0};if(op.type==="adv")x.adv+=l.amt;x.pd+=l.amt})});var r=JSON.parse(JSON.stringify(rec));r.rows.forEach(function(w){var x=o[w.n]||{adv:0,pd:0};w.adv=x.adv;w.pd=x.pd});return r}
function rateOf(p){if(p.r)return +p.r;return{"Саня":500,"Даня":500,"Аня":450}[p.n]||480}
function autoOf(p){var k=pkg(p.n),sl=kgn(p.s);return(k>0||sl>0)?String(Math.floor(k*rateOf(p)+sl*400+1e-9)):""}
function amtOf(p){var m=String(p.a||"").trim();return m?m:autoOf(p)}
function bankAuto(){var br=C.bankR;if(br!==""&&br!=null&&!isNaN(+br))return Math.round(+br);var t=0,m=0,sl=0;boats().forEach(function(x){t+=kgn(x.k);m+=kgn(x.m)});C.people.forEach(function(p){sl+=kgn(p.s)});return Math.round((t+m)*500+sl*400)}
function presentOf(st){return C.people.filter(function(p){return st.p&&st.p[p.n]}).map(function(p){return p.n})}
function pkg(n){var t=0;stages().forEach(function(st){var pr=presentOf(st);if(pr.length&&pr.indexOf(n)>=0)t+=kgn(st.k)/pr.length});return t}
function infoSt(st){var n=presentOf(st).length;return"Чел.: "+n+" · кг на чел.: "+(n?fmtk(kgn(st.k)/n):"—")}
function warnK(ts,tk){return ts&&tk&&Math.abs(ts-tk)>0.001?"Кг по этапам "+fmtk(ts)+", по катерам "+fmtk(tk)+": не сходится":""}
