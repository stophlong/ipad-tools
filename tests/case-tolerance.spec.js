const { test, expect } = require('@playwright/test');
const { openApp, runScript, results, errors } = require('./helpers');

// The app corrects the case of KNOWN function names (at call sites) and a
// curated list of constants/units — a typing aid, especially against iPad
// autocapitalization. User variables stay case-sensitive, and quoted
// strings are never rewritten.

test.describe('case-insensitive typing tolerance', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('function names are corrected at call sites', async ({ page }) => {
    const out = await runScript(page, [
      "NATO('sos')",
      'Sqrt(4) + SIN(0)',
      'Cl2uAzp(255)',
      'PRINTF("%d", 7)',
    ].join('\n'));
    const res = results(out);
    expect(res[0]).toBe('Sierra Oscar Sierra');
    expect(res[1]).toBe('2');
    expect(res[2]).toBe('1750');
    expect(res[3]).toBe('7');
  });

  test('ShowRates and THREEZONESNOW work', async ({ page }) => {
    const out = await runScript(page, 'ShowRates()\nTHREEZONESNOW()');
    expect(results(out)[0]).toContain('Exchange Rates');
    expect(results(out)[1]).toContain('Denver');
  });

  test('temperature units degf/degc are corrected', async ({ page }) => {
    const out = await runScript(page, '100 degf in degc\n25 DEGC in DEGF');
    expect(results(out)[0]).toContain('degC');
    expect(results(out)[1]).toContain('degF');
  });

  test('zone constants and pi tolerate any case', async ({ page }) => {
    const out = await runScript(page, 'sydney\nPI * 2');
    expect(results(out)[0]).toBe('Australia/Sydney');
    expect(Number(results(out)[1])).toBeCloseTo(Math.PI * 2, 10);
  });

  test('quoted strings are never rewritten', async ({ page }) => {
    const out = await runScript(page, 'printf("%s", "go denver go")');
    expect(results(out)[0]).toBe('go denver go');
  });

  test('lowercase currency aliases keep their spelling', async ({ page }) => {
    const out = await runScript(page, '100 usd in eur');
    expect(results(out)[0]).toBe('50 eur');
  });

  test('user variables remain case-sensitive (MATLAB-style)', async ({ page }) => {
    const out = await runScript(page, 'Foo = 7;\nfoo + 1');
    expect(errors(out)[0]).toContain('Undefined symbol foo');
  });
});
