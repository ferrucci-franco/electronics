/* Quiz deck: equivalent resistance between two terminals A and B.  Series, parallel, mixed networks, ladders,
 * shorted and dangling resistors, the same network seen from other terminals, Wheatstone bridge (balanced, and
 * unbalanced: Δ → Y), sources turned off (V → short circuit, I → open circuit), series / parallel recognition.
 * Each circuit spec carries `ab` (the points A and B): once answered, the quiz opens the analysis between A and B,
 * so the Thévenin & R_eq tab shows the reduction step by step.  Texts in French, Spanish and English. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const k = 1e3;
  const L3 = (fr, es, en) => ({ fr, es, en });
  const G = (x, y) => ['ground', '', x, y, 0];
  const R = (name, x, y, rot, v) => ['resistor', name, x, y, rot, { R: v }];
  const ser = (...r) => r.reduce((a, b) => a + b, 0);
  const par = (...r) => 1 / r.reduce((a, b) => a + 1 / b, 0);
  const AB = (a, b) => [[a[0], a[1], 'A'], [b[0], b[1], 'B']];

  /* ----- networks (grid units); A and B are free wire ends, drawn as flags ----- */
  // R1 (top) – R2 (right) – R3 (bottom): a path from A to B; short: a wire across R2
  function series3(p, short) {
    const w = [[[0, 0], [2, 0]], [[6, 0], [8, 0], [8, 2]], [[8, 6], [8, 8], [6, 8]], [[2, 8], [0, 8]]];
    if (short) w.push([[8, 0], [11, 0], [11, 8], [8, 8]]);
    return { c: [R('R1', 4, 0, 0, p.R1), R('R2', 8, 4, 1, p.R2), R('R3', 4, 8, 0, p.R3)], w, n: AB([0, 0], [0, 8]), ab: [[0, 0], [0, 8]] };
  }
  // n resistors between two rails
  function parallel(rs) {
    const n = rs.length, c = [], w = [[[0, 0], [4 * n, 0]], [[0, 8], [4 * n, 8]]];
    rs.forEach((v, i) => { const x = 4 * (i + 1); c.push(R('R' + (i + 1), x, 4, 1, v)); w.push([[x, 0], [x, 2]], [[x, 6], [x, 8]]); });
    return { c, w, n: AB([0, 0], [0, 8]), ab: [[0, 0], [0, 8]] };
  }
  // R1 + (R2 ∥ R3)
  function serPar(p) {
    return {
      c: [R('R1', 4, 0, 0, p.R1), R('R2', 8, 4, 1, p.R2), R('R3', 12, 4, 1, p.R3)],
      w: [[[0, 0], [2, 0]], [[6, 0], [12, 0], [12, 2]], [[8, 0], [8, 2]], [[8, 6], [8, 8]], [[12, 6], [12, 8]], [[0, 8], [12, 8]]],
      n: AB([0, 0], [0, 8]), ab: [[0, 0], [0, 8]]
    };
  }
  // (R1 + R2) ∥ R3
  function parSer(p) {
    return {
      c: [R('R3', 4, 4, 1, p.R3), R('R1', 10, 0, 0, p.R1), R('R2', 14, 4, 1, p.R2)],
      w: [[[0, 0], [8, 0]], [[4, 0], [4, 2]], [[4, 6], [4, 8]], [[12, 0], [14, 0], [14, 2]], [[14, 6], [14, 8]], [[0, 8], [14, 8]]],
      n: AB([0, 0], [0, 8]), ab: [[0, 0], [0, 8]]
    };
  }
  // ladder: R1 + R2 ∥ (R3 + R4) and, with three sections, R1 + R2 ∥ (R3 + R4 ∥ (R5 + R6))
  function ladder(p, three) {
    const c = [R('R1', 4, 0, 0, p.R1), R('R2', 8, 4, 1, p.R2), R('R3', 12, 0, 0, p.R3), R('R4', 16, 4, 1, p.R4)];
    const w = [[[0, 0], [2, 0]], [[6, 0], [10, 0]], [[8, 0], [8, 2]], [[8, 6], [8, 8]], [[16, 6], [16, 8]]];
    if (three) {
      c.push(R('R5', 20, 0, 0, p.R5), R('R6', 24, 4, 1, p.R6));
      w.push([[14, 0], [18, 0]], [[16, 0], [16, 2]], [[22, 0], [24, 0], [24, 2]], [[24, 6], [24, 8]], [[0, 8], [24, 8]]);
    } else w.push([[14, 0], [16, 0], [16, 2]], [[0, 8], [16, 8]]);
    return { c, w, n: AB([0, 0], [0, 8]), ab: [[0, 0], [0, 8]] };
  }
  // R1 and R2 in series, R3 hanging from the node between them (its other end free)
  function dangling(p) {
    return {
      c: [R('R1', 4, 0, 0, p.R1), R('R2', 4, 8, 0, p.R2), R('R3', 12, 4, 0, p.R3)],
      w: [[[0, 0], [2, 0]], [[6, 0], [8, 0], [8, 8], [6, 8]], [[2, 8], [0, 8]], [[8, 4], [10, 4]]],
      n: AB([0, 0], [0, 8]), ab: [[0, 0], [0, 8]]
    };
  }
  // a ring R1 (top), R2 (right), R3 (bottom); A on the left side, B at the corner between R1 and R2
  function ring(p) {
    return {
      c: [R('R1', 4, 0, 0, p.R1), R('R2', 8, 4, 1, p.R2), R('R3', 4, 8, 0, p.R3)],
      w: [[[2, 0], [0, 0], [0, 8], [2, 8]], [[6, 0], [8, 0], [8, 2]], [[8, 6], [8, 8], [6, 8]], [[0, 4], [-3, 4]], [[8, 0], [8, -3]]],
      n: AB([-3, 4], [8, -3]), ab: [[-3, 4], [8, -3]]
    };
  }
  // Wheatstone bridge: R1 (A–C), R2 (A–D), R3 (C–B), R4 (D–B), R5 (C–D)
  function bridge(p) {
    return {
      c: [R('R1', 4, 4, 1, p.R1), R('R3', 4, 10, 1, p.R3), R('R2', 12, 4, 1, p.R2), R('R4', 12, 10, 1, p.R4), R('R5', 8, 7, 0, p.R5)],
      w: [[[0, 0], [12, 0], [12, 2]], [[4, 0], [4, 2]], [[4, 6], [4, 8]], [[12, 6], [12, 8]], [[4, 7], [6, 7]], [[10, 7], [12, 7]],
        [[4, 12], [4, 14], [12, 14], [12, 12]], [[0, 14], [4, 14]]],
      n: AB([0, 0], [0, 14]), ab: [[0, 0], [0, 14]]
    };
  }
  // a source (V or I) with R1 in series, R2 across, R3 towards A
  function withSource(p) {
    const src = p.src === 'V' ? ['vsource', 'V1', 0, 4, 1, { V: 10 }] : ['isource', 'I1', 0, 4, 1, { I: 2e-3 }];
    return {
      c: [src, R('R1', 4, 0, 0, p.R1), R('R2', 8, 4, 1, p.R2), R('R3', 12, 0, 0, p.R3), G(4, 8)],
      w: [[[0, 2], [0, 0], [2, 0]], [[6, 0], [10, 0]], [[8, 0], [8, 2]], [[8, 6], [8, 8]], [[14, 0], [16, 0]], [[0, 6], [0, 8], [16, 8]]],
      n: AB([16, 0], [16, 8]), ab: [[16, 0], [16, 8]]
    };
  }
  // the bridge after Δ → Y on the triangle A, C, D
  function bridgeReq(p) {
    const S = p.R1 + p.R2 + p.R5, ra = p.R1 * p.R2 / S, rc = p.R1 * p.R5 / S, rd = p.R2 * p.R5 / S;
    return { S, ra, rc, rd, req: ra + par(rc + p.R3, rd + p.R4) };
  }

  /* ----- texts ----- */
  const list = (p, h, names) => names.map((n) => `${n} = ${h.f(p[n], 'Ω')}`).join(', ');
  const ask = L3('<b>Calculez la résistance équivalente R<sub>éq</sub> entre A et B.</b>', '<b>Calcule la resistencia equivalente R<sub>eq</sub> entre A y B.</b>', '<b>Find the equivalent resistance R<sub>eq</sub> between A and B.</b>');
  const txt = (names, pre) => ({
    fr: (p, h) => `${pre ? pre.fr(p, h) + ' ' : ''}${list(p, h, names)}.<br>${ask.fr}`,
    es: (p, h) => `${pre ? pre.es(p, h) + ' ' : ''}${list(p, h, names)}.<br>${ask.es}`,
    en: (p, h) => `${pre ? pre.en(p, h) + ' ' : ''}${list(p, h, names)}.<br>${ask.en}`
  });
  // at the end of every explanation: where to see the reduction in the simulator
  const tip = L3(
    '<br><span class="hint">Dans le circuit, l’analyse entre A et B est ouverte : onglet <b>Thévenin et R<sub>éq</sub></b>, « Afficher la démarche » pour la réduction pas à pas.</span>',
    '<br><span class="hint">En el circuito quedó abierto el análisis entre A y B: pestaña <b>Thévenin y R<sub>eq</sub></b>, «Mostrar deducción» para la reducción paso a paso.</span>',
    '<br><span class="hint">The analysis between A and B is now open on the circuit: tab <b>Thévenin &amp; R<sub>eq</sub></b>, “Show derivation” for the step-by-step reduction.</span>');
  const ex = (fr, es, en) => ({ fr: (p, s, h) => fr(p, h) + tip.fr, es: (p, s, h) => es(p, h) + tip.es, en: (p, s, h) => en(p, h) + tip.en });
  const num = { kind: 'num', unit: 'Ω' };

  // values (series: any; parallels: values that give round results most of the time)
  const RS = [1 * k, 1.5 * k, 2.2 * k, 3.3 * k, 4.7 * k, 6.8 * k, 10 * k];
  const RP = [1 * k, 2 * k, 3 * k, 4 * k, 6 * k, 12 * k];
  const RM = [1 * k, 2 * k, 3 * k, 4 * k, 6 * k, 10 * k, 12 * k];

  const questions = [
    {
      id: 's1', title: L3('Résistances en série', 'Resistencias en serie', 'Resistors in series'),
      params: { R1: RS, R2: RS, R3: RS },
      circuit: (p) => series3(p), text: txt(['R1', 'R2', 'R3']),
      answer: Object.assign({ value: (p) => ser(p.R1, p.R2, p.R3) }, num),
      explain: ex(
        (p, h) => `R1, R2 et R3 sont parcourues par le même courant (aucun autre élément aux nœuds entre elles) : elles sont en <b>série</b> et leurs résistances s’ajoutent : R<sub>éq</sub> = R1 + R2 + R3 = <b>${h.f(ser(p.R1, p.R2, p.R3), 'Ω')}</b>.`,
        (p, h) => `R1, R2 y R3 llevan la misma corriente (nada más se conecta en los nodos entre ellas): están en <b>serie</b> y se suman: R<sub>eq</sub> = R1 + R2 + R3 = <b>${h.f(ser(p.R1, p.R2, p.R3), 'Ω')}</b>.`,
        (p, h) => `R1, R2 and R3 carry the same current (nothing else is connected at the nodes between them): they are in <b>series</b> and add up: R<sub>eq</sub> = R1 + R2 + R3 = <b>${h.f(ser(p.R1, p.R2, p.R3), 'Ω')}</b>.`)
    },
    {
      id: 'p1', title: L3('Deux résistances en parallèle', 'Dos resistencias en paralelo', 'Two resistors in parallel'),
      params: { R1: RP, R2: RP }, ok: (p) => p.R1 !== p.R2,
      circuit: (p) => parallel([p.R1, p.R2]), text: txt(['R1', 'R2']),
      answer: Object.assign({ value: (p) => par(p.R1, p.R2) }, num),
      explain: ex(
        (p, h) => `R1 et R2 sont branchées entre les deux mêmes nœuds (A et B) : elles ont la même tension, elles sont en <b>parallèle</b>. Produit sur somme : R<sub>éq</sub> = R1·R2/(R1 + R2) = <b>${h.f(par(p.R1, p.R2), 'Ω')}</b>, plus petite que la plus petite des deux.`,
        (p, h) => `R1 y R2 están conectadas entre los mismos dos nodos (A y B): tienen la misma tensión, están en <b>paralelo</b>. Producto sobre suma: R<sub>eq</sub> = R1·R2/(R1 + R2) = <b>${h.f(par(p.R1, p.R2), 'Ω')}</b>, menor que la menor de las dos.`,
        (p, h) => `R1 and R2 are connected between the same two nodes (A and B): same voltage, they are in <b>parallel</b>. Product over sum: R<sub>eq</sub> = R1·R2/(R1 + R2) = <b>${h.f(par(p.R1, p.R2), 'Ω')}</b>, smaller than the smaller one.`)
    },
    {
      id: 'p2', title: L3('Trois résistances en parallèle', 'Tres resistencias en paralelo', 'Three resistors in parallel'),
      params: { R1: RP, R2: RP, R3: RP }, ok: (p) => !(p.R1 === p.R2 && p.R2 === p.R3),
      circuit: (p) => parallel([p.R1, p.R2, p.R3]), text: txt(['R1', 'R2', 'R3']),
      answer: Object.assign({ value: (p) => par(p.R1, p.R2, p.R3) }, num),
      explain: ex(
        (p, h) => `Trois résistances en parallèle : les conductances s’ajoutent. 1/R<sub>éq</sub> = 1/R1 + 1/R2 + 1/R3, donc R<sub>éq</sub> = <b>${h.f(par(p.R1, p.R2, p.R3), 'Ω')}</b>. (Ou deux par deux : R1 ∥ R2 = ${h.f(par(p.R1, p.R2), 'Ω')}, puis ∥ R3.)`,
        (p, h) => `Tres resistencias en paralelo: se suman las conductancias. 1/R<sub>eq</sub> = 1/R1 + 1/R2 + 1/R3, entonces R<sub>eq</sub> = <b>${h.f(par(p.R1, p.R2, p.R3), 'Ω')}</b>. (O de a dos: R1 ∥ R2 = ${h.f(par(p.R1, p.R2), 'Ω')}, luego ∥ R3.)`,
        (p, h) => `Three resistors in parallel: the conductances add up. 1/R<sub>eq</sub> = 1/R1 + 1/R2 + 1/R3, so R<sub>eq</sub> = <b>${h.f(par(p.R1, p.R2, p.R3), 'Ω')}</b>. (Or two at a time: R1 ∥ R2 = ${h.f(par(p.R1, p.R2), 'Ω')}, then ∥ R3.)`)
    },
    {
      id: 'e1', title: L3('Résistances égales en parallèle', 'Resistencias iguales en paralelo', 'Equal resistors in parallel'),
      params: { n: [2, 3, 4], R: [1.2 * k, 2.4 * k, 4.8 * k, 12 * k, 3.6 * k] },
      circuit: (p) => parallel(Array(p.n).fill(p.R)),
      text: {
        fr: (p, h) => `${p.n} résistances égales R = ${h.f(p.R, 'Ω')} en parallèle.<br>${ask.fr}`,
        es: (p, h) => `${p.n} resistencias iguales R = ${h.f(p.R, 'Ω')} en paralelo.<br>${ask.es}`,
        en: (p, h) => `${p.n} equal resistors R = ${h.f(p.R, 'Ω')} in parallel.<br>${ask.en}`
      },
      answer: Object.assign({ value: (p) => p.R / p.n }, num),
      explain: ex(
        (p, h) => `n résistances égales en parallèle : R<sub>éq</sub> = R/n = ${h.f(p.R, 'Ω')}/${p.n} = <b>${h.f(p.R / p.n, 'Ω')}</b> (le courant se partage en ${p.n} parts égales).`,
        (p, h) => `n resistencias iguales en paralelo: R<sub>eq</sub> = R/n = ${h.f(p.R, 'Ω')}/${p.n} = <b>${h.f(p.R / p.n, 'Ω')}</b> (la corriente se reparte en ${p.n} partes iguales).`,
        (p, h) => `n equal resistors in parallel: R<sub>eq</sub> = R/n = ${h.f(p.R, 'Ω')}/${p.n} = <b>${h.f(p.R / p.n, 'Ω')}</b> (the current splits into ${p.n} equal parts).`)
    },
    {
      id: 'm1', title: L3('Série et parallèle (1)', 'Serie y paralelo (1)', 'Series and parallel (1)'),
      params: { R1: RS, R2: RP, R3: RP },
      circuit: (p) => serPar(p), text: txt(['R1', 'R2', 'R3']),
      answer: Object.assign({ value: (p) => p.R1 + par(p.R2, p.R3) }, num),
      explain: ex(
        (p, h) => `R2 et R3 sont entre les deux mêmes nœuds : R2 ∥ R3 = ${h.f(par(p.R2, p.R3), 'Ω')}. Cet ensemble est en série avec R1 : R<sub>éq</sub> = R1 + R2 ∥ R3 = <b>${h.f(p.R1 + par(p.R2, p.R3), 'Ω')}</b>.`,
        (p, h) => `R2 y R3 están entre los mismos dos nodos: R2 ∥ R3 = ${h.f(par(p.R2, p.R3), 'Ω')}. Ese conjunto está en serie con R1: R<sub>eq</sub> = R1 + R2 ∥ R3 = <b>${h.f(p.R1 + par(p.R2, p.R3), 'Ω')}</b>.`,
        (p, h) => `R2 and R3 are between the same two nodes: R2 ∥ R3 = ${h.f(par(p.R2, p.R3), 'Ω')}. That pair is in series with R1: R<sub>eq</sub> = R1 + R2 ∥ R3 = <b>${h.f(p.R1 + par(p.R2, p.R3), 'Ω')}</b>.`)
    },
    {
      id: 'm2', title: L3('Série et parallèle (2)', 'Serie y paralelo (2)', 'Series and parallel (2)'),
      params: { R1: RM, R2: RM, R3: RP },
      circuit: (p) => parSer(p), text: txt(['R1', 'R2', 'R3']),
      answer: Object.assign({ value: (p) => par(p.R1 + p.R2, p.R3) }, num),
      explain: ex(
        (p, h) => `R1 et R2 forment une branche en série : R1 + R2 = ${h.f(p.R1 + p.R2, 'Ω')}. Cette branche et R3 relient toutes les deux A à B : elles sont en parallèle. R<sub>éq</sub> = (R1 + R2) ∥ R3 = <b>${h.f(par(p.R1 + p.R2, p.R3), 'Ω')}</b>.`,
        (p, h) => `R1 y R2 forman una rama en serie: R1 + R2 = ${h.f(p.R1 + p.R2, 'Ω')}. Esa rama y R3 van las dos de A a B: están en paralelo. R<sub>eq</sub> = (R1 + R2) ∥ R3 = <b>${h.f(par(p.R1 + p.R2, p.R3), 'Ω')}</b>.`,
        (p, h) => `R1 and R2 form a series branch: R1 + R2 = ${h.f(p.R1 + p.R2, 'Ω')}. That branch and R3 both go from A to B: they are in parallel. R<sub>eq</sub> = (R1 + R2) ∥ R3 = <b>${h.f(par(p.R1 + p.R2, p.R3), 'Ω')}</b>.`)
    },
    {
      id: 'l1', title: L3('Réseau en échelle', 'Red escalera', 'Ladder network'),
      params: { R1: RM, R2: RP, R3: RM, R4: RM },
      circuit: (p) => ladder(p), text: txt(['R1', 'R2', 'R3', 'R4']),
      answer: Object.assign({ value: (p) => p.R1 + par(p.R2, p.R3 + p.R4) }, num),
      explain: ex(
        (p, h) => `On réduit depuis l’extrémité la plus éloignée de A et B : R3 + R4 = ${h.f(p.R3 + p.R4, 'Ω')} (série) ; en parallèle avec R2 : ${h.f(par(p.R2, p.R3 + p.R4), 'Ω')} ; puis en série avec R1 : R<sub>éq</sub> = <b>${h.f(p.R1 + par(p.R2, p.R3 + p.R4), 'Ω')}</b>.`,
        (p, h) => `Se reduce desde el extremo más alejado de A y B: R3 + R4 = ${h.f(p.R3 + p.R4, 'Ω')} (serie); en paralelo con R2: ${h.f(par(p.R2, p.R3 + p.R4), 'Ω')}; luego en serie con R1: R<sub>eq</sub> = <b>${h.f(p.R1 + par(p.R2, p.R3 + p.R4), 'Ω')}</b>.`,
        (p, h) => `Reduce from the end farthest from A and B: R3 + R4 = ${h.f(p.R3 + p.R4, 'Ω')} (series); in parallel with R2: ${h.f(par(p.R2, p.R3 + p.R4), 'Ω')}; then in series with R1: R<sub>eq</sub> = <b>${h.f(p.R1 + par(p.R2, p.R3 + p.R4), 'Ω')}</b>.`)
    },
    {
      id: 'l2', title: L3('Échelle à trois cellules', 'Escalera de tres secciones', 'Three-section ladder'),
      params: { R1: RM, R2: RP, R3: RM, R4: RP, R5: RM, R6: RM },
      circuit: (p) => ladder(p, true), text: txt(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']),
      answer: Object.assign({ value: (p) => p.R1 + par(p.R2, p.R3 + par(p.R4, p.R5 + p.R6)) }, num),
      explain: ex(
        (p, h) => { const a = p.R5 + p.R6, b = par(p.R4, a), c = p.R3 + b, d = par(p.R2, c); return `Depuis le bout : R5 + R6 = ${h.f(a, 'Ω')} ; ∥ R4 = ${h.f(b, 'Ω')} ; + R3 = ${h.f(c, 'Ω')} ; ∥ R2 = ${h.f(d, 'Ω')} ; + R1 : R<sub>éq</sub> = <b>${h.f(p.R1 + d, 'Ω')}</b>.`; },
        (p, h) => { const a = p.R5 + p.R6, b = par(p.R4, a), c = p.R3 + b, d = par(p.R2, c); return `Desde el final: R5 + R6 = ${h.f(a, 'Ω')}; ∥ R4 = ${h.f(b, 'Ω')}; + R3 = ${h.f(c, 'Ω')}; ∥ R2 = ${h.f(d, 'Ω')}; + R1: R<sub>eq</sub> = <b>${h.f(p.R1 + d, 'Ω')}</b>.`; },
        (p, h) => { const a = p.R5 + p.R6, b = par(p.R4, a), c = p.R3 + b, d = par(p.R2, c); return `From the far end: R5 + R6 = ${h.f(a, 'Ω')}; ∥ R4 = ${h.f(b, 'Ω')}; + R3 = ${h.f(c, 'Ω')}; ∥ R2 = ${h.f(d, 'Ω')}; + R1: R<sub>eq</sub> = <b>${h.f(p.R1 + d, 'Ω')}</b>.`; })
    },
    {
      id: 'c1', title: L3('Résistance court-circuitée', 'Resistencia en cortocircuito', 'Shorted resistor'),
      params: { R1: RS, R2: RS, R3: RS },
      circuit: (p) => series3(p, true), text: txt(['R1', 'R2', 'R3']),
      answer: Object.assign({ value: (p) => p.R1 + p.R3 }, num),
      explain: ex(
        (p, h) => `Le fil à droite relie les deux bornes de R2 : R2 est court-circuitée, sa tension est nulle et elle ne conduit aucun courant (R2 ∥ 0 = 0). Il reste R1 et R3 en série : R<sub>éq</sub> = R1 + R3 = <b>${h.f(p.R1 + p.R3, 'Ω')}</b>.`,
        (p, h) => `El cable de la derecha une los dos terminales de R2: R2 está en cortocircuito, su tensión es nula y no lleva corriente (R2 ∥ 0 = 0). Quedan R1 y R3 en serie: R<sub>eq</sub> = R1 + R3 = <b>${h.f(p.R1 + p.R3, 'Ω')}</b>.`,
        (p, h) => `The wire on the right joins both terminals of R2: R2 is short-circuited, it has no voltage and carries no current (R2 ∥ 0 = 0). R1 and R3 remain, in series: R<sub>eq</sub> = R1 + R3 = <b>${h.f(p.R1 + p.R3, 'Ω')}</b>.`)
    },
    {
      id: 'c2', title: L3('Résistance en l’air', 'Resistencia con un extremo libre', 'Dangling resistor'),
      params: { R1: RS, R2: RS, R3: RS },
      circuit: (p) => dangling(p), text: txt(['R1', 'R2', 'R3']),
      answer: Object.assign({ value: (p) => p.R1 + p.R2 }, num),
      explain: ex(
        (p, h) => `R3 n’a qu’une borne reliée au circuit, l’autre est en l’air : aucun courant ne peut la traverser, elle n’intervient pas. R<sub>éq</sub> = R1 + R2 = <b>${h.f(p.R1 + p.R2, 'Ω')}</b>.`,
        (p, h) => `R3 tiene un solo terminal conectado, el otro queda libre: no puede circular corriente por ella, no interviene. R<sub>eq</sub> = R1 + R2 = <b>${h.f(p.R1 + p.R2, 'Ω')}</b>.`,
        (p, h) => `R3 has only one terminal connected, the other one is free: no current can flow through it, it plays no part. R<sub>eq</sub> = R1 + R2 = <b>${h.f(p.R1 + p.R2, 'Ω')}</b>.`)
    },
    {
      id: 't1', title: L3('Le même réseau, vu d’autres bornes', 'La misma red, vista desde otros terminales', 'The same network, other terminals'),
      params: { R1: RM, R2: RM, R3: RM },
      circuit: (p) => ring(p), text: txt(['R1', 'R2', 'R3']),
      answer: Object.assign({ value: (p) => par(p.R1, p.R2 + p.R3) }, num),
      explain: ex(
        (p, h) => `Entre A et B il y a deux chemins : R1 directement, et R3 puis R2 (en série, ${h.f(p.R2 + p.R3, 'Ω')}). Ces deux chemins sont en parallèle : R<sub>éq</sub> = R1 ∥ (R2 + R3) = <b>${h.f(par(p.R1, p.R2 + p.R3), 'Ω')}</b>. Les mêmes trois résistances donneraient un autre résultat vues d’autres bornes : « série » et « parallèle » dépendent des bornes choisies.`,
        (p, h) => `Entre A y B hay dos caminos: R1 directamente, y R3 y luego R2 (en serie, ${h.f(p.R2 + p.R3, 'Ω')}). Esos dos caminos están en paralelo: R<sub>eq</sub> = R1 ∥ (R2 + R3) = <b>${h.f(par(p.R1, p.R2 + p.R3), 'Ω')}</b>. Las mismas tres resistencias darían otro resultado vistas desde otros terminales: «serie» y «paralelo» dependen de los terminales elegidos.`,
        (p, h) => `Between A and B there are two paths: R1 directly, and R3 then R2 (in series, ${h.f(p.R2 + p.R3, 'Ω')}). The two paths are in parallel: R<sub>eq</sub> = R1 ∥ (R2 + R3) = <b>${h.f(par(p.R1, p.R2 + p.R3), 'Ω')}</b>. The same three resistors give another result from other terminals: “series” and “parallel” depend on the terminals.`)
    },
    {
      id: 'b1', title: L3('Pont de Wheatstone équilibré', 'Puente de Wheatstone equilibrado', 'Balanced Wheatstone bridge'),
      params: { R1: [1 * k, 2 * k, 3 * k], m: [1, 2, 3], R2: [2 * k, 4 * k, 6 * k], R5: [1 * k, 5 * k, 10 * k] },
      // R3 = m·R1, R4 = m·R2: R1/R3 = R2/R4
      circuit: (p) => bridge(Object.assign({}, p, { R3: p.m * p.R1, R4: p.m * p.R2 })),
      text: {
        fr: (p, h) => `Pont : R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}, R3 = ${h.f(p.m * p.R1, 'Ω')}, R4 = ${h.f(p.m * p.R2, 'Ω')}, R5 = ${h.f(p.R5, 'Ω')}.<br>${ask.fr}`,
        es: (p, h) => `Puente: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}, R3 = ${h.f(p.m * p.R1, 'Ω')}, R4 = ${h.f(p.m * p.R2, 'Ω')}, R5 = ${h.f(p.R5, 'Ω')}.<br>${ask.es}`,
        en: (p, h) => `Bridge: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}, R3 = ${h.f(p.m * p.R1, 'Ω')}, R4 = ${h.f(p.m * p.R2, 'Ω')}, R5 = ${h.f(p.R5, 'Ω')}.<br>${ask.en}`
      },
      answer: Object.assign({ value: (p) => par(p.R1 + p.m * p.R1, p.R2 + p.m * p.R2) }, num),
      explain: ex(
        (p, h) => `R5 n’est ni en série ni en parallèle… mais le pont est <b>équilibré</b> : R1/R3 = R2/R4 = ${1 / p.m === 1 ? '1' : '1/' + p.m}. Les deux nœuds du milieu sont au même potentiel, aucun courant ne traverse R5 : on peut l’enlever. R<sub>éq</sub> = (R1 + R3) ∥ (R2 + R4) = ${h.f(p.R1 * (1 + p.m), 'Ω')} ∥ ${h.f(p.R2 * (1 + p.m), 'Ω')} = <b>${h.f(par(p.R1 * (1 + p.m), p.R2 * (1 + p.m)), 'Ω')}</b>.`,
        (p, h) => `R5 no está ni en serie ni en paralelo… pero el puente está <b>equilibrado</b>: R1/R3 = R2/R4 = ${1 / p.m === 1 ? '1' : '1/' + p.m}. Los dos nodos del medio están al mismo potencial, por R5 no circula corriente: se puede quitar. R<sub>eq</sub> = (R1 + R3) ∥ (R2 + R4) = ${h.f(p.R1 * (1 + p.m), 'Ω')} ∥ ${h.f(p.R2 * (1 + p.m), 'Ω')} = <b>${h.f(par(p.R1 * (1 + p.m), p.R2 * (1 + p.m)), 'Ω')}</b>.`,
        (p, h) => `R5 is neither in series nor in parallel… but the bridge is <b>balanced</b>: R1/R3 = R2/R4 = ${1 / p.m === 1 ? '1' : '1/' + p.m}. Both middle nodes are at the same potential, no current flows in R5: it can be removed. R<sub>eq</sub> = (R1 + R3) ∥ (R2 + R4) = ${h.f(p.R1 * (1 + p.m), 'Ω')} ∥ ${h.f(p.R2 * (1 + p.m), 'Ω')} = <b>${h.f(par(p.R1 * (1 + p.m), p.R2 * (1 + p.m)), 'Ω')}</b>.`)
    },
    {
      id: 'b2', title: L3('Pont non équilibré (Δ → Y)', 'Puente no equilibrado (Δ → Y)', 'Unbalanced bridge (Δ → Y)'),
      params: { R1: [1 * k, 2 * k, 3 * k], R2: [2 * k, 4 * k, 6 * k], R3: [2 * k, 3 * k, 6 * k], R4: [1 * k, 2 * k, 3 * k], R5: [1 * k, 2 * k, 6 * k] },
      ok: (p) => Math.abs(p.R1 * p.R4 - p.R2 * p.R3) > 1e3,
      circuit: (p) => bridge(p), text: txt(['R1', 'R2', 'R3', 'R4', 'R5'], L3(() => 'Pont :', () => 'Puente:', () => 'Bridge:')),
      answer: Object.assign({ value: (p) => bridgeReq(p).req }, num),
      explain: ex(
        (p, h) => { const b = bridgeReq(p); return `Le pont n’est pas équilibré (R1·R4 ≠ R2·R3) : aucune résistance n’est en série ni en parallèle. On transforme le triangle R1, R2, R5 (sommets A et les deux nœuds du milieu) en étoile : S = R1 + R2 + R5 = ${h.f(b.S, 'Ω')} ; R<sub>a</sub> = R1·R2/S = ${h.f(b.ra, 'Ω')} (côté A), R<sub>c</sub> = R1·R5/S = ${h.f(b.rc, 'Ω')}, R<sub>d</sub> = R2·R5/S = ${h.f(b.rd, 'Ω')}. Ensuite : R<sub>éq</sub> = R<sub>a</sub> + (R<sub>c</sub> + R3) ∥ (R<sub>d</sub> + R4) = <b>${h.f(b.req, 'Ω')}</b>.`; },
        (p, h) => { const b = bridgeReq(p); return `El puente no está equilibrado (R1·R4 ≠ R2·R3): ninguna resistencia está en serie ni en paralelo. Se transforma el triángulo R1, R2, R5 (vértices A y los dos nodos del medio) en estrella: S = R1 + R2 + R5 = ${h.f(b.S, 'Ω')}; R<sub>a</sub> = R1·R2/S = ${h.f(b.ra, 'Ω')} (lado A), R<sub>c</sub> = R1·R5/S = ${h.f(b.rc, 'Ω')}, R<sub>d</sub> = R2·R5/S = ${h.f(b.rd, 'Ω')}. Luego: R<sub>eq</sub> = R<sub>a</sub> + (R<sub>c</sub> + R3) ∥ (R<sub>d</sub> + R4) = <b>${h.f(b.req, 'Ω')}</b>.`; },
        (p, h) => { const b = bridgeReq(p); return `The bridge is not balanced (R1·R4 ≠ R2·R3): no resistor is in series or in parallel. Turn the triangle R1, R2, R5 (corners A and the two middle nodes) into a star: S = R1 + R2 + R5 = ${h.f(b.S, 'Ω')}; R<sub>a</sub> = R1·R2/S = ${h.f(b.ra, 'Ω')} (at A), R<sub>c</sub> = R1·R5/S = ${h.f(b.rc, 'Ω')}, R<sub>d</sub> = R2·R5/S = ${h.f(b.rd, 'Ω')}. Then: R<sub>eq</sub> = R<sub>a</sub> + (R<sub>c</sub> + R3) ∥ (R<sub>d</sub> + R4) = <b>${h.f(b.req, 'Ω')}</b>.`; })
    },
    {
      id: 'v1', title: L3('Avec une source : on l’éteint', 'Con una fuente: se pasiva', 'With a source: turn it off'),
      params: { src: ['V', 'I'], R1: RP, R2: RP, R3: RS },
      circuit: (p) => withSource(p),
      text: {
        fr: (p, h) => `Le circuit contient une source de ${p.src === 'V' ? 'tension' : 'courant'}. ${list(p, h, ['R1', 'R2', 'R3'])}.<br><b>Calculez la résistance équivalente vue entre A et B (sources éteintes).</b>`,
        es: (p, h) => `El circuito tiene una fuente de ${p.src === 'V' ? 'tensión' : 'corriente'}. ${list(p, h, ['R1', 'R2', 'R3'])}.<br><b>Calcule la resistencia equivalente vista entre A y B (fuentes pasivadas).</b>`,
        en: (p, h) => `The circuit has a ${p.src === 'V' ? 'voltage' : 'current'} source. ${list(p, h, ['R1', 'R2', 'R3'])}.<br><b>Find the equivalent resistance seen between A and B (sources turned off).</b>`
      },
      answer: Object.assign({ value: (p) => p.R3 + (p.src === 'V' ? par(p.R1, p.R2) : p.R2) }, num),
      explain: ex(
        (p, h) => p.src === 'V'
          ? `On éteint la source de tension : elle devient un <b>court-circuit</b>. R1 se retrouve alors entre les mêmes nœuds que R2 : R1 ∥ R2 = ${h.f(par(p.R1, p.R2), 'Ω')}, en série avec R3 : R<sub>éq</sub> = <b>${h.f(p.R3 + par(p.R1, p.R2), 'Ω')}</b>.`
          : `On éteint la source de courant : elle devient un <b>circuit ouvert</b>. R1 a alors une borne en l’air et n’intervient pas. Il reste R2 en série avec R3 : R<sub>éq</sub> = <b>${h.f(p.R2 + p.R3, 'Ω')}</b>.`,
        (p, h) => p.src === 'V'
          ? `Se pasiva la fuente de tensión: pasa a ser un <b>cortocircuito</b>. R1 queda entonces entre los mismos nodos que R2: R1 ∥ R2 = ${h.f(par(p.R1, p.R2), 'Ω')}, en serie con R3: R<sub>eq</sub> = <b>${h.f(p.R3 + par(p.R1, p.R2), 'Ω')}</b>.`
          : `Se pasiva la fuente de corriente: pasa a ser un <b>circuito abierto</b>. R1 queda con un extremo libre y no interviene. Quedan R2 y R3 en serie: R<sub>eq</sub> = <b>${h.f(p.R2 + p.R3, 'Ω')}</b>.`,
        (p, h) => p.src === 'V'
          ? `Turn the voltage source off: it becomes a <b>short circuit</b>. R1 then sits between the same nodes as R2: R1 ∥ R2 = ${h.f(par(p.R1, p.R2), 'Ω')}, in series with R3: R<sub>eq</sub> = <b>${h.f(p.R3 + par(p.R1, p.R2), 'Ω')}</b>.`
          : `Turn the current source off: it becomes an <b>open circuit</b>. R1 is left with a free end and plays no part. R2 and R3 remain, in series: R<sub>eq</sub> = <b>${h.f(p.R2 + p.R3, 'Ω')}</b>.`)
    },
    {
      id: 'k1', title: L3('Série, parallèle ou ni l’un ni l’autre ?', '¿Serie, paralelo o ninguno?', 'Series, parallel or neither?'),
      // case: [network, first resistor, second resistor, answer index]
      params: { cs: [['s', 'R1', 'R2', 0], ['p', 'R1', 'R2', 1], ['m', 'R1', 'R2', 2], ['m', 'R2', 'R3', 1], ['q', 'R1', 'R2', 0], ['q', 'R1', 'R3', 2]], R1: RP, R2: RP, R3: RP },
      circuit: (p) => (p.cs[0] === 's' ? series3(p) : p.cs[0] === 'p' ? parallel([p.R1, p.R2]) : p.cs[0] === 'm' ? serPar(p) : parSer(p)),
      text: {
        fr: (p) => `<b>Comment sont associées ${p.cs[1]} et ${p.cs[2]} ?</b>`,
        es: (p) => `<b>¿Cómo están conectadas ${p.cs[1]} y ${p.cs[2]}?</b>`,
        en: (p) => `<b>How are ${p.cs[1]} and ${p.cs[2]} connected?</b>`
      },
      answer: { kind: 'choice', options: L3(['En série', 'En parallèle', 'Ni l’un ni l’autre'], ['En serie', 'En paralelo', 'Ninguna de las dos'], ['In series', 'In parallel', 'Neither']), value: (p) => p.cs[3] },
      explain: {
        fr: (p) => `<b>Série</b> : les deux résistances sont reliées par un nœud où rien d’autre n’est branché (même courant). <b>Parallèle</b> : elles sont branchées entre les deux mêmes nœuds (même tension). ${[`${p.cs[1]} et ${p.cs[2]} se suivent sans aucun autre élément au nœud commun : en série.`, `${p.cs[1]} et ${p.cs[2]} relient les deux mêmes nœuds : en parallèle.`, `Le nœud commun de ${p.cs[1]} et ${p.cs[2]} a un troisième élément (le courant s’y divise) et elles ne relient pas les mêmes deux nœuds : ni série ni parallèle.`][p.cs[3]]}`,
        es: (p) => `<b>Serie</b>: las dos resistencias están unidas por un nodo donde no se conecta nada más (misma corriente). <b>Paralelo</b>: están conectadas entre los mismos dos nodos (misma tensión). ${[`${p.cs[1]} y ${p.cs[2]} van una tras otra sin ningún otro elemento en el nodo común: en serie.`, `${p.cs[1]} y ${p.cs[2]} unen los mismos dos nodos: en paralelo.`, `El nodo común de ${p.cs[1]} y ${p.cs[2]} tiene un tercer elemento (la corriente se divide) y no unen los mismos dos nodos: ni serie ni paralelo.`][p.cs[3]]}`,
        en: (p) => `<b>Series</b>: the two resistors are joined by a node where nothing else is connected (same current). <b>Parallel</b>: they are connected between the same two nodes (same voltage). ${[`${p.cs[1]} and ${p.cs[2]} follow each other with nothing else at their common node: in series.`, `${p.cs[1]} and ${p.cs[2]} join the same two nodes: in parallel.`, `The common node of ${p.cs[1]} and ${p.cs[2]} has a third element (the current splits there) and they do not join the same two nodes: neither.`][p.cs[3]]}`
      }
    },
    {
      id: 'k2', title: L3('Ajouter une résistance', 'Agregar una resistencia', 'Adding a resistor'),
      params: { R1: RP, R2: RP, way: [0, 1] },
      circuit: (p) => (p.way ? parallel([p.R1, p.R2]) : series3({ R1: p.R1, R2: p.R2, R3: 1 * k })),
      text: {
        fr: (p) => `On compare R<sub>éq</sub> entre A et B avec ${p.way ? 'R1 seule' : 'R1 + R2 seules (sans R3)'} et avec le circuit dessiné.<br><b>Ajouter ${p.way ? 'R2 en parallèle' : 'R3 en série'}, cela fait…</b>`,
        es: (p) => `Se compara R<sub>eq</sub> entre A y B con ${p.way ? 'R1 sola' : 'R1 + R2 solas (sin R3)'} y con el circuito dibujado.<br><b>Agregar ${p.way ? 'R2 en paralelo' : 'R3 en serie'} hace que R<sub>eq</sub>…</b>`,
        en: (p) => `Compare R<sub>eq</sub> between A and B with ${p.way ? 'R1 alone' : 'R1 + R2 only (no R3)'} and with the circuit as drawn.<br><b>Adding ${p.way ? 'R2 in parallel' : 'R3 in series'} makes R<sub>eq</sub>…</b>`
      },
      answer: { kind: 'choice', options: L3(['…augmenter R<sub>éq</sub>', '…diminuer R<sub>éq</sub>', 'Ça dépend des valeurs'], ['…aumentar', '…disminuir', 'Depende de los valores'], ['…increase', '…decrease', 'It depends on the values']), value: (p) => (p.way ? 1 : 0) },
      explain: {
        fr: (p) => p.way ? `Une résistance ajoutée en <b>parallèle</b> ouvre un chemin de plus au courant : R<sub>éq</sub> <b>diminue</b> toujours (R1 ∥ R2 &lt; R1, quelle que soit R2).` : `Une résistance ajoutée en <b>série</b> s’oppose en plus au même courant : R<sub>éq</sub> <b>augmente</b> toujours.`,
        es: (p) => p.way ? `Una resistencia agregada en <b>paralelo</b> abre un camino más para la corriente: R<sub>eq</sub> siempre <b>disminuye</b> (R1 ∥ R2 &lt; R1, cualquiera sea R2).` : `Una resistencia agregada en <b>serie</b> se opone además a la misma corriente: R<sub>eq</sub> siempre <b>aumenta</b>.`,
        en: (p) => p.way ? `A resistor added in <b>parallel</b> opens one more path for the current: R<sub>eq</sub> always <b>decreases</b> (R1 ∥ R2 &lt; R1, whatever R2).` : `A resistor added in <b>series</b> opposes the same current a bit more: R<sub>eq</sub> always <b>increases</b>.`
      }
    }
  ];

  DCS.quiz.register({
    id: 'req',
    title: { fr: 'Résistance équivalente', es: 'Resistencia equivalente', en: 'Equivalent resistance' },
    short: { fr: 'R équivalente', es: 'R equivalente', en: 'R equivalent' },
    desc: {
      fr: 'Série, parallèle, échelle, court-circuit, pont de Wheatstone, Δ → Y, sources éteintes.',
      es: 'Serie, paralelo, escalera, cortocircuito, puente de Wheatstone, Δ → Y, fuentes pasivadas.',
      en: 'Series, parallel, ladder, short circuit, Wheatstone bridge, Δ → Y, sources turned off.'
    },
    questions
  });
})(window);
