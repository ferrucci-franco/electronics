/* DC sweep (transfer characteristic): the chosen quantities (node voltages, the V, I or P of components) plotted
 * against one value of a component (a source voltage, a resistance, β…) that goes from a value to another.
 * First what is measured: a wire (its node voltage, the node gets a letter A, B… if it has no name) or a
 * component (one of its quantities), from the selection toolbar; then what varies: a tap on a component.
 * Optionally a family (one curve for each of a few values of a second value) and the regions of a nonlinear
 * component (cut-off / active / saturation, on / off…) shaded under the curves.
 * The sweep is part of the circuit (circuit.sweep, kept with the tab, the file and the share link):
 *   { x: { id, key, from, to, log } | null, ys: [{ n: [x, y], c } | { id, q, c }],   (c: colour slot)
 *     f: { id, key, vals: [..] } (family, optional), z: id | '' (regions: a component, none; absent: automatic) }
 * Every point is solved from the solution of the previous one (continuation), there and back (hysteresis).
 * A dashed line marks the value the circuit has now; dragging on the plot sets that value in the circuit. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, N = DCS.netlist, S = DCS.solver, U = DCS.units;
  const NPTS = 201, NLIVE = 61, NFAM = 121, MAXFAM = 6;

  // the names of the values, written for the axis (the part after _ is a subscript)
  const PNAME = {
    R: 'R', V: 'V', I: 'I', beta: 'β', alpha: 'α', k: 'k', Vf: 'V_γ', rd: 'r_d', Is: 'I_S', N: 'n', Vbr: 'V_BR', Vz: 'V_Z', rz: 'r_z',
    Imax: 'I_max', Vn: 'V_n', Pn: 'P_n', Vth: 'V_th', Ron: 'R_on', K: 'K', lambda: 'λ', Vbe: 'V_BE', Vcesat: 'V_CEsat', betaR: 'β_R', VA: 'V_A', Vpos: '+V_sat', Vneg: '−V_sat',
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
  const clampP = (p, v) => Math.max(p.min != null ? p.min : -Infinity, Math.min(p.max != null ? p.max : Infinity, v));
  // the default range: a source from −2|value| to +2|value|, any other value from 0 to twice its value
  function defRange(c, p) {
    if (p.key === 'alpha') return [0, 1];
    const v = +c.props[p.key] || 0;
    let a, b;
    if (p.key === 'V' || p.key === 'I') { const m = 2 * Math.abs(v) || (p.key === 'V' ? 10 : 0.01); a = -m; b = m; }
    else if (v > 0) { a = 0; b = 2 * v; }
    else if (v < 0) { a = 2 * v; b = 0; }
    else { a = 0; b = 1; }
    return [clampP(p, a), clampP(p, b)];
  }
  // the default values of a family: half, the value, twice (α: 25, 50, 75 %)
  function defFamily(c, p) {
    if (p.key === 'alpha') return [0.25, 0.5, 0.75];
    const v = +c.props[p.key] || 0;
    const vals = v ? [v / 2, v, 2 * v] : [0, 1, 2];
    return Array.from(new Set(vals.map(x => clampP(p, Number(x.toPrecision(3))))));
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
      case 'mosfet': {
        const p = c.props.pol === 'pmos';
        return [q('vgs', (p ? 'V_SG' : 'V_GS') + ' (' + n + ')', 'V'), q('vds', (p ? 'V_SD' : 'V_DS') + ' (' + n + ')', 'V'),
          q('id', 'I_D (' + n + ')', 'A'), q('p', 'P_' + n, 'W')];
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

  // the components whose regions can be shown, and the regions they go through
  const zoneable = (c) => !!c && (c.type === 'bjt' || c.type === 'mosfet' || c.type === 'opamp' || C.isDiode(c));
  const ZONES = {
    bjt: { off: ['region_off', 'muted'], act: ['region_act', 2], sat: ['region_sat', 'err'] },
    mosfet: { off: ['mos_off', 'muted'], ohm: ['mos_ohm', 'err'], sat: ['mos_sat', 2] },
    opamp: { lin: ['sw_z_lin', 2], sp: ['sw_z_sp', 'err'], sn: ['sw_z_sn', 6] },
    diode: { off: ['sw_z_off', 'muted'], on: ['sw_z_on', 2], bd: ['sw_z_bd', 3] }
  };
  const zoneSet = (c) => ZONES[c.type] || ZONES.diode;

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
   * swept a second time, starting from the end of the way back, so that both ways have the same history.
   * zid: the component whose state (region) is noted at every point of the way there. */
  function run(circuit, sw, n, tempC, zid) {
    const c = circuit.comps.find(q => q.id === sw.x.id);
    const xs = grid(sw.x, n);
    function pass(order, st) {
      const ys = sw.ys.map(() => new Float64Array(n).fill(NaN));
      const zs = new Array(n).fill(null);
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
        if (zid && res.el[zid]) zs[k] = res.el[zid].state || null;
      }
      return { ys, zs, states: prevStates, v: prevV };
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
    if (same(fwd, back)) return { xs, ys: fwd.ys, back: null, zs: fwd.zs };
    fwd = pass(up, back);
    return { xs, ys: fwd.ys, back: same(fwd, back) ? null : back.ys, zs: fwd.zs };
  }
  // the whole sweep: one run, or one for each value of the family
  function runAll(circuit, sw, n, tempC, zid) {
    const f = sw.f && sw.f.vals && sw.f.vals.length && circuit.comps.some(c => c.id === sw.f.id) ? sw.f : null;
    if (!f) return { runs: [Object.assign({ fv: null }, run(circuit, sw, n, tempC, zid))] };
    const runs = f.vals.map(fv => {
      const ckt = { comps: circuit.comps.map(q => (q.id === f.id ? Object.assign({}, q, { props: Object.assign({}, q.props, { [f.key]: fv }) }) : q)), wires: circuit.wires, nodeNames: circuit.nodeNames };
      return Object.assign({ fv }, run(ckt, sw, n, tempC, null));
    });
    return { runs };
  }

  function niceStep(span) {
    if (!(span > 0)) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(span))), m = span / e;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e;
  }

  /* ---------- the window ---------- */
  function init(app, ui) {
    const t = (k, p) => app.t(k, p), tp = (k, p) => app.tp(k, p);
    const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const sub = (s) => DCS.iv.subHtml(s);
    const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
    const btn = (html, fn, cls) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), html); b.type = 'button'; b.addEventListener('click', fn); return b; };
    const fmt = (v, u, d) => U.format(v, u, { digits: d || 3 });
    // a value in a text field: the number with its prefix, the unit is written after the field ("4.7k", "−2")
    const fmtNum = (v) => U.format(v, '', { digits: 4, trim: true }).replace(/\s+/g, '');
    const colOf = (k) => { const col = DCS.render.colors(); return k === 'muted' ? col.muted : k === 'err' ? col.err : DCS.iv.slot(k); };
    const stage = document.getElementById('stage');

    const win = el('div', 'monitor swmon');
    win.hidden = true;
    const head = el('div', 'mon-head');
    const title = el('span', 'mon-title');
    const csvB = btn('CSV', () => exportCSV());
    const closeB = btn('✕', () => { app.checkpoint(); delete app.circuit.sweep; stopPick(); setMax(false); app.commit(); });
    // maximize: the window over the whole circuit area (everything keeps working: cursor, limits, family)
    const maxB = btn('⤢', () => setMax(!win.classList.contains('max')));
    function setMax(on) {
      win.classList.toggle('max', on);
      maxB.textContent = on ? '⤡' : '⤢';
      maxB.title = tp(on ? 'sw_restore' : 'iv_expand');
      requestAnimationFrame(() => { draw(); if (!on) ui.clampFloats(); });
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && win.classList.contains('max') && !win.hidden) { e.stopPropagation(); setMax(false); } }, true);
    head.appendChild(title); head.appendChild(csvB); head.appendChild(maxB); head.appendChild(closeB);
    const xrow = el('div', 'sw-x');
    const orow = el('div', 'sw-x sw-opt');
    const legend = el('div', 'sw-legend');
    const cv = el('canvas', 'mon-cv sw-cv');
    const read = el('div', 'sw-read');
    const grip = el('div', 'mon-grip');
    for (const e of [head, xrow, orow, legend, cv, read, grip]) win.appendChild(e);
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
    const compById = (id) => app.circuit.comps.find(c => c.id === id) || null;
    const xcomp = () => { const s = sw(); return s && s.x ? compById(s.x.id) : null; };
    const xparam = () => { const s = sw(), c = xcomp(); return c ? params(c, app.circuit).find(p => p.key === s.x.key) || null : null; };
    const fcomp = () => { const s = sw(); return s && s.f ? compById(s.f.id) : null; };
    const fparam = () => { const s = sw(), c = fcomp(); return c ? params(c, app.circuit).find(p => p.key === s.f.key) || null : null; };
    // the component whose regions are shaded: the one chosen; automatically, the component measured, else the
    // one that varies, else the only nonlinear one; none with a family (each curve has its own)
    function zcomp() {
      const s = sw();
      if (!s || fcomp()) return null;
      if (s.z === '') return null;
      if (s.z) { const c = compById(s.z); if (zoneable(c)) return c; }
      for (const y of s.ys) { const c = y.id && compById(y.id); if (zoneable(c)) return c; }
      if (zoneable(xcomp())) return xcomp();
      const nl = app.circuit.comps.filter(zoneable);
      return nl.length === 1 ? nl[0] : null;
    }

    // what the curves depend on: everything but the swept value itself (and the window, the colours)
    function keyOf(s) {
      const comps = app.circuit.comps.map(c => (c.id === s.x.id ? Object.assign({}, c, { props: Object.assign({}, c.props, { [s.x.key]: null }) }) : c));
      const z = zcomp();
      return JSON.stringify([comps, app.circuit.wires, app.circuit.nodeNames, s.x, s.ys.map(y => [y.n, y.id, y.q]), s.f || null, z && z.id, app.settings.tempC, Array.from(C.pressed)]);
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
      if (!s.x) startPick('x'); else if (!fresh) app.toast(t('sw_added'));
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

    /* ---------- what varies (x), the family (f): a tap on a component ---------- */
    let picking = null;
    function startPick(what) { picking = what; app.sweepPicking = true; app.hint(t(what === 'f' ? 'sw_pick_f' : 'sw_pick')); render(); }
    function stopPick() { picking = null; app.sweepPicking = false; app.hint(null); }
    // the editor hands over the component tapped while picking; true when it was taken
    function pick(c) {
      const s = sw();
      if (!s) { stopPick(); return false; }
      let ps = params(c, app.circuit);
      // the family: another value than the one swept
      if (picking === 'f' && s.x && c.id === s.x.id) ps = ps.filter(p => p.key !== s.x.key);
      if (!ps.length) { app.toast(tp('sw_noparam', { name: c.name })); return true; }
      const p = ps[0];
      app.checkpoint();
      if (picking === 'f') s.f = { id: c.id, key: p.key, vals: defFamily(c, p) };
      else {
        const [a, b] = defRange(c, p);
        s.x = { id: c.id, key: p.key, from: a, to: b, log: false };
        if (s.f && s.f.id === c.id && s.f.key === p.key) delete s.f;
      }
      stopPick();
      app.commit();
      return true;
    }

    /* ---------- the limits: typed, or changed with the wheel (two fingers on a trackpad) over the field ---------- */
    let wheel = null;
    function onWheel(e, k) {
      const s = sw(), p = xparam();
      if (!s || !s.x || !p) return;
      e.preventDefault();
      if (!wheel) {
        wheel = { acc: 0, step: niceStep(Math.abs(s.x.to - s.x.from) / 40 || Math.abs(s.x[k]) / 20 || 1), timer: 0, started: false };
      }
      wheel.acc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      const n = Math.trunc(wheel.acc / 40);
      clearTimeout(wheel.timer);
      wheel.timer = setTimeout(() => { const w = wheel; wheel = null; if (w && w.started) app.commit(); }, 450);
      if (!n) return;
      wheel.acc -= n * 40;
      let v = s.x[k];
      const dir = n < 0 ? 1 : -1;   // wheel up, fingers up: larger
      for (let i = 0; i < Math.abs(n); i++) {
        if (s.x.log) v = Number((v * Math.pow(10, dir * 0.05)).toPrecision(3));
        else v = Number((Math.round(v / wheel.step + dir) * wheel.step).toPrecision(6));
      }
      v = clampP(p, v);
      if (s.x.log && !(v > 0)) return;
      if (v === s.x[k]) return;
      if (!wheel.started) { wheel.started = true; app.checkpoint(); }
      s.x[k] = v;
      e.target.value = fmtNum(v);
      update(true);
    }
    // a text field for a value, with its unit after it
    function numField(value, unit, title, onSet, wheelKey) {
      const wrap = el('span', 'sw-field');
      const inp = el('input', 'sw-in');
      inp.type = 'text'; inp.value = fmtNum(value); inp.title = title;
      inp.setAttribute('inputmode', 'decimal'); inp.spellcheck = false;
      inp.addEventListener('change', () => {
        const v = U.parse(inp.value);
        if (!isFinite(v)) { inp.value = fmtNum(value); return; }
        onSet(v);
      });
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
      if (wheelKey) inp.addEventListener('wheel', (e) => onWheel(e, wheelKey), { passive: false });
      wrap.appendChild(inp);
      if (unit) wrap.appendChild(el('span', 'sw-unit', esc(unit)));
      return wrap;
    }
    function paramSelect(c, key, skip, onPick) {
      const ps = params(c, app.circuit).filter(p => p.key === key || !skip || p.key !== skip);
      if (ps.length < 2) return null;
      const sel = el('select', 'sw-key');
      for (const p of ps) { const o = el('option', null, sub(PNAME[p.key] || p.key)); o.value = p.key; sel.appendChild(o); }
      sel.value = key;
      sel.addEventListener('change', () => onPick(ps.find(q => q.key === sel.value)));
      return sel;
    }

    /* ---------- the rows: what varies (component, value, range, scale); family and regions ---------- */
    function render() {
      const s = sw(), c = xcomp();
      xrow.innerHTML = ''; orow.innerHTML = '';
      if (!s) return;
      if (!c || picking === 'x') {
        xrow.appendChild(el('span', 'sw-ask', esc(t('sw_pick'))));
        if (c) xrow.appendChild(btn('✕', () => { stopPick(); render(); }, 'sw-cancel'));
        return;
      }
      const cb = btn(esc(c.name), () => startPick('x'), 'sw-comp');
      cb.title = tp('sw_change');
      xrow.appendChild(cb);
      const sel = paramSelect(c, s.x.key, s.f && s.f.id === c.id ? s.f.key : null, (p) => {
        const [a, b] = defRange(c, p);
        app.checkpoint(); Object.assign(s.x, { key: p.key, from: a, to: b, log: false }); app.commit();
      });
      if (sel) xrow.appendChild(sel);
      const p = xparam() || params(c, app.circuit)[0];
      const setLim = (k) => (v) => { app.checkpoint(); s.x[k] = clampP(p, v); if (s.x.log && !(s.x.from > 0 && s.x.to > 0)) s.x.log = false; app.commit(); };
      xrow.appendChild(numField(s.x.from, p.unit, tp('sw_from') + ' · ' + tp('sw_wheel'), setLim('from'), 'from'));
      xrow.appendChild(el('span', 'sw-arrow', '→'));
      xrow.appendChild(numField(s.x.to, p.unit, tp('sw_to') + ' · ' + tp('sw_wheel'), setLim('to'), 'to'));
      if (s.x.from > 0 && s.x.to > 0) {
        const lb = btn('log', () => { app.checkpoint(); s.x.log = !s.x.log; app.commit(); }, 'sw-log' + (s.x.log ? ' on' : ''));
        lb.title = tp('sw_log');
        xrow.appendChild(lb);
      }
      // family
      const fc = fcomp(), fp = fparam();
      if (picking === 'f') {
        orow.appendChild(el('span', 'sw-ask', esc(t('sw_pick_f'))));
        orow.appendChild(btn('✕', () => { stopPick(); render(); }, 'sw-cancel'));
      } else if (fc && fp) {
        orow.appendChild(el('span', 'sw-lab', esc(t('sw_family'))));
        const fb = btn(esc(fc.name), () => startPick('f'), 'sw-comp');
        fb.title = tp('sw_change');
        orow.appendChild(fb);
        const fsel = paramSelect(fc, s.f.key, s.x.id === fc.id ? s.x.key : null, (q) => { app.checkpoint(); s.f.key = q.key; s.f.vals = defFamily(fc, q); app.commit(); });
        if (fsel) orow.appendChild(fsel);
        // the values, separated by ";" or spaces ("1k; 2.2k; 4.7k")
        const vals = el('span', 'sw-field');
        const inp = el('input', 'sw-in wide');
        inp.type = 'text'; inp.spellcheck = false; inp.title = tp('sw_family_vals');
        inp.value = s.f.vals.map(fmtNum).join('; ');
        inp.addEventListener('change', () => {
          const vs = inp.value.split(/[;\s]+/).filter(Boolean).map(x => U.parse(x)).filter(isFinite).map(v => clampP(fp, v)).slice(0, MAXFAM);
          if (!vs.length) { inp.value = s.f.vals.map(fmtNum).join('; '); return; }
          app.checkpoint(); s.f.vals = vs; app.commit();
        });
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
        vals.appendChild(inp);
        if (fp.unit) vals.appendChild(el('span', 'sw-unit', esc(fp.unit)));
        orow.appendChild(vals);
        const fx = btn('✕', () => { app.checkpoint(); delete s.f; app.commit(); }, 'sw-cancel');
        fx.title = tp('sw_family_del');
        orow.appendChild(fx);
      } else {
        const fb = btn('+ ' + esc(t('sw_family')), () => startPick('f'), 'sw-fam');
        fb.title = tp('sw_family_tip');
        orow.appendChild(fb);
      }
      // regions
      const nl = app.circuit.comps.filter(zoneable);
      if (nl.length && !(fc && fp) && picking !== 'f') {
        orow.appendChild(el('span', 'sw-lab sw-zl', esc(t('sw_zones'))));
        const zs = el('select', 'sw-key');
        const z = zcomp();
        zs.appendChild(Object.assign(el('option', null, '—'), { value: '' }));
        for (const q of nl) zs.appendChild(Object.assign(el('option', null, esc(q.name)), { value: q.id }));
        zs.value = z ? z.id : '';
        zs.title = tp('sw_zones_tip');
        zs.addEventListener('change', () => { app.checkpoint(); s.z = zs.value; app.commit(); });
        orow.appendChild(zs);
      }
    }

    function renderLegend(cvs) {
      legend.innerHTML = '';
      const s = sw(), fam = data && data.runs.length > 1 ? data.runs : null;
      s.ys.forEach((y, j) => {
        const cvv = cvs[j];
        if (!cvv) return;
        const off = cvv.u !== axisU;
        const it = el('span', 'sw-item' + (off ? ' off' : ''));
        // with a family the colours are the values of the family, the curves differ by their line
        const swatch = fam ? `<i class="sw ln${dashIdx(s, y)}" style="border-color:var(--fg)"></i>` : `<i class="sw" style="background:${DCS.iv.slot(y.c)}"></i>`;
        const nm = el('span', 'sw-name', swatch + sub(cvv.name));
        if (off) { nm.title = tp('sw_axis'); nm.addEventListener('click', () => { axisU = cvv.u; update(false); }); }
        it.appendChild(nm);
        const x = btn('✕', () => { app.checkpoint(); s.ys.splice(s.ys.indexOf(y), 1); if (!s.ys.length) delete app.circuit.sweep; app.commit(); }, 'sw-del');
        x.title = tp('sw_remove');
        it.appendChild(x);
        legend.appendChild(it);
      });
      if (fam) {
        const fc = fcomp(), fp = fparam();
        // a tap on a value of the family puts it in the circuit: the operating point moves to that curve
        const act = activeFam();
        fam.forEach((r, k) => {
          const it = el('span', 'sw-item sw-fv' + (k === act ? ' on' : ''), `<i class="sw" style="background:${DCS.iv.slot(k)}"></i>` + sub(paramName(fc, s.f.key)) + ' = ' + esc(fmt(r.fv, fp.unit)));
          it.title = tp('sw_fam_use');
          it.addEventListener('click', () => { if (k === activeFam()) return; app.checkpoint(); fc.props[s.f.key] = r.fv; app.liveMark(fc.id, 900); app.commit(); });
          legend.appendChild(it);
        });
      }
      // the regions shaded
      const zc = zcomp();
      if (zc && data && data.runs[0] && data.runs[0].zs) {
        const seen = new Set(data.runs[0].zs.filter(Boolean));
        const zset = zoneSet(zc);
        for (const st of Object.keys(zset)) if (seen.has(st)) legend.appendChild(el('span', 'sw-item', `<i class="sw reg" style="background:${colOf(zset[st][1])}"></i>` + esc(zc.name) + ' ' + esc(t(zset[st][0]))));
      }
    }
    // the line of a curve inside a family: solid, dashed, dotted…
    const DASHES = [null, [7, 4], [2, 3], [9, 3, 2, 3]];
    const dashIdx = (s, y) => s.ys.indexOf(y) % DASHES.length;

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
      if (s.x && !xcomp()) s.x = null;
      if (s.f && (!fcomp() || !fparam())) delete s.f;
      if (!s.x && picking !== 'x') startPick('x');
      const wasHidden = win.hidden;
      win.hidden = false;
      if (wasHidden) requestAnimationFrame(() => { ui.clampFloats(); makeRoom(); });
      csvB.title = tp('sw_csv'); closeB.title = tp('close'); maxB.title = tp(win.classList.contains('max') ? 'sw_restore' : 'iv_expand');
      const cvs = s.ys.map(y => curve(y, app.circuit, net));
      // the unit of the y axis: the one chosen, else that of the first curve
      const units = cvs.filter(Boolean).map(q => q.u);
      if (!units.includes(axisU)) axisU = units[0] || 'V';
      const c = xcomp();
      const names = cvs.filter(q => q && q.u === axisU).map(q => sub(q.name));
      title.innerHTML = (names.length ? names.join(', ') : esc(t('sw_title'))) + (c ? ' <span class="sw-vs">' + esc(t('sw_vs')) + '</span> ' + sub(paramName(c, s.x.key)) : '');
      if (!live) render();
      if (!c) { data = null; spec = null; renderLegend(cvs); draw(); readout(cvs); return; }
      const key = keyOf(s);
      if (key !== dataKey || (!live && !dataFull)) {
        if (live) {
          // while a value is dragged: fewer points, once per frame
          if (!liveRaf) liveRaf = requestAnimationFrame(() => {
            liveRaf = 0;
            const s2 = sw();
            if (!s2 || !s2.x) return;
            data = safeRun(s2, NLIVE); dataKey = keyOf(s2); dataFull = false;
            renderLegend(s2.ys.map(y => curve(y, app.circuit, app.net))); draw();
          });
        } else { data = safeRun(s, s.f ? NFAM : NPTS); dataKey = key; dataFull = true; }
      }
      renderLegend(cvs);
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
      const z = zcomp();
      try { return runAll(app.circuit, s, n, app.settings.tempC, z && z.id); } catch (e) { console.error(e); return null; }
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
    // the curve of the family that the circuit is on now (its value is the one of the component), or −1
    function activeFam() {
      const s = sw(), fc = fcomp();
      if (!fc || !data || data.runs.length < 1 || data.runs[0].fv === null) return -1;
      const v = +fc.props[s.f.key];
      return data.runs.findIndex(r => Math.abs(r.fv - v) <= 1e-9 * Math.max(Math.abs(v), 1e-12));
    }
    // the circuit solved with the swept value x, from the solution now (same branch of a hysteresis loop)
    function valuesAt(x, cvs) {
      const s = sw(), c = xcomp();
      const cx = Object.assign({}, c, { props: Object.assign({}, c.props, { [s.x.key]: x }) });
      const ckt = { comps: app.circuit.comps.map(q => (q === c ? cx : q)), wires: app.circuit.wires, nodeNames: app.circuit.nodeNames };
      const net = N.build(ckt);
      const res = S.solve(net.ckt, { prevStates: app.prevStates, prevV: app.prevV && app.prevV.length === net.ckt.nodeCount ? app.prevV : null, tempC: app.settings.tempC, budget: 400 });
      if (!res.ok) return null;
      return s.ys.map((y, j) => {
        if (!cvs[j]) return NaN;
        const cv2 = curve(y, ckt, net);
        if (!cv2) return NaN;
        return cv2.node != null ? (cv2.node ? res.v[cv2.node] : 0) : qval(res, cv2.c, cv2.q);
      });
    }
    // the slope of every curve at the present value: dY/dX by a small step on each side
    function slopes(cvs) {
      const s = sw(), c = xcomp(), p = xparam();
      if (!c || !p || !app.result || !app.result.ok) return null;
      const xv = +c.props[s.x.key];
      const h = 1e-4 * Math.max(Math.abs(s.x.to - s.x.from), Math.abs(xv), 1e-12);
      let a = xv - h, b = xv + h;
      if (p.min != null && a < p.min) a = xv;
      if (p.max != null && b > p.max) b = xv;
      if (a === b) return null;
      try {
        const ya = a === xv ? now(cvs) : valuesAt(a, cvs), yb = b === xv ? now(cvs) : valuesAt(b, cvs);
        if (!ya || !yb) return null;
        return cvs.map((q, j) => {
          const d = yb[j] - ya[j];
          if (!isFinite(d)) return NaN;
          return Math.abs(d) <= 1e-9 * Math.max(Math.abs(ya[j]), Math.abs(yb[j]), 1e-12) ? 0 : d / (b - a);
        });
      } catch (e) { return null; }
    }
    const slopeUnit = (yu, xu) => (xu ? yu + '/' + xu : yu);
    function readout(cvs) {
      const s = sw(), c = xcomp(), p = xparam();
      if (!c || !p) { read.innerHTML = ''; return; }
      const vals = now(cvs);
      const parts = ['<b>' + sub(paramName(c, s.x.key)) + ' = ' + esc(fmt(c.props[s.x.key], p.unit, 4)) + '</b>'];
      const fam = !!fcomp();
      if (fam) { const fc = fcomp(), fp = fparam(); parts.push(sub(paramName(fc, s.f.key)) + ' = ' + esc(fmt(fc.props[s.f.key], fp.unit))); }
      // each value with its slope (a gain V/V, a transconductance A/V, a resistance V/A…)
      const sl = slopes(cvs);
      const act = activeFam();
      s.ys.forEach((y, j) => {
        if (!cvs[j]) return;
        const k = sl ? sl[j] : NaN;
        const slope = isFinite(k) ? ` <span class="sw-slope">(${esc(t('sw_slope'))} ${esc(U.format(k, slopeUnit(cvs[j].u, p.unit), { digits: 3, zero: 1e-300 }))})</span>` : '';
        const color = fam ? (act >= 0 ? DCS.iv.slot(act) : 'var(--fg)') : DCS.iv.slot(y.c);
        parts.push(`<span style="color:${color}">${sub(cvs[j].name)} = ${esc(fmt(vals[j], cvs[j].u))}</span>${slope}`);
      });
      const zc = zcomp(), res = app.result && app.result.ok ? app.result : null;
      if (zc && res && res.el[zc.id] && zoneSet(zc)[res.el[zc.id].state]) parts.push(esc(zc.name) + ' ' + esc(t(zoneSet(zc)[res.el[zc.id].state][0])));
      read.innerHTML = parts.join(' · ');
    }

    function draw() {
      const s = sw(), c = xcomp(), p = xparam();
      if (win.hidden) return;
      const ctx = cv.getContext('2d');
      const col = DCS.render.colors();
      if (!s || !c || !p || !data) {
        // nothing to plot yet: the question, in the middle
        const dpr = Math.min(3, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
        if (!W || !H) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = col.muted; ctx.font = '13px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(tp(data === null && c ? 'sw_none' : 'sw_pick_short'), W / 2, H / 2);
        spec = null;
        return;
      }
      const cvs = s.ys.map(y => curve(y, app.circuit, app.net));
      const vals = now(cvs);
      const fam = data.runs.length > 1 || data.runs[0].fv !== null;
      const fc = fam ? fcomp() : null, fp = fam ? fparam() : null;
      const series = [], points = [], jumps = [];
      let lo = Infinity, hi = -Infinity;
      const xs = data.runs[0].xs;
      const xv = +c.props[s.x.key];
      const inRange = xv >= Math.min(s.x.from, s.x.to) && xv <= Math.max(s.x.from, s.x.to);
      const act = activeFam();
      const addRuns = (ys, name, color, dash, inline, dim) => {
        let pts = [];
        const flush = () => { if (pts.length > 1) series.push({ name, color, pts, dash, inline, dim, width: dim === false ? 2.6 : 2 }); pts = []; inline = false; };
        for (let k = 0; k < xs.length; k++) {
          const v = ys[k];
          if (!isFinite(v)) { flush(); continue; }
          pts.push([xs[k], v]);
          if (v < lo) lo = v; if (v > hi) hi = v;
        }
        flush();
      };
      data.runs.forEach((r, fi) => {
        s.ys.forEach((y, j) => {
          const cvv = cvs[j];
          if (!cvv || cvv.u !== axisU || !r.ys[j]) return;
          const color = fam ? DCS.iv.slot(fi) : DCS.iv.slot(y.c);
          const dash = fam ? DASHES[dashIdx(s, y)] : null;
          // a family: the value of each curve written at its end (on the first quantity only)
          const nm = fam ? fmt(r.fv, fp.unit) : cvv.name;
          // with a family, the curve the circuit is on now stands out (the others lighter)
          const dim = fam && act >= 0 ? fi !== act : undefined;
          addRuns(r.ys[j], nm, color, dash, fam && j === s.ys.findIndex((q, i) => cvs[i] && cvs[i].u === axisU), dim);
          // the way back, when it is another curve (hysteresis)
          if (r.back && r.back[j]) {
            addRuns(r.back[j], nm, color, dash, false, dim);
            jumps.push({ ys: r.ys[j], up: true, color }, { ys: r.back[j], up: false, color });
          }
          if (!fam && isFinite(vals[j]) && inRange) points.push({ v: xv, i: vals[j], small: true, color });
        });
      });
      // with a family, the point of the circuit now (between the curves when its value is not one of them)
      if (fam && inRange) s.ys.forEach((y, j) => { if (cvs[j] && cvs[j].u === axisU && isFinite(vals[j])) points.push({ v: xv, i: vals[j], small: true, color: act >= 0 ? DCS.iv.slot(act) : col.fg }); });
      if (!isFinite(lo)) { lo = -1; hi = 1; }
      let span = hi - lo;
      if (span < 1e-12 * Math.max(1, Math.abs(hi))) { const m = Math.abs(hi) * 0.1 || 1; lo -= m; hi += m; span = hi - lo; }
      const x0 = Math.min(s.x.from, s.x.to), x1 = Math.max(s.x.from, s.x.to);
      const lg = !!s.x.log && x0 > 0;
      const pw = { v0: x0, v1: x1 > x0 ? x1 : x0 + 1, i0: lo - 0.08 * span, i1: hi + 0.08 * span };
      // the regions of the chosen component, as bands from one point to the next
      const regions = [];
      const zc = zcomp(), zs = !fam && data.runs[0].zs;
      if (zc && zs) {
        const zset = zoneSet(zc);
        let k0 = 0;
        for (let k = 1; k <= xs.length; k++) {
          if (k < xs.length && zs[k] === zs[k0]) continue;
          const st = zs[k0];
          if (st && zset[st]) {
            const a = k0 === 0 ? pw.v0 : (lg ? Math.sqrt(xs[k0 - 1] * xs[k0]) : (xs[k0 - 1] + xs[k0]) / 2);
            const b = k === xs.length ? pw.v1 : (lg ? Math.sqrt(xs[k - 1] * xs[k]) : (xs[k - 1] + xs[k]) / 2);
            regions.push({ v0: Math.min(a, b), v1: Math.max(a, b), i0: pw.i0, i1: pw.i1, color: colOf(zset[st][1]) });
          }
          k0 = k;
        }
      }
      const yn = cvs.filter(q => q && q.u === axisU);
      spec = {
        win: pw, xlab: paramName(c, s.x.key), ylab: yn.length === 1 ? yn[0].name : axisU, xu: p.unit, yu: axisU, xlog: lg,
        series, points, lines: [{ vt: xv }], regions
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
      return clampP(p, v);
    };
    cv.addEventListener('pointerdown', (e) => {
      if (!spec || !xcomp()) return;
      e.preventDefault();
      drag = { id: e.pointerId, c: xcomp(), key: sw().x.key, moved: false };
      app.checkpoint();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      // with a family, a press on (or near) another curve puts its value in the circuit
      const k = nearFam(e);
      const fc = fcomp(), s = sw();
      if (k >= 0 && k !== activeFam()) { fc.props[s.f.key] = data.runs[k].fv; drag.moved = true; }
      if (!setVal(valueAt(e)) && drag.moved) app.circuitChanged(true);
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
      if (!drag || drag.c.props[drag.key] === v) return false;
      drag.c.props[drag.key] = v; drag.moved = true;
      app.liveMark(drag.c.id, 0);
      app.circuitChanged(true);
      return true;
    }
    // the curve of the family under the pointer (within 14 px), or −1
    function nearFam(e) {
      const s = sw();
      if (!spec || !data || data.runs.length < 2 || data.runs[0].fv === null) return -1;
      const b = cv.getBoundingClientRect(), px = e.clientX - b.left, py = e.clientY - b.top;
      const xs = data.runs[0].xs, x = DCS.iv.xInv(spec, cv.clientWidth, px);
      let kx = 0;
      for (let k = 1; k < xs.length; k++) if (Math.abs(xs[k] - x) < Math.abs(xs[kx] - x)) kx = k;
      const P = DCS.iv.PAD, w = spec.win, H = cv.clientHeight;
      const Y = (v) => H - P.B - (v - w.i0) / (w.i1 - w.i0) * (H - P.T - P.B);
      const cvs = s.ys.map(y => curve(y, app.circuit, app.net));
      let best = -1, bd = 14;
      data.runs.forEach((r, fi) => s.ys.forEach((y, j) => {
        if (!cvs[j] || cvs[j].u !== axisU) return;
        for (const ys of [r.ys[j], r.back && r.back[j]]) {
          if (!ys || !isFinite(ys[kx])) continue;
          const d = Math.abs(Y(ys[kx]) - py);
          if (d < bd) { bd = d; best = fi; }
        }
      }));
      return best;
    }

    function exportCSV() {
      const s = sw(), c = xcomp();
      if (!s || !c || !data || !dataFull) return;
      const cvs = s.ys.map(y => curve(y, app.circuit, app.net));
      const p = xparam();
      const plain = (n, u) => n.replace(/_/g, '') + (u ? ' (' + u + ')' : '');
      const fc = fcomp(), fp = fparam();
      const cols = [plain(paramName(c, s.x.key), p.unit)];
      const xs = data.runs[0].xs;
      const colsData = [];
      for (const r of data.runs) {
        const tag = r.fv !== null && fc ? ' [' + plain(paramName(fc, s.f.key), '') + '=' + fmt(r.fv, fp.unit) + ']' : '';
        cvs.forEach((q, j) => {
          if (!q) return;
          cols.push(plain(q.name, q.u) + tag); colsData.push(r.ys[j]);
          if (r.back && r.back[j]) { cols.push(plain(q.name, q.u) + tag + ' ←'); colsData.push(r.back[j]); }
        });
      }
      const lines = [cols.map(x => '"' + x.replace(/"/g, '') + '"').join(',')];
      for (let k = 0; k < xs.length; k++) lines.push([xs[k]].concat(colsData.map(ys => ys[k])).map(v => (isFinite(v) ? Number(v.toPrecision(8)) : '')).join(','));
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
      const fam = !!fcomp();
      for (const y of s.ys) {
        if (!y.n) continue;
        const nd = app.net.nodeOf(y.n[0], y.n[1]);
        if (nd == null) continue;
        out.push({ pt: y.n, name: app.net.nodes[nd].name, color: fam ? DCS.render.colors().fg : DCS.iv.slot(y.c) });
      }
      return out;
    }

    return { update, fromSelection, canMeasure, pick, probes, stopPick };
  }

  DCS.sweep = { init, params, quantities, run, runAll, defRange, defFamily, paramName };
})(window);
