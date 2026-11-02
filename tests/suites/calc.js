// Группа 2: расчёты. Ожидаемые значения взяты из листов Google Таблицы (смены 26.10.2026 и 13.10.2026),
// имена в наборах данных обезличены. Формулы приложения здесь не повторяются — сверяется только результат.
const { open, fixture, tab } = require('../lib/app');

// Расчёт, который приложение показывает для текущей смены.
async function calc(page) {
  return page.evaluate(() => ({
    rows: curRows().map((w) => ({ n: w.n, kg: w.kg, raw: w.raw, A: w.A, r: w.r })),
    bank: bankAuto(),
  }));
}

module.exports = async function (browser, t) {
  // --- Контрольный катер 112 кг (лист 26.10.2026, катер 3: 112 кг + 2 кг камчадала, 6 человек по 480 ₽) ---
  {
    const { page, errors, ctx } = await open(browser, { storage: fixture('boat-112') });
    const r = await calc(page);
    t.eq('112 кг: шесть человек в расчёте', r.rows.length, 6);
    r.rows.forEach((w) => {
      t.eq(`112 кг: ${w.n} — кг на человека = (112 + 2) / 6`, w.kg, 19);
      t.eq(`112 кг: ${w.n} — начислено = 19 × 480`, w.raw, 9120);
      t.eq(`112 кг: ${w.n} — к выдаче (вниз до 100)`, w.A, 9100);
    });
    t.eq('112 кг: банк = (112 + 2) × 500', r.bank, 57000);
    t.eq('112 кг: ошибок в консоли нет', errors, []);
    await ctx.close();
  }

  // --- Контрольный катер 95,5 кг (лист 13.10.2026, катер 2: 93,5 кг + 2 кг камчадала, 8 человек) ---
  // Из таблицы: вес, камчадал, состав «Сотрудники», ставки (Начислено / Кг по смене: двое по 500, шестеро по 480).
  // Ограничение: разбивки по этапам в таблице нет, принят один этап на катер; значения по одному катеру
  // в листе не записаны (там только итог смены), поэтому ниже они рассчитаны и сверены с итогом смены.
  {
    const { page, errors, ctx } = await open(browser, { storage: fixture('boat-95-5') });
    const r = await calc(page);
    t.eq('95,5 кг: восемь человек в расчёте', r.rows.length, 8);
    r.rows.forEach((w) => {
      const exp = w.r === 500 ? [5968, 5900] : [5730, 5700];
      t.eq(`95,5 кг: ${w.n} — кг на человека = (93,5 + 2) / 8 = 11,9375 (показ 11,94)`, w.kg, 11.94);
      t.eq(`95,5 кг: ${w.n} — начислено = 11,9375 × ${w.r} вниз до рубля`, w.raw, exp[0]);
      t.eq(`95,5 кг: ${w.n} — к выдаче (вниз до 100)`, w.A, exp[1]);
    });
    t.eq('95,5 кг: ставки как в листе (2 × 500, 6 × 480)', r.rows.map((w) => w.r).sort(), [480, 480, 480, 480, 480, 480, 500, 500]);
    t.eq('95,5 кг: банк = (93,5 + 2) × 500', r.bank, 47750);
    // сверка с листом: 56,5 / 8 (катер 1) + 95,5 / 8 (катер 2) = 19,00 кг у каждого — как в листе 13.10.2026
    const kg = await page.evaluate(() => pkg(C.people[0].n));
    t.eq('95,5 кг: вместе с катером 1 (56,5 / 8) даёт 19,00 кг, как в листе', Math.round((kg + 56.5 / 8) * 100) / 100, 19);
    t.eq('95,5 кг: ошибок в консоли нет', errors, []);
    await ctx.close();
  }

  // --- Вся смена 26.10.2026: сверка с листом таблицы ---
  {
    const { page, errors, ctx } = await open(browser, { storage: fixture('shift-26-10') });
    const r = await calc(page);
    const exp = { // кг и «Начислено» из листа 26.10.2026
      'Аз': [20.71, 10357], 'Буки': [20.71, 10357], 'Веди': [19, 9120], 'Глаголь': [39.71, 19062], 'Добро': [20.71, 9942],
      'Есть': [19, 9120], 'Живете': [39.71, 19062], 'Зело': [20.71, 9942], 'Земля': [39.71, 19062], 'Иже': [19, 9120],
    };
    t.eq('26.10: люди в расчёте', r.rows.map((w) => w.n), Object.keys(exp));
    r.rows.forEach((w) => {
      t.eq(`26.10: ${w.n} кг`, w.kg, exp[w.n][0]);
      t.eq(`26.10: ${w.n} начислено`, w.raw, exp[w.n][1]);
    });
    const sum = (k) => r.rows.reduce((a, w) => a + w[k], 0);
    t.eq('26.10: итого кг (лист: 258,97)', Math.round(sum('kg') * 100) / 100, 258.97);
    t.eq('26.10: итого начислено (лист: 125 144)', sum('raw'), 125144);
    t.eq('26.10: ЗП всего к выдаче (лист: 124 700)', sum('A'), 124700);
    t.eq('26.10: банк (лист: 129 500)', r.bank, 129500);
    t.eq('26.10: ошибок в консоли нет', errors, []);
    await ctx.close();
  }

  // --- Вся смена 13.10.2026: сверка с листом таблицы ---
  {
    const { page, errors, ctx } = await open(browser, { storage: fixture('shift-13-10') });
    const r = await calc(page);
    r.rows.forEach((w) => {
      t.eq(`13.10: ${w.n} кг = (56,5 + 95,5) / 8`, w.kg, 19);
      t.eq(`13.10: ${w.n} начислено`, w.raw, w.r === 500 ? 9500 : 9120);
    });
    t.eq('13.10: итого начислено (лист: 73 720)', r.rows.reduce((a, w) => a + w.raw, 0), 73720);
    t.eq('13.10: ЗП всего (лист: 73 600)', r.rows.reduce((a, w) => a + w.A, 0), 73600);
    t.eq('13.10: банк (лист: 76 000)', r.bank, 76000);
    t.eq('13.10: ошибок в консоли нет', errors, []);
    await ctx.close();
  }

  // --- Общие правила на синтетических данных ---
  {
    const { page, errors, ctx } = await open(browser, { storage: fixture('shift-26-10') });
    const g = await page.evaluate(() => {
      const o = {};
      // ставка: явная ставка человека важнее значения по умолчанию
      o.rate450 = rateOf({ n: 'Тест', r: 450 });
      o.rateDefault = rateOf({ n: 'Тест' });
      // салат: +400 ₽ за кг к начислению и к банку
      C.people[0].s = '2'; o.salAuto = autoOf(C.people[0]); o.salBank = bankAuto(); C.people[0].s = '';
      // ручная сумма банка важнее расчётной
      C.bankR = '100000'; o.bankR = bankAuto(); C.bankR = '';
      // неравное присутствие: 30 кг на троих, один из них ещё на 10 кг вдвоём
      const S = C.stages; C.stages = [{ b: '9', s: '1', k: '30', p: { 'Аз': true, 'Буки': true, 'Веди': true } }, { b: '9', s: '2', k: '10', p: { 'Аз': true, 'Како': true } }];
      o.kgA = pkg('Аз'); o.kgB = pkg('Буки'); o.kgK = pkg('Како'); C.stages = S;
      // распределение аванса: суммы кратны 100 и в сумме равны заданной
      const rows = [{ n: 'x', A: 10300, rem: 10300 }, { n: 'y', A: 9100, rem: 9100 }, { n: 'z', A: 19000, rem: 4000 }];
      const d = distAdv(15000, rows); o.dist = d.amt; o.distErr = d.err || '';
      o.distBad = distAdv(15050, rows).err || '';
      return o;
    });
    t.eq('ставка 450 из карточки человека', g.rate450, 450);
    t.eq('ставка по умолчанию', g.rateDefault, 480);
    t.eq('салат 2 кг: начислено = 20,71 × 500 + 2 × 400', g.salAuto, '11157');
    t.eq('салат 2 кг: банк = 129 500 + 800', g.salBank, 130300);
    t.eq('ручная сумма банка', g.bankR, 100000);
    t.eq('кг: 30/3 + 10/2 = 15', g.kgA, 15);
    t.eq('кг: 30/3 = 10', g.kgB, 10);
    t.eq('кг: 10/2 = 5', g.kgK, 5);
    t.eq('аванс: без ошибки', g.distErr, '');
    const vals = Object.values(g.dist || {}).map(Number);
    t.eq('аванс: все суммы кратны 100', vals.every((v) => v % 100 === 0), true);
    t.eq('аванс: сумма распределения = 15 000', vals.reduce((a, v) => a + v, 0), 15000);
    t.eq('аванс: не больше остатка (z ≤ 4 000)', Number(g.dist.z) <= 4000, true);
    t.eq('аванс: сумма не кратна 100 — ошибка', g.distBad, 'Сумма аванса должна делиться на 100 ₽.');
    t.eq('общие правила: ошибок в консоли нет', errors, []);
    await ctx.close();
  }

  // --- Закрытие смены: запись в архив совпадает с листом ---
  {
    const { page, errors, ctx } = await open(browser, { storage: fixture('shift-26-10') });
    await tab(page, 'sum');
    await page.click('#close'); await page.click('#close');
    await page.waitForTimeout(100);
    const rec = await page.evaluate(() => { const r = hist()[0]; return { S: r.S, RAW: r.RAW, bank: r.bank, rest: r.rest, B: r.B, Cm: r.Cm, n: r.rows.length }; });
    t.eq('закрытие 26.10: итоги записи архива', rec, { S: 124700, RAW: 125144, bank: 129500, rest: 4800, B: 4000, Cm: 800, n: 10 });
    t.eq('закрытие: ошибок в консоли нет', errors, []);
    await ctx.close();
  }
};
