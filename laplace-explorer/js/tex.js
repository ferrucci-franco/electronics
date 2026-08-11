'use strict';
/* Mise en TeX du modèle (cahier §3) — forme factorisée, forme développée,
   équation différentielle, module et phase.
   Aucun accès au DOM : ce fichier ne connaît que Model, ce qui le rend
   vérifiable hors navigateur (voir tests/run.js). equations.js garde ce qui
   touche à l'écran : rendu KaTeX, répartition des largeurs, repli. */
const TeX = (() => {

  // ---------- formats ----------
  function fmtC(v){
    if (Math.abs(v) < 1e-12) return '0';
    if (Math.abs(v) >= 1e4 || Math.abs(v) < 1e-3){
      const m = v.toExponential(2).match(/^(-?[\d.]+)e([+-]\d+)$/);
      return `${m[1]} \\cdot 10^{${Number(m[2])}}`;
    }
    return String(Number(v.toPrecision(3)));
  }

  // ---------- forme factorisée ----------
  function linTeX(sigma, mult){
    const e = mult > 1 ? `^{${mult}}` : '';
    if (sigma === 0) return `s${e}`;
    const a = -sigma;
    return `(s ${a < 0 ? '-' : '+'} ${fmtC(Math.abs(a))})${e}`;
  }
  function factorTeX(el){
    if (el.type === 'pair'){
      if (el.omega === 0) return linTeX(el.sigma, el.mult * 2);   // paire dégénérée sur l'axe réel
      const a = -el.sigma;
      const aPart = a === 0 ? '' : (a < 0 ? ` - ${fmtC(-a)}` : ` + ${fmtC(a)}`);
      const e = el.mult > 1 ? `^{${el.mult}}` : '';
      return `(s${aPart} - ${fmtC(el.omega)}j)${e}(s${aPart} + ${fmtC(el.omega)}j)${e}`;
    }
    return linTeX(el.sigma, el.mult);
  }

  // ---------- module et phase : la forme factorisée, s → jω, développée ----------
  // Chaque facteur (s + a) de la ligne du dessus donne ici une racine carrée et
  // une arctangente en ω — des fonctions calculables, pas des |·| et des arg(·)
  // qui ne font que renommer le problème. Le vis-à-vis reste facteur à facteur :
  // c'est ce que la construction « règle et compas » dessine dans le plan s
  // (produit de distances, somme d'angles). La multiplicité, exposant dans le
  // module, devient un coefficient dans la somme des arguments.
  // paire dégénérée : un seul binôme, mais compté deux fois (comme en factorisée)
  const multOf = el => (el.type === 'pair' && el.omega === 0) ? el.mult * 2 : el.mult;

  // Développement de chaque binôme : en s = jω, (s + a ∓ ω₀j) vaut a + j(ω ∓ ω₀),
  // de module √(a² + (ω ∓ ω₀)²) et d'argument arctan((ω ∓ ω₀)/a) — l'écriture du
  // cours. L'arctangente ne vaut que pour une partie réelle a > 0 ; les deux cas
  // où l'app en sort sont traités : a = 0 (racine sur l'axe jω) donne ±90°, et
  // a < 0 (zéro à déphasage non minimal) donne 180° − arctan, exact modulo 360°.
  function devTerms(el){
    const a = -el.sigma;
    const w0s = (el.type === 'pair' && el.omega !== 0) ? [-el.omega, el.omega] : [0];
    return w0s.map(w0 => {
      const im = w0 === 0 ? '\\omega'
                          : `\\omega ${w0 < 0 ? '-' : '+'} ${fmtC(Math.abs(w0))}`;
      const imP = w0 === 0 ? '\\omega' : `(${im})`;
      if (a === 0)                                     // racine sur l'axe jω
        return { mod: w0 === 0 ? '\\omega' : `\\left|${im}\\right|`,
                 angle: true, sgn: w0 === 0 ? null : im };
      // La fraction est écrite même quand a = 1 : la simplifier faisait passer
      // les deux facteurs concernés pour des termes laissés en plan à côté de
      // leurs voisins. Tous les facteurs s'écrivent pareil, c'est le but.
      const aa = Math.abs(a);
      const at = `\\arctan \\dfrac{${im}}{${fmtC(aa)}}`;
      return { mod: `\\sqrt{${imP}^{2} + ${fmtC(aa * aa)}}`,
               arg: a > 0 ? at : `\\left(180^\\circ - ${at}\\right)` };
    });
  }

  function absTeX(list){
    const out = [];
    for (const el of list){
      const m = multOf(el);
      for (const t of devTerms(el))
        out.push(m === 1 ? t.mod
               : t.mod === '\\omega' ? `\\omega^{${m}}`
               : `\\left(${t.mod}\\right)^{${m}}`);
    }
    return out.join('\\,');
  }
  function argTerms(list, sign){
    const out = [];
    for (const el of list){
      const m = multOf(el);
      for (const t of devTerms(el)){
        // un angle droit se multiplie tout de suite : « 180° », pas « 2 · 90° »
        const term = t.angle
          ? (t.sgn ? `\\mathrm{sgn}(${t.sgn})\\,` : '') + `${90 * m}^\\circ`
          : (m > 1 ? `${m}\\,` : '') + t.arg;
        out.push({ sign, term });
      }
    }
    return out;
  }

  // ---------- polynôme développé ----------
  function polyTeX(c){
    const deg = c.length - 1;
    const terms = [];
    c.forEach((v, i) => {
      if (Math.abs(v) < 1e-12) return;
      const p = deg - i;
      const sPart = p === 0 ? '' : (p === 1 ? 's' : `s^{${p}}`);
      const a = Math.abs(v);
      const coefStr = (p > 0 && Math.abs(a - 1) < 1e-12) ? '' : fmtC(a);
      terms.push({ neg: v < 0, term: coefStr + sPart });
    });
    if (!terms.length) return '0';
    return terms.map((tm, i) =>
      (i === 0 ? (tm.neg ? '-' : '') : (tm.neg ? ' - ' : ' + ')) + tm.term).join('');
  }

  // ---------- équation différentielle ----------
  // `arg` : argument explicite des symboles, vide sans retard. Avec retard, le
  // membre de gauche s'écrit en (t) et le membre de droite entièrement en
  // (t − T), dérivées de u comprises — forme directe retenue au §1 bis.
  function odeSide(c, sym, arg){
    const deg = c.length - 1;
    const terms = [];
    const A = arg ? `(${arg})` : '';
    c.forEach((v, i) => {
      if (Math.abs(v) < 1e-12) return;
      const k = deg - i;
      const d = (k === 0 ? sym
        : k === 1 ? `\\dot{${sym}}`
        : k === 2 ? `\\ddot{${sym}}`
        : k === 3 ? `\\dddot{${sym}}`
        : `${sym}^{(${k})}`) + A;
      const a = Math.abs(v);
      const coefStr = Math.abs(a - 1) < 1e-12 ? '' : fmtC(a);
      terms.push({ neg: v < 0, term: coefStr + d });
    });
    if (!terms.length) return '0';
    return terms.map((tm, i) =>
      (i === 0 ? (tm.neg ? '-' : '') : (tm.neg ? ' - ' : ' + ')) + tm.term).join('');
  }

  // ---------- assemblage ----------
  function all(){
    const { num, den } = Model.polys();
    const K = Model.state.K;
    const hasP = Model.state.poles.length > 0;
    const hasZ = Model.state.zeros.length > 0;

    // retard pur : e^(−Ts) devant la fraction, jamais dedans (§1 bis)
    const T = Model.state.delay;
    const expo = T > 0 ? `e^{-${fmtC(T)}s} \\cdot ` : '';
    const kPrefix = (Math.abs(K - 1) < 1e-9 ? '' : `${fmtC(K)} \\cdot `) + expo;
    const numF = Model.state.zeros.map(factorTeX).join('') || '1';
    const denF = Model.state.poles.map(factorTeX).join('');
    let fact;
    if (hasP) fact = `H(s) = ${kPrefix}\\dfrac{${numF}}{${denF}}`;
    else if (hasZ) fact = `H(s) = ${kPrefix}${numF}`;
    else fact = `H(s) = ${fmtC(K)}${expo ? ' \\cdot ' + expo.replace(' \\cdot ', '') : ''}`;

    const numC = num.map(v => v * K);
    const expd = hasP
      ? `H(s) = ${expo}\\dfrac{${polyTeX(numC)}}{${polyTeX(den)}}`
      : `H(s) = ${expo}${polyTeX(numC)}`;

    // membre de gauche en t, membre de droite en t − T (forme directe, §1 bis)
    const ode = `${odeSide(den, 'y', T > 0 ? 't' : '')} = `
              + `${odeSide(numC, 'u', T > 0 ? `t - ${fmtC(T)}` : '')}`;

    // module : |K| et non K — le signe part dans la phase, +180°
    const kAbs = Math.abs(K);
    const kAbsPrefix = Math.abs(kAbs - 1) < 1e-9 ? '' : `${fmtC(kAbs)} \\cdot `;
    const numA = absTeX(Model.state.zeros), denA = absTeX(Model.state.poles);
    let mod;
    if (hasP) mod = `\\left|H(j\\omega)\\right| = ${kAbsPrefix}\\dfrac{${numA || '1'}}{${denA}}`;
    else if (hasZ) mod = `\\left|H(j\\omega)\\right| = ${kAbsPrefix}${numA}`;
    else mod = `\\left|H(j\\omega)\\right| = ${fmtC(kAbs)}`;

    const terms = [...argTerms(Model.state.zeros, 1), ...argTerms(Model.state.poles, -1)];
    if (K < 0) terms.unshift({ sign: 1, term: '180^\\circ' });   // le signe du gain
    // Le retard ferme la somme : un terme linéaire en ω, en degrés, à côté
    // d'arctangentes qui saturent. C'est toute la leçon en une ligne (§1 bis).
    if (T > 0) terms.push({ sign: -1, term: `${fmtC(180 * T / Math.PI)}\\,\\omega` });
    const argBody = terms.length
      ? terms.map((tm, i) => (i === 0 ? (tm.sign < 0 ? '-' : '')
                                      : (tm.sign < 0 ? ' - ' : ' + ')) + tm.term).join('')
      : '0';
    const arg = `\\arg H(j\\omega) = ${argBody}`;

    return { fact, expd, ode, mod, arg };
  }

  return { all, fmtC, factorTeX, polyTeX, odeSide, devTerms, absTeX, argTerms };
})();
