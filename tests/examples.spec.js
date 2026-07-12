const { test, expect } = require('@playwright/test');
const { openApp, runScript, errors, results } = require('./helpers');

// Every code example the app shows its user must actually run. These tests
// paste the documentation into the input verbatim, so a stale example fails
// the suite instead of failing the user.

test.describe('documentation examples are runnable', () => {
  test('Help-page latex examples use single backslashes', async ({ page }) => {
    await openApp(page);
    await page.click('button:has-text("Help")');
    const frame = page.frameLocator('#help-overlay iframe');
    const blocks = await frame.locator('pre code').allTextContents();
    const latexBlock = blocks.find(b => b.includes('latex('));
    expect(latexBlock).toBeTruthy();
    expect(latexBlock).toContain("latex('\\alpha \\to \\beta')"); // one backslash each in page text
    expect(latexBlock).not.toContain('\\\\alpha');                // never doubled
  });

  test('help() output pastes back into the input and runs clean', async ({ page }) => {
    test.setTimeout(120_000);
    await openApp(page);
    const out = await runScript(page, 'help()');
    const helpText = results(out)[0];
    expect(helpText.split('\n').length).toBeGreaterThan(40);
    const rerun = await runScript(page, helpText);
    expect(errors(rerun)).toEqual([]);
    await runScript(page, 'timerCancel()\nstopwatchReset()');
  });

  test('every full-Help code block runs with no errors', async ({ page }) => {
    test.setTimeout(180_000);
    await openApp(page);
    await page.click('button:has-text("Help")');
    const frame = page.frameLocator('#help-overlay iframe');
    await expect(frame.locator('h1')).toBeVisible();
    const blocks = await frame.locator('pre code').allTextContents();
    await page.click('#help-overlay-close');
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) {
      const out = await runScript(page, block);
      expect(errors(out), `this Help block errored:\n${block}`).toEqual([]);
      // examples may start timers/stopwatches — clean up between blocks
      await runScript(page, 'timerCancel()\nstopwatchReset()');
    }
  });
});
