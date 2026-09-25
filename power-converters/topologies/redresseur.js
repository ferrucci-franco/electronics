(() => {
  "use strict";

  const text = (en, fr, es) => Object.freeze({ en, fr, es });
  const localizeText = (value, language) => value?.[language] || value?.fr || "";
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
    characteristic: text("Characteristic values", "Grandeurs caractéristiques", "Magnitudes características"),
    capacitiveFiltering: text("Capacitive filtering", "Filtrage capacitif", "Filtrado capacitivo"),
    simulation: text("Simulation", "Simulation", "Simulación"),
    idealFormula: text("Ideal formula", "Formule idéale", "Fórmula ideal"),
    relativeGap: text("Relative gap", "Écart relatif", "Diferencia relativa"),
    formFactor: text("Form factor", "Facteur de forme", "Factor de forma"),
    approximation: text("Approximation", "Approximation", "Aproximación"),
    theoryNote: text(
      "In the steady-state view, the source and diodes are ideal: while a diode conducts, v<sub>o</sub> equals the rectified v<sub>in</sub> (minus 0.6 V per conducting diode with the 0.6 V drop model), and the current is i<sub>D</sub> = C·dv<sub>in</sub>/dt + i<sub>o</sub>. The start-up view adds a 0.5 Ω series resistance, which limits the inrush current into the discharged capacitor at switch-on, as the transformer and wiring do in a real rectifier. The ideal average-voltage formulas assume an R load, no capacitor and ideal diodes.",
      "En régime permanent, la source et les diodes sont idéales : tant qu’une diode conduit, v<sub>o</sub> est égale à v<sub>in</sub> redressée (moins 0,6 V par diode passante avec le modèle à chute de 0,6 V), et le courant vaut i<sub>D</sub> = C·dv<sub>in</sub>/dt + i<sub>o</sub>. La vue Démarrage ajoute une résistance série de 0,5 Ω, qui limite l’appel de courant dans le condensateur déchargé à la mise sous tension, comme le font le transformateur et le câblage dans un redresseur réel. Les formules idéales de tension moyenne supposent une charge R, sans condensateur et avec des diodes idéales.",
      "En régimen permanente, la fuente y los diodos son ideales: mientras un diodo conduce, v<sub>o</sub> es igual a v<sub>in</sub> rectificada (menos 0,6 V por diodo en conducción con el modelo de caída de 0,6 V), y la corriente vale i<sub>D</sub> = C·dv<sub>in</sub>/dt + i<sub>o</sub>. La vista Arranque agrega una resistencia serie de 0,5 Ω, que limita la corriente de conexión en el capacitor descargado, como lo hacen el transformador y el cableado en un rectificador real. Las fórmulas ideales de tensión media suponen carga R, sin capacitor y con diodos ideales.",
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

  const tracesMain = [
    { key: "vIn", label: "v<sub>in</sub>", color: "--trace-vin", width: 1.8 },
    { key: "vCh", label: "v<sub>o</sub>", color: "--trace-vr", width: 3 },
  ];
  const tracesMainAdvancedFor = (montage) => [
    ...tracesMain,
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
    { key: "iD1", label: 'i<sub>D1</sub> <span style="padding:0 .22em">&amp;</span> i<sub>D2</sub>', color: "--trace-ic", width: 2.6, dash: [6, 4] },
    { key: "iD34", label: 'i<sub>D3</sub> <span style="padding:0 .22em">&amp;</span> i<sub>D4</sub>', color: "--trace-vl", width: 2.6, dash: [6, 4] },
  ];

  // --- Switched-diode simulation (semi-implicit Euler, ideal or 0.7 V diodes) ---
  function simulate(state, options) {
    const montage = options.montage === "bridge" ? "bridge" : "single";
    const transient = options.view === "transient";
    const vf = options.diodes === "real" ? .6 : 0;
    const drops = montage === "bridge" ? 2 * vf : vf;
    const frequency = options.frequency === 60 ? 60 : 50; const omega = 2 * Math.PI * frequency; const period = 1 / frequency;
    const vrms = state.vinRms; const amplitude = Math.SQRT2 * vrms;
    const r = Math.max(state.resistance, .5);
    const l = options.advanced ? Math.max(0, state.inductance) / 1000 : 0; // L de charge : mode avancé seulement
    const lf = options.advanced ? Math.max(0, state.filterInductance) / 1000 : 0; // Lf : mode avancé seulement
    const c = Math.max(0, state.capacitance) / 1e6;
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
      const iD34 = montage === "bridge" && sample.conducting && !positivePair ? sample.iRect : 0;
      const iIn = montage === "single" ? sample.iRect : (sample.conducting ? (positivePair ? sample.iRect : -sample.iRect) : 0);
      let vD1;
      if (montage === "single") vD1 = sample.conducting ? vf : sample.vin - sample.vCh;
      else if (sample.conducting) vD1 = positivePair ? vf : -(sample.vCh + vf);
      else vD1 = (sample.vin - sample.vCh) / 2;
      return { iD1, iD34, iIn, vD1 };
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
        points.push({ t: index * dt, vIn: sample.vin, vCh: sample.vCh, iCh: sample.iCh, iLf: sample.iRect, iC: c > 0 ? sample.iRect - sample.iCh : 0, iD1: extra.iD1, iD34: extra.iD34, iIn: extra.iIn, vD1: extra.vD1 });
      }
    }

    const metricStart = points.length - Math.max(2, Math.round(points.length * (period / (recordCycles * period))));
    const metricPoints = points.slice(Math.max(0, metricStart));
    const mean = (key) => metricPoints.reduce((sum, point) => sum + point[key], 0) / metricPoints.length;
    const rms = (key) => Math.sqrt(metricPoints.reduce((sum, point) => sum + point[key] ** 2, 0) / metricPoints.length);
    const vChMean = mean("vCh"); const iChMean = mean("iCh"); const iChRms = rms("iCh"); const iInRms = rms("iIn"); const iInMean = mean("iIn");
    let vMin = Infinity; let vMax = -Infinity; let piv = 0; let conductionSamples = 0;
    metricPoints.forEach((point) => {
      vMin = Math.min(vMin, point.vCh); vMax = Math.max(vMax, point.vCh);
      piv = Math.min(piv, point.vD1);
      if (point.iD1 > 1e-3) conductionSamples += 1;
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
    const rippleApprox = c > 0 && iChMean > 1e-6 ? iChMean / ((montage === "bridge" ? 2 : 1) * frequency * c) : null;

    return {
      points, montage, view: options.view || "steady", diodes: options.diodes || "ideal",
      amplitude, frequency, duration: points.at(-1).t,
      vChMean, vChRipple: vMax - vMin, iChMean, iChRms, iInRms, iInMean,
      formFactor: iChMean > 1e-6 ? iChRms / iChMean : null,
      pCh, pIn, apparent, powerFactor: apparent > 1e-9 ? pIn / apparent : 0, thdI,
      conductionDegrees: conductionSamples / metricPoints.length * 360,
      piv, idealMean, rippleApprox, hasCapacitor: c > 0,
    };
  }

  // --- Provisional inline schematic (to be replaced by the hand-drawn SVG files) ---
  const svgStyle = ".rect-schematic{width:96%;height:96%;color:#152238;font-family:Inter,Segoe UI,Arial,sans-serif}.rect-schematic line,.rect-schematic path,.rect-schematic circle,.rect-schematic rect,.rect-schematic polygon{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.rect-schematic .component{stroke:#07958a;stroke-width:4}.rect-schematic polygon.component{fill:#07958a}.rect-schematic text{fill:#087f76;stroke:none;font-size:21px;font-weight:750;text-anchor:middle}.rect-schematic .sub{font-size:14px;baseline-shift:sub}.rect-schematic .arrow{stroke:#c2452f;stroke-width:2.6}.rect-schematic polygon.arrow{fill:#c2452f;stroke:none}.rect-schematic .arrow-label{fill:#c2452f}.rect-schematic .node{fill:#ff6b72;stroke:none}body.dark-theme .rect-schematic{color:#d7e2ef}body.dark-theme .rect-schematic text{fill:#55d2c6}body.dark-theme .rect-schematic .arrow{stroke:#ff9d84}body.dark-theme .rect-schematic polygon.arrow{fill:#ff9d84;stroke:none}body.dark-theme .rect-schematic .arrow-label{fill:#ff9d84}";
  const arrowVertical = (x, yBottom, yTop, label) => `<line x1="${x}" y1="${yBottom}" x2="${x}" y2="${yTop + 12}" class="arrow"/><polygon points="${x - 5},${yTop + 12} ${x + 5},${yTop + 12} ${x},${yTop}" class="arrow"/><text x="${x}" y="${(yBottom + yTop) / 2 + 7}" class="arrow-label" text-anchor="middle" dx="-24">${label}</text>`;
  const arrowRight = (x, y, label) => `<line x1="${x - 15}" y1="${y}" x2="${x + 9}" y2="${y}" class="arrow"/><polygon points="${x + 9},${y - 5} ${x + 9},${y + 5} ${x + 17},${y}" class="arrow"/><text x="${x}" y="${y - 10}" class="arrow-label">${label}</text>`;
  const sourceGlyph = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="42" class="component"/><path d="M${cx - 20} ${cy} q10 -20 20 0 t20 0" class="component"/>`;
  const diodeGlyph = (x, y, angle, label, labelDx, labelDy) => `<g transform="translate(${x} ${y}) rotate(${angle})"><polygon points="-14,-12 -14,12 12,0" class="component"/><line x1="12" y1="-12" x2="12" y2="12" class="component"/></g><text x="${x + labelDx}" y="${y + labelDy}">${label}</text>`;
  const capacitorBranch = (x, yTop, yBottom) => `<g id="branche-c"><line x1="${x}" y1="${yTop}" x2="${x}" y2="${(yTop + yBottom) / 2 - 9}"/><line x1="${x - 25}" y1="${(yTop + yBottom) / 2 - 9}" x2="${x + 25}" y2="${(yTop + yBottom) / 2 - 9}" class="component"/><line x1="${x - 25}" y1="${(yTop + yBottom) / 2 + 7}" x2="${x + 25}" y2="${(yTop + yBottom) / 2 + 7}" class="component"/><line x1="${x}" y1="${(yTop + yBottom) / 2 + 7}" x2="${x}" y2="${yBottom}"/><text x="${x + 42}" y="${(yTop + yBottom) / 2 + 6}">C</text><circle cx="${x}" cy="${yTop}" r="5" class="node"/><circle cx="${x}" cy="${yBottom}" r="5" class="node"/></g>`;
  const loadBranch = (x, yTop, yBottom) => `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yTop + 22}"/><rect x="${x - 20}" y="${yTop + 22}" width="40" height="50" class="component"/><text x="${x + 40}" y="${yTop + 54}">R</text><line x1="${x}" y1="${yTop + 72}" x2="${x}" y2="${yTop + 84}"/><g id="branche-l"><path d="M${x} ${yTop + 84} q-22 11 0 22 q-22 11 0 22 q-22 11 0 22" class="component"/><text x="${x + 40}" y="${yTop + 122}">L</text></g><line id="bypass-l" x1="${x}" y1="${yTop + 84}" x2="${x}" y2="${yTop + 150}"/><line x1="${x}" y1="${yTop + 150}" x2="${x}" y2="${yBottom}"/>`;

  // Schéma dessiné dans Inkscape (app/ac-dc_diodes.svg), empilé par
  // tools/empiler-calques-svg.py : chaque calque est une <img> du même fichier
  // (#nom-du-calque), toutes dans le même cadre, allumées ou éteintes par onResult.
  const layeredSource = "assets/ac-dc_diodes.svg";
  // Le balisage ne dépend d'aucun réglage (fréquence comprise) : app.js garde alors les
  // mêmes nœuds d'un calcul à l'autre, et un calque estompé ne clignote pas.
  const singleLayers = ["base", "50hz", "60hz", "rin", "c", "lf-cable", "lf", "load-r", "load-rl"];
  function schematicSingle(language) {
    const aria = localizeText(i18n.schematic, language);
    return `<div class="rect-schematic rect-layered" role="img" aria-label="${aria}">${singleLayers.map((layer) => `<img class="converter-schematic" data-layer="${layer}" src="${layeredSource}#${layer}" alt="" draggable="false"${layer === "base" ? "" : ' style="display:none"'} />`).join("")}</div>`;
  }

  function schematicBridge(language, frequency = 50) {
    const aria = localizeText(i18n.schematic, language);
    return `<svg class="rect-schematic" viewBox="0 0 900 340" role="img" aria-label="${aria}">
<style>${svgStyle}</style>
${sourceGlyph(110, 165)}
<text x="110" y="248" style="font-size:16px">${frequency} Hz</text>
<line x1="110" y1="123" x2="110" y2="80"/><line x1="110" y1="80" x2="330" y2="80"/><line x1="330" y1="80" x2="330" y2="165"/>
<line x1="110" y1="207" x2="110" y2="315"/><line x1="110" y1="315" x2="470" y2="315"/><line x1="470" y1="315" x2="470" y2="165"/>
${arrowVertical(58, 212, 120, "v<tspan class='sub'>in</tspan>")}
${arrowRight(210, 62, "i<tspan class='sub'>in</tspan>")}
<line x1="330" y1="165" x2="400" y2="95"/><line x1="470" y1="165" x2="400" y2="95"/>
<line x1="400" y1="235" x2="330" y2="165"/><line x1="400" y1="235" x2="470" y2="165"/>
${diodeGlyph(365, 130, -45, "D<tspan class='sub'>1</tspan>", -42, -14)}
${diodeGlyph(435, 130, -135, "D<tspan class='sub'>3</tspan>", 44, -14)}
${diodeGlyph(365, 200, -135, "D<tspan class='sub'>4</tspan>", -42, 24)}
${diodeGlyph(435, 200, -45, "D<tspan class='sub'>2</tspan>", 44, 24)}
<circle cx="330" cy="165" r="5" class="node"/><circle cx="470" cy="165" r="5" class="node"/>
<line x1="400" y1="95" x2="400" y2="70"/><line x1="400" y1="70" x2="446" y2="70"/>
<g id="branche-lf"><path d="M446 70 q12 -25 24 0 q12 -25 24 0 q12 -25 24 0" class="component"/><text x="482" y="36">L<tspan class="sub">f</tspan></text></g>
<line id="bypass-lf" x1="446" y1="70" x2="518" y2="70"/>
<line x1="518" y1="70" x2="700" y2="70"/>
<line x1="400" y1="235" x2="400" y2="270"/><line x1="400" y1="270" x2="700" y2="270"/>
<text x="415" y="60" style="font-size:17px">+</text><text x="415" y="296" style="font-size:17px">−</text>
${arrowRight(628, 52, "i<tspan class='sub'>o</tspan>")}
${capacitorBranch(560, 70, 270)}
${loadBranch(700, 70, 270)}
${arrowVertical(790, 252, 90, "v<tspan class='sub'>o</tspan>")}
</svg>`;
  }

  const idealLawTex = (montage) => montage === "bridge" ? "\\langle v_{o}\\rangle=2\\hat V/\\pi" : "\\langle v_{o}\\rangle=\\hat V/\\pi";

  const model = {
    id: "redresseur",
    defaults: { vinRms: 12, resistance: 20, inductance: 0, filterInductance: 0, capacitance: 0, psi: 0 },
    controlsFor(_montage, options = {}) {
      // Basique : V, R et C sur une seule rangée ; L et Lf n'apparaissent qu'en mode avancé.
      if (!options.advanced) return { top: [controlDefinitions.vinRms, controlDefinitions.resistance, controlDefinitions.capacitance], bottom: [] };
      const bottom = [controlDefinitions.filterInductance, controlDefinitions.capacitance];
      if (options.view === "transient") bottom.push(controlDefinitions.psi);
      return { top: [controlDefinitions.vinRms, controlDefinitions.resistance, controlDefinitions.inductance], bottom };
    },
    diagram: { type: "inline", aria: text("Diode rectifier with R-L load and filter capacitor", "Redresseur à diodes avec charge R–L et condensateur de filtrage", "Rectificador de diodos con carga R–L y capacitor de filtrado") },
    diagramFor(montage, language, frequency) { return montage === "bridge" ? schematicBridge(language, frequency) : schematicSingle(language, frequency); },
    plotsFor(montage) { return { main: tracesMainAdvancedFor(montage), second: tracesCurrentsFor(montage, true), third: montage === "bridge" ? tracesAcBridge : null }; },
    basicPlotsFor(montage) { return [tracesMain, tracesCurrentsFor(montage, false)]; },
    axesFor(montage, isAdvanced = false) {
      const axes = [
        { label: i18n.tensions, unit: "V", tint: "--scope-text" },
        { label: isAdvanced && montage === "bridge" ? i18n.dcCurrents : i18n.currentAxis, unit: "A", tint: "--scope-text" },
      ];
      if (isAdvanced && montage === "bridge") axes.push({ label: i18n.acCurrents, unit: "A", tint: "--scope-text" });
      return axes;
    },
    axisMarksFor(groupIndex, advanced) {
      const result = this.lastResult;
      if (!result) return [];
      if (groupIndex === 0) return [{ value: result.vChMean, color: "--trace-vr" }];
      if (groupIndex === 1) return [{ value: result.iChMean, color: "--trace-il" }];
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
        show("50hz", result.frequency !== 60);
        show("60hz", result.frequency === 60);
        show("rin", result.view === "transient");
        show("c", true, state.capacitance > 0 ? 1 : .14);
        show("lf", advanced, hasChoke ? 1 : .14);
        show("lf-cable", !hasChoke);
        show("load-r", !hasLoadInductor);
        show("load-rl", hasLoadInductor);
        return;
      }
      const loadInductor = document.querySelector("#branche-l");
      const loadBypass = document.querySelector("#bypass-l");
      const hasLoadInductor = Boolean(context.advanced) && state.inductance > 0;
      if (loadInductor) { loadInductor.style.display = context.advanced ? "" : "none"; loadInductor.style.opacity = hasLoadInductor ? "1" : ".14"; }
      if (loadBypass) loadBypass.style.display = hasLoadInductor ? "none" : "";
      const capacitorBranch = document.querySelector("#branche-c");
      if (capacitorBranch) capacitorBranch.style.opacity = state.capacitance > 0 ? "1" : ".14";
      const chokeBranch = document.querySelector("#branche-lf");
      const chokeBypass = document.querySelector("#bypass-lf");
      const hasChoke = Boolean(context.advanced) && state.filterInductance > 0;
      if (chokeBranch) { chokeBranch.style.display = context.advanced ? "" : "none"; chokeBranch.style.opacity = hasChoke ? "1" : ".14"; }
      if (chokeBypass) chokeBypass.style.display = hasChoke ? "none" : "";
    },
    metricsFor(result, _state, advanced, language) {
      const t = (value) => localizeText(value, language);
      const format = new Intl.NumberFormat({ en: "en-US", fr: "fr-FR", es: "es-ES" }[language] || "fr-FR", { maximumFractionDigits: 2 });
      const volts = (value) => `${format.format(value)} V`;
      const amps = (value) => Math.abs(value) < 1 ? `${format.format(value * 1000)} mA` : `${format.format(value)} A`;
      if (!advanced) {
        return [
          { label: `${t(i18n.meanVoltage)} ⟨v<span class="symbol-index">o</span>⟩`, value: volts(result.vChMean) },
          { label: `${t(i18n.rippleVoltage)} Δv<span class="symbol-index">o</span>`, value: volts(result.vChRipple) },
          { label: `${t(i18n.meanCurrent)} ⟨i<span class="symbol-index">o</span>⟩`, value: amps(result.iChMean) },
        ];
      }
      const pairLabel = result.montage === "bridge" ? 'D<span class="symbol-index">1</span>, D<span class="symbol-index">2</span>' : "D";
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
      setInfoMath("info-rect-law", `${idealLawTex(result.montage)}=${texVoltage(result.idealMean)}`);
      setInfoMath("info-rect-peak", `\\hat V=\\sqrt{2}\\,V_{in}=${texVoltage(result.amplitude)}`);
      setInfoMath("info-rect-vmean", `\\langle v_{o}\\rangle=${texVoltage(result.vChMean)}`);
      setInfoMath("info-rect-vripple", `\\Delta v_{o}=${texVoltage(result.vChRipple)}`);
      setInfoMath("info-rect-piv", `\\hat V_{inv}=${texVoltage(Math.abs(result.piv))}`);
      setInfoMath("info-rect-imean", `\\langle i_{o}\\rangle=${texNumber(result.iChMean)}\\,\\mathrm{A}`);
      setInfoMath("info-rect-irms", `I_{o,eff}=${texNumber(result.iChRms)}\\,\\mathrm{A}`);
      setInfoMath("info-rect-angle", `\\theta_{cond}=${texNumber(result.conductionDegrees)}^\\circ`);
      setInfoMath("info-rect-power", `P_{o}=${texNumber(result.pCh)}\\,\\mathrm{W}`);
      setInfoMath("info-rect-pf", `\\mathrm{FP}_{in}=${texNumber(result.powerFactor)}`);
      setInfoMath("info-rect-thd", `\\mathrm{THD}_{i}=${texNumber(result.thdI)}\\,\\%`);
    },
    theoryHtml(language) {
      const t = (value) => localizeText(value, language);
      const comparison = (rows) => `<div class="comparison-grid">${rows.map(([label, id]) => `<span>${label}</span><strong id="${id}"></strong>`).join("")}</div>`;
      return `<section><h3>${t(i18n.characteristic)} · <span id="theory-rect-montage"></span></h3>
<div class="approximation-formula math" id="theory-rect-law"></div>
${comparison([[t(i18n.simulation), "theory-rect-vmean"], [t(i18n.idealFormula), "theory-rect-videal"], [t(i18n.relativeGap), "theory-rect-verror"]])}
<div class="approximation-formula math" data-tex="\\displaystyle F=\\frac{I_{o,eff}}{\\langle i_{o}\\rangle}"></div>
${comparison([[t(i18n.formFactor), "theory-rect-form"], [t(i18n.conductionAngle), "theory-rect-angle"], [t(i18n.piv), "theory-rect-piv"]])}</section>
<section class="approximation-section"><h3>${t(i18n.capacitiveFiltering)}</h3>
<div class="approximation-formula math" id="theory-rect-ripple-formula"></div>
${comparison([[t(i18n.simulation), "theory-rect-ripple-sim"], [t(i18n.approximation), "theory-rect-ripple-approx"], [t(i18n.relativeGap), "theory-rect-ripple-error"]])}
<p>${t(i18n.theoryNote)}</p></section>`;
    },
    theoryValuesFor(result, _state, helpers) {
      const { setText, number, displayVoltage, relativeError } = helpers;
      setText("theory-rect-montage", localizeText(result.montage === "bridge" ? i18n.montageBridgeName : i18n.montageSingleName, helpers.language));
      const lawElement = document.querySelector("#theory-rect-law");
      if (lawElement && window.katex) window.katex.render(`\\displaystyle ${idealLawTex(result.montage)}\\qquad \\hat V=\\sqrt{2}\\,V_{in}`, lawElement, { throwOnError: false });
      const rippleFormula = document.querySelector("#theory-rect-ripple-formula");
      const k = result.montage === "bridge" ? "2" : "";
      if (rippleFormula && window.katex) window.katex.render(`\\displaystyle \\Delta v_{o}\\simeq\\frac{\\langle i_{o}\\rangle}{${k}fC}`, rippleFormula, { throwOnError: false });
      setText("theory-rect-vmean", displayVoltage(result.vChMean));
      setText("theory-rect-videal", displayVoltage(result.idealMean));
      setText("theory-rect-verror", `${number.format(relativeError(result.idealMean, result.vChMean))} %`);
      setText("theory-rect-form", result.formFactor === null ? "—" : number.format(result.formFactor));
      setText("theory-rect-angle", `${number.format(result.conductionDegrees)}°`);
      setText("theory-rect-piv", displayVoltage(Math.abs(result.piv)));
      setText("theory-rect-ripple-sim", result.hasCapacitor ? displayVoltage(result.vChRipple) : "—");
      setText("theory-rect-ripple-approx", result.rippleApprox === null ? "—" : displayVoltage(result.rippleApprox));
      setText("theory-rect-ripple-error", result.rippleApprox === null ? "—" : `${number.format(relativeError(result.rippleApprox, result.vChRipple))} %`);
    },
  };

  window.converterModels = window.converterModels || {};
  window.converterModels.redresseur = model;
})();
