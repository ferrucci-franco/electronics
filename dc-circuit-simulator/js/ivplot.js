/* I–V characteristics: curves traced with the solver, operating point, load line, and the plot. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const S = DCS.solver, U = DCS.units, C = DCS.comp;

  // categorical slots (reference palette), light and dark steps
  const SLOTS = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
  };
  const slot = (k) => SLOTS[document.documentElement.classList.contains('dark') ? 'dark' : 'light'][k % 8];

  /* Curve tracer: the elements, seen between nodes a and b, are driven by a swept voltage source in series
   * with a resistance Rs matched to the plot window, so any monotone characteristic (vertical and horizontal
   * pieces included: ideal diode, sources, meters) is followed point by point. */
  function trace(elements, a, b, win, tempC) {
    const map = new Map([[b, 0]]);
    const id = (n) => { if (!map.has(n)) map.set(n, map.size); return map.get(n); };
    id(a);
    const els = elements.map(el => Object.assign({}, el, { n: el.n.map(id) }));
    const A = map.get(a), X = map.size;
    const nodeCount = X + 1;
    const Rs = (win.v1 - win.v0) / (win.i1 - win.i0);
    const vt0 = win.v0 + Rs * win.i0, vt1 = win.v1 + Rs * win.i1;
    const span = vt1 - vt0;
    const pts = [];
    let prevStates = {}, prevV = null;
    const N = 260;
    for (let k = 0; k <= N; k++) {
      const vt = vt0 - 0.05 * span + 1.1 * span * k / N;
      const ckt = { nodeCount, elements: els.concat([{ type: 'VT', id: '__vt', n: [X, 0], V: vt }, { type: 'R', id: '__rs', n: [X, A], R: Rs }]) };
      const r = S.solve(ckt, { prevStates, prevV, tempC, budget: 200 });
      if (!r.ok) continue;
      prevStates = r.states; prevV = r.v;
      pts.push([r.v[A], r.el.__rs.i]);
    }
    return pts;
  }

  /* Which characteristic to show for the current selection */
  function analyse(app) {
    const res = app.result && app.result.ok ? app.result : null;
    if (!res) return null;
    const net = app.net, ckt = net.ckt;
    const sel = app.selectedComps().filter(c => c.type !== 'ground');
    if (app.sel.size !== sel.length && sel.length < 2) return null;
    if (sel.length === 1 && sel[0].type === 'bjt') return { kind: 'bjt', c: sel[0], r: res.el[sel[0].id] };
    if (sel.length === 1 && sel[0].type === 'opamp') return { kind: 'opamp', c: sel[0], r: res.el[sel[0].id] };
    const two = sel.filter(c => C.TYPES[c.type].terms.length === 2);
    if (!two.length || two.length !== sel.length) return null;
    const elOf = new Map(ckt.elements.map(e => [e.id, e]));
    const items = two.map(c => ({ c, el: elOf.get(c.id), n: net.compNodes.get(c.id), r: res.el[c.id] }));
    if (items.some(it => !it.el || !it.r || it.n[0] === it.n[1])) return { kind: 'none', items };
    if (items.length === 1) {
      // oriented with the user's voltage reference: V from its + to its −, I entering through its +
      const it = items[0];
      it.sign = C.refs(it.c).refV ? -1 : 1;
      const [a1, b1] = it.sign > 0 ? [it.n[0], it.n[1]] : [it.n[1], it.n[0]];
      return { kind: 'single', items, a: a1, b: b1, q: [it.sign * it.r.v, it.sign * it.r.i] };
    }
    // parallel: every element on the same pair of nodes
    const a = items[0].n[0], b = items[0].n[1];
    if (items.every(it => (it.n[0] === a && it.n[1] === b) || (it.n[0] === b && it.n[1] === a))) {
      let I = 0;
      for (const it of items) { it.sign = it.n[0] === a ? 1 : -1; I += it.sign * it.r.i; }
      return { kind: 'parallel', items, a, b, q: [res.v[a] - res.v[b], I] };
    }
    // series: the elements form a path whose inner nodes carry no other current
    const deg = new Map();
    for (const it of items) for (const n of it.n) deg.set(n, (deg.get(n) || 0) + 1);
    const ends = Array.from(deg.entries()).filter(([, d]) => d === 1).map(([n]) => n);
    if (ends.length !== 2 || Array.from(deg.values()).some(d => d > 2) || deg.size !== items.length + 1) return { kind: 'none', items };
    const selIds = new Set(items.map(it => it.c.id));
    for (const [n, d] of deg) {
      if (d !== 2) continue;
      for (const e of ckt.elements) {
        if (selIds.has(e.id) || e.type === 'VM') continue;
        const carries = e.type === 'OA' ? [e.n[2]] : e.n;
        if (carries.includes(n)) return { kind: 'none', items };
      }
    }
    // walk the path from the end touching the first element's terminal 1 when possible
    let start = ends.includes(items[0].n[0]) ? items[0].n[0] : ends[0];
    const order = [];
    let cur = start;
    const left = items.slice();
    while (left.length) {
      const k = left.findIndex(it => it.n.includes(cur));
      if (k < 0) return { kind: 'none', items };
      const it = left.splice(k, 1)[0];
      it.sign = it.n[0] === cur ? 1 : -1;
      order.push(it);
      cur = it.sign > 0 ? it.n[1] : it.n[0];
    }
    const first = order[0];
    return { kind: 'series', items: order, a: start, b: cur, q: [res.v[start] - res.v[cur], first.sign * first.r.i] };
  }

  /* nice axis window around the points that matter */
  function windowFor(vals, ivals) {
    const fin = (x) => x !== undefined && isFinite(x);
    const vs = vals.filter(fin).concat([0]), is = ivals.filter(fin).concat([0]);
    let v0 = Math.min(...vs), v1 = Math.max(...vs), i0 = Math.min(...is), i1 = Math.max(...is);
    let dv = v1 - v0, di = i1 - i0;
    if (dv < 1e-9) dv = Math.max(1, Math.abs(v1));
    if (di < 1e-15) di = Math.max(1e-3, Math.abs(i1));
    // room on both sides of the origin, so that reverse / negative behaviour shows
    v0 -= Math.max(0.25 * dv, v0 >= 0 ? 0.35 * dv : 0); v1 += 0.2 * dv;
    i0 -= Math.max(0.15 * di, i0 >= 0 ? 0.25 * di : 0); i1 += 0.2 * di;
    return { v0, v1, i0, i1 };
  }

  function build(app) {
    const A = analyse(app);
    if (!A) return null;
    const t = app.tp, tempC = app.settings.tempC;
    const spec = { kind: A.kind, series: [], lines: [], points: [], xlab: 'V', ylab: 'I', xu: 'V', yu: 'A' };
    if (A.kind === 'bjt') return bjtSpecs(app, A, t, tempC);
    if (A.kind === 'opamp') {
      const c = A.c, r = A.r, p = c.props;
      const vp = p.sat ? Math.max(p.Vpos, p.Vneg) : Math.max(15, Math.abs(r.vout) * 1.3), vn = p.sat ? Math.min(p.Vpos, p.Vneg) : -vp;
      const dw = Math.max(1, Math.abs(r.vd) * 1.5);
      spec.win = { v0: -dw, v1: dw, i0: vn * 1.2, i1: vp * 1.2 };
      spec.series.push({ name: c.name, color: slot(0), pts: p.sat ? [[-dw, vn], [0, vn], [0, vp], [dw, vp]] : [[0, vn * 1.2], [0, vp * 1.2]], width: 2.4 });
      spec.points.push({ name: 'Q', v: r.vd, i: r.vout, label: `Q (v₊−v₋ = ${U.format(r.vd, 'V')}, vₒ = ${U.format(r.vout, 'V')})` });
      spec.xlab = 'v₊ − v₋'; spec.ylab = 'vₒ'; spec.yu = 'V';
      spec.title = t('iv_opamp');
      return spec;
    }
    if (A.kind === 'none') {
      spec.title = t('iv_title');
      spec.note = app.t('iv_none');
      return spec;
    }
    // characteristic(s) of two-terminal elements, oriented from a to b
    const net = app.net;
    const ids = A.items.map(it => it.c.id);
    const th = S.thevenin(net.ckt, A.a, A.b, { exclude: ids, prevStates: app.prevStates, tempC });
    const vals = [A.q[0]], ivals = [A.q[1]];
    for (const it of A.items) { vals.push(it.sign * it.r.v); ivals.push(it.sign * it.r.i); }
    if (!th.error) { if (isFinite(th.vth)) vals.push(th.vth); if (isFinite(th.in)) ivals.push(th.in); }
    const win = windowFor(vals, ivals);
    spec.win = win;
    const multi = A.items.length > 1;
    A.items.forEach((it, k) => {
      const [p0, p1] = it.sign > 0 ? [it.n[0], it.n[1]] : [it.n[1], it.n[0]];
      spec.series.push({ name: it.c.name || t('c_' + it.c.type), color: slot(k), pts: trace([it.el], p0, p1, win, tempC), width: multi ? 1.8 : 2.6 });
      if (multi) spec.points.push({ v: it.sign * it.r.v, i: it.sign * it.r.i, color: slot(k), small: true });
    });
    if (multi) {
      spec.series.push({ name: t(A.kind === 'series' ? 'iv_comb_series' : 'iv_comb_parallel'), color: 'fg', pts: trace(A.items.map(it => it.el), A.a, A.b, win, tempC), width: 3 });
    }
    if (!th.error && th.rth !== undefined) {
      if (th.rth === Infinity && isFinite(th.in)) spec.lines.push({ name: t('iv_load'), hz: th.in });
      else if (th.rth === 0 && isFinite(th.vth)) spec.lines.push({ name: t('iv_load'), vt: th.vth });
      else if (isFinite(th.vth) && isFinite(th.rth)) spec.lines.push({ name: t('iv_load'), v: th.vth, r: th.rth });
      if (th.nonlinear) spec.note = app.t('iv_load_lin');
    }
    spec.points.push({ name: 'Q', v: A.q[0], i: A.q[1], label: `Q (${U.format(A.q[0], 'V')}, ${U.format(A.q[1], 'A')})` });
    const names = A.items.map(it => it.c.name).join(multi ? (A.kind === 'series' ? ' + ' : ' ∥ ') : '');
    spec.title = multi ? `${t(A.kind === 'series' ? 'iv_series' : 'iv_parallel')}: ${names}` : `${t('iv_title')} · ${names}`;
    spec.conv = multi ? t('iv_conv_ab') : t('iv_conv');
    return spec;
  }

  /* Transistor: input characteristic I_B(V_BE) and output characteristics I_C(V_CE), each with its operating
   * point and the load line imposed by the rest of the circuit. The load lines come from solving the real
   * circuit again with one model parameter moved (V_BE(on) for the input; β, or V_CE(sat) in saturation, for
   * the output): every solution is a point that the circuit allows, so the line passes exactly through Q. */
  function bjtSpecs(app, A, t, tempC) {
    const c = A.c, r = A.r, p = c.props, pnp = p.pol === 'pnp', em = p.model === 'em';
    const Vt = S.thermalVoltage(tempC);
    const elQ = app.net.ckt.elements.find(e => e.id === c.id);
    const net = app.net, [nb, nc, ne] = net.compNodes.get(c.id);
    const solveWith = (patch) => {
      const els = net.ckt.elements.map(e => (e.id === c.id ? Object.assign({}, e, patch) : e));
      const res = S.solve({ nodeCount: net.ckt.nodeCount, elements: els }, { prevStates: Object.assign({}, app.prevStates, { [c.id]: r.state }), tempC });
      return res.ok && (em || res.states[c.id] === r.state) ? res.el[c.id] : null;
    };
    const lineFrom = (pts) => {
      if (pts.length < 2) return null;
      const [[v1, i1], [v2, i2]] = pts;
      if (Math.abs(v2 - v1) < 1e-12 && Math.abs(i2 - i1) < 1e-15) return null;
      return { p1: [v1, i1], p2: [v2, i2] };
    };
    const theveninLine = (a, b) => {
      const th = S.thevenin(net.ckt, a, b, { exclude: [c.id], tempC });
      if (th.error || !isFinite(th.rth) || th.rth <= 0 || !isFinite(th.vth)) return null;
      const s = pnp ? -1 : 1;
      return { p1: [s * th.vth, 0], p2: [0, s * th.vth / th.rth] };
    };
    const intercepts = (ln) => {
      // where the line crosses the axes (for the window)
      const [v1, i1] = ln.p1, [v2, i2] = ln.p2;
      const out = { v: undefined, i: undefined };
      if (Math.abs(i2 - i1) > 1e-18) out.v = v1 - i1 * (v2 - v1) / (i2 - i1);
      if (Math.abs(v2 - v1) > 1e-15) out.i = i1 - v1 * (i2 - i1) / (v2 - v1);
      return out;
    };

    /* ----- input ----- */
    let inLine = null;
    if (r.state !== 'off' || em) {
      const pts = [];
      if (em) for (const f of [0.05, 20]) { const q = solveWith({ Is: (p.Is || 1e-14) * f }); if (q) pts.push([q.vbe, q.ib]); }
      else for (const dv of [-0.15, 0.15]) { const q = solveWith({ Vbe: p.Vbe + dv }); if (q) pts.push([q.vbe, q.ib]); }
      inLine = lineFrom(pts);
    }
    if (!inLine) inLine = theveninLine(pnp ? ne : nb, pnp ? nb : ne);
    const ibq = Math.max(r.ib, 0);
    const iInt = inLine ? intercepts(inLine) : {};
    const vOn = em ? Math.max(0.5, r.vbe) : p.Vbe;
    const vMax = Math.max(1.6 * vOn, Math.min(isFinite(iInt.v) ? iInt.v : 0, 4 * vOn), r.vbe * 1.3, 0.5);
    const iMax = Math.max(ibq * 1.8, Math.min(isFinite(iInt.i) ? iInt.i : 0, ibq * 4), ibq > 0 ? 0 : 10e-6);
    const winIn = { v0: -0.15 * vMax, v1: vMax * 1.05, i0: -0.12 * iMax, i1: iMax * 1.15 };
    const inSpec = { kind: 'bjt-in', series: [], lines: [], points: [], regions: [], xu: 'V', yu: 'A', win: winIn };
    if (em) {
      // I_B(V_BE) of the Ebers-Moll model at the operating V_CE
      const pts = [];
      for (let k = 0; k <= 160; k++) {
        const v = winIn.v0 + (winIn.v1 - winIn.v0) * k / 160;
        const i = S.bjtEM(elQ, v, v - r.vce, Vt).ib;
        if (i > winIn.i1 * 1.5) break;
        pts.push([v, i]);
      }
      inSpec.series.push({ name: t('iv_bjt_em_in', { vce: U.format(r.vce, 'V') }), color: slot(0), pts, width: 2.6 });
      inSpec.series.push({ name: t('iv_bjt_model'), color: 'muted', pts: [[winIn.v0, 0], [p.Vbe, 0], [p.Vbe, winIn.i1 * 1.5]], width: 1.4, dash: true });
    } else inSpec.series.push({ name: t('iv_bjt_model'), color: slot(0), pts: [[winIn.v0, 0], [p.Vbe, 0], [p.Vbe, winIn.i1 * 1.5]], width: 2.6 });
    if (ibq > 0 && !em) {
      // exponential junction through Q, for comparison with the simple model
      const Vt = S.thermalVoltage(tempC), isb = ibq / (Math.exp(p.Vbe / Vt) - 1);
      const pts = [];
      for (let k = 0; k <= 120; k++) { const v = winIn.v0 + (winIn.v1 - winIn.v0) * k / 120; const i = isb * (Math.exp(v / Vt) - 1); if (i > winIn.i1 * 1.5) { pts.push([Vt * Math.log(winIn.i1 * 1.5 / isb + 1), winIn.i1 * 1.5]); break; } pts.push([v, i]); }
      inSpec.series.push({ name: t('iv_bjt_exp'), color: 'muted', pts, width: 1.4, dash: true });
    }
    if (inLine) inSpec.lines.push({ name: t('iv_load_in'), p1: inLine.p1, p2: inLine.p2 });
    inSpec.points.push({ name: 'Q', v: r.vbe, i: r.ib, label: `Q (${U.format(r.vbe, 'V')}, ${U.format(r.ib, 'A')})` });
    inSpec.xlab = pnp ? 'V_EB' : 'V_BE'; inSpec.ylab = 'I_B';
    inSpec.title = t('iv_bjt_in');
    inSpec.note = app.t(em ? 'iv_bjt_in_note_em' : 'iv_bjt_in_note');

    /* ----- output ----- */
    let outLine = null;
    if (r.state === 'act' || em) {
      const pts = [];
      for (const f of [0.6, 1.4]) { const q = solveWith({ beta: p.beta * f }); if (q) pts.push([q.vce, q.ic]); }
      outLine = lineFrom(pts);
    } else if (r.state === 'sat') {
      const pts = [];
      for (const dv of [0.3, 0.8]) { const q = solveWith({ Vcesat: p.Vcesat + dv }); if (q) pts.push([q.vce, q.ic]); }
      outLine = lineFrom(pts);
    }
    if (!outLine) outLine = theveninLine(pnp ? ne : nc, pnp ? nc : ne);
    const ib0 = ibq > 0 ? ibq : 10e-6;
    const levels = [0.5, 1, 1.5, 2].map(f => f * ib0);
    const oInt = outLine ? intercepts(outLine) : {};
    const vcMax = Math.max(r.vce * 1.3, isFinite(oInt.v) ? oInt.v : 0, p.Vcesat * 4, 1);
    const icMax = Math.max(p.beta * levels[3] * (em && p.VA > 0 ? 1 + vcMax / p.VA : 1), isFinite(oInt.i) ? oInt.i : 0, r.ic * 1.2);
    const winOut = { v0: -0.05 * vcMax, v1: vcMax * 1.12, i0: -0.06 * icMax, i1: icMax * 1.12 };
    const outSpec = { kind: 'bjt-out', series: [], lines: [], points: [], xu: 'V', yu: 'A', win: winOut };
    levels.forEach((ib, k) => {
      const ic = p.beta * ib;
      let pts = [[0, 0], [p.Vcesat, 0], [p.Vcesat, ic], [winOut.v1, ic]];
      if (em) {
        // for each V_CE, the V_BE that gives this base current (bisection), then I_C
        pts = [];
        for (let j = 0; j <= 140; j++) {
          const vce = winOut.v1 * Math.pow(j / 140, 1.6);
          let lo = -0.5, hi = 1.5;
          for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (S.bjtEM(elQ, mid, mid - vce, Vt).ib > ib) hi = mid; else lo = mid; }
          const vbe = (lo + hi) / 2;
          pts.push([vce, S.bjtEM(elQ, vbe, vbe - vce, Vt).ic]);
        }
      }
      outSpec.series.push({ name: 'I_B = ' + U.format(ib, 'A'), color: slot(k), pts, width: k === 1 && ibq > 0 ? 2.6 : 1.6 });
    });
    outSpec.regions = em ? [] : [
      { v0: winOut.v0, v1: p.Vcesat, i0: winOut.i0, i1: winOut.i1, label: t('region_sat'), at: 'top' },
      { v0: p.Vcesat, v1: winOut.v1, i0: winOut.i0, i1: 0.04 * icMax, label: t('region_off'), at: 'right' }
    ];
    if (outLine) outSpec.lines.push({ name: t('iv_load_out'), p1: outLine.p1, p2: outLine.p2 });
    outSpec.points.push({ name: 'Q', v: r.vce, i: r.ic, label: `Q (${U.format(r.vce, 'V')}, ${U.format(r.ic, 'A')}) · ${t('region_' + r.state)}` });
    outSpec.xlab = pnp ? 'V_EC' : 'V_CE'; outSpec.ylab = 'I_C';
    outSpec.title = t('iv_bjt');
    outSpec.note = app.t(em ? 'iv_bjt_note_em' : 'iv_bjt_note');
    return [inSpec, outSpec];
  }

  /* ---------- plot ---------- */
  function niceStep(span, n) {
    const raw = span / n, e = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / e;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e;
  }

  function draw(cv, spec, hover) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return null;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const col = DCS.render.colors();
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    const w = spec.win;
    const L = 52, R = 10, T = 12, B = 30;
    const X = (v) => L + (v - w.v0) / (w.v1 - w.v0) * (W - L - R);
    const Y = (i) => H - B - (i - w.i0) / (w.i1 - w.i0) * (H - T - B);
    const fmt = (v, u) => U.format(v, u, { digits: 3, trim: true });
    // grid and ticks
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.lineWidth = 1;
    const sx = niceStep(w.v1 - w.v0, Math.max(3, Math.floor((W - L) / 70))), sy = niceStep(w.i1 - w.i0, Math.max(3, Math.floor((H - B) / 40)));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = Math.ceil(w.v0 / sx) * sx; v <= w.v1 + 1e-12; v += sx) {
      const x = Math.round(X(v)) + 0.5;
      ctx.strokeStyle = col.grid; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.stroke();
      ctx.fillStyle = col.muted; ctx.fillText(fmt(Math.abs(v) < sx * 1e-6 ? 0 : v, spec.xu), x, H - B + 5);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = Math.ceil(w.i0 / sy) * sy; i <= w.i1 + 1e-18; i += sy) {
      const y = Math.round(Y(i)) + 0.5;
      ctx.strokeStyle = col.grid; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke();
      ctx.fillStyle = col.muted; ctx.fillText(fmt(Math.abs(i) < sy * 1e-6 ? 0 : i, spec.yu), L - 5, y);
    }
    // axes through the origin
    ctx.strokeStyle = col.muted; ctx.lineWidth = 1.2;
    if (w.v0 < 0 && w.v1 > 0) { const x = Math.round(X(0)) + 0.5; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.stroke(); }
    if (w.i0 < 0 && w.i1 > 0) { const y = Math.round(Y(0)) + 0.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke(); }
    ctx.fillStyle = col.fg; ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(spec.xlab, W - R, H - B - 3);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(spec.ylab, L + 4, T + 1);
    // plot area clip
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, W - L - R, H - T - B); ctx.clip();
    // regions (transistor output: saturation and cutoff)
    for (const rg of spec.regions || []) {
      const x0 = X(rg.v0), x1 = X(rg.v1), y0 = Y(rg.i1), y1 = Y(rg.i0);
      ctx.fillStyle = col.muted; ctx.globalAlpha = 0.09; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1;
      ctx.fillStyle = col.muted; ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      if (rg.at === 'top') { ctx.save(); ctx.translate((x0 + x1) / 2 + 4, y0 + 6); ctx.rotate(Math.PI / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(rg.label, 0, 0); ctx.restore(); }
      else { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(rg.label, x1 - 4, y0 - 2); }
    }
    // load lines
    ctx.setLineDash([6, 4]); ctx.strokeStyle = col.muted; ctx.lineWidth = 1.6;
    for (const ln of spec.lines) {
      ctx.beginPath();
      if (ln.p1) {
        // line through two points, extended across the window
        const [v1, i1] = ln.p1, [v2, i2] = ln.p2;
        if (Math.abs(v2 - v1) < 1e-15) { ctx.moveTo(X(v1), T); ctx.lineTo(X(v1), H - B); }
        else { const m = (i2 - i1) / (v2 - v1); ctx.moveTo(X(w.v0), Y(i1 + m * (w.v0 - v1))); ctx.lineTo(X(w.v1), Y(i1 + m * (w.v1 - v1))); }
      } else if (ln.hz !== undefined) { ctx.moveTo(L, Y(ln.hz)); ctx.lineTo(W - R, Y(ln.hz)); }
      else if (ln.vt !== undefined) { ctx.moveTo(X(ln.vt), T); ctx.lineTo(X(ln.vt), H - B); }
      else { ctx.moveTo(X(w.v0), Y((ln.v - w.v0) / ln.r)); ctx.lineTo(X(w.v1), Y((ln.v - w.v1) / ln.r)); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // curves
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const s of spec.series) {
      if (!s.pts || s.pts.length < 2) continue;
      ctx.strokeStyle = s.color === 'fg' ? col.fg : s.color === 'muted' ? col.muted : s.color; ctx.lineWidth = s.width || 2;
      ctx.setLineDash(s.dash ? [2, 3] : []);
      ctx.beginPath();
      s.pts.forEach(([v, i], k) => { const x = X(v), y = Y(i); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // operating points (2px surface ring around each marker)
    for (const p of spec.points) {
      const x = X(p.v), y = Y(p.i), r = p.small ? 4.5 : 6.5;
      ctx.fillStyle = col.bg; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = p.small ? p.color : col.port; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.restore();
    // Q label
    const q = spec.points.find(p => p.label);
    if (q) {
      const x = X(q.v), y = Y(q.i);
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      const tw = ctx.measureText(q.label).width;
      let lx = x + 10, ly = y - 12;
      if (lx + tw > W - R) lx = x - 10 - tw;
      if (lx < L + 2) lx = L + 2;
      if (ly < T + 8) ly = y + 14;
      ctx.lineWidth = 3; ctx.strokeStyle = col.bg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.strokeText(q.label, lx, ly); ctx.fillStyle = col.fg; ctx.fillText(q.label, lx, ly);
    }
    // hover crosshair on the nearest curve point
    if (hover) {
      let best = null, bd = 18;
      for (const s of spec.series) for (const [v, i] of s.pts || []) {
        const d = Math.hypot(X(v) - hover[0], Y(i) - hover[1]);
        if (d < bd) { bd = d; best = { s, v, i }; }
      }
      if (best) {
        const x = X(best.v), y = Y(best.i);
        ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = best.s.color === 'fg' ? col.fg : best.s.color; ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill();
        return { x, y, text: `${best.s.name}: ${fmt(best.v, spec.xu)}, ${fmt(best.i, spec.yu)}` };
      }
    }
    return null;
  }

  /* a plot card: canvas, legend, notes, hover tooltip */
  function mount(container, spec, opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'ivwrap';
    const cv = document.createElement('canvas');
    cv.className = 'ivplot' + (opts.big ? ' big' : '');
    const tip = document.createElement('div');
    tip.className = 'ivtip'; tip.hidden = true;
    wrap.appendChild(cv); wrap.appendChild(tip);
    container.appendChild(wrap);
    const legendItems = spec.series.map(s => ({ name: s.name, color: s.color, line: true }))
      .concat(spec.lines.map(l => ({ name: l.name, dash: true })))
      .concat(spec.points.filter(p => p.label).map(() => ({ name: DCS.app.tp('iv_q'), dot: true })));
    if (legendItems.length >= 2) {
      const lg = document.createElement('div');
      lg.className = 'ivlegend';
      const col = DCS.render.colors();
      for (const it of legendItems) {
        const e = document.createElement('span');
        const c = it.color === 'fg' ? col.fg : it.color === 'muted' ? col.muted : it.color;
        const sw = it.dot ? `<i class="sw dot" style="background:${col.port}"></i>` : it.dash ? `<i class="sw dash" style="border-color:${col.muted}"></i>` : `<i class="sw" style="background:${c}"></i>`;
        e.innerHTML = sw + '<span></span>';
        e.lastChild.textContent = it.name;
        lg.appendChild(e);
      }
      container.appendChild(lg);
    }
    const redraw = (h) => {
      const r = draw(cv, spec, h);
      if (r) { tip.hidden = false; tip.textContent = r.text; tip.style.left = Math.min(cv.clientWidth - tip.offsetWidth - 4, r.x + 10) + 'px'; tip.style.top = Math.max(0, r.y - 30) + 'px'; }
      else tip.hidden = true;
    };
    requestAnimationFrame(() => redraw(null));
    const pos = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    cv.addEventListener('pointermove', (e) => redraw(pos(e)));
    cv.addEventListener('pointerdown', (e) => redraw(pos(e)));
    cv.addEventListener('pointerleave', () => redraw(null));
    return { redraw };
  }

  DCS.iv = { build, mount, analyse, trace };
})(window);
