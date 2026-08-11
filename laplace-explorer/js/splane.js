'use strict';
/* Plan s (cahier §4) : rendu SVG + interactions (drag, clamp, snap, fusion,
   sélection, guides géométriques, 1:1/badge). */
const SPlane = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('splane-svg');
  const body = document.getElementById('splane-body');
  const toastEl = document.getElementById('toast');
  const badge = document.getElementById('aspect-badge');

  let W = 300, H = 300;
  let tf = { sx: 30, sy: 30, x0: 150, y0: 150 };   // données → px : x = x0 + σ·sx ; y = y0 − ω·sy

  function computeTransform(){
    const win = Model.state.view.sigmaWindow;
    const oR = Model.state.omegaRange;
    const dS = win.max - win.min, dW = oR.max - oR.min;
    let sx, sy;
    if (Model.state.view.aspectLock){
      sx = sy = Math.min(W / dS, H / dW);          // 1:1 : échelle unique, les deux rangs restent visibles
    } else {
      sx = W / dS; sy = H / dW;                    // libre : remplit le panneau
    }
    const cs = (win.min + win.max) / 2, cw = (oR.min + oR.max) / 2;
    tf = { sx, sy, x0: W / 2 - cs * sx, y0: H / 2 + cw * sy };
  }
  // fenêtre réellement visible (peut déborder la fenêtre demandée en mode 1:1)
  function effectiveWindow(){
    return { sMin: invX(0), sMax: invX(W), oMin: invY(H), oMax: invY(0) };
  }
  const X = s => tf.x0 + s * tf.sx;
  const Y = w => tf.y0 - w * tf.sy;
  const invX = x => (x - tf.x0) / tf.sx;
  const invY = y => (tf.y0 - y) / tf.sy;

  function mk(name, attrs, text){
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  const SUPT = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
                 '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const dispNum = v => {
    if (v === 0) return '0';
    const a = Math.abs(v);
    let s;
    if (a < 1e-4 || a >= 1e5){
      const [m, e] = v.toExponential(2).split('e');
      s = `${Number(m)}·10${String(Number(e)).split('').map(c => SUPT[c] || c).join('')}`;
    } else {
      s = String(Number(v.toPrecision(8)));
    }
    return s.replace(/-/g, '−');
  };

  // pas de grille « rond » (1, 2 ou 5 × 10^k) adapté au zoom courant :
  // lignes espacées d'au moins ~45 px quelle que soit l'échelle
  function gridStep(pxPerUnit){
    const target = 45 / pxPerUnit;
    const p = Math.pow(10, Math.floor(Math.log10(target)));
    const m = target / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }

  // ---------- rendu ----------
  function render(){
    measure();                       // dimensions relues à chaque rendu
    computeTransform();
    svg.innerHTML = '';
    const frag = document.createDocumentFragment();

    const sMin = invX(0), sMax = invX(W), wTop = invY(0), wBot = invY(H);

    // demi-plan droit teinté (« zone interdite » pour les pôles)
    if (X(0) < W)
      frag.appendChild(mk('rect', { x: X(0), y: 0, width: W - X(0), height: H,
                                    fill: 'var(--forbidden)', opacity: 0.7 }));

    // grille + graduations
    const stX = gridStep(tf.sx), stY = gridStep(tf.sy);
    for (let s = Math.ceil(sMin / stX) * stX; s <= sMax; s += stX){
      const v = Math.abs(s) < 1e-9 ? 0 : s;
      if (v !== 0) frag.appendChild(mk('line', { class: 'gridline', x1: X(v), y1: 0, x2: X(v), y2: H }));
      if (v !== 0) frag.appendChild(mk('text', { class: 'tick', x: X(v) + 2, y: Y(0) + 11 }, dispNum(v)));
    }
    for (let w = Math.ceil(wBot / stY) * stY; w <= wTop; w += stY){
      const v = Math.abs(w) < 1e-9 ? 0 : w;
      if (v !== 0) frag.appendChild(mk('line', { class: 'gridline', x1: 0, y1: Y(v), x2: W, y2: Y(v) }));
      if (v !== 0) frag.appendChild(mk('text', { class: 'tick', x: X(0) + 4, y: Y(v) - 3 }, dispNum(v)));
    }

    // axes
    frag.appendChild(mk('line', { class: 'axis', x1: 0, y1: Y(0), x2: W, y2: Y(0) }));
    frag.appendChild(mk('line', { class: 'axis' + (Model.ui.snapped ? ' snapped' : ''),
                                  x1: X(0), y1: 0, x2: X(0), y2: H }));
    frag.appendChild(mk('text', { class: 'axis-name', x: W - 14, y: Y(0) - 6 }, 'σ'));
    frag.appendChild(mk('text', { class: 'axis-name', x: X(0) + 6, y: 14 }, 'jω'));

    // Bode en log₁₀ : marquer les décades sur l'axe jω — elles se resserrent
    // près de l'origine et montrent quelle portion de l'axe le Bode étire (§6)
    const bw = Model.bodeWindow();
    if (bw.log){
      for (let p = Math.floor(Math.log10(bw.min) + 1e-9); p <= Math.ceil(Math.log10(bw.max) - 1e-9); p++){
        const w = Math.pow(10, p);
        if (w < bw.min * (1 - 1e-9) || w > bw.max * (1 + 1e-9)) continue;
        const y = Y(w);
        if (y < 0 || y > H) continue;
        frag.appendChild(mk('line', { class: 'dec-tick', x1: X(0) - 5, y1: y, x2: X(0) + 5, y2: y }));
      }
    }

    // guides géométriques de l'élément sélectionné (calculés en coordonnées de données)
    const selId = Model.ui.selectedId;
    const rows = Model.inventoryData();
    const selRow = rows.find(r => r.id === selId);
    if (selRow) drawGuides(frag, selRow);

    // mode règle et compas : segments du point jω vers chaque racine (cahier §6 bis)
    if (Model.state.view.ruler.on) drawRuler(frag);
    // point d'évaluation sur l'axe jω : jumeau du marqueur du Bode, toujours visible
    if (Model.state.view.showBode || Model.state.view.ruler.on) drawEvalPoint(frag);

    // pôles et zéros
    for (const row of rows) frag.appendChild(buildItem(row));

    svg.appendChild(frag);

    // badge de rapport d'aspect (1:1 décoché)
    const locked = Model.state.view.aspectLock;
    badge.classList.toggle('hidden', locked);
    if (!locked) badge.textContent = '1 : ' + (tf.sy / tf.sx).toFixed(2);
  }

  function drawGuides(frag, row){
    const e = row.el;
    const s = e.sigma, w = e.type === 'pair' ? e.omega : 0;
    const wn = Math.hypot(s, w);
    if (wn < 1e-9) return;                        // élément à l'origine : rien à tracer
    const ox = X(0), oy = Y(0), px = X(s), py = Y(w);
    // cercle de rayon ωₙ centré à l'origine (ellipse en aspect libre : lieu correct en données)
    frag.appendChild(mk('ellipse', { class: 'guide', cx: ox, cy: oy, rx: wn * tf.sx, ry: wn * tf.sy }));
    // rayon origine → élément (angle θ)
    frag.appendChild(mk('line', { class: 'guide', x1: ox, y1: oy, x2: px, y2: py }));
    // projections pointillées sur les axes
    if (Math.abs(w) > 1e-9){
      frag.appendChild(mk('line', { class: 'guide', x1: px, y1: py, x2: px, y2: oy }));
      frag.appendChild(mk('line', { class: 'guide', x1: px, y1: py, x2: ox, y2: py }));
    }
    frag.appendChild(mk('text', { class: 'guide-label', x: px + 12, y: py - 8 },
                        row.kind === 'pole' ? 'ωₙ = |p|' : '|z|'));
    if (row.kind === 'pole' && e.type === 'pair')
      frag.appendChild(mk('text', { class: 'guide-label',
                                    x: (ox + px) / 2 + 6, y: py + (oy - py) * 0.35 }, 'cos θ = ξ'));
  }

  // ---------- règle et compas (cahier §6 bis) ----------
  const ARC_R = 22;
  function drawRuler(frag){
    const data = Model.rulerData();
    if (!data) return;
    const show = Model.state.view.ruler.show;
    const withDist = show === 'dist' || show === 'both';
    const withAng = show === 'angles' || show === 'both';
    const ex = X(0), ey = Y(data.omega);

    for (const p of data.points){
      const px = X(p.sigma), py = Y(p.omega);
      const cls = p.kind === 'zero' ? 'num' : 'den';
      frag.appendChild(mk('line', { class: 'ruler-seg ' + cls, x1: px, y1: py, x2: ex, y2: ey }));

      if (withAng){
        // rayon de référence horizontal + arc de l'angle θ (racine → jω)
        frag.appendChild(mk('line', { class: 'ruler-ref ' + cls,
                                      x1: px, y1: py, x2: px + ARC_R + 6, y2: py }));
        const th = p.theta * Math.PI / 180;
        const ax = px + ARC_R * Math.cos(th), ay = py - ARC_R * Math.sin(th);
        frag.appendChild(mk('path', { class: 'ruler-arc ' + cls,
          d: `M${(px + ARC_R).toFixed(2)},${py.toFixed(2)} A${ARC_R},${ARC_R} 0 0 ${p.theta > 0 ? 0 : 1} ${ax.toFixed(2)},${ay.toFixed(2)}` }));
        const lx = px + (ARC_R + 7) * Math.cos(th / 2), ly = py - (ARC_R + 7) * Math.sin(th / 2);
        frag.appendChild(mk('text', { class: 'ruler-lab ' + cls, x: lx, y: ly + 3 },
                            fmtAng(p.theta)));
      }

      if (withDist){
        // étiquette de distance au milieu du segment (exposant si multiplicité)
        const mx = (px + ex) / 2, my = (py + ey) / 2;
        const dx = ex - px, dy = ey - py, len = Math.hypot(dx, dy) || 1;
        const ox = -dy / len * 9, oy = dx / len * 9;
        frag.appendChild(mk('text', { class: 'ruler-lab ' + cls, x: mx + ox, y: my + oy + 3,
                                      'text-anchor': 'middle' },
                            fmtDist(p.d) + (p.mult > 1 ? Model.sup(p.mult) : '')));
      }
    }

  }

  // Point d'évaluation sur l'axe jω — draggable, contraint à l'axe.
  // Il matérialise dans le plan s la fréquence lue par le marqueur du Bode :
  // orange comme ω_éval, violet quand c'est ω_in qui tient le rôle (§6 bis).
  function drawEvalPoint(frag){
    const w = Model.evalOmega();
    if (w === null || !isFinite(w)) return;
    const sine = Model.state.input.type === 'sine';
    const ex = X(0), ey = Y(w);
    const g = mk('g', { class: 'eval-pt' + (sine ? ' sine' : '') });
    g.appendChild(mk('circle', { class: 'eval-halo', cx: ex, cy: ey, r: 9 }));
    g.appendChild(mk('circle', { class: 'eval-core', cx: ex, cy: ey, r: 5 }));
    g.appendChild(mk('text', { class: 'eval-lab', x: ex + 11, y: ey - 8 },
                    'jω = ' + fmtDist(w)));
    g.appendChild(mk('circle', { class: 'hit', cx: ex, cy: ey, r: 14 }));
    frag.appendChild(g);
  }
  const fmtDist = v => dispNum(Number(v.toPrecision(3)));
  const fmtAng = v => dispNum(Math.round(v * 10) / 10) + '°';

  function buildItem(row){
    const e = row.el;
    const selected = Model.ui.selectedId === row.id;
    const g = mk('g', { class: 'sp-item' + (selected ? ' selected' : '')
                               + (Model.ui.dragId === row.id ? ' dragging' : '') });
    g.dataset.id = row.id;
    const positions = e.type === 'pair'
      ? [[e.sigma, e.omega], [e.sigma, -e.omega]]
      : [[e.sigma, 0]];
    const fuse = Model.ui.fuse;
    for (const [s, w] of positions){
      const x = X(s), y = Y(w);
      if (selected) g.appendChild(mk('circle', { class: 'halo', cx: x, cy: y, r: 11 }));
      if (fuse && fuse.targetId === row.id)
        g.appendChild(mk('circle', { class: 'fuse-ring' + (fuse.refused ? ' refused' : ''),
                                     cx: x, cy: y, r: 13 }));
      if (row.kind === 'pole'){
        // croix vectorielle : centrage géométrique exact sur (σ, ω)
        const a = 5.5;
        g.appendChild(mk('line', { class: 'marker-x', x1: x - a, y1: y - a, x2: x + a, y2: y + a }));
        g.appendChild(mk('line', { class: 'marker-x', x1: x - a, y1: y + a, x2: x + a, y2: y - a }));
      } else {
        g.appendChild(mk('circle', { class: 'marker', cx: x, cy: y, r: 6 }));
      }
      if (e.mult > 1)
        g.appendChild(mk('text', { class: 'mult-exp ' + row.kind, x: x + 9, y: y - 8 },
                         '×' + e.mult));
      g.appendChild(mk('circle', { class: 'hit', cx: x, cy: y, r: 13 }));
    }
    return g;
  }

  // ---------- interactions ----------
  // drag d'élément (bouton gauche sur un marqueur) · pan (glisser ailleurs,
  // n'importe quel bouton) · zoom (molette, centré sur le curseur) ·
  // bords du panneau = zoom par axe (façon Plotly), synchronisé avec le Bode ·
  // flèches du clavier = déplacement fin de l'élément sélectionné
  const EDGE = 16;                       // largeur des bandes de bord (px)
  let drag = null;   // {mode:'item'|'pan'|'axiszoom', id?, moved, x, y, win?, sx?, sy?, button, ax?, ay?}

  svg.addEventListener('contextmenu', ev => ev.preventDefault());

  function edgeZone(x, y){
    return { ax: x < EDGE || x > W - EDGE, ay: y < EDGE || y > H - EDGE };
  }

  svg.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    measure();                       // zones de saisie toujours calées sur le tracé
    // reprendre le focus clavier (preventDefault empêche le blur naturel)
    if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
    const item = ev.target.closest('.sp-item');
    const evalPt = ev.target.closest('.eval-pt');
    if (item && ev.button === 0){
      drag = { mode: 'item', id: item.dataset.id, moved: false, x: ev.clientX, y: ev.clientY };
    } else if (evalPt && ev.button === 0){
      drag = { mode: 'eval', moved: false, x: ev.clientX, y: ev.clientY };
    } else {
      const r = svg.getBoundingClientRect();
      const z = edgeZone(ev.clientX - r.left, ev.clientY - r.top);
      if ((z.ax || z.ay) && ev.button === 0){
        drag = { mode: 'axiszoom', ax: z.ax, ay: z.ay, moved: false,
                 x: ev.clientX, y: ev.clientY, win: effectiveWindow() };
      } else {
        drag = { mode: 'pan', moved: false, x: ev.clientX, y: ev.clientY,
                 win: effectiveWindow(), sx: tf.sx, sy: tf.sy, button: ev.button };
      }
    }
    try { svg.setPointerCapture(ev.pointerId); } catch (_) { /* pointeur synthétique */ }
  });

  svg.addEventListener('pointermove', ev => {
    if (!drag){
      // curseur indicatif sur les bandes de bord
      const r = svg.getBoundingClientRect();
      const z = edgeZone(ev.clientX - r.left, ev.clientY - r.top);
      svg.style.cursor = z.ax && z.ay ? 'nwse-resize' : z.ax ? 'ns-resize' : z.ay ? 'ew-resize' : '';
      return;
    }
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    if (drag.mode === 'item'){
      if (!drag.moved){ drag.moved = true; Model.select(drag.id); }
      const r = svg.getBoundingClientRect();
      Model.dragTo(drag.id, invX(ev.clientX - r.left), invY(ev.clientY - r.top), tf.sx, tf.sy);
    } else if (drag.mode === 'eval'){
      drag.moved = true;
      const r = svg.getBoundingClientRect();
      Model.setOmegaEval(invY(ev.clientY - r.top));   // contraint à l'axe jω, borné ω ≥ 0
    } else if (drag.mode === 'axiszoom'){
      drag.moved = true;
      const w = drag.win;
      let fS, fW;
      if (Model.state.view.aspectLock){
        // 1:1 verrouillé : un zoom par axe serait invisible (ajustement contain)
        // → zoom uniforme des deux axes, cohérent avec le Bode
        const f = drag.ax && drag.ay ? Math.exp((-dx + dy) / 400)
                : drag.ax ? Math.exp(dy / 200)
                : Math.exp(-dx / 200);
        fS = fW = f;
      } else {
        fS = drag.ay ? Math.exp(-dx / 200) : 1;          // bandes haut/bas : échelle σ
        fW = drag.ax ? Math.exp(dy / 200) : 1;           // bandes gauche/droite : échelle ω
      }
      const cS = (w.sMin + w.sMax) / 2, cW = (w.oMin + w.oMax) / 2;
      const sMin = cS + (w.sMin - cS) * fS, sMax = cS + (w.sMax - cS) * fS;
      const oMin = cW + (w.oMin - cW) * fW, oMax = cW + (w.oMax - cW) * fW;
      if (sMax - sMin >= 1e-6 && sMax - sMin <= 1e9 && oMax - oMin >= 1e-6 && oMax - oMin <= 1e9)
        Model.setPlaneWindow(sMin, sMax, oMin, oMax);
    } else {
      drag.moved = true;
      const dS = -dx / drag.sx, dW = dy / drag.sy;
      Model.setPlaneWindow(drag.win.sMin + dS, drag.win.sMax + dS,
                           drag.win.oMin + dW, drag.win.oMax + dW);
    }
  });

  svg.addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.mode === 'item'){
      if (!drag.moved){
        Model.select(drag.id);
      } else {
        const res = Model.endDrag(drag.id, tf.sx, tf.sy);
        if (res.msg) showToast(t(res.msg));
      }
    } else if (drag.mode === 'pan' && !drag.moved && drag.button === 0){
      if (Model.ui.selectedId) Model.select(null);
    }
    drag = null;
  });

  // flèches du clavier : déplacement fin de l'élément sélectionné
  // (pas = 1/10 du pas de grille courant ; Maj = ×10 ; sans aimantation)
  document.addEventListener('keydown', ev => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    // laisser les flèches aux contrôles qui s'en servent (champs, listes, slider) ;
    // une case à cocher focalisée ne les utilise pas → déplacer l'élément
    const a = document.activeElement;
    if (a && (a.tagName === 'SELECT' || a.tagName === 'TEXTAREA' ||
              (a.tagName === 'INPUT' && a.type !== 'checkbox'))) return;
    const id = Model.ui.selectedId;
    if (!id) return;
    const f = Model.find(id);
    if (!f) return;
    ev.preventDefault();
    const base = gridStep(tf.sx) / 10;
    const step = ev.shiftKey ? base * 10 : base;
    let dS = 0, dW = 0;
    if (ev.key === 'ArrowLeft') dS = -step;
    else if (ev.key === 'ArrowRight') dS = step;
    else if (ev.key === 'ArrowUp') dW = step;
    else dW = -step;
    const w0 = f.el.type === 'pair' ? f.el.omega : 0;
    Model.dragTo(id, f.el.sigma + dS, w0 + dW, tf.sx, tf.sy, { snap: false, track: false });
  });

  // double-clic sur le fond : auto-échelle sur le contenu (origine incluse)
  svg.addEventListener('dblclick', ev => {
    if (ev.target.closest('.sp-item')) return;
    autoScale();
  });
  function autoScale(){
    const pts = [[0, 0]];                       // l'origine et les axes restent visibles
    for (const list of [Model.state.poles, Model.state.zeros])
      for (const el of list){
        pts.push([el.sigma, el.omega || 0]);
        if (el.type === 'pair') pts.push([el.sigma, -el.omega]);
      }
    const sMin = Math.min(...pts.map(p => p[0])), sMax = Math.max(...pts.map(p => p[0]));
    const oMin = Math.min(...pts.map(p => p[1])), oMax = Math.max(...pts.map(p => p[1]));
    const padS = Math.max((sMax - sMin) * 0.2, 1);
    const padO = Math.max((oMax - oMin) * 0.2, 1);
    Model.setPlaneWindow(sMin - padS, sMax + padS, oMin - padO, oMax + padO);
  }

  svg.addEventListener('wheel', ev => {
    ev.preventDefault();
    const r = svg.getBoundingClientRect();
    const sc = invX(ev.clientX - r.left), wc = invY(ev.clientY - r.top);
    const f = Math.exp(ev.deltaY * 0.001);
    const w = effectiveWindow();
    const span = Math.max(w.sMax - w.sMin, w.oMax - w.oMin) * f;
    if (span < 1e-6 || span > 1e9) return;      // garde-fous numériques seulement
    Model.setPlaneWindow(
      sc - (sc - w.sMin) * f, sc + (w.sMax - sc) * f,
      wc - (wc - w.oMin) * f, wc + (w.oMax - wc) * f);
  }, { passive: false });

  // ---------- toast (messages brefs : refus de fusion, m ≤ n, etc.) ----------
  let toastTimer = null;
  function showToast(text){
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2400);
  }

  // panneau caché ou réduit à zéro : conserver les dimensions précédentes
  function measure(){
    W = body.clientWidth || W;
    H = body.clientHeight || H;
  }
  function resize(){ measure(); render(); }

  return { render, resize, showToast };
})();
