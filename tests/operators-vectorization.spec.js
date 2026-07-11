const { test, expect } = require('@playwright/test');
const { openApp, runScript, results, errors } = require('./helpers');

// Matrix results render as an HTML table; textContent concatenates the cell
// values. These helpers assert on the numbers irrespective of layout.
const nums = text => (text.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || []).map(Number);

test.describe('element-wise operators (.* ./ .^)', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('.* on array literals', async ({ page }) => {
    const out = await runScript(page, '[1, 2, 3] .* [4, 5, 6]');
    expect(nums(results(out)[0])).toEqual([4, 10, 18]);
  });

  test('.* ./ .^ on variables', async ({ page }) => {
    const out = await runScript(page, [
      'a = [1, 2, 3];',
      'b = [4, 5, 6];',
      'a .* b',
      'b ./ a',
      'a .^ 2',
    ].join('\n'));
    const res = results(out);
    expect(nums(res[0])).toEqual([4, 10, 18]);
    expect(nums(res[1])).toEqual([4, 2.5, 2]);
    expect(nums(res[2])).toEqual([1, 4, 9]);
  });

  test('scalar .^ scalar', async ({ page }) => {
    const out = await runScript(page, '2 .^ 10');
    expect(results(out)).toEqual(['1024']);
  });

  test('matrix .* matrix is element-wise, * is matrix multiply', async ({ page }) => {
    const out = await runScript(page, [
      'm = [1, 2; 3, 4];',
      'm .* m',
      'm * m',
    ].join('\n'));
    const res = results(out);
    expect(nums(res[0])).toEqual([1, 4, 9, 16]);   // element-wise squares
    expect(nums(res[1])).toEqual([7, 10, 15, 22]); // true matrix product
  });
});

test.describe('auto-vectorized math functions', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('work on scalars', async ({ page }) => {
    const out = await runScript(page, [
      'sin(0)',
      'cos(0)',
      'exp(0)',
      'sqrt(4)',
      'abs(-3)',
      'log10(100)',
      'sign(-5)',
    ].join('\n'));
    expect(results(out)).toEqual(['0', '1', '1', '2', '3', '2', '-1']);
  });

  test('work element-wise on arrays without map()', async ({ page }) => {
    const out = await runScript(page, 'sqrt([1, 4, 9, 16])');
    expect(nums(results(out)[0])).toEqual([1, 2, 3, 4]);
  });

  test('work element-wise on 2-D matrices', async ({ page }) => {
    const out = await runScript(page, 'abs([-1, 2; -3, 4])');
    expect(nums(results(out)[0])).toEqual([1, 2, 3, 4]);
  });

  test('documented limitation: unit arguments are NOT supported (use radians)', async ({ page }) => {
    // The vectorized wrappers call native Math.sin, which cannot take a
    // math.js Unit. This characterizes the known limitation from the README.
    const out = await runScript(page, 'sin(45 deg)');
    expect([...results(out), ...errors(out)].join(' ')).toContain('NaN');
  });
});

test.describe('matrix support', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('identity, inversion, and round trip', async ({ page }) => {
    const out = await runScript(page, [
      'b1 = [1, 2; 3, 4];',
      'inv(b1)',
      'inv(b1) * b1',
    ].join('\n'));
    const res = results(out);
    expect(nums(res[0])).toEqual([-2, 1, 1.5, -0.5]);
    expect(nums(res[1])).toEqual([1, 0, 0, 1]);
  });

  test('small matrices render as an aligned grid, huge ones as plain text', async ({ page }) => {
    await runScript(page, 'identity(2, 2)\nzeros(21, 21)');
    const gridCount = await page.locator('#output-area .res-line div').count();
    expect(gridCount).toBeGreaterThan(0); // 2x2 rendered via formatMatrix grid
    // the 21x21 exceeds the 20x20 grid limit -> plain math.format text
    const texts = await page.locator('#output-area .res-line').allTextContents();
    expect(texts.some(t => t.includes('[['))).toBe(true);
  });
});
