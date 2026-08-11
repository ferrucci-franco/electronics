'use strict';
/* Orchestration : tous les panneaux sont des fonctions de rendu de l'état global. */
const App = (() => {

  // ---------- layout : visibilité des colonnes (cahier §3) ----------
  // Tout changement de visibilité réinitialise les tailles manuelles (reflow).
  const colSp = document.getElementById('col-sp');
  const col3d = document.getElementById('col-3d');
  const colRight = document.getElementById('col-right');
  const vsplit = document.getElementById('vsplit-sp');
  const vsplit3d = document.getElementById('vsplit-3d');
  const hsplit = document.getElementById('hsplit-right');
  const panelBode = document.getElementById('panel-bode');
  const panelTime = document.getElementById('panel-time');
  let lastVis = '';

  // Répartition selon la configuration visible (maquette v5 pour les cas à
  // trois colonnes). Cas particulier demandé par l'enseignant : 3D + Bode sans
  // réponse temporelle → deux colonnes, la 3D empilée au-dessus du Bode.
  const panel3d = document.getElementById('panel-3d');
  function layout(){
    const bode = Model.state.view.showBode, time = Model.state.view.showTime;
    const d3 = Model.state.view.show3d;
    const right = bode || time;
    const stacked = d3 && bode && !time;      // 3D en haut, Bode en bas

    // le panneau 3D voyage entre sa colonne et la colonne droite
    if (stacked && panel3d.parentElement !== colRight) colRight.insertBefore(panel3d, colRight.firstChild);
    else if (!stacked && panel3d.parentElement !== col3d) col3d.appendChild(panel3d);
    // le séparateur horizontal se place sous le panneau du haut
    if (stacked) colRight.insertBefore(hsplit, panelBode);
    else colRight.insertBefore(hsplit, panelTime);

    colSp.style.flex = ''; col3d.style.flex = ''; colRight.style.flex = '';
    panelBode.style.flex = ''; panel3d.style.flex = '';
    col3d.classList.toggle('hidden', !d3 || stacked);
    colRight.classList.toggle('hidden', !right);
    vsplit.classList.toggle('hidden', !(d3 || right));
    vsplit3d.classList.toggle('hidden', !(d3 && right && !stacked));
    panelBode.classList.toggle('hidden', !bode);
    panelTime.classList.toggle('hidden', !time);
    hsplit.classList.toggle('hidden', !(stacked || (bode && time)));

    if (stacked){
      colSp.style.flex = '0 0 34%'; colRight.style.flex = '1 1 auto';
      panel3d.style.flex = '0 0 55%';
    } else if (d3 && right){
      colSp.style.flex = '0 0 27%'; col3d.style.flex = '1 1 auto'; colRight.style.flex = '0 0 31%';
    } else if (d3){
      colSp.style.flex = '0 0 32%'; col3d.style.flex = '1 1 auto';
    } else if (right){
      colSp.style.flex = '0 0 34%'; colRight.style.flex = '1 1 auto';
    } else {
      colSp.style.flex = '1 1 auto';
    }
    if (!stacked){
      if (bode && time) panelBode.style.flex = '0 0 55%';
      else if (bode) panelBode.style.flex = '1 1 auto';
    }
  }

  // Bode et Nyquist se partagent le même panneau (sélecteur Vue, §6 ter).
  // Même règle que pour les deux surfaces 3D : côte à côte si le panneau est
  // plus large que haut, l'un au-dessus de l'autre sinon — le polaire veut un
  // format carré, le Bode un format allongé, on ne les écrase pas.
  const bodeSplit = document.getElementById('bode-split');
  const bodePane = document.getElementById('bode-pane');
  const nyqPane = document.getElementById('nyq-pane');
  const bodeOpts = document.getElementById('bode-opts');
  const nyqOpts = document.getElementById('nyq-opts');
  const bodeModeSel = document.getElementById('bode-mode');
  bodeModeSel.addEventListener('change', () => Model.setView({ bodeMode: bodeModeSel.value }));

  function applyBodeMode(){
    const m = Model.state.view.bodeMode;
    bodeModeSel.value = m;
    bodePane.classList.toggle('hidden', m === 'nyquist');
    nyqPane.classList.toggle('hidden', m === 'bode');
    bodeOpts.classList.toggle('hidden', m === 'nyquist');
    nyqOpts.classList.toggle('hidden', m === 'bode');
    const body = document.getElementById('bode-body');
    bodeSplit.classList.toggle('stacked', body.clientHeight > body.clientWidth);
  }

  function resizeAll(){
    SPlane.resize();
    Bode.resize();
    Nyquist.resize();
    TimeResp.resize();
    Surface3D.resize();
    Equations.resize();
  }

  // séparateur vertical plan s ↔ colonne droite
  vsplit.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX, startW = colSp.getBoundingClientRect().width;
    function move(ev){
      const w = Math.max(220, Math.min(startW + (ev.clientX - startX), window.innerWidth * 0.62));
      colSp.style.flex = '0 0 ' + w + 'px';
      resizeAll();
    }
    function up(){
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // séparateur vertical surface 3D ↔ colonne droite (redimensionne la droite)
  vsplit3d.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX, startW = colRight.getBoundingClientRect().width;
    function move(ev){
      const w = Math.max(220, Math.min(startW - (ev.clientX - startX), window.innerWidth * 0.55));
      colRight.style.flex = '0 0 ' + w + 'px';
      resizeAll();
    }
    function up(){
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // séparateur horizontal Bode ↔ réponse temporelle
  hsplit.addEventListener('mousedown', e => {
    e.preventDefault();
    const above = hsplit.previousElementSibling;      // panneau du haut (3D ou Bode)
    if (!above) return;
    const startY = e.clientY, startH = above.getBoundingClientRect().height;
    const maxH = colRight.getBoundingClientRect().height - 140;
    function move(ev){
      const h = Math.max(120, Math.min(startH + (ev.clientY - startY), maxH));
      above.style.flex = '0 0 ' + h + 'px';
      resizeAll();
    }
    function up(){
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // repli du panneau latéral : la languette du bord (cahier §3)
  const sbToggle = document.getElementById('sb-toggle');
  sbToggle.addEventListener('click', () =>
    Model.setView({ sidebarHidden: !Model.state.view.sidebarHidden }));

  function render(){
    const hidden = !!Model.state.view.sidebarHidden;
    document.body.classList.toggle('sb-hidden', hidden);
    sbToggle.title = t(hidden ? 'sbShow' : 'sbHide');
    sbToggle.setAttribute('aria-label', sbToggle.title);
    sbToggle.setAttribute('aria-expanded', String(!hidden));
    const vis = Model.state.view.showBode + ':' + Model.state.view.showTime +
                ':' + Model.state.view.show3d + ':' + Model.state.view.bodeMode +
                ':' + hidden;
    if (vis !== lastVis){
      lastVis = vis;
      layout();
      applyBodeMode();
      resizeAll();       // resynchroniser sans attendre le ResizeObserver
    }
    Sidebar.render();
    SPlane.render();
    Bode.render();
    Nyquist.render();
    TimeResp.render();
    Surface3D.render();
    Equations.render();
  }

  applyStaticI18n();

  // pas de menu contextuel dans l'app (le bouton droit sert au pan, etc.) ;
  // exception : les champs de saisie (coller une valeur)
  document.addEventListener('contextmenu', ev => {
    const t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    ev.preventDefault();
  });

  // case 1:1 du plan s
  const aspectChk = document.getElementById('aspect-lock');
  aspectChk.addEventListener('change', () => Model.setView({ aspectLock: aspectChk.checked }));

  // touche Suppr : suppression de l'élément sélectionné (cahier §4)
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Delete' && ev.key !== 'Backspace') return;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA')) return;
    const id = Model.ui.selectedId;
    if (!id) return;
    ev.preventDefault();
    const res = Model.removeElement(id);
    if (!res.ok && res.msg) SPlane.showToast(t(res.msg));
  });

  // ---------- langue et réinitialisation globale (jalon J7) ----------
  // Les libellés balisés data-i18n sont réécrits par applyStaticI18n ; ici on
  // reprend les textes calculés (infobulles, légendes, readouts) puis on rend.
  function refreshLang(){
    Sidebar.refreshLang();
    Bode.refreshLang();
    Nyquist.refreshLang();
    TimeResp.refreshLang();
    Surface3D.refreshLang();
    Equations.refreshLang();
    render();
  }
  function resetAll(){
    lastVis = '';              // force le reflow : les tailles manuelles tombent
    Surface3D.resetView();     // caméra 3D à sa vue d'origine
    Model.reset();             // notifie → render() → layout() + resizeAll()
  }

  Model.onChange(render);
  new ResizeObserver(() => SPlane.resize()).observe(document.getElementById('splane-body'));
  new ResizeObserver(() => { applyBodeMode(); Bode.resize(); Nyquist.resize(); })
    .observe(document.getElementById('bode-body'));
  new ResizeObserver(() => TimeResp.resize()).observe(document.getElementById('time-body'));
  new ResizeObserver(() => Surface3D.resize()).observe(document.getElementById('surf-body'));

  // contenu initial : exemple de la maquette v5
  Model.loadExample();
  SPlane.resize();
  Bode.resize();
  TimeResp.resize();

  return { render, refreshLang, resetAll };
})();
