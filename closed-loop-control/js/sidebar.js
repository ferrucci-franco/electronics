'use strict';
/* Sidebar (cahier §3) : ajout, compteur n/m, inventaire (valeurs et multiplicité
   éditables, ✕ = décrémenter/supprimer), readout de l'élément sélectionné, gain K. */
const Sidebar = (() => {

  const invBox = document.getElementById('inventory');
  const sidebar = document.getElementById('sidebar');
  const blockPicker = document.getElementById('block-picker');
  const activeBlockNote = document.getElementById('active-block-note');
  const readout = document.getElementById('readout');
  const counter = document.getElementById('order-counter');
  const kSlider = document.getElementById('k-slider');
  const gainTitle = document.getElementById('gain-title');
  const gainSymbol = document.getElementById('gain-symbol');
  const kAutoRow = document.getElementById('k-auto-row');
  const kAutoLabel = document.getElementById('k-auto-label');
  const kInput = document.getElementById('k-input');
  const kSign = document.getElementById('k-sign');
  const kAutoChk = document.getElementById('k-auto-chk');
  const h0Value = document.getElementById('h0-value');
  const controllerEditor = document.getElementById('controller-editor');
  const controllerMode = document.getElementById('controller-mode');
  const controllerFreePanel = document.getElementById('controller-free-panel');
  const controllerPidPanel = document.getElementById('controller-pid-panel');
  const pidStructure = document.getElementById('pid-structure');
  const pidNSlider = document.getElementById('pid-n-slider');
  const pidNInput = document.getElementById('pid-n-input');
  const pidNRow = document.getElementById('pid-n-row');
  const pidFormula = document.getElementById('pid-formula');
  const pidResetLabel = document.getElementById('pid-reset-label');
  const gainSection = document.getElementById('gain-section');
  const gainDerivedNote = document.getElementById('gain-derived-note');
  const addSection = document.getElementById('add-section');
  const selectedSection = document.getElementById('selected-section');
  const delaySection = document.getElementById('delay-section');
  const saturationSection = document.getElementById('saturation-section');
  const pidControls = {
    Kp: { slider: document.getElementById('pid-kp-slider'), input: document.getElementById('pid-kp-input') },
    Ti: { slider: document.getElementById('pid-ti-slider'), input: document.getElementById('pid-ti-input') },
    Td: { slider: document.getElementById('pid-td-slider'), input: document.getElementById('pid-td-input') }
  };

  let editingId = null;

  const OWNER_KEYS = { plant: 'plant', controller: 'controller', sensor: 'sensor', saturation: 'saturationBlock' };
  blockPicker.querySelectorAll('[data-owner]').forEach(button =>
    button.addEventListener('click', () => Model.setActiveBlock(button.dataset.owner)));

  // icônes vectorielles (mêmes dessins que les boutons d'ajout)
  const ICONS = {
    'pole:real': '<svg class="gicon" viewBox="0 0 16 16"><path class="ic-pole" d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>',
    'pole:pair': '<svg class="gicon" viewBox="0 0 16 16"><path class="ic-pole" d="M5.4 1.4l5.2 5.2M10.6 1.4L5.4 6.6M5.4 9.4l5.2 5.2M10.6 9.4l-5.2 5.2"/></svg>',
    'zero:real': '<svg class="gicon" viewBox="0 0 16 16"><circle class="ic-zero" cx="8" cy="8" r="4.2"/></svg>',
    'zero:pair': '<svg class="gicon" viewBox="0 0 16 16"><circle class="ic-zero" cx="8" cy="4.2" r="2.9"/><circle class="ic-zero" cx="8" cy="11.8" r="2.9"/></svg>'
  };

  // ---------- boutons d'ajout ----------
  const BTNS = [
    ['btn-add-pole-real', 'pole', 'real'],
    ['btn-add-pole-pair', 'pole', 'pair'],
    ['btn-add-zero-real', 'zero', 'real'],
    ['btn-add-zero-pair', 'zero', 'pair']
  ];
  for (const [bid, kind, shape] of BTNS){
    document.getElementById(bid).addEventListener('click', () => {
      const res = Model.addElement(kind, shape);
      if (!res.ok) SPlane.showToast(t(res.msg, { max: res.msg === 'msgLoopNmax' ? Model.LOOP_N_MAX : Model.N_MAX }));
    });
  }

  // ---------- contrôleur rationnel libre / PID lié (J13) ----------
  controllerMode.addEventListener('change', () => {
    const res = Model.setControllerMode(controllerMode.value);
    if (!res.ok){ SPlane.showToast(t(res.msg)); App.render(); }
  });
  pidStructure.addEventListener('change', () => {
    const res = Model.setPidStructure(pidStructure.value);
    if (!res.ok){ SPlane.showToast(t(res.msg, { max: Model.LOOP_N_MAX })); App.render(); }
  });
  for (const [term, controls] of Object.entries(pidControls)){
    controls.slider.addEventListener('input', () =>
      Model.setPidCanonicalParams({ [term]: Number(controls.slider.value) }));
    controls.input.addEventListener('change', () => {
      const res = Model.setPidCanonicalParams({ [term]: Number(controls.input.value) });
      if (!res.ok){ SPlane.showToast(t(res.msg)); App.render(); }
    });
    controls.input.addEventListener('keydown', ev => { if (ev.key === 'Enter') controls.input.blur(); });
  }
  pidNSlider.addEventListener('input', () =>
    Model.setPidParams({ N: Math.pow(10, Number(pidNSlider.value)) }));
  pidNInput.addEventListener('change', () => {
    const res = Model.setPidParams({ N: Number(pidNInput.value) });
    if (!res.ok){ SPlane.showToast(t(res.msg)); App.render(); }
  });
  pidNInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') pidNInput.blur(); });
  document.getElementById('pid-reset').addEventListener('click', () => {
    const res = Model.resetPid();
    if (!res.ok) SPlane.showToast(t(res.msg, { max: Model.LOOP_N_MAX }));
  });

  // ---------- gain K ----------
  // Slider (log) et champ numérique = gain manuel. La normalisation statique
  // n'est proposée que pour P et S ; K_C reste toujours un réglage du contrôleur.
  kSlider.addEventListener('input', () => Model.setK(Math.pow(10, Number(kSlider.value))));
  kInput.addEventListener('change', () => {
    const v = Number(kInput.value);
    if (isFinite(v)) Model.setK(v);
    else App.render();
  });
  kInput.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') kInput.blur();     // Entrée : valider et rendre le focus
  });
  kAutoChk.addEventListener('change', () => {
    const res = Model.setKAuto(kAutoChk.checked);
    if (!res.ok) SPlane.showToast(t(res.msg));
  });

  // ---------- retard pur (cahier §1 bis, jalon J9) ----------
  const delayInput = document.getElementById('delay-input');
  const delayNote = document.getElementById('delay-note');
  const satEnabled = document.getElementById('sat-enabled');
  const satRange = document.getElementById('sat-range');
  const satMinSlider = document.getElementById('sat-min-slider');
  const satMaxSlider = document.getElementById('sat-max-slider');
  const satMinInput = document.getElementById('sat-min-input');
  const satMaxInput = document.getElementById('sat-max-input');
  const satRangeFill = document.getElementById('sat-range-fill');
  delayInput.addEventListener('change', () => Model.setDelay(Number(delayInput.value)));
  delayInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') delayInput.blur(); });
  satEnabled.addEventListener('change', () => Model.setSaturation({ enabled: satEnabled.checked }));
  function setSatBounds(min, max){
    const res = Model.setSaturation({ min, max });
    if (!res.ok){ SPlane.showToast(t(res.msg)); App.render(); }
  }
  satMinSlider.addEventListener('input', () => {
    const step = Number(satMinSlider.step) || .1;
    setSatBounds(Math.min(Number(satMinSlider.value), Model.state.saturation.max - step),
      Model.state.saturation.max);
  });
  satMaxSlider.addEventListener('input', () => {
    const step = Number(satMaxSlider.step) || .1;
    setSatBounds(Model.state.saturation.min,
      Math.max(Number(satMaxSlider.value), Model.state.saturation.min + step));
  });
  satMinInput.addEventListener('change', () => setSatBounds(Number(satMinInput.value), Model.state.saturation.max));
  satMaxInput.addEventListener('change', () => setSatBounds(Model.state.saturation.min, Number(satMaxInput.value)));
  for (const input of [satMinInput, satMaxInput])
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') input.blur(); });
  kSign.addEventListener('click', () => Model.setK(-Model.gainOf(Model.ui.activeBlock)));

  // ---------- préférences et réinitialisation (cahier §3 et §8, jalon J7) ----------
  const langSel = document.getElementById('lang-sel');
  const themeChk = document.getElementById('theme-chk');
  const resetBtn = document.getElementById('btn-reset');
  langSel.addEventListener('change', () => {
    Model.state.view.lang = langSel.value;
    setLang(langSel.value);                     // applique la langue en direct
  });
  themeChk.addEventListener('change', () =>
    Model.setView({ theme: themeChk.checked ? 'dark' : 'light' }));
  resetBtn.addEventListener('click', () => App.resetAll());

  // infobulles non balisées data-i18n : réécrites au changement de langue
  function refreshLang(){
    kSign.title = t('kSignHint');
    h0Value.title = t('dcGainHint');
    resetBtn.title = t('resetHint');
    delayInput.title = t('delayHint');
    pidNSlider.title = t('pidFilterHint');
    pidNInput.title = t('pidFilterHint');
    satRange.title = t('satRangeHint');
  }
  refreshLang();

  // ---------- vues ----------
  const view3d = document.getElementById('view-3d');
  view3d.addEventListener('change', () => Model.setView({ show3d: view3d.checked }));
  const viewBode = document.getElementById('view-bode');
  viewBode.addEventListener('change', () => Model.setView({ showBode: viewBode.checked }));
  const viewTime = document.getElementById('view-time');
  viewTime.addEventListener('change', () => Model.setView({ showTime: viewTime.checked }));

  // ---------- formats ----------
  const disp = s => String(s).replace(/-/g, '−');
  function fmtVal(v){                       // inventaire : décimales utiles seulement
    let s = v.toFixed(2).replace(/\.?0+$/, '');
    if (s === '' || s === '-') s = '0';
    if (s === '-0') s = '0';
    return disp(s);
  }
  const fmtFix = (v, d = 2) => disp((Object.is(v, -0) ? 0 : v).toFixed(d));
  const fmtK = v => disp(v.toPrecision(3));
  const tauStr = sigma => sigma === 0 ? '∞' : fmtFix(1 / Math.abs(sigma)) + ' s';

  function invText(row){
    const e = row.el;
    let s = `${row.label} = ${fmtVal(e.sigma)}`;
    if (e.type === 'pair') s += ` ± ${fmtVal(e.omega)}j`;
    if (e.mult > 1) s += ` (×${e.mult})`;
    return s;
  }

  // ---------- inventaire ----------
  function buildRow(row){
    const d = document.createElement('div');
    d.className = 'inv-item owner-' + row.owner + (Model.ui.selectedId === row.id ? ' selected' : '');
    d.dataset.id = row.id;

    const glyph = document.createElement('span');
    glyph.className = 'inv-glyph';
    glyph.innerHTML = ICONS[row.kind + ':' + row.el.type];
    d.appendChild(glyph);

    const ownerTag = document.createElement('span');
    ownerTag.className = 'inv-owner-tag';
    ownerTag.textContent = t('ownerAbbr' + row.owner[0].toUpperCase() + row.owner.slice(1));
    d.appendChild(ownerTag);

    const val = document.createElement('span');
    val.className = 'inv-val';
    val.textContent = invText(row);
    d.appendChild(val);

    const actions = document.createElement('span');
    actions.className = 'inv-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'inv-btn edit';
    edit.textContent = '✎';
    edit.title = t('editHint');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'inv-btn del';
    del.textContent = '✕';
    del.title = t('delHint');
    if (row.el.pidStructural){ del.disabled = true; del.title = t('msgPidLinked'); }
    actions.appendChild(edit);
    actions.appendChild(del);
    d.appendChild(actions);

    d.addEventListener('click', ev => {
      if (ev.target.closest('button')) return;
      Model.select(row.id);              // l'édition passe uniquement par le bouton ✎
    });
    edit.addEventListener('click', ev => {
      ev.stopPropagation();
      startEdit(row.id);
    });
    del.addEventListener('click', ev => {
      ev.stopPropagation();
      const res = Model.decrementElement(row.id);
      if (!res.ok && res.msg) SPlane.showToast(t(res.msg));
    });
    return d;
  }

  function buildEditRow(row){
    const e = row.el;
    const d = document.createElement('div');
    d.className = 'inv-item editing selected owner-' + row.owner;
    d.dataset.id = row.id;

    const form = document.createElement('div');
    form.className = 'inv-edit-form';

    const mkInput = val => {
      const i = document.createElement('input');
      i.type = 'number'; i.step = '0.1'; i.value = val;
      return i;
    };
    const mkLabel = (text, cls) => {
      const s = document.createElement('span');
      s.className = 'inv-edit-label' + (cls ? ' ' + cls : '');
      s.textContent = text + ' :';
      return s;
    };

    // ligne 1 : légende (Pôle/Zéro) + valeurs
    const r1 = document.createElement('div');
    r1.className = 'inv-edit-row';
    const legendKey = row.kind === 'pole'
      ? (e.type === 'pair' ? 'editPoleC' : 'editPoleR')
      : (e.type === 'pair' ? 'editZeroC' : 'editZeroR');
    r1.appendChild(mkLabel(t(legendKey), row.kind));
    const inS = mkInput(String(Number(e.sigma.toFixed(4))));
    if (e.pidStructural && e.structuralRole === 'integrator') inS.disabled = true;
    r1.appendChild(inS);
    let inW = null;
    if (e.type === 'pair'){
      r1.appendChild(document.createTextNode('±'));
      inW = mkInput(String(Number(e.omega.toFixed(4))));
      r1.appendChild(inW);
      const j = document.createElement('span');
      j.className = 'jlbl';
      j.textContent = 'j';
      r1.appendChild(j);
    }
    form.appendChild(r1);

    // ligne 2 : bloc propriétaire
    const rOwner = document.createElement('div');
    rOwner.className = 'inv-edit-row';
    rOwner.appendChild(mkLabel(t('editOwner')));
    const inOwner = document.createElement('select');
    inOwner.className = 'owner-select';
    inOwner.title = t('editOwner');
    if (e.pidStructural) inOwner.disabled = true;
    for (const owner of Model.OWNERS){
      const o = document.createElement('option');
      o.value = owner;
      o.textContent = t(OWNER_KEYS[owner]);
      o.selected = owner === row.owner;
      inOwner.appendChild(o);
    }
    rOwner.appendChild(inOwner);
    form.appendChild(rOwner);

    // ligne 3 : multiplicité + valider/annuler
    const r2 = document.createElement('div');
    r2.className = 'inv-edit-row';
    r2.appendChild(mkLabel(t('editMult')));
    const inM = document.createElement('select');
    inM.className = 'mult';
    inM.title = t('editMult');
    if (e.pidStructural) inM.disabled = true;
    const per = e.type === 'pair' ? 2 : 1;
    const { n, m } = Model.blockCounts(row.owner);
    const totalN = Model.counts().n;
    for (let k = 1; k <= Model.N_MAX; k++){
      let valid;
      if (row.kind === 'pole'){
        const n2 = n + (k - e.mult) * per;
        valid = n2 <= Model.N_MAX && n2 >= m
          && totalN + (k - e.mult) * per <= Model.LOOP_N_MAX;
      } else {
        valid = m + (k - e.mult) * per <= n;
      }
      if (!valid) continue;
      const o = document.createElement('option');
      o.value = String(k);
      o.textContent = '×' + k;
      if (k === e.mult) o.selected = true;
      inM.appendChild(o);
    }
    r2.appendChild(inM);

    const actions = document.createElement('span');
    actions.className = 'inv-actions';
    const ok = document.createElement('button');
    ok.type = 'button'; ok.className = 'inv-btn ok'; ok.textContent = '✓'; ok.title = t('editApply');
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'inv-btn cancel'; cancel.textContent = '✕'; cancel.title = t('editCancel');
    actions.appendChild(ok);
    actions.appendChild(cancel);
    r2.appendChild(actions);
    form.appendChild(r2);

    function apply(){
      editingId = null;
      const res = Model.editElement(row.id, {
        sigma: inS.value, omega: inW ? inW.value : 0, mult: inM.value, owner: inOwner.value
      });
      if (!res.ok){
        SPlane.showToast(t(res.msg, { max: res.msg === 'msgLoopNmax' ? Model.LOOP_N_MAX : Model.N_MAX }));
        App.render();                 // le modèle n'a pas changé : sortir du mode édition
      }
    }
    function cancelEdit(){ editingId = null; App.render(); }

    ok.addEventListener('click', ev => { ev.stopPropagation(); apply(); });
    cancel.addEventListener('click', ev => { ev.stopPropagation(); cancelEdit(); });
    form.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') apply();
      else if (ev.key === 'Escape') cancelEdit();
    });

    d.appendChild(form);
    return d;
  }

  function startEdit(id){
    editingId = id;
    Model.select(id);                 // re-rendu synchrone : la ligne passe en mode édition
    const inp = invBox.querySelector('.inv-item.editing input');
    if (inp){ inp.focus(); inp.select(); }
  }

  // clic hors de la ligne en édition → annuler
  document.addEventListener('pointerdown', ev => {
    if (editingId && !ev.target.closest('.inv-item.editing')){
      editingId = null;
      App.render();
    }
  }, true);

  // ---------- readout ----------
  function renderReadout(rows){
    const id = Model.ui.selectedId;
    const row = rows.find(r => r.id === id);
    if (!row){
      readout.className = 'empty';
      readout.textContent = t('clickPZ');
      return;
    }
    readout.className = '';
    const e = row.el;
    let title, lines;
    if (row.kind === 'pole' && e.type === 'pair'){
      const wn = Math.hypot(e.sigma, e.omega);
      const xi = wn > 0 ? -e.sigma / wn : 0;
      title = t('roPoleC', { label: row.label });
      lines = [
        `σ = ${fmtFix(e.sigma)} &nbsp; ω_d = ±${fmtFix(e.omega)}`,
        `ωₙ = ${fmtFix(wn)} &nbsp; ξ = ${fmtFix(xi, 3)}`,
        `τ = 1/|σ| = ${tauStr(e.sigma)}`
      ];
    } else if (row.kind === 'pole'){
      title = t('roPoleR', { label: row.label });
      lines = [`σ = ${fmtFix(e.sigma)}`, `τ = 1/|σ| = ${tauStr(e.sigma)}`];
    } else if (e.type === 'pair'){
      const az = Math.hypot(e.sigma, e.omega);
      title = t('roZeroC', { label: row.label });
      lines = [`σ = ${fmtFix(e.sigma)} &nbsp; ω = ±${fmtFix(e.omega)}`, `|z| = ${fmtFix(az)}`];
    } else {
      title = t('roZeroR', { label: row.label });
      lines = [`σ = ${fmtFix(e.sigma)}`, `τ = 1/|σ| = ${tauStr(e.sigma)}`];
    }
    readout.innerHTML = `<span class="ro-title">${title}</span>`
      + `<span class="ro-owner owner-${row.owner}"> · ${t(OWNER_KEYS[row.owner])}</span><br>`
      + lines.join('<br>');
  }

  // ---------- rendu ----------
  function render(){
    // thème : une classe sur <body>, toute la palette suit en variables CSS ;
    // les panneaux 3D relisent ces variables à chaque rendu, donc ils suivent aussi
    document.body.classList.toggle('dark', Model.state.view.theme === 'dark');
    themeChk.checked = Model.state.view.theme === 'dark';
    langSel.value = LANG;

    if (document.activeElement !== delayInput)
      delayInput.value = String(Number(Model.state.delay.toPrecision(4)));
    delayNote.textContent = Model.state.delay > 0 ? t('delayNote') : '';

    const rows = Model.inventoryData();

    const activeOwner = Model.ui.activeBlock;
    const saturationActive = activeOwner === 'saturation';
    const pidMode = Model.state.controller.mode === 'pid';
    sidebar.classList.remove(...Model.ACTIVE_BLOCKS.map(owner => 'active-owner-' + owner));
    sidebar.classList.add('active-owner-' + activeOwner);
    blockPicker.querySelectorAll('[data-owner]').forEach(button => {
      const active = button.dataset.owner === activeOwner;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    activeBlockNote.textContent = saturationActive ? t('editingSaturation')
      : activeOwner === 'controller' && pidMode
        ? t('editingPid') : t('addingTo', { block: t(OWNER_KEYS[activeOwner]) });
    controllerEditor.classList.toggle('hidden', activeOwner !== 'controller');
    saturationSection.classList.toggle('hidden', !saturationActive);
    controllerMode.value = Model.state.controller.mode;
    controllerFreePanel.classList.toggle('hidden', pidMode);
    controllerPidPanel.classList.toggle('hidden', !pidMode);
    gainSection.classList.toggle('hidden', saturationActive);
    selectedSection.classList.toggle('hidden', saturationActive);
    delaySection.classList.toggle('hidden', saturationActive);
    addSection.classList.toggle('hidden', saturationActive || (activeOwner === 'controller' && pidMode));
    if (pidMode && activeOwner === 'controller'){
      const p = Model.state.controller.pid;
      const canonical = Model.pidCanonicalParams();
      pidStructure.value = p.structure;
      for (const [term, controls] of Object.entries(pidControls)){
        const active = term === 'Kp' || (term === 'Ti' && (p.structure === 'PI' || p.structure === 'PID'))
          || (term === 'Td' && (p.structure === 'PD' || p.structure === 'PID'));
        const value = active ? canonical[term] : 0;
        controls.slider.disabled = !active;
        controls.input.disabled = !active;
        controls.slider.closest('.pid-row').classList.toggle('hidden', !active);
        // Ne jamais redimensionner la piste pendant un glisser : changer ses
        // bornes sous le pointeur remappe immédiatement la position et donne
        // l'impression que le curseur « s'enfuit ». On n'étend la plage que
        // pour accueillir une valeur saisie hors de la plage existante.
        const sliderMin = Number(controls.slider.min);
        const sliderMax = Number(controls.slider.max);
        if (term === 'Ti' && value < sliderMin) controls.slider.min = String(value);
        if (value > sliderMax) controls.slider.max = String(Math.ceil(value * 1.2));
        if (document.activeElement !== controls.slider) controls.slider.value = String(value);
        if (document.activeElement !== controls.input) controls.input.value = String(Number(value.toPrecision(6)));
      }
      const hasDerivative = p.structure === 'PD' || p.structure === 'PID';
      pidNInput.disabled = !hasDerivative;
      pidNSlider.disabled = !hasDerivative;
      pidNRow.classList.toggle('hidden', !hasDerivative);
      const logN = Math.log10(p.N);
      // Même règle pour ωf : les cinq décades initiales restent fixes pendant
      // le glisser. Une saisie numérique extérieure étend ensuite la piste,
      // sans ajouter une décennie d'avance à chaque franchissement.
      if (logN < Number(pidNSlider.min)) pidNSlider.min = String(Math.floor(logN));
      if (logN > Number(pidNSlider.max)) pidNSlider.max = String(Math.ceil(logN));
      if (document.activeElement !== pidNSlider) pidNSlider.value = String(logN);
      if (document.activeElement !== pidNInput) pidNInput.value = String(Number(p.N.toPrecision(6)));
      pidResetLabel.textContent = t('pidResetStructure', { structure: p.structure });
      const fp = n => String(Number(n.toPrecision(4))).replace(/-/g, '−');
      const terms = ['1'];
      if (p.structure === 'PI' || p.structure === 'PID') terms.push(`1/(${fp(canonical.Ti)}s)`);
      if (p.structure === 'PD' || p.structure === 'PID')
        terms.push(`${fp(canonical.Td)}·${fp(p.N)}s/(s+${fp(p.N)})`);
      pidFormula.textContent = terms.length === 1
        ? `C(s) = ${fp(canonical.Kp)}`
        : `C(s) = ${fp(canonical.Kp)} [${terms.join(' + ')}]`;
    }
    if (!saturationActive){
      const activeCounts = Model.blockCounts(activeOwner);
      counter.textContent = t('counterBlock', { n: activeCounts.n, m: activeCounts.m, max: Model.N_MAX,
        total: Model.counts().n, loopMax: Model.LOOP_N_MAX });

      for (const [bid, kind, shape] of BTNS){
        const b = document.getElementById(bid);
        b.disabled = !Model.canAdd(kind, shape);
        const totalBlocked = kind === 'pole' && Model.counts().n + (shape === 'pair' ? 2 : 1) > Model.LOOP_N_MAX;
        b.title = b.disabled
          ? t(activeOwner === 'controller' && pidMode ? 'msgPidLinked'
            : totalBlocked ? 'msgLoopNmax' : (kind === 'pole' ? 'msgNmax' : 'msgCausality'),
            { max: totalBlocked ? Model.LOOP_N_MAX : Model.N_MAX })
          : '';
      }
    }

    invBox.innerHTML = '';
    if (!rows.length){
      const note = document.createElement('div');
      note.className = 'empty-note';
      note.textContent = t('invEmpty');
      invBox.appendChild(note);
    } else {
      for (const owner of Model.OWNERS){
        const ownedRows = rows.filter(row => row.owner === owner);
        if (!ownedRows.length) continue;
        const heading = document.createElement('div');
        heading.className = 'inv-group owner-' + owner;
        heading.innerHTML = '<span class="owner-dot"></span><span>' + t(OWNER_KEYS[owner]) + '</span>';
        invBox.appendChild(heading);
        for (const row of ownedRows)
          invBox.appendChild(row.id === editingId ? buildEditRow(row) : buildRow(row));
      }
    }

    if (!saturationActive){
      renderReadout(rows);

      const gainOwner = Model.ui.activeBlock;
      const linkedGain = gainOwner === 'controller' && pidMode;
      const gainLetter = { plant: 'P', controller: 'C', sensor: 'S' }[gainOwner];
      const K = Model.gainOf(gainOwner);
      gainTitle.textContent = t('gain') + ' — ' + t(OWNER_KEYS[gainOwner]);
      gainSymbol.innerHTML = gainOwner === 'plant' ? 'K' : 'K<sub>' + gainLetter + '</sub>';
      const normalizeAvailable = Model.canNormalizeDc(gainOwner);
      const showNormalization = gainOwner !== 'controller';
      kAutoRow.classList.toggle('hidden', !showNormalization);
      kAutoLabel.textContent = t(gainOwner === 'sensor' ? 'sensorUnityGain' : 'plantUnityGain');
      kAutoRow.title = normalizeAvailable
        ? t(gainOwner === 'sensor' ? 'sensorUnityHint' : 'plantUnityHint')
        : t('dcNormalizeUnavailable');
      kSlider.disabled = linkedGain;
      kInput.disabled = linkedGain;
      kSign.disabled = linkedGain;
      kAutoChk.disabled = !normalizeAvailable;
      gainDerivedNote.classList.toggle('hidden', !linkedGain);
      if (linkedGain){
        const structure = Model.state.controller.pid.structure;
        const formula = structure === 'P' || structure === 'PI'
          ? 'K<sub>C</sub> = K<sub>p</sub>'
          : 'K<sub>C</sub> = K<sub>p</sub> + ω<sub>f</sub>·K<sub>d</sub>';
        gainDerivedNote.innerHTML = `<span class="gain-derived-equation">${formula}</span>. ${t('gainDerivedNote')}`;
      }
      if (document.activeElement !== kInput)
        kInput.value = String(Number(K.toPrecision(3)));
      const lg = Math.log10(Math.min(1e3, Math.max(1e-3, Math.abs(K) || 1e-3)));
      if (document.activeElement !== kSlider) kSlider.value = String(lg);
      kAutoChk.checked = Model.kAutoOf(gainOwner);

      // gain statique du bloc actif
      const { num, den } = Model.transferPolys(gainLetter);
      const n0 = num[num.length - 1], d0 = den[den.length - 1];
      let h0;
      if (Math.abs(d0) < 1e-12) h0 = Math.abs(n0) < 1e-12 ? '—' : '∞';
      else {
        const v = n0 / d0;
        h0 = fmtK(Object.is(v, -0) ? 0 : v);
      }
      h0Value.textContent = `${gainLetter}(0) = ${h0}`;
    }
    view3d.checked = Model.state.view.show3d;
    viewBode.checked = Model.state.view.showBode;
    viewTime.checked = Model.state.view.showTime;

    const sat = Model.state.saturation;
    satEnabled.checked = sat.enabled;
    // Domaine persistant : atteindre le bord avec une poignée ne doit pas
    // agrandir la piste et relancer le glisser. Seule une saisie numérique
    // réellement extérieure provoque une extension avec marge.
    const currentDomain = Math.max(20, Math.abs(Number(satMinSlider.min)), Math.abs(Number(satMinSlider.max)));
    const requiredDomain = Math.max(Math.abs(sat.min), Math.abs(sat.max));
    const domain = requiredDomain > currentDomain
      ? Math.ceil(requiredDomain * 1.25) : currentDomain;
    for (const slider of [satMinSlider, satMaxSlider]){
      slider.min = String(-domain); slider.max = String(domain); slider.disabled = !sat.enabled;
    }
    satRange.classList.toggle('disabled', !sat.enabled);
    satMinInput.disabled = !sat.enabled; satMaxInput.disabled = !sat.enabled;
    if (document.activeElement !== satMinSlider) satMinSlider.value = String(sat.min);
    if (document.activeElement !== satMaxSlider) satMaxSlider.value = String(sat.max);
    if (document.activeElement !== satMinInput) satMinInput.value = String(sat.min);
    if (document.activeElement !== satMaxInput) satMaxInput.value = String(sat.max);
    const lo = (sat.min + domain) / (2 * domain) * 100;
    const hi = (sat.max + domain) / (2 * domain) * 100;
    satRangeFill.style.left = Math.max(0, Math.min(100, lo)) + '%';
    satRangeFill.style.right = 100 - Math.max(0, Math.min(100, hi)) + '%';
  }

  return { render, refreshLang };
})();
