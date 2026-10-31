/* Schematic editor: pointer (mouse, touch, pen) and keyboard interaction on the canvas. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp;

  const DRAG_PX = { mouse: 4, pen: 6, touch: 9 };
  const LONG_MS = 480;

  function distSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function Editor(app, canvas) {
    this.app = app;
    this.cv = canvas;
    this.ptrs = new Map();
    this.g = null;          // current gesture
    this.pinch = null;
    this.chain = null;      // wire tool: last point of a tap-by-tap wire
    this.lastTap = null;
    this.bind();
  }

  Editor.prototype.world = function (e) {
    const r = this.cv.getBoundingClientRect(), v = this.app.view;
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { sx, sy, x: (sx - v.ox) / v.scale, y: (sy - v.oy) / v.scale };
  };

  Editor.prototype.tol = function (type) {
    return (type === 'touch' ? 15 : type === 'pen' ? 10 : 7) / this.app.view.scale;
  };

  Editor.prototype.hit = function (wx, wy, type, opts) {
    opts = opts || {};
    const app = this.app, tol = this.tol(type);
    const rt = Math.max(0.32, tol);
    let best = null, bd = Infinity;
    if (!opts.noTerms) {
      for (const c of app.circuit.comps) {
        C.terminals(c).forEach(([x, y], j) => {
          const d = Math.hypot(wx - x, wy - y);
          if (d < rt && d < bd) { bd = d; best = { kind: 'term', comp: c, idx: j, pt: [x, y] }; }
        });
      }
      for (const w of app.circuit.wires) {
        for (const [end, x, y] of [[1, w.x1, w.y1], [2, w.x2, w.y2]]) {
          const d = Math.hypot(wx - x, wy - y);
          if (d < rt && d < bd - 1e-9) { bd = d; best = { kind: 'wend', wire: w, end, pt: [x, y] }; }
        }
      }
      if (best) return best;
    }
    const comps = app.circuit.comps;
    for (let i = comps.length - 1; i >= 0; i--) {
      if (C.hit(comps[i], wx, wy, tol * 0.4)) return { kind: 'comp', comp: comps[i] };
    }
    const rw = Math.max(0.28, tol * 0.9);
    for (const w of app.circuit.wires) {
      const d = distSeg(wx, wy, w.x1, w.y1, w.x2, w.y2);
      if (d < rw && d < bd) { bd = d; best = { kind: 'wire', wire: w }; }
    }
    return best;
  };

  // is there something to connect to at this grid point?
  Editor.prototype.isConn = function (x, y) {
    const app = this.app;
    for (const c of app.circuit.comps) for (const [tx, ty] of C.terminals(c)) if (tx === x && ty === y) return true;
    for (const w of app.circuit.wires) if (distSeg(x, y, w.x1, w.y1, w.x2, w.y2) < 1e-9) return true;
    return false;
  };

  // pressing the body itself (an inner box) or a terminal, as opposed to its edge where the marks sit
  Editor.prototype.onBody = function (h, p) {
    return !!h && (h.kind === 'term' || (h.kind === 'comp' && C.hit(h.comp, p.x, p.y, -0.25)));
  };

  // rotary potentiometer: anywhere on the round symbol turns the wiper
  Editor.prototype.onKnob = function (c, p) {
    if (c.props.ctl !== 'knob') return false;
    const [lx, ly] = C.toLocal(c, p.x, p.y);
    return Math.hypot(lx, ly) < C.ROT.R + 0.5;
  };
  Editor.prototype.onWiper = function (c, p) {
    if (c.props.ctl === 'knob') return false;
    const [lx, ly] = C.toLocal(c, p.x, p.y);
    return ly < -0.2 && ly > -1.75 && Math.abs(lx - C.potX(c)) < 0.75;
  };

  Editor.prototype.snap = function (p) { return [Math.round(p.x), Math.round(p.y)]; };

  // Route a wire from a to b with axis-aligned pieces: among the L and Z shapes, keep the one that does
  // not run over terminals or component bodies and that leaves / reaches terminals along their leads.
  Editor.prototype.lPath = function (a, b, hFirst) {
    if (a[0] === b[0] || a[1] === b[1]) return [a, b];
    const aa = this.axisAt(a), ba = this.axisAt(b);
    const mx = Math.round((a[0] + b[0]) / 2), my = Math.round((a[1] + b[1]) / 2);
    const cands = [
      [a, [b[0], a[1]], b], [a, [a[0], b[1]], b],
      [a, [mx, a[1]], [mx, b[1]], b], [a, [a[0], my], [b[0], my], b]
    ];
    const app = this.app;
    const terms = [];
    for (const c of app.circuit.comps) for (const t of C.terminals(c)) terms.push(t);
    const boxes = app.circuit.comps.map(c => C.bounds(c));
    const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
    let best = null, bs = Infinity;
    cands.forEach((path, k) => {
      let sc = path.length * 1.5;
      if (k === 0 && hFirst) sc -= 0.5;
      if (k === 1 && !hFirst) sc -= 0.5;
      const segAxis = (p, q) => (p[1] === q[1] ? 'h' : 'v');
      if (aa && segAxis(path[0], path[1]) !== aa) sc += 3;
      if (ba && segAxis(path[path.length - 2], path[path.length - 1]) !== ba) sc += 3;
      for (let i = 0; i + 1 < path.length; i++) {
        const p = path[i], q = path[i + 1];
        if (eq(p, q)) { sc += 50; continue; }
        const x0 = Math.min(p[0], q[0]), x1 = Math.max(p[0], q[0]), y0 = Math.min(p[1], q[1]), y1 = Math.max(p[1], q[1]);
        for (const t of terms) {
          if (eq(t, a) || eq(t, b)) continue;
          if (t[0] >= x0 && t[0] <= x1 && t[1] >= y0 && t[1] <= y1) sc += 100; // would connect to that terminal
        }
        for (const bx of boxes) {
          // crossing the inside of a component body (its terminals sit on the box edge)
          if (x1 > bx[0] + 0.3 && x0 < bx[2] - 0.3 && y1 > bx[1] + 0.3 && y0 < bx[3] - 0.3) sc += 20;
        }
        for (const w of app.circuit.wires) {
          // running along an existing wire
          if (p[1] === q[1] && w.y1 === w.y2 && w.y1 === p[1] && Math.min(x1, Math.max(w.x1, w.x2)) - Math.max(x0, Math.min(w.x1, w.x2)) > 0) sc += 8;
          if (p[0] === q[0] && w.x1 === w.x2 && w.x1 === p[0] && Math.min(y1, Math.max(w.y1, w.y2)) - Math.max(y0, Math.min(w.y1, w.y2)) > 0) sc += 8;
        }
      }
      if (sc < bs) { bs = sc; best = path; }
    });
    return best;
  };

  // direction of the lead of the component terminal at this point ('h' or 'v'), if any
  Editor.prototype.axisAt = function (p) {
    for (const c of this.app.circuit.comps) {
      const ts = C.terminals(c);
      for (let j = 0; j < ts.length; j++) {
        if (ts[j][0] !== p[0] || ts[j][1] !== p[1]) continue;
        const alongX = c.type === 'ground' ? false : c.type === 'bjt' ? j === 0 : true;
        return (((c.rot || 0) % 2 === 0) === alongX) ? 'h' : 'v';
      }
    }
    return null;
  };

  /* ---------- binding ---------- */
  Editor.prototype.bind = function () {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.down(e));
    cv.addEventListener('pointermove', (e) => this.move(e));
    cv.addEventListener('pointerup', (e) => this.up(e));
    cv.addEventListener('pointercancel', (e) => this.cancel(e));
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !this.g) { this.app.hover = null; this.app.overlay.snap = null; if (this.app.tool === 'place') this.app.overlay.ghost = null; this.app.tip(null); this.app.requestRender(); } });
    cv.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('dblclick', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.key(e));
  };

  Editor.prototype.down = function (e) {
    const app = this.app;
    this.cv.focus({ preventScroll: true });
    try { this.cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = this.world(e);
    this.ptrs.set(e.pointerId, { sx: p.sx, sy: p.sy, type: e.pointerType });
    if (this.ptrs.size === 2 && e.pointerType === 'touch') { this.abortGesture(); this.startPinch(); return; }
    if (this.ptrs.size > 1) return;
    app.tip(null);

    const g = { id: e.pointerId, type: e.pointerType, button: e.button, start: p, last: p, moved: false, shift: e.shiftKey || e.ctrlKey || e.metaKey, alt: e.altKey };
    this.g = g;
    // panning with the right or middle mouse button, or with space held
    if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || this.space)) {
      if (e.button === 2 && app.tool === 'place') { if (e.shiftKey) app.flipPlace(); else app.rotatePlace(); this.g = null; return; }
      g.mode = 'pan'; g.view0 = Object.assign({}, app.view);
      // a right click without dragging rotates the component under the pointer (Shift: mirror)
      if (e.button === 2) { g.rclick = true; g.hit = this.hit(p.x, p.y, 'mouse'); }
      return;
    }
    if (e.button > 0 && e.pointerType === 'mouse') { this.g = null; return; }
    const h = this.hit(p.x, p.y, e.pointerType);
    g.hit = h;
    const tool = app.tool;
    if (tool === 'place') { g.mode = 'place'; return; }
    if (tool === 'wire') { g.mode = 'wire'; g.a = h && (h.kind === 'term' || h.kind === 'wend') ? h.pt : this.snap(p); return; }
    // with touch the first erase waits for a move or a lift, so that a pinch never deletes anything
    if (tool === 'erase') { g.mode = 'erase'; g.erased = false; if (e.pointerType === 'mouse') this.eraseAt(p, g); return; }
    if (tool === 'port') { g.mode = 'port'; return; }

    // select tool: a tap on a reference mark (+ / − of V, arrow of I) flips it
    const mk = app.renderer.markAt(p.sx, p.sy, e.pointerType === 'touch' ? 6 : 1);
    // the component body and its terminals win over a nearby mark
    // (only on a selected element, so that a press meant to drag it never flips anything)
    if (mk && app.sel.has(mk.id) && !g.shift && !this.onBody(h, p)) { g.mode = 'mark'; g.mark = mk; return; }
    // potentiometer: dragging its wiper arrow moves the position, the circuit is solved while it moves
    if (h && h.kind === 'comp' && h.comp.type === 'pot' && !g.shift && this.onKnob(h.comp, p)) {
      g.mode = 'knob'; g.comp = h.comp;
      if (!app.sel.has(h.comp.id)) app.select([h.comp.id]);
      return;
    }
    if (h && h.kind === 'comp' && h.comp.type === 'pot' && !g.shift && this.onWiper(h.comp, p)) {
      g.mode = 'wiper'; g.comp = h.comp;
      if (!app.sel.has(h.comp.id)) app.select([h.comp.id]);
      return;
    }
    if (h && h.kind === 'term') {
      g.mode = 'maybe-wire'; g.a = h.pt;
    } else if (h && h.kind === 'wend') {
      // corner or junction of wires: dragging it moves the point with all its wires
      g.mode = 'vertex'; g.vpt = h.pt;
    } else if (h && (h.kind === 'comp' || h.kind === 'wire')) {
      const id = h.kind === 'comp' ? h.comp.id : h.wire.id;
      if (g.shift) { g.mode = 'toggle'; g.toggleId = id; }
      else {
        if (!app.sel.has(id)) app.select([id]);
        g.mode = 'move';
      }
    } else {
      g.mode = e.pointerType === 'mouse' ? 'band' : 'pan';
      g.view0 = Object.assign({}, app.view);
    }
    if (e.pointerType !== 'mouse') {
      g.longTimer = setTimeout(() => this.longPress(g), LONG_MS);
    }
    app.requestRender();
  };

  Editor.prototype.longPress = function (g) {
    if (this.g !== g || g.moved) return;
    const app = this.app;
    g.long = true;
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (_) {} }
    const h = g.hit;
    if (h && (h.kind === 'comp' || h.kind === 'term')) {
      app.select([h.comp.id]);
      app.openProps(true);
      this.g = null;
    } else if (h && (h.kind === 'wire' || h.kind === 'wend')) {
      app.select([h.wire.id]);
      app.openProps(true);
      this.g = null;
    } else if (g.mode === 'pan') {
      g.mode = 'band';
      app.overlay.band = [g.start.sx, g.start.sy, g.start.sx, g.start.sy];
      app.requestRender();
    }
  };

  Editor.prototype.move = function (e) {
    const app = this.app;
    const p = this.world(e);
    if (this.ptrs.has(e.pointerId)) { const q = this.ptrs.get(e.pointerId); q.sx = p.sx; q.sy = p.sy; }
    if (this.pinch) { this.updatePinch(); return; }
    const g = this.g;
    if (!g) { if (e.pointerType === 'mouse') this.hover(p, e); return; }
    if (g.id !== e.pointerId) return;
    if (!g.moved) {
      if (Math.hypot(p.sx - g.start.sx, p.sy - g.start.sy) < (DRAG_PX[g.type] || 5)) return;
      g.moved = true;
      clearTimeout(g.longTimer);
      if (g.mode === 'maybe-wire') g.mode = 'wire';
      if (g.mode === 'toggle') { g.mode = 'move'; app.sel.add(g.toggleId); }
      if (g.mode === 'vertex') { g.mode = 'move'; g.vertex = true; }
      if (g.mode === 'move') this.startMove(g);
      if (g.mode === 'wire') g.hFirst = Math.abs(p.x - g.start.x) >= Math.abs(p.y - g.start.y);
      if (g.mode === 'endpoint') { app.checkpoint(); g.cp = true; }
    }
    g.last = p;
    switch (g.mode) {
      case 'pan': {
        app.view.ox = g.view0.ox + (p.sx - g.start.sx);
        app.view.oy = g.view0.oy + (p.sy - g.start.sy);
        app.viewChanged();
        break;
      }
      case 'band':
        app.overlay.band = [g.start.sx, g.start.sy, p.sx, p.sy];
        break;
      case 'move': this.doMove(g, p); break;
      case 'knob': {
        // angle of the pointer around the centre of the round symbol, in its own frame; in the gap at the
        // top the wiper stays at the nearest end
        if (!g.cp) { app.checkpoint(); g.cp = true; }
        const [lx, ly] = C.toLocal(g.comp, p.x, p.y);
        let ang = Math.atan2(ly, lx) * 180 / Math.PI;
        if (ang < -90) ang += 360;
        const a = (C.ROT.a0 - ang) / (C.ROT.a0 - C.ROT.a1);
        g.comp.props.alpha = Math.round(100 * Math.max(0, Math.min(1, a))) / 100;
        app.circuitChanged(true);
        break;
      }
      case 'wiper': {
        if (!g.cp) { app.checkpoint(); g.cp = true; }
        const [lx] = C.toLocal(g.comp, p.x, p.y);
        g.comp.props.alpha = Math.round(100 * Math.max(0, Math.min(1, (lx + 1.2) / 2.4))) / 100;
        app.circuitChanged(true);
        break;
      }
      case 'wire': {
        const b = this.endSnap(p, e.pointerType);
        app.overlay.wirePath = this.lPath(g.a, b, g.hFirst);
        app.overlay.snap = b; app.overlay.snapHot = this.isConn(b[0], b[1]);
        break;
      }
      case 'endpoint': {
        const b = this.endSnap(p, e.pointerType, g.wire);
        // the dragged end is routed from the fixed end with horizontal and vertical pieces
        if (!g.ep) g.ep = { w: g.wire, F: g.end === 1 ? [g.wire.x2, g.wire.y2] : [g.wire.x1, g.wire.y1], temps: [], oldPts: new Set([(g.end === 1 ? g.wire.x1 : g.wire.x2) + ',' + (g.end === 1 ? g.wire.y1 : g.wire.y2)]) };
        const E = g.ep, tmp = new Set(E.temps);
        app.circuit.wires = app.circuit.wires.filter(w => !tmp.has(w));
        E.temps = [];
        E.w.x1 = E.F[0]; E.w.y1 = E.F[1]; E.w.x2 = E.F[0]; E.w.y2 = E.F[1];
        const path = (E.F[0] === b[0] && E.F[1] === b[1]) ? [E.F, b] : this.lPath(E.F, b, Math.abs(b[0] - E.F[0]) >= Math.abs(b[1] - E.F[1]));
        E.w.x2 = path[1][0]; E.w.y2 = path[1][1];
        for (let i = 1; i + 1 < path.length; i++) { const t = { id: app.newWireId(), x1: path[i][0], y1: path[i][1], x2: path[i + 1][0], y2: path[i + 1][1] }; app.circuit.wires.push(t); E.temps.push(t); }
        app.overlay.snap = b; app.overlay.snapHot = this.isConn(b[0], b[1]);
        app.circuitChanged(true);
        break;
      }
      case 'erase': this.eraseAt(p, g); break;
      case 'place': this.placeGhost(p); break;
      default: break;
    }
    app.requestRender();
  };

  // end point of a wire: a terminal or wire end nearby wins, otherwise the nearest grid point
  Editor.prototype.endSnap = function (p, type, exclude) {
    const app = this.app, rt = Math.max(0.45, this.tol(type));
    let best = null, bd = rt;
    for (const c of app.circuit.comps) for (const [x, y] of C.terminals(c)) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = [x, y]; } }
    for (const w of app.circuit.wires) {
      if (w === exclude) continue;
      for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = [x, y]; } }
    }
    return best || this.snap(p);
  };

  Editor.prototype.up = function (e) {
    const app = this.app;
    const p = this.world(e);
    this.ptrs.delete(e.pointerId);
    if (this.pinch) { if (this.ptrs.size < 2) { this.pinch = null; } return; }
    const g = this.g;
    if (!g || g.id !== e.pointerId) return;
    clearTimeout(g.longTimer);
    this.g = null;
    app.overlay.snap = null;
    if (g.long && !g.moved && g.mode !== 'band') { app.requestRender(); return; }

    switch (g.mode) {
      case 'pan':
        if (g.moved) break;
        if (g.rclick) {
          const c = g.hit && g.hit.comp;
          if (c && app.tool === 'select') {
            if (!app.sel.has(c.id)) app.select([c.id]);
            if (g.shift || e.shiftKey) app.flipSel(); else app.rotateSel();
          }
          break;
        }
        this.tap(g, p, e);
        break;
      case 'band': {
        const band = app.overlay.band;
        app.overlay.band = null;
        if (!g.moved && !g.long) { this.tap(g, p, e); break; }
        if (band) this.bandSelect(band, g.shift);
        break;
      }
      case 'move':
        if (!g.moved) { this.tap(g, p, e); break; }
        this.endMove(g);
        break;
      case 'toggle':
        app.toggleSel(g.toggleId);
        break;
      case 'vertex':
        this.tap(g, p, e);
        break;
      case 'mark':
        if (!g.moved) app.flipRef(g.mark.id, g.mark.kind);
        break;
      case 'wiper': case 'knob':
        if (g.moved) app.commit(); else this.tap(g, p, e);
        break;
      case 'maybe-wire':
      case 'endpoint':
        if (!g.moved) { this.tap(g, p, e); break; }
        if (g.mode === 'endpoint') { app.cleanWires(); if (g.ep) DCS.tidy.afterMove(app, g.ep.oldPts); app.commit(); }
        break;
      case 'wire': {
        app.overlay.wirePath = null;
        if (!g.moved) { this.chainTap(g, p, e); break; }
        const b = this.endSnap(p, e.pointerType);
        if (b[0] !== g.a[0] || b[1] !== g.a[1]) {
          app.checkpoint();
          app.addWirePath(this.lPath(g.a, b, g.hFirst));
          app.commit();
        }
        this.chain = null;
        break;
      }
      case 'erase':
        if (!g.moved) this.eraseAt(p, g);
        if (g.erased) app.commit();
        break;
      case 'place':
        this.placeGhost(p);
        app.placeGhostNow(e.pointerType !== 'mouse' || !e.shiftKey);
        break;
      case 'port':
        this.portTap(p, e.pointerType);
        break;
      default: break;
    }
    app.requestRender();
  };

  Editor.prototype.cancel = function (e) {
    this.ptrs.delete(e.pointerId);
    if (this.pinch && this.ptrs.size < 2) this.pinch = null;
    if (this.g && this.g.id === e.pointerId) this.abortGesture();
  };

  Editor.prototype.abortGesture = function () {
    const g = this.g, app = this.app;
    if (!g) return;
    clearTimeout(g.longTimer);
    if (g.mode === 'move' && g.moved) {
      // put everything back
      for (const [w, pos] of g.railOrig || []) Object.assign(w, pos);
      for (const o of g.orig) Object.assign(o.obj, o.pos);
      const tmp = new Set((g.temps || []).concat(g.orig.filter(o => o.added).map(o => o.obj)));
      app.circuit.wires = app.circuit.wires.filter(w => !tmp.has(w));
      if (g.cp) app.dropCheckpoint();
      app.circuitChanged();
    }
    if (g.mode === 'endpoint' && g.moved && g.cp) { app.undo(true); }
    if (g.mode === 'erase' && g.erased) app.undo(true);
    app.overlay.band = null; app.overlay.wirePath = null; app.overlay.snap = null;
    this.g = null;
    app.requestRender();
  };

  /* ---------- taps ---------- */
  Editor.prototype.tap = function (g, p, e) {
    const app = this.app;
    const h = g.hit;
    const now = performance.now();
    const id = h ? (h.comp ? h.comp.id : h.wire ? h.wire.id : null) : null;
    const touch = g.type !== 'mouse';
    const dbl = this.lastTap && now - this.lastTap.t < (touch ? 550 : 380) && this.lastTap.id === id && Math.hypot(p.sx - this.lastTap.sx, p.sy - this.lastTap.sy) < (touch ? 36 : 24);
    this.lastTap = { t: now, id, sx: p.sx, sy: p.sy };
    if (!h) {
      if (!g.shift) app.select([]);
      return;
    }
    if (g.shift && id) { app.toggleSel(id); return; }
    if (id) app.select([id]);
    if (dbl && id) { app.openProps(true); this.lastTap = null; }
  };

  Editor.prototype.chainTap = function (g, p, e) {
    const app = this.app;
    const h = g.hit;
    const b = h && (h.kind === 'term' || h.kind === 'wend') ? h.pt : this.snap(p);
    if (!this.chain) {
      this.chain = { pt: b, first: true };
      app.overlay.snap = b;
      app.hint(app.t('tool_wire_tip'));
      return;
    }
    const a = this.chain.pt;
    if (a[0] === b[0] && a[1] === b[1]) { this.chain = null; app.overlay.wirePath = null; app.hint(null); return; }
    const conn = this.isConn(b[0], b[1]);
    app.checkpoint();
    app.addWirePath(this.lPath(a, b, Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1])));
    app.commit();
    if (conn && !this.chain.first) { this.chain = null; app.overlay.wirePath = null; app.hint(null); }
    else this.chain = { pt: b, first: false };
  };

  Editor.prototype.portTap = function (p, type) {
    const app = this.app;
    const h = this.hit(p.x, p.y, type);
    if (!h) return;
    if (h.kind === 'comp' && C.TYPES[h.comp.type].terms.length === 2 && h.comp.type !== 'ground') { app.portFromComp(h.comp); return; }
    let pt = null;
    if (h.kind === 'term' || h.kind === 'wend') pt = h.pt;
    else if (h.kind === 'wire') {
      // nearest grid point on the wire
      const w = h.wire, s = this.snap(p);
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy;
      let t = L2 ? ((s[0] - w.x1) * dx + (s[1] - w.y1) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      pt = [Math.round(w.x1 + t * dx), Math.round(w.y1 + t * dy)];
      if (distSeg(pt[0], pt[1], w.x1, w.y1, w.x2, w.y2) > 1e-9) pt = [w.x1, w.y1];
    } else if (h.kind === 'comp') {
      const ts = C.terminals(h.comp);
      let bd = Infinity;
      for (const t of ts) { const d = Math.hypot(t[0] - p.x, t[1] - p.y); if (d < bd) { bd = d; pt = t; } }
    }
    if (pt) app.portPick(pt);
  };

  /* ---------- moving ---------- */
  Editor.prototype.startMove = function (g) {
    const app = this.app;
    // a dragged vertex moves alone: no component and no rigid wire, only the wire ends at that point
    const comps = g.vertex ? [] : app.circuit.comps.filter(c => app.sel.has(c.id));
    const wires = g.vertex ? [] : app.circuit.wires.filter(w => app.sel.has(w.id));
    const moving = g.vertex ? new Set() : app.sel;
    g.orig = [];
    for (const c of comps) g.orig.push({ obj: c, pos: { x: c.x, y: c.y } });
    for (const w of wires) g.orig.push({ obj: w, pos: { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 } });
    // rubber band: wires attached to what moves follow it (Alt + drag does the opposite of the setting)
    const rubber = !!app.settings.rubber !== !!g.alt;
    const pts = new Set();
    for (const c of comps) for (const [x, y] of C.terminals(c)) pts.add(x + ',' + y);
    for (const w of wires) { pts.add(w.x1 + ',' + w.y1); pts.add(w.x2 + ',' + w.y2); }
    if (g.vertex) pts.add(g.vpt[0] + ',' + g.vpt[1]);
    g.oldPts = pts;   // where dead ends may be left behind, for the clean-up at the end
    g.stretch = [];
    g.temps = [];
    for (const w of app.circuit.wires) {
      if (moving.has(w.id) || (!rubber && !g.vertex)) continue;
      const e1 = pts.has(w.x1 + ',' + w.y1), e2 = pts.has(w.x2 + ',' + w.y2);
      if (!e1 && !e2) continue;
      g.orig.push({ obj: w, pos: { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 } });
      // fixed end F and moving end M (or both ends moving: the wire is just translated)
      g.stretch.push({ w, both: e1 && e2, F: e1 ? [w.x2, w.y2] : [w.x1, w.y1], M: e1 ? [w.x1, w.y1] : [w.x2, w.y2], x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
    }
    // direct contacts with things that stay put (a terminal on a terminal, or on the middle of a wire)
    // get a new wire, so that the connection survives the move
    if (rubber || g.vertex) {
      const movingPts = [];
      for (const c of comps) for (const t of C.terminals(c)) movingPts.push(t);
      for (const w of wires) movingPts.push([w.x1, w.y1], [w.x2, w.y2]);
      if (g.vertex) movingPts.push(g.vpt);
      const fixedTerms = [];
      for (const c of app.circuit.comps) if (!moving.has(c.id)) for (const t of C.terminals(c)) fixedTerms.push(t);
      const seen = new Set();
      for (const [x, y] of movingPts) {
        const k = x + ',' + y;
        if (seen.has(k)) continue;
        seen.add(k);
        const touchesTerm = fixedTerms.some(t => t[0] === x && t[1] === y);
        const onWire = app.circuit.wires.some(w => !moving.has(w.id) && distSeg(x, y, w.x1, w.y1, w.x2, w.y2) < 1e-9 && !((w.x1 === x && w.y1 === y) || (w.x2 === x && w.y2 === y)));
        if (!touchesTerm && !onWire) continue;
        const w = { id: app.newWireId(), x1: x, y1: y, x2: x, y2: y };
        app.circuit.wires.push(w);
        g.orig.push({ obj: w, pos: { x1: x, y1: y, x2: x, y2: y }, added: true });
        g.stretch.push({ w, both: false, F: [x, y], M: [x, y], x1: x, y1: y, x2: x, y2: y });
      }
    }
    g.comps = comps; g.wires = wires;
    g.delta = [0, 0];
    g.railOrig = new Map();
  };

  // A stretched wire keeps right angles. A wire perpendicular to the motion is carried along with what
  // moves, its far end sliding along the wire it hangs on (a rail), so that e.g. a resistor between two
  // rails moves with its two leads. When the far end cannot slide, the wire is re-routed from it with
  // horizontal and vertical pieces (extra pieces are temporary wires until the drop).
  Editor.prototype.routeStretched = function (g) {
    const app = this.app;
    for (const [w, pos] of g.railOrig) Object.assign(w, pos);
    const tmp = new Set(g.temps);
    app.circuit.wires = app.circuit.wires.filter(w => !tmp.has(w));
    g.temps = [];
    const one = g.stretch.filter(s => !s.both);
    const exclude = new Set(g.stretch.map(s => s.w).concat(g.wires));
    for (const s of one) { s.w.x1 = s.F[0]; s.w.y1 = s.F[1]; s.w.x2 = s.F[0]; s.w.y2 = s.F[1]; }
    const slid = new Map();
    const [dx, dy] = g.delta;
    for (const s of one) {
      const M = [s.M[0] + dx, s.M[1] + dy];
      const vert = s.x1 === s.x2 && s.y1 !== s.y2, horiz = s.y1 === s.y2 && s.x1 !== s.x2;
      const slide = vert ? [dx, 0] : horiz ? [0, dy] : [0, 0];
      let F = s.F;
      if (slide[0] || slide[1]) {
        const k = F[0] + ',' + F[1];
        if (!slid.has(k)) slid.set(k, this.slidePoint(g, F, slide, exclude));
        if (slid.get(k)) F = slid.get(k);
      }
      const path = (F[0] === M[0] && F[1] === M[1]) || F[0] === M[0] || F[1] === M[1] ? [F, M] : this.lPath(F, M, horiz);
      s.w.x1 = path[0][0]; s.w.y1 = path[0][1]; s.w.x2 = path[1][0]; s.w.y2 = path[1][1];
      for (let i = 1; i + 1 < path.length; i++) {
        const t = { id: app.newWireId(), x1: path[i][0], y1: path[i][1], x2: path[i + 1][0], y2: path[i + 1][1] };
        app.circuit.wires.push(t); g.temps.push(t);
      }
    }
  };

  // Slide the fixed point F by `d` along the wires that hold it, if that keeps every connection:
  // no component terminal there, no wire across the motion, and a point in the middle of a rail must stay on it.
  // Returns the new point, or null.
  Editor.prototype.slidePoint = function (g, F, d, exclude) {
    const app = this.app;
    const [x, y] = F, F2 = [x + d[0], y + d[1]];
    const alongX = d[0] !== 0;
    for (const c of app.circuit.comps) if (!g.comps.includes(c)) for (const t of C.terminals(c)) if (t[0] === x && t[1] === y) return null;
    const ends = [];
    for (const w of app.circuit.wires) {
      if (exclude.has(w) || (w.x1 === w.x2 && w.y1 === w.y2)) continue;
      const parallel = alongX ? w.y1 === w.y2 : w.x1 === w.x2;
      const e1 = w.x1 === x && w.y1 === y, e2 = w.x2 === x && w.y2 === y;
      if (e1 || e2) { if (!parallel) return null; ends.push([w, e1 ? 1 : 2]); continue; }
      if (distSeg(x, y, w.x1, w.y1, w.x2, w.y2) < 1e-9) {
        // F sits in the middle of this wire: it may only slide along it and stay on it
        if (!parallel || distSeg(F2[0], F2[1], w.x1, w.y1, w.x2, w.y2) > 1e-9) return null;
      }
    }
    for (const [w, end] of ends) {
      if (!g.railOrig.has(w)) g.railOrig.set(w, { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
      if (end === 1) { w.x1 = F2[0]; w.y1 = F2[1]; } else { w.x2 = F2[0]; w.y2 = F2[1]; }
    }
    return F2;
  };

  Editor.prototype.doMove = function (g, p) {
    // dead zone: a slow double tap or a trembling finger must not shift anything by one grid step
    const dz = g.type === 'touch' ? 0.8 : g.type === 'pen' ? 0.65 : 0.5;
    const fx = p.x - g.start.x, fy = p.y - g.start.y;
    const dx = Math.abs(fx) < dz ? 0 : Math.round(fx), dy = Math.abs(fy) < dz ? 0 : Math.round(fy);
    if (dx === g.delta[0] && dy === g.delta[1]) return;
    if (!g.cp) { this.app.checkpoint(); g.cp = true; }
    g.delta = [dx, dy];
    for (const o of g.orig) {
      if (o.pos.x !== undefined && g.comps.includes(o.obj)) { o.obj.x = o.pos.x + dx; o.obj.y = o.pos.y + dy; }
    }
    for (const w of g.wires) {
      const o = g.orig.find(q => q.obj === w).pos;
      w.x1 = o.x1 + dx; w.y1 = o.y1 + dy; w.x2 = o.x2 + dx; w.y2 = o.y2 + dy;
    }
    for (const s of g.stretch) if (s.both) { s.w.x1 = s.x1 + dx; s.w.y1 = s.y1 + dy; s.w.x2 = s.x2 + dx; s.w.y2 = s.y2 + dy; }
    this.routeStretched(g);
    this.app.circuitChanged(true);
  };

  Editor.prototype.endMove = function (g) {
    const app = this.app;
    if (g.delta[0] === 0 && g.delta[1] === 0) {
      for (const [w, pos] of g.railOrig || []) Object.assign(w, pos);
      for (const o of g.orig) Object.assign(o.obj, o.pos);
      const tmp = new Set(g.temps.concat(g.orig.filter(o => o.added).map(o => o.obj)));
      app.circuit.wires = app.circuit.wires.filter(w => !tmp.has(w));
      if (g.cp) app.dropCheckpoint();
      app.circuitChanged();
      return;
    }
    app.cleanWires();
    // merge the new pieces with their neighbours and trim what was left dangling behind
    DCS.tidy.afterMove(app, g.oldPts);
    app.commit();
  };

  Editor.prototype.bandSelect = function (band, add) {
    const app = this.app, v = app.view;
    const x0 = (Math.min(band[0], band[2]) - v.ox) / v.scale, x1 = (Math.max(band[0], band[2]) - v.ox) / v.scale;
    const y0 = (Math.min(band[1], band[3]) - v.oy) / v.scale, y1 = (Math.max(band[1], band[3]) - v.oy) / v.scale;
    const ids = add ? new Set(app.sel) : new Set();
    for (const c of app.circuit.comps) {
      const b = C.bounds(c);
      if (b[0] >= x0 - 0.3 && b[2] <= x1 + 0.3 && b[1] >= y0 - 0.3 && b[3] <= y1 + 0.3) ids.add(c.id);
      else if (c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1) ids.add(c.id);
    }
    // every wire the rectangle touches (Liang–Barsky clipping of the segment against the rectangle)
    const touches = (w) => {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      let t0 = 0, t1 = 1;
      for (const [p, q] of [[-dx, w.x1 - x0], [dx, x1 - w.x1], [-dy, w.y1 - y0], [dy, y1 - w.y1]]) {
        if (p === 0) { if (q < 0) return false; continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
      }
      return true;
    };
    for (const w of app.circuit.wires) if (touches(w)) ids.add(w.id);
    app.select(Array.from(ids));
  };

  /* ---------- erase ---------- */
  Editor.prototype.eraseAt = function (p, g) {
    const app = this.app;
    const h = this.hit(p.x, p.y, g.type, { noTerms: false });
    let id = null;
    if (h) id = h.comp ? h.comp.id : h.wire ? h.wire.id : null;
    if (!id) return;
    if (!g.erased) { app.checkpoint(); g.erased = true; }
    app.removeIds([id]);
    app.circuitChanged(true);
  };

  /* ---------- placing ---------- */
  Editor.prototype.placeGhost = function (p) {
    const app = this.app;
    if (!app.place) return;
    const gh = { type: app.place.type, x: Math.round(p.x), y: Math.round(p.y), rot: app.place.rot, flip: app.place.flip, props: app.place.props };
    // keep the terminals on the grid when the pointer is not over the centre of a cell
    app.overlay.ghost = gh;
  };

  /* ---------- hover (mouse) ---------- */
  Editor.prototype.hover = function (p, e) {
    const app = this.app;
    if (app.tool === 'place') { this.placeGhost(p); app.requestRender(); return; }
    const h = this.hit(p.x, p.y, 'mouse');
    let cursor = 'default';
    app.hover = null;
    app.overlay.snap = null;
    if (app.tool === 'wire') {
      cursor = 'crosshair';
      const b = this.endSnap(p, 'mouse');
      app.overlay.snap = b; app.overlay.snapHot = this.isConn(b[0], b[1]);
      if (this.chain) app.overlay.wirePath = this.lPath(this.chain.pt, b, Math.abs(b[0] - this.chain.pt[0]) >= Math.abs(b[1] - this.chain.pt[1]));
    } else if (app.tool === 'erase') {
      cursor = h ? 'pointer' : 'default';
      if (h) app.hover = { id: h.comp ? h.comp.id : h.wire.id };
    } else if (app.tool === 'port') {
      cursor = h ? 'pointer' : 'default';
      if (h && (h.kind === 'term' || h.kind === 'wend')) { app.overlay.snap = h.pt; app.overlay.snapHot = true; }
      else if (h) app.hover = { id: h.comp ? h.comp.id : h.wire.id };
    } else if (app.renderer.markAt(p.sx, p.sy, 1) && app.sel.has(app.renderer.markAt(p.sx, p.sy, 1).id) && !this.onBody(h, p)) {
      cursor = 'pointer';
      app.tip({ kind: 'mark' }, p);
      this.cv.style.cursor = cursor;
      app.requestRender();
      return;
    } else if (h) {
      if (h.kind === 'term') { cursor = 'crosshair'; app.overlay.snap = h.pt; app.overlay.snapHot = true; }
      else if (h.kind === 'wend') { cursor = 'move'; app.overlay.snap = h.pt; app.overlay.snapHot = false; }
      else if (h.kind === 'comp' && h.comp.type === 'pot' && this.onKnob(h.comp, p)) { cursor = 'grab'; app.hover = { id: h.comp.id }; }
      else if (h.kind === 'comp' && h.comp.type === 'pot' && this.onWiper(h.comp, p)) { cursor = (h.comp.rot || 0) % 2 ? 'ns-resize' : 'ew-resize'; app.hover = { id: h.comp.id }; }
      else { cursor = 'move'; app.hover = { id: h.comp ? h.comp.id : h.wire.id }; }
    }
    this.cv.style.cursor = cursor;
    app.tip(h, p);
    app.requestRender();
  };

  /* ---------- zoom ---------- */
  Editor.prototype.wheel = function (e) {
    e.preventDefault();
    const p = this.world(e);
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    const k = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018));
    this.app.zoomAt(k, p.sx, p.sy);
  };

  Editor.prototype.startPinch = function () {
    const [a, b] = Array.from(this.ptrs.values());
    this.pinch = { d0: Math.hypot(a.sx - b.sx, a.sy - b.sy) || 1, m0: [(a.sx + b.sx) / 2, (a.sy + b.sy) / 2], view0: Object.assign({}, this.app.view) };
  };
  Editor.prototype.updatePinch = function () {
    const pts = Array.from(this.ptrs.values());
    if (pts.length < 2) return;
    const [a, b] = pts, P = this.pinch, app = this.app;
    const d = Math.hypot(a.sx - b.sx, a.sy - b.sy) || 1;
    const m = [(a.sx + b.sx) / 2, (a.sy + b.sy) / 2];
    const s = Math.max(app.minScale, Math.min(app.maxScale, P.view0.scale * d / P.d0));
    // keep the world point under the first midpoint under the current midpoint
    const wx = (P.m0[0] - P.view0.ox) / P.view0.scale, wy = (P.m0[1] - P.view0.oy) / P.view0.scale;
    app.view.scale = s;
    app.view.ox = m[0] - wx * s;
    app.view.oy = m[1] - wy * s;
    app.viewChanged();
  };

  /* ---------- keyboard ---------- */
  Editor.prototype.key = function (e) {
    const app = this.app;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (app.modalOpen()) { if (e.key === 'Escape') app.closeModal(); return; }
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    if (k === ' ' && !mod) { this.space = true; window.addEventListener('keyup', (ev) => { if (ev.key === ' ') this.space = false; }, { once: true }); }
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) app.redo(); else app.undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); app.redo(); return; }
    if (mod && (k === 'c' || k === 'C')) { e.preventDefault(); app.copySel(); return; }
    if (mod && (k === 'x' || k === 'X')) { e.preventDefault(); app.copySel(); app.deleteSel(); return; }
    if (mod && (k === 'v' || k === 'V')) { e.preventDefault(); app.paste(); return; }
    if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); app.duplicateSel(); return; }
    if (mod && (k === 'a' || k === 'A')) { e.preventDefault(); app.select(app.circuit.comps.map(c => c.id).concat(app.circuit.wires.map(w => w.id))); return; }
    if (mod) return;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); app.deleteSel(); return; }
    if (k === 'Escape') {
      if (this.chain) { this.chain = null; app.overlay.wirePath = null; app.hint(null); app.requestRender(); return; }
      if (this.g) { this.abortGesture(); return; }
      if (app.tool !== 'select') { app.setTool('select'); return; }
      app.select([]);
      return;
    }
    if (k === 'r' || k === 'R') { if (app.tool === 'place') app.rotatePlace(); else app.rotateSel(); return; }
    if (k === 'f' || k === 'F') { if (app.tool === 'place') app.flipPlace(); else app.flipSel(); return; }
    if (k === 'w' || k === 'W') { app.setTool(app.tool === 'wire' ? 'select' : 'wire'); return; }
    if (k === '+' || k === '=') { app.zoomAt(1.25, app.renderer.w / 2, app.renderer.h / 2); return; }
    if (k === '-' || k === '_') { app.zoomAt(0.8, app.renderer.w / 2, app.renderer.h / 2); return; }
    if (k === '0') { app.fit(); return; }
    if (k === 'Enter' && app.sel.size === 1) { app.openProps(true); return; }
    if ((k === '[' || k === ']') && app.sel.size === 1) {
      const c = app.selectedComps()[0];
      if (c && c.type === 'pot') { app.checkpoint(); c.props.alpha = Math.round(100 * Math.max(0, Math.min(1, c.props.alpha + (k === ']' ? 0.05 : -0.05)))) / 100; app.commit(); }
      return;
    }
    if (k.startsWith('Arrow') && app.sel.size) {
      e.preventDefault();
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
      app.nudgeSel(d[0], d[1]);
    }
  };

  /* ---------- palette: tap to choose, drag onto the circuit to place ---------- */
  Editor.prototype.bindPaletteButton = function (btn, type, props) {
    const app = this.app;
    let st = null;
    btn.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      st = { id: e.pointerId, x: e.clientX, y: e.clientY, drag: false };
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    });
    btn.addEventListener('pointermove', (e) => {
      if (!st || st.id !== e.pointerId) return;
      if (!st.drag) {
        const dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (Math.hypot(dx, dy) < 10) return;
        st.drag = true;
        app.setTool('place', { type, props });
      }
      const r = this.cv.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) this.placeGhost(this.world(e));
      else app.overlay.ghost = null;
      app.requestRender();
    });
    const end = (e, cancel) => {
      if (!st || st.id !== e.pointerId) return;
      const wasDrag = st.drag;
      st = null;
      if (cancel) { if (wasDrag) { app.overlay.ghost = null; app.requestRender(); } return; }
      if (!wasDrag) {
        if (app.tool === 'place' && app.place && app.place.type === type && (!props || app.place.props.pol === props.pol)) app.setTool('select');
        else app.setTool('place', { type, props });
        return;
      }
      const r = this.cv.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) { this.placeGhost(this.world(e)); app.placeGhostNow(true); }
      else { app.overlay.ghost = null; app.setTool('select'); }
      app.requestRender();
    };
    btn.addEventListener('pointerup', (e) => end(e, false));
    btn.addEventListener('pointercancel', (e) => end(e, true));
  };

  DCS.Editor = Editor;
})(window);
