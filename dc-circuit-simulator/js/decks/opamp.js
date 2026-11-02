/* Quiz deck: the ideal op-amp (AOP) in DC, linear operation and output saturation at ±V_sat.
 * Inverting, non-inverting, follower, summing, affine function y = m·x + b (summing amplifier with a constant
 * input, then an inverter), difference amplifier; input range that keeps the output linear. The explanations
 * use KCL at the inverting input (i₋ = 0, and v₋ = v₊ in linear operation). Texts in French, Spanish, English. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const G = (x, y) => ['ground', '', x, y, 0];
  const AO = (p, name, x, y, flip) => ['opamp', name, x, y, 0, { sat: true, Vpos: p.Vsat, Vneg: -p.Vsat }, flip];
  const k = 1e3;

  /* ----- circuits (grid units); the output node is named Vs ----- */
  function inverting(p, rl) {
    const c = [['vsource', 'Ve', 0, 5, 1, { V: p.Ve }], ['resistor', 'R1', 4, 3, 0, { R: p.R1 }], ['resistor', 'R2', 10, 0, 0, { R: p.R2 }],
      AO(p, 'U1', 10, 4, false), G(0, 7), G(7, 7)];
    const w = [[[0, 3], [2, 3]], [[6, 3], [7, 3]], [[6, 3], [6, 0], [8, 0]], [[12, 0], [14, 0], [14, 4]], [[13, 4], [16, 4]], [[7, 5], [7, 7]]];
    if (rl) { c.push(['resistor', 'RL', 16, 7, 1, { R: p.RL }], G(16, 9)); w.push([[16, 4], [16, 5]]); }
    return { c, w, n: [[16, 4, 'Vs']] };
  }
  function noninverting(p, rl) {
    const c = [['vsource', 'Ve', 0, 5, 1, { V: p.Ve }], AO(p, 'U1', 10, 4, true), ['resistor', 'R2', 10, 8, 0, { R: p.R2 }],
      ['resistor', 'R1', 7, 11, 1, { R: p.R1 }], G(0, 7), G(7, 13)];
    const w = [[[0, 3], [7, 3]], [[7, 5], [7, 9]], [[7, 8], [8, 8]], [[12, 8], [14, 8], [14, 4]], [[13, 4], [16, 4]]];
    if (rl) { c.push(['resistor', 'RL', 16, 7, 1, { R: p.RL }], G(16, 9)); w.push([[16, 4], [16, 5]]); }
    return { c, w, n: [[16, 4, 'Vs']] };
  }
  function follower(p) {
    return {
      c: [['vsource', 'Ve', 0, 5, 1, { V: p.Ve }], AO(p, 'U1', 10, 4, true), ['resistor', 'RL', 16, 6, 1, { R: p.RL }], G(0, 7), G(16, 8)],
      w: [[[0, 3], [7, 3]], [[13, 4], [16, 4]], [[14, 4], [14, 8], [7, 8], [7, 5]]],
      n: [[16, 4, 'Vs']]
    };
  }
  // inverting summing amplifier, inputs a (through Ra) and b (through Rb), feedback Rf
  function summing(p, na, nb, ra, rb) {
    return {
      c: [['vsource', na, 0, 4, 1, { V: p[na] }], ['resistor', ra, 4, 2, 0, { R: p[ra] }], ['vsource', nb, 0, 11, 1, { V: p[nb] }],
        ['resistor', rb, 4, 9, 0, { R: p[rb] }], ['resistor', 'Rf', 12, 0, 0, { R: p.Rf }], AO(p, 'U1', 12, 6, false), G(0, 6), G(0, 13), G(9, 8)],
      w: [[[0, 2], [2, 2]], [[0, 9], [2, 9]], [[6, 2], [7, 2], [7, 5], [9, 5]], [[6, 9], [7, 9], [7, 5]], [[7, 2], [7, 0], [10, 0]],
        [[14, 0], [16, 0], [16, 6]], [[15, 6], [16, 6]], [[9, 7], [9, 8]]]
    };
  }
  function summer2(p) { const s = summing(p, 'V1', 'V2', 'R1', 'R2'); s.w.push([[16, 6], [18, 6]]); s.n = [[18, 6, 'Vs']]; return s; }
  // y = m·x + b: summing amplifier (input Ve through R1, constant Vref through R2), then an inverter of gain −1
  function affine(p) {
    const s = summing(p, 'Ve', 'Vref', 'R1', 'R2');
    s.c.push(['resistor', 'R3', 18, 6, 0, { R: 10 * k }], ['resistor', 'R4', 25, 3, 0, { R: 10 * k }], AO(p, 'U2', 25, 7, false), G(22, 9));
    s.w.push([[20, 6], [22, 6]], [[21, 6], [21, 3], [23, 3]], [[27, 3], [29, 3], [29, 7]], [[28, 7], [31, 7]], [[22, 8], [22, 9]]);
    s.n = [[31, 7, 'Vs']];
    return s;
  }
  function difference(p) {
    return {
      c: [['vsource', 'V1', 0, 4, 1, { V: p.V1 }], ['resistor', 'R1', 4, 2, 0, { R: p.R1 }], ['vsource', 'V2', 0, 11, 1, { V: p.V2 }],
        ['resistor', 'R3', 4, 9, 0, { R: p.R1 }], ['resistor', 'R4', 8, 11, 1, { R: p.R2 }], ['resistor', 'R2', 12, 0, 0, { R: p.R2 }],
        AO(p, 'U1', 12, 6, false), G(0, 6), G(0, 13), G(8, 13)],
      w: [[[0, 2], [2, 2]], [[0, 9], [2, 9]], [[6, 2], [7, 2], [7, 5], [9, 5]], [[7, 2], [7, 0], [10, 0]], [[14, 0], [16, 0], [16, 6]],
        [[15, 6], [18, 6]], [[6, 9], [8, 9]], [[8, 9], [8, 7], [9, 7]]],
      n: [[18, 6, 'Vs']]
    };
  }

  /* ----- helpers ----- */
  const u = (s, n) => s.el(n || 'U1');
  const lin = (s, n) => u(s, n) && u(s, n).state === 'lin';
  const R = [1 * k, 2.2 * k, 4.7 * k, 10 * k];
  const RF = [10 * k, 22 * k, 47 * k];
  const VSAT = [12, 15];
  // the assumptions, in one line
  const hyp = {
    fr: (p, h) => `AOP idéal, sortie saturée à ±V<sub>sat</sub> = ±${h.f(p.Vsat, 'V')}.`,
    es: (p, h) => `AO ideal, salida saturada en ±V<sub>sat</sub> = ±${h.f(p.Vsat, 'V')}.`,
    en: (p, h) => `Ideal op-amp, output saturating at ±V<sub>sat</sub> = ±${h.f(p.Vsat, 'V')}.`
  };
  const ratio = (a, b, h) => h.num(a / b);
  // "−5 V", with the sign written out
  const sv = (v, h) => h.f(v, 'V');
  // input range kept linear, set just inside the limit after the answer
  const inside = (want) => Number((want - Math.max(0.005, 0.02 * Math.abs(want))).toPrecision(3));
  const setNote = (name) => ({
    fr: (p, s, h) => `Dans le circuit, ${name} est maintenant réglée à ${h.f(p[name], 'V')}, juste avant la limite : Vs = ${sv(u(s, s.el('U2') ? 'U2' : 'U1').vout, h)}, encore linéaire. Dépassez la limite pour voir la sortie se bloquer à V<sub>sat</sub>.`,
    es: (p, s, h) => `En el circuito, ${name} quedó ahora en ${h.f(p[name], 'V')}, justo antes del límite: Vs = ${sv(u(s, s.el('U2') ? 'U2' : 'U1').vout, h)}, todavía lineal. Pase el límite para ver la salida clavarse en V<sub>sat</sub>.`,
    en: (p, s, h) => `In the circuit, ${name} is now set to ${h.f(p[name], 'V')}, just inside the limit: Vs = ${sv(u(s, s.el('U2') ? 'U2' : 'U1').vout, h)}, still linear. Go past the limit to see the output stuck at V<sub>sat</sub>.`
  });
  // KCL at the inverting input of the inverting amplifier
  const kclInv = {
    fr: (p, h) => `Loi des nœuds à l’entrée inverseuse (i<sub>−</sub> = 0) : (Ve − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0.<br>En régime linéaire v<sub>−</sub> = v<sub>+</sub> = 0 (masse virtuelle), donc Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve`,
    es: (p, h) => `LKC en la entrada inversora (i<sub>−</sub> = 0): (Ve − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0.<br>En régimen lineal v<sub>−</sub> = v<sub>+</sub> = 0 (masa virtual), entonces Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve`,
    en: (p, h) => `KCL at the inverting input (i<sub>−</sub> = 0): (Ve − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0.<br>In linear operation v<sub>−</sub> = v<sub>+</sub> = 0 (virtual ground), so Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve`
  };
  const kclNon = {
    fr: (p, h) => `Loi des nœuds à l’entrée inverseuse (i<sub>−</sub> = 0) : (0 − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0.<br>En régime linéaire v<sub>−</sub> = v<sub>+</sub> = Ve, donc Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve`,
    es: (p, h) => `LKC en la entrada inversora (i<sub>−</sub> = 0): (0 − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0.<br>En régimen lineal v<sub>−</sub> = v<sub>+</sub> = Ve, entonces Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve`,
    en: (p, h) => `KCL at the inverting input (i<sub>−</sub> = 0): (0 − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0.<br>In linear operation v<sub>−</sub> = v<sub>+</sub> = Ve, so Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve`
  };
  const L3 = (fr, es, en) => ({ fr, es, en });

  // the inverting amplifier, linear and saturating draws
  const invLin = { Ve: [0.2, 0.5, 0.8, 1, -0.5, -1], R1: R, R2: RF, Vsat: VSAT };
  const invOk = (p, s) => lin(s) && Math.abs(p.R2 / p.R1 * p.Ve) < p.Vsat - 0.5 && Math.abs(p.R2 / p.R1 * p.Ve) > 0.3;
  const nonLin = { Ve: [0.2, 0.5, 1, -0.5, -1], R1: R, R2: [4.7 * k, 10 * k, 22 * k], Vsat: VSAT };
  const nonOk = (p, s) => lin(s) && Math.abs((1 + p.R2 / p.R1) * p.Ve) < p.Vsat - 0.5;
  const affParams = { Ve: [0.5, 1, 1.5], Vref: [1, 2, -1, -2, 5], R1: [10 * k, 22 * k, 47 * k], R2: [10 * k, 22 * k, 47 * k], Rf: [10 * k, 22 * k, 47 * k], Vsat: VSAT };
  const affOk = (p, s) => lin(s, 'U1') && lin(s, 'U2');
  const m = (p) => p.Rf / p.R1, b = (p) => p.Rf / p.R2 * p.Vref;
  const affText = {
    fr: (p, h) => `Premier AOP : sommateur inverseur, avec l’entrée Ve (par R1 = ${h.f(p.R1, 'Ω')}) et une tension constante Vref = ${h.f(p.Vref, 'V')} (par R2 = ${h.f(p.R2, 'Ω')}), Rf = ${h.f(p.Rf, 'Ω')}. Second AOP : inverseur de gain −1 (R3 = R4 = 10 kΩ). Le montage réalise Vs = m·Ve + b. ${hyp.fr(p, h)}`,
    es: (p, h) => `Primer AO: sumador inversor, con la entrada Ve (por R1 = ${h.f(p.R1, 'Ω')}) y una tensión constante Vref = ${h.f(p.Vref, 'V')} (por R2 = ${h.f(p.R2, 'Ω')}), Rf = ${h.f(p.Rf, 'Ω')}. Segundo AO: inversor de ganancia −1 (R3 = R4 = 10 kΩ). El circuito realiza Vs = m·Ve + b. ${hyp.es(p, h)}`,
    en: (p, h) => `First op-amp: inverting summer, with the input Ve (through R1 = ${h.f(p.R1, 'Ω')}) and a constant voltage Vref = ${h.f(p.Vref, 'V')} (through R2 = ${h.f(p.R2, 'Ω')}), Rf = ${h.f(p.Rf, 'Ω')}. Second op-amp: inverter of gain −1 (R3 = R4 = 10 kΩ). The circuit gives Vs = m·Ve + b. ${hyp.en(p, h)}`
  };
  const affWhy = {
    fr: (p, h) => `Premier étage (loi des nœuds en v<sub>−</sub> = 0) : Ve/R<sub>1</sub> + Vref/R<sub>2</sub> + V<sub>1</sub>/R<sub>f</sub> = 0, donc V<sub>1</sub> = −(R<sub>f</sub>/R<sub>1</sub>·Ve + R<sub>f</sub>/R<sub>2</sub>·Vref).<br>Second étage : Vs = −(R<sub>4</sub>/R<sub>3</sub>)·V<sub>1</sub> = −V<sub>1</sub>.<br>Vs = (R<sub>f</sub>/R<sub>1</sub>)·Ve + (R<sub>f</sub>/R<sub>2</sub>)·Vref : m = R<sub>f</sub>/R<sub>1</sub> = ${h.num(m(p))}, b = (R<sub>f</sub>/R<sub>2</sub>)·Vref = ${h.f(b(p), 'V')}.`,
    es: (p, h) => `Primera etapa (LKC en v<sub>−</sub> = 0): Ve/R<sub>1</sub> + Vref/R<sub>2</sub> + V<sub>1</sub>/R<sub>f</sub> = 0, entonces V<sub>1</sub> = −(R<sub>f</sub>/R<sub>1</sub>·Ve + R<sub>f</sub>/R<sub>2</sub>·Vref).<br>Segunda etapa: Vs = −(R<sub>4</sub>/R<sub>3</sub>)·V<sub>1</sub> = −V<sub>1</sub>.<br>Vs = (R<sub>f</sub>/R<sub>1</sub>)·Ve + (R<sub>f</sub>/R<sub>2</sub>)·Vref: m = R<sub>f</sub>/R<sub>1</sub> = ${h.num(m(p))}, b = (R<sub>f</sub>/R<sub>2</sub>)·Vref = ${h.f(b(p), 'V')}.`,
    en: (p, h) => `First stage (KCL at v<sub>−</sub> = 0): Ve/R<sub>1</sub> + Vref/R<sub>2</sub> + V<sub>1</sub>/R<sub>f</sub> = 0, so V<sub>1</sub> = −(R<sub>f</sub>/R<sub>1</sub>·Ve + R<sub>f</sub>/R<sub>2</sub>·Vref).<br>Second stage: Vs = −(R<sub>4</sub>/R<sub>3</sub>)·V<sub>1</sub> = −V<sub>1</sub>.<br>Vs = (R<sub>f</sub>/R<sub>1</sub>)·Ve + (R<sub>f</sub>/R<sub>2</sub>)·Vref: m = R<sub>f</sub>/R<sub>1</sub> = ${h.num(m(p))}, b = (R<sub>f</sub>/R<sub>2</sub>)·Vref = ${h.f(b(p), 'V')}.`
  };

  const questions = [
    /* ---------- inverting amplifier ---------- */
    {
      id: 'i1', title: L3('Inverseur : tension de sortie', 'Inversor: tensión de salida', 'Inverting: output voltage'),
      params: invLin, ok: invOk, circuit: (p) => inverting(p),
      text: {
        fr: (p, h) => `Amplificateur inverseur : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Calculez la tension de sortie Vs.</b>`,
        es: (p, h) => `Amplificador inversor: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>Calcule la tensión de salida Vs.</b>`,
        en: (p, h) => `Inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>Find the output voltage Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vout },
      explain: {
        fr: (p, s, h) => `${kclInv.fr(p, h)} = −${ratio(p.R2, p.R1, h)} × ${h.f(p.Ve, 'V')} = <b>${sv(u(s).vout, h)}</b>.<br>|Vs| &lt; V<sub>sat</sub> : le régime linéaire est bien vérifié.`,
        es: (p, s, h) => `${kclInv.es(p, h)} = −${ratio(p.R2, p.R1, h)} × ${h.f(p.Ve, 'V')} = <b>${sv(u(s).vout, h)}</b>.<br>|Vs| &lt; V<sub>sat</sub>: el régimen lineal se verifica.`,
        en: (p, s, h) => `${kclInv.en(p, h)} = −${ratio(p.R2, p.R1, h)} × ${h.f(p.Ve, 'V')} = <b>${sv(u(s).vout, h)}</b>.<br>|Vs| &lt; V<sub>sat</sub>: linear operation is confirmed.`
      }
    },
    {
      id: 'i2', title: L3('Inverseur : gain', 'Inversor: ganancia', 'Inverting: gain'),
      params: invLin, ok: invOk, circuit: (p) => inverting(p),
      text: {
        fr: (p, h) => `Amplificateur inverseur : R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Quel est le gain Vs/Ve en régime linéaire ?</b>`,
        es: (p, h) => `Amplificador inversor: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Cuál es la ganancia Vs/Ve en régimen lineal?</b>`,
        en: (p, h) => `Inverting amplifier: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>What is the gain Vs/Ve in linear operation?</b>`
      },
      answer: { kind: 'num', unit: 'V/V', value: (p) => -p.R2 / p.R1 },
      explain: {
        fr: (p, s, h) => `${kclInv.fr(p, h)}, donc Vs/Ve = −R<sub>2</sub>/R<sub>1</sub> = −${h.f(p.R2, 'Ω')} / ${h.f(p.R1, 'Ω')} = <b>−${ratio(p.R2, p.R1, h)}</b>.<br>Le signe − : la sortie est en opposition avec l’entrée.`,
        es: (p, s, h) => `${kclInv.es(p, h)}, entonces Vs/Ve = −R<sub>2</sub>/R<sub>1</sub> = −${h.f(p.R2, 'Ω')} / ${h.f(p.R1, 'Ω')} = <b>−${ratio(p.R2, p.R1, h)}</b>.<br>El signo −: la salida está invertida respecto de la entrada.`,
        en: (p, s, h) => `${kclInv.en(p, h)}, so Vs/Ve = −R<sub>2</sub>/R<sub>1</sub> = −${h.f(p.R2, 'Ω')} / ${h.f(p.R1, 'Ω')} = <b>−${ratio(p.R2, p.R1, h)}</b>.<br>The − sign: the output is inverted.`
      }
    },
    {
      id: 'i3', title: L3('Inverseur : entrée inverseuse', 'Inversor: entrada inversora', 'Inverting: inverting input'),
      params: invLin, ok: invOk, circuit: (p) => inverting(p),
      text: {
        fr: (p, h) => `Amplificateur inverseur : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Quelle est la tension v<sub>−</sub> de l’entrée inverseuse (par rapport à la masse) ?</b>`,
        es: (p, h) => `Amplificador inversor: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Cuál es la tensión v<sub>−</sub> de la entrada inversora (respecto de masa)?</b>`,
        en: (p, h) => `Inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>What is the voltage v<sub>−</sub> of the inverting input (to ground)?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vm },
      explain: {
        fr: (p, s, h) => `La sortie n’est pas saturée (Vs = ${sv(u(s).vout, h)}) : régime linéaire, v<sub>−</sub> = v<sub>+</sub>. L’entrée + est à la masse, donc <b>v<sub>−</sub> = 0 V</b> : une <b>masse virtuelle</b> (à 0 V sans être reliée à la masse).`,
        es: (p, s, h) => `La salida no está saturada (Vs = ${sv(u(s).vout, h)}): régimen lineal, v<sub>−</sub> = v<sub>+</sub>. La entrada + está a masa, entonces <b>v<sub>−</sub> = 0 V</b>: una <b>masa virtual</b> (a 0 V sin estar conectada a masa).`,
        en: (p, s, h) => `The output is not saturated (Vs = ${sv(u(s).vout, h)}): linear operation, v<sub>−</sub> = v<sub>+</sub>. The + input is grounded, so <b>v<sub>−</sub> = 0 V</b>: a <b>virtual ground</b> (at 0 V without being connected to ground).`
      }
    },
    {
      id: 'i4', title: L3('Inverseur : courant d’entrée', 'Inversor: corriente de entrada', 'Inverting: input current'),
      params: Object.assign({}, invLin, { Ve: [0.5, 0.8, 1, 2] }), ok: invOk, circuit: (p) => inverting(p),
      text: {
        fr: (p, h) => `Amplificateur inverseur : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Quel courant fournit la source Ve ?</b>`,
        es: (p, h) => `Amplificador inversor: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Qué corriente entrega la fuente Ve?</b>`,
        en: (p, h) => `Inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>What current does the source Ve deliver?</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p) => p.Ve / p.R1 },
      explain: {
        fr: (p, s, h) => `Le courant de la source traverse R<sub>1</sub>, dont l’autre borne est à la masse virtuelle (v<sub>−</sub> = 0) : I = (Ve − 0)/R<sub>1</sub> = ${h.f(p.Ve, 'V')} / ${h.f(p.R1, 'Ω')} = <b>${h.f(p.Ve / p.R1, 'A')}</b>.<br>Comme i<sub>−</sub> = 0, ce courant continue dans R<sub>2</sub> jusqu’à la sortie. La source voit une résistance d’entrée R<sub>1</sub>.`,
        es: (p, s, h) => `La corriente de la fuente atraviesa R<sub>1</sub>, cuyo otro extremo está en la masa virtual (v<sub>−</sub> = 0): I = (Ve − 0)/R<sub>1</sub> = ${h.f(p.Ve, 'V')} / ${h.f(p.R1, 'Ω')} = <b>${h.f(p.Ve / p.R1, 'A')}</b>.<br>Como i<sub>−</sub> = 0, esa corriente sigue por R<sub>2</sub> hasta la salida. La fuente ve una resistencia de entrada R<sub>1</sub>.`,
        en: (p, s, h) => `The source current flows through R<sub>1</sub>, whose other end is at the virtual ground (v<sub>−</sub> = 0): I = (Ve − 0)/R<sub>1</sub> = ${h.f(p.Ve, 'V')} / ${h.f(p.R1, 'Ω')} = <b>${h.f(p.Ve / p.R1, 'A')}</b>.<br>Since i<sub>−</sub> = 0, it goes on through R<sub>2</sub> to the output. The source sees an input resistance R<sub>1</sub>.`
      }
    },
    {
      id: 'i5', title: L3('Inverseur : saturation', 'Inversor: saturación', 'Inverting: saturation'),
      params: { Ve: [1, 1.5, 2, -1, -2], R1: [1 * k, 2.2 * k], R2: [22 * k, 47 * k], Vsat: VSAT },
      ok: (p, s) => Math.abs(p.R2 / p.R1 * p.Ve) > p.Vsat + 1 && !lin(s),
      circuit: (p) => inverting(p),
      text: {
        fr: (p, h) => `Amplificateur inverseur : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Calculez la tension de sortie Vs.</b>`,
        es: (p, h) => `Amplificador inversor: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>Calcule la tensión de salida Vs.</b>`,
        en: (p, h) => `Inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>Find the output voltage Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vout },
      explain: {
        fr: (p, s, h) => `En régime linéaire on aurait Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv(-p.R2 / p.R1 * p.Ve, h)} : impossible, |Vs| ne peut pas dépasser V<sub>sat</sub>. La sortie <b>sature</b> : Vs = <b>${sv(u(s).vout, h)}</b>.<br>Alors v<sub>−</sub> ≠ v<sub>+</sub> : il n’y a plus de masse virtuelle (ici v<sub>−</sub> = ${sv(u(s).vm, h)}).`,
        es: (p, s, h) => `En régimen lineal sería Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv(-p.R2 / p.R1 * p.Ve, h)}: imposible, |Vs| no puede superar V<sub>sat</sub>. La salida <b>satura</b>: Vs = <b>${sv(u(s).vout, h)}</b>.<br>Entonces v<sub>−</sub> ≠ v<sub>+</sub>: ya no hay masa virtual (aquí v<sub>−</sub> = ${sv(u(s).vm, h)}).`,
        en: (p, s, h) => `In linear operation Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv(-p.R2 / p.R1 * p.Ve, h)}: impossible, |Vs| cannot exceed V<sub>sat</sub>. The output <b>saturates</b>: Vs = <b>${sv(u(s).vout, h)}</b>.<br>Then v<sub>−</sub> ≠ v<sub>+</sub>: no more virtual ground (here v<sub>−</sub> = ${sv(u(s).vm, h)}).`
      }
    },
    {
      id: 'i6', title: L3('Inverseur : plage d’entrée', 'Inversor: rango de entrada', 'Inverting: input range'),
      params: { Ve: [0.1], R1: [1 * k, 2.2 * k, 4.7 * k], R2: [10 * k, 22 * k, 47 * k], Vsat: VSAT },
      ok: (p, s) => p.Vsat * p.R1 / p.R2 < 10,
      circuit: (p) => inverting(p),
      text: {
        fr: (p, h) => `Amplificateur inverseur : R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Jusqu’à quelle valeur (positive) de Ve la sortie reste-t-elle en régime linéaire ?</b>`,
        es: (p, h) => `Amplificador inversor: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Hasta qué valor (positivo) de Ve la salida sigue en régimen lineal?</b>`,
        en: (p, h) => `Inverting amplifier: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>Up to what (positive) value of Ve does the output stay linear?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.Vsat * p.R1 / p.R2 },
      reveal: { param: 'Ve', value: (p, want) => inside(want), note: setNote('Ve') },
      explain: {
        fr: (p, s, h) => `En linéaire Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve = −${ratio(p.R2, p.R1, h)}·Ve. La sortie sature quand |Vs| atteint V<sub>sat</sub> :<br>Ve<sub>max</sub> = V<sub>sat</sub>·R<sub>1</sub>/R<sub>2</sub> = ${h.f(p.Vsat, 'V')} / ${ratio(p.R2, p.R1, h)} = <b>${h.f(p.Vsat * p.R1 / p.R2, 'V')}</b>.<br>Plage linéaire : −${h.f(p.Vsat * p.R1 / p.R2, 'V')} &lt; Ve &lt; ${h.f(p.Vsat * p.R1 / p.R2, 'V')}.`,
        es: (p, s, h) => `En lineal Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve = −${ratio(p.R2, p.R1, h)}·Ve. La salida satura cuando |Vs| llega a V<sub>sat</sub>:<br>Ve<sub>máx</sub> = V<sub>sat</sub>·R<sub>1</sub>/R<sub>2</sub> = ${h.f(p.Vsat, 'V')} / ${ratio(p.R2, p.R1, h)} = <b>${h.f(p.Vsat * p.R1 / p.R2, 'V')}</b>.<br>Rango lineal: −${h.f(p.Vsat * p.R1 / p.R2, 'V')} &lt; Ve &lt; ${h.f(p.Vsat * p.R1 / p.R2, 'V')}.`,
        en: (p, s, h) => `Linear: Vs = −(R<sub>2</sub>/R<sub>1</sub>)·Ve = −${ratio(p.R2, p.R1, h)}·Ve. The output saturates when |Vs| reaches V<sub>sat</sub>:<br>Ve<sub>max</sub> = V<sub>sat</sub>·R<sub>1</sub>/R<sub>2</sub> = ${h.f(p.Vsat, 'V')} / ${ratio(p.R2, p.R1, h)} = <b>${h.f(p.Vsat * p.R1 / p.R2, 'V')}</b>.<br>Linear range: −${h.f(p.Vsat * p.R1 / p.R2, 'V')} &lt; Ve &lt; ${h.f(p.Vsat * p.R1 / p.R2, 'V')}.`
      }
    },

    /* ---------- non-inverting amplifier ---------- */
    {
      id: 'n1', title: L3('Non inverseur : tension de sortie', 'No inversor: tensión de salida', 'Non-inverting: output voltage'),
      params: nonLin, ok: nonOk, circuit: (p) => noninverting(p),
      text: {
        fr: (p, h) => `Amplificateur non inverseur : Ve = ${h.f(p.Ve, 'V')} sur l’entrée +, R1 = ${h.f(p.R1, 'Ω')} (vers la masse), R2 = ${h.f(p.R2, 'Ω')} (contre-réaction). ${hyp.fr(p, h)}<br><b>Calculez Vs.</b>`,
        es: (p, h) => `Amplificador no inversor: Ve = ${h.f(p.Ve, 'V')} en la entrada +, R1 = ${h.f(p.R1, 'Ω')} (a masa), R2 = ${h.f(p.R2, 'Ω')} (realimentación). ${hyp.es(p, h)}<br><b>Calcule Vs.</b>`,
        en: (p, h) => `Non-inverting amplifier: Ve = ${h.f(p.Ve, 'V')} on the + input, R1 = ${h.f(p.R1, 'Ω')} (to ground), R2 = ${h.f(p.R2, 'Ω')} (feedback). ${hyp.en(p, h)}<br><b>Find Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vout },
      explain: {
        fr: (p, s, h) => `${kclNon.fr(p, h)} = (1 + ${ratio(p.R2, p.R1, h)}) × ${h.f(p.Ve, 'V')} = <b>${sv(u(s).vout, h)}</b>.`,
        es: (p, s, h) => `${kclNon.es(p, h)} = (1 + ${ratio(p.R2, p.R1, h)}) × ${h.f(p.Ve, 'V')} = <b>${sv(u(s).vout, h)}</b>.`,
        en: (p, s, h) => `${kclNon.en(p, h)} = (1 + ${ratio(p.R2, p.R1, h)}) × ${h.f(p.Ve, 'V')} = <b>${sv(u(s).vout, h)}</b>.`
      }
    },
    {
      id: 'n2', title: L3('Non inverseur : entrée inverseuse', 'No inversor: entrada inversora', 'Non-inverting: inverting input'),
      params: nonLin, ok: nonOk, circuit: (p) => noninverting(p),
      text: {
        fr: (p, h) => `Amplificateur non inverseur : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Quelle est la tension v<sub>−</sub> de l’entrée inverseuse ?</b>`,
        es: (p, h) => `Amplificador no inversor: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Cuál es la tensión v<sub>−</sub> de la entrada inversora?</b>`,
        en: (p, h) => `Non-inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>What is the voltage v<sub>−</sub> of the inverting input?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vm },
      explain: {
        fr: (p, s, h) => `Régime linéaire (Vs = ${sv(u(s).vout, h)}, non saturée) : v<sub>−</sub> = v<sub>+</sub> = Ve = <b>${h.f(p.Ve, 'V')}</b> (« court-circuit virtuel »).<br>Vérification par le diviseur R<sub>1</sub>–R<sub>2</sub> (i<sub>−</sub> = 0) : v<sub>−</sub> = Vs·R<sub>1</sub>/(R<sub>1</sub> + R<sub>2</sub>) = ${sv(u(s).vout * p.R1 / (p.R1 + p.R2), h)}.`,
        es: (p, s, h) => `Régimen lineal (Vs = ${sv(u(s).vout, h)}, sin saturar): v<sub>−</sub> = v<sub>+</sub> = Ve = <b>${h.f(p.Ve, 'V')}</b> («cortocircuito virtual»).<br>Verificación con el divisor R<sub>1</sub>–R<sub>2</sub> (i<sub>−</sub> = 0): v<sub>−</sub> = Vs·R<sub>1</sub>/(R<sub>1</sub> + R<sub>2</sub>) = ${sv(u(s).vout * p.R1 / (p.R1 + p.R2), h)}.`,
        en: (p, s, h) => `Linear operation (Vs = ${sv(u(s).vout, h)}, not saturated): v<sub>−</sub> = v<sub>+</sub> = Ve = <b>${h.f(p.Ve, 'V')}</b> (“virtual short”).<br>Check with the R<sub>1</sub>–R<sub>2</sub> divider (i<sub>−</sub> = 0): v<sub>−</sub> = Vs·R<sub>1</sub>/(R<sub>1</sub> + R<sub>2</sub>) = ${sv(u(s).vout * p.R1 / (p.R1 + p.R2), h)}.`
      }
    },
    {
      id: 'n3', title: L3('Non inverseur : courant d’entrée', 'No inversor: corriente de entrada', 'Non-inverting: input current'),
      params: nonLin, ok: nonOk, circuit: (p) => noninverting(p),
      text: {
        fr: (p, h) => `Amplificateur non inverseur : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Quel courant fournit la source Ve ?</b>`,
        es: (p, h) => `Amplificador no inversor: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Qué corriente entrega la fuente Ve?</b>`,
        en: (p, h) => `Non-inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>What current does the source Ve deliver?</b>`
      },
      answer: { kind: 'num', unit: 'A', value: () => 0 },
      explain: {
        fr: () => `La source n’est reliée qu’à l’entrée +, qui ne consomme aucun courant (AOP idéal : i<sub>+</sub> = 0) : <b>I = 0 A</b>.<br>Résistance d’entrée infinie : c’est l’intérêt du montage non inverseur (il ne charge pas la source).`,
        es: () => `La fuente solo está conectada a la entrada +, que no consume corriente (AO ideal: i<sub>+</sub> = 0): <b>I = 0 A</b>.<br>Resistencia de entrada infinita: es la ventaja del no inversor (no carga a la fuente).`,
        en: () => `The source only drives the + input, which draws no current (ideal op-amp: i<sub>+</sub> = 0): <b>I = 0 A</b>.<br>Infinite input resistance: the point of the non-inverting amplifier (it does not load the source).`
      }
    },
    {
      id: 'n4', title: L3('Non inverseur : plage d’entrée', 'No inversor: rango de entrada', 'Non-inverting: input range'),
      params: { Ve: [0.1], R1: R, R2: [4.7 * k, 10 * k, 22 * k, 47 * k], Vsat: VSAT },
      ok: (p) => p.Vsat / (1 + p.R2 / p.R1) < 10,
      circuit: (p) => noninverting(p),
      text: {
        fr: (p, h) => `Amplificateur non inverseur : R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Jusqu’à quelle valeur (positive) de Ve la sortie reste-t-elle en régime linéaire ?</b>`,
        es: (p, h) => `Amplificador no inversor: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Hasta qué valor (positivo) de Ve la salida sigue en régimen lineal?</b>`,
        en: (p, h) => `Non-inverting amplifier: R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>Up to what (positive) value of Ve does the output stay linear?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.Vsat / (1 + p.R2 / p.R1) },
      reveal: { param: 'Ve', value: (p, want) => inside(want), note: setNote('Ve') },
      explain: {
        fr: (p, s, h) => `Gain : 1 + R<sub>2</sub>/R<sub>1</sub> = ${h.num(1 + p.R2 / p.R1)}. La sortie sature quand Vs = V<sub>sat</sub> :<br>Ve<sub>max</sub> = V<sub>sat</sub> / (1 + R<sub>2</sub>/R<sub>1</sub>) = ${h.f(p.Vsat, 'V')} / ${h.num(1 + p.R2 / p.R1)} = <b>${h.f(p.Vsat / (1 + p.R2 / p.R1), 'V')}</b>.<br>Plage linéaire : |Ve| &lt; ${h.f(p.Vsat / (1 + p.R2 / p.R1), 'V')}.`,
        es: (p, s, h) => `Ganancia: 1 + R<sub>2</sub>/R<sub>1</sub> = ${h.num(1 + p.R2 / p.R1)}. La salida satura cuando Vs = V<sub>sat</sub>:<br>Ve<sub>máx</sub> = V<sub>sat</sub> / (1 + R<sub>2</sub>/R<sub>1</sub>) = ${h.f(p.Vsat, 'V')} / ${h.num(1 + p.R2 / p.R1)} = <b>${h.f(p.Vsat / (1 + p.R2 / p.R1), 'V')}</b>.<br>Rango lineal: |Ve| &lt; ${h.f(p.Vsat / (1 + p.R2 / p.R1), 'V')}.`,
        en: (p, s, h) => `Gain: 1 + R<sub>2</sub>/R<sub>1</sub> = ${h.num(1 + p.R2 / p.R1)}. The output saturates when Vs = V<sub>sat</sub>:<br>Ve<sub>max</sub> = V<sub>sat</sub> / (1 + R<sub>2</sub>/R<sub>1</sub>) = ${h.f(p.Vsat, 'V')} / ${h.num(1 + p.R2 / p.R1)} = <b>${h.f(p.Vsat / (1 + p.R2 / p.R1), 'V')}</b>.<br>Linear range: |Ve| &lt; ${h.f(p.Vsat / (1 + p.R2 / p.R1), 'V')}.`
      }
    },
    {
      id: 'n5', title: L3('Courant de sortie de l’AOP', 'Corriente de salida del AO', 'Op-amp output current'),
      params: { Ve: [0.5, 1, 1.5], R1: [1 * k, 2.2 * k, 4.7 * k], R2: [4.7 * k, 10 * k], RL: [470, 1 * k, 2.2 * k], Vsat: VSAT },
      ok: (p, s) => lin(s), circuit: (p) => noninverting(p, true),
      text: {
        fr: (p, h) => `Amplificateur non inverseur chargé : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}, charge RL = ${h.f(p.RL, 'Ω')}. ${hyp.fr(p, h)}<br><b>Quel courant fournit la sortie de l’AOP ?</b>`,
        es: (p, h) => `Amplificador no inversor con carga: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}, carga RL = ${h.f(p.RL, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Qué corriente entrega la salida del AO?</b>`,
        en: (p, h) => `Loaded non-inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}, load RL = ${h.f(p.RL, 'Ω')}. ${hyp.en(p, h)}<br><b>What current does the op-amp output deliver?</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p, s) => u(s).iout },
      explain: {
        fr: (p, s, h) => { const vs = u(s).vout; return `Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv(vs, h)}.<br>Loi des nœuds à la sortie : I<sub>AOP</sub> = I<sub>RL</sub> + I<sub>R2</sub>, avec I<sub>RL</sub> = Vs/R<sub>L</sub> = ${h.f(vs / p.RL, 'A')} et I<sub>R2</sub> = Vs/(R<sub>1</sub> + R<sub>2</sub>) = ${h.f(vs / (p.R1 + p.R2), 'A')} (R<sub>1</sub> et R<sub>2</sub> en série, i<sub>−</sub> = 0).<br>I<sub>AOP</sub> = <b>${h.f(u(s).iout, 'A')}</b>. Ce courant vient de l’alimentation de l’AOP, pas de la source Ve.`; },
        es: (p, s, h) => { const vs = u(s).vout; return `Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv(vs, h)}.<br>LKC en la salida: I<sub>AO</sub> = I<sub>RL</sub> + I<sub>R2</sub>, con I<sub>RL</sub> = Vs/R<sub>L</sub> = ${h.f(vs / p.RL, 'A')} e I<sub>R2</sub> = Vs/(R<sub>1</sub> + R<sub>2</sub>) = ${h.f(vs / (p.R1 + p.R2), 'A')} (R<sub>1</sub> y R<sub>2</sub> en serie, i<sub>−</sub> = 0).<br>I<sub>AO</sub> = <b>${h.f(u(s).iout, 'A')}</b>. Esa corriente sale de la alimentación del AO, no de la fuente Ve.`; },
        en: (p, s, h) => { const vs = u(s).vout; return `Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv(vs, h)}.<br>KCL at the output: I<sub>op</sub> = I<sub>RL</sub> + I<sub>R2</sub>, with I<sub>RL</sub> = Vs/R<sub>L</sub> = ${h.f(vs / p.RL, 'A')} and I<sub>R2</sub> = Vs/(R<sub>1</sub> + R<sub>2</sub>) = ${h.f(vs / (p.R1 + p.R2), 'A')} (R<sub>1</sub> and R<sub>2</sub> in series, i<sub>−</sub> = 0).<br>I<sub>op</sub> = <b>${h.f(u(s).iout, 'A')}</b>. It comes from the op-amp supply, not from the source Ve.`; }
      }
    },
    {
      id: 'n6', title: L3('Non inverseur : saturation', 'No inversor: saturación', 'Non-inverting: saturation'),
      params: { Ve: [1, 1.5, 2, -1.5], R1: [1 * k, 2.2 * k], R2: [10 * k, 22 * k], Vsat: VSAT },
      ok: (p, s) => Math.abs((1 + p.R2 / p.R1) * p.Ve) > p.Vsat + 1 && !lin(s),
      circuit: (p) => noninverting(p),
      text: {
        fr: (p, h) => `Amplificateur non inverseur : Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.fr(p, h)}<br><b>Calculez Vs.</b>`,
        es: (p, h) => `Amplificador no inversor: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.es(p, h)}<br><b>Calcule Vs.</b>`,
        en: (p, h) => `Non-inverting amplifier: Ve = ${h.f(p.Ve, 'V')}, R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}. ${hyp.en(p, h)}<br><b>Find Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vout },
      explain: {
        fr: (p, s, h) => `En linéaire : Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv((1 + p.R2 / p.R1) * p.Ve, h)}, au-delà de V<sub>sat</sub> : la sortie <b>sature</b> à <b>${sv(u(s).vout, h)}</b>.`,
        es: (p, s, h) => `En lineal: Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv((1 + p.R2 / p.R1) * p.Ve, h)}, más allá de V<sub>sat</sub>: la salida <b>satura</b> en <b>${sv(u(s).vout, h)}</b>.`,
        en: (p, s, h) => `Linear: Vs = (1 + R<sub>2</sub>/R<sub>1</sub>)·Ve = ${sv((1 + p.R2 / p.R1) * p.Ve, h)}, beyond V<sub>sat</sub>: the output <b>saturates</b> at <b>${sv(u(s).vout, h)}</b>.`
      }
    },

    /* ---------- follower ---------- */
    {
      id: 'f1', title: L3('Suiveur chargé', 'Seguidor con carga', 'Loaded follower'),
      params: { Ve: [1, 2, 5, -3], RL: [100, 220, 470, 1 * k], Vsat: VSAT }, ok: (p, s) => lin(s), circuit: (p) => follower(p),
      text: {
        fr: (p, h) => `Montage suiveur (sortie reliée à l’entrée −) : Ve = ${h.f(p.Ve, 'V')}, charge RL = ${h.f(p.RL, 'Ω')}. ${hyp.fr(p, h)}<br><b>Quel courant fournit la sortie de l’AOP ?</b>`,
        es: (p, h) => `Seguidor (salida unida a la entrada −): Ve = ${h.f(p.Ve, 'V')}, carga RL = ${h.f(p.RL, 'Ω')}. ${hyp.es(p, h)}<br><b>¿Qué corriente entrega la salida del AO?</b>`,
        en: (p, h) => `Voltage follower (output tied to the − input): Ve = ${h.f(p.Ve, 'V')}, load RL = ${h.f(p.RL, 'Ω')}. ${hyp.en(p, h)}<br><b>What current does the op-amp output deliver?</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p, s) => u(s).iout },
      explain: {
        fr: (p, s, h) => `Régime linéaire : v<sub>−</sub> = v<sub>+</sub>, et v<sub>−</sub> = Vs, donc Vs = Ve = ${h.f(p.Ve, 'V')} (gain 1).<br>Le courant de la charge, Vs/R<sub>L</sub> = ${h.f(p.Ve, 'V')} / ${h.f(p.RL, 'Ω')} = <b>${h.f(u(s).iout, 'A')}</b>, est fourni par l’AOP ; la source Ve ne fournit rien (i<sub>+</sub> = 0). Le suiveur sert d’adaptateur d’impédance.`,
        es: (p, s, h) => `Régimen lineal: v<sub>−</sub> = v<sub>+</sub>, y v<sub>−</sub> = Vs, entonces Vs = Ve = ${h.f(p.Ve, 'V')} (ganancia 1).<br>La corriente de la carga, Vs/R<sub>L</sub> = ${h.f(p.Ve, 'V')} / ${h.f(p.RL, 'Ω')} = <b>${h.f(u(s).iout, 'A')}</b>, la entrega el AO; la fuente Ve no entrega nada (i<sub>+</sub> = 0). El seguidor sirve de adaptador de impedancia.`,
        en: (p, s, h) => `Linear operation: v<sub>−</sub> = v<sub>+</sub>, and v<sub>−</sub> = Vs, so Vs = Ve = ${h.f(p.Ve, 'V')} (gain 1).<br>The load current, Vs/R<sub>L</sub> = ${h.f(p.Ve, 'V')} / ${h.f(p.RL, 'Ω')} = <b>${h.f(u(s).iout, 'A')}</b>, comes from the op-amp; the source Ve delivers nothing (i<sub>+</sub> = 0). The follower is an impedance buffer.`
      }
    },

    /* ---------- summing amplifier ---------- */
    {
      id: 's1', title: L3('Sommateur inverseur', 'Sumador inversor', 'Inverting summer'),
      params: { V1: [0.5, 1, -0.5, 2], V2: [0.2, 1, -1, 1.5], R1: [10 * k, 22 * k], R2: [10 * k, 47 * k], Rf: [10 * k, 22 * k, 47 * k], Vsat: VSAT },
      ok: (p, s) => lin(s) && Math.abs(u(s).vout) > 0.2, circuit: (p) => summer2(p),
      text: {
        fr: (p, h) => `Sommateur inverseur : V1 = ${h.f(p.V1, 'V')} par R1 = ${h.f(p.R1, 'Ω')}, V2 = ${h.f(p.V2, 'V')} par R2 = ${h.f(p.R2, 'Ω')}, Rf = ${h.f(p.Rf, 'Ω')}. ${hyp.fr(p, h)}<br><b>Calculez Vs.</b>`,
        es: (p, h) => `Sumador inversor: V1 = ${h.f(p.V1, 'V')} por R1 = ${h.f(p.R1, 'Ω')}, V2 = ${h.f(p.V2, 'V')} por R2 = ${h.f(p.R2, 'Ω')}, Rf = ${h.f(p.Rf, 'Ω')}. ${hyp.es(p, h)}<br><b>Calcule Vs.</b>`,
        en: (p, h) => `Inverting summer: V1 = ${h.f(p.V1, 'V')} through R1 = ${h.f(p.R1, 'Ω')}, V2 = ${h.f(p.V2, 'V')} through R2 = ${h.f(p.R2, 'Ω')}, Rf = ${h.f(p.Rf, 'Ω')}. ${hyp.en(p, h)}<br><b>Find Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vout },
      explain: {
        fr: (p, s, h) => `Loi des nœuds à l’entrée inverseuse (v<sub>−</sub> = 0, i<sub>−</sub> = 0) : V<sub>1</sub>/R<sub>1</sub> + V<sub>2</sub>/R<sub>2</sub> + Vs/R<sub>f</sub> = 0<br>Vs = −(R<sub>f</sub>/R<sub>1</sub>·V<sub>1</sub> + R<sub>f</sub>/R<sub>2</sub>·V<sub>2</sub>) = −(${ratio(p.Rf, p.R1, h)} × ${h.f(p.V1, 'V')} + ${ratio(p.Rf, p.R2, h)} × ${h.f(p.V2, 'V')}) = <b>${sv(u(s).vout, h)}</b>.`,
        es: (p, s, h) => `LKC en la entrada inversora (v<sub>−</sub> = 0, i<sub>−</sub> = 0): V<sub>1</sub>/R<sub>1</sub> + V<sub>2</sub>/R<sub>2</sub> + Vs/R<sub>f</sub> = 0<br>Vs = −(R<sub>f</sub>/R<sub>1</sub>·V<sub>1</sub> + R<sub>f</sub>/R<sub>2</sub>·V<sub>2</sub>) = −(${ratio(p.Rf, p.R1, h)} × ${h.f(p.V1, 'V')} + ${ratio(p.Rf, p.R2, h)} × ${h.f(p.V2, 'V')}) = <b>${sv(u(s).vout, h)}</b>.`,
        en: (p, s, h) => `KCL at the inverting input (v<sub>−</sub> = 0, i<sub>−</sub> = 0): V<sub>1</sub>/R<sub>1</sub> + V<sub>2</sub>/R<sub>2</sub> + Vs/R<sub>f</sub> = 0<br>Vs = −(R<sub>f</sub>/R<sub>1</sub>·V<sub>1</sub> + R<sub>f</sub>/R<sub>2</sub>·V<sub>2</sub>) = −(${ratio(p.Rf, p.R1, h)} × ${h.f(p.V1, 'V')} + ${ratio(p.Rf, p.R2, h)} × ${h.f(p.V2, 'V')}) = <b>${sv(u(s).vout, h)}</b>.`
      }
    },

    /* ---------- affine function y = m·x + b ---------- */
    {
      id: 'y1', title: L3('Fonction affine : pente', 'Función afín: pendiente', 'Affine function: slope'),
      params: affParams, ok: affOk, circuit: (p) => affine(p),
      text: { fr: (p, h) => `${affText.fr(p, h)}<br><b>Calculez la pente m.</b>`, es: (p, h) => `${affText.es(p, h)}<br><b>Calcule la pendiente m.</b>`, en: (p, h) => `${affText.en(p, h)}<br><b>Find the slope m.</b>` },
      answer: { kind: 'num', unit: 'V/V', value: (p) => m(p) },
      explain: { fr: (p, s, h) => affWhy.fr(p, h) + ` Donc <b>m = ${h.num(m(p))}</b>.`, es: (p, s, h) => affWhy.es(p, h) + ` Entonces <b>m = ${h.num(m(p))}</b>.`, en: (p, s, h) => affWhy.en(p, h) + ` So <b>m = ${h.num(m(p))}</b>.` }
    },
    {
      id: 'y2', title: L3('Fonction affine : ordonnée à l’origine', 'Función afín: ordenada al origen', 'Affine function: intercept'),
      params: affParams, ok: affOk, circuit: (p) => affine(p),
      text: { fr: (p, h) => `${affText.fr(p, h)}<br><b>Calculez b (la valeur de Vs pour Ve = 0).</b>`, es: (p, h) => `${affText.es(p, h)}<br><b>Calcule b (el valor de Vs con Ve = 0).</b>`, en: (p, h) => `${affText.en(p, h)}<br><b>Find b (the value of Vs for Ve = 0).</b>` },
      answer: { kind: 'num', unit: 'V', value: (p) => b(p) },
      explain: { fr: (p, s, h) => affWhy.fr(p, h) + ` Donc <b>b = ${h.f(b(p), 'V')}</b> : la tension constante Vref décale la droite.`, es: (p, s, h) => affWhy.es(p, h) + ` Entonces <b>b = ${h.f(b(p), 'V')}</b>: la tensión constante Vref desplaza la recta.`, en: (p, s, h) => affWhy.en(p, h) + ` So <b>b = ${h.f(b(p), 'V')}</b>: the constant Vref shifts the line.` }
    },
    {
      id: 'y3', title: L3('Fonction affine : tension de sortie', 'Función afín: tensión de salida', 'Affine function: output voltage'),
      params: affParams, ok: affOk, circuit: (p) => affine(p),
      text: { fr: (p, h) => `${affText.fr(p, h)}<br><b>Calculez Vs pour Ve = ${h.f(p.Ve, 'V')}.</b>`, es: (p, h) => `${affText.es(p, h)}<br><b>Calcule Vs para Ve = ${h.f(p.Ve, 'V')}.</b>`, en: (p, h) => `${affText.en(p, h)}<br><b>Find Vs for Ve = ${h.f(p.Ve, 'V')}.</b>` },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s, 'U2').vout },
      explain: {
        fr: (p, s, h) => affWhy.fr(p, h) + `<br>Vs = m·Ve + b = ${h.num(m(p))} × ${h.f(p.Ve, 'V')} + ${h.f(b(p), 'V')} = <b>${sv(u(s, 'U2').vout, h)}</b>.`,
        es: (p, s, h) => affWhy.es(p, h) + `<br>Vs = m·Ve + b = ${h.num(m(p))} × ${h.f(p.Ve, 'V')} + ${h.f(b(p), 'V')} = <b>${sv(u(s, 'U2').vout, h)}</b>.`,
        en: (p, s, h) => affWhy.en(p, h) + `<br>Vs = m·Ve + b = ${h.num(m(p))} × ${h.f(p.Ve, 'V')} + ${h.f(b(p), 'V')} = <b>${sv(u(s, 'U2').vout, h)}</b>.`
      }
    },
    {
      id: 'y4', title: L3('Fonction affine : plage d’entrée', 'Función afín: rango de entrada', 'Affine function: input range'),
      params: Object.assign({}, affParams, { Ve: [0.1] }),
      ok: (p, s) => affOk(p, s) && (p.Vsat - b(p)) / m(p) > 0.3 && (p.Vsat - b(p)) / m(p) < 12,
      circuit: (p) => affine(p),
      text: { fr: (p, h) => `${affText.fr(p, h)}<br><b>Ve augmente à partir de 0 : jusqu’à quelle valeur de Ve la sortie reste-t-elle linéaire ?</b>`, es: (p, h) => `${affText.es(p, h)}<br><b>Ve crece desde 0: ¿hasta qué valor de Ve la salida sigue siendo lineal?</b>`, en: (p, h) => `${affText.en(p, h)}<br><b>Ve rises from 0: up to what value of Ve does the output stay linear?</b>` },
      answer: { kind: 'num', unit: 'V', value: (p) => (p.Vsat - b(p)) / m(p) },
      reveal: { param: 'Ve', value: (p, want) => inside(want), note: setNote('Ve') },
      explain: {
        fr: (p, s, h) => affWhy.fr(p, h) + `<br>Vs = m·Ve + b atteint V<sub>sat</sub> pour Ve = (V<sub>sat</sub> − b)/m = (${h.f(p.Vsat, 'V')} − ${h.f(b(p), 'V')}) / ${h.num(m(p))} = <b>${h.f((p.Vsat - b(p)) / m(p), 'V')}</b>.<br>(Le premier étage, qui donne −Vs, sature au même moment.)`,
        es: (p, s, h) => affWhy.es(p, h) + `<br>Vs = m·Ve + b llega a V<sub>sat</sub> con Ve = (V<sub>sat</sub> − b)/m = (${h.f(p.Vsat, 'V')} − ${h.f(b(p), 'V')}) / ${h.num(m(p))} = <b>${h.f((p.Vsat - b(p)) / m(p), 'V')}</b>.<br>(La primera etapa, que da −Vs, satura al mismo tiempo.)`,
        en: (p, s, h) => affWhy.en(p, h) + `<br>Vs = m·Ve + b reaches V<sub>sat</sub> for Ve = (V<sub>sat</sub> − b)/m = (${h.f(p.Vsat, 'V')} − ${h.f(b(p), 'V')}) / ${h.num(m(p))} = <b>${h.f((p.Vsat - b(p)) / m(p), 'V')}</b>.<br>(The first stage, giving −Vs, saturates at the same time.)`
      }
    },

    /* ---------- difference amplifier ---------- */
    {
      id: 'd1', title: L3('Soustracteur', 'Restador', 'Difference amplifier'),
      params: { V1: [0.5, 1, 2], V2: [1, 1.5, 3, 0.2], R1: [10 * k, 22 * k], R2: [10 * k, 22 * k, 47 * k], Vsat: VSAT },
      ok: (p, s) => lin(s) && Math.abs(p.V2 - p.V1) > 0.1, circuit: (p) => difference(p),
      text: {
        fr: (p, h) => `Soustracteur : V1 = ${h.f(p.V1, 'V')} sur l’entrée − par R1 = ${h.f(p.R1, 'Ω')} (contre-réaction R2 = ${h.f(p.R2, 'Ω')}) ; V2 = ${h.f(p.V2, 'V')} sur l’entrée + par le diviseur R3 = R1, R4 = R2. ${hyp.fr(p, h)}<br><b>Calculez Vs.</b>`,
        es: (p, h) => `Restador: V1 = ${h.f(p.V1, 'V')} a la entrada − por R1 = ${h.f(p.R1, 'Ω')} (realimentación R2 = ${h.f(p.R2, 'Ω')}); V2 = ${h.f(p.V2, 'V')} a la entrada + por el divisor R3 = R1, R4 = R2. ${hyp.es(p, h)}<br><b>Calcule Vs.</b>`,
        en: (p, h) => `Difference amplifier: V1 = ${h.f(p.V1, 'V')} to the − input through R1 = ${h.f(p.R1, 'Ω')} (feedback R2 = ${h.f(p.R2, 'Ω')}); V2 = ${h.f(p.V2, 'V')} to the + input through the divider R3 = R1, R4 = R2. ${hyp.en(p, h)}<br><b>Find Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p, s) => u(s).vout },
      explain: {
        fr: (p, s, h) => `Entrée + (diviseur, i<sub>+</sub> = 0) : v<sub>+</sub> = V<sub>2</sub>·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) = ${sv(p.V2 * p.R2 / (p.R1 + p.R2), h)}.<br>Loi des nœuds à l’entrée − avec v<sub>−</sub> = v<sub>+</sub> : (V<sub>1</sub> − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0<br>Vs = (R<sub>2</sub>/R<sub>1</sub>)·(V<sub>2</sub> − V<sub>1</sub>) = ${ratio(p.R2, p.R1, h)} × (${h.f(p.V2, 'V')} − ${h.f(p.V1, 'V')}) = <b>${sv(u(s).vout, h)}</b>.`,
        es: (p, s, h) => `Entrada + (divisor, i<sub>+</sub> = 0): v<sub>+</sub> = V<sub>2</sub>·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) = ${sv(p.V2 * p.R2 / (p.R1 + p.R2), h)}.<br>LKC en la entrada − con v<sub>−</sub> = v<sub>+</sub>: (V<sub>1</sub> − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0<br>Vs = (R<sub>2</sub>/R<sub>1</sub>)·(V<sub>2</sub> − V<sub>1</sub>) = ${ratio(p.R2, p.R1, h)} × (${h.f(p.V2, 'V')} − ${h.f(p.V1, 'V')}) = <b>${sv(u(s).vout, h)}</b>.`,
        en: (p, s, h) => `+ input (divider, i<sub>+</sub> = 0): v<sub>+</sub> = V<sub>2</sub>·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) = ${sv(p.V2 * p.R2 / (p.R1 + p.R2), h)}.<br>KCL at the − input with v<sub>−</sub> = v<sub>+</sub>: (V<sub>1</sub> − v<sub>−</sub>)/R<sub>1</sub> + (Vs − v<sub>−</sub>)/R<sub>2</sub> = 0<br>Vs = (R<sub>2</sub>/R<sub>1</sub>)·(V<sub>2</sub> − V<sub>1</sub>) = ${ratio(p.R2, p.R1, h)} × (${h.f(p.V2, 'V')} − ${h.f(p.V1, 'V')}) = <b>${sv(u(s).vout, h)}</b>.`
      }
    }
  ];

  DCS.quiz.register({
    id: 'opamp',
    title: { fr: 'AOP idéal en continu', es: 'Amplificador operacional ideal en continua', en: 'Ideal op-amp in DC' },
    short: { fr: 'AOP', es: 'AO', en: 'Op-amp' },
    desc: {
      fr: 'Inverseur, non inverseur, suiveur, sommateur, soustracteur, y = m·x + b ; saturation.',
      es: 'Inversor, no inversor, seguidor, sumador, restador, y = m·x + b; saturación.',
      en: 'Inverting, non-inverting, follower, summer, difference, y = m·x + b; saturation.'
    },
    questions
  });
})(window);
