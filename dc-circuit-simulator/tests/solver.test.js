// Numerical checks of the DC solver against hand calculations.  Run: node tests/solver.test.js
'use strict';
const S = require('../js/solver.js');

let fails = 0, count = 0;
function near(name, got, want, tol) {
  count++;
  tol = tol == null ? 1e-6 : tol;
  const ok = (got === want) || Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  if (!ok) { fails++; console.log('FAIL', name, 'got', got, 'want', want); }
}
function truthy(name, v) { count++; if (!v) { fails++; console.log('FAIL', name, v); } }
const R = (id, a, b, R) => ({ type: 'R', id, n: [a, b], R });
const V = (id, p, m, V) => ({ type: 'V', id, n: [p, m], V });
const I = (id, a, b, I) => ({ type: 'I', id, n: [a, b], I });
const D = (id, a, k, model, extra) => Object.assign({ type: 'D', id, n: [a, k], model, Vf: 0.7, rd: 0, Is: 1e-14, N: 1 }, extra || {});
const OA = (id, ip, im, o, sat) => ({ type: 'OA', id, n: [ip, im, o], sat: sat !== false, Vpos: 15, Vneg: -15 });
const Q = (id, b, c, e, pnp) => ({ type: 'Q', id, n: [b, c, e], pnp: !!pnp, beta: 100, Vbe: 0.7, Vcesat: 0.2 });

// 1. divider
{
  const r = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, 10), R('R1', 1, 2, 1000), R('R2', 2, 0, 1000)] });
  near('divider v2', r.v[2], 5);
  near('divider I(R1)', r.el.R1.i, 5e-3);
  near('divider P(V1)', r.el.V1.p, -50e-3);
  near('power balance', r.pSum, 0, 1e-9);
}
// 2. current source: 2 mA pushed into node 1 (flows from 0 to 1 inside the source)
{
  const r = S.solve({ nodeCount: 2, elements: [I('I1', 0, 1, 2e-3), R('R1', 1, 0, 1000)] });
  near('isource v1', r.v[1], 2);
  near('isource P', r.el.I1.p, -4e-3);
}
// 3. ideal diode forward / reverse
{
  let r = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, 5), D('D1', 1, 2, 'ideal'), R('R1', 2, 0, 1000)] });
  near('ideal diode fwd I', r.el.D1.i, 5e-3); truthy('ideal diode on', r.states.D1 === 'on');
  r = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, -5), D('D1', 1, 2, 'ideal'), R('R1', 2, 0, 1000)] });
  near('ideal diode rev I', r.el.D1.i, 0, 1e-9); near('ideal diode rev V', r.el.D1.v, -5, 1e-6);
  truthy('ideal diode off', r.states.D1 === 'off');
}
// 4. constant voltage drop, with and without rd
{
  let r = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, 5), D('D1', 1, 2, 'cvd'), R('R1', 2, 0, 1000)] });
  near('cvd I', r.el.D1.i, 4.3e-3);
  r = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, 5), D('D1', 1, 2, 'cvd', { rd: 100 }), R('R1', 2, 0, 1000)] });
  near('cvd+rd I', r.el.D1.i, 4.3 / 1100);
}
// 5. exact diode: KCL and Shockley equation must both hold
{
  const r = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, 5), D('D1', 1, 2, 'exact'), R('R1', 2, 0, 1000)] });
  const vd = r.el.D1.v, i = r.el.D1.i;
  near('exact KVL', vd + 1000 * i, 5, 1e-9);
  near('exact Shockley', i, 1e-14 * (Math.exp(vd / S.thermalVoltage(27)) - 1), 1e-6);
  truthy('exact vd plausible', vd > 0.6 && vd < 0.75);
  // reverse
  const r2 = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, -5), D('D1', 1, 2, 'exact'), R('R1', 2, 0, 1000)] });
  near('exact reverse I', r2.el.D1.i, -1e-14 - 5e-12, 1e-3);
  // large forward drive: Newton must still converge
  const r3 = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, 1000), D('D1', 1, 2, 'exact'), R('R1', 2, 0, 1)] });
  truthy('exact hard converge', r3.ok);
  near('exact hard KVL', r3.el.D1.v + r3.el.D1.i, 1000, 1e-9);
  // Schottky parameters
  const r4 = S.solve({ nodeCount: 3, elements: [V('V1', 1, 0, 5), D('D1', 1, 2, 'exact', { Is: 1e-8, N: 1.05 }), R('R1', 2, 0, 1000)] });
  truthy('schottky vd ~0.3', r4.el.D1.v > 0.2 && r4.el.D1.v < 0.4);
}
// 6. inverting amplifier
{
  const ckt = (vin) => ({ nodeCount: 4, elements: [V('V1', 1, 0, vin), R('R1', 1, 2, 1000), R('R2', 2, 3, 10000), OA('U1', 0, 2, 3)] });
  let r = S.solve(ckt(1));
  near('inverting vout', r.v[3], -10); truthy('inverting linear', r.states.U1 === 'lin');
  near('inverting virtual ground', r.v[2], 0, 1e-9);
  r = S.solve(ckt(2));
  near('inverting saturated', r.v[3], -15); truthy('state sn', r.states.U1 === 'sn');
  r = S.solve({ nodeCount: 4, elements: [V('V1', 1, 0, 2), R('R1', 1, 2, 1000), R('R2', 2, 3, 10000), OA('U1', 0, 2, 3, false)] });
  near('inverting no saturation', r.v[3], -20);
}
// 7. non-inverting amplifier with a load: output current
{
  const r = S.solve({ nodeCount: 4, elements: [V('V1', 1, 0, 1), OA('U1', 1, 2, 3), R('Rf', 3, 2, 1000), R('Rg', 2, 0, 1000), R('RL', 3, 0, 500)] });
  near('noninv vout', r.v[3], 2);
  near('noninv iout', r.el.U1.iout, 2 / 500 + 2 / 2000);
}
// 8. comparator without feedback
{
  let r = S.solve({ nodeCount: 4, elements: [V('V1', 1, 0, 2), V('V2', 2, 0, 1), OA('U1', 1, 2, 3), R('RL', 3, 0, 1000)] });
  near('comparator +', r.v[3], 15);
  r = S.solve({ nodeCount: 4, elements: [V('V1', 1, 0, 0.5), V('V2', 2, 0, 1), OA('U1', 1, 2, 3), R('RL', 3, 0, 1000)] });
  near('comparator -', r.v[3], -15);
}
// 9. Schmitt trigger (positive feedback): must end at a rail, with memory of the previous state
{
  const ckt = (vin) => ({ nodeCount: 4, elements: [V('V1', 1, 0, vin), OA('U1', 2, 1, 3), R('R1', 3, 2, 10000), R('R2', 2, 0, 10000)] });
  let r = S.solve(ckt(0));
  truthy('schmitt at a rail', Math.abs(Math.abs(r.v[3]) - 15) < 1e-6);
  r = S.solve(ckt(0), { prevStates: { U1: 'sn' } });
  near('schmitt keeps low', r.v[3], -15);
  r = S.solve(ckt(0), { prevStates: { U1: 'sp' } });
  near('schmitt keeps high', r.v[3], 15);
  r = S.solve(ckt(8), { prevStates: { U1: 'sp' } });
  near('schmitt switches low above threshold', r.v[3], -15);
  r = S.solve(ckt(-8), { prevStates: { U1: 'sn' } });
  near('schmitt switches high below threshold', r.v[3], 15);
}
// 10. BJT NPN: active and saturated
{
  const ckt = (rb) => ({ nodeCount: 5, elements: [V('VCC', 1, 0, 10), V('VBB', 2, 0, 5), R('RB', 2, 3, rb), R('RC', 1, 4, 1000), Q('Q1', 3, 4, 0)] });
  let r = S.solve(ckt(100000));
  truthy('npn active', r.states.Q1 === 'act');
  near('npn IB', r.el.Q1.ib, 43e-6); near('npn IC', r.el.Q1.ic, 4.3e-3); near('npn VCE', r.el.Q1.vce, 5.7);
  near('npn IE', r.el.Q1.ie, 4.343e-3);
  r = S.solve(ckt(10000));
  truthy('npn sat', r.states.Q1 === 'sat'); near('npn sat IC', r.el.Q1.ic, 9.8e-3); near('npn sat VCE', r.el.Q1.vce, 0.2);
  r = S.solve({ nodeCount: 5, elements: [V('VCC', 1, 0, 10), V('VBB', 2, 0, 0.3), R('RB', 2, 3, 10000), R('RC', 1, 4, 1000), Q('Q1', 3, 4, 0)] });
  truthy('npn cutoff', r.states.Q1 === 'off'); near('npn cutoff VCE', r.el.Q1.vce, 10, 1e-6);
  near('npn power balance', r.pSum, 0, 1e-9);
}
// 11. BJT PNP (emitter at +10 V, collector load to ground)
{
  const r = S.solve({ nodeCount: 5, elements: [V('VEE', 1, 0, 10), V('VB', 2, 0, 5), R('RB', 2, 3, 100000), Q('Q1', 3, 4, 1, true), R('RC', 4, 0, 1000)] });
  truthy('pnp active', r.states.Q1 === 'act');
  near('pnp IB', r.el.Q1.ib, (10 - 0.7 - 5) / 100000);
  near('pnp IC', r.el.Q1.ic, 100 * 4.3e-5);
  near('pnp VC', r.v[4], 4.3);
}
// 12. Thevenin of a divider loaded by RL (RL removed)
{
  const ckt = { nodeCount: 3, elements: [V('V1', 1, 0, 10), R('R1', 1, 2, 1000), R('R2', 2, 0, 1000), R('RL', 2, 0, 330)] };
  const t = S.thevenin(ckt, 2, 0, { exclude: ['RL'] });
  near('thevenin vth', t.vth, 5); near('thevenin rth', t.rth, 500); near('norton in', t.in, 0.01); near('isc', t.isc, 0.01);
}
// 13. Thevenin seen by a current source alone: Norton only
{
  const ckt = { nodeCount: 2, elements: [I('I1', 0, 1, 1e-3), R('RL', 1, 0, 1000)] };
  const t = S.thevenin(ckt, 1, 0, { exclude: ['RL'] });
  truthy('norton only rth inf', t.rth === Infinity); near('norton only in', t.in, 1e-3);
}
// 14. Thevenin across an ideal voltage source: Rth = 0
{
  const ckt = { nodeCount: 2, elements: [V('V1', 1, 0, 3), R('RL', 1, 0, 1000)] };
  const t = S.thevenin(ckt, 1, 0, { exclude: ['RL'] });
  near('rth zero vth', t.vth, 3); truthy('rth zero', t.rth === 0); truthy('in infinite', t.in === Infinity);
}
// 15. Thevenin with a dependent source: op-amp follower output resistance 0, input resistance infinite
{
  const ckt = { nodeCount: 3, elements: [V('V1', 1, 0, 2), OA('U1', 1, 2, 2, false)] };
  const t = S.thevenin(ckt, 2, 0, {});
  near('follower vth', t.vth, 2); truthy('follower rth 0', t.rth === 0);
}
// 16. negative resistance from an op-amp (negative impedance converter): Rin = -R
{
  // NIC: + input is the port node 1, R1 from out(3) to node 1, R2 = R3 divider from out to - input
  const ckt = { nodeCount: 4, elements: [OA('U1', 1, 2, 3, false), R('R1', 3, 1, 1000), R('R2', 3, 2, 1000), R('R3', 2, 0, 1000)] };
  const t = S.thevenin(ckt, 1, 0, {});
  near('NIC rth', t.rth, -1000);
}
// 17. errors
{
  let r = S.solve({ nodeCount: 2, elements: [V('V1', 1, 0, 5), V('V2', 1, 0, 3)] });
  truthy('vloop error', !r.ok && r.issues.some(i => i.code === 'vloop'));
  r = S.solve({ nodeCount: 3, elements: [I('I1', 0, 1, 1e-3), R('R1', 1, 2, 10)] });
  truthy('isource open error', !r.ok && r.issues.some(i => i.code === 'inopath'));
  r = S.solve({ nodeCount: 2, elements: [V('V1', 1, 1, 5), R('R1', 1, 0, 1)] });
  truthy('vshort error', !r.ok && r.issues.some(i => i.code === 'vshort'));
}
// 18. ammeter and voltmeter
{
  const r = S.solve({ nodeCount: 4, elements: [V('V1', 1, 0, 9), { type: 'AM', id: 'A1', n: [1, 2] }, R('R1', 2, 3, 1000), R('R2', 3, 0, 2000), { type: 'VM', id: 'VM1', n: [3, 0] }] });
  near('ammeter', r.el.A1.i, 3e-3); near('voltmeter', r.el.VM1.v, 6);
}
// 19. two ideal diodes in series and in anti-parallel; bridge of diodes
{
  let r = S.solve({ nodeCount: 4, elements: [V('V1', 1, 0, 5), D('D1', 1, 2, 'ideal'), D('D2', 3, 2, 'ideal'), R('R1', 2, 0, 1000), V('V2', 3, 0, 3)] });
  // diode OR: the higher source wins
  near('diode OR', r.v[2], 5); truthy('D2 off', r.states.D2 === 'off');
  // full bridge with a DC input of -10 V: output still +9.6 V with 0.7 V drops? (two drops)
  const br = { nodeCount: 5, elements: [V('V1', 1, 2, -10), D('D1', 1, 3, 'cvd'), D('D2', 2, 3, 'cvd'), D('D3', 4, 1, 'cvd'), D('D4', 4, 2, 'cvd'), R('RL', 3, 4, 1000), R('Rg', 4, 0, 1e6)] };
  r = S.solve(br);
  near('bridge vout', r.v[3] - r.v[4], 8.6, 1e-6);
}
// 20. many diodes: clipping ladder to exercise the state search
{
  const els = [V('V1', 1, 0, 12)];
  let node = 1, nodes = 2;
  for (let k = 0; k < 10; k++) {
    const nn = nodes++;
    els.push(R('R' + k, node, nn, 100));
    els.push(D('D' + k, nn, 0, 'cvd'));
    node = nn;
  }
  const r = S.solve({ nodeCount: nodes, elements: els });
  truthy('ladder ok', r.ok);
  near('ladder last node', r.v[nodes - 1], 0.7, 1e-3);
}

// 21. a separate island with a current source and a resistor is legal (floating, not an error)
{
  const r = S.solve({ nodeCount: 4, elements: [V('V1', 1, 0, 5), R('R0', 1, 0, 1000), I('I1', 2, 3, 1e-3), R('R1', 2, 3, 1000)] });
  truthy('floating I island ok', r.ok);
  near('floating I island v', r.el.R1.v, -1);
}
// 22. Thévenin with a very large but legal resistance
{
  const t = S.thevenin({ nodeCount: 3, elements: [V('V1', 1, 0, 10), R('R1', 1, 2, 1e10)] }, 2, 0, {});
  near('large R vth', t.vth, 10, 1e-6); near('large R rth', t.rth, 1e10, 1e-6);
}

console.log(`${count - fails}/${count} checks passed`);
process.exit(fails ? 1 : 0);
