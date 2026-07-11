const { test, expect } = require('@playwright/test');
const { openApp, runScript, results, errors, infos, commands } = require('./helpers');

test.describe('line interpreter', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('evaluates simple expressions and shows command + result', async ({ page }) => {
    const out = await runScript(page, '1 + 2');
    expect(commands(out)).toEqual(['> 1 + 2']);
    expect(results(out)).toEqual(['3']);
  });

  test('skips # and % comments and blank lines', async ({ page }) => {
    const out = await runScript(page, '# hash comment\n% percent comment\n\n   \nx = 7');
    expect(commands(out)).toEqual(['> x = 7']);
    expect(results(out)).toEqual(['7']);
  });

  test('trailing semicolon suppresses the result but still executes', async ({ page }) => {
    const out = await runScript(page, 'a = 100;\nb = a + 1');
    expect(results(out)).toEqual(['101']); // a=100 ran (b uses it) but printed nothing
    expect(commands(out)).toEqual(['> a = 100;', '> b = a + 1']);
  });

  test('exit stops execution; lines below are ignored', async ({ page }) => {
    const out = await runScript(page, 'x = 1\nexit\ny = 2');
    expect(results(out)).toEqual(['1']);
    expect(infos(out)).toContain('Execution stopped by exit command.');
    expect(commands(out)).not.toContain('> y = 2');
  });

  test('exit is case-insensitive and whitespace-tolerant', async ({ page }) => {
    const out = await runScript(page, '   EXIT   \ny = 2');
    expect(infos(out)).toContain('Execution stopped by exit command.');
    expect(commands(out)).toHaveLength(0);
  });

  test('an erroring line shows an error and execution continues', async ({ page }) => {
    const out = await runScript(page, 'undefinedVariable123 + 1\nx = 5');
    expect(errors(out)).toHaveLength(1);
    expect(errors(out)[0]).toContain('Undefined symbol undefinedVariable123');
    expect(results(out)).toEqual(['5']); // the line after the error still ran
  });

  test('variables persist across lines within one run', async ({ page }) => {
    const out = await runScript(page, 'x = 10;\ny = x * 2;\nz = y + x');
    expect(results(out)).toEqual(['30']);
  });

  test('parser scope is reset between runs', async ({ page }) => {
    await runScript(page, 'secret = 42');
    const out = await runScript(page, 'secret + 1');
    expect(errors(out)[0]).toContain('Undefined symbol secret');
  });

  test('preloaded scope survives the per-run reset', async ({ page }) => {
    await runScript(page, 'x = 1'); // first run clears + reseeds scope
    const out = await runScript(page, 'Denver');
    expect(results(out)).toEqual(['America/Denver']);
  });

  test('comment-only script reports "Run complete."', async ({ page }) => {
    const out = await runScript(page, '# nothing but a comment');
    expect(infos(out)).toContain('Run complete.');
    expect(results(out)).toHaveLength(0);
  });

  test('each run clears previous console output', async ({ page }) => {
    await runScript(page, '111 + 111');
    const out = await runScript(page, '5 + 5');
    expect(results(out)).toEqual(['10']);
    expect(out.map(l => l.text).join('\n')).not.toContain('222');
  });
});
