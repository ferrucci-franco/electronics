'use strict';
/* État global — source de vérité unique (cahier §2).
   Tous les panneaux sont des fonctions de rendu de cet état. */
const Model = (() => {

  const N_MAX = 8;        // degré maximal (cahier §1) — modifiable ici
  const LOOP_N_MAX = 12;  // garde de performance sur l'ordre total de L
  const SNAP_PX = 8;      // ε de snap sur l'axe jω, en pixels écran (décision J1)
  const FUSE_PX = 10;     // ε de fusion par glisser, en pixels écran (décision J1)
  const CANCEL_TOL = 1e-6;
  const OWNERS = ['plant', 'controller', 'sensor'];
  const ACTIVE_BLOCKS = [...OWNERS, 'saturation'];
  const ownerOf = el => OWNERS.includes(el.owner) ? el.owner : 'plant';

  let nextId = 1;
  let locusCacheKey = '', locusCache = [];
  let transferCacheKey = '', transferCache = {};
  let cancellationCacheKey = '', cancellationCache = [];
  let marginCacheKey = '', marginCache = null;

  const state = {
    poles: [],            // {id, type:'real'|'pair', sigma, omega, mult} — omega absent si real
    zeros: [],
    K: 1,                 // gain de la plante (alias historique conservé)
    blockGains: { controller: 1, sensor: 1 },
    controller: {
      mode: 'pid',
      pid: { structure: 'P', Kp: 1, Ki: 0, Kd: 0, Ti: 1, Td: 0.1, N: 10 }
    },
    omegaRange: { min: -8, max: 8 },     // rang ω partagé plan s / 3D / Bode — seul le plan s l'utilise en J1
    omegaEval: 2,                        // point d'évaluation partagé — marqueur unique du Bode (§6 bis)
    delay: 0,                            // retard pur T, en secondes (cahier §1 bis, jalon J9)
    saturation: { enabled: false, min: -10, max: 10 },
    input: {
      type: 'step', omegaIn: 1, riseTime: 1, amplitude: 1,
      secondEnabled: false, secondTime: 5, secondValue: 0
    },
    exploration: { kappa: 1 },           // gain exploratoire du lieu, sans effet sur C(s)
    view: {
      show3d: false, showBode: false, showTime: true, surfMode: 'mag',
      logScale: false,
      aspectLock: true, showTransient: true, eqCollapsed: true, eqFit: true, eqFreq: false,
      sidebarHidden: false,
      bodeUnwrap: true, omegaLogDecades: 3, bodeShowPhase: true,
      bodeFunctions: ['L'],
      bodeMode: 'bode',                   // 'bode' | 'nyquist' | 'both' (§6 ter)
      showMargins: false,                 // marges de L(s), communes à Bode et Nyquist
      surfaceFunction: 'L', equationFunction: 'L',
      surfPalette: 'viridis',             // palette de la surface 3D (§7) : 'greys' | 'viridis' | 'hot'
      surfDetail: 'med',                  // niveau de détail : 'med' (normal) | 'high'
      clipFactor: 1,                      // écrêtage : facteur relatif au niveau auto (1 = auto)
      bodeMagZoom: 1, bodePhZoom: 1,     // échelles manuelles des axes Y du Bode (1 = auto)
      timeT: null,                        // durée de simulation manuelle (null = auto)
      timeXWin: null,                     // fenêtre X partagée des deux tracés temporels
      timeYOutputWin: null,               // échelle Y de r, y, ym et e (null = auto)
      timeYControlWin: null,              // échelle Y de u_cmd et u (null = auto)
      timeExperiment: 'closed',           // 'closed' | 'plant' : boucle fermée ou essai direct de P(s)
      timeSignals: ['r', 'y'],
      timePlantSignals: ['r', 'y'],       // clés internes : r représente u_P dans l'essai de plante
      splaneMode: 'overlay',              // 'components' | 'closed' | 'locus' | 'overlay'
      loopCollapsed: false, loopHeight: 196,
      theme: 'light', lang: 'fr',
      sigmaWindow: { min: -5, max: 1.5 }   // fenêtre σ du plan s (complément du rang ω)
    }
  };

  // État éphémère d'interface (hors état global du cahier)
  const ui = {
    selectedId: null,
    activeBlock: 'plant',
    kAuto: true,          // K auto-normalisé (H(0)=1) tant que le slider n'a pas été touché
    blockKAuto: { controller: false, sensor: true },
    dragId: null,
    snapped: false,       // σ aimanté sur l'axe jω pendant le drag (feedback visuel)
    fuse: null,           // {targetId, refused} — candidat de fusion pendant le drag
    pidBlocked: false
  };

  const listeners = [];
  function onChange(fn){ listeners.push(fn); }
  function notify(){ listeners.forEach(fn => fn()); }

  // ---------- polynômes (coefficients réels par construction, cahier §1) ----------
  function polyMul(a, b){
    const r = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
    return r;
  }
  function polyTrim(a){
    let i = 0;
    while (i < a.length - 1 && Math.abs(a[i]) < 1e-12) i++;
    return a.slice(i);
  }
  function polyAdd(a, b){
    const n = Math.max(a.length, b.length), r = new Array(n).fill(0);
    for (let i = 0; i < a.length; i++) r[n - a.length + i] += a[i];
    for (let i = 0; i < b.length; i++) r[n - b.length + i] += b[i];
    return polyTrim(r);
  }
  const polyScale = (a, k) => polyTrim(a.map(v => v * k));
  const polyDerivative = a => a.length <= 1 ? [0]
    : a.slice(0, -1).map((v, i) => v * (a.length - 1 - i));
  const polyEvalReal = (a, x) => a.reduce((v, c) => v * x + c, 0);
  function factorPoly(el){
    const base = el.type === 'pair'
      ? [1, -2 * el.sigma, el.sigma * el.sigma + el.omega * el.omega]
      : [1, -el.sigma];
    let p = [1];
    for (let k = 0; k < el.mult; k++) p = polyMul(p, base);
    return p;
  }
  function productPoly(list){
    let p = [1];
    for (const el of list) p = polyMul(p, factorPoly(el));
    return p;
  }
  function pidTransferPolys(pid = state.controller.pid){
    const { structure, Kp, Ki, Kd, N } = pid;
    if (structure === 'P') return { num: polyTrim([Kp]), den: [1] };
    if (structure === 'PI') return { num: polyTrim([Kp, Ki]), den: [1, 0] };
    if (structure === 'PD')
      return { num: polyTrim([Kp + Kd * N, Kp * N]), den: [1, N] };
    return {
      num: polyTrim([Kp + Kd * N, Kp * N + Ki, Ki * N]),
      den: [1, N, 0]
    };
  }
  function gainOf(owner){
    if (owner === 'plant') return state.K;
    if (owner === 'controller' && state.controller.mode === 'pid'){
      const tf = pidTransferPolys();
      return tf.num.length === 1 && Math.abs(tf.num[0]) < 1e-12 ? 0 : tf.num[0] / tf.den[0];
    }
    return state.blockGains[owner];
  }
  function setGainRaw(owner, value){
    if (owner === 'plant') state.K = value;
    else state.blockGains[owner] = value;
  }
  function kAutoOf(owner){
    if (owner === 'controller') return false;
    return owner === 'plant' ? ui.kAuto : ui.blockKAuto[owner];
  }
  function setKAutoRaw(owner, on){
    if (owner === 'plant') ui.kAuto = on;
    else ui.blockKAuto[owner] = owner === 'sensor' ? on : false;
  }
  function rootsOf(owner, kind){
    const list = kind === 'pole' ? state.poles : state.zeros;
    return list.filter(el => ownerOf(el) === owner);
  }
  function blockPolys(owner){
    return { num: productPoly(rootsOf(owner, 'zero')), den: productPoly(rootsOf(owner, 'pole')) };
  }
  function rawBlockTransfer(owner){
      const p = blockPolys(owner);
      return { num: polyScale(p.num, gainOf(owner)), den: p.den };
  }
  function rawComponentTransfer(which){
    if (which === 'P') return rawBlockTransfer('plant');
    if (which === 'C') return state.controller.mode === 'pid' ? pidTransferPolys() : rawBlockTransfer('controller');
    if (which === 'S') return rawBlockTransfer('sensor');
    throw new Error('Unknown component: ' + which);
  }
  function transferPolysRaw(which = 'L'){
    if (which === 'P' || which === 'C' || which === 'S') return rawComponentTransfer(which);
    const P = transferPolys('P'), C = transferPolys('C'), S = transferPolys('S');
    const CP = { num: polyMul(C.num, P.num), den: polyMul(C.den, P.den) };
    if (which === 'L') return { num: polyMul(CP.num, S.num), den: polyMul(CP.den, S.den) };
    if (which === 'T'){
      const loopNum = polyMul(CP.num, S.num), loopDen = polyMul(CP.den, S.den);
      return { num: polyMul(CP.num, S.den), den: polyAdd(loopDen, loopNum) };
    }
    throw new Error('Unknown transfer: ' + which);
  }
  function transferStateKey(){
    return JSON.stringify([state.poles, state.zeros, state.K, state.blockGains, state.controller]);
  }
  function transferPolys(which = 'L'){
    const key = transferStateKey();
    if (key !== transferCacheKey){ transferCacheKey = key; transferCache = {}; }
    if (!transferCache[which]) transferCache[which] = simplifyTransfer(transferPolysRaw(which)).tf;
    return transferCache[which];
  }
  // Fonctions de transfert entre la consigne R(s) et les signaux internes de
  // la boucle. Dans le modèle linéaire courant, u = u_cmd ; les deux restent
  // distincts pour que la saturation puisse être ajoutée sans changer l'UI.
  function signalTransferPolys(signal){
    if (signal === 'r') return { num: [1], den: [1] };
    const C = transferPolys('C'), P = transferPolys('P'), S = transferPolys('S');
    const loopNum = polyMul(polyMul(C.num, P.num), S.num);
    const loopDen = polyMul(polyMul(C.den, P.den), S.den);
    const common = polyAdd(loopDen, loopNum);
    if (signal === 'e') return simplifyTransfer({ num: loopDen, den: common }).tf;
    if (signal === 'ucmd' || signal === 'u')
      return simplifyTransfer({ num: polyMul(C.num, polyMul(P.den, S.den)), den: common }).tf;
    if (signal === 'y')
      return simplifyTransfer({ num: polyMul(polyMul(C.num, P.num), S.den), den: common }).tf;
    if (signal === 'ym') return simplifyTransfer({ num: loopNum, den: common }).tf;
    throw new Error('Unknown loop signal: ' + signal);
  }
  // Alias historique sans gain, conservé jusqu'à la migration des vues 3D et
  // des équations. Les nouvelles mathématiques utilisent transferPolys().
  function polys(){ return { num: productPoly(state.zeros), den: productPoly(state.poles) }; }

  // évaluation de H en s = jω (coefficients réels, Horner complexe)
  function hornerIm(c, w){
    let re = 0, im = 0;
    for (const a of c){
      const nre = -im * w + a;
      im = re * w;
      re = nre;
    }
    return [re, im];
  }
  function evalRationalHjw(tf, w){
    const { num, den } = tf;
    const [nr, ni] = hornerIm(num, w);
    const [dr, di] = hornerIm(den, w);
    const d2 = dr * dr + di * di;
    if (d2 === 0) return { re: Infinity, im: 0, mag: Infinity };
    const re = (nr * dr + ni * di) / d2;
    const im = (ni * dr - nr * di) / d2;
    return { re, im, mag: Math.hypot(re, im) };
  }
  const mulComplex = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
  const addComplex = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
  function evalPolyComplex(c, sigma, omega){
    let re = 0, im = 0;
    for (const a of c){
      const nextRe = re * sigma - im * omega + a;
      im = re * omega + im * sigma;
      re = nextRe;
    }
    return { re, im };
  }
  function evalRationalComplex(tf, sigma, omega){
    const n = evalPolyComplex(tf.num, sigma, omega), d = evalPolyComplex(tf.den, sigma, omega);
    const d2 = d.re * d.re + d.im * d.im;
    if (d2 === 0) return { re: Infinity, im: 0, mag: Infinity };
    const re = (n.re * d.re + n.im * d.im) / d2;
    const im = (n.im * d.re - n.re * d.im) / d2;
    return { re, im, mag: Math.hypot(re, im) };
  }
  function evalTransferComplex(which, sigma, omega){
    const C = transferPolys('C'), P = transferPolys('P'), S = transferPolys('S');
    const cn = evalPolyComplex(C.num, sigma, omega), cd = evalPolyComplex(C.den, sigma, omega);
    const pn = evalPolyComplex(P.num, sigma, omega), pd = evalPolyComplex(P.den, sigma, omega);
    const sn = evalPolyComplex(S.num, sigma, omega), sd = evalPolyComplex(S.den, sigma, omega);
    const amp = Math.exp(-sigma * state.delay);
    const delay = { re: amp * Math.cos(omega * state.delay),
                    im: -amp * Math.sin(omega * state.delay) };
    const respond = (num, den) => {
      const d2 = den.re * den.re + den.im * den.im;
      if (d2 === 0) return { re: Infinity, im: 0, mag: Infinity };
      const re = (num.re * den.re + num.im * den.im) / d2;
      const im = (num.im * den.re - num.re * den.im) / d2;
      return { re, im, mag: Math.hypot(re, im) };
    };
    if (which === 'P') return respond(mulComplex(pn, delay), pd);
    if (which === 'C') return respond(cn, cd);
    if (which === 'S') return respond(sn, sd);
    const cpNum = mulComplex(mulComplex(cn, pn), delay);
    const commonDen = mulComplex(mulComplex(cd, pd), sd);
    const loopNum = mulComplex(cpNum, sn);
    if (which === 'L') return respond(loopNum, commonDen);
    if (which === 'T') return respond(mulComplex(cpNum, sd), addComplex(commonDen, loopNum));
    throw new Error('Unknown transfer: ' + which);
  }
  function evalTransferHjw(which, w){ return evalTransferComplex(which, 0, w); }
  function evalHjw(w){ return evalTransferHjw('L', w); }

  // Marges de stabilité de la boucle ouverte L(s). Elles sont calculées sur
  // un balayage large, indépendant de la fenêtre Bode/Nyquist affichée : un
  // zoom ne doit jamais modifier une propriété du système.
  function stabilityMargins(){
    const cacheKey = transferStateKey() + ':' + state.delay;
    if (cacheKey === marginCacheKey && marginCache) return marginCache;
    let wRef = 1;
    for (const r of rootPoints()) wRef = Math.max(wRef, Math.hypot(r.sigma, r.omega));
    const N = 6000, dec = 9, wStart = wRef * 1e-3;
    let pm = null, gm = null, wc = null, w180 = null;
    let prevMag = null, prevPhase = null, prevW = null;
    for (let i = 0; i <= N; i++){
      const w = wStart * Math.pow(10, (i / N) * dec);
      const h = evalTransferHjw('L', w);
      if (!isFinite(h.re) || !isFinite(h.im) || !(h.mag > 0)){
        prevMag = prevPhase = prevW = null;
        continue;
      }
      const mag = h.mag;
      let phase = Math.atan2(h.im, h.re) * 180 / Math.PI;
      if (prevPhase !== null){
        while (phase - prevPhase > 180) phase -= 360;
        while (phase - prevPhase < -180) phase += 360;
      }
      if (prevMag !== null){
        if (wc === null && (prevMag - 1) * (mag - 1) <= 0 && prevMag !== mag){
          const f = (1 - prevMag) / (mag - prevMag);
          wc = prevW + f * (w - prevW);
          const hc = evalTransferHjw('L', wc);
          pm = 180 + Math.atan2(hc.im, hc.re) * 180 / Math.PI;
          while (pm > 180) pm -= 360;
          while (pm < -180) pm += 360;
        }
        if (w180 === null && (prevPhase + 180) * (phase + 180) <= 0 && prevPhase !== phase){
          const f = (-180 - prevPhase) / (phase - prevPhase);
          w180 = prevW + f * (w - prevW);
          const m180 = evalTransferHjw('L', w180).mag;
          gm = m180 > 0 ? -20 * Math.log10(m180) : null;
        }
      }
      prevMag = mag; prevPhase = phase; prevW = w;
    }
    marginCacheKey = cacheKey;
    marginCache = { pm, gm, wc, w180 };
    return marginCache;
  }

  // Racines d'un polynôme réel (Durand–Kerner). Elles sont dérivées à chaque
  // rendu : les pôles de T ne deviennent jamais des objets éditables.
  function polyEvalComplex(coeffs, z){
    let r = { re: 0, im: 0 };
    for (const a of coeffs) r = { re: r.re * z.re - r.im * z.im + a,
                                  im: r.re * z.im + r.im * z.re };
    return r;
  }
  function complexDiv(a, b){
    const d = b.re * b.re + b.im * b.im;
    return d < 1e-28 ? { re: 0, im: 0 }
      : { re: (a.re * b.re + a.im * b.im) / d,
          im: (a.im * b.re - a.re * b.im) / d };
  }
  function polynomialRoots(coeffs){
    const c0 = polyTrim(coeffs), n = c0.length - 1;
    if (n <= 0) return [];
    const lead = c0[0], c = c0.map(v => v / lead);
    if (n === 1) return [{ re: -c[1], im: 0 }];
    const radius = 1 + Math.max(...c.slice(1).map(Math.abs));
    const roots = Array.from({ length: n }, (_, i) => {
      const a = 2 * Math.PI * (i + 0.37) / n;
      return { re: radius * Math.cos(a), im: radius * Math.sin(a) };
    });
    for (let iter = 0; iter < 1200; iter++){
      let maxStep = 0;
      for (let i = 0; i < n; i++){
        let den = { re: 1, im: 0 };
        for (let j = 0; j < n; j++) if (j !== i)
          den = mulComplex(den, { re: roots[i].re - roots[j].re, im: roots[i].im - roots[j].im });
        const step = complexDiv(polyEvalComplex(c, roots[i]), den);
        roots[i] = { re: roots[i].re - step.re, im: roots[i].im - step.im };
        maxStep = Math.max(maxStep, Math.hypot(step.re, step.im));
      }
      if (maxStep < 1e-11) break;
    }
    for (const z of roots){
      if (Math.abs(z.re) < 1e-10) z.re = 0;
      if (Math.abs(z.im) < 1e-9) z.im = 0;
    }
    return roots.sort((a, b) => a.re - b.re || b.im - a.im);
  }

  function polyFromComplexRoots(roots, lead){
    let coeffs = [{ re: lead, im: 0 }];
    for (const root of roots){
      const next = Array.from({ length: coeffs.length + 1 }, () => ({ re: 0, im: 0 }));
      for (let i = 0; i < coeffs.length; i++){
        next[i].re += coeffs[i].re; next[i].im += coeffs[i].im;
        next[i + 1].re += -coeffs[i].re * root.re + coeffs[i].im * root.im;
        next[i + 1].im += -coeffs[i].re * root.im - coeffs[i].im * root.re;
      }
      coeffs = next;
    }
    return polyTrim(coeffs.map(z => Math.abs(z.re) < 1e-12 ? 0 : z.re));
  }

  // Simplification numérique des facteurs communs. On ne reconstruit les
  // polynômes que lorsqu'une paire a réellement été appariée : les coefficients
  // exacts des cas ordinaires restent ainsi inchangés pour les autres vues.
  function simplifyTransfer(tf, tolerance = CANCEL_TOL){
    const num = polyTrim(tf.num), den = polyTrim(tf.den);
    if (num.length <= 1 || den.length <= 1 || num.every(v => Math.abs(v) < 1e-14))
      return { tf: { num, den }, cancellations: [] };
    const nz = polynomialRoots(num), dp = polynomialRoots(den), used = new Set();
    const keepN = [], cancellations = [];
    for (const z of nz){
      let best = -1, bestRel = Infinity;
      for (let j = 0; j < dp.length; j++){
        if (used.has(j)) continue;
        const d = Math.hypot(z.re - dp[j].re, z.im - dp[j].im);
        const rel = d / Math.max(1, Math.hypot(z.re, z.im), Math.hypot(dp[j].re, dp[j].im));
        if (rel < bestRel){ bestRel = rel; best = j; }
      }
      if (best >= 0 && bestRel <= tolerance){
        used.add(best);
        const p = dp[best];
        cancellations.push({ sigma: (z.re + p.re) / 2, omega: (z.im + p.im) / 2,
          distance: bestRel, near: bestRel > 1e-9, unstable: (z.re + p.re) / 2 >= 0 });
      } else keepN.push(z);
    }
    if (!cancellations.length) return { tf: { num, den }, cancellations };
    const keepD = dp.filter((_, i) => !used.has(i));
    return { tf: {
      num: polyFromComplexRoots(keepN, num[0]),
      den: polyFromComplexRoots(keepD, den[0])
    }, cancellations };
  }
  function cancellationInfo(which){ return simplifyTransfer(transferPolysRaw(which)).cancellations; }
  function allCancellationInfo(){
    const key = transferStateKey();
    if (key === cancellationCacheKey) return cancellationCache;
    const out = [];
    for (const which of ['P', 'C', 'S', 'L', 'T'])
      for (const item of cancellationInfo(which)) out.push({ ...item, which });
    cancellationCacheKey = key; cancellationCache = out;
    return out;
  }

  // ---------- contrôleur PID lié (jalon J13) ----------
  const PID_EPS = 1e-9;
  function syncPidCanonical(pid, previous = state.controller.pid){
    const oldTi = previous && previous.Ti > 0 ? previous.Ti : 1;
    const oldTd = previous && previous.Td >= 0 ? previous.Td : 0.1;
    const hasI = pid.structure === 'PI' || pid.structure === 'PID';
    const hasD = pid.structure === 'PD' || pid.structure === 'PID';
    pid.Ti = hasI && pid.Kp > PID_EPS && pid.Ki > PID_EPS ? pid.Kp / pid.Ki : oldTi;
    pid.Td = hasD && pid.Kp > PID_EPS ? pid.Kd / pid.Kp : oldTd;
    return pid;
  }
  function pidCanonicalParams(pid = state.controller.pid){
    const normalized = syncPidCanonical({ ...pid }, pid);
    return { Kp: normalized.Kp, Ti: normalized.Ti, Td: normalized.Td, N: normalized.N };
  }
  const controllerRoots = kind => (kind === 'pole' ? state.poles : state.zeros)
    .filter(el => ownerOf(el) === 'controller');
  function addPidRoot(list, id, role, type, sigma, omega, mult = 1){
    const el = { id, owner: 'controller', type, sigma, mult, pidStructural: true, structuralRole: role };
    if (type === 'pair') el.omega = Math.max(0, omega || 0);
    list.push(el);
  }
  function syncPidRoots(){
    state.poles = state.poles.filter(el => ownerOf(el) !== 'controller');
    state.zeros = state.zeros.filter(el => ownerOf(el) !== 'controller');
    const pid = state.controller.pid;
    if (pid.structure === 'PI' || pid.structure === 'PID')
      addPidRoot(state.poles, 'pid-p-integrator', 'integrator', 'real', 0, 0);
    if (pid.structure === 'PD' || pid.structure === 'PID')
      addPidRoot(state.poles, 'pid-p-filter', 'filter', 'real', -pid.N, 0);

    const zr = polynomialRoots(pidTransferPolys(pid).num);
    const positive = zr.find(z => z.im > PID_EPS);
    if (positive){
      addPidRoot(state.zeros, 'pid-z-pair', 'zeroPair', 'pair', positive.re, positive.im);
    } else if (zr.length === 2 && Math.abs(zr[0].re - zr[1].re) < 1e-7){
      // Une paire qui arrive sur l'axe réel garde un seul objet draggable.
      addPidRoot(state.zeros, 'pid-z-pair', 'zeroPair', 'pair', (zr[0].re + zr[1].re) / 2, 0);
    } else {
      const real = zr.filter(z => Math.abs(z.im) <= PID_EPS).sort((a, b) => a.re - b.re);
      real.forEach((z, i) => addPidRoot(state.zeros, 'pid-z-' + (i + 1), 'zero' + (i + 1), 'real', z.re, 0));
    }
    if (ui.selectedId && String(ui.selectedId).startsWith('pid-') && !find(ui.selectedId)) ui.selectedId = null;
    locusCacheKey = '';
  }

  function coeffsClose(a, b){
    const aa = polyTrim(a), bb = polyTrim(b);
    if (aa.length !== bb.length) return false;
    const scale = Math.max(1, ...aa.map(Math.abs), ...bb.map(Math.abs));
    return aa.every((v, i) => Math.abs(v - bb[i]) <= 1e-8 * scale);
  }
  function fittedPid(structure, values, tf){
    const pid = { structure, Kp: values.Kp, Ki: values.Ki, Kd: values.Kd, N: values.N };
    if (![pid.Kp, pid.Ki, pid.Kd, pid.N].every(isFinite) || pid.N <= 0 ||
        pid.Kp < -PID_EPS || pid.Ki < -PID_EPS || pid.Kd < -PID_EPS) return null;
    pid.Kp = Math.max(0, pid.Kp); pid.Ki = Math.max(0, pid.Ki); pid.Kd = Math.max(0, pid.Kd);
    const rebuilt = pidTransferPolys(pid);
    return coeffsClose(rebuilt.num, tf.num) && coeffsClose(rebuilt.den, tf.den)
      ? syncPidCanonical(pid) : null;
  }
  function fitFreeControllerToPid(){
    const raw = transferPolys('C'), lead = raw.den[0];
    const tf = { num: raw.num.map(v => v / lead), den: raw.den.map(v => v / lead) };
    if (tf.den.length === 1 && tf.num.length === 1)
      return fittedPid('P', { Kp: tf.num[0], Ki: 0, Kd: 0, N: state.controller.pid.N || 10 }, tf);
    if (tf.den.length === 2 && Math.abs(tf.den[1]) <= PID_EPS){
      const num = new Array(2 - tf.num.length).fill(0).concat(tf.num);
      return fittedPid('PI', { Kp: num[0], Ki: num[1], Kd: 0, N: state.controller.pid.N || 10 }, tf);
    }
    if (tf.den.length === 2 && tf.den[1] > PID_EPS){
      const N = tf.den[1], num = new Array(2 - tf.num.length).fill(0).concat(tf.num);
      const Kp = num[1] / N, Kd = (num[0] - Kp) / N;
      return fittedPid('PD', { Kp, Ki: 0, Kd, N }, tf);
    }
    if (tf.den.length === 3 && tf.den[1] > PID_EPS && Math.abs(tf.den[2]) <= PID_EPS){
      const N = tf.den[1], num = new Array(3 - tf.num.length).fill(0).concat(tf.num);
      const Ki = num[2] / N, Kp = (num[1] - Ki) / N, Kd = (num[0] - Kp) / N;
      return fittedPid('PID', { Kp, Ki, Kd, N }, tf);
    }
    return null;
  }

  function setControllerMode(mode){
    if (mode !== 'free' && mode !== 'pid') return { ok: false, msg: 'msgBadValue' };
    if (mode === state.controller.mode) return { ok: true };
    if (mode === 'pid'){
      const fitted = fitFreeControllerToPid();
      if (!fitted) return { ok: false, msg: 'msgPidConvert' };
      const targetOrder = fitted.structure === 'P' ? 0 : fitted.structure === 'PID' ? 2 : 1;
      const otherOrder = counts().n - blockCounts('controller').n;
      if (otherOrder + targetOrder > LOOP_N_MAX) return { ok: false, msg: 'msgLoopNmax' };
      state.controller.pid = fitted;
      state.controller.mode = 'pid';
      ui.blockKAuto.controller = false;
      syncPidRoots(); notify();
      return { ok: true };
    }
    const tf = pidTransferPolys();
    syncPidRoots();
    for (const el of [...controllerRoots('pole'), ...controllerRoots('zero')]){
      delete el.pidStructural; delete el.structuralRole;
    }
    state.blockGains.controller = Math.abs(tf.num[0]) < PID_EPS ? 0 : tf.num[0] / tf.den[0];
    state.controller.mode = 'free';
    ui.blockKAuto.controller = false;
    notify();
    return { ok: true };
  }

  function setPidParams(patch){
    const next = { ...state.controller.pid, ...patch };
    for (const key of ['Kp', 'Ki', 'Kd', 'N']) next[key] = Number(next[key]);
    if (![next.Kp, next.Ki, next.Kd, next.N].every(isFinite) ||
        next.Kp < 0 || next.Ki < 0 || next.Kd < 0 || !(next.N > 0))
      return { ok: false, msg: 'msgPidValue' };
    state.controller.pid = syncPidCanonical(next, state.controller.pid);
    if (state.controller.mode === 'pid') syncPidRoots();
    notify();
    return { ok: true };
  }
  // Paramétrage canonique : Kp multiplie le contrôleur entier, tandis que
  // Ti et Td en fixent la forme (Ki = Kp/Ti et Kd = Kp·Td).
  function setPidCanonicalParams(patch){
    const current = pidCanonicalParams();
    const next = { ...current, ...patch };
    for (const key of ['Kp', 'Ti', 'Td']) next[key] = Number(next[key]);
    if (![next.Kp, next.Ti, next.Td].every(isFinite) || next.Kp < 0 ||
        !(next.Ti > 0) || next.Td < 0)
      return { ok: false, msg: 'msgPidValue' };
    const structure = state.controller.pid.structure;
    const hasI = structure === 'PI' || structure === 'PID';
    const hasD = structure === 'PD' || structure === 'PID';
    const parallel = {
      ...state.controller.pid,
      Kp: next.Kp,
      Ki: hasI ? next.Kp / next.Ti : 0,
      Kd: hasD ? next.Kp * next.Td : 0,
      Ti: next.Ti,
      Td: next.Td
    };
    state.controller.pid = parallel;
    if (state.controller.mode === 'pid') syncPidRoots();
    notify();
    return { ok: true };
  }
  function setPidStructure(structure){
    if (!['P', 'PI', 'PD', 'PID'].includes(structure)) return { ok: false, msg: 'msgBadValue' };
    const targetOrder = structure === 'P' ? 0 : structure === 'PID' ? 2 : 1;
    const otherOrder = counts().n - blockCounts('controller').n;
    if (otherOrder + targetOrder > LOOP_N_MAX) return { ok: false, msg: 'msgLoopNmax' };
    const canonical = pidCanonicalParams();
    const p = { ...state.controller.pid, structure, Ti: canonical.Ti, Td: canonical.Td };
    const hasI = structure === 'PI' || structure === 'PID';
    const hasD = structure === 'PD' || structure === 'PID';
    p.Ki = hasI ? p.Kp / p.Ti : 0;
    p.Kd = hasD ? p.Kp * p.Td : 0;
    state.controller.pid = p;
    if (state.controller.mode === 'pid') syncPidRoots();
    notify();
    return { ok: true };
  }
  function resetPid(structure = state.controller.pid.structure){
    const targetOrder = structure === 'P' ? 0 : structure === 'PID' ? 2 : 1;
    const otherOrder = counts().n - blockCounts('controller').n;
    if (otherOrder + targetOrder > LOOP_N_MAX) return { ok: false, msg: 'msgLoopNmax' };
    state.controller.mode = 'pid';
    state.controller.pid = { structure, Kp: 1,
      Ki: structure === 'PI' || structure === 'PID' ? 1 : 0,
      Kd: structure === 'PD' || structure === 'PID' ? 0.1 : 0,
      Ti: 1, Td: 0.1, N: 10 };
    ui.blockKAuto.controller = false;
    syncPidRoots(); notify();
    return { ok: true };
  }

  function updatePidRoot(id, sigma, omega){
    const f = find(id), p = state.controller.pid;
    if (!f || !f.el.pidStructural) return { ok: false, msg: 'msgPidLinked' };
    const el = f.el;
    if (el.structuralRole === 'integrator') return { ok: false, msg: 'msgPidIntegrator' };
    if (el.structuralRole === 'filter'){
      if (!(sigma < -PID_EPS)) return { ok: false, msg: 'msgPidFilter' };
      p.N = -sigma;
      syncPidRoots();
      return { ok: true };
    }
    const N = p.N;
    let Kp, Ki, Kd;
    if (p.structure === 'PI'){
      if (!(p.Kp > PID_EPS) || omega > PID_EPS){ return { ok: false, msg: 'msgPidDomain' }; }
      Kp = p.Kp; Ki = -Kp * sigma; Kd = 0;
    } else if (p.structure === 'PD'){
      const A = p.Kp + p.Kd * N;
      if (!(A > PID_EPS) || omega > PID_EPS){ return { ok: false, msg: 'msgPidDomain' }; }
      Kp = -A * sigma / N; Ki = 0; Kd = (A - Kp) / N;
    } else if (p.structure === 'PID'){
      const A = p.Kp + p.Kd * N;
      if (!(A > PID_EPS)){ return { ok: false, msg: 'msgPidDomain' }; }
      let sum, product;
      if (el.type === 'pair'){
        const w = Math.abs(omega);
        sum = 2 * sigma; product = sigma * sigma + w * w;
      } else {
        const other = controllerRoots('zero').find(z => z.id !== id && z.type === 'real');
        if (!other) return { ok: false, msg: 'msgPidDomain' };
        sum = sigma + other.sigma; product = sigma * other.sigma;
      }
      Ki = A * product / N;
      Kp = (-A * sum - Ki) / N;
      Kd = (A - Kp) / N;
    } else return { ok: false, msg: 'msgPidLinked' };
    if (![Kp, Ki, Kd].every(isFinite) || Kp < -PID_EPS || Ki < -PID_EPS || Kd < -PID_EPS)
      return { ok: false, msg: 'msgPidDomain' };
    p.Kp = Math.max(0, Kp); p.Ki = Math.max(0, Ki); p.Kd = Math.max(0, Kd);
    syncPidCanonical(p, p);
    syncPidRoots();
    return { ok: true };
  }
  function isRootLocked(id){
    const f = find(id);
    return !!(f && f.el.pidStructural && f.el.structuralRole === 'integrator');
  }
  function closedLoopPoles(){
    if (state.delay > 0) return [];
    return polynomialRoots(transferPolys('T').den).map((z, i) => ({
      id: 'cl' + i, sigma: z.re, omega: z.im, stable: z.re < -1e-9
    }));
  }
  function closedLoopZeros(){
    if (state.delay > 0) return [];
    return polynomialRoots(transferPolys('T').num).map((z, i) => ({
      id: 'clz' + i, sigma: z.re, omega: z.im
    }));
  }
  function rootLocusPoles(kappa = state.exploration.kappa){
    if (state.delay > 0) return [];
    const k = Number(kappa);
    if (!(k >= 0) || !isFinite(k)) return [];
    const loop = transferPolys('L');
    const characteristic = polyAdd(loop.den, polyScale(loop.num, k));
    if (!characteristic.every(isFinite)) return [];
    return polynomialRoots(characteristic).map((z, i) => ({
      id: 'rl' + i, sigma: z.re, omega: z.im, stable: z.re < -1e-9, kappa: k
    }));
  }
  function setRootLocusKappa(value, notifyChange = true){
    const kappa = Number(value);
    if (!(kappa >= 0) || !isFinite(kappa)) return { ok: false, msg: 'msgBadValue' };
    state.exploration.kappa = kappa;
    if (notifyChange) notify();
    return { ok: true };
  }
  // Rend le gain exploré permanent en multipliant le contrôleur entier.
  // En PID, les trois coefficients sont donc multipliés ensemble et la
  // pulsation du filtre reste inchangée ; en rationnel libre, seul K_C change.
  function applyRootLocusKappa(){
    const kappa = Number(state.exploration.kappa);
    if (!(kappa >= 0) || !isFinite(kappa)) return { ok: false, msg: 'msgBadValue' };
    if (state.controller.mode === 'pid'){
      const p = state.controller.pid;
      const scaled = [p.Kp * kappa, p.Ki * kappa, p.Kd * kappa];
      if (!scaled.every(isFinite)) return { ok: false, msg: 'msgBadValue' };
      [p.Kp, p.Ki, p.Kd] = scaled;
      syncPidRoots();
    } else {
      const scaled = state.blockGains.controller * kappa;
      if (!isFinite(scaled)) return { ok: false, msg: 'msgBadValue' };
      state.blockGains.controller = scaled;
    }
    ui.blockKAuto.controller = false;
    state.exploration.kappa = 1;
    locusCacheKey = '';
    notify();
    return { ok: true };
  }
  // Lieu des racines pour une gain supplémentaire κ ≥ 0 appliqué à L(s).
  // Les gains propres de C/P/S restent donc ceux choisis par l'utilisateur ;
  // le losange κ=1 coïncide exactement avec les pôles actuels de T(s).
  function rootLocus(sampleCount = 321){
    if (state.delay > 0) return [];
    const loop = transferPolys('L'), degree = polyTrim(loop.den).length - 1;
    if (degree <= 0) return [];
    const cacheKey = sampleCount + ':' + JSON.stringify(loop);
    if (cacheKey === locusCacheKey) return locusCache;
    const ks = [0];
    for (let i = 0; i < sampleCount; i++) ks.push(Math.pow(10, -5 + 10 * i / (sampleCount - 1)));
    // Les points de rupture satisfont dκ/ds = 0 pour κ(s) = −D(s)/N(s), soit
    // D'(s)N(s) − D(s)N'(s) = 0. On densifie explicitement autour de chaque
    // rupture réelle à gain positif : une grille seulement logarithmique saute
    // précisément cette zone, où les branches ont une tangente verticale.
    const breakPoly = polyAdd(polyMul(polyDerivative(loop.den), loop.num),
                              polyScale(polyMul(loop.den, polyDerivative(loop.num)), -1));
    const offsets = [-.2, -.1, -.05, -.02, -.01, -.005, -.002, -.001, -.0002, 0,
                      .0002, .001, .002, .005, .01, .02, .05, .1, .2];
    for (const z of polynomialRoots(breakPoly)){
      if (Math.abs(z.im) > 1e-6 * Math.max(1, Math.abs(z.re))) continue;
      const nv = polyEvalReal(loop.num, z.re);
      if (Math.abs(nv) < 1e-12) continue;
      const kBreak = -polyEvalReal(loop.den, z.re) / nv;
      if (!(kBreak > 0) || !isFinite(kBreak)) continue;
      for (const off of offsets) if (kBreak * (1 + off) > 0) ks.push(kBreak * (1 + off));
    }
    if (!ks.some(k => Math.abs(k - 1) < 1e-12)) ks.push(1);
    ks.sort((a, b) => a - b);
    for (let i = ks.length - 1; i > 0; i--)
      if (Math.abs(ks[i] - ks[i - 1]) <= 1e-12 * Math.max(1, ks[i])) ks.splice(i, 1);
    const branches = [];
    let previous = null, beforePrevious = null;
    for (const kappa of ks){
      const roots = polynomialRoots(polyAdd(loop.den, polyScale(loop.num, kappa)));
      if (roots.length !== degree) continue;
      if (!previous){
        previous = roots;
        roots.forEach((z, i) => { branches[i] = [{ sigma: z.re, omega: z.im, kappa }]; });
        continue;
      }
      // Affectation globale minimale (n ≤ 8), avec une légère prédiction par
      // la tangente précédente. L'ancien choix glouton pouvait réserver trop
      // tôt une racine à la mauvaise branche et créer les diagonales visibles
      // près d'un point de rupture.
      const targets = previous.map((z, i) => beforePrevious
        ? { re: z.re + .55 * (z.re - beforePrevious[i].re),
            im: z.im + .55 * (z.im - beforePrevious[i].im) }
        : z);
      let bestCost = Infinity, best = null;
      const chosen = new Array(degree);
      function assign(i, used, cost){
        if (cost >= bestCost) return;
        if (i === degree){ bestCost = cost; best = chosen.slice(); return; }
        for (let j = 0; j < degree; j++){
          if (used & (1 << j)) continue;
          const dr = targets[i].re - roots[j].re, di = targets[i].im - roots[j].im;
          chosen[i] = j;
          assign(i + 1, used | (1 << j), cost + dr * dr + di * di);
        }
      }
      assign(0, 0, 0);
      const ordered = best.map(j => roots[j]);
      for (let i = 0; i < degree; i++)
        branches[i].push({ sigma: ordered[i].re, omega: ordered[i].im, kappa });
      beforePrevious = previous; previous = ordered;
    }
    locusCacheKey = cacheKey; locusCache = branches;
    return branches;
  }

  function order(list){ return list.reduce((s, el) => s + el.mult * (el.type === 'pair' ? 2 : 1), 0); }
  function counts(){ return { n: order(state.poles), m: order(state.zeros) }; }
  function blockCounts(owner){ return { n: order(rootsOf(owner, 'pole')), m: order(rootsOf(owner, 'zero')) }; }

  function find(id){
    let el = state.poles.find(e => e.id === id);
    if (el) return { el, list: state.poles, kind: 'pole' };
    el = state.zeros.find(e => e.id === id);
    if (el) return { el, list: state.zeros, kind: 'zero' };
    return null;
  }

  // ---------- gain K ----------
  function refreshAutoK(owner = ui.activeBlock){
    if (!kAutoOf(owner)) return;
    const { num, den } = blockPolys(owner);
    const n0 = num[num.length - 1], d0 = den[den.length - 1];
    if (Math.abs(n0) <= 1e-12 || Math.abs(d0) <= 1e-12){
      setKAutoRaw(owner, false);          // conserver le gain courant : H(0)=1 est impossible
      return;
    }
    setGainRaw(owner, d0 / n0);
  }
  function canNormalizeDc(owner = ui.activeBlock){
    if (owner !== 'plant' && owner !== 'sensor') return false;
    const { num, den } = blockPolys(owner);
    return Math.abs(num[num.length - 1]) > 1e-12 && Math.abs(den[den.length - 1]) > 1e-12;
  }
  function setK(v){ setGainRaw(ui.activeBlock, v); setKAutoRaw(ui.activeBlock, false); notify(); }
  // Retard : à la première valeur non nulle on décoche le déroulement de la
  // phase (cahier §1 bis). Déroulée, la rampe −ωT tombe sans fond — −2865° à
  // ω = 100 pour T = 0,5 s — et écrase tout le relief. L'utilisateur reste
  // libre de la recocher ensuite, on ne force qu'une fois.
  function setDelay(v){
    const T = Math.max(0, isFinite(v) ? v : 0);
    if (T > 0 && !(state.delay > 0)) state.view.bodeUnwrap = false;
    state.delay = T;
    notify();
  }
  function setKAuto(on){
    const owner = ui.activeBlock;
    if (on && !canNormalizeDc(owner)){
      setKAutoRaw(owner, false); notify();
      return { ok: false, msg: 'msgDcNormalize' };
    }
    setKAutoRaw(owner, !!on);
    if (on) refreshAutoK(owner);
    notify();
    return { ok: true };
  }

  // ---------- ajout ----------
  const DEFAULT_POS = {
    'pole:real': { sigma: -1,   omega: 0 },
    'pole:pair': { sigma: -1,   omega: 2 },
    'zero:real': { sigma: -0.5, omega: 0 },
    'zero:pair': { sigma: -0.5, omega: 1 }
  };
  function freePosition(kind, shape){
    const list = (kind === 'pole' ? state.poles : state.zeros)
      .filter(el => ownerOf(el) === ui.activeBlock);
    const p = { ...DEFAULT_POS[kind + ':' + shape] };
    while (list.some(e => e.type === shape &&
                          Math.abs(e.sigma - p.sigma) < 0.25 &&
                          Math.abs((e.omega || 0) - p.omega) < 0.25))
      p.sigma -= 0.5;
    return p;
  }
  function canAdd(kind, shape){
    if (ui.activeBlock === 'controller' && state.controller.mode === 'pid') return false;
    const d = shape === 'pair' ? 2 : 1;
    const { n, m } = blockCounts(ui.activeBlock);
    return kind === 'pole' ? n + d <= N_MAX && counts().n + d <= LOOP_N_MAX : m + d <= n;
  }
  function addElement(kind, shape){
    const d = shape === 'pair' ? 2 : 1;
    const owner = ui.activeBlock;
    if (owner === 'controller' && state.controller.mode === 'pid')
      return { ok: false, msg: 'msgPidLinked' };
    const { n, m } = blockCounts(owner);
    if (kind === 'pole' && n + d > N_MAX) return { ok: false, msg: 'msgNmax' };
    if (kind === 'pole' && counts().n + d > LOOP_N_MAX) return { ok: false, msg: 'msgLoopNmax' };
    if (kind === 'zero' && m + d > n) return { ok: false, msg: 'msgCausality' };
    const pos = freePosition(kind, shape);
    const el = { id: 'e' + (nextId++), owner,
                 type: shape, sigma: pos.sigma, mult: 1 };
    if (shape === 'pair') el.omega = pos.omega;
    (kind === 'pole' ? state.poles : state.zeros).push(el);
    refreshAutoK(owner); notify();
    return { ok: true, id: el.id };
  }

  // ---------- suppression / décrément ----------
  function removeElement(id){
    const f = find(id); if (!f) return { ok: false };
    if (f.el.pidStructural) return { ok: false, msg: 'msgPidLinked' };
    const d = f.el.mult * (f.el.type === 'pair' ? 2 : 1);
    const owner = ownerOf(f.el), { n, m } = blockCounts(owner);
    if (f.kind === 'pole' && n - d < m) return { ok: false, msg: 'msgOrderPole' };
    f.list.splice(f.list.indexOf(f.el), 1);
    if (ui.selectedId === id) ui.selectedId = null;
    refreshAutoK(owner); notify();
    return { ok: true };
  }
  function decrementElement(id){
    const f = find(id); if (!f) return { ok: false };
    if (f.el.pidStructural) return { ok: false, msg: 'msgPidLinked' };
    if (f.el.mult === 1) return removeElement(id);
    const d = f.el.type === 'pair' ? 2 : 1;
    const owner = ownerOf(f.el), { n, m } = blockCounts(owner);
    if (f.kind === 'pole' && n - d < m) return { ok: false, msg: 'msgOrderPole' };
    f.el.mult -= 1;
    refreshAutoK(owner); notify();
    return { ok: true };
  }

  // ---------- édition depuis l'inventaire (validation Entrée) ----------
  function editElement(id, vals){
    const f = find(id); if (!f) return { ok: false, msg: 'msgBadValue' };
    const el = f.el;
    // Number('') vaut 0 : un champ vidé passerait pour un zéro et déplacerait
    // silencieusement l'élément sur l'axe. On refuse le vide explicitement.
    const lu = v => { const s = String(v).trim(); return s === '' ? NaN : Number(s); };
    let sigma = lu(vals.sigma);
    let omega = el.type === 'pair' ? lu(vals.omega) : 0;
    const mult = Math.round(lu(vals.mult));
    const owner = vals.owner === undefined ? ownerOf(el) : vals.owner;
    if (!isFinite(sigma) || !isFinite(omega) || !isFinite(mult) || mult < 1)
      return { ok: false, msg: 'msgBadValue' };
    if (!OWNERS.includes(owner)) return { ok: false, msg: 'msgBadValue' };
    const oldOwner = ownerOf(el);
    if (state.controller.mode === 'pid' && (oldOwner === 'controller' || owner === 'controller')){
      if (!el.pidStructural || owner !== 'controller' || mult !== el.mult)
        return { ok: false, msg: 'msgPidLinked' };
      const res = updatePidRoot(id, sigma, omega);
      if (res.ok){ ui.pidBlocked = false; notify(); }
      return res;
    }
    if (el.type === 'pair') omega = Math.abs(omega);
    // Multiplicité max 1 sur l'axe jω ; pas de paire dégénérée à l'origine (cahier §1)
    if (sigma === 0 && (mult > 1 || (el.type === 'pair' && omega === 0)))
      return { ok: false, msg: 'msgAxisMult' };
    // Contraintes d'ordre par bloc : n ≤ N_MAX et m ≤ n.
    const per = el.type === 'pair' ? 2 : 1;
    const oldC = blockCounts(oldOwner);
    if (f.kind === 'pole' && counts().n + (mult - el.mult) * per > LOOP_N_MAX)
      return { ok: false, msg: 'msgLoopNmax' };
    if (owner === oldOwner){
      if (f.kind === 'pole'){
        const n2 = oldC.n + (mult - el.mult) * per;
        if (n2 > N_MAX) return { ok: false, msg: 'msgNmax' };
        if (n2 < oldC.m) return { ok: false, msg: 'msgOrderPole' };
      } else if (oldC.m + (mult - el.mult) * per > oldC.n){
        return { ok: false, msg: 'msgCausality' };
      }
    } else {
      const dst = blockCounts(owner), oldD = el.mult * per, newD = mult * per;
      if (f.kind === 'pole'){
        if (oldC.n - oldD < oldC.m) return { ok: false, msg: 'msgOrderPole' };
        if (dst.n + newD > N_MAX) return { ok: false, msg: 'msgNmax' };
      } else if (dst.m + newD > dst.n){
        return { ok: false, msg: 'msgCausality' };
      }
    }
    el.sigma = sigma;
    if (el.type === 'pair') el.omega = omega;
    el.mult = mult;
    el.owner = owner;
    refreshAutoK(oldOwner);
    if (owner !== oldOwner) refreshAutoK(owner);
    notify();
    return { ok: true };
  }

  // ---------- drag (semiplans libres + snap, cahier lazo cerrado §4) ----------
  // sx, sy : échelles courantes du plan s en px par unité.
  // opts.snap = false : pas d'aimantation (déplacement clavier) ;
  // opts.track = false : ne pas marquer drag/fusion (déplacement clavier).
  function dragTo(id, sigma, omega, sx, sy, opts = {}){
    const snap = opts.snap !== false, track = opts.track !== false;
    const f = find(id); if (!f) return;
    const el = f.el;
    if (el.pidStructural){
      const res = updatePidRoot(id, sigma, Math.abs(omega));
      ui.dragId = id;
      ui.snapped = false;
      ui.fuse = null;
      ui.pidBlocked = !res.ok ? res.msg : false;
      notify();
      return res;
    }
    const epsS = SNAP_PX / sx, epsW = SNAP_PX / sy;
    let snapped = false;
    if (Math.abs(sigma) < epsS){
      const originPair = el.type === 'pair' && Math.abs(omega) < 2 * epsW;
      const allowed = el.mult === 1 && !originPair;
      if (allowed && snap){
        sigma = 0; snapped = true;                            // snap σ → 0 exact
      } else if (!allowed){
        sigma = sigma < 0 ? -epsS : epsS;
      }
    }
    if (el.type === 'pair'){
      omega = Math.abs(omega);
      if (sigma === 0) omega = Math.max(omega, epsW);         // pas de paire à l'origine
    } else {
      omega = 0;                                              // un élément réel reste sur l'axe réel
    }
    el.sigma = sigma;
    if (el.type === 'pair') el.omega = omega;
    if (track){
      ui.dragId = id;
      ui.snapped = snapped && sigma === 0;
      ui.fuse = fusionCandidate(id, sx, sy);
    }
    refreshAutoK(ownerOf(el)); notify();
  }

  function fusionCandidate(id, sx, sy){
    const f = find(id); if (!f) return null;
    const el = f.el;
    if (el.pidStructural) return null;
    let best = null, bestD = FUSE_PX;
    for (const other of f.list){
      if (other === el || other.type !== el.type || ownerOf(other) !== ownerOf(el)) continue;
      const d = Math.hypot((other.sigma - el.sigma) * sx,
                           ((other.omega || 0) - (el.omega || 0)) * sy);
      if (d < bestD){ bestD = d; best = other; }
    }
    if (!best) return null;
    return { targetId: best.id, refused: best.sigma === 0 };  // fusion refusée sur l'axe jω
  }

  function endDrag(id, sx, sy){
    if (String(id).startsWith('pid-')){
      const msg = ui.pidBlocked || null;
      ui.dragId = null; ui.snapped = false; ui.fuse = null; ui.pidBlocked = false;
      notify();
      return msg ? { ok: false, msg } : { ok: true };
    }
    const cand = fusionCandidate(id, sx, sy);
    ui.dragId = null; ui.snapped = false; ui.fuse = null;
    if (!cand){ notify(); return { ok: true }; }
    if (cand.refused){ notify(); return { ok: false, msg: 'msgAxisFusion' }; }
    const f = find(id), g = find(cand.targetId);
    g.el.mult += f.el.mult;
    f.list.splice(f.list.indexOf(f.el), 1);
    if (ui.selectedId === id) ui.selectedId = g.el.id;
    refreshAutoK(ownerOf(g.el)); notify();
    return { ok: true, fused: true };
  }

  // ---------- sélection ----------
  function select(id){ ui.selectedId = id; notify(); }
  function setActiveBlock(owner){
    if (!ACTIVE_BLOCKS.includes(owner) || ui.activeBlock === owner) return;
    ui.activeBlock = owner;
    notify();
  }
  function setSaturation(patch){
    const next = { ...state.saturation, ...patch };
    next.enabled = !!next.enabled;
    next.min = Number(next.min); next.max = Number(next.max);
    if (![next.min, next.max].every(isFinite) || !(next.min < next.max))
      return { ok: false, msg: 'msgSaturationBounds' };
    state.saturation = next;
    if (next.enabled){
      if (state.view.timeExperiment !== 'plant' && state.input.type === 'impulse') state.input.type = 'step';
      state.view.timeSignals = [...new Set([...state.view.timeSignals, 'ucmd', 'u'])];
    } else {
      state.view.timeSignals = state.view.timeSignals.filter(name => name !== 'u');
    }
    state.view.timeYControlWin = null;
    notify();
    return { ok: true };
  }

  // ω_éval : point d'évaluation partagé (Bode ↔ plan s ↔ 3D).
  // Fréquence d'évaluation effective : en entrée sinusoïdale, c'est ω_in qui
  // tient le rôle (un seul marqueur à l'écran) ; sinon, ω_éval.
  function evalOmega(){
    return state.input.type === 'sine' ? state.input.omegaIn : state.omegaEval;
  }
  function setOmegaEval(w){
    const max = state.omegaRange.max;
    if (state.input.type === 'sine')
      state.input.omegaIn = Math.min(Math.max(w, max * 1e-3), max);   // ω_in > 0
    else
      state.omegaEval = Math.max(0, Math.min(w, max));                // borne ω ≥ 0 (§6 bis)
    notify();
  }

  // Chaque racine comme point individuel : une paire donne deux points (σ, ±ω).
  // Numérotation alignée sur l'inventaire (p₁, p₂ pour une paire p₁,₂).
  function rootPoints(){
    const out = [];
    for (const [kind, list, letter] of [['zero', state.zeros, 'z'], ['pole', state.poles, 'p']]){
      let i = 1;
      for (const el of list){
        if (el.type === 'pair'){
          out.push({ kind, id: el.id, owner: ownerOf(el), label: `${letter}${sub(i)}`,
                     sigma: el.sigma, omega: el.omega, mult: el.mult });
          out.push({ kind, id: el.id, owner: ownerOf(el), label: `${letter}${sub(i + 1)}`,
                     sigma: el.sigma, omega: -el.omega, mult: el.mult });
          i += 2;
        } else {
          out.push({ kind, id: el.id, owner: ownerOf(el), label: `${letter}${sub(i)}`,
                     sigma: el.sigma, omega: 0, mult: el.mult });
          i += 1;
        }
      }
    }
    return out;
  }

  // ---------- inventaire : numérotation p₁,₂ / p₃ (format maquette) ----------
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const sub = n => String(n).split('').map(c => SUB[+c]).join('');
  function inventoryData(){
    const rows = [];
    for (const [kind, list, letter] of [['pole', state.poles, 'p'], ['zero', state.zeros, 'z']]){
      let i = 1;
      for (const el of list){
        const label = el.type === 'pair' ? `${letter}${sub(i)},${sub(i + 1)}` : `${letter}${sub(i)}`;
        i += el.type === 'pair' ? 2 : 1;
        rows.push({ id: el.id, kind, owner: ownerOf(el), el, label });
      }
    }
    return rows;
  }

  // ---------- vue ----------
  function setView(patch){
    const next = { ...patch };
    if (Object.prototype.hasOwnProperty.call(next, 'timeExperiment'))
      next.timeExperiment = next.timeExperiment === 'plant' ? 'plant' : 'closed';
    Object.assign(state.view, next);
    if (state.view.timeExperiment !== 'plant' && state.saturation.enabled && state.input.type === 'impulse')
      state.input.type = 'step';
    notify();
  }

  // Fenêtre ω du Bode (cahier §6, jalon J2c). L'intervalle reste celui du rang
  // partagé : en log₁₀ seule la borne basse change (0 n'est pas représentable),
  // ω_max — donc le zoom du plan s — n'est pas affecté par le nombre de décades.
  function bodeWindow(){
    const max = Math.max(state.omegaRange.max, 1e-9);
    const log = state.view.logScale;
    const dec = Math.max(1, Math.min(8, Math.round(state.view.omegaLogDecades)));
    return { log, dec, max, min: log ? max / Math.pow(10, dec) : 0 };
  }
  function setInput(patch){
    const next = { ...patch };
    if (next.type && !['step', 'trapezoid', 'impulse', 'sine'].includes(next.type)) delete next.type;
    if (Object.prototype.hasOwnProperty.call(next, 'riseTime')){
      next.riseTime = Number(next.riseTime);
      if (!(next.riseTime > 0) || !isFinite(next.riseTime)) delete next.riseTime;
      else next.riseTime = Math.min(Math.max(next.riseTime, 1e-3), 1e5);
    }
    for (const key of ['amplitude', 'secondValue']) if (Object.prototype.hasOwnProperty.call(next, key)){
      next[key] = Number(next[key]);
      if (!isFinite(next[key])) delete next[key];
      else next[key] = Math.min(Math.max(next[key], -1e6), 1e6);
    }
    if (Object.prototype.hasOwnProperty.call(next, 'secondTime')){
      next.secondTime = Number(next.secondTime);
      if (!(next.secondTime >= 0) || !isFinite(next.secondTime)) delete next.secondTime;
      else next.secondTime = Math.min(next.secondTime, 1e5);
    }
    if (Object.prototype.hasOwnProperty.call(next, 'secondEnabled'))
      next.secondEnabled = !!next.secondEnabled;
    if (state.view.timeExperiment !== 'plant' && state.saturation.enabled && next.type === 'impulse')
      next.type = 'step';
    Object.assign(state.input, next); notify();
  }

  // Fenêtre du plan s (zoom molette / pan) : met à jour le rang ω partagé (cahier §2)
  function setPlaneWindow(sMin, sMax, oMin, oMax){
    state.view.sigmaWindow = { min: sMin, max: sMax };
    state.omegaRange = { min: oMin, max: oMax };
    // le marqueur reste dans la fenêtre visible
    state.omegaEval = Math.max(0, Math.min(state.omegaEval, oMax));
    notify();
  }

  // ---------- réinitialisation globale (cahier §3, jalon J7) ----------
  // Rétablit le modèle ET toutes les vues : c'est la sortie de secours quand
  // une exploration a laissé l'écran dans un état dont on ne sait plus revenir.
  // Le thème et la langue sont des préférences, pas un état d'exploration :
  // ils survivent au reset.
  function reset(){
    state.poles.length = 0;
    state.zeros.length = 0;
    state.K = 1;
    state.blockGains = { controller: 1, sensor: 1 };
    state.controller = { mode: 'pid',
      pid: { structure: 'P', Kp: 1, Ki: 0, Kd: 0, Ti: 1, Td: 0.1, N: 10 } };
    state.delay = 0;
    state.saturation = { enabled: false, min: -10, max: 10 };
    state.omegaRange = { min: -8, max: 8 };
    state.omegaEval = 2;
    state.input = {
      type: 'step', omegaIn: 1, riseTime: 1, amplitude: 1,
      secondEnabled: false, secondTime: 5, secondValue: 0
    };
    state.exploration = { kappa: 1 };
    Object.assign(state.view, {
      show3d: false, showBode: false, showTime: true, surfMode: 'mag',
      logScale: false, omegaLogDecades: 3,
      aspectLock: true, showTransient: true, eqCollapsed: true, eqFit: true, eqFreq: false,
      sidebarHidden: false,
      bodeUnwrap: true, bodeShowPhase: true,
      bodeFunctions: ['L'],
      bodeMode: 'bode', showMargins: false, surfaceFunction: 'L', equationFunction: 'L',
      surfPalette: 'viridis', surfDetail: 'med', clipFactor: 1,
      bodeMagZoom: 1, bodePhZoom: 1,
      timeT: null, timeXWin: null, timeYOutputWin: null, timeYControlWin: null,
      timeExperiment: 'closed', timeSignals: ['r', 'y'], timePlantSignals: ['r', 'y'],
      splaneMode: 'overlay',
      loopCollapsed: false, loopHeight: 196,
      sigmaWindow: { min: -5, max: 1.5 }
    });
    ui.selectedId = null;
    ui.activeBlock = 'plant';
    ui.kAuto = true;
    ui.blockKAuto = { controller: false, sensor: true };
    ui.dragId = null;
    ui.snapped = false;
    ui.fuse = null;
    ui.pidBlocked = false;
    loadExample();
  }

  // ---------- contenu initial ----------
  function loadExample(){
    // Plante du second ordre P(0)=1, contrôleur P unitaire et capteur unitaire.
    state.poles.push({ id: 'e' + (nextId++), owner: 'plant', type: 'pair', sigma: -1, omega: 4.9, mult: 1 });
    state.controller.mode = 'pid';
    state.controller.pid = { structure: 'P', Kp: 1, Ki: 0, Kd: 0, Ti: 1, Td: 0.1, N: 10 };
    refreshAutoK(); notify();
  }

  return {
    N_MAX, LOOP_N_MAX, OWNERS, ACTIVE_BLOCKS, state, ui,
    onChange, counts, blockCounts, polys, blockPolys, transferPolys, signalTransferPolys, pidTransferPolys,
    simplifyTransfer, cancellationInfo, allCancellationInfo,
    evalHjw, evalTransferHjw, evalTransferComplex, stabilityMargins,
    gainOf, kAutoOf, canNormalizeDc, polynomialRoots, closedLoopPoles, closedLoopZeros,
    rootLocus, rootLocusPoles, setRootLocusKappa, applyRootLocusKappa, find, canAdd,
    addElement, removeElement, decrementElement, editElement,
    dragTo, endDrag, select, setActiveBlock, setK, setKAuto, setDelay, setView, setInput, setPlaneWindow,
    setControllerMode, setPidParams, pidCanonicalParams, setPidCanonicalParams,
    setPidStructure, resetPid, isRootLocked, setSaturation,
    setOmegaEval, evalOmega, rootPoints, bodeWindow,
    inventoryData, sub, loadExample, reset
  };
})();
