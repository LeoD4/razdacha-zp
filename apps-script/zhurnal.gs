// Журнал выплат для сайта «Раздача ЗП».
//
// Как подключить (один раз):
// 1. Google Таблица → Расширения → Apps Script (скрипт, где есть doGet и doPost).
// 2. Слева «+» → «Скрипт», назовите файл «zhurnal» и вставьте в него этот код целиком.
// 3. В doGet сразу ПОСЛЕ строки с проверкой PIN
//      if (PIN && String(p.pin || '') !== PIN) return json_({ ok: false, error: 'pin' });
//    добавьте:
//      if (p.action === 'ver') return json_({ ok: true, v: 2 });
// 4. В doPost сразу ПОСЛЕ строки с проверкой PIN
//      if (PIN && String(blk.pin || '') !== PIN) return json_({ ok: false, error: 'pin' });
//    добавьте:
//      if (blk.action === 'pay') return json_(payPost(blk));
// 5. Сохраните, затем Развернуть → Управление развёртываниями → карандаш →
//    Версия: «Новая версия» → Развернуть. Ссылка /exec не меняется.
//
// Повторная отправка тех же строк ничего не задваивает: строка с уже записанным
// «ID строки» пропускается, а «Аванс» и «Остаток» на листе смены меняются только
// при первой записи строки.

var PAY_SHEET = 'Журнал выплат';
var PAY_HDR = ['Операция', 'ID строки', 'Дата смены', 'Дата выдачи', 'Тип', 'Сотрудник', 'Сумма, ₽', 'Купюры', 'Статус', 'Записано'];

function payPost(d) {
  var lock = LockService.getScriptLock(), own = !lock.hasLock();
  if (own) lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : SHEET_ID);
    var J = ss.getSheetByName(PAY_SHEET);
    if (!J) {
      J = ss.insertSheet(PAY_SHEET);
      J.getRange(1, 1, 1, PAY_HDR.length).setValues([PAY_HDR]).setFontWeight('bold');
      J.setFrozenRows(1);
    }
    var last = J.getLastRow(), have = {};
    if (last > 1) J.getRange(2, 2, last - 1, 1).getDisplayValues().forEach(function (r) { have[String(r[0])] = 1; });
    var add = [], fresh = [];
    (d.lines || []).forEach(function (l) {
      if (have[l.id]) return;
      have[l.id] = 1;
      add.push([l.op, l.id, l.sdate, l.pdate, l.type, l.n, l.amt, l.bills, l.st, l.ts]);
      fresh.push(l);
    });
    if (add.length) {
      var rg = J.getRange(J.getLastRow() + 1, 1, add.length, PAY_HDR.length);
      rg.setNumberFormat('@');
      rg.setValues(add);
      J.getRange(rg.getRow(), 7, add.length, 1).setNumberFormat('#,##0');
    }
    var bad = 0;
    fresh.forEach(function (l) {
      try { payBump(ss, l); } catch (err) { bad++; }
    });
    return { ok: true, added: add.length, skipped: (d.lines || []).length - add.length,
             warn: bad ? 'Не обновлены суммы на листах смен: ' + bad + '.' : '' };
  } finally {
    if (own) lock.releaseLock();
  }
}

// «Аванс» += сумма аванса, «Остаток» −= любая выплата; в строке сотрудника и в строке «Итого».
function payBump(ss, l) {
  if (!l.sheet) return;
  var sh = ss.getSheetByName(l.sheet);
  if (!sh) return;
  var v = sh.getDataRange().getValues();
  var H = (v[2] || []).map(String), cA = H.indexOf('Аванс'), cO = H.indexOf('Остаток');
  for (var i = 3; i < v.length; i++) {
    var nm = String(v[i][0]).trim();
    if (nm !== l.n && nm !== 'Итого') continue;
    if (l.kind === 'adv' && cA >= 0) sh.getRange(i + 1, cA + 1).setValue((Number(v[i][cA]) || 0) + l.amt);
    if (cO >= 0) sh.getRange(i + 1, cO + 1).setValue((Number(v[i][cO]) || 0) - l.amt);
    if (nm === 'Итого') break;
  }
}

