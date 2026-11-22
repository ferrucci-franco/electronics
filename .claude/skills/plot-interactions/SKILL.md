---
name: plot-interactions
description: The agreed mouse, trackpad and touch behaviour for every Plotly plot in the ferrucci-lab.com apps (this repo) — one-finger gestures on phones (fast finger scrolls the page, slower finger pans, hold-then-drag zooms, slow/quick double tap, pinch), right-button pan, wheel that never zooms, semi-transparent Fit X / Fit Y / Fit all buttons, an in-plot legend that can be hidden, linked x axes, plus a drop-in JS module and a browser check script. Use this skill whenever you create an app with a plot in this repo, add or change a plot, port an app to phones, or touch anything about zoom, pan, scroll on plots, double tap/double-click, legends, tooltips or fit/autoscale buttons — even when the request only says "make it work on mobile", "the scroll feels wrong", "add a Bode/time plot" or "fix the legend".
---

# Plot interactions (ferrucci-lab.com apps)

Every plot in this repo should feel the same on a lab PC with a mouse, on a laptop trackpad and on a
phone. The behaviour below was settled with the repo owner one point at a time while building
`bode-measure/` (the reference implementation) and aligned with `timeseries-explorer` (unditas.com,
`src/ui/plot-touch-gestures.js`, `src/ui/legend-toggle.js`). Apply it as is: the owner has already
rejected alternatives (wheel zoom, help-text overlays, Plotly's modebar), and every rule has a reason.

## The behaviour

| Input | Result | Why |
|---|---|---|
| Mouse left drag | Plotly zoom box | Standard, expected |
| Mouse right (or middle) drag | Pan both axes | Plotly would draw no box and collapse the axes on release |
| Mouse wheel / vertical two-finger swipe | Page scroll, never zoom | Wheel zoom traps users who just want to scroll |
| Two-finger swipe that **starts sideways** | Pan, latched 800 ms through pauses | A sideways start is a clear intent; vertical stays a scroll |
| Ctrl+wheel / trackpad pinch | Left to the browser | Not requested |
| Double-click | **Every** plot back to its initial view | Plotly's own reset only resets one plot, and autoscales |
| Finger, fast (> 0.6 px/ms) and mostly vertical | **Native** page scroll with the browser's inertia | Scrolling past a plot must not be hijacked |
| Finger, slower | Pan both axes | |
| Any finger while the page is still moving (< 150 ms since a scroll event), or starting outside the plotting area | Native scroll | Continuing a scroll must never turn into a pan |
| Finger held still 350 ms, then moved | Zoom: x band, y band or window, by direction (ring under the finger while armed) | Phones have no zoom box |
| Tap, then a second touch within 700 ms / 60 px that moves or is held | Same zoom | |
| Slow double tap (gap ≥ 300 ms, both lifted) | Next drag within 4 s draws the zoom window; a hint pill says how | As in unditas |
| Quick double tap (gap < 300 ms) | Every plot back to its initial view | |
| Two fingers | Pinch: each axis scales by the fingers' spread along it, the values under the fingers stay under them; page zoom blocked | As in unditas |
| Tap | Tooltip of the point under the finger, which stays | |
| Fit X button | x back to the initial view (linked plots follow) | |
| Fit Y button | y fitted to what is **drawn in the current x window**, 8 % margin; initial range if nothing is drawn | Returning to a fixed default range looked like "Fit Y does nothing" |
| Fit all button | That plot's initial view | |
| Legend | Inside the plot, in its emptiest corner, semi-transparent; a small button at its corner hides/shows it. Hidden at start on phones; shown on computers unless wider than 40 % of the plot; the choice is kept per plot | Frees the band above the plot; "lo interesante es que se puede ocultar" |

Fit buttons: three small buttons (↔, ↕, corners) in the top-right corner of each plot, opacity 0.5,
1 on hover **only with a real pointer** (`@media (hover:hover)`, phones keep `:hover` after a tap),
28 px with a mouse, 36 px on touch screens. Titles: FR « Ajuster X / Ajuster Y / Tout ajuster »,
EN « Fit X / Fit Y / Fit all », ES « Ajustar X / Ajustar Y / Ajustar todo ».

"Initial view" is the app's own default view (e.g. 10 Hz – 100 kHz widened to the data), not Plotly's
autorange. The app keeps it current with `setFitView` after every redraw.

## How to apply it

1. **Use the module.** Copy `assets/plot-interactions.js` into the app: inline it in a `<script>` for the
   usual single-file app, or ship it beside `index.html`. It needs only Plotly 2.x (CDN
   `https://cdn.plot.ly/plotly-2.32.0.min.js`, as the other apps). Read its header comment for the API.
2. **Plot config:** `{displaylogo:false, displayModeBar:false, responsive:true, scrollZoom:false, doubleClick:false}`.
   `doubleClick:false` matters: Plotly's reset would otherwise run after ours and autoscale the axes.
3. **Markup:** each plot div alone in its own container (`<div class="cell"><div id="gain"></div></div>`);
   the module puts the Fit buttons and the legend button in that container.
4. **Layout:** legend from the helpers, top margin for the title only:
   ```js
   const corner = PlotInteractions.emptiestCorner(xRangeLog, yRange, [{x:theoryF, y:theoryDb, w:1}, {x:measF, y:measDb, w:8}], true);
   layout.legend = PlotInteractions.overlayLegend(corner, {paper:'#ffffff', grid:'#e6ebf3', fontSize:12});
   layout.margin = narrow ? {l:52, r:10, t:52, b:42} : {l:64, r:16, t:44, b:48};
   layout.title = {text:'<b>…</b>', x:narrow ? 0.03 : 0.5, xanchor:narrow ? 'left' : 'center', y:0.985, yanchor:'top'};
   ```
   Narrow = plot narrower than 520 px: title on the left so the Fit buttons never cover it; re-render
   when the width crosses that limit.
5. **Install once, update the fit view after each redraw:**
   ```js
   const pi = PlotInteractions.install([gdGain, gdPhase], {linkX:true, texts:() => TXT[LANG]});
   // after Plotly.react(...):
   pi.setFitView(gdGain, {x:layoutGain.xaxis.range, y:layoutGain.yaxis.range});
   // after a language change:
   pi.refresh();
   ```
   `texts()` returns `{fitX, fitY, fitAll, legendShow, legendHide, zoomHint}` in the current language
   (strings in `references/i18n.md`). `minYSpan: gd => 3` sets Fit Y's smallest span (3 dB, 10° in bode-measure).
6. **CSS around the plots:** a container that does not scroll must not have `overscroll-behavior: contain`
   (it silently blocks the native scroll that starts on a plot); text selection off except in inputs.
7. **Check it in a browser** with `scripts/check-plot-interactions.js` (see below). Do not report the
   gestures as working without it: several bugs only showed with data on the plots.

If an app's plots differ (one plot, no shared x, a linear axis), the module handles it: `linkX:false`,
x ranges in data units for a linear axis. For an existing app with its own gesture code, replace that code
with the module rather than patching it piecemeal, and keep `bode-measure/index.html` (inline version of
the same code) consistent if you change a behaviour here.

## Checking

```bash
cd <scratchpad> && npm pack plotly.js-dist-min@2.32.0 && tar xzf plotly.js-dist-min-2.32.0.tgz   # cdn.plot.ly is blocked here
(cd /home/user/electronics && python3 -m http.server 8765 --bind 127.0.0.1 &)
PLOTLY_JS=$PWD/package/plotly.min.js SETUP_JS=fill.js \
  node /home/user/electronics/.claude/skills/plot-interactions/scripts/check-plot-interactions.js \
  http://127.0.0.1:8765/<app>/ <plotId> [<linkedPlotId>]
```

`SETUP_JS` is optional page JavaScript that puts data on the plot (typing table rows, loading a demo);
the tooltip, Fit Y and legend checks are skipped on an empty plot. The script runs 23 checks on an
emulated iPhone 13 (CDP touch events, which also drive native scrolling) and on a 1400 px desktop, and
exits with the number of failures. Real-device feel (smoothness of the native scroll, iOS quirks) still
needs the owner's phone: say so when reporting.

## Pitfalls already paid for

Read `references/pitfalls.md` before changing the gesture code. In short: decide on the first move
past 8 px (before the browser's own slop) and cancel `touchmove` only for pan/zoom/pinch; never script
the page scroll; stop Plotly's touch handlers in the capture phase; swallow the `mouseout` that follows
a tap; use `plotly_doubleclick`, not the DOM `dblclick`; clear `_hoversubplot` after gestures.

## Related layout conventions in these apps

- Scrollbars of panels and tables: thin but **always visible**, horizontally and vertically, on desktop
  and phone — overlay scrollbars that fade out hide the extra columns from students.
- Side panel next to the plots: wide enough by default for its table to fit when the window allows,
  with a draggable splitter between the panel and the plots.
- No text selection and no text caret outside the text fields: `body{user-select:none; caret-color:transparent}`,
  then `input:not([type=checkbox]):not([type=radio]), textarea{user-select:text; caret-color:auto}`. Otherwise a
  button focused from code (a confirmation's "Cancel") or caret browsing shows a blinking bar on it.
- Language selector FR/EN/ES (FR default), light/dark theme, plots styled as `adjustable-filters/`.
