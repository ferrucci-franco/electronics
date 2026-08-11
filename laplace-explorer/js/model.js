'use strict';
/* État global — source de vérité unique (cahier §2).
   Tous les panneaux sont des fonctions de rendu de cet état. */
const Model = (() => {

  const N_MAX = 8;        // degré maximal (cahier §1) — modifiable ici
  const SNAP_PX = 8;      // ε de snap sur l'axe jω, en pixels écran (décision J1)
  const FUSE_PX = 10;     // ε de fusion par glisser, en pixels écran (décision J1)

  // Drapeau de configuration — comportement du marqueur d'évaluation du Bode :
  //   false (défaut) → il ne bouge qu'au clic ou au glisser, comme ω_in ;
  //   true           → il suit le curseur tant que la construction géométrique
  //                    est décochée (comportement d'origine du survol).
  const EVAL_FOLLOWS_CURSOR = false;

  let nextId = 1;

  const state = {
    poles: [],            // {id, type:'real'|'pair', sigma, omega, mult} — omega absent si real
    zeros: [],
    K: 1,
    omegaRange: { min: -4, max: 4 },     // rang ω partagé plan s / 3D / Bode — seul le plan s l'utilise en J1
    omegaEval: 2,                        // point d'évaluation partagé — marqueur unique du Bode (§6 bis)
    delay: 0,                            // retard pur T, en secondes (cahier §1 bis, jalon J9)
    input: { type: 'step', omegaIn: 1 }, // hors périmètre J1 (jalons J3/J4)
    view: {
      show3d: false, showBode: true, showTime: true, surfMode: 'mag',
      logScale: false,
      aspectLock: true, showTransient: true, eqCollapsed: true, eqFit: true, eqFreq: false,
      sidebarHidden: false,
      bodeUnwrap: true, omegaLogDecades: 3, bodeShowPhase: true,
      bodeMode: 'bode',                   // 'bode' | 'nyquist' | 'both' (§6 ter)
      nyqRevers: false,                   // références du critère du revers
      surfPalette: 'viridis',             // palette de la surface 3D (§7) : 'greys' | 'viridis' | 'hot'
      surfDetail: 'med',                  // niveau de détail : 'med' (normal) | 'high'
      clipFactor: 1,                      // écrêtage : facteur relatif au niveau auto (1 = auto)
      bodeMagZoom: 1, bodePhZoom: 1,     // échelles manuelles des axes Y du Bode (1 = auto)
      timeT: null,                        // durée de simulation manuelle (null = auto)
      ruler: { on: false, show: 'both' }, // règle et compas : 'dist' | 'angles' | 'both'
      timeXWin: null, timeYWin: null,     // fenêtre de vue du tracé temporel (null = auto)
      theme: 'light', lang: 'fr',
      sigmaWindow: { min: -5, max: 1.5 }   // fenêtre σ du plan s (complément du rang ω)
    }
  };

  // État éphémère d'interface (hors état global du cahier)
  const ui = {
    selectedId: null,
    kAuto: true,          // K auto-normalisé (H(0)=1) tant que le slider n'a pas été touché
    dragId: null,
    snapped: false,       // σ aimanté sur l'axe jω pendant le drag (feedback visuel)
    fuse: null            // {targetId, refused} — candidat de fusion pendant le drag
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
  function evalHjw(w){
    const { num, den } = polys();
    const [nr, ni] = hornerIm(num, w);
    const [dr, di] = hornerIm(den, w);
    const d2 = dr * dr + di * di;
    if (d2 === 0) return { re: Infinity, im: 0, mag: Infinity };
    const K = state.K;
    let re = K * (nr * dr + ni * di) / d2;
    let im = K * (ni * dr - nr * di) / d2;
    // Retard pur (cahier §1 bis) : multiplication par e^(−jωT). C'est ici et
    // nulle part ailleurs qu'il entre — Bode, Nyquist, règle et compas,
    // enveloppe sinusoïdale et trace de coupe 3D l'héritent d'un coup et
    // restent donc forcément d'accord. |e^(−jωT)| = 1 : le module ne bouge pas.
    const T = state.delay;
    if (T > 0){
      const c = Math.cos(w * T), s = Math.sin(w * T);
      const r2 = re * c + im * s;
      im = im * c - re * s;
      re = r2;
    }
    return { re, im, mag: Math.hypot(re, im) };
  }

  function order(list){ return list.reduce((s, el) => s + el.mult * (el.type === 'pair' ? 2 : 1), 0); }
  function counts(){ return { n: order(state.poles), m: order(state.zeros) }; }

  function find(id){
    let el = state.poles.find(e => e.id === id);
    if (el) return { el, list: state.poles, kind: 'pole' };
    el = state.zeros.find(e => e.id === id);
    if (el) return { el, list: state.zeros, kind: 'zero' };
    return null;
  }

  // ---------- gain K ----------
  function refreshAutoK(){
    if (!ui.kAuto) return;
    const { num, den } = polys();
    const n0 = num[num.length - 1], d0 = den[den.length - 1];
    state.K = (Math.abs(n0) > 1e-12 && Math.abs(d0) > 1e-12) ? d0 / n0 : 1;
  }
  function setK(v){ state.K = v; ui.kAuto = false; notify(); }
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
  function setKAuto(on){ ui.kAuto = !!on; if (ui.kAuto) refreshAutoK(); notify(); }

  // ---------- ajout ----------
  const DEFAULT_POS = {
    'pole:real': { sigma: -1,   omega: 0 },
    'pole:pair': { sigma: -1,   omega: 2 },
    'zero:real': { sigma: -0.5, omega: 0 },
    'zero:pair': { sigma: -0.5, omega: 1 }
  };
  function freePosition(kind, shape){
    const list = kind === 'pole' ? state.poles : state.zeros;
    const p = { ...DEFAULT_POS[kind + ':' + shape] };
    while (list.some(e => e.type === shape &&
                          Math.abs(e.sigma - p.sigma) < 0.25 &&
                          Math.abs((e.omega || 0) - p.omega) < 0.25))
      p.sigma -= 0.5;
    return p;
  }
  function canAdd(kind, shape){
    const d = shape === 'pair' ? 2 : 1;
    const { n, m } = counts();
    return kind === 'pole' ? n + d <= N_MAX : m + d <= n;
  }
  function addElement(kind, shape){
    const d = shape === 'pair' ? 2 : 1;
    const { n, m } = counts();
    if (kind === 'pole' && n + d > N_MAX) return { ok: false, msg: 'msgNmax' };
    if (kind === 'zero' && m + d > n) return { ok: false, msg: 'msgCausality' };
    const pos = freePosition(kind, shape);
    const el = { id: 'e' + (nextId++), type: shape, sigma: pos.sigma, mult: 1 };
    if (shape === 'pair') el.omega = pos.omega;
    (kind === 'pole' ? state.poles : state.zeros).push(el);
    refreshAutoK(); notify();
    return { ok: true, id: el.id };
  }

  // ---------- suppression / décrément ----------
  function removeElement(id){
    const f = find(id); if (!f) return { ok: false };
    const d = f.el.mult * (f.el.type === 'pair' ? 2 : 1);
    const { n, m } = counts();
    if (f.kind === 'pole' && n - d < m) return { ok: false, msg: 'msgOrderPole' };
    f.list.splice(f.list.indexOf(f.el), 1);
    if (ui.selectedId === id) ui.selectedId = null;
    refreshAutoK(); notify();
    return { ok: true };
  }
  function decrementElement(id){
    const f = find(id); if (!f) return { ok: false };
    if (f.el.mult === 1) return removeElement(id);
    const d = f.el.type === 'pair' ? 2 : 1;
    const { n, m } = counts();
    if (f.kind === 'pole' && n - d < m) return { ok: false, msg: 'msgOrderPole' };
    f.el.mult -= 1;
    refreshAutoK(); notify();
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
    if (!isFinite(sigma) || !isFinite(omega) || !isFinite(mult) || mult < 1)
      return { ok: false, msg: 'msgBadValue' };
    if (f.kind === 'pole' && sigma > 0) sigma = 0;           // Re(p) ≤ 0 strict (clamp)
    if (el.type === 'pair') omega = Math.abs(omega);
    // Multiplicité max 1 sur l'axe jω ; pas de paire dégénérée à l'origine (cahier §1)
    if (sigma === 0 && (mult > 1 || (el.type === 'pair' && omega === 0)))
      return { ok: false, msg: 'msgAxisMult' };
    // Contraintes d'ordre : n ≤ N_MAX et m ≤ n
    const per = el.type === 'pair' ? 2 : 1;
    const { n, m } = counts();
    if (f.kind === 'pole'){
      const n2 = n + (mult - el.mult) * per;
      if (n2 > N_MAX) return { ok: false, msg: 'msgNmax' };
      if (n2 < m) return { ok: false, msg: 'msgOrderPole' };
    } else {
      const m2 = m + (mult - el.mult) * per;
      if (m2 > n) return { ok: false, msg: 'msgCausality' };
    }
    el.sigma = sigma;
    if (el.type === 'pair') el.omega = omega;
    el.mult = mult;
    refreshAutoK(); notify();
    return { ok: true };
  }

  // ---------- drag (clamp + snap, cahier §1 et §4) ----------
  // sx, sy : échelles courantes du plan s en px par unité.
  // opts.snap = false : pas d'aimantation (déplacement clavier) ;
  // opts.track = false : ne pas marquer drag/fusion (déplacement clavier).
  function dragTo(id, sigma, omega, sx, sy, opts = {}){
    const snap = opts.snap !== false, track = opts.track !== false;
    const f = find(id); if (!f) return;
    const el = f.el;
    const epsS = SNAP_PX / sx, epsW = SNAP_PX / sy;
    if (f.kind === 'pole' && sigma > 0) sigma = 0;            // clamp : le pôle bute sur l'axe jω
    let snapped = false;
    if (Math.abs(sigma) < epsS){
      const originPair = el.type === 'pair' && Math.abs(omega) < 2 * epsW;
      const allowed = el.mult === 1 && !originPair;
      if (allowed && snap){
        sigma = 0; snapped = true;                            // snap σ → 0 exact
      } else if (!allowed){
        if (f.kind === 'pole') sigma = Math.min(sigma, -epsS); // mult > 1 : l'axe est interdit
        else sigma = sigma < 0 ? -epsS : epsS;
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
    refreshAutoK(); notify();
  }

  function fusionCandidate(id, sx, sy){
    const f = find(id); if (!f) return null;
    const el = f.el;
    let best = null, bestD = FUSE_PX;
    for (const other of f.list){
      if (other === el || other.type !== el.type) continue;
      const d = Math.hypot((other.sigma - el.sigma) * sx,
                           ((other.omega || 0) - (el.omega || 0)) * sy);
      if (d < bestD){ bestD = d; best = other; }
    }
    if (!best) return null;
    return { targetId: best.id, refused: best.sigma === 0 };  // fusion refusée sur l'axe jω
  }

  function endDrag(id, sx, sy){
    const cand = fusionCandidate(id, sx, sy);
    ui.dragId = null; ui.snapped = false; ui.fuse = null;
    if (!cand){ notify(); return { ok: true }; }
    if (cand.refused){ notify(); return { ok: false, msg: 'msgAxisFusion' }; }
    const f = find(id), g = find(cand.targetId);
    g.el.mult += f.el.mult;
    f.list.splice(f.list.indexOf(f.el), 1);
    if (ui.selectedId === id) ui.selectedId = g.el.id;
    refreshAutoK(); notify();
    return { ok: true, fused: true };
  }

  // ---------- sélection ----------
  function select(id){ ui.selectedId = id; notify(); }

  // ---------- mode règle et compas (cahier §6 bis) ----------
  // ω_éval : point d'évaluation partagé (Bode ↔ plan s ↔ 3D).
  // Marqueur unique du Bode : il suit le curseur tant que la construction est
  // désactivée, et devient fixe (déplaçable au glisser) une fois la case cochée.
  function setRuler(patch){
    Object.assign(state.view.ruler, patch);
    notify();
  }
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
          out.push({ kind, id: el.id, label: `${letter}${sub(i)}`,
                     sigma: el.sigma, omega: el.omega, mult: el.mult });
          out.push({ kind, id: el.id, label: `${letter}${sub(i + 1)}`,
                     sigma: el.sigma, omega: -el.omega, mult: el.mult });
          i += 2;
        } else {
          out.push({ kind, id: el.id, label: `${letter}${sub(i)}`,
                     sigma: el.sigma, omega: 0, mult: el.mult });
          i += 1;
        }
      }
    }
    return out;
  }

  // |H(jω)| = |K| · ∏ d(zᵢ)^kᵢ / ∏ d(pⱼ)^kⱼ
  // arg H(jω) = arg K + Σ kᵢ·θ(zᵢ) − Σ kⱼ·θ(pⱼ)   (θ = angle du segment racine → jω)
  function rulerData(){
    const w = evalOmega();
    if (w === null) return null;
    const K = state.K;
    const points = rootPoints().map(r => {
      const dx = 0 - r.sigma, dy = w - r.omega;
      return { ...r, d: Math.hypot(dx, dy), theta: Math.atan2(dy, dx) * 180 / Math.PI };
    });
    let numer = 1, denom = 1, phase = K < 0 ? 180 : 0;
    for (const p of points){
      const dk = Math.pow(p.d, p.mult);
      if (p.kind === 'zero'){ numer *= dk; phase += p.mult * p.theta; }
      else { denom *= dk; phase -= p.mult * p.theta; }
    }
    const mag = denom === 0 ? Infinity : Math.abs(K) * numer / denom;
    // Le retard ne touche pas au module (unimodulaire sur l'axe) et ajoute à la
    // somme des angles un terme qui n'est l'angle géométrique de rien : il ne se
    // lit sur aucun segment du plan s. Il est donc rendu à part (§1 bis).
    const delayPhase = -w * state.delay * 180 / Math.PI;
    return { omega: w, K, points, numer, denom, mag, delayPhase,
             phase: phase + delayPhase };
  }

  // ---------- inventaire : numérotation p₁,₂ / p₃ (format maquette) ----------
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sub = n => String(n).split('').map(c => SUB[+c]).join('');
  const sup = n => String(n).split('').map(c => SUP[+c]).join('');
  function inventoryData(){
    const rows = [];
    for (const [kind, list, letter] of [['pole', state.poles, 'p'], ['zero', state.zeros, 'z']]){
      let i = 1;
      for (const el of list){
        const label = el.type === 'pair' ? `${letter}${sub(i)},${sub(i + 1)}` : `${letter}${sub(i)}`;
        i += el.type === 'pair' ? 2 : 1;
        rows.push({ id: el.id, kind, el, label });
      }
    }
    return rows;
  }

  // ---------- vue ----------
  function setView(patch){ Object.assign(state.view, patch); notify(); }

  // Fenêtre ω du Bode (cahier §6, jalon J2c). L'intervalle reste celui du rang
  // partagé : en log₁₀ seule la borne basse change (0 n'est pas représentable),
  // ω_max — donc le zoom du plan s — n'est pas affecté par le nombre de décades.
  function bodeWindow(){
    const max = Math.max(state.omegaRange.max, 1e-9);
    const log = state.view.logScale;
    const dec = Math.max(1, Math.min(8, Math.round(state.view.omegaLogDecades)));
    return { log, dec, max, min: log ? max / Math.pow(10, dec) : 0 };
  }
  function setInput(patch){ Object.assign(state.input, patch); notify(); }

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
    state.delay = 0;
    state.omegaRange = { min: -4, max: 4 };
    state.omegaEval = 2;
    state.input = { type: 'step', omegaIn: 1 };
    Object.assign(state.view, {
      show3d: false, showBode: true, showTime: true, surfMode: 'mag',
      logScale: false, omegaLogDecades: 3,
      aspectLock: true, showTransient: true, eqCollapsed: true, eqFit: true, eqFreq: false,
      sidebarHidden: false,
      bodeUnwrap: true, bodeShowPhase: true,
      bodeMode: 'bode', nyqRevers: false,
      surfPalette: 'viridis', surfDetail: 'med', clipFactor: 1,
      bodeMagZoom: 1, bodePhZoom: 1,
      timeT: null, timeXWin: null, timeYWin: null,
      ruler: { on: false, show: 'both' },
      sigmaWindow: { min: -5, max: 1.5 }
    });
    ui.selectedId = null;
    ui.kAuto = true;
    ui.dragId = null;
    ui.snapped = false;
    ui.fuse = null;
    loadExample();
  }

  // ---------- contenu initial : exemple de la maquette v5 (décision J1) ----------
  function loadExample(){
    state.poles.push({ id: 'e' + (nextId++), type: 'pair', sigma: -1, omega: 2, mult: 1 });
    state.zeros.push({ id: 'e' + (nextId++), type: 'real', sigma: -0.5, mult: 1 });
    refreshAutoK(); notify();
  }

  return {
    N_MAX, EVAL_FOLLOWS_CURSOR, state, ui,
    onChange, counts, polys, evalHjw, find, canAdd,
    addElement, removeElement, decrementElement, editElement,
    dragTo, endDrag, select, setK, setKAuto, setDelay, setView, setInput, setPlaneWindow,
    setRuler, setOmegaEval, evalOmega, rootPoints, rulerData, bodeWindow,
    inventoryData, sub, sup, loadExample, reset
  };
})();
