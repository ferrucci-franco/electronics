/* Quiz (self-study, in the spirit of flash-card decks): decks of questions on live circuits.
 * Each question draws its values at random, builds its circuit, and is checked against the simulator:
 *   { id, title, params: { name: [values] }, ok(p, sol) (optional: the draw is kept only if true),
 *     circuit(p) -> example-like spec { c, w }, text: { fr|es|en: (p, h) -> html },
 *     answer: { kind: 'num', unit, value(p, sol), tol } | { kind: 'choice', options: { fr|es|en: [..] }, value(p, sol) -> index },
 *     explain: { fr|es|en: (p, sol, h) -> html } }
 * While a question is open the simulated values are hidden and the circuit is locked; once answered they are
 * shown and the circuit can be played with. Progress (best score, questions mastered) is kept in the browser. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, U = DCS.units, I = DCS.i18n, N = DCS.netlist, S = DCS.solver;
  const decks = [];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (tag, attrs, html) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  };
  const btn = (label, fn, cls) => { const b = el('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : '') }, label); b.addEventListener('click', fn); return b; };
  const lang = () => I.getLang();
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[lang()] != null ? o[lang()] : o.fr != null ? o.fr : o.en));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // helpers given to the texts: value with unit, the usual junction voltages written in the language
  const helpers = () => {
    const comma = lang() !== 'en';
    const num = (x, d) => { const s = String(Number(x.toPrecision(d || 3))); return comma ? s.replace('.', ',') : s; };
    return { f: (v, u) => U.format(v, u, { digits: 3, trim: true }), num, vbe: comma ? '0,7 V' : '0.7 V', vsat: comma ? '0,2 V' : '0.2 V' };
  };

  // the circuit of a spec, solved apart (to keep a draw, and to know the right answer)
  function solveSpec(spec) {
    const circuit = DCS.examples.make(spec);
    const net = N.build(circuit);
    const res = S.solve(net.ckt, {});
    const byName = (n) => { const c = circuit.comps.find(x => x.name === n); return c && res.ok ? res.el[c.id] : null; };
    return { circuit, res, ok: res.ok, el: byName, comp: (n) => circuit.comps.find(x => x.name === n) };
  }
  function draw(q) {
    for (let k = 0; k < 80; k++) {
      const p = {};
      for (const key in q.params) p[key] = pick(q.params[key]);
      const sol = solveSpec(q.circuit(p));
      if (sol.ok && (!q.ok || q.ok(p, sol))) return { p, sol };
    }
    return null;
  }

  /* ---------- progress ---------- */
  const LSK = (id) => 'dcs.quiz.' + id;
  const loadProg = (app, id) => { try { return JSON.parse(app.LS.get(LSK(id)) || '{}'); } catch (e) { return {}; } };
  const saveProg = (app, id, pr) => app.LS.set(LSK(id), JSON.stringify(pr));

  /* ---------- session ---------- */
  function Quiz(app) {
    const t = app.t;
    const Q = {};
    let st = null;   // { deck, order, pos, score, wrong, cur: { q, p, sol, revealed, given, right } }
    const onQuizTab = () => !!(st && app.tabs[app.tabIdx] && app.tabs[app.tabIdx].name === st.tabName);
    // the simulated values are hidden (and the circuit locked) only on the quiz's own tab, while a question is open
    app.quizHidden = () => !!(st && st.cur && !st.cur.revealed && onQuizTab());
    function ensureTab() {
      if (onQuizTab()) return;
      const k = app.tabs.findIndex(tb => tb.name === st.tabName);
      if (k >= 0) app.switchTab(k); else app.openInTab({ comps: [], wires: [] }, st.tabName);
    }
    app.quizActive = () => !!st;
    const pane = () => document.getElementById('pane-quiz');
    const tabBtn = () => document.querySelector('.tabs [data-tab=quiz]');

    Q.decks = decks;
    Q.start = function (id, only) {
      const deck = decks.find(d => d.id === id);
      if (!deck) return false;
      const order = only ? only.slice() : deck.questions.map((_, k) => k);
      // a tab of its own for the circuits of the quiz
      st = { deck, order, pos: 0, score: 0, wrong: [], total: order.length, tabName: 'Quiz · ' + L(deck.short || deck.title) };
      ensureTab();
      tabBtn().hidden = false;
      loadQuestion();
      app.ui.showTab('quiz', true);
      fitVisible();
      return true;
    };
    Q.quit = function () {
      st = null;
      tabBtn().hidden = true;
      app.ui.showTab('props', false);
      app.circuitChanged();
    };
    function loadQuestion() {
      const qi = st.order[st.pos];
      const q = st.deck.questions[qi];
      const d = draw(q);
      ensureTab();
      st.cur = { q, qi, p: d.p, sol: d.sol, revealed: false, given: null, right: null };
      app.sel.clear();
      app.loadCircuit(DCS.examples.make(q.circuit(d.p)), { fit: true });
      fitVisible();
      app.undoStack = []; app.redoStack = []; app.ui.updateHistory();
      render();
    }
    // phone: the panel sheet covers the lower part of the circuit area, the circuit is framed above it
    function fitVisible() {
      if (!document.documentElement.classList.contains('layout-mobile')) return;
      requestAnimationFrame(() => {
        const side = document.getElementById('side'), cv = document.getElementById('cv');
        if (!side.classList.contains('open')) { app.fit(); return; }
        // (from the sheet's final height: it may still be sliding up)
        const inset = Math.max(0, cv.getBoundingClientRect().bottom - (window.innerHeight - side.offsetHeight));
        app.fit({ bottom: inset });
      });
    }
    function check(given) {
      const c = st.cur, a = c.q.answer;
      let want = a.value(c.p, c.sol);
      let right;
      if (a.kind === 'choice') right = given === want;
      else {
        // relative tolerance (rounding in hand calculations), with an absolute floor for answers near 0
        // (a transistor cut off: I_C = 0 up to the simulator's leakage)
        const ABS = { A: 1e-9, V: 0.02, W: 1e-9, 'Ω': 0.5 };
        const abs = a.abs != null ? a.abs : (ABS[a.unit] || 0);
        if (Math.abs(want) < abs) want = 0;
        const tol = a.tol || 0.04;
        right = isFinite(given) && Math.abs(given - want) <= Math.max(tol * Math.abs(want), abs);
      }
      c.given = given; c.right = right; c.want = want; c.revealed = true;
      if (right) st.score++; else st.wrong.push(c.qi);
      // progress: a question is mastered after two right answers in a row
      const pr = loadProg(app, st.deck.id);
      pr.q = pr.q || {};
      pr.q[c.q.id] = right ? Math.min(5, (pr.q[c.q.id] || 0) + 1) : 0;
      saveProg(app, st.deck.id, pr);
      app.circuitChanged();      // the hidden values come back on the circuit
      app.requestRender();
      render();
    }
    function next() {
      st.pos++;
      if (st.pos >= st.order.length) { finish(); return; }
      loadQuestion();
      // phone: the panel goes back up for the next question
      app.ui.showTab('quiz', true);
      fitVisible();
    }
    function finish() {
      st.cur = null;
      const pr = loadProg(app, st.deck.id);
      if (st.total === st.deck.questions.length) pr.best = Math.max(pr.best || 0, st.score), pr.n = st.total;
      saveProg(app, st.deck.id, pr);
      app.circuitChanged();
      render();
    }

    /* ---------- panel ---------- */
    function render() {
      const P = pane();
      if (!P) return;
      P.innerHTML = '';
      if (!st) return;
      const h = helpers();
      const card = el('div', { class: 'card quiz' });
      const head = el('div', { class: 'quiz-head' });
      head.appendChild(el('b', null, esc(L(st.deck.title))));
      head.appendChild(btn('✕', () => Q.quit(), 'quiz-x'));
      card.appendChild(head);
      if (!st.cur) {
        // the end of the session
        card.appendChild(el('div', { class: 'quiz-score' }, t('quiz_score', { s: st.score, n: st.total })));
        const pr = loadProg(app, st.deck.id);
        if (pr.best != null) card.appendChild(el('div', { class: 'hint' }, t('quiz_best', { s: pr.best, n: pr.n })));
        const row = el('div', { class: 'btnrow' });
        if (st.wrong.length) row.appendChild(btn(t('quiz_retry_wrong', { n: st.wrong.length }), () => { const w = st.wrong.slice(); Q.start(st.deck.id, w); }, 'primary'));
        row.appendChild(btn(t('quiz_restart'), () => Q.start(st.deck.id)));
        row.appendChild(btn(t('quiz_quit'), () => Q.quit()));
        card.appendChild(row);
        P.appendChild(card);
        return;
      }
      const c = st.cur, q = c.q, a = q.answer;
      // progress bar
      const bar = el('div', { class: 'quiz-bar' });
      const fill = el('span');
      fill.style.width = (100 * (st.pos + (c.revealed ? 1 : 0)) / st.total) + '%';
      bar.appendChild(fill);
      card.appendChild(el('div', { class: 'quiz-pos' }, t('quiz_pos', { i: st.pos + 1, n: st.total }) + (q.title ? ' · ' + L(q.title) : '')));   // (titles are written by the deck: HTML)
      card.appendChild(bar);
      card.appendChild(el('div', { class: 'quiz-text' }, L(q.text)(c.p, h)));
      if (a.kind === 'choice') {
        const opts = L(a.options);
        const box = el('div', { class: 'quiz-choices' });
        opts.forEach((o, k) => {
          const b = btn(o, () => { if (!c.revealed) check(k); }, 'quiz-choice');
          if (c.revealed) {
            b.disabled = true;
            if (k === c.want) b.classList.add('right');
            else if (k === c.given) b.classList.add('wrong');
          }
          box.appendChild(b);
        });
        card.appendChild(box);
      } else {
        const row = el('div', { class: 'quiz-answer' });
        const inp = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: t('quiz_ph') });
        if (c.revealed) { inp.value = c.givenText || ''; inp.disabled = true; }
        const wrap = el('div', { class: 'unit-in' });
        wrap.appendChild(inp); wrap.appendChild(el('span', null, esc(a.unit)));
        row.appendChild(wrap);
        const go = () => {
          if (c.revealed) return;
          const v = U.parse(inp.value);
          if (!isFinite(v)) { inp.classList.add('bad'); return; }
          c.givenText = inp.value;
          check(v);
        };
        if (!c.revealed) row.appendChild(btn(t('quiz_check'), go, 'primary'));
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        card.appendChild(row);
        if (!c.revealed) card.appendChild(el('div', { class: 'hint' }, t('quiz_units')));
        if (!c.revealed) requestAnimationFrame(() => { if (!document.documentElement.classList.contains('layout-mobile')) inp.focus(); });
      }
      if (c.revealed) {
        const fb = el('div', { class: 'quiz-fb ' + (c.right ? 'right' : 'wrong') });
        const shown = a.kind === 'choice' ? esc(L(a.options)[c.want]) : h.f(c.want, a.unit);
        fb.innerHTML = (c.right ? '✓ ' + t('quiz_right') : '✗ ' + t('quiz_wrong') + (a.kind === 'num' ? ' · ' + t('quiz_answer', { a: shown }) : ''));
        card.appendChild(fb);
        card.appendChild(el('div', { class: 'quiz-explain' }, L(q.explain)(c.p, c.sol, h)));
        card.appendChild(el('div', { class: 'hint' }, t('quiz_play')));
        const row = el('div', { class: 'btnrow' });
        row.appendChild(btn(st.pos + 1 < st.total ? t('quiz_next') + ' →' : t('quiz_finish'), next, 'primary'));
        card.appendChild(row);
      } else card.appendChild(el('div', { class: 'hint' }, t('quiz_hidden')));
      P.appendChild(card);
    }
    Q.render = render;
    Q.current = () => (st && st.cur ? { q: st.cur.q, p: st.cur.p, sol: st.cur.sol } : null);   // (tests)

    /* ---------- the list of decks ---------- */
    Q.chooser = function () {
      const g = el('div', { class: 'ex-grid' });
      for (const d of decks) {
        const pr = loadProg(app, d.id);
        const mastered = Object.values(pr.q || {}).filter(v => v >= 2).length;
        const card = el('div', { class: 'ex-card quiz-card' });
        card.appendChild(el('b', null, esc(L(d.title))));
        card.appendChild(el('span', null, esc(L(d.desc))));
        card.appendChild(el('span', { class: 'quiz-prog' }, t('quiz_prog', { n: d.questions.length, m: mastered }) + (pr.best != null ? ' · ' + t('quiz_best', { s: pr.best, n: pr.n }) : '')));
        const row = el('div', { class: 'btnrow' });
        row.appendChild(btn(t('quiz_start'), () => { app.closeModal(); Q.start(d.id); }, 'primary'));
        row.appendChild(btn('QR', () => DCS.share.showQRFor(app, app.ui, location.href.split('#')[0] + '#quiz=' + d.id, L(d.title))));
        card.appendChild(row);
        g.appendChild(card);
      }
      app.ui.openModal(t('quiz_title'), g);
    };
    return Q;
  }

  DCS.quiz = { register: (d) => decks.push(d), create: (app) => Quiz(app), decks, solveSpec };
})(window);
