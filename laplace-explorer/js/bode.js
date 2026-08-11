'use strict';
/* Bode (cahier §6, jalon J2) : |H(jω)| et phase empilés, axe ω partagé,
   rang ω unifié avec le plan s (ω ≥ 0), lignes de référence −90°/−180°,
   hover readout (ω, |H|, φ).
   Options : case « dB » (module en 20·log₁₀|H|), case « phase déroulée »
   (décochée → repli ±180° avec coupures franches).
   Les pics écrêtés sortent du cadre (pas de plateau) via clip SVG.
   Glisser l'axe ω (marge basse) met à l'échelle le rang ω partagé — le plan s
   suit (synchronisation bidirectionnelle, point ouvert n° 4 tranché).
   Échelle ω linéaire en J2 (le toggle lin/log₁₀ arrive avec le 3D, jalon J5). */
const Bode = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('bode-svg');
  const body = document.getElementById('bode-pane');   // le panneau loge aussi le Nyquist

  let W = 400, H = 300;
  const ML = 66, MR = 14, MT = 10, MB = 26, GAP = 20;   // ML : place pour les titres d'axes
  const NPTS = 400;
  const RIB_H = 18, RIB_GAP = 6;    // ruban de contexte (échelle log seulement)

  let data = null;       // dernier calcul (réutilisé par les interactions)
  let axisDrag = null;   // glisser d'axe ou de marqueur : {kind, …}
  let ribFrozen = null;  // étendue du ruban figée le temps d'un geste

  function mk(name, attrs, text){
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const disp = s => String(s).replace(/-/g, '−');
  const fmt3 = v => isFinite(v) ? disp(String(Number(v.toPrecision(3)))) : '∞';

  // étiquette d'une décade : 0.01 … 1000 en clair, sinon 10^p
  const SUPB = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
                 '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function fmtDec(p){
    if (p >= -3 && p <= 4) return disp(String(Number(Math.pow(10, p).toPrecision(6))));
    return '10' + String(p).split('').map(c => SUPB[c] || c).join('');
  }

  function niceStep(target){
    const p = Math.pow(10, Math.floor(Math.log10(target)));
    const m = target / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  // ---------- options ----------
  const unwrapChk = document.getElementById('bode-unwrap');
  const phaseChk = document.getElementById('bode-phase');
  const logChk = document.getElementById('bode-log');
  const decWrap = document.getElementById('bode-dec-wrap');
  const decInput = document.getElementById('bode-dec');
  unwrapChk.addEventListener('change', () => Model.setView({ bodeUnwrap: unwrapChk.checked }));
  phaseChk.addEventListener('change', () => Model.setView({ bodeShowPhase: phaseChk.checked }));
  logChk.addEventListener('change', () => Model.setView({ logScale: logChk.checked }));
  const refreshLang = () => {
    decInput.title = t('bodeDecHint');
    logChk.closest('label').title = t('logScaleHint');
  };
  refreshLang();
  decInput.addEventListener('change', () =>
    Model.setView({ omegaLogDecades: Number(decInput.value) }));

  // ---------- axe ω : mapping partagé rendu ↔ interactions ----------
  function xOf(w){
    if (!data) return ML;
    const plotW = W - ML - MR;
    if (!data.log) return ML + Math.min(w, data.wMax) / data.wMax * plotW;
    const ww = Math.max(w, data.wMin);
    return ML + (Math.log10(ww) - Math.log10(data.wMin)) / data.dec * plotW;
  }
  function wAt(x){
    if (!data) return 0;
    const plotW = W - ML - MR;
    const f = (x - ML) / plotW;
    return data.log ? data.wMin * Math.pow(10, f * data.dec) : f * data.wMax;
  }
  // index de l'échantillon le plus proche d'une pulsation
  function idxOf(w){
    if (!data) return 0;
    const f = data.log
      ? (Math.log10(Math.max(w, data.wMin)) - Math.log10(data.wMin)) / data.dec
      : w / data.wMax;
    return Math.max(0, Math.min(NPTS - 1, Math.round(f * (NPTS - 1))));
  }

  // ---------- ruban de contexte (échelle log) ----------
  // Le nombre de décades disait la largeur de la fenêtre, jamais sa position :
  // pour changer de décade il fallait deviner qu'on peut glisser un axe. Le
  // ruban montre tout le spectre du système, la fenêtre courante dedans, et
  // les pulsations propres |p| et |z| — on voit d'un coup si on regarde au
  // bon endroit. Masqué en linéaire (pas de décades) et si le panneau est trop
  // court pour lui céder 24 px sans écraser les tracés.
  function ribOn(){ return Model.state.view.logScale && H >= 190; }

  // pulsations propres, doublons de conjugaison écartés (même module)
  function rootMags(){
    const out = [], seen = new Set();
    for (const r of Model.rootPoints()){
      const m = Math.hypot(r.sigma, r.omega);
      if (!(m > 1e-12) || !isFinite(m)) continue;      // racine en 0 : hors axe log
      const k = r.kind + m.toPrecision(6);
      if (seen.has(k)) continue;
      seen.add(k); out.push({ kind: r.kind, m });
    }
    return out;
  }

  // étendue du ruban, en décades entières : deux décades de part et d'autre des
  // racines, la fenêtre courante toujours comprise, six décades au minimum.
  function ribSpan(){
    const mags = rootMags().map(r => r.m);
    const w = Model.bodeWindow();
    const wMax = Math.max(w.max, 0.05), wMin = wMax / Math.pow(10, w.dec);
    let lo = mags.length ? Math.min(...mags) / 100 : wMin / 10;
    let hi = mags.length ? Math.max(...mags) * 100 : wMax * 10;
    lo = Math.min(lo, wMin / 1.2); hi = Math.max(hi, wMax * 1.2);
    let p0 = Math.floor(Math.log10(lo)), p1 = Math.ceil(Math.log10(hi));
    const add = 6 - (p1 - p0);
    if (add > 0){ p0 -= Math.ceil(add / 2); p1 += Math.floor(add / 2); }
    return { p0, p1, n: p1 - p0 };
  }
  const ribX = (w, sp) => ML + (Math.log10(w) - sp.p0) / sp.n * (W - ML - MR);
  const ribW = (x, sp) => Math.pow(10,
    sp.p0 + Math.max(0, Math.min(1, (x - ML) / (W - ML - MR))) * sp.n);

  function drawRibbon(frag, g){
    // pendant un geste, on dessine avec l'étendue figée : sinon la piste se
    // recalcule à chaque image et la fenêtre glisse sans suivre la souris
    const plotW = W - ML - MR, y = g.ribTop, sp = ribFrozen || ribSpan();
    const grp = mk('g', {});
    grp.appendChild(mk('title', {}, t('ribHint')));
    grp.appendChild(mk('rect', { class: 'rib-track', x: ML, y, width: plotW, height: RIB_H, rx: 3 }));
    const xa = ribX(data.wMin, sp), xb = ribX(data.wMax, sp);
    grp.appendChild(mk('rect', { class: 'rib-win', x: xa, y,
                                 width: Math.max(3, xb - xa), height: RIB_H, rx: 3 }));
    // racines par-dessus la fenêtre : celles qu'on regarde sont les plus utiles
    for (const r of rootMags()){
      const tk = mk('line', { class: 'rib-tick ' + r.kind, x1: ribX(r.m, sp), y1: y + 2,
                              x2: ribX(r.m, sp), y2: y + RIB_H - 2 });
      tk.appendChild(mk('title', {}, (r.kind === 'pole' ? '|p| = ' : '|z| = ') + fmt3(r.m)));
      grp.appendChild(tk);
    }
    grp.appendChild(mk('rect', { class: 'rib-grip', x: xa - 3, y: y + 3,
                                 width: 6, height: RIB_H - 6, rx: 3 }));
    grp.appendChild(mk('rect', { class: 'rib-grip', x: xb - 3, y: y + 3,
                                 width: 6, height: RIB_H - 6, rx: 3 }));
    grp.appendChild(mk('text', { class: 'rib-lab', x: ML + 4, y: y + RIB_H - 5 }, fmtDec(sp.p0)));
    grp.appendChild(mk('text', { class: 'rib-lab', x: W - MR - 4, y: y + RIB_H - 5,
                                 'text-anchor': 'end' }, fmtDec(sp.p1)));
    frag.appendChild(grp);
  }

  // ω_max porte la fenêtre : le rang ω partagé est mis à l'échelle, comme au
  // glisser d'axe, pour que le plan s et la boîte 3D restent d'accord.
  function ribApplyMax(d, wTarget){
    const lo = Math.pow(10, d.sp.p0 + Model.state.view.omegaLogDecades);
    const w = Math.max(lo, Math.min(Math.pow(10, d.sp.p1), wTarget));
    const f = w / d.wMax0, nMin = d.oMin * f, nMax = d.oMax * f;
    if (nMax >= 1e-4 && nMax - nMin >= 1e-6 && nMax - nMin <= 1e9)
      Model.setPlaneWindow(d.sWin.min, d.sWin.max, nMin, nMax);
  }

  // double-clic : la fenêtre qui encadre toutes les racines, avec une marge ×3
  function ribFit(){
    const mags = rootMags().map(r => r.m);
    if (!mags.length) return;
    const lo = Math.min(...mags) / 3, hi = Math.max(...mags) * 3;
    const need = Math.log10(hi / lo);
    const dec = Math.max(1, Math.min(8, Math.ceil(need)));
    Model.setView({ omegaLogDecades: dec });
    // le nombre de décades est entier : l'excédent se partage en deux, sinon
    // les racines se retrouvent tassées contre le haut de la fenêtre
    const wMax = hi * Math.pow(10, Math.max(0, dec - need) / 2);
    const f = wMax / Math.max(Model.bodeWindow().max, 0.05);
    const o = Model.state.omegaRange, s = Model.state.view.sigmaWindow;
    Model.setPlaneWindow(s.min, s.max, o.min * f, o.max * f);
  }

  // ---------- calcul ----------
  function compute(){
    const win = Model.bodeWindow();
    const wMax = Math.max(win.max, 0.05);
    const wMin = win.log ? wMax / Math.pow(10, win.dec) : 0;
    const useDb = Model.state.view.logScale;
    const unwrap = Model.state.view.bodeUnwrap;
    // retard pur : contribution de phase connue analytiquement, −ωT (§1 bis)
    const Td = Model.state.delay;
    const lag = w => w * Td * 180 / Math.PI;
    const wrap180 = a => ((a + 180) % 360 + 360) % 360 - 180;
    const ws = new Array(NPTS), mags = new Array(NPTS), phis = new Array(NPTS);
    let prev = null;
    for (let i = 0; i < NPTS; i++){
      const f = i / (NPTS - 1);
      const w = win.log ? wMin * Math.pow(10, f * win.dec) : wMax * f;
      const h = Model.evalHjw(w);
      ws[i] = w; mags[i] = h.mag;
      let phi = null;
      if (isFinite(h.re) && isFinite(h.im) && h.mag > 0){
        phi = Math.atan2(h.im, h.re) * 180 / Math.PI;
        if (unwrap){
          // Dérouler la somme échoue dès que le retard fait tourner la phase de
          // plus d'un demi-tour entre deux échantillons : la correction ±360°
          // tombe à côté de plusieurs tours et la courbe part en bruit (983°
          // par échantillon pour T = 1 s à ω = 1000 rad/s ; il faudrait 4400
          // points). On déroule donc la **partie rationnelle**, qui est lisse
          // et bien échantillonnée, et on retranche le retard analytiquement :
          // exact à toute fréquence, sans suréchantillonner quoi que ce soit.
          let r = wrap180(phi + lag(w));
          if (prev !== null){
            // ne corriger que les vrais replis (~360°) — un saut légitime de
            // ±180° (pôle/zéro sur l'axe jω) doit rester visible
            while (r - prev > 270) r -= 360;
            while (r - prev < -270) r += 360;
          }
          prev = r;
          phi = r - lag(w);
        }
      }
      phis[i] = phi;
    }
    // échelle du module (× facteur manuel de l'axe Y, 1 = auto)
    const magZoom = Model.state.view.bodeMagZoom;
    let yLo, yHi, autoYHi = null, maxFinite = null;
    if (!useDb){
      const finite = mags.filter(isFinite).sort((a, b) => a - b);
      yLo = 0; yHi = 1;
      if (finite.length){
        const p95 = finite[Math.floor(finite.length * 0.95)];
        maxFinite = finite[finite.length - 1];
        yHi = (Math.min(maxFinite, Math.max(3 * p95, 1e-12)) || 1) * 1.06;
      }
      autoYHi = yHi;
      yHi *= magZoom;
    } else {
      const dbs = mags.filter(m => isFinite(m) && m > 0).map(m => 20 * Math.log10(m))
                      .sort((a, b) => a - b);
      if (!dbs.length){ yLo = -20; yHi = 20; }
      else {
        const mx = dbs[dbs.length - 1], p95 = dbs[Math.floor(dbs.length * 0.95)];
        yHi = Math.ceil(Math.min(mx, p95 + 10) / 20) * 20;
        yLo = Math.max(Math.floor(dbs[0] / 20) * 20, yHi - 120);
        if (yLo >= yHi) yLo = yHi - 40;
      }
      if (magZoom !== 1)
        yLo = yHi - Math.max(20, Math.ceil(((yHi - yLo) * magZoom) / 20) * 20);
    }
    // rang de phase : multiples de 90°, −90° et −180° toujours visibles
    let phLo, phHi;
    if (unwrap){
      const fin = phis.filter(v => v !== null);
      const mn = fin.length ? Math.min(...fin) : -180;
      const mx = fin.length ? Math.max(...fin) : 0;
      phLo = Math.min(-180, Math.floor(mn / 90) * 90);
      phHi = Math.max(0, Math.ceil(mx / 90) * 90);
      const phZoom = Model.state.view.bodePhZoom;
      if (phZoom !== 1)
        phLo = Math.min(phHi - Math.max(90, Math.ceil(((phHi - phLo) * phZoom) / 90) * 90), -180);
    } else { phLo = -180; phHi = 180; }
    data = { wMax, wMin, log: win.log, dec: win.dec,
             ws, mags, phis, yLo, yHi, phLo, phHi, useDb, unwrap, autoYHi, maxFinite };
  }

  // ---------- rendu ----------
  function render(){
    if (!Model.state.view.showBode) return;
    if (Model.state.view.bodeMode === 'nyquist') return;   // le panneau montre le polaire
    measure();                       // dimensions relues à chaque rendu (zones de clic = tracé)
    unwrapChk.checked = Model.state.view.bodeUnwrap;
    phaseChk.checked = Model.state.view.bodeShowPhase;
    logChk.checked = Model.state.view.logScale;
    decWrap.classList.toggle('hidden', !Model.state.view.logScale);
    decInput.value = String(Model.state.view.omegaLogDecades);
    compute();
    svg.innerHTML = '';
    const frag = document.createDocumentFragment();
    const { wMax, wMin, log, dec, ws, mags, phis, yLo, yHi, phLo, phHi, useDb, unwrap } = data;

    const plotW = W - ML - MR;
    const g = geom();
    const { showPh, hMod, hPh, phTop } = g;

    const X = xOf;
    const modVal = i => {
      const m = mags[i];
      if (!isFinite(m)) return yHi + (yHi - yLo);              // pic infini : sort du cadre
      if (useDb) return m > 0 ? 20 * Math.log10(m) : yLo - (yHi - yLo);
      return m;
    };
    const YM = v => {
      const y = MT + hMod - ((v - yLo) / (yHi - yLo)) * hMod;
      return Math.max(MT - 500, Math.min(MT + hMod + 500, y)); // borne numérique, le clip fait le reste
    };
    const YP = phi => phTop + ((phHi - phi) / (phHi - phLo)) * hPh;

    // zones de découpe : les courbes écrêtées sortent du cadre au lieu de plafonner
    const defs = mk('defs', {});
    const cm = mk('clipPath', { id: 'bode-clip-mod' });
    cm.appendChild(mk('rect', { x: ML, y: MT, width: plotW, height: hMod }));
    const cp = mk('clipPath', { id: 'bode-clip-ph' });
    cp.appendChild(mk('rect', { x: ML, y: phTop, width: plotW, height: hPh }));
    defs.appendChild(cm); defs.appendChild(cp);
    frag.appendChild(defs);

    // grille verticale ω (partagée) + graduations sous la phase
    const wLine = (w, minor) => {
      frag.appendChild(mk('line', { class: 'gridline' + (minor ? ' minor' : ''),
                                    x1: X(w), y1: MT, x2: X(w), y2: MT + hMod }));
      if (showPh)
        frag.appendChild(mk('line', { class: 'gridline' + (minor ? ' minor' : ''),
                                      x1: X(w), y1: phTop, x2: X(w), y2: phTop + hPh }));
    };
    if (log){
      // décades : trait fort et étiquette ; 2…9 en traits fins (grille de Bode)
      const p0 = Math.floor(Math.log10(wMin) + 1e-9), p1 = Math.ceil(Math.log10(wMax) - 1e-9);
      for (let p = p0; p <= p1; p++)
        for (let k = 1; k <= 9; k++){
          const w = k * Math.pow(10, p);
          if (w < wMin * (1 - 1e-9) || w > wMax * (1 + 1e-9)) continue;
          wLine(w, k !== 1);
          if (k === 1)
            frag.appendChild(mk('text', { class: 'tick', x: X(w), y: phTop + hPh + 12,
                                          'text-anchor': 'middle' }, fmtDec(p)));
        }
    } else {
      const wStep = niceStep(wMax / 6);
      for (let w = wStep; w <= wMax + 1e-9; w += wStep){
        wLine(w, false);
        frag.appendChild(mk('text', { class: 'tick', x: X(w), y: phTop + hPh + 12,
                                      'text-anchor': 'middle' },
                            disp(String(Number(w.toFixed(6))))));
      }
    }

    // ---- module ----
    if (!useDb){
      const mStep = niceStep((yHi - yLo) / 4);
      for (let v = yLo + mStep; v <= yHi; v += mStep){
        frag.appendChild(mk('line', { class: 'gridline', x1: ML, y1: YM(v), x2: W - MR, y2: YM(v) }));
        frag.appendChild(mk('text', { class: 'tick', x: ML - 5, y: YM(v) + 3, 'text-anchor': 'end' },
                            disp(String(Number(v.toPrecision(3))))));
      }
    } else {
      const step = (yHi - yLo) / 20 > 7 ? 40 : 20;
      for (let v = yLo; v <= yHi; v += step){
        frag.appendChild(mk('line', { class: 'gridline', x1: ML, y1: YM(v), x2: W - MR, y2: YM(v) }));
        frag.appendChild(mk('text', { class: 'tick', x: ML - 5, y: YM(v) + 3, 'text-anchor': 'end' },
                            disp(String(v))));
      }
    }
    frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: MT + hMod, x2: W - MR, y2: MT + hMod }));
    frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: MT, x2: ML, y2: MT + hMod }));
    frag.appendChild(mk('text', { class: 'axis-title', x: 26, y: MT + hMod / 2, 'text-anchor': 'middle',
                                  transform: `rotate(-90 26 ${MT + hMod / 2})` },
                        useDb ? '|H| (dB)' : '|H(jω)|'));
    let dM = '';
    for (let i = 0; i < NPTS; i++)
      dM += (i === 0 ? 'M' : 'L') + X(ws[i]).toFixed(2) + ',' + YM(modVal(i)).toFixed(2);
    frag.appendChild(mk('path', { class: 'bode-curve', d: dM, 'clip-path': 'url(#bode-clip-mod)' }));

    // ---- phase (masquable, case « Afficher la phase ») ----
    if (showPh){
    for (let phi = phHi; phi >= phLo; phi -= 90){
      const ref = (phi === -90 || phi === -180);
      frag.appendChild(mk('line', { class: ref ? 'refline' : 'gridline',
                                    x1: ML, y1: YP(phi), x2: W - MR, y2: YP(phi) }));
      frag.appendChild(mk('text', { class: 'tick', x: ML - 5, y: YP(phi) + 3, 'text-anchor': 'end' },
                          disp(phi + '°')));
    }
    frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: phTop + hPh, x2: W - MR, y2: phTop + hPh }));
    frag.appendChild(mk('line', { class: 'axis', x1: ML, y1: phTop, x2: ML, y2: phTop + hPh }));
    frag.appendChild(mk('text', { class: 'axis-title', x: 26, y: phTop + hPh / 2, 'text-anchor': 'middle',
                                  transform: `rotate(-90 26 ${phTop + hPh / 2})` }, 'arg H (°)'));
    frag.appendChild(mk('text', { class: 'axis-name', x: W - 8, y: phTop + hPh + 12,
                                  'text-anchor': 'end' }, 'ω [rad/s]'));
    let dP = '', pen = false, prevPhi = null;
    for (let i = 0; i < NPTS; i++){
      const phi = phis[i];
      if (phi === null){ pen = false; prevPhi = null; continue; }
      if (!unwrap && prevPhi !== null && Math.abs(phi - prevPhi) > 180) pen = false; // repli : coupure franche
      dP += (pen ? 'L' : 'M') + X(ws[i]).toFixed(2) + ',' + YP(phi).toFixed(2);
      pen = true; prevPhi = phi;
    }
    frag.appendChild(mk('path', { class: 'bode-curve', d: dP, 'clip-path': 'url(#bode-clip-ph)' }));
    } else {
      // phase masquée : l'axe ω passe sous le module
      frag.appendChild(mk('text', { class: 'axis-name', x: W - 8, y: MT + hMod + 12,
                                    'text-anchor': 'end' }, 'ω [rad/s]'));
    }

    // ---- poignées d'axes ----
    // axe ω : glisser = mise à l'échelle du rang ω partagé (le plan s suit)
    frag.appendChild(mk('rect', { class: 'wdrag', x: ML, y: phTop + hPh + 2,
                                  width: plotW, height: MB - 4 }));
    if (g.rib) drawRibbon(frag, g);
    // axes Y : glisser = échelle locale du tracé (double-clic = retour auto)
    frag.appendChild(mk('rect', { class: 'ydrag', x: 0, y: MT, width: ML - 2, height: hMod }));
    if (showPh)
      frag.appendChild(mk('rect', { class: 'ydrag', x: 0, y: phTop, width: ML - 2, height: hPh }));

    // ---- marqueur d'évaluation unique + readout (toujours visible, §6 bis) ----
    // Un seul trait vertical à l'écran : en entrée sinusoïdale c'est ω_in
    // (violet, toujours saisissable) qui tient le rôle et porte le readout ;
    // sinon c'est ω_éval (orange), qui suit le curseur tant que la construction
    // géométrique est décochée, et devient fixe et déplaçable une fois cochée.
    const sine = Model.state.input.type === 'sine';
    const cls = sine ? 'win' : 'eval';
    const wEval = Math.max(log ? wMin : 0, Math.min(Model.evalOmega(), wMax));
    const xe = X(wEval);
    const i = idxOf(wEval);
    frag.appendChild(mk('line', { class: cls + '-line', x1: xe, y1: MT, x2: xe, y2: phTop + hPh }));
    const ym = YM(modVal(i));
    if (ym >= MT && ym <= MT + hMod)
      frag.appendChild(mk('circle', { class: cls + '-dot', cx: xe, cy: ym, r: 4.5 }));
    if (showPh && phis[i] !== null){
      const yp = YP(phis[i]);
      if (yp >= phTop && yp <= phTop + hPh)
        frag.appendChild(mk('circle', { class: cls + '-dot', cx: xe, cy: yp, r: 4.5 }));
    }
    // readout : ω (ω_in en sinusoïdal), |H| en linéaire ET en dB, φ
    const m = mags[i];
    const magStr = isFinite(m) && m > 0
      ? `${fmt3(m)} (${disp(String(Math.round(20 * Math.log10(m) * 10) / 10))} dB)`
      : fmt3(m);
    const phiStr = phis[i] !== null ? disp(String(Math.round(phis[i]))) + '°' : '—';
    const anchor = xe > ML + plotW * 0.55 ? 'end' : 'start';
    const lbl = mk('text', { class: cls + '-label', x: anchor === 'end' ? xe - 7 : xe + 7,
                             y: MT + 12, 'text-anchor': anchor });
    lbl.appendChild(document.createTextNode('ω'));
    if (sine) lbl.appendChild(mk('tspan', { dy: 3, 'font-size': '9.5px' }, 'in'));
    lbl.appendChild(mk('tspan', { dy: sine ? -3 : 0 },
                       ` = ${fmt3(ws[i])} · |H| = ${magStr} · φ = ${phiStr}`));
    frag.appendChild(lbl);
    // poignée de saisie : dès que le marqueur est fixe (cf. EVAL_FOLLOWS_CURSOR)
    if (!Model.EVAL_FOLLOWS_CURSOR || sine || Model.state.view.ruler.on)
      frag.appendChild(mk('rect', { class: cls + '-hit', x: xe - 6, y: MT, width: 12,
                                    height: phTop + hPh - MT }));

    svg.appendChild(frag);
  }

  // ---------- interactions ----------
  // géométrie des sous-tracés — source unique (rendu et interactions).
  // Phase masquée : le module occupe toute la hauteur.
  function geom(){
    const showPh = Model.state.view.bodeShowPhase;
    const gap = showPh ? GAP : 0;
    const rib = ribOn() ? RIB_H + RIB_GAP : 0;
    const innerH = H - MT - MB - gap - rib;
    const hMod = showPh ? innerH * 0.55 : innerH;
    return { showPh, hMod, hPh: showPh ? innerH - hMod : 0, phTop: MT + hMod + gap,
             rib, ribTop: H - RIB_H - 2 };
  }

  svg.addEventListener('pointerdown', ev => {
    if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
    measure();                       // zones de saisie toujours calées sur le tracé
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const g = geom();
    const inPlot = x >= ML && x <= W - MR && y >= MT && y <= g.phTop + g.hPh;
    const sine = Model.state.input.type === 'sine';
    // marqueur fixe = saisissable (et plaçable au clic) : c'est le cas partout
    // sauf s'il suit le curseur, cf. Model.EVAL_FOLLOWS_CURSOR
    const fixed = !Model.EVAL_FOLLOWS_CURSOR || sine || Model.state.view.ruler.on;
    const grabbable = fixed;
    // priorité de saisie : marqueur proche (≤ 7 px) d'abord, sinon placement
    if (grabbable && data && inPlot && Math.abs(x - xOf(Model.evalOmega())) < 7){
      axisDrag = { kind: 'eval' };
    } else if (g.rib && data && y >= g.ribTop - 3 && x >= ML - 8 && x <= W - MR + 8){
      // ruban : poignées = nombre de décades, bande = position de la fenêtre.
      // L'étendue est figée le temps du geste, sinon elle se recalcule sous le
      // curseur à chaque image et le ruban se dérobe pendant qu'on le tire.
      const sp = ribFrozen = ribSpan();
      const xa = ribX(data.wMin, sp), xb = ribX(data.wMax, sp);
      const d = { kind: 'rib', sp, wMax0: data.wMax, wMin0: data.wMin,
                  sWin: { ...Model.state.view.sigmaWindow },
                  oMin: Model.state.omegaRange.min, oMax: Model.state.omegaRange.max };
      if (Math.abs(x - xa) <= 6) d.edge = 'lo';
      else if (Math.abs(x - xb) <= 6) d.edge = 'hi';
      else {
        d.x0 = ev.clientX;
        // clic hors de la fenêtre : on s'y rend, la fréquence visée au centre
        if (x < xa || x > xb){
          ribApplyMax(d, ribW(x, sp) * Math.pow(10, data.dec / 2));
          d.wMax0 = Math.max(Model.bodeWindow().max, 0.05);
          d.oMin = Model.state.omegaRange.min; d.oMax = Model.state.omegaRange.max;
        }
      }
      axisDrag = d;
    } else if (y > H - MB - g.rib && y <= H - g.rib && x >= ML && x <= W - MR){
      axisDrag = { kind: 'w', x0: ev.clientX,
                   oMin: Model.state.omegaRange.min, oMax: Model.state.omegaRange.max,
                   sWin: { ...Model.state.view.sigmaWindow } };
    } else if (x < ML && y >= MT && y <= MT + g.hMod){
      axisDrag = { kind: 'mag', y0: ev.clientY, z0: Model.state.view.bodeMagZoom };
    } else if (x < ML && y >= g.phTop && y <= g.phTop + g.hPh){
      axisDrag = { kind: 'ph', y0: ev.clientY, z0: Model.state.view.bodePhZoom };
    } else if (fixed && data && inPlot && ev.button === 0){
      axisDrag = { kind: 'eval' };                       // clic dans le tracé = placer le marqueur
      Model.setOmegaEval(wAt(x));
    } else return;
    ev.preventDefault();
    try { svg.setPointerCapture(ev.pointerId); } catch (_) {}
  });

  svg.addEventListener('pointermove', ev => {
    if (axisDrag){
      if (axisDrag.kind === 'eval'){
        const r2 = svg.getBoundingClientRect();
        Model.setOmegaEval(wAt(ev.clientX - r2.left));
      } else if (axisDrag.kind === 'w'){
        const f = Math.exp(-(ev.clientX - axisDrag.x0) / 200);
        const nMin = axisDrag.oMin * f, nMax = axisDrag.oMax * f;
        if (nMax - nMin >= 1e-6 && nMax - nMin <= 1e9 && nMax >= 1e-4)
          Model.setPlaneWindow(axisDrag.sWin.min, axisDrag.sWin.max, nMin, nMax);
      } else if (axisDrag.kind === 'rib'){
        const d = axisDrag, x = ev.clientX - svg.getBoundingClientRect().left;
        if (d.edge === 'lo'){
          // borne basse : ω_max ne bouge pas, seule la largeur change
          const dec = Math.max(1, Math.min(8, Math.round(Math.log10(d.wMax0 / ribW(x, d.sp)))));
          if (dec !== Model.state.view.omegaLogDecades)
            Model.setView({ omegaLogDecades: dec });
        } else if (d.edge === 'hi'){
          // borne haute : ω_min ne bouge pas, la largeur suit le nombre entier
          const dec = Math.max(1, Math.min(8, Math.round(Math.log10(ribW(x, d.sp) / d.wMin0))));
          if (dec !== Model.state.view.omegaLogDecades)
            Model.setView({ omegaLogDecades: dec });
          ribApplyMax(d, d.wMin0 * Math.pow(10, dec));
        } else {
          ribApplyMax(d, d.wMax0 * Math.pow(10,
            (ev.clientX - d.x0) / (W - ML - MR) * d.sp.n));
        }
      } else if (axisDrag.kind === 'mag'){
        const z = Math.min(100, Math.max(0.05, axisDrag.z0 * Math.exp((ev.clientY - axisDrag.y0) / 200)));
        Model.setView({ bodeMagZoom: z });
      } else {
        const z = Math.min(8, Math.max(0.25, axisDrag.z0 * Math.exp((ev.clientY - axisDrag.y0) / 200)));
        Model.setView({ bodePhZoom: z });
      }
      return;
    }
    // suivi du curseur : seulement si le drapeau de configuration l'autorise,
    // et hors mode sinusoïdal ou construction fixée (voir Model.EVAL_FOLLOWS_CURSOR)
    if (!Model.EVAL_FOLLOWS_CURSOR) return;
    if (!data || Model.state.view.ruler.on || Model.state.input.type === 'sine') return;
    measure();
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const g = geom();
    if (x < ML || x > W - MR || y < MT || y > g.phTop + g.hPh) return;
    Model.setOmegaEval(wAt(x));
  });

  // double-clic sur un axe Y : autorange complet si la courbe est écrêtée,
  // sinon retour à l'échelle automatique
  svg.addEventListener('dblclick', ev => {
    measure();
    const r = svg.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const g = geom();
    if (g.rib && y >= g.ribTop - 3){ ribFit(); return; }
    if (x >= ML) return;
    if (y >= MT && y <= MT + g.hMod){
      const z = Model.state.view.bodeMagZoom;
      if (z === 1 && data && data.autoYHi !== null && data.maxFinite !== null &&
          data.maxFinite * 1.06 > data.autoYHi * 1.001)
        Model.setView({ bodeMagZoom: data.maxFinite * 1.06 / data.autoYHi });
      else
        Model.setView({ bodeMagZoom: 1 });
    } else if (y >= g.phTop && y <= g.phTop + g.hPh){
      Model.setView({ bodePhZoom: 1 });
    }
  });

  svg.addEventListener('pointerup', () => {
    axisDrag = null;
    if (ribFrozen){ ribFrozen = null; render(); }   // la piste se recale au relâchement
  });

  function measure(){
    W = body.clientWidth || W;
    H = body.clientHeight || H;
  }
  function resize(){ measure(); render(); }

  return { render, resize, refreshLang };
})();
