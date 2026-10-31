/* DC circuit solver: modified nodal analysis (MNA).
 *
 * Netlist format (independent of the schematic editor):
 *   ckt = { nodeCount: N, elements: [...] }   node 0 is the reference (ground)
 *   { type:'R',  id, n:[a,b], R }
 *   { type:'V',  id, n:[p,m], V }               ideal voltage source, v(p) - v(m) = V
 *   { type:'I',  id, n:[a,b], I }               ideal current source, I flows from a to b inside the source
 *   { type:'AM', id, n:[p,m] }                  ideal ammeter (0 V), reads the current entering p
 *   { type:'VM', id, n:[p,m] }                  ideal voltmeter (open), reads v(p) - v(m)
 *   { type:'D',  id, n:[a,k], model, Vf, rd, Is, N }   model: 'ideal' | 'cvd' | 'exact'
 *   { type:'OA', id, n:[inp,inn,out], sat, Vpos, Vneg } ideal op-amp, optional output saturation
 *   { type:'Q',  id, n:[b,c,e], pnp, beta, Vbe, Vcesat }  simple BJT (cutoff / active / saturation)
 *
 * Piecewise-linear devices (ideal and constant-drop diodes, op-amp, BJT) have discrete states.
 * The solver looks for a set of states whose linear solution is consistent with every state,
 * and Newton-Raphson handles the exponential (Shockley) diodes inside each set of states.
 */
(function (root) {
  'use strict';

  const GMIN = 1e-12;        // leakage across open junctions and on floating islands
  const ITOL = 1e-10;        // current tolerance for the state checks (A)
  const VTOL = 1e-7;         // voltage tolerance for the state checks (V)
  const HUGE = 1e7;          // a node voltage or branch current above this is unphysical
  const K_Q = 8.617333262e-5; // Boltzmann constant / electron charge (V/K)

  function thermalVoltage(tempC) { return K_Q * ((tempC == null ? 27 : tempC) + 273.15); }

  /* ---------- dense LU with partial pivoting ---------- */
  function luSolve(A, b) {
    const n = b.length;
    let scale = 0;
    for (let i = 0; i < n; i++) {
      const r = A[i];
      for (let j = 0; j < n; j++) { const a = Math.abs(r[j]); if (a > scale) scale = a; }
    }
    if (n === 0) return new Float64Array(0);
    if (scale === 0) return null;
    const tiny = scale * 1e-17;
    for (let k = 0; k < n; k++) {
      let p = k, best = Math.abs(A[k][k]);
      for (let i = k + 1; i < n; i++) { const a = Math.abs(A[i][k]); if (a > best) { best = a; p = i; } }
      if (best <= tiny) return null;
      if (p !== k) { const t = A[p]; A[p] = A[k]; A[k] = t; const tb = b[p]; b[p] = b[k]; b[k] = tb; }
      const rk = A[k], piv = rk[k];
      for (let i = k + 1; i < n; i++) {
        const ri = A[i];
        const f = ri[k] / piv;
        if (f === 0) continue;
        ri[k] = 0;
        for (let j = k + 1; j < n; j++) ri[j] -= f * rk[j];
        b[i] -= f * b[k];
      }
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      const ri = A[i];
      for (let j = i + 1; j < n; j++) s -= ri[j] * x[j];
      x[i] = s / ri[i];
    }
    for (let i = 0; i < n; i++) if (!isFinite(x[i])) return null;
    return x;
  }

  /* ---------- device definitions ---------- */
  // Each device: states (null = linear/no states), branches(el, state), stamp(S, el, state, br, ctx),
  // check(el, state, sol, br) -> null | {next, mag}, terminal currents tc(el, state, sol, br)

  function diodeParams(el, Vt) {
    const nVt = (el.N || 1) * Vt;
    const Is = el.Is > 0 ? el.Is : 1e-14;
    return { nVt, Is, vcrit: nVt * Math.log(nVt / (Math.SQRT2 * Is)) };
  }
  function diodeCurrent(v, p) {
    // Shockley equation, linearly extrapolated above a large argument to avoid overflow
    const xmax = 80;
    const x = v / p.nVt;
    if (x > xmax) {
      const e = Math.exp(xmax);
      const i = p.Is * (e * (1 + (x - xmax)) - 1);
      return { i, g: p.Is * e / p.nVt };
    }
    const e = Math.exp(x);
    return { i: p.Is * (e - 1), g: p.Is * e / p.nVt };
  }
  function pnjlim(vnew, vold, nVt, vcrit) {
    if (vnew > vcrit && Math.abs(vnew - vold) > 2 * nVt) {
      if (vold > 0) {
        const arg = 1 + (vnew - vold) / nVt;
        vnew = arg > 0 ? vold + nVt * Math.log(arg) : vcrit;
      } else {
        vnew = nVt * Math.log(vnew / nVt);
      }
    }
    return vnew;
  }

  const DEV = {
    R: {
      stamp(S, el) { S.g(el.n[0], el.n[1], 1 / el.R); },
      tc(el, st, sol) { const i = (sol.v[el.n[0]] - sol.v[el.n[1]]) / el.R; return [i, -i]; }
    },
    V: {
      branches: () => 1,
      stamp(S, el, st, br) { S.vbr(el.n[0], el.n[1], br[0], el.V * S.srcScale, 0); },
      tc(el, st, sol, br) { const i = sol.x[br[0]]; return [i, -i]; }
    },
    AM: {
      branches: () => 1,
      stamp(S, el, st, br) { S.vbr(el.n[0], el.n[1], br[0], 0, 0); },
      tc(el, st, sol, br) { const i = sol.x[br[0]]; return [i, -i]; }
    },
    I: {
      stamp(S, el) { S.i(el.n[0], el.n[1], el.I * S.srcScale); },
      tc(el) { return [el.I, -el.I]; }
    },
    VM: {
      stamp() {},
      tc() { return [0, 0]; }
    },
    // test source used by the Thevenin / Norton calculation: current source or voltage source
    IT: {
      stamp(S, el) { S.i(el.n[0], el.n[1], el.I); },
      tc(el) { return [el.I, -el.I]; }
    },
    VT: {
      branches: () => 1,
      stamp(S, el, st, br) { S.vbr(el.n[0], el.n[1], br[0], el.V, 0); },
      tc(el, st, sol, br) { const i = sol.x[br[0]]; return [i, -i]; }
    },
    D: {
      states(el) { return el.model === 'exact' ? null : ['off', 'on']; },
      branches(el, st) { return st === 'on' ? 1 : 0; },
      vf(el) { return el.model === 'ideal' ? 0 : (el.Vf || 0); },
      rd(el) { return el.model === 'cvd' ? Math.max(0, el.rd || 0) : 0; },
      stamp(S, el, st, br, k) {
        const a = el.n[0], c = el.n[1];
        if (el.model === 'exact') {
          const p = diodeParams(el, S.Vt);
          const vraw = S.vguess[a] - S.vguess[c];
          const vold = S.dv[k] == null ? 0 : S.dv[k];
          const v = pnjlim(vraw, vold, p.nVt, p.vcrit);
          if (Math.abs(v - vraw) > 1e-12) S.limited = true;
          S.dv[k] = v;
          const d = diodeCurrent(v, p);
          S.g(a, c, d.g + GMIN);
          S.i(a, c, d.i - d.g * v);
          return;
        }
        if (st === 'on') S.vbr(a, c, br[0], DEV.D.vf(el), DEV.D.rd(el));
        else S.g(a, c, GMIN);
      },
      check(el, st, sol, br) {
        if (el.model === 'exact') return null;
        if (st === 'on') {
          const i = sol.x[br[0]];
          return i < -ITOL ? { next: 'off', mag: -i * 1e3 } : null;
        }
        const v = sol.v[el.n[0]] - sol.v[el.n[1]];
        const vf = DEV.D.vf(el);
        return v > vf + VTOL ? { next: 'on', mag: v - vf } : null;
      },
      tc(el, st, sol, br, Vt) {
        const v = sol.v[el.n[0]] - sol.v[el.n[1]];
        let i;
        if (el.model === 'exact') i = diodeCurrent(v, diodeParams(el, Vt)).i + GMIN * v;
        else if (st === 'on') i = sol.x[br[0]];
        else i = GMIN * v;
        return [i, -i];
      }
    },
    OA: {
      states(el) { return el.sat ? ['lin', 'sp', 'sn'] : ['lin']; },
      branches: () => 1,
      stamp(S, el, st, br) {
        const [ip, im, o] = el.n, k = br[0];
        S.col(o, k, 1);                     // current k flows from the output node into the op-amp
        if (st === 'lin') { S.row(k, ip, 1); S.row(k, im, -1); }
        else if (st === 'fix') { S.row(k, o, 1); S.rhs(k, el._fix); }
        else { S.row(k, o, 1); S.rhs(k, st === 'sp' ? el.Vpos : el.Vneg); }
      },
      check(el, st, sol) {
        if (!el.sat) return null;
        const [ip, im, o] = el.n;
        const vd = sol.v[ip] - sol.v[im], vo = sol.v[o];
        if (st === 'lin') {
          if (vo > el.Vpos + VTOL) return { next: 'sp', mag: vo - el.Vpos };
          if (vo < el.Vneg - VTOL) return { next: 'sn', mag: el.Vneg - vo };
          return null;
        }
        if (st === 'sp' && vd < -VTOL) return { next: 'lin', alt: 'sn', mag: -vd };
        if (st === 'sn' && vd > VTOL) return { next: 'lin', alt: 'sp', mag: vd };
        return null;
      },
      tc(el, st, sol, br) { return [0, 0, sol.x[br[0]]]; }
    },
    Q: {
      states() { return ['off', 'act', 'sat']; },
      branches(el, st) { return st === 'off' ? 0 : st === 'act' ? 1 : 2; },
      stamp(S, el, st, br) {
        const [b, c, e] = el.n;
        if (st === 'off') { S.g(b, e, GMIN); S.g(b, c, GMIN); S.g(c, e, GMIN); return; }
        if (!el.pnp) {
          S.vbr(b, e, br[0], el.Vbe, 0);                       // i_br0: base current (into B)
          if (st === 'act') { S.col(c, br[0], el.beta); S.col(e, br[0], -el.beta); }
          else S.vbr(c, e, br[1], el.Vcesat, 0);              // i_br1: collector current (into C)
        } else {
          S.vbr(e, b, br[0], el.Vbe, 0);                       // i_br0: base current (out of B)
          if (st === 'act') { S.col(e, br[0], el.beta); S.col(c, br[0], -el.beta); }
          else S.vbr(e, c, br[1], el.Vcesat, 0);              // i_br1: collector current (out of C)
        }
      },
      // base / collector currents in the forward direction of the device (positive when normal)
      fwd(el, st, sol, br) {
        if (st === 'off') return { ib: 0, ic: 0 };
        const ib = sol.x[br[0]];
        const ic = st === 'act' ? el.beta * ib : sol.x[br[1]];
        return { ib, ic };
      },
      check(el, st, sol, br) {
        const [b, c, e] = el.n;
        const s = el.pnp ? -1 : 1;
        const vbe = s * (sol.v[b] - sol.v[e]), vce = s * (sol.v[c] - sol.v[e]);
        if (st === 'off') return vbe > el.Vbe + VTOL ? { next: 'act', mag: vbe - el.Vbe } : null;
        const f = DEV.Q.fwd(el, st, sol, br);
        if (f.ib < -ITOL) return { next: 'off', mag: -f.ib * 1e3 };
        if (st === 'act' && vce < el.Vcesat - VTOL) return { next: 'sat', mag: el.Vcesat - vce };
        if (st === 'sat' && f.ic > el.beta * f.ib + ITOL) return { next: 'act', mag: (f.ic - el.beta * f.ib) * 1e3 };
        return null;
      },
      tc(el, st, sol, br) {
        const f = DEV.Q.fwd(el, st, sol, br);
        let ib = f.ib, ic = f.ic;
        if (st === 'off') {
          const [b, c, e] = el.n, v = sol.v;
          ib = GMIN * (v[b] - v[e]) + GMIN * (v[b] - v[c]);
          ic = GMIN * (v[c] - v[e]) - GMIN * (v[b] - v[c]);
          return [ib, ic, -(ib + ic)];
        }
        const s = el.pnp ? -1 : 1;
        return [s * ib, s * ic, -s * (ib + ic)];
      }
    }
  };

  /* ---------- topology checks ---------- */
  function makeDSU(n) {
    const p = new Int32Array(n);
    for (let i = 0; i < n; i++) p[i] = i;
    const find = (a) => { while (p[a] !== a) { p[a] = p[p[a]]; a = p[a]; } return a; };
    return { find, union(a, b) { a = find(a); b = find(b); if (a === b) return false; p[a] = b; return true; } };
  }

  function analyseTopology(ckt) {
    const N = ckt.nodeCount;
    const issues = [];
    const skip = new Set();          // elements left out of the matrix (shorted ammeters, zero sources)
    // shorted voltage-type elements
    for (const el of ckt.elements) {
      if ((el.type === 'V' || el.type === 'AM' || el.type === 'VT') && el.n[0] === el.n[1]) {
        if (el.type === 'V' && el.V !== 0) issues.push({ level: 'error', code: 'vshort', ids: [el.id] });
        else if (el.type === 'AM') issues.push({ level: 'warn', code: 'amshort', ids: [el.id] });
        skip.add(el);
      }
    }
    // loops made only of voltage sources and ammeters
    const dsu = makeDSU(N);
    for (const el of ckt.elements) {
      if (skip.has(el)) continue;
      if (el.type === 'V' || el.type === 'AM' || el.type === 'VT') {
        if (!dsu.union(el.n[0], el.n[1])) {
          // find the loop through a path search for the message
          issues.push({ level: 'error', code: 'vloop', ids: voltageLoop(ckt, el, skip) });
        }
      }
    }
    // islands without a DC path to the reference node
    const con = makeDSU(N);
    for (const el of ckt.elements) {
      if (skip.has(el)) continue;
      const n = el.n;
      switch (el.type) {
        case 'R': case 'V': case 'AM': case 'D': case 'VT': con.union(n[0], n[1]); break;
        case 'Q': con.union(n[0], n[2]); con.union(n[1], n[2]); break;
        case 'OA': con.union(n[2], 0); break;
        default: break;
      }
    }
    const floating = [];
    const root0 = con.find(0);
    for (let i = 1; i < N; i++) if (con.find(i) !== root0) floating.push(i);
    if (floating.length) {
      const fl = new Set(floating);
      // a current source with no conducting path between its terminals forces a current into nothing
      const ids = ckt.elements.filter(el => el.type === 'I' && el.I !== 0 && (fl.has(el.n[0]) || fl.has(el.n[1])) && con.find(el.n[0]) !== con.find(el.n[1])).map(el => el.id);
      if (ids.length) issues.push({ level: 'error', code: 'inopath', ids });
    }
    return { issues, skip, floating };
  }

  function voltageLoop(ckt, closing, skip) {
    // BFS over voltage-type elements from closing.n[1] to closing.n[0], not using `closing`
    const adj = new Map();
    for (const el of ckt.elements) {
      if (el === closing || skip.has(el)) continue;
      if (el.type !== 'V' && el.type !== 'AM' && el.type !== 'VT') continue;
      for (const [a, b] of [[el.n[0], el.n[1]], [el.n[1], el.n[0]]]) {
        if (!adj.has(a)) adj.set(a, []);
        adj.get(a).push([b, el]);
      }
    }
    const start = closing.n[1], goal = closing.n[0];
    const prev = new Map([[start, null]]);
    const q = [start];
    while (q.length) {
      const a = q.shift();
      if (a === goal) break;
      for (const [b, el] of adj.get(a) || []) if (!prev.has(b)) { prev.set(b, [a, el]); q.push(b); }
    }
    const ids = [closing.id];
    let cur = goal;
    while (prev.get(cur)) { const [a, el] = prev.get(cur); ids.push(el.id); cur = a; }
    return ids;
  }

  /* ---------- assembly and solution for a fixed set of states ---------- */
  function makeSystem(ckt, ctx, states, vguess, dv, srcScale) {
    const nv = ckt.nodeCount - 1;
    const brIndex = [];
    let nb = 0;
    ckt.elements.forEach((el, k) => {
      if (ctx.skip.has(el)) { brIndex.push([]); return; }
      const d = DEV[el.type];
      const cnt = d.branches ? d.branches(el, states[k]) : 0;
      const br = [];
      for (let j = 0; j < cnt; j++) br.push(nv + nb++);
      brIndex.push(br);
    });
    const n = nv + nb;
    const A = new Array(n);
    for (let i = 0; i < n; i++) A[i] = new Float64Array(n);
    const b = new Float64Array(n);
    const ni = (node) => node - 1; // ground -> -1
    const S = {
      Vt: ctx.Vt, vguess, dv, srcScale, limited: false,
      g(a, c, g) {
        const i = ni(a), j = ni(c);
        if (i >= 0) A[i][i] += g;
        if (j >= 0) A[j][j] += g;
        if (i >= 0 && j >= 0) { A[i][j] -= g; A[j][i] -= g; }
      },
      i(a, c, I) { // current I leaves node a and enters node c
        const i = ni(a), j = ni(c);
        if (i >= 0) b[i] -= I;
        if (j >= 0) b[j] += I;
      },
      col(node, k, v) { const i = ni(node); if (i >= 0) A[i][k] += v; },
      row(k, node, v) { const j = ni(node); if (j >= 0) A[k][j] += v; },
      rhs(k, v) { b[k] += v; },
      vbr(p, m, k, V, r) {
        const i = ni(p), j = ni(m);
        if (i >= 0) { A[i][k] += 1; A[k][i] += 1; }
        if (j >= 0) { A[j][k] -= 1; A[k][j] -= 1; }
        A[k][k] -= r;
        b[k] += V;
      }
    };
    for (const node of ctx.floating) { const i = ni(node); A[i][i] += GMIN; }
    ckt.elements.forEach((el, k) => {
      if (ctx.skip.has(el)) return;
      DEV[el.type].stamp(S, el, states[k], brIndex[k], k);
    });
    return { A, b, brIndex, S };
  }

  function solveFixed(ckt, ctx, states, vinit) {
    // returns {ok, x, v, brIndex} or {ok:false, reason}
    const N = ckt.nodeCount;
    const tryNewton = (vstart, dv, scale, maxIter) => {
      let v = Float64Array.from(vstart);
      for (let it = 0; it < maxIter; it++) {
        const sys = makeSystem(ckt, ctx, states, v, dv, scale);
        const x = luSolve(sys.A, sys.b);
        if (!x) return { ok: false, reason: 'singular' };
        const vn = new Float64Array(N);
        for (let i = 1; i < N; i++) vn[i] = x[i - 1];
        if (!ctx.hasExact) return { ok: true, x, v: vn, brIndex: sys.brIndex, iters: it + 1 };
        let maxd = 0, vmax = 0;
        for (let i = 1; i < N; i++) { maxd = Math.max(maxd, Math.abs(vn[i] - v[i])); vmax = Math.max(vmax, Math.abs(vn[i])); }
        v = vn;
        if (it > 0 && !sys.S.limited && maxd < 1e-9 + 1e-9 * vmax) return { ok: true, x, v: vn, brIndex: sys.brIndex, iters: it + 1 };
      }
      return { ok: false, reason: 'newton' };
    };
    let r = tryNewton(vinit, [], 1, 200);
    if (!r.ok && r.reason === 'newton') {
      // source stepping: ramp the independent sources from 0 to their value
      let v = new Float64Array(N), dv = [], alpha = 0, step = 0.1, good = true;
      while (alpha < 1 && good) {
        const a2 = Math.min(1, alpha + step);
        const rr = tryNewton(v, dv.slice(), a2, 100);
        if (rr.ok) { v = rr.v; alpha = a2; step = Math.min(0.25, step * 1.5); r = rr; }
        else { step /= 4; if (step < 1e-4) good = false; }
      }
      if (!good || alpha < 1) r = { ok: false, reason: 'newton' };
    }
    if (!r.ok) return r;
    if (!ctx.noHuge) for (let i = 0; i < r.x.length; i++) if (Math.abs(r.x[i]) > HUGE) return { ok: false, reason: 'huge', x: r.x, v: r.v, brIndex: r.brIndex };
    return r;
  }

  function checkAll(ckt, ctx, states, sol) {
    const viol = [];
    ckt.elements.forEach((el, k) => {
      if (ctx.skip.has(el)) return;
      const d = DEV[el.type];
      if (!d.check) return;
      const c = d.check(el, states[k], sol, sol.brIndex[k]);
      if (c) viol.push({ k, next: c.next, alt: c.alt, mag: c.mag });
    });
    return viol;
  }

  /* ---------- search over the states of the piecewise-linear devices ---------- */
  function searchStates(ckt, ctx, init, allowed, vinit, budget) {
    const pwl = [];
    ckt.elements.forEach((el, k) => { if (allowed[k] && allowed[k].length > 1) pwl.push(k); });
    const fix = (k, s, alt) => {
      const al = allowed[k];
      if (!al) return s;
      if (al.includes(s)) return s;
      if (alt && al.includes(alt)) return alt;
      return al[0];
    };
    let evals = 0;
    const evaluate = (states, v0) => {
      evals++;
      const sol = solveFixed(ckt, ctx, states, v0);
      if (!sol.ok) return { sol, viol: null };
      return { sol, viol: checkAll(ckt, ctx, states, sol) };
    };
    const start = init.map((s, k) => (allowed[k] ? fix(k, s) : s));
    // phase 1: flip every inconsistent device at once
    {
      let states = start.slice(), v0 = vinit;
      const seen = new Set();
      for (let it = 0; it < 60; it++) {
        const key = states.join('|');
        if (seen.has(key)) break;
        seen.add(key);
        const r = evaluate(states, v0);
        if (!r.viol) break;
        if (!r.viol.length) return { ok: true, states, sol: r.sol, evals };
        v0 = r.sol.v;
        for (const vi of r.viol) states[vi.k] = fix(vi.k, vi.next, vi.alt);
      }
    }
    // phase 2: flip only the most inconsistent device
    {
      let states = start.slice(), v0 = vinit;
      const seen = new Set();
      for (let it = 0; it < 200; it++) {
        const key = states.join('|');
        if (seen.has(key)) break;
        seen.add(key);
        const r = evaluate(states, v0);
        if (!r.viol) break;
        if (!r.viol.length) return { ok: true, states, sol: r.sol, evals };
        v0 = r.sol.v;
        r.viol.sort((a, b) => b.mag - a.mag);
        let flipped = false;
        for (const vi of r.viol) {
          const s2 = states.slice();
          s2[vi.k] = fix(vi.k, vi.next, vi.alt);
          if (!seen.has(s2.join('|'))) { states = s2; flipped = true; break; }
        }
        if (!flipped) break;
      }
    }
    // phase 3: exhaustive search, closest combinations to the initial guess first
    let total = 1;
    for (const k of pwl) { total *= allowed[k].length; if (total > 6000) break; }
    if (total <= 6000) {
      const combos = [];
      const cur = start.slice();
      const rec = (j) => {
        if (j === pwl.length) { combos.push(cur.slice()); return; }
        for (const s of allowed[pwl[j]]) { cur[pwl[j]] = s; rec(j + 1); }
      };
      rec(0);
      const dist = (s) => pwl.reduce((d, k) => d + (s[k] !== start[k] ? 1 : 0), 0);
      combos.sort((a, b) => dist(a) - dist(b));
      const t0 = Date.now();
      for (const states of combos) {
        if (Date.now() - t0 > budget) break;
        const r = evaluate(states, vinit);
        if (r.viol && !r.viol.length) return { ok: true, states, sol: r.sol, evals };
      }
    }
    return { ok: false, evals };
  }

  // Positive feedback check for op-amps in the linear state: the linear solution of a comparator
  // with positive feedback (Schmitt trigger) is consistent but unstable, the output sits at a rail.
  function unstableOpamps(ckt, ctx, states, sol) {
    const out = [];
    ckt.elements.forEach((el, k) => {
      if (el.type !== 'OA' || !el.sat || states[k] !== 'lin' || ctx.skip.has(el)) return;
      const [ip, im, o] = el.n;
      const vd0 = sol.v[ip] - sol.v[im];
      const delta = 1e-3 * Math.max(1, Math.abs(el.Vpos - el.Vneg));
      const s2 = states.slice();
      s2[k] = 'fix';
      el._fix = sol.v[o] + delta;
      const r = solveFixed(ckt, ctx, s2, sol.v);
      delete el._fix;
      if (!r.ok) return;
      const g = ((r.v[ip] - r.v[im]) - vd0) / delta;
      if (g > 1e-6) out.push(k);
    });
    return out;
  }

  /* ---------- public entry point ---------- */
  function solve(ckt, opts) {
    opts = opts || {};
    const N = ckt.nodeCount;
    const Vt = thermalVoltage(opts.tempC);
    const topo = analyseTopology(ckt);
    const ctx = { noHuge: !!opts.noHuge, Vt, skip: topo.skip, floating: topo.floating, hasExact: ckt.elements.some(el => el.type === 'D' && el.model === 'exact') };
    const result = { ok: false, issues: topo.issues.slice(), Vt };
    if (topo.issues.some(i => i.level === 'error')) return result;

    const prev = opts.prevStates || {};
    const allowed = ckt.elements.map(el => (DEV[el.type].states ? DEV[el.type].states(el) : null));
    const init = ckt.elements.map((el, k) => {
      const al = allowed[k];
      if (!al) return null;
      const p = prev[el.id];
      if (p && al.includes(p)) return p;
      if (el.type === 'D') return 'off';
      if (el.type === 'Q') return 'act';
      return al[0];
    });
    let vinit = new Float64Array(N);
    if (opts.prevV && opts.prevV.length === N) vinit = Float64Array.from(opts.prevV);

    let found = searchStates(ckt, ctx, init, allowed, vinit, opts.budget || 1500);
    let evals = found.evals;
    if (found.ok) {
      // avoid the unstable linear solution of an op-amp with positive feedback
      const bad = unstableOpamps(ckt, ctx, found.states, found.sol);
      if (bad.length) {
        const al2 = allowed.map(a => a && a.slice());
        const init2 = found.states.slice();
        for (const k of bad) {
          al2[k] = ['sp', 'sn'];
          const p = prev[ckt.elements[k].id];
          init2[k] = (p === 'sp' || p === 'sn') ? p : 'sp';
        }
        const f2 = searchStates(ckt, ctx, init2, al2, found.sol.v, opts.budget || 1500);
        evals += f2.evals;
        if (f2.ok) found = f2;
        else result.issues.push({ level: 'warn', code: 'unstable', ids: bad.map(k => ckt.elements[k].id) });
      }
    }
    if (!found.ok) {
      result.issues.push({ level: 'error', code: 'noconv', ids: [] });
      // a direct solve tells apart a singular circuit from a non-convergent one
      const probe = solveFixed(ckt, ctx, init, vinit);
      if (!probe.ok && probe.reason === 'huge') result.issues.push({ level: 'error', code: 'huge', ids: [] });
      // junctions or op-amp outputs tied straight to a voltage source cannot satisfy their model
      const vs = makeDSU(N);
      for (const el of ckt.elements) if (!topo.skip.has(el) && (el.type === 'V' || el.type === 'AM' || el.type === 'VT')) vs.union(el.n[0], el.n[1]);
      const tied = [];
      for (const el of ckt.elements) {
        if (el.type === 'D' && vs.find(el.n[0]) === vs.find(el.n[1])) tied.push(el.id);
        if (el.type === 'Q' && vs.find(el.n[0]) === vs.find(el.n[2])) tied.push(el.id);
        if (el.type === 'OA' && vs.find(el.n[2]) === vs.find(0)) tied.push(el.id);
      }
      if (tied.length) result.issues.push({ level: 'error', code: 'tied', ids: tied });
      return result;
    }

    const sol = found.sol;
    result.ok = true;
    result.evals = evals;
    result.v = Array.from(sol.v);
    result.states = {};
    result.el = {};
    let pSum = 0, pAbs = 0;
    ckt.elements.forEach((el, k) => {
      const st = found.states[k];
      if (st != null) result.states[el.id] = st;
      let tc;
      if (topo.skip.has(el)) tc = el.n.map(() => 0);
      else tc = DEV[el.type].tc(el, st, sol, sol.brIndex[k], Vt);
      let p = 0;
      if (el.type === 'OA') p = sol.v[el.n[2]] * tc[2];                    // power drawn from the hidden supplies
      else el.n.forEach((node, j) => { p += sol.v[node] * tc[j]; });
      const r = { tc, p, state: st };
      if (el.n.length === 2) { r.v = sol.v[el.n[0]] - sol.v[el.n[1]]; r.i = tc[0]; }
      if (el.type === 'Q') {
        const [b, c, e] = el.n, s = el.pnp ? -1 : 1;
        r.vbe = s * (sol.v[b] - sol.v[e]); r.vce = s * (sol.v[c] - sol.v[e]);
        r.ib = s * tc[0]; r.ic = s * tc[1]; r.ie = -s * tc[2];
      }
      if (el.type === 'OA') { r.vout = sol.v[el.n[2]]; r.iout = -tc[2]; r.vd = sol.v[el.n[0]] - sol.v[el.n[1]]; }
      result.el[el.id] = r;
      pSum += p; pAbs += Math.abs(p);
    });
    result.pSum = pSum;
    result.pAbs = pAbs;
    if (topo.floating.length) result.floating = topo.floating.slice();
    return result;
  }

  /* ---------- Thevenin / Norton equivalent between two nodes ---------- */
  // The port is (a, b); `exclude` lists element ids removed from the circuit (the load).
  // V_ab = Vth + Rth * I when a current I is pushed into node a and taken out of node b.
  function thevenin(ckt, a, b, opts) {
    opts = opts || {};
    const exclude = new Set(opts.exclude || []);
    const base = ckt.elements.filter(el => !exclude.has(el.id));
    const out = { a, b };
    if (a === b) { out.error = 'samenode'; return out; }
    const nonlinear = base.some(el => el.type === 'D' || el.type === 'Q' || (el.type === 'OA' && el.sat));
    out.nonlinear = nonlinear;
    const prevStates = opts.prevStates;
    // test solves may legitimately reach large voltages (a test current into a large resistance)
    const sopts = { prevStates, tempC: opts.tempC, prevV: opts.prevV, noHuge: !nonlinear };
    const withI = (I) => solve({ nodeCount: ckt.nodeCount, elements: base.concat([{ type: 'IT', id: '__test', n: [b, a], I }]) }, sopts);
    const withV = (V) => solve({ nodeCount: ckt.nodeCount, elements: base.concat([{ type: 'VT', id: '__test', n: [a, b], V }]) }, sopts);
    const vab = (r) => r.v[a] - r.v[b];

    const r0 = withI(0);
    if (r0.ok) {
      out.voc = vab(r0);
      out.ocStates = r0.states;
      const d = nonlinear ? 1e-6 : 1e-3;
      const rp = withI(d), rm = withI(-d);
      if (rp.ok && rm.ok) {
        out.rth = (vab(rp) - vab(rm)) / (2 * d);
        if (Math.abs(out.rth) > 1e11) out.rth = Infinity;
        else if (Math.abs(out.rth) < 1e-9) out.rth = 0;
      }
    }
    // short-circuit current, flowing from a to b through the external short
    const rs = withV(0);
    if (rs.ok) out.isc = rs.el.__test.i;
    if (out.rth === undefined) {
      // no open-circuit solution (the port sees a current source): slope of the port current
      const dV = nonlinear ? 1e-6 : 1e-3;
      const rp = withV(dV), rm = withV(-dV);
      if (rp.ok && rm.ok) {
        const gn = -(rp.el.__test.i - rm.el.__test.i) / (2 * dV);
        if (Math.abs(gn) < 1e-11) out.rth = Infinity;
        else { out.rth = 1 / gn; if (out.isc !== undefined) out.voc = out.isc * out.rth; }
      }
    }
    if (out.rth === undefined && out.isc === undefined) { out.error = 'nosol'; return out; }
    if (out.rth === Infinity) { out.vth = undefined; out.in = out.isc; }
    else if (out.rth === 0) { out.vth = out.voc; out.in = Infinity; }
    else {
      out.vth = out.voc;
      out.in = out.voc / out.rth;
    }
    return out;
  }

  const api = { solve, thevenin, luSolve, thermalVoltage, GMIN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.DCS = root.DCS || {}).solver = api;
})(typeof window !== 'undefined' ? window : globalThis);
