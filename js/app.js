var TBO=false,PDERR=false,VSEL="",SYNCING=false,SYNCNOTE="",PULLING=false,PULLED=false,PULLNOTE="",PAYNOTE="",PAYERR="",JF={sd:"",pd:"",n:"",t:""};
function advice(R){
if(!R.W.length)return'<p class="mut" style="margin:0">Нет сумм к выдаче.</p>';
if(R.nostock)return'<p class="mut" style="margin:0">Введите количество купюр, чтобы проверить выдачу и размен.</p>';
if(R.fail)return'<p class="w" style="margin:0">Подходящего варианта нет. '+esc(R.fail)+"</p>";
var nb=R.n+" "+pl3(R.n,"купюра","купюры","купюр");
if(!R.ex)return'<p class="ok2" style="margin:0">✓ Размен не нужен: зарплата выдаётся имеющимися купюрами, '+nb+".</p>";
var gv=0;D.forEach(function(d){gv+=R.ex.give[d]*d});
return'<p style="margin:0 0 6px"><b>Нужен размен.</b> Отдайте в размен: <b>'+lst(R.ex.give)+"</b> ("+fmt(gv)+" ₽). Получите взамен: <b>"+lst(R.ex.get)+"</b>.</p>"+
'<p class="mut" style="margin:0">Почему: '+(R.base?"без размена при выдаче уйдёт "+R.base.n+" "+pl3(R.base.n,"купюра","купюры","купюр")+", с разменом "+nb+", на "+(R.base.n-R.n)+" меньше":"имеющимися купюрами точно выдать все суммы нельзя, с разменом выдача займёт "+nb)+". В размен уходит "+R.k+" "+pl3(R.k,"купюра","купюры","купюр")+": меньше не получится"+(R.base?" без лишних купюр при выдаче":"")+". Это подсказка: после размена исправьте количество купюр выше, сами числа не меняются.</p>"}
var IC={shift:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5h6M9 12l2 2 4-4M9 17h6"/></svg>',people:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.6 0 4.5 2 4.5 5"/></svg>',tab:'<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',sum:'<svg viewBox="0 0 24 24"><path d="M5 4h14M5 10h14M5 16h9"/><path d="M15 19.5l2.2 2L21 17.5"/></svg>',log:'<svg viewBox="0 0 24 24"><rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>'};
function nav(){function g(L){return'<div class="ng" style="grid-template-columns:repeat('+L.length+',1fr)">'+L.map(function(t){return'<button data-t="'+t[0]+'" class="'+(C.tab===t[0]?"on":"")+'">'+IC[t[0]]+t[1]+"</button>"}).join("")+"</div>"}
return"<nav>"+g([["shift","Смена"],["people","Люди"],["sum","Итог"]])+g([["tab","Выплаты"],["log","Журнал"]])+"</nav>"}
function render(){
var a=document.getElementById("app");
if(ROLE===null){a.innerHTML='<h1>РАЗДАЧА ЗП</h1><div class="card"><p class="mut" style="margin:0">Загрузка…</p></div>';return}
if(ROLE==="login"){a.innerHTML='<h1>РАЗДАЧА ЗП</h1><div class="card"><p style="margin:0 0 12px">Чтобы увидеть отчёт, войдите в свой аккаунт Claude и откройте ссылку ещё раз.</p><button class="pill g2" id="loc">Открыть без облака</button></div>';var l=document.getElementById("loc");if(l)l.onclick=function(){ROLE="owner";render()};return}
if(ROLE==="emp"){renderEmp();return}
renderOwner()}
function rowOf(r,me){return(r.rows||[]).filter(function(x){return x.n===me})[0]}
function renderEmp(){
var h='<h1>РАЗДАЧА ЗП<small>отчёт</small></h1>',me=getMe();
if(!EMPLOADED)h+='<div class="card"><p class="mut" style="margin:0">Загрузка…</p></div>';
else if(EMPERR)h+='<div class="card"><p class="w" style="margin:0">'+esc(EMPERR)+"</p></div>";
else if(!REPS.length)h+='<div class="card"><p class="mut" style="margin:0">Отчётов пока нет. После закрытия смены здесь появится ваша сумма.</p></div>';
else{
var names=[];REPS.forEach(function(r){(r.rows||[]).forEach(function(w){if(names.indexOf(w.n)<0)names.push(w.n)})});names.sort();
if(!me||names.indexOf(me)<0){h+='<div class="lbl">ВЫБЕРИТЕ СВОЁ ИМЯ</div><div class="card" style="display:flex;flex-wrap:wrap;gap:8px">'+names.map(function(n){return'<button class="pill" data-me="'+esc(n)+'">'+esc(n)+"</button>"}).join("")+"</div>"}
else{
var tot=0,w0=rowOf(REPS[0],me);
REPS.forEach(function(r){var w=rowOf(r,me);if(w)tot+=w.laid});
h+='<div class="lbl">'+esc(me).toUpperCase()+'</div><div class="card"><div class="mut">Смена '+dstr(REPS[0].ts)+"</div>"+(w0?'<div style="font:800 44px ui-monospace,Menlo,Consolas,monospace;color:var(--ac);margin:6px 0">'+fmt(w0.A)+' ₽</div><div>'+(w0.laid===w0.A?"✓ Выдано":"Выдача пока не отмечена")+"</div>"+(w0.raw!==w0.A?'<div class="mut" style="margin-top:6px">По ведомости '+fmt(w0.raw)+" ₽, округлено вниз до 100</div>":""):'<p style="margin:6px 0 0">В этой смене вас нет.</p>')+"</div>";
if(REPS.length>1){h+='<div class="lbl">ПРОШЛЫЕ СМЕНЫ</div><div class="card">';REPS.slice(1).forEach(function(r){var w=rowOf(r,me);h+='<div class="r2"><span>'+dstr(r.ts)+"</span><b>"+(w?fmt(w.A)+" ₽":"—")+"</b></div>"});h+="</div>"}
h+='<div class="card"><div class="r2"><span class="mut">Выдано за последние смены ('+REPS.length+')</span><b>'+fmt(tot)+' ₽</b></div></div><div style="margin:12px 4px"><button class="pill g2" id="chg">Сменить имя</button></div>'}}
var a=document.getElementById("app");a.innerHTML=h;
a.querySelectorAll("button[data-me]").forEach(function(b){b.onclick=function(){setMe(b.getAttribute("data-me"));render()}});
var c=document.getElementById("chg");if(c)c.onclick=function(){setMe("");render()}}
function renderOwner(){
var h='<h1>РАЗДАЧА ЗП<small>смена</small></h1><div class="mut" id="cloud" style="margin:-8px 10px 6px">'+CLOUD+'</div>',t=C.tab;
h+=t==="shift"?viewShift():t==="people"?viewPeople():t==="tab"?viewPay():t==="log"?viewLog():viewSum();
document.getElementById("app").innerHTML=h+nav();bind();
if(!PULLED){PULLED=true;setTimeout(function(){pullPay(false)},0)}}
function tsView(x){var d=tsMatrix(x),h='<details id="tbo"'+(TBO?" open":"")+'><summary class="lbl">ТАБЕЛЬ КАТЕРОВ</summary>',names;
if(!d)return h+'<div class="card"><p class="mut" style="margin:0">Для этой смены нет этапов с отмеченными людьми, поэтому табель недоступен'+(x.rec&&x.rec.src==="table"?" (смена загружена из таблицы, этапов в ней нет)":"")+".</p></div></details>";
names=d.names;
h+='<div class="card" style="padding:12px 8px"><div class="wrap"><table class="tg"><thead><tr><th class="s1">Катер</th>'+names.map(function(n){return'<th class="nm">'+esc(n)+"</th>"}).join("")+"</tr></thead><tbody>";
d.boats.forEach(function(o){h+='<tr><td class="s1"><b>'+esc(o.b||"—")+"</b>"+(o.c?'<span class="mut" style="display:block">'+esc(o.c)+"</span>":"")+"</td>"+names.map(function(n){return'<td class="mk">'+(n in o.ppl?"✓":"")+"</td>"}).join("")+"</tr>"});
h+="</tbody></table></div>";
d.boats.forEach(function(o){if(o.w==null)h+='<p class="w" style="margin:8px 4px 0">Катер '+esc(o.b||"без номера")+": в этапах есть, а в списке катеров нет.</p>"});
return h+"</div></details>"}
function sLabel(x){return(x.cur?"Текущая: ":"")+ddate(x)+(x.rec&&x.rec.sheet&&x.rec.sheet!==ddate(x)?" ("+x.rec.sheet+")":"")+" · "+x.rows.length+" чел."}
function shOpts(sel){return shifts().map(function(x){return'<option value="'+esc(x.id)+'"'+(x.id===sel?" selected":"")+">"+esc(sLabel(x))+"</option>"}).join("")}
function viewPeople(){
var sel=VSEL||sidCur(),x=shiftBy(sel),h='<div class="card"><label>Смена<select id="vsel" style="width:100%;margin-top:4px">'+shOpts(x.id)+"</select></label></div>";
if(!x.cur){var S=0;x.rows.forEach(function(w){S+=w.A});
h+='<div class="lbl">НАЧИСЛЕНИЯ · '+esc(ddate(x))+'</div><div class="card"><div class="mut">Только просмотр. Банк '+fmt(x.bank||0)+" ₽ · к выдаче "+fmt(S)+" ₽</div>";
x.rows.forEach(function(w){var r=rateOfRow(w);h+='<div class="r2"><div><b>'+esc(w.n)+'</b><div class="mut">'+(w.kg!=null&&w.kg!==""?fmtk(w.kg)+" кг"+(r?" × "+r:""):"кг —")+(w.sal?" · салат "+fmtk(w.sal)+" кг × 400":"")+'</div><div class="mut">начислено '+fmt(w.raw)+'</div></div><b>'+fmt(w.A)+" ₽</b></div>"});
return h+'<p class="mut" style="margin:8px 0 0">Справа сумма к выдаче (начислено вниз до 100). Выдачи и остатки — на вкладке «Итог».</p></div>'+tsView(x)}
var S=0;x.rows.forEach(function(w){S+=w.A});
h+='<div class="lbl">БАНК</div><div class="card"><div class="g"><label>Банк, ₽ (кг × 500, салат × 400)<input id="bank" type="text" readonly value="'+fmt(bankAuto())+'"></label><label>К выдаче всего, ₽<input type="text" readonly value="'+fmt(S)+'"></label></div></div><div class="lbl">СОТРУДНИКИ</div>';
C.people.forEach(function(p,i){h+='<div class="card pr"><span class="n">'+esc(p.n)+((pkg(p.n)||kgn(p.s))?'<small style="display:block;font-weight:400;font-size:12px;color:var(--mut)">'+(pkg(p.n)?fmtk(pkg(p.n))+' кг × '+rateOf(p):'')+(kgn(p.s)?(pkg(p.n)?' · ':'')+'салат '+fmtk(kgn(p.s))+' кг × 400':'')+'</small>':'')+'</span><input data-s="'+i+'" type="text" inputmode="decimal" placeholder="сал" value="'+esc(p.s||"")+'" style="width:54px"><input data-a="'+i+'" type="text" inputmode="numeric" placeholder="'+(autoOf(p)||"сумма")+'" value="'+esc(p.a)+'" style="width:112px"><span class="rub">₽</span></div>'});
h+='<div style="margin:16px 4px"><button class="pill g2" id="clr">'+(armed==="clr"?"Точно? Нажмите ещё раз":"Очистить суммы, банк, катера и этапы")+'</button></div><p class="mut" style="margin:0 8px">Серая сумма считается сама: кг по этапам × ставка, вниз до 100. Впишите свою, чтобы заменить. Ставки задаются на вкладке «Смена». Пустая сумма означает, что человека в этой смене нет.</p>';return h+tsView(x)}
function restoreCard(){var h='<div class="card"><p class="mut" style="margin:0 0 10px">Смены нет в списке? Загрузите её из таблицы, текущая смена не изменится.</p><button class="pill" id="gsload">'+(SBUSY?"Загружаю…":"Загрузить смену из таблицы")+"</button>";
if(NOTE3)h+='<p class="ok2" style="margin:10px 0 0">'+esc(NOTE3)+"</p>";
if(SLIST&&SLIST.length)h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">'+SLIST.slice(0,8).map(function(n,i){return'<button class="pill g2" data-gl="'+i+'">'+esc(n)+"</button>"}).join("")+"</div>";
return h+"</div>"}
function viewPay(){var P=payState(),d=P.d,h=restoreCard();
h+='<div class="card"><label>Смена, за которую выплата<select id="psel" style="width:100%;margin-top:4px">'+shOpts(d.sid)+'</select></label><label style="margin-top:10px">Дата выдачи<input id="pdate" type="date" value="'+esc(d.pdate)+'"'+(PDERR?' style="border-color:var(--warn)"':"")+'><span class="w" id="pderr" style="display:'+(PDERR?"block":"none")+';margin-top:4px;font-size:13px">Выберите дату выдачи</span></label><div style="margin-top:10px"><span style="font-size:13px;color:var(--mut)">Операция</span><div style="display:flex;gap:8px;margin-top:6px">'+[["adv","Аванс"],["sal","Зарплата"]].map(function(t){return'<button class="chip'+(d.type===t[0]?" on":"")+'" data-pt="'+t[0]+'" style="flex:1">'+t[1]+"</button>"}).join("")+"</div></div></div>";
if(d.type==="adv")h+='<div class="card pr" style="padding:12px 16px"><label style="flex:1;min-width:0">Сумма на аванс, ₽<input id="pbud" type="text" inputmode="numeric" value="'+esc(d.budget||"")+'" style="width:100%;margin-top:4px;text-align:left"></label><button class="pill" id="pdist" style="flex:none;align-self:flex-end">Распределить</button></div>';
if(PAYERR)h+='<p class="w" style="margin:4px 10px">'+esc(PAYERR)+"</p>";
if(PAYNOTE)h+='<div class="card"><p class="ok2" style="margin:0">'+esc(PAYNOTE)+"</p>"+(SYNCNOTE?'<p class="mut" style="margin:6px 0 0">'+esc(SYNCNOTE)+"</p>":"")+"</div>";
h+='<div class="lbl">'+(d.type==="adv"?"АВАНС":"ЗАРПЛАТА")+" · СМЕНА "+esc(ddate(P.sh))+"</div>";
if(!P.rows.length)h+='<div class="card"><p class="mut" style="margin:0">В этой смене нет начислений.</p></div>';
P.rows.forEach(function(x,i){h+='<div class="card pr"><span class="n">'+esc(x.n)+'<small style="display:block;font-weight:400;font-size:12px;color:var(--mut)">начислено '+fmt(x.A)+" · выдано "+fmt(x.paid)+(x.adv?" (аванс "+fmt(x.adv)+")":"")+'</small><small id="pl'+i+'" style="display:block;font-weight:400;font-size:12px;color:var(--mut)"></small></span><input data-pa="'+i+'" type="text" inputmode="numeric" placeholder="'+x.def+'" value="'+esc(x.v)+'" style="width:112px"><span class="rub">₽</span></div>'});
var cs=cashOf();
h+='<div class="lbl">НАЛИЧНЫЕ</div><div class="card"><div class="g"><div><span style="font-size:13px;color:var(--mut)">Ожидается в кассе, ₽</span><div id="cashe" style="font:600 18px ui-monospace,Menlo,Consolas,monospace;padding:12px 0 2px"></div><div class="mut" id="cashh"></div></div><div><span style="font-size:13px;color:var(--mut)">Наличные, ₽</span><div id="cashv" style="font:600 18px ui-monospace,Menlo,Consolas,monospace;padding:12px 0 2px"></div><div id="cashm" style="font-size:13px"></div></div></div>'+
'<p class="mut" style="margin:14px 0 4px">Купюры в наличии, шт.</p><div class="g" style="grid-template-columns:repeat(2,1fr)">'+D.map(function(dn){var v=cashBox(d.sid)[dn];return'<label>'+fmt(dn)+' ₽<input data-cash="'+dn+'" type="text" inputmode="numeric" placeholder="0" value="'+esc(v==null?"":v)+'"><span class="mut" id="cs'+dn+'"></span></label>'}).join("")+"</div>"+oldCash()+"</div>";
return h+'<div id="payplan"></div>'}
function oldCash(){var c=cashBox(draft().sid),p=[],t=0;OLDD.forEach(function(d){var n=cnt(c[d]);if(n){p.push(n+"×"+fmt(d)+" ₽");t+=n*d}});return p.length?'<p class="w" style="margin:12px 0 0">В сохранённых данных есть купюры '+p.join(", ")+" на "+fmt(t)+" ₽. Эти номиналы больше не используются и в наличные не входят. Разменяйте их и внесите в поля выше.</p>":""}
function planHtml(P,R){var d=P.d,h="";
P.err.forEach(function(e){h+='<p class="w" style="margin:4px 10px">'+esc(e)+"</p>"});
if(P.warn.length){h+='<div class="card">'+P.warn.map(function(e){return'<p class="w" style="margin:0 0 6px">'+esc(e)+"</p>"}).join("")+'<label style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--tx)"><input id="pover" type="checkbox" style="width:auto;margin:0"'+(d.over?" checked":"")+">Подтверждаю выдачу сверх остатка</label></div>"}
if(d.type==="adv"&&P.bud&&P.tot!==P.bud)h+='<p class="w" style="margin:4px 10px">Распределено '+fmt(P.tot)+" ₽ из "+fmt(P.bud)+" ₽ на аванс. Измените суммы или нажмите «Распределить».</p>";
h+='<div class="card" id="exch">'+advice(R)+"</div>";
if(!R.W.length)return h+'<p class="mut" style="margin:4px 10px">Нет сумм к выдаче.</p>';
if(R.fail)return h;
var sig=JSON.stringify([d.sid,d.type,R.W.map(function(w){return[w.n,w.A]}),R.st]);if(d.sig!==sig){d.ticks={};d.sig=sig;saveLocal()}
var cols=D.filter(function(x){return R.T[x]>0||R.st[x]>0}),laid=z(),tot=0,rows="";
R.W.forEach(function(w,i){var ls=0;rows+='<tr><td class="nm" data-i="'+i+'">'+esc(w.n)+"<small>"+fmt(w.A)+"</small></td>";
cols.forEach(function(x){var c=w.c[x];if(!c){rows+='<td class="z">·</td>';return}var k=w.n+"|"+x,dn=d.ticks[k];if(dn){ls+=c*x;laid[x]+=c}rows+='<td class="cl'+(dn?" d":"")+'" data-k="'+esc(k)+'">'+c+"</td>"});
tot+=ls;rows+='<td class="sm'+(ls===w.A?" ok":"")+'">'+(ls===w.A?"✓ ":"")+fmt(ls)+"</td></tr>"});
var p=R.S?tot/R.S:0,Cc=2*Math.PI*68;
h+='<svg class="ring" viewBox="0 0 160 160"><circle cx="80" cy="80" r="68" fill="none" stroke="var(--bd)" stroke-width="10"/><circle cx="80" cy="80" r="68" fill="none" stroke="var(--ac)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+Cc.toFixed(1)+'" stroke-dashoffset="'+(Cc*(1-p)).toFixed(1)+'" transform="rotate(-90 80 80)"/><text x="80" y="82" text-anchor="middle" font-size="34" font-weight="800" fill="var(--ac)">'+Math.round(p*100)+'%</text><text x="80" y="104" text-anchor="middle" font-size="12" fill="var(--mut)">отмечено</text></svg>';
h+='<div class="stats"><div><b>'+fmt(R.S)+'</b><span>К выдаче, ₽</span></div><div><b>'+fmt(tot)+'</b><span>Отмечено, ₽</span></div><div><b>'+fmt(R.S-tot)+'</b><span>Осталось, ₽</span></div></div>';
h+='<div class="lbl">РАСКЛАДКА</div><div class="card"><div class="wrap"><table><thead><tr><th></th>'+cols.map(function(x){return"<th>"+lab(x)+"</th>"}).join("")+"<th></th></tr></thead><tbody>"+rows;
h+='<tr class="f"><td>Всего</td>'+cols.map(function(x){return"<td>"+R.T[x]+"</td>"}).join("")+"<td></td></tr>";
h+='<tr class="f"><td>Склад</td>'+cols.map(function(x){return"<td>"+(R.st[x]-laid[x])+"</td>"}).join("")+"<td></td></tr></tbody></table></div>";
h+='<p class="mut" style="margin:8px 4px 0">Нажмите на цифру, когда положили. Нажмите на имя, чтобы отметить всю строку. Склад: купюры в наличии'+(R.ex?" после размена":"")+" минус отмеченные."+(R.nostock?" Наличие купюр не введено, поэтому раскладка без его учёта.":"")+"</p></div>";
var ok=!P.err.length&&(!P.warn.length||d.over)&&tot>0;
h+='<div style="margin:12px 4px"><button class="pill" id="pconf"'+(ok?"":' disabled style="opacity:.5"')+">"+(armed==="pconf"?"Точно? Записать "+fmt(tot)+" ₽ в журнал":"Подтвердить выдачу")+"</button></div>";
h+='<p class="mut" style="margin:0 8px">'+(tot?"В журнал попадут только отмеченные купюры"+(tot<R.S?": "+fmt(tot)+" из "+fmt(R.S)+" ₽":"")+". До подтверждения наличные и журнал не меняются.":"Отметьте выданные купюры, затем подтвердите выдачу. До подтверждения наличные и журнал не меняются.")+"</p>";
return h}
function renderPlan(){var e=document.getElementById("payplan");if(!e)return;var P=payState(),R=billPlan(P.W);e.innerHTML=planHtml(P,R);
P.rows.forEach(function(x,i){var t=document.getElementById("pl"+i);if(t)t.textContent=(P.d.type==="adv"?"аванс ":"выдать ")+fmt(x.a)+" · останется "+fmt(x.rem-x.a)});
var cs=R.cash,v=document.getElementById("cashv"),m=document.getElementById("cashm"),ce=document.getElementById("cashe"),pd=paidOf(P.sh.id),paid=0;Object.keys(pd).forEach(function(k){paid+=pd[k].adv+pd[k].sal});var exp=P.d.type==="adv"?P.tot:(P.sh.bank||0)-paid,hh=document.getElementById("cashh");if(hh)hh.textContent=P.d.type==="adv"?"сумма аванса в этой операции":"банк смены − уже выдано";
D.forEach(function(x){var q=document.getElementById("cs"+x);if(q)q.textContent=cs.n[x]?"= "+fmt(cs.n[x]*x)+" ₽":""});
if(ce)ce.textContent=fmt(exp)+" ₽";
if(v){v.textContent=fmt(cs.t)+" ₽";if(!cs.any){v.className="";m.className="mut";m.textContent="Купюры не введены"}else if(cs.t===exp){v.className="ok2";m.className="ok2";m.textContent="✓ Совпадает"}else{v.className="w";m.className="w";m.textContent="Сумма не совпадает"}}
bindPlan()}
function bindPlan(){var a=document.getElementById("payplan");if(!a)return;var d=draft();
a.querySelectorAll("td.cl").forEach(function(td){td.onclick=function(){var k=td.getAttribute("data-k");d.ticks[k]=!d.ticks[k];armed="";save();renderPlan()}});
a.querySelectorAll("td.nm").forEach(function(td){td.onclick=function(){var P=payState(),R=billPlan(P.W),w=R.W[+td.getAttribute("data-i")],ds=D.filter(function(x){return w.c[x]}),all=ds.every(function(x){return d.ticks[w.n+"|"+x]});ds.forEach(function(x){d.ticks[w.n+"|"+x]=!all});armed="";save();renderPlan()}});
var o=document.getElementById("pover");if(o)o.onchange=function(){d.over=o.checked;save();renderPlan()};
var c=document.getElementById("pconf");if(c)c.onclick=function(){if(c.disabled)return;if(!dateOk(draft().pdate)){armed="";noDate();return}if(armed!=="pconf"){armed="pconf";renderPlan();return}armed="";confirmPay()}}
function dateOk(v){return/^\d{4}-\d{2}-\d{2}$/.test(v||"")}
function noDate(){PDERR=true;var e=document.getElementById("pdate"),pe=document.getElementById("pderr");if(e){e.style.borderColor="var(--warn)";e.scrollIntoView({block:"center"})}if(pe)pe.style.display="block";renderPlan()}
function confirmPay(){var d=draft();
if(pays().some(function(op){return op.id===d.id})){d.id="";d.ticks={};PAYNOTE="Эта операция уже записана в журнал, повторно не записана.";save();render();return}
if(!dateOk(d.pdate)){noDate();return}
var P=payState(),R=billPlan(P.W);if(P.err.length||(P.warn.length&&!d.over)||R.fail)return;
var lines=[];R.W.forEach(function(w){var c=z(),s=0;D.forEach(function(x){if(w.c[x]&&d.ticks[w.n+"|"+x]){c[x]=w.c[x];s+=w.c[x]*x}});if(s)lines.push({n:w.n,amt:s,plan:w.A,c:c,st:s===w.A?"выдано":"выдано частично"})});
if(!lines.length)return;
var op={id:d.id,sid:P.sh.id,sdate:P.sh.date,pdate:d.pdate,type:d.type,ts:Date.now(),lines:lines,ex:exText(R)};
pays().push(op);
if(!R.nostock){var nc=JSON.parse(JSON.stringify(cashBox(op.sid)));D.forEach(function(x){var g=0;lines.forEach(function(l){g+=l.c[x]});nc[x]=String(R.st[x]-g)});C.cashBy[op.sid]=nc}
C.draft={sid:d.sid,pdate:"",type:d.type};
var sm=0;lines.forEach(function(l){sm+=l.amt});
PAYNOTE=tname(op.type)+" "+fmt(sm)+" ₽ записан"+(op.type==="adv"?"":"а")+" в журнал: "+lines.length+" "+pl3(lines.length,"человек","человека","человек")+".";PAYERR="";
save();render();window.scrollTo(0,0);syncPay()}
function viewLog(){var L=jlines().filter(function(x){return x.l.amt>0}),h="";
function uq(a){return a.filter(function(x,i){return x&&a.indexOf(x)===i})}
var sds=uq(L.map(function(x){return x.op.sdate})).sort().reverse(),ns=uq(L.map(function(x){return x.l.n})).sort();
var un=pays().filter(function(op){return!op.synced}).length;
h+='<div class="card"><button class="pill g2" id="pull" style="margin-bottom:10px">'+(PULLING?"Обновляю…":"Обновить из таблицы")+"</button>"+(PULLNOTE?'<p class="mut" style="margin:0 0 10px">'+esc(PULLNOTE)+"</p>":"")+"</div>";
h+='<div class="card"><p style="margin:0 0 10px">'+(un?"Не записано в таблицу: "+un+" "+pl3(un,"операция","операции","операций")+".":"✓ Все операции записаны в таблицу.")+"</p>"+(un?'<button class="pill" id="sync">'+(SYNCING?"Записываю…":"Записать в таблицу")+"</button>":"")+(SYNCNOTE?'<p class="mut" style="margin:10px 0 0">'+esc(SYNCNOTE)+"</p>":"")+"</div>";
h+='<div class="card"><div class="g" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Дата смены<select data-jf="sd" style="width:100%;margin-top:4px"><option value="">Все</option>'+sds.map(function(x){return'<option value="'+esc(x)+'"'+(JF.sd===x?" selected":"")+">"+esc(dd(x))+"</option>"}).join("")+'</select></label><label>Сотрудник<select data-jf="n" style="width:100%;margin-top:4px"><option value="">Все</option>'+ns.map(function(x){return'<option'+(JF.n===x?" selected":"")+">"+esc(x)+"</option>"}).join("")+"</select></label></div></div>";
var F=L.filter(function(x){return(!JF.sd||x.op.sdate===JF.sd)&&(!JF.n||x.l.n===JF.n)}).sort(function(a,b){return(b.op.pdate||"").localeCompare(a.op.pdate||"")||b.op.ts-a.op.ts}),tot=0;F.forEach(function(x){tot+=x.l.amt});
h+='<div class="lbl">ЖУРНАЛ ВЫПЛАТ · '+F.length+'</div><div class="card jc">';
function jd(iso){var x=dd(iso);return iso?'<span class="dl">'+esc(x)+'</span><span class="ds">'+esc(x.slice(0,6)+x.slice(8))+"</span>":"—"}
if(!F.length)h+='<p class="mut" style="margin:0">Записей нет.</p>';
else{h+='<div class="wrap"><table class="jt"><thead><tr><th>Дата смены</th><th>Сотрудник</th><th>Тип</th><th class="r">Сумма, ₽</th><th>Дата выдачи</th></tr></thead><tbody>';
F.forEach(function(x){h+="<tr><td>"+jd(x.op.sdate)+"</td><td>"+esc(x.l.n)+"</td><td>"+tname(x.op.type)+'</td><td class="r">'+fmt(x.l.amt)+"</td><td>"+jd(x.op.pdate)+"</td></tr>"});
h+='</tbody><tfoot><tr><td colspan="3">Итого</td><td class="r">'+fmt(tot)+"</td><td></td></tr></tfoot></table></div>"}
h+="</div>";
if(pays().length)h+='<div style="margin:16px 4px"><button class="pill g2" id="clrj">'+(armed==="clrj"?"Точно? Нажмите ещё раз":"Очистить журнал на этом устройстве")+'</button></div><p class="mut" style="margin:0 8px">Удаляет выплаты только на сайте, в Google Таблице ничего не меняется. Выплаты, которые ещё не записаны в таблицу, не удаляются. «Обновить из таблицы» вернёт на сайт всё, что есть в таблице.</p>';
return h}
function boatsLine(){var t=0,m=0;boats().forEach(function(x){t+=kgn(x.k);m+=kgn(x.m)});return"Всего: "+fmtk(t+m)+" кг"+(m?" (камчадал "+fmtk(m)+")":"")+" · банк "+fmt(bankAuto())+" ₽"}
function refreshShift(){var ts=0,tk=0;stages().forEach(function(st,i){ts+=kgn(st.k);var e=document.getElementById("si"+i);if(e)e.textContent=infoSt(st)});boats().forEach(function(x){tk+=kgn(x.k)+kgn(x.m)});C.people.forEach(function(p,j){var e=document.getElementById("pk"+j);if(e)e.textContent=fmtk(pkg(p.n))+" кг"});var a=document.getElementById("tsk");if(a)a.textContent="Всего по этапам: "+fmtk(ts)+" кг";var w=document.getElementById("warnk");if(w)w.textContent=warnK(ts,tk)}
function addStage(nextBoat){var S=stages(),pv=S[S.length-1],st={b:"",s:"",k:"",p:{}};
if(!pv){st.b="1";st.s="1"}else if(nextBoat){var nb=parseInt(pv.b);st.b=isNaN(nb)?"":String(nb+1);st.s="1";st.p=JSON.parse(JSON.stringify(pv.p||{}))}else{st.b=pv.b;var c=0;S.forEach(function(x){if(x.b===pv.b)c++});st.s=String(c+1);st.p=JSON.parse(JSON.stringify(pv.p||{}))}
S.push(st);armed="";save();render()}
function viewShift(){
var S=stages(),P=C.people,ts=0,tk=0,h='<div class="card"><label>Дата смены<input id="sdate" type="date" value="'+esc(C.date||todayISO())+'"></label></div>'+boatsView();
boats().forEach(function(x){tk+=kgn(x.k)+kgn(x.m)});
h+='<div class="lbl">ЭТАПЫ И ЛЮДИ</div><p class="mut" style="margin:0 10px 6px">Новый этап: когда состав поменялся. Нажмите на имя, чтобы отметить, кто был на этапе.</p>';
S.forEach(function(st,i){ts+=kgn(st.k);
h+='<div class="card"><div class="sg"><label>Катер<input data-sb="'+i+'" type="text" inputmode="numeric" value="'+esc(st.b||"")+'"></label><label>Этап<input data-ss="'+i+'" type="text" inputmode="numeric" value="'+esc(st.s||"")+'"></label><label>Кг этапа<input data-sk="'+i+'" type="text" inputmode="decimal" value="'+esc(st.k||"")+'"></label><button class="x" data-xs="'+i+'">×</button></div>';
h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">'+P.map(function(p,j){return'<button class="chip'+(st.p&&st.p[p.n]?" on":"")+'" data-sc="'+i+'" data-pj="'+j+'">'+esc(p.n)+"</button>"}).join("")+"</div>";
h+='<div class="mut" id="si'+i+'" style="margin-top:10px">'+infoSt(st)+"</div></div>"});
h+='<div style="margin:8px 4px"><button class="pill" id="adds">+ Этап</button> <button class="pill g2" id="addbs">+ След. катер</button></div>';
h+='<div class="mut" id="tsk" style="margin:0 10px">Всего по этапам: '+fmtk(ts)+' кг</div><p class="w" id="warnk" style="margin:4px 10px 0">'+warnK(ts,tk)+"</p>";
h+='<details id="ppl"'+(PPL?" open":"")+'><summary class="lbl">ЛЮДИ · СТАВКА · КГ</summary><div class="card">';
P.forEach(function(p,j){h+='<div class="r2"><b>'+esc(p.n)+'</b><span><select data-rt="'+j+'">'+[500,480,450].map(function(r){return'<option'+(rateOf(p)===r?" selected":"")+'>'+r+"</option>"}).join("")+'</select> <span class="mut" id="pk'+j+'">'+fmtk(pkg(p.n))+' кг</span><button class="x" data-xp="'+j+'" style="margin-left:8px">×</button></span></div>'});
h+='<p class="mut" style="margin:8px 0 0">500: бригадир и бухгалтер, 480: рабочие, 450: помощники (выходят помочь).</p><div class="pr" style="padding:12px 0 0"><input id="newn" type="text" placeholder="Новое имя" style="flex:1;width:auto;min-width:0;text-align:left;font-family:inherit"><button class="pill" id="add" style="flex:none">+ Добавить</button></div></div></details>';
return h}
function boatsView(){var B=boats(),tk=0,h='<div class="lbl">КАТЕРА</div>';
B.forEach(function(x,i){tk+=kgn(x.k)+kgn(x.m);h+='<div class="card pr"><input data-bb="'+i+'" type="text" placeholder="№" value="'+esc(x.b)+'" style="width:56px;text-align:center"><input data-bc="'+i+'" type="text" placeholder="капитан" value="'+esc(x.c||"")+'" style="flex:1;width:auto;min-width:0;text-align:left;font-family:inherit"><input data-bk="'+i+'" type="text" inputmode="decimal" placeholder="кг" value="'+esc(x.k)+'" style="width:76px"><input data-bm="'+i+'" type="text" inputmode="decimal" placeholder="кам" value="'+esc(x.m||"")+'" style="width:60px"><button class="x" data-xb="'+i+'">×</button></div>'});
h+='<div style="margin:8px 4px"><button class="pill g2" id="addb">+ Катер</button> <span class="mut" id="tkg">'+boatsLine()+'</span></div>';return h}
function csvOf(r){
var L=[["Смена",ddate(r)],[],["Имя","По ведомости","К выдаче","Авансы","Зарплата выдана","Выдано всего","Остаток"]],pd=paidOf(r.id),ta=0,ts=0;if(r.stages&&r.stages.length){var sb=[["Катер","Этап","Кг этапа","Чел.","Кг на чел.","Кто был"]];r.stages.forEach(function(x){sb.push([x.b,x.s,String(x.kg).replace(".",","),x.p.length,x.p.length?String(Math.round(x.kg/x.p.length*100)/100).replace(".",","):"",x.p.join(", ")])});sb.push([]);L.splice.apply(L,[2,0].concat(sb))}if(r.boats&&r.boats.length){var bb=[["Катер","Капитан","Кг","Камчадал"]],bk=0,bm=0;r.boats.forEach(function(x){bb.push([x.b,x.c||"",String(x.kg).replace(".",","),x.m?String(x.m).replace(".",","):""]);bk+=x.kg;bm+=x.m||0});bb.push(["Всего кг","",String(Math.round(bk*100)/100).replace(".",","),bm?String(Math.round(bm*100)/100).replace(".",","):""],[]);L.splice.apply(L,[2,0].concat(bb))}
r.rows.forEach(function(w){var x=pd[w.n]||{adv:0,sal:0};ta+=x.adv;ts+=x.sal;L.push([w.n,w.raw,w.A,x.adv,x.sal,x.adv+x.sal,w.A-x.adv-x.sal])});
L.push(["ИТОГО",r.RAW,r.S,ta,ts,ta+ts,r.S-ta-ts],[],["Банк",r.bank],["ЗП всего",r.S],["Остаток банка",r.rest],["Бригадиру (весь остаток)",r.rest]);
return"\ufeff"+L.map(function(a){return a.map(qc).join(";")}).join("\r\n")}
var NOTE="",CSVTXT="";
function exportRec(rec){
var csv=csvOf(rec),name="zp_"+ymd(rec.ts)+".csv";
function fallback(m){CSVTXT=csv;NOTE=m;render()}
if(!window.claude||!window.claude.use){fallback("Скачивание здесь недоступно. Скопируйте таблицу ниже.");return}
claude.use("downloads").then(function(dl){
if(!dl){fallback("Скачивание здесь недоступно. Скопируйте таблицу ниже.");return}
return dl.save({filename:name,data:csv}).then(function(){NOTE="Таблица сохранена: "+name;CSVTXT="";render()},function(e){if(e&&e.code==="declined"){NOTE="Скачивание отменено. Таблицу можно скачать из архива ниже.";CSVTXT="";render()}else fallback("Не удалось скачать"+(e&&e.code?" ("+e.code+")":"")+". Скопируйте таблицу ниже.")})}).catch(function(){fallback("Не удалось скачать. Скопируйте таблицу ниже.")})}

function closeShift(){
var W=curRows();if(!W.length)return;var bank=bankAuto(),S=0,RAW=0;W.forEach(function(w){S+=w.A;RAW+=w.raw});var B=Math.floor(Math.max(bank-S,0)/1000)*1000;
var rec={id:sidCur(),ts:Date.now(),date:C.date||todayISO(),boats:boats().filter(function(x){return String(x.b||"").trim()||kgn(x.k)||kgn(x.m)}).map(function(x){return{b:String(x.b||"").trim(),c:String(x.c||"").trim(),kg:kgn(x.k),m:kgn(x.m)}}),stages:stages().filter(function(st){return presentOf(st).length||kgn(st.k)}).map(function(st){return{b:String(st.b||"").trim(),s:String(st.s||"").trim(),kg:kgn(st.k),p:presentOf(st)}}),salad:C.people.reduce(function(a,p){return a+kgn(p.s)},0),bank:bank,S:S,RAW:RAW,rest:bank-S,B:B,Cm:bank-S-B,rows:W};
var H=hist();H.unshift(rec);if(H.length>60)H.length=60;
C.bank=C.n1=C.n05=C.sw=C.brig="";C.bankR="";C.restored="";C.people.forEach(function(p){p.a="";p.s=""});C.ticks={};C.sig="";C.boats=null;C.stages=null;C.date="";C.sid="";C.tab="sum";VSEL=rec.id;armed="";
save();NOTE="Смена закрыта и сохранена в архиве. Выплаты по ней можно делать на вкладке «Выплаты». Данные очищены для новой смены.";NOTE2="";CSVTXT="";render();sheetReport(rec)}
function viewSum(){
var h="";
if(NOTE||NOTE2||NOTE3)h+='<div class="card">'+(NOTE?'<p class="ok2" style="margin:0 0 6px">'+esc(NOTE)+"</p>":"")+(NOTE2?'<p class="ok2" style="margin:0">'+esc(NOTE2)+"</p>":"")+(NOTE3?'<p class="ok2" style="margin:6px 0 0">'+esc(NOTE3)+"</p>":"")+"</div>";
if(CSVTXT)h+='<div class="card"><label>Таблица (выделите и скопируйте)<textarea readonly rows="8" style="width:100%;margin-top:4px;font:13px ui-monospace,Menlo,Consolas,monospace;padding:8px;border:2px solid var(--bd);border-radius:12px;background:var(--in);color:var(--tx)">'+esc(CSVTXT)+"</textarea></label></div>";
var x=shiftBy(VSEL||sidCur()),E=x.cur?curErr():[],pd=paidOf(x.id),S=0,RAW=0,adv=0,sal=0;
x.rows.forEach(function(w){var q=pd[w.n]||{adv:0,sal:0};S+=w.A;RAW+=w.raw;adv+=q.adv;sal+=q.sal});
h+='<div class="card"><label>Смена<select id="ssel" style="width:100%;margin-top:4px">'+shOpts(x.id)+"</select></label></div>";
if(!x.rows.length&&!E.length){h+='<div class="card"><p class="mut" style="margin:0">Нет сумм. Введите их на вкладке «Люди».</p></div>'}
else{
if(x.cur)h+='<div style="margin:8px 4px 12px"><button class="pill" id="close">'+(armed==="close"?"Точно? Нажмите ещё раз":"Закрыть смену и выгрузить таблицу")+"</button></div>";
var rest=(x.bank||0)-S;
h+='<div class="card s">';
E.forEach(function(e){h+='<p class="w">'+esc(e)+"</p>"});
if(rest<0)h+='<p class="w">ЗП больше банка на '+fmt(-rest)+" ₽.</p>";
h+="<p><b>Начислено:</b> "+fmt(S)+" ₽"+(RAW!==S?' <span class="mut">(округление вниз убрало '+fmt(RAW-S)+" ₽)</span>":"")+"</p>";
var bk=bankOf(x);h+="<p><b>Банк:</b> "+fmt(bk.t)+' ₽ <span class="mut">(кг '+fmtk(bk.kg)+" × 500 + камчадал "+fmtk(bk.m)+" × 500 + салат "+fmtk(bk.s)+" × 400)</span></p>";
if(bk.t!==(x.bank||0))h+='<p class="mut">В смене записан банк '+fmt(x.bank||0)+" ₽ (например, загружен из таблицы), остаток банка ниже считается от него.</p>";
h+="<p><b>Остаток банка:</b> "+fmt(rest)+" ₽</p>";
h+="</div>";
h+='<div class="lbl">ПО СОТРУДНИКАМ</div><div class="card jc"><div class="wrap"><table class="jt"><thead><tr><th>Сотрудник</th><th class="r">К выдаче</th><th class="r">Аванс</th><th class="r">Зарплата</th><th class="r">Остаток</th></tr></thead><tbody>';
x.rows.forEach(function(w){var q=pd[w.n]||{adv:0,sal:0};h+="<tr><td>"+esc(w.n)+'</td><td class="r">'+fmt(w.A)+'</td><td class="r">'+fmt(q.adv)+'</td><td class="r">'+fmt(q.sal)+'</td><td class="r">'+fmt(w.A-q.adv-q.sal)+"</td></tr>"});
h+='</tbody><tfoot><tr><td>Итого</td><td class="r">'+fmt(S)+'</td><td class="r">'+fmt(adv)+'</td><td class="r">'+fmt(sal)+'</td><td class="r">'+fmt(S-adv-sal)+"</td></tr></tfoot></table></div></div>"}
var cs=cashOf(x.id);h+='<div class="card s"><p><b>Наличные по смене:</b> '+(cs.any?txt(cs.n)+" = "+fmt(cs.t)+" ₽":"не введены на вкладке «Выплаты»")+"</p></div>";
if(!window.claude&&!/^https:\/\/script\.google\.com\//.test(GS_URL))h+='<div class="lbl">ТАБЛИЦА GOOGLE</div><div class="card"><label>Ссылка Apps Script<input id="gsurl" type="text" placeholder="https://script.google.com/macros/s/.../exec" value="'+esc(C.gs||"")+'" style="text-align:left;font:14px ui-monospace,Menlo,Consolas,monospace"></label></div>';
var H=hist();
if(H.length){h+='<div class="lbl">ЗАКРЫТЫЕ СМЕНЫ</div><div class="card">';H.slice(0,10).forEach(function(r,i){h+='<div class="r2"><div><b>'+ddate(r)+'</b><div class="mut">ЗП '+fmt(r.S)+" ₽ · "+r.rows.length+' чел.'+(r.boats&&r.boats.length?' · '+fmtk(r.boats.reduce(function(s,x){return s+x.kg+(x.m||0)},0))+' кг':'')+'</div></div><span style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;max-width:58%"><button class="pill g2" data-e="'+i+'" style="padding:10px 14px">CSV</button>'+(inSheet(r)?'<span class="mut" style="margin-left:6px">✓ в таблице</span>':'<button class="pill g2" data-g="'+i+'" style="padding:10px 14px;margin-left:6px">В таблицу</button>')+'<button class="pill g2" data-d="'+i+'" style="padding:10px 14px">✕</button></span></div>'});h+="</div>"}
return h}
function bind(){
var a=document.getElementById("app");
a.querySelectorAll("nav button").forEach(function(b){b.onclick=function(){if(b.getAttribute("data-t")==="tab"&&C.tab!=="tab"&&C.draft){C.draft.pdate="";PDERR=false}C.tab=b.getAttribute("data-t");armed="";NOTE="";NOTE2="";NOTE3="";CSVTXT="";PAYNOTE="";PAYERR="";save();render();window.scrollTo(0,0)}});
["brig"].forEach(function(id){var e=document.getElementById(id);if(e)e.oninput=function(){C[id]=e.value;save()}});
a.querySelectorAll("input[data-s]").forEach(function(e){e.oninput=function(){var i=+e.getAttribute("data-s");C.people[i].s=e.value;var b=document.getElementById("bank");if(b)b.value=fmt(bankAuto());var pa=document.querySelector('input[data-a="'+i+'"]');if(pa)pa.placeholder=autoOf(C.people[i])||"сумма";save()}});
a.querySelectorAll("input[data-a]").forEach(function(e){e.oninput=function(){C.people[+e.getAttribute("data-a")].a=e.value;save()}});
a.querySelectorAll("input[data-cash]").forEach(function(e){e.oninput=function(){var v=e.value.replace(/\D/g,"");if(v!==e.value)e.value=v;cashBox(draft().sid)[e.getAttribute("data-cash")]=v;save();renderPlan()}});
a.querySelectorAll("input[data-pa]").forEach(function(e){e.oninput=function(){var v=e.value.replace(/\D/g,"");if(v!==e.value)e.value=v;var d=draft(),P=payState();d.amt[P.rows[+e.getAttribute("data-pa")].n]=v;armed="";save();renderPlan()}});
["vsel","ssel"].forEach(function(id){var e=document.getElementById(id);if(e)e.onchange=function(){VSEL=e.value;armed="";render()}});
var ps=document.getElementById("psel");if(ps)ps.onchange=function(){var d=draft();d.sid=ps.value;d.amt={};d.ticks={};d.over=false;PAYERR="";PAYNOTE="";save();render()};
var pdt=document.getElementById("pdate");if(pdt)pdt.onchange=pdt.oninput=function(){draft().pdate=pdt.value||"";if(pdt.value){PDERR=false;pdt.style.borderColor="";var pe=document.getElementById("pderr");if(pe)pe.style.display="none"}save()};
a.querySelectorAll("button[data-pt]").forEach(function(b){b.onclick=function(){var d=draft();if(d.type===b.getAttribute("data-pt"))return;d.type=b.getAttribute("data-pt");d.amt={};d.ticks={};d.over=false;PAYERR="";PAYNOTE="";save();render()}});
var pb=document.getElementById("pbud");if(pb)pb.oninput=function(){var v=pb.value.replace(/\D/g,"");if(v!==pb.value)pb.value=v;draft().budget=v;save();renderPlan()};
var pdi=document.getElementById("pdist");if(pdi)pdi.onclick=function(){var d=draft(),r=distAdv(cnt(d.budget),payState().rows);PAYNOTE="";if(r.err){PAYERR=r.err}else{PAYERR="";d.amt=r.amt;d.ticks={};d.over=false}save();render()};
a.querySelectorAll("[data-jf]").forEach(function(e){e.onchange=function(){JF[e.getAttribute("data-jf")]=e.value;render()}});
var sy=document.getElementById("sync");if(sy)sy.onclick=function(){syncPay()};
var pu=document.getElementById("pull");if(pu)pu.onclick=function(){pullPay(true)};
var cj=document.getElementById("clrj");if(cj)cj.onclick=function(){if(armed!=="clrj"){armed="clrj";render();return}armed="";var keep=pays().filter(function(o){return!o.synced}),gone=pays().length-keep.length;
try{localStorage.setItem(KEY+"_paybak",JSON.stringify({ts:Date.now(),pay:C.pay}))}catch(e){}
C.pay=keep;PULLNOTE="Журнал на устройстве очищен: удалено операций "+gone+(keep.length?", оставлено не записанных в таблицу: "+keep.length:"")+". В таблице ничего не изменилось.";save();render()};
renderPlan();
a.querySelectorAll("button[data-x]").forEach(function(b){b.onclick=function(){var i=b.getAttribute("data-x");if(armed!=="x"+i){armed="x"+i;b.textContent="Удалить?";return}C.people.splice(+i,1);armed="";save();render()}});
a.querySelectorAll("input[data-bb]").forEach(function(e){e.oninput=function(){boats()[+e.getAttribute("data-bb")].b=e.value;save()}});
a.querySelectorAll("input[data-bm]").forEach(function(e){e.oninput=function(){boats()[+e.getAttribute("data-bm")].m=e.value;refreshShift();var el=document.getElementById("tkg");if(el)el.textContent=boatsLine();save()}});
a.querySelectorAll("input[data-bc]").forEach(function(e){e.oninput=function(){boats()[+e.getAttribute("data-bc")].c=e.value;save()}});
a.querySelectorAll("input[data-bk]").forEach(function(e){e.oninput=function(){boats()[+e.getAttribute("data-bk")].k=e.value;var t=0;boats().forEach(function(x){t+=kgn(x.k)});var el=document.getElementById("tkg");if(el)el.textContent=boatsLine();refreshShift();save()}});
a.querySelectorAll("button[data-xb]").forEach(function(b){b.onclick=function(){var i=b.getAttribute("data-xb");if(armed!=="xb"+i){armed="xb"+i;b.textContent="Удалить?";return}boats().splice(+i,1);armed="";save();render()}});
a.querySelectorAll("input[data-sb]").forEach(function(e){e.oninput=function(){stages()[+e.getAttribute("data-sb")].b=e.value;save()}});
a.querySelectorAll("input[data-ss]").forEach(function(e){e.oninput=function(){stages()[+e.getAttribute("data-ss")].s=e.value;save()}});
a.querySelectorAll("input[data-sk]").forEach(function(e){e.oninput=function(){stages()[+e.getAttribute("data-sk")].k=e.value;refreshShift();save()}});
a.querySelectorAll("button[data-sc]").forEach(function(b){b.onclick=function(){var st=stages()[+b.getAttribute("data-sc")],n=C.people[+b.getAttribute("data-pj")].n;st.p=st.p||{};st.p[n]=!st.p[n];armed="";save();render()}});
a.querySelectorAll("button[data-xs]").forEach(function(b){b.onclick=function(){var i=b.getAttribute("data-xs");if(armed!=="xs"+i){armed="xs"+i;b.textContent="Удалить?";return}stages().splice(+i,1);armed="";save();render()}});
a.querySelectorAll("button[data-xp]").forEach(function(b){b.onclick=function(){var i=+b.getAttribute("data-xp");if(armed!=="xp"+i){armed="xp"+i;b.textContent="Удалить?";return}var n=C.people[i].n;C.people.splice(i,1);stages().forEach(function(st){if(st.p)delete st.p[n]});armed="";save();render()}});
a.querySelectorAll("select[data-rt]").forEach(function(e){e.onchange=function(){C.people[+e.getAttribute("data-rt")].r=+e.value;save()}});
var as=document.getElementById("adds");if(as)as.onclick=function(){addStage(false)};
var an=document.getElementById("addbs");if(an)an.onclick=function(){addStage(true)};
var ab=document.getElementById("addb");if(ab)ab.onclick=function(){boats().push({b:"",k:""});save();render()};
var pd=document.getElementById("ppl");if(pd)pd.ontoggle=function(){PPL=pd.open};
var tb=document.getElementById("tbo");if(tb)tb.ontoggle=function(){TBO=tb.open};
var ad=document.getElementById("add");if(ad)ad.onclick=function(){var v=document.getElementById("newn").value.trim();if(!v||C.people.some(function(p){return p.n===v}))return;C.people.push({n:v,a:""});save();render()};
var gl=document.getElementById("gsload");if(gl)gl.onclick=function(){if(!SBUSY)loadList()};
a.querySelectorAll("button[data-gl]").forEach(function(b){b.onclick=function(){var n=SLIST&&SLIST[+b.getAttribute("data-gl")];if(n)loadShift(n)}});
var gu=document.getElementById("gsurl");if(gu)gu.oninput=function(){C.gs=gu.value.trim();save()};
var sd=document.getElementById("sdate");if(sd)sd.oninput=function(){C.date=sd.value;save()};
var cl=document.getElementById("clr");if(cl)cl.onclick=function(){if(armed!=="clr"){armed="clr";render();return}armed="";C.bank=C.n1=C.n05=C.sw=C.brig="";C.bankR="";C.restored="";C.people.forEach(function(p){p.a="";p.s=""});C.ticks={};C.sig="";C.boats=null;C.stages=null;C.date="";save();render()};
var cs=document.getElementById("close");if(cs)cs.onclick=function(){if(armed!=="close"){armed="close";render();return}closeShift()};
a.querySelectorAll("button[data-e]").forEach(function(b){b.onclick=function(){var r=hist()[+b.getAttribute("data-e")];if(r)exportRec(r)}});
a.querySelectorAll("button[data-d]").forEach(function(b){b.onclick=function(){var i=b.getAttribute("data-d");if(armed!=="d"+i){armed="d"+i;b.textContent="Удалить?";return}armed="";hist().splice(+i,1);save();render()}});
a.querySelectorAll("button[data-g]").forEach(function(b){b.onclick=function(){var i=b.getAttribute("data-g");if(armed!=="g"+i){armed="g"+i;b.textContent="Точно? Ещё раз";return}armed="";var r=hist()[+i];if(r&&!inSheet(r))sheetReport(r)}});
a.querySelectorAll("button[data-p]").forEach(function(b){b.onclick=function(){var r=hist()[+b.getAttribute("data-p")];if(r)publishReport(r)}});
}
migrate();migCash();
if(C.draft)C.draft.pdate="";
render();
initCloud();
