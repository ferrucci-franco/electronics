/* Guide (Help button): short animated demos of each feature.  The real simulator runs in a frame (demo mode:
 * nothing is read from or saved to the browser) and a script drives it with the same pointer and key events a
 * person would make, with a pointer (mouse) or a finger (touch layout) drawn over it, a camera that zooms on
 * the part that matters and one short caption per step.  Each demo loops, like an animated picture; the list
 * (or ‹ ›) chooses another one.  The chapters are in tour-chapters.js. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const I = DCS.i18n;
  const ABORT = { abort: true };
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[I.getLang()] || o.en || ''));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const el = (tag, attrs, html) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  };

  const TX = {
    title: { en: 'Guide', fr: 'Guide', es: 'Guía' },
    prev: { en: 'Previous', fr: 'Précédent', es: 'Anterior' },
    next: { en: 'Next', fr: 'Suivant', es: 'Siguiente' },
    pause: { en: 'Pause', fr: 'Pause', es: 'Pausa' },
    play: { en: 'Play', fr: 'Lecture', es: 'Reproducir' },
    replay: { en: 'Replay', fr: 'Revoir', es: 'Ver de nuevo' },
    ref: { en: 'Full reference', fr: 'Référence complète', es: 'Referencia completa' },
    close: { en: 'Close', fr: 'Fermer', es: 'Cerrar' },
    loading: { en: 'Loading…', fr: 'Chargement…', es: 'Cargando…' },
    chapters: { en: 'Topics', fr: 'Thèmes', es: 'Temas' }
  };

  /* ---------- the driver of one demo (one run of one chapter) ---------- */
  function Demo(tour, W, touch) {
    this.tour = tour; this.W = W; this.doc = W.document;
    this.app = W.DCS.app; this.C = W.DCS.comp;
    this.touch = touch;
    this.x = tour.VW * 0.62; this.y = tour.VH * 0.55;
    this.isDown = false; this.downEl = null; this.dead = false;
    this.inject();
  }
  const D = Demo.prototype;
  D.L = L;
  D.lang = () => I.getLang();
  D.check = function () { if (this.dead) throw ABORT; };
  D.frame = function () { return new Promise((r) => requestAnimationFrame(r)).then(() => this.check()); };
  // waits that stop while the demo is paused
  D.wait = async function (ms) {
    let tt = 0, last = performance.now();
    while (tt < ms) { await this.frame(); const now = performance.now(); if (!this.tour.paused) tt += Math.min(100, now - last); last = now; }
  };
  D.until = async function (cond, ms) {
    const t0 = performance.now();
    while (!cond()) { await this.frame(); if (performance.now() - t0 > (ms || 3000)) return false; }
    return true;
  };
  D.$ = function (s) { return this.doc.querySelector(s); };
  D.$$ = function (s) { return Array.from(this.doc.querySelectorAll(s)); };

  /* the pointer and the effects drawn inside the frame */
  D.inject = function () {
    const doc = this.doc;
    const st = doc.createElement('style');
    st.textContent = `
#dcur{position:fixed; left:0; top:0; z-index:2147483646; pointer-events:none; will-change:transform}
#dcur .arr{position:absolute; left:-3px; top:-2px; width:26px; height:30px; transform-origin:3px 2px; transform:scale(var(--k)); transition:transform .1s}
#dcur.down .arr{transform:scale(calc(var(--k) * .86))}
#dcur .fin{position:absolute; left:-22px; top:-22px; width:44px; height:44px; border-radius:50%; background:rgba(110,110,120,.26); border:2.5px solid rgba(255,255,255,.95); box-shadow:0 2px 10px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.12); transform:scale(calc(var(--k) * .9)); transition:transform .12s, background .12s, opacity .2s; opacity:.55}
#dcur.down .fin{transform:scale(calc(var(--k) * .74)); background:rgba(37,99,235,.42); opacity:1}
#dcur.mouse .fin, #dcur.touch .arr{display:none}
#dcur .ring{position:absolute; left:-30px; top:-30px; width:60px; height:60px; transform:scale(var(--k)) rotate(-90deg); opacity:0}
#dcur .ring circle{fill:none; stroke:#2563eb; stroke-width:4; stroke-linecap:round; stroke-dasharray:170; stroke-dashoffset:170}
#dcur.hold .ring{opacity:1}
#dcur.hold .ring circle{animation:dhold var(--hold) linear forwards}
@keyframes dhold{to{stroke-dashoffset:0}}
.drip{position:fixed; z-index:2147483645; pointer-events:none; left:0; top:0; width:40px; height:40px; margin:-20px 0 0 -20px; border-radius:50%; border:3px solid #2563eb; animation:drip .55s ease-out forwards}
@keyframes drip{from{transform:scale(calc(var(--k) * .3)); opacity:.95} to{transform:scale(calc(var(--k) * 1.5)); opacity:0}}
html.demo *{scroll-behavior:auto !important}
html.demo .tip{transition:none}`;
    doc.head.appendChild(st);
    const c = doc.createElement('div');
    c.id = 'dcur';
    c.className = this.touch ? 'touch' : 'mouse';
    c.innerHTML = '<svg class="arr" viewBox="0 0 26 30"><path d="M3 2 L3 24 L8.6 18.6 L12.6 27.6 L16.4 26 L12.5 17.2 L20.5 17.2 Z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg><div class="fin"></div><svg class="ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="27"/></svg>';
    doc.body.appendChild(c);
    this.cur = c;
    this.k();
    this.draw();
  };
  // the pointer keeps a comfortable size on screen whatever the scale of the frame
  D.k = function () { if (this.cur) this.cur.style.setProperty('--k', String(Math.max(0.9, Math.min(1.7, 1 / (this.tour.s0 * this.tour.cz))))); };
  D.draw = function () { this.cur.style.transform = `translate(${this.x}px, ${this.y}px)`; };
  D.ripple = function () {
    const r = this.doc.createElement('div');
    r.className = 'drip';
    r.style.left = this.x + 'px'; r.style.top = this.y + 'px';
    r.style.setProperty('--k', this.cur.style.getPropertyValue('--k'));
    this.doc.body.appendChild(r);
    setTimeout(() => r.remove(), 700);
  };

  /* where things are, in pixels of the frame */
  D.comp = function (name) { return this.app.circuit.comps.find((c) => c.name === name); };
  D.grid = function (gx, gy) {
    const r = this.doc.getElementById('cv').getBoundingClientRect(), v = this.app.view;
    return { x: r.left + v.ox + gx * v.scale, y: r.top + v.oy + gy * v.scale };
  };
  // a target: [x, y] pixels · 'selector' · element · {g:[x,y]} grid point · {c:'R1'} body of a component,
  // {c:'R1', t:0} its terminal, {c:'R1', o:[dx,dy]} a point of its body in grid units · {sel|el, ax, ay, dx, dy}
  D.pos = function (t) {
    if (Array.isArray(t)) return { x: t[0], y: t[1] };
    if (typeof t === 'string') { const e = this.$(t); if (!e) throw new Error('tour: no ' + t); t = { el: e }; }
    if (t && t.nodeType === 1) t = { el: t };
    if (t.sel) { const e = this.$(t.sel); if (!e) throw new Error('tour: no ' + t.sel); t = Object.assign({}, t, { el: e }); }
    if (t.el) {
      const r = t.el.getBoundingClientRect();
      return { x: r.left + r.width * (t.ax != null ? t.ax : 0.5) + (t.dx || 0), y: r.top + r.height * (t.ay != null ? t.ay : 0.5) + (t.dy || 0), el: t.el };
    }
    if (t.g) return this.grid(t.g[0], t.g[1]);
    if (t.c) {
      const c = this.comp(t.c);
      if (!c) throw new Error('tour: no component ' + t.c);
      if (t.t != null) { const p = this.C.terminals(c)[t.t]; return this.grid(p[0], p[1]); }
      if (t.l) return this.local(t.c, t.l[0], t.l[1]);
      const o = t.o || [0, 0];
      return this.grid(c.x + o[0], c.y + o[1]);
    }
    throw new Error('tour: bad target');
  };
  // a point given in the frame of a component (grid units, before rotation): {c:'P1', l:[lx, ly]}
  D.local = function (name, lx, ly) { const c = this.comp(name); const w = this.C.toWorld(c, lx, ly); return this.grid(w[0], w[1]); };
  // the grid point at the centre of the circuit area (to place things on an empty circuit)
  D.center = function () {
    const r = this.doc.getElementById('cv').getBoundingClientRect(), v = this.app.view;
    return [Math.round((r.width / 2 - v.ox) / v.scale), Math.round((r.height / 2 - v.oy) / v.scale)];
  };
  // a reference mark of a component ('v': + or −, 'i': the current arrow)
  D.mark = function (name, kind, k) {
    const c = this.comp(name);
    const hs = (this.app.renderer.hits || []).filter((h) => h.id === c.id && h.kind === kind);
    const h = hs[k || 0];
    if (!h) throw new Error('tour: no mark ' + name + ' ' + kind);
    const r = this.doc.getElementById('cv').getBoundingClientRect();
    return [r.left + (h.r[0] + h.r[2]) / 2, r.top + (h.r[1] + h.r[3]) / 2];
  };
  D.mt = function (m, t) { return this.touch ? t : m; };
  D.rect = function (t) {
    // several targets: the rectangle around all of them
    if (Array.isArray(t) && t.length && typeof t[0] !== 'number') {
      const rs = t.map((q) => this.rect(q));
      const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
      const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    if (typeof t === 'string') t = this.$(t);
    if (t && t.nodeType === 1) { const r = t.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
    if (t && t.gr) { const a = this.grid(t.gr[0], t.gr[1]), b = this.grid(t.gr[2], t.gr[3]); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; }
    if (Array.isArray(t)) return { x: t[0], y: t[1], w: t[2], h: t[3] };
    const p = this.pos(t); return { x: p.x - 60, y: p.y - 60, w: 120, h: 120 };
  };

  /* events */
  D.under = function () { return this.doc.elementFromPoint(this.x, this.y) || this.doc.body; };
  D.ptr = function (type, target) {
    const W = this.W;
    target.dispatchEvent(new W.PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true, view: W,
      clientX: this.x, clientY: this.y, screenX: this.x, screenY: this.y,
      pointerId: this.touch ? 7 : 1, pointerType: this.touch ? 'touch' : 'mouse', isPrimary: true,
      button: type === 'pointermove' ? -1 : (this.btn || 0), buttons: this.isDown ? (this.btn === 2 ? 2 : 1) : 0, width: this.touch ? 20 : 1, height: this.touch ? 20 : 1, pressure: this.isDown ? 0.5 : 0
    }));
  };
  D.mouse = function (type, target, extra) {
    const W = this.W;
    target.dispatchEvent(new W.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, composed: true, view: W, clientX: this.x, clientY: this.y, button: 0, detail: 1 }, extra || {})));
  };
  D.hoverHere = function () {
    if (this.touch || this.isDown) return;
    const e = this.under();
    this.ptr('pointermove', e);
    if (e !== this.lastHover) { if (this.lastHover) this.ptr('pointerleave', this.lastHover); this.lastHover = e; }
  };

  /* gestures */
  D.move = async function (t, ms, curve) {
    const p = this.pos(t);
    const x0 = this.x, y0 = this.y, d = Math.hypot(p.x - x0, p.y - y0);
    if (ms == null) ms = Math.min(950, 260 + d * 0.95);
    let tt = 0, last = performance.now();
    while (tt < ms) {
      await this.frame();
      const now = performance.now();
      if (!this.tour.paused) tt += Math.min(50, now - last);
      last = now;
      const k = Math.min(1, tt / ms), u = curve === 'out' ? 1 - Math.pow(1 - k, 3) : ease(k);
      this.x = x0 + (p.x - x0) * u; this.y = y0 + (p.y - y0) * u;
      this.draw();
      if (this.isDown) this.ptr('pointermove', this.downEl); else this.hoverHere();
    }
    return p;
  };
  D.down = function () {
    const e = this.under();
    this.downEl = e; this.isDown = true;
    this.cur.classList.add('down');
    this.ptr('pointerdown', e);
    if (!this.touch) this.mouse('mousedown', e);
    const f = e.closest && e.closest('input, textarea, select');
    if (f) f.focus();
  };
  D.up = function (click) {
    const e = this.downEl;
    this.isDown = false;
    this.cur.classList.remove('down', 'hold');
    this.ptr('pointerup', e);
    if (!this.touch) this.mouse('mouseup', e);
    // a click on the page, not on the circuit (the canvas works with pointer events only)
    if (click !== false && e.tagName !== 'CANVAS' && e.isConnected) this.mouse('click', e);
    this.downEl = null;
  };
  D.tap = async function (t, opts) {
    opts = opts || {};
    if (t != null) await this.move(t, opts.ms);
    await this.wait(opts.pre != null ? opts.pre : 120);
    this.down();
    this.ripple();
    await this.wait(opts.hold || 90);
    this.up(opts.click);
    await this.wait(opts.after != null ? opts.after : 260);
  };
  D.click = D.tap;
  D.dbl = async function (t) {
    if (t != null) await this.move(t);
    await this.wait(120);
    this.down(); this.ripple(); await this.wait(60); this.up(false);
    await this.wait(110);
    this.down(); this.ripple(); await this.wait(60); this.up(false);
    if (!this.touch) this.mouse('dblclick', this.under(), { detail: 2 });
    await this.wait(350);
  };
  // press, move along the points, release
  D.drag = async function (from, to, opts) {
    opts = opts || {};
    if (from != null) await this.move(from);
    await this.wait(140);
    this.down();
    if (opts.long) { await this.holdRing(opts.long); }
    else await this.wait(opts.pause || 120);
    for (const p of (Array.isArray(to) && to.length && typeof to[0] !== 'number' ? to : [to])) await this.move(p, opts.ms, opts.curve);
    await this.wait(opts.end || 140);
    this.up(false);
    await this.wait(opts.after != null ? opts.after : 250);
  };
  // drag a floating window by its title so that its corner lands at the corner of the circuit area
  // (corner: 'br' bottom right, 'bl', 'tr', 'tl')
  D.parkWin = async function (win, head, corner) {
    const st = this.$('#stage').getBoundingClientRect(), r = win.getBoundingClientRect(), h = head.getBoundingClientRect();
    const right = (corner || 'br').includes('r'), bottom = (corner || 'br').includes('b');
    const dx = right ? st.right - 10 - r.right : st.left + 10 - r.left;
    const dy = bottom ? st.bottom - 10 - r.bottom : st.top + 52 - r.top;
    const x = h.left + Math.min(40, h.width / 3), y = h.top + h.height / 2;
    await this.drag([x, y], [[x + dx, y + dy]], { ms: 800 });
  };
  // move the view by (dx, dy) pixels with the gesture a person would use: one finger on the background, or
  // the right mouse button
  D.pan = async function (dx, dy) {
    const cv = this.doc.getElementById('cv'), r = cv.getBoundingClientRect(), app = this.app;
    const free = (x, y) => {
      if (x < r.left + 4 || x > r.right - 4 || y < r.top + 4 || y > r.bottom - 4) return false;
      if (this.doc.elementFromPoint(x, y) !== cv) return false;
      const v = app.view;
      return !app.editor.hit((x - r.left - v.ox) / v.scale, (y - r.top - v.oy) / v.scale, this.touch ? 'touch' : 'mouse');
    };
    let p = null;
    for (let i = 1; i < 12 && !p; i++) for (let j = 1; j < 12 && !p; j++) {
      const x = r.left + r.width * i / 12, y = r.top + r.height * j / 12;
      if (free(x, y) && free(x + dx, y + dy)) p = [x, y];
    }
    if (!p) { app.view.ox += dx; app.view.oy += dy; app.viewChanged && app.viewChanged(); app.requestRender(); return; }
    if (!this.touch) this.btn = 2;
    // (a quick start: a finger that stays still would be a long press, i.e. a selection window)
    try { await this.drag(p, [[p[0] + dx, p[1] + dy]], { ms: 800, pause: 30, curve: 'out' }); } finally { this.btn = 0; }
  };
  // pan the circuit into the largest free part of the circuit area next to a floating window
  D.clearOf = async function (win) {
    if (!win) return;
    const app = this.app, cv = this.doc.getElementById('cv').getBoundingClientRect();
    const b = app.circuitBounds(app.circuit);
    const a = this.grid(b[0] - 1, b[1] - 1.5), z = this.grid(b[2] + 1, b[3] + 1);
    const w = win.getBoundingClientRect();
    const vb = this.$('#viewbar'), top0 = vb ? vb.getBoundingClientRect().bottom + 4 : cv.top;
    const regs = [
      { x0: cv.left, y0: top0, x1: w.left - 6, y1: cv.bottom - 50 },
      { x0: w.right + 6, y0: top0, x1: cv.right, y1: cv.bottom - 50 },
      { x0: cv.left, y0: top0, x1: cv.right - 40, y1: w.top - 6 },
      { x0: cv.left, y0: w.bottom + 6, x1: cv.right - 40, y1: cv.bottom - 50 }
    ].filter((q) => q.x1 - q.x0 > 40 && q.y1 - q.y0 > 40);
    if (!regs.length) return;
    // the region where the circuit fits best (the most of its area)
    const cw = z.x - a.x, ch = z.y - a.y;
    const score = (q) => Math.min(1, (q.x1 - q.x0) / cw) * Math.min(1, (q.y1 - q.y0) / ch);
    regs.sort((p, q) => score(q) - score(p));
    const q = regs[0];
    const dx = (q.x0 + q.x1) / 2 - (a.x + z.x) / 2, dy = cw > q.x1 - q.x0 && ch > q.y1 - q.y0 ? 0 : (q.y0 + q.y1) / 2 - (a.y + z.y) / 2;
    const fx = Math.abs(dx) < 8 ? 0 : (q.x1 - q.x0 >= cw ? dx : (dx > 0 ? q.x0 - a.x : q.x1 - z.x));
    const fy = Math.abs(dy) < 8 ? 0 : (q.y1 - q.y0 >= ch ? dy : (dy > 0 ? q.y0 - a.y : q.y1 - z.y));
    if (fx || fy) await this.pan(fx, fy);
  };
  D.holdRing = async function (ms) {
    this.cur.style.setProperty('--hold', ms + 'ms');
    this.cur.classList.add('hold');
    await this.wait(ms);
    this.cur.classList.remove('hold');
  };
  // a long press (and release without moving)
  D.hold = async function (t, ms) {
    if (t != null) await this.move(t);
    await this.wait(120);
    this.down();
    await this.holdRing(ms || 650);
    this.up(false);
    await this.wait(300);
  };
  D.key = async function (k, label) {
    this.tour.showKey(label || (k.length === 1 ? k.toUpperCase() : k));
    const W = this.W, tgt = this.doc.activeElement || this.doc.body;
    tgt.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await this.wait(80);
    tgt.dispatchEvent(new W.KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
    await this.wait(450);
  };
  D.wheel = async function (t, dy, n, gap) {
    if (t != null) await this.move(t);
    this.tour.showKey(dy < 0 ? '⇡' : '⇣', true);
    for (let i = 0; i < (n || 1); i++) {
      this.under().dispatchEvent(new this.W.WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: this.x, clientY: this.y, deltaY: dy, deltaMode: 0 }));
      await this.wait(gap || 160);
    }
  };
  // typing in a field: a tap, the old text selected, the new one letter by letter, then Enter
  D.type = async function (t, text, opts) {
    opts = opts || {};
    const p = this.pos(t);
    await this.tap(t);
    const f = p.el && p.el.closest('input, textarea') || this.doc.activeElement;
    if (!f) return;
    f.focus();
    try { f.select(); } catch (e) { /* not text */ }
    await this.wait(250);
    const W = this.W;
    f.value = '';
    f.dispatchEvent(new W.Event('input', { bubbles: true }));
    for (const ch of text) {
      f.value += ch;
      f.dispatchEvent(new W.Event('input', { bubbles: true }));
      await this.wait(opts.speed || 110);
    }
    await this.wait(200);
    if (opts.enter !== false) {
      this.tour.showKey('↵');
      f.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      f.dispatchEvent(new W.Event('change', { bubbles: true }));
      await this.wait(400);
    }
  };
  D.say = function (o) { this.tour.caption(L(o)); };
  D.cam = async function (t, scale, ms) {
    if (t == null) this.tour.setCam(null);
    else { const r = this.rect(t); this.tour.setCam(r, scale); }
    await this.wait(ms != null ? ms : 750);
  };

  // the camera on the whole circuit (with a margin in grid units), plus other targets if given
  D.camCircuit = async function (scale, pad, more) {
    const b = this.app.circuitBounds(this.app.circuit);
    if (!b || !isFinite(b[0])) return this.cam(null);
    const m = pad != null ? pad : 2.5;
    const t = [{ gr: [b[0] - m, b[1] - m, b[2] + m, b[3] + m] }].concat(more || []);
    return this.cam(t, scale || 1.25);
  };

  /* app helpers */
  D.load = function (spec, settings) {
    const app = this.app;
    Object.assign(app.settings, { showV: true, showI: true, showP: false, showNodes: false, animate: false }, settings || {});
    const c = spec ? (typeof spec === 'string' ? this.W.DCS.examples.get(spec) : this.W.DCS.examples.make(spec)) : { comps: [], wires: [] };
    delete c.show;
    app.loadCircuit(c);
    app.fit();
    app.ui.syncControls && app.ui.syncControls();
    app.circuitChanged();
    app.ui.update();
    app.requestRender();
  };
  // more room for the circuit and its floating windows (desktop layout): the list of components and / or the
  // side panel put away
  D.roomy = function (pal, side) {
    if (this.mobile()) return;
    const ui = this.app.ui;
    if (pal) ui.setPanelHidden('pal', true);
    if (side) ui.setPanelHidden('side', true);
    this.app.fit();
    this.app.requestRender();
  };
  D.mobile = function () { return this.doc.documentElement.classList.contains('layout-mobile'); };
  D.docked = function () { return !!(this.app.ui.isDocked && this.app.ui.isDocked()); };
  // a tab of the side panel (the phone's sheet opens first)
  D.panel = async function (name) {
    const side = this.$('#side');
    if (this.mobile() && !side.classList.contains('open')) { await this.tap('#sheetBtn'); await this.wait(350); }
    const b = this.$(`.side .tabs button[data-tab="${name}"]`);
    if (b && !b.classList.contains('active')) await this.tap(b);
  };
  D.closePanel = async function () {
    const side = this.$('#side');
    if (this.mobile() && side.classList.contains('open') && !this.docked()) { await this.tap('#sheetClose'); await this.wait(300); }
  };
  // a component of the palette (the phone's strip scrolls to it)
  D.pal = async function (key) {
    const b = this.$(`#palComps button[data-key="${key}"]`);
    b.scrollIntoView({ block: 'nearest', inline: 'center' });
    this.unscroll();
    await this.wait(250);
    return b;
  };
  // (scrolling inside the frame must never scroll the guide around it)
  D.unscroll = function () { for (const e of [this.tour.screen, this.tour.stagewrap, this.tour.win, document.scrollingElement]) if (e) { e.scrollTop = 0; e.scrollLeft = 0; } };
  // scroll the panel (or list) that holds this element so that it is at the top, smoothly
  D.scrollUp = async function (t, ms) {
    const e = typeof t === 'string' ? this.$(t) : t;
    if (!e) return;
    let p = e.parentElement;
    while (p && p !== this.doc.body && !(p.scrollHeight > p.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    if (!p || p === this.doc.body) return;
    const y0 = p.scrollTop, y1 = Math.min(p.scrollHeight - p.clientHeight, y0 + e.getBoundingClientRect().top - p.getBoundingClientRect().top - 8);
    const n = Math.max(1, Math.round((ms || 600) / 16));
    for (let i = 1; i <= n; i++) { await this.frame(); p.scrollTop = y0 + (y1 - y0) * ease(i / n); }
  };
  D.scrollTo = async function (t) {
    const e = typeof t === 'string' ? this.$(t) : t;
    if (e) { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); this.unscroll(); }
    await this.wait(250);
    return e;
  };

  /* ---------- the window ---------- */
  function Tour(app) {
    this.app = app;
    this.paused = false;
    this.cz = 1; this.s0 = 1;
    this.idx = 0;
    this.runId = 0;
    this.dur = {};
  }
  const T = Tour.prototype;

  T.build = function () {
    const lang = I.getLang();
    const back = el('div', { class: 'tour-back' });
    const win = el('div', { class: 'tour', role: 'dialog', 'aria-modal': 'true', 'aria-label': L(TX.title) });
    win.innerHTML = `
      <header class="tour-head">
        <svg viewBox="0 0 24 24" class="tour-logo"><circle cx="12" cy="12" r="9.5"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/></svg>
        <h2>${esc(L(TX.title))}</h2>
        <button type="button" class="tour-ref">${esc(L(TX.ref))}</button>
        <button type="button" class="tour-x" aria-label="${esc(L(TX.close))}" title="${esc(L(TX.close))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </header>
      <div class="tour-body">
        <nav class="tour-list" aria-label="${esc(L(TX.chapters))}"></nav>
        <section class="tour-main">
          <div class="tour-stagewrap">
            <div class="tour-screen">
              <div class="tour-cam"><iframe title="demo" tabindex="-1" aria-hidden="true"></iframe></div>
              <div class="tour-veil"><span>${esc(L(TX.loading))}</span></div>
              <div class="tour-keys"></div>
              <div class="tour-cap"></div>
              <div class="tour-prog"><i></i></div>
            </div>
          </div>
          <div class="tour-foot">
            <button type="button" class="tour-nav tour-prev" aria-label="${esc(L(TX.prev))}" title="${esc(L(TX.prev))}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
            <div class="tour-info"><h3></h3><p></p></div>
            <button type="button" class="tour-nav tour-pp" aria-label="${esc(L(TX.pause))}" title="${esc(L(TX.pause))}"><svg class="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg><svg class="i-play" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg></button>
            <button type="button" class="tour-nav tour-next" aria-label="${esc(L(TX.next))}" title="${esc(L(TX.next))}"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        </section>
      </div>`;
    back.appendChild(win);
    document.body.appendChild(back);
    this.back = back; this.win = win;
    const q = (s) => win.querySelector(s);
    this.list = q('.tour-list'); this.screen = q('.tour-screen'); this.camEl = q('.tour-cam'); this.frame = q('iframe');
    this.veil = q('.tour-veil'); this.cap = q('.tour-cap'); this.keys = q('.tour-keys'); this.prog = q('.tour-prog i');
    this.infoH = q('.tour-info h3'); this.infoP = q('.tour-info p'); this.ppBtn = q('.tour-pp');
    this.stagewrap = q('.tour-stagewrap');
    // the list of topics, by group
    const CH = DCS.tourChapters;
    let g = null;
    CH.forEach((ch, i) => {
      if (ch.g !== g) { g = ch.g; this.list.appendChild(el('div', { class: 'tour-group' }, esc(L(DCS.tourGroups[g])))); }
      const b = el('button', { type: 'button', class: 'tour-item', 'data-i': String(i) }, `<span class="tour-ico">${ch.icon || ''}</span><span class="tour-name">${esc(L(ch.t))}</span>`);
      b.addEventListener('click', () => this.go(i));
      this.list.appendChild(b);
    });
    q('.tour-x').addEventListener('click', () => this.close());
    q('.tour-ref').addEventListener('click', () => { this.close(); this.app.ui.openModal(this.app.t('help_title'), this.app.t('help_html')); });
    q('.tour-prev').addEventListener('click', () => this.go((this.idx + CH.length - 1) % CH.length));
    q('.tour-next').addEventListener('click', () => this.go((this.idx + 1) % CH.length));
    this.ppBtn.addEventListener('click', () => this.togglePause());
    back.addEventListener('pointerdown', (e) => { if (e.target === back) this.close(); });
    this.onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.go((this.idx + 1) % CH.length); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.go((this.idx + CH.length - 1) % CH.length); }
      else if (e.key === ' ') { e.preventDefault(); this.togglePause(); }
    };
    // (the keys go to the guide, not to the simulator behind it)
    document.addEventListener('keydown', this.onKey, true);
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(this.stagewrap);
    this.lang = lang;
  };

  // the demo uses the layout of the app (a phone layout when the window is narrow), at a fixed size that is
  // scaled to the space there is
  T.mode = function () {
    const w = this.stagewrap.clientWidth;
    const mob = document.documentElement.classList.contains('layout-mobile');
    if (w < 560) return { layout: 'mobile', VW: 390, VH: 640, touch: true };
    return mob ? { layout: 'mobile', VW: 960, VH: 600, touch: true } : { layout: 'desktop', VW: 960, VH: 600, touch: false };
  };
  T.layout = function () {
    if (!this.win) return;
    const m = this.mode();
    const changed = !this.m || m.layout !== this.m.layout || m.VW !== this.m.VW;
    this.m = m; this.VW = m.VW; this.VH = m.VH;
    const aw = this.stagewrap.clientWidth, ah = this.stagewrap.clientHeight;
    const s = Math.max(0.2, Math.min(aw / m.VW, ah / m.VH));
    this.s0 = s;
    this.FW = Math.round(m.VW * s); this.FH = Math.round(m.VH * s);
    this.screen.style.width = this.FW + 'px'; this.screen.style.height = this.FH + 'px';
    this.camEl.style.width = m.VW + 'px'; this.camEl.style.height = m.VH + 'px';
    this.frame.style.width = m.VW + 'px'; this.frame.style.height = m.VH + 'px';
    this.applyCam(false);
    if (this.demo) this.demo.k();
    if (changed && this.started) this.go(this.idx, true);
  };
  // camera: null = the whole frame; else the rectangle (pixels of the frame) is zoomed to about the size it
  // would have on a real screen (scale ~1.1), centred and kept inside the frame
  T.setCam = function (r, scale) {
    this.camR = r ? { r, scale: scale || 1.1 } : null;
    this.applyCam(true);
  };
  T.applyCam = function (anim) {
    const s0 = this.s0;
    let z = 1, cx = this.VW / 2, cy = this.VH / 2;
    if (this.camR) {
      const { r, scale } = this.camR;
      z = Math.max(1, Math.min(2.6, scale / s0, this.VW / Math.max(40, r.w) * 0.92, this.VH / Math.max(40, r.h) * 0.92));
      cx = r.x + r.w / 2; cy = r.y + r.h / 2;
    }
    const S = s0 * z;
    let tx = this.FW / 2 - cx * S, ty = this.FH / 2 - cy * S;
    tx = Math.min(0, Math.max(this.FW - this.VW * S, tx));
    ty = Math.min(0, Math.max(this.FH - this.VH * S, ty));
    this.cz = z;
    this.camEl.style.transition = anim ? 'transform .75s cubic-bezier(.45,0,.2,1)' : 'none';
    this.camEl.style.transform = `translate(${tx}px, ${ty}px) scale(${S})`;
    if (this.demo) this.demo.k();
  };
  T.caption = function (text) {
    const c = this.cap;
    if (!text) { c.classList.remove('on'); return; }
    if (c.classList.contains('on') && c.dataset.t === text) return;
    c.classList.remove('on');
    clearTimeout(this.capT);
    this.capT = setTimeout(() => { c.innerHTML = text; c.dataset.t = text; c.classList.add('on'); }, c.innerHTML ? 160 : 0);
  };
  T.showKey = function (label, soft) {
    const k = el('kbd', { class: soft ? 'soft' : '' }, esc(label));
    this.keys.appendChild(k);
    setTimeout(() => k.classList.add('out'), 900);
    setTimeout(() => k.remove(), 1300);
  };
  T.togglePause = function () {
    if (this.ended) { this.go(this.idx); return; }
    this.paused = !this.paused;
    this.syncPP();
  };
  T.syncPP = function () {
    const b = this.ppBtn;
    b.classList.toggle('paused', this.paused);
    const s = L(this.paused ? TX.play : TX.pause);
    b.title = s; b.setAttribute('aria-label', s);
  };

  // load the frame afresh (a clean simulator for every run)
  T.loadFrame = function () {
    const m = this.m;
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const q = `demo&lang=${I.getLang()}&layout=${m.layout}&theme=${theme}&sym=${this.app.settings.style === 'iec' ? 'iec' : 'us'}`;
    const f = this.frame;
    return new Promise((resolve) => {
      const done = () => {
        f.removeEventListener('load', done);
        const W = f.contentWindow;
        const t0 = performance.now();
        const poll = () => {
          if (W.DCS && W.DCS.app && W.DCS.app.ready) resolve(W);
          else if (performance.now() - t0 > 8000) resolve(null);
          else setTimeout(poll, 40);
        };
        poll();
      };
      f.addEventListener('load', done);
      const url = new URL('index.html?' + q, location.href).href;
      if (f.dataset.q === q && f.contentWindow && f.contentWindow.location.href !== 'about:blank') f.contentWindow.location.reload();
      else { f.dataset.q = q; f.src = url; }
    });
  };

  T.go = async function (i, force) {
    const CH = DCS.tourChapters;
    if (!force && i === this.idx && this.started && !this.ended) return;
    this.idx = i;
    this.started = true;
    const my = ++this.runId;
    if (this.demo) { this.demo.dead = true; this.demo = null; }
    this.paused = false; this.ended = false; this.syncPP();
    this.ppBtn.classList.remove('ended');
    const ch = CH[i];
    this.list.querySelectorAll('.tour-item').forEach((b) => b.classList.toggle('on', +b.dataset.i === i));
    const on = this.list.querySelector('.tour-item.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    this.infoH.innerHTML = `<span class="tour-n">${i + 1}/${CH.length}</span> ${esc(L(ch.t))}`;
    this.infoP.innerHTML = L(typeof ch.d === 'function' ? ch.d(this.m.touch) : ch.d);
    this.veil.classList.add('on');
    this.caption(null);
    this.setProg(0, false);
    this.camR = null; this.applyCam(false);
    const W = await this.loadFrame();
    if (my !== this.runId || !W) return;
    const d = new Demo(this, W, this.m.touch);
    this.demo = d;
    // the demo puts the focus in the frame (a tap on the circuit focuses it): the keys of the person still
    // go to the guide, never to the simulator of the demo
    const keys = (e) => { if (!e.isTrusted) return; e.stopPropagation(); e.preventDefault(); if (e.type === 'keydown') this.onKey(e); };
    W.addEventListener('keydown', keys, true);
    W.addEventListener('keyup', keys, true);
    try {
      if (ch.setup) ch.setup(d);
      await d.wait(80);
      this.veil.classList.remove('on');
      const t0 = performance.now();
      this.progLoop(my, ch, t0);
      await ch.run(d);
      this.dur[ch.id] = performance.now() - t0;
      this.setProg(1, true);
      this.caption(null);
      await d.wait(ch.endWait || 1800);
    } catch (e) {
      if (e === ABORT || my !== this.runId) return;
      console.error(e);
      // (a demo that failed: shown as it is for a moment, then again)
      await new Promise((r) => setTimeout(r, 2500));
    }
    if (my !== this.runId) return;
    // like an animated picture: it starts again
    this.go(i, true);
  };
  T.setProg = function (u, anim) {
    this.prog.style.transition = anim ? 'width .3s' : 'none';
    this.prog.style.width = (u * 100).toFixed(2) + '%';
  };
  T.progLoop = function (my, ch, t0) {
    const est = this.dur[ch.id] || ch.est || 15000;
    let acc = 0, last = performance.now();
    const step = () => {
      if (my !== this.runId || !this.win) return;
      const now = performance.now();
      if (!this.paused) acc += now - last;
      last = now;
      this.setProg(Math.min(0.97, acc / est), false);
      if (acc < est * 1.5) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  T.open = function (start) {
    if (this.win) return;
    this.build();
    requestAnimationFrame(() => {
      this.back.classList.add('open');
      this.layout();
      this.go(start != null ? start : (this.last || 0), true);
    });
  };
  T.close = function () {
    if (!this.win) return;
    this.runId++;
    if (this.demo) { this.demo.dead = true; this.demo = null; }
    this.last = this.idx;
    document.removeEventListener('keydown', this.onKey, true);
    this.ro.disconnect();
    this.back.remove();
    this.win = null; this.back = null; this.m = null; this.started = false;
  };

  DCS.tour = { create: (app) => new Tour(app), Demo, L };
})(window);
