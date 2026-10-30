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
// 6. Один раз выберите вверху функцию payFixAll и нажмите «Выполнить»: в уже созданных
//    листах «Зарплата» станет выданной зарплатой, а не суммой к выдаче.
//
// 7. Оформление «Табеля катеров» в листе смены: в doPost сразу ПОСЛЕ строки
//      applyDesign_(sh);
//    добавьте:
//      styleTimesheet_(sh);
//
// Сайт читает журнал тем же запросом (pay с пустым списком строк): в ответе всегда
// приходят все строки листа, и сайт сливает их со своим журналом по «ID строки».
//
// Повторная отправка тех же строк ничего не задваивает: строка с уже записанным
// «ID строки» пропускается, а «Аванс» и «Остаток» на листе смены меняются только
// при первой записи строки.

var PAY_SHEET = 'Журнал выплат';
var PAY_HDR = ['Операция', 'ID строки', 'Дата смены', 'Дата выдачи', 'Тип', 'Сотрудник', 'Сумма, ₽', 'Купюры', 'Статус', 'Записано', 'ID смены', 'Лист смены', 'Метка времени'];

function payPost(d) {
  var lock = LockService.getScriptLock(), own = !lock.hasLock();
  if (own) lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : SHEET_ID);
    var J = ss.getSheetByName(PAY_SHEET);
    if (!J) {
      J = ss.insertSheet(PAY_SHEET);
      J.setFrozenRows(1);
    }
    J.getRange(1, 1, 1, PAY_HDR.length).setValues([PAY_HDR]).setFontWeight('bold');
    var last = J.getLastRow(), have = {};
    if (last > 1) J.getRange(2, 2, last - 1, 1).getDisplayValues().forEach(function (r) { have[String(r[0])] = 1; });
    var add = [], fresh = [];
    (d.lines || []).forEach(function (l) {
      if (have[l.id]) return;
      have[l.id] = 1;
      add.push([l.op, l.id, l.sdate, l.pdate, l.type, l.n, l.amt, l.bills, l.st, l.ts, l.sid || '', l.sheet || '', String(l.tsms || '')]);
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
    var n = J.getLastRow() - 1;
    return { ok: true, added: add.length, skipped: (d.lines || []).length - add.length,
             warn: bad ? 'Не обновлены суммы на листах смен: ' + bad + '.' : '',
             rows: n > 0 ? J.getRange(2, 1, n, PAY_HDR.length).getDisplayValues() : [] };
  } finally {
    if (own) lock.releaseLock();
  }
}

// «Аванс» += сумма аванса, «Остаток» −= любая выплата, затем «Зарплата» пересчитывается
// как выданная зарплата: (Начислено вниз до 100) − Аванс − Остаток. Строка «Итого» — суммы.
function payBump(ss, l) {
  if (!l.sheet) return;
  var sh = ss.getSheetByName(l.sheet);
  if (!sh) return;
  var v = sh.getDataRange().getValues(), c = payCols_(v);
  if (!c) return;
  for (var i = 3; i < c.tot; i++) {
    if (String(v[i][0]).trim() !== l.n) continue;
    if (l.kind === 'adv') v[i][c.a] = (Number(v[i][c.a]) || 0) + l.amt;
    v[i][c.o] = (Number(v[i][c.o]) || 0) - l.amt;
  }
  payRecalc_(sh, v, c);
}

function payCols_(v) {
  var H = (v[2] || []).map(String), c = { r: H.indexOf('Начислено, ₽'), z: H.indexOf('Зарплата'), a: H.indexOf('Аванс'), o: H.indexOf('Остаток'), tot: -1 };
  if (c.r < 0 || c.z < 0 || c.a < 0 || c.o < 0) return null;
  for (var i = 3; i < v.length; i++) if (String(v[i][0]).trim() === 'Итого') { c.tot = i; break; }
  return c.tot < 0 ? null : c;
}

function payRecalc_(sh, v, c) {
  var Z = [], A = [], O = [], sz = 0, sa = 0, so = 0;
  for (var i = 3; i < c.tot; i++) {
    if (String(v[i][0]).trim() === '') { Z.push([v[i][c.z]]); A.push([v[i][c.a]]); O.push([v[i][c.o]]); continue; }
    var due = Math.floor((Number(v[i][c.r]) || 0) / 100) * 100, a = Number(v[i][c.a]) || 0,
        o = v[i][c.o] === '' ? due : (Number(v[i][c.o]) || 0), z = Math.max(0, due - a - o);
    sz += z; sa += a; so += o;
    Z.push([z || '']); A.push([a || '']); O.push([o]);
  }
  Z.push([sz || '']); A.push([sa || '']); O.push([so]);
  var n = c.tot - 2;
  sh.getRange(4, c.z + 1, n, 1).setValues(Z);
  sh.getRange(4, c.a + 1, n, 1).setValues(A);
  sh.getRange(4, c.o + 1, n, 1).setValues(O);
}

// Запустить один раз вручную (выбрать payFixAll и нажать «Выполнить»): переводит
// уже созданные листы смен на новый смысл «Зарплаты» — только выданная зарплата.
function payFixAll() {
  var ss = SpreadsheetApp.openById(typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : SHEET_ID), n = 0;
  ss.getSheets().forEach(function (sh) {
    if (sh.getName() === PAY_SHEET || sh.getLastRow() < 4) return;
    var v = sh.getDataRange().getValues(), c = payCols_(v);
    if (c) { payRecalc_(sh, v, c); n++; }
  });
  Logger.log('Обновлено листов: ' + n);
}

// Оформляет столбец «Сотрудники» у таблицы катеров и «Табель катеров» в цветах шапки листа (ячейка A3).
function styleTimesheet_(sh) {
  var v = sh.getDataRange().getValues(), H = (v[2] || []).map(String), tr = -1, tc = -1;
  for (var r = 0; r < v.length && tr < 0; r++)
    for (var c = 0; c < v[r].length; c++) if (String(v[r][c]).trim() === 'Табель катеров') { tr = r; tc = c; break; }
  var head = sh.getRange(3, 1), bg = head.getBackground(), fg = head.getFontColor();
  var cs = H.indexOf('Сотрудники');
  if (cs >= 0) {
    sh.getRange(3, cs + 1).setBackground(bg).setFontColor(fg).setFontWeight('bold');
    var n = 0; for (var i = 3; i < v.length && String(v[i][0]).trim() !== 'Итого'; i++) n++;
    if (n) sh.getRange(4, cs + 1, n, 1).setWrap(true).setVerticalAlignment('middle');
    sh.setColumnWidth(cs + 1, 240);
  }
  if (tr < 0) return;
  var hr = tr + 1, w = 0, b = 0;
  while (tc + 1 + w < v[hr].length && String(v[hr][tc + 1 + w]).trim() !== '') w++;
  while (hr + 1 + b < v.length && String(v[hr + 1 + b][tc]).trim() !== '') b++;
  sh.getRange(tr + 1, tc + 1).setFontWeight('bold').setFontSize(12);
  sh.getRange(hr + 1, tc + 1, 1, w + 1).setBackground(bg).setFontColor(fg).setFontWeight('bold').setVerticalAlignment('bottom');
  if (w) sh.getRange(hr + 1, tc + 2, 1, w).setTextRotation(90).setHorizontalAlignment('center');
  if (b) {
    sh.getRange(hr + 2, tc + 1, b, 1).setFontWeight('bold');
    if (w) sh.getRange(hr + 2, tc + 2, b, w).setHorizontalAlignment('center').setFontColor('#2e7d32').setFontWeight('bold');
    for (var k = 0; k < b; k += 2) sh.getRange(hr + 2 + k, tc + 1, 1, w + 1).setBackground('#f3f7fb');
  }
  sh.getRange(hr + 1, tc + 1, b + 1, w + 1).setBorder(true, true, true, true, true, true, '#9fb3c8', SpreadsheetApp.BorderStyle.SOLID);
  if (tc > 0) {
    sh.setColumnWidth(tc, 24);
    sh.setColumnWidth(tc + 1, 120);
    if (w) sh.setColumnWidths(tc + 2, w, 32);
  }
}
