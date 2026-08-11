'use strict';
/* Réponse temporelle (cahier §5, jalons J3 + J4).
   Calcul numérique, pas symbolique : (pôles, zéros, K) → polynômes → forme
   d'état (canonique commandable) → intégration RK4 à pas fixe ; dt dérivé du
   mode le plus rapide ; pas de fractions partielles.
   T auto élargi (voir cahier) ; T manuel : champ + case « T auto », ou glisser
   l'axe t (double-clic = retour auto).
   Mode sinusoïdal (J4) : u(t) en fantôme, enveloppe ±|H(jωin)| sur le régime
   permanent, case « transitoire » ; résonance forcée exacte conforme §5.
   Navigation du tracé (à la Plotly, sans Plotly) : molette = zoom centré
   curseur ; pan au bouton droit/molette ; glisser gauche = bande de sélection
   (horizontale → zoom X, verticale → zoom Y, diagonale → fenêtre) ; glisser
   l'axe Y = échelle verticale ; double-clic dans le tracé = vue automatique. */
const TimeResp = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('time-svg');
  const body = document.getElementById('time-body');

  let W = 400, H = 220;
  const ML = 66, MR = 14, MT = 12, MB = 26;   // ML : place pour le titre d'axe
  const MAX_STEPS = 20000, DRAW_PTS = 1500, BAND = 12;

  let drag = null;        // {mode:'taxis'|'yaxis'|'pan'|'box', ...}
  let boxEl = null;       // rectangle de sélection en cours
  let lastT = 10;
  let vc = null;          // cache de vue du dernier rendu {tv0,tv1,yMin,yMax,plotW,plotH}

  function mk(name, attrs, text){
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const disp = s => String(s).replace(/-/g, '−');
  const fmt3 = v => disp(String(Number(v.toPrecision(3))));
  // 4 chiffres significatifs max, notation scientifique si très petit/grand
  const SUPC = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
                 '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const supStr = s => String(s).split('').map(ch => SUPC[ch] || ch).join('');
  function fmt4(v){
    if (!isFinite(v)) return '∞';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e4)){
      const [m, e] = v.toExponential(3).split('e');
      return disp(`${Number(m)}·10${supStr(Number(e))}`);
    }
    return disp(String(Number(v.toPrecision(4))));
  }

  function niceStep(target){
    const p = Math.pow(10, Math.floor(Math.log10(target)));
    const m = target / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  // ---------- contrôles de l'en-tête ----------
  const inputSel = document.getElementById('input-type');
  inputSel.addEventListener('change', () => Model.setInput({ type: inputSel.value }));

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

  // infobulles réécrites au changement de langue (§8)
  function refreshLang(){
    tInput.title = t('tHint');
    tAutoChk.closest('label').title = t('tAutoHint');
    winNum.title = t('winHint');
  }
  refreshLang();

  const transWrap = document.getElementById('trans-wrap');
  const transChk = document.getElementById('show-trans');
  transChk.addEventListener('change', () => Model.setView({ showTransient: transChk.checked }));

  // ---------- durée de simulation automatique ----------
  function autoT(){
    const poles = Model.state.poles;
    const cand = [];
    const stable = poles.filter(e => e.sigma < 0);
    const tTrans = stable.length ? 5 / Math.min(...stable.map(e => -e.sigma)) : 0;
    if (Model.state.input.type === 'sine'){
      cand.push(tTrans + 4 * 2 * Math.PI / Math.max(Model.state.input.omegaIn, 1e-6));
    } else {
      if (stable.length) cand.push(tTrans);
      const damped = poles.filter(e => e.type === 'pair' && e.sigma < 0 && e.omega > 0);
      if (damped.length) cand.push(3 * 2 * Math.PI / Math.min(...damped.map(e => e.omega)));
    }
    const axisOsc = poles.filter(e => e.type === 'pair' && e.sigma === 0 && e.omega > 0);
    if (axisOsc.length) cand.push(4 * 2 * Math.PI / Math.min(...axisOsc.map(e => e.omega)));
    if (poles.some(e => e.type === 'real' && e.sigma === 0)) cand.push(10);
    // le retard repousse toute la réponse : la fenêtre doit l'englober (§1 bis)
    const T = (cand.length ? Math.max(...cand) : 10) + Model.state.delay;
    return Math.min(Math.max(T, 1e-3), 1e5);
  }

  function exactResonance(){
    if (Model.state.input.type !== 'sine') return false;
    const w = Model.state.input.omegaIn;
    return Model.state.poles.some(e => e.type === 'pair' && e.sigma === 0 &&
                                       Math.abs(e.omega - w) < 1e-9 * Math.max(1, w));
  }

  // ---------- simulation (résolution complète, la vue décime au rendu) ----------
  function simulate(){
    const { num, den } = Model.polys();
    const K = Model.state.K;
    const bAll = num.map(v => v * K);
    const a = den;
    const n = a.length - 1;
    const type = Model.state.input.type;
    const isSine = type === 'sine';
    const wIn = Model.state.input.omegaIn;
    const T = Model.state.view.timeT !== null ? Model.state.view.timeT : autoT();
    const res = exactResonance();

    let D = 0, b = bAll;
    if (bAll.length === a.length){
      D = bAll[0];
      b = bAll.slice(1).map((v, i) => v - D * a[i + 1]);
      if (!b.length) b = [0];
    }

    const d0 = a[a.length - 1], n0 = bAll[bAll.length - 1];
    const yss = (type === 'step' && Math.abs(d0) > 1e-12) ? n0 / d0 : null;

    let hMag = null, hPhi = null;
    if (isSine){
      const h = Model.evalHjw(wIn);
      if (isFinite(h.re) && isFinite(h.im)){ hMag = h.mag; hPhi = Math.atan2(h.im, h.re); }
    }
    const stable = Model.state.poles.filter(e => e.sigma < 0);
    const tTrans = stable.length ? Math.min(T, 5 / Math.min(...stable.map(e => -e.sigma))) : 0;

    const steadyOnly = isSine && !res && !Model.state.view.showTransient && hMag !== null;
    const base = { T, D, yss, type, isSine, wIn, hMag, hPhi, tTrans, res, steadyOnly };

    if (steadyOnly){
      const t = [], y = [];
      for (let i = 0; i <= 3000; i++){
        const tv = T * i / 3000;
        t.push(tv); y.push(hMag * Math.sin(wIn * tv + hPhi));
      }
      return { ...base, t, y, tTrans: 0 };
    }

    const uOf = isSine ? (tv => Math.sin(wIn * tv)) : (type === 'step' ? (() => 1) : (() => 0));

    if (n === 0){
      const t = [], y = [];
      for (let i = 0; i <= 800; i++){
        const tv = T * i / 800;
        t.push(tv); y.push(D * uOf(tv));
      }
      return { ...base, t, y: retarde(t, y) };
    }

    const alpha = a.slice(1).reverse();
    const c = new Array(n).fill(0);
    b.forEach((v, i) => { c[b.length - 1 - i] = v; });

    const wFast = Math.max(1e-6, isSine ? wIn : 0, ...Model.state.poles.map(e =>
      e.type === 'pair' ? Math.hypot(e.sigma, e.omega) : Math.abs(e.sigma)));
    let dt = Math.min(1 / (25 * wFast), T / 600);
    const steps = Math.min(MAX_STEPS, Math.max(400, Math.ceil(T / dt)));
    dt = T / steps;

    const x = new Array(n).fill(0);
    if (type === 'impulse') x[n - 1] = 1;

    const deriv = (tv, xs, out) => {
      for (let i = 0; i < n - 1; i++) out[i] = xs[i + 1];
      let s = uOf(tv);
      for (let i = 0; i < n; i++) s -= alpha[i] * xs[i];
      out[n - 1] = s;
    };
    const yOf = (tv, xs) => {
      let s = D * uOf(tv);
      for (let i = 0; i < n; i++) s += c[i] * xs[i];
      return s;
    };

    const t = [0], y = [yOf(0, x)];
    const k1 = new Array(n), k2 = new Array(n), k3 = new Array(n), k4 = new Array(n),
          tmp = new Array(n);
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
      t.push(s * dt);
      y.push(yOf(s * dt, x));
    }
    return { ...base, t, y: retarde(t, y) };
  }

  // Retard pur : la partie rationnelle et le retard sont deux blocs LTI en
  // série, donc ils commutent — on intègre comme d'habitude et on décale la
  // sortie de T. Ni tampon d'historique, ni intégration à retard (§1 bis).
  // Le régime permanent sinusoïdal n'a pas besoin de ce décalage : son
  // déphasage vient de evalHjw, qui porte déjà le retard.
  function retarde(t, y){
    const T0 = Model.state.delay;
    if (!(T0 > 0) || t.length < 2) return y;
    const k = Math.round(T0 / (t[1] - t[0]));
    if (k <= 0) return y;
    const out = new Array(y.length);
    for (let i = 0; i < y.length; i++) out[i] = i < k ? 0 : y[i - k];
    return out;
  }

  // ---------- rendu ----------
  function render(){
    if (!Model.state.view.showTime) return;
    measure();                       // dimensions relues à chaque rendu
    const isSine = Model.state.input.type === 'sine';
    inputSel.value = Model.state.input.type;
    const sim = simulate();
    lastT = sim.T;

    winWrap.classList.toggle('hidden', !isSine);
    transWrap.classList.toggle('hidden', !isSine);
    transChk.disabled = sim.res;
    transChk.checked = sim.res ? true : Model.state.view.showTransient;
    if (document.activeElement !== winNum)
      winNum.value = String(Number(sim.wIn.toPrecision(3)));
    if (document.activeElement !== tInput)
      tInput.value = String(Number(sim.T.toPrecision(3)));
    tAutoChk.checked = Model.state.view.timeT === null;

    svg.innerHTML = '';
    boxEl = null;
    const frag = document.createDocumentFragment();
    const plotW = W - ML - MR, plotH = H - MT - MB;

    // fenêtre de vue X (bornée au domaine simulé [0, T])
    const xw = Model.state.view.timeXWin;
    let tv0 = 0, tv1 = sim.T;
    if (xw){
      tv0 = Math.max(0, Math.min(xw.min, xw.max));
      tv1 = Math.min(sim.T, Math.max(xw.min, xw.max));
      if (tv1 - tv0 < sim.T * 1e-6){ tv0 = 0; tv1 = sim.T; }
    }

    // échantillons visibles
    const first = [], N = sim.t.length;
    let i0 = 0, i1 = N - 1;
    while (i0 < N - 1 && sim.t[i0 + 1] < tv0) i0++;
    while (i1 > 0 && sim.t[i1 - 1] > tv1) i1--;
    const stride = Math.max(1, Math.ceil((i1 - i0 + 1) / DRAW_PTS));

    // fenêtre de vue Y (auto : ajustée à la portion visible)
    let yMin, yMax;
    const yw = Model.state.view.timeYWin;
    if (yw){
      yMin = Math.min(yw.min, yw.max); yMax = Math.max(yw.min, yw.max);
    } else {
      yMin = 0; yMax = 0;
      for (let i = i0; i <= i1; i++){
        if (sim.y[i] < yMin) yMin = sim.y[i];
        if (sim.y[i] > yMax) yMax = sim.y[i];
      }
      if (sim.yss !== null){ yMin = Math.min(yMin, sim.yss); yMax = Math.max(yMax, sim.yss); }
      if (sim.isSine){ yMin = Math.min(yMin, -1); yMax = Math.max(yMax, 1); }
      if (sim.isSine && !sim.res && sim.hMag !== null){
        yMin = Math.min(yMin, -sim.hMag); yMax = Math.max(yMax, sim.hMag);
      }
      if (yMax - yMin < 1e-12){ yMax += 1; yMin -= 1; }
      const pad = (yMax - yMin) * 0.08;
      yMin -= pad; yMax += pad;
    }

    const X = tv => ML + ((tv - tv0) / (tv1 - tv0)) * plotW;
    const Y = v => MT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    vc = { tv0, tv1, yMin, yMax, plotW, plotH };

    // découpe : les tracés restent dans le cadre quand on zoome
    const defs = mk('defs', {});
    const cp = mk('clipPath', { id: 'time-clip' });
    cp.appendChild(mk('rect', { x: ML, y: MT, width: plotW, height: plotH }));
    defs.appendChild(cp);
    frag.appendChild(defs);

    // grille + graduations
    const tStep = niceStep((tv1 - tv0) / 6);
    for (let tv = Math.ceil(tv0 / tStep) * tStep; tv <= tv1 + 1e-9; tv += tStep){
      frag.appendChild(mk('line', { class: 'gridline', x1: X(tv), y1: MT, x2: X(tv), y2: MT + plotH }));
      frag.appendChild(mk('text', { class: 'tick', x: X(tv), y: MT + plotH + 12, 'text-anchor': 'middle' },
                          disp(String(Number(tv.toFixed(6))))));
    }
    const yStep = niceStep((yMax - yMin) / 4);
    for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax + 1e-9; v += yStep){
      const vv = Math.abs(v) < 1e-12 ? 0 : v;
      frag.appendChild(mk('line', { class: 'gridline', x1: ML, y1: Y(vv), x2: W - MR, y2: Y(vv) }));
      frag.appendChild(mk('text', { class: 'tick', x: ML - 5, y: Y(vv) + 3, 'text-anchor': 'end' },
                          disp(String(Number(vv.toPrecision(3))))));
    }

    // axes
    const y0v = (0 >= yMin && 0 <= yMax) ? Y(0) : MT + plotH;
    frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: y0v, x2: W - MR, y2: y0v }));
    frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: MT, x2: ML, y2: MT + plotH }));
    frag.appendChild(mk('text', { class: 'axis-title', x: 26, y: MT + plotH / 2, 'text-anchor': 'middle',
                                  transform: `rotate(-90 26 ${MT + plotH / 2})` }, 'y(t)'));
    frag.appendChild(mk('text', { class: 'axis-name', x: W - 8, y: MT + plotH + 12,
                                  'text-anchor': 'end' }, 't [s]'));

    // groupe découpé : fantôme, enveloppe, asymptote, courbe
    const g = mk('g', { 'clip-path': 'url(#time-clip)' });

    if (sim.isSine){
      let dg = '';
      for (let i = 0; i <= 600; i++){
        const tv = tv0 + (tv1 - tv0) * i / 600;
        dg += (i === 0 ? 'M' : 'L') + X(tv).toFixed(2) + ',' + Y(Math.sin(sim.wIn * tv)).toFixed(2);
      }
      g.appendChild(mk('path', { class: 'ghost', d: dg }));
    }

    if (sim.isSine && !sim.res && sim.hMag !== null && sim.tTrans < tv1){
      const x1 = X(Math.max(sim.steadyOnly ? 0 : sim.tTrans, tv0));
      g.appendChild(mk('line', { class: 'envelope', x1, y1: Y(sim.hMag), x2: W - MR, y2: Y(sim.hMag) }));
      g.appendChild(mk('line', { class: 'envelope', x1, y1: Y(-sim.hMag), x2: W - MR, y2: Y(-sim.hMag) }));
      const envLbl = mk('text', { class: 'env-label', x: W - MR - 4, y: Y(sim.hMag) - 4,
                                  'text-anchor': 'end' });
      envLbl.appendChild(document.createTextNode('±|H(jω'));
      envLbl.appendChild(mk('tspan', { dy: 2.5, 'font-size': '9px' }, 'in'));
      envLbl.appendChild(mk('tspan', { dy: -2.5 }, `)| = ${fmt4(sim.hMag)}`));
      g.appendChild(envLbl);
    }

    if (sim.yss !== null)
      g.appendChild(mk('line', { class: 'steady', x1: ML, y1: Y(sim.yss), x2: W - MR, y2: Y(sim.yss) }));

    let d = '', pen = false;
    for (let i = i0; i <= i1; i += stride){
      d += (pen ? 'L' : 'M') + X(sim.t[i]).toFixed(2) + ',' + Y(sim.y[i]).toFixed(2);
      pen = true;
    }
    g.appendChild(mk('path', { class: 'time-curve', d }));
    frag.appendChild(g);

    // impulsion avec terme direct : flèche δ de taille fixe, étiquette « aire »
    if (sim.type === 'impulse' && Math.abs(sim.D) > 1e-12 && tv0 <= Model.state.delay + 1e-12){
      const x0 = X(Model.state.delay);        // le Dirac part avec le retard
      const yBase = Math.max(MT, Math.min(MT + plotH, y0v));
      const up = sim.D > 0;
      const yEnd = up ? Math.max(MT + 4, yBase - 42) : Math.min(MT + plotH - 4, yBase + 42);
      frag.appendChild(mk('line', { class: 'dirac', x1: x0, y1: yBase, x2: x0, y2: yEnd }));
      frag.appendChild(mk('path', { class: 'dirac-head',
        d: `M${x0},${yEnd} l-4,${up ? 9 : -9} h8 Z` }));
      frag.appendChild(mk('text', { class: 'dirac-label', x: x0 + 8, y: yEnd + (up ? 10 : -4) },
                          `Aire = ${fmt3(sim.D)}`));
    }

    // poignées d'axes : t (échelle de T) et Y (échelle locale)
    frag.appendChild(mk('rect', { class: 'wdrag', x: ML, y: MT + plotH + 2,
                                  width: plotW, height: MB - 2 }));
    frag.appendChild(mk('rect', { class: 'ydrag', x: 0, y: MT, width: ML - 2, height: plotH }));

    svg.appendChild(frag);
  }

  // ---------- navigation ----------
  const inPlot = (x, y) => x >= ML && x <= W - MR && y >= MT && y <= H - MB;
  const tAt = x => vc.tv0 + (x - ML) / vc.plotW * (vc.tv1 - vc.tv0);
  const yAt = y => vc.yMax - (y - MT) / vc.plotH * (vc.yMax - vc.yMin);

  function updateBox(x0, y0, x1, y1){
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
    let attrs;
    if (w >= BAND && h < BAND)
      attrs = { x: Math.min(x0, x1), y: MT, width: w, height: vc.plotH };
    else if (h >= BAND && w < BAND)
      attrs = { x: ML, y: Math.min(y0, y1), width: vc.plotW, height: h };
    else
      attrs = { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.max(w, 1), height: Math.max(h, 1) };
    if (!boxEl){ boxEl = mk('rect', { class: 'zoombox' }); svg.appendChild(boxEl); }
    for (const k in attrs) boxEl.setAttribute(k, attrs[k]);
  }

  svg.addEventListener('pointerdown', ev => {
    if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
    measure();                       // zones de saisie toujours calées sur le tracé
    if (!vc) return;
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (y > H - MB && x >= ML && x <= W - MR){
      drag = { mode: 'taxis', x0: ev.clientX, T0: lastT };
    } else if (x < ML && y >= MT && y <= MT + vc.plotH){
      drag = { mode: 'yaxis', y0: ev.clientY, w0: { min: vc.yMin, max: vc.yMax } };
    } else if (inPlot(x, y)){
      if (ev.button === 0) drag = { mode: 'box', x0: x, y0: y, x1: x, y1: y };
      else drag = { mode: 'pan', px: ev.clientX, py: ev.clientY,
                    xw0: { min: vc.tv0, max: vc.tv1 }, yw0: { min: vc.yMin, max: vc.yMax } };
    } else return;
    ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (_) {}
  });

  svg.addEventListener('pointermove', ev => {
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    if (drag.mode === 'taxis'){
      const f = Math.exp(-(ev.clientX - drag.x0) / 200);
      Model.setView({ timeT: Math.min(Math.max(drag.T0 * f, 1e-3), 1e5), timeXWin: null });
    } else if (drag.mode === 'yaxis'){
      const f = Math.exp((ev.clientY - drag.y0) / 200);
      const c = (drag.w0.min + drag.w0.max) / 2;
      Model.setView({ timeYWin: { min: c + (drag.w0.min - c) * f, max: c + (drag.w0.max - c) * f } });
    } else if (drag.mode === 'pan'){
      const dT = -(ev.clientX - drag.px) / vc.plotW * (drag.xw0.max - drag.xw0.min);
      const span = drag.xw0.max - drag.xw0.min;
      let t0 = Math.max(0, Math.min(drag.xw0.min + dT, lastT - span));
      const dY = (ev.clientY - drag.py) / vc.plotH * (drag.yw0.max - drag.yw0.min);
      Model.setView({ timeXWin: { min: t0, max: t0 + span },
                      timeYWin: { min: drag.yw0.min + dY, max: drag.yw0.max + dY } });
    } else if (drag.mode === 'box'){
      drag.x1 = ev.clientX - r.left; drag.y1 = ev.clientY - r.top;
      updateBox(drag.x0, drag.y0, drag.x1, drag.y1);
    }
  });

  svg.addEventListener('pointerup', () => {
    if (!drag){ return; }
    if (drag.mode === 'box'){
      const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
      if (boxEl){ boxEl.remove(); boxEl = null; }
      if (w >= 8 || h >= 8){
        const patch = {};
        if (w >= BAND)
          patch.timeXWin = { min: tAt(Math.min(drag.x0, drag.x1)), max: tAt(Math.max(drag.x0, drag.x1)) };
        if (h >= BAND)
          patch.timeYWin = { min: yAt(Math.max(drag.y0, drag.y1)), max: yAt(Math.min(drag.y0, drag.y1)) };
        if (Object.keys(patch).length) Model.setView(patch);
      }
    }
    drag = null;
  });

  svg.addEventListener('wheel', ev => {
    if (!vc) return;
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (!inPlot(x, y)) return;
    ev.preventDefault();
    const f = Math.exp(ev.deltaY * 0.001);
    const tc = tAt(x), yc = yAt(y);
    let t0 = tc - (tc - vc.tv0) * f, t1 = tc + (vc.tv1 - tc) * f;
    t0 = Math.max(0, t0); t1 = Math.min(lastT, t1);
    if (t1 - t0 < lastT * 1e-6){ t0 = vc.tv0; t1 = vc.tv1; }
    Model.setView({
      timeXWin: { min: t0, max: t1 },
      timeYWin: { min: yc - (yc - vc.yMin) * f, max: yc + (vc.yMax - yc) * f }
    });
  }, { passive: false });

  svg.addEventListener('dblclick', ev => {
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (y > H - MB && x >= ML) Model.setView({ timeT: null, timeXWin: null });
    else if (x < ML) Model.setView({ timeYWin: null });
    else if (inPlot(x, y)) Model.setView({ timeXWin: null, timeYWin: null });
  });

  function measure(){
    W = body.clientWidth || W;
    H = body.clientHeight || H;
  }
  function resize(){ measure(); render(); }

  return { render, resize, simulate, refreshLang };
})();
