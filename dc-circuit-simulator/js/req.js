/* Equivalent resistance between the port A–B, step by step, the way it is done by hand:
 * the independent sources are set to zero (voltage source = short circuit, current source = open circuit),
 * then the resistor network is reduced with series and parallel combinations (and Δ → Y when a bridge
 * leaves nothing in series or in parallel). The result is checked with a test source on the same network. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const S = DCS.solver;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* app: the application; th: app.thev (with res.a / res.b nodes and loadId). Returns
   * { kind: 'nonlinear' } | { kind: 'dep', rtest } | { kind: 'rn', steps, req, rtest, open, zero, stuck } */
  function compute(app, th) {
    const net = th.net || app.net, r = th.res;   // th.net: the side looked into, when A–B cuts the circuit
    const exclude = new Set(th.loadId ? net.ckt.elements.filter(el => el.id.split('#')[0] === th.loadId).map(el => el.id) : []);
    const els = net.ckt.elements.filter(el => !exclude.has(el.id));
    if (els.some(el => el.type === 'D' || el.type === 'LMP')) return { kind: 'nonlinear' };
    // the same network with the independent sources set to zero, for the test source
    const ckt0 = { nodeCount: net.ckt.nodeCount, elements: els.map(el => (el.type === 'V' ? Object.assign({}, el, { V: 0 }) : el.type === 'I' ? Object.assign({}, el, { I: 0 }) : el)) };
    const t0 = S.thevenin(ckt0, r.a, r.b, { tempC: app.settings.tempC });
    const rtest = t0.error ? undefined : t0.rth;
    if (els.some(el => ['Q', 'OA', 'E', 'H', 'G', 'F'].includes(el.type))) return { kind: 'dep', rtest };

    // nodes joined by the shorts (voltage sources set to zero, ammeters)
    const N0 = net.ckt.nodeCount;
    const par = Array.from({ length: N0 }, (_, i) => i);
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (const el of els) if (el.type === 'V' || el.type === 'AM') par[find(el.n[0])] = find(el.n[1]);
    const A = find(r.a), B = find(r.b);
    const name = (id) => {
      const [base, part] = String(id).split('#');
      const c = app.circuit.comps.find(x => x.id === base);
      const n = c ? (c.name || app.tp('c_' + c.type)) : base;
      return esc(part === 'a' ? n + ' (A–W)' : part === 'b' ? n + ' (W–B)' : n);
    };
    let edges = els.filter(el => el.type === 'R').map(el => ({ a: find(el.n[0]), b: find(el.n[1]), R: el.R, name: name(el.id), ids: [el.id.split('#')[0]] }));
    const out = { kind: 'rn', steps: [], rtest };
    if (A === B) { out.zero = true; out.req = 0; return out; }
    let k = 0, next = N0;
    const label = () => 'R<sub>eq' + (++k) + '</sub>';
    const ids = (...es) => Array.from(new Set(es.flatMap(e => e.ids)));
    for (let guard = 0; guard < 400; guard++) {
      // a resistor with both ends on the same node carries no current
      const self = edges.find(e => e.a === e.b);
      if (self) { out.steps.push({ code: 'req_short', a: self.name, ids: self.ids }); edges = edges.filter(e => e !== self); continue; }
      // pieces that do not reach A or B, and dead ends, carry no current
      const reach = new Set([A, B]);
      for (let grow = true; grow;) { grow = false; for (const e of edges) if (reach.has(e.a) !== reach.has(e.b)) { reach.add(e.a); reach.add(e.b); grow = true; } }
      const loose = edges.find(e => !reach.has(e.a));
      if (loose) { out.steps.push({ code: 'req_float', a: loose.name, ids: loose.ids }); edges = edges.filter(e => e !== loose); continue; }
      const deg = new Map();
      for (const e of edges) { deg.set(e.a, (deg.get(e.a) || 0) + 1); deg.set(e.b, (deg.get(e.b) || 0) + 1); }
      const dead = edges.find(e => [e.a, e.b].some(n => n !== A && n !== B && deg.get(n) === 1));
      if (dead) { out.steps.push({ code: 'req_dangling', a: dead.name, ids: dead.ids }); edges = edges.filter(e => e !== dead); continue; }
      if (!edges.length) { out.open = true; out.req = Infinity; return out; }
      if (edges.length === 1 && ((edges[0].a === A && edges[0].b === B) || (edges[0].a === B && edges[0].b === A))) { out.req = edges[0].R; out.last = edges[0].name; return out; }
      // two resistors between the same two nodes: in parallel
      let done = false;
      for (let i = 0; i < edges.length && !done; i++) for (let j = i + 1; j < edges.length && !done; j++) {
        const e = edges[i], f = edges[j];
        if (!((e.a === f.a && e.b === f.b) || (e.a === f.b && e.b === f.a))) continue;
        const R = e.R * f.R / (e.R + f.R), n = { a: e.a, b: e.b, R, name: label(), ids: ids(e, f) };
        out.steps.push({ code: 'req_par', r: n.name, a: e.name, b: f.name, va: e.R, vb: f.R, v: R, ids: n.ids });
        edges = edges.filter(x => x !== e && x !== f).concat([n]);
        done = true;
      }
      if (done) continue;
      // a node (not A or B) where only two resistors meet: in series
      for (const [node, d] of deg) {
        if (node === A || node === B || d !== 2) continue;
        const [e, f] = edges.filter(x => x.a === node || x.b === node);
        const ea = e.a === node ? e.b : e.a, fb = f.a === node ? f.b : f.a;
        const n = { a: ea, b: fb, R: e.R + f.R, name: label(), ids: ids(e, f) };
        out.steps.push({ code: 'req_ser', r: n.name, a: e.name, b: f.name, va: e.R, vb: f.R, v: n.R, ids: n.ids });
        edges = edges.filter(x => x !== e && x !== f).concat([n]);
        done = true;
        break;
      }
      if (done) continue;
      // neither: a triangle becomes a star (Δ → Y) with a new centre node
      const tri = triangle(edges);
      if (tri) {
        const [[x, y, exy], [, z, eyz], [, , ezx]] = tri;
        const sum = exy.R + eyz.R + ezx.R, c = next++;
        const rx = { a: x, b: c, R: exy.R * ezx.R / sum, name: label(), ids: ids(exy, ezx) };
        const ry = { a: y, b: c, R: exy.R * eyz.R / sum, name: label(), ids: ids(exy, eyz) };
        const rz = { a: z, b: c, R: eyz.R * ezx.R / sum, name: label(), ids: ids(eyz, ezx) };
        out.steps.push({ code: 'req_dy', a: exy.name, b: eyz.name, c: ezx.name, va: exy.R, vb: eyz.R, vc: ezx.R, y: [rx, ry, rz].map(q => ({ name: q.name, v: q.R })), ids: ids(exy, eyz, ezx) });
        edges = edges.filter(e => e !== exy && e !== eyz && e !== ezx).concat([rx, ry, rz]);
        continue;
      }
      break;
    }
    out.stuck = true;
    return out;
  }

  // three resistors forming a triangle x–y–z: [[x, y, e_xy], [y, z, e_yz], [z, x, e_zx]]
  function triangle(edges) {
    const other = (e, n) => (e.a === n ? e.b : e.a);
    for (const e of edges) for (const f of edges) {
      if (f === e) continue;
      const x = e.a, y = e.b;
      if (f.a !== y && f.b !== y) continue;
      const z = other(f, y);
      if (z === x || z === y) continue;
      const g = edges.find(h => h !== e && h !== f && ((h.a === z && h.b === x) || (h.a === x && h.b === z)));
      if (g) return [[x, y, e], [y, z, f], [z, x, g]];
    }
    return null;
  }

  DCS.req = { compute };
})(window);
