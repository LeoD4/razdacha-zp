// Защита переноса JavaScript (подготовка к этапу 2).
// Сравнивает текущий JavaScript с исходным из ветки stable-before-split (коммит aac1f26):
//  2.1 функции, объявленные и неявные глобальные переменные, их типы и постоянные значения;
//  2.2 побайтовое совпадение каждой из 151 инструкции верхнего уровня (код может быть разделён на файлы);
//  2.3 все 53 назначения обработчиков (порядок — внутри каждой функции) и порядок bind() → renderPlan() → bindPlan();
//  2.4 подключение файлов js/*.js: согласованный порядок, синхронная загрузка, порядок выполнения при загрузке.
// Эталон-перечень tests/baseline/js-structure.json снимается командой --update только из исходного кода.
const fs = require('fs');
const path = require('path');
const { ROOT, open, fixture, tab } = require('../lib/app');
const S = require('../lib/source');
const K = require('../lib/checks');
const { FILES } = require('../lib/split');

const INV = path.join(__dirname, '..', 'baseline', 'js-structure.json');
const OWNERS = { bind: 46, bindPlan: 4, renderEmp: 2, render: 1 }; // согласовано владельцем
const STABLE = ['KEY', 'D', 'ALLD', 'OLDD', 'DEF', 'PEN', 'IC', 'GS_URL', 'SHEET_ID', 'AW_L', 'AW_LW', 'AW_U', 'AW_UW', 'JN', 'JH'];

// Состояние страницы после загрузки: типы всех глобальных имён, постоянные значения, порядок вызовов при входе в «Выплаты».
async function runtime(browser, url, names) {
  const s = await open(browser, { url, storage: fixture('shift-26-10'), probe: true });
  s.page.setDefaultTimeout(5000);
  try {
  const r = await s.page.evaluate(({ names, stable }) => ({
    types: Object.fromEntries(names.map((n) => [n, n in window ? typeof window[n] : 'нет'])),
    stable: Object.fromEntries(stable.map((n) => [n, JSON.stringify(window[n])])),
    firstRender: window.__firstRender || '',
  }), { names, stable: STABLE });
  await s.page.evaluate(() => {
    window.__seq = [];
    ['bind', 'renderPlan', 'bindPlan'].forEach((n) => { const f = window[n]; window[n] = function () { window.__seq.push(n); return f.apply(this, arguments); }; });
  });
  await tab(s.page, 'tab');
  r.seq = await s.page.evaluate(() => window.__seq);
  r.errors = s.errors;
  return r;
  } catch (e) {
    // приложение не загрузилось или меню не отрисовано: проверки ниже упадут с понятными значениями, остальные продолжатся
    return { types: {}, stable: {}, firstRender: 'не загрузилось', seq: [], errors: s.errors.concat('не загрузилось: ' + e.message.split('\n')[0]) };
  } finally { await s.ctx.close(); }
}

module.exports = async function (browser, t, opts) {
  // --- исходный код ---
  const ref = S.origRef();
  t.eq(`ветка ${S.ORIG_BRANCH} указывает на ${S.ORIG_COMMIT}`, ref.sha.slice(0, 7), S.ORIG_COMMIT);
  const orig = S.origJs();
  const O = S.structure(orig);
  const names = [...O.fns, ...O.vars, ...O.implicit];

  // --- эталон-перечень: снимается только из исходной версии ---
  const origDir = S.origSiteDir();
  const R0 = await runtime(browser, 'file://' + path.join(origDir, 'index.html'), names);
  fs.rmSync(origDir, { recursive: true, force: true });
  const live = {
    source: `${S.ORIG_BRANCH} ${ref.sha}`,
    bytes: orig.length,
    counts: { functions: O.fns.length, declaredVars: O.vars.length, implicitVars: O.implicit.length, structureNames: O.fns.length + O.vars.length, allNames: names.length },
    functions: O.fns, declaredVars: O.vars, implicitVars: O.implicit,
    types: R0.types, stableValues: R0.stable,
    handlers: O.handlers.map(({ line, ...h }) => h), handlerLines: O.handlers.map((h) => h.line),
    order: O.order, runtimeOrder: R0.seq, firstRender: R0.firstRender,
  };
  if (opts.update) { fs.writeFileSync(INV, JSON.stringify(live, null, 1) + '\n'); t.note('перечень js-structure.json записан из ' + live.source); }
  const inv = JSON.parse(fs.readFileSync(INV, 'utf8'));
  t.eq('перечень js-structure.json совпадает с исходным кодом stable-before-split', JSON.stringify(inv), JSON.stringify(live));
  t.eq('исходная версия: ошибок в консоли нет', R0.errors, []);

  // согласованные владельцем числа (не зависят от перечня)
  t.eq('исходный код: 131 функция верхнего уровня', inv.counts.functions, 131);
  t.eq('исходный код: 45 объявленных глобальных переменных', inv.counts.declaredVars, 45);
  t.eq('исходный код: неявные глобальные — r и o', inv.implicitVars, ['r', 'o']);
  t.eq('исходный код: 176 имён структурного эталона (функции + объявленные переменные)', inv.counts.structureNames, 176);
  t.eq('исходный код: 178 имён вместе с r и o', inv.counts.allNames, 178);

  // --- 2.2 побайтовое совпадение каждой инструкции ---
  const cur = S.currentJs(ROOT);
  const buf = cur.buf;
  const SR = K.scriptReport(ROOT);
  const texts = K.fileTexts(ROOT, SR);
  const ST = K.statementReport(orig.toString('utf8'), texts);
  t.eq('инструкции: исходных инструкций верхнего уровня 151', ST.total, 151);
  t.eq('инструкции: все 151 найдены, каждая побайтово совпадает с исходной (stable-before-split)', ST.missing, []);
  t.eq('инструкции: нет изменённых и лишних', ST.extra, []);
  t.eq('инструкции: каждая встречается ровно один раз', ST.dupes, []);
  t.eq('инструкции: внутри каждого файла исходный относительный порядок', ST.badOrder, []);
  t.eq('инструкции: между ними только переводы строк (нет постороннего кода и комментариев)', ST.badSep, []);
  t.eq('выполнение при загрузке: 6 исполняемых инструкций в исходном порядке', [ST.execCount, ST.execOrderOk], [6, true]);
  t.eq('выполнение при загрузке: 5 инструкций запуска — последние, в исходном порядке', [ST.startupCount, ST.startupLast], [5, true]);
  t.eq('выполнение при загрузке: чтение localStorage (try) после объявлений KEY, DEF, C', ST.tryAfterDecls, true);
  t.eq('выполнение при загрузке: DEF объявлен раньше C', ST.defBeforeC, true);
  texts.forEach(({ file }) => {
    const b = fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file)) : Buffer.alloc(0);
    t.eq(`${file}: нет метки BOM, корректная кодировка UTF-8`, [b.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), Buffer.from(b.toString('utf8'), 'utf8').equals(b)], [false, true]);
  });

  // --- 2.1 имена и типы ---
  let C;
  try { C = S.structure(buf); } catch (e) { t.fail('текущий JavaScript разбирается', e.message); return; }
  const lost = (a, b) => a.filter((x) => !b.includes(x));
  t.eq('функции: ни одна не удалена и не переименована', lost(inv.functions, C.fns), []);
  t.eq('функции: новых нет', lost(C.fns, inv.functions), []);
  t.eq('функции: количество объявлений = 131', C.fns.length, 131);
  t.eq('переменные: ни одна не удалена и не переименована', lost(inv.declaredVars, C.vars), []);
  t.eq('переменные: новых нет', lost(C.vars, inv.declaredVars), []);
  t.eq('переменные: количество объявлений = 45', C.vars.length, 45);
  t.eq('неявные глобальные r и o сохранены', C.implicit, ['r', 'o']);
  t.eq('неиспользуемые функции nm и salOf на месте', ['nm', 'salOf'].filter((f) => C.fns.includes(f)), ['nm', 'salOf']);
  const R = await runtime(browser, undefined, names);
  const badType = names.filter((n) => R.types[n] !== inv.types[n]).map((n) => `${n}: ${R.types[n]} (эталон ${inv.types[n]})`);
  t.eq('после загрузки все 178 имён есть в window с теми же типами', badType, []);
  t.eq('r и o существуют после загрузки', ['r', 'o'].map((n) => R.types[n] !== 'нет'), [true, true]);
  const badVal = STABLE.filter((n) => R.stable[n] !== inv.stableValues[n]);
  t.eq(`постоянные значения не изменились (${STABLE.length}: ${STABLE.join(', ')})`, badVal, []);
  t.eq('текущая версия: ошибок в консоли нет', R.errors, []);

  // --- 2.3 обработчики ---
  const key = (h) => `${h.owner} | ${h.event} | ${h.target}`;
  const ih = inv.handlers.map(key), ch = C.handlers.map(key);
  t.eq('обработчики: всего 53 назначения', C.handlers.length, 53);
  const by = {}; C.handlers.forEach((h) => { by[h.owner] = (by[h.owner] || 0) + 1; });
  const srt = (o) => Object.fromEntries(Object.keys({ ...OWNERS, ...by }).sort().map((k) => [k, o[k] || 0]));
  t.eq('обработчики по функциям: bind 46, bindPlan 4, renderEmp 2, render 1', srt(by), srt(OWNERS));
  t.eq('обработчики: все цели распознаны', C.handlers.filter((h) => h.target === '?').map(key), []);
  t.eq('обработчики: ни один не потерян (функция | событие | элемент)', lost(ih, ch), []);
  t.eq('обработчики: нет новых или изменённых', lost(ch, ih), []);
  const cnt = (a) => a.reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {});
  const ci = cnt(ih), cc = cnt(ch);
  t.eq('обработчики: нет неожиданных дубликатов', Object.keys(cc).filter((k) => cc[k] !== ci[k]).map((k) => `${k}: ${cc[k]} (эталон ${ci[k] || 0})`), []);
  const perOwner = (H) => H.reduce((m, h) => { (m[h.owner] = m[h.owner] || []).push(`${h.event} | ${h.target}`); return m; }, {});
  const po = perOwner(inv.handlers), pc = perOwner(C.handlers);
  t.eq('обработчики: порядок назначения внутри каждой функции не изменился', Object.keys(po).filter((o) => JSON.stringify(po[o]) !== JSON.stringify(pc[o])), []);
  t.eq('#pdate: два события в bind() — oninput и onchange', C.handlers.filter((h) => h.target === '#pdate' && h.owner === 'bind').map((h) => h.event).sort(), ['onchange', 'oninput']);
  t.eq('порядок: bind() вызывает renderPlan() один раз прямо в теле', C.order.renderPlanCallsInBind, 1);
  t.eq(`порядок: renderPlan() вызывается после ${inv.order.bindHandlersBeforeRenderPlan} назначений в bind()`, C.order.bindHandlersBeforeRenderPlan, inv.order.bindHandlersBeforeRenderPlan);
  t.eq('порядок: renderPlan() заканчивается вызовом bindPlan()', C.order.renderPlanEndsWithBindPlan, true);
  t.eq('порядок: кто вызывает bind, renderPlan, bindPlan — как в исходном', C.order, inv.order);
  t.eq('порядок при входе в «Выплаты»: bind → renderPlan → bindPlan', R.seq.slice(0, 3), ['bind', 'renderPlan', 'bindPlan']);
  t.eq('порядок вызовов при входе в «Выплаты» совпадает с исходным', R.seq, inv.runtimeOrder);

  // --- 2.4 подключение скриптов ---
  t.eq('приложение рисует #app синхронно, пока документ загружается', R.firstRender, 'loading');
  t.eq('все скрипты стоят после <div id="app"></div>', SR.afterApp, true);
  t.eq('ни у одного скрипта нет async / defer / type="module"', SR.badAttrs, []);
  t.eq('встроенного кода в index.html не осталось', SR.inlineLeft, 0);
  t.eq('пути скриптов относительные, вида js/имя.js (допускается ?v=)', SR.badPath, []);
  t.eq(`подключаются только файлы плана (${FILES.join(', ')})`, SR.unknown, []);
  t.eq('каждый файл подключён один раз', SR.duplicates, []);
  t.eq('порядок подключения: utils → store → calc → sheets → views → app', SR.orderOk, true);
  t.eq('js/app.js подключён последним', SR.appLast, true);
  t.eq('все подключённые файлы существуют', SR.missingFiles, []);
  t.eq('в папке js/ нет неподключённых файлов', SR.orphanFiles, []);
  t.eq('версия ?v= одинакова у всех локальных CSS и JS (или её нет ни у одного)', SR.versions.length, 1);
};
