// Проверка через локальный HTTP-сервер с тем же путём, что на GitHub Pages: /razdacha-zp/.
// Все сценарии эталона прогоняются по http и сравниваются с тем же эталоном (HTML, localStorage, запросы к Apps Script);
// проверяются коды ответов файлов сайта и отсутствие ошибок в консоли.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { ROOT, open, fixture, tab, useUrl } = require('../lib/app');
const { SCENARIOS, firstDiff } = require('./baseline');
const K = require('../lib/checks');

const PREFIX = '/razdacha-zp/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve() {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (!u.startsWith(PREFIX)) { res.writeHead(404); return res.end('not found'); }
    let rel = u.slice(PREFIX.length) || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

function get(url) {
  return new Promise((ok) => http.get(url, (r) => { r.resume(); r.on('end', () => ok(r.statusCode)); }).on('error', () => ok(0)));
}

module.exports = async function (browser, t, opts) {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}${PREFIX}`;
  try {
    t.eq('http: index.html — 200', await get(base + 'index.html'), 200);
    const SR = K.scriptReport(ROOT);
    const refs = [SR.cssHref].concat(SR.list); // как они записаны в index.html (с ?v=, если есть)
    for (const r of refs) t.eq(`http: ${r} — 200`, await get(base + r), 200);
    t.eq('http: адрес вне /razdacha-zp/ не обслуживается (как на GitHub Pages)', await get(base.replace(PREFIX, '/') + 'index.html'), 404);

    useUrl(base + 'index.html');
    // Загрузка: все файлы сайта отдаются с кодом 200, приложение отрисовано.
    {
      const s = await open(browser, { storage: fixture('shift-26-10') });
      const own = s.responses.filter((r) => r.url.startsWith(base));
      t.eq('http: все файлы сайта загружены с кодом 200', own.filter((r) => r.status !== 200).map((r) => `${r.status} ${r.url.slice(base.length)}`), []);
      const want = ['index.html'].concat(refs);
      t.eq('http: загружены index.html, CSS и все JS-файлы, ровно по ссылкам из index.html', want.filter((f) => own.some((r) => r.url === base + f)), want);
      t.eq('http: приложение отрисовано (есть заголовок и нижнее меню)', await s.page.evaluate(() => !!document.querySelector('#app h1') && document.querySelectorAll('#app nav button').length === 5), true);
      t.eq('http: стили применены (фон страницы как в эталоне)', await s.page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(242, 246, 236)');
      t.eq('http: ошибок в консоли нет', s.errors, []);
      await s.ctx.close();
    }
    // Все сценарии эталона по http.
    for (const [name, run] of Object.entries(SCENARIOS)) {
      const [s, r] = await run(browser);
      const base0 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'baseline', 'scenarios', name + '.json'), 'utf8'));
      t.eq(`http, эталон «${name}»: HTML, localStorage и запросы к Apps Script совпадают`, firstDiff(r.snaps, base0), '');
      t.eq(`http, эталон «${name}»: ошибок в консоли нет`, s.errors, []);
      t.eq(`http, эталон «${name}»: внешних запросов, кроме Apps Script, нет`, s.net.filter((x) => x.blocked).map((x) => x.url), []);
      await s.ctx.close();
    }
    // Скриншоты пяти вкладок на 390 px по http.
    {
      const s = await open(browser, { storage: fixture('shift-26-10'), width: 390, height: 800 });
      for (const tb of ['shift', 'people', 'sum', 'tab', 'log']) {
        await tab(s.page, tb);
        const png = await s.page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
        const same = Buffer.compare(fs.readFileSync(path.join(__dirname, '..', 'baseline', 'screens', `390-${tb}.png`)), png) === 0;
        if (opts.strictScreens) t.eq(`http, 390px, вкладка ${tb}: скриншот совпадает`, same, true);
        else if (!same) t.note(`http, 390px, вкладка ${tb}: скриншот отличается (на другом компьютере это нормально — шрифты)`);
      }
      await s.ctx.close();
    }
  } finally {
    useUrl(null);
    srv.close();
  }
};
