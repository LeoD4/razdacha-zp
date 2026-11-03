// Самопроверка: проверки разделения действительно ловят нарушения.
// Во временной папке вне проекта собирается сайт, разделённый на 6 файлов строго по плану (из исходного кода
// stable-before-split), — он должен проходить все статические проверки. Затем на его копиях делаются нарушения:
// отсутствующий файл, перестановка тегов, изменение одного символа, дублирование функции, сдвиг строк запуска.
// Каждое нарушение должно быть обнаружено. Рабочая копия проекта не изменяется.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ROOT, open, fixture } = require('../lib/app');
const S = require('../lib/source');
const K = require('../lib/checks');
const { FILES, build, chunks } = require('../lib/split');

function site(files, order) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razdacha-neg-'));
  fs.mkdirSync(path.join(dir, 'css')); fs.mkdirSync(path.join(dir, 'js'));
  fs.copyFileSync(path.join(ROOT, 'css', 'style.css'), path.join(dir, 'css', 'style.css'));
  Object.keys(files).forEach((f) => fs.writeFileSync(path.join(dir, f), files[f]));
  const html = S.origHtml().toString('utf8');
  const a = html.indexOf('<style>'), b = html.indexOf('</style>') + '</style>'.length;
  const c = html.indexOf('<script>'), d = html.indexOf('</script>') + '</script>'.length;
  const tags = (order || FILES).map((f) => `<script src="${f}"></script>`).join('\n');
  fs.writeFileSync(path.join(dir, 'index.html'), html.slice(0, a) + '<link rel="stylesheet" href="css/style.css">' + html.slice(b, c) + tags + html.slice(d));
  return dir;
}

function report(dir, orig) {
  const SR = K.scriptReport(dir);
  const ST = K.statementReport(orig, K.fileTexts(dir, SR));
  return { SR, ST };
}

module.exports = async function (browser, t) {
  const orig = S.origJs().toString('utf8');
  const split = build(orig, FILES.slice(0, 5));
  const dirs = [];
  const mk = (files, order) => { const d = site(files, order); dirs.push(d); return d; };
  try {
    // Контрольный образец: разделение строго по плану.
    {
      const d = mk(split);
      const { SR, ST } = report(d, orig);
      t.eq('образец по плану: 6 файлов, 151 инструкция, нарушений нет', {
        files: SR.files, missing: ST.missing.length, extra: ST.extra.length, dupes: ST.dupes.length, order: ST.badOrder.length, sep: ST.badSep.length,
        exec: ST.execOrderOk, startup: ST.startupLast, tryOk: ST.tryAfterDecls, tags: SR.orderOk && SR.appLast && !SR.missingFiles.length && !SR.orphanFiles.length,
      }, { files: FILES, missing: 0, extra: 0, dupes: 0, order: 0, sep: 0, exec: true, startup: true, tryOk: true, tags: true });
      t.eq('образец по плану: js/app.js — только 4 строки запуска', split['js/app.js'], 'migrate();migCash();\nif(C.draft)C.draft.pdate="";\nrender();\ninitCloud();\n');
      const s = await open(browser, { url: 'file://' + path.join(d, 'index.html'), storage: fixture('shift-26-10') });
      const ok = await s.page.evaluate(() => typeof render === 'function' && document.querySelectorAll('#app nav button').length === 5);
      t.eq('образец по плану: открывается в браузере, меню отрисовано, ошибок нет', [ok, s.errors], [true, []]);
      await s.ctx.close();
    }
    // 1. Отсутствующий JS-файл.
    {
      const d = mk(split); fs.unlinkSync(path.join(d, 'js', 'calc.js'));
      const { SR, ST } = report(d, orig);
      t.eq('нарушение «нет файла js/calc.js»: обнаружено отсутствие файла', SR.missingFiles, ['js/calc.js']);
      t.eq('нарушение «нет файла js/calc.js»: обнаружены пропавшие инструкции', ST.missing.length, chunks(split['js/calc.js']).list.length);
      const s = await open(browser, { url: 'file://' + path.join(d, 'index.html'), storage: fixture('shift-26-10') });
      t.eq('нарушение «нет файла js/calc.js»: в браузере появляются ошибки', s.errors.length > 0, true);
      await s.ctx.close();
    }
    // 2. Перестановка тегов подключения.
    {
      const order = FILES.slice(); [order[1], order[2]] = [order[2], order[1]]; // calc раньше store
      const { SR } = report(mk(split, order), orig);
      t.eq('нарушение «calc.js подключён раньше store.js»: порядок подключения обнаружен', SR.orderOk, false);
      const order2 = FILES.slice(0, 4).concat(['js/app.js', 'js/views.js']);
      const r2 = report(mk(split, order2), orig);
      t.eq('нарушение «app.js не последний»: обнаружено', [r2.SR.appLast, r2.SR.orderOk, r2.ST.startupLast], [false, false, false]);
    }
    // 3. Изменение одного символа в инструкции.
    {
      const files = { ...split };
      const before = files['js/calc.js'];
      files['js/calc.js'] = before.replace('Math.floor(a/100)*100', 'Math.floor(a/100)*101');
      const { ST } = report(mk(files), orig);
      t.eq('нарушение «изменён один символ в curRows»: замена в файле произошла', files['js/calc.js'] !== before, true);
      t.eq('нарушение «изменён один символ в curRows»: обнаружены изменённая и пропавшая инструкции', [ST.extra.length, ST.missing], [1, ['curRows']]);
    }
    // 4. Дублирование функции.
    {
      const files = { ...split };
      const fmt = chunks(files['js/utils.js']).list.find((c) => c.name === 'fmt').text;
      files['js/views.js'] = files['js/views.js'] + fmt + '\n';
      const { ST } = report(mk(files), orig);
      t.eq('нарушение «функция fmt в двух файлах»: обнаружен повтор', ST.dupes, ['fmt ×2']);
    }
    // 5. Строки запуска не в конце.
    {
      const files = { ...split };
      files['js/views.js'] = files['js/views.js'] + 'render();\n';
      files['js/app.js'] = 'migrate();migCash();\nif(C.draft)C.draft.pdate="";\ninitCloud();\n';
      const { ST } = report(mk(files), orig);
      t.eq('нарушение «render() перенесён из app.js»: порядок запуска обнаружен', [ST.startupLast, ST.badOrder.length === 0 && ST.execOrderOk], [false, false]);
    }
  } finally {
    dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
  }
};
