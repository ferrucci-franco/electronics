/* Application state: circuit, view, selection, undo history, solving, persistence. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, N = DCS.netlist, S = DCS.solver, U = DCS.units, I = DCS.i18n;

  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const plain = (s) => String(s).replace(/<sub>(.*?)<\/sub>/g, '$1').replace(/<[^>]+>/g, '');

  const DEFAULT_SETTINGS = {
    style: 'us', ivLoad: false, reqSteps: false, wheelDir: 'auto', flowScale: 'lin', realDir: false, rubber: true, showWireI: false, showV: true, showI: true, showP: false, showNodes: false, animate: false, colorV: false,
    showNames: true, showValues: true, showState: true, grid: true, digits: 3, tempC: 27, defModel: 'cvd'
  };

  const app = {
    circuit: { comps: [], wires: [] },
    view: { scale: 22, ox: 60, oy: 60 },
    minScale: 6, maxScale: 80,
    settings: Object.assign({}, DEFAULT_SETTINGS),
    sel: new Set(),
    hover: null,
    overlay: {},
    tool: 'select',
    place: null,
    port: null,
    thev: null,       // {a, b, loadId, res}
    hiNode: null,
    undoStack: [], redoStack: [],
    prevStates: {}, prevV: null,
    net: null, result: null, flow: null,
    t: (k, v) => I.t(k, v),
    tp: (k, v) => plain(I.t(k, v))
  };

  /* ---------- ids and names ---------- */
  let idCounter = 1;
  function syncIds() {
    let m = 0;
    for (const o of app.circuit.comps.concat(app.circuit.wires)) {
      const n = parseInt(String(o.id).replace(/\D/g, ''), 10);
      if (n > m) m = n;
    }
    idCounter = m + 1;
  }
  const newId = (p) => p + (idCounter++);
  app.newWireId = () => newId('w');
  function nextName(prefix) {
    let m = 0;
    const re = new RegExp('^' + prefix + '(\\d+)$');
    for (const c of app.circuit.comps) { const r = re.exec(c.name || ''); if (r) m = Math.max(m, +r[1]); }
    return prefix + (m + 1);
  }

  /* ---------- history ---------- */
  const snap = () => JSON.stringify(app.circuit);
  let redoSaved = null;
  app.checkpoint = function () {
    app.undoStack.push(snap());
    if (app.undoStack.length > 200) app.undoStack.shift();
    redoSaved = app.redoStack.slice();
    app.redoStack.length = 0;
    app.ui && app.ui.updateHistory();
  };
  app.dropCheckpoint = function () {
    app.undoStack.pop();
    if (redoSaved) app.redoStack = redoSaved;
    redoSaved = null;
    app.ui && app.ui.updateHistory();
  };
  app.undo = function (silent) {
    if (!app.undoStack.length) return;
    if (!silent) app.redoStack.push(snap());
    app.circuit = JSON.parse(app.undoStack.pop());
    afterLoad();
  };
  app.redo = function () {
    if (!app.redoStack.length) return;
    app.undoStack.push(snap());
    app.circuit = JSON.parse(app.redoStack.pop());
    afterLoad();
  };
  function afterLoad() {
    const ids = new Set(app.circuit.comps.map(c => c.id).concat(app.circuit.wires.map(w => w.id)));
    for (const id of Array.from(app.sel)) if (!ids.has(id)) app.sel.delete(id);
    syncIds();
    app.commit();
  }

  /* ---------- solving ---------- */
  app.circuitChanged = function (live) {
    const net = N.build(app.circuit);
    app.net = net;
    const res = S.solve(net.ckt, { prevStates: app.prevStates, tempC: app.settings.tempC, prevV: app.prevV && app.prevV.length === net.ckt.nodeCount ? app.prevV : null });
    if (res.ok) { app.prevStates = Object.assign({}, app.prevStates, res.states); app.prevV = res.v; }
    if (res.ok) mergeRGB(res);
    app.result = res;
    const bad = new Set();
    for (const iss of res.issues) if (iss.level === 'error') for (const id of iss.ids) bad.add(String(id).split('#')[0]);
    app.badIds = bad;
    if (app.thev) computeThevenin();
    app.wireCur = res.ok ? N.wireCurrents(net, res, S) : new Map();
    // closed switches: 0 V, and the current that the wire graph gives them (indeterminate inside a loop)
    if (res.ok) for (const [id, s] of app.wireCur.sw) res.el[id] = { v: 0, i: s.i, tc: [s.i, -s.i], p: 0, state: null, loop: s.loop };
    buildFlow();
    if (!live) app.ui && app.ui.update();
    else app.ui && app.ui.updateLive();
    app.requestRender();
  };
  app.commit = function () {
    splitWires();
    insertIntoWires();
    app.circuitChanged(false);
    save();
  };

  // A wire that has a branch on it (the end of another wire, or a component terminal, in its middle) is cut
  // in two at that point, so that every piece can be selected, moved or deleted on its own.
  function splitWires() {
    const wires = app.circuit.wires;
    const pts = new Map();
    const add = (x, y) => pts.set(x + ',' + y, [x, y]);
    for (const w of wires) { add(w.x1, w.y1); add(w.x2, w.y2); }
    for (const c of app.circuit.comps) for (const [x, y] of C.terminals(c)) add(x, y);
    const all = Array.from(pts.values());
    const out = [];
    let changed = false;
    for (const w of wires) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy;
      const cuts = [];
      if (L2 > 0) for (const [x, y] of all) {
        if ((x - w.x1) * dy - (y - w.y1) * dx !== 0) continue;
        const t = (x - w.x1) * dx + (y - w.y1) * dy;
        if (t > 0 && t < L2) cuts.push([t, x, y]);
      }
      if (!cuts.length) { out.push(w); continue; }
      changed = true;
      cuts.sort((a, b) => a[0] - b[0]);
      let px = w.x1, py = w.y1;
      const sel = app.sel.has(w.id);
      cuts.concat([[L2, w.x2, w.y2]]).forEach(([, x, y], k) => {
        const piece = k === 0 ? Object.assign(w, { x1: px, y1: py, x2: x, y2: y }) : { id: newId('w'), x1: px, y1: py, x2: x, y2: y };
        if (k > 0 && sel) app.sel.add(piece.id);
        out.push(piece);
        px = x; py = y;
      });
    }
    if (changed) app.circuit.wires = out;
  }
  app.splitWires = splitWires;

  // A two-terminal component dropped on a wire is inserted in it: the piece of wire that would join its two
  // terminals (and short it) is removed. Only for the components just placed, moved, pasted or rotated.
  app.inserted = new Set();
  function insertIntoWires() {
    if (!app.inserted.size) return;
    const ids = app.inserted;
    app.inserted = new Set();
    for (const c of app.circuit.comps) {
      // two-terminal components, and the potentiometer between its ends A and B (the wiper stays free)
      if (!ids.has(c.id) || c.type === 'ground' || (C.TYPES[c.type].terms.length !== 2 && c.type !== 'pot')) continue;
      const [a, b] = C.terminals(c);
      const short = app.circuit.wires.filter(w => (w.x1 === a[0] && w.y1 === a[1] && w.x2 === b[0] && w.y2 === b[1]) || (w.x1 === b[0] && w.y1 === b[1] && w.x2 === a[0] && w.y2 === a[1]));
      if (!short.length) continue;
      const gone = new Set(short.map(w => w.id));
      app.circuit.wires = app.circuit.wires.filter(w => !gone.has(w.id));
      for (const id of gone) app.sel.delete(id);
    }
  }

  // the three junctions of an RGB LED become one result with four terminal currents
  function mergeRGB(res) {
    for (const c of app.circuit.comps) {
      if (c.type === 'pot') {
        const a = res.el[c.id + '#a'], b = res.el[c.id + '#b'];
        if (!a || !b) continue;
        // terminals A, B, W; halves AW and WB in the passive convention A → W → B
        res.el[c.id] = { tc: [a.tc[0], b.tc[1], a.tc[1] + b.tc[0]], p: a.p + b.p, aw: { v: a.v, i: a.i }, wb: { v: b.v, i: b.i }, state: null };
        continue;
      }
      if (c.type !== 'rgbled') continue;
      const ch = [0, 1, 2].map(k => res.el[c.id + '#' + k]);
      if (ch.some(x => !x)) continue;
      const ca = c.props.common === 'ca';
      const tc = ch.map(x => (ca ? x.tc[1] : x.tc[0]));
      tc.push(-tc.reduce((a, b) => a + b, 0));
      res.el[c.id] = { tc, p: ch.reduce((a, x) => a + x.p, 0), ch: ch.map(x => ({ v: x.v, i: x.i, state: x.state })), state: null };
      if (res.states) ch.forEach((x, k) => { if (x.state) res.states[c.id + '#' + k] = x.state; });
    }
  }

  app.issues = function () {
    const res = app.result, out = [];
    if (!res) return out;
    const name = (id) => { const base = String(id).split('#')[0]; const c = app.circuit.comps.find(x => x.id === base); return c ? (c.name || app.tp('c_' + c.type)) : id; };
    for (const iss of res.issues) out.push({ level: iss.level, text: app.t('iss_' + iss.code, { ids: iss.ids.map(name).join(', ') }), ids: iss.ids });
    if (app.net && app.net.noGround) out.push({ level: 'warn', text: app.t('iss_noground'), ids: [] });
    if (res.ok) for (const c of app.circuit.comps) {
      const r = res.el[c.id];
      if (!r) continue;
      const imax = c.props.Imax;
      const i = c.type === 'led' ? r.i : c.type === 'rgbled' ? Math.max(...r.ch.map(q => q.i)) : null;
      if (i != null && i > imax * 1.0001) out.push({ level: 'warn', text: app.t('iss_ledmax', { ids: c.name, i: U.format(i, 'A'), imax: U.format(imax, 'A', { trim: true }) }), ids: [c.id] });
    }
    if (res.ok && res.floating && res.floating.length) out.push({ level: 'warn', text: app.t('iss_floating'), ids: [] });
    if (app.net && app.net.openTerms.length) out.push({ level: 'info', text: app.t('iss_openterm'), ids: [] });
    return out;
  };

  /* ---------- Thévenin ---------- */
  // node of a grid point: a terminal or wire end, or a point inside a wire
  function nodeAt(p, net, circuit) {
    net = net || app.net; circuit = circuit || app.circuit;
    const n = net.pointNode.get(N.key(p[0], p[1]));
    if (n != null) return n;
    for (const w of circuit.wires) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      if (!dx && !dy) continue;   // a zero-length wire is not in the netlist
      if ((p[0] - w.x1) * dy - (p[1] - w.y1) * dx !== 0) continue;
      const t = (p[0] - w.x1) * dx + (p[1] - w.y1) * dy;
      if (t >= 0 && t <= dx * dx + dy * dy && net.wireNode.has(w.id)) return net.wireNode.get(w.id);
    }
    return null;
  }

  /* ---------- the port A–B cuts the circuit ----------
   * A and B picked on wires: the wires are cut at A and at B. When that splits the circuit in two, the
   * equivalent is the one of the side the user looks into, and the other side is left out. */
  // the two sides of the point X: two wire pieces (inside a wire, or the corner of two wires), or a component
  // terminal and the one wire that reaches it ({ term: true }: the cut separates the component from the wire)
  function halvesAt(net, wires, X) {
    const pt = net.points.get(N.key(X[0], X[1]));
    const terms = pt ? pt.terms : [];
    const out = [];
    for (const w of wires) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      if ((X[0] - w.x1) * dy - (X[1] - w.y1) * dx !== 0) continue;
      const tt = (p) => (p[0] - w.x1) * dx + (p[1] - w.y1) * dy, t = tt(X);
      if (t < 0 || t > dx * dx + dy * dy) continue;
      const pts = [[w.x1, w.y1]].concat((net.inner.get(w.id) || []).map(p => [p.x, p.y]), [[w.x2, w.y2]]);
      let before = null, after = null;
      for (const p of pts) {
        const tp = tt(p);
        if (tp < t && (!before || tp > tt(before))) before = p;
        if (tp > t && (!after || tp < tt(after))) after = p;
      }
      if (before) out.push({ w, a: X, b: before });
      if (after) out.push({ w, a: X, b: after });
    }
    if (!terms.length) return out.length === 2 ? out : null;
    return terms.length === 1 && out.length === 1 ? [out[0], { term: true, comp: terms[0][0], a: X }] : null;
  }
  // the wires with the given pieces taken out
  function cutWires(wires, pieces) {
    const out = [];
    for (const w of wires) {
      const mine = pieces.filter(pc => pc.w.id === w.id);
      if (!mine.length) { out.push(w); continue; }
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy;
      const u = (p) => ((p[0] - w.x1) * dx + (p[1] - w.y1) * dy) / L2, at = (s) => [w.x1 + dx * s, w.y1 + dy * s];
      const gaps = mine.map(pc => [Math.min(u(pc.a), u(pc.b)), Math.max(u(pc.a), u(pc.b))]).sort((a, b) => a[0] - b[0]);
      let s = 0, k = 0;
      const keep = (s0, s1) => { const p = at(s0), q = at(s1); out.push({ id: w.id + '~' + (k++), x1: p[0], y1: p[1], x2: q[0], y2: q[1] }); };
      for (const [g0, g1] of gaps) { if (g0 > s) keep(s, g0); s = Math.max(s, g1); }
      if (s < 1) keep(s, 1);
    }
    return out;
  }
  // the two sides of the cut A–B: for each, its components, its wires and the pieces cut away from it
  function portCut(A, B) {
    const net = app.net, wires = app.circuit.wires;
    const hA = halvesAt(net, wires, A), hB = halvesAt(net, wires, B);
    if (!hA || !hB) return null;
    const c0 = { comps: app.circuit.comps, wires: cutWires(wires, hA.concat(hB).filter(h => !h.term)) };
    const n0 = N.build(c0);
    // groups of nodes joined through components (the ground symbols already share node 0)
    const par = Array.from({ length: n0.ckt.nodeCount }, (_, i) => i);
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (const c of c0.comps) { const ns = n0.compNodes.get(c.id); for (const n of ns) par[find(n)] = find(ns[0]); }
    const grp = (p) => { const n = n0.pointNode.get(N.key(p[0], p[1])); return n == null ? null : find(n); };
    // a wire piece belongs to the side of its far end; a terminal to the side of its component
    const side = (h) => grp(h.term ? h.a : h.b);
    const [a1, a2] = hA.map(side), [b1, b2] = hB.map(side);
    let pairs;
    if (a1 != null && a2 != null && a1 !== a2 && a1 === b1 && a2 === b2) pairs = [[hA[0], hB[0]], [hA[1], hB[1]]];
    else if (a1 != null && a2 != null && a1 !== a2 && a1 === b2 && a2 === b1) pairs = [[hA[0], hB[1]], [hA[1], hB[0]]];
    else return null;
    const sides = pairs.map(([ha, hb], k) => {
      const g = side(ha);
      const comps = c0.comps.filter(c => find(n0.compNodes.get(c.id)[0]) === g);
      const ws = c0.wires.filter(w => find(n0.wireNode.get(w.id)) === g)
        .concat([ha, hb].filter(h => !h.term).map((h, j) => ({ id: 'cut' + k + j, x1: h.a[0], y1: h.a[1], x2: h.b[0], y2: h.b[1] })));
      return { comps, wires: ws, names: comps.filter(c => c.type !== 'ground').map(c => c.name || app.tp('c_' + c.type)), cut: pairs[1 - k].filter(h => !h.term) };
    });
    // by default the side that has an equivalent (no diode, transistor or saturating op-amp), else the larger one
    const lin = sides.map(s => !s.comps.some(c => C.isDiode(c) || c.type === 'rgbled' || c.type === 'bjt' || (c.type === 'opamp' && c.props.sat)));
    const n = sides.map(s => s.names.length);
    return { sides, def: lin[0] !== lin[1] ? (lin[1] ? 1 : 0) : n[1] > n[0] ? 1 : 0 };
  }

  function computeThevenin() {
    const th = app.thev;
    let net = app.net;
    th.res = null; th.err = null; th.net = null; th.circuit = null; th.cut = null;
    let na, nb, exclude = [];
    if (th.loadId) {
      const c = app.circuit.comps.find(x => x.id === th.loadId);
      if (!c) { app.thev = null; app.port = null; return; }
      const ts = C.terminals(c);
      th.a = ts[0]; th.b = ts[1];
      [na, nb] = net.compNodes.get(c.id);
      exclude = [c.id];
    } else {
      if (!th.a || !th.b) return;
      // the terminals are gone with their wires (circuit erased, wires deleted): no port any more
      if (nodeAt(th.a) == null || nodeAt(th.b) == null) { app.thev = null; app.port = null; return; }
      th.cut = portCut(th.a, th.b);
      if (th.cut) {
        // look into one side only: the circuit of that side, with the port at the cut
        if (th.side !== 0 && th.side !== 1) th.side = th.cut.def;
        const sd = th.cut.sides[th.side];
        th.circuit = { comps: sd.comps, wires: sd.wires, nodeNames: app.circuit.nodeNames };
        net = th.net = N.build(th.circuit);
      }
      na = nodeAt(th.a, net, th.circuit); nb = nodeAt(th.b, net, th.circuit);
      if (na == null || nb == null) { th.err = 'thev_err'; app.port = { a: th.a, b: th.b }; return; }
    }
    const sd = th.cut ? th.cut.sides[th.side] : null;
    app.port = { a: th.a, b: th.b, cut: sd ? sd.cut : null, side: sd ? { comps: new Set(sd.comps.map(c => c.id)), wires: sd.wires } : null };
    if (na === nb) { th.err = 'thev_same'; return; }
    const r = S.thevenin(net.ckt, na, nb, { exclude, prevStates: app.prevStates, tempC: app.settings.tempC });
    if (r.error) { th.err = r.error === 'samenode' ? 'thev_same' : 'thev_err'; return; }
    th.res = r;
  }
  app.setThevSide = function (k) {
    if (!app.thev || !app.thev.cut) return;
    app.thev.side = k;
    app.circuitChanged();
  };
  app.portFromComp = function (c) {
    app.thev = { loadId: c.id };
    app.circuitChanged();
    app.setTool('select');
    app.ui.showTab('thev', true);
  };
  app.portPick = function (pt) {
    if (!app.thev || app.thev.loadId || (app.thev.a && app.thev.b)) app.thev = { a: pt, b: null };
    else app.thev.b = pt;
    app.port = { a: app.thev.a, b: app.thev.b };
    if (app.thev.b) {
      app.circuitChanged();
      app.setTool('select');
      app.ui.showTab('thev', true);
    } else {
      app.hint(app.t('thev_pickB'));
      app.ui.update();
      app.requestRender();
    }
  };
  app.clearThevenin = function () { app.thev = null; app.port = null; app.ui.update(); app.requestRender(); };

  /* ---------- current flow animation ---------- */
  function buildFlow() {
    const res = app.result;
    if (!res || !res.ok || !app.settings.animate) { app.flow = null; return; }
    const segs = [];
    for (const pieces of app.wireCur.values()) for (const p of pieces) segs.push({ x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, i: p.i });
    const inner = { opamp: [[-2, 1], [-2, -1], [2, 0]], bjt: [[-0.45, 0], [1, -1.15], [1, 1.15]], rgbled: [[-1.25, -1.1], [-1.25, 0], [-1.25, 1.1], [0.95, 0]] };
    for (const c of app.circuit.comps) {
      const r = res.el[c.id];
      if (!r) continue;
      const ts = C.terminals(c);
      if (ts.length === 2) segs.push({ x1: ts[0][0], y1: ts[0][1], x2: ts[1][0], y2: ts[1][1], i: r.i });
      else if (c.type === 'pot') {
        // the dots follow the real path: along the track from A to the wiper contact and out through the wiper
        // arrow to W; the rest of the track carries the W–B current to B
        // the pieces of one path share the dot pattern (off = distance from the start of the path)
        const seg = (path, i) => {
          let off = 0;
          for (let k = 0; k + 1 < path.length; k++) {
            const a = C.toWorld(c, path[k][0], path[k][1]), b = C.toWorld(c, path[k + 1][0], path[k + 1][1]);
            segs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], i, off });
            off += Math.hypot(b[0] - a[0], b[1] - a[1]);
          }
        };
        const iOut = -r.tc[2];   // from the track out through the wiper to W
        if (c.props.ctl === 'knob') {
          const R = C.ROT.R, rad = Math.PI / 180, d = C.ROT.a0 + (C.ROT.a1 - C.ROT.a0) * Math.max(0, Math.min(1, c.props.alpha));
          const arc = (from, to) => { const n = Math.max(1, Math.round(Math.abs(to - from) / 12)), pts = []; for (let k = 0; k <= n; k++) { const t = (from + (to - from) * k / n) * rad; pts.push([Math.cos(t) * R, Math.sin(t) * R]); } return pts; };
          seg([[-2, 0]].concat(arc(C.ROT.a0, d)), r.aw.i);
          seg(arc(d, C.ROT.a1).concat([[2, 0]]), r.wb.i);
          seg([[Math.cos(d * rad) * R, Math.sin(d * rad) * R], [0, 0], [0, -2]], iOut);
        } else {
          const x = C.potX(c);
          seg([[-2, 0], [x, 0]], r.aw.i);
          seg([[x, 0], [2, 0]], r.wb.i);
          seg([[x, 0], [x, -1.3], [0, -1.3], [0, -2]], iOut);
        }
      } else if (inner[c.type]) ts.forEach((t, j) => { const q = C.toWorld(c, inner[c.type][j][0], inner[c.type][j][1]); segs.push({ x1: t[0], y1: t[1], x2: q[0], y2: q[1], i: r.tc[j] }); });
    }
    let imax = 0;
    for (const s of segs) imax = Math.max(imax, Math.abs(s.i));
    const old = app.flow ? app.flow.segs : [];
    segs.forEach((s, k) => {
      s.len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      const a = Math.abs(s.i);
      // proportional: the dot speed follows the current, so a junction shows KCL (what comes in fast leaves
      // through slower branches); logarithmic: currents down to 1/10000 of the largest one still move
      // no dots where there is practically no current: an open branch (diode off, open switch) keeps only the
      // solver's leakage (picoamperes), which must not leave frozen dots behind
      if (imax <= 0 || a < 1e-10) s.speed = 0;
      else if (app.settings.flowScale === 'log') s.speed = a < imax * 1e-4 ? 0 : Math.sign(s.i) * (1.2 + 4.8 * (Math.log10(a / imax) + 4) / 4);
      else s.speed = a < imax * 1e-3 ? 0 : Math.sign(s.i) * 6 * a / imax;
      s.phase = old[k] ? old[k].phase : 0;
    });
    app.flow = { segs };
  }

  /* ---------- editing operations ---------- */
  app.select = function (ids) {
    app.sel = new Set(ids);
    app.ui.update();
    app.requestRender();
  };
  app.toggleSel = function (id) {
    if (app.sel.has(id)) app.sel.delete(id); else app.sel.add(id);
    app.ui.update(); app.requestRender();
  };
  app.selectedComps = () => app.circuit.comps.filter(c => app.sel.has(c.id));

  app.addWirePath = function (pts) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      if (x1 === x2 && y1 === y2) continue;
      const dup = app.circuit.wires.some(w => (w.x1 === x1 && w.y1 === y1 && w.x2 === x2 && w.y2 === y2) || (w.x1 === x2 && w.y1 === y2 && w.x2 === x1 && w.y2 === y1));
      if (!dup) app.circuit.wires.push({ id: newId('w'), x1, y1, x2, y2 });
    }
  };
  app.cleanWires = function () {
    const seen = new Set();
    app.circuit.wires = app.circuit.wires.filter(w => {
      if (w.x1 === w.x2 && w.y1 === w.y2) return false;
      const k = [w.x1, w.y1, w.x2, w.y2].join(','), k2 = [w.x2, w.y2, w.x1, w.y1].join(',');
      if (seen.has(k) || seen.has(k2)) return false;
      seen.add(k); return true;
    });
  };
  app.removeIds = function (ids) {
    const s = new Set(ids);
    app.circuit.comps = app.circuit.comps.filter(c => !s.has(c.id));
    app.circuit.wires = app.circuit.wires.filter(w => !s.has(w.id));
    for (const id of ids) app.sel.delete(id);
    if (app.thev && app.thev.loadId && s.has(app.thev.loadId)) { app.thev = null; app.port = null; }
  };
  app.deleteSel = function () {
    if (!app.sel.size) return;
    app.checkpoint();
    app.removeIds(Array.from(app.sel));
    app.commit();
  };
  app.rotateSel = function () {
    const cs = app.selectedComps();
    if (!cs.length) return;
    app.checkpoint();
    if (cs.length === 1 && !app.circuit.wires.some(w => app.sel.has(w.id))) cs[0].rot = ((cs[0].rot || 0) + 1) % 4;
    else rotateGroup(cs);
    for (const c of cs) app.inserted.add(c.id);
    app.commit();
  };
  function rotateGroup(cs) {
    // quarter turn of the whole selection around its centre (grid aligned)
    const ws = app.circuit.wires.filter(w => app.sel.has(w.id));
    const xs = cs.map(c => c.x).concat(ws.flatMap(w => [w.x1, w.x2]));
    const ys = cs.map(c => c.y).concat(ws.flatMap(w => [w.y1, w.y2]));
    const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2), cy = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);
    const r = (x, y) => [cx - (y - cy), cy + (x - cx)];
    for (const c of cs) { [c.x, c.y] = r(c.x, c.y); c.rot = ((c.rot || 0) + 1) % 4; }
    for (const w of ws) { [w.x1, w.y1] = r(w.x1, w.y1); [w.x2, w.y2] = r(w.x2, w.y2); }
  }
  // Step the main value of a component up or down (mouse wheel, two fingers): E12 series for a resistance,
  // one tenth of the decade for sources and β, 2 % for a potentiometer. One undo step per burst of steps.
  const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  function e12(v, up) {
    const e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e);
    if (up) { for (const x of E12) if (x > m * (1 + 1e-6)) return x * Math.pow(10, e); return 10 * Math.pow(10, e); }
    for (let k = E12.length - 1; k >= 0; k--) if (E12[k] < m * (1 - 1e-6)) return E12[k] * Math.pow(10, e);
    return 8.2 * Math.pow(10, e - 1);
  }
  const decStep = (v) => Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(v), 1e-12)) + 1e-9) - 1);
  // direction of the wheel for values: +1 classic (wheel up = dy < 0), −1 "natural" scrolling (macOS default)
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '') || /Mac OS X/.test(navigator.userAgent || '');
  app.wheelSign = () => (app.settings.wheelDir === 'normal' ? 1 : app.settings.wheelDir === 'inverted' ? -1 : (isMac ? -1 : 1));
  app.valueKey = (c) => ({ resistor: 'R', vsource: 'V', isource: 'I', pot: 'alpha', bjt: 'beta' })[c.type] || null;
  let adjustT = 0;
  app.adjustValue = function (c, up) {
    const key = app.valueKey(c);
    if (!key) return false;
    const d = C.TYPES[c.type].props.find(q => q.key === key);
    const v = c.props[key];
    let n;
    if (key === 'R') n = e12(v, up);
    else if (key === 'alpha') n = Math.round(100 * (v + (up ? 0.02 : -0.02))) / 100;
    else if (key === 'beta') n = Math.max(1, Math.round(v + (up ? 1 : -1) * Math.max(1, decStep(v))));
    else {
      // sources: 0.1 of the current decade (5 V → 0.1 V steps), crossing zero cleanly
      const st = Math.abs(v) < 1e-12 ? (key === 'V' ? 0.1 : 1e-4) : decStep(v);
      n = Math.round((v + (up ? st : -st)) / st) * st;
      if (Math.abs(n) < st * 1e-6) n = 0;
    }
    if (d.min != null) n = Math.max(d.min, n);
    if (d.max != null) n = Math.min(d.max, n);
    if (key === 'alpha') n = Math.max(0, Math.min(1, n));
    if (n === v) return true;
    const now = performance.now();
    if (now - adjustT > 900) app.checkpoint();
    adjustT = now;
    c.props[key] = Number(n.toPrecision(12));
    app.commit();
    return true;
  };

  // flip the reference direction of V ('v') or I ('i') of an element
  app.flipRef = function (id, kind) {
    const c = app.circuit.comps.find(x => x.id === id);
    if (!c || !C.flippable(c)) return;
    const f = C.refs(c);
    app.checkpoint();
    c.refV = f.refV; c.refI = f.refI;
    if (C.passiveOnly(c)) { c.refV = c.refI = 1 - f.refV; }
    else if (kind === 'v') c.refV = 1 - f.refV; else c.refI = 1 - f.refI;
    app.commit();
  };
  app.setNodeName = function (pt, name) {
    const nd = nodeAt(pt);
    if (nd == null || nd === 0) return;
    app.checkpoint();
    app.circuit.nodeNames = (app.circuit.nodeNames || []).filter(nn => nodeAt([nn.x, nn.y]) !== nd);
    name = String(name || '').trim().slice(0, 12);
    if (name) app.circuit.nodeNames.push({ x: pt[0], y: pt[1], name });
    app.commit();
  };
  app.nodeAt = (p) => nodeAt(p);
  app.flipSel = function () {
    const cs = app.selectedComps();
    if (!cs.length) return;
    app.checkpoint();
    for (const c of cs) c.flip = !c.flip;
    app.commit();
  };
  app.nudgeSel = function (dx, dy) {
    app.checkpoint();
    for (const c of app.selectedComps()) { c.x += dx; c.y += dy; app.inserted.add(c.id); }
    for (const w of app.circuit.wires) if (app.sel.has(w.id)) { w.x1 += dx; w.x2 += dx; w.y1 += dy; w.y2 += dy; }
    app.commit();
  };

  let clipboard = null;
  app.copySel = function () {
    if (!app.sel.size) return;
    clipboard = JSON.stringify({ comps: app.selectedComps(), wires: app.circuit.wires.filter(w => app.sel.has(w.id)) });
    app.toast(app.t('copy_hint'));
  };
  app.paste = function (data, offset) {
    data = data || clipboard;
    if (!data) return;
    const d = JSON.parse(data);
    const off = offset || 3;
    app.checkpoint();
    const ids = [];
    for (const c of d.comps) {
      const n = Object.assign({}, c, { id: newId('c'), x: c.x + off, y: c.y + off, props: Object.assign({}, c.props) });
      if (c.type !== 'ground') n.name = nextName(C.TYPES[c.type].prefix);
      app.circuit.comps.push(n); ids.push(n.id);
    }
    for (const w of d.wires) { const n = Object.assign({}, w, { id: newId('w'), x1: w.x1 + off, y1: w.y1 + off, x2: w.x2 + off, y2: w.y2 + off }); app.circuit.wires.push(n); ids.push(n.id); }
    app.sel = new Set(ids);
    for (const id of ids) app.inserted.add(id);
    app.commit();
  };
  app.duplicateSel = function () {
    if (!app.sel.size) return;
    app.paste(JSON.stringify({ comps: app.selectedComps(), wires: app.circuit.wires.filter(w => app.sel.has(w.id)) }), 3);
  };

  /* ---------- tools and placing ---------- */
  app.setTool = function (tool, opts) {
    app.tool = tool;
    app.overlay.ghost = null; app.overlay.wirePath = null; app.overlay.snap = null;
    if (app.editor) app.editor.chain = null;
    if (tool === 'place') {
      const type = opts.type;
      const dm = app.settings.defModel;
      const props = Object.assign(C.defaults(type), (type === 'diode' || type === 'schottky') ? { model: dm } : (type === 'led' || type === 'rgbled') && dm === 'exact' ? { model: 'exact' } : {}, opts.props || {});
      app.place = { type, props, rot: C.TYPES[type].defRot || 0, flip: type === 'bjt' && props.pol === 'pnp' };
    } else app.place = null;
    if (tool !== 'select') app.sel.clear();
    // phone: get the bottom sheet out of the way while placing, wiring or picking the Thévenin terminals
    if (tool !== 'select' && app.ui && app.ui.closeSheet) app.ui.closeSheet();
    app.hint(tool === 'port' ? app.t((app.thev && app.thev.a && !app.thev.b && !app.thev.loadId) ? 'thev_pickB' : 'thev_pickA') : null);
    if (tool === 'port') { app.thev = null; app.port = null; }
    app.ui.update();
    app.requestRender();
  };
  app.rotatePlace = function () { if (app.place) { app.place.rot = (app.place.rot + 1) % 4; if (app.overlay.ghost) app.overlay.ghost.rot = app.place.rot; app.requestRender(); } };
  app.flipPlace = function () { if (app.place) { app.place.flip = !app.place.flip; if (app.overlay.ghost) app.overlay.ghost.flip = app.place.flip; app.requestRender(); } };
  app.placeGhostNow = function (backToSelect) {
    const gh = app.overlay.ghost;
    if (!gh || !app.place) return;
    app.checkpoint();
    const c = { id: newId('c'), type: gh.type, name: gh.type === 'ground' ? '' : nextName(C.TYPES[gh.type].prefix), x: gh.x, y: gh.y, rot: gh.rot, flip: gh.flip, props: Object.assign({}, app.place.props) };
    app.circuit.comps.push(c);
    app.inserted.add(c.id);
    if (backToSelect) { app.setTool('select'); app.sel = new Set([c.id]); }
    app.commit();
  };

  /* ---------- view ---------- */
  app.viewChanged = function () { app.tip(null); app.requestRender(); };
  app.zoomAt = function (k, sx, sy) {
    const v = app.view;
    const s = Math.max(app.minScale, Math.min(app.maxScale, v.scale * k));
    const wx = (sx - v.ox) / v.scale, wy = (sy - v.oy) / v.scale;
    v.scale = s; v.ox = sx - wx * s; v.oy = sy - wy * s;
    app.viewChanged();
  };
  app.circuitBounds = function (circuit) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of circuit.comps) { const b = C.bounds(c); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
    for (const w of circuit.wires) { x0 = Math.min(x0, w.x1, w.x2); y0 = Math.min(y0, w.y1, w.y2); x1 = Math.max(x1, w.x1, w.x2); y1 = Math.max(y1, w.y1, w.y2); }
    if (!isFinite(x0)) return null;
    return [x0, y0, x1, y1];
  };
  app.fitView = function (circuit, w, h, margin, maxScale) {
    const b = app.circuitBounds(circuit);
    if (!b) return { scale: 22, ox: w / 2, oy: h / 2 };
    const m = margin == null ? 3 : margin;
    const bw = b[2] - b[0] + 2 * m, bh = b[3] - b[1] + 2 * m;
    const s = Math.max(app.minScale, Math.min(maxScale || 34, w / bw, h / bh));
    return { scale: s, ox: w / 2 - (b[0] + b[2]) / 2 * s, oy: h / 2 - (b[1] + b[3]) / 2 * s };
  };
  app.fit = function () {
    const R = app.renderer;
    // leave room for the chips at the top and the buttons at the bottom
    const v = app.fitView(app.circuit, R.w, Math.max(80, R.h - 70), 3.5);
    v.oy += 30;
    app.view = v;
    app.viewChanged();
  };

  /* ---------- rendering ---------- */
  let raf = 0, lastT = 0;
  app.requestRender = function () { if (!raf) raf = requestAnimationFrame(frame); };
  function frame(ts) {
    raf = 0;
    const dt = lastT ? Math.min(0.1, (ts - lastT) / 1000) : 0;
    lastT = ts;
    if (app.flow && app.settings.animate) for (const s of app.flow.segs) s.phase += s.speed * dt;
    app.renderer.draw(stateForRender());
    if (app.flow && app.settings.animate) app.requestRender();
    else lastT = 0;
  }
  function stateForRender() {
    return {
      circuit: app.circuit, view: app.view, settings: app.settings, sel: app.sel, hover: app.hover, net: app.net,
      result: app.result, overlay: app.overlay, port: app.port, flow: app.flow, wireCur: app.wireCur, hiNode: app.hiNode, badIds: app.badIds, tr: app.tp
    };
  }
  app.stateForRender = stateForRender;

  /* ---------- persistence ---------- */
  function save() {
    LS.set('dcs.circuit', snap());
  }
  app.saveSettings = function () { LS.set('dcs.settings', JSON.stringify(app.settings)); };
  app.loadCircuit = function (circuit, opts) {
    opts = opts || {};
    if (!circuit || !Array.isArray(circuit.comps) || !Array.isArray(circuit.wires)) throw new Error('bad');
    if (opts.checkpoint) app.checkpoint();
    const clean = { comps: [], wires: [] };
    for (const c of circuit.comps) {
      if (!C.TYPES[c.type]) continue;
      const n = { id: String(c.id), type: c.type, name: String(c.name || ''), x: Math.round(+c.x || 0), y: Math.round(+c.y || 0), rot: ((+c.rot || 0) % 4 + 4) % 4, flip: !!c.flip, props: Object.assign(C.defaults(c.type), c.props || {}) };
      if (c.refV === 0 || c.refV === 1) n.refV = c.refV;
      if (c.refI === 0 || c.refI === 1) n.refI = c.refI;
      clean.comps.push(n);
    }
    clean.nodeNames = (circuit.nodeNames || []).filter(nn => nn && isFinite(nn.x) && isFinite(nn.y) && nn.name).map(nn => ({ x: Math.round(nn.x), y: Math.round(nn.y), name: String(nn.name).slice(0, 12) }));
    for (const w of circuit.wires) clean.wires.push({ id: String(w.id), x1: Math.round(+w.x1), y1: Math.round(+w.y1), x2: Math.round(+w.x2), y2: Math.round(+w.y2) });
    app.circuit = clean;
    app.sel.clear();
    app.prevStates = {}; app.prevV = null;
    app.thev = null; app.port = null;
    syncIds();
    if (circuit.thevLoad) app.thev = { loadId: circuit.thevLoad };
    if (circuit.show) {
      if (circuit.show.p) app.settings.showP = true;
      app.ui.syncControls();
    }
    app.commit();
    if (opts.fit) app.fit();
  };

  // share links: #c=<base64url of deflated JSON>
  const b64u = {
    enc(bytes) { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    dec(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const s = atob(str); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  };
  function compact() {
    // short form: comps as arrays, wires as flat arrays
    return JSON.stringify({ v: 1, c: app.circuit.comps.map(c => [c.type, c.name, c.x, c.y, c.rot, c.flip ? 1 : 0, c.props, c.refV, c.refI]), w: app.circuit.wires.map(w => [w.x1, w.y1, w.x2, w.y2]), n: (app.circuit.nodeNames || []).map(nn => [nn.x, nn.y, nn.name]) });
  }
  function expand(o) {
    let k = 0;
    return { comps: o.c.map(a => ({ id: 'c' + (++k), type: a[0], name: a[1], x: a[2], y: a[3], rot: a[4], flip: !!a[5], props: a[6], refV: a[7], refI: a[8] })), wires: o.w.map(a => ({ id: 'w' + (++k), x1: a[0], y1: a[1], x2: a[2], y2: a[3] })), nodeNames: (o.n || []).map(a => ({ x: a[0], y: a[1], name: a[2] })) };
  }
  async function streamBytes(bytes, stream) {
    const s = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  app.shareLink = async function () {
    const json = new TextEncoder().encode(compact());
    let code;
    if (typeof CompressionStream !== 'undefined') code = 'z' + b64u.enc(await streamBytes(json, new CompressionStream('deflate-raw')));
    else code = 'j' + b64u.enc(json);
    return location.href.split('#')[0] + '#c=' + code;
  };
  async function loadFromHash(keepPrevious) {
    const m = /#c=([zj])([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return false;
    try {
      let bytes = b64u.dec(m[2]);
      if (m[1] === 'z') bytes = await streamBytes(bytes, new DecompressionStream('deflate-raw'));
      app.loadCircuit(expand(JSON.parse(new TextDecoder().decode(bytes))), { fit: true, checkpoint: !!keepPrevious });
      history.replaceState(null, '', location.href.split('#')[0]);
      return true;
    } catch (e) { return false; }
  }
  app.exportPNG = function () {
    const b = app.circuitBounds(app.circuit);
    if (!b) return;
    const scale = 32, m = 3;
    const w = Math.min(4000, (b[2] - b[0] + 2 * m) * scale), h = Math.min(4000, (b[3] - b[1] + 2 * m) * scale);
    const cv = document.createElement('canvas');
    const R = new DCS.render.Renderer(cv);
    R.dpr = 2; R.w = w; R.h = h; cv.width = w * 2; cv.height = h * 2;
    const st = stateForRender();
    st.view = app.fitView(app.circuit, w, h, m, scale);
    st.sel = new Set(); st.hover = null; st.overlay = {}; st.hiNode = null;
    st.settings = Object.assign({}, app.settings, { grid: false, animate: false });
    R.draw(st);
    cv.toBlob((blob) => download(blob, 'circuit.png'));
  };
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  app.saveFile = function () {
    const data = JSON.stringify({ app: 'dc-circuit-simulator', version: 1, circuit: app.circuit }, null, 1);
    download(new Blob([data], { type: 'application/json' }), 'circuit.json');
  };
  app.openFile = function (file) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const o = JSON.parse(rd.result);
        app.loadCircuit(o.circuit || o, { fit: true, checkpoint: true });
        app.toast(app.t('loaded'));
      } catch (e) { app.toast(app.t('load_err')); }
    };
    rd.readAsText(file);
  };

  /* ---------- start ---------- */
  async function start() {
    const saved = LS.get('dcs.settings');
    if (saved) { try { Object.assign(app.settings, JSON.parse(saved)); } catch (e) { /* ignore */ } }
    app.settings.animate = false;
    let lang = LS.get('dcs.lang');
    if (!lang) { const n = (navigator.language || 'en').slice(0, 2).toLowerCase(); lang = ['en', 'fr', 'es'].includes(n) ? n : 'en'; }
    I.setLang(lang);
    U.setDecimalComma(lang !== 'en');

    const cv = document.getElementById('cv');
    app.renderer = new DCS.render.Renderer(cv);
    DCS.render.readColors();
    app.editor = new DCS.Editor(app, cv);
    app.ui = DCS.UI(app);
    app.renderer.resize();

    let loaded = false;
    const c = LS.get('dcs.circuit');
    if (c) { try { const o = JSON.parse(c); if (o.comps && o.comps.length) { app.loadCircuit(o); loaded = true; } } catch (e) { /* ignore */ } }
    // a shared circuit replaces the saved one, which stays one undo away
    if (await loadFromHash(loaded)) loaded = true;
    if (!loaded) app.loadCircuit(DCS.examples.get('divider'));
    app.fit();
    new ResizeObserver(() => { const w = app.renderer.w, h = app.renderer.h; app.renderer.resize(); if (!w || !h) app.fit(); app.requestRender(); }).observe(cv);
  }

  app.LS = LS;
  DCS.app = app;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
