// Запуск всех тестов: node tests/run.js [--update] [--loose-screens] [имя группы ...]
//   --update         пересоздать эталон (делать только на исходной версии, ветка stable-before-split);
//   --loose-screens  отличия скриншотов не считать ошибкой (на другом компьютере шрифты отличаются);
//   имена групп: structure, calc, baseline, jsguard, http, negative (по умолчанию все).
const path = require('path');
const { launch, ROOT } = require('./lib/app');

const args = process.argv.slice(2);
const opts = { update: args.includes('--update'), strictScreens: !args.includes('--loose-screens') };
const only = args.filter((a) => !a.startsWith('--'));
const SUITES = { structure: 'Структура кода', calc: 'Расчёты', baseline: 'Сравнение с эталоном', jsguard: 'Защита переноса JavaScript', http: 'Локальный сервер /razdacha-zp/', negative: 'Отрицательные сценарии (самопроверка)' };

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

(async () => {
  const browser = await launch();
  const total = { pass: 0, fail: 0, pending: 0, skip: 0 };
  console.log(`Сайт: ${path.join(ROOT, 'index.html')}${opts.update ? '  (режим --update: эталон пересоздаётся)' : ''}\n`);
  for (const [key, title] of Object.entries(SUITES)) {
    if (only.length && !only.includes(key)) continue;
    const res = { pass: 0, fail: 0, pending: 0, skip: 0 };
    const fails = [];
    const t = {
      eq(name, actual, expected) {
        if (same(actual, expected)) res.pass++;
        else { res.fail++; fails.push(`  ✗ ${name}\n      получено: ${JSON.stringify(actual)}\n      ожидалось: ${JSON.stringify(expected)}`); }
      },
      fail(name, why) { res.fail++; fails.push(`  ✗ ${name}: ${why}`); },
      pending(name, why) { res.pending++; fails.push(`  … ожидает данных: ${name} — ${why}`); },
      note(msg) { fails.push(`  · ${msg}`); },
      skip(name, why) { res.skip++; fails.push(`  ○ отложено: ${name} — ${why}`); },
    };
    try { await require('./suites/' + key)(browser, t, opts); } catch (e) { t.fail('группа выполнилась без сбоя', e.stack || e.message); }
    console.log(`${title}: пройдено ${res.pass}, ошибок ${res.fail}${res.pending ? `, ожидает данных ${res.pending}` : ''}${res.skip ? `, отложено до переноса ${res.skip}` : ''}`);
    if (fails.length) console.log(fails.join('\n'));
    console.log('');
    Object.keys(total).forEach((k) => { total[k] += res[k]; });
  }
  await browser.close();
  console.log(`ИТОГО: пройдено ${total.pass}, ошибок ${total.fail}, ожидает данных ${total.pending}, отложено до переноса ${total.skip}`);
  process.exit(total.fail ? 1 : 0);
})();
