const { test, expect } = require('@playwright/test');
const { openApp, runScript, results, infos } = require('./helpers');

// helpers.js mocks the exchange-rate API with EUR=0.5, GBP=0.8, AUD=1.6,
// CAD=1.25 (per 1 USD) so conversions have exact expected values.

test.describe('currency conversion (API mocked)', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('showrates() lists all rates with their age and source', async ({ page }) => {
    const out = await runScript(page, 'showrates()');
    const text = results(out)[0];
    expect(text).toContain('EUR: 0.5000');
    expect(text).toContain('GBP: 0.8000');
    expect(text).toContain('AUD: 1.6000');
    expect(text).toContain('CAD: 1.2500');
    expect(text).toMatch(/\(\d+ min old\)/);
    expect(text).toContain('Source: live rates fetched this session');
  });

  test('no offline-rates notice when rates are live', async ({ page }) => {
    const out = await runScript(page, '100 USD in EUR');
    expect(infos(out).join(' ')).not.toContain('Offline exchange rates');
  });

  test('unit-style conversions use the mocked rates exactly', async ({ page }) => {
    const out = await runScript(page, [
      '100 USD in EUR',
      '1 USD in GBP',
      '80 GBP in USD',
      '100 EUR in AUD', // cross rate: 100/0.5 USD * 1.6 = 320 AUD
    ].join('\n'));
    expect(results(out)).toEqual(['50 EUR', '0.8 GBP', '100 USD', '320 AUD']);
  });

  test('lowercase currency aliases work', async ({ page }) => {
    const out = await runScript(page, '100 usd in eur');
    expect(results(out)[0]).toBe('50 eur');
  });

  test('currency values can be stored in variables and converted later', async ({ page }) => {
    const out = await runScript(page, 'price = 25.50 EUR;\nprice in USD');
    expect(results(out)[0]).toBe('51 USD'); // 25.50 / 0.5
  });

  test('currency arithmetic works like any other unit', async ({ page }) => {
    const out = await runScript(page, '(10 USD + 5 EUR) in USD');
    expect(results(out)[0]).toBe('20 USD'); // 5 EUR = 10 USD at rate 0.5
  });

  test('checkcurrency() reports every unit working', async ({ page }) => {
    const out = await runScript(page, 'checkcurrency()');
    const text = results(out)[0];
    expect(text).toContain('Exchange rates loaded: YES');
    for (const cur of ['USD', 'EUR', 'GBP', 'AUD']) {
      expect(text).toContain(`${cur}: ✓ Working`);
    }
  });

  test('refreshcurrency() rebuilds units successfully', async ({ page }) => {
    const out = await runScript(page, 'refreshcurrency()');
    expect(results(out)[0]).toContain('refreshed successfully');
  });
});

test.describe('currency conversion when the API is unreachable', () => {
  test('falls back to hardcoded rates and still converts', async ({ page }) => {
    await openApp(page, { rates: 'fail' });
    const out = await runScript(page, 'showrates()\n1 USD in EUR');
    expect(results(out)[0]).toContain('EUR: 0.8500'); // FALLBACK_RATES in index.html
    expect(results(out)[0]).toContain('built-in approximate rates from 2026-07-11');
    expect(results(out)[1]).toMatch(/^0\.85\s*EUR$/);
  });

  test('warns once that offline rates are in use', async ({ page }) => {
    await openApp(page, { rates: 'fail' });
    const out = await runScript(page, '100 USD in EUR\n50 GBP in USD');
    const notices = infos(out).filter(t => t.includes('Offline exchange rates'));
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain('built-in approximate rates from 2026-07-11');
  });

  test('no notice for scripts that do not use currency', async ({ page }) => {
    await openApp(page, { rates: 'fail' });
    const out = await runScript(page, '1 + 1');
    expect(infos(out).join(' ')).not.toContain('Offline exchange rates');
  });

  test('first attempt works even with a corrupt cached-rates entry (regression)', async ({ page }) => {
    // An old app version could leave zero/missing rates in localStorage,
    // which made unit creation fail ("Undefined symbol USD") until a
    // reload with a successful fetch.
    await page.addInitScript(() => {
      localStorage.setItem('script_calc_exchange_rates', '{"USD":1,"EUR":0,"GBP":null}');
      localStorage.setItem('script_calc_rates_timestamp', String(Date.now()));
    });
    await openApp(page, { rates: 'fail' });
    const out = await runScript(page, '100 USD in EUR');
    expect(results(out)[0]).toMatch(/^85\s*EUR$/); // sanitized to fallback 0.85
  });

  test('first attempt works while the rates fetch is still in flight', async ({ page }) => {
    // Simulate the slow PC: the API answers only after the user already ran
    // their first conversion.
    await openApp(page, { rates: 'slow' });
    const out = await runScript(page, '100 USD in EUR');
    expect(results(out)[0]).toMatch(/^85\s*EUR$/); // fallback rates until fetch lands
    expect(infos(out).join(' ')).toContain('Offline exchange rates');
  });
});
