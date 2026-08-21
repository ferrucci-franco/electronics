'use strict';
/* Surfaces 3D (cahier §7, jalons J5 et J6) — rendu Three.js.
   Reprend un prototype déjà validé ; les sept contraintes ci-dessous sont
   structurantes, ne pas les réinventer :
   1. pas de wireframe natif — deux couches : la nappe (MeshBasicMaterial,
      vertexColors, DoubleSide, polygonOffset) sert de masque d'occlusion, et
      les traits sont UN seul LineSegments construit à la main, un trait toutes
      les STEP mailles (6, ou 3 en maillage fin) ;
   2. au drag d'un pôle on écrit dans les Float32Array existants + needsUpdate —
      aucune allocation de géométrie par frame ; seul le tube de la trace est
      reconstruit, et seulement sur événement ;
   3. plafond linéaire : clip(|H|, 0, ZMAX) AVANT la mise à l'échelle verticale ;
   4. couleur : colormaps pleines — Gris / Viridis (défaut) / Chaud ; pas de
      parula, dont la table exacte appartient à MathWorks ;
   5. trace de coupe en TubeGeometry, pas en Line : linewidth est ignoré en WebGL ;
   6. renderer.setSize(w, h) avec updateStyle par défaut + canvas en
      display:block/100% — sinon devicePixelRatio fait déborder le canvas ;
   7. distance caméra calculée (ajustement sur la boîte englobante), jamais
      constante ; zoom molette et pincement.
   Orientation : σ croît vers la droite comme dans le plan s, ω s'éloigne (le
   plan s couché vers l'arrière), et tirer vers la droite fait tourner la scène
   vers la droite.

   J6 — deux surfaces : |H(s)| et arg H(s), au choix ou côte à côte. Les deux
   vues partagent le MÊME état de caméra (orbit + point visé), donc tourner
   l'une tourne l'autre, sans code de synchronisation.
   Surface de phase : z = arg H en degrés, **rang fixe [−180°, +180°]**, aucun
   autoscale et aucun écrêtage (la commande est masquée). Le repli de phase est
   rendu en **discontinuité franche** : toute maille dont les sommets sautent de
   plus de 180° est retirée, au lieu d'être interpolée à travers — sinon le
   saut devient un mur vertical qui n'existe pas. */
const Surface3D = (() => {

  const container = document.getElementById('surf-plot');
  const body = document.getElementById('surf-body');

  // ---------- constantes du prototype ----------
  // n : sommets par côté (n−1 divisible par step) · step : 1 trait toutes les step mailles
  const DETAIL = { med: { n: 97, step: 6 }, high: { n: 145, step: 3 } };
  const AXIS_OVER = 1.18;               // les axes dépassent un peu la boîte
  const ARROW_R = 0.028, ARROW_H = 0.10;   // pointes de flèche, fines
  const POLY_OFF = 1.2;                 // polygonOffset factor/units de la nappe
  // boîte cubique : la hauteur vaut l'étendue de σ et de ω
  const BOX_X = 1.0, BOX_Z = 1.0, BOX_Y = 2.0;
  const CLIP_MULT = 5;                  // plafond auto = 5 × le niveau hors résonance
  const WRAP_CUT = 180;                 // saut de phase au-delà duquel on coupe la maille
  const DYN_DB = 60;                    // dynamique en dB de repli, si |H(jω)| ne dit rien
  const TUBE_R = 0.009;
  const MARK_R = 0.035, MAX_MARK = 16, CIRC_SEG = 32;
  const DRAG_MS = 60;

  const detail = () => DETAIL[Model.state.view.surfDetail] || DETAIL.med;

  // ---------- état partagé par les deux vues ----------
  // Vue d'origine : azimut dans le premier quadrant — σ part vers la droite en
  // descendant, jω vers la droite en montant (il s'éloigne). C'est l'angle qui
  // dégage le mieux les deux volcans et le plan de coupe.
  const THETA0 = 0.78, PHI0 = 1.05;
  const orbit = { theta: THETA0, phi: PHI0, zoom: 1 };
  const target = new THREE.Vector3(0, BOX_Y / 2, 0);   // point visé — déplacé par le pan
  const _v = new THREE.Vector3(), _r = new THREE.Vector3();
  const _u = new THREE.Vector3(), _dir = new THREE.Vector3();
  const tmpC = new THREE.Color();
  let panes = [], ready = false, lastDrag = 0, pendingTimer = null, helpEl = null;

  // ---------- contrôles de l'en-tête ----------
  const functionSel = document.getElementById('surf-function');
  const modeSel = document.getElementById('surf-mode');
  const clipWrap = document.getElementById('clip-wrap');
  const clipSlider = document.getElementById('clip-slider');
  const clipValue = document.getElementById('clip-value');
  const paletteWrap = document.getElementById('palette-wrap');
  const paletteSel = document.getElementById('surf-palette');
  const detailSel = document.getElementById('surf-detail');
  functionSel.addEventListener('change', () => Model.setView({ surfaceFunction: functionSel.value }));
  modeSel.addEventListener('change', () => Model.setView({ surfMode: modeSel.value }));
  // Curseur relatif au niveau auto : au milieu = auto, ×10 de part et d'autre.
  clipSlider.addEventListener('input', () =>
    Model.setView({ clipFactor: Math.pow(10, (Number(clipSlider.value) - 50) / 50) }));
  paletteSel.addEventListener('change', () => Model.setView({ surfPalette: paletteSel.value }));
  detailSel.addEventListener('change', () => Model.setView({ surfDetail: detailSel.value }));

  // ---------- évaluation ----------
  function hornerC(c, re, im){
    let r = 0, i = 0;
    for (let k = 0; k < c.length; k++){
      const nr = r * re - i * im + c[k];
      i = r * im + i * re;
      r = nr;
    }
    return [r, i];
  }
  // valeur principale dans (−180°, +180°]
  const wrapDeg = d => { const x = (d + 180) % 360; return (x < 0 ? x + 360 : x) - 180; };
  const selectedFunction = () => ['P', 'C', 'S', 'L', 'T'].includes(Model.state.view.surfaceFunction)
    ? Model.state.view.surfaceFunction : 'L';
  function surfaceRoots(){
    const which = selectedFunction();
    if (which === 'T'){
      return [
        ...Model.closedLoopPoles().map(r => ({ ...r, kind: 'pole', owner: 'closed-loop' })),
        ...Model.closedLoopZeros().map(r => ({ ...r, kind: 'zero', owner: 'closed-loop' }))
      ];
    }
    const owner = { P: 'plant', C: 'controller', S: 'sensor' }[which];
    return Model.rootPoints().filter(r => !owner || r.owner === owner);
  }

  // Niveau d'écrêtage automatique : ≈ 5 × le niveau de |H(jω)| hors résonance
  function autoClip(){
    const which = selectedFunction();
    const bw = Model.bodeWindow();
    const vals = [];
    for (let i = 0; i <= 300; i++){
      const w = bw.log ? bw.min * Math.pow(10, (i / 300) * bw.dec) : bw.max * i / 300;
      const m = Model.evalTransferComplex(which, 0, w).mag;
      if (isFinite(m)) vals.push(m);
    }
    if (!vals.length) return 1;
    vals.sort((a, b) => a - b);
    return Math.max(CLIP_MULT * vals[Math.floor(vals.length * 0.95)], 1e-9);
  }
  const clipLevel = () => autoClip() * (Model.state.view.clipFactor || 1);

  // Plancher de l'échelle en dB, calculé sur les données et non fixé d'avance :
  // un plancher constant se faisait rattraper dès que la coupure descendait
  // (5 décades à −20 dB/déc font −100 dB), et la nappe s'écrasait à plat là où
  // le Bode montrait encore du relief. On prend le minimum de |H(jω)| sur le
  // rang courant, avec une marge pour les coins hors axe, borné entre 40 et
  // 140 dB de dynamique.
  function autoFloorDb(ceilDb){
    const which = selectedFunction();
    const bw = Model.bodeWindow();
    let mn = Infinity;
    for (let i = 0; i <= 300; i++){
      const w = bw.log ? bw.min * Math.pow(10, (i / 300) * bw.dec) : bw.max * i / 300;
      const m = Model.evalTransferComplex(which, 0, w).mag;
      if (isFinite(m) && m > 0) mn = Math.min(mn, 20 * Math.log10(m));
    }
    if (!isFinite(mn)) return ceilDb - DYN_DB;
    return Math.max(ceilDb - 140, Math.min(mn - 12, ceilDb - 40));
  }

  // ---------- couleur ----------
  const MAPS = {
    greys:   [[0.984,0.984,0.984],[0.925,0.925,0.925],[0.851,0.851,0.851],[0.741,0.741,0.741],
              [0.612,0.612,0.612],[0.478,0.478,0.478],[0.361,0.361,0.361],[0.259,0.259,0.259],
              [0.176,0.176,0.176],[0.106,0.106,0.106],[0.043,0.043,0.043]],
    viridis: [[0.267,0.005,0.329],[0.283,0.141,0.458],[0.254,0.265,0.530],[0.207,0.372,0.553],
              [0.164,0.471,0.558],[0.128,0.567,0.551],[0.135,0.659,0.518],[0.267,0.749,0.441],
              [0.478,0.821,0.318],[0.741,0.873,0.150],[0.993,0.906,0.144]],
    hot:     [[0.042,0.000,0.000],[0.300,0.000,0.000],[0.560,0.000,0.000],[0.820,0.000,0.000],
              [1.000,0.080,0.000],[1.000,0.340,0.000],[1.000,0.600,0.000],[1.000,0.860,0.000],
              [1.000,1.000,0.220],[1.000,1.000,0.610],[1.000,1.000,1.000]],
    // Palette CYCLIQUE pour la phase : −180° et +180° partagent la même couleur,
    // puisqu'ils sont la même valeur. Les deux lèvres du repli se rejoignent
    // donc en teinte, et la falaise se lit comme un pli et non comme deux
    // nappes étrangères. Table maison, sombre aux extrémités et claire au
    // milieu (0°), dans l'esprit d'une twilight.
    cyclic:  [[0.106,0.094,0.224],[0.180,0.278,0.545],[0.251,0.478,0.702],[0.451,0.678,0.800],
              [0.749,0.859,0.890],[0.949,0.929,0.902],[0.898,0.780,0.678],[0.827,0.600,0.502],
              [0.722,0.400,0.380],[0.451,0.220,0.298],[0.106,0.094,0.224]]
  };
  function cssRGB(name){
    const c = new THREE.Color();
    c.setStyle(getComputedStyle(document.body).getPropertyValue(name).trim() || '#888');
    return c;
  }
  function colorAt(t01, mapName, out){
    const tab = MAPS[mapName] || MAPS.viridis;
    const f = Math.max(0, Math.min(1, t01)) * (tab.length - 1);
    const i = Math.min(tab.length - 2, Math.floor(f)), u = f - i;
    const a = tab[i], b = tab[i + 1];
    return out.setRGB(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
  }

  // updatePane déclare un compteur local nommé `t` (indices de triangles) qui
  // masque la fonction t() de l'i18n dans toute sa portée — zone morte
  // temporelle à la clé. On garde donc un alias pris ici, où rien ne l'ombre.
  const i18n = (k, v) => t(k, v);

  // ---------- construction d'une vue ----------
  function makePane(kind){
    const host = document.createElement('div');
    host.className = 'surf-pane';
    container.appendChild(host);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'surf-canvas';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200);

    const p = { kind, host, renderer, scene, camera, visible: true,
                gridN: 0, gridStep: 0, poolMax: 0, lineIdx: [], tubes: [] };

    // nappe : masque d'occlusion, décalée en profondeur pour que les traits se
    // posent dessus sans z-fighting (contrainte 1)
    p.sheetMat = new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: POLY_OFF, polygonOffsetUnits: POLY_OFF
    });
    p.lineMat = new THREE.LineBasicMaterial({ color: 0x2b3440, transparent: true, opacity: 0.55 });

    // plan de coupe jω, gris et semi-transparent
    p.cutPos = new Float32Array(4 * 3);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(p.cutPos, 3));
    cg.setIndex([0, 1, 2, 0, 2, 3]);
    p.cutPlane = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({
      color: 0x8a939c, transparent: true, opacity: 0.17,
      side: THREE.DoubleSide, depthWrite: false
    }));
    scene.add(p.cutPlane);

    // plan complexe au sol
    p.floorPos = new Float32Array(4 * 3);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(p.floorPos, 3));
    fg.setIndex([0, 1, 2, 0, 2, 3]);
    p.floorPlane = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({
      color: 0x8a939c, transparent: true, opacity: 0.13,
      side: THREE.DoubleSide, depthWrite: false
    }));
    scene.add(p.floorPlane);

    // trace de coupe : module → courbe d'amplitude du Bode, phase → courbe de phase
    p.tubeMat = new THREE.MeshBasicMaterial({ color: 0xc0392b, depthTest: false });

    // face verticale du repli de phase : objet à part, en gris neutre et non
    // colorié par la palette — le saut se lit comme un pli, sans faire croire
    // que la phase passe par les valeurs intermédiaires
    p.cliffPos = new Float32Array(0);
    p.cliff = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({
      color: 0x8a939c, transparent: true, opacity: 0.55, side: THREE.DoubleSide
    }));
    p.cliff.visible = false;
    scene.add(p.cliff);

    // marqueurs couchés dans le plan complexe, capacité fixe
    p.polePos = new Float32Array(MAX_MARK * 4 * 3);
    p.zeroPos = new Float32Array(MAX_MARK * CIRC_SEG * 2 * 3);
    p.poleMarks = mkSegments(p, p.polePos, 0xc0392b, 5);
    p.zeroMarks = mkSegments(p, p.zeroPos, 0x27ae60, 5);

    // aiguille de ω_éval : fût en cylindre + gros point
    const accent = 0xe67e22;
    p.needleStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 1, 8),
      new THREE.MeshBasicMaterial({ color: accent, depthTest: false }));
    p.needleStem.renderOrder = 11;
    p.needleDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 12),
      new THREE.MeshBasicMaterial({ color: accent, depthTest: false }));
    p.needleDot.renderOrder = 12;
    scene.add(p.needleStem); scene.add(p.needleDot);

    // axes σ et jω, avec pointes coniques et étiquettes HTML
    p.axesPos = new Float32Array(4 * 3);
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.BufferAttribute(p.axesPos, 3));
    p.axes = new THREE.LineSegments(ag,
      new THREE.LineBasicMaterial({ color: 0x7a8694, depthTest: false }));
    p.axes.renderOrder = 4;
    scene.add(p.axes);
    const coneG = new THREE.ConeGeometry(ARROW_R, ARROW_H, 20);
    const coneM = new THREE.MeshBasicMaterial({ color: 0x7a8694, depthTest: false });
    p.arrowSigma = new THREE.Mesh(coneG, coneM);
    p.arrowSigma.rotation.z = -Math.PI / 2;
    p.arrowOmega = new THREE.Mesh(coneG, coneM);
    p.arrowOmega.rotation.x = -Math.PI / 2;
    p.arrowSigma.renderOrder = p.arrowOmega.renderOrder = 4;
    scene.add(p.arrowSigma); scene.add(p.arrowOmega);
    p.labSigma = mkLabel(p, 'σ');
    p.labOmega = mkLabel(p, 'jω');
    p.warnEl = document.createElement('div');
    p.warnEl.className = 'surf-warn';
    p.host.appendChild(p.warnEl);
    p.axisAnchors = { sx: BOX_X, sz: 0, ox: 0, oz: -BOX_Z };

    bindInput(p);
    return p;
  }

  function mkLabel(p, txt){
    const el = document.createElement('div');
    el.className = 'surf-axis-label';
    el.textContent = txt;
    p.host.appendChild(el);
    return el;
  }
  function placeLabel(p, el, x, y, z){
    _v.set(x, y, z).project(p.camera);
    const w = p.renderer.domElement.clientWidth, h = p.renderer.domElement.clientHeight;
    el.style.left = ((_v.x * 0.5 + 0.5) * w) + 'px';
    el.style.top = ((-_v.y * 0.5 + 0.5) * h) + 'px';
    el.style.display = (_v.z > 1 || _v.z < -1) ? 'none' : 'block';
  }
  function mkSegments(p, buf, color, order){
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    const o = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, depthTest: false }));
    o.renderOrder = order;
    p.scene.add(o);
    return o;
  }

  // ---------- géométrie (allouée une fois par niveau de détail) ----------
  function buildGrid(p){
    const { n, step } = detail();
    if (n === p.gridN && step === p.gridStep) return;
    p.gridN = n; p.gridStep = step;

    // réserve de sommets pour le contour iso (lèvre du cratère, module seul)
    p.poolMax = 16 * n;
    p.pos = new Float32Array((n * n + p.poolMax) * 3);
    p.col = new Float32Array((n * n + p.poolMax) * 3);
    p.val = new Float64Array(n * n);       // |H| ou phase en degrés selon la vue
    p.idxArr = new Uint32Array((n - 1) * (n - 1) * 9);
    if (p.sheet){ p.scene.remove(p.sheet); p.sheet.geometry.dispose(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(p.col, 3));
    g.setIndex(new THREE.BufferAttribute(p.idxArr, 1));
    p.sheet = new THREE.Mesh(g, p.sheetMat);
    p.scene.add(p.sheet);

    p.lineIdx = [];
    for (let j = 0; j < n; j += step) p.lineIdx.push(j);
    if (p.lineIdx[p.lineIdx.length - 1] !== n - 1) p.lineIdx.push(n - 1);
    p.linePos = new Float32Array((p.lineIdx.length * (n - 1) * 2 + p.poolMax) * 2 * 3);
    // face du repli : 2 triangles par maille coupée, écrits en place
    p.cliffPos = new Float32Array(p.poolMax * 6 * 3);
    p.cliff.geometry.dispose();
    p.cliff.geometry = new THREE.BufferGeometry();
    p.cliff.geometry.setAttribute('position', new THREE.BufferAttribute(p.cliffPos, 3));
    if (p.lines){ p.scene.remove(p.lines); p.lines.geometry.dispose(); }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(p.linePos, 3));
    p.lines = new THREE.LineSegments(lg, p.lineMat);
    p.scene.add(p.lines);
  }

  // ---------- mise à jour en place (contrainte 2) ----------
  function updatePane(p){
    const which = selectedFunction();
    const win = Model.state.view.sigmaWindow;
    const bw = Model.bodeWindow();
    const isPhase = p.kind === 'phase';
    // Échelle logarithmique : une seule case, dans le Bode, qui commande les
    // deux panneaux (§6). Un Bode ne se lit jamais avec un axe log et l'autre
    // linéaire — dB EST une échelle log —, donc les deux basculent ensemble.
    const isDb = !isPhase && Model.state.view.logScale;
    const clip = clipLevel(), span = clip || 1;
    const ceilDb = isDb ? 20 * Math.log10(Math.max(clip, 1e-12)) : 0;
    const floorDb = isDb ? autoFloorDb(ceilDb) : 0;
    const oMin = bw.log ? bw.min : Model.state.omegaRange.min;
    const oMax = bw.log ? bw.max : Model.state.omegaRange.max;
    const n = p.gridN, pos = p.pos, col = p.col, val = p.val;

    // Repliement de la nappe de phase (§1 bis). Si le retard fait tourner la
    // phase de plus d'un demi-tour d'une colonne de maille à la suivante, ce
    // qu'on dessinerait ne serait pas laid mais **faux** : Shannon. Mesuré sur
    // le cas signalé — T = 1 s, ω ∈ [−500, 500] — 597° par colonne pour 97
    // colonnes, soit 159 tours à représenter. On ne dessine alors rien, et on
    // dit pourquoi : réduire T ou la fenêtre ω fait revenir la nappe.
    const aliased = isPhase && Model.state.delay > 0 && ['P', 'L', 'T'].includes(which) && (() => {
      const dOm = bw.log ? bw.max * (1 - Math.pow(10, -bw.dec / (n - 1)))
                         : (oMax - oMin) / (n - 1);
      return Model.state.delay * Math.abs(dOm) > Math.PI;
    })();
    p.host.classList.toggle('aliased', aliased);
    if (aliased){
      p.warnEl.textContent = i18n('surfAlias', {
        tours: Math.round(Model.state.delay * Math.abs(oMax - oMin) / (2 * Math.PI)) });
      return;
    }
    // Palette cyclique écartée pour la phase : elle rendait bien la continuité
    // du repli, mais donnait presque la même couleur à +170° et à −170°, si
    // bien que la teinte ne disait plus le signe de la phase.
    const map = Model.state.view.surfPalette;

    const sAt = i => win.min + (win.max - win.min) * i / (n - 1);
    const oAt = j => bw.log ? bw.min * Math.pow(10, (j / (n - 1)) * bw.dec)
                            : oMin + (oMax - oMin) * j / (n - 1);
    const xOf = s => (2 * (s - win.min) / (win.max - win.min) - 1) * BOX_X;
    const zOf = o => -(bw.log
      ? (2 * (Math.log10(o) - Math.log10(bw.min)) / bw.dec - 1)
      : (2 * (o - oMin) / (oMax - oMin) - 1)) * BOX_Z;

    // grandeur affichée : |H| écrêté, ou arg H en degrés (valeur principale)
    // Retard pur (§1 bis) : e^(−sT) = e^(−σT)·e^(−jωT). Hors de l'axe jω le
    // module n'est plus unimodulaire — il croît en e^(|σ|T) vers la gauche —,
    // et c'est bien |H(s)| : la nappe le montre tel quel, quitte à ce que
    // l'écrêtage recoupe tout ce qui dépasse. Sur l'axe, e⁰ = 1, donc la trace
    // de coupe continue de coïncider avec le Bode.
    const valAt = isPhase
      ? (sigma, omega) => {
          const h = Model.evalTransferComplex(which, sigma, omega);
          if (!isFinite(h.re) || !isFinite(h.im) || h.mag === 0) return 0;
          return wrapDeg(Math.atan2(h.im, h.re) * 180 / Math.PI);
        }
      : (sigma, omega) => {
          const m = Model.evalTransferComplex(which, sigma, omega).mag;
          if (!isDb) return m;
          // en dB, les zéros partent à −∞ : on les pose sur le plancher
          return m > 0 ? Math.max(20 * Math.log10(m), floorDb) : floorDb;
        };
    // rang fixe [−180°, +180°] pour la phase : aucun autoscale (cahier §7)
    const t01Of = isPhase ? v => (v + 180) / 360
                : isDb    ? v => (Math.min(v, ceilDb) - floorDb) / (ceilDb - floorDb)
                          : v => Math.min(v, clip) / span;
    const yOf = v => t01Of(v) * BOX_Y;

    for (let j = 0; j < n; j++){
      const omega = oAt(j), z = zOf(omega);
      for (let i = 0; i < n; i++){
        const sigma = sAt(i);
        const v = valAt(sigma, omega);
        const k = j * n + i, q3 = k * 3;
        val[k] = (isPhase || isDb) ? v : Math.min(v, 1e12);
        const t01 = t01Of(v);
        pos[q3] = xOf(sigma); pos[q3 + 1] = t01 * BOX_Y; pos[q3 + 2] = z;
        colorAt(t01, map, tmpC);
        col[q3] = tmpC.r; col[q3 + 1] = tmpC.g; col[q3 + 2] = tmpC.b;
      }
    }

    // Un zéro tombe presque jamais sur un sommet de la grille, et le fond de
    // l'entonnoir s'arrête alors au-dessus du sol. En linéaire cela ne se voit
    // pas (0,1 % de la hauteur de la boîte) ; en dB c'est béant, car descendre
    // de 20 dB de plus demande d'approcher dix fois plus près du zéro et la
    // maille ne le peut pas — mesuré à 40 % de la hauteur visible. On amène
    // donc le sommet le plus proche exactement sur le zéro et on le pose au
    // plancher. La maille voisine se déforme d'une demi-cellule au pire, ce qui
    // ne se voit pas à 97 points de côté, et le marqueur ○ du plan de base
    // tombe désormais pile sous la pointe.
    if (!isPhase){
      const pris = new Set();
      for (const r of surfaceRoots()){
        if (r.kind !== 'zero') continue;
        if (r.sigma <= win.min || r.sigma >= win.max) continue;
        if (r.omega <= oMin || r.omega >= oMax) continue;      // hors boîte, ou ω ≤ 0 en log
        const fj = bw.log ? (Math.log10(r.omega) - Math.log10(bw.min)) / bw.dec
                          : (r.omega - oMin) / (oMax - oMin);
        const i = Math.round((r.sigma - win.min) / (win.max - win.min) * (n - 1));
        const j = Math.round(fj * (n - 1));
        if (i <= 0 || i >= n - 1 || j <= 0 || j >= n - 1) continue;  // jamais un sommet du bord
        const k = j * n + i;
        if (pris.has(k)) continue;                 // deux zéros dans la même maille
        pris.add(k);
        const q3 = k * 3;
        pos[q3] = xOf(r.sigma); pos[q3 + 1] = 0; pos[q3 + 2] = zOf(r.omega);
        val[k] = isDb ? floorDb : 0;
        colorAt(0, map, tmpC);
        col[q3] = tmpC.r; col[q3 + 1] = tmpC.g; col[q3 + 2] = tmpC.b;
      }
    }

    const nn = n * n;
    let t = 0, pool = 0, q = 0;
    const put = v => { p.linePos[q++] = pos[v]; p.linePos[q++] = pos[v + 1]; p.linePos[q++] = pos[v + 2]; };

    if (isPhase){
      // ---- repli de phase : discontinuité franche, découpée au contour ----
      // Jeter la maille entière donnait des dents de scie et des piquants.
      // On coupe donc la maille sur le contour φ = ±180° : le morceau du haut
      // monte pile à +180°, celui du bas repart de −180°. La falaise est nette
      // et rien n'est interpolé à travers le saut (aucun mur parasite).
      const jump = (a, b) => Math.abs(val[a] - val[b]) > WRAP_CUT;
      const hi = v => val[v] >= 0;
      // sommets interpolés : le même point de la maille, une fois au plafond
      // (+180°) pour la branche haute, une fois au plancher (−180°) pour l'autre
      const crossPair = (v0, v1) => {
        if (pool + 2 > p.poolMax) return null;
        const a0 = val[v0], up = hi(v0);
        const a1 = val[v1] + (up ? 360 : -360);       // déroulé du côté du saut
        let f = ((up ? 180 : -180) - a0) / (a1 - a0);
        if (!isFinite(f)) f = 0.5;
        f = Math.max(0, Math.min(1, f));
        const q0 = v0 * 3, q1 = v1 * 3;
        const x = pos[q0] + (pos[q1] - pos[q0]) * f;
        const z = pos[q0 + 2] + (pos[q1 + 2] - pos[q0 + 2]) * f;
        const vt = nn + pool++, vb = nn + pool++;
        pos[vt * 3] = x; pos[vt * 3 + 1] = BOX_Y; pos[vt * 3 + 2] = z;
        pos[vb * 3] = x; pos[vb * 3 + 1] = 0;      pos[vb * 3 + 2] = z;
        colorAt(1, map, tmpC);
        col[vt * 3] = tmpC.r; col[vt * 3 + 1] = tmpC.g; col[vt * 3 + 2] = tmpC.b;
        colorAt(0, map, tmpC);
        col[vb * 3] = tmpC.r; col[vb * 3 + 1] = tmpC.g; col[vb * 3 + 2] = tmpC.b;
        return { top: vt, bot: vb };
      };
      const per = [0, 0, 0, 0], polyHi = [], polyLo = [], paires = [];
      let cf = 0;
      const sommet = v => { p.cliffPos[cf++] = pos[v*3]; p.cliffPos[cf++] = pos[v*3+1];
                            p.cliffPos[cf++] = pos[v*3+2]; };
      for (let j = 0; j < n - 1; j++)
        for (let i = 0; i < n - 1; i++){
          const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
          if (!(jump(a, b) || jump(a, c) || jump(b, d) || jump(c, d))){
            p.idxArr[t++] = a; p.idxArr[t++] = c; p.idxArr[t++] = b;
            p.idxArr[t++] = b; p.idxArr[t++] = c; p.idxArr[t++] = d;
            continue;
          }
          if (t + 18 > p.idxArr.length) continue;
          per[0] = a; per[1] = c; per[2] = d; per[3] = b;
          polyHi.length = 0; polyLo.length = 0; paires.length = 0;
          let ok = true;
          for (let k = 0; k < 4 && ok; k++){
            const s = per[k], e = per[(k + 1) & 3];
            if (hi(s) !== hi(e)){
              // un changement de signe sans saut serait un passage par 0 :
              // la maille couvrirait alors presque tout le rang, on la laisse
              if (!jump(s, e)){ ok = false; break; }
              const x = crossPair(s, e);
              if (!x){ ok = false; break; }
              polyHi.push(x.top); polyLo.push(x.bot); paires.push(x);
            }
            (hi(e) ? polyHi : polyLo).push(e);
          }
          if (!ok) continue;
          for (const poly of [polyHi, polyLo])
            for (let k = 1; k < poly.length - 1; k++){
              p.idxArr[t++] = poly[0]; p.idxArr[t++] = poly[k]; p.idxArr[t++] = poly[k + 1];
            }
          // face verticale du repli : le quadrilatère qui joint les deux
          // traversées, de +180° en haut à −180° en bas
          if (paires.length === 2 && cf + 18 <= p.cliffPos.length){
            const [A, B] = paires;
            sommet(A.top); sommet(B.top); sommet(B.bot);
            sommet(A.top); sommet(B.bot); sommet(A.bot);
          }
        }
      p.cliff.geometry.attributes.position.needsUpdate = true;
      p.cliff.geometry.setDrawRange(0, cf / 3);
      p.cliff.geometry.computeBoundingSphere();
      p.cliff.visible = cf > 0;
      // traits : rognés au contour eux aussi, chacun jusqu'à sa falaise
      const seg = (v0, v1) => {
        if (!jump(v0, v1)){ put(v0 * 3); put(v1 * 3); return; }
        const x = crossPair(v0, v1);
        if (!x) return;
        put(v0 * 3); put((hi(v0) ? x.top : x.bot) * 3);
        put((hi(v1) ? x.top : x.bot) * 3); put(v1 * 3);
      };
      for (const j of p.lineIdx)
        for (let i = 0; i < n - 1; i++) seg(j * n + i, j * n + i + 1);
      for (const i of p.lineIdx)
        for (let j = 0; j < n - 1; j++) seg(j * n + i, (j + 1) * n + i);
    } else {
      p.cliff.visible = false;          // pas de face de repli sur le module
      // ---- découpe au contour iso au plafond (marching squares) ----
      // En dB la grandeur est déjà logarithmique : on interpole linéairement.
      // En linéaire on interpole en log, car |H| varie comme 1/d près d'un pôle.
      const ceil = isDb ? ceilDb : clip;
      const inside = v => val[v] <= ceil;
      const key = isDb ? (x => x) : (x => Math.log(Math.max(x, 1e-300)));
      const kClip = key(ceil);
      const cross = (v0, v1) => {
        if (pool >= p.poolMax) return -1;
        const l0 = key(val[v0]), l1 = key(val[v1]);
        let f = (kClip - l0) / (l1 - l0);
        if (!isFinite(f)) f = 0.5;
        f = Math.max(0, Math.min(1, f));
        const v = nn + pool++, q3 = v * 3, p0 = v0 * 3, p1 = v1 * 3;
        pos[q3]     = pos[p0]     + (pos[p1]     - pos[p0]) * f;
        pos[q3 + 1] = BOX_Y;
        pos[q3 + 2] = pos[p0 + 2] + (pos[p1 + 2] - pos[p0 + 2]) * f;
        colorAt(1, map, tmpC);
        col[q3] = tmpC.r; col[q3 + 1] = tmpC.g; col[q3 + 2] = tmpC.b;
        return v;
      };
      const per = [0, 0, 0, 0], poly = [], rim = [];
      for (let j = 0; j < n - 1; j++)
        for (let i = 0; i < n - 1; i++){
          const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
          const nIn = (inside(a) ? 1 : 0) + (inside(b) ? 1 : 0) +
                      (inside(c) ? 1 : 0) + (inside(d) ? 1 : 0);
          if (nIn === 0) continue;
          if (nIn === 4){
            p.idxArr[t++] = a; p.idxArr[t++] = c; p.idxArr[t++] = b;
            p.idxArr[t++] = b; p.idxArr[t++] = c; p.idxArr[t++] = d;
            continue;
          }
          per[0] = a; per[1] = c; per[2] = d; per[3] = b;
          poly.length = 0; rim.length = 0;
          let ok = true;
          for (let k = 0; k < 4 && ok; k++){
            const s = per[k], e = per[(k + 1) & 3];
            const si = inside(s), ei = inside(e);
            if (si !== ei){
              const x = cross(s, e);
              if (x < 0){ ok = false; break; }
              poly.push(x); rim.push(x);
            }
            if (ei) poly.push(e);
          }
          if (!ok || poly.length < 3) continue;
          for (let k = 1; k < poly.length - 1; k++){
            p.idxArr[t++] = poly[0]; p.idxArr[t++] = poly[k]; p.idxArr[t++] = poly[k + 1];
          }
          if (rim.length === 2){ put(rim[0] * 3); put(rim[1] * 3); }
        }
      const seg = (v0, v1) => {
        const i0 = inside(v0), i1 = inside(v1);
        if (!i0 && !i1) return;
        if (i0 && i1){ put(v0 * 3); put(v1 * 3); return; }
        const x = cross(i0 ? v0 : v1, i0 ? v1 : v0);
        if (x < 0) return;
        put((i0 ? v0 : v1) * 3); put(x * 3);
      };
      for (const j of p.lineIdx)
        for (let i = 0; i < n - 1; i++) seg(j * n + i, j * n + i + 1);
      for (const i of p.lineIdx)
        for (let j = 0; j < n - 1; j++) seg(j * n + i, (j + 1) * n + i);
    }

    p.sheet.geometry.attributes.position.needsUpdate = true;
    p.sheet.geometry.attributes.color.needsUpdate = true;
    p.sheet.geometry.index.needsUpdate = true;
    p.sheet.geometry.setDrawRange(0, t);
    p.sheet.geometry.computeBoundingSphere();
    p.lines.geometry.attributes.position.needsUpdate = true;
    p.lines.geometry.setDrawRange(0, q / 3);
    p.lines.geometry.computeBoundingSphere();

    // plan de coupe à σ = 0 et plan complexe au sol
    const xc = xOf(Math.max(win.min, Math.min(0, win.max)));
    const z0 = zOf(bw.log ? bw.min : oMin), z1 = zOf(bw.log ? bw.max : oMax);
    p.cutPos.set([xc, 0, z0, xc, 0, z1, xc, BOX_Y, z1, xc, BOX_Y, z0]);
    p.cutPlane.geometry.attributes.position.needsUpdate = true;
    p.cutPlane.geometry.computeBoundingSphere();
    p.floorPos.set([-BOX_X, 0, -BOX_Z, BOX_X, 0, -BOX_Z, BOX_X, 0, BOX_Z, -BOX_X, 0, BOX_Z]);
    p.floorPlane.geometry.attributes.position.needsUpdate = true;
    p.floorPlane.geometry.computeBoundingSphere();

    // axes, pointes et ancres d'étiquettes
    const zAxis = bw.log ? zOf(bw.min) : zOf(Math.max(oMin, Math.min(0, oMax)));
    const xAxis = xOf(Math.max(win.min, Math.min(0, win.max)));
    const XE = BOX_X * AXIS_OVER, ZE = BOX_Z * AXIS_OVER;
    p.axesPos.set([-XE, 0, zAxis, XE, 0, zAxis, xAxis, 0, ZE, xAxis, 0, -ZE]);
    p.axes.geometry.attributes.position.needsUpdate = true;
    p.axes.geometry.computeBoundingSphere();
    p.arrowSigma.position.set(XE - ARROW_H / 2, 0, zAxis);
    p.arrowOmega.position.set(xAxis, 0, -ZE + ARROW_H / 2);
    p.axisAnchors = { sx: XE + 0.10, sz: zAxis, ox: xAxis, oz: -ZE - 0.10 };

    updateMarkers(p, xOf, zOf, yOf, valAt);
    rebuildTube(p, xc, zOf, yOf, valAt, bw, oMin, oMax, isPhase);
  }

  // Marqueurs couchés dans le plan complexe + aiguille de ω_éval.
  function updateMarkers(p, xOf, zOf, yOf, valAt){
    const bwm = Model.bodeWindow();
    // En ω log₁₀ la boîte ne couvre que ω > 0 : un pôle ou un zéro réel (ω = 0,
    // log → −∞) et un conjugué à ω < 0 n'y ont aucune place. La correction J8
    // les posait sur le bord de la boîte ; c'était leur inventer une position,
    // car ce bord vaut ω_min et non 0. En log on ne les dessine donc pas — le
    // plan s et l'échelle linéaire, dont l'axe passe par 0, les montrent.
    const drawable = o => !bwm.log || (o >= bwm.min && o <= bwm.max);

    let a = 0, z = 0;
    for (const r of surfaceRoots()){
      if (!drawable(r.omega)) continue;
      const x = xOf(r.sigma), zz = zOf(r.omega);
      if (!isFinite(x) || !isFinite(zz)) continue;
      if (r.kind === 'pole' && a < p.polePos.length - 12){
        p.polePos.set([x - MARK_R, 0, zz - MARK_R, x + MARK_R, 0, zz + MARK_R,
                       x - MARK_R, 0, zz + MARK_R, x + MARK_R, 0, zz - MARK_R], a);
        a += 12;
      } else if (r.kind === 'zero' && z < p.zeroPos.length - CIRC_SEG * 6){
        for (let k = 0; k < CIRC_SEG; k++){
          const a0 = 2 * Math.PI * k / CIRC_SEG, a1 = 2 * Math.PI * (k + 1) / CIRC_SEG;
          p.zeroPos.set([x + MARK_R * Math.cos(a0), 0, zz + MARK_R * Math.sin(a0),
                         x + MARK_R * Math.cos(a1), 0, zz + MARK_R * Math.sin(a1)], z);
          z += 6;
        }
      }
    }
    p.poleMarks.geometry.attributes.position.needsUpdate = true;
    p.poleMarks.geometry.setDrawRange(0, a / 3);
    p.zeroMarks.geometry.attributes.position.needsUpdate = true;
    p.zeroMarks.geometry.setDrawRange(0, z / 3);

    // même condition que le point de l'axe jω du plan s : c'est le jumeau du
    // marqueur du Bode, il n'a pas lieu d'être quand le Bode est masqué
    const we = Model.evalOmega();
    const bw = Model.bodeWindow();
    const visible = Model.state.view.showBode &&
                    we !== null && isFinite(we) &&
                    we >= (bw.log ? bw.min : Math.max(0, Model.state.omegaRange.min)) &&
                    we <= Model.state.omegaRange.max;
    p.needleStem.visible = p.needleDot.visible = visible;
    if (visible){
      const win = Model.state.view.sigmaWindow;
      const xc = xOf(Math.max(win.min, Math.min(0, win.max)));
      const zc = zOf(we), h = Math.max(yOf(valAt(0, we)), 1e-4);
      p.needleStem.position.set(xc, h / 2, zc);
      p.needleStem.scale.set(1, h, 1);
      p.needleDot.position.set(xc, h, zc);
    }
  }

  // Trace de coupe : reconstruite sur événement seulement (contrainte 5).
  // En phase, elle est coupée aux replis — comme la nappe.
  function rebuildTube(p, xc, zOf, yOf, valAt, bw, oMin, oMax, isPhase){
    const NC = Model.ui.dragId !== null ? 110 : 240;
    for (const m of p.tubes){ p.scene.remove(m); m.geometry.dispose(); }
    p.tubes.length = 0;

    let run = [], prev = null;
    const flush = () => {
      if (run.length >= 2){
        const curve = new THREE.CatmullRomCurve3(run);
        const m = new THREE.Mesh(
          new THREE.TubeGeometry(curve, Math.max(run.length, 2), TUBE_R, 6, false), p.tubeMat);
        m.renderOrder = 10;               // toujours en couleur, même derrière la nappe
        p.scene.add(m);
        p.tubes.push(m);
      }
      run = [];
    };
    for (let j = 0; j < NC; j++){
      const f = j / (NC - 1);
      const w = bw.log ? bw.min * Math.pow(10, f * bw.dec)
                       : Math.max(0, oMin) + (oMax - Math.max(0, oMin)) * f;
      const v = valAt(0, w);
      if (isPhase && prev !== null && Math.abs(v - prev) > WRAP_CUT) flush();
      run.push(new THREE.Vector3(xc, yOf(v), zOf(w)));
      prev = v;
    }
    flush();
  }

  // ---------- caméra (contrainte 7 : distance calculée, jamais constante) ----------
  function fitDistance(p, dir){
    const tanV = Math.tan(p.camera.fov * Math.PI / 360);
    const tanH = tanV * p.camera.aspect;
    _r.set(0, 1, 0).cross(dir).normalize();
    if (_r.lengthSq() < 1e-9) _r.set(1, 0, 0);
    _u.copy(dir).cross(_r).normalize();
    let d = 0;
    for (let sx = -1; sx <= 1; sx += 2)
      for (let sz = -1; sz <= 1; sz += 2)
        for (let sy = 0; sy <= 1; sy++){
          _v.set(sx * BOX_X, sy * BOX_Y, sz * BOX_Z).sub(target);
          const a = _v.dot(dir);
          d = Math.max(d, a + Math.abs(_v.dot(_r)) / tanH,
                          a + Math.abs(_v.dot(_u)) / tanV);
        }
    return d;
  }
  function placeCamera(p){
    _dir.set(Math.sin(orbit.phi) * Math.cos(orbit.theta),
             Math.cos(orbit.phi),
             Math.sin(orbit.phi) * Math.sin(orbit.theta)).normalize();
    const d = fitDistance(p, _dir) * orbit.zoom * 1.02;
    p.camera.position.copy(target).addScaledVector(_dir, d);
    p.camera.lookAt(target);
    p.camera.updateMatrixWorld();
  }
  function paint(p){
    if (!p.visible) return;
    placeCamera(p);
    p.renderer.render(p.scene, p.camera);
    placeLabel(p, p.labSigma, p.axisAnchors.sx, 0, p.axisAnchors.sz);
    placeLabel(p, p.labOmega, p.axisAnchors.ox, 0, p.axisAnchors.oz);
  }
  // orbit et target étant partagés, repeindre les deux vues suffit à les
  // garder synchronisées (cahier §7 : caméras synchronisées)
  const paintAll = () => { for (const p of panes) paint(p); };

  // ---------- entrées ----------
  function panBy(p, dxPix, dyPix){
    const cv = p.renderer.domElement;
    const dist = p.camera.position.distanceTo(target);
    const hWorld = 2 * Math.tan(p.camera.fov * Math.PI / 360) * dist;
    const wWorld = hWorld * p.camera.aspect;
    p.camera.matrixWorld.extractBasis(_r, _u, _v);
    target.addScaledVector(_r, -dxPix / cv.clientWidth * wWorld);
    target.addScaledVector(_u, dyPix / cv.clientHeight * hWorld);
  }
  function resetView(){
    orbit.theta = THETA0; orbit.phi = PHI0; orbit.zoom = 1;
    target.set(0, BOX_Y / 2, 0);
    paintAll();
  }
  const clampZoom = z => Math.max(0.25, Math.min(4, z));

  function bindInput(p){
    const cv = p.renderer.domElement;
    const active = new Map();
    let last = null, pinch0 = 0, zoom0 = 1, mid0 = null;
    const midOf = () => {
      const [a, b] = [...active.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
    };

    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* pointeur synthétique */ }
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size === 2){
        const m = midOf();
        pinch0 = m.d; zoom0 = orbit.zoom; mid0 = m;
      }
      last = { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey };
    });
    cv.addEventListener('pointermove', e => {
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size >= 2){
        const m = midOf();
        if (pinch0 > 0) orbit.zoom = clampZoom(zoom0 * pinch0 / m.d);
        if (mid0) panBy(p, m.x - mid0.x, m.y - mid0.y);
        mid0 = m;
        paintAll();
        return;
      }
      if (!last) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (last.button === 0 && !last.shift){
        // tirer vers la droite fait tourner la scène vers la droite
        orbit.theta += dx * 0.008;
        orbit.phi = Math.max(0.08, Math.min(Math.PI - 0.08, orbit.phi - dy * 0.006));
      } else {
        panBy(p, dx, dy);          // bouton droit / molette / Maj+glisser : pan
      }
      last = { x: e.clientX, y: e.clientY, button: last.button, shift: last.shift };
      paintAll();
    });
    const end = e => {
      active.delete(e.pointerId);
      if (active.size < 2){ pinch0 = 0; mid0 = null; }
      if (active.size === 0) last = null;
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    // Molette, deux doigts et pincement zooment tous ; le déplacement se fait
    // au geste explicite Maj + glisser, annoncé dans la légende.
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const k = e.ctrlKey ? 0.01 : 0.0012;
      orbit.zoom = clampZoom(orbit.zoom * Math.exp(e.deltaY * k));
      paintAll();
    }, { passive: false });
    cv.addEventListener('dblclick', resetView);
  }

  // ---------- API ----------
  function init(){
    panes = [makePane('mag'), makePane('phase')];
    // légende des gestes, une seule pour les deux vues
    helpEl = document.createElement('div');
    helpEl.className = 'surf-help';
    container.appendChild(helpEl);
    ready = true;
    refreshLang();
  }

  // textes non balisés data-i18n : réécrits au changement de langue (§8)
  function refreshLang(){
    clipSlider.title = t('clipHint');
    detailSel.title = t('detailHint');
    functionSel.title = t('transferFunction');
    if (helpEl) helpEl.textContent = t('surfHelp');
  }

  let lastMode = '';
  function applyMode(){
    const mode = Model.state.view.surfMode;
    const which = selectedFunction();
    const changed = mode !== lastMode;
    lastMode = mode;
    for (const p of panes){
      p.visible = (mode === 'both') || (mode === p.kind);
      p.host.classList.toggle('hidden', !p.visible);
      p.labSigma.style.display = p.visible ? '' : 'none';
      p.labOmega.style.display = p.visible ? '' : 'none';
    }
    // contrôles contextuels (§7) : l'écrêtage n'a pas de sens sur une phase
    // déjà bornée ; la palette, elle, sert aux deux surfaces
    clipWrap.classList.toggle('hidden', mode === 'phase');
    paletteWrap.classList.remove('hidden');
    modeSel.value = mode;
    functionSel.value = which;
    modeSel.options[0].textContent = '|' + which + '(s)|';
    modeSel.options[1].textContent = 'arg ' + which + '(s)';
    // une vue qui vient d'apparaître n'a pas encore la taille de son conteneur :
    // sans cela elle garderait l'aspect par défaut et paraîtrait déformée
    if (changed && ready) resizePanes();
  }

  function render(){
    if (!Model.state.view.show3d) return;
    if (typeof THREE === 'undefined') return;
    if (!ready){ init(); applyMode(); resize(); }
    applyMode();
    const paper = cssRGB('--panel-bg'), ink = cssRGB('--ink'), axisC = cssRGB('--axis');
    const poleC = cssRGB('--pole'), zeroC = cssRGB('--zero'), accentC = cssRGB('--accent');
    const traceC = cssRGB('--trace');
    for (const p of panes){
      if (!p.visible) continue;
      p.lineMat.color.copy(ink);
      p.axes.material.color.copy(axisC);
      p.arrowSigma.material.color.copy(axisC);
      p.poleMarks.material.color.copy(poleC);
      p.zeroMarks.material.color.copy(zeroC);
      p.tubeMat.color.copy(traceC);      // même couleur que la courbe du Bode
      p.needleStem.material.color.copy(accentC);
      p.needleDot.material.color.copy(accentC);
    }
    // le plafond s'affiche dans l'unité de l'axe : dB quand l'échelle est log
    const clip = clipLevel();
    clipValue.textContent = Model.state.view.logScale
      ? (20 * Math.log10(Math.max(clip, 1e-12))).toFixed(1).replace(/-/g, '−') + ' dB'
      : String(Number(clip.toPrecision(3))).replace(/-/g, '−');
    paletteSel.value = Model.state.view.surfPalette;
    detailSel.value = Model.state.view.surfDetail;
    if (document.activeElement !== clipSlider)
      if (document.activeElement !== clipSlider)
        clipSlider.value = String(Number((50 + 50 * Math.log10(Model.state.view.clipFactor || 1)).toPrecision(12)));

    const run = () => {
      for (const p of panes){
        if (!p.visible) continue;
        buildGrid(p);
        updatePane(p);
      }
      paintAll();
    };
    if (Model.ui.dragId !== null){
      const now = performance.now();
      if (now - lastDrag < DRAG_MS) return;
      lastDrag = now;
      run();
    } else {
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(run, 0);
    }
  }

  function resizePanes(){
    // En mode « les deux » : côte à côte si le panneau est plus large que haut,
    // l'un au-dessus de l'autre sinon — chaque vue garde ainsi une forme
    // exploitable au lieu d'être écrasée en bandeau.
    const empile = body.clientHeight > body.clientWidth;
    container.style.flexDirection = empile ? 'column' : 'row';
    container.classList.toggle('stacked', empile);
    for (const p of panes){
      if (!p.visible) continue;
      const w = p.host.clientWidth, h = p.host.clientHeight;
      if (!w || !h) continue;
      p.camera.aspect = w / h;
      p.camera.updateProjectionMatrix();
      p.renderer.setSize(w, h);          // updateStyle par défaut (contrainte 6)
    }
  }
  function resize(){
    if (!ready || !Model.state.view.show3d) return;
    resizePanes();
    paintAll();
  }

  // _inspect : lecture seule pour les vérifications
  const _inspect = () => ({ panes, orbit, target, ready });

  return { render, resize, autoClip, refreshLang, resetView, _inspect };
})();
