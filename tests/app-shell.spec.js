const { test, expect } = require('@playwright/test');
const { openApp, runScript, getOutput, results } = require('./helpers');

test.describe('app shell', () => {
  test('first visit loads the default example code and auto-runs it', async ({ page }) => {
    await openApp(page, { seedCode: null }); // genuine first visit
    await expect(page.locator('#input-area')).toHaveValue(/Plotting Example/);
    // The default script plots two figures and prints results.
    await expect(page.locator('#graphs-container .js-plotly-plot')).toHaveCount(2);
    const out = await getOutput(page);
    expect(results(out).join('\n')).toContain('Hotel Echo Lima Lima Oscar'); // nato('Hello World')
  });

  test('editor content persists across a reload (localStorage)', async ({ page }) => {
    // seedCode: null — an init script would re-seed localStorage on reload
    // and defeat the point of this test.
    await openApp(page, { seedCode: null });
    await page.fill('#input-area', 'x = 42');
    await page.reload();
    await page.waitForFunction(() => typeof math !== 'undefined' && typeof math.nato === 'function');
    await expect(page.locator('#input-area')).toHaveValue('x = 42');
  });

  test('Shift+Enter runs the script', async ({ page }) => {
    await openApp(page);
    await page.fill('#input-area', '6 * 7');
    await page.locator('#input-area').press('Shift+Enter');
    const out = await getOutput(page);
    expect(results(out)).toEqual(['42']);
  });

  test('Reset clears the editor after confirmation', async ({ page }) => {
    await openApp(page, { seedCode: 'x = 1' });
    page.on('dialog', d => d.accept());
    await page.click('button:has-text("Reset")');
    await expect(page.locator('#input-area')).toHaveValue('');
    await expect(page.locator('#output-area')).toContainText('Ready.');
  });

  test('Help opens an in-app overlay (no popup) and closes back to the calculator', async ({ page }) => {
    await openApp(page, { seedCode: 'x = 5' });
    await page.click('button:has-text("Help")');
    await expect(page.locator('#help-overlay')).toBeVisible();
    await expect(page.locator('#help-overlay iframe')).toBeAttached();
    expect(page.context().pages()).toHaveLength(1); // stayed in-app
    await page.click('#help-overlay-close');
    await expect(page.locator('#help-overlay')).toHaveCount(0);
    await expect(page.locator('#input-area')).toHaveValue('x = 5'); // untouched
  });

  test('header shows the build stamp, matching help()', async ({ page }) => {
    await openApp(page);
    const stamp = await page.locator('#build-stamp').textContent();
    expect(stamp).toMatch(/^build \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
    const out = await runScript(page, "help('ScriptCalc build')");
    expect(results(out)[0]).toContain(stamp.replace('build ', ''));
  });

  test('the Cheatsheet is gone (folded into Help)', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('button:has-text("Cheatsheet")')).toHaveCount(0);
    await expect(page.locator('#help-modal')).toHaveCount(0);
  });

  test('missing libraries produce the diagnostic panel instead of a blank page', async ({ page }) => {
    // Block the CDNs AND the local fallbacks: the loader should report
    // exactly which files could not be loaded.
    for (const host of ['cdnjs.cloudflare.com', 'cdn.plot.ly', 'esm.sh']) {
      await page.route(`https://${host}/**`, r => r.abort());
    }
    for (const local of ['math.js', 'luxon.js', 'plotly.min.js']) {
      await page.route(`**/${local}`, r => r.abort());
    }
    await page.goto('/index.html');
    await expect(page.locator('.diag-error')).toContainText('Missing Files');
    await expect(page.locator('.diag-error')).toContainText('math.js');
  });
});
