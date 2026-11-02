// Группа 8: структура кода.
// - ни одно глобальное имя (функция или переменная верхнего уровня) не объявлено дважды во всех скриптах;
// - набор глобальных имён совпадает с эталоном (ничего не потеряно при переносе кода);
// - пути к файлам относительные, файлы существуют;
// - после загрузки страницы каждое имя доступно в window с тем же типом, ошибок в консоли нет.
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const { ROOT, open } = require('../lib/app');

const BASE = path.join(__dirname, '..', 'baseline', 'globals.json');

function collect() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = [];
  const refs = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = /\ssrc\s*=\s*["']([^"']+)["']/i.exec(m[1]);
    if (src) { refs.push(src[1]); scripts.push({ name: src[1], file: src[1].split('?')[0] }); }
    else scripts.push({ name: 'index.html (встроенный №' + (scripts.length + 1) + ')', code: m[2] });
  }
  const lre = /<link([^>]*)>/gi;
  while ((m = lre.exec(html))) {
    const href = /\shref\s*=\s*["']([^"']+)["']/i.exec(m[1]);
    if (href && /stylesheet/i.test(m[1])) refs.push(href[1]);
  }
  return { scripts, refs };
}

function declared(code) {
  const ast = acorn.parse(code, { ecmaVersion: 2020, sourceType: 'script' });
  const out = [];
  ast.body.forEach((n) => {
    if (n.type === 'FunctionDeclaration') out.push({ name: n.id.name, kind: 'function' });
    if (n.type === 'VariableDeclaration') n.declarations.forEach((d) => { if (d.id.type === 'Identifier') out.push({ name: d.id.name, kind: 'var' }); });
  });
  return out;
}

module.exports = async function (browser, t, opts) {
  const { scripts, refs } = collect();
  // пути
  refs.forEach((r) => {
    t.eq(`путь относительный: ${r}`, /^(\/|[a-z]+:)/i.test(r), false);
    t.eq(`файл существует: ${r}`, fs.existsSync(path.join(ROOT, r.split('?')[0])), true);
  });
  // имена
  const seen = {};
  const dups = [];
  scripts.forEach((s) => {
    const code = s.code != null ? s.code : fs.readFileSync(path.join(ROOT, s.file), 'utf8');
    let list = [];
    try { list = declared(code); } catch (e) { t.fail(`скрипт разбирается: ${s.name}`, e.message); return; }
    list.forEach((d) => {
      if (seen[d.name]) dups.push(`${d.name} (${seen[d.name]} и ${s.name})`);
      else seen[d.name] = s.name;
    });
    s.decl = list;
  });
  t.eq('нет повторно объявленных глобальных имён', dups, []);
  const now = {};
  scripts.forEach((s) => (s.decl || []).forEach((d) => { now[d.name] = d.kind; }));
  const sorted = Object.fromEntries(Object.keys(now).sort().map((k) => [k, now[k]]));
  if (opts.update) {
    fs.mkdirSync(path.dirname(BASE), { recursive: true });
    fs.writeFileSync(BASE, JSON.stringify(sorted, null, 1) + '\n');
    t.note(`эталон глобальных имён записан: ${Object.keys(sorted).length}`);
  }
  const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const lost = Object.keys(base).filter((k) => !(k in sorted));
  const added = Object.keys(sorted).filter((k) => !(k in base));
  t.eq('глобальные имена: ничего не потеряно', lost, []);
  t.eq('глобальные имена: ничего не добавлено', added, []);
  t.eq('функций верхнего уровня', Object.values(sorted).filter((k) => k === 'function').length, Object.values(base).filter((k) => k === 'function').length);
  // запуск
  const { page, errors, ctx } = await open(browser, {});
  const types = await page.evaluate((names) => names.map((n) => [n, typeof window[n]]), Object.keys(base));
  const wrong = types.filter(([n, ty]) => base[n] === 'function' && ty !== 'function').map(([n]) => n);
  t.eq('после загрузки все функции доступны', wrong, []);
  t.eq('загрузка: ошибок в консоли нет', errors, []);
  await ctx.close();
};
