'use strict';
/* Diagramme polaire (Nyquist) — cahier §6 ter, jalon J8.
   Même information que le Bode : le lieu de H(jω) dans le plan complexe. Ce
   n'est donc pas une donnée de plus, c'est une LECTURE de plus — celle où la
   position par rapport au point critique devient visible.
   Choix actés avec l'enseignant :
   · vue logée dans le panneau Bode (sélecteur Bode / Nyquist / Les deux) ;
   · **ω ≥ 0 seulement**, comme le Bode, avec des flèches donnant le sens de
     ω croissant — la branche conjuguée est le symétrique par rapport à l'axe
     réel et s'explique de vive voix ;
   · les références du critère du revers (point −1, cercle unité, marges) sont
     derrière une case **décochée par défaut** : au chapitre 2, H est le
     système et non une FTBO, marquer −1 y affirmerait une lecture qui n'a pas
     encore de sens.
   Échelle 1:1 imposée : c'est un plan complexe, les angles doivent se lire. */
const Nyquist = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('nyq-svg');
  const body = document.getElementById('nyq-pane');
  const reversChk = document.getElementById('nyq-revers');

  const NPTS = 700, DECS = 5, MAXPTS = 6000, MARGIN = 14, ARROWS = 4;
  let W = 320, H = 320;

  reversChk.addEventListener('change', () => Model.setView({ nyqRevers: reversChk.checked }));
  function refreshLang(){
    reversChk.closest('label').title = t('reversHint');
    svg.parentElement.title = t('nyqHint');
  }
  refreshLang();

  function mk(name, attrs, text){
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const disp = s => String(s).replace(/-/g, '−');
  const fmt = v => disp(String(Number(v.toPrecision(3))));
  function niceStep(target){
    const p = Math.pow(10, Math.floor(Math.log10(target)));
    const m = target / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  // ---------- calcul ----------
  // Échantillonnage LOGARITHMIQUE, plus le point ω = 0. Un pas uniforme en ω
  // dégénère dès qu'on dézoome : presque tous les points tombent dans la queue
  // où |H| ≈ 0, le lieu utile n'est plus décrit que par quelques segments —
  // et le cadrage, calculé sur cette queue, finit par l'exclure.
  const evalAt = w => {
    const h = Model.evalHjw(w);
    return { w, re: h.re, im: h.im, mag: h.mag,
             phi: (isFinite(h.re) && isFinite(h.im) && h.mag > 0)
               ? Math.atan2(h.im, h.re) * 180 / Math.PI : null };
  };

  function compute(){
    const bw = Model.bodeWindow();
    const wMax = Math.max(bw.max, 1e-9);
    const wLow = bw.log ? bw.min : wMax * Math.pow(10, -DECS);
    const decs = bw.log ? bw.dec : DECS;
    let pts = [evalAt(0)];
    for (let i = 0; i < NPTS; i++)
      pts.push(evalAt(wLow * Math.pow(10, (i / (NPTS - 1)) * decs)));

    // rayon de cadrage : ≈ 3 × le niveau hors résonance, sur un échantillonnage
    // équitable en échelle — sinon un pôle proche de l'axe écrase tout
    const fin = pts.map(p => p.mag).filter(isFinite).sort((a, b) => a - b);
    const p95 = fin.length ? fin[Math.floor(fin.length * 0.95)] : 1;
    const cap = Math.max(Math.min(fin.length ? fin[fin.length - 1] : 1, 3 * p95), 1e-9);

    // raffinement adaptatif : on coupe les segments encore trop longs dans le
    // plan complexe, pour que la trace reste une courbe et non un polygone
    const seuil = cap * 0.012;
    for (let pass = 0; pass < 4 && pts.length < MAXPTS; pass++){
      const out = [pts[0]];
      let coupes = 0;
      for (let i = 1; i < pts.length; i++){
        const a = pts[i - 1], b = pts[i];
        if (isFinite(a.mag) && isFinite(b.mag) && a.mag < 4 * cap && b.mag < 4 * cap &&
            Math.hypot(b.re - a.re, b.im - a.im) > seuil && out.length < MAXPTS){
          out.push(evalAt(a.w > 0 ? Math.sqrt(a.w * b.w) : b.w * 0.5));
          coupes++;
        }
        out.push(b);
      }
      pts = out;
      if (!coupes) break;
    }
    return { pts, cap };
  }

  // Marges (chap. 3). Elles sont une propriété du SYSTÈME, pas du cadrage :
  // on ne les cherche donc pas sur la fenêtre affichée — sinon un simple zoom
  // les ferait apparaître ou disparaître — mais sur un balayage logarithmique
  // large, calé sur les modules des pôles et zéros.
  function margins(){
    let wRef = 1;
    for (const r of Model.rootPoints()) wRef = Math.max(wRef, Math.hypot(r.sigma, r.omega));
    const N = 4000, dec = 6, w0 = wRef * 1e-3;
    let pm = null, gm = null, wc = null, w180 = null;
    let mag0 = null, phU0 = null, w0p = null;
    for (let i = 0; i <= N; i++){
      const w = w0 * Math.pow(10, (i / N) * dec);
      const h = Model.evalHjw(w);
      if (!isFinite(h.re) || !isFinite(h.im) || h.mag <= 0){ mag0 = phU0 = null; continue; }
      const mag = h.mag;
      // phase DÉROULÉE : le franchissement de −180° est précisément l'endroit
      // où la valeur principale se replie ; le chercher sur elle reviendrait à
      // écarter le seul point qu'on veut trouver.
      let phU = Math.atan2(h.im, h.re) * 180 / Math.PI;
      if (phU0 !== null){
        while (phU - phU0 > 180) phU -= 360;
        while (phU - phU0 < -180) phU += 360;
      }
      if (mag0 !== null){
        // croisement du gain unité → marge de phase
        if (wc === null && (mag0 - 1) * (mag - 1) < 0){
          const f = (1 - mag0) / (mag - mag0);
          wc = w0p + f * (w - w0p);
          const hh = Model.evalHjw(wc);
          pm = 180 + Math.atan2(hh.im, hh.re) * 180 / Math.PI;
          while (pm > 180) pm -= 360;
          while (pm < -180) pm += 360;
        }
        // croisement de −180° sur la phase déroulée → marge de gain
        if (w180 === null && (phU0 + 180) * (phU + 180) < 0){
          const f = (-180 - phU0) / (phU - phU0);
          w180 = w0p + f * (w - w0p);
          const mm = Model.evalHjw(w180).mag;
          gm = mm > 0 ? -20 * Math.log10(mm) : null;
        }
      }
      mag0 = mag; phU0 = phU; w0p = w;
    }
    return { pm, gm, wc, w180 };
  }

  // ---------- rendu ----------
  function render(){
    if (!Model.state.view.showBode) return;
    if (Model.state.view.bodeMode === 'bode') return;
    W = body.clientWidth || W;
    H = body.clientHeight || H;
    reversChk.checked = Model.state.view.nyqRevers;
    const revers = Model.state.view.nyqRevers;
    const d = compute();

    // cadrage : origine, courbe écrêtée, et −1 quand les références sont là
    let xMin = 0, xMax = 0, yMin = 0, yMax = 0;
    for (const p of d.pts){
      if (!isFinite(p.mag) || p.mag > d.cap) continue;
      xMin = Math.min(xMin, p.re); xMax = Math.max(xMax, p.re);
      yMin = Math.min(yMin, p.im); yMax = Math.max(yMax, p.im);
    }
    if (revers){ xMin = Math.min(xMin, -1.15); xMax = Math.max(xMax, 1.15);
                 yMin = Math.min(yMin, -1.15); yMax = Math.max(yMax, 1.15); }
    if (xMax - xMin < 1e-9){ xMin -= 1; xMax += 1; }
    if (yMax - yMin < 1e-9){ yMin -= 1; yMax += 1; }
    const padX = (xMax - xMin) * 0.08, padY = (yMax - yMin) * 0.08;
    xMin -= padX; xMax += padX; yMin -= padY; yMax += padY;

    // échelle 1:1 — c'est un plan complexe (cahier §4, même exigence)
    const plotW = W - 2 * MARGIN, plotH = H - 2 * MARGIN;
    const sc = Math.min(plotW / (xMax - xMin), plotH / (yMax - yMin));
    const cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2;
    const X = x => W / 2 + (x - cx) * sc;
    const Y = y => H / 2 - (y - cy) * sc;

    svg.innerHTML = '';
    const frag = document.createDocumentFragment();
    const defs = mk('defs', {});
    const cp = mk('clipPath', { id: 'nyq-clip' });
    cp.appendChild(mk('rect', { x: 0, y: 0, width: W, height: H }));
    defs.appendChild(cp);
    frag.appendChild(defs);

    // grille et axes Re / Im
    const step = niceStep(Math.max(xMax - xMin, yMax - yMin) / 6);
    for (let v = Math.ceil(xMin / step) * step; v <= xMax; v += step){
      const vv = Math.abs(v) < 1e-12 ? 0 : v;
      if (vv !== 0){
        frag.appendChild(mk('line', { class: 'gridline', x1: X(vv), y1: 0, x2: X(vv), y2: H }));
        frag.appendChild(mk('text', { class: 'tick', x: X(vv) + 2, y: Y(0) + 11 }, disp(String(Number(vv.toPrecision(3))))));
      }
    }
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step){
      const vv = Math.abs(v) < 1e-12 ? 0 : v;
      if (vv !== 0){
        frag.appendChild(mk('line', { class: 'gridline', x1: 0, y1: Y(vv), x2: W, y2: Y(vv) }));
        frag.appendChild(mk('text', { class: 'tick', x: X(0) + 4, y: Y(vv) - 3 }, disp(String(Number(vv.toPrecision(3))))));
      }
    }
    frag.appendChild(mk('line', { class: 'axis', x1: 0, y1: Y(0), x2: W, y2: Y(0) }));
    frag.appendChild(mk('line', { class: 'axis', x1: X(0), y1: 0, x2: X(0), y2: H }));
    frag.appendChild(mk('text', { class: 'axis-name', x: W - 6, y: Y(0) - 6, 'text-anchor': 'end' }, 'Re'));
    frag.appendChild(mk('text', { class: 'axis-name', x: X(0) + 6, y: 14 }, 'Im'));

    const g = mk('g', { 'clip-path': 'url(#nyq-clip)' });

    // références du critère du revers (chap. 3), derrière la case
    if (revers){
      g.appendChild(mk('circle', { class: 'nyq-unit', cx: X(0), cy: Y(0), r: sc }));
      g.appendChild(mk('path', { class: 'nyq-crit',
        d: `M${X(-1) - 5},${Y(0) - 5} l10,10 M${X(-1) - 5},${Y(0) + 5} l10,-10` }));
      g.appendChild(mk('text', { class: 'nyq-crit-lab', x: X(-1), y: Y(0) - 9,
                                 'text-anchor': 'middle' }, '−1'));
    }

    // lieu de H(jω), ω ≥ 0
    let path = '', pen = false;
    for (const p of d.pts){
      if (!isFinite(p.re) || !isFinite(p.im) || p.mag > 4 * d.cap){ pen = false; continue; }
      path += (pen ? 'L' : 'M') + X(p.re).toFixed(2) + ',' + Y(p.im).toFixed(2);
      pen = true;
    }
    g.appendChild(mk('path', { class: 'nyq-curve', d: path }));

    // flèches du sens de ω croissant
    const NP = d.pts.length;
    for (let k = 1; k <= ARROWS; k++){
      const i = Math.round(NP * k / (ARROWS + 1));
      if (i < 3 || i >= NP || !isFinite(d.pts[i].re) || d.pts[i].mag > d.cap) continue;
      const x0 = X(d.pts[i - 2].re), y0 = Y(d.pts[i - 2].im);
      const x1 = X(d.pts[i].re), y1 = Y(d.pts[i].im);
      const a = Math.atan2(y1 - y0, x1 - x0);
      const s = 6;
      g.appendChild(mk('path', { class: 'nyq-arrow',
        d: `M${x1},${y1} L${x1 - s * Math.cos(a - 0.4)},${y1 - s * Math.sin(a - 0.4)}`
         + ` L${x1 - s * Math.cos(a + 0.4)},${y1 - s * Math.sin(a + 0.4)} Z` }));
    }

    // marqueur ω_éval : le même point que dans les autres panneaux, avec son
    // rayon depuis l'origine — |H| et arg H s'y lisent directement
    const we = Model.evalOmega();
    const sine = Model.state.input.type === 'sine';
    if (we !== null && isFinite(we)){
      const h = Model.evalHjw(we);
      if (isFinite(h.re) && isFinite(h.im)){
        const cls = sine ? 'win' : 'eval';
        g.appendChild(mk('line', { class: 'nyq-radius ' + cls,
                                   x1: X(0), y1: Y(0), x2: X(h.re), y2: Y(h.im) }));
        g.appendChild(mk('circle', { class: cls + '-dot', cx: X(h.re), cy: Y(h.im), r: 5 }));
      }
    }
    frag.appendChild(g);

    // lecture des marges (chap. 3) : uniquement avec les références
    if (revers){
      const m = margins();
      const l1 = m.pm !== null
        ? `${t('margPhase')} : ${fmt(m.pm)}°  (ω = ${fmt(m.wc)})`
        : `${t('margPhase')} : ${t('margNone')}`;
      const l2 = m.gm !== null
        ? `${t('margGain')} : ${fmt(m.gm)} dB  (ω = ${fmt(m.w180)})`
        : `${t('margGain')} : ${t('margNone')}`;
      frag.appendChild(mk('text', { class: 'nyq-marg', x: 8, y: 14 }, l1));
      frag.appendChild(mk('text', { class: 'nyq-marg', x: 8, y: 28 }, l2));
    }

    svg.appendChild(frag);
  }

  function resize(){
    W = body.clientWidth || W;
    H = body.clientHeight || H;
    render();
  }

  return { render, resize, refreshLang, margins, compute };
})();
