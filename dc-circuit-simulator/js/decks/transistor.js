/* Quiz deck: the bipolar transistor in DC (simple model: V_BE = 0.7 V when it conducts, V_CE,sat = 0.2 V).
 * From the base circuit alone to a lamp driven in cut-off / saturation. Texts in French, Spanish and English. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const G = (x, y) => ['ground', '', x, y, 0];

  /* ----- circuits (grid units) ----- */
  // base: VBB and RB; collector straight to VCC, or through RC (or a LED, or a lamp)
  function twoSources(p, load) {
    const c = [['vsource', p.inName || 'VBB', 0, 9, 1, { V: p.VBB }], ['resistor', 'RB', 4, 6, 0, { R: p.RB }], ['bjt', 'Q1', 8, 6, 0, { beta: p.beta }],
      ['vsource', 'VCC', 14, 6, 1, { V: p.VCC }], G(0, 11), G(9, 8), G(14, 8)];
    const w = [[[0, 7], [0, 6], [2, 6]]];
    if (load === 'none') w.push([[9, 4], [9, 2], [14, 2], [14, 4]]);
    else if (load === 'rc') { c.push(['resistor', 'RC', 9, 2, 1, { R: p.RC }]); w.push([[9, 0], [14, 0], [14, 4]]); }
    else if (load === 'led') {
      c.push(['led', 'LED1', 9, 2, 1, { color: p.color, Vf: p.Vf }], ['resistor', 'RC', 9, -2, 1, { R: p.RC }]);
      w.push([[9, -4], [14, -4], [14, 4]]);
    } else if (load === 'lamp') { c.push(['lamp', 'LP1', 9, 2, 1, { Vn: p.Vn, Pn: p.Pn, look: 'lamp_bulb' }]); w.push([[9, 0], [14, 0], [14, 4]]); }
    return { c, w };
  }
  // a signal source Vin in series with the bias VBB, then RB
  function seriesBias(p) {
    return {
      c: [['vsource', 'VBB', 0, 9, 1, { V: p.VBB }], ['vsource', 'Vin', 0, 5, 1, { V: p.Vin }], ['resistor', 'RB', 4, 3, 0, { R: p.RB }],
        ['bjt', 'Q1', 8, 3, 0, { beta: p.beta }], ['resistor', 'RC', 9, -1, 1, { R: p.RC }], ['vsource', 'VCC', 14, 3, 1, { V: p.VCC }],
        G(0, 11), G(9, 5), G(14, 5)],
      w: [[[0, 3], [2, 3]], [[9, -3], [14, -3], [14, 1]]]
    };
  }
  // one supply: RB from VCC to the base
  function oneSupply(p) {
    return {
      c: [['vsource', 'VCC', 0, 6, 1, { V: p.VCC }], ['resistor', 'RB', 4, 3, 1, { R: p.RB }], ['bjt', 'Q1', 8, 6, 0, { beta: p.beta }],
        ['resistor', 'RC', 9, 2, 1, { R: p.RC }], G(0, 8), G(9, 8)],
      w: [[[0, 4], [0, 0], [9, 0]], [[4, 0], [4, 1]], [[4, 5], [4, 6], [6, 6]]]
    };
  }

  const ST = { fr: ['Bloqué', 'Actif (linéaire)', 'Saturé'], es: ['Corte', 'Activa (lineal)', 'Saturación'], en: ['Cut-off', 'Active (linear)', 'Saturation'] };
  const stIdx = (s) => ({ off: 0, act: 1, sat: 2 })[s];
  const q = (sol) => sol.el('Q1');
  const pSupply = (sol, n) => -sol.el(n).p;

  const ib = (p) => Math.max(0, (p.VBB - 0.7) / p.RB);

  const questions = [
    /* ---------- 1. base circuit, collector straight to VCC ---------- */
    {
      id: 'b1', title: { fr: 'Courant de base', es: 'Corriente de base', en: 'Base current' },
      params: { VBB: [2, 3, 5], RB: [10e3, 22e3, 47e3], beta: [100, 150, 200], VCC: [10, 12, 15] },
      circuit: (p) => twoSources(p, 'none'),
      text: {
        fr: (p, h) => `La base est commandée par VBB = ${h.f(p.VBB, 'V')} à travers RB = ${h.f(p.RB, 'Ω')}. Le collecteur est relié directement à VCC = ${h.f(p.VCC, 'V')}. On prend V<sub>BE</sub> = ${h.vbe}.<br><b>Calculez le courant de base I<sub>B</sub>.</b>`,
        es: (p, h) => `La base se comanda con VBB = ${h.f(p.VBB, 'V')} a través de RB = ${h.f(p.RB, 'Ω')}. El colector va directo a VCC = ${h.f(p.VCC, 'V')}. Se toma V<sub>BE</sub> = ${h.vbe}.<br><b>Calcule la corriente de base I<sub>B</sub>.</b>`,
        en: (p, h) => `The base is driven by VBB = ${h.f(p.VBB, 'V')} through RB = ${h.f(p.RB, 'Ω')}. The collector goes straight to VCC = ${h.f(p.VCC, 'V')}. Take V<sub>BE</sub> = ${h.vbe}.<br><b>Find the base current I<sub>B</sub>.</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p, sol) => q(sol).ib },
      explain: {
        fr: (p, s, h) => `Loi des mailles, maille de base parcourue dans le sens horaire :<br>−VBB + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0, donc<br>I<sub>B</sub> = (VBB − V<sub>BE</sub>) / R<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = <b>${h.f(ib(p), 'A')}</b>.`,
        es: (p, s, h) => `LKT en la malla de base, en sentido horario:<br>−VBB + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0, entonces<br>I<sub>B</sub> = (VBB − V<sub>BE</sub>) / R<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = <b>${h.f(ib(p), 'A')}</b>.`,
        en: (p, s, h) => `KVL around the base loop, clockwise:<br>−VBB + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0, so<br>I<sub>B</sub> = (VBB − V<sub>BE</sub>) / R<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = <b>${h.f(ib(p), 'A')}</b>.`
      }
    },
    {
      id: 'b2', title: { fr: 'Courant de collecteur', es: 'Corriente de colector', en: 'Collector current' },
      params: { VBB: [2, 3, 5], RB: [10e3, 22e3, 47e3], beta: [100, 150, 200], VCC: [10, 12, 15] },
      circuit: (p) => twoSources(p, 'none'),
      text: {
        fr: (p, h) => `Même montage : VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, collecteur relié directement à VCC = ${h.f(p.VCC, 'V')}.<br><b>Calculez le courant de collecteur I<sub>C</sub>.</b>`,
        es: (p, h) => `Mismo circuito: VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, colector directo a VCC = ${h.f(p.VCC, 'V')}.<br><b>Calcule la corriente de colector I<sub>C</sub>.</b>`,
        en: (p, h) => `Same circuit: VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, collector straight to VCC = ${h.f(p.VCC, 'V')}.<br><b>Find the collector current I<sub>C</sub>.</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p, sol) => q(sol).ic },
      explain: {
        fr: (p, s, h) => `Sans résistance de collecteur, V<sub>CE</sub> = VCC = ${h.f(p.VCC, 'V')} : bien au-dessus de V<sub>CE,sat</sub>, le transistor est en régime actif.<br>I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(ib(p), 'A')}<br>I<sub>C</sub> = β·I<sub>B</sub> = ${p.beta} × ${h.f(ib(p), 'A')} = <b>${h.f(q(s).ic, 'A')}</b>.`,
        es: (p, s, h) => `Sin resistencia de colector, V<sub>CE</sub> = VCC = ${h.f(p.VCC, 'V')}: muy por encima de V<sub>CE,sat</sub>, el transistor está en activa.<br>I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(ib(p), 'A')}<br>I<sub>C</sub> = β·I<sub>B</sub> = ${p.beta} × ${h.f(ib(p), 'A')} = <b>${h.f(q(s).ic, 'A')}</b>.`,
        en: (p, s, h) => `With no collector resistor, V<sub>CE</sub> = VCC = ${h.f(p.VCC, 'V')}: well above V<sub>CE,sat</sub>, the transistor is active.<br>I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(ib(p), 'A')}<br>I<sub>C</sub> = β·I<sub>B</sub> = ${p.beta} × ${h.f(ib(p), 'A')} = <b>${h.f(q(s).ic, 'A')}</b>.`
      }
    },
    {
      id: 'b3', title: { fr: 'Puissance de la source VCC', es: 'Potencia de la fuente VCC', en: 'Power of the VCC supply' },
      params: { VBB: [2, 3, 5], RB: [10e3, 22e3, 47e3], beta: [100, 150, 200], VCC: [10, 12, 15] },
      circuit: (p) => twoSources(p, 'none'),
      text: {
        fr: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, collecteur relié directement à VCC = ${h.f(p.VCC, 'V')}.<br><b>Quelle puissance fournit la source VCC ?</b>`,
        es: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, colector directo a VCC = ${h.f(p.VCC, 'V')}.<br><b>¿Qué potencia entrega la fuente VCC?</b>`,
        en: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, collector straight to VCC = ${h.f(p.VCC, 'V')}.<br><b>What power does the VCC supply deliver?</b>`
      },
      answer: { kind: 'num', unit: 'W', value: (p, sol) => pSupply(sol, 'VCC') },
      explain: {
        fr: (p, s, h) => `La source VCC ne débite que le courant de collecteur : I<sub>C</sub> = β·I<sub>B</sub> = ${h.f(q(s).ic, 'A')}.<br>P = VCC·I<sub>C</sub> = ${h.f(p.VCC, 'V')} × ${h.f(q(s).ic, 'A')} = <b>${h.f(pSupply(s, 'VCC'), 'W')}</b>.<br>Toute cette puissance est dissipée dans le transistor (rien d’autre dans la maille) : attention à l’échauffement !`,
        es: (p, s, h) => `La fuente VCC solo entrega la corriente de colector: I<sub>C</sub> = β·I<sub>B</sub> = ${h.f(q(s).ic, 'A')}.<br>P = VCC·I<sub>C</sub> = ${h.f(p.VCC, 'V')} × ${h.f(q(s).ic, 'A')} = <b>${h.f(pSupply(s, 'VCC'), 'W')}</b>.<br>Toda esa potencia se disipa en el transistor (no hay nada más en la malla): ¡cuidado con el calentamiento!`,
        en: (p, s, h) => `The VCC supply only delivers the collector current: I<sub>C</sub> = β·I<sub>B</sub> = ${h.f(q(s).ic, 'A')}.<br>P = VCC·I<sub>C</sub> = ${h.f(p.VCC, 'V')} × ${h.f(q(s).ic, 'A')} = <b>${h.f(pSupply(s, 'VCC'), 'W')}</b>.<br>All of it is dissipated in the transistor (nothing else in that loop): mind the heating!`
      }
    },
    {
      id: 'b4', title: { fr: 'Puissance dans le transistor', es: 'Potencia en el transistor', en: 'Power in the transistor' },
      params: { VBB: [2, 3, 5], RB: [10e3, 22e3, 47e3], beta: [100, 150, 200], VCC: [10, 12, 15] },
      circuit: (p) => twoSources(p, 'none'),
      text: {
        fr: (p, h) => `Toujours sans résistance de collecteur : VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Quelle puissance dissipe le transistor ?</b> (jonction base-émetteur comprise)`,
        es: (p, h) => `Sigue sin resistencia de colector: VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, VCC = ${h.f(p.VCC, 'V')}.<br><b>¿Qué potencia disipa el transistor?</b> (incluida la juntura base-emisor)`,
        en: (p, h) => `Still no collector resistor: VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, VCC = ${h.f(p.VCC, 'V')}.<br><b>What power does the transistor dissipate?</b> (base-emitter junction included)`
      },
      answer: { kind: 'num', unit: 'W', value: (p, sol) => q(sol).p },
      explain: {
        fr: (p, s, h) => `P = V<sub>CE</sub>·I<sub>C</sub> + V<sub>BE</sub>·I<sub>B</sub> = ${h.f(p.VCC, 'V')} × ${h.f(q(s).ic, 'A')} + ${h.vbe} × ${h.f(q(s).ib, 'A')} = <b>${h.f(q(s).p, 'W')}</b>.<br>Le terme de base est négligeable : presque tout vient de V<sub>CE</sub>·I<sub>C</sub>.`,
        es: (p, s, h) => `P = V<sub>CE</sub>·I<sub>C</sub> + V<sub>BE</sub>·I<sub>B</sub> = ${h.f(p.VCC, 'V')} × ${h.f(q(s).ic, 'A')} + ${h.vbe} × ${h.f(q(s).ib, 'A')} = <b>${h.f(q(s).p, 'W')}</b>.<br>El término de base es despreciable: casi todo viene de V<sub>CE</sub>·I<sub>C</sub>.`,
        en: (p, s, h) => `P = V<sub>CE</sub>·I<sub>C</sub> + V<sub>BE</sub>·I<sub>B</sub> = ${h.f(p.VCC, 'V')} × ${h.f(q(s).ic, 'A')} + ${h.vbe} × ${h.f(q(s).ib, 'A')} = <b>${h.f(q(s).p, 'W')}</b>.<br>The base term is negligible: nearly all of it is V<sub>CE</sub>·I<sub>C</sub>.`
      }
    },

    /* ---------- 2. with a collector resistor ---------- */
    {
      id: 'c1', title: { fr: 'Tension V<sub>CE</sub>', es: 'Tensión V<sub>CE</sub>', en: 'Voltage V<sub>CE</sub>' },
      params: { VBB: [2, 3, 4], RB: [47e3, 68e3, 100e3], beta: [100, 150], RC: [1e3, 1.5e3, 2.2e3], VCC: [10, 12, 15] },
      ok: (p, s) => q(s).state === 'act' && q(s).vce > 1,
      circuit: (p) => twoSources(p, 'rc'),
      text: {
        fr: (p, h) => `On ajoute une résistance de collecteur RC = ${h.f(p.RC, 'Ω')}. VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Calculez V<sub>CE</sub>.</b>`,
        es: (p, h) => `Se agrega una resistencia de colector RC = ${h.f(p.RC, 'Ω')}. VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Calcule V<sub>CE</sub>.</b>`,
        en: (p, h) => `A collector resistor RC = ${h.f(p.RC, 'Ω')} is added. VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Find V<sub>CE</sub>.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, sol) => q(sol).vce },
      explain: {
        fr: (p, s, h) => `I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(ib(p), 'A')} ; on suppose le régime actif : I<sub>C</sub> = β·I<sub>B</sub> = ${h.f(q(s).ic, 'A')}.<br>Maille de collecteur, sens horaire : VCC − R<sub>C</sub>·I<sub>C</sub> − V<sub>CE</sub> = 0 ⇒ V<sub>CE</sub> = VCC − R<sub>C</sub>·I<sub>C</sub> = ${h.f(p.VCC, 'V')} − ${h.f(p.RC, 'Ω')} × ${h.f(q(s).ic, 'A')} = <b>${h.f(q(s).vce, 'V')}</b>.<br>V<sub>CE</sub> > ${h.vsat} : l’hypothèse du régime actif est vérifiée.`,
        es: (p, s, h) => `I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(ib(p), 'A')}; suponiendo activa: I<sub>C</sub> = β·I<sub>B</sub> = ${h.f(q(s).ic, 'A')}.<br>LKT en la malla de colector, sentido horario: VCC − R<sub>C</sub>·I<sub>C</sub> − V<sub>CE</sub> = 0 ⇒ V<sub>CE</sub> = VCC − R<sub>C</sub>·I<sub>C</sub> = ${h.f(p.VCC, 'V')} − ${h.f(p.RC, 'Ω')} × ${h.f(q(s).ic, 'A')} = <b>${h.f(q(s).vce, 'V')}</b>.<br>V<sub>CE</sub> > ${h.vsat}: la hipótesis de activa se verifica.`,
        en: (p, s, h) => `I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(ib(p), 'A')}; assuming the active region: I<sub>C</sub> = β·I<sub>B</sub> = ${h.f(q(s).ic, 'A')}.<br>KVL around the collector loop, clockwise: VCC − R<sub>C</sub>·I<sub>C</sub> − V<sub>CE</sub> = 0 ⇒ V<sub>CE</sub> = VCC − R<sub>C</sub>·I<sub>C</sub> = ${h.f(p.VCC, 'V')} − ${h.f(p.RC, 'Ω')} × ${h.f(q(s).ic, 'A')} = <b>${h.f(q(s).vce, 'V')}</b>.<br>V<sub>CE</sub> > ${h.vsat}: the active-region assumption holds.`
      }
    },
    {
      id: 'c2', title: { fr: 'Puissance de VCC avec R<sub>C</sub>', es: 'Potencia de VCC con R<sub>C</sub>', en: 'VCC power with R<sub>C</sub>' },
      params: { VBB: [2, 3, 4], RB: [47e3, 68e3, 100e3], beta: [100, 150], RC: [1e3, 1.5e3, 2.2e3], VCC: [10, 12, 15] },
      ok: (p, s) => q(s).state === 'act' && q(s).vce > 1,
      circuit: (p) => twoSources(p, 'rc'),
      text: {
        fr: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Quelle puissance fournit la source VCC ?</b>`,
        es: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>¿Qué potencia entrega la fuente VCC?</b>`,
        en: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>What power does the VCC supply deliver?</b>`
      },
      answer: { kind: 'num', unit: 'W', value: (p, sol) => pSupply(sol, 'VCC') },
      explain: {
        fr: (p, s, h) => `I<sub>C</sub> = β·(VBB − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ic, 'A')} (régime actif).<br>P<sub>VCC</sub> = VCC·I<sub>C</sub> = <b>${h.f(pSupply(s, 'VCC'), 'W')}</b>, partagée entre R<sub>C</sub> (R<sub>C</sub>·I<sub>C</sub>² = ${h.f(s.el('RC').p, 'W')}) et le transistor (V<sub>CE</sub>·I<sub>C</sub> ≈ ${h.f(q(s).vce * q(s).ic, 'W')}).`,
        es: (p, s, h) => `I<sub>C</sub> = β·(VBB − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ic, 'A')} (activa).<br>P<sub>VCC</sub> = VCC·I<sub>C</sub> = <b>${h.f(pSupply(s, 'VCC'), 'W')}</b>, repartida entre R<sub>C</sub> (R<sub>C</sub>·I<sub>C</sub>² = ${h.f(s.el('RC').p, 'W')}) y el transistor (V<sub>CE</sub>·I<sub>C</sub> ≈ ${h.f(q(s).vce * q(s).ic, 'W')}).`,
        en: (p, s, h) => `I<sub>C</sub> = β·(VBB − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ic, 'A')} (active).<br>P<sub>VCC</sub> = VCC·I<sub>C</sub> = <b>${h.f(pSupply(s, 'VCC'), 'W')}</b>, shared between R<sub>C</sub> (R<sub>C</sub>·I<sub>C</sub>² = ${h.f(s.el('RC').p, 'W')}) and the transistor (V<sub>CE</sub>·I<sub>C</sub> ≈ ${h.f(q(s).vce * q(s).ic, 'W')}).`
      }
    },
    {
      id: 'c3', title: { fr: 'Quel régime ?', es: '¿Qué región?', en: 'Which region?' },
      params: { VBB: [0.5, 2, 5], RB: [10e3, 47e3, 100e3], beta: [100], RC: [1e3, 2.2e3], VCC: [10] },
      circuit: (p) => twoSources(p, 'rc'),
      text: {
        fr: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Dans quel régime fonctionne le transistor ?</b>`,
        es: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>¿En qué región trabaja el transistor?</b>`,
        en: (p, h) => `VBB = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>In which region does the transistor work?</b>`
      },
      answer: { kind: 'choice', options: ST, value: (p, sol) => stIdx(q(sol).state) },
      explain: {
        fr: (p, s, h) => regime('fr', p, s, h), es: (p, s, h) => regime('es', p, s, h), en: (p, s, h) => regime('en', p, s, h)
      }
    },

    /* ---------- 3. a signal in series with the bias ---------- */
    {
      id: 's1', title: { fr: 'Polarisation + signal', es: 'Polarización + señal', en: 'Bias + signal' },
      params: { VBB: [1, 1.5, 2], Vin: [-1, -0.5, 0.5, 1], RB: [22e3, 47e3], beta: [100], RC: [1e3], VCC: [10] },
      ok: (p, s) => q(s).state !== 'sat',
      circuit: seriesBias,
      text: {
        fr: (p, h) => `Une source Vin = ${h.f(p.Vin, 'V')} est en série avec la tension de polarisation VBB = ${h.f(p.VBB, 'V')}, puis RB = ${h.f(p.RB, 'Ω')}. β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Calculez I<sub>C</sub>.</b>`,
        es: (p, h) => `Una fuente Vin = ${h.f(p.Vin, 'V')} está en serie con la tensión de polarización VBB = ${h.f(p.VBB, 'V')}, y luego RB = ${h.f(p.RB, 'Ω')}. β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Calcule I<sub>C</sub>.</b>`,
        en: (p, h) => `A source Vin = ${h.f(p.Vin, 'V')} is in series with the bias voltage VBB = ${h.f(p.VBB, 'V')}, then RB = ${h.f(p.RB, 'Ω')}. β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Find I<sub>C</sub>.</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p, sol) => q(sol).ic },
      explain: {
        fr: (p, s, h) => `Maille de base, sens horaire : −VBB − Vin + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0 : les deux sources s’ajoutent, VBB + Vin = ${h.f(p.VBB + p.Vin, 'V')}.<br>` + (p.VBB + p.Vin <= 0.7 ? `C’est moins que ${h.vbe} : la jonction base-émetteur ne conduit pas, I<sub>B</sub> = 0, le transistor est bloqué et <b>I<sub>C</sub> = 0</b>.` : `I<sub>B</sub> = (VBB + Vin − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ib, 'A')}, I<sub>C</sub> = β·I<sub>B</sub> = <b>${h.f(q(s).ic, 'A')}</b> (V<sub>CE</sub> = ${h.f(q(s).vce, 'V')} > ${h.vsat} : actif).`),
        es: (p, s, h) => `LKT en la malla de base, sentido horario: −VBB − Vin + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0: las dos fuentes se suman, VBB + Vin = ${h.f(p.VBB + p.Vin, 'V')}.<br>` + (p.VBB + p.Vin <= 0.7 ? `Es menos que ${h.vbe}: la juntura base-emisor no conduce, I<sub>B</sub> = 0, el transistor está en corte y <b>I<sub>C</sub> = 0</b>.` : `I<sub>B</sub> = (VBB + Vin − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ib, 'A')}, I<sub>C</sub> = β·I<sub>B</sub> = <b>${h.f(q(s).ic, 'A')}</b> (V<sub>CE</sub> = ${h.f(q(s).vce, 'V')} > ${h.vsat}: activa).`),
        en: (p, s, h) => `KVL around the base loop, clockwise: −VBB − Vin + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0: the two sources add up, VBB + Vin = ${h.f(p.VBB + p.Vin, 'V')}.<br>` + (p.VBB + p.Vin <= 0.7 ? `That is less than ${h.vbe}: the base-emitter junction does not conduct, I<sub>B</sub> = 0, the transistor is cut off and <b>I<sub>C</sub> = 0</b>.` : `I<sub>B</sub> = (VBB + Vin − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ib, 'A')}, I<sub>C</sub> = β·I<sub>B</sub> = <b>${h.f(q(s).ic, 'A')}</b> (V<sub>CE</sub> = ${h.f(q(s).vce, 'V')} > ${h.vsat}: active).`)
      }
    },
    {
      id: 's2', title: { fr: 'Vin qui sature le transistor', es: 'Vin que satura al transistor', en: 'Vin that saturates the transistor' },
      params: { VBB: [1, 1.5, 2], Vin: [0, 0.5], RB: [22e3, 47e3, 100e3], beta: [100, 200], RC: [1e3, 2.2e3], VCC: [10, 12] },
      circuit: seriesBias,
      text: {
        fr: (p, h) => `Même montage : VBB = ${h.f(p.VBB, 'V')} en série avec Vin, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>À partir de quelle valeur de Vin le transistor est-il saturé ?</b>`,
        es: (p, h) => `Mismo circuito: VBB = ${h.f(p.VBB, 'V')} en serie con Vin, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>¿A partir de qué valor de Vin satura el transistor?</b>`,
        en: (p, h) => `Same circuit: VBB = ${h.f(p.VBB, 'V')} in series with Vin, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>From which value of Vin is the transistor saturated?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => vinSat(p) },
      reveal: { param: 'Vin', label: 'Vin', unit: 'V', value: (p, want) => Math.ceil((want + 0.005) * 100) / 100 },
      explain: {
        fr: (p, s, h) => `À la limite de saturation : I<sub>C,sat</sub> = (VCC − V<sub>CE,sat</sub>) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}, il faut I<sub>B</sub> = I<sub>C,sat</sub> / β = ${h.f((p.VCC - 0.2) / p.RC / p.beta, 'A')}.<br>Maille de base (sens horaire) : −VBB − Vin + R<sub>B</sub>·I<sub>B</sub> + ${h.vbe} = 0 ⇒ Vin = R<sub>B</sub>·I<sub>B</sub> + ${h.vbe} − VBB = <b>${h.f(vinSat(p), 'V')}</b>.`,
        es: (p, s, h) => `En el límite de saturación: I<sub>C,sat</sub> = (VCC − V<sub>CE,sat</sub>) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}, hace falta I<sub>B</sub> = I<sub>C,sat</sub> / β = ${h.f((p.VCC - 0.2) / p.RC / p.beta, 'A')}.<br>LKT en la malla de base (sentido horario): −VBB − Vin + R<sub>B</sub>·I<sub>B</sub> + ${h.vbe} = 0 ⇒ Vin = R<sub>B</sub>·I<sub>B</sub> + ${h.vbe} − VBB = <b>${h.f(vinSat(p), 'V')}</b>.`,
        en: (p, s, h) => `At the edge of saturation: I<sub>C,sat</sub> = (VCC − V<sub>CE,sat</sub>) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}, which needs I<sub>B</sub> = I<sub>C,sat</sub> / β = ${h.f((p.VCC - 0.2) / p.RC / p.beta, 'A')}.<br>KVL around the base loop (clockwise): −VBB − Vin + R<sub>B</sub>·I<sub>B</sub> + ${h.vbe} = 0 ⇒ Vin = R<sub>B</sub>·I<sub>B</sub> + ${h.vbe} − VBB = <b>${h.f(vinSat(p), 'V')}</b>.`
      }
    },

    /* ---------- 4. one supply ---------- */
    {
      id: 'o1', title: { fr: 'Une seule alimentation', es: 'Una sola fuente', en: 'A single supply' },
      params: { VCC: [9, 12, 15], RB: [470e3, 680e3, 1e6], beta: [100, 150, 200], RC: [1e3, 2.2e3] },
      ok: (p, s) => q(s).state === 'act' && q(s).vce > 1,
      circuit: oneSupply,
      text: {
        fr: (p, h) => `RB est reliée à la même alimentation VCC = ${h.f(p.VCC, 'V')} que le collecteur. RB = ${h.f(p.RB, 'Ω')}, RC = ${h.f(p.RC, 'Ω')}, β = ${p.beta}.<br><b>Calculez I<sub>C</sub>.</b>`,
        es: (p, h) => `RB va a la misma fuente VCC = ${h.f(p.VCC, 'V')} que el colector. RB = ${h.f(p.RB, 'Ω')}, RC = ${h.f(p.RC, 'Ω')}, β = ${p.beta}.<br><b>Calcule I<sub>C</sub>.</b>`,
        en: (p, h) => `RB goes to the same supply VCC = ${h.f(p.VCC, 'V')} as the collector. RB = ${h.f(p.RB, 'Ω')}, RC = ${h.f(p.RC, 'Ω')}, β = ${p.beta}.<br><b>Find I<sub>C</sub>.</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p, sol) => q(sol).ic },
      explain: {
        fr: (p, s, h) => `La maille de base passe maintenant par VCC ; sens horaire : −VCC + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0 ⇒ I<sub>B</sub> = (VCC − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ib, 'A')}.<br>I<sub>C</sub> = β·I<sub>B</sub> = <b>${h.f(q(s).ic, 'A')}</b> ; vérification : V<sub>CE</sub> = VCC − R<sub>C</sub>·I<sub>C</sub> = ${h.f(q(s).vce, 'V')} > ${h.vsat}, régime actif.`,
        es: (p, s, h) => `La malla de base ahora pasa por VCC; LKT en sentido horario: −VCC + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0 ⇒ I<sub>B</sub> = (VCC − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ib, 'A')}.<br>I<sub>C</sub> = β·I<sub>B</sub> = <b>${h.f(q(s).ic, 'A')}</b>; verificación: V<sub>CE</sub> = VCC − R<sub>C</sub>·I<sub>C</sub> = ${h.f(q(s).vce, 'V')} > ${h.vsat}, activa.`,
        en: (p, s, h) => `The base loop now goes through VCC; KVL clockwise: −VCC + R<sub>B</sub>·I<sub>B</sub> + V<sub>BE</sub> = 0 ⇒ I<sub>B</sub> = (VCC − ${h.vbe}) / R<sub>B</sub> = ${h.f(q(s).ib, 'A')}.<br>I<sub>C</sub> = β·I<sub>B</sub> = <b>${h.f(q(s).ic, 'A')}</b>; check: V<sub>CE</sub> = VCC − R<sub>C</sub>·I<sub>C</sub> = ${h.f(q(s).vce, 'V')} > ${h.vsat}, active.`
      }
    },
    {
      id: 'o2', title: { fr: 'R<sub>B</sub> de saturation', es: 'R<sub>B</sub> de saturación', en: 'R<sub>B</sub> for saturation' },
      params: { VCC: [9, 12, 15], RB: [470e3, 680e3, 1e6], beta: [100, 150, 200], RC: [1e3, 2.2e3] },
      circuit: oneSupply,
      text: {
        fr: (p, h) => `Une seule alimentation VCC = ${h.f(p.VCC, 'V')}, RC = ${h.f(p.RC, 'Ω')}, β = ${p.beta}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>En dessous de quelle valeur de R<sub>B</sub> le transistor est-il saturé ?</b>`,
        es: (p, h) => `Una sola fuente VCC = ${h.f(p.VCC, 'V')}, RC = ${h.f(p.RC, 'Ω')}, β = ${p.beta}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>¿Por debajo de qué valor de R<sub>B</sub> el transistor satura?</b>`,
        en: (p, h) => `A single supply VCC = ${h.f(p.VCC, 'V')}, RC = ${h.f(p.RC, 'Ω')}, β = ${p.beta}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>Below which value of R<sub>B</sub> is the transistor saturated?</b>`
      },
      answer: { kind: 'num', unit: 'Ω', value: (p) => p.beta * (p.VCC - 0.7) * p.RC / (p.VCC - 0.2) },
      reveal: { param: 'RB', label: 'R<sub>B</sub>', unit: 'Ω', value: (p, want) => Number((want * 0.99).toPrecision(3)) },
      explain: {
        fr: (p, s, h) => `Saturation dès que β·I<sub>B</sub> ≥ I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}.<br>Avec I<sub>B</sub> = (VCC − ${h.vbe}) / R<sub>B</sub> : R<sub>B</sub> ≤ β·(VCC − ${h.vbe})·R<sub>C</sub> / (VCC − ${h.vsat}) = <b>${h.f(p.beta * (p.VCC - 0.7) * p.RC / (p.VCC - 0.2), 'Ω')}</b>.`,
        es: (p, s, h) => `Satura cuando β·I<sub>B</sub> ≥ I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}.<br>Con I<sub>B</sub> = (VCC − ${h.vbe}) / R<sub>B</sub>: R<sub>B</sub> ≤ β·(VCC − ${h.vbe})·R<sub>C</sub> / (VCC − ${h.vsat}) = <b>${h.f(p.beta * (p.VCC - 0.7) * p.RC / (p.VCC - 0.2), 'Ω')}</b>.`,
        en: (p, s, h) => `It saturates once β·I<sub>B</sub> ≥ I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}.<br>With I<sub>B</sub> = (VCC − ${h.vbe}) / R<sub>B</sub>: R<sub>B</sub> ≤ β·(VCC − ${h.vbe})·R<sub>C</sub> / (VCC − ${h.vsat}) = <b>${h.f(p.beta * (p.VCC - 0.7) * p.RC / (p.VCC - 0.2), 'Ω')}</b>.`
      }
    },

    /* ---------- 5. switching: cut-off or saturation ---------- */
    {
      id: 'k1', title: { fr: 'Commutation : régime', es: 'Conmutación: región', en: 'Switching: region' },
      params: { VBB: [0, 0.4, 5], inName: ['Vin'], RB: [4.7e3, 10e3], beta: [100], RC: [470, 1e3], VCC: [5] },
      circuit: (p) => twoSources(p, 'rc'),
      text: {
        fr: (p, h) => `Transistor en commutation : Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>Dans quel régime est le transistor ?</b>`,
        es: (p, h) => `Transistor en conmutación: Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>¿En qué región está el transistor?</b>`,
        en: (p, h) => `Transistor as a switch: Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}.<br><b>In which region is the transistor?</b>`
      },
      answer: { kind: 'choice', options: ST, value: (p, sol) => stIdx(q(sol).state) },
      explain: { fr: (p, s, h) => regime('fr', p, s, h, 'Vin'), es: (p, s, h) => regime('es', p, s, h, 'Vin'), en: (p, s, h) => regime('en', p, s, h, 'Vin') }
    },
    {
      id: 'k2', title: { fr: 'Commutation : V<sub>CE</sub>', es: 'Conmutación: V<sub>CE</sub>', en: 'Switching: V<sub>CE</sub>' },
      params: { VBB: [0, 5], inName: ['Vin'], RB: [4.7e3, 10e3], beta: [100], RC: [470, 1e3], VCC: [5, 12] },
      circuit: (p) => twoSources(p, 'rc'),
      text: {
        fr: (p, h) => `Même interrupteur à transistor : Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>Que vaut V<sub>CE</sub> ?</b>`,
        es: (p, h) => `La misma llave con transistor: Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>¿Cuánto vale V<sub>CE</sub>?</b>`,
        en: (p, h) => `The same transistor switch: Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}, RC = ${h.f(p.RC, 'Ω')}, VCC = ${h.f(p.VCC, 'V')}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>What is V<sub>CE</sub>?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, sol) => q(sol).vce },
      explain: {
        fr: (p, s, h) => (q(s).state === 'off' ? `Vin < ${h.vbe} : I<sub>B</sub> = 0, transistor bloqué (interrupteur ouvert). Aucun courant dans R<sub>C</sub>, donc <b>V<sub>CE</sub> = VCC = ${h.f(p.VCC, 'V')}</b>.` : `I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(q(s).ib, 'A')} ; β·I<sub>B</sub> = ${h.f(p.beta * q(s).ib, 'A')} dépasse I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')} : saturé (interrupteur fermé), <b>V<sub>CE</sub> = ${h.vsat}</b>.`),
        es: (p, s, h) => (q(s).state === 'off' ? `Vin < ${h.vbe}: I<sub>B</sub> = 0, transistor en corte (llave abierta). No circula corriente por R<sub>C</sub>, entonces <b>V<sub>CE</sub> = VCC = ${h.f(p.VCC, 'V')}</b>.` : `I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(q(s).ib, 'A')}; β·I<sub>B</sub> = ${h.f(p.beta * q(s).ib, 'A')} supera I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}: saturado (llave cerrada), <b>V<sub>CE</sub> = ${h.vsat}</b>.`),
        en: (p, s, h) => (q(s).state === 'off' ? `Vin < ${h.vbe}: I<sub>B</sub> = 0, cut off (open switch). No current in R<sub>C</sub>, so <b>V<sub>CE</sub> = VCC = ${h.f(p.VCC, 'V')}</b>.` : `I<sub>B</sub> = (${h.f(p.VBB, 'V')} − ${h.vbe}) / ${h.f(p.RB, 'Ω')} = ${h.f(q(s).ib, 'A')}; β·I<sub>B</sub> = ${h.f(p.beta * q(s).ib, 'A')} exceeds I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f((p.VCC - 0.2) / p.RC, 'A')}: saturated (closed switch), <b>V<sub>CE</sub> = ${h.vsat}</b>.`)
      }
    },

    /* ---------- 6. a LED ---------- */
    {
      id: 'l1', title: { fr: 'Commande d’une LED', es: 'Comando de un LED', en: 'Driving a LED' },
      params: { VBB: [5], inName: ['Vin'], RB: [4.7e3], beta: [100], RC: [220, 330, 470, 680], VCC: [5, 9, 12], color: ['red', 'green', 'yellow'] },
      ok: (p, s) => q(s).state === 'sat',
      circuit: (p) => twoSources(Object.assign(p, { Vf: DCS.comp.LED_COLORS[p.color].vf }), 'led'),
      text: {
        fr: (p, h) => `Le transistor commande une LED (${tc('fr', p.color)}, V<sub>F</sub> = ${h.f(DCS.comp.LED_COLORS[p.color].vf, 'V')}) en série avec RC = ${h.f(p.RC, 'Ω')}, sous VCC = ${h.f(p.VCC, 'V')}. Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta} : le transistor est saturé (V<sub>CE,sat</sub> = ${h.vsat}).<br><b>Quel courant traverse la LED ?</b>`,
        es: (p, h) => `El transistor comanda un LED (${tc('es', p.color)}, V<sub>F</sub> = ${h.f(DCS.comp.LED_COLORS[p.color].vf, 'V')}) en serie con RC = ${h.f(p.RC, 'Ω')}, con VCC = ${h.f(p.VCC, 'V')}. Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}: el transistor está saturado (V<sub>CE,sat</sub> = ${h.vsat}).<br><b>¿Qué corriente circula por el LED?</b>`,
        en: (p, h) => `The transistor drives a LED (${tc('en', p.color)}, V<sub>F</sub> = ${h.f(DCS.comp.LED_COLORS[p.color].vf, 'V')}) in series with RC = ${h.f(p.RC, 'Ω')}, from VCC = ${h.f(p.VCC, 'V')}. Vin = ${h.f(p.VBB, 'V')}, RB = ${h.f(p.RB, 'Ω')}, β = ${p.beta}: the transistor is saturated (V<sub>CE,sat</sub> = ${h.vsat}).<br><b>What current flows in the LED?</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p, sol) => sol.el('LED1').i },
      explain: {
        fr: (p, s, h) => `Maille de collecteur, sens horaire : VCC − R<sub>C</sub>·I − V<sub>F</sub> − V<sub>CE,sat</sub> = 0, donc I = (VCC − V<sub>F</sub> − V<sub>CE,sat</sub>) / R<sub>C</sub> = (${h.f(p.VCC, 'V')} − ${h.f(p.Vf, 'V')} − ${h.vsat}) / ${h.f(p.RC, 'Ω')} = <b>${h.f(s.el('LED1').i, 'A')}</b>.<br>Saturation vérifiée : β·I<sub>B</sub> = ${h.f(p.beta * q(s).ib, 'A')} > ${h.f(s.el('LED1').i, 'A')}.`,
        es: (p, s, h) => `LKT en la malla de colector, sentido horario: VCC − R<sub>C</sub>·I − V<sub>F</sub> − V<sub>CE,sat</sub> = 0, entonces I = (VCC − V<sub>F</sub> − V<sub>CE,sat</sub>) / R<sub>C</sub> = (${h.f(p.VCC, 'V')} − ${h.f(p.Vf, 'V')} − ${h.vsat}) / ${h.f(p.RC, 'Ω')} = <b>${h.f(s.el('LED1').i, 'A')}</b>.<br>Saturación verificada: β·I<sub>B</sub> = ${h.f(p.beta * q(s).ib, 'A')} > ${h.f(s.el('LED1').i, 'A')}.`,
        en: (p, s, h) => `KVL around the collector loop, clockwise: VCC − R<sub>C</sub>·I − V<sub>F</sub> − V<sub>CE,sat</sub> = 0, so I = (VCC − V<sub>F</sub> − V<sub>CE,sat</sub>) / R<sub>C</sub> = (${h.f(p.VCC, 'V')} − ${h.f(p.Vf, 'V')} − ${h.vsat}) / ${h.f(p.RC, 'Ω')} = <b>${h.f(s.el('LED1').i, 'A')}</b>.<br>Saturation checked: β·I<sub>B</sub> = ${h.f(p.beta * q(s).ib, 'A')} > ${h.f(s.el('LED1').i, 'A')}.`
      }
    },

    /* ---------- 7. a lamp ---------- */
    {
      id: 'p1', title: { fr: 'Commande d’une lampe', es: 'Comando de una lámpara', en: 'Driving a lamp' },
      params: { VBB: [5], inName: ['Vin'], RB: [1e3], beta: [50, 100, 150], lamp: [[12, 5], [12, 10], [24, 5]] },
      circuit: (p) => twoSources(Object.assign(p, { Vn: p.lamp[0], Pn: p.lamp[1], VCC: p.lamp[0] }), 'lamp'),
      text: {
        fr: (p, h) => `Une lampe ${h.f(p.lamp[0], 'V')} / ${h.f(p.lamp[1], 'W')} (modèle : résistance R<sub>L</sub> = V<sub>n</sub>²/P<sub>n</sub>) est dans le collecteur, sous VCC = ${h.f(p.lamp[0], 'V')}. Vin = ${h.f(p.VBB, 'V')}, β = ${p.beta}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>Quelle est la valeur maximale de R<sub>B</sub> pour que la lampe soit pleinement allumée (transistor saturé) ?</b>`,
        es: (p, h) => `Una lámpara ${h.f(p.lamp[0], 'V')} / ${h.f(p.lamp[1], 'W')} (modelo: resistencia R<sub>L</sub> = V<sub>n</sub>²/P<sub>n</sub>) está en el colector, con VCC = ${h.f(p.lamp[0], 'V')}. Vin = ${h.f(p.VBB, 'V')}, β = ${p.beta}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>¿Cuál es el valor máximo de R<sub>B</sub> para que la lámpara encienda del todo (transistor saturado)?</b>`,
        en: (p, h) => `A ${h.f(p.lamp[0], 'V')} / ${h.f(p.lamp[1], 'W')} lamp (model: a resistance R<sub>L</sub> = V<sub>n</sub>²/P<sub>n</sub>) is in the collector, with VCC = ${h.f(p.lamp[0], 'V')}. Vin = ${h.f(p.VBB, 'V')}, β = ${p.beta}, V<sub>CE,sat</sub> = ${h.vsat}.<br><b>What is the largest R<sub>B</sub> that keeps the lamp fully on (transistor saturated)?</b>`
      },
      answer: { kind: 'num', unit: 'Ω', value: (p) => rbLamp(p) },
      reveal: { param: 'RB', label: 'R<sub>B</sub>', unit: 'Ω', value: (p, want) => Number((want * 0.99).toPrecision(3)) },
      explain: {
        fr: (p, s, h) => `R<sub>L</sub> = ${h.f(p.lamp[0], 'V')}² / ${h.f(p.lamp[1], 'W')} = ${h.f(rl(p), 'Ω')} ; saturé : I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>L</sub> = ${h.f((p.lamp[0] - 0.2) / rl(p), 'A')}.<br>Il faut I<sub>B</sub> ≥ I<sub>C,sat</sub> / β = ${h.f((p.lamp[0] - 0.2) / rl(p) / p.beta, 'A')}, donc R<sub>B</sub> ≤ (Vin − ${h.vbe}) / I<sub>B</sub> = <b>${h.f(rbLamp(p), 'Ω')}</b>.<br>En pratique on prend R<sub>B</sub> nettement plus faible (β varie beaucoup d’un transistor à l’autre).`,
        es: (p, s, h) => `R<sub>L</sub> = ${h.f(p.lamp[0], 'V')}² / ${h.f(p.lamp[1], 'W')} = ${h.f(rl(p), 'Ω')}; saturado: I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>L</sub> = ${h.f((p.lamp[0] - 0.2) / rl(p), 'A')}.<br>Hace falta I<sub>B</sub> ≥ I<sub>C,sat</sub> / β = ${h.f((p.lamp[0] - 0.2) / rl(p) / p.beta, 'A')}, entonces R<sub>B</sub> ≤ (Vin − ${h.vbe}) / I<sub>B</sub> = <b>${h.f(rbLamp(p), 'Ω')}</b>.<br>En la práctica se toma R<sub>B</sub> bastante menor (β varía mucho de un transistor a otro).`,
        en: (p, s, h) => `R<sub>L</sub> = ${h.f(p.lamp[0], 'V')}² / ${h.f(p.lamp[1], 'W')} = ${h.f(rl(p), 'Ω')}; saturated: I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>L</sub> = ${h.f((p.lamp[0] - 0.2) / rl(p), 'A')}.<br>It needs I<sub>B</sub> ≥ I<sub>C,sat</sub> / β = ${h.f((p.lamp[0] - 0.2) / rl(p) / p.beta, 'A')}, so R<sub>B</sub> ≤ (Vin − ${h.vbe}) / I<sub>B</sub> = <b>${h.f(rbLamp(p), 'Ω')}</b>.<br>In practice R<sub>B</sub> is taken well below (β varies a lot between transistors).`
      }
    }
  ];

  function vinSat(p) { return p.RB * (p.VCC - 0.2) / (p.beta * p.RC) + 0.7 - p.VBB; }
  function rl(p) { return p.lamp[0] * p.lamp[0] / p.lamp[1]; }
  function rbLamp(p) { return (p.VBB - 0.7) * p.beta * rl(p) / (p.lamp[0] - 0.2); }
  function tc(l, c) { return { fr: { red: 'rouge', green: 'verte', yellow: 'jaune' }, es: { red: 'roja', green: 'verde', yellow: 'amarilla' }, en: { red: 'red', green: 'green', yellow: 'yellow' } }[l][c]; }
  // the reasoning that finds the region of a transistor with VBB (or Vin), RB, RC
  function regime(l, p, s, h, vn) {
    const v = vn || 'VBB', st = q(s).state, icsat = (p.VCC - 0.2) / p.RC, ib0 = ib(p);
    const T = {
      fr: {
        off: `${v} = ${h.f(p.VBB, 'V')} < ${h.vbe} : la jonction base-émetteur ne conduit pas, I<sub>B</sub> = 0, I<sub>C</sub> = 0 → <b>bloqué</b> (V<sub>CE</sub> = VCC).`,
        on: `I<sub>B</sub> = (${v} − ${h.vbe}) / R<sub>B</sub> = ${h.f(ib0, 'A')} ; β·I<sub>B</sub> = ${h.f(p.beta * ib0, 'A')} ; le courant maximal possible est I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f(icsat, 'A')}.<br>`,
        act: `β·I<sub>B</sub> < I<sub>C,sat</sub> → <b>actif</b> : I<sub>C</sub> = ${h.f(q(s).ic, 'A')}, V<sub>CE</sub> = ${h.f(q(s).vce, 'V')}.`,
        sat: `β·I<sub>B</sub> > I<sub>C,sat</sub> → <b>saturé</b> : I<sub>C</sub> = I<sub>C,sat</sub> = ${h.f(q(s).ic, 'A')}, V<sub>CE</sub> = ${h.vsat}.`
      },
      es: {
        off: `${v} = ${h.f(p.VBB, 'V')} < ${h.vbe}: la juntura base-emisor no conduce, I<sub>B</sub> = 0, I<sub>C</sub> = 0 → <b>corte</b> (V<sub>CE</sub> = VCC).`,
        on: `I<sub>B</sub> = (${v} − ${h.vbe}) / R<sub>B</sub> = ${h.f(ib0, 'A')}; β·I<sub>B</sub> = ${h.f(p.beta * ib0, 'A')}; la corriente máxima posible es I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f(icsat, 'A')}.<br>`,
        act: `β·I<sub>B</sub> < I<sub>C,sat</sub> → <b>activa</b>: I<sub>C</sub> = ${h.f(q(s).ic, 'A')}, V<sub>CE</sub> = ${h.f(q(s).vce, 'V')}.`,
        sat: `β·I<sub>B</sub> > I<sub>C,sat</sub> → <b>saturación</b>: I<sub>C</sub> = I<sub>C,sat</sub> = ${h.f(q(s).ic, 'A')}, V<sub>CE</sub> = ${h.vsat}.`
      },
      en: {
        off: `${v} = ${h.f(p.VBB, 'V')} < ${h.vbe}: the base-emitter junction does not conduct, I<sub>B</sub> = 0, I<sub>C</sub> = 0 → <b>cut-off</b> (V<sub>CE</sub> = VCC).`,
        on: `I<sub>B</sub> = (${v} − ${h.vbe}) / R<sub>B</sub> = ${h.f(ib0, 'A')}; β·I<sub>B</sub> = ${h.f(p.beta * ib0, 'A')}; the largest possible current is I<sub>C,sat</sub> = (VCC − ${h.vsat}) / R<sub>C</sub> = ${h.f(icsat, 'A')}.<br>`,
        act: `β·I<sub>B</sub> < I<sub>C,sat</sub> → <b>active</b>: I<sub>C</sub> = ${h.f(q(s).ic, 'A')}, V<sub>CE</sub> = ${h.f(q(s).vce, 'V')}.`,
        sat: `β·I<sub>B</sub> > I<sub>C,sat</sub> → <b>saturation</b>: I<sub>C</sub> = I<sub>C,sat</sub> = ${h.f(q(s).ic, 'A')}, V<sub>CE</sub> = ${h.vsat}.`
      }
    }[l];
    return st === 'off' ? T.off : T.on + T[st];
  }

  DCS.quiz.register({
    id: 'transistor',
    title: { fr: 'Transistor bipolaire en continu', es: 'Transistor bipolar en continua', en: 'Bipolar transistor in DC' },
    short: { fr: 'Transistor', es: 'Transistor', en: 'Transistor' },
    desc: {
      fr: '15 questions, valeurs tirées au hasard : courant de base, IC, puissances, VCE, régimes, polarisation, une seule alimentation, commutation, LED et lampe.',
      es: '15 preguntas, valores al azar: corriente de base, IC, potencias, VCE, regiones, polarización, una sola fuente, conmutación, LED y lámpara.',
      en: '15 questions with random values: base current, IC, powers, VCE, regions, bias, single supply, switching, LED and lamp.'
    },
    questions
  });
})(window);
