// Разбиение JavaScript на инструкции верхнего уровня и согласованный план раздела по файлам.
// Инструкция = её текст байт в байт; комментарий, стоящий прямо перед инструкцией, считается её частью.
// Между инструкциями допускаются только пробельные символы (переводы строк).
const acorn = require('acorn');

// Канонический порядок подключения (согласован владельцем): utils → store → calc → sheets → views → app.
const FILES = ['js/utils.js', 'js/store.js', 'js/calc.js', 'js/sheets.js', 'js/views.js', 'js/app.js'];

// План: функции по файлам (аудит 03.11.2026).
const GROUPS = {
  'js/utils.js': 'fmt lab pa nm txt esc z cnt pl3 lst kgn fmtk pad dstr ymd todayISO ddate dd tname isoOf tsOf qc',
  'js/store.js': 'setCloud saveLocal save schedPush doPush initCloud migrate migCash cashBox hist boats stages pays sidCur resetShift draft getMe setMe subReports publishReport',
  'js/calc.js': 'rateOf autoOf amtOf presentOf pkg infoSt warnK bankAuto bankOf curRows curErr salOf rateOfRow shifts findShift shiftBy paidOf jlines withPaid cashOf billPlan pick alloc gave recv plan exOf exText distAdv payState tsData tsMatrix',
  'js/sheets.js': 'gsUrl gsPin askPin gsGet gsErr sheetErr syncErr inSheet parseShift applyShift loadList loadShift sheetBlock sheetReport sheetDone tsStyle textPx colA syncPay syncGs syncMcp pullPay pullGs mergeRows resolveOps fixImports billsOf',
  'js/views.js': 'viewShift boatsView boatsLine refreshShift addStage viewPeople tsView restoreCard viewPay oldCash advice planHtml renderPlan bindPlan dateOk noDate confirmPay viewLog viewSum closeShift csvOf exportRec nav render renderOwner sLabel shOpts bind renderEmp rowOf',
};
// План: инструкции var — по первому объявленному имени (инструкция переносится целиком).
const VARS = { KEY: 'js/utils.js', DEF: 'js/store.js', C: 'js/store.js', TBO: 'js/views.js', REF: 'js/store.js', PEN: 'js/calc.js', IC: 'js/views.js', ROLE: 'js/store.js', SLIST: 'js/sheets.js', GS_URL: 'js/sheets.js', SHEET_ID: 'js/sheets.js', AW_L: 'js/sheets.js', JN: 'js/sheets.js', NOTE: 'js/views.js' };

const FN_FILE = {};
Object.keys(GROUPS).forEach((f) => GROUPS[f].split(' ').forEach((n) => { FN_FILE[n] = f; }));

// Инструкции файла: [{ text, sep, kind, name, start }]; sep — пробелы перед инструкцией (или перед её комментарием).
function chunks(text) {
  const ast = acorn.parse(text, { ecmaVersion: 5, sourceType: 'script' });
  let prev = 0;
  const out = ast.body.map((n) => {
    const gap = text.slice(prev, n.start);
    const lead = gap.length - gap.replace(/^\s+/, '').length; // пробелы до комментария
    const start = prev + lead;
    const c = {
      text: text.slice(start, n.end), sep: text.slice(prev, start), start,
      kind: n.type === 'FunctionDeclaration' ? 'function' : n.type === 'VariableDeclaration' ? 'var' : 'exec',
      name: n.type === 'FunctionDeclaration' ? n.id.name : n.type === 'VariableDeclaration' ? n.declarations[0].id.name : '',
      comment: text.slice(start, n.start).trim(),
    };
    prev = n.end;
    return c;
  });
  return { list: out, tail: text.slice(prev) };
}

// Файл, в который по плану попадает инструкция исходного кода.
function planFile(c) {
  if (c.kind === 'function') return FN_FILE[c.name];
  if (c.kind === 'var') return VARS[c.name];
  if (/^try\s*\{/.test(c.text)) return 'js/store.js'; // чтение localStorage при загрузке (r, o)
  return 'js/app.js'; // строки запуска
}

// Собирает файлы из исходного кода: перенесены только группы из `moved`, остальное остаётся в js/app.js.
// Порядок инструкций внутри файла — исходный; между соседними (в исходном) инструкциями сохраняется исходный разделитель.
function build(origText, moved) {
  const { list, tail } = chunks(origText);
  const files = {};
  list.forEach((c, i) => {
    let f = planFile(c);
    if (!f) throw new Error('нет места в плане для инструкции ' + (c.name || c.text.slice(0, 30)));
    if (f !== 'js/app.js' && !moved.includes(f)) f = 'js/app.js';
    const F = files[f] || (files[f] = { parts: [], last: -2 });
    F.parts.push((F.last === i - 1 ? c.sep : (F.parts.length ? '\n' : '')) + c.text);
    F.last = i;
  });
  const out = {};
  Object.keys(files).forEach((f) => { out[f] = files[f].parts.join('') + tail; });
  return out;
}

module.exports = { FILES, GROUPS, VARS, chunks, planFile, build };
