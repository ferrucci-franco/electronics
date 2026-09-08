# Complex Exponential Explorer

An interactive, classroom-oriented visualisation of the link between the **real
exponential** and the **complex exponential**, built to prepare students
visually for Euler's formula.

**Live version:** https://ferrucci-franco.github.io/complex-exponential-explorer/

## The idea

Everything in the application follows from a single approximation, applied twice.

**Real mode** — `exp(Δx) ≈ 1 + Δx`, hence

```
x(n+1) = x(n) + Δx
y(n+1) = y(n) · (1 + Δx)          starting from  (x₀, y₀) = (0, 1)
```

Moving forward by a small `Δx` along the x-axis is the same as multiplying the
previous value by `(1 + Δx)`: `1, 1.1, 1.21, 1.331, …` for `Δx = 0.1`.

**Complex mode** — the *same* procedure, with `exp(iΔx) ≈ 1 + iΔx`:

```
z(n+1) = z(n) · (1 + i·Δx)        starting from  z₀ = 1 + 0i
```

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

Keyboard: `Space` play/pause, `→` one step, `R` reset.

Also available: light/dark theme and three interface languages (EN / FR / ES).

## Running it

No build step, no backend, no dependencies. Open `index.html` in a browser, or
serve the folder statically (GitHub Pages works as-is).

## Files

```
index.html   structure
style.css    theming and layout
script.js    i18n · mathematical core · simulation state · canvas rendering · UI
```

`script.js` is organised in those five sections; the mathematical parts are
commented in detail.

## Licence

MIT
