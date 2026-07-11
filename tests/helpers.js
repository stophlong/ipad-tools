// Shared helpers for the ScriptCalc Playwright suite.
//
// Every test drives the real index.html in a real browser. To make runs
// deterministic (and to prove the offline path works), the CDN hosts are
// blocked so the app's onerror fallback loads the local library files
// (produced by `npm run setup`), and the exchange-rate API is mocked.

const FIXTURE_RATES = { USD: 1.0, EUR: 0.5, GBP: 0.8, AUD: 1.6, CAD: 1.25 };

// Hardcoded FALLBACK_RATES inside index.html (used when the API is down and
// nothing is cached).
const APP_FALLBACK_RATES = { USD: 1.0, EUR: 0.92, GBP: 0.79, AUD: 1.52, CAD: 1.36 };

const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.plot.ly', 'esm.sh'];

/**
 * Navigate to the app with deterministic routing and wait until math.js is
 * initialized (custom functions imported => parser exists).
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @param {object|'fail'|'slow'} [opts.rates] fixture rates object, 'fail' to
 *        simulate the exchange-rate API being unreachable, or 'slow' to
 *        delay its answer past the first user interaction
 * @param {string|null} [opts.seedCode] initial editor content placed in
 *        localStorage before load; null = genuine first visit (default code)
 */
async function openApp(page, opts = {}) {
  const { rates = FIXTURE_RATES, seedCode = '' } = opts;

  for (const host of CDN_HOSTS) {
    await page.route(`https://${host}/**`, route => route.abort());
  }
  await page.route('https://open.er-api.com/**', async route => {
    if (rates === 'fail') return route.abort();
    if (rates === 'slow') {
      // Answer only after the user has had time to run their first script.
      await new Promise(r => setTimeout(r, 4000));
      return route.fulfill({ json: { result: 'success', rates: FIXTURE_RATES } });
    }
    return route.fulfill({ json: { result: 'success', rates } });
  });

  if (seedCode !== null) {
    await page.addInitScript(code => localStorage.setItem('script_calc_code', code), seedCode);
  }

  await page.goto('/index.html');
  await page.waitForFunction(() => typeof math !== 'undefined' && typeof math.nato === 'function');
}

/** Read the console output as structured lines. */
async function getOutput(page) {
  return page.$$eval('#output-area .output-line', els =>
    els.map(e => {
      // Matrix grids and result+badge pairs are sibling <span>s whose
      // textContent would concatenate without separators; join with spaces.
      const spans = e.querySelectorAll('span');
      const text = spans.length
        ? Array.from(spans).map(s => s.textContent).join(' ')
        : e.textContent;
      return {
        type: e.classList.contains('cmd-line') ? 'cmd'
          : e.classList.contains('err-line') ? 'err'
          : e.classList.contains('info-line') ? 'info'
          : 'res',
        text,
      };
    })
  );
}

/** Type a script into the editor, hit Run, and return the console lines. */
async function runScript(page, code) {
  await page.fill('#input-area', code);
  await page.click('.desktop-run-btn');
  return getOutput(page);
}

const ofType = (lines, type) => lines.filter(l => l.type === type).map(l => l.text.trim());
const results = lines => ofType(lines, 'res');
const errors = lines => ofType(lines, 'err');
const infos = lines => ofType(lines, 'info');
const commands = lines => ofType(lines, 'cmd');

module.exports = {
  FIXTURE_RATES,
  APP_FALLBACK_RATES,
  openApp,
  getOutput,
  runScript,
  results,
  errors,
  infos,
  commands,
};
