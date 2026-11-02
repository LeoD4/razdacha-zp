// Группа 1: сравнение с эталоном.
// Одни и те же сценарии проходят на сайте; после каждого шага снимается HTML #app, всё содержимое localStorage
// и запросы к Google Apps Script. Всё должно совпасть с эталоном, снятым на исходном коммите aac1f26,
// символ в символ. Скриншоты пяти вкладок на ширине 360/390/414 px сравниваются попиксельно.
const fs = require('fs');
const path = require('path');
const { open, fixture, settle, tab, storageDump } = require('../lib/app');

const DIR = path.join(__dirname, '..', 'baseline');
const OUT = path.join(__dirname, '..', 'out');
const TABS = ['shift', 'people', 'sum', 'tab', 'log']; // Смена, Люди, Итог, Выплаты, Журнал

function recorder(s) {
  const snaps = [];
  let seen = 0;
  return {
    snaps,
    async snap(name) {
      await settle(s.page);
      const html = await s.page.$eval('#app', (e) => e.innerHTML);
      const storage = await storageDump(s.page);
      const net = s.net.slice(seen); seen = s.net.length;
      snaps.push({ name, html, storage, net });
    },
  };
}

const SCENARIOS = {
  // Пустое устройство: первый запуск, все вкладки.
  async empty(b) {
    const s = await open(b, {}); const r = recorder(s);
    await r.snap('start');
    for (const t of TABS) { await tab(s.page, t); await r.snap('tab-' + t); }
    return [s, r];
  },
  // Текущая смена 26.10 (обезличена): все вкладки, табель, аванс, закрытие смены и отправка листа в таблицу.
  async shift(b) {
    const s = await open(b, { storage: fixture('shift-26-10'), gs: fixture('gs') }); const r = recorder(s); const p = s.page;
    await r.snap('start');
    await tab(p, 'people'); await r.snap('people');
    await p.click('#tbo summary'); await r.snap('people-tabel');
    await tab(p, 'sum'); await r.snap('sum');
    await tab(p, 'tab'); await r.snap('pay');
    await p.click('button[data-pt="adv"]'); await r.snap('pay-adv');
    await p.fill('#pbud', '30000'); await p.click('#pdist'); await r.snap('pay-adv-dist');
    await p.fill('#pdate', '2026-11-02'); await r.snap('pay-date');
    await tab(p, 'log'); await r.snap('log');
    await tab(p, 'sum'); await p.click('#close'); await r.snap('close-armed');
    await p.click('#close'); await p.waitForTimeout(150); await r.snap('closed');
    return [s, r];
  },
  // Архив: закрытая смена, смена из таблицы, выплаты, касса по сменам, журнал, запись и чтение журнала.
  async archive(b) {
    const s = await open(b, { storage: fixture('archive'), gs: fixture('gs') }); const r = recorder(s); const p = s.page;
    await r.snap('start');
    await p.selectOption('#vsel', 'c1791700000000'); await r.snap('people-past');
    await p.selectOption('#vsel', 's:12.10.2026'); await r.snap('people-table');
    await tab(p, 'sum'); await r.snap('sum');
    await p.selectOption('#ssel', 'c1791700000000'); await r.snap('sum-past');
    await tab(p, 'tab'); await p.selectOption('#psel', 'c1791700000000'); await r.snap('pay-past');
    await tab(p, 'log'); await r.snap('log');
    await p.selectOption('[data-jf="n"]', 'Аз'); await r.snap('log-filter');
    await p.selectOption('[data-jf="n"]', ''); await p.click('#sync'); await p.waitForTimeout(150); await r.snap('log-sync');
    await p.click('#pull'); await p.waitForTimeout(150); await r.snap('log-pull');
    return [s, r];
  },
  // Старый формат данных (до версии 2): миграция при открытии, все вкладки.
  async old(b) {
    const s = await open(b, { storage: fixture('old-v1') }); const r = recorder(s);
    await r.snap('start');
    for (const t of TABS) { await tab(s.page, t); await r.snap('tab-' + t); }
    return [s, r];
  },
  // Загрузка смены из таблицы (Apps Script action=list и action=get).
  async sheetload(b) {
    const s = await open(b, { storage: fixture('shift-26-10'), gs: fixture('gs') }); const r = recorder(s); const p = s.page;
    await tab(p, 'tab'); await r.snap('pay');
    await p.click('#gsload'); await p.waitForTimeout(100); await r.snap('list');
    await p.click('button[data-gl="0"]'); await p.waitForTimeout(100); await r.snap('loaded');
    await tab(p, 'sum'); await r.snap('sum');
    return [s, r];
  },
  // Режим сотрудника (сайт открыт как Claude Artifact, сотрудник не владелец).
  async employee(b) {
    const s = await open(b, { storage: fixture('shift-26-10'), cloud: fixture('cloud-reports') }); const r = recorder(s); const p = s.page;
    await p.waitForTimeout(100); await r.snap('names');
    await p.click('button[data-me="Аз"]'); await r.snap('me');
    return [s, r];
  },
};

function firstDiff(a, b) {
  if (a.length !== b.length) return `число шагов ${a.length}, в эталоне ${b.length}`;
  for (let i = 0; i < a.length; i++) {
    for (const k of ['name', 'html', 'storage', 'net']) {
      const x = JSON.stringify(a[i][k]); const y = JSON.stringify(b[i][k]);
      if (x !== y) {
        let j = 0; while (j < x.length && x[j] === y[j]) j++;
        return `шаг «${b[i].name}», ${k}: с позиции ${j} — сейчас «${x.slice(Math.max(0, j - 40), j + 60)}», в эталоне «${y.slice(Math.max(0, j - 40), j + 60)}»`;
      }
    }
  }
  return '';
}

module.exports = async function (browser, t, opts) {
  fs.mkdirSync(path.join(DIR, 'scenarios'), { recursive: true });
  for (const [name, run] of Object.entries(SCENARIOS)) {
    const [s, r] = await run(browser);
    const file = path.join(DIR, 'scenarios', name + '.json');
    if (opts.update) fs.writeFileSync(file, JSON.stringify(r.snaps, null, 1) + '\n');
    const base = JSON.parse(fs.readFileSync(file, 'utf8'));
    const d = firstDiff(r.snaps, base);
    if (d) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(r.snaps, null, 1)); }
    t.eq(`эталон «${name}»: ${base.length} шагов совпадают`, d, '');
    t.eq(`эталон «${name}»: ошибок в консоли нет`, s.errors, []);
    t.eq(`эталон «${name}»: внешних запросов, кроме Apps Script, нет`, s.net.filter((x) => x.blocked).map((x) => x.url), []);
    await s.ctx.close();
  }

  // Скриншоты и горизонтальная прокрутка на мобильной ширине.
  fs.mkdirSync(path.join(DIR, 'screens'), { recursive: true });
  for (const w of [360, 390, 414]) {
    const s = await open(browser, { storage: fixture('shift-26-10'), width: w, height: 800 });
    for (const tb of TABS) {
      await tab(s.page, tb);
      const sw = await s.page.evaluate(() => document.documentElement.scrollWidth);
      t.eq(`${w}px, вкладка ${tb}: нет горизонтальной прокрутки`, sw <= w, true);
      const png = await s.page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
      const file = path.join(DIR, 'screens', `${w}-${tb}.png`);
      if (opts.update) fs.writeFileSync(file, png);
      const same = fs.existsSync(file) && Buffer.compare(fs.readFileSync(file), png) === 0;
      if (!same) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `${w}-${tb}.png`), png); }
      if (opts.strictScreens) t.eq(`${w}px, вкладка ${tb}: скриншот совпадает`, same, true);
      else if (!same) t.note(`${w}px, вкладка ${tb}: скриншот отличается (см. tests/out; на другом компьютере это нормально — шрифты)`);
    }
    t.eq(`${w}px: ошибок в консоли нет`, s.errors, []);
    await s.ctx.close();
  }
};

// Для набора http: те же сценарии и сравнение, но через локальный сервер.
module.exports.SCENARIOS = SCENARIOS;
module.exports.firstDiff = firstDiff;
