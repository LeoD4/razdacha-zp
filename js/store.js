var DEF={bank:"",n1:"",n05:"",sw:"",brig:"",tab:"people",ticks:{},sig:"",people:[["Саня",""],["Даня",""],["Ваня",""],["Эля",""],["Эльнур",""],["Витя",""],["Егор",""],["Костя",""],["Аня",""],["Тёма",""],["Женя",""],["Гор",""]].map(function(p){return{n:p[0],a:p[1]}})};
var C=JSON.parse(JSON.stringify(DEF)),armed="",PPL=false;
try{var r=localStorage.getItem(KEY);if(r){var o=JSON.parse(r);if(o&&o.people)C=o}}catch(e){}
var REF=null,CLOUD="☁ подключаюсь…",pushT=null,pushing=false,dirty=false;
function setCloud(t){CLOUD=t;var e=document.getElementById("cloud");if(e)e.textContent=t}
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(C))}catch(e){}}
function save(){C.ts=Date.now();saveLocal();schedPush()}
function schedPush(){if(!REF)return;setCloud("☁ сохраняю…");clearTimeout(pushT);pushT=setTimeout(doPush,900)}
function doPush(){if(!REF)return;if(pushing){dirty=true;return}pushing=true;C.ts=C.ts||Date.now();var snap=JSON.parse(JSON.stringify(C));
REF.set(snap).then(function(){setCloud("☁ сохранено в облаке")}).catch(function(e){setCloud("☁ не удалось сохранить"+(e&&e.code?" ("+e.code+")":""))}).then(function(){pushing=false;if(dirty){dirty=false;doPush()}})}
function initCloud(){
if(!window.claude||!window.claude.use){ROLE="owner";setCloud("");render();return}
Promise.all([claude.use("db"),claude.use("user")]).then(function(r){var db=r[0],user=r[1];
if(!db||!user){ROLE="login";render();return}
DBH=db;
return user.isOwner().then(function(own){
if(!own){ROLE="emp";render();subReports();return}
ROLE="owner";render();
return user.id().then(function(uid){
if(!uid){setCloud("☁ войдите в аккаунт, чтобы данные сохранялись в облаке");return}
REF=db.doc("data/users/"+uid+"/state");var first=true;
REF.onSnapshot(function(s){var d=s.exists?s.data():null;
if(d&&d.people&&(d.ts||0)>(C.ts||0)){C=JSON.parse(JSON.stringify(d));migrate();migCash();saveLocal();var ae=document.activeElement;if(!(ae&&ae.tagName==="INPUT"))render()}
else if(first&&(!d||(C.ts||0)>(d.ts||0)))schedPush();
if(first){first=false;if(!pushT)setCloud("☁ подключено")}},
function(e){setCloud("☁ ошибка облака"+(e&&e.code?" ("+e.code+")":""))})})})}).catch(function(){ROLE="login";render()})}
function cashBox(sid){if(!C.cashBy)C.cashBy={};if(!C.cashBy[sid])C.cashBy[sid]={};return C.cashBy[sid]}
function migCash(){if(C.cash){C.cashOld=C.cash;delete C.cash}}
var ROLE=(window.claude&&window.claude.use)?null:"owner",DBH=null,REPS=[],EMPLOADED=false,EMPERR="",NOTE2="";
function getMe(){try{return localStorage.getItem("zpme")||""}catch(e){return""}}
function setMe(v){try{localStorage.setItem("zpme",v)}catch(e){}}
function subReports(){if(!DBH)return;
DBH.collection("reports").orderBy("ts","desc").limit(12).onSnapshot(function(s){REPS=s.docs.map(function(d){return d.data()});EMPLOADED=true;render()},function(e){EMPLOADED=true;EMPERR="Не удалось загрузить отчёт"+(e&&e.code?" ("+e.code+")":"");render()})}
function publishReport(rec){
if(!DBH){NOTE2="Облака нет, отчёт сотрудникам не отправлен.";render();return}
var pd=paidOf(rec.id);
DBH.doc("reports/"+rec.ts).set({ts:rec.ts,rows:rec.rows.map(function(w){var x=pd[w.n]||{adv:0,sal:0};return{n:w.n,raw:w.raw,A:w.A,laid:x.adv+x.sal}})}).then(function(){NOTE2="Отчёт опубликован для сотрудников.";render()},function(e){NOTE2="Отчёт сотрудникам не отправлен"+(e&&e.code?" ("+e.code+")":"");render()})}
function sidCur(){if(!C.sid)C.sid="c"+Date.now();return C.sid}
function pays(){if(!C.pay)C.pay=[];return C.pay}
function migrate(){if((C.ver||0)>=2)return;
try{localStorage.setItem(KEY+"_bak1",JSON.stringify(C))}catch(e){}
hist().forEach(function(r){if(!r.id)r.id="h"+r.ts;
var L=(r.rows||[]).filter(function(w){return w.laid>0}).map(function(w){return{n:w.n,amt:w.laid,plan:w.A,c:w.c||z(),st:w.laid===w.A?"выдано":"выдано частично"}});
if(L.length&&!pays().some(function(op){return op.id==="m"+r.ts}))pays().push({id:"m"+r.ts,sid:r.id,sdate:r.date||ymd(r.ts),pdate:r.date||ymd(r.ts),type:"sal",ts:r.ts,lines:L,mig:true})});
var tk=C.ticks&&Object.keys(C.ticks).some(function(k){return C.ticks[k]});
if(C.restored||tk){var W=curRows(),R=billPlan(W.map(function(w){return{n:w.n,A:w.A}})),L=[];
R.W.forEach(function(w,i){var c=z(),s=0;D.forEach(function(d){if(w.c[d]&&C.ticks&&C.ticks[i+"|"+d]){c[d]=w.c[d];s+=w.c[d]*d}});if(s)L.push({n:w.n,amt:s,plan:w.A,c:c,st:s===w.A?"выдано":"выдано частично"})});
var sid=sidCur();
if(C.restored){sid="s:"+C.restored;if(!hist().some(function(r){return r.id===sid})){var S=0,RAW=0;W.forEach(function(w){S+=w.A;RAW+=w.raw});hist().unshift({id:sid,ts:Date.now(),date:C.date||todayISO(),boats:[],stages:[],bank:bankAuto(),S:S,RAW:RAW,rest:bankAuto()-S,rows:W,sheet:C.restored,src:"table"})}}
if(L.length&&!pays().some(function(op){return op.id==="mc"+sid}))pays().push({id:"mc"+sid,sid:sid,sdate:C.date||todayISO(),pdate:todayISO(),type:"sal",ts:Date.now(),lines:L,mig:true});
if(C.restored)resetShift();C.ticks={};C.sig=""}
C.ver=2;saveLocal()}
function resetShift(){C.bank=C.n1=C.n05=C.sw=C.brig="";C.bankR="";C.restored="";C.people.forEach(function(p){p.a="";p.s=""});C.ticks={};C.sig="";C.boats=null;C.stages=null;C.date=""}
function draft(){if(!C.draft)C.draft={};var d=C.draft;if(!d.id)d.id="op"+Date.now()+Math.random().toString(36).slice(2,6);if(!d.sid||!findShift(d.sid))d.sid=sidCur();if(d.pdate==null)d.pdate="";if(!d.type)d.type="sal";if(!d.amt)d.amt={};if(!d.ticks)d.ticks={};return d}
function hist(){C.history=C.history||[];return C.history}
function boats(){if(!C.boats)C.boats=[{b:"",k:""},{b:"",k:""},{b:"",k:""},{b:"",k:""}];return C.boats}
function stages(){if(!C.stages)C.stages=[];return C.stages}
