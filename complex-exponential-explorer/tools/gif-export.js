/* ============================================================================
   Animation generator — index.html?gif

   The point of this file is that it draws nothing itself. Every frame is
   produced by the application's own `draw()`, pointed for the length of one
   frame at an off-screen canvas of the requested size, so what comes out of
   the GIF is what the reader sees in the app — the same fit, the same
   hierarchy of trail, increment and vector, the same theme. There is no
   second renderer to drift away from the first.

   Four parts: what it says, the panel, the capture, and the wiring.
   ========================================================================== */

(function () {
'use strict';

/* ============================================================================
   1. WORDS
   ========================================================================== */

const T = {
    en: {
        title: 'Animation generator', sub: 'A looping GIF of the construction, for a slide.',
        mode: 'Mode', real: 'Real', complex: 'Complex',
        dx: 'Δx', xEnd: 'Final x', seconds: 'Duration', fps: 'Frames per second',
        size: 'Size', scale: 'Line and label size', frame: 'Framing',
        fixed: 'Fixed (computed from the end)', follow: 'Follows the simulation',
        theme: 'Theme', light: 'Light', dark: 'Dark', hold: 'Pause at the end',
        turnsC: 'one turn', turnsR: 'units of x',
        summary: (f, s, p) => `${f} frames · ${s} steps · ${p} per frame`,
        preview: 'Preview the last frame', make: 'Generate the GIF',
        working: 'Frame', palette: 'Reading the colours', writing: 'Writing the GIF',
        done: 'Ready', download: 'Download', close: 'Close', back: 'Back to the app',
        heavy: 'Over 6 MB — shorten it, drop the frame rate, or make it smaller.',
        note: 'The frames come from the application itself, so the GIF matches the live plot exactly.'
    },
    fr: {
        title: 'Générateur d’animation', sub: 'Un GIF en boucle de la construction, pour une diapositive.',
        mode: 'Mode', real: 'Réel', complex: 'Complexe',
        dx: 'Δx', xEnd: 'x final', seconds: 'Durée', fps: 'Images par seconde',
        size: 'Taille', scale: 'Taille du trait et des chiffres', frame: 'Cadrage',
        fixed: 'Fixe (calculé sur la fin)', follow: 'Suit la simulation',
        theme: 'Thème', light: 'Clair', dark: 'Sombre', hold: 'Pause à la fin',
        turnsC: 'un tour', turnsR: 'unités de x',
        summary: (f, s, p) => `${f} images · ${s} pas · ${p} par image`,
        preview: 'Aperçu de la dernière image', make: 'Générer le GIF',
        working: 'Image', palette: 'Lecture des couleurs', writing: 'Écriture du GIF',
        done: 'Prêt', download: 'Télécharger', close: 'Fermer', back: 'Retour à l’application',
        heavy: 'Plus de 6 Mo — raccourcir, baisser la cadence, ou réduire la taille.',
        note: 'Les images viennent de l’application elle-même : le GIF est exactement le tracé.'
    },
    es: {
        title: 'Generador de animación', sub: 'Un GIF en bucle de la construcción, para una diapositiva.',
        mode: 'Modo', real: 'Real', complex: 'Complejo',
        dx: 'Δx', xEnd: 'x final', seconds: 'Duración', fps: 'Cuadros por segundo',
        size: 'Tamaño', scale: 'Tamaño del trazo y los números', frame: 'Encuadre',
        fixed: 'Fijo (calculado sobre el final)', follow: 'Sigue a la simulación',
        theme: 'Tema', light: 'Claro', dark: 'Oscuro', hold: 'Pausa al final',
        turnsC: 'una vuelta', turnsR: 'unidades de x',
        summary: (f, s, p) => `${f} cuadros · ${s} pasos · ${p} por cuadro`,
        preview: 'Ver el último cuadro', make: 'Generar el GIF',
        working: 'Cuadro', palette: 'Leyendo los colores', writing: 'Escribiendo el GIF',
        done: 'Listo', download: 'Descargar', close: 'Cerrar', back: 'Volver a la app',
        heavy: 'Más de 6 MB — acortá, bajá los cuadros por segundo, o hacelo más chico.',
        note: 'Los cuadros salen de la app misma, así que el GIF es exactamente el gráfico.'
    }
};

function t() { return T[(window.i18n && i18n.lang) || 'en'] || T.en; }

/* ============================================================================
   2. THE PANEL
   ========================================================================== */

const CSS = `
.gifx { position: fixed; inset: 0; z-index: 60; overflow: auto;
        background: var(--bg); color: var(--text);
        padding: 22px clamp(14px, 4vw, 40px) 40px; }
.gifx-head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
             margin-bottom: 18px; }
.gifx-head h2 { margin: 0; font-size: 1.2rem; font-weight: 600; letter-spacing: -0.01em; }
.gifx-head p { margin: 0; color: var(--text-muted); font-size: 0.86rem; }
.gifx-head a { margin-left: auto; color: var(--accent); font-size: 0.86rem;
               text-decoration: none; }
.gifx-head a:hover { text-decoration: underline; }
.gifx-body { display: grid; grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
             gap: clamp(18px, 3vw, 34px); align-items: start; }
@media (max-width: 780px) { .gifx-body { grid-template-columns: 1fr; } }
.gifx-field { margin-bottom: 13px; }
.gifx-field > span { display: block; font-size: 0.78rem; color: var(--text-muted);
                     margin-bottom: 5px; }
.gifx-field input[type="number"], .gifx-field select {
    width: 100%; padding: 7px 9px; font: inherit; font-size: 0.9rem;
    color: var(--text); background: var(--card-bg);
    border: 1px solid var(--border); border-radius: 7px; }
.gifx-pair { display: flex; gap: 9px; }
.gifx-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.gifx-pill { padding: 6px 13px; font: inherit; font-size: 0.84rem; cursor: pointer;
             border-radius: 999px; border: 1px solid var(--accent);
             background: transparent; color: var(--accent); }
.gifx-pill[aria-pressed="true"] { background: var(--accent); border-color: var(--accent);
                                  color: #fff; }
.gifx-sum { font-size: 0.79rem; color: var(--text-muted); margin: 4px 0 16px;
            font-variant-numeric: tabular-nums; }
.gifx-go { display: flex; gap: 9px; flex-wrap: wrap; margin-bottom: 12px; }
.gifx-stage { border: 1px solid var(--border); border-radius: 10px; padding: 12px;
              background: var(--card-bg); }
.gifx-stage canvas, .gifx-stage img { display: block; max-width: 100%; height: auto;
                                      margin: 0 auto; border-radius: 4px; }
.gifx-bar { height: 4px; border-radius: 999px; background: var(--border);
            overflow: hidden; margin: 12px 0 6px; }
.gifx-bar i { display: block; height: 100%; width: 0; background: var(--accent);
              transition: width 0.12s linear; }
.gifx-status { font-size: 0.79rem; color: var(--text-muted); min-height: 1.2em;
               font-variant-numeric: tabular-nums; }
.gifx-note { font-size: 0.78rem; color: var(--text-muted); margin-top: 14px;
             line-height: 1.5; }
.gifx-warn { color: var(--accent-last); }
`;

const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

function field(label, node) {
    const f = el('label', 'gifx-field');
    f.appendChild(el('span', null, label));
    f.appendChild(node);
    return f;
}

function number(value, min, max, step) {
    const n = el('input');
    n.type = 'number'; n.value = String(value);
    n.min = String(min); n.max = String(max); n.step = String(step);
    return n;
}

function pills(options, value, onPick) {
    const box = el('div', 'gifx-pills');
    const buttons = options.map(o => {
        const b = el('button', 'gifx-pill', o.label);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(o.value === value));
        b.addEventListener('click', () => {
            buttons.forEach(x => x.setAttribute('aria-pressed', 'false'));
            b.setAttribute('aria-pressed', 'true');
            onPick(o.value);
        });
        box.appendChild(b);
        return b;
    });
    return box;
}

function select(options, value) {
    const s = el('select');
    options.forEach(o => {
        const opt = el('option', null, o.label);
        opt.value = String(o.value);
        s.appendChild(opt);
    });
    s.value = String(value);
    return s;
}

/* ============================================================================
   3. CAPTURE

   `stage` owns the off-screen canvas and its own copy of the trail cache, so
   the frames build up incrementally exactly as they do on screen. `onStage`
   lends the application's renderer to it for one frame and hands everything
   back afterwards — including the on-screen trail layer, whose cached pixels
   stay valid throughout because they are never drawn on.
   ========================================================================== */

function makeStage(cfg) {
    const mk = () => {
        const cv = document.createElement('canvas');
        cv.width = cfg.w; cv.height = cfg.h;
        return cv;
    };
    const cv = mk(), tcv = mk();
    const g = cv.getContext('2d', { willReadFrequently: true });
    const tg = tcv.getContext('2d');
    g.setTransform(cfg.scale, 0, 0, cfg.scale, 0, 0);
    tg.setTransform(cfg.scale, 0, 0, cfg.scale, 0, 0);
    return { cfg: cfg, cv: cv, g: g, tcv: tcv, tg: tg,
             mine: { drawn: 0, key: '', at: null }, sim: null };
}

function onStage(stage, fn) {
    const cfg = stage.cfg;
    const back = {
        ctx: ctx, cssW: cssW, cssH: cssH, mode: state.mode, dx: state.dx,
        sim: state.sims[cfg.mode],
        trail: { cv: trail.cv, ctx: trail.ctx, drawn: trail.drawn, key: trail.key, at: trail.at }
    };
    ctx = stage.g;
    cssW = cfg.w / cfg.scale;
    cssH = cfg.h / cfg.scale;
    state.mode = cfg.mode;
    state.dx = cfg.dx;
    state.sims[cfg.mode] = stage.sim;
    trail.cv = stage.tcv; trail.ctx = stage.tg;
    trail.drawn = stage.mine.drawn; trail.key = stage.mine.key; trail.at = stage.mine.at;
    try {
        return fn();
    } finally {
        stage.mine.drawn = trail.drawn; stage.mine.key = trail.key; stage.mine.at = trail.at;
        ctx = back.ctx; cssW = back.cssW; cssH = back.cssH;
        state.mode = back.mode; state.dx = back.dx;
        state.sims[cfg.mode] = back.sim;
        Object.assign(trail, back.trail);
    }
}

/**
 * The frame the whole animation is drawn in.
 *
 * "Fixed" runs the trajectory to its end first, asks the application where it
 * would put the view, and then starts over inside that view: the axes hold
 * still and the curve fills a frame that never jumps. The automatic fit only
 * ever grows and leaves a third of its span as air, so a view computed from
 * the last point is never outgrown on the way there — which is why this needs
 * no lock and never meets the rule that hands a frame back.
 */
function fixedView(cfg, steps) {
    const probe = makeSim(cfg.mode);
    advance(probe, steps, cfg.dx);
    updateView(probe);
    return probe.view;
}

function prepare(stage, steps) {
    const cfg = stage.cfg;
    const sim = makeSim(cfg.mode);
    if (cfg.fixed) sim.view = fixedView(cfg, steps);
    stage.sim = sim;
    stage.mine = { drawn: 0, key: '', at: null };
    return sim;
}

/** Step to `n` and paint. The steps in between are never drawn: the trail
    layer catches up from wherever it had got to. */
function frameAt(stage, n) {
    const sim = stage.sim;
    if (n > sim.n) advance(sim, n - sim.n, stage.cfg.dx);
    onStage(stage, draw);
}

function schedule(cfg) {
    const steps = Math.min(MAX_STEPS, Math.max(1, Math.round(cfg.xEnd / cfg.dx)));
    /* Never more frames than there are steps to show. Asking for 20 a second
       of a trajectory that is 50 steps long only repeats frames — a stutter
       and a delay, not motion — so the animation drops to one step per frame
       and each frame is held longer, which lasts exactly as long as asked. */
    const frames = Math.max(2, Math.min(Math.round(cfg.seconds * cfg.fps), steps + 1));
    const delay = Math.max(2, Math.round(100 * cfg.seconds / frames));
    const at = [];
    for (let i = 0; i < frames; i++) at.push(Math.round(steps * i / (frames - 1)));
    return { steps: steps, frames: frames, delay: delay, at: at };
}

const breathe = () => new Promise(r => setTimeout(r, 0));

function cssRGB(value) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const g = c.getContext('2d');
    g.fillStyle = value;
    g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
}

/**
 * Two passes over the same animation. The first samples a handful of frames to
 * learn which colours are actually on the canvas; the second re-runs it and
 * writes each frame out as it is drawn, so only one frame is ever in memory.
 */
async function generate(cfg, report) {
    const plan = schedule(cfg);
    const SAMPLES = Math.min(10, plan.frames);

    /* Pass one: the palette. */
    report(t().palette, 0);
    const hist = new GIF.Histogram();
    const stage = stage_(cfg);
    prepare(stage, plan.steps);
    for (let s = 0; s < SAMPLES; s++) {
        const i = Math.round((plan.frames - 1) * s / (SAMPLES - 1 || 1));
        frameAt(stage, plan.at[i]);
        hist.add(stage.g.getImageData(0, 0, cfg.w, cfg.h).data, 3);
        if (s % 3 === 2) await breathe();
    }
    /* The colours the drawing code asked for go in exactly: they are most of
       the picture, and a background off by one level bands visibly. */
    const seeds = [];
    onStage(stage, () => { const p = palette(); Object.keys(p).forEach(k => seeds.push(cssRGB(p[k]))); });
    const pal = hist.palette(seeds);
    const map = new GIF.Mapper(pal.table, pal.size);

    /* Pass two: the frames. */
    const writer = new GIF.Writer({ width: cfg.w, height: cfg.h, palette: pal.table });
    const delay = plan.delay;
    prepare(stage, plan.steps);
    const indices = () => {
        const d = stage.g.getImageData(0, 0, cfg.w, cfg.h).data;
        const out = new Uint8Array(cfg.w * cfg.h);
        for (let i = 0, p = 0; p < out.length; i += 4, p++) out[p] = map.index(d[i], d[i + 1], d[i + 2]);
        return out;
    };
    for (let i = 0; i < plan.frames; i++) {
        frameAt(stage, plan.at[i]);
        const last = i === plan.frames - 1;
        writer.frame(indices(), delay + (last ? Math.round(cfg.hold * 100) : 0));
        report(t().working + ' ' + (i + 1) + '/' + plan.frames, (i + 1) / plan.frames);
        if (i % 2 === 1) await breathe();
    }
    report(t().writing, 1);
    await breathe();
    return { blob: writer.finish(), plan: plan, colours: pal.size };
}

/* One stage is kept and reused, so a second run does not leave canvases behind. */
function stage_(cfg) {
    const s = generate.stage;
    if (s && s.cfg.w === cfg.w && s.cfg.h === cfg.h && s.cfg.scale === cfg.scale) {
        s.cfg = cfg;
        return s;
    }
    generate.stage = makeStage(cfg);
    return generate.stage;
}

/* ============================================================================
   4. WIRING
   ========================================================================== */

function open() {
    const style = el('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const w = t();
    const panel = el('div', 'gifx');

    const head = el('div', 'gifx-head');
    head.appendChild(el('h2', null, w.title));
    head.appendChild(el('p', null, w.sub));
    const back = el('a', null, w.back);
    back.href = location.pathname;
    head.appendChild(back);
    panel.appendChild(head);

    const body = el('div', 'gifx-body');
    const form = el('div');
    const view = el('div');

    /* --- the controls --- */
    /* The complex plane holds both axes to the same scale, so it uses the
       shorter side of the canvas and a wide frame is mostly margin. Its
       default is nearly square; the real plot, which stretches freely, is
       given the width. */
    const SHAPE = { complex: { w: 660, h: 620, xEnd: 2 * Math.PI },
                    real:    { w: 900, h: 620, xEnd: 3 } };

    const cfg = {
        mode: 'complex', dx: 0.1, xEnd: SHAPE.complex.xEnd, seconds: 6, fps: 20,
        w: SHAPE.complex.w, h: SHAPE.complex.h, scale: 1.5, fixed: true, hold: 0.8,
        theme: (typeof currentTheme === 'function' ? currentTheme() : 'light')
    };

    const sum = el('p', 'gifx-sum');
    const refresh = () => {
        const p = schedule(cfg);
        sum.textContent = w.summary(p.frames, p.steps, (p.steps / (p.frames - 1)).toFixed(1))
                        + ' · ' + ((p.frames * p.delay + cfg.hold * 100) / 100).toFixed(1) + ' s';
    };

    const modeRow = field(w.mode, pills(
        [{ label: w.real, value: 'real' }, { label: w.complex, value: 'complex' }],
        cfg.mode,
        v => {
            cfg.mode = v;
            const shape = SHAPE[v];
            cfg.xEnd = shape.xEnd; cfg.w = shape.w; cfg.h = shape.h;
            xEnd.value = cfg.xEnd.toFixed(3);
            pw.value = String(cfg.w); ph.value = String(cfg.h);
            refresh();
        }));
    form.appendChild(modeRow);

    const dx = number(cfg.dx, 0.001, 0.5, 0.001);
    const xEnd = number(cfg.xEnd.toFixed(3), 0.1, 200, 0.1);
    const pair1 = el('div', 'gifx-pair');
    pair1.appendChild(field(w.dx, dx));
    pair1.appendChild(field(w.xEnd, xEnd));
    form.appendChild(pair1);

    const secs = number(cfg.seconds, 1, 60, 0.5);
    const fps = select([10, 15, 20, 25].map(v => ({ label: String(v), value: v })), cfg.fps);
    const pair2 = el('div', 'gifx-pair');
    pair2.appendChild(field(w.seconds + ' (s)', secs));
    pair2.appendChild(field(w.fps, fps));
    form.appendChild(pair2);

    const pw = number(cfg.w, 200, 2000, 10);
    const ph = number(cfg.h, 200, 2000, 10);
    const pair3 = el('div', 'gifx-pair');
    pair3.appendChild(field(w.size + ' (px)', pw));
    pair3.appendChild(field(' ', ph));
    form.appendChild(pair3);

    const sc = select([{ label: '1×', value: 1 }, { label: '1.5×', value: 1.5 }, { label: '2×', value: 2 }], cfg.scale);
    const hold = number(cfg.hold, 0, 5, 0.1);
    const pair4 = el('div', 'gifx-pair');
    pair4.appendChild(field(w.scale, sc));
    pair4.appendChild(field(w.hold + ' (s)', hold));
    form.appendChild(pair4);

    form.appendChild(field(w.frame, pills(
        [{ label: w.fixed, value: 'fixed' }, { label: w.follow, value: 'follow' }],
        'fixed', v => { cfg.fixed = v === 'fixed'; })));

    form.appendChild(field(w.theme, pills(
        [{ label: w.light, value: 'light' }, { label: w.dark, value: 'dark' }],
        cfg.theme, v => { cfg.theme = v; })));

    form.appendChild(sum);

    const go = el('div', 'gifx-go');
    const btnPreview = el('button', 'btn', w.preview);
    const btnMake = el('button', 'btn btn-primary', w.make);
    go.appendChild(btnPreview);
    go.appendChild(btnMake);
    form.appendChild(go);

    const bar = el('div', 'gifx-bar');
    const fill = el('i');
    bar.appendChild(fill);
    form.appendChild(bar);
    const status = el('p', 'gifx-status');
    form.appendChild(status);
    form.appendChild(el('p', 'gifx-note', w.note));

    const stageBox = el('div', 'gifx-stage');
    view.appendChild(stageBox);

    body.appendChild(form);
    body.appendChild(view);
    panel.appendChild(body);
    document.body.appendChild(panel);

    /* --- reading the form --- */
    const clamp = (v, lo, hi, dflt) => {
        const n = Number(v);
        return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
    };
    function read() {
        cfg.dx = clamp(dx.value, 0.001, 0.5, 0.1);
        cfg.xEnd = clamp(xEnd.value, 0.1, 200, 6.283);
        cfg.seconds = clamp(secs.value, 1, 60, 6);
        cfg.fps = Number(fps.value);
        cfg.w = Math.round(clamp(pw.value, 200, 2000, 900));
        cfg.h = Math.round(clamp(ph.value, 200, 2000, 620));
        cfg.scale = Number(sc.value);
        cfg.hold = clamp(hold.value, 0, 5, 0.8);
        refresh();
        return cfg;
    }
    [dx, xEnd, secs, fps, pw, ph, sc, hold].forEach(n => n.addEventListener('input', read));
    refresh();

    /* The theme is the app's own, so it is set for the length of the job and
       put back: `palette()` reads it off the body like everything else. */
    function withTheme(theme, fn) {
        const was = currentTheme();
        if (was !== theme) applyTheme(theme);
        try { return fn(); } finally { if (was !== theme) applyTheme(was); }
    }

    const report = (text, frac) => { status.textContent = text; fill.style.width = (frac * 100) + '%'; };

    btnPreview.addEventListener('click', () => {
        read();
        withTheme(cfg.theme, () => {
            const plan = schedule(cfg);
            const stage = stage_(cfg);
            prepare(stage, plan.steps);
            frameAt(stage, plan.steps);
            stageBox.innerHTML = '';
            const shown = el('canvas');
            shown.width = cfg.w; shown.height = cfg.h;
            shown.getContext('2d').drawImage(stage.g.canvas, 0, 0);
            stageBox.appendChild(shown);
        });
        draw();
        report('', 0);
    });

    btnMake.addEventListener('click', async () => {
        read();
        btnMake.disabled = btnPreview.disabled = true;
        stageBox.innerHTML = '';
        try {
            const out = await withTheme(cfg.theme, () => generate(cfg, report));
            const mb = out.blob.size / 1048576;
            const url = URL.createObjectURL(out.blob);
            const img = el('img');
            img.src = url;
            stageBox.appendChild(img);

            const name = 'exp-' + cfg.mode + '-dx' + cfg.dx + '-x' + cfg.xEnd.toFixed(2) + '.gif';
            const a = el('a', 'btn btn-primary', w.download + ' · ' + mb.toFixed(2) + ' MB');
            a.href = url;
            a.download = name;
            a.style.display = 'inline-block';
            a.style.marginTop = '10px';
            a.style.textDecoration = 'none';
            stageBox.appendChild(a);

            status.textContent = w.done + ' · ' + out.plan.frames + ' · ' + out.colours + ' colours';
            status.className = 'gifx-status' + (mb > 6 ? ' gifx-warn' : '');
            if (mb > 6) status.textContent = w.heavy;
            fill.style.width = '100%';
        } catch (e) {
            status.textContent = String(e && e.message || e);
            status.className = 'gifx-status gifx-warn';
        } finally {
            btnMake.disabled = btnPreview.disabled = false;
            draw();
        }
    });

    /* Exposed for the tests, which drive a job without touching the panel. */
    window.gifx = { generate: generate, schedule: schedule, read: read, cfg: cfg,
                    withTheme: withTheme, stage: stage_, prepare: prepare, frameAt: frameAt };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open);
else open();

})();
