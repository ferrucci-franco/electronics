/* From the drawn schematic (components + wires on a grid) to the solver netlist.
 * Wires connect at their end points and wherever an end point or a terminal lies on another wire. */
(function (root) {
  'use strict';
  const C = root.DCS ? root.DCS.comp : require('./components.js');
  const key = (x, y) => x + ',' + y;

  function onSegment(px, py, w) {
    // strictly inside the segment (end points excluded), integer grid coordinates
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    if ((px - w.x1) * dy - (py - w.y1) * dx !== 0) return false;
    const t = (px - w.x1) * dx + (py - w.y1) * dy;
    return t > 0 && t < dx * dx + dy * dy;
  }

  function build(circuit) {
    const P = new Map();
    const point = (x, y) => {
      const k = key(x, y);
      let p = P.get(k);
      if (!p) { p = { x, y, k, idx: P.size, ends: 0, through: 0, terms: [] }; P.set(k, p); }
      return p;
    };
    const wires = circuit.wires.filter(w => w.x1 !== w.x2 || w.y1 !== w.y2);
    for (const w of wires) { point(w.x1, w.y1).ends++; point(w.x2, w.y2).ends++; }
    const compTerms = new Map();
    for (const c of circuit.comps) {
      const ts = C.terminals(c).map(([x, y], j) => { const p = point(x, y); p.terms.push([c, j]); return p; });
      compTerms.set(c.id, ts);
    }
    const pts = Array.from(P.values());
    const parent = pts.map((_, i) => i);
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };

    // index the points by row and column for the axis-aligned wires
    const byX = new Map(), byY = new Map();
    for (const p of pts) {
      if (!byX.has(p.x)) byX.set(p.x, []);
      if (!byY.has(p.y)) byY.set(p.y, []);
      byX.get(p.x).push(p); byY.get(p.y).push(p);
    }
    const inner = new Map(); // wire id -> points strictly inside, sorted along the wire
    for (const w of wires) {
      const a = P.get(key(w.x1, w.y1)), b = P.get(key(w.x2, w.y2));
      union(a.idx, b.idx);
      let cand = w.x1 === w.x2 ? byX.get(w.x1) : w.y1 === w.y2 ? byY.get(w.y1) : pts;
      const ins = [];
      for (const p of cand) if (onSegment(p.x, p.y, w)) { ins.push(p); union(p.idx, a.idx); p.through++; }
      const len2 = (p) => (p.x - w.x1) ** 2 + (p.y - w.y1) ** 2;
      ins.sort((p, q) => len2(p) - len2(q));
      inner.set(w.id, ins);
    }

    // a closed switch is an ideal wire between its terminals
    const closedSw = circuit.comps.filter(c => C.isSwitch(c) && C.isClosed(c));
    for (const c of closedSw) { const [a, b] = compTerms.get(c.id); union(a.idx, b.idx); }

    // node numbering: ground first (0), then by first appearance
    const rootNode = new Map();
    let groundRoot = null;
    for (const c of circuit.comps) if (c.type === 'ground') { const r = find(compTerms.get(c.id)[0].idx); if (groundRoot === null) groundRoot = r; else union(r, groundRoot); }
    if (groundRoot !== null) groundRoot = find(groundRoot);
    let noGround = false;
    if (groundRoot === null) {
      // no ground symbol: take the negative terminal of the first voltage source, else any terminal
      noGround = circuit.comps.some(c => c.type !== 'ground');
      const vs = circuit.comps.find(c => c.type === 'vsource');
      const any = circuit.comps.find(c => c.type !== 'ground');
      if (vs) groundRoot = find(compTerms.get(vs.id)[1].idx);
      else if (any) groundRoot = find(compTerms.get(any.id)[compTerms.get(any.id).length - 1].idx);
    }
    if (groundRoot !== null) rootNode.set(groundRoot, 0);
    let nodeCount = 1;
    const nodeOfPoint = (p) => {
      const r = find(p.idx);
      if (!rootNode.has(r)) rootNode.set(r, nodeCount++);
      return rootNode.get(r);
    };
    const compNodes = new Map();
    for (const c of circuit.comps) compNodes.set(c.id, compTerms.get(c.id).map(nodeOfPoint));
    const pointNode = new Map();
    for (const p of pts) pointNode.set(p.k, nodeOfPoint(p));

    const elements = [];
    for (const c of circuit.comps) {
      const n = compNodes.get(c.id), pr = c.props;
      switch (c.type) {
        case 'resistor': elements.push({ type: 'R', id: c.id, n, R: pr.R }); break;
        case 'vsource': elements.push({ type: 'V', id: c.id, n, V: pr.V }); break;
        case 'isource': elements.push({ type: 'I', id: c.id, n, I: pr.I }); break;
        case 'ammeter': case 'isense': elements.push({ type: 'AM', id: c.id, n }); break;
        case 'voltmeter': case 'vsense': elements.push({ type: 'VM', id: c.id, n }); break;
        case 'depv': case 'depi': {
          // controlled by the current of an ammeter-like sensor or by the voltage across a voltmeter-like one;
          // without a control the source is zero
          const s = C.ctrlOf(c, circuit), cur = s && C.meterKind(s) === 'A', k = s ? pr.k : 0;
          const vt = c.type === 'depv';
          if (cur) elements.push({ type: vt ? 'H' : 'F', id: c.id, n, ctrl: s.id, k });
          else elements.push({ type: vt ? 'E' : 'G', id: c.id, n, cn: s ? compNodes.get(s.id) : [0, 0], k });
          break;
        }
        // an open switch is an open circuit: a voltmeter gives the voltage across its contacts
        case 'switch': case 'button': if (!C.isClosed(c)) elements.push({ type: 'VM', id: c.id, n }); break;
        case 'pot': {
          // two resistors A–W and W–B; a tiny minimum keeps the end positions solvable
          const f = C.potFrac(c), rmin = Math.max(1e-3, pr.R * 1e-6);
          elements.push({ type: 'R', id: c.id + '#a', n: [n[0], n[2]], R: Math.max(rmin, pr.R * f) });
          elements.push({ type: 'R', id: c.id + '#b', n: [n[2], n[1]], R: Math.max(rmin, pr.R * (1 - f)) });
          break;
        }
        case 'led': {
          // exact model: emission coefficient 2 and I_S chosen so that V = Vf at 10 mA
          const N = 2, Is = 0.01 / (Math.exp(pr.Vf / (N * 0.025865)) - 1);
          elements.push({ type: 'D', id: c.id, n, model: pr.model === 'exact' ? 'exact' : 'cvd', Vf: pr.Vf, rd: pr.rd, Is, N, bv: pr.bd ? pr.Vbr : 0, rz: pr.rd });
          break;
        }
        case 'rgbled': {
          // three junctions sharing the common terminal (cathode or anode)
          const ca = pr.common === 'ca';
          ['R', 'G', 'B'].forEach((ch, k) => {
            const vf = pr['Vf' + ch], N = 2, Is = 0.01 / (Math.exp(vf / (N * 0.025865)) - 1);
            elements.push({ type: 'D', id: c.id + '#' + k, n: ca ? [n[3], n[k]] : [n[k], n[3]], model: pr.model === 'exact' ? 'exact' : 'cvd', Vf: vf, rd: 0, Is, N });
          });
          break;
        }
        case 'diode': case 'schottky':
          // reverse breakdown (avalanche) only when asked for, with the same series resistance
          elements.push({ type: 'D', id: c.id, n, model: pr.model, Vf: pr.Vf, rd: pr.rd, Is: pr.Is, N: pr.N, bv: pr.bd ? pr.Vbr : 0, rz: pr.rd }); break;
        case 'zener':
          elements.push({ type: 'D', id: c.id, n, model: pr.model, Vf: pr.Vf, rd: pr.rd, Is: pr.Is, N: pr.N, bv: pr.Vz, rz: pr.rz }); break;
        case 'opamp': elements.push({ type: 'OA', id: c.id, n, sat: !!pr.sat, Vpos: Math.max(pr.Vpos, pr.Vneg), Vneg: Math.min(pr.Vpos, pr.Vneg) }); break;
        case 'bjt': elements.push({ type: 'Q', id: c.id, n, pnp: pr.pol === 'pnp', model: pr.model === 'em' ? 'em' : 'simple', beta: pr.beta, Vbe: pr.Vbe, Vcesat: pr.Vcesat, Is: pr.Is, betaR: pr.betaR, VA: pr.VA }); break;
        default: break;
      }
    }

    // drawing aids: junction dots, open terminals, a label point per node
    const junctions = [], openTerms = [];
    for (const p of pts) {
      const deg = p.ends + 2 * p.through + p.terms.length;
      if (deg >= 3 && (p.ends + p.through > 0)) junctions.push([p.x, p.y]);
      if (p.terms.length === 1 && p.ends === 0 && p.through === 0) openTerms.push([p.x, p.y, p.terms[0][0].id]);
    }
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) nodes.push({ id: i, points: [], best: null, score: -1 });
    for (const p of pts) {
      const nd = nodes[pointNode.get(p.k)];
      nd.points.push(p);
      // prefer a wire corner or junction for the label, then a terminal
      const score = (p.ends + p.through) * 2 + (p.terms.length ? 1 : 0) - (p.terms.some(t => t[0].type === 'ground') ? 10 : 0);
      if (score > nd.score || (score === nd.score && (p.y < nd.best.y || (p.y === nd.best.y && p.x < nd.best.x)))) { nd.score = score; nd.best = p; }
    }
    const wireNode = new Map();
    for (const w of wires) wireNode.set(w.id, pointNode.get(key(w.x1, w.y1)));
    // node names given by the user (a point of the node and a name), N1, N2... otherwise
    const nodeOf = (x, y) => {
      const n = pointNode.get(key(x, y));
      if (n != null) return n;
      for (const w of wires) if (onSegment(x, y, w)) return wireNode.get(w.id);
      return null;
    };
    const given = new Array(nodeCount).fill(null);
    for (const nn of circuit.nodeNames || []) {
      const n = nodeOf(nn.x, nn.y);
      if (n != null && n !== 0 && !given[n] && nn.name) given[n] = String(nn.name);
    }
    for (const nd of nodes) nd.name = nd.id === 0 ? '0' : (given[nd.id] || 'N' + nd.id);

    return {
      ckt: { nodeCount, elements }, compNodes, compTerms, pointNode, wireNode, nodes, junctions, openTerms,
      noGround, wires, inner, points: P, nodeOf, closedSw
    };
  }

  /* Current in every wire piece. Inside a node the terminal currents must spread over the wire graph:
   * where the wires form a tree, KCL alone fixes the current of every piece (exact result); a piece that
   * belongs to a loop of ideal wires carries an indeterminate circulating current, marked `loop` (the value
   * given then is the share of a resistance proportional to the length, used only by the animation).
   * The ground symbols of the reference node are joined through a hidden "earth" vertex. */
  function wireCurrents(net, res, solver) {
    const out = new Map(); // wire id -> array of {x1, y1, x2, y2, i, loop}; i > 0 from (x1, y1) to (x2, y2)
    out.sw = new Map();    // closed switch id -> its piece (a wire from terminal 1 to terminal 2)
    if (!res || !res.ok) return out;
    const byNode = new Map();
    const closed = new Set((net.closedSw || []).map(c => c.id));
    for (const c of net.closedSw || []) {
      const [a, b] = net.compTerms.get(c.id);
      const piece = { sw: c, x1: a.x, y1: a.y, x2: b.x, y2: b.y, i: 0, loop: false };
      out.sw.set(c.id, piece);
      const nd = net.pointNode.get(a.k);
      if (!byNode.has(nd)) byNode.set(nd, []);
      byNode.get(nd).push(piece);
    }
    for (const w of net.wires) {
      const pts = [[w.x1, w.y1]].concat(net.inner.get(w.id).map(p => [p.x, p.y]), [[w.x2, w.y2]]);
      const pieces = [];
      for (let i = 0; i + 1 < pts.length; i++) pieces.push({ w, x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], i: 0, loop: false });
      out.set(w.id, pieces);
      const nd = net.wireNode.get(w.id);
      if (!byNode.has(nd)) byNode.set(nd, []);
      byNode.get(nd).push(...pieces);
    }
    for (const [nd, pieces] of byNode) {
      const idx = new Map();
      const vid = (k) => { if (!idx.has(k)) idx.set(k, idx.size); return idx.get(k); };
      const edges = pieces.map(s => ({ a: vid(key(s.x1, s.y1)), b: vid(key(s.x2, s.y2)), g: 1 / Math.max(1e-9, Math.hypot(s.x2 - s.x1, s.y2 - s.y1)), piece: s }));
      const inj = new Map();
      let earth = -1;
      for (const [k, v] of Array.from(idx.entries())) {
        const p = net.points.get(k);
        if (!p) continue;
        for (const [c, j] of p.terms) {
          if (closed.has(c.id)) continue;
          if (c.type === 'ground') {
            if (earth < 0) earth = vid('earth');
            edges.push({ a: v, b: earth, g: 1 });
            continue;
          }
          const r = res.el[c.id];
          if (r) inj.set(v, (inj.get(v) || 0) - r.tc[j]); // tc enters the component, so it leaves the node
        }
      }
      const n = idx.size;
      if (n < 2) continue;
      // branches: pieces joined at corners where nothing else connects carry the same current
      const deg = new Int32Array(n), hasTerm = new Uint8Array(n);
      for (const e of edges) { deg[e.a]++; deg[e.b]++; if (!e.piece) { hasTerm[e.a] = 1; hasTerm[e.b] = 1; } }
      for (const v of inj.keys()) hasTerm[v] = 1;
      for (const [k, v] of idx) { const p = net.points.get(k); if (p && p.terms.length) hasTerm[v] = 1; }
      const pe = edges.filter(e => e.piece);
      const par = pe.map((_, i) => i);
      const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
      const atV = new Map();
      pe.forEach((e, i) => { for (const v of [e.a, e.b]) { if (!atV.has(v)) atV.set(v, []); atV.get(v).push(i); } });
      for (const [v, list] of atV) if (list.length === 2 && deg[v] === 2 && !hasTerm[v]) { const a = find(list[0]), b = find(list[1]); if (a !== b) par[a] = b; }
      pe.forEach((e, i) => { e.piece.chain = nd + ':' + find(i); });
      // pieces in a cycle (not a bridge of the node graph) carry an indeterminate current
      const adj = Array.from({ length: n }, () => []);
      edges.forEach((e, k) => { adj[e.a].push([e.b, k]); adj[e.b].push([e.a, k]); });
      for (let k = 0; k < edges.length; k++) {
        const e = edges[k];
        if (!e.piece) continue;
        const seen = new Uint8Array(n); seen[e.a] = 1;
        const q = [e.a];
        let found = false;
        while (q.length && !found) {
          const u = q.pop();
          for (const [v, kk] of adj[u]) { if (kk === k || seen[v]) continue; if (v === e.b) { found = true; break; } seen[v] = 1; q.push(v); }
        }
        e.piece.loop = found;
      }
      // potentials of a resistive network with the injections; the earth (or one vertex) is the reference
      const ref = earth >= 0 ? earth : 0;
      const map = new Int32Array(n).fill(-1), free = [];
      for (let v = 0; v < n; v++) if (v !== ref) { map[v] = free.length; free.push(v); }
      const m = free.length;
      const A = []; for (let i = 0; i < m; i++) A.push(new Float64Array(m));
      const b = new Float64Array(m);
      for (const e of edges) {
        const ia = map[e.a], ib = map[e.b];
        if (ia >= 0) A[ia][ia] += e.g;
        if (ib >= 0) A[ib][ib] += e.g;
        if (ia >= 0 && ib >= 0) { A[ia][ib] -= e.g; A[ib][ia] -= e.g; }
      }
      for (let i = 0; i < m; i++) { b[i] = inj.get(free[i]) || 0; A[i][i] += 1e-12; }
      const x = solver.luSolve(A, b);
      if (!x) continue;
      const pot = (v) => (map[v] >= 0 ? x[map[v]] : 0);
      for (const e of edges) if (e.piece) e.piece.i = (pot(e.a) - pot(e.b)) * e.g;
    }
    return out;
  }

  const api = { build, wireCurrents, key };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.DCS = root.DCS || {}).netlist = api;
})(typeof window !== 'undefined' ? window : globalThis);
