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
   · le même interrupteur de marges pilote Bode et Nyquist. Dans le plan
     polaire, il révèle le point −1, le cercle unité et les constructions de
     marge propres à la boucle ouverte L(s).
   Échelle 1:1 imposée : c'est un plan complexe, les angles doivent se lire. */
const Nyquist = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('nyq-svg');
  const body = document.getElementById('nyq-pane');
  const marginsChk = document.getElementById('show-margins');

  const NPTS = 700, DECS = 5, MAXPTS = 6000, MARGIN = 14, ARROWS = 4;
  let W = 320, H = 320;

  marginsChk.addEventListener('change', () => Model.setView({ showMargins: marginsChk.checked }));
  function refreshLang(){
    marginsChk.closest('label').title = t('marginsHint');
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

    // Lorsque le critère du revers est demandé, la courbe ne doit pas s'arrêter
    // au zoom partagé ω_max. On prolonge six décades en gris, puis on ajoute la
    // limite analytique à l'infini quand elle existe pour le modèle rationnel.
    let tail = [];
    if (Model.state.view.showMargins){
      let wRef = 1;
      for (const r of Model.rootPoints()) wRef = Math.max(wRef, Math.hypot(r.sigma, r.omega));
      const wFar = Math.max(wMax, wRef) * 1e6;
      tail.push(pts[pts.length - 1]);
      for (let i = 1; i <= 500; i++)
        tail.push(evalAt(wMax * Math.pow(wFar / wMax, i / 500)));
      const tf = Model.transferPolys('L'), relDegree = tf.den.length - tf.num.length;
      if (relDegree > 0 || Model.state.delay === 0){
        const limit = relDegree > 0 ? 0 : tf.num[0] / tf.den[0];
        tail.push({ w: Infinity, re: limit, im: 0, mag: Math.abs(limit), phi: limit < 0 ? 180 : 0,
                    infinite: true });
      }
    }
    return { pts, tail, cap };
  }

  const margins = () => Model.stabilityMargins();

  // ---------- rendu ----------
  function render(){
    if (!Model.state.view.showBode) return;
    marginsChk.checked = Model.state.view.showMargins;
    if (Model.state.view.bodeMode === 'bode') return;
    W = body.clientWidth || W;
    H = body.clientHeight || H;
    const showMargins = Model.state.view.showMargins;
    const d = compute();
    const marginData = showMargins ? margins() : null;

    // cadrage : origine, courbe écrêtée, et −1 quand les références sont là
    let xMin = 0, xMax = 0, yMin = 0, yMax = 0;
    for (const p of [...d.pts, ...(showMargins ? d.tail : [])]){
      if (!isFinite(p.mag) || p.mag > d.cap) continue;
      xMin = Math.min(xMin, p.re); xMax = Math.max(xMax, p.re);
      yMin = Math.min(yMin, p.im); yMax = Math.max(yMax, p.im);
    }
    if (showMargins){ xMin = Math.min(xMin, -1.15); xMax = Math.max(xMax, 1.15);
                 yMin = Math.min(yMin, -1.15); yMax = Math.max(yMax, 1.15); }
    if (marginData && marginData.w180 !== null){
      const h180 = Model.evalHjw(marginData.w180);
      if (isFinite(h180.re) && isFinite(h180.im)){
        xMin = Math.min(xMin, h180.re); xMax = Math.max(xMax, h180.re);
        yMin = Math.min(yMin, h180.im); yMax = Math.max(yMax, h180.im);
      }
    }
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
    if (showMargins){
      g.appendChild(mk('circle', { class: 'nyq-unit', cx: X(0), cy: Y(0), r: sc }));
      g.appendChild(mk('path', { class: 'nyq-crit',
        d: `M${X(-1) - 5},${Y(0) - 5} l10,10 M${X(-1) - 5},${Y(0) + 5} l10,-10` }));
      g.appendChild(mk('text', { class: 'nyq-crit-lab', x: X(-1), y: Y(0) - 9,
                                 'text-anchor': 'middle' }, '−1'));

      // Marge de phase : rayon au croisement |L|=1 et arc depuis −180°.
      if (marginData.pm !== null && marginData.wc !== null){
        const hc = Model.evalHjw(marginData.wc);
        if (isFinite(hc.re) && isFinite(hc.im)){
          g.appendChild(mk('line', { class: 'nyq-margin-phase', x1: X(0), y1: Y(0),
                                     x2: X(hc.re), y2: Y(hc.im) }));
          g.appendChild(mk('circle', { class: 'nyq-margin-phase-point',
                                       cx: X(hc.re), cy: Y(hc.im), r: 4 }));
          const a0 = -Math.PI, a1 = a0 + marginData.pm * Math.PI / 180;
          const radius = .72, sx = X(radius * Math.cos(a0)), sy = Y(radius * Math.sin(a0));
          const ex = X(radius * Math.cos(a1)), ey = Y(radius * Math.sin(a1));
          g.appendChild(mk('path', { class: 'nyq-margin-phase-arc',
            d: `M${sx},${sy} A${radius * sc},${radius * sc} 0 0 ${marginData.pm >= 0 ? 1 : 0} ${ex},${ey}` }));
          const am = (a0 + a1) / 2, lr = .82;
          g.appendChild(mk('text', { class: 'nyq-margin-label phase',
            x: X(lr * Math.cos(am)), y: Y(lr * Math.sin(am)) - 4, 'text-anchor': 'middle' },
            `Mφ ${fmt(marginData.pm)}°`));
        }
      }

      // Marge de gain : distance sur l'axe réel entre L(jω180) et −1.
      if (marginData.gm !== null && marginData.w180 !== null){
        const h180 = Model.evalHjw(marginData.w180);
        if (isFinite(h180.re)){
          g.appendChild(mk('line', { class: 'nyq-margin-gain', x1: X(-1), y1: Y(0),
                                     x2: X(h180.re), y2: Y(0) }));
          g.appendChild(mk('circle', { class: 'nyq-margin-gain-point',
                                       cx: X(h180.re), cy: Y(0), r: 4 }));
          g.appendChild(mk('text', { class: 'nyq-margin-label gain',
            x: (X(-1) + X(h180.re)) / 2, y: Y(0) + 15, 'text-anchor': 'middle' },
            `Mg ${fmt(marginData.gm)} dB`));
        }
      }
    }

    // lieu de H(jω), ω ≥ 0
    let path = '', pen = false;
    for (const p of d.pts){
      if (!isFinite(p.re) || !isFinite(p.im) || p.mag > 4 * d.cap){ pen = false; continue; }
      path += (pen ? 'L' : 'M') + X(p.re).toFixed(2) + ',' + Y(p.im).toFixed(2);
      pen = true;
    }
    g.appendChild(mk('path', { class: 'nyq-curve', d: path }));

    if (showMargins && d.tail.length){
      let tailPath = '', tailPen = false;
      for (const p of d.tail){
        if (!isFinite(p.re) || !isFinite(p.im) || p.mag > 4 * d.cap){ tailPen = false; continue; }
        tailPath += (tailPen ? 'L' : 'M') + X(p.re).toFixed(2) + ',' + Y(p.im).toFixed(2);
        tailPen = true;
      }
      g.appendChild(mk('path', { class: 'nyq-tail', d: tailPath }));
      const last = d.tail[d.tail.length - 1];
      if (isFinite(last.re) && isFinite(last.im))
        g.appendChild(mk('text', { class: 'nyq-tail-lab', x: X(last.re) + 6, y: Y(last.im) - 6 },
                         t(last.infinite ? 'nyqInfinity' : 'nyqHighFreq')));
    }

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
    if (showMargins){
      const m = marginData;
      const l1 = m.pm !== null
        ? `L(s) · ${t('margPhase')} : ${fmt(m.pm)}°  (ω = ${fmt(m.wc)})`
        : `L(s) · ${t('margPhase')} : ${t('margNone')}`;
      const l2 = m.gm !== null
        ? `L(s) · ${t('margGain')} : ${fmt(m.gm)} dB  (ω = ${fmt(m.w180)})`
        : `L(s) · ${t('margGain')} : ${t('margNone')}`;
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
