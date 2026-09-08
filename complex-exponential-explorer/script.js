/* ============================================================================
   Complex Exponential Explorer
   ----------------------------------------------------------------------------
   The whole application rests on ONE idea, applied twice:

        exp(Δx)   ≈ 1 + Δx        →   y(n+1) = y(n) · (1 + Δx)
        exp(iΔx)  ≈ 1 + i·Δx      →   z(n+1) = z(n) · (1 + i·Δx)

   Nothing else is used: no cos, no sin, no normalisation of the modulus.
   The spiral seen in complex mode is therefore a genuine property of the
   discrete approximation, not a drawing artefact.

   File organisation
     1. Internationalisation
     2. Mathematical core        (the recurrences — pure functions / no DOM)
     3. Simulation state
     4. Rendering                (canvas)
     5. Controls and interface
   ========================================================================== */

'use strict';

/* ============================================================================
   1. INTERNATIONALISATION
   ========================================================================== */

const I18N = {
    en: {
        appTitle: 'Complex Exponential Explorer',
        helpBtn: 'Help',
        helpTitle: 'The mathematics behind the picture',
        helpClose: 'Close',
        helpSections: [
            { h: 'The exponential is a series',
              items: [
                { p: 'The exponential is defined by a series that converges for every value of x:' },
                { tex: 'e^{x}=\\sum_{n=0}^{\\infty}\\frac{x^{n}}{n!}=1+x+\\frac{x^{2}}{2!}+\\frac{x^{3}}{3!}+\\frac{x^{4}}{4!}+\\cdots' },
                { p: 'Every term after the first two carries a factor x² or smaller. When x is small they weigh very little — and that is the whole opening.' }
              ] },
            { h: 'One small step: keep two terms',
              items: [
                { p: 'For a step Δx small enough, cut the series after the linear term:' },
                { tex: 'e^{\\Delta x}=\\underbrace{1+\\Delta x}_{\\text{kept}}+\\underbrace{\\frac{\\Delta x^{2}}{2}+\\frac{\\Delta x^{3}}{6}+\\cdots}_{\\text{dropped}}\\;\\approx\\;1+\\Delta x' },
                { p: 'What we drop is of order Δx²/2: about 0.005 for Δx = 0.1, and 0.00005 for Δx = 0.01. This is the only approximation in the whole application — everything you see on screen follows from it.' }
              ] },
            { h: 'From the approximation to a multiplication',
              items: [
                { p: 'The exponential turns a sum in the exponent into a product:' },
                { tex: 'e^{x+\\Delta x}=e^{x}\\,e^{\\Delta x}\\approx e^{x}\\,(1+\\Delta x)' },
                { p: 'So moving forward by Δx is the same as multiplying by (1 + Δx). Starting from y₀ = 1:' },
                { tex: 'y_{n+1}=y_{n}\\,(1+\\Delta x)\\qquad\\Longrightarrow\\qquad y_{n}=(1+\\Delta x)^{n}' },
                { p: 'With x = n·Δx this is y = (1 + x/n)ⁿ, the classical limit that returns eˣ as n grows. The gap you read on screen is that limit not yet reached.' }
              ] },
            { h: 'The same step, now with i',
              items: [
                { p: 'The series does not care whether its argument is real or imaginary, so the same truncation applies:' },
                { tex: 'e^{i\\Delta x}=1+i\\Delta x+\\frac{(i\\Delta x)^{2}}{2!}+\\cdots\\;\\approx\\;1+i\\Delta x' },
                { tex: 'z_{n+1}=z_{n}\\,(1+i\\Delta x)\\qquad\\Longrightarrow\\qquad z_{n}=(1+i\\Delta x)^{n}' },
                { p: 'Multiplying by 1 + iΔx rotates by arctan(Δx) ≈ Δx. That is where the rotation comes from: no cosine and no sine were ever used.' }
              ] },
            { h: 'Why a spiral, and why it closes',
              items: [
                { p: 'The factor does not sit on the unit circle:' },
                { tex: '\\left|1+i\\Delta x\\right|=\\sqrt{1+\\Delta x^{2}}>1' },
                { p: 'so the modulus grows a little at every step, which is exactly the spiral you see:' },
                { tex: '\\left|z_{n}\\right|=\\left(1+\\Delta x^{2}\\right)^{n/2}' },
                { p: 'Write n = x/Δx and use ln(1 + u) ≈ u for small u:' },
                { tex: '\\left|z_{n}\\right|\\approx e^{\\,x\\Delta x/2}\\;\\xrightarrow[\\;\\Delta x\\to 0\\;]{}\\;1' },
                { p: 'Check it against the read-out: one turn (x = 2π) at Δx = 0.1 predicts |z| ≈ e^0.314 ≈ 1.37. The angle behaves the same way — n·arctan(Δx) → x. Modulus going to 1, argument going to x: the point lands on the unit circle at angle x.' }
              ] }
        ],
        modeReal: 'Real exponential',
        modeComplex: 'Complex exponential',
        themeToggle: 'Toggle theme',
        values: 'Values',
        step1: '+1 step',
        step5: '+5 steps',
        turn: 'Complete one turn',
        play: 'Play',
        pause: 'Pause',
        reset: 'Reset',
        conclusion: 'Conclusion',
        conclusionText: 'When Δx → 0 the spurious radial growth |1 + iΔx| = √(1 + Δx²) tends to 1, ' +
                        'so the trajectory becomes a pure rotation of constant modulus along the unit circle. ' +
                        'Each step turns the point by Δx, so after n steps the accumulated angle is exactly x = n·Δx. ' +
                        'The point therefore sits at (cos x, sin x).',
        hintReal: 'Each small step forward in x multiplies the previous value by (1 + Δx).',
        hintComplex: 'Each small step multiplies by (1 + iΔx): the point turns — and its modulus grows a little, because |1 + iΔx| > 1.',
        labelExact: 'exact',
        labelError: 'error',
        labelRelError: 'rel. error',
        labelTurns: 'turns',
        warnMaxSteps: 'Maximum number of steps reached.',
        warnOverflow: 'The value has grown beyond what can be represented.'
    },
    fr: {
        appTitle: 'Explorateur de l’exponentielle complexe',
        helpBtn: 'Aide',
        helpTitle: 'Les mathématiques derrière l’image',
        helpClose: 'Fermer',
        helpSections: [
            { h: 'L’exponentielle est une série',
              items: [
                { p: 'L’exponentielle est définie par une série qui converge pour toute valeur de x :' },
                { tex: 'e^{x}=\\sum_{n=0}^{\\infty}\\frac{x^{n}}{n!}=1+x+\\frac{x^{2}}{2!}+\\frac{x^{3}}{3!}+\\frac{x^{4}}{4!}+\\cdots' },
                { p: 'Chaque terme après les deux premiers porte un facteur x² ou plus petit. Quand x est petit, ils pèsent très peu — et c’est toute l’ouverture.' }
              ] },
            { h: 'Un petit pas : garder deux termes',
              items: [
                { p: 'Pour un pas Δx assez petit, on coupe la série après le terme linéaire :' },
                { tex: 'e^{\\Delta x}=\\underbrace{1+\\Delta x}_{\\text{gardé}}+\\underbrace{\\frac{\\Delta x^{2}}{2}+\\frac{\\Delta x^{3}}{6}+\\cdots}_{\\text{abandonné}}\\;\\approx\\;1+\\Delta x' },
                { p: 'Ce que l’on abandonne est d’ordre Δx²/2 : environ 0,005 pour Δx = 0,1, et 0,00005 pour Δx = 0,01. C’est la seule approximation de toute l’application — tout ce qui est à l’écran en découle.' }
              ] },
            { h: 'De l’approximation à une multiplication',
              items: [
                { p: 'L’exponentielle transforme une somme en exposant en un produit :' },
                { tex: 'e^{x+\\Delta x}=e^{x}\\,e^{\\Delta x}\\approx e^{x}\\,(1+\\Delta x)' },
                { p: 'Avancer de Δx revient donc à multiplier par (1 + Δx). En partant de y₀ = 1 :' },
                { tex: 'y_{n+1}=y_{n}\\,(1+\\Delta x)\\qquad\\Longrightarrow\\qquad y_{n}=(1+\\Delta x)^{n}' },
                { p: 'Avec x = n·Δx, cela s’écrit y = (1 + x/n)ⁿ, la limite classique qui redonne eˣ quand n grandit. L’écart lu à l’écran, c’est cette limite pas encore atteinte.' }
              ] },
            { h: 'Le même pas, cette fois avec i',
              items: [
                { p: 'La série ne se soucie pas de savoir si son argument est réel ou imaginaire ; la même troncature s’applique :' },
                { tex: 'e^{i\\Delta x}=1+i\\Delta x+\\frac{(i\\Delta x)^{2}}{2!}+\\cdots\\;\\approx\\;1+i\\Delta x' },
                { tex: 'z_{n+1}=z_{n}\\,(1+i\\Delta x)\\qquad\\Longrightarrow\\qquad z_{n}=(1+i\\Delta x)^{n}' },
                { p: 'Multiplier par 1 + iΔx fait tourner de arctan(Δx) ≈ Δx. Voilà d’où vient la rotation : ni cosinus ni sinus n’ont été utilisés.' }
              ] },
            { h: 'Pourquoi une spirale, et pourquoi elle se referme',
              items: [
                { p: 'Le facteur n’est pas sur le cercle unité :' },
                { tex: '\\left|1+i\\Delta x\\right|=\\sqrt{1+\\Delta x^{2}}>1' },
                { p: 'le module croît donc un peu à chaque pas, ce qui est exactement la spirale observée :' },
                { tex: '\\left|z_{n}\\right|=\\left(1+\\Delta x^{2}\\right)^{n/2}' },
                { p: 'En écrivant n = x/Δx et en utilisant ln(1 + u) ≈ u pour u petit :' },
                { tex: '\\left|z_{n}\\right|\\approx e^{\\,x\\Delta x/2}\\;\\xrightarrow[\\;\\Delta x\\to 0\\;]{}\\;1' },
                { p: 'À vérifier sur le panneau : un tour (x = 2π) à Δx = 0,1 prédit |z| ≈ e^0,314 ≈ 1,37. L’angle suit la même logique — n·arctan(Δx) → x. Module vers 1, argument vers x : le point se pose sur le cercle unité à l’angle x.' }
              ] }
        ],
        modeReal: 'Exponentielle réelle',
        modeComplex: 'Exponentielle complexe',
        themeToggle: 'Changer de thème',
        values: 'Valeurs',
        step1: '+1 pas',
        step5: '+5 pas',
        turn: 'Compléter un tour',
        play: 'Lecture',
        pause: 'Pause',
        reset: 'Réinitialiser',
        conclusion: 'Conclusion',
        conclusionText: 'Lorsque Δx → 0, la croissance radiale parasite |1 + iΔx| = √(1 + Δx²) tend vers 1 : ' +
                        'la trajectoire devient une rotation pure, de module constant, sur le cercle unité. ' +
                        'Chaque pas fait tourner le point de Δx ; après n pas l’angle accumulé vaut exactement x = n·Δx. ' +
                        'Le point se trouve donc en (cos x, sin x).',
        hintReal: 'Chaque petit pas en x revient à multiplier la valeur précédente par (1 + Δx).',
        hintComplex: 'Chaque petit pas multiplie par (1 + iΔx) : le point tourne — et son module croît légèrement, car |1 + iΔx| > 1.',
        labelExact: 'exact',
        labelError: 'erreur',
        labelRelError: 'erreur rel.',
        labelTurns: 'tours',
        warnMaxSteps: 'Nombre maximal de pas atteint.',
        warnOverflow: 'La valeur est devenue trop grande pour être représentée.'
    },
    es: {
        appTitle: 'Explorador de la exponencial compleja',
        helpBtn: 'Ayuda',
        helpTitle: 'La matemática detrás de la imagen',
        helpClose: 'Cerrar',
        helpSections: [
            { h: 'La exponencial es una serie',
              items: [
                { p: 'La exponencial está definida por una serie que converge para todo valor de x:' },
                { tex: 'e^{x}=\\sum_{n=0}^{\\infty}\\frac{x^{n}}{n!}=1+x+\\frac{x^{2}}{2!}+\\frac{x^{3}}{3!}+\\frac{x^{4}}{4!}+\\cdots' },
                { p: 'Cada término después de los dos primeros lleva un factor x² o menor. Cuando x es pequeño pesan muy poco — y ahí está toda la puerta de entrada.' }
              ] },
            { h: 'Un paso pequeño: quedarse con dos términos',
              items: [
                { p: 'Para un paso Δx suficientemente pequeño, cortamos la serie después del término lineal:' },
                { tex: 'e^{\\Delta x}=\\underbrace{1+\\Delta x}_{\\text{conservado}}+\\underbrace{\\frac{\\Delta x^{2}}{2}+\\frac{\\Delta x^{3}}{6}+\\cdots}_{\\text{descartado}}\\;\\approx\\;1+\\Delta x' },
                { p: 'Lo que descartamos es del orden de Δx²/2: unos 0,005 para Δx = 0,1, y 0,00005 para Δx = 0,01. Esta es la única aproximación de toda la aplicación — todo lo que ves en pantalla se sigue de ella.' }
              ] },
            { h: 'De la aproximación a una multiplicación',
              items: [
                { p: 'La exponencial convierte una suma en el exponente en un producto:' },
                { tex: 'e^{x+\\Delta x}=e^{x}\\,e^{\\Delta x}\\approx e^{x}\\,(1+\\Delta x)' },
                { p: 'Avanzar Δx equivale entonces a multiplicar por (1 + Δx). Partiendo de y₀ = 1:' },
                { tex: 'y_{n+1}=y_{n}\\,(1+\\Delta x)\\qquad\\Longrightarrow\\qquad y_{n}=(1+\\Delta x)^{n}' },
                { p: 'Con x = n·Δx esto se lee y = (1 + x/n)ⁿ, el límite clásico que devuelve eˣ cuando n crece. La diferencia que ves en pantalla es ese límite todavía no alcanzado.' }
              ] },
            { h: 'El mismo paso, ahora con i',
              items: [
                { p: 'A la serie no le importa si su argumento es real o imaginario; se aplica el mismo truncamiento:' },
                { tex: 'e^{i\\Delta x}=1+i\\Delta x+\\frac{(i\\Delta x)^{2}}{2!}+\\cdots\\;\\approx\\;1+i\\Delta x' },
                { tex: 'z_{n+1}=z_{n}\\,(1+i\\Delta x)\\qquad\\Longrightarrow\\qquad z_{n}=(1+i\\Delta x)^{n}' },
                { p: 'Multiplicar por 1 + iΔx gira un ángulo arctan(Δx) ≈ Δx. De ahí viene la rotación: no se usó ningún coseno ni ningún seno.' }
              ] },
            { h: 'Por qué una espiral, y por qué se cierra',
              items: [
                { p: 'El factor no está sobre el círculo unidad:' },
                { tex: '\\left|1+i\\Delta x\\right|=\\sqrt{1+\\Delta x^{2}}>1' },
                { p: 'así que el módulo crece un poco en cada paso, que es exactamente la espiral que se ve:' },
                { tex: '\\left|z_{n}\\right|=\\left(1+\\Delta x^{2}\\right)^{n/2}' },
                { p: 'Escribiendo n = x/Δx y usando ln(1 + u) ≈ u para u pequeño:' },
                { tex: '\\left|z_{n}\\right|\\approx e^{\\,x\\Delta x/2}\\;\\xrightarrow[\\;\\Delta x\\to 0\\;]{}\\;1' },
                { p: 'Comprobalo contra el panel: una vuelta (x = 2π) con Δx = 0,1 predice |z| ≈ e^0,314 ≈ 1,37. El ángulo se comporta igual — n·arctan(Δx) → x. Módulo tendiendo a 1, argumento tendiendo a x: el punto cae sobre el círculo unidad en el ángulo x.' }
              ] }
        ],
        modeReal: 'Exponencial real',
        modeComplex: 'Exponencial compleja',
        themeToggle: 'Cambiar tema',
        values: 'Valores',
        step1: '+1 paso',
        step5: '+5 pasos',
        turn: 'Completar una vuelta',
        play: 'Reproducir',
        pause: 'Pausa',
        reset: 'Reiniciar',
        conclusion: 'Conclusión',
        conclusionText: 'Cuando Δx → 0, el crecimiento radial espurio |1 + iΔx| = √(1 + Δx²) tiende a 1: ' +
                        'la trayectoria se convierte en una rotación pura, de módulo constante, sobre el círculo unidad. ' +
                        'Cada paso gira el punto un ángulo Δx, de modo que tras n pasos el ángulo acumulado es exactamente x = n·Δx. ' +
                        'El punto está, por tanto, en (cos x, sin x).',
        hintReal: 'Cada pequeño paso en x equivale a multiplicar el valor anterior por (1 + Δx).',
        hintComplex: 'Cada pequeño paso multiplica por (1 + iΔx): el punto gira — y su módulo crece un poco, porque |1 + iΔx| > 1.',
        labelExact: 'exacto',
        labelError: 'error',
        labelRelError: 'error rel.',
        labelTurns: 'vueltas',
        warnMaxSteps: 'Se alcanzó el número máximo de pasos.',
        warnOverflow: 'El valor ha crecido más allá de lo representable.'
    }
};

const i18n = {
    lang: 'en',
    t(key) {
        const dict = I18N[this.lang] || I18N.en;
        return dict[key] !== undefined ? dict[key] : (I18N.en[key] || key);
    },
    apply() {
        document.documentElement.lang = this.lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = this.t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = this.t(el.getAttribute('data-i18n-title'));
        });
        document.title = this.t('appTitle');
    }
};

/* ---------------------------------------------------------------------------
   TeX rendering. KaTeX is vendored under vendor/katex (same version and same
   arrangement as the other apps), so the page stays offline-capable and has no
   external dependency. Both helpers degrade to the raw source if it is absent.
   --------------------------------------------------------------------------- */

function texInto(el, src, display) {
    if (!el) return;
    if (window.katex) katex.render(src, el, { throwOnError: false, displayMode: !!display });
    else el.textContent = src;
}

function texHTML(src, display) {
    if (window.katex) return katex.renderToString(src, { throwOnError: false, displayMode: !!display });
    return src;
}

/* ============================================================================
   2. MATHEMATICAL CORE
   ----------------------------------------------------------------------------
   Pure functions. They know nothing about the DOM or the canvas.
   ========================================================================== */

const TAU = 2 * Math.PI;

/** Number of discrete points we are willing to keep (performance guard). */
const MAX_STEPS = 200000;

/**
 * REAL CASE.
 *   x(n+1) = x(n) + Δx
 *   y(n+1) = y(n) · (1 + Δx)      because   exp(Δx) ≈ 1 + Δx
 * Starting from (x0, y0) = (0, 1) this produces 1, 1+Δx, (1+Δx)², …
 * The exact value exp(x) is always slightly LARGER, since (1+Δx) < exp(Δx).
 */
function realStep(x, y, dx) {
    return { x: x + dx, y: y * (1 + dx) };
}

/**
 * COMPLEX CASE.
 *   z(n+1) = z(n) · (1 + i·Δx)    because   exp(iΔx) ≈ 1 + i·Δx
 * Written out with (re, im):
 *   (re + i·im)(1 + i·Δx) = (re − im·Δx) + i·(im + re·Δx)
 * The modulus is multiplied by |1 + iΔx| = √(1 + Δx²) > 1 at every step,
 * which is precisely why the trajectory is a slowly opening spiral and not
 * a circle. Nothing is normalised here — that growth must remain visible.
 */
function complexStep(re, im, dx) {
    return { re: re - im * dx, im: im + re * dx };
}

/** Number of steps whose accumulated argument is closest to one full turn. */
function stepsPerTurn(dx) {
    return Math.max(1, Math.round(TAU / dx));
}

/* ============================================================================
   3. SIMULATION STATE
   ----------------------------------------------------------------------------
   One independent trajectory per mode; both share the same Δx, so that the
   student can switch back and forth and compare the *same* procedure.
   ========================================================================== */

/**
 * A trajectory is stored as two parallel arrays:
 *   real mode    : A = x,      B = y
 *   complex mode : A = Re(z),  B = Im(z)
 * Keeping the same shape lets the renderer share most of its code, which
 * mirrors the pedagogical point: it really is the same construction.
 */
function makeSim(mode) {
    const sim = { mode: mode, A: [], B: [], n: 0, overflow: false, limit: false, view: null };
    resetSim(sim);
    return sim;
}

function resetSim(sim) {
    sim.n = 0;
    sim.overflow = false;
    sim.limit = false;
    if (sim.mode === 'real') {
        sim.A = [0];   // x0 = 0
        sim.B = [1];   // y0 = 1
        sim.view = { xMax: 2.4 };
    } else {
        sim.A = [1];   // z0 = 1 + 0i
        sim.B = [0];
        sim.view = { R: 1.25 };
    }
    sim.maxMod = 1;
}

/** Advance the trajectory by `count` discrete steps. Returns steps actually done. */
function advance(sim, count, dx) {
    let done = 0;
    for (let k = 0; k < count; k++) {
        if (sim.n >= MAX_STEPS) { sim.limit = true; break; }
        const last = sim.n;
        if (sim.mode === 'real') {
            const p = realStep(sim.A[last], sim.B[last], dx);
            if (!isFinite(p.y)) { sim.overflow = true; break; }
            sim.A.push(p.x);
            sim.B.push(p.y);
        } else {
            const p = complexStep(sim.A[last], sim.B[last], dx);
            if (!isFinite(p.re) || !isFinite(p.im)) { sim.overflow = true; break; }
            sim.A.push(p.re);
            sim.B.push(p.im);
            const m = Math.hypot(p.re, p.im);
            if (m > sim.maxMod) sim.maxMod = m;
        }
        sim.n++;
        done++;
    }
    return done;
}

/**
 * Rebuild a trajectory with a new Δx but the SAME total argument x.
 * This is what makes the slider pedagogically powerful: three turns drawn
 * with Δx = 0.1 become the same three turns drawn with Δx = 0.01, visibly
 * closer to the unit circle.
 */
function rebuildAtSameX(sim, totalX, dx) {
    resetSim(sim);
    const target = Math.min(MAX_STEPS, Math.round(totalX / dx));
    advance(sim, target, dx);
}

/* Global state -------------------------------------------------------------- */

const state = {
    mode: 'real',
    dx: 0.1,
    playing: false,
    sims: { real: makeSim('real'), complex: makeSim('complex') }
};

function currentSim() { return state.sims[state.mode]; }

/** Total accumulated argument / abscissa of a trajectory. */
function totalX(sim, dx) { return sim.n * dx; }

/* ============================================================================
   4. RENDERING
   ========================================================================== */

const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');

/* Cached trail layer: the historical polyline plus its vertices are expensive
   to redraw when there are tens of thousands of points, so they are painted
   once onto an off-screen canvas and only appended to as new points appear. */
const trail = {
    cv: document.createElement('canvas'),
    ctx: null,
    drawn: 0,        // how many POINTS of the current sim are already painted
    key: ''          // identifies mode+view+size+theme; a change forces a repaint
};
trail.ctx = trail.cv.getContext('2d');

let cssW = 0, cssH = 0, dpr = 1;

function palette() {
    const cs = getComputedStyle(document.body);
    const v = name => cs.getPropertyValue(name).trim();
    return {
        bg:        v('--canvas-bg'),
        grid:      v('--grid-color'),
        axis:      v('--axis-color'),
        reference: v('--reference'),
        text:      v('--text-faint'),
        accent:    v('--accent'),
        point:     v('--accent-strong'),
        last:      v('--accent-last'),
        radius:    v('--accent-radius')
    };
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, Math.round(rect.width));
    cssH = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trail.cv.width = canvas.width;
    trail.cv.height = canvas.height;
    trail.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trail.key = '';                       // force a full repaint
    draw();
}

/* ---------- View management ------------------------------------------------
   The view only ever GROWS while stepping, and by a generous factor, so that
   rescaling (which invalidates the cached trail) happens rarely.            */

function updateView(sim) {
    if (sim.mode === 'real') {
        const x = sim.A[sim.n];
        // exp() overflows above ~709; clamping keeps the mapping finite.
        if (x > sim.view.xMax * 0.88) sim.view.xMax = Math.min(500, Math.max(2.4, x * 1.3));
    } else {
        if (sim.maxMod > sim.view.R * 0.88) sim.view.R = Math.max(1.25, sim.maxMod * 1.32);
    }
}

/** Build the pixel mapping for the current sim. */
function makeTransform(sim) {
    const pad = sim.mode === 'real'
        ? { l: 60, r: 20, t: 20, b: 34 }
        : { l: 34, r: 20, t: 20, b: 30 };
    const w = Math.max(10, cssW - pad.l - pad.r);
    const h = Math.max(10, cssH - pad.t - pad.b);

    if (sim.mode === 'real') {
        const xMax = sim.view.xMax;
        const xMin = -0.06 * xMax;
        let yMax = Math.exp(xMax) * 1.04;
        if (!isFinite(yMax) || yMax <= 0) yMax = 1e300;
        const yMin = -0.06 * yMax;
        const sx = w / (xMax - xMin);
        const sy = h / (yMax - yMin);
        return {
            pad: pad, w: w, h: h, xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax,
            px: a => pad.l + (a - xMin) * sx,
            py: b => pad.t + h - (b - yMin) * sy
        };
    }
    /* Complex plane: identical horizontal and vertical scale, always, so that
       a circle is drawn as a circle. */
    const R = sim.view.R;
    const s = Math.min(w, h) / (2 * R);
    const cx = pad.l + w / 2;
    const cy = pad.t + h / 2;
    return {
        pad: pad, w: w, h: h, R: R, s: s, cx: cx, cy: cy,
        xMin: (pad.l - cx) / s, xMax: (pad.l + w - cx) / s,
        yMin: (cy - pad.t - h) / s, yMax: (cy - pad.t) / s,
        px: a => cx + a * s,
        py: b => cy - b * s
    };
}

/* ---------- Small numeric helpers ---------- */

function niceStep(span, target) {
    const raw = span / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const m = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return m * mag;
}

function fmtTick(v, step) {
    if (v === 0) return '0';
    if (Math.abs(v) >= 1e5 || Math.abs(v) < 1e-4) return v.toExponential(1).replace('e+', 'e');
    const d = Math.max(0, Math.min(6, -Math.floor(Math.log10(step))));
    return v.toFixed(d);
}

function fmtNum(v, d) {
    if (!isFinite(v)) return '∞';
    const s = (v !== 0 && (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-6))
        ? v.toExponential(3)
        : v.toFixed(d === undefined ? 4 : d);
    return s.replace('-', '\u2212');       // typographic minus, uniform read-out
}

function fmtComplex(re, im) {
    const sign = im < 0 ? '−' : '+';
    return fmtNum(re) + ' ' + sign + ' ' + fmtNum(Math.abs(im)) + ' i';
}

/* ---------- Grid, axes, reference ---------- */

function drawGridAndAxes(T, sim, col) {
    ctx.save();
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = col.text;

    const xStep = niceStep(T.xMax - T.xMin, Math.max(3, Math.round(T.w / 90)));
    const yStep = niceStep(T.yMax - T.yMin, Math.max(3, Math.round(T.h / 70)));

    /* grid */
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(T.xMin / xStep) * xStep; x <= T.xMax; x += xStep) {
        const p = Math.round(T.px(x)) + 0.5;
        ctx.moveTo(p, T.pad.t); ctx.lineTo(p, T.pad.t + T.h);
    }
    for (let y = Math.ceil(T.yMin / yStep) * yStep; y <= T.yMax; y += yStep) {
        const p = Math.round(T.py(y)) + 0.5;
        ctx.moveTo(T.pad.l, p); ctx.lineTo(T.pad.l + T.w, p);
    }
    ctx.stroke();

    /* the two axes */
    const x0 = Math.round(T.px(0)) + 0.5;
    const y0 = Math.round(T.py(0)) + 0.5;
    ctx.strokeStyle = col.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(T.pad.l, y0); ctx.lineTo(T.pad.l + T.w, y0);
    ctx.moveTo(x0, T.pad.t);  ctx.lineTo(x0, T.pad.t + T.h);
    ctx.stroke();

    /* tick labels */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = Math.ceil(T.xMin / xStep) * xStep; x <= T.xMax; x += xStep) {
        if (Math.abs(x) < xStep * 1e-6) continue;
        ctx.fillText(fmtTick(x, xStep), T.px(x), Math.min(y0 + 5, T.pad.t + T.h + 5));
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = Math.ceil(T.yMin / yStep) * yStep; y <= T.yMax; y += yStep) {
        if (Math.abs(y) < yStep * 1e-6) continue;
        ctx.fillText(fmtTick(y, yStep), Math.max(x0 - 6, T.pad.l - 6), T.py(y));
    }

    /* axis names */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = col.text;
    ctx.font = 'italic 12px ' + getComputedStyle(document.body).fontFamily;
    if (sim.mode === 'real') {
        ctx.fillText('x', T.pad.l + T.w, y0 - 6);
        ctx.textAlign = 'left';
        ctx.fillText('y', x0 + 6, T.pad.t + 12);
    } else {
        ctx.fillText('Re', T.pad.l + T.w, y0 - 6);
        ctx.textAlign = 'left';
        ctx.fillText('Im', x0 + 6, T.pad.t + 12);
    }
    ctx.restore();
}

/** The exact object, drawn thin and discreet: it is only a reference. */
function drawReference(T, sim, col) {
    ctx.save();
    ctx.strokeStyle = col.reference;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    if (sim.mode === 'real') {
        // y = exp(x), sampled one point per pixel column
        for (let p = 0; p <= T.w; p++) {
            const x = T.xMin + (p / T.w) * (T.xMax - T.xMin);
            const ex = Math.exp(x);
            if (!isFinite(ex)) break;
            const py = T.py(ex);
            if (p === 0) ctx.moveTo(T.pad.l + p, py); else ctx.lineTo(T.pad.l + p, py);
        }
    } else {
        // the unit circle |z| = 1
        ctx.arc(T.cx, T.cy, T.s, 0, TAU);
    }
    ctx.stroke();
    ctx.restore();
}

/* ---------- Trail (cached) ---------- */

function trailKey(sim, T) {
    return [sim.mode, cssW, cssH, document.body.className,
            sim.mode === 'real' ? sim.view.xMax : sim.view.R].join('|');
}

function paintTrail(sim, T, col, from) {
    const c = trail.ctx;
    const N = sim.n + 1;                 // number of points
    if (N < 2 && from === 0) return;

    /* segments */
    c.save();
    c.strokeStyle = col.accent;
    c.lineWidth = 1.4;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.globalAlpha = 0.95;
    c.beginPath();
    const start = Math.max(0, from - 1);
    for (let i = start; i < N; i++) {
        const px = T.px(sim.A[i]), py = T.py(sim.B[i]);
        if (i === start) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();

    /* vertices — every single one is kept, whatever Δx is.
       With a small Δx they simply end up on top of each other and merge
       visually into the line, which is exactly what we want to show. */
    c.fillStyle = col.point;
    c.globalAlpha = 1;
    const r = 1.35;
    const count = N - from;
    if (count <= 5000) {
        for (let i = from; i < N; i++) {
            c.beginPath();
            c.arc(T.px(sim.A[i]), T.py(sim.B[i]), r, 0, TAU);
            c.fill();
        }
    } else {
        // fast path for very dense trajectories: a 2.7 px square is
        // indistinguishable from a 2.7 px disc at this size
        const d = 2 * r;
        for (let i = from; i < N; i++) {
            c.fillRect(T.px(sim.A[i]) - r, T.py(sim.B[i]) - r, d, d);
        }
    }
    c.restore();
}

function drawTrail(sim, T, col) {
    const key = trailKey(sim, T);
    if (key !== trail.key || trail.drawn > sim.n + 1) {
        trail.ctx.clearRect(0, 0, cssW, cssH);
        trail.key = key;
        trail.drawn = 0;
        paintTrail(sim, T, col, 0);
        trail.drawn = sim.n + 1;
    } else if (sim.n + 1 > trail.drawn) {
        paintTrail(sim, T, col, trail.drawn);
        trail.drawn = sim.n + 1;
    }
    ctx.drawImage(trail.cv, 0, 0, trail.cv.width, trail.cv.height, 0, 0, cssW, cssH);
}

/* ---------- Overlays : the three vectors of the visual hierarchy ---------- */

/**
 * Reference vector towards the current value.
 *   complex : 0 → z(n)
 *   real    : (x, 0) → (x, y)   — the same idea: "how big is the value now"
 * Soft orange, thin: a geometric reference, never the main character.
 */
function drawValueVector(sim, T, col) {
    const n = sim.n;
    ctx.save();
    ctx.strokeStyle = col.radius;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    if (sim.mode === 'real') {
        ctx.moveTo(T.px(sim.A[n]), T.py(0));
    } else {
        ctx.moveTo(T.px(0), T.py(0));
    }
    ctx.lineTo(T.px(sim.A[n]), T.py(sim.B[n]));
    ctx.stroke();
    ctx.restore();
}

/** The step that has just been taken: slightly stronger, with a small arrow. */
function drawLastIncrement(sim, T, col) {
    if (sim.n < 1) return;
    const n = sim.n;
    const x1 = T.px(sim.A[n - 1]), y1 = T.py(sim.B[n - 1]);
    const x2 = T.px(sim.A[n]),     y2 = T.py(sim.B[n]);
    const dxp = x2 - x1, dyp = y2 - y1;
    const len = Math.hypot(dxp, dyp);

    ctx.save();
    ctx.strokeStyle = col.last;
    ctx.fillStyle = col.last;
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (len > 7) {                       // arrow head only when it is legible
        const a = Math.atan2(dyp, dxp);
        const L = Math.min(9, len * 0.55);
        const s = 0.42;                  // half aperture, radians
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - L * Math.cos(a - s), y2 - L * Math.sin(a - s));
        ctx.lineTo(x2 - L * Math.cos(a + s), y2 - L * Math.sin(a + s));
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

/** Current point: a little more visible than the others, but no big marker. */
function drawCurrentPoint(sim, T, col) {
    const n = sim.n;
    const px = T.px(sim.A[n]), py = T.py(sim.B[n]);
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 3.4, 0, TAU);
    ctx.fillStyle = col.point;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = col.bg;
    ctx.stroke();
    ctx.restore();
}

/* ---------- Main draw ---------- */

function draw() {
    const sim = currentSim();
    const col = palette();
    updateView(sim);
    const T = makeTransform(sim);

    ctx.save();
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();

    drawGridAndAxes(T, sim, col);
    drawReference(T, sim, col);
    drawTrail(sim, T, col);
    drawValueVector(sim, T, col);
    drawLastIncrement(sim, T, col);
    drawCurrentPoint(sim, T, col);
}

/* ============================================================================
   5. CONTROLS AND INTERFACE
   ========================================================================== */

const els = {
    modeReal:      document.getElementById('mode-real'),
    modeComplex:   document.getElementById('mode-complex'),
    slider:        document.getElementById('dx-slider'),
    dxValue:       document.getElementById('dx-value'),
    btnStep1:      document.getElementById('btn-step1'),
    btnStep5:      document.getElementById('btn-step5'),
    btnTurn:       document.getElementById('btn-turn'),
    btnPlay:       document.getElementById('btn-play'),
    playLabel:     document.getElementById('play-label'),
    btnReset:      document.getElementById('btn-reset'),
    readout:       document.getElementById('readout'),
    series:        document.getElementById('formula-series'),
    recurrence:    document.getElementById('formula-recurrence'),
    approx:        document.getElementById('formula-approx'),
    brandMark:     document.getElementById('brand-mark'),
    modeFormulaR:  document.getElementById('mode-formula-real'),
    modeFormulaC:  document.getElementById('mode-formula-complex'),
    euler:         document.getElementById('euler-formula'),
    helpBtn:       document.getElementById('help-btn'),
    helpModal:     document.getElementById('help-modal'),
    helpBody:      document.getElementById('help-body'),
    helpClose:     document.getElementById('help-close'),
    hint:          document.getElementById('stage-hint'),
    warning:       document.getElementById('stage-warning'),
    conclusionCard:document.getElementById('conclusion-card'),
    conclusionBtn: document.getElementById('conclusion-btn'),
    conclusionBody:document.getElementById('conclusion-body'),
    themeToggle:   document.getElementById('theme-toggle')
};

/* ---------- Δx slider : logarithmic, 0.001 … 0.5 ---------- */

const DX_MIN = 0.001, DX_MAX = 0.5;
const LOG_MIN = Math.log10(DX_MIN), LOG_MAX = Math.log10(DX_MAX);

/** Slider position (0…1000) → Δx, rounded to two significant digits. */
function sliderToDx(v) {
    const t = v / 1000;
    const raw = Math.pow(10, LOG_MIN + t * (LOG_MAX - LOG_MIN));
    const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
    return Math.min(DX_MAX, Math.max(DX_MIN, Math.round(raw / mag) * mag));
}

function dxToSlider(dx) {
    const t = (Math.log10(dx) - LOG_MIN) / (LOG_MAX - LOG_MIN);
    return Math.round(t * 1000);
}

function formatDx(dx) {
    return dx >= 0.1 ? dx.toFixed(2) : dx >= 0.01 ? dx.toFixed(3) : dx.toFixed(4);
}

/* ---------- Read-out table ---------- */

/* Row definitions per mode: [id, html label, key of translated suffix]. */
function readoutRows() {
    if (state.mode === 'real') {
        return [
            ['dx',    texHTML('\\Delta x')],
            ['n',     texHTML('n')],
            ['x',     texHTML('x')],
            ['sep1',  null],
            ['y',     texHTML('y_{n}')],
            ['exact', texHTML('e^{x}')],
            ['sep2',  null],
            ['err',   i18n.t('labelError')],
            ['rel',   i18n.t('labelRelError')]
        ];
    }
    return [
        ['dx',    texHTML('\\Delta x')],
        ['n',     texHTML('n')],
        ['x',     texHTML('x = n\\,\\Delta x')],
        ['sep1',  null],
        ['z',     texHTML('z_{n}')],
        ['re',    texHTML('\\mathrm{Re}(z_{n})')],
        ['im',    texHTML('\\mathrm{Im}(z_{n})')],
        ['mod',   texHTML('\\left|z_{n}\\right|')],
        ['sep2',  null],
        ['turns', i18n.t('labelTurns') + ' ' + texHTML('= x/2\\pi')]
    ];
}

function buildReadout() {
    let html = '';
    readoutRows().forEach(row => {
        if (row[1] === null) { html += '<div class="row-sep"></div>'; return; }
        html += '<dt>' + row[1] + '</dt><dd id="ro-' + row[0] + '">–</dd>';
    });
    els.readout.innerHTML = html;
}

function setRO(id, text) {
    const el = document.getElementById('ro-' + id);
    if (el) el.textContent = text;
}

function updateReadout() {
    const sim = currentSim();
    const n = sim.n;
    setRO('dx', formatDx(state.dx));
    setRO('n', String(n));

    if (state.mode === 'real') {
        const x = sim.A[n], y = sim.B[n];
        const exact = Math.exp(x);
        setRO('x', fmtNum(x, 4));
        setRO('y', fmtNum(y, 6));
        setRO('exact', fmtNum(exact, 6));
        setRO('err', fmtNum(exact - y, 6));
        setRO('rel', exact === 0 ? '–' : ((exact - y) / exact * 100).toFixed(3) + ' %');
    } else {
        const re = sim.A[n], im = sim.B[n];
        const x = n * state.dx;                 // accumulated argument
        setRO('x', fmtNum(x, 4));
        setRO('z', fmtComplex(re, im));
        setRO('re', fmtNum(re, 6));
        setRO('im', fmtNum(im, 6));
        setRO('mod', fmtNum(Math.hypot(re, im), 6));
        setRO('turns', (x / TAU).toFixed(3));
    }

    /* warnings */
    if (sim.overflow)      showWarning(i18n.t('warnOverflow'));
    else if (sim.limit)    showWarning(i18n.t('warnMaxSteps'));
    else                   showWarning(null);
}

function showWarning(text) {
    if (!text) { els.warning.hidden = true; return; }
    els.warning.textContent = text;
    els.warning.hidden = false;
}

/* ---------- Mode-dependent chrome ---------- */

function applyMode() {
    const real = state.mode === 'real';

    els.modeReal.classList.toggle('active', real);
    els.modeComplex.classList.toggle('active', !real);
    els.modeReal.setAttribute('aria-selected', String(real));
    els.modeComplex.setAttribute('aria-selected', String(!real));

    /* The permanent derivation, read left to right and identical in shape
       between the two modes: the function first, then the approximation we
       make on it, then the recurrence that approximation licenses. */
    texInto(els.series, real
        ? 'e^{x}=1+x+\\frac{x^{2}}{2!}+\\cdots'
        : 'e^{ix}=1+ix+\\frac{(ix)^{2}}{2!}+\\cdots');
    texInto(els.approx, real
        ? 'e^{\\Delta x}\\approx 1+\\Delta x'
        : 'e^{i\\Delta x}\\approx 1+i\\Delta x');
    texInto(els.recurrence, real
        ? 'y_{n+1}=y_{n}\\,(1+\\Delta x)'
        : 'z_{n+1}=z_{n}\\,(1+i\\Delta x)');

    els.hint.textContent = i18n.t(real ? 'hintReal' : 'hintComplex');

    /* "One turn" is an angle: it means nothing on the real axis, where it only
       looked like an obscure way of asking for 2π more of x. */
    els.btnTurn.hidden = real;

    /* Euler is only offered once the complex construction has been explored. */
    els.conclusionCard.hidden = real;

    buildReadout();
    trail.key = '';                 // different trajectory ⇒ repaint the layer
    updateReadout();
    draw();
}

/* ---------- Actions ---------- */

function doSteps(count) {
    const sim = currentSim();
    advance(sim, count, state.dx);
    updateReadout();
    draw();
}

function doTurn() {
    doSteps(stepsPerTurn(state.dx));
}

function doReset() {
    setPlaying(false);
    resetSim(currentSim());
    trail.key = '';
    updateReadout();
    draw();
}

function setPlaying(on) {
    state.playing = on;
    els.playLabel.textContent = i18n.t(on ? 'pause' : 'play');
    if (on) { lastTick = performance.now(); requestAnimationFrame(tick); }
}

/* Play performs exactly the same discrete steps as "+1 step", one at a time,
   slowly enough for the construction to be watched. */
const STEP_INTERVAL = 1000 / 18;        // ms between two discrete steps
let lastTick = 0, accumulator = 0;

function tick(now) {
    if (!state.playing) return;
    accumulator += now - lastTick;
    lastTick = now;
    let steps = 0;
    while (accumulator >= STEP_INTERVAL && steps < 60) {
        accumulator -= STEP_INTERVAL;
        steps++;
    }
    if (steps > 0) {
        const sim = currentSim();
        const done = advance(sim, steps, state.dx);
        updateReadout();
        draw();
        if (done === 0) { setPlaying(false); return; }   // limit or overflow
    }
    requestAnimationFrame(tick);
}

/** Δx changed: rebuild both trajectories keeping the same accumulated x. */
function applyDx(newDx) {
    const prevDx = state.dx;
    const targets = {
        real: totalX(state.sims.real, prevDx),
        complex: totalX(state.sims.complex, prevDx)
    };
    state.dx = newDx;
    rebuildAtSameX(state.sims.real, targets.real, newDx);
    rebuildAtSameX(state.sims.complex, targets.complex, newDx);
    els.dxValue.textContent = formatDx(newDx);
    trail.key = '';
    updateReadout();
    draw();
}

/* ---------- Help : the mathematics, on demand ---------- */

function buildHelp() {
    const sections = i18n.t('helpSections');
    if (!Array.isArray(sections)) return;
    let html = '';
    sections.forEach((sec, i) => {
        html += '<section class="help-section">';
        html += '<h3><span class="help-num">' + (i + 1) + '</span>' + sec.h + '</h3>';
        sec.items.forEach(item => {
            if (item.p) html += '<p>' + item.p + '</p>';
            else if (item.tex) html += '<div class="help-tex">' + texHTML(item.tex, true) + '</div>';
        });
        html += '</section>';
    });
    els.helpBody.innerHTML = html;
}

function openHelp() {
    setPlaying(false);
    buildHelp();
    if (typeof els.helpModal.showModal === 'function') els.helpModal.showModal();
    else els.helpModal.setAttribute('open', '');
}

function closeHelp() {
    if (typeof els.helpModal.close === 'function') els.helpModal.close();
    else els.helpModal.removeAttribute('open');
}

/* ---------- Theme ---------- */

function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-' + theme);
    els.themeToggle.querySelector('.icon').textContent = theme === 'light' ? '🌙' : '☀️';
    try { localStorage.setItem('cee-theme', theme); } catch (e) { /* private mode */ }
    trail.key = '';                     // colours changed ⇒ repaint the layer
    draw();
}

function currentTheme() {
    return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
}

/* ---------- Language ---------- */

function setLanguage(lang) {
    if (!I18N[lang]) lang = 'en';
    i18n.lang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    try { localStorage.setItem('cee-lang', lang); } catch (e) { /* private mode */ }
    i18n.apply();
    els.playLabel.textContent = i18n.t(state.playing ? 'pause' : 'play');
    els.hint.textContent = i18n.t(state.mode === 'real' ? 'hintReal' : 'hintComplex');
    buildReadout();
    updateReadout();
    if (els.helpModal.open) buildHelp();
}

/* ---------- Wiring ---------- */

function switchMode(mode) {
    if (state.mode === mode) return;
    setPlaying(false);
    state.mode = mode;
    applyMode();
}

els.modeReal.addEventListener('click', () => switchMode('real'));
els.modeComplex.addEventListener('click', () => switchMode('complex'));

els.slider.addEventListener('input', e => applyDx(sliderToDx(Number(e.target.value))));

els.btnStep1.addEventListener('click', () => doSteps(1));
els.btnStep5.addEventListener('click', () => doSteps(5));
els.btnTurn.addEventListener('click', doTurn);
els.btnPlay.addEventListener('click', () => setPlaying(!state.playing));
els.btnReset.addEventListener('click', doReset);

els.conclusionBtn.addEventListener('click', () => {
    const open = els.conclusionBtn.getAttribute('aria-expanded') === 'true';
    els.conclusionBtn.setAttribute('aria-expanded', String(!open));
    els.conclusionBody.hidden = open;
});

els.helpBtn.addEventListener('click', openHelp);
els.helpClose.addEventListener('click', closeHelp);
/* click on the backdrop (the dialog's own box is inset) closes it */
els.helpModal.addEventListener('click', e => { if (e.target === els.helpModal) closeHelp(); });

els.themeToggle.addEventListener('click', () => {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
});

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang')));
});

/* Keyboard: space = play/pause, right arrow = one step, R = reset. */
document.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement) return;
    if (els.helpModal.open) return;               // Esc is handled by <dialog>
    if (e.code === 'Space')      { e.preventDefault(); setPlaying(!state.playing); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); doSteps(1); }
    else if (e.key === 'r' || e.key === 'R') { doReset(); }
});

if (window.ResizeObserver) {
    new ResizeObserver(() => resizeCanvas()).observe(canvas.parentElement);
} else {
    window.addEventListener('resize', resizeCanvas);
}

/* ---------- Start-up ---------- */

(function init() {
    let savedTheme = null, savedLang = null;
    try {
        savedTheme = localStorage.getItem('cee-theme');
        savedLang = localStorage.getItem('cee-lang');
    } catch (e) { /* private mode */ }

    if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        savedTheme = 'dark';
    }
    applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    setLanguage(savedLang || (I18N[nav] ? nav : 'en'));

    /* Fixed pieces, typeset once: they never change with mode or language. */
    texInto(els.brandMark, 'e^{ix}');
    texInto(els.modeFormulaR, 'y=e^{x}');
    texInto(els.modeFormulaC, 'z=e^{ix}');
    texInto(els.euler, 'e^{ix}=\\cos x+i\\sin x', true);
    texInto(document.getElementById('dx-label'), '\\Delta x');
    texInto(document.getElementById('turn-sub'), '+2\\pi');

    state.dx = 0.1;
    els.slider.value = String(dxToSlider(state.dx));
    els.dxValue.textContent = formatDx(state.dx);

    applyMode();
    resizeCanvas();
})();
