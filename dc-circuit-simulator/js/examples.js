/* Example circuits.  Coordinates are grid units; see components.js for the terminal positions. */
(function (root) {
  'use strict';
  const DCS = root.DCS;

  function make(spec) {
    let k = 0;
    const comps = spec.c.map(([type, name, x, y, rot, props, flip]) => ({
      id: 'c' + (++k), type, name: name || '', x, y, rot: rot || 0, flip: !!flip,
      props: Object.assign(DCS.comp.defaults(type), props || {})
    }));
    const wires = [];
    for (const path of spec.w) for (let i = 0; i + 1 < path.length; i++) {
      wires.push({ id: 'w' + (++k), x1: path[i][0], y1: path[i][1], x2: path[i + 1][0], y2: path[i + 1][1] });
    }
    const out = { comps, wires };
    if (spec.load) out.thevLoad = comps.find(c => c.name === spec.load).id;
    return out;
  }

  const L = {
    divider: {
      t: { en: 'Voltage divider with meters', fr: 'Diviseur de tension avec appareils de mesure', es: 'Divisor de tensión con instrumentos' },
      d: { en: 'Series circuit: the ammeter is in series, the voltmeter in parallel.', fr: 'Circuit série : l’ampèremètre est en série, le voltmètre en parallèle.', es: 'Circuito serie: el amperímetro va en serie, el voltímetro en paralelo.' },
      s: {
        c: [['vsource', 'V1', 0, 4, 1, { V: 12 }], ['ammeter', 'AM1', 4, 0, 0], ['resistor', 'R1', 10, 0, 0, { R: 1000 }],
          ['resistor', 'R2', 14, 4, 1, { R: 2000 }], ['voltmeter', 'VM1', 18, 4, 1], ['ground', '', 8, 8, 0]],
        w: [[[0, 2], [0, 0], [2, 0]], [[6, 0], [8, 0]], [[12, 0], [14, 0], [14, 2]], [[14, 0], [18, 0], [18, 2]],
          [[0, 6], [0, 8], [18, 8], [18, 6]], [[14, 6], [14, 8]]]
      }
    },
    mesh: {
      t: { en: 'Two sources, three resistors', fr: 'Deux sources, trois résistances', es: 'Dos fuentes, tres resistencias' },
      d: { en: 'Classic exercise for nodal / mesh analysis and superposition. Turn on P to see which source delivers power.', fr: 'Exercice classique d’analyse nodale / par mailles et de superposition. Activez P pour voir quelle source fournit de la puissance.', es: 'Ejercicio clásico de análisis nodal / de mallas y superposición. Active P para ver qué fuente entrega potencia.' },
      s: {
        c: [['vsource', 'V1', 0, 4, 1, { V: 10 }], ['resistor', 'R1', 4, 0, 0, { R: 1000 }], ['resistor', 'R3', 8, 4, 1, { R: 3000 }],
          ['resistor', 'R2', 12, 0, 0, { R: 2000 }], ['vsource', 'V2', 16, 4, 1, { V: 5 }], ['ground', '', 4, 8, 0]],
        w: [[[0, 2], [0, 0], [2, 0]], [[6, 0], [10, 0]], [[8, 0], [8, 2]], [[14, 0], [16, 0], [16, 2]],
          [[0, 6], [0, 8], [16, 8], [16, 6]], [[8, 6], [8, 8]]]
      },
      show: { p: true }
    },
    bridge: {
      t: { en: 'Wheatstone bridge', fr: 'Pont de Wheatstone', es: 'Puente de Wheatstone' },
      d: { en: 'Unbalanced bridge: the ammeter reads the current across it. Try R4 = 1 kΩ to balance it. Thévenin seen by the ammeter is already computed.', fr: 'Pont déséquilibré : l’ampèremètre mesure le courant qui le traverse. Essayez R4 = 1 kΩ pour l’équilibrer. Le Thévenin vu par l’ampèremètre est déjà calculé.', es: 'Puente desequilibrado: el amperímetro mide la corriente que lo atraviesa. Pruebe R4 = 1 kΩ para equilibrarlo. El Thévenin visto por el amperímetro ya está calculado.' },
      s: {
        c: [['vsource', 'V1', 0, 6, 1, { V: 10 }], ['resistor', 'R1', 6, 4, 1, { R: 1000 }], ['resistor', 'R2', 6, 10, 1, { R: 1000 }],
          ['resistor', 'R3', 16, 4, 1, { R: 1000 }], ['resistor', 'R4', 16, 10, 1, { R: 1500 }], ['ammeter', 'AM1', 11, 7, 0], ['ground', '', 3, 14, 0]],
        w: [[[0, 4], [0, 0], [16, 0], [16, 2]], [[6, 0], [6, 2]], [[6, 6], [6, 8]], [[16, 6], [16, 8]],
          [[0, 8], [0, 14], [16, 14], [16, 12]], [[6, 12], [6, 14]], [[6, 7], [9, 7]], [[13, 7], [16, 7]]],
        load: 'AM1'
      }
    },
    thevenin: {
      t: { en: 'Thévenin equivalent of a network', fr: 'Équivalent de Thévenin d’un réseau', es: 'Equivalente de Thévenin de una red' },
      d: { en: 'Thévenin and Norton equivalents seen by the load RL (V and I sources, resistors). Check: VTh = 11.6 V, RTh = 4.4 kΩ.', fr: 'Équivalents de Thévenin et de Norton vus par la charge RL (sources V et I, résistances). Vérification : ETh = 11,6 V, RTh = 4,4 kΩ.', es: 'Equivalentes de Thévenin y Norton vistos por la carga RL (fuentes V e I, resistencias). Verificación: VTh = 11,6 V, RTh = 4,4 kΩ.' },
      s: {
        c: [['vsource', 'V1', 0, 5, 1, { V: 12 }], ['resistor', 'R1', 4, 1, 0, { R: 4000 }], ['resistor', 'R2', 9, 5, 1, { R: 6000 }],
          ['resistor', 'R3', 14, 1, 0, { R: 2000 }], ['isource', 'I1', 19, 5, 3, { I: 1e-3 }], ['resistor', 'RL', 26, 5, 1, { R: 3000 }], ['ground', '', 4, 9, 0]],
        w: [[[0, 3], [0, 1], [2, 1]], [[6, 1], [12, 1]], [[9, 1], [9, 3]], [[16, 1], [26, 1], [26, 3]], [[19, 1], [19, 3]],
          [[0, 7], [0, 9], [26, 9], [26, 7]], [[9, 7], [9, 9]], [[19, 7], [19, 9]]],
        load: 'RL'
      }
    },
    diodes: {
      t: { en: 'Diode models compared', fr: 'Comparaison des modèles de diode', es: 'Comparación de modelos de diodo' },
      d: { en: 'Same source and resistor with an ideal diode, the 0.7 V model, the exact Shockley model and a Schottky diode.', fr: 'Même source et même résistance avec une diode idéale, le modèle 0,7 V, le modèle exact de Shockley et une diode Schottky.', es: 'Misma fuente y misma resistencia con un diodo ideal, el modelo de 0,7 V, el modelo exacto de Shockley y un diodo Schottky.' },
      s: {
        c: [['vsource', 'V1', 0, 6, 1, { V: 5 }],
          ['diode', 'D1', 8, 3, 1, { model: 'ideal' }], ['resistor', 'R1', 8, 8, 1, { R: 1000 }],
          ['diode', 'D2', 16, 3, 1, { model: 'cvd' }], ['resistor', 'R2', 16, 8, 1, { R: 1000 }],
          ['diode', 'D3', 24, 3, 1, { model: 'exact' }], ['resistor', 'R3', 24, 8, 1, { R: 1000 }],
          ['schottky', 'D4', 32, 3, 1, { model: 'exact' }], ['resistor', 'R4', 32, 8, 1, { R: 1000 }], ['ground', '', 3, 12, 0]],
        w: [[[0, 4], [0, 0], [32, 0], [32, 1]], [[8, 0], [8, 1]], [[16, 0], [16, 1]], [[24, 0], [24, 1]],
          [[8, 5], [8, 6]], [[16, 5], [16, 6]], [[24, 5], [24, 6]], [[32, 5], [32, 6]],
          [[0, 8], [0, 12], [32, 12], [32, 10]], [[8, 10], [8, 12]], [[16, 10], [16, 12]], [[24, 10], [24, 12]]]
      }
    },
    diodeor: {
      t: { en: 'Diode OR gate', fr: 'Porte OU à diodes', es: 'Compuerta OR con diodos' },
      d: { en: 'The highest input wins: one diode conducts, the other is reverse biased. Change V2 above V1.', fr: 'L’entrée la plus haute l’emporte : une diode conduit, l’autre est bloquée. Mettez V2 au-dessus de V1.', es: 'Gana la entrada más alta: un diodo conduce y el otro queda en inversa. Ponga V2 por encima de V1.' },
      s: {
        c: [['vsource', 'V1', 0, 6, 1, { V: 5 }], ['vsource', 'V2', 6, 8, 1, { V: 2 }], ['diode', 'D1', 4, 0, 0], ['diode', 'D2', 10, 4, 0],
          ['resistor', 'R1', 14, 6, 1, { R: 10000 }], ['ground', '', 0, 8, 0], ['ground', '', 6, 10, 0], ['ground', '', 14, 8, 0]],
        w: [[[0, 4], [0, 0], [2, 0]], [[6, 0], [14, 0], [14, 4]], [[6, 6], [6, 4], [8, 4]], [[12, 4], [14, 4]]]
      }
    },
    leds: {
      t: { en: 'LEDs and an RGB LED', fr: 'LED et LED RVB', es: 'LEDs y un LED RGB' },
      d: { en: 'Each LED needs a series resistor: I = (V − Vγ)/R. LED4 has too small a resistor (warning). The RGB LED mixes its three colours according to the channel currents: change RR, RG, RB.', fr: 'Chaque LED a besoin d’une résistance série : I = (V − Vγ)/R. LED4 a une résistance trop faible (avertissement). La LED RVB mélange ses trois couleurs selon les courants : changez RR, RG, RB.', es: 'Cada LED necesita una resistencia en serie: I = (V − Vγ)/R. LED4 tiene una resistencia demasiado chica (aviso). El LED RGB mezcla sus tres colores según las corrientes de cada canal: cambie RR, RG, RB.' },
      s: {
        c: [['vsource', 'V1', 0, 5, 1, { V: 5 }],
          ['resistor', 'R1', 6, 3, 1, { R: 220 }], ['led', 'LED1', 6, 8, 1, { color: 'red', Vf: 1.8 }],
          ['resistor', 'R2', 13, 3, 1, { R: 220 }], ['led', 'LED2', 13, 8, 1, { color: 'green', Vf: 2.2 }],
          ['resistor', 'R3', 20, 3, 1, { R: 150 }], ['led', 'LED3', 20, 8, 1, { color: 'blue', Vf: 3.0 }],
          ['resistor', 'R4', 27, 3, 1, { R: 47 }], ['led', 'LED4', 27, 8, 1, { color: 'yellow', Vf: 2.1 }],
          ['resistor', 'RR', 36, 2, 0, { R: 330 }], ['resistor', 'RG', 36, 8, 0, { R: 1000 }], ['resistor', 'RB', 36, 14, 0, { R: 470 }],
          ['rgbled', 'LED5', 46, 8, 0], ['ground', '', 3, 16, 0]],
        w: [[[0, 3], [0, 0], [34, 0], [34, 14]], [[6, 0], [6, 1]], [[13, 0], [13, 1]], [[20, 0], [20, 1]], [[27, 0], [27, 1]],
          [[6, 5], [6, 6]], [[13, 5], [13, 6]], [[20, 5], [20, 6]], [[27, 5], [27, 6]],
          [[38, 2], [41, 2], [41, 6], [43, 6]], [[38, 8], [43, 8]], [[38, 14], [41, 14], [41, 10], [43, 10]],
          [[0, 7], [0, 16], [49, 16], [49, 8]], [[6, 10], [6, 16]], [[13, 10], [13, 16]], [[20, 10], [20, 16]], [[27, 10], [27, 16]]]
      }
    },
    inverting: {
      t: { en: 'Inverting amplifier', fr: 'Amplificateur inverseur', es: 'Amplificador inversor' },
      d: { en: 'Gain −R2/R1 = −10. The − input is a virtual ground. Raise Vin above 1.5 V to see the saturation.', fr: 'Gain −R2/R1 = −10. L’entrée − est une masse virtuelle. Dépassez 1,5 V en entrée pour voir la saturation.', es: 'Ganancia −R2/R1 = −10. La entrada − es una masa virtual. Suba Vin por encima de 1,5 V para ver la saturación.' },
      s: {
        c: [['vsource', 'Vin', 0, 5, 1, { V: 1 }], ['resistor', 'R1', 4, 3, 0, { R: 1000 }], ['resistor', 'R2', 10, 0, 0, { R: 10000 }],
          ['opamp', 'U1', 10, 4, 0], ['resistor', 'RL', 16, 7, 1, { R: 2000 }],
          ['ground', '', 0, 7, 0], ['ground', '', 7, 7, 0], ['ground', '', 16, 9, 0]],
        w: [[[0, 3], [2, 3]], [[6, 3], [7, 3]], [[6, 3], [6, 0], [8, 0]], [[12, 0], [14, 0], [14, 4]], [[13, 4], [16, 4], [16, 5]], [[7, 5], [7, 7]]]
      }
    },
    noninverting: {
      t: { en: 'Non-inverting amplifier', fr: 'Amplificateur non inverseur', es: 'Amplificador no inversor' },
      d: { en: 'Gain 1 + Rf/Rg = 11. The op-amp supplies the load current. Try Rg = 0.5 kΩ: the output saturates at +15 V.', fr: 'Gain 1 + Rf/Rg = 11. L’AOP fournit le courant de la charge. Essayez Rg = 0,5 kΩ : la sortie sature à +15 V.', es: 'Ganancia 1 + Rf/Rg = 11. El AO entrega la corriente de la carga. Pruebe Rg = 0,5 kΩ: la salida satura en +15 V.' },
      s: {
        c: [['vsource', 'Vin', 0, 5, 1, { V: 1 }], ['opamp', 'U1', 10, 4, 0, null, true], ['resistor', 'Rf', 10, 8, 0, { R: 10000 }],
          ['resistor', 'Rg', 7, 11, 1, { R: 1000 }], ['resistor', 'RL', 16, 7, 1, { R: 1000 }],
          ['ground', '', 0, 7, 0], ['ground', '', 7, 13, 0], ['ground', '', 16, 9, 0]],
        w: [[[0, 3], [7, 3]], [[7, 5], [7, 9]], [[7, 8], [8, 8]], [[12, 8], [14, 8], [14, 4]], [[13, 4], [16, 4], [16, 5]]]
      }
    },
    schmitt: {
      t: { en: 'Schmitt trigger (hysteresis)', fr: 'Trigger de Schmitt (hystérésis)', es: 'Disparador de Schmitt (histéresis)' },
      d: { en: 'Positive feedback: the output sits at +15 V or −15 V and remembers its state. Thresholds ±7.5 V: move Vin to 8 V, then back to 2 V, then to −8 V.', fr: 'Réaction positive : la sortie est à +15 V ou −15 V et garde son état. Seuils ±7,5 V : passez Vin à 8 V, revenez à 2 V, puis allez à −8 V.', es: 'Realimentación positiva: la salida queda en +15 V o −15 V y recuerda su estado. Umbrales ±7,5 V: lleve Vin a 8 V, vuelva a 2 V y luego a −8 V.' },
      s: {
        c: [['vsource', 'Vin', 0, 5, 1, { V: 2 }], ['opamp', 'U1', 10, 4, 0], ['resistor', 'R1', 10, 9, 0, { R: 10000 }],
          ['resistor', 'R2', 7, 12, 1, { R: 10000 }], ['ground', '', 0, 7, 0], ['ground', '', 7, 14, 0]],
        w: [[[0, 3], [7, 3]], [[7, 5], [7, 10]], [[7, 9], [8, 9]], [[12, 9], [14, 9], [14, 4], [13, 4]], [[14, 4], [17, 4]]]
      }
    },
    cebias: {
      t: { en: 'Transistor: voltage-divider bias', fr: 'Transistor : polarisation par pont diviseur', es: 'Transistor: polarización por divisor' },
      d: { en: 'Common-emitter bias point (Q point). Change β: IC barely moves thanks to RE.', fr: 'Point de repos d’un émetteur commun. Changez β : IC bouge à peine grâce à RE.', es: 'Punto de reposo (punto Q) de un emisor común. Cambie β: IC casi no se mueve gracias a RE.' },
      s: {
        c: [['vsource', 'VCC', 0, 8, 1, { V: 12 }], ['resistor', 'R1', 6, 3, 1, { R: 47000 }], ['resistor', 'R2', 6, 9, 1, { R: 10000 }],
          ['resistor', 'RC', 11, 2, 1, { R: 2200 }], ['resistor', 'RE', 11, 10, 1, { R: 1000 }], ['bjt', 'Q1', 10, 6, 0], ['ground', '', 3, 14, 0]],
        w: [[[0, 6], [0, 0], [11, 0]], [[6, 0], [6, 1]], [[6, 5], [6, 7]], [[6, 6], [8, 6]],
          [[0, 10], [0, 14], [11, 14], [11, 12]], [[6, 11], [6, 14]]]
      }
    },
    bjtswitch: {
      t: { en: 'Transistor as a switch', fr: 'Transistor en commutation', es: 'Transistor como llave' },
      d: { en: 'With Vin = 5 V the transistor saturates (VCE = 0.2 V); with Vin = 0.5 V it is cut off.', fr: 'Avec Vin = 5 V le transistor est saturé (VCE = 0,2 V) ; avec Vin = 0,5 V il est bloqué.', es: 'Con Vin = 5 V el transistor satura (VCE = 0,2 V); con Vin = 0,5 V queda al corte.' },
      s: {
        c: [['vsource', 'Vin', 0, 9, 1, { V: 5 }], ['resistor', 'RB', 4, 6, 0, { R: 10000 }], ['bjt', 'Q1', 10, 6, 0],
          ['resistor', 'RC', 11, 2, 1, { R: 470 }], ['vsource', 'VCC', 16, 6, 1, { V: 5 }],
          ['ground', '', 0, 11, 0], ['ground', '', 11, 8, 0], ['ground', '', 16, 8, 0]],
        w: [[[0, 7], [0, 6], [2, 6]], [[6, 6], [8, 6]], [[11, 0], [16, 0], [16, 4]]]
      }
    },
    pnp: {
      t: { en: 'PNP current source', fr: 'Source de courant à PNP', es: 'Fuente de corriente con PNP' },
      d: { en: 'The PNP transistor keeps the load current almost constant: change RL between 100 Ω and 4 kΩ.', fr: 'Le transistor PNP maintient le courant de charge presque constant : faites varier RL entre 100 Ω et 4 kΩ.', es: 'El transistor PNP mantiene casi constante la corriente de carga: varíe RL entre 100 Ω y 4 kΩ.' },
      s: {
        c: [['vsource', 'VCC', 0, 6, 1, { V: 12 }], ['resistor', 'RE', 11, 3, 1, { R: 2000 }], ['bjt', 'Q1', 10, 7, 0, { pol: 'pnp' }, true],
          ['resistor', 'R1', 6, 3, 1, { R: 10000 }], ['resistor', 'R2', 6, 10, 1, { R: 22000 }],
          ['resistor', 'RL', 11, 11, 1, { R: 1000 }], ['ground', '', 3, 14, 0]],
        w: [[[0, 4], [0, 0], [11, 0], [11, 1]], [[6, 0], [6, 1]], [[6, 5], [6, 8]], [[6, 7], [8, 7]],
          [[0, 8], [0, 14], [11, 14], [11, 13]], [[6, 12], [6, 14]]]
      }
    }
  };

  function list(lang) {
    return Object.keys(L).map(k => ({ key: k, title: L[k].t[lang] || L[k].t.en, desc: L[k].d[lang] || L[k].d.en }));
  }
  function get(key) {
    const e = L[key];
    if (!e) return null;
    const c = make(e.s);
    c.show = e.show || null;
    return c;
  }
  DCS.examples = { list, get, keys: Object.keys(L) };
})(window);
