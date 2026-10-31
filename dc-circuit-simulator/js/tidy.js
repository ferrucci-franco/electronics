/* "Prettify": tidy the wires without changing any connection.
 * Diagonal wires become L shapes routed around the components, collinear pieces that touch or overlap
 * are merged, duplicates and dead-end stubs go away. The result is accepted only if every component
 * terminal still sits on the same node as before. */
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

  function prettify(app) {
    const circuit = app.circuit;
    const before = signature(circuit);
    let id = 0;
    const newId = () => 'w' + Date.now().toString(36) + '_' + (id++);
    const terms = [];
    for (const c of circuit.comps) for (const t of C.terminals(c)) terms.push(t);

    // 1. no zero-length wires, diagonals become routed L shapes
    let wires = [];
    for (const w of circuit.wires) {
      if (w.x1 === w.x2 && w.y1 === w.y2) continue;
      if (w.x1 !== w.x2 && w.y1 !== w.y2) {
        const path = app.editor.lPath([w.x1, w.y1], [w.x2, w.y2], Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1));
        for (let i = 0; i + 1 < path.length; i++) wires.push({ x1: path[i][0], y1: path[i][1], x2: path[i + 1][0], y2: path[i + 1][1] });
      } else wires.push({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
    }

    // 2. merge collinear pieces on each horizontal and vertical line
    const merged = [];
    for (const horiz of [true, false]) {
      const lines = new Map();
      for (const w of wires) {
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
          // keep an end point where another wire crosses: that crossing was a connection
          const cuts = [a];
          for (const e of Array.from(L.ends).sort((p, q) => p - q)) {
            if (e <= a || e >= b) continue;
            const [x, y] = horiz ? [e, k] : [k, e];
            if (others.some(o => onInterior(x, y, o))) cuts.push(e);
          }
          cuts.push(b);
          for (let i = 0; i + 1 < cuts.length; i++) merged.push(horiz ? { x1: cuts[i], y1: k, x2: cuts[i + 1], y2: k } : { x1: k, y1: cuts[i], x2: k, y2: cuts[i + 1] });
        }
      }
    }

    // 3. dead ends: a wire end that touches nothing is pulled back to the last point where something
    //    connects along the wire (a terminal or another wire end); a wire with nothing on it goes away
    let ws = merged.map(w => Object.assign({}, w));
    const isTerm = (x, y) => terms.some(t => t[0] === x && t[1] === y);
    for (let pass = 0; pass < 100; pass++) {
      let changed = false;
      const live = (w, x, y) => isTerm(x, y) || ws.some(o => o !== w && ((o.x1 === x && o.y1 === y) || (o.x2 === x && o.y2 === y) || onInterior(x, y, o)));
      for (const w of ws) {
        for (const end of [1, 2]) {
          const x = end === 1 ? w.x1 : w.x2, y = end === 1 ? w.y1 : w.y2;
          if (live(w, x, y)) continue;
          // connection points strictly inside this wire, nearest to the dead end first
          const pts = [];
          for (const t of terms) if (onInterior(t[0], t[1], w)) pts.push(t);
          for (const o of ws) if (o !== w) for (const q of [[o.x1, o.y1], [o.x2, o.y2]]) if (onInterior(q[0], q[1], w)) pts.push(q);
          if (!pts.length) { w.dead = true; changed = true; break; }
          pts.sort((p, q) => Math.hypot(p[0] - x, p[1] - y) - Math.hypot(q[0] - x, q[1] - y));
          if (end === 1) { w.x1 = pts[0][0]; w.y1 = pts[0][1]; } else { w.x2 = pts[0][0]; w.y2 = pts[0][1]; }
          changed = true;
        }
      }
      ws = ws.filter(w => !w.dead && (w.x1 !== w.x2 || w.y1 !== w.y2));
      if (!changed) break;
    }

    const candidate = { comps: circuit.comps, wires: ws.map(w => Object.assign({ id: newId() }, w)), nodeNames: circuit.nodeNames };
    if (signature(candidate) !== before) return { ok: false };
    // same set of segments, whatever the direction they were drawn in?
    const norm = (list) => JSON.stringify(list.map(w => { const a = w.x1 + ',' + w.y1, b = w.x2 + ',' + w.y2; return a < b ? a + ';' + b : b + ';' + a; }).sort());
    const changed = norm(circuit.wires) !== norm(candidate.wires);
    if (!changed) return { ok: true, changed: false };
    // node names stay with their node: move their anchor to a terminal or a wire end of that node
    const oldNet = app.net;
    const names = (circuit.nodeNames || []).map(nn => {
      const nd = oldNet.nodeOf(nn.x, nn.y);
      const p = nd != null && oldNet.nodes[nd] ? oldNet.nodes[nd].points.find(q => q.terms.length) || oldNet.nodes[nd].points[0] : null;
      return p ? { x: p.x, y: p.y, name: nn.name } : nn;
    });
    app.checkpoint();
    circuit.wires = candidate.wires;
    circuit.nodeNames = names;
    app.commit();
    return { ok: true, changed: true, before: oldNet.wires.length, after: candidate.wires.length };
  }

  DCS.tidy = { prettify, signature };
})(window);
