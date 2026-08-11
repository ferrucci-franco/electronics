'use strict';
/* Sidebar (cahier §3) : ajout, compteur n/m, inventaire (valeurs et multiplicité
   éditables, ✕ = décrémenter/supprimer), readout de l'élément sélectionné, gain K. */
const Sidebar = (() => {

  const invBox = document.getElementById('inventory');
  const readout = document.getElementById('readout');
  const counter = document.getElementById('order-counter');
  const kSlider = document.getElementById('k-slider');
  const kInput = document.getElementById('k-input');
  const kSign = document.getElementById('k-sign');
  const kAutoChk = document.getElementById('k-auto-chk');
  const h0Value = document.getElementById('h0-value');

  let editingId = null;

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
      if (!res.ok) SPlane.showToast(t(res.msg, { max: Model.N_MAX }));
    });
  }

  // ---------- gain K ----------
  // slider (log) et champ numérique = mode manuel ; la case « auto » ramène à H(0) = 1
  kSlider.addEventListener('input', () => Model.setK(Math.pow(10, Number(kSlider.value))));
  kInput.addEventListener('change', () => {
    const v = Number(kInput.value);
    if (isFinite(v)) Model.setK(v);
    else App.render();
  });
  kInput.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') kInput.blur();     // Entrée : valider et rendre le focus
  });
  kAutoChk.addEventListener('change', () => Model.setKAuto(kAutoChk.checked));

  // ---------- retard pur (cahier §1 bis, jalon J9) ----------
  const delayInput = document.getElementById('delay-input');
  const delayNote = document.getElementById('delay-note');
  delayInput.addEventListener('change', () => Model.setDelay(Number(delayInput.value)));
  delayInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') delayInput.blur(); });
  kSign.addEventListener('click', () => Model.setK(-Model.state.K));

  // ---------- règle et compas (cahier §6 bis) ----------
  const rulerChk = document.getElementById('ruler-on');
  const rulerModeRow = document.getElementById('ruler-mode-row');
  const rulerMode = document.getElementById('ruler-mode');
  const rulerOut = document.getElementById('ruler-readout');
  rulerChk.addEventListener('change', () => Model.setRuler({ on: rulerChk.checked }));
  rulerMode.addEventListener('change', () => Model.setRuler({ show: rulerMode.value }));

  const fmtD = v => disp(String(Number(v.toPrecision(3))));
  const fmtA = v => disp(String(Math.round(v * 10) / 10)) + '°';

  function renderRuler(){
    const on = Model.state.view.ruler.on;
    rulerModeRow.classList.toggle('hidden', !on);
    rulerOut.classList.toggle('hidden', !on);
    rulerChk.checked = on;
    rulerMode.value = Model.state.view.ruler.show;
    if (!on) return;

    const d = Model.rulerData();
    rulerOut.innerHTML = '';
    if (!d) return;

    const line = (cls, text) => {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      rulerOut.appendChild(el);
      return el;
    };

    line('ruler-head', `jω = ${fmtD(d.omega)}`);
    if (!d.points.length){ line('ruler-empty', t('rulerEmpty')); return; }

    for (const [kind, key] of [['zero', 'rulerNum'], ['pole', 'rulerDen']]){
      const pts = d.points.filter(p => p.kind === kind);
      if (!pts.length) continue;
      line('ruler-group ' + (kind === 'zero' ? 'num' : 'den'), t(key));
      for (const p of pts){
        const exp = p.mult > 1 ? Model.sup(p.mult) : '';
        line('ruler-item ' + (kind === 'zero' ? 'num' : 'den'),
             `d(${p.label})${exp} = ${fmtD(p.d)}${exp}  ∠ ${fmtA(p.theta)}`);
      }
    }

    // Le retard prend sa ligne parmi les termes, mais sans la couleur des
    // pôles ni celle des zéros : il n'est l'angle géométrique de rien, il ne
    // se lit sur aucun segment du plan s et ne touche pas au module (§1 bis).
    if (d.delayPhase)
      line('ruler-item', `${t('rulerDelay')} : −ω·T = ${fmtA(d.delayPhase)}`);

    // calcul monté avec les nombres vivants
    const term = p => fmtD(p.d) + (p.mult > 1 ? Model.sup(p.mult) : '');
    const zs = d.points.filter(p => p.kind === 'zero');
    const ps = d.points.filter(p => p.kind === 'pole');
    const numStr = zs.length ? zs.map(term).join(' · ') : '1';
    const denStr = ps.length ? ps.map(term).join(' · ') : '1';
    const kStr = fmtD(Math.abs(d.K));
    line('ruler-calc', `|H| = ${kStr} · ${zs.length > 1 ? '(' + numStr + ')' : numStr}`
                     + ` / ${ps.length > 1 ? '(' + denStr + ')' : denStr}`
                     + ` = ${isFinite(d.mag) ? fmtD(d.mag) : '∞'}`);

    const angTerm = p => (p.mult > 1 ? p.mult + '·' : '') + fmtA(p.theta);
    const sumZ = zs.length ? zs.map(angTerm).join(' + ') : '0';
    const sumP = ps.length ? ps.map(angTerm).join(' + ') : '0';
    const argK = d.K < 0 ? '180° + ' : '';
    // Le terme de retard est écrit à part : il n'est l'angle géométrique de
    // rien, il ne se lit sur aucun segment du plan s et croît avec ω (§1 bis).
    const ret = d.delayPhase ? ` ${d.delayPhase < 0 ? '−' : '+'} ${fmtA(Math.abs(d.delayPhase))}` : '';
    line('ruler-calc', `φ = ${argK}${zs.length > 1 ? '(' + sumZ + ')' : sumZ}`
                     + ` − ${ps.length > 1 ? '(' + sumP + ')' : sumP}${ret}`
                     + ` = ${fmtA(d.phase)}`);
    line('ruler-hint', t('rulerDrag'));
  }

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
    rulerChk.title = t('rulerHint');
    resetBtn.title = t('resetHint');
    delayInput.title = t('delayHint');
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
    d.className = 'inv-item' + (Model.ui.selectedId === row.id ? ' selected' : '');
    d.dataset.id = row.id;

    const glyph = document.createElement('span');
    glyph.className = 'inv-glyph';
    glyph.innerHTML = ICONS[row.kind + ':' + row.el.type];
    d.appendChild(glyph);

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
    d.className = 'inv-item editing selected';
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

    // ligne 2 : multiplicité (liste déroulante des valeurs valides) + valider/annuler
    const r2 = document.createElement('div');
    r2.className = 'inv-edit-row';
    r2.appendChild(mkLabel(t('editMult')));
    const inM = document.createElement('select');
    inM.className = 'mult';
    inM.title = t('editMult');
    const per = e.type === 'pair' ? 2 : 1;
    const { n, m } = Model.counts();
    for (let k = 1; k <= Model.N_MAX; k++){
      let valid;
      if (row.kind === 'pole'){
        const n2 = n + (k - e.mult) * per;
        valid = n2 <= Model.N_MAX && n2 >= m;
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
        sigma: inS.value, omega: inW ? inW.value : 0, mult: inM.value
      });
      if (!res.ok){
        SPlane.showToast(t(res.msg, { max: Model.N_MAX }));
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
    readout.innerHTML = `<span class="ro-title">${title}</span><br>` + lines.join('<br>');
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
    const { n, m } = Model.counts();

    counter.textContent = t('counter', { n, m, max: Model.N_MAX });

    for (const [bid, kind, shape] of BTNS){
      const b = document.getElementById(bid);
      b.disabled = !Model.canAdd(kind, shape);
      b.title = b.disabled
        ? t(kind === 'pole' ? 'msgNmax' : 'msgCausality', { max: Model.N_MAX })
        : '';
    }

    invBox.innerHTML = '';
    if (!rows.length){
      const note = document.createElement('div');
      note.className = 'empty-note';
      note.textContent = t('invEmpty');
      invBox.appendChild(note);
    } else {
      for (const row of rows)
        invBox.appendChild(row.id === editingId ? buildEditRow(row) : buildRow(row));
    }

    renderReadout(rows);

    const K = Model.state.K;
    if (document.activeElement !== kInput)
      kInput.value = String(Number(K.toPrecision(3)));
    const lg = Math.log10(Math.min(1e3, Math.max(1e-3, Math.abs(K) || 1e-3)));
    kSlider.value = String(lg);
    kAutoChk.checked = Model.ui.kAuto;
    renderRuler();
    view3d.checked = Model.state.view.show3d;
    viewBode.checked = Model.state.view.showBode;
    viewTime.checked = Model.state.view.showTime;

    // légende du gain statique H(0) = K·N(0)/D(0)
    const { num, den } = Model.polys();
    const n0 = num[num.length - 1], d0 = den[den.length - 1];
    let h0;
    if (Math.abs(d0) < 1e-12) h0 = Math.abs(n0) < 1e-12 ? '—' : '∞';
    else {
      const v = K * n0 / d0;
      h0 = fmtK(Object.is(v, -0) ? 0 : v);
    }
    h0Value.textContent = `H(0) = ${h0}`;
  }

  return { render, refreshLang };
})();
