'use strict';
/* Signaux temporels de la boucle fermée ou essai direct de la plante.
   Les quatre signaux internes rationnels partagent l'équation caractéristique
   1 + C(s)P(s)S(s) : une seule intégration RK4 alimente donc deux sous-tracés
   synchronisés. Le tracé haut compare r, y, y_m et e ; le tracé bas montre la
   commande u_cmd (et, plus tard, u après saturation). Les deux axes Y restent
   indépendants, tandis que l'axe du temps et sa navigation sont partagés. */
const TimeResp = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('time-svg');
  const body = document.getElementById('time-body');

  let W = 400, H = 220;
  const ML = 66, MR = 14, MT = 10, MB = 25, GAP = 24;
  const MAX_STEPS = 40000, DRAW_PTS = 1500, BAND = 12, DIVERGENCE_LIMIT = 1e6;
  const GROUPS = { output: ['r', 'y', 'ym', 'e'], control: ['ucmd', 'u'] };
  const ALL_SIGNALS = [...GROUPS.output, ...GROUPS.control];

  let drag = null;
  let boxEl = null;
  let lastT = 10;
  let vc = null;

  function mk(name, attrs, text){
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const disp = s => String(s).replace(/-/g, '−');
  const fmt3 = v => disp(String(Number(v.toPrecision(3))));

  function niceStep(target){
    if (!(target > 0) || !isFinite(target)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(target)));
    const m = target / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function referenceValue(type, tv, input){
    const amplitude = input.amplitude;
    if (type === 'sine') return amplitude * Math.sin(input.omegaIn * tv);
    if (type === 'step')
      return input.secondEnabled && tv >= input.secondTime ? input.secondValue : amplitude;
    if (type === 'trapezoid'){
      const riseTime = Math.max(input.riseTime, 1e-9);
      const first = amplitude * Math.max(0, Math.min(1, tv / riseTime));
      if (!input.secondEnabled || tv < input.secondTime) return first;
      const start = amplitude * Math.max(0, Math.min(1, input.secondTime / riseTime));
      const mix = Math.max(0, Math.min(1, (tv - input.secondTime) / riseTime));
      return start + (input.secondValue - start) * mix;
    }
    return 0;
  }
  const finalReference = (type, input) =>
    (type === 'step' || type === 'trapezoid') && input.secondEnabled
      ? input.secondValue : input.amplitude;

  // ---------- contrôles de l'en-tête ----------
  const inputSel = document.getElementById('input-type');
  const impulseOption = document.getElementById('input-impulse');
  const timeWarning = document.getElementById('time-warning');
  const experimentSel = document.getElementById('time-experiment');
  const timePanelTitle = document.getElementById('time-panel-title');
  const timeOutputLabel = document.getElementById('time-output-label');
  const timeControlSignals = document.getElementById('time-control-signals');
  const signalRSymbol = document.getElementById('time-signal-r-symbol');
  const signalYSymbol = document.getElementById('time-signal-y-symbol');
  const secondValueSymbol = document.getElementById('second-value-symbol');
  const plantExperiment = () => Model.state.view.timeExperiment === 'plant';
  const signalViewKey = () => plantExperiment() ? 'timePlantSignals' : 'timeSignals';
  const availableSignals = () => plantExperiment() ? ['r', 'y'] : ALL_SIGNALS;
  experimentSel.addEventListener('change', () =>
    Model.setView({ timeExperiment: experimentSel.value === 'plant' ? 'plant' : 'closed',
      timeXWin: null, timeYOutputWin: null, timeYControlWin: null }));
  inputSel.addEventListener('change', () => Model.setInput({ type: inputSel.value }));

  const riseWrap = document.getElementById('rise-wrap');
  const riseInput = document.getElementById('rise-time');
  riseInput.addEventListener('change', () => {
    const value = Number(riseInput.value);
    if (isFinite(value) && value > 0) Model.setInput({ riseTime: value });
    else App.render();
  });
  riseInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') riseInput.blur(); });

  const amplitudeInput = document.getElementById('input-amplitude');
  amplitudeInput.addEventListener('change', () => {
    const value = Number(amplitudeInput.value);
    if (isFinite(value)) Model.setInput({ amplitude: value });
    else App.render();
  });
  amplitudeInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') amplitudeInput.blur(); });

  const secondEnableWrap = document.getElementById('second-enable-wrap');
  const secondEnabled = document.getElementById('second-enabled');
  const secondStepOptions = document.getElementById('second-step-options');
  const secondTimeInput = document.getElementById('second-time');
  const secondValueInput = document.getElementById('second-value');
  secondEnabled.addEventListener('change', () =>
    Model.setInput({ secondEnabled: secondEnabled.checked }));
  secondTimeInput.addEventListener('change', () => {
    const value = Number(secondTimeInput.value);
    if (isFinite(value) && value >= 0) Model.setInput({ secondTime: value });
    else App.render();
  });
  secondValueInput.addEventListener('change', () => {
    const value = Number(secondValueInput.value);
    if (isFinite(value)) Model.setInput({ secondValue: value });
    else App.render();
  });
  [secondTimeInput, secondValueInput].forEach(input =>
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') input.blur(); }));

  const signalChecks = [...document.querySelectorAll('[data-time-signal]')];
  signalChecks.forEach(chk => chk.addEventListener('change', () => {
    const allowed = new Set(availableSignals());
    const selected = signalChecks.filter(el => allowed.has(el.dataset.timeSignal) && el.checked && !el.disabled)
      .map(el => el.dataset.timeSignal);
    Model.setView({ [signalViewKey()]: selected });
  }));

  const tInput = document.getElementById('time-T');
  const tAutoChk = document.getElementById('time-T-auto');
  tInput.addEventListener('change', () => {
    const v = Number(tInput.value);
    if (isFinite(v) && v > 0)
      Model.setView({ timeT: Math.min(Math.max(v, 1e-3), 1e5), timeXWin: null });
    else App.render();
  });
  tInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') tInput.blur(); });
  tAutoChk.addEventListener('change', () =>
    Model.setView({ timeT: tAutoChk.checked ? null : lastT, timeXWin: null }));

  const winWrap = document.getElementById('win-wrap');
  const winNum = document.getElementById('win-num');
  winNum.addEventListener('change', () => {
    const v = Number(winNum.value);
    if (isFinite(v) && v > 0) Model.setInput({ omegaIn: v });
    else App.render();
  });
  winNum.addEventListener('keydown', ev => { if (ev.key === 'Enter') winNum.blur(); });

  const transWrap = document.getElementById('trans-wrap');
  const transChk = document.getElementById('show-trans');
  transChk.addEventListener('change', () => Model.setView({ showTransient: transChk.checked }));

  function refreshLang(){
    const plantOnly = plantExperiment();
    timePanelTitle.textContent = t(plantOnly ? 'respPlant' : 'respLoop');
    timeOutputLabel.textContent = t(plantOnly ? 'plant' : 'timeTracking');
    tInput.title = t('tHint');
    tAutoChk.closest('label').title = t('tAutoHint');
    winNum.title = t('winHint');
    riseInput.title = t('riseTimeHint');
    amplitudeInput.title = t('amplitudeHint');
    secondEnableWrap.title = t('secondStep');
    secondTimeInput.title = t('secondTimeHint');
    secondValueInput.title = t('secondValueHint');
    document.getElementById('time-u-label').title = plantOnly ? ''
      : Model.state.saturation.enabled ? '' : t('timeUSame');
    impulseOption.title = !plantOnly && Model.state.saturation.enabled ? t('impulseSatDisabled') : '';
  }
  refreshLang();

  // ---------- durée automatique ----------
  const responsePoles = () => {
    if (plantExperiment()) return Model.rootPoints()
      .filter(p => p.kind === 'pole' && p.owner === 'plant')
      .map(p => ({ sigma: p.sigma, omega: p.omega }));
    return Model.state.delay > 0
      ? Model.rootPoints().filter(p => p.kind === 'pole').map(p => ({ sigma: p.sigma, omega: p.omega }))
      : Model.closedLoopPoles().map(p => ({ sigma: p.sigma, omega: p.omega }));
  };

  function autoT(){
    const poles = responsePoles();
    const cand = [];
    const input = Model.state.input, type = input.type;
    const stable = poles.filter(e => e.sigma < 0);
    const tTrans = stable.length ? 5 / Math.min(...stable.map(e => -e.sigma)) : 0;
    if (type === 'sine')
      cand.push(tTrans + 4 * 2 * Math.PI / Math.max(input.omegaIn, 1e-6));
    else {
      if ((type === 'step' || type === 'trapezoid') && input.secondEnabled)
        cand.push(input.secondTime + (type === 'trapezoid' ? input.riseTime : 0) + tTrans);
      else if (type === 'trapezoid') cand.push(input.riseTime + tTrans);
      else if (stable.length) cand.push(tTrans);
      const damped = poles.filter(e => e.sigma < 0 && e.omega > 0);
      if (damped.length) cand.push(3 * 2 * Math.PI / Math.min(...damped.map(e => e.omega)));
    }
    const axisOsc = poles.filter(e => e.sigma === 0 && e.omega > 0);
    if (axisOsc.length) cand.push(4 * 2 * Math.PI / Math.min(...axisOsc.map(e => e.omega)));
    if (poles.some(e => e.omega === 0 && e.sigma === 0)) cand.push(10);
    const T = (cand.length ? Math.max(...cand) : 10) + Model.state.delay;
    return Math.min(Math.max(T, 1e-3), 1e5);
  }

  function exactResonance(){
    if (Model.state.input.type !== 'sine') return false;
    const w = Model.state.input.omegaIn;
    return responsePoles().some(e => Math.abs(e.sigma) < 1e-9 &&
      Math.abs(Math.abs(e.omega) - w) < 1e-9 * Math.max(1, w));
  }

  // Division polynomiale descendante. La partie polynomiale ne contient que
  // des distributions pour un échelon/une impulsion ; son terme constant reste
  // toutefois un feed-through ordinaire. Pour une sinusoïde, elle est évaluée
  // exactement en jω.
  function polyDivide(num, den){
    const r = num.slice();
    const qLen = Math.max(0, num.length - den.length + 1);
    const q = new Array(qLen).fill(0);
    for (let i = 0; i < qLen; i++){
      const k = r[i] / den[0];
      q[i] = k;
      for (let j = 0; j < den.length; j++) r[i + j] -= k * den[j];
    }
    const rem = r.slice(qLen);
    return { q, rem: rem.length ? rem : [0] };
  }

  function hornerComplex(coeffs, w){
    let re = 0, im = 0;
    for (const c of coeffs){
      const nextRe = -im * w + c;
      im = re * w;
      re = nextRe;
    }
    return { re, im };
  }

  function evalTf(tf, w){
    const n = hornerComplex(tf.num, w), d = hornerComplex(tf.den, w);
    const d2 = d.re * d.re + d.im * d.im;
    if (!(d2 > 0)) return null;
    const re = (n.re * d.re + n.im * d.im) / d2;
    const im = (n.im * d.re - n.re * d.im) / d2;
    return isFinite(re) && isFinite(im) ? { re, im, mag: Math.hypot(re, im) } : null;
  }

  function outputParams(tf, den){
    const lead = den[0];
    const normalizedNum = tf.num.map(v => v / lead);
    const normalizedDen = den.map(v => v / lead);
    const { q, rem } = polyDivide(normalizedNum, normalizedDen);
    const n = normalizedDen.length - 1;
    const c = new Array(n).fill(0);
    rem.forEach((v, i) => { c[rem.length - 1 - i] = v; });
    return { c, q, D: q.length ? q[q.length - 1] : 0 };
  }

  function polynomialInput(q, type, input, tv){
    if (!q.length || type === 'impulse') return 0;
    if (type === 'step' || type === 'trapezoid')
      return q[q.length - 1] * referenceValue(type, tv, input);
    const h = hornerComplex(q, input.omegaIn);
    return input.amplitude * (h.re * Math.sin(input.omegaIn * tv) + h.im * Math.cos(input.omegaIn * tv));
  }

  // ---------- simulation commune ----------
  function simulateLinear(){
    const tf = {};
    if (plantExperiment()){
      const plant = Model.transferPolys('P');
      tf.y = plant;
      for (const signal of ['e', 'ucmd', 'ym']) tf[signal] = { num: [0], den: plant.den.slice() };
    } else {
      for (const signal of ['e', 'ucmd', 'y', 'ym']) tf[signal] = Model.signalTransferPolys(signal);
    }
    tf.u = tf.ucmd;
    const den = tf.y.den;
    const lead = den[0];
    const a = den.map(v => v / lead);
    const n = a.length - 1;
    const params = {};
    for (const signal of ['e', 'ucmd', 'y', 'ym']) params[signal] = outputParams(tf[signal], den);
    params.u = params.ucmd;

    const input = Model.state.input;
    const type = input.type;
    const isSine = type === 'sine';
    const wIn = input.omegaIn;
    const riseTime = input.riseTime;
    const settlesToOne = type === 'step' || type === 'trapezoid';
    const finalValue = finalReference(type, input);
    const T = Model.state.view.timeT !== null ? Model.state.view.timeT : autoT();
    const res = exactResonance();
    const stable = responsePoles().filter(e => e.sigma < 0);
    const tTrans = stable.length ? Math.min(T, 5 / Math.min(...stable.map(e => -e.sigma))) : 0;
    const steadyOnly = isSine && !res && !Model.state.view.showTransient;
    const uOf = tv => referenceValue(type, tv, input);
    const signals = { r: [], e: [], ucmd: [], u: [], y: [], ym: [] };
    const direct = { r: input.amplitude, e: params.e.D * input.amplitude,
                     ucmd: params.ucmd.D * input.amplitude, u: params.u.D * input.amplitude,
                     y: params.y.D * input.amplitude, ym: params.ym.D * input.amplitude };
    const steady = { r: settlesToOne ? finalValue : null };
    for (const signal of ['e', 'ucmd', 'u', 'y', 'ym']){
      const f = tf[signal];
      steady[signal] = settlesToOne && Math.abs(f.den[f.den.length - 1]) > 1e-12
        ? finalValue * f.num[f.num.length - 1] / f.den[f.den.length - 1] : null;
    }

    const frequency = {};
    if (isSine){
      for (const signal of ['e', 'ucmd', 'u', 'y', 'ym']){
        const h = evalTf(tf[signal], wIn);
        frequency[signal] = h ? { re: h.re * input.amplitude, im: h.im * input.amplitude,
          mag: h.mag * Math.abs(input.amplitude) } : null;
      }
      frequency.r = { re: input.amplitude, im: 0, mag: Math.abs(input.amplitude) };
    }

    const tValues = [];
    if (steadyOnly){
      for (let i = 0; i <= 3000; i++){
        const tv = T * i / 3000;
        tValues.push(tv);
        signals.r.push(referenceValue(type, tv, input));
        for (const signal of ['e', 'ucmd', 'y', 'ym']){
          const h = frequency[signal];
          const delayPhase = (signal === 'y' || signal === 'ym') ? -wIn * Model.state.delay : 0;
          signals[signal].push(h ? h.mag * Math.sin(wIn * tv + Math.atan2(h.im, h.re) + delayPhase) : NaN);
        }
        signals.u.push(signals.ucmd[signals.ucmd.length - 1]);
      }
      return finish({ T, type, isSine, wIn, res, tTrans: 0, steadyOnly,
        t: tValues, signals, direct, steady, frequency });
    }

    const wFast = Math.max(1e-6, isSine ? wIn : 0, type === 'trapezoid' ? 1 / riseTime : 0,
      ...responsePoles().map(e => Math.hypot(e.sigma, e.omega)));
    let dt = Math.min(1 / (25 * wFast), T / 600);
    const steps = Math.min(MAX_STEPS, Math.max(400, Math.ceil(T / dt)));
    dt = T / steps;

    const x = new Array(n).fill(0);
    if (type === 'impulse' && n > 0) x[n - 1] = input.amplitude;
    const alpha = a.slice(1).reverse();
    const deriv = (tv, xs, out) => {
      for (let i = 0; i < n - 1; i++) out[i] = xs[i + 1];
      if (!n) return;
      let s = uOf(tv);
      for (let i = 0; i < n; i++) s -= alpha[i] * xs[i];
      out[n - 1] = s;
    };
    const valueOf = (signal, tv, xs) => {
      let v = polynomialInput(params[signal].q, type, input, tv);
      for (let i = 0; i < n; i++) v += params[signal].c[i] * xs[i];
      return v;
    };
    const append = tv => {
      tValues.push(tv);
      signals.r.push(uOf(tv));
      for (const signal of ['e', 'ucmd', 'y', 'ym']) signals[signal].push(valueOf(signal, tv, x));
      signals.u.push(signals.ucmd[signals.ucmd.length - 1]);
    };
    append(0);
    if (n > 0){
      const k1 = new Array(n), k2 = new Array(n), k3 = new Array(n), k4 = new Array(n), tmp = new Array(n);
      for (let s = 1; s <= steps; s++){
        const t0 = (s - 1) * dt;
        deriv(t0, x, k1);
        for (let i = 0; i < n; i++) tmp[i] = x[i] + 0.5 * dt * k1[i];
        deriv(t0 + 0.5 * dt, tmp, k2);
        for (let i = 0; i < n; i++) tmp[i] = x[i] + 0.5 * dt * k2[i];
        deriv(t0 + 0.5 * dt, tmp, k3);
        for (let i = 0; i < n; i++) tmp[i] = x[i] + dt * k3[i];
        deriv(t0 + dt, tmp, k4);
        for (let i = 0; i < n; i++) x[i] += dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6;
        append(s * dt);
      }
    } else {
      for (let s = 1; s <= steps; s++) append(s * dt);
    }
    // Approximation temporaire du retard : il est placé sur la sortie de la
    // plante. Le traitement exact de la rétroaction retardée demandera une DDE.
    signals.y = retarde(tValues, signals.y);
    signals.ym = retarde(tValues, signals.ym);
    return finish({ T, type, isSine, wIn, res, tTrans, steadyOnly,
      t: tValues, signals, direct, steady, frequency });
  }

  // Réalisation commandable d'un bloc rationnel propre. L'ordre des états est
  // le même que dans l'intégrateur historique : x'₀=x₁, ..., le dernier état
  // reçoit l'entrée. Cela permet de simuler C, P et S séparément sans nouvelle
  // dépendance ni conversion symbolique.
  function realization(tf){
    const lead = tf.den[0];
    const den = tf.den.map(v => v / lead), num = tf.num.map(v => v / lead);
    const { q, rem } = polyDivide(num, den);
    const n = den.length - 1, c = new Array(n).fill(0);
    rem.forEach((v, i) => { c[rem.length - 1 - i] = v; });
    return { n, alpha: den.slice(1).reverse(), c, D: q.length ? q[q.length - 1] : 0 };
  }
  const baseOutput = (block, x, offset) => {
    let y = 0;
    for (let i = 0; i < block.n; i++) y += block.c[i] * x[offset + i];
    return y;
  };
  function blockDerivative(block, x, offset, input, out){
    for (let i = 0; i < block.n - 1; i++) out[offset + i] = x[offset + i + 1];
    if (!block.n) return;
    let v = input;
    for (let i = 0; i < block.n; i++) v -= block.alpha[i] * x[offset + i];
    out[offset + block.n - 1] = v;
  }

  // Interconnexion temporelle utilisée dès qu'une non-linéarité ou un retard
  // est actif. Le retard porte sur u, à l'entrée de P, et non sur la sortie
  // finale. Avec T_P>0, historyAt() transforme l'ODE en méthode des pas pour la
  // DDE. Sans retard, la petite boucle algébrique des termes directs est résolue
  // analytiquement, y compris lorsque u = sat(u_cmd).
  function simulateInterconnected(){
    const sat = Model.state.saturation, saturated = sat.enabled;
    const delay = Model.state.delay;
    const P = realization(Model.transferPolys('P'));
    const S = realization(Model.transferPolys('S'));
    const pidMode = Model.state.controller.mode === 'pid';
    const C = pidMode ? null : realization(Model.transferPolys('C'));
    const pid = Model.state.controller.pid;
    const cN = pidMode ? 2 : C.n;
    const offsets = { C: 0, P: cN, S: cN + P.n };
    const stateN = cN + P.n + S.n;
    const input = Model.state.input;
    const type = input.type;
    const isSine = type === 'sine', wIn = input.omegaIn;
    const riseTime = input.riseTime;
    const settlesToOne = type === 'step' || type === 'trapezoid';
    const finalValue = finalReference(type, input);
    const requestedT = Model.state.view.timeT !== null ? Model.state.view.timeT : autoT();
    const wFast = Math.max(1e-6, isSine ? wIn : 0, type === 'trapezoid' ? 1 / riseTime : 0,
      ...Model.rootPoints().filter(p => p.kind === 'pole').map(p => Math.hypot(p.sigma, p.omega)),
      pidMode ? pid.N : 0);
    let dt = Math.min(1 / (30 * wFast), requestedT / 800);
    if (delay > 0) dt = Math.min(dt, delay / 3);
    let steps = Math.max(500, Math.ceil(requestedT / Math.max(dt, 1e-12)));
    if (steps > MAX_STEPS) steps = MAX_STEPS;
    dt = requestedT / steps;
    const impulseWidth = 4 * dt;
    const referenceAt = tv => type === 'impulse'
      ? (tv >= 0 && tv < impulseWidth ? input.amplitude / impulseWidth : 0)
      : referenceValue(type, tv, input);
    const clip = value => saturated ? Math.max(sat.min, Math.min(sat.max, value)) : value;
    const x = new Array(stateN).fill(0);
    const tValues = [], signals = { r: [], e: [], ucmd: [], u: [], y: [], ym: [] };

    const historyAt = tv => {
      if (!(tv > 0) || !tValues.length) return 0;
      const pos = tv / dt, i = Math.floor(pos), f = pos - i;
      if (i >= signals.u.length - 1) return signals.u[signals.u.length - 1] || 0;
      return signals.u[i] * (1 - f) + signals.u[i + 1] * f;
    };
    const controllerParts = xs => {
      if (!pidMode) return { base: baseOutput(C, xs, offsets.C), D: C.D };
      const I = xs[offsets.C], xd = xs[offsets.C + 1];
      return { base: pid.Ki * I - pid.Kd * pid.N * xd, D: pid.Kp + pid.Kd * pid.N };
    };
    const evaluate = (tv, xs) => {
      const r = referenceAt(tv);
      const cp = controllerParts(xs);
      const p0 = baseOutput(P, xs, offsets.P), s0 = baseOutput(S, xs, offsets.S);
      let e, ucmd, u, plantInput, y, ym;
      if (delay > 0){
        plantInput = historyAt(tv - delay);
        y = p0 + P.D * plantInput;
        ym = s0 + S.D * y;
        e = r - ym;
        ucmd = cp.base + cp.D * e;
        u = clip(ucmd);
      } else {
        const q = cp.base + cp.D * (r - s0 - S.D * p0);
        const h = cp.D * S.D * P.D;
        const candidate = Math.abs(1 + h) > 1e-12 ? q / (1 + h) : q;
        u = clip(candidate);
        ucmd = saturated && u !== candidate ? q - h * u : candidate;
        plantInput = u;
        y = p0 + P.D * plantInput;
        ym = s0 + S.D * y;
        e = r - ym;
      }
      return { r, e, ucmd, u, plantInput, y, ym };
    };
    const derivative = (tv, xs, out) => {
      out.fill(0);
      const v = evaluate(tv, xs);
      if (pidMode){
        const hasI = pid.structure === 'PI' || pid.structure === 'PID';
        const hasD = pid.structure === 'PD' || pid.structure === 'PID';
        const windsUp = saturated && ((v.ucmd > sat.max && v.e > 0) || (v.ucmd < sat.min && v.e < 0));
        out[offsets.C] = hasI && !windsUp ? v.e : 0;       // anti-windup par clamping
        out[offsets.C + 1] = hasD ? pid.N * (v.e - xs[offsets.C + 1]) : 0;
      } else blockDerivative(C, xs, offsets.C, v.e, out);
      blockDerivative(P, xs, offsets.P, v.plantInput, out);
      blockDerivative(S, xs, offsets.S, v.y, out);
      return v;
    };
    let diverged = false;
    const append = tv => {
      const v = evaluate(tv, x);
      tValues.push(tv);
      signals.r.push(type === 'impulse' ? 0 : v.r);
      for (const name of ['e', 'ucmd', 'u', 'y', 'ym']) signals[name].push(v[name]);
      if ([...x, v.e, v.ucmd, v.u, v.y, v.ym].some(a => !isFinite(a) || Math.abs(a) > DIVERGENCE_LIMIT))
        diverged = true;
    };
    append(0);
    const k1 = new Array(stateN), k2 = new Array(stateN), k3 = new Array(stateN), k4 = new Array(stateN);
    const tmp = new Array(stateN);
    for (let step = 1; step <= steps && !diverged; step++){
      const t0 = (step - 1) * dt;
      derivative(t0, x, k1);
      for (let i = 0; i < stateN; i++) tmp[i] = x[i] + .5 * dt * k1[i];
      derivative(t0 + .5 * dt, tmp, k2);
      for (let i = 0; i < stateN; i++) tmp[i] = x[i] + .5 * dt * k2[i];
      derivative(t0 + .5 * dt, tmp, k3);
      for (let i = 0; i < stateN; i++) tmp[i] = x[i] + dt * k3[i];
      derivative(t0 + dt, tmp, k4);
      for (let i = 0; i < stateN; i++)
        x[i] += dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6;
      append(step * dt);
    }
    const actualT = tValues[tValues.length - 1] || requestedT;
    const direct = { r: 0, e: 0, ucmd: 0, u: 0, y: 0, ym: 0 };
    const steady = { r: settlesToOne ? finalValue : null,
      e: null, ucmd: null, u: null, y: null, ym: null };
    return finish({ T: actualT, type, isSine, wIn, res: false, tTrans: 0, steadyOnly: false,
      t: tValues, signals, direct, steady, frequency: {}, diverged,
      delayResolved: !(delay > 0) || dt <= delay });
  }

  function simulate(){
    if (plantExperiment()) return simulateLinear();
    return Model.state.saturation.enabled || Model.state.delay > 0
      ? simulateInterconnected() : simulateLinear();
  }

  function finish(sim){
    if (!sim.diverged){
      let stop = -1;
      outer: for (let i = 0; i < sim.t.length; i++)
        for (const values of Object.values(sim.signals)){
          const v = values[i];
          if (v !== undefined && (!isFinite(v) || Math.abs(v) > DIVERGENCE_LIMIT)){ stop = i; break outer; }
        }
      if (stop >= 0){
        const end = Math.max(1, stop);
        sim.t = sim.t.slice(0, end + 1);
        for (const name of Object.keys(sim.signals)) sim.signals[name] = sim.signals[name].slice(0, end + 1);
        sim.T = sim.t[sim.t.length - 1];
        sim.diverged = true;
      }
    }
    // Alias historiques utiles aux tests/consommateurs existants.
    sim.y = sim.signals.y;
    sim.D = sim.direct.y;
    sim.yss = sim.steady.y;
    const h = sim.frequency.y;
    sim.hMag = h ? h.mag : null;
    sim.hPhi = h ? Math.atan2(h.im, h.re) : null;
    return sim;
  }

  function retarde(tValues, values){
    const T0 = Model.state.delay;
    if (!(T0 > 0) || tValues.length < 2) return values;
    const k = Math.round(T0 / (tValues[1] - tValues[0]));
    if (k <= 0) return values;
    const out = new Array(values.length);
    for (let i = 0; i < values.length; i++) out[i] = i < k ? 0 : values[i - k];
    return out;
  }

  // ---------- rendu ----------
  function geometry(selected){
    const keys = ['output', 'control'].filter(key => GROUPS[key].some(name => selected.has(name)));
    const plots = {};
    if (keys.length === 1){
      const key = keys[0];
      plots[key] = { key, top: MT, height: Math.max(80, H - MT - MB),
        winKey: key === 'output' ? 'timeYOutputWin' : 'timeYControlWin' };
    } else if (keys.length === 2){
      const available = Math.max(80, H - MT - MB - GAP);
      const outputH = Math.round(available * 0.58);
      plots.output = { key: 'output', top: MT, height: outputH, winKey: 'timeYOutputWin' };
      plots.control = { key: 'control', top: MT + outputH + GAP,
        height: available - outputH, winKey: 'timeYControlWin' };
    }
    return { plots, keys };
  }

  function selectedSignals(){
    const value = Model.state.view[signalViewKey()];
    const saved = Array.isArray(value) ? value : [];
    return new Set(saved.filter(s => ALL_SIGNALS.includes(s)));
  }

  function autoY(sim, names, selected, i0, i1, manual){
    if (manual) return { min: Math.min(manual.min, manual.max), max: Math.max(manual.min, manual.max) };
    let min = 0, max = 0, found = false;
    for (const name of names){
      if (!selected.has(name)) continue;
      const values = sim.signals[name];
      for (let i = i0; i <= i1; i++){
        const v = values[i];
        if (!isFinite(v)) continue;
        min = found ? Math.min(min, v) : Math.min(0, v);
        max = found ? Math.max(max, v) : Math.max(0, v);
        found = true;
      }
      const ss = sim.steady[name];
      if (ss !== null && isFinite(ss)){ min = Math.min(min, ss); max = Math.max(max, ss); }
    }
    if (!found || max - min < 1e-12){ min -= 1; max += 1; }
    const pad = (max - min) * 0.08;
    return { min: min - pad, max: max + pad };
  }

  function appendAxisSignal(title, signal, first){
    if (!first) title.appendChild(mk('tspan', { class: 'axis-separator' }, ', '));
    const plantOnly = plantExperiment();
    const base = plantOnly && signal === 'r' ? 'u'
      : signal === 'ym' ? 'y' : signal === 'ucmd' ? 'u' : signal;
    const subscript = plantOnly && (signal === 'r' || signal === 'y') ? 'P'
      : signal === 'ym' ? 'm' : signal === 'ucmd' ? 'cmd' : '';
    title.appendChild(mk('tspan', { class: `axis-signal sig-${signal}` }, base));
    if (subscript)
      title.appendChild(mk('tspan', { class: `axis-subscript sig-${signal}`, 'baseline-shift': 'sub' },
        subscript));
  }
  const plainSignalLabel = signal => plantExperiment()
    ? (signal === 'r' ? 'u_P' : signal === 'y' ? 'y_P' : signal)
    : (signal === 'ym' ? 'yₘ' : signal === 'ucmd' ? 'u_cmd' : signal);

  function render(){
    if (!Model.state.view.showTime) return;
    measure();
    const isSine = Model.state.input.type === 'sine';
    const isTrapezoid = Model.state.input.type === 'trapezoid';
    const supportsSecond = Model.state.input.type === 'step' || isTrapezoid;
    const plantOnly = plantExperiment();
    const saturated = !plantOnly && Model.state.saturation.enabled;
    experimentSel.value = plantOnly ? 'plant' : 'closed';
    timePanelTitle.textContent = t(plantOnly ? 'respPlant' : 'respLoop');
    timeOutputLabel.textContent = t(plantOnly ? 'plant' : 'timeTracking');
    signalRSymbol.innerHTML = plantOnly ? 'u<sub>P</sub>' : 'r';
    signalYSymbol.innerHTML = plantOnly ? 'y<sub>P</sub>' : 'y';
    secondValueSymbol.innerHTML = plantOnly ? 'u<sub>P,2</sub>' : 'r<sub>2</sub>';
    timeControlSignals.classList.toggle('hidden', plantOnly);
    inputSel.value = Model.state.input.type;
    const sim = simulate();
    lastT = sim.T;
    const selected = selectedSignals();

    signalChecks.forEach(chk => {
      const available = !plantOnly || chk.dataset.timeSignal === 'r' || chk.dataset.timeSignal === 'y';
      chk.closest('label').classList.toggle('hidden', !available);
      if (chk.dataset.timeSignal === 'u') chk.disabled = !saturated;
      chk.checked = selected.has(chk.dataset.timeSignal);
    });
    impulseOption.disabled = saturated;
    impulseOption.title = saturated ? t('impulseSatDisabled') : '';
    document.getElementById('time-u-label').title = saturated ? '' : t('timeUSame');
    const timeIssue = sim.diverged
      ? t('timeDiverged')
      : (sim.delayResolved === false ? t('timeDelayResolution') : '');
    timeWarning.classList.toggle('hidden', !timeIssue);
    timeWarning.textContent = timeIssue;
    winWrap.classList.toggle('hidden', !isSine);
    riseWrap.classList.toggle('hidden', !isTrapezoid);
    secondEnableWrap.classList.toggle('hidden', !supportsSecond);
    secondStepOptions.classList.toggle('hidden', !supportsSecond || !Model.state.input.secondEnabled);
    secondEnabled.checked = !!Model.state.input.secondEnabled;
    transWrap.classList.toggle('hidden', !isSine || saturated || (Model.state.delay > 0 && !plantOnly));
    transChk.disabled = sim.res;
    transChk.checked = sim.res ? true : Model.state.view.showTransient;
    if (document.activeElement !== winNum) winNum.value = String(Number(sim.wIn.toPrecision(3)));
    if (document.activeElement !== riseInput)
      riseInput.value = String(Number(Model.state.input.riseTime.toPrecision(6)));
    if (document.activeElement !== amplitudeInput)
      amplitudeInput.value = String(Number(Model.state.input.amplitude.toPrecision(8)));
    if (document.activeElement !== secondTimeInput)
      secondTimeInput.value = String(Number(Model.state.input.secondTime.toPrecision(8)));
    if (document.activeElement !== secondValueInput)
      secondValueInput.value = String(Number(Model.state.input.secondValue.toPrecision(8)));
    if (document.activeElement !== tInput) tInput.value = String(Number(sim.T.toPrecision(3)));
    tAutoChk.checked = Model.state.view.timeT === null;

    svg.innerHTML = '';
    boxEl = null;
    const frag = document.createDocumentFragment();
    const plotW = W - ML - MR;
    const geo = geometry(selected), layouts = geo.plots, plotKeys = geo.keys;

    if (!plotKeys.length){
      vc = null;
      frag.appendChild(mk('text', { class: 'time-empty', x: W / 2, y: H / 2, 'text-anchor': 'middle' },
        t('timeSelectSignal')));
      svg.appendChild(frag);
      return;
    }

    const xw = Model.state.view.timeXWin;
    let tv0 = 0, tv1 = sim.T;
    if (xw){
      tv0 = Math.max(0, Math.min(xw.min, xw.max));
      tv1 = Math.min(sim.T, Math.max(xw.min, xw.max));
      if (tv1 - tv0 < sim.T * 1e-6){ tv0 = 0; tv1 = sim.T; }
    }
    const N = sim.t.length;
    let i0 = 0, i1 = N - 1;
    while (i0 < N - 1 && sim.t[i0 + 1] < tv0) i0++;
    while (i1 > 0 && sim.t[i1 - 1] > tv1) i1--;
    const stride = Math.max(1, Math.ceil((i1 - i0 + 1) / DRAW_PTS));

    for (const key of plotKeys){
      const p = layouts[key];
      const yr = autoY(sim, GROUPS[key], selected, i0, i1, Model.state.view[p.winKey]);
      p.yMin = yr.min; p.yMax = yr.max;
      p.Y = v => p.top + p.height - ((v - p.yMin) / (p.yMax - p.yMin)) * p.height;
    }
    const X = tv => ML + ((tv - tv0) / (tv1 - tv0)) * plotW;
    const lastPlot = layouts[plotKeys[plotKeys.length - 1]];
    const bottom = lastPlot.top + lastPlot.height;
    vc = { tv0, tv1, plotW, plots: layouts, keys: plotKeys, bottom };

    const defs = mk('defs', {});
    for (const key of plotKeys){
      const p = layouts[key], cp = mk('clipPath', { id: `time-clip-${key}` });
      cp.appendChild(mk('rect', { x: ML, y: p.top, width: plotW, height: p.height }));
      defs.appendChild(cp);
    }
    frag.appendChild(defs);

    const tStep = niceStep((tv1 - tv0) / 6);
    for (const key of plotKeys){
      const p = layouts[key];
      for (let tv = Math.ceil(tv0 / tStep) * tStep; tv <= tv1 + 1e-9; tv += tStep)
        frag.appendChild(mk('line', { class: 'gridline', x1: X(tv), y1: p.top, x2: X(tv), y2: p.top + p.height }));
      const yStep = niceStep((p.yMax - p.yMin) / 4);
      for (let v = Math.ceil(p.yMin / yStep) * yStep; v <= p.yMax + 1e-9; v += yStep){
        const vv = Math.abs(v) < 1e-12 ? 0 : v;
        frag.appendChild(mk('line', { class: 'gridline', x1: ML, y1: p.Y(vv), x2: W - MR, y2: p.Y(vv) }));
        frag.appendChild(mk('text', { class: 'tick', x: ML - 5, y: p.Y(vv) + 3, 'text-anchor': 'end' },
          disp(String(Number(vv.toPrecision(3))))));
      }
      const y0 = 0 >= p.yMin && 0 <= p.yMax ? p.Y(0) : p.top + p.height;
      p.y0 = y0;
      frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: y0, x2: W - MR, y2: y0 }));
      frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: p.top, x2: ML, y2: p.top + p.height }));
      const axisTitle = mk('text', { class: 'axis-title time-axis-title', x: 24, y: p.top + p.height / 2,
        'text-anchor': 'middle', transform: `rotate(-90 24 ${p.top + p.height / 2})` });
      GROUPS[key].filter(name => selected.has(name))
        .forEach((name, i) => appendAxisSignal(axisTitle, name, i === 0));
      frag.appendChild(axisTitle);
      frag.appendChild(mk('rect', { class: 'ydrag', x: 0, y: p.top, width: ML - 2, height: p.height }));
    }
    for (let tv = Math.ceil(tv0 / tStep) * tStep; tv <= tv1 + 1e-9; tv += tStep)
      frag.appendChild(mk('text', { class: 'tick', x: X(tv), y: bottom + 13, 'text-anchor': 'middle' },
        disp(String(Number(tv.toFixed(6))))));
    frag.appendChild(mk('text', { class: 'axis-name', x: W - 8, y: bottom + 13, 'text-anchor': 'end' }, 't [s]'));

    const drawGroup = (key, names) => {
      const p = layouts[key], g = mk('g', { 'clip-path': `url(#time-clip-${key})` });
      if (key === 'control' && saturated){
        for (const limit of [Model.state.saturation.min, Model.state.saturation.max]){
          g.appendChild(mk('line', { class: 'saturation-limit', x1: ML, y1: p.Y(limit),
            x2: W - MR, y2: p.Y(limit) }));
          g.appendChild(mk('text', { class: 'saturation-limit-label', x: W - MR - 4,
            y: p.Y(limit) - 3, 'text-anchor': 'end' }, fmt3(limit)));
        }
      }
      if (key === 'output' && selected.has('y') && sim.isSine && !sim.res && sim.hMag !== null && sim.tTrans < tv1){
        const x1 = X(Math.max(sim.steadyOnly ? 0 : sim.tTrans, tv0));
        g.appendChild(mk('line', { class: 'envelope', x1, y1: p.Y(sim.hMag), x2: W - MR, y2: p.Y(sim.hMag) }));
        g.appendChild(mk('line', { class: 'envelope', x1, y1: p.Y(-sim.hMag), x2: W - MR, y2: p.Y(-sim.hMag) }));
      }
      if (key === 'output' && selected.has('y') && sim.steady.y !== null)
        g.appendChild(mk('line', { class: 'steady', x1: ML, y1: p.Y(sim.steady.y), x2: W - MR, y2: p.Y(sim.steady.y) }));
      for (const name of names){
        if (!selected.has(name)) continue;
        let d = '', pen = false;
        for (let i = i0; i <= i1; i += stride){
          const v = sim.signals[name][i];
          if (!isFinite(v)){ pen = false; continue; }
          d += (pen ? 'L' : 'M') + X(sim.t[i]).toFixed(2) + ',' + p.Y(v).toFixed(2);
          pen = true;
        }
        g.appendChild(mk('path', { class: `time-curve sig-${name}`, d }));
      }
      frag.appendChild(g);

      if (sim.type === 'impulse'){
        let offset = 0;
        for (const name of names){
          const D = sim.direct[name];
          if (!selected.has(name) || !(Math.abs(D) > 1e-12)) continue;
          const delayed = name === 'y' || name === 'ym';
          const t0 = delayed ? Model.state.delay : 0;
          if (t0 < tv0 - 1e-12 || t0 > tv1 + 1e-12) continue;
          const x0 = X(t0) + offset;
          offset += 7;
          const yBase = Math.max(p.top, Math.min(p.top + p.height, p.y0));
          const up = D > 0;
          const size = Math.min(38, p.height * 0.55);
          const yEnd = up ? Math.max(p.top + 4, yBase - size) : Math.min(p.top + p.height - 4, yBase + size);
          frag.appendChild(mk('line', { class: `dirac sig-${name}`, x1: x0, y1: yBase, x2: x0, y2: yEnd }));
          frag.appendChild(mk('path', { class: `dirac-head sig-${name}`, d: `M${x0},${yEnd} l-4,${up ? 9 : -9} h8 Z` }));
          frag.appendChild(mk('text', { class: `dirac-label sig-${name}`, x: x0 + 6, y: yEnd + (up ? 10 : -4) },
            `${plainSignalLabel(name)}: ${fmt3(D)}`));
        }
      }
    };
    for (const key of plotKeys) drawGroup(key, GROUPS[key]);

    frag.appendChild(mk('rect', { class: 'wdrag', x: ML, y: bottom + 2, width: plotW, height: MB - 2 }));
    svg.appendChild(frag);
  }

  // ---------- navigation partagée en X, indépendante en Y ----------
  function plotAt(x, y){
    if (!vc || x < ML || x > W - MR) return null;
    for (const key of vc.keys){
      const p = vc.plots[key];
      if (y >= p.top && y <= p.top + p.height) return p;
    }
    return null;
  }
  const tAt = x => vc.tv0 + (x - ML) / vc.plotW * (vc.tv1 - vc.tv0);
  const yAt = (y, p) => p.yMax - (y - p.top) / p.height * (p.yMax - p.yMin);

  function updateBox(x0, y0, x1, y1, p){
    const yy = Math.max(p.top, Math.min(p.top + p.height, y1));
    const w = Math.abs(x1 - x0), h = Math.abs(yy - y0);
    let attrs;
    if (w >= BAND && h < BAND) attrs = { x: Math.min(x0, x1), y: p.top, width: w, height: p.height };
    else if (h >= BAND && w < BAND) attrs = { x: ML, y: Math.min(y0, yy), width: vc.plotW, height: h };
    else attrs = { x: Math.min(x0, x1), y: Math.min(y0, yy), width: Math.max(w, 1), height: Math.max(h, 1) };
    if (!boxEl){ boxEl = mk('rect', { class: 'zoombox' }); svg.appendChild(boxEl); }
    for (const k in attrs) boxEl.setAttribute(k, attrs[k]);
  }

  svg.addEventListener('pointerdown', ev => {
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    measure();
    if (!vc) return;
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const bottom = vc.bottom;
    let p = plotAt(Math.max(x, ML), y);
    if (y > bottom && x >= ML && x <= W - MR)
      drag = { mode: 'taxis', x0: ev.clientX, T0: lastT };
    else if (x < ML && p)
      drag = { mode: 'yaxis', key: p.key, y0: ev.clientY, w0: { min: p.yMin, max: p.yMax } };
    else if (p){
      if (ev.button === 0) drag = { mode: 'box', key: p.key, x0: x, y0: y, x1: x, y1: y };
      else drag = { mode: 'pan', key: p.key, px: ev.clientX, py: ev.clientY,
        xw0: { min: vc.tv0, max: vc.tv1 }, yw0: { min: p.yMin, max: p.yMax } };
    } else return;
    ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (_) {}
  });

  svg.addEventListener('pointermove', ev => {
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    const p = drag.key ? vc.plots[drag.key] : null;
    if (drag.mode === 'taxis'){
      const f = Math.exp(-(ev.clientX - drag.x0) / 200);
      Model.setView({ timeT: Math.min(Math.max(drag.T0 * f, 1e-3), 1e5), timeXWin: null });
    } else if (drag.mode === 'yaxis'){
      const f = Math.exp((ev.clientY - drag.y0) / 200);
      const c = (drag.w0.min + drag.w0.max) / 2;
      Model.setView({ [p.winKey]: { min: c + (drag.w0.min - c) * f, max: c + (drag.w0.max - c) * f } });
    } else if (drag.mode === 'pan'){
      const dT = -(ev.clientX - drag.px) / vc.plotW * (drag.xw0.max - drag.xw0.min);
      const span = drag.xw0.max - drag.xw0.min;
      const t0 = Math.max(0, Math.min(drag.xw0.min + dT, lastT - span));
      const dY = (ev.clientY - drag.py) / p.height * (drag.yw0.max - drag.yw0.min);
      Model.setView({ timeXWin: { min: t0, max: t0 + span },
        [p.winKey]: { min: drag.yw0.min + dY, max: drag.yw0.max + dY } });
    } else if (drag.mode === 'box'){
      drag.x1 = ev.clientX - r.left;
      drag.y1 = Math.max(p.top, Math.min(p.top + p.height, ev.clientY - r.top));
      updateBox(drag.x0, drag.y0, drag.x1, drag.y1, p);
    }
  });

  svg.addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.mode === 'box'){
      const p = vc.plots[drag.key];
      const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
      if (boxEl){ boxEl.remove(); boxEl = null; }
      if (w >= 8 || h >= 8){
        const patch = {};
        if (w >= BAND) patch.timeXWin = { min: tAt(Math.min(drag.x0, drag.x1)), max: tAt(Math.max(drag.x0, drag.x1)) };
        if (h >= BAND) patch[p.winKey] = { min: yAt(Math.max(drag.y0, drag.y1), p), max: yAt(Math.min(drag.y0, drag.y1), p) };
        if (Object.keys(patch).length) Model.setView(patch);
      }
    }
    drag = null;
  });

  svg.addEventListener('wheel', ev => {
    if (!vc) return;
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const p = plotAt(x, y);
    if (!p) return;
    ev.preventDefault();
    const f = Math.exp(ev.deltaY * 0.001);
    const tc = tAt(x), yc = yAt(y, p);
    let t0 = tc - (tc - vc.tv0) * f, t1 = tc + (vc.tv1 - tc) * f;
    t0 = Math.max(0, t0); t1 = Math.min(lastT, t1);
    if (t1 - t0 < lastT * 1e-6){ t0 = vc.tv0; t1 = vc.tv1; }
    Model.setView({ timeXWin: { min: t0, max: t1 },
      [p.winKey]: { min: yc - (yc - p.yMin) * f, max: yc + (p.yMax - yc) * f } });
  }, { passive: false });

  svg.addEventListener('dblclick', ev => {
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const bottom = vc ? vc.bottom : H - MB;
    const p = plotAt(Math.max(x, ML), y);
    if (y > bottom && x >= ML) Model.setView({ timeT: null, timeXWin: null });
    else if (x < ML && p) Model.setView({ [p.winKey]: null });
    else if (p) Model.setView({ timeXWin: null, [p.winKey]: null });
  });

  function measure(){ W = body.clientWidth || W; H = body.clientHeight || H; }
  function resize(){ measure(); render(); }

  return { render, resize, simulate, refreshLang };
})();
