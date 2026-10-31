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
      const it = items[0];
      it.sign = 1;
      return { kind: 'single', items, a: it.n[0], b: it.n[1], q: [it.r.v, it.r.i] };
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
    if (A.kind === 'bjt') {
      const c = A.c, r = A.r, p = c.props;
      const ibq = Math.max(r.ib, 0);
      const ib0 = ibq > 0 ? ibq : 10e-6;
      const levels = [0.5, 1, 1.5, 2].map(f => f * ib0);
      // load line of the collector circuit: Thévenin seen between collector and emitter, transistor removed
      const net = app.net, [nb, nc, ne] = net.compNodes.get(c.id);
      const th = S.thevenin(net.ckt, nc, ne, { exclude: [c.id], tempC });
      const icMax = p.beta * levels[3];
      const win = windowFor([r.vce, th.vth, p.Vcesat * 2], [r.ic, icMax, th.rth > 0 && isFinite(th.vth) ? th.vth / th.rth : 0]);
      win.v0 = Math.min(win.v0, -0.05 * (win.v1)); win.i0 = Math.min(win.i0, -0.05 * win.i1);
      levels.forEach((ib, k) => {
        const ic = p.beta * ib;
        spec.series.push({ name: 'I_B = ' + U.format(ib, 'A'), color: slot(k), pts: [[0, 0], [p.Vcesat, 0], [p.Vcesat, ic], [win.v1, ic]], q: null, width: k === 1 && ibq > 0 ? 2.6 : 1.6 });
      });
      if (isFinite(th.vth) && th.rth > 0 && isFinite(th.rth)) spec.lines.push({ name: t('iv_load'), v: th.vth, r: th.rth });
      spec.points.push({ name: 'Q', v: r.vce, i: r.ic, label: `Q (${U.format(r.vce, 'V')}, ${U.format(r.ic, 'A')}) · ${t('region_' + r.state)}` });
      spec.win = win;
      spec.xlab = c.props.pol === 'pnp' ? 'V_EC' : 'V_CE'; spec.ylab = 'I_C';
      spec.title = t('iv_bjt');
      spec.note = app.t('iv_bjt_note');
      return spec;
    }
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
    // load lines
    ctx.setLineDash([6, 4]); ctx.strokeStyle = col.muted; ctx.lineWidth = 1.6;
    for (const ln of spec.lines) {
      ctx.beginPath();
      if (ln.hz !== undefined) { ctx.moveTo(L, Y(ln.hz)); ctx.lineTo(W - R, Y(ln.hz)); }
      else if (ln.vt !== undefined) { ctx.moveTo(X(ln.vt), T); ctx.lineTo(X(ln.vt), H - B); }
      else { ctx.moveTo(X(w.v0), Y((ln.v - w.v0) / ln.r)); ctx.lineTo(X(w.v1), Y((ln.v - w.v1) / ln.r)); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // curves
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const s of spec.series) {
      if (!s.pts || s.pts.length < 2) continue;
      ctx.strokeStyle = s.color === 'fg' ? col.fg : s.color; ctx.lineWidth = s.width || 2;
      ctx.beginPath();
      s.pts.forEach(([v, i], k) => { const x = X(v), y = Y(i); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
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
        const c = it.color === 'fg' ? col.fg : it.color;
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
