const { test, expect } = require('@playwright/test');
const { openApp, runScript, results } = require('./helpers');

const graphDivs = page => page.locator('#graphs-container .js-plotly-plot');

// Plotly attaches trace data to the graph div; wait until it has rendered.
async function graphData(page, index) {
  await expect(graphDivs(page).nth(index)).toBeAttached();
  return page.evaluate(i => {
    const gd = document.querySelectorAll('#graphs-container .js-plotly-plot')[i];
    return {
      traceCount: (gd.data || []).length,
      names: (gd.data || []).map(t => t.name || null),
      types: (gd.data || []).map(t => t.type || null),
      title: gd.layout.title && (gd.layout.title.text || gd.layout.title),
      xTitle: gd.layout.xaxis && gd.layout.xaxis.title && (gd.layout.xaxis.title.text || gd.layout.xaxis.title),
      yTitle: gd.layout.yaxis && gd.layout.yaxis.title && (gd.layout.yaxis.title.text || gd.layout.yaxis.title),
      firstY: gd.data && gd.data[0] ? Array.from(gd.data[0].y.slice(0, 3)) : null,
    };
  }, index);
}

test.describe('MATLAB-style plotting', () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test('plot(x, y) renders one Plotly graph with the right data', async ({ page }) => {
    const out = await runScript(page, [
      'x = [0, 1, 2];',
      'plot(x, [10, 20, 30])',
    ].join('\n'));
    await expect(graphDivs(page)).toHaveCount(1);
    const g = await graphData(page, 0);
    expect(g.traceCount).toBe(1);
    expect(g.firstY).toEqual([10, 20, 30]);
    // console gets a clickable link line
    expect(results(out).join(' ')).toContain('Graph 1 generated');
  });

  test('hold on accumulates traces; legend/title/labels apply', async ({ page }) => {
    await runScript(page, [
      'x = [0, 1, 2];',
      'plot(x, [1, 2, 3])',
      'hold on',
      'plot(x, [3, 2, 1])',
      "legend('up', 'down')",
      "title('Two Lines')",
      "xlabel('X Axis')",
      "ylabel('Y Axis')",
    ].join('\n'));
    await expect(graphDivs(page)).toHaveCount(1);
    const g = await graphData(page, 0);
    expect(g.traceCount).toBe(2);
    expect(g.names).toEqual(['up', 'down']);
    expect(g.title).toBe('Two Lines');
    expect(g.xTitle).toBe('X Axis');
    expect(g.yTitle).toBe('Y Axis');
  });

  test('without hold, a second plot() starts a new figure', async ({ page }) => {
    await runScript(page, [
      'x = [0, 1, 2];',
      'plot(x, [1, 2, 3])',
      'plot(x, [3, 2, 1])',
    ].join('\n'));
    await expect(graphDivs(page)).toHaveCount(2);
    expect((await graphData(page, 0)).traceCount).toBe(1);
    expect((await graphData(page, 1)).traceCount).toBe(1);
  });

  test('figure() separates plots even with hold on', async ({ page }) => {
    await runScript(page, [
      'x = [0, 1, 2];',
      'figure()',
      'plot(x, [1, 2, 3])',
      'hold on',
      'plot(x, [4, 5, 6])',
      'figure()',
      'plot(x, [7, 8, 9])',
    ].join('\n'));
    await expect(graphDivs(page)).toHaveCount(2);
    expect((await graphData(page, 0)).traceCount).toBe(2);
    expect((await graphData(page, 1)).traceCount).toBe(1);
  });

  test('bare figure (no parens) starts a new figure, MATLAB-style', async ({ page }) => {
    // The cheatsheet and default example use `figure` without parentheses;
    // it must break out of hold mode just like figure().
    await runScript(page, [
      'x = [0, 1, 2];',
      'figure',
      'plot(x, [1, 2, 3])',
      'hold on',
      'plot(x, [4, 5, 6])',
      'figure',
      'plot(x, [7, 8, 9])',
    ].join('\n'));
    await expect(graphDivs(page)).toHaveCount(2);
    expect((await graphData(page, 0)).traceCount).toBe(2);
    expect((await graphData(page, 1)).traceCount).toBe(1);
  });

  test('advanced form: plot([traces], layout) passes raw Plotly objects', async ({ page }) => {
    await runScript(page, [
      'x = [0, 1, 2];',
      "t1 = {x: x, y: [1, 2, 3], name: 'Line', type: 'scatter'};",
      "t2 = {x: x, y: [3, 2, 1], name: 'Bars', type: 'bar'};",
      "plot([t1, t2], {title: 'Mixed'})",
    ].join('\n'));
    await expect(graphDivs(page)).toHaveCount(1);
    const g = await graphData(page, 0);
    expect(g.types).toEqual(['scatter', 'bar']);
    expect(g.names).toEqual(['Line', 'Bars']);
    expect(g.title).toBe('Mixed');
  });

  test('invalid plot arguments return a readable error, not a crash', async ({ page }) => {
    const out = await runScript(page, 'plot(5)');
    expect(results(out).join(' ')).toContain('Invalid arguments for plot()');
    await expect(graphDivs(page)).toHaveCount(0);
  });

  test('auto-vectorized function inside plot: plot(x, sin(x))', async ({ page }) => {
    await runScript(page, [
      'x = range(0, 6.28, 0.1);',
      'plot(x, sin(x))',
    ].join('\n'));
    await expect(graphDivs(page)).toHaveCount(1);
    const g = await graphData(page, 0);
    expect(g.traceCount).toBe(1);
    expect(g.firstY[0]).toBeCloseTo(0, 5);
  });

  test('re-running clears old graphs', async ({ page }) => {
    await runScript(page, 'plot([0, 1], [0, 1])');
    await expect(graphDivs(page)).toHaveCount(1);
    await runScript(page, '1 + 1');
    await expect(graphDivs(page)).toHaveCount(0);
  });

  test('Graph tab shows plots, Console tab shows text', async ({ page }) => {
    await runScript(page, 'plot([0, 1], [0, 1])');
    await page.click('.tab-btn:has-text("Graph")');
    await expect(page.locator('#graphs-container')).toBeVisible();
    await expect(page.locator('#output-area')).toBeHidden();
    await page.click('.tab-btn:has-text("Console")');
    await expect(page.locator('#output-area')).toBeVisible();
    await expect(page.locator('#graphs-container')).toBeHidden();
  });
});
