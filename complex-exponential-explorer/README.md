# Complex Exponential Explorer

An interactive, classroom-oriented visualisation of the link between the **real
exponential** and the **complex exponential**, built to prepare students
visually for Euler's formula.

**Live version:** https://ferrucci-franco.github.io/electronics/complex-exponential-explorer/

## The idea

The application does not open on Taylor. It opens on a question a student can
picture: **I am at x. What happens when I move forward by one small step Δx?**

The exponential answers it exactly, with no approximation at all:

```
y(x + Δx) = e^(x+Δx) = e^x · e^Δx = y(x) · e^Δx
```

Advancing is *multiplying*. Only now does a real problem appear — what is that
factor worth for a small step? — and only now is Taylor needed:

```
e^Δx = 1 + Δx + (Δx)²/2! + (Δx)³/3! + …   ≈   1 + Δx
```

which discretises to

```
y(n+1) = y(n) · (1 + Δx)          starting from  (x₀, y₀) = (0, 1)
```

giving `1, 1.1, 1.21, 1.331, …` for `Δx = 0.1`.

**Complex mode repeats the reasoning without changing a comma:**

```
z(x + Δx) = e^i(x+Δx) = e^ix · e^iΔx = z(x) · e^iΔx
e^iΔx ≈ 1 + iΔx
z(n+1) = z(n) · (1 + i·Δx)        starting from  z₀ = 1 + 0i
```

The two screens end on the same formula up to one symbol —
`y(n+1) = y(n)(1 + Δx)` against `z(n+1) = z(n)(1 + iΔx)` — so the student's own
question becomes *what does that i change?*, which is the door to Euler.

The approximation is used exactly as written. The modulus is never normalised
and the path is never corrected towards a circle, so the multiplication by
`|1 + iΔx| = √(1 + Δx²) > 1` at every step produces a genuine, slowly opening
**spiral**. Reducing `Δx` makes that spurious radial growth shrink and the
trajectory converge visibly to the unit circle — which is the point of the whole
application.

Euler's formula is deliberately *not* shown up front; it is offered only in the
optional **Conclusion** section of the complex mode.

## Using it

| Control | What it does |
|---|---|
| `Δx` slider | The only mathematical parameter, logarithmic from 0.001 to 0.5. Changing it **rebuilds the trajectory with the same accumulated `x`**, so the same three turns can be compared at `Δx = 0.1` and at `Δx = 0.01`. |
| `+1 step`, `+5 steps` | Advance the discrete recurrence. |
| `Complete one turn` | Advances the argument by a further `2π`. It never clears the path, so pressing it repeatedly stacks turn after turn. |
| `Play / Pause` | Performs exactly the same discrete steps, one at a time, slowly enough to watch the construction. |
| `Reset` | Back to `n = 0`. |

`Complete one turn` appears in complex mode only: a turn is an angle, and on
the real axis it was just an obscure way of asking for 2π more of `x`.

On the plot: **drag** a box to zoom into it (held to the plot's aspect ratio in
complex mode, so the unit circle stays a circle; free in real mode, where a
long thin band zooms that axis alone), **wheel** zooms about the pointer,
**two fingers** on a trackpad zoom when they go straight up or down and pan
when they go sideways or diagonally, **middle- or right-button drag** pans
too, **double click** returns to the automatic fit. Mouse and
trackpad only — a finger keeps scrolling the page.

A frame chosen by hand is kept: moving the `Δx` slider changes the trajectory
without reframing the plot. The one thing that gives the plot back to the
automatic fit is the last point starting to leave the screen — and only if it
was on screen to begin with, so a frame deliberately placed away from the tip is
never disturbed.

The wheel and the arrow keys both drive the `Δx` slider — after the pointer has
rested on it for a moment, so that merely crossing it while scrolling the page
does nothing. One notch per 1% of the range; `Page Up` / `Page Down` are five
notches, `Home` and `End` the two extremes. The arrows work with the slider
focused too, but hovering is the useful way round: clicking a range input jumps
its value to wherever the click landed, which is no way to nudge anything.

Keyboard, away from the slider: `Space` play/pause, `→` one step, `R` reset.

## Making an animation

`index.html?gif` opens an animation generator: pick the mode, `Δx`, the final
`x`, how long it should last and how big it should be, and it writes a looping
GIF for a slide. Two files under `tools/` that the app never loads otherwise,
so a normal visit carries none of it.

Every frame is produced by the application's own `draw()`, pointed for the
length of one frame at an off-screen canvas of the requested size. There is no
second renderer, so the GIF cannot drift away from what the plot looks like:
same fit, same hierarchy of trail, increment and vector, same theme.

Two things are worth knowing. **Framing** is either fixed — the trajectory is
run to its end first, the view computed from there, and the animation drawn
inside a frame that then holds still — or free to follow the simulation as the
app does live. **Frame count** is capped at one step per frame: asking for 20 a
second of a fifty-step trajectory would only repeat frames, so it drops to one
step each and holds them longer, lasting exactly as long as asked.

`tools/gif-encoder.js` writes the GIF: the palette holds the drawing's real
colours rather than an approximation of them, and every frame after the first
is stored as its difference with the one before, clipped to the rectangle that
changed. A seven-second complex spiral at 660×620 comes to about 55 KB.

Downloading is a browser save, so use the generator from the files on disk or
from the published site — not from a sandboxed preview, where a page cannot
hand the viewer a file.

Also available: light/dark theme, three interface languages (EN / FR / ES) and
a **Help** panel (`?`) that walks the whole derivation in six steps, in every
language: the question, the exact multiplicative answer, the truncation and the
size of what it drops, the discrete step, the same reasoning with an `i`, and
why the result is a spiral of modulus `|z(n)| ≈ exp(x·Δx/2)` that closes onto
the circle as `Δx → 0` — a prediction the read-out lets you check.

## Running it

No build step and no backend. Open `index.html` in a browser, or serve the
folder statically (GitHub Pages works as-is).

The only third-party component is KaTeX, which typesets the mathematics. It is
vendored under `vendor/katex/`, not loaded from a CDN, so the page also works
with no network at all. See `THIRD_PARTY_LICENSES.md`.

## Files

```
index.html     structure
style.css      theming and layout
script.js      i18n · mathematical core · simulation state · canvas rendering · UI
vendor/katex/  KaTeX 0.18.1 (MIT), script + stylesheet + WOFF2 fonts
```

`script.js` is organised in those five sections; the mathematical parts are
commented in detail.

## Licence

MIT
