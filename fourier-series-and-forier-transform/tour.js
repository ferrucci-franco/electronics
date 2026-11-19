/* Animations (🎬 button): short demonstrations of a few FFT phenomena (spectral leakage, windows, a sine
 * hidden in noise, resolution, peak / RMS / dB), played by the real app. A script sets the controls with a
 * drawn pointer, moves the axes like a camera, draws notes on the plots and shows one caption per step in a
 * bar under the plots. Each demonstration loops; ‹ › move by step, ⏸ pauses, Esc leaves and gives the app
 * back as it was; "Explore" leaves and keeps the settings of the step on screen. The chapters are in
 * tour-chapters.js. The help text is opened from the menu (? button). */
(function () {
  'use strict';
  const App = window.FourierApp;
  const CHAPTERS = window.FourierTourChapters || [];
  if (!App) return;

  const ABORT = { abort: true };
  const lang = () => App.lang();
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[lang()] || o.en || ''));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const NARROW = window.matchMedia('(max-width: 699px), (max-height: 520px)');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  const TX = {
    button: { en: 'Animations', fr: 'Animations', es: 'Animaciones' },
    title: { en: 'Animations', fr: 'Animations', es: 'Animaciones' },
    intro: {
      en: 'Short demonstrations played by the app itself. Choose a topic: the app sets itself up, step by step, and explains what to look at.',
      fr: 'De courtes démonstrations jouées par l’application elle-même. Choisissez un thème : l’application se règle pas à pas et dit quoi regarder.',
      es: 'Demostraciones cortas hechas con la propia aplicación. Elige un tema: la aplicación se configura paso a paso y dice qué mirar.'
    },
    help: { en: 'How to use this app', fr: 'Comment utiliser cette app', es: 'Cómo usar esta app' },
    close: { en: 'Close', fr: 'Fermer', es: 'Cerrar' },
    topics: { en: 'Topics', fr: 'Thèmes', es: 'Temas' },
    prev: { en: 'Previous step', fr: 'Étape précédente', es: 'Paso anterior' },
    next: { en: 'Next step', fr: 'Étape suivante', es: 'Paso siguiente' },
    pause: { en: 'Pause', fr: 'Pause', es: 'Pausa' },
    play: { en: 'Play', fr: 'Lecture', es: 'Reproducir' },
    step: { en: 'Step', fr: 'Étape', es: 'Paso' },
    explore: { en: 'Explore', fr: 'Explorer', es: 'Explorar' },
    exploreTitle: {
      en: 'Leave the animation and keep these settings',
      fr: 'Quitter l’animation en gardant ces réglages',
      es: 'Salir de la animación y conservar esta configuración'
    },
    exit: { en: 'Leave (the app goes back to how it was)', fr: 'Quitter (l’application revient à son état d’avant)', es: 'Salir (la aplicación vuelve a como estaba)' }
  };

  // Notes drawn on the plots: dark text on a yellow label, readable in both themes.
  const INK = { bg: '#fff3a8', border: '#c99a06', text: '#1f2328', line: '#e0a800' };

  /* ---------------- formatting ---------------- */
  function num(value, digits = 3) {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    // significant digits, without trailing zeros
    const decimals = abs === 0 ? 0 : Math.max(0, Math.min(6, digits - 1 - Math.floor(Math.log10(abs))));
    return new Intl.NumberFormat(lang(), { maximumFractionDigits: decimals, useGrouping: abs >= 10000 }).format(value).replace('-', '−');
  }
  const unit = (value, u, digits) => `${num(value, digits)} ${u}`;

  // $…$ is TeX (KaTeX), the rest is HTML written in the chapters.
  function richText(text) {
    return String(text).split(/(\$[^$]+\$)/g).map((part) => {
      if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
        const tex = part.slice(1, -1);
        return window.katex ? window.katex.renderToString(tex, { throwOnError: false }) : esc(tex);
      }
      return part;
    }).join('');
  }
  // the same for the notes on the plots: Plotly only knows a little HTML, so the TeX of a note
  // is written with <i>, <sub> and <sup> (enough for T_0, V_\mathrm{eff}, \Delta f…)
  const SYMBOLS = { '\\Delta': 'Δ', '\\delta': 'δ', '\\pi': 'π', '\\times': '×', '\\approx': '≈', '\\sqrt': '√', '\\,': ' ' };
  function texToPlotly(tex) {
    let s = tex;
    Object.keys(SYMBOLS).forEach((k) => { s = s.split(k).join(SYMBOLS[k]); });
    s = s.replace(/_\\mathrm\{([^}]*)\}/g, '<sub>$1</sub>');
    s = s.replace(/\\mathrm\{([^}]*)\}/g, '$1');
    s = s.replace(/_\{([^}]*)\}|_(\S)/g, (m, a, b) => `<sub>${a || b}</sub>`);
    s = s.replace(/\^\{([^}]*)\}|\^(\S)/g, (m, a, b) => `<sup>${a || b}</sup>`);
    s = s.replace(/[{}\\]/g, '');
    // variables in italics, subscripts upright
    return s.replace(/(^|[^<\/a-z])([A-Za-z])(?=<sub>|\b)/g, (m, pre, v) => `${pre}<i>${v}</i>`);
  }
  function plotText(text) {
    return String(text).split(/(\$[^$]+\$)/g).map((part) =>
      (part.length > 2 && part.startsWith('$') && part.endsWith('$') ? texToPlotly(part.slice(1, -1)) : part)).join('');
  }
  const plainLength = (text) => String(text).replace(/\$[^$]+\$/g, 'xxxx').replace(/<[^>]+>/g, '').length;

  /* ---------------- the demonstration being played ---------------- */
  function Run(tour, index, target) {
    this.tour = tour;
    this.index = index;
    this.chapter = CHAPTERS[index];
    this.target = target || 0;
    this.step = -1;
    this.dead = false;
    this.fast = false;
    this.overlays = {};
  }
  const R = Run.prototype;
  R.L = L;
  R.num = num;
  R.unit = unit;
  R.hz = (v, d) => unit(v, 'Hz', d);
  R.volt = (v, d) => unit(v, 'V', d);
  R.ms = (seconds, d) => unit(seconds * 1000, 'ms', d);
  R.lang = lang;
  R.narrow = () => NARROW.matches;

  R.check = function () { if (this.dead) throw ABORT; };
  R.frame = function () { return new Promise((r) => requestAnimationFrame(r)).then(() => this.check()); };
  R.wait = async function (ms) {
    this.check();
    if (this.fast) return;
    let elapsed = 0;
    let last = performance.now();
    while (elapsed < ms) {
      await this.frame();
      const now = performance.now();
      if (!this.tour.paused) elapsed += Math.min(100, now - last);
      last = now;
    }
  };
  R.whilePaused = async function () { while (this.tour.paused && !this.fast) await this.frame(); };

  // until the plots are drawn with the current settings
  R.idle = async function () {
    const t0 = performance.now();
    let calm = 0;
    while (calm < 2) {
      await this.frame();
      calm = App.isIdle() ? calm + 1 : 0;
      if (performance.now() - t0 > 15000) break;
    }
  };

  /* --- controls --- */
  R.el = (id) => document.getElementById(id);

  function setControl(el, value) {
    if (el.type === 'checkbox') el.checked = !!value;
    else if (el.type === 'radio') el.checked = true;
    else el.value = String(value);
  }

  // all the settings at once, without events (start of a chapter)
  R.config = async function (settings) {
    Object.keys(settings).forEach((id) => {
      const el = this.el(id);
      if (el) setControl(el, settings[id]);
    });
    App.restoreControls(App.captureControls());   // shows / hides the dependent groups
    App.updatePlots();
    await this.idle();
  };

  function controlLabel(el) {
    if (el.type === 'radio') {
      const group = el.closest('.form-group');
      const title = group && group.querySelector('label:not([for])');
      return title ? title.textContent.trim() : '';
    }
    const label = document.querySelector(`label[for="${el.id}"]`);
    return label ? label.textContent.trim() : el.id;
  }
  function controlValue(el, value) {
    if (el.type === 'checkbox') return value ? '✓' : '✗';
    if (el.type === 'radio') {
      const label = document.querySelector(`label[for="${el.id}"]`);
      return label ? label.textContent.trim() : '';
    }
    if (el.tagName === 'SELECT') {
      const option = Array.from(el.options).find((o) => o.value === String(value));
      return option ? option.textContent.trim() : String(value);
    }
    return num(parseFloat(value), 6);
  }
  function currentValue(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') return el.checked ? el.value : null;
    return el.value;
  }

  // brings a control into view in the settings column (wide layout only)
  R.reveal = async function (el) {
    if (this.narrow()) return;
    const sidebar = document.querySelector('.sidebar');
    const target = el.closest('.form-group, .checkbox-group, .radio-option') || el;
    const box = target.getBoundingClientRect();
    const side = sidebar.getBoundingClientRect();
    if (box.top >= side.top + 20 && box.bottom <= side.bottom - 20) return;
    const top = sidebar.scrollTop + box.top - side.top - side.height * 0.35;
    if (this.fast || REDUCED.matches) {
      sidebar.scrollTop = top;
      return;
    }
    sidebar.scrollTo({ top, behavior: 'smooth' });
    await this.wait(450);
  };

  // pointer flies to the control and "clicks" it
  R.point = async function (el) {
    if (this.fast || this.narrow()) return;
    const pointer = this.tour.pointer;
    const box = el.getBoundingClientRect();
    const tx = box.left + Math.min(box.width * 0.7, 160);
    const ty = box.top + box.height * 0.55;
    pointer.hidden = false;
    const x0 = this.tour.px;
    const y0 = this.tour.py;
    const dist = Math.hypot(tx - x0, ty - y0);
    const ms = REDUCED.matches ? 0 : Math.min(750, 250 + dist * 0.6);
    const t0 = performance.now();
    for (;;) {
      await this.whilePaused();
      const u = ms ? Math.min(1, (performance.now() - t0) / ms) : 1;
      const e = ease(u);
      this.tour.movePointer(x0 + (tx - x0) * e, y0 + (ty - y0) * e);
      if (u >= 1) break;
      await this.frame();
    }
    pointer.classList.add('down');
    this.tour.ripple(tx, ty);
    await this.wait(160);
    pointer.classList.remove('down');
  };

  R.flash = function (el) {
    const group = el.closest('.form-group, .checkbox-group') || el;
    group.classList.remove('tour-flash');
    void group.offsetWidth;
    group.classList.add('tour-flash');
    clearTimeout(group._tourFlash);
    group._tourFlash = setTimeout(() => group.classList.remove('tour-flash'), 1600);
  };

  // one setting, as a person would change it; the chip under the caption says what changed
  R.set = async function (id, value, opts = {}) {
    this.check();
    const el = this.el(id);
    if (!el) return;
    const before = opts.from !== undefined ? opts.from : currentValue(el);
    if (!opts.quick) {
      await this.reveal(el);
      await this.point(el);
    }
    setControl(el, value);
    this.flash(el);
    this.tour.chip(controlLabel(el),
      el.type === 'number' ? `${controlValue(el, before)} → ${controlValue(el, value)}` : controlValue(el, value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    App.updatePlots();
    await this.idle();
  };

  // several values in a row (10 → 10,1 → … → 10,5): the spectrum changes under the eyes
  R.sweep = async function (id, values, ms = 700) {
    const el = this.el(id);
    const from = el.value;
    if (this.fast) {
      await this.set(id, values[values.length - 1], { quick: true, from });
      return;
    }
    await this.reveal(el);
    await this.point(el);
    for (const value of values) {
      await this.set(id, value, { quick: true, from });
      await this.wait(ms);
    }
  };

  /* --- plots --- */
  R.gd = (plotId) => document.getElementById(plotId);

  R.focus = async function (plotId) {
    document.querySelectorAll('.plot-container.tour-focus').forEach((p) => p.classList.remove('tour-focus'));
    const gd = this.gd(plotId);
    const box = gd && gd.closest('.plot-container');
    if (!box) return;
    box.classList.add('tour-focus');
    if (this.narrow()) {
      const top = window.scrollY + box.getBoundingClientRect().top - 10;
      window.scrollTo({ top, behavior: this.fast || REDUCED.matches ? 'auto' : 'smooth' });
      if (!this.fast) await this.wait(450);
    }
  };

  // the camera: axis ranges, animated ('auto' fits both axes)
  R.view = async function (plotId, range, ms = 700) {
    this.check();
    const gd = this.gd(plotId);
    if (!gd || !gd._fullLayout) return;
    if (range === 'auto') {
      await Plotly.relayout(gd, { 'xaxis.autorange': true, 'yaxis.autorange': true });
      return;
    }
    const from = {
      x: gd._fullLayout.xaxis.range.slice(),
      y: gd._fullLayout.yaxis.range.slice()
    };
    const to = { x: range.x || from.x, y: range.y || from.y };
    const apply = (e) => {
      const update = {};
      ['x', 'y'].forEach((axis) => {
        update[`${axis}axis.range[0]`] = from[axis][0] + (to[axis][0] - from[axis][0]) * e;
        update[`${axis}axis.range[1]`] = from[axis][1] + (to[axis][1] - from[axis][1]) * e;
      });
      return Plotly.relayout(gd, update);
    };
    if (this.fast || REDUCED.matches || !ms) {
      await apply(1);
      return;
    }
    const t0 = performance.now();
    for (;;) {
      await this.whilePaused();
      const u = Math.min(1, (performance.now() - t0) / ms);
      await apply(ease(u));
      if (u >= 1) break;
      await this.frame();
    }
  };

  // the bars of the spectrum as drawn (V, V rms or dB, whatever is on screen)
  R.bars = function () {
    const gd = this.gd('plot2');
    const trace = gd && gd.data && gd.data[0];
    if (!trace) return { x: [], y: [] };
    return { x: Array.from(trace.x), y: Array.from(trace.y) };
  };
  R.bar = function (f) {
    const { x, y } = this.bars();
    let best = 0;
    x.forEach((xi, i) => { if (Math.abs(xi - f) < Math.abs(x[best] - f)) best = i; });
    return { x: x[best], y: y[best] };
  };
  R.peak = function (f0, f1) {
    const { x, y } = this.bars();
    let best = null;
    x.forEach((xi, i) => {
      if (xi >= f0 && xi <= f1 && y[i] != null && (best === null || y[i] > y[best])) best = i;
    });
    return best === null ? { x: NaN, y: NaN } : { x: x[best], y: y[best] };
  };
  // the highest bars, highest first
  R.top = function (count, f0 = -Infinity, f1 = Infinity) {
    const { x, y } = this.bars();
    return x.map((xi, i) => ({ x: xi, y: y[i] }))
      .filter((b) => b.y != null && b.x >= f0 && b.x <= f1)
      .sort((a, b) => b.y - a.y)
      .slice(0, count);
  };
  R.df = function () {
    const { x } = this.bars();
    return x.length > 1 ? x[1] - x[0] : NaN;
  };
  R.tobs = function () { return 1 / this.df(); };

  /* --- notes on the plots --- */
  // label with an arrow to a point of the data
  R.note = function (x, y, text, opts = {}) {
    return {
      annotations: [{
        x, y, xref: 'x', yref: 'y',
        text: plotText(text),
        showarrow: opts.arrow !== false,
        arrowhead: 2, arrowsize: 1, arrowwidth: 1.6, arrowcolor: INK.line,
        ax: opts.ax !== undefined ? opts.ax : 0,
        ay: opts.ay !== undefined ? opts.ay : -38,
        xanchor: opts.xanchor || 'center',
        yanchor: opts.yanchor || 'auto',
        bgcolor: INK.bg, bordercolor: INK.border, borderwidth: 1, borderpad: 4,
        font: { color: INK.text, size: opts.size || 13 }
      }]
    };
  };
  // label at a place of the plot area, without arrow (paper coordinates, 0..1)
  R.label = function (px, py, text, opts = {}) {
    return {
      annotations: [{
        x: px, y: py, xref: 'paper', yref: 'paper', showarrow: false,
        xanchor: opts.xanchor || 'left', yanchor: opts.yanchor || 'top', align: 'left',
        text: plotText(text),
        bgcolor: INK.bg, bordercolor: INK.border, borderwidth: 1, borderpad: 5,
        font: { color: INK.text, size: opts.size || 13 }
      }]
    };
  };
  // dashed vertical line at x, with its label near the top
  R.vline = function (x, text, opts = {}) {
    const out = {
      // top: only a short mark at the top of the plot, so as not to cover a bar standing at x
      shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: x, x1: x, y0: opts.top ? 0.84 : 0, y1: 1, line: { color: INK.line, width: 2, dash: opts.top ? 'solid' : 'dash' } }],
      annotations: []
    };
    if (text) {
      out.annotations.push({
        x, y: opts.y !== undefined ? opts.y : 0.97, xref: 'x', yref: 'paper', showarrow: false,
        xanchor: opts.xanchor || 'left', yanchor: 'top', xshift: opts.xanchor === 'right' ? -4 : 4,
        text: plotText(text), bgcolor: INK.bg, bordercolor: INK.border, borderwidth: 1, borderpad: 3,
        font: { color: INK.text, size: 12 }
      });
    }
    return out;
  };
  R.hline = function (y, text, opts = {}) {
    const out = {
      // x1 < 1 stops the line before the purple FFT box, top right of the spectrum
      shapes: [{ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: opts.x1 !== undefined ? opts.x1 : 1, y0: y, y1: y, line: { color: INK.line, width: 2, dash: 'dash' } }],
      annotations: []
    };
    if (text) {
      out.annotations.push({
        x: opts.x !== undefined ? opts.x : 0.01, y, xref: 'paper', yref: 'y', showarrow: false,
        xanchor: opts.xanchor || 'left', yanchor: opts.yanchor || 'bottom', yshift: opts.yanchor === 'top' ? -3 : 3,
        text: plotText(text), bgcolor: INK.bg, bordercolor: INK.border, borderwidth: 1, borderpad: 3,
        font: { color: INK.text, size: 12 }
      });
    }
    return out;
  };
  // |←— text —→| between x0 and x1 at height y
  R.span = function (x0, x1, y, text, opts = {}) {
    const tick = opts.tick || 0;
    const line = { color: INK.line, width: 2.2 };
    const shapes = [{ type: 'line', xref: 'x', yref: 'y', x0, x1, y0: y, y1: y, line }];
    if (tick) {
      shapes.push({ type: 'line', xref: 'x', yref: 'y', x0, x1: x0, y0: y - tick, y1: y + tick, line });
      shapes.push({ type: 'line', xref: 'x', yref: 'y', x0: x1, x1, y0: y - tick, y1: y + tick, line });
    }
    return {
      shapes,
      annotations: text ? [{
        x: (x0 + x1) / 2, y, xref: 'x', yref: 'y', showarrow: false,
        yanchor: opts.below ? 'top' : 'bottom', yshift: opts.below ? -6 : 6,
        xanchor: opts.xanchor || 'center',
        text: plotText(text), bgcolor: INK.bg, bordercolor: INK.border, borderwidth: 1, borderpad: 3,
        font: { color: INK.text, size: 12 }
      }] : []
    };
  };
  // a curve given by its points (e.g. the sine hidden in the noise)
  R.curve = function (xs, ys, opts = {}) {
    const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x},${ys[i]}`).join(' ');
    return { shapes: [{ type: 'path', xref: 'x', yref: 'y', path, line: { color: opts.color || INK.line, width: opts.width || 2.4, dash: opts.dash || 'dot' } }] };
  };

  // replaces the notes of a plot
  R.draw = async function (plotId, ...parts) {
    this.check();
    const overlay = { shapes: [], annotations: [] };
    parts.filter(Boolean).forEach((p) => {
      overlay.shapes.push(...(p.shapes || []));
      overlay.annotations.push(...(p.annotations || []));
    });
    this.overlays[plotId] = overlay;
    await App.setOverlay(plotId, overlay);
    if (this.avoidBox(plotId, overlay)) await App.setOverlay(plotId, overlay);
  };

  // Keeps the notes off the purple FFT box (top right of the spectrum, wider on a phone): lines stop
  // before it, labels move below it or to its left. Measured on the drawn plot, so it fits any width.
  R.avoidBox = function (plotId, overlay) {
    const gd = this.gd(plotId);
    const full = gd && gd._fullLayout;
    const total = (full && full.annotations) ? full.annotations.length : 0;
    const base = total - overlay.annotations.length;
    if (!full || base < 1) return false;
    const boxEl = gd.querySelector('.annotation[data-index="0"]');
    if (!boxEl) return false;
    const gap = 6;
    const box = boxEl.getBoundingClientRect();
    const page = gd.getBoundingClientRect();
    const left = page.left + full.xaxis._offset;
    const top = page.top + full.yaxis._offset;
    const w = full.xaxis._length;
    const h = full.yaxis._length;
    const toPaperX = (px) => (px - left) / w;
    const toPaperY = (py) => 1 - (py - top) / h;
    const boxBottom = toPaperY(box.bottom + gap);
    const hits = (r) => r.right > box.left - gap && r.left < box.right + gap && r.bottom > box.top - gap && r.top < box.bottom + gap;
    let changed = false;

    overlay.shapes.forEach((shape) => {
      if (shape.type !== 'line') return;
      if (shape.xref === 'paper' && shape.yref === 'y') {   // horizontal line
        const py = top + full.yaxis.l2p(shape.y0);
        const x1 = left + shape.x1 * w;
        if (py > box.top - gap && py < box.bottom + gap && x1 > box.left - gap) {
          shape.x1 = Math.max(shape.x0, toPaperX(box.left - gap));
          changed = true;
        }
      } else if (shape.xref === 'x' && shape.yref === 'paper') {   // vertical line or top mark
        const px = left + full.xaxis.l2p(shape.x0);
        if (px > box.left - gap && px < box.right + gap && shape.y1 > boxBottom) {
          if (shape.y0 > 0.5) {
            const length = shape.y1 - shape.y0;
            shape.y1 = boxBottom;
            shape.y0 = boxBottom - length;
          } else {
            shape.y1 = boxBottom;
          }
          shape._moved = true;
          changed = true;
        }
      }
    });

    overlay.annotations.forEach((note, i) => {
      const el = gd.querySelector(`.annotation[data-index="${base + i}"]`);
      if (!el || !hits(el.getBoundingClientRect())) return;
      if (note.yref === 'paper') {
        note.y = Math.min(note.y, boxBottom);
        note.yanchor = 'top';
      } else if (note.showarrow) {
        note.ax = -Math.max(40, Math.abs(note.ax || 0) + 30);
        note.xanchor = 'right';
      }
      changed = true;
    });
    return changed;
  };
  R.clear = async function (...plotIds) {
    const ids = plotIds.length ? plotIds : ['plot1', 'plot2'];
    for (const id of ids) {
      delete this.overlays[id];
      await App.setOverlay(id, null);
    }
  };

  /* --- caption --- */
  R.say = function (text) {
    this.check();
    this.caption = L(text);
    this.tour.caption(this.caption);
  };
  // reading time of the caption on screen
  R.readTime = function () {
    const n = plainLength(this.caption || '');
    return Math.max(3500, Math.min(13000, 1600 + n * 58));
  };

  // the chapter: setup, then its steps; the steps before `target` run instantly
  R.go = async function () {
    const chapter = this.chapter;
    try {
      for (;;) {
        this.fast = true;
        this.step = -1;
        this.tour.renderDots(this);
        this.tour.chip(null);
        App.setNoiseRandom(seeded(chapter.seed || 1));
        await this.clear();
        await chapter.setup(this);
        for (let k = 0; k < chapter.steps.length; k++) {
          this.fast = k < this.target;
          this.step = k;
          this.tour.renderDots(this);
          if (!this.fast) this.tour.chip(null);
          this.hold = null;
          await chapter.steps[k](this);
          this.shown = k;
          if (!this.fast) await this.wait(this.hold || this.readTime());
        }
        this.target = 0;
        await this.wait(1800);
      }
    } catch (error) {
      if (error !== ABORT) {
        console.error(error);
        this.tour.caption('⚠️ ' + esc(error.message || error));
      }
    }
  };

  // small seeded generator (mulberry32): the same noise at every run
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- the user interface ---------------- */
  const Tour = {
    active: false,
    paused: false,
    run: null,
    saved: null,
    px: 0,
    py: 0,

    build() {
      const button = document.getElementById('tour-btn');
      if (button) button.addEventListener('click', () => this.openMenu());

      // menu
      this.menu = document.createElement('div');
      this.menu.className = 'help-backdrop tour-menu';
      this.menu.hidden = true;
      this.menu.innerHTML = `
        <div class="help-modal" role="dialog" aria-modal="true" aria-labelledby="tour-menu-title">
          <div class="help-modal-header">
            <h2 id="tour-menu-title"></h2>
            <div class="tour-menu-actions">
              <button type="button" class="icon-btn tour-help-btn" data-act="help"><span aria-hidden="true">❓</span></button>
              <button type="button" class="help-modal-close" data-act="close">×</button>
            </div>
          </div>
          <div class="help-modal-body">
            <p class="tour-intro"></p>
            <div class="tour-list"></div>
          </div>
        </div>`;
      document.body.appendChild(this.menu);
      this.menu.addEventListener('click', (event) => {
        const act = event.target.closest('[data-act]');
        if (event.target === this.menu || (act && act.dataset.act === 'close')) this.closeMenu();
        else if (act && act.dataset.act === 'help') {
          this.closeMenu(true);
          if (this.active) this.exit(false);
          App.openHelp();
        } else if (act && act.dataset.act === 'chapter') {
          this.closeMenu(true);
          this.start(parseInt(act.dataset.index, 10));
        }
      });

      // shield: the app does not take clicks while an animation plays it
      this.shield = document.createElement('div');
      this.shield.className = 'tour-shield';
      this.shield.hidden = true;
      document.body.appendChild(this.shield);

      // bar: controls, caption and the chip of the last setting changed
      this.bar = document.createElement('div');
      this.bar.className = 'tour-bar';
      this.bar.hidden = true;
      this.bar.innerHTML = `
        <div class="tour-head">
          <span class="tour-title"></span>
          <div class="tour-dots"></div>
          <div class="tour-buttons">
            <button type="button" class="tour-btn" data-act="menu">☰</button>
            <button type="button" class="tour-btn" data-act="prev">‹</button>
            <button type="button" class="tour-btn" data-act="pause">⏸</button>
            <button type="button" class="tour-btn" data-act="next">›</button>
            <button type="button" class="tour-btn tour-explore" data-act="explore"></button>
            <button type="button" class="tour-btn" data-act="exit">✕</button>
          </div>
        </div>
        <div class="tour-caption" aria-live="polite">
          <div class="tour-text"></div>
          <div class="tour-chip" hidden></div>
        </div>`;
      document.body.appendChild(this.bar);
      this.bar.addEventListener('click', (event) => {
        const act = event.target.closest('[data-act]');
        if (!act) return;
        const a = act.dataset.act;
        if (a === 'menu') this.openMenu();
        else if (a === 'prev') this.goStep(-1);
        else if (a === 'next') this.goStep(1);
        else if (a === 'pause') this.setPaused(!this.paused);
        else if (a === 'explore') this.exit(true);
        else if (a === 'exit') this.exit(false);
        else if (a === 'dot') this.play(this.run.index, parseInt(act.dataset.step, 10));
      });

      this.pointer = document.createElement('div');
      this.pointer.className = 'tour-pointer';
      this.pointer.hidden = true;
      this.pointer.innerHTML = '<svg viewBox="0 0 26 30" width="26" height="30" aria-hidden="true"><path d="M3 2 L3 24 L9 18.5 L13 27.5 L17 25.7 L13 17 L21 17 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      document.body.appendChild(this.pointer);

      // the plots keep the room above the bar; Plotly follows window resizes
      if (window.ResizeObserver) {
        let lastHeight = 0;
        new ResizeObserver(() => {
          const height = this.bar.offsetHeight;
          if (!height || Math.abs(height - lastHeight) < 2) return;
          lastHeight = height;
          document.documentElement.style.setProperty('--tour-h', `${height}px`);
          window.dispatchEvent(new Event('resize'));
        }).observe(this.bar);
      }

      document.addEventListener('keydown', (event) => this.onKey(event), true);
      this.updateLanguage();
    },

    updateLanguage() {
      if (!this.menu) return;
      const button = document.getElementById('tour-btn');
      if (button) {
        button.title = L(TX.button);
        button.setAttribute('aria-label', L(TX.button));
      }
      this.menu.querySelector('#tour-menu-title').textContent = L(TX.title);
      this.menu.querySelector('.tour-intro').textContent = L(TX.intro);
      const help = this.menu.querySelector('[data-act="help"]');
      help.title = L(TX.help);
      help.setAttribute('aria-label', L(TX.help));
      this.menu.querySelector('[data-act="close"]').setAttribute('aria-label', L(TX.close));
      this.menu.querySelector('.tour-list').innerHTML = CHAPTERS.map((c, i) => `
        <button type="button" class="tour-item" data-act="chapter" data-index="${i}">
          <span class="tour-item-icon" aria-hidden="true">${c.icon}</span>
          <span class="tour-item-text"><b>${esc(L(c.t))}</b><span>${richText(L(c.d))}</span></span>
        </button>`).join('');
      const titles = { menu: TX.topics, prev: TX.prev, next: TX.next, exit: TX.exit, explore: TX.exploreTitle };
      Object.keys(titles).forEach((a) => {
        const b = this.bar.querySelector(`[data-act="${a}"]`);
        b.title = L(titles[a]);
        b.setAttribute('aria-label', L(titles[a]));
      });
      this.bar.querySelector('.tour-explore').textContent = L(TX.explore);
      this.updatePauseButton();
      if (this.run) this.renderDots(this.run);
    },

    openMenu() {
      this.updateLanguage();
      this.menuWasPaused = this.paused;
      if (this.active) this.setPaused(true);
      this.menu.hidden = false;
      const first = this.menu.querySelector('.tour-item');
      if (first) first.focus();
    },
    closeMenu(choosing) {
      this.menu.hidden = true;
      if (this.active && !choosing) this.setPaused(!!this.menuWasPaused);
    },

    start(index) {
      if (!this.active) {
        this.saved = App.captureControls();
        this.active = true;
        App.setDriven(true);
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        document.body.classList.add('tour-on');
        this.shield.hidden = false;
        this.bar.hidden = false;
        const box = document.querySelector('.main-content').getBoundingClientRect();
        this.movePointer(box.left + box.width * 0.4, box.top + box.height * 0.4);
        window.dispatchEvent(new Event('resize'));   // the plots take the room left above the bar
      }
      this.play(index, 0);
    },

    play(index, target) {
      if (this.run) this.run.dead = true;
      this.setPaused(false);
      const chapter = CHAPTERS[index];
      this.bar.querySelector('.tour-title').innerHTML = `<span aria-hidden="true">${chapter.icon}</span> ${esc(L(chapter.t))}`;
      this.run = new Run(this, index, Math.max(0, Math.min(target, chapter.steps.length - 1)));
      this.run.go();
    },

    goStep(delta) {
      if (!this.run) return;
      const count = this.run.chapter.steps.length;
      const current = Math.max(0, this.run.step);
      this.play(this.run.index, (current + delta + count) % count);
    },

    setPaused(paused) {
      this.paused = paused;
      this.bar.classList.toggle('paused', paused);
      this.updatePauseButton();
    },
    updatePauseButton() {
      const b = this.bar && this.bar.querySelector('[data-act="pause"]');
      if (!b) return;
      b.textContent = this.paused ? '▶' : '⏸';
      b.title = L(this.paused ? TX.play : TX.pause);
      b.setAttribute('aria-label', b.title);
    },

    // keep: leave the settings of the animation (Explore); otherwise give back the user's
    async exit(keep) {
      if (!this.active) return;
      const run = this.run;
      if (run) run.dead = true;
      this.run = null;
      this.active = false;
      this.paused = false;
      this.shield.hidden = true;
      this.bar.hidden = true;
      this.pointer.hidden = true;
      document.body.classList.remove('tour-on');
      document.querySelectorAll('.tour-focus, .tour-flash').forEach((el) => el.classList.remove('tour-focus', 'tour-flash'));
      App.setNoiseRandom(null);
      App.setDriven(false);
      await App.setOverlay('plot1', null);
      await App.setOverlay('plot2', null);
      if (!keep && this.saved) {
        App.restoreControls(this.saved);
        ['plot1', 'plot2'].forEach((id) => {
          const gd = document.getElementById(id);
          if (gd && gd._fullLayout) Plotly.relayout(gd, { 'xaxis.autorange': true, 'yaxis.autorange': true });
        });
      }
      App.updatePlots();
      window.dispatchEvent(new Event('resize'));
      const button = document.getElementById('tour-btn');
      if (button) button.focus({ preventScroll: true });
    },

    onKey(event) {
      if (!this.menu.hidden && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.closeMenu();
        return;
      }
      if (!this.active || !this.menu.hidden) return;
      const keys = { Escape: () => this.exit(false), ' ': () => this.setPaused(!this.paused), ArrowLeft: () => this.goStep(-1), ArrowRight: () => this.goStep(1) };
      if (keys[event.key]) {
        event.preventDefault();
        event.stopPropagation();
        keys[event.key]();
      } else if (!event.target.closest || !event.target.closest('.tour-bar')) {
        // the app's fields are not for typing while it is driven
        event.preventDefault();
        event.stopPropagation();
      }
    },

    caption(html) {
      this.bar.querySelector('.tour-text').innerHTML = richText(html);
    },
    chip(label, value) {
      const chip = this.bar.querySelector('.tour-chip');
      if (!label) {
        chip.hidden = true;
        return;
      }
      chip.hidden = false;
      chip.innerHTML = `<span class="tour-chip-label">${esc(label)}</span> <b>${esc(value)}</b>`;
    },
    renderDots(run) {
      const dots = this.bar.querySelector('.tour-dots');
      const count = run.chapter.steps.length;
      dots.innerHTML = Array.from({ length: count }, (_, k) =>
        `<button type="button" class="tour-dot${k === run.step ? ' on' : ''}${k < run.step ? ' done' : ''}" data-act="dot" data-step="${k}" aria-label="${esc(L(TX.step))} ${k + 1}"></button>`).join('');
    },
    movePointer(x, y) {
      this.px = x;
      this.py = y;
      this.pointer.style.transform = `translate(${x}px, ${y}px)`;
    },
    ripple(x, y) {
      const r = document.createElement('div');
      r.className = 'tour-ripple';
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 600);
    }
  };

  Tour.build();
  window.FourierTour = Tour;
})();
