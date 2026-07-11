# ScriptCalc (ipad-tools)

**ScriptCalc** is a self-contained, browser-based scientific calculator with MATLAB-style syntax. The entire application lives in a single file — [`index.html`](index.html) — with all CSS and JavaScript inline, so there is **no build step, no server, and no install**. Open the file in a browser and it works.

It is designed to run well on:

- an **iPad with internet access** (libraries load from CDNs), and
- a **Windows PC with or without internet access** (offline use requires the local library files described in [Offline setup](#offline-setup-windows-pc-without-internet)).

## Quick start

1. Open `index.html` in a browser (double-click, or serve it from any static host such as GitHub Pages).
2. Type commands in the left/top **Input** pane.
3. Press **Shift+Enter** or the **Run** button (▶ floating button on mobile) to execute.
4. Results appear in the **Console** tab; plots appear in the **Graph** tab.

Your code is auto-saved to the browser's `localStorage` as you type, so it survives page reloads. **Reset** clears the editor (with confirmation). **Cheatsheet** opens a quick-reference modal; **Help** opens a full documentation page in a new tab.

## Feature overview

### MATLAB-style math & plotting

Powered by [math.js](https://mathjs.org/) for evaluation and [Plotly](https://plotly.com/javascript/) for rendering.

```matlab
figure
x = range(0, 10, 0.1)
plot(x, sin(x))        # sin() is auto-vectorized over arrays
hold on
plot(x, cos(x))
legend('sin(x)', 'cos(x)')
title('Sine and Cosine')
xlabel('X'); ylabel('Y')
```

- `figure`, `plot(x, y)`, `hold on` / `hold off`, `title()`, `xlabel()`, `ylabel()`, `legend()`
- Advanced form: `plot([trace1, trace2], layout)` passes raw Plotly trace/layout objects
- Element-wise operators `.*`, `./`, `.^` (rewritten to `dotMultiply`/`dotDivide`/`dotPow` before evaluation)
- Auto-vectorized functions: `sin cos tan asin acos atan sinh cosh tanh exp log log10 log2 sqrt abs sign` work on scalars, arrays, and matrices
- Matrices: `[1, 2; 3, 4]`, `identity(n, m)`, `inv()`, matrix vs. element-wise multiply
- Each console line that generates a graph gets a clickable "Graph N generated" link that jumps to it

### Date & time (Luxon)

- `now(zone)` — current time as ISO string; `Denver`, `Mechelen`, `Sydney` are predefined zone constants
- `prettydate(iso)` — formats as `yyyy_MM_dd_HHmm MMM dd hh:mma EEE`
- `toZone(iso, zone)`, `date(str)`, `dateDiff(d1, d2, unit)`
- `ThreeZonesNow()` / `ThreeZones(timestamp)` — the same instant in Denver, Mechelen, and Sydney
- Date arithmetic via overloaded `+`/`-`: `now() + 30 minutes`, `today + 1 week`, and `date1 - date2` returns a human-readable duration ("2 years, 3 months, …"). ISO date strings printed to the console get an inline pretty-formatted badge.

### Currency conversion

USD, EUR, GBP, AUD, and CAD are registered as math.js **units**, so conversion uses the same natural syntax as physical units:

```matlab
showrates()          # current rates + their age
100 USD in EUR
price = 25.50 EUR
price in USD
```

Rates are fetched from `https://open.er-api.com/v6/latest/USD`, cached in `localStorage` for **1 hour**, and fall back to hardcoded approximate rates when offline. Diagnostics: `checkcurrency()`, `refreshcurrency()`.

### Unit conversions

Everything math.js supports: `1 kg in lbs`, `25 degC in degF`, `3 teaspoons in ml`, plus a custom `toFeetInches(180 cm)` → `5' 10.87"`.

### Timers & stopwatch

- `timer(3 minutes)` / `timer(90)` (bare numbers = seconds) — floating countdown overlay with an audio alert at zero; `timerCancel()`
- `stopwatchStart()`, `stopwatchStop()`, `stopwatchReset()` — floating elapsed-time overlay
- One timer and one stopwatch at a time

### Text utilities

- `nato('Hello')` → NATO phonetic alphabet (`Hotel Echo Lima Lima Oscar`)
- `latex('\alpha \to \beta')` → Unicode (`α → β`), automatically copied to the clipboard (uses the [unicodeit](https://github.com/svenkreiss/unicodeit) library)
- `printf("x = %.2f\n", x)` — C-style formatted output (`%s`, `%d`, `%f`, precision specs)

### Cochlear implant (CIC4) helpers

Current-level conversions for cochlear implant work, preloaded into the parser scope on every run:

- `CL2uAzp(CL)` — converts a CIC4 current level (0–255) to microamps: `17.5 · 100^(CL/255)`
- `uAzp2CL(I)` — the inverse: `255 · log10(I/17.5) / 2`

### Script conventions

| Syntax | Effect |
|---|---|
| `# comment` or `% comment` | Line is skipped |
| trailing `;` | Evaluate but suppress console output |
| `exit` | Stop execution; everything below is ignored |
| **Shift+Enter** | Run the script |

The **entire script re-runs from scratch** on every Run: the parser scope is cleared and re-seeded, the console is cleared, and all graphs are regenerated.

## Offline setup (Windows PC without internet)

`index.html` loads its three libraries from CDNs, and each `<script>` tag has an `onerror` fallback that loads a **local file from the same folder** instead. Those local files are **not committed to this repo**, so for fully offline use, download them once (while online) and place them next to `index.html` with these exact names:

| Local filename | Download from |
|---|---|
| `math.js` | https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.0/math.min.js |
| `luxon.js` | https://cdnjs.cloudflare.com/ajax/libs/luxon/3.4.4/luxon.min.js |
| `plotly.min.js` | https://cdn.plot.ly/plotly-2.27.0.min.js |
| `unicodeit.js` | a browser (non-module) build of [unicodeit](https://github.com/svenkreiss/unicodeit) that sets `window.unicodeitLib` |

Note that `unicodeit.js` is the reverse of the others: it is loaded **local-first**, with an ES-module CDN fallback (`esm.sh`) if the local file is missing.

Offline behavior notes:

- If neither CDN nor local files load, the app shows a "Missing Files" diagnostic listing what's absent (5-second timeout).
- Currency conversion works offline using the last cached rates (up to 1 hour old is treated as fresh; older cached rates are still used if the fetch fails) or the hardcoded fallback rates.
- `latex()` needs either the local `unicodeit.js` or network access.

## Architecture / developer map

Everything is in `index.html` (~1,800 lines). Reading order for future feature work:

| Section | Location (approx.) | What it does |
|---|---|---|
| **Loader & fallback logic** | `<head>`, top | `window.loadFallback` swaps a failed CDN `<script>` for its local twin; `window.scriptErrors` feeds the missing-files diagnostic UI |
| **Styles** | `<style>` in `<head>` | CSS variables, split-pane layout, tabs, modal, mobile breakpoint at 768px (stacked panes + FAB) |
| **Markup** | `<body>` | Header buttons, input `<textarea>`, output panel with Console/Graph tabs, cheatsheet `<dialog>` |
| **Currency subsystem** | top of main `<script>` | `fetchExchangeRates` → `localStorage` cache → `createCurrencyUnits` (defines `USD/EUR/GBP/AUD/CAD` + lowercase aliases as math.js units, deleting old definitions first) |
| **Figure state & rendering** | after currency code | `currentFigure` / `holdState` module globals, `createNewFigure()`, `renderFigure()` (appends a labeled Plotly div to `#graphs-container`), `jumpToGraph()` |
| **`initMath()`** | middle | The heart of the app: one big `math.import({...}, {override: true})` call registering every custom function (plotting commands, auto-vectorized math, dates, currency helpers, timers, `nato`, `latex`, `printf`, …). Runs once dependencies are polled ready, then creates the persistent `math.parser()` |
| **`preloadScopeFunctions()`** | near bottom | Re-seeds parser scope each run: `CL2uAzp`, `uAzp2CL`, and the `Denver`/`Mechelen`/`Sydney` zone-string constants |
| **`runCalculation()`** | near bottom | The interpreter loop: split input into lines → skip comments → handle `exit` and `;` → **regex preprocessing** (`hold on` → `hold('on')`; `.*`/`./`/`.^` → `dotMultiply`/`dotDivide`/`dotPow`; escape backslashes inside `latex('…')`) → `parser.evaluate(line)` → format result (matrix table via `formatMatrix`, graph-link markers, pretty-date badges, HTML-escaped strings) |
| **Full help page** | `showFullHelp()` | A complete standalone HTML documentation page embedded as a template string, opened via `window.open` + `document.write` |

### Extension points

- **New calculator function** → add it to the `math.import({...})` block in `initMath()`. Return a string for console output, or `""` for silent commands.
- **New user-defined constant/function available in scripts** → add a `parser.evaluate(...)` line to `preloadScopeFunctions()`.
- **New syntax sugar** (MATLAB-isms) → add a regex rewrite in the preprocessing section of `runCalculation()`, alongside the `hold on` and dot-operator rewrites.
- **New currency** → add it to `FALLBACK_RATES`, the rate extraction in `fetchExchangeRates()`, the unit creation/deletion lists in `createCurrencyUnits()`, and `showrates()`/`checkcurrency()`.
- **New output rendering** (like the graph links) → the result-formatting branch inside `runCalculation()`; string results matching `GRAPH_LINK:<n>` show how to smuggle rich output through the evaluator.

### Quirks & known limitations worth remembering

- The dot-operator regex rewriting is **per-line and pattern-based**, not a real parser — deeply nested or chained `.*` expressions with parenthesized operands may not rewrite correctly.
- The whole script re-executes on every run; there is no incremental/cell evaluation and no persistent state between runs (by design — it keeps output reproducible).
- `latex()` clipboard copy fails silently in contexts where the Clipboard API is unavailable (e.g. non-HTTPS file:// on some browsers); the converted string is still shown.
- Trig functions are replaced with native-JS-`Math` wrappers for speed/vectorization, so they **lose math.js unit/complex-number support** (e.g. `sin(45 deg)` no longer works — use radians).
- Only 5 currencies are wired up; rates are all quoted against USD.
- The help page relies on `window.open` — pop-up blockers can suppress it.
- Timer audio uses an embedded base64 WAV and may be blocked until the user has interacted with the page.

## Repo layout

```
ipad-tools/
├── index.html   # the entire application
└── README.md    # this file
```

(Local library files for offline use — `math.js`, `luxon.js`, `plotly.min.js`, `unicodeit.js` — sit next to `index.html` on the target machine but are currently not committed. Committing pinned copies is a good candidate future improvement for a zero-setup offline experience.)
