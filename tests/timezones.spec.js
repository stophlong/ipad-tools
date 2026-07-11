const { test, expect } = require('@playwright/test');
const { openApp, runScript, results } = require('./helpers');

// The suite default timezone is America/Denver (playwright.config.js).
// These tests override it to simulate traveling.

const cityTime = (text, city) => {
  const m = text.match(new RegExp(`${city}\\s+(\\d{4}_\\d{2}_\\d{2}_\\d{4})`));
  return m && m[1];
};

test.describe('at home in Denver', () => {
  test('ThreeZonesNow shows the three cities and no Local line', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, 'ThreeZonesNow()');
    const text = results(out)[0];
    expect(text).toContain('Denver');
    expect(text).toContain('Mechelen');
    expect(text).toContain('Sydney');
    expect(text).not.toContain('Local');
  });
});

test.describe('traveling: device in Sydney', () => {
  test.use({ timezoneId: 'Australia/Sydney' });

  test('the Denver line shows true Denver time, not device time', async ({ page }) => {
    // This was the reported bug: while visiting Sydney, the "Denver" line
    // showed Sydney's clock.
    await openApp(page);
    const out = await runScript(page, 'ThreeZonesNow()');
    const text = results(out)[0];
    const denver = cityTime(text, 'Denver');
    const sydney = cityTime(text, 'Sydney');
    expect(denver).toBeTruthy();
    expect(sydney).toBeTruthy();
    expect(denver).not.toBe(sydney); // Denver is 16-18h behind Sydney
  });

  test('no Local line when the device zone is one of the three cities', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, 'ThreeZonesNow()');
    expect(results(out)[0]).not.toContain('Local');
  });

  test('now() still means device-local time', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, 'now()');
    expect(results(out)[0]).toMatch(/\+(10|11):00/); // Sydney offset
  });
});

test.describe('traveling: device in New York (not one of the cities)', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('ThreeZonesNow adds a Local line with the device zone', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, 'ThreeZonesNow()');
    const text = results(out)[0];
    expect(text).toContain('Local');
    expect(text).toContain('America/New_York');
    const denver = cityTime(text, 'Denver');
    const local = cityTime(text, 'Local');
    expect(denver).toBeTruthy();
    expect(local).toBeTruthy();
    expect(denver).not.toBe(local); // NY is 2h ahead of Denver
  });

  test('ThreeZones with an explicit timestamp converts each city correctly', async ({ page }) => {
    await openApp(page);
    const out = await runScript(page, "ThreeZones('2026-02-04T13:44:00+11:00')");
    const text = results(out)[0];
    // 13:44 Sydney time on Feb 4 = 19:44 Feb 3 in Denver, 03:44 in Mechelen
    expect(text).toMatch(/Denver\s+2026_02_03_1944/);
    expect(text).toMatch(/Mechelen\s+2026_02_04_0344/);
    expect(text).toMatch(/Sydney\s+2026_02_04_1344/);
  });
});
