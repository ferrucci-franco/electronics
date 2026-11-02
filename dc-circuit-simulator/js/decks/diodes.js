/* Quiz deck: diodes in DC (threshold model: V_γ = 0.7 V when conducting, no current when off; breakdown at
 * V_BR with no series resistance), LEDs and the Zener regulator. States, switching thresholds, breakdown, the
 * resistor of a LED for 20 mA, input limits, the Zener region. Explanations with the method of assumptions
 * (assume the diode off, compute its voltage, check). Texts in French, Spanish and English. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const G = (x, y) => ['ground', '', x, y, 0];
  const k = 1e3, VG = 0.7;
  const LEDV = { red: 1.8, green: 2.2, yellow: 2.1, blue: 3.0 };
  const LEDN = { fr: { red: 'rouge', green: 'verte', yellow: 'jaune', blue: 'bleue' }, es: { red: 'roja', green: 'verde', yellow: 'amarilla', blue: 'azul' }, en: { red: 'red', green: 'green', yellow: 'yellow', blue: 'blue' } };
  const L3 = (fr, es, en) => ({ fr, es, en });

  /* ----- circuits (grid units) ----- */
  // Vin → R → D → ground (rev: the diode the other way round, with optional breakdown)
  function series(p, rev) {
    return {
      c: [['vsource', 'Vin', 0, 5, 1, { V: p.Vin }], ['resistor', 'R', 4, 3, 0, { R: p.R }],
        ['diode', 'D1', 8, 5, rev ? 3 : 1, { model: 'cvd', Vf: VG, bd: !!p.Vbr, Vbr: p.Vbr || 100 }], G(0, 7), G(8, 7)],
      w: [[[0, 3], [2, 3]], [[6, 3], [8, 3]]]
    };
  }
  // Vin → R → D → E (+ on the cathode side) → ground
  function twoSources(p) {
    return {
      c: [['vsource', 'Vin', 0, 5, 1, { V: p.Vin }], ['resistor', 'R', 4, 3, 0, { R: p.R }], ['diode', 'D1', 8, 5, 1, { model: 'cvd', Vf: VG }],
        ['vsource', 'E', 8, 9, 1, { V: p.E }], G(0, 7), G(8, 11)],
      w: [[[0, 3], [2, 3]], [[6, 3], [8, 3]]]
    };
  }
  // diode OR: V1 → D1 and V2 → D2 to a common node, R to ground
  function diodeOr(p) {
    return {
      c: [['vsource', 'V1', 0, 5, 1, { V: p.V1 }], ['diode', 'D1', 4, 3, 0, { model: 'cvd', Vf: VG }], ['vsource', 'V2', 0, 12, 1, { V: p.V2 }],
        ['diode', 'D2', 4, 10, 0, { model: 'cvd', Vf: VG }], ['resistor', 'R', 10, 5, 1, { R: p.R }], G(0, 7), G(0, 14), G(10, 7)],
      w: [[[0, 3], [2, 3]], [[0, 10], [2, 10]], [[6, 3], [10, 3]], [[6, 10], [8, 10], [8, 3]]],
      n: [[10, 3, 'Vs']]
    };
  }
  // divider R1–R2, then D towards a source E (threshold of conduction)
  function dividerToSource(p) {
    return {
      c: [['vsource', 'Vin', 0, 5, 1, { V: p.Vin }], ['resistor', 'R1', 4, 3, 0, { R: p.R1 }], ['resistor', 'R2', 8, 5, 1, { R: p.R2 }],
        ['diode', 'D1', 12, 3, 0, { model: 'cvd', Vf: VG }], ['vsource', 'E', 16, 5, 1, { V: p.E }], G(0, 7), G(8, 7), G(16, 7)],
      w: [[[0, 3], [2, 3]], [[6, 3], [10, 3]], [[14, 3], [16, 3]]]
    };
  }
  // divider R1–R2 with a diode across R2, cathode up (reverse biased when Vin > 0), breakdown at V_BR
  function dividerReverse(p) {
    return {
      c: [['vsource', 'Vin', 0, 5, 1, { V: p.Vin }], ['resistor', 'R1', 4, 3, 0, { R: p.R1 }], ['resistor', 'R2', 8, 5, 1, { R: p.R2 }],
        ['diode', 'D1', 11, 5, 3, { model: 'cvd', Vf: VG, bd: true, Vbr: p.Vbr }], G(0, 7), G(8, 7)],
      w: [[[0, 3], [2, 3]], [[6, 3], [11, 3]], [[8, 7], [11, 7]]]
    };
  }
  function led(p) {
    return {
      c: [['vsource', 'Vcc', 0, 5, 1, { V: p.Vcc }], ['resistor', 'R', 4, 3, 0, { R: p.R }], ['led', 'LED1', 8, 5, 1, { color: p.color, Vf: LEDV[p.color], model: 'cvd' }], G(0, 7), G(8, 7)],
      w: [[[0, 3], [2, 3]], [[6, 3], [8, 3]]]
    };
  }
  // Zener regulator: Vin → R → node Vs; Zener (cathode up) and load RL from Vs to ground
  function zener(p) {
    return {
      c: [['vsource', 'Vin', 0, 5, 1, { V: p.Vin }], ['resistor', 'R', 4, 3, 0, { R: p.R }], ['zener', 'DZ1', 8, 5, 3, { model: 'cvd', Vz: p.Vz, Vf: VG, rz: 0 }],
        ['resistor', 'RL', 12, 5, 1, { R: p.RL }], G(0, 7), G(8, 7)],
      w: [[[0, 3], [2, 3]], [[6, 3], [12, 3]], [[8, 7], [12, 7]]],
      n: [[12, 3, 'Vs']]
    };
  }

  /* ----- helpers ----- */
  const d = (s, n) => s.el(n || 'D1');
  const st2 = { on: 0, off: 1 }, st3 = { on: 0, off: 1, bd: 2 }, zst = { bd: 0, off: 1, on: 2 };
  const ST2 = L3(['Passante', 'Bloquée'], ['Conduce', 'Cortado'], ['Conducting', 'Off']);
  const ST3 = L3(['Passante (en direct)', 'Bloquée', 'En claquage'], ['Conduce (en directa)', 'Cortado', 'En ruptura'], ['Forward conducting', 'Off', 'In breakdown']);
  const ZST = L3(['Zone Zener (claquage)', 'Bloquée', 'Passante (en direct)'], ['Zona Zener (ruptura)', 'Cortado', 'Conduce (en directa)'], ['Zener region (breakdown)', 'Off', 'Forward conducting']);
  const vg = (h) => h.vbe;   // "0,7 V"
  const hyp = {
    fr: (h) => `Diode : V<sub>γ</sub> = ${vg(h)} quand elle conduit, courant nul quand elle est bloquée.`,
    es: (h) => `Diodo: V<sub>γ</sub> = ${vg(h)} cuando conduce, corriente nula cuando está cortado.`,
    en: (h) => `Diode: V<sub>γ</sub> = ${vg(h)} when conducting, no current when off.`
  };
  const past = (want) => Number((want + Math.max(0.01, 0.02 * Math.abs(want))).toPrecision(3));
  const inside = (want) => Number((want - Math.max(0.01, 0.02 * Math.abs(want))).toPrecision(3));
  const far = (a, b) => Math.abs(a - b) > 0.25;
  // the note after a limit: the value now in the circuit and what it does
  const noteSet = (name, unit, what) => ({
    fr: (p, s, h) => `Dans le circuit, ${name} est maintenant à ${h.f(p[name], unit)} : ${what.fr(p, s, h)} Faites-la varier de part et d’autre de la limite pour voir le changement.`,
    es: (p, s, h) => `En el circuito, ${name} quedó ahora en ${h.f(p[name], unit)}: ${what.es(p, s, h)} Muévala a uno y otro lado del límite para ver el cambio.`,
    en: (p, s, h) => `In the circuit, ${name} is now ${h.f(p[name], unit)}: ${what.en(p, s, h)} Move it across the limit to see the change.`
  });
  const nowOn = L3((p, s, h) => `juste au-delà du seuil, la diode conduit (I = ${h.f(d(s).i, 'A')}).`, (p, s, h) => `justo pasando el umbral, el diodo conduce (I = ${h.f(d(s).i, 'A')}).`, (p, s, h) => `just past the threshold, the diode conducts (I = ${h.f(d(s).i, 'A')}).`);

  const questions = [
    /* ---------- state of a diode ---------- */
    {
      id: 'a1', title: L3('État de la diode', 'Estado del diodo', 'State of the diode'),
      params: { Vin: [5, -5, 3, -3, 12, -12], R: [1 * k, 2.2 * k], rev: [false, true] },
      circuit: (p) => series(p, p.rev),
      text: {
        fr: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diode D1 comme sur le schéma. ${hyp.fr(h)}<br><b>Dans quel état est D1 ?</b>`,
        es: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diodo D1 como en el esquema. ${hyp.es(h)}<br><b>¿En qué estado está D1?</b>`,
        en: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diode D1 as drawn. ${hyp.en(h)}<br><b>What state is D1 in?</b>`
      },
      answer: { kind: 'choice', options: ST2, value: (p, s) => st2[d(s).state] },
      explain: {
        fr: (p, s, h) => { const vd = p.rev ? -p.Vin : p.Vin; return `Hypothèse : D1 bloquée. Alors I = 0, R ne chute aucune tension et la diode reçoit toute la tension : V<sub>D</sub> = V<sub>anode</sub> − V<sub>cathode</sub> = ${h.f(vd, 'V')}.<br>${vd > VG ? `V<sub>D</sub> > V<sub>γ</sub> : impossible pour une diode bloquée, elle est donc <b>passante</b> (I = (|Vin| − V<sub>γ</sub>)/R = ${h.f(Math.abs(d(s).i), 'A')}).` : `V<sub>D</sub> &lt; V<sub>γ</sub> : l’hypothèse est cohérente, D1 est <b>bloquée</b>.`}`; },
        es: (p, s, h) => { const vd = p.rev ? -p.Vin : p.Vin; return `Hipótesis: D1 cortado. Entonces I = 0, en R no cae tensión y el diodo recibe toda la tensión: V<sub>D</sub> = V<sub>ánodo</sub> − V<sub>cátodo</sub> = ${h.f(vd, 'V')}.<br>${vd > VG ? `V<sub>D</sub> > V<sub>γ</sub>: imposible para un diodo cortado, entonces <b>conduce</b> (I = (|Vin| − V<sub>γ</sub>)/R = ${h.f(Math.abs(d(s).i), 'A')}).` : `V<sub>D</sub> &lt; V<sub>γ</sub>: la hipótesis es coherente, D1 está <b>cortado</b>.`}`; },
        en: (p, s, h) => { const vd = p.rev ? -p.Vin : p.Vin; return `Assume D1 off. Then I = 0, R drops nothing and the diode gets the whole voltage: V<sub>D</sub> = V<sub>anode</sub> − V<sub>cathode</sub> = ${h.f(vd, 'V')}.<br>${vd > VG ? `V<sub>D</sub> > V<sub>γ</sub>: impossible for an off diode, so it is <b>conducting</b> (I = (|Vin| − V<sub>γ</sub>)/R = ${h.f(Math.abs(d(s).i), 'A')}).` : `V<sub>D</sub> &lt; V<sub>γ</sub>: the assumption holds, D1 is <b>off</b>.`}`; }
      }
    },
    {
      id: 'a2', title: L3('Deux diodes en OU', 'Dos diodos en OR', 'Two diodes (OR)'),
      params: { V1: [3, 5, 8], V2: [2, 6, 10], R: [1 * k, 4.7 * k] },
      ok: (p) => far(p.V1, p.V2), circuit: (p) => diodeOr(p),
      text: {
        fr: (p, h) => `Deux sources V1 = ${h.f(p.V1, 'V')} et V2 = ${h.f(p.V2, 'V')} alimentent R = ${h.f(p.R, 'Ω')} à travers D1 et D2. ${hyp.fr(h)}<br><b>Dans quel état est D2 ?</b>`,
        es: (p, h) => `Dos fuentes V1 = ${h.f(p.V1, 'V')} y V2 = ${h.f(p.V2, 'V')} alimentan R = ${h.f(p.R, 'Ω')} a través de D1 y D2. ${hyp.es(h)}<br><b>¿En qué estado está D2?</b>`,
        en: (p, h) => `Two sources V1 = ${h.f(p.V1, 'V')} and V2 = ${h.f(p.V2, 'V')} feed R = ${h.f(p.R, 'Ω')} through D1 and D2. ${hyp.en(h)}<br><b>What state is D2 in?</b>`
      },
      answer: { kind: 'choice', options: ST2, value: (p, s) => st2[d(s, 'D2').state] },
      explain: {
        fr: (p, s, h) => { const hi = Math.max(p.V1, p.V2), vs = hi - VG, lo = Math.min(p.V1, p.V2); return `La diode reliée à la tension la plus haute (${h.f(hi, 'V')}) conduit : Vs = ${h.f(hi, 'V')} − ${vg(h)} = ${h.f(vs, 'V')}.<br>L’autre diode voit alors V<sub>D</sub> = ${h.f(lo, 'V')} − ${h.f(vs, 'V')} = ${h.f(lo - vs, 'V')} &lt; V<sub>γ</sub> : elle est bloquée.<br>Donc D2 est <b>${p.V2 > p.V1 ? 'passante' : 'bloquée'}</b>. (Le montage donne la plus grande des deux tensions, moins V<sub>γ</sub> : un « OU ».)`; },
        es: (p, s, h) => { const hi = Math.max(p.V1, p.V2), vs = hi - VG, lo = Math.min(p.V1, p.V2); return `Conduce el diodo conectado a la tensión más alta (${h.f(hi, 'V')}): Vs = ${h.f(hi, 'V')} − ${vg(h)} = ${h.f(vs, 'V')}.<br>El otro diodo ve entonces V<sub>D</sub> = ${h.f(lo, 'V')} − ${h.f(vs, 'V')} = ${h.f(lo - vs, 'V')} &lt; V<sub>γ</sub>: está cortado.<br>Entonces D2 <b>${p.V2 > p.V1 ? 'conduce' : 'está cortado'}</b>. (El circuito da la mayor de las dos tensiones, menos V<sub>γ</sub>: un «OR».)`; },
        en: (p, s, h) => { const hi = Math.max(p.V1, p.V2), vs = hi - VG, lo = Math.min(p.V1, p.V2); return `The diode on the higher voltage (${h.f(hi, 'V')}) conducts: Vs = ${h.f(hi, 'V')} − ${vg(h)} = ${h.f(vs, 'V')}.<br>The other diode then sees V<sub>D</sub> = ${h.f(lo, 'V')} − ${h.f(vs, 'V')} = ${h.f(lo - vs, 'V')} &lt; V<sub>γ</sub>: it is off.<br>So D2 is <b>${p.V2 > p.V1 ? 'conducting' : 'off'}</b>. (The circuit gives the larger of the two voltages, minus V<sub>γ</sub>: an “OR”.)`; }
      }
    },
    {
      id: 'a3', title: L3('Diode entre deux sources', 'Diodo entre dos fuentes', 'Diode between two sources'),
      params: { Vin: [3, 5, 8], E: [2, 5, 6, 9], R: [1 * k, 2.2 * k] },
      ok: (p) => far(p.Vin - p.E, VG), circuit: (p) => twoSources(p),
      text: {
        fr: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, et la cathode de D1 est reliée à une source E = ${h.f(p.E, 'V')}. ${hyp.fr(h)}<br><b>Dans quel état est D1 ?</b>`,
        es: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, y el cátodo de D1 está unido a una fuente E = ${h.f(p.E, 'V')}. ${hyp.es(h)}<br><b>¿En qué estado está D1?</b>`,
        en: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, and the cathode of D1 goes to a source E = ${h.f(p.E, 'V')}. ${hyp.en(h)}<br><b>What state is D1 in?</b>`
      },
      answer: { kind: 'choice', options: ST2, value: (p, s) => st2[d(s).state] },
      explain: {
        fr: (p, s, h) => `Hypothèse bloquée : I = 0, l’anode est à Vin, la cathode à E : V<sub>D</sub> = Vin − E = ${h.f(p.Vin - p.E, 'V')}.<br>${p.Vin - p.E > VG ? `> V<sub>γ</sub> : contradiction, D1 est <b>passante</b> ; I = (Vin − V<sub>γ</sub> − E)/R = ${h.f(d(s).i, 'A')}.` : `&lt; V<sub>γ</sub> : hypothèse vérifiée, D1 est <b>bloquée</b>.`}`,
        es: (p, s, h) => `Hipótesis cortado: I = 0, el ánodo está a Vin y el cátodo a E: V<sub>D</sub> = Vin − E = ${h.f(p.Vin - p.E, 'V')}.<br>${p.Vin - p.E > VG ? `> V<sub>γ</sub>: contradicción, D1 <b>conduce</b>; I = (Vin − V<sub>γ</sub> − E)/R = ${h.f(d(s).i, 'A')}.` : `&lt; V<sub>γ</sub>: hipótesis verificada, D1 está <b>cortado</b>.`}`,
        en: (p, s, h) => `Assume off: I = 0, the anode is at Vin and the cathode at E: V<sub>D</sub> = Vin − E = ${h.f(p.Vin - p.E, 'V')}.<br>${p.Vin - p.E > VG ? `> V<sub>γ</sub>: contradiction, D1 is <b>conducting</b>; I = (Vin − V<sub>γ</sub> − E)/R = ${h.f(d(s).i, 'A')}.` : `&lt; V<sub>γ</sub>: the assumption holds, D1 is <b>off</b>.`}`
      }
    },
    {
      id: 'a4', title: L3('Courant dans la diode', 'Corriente en el diodo', 'Diode current'),
      params: { Vin: [5, 9, 12], R: [470, 1 * k, 2.2 * k] }, circuit: (p) => series(p, false),
      text: {
        fr: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diode D1 en direct. ${hyp.fr(h)}<br><b>Calculez le courant dans D1.</b>`,
        es: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diodo D1 en directa. ${hyp.es(h)}<br><b>Calcule la corriente en D1.</b>`,
        en: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diode D1 forward biased. ${hyp.en(h)}<br><b>Find the current in D1.</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p) => (p.Vin - VG) / p.R },
      explain: {
        fr: (p, s, h) => `D1 passante (Vin > V<sub>γ</sub>). Loi des mailles : −Vin + R·I + V<sub>γ</sub> = 0, donc I = (Vin − V<sub>γ</sub>)/R = (${h.f(p.Vin, 'V')} − ${vg(h)}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vin - VG) / p.R, 'A')}</b>.`,
        es: (p, s, h) => `D1 conduce (Vin > V<sub>γ</sub>). LKT: −Vin + R·I + V<sub>γ</sub> = 0, entonces I = (Vin − V<sub>γ</sub>)/R = (${h.f(p.Vin, 'V')} − ${vg(h)}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vin - VG) / p.R, 'A')}</b>.`,
        en: (p, s, h) => `D1 conducts (Vin > V<sub>γ</sub>). KVL: −Vin + R·I + V<sub>γ</sub> = 0, so I = (Vin − V<sub>γ</sub>)/R = (${h.f(p.Vin, 'V')} − ${vg(h)}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vin - VG) / p.R, 'A')}</b>.`
      }
    },
    {
      id: 'a5', title: L3('Tension d’une diode bloquée', 'Tensión de un diodo cortado', 'Voltage of an off diode'),
      params: { Vin: [1, 3, 5], E: [2, 5, 6, 9], R: [1 * k, 2.2 * k] },
      ok: (p) => p.Vin - p.E < VG - 0.25, circuit: (p) => twoSources(p),
      text: {
        fr: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, cathode de D1 reliée à E = ${h.f(p.E, 'V')}. ${hyp.fr(h)}<br><b>Calculez la tension V<sub>D</sub> = V<sub>anode</sub> − V<sub>cathode</sub> de D1.</b>`,
        es: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, cátodo de D1 unido a E = ${h.f(p.E, 'V')}. ${hyp.es(h)}<br><b>Calcule la tensión V<sub>D</sub> = V<sub>ánodo</sub> − V<sub>cátodo</sub> de D1.</b>`,
        en: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, cathode of D1 tied to E = ${h.f(p.E, 'V')}. ${hyp.en(h)}<br><b>Find the voltage V<sub>D</sub> = V<sub>anode</sub> − V<sub>cathode</sub> of D1.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.Vin - p.E },
      explain: {
        fr: (p, s, h) => `Vin − E = ${h.f(p.Vin - p.E, 'V')} &lt; V<sub>γ</sub> : D1 est bloquée, I = 0, R ne chute rien.<br>V<sub>D</sub> = Vin − E = <b>${h.f(p.Vin - p.E, 'V')}</b>${p.Vin - p.E < 0 ? ' (polarisation inverse)' : ''}.`,
        es: (p, s, h) => `Vin − E = ${h.f(p.Vin - p.E, 'V')} &lt; V<sub>γ</sub>: D1 está cortado, I = 0, en R no cae nada.<br>V<sub>D</sub> = Vin − E = <b>${h.f(p.Vin - p.E, 'V')}</b>${p.Vin - p.E < 0 ? ' (polarización inversa)' : ''}.`,
        en: (p, s, h) => `Vin − E = ${h.f(p.Vin - p.E, 'V')} &lt; V<sub>γ</sub>: D1 is off, I = 0, R drops nothing.<br>V<sub>D</sub> = Vin − E = <b>${h.f(p.Vin - p.E, 'V')}</b>${p.Vin - p.E < 0 ? ' (reverse biased)' : ''}.`
      }
    },

    /* ---------- switching thresholds ---------- */
    {
      id: 'b1', title: L3('Seuil de conduction', 'Umbral de conducción', 'Conduction threshold'),
      params: { Vin: [0], E: [1, 2, 3, 5], R: [1 * k, 2.2 * k] }, circuit: (p) => twoSources(p),
      text: {
        fr: (p, h) => `R = ${h.f(p.R, 'Ω')}, cathode de D1 reliée à E = ${h.f(p.E, 'V')}. Vin augmente à partir de 0. ${hyp.fr(h)}<br><b>À partir de quelle valeur de Vin la diode conduit-elle ?</b>`,
        es: (p, h) => `R = ${h.f(p.R, 'Ω')}, cátodo de D1 unido a E = ${h.f(p.E, 'V')}. Vin crece desde 0. ${hyp.es(h)}<br><b>¿A partir de qué valor de Vin conduce el diodo?</b>`,
        en: (p, h) => `R = ${h.f(p.R, 'Ω')}, cathode of D1 tied to E = ${h.f(p.E, 'V')}. Vin rises from 0. ${hyp.en(h)}<br><b>From what value of Vin does the diode conduct?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.E + VG },
      reveal: { param: 'Vin', value: (p, want) => past(want), note: noteSet('Vin', 'V', nowOn) },
      explain: {
        fr: (p, s, h) => `Tant qu’elle est bloquée, I = 0 et V<sub>D</sub> = Vin − E. Elle conduit dès que V<sub>D</sub> atteint V<sub>γ</sub> : Vin = E + V<sub>γ</sub> = ${h.f(p.E, 'V')} + ${vg(h)} = <b>${h.f(p.E + VG, 'V')}</b>.`,
        es: (p, s, h) => `Mientras está cortado, I = 0 y V<sub>D</sub> = Vin − E. Conduce cuando V<sub>D</sub> llega a V<sub>γ</sub>: Vin = E + V<sub>γ</sub> = ${h.f(p.E, 'V')} + ${vg(h)} = <b>${h.f(p.E + VG, 'V')}</b>.`,
        en: (p, s, h) => `While off, I = 0 and V<sub>D</sub> = Vin − E. It conducts once V<sub>D</sub> reaches V<sub>γ</sub>: Vin = E + V<sub>γ</sub> = ${h.f(p.E, 'V')} + ${vg(h)} = <b>${h.f(p.E + VG, 'V')}</b>.`
      }
    },
    {
      id: 'b2', title: L3('Seuil avec un pont diviseur', 'Umbral con un divisor', 'Threshold with a divider'),
      params: { Vin: [0], R1: [1 * k, 2.2 * k, 4.7 * k], R2: [1 * k, 2.2 * k, 4.7 * k, 10 * k], E: [1, 2, 3] },
      ok: (p) => (p.E + VG) * (p.R1 + p.R2) / p.R2 < 30, circuit: (p) => dividerToSource(p),
      text: {
        fr: (p, h) => `Pont diviseur R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')} ; D1 relie le point milieu à une source E = ${h.f(p.E, 'V')}. Vin augmente à partir de 0. ${hyp.fr(h)}<br><b>À partir de quelle valeur de Vin D1 conduit-elle ?</b>`,
        es: (p, h) => `Divisor R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}; D1 une el punto medio con una fuente E = ${h.f(p.E, 'V')}. Vin crece desde 0. ${hyp.es(h)}<br><b>¿A partir de qué valor de Vin conduce D1?</b>`,
        en: (p, h) => `Divider R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}; D1 joins the middle point to a source E = ${h.f(p.E, 'V')}. Vin rises from 0. ${hyp.en(h)}<br><b>From what value of Vin does D1 conduct?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => (p.E + VG) * (p.R1 + p.R2) / p.R2 },
      reveal: { param: 'Vin', value: (p, want) => past(want), note: noteSet('Vin', 'V', nowOn) },
      explain: {
        fr: (p, s, h) => `D1 bloquée : aucun courant ne sort du pont, le point milieu est à V<sub>M</sub> = Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>).<br>D1 conduit dès que V<sub>M</sub> − E atteint V<sub>γ</sub> : Vin = (E + V<sub>γ</sub>)·(R<sub>1</sub> + R<sub>2</sub>)/R<sub>2</sub> = ${h.f(p.E + VG, 'V')} × ${h.num((p.R1 + p.R2) / p.R2)} = <b>${h.f((p.E + VG) * (p.R1 + p.R2) / p.R2, 'V')}</b>.`,
        es: (p, s, h) => `D1 cortado: no sale corriente del divisor, el punto medio está a V<sub>M</sub> = Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>).<br>D1 conduce cuando V<sub>M</sub> − E llega a V<sub>γ</sub>: Vin = (E + V<sub>γ</sub>)·(R<sub>1</sub> + R<sub>2</sub>)/R<sub>2</sub> = ${h.f(p.E + VG, 'V')} × ${h.num((p.R1 + p.R2) / p.R2)} = <b>${h.f((p.E + VG) * (p.R1 + p.R2) / p.R2, 'V')}</b>.`,
        en: (p, s, h) => `D1 off: no current leaves the divider, the middle point is at V<sub>M</sub> = Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>).<br>D1 conducts once V<sub>M</sub> − E reaches V<sub>γ</sub>: Vin = (E + V<sub>γ</sub>)·(R<sub>1</sub> + R<sub>2</sub>)/R<sub>2</sub> = ${h.f(p.E + VG, 'V')} × ${h.num((p.R1 + p.R2) / p.R2)} = <b>${h.f((p.E + VG) * (p.R1 + p.R2) / p.R2, 'V')}</b>.`
      }
    },

    /* ---------- reverse breakdown ---------- */
    {
      id: 'c1', title: L3('État avec claquage', 'Estado con ruptura', 'State with breakdown'),
      params: { Vin: [3, 8, 12, 15, -5], R: [1 * k, 2.2 * k], Vbr: [5, 6.8, 10] },
      ok: (p) => far(p.Vin, p.Vbr), circuit: (p) => series(p, true),
      text: {
        fr: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, D1 montée comme sur le schéma, tension de claquage V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.fr(h)}<br><b>Dans quel état est D1 ?</b>`,
        es: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, D1 conectado como en el esquema, tensión de ruptura V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.es(h)}<br><b>¿En qué estado está D1?</b>`,
        en: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, D1 as drawn, breakdown voltage V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.en(h)}<br><b>What state is D1 in?</b>`
      },
      answer: { kind: 'choice', options: ST3, value: (p, s) => st3[d(s).state] },
      explain: {
        fr: (p, s, h) => p.Vin < 0 ? `Vin &lt; 0 : l’anode (en bas, à la masse) est plus haute que la cathode : D1 est <b>passante</b> en direct.` : `Vin > 0 met la cathode au potentiel le plus haut : polarisation inverse. Hypothèse bloquée : I = 0, la tension inverse vaut Vin = ${h.f(p.Vin, 'V')}.<br>${p.Vin > p.Vbr ? `Elle dépasse V<sub>BR</sub> = ${h.f(p.Vbr, 'V')} : D1 est <b>en claquage</b> (sa tension inverse reste à V<sub>BR</sub>, I = (Vin − V<sub>BR</sub>)/R = ${h.f(-d(s).i, 'A')}).` : `Elle reste sous V<sub>BR</sub> = ${h.f(p.Vbr, 'V')} : D1 est <b>bloquée</b>.`}`,
        es: (p, s, h) => p.Vin < 0 ? `Vin &lt; 0: el ánodo (abajo, a masa) está más alto que el cátodo: D1 <b>conduce</b> en directa.` : `Vin > 0 pone el cátodo al potencial más alto: polarización inversa. Hipótesis cortado: I = 0, la tensión inversa es Vin = ${h.f(p.Vin, 'V')}.<br>${p.Vin > p.Vbr ? `Supera V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}: D1 está <b>en ruptura</b> (su tensión inversa se queda en V<sub>BR</sub>, I = (Vin − V<sub>BR</sub>)/R = ${h.f(-d(s).i, 'A')}).` : `Queda por debajo de V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}: D1 está <b>cortado</b>.`}`,
        en: (p, s, h) => p.Vin < 0 ? `Vin &lt; 0: the anode (bottom, grounded) is higher than the cathode: D1 is <b>forward conducting</b>.` : `Vin > 0 puts the cathode at the higher potential: reverse bias. Assume off: I = 0, the reverse voltage is Vin = ${h.f(p.Vin, 'V')}.<br>${p.Vin > p.Vbr ? `It exceeds V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}: D1 is <b>in breakdown</b> (its reverse voltage stays at V<sub>BR</sub>, I = (Vin − V<sub>BR</sub>)/R = ${h.f(-d(s).i, 'A')}).` : `It stays below V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}: D1 is <b>off</b>.`}`
      }
    },
    {
      id: 'c2', title: L3('Courant en claquage', 'Corriente en ruptura', 'Breakdown current'),
      params: { Vin: [12, 15, 20], R: [470, 1 * k, 2.2 * k], Vbr: [5, 6.8, 10] },
      ok: (p) => p.Vin > p.Vbr + 1, circuit: (p) => series(p, true),
      text: {
        fr: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, D1 en inverse avec V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.fr(h)}<br><b>Quel courant traverse D1 ?</b> (valeur positive)`,
        es: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, D1 en inversa con V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.es(h)}<br><b>¿Qué corriente atraviesa D1?</b> (valor positivo)`,
        en: (p, h) => `Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, D1 reverse biased with V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.en(h)}<br><b>What current flows through D1?</b> (positive value)`
      },
      answer: { kind: 'num', unit: 'A', value: (p) => (p.Vin - p.Vbr) / p.R },
      explain: {
        fr: (p, s, h) => `Bloquée, D1 aurait ${h.f(p.Vin, 'V')} en inverse, plus que V<sub>BR</sub> : elle claque et sa tension inverse reste à V<sub>BR</sub>.<br>Loi des mailles : I = (Vin − V<sub>BR</sub>)/R = (${h.f(p.Vin, 'V')} − ${h.f(p.Vbr, 'V')}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vin - p.Vbr) / p.R, 'A')}</b>, de la cathode vers l’anode.`,
        es: (p, s, h) => `Cortado, D1 tendría ${h.f(p.Vin, 'V')} en inversa, más que V<sub>BR</sub>: entra en ruptura y su tensión inversa se queda en V<sub>BR</sub>.<br>LKT: I = (Vin − V<sub>BR</sub>)/R = (${h.f(p.Vin, 'V')} − ${h.f(p.Vbr, 'V')}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vin - p.Vbr) / p.R, 'A')}</b>, del cátodo al ánodo.`,
        en: (p, s, h) => `Off, D1 would hold ${h.f(p.Vin, 'V')} in reverse, more than V<sub>BR</sub>: it breaks down and its reverse voltage stays at V<sub>BR</sub>.<br>KVL: I = (Vin − V<sub>BR</sub>)/R = (${h.f(p.Vin, 'V')} − ${h.f(p.Vbr, 'V')}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vin - p.Vbr) / p.R, 'A')}</b>, from cathode to anode.`
      }
    },
    {
      id: 'c3', title: L3('Vin maximale sans claquage', 'Vin máxima sin ruptura', 'Largest Vin without breakdown'),
      params: { Vin: [1], R1: [1 * k, 2.2 * k], R2: [1 * k, 2.2 * k, 4.7 * k], Vbr: [5, 6.8, 10] },
      ok: (p) => p.Vbr * (p.R1 + p.R2) / p.R2 < 40, circuit: (p) => dividerReverse(p),
      text: {
        fr: (p, h) => `Pont diviseur R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')} ; D1 est en parallèle sur R2, cathode en haut, V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.fr(h)}<br><b>Quelle est la valeur maximale de Vin (positive) pour éviter le claquage ?</b>`,
        es: (p, h) => `Divisor R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}; D1 está en paralelo con R2, cátodo arriba, V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.es(h)}<br><b>¿Cuál es el valor máximo de Vin (positivo) para evitar la ruptura?</b>`,
        en: (p, h) => `Divider R1 = ${h.f(p.R1, 'Ω')}, R2 = ${h.f(p.R2, 'Ω')}; D1 is across R2, cathode up, V<sub>BR</sub> = ${h.f(p.Vbr, 'V')}. ${hyp.en(h)}<br><b>What is the largest (positive) Vin that avoids breakdown?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.Vbr * (p.R1 + p.R2) / p.R2 },
      reveal: {
        param: 'Vin', value: (p, want) => inside(want),
        note: noteSet('Vin', 'V', L3((p, s, h) => `juste en dessous de la limite, D1 est bloquée (tension inverse ${h.f(-d(s).v, 'V')}).`, (p, s, h) => `justo debajo del límite, D1 está cortado (tensión inversa ${h.f(-d(s).v, 'V')}).`, (p, s, h) => `just below the limit, D1 is off (reverse voltage ${h.f(-d(s).v, 'V')}).`))
      },
      explain: {
        fr: (p, s, h) => `Vin > 0 polarise D1 en inverse ; bloquée, elle ne prend aucun courant et sa tension inverse est celle de R<sub>2</sub> : Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>).<br>Pas de claquage tant que Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) &lt; V<sub>BR</sub>, soit Vin &lt; V<sub>BR</sub>·(R<sub>1</sub> + R<sub>2</sub>)/R<sub>2</sub> = ${h.f(p.Vbr, 'V')} × ${h.num((p.R1 + p.R2) / p.R2)} = <b>${h.f(p.Vbr * (p.R1 + p.R2) / p.R2, 'V')}</b>.<br>(Pour Vin &lt; 0 la diode conduit en direct : pas de claquage de ce côté.)`,
        es: (p, s, h) => `Vin > 0 polariza D1 en inversa; cortado, no toma corriente y su tensión inversa es la de R<sub>2</sub>: Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>).<br>No hay ruptura mientras Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) &lt; V<sub>BR</sub>, o sea Vin &lt; V<sub>BR</sub>·(R<sub>1</sub> + R<sub>2</sub>)/R<sub>2</sub> = ${h.f(p.Vbr, 'V')} × ${h.num((p.R1 + p.R2) / p.R2)} = <b>${h.f(p.Vbr * (p.R1 + p.R2) / p.R2, 'V')}</b>.<br>(Con Vin &lt; 0 el diodo conduce en directa: de ese lado no hay ruptura.)`,
        en: (p, s, h) => `Vin > 0 reverse biases D1; off, it takes no current and its reverse voltage is that of R<sub>2</sub>: Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>).<br>No breakdown while Vin·R<sub>2</sub>/(R<sub>1</sub> + R<sub>2</sub>) &lt; V<sub>BR</sub>, i.e. Vin &lt; V<sub>BR</sub>·(R<sub>1</sub> + R<sub>2</sub>)/R<sub>2</sub> = ${h.f(p.Vbr, 'V')} × ${h.num((p.R1 + p.R2) / p.R2)} = <b>${h.f(p.Vbr * (p.R1 + p.R2) / p.R2, 'V')}</b>.<br>(For Vin &lt; 0 the diode conducts forward: no breakdown on that side.)`
      }
    },

    /* ---------- LED ---------- */
    {
      id: 'l1', title: L3('Résistance d’une LED (20 mA)', 'Resistencia de un LED (20 mA)', 'LED resistor (20 mA)'),
      params: { Vcc: [5, 9, 12], color: ['red', 'green', 'yellow', 'blue'], R: [1 * k] }, circuit: (p) => led(p),
      text: {
        fr: (p, h) => `Une LED ${LEDN.fr[p.color]} (V<sub>F</sub> = ${h.f(LEDV[p.color], 'V')}) est alimentée par Vcc = ${h.f(p.Vcc, 'V')} à travers R.<br><b>Quelle valeur de R donne un courant de 20 mA dans la LED ?</b>`,
        es: (p, h) => `Un LED ${LEDN.es[p.color]} (V<sub>F</sub> = ${h.f(LEDV[p.color], 'V')}) se alimenta con Vcc = ${h.f(p.Vcc, 'V')} a través de R.<br><b>¿Qué valor de R da una corriente de 20 mA en el LED?</b>`,
        en: (p, h) => `A ${LEDN.en[p.color]} LED (V<sub>F</sub> = ${h.f(LEDV[p.color], 'V')}) is fed from Vcc = ${h.f(p.Vcc, 'V')} through R.<br><b>What value of R gives 20 mA in the LED?</b>`
      },
      answer: { kind: 'num', unit: 'Ω', value: (p) => (p.Vcc - LEDV[p.color]) / 0.02 },
      reveal: {
        param: 'R', value: (p, want) => Number(want.toPrecision(3)),
        note: L3((p, s, h) => `Dans le circuit, R est maintenant à ${h.f(p.R, 'Ω')} : la LED est traversée par ${h.f(d(s, 'LED1').i, 'A')}. En pratique on prend la valeur normalisée juste au-dessus (série E12).`, (p, s, h) => `En el circuito, R quedó ahora en ${h.f(p.R, 'Ω')}: por el LED circulan ${h.f(d(s, 'LED1').i, 'A')}. En la práctica se toma el valor normalizado inmediato superior (serie E12).`, (p, s, h) => `In the circuit, R is now ${h.f(p.R, 'Ω')}: the LED carries ${h.f(d(s, 'LED1').i, 'A')}. In practice the next standard value up is used (E12 series).`)
      },
      explain: {
        fr: (p, s, h) => `Loi des mailles : −Vcc + R·I + V<sub>F</sub> = 0, donc R = (Vcc − V<sub>F</sub>)/I = (${h.f(p.Vcc, 'V')} − ${h.f(LEDV[p.color], 'V')}) / 20 mA = <b>${h.f((p.Vcc - LEDV[p.color]) / 0.02, 'Ω')}</b>.`,
        es: (p, s, h) => `LKT: −Vcc + R·I + V<sub>F</sub> = 0, entonces R = (Vcc − V<sub>F</sub>)/I = (${h.f(p.Vcc, 'V')} − ${h.f(LEDV[p.color], 'V')}) / 20 mA = <b>${h.f((p.Vcc - LEDV[p.color]) / 0.02, 'Ω')}</b>.`,
        en: (p, s, h) => `KVL: −Vcc + R·I + V<sub>F</sub> = 0, so R = (Vcc − V<sub>F</sub>)/I = (${h.f(p.Vcc, 'V')} − ${h.f(LEDV[p.color], 'V')}) / 20 mA = <b>${h.f((p.Vcc - LEDV[p.color]) / 0.02, 'Ω')}</b>.`
      }
    },
    {
      id: 'l2', title: L3('Courant dans une LED', 'Corriente en un LED', 'LED current'),
      params: { Vcc: [5, 9, 12], color: ['red', 'green', 'yellow', 'blue'], R: [220, 330, 470, 1 * k] }, circuit: (p) => led(p),
      text: {
        fr: (p, h) => `Une LED ${LEDN.fr[p.color]} (V<sub>F</sub> = ${h.f(LEDV[p.color], 'V')}) est alimentée par Vcc = ${h.f(p.Vcc, 'V')} à travers R = ${h.f(p.R, 'Ω')}.<br><b>Calculez le courant dans la LED.</b>`,
        es: (p, h) => `Un LED ${LEDN.es[p.color]} (V<sub>F</sub> = ${h.f(LEDV[p.color], 'V')}) se alimenta con Vcc = ${h.f(p.Vcc, 'V')} a través de R = ${h.f(p.R, 'Ω')}.<br><b>Calcule la corriente en el LED.</b>`,
        en: (p, h) => `A ${LEDN.en[p.color]} LED (V<sub>F</sub> = ${h.f(LEDV[p.color], 'V')}) is fed from Vcc = ${h.f(p.Vcc, 'V')} through R = ${h.f(p.R, 'Ω')}.<br><b>Find the LED current.</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p) => (p.Vcc - LEDV[p.color]) / p.R },
      explain: {
        fr: (p, s, h) => `I = (Vcc − V<sub>F</sub>)/R = (${h.f(p.Vcc, 'V')} − ${h.f(LEDV[p.color], 'V')}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vcc - LEDV[p.color]) / p.R, 'A')}</b>.`,
        es: (p, s, h) => `I = (Vcc − V<sub>F</sub>)/R = (${h.f(p.Vcc, 'V')} − ${h.f(LEDV[p.color], 'V')}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vcc - LEDV[p.color]) / p.R, 'A')}</b>.`,
        en: (p, s, h) => `I = (Vcc − V<sub>F</sub>)/R = (${h.f(p.Vcc, 'V')} − ${h.f(LEDV[p.color], 'V')}) / ${h.f(p.R, 'Ω')} = <b>${h.f((p.Vcc - LEDV[p.color]) / p.R, 'A')}</b>.`
      }
    },

    /* ---------- Zener regulator ---------- */
    {
      id: 'z1', title: L3('Régulateur Zener : sortie', 'Regulador Zener: salida', 'Zener regulator: output'),
      params: { Vin: [9, 12, 15], R: [220, 470, 1 * k], RL: [1 * k, 2.2 * k, 4.7 * k], Vz: [3.3, 5.1, 6.2] },
      ok: (p, s) => d(s, 'DZ1').state === 'bd' && (p.Vin - p.Vz) / p.R - p.Vz / p.RL > 0.5e-3, circuit: (p) => zener(p),
      text: {
        fr: (p, h) => `Régulateur : Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diode Zener V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, charge RL = ${h.f(p.RL, 'Ω')}.<br><b>Calculez la tension de sortie Vs.</b>`,
        es: (p, h) => `Regulador: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, diodo Zener V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, carga RL = ${h.f(p.RL, 'Ω')}.<br><b>Calcule la tensión de salida Vs.</b>`,
        en: (p, h) => `Regulator: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, Zener diode V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, load RL = ${h.f(p.RL, 'Ω')}.<br><b>Find the output voltage Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.Vz },
      explain: {
        fr: (p, s, h) => `Hypothèse Zener bloquée : Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = ${h.f(p.Vin * p.RL / (p.R + p.RL), 'V')} > V<sub>Z</sub> : impossible, la Zener est en zone Zener et fixe <b>Vs = V<sub>Z</sub> = ${h.f(p.Vz, 'V')}</b>.`,
        es: (p, s, h) => `Hipótesis Zener cortado: Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = ${h.f(p.Vin * p.RL / (p.R + p.RL), 'V')} > V<sub>Z</sub>: imposible, el Zener está en zona Zener y fija <b>Vs = V<sub>Z</sub> = ${h.f(p.Vz, 'V')}</b>.`,
        en: (p, s, h) => `Assume the Zener off: Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = ${h.f(p.Vin * p.RL / (p.R + p.RL), 'V')} > V<sub>Z</sub>: impossible, the Zener is in its Zener region and holds <b>Vs = V<sub>Z</sub> = ${h.f(p.Vz, 'V')}</b>.`
      }
    },
    {
      id: 'z2', title: L3('Courant dans la Zener', 'Corriente en el Zener', 'Zener current'),
      params: { Vin: [9, 12, 15], R: [220, 470, 1 * k], RL: [1 * k, 2.2 * k, 4.7 * k], Vz: [3.3, 5.1, 6.2] },
      ok: (p, s) => d(s, 'DZ1').state === 'bd' && (p.Vin - p.Vz) / p.R - p.Vz / p.RL > 0.5e-3, circuit: (p) => zener(p),
      text: {
        fr: (p, h) => `Régulateur : Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>Quel courant traverse la diode Zener ?</b>`,
        es: (p, h) => `Regulador: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>¿Qué corriente atraviesa el diodo Zener?</b>`,
        en: (p, h) => `Regulator: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>What current flows through the Zener diode?</b>`
      },
      answer: { kind: 'num', unit: 'A', value: (p) => (p.Vin - p.Vz) / p.R - p.Vz / p.RL },
      explain: {
        fr: (p, s, h) => { const ir = (p.Vin - p.Vz) / p.R, il = p.Vz / p.RL; return `En zone Zener, Vs = V<sub>Z</sub> = ${h.f(p.Vz, 'V')}.<br>I<sub>R</sub> = (Vin − V<sub>Z</sub>)/R = ${h.f(ir, 'A')} ; I<sub>L</sub> = V<sub>Z</sub>/R<sub>L</sub> = ${h.f(il, 'A')}.<br>Loi des nœuds en Vs : I<sub>Z</sub> = I<sub>R</sub> − I<sub>L</sub> = <b>${h.f(ir - il, 'A')}</b>.`; },
        es: (p, s, h) => { const ir = (p.Vin - p.Vz) / p.R, il = p.Vz / p.RL; return `En zona Zener, Vs = V<sub>Z</sub> = ${h.f(p.Vz, 'V')}.<br>I<sub>R</sub> = (Vin − V<sub>Z</sub>)/R = ${h.f(ir, 'A')}; I<sub>L</sub> = V<sub>Z</sub>/R<sub>L</sub> = ${h.f(il, 'A')}.<br>LKC en Vs: I<sub>Z</sub> = I<sub>R</sub> − I<sub>L</sub> = <b>${h.f(ir - il, 'A')}</b>.`; },
        en: (p, s, h) => { const ir = (p.Vin - p.Vz) / p.R, il = p.Vz / p.RL; return `In the Zener region, Vs = V<sub>Z</sub> = ${h.f(p.Vz, 'V')}.<br>I<sub>R</sub> = (Vin − V<sub>Z</sub>)/R = ${h.f(ir, 'A')}; I<sub>L</sub> = V<sub>Z</sub>/R<sub>L</sub> = ${h.f(il, 'A')}.<br>KCL at Vs: I<sub>Z</sub> = I<sub>R</sub> − I<sub>L</sub> = <b>${h.f(ir - il, 'A')}</b>.`; }
      }
    },
    {
      id: 'z3', title: L3('Tension minimale en zone Zener', 'Tensión mínima en zona Zener', 'Minimum voltage in the Zener region'),
      params: { Vin: [12], R: [220, 470, 1 * k], RL: [1 * k, 2.2 * k, 4.7 * k], Vz: [3.3, 5.1, 6.2] },
      ok: (p) => p.Vz * (1 + p.R / p.RL) < 25, circuit: (p) => zener(p),
      text: {
        fr: (p, h) => `Régulateur : R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}. Vin peut varier.<br><b>Quelle est la tension Vin minimale pour que la diode reste dans la zone Zener ?</b>`,
        es: (p, h) => `Regulador: R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}. Vin puede variar.<br><b>¿Cuál es la tensión Vin mínima para que el diodo siga en la zona Zener?</b>`,
        en: (p, h) => `Regulator: R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}. Vin can vary.<br><b>What is the lowest Vin that keeps the diode in the Zener region?</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.Vz * (1 + p.R / p.RL) },
      reveal: {
        param: 'Vin', value: (p, want) => past(want),
        note: noteSet('Vin', 'V', L3((p, s, h) => `juste au-dessus de la limite, la Zener conduit à peine (I<sub>Z</sub> = ${h.f(-d(s, 'DZ1').i, 'A')}) et Vs = V<sub>Z</sub>.`, (p, s, h) => `justo por encima del límite, el Zener apenas conduce (I<sub>Z</sub> = ${h.f(-d(s, 'DZ1').i, 'A')}) y Vs = V<sub>Z</sub>.`, (p, s, h) => `just above the limit, the Zener barely conducts (I<sub>Z</sub> = ${h.f(-d(s, 'DZ1').i, 'A')}) and Vs = V<sub>Z</sub>.`))
      },
      explain: {
        fr: (p, s, h) => `La Zener reste en zone Zener tant que I<sub>Z</sub> ≥ 0. À la limite I<sub>Z</sub> = 0 : R et R<sub>L</sub> forment un diviseur avec Vs = V<sub>Z</sub>, soit Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = V<sub>Z</sub>.<br>Vin<sub>min</sub> = V<sub>Z</sub>·(1 + R/R<sub>L</sub>) = ${h.f(p.Vz, 'V')} × ${h.num(1 + p.R / p.RL)} = <b>${h.f(p.Vz * (1 + p.R / p.RL), 'V')}</b>.<br>En dessous, la Zener se bloque et Vs suit le diviseur (plus de régulation).`,
        es: (p, s, h) => `El Zener sigue en zona Zener mientras I<sub>Z</sub> ≥ 0. En el límite I<sub>Z</sub> = 0: R y R<sub>L</sub> forman un divisor con Vs = V<sub>Z</sub>, o sea Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = V<sub>Z</sub>.<br>Vin<sub>mín</sub> = V<sub>Z</sub>·(1 + R/R<sub>L</sub>) = ${h.f(p.Vz, 'V')} × ${h.num(1 + p.R / p.RL)} = <b>${h.f(p.Vz * (1 + p.R / p.RL), 'V')}</b>.<br>Por debajo, el Zener se corta y Vs sigue al divisor (ya no regula).`,
        en: (p, s, h) => `The Zener stays in its Zener region while I<sub>Z</sub> ≥ 0. At the limit I<sub>Z</sub> = 0: R and R<sub>L</sub> are a divider with Vs = V<sub>Z</sub>, i.e. Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = V<sub>Z</sub>.<br>Vin<sub>min</sub> = V<sub>Z</sub>·(1 + R/R<sub>L</sub>) = ${h.f(p.Vz, 'V')} × ${h.num(1 + p.R / p.RL)} = <b>${h.f(p.Vz * (1 + p.R / p.RL), 'V')}</b>.<br>Below it, the Zener turns off and Vs follows the divider (no more regulation).`
      }
    },
    {
      id: 'z4', title: L3('État de la Zener', 'Estado del Zener', 'State of the Zener'),
      params: { Vin: [3, 5, 9, 12, -5], R: [470, 1 * k], RL: [1 * k, 2.2 * k], Vz: [5.1, 6.2] },
      ok: (p) => far(p.Vin * p.RL / (p.R + p.RL), p.Vz), circuit: (p) => zener(p),
      text: {
        fr: (p, h) => `Régulateur : Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>Dans quel état est la diode Zener ?</b>`,
        es: (p, h) => `Regulador: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>¿En qué estado está el diodo Zener?</b>`,
        en: (p, h) => `Regulator: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>What state is the Zener diode in?</b>`
      },
      answer: { kind: 'choice', options: ZST, value: (p, s) => zst[d(s, 'DZ1').state] },
      explain: {
        fr: (p, s, h) => { const vd = p.Vin * p.RL / (p.R + p.RL); return `Hypothèse bloquée : Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = ${h.f(vd, 'V')}.<br>${vd > p.Vz ? `> V<sub>Z</sub> = ${h.f(p.Vz, 'V')} : contradiction, elle est en <b>zone Zener</b> (Vs = V<sub>Z</sub>).` : vd < -VG ? `Vs &lt; −V<sub>γ</sub> : la Zener est <b>passante en direct</b> (Vs = −${vg(h)}).` : `Entre −V<sub>γ</sub> et V<sub>Z</sub> : hypothèse vérifiée, elle est <b>bloquée</b> (pas de régulation, Vs = ${h.f(vd, 'V')}).`}`; },
        es: (p, s, h) => { const vd = p.Vin * p.RL / (p.R + p.RL); return `Hipótesis cortado: Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = ${h.f(vd, 'V')}.<br>${vd > p.Vz ? `> V<sub>Z</sub> = ${h.f(p.Vz, 'V')}: contradicción, está en <b>zona Zener</b> (Vs = V<sub>Z</sub>).` : vd < -VG ? `Vs &lt; −V<sub>γ</sub>: el Zener <b>conduce en directa</b> (Vs = −${vg(h)}).` : `Entre −V<sub>γ</sub> y V<sub>Z</sub>: hipótesis verificada, está <b>cortado</b> (no regula, Vs = ${h.f(vd, 'V')}).`}`; },
        en: (p, s, h) => { const vd = p.Vin * p.RL / (p.R + p.RL); return `Assume off: Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = ${h.f(vd, 'V')}.<br>${vd > p.Vz ? `> V<sub>Z</sub> = ${h.f(p.Vz, 'V')}: contradiction, it is in the <b>Zener region</b> (Vs = V<sub>Z</sub>).` : vd < -VG ? `Vs &lt; −V<sub>γ</sub>: the Zener is <b>forward conducting</b> (Vs = −${vg(h)}).` : `Between −V<sub>γ</sub> and V<sub>Z</sub>: the assumption holds, it is <b>off</b> (no regulation, Vs = ${h.f(vd, 'V')}).`}`; }
      }
    },
    {
      id: 'z5', title: L3('Sortie hors zone Zener', 'Salida fuera de la zona Zener', 'Output outside the Zener region'),
      params: { Vin: [3, 5, 6, 8], R: [470, 1 * k], RL: [470, 1 * k, 2.2 * k], Vz: [5.1, 6.2] },
      ok: (p) => p.Vin * p.RL / (p.R + p.RL) < p.Vz - 0.3, circuit: (p) => zener(p),
      text: {
        fr: (p, h) => `Régulateur : Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>Calculez Vs.</b>`,
        es: (p, h) => `Regulador: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>Calcule Vs.</b>`,
        en: (p, h) => `Regulator: Vin = ${h.f(p.Vin, 'V')}, R = ${h.f(p.R, 'Ω')}, V<sub>Z</sub> = ${h.f(p.Vz, 'V')}, RL = ${h.f(p.RL, 'Ω')}.<br><b>Find Vs.</b>`
      },
      answer: { kind: 'num', unit: 'V', value: (p) => p.Vin * p.RL / (p.R + p.RL) },
      explain: {
        fr: (p, s, h) => `Hypothèse bloquée : I<sub>Z</sub> = 0, R et R<sub>L</sub> forment un diviseur : Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = <b>${h.f(p.Vin * p.RL / (p.R + p.RL), 'V')}</b>, inférieure à V<sub>Z</sub> : l’hypothèse est vérifiée. Vin est trop faible, la Zener ne régule pas.`,
        es: (p, s, h) => `Hipótesis cortado: I<sub>Z</sub> = 0, R y R<sub>L</sub> forman un divisor: Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = <b>${h.f(p.Vin * p.RL / (p.R + p.RL), 'V')}</b>, menor que V<sub>Z</sub>: la hipótesis se verifica. Vin es demasiado baja, el Zener no regula.`,
        en: (p, s, h) => `Assume off: I<sub>Z</sub> = 0, R and R<sub>L</sub> are a divider: Vs = Vin·R<sub>L</sub>/(R + R<sub>L</sub>) = <b>${h.f(p.Vin * p.RL / (p.R + p.RL), 'V')}</b>, below V<sub>Z</sub>: the assumption holds. Vin is too low, the Zener does not regulate.`
      }
    }
  ];

  DCS.quiz.register({
    id: 'diodes',
    title: { fr: 'Diodes en continu', es: 'Diodos en continua', en: 'Diodes in DC' },
    short: { fr: 'Diodes', es: 'Diodos', en: 'Diodes' },
    desc: {
      fr: 'États, seuils, claquage, LED, régulateur Zener.',
      es: 'Estados, umbrales, ruptura, LED, regulador Zener.',
      en: 'States, thresholds, breakdown, LED, Zener regulator.'
    },
    questions
  });
})(window);
