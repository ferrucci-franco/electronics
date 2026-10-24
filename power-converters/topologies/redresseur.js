(() => {
  "use strict";

  const text = (en, fr, es) => Object.freeze({ en, fr, es });
  // Typographie française : les chaînes sont tapées avec des espaces ordinaires avant
  // « : ; ! ? » et dans les guillemets ; on les rend insécables à l'affichage (espace fine
  // devant la ponctuation haute), comme babel-french le fait dans le polycopié.
  const frenchSpacing = (value) => value.replace(/ ([:;!?])/g, "\u202f$1").replace(/« /g, "«\u00a0").replace(/ »/g, "\u00a0»");
  const localizeText = (value, language) => { const raw = value?.[language] || value?.fr || ""; return language === "fr" ? frenchSpacing(raw) : raw; };
  const sub = (value) => `<span class="symbol-index">${value}</span>`;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const control = (key, symbol, labels, min, max, step, unit, extra = {}) => ({ key, symbol, label: text(...labels), aria: text(...labels), min, max, step, unit, ...extra });

  const i18n = {
    law: text("Ideal law (R load)", "Loi idéale (charge R)", "Ley ideal (carga R)"),
    voltages: text("Load voltage", "Tension de charge", "Tensión de carga"),
    loadCurrent: text("Load current", "Courant de charge", "Corriente de carga"),
    powerColumn: text("Power and quality", "Puissance et qualité", "Potencia y calidad"),
    montageSingleName: text("single diode (half-wave)", "simple diode (monoalternance)", "diodo simple (media onda)"),
    montageBridgeName: text("diode bridge (full-wave)", "pont de diodes (double alternance)", "puente de diodos (onda completa)"),
    acCurrents: text("AC-side currents", "courants côté AC", "corrientes lado AC"),
    dcCurrents: text("DC-side currents", "courants côté DC", "corrientes lado DC"),
    tensions: text("voltages", "tensions", "tensiones"),
    currentAxis: text("currents", "courants", "corrientes"),
    meanVoltage: text("Average voltage", "Tension moyenne", "Tensión media"),
    rippleVoltage: text("Peak-to-peak ripple", "Ondulation crête à crête", "Ondulación pico a pico"),
    meanCurrent: text("Average current", "Courant moyen", "Corriente media"),
    rmsCurrent: text("RMS current", "Courant efficace", "Corriente eficaz"),
    conductionAngle: text("Conduction angle", "Angle de conduction", "Ángulo de conducción"),
    piv: text("Peak inverse voltage", "Tension inverse de crête", "Tensión inversa de pico"),
    simulation: text("Simulation", "Simulation", "Simulación"),
    formFactor: text("Form factor", "Facteur de forme", "Factor de forma"),
    caseTable: text("Steady-state formulas", "Formules du régime permanent", "Fórmulas del régimen permanente"),
    columnSingle: text("Half-wave", "Simple alternance", "Media onda"),
    columnBridge: text("Bridge", "Pont", "Puente"),
    blockNoCap: text("Without capacitor", "Sans condensateur", "Sin capacitor"),
    blockWithCap: text("With capacitor", "Avec condensateur", "Con capacitor"),
    // Singulier en simple alternance (une seule diode), pluriel pour le pont.
    diodeIdealName: text("ideal diode", "diode idéale", "diodo ideal"),
    diodesIdealName: text("ideal diodes", "diodes idéales", "diodos ideales"),
    diodeRealName: text("0.6 V diode", "diode à 0,6 V", "diodo de 0,6 V"),
    diodesRealName: text("0.6 V diodes", "diodes à 0,6 V", "diodos de 0,6 V"),
    simulatedShort: text("simulated", "simulé", "simulado"),
    gap: text("Gap", "Écart", "Diferencia"),
    measuredTitle: text("Simulated values", "Valeurs simulées", "Valores simulados"),
    diodePeak: text("Peak diode current", "Courant de crête dans la diode", "Corriente de pico en el diodo"),
    pivMeasured: text("Measured peak inverse voltage", "Tension inverse de crête mesurée", "Tensión inversa de pico medida"),
    hypotheses: text("Model and assumptions", "Modèle et hypothèses", "Modelo e hipótesis"),
    // Les symboles passent par KaTeX comme les formules du tableau : le V̂ composé
    // (V + accent combinant) s'affichait « V` » dans la police de l'interface.
    tableLegend: text(
      `<span class="math" data-tex="\\hat V=\\sqrt2\\,V_{in}"></span> is the amplitude of the source, and <span class="math" data-tex="V_{D0}"></span> the threshold voltage of the diode model: 0 V with ideal diodes, 0.6 V with the 0.6 V model. For <span class="math" data-tex="\\Delta v_o"></span>, <span class="math" data-tex="\\langle i_o\\rangle\\simeq v_o\\,\\mathrm{max}/R"></span> and <span class="math" data-tex="f_r"></span> is the ripple frequency; the formula assumes <span class="math" data-tex="RC\\gg1/f_r"></span>.`,
      `<span class="math" data-tex="\\hat V=\\sqrt2\\,V_{in}"></span> est l’amplitude de la source, et <span class="math" data-tex="V_{D0}"></span> la tension de seuil du modèle de diode : 0 V en modèle idéal, 0,6 V en modèle 0,6 V. Pour <span class="math" data-tex="\\Delta v_o"></span>, <span class="math" data-tex="\\langle i_o\\rangle\\simeq v_o\\,\\mathrm{max}/R"></span> et <span class="math" data-tex="f_r"></span> est la fréquence de l’ondulation ; la formule suppose <span class="math" data-tex="RC\\gg1/f_r"></span>.`,
      `<span class="math" data-tex="\\hat V=\\sqrt2\\,V_{in}"></span> es la amplitud de la fuente, y <span class="math" data-tex="V_{D0}"></span> la tensión de umbral del modelo de diodo: 0 V en modelo ideal, 0,6 V en modelo 0,6 V. Para <span class="math" data-tex="\\Delta v_o"></span>, <span class="math" data-tex="\\langle i_o\\rangle\\simeq v_o\\,\\mathrm{max}/R"></span> y <span class="math" data-tex="f_r"></span> es la frecuencia de la ondulación; la fórmula supone <span class="math" data-tex="RC\\gg1/f_r"></span>.`,
    ),
    noteRc: text(
      "Assumption RC ≫ 1/f{r} not satisfied (RC = {rc}, 1/f{r} = {period}): the ripple formula gives an order of magnitude only.",
      "Hypothèse RC ≫ 1/f{r} non vérifiée (RC = {rc}, 1/f{r} = {period}) : la formule de l’ondulation ne donne qu’un ordre de grandeur.",
      "Hipótesis RC ≫ 1/f{r} no verificada (RC = {rc}, 1/f{r} = {period}): la fórmula de la ondulación solo da un orden de magnitud.",
    ),
    noteFirstOrder: text(
      "Average voltage: formula approximated to first order in V{d0}, hence the residual gap with the simulation.",
      "Tension moyenne : formule approchée au premier ordre en V{d0}, d’où l’écart résiduel avec la simulation.",
      "Tensión media: fórmula aproximada al primer orden en V{d0}, de ahí la diferencia residual con la simulación.",
    ),
    noteInductive: text(
      `Inductance in the circuit (load L or filter L${sub("f")}): the formulas in the table assume a purely resistive load.`,
      `Inductance dans le circuit (charge L ou filtre L${sub("f")}) : les formules du tableau supposent une charge purement résistive.`,
      `Inductancia en el circuito (carga L o filtro L${sub("f")}): las fórmulas de la tabla suponen una carga puramente resistiva.`,
    ),
    noteTransient: text(
      "Start-up view: the simulated values are read on the last period of the window, with the 0.5 Ω series resistance.",
      "Vue Démarrage : les valeurs simulées sont lues sur la dernière période de la fenêtre, avec la résistance série de 0,5 Ω.",
      "Vista Arranque: los valores simulados se leen en el último período de la ventana, con la resistencia serie de 0,5 Ω.",
    ),
    theoryNote: text(
      `The source is ideal; the diodes follow the selected model (ideal or 0.6 V). While a diode conducts, v${sub("o")} follows the rectified v${sub("in")} minus the drop of the conducting diodes, and the diode current is i${sub("D")} = C·dv${sub("o")}/dt + i${sub("o")}; when every diode is off, the capacitor discharges into R. The formulas in the table assume an R load and an established steady state; in the active case the value shown is the one given by the formula, with the simulation in brackets. The conduction angle and the peak current are those of a single diode. The start-up view adds a 0.5 Ω series resistance, which limits the inrush current into the discharged capacitor at switch-on, as the transformer and wiring do in a real rectifier.`,
      `La source est idéale ; les diodes suivent le modèle choisi (idéal ou 0,6 V). Tant qu’une diode conduit, v${sub("o")} suit v${sub("in")} redressée moins la chute des diodes passantes, et le courant de la diode vaut i${sub("D")} = C·dv${sub("o")}/dt + i${sub("o")} ; quand toutes les diodes sont bloquées, le condensateur se décharge dans R. Les formules du tableau supposent une charge R et un régime permanent établi ; dans le cas actif, la valeur affichée est celle de la formule et la simulation suit entre parenthèses. L’angle de conduction et le courant de crête sont ceux d’une seule diode. La vue Démarrage ajoute une résistance série de 0,5 Ω, qui limite l’appel de courant dans le condensateur déchargé à la mise sous tension, comme le font le transformateur et le câblage dans un redresseur réel.`,
      `La fuente es ideal; los diodos siguen el modelo elegido (ideal o 0,6 V). Mientras un diodo conduce, v${sub("o")} sigue a v${sub("in")} rectificada menos la caída de los diodos en conducción, y la corriente del diodo vale i${sub("D")} = C·dv${sub("o")}/dt + i${sub("o")}; cuando todos los diodos están bloqueados, el capacitor se descarga en R. Las fórmulas de la tabla suponen carga R y régimen permanente establecido; en el caso activo el valor mostrado es el de la fórmula, con la simulación entre paréntesis. El ángulo de conducción y la corriente de pico son los de un solo diodo. La vista Arranque agrega una resistencia serie de 0,5 Ω, que limita la corriente de conexión en el capacitor descargado, como lo hacen el transformador y el cableado en un rectificador real.`,
    ),
    schematic: text("Diode rectifier", "Redresseur à diodes", "Rectificador de diodos"),
  };

  const controlDefinitions = {
    vinRms: control("vinRms", "V<sub>in</sub>", ["RMS voltage", "Tension efficace", "Tensión eficaz"], 6, 48, 2, "V"),
    resistance: control("resistance", "R", ["Load resistance", "Résistance de charge", "Resistencia de carga"], 2, 50, 1, "Ω"),
    inductance: control("inductance", "L", ["Load inductance", "Inductance de charge", "Inductancia de carga"], 0, 200, 5, "mH"),
    filterInductance: control("filterInductance", "L<sub>f</sub>", ["Filter inductance", "Filtre inductif", "Filtro inductivo"], 0, 200, 5, "mH"),
    capacitance: control("capacitance", "C", ["Filter capacitor", "Filtre capacitif", "Filtro capacitivo"], 0, 4700, 100, "µF"),
    psi: control("psi", "ψ", ["Energization angle", "Angle d’enclenchement", "Ángulo de conexión"], 0, 360, 5, "°", { advanced: true }),
  };

  // Mode « 1 kHz (générateur) » : montage de TP au générateur de fonctions (diode + R + C sur
  // breadboard). Les curseurs R et C sont alors exprimés en kΩ et en nF, et l'état les porte
  // dans ces unités (simulate() convertit) ; L et Lf restent ceux du mode avancé.
  const generatorFrequency = 1000;
  const generatorDefaults = { vinRms: 7, resistance: 10, capacitance: 0 };
  const generatorControls = {
    vinRms: control("vinRms", "V<sub>in</sub>", ["RMS voltage", "Tension efficace", "Tensión eficaz"], 1, 10, .5, "V"),
    resistance: control("resistance", "R", ["Load resistance", "Résistance de charge", "Resistencia de carga"], 1, 20, 1, "kΩ"),
    capacitance: control("capacitance", "C", ["Filter capacitor", "Filtre capacitif", "Filtro capacitivo"], 0, 2200, 100, "nF"),
  };

  const tracesMain = [
    { key: "vIn", label: "v<sub>in</sub>", color: "--trace-vin", width: 1.8 },
    { key: "vCh", label: "v<sub>o</sub>", color: "--trace-vr", width: 3 },
  ];
  // Mode avancé : v_x (sortie du redresseur, avant Lf) entre v_in et v_o, seulement si Lf > 0
  // (sans Lf, v_x est confondue avec v_o).
  const tracesMainAdvancedFor = (montage, hasChoke = false) => [
    tracesMain[0],
    ...(hasChoke ? [{ key: "vX", label: "v<sub>x</sub>", color: "--trace-vx", width: 2 }] : []),
    tracesMain[1],
    { key: "vD1", label: montage === "bridge" ? "v<sub>D1</sub>" : "v<sub>D</sub>", color: "--trace-vl", dash: [7, 4], width: 2 },
  ];
  // Courants : loi des nœuds au condensateur, i_in (ou i_Lf côté DC du pont) = i_C + i_o ;
  // i_C n'apparaît qu'en mode avancé.
  // En diode simple, i_in = i_D = i_Lf : une seule trace suffit, nommée i_in.
  const tracesCurrentsFor = (montage, advanced) => [
    montage === "bridge" && advanced
      ? { key: "iLf", label: "i<sub>Lf</sub>", color: "--trace-vx", width: 2.2 }
      : { key: "iIn", label: "i<sub>in</sub>", color: "--trace-vx", width: 2.2 },
    { key: "iCh", label: "i<sub>o</sub>", color: "--trace-il", width: 3 },
    ...(advanced ? [{ key: "iC", label: "i<sub>C</sub>", color: "--trace-ic", width: 2, dash: [6, 4] }] : []),
  ];
  // Côté AC, pont seulement (en diode simple, i_in = i_D figure déjà dans les courants).
  const tracesAcBridge = [
    { key: "iIn", label: "i<sub>in</sub>", color: "--trace-vx", width: 2.2 },
    { key: "iD1", label: 'i<sub>D1</sub> <span style="padding:0 .22em">&amp;</span> i<sub>D3</sub>', color: "--trace-ic", width: 2.6, dash: [6, 4] },
    { key: "iD24", label: 'i<sub>D2</sub> <span style="padding:0 .22em">&amp;</span> i<sub>D4</sub>', color: "--trace-vl", width: 2.6, dash: [6, 4] },
  ];

  // --- Switched-diode simulation (semi-implicit Euler, ideal or 0.7 V diodes) ---
  function simulate(state, options) {
    const montage = options.montage === "bridge" ? "bridge" : "single";
    const transient = options.view === "transient";
    const vf = options.diodes === "real" ? .6 : 0;
    const drops = montage === "bridge" ? 2 * vf : vf;
    const generator = options.frequency === generatorFrequency;
    const frequency = generator ? generatorFrequency : options.frequency === 60 ? 60 : 50; const omega = 2 * Math.PI * frequency; const period = 1 / frequency;
    const vrms = state.vinRms; const amplitude = Math.SQRT2 * vrms;
    const r = Math.max(generator ? state.resistance * 1e3 : state.resistance, .5); // kΩ → Ω en mode générateur
    const l = options.advanced ? Math.max(0, state.inductance) / 1000 : 0; // L de charge : mode avancé seulement
    const lf = options.advanced ? Math.max(0, state.filterInductance) / 1000 : 0; // Lf : mode avancé seulement
    const c = Math.max(0, state.capacitance) / (generator ? 1e9 : 1e6); // nF en mode générateur, µF sinon
    // Régime permanent : source et diodes idéales (v_o = v_in pendant la conduction).
    // Démarrage : 0,5 Ω en série pour borner l'appel de courant à la mise sous tension.
    const rs = transient ? .5 : 0;
    const psi = transient ? (state.psi || 0) * Math.PI / 180 : 0;
    const dt = period / 4000;
    let iL = 0; let vC = 0; let iF = 0;
    const source = (time) => amplitude * Math.sin(omega * time + psi);

    const advance = (time) => {
      const vin = source(time);
      const vRect = (montage === "bridge" ? Math.abs(vin) : vin) - drops;
      if (c > 0) {
        let iRect = 0; let conducting = false;
        if (lf > 0) {
          // choke-input filter: the rectified current flows through Lf and cannot reverse
          if (iF > 0 || vRect > vC) {
            iF = (iF + dt * (vRect - vC) / lf) / (1 + dt * rs / lf);
            if (iF <= 0) iF = 0; else conducting = true;
          } else iF = 0;
          iRect = iF;
          vC += dt * (iRect - iL) / c;
        } else {
          let vNext;
          if (rs === 0) {
            // diode idéale : le condensateur suit v_redressée tant que i_D = C·dv/dt + i_o > 0
            const vOff = vC - dt * iL / c;
            if (vRect > vOff) { vNext = vRect; iRect = c * (vRect - vC) / dt + iL; conducting = true; }
            else vNext = vOff;
          } else if (vRect > vC) {
            vNext = (vC + dt * (vRect / (rs * c) - iL / c)) / (1 + dt / (rs * c));
            iRect = (vRect - vNext) / rs;
            if (iRect > 0) conducting = true;
            else { iRect = 0; vNext = vC - dt * iL / c; }
          } else vNext = vC - dt * iL / c;
          vC = vNext;
        }
        iL = l > 0 ? (iL + dt * vC / l) / (1 + dt * r / l) : vC / r;
        return { vin, vCh: vC, iCh: iL, iRect, conducting };
      }
      const seriesInductance = lf + l;
      if (seriesInductance > 0) {
        if (iL > 0 || vRect > 0) {
          const previous = iL;
          iL = (iL + dt * vRect / seriesInductance) / (1 + dt * (r + rs) / seriesInductance);
          if (iL <= 0) { iL = 0; return { vin, vCh: 0, iCh: 0, iRect: 0, conducting: false }; }
          const slope = (iL - previous) / dt;
          return { vin, vCh: r * iL + l * slope, iCh: iL, iRect: iL, conducting: true };
        }
        return { vin, vCh: 0, iCh: 0, iRect: 0, conducting: false };
      }
      const algebraic = Math.max(0, vRect) / (r + rs);
      return { vin, vCh: r * algebraic, iCh: algebraic, iRect: algebraic, conducting: algebraic > 0 };
    };

    const derived = (sample) => {
      const positivePair = montage === "single" || sample.vin >= 0;
      const iD1 = sample.conducting && positivePair ? sample.iRect : 0;
      const iD24 = montage === "bridge" && sample.conducting && !positivePair ? sample.iRect : 0;
      const iIn = montage === "single" ? sample.iRect : (sample.conducting ? (positivePair ? sample.iRect : -sample.iRect) : 0);
      // v_x : sortie du redresseur, avant Lf. En conduction, v_in (redressée) moins Rin et les
      // diodes ; bloqué, aucun courant dans Lf, donc v_x = v_o.
      const vX = sample.conducting ? (montage === "bridge" ? Math.abs(sample.vin) : sample.vin) - rs * sample.iRect - drops : sample.vCh;
      let vD1;
      if (montage === "single") vD1 = sample.conducting ? vf : sample.vin - vX;
      else if (sample.conducting) vD1 = positivePair ? vf : -(vX + vf);
      else vD1 = (sample.vin - vX) / 2;
      return { iD1, iD24, iIn, vD1, vX };
    };

    const tauLoad = l > 0 ? l / r : 0;
    const tauCap = r * c;
    const tauChoke = lf > 0 ? Math.max(lf / Math.max(rs, .5) / 3, c > 0 ? 2 * Math.sqrt(lf * c) : 0) : 0;
    const slowest = Math.max(tauLoad, tauCap / 2, tauChoke);
    const settleCycles = transient ? 0 : clamp(Math.ceil(6 * slowest / period), 6, 80);
    const stepsPerPeriod = Math.round(period / dt);
    for (let index = 0; index < settleCycles * stepsPerPeriod; index += 1) advance(index * dt);

    const recordCycles = transient ? clamp(Math.ceil((6 * slowest + 2 * period) / period), 5, 25) : 2;
    const startTime = settleCycles * period;
    const totalSteps = recordCycles * stepsPerPeriod;
    const keepEvery = Math.max(1, Math.ceil(totalSteps / 22000));
    const points = [];
    for (let index = 0; index <= totalSteps; index += 1) {
      const absolute = startTime + index * dt;
      const sample = advance(absolute);
      if (index % keepEvery === 0 || index === totalSteps) {
        const extra = derived(sample);
        points.push({ t: index * dt, vIn: sample.vin, vCh: sample.vCh, iCh: sample.iCh, iLf: sample.iRect, iC: c > 0 ? sample.iRect - sample.iCh : 0, iD1: extra.iD1, iD24: extra.iD24, iIn: extra.iIn, vD1: extra.vD1, vX: extra.vX });
      }
    }

    const metricStart = points.length - Math.max(2, Math.round(points.length * (period / (recordCycles * period))));
    const metricPoints = points.slice(Math.max(0, metricStart));
    const mean = (key) => metricPoints.reduce((sum, point) => sum + point[key], 0) / metricPoints.length;
    const rms = (key) => Math.sqrt(metricPoints.reduce((sum, point) => sum + point[key] ** 2, 0) / metricPoints.length);
    const vChMean = mean("vCh"); const iChMean = mean("iCh"); const iChRms = rms("iCh"); const iInRms = rms("iIn"); const iInMean = mean("iIn");
    const conductionThreshold = generator ? 1e-6 : 1e-3; // courants de l'ordre du mA en mode générateur
    let vMin = Infinity; let vMax = -Infinity; let piv = 0; let conductionSamples = 0; let iD1Peak = 0;
    metricPoints.forEach((point) => {
      vMin = Math.min(vMin, point.vCh); vMax = Math.max(vMax, point.vCh);
      piv = Math.min(piv, point.vD1);
      iD1Peak = Math.max(iD1Peak, point.iD1);
      if (point.iD1 > conductionThreshold) conductionSamples += 1;
    });
    const pCh = metricPoints.reduce((sum, point) => sum + point.vCh * point.iCh, 0) / metricPoints.length;
    const pIn = metricPoints.reduce((sum, point) => sum + point.vIn * point.iIn, 0) / metricPoints.length;
    let fundSin = 0; let fundCos = 0;
    metricPoints.forEach((point) => { const angle = omega * point.t; fundSin += point.iIn * Math.sin(angle); fundCos += point.iIn * Math.cos(angle); });
    const fundamentalRms = Math.SQRT2 * Math.hypot(fundSin, fundCos) / metricPoints.length;
    const distortion = Math.max(0, iInRms ** 2 - iInMean ** 2 - fundamentalRms ** 2);
    const thdI = fundamentalRms > 1e-6 ? Math.sqrt(distortion) / fundamentalRms * 100 : 0;
    const apparent = vrms * iInRms;
    const idealMean = (montage === "bridge" ? 2 : 1) * amplitude / Math.PI;
    // Formules du panneau « Régime permanent », en V_D0 = seuil du modèle de diode : elles ne
    // dépendent que des réglages (jamais de la simulation), pour que l'écart affiché mesure
    // bien l'erreur de la formule. f_r est la fréquence de l'ondulation : f, ou 2f pour le pont.
    const peakFormula = amplitude - drops;
    const meanFormula = montage === "bridge" ? 2 * amplitude / Math.PI - 2 * vf : amplitude / Math.PI - vf / 2;
    const pivFormula = c > 0
      ? (montage === "bridge" ? amplitude - vf : 2 * amplitude - vf)
      : (montage === "bridge" ? amplitude - vf : amplitude);
    const rippleFrequency = (montage === "bridge" ? 2 : 1) * frequency;
    const meanCurrentFormula = peakFormula / r;
    const rippleApprox = c > 0 ? meanCurrentFormula / (rippleFrequency * c) : null;
    // Avec condensateur, la sortie oscille entre v_o max et v_o max − Δv_o : sa moyenne est
    // à mi-hauteur de l'ondulation (la décharge est quasi linéaire tant que RC ≫ 1/f_r).
    const meanWithCapFormula = c > 0 ? peakFormula - rippleApprox / 2 : null;

    return {
      // Mode générateur : courants de l'ordre du mA, tracés en mA (les grandeurs ci-dessous restent en A).
      points: generator ? points.map((point) => ({ ...point, iCh: point.iCh * 1e3, iLf: point.iLf * 1e3, iC: point.iC * 1e3, iD1: point.iD1 * 1e3, iD24: point.iD24 * 1e3, iIn: point.iIn * 1e3 })) : points,
      generator, montage, view: options.view || "steady", diodes: options.diodes || "ideal",
      amplitude, frequency, duration: points.at(-1).t,
      vChMean, vChRipple: vMax - vMin, vChMax: vMax, iChMean, iChRms, iInRms, iInMean,
      formFactor: iChMean > 1e-6 ? iChRms / iChMean : null,
      pCh, pIn, apparent, powerFactor: apparent > 1e-9 ? pIn / apparent : 0, thdI,
      conductionDegrees: conductionSamples / metricPoints.length * 360,
      piv, iD1Peak, idealMean, hasCapacitor: c > 0,
      // Panneau « Régime permanent » : formules, réglages en unités SI et hypothèse RC ≫ 1/f_r.
      threshold: vf, resistance: r, capacitance: c, inductive: l > 0 || lf > 0,
      rippleFrequency, timeConstant: r * c, peakFormula, meanFormula, meanWithCapFormula, pivFormula, meanCurrentFormula, rippleApprox,
    };
  }

  // Schémas dessinés dans Inkscape (app/ac-dc_diodes.svg, app/ac-dc_4diodes.svg), empilés
  // par tools/empiler-calques-svg.py : chaque calque est une <img> du même fichier
  // (#nom-du-calque), toutes dans le même cadre, allumées ou éteintes par onResult.
  // Le balisage ne dépend d'aucun réglage (fréquence comprise) : app.js garde alors les
  // mêmes nœuds d'un calcul à l'autre, et un calque estompé ne clignote pas.
  // Diodes : le calque « diodes » (noir) est l'état neutre, sans curseur d'instant ; avec le
  // curseur, chaque diode passe sur son calque « -on » (vert) ou « -off » (gris).
  const layeredSchematics = {
    single: { src: "assets/ac-dc_diodes.svg", diodes: ["d"] },
    bridge: { src: "assets/ac-dc_4diodes.svg", diodes: ["d1", "d2", "d3", "d4"] },
  };
  const schematicLayers = ["base", "diodes", "50hz", "60hz", "1khz", "rin", "c", "lf-cable", "lf", "load-r", "load-rl"];
  const initiallyVisible = new Set(["base", "diodes"]);
  function schematic(montage, language) {
    const aria = localizeText(i18n.schematic, language);
    const { src, diodes } = layeredSchematics[montage === "bridge" ? "bridge" : "single"];
    const layers = [...schematicLayers, ...diodes.flatMap((diode) => [`${diode}-off`, `${diode}-on`])];
    return `<div class="rect-schematic rect-layered" role="img" aria-label="${aria}">${layers.map((layer) => `<img class="converter-schematic" data-layer="${layer}" src="${src}#${layer}" alt="" draggable="false"${initiallyVisible.has(layer) ? "" : ' style="display:none"'} />`).join("")}</div>`;
  }

  // État des diodes à l'instant d'un échantillon tracé : passante si son courant est non nul.
  // simulate() met ce courant exactement à zéro quand la diode est bloquée ; un seuil (celui de
  // l'angle de conduction, 1 mA) retarderait l'amorçage de quelques degrés avec une charge R–L,
  // où le courant part de zéro. Dans le pont, D1 et D3 conduisent ensemble, de même que D2 et D4.
  function diodeStates(point, result) {
    const pairA = point.iD1 > 0;
    if (result.montage !== "bridge") return { d: pairA };
    const pairB = point.iD24 > 0;
    return { d1: pairA, d2: pairB, d3: pairA, d4: pairB };
  }

  const idealLawTex = (montage) => montage === "bridge" ? "\\langle v_{o}\\rangle=2\\hat V/\\pi" : "\\langle v_{o}\\rangle=\\hat V/\\pi";

  const model = {
    id: "redresseur",
    defaults: { vinRms: 12, resistance: 20, inductance: 0, filterInductance: 0, capacitance: 0, psi: 0 },
    defaultsFor(options = {}) { return options.frequency === generatorFrequency ? { ...this.defaults, ...generatorDefaults } : { ...this.defaults }; },
    controlsFor(_montage, options = {}) {
      const { vinRms, resistance, capacitance } = options.frequency === generatorFrequency ? generatorControls : controlDefinitions;
      // Basique : V, R et C sur une seule rangée ; L et Lf n'apparaissent qu'en mode avancé.
      if (!options.advanced) return { top: [vinRms, resistance, capacitance], bottom: [] };
      const bottom = [controlDefinitions.filterInductance, capacitance];
      if (options.view === "transient") bottom.push(controlDefinitions.psi);
      return { top: [vinRms, resistance, controlDefinitions.inductance], bottom };
    },
    diagram: { type: "inline", aria: text("Diode rectifier with R-L load and filter capacitor", "Redresseur à diodes avec charge R–L et condensateur de filtrage", "Rectificador de diodos con carga R–L y capacitor de filtrado") },
    diagramFor(montage, language) { return schematic(montage, language); },
    plotsFor(montage, _view, state = {}) { return { main: tracesMainAdvancedFor(montage, state.filterInductance > 0), second: tracesCurrentsFor(montage, true), third: montage === "bridge" ? tracesAcBridge : null }; },
    basicPlotsFor(montage) { return [tracesMain, tracesCurrentsFor(montage, false)]; },
    axesFor(montage, isAdvanced = false, options = {}) {
      const currentUnit = options.frequency === generatorFrequency ? "mA" : "A";
      const axes = [
        { label: i18n.tensions, unit: "V", tint: "--scope-text" },
        { label: isAdvanced && montage === "bridge" ? i18n.dcCurrents : i18n.currentAxis, unit: currentUnit, tint: "--scope-text" },
      ];
      if (isAdvanced && montage === "bridge") axes.push({ label: i18n.acCurrents, unit: currentUnit, tint: "--scope-text" });
      return axes;
    },
    axisMarksFor(groupIndex, advanced) {
      const result = this.lastResult;
      if (!result) return [];
      if (groupIndex === 0) return [{ value: result.vChMean, color: "--trace-vr" }];
      if (groupIndex === 1) return [{ value: result.generator ? result.iChMean * 1e3 : result.iChMean, color: "--trace-il" }];
      return [];
    },
    calculate(state, _commutation, options = {}) {
      const result = simulate(state, options);
      this.lastResult = result;
      return result;
    },
    onResult(result, state, context = {}) {
      const layered = document.querySelector(".rect-layered");
      if (layered) {
        const advanced = Boolean(context.advanced);
        const hasChoke = advanced && state.filterInductance > 0;
        const hasLoadInductor = advanced && state.inductance > 0;
        const show = (layer, visible, opacity = 1) => { const image = layered.querySelector(`[data-layer="${layer}"]`); if (image) { image.style.display = visible ? "" : "none"; image.style.opacity = String(opacity); } };
        show("50hz", result.frequency === 50);
        show("60hz", result.frequency === 60);
        show("1khz", result.frequency === generatorFrequency);
        show("rin", result.view === "transient");
        show("c", true, state.capacitance > 0 ? 1 : .14);
        show("lf", advanced, hasChoke ? 1 : .14);
        show("lf-cable", !hasChoke);
        show("load-r", !hasLoadInductor);
        show("load-rl", hasLoadInductor);
      }
    },
    diodeStates,
    // Curseur d'instant (app.js) : point = échantillon le plus proche, ou null sans curseur.
    onCursor(point, result) {
      const layered = document.querySelector(".rect-layered");
      if (!layered) return;
      const states = point && result ? diodeStates(point, result) : null;
      const show = (layer, visible) => { const image = layered.querySelector(`[data-layer="${layer}"]`); if (image) image.style.display = visible ? "" : "none"; };
      show("diodes", !states);
      layered.querySelectorAll('[data-layer$="-on"], [data-layer$="-off"]').forEach((image) => {
        const [diode, state] = image.dataset.layer.split("-");
        image.style.display = states && diode in states && states[diode] === (state === "on") ? "" : "none";
      });
    },
    metricsFor(result, _state, advanced, language) {
      const t = (value) => localizeText(value, language);
      const format = new Intl.NumberFormat({ en: "en-US", fr: "fr-FR", es: "es-ES" }[language] || "fr-FR", { maximumFractionDigits: 2 });
      const volts = (value) => `${format.format(value)} V`;
      const amps = (value) => Math.abs(value) < 1e-3 ? `${format.format(value * 1e6)} µA` : Math.abs(value) < 1 ? `${format.format(value * 1000)} mA` : `${format.format(value)} A`;
      if (!advanced) {
        return [
          { label: `${t(i18n.meanVoltage)} ⟨v<span class="symbol-index">o</span>⟩`, value: volts(result.vChMean) },
          { label: `${t(i18n.rippleVoltage)} Δv<span class="symbol-index">o</span>`, value: volts(result.vChRipple) },
          { label: `${t(i18n.meanCurrent)} ⟨i<span class="symbol-index">o</span>⟩`, value: amps(result.iChMean) },
        ];
      }
      const pairLabel = result.montage === "bridge" ? 'D<span class="symbol-index">1</span>, D<span class="symbol-index">3</span>' : "D";
      return [
        { label: `${t(i18n.rmsCurrent)} I<span class="symbol-index">o,eff</span>`, value: amps(result.iChRms) },
        { label: `${t(i18n.conductionAngle)} (${pairLabel})`, value: `${format.format(result.conductionDegrees)}°` },
        { label: t(i18n.piv), value: volts(Math.abs(result.piv)) },
      ];
    },
    infoBandHtml(language) {
      const t = (value) => localizeText(value, language);
      const lines = (ids) => `<div class="info-lines pv-info-lines">${ids.map((id) => `<span class="math info-equation" id="${id}"></span>`).join("")}</div>`;
      return `<div><span>${t(i18n.law)}</span>${lines(["info-rect-law", "info-rect-peak"])}</div>
<div><span>${t(i18n.voltages)}</span>${lines(["info-rect-vmean", "info-rect-vripple", "info-rect-piv"])}</div>
<div><span>${t(i18n.loadCurrent)}</span>${lines(["info-rect-imean", "info-rect-irms", "info-rect-angle"])}</div>
<div><span>${t(i18n.powerColumn)}</span>${lines(["info-rect-power", "info-rect-pf", "info-rect-thd"])}</div>`;
    },
    infoValuesFor(result, _state, helpers) {
      const { setInfoMath, texNumber, texVoltage } = helpers;
      // Mode générateur : courants en mA (µA si < 1 mA) et puissance en mW (µW si < 1 mW) ; sinon A et W comme avant.
      const scaled = (value, unit, small, milli, micro) => { const a = Math.abs(value); return result.generator ? (a < small ? `${texNumber(value * 1e6)}\\,\\mathrm{${micro}}` : `${texNumber(value * 1e3)}\\,\\mathrm{${milli}}`) : `${texNumber(value)}\\,\\mathrm{${unit}}`; };
      const texCurrent = (value) => scaled(value, "A", 1e-3, "mA", "\\mu A");
      const texPower = (value) => scaled(value, "W", 1e-3, "mW", "\\mu W");
      setInfoMath("info-rect-law", `${idealLawTex(result.montage)}=${texVoltage(result.idealMean)}`);
      setInfoMath("info-rect-peak", `\\hat V=\\sqrt{2}\\,V_{in}=${texVoltage(result.amplitude)}`);
      setInfoMath("info-rect-vmean", `\\langle v_{o}\\rangle=${texVoltage(result.vChMean)}`);
      setInfoMath("info-rect-vripple", `\\Delta v_{o}=${texVoltage(result.vChRipple)}`);
      setInfoMath("info-rect-piv", `\\hat V_{inv}=${texVoltage(Math.abs(result.piv))}`);
      setInfoMath("info-rect-imean", `\\langle i_{o}\\rangle=${texCurrent(result.iChMean)}`);
      setInfoMath("info-rect-irms", `I_{o,eff}=${texCurrent(result.iChRms)}`);
      setInfoMath("info-rect-angle", `\\theta_{cond}=${texNumber(result.conductionDegrees)}^\\circ`);
      setInfoMath("info-rect-power", `P_{o}=${texPower(result.pCh)}`);
      setInfoMath("info-rect-pf", `\\mathrm{FP}_{in}=${texNumber(result.powerFactor)}`);
      setInfoMath("info-rect-thd", `\\mathrm{THD}_{i}=${texNumber(result.thdI)}\\,\\%`);
    },
    theoryHtml(language) {
      const t = (value) => localizeText(value, language);
      const comparison = (rows) => `<div class="comparison-grid">${rows.map(([label, id]) => `<span>${label}</span><strong id="${id}"></strong>`).join("")}</div>`;
      // Une cellule par cas : la formule reste affichée en permanence ; les valeurs
      // numériques n'apparaissent que dans le cas actif, remplies par theoryValuesFor.
      const cell = (id, column, tex) => `<td data-col="${column}"><span class="rect-formula math" data-tex="${tex}"></span><div class="rect-values" id="theory-rect-${id}-${column}"></div></td>`;
      const line = (label, id, single, bridge) => `<tr><th scope="row">${label}</th>${cell(id, "single", single)}${cell(id, "bridge", bridge)}</tr>`;
      const blockHead = (label) => `<tr class="rect-block-head"><th scope="row" colspan="3">${label}</th></tr>`;
      const vo = `v${sub("o")}`;
      const meanCapTex = "\\simeq v_{o}\\,\\mathrm{max}-\\Delta v_{o}/2";
      return `<section class="rect-cases"><h3>${t(i18n.caseTable)}</h3>
<p class="rect-cases-case" id="theory-rect-case"></p>
<div class="rect-cases-scroll"><table class="rect-cases-table">
<thead><tr><td></td><th scope="col" data-col="single">${t(i18n.columnSingle)}</th><th scope="col" data-col="bridge">${t(i18n.columnBridge)}</th></tr></thead>
<tbody data-block="common">
${line(`${vo} max`, "peak", "\\hat V-V_{D0}", "\\hat V-2V_{D0}")}
</tbody>
<tbody data-block="noCap">
${blockHead(t(i18n.blockNoCap))}
${line(`⟨${vo}⟩`, "mean", "\\simeq\\hat V/\\pi-V_{D0}/2", "\\simeq 2\\hat V/\\pi-2V_{D0}")}
${line(t(i18n.piv), "pivOpen", "\\hat V", "\\hat V-V_{D0}")}
</tbody>
<tbody data-block="withCap">
${blockHead(t(i18n.blockWithCap))}
${line(`Δ${vo}`, "ripple", "\\simeq\\langle i_{o}\\rangle/(f_rC)", "\\simeq\\langle i_{o}\\rangle/(f_rC)")}
${line(`f${sub("r")}`, "frequency", "f", "2f")}
${line(`⟨${vo}⟩`, "meanCap", meanCapTex, meanCapTex)}
${line(t(i18n.piv), "pivCap", "2\\hat V-V_{D0}", "\\hat V-V_{D0}")}
</tbody>
</table></div>
<p class="rect-cases-legend">${t(i18n.tableLegend)}</p>
<p class="rect-cases-notes" id="theory-rect-notes" hidden></p></section>
<section><h3>${t(i18n.measuredTitle)}</h3>
${comparison([
        [t(i18n.formFactor), "theory-rect-form"],
        [t(i18n.conductionAngle), "theory-rect-angle"],
        [t(i18n.diodePeak), "theory-rect-idpeak"],
        [t(i18n.pivMeasured), "theory-rect-piv"],
      ])}</section>
<section class="approximation-section"><h3>${t(i18n.hypotheses)}</h3>
<p>${t(i18n.theoryNote)}</p></section>`;
    },
    theoryValuesFor(result, _state, helpers) {
      const { setText, number, displayVoltage, displayCurrent, displayFrequency, displayTime, relativeError, language } = helpers;
      const t = (value) => localizeText(value, language);
      // Typographie : espace insécable entre le nombre et son unité, fine avant le deux-points
      // en français (les autres langues n'en mettent pas).
      const nb = (value) => value.replace(/ /g, "\u00a0");
      const colon = language === "fr" ? "\u202f: " : ": ";
      const volts = (value) => nb(displayVoltage(value));
      const table = document.querySelector(".rect-cases-table");
      if (!table) return;
      const column = result.montage === "bridge" ? "bridge" : "single";
      const block = result.hasCapacitor ? "withCap" : "noCap";
      // Seules les cellules qui s'appliquent au cas courant sont teintées : la colonne du
      // montage, et dans cette colonne la ligne v_o max plus le bloc choisi par C. Les autres
      // lignes du même montage restent sans fond — elles décrivent l'autre cas.
      table.querySelectorAll("thead [data-col]").forEach((element) => element.classList.toggle("rect-head-active", element.dataset.col === column));
      table.querySelectorAll("tbody[data-block]").forEach((body) => {
        const applique = body.dataset.block === "common" || body.dataset.block === block;
        body.querySelectorAll("[data-col]").forEach((cell) => cell.classList.toggle("rect-cell-active", applique && cell.dataset.col === column));
      });
      // Cellule active : la valeur de la formule, la simulation entre parenthèses, et l'écart
      // sur une deuxième ligne seulement s'il dépasse 1 % (sinon il ne dirait rien).
      const fill = (id, html) => {
        const other = table.querySelector(`#theory-rect-${id}-${column === "bridge" ? "single" : "bridge"}`);
        if (other) other.replaceChildren();
        const host = table.querySelector(`#theory-rect-${id}-${column}`);
        if (host) host.innerHTML = html;
      };
      const compare = (id, formula, simulated) => {
        const ecart = relativeError(formula, simulated);
        const reste = ecart > 1 ? `<span class="rect-gap">${t(i18n.gap)}${colon}${nb(`${number.format(ecart)} %`)}</span>` : "";
        fill(id, `<b>${volts(formula)}</b> <span>(${t(i18n.simulatedShort)}${colon}${volts(simulated)})</span>${reste}`);
      };
      compare("peak", result.peakFormula, result.vChMax);
      if (result.hasCapacitor) {
        fill("mean", ""); fill("pivOpen", "");
        compare("ripple", result.rippleApprox, result.vChRipple);
        fill("frequency", `<b>${nb(displayFrequency(result.rippleFrequency))}</b>`);
        compare("meanCap", result.meanWithCapFormula, result.vChMean);
        compare("pivCap", result.pivFormula, Math.abs(result.piv));
      } else {
        fill("ripple", ""); fill("frequency", ""); fill("meanCap", ""); fill("pivCap", "");
        compare("mean", result.meanFormula, result.vChMean);
        compare("pivOpen", result.pivFormula, Math.abs(result.piv));
      }
      // Sous-titre : mêmes mots que les en-têtes de colonnes, et la diode au singulier quand
      // le montage n'en compte qu'une.
      const bridge = result.montage === "bridge";
      const montageName = t(bridge ? i18n.columnBridge : i18n.columnSingle).toLowerCase();
      const diodeName = t(result.diodes === "real"
        ? (bridge ? i18n.diodesRealName : i18n.diodeRealName)
        : (bridge ? i18n.diodesIdealName : i18n.diodeIdealName));
      setText("theory-rect-case", `${montageName} · ${diodeName} · ${t(result.hasCapacitor ? i18n.blockWithCap : i18n.blockNoCap).toLowerCase()}`);
      setText("theory-rect-form", result.formFactor === null ? "—" : number.format(result.formFactor));
      setText("theory-rect-angle", `${number.format(result.conductionDegrees)}°`);
      setText("theory-rect-idpeak", nb(displayCurrent(result.iD1Peak)));
      setText("theory-rect-piv", volts(Math.abs(result.piv)));
      // Notes du cas actif : hypothèse de l'ondulation, formule au premier ordre en V_D0,
      // charge inductive et vue Démarrage, dans cet ordre.
      const notes = [];
      if (result.hasCapacitor && result.timeConstant < 5 / result.rippleFrequency) {
        notes.push(t(i18n.noteRc)
          .replace(/\{rc\}/, nb(displayTime(result.timeConstant)))
          .replace(/\{period\}/, nb(displayTime(1 / result.rippleFrequency))));
      }
      if (!result.hasCapacitor && result.threshold > 0) notes.push(t(i18n.noteFirstOrder));
      if (result.inductive) notes.push(t(i18n.noteInductive));
      if (result.view === "transient") notes.push(t(i18n.noteTransient));
      const noteHost = document.querySelector("#theory-rect-notes");
      if (noteHost) {
        noteHost.innerHTML = notes.join(" ").replace(/\{r\}/g, sub("r")).replace(/\{d0\}/g, sub("D0"));
        noteHost.hidden = notes.length === 0;
      }
    },
  };

  window.converterModels = window.converterModels || {};
  window.converterModels.redresseur = model;
})();
