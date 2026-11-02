// Общие помощники для тестов: запуск сайта в Chromium в воспроизводимых условиях.
// - фиксированное время и часовой пояс (одинаковые даты и id при каждом прогоне);
// - предсказуемый Math.random;
// - localStorage заполняется набором данных из tests/fixtures до запуска приложения;
// - все запросы к Google Apps Script перехватываются и записываются, в настоящую таблицу ничего не уходит;
// - при необходимости подставляется имитация облака Claude (window.claude).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : path.resolve(__dirname, '..', '..');
const APP_URL = 'file://' + path.join(ROOT, 'index.html');
const NOW = new Date('2026-11-02T12:00:00+03:00');
const FIX = path.join(__dirname, '..', 'fixtures');
// Адрес сайта для open(). По умолчанию — файл с диска; набор http подставляет адрес локального сервера.
let BASE_URL = APP_URL;
function useUrl(u) { BASE_URL = u || APP_URL; }

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIX, name + '.json'), 'utf8'));
}

// Ответы имитации Apps Script. Формат такой же, как у настоящего zhurnal.gs/doGet/doPost.
function gsReply(req, gs) {
  const u = new URL(req.url());
  if (req.method() === 'GET') {
    const a = u.searchParams.get('action');
    if (a === 'ver') return { ok: true, v: 2 };
    if (a === 'list') return { ok: true, sheets: Object.keys(gs.sheets || {}) };
    if (a === 'get') { const s = (gs.sheets || {})[u.searchParams.get('sheet')]; return s ? { ok: true, rows: s } : { ok: false, error: 'nosheet' }; }
    return { ok: false, error: 'action' };
  }
  let b = {};
  try { b = JSON.parse(req.postData() || '{}'); } catch (e) { /* пусто */ }
  if (b.action === 'pay') return { ok: true, added: (b.lines || []).length, skipped: 0, rows: gs.payRows || [] };
  return { ok: true, sheet: b.title || 'Лист' };
}

// Имитация облака Claude для режима сотрудника.
function cloudScript(reports) {
  return `(() => {
    const reps = ${JSON.stringify(reports)};
    const db = { collection: () => ({ orderBy: () => ({ limit: () => ({ onSnapshot: (ok) => { setTimeout(() => ok({ docs: reps.map(r => ({ data: () => r })) }), 0); } }) }) }) };
    const user = { isOwner: () => Promise.resolve(false), id: () => Promise.resolve('test-user') };
    window.claude = { use: (k) => Promise.resolve(k === 'db' ? db : k === 'user' ? user : null) };
  })();`;
}

async function launch() {
  return chromium.launch();
}

// Открывает сайт. opts: { storage: {ключ: значение}, width, height, gs: {sheets, payRows}, cloud: [отчёты], prompt: 'PIN' }
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width || 390, height: opts.height || 844 },
    deviceScaleFactor: 1, locale: 'ru-RU', timezoneId: 'Europe/Moscow',
  });
  const page = await ctx.newPage();
  const errors = [];
  const net = [];
  const responses = [];
  page.on('response', (r) => responses.push({ status: r.status(), url: r.url() }));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => (opts.prompt != null ? d.accept(opts.prompt) : d.dismiss()));
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => {
    let s = 20261102;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  });
  const storage = opts.storage || {};
  await page.addInitScript((st) => {
    if (sessionStorage.getItem('__seeded')) return;
    localStorage.clear();
    Object.keys(st).forEach((k) => localStorage.setItem(k, typeof st[k] === 'string' ? st[k] : JSON.stringify(st[k])));
    sessionStorage.setItem('__seeded', '1');
  }, storage);
  if (opts.cloud) await page.addInitScript(cloudScript(opts.cloud));
  // Необязательный датчик: в каком состоянии загрузки документа приложение впервые заполнило #app.
  // Обычный синхронный скрипт рисует, пока документ ещё грузится ('loading'); defer/async/module — позже.
  if (opts.probe) await page.addInitScript(() => {
    const mo = new MutationObserver(() => {
      const a = document.getElementById('app');
      if (a && a.childNodes.length && !window.__firstRender) { window.__firstRender = document.readyState; mo.disconnect(); }
    });
    mo.observe(document, { childList: true, subtree: true });
  });
  const gs = opts.gs || {};
  await page.route(/^https:\/\/script\.google(usercontent)?\.com\//, async (route) => {
    const req = route.request();
    net.push({ method: req.method(), url: req.url(), body: req.postData() || null });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gsReply(req, gs)) });
  });
  // Любые другие внешние запросы запрещены: тест не должен ходить в сеть.
  await page.route(/^https?:\/\//, async (route) => {
    const u = route.request().url();
    if (/^https:\/\/script\.google/.test(u)) return route.fallback();
    if (BASE_URL.startsWith('http') && u.startsWith(new URL('.', BASE_URL).href)) return route.continue(); // локальный сервер тестов
    net.push({ method: route.request().method(), url: u, body: null, blocked: true });
    await route.abort();
  });
  await page.goto(opts.url || BASE_URL);
  await settle(page);
  return { ctx, page, errors, net, responses };
}

// Ждёт, пока отработают отложенные вызовы (setTimeout 0, промисы fetch).
async function settle(page) {
  await page.waitForTimeout(60);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 30)));
}

async function tab(page, t) {
  await page.click(`nav button[data-t="${t}"]`);
  await settle(page);
}

async function storageDump(page) {
  return page.evaluate(() => {
    const o = {};
    Object.keys(localStorage).sort().forEach((k) => {
      const v = localStorage.getItem(k);
      try { o[k] = JSON.parse(v); } catch (e) { o[k] = v; }
    });
    return o;
  });
}

module.exports = { ROOT, APP_URL, NOW, fixture, launch, open, settle, tab, storageDump, useUrl };
