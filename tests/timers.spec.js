const { test, expect } = require('@playwright/test');
const { openApp, runScript, results } = require('./helpers');

// The timer/stopwatch overlays are fixed-position divs appended to <body>.
const overlay = (page, emoji) => page.locator(`body > div:has-text("${emoji}")`).last();

test.describe('countdown timer', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('timer(unit) starts and shows a counting overlay', async ({ page }) => {
    const out = await runScript(page, 'timer(2 minutes)');
    expect(results(out)[0]).toBe('Timer started for 120 seconds');
    await expect(overlay(page, '⏱️')).toBeVisible();
    await expect(overlay(page, '⏱️')).toContainText('1:5'); // counting down from 2:00
  });

  test('bare number is interpreted as seconds', async ({ page }) => {
    const out = await runScript(page, 'timer(90)');
    expect(results(out)[0]).toBe('Timer started for 90 seconds');
    await runScript(page, 'timerCancel()');
  });

  test('expiry shows TIME\'S UP', async ({ page }) => {
    await runScript(page, 'timer(1 seconds)');
    await expect(overlay(page, '⏰')).toContainText("TIME'S UP", { timeout: 5000 });
  });

  test('timerCancel() removes the overlay', async ({ page }) => {
    await runScript(page, 'timer(5 minutes)');
    await expect(overlay(page, '⏱️')).toBeVisible();
    const out = await runScript(page, 'timerCancel()');
    expect(results(out)[0]).toBe('Timer cancelled');
    await expect(page.locator('body > div:has-text("⏱️")')).toHaveCount(0);
  });

  test('starting a new timer replaces the old one', async ({ page }) => {
    await runScript(page, 'timer(5 minutes)\ntimer(30 minutes)');
    await expect(page.locator('body > div:has-text("⏱️")')).toHaveCount(1);
    await runScript(page, 'timerCancel()');
  });

  test('invalid argument returns a usage error', async ({ page }) => {
    const out = await runScript(page, "timer('soon')");
    expect(results(out)[0]).toContain('requires a time unit');
  });
});

test.describe('stopwatch', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('start/stop/reset lifecycle', async ({ page }) => {
    let out = await runScript(page, 'stopwatchStart()');
    expect(results(out)[0]).toBe('Stopwatch started');
    await expect(overlay(page, '⏱️')).toBeVisible();

    await page.waitForTimeout(300);
    out = await runScript(page, 'stopwatchStop()');
    expect(results(out)[0]).toMatch(/^Stopwatch stopped at \d/);

    out = await runScript(page, 'stopwatchReset()');
    expect(results(out)[0]).toBe('Stopwatch reset');
    await expect(page.locator('body > div:has-text("⏱️")')).toHaveCount(0);
  });

  test('double start is rejected while running', async ({ page }) => {
    const out = await runScript(page, 'stopwatchStart()\nstopwatchStart()');
    expect(results(out)[1]).toContain('already running');
    await runScript(page, 'stopwatchReset()');
  });

  test('stop without start is a no-op message', async ({ page }) => {
    const out = await runScript(page, 'stopwatchStop()');
    expect(results(out)[0]).toBe('Stopwatch not running');
  });
});
