const { test, expect } = require('@playwright/test');
const { openApp, runScript, results } = require('./helpers');

// Browser timezone is pinned to America/Denver in playwright.config.js.

test.describe('date & time functions', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('now(Denver) returns an ISO timestamp with a Denver offset', async ({ page }) => {
    const out = await runScript(page, 'now(Denver)');
    // MDT -06:00 or MST -07:00 depending on date under test. Milliseconds
    // usually appear: luxon's suppressMilliseconds only drops them at .000.
    expect(results(out)[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?-0[67]:00/);
  });

  test('ISO results get an inline pretty-date badge', async ({ page }) => {
    await runScript(page, 'now()');
    await expect(page.locator('#output-area .pretty-date')).toHaveCount(1);
  });

  test('prettydate formats to the canonical pattern', async ({ page }) => {
    const out = await runScript(page, "prettydate('2024-03-05T14:30:00-07:00')");
    expect(results(out)[0]).toBe('2024_03_05_1430 Mar 05 02:30PM Tue');
  });

  test('prettydate on a non-date is "Invalid Date"', async ({ page }) => {
    const out = await runScript(page, "prettydate('not a date')");
    expect(results(out)[0]).toBe('Invalid Date');
  });

  test('toZone converts between predefined zones', async ({ page }) => {
    const out = await runScript(page, "toZone('2024-03-05T14:30:00-07:00', Sydney)");
    expect(results(out)[0]).toContain('2024-03-06T08:30:00+11:00');
  });

  test('dateDiff computes differences in a chosen unit', async ({ page }) => {
    const out = await runScript(page, [
      "dateDiff('2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z', 'days')",
      "dateDiff('2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', 'days')",
      "dateDiff('2024-01-01T00:00:00Z', '2024-01-01T06:00:00Z', 'hours')",
    ].join('\n'));
    expect(results(out)).toEqual(['7', '0', '6']);
  });

  test('date + duration returns a shifted ISO date', async ({ page }) => {
    const out = await runScript(page, "'2024-03-05T14:30:00-07:00' + 1 day");
    expect(results(out)[0]).toContain('2024-03-06T14:30:00');
  });

  test('duration + date also works (operand order edge)', async ({ page }) => {
    const out = await runScript(page, "30 minutes + '2024-03-05T14:30:00-07:00'");
    expect(results(out)[0]).toContain('2024-03-05T15:00:00');
  });

  test('date - duration returns a shifted ISO date', async ({ page }) => {
    const out = await runScript(page, "'2024-03-05T14:30:00-07:00' - 90 minutes");
    expect(results(out)[0]).toContain('2024-03-05T13:00:00');
  });

  test('date - date returns a human-readable duration', async ({ page }) => {
    const out = await runScript(page, "'2024-03-08T15:31:00Z' - '2024-03-05T14:30:00Z'");
    expect(results(out)[0]).toBe('3 days, 1 hours, 1 minutes');
  });

  test('identical dates subtract to "less than 1 minute"', async ({ page }) => {
    const out = await runScript(page, "'2024-03-05T14:30:00Z' - '2024-03-05T14:30:00Z'");
    expect(results(out)[0]).toBe('less than 1 minute');
  });

  test('numeric add/subtract still work despite the date overload', async ({ page }) => {
    const out = await runScript(page, '2 + 3\n10 - 4\n[1, 2] + [3, 4]');
    expect(results(out)[0]).toBe('5');
    expect(results(out)[1]).toBe('6');
    expect(results(out)[2]).toMatch(/4[\s\S]*6/);
  });

  test('ThreeZones reports Denver, Mechelen and Sydney', async ({ page }) => {
    const out = await runScript(page, "ThreeZones('2024-03-05T14:30:00-07:00')");
    const text = results(out)[0];
    expect(text).toContain('Denver');
    expect(text).toContain('Mechelen');
    expect(text).toContain('Sydney');
    expect(text).toContain('2024_03_05_1430'); // Denver rendering of the input
    expect(text).toContain('2024_03_06_0830'); // Sydney is +18h from -07:00
  });

  test('ThreeZonesNow runs without error', async ({ page }) => {
    const out = await runScript(page, 'ThreeZonesNow()');
    expect(results(out)[0]).toContain('Denver');
    expect(results(out)[0]).not.toContain('Error');
  });

  test('date() validates its input', async ({ page }) => {
    const out = await runScript(page, "date('2024-06-15')\ndate('garbage')");
    expect(results(out)[0]).toContain('2024-06-15T00:00:00');
    expect(results(out)[1]).toBe('Invalid Date');
  });
});
