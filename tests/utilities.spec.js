const { test, expect } = require('@playwright/test');
const { openApp, runScript, results } = require('./helpers');

test.describe('printf', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('formats %s, %d and fixed-precision %f', async ({ page }) => {
    const out = await runScript(page, [
      `printf("User %s is %d years old", "Stoph", 54)`,
      `printf("pi = %.2f", pi)`,
      `printf("%.4f", 1/3)`,
    ].join('\n'));
    expect(results(out)[0]).toBe('User Stoph is 54 years old');
    expect(results(out)[1]).toBe('pi = 3.14');
    expect(results(out)[2]).toBe('0.3333');
  });

  test('missing arguments leave the specifier untouched', async ({ page }) => {
    const out = await runScript(page, `printf("%s and %s", "one")`);
    expect(results(out)[0]).toBe('one and %s');
  });
});

test.describe('nato', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('spells letters and digits', async ({ page }) => {
    const out = await runScript(page, "nato('SOS')\nnato('B52')");
    expect(results(out)[0]).toBe('Sierra Oscar Sierra');
    expect(results(out)[1]).toBe('Bravo Five Two');
  });

  test('lowercases are uppercased, spaces marked, unknown chars pass through', async ({ page }) => {
    const out = await runScript(page, "nato('ab c!')");
    expect(results(out)[0]).toBe('Alpha Bravo (space) Charlie !');
  });

  test('non-string input returns a usage error', async ({ page }) => {
    const out = await runScript(page, 'nato(42)');
    expect(results(out)[0]).toContain('Input must be a string');
  });
});

test.describe('toFeetInches', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('converts a length unit to feet-and-inches text', async ({ page }) => {
    const out = await runScript(page, 'toFeetInches(180 cm)');
    expect(results(out)[0]).toBe(`5' 10.87"`);
  });

  test('exact foot boundary', async ({ page }) => {
    const out = await runScript(page, 'toFeetInches(6 feet)');
    expect(results(out)[0]).toBe(`6' 0.00"`);
  });

  test('plain number is rejected', async ({ page }) => {
    const out = await runScript(page, 'toFeetInches(180)');
    expect(results(out)[0]).toContain('Unit required');
  });
});

test.describe('latex (unicodeit)', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('converts LaTeX to Unicode (backslashes survive preprocessing)', async ({ page }) => {
    const out = await runScript(page, String.raw`latex('\alpha \to \beta')`);
    expect(results(out)[0]).toContain('α → β');
  });

  test('handles sub/superscripts', async ({ page }) => {
    const out = await runScript(page, String.raw`latex('m_0 e^+')`);
    expect(results(out)[0]).toContain('m₀ e⁺');
  });

  test('non-string input returns a usage error', async ({ page }) => {
    const out = await runScript(page, 'latex(5)');
    expect(results(out)[0]).toContain('Input must be a string');
  });
});

test.describe('CIC4 cochlear implant current-level conversions', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('CL2uAzp endpoints: CL 0 -> 0 uA, CL 255 -> 1750 uA', async ({ page }) => {
    const out = await runScript(page, 'CL2uAzp(0)\nCL2uAzp(255)');
    expect(results(out)).toEqual(['0', '1750']);
  });

  test('uAzp2CL endpoints: 0 uA -> 0, 1750 uA -> 255', async ({ page }) => {
    const out = await runScript(page, 'uAzp2CL(0)\nuAzp2CL(1750)');
    expect(results(out)).toEqual(['0', '255']);
  });

  test('round trip through a mid-range current level', async ({ page }) => {
    const out = await runScript(page, 'round(uAzp2CL(CL2uAzp(128)))');
    expect(results(out)[0]).toBe('128');
  });

  test('charge calculation example from the help page', async ({ page }) => {
    const out = await runScript(page, [
      'CurrentuA = CL2uAzp(255);',
      'PWusec = 25;',
      'Charge_nC = CurrentuA * PWusec * 1e-6 * 1e-6 * 1e9',
    ].join('\n'));
    expect(Number(results(out)[0])).toBeCloseTo(43.75, 5); // nC
  });
});
