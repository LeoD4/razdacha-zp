// Исходный и текущий JavaScript приложения, разбор структуры.
// Исходный код берётся напрямую из git: ветка stable-before-split, которая обязана указывать на коммит aac1f26.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const acorn = require('acorn');
const walk = require('acorn-walk');

const REPO = path.resolve(__dirname, '..', '..');
const ORIG_COMMIT = 'aac1f26';
const ORIG_BRANCH = 'stable-before-split';
const APP_DIV = '<div id="app"></div>';

function git(args) { return execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 64 << 20 }); }

// Коммит ветки stable-before-split (локальной или origin/), без подмены.
function origRef() {
  for (const ref of [ORIG_BRANCH, 'origin/' + ORIG_BRANCH]) {
    try { return { ref, sha: git(['rev-parse', '--verify', '-q', ref + '^{commit}']).toString().trim() }; } catch (e) { /* нет такой ссылки */ }
  }
  return { ref: null, sha: '' };
}

// index.html исходной версии (байты) из ветки stable-before-split.
function origHtml() {
  const { ref, sha } = origRef();
  if (!ref) throw new Error(`ветка ${ORIG_BRANCH} не найдена (git fetch origin ${ORIG_BRANCH})`);
  if (!sha.startsWith(ORIG_COMMIT)) throw new Error(`${ref} указывает на ${sha.slice(0, 7)}, а должна на ${ORIG_COMMIT}`);
  return git(['show', `${sha}:index.html`]);
}

// Все <script> страницы по порядку: встроенные и подключённые файлом.
function scriptsOf(htmlBuf) {
  const html = htmlBuf.toString('utf8');
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const src = /\ssrc\s*=\s*["']([^"']*)["']/i.exec(attrs);
    out.push({
      pos: m.index, attrs, src: src ? src[1] : null,
      inline: src ? null : Buffer.from(m[2].replace(/^\n/, ''), 'utf8'), // одна новая строка после <script> — часть разметки
    });
  }
  return { html, scripts: out, appDivPos: html.indexOf(APP_DIV) };
}

// Исходный JavaScript (байты): содержимое встроенного <script> исходного index.html.
function origJs() {
  const s = scriptsOf(origHtml()).scripts.filter((x) => x.inline);
  if (s.length !== 1) throw new Error('в исходном index.html ожидался один встроенный скрипт, найдено ' + s.length);
  return s[0].inline;
}

// Текущий JavaScript: все скрипты страницы по порядку, склеенные (файлы читаются байтами).
function currentJs(root) {
  const page = scriptsOf(fs.readFileSync(path.join(root, 'index.html')));
  const parts = page.scripts.map((x) => (x.inline ? x.inline : fs.readFileSync(path.join(root, x.src.split('?')[0]))));
  return { page, buf: Buffer.concat(parts) };
}

// Исходная версия сайта во временной папке вне проекта (для сравнения поведения при загрузке).
function origSiteDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razdacha-orig-'));
  fs.writeFileSync(path.join(dir, 'index.html'), origHtml());
  return dir;
}

// ---------- разбор структуры ----------

function parse(code) { return acorn.parse(code, { ecmaVersion: 5, sourceType: 'script', locations: true }); }

// Объявления верхнего уровня и «неявные» глобальные: var внутри блоков верхнего уровня (не внутри функций).
function declarations(ast) {
  const fns = [], vars = [], implicit = [];
  ast.body.forEach((n) => {
    if (n.type === 'FunctionDeclaration') fns.push(n.id.name);
    else if (n.type === 'VariableDeclaration') n.declarations.forEach((d) => vars.push(d.id.name));
    else walk.recursive(n, null, {
      Function() { /* внутрь функций не заходим */ },
      VariableDeclaration(v, st, c) { v.declarations.forEach((d) => { implicit.push(d.id.name); if (d.init) c(d.init, st); }); },
    });
  });
  return { fns, vars, implicit };
}

function topFn(ast, pos) {
  const n = ast.body.find((x) => x.type === 'FunctionDeclaration' && pos >= x.start && pos < x.end);
  return n ? n.id.name : '(верхний уровень)';
}

const isFn = (n) => n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration';
const lit = (n) => (n && n.type === 'Literal' && typeof n.value === 'string' ? n.value : null);

// Параметр функции-обработчика forEach: по чему идёт перебор.
function forEachSource(fnNode, anc) {
  const call = anc[anc.indexOf(fnNode) - 1];
  if (!call || call.type !== 'CallExpression' || call.arguments[0] !== fnNode) return null;
  const cal = call.callee;
  if (cal.type !== 'MemberExpression' || cal.property.name !== 'forEach') return null;
  const obj = cal.object;
  if (obj.type === 'ArrayExpression') return { ids: obj.elements.map(lit) };
  if (obj.type === 'CallExpression' && obj.callee.type === 'MemberExpression' && obj.callee.property.name === 'querySelectorAll') return { sel: lit(obj.arguments[0]) };
  return null;
}

// Определяет элемент, на который назначается обработчик.
function resolveTarget(node, anc, pos) {
  if (node.type !== 'Identifier') return '?';
  const name = node.name;
  const fns = anc.filter(isFn).reverse(); // от ближайшей функции наружу
  for (const f of fns) {
    if (f.params.some((p) => p.name === name)) {
      const src = forEachSource(f, anc);
      return src && src.sel ? src.sel : '?';
    }
    let decl = null; // ближайшее предшествующее объявление var name в этой функции (не во вложенных)
    walk.recursive(f.body, null, {
      Function() {},
      VariableDeclarator(d, st, c) { if (d.id.name === name && d.start < pos && (!decl || d.start > decl.start)) decl = d; if (d.init) c(d.init, st); },
    });
    if (decl) return resolveInit(decl.init, anc, f);
  }
  return '?';
}

function resolveInit(init, anc, fn) {
  if (!init || init.type !== 'CallExpression' || init.callee.type !== 'MemberExpression') return '?';
  const meth = init.callee.property.name;
  const a0 = init.arguments[0];
  if (meth === 'getElementById') {
    if (lit(a0) != null) return '#' + lit(a0);
    if (a0 && a0.type === 'Identifier' && fn.params.some((p) => p.name === a0.name)) {
      const src = forEachSource(fn, anc);
      if (src && src.ids) return src.ids.map((x) => '#' + x).join('|');
    }
    return '?';
  }
  if (meth === 'querySelector' && lit(a0) != null) return lit(a0);
  return '?';
}

// Все назначения обработчиков вида элемент.onXXX = ...
function handlers(ast) {
  const out = [];
  walk.ancestor(ast, {
    AssignmentExpression(n, anc) {
      const l = n.left;
      if (l.type !== 'MemberExpression' || l.computed || !/^on[a-z]+$/.test(l.property.name)) return;
      out.push({ owner: topFn(ast, n.start), event: l.property.name, target: resolveTarget(l.object, anc, n.start), line: n.loc.start.line, start: n.start });
    },
  });
  out.sort((a, b) => a.start - b.start);
  return out.map(({ start, ...h }) => h);
}

// Порядок bind() → renderPlan() → bindPlan().
function order(ast) {
  const fn = (name) => ast.body.find((x) => x.type === 'FunctionDeclaration' && x.id.name === name);
  const calls = (node, name) => { const r = []; walk.simple(node, { CallExpression(c) { if (c.callee.type === 'Identifier' && c.callee.name === name) r.push(c); } }); return r; };
  const callers = (name) => ast.body.filter((x) => x.type === 'FunctionDeclaration' && calls(x, name).length).map((x) => x.id.name).sort();
  const b = fn('bind'), rp = fn('renderPlan'), bp = fn('bindPlan');
  // только прямые вызовы в теле bind(), не внутри вложенных обработчиков
  const inBind = b ? b.body.body.filter((st) => st.type === 'ExpressionStatement' && st.expression.type === 'CallExpression' && st.expression.callee.name === 'renderPlan').map((st) => st.expression) : [];
  let before = -1;
  if (b && inBind.length === 1) {
    before = 0;
    walk.simple(b, { AssignmentExpression(n) { if (n.left.type === 'MemberExpression' && !n.left.computed && /^on[a-z]+$/.test(n.left.property.name) && n.start < inBind[0].start) before++; } });
  }
  const last = rp && rp.body.body[rp.body.body.length - 1];
  return {
    renderPlanCallsInBind: inBind.length, // прямой вызов renderPlan() в теле bind()
    renderPlanCallsTotalInBind: b ? calls(b, 'renderPlan').length : 0, // вместе с вызовами из обработчиков
    bindHandlersBeforeRenderPlan: before,
    renderPlanEndsWithBindPlan: !!(last && last.type === 'ExpressionStatement' && last.expression.type === 'CallExpression' && last.expression.callee.name === 'bindPlan'),
    callersOfRenderPlan: callers('renderPlan'),
    callersOfBindPlan: callers('bindPlan'),
    callersOfBind: callers('bind'),
    bindPlanExists: !!bp,
  };
}

function structure(buf) {
  const ast = parse(buf.toString('utf8'));
  return { ...declarations(ast), handlers: handlers(ast), order: order(ast) };
}

module.exports = { REPO, ORIG_COMMIT, ORIG_BRANCH, APP_DIV, origRef, origHtml, origJs, currentJs, scriptsOf, origSiteDir, structure };
