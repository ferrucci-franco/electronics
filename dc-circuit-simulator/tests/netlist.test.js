// Schematic -> netlist checks.  Run: node tests/netlist.test.js
'use strict';
globalThis.DCS = {};
DCS.comp = require('../js/components.js');
const N = require('../js/netlist.js');
const S = require('../js/solver.js');
let fails = 0, count = 0;
const ok = (name, c) => { count++; if (!c) { fails++; console.log('FAIL', name); } };
const comp = (id, type, x, y, rot, props) => ({ id, type, x, y, rot: rot || 0, flip: false, name: id, props: Object.assign(DCS.comp.defaults(type), props || {}) });

// divider: V1 vertical at (0,0) (+ at top, (0,-2)), R1 horizontal from (2,-4) to (6,-4), R2 vertical (8,0)
const circuit = {
  comps: [
    comp('V1', 'vsource', 0, 0, 1, { V: 10 }),
    comp('R1', 'resistor', 4, -4, 0, { R: 1000 }),
    comp('R2', 'resistor', 8, 0, 1, { R: 1000 }),
    comp('G', 'ground', 0, 4, 0)
  ],
  wires: [
    { id: 'w1', x1: 0, y1: -2, x2: 0, y2: -4 }, { id: 'w2', x1: 0, y1: -4, x2: 2, y2: -4 },
    { id: 'w3', x1: 6, y1: -4, x2: 8, y2: -4 }, { id: 'w4', x1: 8, y1: -4, x2: 8, y2: -2 },
    { id: 'w5', x1: 8, y1: 2, x2: 8, y2: 4 }, { id: 'w6', x1: 0, y1: 4, x2: 8, y2: 4 },
    { id: 'w7', x1: 0, y1: 2, x2: 0, y2: 4 }
  ]
};
const net = N.build(circuit);
ok('node count', net.ckt.nodeCount === 3);
const r = S.solve(net.ckt);
ok('solve', r.ok);
ok('v R2', Math.abs(r.el.R2.v - 5) < 1e-9);
ok('ground node', net.compNodes.get('V1')[1] === 0);
const wc = N.wireCurrents(net, r, S);
const w6 = wc.get('w6');
ok('wire current w6', w6 && Math.abs(Math.abs(w6[0].i) - 5e-3) < 1e-9);
// T junction: a wire end lying in the middle of another wire connects; a crossing does not
const c2 = {
  comps: [comp('V1', 'vsource', 0, 0, 1, { V: 1 }), comp('G', 'ground', 0, 2, 0), comp('R1', 'resistor', 4, 4, 1, { R: 1 }), comp('G2', 'ground', 4, 6, 0)],
  wires: [{ id: 'a', x1: 0, y1: -2, x2: 8, y2: -2 }, { id: 'b', x1: 4, y1: -2, x2: 4, y2: 2 }, { id: 'c', x1: 2, y1: -4, x2: 2, y2: 0 }]
};
const n2 = N.build(c2);
const r2 = S.solve(n2.ckt);
ok('T junction current', r2.ok && Math.abs(r2.el.R1.i - 1) < 1e-9);
ok('crossing not connected', n2.wireNode.get('c') !== n2.wireNode.get('a'));
ok('junction dot', n2.junctions.some(([x, y]) => x === 4 && y === -2));
console.log(`${count - fails}/${count} checks passed`);
process.exit(fails ? 1 : 0);
