var SLIST=null,SBUSY=false;
function gsPin(){try{return localStorage.getItem("zppin")||""}catch(e){return""}}
function askPin(){try{var v=window.prompt("PIN таблицы");if(v!=null&&v.trim()){localStorage.setItem("zppin",v.trim());return true}}catch(e){}return false}
function gsGet(q,again){var GU=gsUrl();if(!GU)return Promise.reject(new Error("nourl"));
return fetch(GU+"?"+q+"&pin="+encodeURIComponent(gsPin())).then(function(r){return r.json()}).then(function(j){if(j&&j.error==="pin"){if(!again&&askPin())return gsGet(q,true);throw new Error("pin")}if(!j||!j.ok)throw new Error((j&&j.error)||"err");return j})}
function gsErr(e){var m=e&&e.message;return m==="nourl"?"В коде сайта не задана ссылка Apps Script (GS_URL).":m==="pin"?"PIN таблицы не введён или не подошёл. Нажмите кнопку ещё раз и введите PIN.":"Не удалось получить данные из таблицы."+(m&&m!=="err"?" ("+m+")":"")}
function parseShift(rows,name){var tot=-1,i,H=(rows[2]||[]).map(String),iR=H.indexOf("Начислено, ₽"),iB=H.indexOf("Катер"),iM=H.indexOf("Камчадал"),iA=H.indexOf("К выдаче, ₽"),iV=H.indexOf("Аванс"),iO=H.indexOf("Остаток"),iS=H.indexOf("КГ салата");if(iR<0)iR=2;if(iB<0)iB=5;
for(i=3;i<rows.length;i++){if(String(rows[i][0]).trim()==="Итого"){tot=i;break}}
if(tot<0)return null;
var P=[],B=[],bank=null,r;
for(i=3;i<tot;i++){r=rows[i];var n=String(r[0]==null?"":r[0]).trim();
if(n){var raw=kgn(r[iR]),A=iA>=0&&String(r[iA]==null?"":r[iA]).trim()!==""?kgn(r[iA]):Math.floor(raw/100)*100,ov=iO>=0?String(r[iO]==null?"":r[iO]).trim():"";P.push({n:n,raw:raw,A:A,kg:kgn(r[1]),sal:iS>=0?kgn(r[iS]):0,adv:iV>=0?kgn(r[iV]):0,ost:ov===""?null:kgn(ov)})}
var f=String(r[iB]==null?"":r[iB]).trim();
if(f){var m=/^(.*?)\s*·\s*(.*)$/.exec(f);B.push({b:m?m[1]:f,c:m?m[2]:"",k:kgn(r[iB+1]),m:iM>=0?kgn(r[iM]):0})}}
for(i=tot+1;i<rows.length;i++){r=rows[i];if(String(r[0]==null?"":r[0]).trim()==="Банк, ₽")bank=kgn(r[1])}
var dm=/^(\d{2})\.(\d{2})\.(\d{4})/.exec(name||"");
return{P:P,B:B,bank:bank,date:dm?dm[3]+"-"+dm[2]+"-"+dm[1]:""}}
function applyShift(d,name){var H=hist(),r=H.filter(function(x){return x.sheet===name})[0],S=0,RAW=0;
if(!r){d.P.forEach(function(x){S+=x.A;RAW+=x.raw});r={id:"s:"+name,ts:Date.now(),date:d.date||todayISO(),boats:d.B.map(function(x){return{b:x.b,c:x.c,kg:x.k,m:x.m}}),stages:[],bank:d.bank||0,S:S,RAW:RAW,rest:(d.bank||0)-S,rows:d.P.map(function(x){return{n:x.n,raw:x.raw,A:x.A,kg:x.kg,sal:x.sal}}),sheet:name,src:"table"};H.unshift(r)}
resolveOps();var loc=paidOf(r.id),la=[],ls=[];
d.P.forEach(function(x){var q=loc[x.n]||{adv:0,sal:0},tot=Math.max(x.adv,x.ost==null?0:x.A-x.ost),da=x.adv-q.adv,ds=(tot-x.adv)-q.sal;if(da>0)la.push({n:x.n,amt:da,plan:da,base:x.adv,c:z(),st:"из таблицы"});if(ds>0)ls.push({n:x.n,amt:ds,plan:ds,base:tot-x.adv,c:z(),st:"из таблицы"})});
[["adv",la],["sal",ls]].forEach(function(t){if(t[1].length)pays().push({id:"imp"+Date.now()+t[0],sid:r.id,sdate:r.date,pdate:"",type:t[0],ts:Date.now(),lines:t[1],src:"table",synced:true})});
var dr=draft();dr.sid=r.id;dr.amt={};dr.ticks={};dr.over=false;VSEL=r.id;C.tab="tab";armed="";SLIST=null;NOTE3="Смена «"+name+"» загружена"+(la.length||ls.length?", выплаты из таблицы учтены в журнале":"")+".";save();render();window.scrollTo(0,0)}
function loadList(){SBUSY=true;NOTE3="Загружаю список смен…";render();
gsGet("action=list").then(function(j){SLIST=j.sheets||[];SBUSY=false;NOTE3=SLIST.length?"Выберите смену:":"В таблице пока нет смен.";render()}).catch(function(e){SBUSY=false;NOTE3=gsErr(e);render()})}
function loadShift(name){NOTE3="Загружаю смену «"+name+"»…";render();
gsGet("action=get&sheet="+encodeURIComponent(name)).then(function(j){var d=parseShift(j.rows||[],name);if(!d||!d.P.length){NOTE3="В листе «"+name+"» не нашёл суммы людей.";render();return}applyShift(d,name)}).catch(function(e){NOTE3=gsErr(e);render()})}
var GS_URL="https://script.google.com/macros/s/AKfycbzI68g2EhW30n-WkgLVgbGqOEPQEecQ51ZLKNSgUeglnGCfQ3Ib4tXcEozJTLpFJk_4bw/exec";
function gsUrl(){return /^https:\/\/script\.google\.com\//.test(GS_URL)?GS_URL:(C.gs||"")}
var SHEET_ID="1wS1b3IaUEc8c5W63uH6OI1FeJyxeNhUyl6xiWhuS3ug",NOTE3="";
function inSheet(r){return r.sheet||r.ts===1792474231867||r.ts===1792407853953}
function sheetBlock(rec){var P=rec.rows||[],B=rec.boats||[],M=tsMatrix({rec:rec,rows:P,cur:false}),nb=M?M.names.length:0,TC=13,right=M&&TC+1+nb<=26,
n=Math.max(P.length,B.length,right?M.boats.length:0),rows=[],W=M?12:11;
function mk(){var r=[];for(var i=0;i<W;i++)r.push("");return r}
function rd(x){return Math.round(x*100)/100}
function who(no){var o=M&&M.boats.filter(function(x){return x.b===String(no==null?"":no).trim()})[0];return o?M.names.filter(function(nm){return nm in o.ppl}).join(", "):""}
var t=mk();t[0]="Отчёт по смене от "+ddate(rec);rows.push(t);rows.push(mk());
var h=mk();["Имя","Кг","КГ салата","Начислено, ₽","Зарплата","Аванс","Остаток","","Катер","Кг","Камчадал"].forEach(function(x,i){h[i]=x});if(M)h[11]="Сотрудники";rows.push(h);
var sk=0,ss=0,sr=0,sa=0,sv=0,spd=0,bk=0,bm=0;
for(var i=0;i<n;i++){var r=mk(),p=P[i],b=B[i];
if(p){var av=p.adv||0,pd=p.pd==null?av:p.pd;r[0]=p.n;r[1]=p.kg==null?"":p.kg;r[2]=p.sal||"";r[3]=p.raw;r[4]=pd-av||"";r[5]=av||"";r[6]=p.A-pd;spd+=pd;sk+=p.kg||0;ss+=p.sal||0;sr+=p.raw;sa+=p.A;sv+=av}
if(b){r[8]=b.b+(b.c?" · "+b.c:"");r[9]=b.kg;r[10]=b.m||"";if(M)r[11]=who(b.b);bk+=b.kg;bm+=b.m||0}
rows.push(r)}
var tt=mk();tt[0]="Итого";tt[1]=rd(sk);tt[2]=ss?rd(ss):"";tt[3]=sr;tt[4]=spd-sv||"";tt[5]=sv||"";tt[6]=sa-spd;tt[8]="Всего кг";tt[9]=rd(bk);tt[10]=bm?rd(bm):"";rows.push(tt);rows.push(mk());
[["Банк, ₽",rec.bank],["ЗП всего, ₽",rec.S],["Остаток, ₽",rec.bank-rec.S]].forEach(function(x,k){var r=mk();r[0]=x[0];r[1]=x[1];if(k===0){r[8]="Итого салат, кг";r[9]=rd(rec.salad||0)}rows.push(r)});
var bold=[],ts=null;
if(M){var r0,c0;
if(right){r0=1;c0=TC}else{rows.push([]);r0=rows.length;c0=0}
function put(r,c,v){while(rows.length<=r)rows.push([]);rows[r][c]=v}
put(r0,c0,"Табель катеров");put(r0+1,c0,"Катер");M.names.forEach(function(nm,k){put(r0+1,c0+1+k,nm)});
M.boats.forEach(function(o,k){put(r0+2+k,c0,o.b+(o.c?" · "+o.c:""));M.names.forEach(function(nm,j){put(r0+2+k,c0+1+j,nm in o.ppl?"✓":"")})});
bold.push([r0,r0+2,c0,c0+1+nb]);ts={r:r0,c:c0,names:nb,boats:M.boats.length}}
var Wm=W;rows.forEach(function(r){if(r.length>Wm)Wm=r.length});rows.forEach(function(r){for(var k=0;k<Wm;k++)if(r[k]==null)r[k]=""});
return{title:ddate(rec),rows:rows,bold:bold,num:[],ts:ts}}
function tsStyle(gid,T,rows){function c(h){return{red:parseInt(h.slice(1,3),16)/255,green:parseInt(h.slice(3,5),16)/255,blue:parseInt(h.slice(5,7),16)/255}}
function rg(r0,r1,c0,c1){return{sheetId:gid,startRowIndex:r0,endRowIndex:r1,startColumnIndex:c0,endColumnIndex:c1}}
function cell(r,f,fields){return{repeatCell:{range:r,cell:{userEnteredFormat:f},fields:fields.split(",").map(function(x){return"userEnteredFormat."+x}).join(",")}}}
var BG="#1d6fa3",h=T.r+1,b=T.boats,w=T.names,L=T.c,R=L+1+w,q=[],line={style:"SOLID",color:c("#c9d8e4")};
q.push(cell(rg(T.r,T.r+1,L,L+1),{textFormat:{bold:true,fontSize:12,fontFamily:"Arial",foregroundColor:c(BG)}},"textFormat"));
q.push(cell(rg(h,h+1,L,R),{backgroundColor:c(BG),horizontalAlignment:"CENTER",verticalAlignment:"MIDDLE",textRotation:{angle:0},textFormat:{bold:true,fontSize:11,fontFamily:"Arial",foregroundColor:c("#ffffff")}},"backgroundColor,horizontalAlignment,verticalAlignment,textRotation,textFormat"));
for(var k=0;k<b;k++)q.push(cell(rg(h+1+k,h+2+k,L,R),{backgroundColor:c(k%2?"#f2f7fb":"#ffffff"),verticalAlignment:"MIDDLE",textFormat:{bold:false,fontSize:11,fontFamily:"Arial",foregroundColor:c("#1f2933")}},"backgroundColor,verticalAlignment,textFormat"));
if(b){q.push(cell(rg(h+1,h+1+b,L,L+1),{horizontalAlignment:"LEFT"},"horizontalAlignment"));if(w)q.push(cell(rg(h+1,h+1+b,L+1,R),{horizontalAlignment:"CENTER",textFormat:{bold:true,fontSize:11,fontFamily:"Arial",foregroundColor:c(BG)}},"horizontalAlignment,textFormat"))}
q.push({updateBorders:{range:rg(h,h+1+b,L,R),top:line,bottom:line,left:line,right:line,innerHorizontal:line,innerVertical:line}});
function wd(i,px){q.push({updateDimensionProperties:{range:{sheetId:gid,dimension:"COLUMNS",startIndex:i,endIndex:i+1},properties:{pixelSize:px},fields:"pixelSize"}})}
if(L>0){wd(L-1,24);wd(L,130);for(var j=0;j<w;j++)wd(L+1+j,Math.max(64,9*String(rows[h][L+1+j]).length+22))}
return q}
// ширина текста Arial 11 в пикселях — по ширине каждой буквы, как автоподбор Google в браузере
var AW_L="абвгдеёжзийклмнопрстуфхцчшщъыьэюя",AW_LW=[0.556,0.573,0.531,0.365,0.583,0.556,0.556,0.669,0.458,0.559,0.559,0.438,0.583,0.688,0.552,0.556,0.542,0.556,0.5,0.458,0.5,0.823,0.5,0.573,0.521,0.802,0.823,0.625,0.719,0.521,0.51,0.75,0.528],AW_U="АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",AW_UW=[0.667,0.656,0.667,0.542,0.677,0.667,0.667,0.923,0.604,0.719,0.719,0.583,0.656,0.833,0.722,0.778,0.719,0.667,0.722,0.611,0.635,0.76,0.667,0.74,0.667,0.917,0.938,0.792,0.885,0.656,0.719,1.01,0.719];
function textPx(s){s=String(s==null?"":s);var t=0;for(var i=0;i<s.length;i++){var c=s.charAt(i),k=AW_L.indexOf(c);t+=k>=0?AW_LW[k]:(k=AW_U.indexOf(c))>=0?AW_UW[k]:(c===","||c===" ")?.278:c==="·"?.333:.556}return Math.round(t*14.667)}
function colA(n){var s="";while(n>0){var m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s}
function sheetErr(e){var c=e&&e.code;if(c==="server_not_connected"||c==="selection_required")return"Подключите Google Sheets в настройках Claude, раздел «Коннекторы».";if(c==="needs_reauth")return"Переподключите Google Sheets в настройках Claude.";if(c==="not_in_manifest"||c==="approval_required"||c==="consent_required")return"Доступ к Google Sheets не разрешён. Разрешите его для этой страницы.";return"Не удалось записать в таблицу"+(c?" ("+c+")":"")+"."}
var JN="Журнал выплат",JH=["Операция","ID строки","Дата смены","Дата выдачи","Тип","Сотрудник","Сумма, ₽","Купюры","Статус","Записано","ID смены","Лист смены","Метка времени"];
function syncPay(){if(SYNCING)return;var ops=pays().filter(function(op){return!op.synced});if(!ops.length)return;
var lines=[];ops.forEach(function(op){var x=findShift(op.sid),sh=x&&x.rec&&x.rec.sheet||"";op.lines.forEach(function(l){lines.push({op:op.id,id:op.id+"/"+l.n,sdate:dd(op.sdate),pdate:dd(op.pdate),type:tname(op.type),kind:op.type,n:l.n,amt:l.amt,bills:lst(l.c||{}),st:l.st||"",ts:dstr(op.ts),tsms:op.ts,sid:op.sid,sheet:sh})})});
SYNCING=true;SYNCNOTE="Записываю журнал в таблицу…";render();
(window.claude&&window.claude.use?syncMcp(lines):syncGs(lines)).then(function(j){ops.forEach(function(op){op.synced=true});var m=j.rows?mergeRows(j.rows):0;save();SYNCNOTE="Таблица: записано строк "+(j.added||0)+(j.skipped?", уже были: "+j.skipped:"")+"."+(j.warn?" "+j.warn:"")+(m?" Из таблицы добавлено строк: "+m+".":"")+(j.rows?"":" Чтобы журнал подтягивался из таблицы, обновите файл zhurnal.gs в Apps Script.")},function(e){SYNCNOTE="В таблицу не записано: "+syncErr(e)+" Выплаты сохранены в журнале на этом устройстве, повторите кнопкой «Записать в таблицу» на вкладке «Журнал»."}).then(function(){SYNCING=false;render()})}
function pullPay(manual){if(PULLING||SYNCING)return;var art=window.claude&&window.claude.use;if(!art&&(!gsUrl()||(!manual&&!gsPin())))return;
PULLING=true;if(manual){PULLNOTE="Загружаю журнал из таблицы…";render()}
(art?syncMcp([]):pullGs(manual)).then(function(j){if(!j.rows)throw new Error("noread");var m=mergeRows(j.rows);save();PULLNOTE="Журнал сверен с таблицей "+dstr(Date.now())+(m?", добавлено строк: "+m:", новых строк нет")+"."}).catch(function(e){PULLNOTE=e&&e.message==="noread"?"Журнал не подтянут: обновите файл zhurnal.gs в Apps Script.":"Журнал не подтянут из таблицы: "+syncErr(e)}).then(function(){PULLING=false;render()})}
function pullGs(manual,again){var GU=gsUrl();if(!GU)return Promise.reject(new Error("nourl"));
return fetch(GU,{method:"POST",body:JSON.stringify({action:"pay",pin:gsPin(),lines:[]})}).then(function(r){return r.json()}).then(function(j){if(j&&j.error==="pin"){if(manual&&!again&&askPin())return pullGs(manual,true);throw new Error("pin")}if(!j||!j.ok)throw new Error((j&&j.error)||"err");return j})}
function billsOf(t){var c=z(),re=/(\d+)\s*×\s*(5к|2к|1к|500|200|100)/g,m;while((m=re.exec(String(t||""))))c[{"5к":5000,"2к":2000,"1к":1000}[m[2]]||+m[2]]+=+m[1];return c}
function mergeRows(rows){var by={},add=0,ord=[];
(rows||[]).forEach(function(r){var o=String(r[0]==null?"":r[0]).trim(),n=String(r[5]==null?"":r[5]).trim();if(!o||!n)return;if(!by[o]){by[o]=[];ord.push(o)}by[o].push(r)});
ord.forEach(function(o){var R=by[o],r0=R[0],op=pays().filter(function(x){return x.id===o})[0];
if(!op){op={id:o,sid:"?",sdate:isoOf(r0[2]),pdate:isoOf(r0[3]),type:/аванс/i.test(String(r0[4]))?"adv":"sal",ts:+String(r0[12]||"").replace(/\D/g,"")||tsOf(r0[9])||Date.now(),lines:[],synced:true,src:"sheet",rsid:String(r0[10]||"").trim(),rsheet:String(r0[11]||"").trim()};pays().push(op)}
R.forEach(function(r){var n=String(r[5]).trim(),a=+String(r[6]==null?"":r[6]).replace(/[^\d]/g,"")||0;if(op.lines.some(function(l){return l.n===n}))return;op.lines.push({n:n,amt:a,plan:a,c:billsOf(r[7]),st:String(r[8]||"")});add++})});
resolveOps();fixImports();return add}
function resolveOps(){var H=hist();pays().forEach(function(op){if(op.src!=="sheet"||findShift(op.sid))return;var r=null;
if(op.rsid)r=H.filter(function(x){return x.id===op.rsid})[0];
if(!r&&op.rsheet)r=H.filter(function(x){return x.sheet===op.rsheet})[0];
if(!r){var m=H.filter(function(x){return(x.date||ymd(x.ts))===op.sdate});if(m.length===1)r=m[0]}
if(r)op.sid=r.id})}
function fixImports(){pays().forEach(function(im){if(im.src!=="table")return;im.lines.forEach(function(l){if(l.base==null)return;var s=0;
pays().forEach(function(op){if(op===im||op.src==="table"||op.sid!==im.sid||op.type!==im.type||op.ts>im.ts)return;op.lines.forEach(function(x){if(x.n===l.n)s+=x.amt})});l.amt=l.plan=Math.max(0,l.base-s)})})}
function syncErr(e){var m=e&&e.message;if(m==="nourl")return"в коде сайта не задана ссылка Apps Script.";if(m==="pin")return"PIN таблицы не введён или не подошёл.";if(m==="oldscript")return"Apps Script ещё не умеет вести журнал (добавьте в него код из файла apps-script/zhurnal.gs).";if(e&&e.code)return sheetErr(e);return"нет связи с таблицей"+(m&&m!=="err"?" ("+m+")":"")+"."}
function syncGs(lines,again){var GU=gsUrl();if(!GU)return Promise.reject(new Error("nourl"));
return gsGet("action=ver").then(function(j){if(!(j.v>=2))throw new Error("oldscript")},function(e){if(e&&(e.message==="pin"||e.message==="nourl"))throw e;throw new Error("oldscript")}).then(function(){
return fetch(GU,{method:"POST",body:JSON.stringify({action:"pay",pin:gsPin(),lines:lines})})}).then(function(r){return r.json()}).then(function(j){if(j&&j.error==="pin"){if(!again&&askPin())return syncGs(lines,true);throw new Error("pin")}if(!j||!j.ok)throw new Error((j&&j.error)||"err");return j})}
function syncMcp(lines){var SV="Google Sheets";
return claude.use("mcp").then(function(mcp){if(!mcp)throw{code:"server_not_connected"};
function pl(r){var x=r&&r.payload;if(typeof x==="string"){try{x=JSON.parse(x)}catch(e){x=null}}return x||{}}
function get(rg){return mcp.callTool(SV,"get_values",{spreadsheetId:SHEET_ID,range:rg},{cache:false}).then(function(r){return pl(r).values||[]})}
function put(rg,v){return mcp.callTool(SV,"update_values",{spreadsheetId:SHEET_ID,range:rg,values:v})}
var names=[];
return mcp.callTool(SV,"get_spreadsheet",{spreadsheetId:SHEET_ID,fields:["sheets.properties"]},{cache:false}).then(function(r){names=(pl(r).sheets||[]).map(function(x){return x.properties&&x.properties.title});
return(names.indexOf(JN)<0?mcp.callTool(SV,"update_spreadsheet",{spreadsheetId:SHEET_ID,requests:[{addSheet:{properties:{title:JN,gridProperties:{frozenRowCount:1}}}}]}):Promise.resolve()).then(function(){return put("'"+JN+"'!A1:M1",[JH])})}).then(function(){return get("'"+JN+"'!A:B")}).then(function(col){
var have={};col.forEach(function(r){have[String(r[1])]=1});var add=lines.filter(function(l){if(have[l.id])return false;have[l.id]=1;return true});
function fin(r){return get("'"+JN+"'!A2:M").then(function(v){r.rows=v;return r})}
if(!add.length)return fin({added:0,skipped:lines.length});var st=Math.max(col.length,1)+1;
return put("'"+JN+"'!A"+st+":M"+(st+add.length-1),add.map(function(l){return[l.op,l.id,l.sdate,l.pdate,l.type,l.n,l.amt,l.bills,l.st,l.ts,l.sid||"",l.sheet||"",String(l.tsms||"")]})).then(function(){
var q=Promise.resolve(),bad=0;add.forEach(function(l){if(!l.sheet||names.indexOf(l.sheet)<0)return;q=q.then(function(){return get("'"+l.sheet+"'!A1:K200").then(function(v){var H=(v[2]||[]).map(String),c={r:H.indexOf("Начислено, ₽"),z:H.indexOf("Зарплата"),a:H.indexOf("Аванс"),o:H.indexOf("Остаток")},tot=-1,i;
if(c.r<0||c.z<0||c.a<0||c.o<0)return;for(i=3;i<v.length;i++)if(String(v[i][0]==null?"":v[i][0]).trim()==="Итого"){tot=i;break}if(tot<0)return;
function cell(r,k){return r[k]==null?"":r[k]}
var Z=[],A=[],O=[],sz=0,sa=0,so=0;
for(i=3;i<tot;i++){var r=v[i],nm=String(cell(r,0)).trim();if(!nm){Z.push([cell(r,c.z)]);A.push([cell(r,c.a)]);O.push([cell(r,c.o)]);continue}
var due=Math.floor(kgn(cell(r,c.r))/100)*100,a=kgn(cell(r,c.a)),o=String(cell(r,c.o)).trim()===""?due:kgn(cell(r,c.o));if(nm===l.n){if(l.kind==="adv")a+=l.amt;o-=l.amt}
var zz=Math.max(0,due-a-o);sz+=zz;sa+=a;so+=o;Z.push([zz||""]);A.push([a||""]);O.push([o])}
Z.push([sz||""]);A.push([sa||""]);O.push([so]);
function col(k){return String.fromCharCode(65+k)}
return put("'"+l.sheet+"'!"+col(c.z)+"4:"+col(c.z)+(tot+1),Z).then(function(){return put("'"+l.sheet+"'!"+col(c.a)+"4:"+col(c.a)+(tot+1),A)}).then(function(){return put("'"+l.sheet+"'!"+col(c.o)+"4:"+col(c.o)+(tot+1),O)})}).catch(function(){bad++})})});
return q.then(function(){return fin({added:add.length,skipped:lines.length-add.length,warn:bad?"Не обновлены суммы на листах смен: "+bad+".":""})})})})})}
function sheetDone(rec,name){rec.sheet=name||"ok";save();NOTE3="Смена записана в таблицу, лист «"+name+"».";render();syncPay()}
function sheetReport(rec){
if(SYNCING){setTimeout(function(){sheetReport(rec)},1500);return}
var blk=sheetBlock(withPaid(rec));
if(!window.claude||!window.claude.use){
var GU=gsUrl();if(!GU){NOTE3="Таблица не настроена: в коде сайта не задана ссылка Apps Script (GS_URL). Смена сохранена в архиве.";render();return}
NOTE3="Записываю смену в таблицу…";render();
var tries=0;(function send(){blk.pin=gsPin();fetch(GU,{method:"POST",body:JSON.stringify(blk)}).then(function(r){return r.json()}).then(function(j){if(j&&j.error==="pin"){if(!tries++&&askPin()){send();return}NOTE3="PIN таблицы не введён или не подошёл. Нажмите «В таблицу» в архиве и введите PIN.";render();return}if(j&&j.ok)sheetDone(rec,j.sheet||blk.title);else{NOTE3="Таблица ответила ошибкой"+(j&&j.error?": "+j.error:"")+". Проверьте таблицу, прежде чем повторять.";render()}}).catch(function(){NOTE3="Не удалось связаться с таблицей. Если лист с этой датой уже появился, повторять не нужно, иначе нажмите «В таблицу» в архиве.";render()})})();
return}
NOTE3="Записываю смену в таблицу…";render();
var stage="read";
claude.use("mcp").then(function(mcp){
if(!mcp){NOTE3="В таблицу не записано: страница не получила доступ к Google Sheets. Нажмите «В таблицу» в архиве.";render();return}
var SV="Google Sheets";
return mcp.callTool(SV,"get_spreadsheet",{spreadsheetId:SHEET_ID,fields:["sheets.properties"]},{cache:false}).then(function(res){
var pl=res&&res.payload;if(typeof pl==="string"){try{pl=JSON.parse(pl)}catch(x){pl=null}}
var names=((pl&&pl.sheets)||[]).map(function(s){return s.properties&&s.properties.title}),name=blk.title,k=1;
while(names.indexOf(name)>=0){k++;name=blk.title+" ("+k+")"}
var gid=(rec.ts%2000000000)+1,n=blk.rows.length,nc=blk.rows[0].length,lc=colA(nc);
stage="write";
return mcp.callTool(SV,"update_spreadsheet",{spreadsheetId:SHEET_ID,requests:[{addSheet:{properties:{sheetId:gid,title:name}}}]}).then(function(){
return mcp.callTool(SV,"update_values",{spreadsheetId:SHEET_ID,range:"'"+name+"'!A1:"+lc+n,values:blk.rows})}).then(function(){
sheetDone(rec,name);
function rg(a){return{sheetId:gid,startRowIndex:a[0],endRowIndex:a[1],startColumnIndex:a[2],endColumnIndex:a[3]}}
var rq=blk.bold.map(function(a){return{repeatCell:{cell:{userEnteredFormat:{textFormat:{bold:true}}},fields:"userEnteredFormat.textFormat",range:rg(a)}}}).concat(blk.num.map(function(x){return{repeatCell:{cell:{userEnteredFormat:{numberFormat:{pattern:x.f,type:"NUMBER"}}},fields:"userEnteredFormat.numberFormat",range:rg(x.r)}}}));
rq.push({updateDimensionProperties:{range:{sheetId:gid,dimension:"COLUMNS",startIndex:0,endIndex:nc},properties:{pixelSize:120},fields:"pixelSize"}});
if(nc>11)rq.push({repeatCell:{range:rg([2,blk.rows.length,11,12]),cell:{userEnteredFormat:{wrapStrategy:"OVERFLOW_CELL"}},fields:"userEnteredFormat.wrapStrategy"}},{updateDimensionProperties:{range:{sheetId:gid,dimension:"COLUMNS",startIndex:11,endIndex:12},properties:{pixelSize:Math.max(120,blk.rows.slice(3).reduce(function(m,r){return Math.max(m,textPx(r[11]))},0)+10)},fields:"pixelSize"}});
if(blk.ts)rq=rq.concat(tsStyle(gid,blk.ts,blk.rows));
mcp.callTool(SV,"update_spreadsheet",{spreadsheetId:SHEET_ID,requests:rq}).catch(function(){})})})}).catch(function(e){NOTE3=sheetErr(e)+(stage==="write"?" Проверьте таблицу, прежде чем повторять.":" Смена сохранена в архиве: нажмите «В таблицу».");render()})}
