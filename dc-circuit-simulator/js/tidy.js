/* Tidying of the wires without changing any connection.
 * - prettify (button): diagonal wires become L shapes routed around the components, collinear pieces that
 *   touch or overlap are merged, duplicates go away and dead ends are trimmed back to the last connection;
 * - afterMove (after every drag): the same merging, and the dead ends left where the moved items were.
 * A result is accepted only if every component terminal still sits on the same node as before. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, N = DCS.netlist;

  // which terminals share a node, independent of the node numbering
  function signature(circuit) {
    const net = N.build(circuit);
    const map = new Map(), out = [];
    for (const c of circuit.comps) {
      for (const n of net.compNodes.get(c.id)) {
        if (!map.has(n)) map.set(n, map.size);
        out.push(map.get(n));
      }
    }
    return out.join(',') + '|' + (net.noGround ? 1 : 0);
  }

  const onInterior = (x, y, w) => {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    if ((x - w.x1) * dy - (y - w.y1) * dx !== 0) return false;
    const t = (x - w.x1) * dx + (y - w.y1) * dy;
    return t > 0 && t < dx * dx + dy * dy;
  };
  const segKey = (w) => { const a = w.x1 + ',' + w.y1, b = w.x2 + ',' + w.y2; return a < b ? a + ';' + b : b + ';' + a; };

  // merge collinear horizontal / vertical pieces; diagonal wires are passed through unchanged
  function mergeLines(wires, terms) {
    const out = wires.filter(w => w.x1 !== w.x2 && w.y1 !== w.y2).map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }));
    for (const horiz of [true, false]) {
      const lines = new Map();
      for (const w of wires) {
        if (w.x1 === w.x2 && w.y1 === w.y2) continue;
        if (horiz ? w.y1 !== w.y2 : w.x1 !== w.x2) continue;
        const k = horiz ? w.y1 : w.x1;
        const a = horiz ? Math.min(w.x1, w.x2) : Math.min(w.y1, w.y2), b = horiz ? Math.max(w.x1, w.x2) : Math.max(w.y1, w.y2);
        if (!lines.has(k)) lines.set(k, { iv: [], ends: new Set() });
        const L = lines.get(k);
        L.iv.push([a, b]); L.ends.add(a); L.ends.add(b);
      }
      const others = wires.filter(w => (horiz ? w.y1 !== w.y2 : w.x1 !== w.x2));
      for (const [k, L] of lines) {
        L.iv.sort((p, q) => p[0] - q[0]);
        const runs = [];
        for (const [a, b] of L.iv) {
          const last = runs[runs.length - 1];
          if (last && a <= last[1]) last[1] = Math.max(last[1], b); else runs.push([a, b]);
        }
        for (const [a, b] of runs) {
          // keep an end point where something else connects: a wire crossing there (that crossing was a
          // connection), the end of a wire across the line, or a component terminal (a branch point)
          const cuts = [a];
          for (const e of Array.from(L.ends).sort((p, q) => p - q)) {
            if (e <= a || e >= b) continue;
            const [x, y] = horiz ? [e, k] : [k, e];
            const branch = others.some(o => onInterior(x, y, o) || (o.x1 === x && o.y1 === y) || (o.x2 === x && o.y2 === y)) ||
              (terms || []).some(t => t[0] === x && t[1] === y);
            if (branch) cuts.push(e);
          }
          cuts.push(b);
          for (let i = 0; i + 1 < cuts.length; i++) out.push(horiz ? { x1: cuts[i], y1: k, x2: cuts[i + 1], y2: k } : { x1: k, y1: cuts[i], x2: k, y2: cuts[i + 1] });
        }
      }
    }
    return out;
  }

  // dead ends (touching nothing) are pulled back to the last connection along the wire; `may(x, y)` says
  // which dead ends may be trimmed
  function trimDead(wires, terms, may) {
    let ws = wires.map(w => Object.assign({}, w));
    const isTerm = (x, y) => terms.some(t => t[0] === x && t[1] === y);
    for (let pass = 0; pass < 100; pass++) {
      let changed = false;
      const live = (w, x, y) => isTerm(x, y) || ws.some(o => o !== w && !o.dead && ((o.x1 === x && o.y1 === y) || (o.x2 === x && o.y2 === y) || onInterior(x, y, o)));
      for (const w of ws) {
        if (w.dead) continue;
        for (const end of [1, 2]) {
          const x = end === 1 ? w.x1 : w.x2, y = end === 1 ? w.y1 : w.y2;
          if (live(w, x, y) || !may(x, y)) continue;
          const pts = [];
          for (const t of terms) if (onInterior(t[0], t[1], w)) pts.push(t);
          for (const o of ws) if (o !== w && !o.dead) for (const q of [[o.x1, o.y1], [o.x2, o.y2]]) if (onInterior(q[0], q[1], w)) pts.push(q);
          if (!pts.length) { w.dead = true; changed = true; break; }
          pts.sort((p, q) => Math.hypot(p[0] - x, p[1] - y) - Math.hypot(q[0] - x, q[1] - y));
          if (end === 1) { w.x1 = pts[0][0]; w.y1 = pts[0][1]; } else { w.x2 = pts[0][0]; w.y2 = pts[0][1]; }
          changed = true;
        }
      }
      ws = ws.filter(w => !w.dead && (w.x1 !== w.x2 || w.y1 !== w.y2));
      if (!changed) break;
    }
    return ws;
  }

  // apply a new set of wires if the connections are unchanged; reuse the ids of unchanged pieces
  function apply(app, ws, before) {
    const circuit = app.circuit;
    const ids = new Map(circuit.wires.map(w => [segKey(w), w.id]));
    const used = new Set();
    const wires = ws.map(w => {
      const k = segKey(w);
      let id = ids.get(k);
      if (!id || used.has(id)) id = app.newWireId();
      used.add(id);
      return { id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
    });
    const candidate = { comps: circuit.comps, wires, nodeNames: circuit.nodeNames };
    if (signature(candidate) !== before) return { ok: false };
    const norm = (list) => JSON.stringify(list.map(segKey).sort());
    if (norm(circuit.wires) === norm(wires)) return { ok: true, changed: false };
    // node names stay with their node: anchor them on a terminal (or a point) of that node
    const net = app.net && app.net.nodeOf ? app.net : N.build(circuit);
    const names = (circuit.nodeNames || []).map(nn => {
      const nd = net.nodeOf(nn.x, nn.y);
      const p = nd != null && net.nodes[nd] ? net.nodes[nd].points.find(q => q.terms.length) || net.nodes[nd].points[0] : null;
      return p ? { x: p.x, y: p.y, name: nn.name } : nn;
    });
    const n0 = circuit.wires.length;
    circuit.wires = wires;
    circuit.nodeNames = names;
    return { ok: true, changed: true, before: n0, after: wires.length };
  }

  function terminals(circuit) {
    const t = [];
    for (const c of circuit.comps) for (const p of C.terminals(c)) t.push(p);
    return t;
  }

  // direction in which the lead of the terminal at (x, y) leaves its component (unit grid step), or null
  function leadDir(circuit, x, y) {
    for (const c of circuit.comps) {
      const local = C.TYPES[c.type].terms;
      for (let j = 0; j < local.length; j++) {
        const [lx, ly] = local[j], p = C.toWorld(c, lx, ly);
        if (p[0] !== x || p[1] !== y) continue;
        const ux = Math.abs(lx) >= Math.abs(ly) ? Math.sign(lx) : 0, uy = ux ? 0 : Math.sign(ly);
        if (!ux && !uy) return null;
        const q = C.toWorld(c, lx + ux, ly + uy);
        return [q[0] - x, q[1] - y];
      }
    }
    return null;
  }

  function prettify(app) {
    const circuit = app.circuit;
    const before = signature(circuit);
    const n0 = circuit.wires.length;
    let wires = [];
    for (const w of circuit.wires) {
      if (w.x1 === w.x2 && w.y1 === w.y2) continue;
      if (w.x1 !== w.x2 && w.y1 !== w.y2) {
        const path = app.editor.lPath([w.x1, w.y1], [w.x2, w.y2], Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1));
        for (let i = 0; i + 1 < path.length; i++) wires.push({ x1: path[i][0], y1: path[i][1], x2: path[i + 1][0], y2: path[i + 1][1] });
      } else wires.push({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
    }
    const terms = terminals(circuit);
    const ws = trimDead(mergeLines(wires, terms), terms, () => true);
    app.checkpoint();
    const r = apply(app, ws, before);
    if (!r.ok) { app.dropCheckpoint(); return r; }
    const jogs = straightenJogs(app, before);
    if (!r.changed && !jogs) { app.dropCheckpoint(); return { ok: true, changed: false }; }
    app.commit();
    return { ok: true, changed: true, before: n0, after: app.circuit.wires.length, jogs };
  }

  /* Jogs: a wire path that leaves a point, steps aside and goes on in the same direction (a Z made of three
   * pieces whose corners touch nothing else) becomes straight when one of its ends can slide along the wire
   * it sits on (a rail) by the width of the step; e.g. the lead of a resistor that hangs from a rail one
   * grid step aside. Each straightening is kept only if the connections stay the same. */
  function straightenJogs(app, sig) {
    const circuit = app.circuit;
    const terms = terminals(circuit);
    const key = (x, y) => x + ',' + y;
    const isTerm = (x, y) => terms.some(t => t[0] === x && t[1] === y);
    const rejected = new Set();
    let done = 0;
    for (let pass = 0; pass < 40; pass++) {
      const W = circuit.wires;
      // how many things meet at each wire end
      const deg = new Map();
      for (const w of W) for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) deg.set(key(x, y), (deg.get(key(x, y)) || 0) + 1);
      const degree = (x, y) => (deg.get(key(x, y)) || 0) + (isTerm(x, y) ? 1 : 0) + W.filter(o => onInterior(x, y, o)).length * 2;
      const at = (x, y, not) => W.filter(o => o !== not && ((o.x1 === x && o.y1 === y) || (o.x2 === x && o.y2 === y)));
      const other = (w, x, y) => (w.x1 === x && w.y1 === y ? [w.x2, w.y2] : [w.x1, w.y1]);
      let applied = false;
      // an L that comes into a terminal from the side: a leg leaves a rail at P, turns at the corner K and runs
      // into the terminal T across its lead. Sliding P along the rail in line with T leaves one straight wire
      // P'–T that comes in along the lead.
      for (const b of W) {
        const bh = b.y1 === b.y2 && b.x1 !== b.x2, bv = b.x1 === b.x2 && b.y1 !== b.y2;
        if (!bh && !bv) continue;
        for (const [T, K] of [[[b.x1, b.y1], [b.x2, b.y2]], [[b.x2, b.y2], [b.x1, b.y1]]]) {
          if (!isTerm(T[0], T[1]) || degree(T[0], T[1]) !== 2 || degree(K[0], K[1]) !== 2) continue;
          const a = at(K[0], K[1], b)[0];
          if (!a || (bh ? !(a.x1 === a.x2) : !(a.y1 === a.y2))) continue;
          const P = other(a, K[0], K[1]);
          const lead = leadDir(circuit, T[0], T[1]);
          // the lead must point the way the leg goes (from the corner towards the rail)
          if (!lead || (bh ? lead[1] !== Math.sign(P[1] - K[1]) || lead[0] : lead[0] !== Math.sign(P[0] - K[0]) || lead[1])) continue;
          const d = bh ? [T[0] - K[0], 0] : [0, T[1] - K[1]];
          const id = ['L', b.id, P.join(',')].join('|');
          if (rejected.has(id)) continue;
          const trial = slideEnd(W, terms, P, d, [a, b]);
          if (!trial) { rejected.add(id); continue; }
          const P2 = [P[0] + d[0], P[1] + d[1]];
          const wires = trial.filter(w => w !== a && w !== b).concat([{ id: a.id, x1: P2[0], y1: P2[1], x2: T[0], y2: T[1] }]);
          if (signature({ comps: circuit.comps, wires, nodeNames: circuit.nodeNames }) !== sig) { rejected.add(id); continue; }
          circuit.wires = wires;
          applied = true; done++;
          break;
        }
        if (applied) break;
      }
      if (applied) continue;
      for (const b of W) {
        const horiz = b.y1 === b.y2 && b.x1 !== b.x2, vert = b.x1 === b.x2 && b.y1 !== b.y2;
        if (!horiz && !vert) continue;
        const C1 = [b.x1, b.y1], C2 = [b.x2, b.y2];
        if (degree(C1[0], C1[1]) !== 2 || degree(C2[0], C2[1]) !== 2) continue;
        const a = at(C1[0], C1[1], b)[0], c = at(C2[0], C2[1], b)[0];
        if (!a || !c || a === c) continue;
        const perp = (w) => (horiz ? w.x1 === w.x2 && w.y1 !== w.y2 : w.y1 === w.y2 && w.x1 !== w.x2);
        if (!perp(a) || !perp(c)) continue;
        const P = other(a, C1[0], C1[1]), Q = other(c, C2[0], C2[1]);
        // a Z: the two legs go the same way
        const s1 = horiz ? Math.sign(C1[1] - P[1]) : Math.sign(C1[0] - P[0]);
        const s2 = horiz ? Math.sign(Q[1] - C2[1]) : Math.sign(Q[0] - C2[0]);
        const step = horiz ? [C2[0] - C1[0], 0] : [0, C2[1] - C1[1]];
        for (const [end, d, keep] of [[P, step, Q], [Q, [-step[0], -step[1]], P]]) {
          if (!s1 || s1 !== s2) break;
          const id = [b.id, end.join(',')].join('|');
          if (rejected.has(id)) continue;
          const trial = slideEnd(W, terms, end, d, [a, b, c]);
          if (!trial) { rejected.add(id); continue; }
          const E2 = [end[0] + d[0], end[1] + d[1]];
          const leg = { id: a.id, x1: E2[0], y1: E2[1], x2: keep[0], y2: keep[1] };
          const wires = trial.filter(w => w !== b && w !== c && w !== a).concat([leg]);
          const cand = { comps: circuit.comps, wires, nodeNames: circuit.nodeNames };
          if (signature(cand) !== sig) { rejected.add(id); continue; }
          circuit.wires = wires;
          applied = true; done++;
          break;
        }
        if (applied) break;
      }
      if (!applied) break;
    }
    return done;
  }

  // copy of the wires with the point E slid by d along its rail, or null if that would change a connection
  function slideEnd(W, terms, E, d, chain) {
    const [x, y] = E, E2 = [x + d[0], y + d[1]], alongX = d[0] !== 0;
    if (terms.some(t => t[0] === x && t[1] === y)) return null;
    const out = [];
    for (const w of W) {
      if (chain.includes(w)) { out.push(w); continue; }
      const parallel = alongX ? w.y1 === w.y2 : w.x1 === w.x2;
      const e1 = w.x1 === x && w.y1 === y, e2 = w.x2 === x && w.y2 === y;
      if (e1 || e2) {
        if (!parallel) return null;
        const n = Object.assign({}, w);
        if (e1) { n.x1 = E2[0]; n.y1 = E2[1]; } else { n.x2 = E2[0]; n.y2 = E2[1]; }
        if (n.x1 === n.x2 && n.y1 === n.y2) continue;
        out.push(n);
        continue;
      }
      if (onInterior(x, y, w)) {
        if (!parallel) return null;
        const inside = (E2[0] - w.x1) * (E2[0] - w.x2) <= 0 && (E2[1] - w.y1) * (E2[1] - w.y2) <= 0;
        if (!inside) return null;
      }
      out.push(w);
    }
    return out;
  }

  // after a drag: merge, and trim only the dead ends left at the places the moved items came from
  function afterMove(app, oldPts) {
    const circuit = app.circuit;
    const before = signature(circuit);
    const terms = terminals(circuit);
    const ws = trimDead(mergeLines(circuit.wires, terms), terms, (x, y) => oldPts.has(x + ',' + y));
    return apply(app, ws, before);
  }

  DCS.tidy = { prettify, afterMove, signature };
})(window);
