(() => {
  "use strict";

  const text = (en, fr, es) => Object.freeze({ en, fr, es });
  const mean = (points, key) => points.reduce((sum, point) => sum + point[key], 0) / Math.max(points.length, 1);
  const rms = (points, key) => Math.sqrt(points.reduce((sum, point) => sum + point[key] ** 2, 0) / Math.max(points.length, 1));
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const triangle = (time, frequency) => { const phase = (time * frequency) % 1; return phase < .5 ? -1 + 4 * phase : 3 - 4 * phase; };
  const pwmVoltage = (reference, carrier, vdc, switching) => {
    if (switching === "unipolar") return ((reference >= carrier ? 1 : 0) - (-reference >= carrier ? 1 : 0)) * vdc;
    return reference >= carrier ? vdc : -vdc;
  };
  const harmonic = (points, key, frequency) => {
    let sine = 0; let cosine = 0;
    points.forEach((point) => { sine += point[key] * Math.sin(2 * Math.PI * frequency * point.t); cosine += point[key] * Math.cos(2 * Math.PI * frequency * point.t); });
    return { rms: Math.SQRT2 * Math.hypot(sine, cosine) / Math.max(points.length, 1), phase: Math.atan2(cosine, sine) };
  };
  const thd = (points, key, frequency) => {
    const fundamental = harmonic(points, key, frequency).rms; const dc = mean(points, key); const totalAc2 = Math.max(0, rms(points, key) ** 2 - dc ** 2);
    return fundamental > 1e-9 ? Math.sqrt(Math.max(0, totalAc2 - fundamental ** 2)) / fundamental * 100 : 0;
  };
  const control = (key, symbol, labels, min, max, step, unit, extra = {}) => ({ key, symbol, label: text(...labels), aria: text(...labels), min, max, step, unit, ...extra });

  const controls = {
    standalone: {
      top: [
        control("fundamentalFrequency", "f<sub>1</sub>", ["Fundamental frequency", "Fréquence fondamentale", "Frecuencia fundamental"], 20, 200, 10, "Hz"),
        control("modulation", "m", ["Modulation index", "Indice de modulation", "Índice de modulación"], 10, 100, 5, "%"),
        control("switchingFrequency", "f<sub>PWM</sub>", ["PWM frequency", "Fréquence PWM", "Frecuencia PWM"], 2000, 30000, 1000, "kHz", { scale: .001 }),
        control("dcVoltage", "V<sub>dc</sub>", ["DC bus voltage", "Tension du bus continu", "Tensión del bus continuo"], 3, 400, 1, "V", { advanced: true }),
      ],
      bottom: [
        control("filterInductance", "L<sub>f</sub>", ["Filter inductance", "Inductance du filtre", "Inductancia del filtro"], .5, 100, .5, "mH"),
        control("filterCapacitance", "C<sub>f</sub>", ["Filter capacitance", "Capacité du filtre", "Capacidad del filtro"], .1, 100, .1, "µF"),
        control("loadResistance", "R<sub>o</sub>", ["Load resistance", "Résistance de charge", "Resistencia de carga"], 2, 1000, 2, "Ω", { advanced: true }),
        control("loadInductance", "L<sub>o</sub>", ["Load inductance", "Inductance de charge", "Inductancia de carga"], 0, 100, 1, "mH", { advanced: true }),
      ],
    },
    // Montage de TP : la MLI sinusoïdale vient d'un générateur de fonctions (sortie 50 Ω) et
    // attaque un filtre RC passe-bas sur breadboard. Clés propres (R en kΩ, C en µF) : passer
    // d'un montage à l'autre ne mélange pas les unités.
    generator: {
      top: [
        control("fundamentalFrequency", "f<sub>1</sub>", ["Fundamental frequency", "Fréquence fondamentale", "Frecuencia fundamental"], 20, 200, 10, "Hz"),
        control("modulation", "m", ["Modulation index", "Indice de modulation", "Índice de modulación"], 10, 100, 5, "%"),
        control("switchingFrequency", "f<sub>PWM</sub>", ["PWM frequency", "Fréquence PWM", "Frecuencia PWM"], 2000, 30000, 1000, "kHz", { scale: .001 }),
      ],
      bottom: [
        control("rcResistance", "R", ["Filter resistance", "Résistance du filtre", "Resistencia del filtro"], .1, 10, .1, "kΩ"),
        control("rcCapacitance", "C", ["Filter capacitance", "Capacité du filtre", "Capacidad del filtro"], .1, 10, .1, "µF"),
        control("generatorVoltage", "V<sub>in</sub>", ["Generator level", "Niveau du générateur", "Nivel del generador"], 1, 10, .5, "V"),
      ],
    },
    // Générateur MLI (R_g = 50 Ω) → bobine L_f (résistance de bobinage R_L) → C_f ∥ R_o : le montage
    // de TP « générateur + 100 mH + 1 µF + 1 kΩ ». Clés propres, comme le montage RC.
    generatorLc: {
      top: [
        control("fundamentalFrequency", "f<sub>1</sub>", ["Fundamental frequency", "Fréquence fondamentale", "Frecuencia fundamental"], 20, 200, 10, "Hz"),
        control("modulation", "m", ["Modulation index", "Indice de modulation", "Índice de modulación"], 10, 100, 5, "%"),
        control("switchingFrequency", "f<sub>PWM</sub>", ["PWM frequency", "Fréquence PWM", "Frecuencia PWM"], 2000, 30000, 1000, "kHz", { scale: .001 }),
        control("generatorVoltage", "V<sub>in</sub>", ["Generator level", "Niveau du générateur", "Nivel del generador"], 1, 10, .5, "V"),
      ],
      bottom: [
        control("glcInductance", "L<sub>f</sub>", ["Filter inductance", "Inductance du filtre", "Inductancia del filtro"], .5, 100, .5, "mH"),
        control("glcCapacitance", "C<sub>f</sub>", ["Filter capacitance", "Capacité du filtre", "Capacidad del filtro"], .1, 100, .1, "µF"),
        control("glcLoadResistance", "R<sub>o</sub>", ["Load resistance", "Résistance de charge", "Resistencia de carga"], .1, 10, .1, "kΩ"),
        control("glcWindingResistance", "R<sub>L</sub>", ["Coil winding resistance", "Résistance du bobinage", "Resistencia del bobinado"], 0, 200, 1, "Ω", { advanced: true }),
      ],
    },
    motor: {
      top: [
        control("motorDuty", "α", ["Manual duty cycle", "Rapport cyclique manuel", "Ciclo de trabajo manual"], 0, 100, 1, "%"),
        control("loadTorque", "T<sub>L</sub>", ["Load torque", "Couple résistant", "Par resistente"], 0, 1.5, .05, "N·m"),
        control("motorSwitchingFrequency", "f<sub>PWM</sub>", ["PWM frequency", "Fréquence PWM", "Frecuencia PWM"], 2000, 25000, 1000, "kHz", { scale: .001 }),
      ],
      bottom: [
        control("motorDcVoltage", "V<sub>dc</sub>", ["DC bus voltage", "Tension du bus continu", "Tensión del bus continuo"], 12, 120, 6, "V"),
        control("armatureInductance", "L<sub>a</sub>", ["Armature inductance", "Inductance d’induit", "Inductancia de armadura"], 2, 20, 1, "mH", { advanced: true }),
        control("motorInertia", "J", ["Rotor inertia", "Inertie du rotor", "Inercia del rotor"], 1, 8, .5, "kg·m²", { scale: .001, advanced: true }),
      ],
    },
    grid: {
      top: [
        control("gridCurrentRms", "I<sub>g</sub>*", ["Injected RMS current", "Courant efficace injecté", "Corriente eficaz inyectada"], 1, 20, 1, "A"),
        control("gridPhase", "φ", ["Current phase", "Phase du courant", "Fase de la corriente"], -60, 60, 5, "°"),
        control("gridSwitchingFrequency", "f<sub>PWM</sub>", ["PWM frequency", "Fréquence PWM", "Frecuencia PWM"], 2000, 30000, 1000, "kHz", { scale: .001 }),
        control("gridHysteresisBand", "h<sub>i</sub>", ["Hysteresis half-band", "Demi-bande d’hystérésis", "Semibanda de histéresis"], .2, 2, .1, "A"),
        control("gridInductance", "L<sub>g</sub>", ["Grid coupling inductance", "Inductance de couplage", "Inductancia de acoplamiento"], 1, 30, .5, "mH"),
      ],
      bottom: [
        control("gridVoltageRms", "V<sub>g</sub>", ["Grid RMS voltage", "Tension efficace réseau", "Tensión eficaz de red"], 110, 240, 10, "V", { advanced: true }),
        control("gridDcVoltage", "V<sub>dc</sub>", ["DC bus voltage", "Tension du bus continu", "Tensión del bus continuo"], 300, 700, 20, "V", { advanced: true }),
      ],
    },
  };

  const plots = {
    standalone: {
      main: [{ key: "vref", label: "v<sub>ref</sub>", color: "--trace-vin", dash: [8, 5] }, { key: "vab", label: "v<sub>ab</sub>", color: "--trace-vab", step: true, layer: -1 }, { key: "vo", label: "v<sub>o</sub>", color: "--trace-vr", width: 3 }],
      second: [{ key: "vLf", label: "v<sub>Lf</sub>", color: "--trace-vl" }, { key: "vC", label: "v<sub>Cf</sub>", color: "--trace-ic", dash: [7, 4] }],
      third: [{ key: "iFilter", label: "i<sub>Lf</sub>", color: "--trace-il", width: 3 }, { key: "iLoad", label: "i<sub>o</sub>", color: "--trace-vx" }, { key: "iCap", label: "i<sub>Cf</sub>", color: "--trace-vr", dash: [6, 4] }],
    },
    generator: {
      main: [{ key: "vref", label: "v<sub>ref</sub>", color: "--trace-vin", dash: [8, 5] }, { key: "vab", label: "v<sub>ab</sub>", color: "--trace-vab", step: true, layer: -1 }, { key: "vo", label: "v<sub>o</sub>", color: "--trace-vr", width: 3 }],
      second: [{ key: "vR", label: "v<sub>R</sub>", color: "--trace-vl" }],
      third: [{ key: "iR", label: "i<sub>R</sub> = i<sub>C</sub>", color: "--trace-il", width: 3 }],
    },
    motor: {
      main: [{ key: "speedRpm", label: "n", color: "--trace-vr", width: 3 }],
      second: [{ key: "vArmature", label: "v<sub>a</sub>", color: "--trace-vx", step: true }, { key: "vAverage", label: "⟨v<sub>a</sub>⟩", color: "--trace-vin", dash: [8, 5] }, { key: "backEmf", label: "e = K<sub>e</sub>ω", color: "--trace-vr", width: 3 }],
      third: [{ key: "iArmature", label: "i<sub>a</sub>", color: "--trace-il", width: 3 }],
    },
    grid: {
      main: [{ key: "vGrid", label: "v<sub>g</sub>", color: "--trace-vin", width: 3 }, { key: "iReference", label: "i<sub>g</sub>*", color: "--trace-vx", axis: "right", dash: [8, 5] }, { key: "iGrid", label: "i<sub>g</sub>", color: "--trace-vr", axis: "right", width: 3 }],
      second: [{ key: "vBridge", label: "v<sub>ab</sub>", color: "--trace-vl", step: true }, { key: "vCommand", label: "v*<sub>ab</sub>", color: "--trace-ic", dash: [7, 4] }],
      third: [{ key: "iError", label: "i<sub>g</sub> − i<sub>g</sub>*", color: "--trace-il", width: 3 }],
    },
  };
  const gridHysteresisPlots = {
    main: plots.grid.main,
    second: plots.grid.second,
    third: [
      { key: "iError", label: "i<sub>g</sub> − i<sub>g</sub>*", color: "--trace-il", width: 3 },
      { key: "errorUpper", label: "+h<sub>i</sub>", color: "--trace-vx", dash: [7, 5] },
      { key: "errorLower", label: "−h<sub>i</sub>", color: "--trace-vx", dash: [7, 5] },
    ],
  };

  const motorBasicSteadyPlots = [
    [{ key: "speedRpm", label: "n", color: "--trace-vr", width: 3 }],
    [
      { key: "vArmature", label: "v<sub>a</sub>", color: "--trace-vx", width: 2.6, step: true },
      { key: "vAverage", label: "⟨v<sub>a</sub>⟩", color: "--trace-vin", dash: [8, 5] },
      { key: "iArmature", label: "i<sub>a</sub>", color: "--trace-il", axis: "right", width: 3 },
    ],
  ];
  const motorBasicTransientPlots = [
    [{ key: "speedRpm", label: "n", color: "--trace-vr", width: 3 }],
    [{ key: "vAverage", label: "⟨v<sub>a</sub>⟩", color: "--trace-vin", dash: [8, 5] }, { key: "iArmature", label: "i<sub>a</sub>", color: "--trace-il", axis: "right", width: 3 }],
  ];
  const motorTransientPlots = {
    main: plots.motor.main,
    second: [{ key: "vAverage", label: "⟨v<sub>a</sub>⟩", color: "--trace-vin", dash: [8, 5] }, { key: "backEmf", label: "e = K<sub>e</sub>ω", color: "--trace-vr", width: 3 }],
    third: plots.motor.third,
  };

  function bridgeTitle(application, switching, language, currentControl = "pwm", filter = "lc") {
    if (application === "standalone" && (filter === "rc" || filter === "glc")) return switching === "unipolar" ? { en: "Generator, unipolar PWM", fr: "Générateur, PWM unipolaire", es: "Generador, PWM unipolar" }[language] : { en: "Generator, bipolar PWM", fr: "Générateur, PWM bipolaire", es: "Generador, PWM bipolar" }[language];
    if (application === "grid" && currentControl === "hysteresis") return { en: "Hysteresis current control", fr: "Commande de courant par hystérésis", es: "Control de corriente por histéresis" }[language];
    return switching === "unipolar" ? { en: "unipolar PWM", fr: "PWM unipolaire", es: "PWM unipolar" }[language] : { en: "bipolar PWM", fr: "PWM bipolaire", es: "PWM bipolar" }[language];
  }

  // Montage de TP : générateur de fonctions (MLI, résistance interne R_g) → R → C, v_o à vide.
  function generatorSvg(language) {
    const dictionary = { en: ["function generator", "RC low-pass filter", "scope"], fr: ["générateur de fonctions", "filtre RC passe-bas", "oscilloscope"], es: ["generador de funciones", "filtro RC pasabajos", "osciloscopio"] }[language] || ["générateur de fonctions", "filtre RC passe-bas", "oscilloscope"];
    return `<svg class="bridge-schematic" viewBox="0 0 900 300" role="img" aria-label="${dictionary[0]} + ${dictionary[1]}"><style>.bridge-schematic{width:96%;height:96%;color:#152238;font-family:Inter,Segoe UI,Arial,sans-serif}.bridge-schematic line,.bridge-schematic path,.bridge-schematic circle,.bridge-schematic rect{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.bridge-schematic .component{stroke:#07958a;stroke-width:4}.bridge-schematic .frame{stroke:#8aa0b8;stroke-width:2;stroke-dasharray:8 6}.bridge-schematic text{fill:#087f76;stroke:none;font-size:21px;font-weight:750;text-anchor:middle}.bridge-schematic .small{font-size:17px;font-weight:650}.bridge-schematic .sub{font-size:14px;baseline-shift:sub}.bridge-schematic .node{fill:#ff6b72;stroke:none}.bridge-schematic .arrow{stroke:#2f6fd0;stroke-width:2.5}.bridge-schematic .arrow-text{fill:#2f6fd0}</style>`
      + `<rect x="60" y="45" width="300" height="215" rx="14" class="frame"/><text x="210" y="285" class="small">${dictionary[0]}</text>`
      + `<circle cx="130" cy="165" r="42" class="component"/><path d="M106 178 h10 v-26 h8 v26 h6 v-26 h12 v26 h4" class="component"/><text x="205" y="205">±V<tspan class="sub">in</tspan></text>`
      + `<line x1="130" y1="123" x2="130" y2="85"/><line x1="130" y1="85" x2="200" y2="85"/><path d="M200 85 l8 -12 12 24 12 -24 12 24 12 -24 12 24 8 -12" class="component"/><line x1="276" y1="85" x2="420" y2="85"/><text x="238" y="130">R<tspan class="sub">g</tspan> = 50 Ω</text>`
      + `<line x1="130" y1="207" x2="130" y2="240"/><line x1="130" y1="240" x2="720" y2="240"/>`
      + `<path d="M420 85 l8 -12 12 24 12 -24 12 24 12 -24 12 24 8 -12" class="component"/><line x1="496" y1="85" x2="720" y2="85"/><text x="458" y="60">R</text>`
      + `<line x1="600" y1="85" x2="600" y2="145"/><line x1="575" y1="145" x2="625" y2="145" class="component"/><line x1="575" y1="160" x2="625" y2="160" class="component"/><line x1="600" y1="160" x2="600" y2="240"/><text x="555" y="160">C</text><circle cx="600" cy="85" r="5" class="node"/><circle cx="600" cy="240" r="5" class="node"/>`
      + `<circle cx="720" cy="85" r="6"/><circle cx="720" cy="240" r="6"/><line x1="745" y1="225" x2="745" y2="102" class="arrow"/><path d="M737 114 L745 100 L753 114" class="arrow"/><text x="785" y="170" class="arrow-text">v<tspan class="sub">o</tspan></text><text x="600" y="285" class="small">${dictionary[1]}</text><text x="790" y="62" class="small">→ ${dictionary[2]}</text></svg>`;
  }

  // Montage de TP : générateur (R_g) → bobine (R_L, L_f) → C_f ∥ R_o, v_o à l'oscilloscope.
  function generatorLcSvg(language) {
    const dictionary = { en: ["function generator", "LC filter", "load", "coil"], fr: ["générateur de fonctions", "filtre LC", "charge", "bobine"], es: ["generador de funciones", "filtro LC", "carga", "bobina"] }[language] || ["générateur de fonctions", "filtre LC", "charge", "bobine"];
    return `<svg class="bridge-schematic generator-schematic" viewBox="0 0 900 300" role="img" aria-label="${dictionary[0]} + ${dictionary[1]}"><style>.bridge-schematic{width:96%;height:96%;color:#152238;font-family:Inter,Segoe UI,Arial,sans-serif}.bridge-schematic line,.bridge-schematic path,.bridge-schematic circle,.bridge-schematic rect{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.bridge-schematic .component{stroke:#07958a;stroke-width:4}.bridge-schematic .frame{stroke:#8aa0b8;stroke-width:2;stroke-dasharray:8 6}.bridge-schematic text{fill:#087f76;stroke:none;font-size:21px;font-weight:750;text-anchor:middle}.bridge-schematic .small{font-size:17px;font-weight:650}.bridge-schematic .sub{font-size:14px;baseline-shift:sub}.bridge-schematic .node{fill:#ff6b72;stroke:none}.bridge-schematic .arrow{stroke:#2f6fd0;stroke-width:2.5}.bridge-schematic .arrow-text{fill:#2f6fd0}</style>`
      + `<rect x="40" y="45" width="270" height="215" rx="14" class="frame"/><text x="175" y="285" class="small">${dictionary[0]}</text>`
      + `<circle cx="100" cy="165" r="40" class="component"/><path d="M77 178 h10 v-26 h8 v26 h6 v-26 h12 v26 h4" class="component"/><text x="180" y="205">±V<tspan class="sub">in</tspan></text>`
      + `<line x1="100" y1="125" x2="100" y2="85"/><line x1="100" y1="85" x2="170" y2="85"/><path d="M170 85 l8 -12 12 24 12 -24 12 24 12 -24 12 24 8 -12" class="component"/><line x1="246" y1="85" x2="350" y2="85"/><text x="208" y="130">R<tspan class="sub">g</tspan> = 50 Ω</text>`
      + `<line x1="100" y1="205" x2="100" y2="240"/><line x1="100" y1="240" x2="760" y2="240"/>`
      + `<rect x="345" y="55" width="215" height="62" rx="12" class="frame"/><text x="452" y="140" class="small">${dictionary[3]}</text>`
      + `<path d="M350 85 l6 -9 9 18 9 -18 9 18 9 -18 9 18 6 -9" class="component"/><text x="378" y="48">R<tspan class="sub">L</tspan></text><line x1="406" y1="85" x2="430" y2="85"/><path d="M430 85 q10 -20 20 0 t20 0 t20 0 t20 0" class="component"/><text x="470" y="48">L<tspan class="sub">f</tspan></text><line x1="510" y1="85" x2="760" y2="85"/>`
      + `<line x1="600" y1="85" x2="600" y2="145"/><line x1="575" y1="145" x2="625" y2="145" class="component"/><line x1="575" y1="160" x2="625" y2="160" class="component"/><line x1="600" y1="160" x2="600" y2="240"/><text x="560" y="160">C<tspan class="sub">f</tspan></text><circle cx="600" cy="85" r="5" class="node"/><circle cx="600" cy="240" r="5" class="node"/>`
      + `<path d="M690 85 v35 l-12 8 24 12-24 12 24 12-24 12 12 8 v46" class="component"/><text x="728" y="170">R<tspan class="sub">o</tspan></text><circle cx="690" cy="85" r="5" class="node"/><circle cx="690" cy="240" r="5" class="node"/>`
      + `<circle cx="760" cy="85" r="6"/><circle cx="760" cy="240" r="6"/><line x1="790" y1="225" x2="790" y2="102" class="arrow"/><path d="M782 114 L790 100 L798 114" class="arrow"/><text x="825" y="170" class="arrow-text">v<tspan class="sub">o</tspan></text><text x="640" y="285" class="small">${dictionary[1]} + ${dictionary[2]}</text></svg>`;
  }

  function bridgeSvg(application, switching, language, currentControl = "pwm") {
    const dictionary = {
      en: ["DC bus", "output filter", "R–L load", "DC motor", "grid"],
      fr: ["bus continu", "filtre de sortie", "charge R–L", "moteur CC", "réseau"],
      es: ["bus continuo", "filtro de salida", "carga R–L", "motor CC", "red"],
    }[language] || ["bus continu", "filtre de sortie", "charge R–L", "moteur CC", "réseau"];
    let destination;
    if (application === "motor") destination = `<line x1="530" y1="105" x2="650" y2="105"/><line x1="530" y1="225" x2="650" y2="225"/><circle cx="710" cy="165" r="60" class="component"/><text x="710" y="158" class="large">M</text><text x="710" y="184">CC</text><line x1="650" y1="105" x2="675" y2="125"/><line x1="650" y1="225" x2="675" y2="205"/><text x="710" y="258">${dictionary[3]}</text>`;
    else if (application === "grid") destination = `<line x1="530" y1="105" x2="600" y2="105"/><path d="M600 105 q10 -20 20 0 t20 0 t20 0 t20 0" class="component"/><line x1="680" y1="105" x2="730" y2="105"/><circle cx="770" cy="165" r="56" class="component"/><path d="M735 165 q18 -30 35 0 t35 0" class="component"/><line x1="730" y1="105" x2="742" y2="125"/><line x1="530" y1="225" x2="730" y2="225"/><line x1="730" y1="225" x2="742" y2="205"/><text x="640" y="77">L<tspan class="sub">g</tspan></text><text x="770" y="258">${dictionary[4]}</text>`;
    else destination = `<line x1="530" y1="105" x2="580" y2="105"/><path d="M580 105 q10 -20 20 0 t20 0 t20 0 t20 0" class="component"/><line x1="660" y1="105" x2="735" y2="105"/><line x1="735" y1="105" x2="735" y2="135"/><line x1="715" y1="135" x2="755" y2="135" class="component"/><line x1="715" y1="148" x2="755" y2="148" class="component"/><line x1="735" y1="148" x2="735" y2="225"/><path d="M735 105 h70 v30 l-12 8 24 12-24 12 24 12-24 12 12 8 v26 h-70" class="component"/><line x1="530" y1="225" x2="805" y2="225"/><text x="620" y="77">L<tspan class="sub">f</tspan></text><text x="690" y="150">C<tspan class="sub">f</tspan></text><text x="830" y="246">${dictionary[2]}</text><text x="650" y="270">${dictionary[1]}</text>`;
    return `<svg class="bridge-schematic" viewBox="0 0 900 300" role="img" aria-label="H bridge"><style>.bridge-schematic{width:96%;height:96%;color:#152238;font-family:Inter,Segoe UI,Arial,sans-serif}.bridge-schematic line,.bridge-schematic path,.bridge-schematic circle,.bridge-schematic rect{fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.bridge-schematic .component{stroke:#07958a;stroke-width:4}.bridge-schematic text{fill:#087f76;stroke:none;font-size:21px;font-weight:750;text-anchor:middle}.bridge-schematic .large{font-size:34px}.bridge-schematic .sub{font-size:14px;baseline-shift:sub}.bridge-schematic .switch{stroke:#07958a}.bridge-schematic .node{fill:#ff6b72;stroke:none}</style><text x="85" y="55">V<tspan class="sub">dc</tspan></text><text x="85" y="278">${dictionary[0]}</text><line x1="110" y1="70" x2="110" y2="260"/><line x1="75" y1="130" x2="145" y2="130" class="component"/><line x1="88" y1="143" x2="132" y2="143" class="component"/><line x1="110" y1="70" x2="500" y2="70"/><line x1="110" y1="260" x2="500" y2="260"/><line x1="250" y1="70" x2="250" y2="105"/><line x1="250" y1="225" x2="250" y2="260"/><line x1="430" y1="70" x2="430" y2="105"/><line x1="430" y1="225" x2="430" y2="260"/><rect x="220" y="105" width="60" height="42" rx="8" class="switch"/><rect x="220" y="183" width="60" height="42" rx="8" class="switch"/><rect x="400" y="105" width="60" height="42" rx="8" class="switch"/><rect x="400" y="183" width="60" height="42" rx="8" class="switch"/><line x1="250" y1="147" x2="250" y2="183"/><line x1="430" y1="147" x2="430" y2="183"/><path d="M250 165 H320 V105 H530"/><path d="M430 165 H500 V225 H530"/><circle cx="250" cy="165" r="5" class="node"/><circle cx="430" cy="165" r="5" class="node"/><text x="248" y="134">S1</text><text x="248" y="212">S2</text><text x="428" y="134">S3</text><text x="428" y="212">S4</text>${destination}</svg>`;
  }

  // Algèbre des petits systèmes linéaires (3 états au plus) pour le modèle LC.
  const matMul = (a, b) => a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
  const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)));
  // e^M par mise à l'échelle et élévation au carré (série de Taylor sur M/2^s, de norme < 1/2).
  function expm(matrix) {
    const n = matrix.length; const norm = Math.max(...matrix.map((row) => row.reduce((sum, value) => sum + Math.abs(value), 0)));
    const squarings = Math.max(0, Math.ceil(Math.log2(norm + 1e-300)) + 1); const scaled = matrix.map((row) => row.map((value) => value / 2 ** squarings));
    let term = identity(n); let result = identity(n);
    for (let k = 1; k <= 16; k += 1) { term = matMul(term, scaled).map((row) => row.map((value) => value / k)); result = result.map((row, i) => row.map((value, j) => value + term[i][j])); }
    for (let k = 0; k < squarings; k += 1) result = matMul(result, result);
    return result;
  }
  // Régime sinusoïdal : (jω I − A) X = B U, résolu par élimination de Gauss en complexes [re, im].
  function phasorSolve(a, b, omega, amplitude) {
    const n = a.length; const mul = (x, y) => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
    const div = (x, y) => { const d = y[0] ** 2 + y[1] ** 2; return [(x[0] * y[0] + x[1] * y[1]) / d, (x[1] * y[0] - x[0] * y[1]) / d]; };
    const m = a.map((row, i) => [...row.map((value, j) => [-value, i === j ? omega : 0]), [b[i] * amplitude, 0]]);
    for (let col = 0; col < n; col += 1) {
      let pivot = col; for (let row = col + 1; row < n; row += 1) if (Math.hypot(...m[row][col]) > Math.hypot(...m[pivot][col])) pivot = row;
      [m[col], m[pivot]] = [m[pivot], m[col]];
      for (let row = 0; row < n; row += 1) { if (row === col) continue; const factor = div(m[row][col], m[col][col]); for (let k = col; k <= n; k += 1) { const product = mul(factor, m[col][k]); m[row][k] = [m[row][k][0] - product[0], m[row][k][1] - product[1]]; } }
    }
    return m.map((row, i) => div(row[n], row[i]));
  }

  // Pont + filtre L_f–C_f (r_d en série avec C_f) + charge R_o–L_o série. Le système est linéaire et v_ab
  // reste constante sur un pas : x ← Φx + Γv_ab (Φ = e^{AΔt}) est exact et stable quels que soient
  // L, C et R — un RK4 à pas fixe divergeait dès que L_o/R_o ou R_oC_f passait sous le pas de calcul.
  // Source : pont idéal (r_s = 0) ou générateur (r_s = R_g + R_L). Les courants des points sont en
  // ampères × currentScale (mA pour le générateur : A sur l'axe donnerait des graduations « 0,01 »).
  function simulateStandalone(state, switching) {
    return simulateLc(state, switching, { vdc: state.dcVoltage, lf: state.filterInductance / 1000, cf: state.filterCapacitance / 1e6, rd: 1.5, rs: 0, rLoad: state.loadResistance, lLoad: state.loadInductance / 1000, filter: "lc", currentScale: 1 });
  }
  function simulateGeneratorLc(state, switching) {
    const rs = generatorResistance + state.glcWindingResistance;
    return { ...simulateLc(state, switching, { vdc: state.generatorVoltage, lf: state.glcInductance / 1000, cf: state.glcCapacitance / 1e6, rd: 0, rs, rLoad: state.glcLoadResistance * 1000, lLoad: 0, filter: "glc", currentScale: 1000 }), generatorResistance, sourceResistance: rs };
  }
  function simulateLc(state, switching, circuit) {
    const f1 = state.fundamentalFrequency; const fs = state.switchingFrequency; const m = state.modulation / 100; const { vdc, lf, cf, rd, rs, rLoad, lLoad, filter, currentScale } = circuit; const omega = 2 * Math.PI * f1;
    const bridge = (time) => pwmVoltage(m * Math.sin(omega * time), triangle(time, fs), vdc, switching);
    // États [i_Lf, v_C, i_o] ; L_o = 0 : charge résistive, i_o = v_o/R_o algébrique, états [i_Lf, v_C].
    const resistive = lLoad <= 0; const k = rLoad / (rLoad + rd);
    const a = resistive
      ? [[-(rs + k * rd) / lf, -k / lf], [(1 - k * rd / rLoad) / cf, -k / (rLoad * cf)]]
      : [[-(rs + rd) / lf, -1 / lf, rd / lf], [1 / cf, 0, -1 / cf], [rd / lLoad, 1 / lLoad, -(rd + rLoad) / lLoad]];
    const b = resistive ? [1 / lf, 0] : [1 / lf, 0, 0];
    const output = (x) => { if (resistive) { const vo = k * (x[1] + rd * x[0]); const iLoad = vo / rLoad; return { iCap: x[0] - iLoad, vo, iLoad }; } const iCap = x[0] - x[2]; return { iCap, vo: x[1] + rd * iCap, iLoad: x[2] }; };
    const dt = 1 / (fs * 48); const n = a.length;
    const augmented = expm([...a.map((row, i) => [...row.map((value) => value * dt), b[i] * dt]), Array(n + 1).fill(0)]);
    const phi = augmented.slice(0, n).map((row) => row.slice(0, n)); const gamma = augmented.slice(0, n).map((row) => row[n]);
    const advance = (x, time) => { const vab = bridge(time + dt / 2); return phi.map((row, i) => row.reduce((sum, value, j) => sum + value * x[j], gamma[i] * vab)); };
    // Départ sur le régime sinusoïdal du fondamental (x = Im(X e^{jωt}) à t = 0) : avec un filtre peu
    // amorti accordé près de f_1, le transitoire durerait bien plus que la fenêtre simulée.
    const phasors = phasorSolve(a, b, omega, m * vdc);
    let x = phasors.map((value) => value[1]);
    const settleSteps = Math.ceil(4 / f1 / dt);
    for (let index = 0; index < settleSteps; index += 1) x = advance(x, index * dt);
    const settle = settleSteps * dt; const duration = 2 / f1; const total = Math.ceil(duration / dt); const keepEvery = Math.max(1, Math.ceil(total / 48000)); const points = [];
    for (let index = 0; index <= total; index += 1) { const t = Math.min(duration, index * dt); const absolute = settle + t; const { iCap, vo, iLoad } = output(x); const vab = bridge(absolute); if (index % keepEvery === 0 || index === total) points.push({ t, vref: m * vdc * Math.sin(omega * absolute), vab, vo, vLf: vab - rs * x[0] - vo, vC: x[1], iFilter: x[0] * currentScale, iLoad: iLoad * currentScale, iCap: iCap * currentScale }); if (index < total) x = advance(x, absolute); }
    // Fondamental attendu : V_o,1 = |H(jω_1)| mV_dc/√2, H tiré du même calcul de phaseurs.
    const voPhasor = output(phasors.map((value) => value[0])).vo; const voPhasorIm = output(phasors.map((value) => value[1])).vo; const voAmplitude = Math.hypot(voPhasor, voPhasorIm);
    const voFundamental = harmonic(points, "vo", f1); const currentFundamental = harmonic(points, "iLoad", f1); const resonance = 1 / (2 * Math.PI * Math.sqrt(lf * cf));
    return { points, application: "standalone", filter, fundamentalVoltageRms: voFundamental.rms, expectedVoltageRms: voAmplitude / Math.SQRT2, currentRms: rms(points, "iLoad") / currentScale, expectedCurrentRms: voFundamental.rms / Math.hypot(rLoad, omega * lLoad), phaseDegrees: (voFundamental.phase - currentFundamental.phase) * 180 / Math.PI, thd: thd(points, "vo", f1), resonance, switchingRatio: fs / f1, voltageBalance: mean(points, "vLf"), currentBalance: mean(points, "iCap") / currentScale, duration };
  }

  // Générateur MLI (±V_in à vide, résistance interne R_g) → R série → C, sortie v_o = v_C à vide
  // (sonde d'oscilloscope), i_R en mA dans les points. Un seul état : (R_g + R) C dv_o/dt = v_ab − v_o. Entre deux pas, v_ab
  // est constante : la mise à jour exponentielle est exacte et reste stable pour tout R C.
  const generatorResistance = 50;
  function simulateGenerator(state, switching) {
    const f1 = state.fundamentalFrequency; const fs = state.switchingFrequency; const m = state.modulation / 100; const vin = state.generatorVoltage; const r = state.rcResistance * 1000; const c = state.rcCapacitance / 1e6; const omega = 2 * Math.PI * f1;
    const rTotal = generatorResistance + r; const tau = rTotal * c; const cutoff = 1 / (2 * Math.PI * tau);
    const bridge = (time) => pwmVoltage(m * Math.sin(omega * time), triangle(time, fs), vin, switching);
    const dt = 1 / (fs * 48); const decay = Math.exp(-dt / tau);
    // Départ sur le régime sinusoïdal du fondamental : le transitoire de charge de C (jusqu'à
    // 0,1 s) n'a pas à être simulé ; il ne reste à établir que l'ondulation de découpage.
    const gain = 1 / Math.hypot(1, omega * tau); const lag = Math.atan(omega * tau);
    let vo = m * vin * gain * Math.sin(-lag);
    const advance = (time) => { const vab = bridge(time + dt / 2); vo = vab + (vo - vab) * decay; };
    const settleSteps = Math.ceil(4 / f1 / dt);
    for (let index = 0; index < settleSteps; index += 1) advance(index * dt);
    const settle = settleSteps * dt; const duration = 2 / f1; const total = Math.ceil(duration / dt); const keepEvery = Math.max(1, Math.ceil(total / 48000)); const points = [];
    for (let index = 0; index <= total; index += 1) { const t = Math.min(duration, index * dt); const absolute = settle + t; const vab = bridge(absolute + dt / 2); const current = (vab - vo) / rTotal; if (index % keepEvery === 0 || index === total) points.push({ t, vref: m * vin * Math.sin(omega * absolute), vab, vo, vR: r * current, iR: current * 1000 }); if (index < total) advance(absolute); }
    const voFundamental = harmonic(points, "vo", f1); const refFundamental = harmonic(points, "vref", f1);
    return { points, application: "standalone", filter: "rc", fundamentalVoltageRms: voFundamental.rms, expectedVoltageRms: m * vin / Math.sqrt(2) * gain, currentRms: rms(points, "iR") / 1000, phaseDegrees: (voFundamental.phase - refFundamental.phase) * 180 / Math.PI, expectedPhaseDegrees: -lag * 180 / Math.PI, thd: thd(points, "vo", f1), cutoff, generatorResistance, switchingRatio: fs / f1, currentBalance: mean(points, "iR") / 1000, duration };
  }

  function simulateMotor(state, switching, direction, motorView = "transient") {
    const fs = state.motorSwitchingFrequency; const vdc = state.motorDcVoltage; const duty = state.motorDuty / 100; const selectedSign = direction === "reverse" ? -1 : 1; const ra = 1.2; const la = state.armatureInductance / 1000; const ke = .08; const kt = .08; const inertia = state.motorInertia / 1000; const friction = .0015;
    const averageVoltage = switching === "bipolar" ? (2 * duty - 1) * vdc : selectedSign * duty * vdc;
    const motionSign = switching === "bipolar" ? (Math.sign(averageVoltage) || 1) : selectedSign; const loadLimit = state.loadTorque;
    const bridge = (time) => { const c = triangle(time, fs); if (switching === "bipolar") return (2 * duty - 1) >= c ? vdc : -vdc; return ((c + 1) / 2 <= duty) ? selectedSign * vdc : 0; };
    const points = []; let current = 0; let speed = 0; let dt;
    const mechanicalDerivative = (armatureCurrent, angularSpeed) => { const drive = kt * armatureCurrent - friction * angularSpeed; const nearStop = Math.abs(angularSpeed) < 1e-5; if (nearStop && Math.abs(drive) <= loadLimit) return 0; const resistingTorque = loadLimit * Math.sign(nearStop ? drive : angularSpeed); return (drive - resistingTorque) / inertia; };
    const advanceSwitched = (time) => { const va = bridge(time + dt / 2); const emf = ke * speed; const currentNext = current + dt * (va - ra * current - emf) / la; const averageCurrent = (current + currentNext) / 2; speed += dt * mechanicalDerivative(averageCurrent, speed); if (Math.abs(speed) < 1e-8) speed = 0; current = currentNext; };
    const derivative = (armatureCurrent, angularSpeed) => [(averageVoltage - ra * armatureCurrent - ke * angularSpeed) / la, mechanicalDerivative(armatureCurrent, angularSpeed)];
    const advanceAverage = () => { const k1 = derivative(current, speed); const k2 = derivative(current + k1[0] * dt / 2, speed + k1[1] * dt / 2); const k3 = derivative(current + k2[0] * dt / 2, speed + k2[1] * dt / 2); const k4 = derivative(current + k3[0] * dt, speed + k3[1] * dt); current += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); speed += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); if (Math.abs(speed) < 1e-8) speed = 0; };
    let duration; let absoluteStart = 0; let total; let keepEvery; let advance;
    if (motorView === "steady") {
      const samplesPerCycle = 200; dt = 1 / (fs * samplesPerCycle); advance = advanceSwitched;
      const commandedTorqueAtStall = kt * averageVoltage / ra;
      if (Math.abs(commandedTorqueAtStall) <= loadLimit) { speed = 0; current = averageVoltage / ra; }
      else { const load = loadLimit * motionSign; speed = (averageVoltage - ra * load / kt) / (ke + ra * friction / kt); current = (friction * speed + load) / kt; }
      const settleCycles = 80; const settleSteps = settleCycles * samplesPerCycle;
      for (let index = 0; index < settleSteps; index += 1) advance(index * dt);
      absoluteStart = settleCycles / fs; duration = 8 / fs; total = 8 * samplesPerCycle; keepEvery = 1;
    } else {
      duration = 1.2; total = 6000; dt = duration / total; keepEvery = 1; advance = advanceAverage;
    }
    for (let index = 0; index <= total; index += 1) { const time = Math.min(duration, index * dt); const absoluteTime = absoluteStart + time; const va = motorView === "steady" ? bridge(absoluteTime + dt / 2) : averageVoltage; const emf = ke * speed; if (index % keepEvery === 0 || index === total) points.push({ t: time, speedRpm: speed * 60 / (2 * Math.PI), vArmature: va, vAverage: averageVoltage, backEmf: emf, iArmature: current }); if (index < total) advance(absoluteTime); }
    const metricPoints = motorView === "steady" ? points.slice(0, -1) : points.slice(Math.floor(points.length * .9)); const speedRpm = mean(metricPoints, "speedRpm"); const rawCurrentMean = mean(metricPoints, "iArmature"); const currentMean = Math.abs(rawCurrentMean) < 1e-3 ? 0 : rawCurrentMean;
    return { points, application: "motor", averageVoltage, speedRpm, currentMean, currentRms: rms(metricPoints, "iArmature"), electromagneticTorque: kt * currentMean, loadTorque: state.loadTorque, backEmf: mean(metricPoints, "backEmf"), duty, direction, switching, motorView, voltageBalance: mean(metricPoints, "vArmature") - ra * currentMean - mean(metricPoints, "backEmf"), currentBalance: 0, duration };
  }

  function simulateGrid(state, switching, currentControl = "pwm") {
    const frequency = 50; const fs = state.gridSwitchingFrequency; const vrms = state.gridVoltageRms; const desiredRms = state.gridCurrentRms; const phase = state.gridPhase * Math.PI / 180; const l = state.gridInductance / 1000; const r = .25; const vdc = state.gridDcVoltage; const omega = 2 * Math.PI * frequency; const band = state.gridHysteresisBand; const hysteresis = currentControl === "hysteresis"; const kp = hysteresis ? 0 : clamp(2 * Math.PI * l * fs / 10, 5, 250); let current = 0; let bridgeState = 1;
    const desired = (time) => Math.SQRT2 * desiredRms * Math.sin(omega * time + phase); const grid = (time) => Math.SQRT2 * vrms * Math.sin(omega * time); const feedforward = (time) => grid(time) + r * desired(time) + l * omega * Math.SQRT2 * desiredRms * Math.cos(omega * time + phase); const command = (time) => clamp(feedforward(time) + kp * (desired(time) - current), -vdc, vdc);
    const bridge = (time, vc) => {
      if (!hysteresis) return pwmVoltage(vc / vdc, triangle(time, fs), vdc, switching);
      const error = current - desired(time);
      if (error <= -band) bridgeState = 1;
      else if (error >= band) bridgeState = -1;
      return bridgeState * vdc;
    };
    const settle = (hysteresis ? 3 : 6) / frequency; const duration = 2 / frequency; const maximumSlopeVoltage = vdc + Math.SQRT2 * vrms + r * Math.SQRT2 * desiredRms; const hysteresisStep = clamp(band * l / (8 * maximumSlopeVoltage), 1e-7, 1 / (30000 * 24)); const dt = hysteresis ? hysteresisStep : 1 / (fs * 24);
    const advance = (time, bridgeVoltage) => {
      current += dt * (bridgeVoltage - grid(time) - r * current) / l;
      if (!hysteresis) return;
      const nextReference = desired(time + dt); const nextError = current - nextReference;
      if (nextError >= band) { current = nextReference + band; bridgeState = -1; }
      else if (nextError <= -band) { current = nextReference - band; bridgeState = 1; }
    };
    for (let t = 0; t < settle; t += dt) { const vc = hysteresis ? feedforward(t) : command(t); advance(t, bridge(t, vc)); }
    const total = Math.ceil(duration / dt); const keepEvery = Math.max(1, Math.ceil(total / 52000)); const points = []; let transitionCount = 0; let previousBridge = null;
    for (let index = 0; index <= total; index += 1) { const t = Math.min(duration, index * dt); const absolute = settle + t; const vg = grid(absolute); const iref = desired(absolute); const vc = hysteresis ? feedforward(absolute) : command(absolute); const vb = bridge(absolute, vc); if (previousBridge !== null && vb !== previousBridge) transitionCount += 1; previousBridge = vb; if (index % keepEvery === 0 || index === total) points.push({ t, vGrid: vg, iReference: iref, iGrid: current, vBridge: vb, vCommand: vc, iError: current - iref, errorUpper: band, errorLower: -band }); if (index < total) advance(absolute, vb); }
    const iFund = harmonic(points, "iGrid", frequency); const vFund = harmonic(points, "vGrid", frequency); const measuredPhase = iFund.phase - vFund.phase; const currentRms = rms(points, "iGrid"); const activePower = points.reduce((sum, point) => sum + point.vGrid * point.iGrid, 0) / points.length; const apparentPower = vrms * currentRms;
    return { points, application: "grid", currentControl, hysteresisBand: band, switchingFrequencyMeasured: hysteresis ? transitionCount / (2 * duration) : fs, currentRms, currentFundamentalRms: iFund.rms, currentThd: thd(points, "iGrid", frequency), activePower, reactivePower: vrms * iFund.rms * Math.sin(measuredPhase), apparentPower, powerFactor: apparentPower > 1e-9 ? activePower / apparentPower : 0, measuredPhase: measuredPhase * 180 / Math.PI, trackingErrorRms: rms(points, "iError"), controllerGain: kp, voltageBalance: mean(points, "vBridge") - mean(points, "vGrid"), currentBalance: mean(points, "iError"), frequency, duration };
  }

  const model = {
    id: "pont-h",
    defaults: { fundamentalFrequency: 50, modulation: 80, switchingFrequency: 10000, filterInductance: 3, filterCapacitance: 20, dcVoltage: 200, motorDuty: 66, loadTorque: .25, motorSwitchingFrequency: 10000, motorDcVoltage: 48, armatureInductance: 8, motorInertia: 2.5, gridCurrentRms: 8, gridPhase: 0, gridSwitchingFrequency: 20000, gridHysteresisBand: .2, gridInductance: 10, gridVoltageRms: 230, gridDcVoltage: 400, loadResistance: 12, loadInductance: 20, rcResistance: 1, rcCapacitance: 1, generatorVoltage: 5, glcInductance: 100, glcCapacitance: 1, glcLoadResistance: 1, glcWindingResistance: 0 },
    controls: controls.standalone,
    controlsFor(application, options = {}) {
      if (application === "standalone" && options.filter === "rc") return controls.generator;
      if (application === "standalone" && options.filter === "glc") return controls.generatorLc;
      const selected = controls[application] || controls.standalone;
      if (application === "motor" && !options.advanced) {
        return {
          ...selected,
          top: [...selected.top, selected.bottom[0]],
          bottom: selected.bottom.slice(1),
        };
      }
      if (application !== "grid") return selected;
      const controlKey = options.currentControl === "hysteresis" ? "gridHysteresisBand" : "gridSwitchingFrequency";
      const top = selected.top.filter((item) => item.key !== "gridSwitchingFrequency" && item.key !== "gridHysteresisBand" || item.key === controlKey);
      if (!options.advanced) return { ...selected, top };
      const inductance = top.find((item) => item.key === "gridInductance");
      return { ...selected, top: top.filter((item) => item.key !== "gridInductance"), bottom: [inductance, ...selected.bottom] };
    },
    diagram: { type: "inline", aria: text("H-bridge power converter", "Convertisseur à pont en H", "Convertidor en puente H") },
    diagramTitleFor(application, switching, language, currentControl, filter) { return bridgeTitle(application, switching, language, currentControl, filter); },
    diagramFor(application, switching, language, currentControl, filter) { if (application === "standalone" && filter === "rc") return generatorSvg(language); if (application === "standalone" && filter === "glc") return generatorLcSvg(language); return bridgeSvg(application, switching, language, currentControl); },
    plots: plots.standalone,
    plotsFor(application, _switching, motorView = "transient", currentControl = "pwm", filter = "lc") { if (application === "standalone" && filter === "rc") return plots.generator; if (application === "motor" && motorView !== "steady") return motorTransientPlots; if (application === "grid" && currentControl === "hysteresis") return gridHysteresisPlots; return plots[application] || plots.standalone; },
    basicPlotsFor(application, motorView = "transient") { if (application !== "motor") return null; return motorView === "steady" ? motorBasicSteadyPlots : motorBasicTransientPlots; },
    axesFor(application, isAdvanced = false, mode = {}) {
      if (application === "standalone" && (mode.filter === "rc" || mode.filter === "glc")) return [{ label: text("voltage", "tension", "tensión"), unit: "V" }, { label: text("voltage", "tension", "tensión"), unit: "V" }, { label: text("current", "courant", "corriente"), unit: "mA" }];
      if (application === "motor" && !isAdvanced) return [{ label: text("speed", "vitesse", "velocidad"), unit: "tr/min" }, { label: text("voltage", "tension", "tensión"), unit: "V", rightLabel: text("armature current", "courant d’induit", "corriente de armadura"), rightUnit: "A" }];
      if (application === "motor") return [{ label: text("speed", "vitesse", "velocidad"), unit: "tr/min" }, { label: text("voltage", "tension", "tensión"), unit: "V" }, { label: text("current", "courant", "corriente"), unit: "A" }];
      if (application === "grid") return [{ label: text("grid voltage", "tension réseau", "tensión de red"), unit: "V", rightLabel: text("grid current", "courant réseau", "corriente de red"), rightUnit: "A" }, { label: text("voltage", "tension", "tensión"), unit: "V" }, { label: text("current error", "erreur de courant", "error de corriente"), unit: "A" }];
      return [{ label: text("voltage", "tension", "tensión"), unit: "V" }, { label: text("voltage", "tension", "tensión"), unit: "V" }, { label: text("current", "courant", "corriente"), unit: "A" }];
    },
    calculate(state, _commutation, options = {}) { if (options.application === "motor") return simulateMotor(state, options.switching || "bipolar", options.direction || "forward", options.motorView || "transient"); if (options.application === "grid") return simulateGrid(state, options.switching || "bipolar", options.currentControl || "pwm"); if (options.filter === "rc") return simulateGenerator(state, options.switching || "bipolar"); if (options.filter === "glc") return simulateGeneratorLc(state, options.switching || "bipolar"); return simulateStandalone(state, options.switching || "bipolar"); },
  };
  window.converterModels = window.converterModels || {};
  window.converterModels["pont-h"] = Object.freeze(model);
})();
