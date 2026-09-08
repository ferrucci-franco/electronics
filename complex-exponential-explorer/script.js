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
        conclusionText: 'When Δx → 0 the spurious radial growth |1 + iΔx| = √(1 + Δx²) tends to 1, so the trajectory becomes a pure rotation of constant modulus along the unit circle. Each step turns the point by Δx, so after n steps the accumulated angle is exactly x = n·Δx. The point therefore sits at (cos x, sin x).',
        question: 'I am at x. What happens when I move forward by one small step Δx?',
        hintReal: 'Moving forward by Δx is multiplying by (1 + Δx): the exponential turns the step into a factor.',
        hintComplex: 'What does that i change? The factor (1 + iΔx) turns the point — and its modulus grows a little, because |1 + iΔx| > 1.',
        labelExact: 'exact',
        labelError: 'error',
        labelRelError: 'rel. error',
        labelTurns: 'turns',
        warnMaxSteps: 'Maximum number of steps reached.',
        warnOverflow: 'The value has grown beyond what can be represented.',
        helpBtn: 'Help',
        helpTitle: 'The mathematics behind the picture',
        helpClose: 'Close',
        helpSections: [
            { h: 'The question',
              items: [
                { p: 'I am somewhere on the curve, at x. I move forward by one small step Δx. How do I get the next value?' },
                { tex: 'y(x)=e^{x}' },
                { tex: 'y(x+\\Delta x)=e^{x+\\Delta x}' }
              ] },
            { h: 'What the exponential answers',
              items: [
                { p: 'The exponential turns a sum in the exponent into a product:' },
                { tex: 'e^{x+\\Delta x}=e^{x}\\,e^{\\Delta x}' },
                { p: 'and since y(x) = eˣ, the step is a multiplication:' },
                { tex: '\\boxed{\\;y(x+\\Delta x)=y(x)\\,e^{\\Delta x}\\;}' },
                { p: 'This is exact — no approximation yet, and it holds for any Δx, small or large. Advancing means multiplying by that factor.' }
              ] },
            { h: 'So what is that factor worth for a small step?',
              items: [
                { p: 'Only now does the problem appear, and only now do we need Taylor. The series gives the exact value:' },
                { tex: 'e^{\\Delta x}=1+\\Delta x+\\frac{(\\Delta x)^{2}}{2!}+\\frac{(\\Delta x)^{3}}{3!}+\\cdots' },
                { p: 'Every term after the first two carries a factor (Δx)² or smaller, so for a small step they weigh very little:' },
                { tex: 'e^{\\Delta x}\\approx 1+\\Delta x' },
                { p: 'What we drop is of order (Δx)²/2: about 0.005 for Δx = 0.1, and 0.00005 for Δx = 0.01. This is the only approximation in the whole application.' }
              ] },
            { h: 'The discrete step',
              items: [
                { p: 'Putting the two together:' },
                { tex: 'y(x+\\Delta x)\\approx y(x)\\,(1+\\Delta x)' },
                { p: 'Starting from y(0) = 1 and writing yₙ for the value after n steps:' },
                { tex: '\\boxed{\\;y_{n+1}=y_{n}\\,(1+\\Delta x)\\;}' },
                { p: 'so yₙ = (1 + Δx)ⁿ. With x = n·Δx that is (1 + x/n)ⁿ, the classical limit that returns eˣ as n grows. The gap you read on screen is that limit not yet reached.' }
              ] },
            { h: 'Exactly the same, with an i',
              items: [
                { p: 'Now repeat the reasoning without changing a comma. Start from:' },
                { tex: 'z(x)=e^{ix}' },
                { p: 'move forward by Δx, and use the same property of the exponential:' },
                { tex: 'z(x+\\Delta x)=e^{i(x+\\Delta x)}=e^{ix}\\,e^{i\\Delta x}=z(x)\\,e^{i\\Delta x}' },
                { p: 'and only then approximate:' },
                { tex: 'e^{i\\Delta x}\\approx 1+i\\Delta x' },
                { tex: '\\boxed{\\;z_{n+1}=z_{n}\\,(1+i\\Delta x)\\;}' },
                { p: 'The two screens do the same arithmetic. The only difference is that i. So: what does it change?' }
              ] },
            { h: 'What the i changes: a spiral that closes',
              items: [
                { p: 'Multiplying by 1 + iΔx turns the point by arctan(Δx) ≈ Δx. That is where the rotation comes from — no cosine and no sine were ever used. But the factor does not sit on the unit circle:' },
                { tex: '\\left|1+i\\Delta x\\right|=\\sqrt{1+\\Delta x^{2}}>1' },
                { p: 'so the modulus grows a little at every step, which is exactly the spiral you see:' },
                { tex: '\\left|z_{n}\\right|=\\left(1+\\Delta x^{2}\\right)^{n/2}' },
                { p: 'Write n = x/Δx and use ln(1 + u) ≈ u for small u:' },
                { tex: '\\left|z_{n}\\right|\\approx e^{\\,x\\Delta x/2}\\;\\xrightarrow[\\;\\Delta x\\to 0\\;]{}\\;1' },
                { p: 'Check it against the read-out: one turn (x = 2π) at Δx = 0.1 predicts |z| ≈ 1.37. The angle behaves the same way: one step turns the point by arctan(Δx), a shade less than Δx, and n·arctan(Δx) → x only in the limit. That lag is why one turn takes slightly more than 2π/Δx steps — which is what the turn button counts. Modulus going to 1, argument going to x: the point lands on the unit circle at angle x.' }
              ] }
        ]
    },
    fr: {
        appTitle: 'Explorateur de l’exponentielle complexe',
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
        conclusionText: 'Lorsque Δx → 0, la croissance radiale parasite |1 + iΔx| = √(1 + Δx²) tend vers 1 : la trajectoire devient une rotation pure, de module constant, sur le cercle unité. Chaque pas fait tourner le point de Δx ; après n pas l’angle accumulé vaut exactement x = n·Δx. Le point se trouve donc en (cos x, sin x).',
        question: 'Je suis en x. Que se passe-t-il quand j’avance d’un petit pas Δx ?',
        hintReal: 'Avancer de Δx, c’est multiplier par (1 + Δx) : l’exponentielle transforme le pas en un facteur.',
        hintComplex: 'Qu’est-ce que ce i change ? Le facteur (1 + iΔx) fait tourner le point — et son module croît un peu, car |1 + iΔx| > 1.',
        labelExact: 'exact',
        labelError: 'erreur',
        labelRelError: 'erreur rel.',
        labelTurns: 'tours',
        warnMaxSteps: 'Nombre maximal de pas atteint.',
        warnOverflow: 'La valeur est devenue trop grande pour être représentée.',
        helpBtn: 'Aide',
        helpTitle: 'Les mathématiques derrière l’image',
        helpClose: 'Fermer',
        helpSections: [
            { h: 'La question',
              items: [
                { p: 'Je suis quelque part sur la courbe, en x. J’avance d’un petit pas Δx. Comment obtenir la valeur suivante ?' },
                { tex: 'y(x)=e^{x}' },
                { tex: 'y(x+\\Delta x)=e^{x+\\Delta x}' }
              ] },
            { h: 'Ce que répond l’exponentielle',
              items: [
                { p: 'L’exponentielle transforme une somme en exposant en un produit :' },
                { tex: 'e^{x+\\Delta x}=e^{x}\\,e^{\\Delta x}' },
                { p: 'et comme y(x) = eˣ, le pas est une multiplication :' },
                { tex: '\\boxed{\\;y(x+\\Delta x)=y(x)\\,e^{\\Delta x}\\;}' },
                { p: 'C’est exact — aucune approximation pour l’instant, et cela vaut pour tout Δx, petit ou grand. Avancer, c’est multiplier par ce facteur.' }
              ] },
            { h: 'Alors, combien vaut ce facteur pour un petit pas ?',
              items: [
                { p: 'Le problème n’apparaît que maintenant, et Taylor ne sert qu’ici. La série donne la valeur exacte :' },
                { tex: 'e^{\\Delta x}=1+\\Delta x+\\frac{(\\Delta x)^{2}}{2!}+\\frac{(\\Delta x)^{3}}{3!}+\\cdots' },
                { p: 'Chaque terme après les deux premiers porte un facteur (Δx)² ou plus petit : pour un petit pas, ils pèsent très peu.' },
                { tex: 'e^{\\Delta x}\\approx 1+\\Delta x' },
                { p: 'Ce que l’on abandonne est d’ordre (Δx)²/2 : environ 0,005 pour Δx = 0,1, et 0,00005 pour Δx = 0,01. C’est la seule approximation de toute l’application.' }
              ] },
            { h: 'Le pas discret',
              items: [
                { p: 'En rassemblant les deux :' },
                { tex: 'y(x+\\Delta x)\\approx y(x)\\,(1+\\Delta x)' },
                { p: 'En partant de y(0) = 1 et en notant yₙ la valeur après n pas :' },
                { tex: '\\boxed{\\;y_{n+1}=y_{n}\\,(1+\\Delta x)\\;}' },
                { p: 'd’où yₙ = (1 + Δx)ⁿ. Avec x = n·Δx, cela s’écrit (1 + x/n)ⁿ, la limite classique qui redonne eˣ quand n grandit. L’écart lu à l’écran, c’est cette limite pas encore atteinte.' }
              ] },
            { h: 'Exactement pareil, avec un i',
              items: [
                { p: 'On reprend le raisonnement sans changer une virgule. On part de :' },
                { tex: 'z(x)=e^{ix}' },
                { p: 'on avance de Δx, et on utilise la même propriété de l’exponentielle :' },
                { tex: 'z(x+\\Delta x)=e^{i(x+\\Delta x)}=e^{ix}\\,e^{i\\Delta x}=z(x)\\,e^{i\\Delta x}' },
                { p: 'et seulement alors on approche :' },
                { tex: 'e^{i\\Delta x}\\approx 1+i\\Delta x' },
                { tex: '\\boxed{\\;z_{n+1}=z_{n}\\,(1+i\\Delta x)\\;}' },
                { p: 'Les deux écrans font le même calcul. La seule différence est ce i. Donc : qu’est-ce qu’il change ?' }
              ] },
            { h: 'Ce que change le i : une spirale qui se referme',
              items: [
                { p: 'Multiplier par 1 + iΔx fait tourner le point de arctan(Δx) ≈ Δx. Voilà d’où vient la rotation — ni cosinus ni sinus n’ont été utilisés. Mais le facteur n’est pas sur le cercle unité :' },
                { tex: '\\left|1+i\\Delta x\\right|=\\sqrt{1+\\Delta x^{2}}>1' },
                { p: 'le module croît donc un peu à chaque pas, ce qui est exactement la spirale observée :' },
                { tex: '\\left|z_{n}\\right|=\\left(1+\\Delta x^{2}\\right)^{n/2}' },
                { p: 'En écrivant n = x/Δx et en utilisant ln(1 + u) ≈ u pour u petit :' },
                { tex: '\\left|z_{n}\\right|\\approx e^{\\,x\\Delta x/2}\\;\\xrightarrow[\\;\\Delta x\\to 0\\;]{}\\;1' },
                { p: 'À vérifier sur le panneau : un tour (x = 2π) à Δx = 0,1 prédit |z| ≈ 1,37. L’angle suit la même logique : un pas fait tourner le point de arctan(Δx), un peu moins que Δx, et n·arctan(Δx) → x seulement à la limite. Ce retard explique qu’un tour demande un peu plus que 2π/Δx pas — c’est ce que compte le bouton. Module vers 1, argument vers x : le point se pose sur le cercle unité à l’angle x.' }
              ] }
        ]
    },
    es: {
        appTitle: 'Explorador de la exponencial compleja',
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
        conclusionText: 'Cuando Δx → 0, el crecimiento radial espurio |1 + iΔx| = √(1 + Δx²) tiende a 1: la trayectoria se convierte en una rotación pura, de módulo constante, sobre el círculo unidad. Cada paso gira el punto un ángulo Δx, de modo que tras n pasos el ángulo acumulado es exactamente x = n·Δx. El punto está, por tanto, en (cos x, sin x).',
        question: 'Estoy en x. ¿Qué ocurre cuando avanzo un pequeño paso Δx?',
        hintReal: 'Avanzar Δx es multiplicar por (1 + Δx): la exponencial convierte el paso en un factor.',
        hintComplex: '¿Qué cambia ese i? El factor (1 + iΔx) hace girar el punto — y su módulo crece un poco, porque |1 + iΔx| > 1.',
        labelExact: 'exacto',
        labelError: 'error',
        labelRelError: 'error rel.',
        labelTurns: 'vueltas',
        warnMaxSteps: 'Se alcanzó el número máximo de pasos.',
        warnOverflow: 'El valor ha crecido más allá de lo representable.',
        helpBtn: 'Ayuda',
        helpTitle: 'La matemática detrás de la imagen',
        helpClose: 'Cerrar',
        helpSections: [
            { h: 'La pregunta',
              items: [
                { p: 'Estoy en algún punto de la curva, en x. Avanzo un pequeño paso Δx. ¿Cómo calculo el próximo valor?' },
                { tex: 'y(x)=e^{x}' },
                { tex: 'y(x+\\Delta x)=e^{x+\\Delta x}' }
              ] },
            { h: 'Lo que responde la exponencial',
              items: [
                { p: 'La exponencial convierte una suma en el exponente en un producto:' },
                { tex: 'e^{x+\\Delta x}=e^{x}\\,e^{\\Delta x}' },
                { p: 'y como y(x) = eˣ, el paso es una multiplicación:' },
                { tex: '\\boxed{\\;y(x+\\Delta x)=y(x)\\,e^{\\Delta x}\\;}' },
                { p: 'Esto es exacto — todavía no hay ninguna aproximación, y vale para cualquier Δx, chico o grande. Avanzar es multiplicar por ese factor.' }
              ] },
            { h: 'Entonces, ¿cuánto vale ese factor para un paso pequeño?',
              items: [
                { p: 'Recién ahora aparece el problema, y recién ahora hace falta Taylor. La serie da el valor exacto:' },
                { tex: 'e^{\\Delta x}=1+\\Delta x+\\frac{(\\Delta x)^{2}}{2!}+\\frac{(\\Delta x)^{3}}{3!}+\\cdots' },
                { p: 'Cada término después de los dos primeros lleva un factor (Δx)² o menor: para un paso pequeño pesan muy poco.' },
                { tex: 'e^{\\Delta x}\\approx 1+\\Delta x' },
                { p: 'Lo que descartamos es del orden de (Δx)²/2: unos 0,005 para Δx = 0,1, y 0,00005 para Δx = 0,01. Esta es la única aproximación de toda la aplicación.' }
              ] },
            { h: 'El paso discreto',
              items: [
                { p: 'Juntando las dos cosas:' },
                { tex: 'y(x+\\Delta x)\\approx y(x)\\,(1+\\Delta x)' },
                { p: 'Partiendo de y(0) = 1 y llamando yₙ al valor tras n pasos:' },
                { tex: '\\boxed{\\;y_{n+1}=y_{n}\\,(1+\\Delta x)\\;}' },
                { p: 'de donde yₙ = (1 + Δx)ⁿ. Con x = n·Δx esto es (1 + x/n)ⁿ, el límite clásico que devuelve eˣ cuando n crece. La diferencia que ves en pantalla es ese límite todavía no alcanzado.' }
              ] },
            { h: 'Exactamente lo mismo, con una i',
              items: [
                { p: 'Ahora repetimos el razonamiento sin cambiar una coma. Partimos de:' },
                { tex: 'z(x)=e^{ix}' },
                { p: 'avanzamos Δx y usamos la misma propiedad de la exponencial:' },
                { tex: 'z(x+\\Delta x)=e^{i(x+\\Delta x)}=e^{ix}\\,e^{i\\Delta x}=z(x)\\,e^{i\\Delta x}' },
                { p: 'y recién ahí aproximamos:' },
                { tex: 'e^{i\\Delta x}\\approx 1+i\\Delta x' },
                { tex: '\\boxed{\\;z_{n+1}=z_{n}\\,(1+i\\Delta x)\\;}' },
                { p: 'Las dos pantallas hacen la misma cuenta. La única diferencia es esa i. Entonces: ¿qué cambia?' }
              ] },
            { h: 'Qué cambia la i: una espiral que se cierra',
              items: [
                { p: 'Multiplicar por 1 + iΔx gira el punto un ángulo arctan(Δx) ≈ Δx. De ahí viene la rotación — no se usó ningún seno ni ningún coseno. Pero el factor no está sobre el círculo unidad:' },
                { tex: '\\left|1+i\\Delta x\\right|=\\sqrt{1+\\Delta x^{2}}>1' },
                { p: 'así que el módulo crece un poco en cada paso, que es exactamente la espiral que se ve:' },
                { tex: '\\left|z_{n}\\right|=\\left(1+\\Delta x^{2}\\right)^{n/2}' },
                { p: 'Escribiendo n = x/Δx y usando ln(1 + u) ≈ u para u pequeño:' },
                { tex: '\\left|z_{n}\\right|\\approx e^{\\,x\\Delta x/2}\\;\\xrightarrow[\\;\\Delta x\\to 0\\;]{}\\;1' },
                { p: 'Comprobalo contra el panel: una vuelta (x = 2π) con Δx = 0,1 predice |z| ≈ 1,37. El ángulo se comporta igual: un paso gira el punto arctan(Δx), un poco menos que Δx, y n·arctan(Δx) → x solo en el límite. Ese retraso es la razón de que una vuelta requiera algo más que 2π/Δx pasos — que es lo que cuenta el botón. Módulo tendiendo a 1, argumento tendiendo a x: el punto cae sobre el círculo unidad en el ángulo x.' }
              ] }
        ]
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

/**
 * Number of steps that bring the point closest to one full turn.
 *
 * One step multiplies by (1 + iΔx), and arg(1 + iΔx) = arctan(Δx), which is
 * always a little SMALLER than Δx. Counting 2π/Δx steps therefore always fell
 * short of closing the loop, and visibly so for a large Δx: at Δx = 0.5 it
 * stopped 14.7° early, every single time. Using the rotation the step really
 * performs makes the residue a rounding one — at most half a step, and as
 * often over as under.
 */
function stepsPerTurn(dx) {
    return Math.max(1, Math.round(TAU / Math.atan(dx)));
}

/** Angle actually swept after n steps: exact, and free of atan2 wrapping. */
function sweptAngle(n, dx) {
    return n * Math.atan(dx);
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
    line:          document.getElementById('formula-line'),
    question:      document.getElementById('formula-question'),
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
        ['arg',   texHTML('\\arg(z_{n})=n\\arctan\\Delta x')],
        ['turns', i18n.t('labelTurns') + ' ' + texHTML('=\\arg/2\\pi')]
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
        /* The turns actually completed follow the angle the point has swept,
           not the parameter x: they differ by exactly the angular lag the
           approximation introduces, and only agree in the limit Δx → 0. */
        const arg = sweptAngle(n, state.dx);
        setRO('arg', fmtNum(arg, 4));
        setRO('turns', (arg / TAU).toFixed(3));
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

/* ---------- The derivation shown above the graph ----------
   Read in order, it is the argument in full: where we are, what one step of
   the exponential does exactly, what that costs when we approximate it, and
   the recurrence the application then iterates. `box` marks the two results
   worth carrying away — the exact multiplicative law, and the discrete step.
   The two chains differ by one symbol, which is the whole point.           */

const CHAIN_REAL = [
    { tex: 'y(x)=e^{x}' },
    { tex: 'y(x+\\Delta x)=e^{x+\\Delta x}=e^{x}\\,e^{\\Delta x}' },
    { tex: 'y(x+\\Delta x)=y(x)\\,e^{\\Delta x}', box: true },
    { tex: 'e^{\\Delta x}=1+\\Delta x+\\frac{(\\Delta x)^{2}}{2!}+\\cdots' },
    { tex: 'e^{\\Delta x}\\approx 1+\\Delta x' },
    { tex: 'y_{n+1}=y_{n}\\,(1+\\Delta x)', box: true, result: true }
];

const CHAIN_COMPLEX = [
    { tex: 'z(x)=e^{ix}' },
    { tex: 'z(x+\\Delta x)=e^{i(x+\\Delta x)}=e^{ix}\\,e^{i\\Delta x}' },
    { tex: 'z(x+\\Delta x)=z(x)\\,e^{i\\Delta x}', box: true },
    { tex: 'e^{i\\Delta x}=1+i\\Delta x+\\frac{(i\\Delta x)^{2}}{2!}+\\cdots' },
    { tex: 'e^{i\\Delta x}\\approx 1+i\\Delta x' },
    { tex: 'z_{n+1}=z_{n}\\,(1+i\\Delta x)', box: true, result: true }
];

function renderChain(steps) {
    let html = '';
    steps.forEach((step, i) => {
        if (i > 0) html += '<span class="formula-sep" aria-hidden="true">→</span>';
        const cls = 'formula-step' + (step.box ? ' formula-boxed' : '')
                                   + (step.result ? ' formula-result' : '');
        const src = step.box ? '\\boxed{\\,' + step.tex + '\\,}' : step.tex;
        html += '<span class="' + cls + '">' + texHTML(src) + '</span>';
    });
    els.line.innerHTML = html;
}

/* ---------- Mode-dependent chrome ---------- */

function applyMode() {
    const real = state.mode === 'real';

    els.modeReal.classList.toggle('active', real);
    els.modeComplex.classList.toggle('active', !real);
    els.modeReal.setAttribute('aria-selected', String(real));
    els.modeComplex.setAttribute('aria-selected', String(!real));

    renderChain(real ? CHAIN_REAL : CHAIN_COMPLEX);
    els.question.textContent = i18n.t('question');

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
    els.question.textContent = i18n.t('question');
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
