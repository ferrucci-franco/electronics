# Pitfalls behind the plot-interaction code

Each item cost a round of debugging in `bode-measure/`. The module already handles all of them; keep them
in mind when changing it or writing gesture code by hand.

1. **Scripted page scroll is never smooth.** An earlier version set `scrollTop` from JS with an imitation
   inertia: the owner noticed it at once. Let the browser scroll: plots get `touch-action: manipulation`
   (native pan allowed, double-tap zoom off), and the gesture is decided on the first move past 8 px,
   before the browser's own touch slop. For a pan, a zoom or a pinch, `touchmove` is `preventDefault`ed
   (non-passive listener on the plot); for a scroll nothing is cancelled and the browser takes over
   (`pointercancel` follows). The decision runs from both `pointermove` and `touchmove`, whichever comes first.

2. **`overscroll-behavior: contain` on a container that does not scroll** blocks every native scroll
   that starts inside it (Chrome treats `overflow: hidden` boxes as scroll containers). In the fitted
   Bode layout this made the page impossible to scroll from the plots. Set it only where the box really scrolls.

3. **Plotly's touch handlers** draw a zoom box on a finger drag. Stop `touchstart`/`touchmove`/`touchend`
   propagation in the capture phase on the plot div so Plotly never sees them; do not `preventDefault`
   `touchstart`, or the tap's emulated mouse events (tooltips, legend clicks) disappear.

4. **A tap ends with an emulated `mouseout`** (some taps only), and Plotly answers it by removing the tooltip
   the tap just showed. Swallow `mouseout` on the plot for 700 ms after a touch ends. Also call
   `Plotly.Fx.hover(gd, {clientX, clientY, target}, 'xy')` on a tap: a second tap on the same spot sends no
   `mousemove`, so it would show nothing.

5. **The tooltip comes back after every redraw** of a gesture (Plotly remembers `_hoversubplot` until a
   mouseout a finger never sends). Hide `.hoverlayer` with a class during gestures, and after a pan, zoom,
   pinch or fit set `gd._fullLayout._hoversubplot = null` and call `Plotly.Fx.unhover(gd)`.

6. **Double-click:** Plotly's default `doubleClick: 'reset+autosize'` runs *after* a `plotly_doubleclick`
   handler and autoscales to the data, undoing the app's fit. Use `doubleClick: false`; Plotly still emits
   `plotly_doubleclick`. The DOM `dblclick` never reaches the plot (it lands on Plotly's drag cover).

7. **Phones keep `:hover` after a tap**, so a button styled `:hover { opacity: 1 }` stays lit. Put hover
   styles in `@media (hover:hover)` and `blur()` a button after a pointer click (`if(e.detail)`).

8. **Pinch baseline:** measure the spread from where the fingers came down (`touchstart` with two touches),
   not from the first `touchmove`, or the zoom lags the fingers. Ignore an axis along which the fingers are
   closer than 24 px (it keeps its scale), cap the factor at 50.

9. **Mouse right button:** Plotly reads a right drag as a zoom box it never draws and collapses both axes
   on release. Catch `pointerdown` with `button` 1 or 2 in the capture phase, pan, and stop the matching
   `mousedown`/`mouseup`/`auxclick`; prevent the context menu on the plot.

10. **Trackpad vs mouse wheel:** they cannot be told apart reliably. Only a swipe whose first event is more
    horizontal than vertical pans (latched for 800 ms so a lift-and-replace keeps panning); everything else
    is left to the browser. Wheel zoom was explicitly rejected.

11. **Testing touch in headless Chromium:** `Input.dispatchTouchEvent` (CDP) drives both the page's events
    and native scrolling; `Input.synthesizeScrollGesture` does not scroll in headless. A test plot with no
    data hides bugs (autoscale vs fit, legend, tooltip): always test with points on the plot.

12. **Legend button position:** read the legend box from Plotly's `.infolayer .legend` group (`rect.bg`
    size, `transform` translate), add the plot div's offset in its container, and move the shown legend
    aside with the CSS `translate` property on that group — never by changing the figure, so redraws,
    legend clicks and image exports keep working.
