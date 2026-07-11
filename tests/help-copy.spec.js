const { test, expect } = require('@playwright/test');
const { openApp, runScript, results } = require('./helpers');

test.describe('help() console reference', () => {
  test('prints the categorized quick reference', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, 'help()');
    const text = results(out)[0];
    for (const section of ['PLOTTING', 'MATH & MATRICES', 'DATES & TIME', 'CURRENCY & UNITS', 'TIMERS', 'TEXT & MISC', 'SCRIPT SYNTAX']) {
      expect(text).toContain(section);
    }
    expect(text).toContain('ThreeZonesNow()');
    expect(text).toContain('CL2uAzp');
  });

  test("help('watch') returns only lines matching the query", async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, "help('watch')");
    const text = results(out)[0];
    expect(text).toContain('stopwatchStart');
    expect(text).not.toContain('PLOTTING');
    expect(text).not.toContain('plot(x, y)');
  });

  test('help search is case-insensitive', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, "help('NATO')");
    expect(results(out)[0]).toContain("nato('text')");
  });

  test('help search with no hits says so', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, "help('zzzzqqq')");
    expect(results(out)[0]).toContain("No help entries matching 'zzzzqqq'");
  });

  test('non-string help argument shows usage', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, 'help(5)');
    expect(results(out)[0]).toContain("help('text')");
  });
});

test.describe('tap a result line to copy it', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies a scalar result and flashes confirmation', async ({ page }) => {
    await openApp(page);
    await runScript(page, '6 * 7');
    const line = page.locator('#output-area .res-line').first();
    await line.click();
    await expect(line).toHaveClass(/copied/);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe('42');
    // flash clears again
    await expect(line).not.toHaveClass(/copied/, { timeout: 3000 });
  });

  test('copies a matrix as space-separated cells', async ({ page }) => {
    await openApp(page);
    await runScript(page, '[1, 2; 3, 4]');
    await page.locator('#output-area .res-line').first().click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe('1 2 3 4');
  });

  test('copies the bare value, not the pretty-date badge', async ({ page }) => {
    await openApp(page);
    await runScript(page, "date('2026-06-15')");
    await page.locator('#output-area .res-line').first().click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toMatch(/^2026-06-15T00:00:00/);
    expect(clip).not.toContain('Jun 15'); // badge text stays out
  });

  test('graph links still navigate instead of copying', async ({ page }) => {
    await openApp(page);
    await runScript(page, 'plot([0, 1], [0, 1])');
    await page.locator('#output-area .res-line a').click();
    await expect(page.locator('#graphs-container')).toBeVisible();
  });
});
