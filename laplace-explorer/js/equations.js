'use strict';
/* Bandeau équations (cahier §3) : forme factorisée (exposants), forme développée,
   équation différentielle — coefficients numériques en direct, rendu KaTeX. */
const Equations = (() => {

  const strip = document.getElementById('eqstrip');
  const head = document.getElementById('eq-head');
  const caret = document.getElementById('eq-caret');
  const elF = document.getElementById('eq-factored');
  const elE = document.getElementById('eq-expanded');
  const elO = document.getElementById('eq-ode');
  const elM = document.getElementById('eq-mod');
  const elA = document.getElementById('eq-arg');
  const rowFreq = document.getElementById('eq-row-freq');

  // Plier/déplier au clic sur l'en-tête, sauf si le clic vise une commande.
  // Se fier au stopPropagation posé sur chaque libellé ne suffisait pas : une
  // case ne fait que 15 px de haut, et si le bouton est relâché un ou deux
  // pixels en dehors du libellé, le clic se déclenche sur l'ancêtre commun —
  // l'en-tête — sans jamais traverser le libellé. Le bandeau se repliait alors
  // tout seul, une fois sur deux ou trois. On mémorise donc sur quoi le bouton
  // a été enfoncé : c'est ça qui dit l'intention, pas où il a été relâché.
  const COMMANDES = 'label,input,select,button';
  let surCommande = false;
  head.addEventListener('mousedown', ev => {
    surCommande = !!(ev.target.closest && ev.target.closest(COMMANDES));
  });
  head.addEventListener('click', ev => {
    if (surCommande || (ev.target.closest && ev.target.closest(COMMANDES))) return;
    Model.setView({ eqCollapsed: !Model.state.view.eqCollapsed });
  });

  // languette de bord, jumelle de celle du panneau latéral (cahier §3)
  const eqToggle = document.getElementById('eq-toggle');
  eqToggle.addEventListener('click', () =>
    Model.setView({ eqCollapsed: !Model.state.view.eqCollapsed }));

  // case « ajuster à la largeur » : ne pas plier le bandeau au clic
  const fitChk = document.getElementById('eq-fit-chk');
  fitChk.addEventListener('change', () => Model.setView({ eqFit: fitChk.checked }));

  // case « module et phase » : seconde ligne du bandeau (cahier §3)
  const freqChk = document.getElementById('eq-freq-chk');
  const freqLabel = document.getElementById('eq-freq-label');
  freqChk.addEventListener('change', () => Model.setView({ eqFreq: freqChk.checked }));
  const refreshLang = () => { freqLabel.title = t('eqFreqHint'); };
  refreshLang();

  const EQS = [elF, elE, elO, elM, elA];
  const GAP = 40;          // même valeur que le gap CSS de .eq-row
  const PART_MIN = 140;    // de quoi écrire l'étiquette du bloc

  // Répartition de la largeur. À parts égales, la factorisée — qui porte tous
  // les binômes — se retrouvait écrasée à 0,6 pendant que l'équation
  // différentielle gardait du vide à droite. Chaque bloc reçoit donc une part
  // proportionnelle à la largeur qu'il lui faut : tous finissent au même
  // facteur d'échelle, aucun n'est comprimé pendant qu'un autre respire.
  // Sous une largeur trop courte pour trois parts décentes, on rend la main au
  // CSS, qui replie les blocs les uns sous les autres.
  function balance(row){
    const blocks = [...row.querySelectorAll('.eq-block')];
    const avail = row.clientWidth - GAP * (blocks.length - 1);
    if (avail < blocks.length * 200){
      for (const b of blocks) b.style.flex = '';
      return;
    }
    const need = blocks.map(b => Math.max(b.querySelector('.eq').scrollWidth, PART_MIN));
    const tot = need.reduce((a, x) => a + x, 0);
    blocks.forEach((b, i) => { b.style.flex = `0 0 ${(avail * need[i] / tot).toFixed(1)}px`; });
  }

  // mise à l'échelle : ramène chaque équation dans la largeur de son bloc
  function pass(){
    const fit = Model.state.view.eqFit;
    for (const el of EQS) el.style.transform = '';        // mesurer le texte nu
    for (const row of document.querySelectorAll('#eqstrip .eq-row'))
      if (!row.classList.contains('hidden')) balance(row);
    for (const el of EQS){
      const box = el.parentElement;              // .eq-scroll
      box.classList.toggle('fit', fit);
      if (!fit) continue;
      const avail = box.clientWidth, wid = el.scrollWidth;
      if (wid > avail && avail > 0) el.style.transform = `scale(${avail / wid})`;
    }
  }
  // Deux temps. La première passe tombe parfois sur une mise en page pas encore
  // arrêtée — colonnes qui viennent de bouger, et surtout polices KaTeX pas
  // encore chargées, qui mesurent large puis rétrécissent. L'équation se
  // retrouvait alors mise à l'échelle pour une largeur qu'elle n'a plus : elle
  // débordait sur le bloc voisin. On remesure donc dès que la tâche courante
  // est finie, et une dernière fois quand les polices sont là. La passe est
  // idempotente et ne programme rien elle-même : aucune boucle possible.
  function applyFit(){ pass(); setTimeout(pass, 0); }
  new ResizeObserver(() => { if (!Model.state.view.eqCollapsed) applyFit(); })
    .observe(document.querySelector('#eqstrip .eq-body'));

  // molette sur une équation débordante : défilement horizontal
  for (const box of document.querySelectorAll('#eqstrip .eq-scroll'))
    box.addEventListener('wheel', ev => {
      if (box.scrollWidth <= box.clientWidth) return;
      ev.preventDefault();
      box.scrollLeft += Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    }, { passive: false });
  // Les polices KaTeX arrivent après le premier rendu et changent toutes les
  // largeurs : on remesure sans condition (une passe sur un bandeau replié ne
  // coûte rien et évite de rester sur des mesures de police de repli).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pass);

  function render(){
    const collapsed = Model.state.view.eqCollapsed;
    strip.classList.toggle('collapsed', collapsed);
    caret.textContent = collapsed ? '▸' : '▾';
    eqToggle.title = t(collapsed ? 'eqShow' : 'eqHide');
    eqToggle.setAttribute('aria-label', eqToggle.title);
    eqToggle.setAttribute('aria-expanded', String(!collapsed));
    fitChk.checked = Model.state.view.eqFit;
    const freq = Model.state.view.eqFreq;
    freqChk.checked = freq;
    rowFreq.classList.toggle('hidden', !freq);
    if (collapsed) return;
    const { fact, expd, ode, mod, arg } = TeX.all();
    katex.render(fact, elF, { throwOnError: false });
    katex.render(expd, elE, { throwOnError: false });
    katex.render(ode, elO, { throwOnError: false });
    if (freq){
      katex.render(mod, elM, { throwOnError: false });
      katex.render(arg, elA, { throwOnError: false });
    }
    applyFit();
  }

  // comme les autres panneaux : une reprise explicite, qui n'attend pas le
  // ResizeObserver (les glissières redistribuent la largeur sans le réveiller)
  const resize = () => { if (!Model.state.view.eqCollapsed) applyFit(); };

  return { render, refreshLang, resize };
})();
