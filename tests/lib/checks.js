// Статические проверки разделения JavaScript на файлы (без браузера).
// Используются группой «Защита переноса» и самопроверкой «Отрицательные сценарии».
const fs = require('fs');
const path = require('path');
const { FILES, chunks } = require('./split');
const { scriptsOf, APP_DIV } = require('./source');

const SRC_RE = /^(js\/[a-z]+\.js)(\?v=([\w.-]+))?$/;

// Подключение скриптов и стилей в index.html.
function scriptReport(root) {
  const page = scriptsOf(fs.readFileSync(path.join(root, 'index.html')));
  const S = page.scripts;
  const srcs = S.map((x) => x.src);
  const files = srcs.map((s) => { const m = s && SRC_RE.exec(s); return m ? m[1] : null; });
  const versions = S.map((x) => { const m = x.src && SRC_RE.exec(x.src); return m ? (m[3] || '') : null; });
  const css = /<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i.exec(page.html);
  const cssV = css && /\?v=([\w.-]+)$/.exec(css[1]);
  const known = files.filter((f) => f && FILES.includes(f));
  const onDisk = fs.existsSync(path.join(root, 'js')) ? fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f) : [];
  return {
    list: srcs.map((s) => s || 'встроенный'),
    badPath: srcs.filter((s, i) => !s || !files[i]).map((s) => s || 'встроенный'),
    unknown: files.filter((f) => f && !FILES.includes(f)),
    duplicates: known.filter((f, i) => known.indexOf(f) !== i),
    orderOk: known.every((f, i) => i === 0 || FILES.indexOf(known[i - 1]) < FILES.indexOf(f)),
    appLast: files[files.length - 1] === 'js/app.js',
    missingFiles: known.filter((f) => !fs.existsSync(path.join(root, f))),
    orphanFiles: onDisk.filter((f) => !known.includes(f)),
    afterApp: page.appDivPos >= 0 && S.every((x) => x.pos > page.appDivPos),
    badAttrs: S.filter((x) => /\basync\b|\bdefer\b|type\s*=\s*["']?module/i.test(x.attrs)).map((x) => x.src || 'встроенный'),
    inlineLeft: S.filter((x) => x.inline && x.inline.toString().trim()).length,
    // ?v=: либо ни у одного локального ресурса, либо у всех одно и то же значение
    versions: [...new Set(versions.concat(css ? [cssV ? cssV[1] : ''] : []))],
    cssHref: css ? css[1] : null,
    page, files,
  };
}

// Инструкции верхнего уровня всех подключённых файлов против исходного кода.
function statementReport(origText, fileTexts) {
  const O = chunks(origText).list;
  const idx = new Map(O.map((c, i) => [c.text, i]));
  const seen = new Array(O.length).fill(0);
  const extra = [], badOrder = [], badSep = [], global = [];
  fileTexts.forEach(({ file, text }) => {
    let ch;
    try { ch = chunks(text); } catch (e) { extra.push(`${file}: не разбирается (${e.message})`); return; }
    if (!/^\s*$/.test(ch.tail)) badSep.push(`${file}: лишний текст в конце`);
    let prev = -1;
    ch.list.forEach((c, k) => {
      if (!/^\s*$/.test(c.sep)) badSep.push(`${file}: лишний текст перед инструкцией ${k + 1}`);
      const i = idx.get(c.text);
      if (i === undefined) { extra.push(`${file}: инструкция ${k + 1} (${c.name || c.text.slice(0, 40)}) отличается от исходной или лишняя`); return; }
      seen[i]++;
      if (i < prev) badOrder.push(`${file}: «${c.name || c.text.slice(0, 30)}» стоит раньше, чем в исходном коде`);
      prev = Math.max(prev, i);
      global.push(i);
    });
  });
  const missing = O.map((c, i) => (seen[i] === 0 ? (c.name || c.text.slice(0, 40)) : null)).filter(Boolean);
  const dupes = O.map((c, i) => (seen[i] > 1 ? `${c.name || c.text.slice(0, 40)} ×${seen[i]}` : null)).filter(Boolean);
  // порядок выполнения при загрузке
  const execIdx = O.map((c, i) => (c.kind === 'exec' ? i : -1)).filter((i) => i >= 0);
  const startup = execIdx.filter((i) => !/^try\s*\{/.test(O[i].text));
  const tryIdx = execIdx.find((i) => /^try\s*\{/.test(O[i].text));
  const pos = (i) => global.indexOf(i);
  const execOrder = global.filter((i) => execIdx.includes(i));
  const declIdx = (name) => O.findIndex((c) => c.kind === 'var' && c.text.includes('var ' + name + '=') || (c.kind === 'var' && new RegExp('[ ,]' + name + '=').test(c.text)));
  const iKEY = declIdx('KEY'), iDEF = declIdx('DEF'), iC = declIdx('C');
  return {
    total: O.length, found: global.length, missing, extra, dupes, badOrder, badSep,
    execOrderOk: JSON.stringify(execOrder) === JSON.stringify(execIdx),
    startupLast: JSON.stringify(global.slice(-startup.length)) === JSON.stringify(startup),
    tryAfterDecls: [iKEY, iDEF, iC].every((d) => pos(d) >= 0 && pos(d) < pos(tryIdx)),
    defBeforeC: pos(iDEF) >= 0 && pos(iDEF) < pos(iC),
    startupCount: startup.length, execCount: execIdx.length,
  };
}

// Тексты всех подключённых файлов по порядку.
function fileTexts(root, report) {
  return report.files.filter(Boolean).map((f) => ({ file: f, text: fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f), 'utf8') : '' }));
}

module.exports = { scriptReport, statementReport, fileTexts, APP_DIV };
