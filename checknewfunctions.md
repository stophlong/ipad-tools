# Checking the New Functions

A hands-on walkthrough of everything added in this batch. Work top to bottom;
each section says what to paste into ScriptCalc, what you should see, and
which device to check it on. The automated test suite (`npm test`) covers the
logic — this guide is for the things only a human can judge (sound, feel,
copying on a real iPad, traveling).

---

## 1. `help()` in the console

Paste and run:

```
help()
```

**Expect:** a categorized quick reference (PLOTTING / MATH & MATRICES /
DATES & TIME / CURRENCY & UNITS / TIMERS / TEXT & MISC / SCRIPT SYNTAX)
printed as a console result.

Also click the **Cheatsheet** button — the examples are reorganized into the
same categories and every block should run if you paste it in.

---

## 2. Tap-to-copy output (iPad focus)

Paste and run:

```
6 * 7
prettydate(now())
[1, 2; 3, 4]
```

Then **tap each result line**:

- The line flashes green with a brief "Copied ✓".
- Paste somewhere (Notes, the input pane): plain `42`, the pretty date string,
  and the matrix as space-separated numbers.
- Tapping a "Graph N generated" link should still jump to the graph, not copy.

Check on: **iPad** (Safari and home-screen app mode) and **PC**. On the PC via
`file://` the copy uses a fallback path — verify pasting works there too.

---

## 3. In-app Help (iPad home-screen app mode focus)

1. Click **Help** in the header.
2. **Expect:** the full documentation opens **inside the app** as a
   full-screen panel with a "✕ Back to Calculator" button — no new browser
   window/tab.
3. Click "✕ Back to Calculator" — you're back, with your code and output
   untouched.

Check on: **iPad in home-screen app mode** (this used to trap you on the help
page), regular Safari, and PC. Also try it offline on the PC.

---

## 4. Currency: first-attempt reliability + offline notice

**First attempt (PC):** open a fresh copy of the file (or clear site data)
with the network cable out / Wi-Fi off, and as the *very first* command run:

```
100 USD in EUR
```

**Expect:** a conversion result immediately — never "Undefined symbol USD".
Below the results, one info line:

> ⚠ Offline exchange rates in use (built-in approximate rates from 2026-07-11)

If you had used it online before, the notice says `cached rates from <date time>`
instead. When you're online and rates were fetched this session, there is
**no** notice.

Also run:

```
showrates()
```

**Expect:** the four rates, their age, and a new `Source:` line showing
live / cached-with-date / built-in-with-date.

---

## 5. Travel-aware timezones

At home (device set to Denver time):

```
ThreeZonesNow()
```

**Expect:** exactly three lines (Denver / Mechelen / Sydney), each showing
that city's true current time. No "Local" line, since you're in Denver.

Simulate traveling: change the device timezone (Settings → General → Date &
Time on iPad, or Windows clock settings) to e.g. New York, reopen ScriptCalc,
run `ThreeZonesNow()` again.

**Expect:** the Denver line still shows **Denver** time (this was the bug —
it used to show your local time labeled "Denver"), and a fourth line appears:

> Local    2026_07_11_1830 Jul 11 06:30PM Sat (America/New_York)

If you set the device to Sydney/Brussels/Denver itself, the Local line stays
hidden (it's already one of the three). `now()` still means "wherever I am".

Don't forget to set the timezone back!

---

## 6. Matrix display (no more funny wrapping)

Paste and run:

```
[123456.789, 0.000012345; 9876543.21, 1]
identity(3, 3)
```

**Expect:** each matrix renders as a clean aligned grid — every row on one
line, columns sized to the widest number, right-aligned. A very wide matrix
scrolls horizontally inside the console instead of wrapping. Try narrowing
the window / rotating the iPad to confirm.

---

## 7. New timer alert sound

```
timer(5 seconds)
```

**Expect:** when it expires, **three gentle rising chirps** over about a
second and a half — noticeably longer, softer, and less piercing than the old
single beep. The "⏰ TIME'S UP!" banner still shows and clears itself.

Also confirm the overlay no longer blocks clicks: while a timer is counting,
the Run button still works (fixed in v1.1, worth re-checking with sound on).

Check on: **iPad, several times in a row** — this previously played only
rarely there. The fix: your first tap anywhere in the app unlocks audio for
the whole session, and starting a timer always involves a tap, so every
expiry should now chirp. Check the home-screen app specifically, and also
after locking/unlocking the iPad with the app open.

---

## 8. Batch 2: iPad feedback fixes

**Reset clears overlays.** Run:

```
stopwatchStart()
stopwatchStop()
```

The frozen stopwatch overlay stays on screen. Now press the header **Reset**
button and confirm — **expect** the stopwatch (and any running timer) to
disappear along with the code and console.

**Help search.** Run:

```
help('watch')
help('currency')
help('zzz')
```

**Expect:** only the stopwatch/timer lines for the first, currency lines for
the second, and a friendly "No help entries matching 'zzz'" for the third.
Bare `help()` still prints the whole reference.

**Runnable examples.** Open the **Cheatsheet** and the full **Help** page and
paste any code block into the input — every block now runs with zero errors
(the automated suite pastes every one of them on each test run). In
particular `log(100, 10)` → `2` and `log(256, 2)` → `8` (two-argument log was
silently broken before).

**LaTeX backslashes.** The cheatsheet now shows `latex('\alpha \to \beta')`
with single backslashes — paste it and **expect** `α → β`. Pasting the old
double-backslash form `latex('\\alpha')` also still converts.

---

## 9. Everything old still works

Quick regression sweep — paste the whole block; every line should behave:

```
x = range(0, 6.28, 0.1)
plot(x, sin(x))
hold on
plot(x, cos(x))
legend('sin', 'cos')
a = [1, 2, 3] .* [4, 5, 6]
nato('OK')
printf("pi = %.4f\n", pi)
CL2uAzp(255)
toFeetInches(180 cm)
prettydate(now())
exit
this line is ignored
```

**Expect:** one graph with two traces, `[4, 10, 18]`, `Oscar Kilo`,
`pi = 3.1416`, `1750`, `5' 10.87"`, a pretty date, and
"Execution stopped by exit command."
