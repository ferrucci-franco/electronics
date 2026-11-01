/* DC sweep (transfer characteristic): the chosen quantities (node voltages, the V, I or P of components) plotted
 * against one value of a component (a source voltage, a resistance, β…) that goes from a value to another.
 * First what is measured: a wire (its node voltage, the node gets a letter A, B… if it has no name) or a
 * component (one of its quantities), from the selection toolbar; then what varies: a tap on a component.
 * The sweep is part of the circuit (circuit.sweep, kept with the tab, the file and the share link):
 *   { x: { id, key, from, to, log } | null, ys: [{ n: [x, y], c } | { id, q, c }] }   (c: colour slot)
 * Every point is solved from the solution of the previous one (continuation). A dashed line marks the value
 * the circuit has now; dragging on the plot sets that value in the circuit. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, N = DCS.netlist, S = DCS.solver, U = DCS.units;
  const NPTS = 201, NLIVE = 61;

  // the names of the values, written for the axis (the part after _ is a subscript)
  const PNAME = {
    R: 'R', V: 'V', I: 'I', beta: 'β', alpha: 'α', k: 'k', Vf: 'V_γ', rd: 'r_d', Is: 'I_S', N: 'n', Vbr: 'V_BR', Vz: 'V_Z', rz: 'r_z',
    Imax: 'I_max', Vn: 'V_n', Pn: 'P_n', Vbe: 'V_BE', Vcesat: 'V_CEsat', betaR: 'β_R', VA: 'V_A', Vpos: '+V_sat', Vneg: '−V_sat',
    VfR: 'V_γR', VfG: 'V_γG', VfB: 'V_γB'
  };
  // the values of a component that can be swept: its numeric properties shown now (the main one first)
  function params(c, circuit) {
    const T = C.TYPES[c.type];
    if (!T) return [];
    const out = [];
    for (const d of T.props) {
      if (d.key === 'alpha') { out.push({ key: 'alpha', unit: '', min: 0, max: 1 }); continue; }
      if (d.type || (d.show && !d.show(c))) continue;
      const unit = typeof d.unit === 'function' ? d.unit(c, circuit) : (d.unit || '');
      out.push({ key: d.key, unit, min: d.min, max: d.max });
    }
    const main = DCS.app && DCS.app.valueKey ? DCS.app.valueKey(c) : null;
    out.sort((a, b) => (b.key === main) - (a.key === main));
    return out;
  }
  // "V1" for the main value of a source or a resistor, "β (Q1)" otherwise
  function paramName(c, key) {
    const main = { resistor: 'R', vsource: 'V', isource: 'I' }[c.type];
    return key === main ? c.name : (PNAME[key] || key) + ' (' + c.name + ')';
  }
  // the default range: a source from −2|value| to +2|value|, any other value from 0 to twice its value
  function defRange(c, p) {
    if (p.key === 'alpha') return [0, 1];
    const v = +c.props[p.key] || 0;
    let a, b;
    if (p.key === 'V' || p.key === 'I') { const m = 2 * Math.abs(v) || (p.key === 'V' ? 10 : 0.01); a = -m; b = m; }
    else if (v > 0) { a = 0; b = 2 * v; }
    else if (v < 0) { a = 2 * v; b = 0; }
    else { a = 0; b = 1; }
    a = Math.max(p.min != null ? p.min : -Infinity, a); b = Math.min(p.max != null ? p.max : Infinity, b);
    return [a, b];
  }

  // what can be measured on a component
  function quantities(c) {
    const n = c.name, q = (k, lab, u) => ({ q: k, name: lab, u });
    switch (c.type) {
      case 'ground': return [];
      case 'bjt': {
        const p = c.props.pol === 'pnp';
        return [q('vbe', (p ? 'V_EB' : 'V_BE') + ' (' + n + ')', 'V'), q('vce', (p ? 'V_EC' : 'V_CE') + ' (' + n + ')', 'V'),
          q('ib', 'I_B (' + n + ')', 'A'), q('ic', 'I_C (' + n + ')', 'A'), q('p', 'P_' + n, 'W')];
      }
      case 'opamp': return [q('vout', 'V_o (' + n + ')', 'V'), q('iout', 'I_o (' + n + ')', 'A'), q('vp', 'V_+ (' + n + ')', 'V'), q('vm', 'V_− (' + n + ')', 'V'), q('vd', 'V_d (' + n + ')', 'V')];
      case 'voltmeter': case 'vsense': return [q('v', 'V_' + n, 'V')];
      case 'ammeter': case 'isense': return [q('i', 'I_' + n, 'A')];
      case 'pot': case 'rgbled': return [q('p', 'P_' + n, 'W')];
      case 'switch': case 'button': return [q('v', 'V_' + n, 'V')];
      default: return [q('v', 'V_' + n, 'V'), q('i', 'I_' + n, 'A'), q('p', 'P_' + n, 'W')];
    }
  }
  // a quantity in a solution (v, i in the reference directions the user chose, as on the circuit)
  function qval(res, c, q) {
    const r = res.el[c.id];
    if (!r) {
      if (q === 'p') { let p = 0, ok = false; for (const k in res.el) if (k.startsWith(c.id + '#')) { p += res.el[k].p; ok = true; } return ok ? p : NaN; }
      return C.isSwitch(c) && q === 'v' ? 0 : NaN;   // a closed switch is a wire
    }
    if (q === 'v' || q === 'i') return r.v === undefined ? NaN : C.signed(c, r)[q];
    if (q === 'p') return r.p;
    return r[q] === undefined ? NaN : r[q];
  }
  // a curve: its component (or node), name and unit; null when it is gone from the circuit
  function curve(y, circuit, net) {
    if (y.n) {
      const nd = net ? net.nodeOf(y.n[0], y.n[1]) : null;
      if (nd == null) return null;
      return { node: nd, name: 'V_' + net.nodes[nd].name, u: 'V' };
    }
    const c = circuit.comps.find(k => k.id === y.id);
    const qq = c && quantities(c).find(k => k.q === y.q);
    return qq ? { c, q: y.q, name: qq.name, u: qq.u } : null;
  }

  function grid(x, n) {
    const out = new Float64Array(n);
    const lg = x.log && x.from > 0 && x.to > 0;
    for (let k = 0; k < n; k++) {
      const f = n > 1 ? k / (n - 1) : 0;
      out[k] = lg ? Math.exp(Math.log(x.from) + f * (Math.log(x.to) - Math.log(x.from))) : x.from + f * (x.to - x.from);
    }
    return out;
  }
  /* The sweep: every point solved from the previous one. It goes there and back: a circuit with memory
   * (positive feedback, a Schmitt trigger) gives two different curves, the hysteresis loop. The way there is
   * swept a second time, starting from the end of the way back, so that both ways have the same history. */
  function run(circuit, sw, n, tempC) {
    const c = circuit.comps.find(q => q.id === sw.x.id);
    const xs = grid(sw.x, n);
    function pass(order, st) {
      const ys = sw.ys.map(() => new Float64Array(n).fill(NaN));
      let prevStates = st ? st.states : {}, prevV = st ? st.v : null;
      for (const k of order) {
        const cx = Object.assign({}, c, { props: Object.assign({}, c.props, { [sw.x.key]: xs[k] }) });
        const ckt = { comps: circuit.comps.map(q => (q === c ? cx : q)), wires: circuit.wires, nodeNames: circuit.nodeNames };
        const net = N.build(ckt);
        const res = S.solve(net.ckt, { prevStates, prevV: prevV && prevV.length === net.ckt.nodeCount ? prevV : null, tempC, budget: 400 });
        if (!res.ok) { prevStates = {}; prevV = null; continue; }
        prevStates = Object.assign({}, prevStates, res.states); prevV = res.v;
        sw.ys.forEach((y, j) => {
          const cv = curve(y, ckt, net);
          if (!cv) return;
          ys[j][k] = cv.node != null ? (cv.node ? res.v[cv.node] : 0) : qval(res, cv.c, cv.q);
        });
      }
      return { ys, states: prevStates, v: prevV };
    }
    const up = [...Array(n).keys()], down = up.slice().reverse();
    let fwd = pass(up, null);
    const back = pass(down, fwd);
    // the same curve both ways (up to the solver's rounding): no memory
    const same = (a, b) => a.ys.every((ys, j) => {
      let m = 0;
      for (let k = 0; k < n; k++) if (isFinite(ys[k])) m = Math.max(m, Math.abs(ys[k]));
      const tol = 1e-6 * Math.max(m, 1e-12);
      for (let k = 0; k < n; k++) { const p = ys[k], q = b.ys[j][k]; if (isFinite(p) !== isFinite(q) || (isFinite(p) && Math.abs(p - q) > tol)) return false; }
      return true;
    });
    if (same(fwd, back)) return { xs, ys: fwd.ys, back: null };
    fwd = pass(up, back);
    return { xs, ys: fwd.ys, back: same(fwd, back) ? null : back.ys };
  }

  /* ---------- the window ---------- */
  function init(app, ui) {
    const t = (k, p) => app.t(k, p), tp = (k, p) => app.tp(k, p);
    const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const sub = (s) => DCS.iv.subHtml(s);
    const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
    const btn = (html, fn, cls) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), html); b.type = 'button'; b.addEventListener('click', fn); return b; };
    const fmt = (v, u, d) => U.format(v, u, { digits: d || 3 });
    const fmtIn = (v, u) => U.format(v, u, { digits: 4, trim: true }).replace(/\s+/g, ' ');
    const stage = document.getElementById('stage');

    const win = el('div', 'monitor swmon');
    win.hidden = true;
    const head = el('div', 'mon-head');
    const title = el('span', 'mon-title');
    const csvB = btn('CSV', () => exportCSV());
    const closeB = btn('✕', () => { app.checkpoint(); delete app.circuit.sweep; app.sweepPicking = false; app.hint(null); app.commit(); });
    head.appendChild(title); head.appendChild(csvB); head.appendChild(closeB);
    const xrow = el('div', 'sw-x');
    const legend = el('div', 'sw-legend');
    const cv = el('canvas', 'mon-cv sw-cv');
    const read = el('div', 'sw-read');
    const grip = el('div', 'mon-grip');
    win.appendChild(head); win.appendChild(xrow); win.appendChild(legend); win.appendChild(cv); win.appendChild(read); win.appendChild(grip);
    stage.appendChild(win);
    ui.dragByHead(win, head);
    ui.floats.push(win);

    // size: the corner at the bottom right (kept)
    const applySize = (sz) => { if (!sz) return; win.style.width = sz.w + 'px'; win.style.right = 'auto'; cv.style.height = sz.h + 'px'; };
    try { applySize(JSON.parse(app.LS.get('dcs.swSize') || 'null')); } catch (e) { /* none */ }
    let rs = null;
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const r = win.getBoundingClientRect(), st = stage.getBoundingClientRect();
      Object.assign(win.style, { left: (r.left - st.left) + 'px', top: (r.top - st.top) + 'px', right: 'auto', bottom: 'auto' });
      rs = { id: e.pointerId, x0: e.clientX, y0: e.clientY, w0: win.offsetWidth, h0: cv.offsetHeight, st, left: r.left, top: r.top };
      try { grip.setPointerCapture(e.pointerId); } catch (_) {}
    });
    grip.addEventListener('pointermove', (e) => {
      if (!rs || rs.id !== e.pointerId) return;
      const maxW = rs.st.right - rs.left - 4, maxH = rs.st.bottom - rs.top - (win.offsetHeight - cv.offsetHeight) - 4;
      applySize({ w: Math.max(260, Math.min(maxW, rs.w0 + e.clientX - rs.x0)), h: Math.max(110, Math.min(maxH, rs.h0 + e.clientY - rs.y0)) });
      draw();
    });
    const endRs = (e) => { if (!rs || rs.id !== e.pointerId) return; rs = null; app.LS.set('dcs.swSize', JSON.stringify({ w: win.offsetWidth, h: cv.offsetHeight })); };
    grip.addEventListener('pointerup', endRs); grip.addEventListener('pointercancel', endRs);

    let data = null, dataKey = '', dataFull = false, axisU = null, spec = null;
    const sw = () => app.circuit.sweep || null;
    const xcomp = () => { const s = sw(); return s && s.x ? app.circuit.comps.find(c => c.id === s.x.id) || null : null; };
    const xparam = () => { const s = sw(), c = xcomp(); return c ? params(c, app.circuit).find(p => p.key === s.x.key) || null : null; };

    // what the curves depend on: everything but the swept value itself (and the window, the colours)
    function keyOf(s) {
      const comps = app.circuit.comps.map(c => (c.id === s.x.id ? Object.assign({}, c, { props: Object.assign({}, c.props, { [s.x.key]: null }) }) : c));
      return JSON.stringify([comps, app.circuit.wires, app.circuit.nodeNames, s.x, s.ys.map(y => [y.n, y.id, y.q]), app.settings.tempC, Array.from(C.pressed)]);
    }

    /* ---------- what is measured: from the selection toolbar ---------- */
    const letters = () => {
      const used = new Set((app.net ? app.net.nodes : []).map(nd => nd.name));
      for (let k = 0; k < 26; k++) { const L = String.fromCharCode(65 + k); if (!used.has(L)) return L; }
      return 'P' + Date.now() % 100;
    };
    function addY(y) {
      const s = sw() || { x: null, ys: [] };
      const same = s.ys.find(o => (y.n && o.n && app.nodeAt(o.n) === app.nodeAt(y.n)) || (y.id && o.id === y.id && o.q === y.q));
      if (same) { app.toast(t('sw_already')); return; }
      app.checkpoint();
      if (y.n) {
        // the node gets a letter, so that it can be found on the circuit and in the tables
        const nd = app.nodeAt(y.n);
        if (nd == null || nd === 0) { app.dropCheckpoint(); app.toast(t('sw_ground')); return; }
        if (/^N\d+$/.test(app.net.nodes[nd].name)) (app.circuit.nodeNames = app.circuit.nodeNames || []).push({ x: y.n[0], y: y.n[1], name: letters() });
      }
      const usedC = new Set(s.ys.map(o => o.c));
      let ci = 0;
      while (usedC.has(ci)) ci++;
      y.c = ci;
      s.ys.push(y);
      const fresh = !app.circuit.sweep;
      app.circuit.sweep = s;
      if (!s.x) startPick(); else if (!fresh) app.toast(t('sw_added'));
      app.commit();
    }
    // the selection toolbar: a wire gives its node voltage; a component, the quantity chosen in a small menu
    const menu = el('div', 'swmenu');
    menu.hidden = true;
    stage.appendChild(menu);
    const closeMenu = () => { menu.hidden = true; };
    document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('[data-act=sweep]')) closeMenu(); }, true);
    function fromSelection(anchor) {
      const id = Array.from(app.sel)[0];
      const w = app.circuit.wires.find(q => q.id === id);
      if (w) { addY({ n: [w.x1, w.y1] }); return; }
      const c = app.circuit.comps.find(q => q.id === id);
      if (!c) return;
      const qs = quantities(c);
      if (!qs.length) return;
      if (qs.length === 1) { addY({ id: c.id, q: qs[0].q }); return; }
      if (!menu.hidden) { closeMenu(); return; }
      menu.innerHTML = '';
      menu.appendChild(el('div', 'swmenu-t', esc(tp('sw_measure'))));
      for (const q of qs) menu.appendChild(btn(sub(q.name), () => { closeMenu(); addY({ id: c.id, q: q.q }); }));
      menu.hidden = false;
      const st = stage.getBoundingClientRect(), b = anchor.getBoundingClientRect();
      const mw = menu.offsetWidth, mh = menu.offsetHeight;
      let x = b.left - st.left + b.width / 2 - mw / 2, y = b.top - st.top - mh - 8;
      if (y < 4) y = b.bottom - st.top + 8;
      x = Math.max(4, Math.min(st.width - mw - 4, x));
      Object.assign(menu.style, { left: x + 'px', top: y + 'px' });
    }
    const canMeasure = () => {
      if (app.sel.size !== 1) return false;
      const id = Array.from(app.sel)[0];
      if (app.circuit.wires.some(w => w.id === id)) return true;
      const c = app.circuit.comps.find(q => q.id === id);
      return !!(c && quantities(c).length);
    };

    /* ---------- what varies: a tap on a component ---------- */
    function startPick() { app.sweepPicking = true; app.hint(t('sw_pick')); render(); }
    function stopPick() { app.sweepPicking = false; app.hint(null); }
    // the editor hands over the component tapped while picking; true when it was taken
    function pick(c) {
      const s = sw();
      if (!s) { stopPick(); return false; }
      const ps = params(c, app.circuit);
      if (!ps.length) { app.toast(tp('sw_noparam', { name: c.name })); return true; }
      const p = ps[0], [a, b] = defRange(c, p);
      app.checkpoint();
      s.x = { id: c.id, key: p.key, from: a, to: b, log: false };
      stopPick();
      app.commit();
      return true;
    }

    /* ---------- the X row: component, value, range, scale ---------- */
    function render() {
      const s = sw(), c = xcomp();
      xrow.innerHTML = '';
      if (!s) return;
      if (!c || app.sweepPicking) {
        xrow.appendChild(el('span', 'sw-ask', esc(t('sw_pick'))));
        if (c) xrow.appendChild(btn('✕', () => { stopPick(); render(); }, 'sw-cancel'));
        return;
      }
      const cb = btn(esc(c.name), () => startPick(), 'sw-comp');
      cb.title = tp('sw_change');
      xrow.appendChild(cb);
      const ps = params(c, app.circuit);
      if (ps.length > 1) {
        const sel = el('select', 'sw-key');
        for (const p of ps) { const o = el('option', null, sub(PNAME[p.key] || p.key)); o.value = p.key; sel.appendChild(o); }
        sel.value = s.x.key;
        sel.addEventListener('change', () => {
          const p = ps.find(q => q.key === sel.value);
          const [a, b] = defRange(c, p);
          app.checkpoint(); Object.assign(s.x, { key: p.key, from: a, to: b, log: false }); app.commit();
        });
        xrow.appendChild(sel);
      }
      const p = xparam() || ps[0];
      const field = (k) => {
        const inp = el('input', 'sw-in');
        inp.type = 'text'; inp.value = fmtIn(s.x[k], p.unit); inp.title = tp(k === 'from' ? 'sw_from' : 'sw_to');
        inp.setAttribute('inputmode', 'decimal'); inp.spellcheck = false;
        inp.addEventListener('change', () => {
          let v = U.parse(inp.value);
          if (!isFinite(v)) { inp.value = fmtIn(s.x[k], p.unit); return; }
          v = Math.max(p.min != null ? p.min : -Infinity, Math.min(p.max != null ? p.max : Infinity, v));
          app.checkpoint(); s.x[k] = v; if (s.x.log && !(s.x.from > 0 && s.x.to > 0)) s.x.log = false; app.commit();
        });
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
        return inp;
      };
      xrow.appendChild(field('from'));
      xrow.appendChild(el('span', 'sw-arrow', '→'));
      xrow.appendChild(field('to'));
      if (s.x.from > 0 && s.x.to > 0) {
        const lb = btn('log', () => { app.checkpoint(); s.x.log = !s.x.log; app.commit(); }, 'sw-log' + (s.x.log ? ' on' : ''));
        lb.title = tp('sw_log');
        xrow.appendChild(lb);
      }
    }

    function renderLegend(cvs) {
      legend.innerHTML = '';
      const s = sw();
      s.ys.forEach((y, j) => {
        const cvv = cvs[j];
        if (!cvv) return;
        const off = cvv.u !== axisU;
        const it = el('span', 'sw-item' + (off ? ' off' : ''));
        const nm = el('span', 'sw-name', `<i class="sw" style="background:${DCS.iv.slot(y.c)}"></i>` + sub(cvv.name));
        if (off) { nm.title = tp('sw_axis'); nm.addEventListener('click', () => { axisU = cvv.u; update(false); }); }
        it.appendChild(nm);
        const x = btn('✕', () => { app.checkpoint(); s.ys.splice(s.ys.indexOf(y), 1); if (!s.ys.length) delete app.circuit.sweep; app.commit(); }, 'sw-del');
        x.title = tp('sw_remove');
        it.appendChild(x);
        legend.appendChild(it);
      });
    }

    /* ---------- refresh: after every change (live: while a value is dragged) ---------- */
    let liveRaf = 0;
    function update(live) {
      const s = sw();
      const hidden = (app.quizHidden && app.quizHidden());
      if (!s || hidden) {
        win.hidden = true; closeMenu();
        if (!s && app.sweepPicking) stopPick();
        return;
      }
      // curves of components that are gone are dropped; a swept component that is gone: pick another one
      const net = app.net;
      s.ys = s.ys.filter(y => y.n || app.circuit.comps.some(c => c.id === y.id));
      if (!s.ys.length) { delete app.circuit.sweep; win.hidden = true; stopPick(); return; }
      if (s.x && !xcomp()) { s.x = null; }
      if (!s.x && !app.sweepPicking) startPick();
      const wasHidden = win.hidden;
      win.hidden = false;
      if (wasHidden) requestAnimationFrame(() => { ui.clampFloats(); makeRoom(); });
      csvB.title = tp('sw_csv'); closeB.title = tp('close');
      const cvs = s.ys.map(y => curve(y, app.circuit, net));
      // the unit of the y axis: the one chosen, else that of the first curve
      const units = cvs.filter(Boolean).map(q => q.u);
      if (!units.includes(axisU)) axisU = units[0] || 'V';
      const c = xcomp();
      const names = cvs.filter(q => q && q.u === axisU).map(q => sub(q.name));
      title.innerHTML = (names.length ? names.join(', ') : esc(t('sw_title'))) + (c ? ' <span class="sw-vs">' + esc(t('sw_vs')) + '</span> ' + sub(paramName(c, s.x.key)) : '');
      if (!live) render();
      renderLegend(cvs);
      if (!c) { data = null; spec = null; draw(); readout(cvs); return; }
      const key = keyOf(s);
      if (key !== dataKey || (!live && !dataFull)) {
        if (live) {
          // while a value is dragged: fewer points, once per frame
          if (!liveRaf) liveRaf = requestAnimationFrame(() => { liveRaf = 0; const s2 = sw(); if (!s2 || !s2.x) return; data = safeRun(s2, NLIVE); dataKey = keyOf(s2); dataFull = false; draw(); });
        } else { data = safeRun(s, NPTS); dataKey = key; dataFull = true; }
      }
      draw();
      readout(cvs);
    }
    // the window has just appeared over the circuit: the circuit is fitted in the room left above it
    function makeRoom() {
      if (win.hidden) return;
      const st = stage.getBoundingClientRect(), r = win.getBoundingClientRect(), b = app.circuitBounds(app.circuit), v = app.view;
      if (!b) return;
      const x0 = st.left + b[0] * v.scale + v.ox, x1 = st.left + b[2] * v.scale + v.ox, y1 = st.top + b[3] * v.scale + v.oy;
      if (y1 > r.top && x1 > r.left && x0 < r.right && r.top - st.top > 130) app.fit({ bottom: st.bottom - r.top - 40 });
    }
    function safeRun(s, n) {
      try { return run(app.circuit, s, n, app.settings.tempC); } catch (e) { console.error(e); return null; }
    }

    // the values now, in the circuit as it is (they follow the cursor)
    function now(cvs) {
      const res = app.result && app.result.ok ? app.result : null;
      return cvs.map(cvv => {
        if (!cvv || !res) return NaN;
        if (cvv.node != null) return cvv.node ? res.v[cvv.node] : 0;
        return qval(res, cvv.c, cvv.q);
      });
    }
    function readout(cvs) {
      const s = sw(), c = xcomp(), p = xparam();
      if (!c || !p) { read.innerHTML = ''; return; }
      const vals = now(cvs);
      const parts = ['<b>' + sub(paramName(c, s.x.key)) + ' = ' + esc(fmt(c.props[s.x.key], p.unit, 4)) + '</b>'];
      s.ys.forEach((y, j) => { if (cvs[j]) parts.push(`<span style="color:${DCS.iv.slot(y.c)}">${sub(cvs[j].name)} = ${esc(fmt(vals[j], cvs[j].u))}</span>`); });
      read.innerHTML = parts.join(' · ');
    }

    function draw() {
      const s = sw(), c = xcomp(), p = xparam();
      if (win.hidden) return;
      const ctx = cv.getContext('2d');
      if (!s || !c || !p || !data) {
        // nothing to plot yet: the question, in the middle
        const dpr = Math.min(3, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
        if (!W || !H) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const col = DCS.render.colors();
        ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = col.muted; ctx.font = '13px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(tp(data === null && c ? 'sw_none' : 'sw_pick_short'), W / 2, H / 2);
        spec = null;
        return;
      }
      const cvs = s.ys.map(y => curve(y, app.circuit, app.net));
      const vals = now(cvs);
      const series = [], points = [], jumps = [];
      let lo = Infinity, hi = -Infinity;
      const xs = data.xs;
      s.ys.forEach((y, j) => {
        const cvv = cvs[j];
        if (!cvv || cvv.u !== axisU) return;
        const ys = data.ys[j];
        if (!ys) return;
        let run = [];
        for (let k = 0; k < xs.length; k++) {
          const v = ys[k];
          if (!isFinite(v)) { if (run.length > 1) series.push({ name: cvv.name, color: DCS.iv.slot(y.c), pts: run }); run = []; continue; }
          run.push([xs[k], v]);
          if (v < lo) lo = v; if (v > hi) hi = v;
        }
        if (run.length > 1) series.push({ name: cvv.name, color: DCS.iv.slot(y.c), pts: run });
        // the way back, when it is another curve (hysteresis)
        const bk = data.back && data.back[j];
        if (bk) {
          run = [];
          for (let k = 0; k < xs.length; k++) {
            const v = bk[k];
            if (!isFinite(v)) { if (run.length > 1) series.push({ name: cvv.name, color: DCS.iv.slot(y.c), pts: run }); run = []; continue; }
            run.push([xs[k], v]);
            if (v < lo) lo = v; if (v > hi) hi = v;
          }
          if (run.length > 1) series.push({ name: cvv.name, color: DCS.iv.slot(y.c), pts: run });
          jumps.push({ ys, up: true, color: DCS.iv.slot(y.c) }, { ys: bk, up: false, color: DCS.iv.slot(y.c) });
        }
        const xv = +c.props[s.x.key];
        if (isFinite(vals[j]) && xv >= Math.min(s.x.from, s.x.to) && xv <= Math.max(s.x.from, s.x.to)) points.push({ v: xv, i: vals[j], small: true, color: DCS.iv.slot(y.c) });
      });
      if (!isFinite(lo)) { lo = -1; hi = 1; }
      let span = hi - lo;
      if (span < 1e-12 * Math.max(1, Math.abs(hi))) { const m = Math.abs(hi) * 0.1 || 1; lo -= m; hi += m; span = hi - lo; }
      const x0 = Math.min(s.x.from, s.x.to), x1 = Math.max(s.x.from, s.x.to);
      const lg = !!s.x.log && x0 > 0;
      const yn = cvs.filter(q => q && q.u === axisU);
      spec = {
        win: { v0: x0, v1: x1 > x0 ? x1 : x0 + 1, i0: lo - 0.08 * span, i1: hi + 0.08 * span },
        xlab: paramName(c, s.x.key), ylab: yn.length === 1 ? yn[0].name : axisU, xu: p.unit, yu: axisU, xlog: lg,
        series, points, lines: [{ vt: +c.props[s.x.key] }], regions: []
      };
      DCS.iv.draw(cv, spec, null);
      // hysteresis: an arrow on the jump of each way (up on the way there, down on the way back)
      if (jumps.length) {
        const W = cv.clientWidth, H = cv.clientHeight, P = DCS.iv.PAD, w = spec.win;
        const lgx = (v) => (lg ? Math.log10(v) : v);
        const X = (v) => P.L + (lgx(v) - lgx(w.v0)) / (lgx(w.v1) - lgx(w.v0)) * (W - P.L - P.R);
        const Y = (v) => H - P.B - (v - w.i0) / (w.i1 - w.i0) * (H - P.T - P.B);
        for (const jm of jumps) {
          let kb = -1, db = 0;
          for (let k = 0; k + 1 < xs.length; k++) { const d = Math.abs(jm.ys[k + 1] - jm.ys[k]); if (isFinite(d) && d > db) { db = d; kb = k; } }
          if (kb < 0 || db < 0.3 * span) continue;
          const [a, b] = jm.up ? [kb, kb + 1] : [kb + 1, kb];
          const x1 = X(xs[a]), y1 = Y(jm.ys[a]), x2 = X(xs[b]), y2 = Y(jm.ys[b]);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
          ctx.fillStyle = jm.color;
          ctx.beginPath(); ctx.moveTo(mx + ux * 7, my + uy * 7); ctx.lineTo(mx - ux * 5 - uy * 6, my - uy * 5 + ux * 6); ctx.lineTo(mx - ux * 5 + uy * 6, my - uy * 5 - ux * 6); ctx.closePath(); ctx.fill();
        }
      }
    }

    /* ---------- the cursor: dragging on the plot sets the value in the circuit ---------- */
    let drag = null;
    const valueAt = (e) => {
      const b = cv.getBoundingClientRect();
      const s = sw(), p = xparam();
      let v = DCS.iv.xInv(spec, cv.clientWidth, e.clientX - b.left);
      v = Number(v.toPrecision(3));
      if (s.x.key === 'alpha') v = Math.round(v * 100) / 100;
      return Math.max(p.min != null ? p.min : -Infinity, Math.min(p.max != null ? p.max : Infinity, v));
    };
    cv.addEventListener('pointerdown', (e) => {
      if (!spec || !xcomp()) return;
      e.preventDefault();
      drag = { id: e.pointerId, c: xcomp(), key: sw().x.key };
      app.checkpoint();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      setVal(valueAt(e));
    });
    cv.addEventListener('pointermove', (e) => { if (drag && drag.id === e.pointerId) setVal(valueAt(e)); });
    const endDrag = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const moved = drag.moved;
      drag = null; app.liveMark(null);
      if (moved) app.commit(); else app.dropCheckpoint();
    };
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
    function setVal(v) {
      if (!drag || drag.c.props[drag.key] === v) return;
      drag.c.props[drag.key] = v; drag.moved = true;
      app.liveMark(drag.c.id, 0);
      app.circuitChanged(true);
    }

    function exportCSV() {
      const s = sw(), c = xcomp();
      if (!s || !c || !data || !dataFull) return;
      const cvs = s.ys.map(y => curve(y, app.circuit, app.net));
      const p = xparam();
      const plain = (n, u) => n.replace(/_/g, '') + (u ? ' (' + u + ')' : '');
      const cols = [plain(paramName(c, s.x.key), p.unit)].concat(cvs.map(q => (q ? plain(q.name, q.u) : '')));
      const lines = [cols.map(x => '"' + x.replace(/"/g, '') + '"').join(',')];
      for (let k = 0; k < data.xs.length; k++) lines.push([data.xs[k]].concat(data.ys.map(ys => ys[k])).map(v => (isFinite(v) ? Number(v.toPrecision(8)) : '')).join(','));
      const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = ((app.tabs[app.tabIdx] && app.tabs[app.tabIdx].name) || 'sweep').replace(/[^\w\- ]+/g, '_') + ' - sweep.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // the probes drawn on the circuit: the nodes measured, with their letter in the colour of the curve
    function probes() {
      const s = sw();
      if (!s || win.hidden || !app.net) return null;
      const out = [];
      for (const y of s.ys) {
        if (!y.n) continue;
        const nd = app.net.nodeOf(y.n[0], y.n[1]);
        if (nd == null) continue;
        out.push({ pt: y.n, name: app.net.nodes[nd].name, color: DCS.iv.slot(y.c) });
      }
      return out;
    }

    return { update, fromSelection, canMeasure, pick, probes, stopPick };
  }

  DCS.sweep = { init, params, quantities, run, defRange, paramName };
})(window);
