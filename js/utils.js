var KEY="zpcfg4",D=[5000,1000,500,100],ALLD=[5000,2000,1000,500,200,100],OLDD=[2000,200];
function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g," ")}
function lab(d){return d===5000?"5к":d===2000?"2к":d===1000?"1к":String(d)}
function pa(s){s=String(s).replace(/\s/g,"");if(/^\d{1,3}([.,]\d{3})+$/.test(s))return +s.replace(/[.,]/g,"");if(/^\d+([.,]\d{1,2})?$/.test(s))return Math.round(parseFloat(s.replace(",",".")));return NaN}
function nm(v){v=String(v==null?"":v).trim();if(!v)return 0;var x=pa(v);return isNaN(x)?0:x}
function txt(c){var p=[];ALLD.forEach(function(d){if(c[d])p.push(c[d]+"×"+lab(d))});return p.join(" + ")||"0"}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function z(){return{5000:0,2000:0,1000:0,500:0,200:0,100:0}}
function cnt(v){v=String(v==null?"":v).replace(/\D/g,"");return v?parseInt(v,10):0}
function pl3(n,a,b,c){var m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c}
function lst(c){var p=[];ALLD.forEach(function(d){if(c[d])p.push(c[d]+"×"+lab(d))});return p.join(", ")}
function tname(t){return t==="adv"?"Аванс":"Зарплата"}
function dd(iso){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||"");return m?m[3]+"."+m[2]+"."+m[1]:(iso||"")}
function kgn(v){var x=parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."));return isNaN(x)?0:x}
function fmtk(n){return String(Math.round(n*100)/100).replace(".",",")}
function todayISO(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function ddate(r){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(r.date||"");return m?m[3]+"."+m[2]+"."+m[1]:dstr(r.ts).slice(0,10)}
function isoOf(t){var m=/^(\d{2})\.(\d{2})\.(\d{4})/.exec(String(t||"").trim());return m?m[3]+"-"+m[2]+"-"+m[1]:""}
function tsOf(t){var m=/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/.exec(String(t||"").trim());return m?new Date(+m[3],m[2]-1,+m[1],+m[4],+m[5]).getTime():0}
function pad(n){return(n<10?"0":"")+n}
function dstr(ts){var d=new Date(ts);return pad(d.getDate())+"."+pad(d.getMonth()+1)+"."+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes())}
function ymd(ts){var d=new Date(ts);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function qc(v){v=String(v==null?"":v);return/[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
