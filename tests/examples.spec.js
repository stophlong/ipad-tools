const { test, expect } = require('@playwright/test');
const { openApp, runScript, errors } = require('./helpers');

// Every code example the app shows its user must actually run. These tests
// paste the documentation into the input verbatim, so a stale example fails
// the suite instead of failing the user.

test.describe('documentation examples are runnable', () => {
  test('the cheatsheet block runs with no errors', async ({ page }) => {
    await openApp(page);
    await page.click('button:has-text("Cheatsheet")');
    const code = await page.locator('#help-code-block').textContent();
    await page.keyboard.press('Escape'); // close the dialog
    expect(code.trim().length).toBeGreaterThan(100);
    const out = await runScript(page, code);
    expect(errors(out)).toEqual([]);
    await runScript(page, 'timerCancel()\nstopwatchReset()');
  });

  test('cheatsheet latex examples use single backslashes', async ({ page }) => {
    await openApp(page);
    const code = await page.locator('#help-code-block').textContent();
    expect(code).toContain("latex('\\alpha \\to \\beta')"); // one backslash each in page text
    expect(code).not.toContain('\\\\alpha');                // never doubled
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
