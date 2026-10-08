(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // UI strings, one object per language (fr, en, es). To add a language: add a sibling
  // object here and a button in the language menu of index.html.
  // ---------------------------------------------------------------------------
  const STRINGS = {
    fr: {
      locale: "fr-FR",
      documentTitle: "Réglage PID",
      title: "Réglage PID",
      modeAria: "Type de procédé",
      mode1: "1er ordre",
      mode2: "2e ordre",
      mode3: "Courbe en S",
      themeDark: "Activer le thème sombre",
      themeLight: "Activer le thème clair",
      languageAria: "Langue",
      reframe: "Recadrer",
      autoAxes: "Axes auto",
      memorize: "Mémoriser",
      clear: "Effacer",
      randomize: "Aléatoire",
      graphAria: "Courbes en fonction du temps. Glissez sur le graphe pour déplacer le curseur le plus proche.",
      cursor1: "Curseur 1",
      cursor2: "Curseur 2",
      cursorsAria: "Curseurs de lecture",
      snap: "Aimant extremums",
      cursorsToggle: "Curseurs",
      marksAria: "Repères",
      markBand: "y_{∞} ± 5 %",
      markTau: "63 % et τ",
      markEnvelope: "Enveloppe",
      markTangent: "Tangente et L",
      markFinal: "y_{∞}",
      markModel: "Modèle identifié",
      timeAxis: "t (s)",
      paramsTitle: "Paramètres",
      eqTitle: { 1: "Équation différentielle", 2: "Équation différentielle", 3: "Modèle identifié (approché)" },
      regimeLabel: "Régime :",
      sLimit: "L minimum : {r} τ",
      regimes: { undamped: "non amorti", under: "sous-amorti", critical: "amortissement critique", over: "sur-amorti" },
      valuesTitle: "Valeurs caractéristiques",
      finalValue: "Valeur finale",
      valueAtTau: "Valeur à t = τ",
      overshoot: "Dépassement",
      dampedPeriod: "Pseudo-période",
      period: "Période des oscillations",
      dampedPulsation: "Pseudo-pulsation",
      settling: "Temps de réponse à 5 %",
      theory: "théorie",
      measured: "mesuré",
      inverse: "inverse",
      overshootFraction: "avec D en fraction ({D}), pas en %",
      noOvershoot: "pas de dépassement pour ξ ≥ 1",
      settlingNone: "non défini : l’oscillation ne s’amortit pas",
      staticGain: "Gain statique",
      steepest: "Point le plus raide",
      apparentDelay: "Retard apparent",
      timeConstant: "Constante de temps",
      identifiedModel: "Modèle identifié",
      znTitle: "Réglage Ziegler–Nichols",
      znAria: "Régulateur",
      znRegulator: "Régulateur",
      znNotApplicable: "Pas de retard (L = 0) : la méthode de Ziegler–Nichols ne s’applique pas.",
      viewAria: "Vue",
      viewLoop: "Boucle fermée",
      viewElements: "Réponses indicielles des éléments",
      viewElementsShort: "Éléments",
      elementAria: "Élément",
      elProcess: "Procédé",
      elSensor: "Capteur",
      elCtrl: "Correcteur",
      diagramAria: "Schéma de la boucle : r, ε, correcteur, u, procédé, y, capteur, y_{m}, retour soustrait",
      setpointTitle: "Consigne",
      ctrlTitle: "Correcteur",
      processTitle: "Procédé",
      sensorTitle: "Capteur",
      saturation: "Saturation de la commande",
      znApply: "Réglage Z-N : {type}",
      znTableShow: "Table de Ziegler–Nichols",
      znFrom: "Lu sur la courbe de réaction",
      znFromChain: "Lu sur la courbe de réaction (procédé + capteur)",
      staticError: "Erreur statique",
      overshootInd: "Dépassement",
      unstable: "La boucle bascule",
      notSettled: "régime non établi",
      ofSetpoint: "de r",
      markTauC: "63 % et τ_{c}",
      markActions: "Actions P, I, D",
      eqLaw: "Loi de commande",
      eqSensor: "Équation du capteur",
      perfectSensor: "τ_{c} = 0 : capteur parfait",
      sensorLabel: "Capteur :",
      sensorValue: "premier ordre de gain 1",
      indAmplitude: "Oscillation (crête à crête)",
      indPeriod: "Période",
      indSwitches: "Commutations",
      unreachable: "Consigne hors d’atteinte : il faut K u_{min} < r < K u_{max}",
      znHyst: "Pas de réglage Z-N pour la commande tout-ou-rien.",
      lawIf: "si",
      lawKeep: "inchangée",
      lawElse: "sinon",
      thresholdsLabel: "Seuils :",
      thresholds: "marche quand y_{m} ≤ {lo}, arrêt quand y_{m} ≥ {hi}",
      fieldAria: "valeur",
      negative: "nég.",
      negativeAria: { K: "Gain statique négatif", u0: "Échelon négatif", Kp: "Gain proportionnel négatif", uLow: "Commande « arrêt » négative" },
      sliderAria: "curseur",
      params: {
        K: "Gain statique",
        tau: "Constante de temps",
        omega0: "Pulsation propre",
        xi: "Amortissement",
        u0: "Amplitude de l’échelon",
        L: "Retard apparent",
        Kp: "Gain proportionnel",
        Ti: "Temps d’intégration",
        Td: "Temps de dérivation",
        tauC: "Constante de temps du capteur",
        r0: "Échelon de consigne",
        uMax: "Limite de la commande (±)",
        band: "Largeur de la bande d’hystérésis",
        uHigh: "Commande « marche »",
        uLow: "Commande « arrêt »",
        sensorNoise: "Bruit de mesure (en % du saut de y)",
      },
    },
    en: {
      locale: "en-US",
      documentTitle: "PID tuning",
      title: "PID tuning",
      modeAria: "Kind of process",
      mode1: "1st order",
      mode2: "2nd order",
      mode3: "S-curve",
      themeDark: "Switch to dark theme",
      themeLight: "Switch to light theme",
      languageAria: "Language",
      reframe: "Reframe",
      autoAxes: "Auto axes",
      memorize: "Store",
      clear: "Clear",
      randomize: "Random",
      graphAria: "Curves versus time. Drag on the graph to move the nearest cursor.",
      cursor1: "Cursor 1",
      cursor2: "Cursor 2",
      cursorsAria: "Read cursors",
      snap: "Snap to extrema",
      cursorsToggle: "Cursors",
      marksAria: "Markers",
      markBand: "y_{∞} ± 5 %",
      markTau: "63 % and τ",
      markEnvelope: "Envelope",
      markTangent: "Tangent and L",
      markFinal: "y_{∞}",
      markModel: "Identified model",
      timeAxis: "t (s)",
      paramsTitle: "Parameters",
      eqTitle: { 1: "Differential equation", 2: "Differential equation", 3: "Identified model (approximate)" },
      regimeLabel: "Regime:",
      sLimit: "Minimum L: {r} τ",
      regimes: { undamped: "undamped", under: "underdamped", critical: "critically damped", over: "overdamped" },
      valuesTitle: "Characteristic values",
      finalValue: "Final value",
      valueAtTau: "Value at t = τ",
      overshoot: "Overshoot",
      dampedPeriod: "Pseudo-period",
      period: "Oscillation period",
      dampedPulsation: "Damped frequency",
      settling: "5 % settling time",
      theory: "theory",
      measured: "measured",
      inverse: "inverse",
      overshootFraction: "with D as a fraction ({D}), not in %",
      noOvershoot: "no overshoot for ξ ≥ 1",
      settlingNone: "undefined: the oscillation does not decay",
      staticGain: "Static gain",
      steepest: "Steepest point",
      apparentDelay: "Apparent delay",
      timeConstant: "Time constant",
      identifiedModel: "Identified model",
      znTitle: "Ziegler–Nichols tuning",
      znAria: "Controller",
      znRegulator: "Controller",
      znNotApplicable: "No delay (L = 0): the Ziegler–Nichols method does not apply.",
      viewAria: "View",
      viewLoop: "Closed loop",
      viewElements: "Step responses of the blocks",
      viewElementsShort: "Blocks",
      elementAria: "Block",
      elProcess: "Process",
      elSensor: "Sensor",
      elCtrl: "Controller",
      diagramAria: "Loop diagram: r, ε, controller, u, process, y, sensor, y_{m}, subtracted feedback",
      setpointTitle: "Setpoint",
      ctrlTitle: "Controller",
      processTitle: "Process",
      sensorTitle: "Sensor",
      saturation: "Control saturation",
      znApply: "Z-N tuning: {type}",
      znTableShow: "Ziegler–Nichols table",
      znFrom: "Read on the reaction curve",
      znFromChain: "Read on the reaction curve (process + sensor)",
      staticError: "Steady-state error",
      overshootInd: "Overshoot",
      unstable: "The loop goes unstable",
      notSettled: "not settled yet",
      ofSetpoint: "of r",
      markTauC: "63 % and τ_{c}",
      markActions: "P, I, D actions",
      eqLaw: "Control law",
      eqSensor: "Sensor equation",
      perfectSensor: "τ_{c} = 0: perfect sensor",
      sensorLabel: "Sensor:",
      sensorValue: "first order, gain 1",
      indAmplitude: "Oscillation (peak to peak)",
      indPeriod: "Period",
      indSwitches: "Switchings",
      unreachable: "Setpoint out of reach: K u_{min} < r < K u_{max} is needed",
      znHyst: "No Z-N tuning for on-off control.",
      lawIf: "if",
      lawKeep: "unchanged",
      lawElse: "otherwise",
      thresholdsLabel: "Thresholds:",
      thresholds: "on when y_{m} ≤ {lo}, off when y_{m} ≥ {hi}",
      fieldAria: "value",
      negative: "neg.",
      negativeAria: { K: "Negative static gain", u0: "Negative step", Kp: "Negative proportional gain", uLow: "Negative « off » command" },
      sliderAria: "slider",
      params: {
        K: "Static gain",
        tau: "Time constant",
        omega0: "Natural frequency",
        xi: "Damping ratio",
        u0: "Step amplitude",
        L: "Apparent delay",
        Kp: "Proportional gain",
        Ti: "Integral time",
        Td: "Derivative time",
        tauC: "Sensor time constant",
        r0: "Setpoint step",
        uMax: "Control limit (±)",
        band: "Hysteresis band width",
        uHigh: "« On » command",
        uLow: "« Off » command",
        sensorNoise: "Measurement noise (in % of the jump of y)",
      },
    },
    es: {
      locale: "es-ES",
      documentTitle: "Ajuste PID",
      title: "Ajuste PID",
      modeAria: "Tipo de proceso",
      mode1: "1º orden",
      mode2: "2º orden",
      mode3: "Curva en S",
      themeDark: "Activar el tema oscuro",
      themeLight: "Activar el tema claro",
      languageAria: "Idioma",
      reframe: "Reencuadrar",
      autoAxes: "Ejes auto",
      memorize: "Memorizar",
      clear: "Borrar",
      randomize: "Aleatorio",
      graphAria: "Curvas en función del tiempo. Arrastra sobre el gráfico para mover el cursor más cercano.",
      cursor1: "Cursor 1",
      cursor2: "Cursor 2",
      cursorsAria: "Cursores de lectura",
      snap: "Imán a extremos",
      cursorsToggle: "Cursores",
      marksAria: "Marcas",
      markBand: "y_{∞} ± 5 %",
      markTau: "63 % y τ",
      markEnvelope: "Envolvente",
      markTangent: "Tangente y L",
      markFinal: "y_{∞}",
      markModel: "Modelo identificado",
      timeAxis: "t (s)",
      paramsTitle: "Parámetros",
      eqTitle: { 1: "Ecuación diferencial", 2: "Ecuación diferencial", 3: "Modelo identificado (aproximado)" },
      regimeLabel: "Régimen:",
      sLimit: "L mínimo: {r} τ",
      regimes: { undamped: "no amortiguado", under: "subamortiguado", critical: "amortiguamiento crítico", over: "sobreamortiguado" },
      valuesTitle: "Valores característicos",
      finalValue: "Valor final",
      valueAtTau: "Valor en t = τ",
      overshoot: "Sobrepaso",
      dampedPeriod: "Pseudoperíodo",
      period: "Período de las oscilaciones",
      dampedPulsation: "Pseudopulsación",
      settling: "Tiempo de respuesta al 5 %",
      theory: "teoría",
      measured: "medido",
      inverse: "inversa",
      overshootFraction: "con D en fracción ({D}), no en %",
      noOvershoot: "sin sobrepaso para ξ ≥ 1",
      settlingNone: "no definido: la oscilación no se amortigua",
      staticGain: "Ganancia estática",
      steepest: "Punto de máxima pendiente",
      apparentDelay: "Retardo aparente",
      timeConstant: "Constante de tiempo",
      identifiedModel: "Modelo identificado",
      znTitle: "Ajuste Ziegler–Nichols",
      znAria: "Regulador",
      znRegulator: "Regulador",
      znNotApplicable: "Sin retardo (L = 0): el método de Ziegler–Nichols no se aplica.",
      viewAria: "Vista",
      viewLoop: "Lazo cerrado",
      viewElements: "Respuestas al escalón de los bloques",
      viewElementsShort: "Bloques",
      elementAria: "Bloque",
      elProcess: "Proceso",
      elSensor: "Sensor",
      elCtrl: "Corrector",
      diagramAria: "Esquema del lazo: r, ε, corrector, u, proceso, y, sensor, y_{m}, realimentación restada",
      setpointTitle: "Consigna",
      ctrlTitle: "Corrector",
      processTitle: "Proceso",
      sensorTitle: "Sensor",
      saturation: "Saturación del mando",
      znApply: "Ajuste Z-N: {type}",
      znTableShow: "Tabla de Ziegler–Nichols",
      znFrom: "Leído en la curva de reacción",
      znFromChain: "Leído en la curva de reacción (proceso + sensor)",
      staticError: "Error estático",
      overshootInd: "Sobrepaso",
      unstable: "El lazo se desestabiliza",
      notSettled: "régimen no establecido",
      ofSetpoint: "de r",
      markTauC: "63 % y τ_{c}",
      markActions: "Acciones P, I, D",
      eqLaw: "Ley de control",
      eqSensor: "Ecuación del sensor",
      perfectSensor: "τ_{c} = 0: sensor perfecto",
      sensorLabel: "Sensor:",
      sensorValue: "primer orden de ganancia 1",
      indAmplitude: "Oscilación (pico a pico)",
      indPeriod: "Período",
      indSwitches: "Conmutaciones",
      unreachable: "Consigna inalcanzable: hace falta K u_{min} < r < K u_{max}",
      znHyst: "No hay ajuste Z-N para el mando todo o nada.",
      lawIf: "si",
      lawKeep: "sin cambio",
      lawElse: "si no",
      thresholdsLabel: "Umbrales:",
      thresholds: "marcha cuando y_{m} ≤ {lo}, parada cuando y_{m} ≥ {hi}",
      fieldAria: "valor",
      negative: "neg.",
      negativeAria: { K: "Ganancia estática negativa", u0: "Escalón negativo", Kp: "Ganancia proporcional negativa", uLow: "Mando « parada » negativo" },
      sliderAria: "control deslizante",
      params: {
        K: "Ganancia estática",
        tau: "Constante de tiempo",
        omega0: "Pulsación propia",
        xi: "Amortiguamiento",
        u0: "Amplitud del escalón",
        L: "Retardo aparente",
        Kp: "Ganancia proporcional",
        Ti: "Tiempo integral",
        Td: "Tiempo derivativo",
        tauC: "Constante de tiempo del sensor",
        r0: "Escalón de consigna",
        uMax: "Límite del mando (±)",
        band: "Ancho de la banda de histéresis",
        uHigh: "Mando « marcha »",
        uLow: "Mando « parada »",
        sensorNoise: "Ruido de medida (en % del salto de y)",
      },
    },
  };
  // Typography: no line break inside « … » (non-breaking spaces next to the guillemets).
  (function keepGuillemets(texts) {
    Object.keys(texts).forEach((key) => {
      if (typeof texts[key] === "string") texts[key] = texts[key].replace(/« /g, "«\u00a0").replace(/ »/g, "\u00a0»");
      else if (texts[key] && typeof texts[key] === "object") keepGuillemets(texts[key]);
    });
  })(STRINGS);
  let S = STRINGS.fr;

  // ---------------------------------------------------------------------------
  // Parameters. Process: one list per type (mode 1: first order, 2: second order, 3: order n,
  // S-shaped reaction curve). Then the controller, the sensor and the loop. Log sliders map
  // 0..LOG_STEPS onto [min, max]; « logZero » sliders keep position 0 for the value 0.
  // ---------------------------------------------------------------------------
  const LOG_STEPS = 2000;
  const WHEEL_LOG_STEPS = 10; // log-slider positions per wheel notch
  const WHEEL_PIXELS_PER_STEP = 100; // one slider step per wheel notch (≈ 100 px); trackpads add up
  // Values typed in a field may leave the slider range (the slider then sits at its end),
  // within these physical limits. K and u0 are magnitudes: their sign is a separate box.
  const LIMITS = {
    K: { min: 1e-6, max: 1e6 },
    tau: { min: 1e-4, max: 1e4 },
    omega0: { min: 1e-3, max: 1e4 },
    xi: { min: 0, max: 100 },
    u0: { min: 1e-6, max: 1e6 },
    L: { min: 0, max: 1e4 },
    Kp: { min: 1e-6, max: 1e6 },
    Ti: { min: 1e-4, max: 1e6 },
    Td: { min: 0, max: 1e5 },
    tauC: { min: 0, max: 1e4 },
    r0: { min: 1e-6, max: 1e6 },
    uMax: { min: 1e-6, max: 1e9 },
    band: { min: 0, max: 1e6 },
    uHigh: { min: 1e-6, max: 1e9 },
    uLow: { min: 0, max: 1e9 },
    sensorNoise: { min: 0, max: 20 },
  };
  function withinLimits(def, value) {
    const lim = LIMITS[def.key];
    return Number.isFinite(value) && value >= lim.min && value <= lim.max && (!def.integer || Number.isInteger(value));
  }
  function clampToLimits(def, value) {
    const lim = LIMITS[def.key];
    const clamped = Math.min(lim.max, Math.max(lim.min, value));
    return def.integer ? Math.round(clamped) : clamped;
  }

  const PARAMS = {
    1: [
      { key: "K", symbol: "K", signed: true, min: 0.01, max: 1000, log: true, value: 2 },
      { key: "tau", symbol: "τ", unit: "s", min: 0.05, max: 50, log: true, value: 5 },
      { key: "u0", symbol: "u", index: "0", signed: true, min: 0.1, max: 20, step: 0.1, value: 1, only: "process" },
    ],
    2: [
      { key: "K", symbol: "K", signed: true, min: 0.01, max: 1000, log: true, value: 2 },
      { key: "omega0", symbol: "ω", index: "0", unit: "rad/s", min: 0.5, max: 50, log: true, value: 5 },
      { key: "xi", symbol: "ξ", min: 0, max: 3, step: 0.01, value: 0.2 },
      { key: "u0", symbol: "u", index: "0", signed: true, min: 0.1, max: 20, step: 0.1, value: 1, only: "process" },
    ],
    3: [
      { key: "K", symbol: "K", signed: true, min: 0.01, max: 1000, log: true, value: 2 },
      { key: "L", symbol: "L", unit: "s", min: 0.01, max: 1000, log: true, value: 12 },
      { key: "tau", symbol: "τ", unit: "s", min: 0.1, max: 1000, log: true, value: 30 },
      { key: "u0", symbol: "u", index: "0", signed: true, min: 0.1, max: 20, step: 0.1, value: 1, only: "process" },
    ],
  };
  // Controller u = Kp (ε + (1/Ti) ∫ε dt + Td dε/dt) (polycopié 4); Ti for PI and PID, Td for PID.
  // « Hyst. »: on-off control with a hysteresis band (polycopié 1): u_max (on) when ε >= Δ/2,
  // u_min (off) when ε <= -Δ/2, unchanged in between.
  const CTRL_PARAMS = [
    { key: "Kp", group: "ctrl", symbol: "K", index: "p", signed: true, min: 0.01, max: 1000, log: true, value: 1, types: ["P", "PI", "PID"] },
    { key: "Ti", group: "ctrl", symbol: "T", index: "i", unit: "s", min: 0.1, max: 1000, log: true, value: 10, types: ["PI", "PID"] },
    { key: "Td", group: "ctrl", symbol: "T", index: "d", unit: "s", min: 0.01, max: 100, log: true, value: 1, types: ["PID"] },
    { key: "band", group: "ctrl", symbol: "Δ", min: 0.001, max: 10, logZero: true, value: 0.1, types: ["Hyst"] },
    { key: "uHigh", group: "ctrl", symbol: "u", index: "max", min: 0.01, max: 1000, log: true, value: 1, types: ["Hyst"] },
    { key: "uLow", group: "ctrl", symbol: "u", index: "min", signed: true, min: 0.01, max: 1000, logZero: true, value: 0, types: ["Hyst"] },
  ];
  const SENSOR_PARAMS = [
    { key: "tauC", group: "sensor", symbol: "τ", index: "c", unit: "s", min: 0.01, max: 100, logZero: true, value: 0, only: "loop sensor" },
    // Measurement noise of the sensor, one setting for both views (standard deviation in % of
    // the jump of y): it is on y_m, never on y. Loop: added to y_m (% of r); step responses:
    // the sensor curve y_m for a unit step of y, as noisy samples (% of that step).
    { key: "sensorNoise", group: "sensor", symbol: "σ", unit: "%", min: 0, max: 5, step: 0.1, value: 0 },
  ];
  const SETPOINT_PARAMS = [
    { key: "r0", group: "loop", symbol: "r", index: "0", min: 0.1, max: 20, step: 0.1, value: 1 },
  ];
  const SAT_PARAMS = [
    { key: "uMax", group: "loop", symbol: "u", index: "max", min: 0.01, max: 1000, log: true, value: 5, withSaturation: true },
  ];
  const N_FILTER = 10; // derivative filter: Td s / (1 + Td s / N)
  const LOOP_OUTPUT_POINTS = 3000; // stored points of a closed-loop run
  const MAX_LOOP_STEPS = 250000;
  const NOISE_SAMPLES = 400; // samples per default frame when the noise is on
  const MAX_SAMPLES = 4000;

  // « Aléatoire » ranges: [min, max] drawn log-uniformly (log) or uniformly; « times »: a
  // fraction of an other parameter drawn before (the apparent delay L, as a fraction of tau).
  const RANDOM = {
    1: { K: { min: 0.5, max: 50, log: true }, tau: { min: 0.2, max: 20, log: true } },
    2: { K: { min: 0.5, max: 50, log: true }, omega0: { min: 1, max: 20, log: true }, xi: { min: 0.1, max: 0.8 } },
    3: { K: { min: 0.5, max: 50, log: true }, tau: { min: 2, max: 100, log: true }, L: { min: 0.16, max: 0.8, times: "tau" } },
  };

  const CRITICAL_TOL = 1e-6;
  const MATH_FONT = '"KaTeX_Math", "Cambria Math", "Times New Roman", serif';
  const CURSOR_DEFAULTS = [0.25, 0.5]; // default cursor places, as fractions of the time axis
  const F63 = 1 - Math.exp(-1); // the « 63 % » of the polycopiés

  const state = {
    view: "loop", // « Boucle fermée » or « elements » (step responses of the blocks)
    elements: { process: true, sensor: false, ctrl: false }, // blocks shown (superposed) in the « elements » view
    showCursors: true, // read cursors and their readout (hidden: more room for the curves)
    mode: 1, // process type
    params: { 1: defaults(1), 2: defaults(2), 3: defaults(3) },
    seed: newSeedValue(), // noise realisation: changes with « Aléatoire » or a parameter, not with a cursor
    marks: { band: false, tau: false, envelope: false, tangent: false, zntau: false, final: false, model: false, tauc: false, actions: true },
    ctrl: { type: "P", ...Object.fromEntries(CTRL_PARAMS.map((def) => [def.key, def.value])) },
    ctrlSign: { Kp: 1, uLow: 1 },
    sensor: Object.fromEntries(SENSOR_PARAMS.map((def) => [def.key, def.value])),
    loopSeed: newSeedValue(), // noise of the loop: stays while the settings move (redrawn by « Aléatoire »)
    loop: { r0: SETPOINT_PARAMS[0].value, sat: false, uMax: SAT_PARAMS[0].value },
    regulator: "PID", // Ziegler–Nichols row shown
    autoAxes: true, // « Axes auto » checked at start
    snap: true, // cursors snap to the extrema of the active curve (2nd order alone, y in the loop)
    sign: { 1: { K: 1, u0: 1 }, 2: { K: 1, u0: 1 }, 3: { K: 1, u0: 1 } }, // signs of K and u0 (sliders set magnitudes)
    axes: { tMax: 1, yMin: 0, yMax: 1, uMin: -1, uMax: 1 }, // fixed axes (u: closed loop only)
    cursors: [ // read cursors; t is a time (s)
      { on: false, t: 0 },
      { on: false, t: 0 },
    ],
    memory: null, // { context, t, y, u } of the stored curve (u: closed loop only)
    dark: false,
  };

  // Parameters actually simulated: K and u0 carry their signs.
  function current() {
    const p = state.params[state.mode];
    const sign = state.sign[state.mode];
    return { ...p, K: sign.K * p.K, u0: sign.u0 * p.u0 };
  }

  // Controller actually simulated: Kp carries its sign.
  function controller() { return { ...state.ctrl, Kp: state.ctrlSign.Kp * state.ctrl.Kp, uLow: state.ctrlSign.uLow * state.ctrl.uLow }; }

  function defaults(mode) { return Object.fromEntries(PARAMS[mode].map((def) => [def.key, def.value])); }
  function newSeedValue() { return Math.floor(Math.random() * 0x7fffffff); }

  // ---------------------------------------------------------------------------
  // Number formatting (language locale, 3 significant digits).
  // ---------------------------------------------------------------------------
  let sig3;
  let sig3Short;
  function setNumberFormats() {
    sig3 = new Intl.NumberFormat(S.locale, { minimumSignificantDigits: 3, maximumSignificantDigits: 3 });
    sig3Short = new Intl.NumberFormat(S.locale, { maximumSignificantDigits: 3 });
  }
  setNumberFormats();
  const round3 = (value) => Number(value.toPrecision(3));
  const fmt = (value) => (value === 0 ? "0" : sig3.format(value));
  function tex(value) {
    if (value === 0) return "0";
    const magnitude = Math.abs(value);
    if (magnitude < 1e-3 || magnitude >= 1e6) {
      const exponent = Math.floor(Math.log10(magnitude));
      let mantissa = round3(value / Math.pow(10, exponent));
      let power = exponent;
      if (Math.abs(mantissa) >= 10) { mantissa /= 10; power += 1; }
      return `${tex(mantissa)}\\cdot 10^{${power}}`;
    }
    return sig3.formatToParts(value).map((part) => {
      if (part.type === "decimal") return part.value === "," ? "{,}" : part.value;
      if (part.type === "group") return "\\,";
      if (part.type === "minusSign") return "-";
      return part.value;
    }).join("");
  }
  // Exact short decimals (0,9 ; 1,2 ; 3,3) in TeX, with the language decimal separator.
  const texConst = (value) => String(value).replace(".", S.locale.startsWith("en") ? "." : "{,}");
  function parseNumber(text) {
    const cleaned = String(text).trim().replace(/[\s  ]/g, "").replace(",", ".");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(cleaned)) return NaN;
    return Number(cleaned);
  }

  // ---------------------------------------------------------------------------
  // Analytic step responses (zero initial conditions, step u0 at t = 0). Pure functions of
  // (mode, parameters): the reaction-curve process is meant to be reused by a later
  // closed-loop simulation.
  // ---------------------------------------------------------------------------
  function regimeOf(xi) {
    if (xi === 0) return "undamped";
    if (Math.abs(xi - 1) < CRITICAL_TOL) return "critical";
    return xi < 1 ? "under" : "over";
  }

  // Step response of 1/(1 + T s)^n, as a function of x = t/T (Erlang distribution function):
  // 1 - e^{-x} * sum_{k<n} x^k / k!.
  function cascadeStep(n, x) {
    if (x <= 0) return 0;
    let term = 1;
    let sum = 1;
    for (let k = 1; k < n; k += 1) { term *= x / k; sum += term; }
    return 1 - Math.exp(-x) * sum;
  }
  // Its derivative with respect to x: x^{n-1} e^{-x} / (n-1)!.
  function cascadeSlope(n, x) {
    if (x < 0) return 0;
    let value = Math.exp(-x);
    for (let k = 1; k < n; k += 1) value *= x / k;
    return value;
  }

  // ---------------------------------------------------------------------------
  // S-shaped process. The interface knows only K, L, tau (polycopié 4). Inside, a real S:
  // n equal first-order lags T in cascade + a pure delay theta, chosen so that the
  // construction of the polycopié (tangent at the steepest point -> L; 63 % of the rise
  // from the end of the delay -> tau) gives back exactly the L and tau of the sliders.
  // c1(n), c2(n): L and tau read on the cascade alone (theta = 0, T = 1); the construction
  // scales with T and shifts with theta. n: the largest one with c1/c2 <= L/tau, at least 2
  // (a real S), hence L/tau >= c1(2)/c2(2) ≈ 0.151, enforced on the sliders.
  // ---------------------------------------------------------------------------
  const S_STAGES = [2, 3, 4];
  let S_CONSTANTS = null; // [{ n, c1, c2 }], computed once below
  function cascadeOf(p) {
    const ratio = p.L / p.tau;
    let pick = S_CONSTANTS[0];
    S_CONSTANTS.forEach((c) => { if (c.c1 / c.c2 <= ratio * (1 + 1e-12)) pick = c; });
    const T = p.tau / pick.c2;
    return { n: pick.n, T, theta: Math.max(0, p.L - pick.c1 * T) };
  }
  // Parameters with the hidden cascade (n, T, theta) added, if not given already.
  const withCascade = (p) => (p.n !== undefined ? p : { ...p, ...cascadeOf(p) });

  // Hidden S process: K e^{-theta s} / (1 + T s)^n, step u0 at t = 0.
  function processResponse(p) {
    p = withCascade(p);
    const yInf = p.K * p.u0;
    return (t) => yInf * cascadeStep(p.n, (t - p.theta) / p.T);
  }
  function processSlope(p) {
    p = withCascade(p);
    const yInf = p.K * p.u0;
    return (t) => (t < p.theta ? 0 : yInf / p.T * cascadeSlope(p.n, (t - p.theta) / p.T));
  }

  function makeResponse(mode, p) {
    if (mode === 3) return processResponse(p);
    const yInf = p.K * p.u0;
    if (mode === 1) return (t) => yInf * (1 - Math.exp(-t / p.tau));
    const { omega0: w0, xi } = p;
    switch (regimeOf(xi)) {
      case "undamped":
        return (t) => yInf * (1 - Math.cos(w0 * t));
      case "under": {
        const root = Math.sqrt(1 - xi * xi);
        const wd = w0 * root;
        const ratio = xi / root;
        return (t) => yInf * (1 - Math.exp(-xi * w0 * t) * (Math.cos(wd * t) + ratio * Math.sin(wd * t)));
      }
      case "critical":
        return (t) => yInf * (1 - Math.exp(-w0 * t) * (1 + w0 * t));
      default: {
        const root = Math.sqrt(xi * xi - 1);
        const s1 = -w0 / (xi + root); // = -w0 (xi - root), without cancellation for large xi
        const s2 = -w0 * (xi + root);
        return (t) => yInf * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2));
      }
    }
  }

  // Slow pole magnitude |s1| for xi >= 1.
  function slowPole(p) { return p.omega0 / (p.xi + Math.sqrt(Math.max(p.xi * p.xi - 1, 0))); }

  // Reframing horizon: 6 tau; 8/(xi w0); 4 periods; 6/|s1|; theta + (n + 4 + sqrt n) T.
  function frameDuration(mode, p) {
    if (mode === 1) return 6 * p.tau;
    if (mode === 3) { const q = withCascade(p); return q.theta + (q.n + 4 + Math.sqrt(q.n)) * q.T; }
    const regime = regimeOf(p.xi);
    if (regime === "undamped") return 4 * 2 * Math.PI / p.omega0;
    if (regime === "under") return 8 / (p.xi * p.omega0);
    return 6 / slowPole(p);
  }

  // Number of samples so that oscillations stay smooth over [0, duration].
  function sampleCount(mode, p, duration, base) {
    if (mode !== 2) return base;
    const periods = duration * p.omega0 / (2 * Math.PI);
    return Math.min(60000, Math.max(base, Math.ceil(periods * 64)));
  }

  // 5 % settling time measured on the curve: last instant outside the +/- 5 % band.
  function settlingTime(mode, p) {
    const yInf = p.K * p.u0;
    const y = makeResponse(mode, p);
    let horizon;
    if (mode === 1) horizon = 10 * p.tau;
    else {
      const regime = regimeOf(p.xi);
      if (regime === "undamped") return null;
      if (regime === "under") horizon = 1.3 * Math.log(20 / Math.sqrt(1 - p.xi * p.xi)) / (p.xi * p.omega0) + 1 / p.omega0;
      else horizon = 12 / slowPole(p);
    }
    const n = Math.max(4000, sampleCount(mode, p, horizon, 4000) * 2);
    const band = 0.05 * Math.abs(yInf);
    const outside = (t) => Math.abs(y(t) - yInf) - band;
    let last = -1;
    for (let i = 0; i <= n; i += 1) if (outside(horizon * i / n) > 0) last = i;
    if (last < 0) return 0;
    if (last === n) return horizon;
    let a = horizon * last / n;
    let b = horizon * (last + 1) / n;
    for (let k = 0; k < 60; k += 1) {
      const mid = (a + b) / 2;
      if (outside(mid) > 0) a = mid; else b = mid;
    }
    return (a + b) / 2;
  }

  // ---------------------------------------------------------------------------
  // Reaction curve read as in polycopié 4, section 7 (noise-free model):
  //   K = Δy/Δu ; L = where the tangent at the steepest point crosses the starting level ;
  //   tau = from the end of the apparent delay, time to reach 63 % of the rise.
  // ---------------------------------------------------------------------------
  // Steepest point, analytic: inflection at x = n - 1, i.e. t_i = theta + (n - 1) T
  // (for n = 1 the slope is largest right after the pure delay).
  function inflectionAnalytic(p) {
    p = withCascade(p);
    const ti = p.theta + (p.n - 1) * p.T;
    return { ti, a: processSlope(p)(ti) };
  }

  // Steepest point, numeric: largest |dy/dt| (central differences) on a grid, refined by a
  // golden-section search. Used to cross-check the analytic inflection.
  function inflectionNumeric(p) {
    p = withCascade(p);
    const y = processResponse(p);
    const h = 1e-5 * p.T;
    const slope = (t) => Math.abs(y(t + h) - y(t - h)) / (2 * h);
    const span = frameDuration(3, p);
    const count = 4000;
    let best = 0;
    for (let i = 1; i <= count; i += 1) if (slope(span * i / count) > slope(span * best / count)) best = i;
    let lo = span * Math.max(0, best - 1) / count;
    let hi = span * Math.min(count, best + 1) / count;
    const g = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 80; k += 1) {
      const m1 = hi - g * (hi - lo);
      const m2 = lo + g * (hi - lo);
      if (slope(m1) >= slope(m2)) hi = m2; else lo = m1;
    }
    const ti = (lo + hi) / 2;
    return { ti, a: Math.sign(p.K * p.u0) * slope(ti) };
  }

  // Time at which the cascade reaches a fraction of its rise (bisection on x).
  function timeToFraction(p, fraction) {
    p = withCascade(p);
    let lo = 0;
    let hi = p.n + 10 * Math.sqrt(p.n) + 10;
    for (let k = 0; k < 100; k += 1) {
      const mid = (lo + hi) / 2;
      if (cascadeStep(p.n, mid) < fraction) lo = mid; else hi = mid;
    }
    return p.theta + (lo + hi) / 2 * p.T;
  }

  function znConstruction(p) {
    p = withCascade(p);
    const yInf = p.K * p.u0;
    const { ti, a } = inflectionAnalytic(p);
    const yi = processResponse(p)(ti);
    const L = ti - yi / a;
    const t63 = timeToFraction(p, F63);
    const tau = t63 - L;
    return {
      K: yInf / p.u0, yInf, ti, yi, a, L, t63, tau, y63: F63 * yInf,
      applicable: L > 1e-9 * p.T && tau > 0,
    };
  }
  S_CONSTANTS = S_STAGES.map((n) => {
    const c = znConstruction({ K: 1, u0: 1, n, T: 1, theta: 0 });
    return { n, c1: c.L, c2: c.tau };
  });
  const S_RATIO_MIN = S_CONSTANTS[0].c1 / S_CONSTANTS[0].c2;
  // Smallest 3-significant-digit number >= x (the limit shown and applied on L).
  const ceil3 = (x) => { const f = Math.pow(10, Math.floor(Math.log10(x)) - 2); return Number((Math.ceil(x / f - 1e-9) * f).toPrecision(3)); };
  // The S curve keeps L >= S_RATIO_MIN tau: L goes up when needed (after a change of L or tau).
  function enforceSRatio() {
    const p = state.params[3];
    const min = ceil3(S_RATIO_MIN * p.tau);
    if (p.L >= min) return false;
    p.L = min;
    return true;
  }

  // Ziegler–Nichols open-loop table (polycopié 4): Kp, Ti, Td from K, L, tau.
  const ZN_TABLE = {
    P: { kp: 1 },
    PI: { kp: 0.9, ti: 3.3 },
    PID: { kp: 1.2, ti: 2, td: 0.5 },
  };
  // The Ziegler–Nichols table is applied to the K, L, tau of the sliders (the construction on
  // the hidden S gives them back).
  const znFromSliders = (p) => ({ K: p.K, L: p.L, tau: p.tau, applicable: p.L > 0 && p.tau > 0 });

  // Reaction curve of the whole chain, as polycopié 4 records it: the measurement y_m for a
  // unit step of u (process, then sensor). The sensor (first order tau_c) filters the analytic
  // process response exactly, the response being linear between samples; then the
  // construction of the polycopié, numerically: steepest point (largest slope, refined by a
  // parabola), tangent -> L, first crossing of 63 % of the rise -> tau, final value -> K.
  function chainResponse(mode, p, tauC, span, count) {
    const y = makeResponse(mode, { ...p, u0: 1 });
    const h = span / count;
    const a = tauC > 0 ? Math.exp(-h / tauC) : 0;
    const ym = new Float64Array(count + 1);
    let previous = y(0);
    ym[0] = tauC > 0 ? 0 : previous;
    for (let k = 1; k <= count; k += 1) {
      const next = y(k * h);
      if (tauC > 0) { const slope = (next - previous) / h; ym[k] = next - slope * tauC + (ym[k - 1] - previous + slope * tauC) * a; }
      else ym[k] = next;
      previous = next;
    }
    return { h, ym };
  }
  function chainConstruction(mode, p, tauC) {
    const span = frameDuration(mode, p) + 8 * tauC;
    const count = 20000;
    const { h, ym } = chainResponse(mode, p, tauC, span, count);
    const sign = Math.sign(p.K) || 1;
    const slope = (k) => sign * (ym[k + 1] - ym[k - 1]) / (2 * h);
    let best = 1;
    for (let k = 2; k < count; k += 1) if (slope(k) > slope(best)) best = k;
    // Parabola through the three slopes around the maximum.
    let ti = best * h;
    let a = sign * slope(best);
    if (best > 1 && best < count - 1) {
      const [s0, s1, s2] = [slope(best - 1), slope(best), slope(best + 1)];
      const den = s0 - 2 * s1 + s2;
      const shift = den < 0 ? Math.max(-1, Math.min(1, (s0 - s2) / (2 * den))) : 0;
      ti = (best + shift) * h;
      a = sign * (s1 - (s0 - s2) * shift / 4);
    }
    const at = (t) => { const x = t / h; const k = Math.min(count - 1, Math.max(0, Math.floor(x))); return ym[k] + (x - k) * (ym[k + 1] - ym[k]); };
    const yi = at(ti);
    const L = ti - yi / a;
    const level = F63 * p.K;
    let t63 = null;
    for (let k = 1; k <= count; k += 1) {
      if (sign * ym[k] >= sign * level) { t63 = (k - 1 + (level - ym[k - 1]) / (ym[k] - ym[k - 1])) * h; break; }
    }
    const tau = t63 === null ? NaN : t63 - L;
    return { K: p.K, L, tau, ti, a, t63, applicable: L > 1e-4 * span && tau > 0 };
  }
  // K, L, tau for the Z-N button: the S-curve process with a perfect sensor keeps the exact
  // values of its sliders; any other chain is read on its reaction curve (cached).
  let chainCache = null;
  function znReading() {
    const p = current();
    const tauC = state.sensor.tauC;
    if (state.mode === 3 && tauC === 0) return znFromSliders(p);
    const key = JSON.stringify([state.mode, p.K, p.tau, p.omega0, p.xi, p.L, tauC]);
    if (!chainCache || chainCache.key !== key) chainCache = { key, c: chainConstruction(state.mode, p, tauC) };
    return chainCache.c;
  }
  function znTuning(regulator, c) {
    const row = ZN_TABLE[regulator];
    return {
      Kp: row.kp * c.tau / (c.K * c.L),
      Ti: row.ti ? row.ti * c.L : null,
      Td: row.td ? row.td * c.L : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Closed loop: r -> ε = r - y_m -> controller -> u (saturated) -> process -> y -> sensor -> y_m.
  // Fixed-step RK4 on the state (process, sensor, integral, derivative filter); the pure delay
  // of the order-n process acts on u through the stored history of u. Pure function of cfg:
  //   { mode, p (process, K signed), ctrl { type, Kp, Ti, Td, band, uHigh, uLow }, tauC, r0,
  //     sat, uMax, tEnd, noise (standard deviation on y_m), noisePeriod, noiseSeed }.
  // As in the simulation of polycopié 4, the derivative does not see the setpoint step (the
  // filter starts at ε(0+)); there is no anti-windup. The on-off controller (« Hyst ») decides
  // at the start of each step, from the measurement, and keeps its state inside the band.
  // The measurement noise is held over noisePeriod and drawn from (noiseSeed, index): the same
  // realisation whatever the step, the horizon or the settings.
  // ---------------------------------------------------------------------------
  function processRate(mode, p) { // fastest open-loop rate of the process (1/s)
    if (mode === 1) return 1 / p.tau;
    if (mode === 3) return 1 / withCascade(p).T;
    return p.omega0 * Math.max(1, p.xi + Math.sqrt(Math.max(p.xi * p.xi - 1, 0)));
  }

  // Step count: RK4 is stable for |h λ| < 2.8; λ bounds the fastest closed-loop rate.
  // The on-off controller takes small steps whatever: they set how late it switches.
  function loopStepCount({ mode, p, ctrl, tauC, tEnd }) {
    const relay = ctrl.type === "Hyst";
    const useD = ctrl.type === "PID" && ctrl.Td > 0;
    const gain = relay ? 0 : Math.abs(p.K * ctrl.Kp) * (1 + (useD ? N_FILTER : 0));
    const lambda = processRate(mode, p) * (1 + gain) + (tauC > 0 ? 1 / tauC : 0) + (useD ? N_FILTER / ctrl.Td : 0) + (ctrl.type === "PI" || ctrl.type === "PID" ? 1 / ctrl.Ti : 0);
    return Math.ceil(Math.max(relay ? 20000 : 2000, tEnd * lambda / 2));
  }

  function simulateLoop(cfg) {
    const { mode, ctrl, tauC, r0, sat, uMax, tEnd } = cfg;
    const p = mode === 3 ? withCascade(cfg.p) : cfg.p; // the S process: its hidden cascade
    const np = mode === 3 ? p.n : mode; // process states
    const hasSensor = tauC > 0;
    const relay = ctrl.type === "Hyst";
    const useI = ctrl.type === "PI" || ctrl.type === "PID";
    const useD = ctrl.type === "PID" && ctrl.Td > 0;
    const iS = np;
    const iI = np + (hasSensor ? 1 : 0);
    const iZ = iI + 1;
    const dim = iZ + 1;

    const steps = Math.min(MAX_LOOP_STEPS, loopStepCount(cfg));
    const h = tEnd / steps;
    // A sensor or a derivative filter faster than the step allows (long window, step count
    // capped) is integrated as a lag of h/2: RK4 stays stable, and such a lag is instantaneous
    // at the scale of the window. Below the cap, h <= 2 Tf already: nothing changes.
    const Tf = useD ? Math.max(ctrl.Td / N_FILTER, h / 2) : 1;
    const tauS = hasSensor ? Math.max(tauC, h / 2) : 0;
    const delay = mode === 3 && p.theta > 0 ? Math.max(1, Math.round(p.theta / h)) : 0; // in steps
    const every = Math.ceil(steps / LOOP_OUTPUT_POINTS);
    const bound = 1e3 * Math.max(Math.abs(r0), Math.abs(p.K) * (sat ? uMax : 0), 1e-9);

    // Noise on the measurement, constant over a step (the step is shorter than noisePeriod).
    const sigma = cfg.noise || 0;
    const noisePeriod = cfg.noisePeriod || tEnd / 2000;
    let noise = 0;
    let on = false; // state of the on-off controller
    let switches = 0;
    const onTimes = [];
    const output = (x) => (mode === 3 ? x[np - 1] : x[0]);
    const measure = (x) => (hasSensor ? x[iS] : output(x)) + noise;
    const law = (x) => {
      if (relay) return on ? ctrl.uHigh : ctrl.uLow;
      const e = r0 - measure(x);
      let v = e;
      if (useI) v += x[iI] / ctrl.Ti;
      if (useD) v += ctrl.Td * (e - x[iZ]) / Tf;
      v *= ctrl.Kp;
      return sat ? Math.min(uMax, Math.max(-uMax, v)) : v;
    };
    const deriv = (x, ud, dx) => {
      if (mode === 1) dx[0] = (p.K * ud - x[0]) / p.tau;
      else if (mode === 2) {
        dx[0] = x[1];
        dx[1] = p.omega0 * p.omega0 * (p.K * ud - x[0]) - 2 * p.xi * p.omega0 * x[1];
      } else {
        dx[0] = (p.K * ud - x[0]) / p.T;
        for (let k = 1; k < np; k += 1) dx[k] = (x[k - 1] - x[k]) / p.T;
      }
      if (hasSensor) dx[iS] = (output(x) - x[iS]) / tauS;
      const e = r0 - measure(x);
      dx[iI] = useI ? e : 0;
      dx[iZ] = useD ? (e - x[iZ]) / Tf : 0;
    };

    const x = new Float64Array(dim);
    x[iZ] = r0; // derivative filter at ε(0+): no derivative kick at the setpoint step
    const history = delay ? new Float64Array(steps + 1) : null;
    const delayed = (k, c) => { // u(t_k + c h - theta), linear between stored values; 0 before t = 0
      const i = k - delay;
      if (i < 0) return 0;
      return history[i] + c * (history[i + 1] - history[i]);
    };
    const k1 = new Float64Array(dim);
    const k2 = new Float64Array(dim);
    const k3 = new Float64Array(dim);
    const k4 = new Float64Array(dim);
    const tmp = new Float64Array(dim);
    const stage = (from, slope, factor) => { for (let j = 0; j < dim; j += 1) tmp[j] = from[j] + factor * slope[j]; return tmp; };
    const out = { t: [], y: [], ym: [], u: [] };
    const record = (k, u) => { out.t.push(k * h); out.y.push(output(x)); out.ym.push(measure(x)); out.u.push(u); };

    let diverged = false;
    for (let k = 0; k < steps; k += 1) {
      if (sigma > 0) noise = sigma * gaussian(cfg.noiseSeed, Math.floor(k * h / noisePeriod));
      if (relay) {
        const e = r0 - measure(x);
        const next = e > ctrl.band / 2 ? true : e < -ctrl.band / 2 ? false : on;
        if (next !== on && k > 0) { switches += 1; if (next) onTimes.push(k * h); }
        on = next;
      }
      const u = law(x);
      if (delay) history[k] = u;
      if (k % every === 0) record(k, u);
      deriv(x, delay ? delayed(k, 0) : u, k1);
      stage(x, k1, h / 2); deriv(tmp, delay ? delayed(k, 0.5) : law(tmp), k2);
      stage(x, k2, h / 2); deriv(tmp, delay ? delayed(k, 0.5) : law(tmp), k3);
      stage(x, k3, h); deriv(tmp, delay ? delayed(k, 1) : law(tmp), k4);
      for (let j = 0; j < dim; j += 1) x[j] += h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
      const y = output(x);
      if (!Number.isFinite(y) || Math.abs(y) > bound || !Number.isFinite(u) || !Number.isFinite(x[iI]) || !Number.isFinite(x[iZ])) { diverged = true; break; }
      if (k === steps - 1) {
        if (sigma > 0) noise = sigma * gaussian(cfg.noiseSeed, Math.floor(steps * h / noisePeriod)); // the noise at t = tEnd
        record(steps, law(x));
      }
    }
    // The on-off loop oscillates by design: only a divergence counts as « going unstable ».
    const unstable = diverged || (!relay && sustainedOscillation(sigma > 0 ? smooth(out.y) : out.y, r0));
    return { ...out, h, steps, tEnd, diverged, unstable, switches, onTimes };
  }

  // Moving average over 1 % of the run: removes the noise, keeps the oscillations of the loop.
  function smooth(y) {
    const w = Math.max(1, Math.round(y.length / 100));
    const out = new Array(y.length);
    let sum = 0;
    for (let i = 0; i < y.length; i += 1) {
      sum += y[i];
      if (i >= w) sum -= y[i - w];
      out[i] = sum / Math.min(i + 1, w);
    }
    return out;
  }

  // Oscillation that does not decay over the second half of the run: the loop goes unstable
  // (with saturation it cannot diverge, it settles into an oscillation, as in polycopié 4).
  function sustainedOscillation(y, r0) {
    const n = y.length;
    if (n < 40) return false;
    const span = (a, b) => { let lo = Infinity; let hi = -Infinity; for (let i = Math.floor(a * (n - 1)); i <= Math.floor(b * (n - 1)); i += 1) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); } return hi - lo; };
    const third = span(0.5, 0.75);
    const fourth = span(0.75, 1);
    if (!(fourth > 0.02 * Math.abs(r0)) || fourth < 0.95 * third) return false;
    let mean = 0;
    const start = Math.floor(0.75 * (n - 1));
    for (let i = start; i < n; i += 1) mean += y[i] / (n - start);
    let crossings = 0;
    let last = 0;
    for (let i = Math.floor(0.5 * (n - 1)); i < n; i += 1) {
      const d = y[i] - mean;
      if (Math.abs(d) < 1e-3 * Math.abs(r0)) continue;
      const sign = Math.sign(d);
      if (last && sign !== last) crossings += 1;
      last = sign;
    }
    return crossings >= 2; // a monotonic creep crosses its final mean once at most
  }

  // Live indicators of a run: static error (end of the run, if settled) and overshoot.
  function loopIndicators(run, r0) {
    if (run.unstable) {
      // Instant where y leaves 3 |r| (or the run stops on a divergence): the graph is fitted to it.
      const i = run.y.findIndex((v) => !(Math.abs(v) <= 3 * Math.abs(r0)));
      const escape = i > 0 ? run.t[i] : run.diverged ? run.t[run.t.length - 1] : null;
      return { unstable: true, settled: false, error: null, overshoot: null, settlingTime: null, escape };
    }
    const y = run.y;
    const n = y.length;
    const yEnd = y[n - 1];
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = Math.floor(0.9 * (n - 1)); i < n; i += 1) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); }
    const settled = hi - lo <= 2e-4 * Math.abs(r0); // y moves by less than 0.02 % of r over the last 10 %
    let peak = -Infinity;
    for (let i = 0; i < n; i += 1) peak = Math.max(peak, y[i] * Math.sign(r0));
    const overshoot = yEnd * r0 > 0 ? Math.max(0, (peak - Math.abs(yEnd)) / Math.abs(yEnd)) : null;
    // 5 % settling time: last instant outside y_inf ± 5 %.
    let settlingTime = null;
    if (settled && yEnd * r0 > 0) {
      let last = -1;
      for (let i = 0; i < n; i += 1) if (Math.abs(y[i] - yEnd) > 0.05 * Math.abs(yEnd)) last = i;
      settlingTime = last < 0 ? 0 : run.t[Math.min(n - 1, last + 1)];
    }
    return { unstable: false, settled, error: settled ? (r0 - yEnd) / r0 : null, overshoot, settlingTime };
  }

  // Indicators of the on-off loop, over the second half of the run (the oscillation is set):
  // peak-to-peak of y, period (between two switchings on), number of switchings in the run;
  // the setpoint must lie strictly between K u_min and K u_max to be reached.
  function relayIndicators(run, cfg) {
    const y = run.y;
    const n = y.length;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = Math.floor(0.5 * (n - 1)); i < n; i += 1) { lo = Math.min(lo, y[i]); hi = Math.max(hi, y[i]); }
    const late = run.onTimes.filter((t) => t >= 0.5 * run.tEnd);
    const period = late.length >= 2 ? (late[late.length - 1] - late[0]) / (late.length - 1) : null;
    const { K } = cfg.p;
    const reachable = (cfg.r0 - K * cfg.ctrl.uLow) * (K * cfg.ctrl.uHigh - cfg.r0) > 0;
    return { relay: true, unstable: run.diverged, reachable, amplitude: hi - lo, period, switches: run.switches };
  }

  // Step responses of the blocks alone. Sensor: y_m for a unit step of y. Controller: u for a
  // unit step of ε, split into its actions (P: Kp; I: ramp Kp t / Ti; D: filtered pulse); the
  // on-off controller jumps to u_max (the step leaves the band) and stays there.
  function sensorStep(tauC) { return (t) => (t < 0 ? 0 : tauC > 0 ? 1 - Math.exp(-t / tauC) : 1); }
  function controllerStep(ctrl) {
    if (ctrl.type === "Hyst") {
      const level = 1 > ctrl.band / 2 ? ctrl.uHigh : ctrl.uLow;
      return { actions: {}, total: (t) => (t < 0 ? ctrl.uLow : level) };
    }
    const actions = { P: () => ctrl.Kp };
    if (ctrl.type !== "P") actions.I = (t) => ctrl.Kp * t / ctrl.Ti;
    if (ctrl.type === "PID" && ctrl.Td > 0) {
      const Tf = ctrl.Td / N_FILTER;
      actions.D = (t) => ctrl.Kp * N_FILTER * Math.exp(-t / Tf);
    }
    const total = (t) => Object.values(actions).reduce((sum, f) => sum + f(t), 0);
    return { actions, total };
  }

  // ---------------------------------------------------------------------------
  // Measurement noise on the sensor step response y_m: discrete samples (period: sensor frame /
  // NOISE_SAMPLES) plus a Gaussian noise drawn from (seed, sample index), so the curve does not
  // move while the cursors or the axes change.
  // ---------------------------------------------------------------------------
  function hashUnit(value) { // mulberry32 step: uniform in [0, 1)
    let t = (value + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gaussian(seed, index) {
    const u1 = 1 - hashUnit(seed ^ Math.imul(2 * index + 1, 0x9e3779b1));
    const u2 = hashUnit(seed ^ Math.imul(2 * index + 2, 0x85ebca6b));
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  const sensorFrame = () => (state.sensor.tauC > 0 ? 6 * state.sensor.tauC : 1);
  function measuredSamples(tMax) {
    if (!(state.sensor.sensorNoise > 0)) return null;
    const y = sensorStep(state.sensor.tauC);
    const Ts = sensorFrame() / NOISE_SAMPLES;
    const sigma = state.sensor.sensorNoise / 100; // the step of y is 1
    const count = Math.min(MAX_SAMPLES, Math.floor(tMax / Ts + 1e-9));
    const t = new Float64Array(count + 1);
    const v = new Float64Array(count + 1);
    for (let i = 0; i <= count; i += 1) { t[i] = i * Ts; v[i] = y(t[i]) + sigma * gaussian(state.seed, i); }
    return { Ts, sigma, t, v };
  }
  // What a cursor reads on the sensor curve: the curve at its time, or the nearest sample when
  // the noise is on.
  function reading(cursor, samples = measuredSamples(state.axes.tMax)) {
    if (!samples) return { t: cursor.t, y: sensorStep(state.sensor.tauC)(cursor.t) };
    const i = Math.min(samples.t.length - 1, Math.max(0, Math.round(cursor.t / samples.Ts)));
    return { t: samples.t[i], y: samples.v[i] };
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#scope");
  const ctx = canvas.getContext("2d");
  const screen = $("#scope-screen");
  const themeButton = $("#theme-toggle");
  const autoAxesBox = $("#auto-axes");
  const clearButton = $("#clear-memory");
  const markBoxes = [...document.querySelectorAll("[data-mark]")];
  const languageTrigger = $("#language-trigger");
  const languageMenu = $("#language-menu");
  const languageButtons = [...document.querySelectorAll("[data-lang]")];
  let language = "fr";
  let controlRefs = {};
  let plotView = null;

  // What the graph shows: the closed loop, or the step response of one block.
  const context = () => (state.view === "loop" ? "loop" : "elements");
  // Blocks of the « elements » view, in drawing order; several can be superposed.
  const ELEMENTS = ["process", "sensor", "ctrl"];
  const activeElements = () => (state.view === "loop" ? [] : ELEMENTS.filter((el) => state.elements[el]));
  const showing = (el) => activeElements().includes(el);
  // Tokens matched by the data-only attributes (and by the « only » of a parameter).
  function contextTokens() {
    if (state.view === "loop") return ["loop"];
    return activeElements().flatMap((el) => (el === "process" ? ["process", `p${state.mode}`] : [el]));
  }
  const visibleIn = (only) => only.split(" ").some((token) => contextTokens().includes(token));

  // Interface texts write subscripts as x_{…} (u_{min}, y_{m}, τ_{c}, y_{∞}): rich() turns them
  // into real subscripts (escaped HTML), plain() into plain text for the aria labels.
  const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rich = (text) => escapeHtml(text).replace(/_\{([^}]*)\}/g, "<sub>$1</sub>");
  const plain = (text) => String(text).replace(/_\{([^}]*)\}/g, " $1");
  const setRich = (el, text) => { el.innerHTML = rich(text); };

  function applyStrings() {
    document.title = S.documentTitle;
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((el) => setRich(el, S[el.dataset.i18n]));
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", plain(S[el.dataset.i18nAria])));
    $('#view-switch [data-view="elements"]').setAttribute("aria-label", S.viewElements);
  }

  function renderTex(element, expression) {
    if (window.katex) window.katex.render(expression, element, { throwOnError: false, output: "htmlAndMathml", strict: false });
    else element.textContent = expression;
  }

  // Slider position <-> parameter value. A « logZero » slider keeps position 0 for 0.
  function toSlider(def, value) {
    if (def.logZero && value <= 0) return 0;
    value = Math.min(def.max, Math.max(def.min, value)); // out-of-range values pin the slider to an end
    if (def.logZero) return 1 + Math.round(Math.log(value / def.min) / Math.log(def.max / def.min) * (LOG_STEPS - 1));
    if (!def.log) return value;
    return Math.round(Math.log(value / def.min) / Math.log(def.max / def.min) * LOG_STEPS);
  }
  function fromSlider(def, position) {
    position = Number(position);
    if (def.logZero) return position <= 0 ? 0 : round3(def.min * Math.pow(def.max / def.min, (position - 1) / (LOG_STEPS - 1)));
    if (!def.log) return position;
    return round3(def.min * Math.pow(def.max / def.min, position / LOG_STEPS));
  }
  // Value of a slider position. On a log slider a step (an arrow key) can round, at three
  // significant digits, back to the current value: the slider then went back and the key seemed
  // dead (between 1,00 and 1,99 most of all). The position keeps going in the same direction
  // until the value changes.
  function sliderValue(def, slider) {
    let position = Number(slider.value);
    let value = fromSlider(def, position);
    const old = holder(def)[def.key];
    if ((def.log || def.logZero) && value === old) {
      const direction = Math.sign(position - toSlider(def, old));
      while (direction && value === old && position > 0 && position < LOG_STEPS) {
        position += direction;
        value = fromSlider(def, position);
      }
    }
    return value;
  }
  function updateProgress(input) {
    const share = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
    input.style.setProperty("--range-progress", `${share}%`);
  }

  // Where a parameter lives, and the sign of the signed ones (K, u0 of the process; Kp).
  function holder(def) {
    switch (def.group) {
      case "ctrl": return state.ctrl;
      case "sensor": return state.sensor;
      case "loop": return state.loop;
      default: return state.params[state.mode];
    }
  }
  const signHolder = (def) => (def.group === "ctrl" ? state.ctrlSign : state.sign[state.mode]);
  const shown = (def) => (!def.only || visibleIn(def.only)) && (!def.types || def.types.includes(state.ctrl.type)) && (!def.withSaturation || (state.loop.sat && state.ctrl.type !== "Hyst"));
  const processDefs = () => PARAMS[state.mode];

  function renderControls() {
    controlRefs = {};
    [
      ["#controls", processDefs()],
      ["#ctrl-controls", CTRL_PARAMS],
      ["#sensor-controls", SENSOR_PARAMS],
      ["#loop-controls", SETPOINT_PARAMS],
      ["#sat-controls", SAT_PARAMS],
    ].forEach(([host, defs]) => $(host).replaceChildren(...defs.filter(shown).map(controlCard)));
  }

  function controlCard(def) {
    const name = S.params[def.key];
    const card = document.createElement("div");
    card.className = "control";
    card.innerHTML = `
      <span class="control-copy"><b>${def.symbol}${def.index ? `<span class="symbol-index">${def.index}</span>` : ""}</b><small>${rich(name)}</small></span>
      <span class="value-field"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" />${def.signed ? `<label class="sign-toggle"><span>${S.negative}</span><input type="checkbox" /></label>` : `<span class="unit">${def.unit || ""}</span>`}</span>
      <input type="range" />`;
    const field = card.querySelector('input[type="text"]');
    const slider = card.querySelector('input[type="range"]');
    field.setAttribute("aria-label", `${plain(name)} : ${S.fieldAria}`);
    slider.setAttribute("aria-label", `${plain(name)} : ${S.sliderAria}`);
    if (def.log || def.logZero) { slider.min = 0; slider.max = LOG_STEPS; slider.step = 1; }
    else { slider.min = def.min; slider.max = def.max; slider.step = def.step; }

    slider.addEventListener("input", () => setParam(def, sliderValue(def, slider), "slider"));
    field.addEventListener("input", () => {
      const value = parseNumber(field.value);
      const valid = withinLimits(def, value);
      field.classList.toggle("invalid", !valid && field.value.trim() !== "");
      if (valid) setParam(def, value, "field");
      else if (def.signed && withinLimits(def, -value)) { field.classList.remove("invalid"); setSign(def, -1); setParam(def, -value, "field"); }
    });
    field.addEventListener("change", () => commitField(def));
    field.addEventListener("keydown", (event) => { if (event.key === "Enter") { commitField(def); field.blur(); } });

    const signBox = card.querySelector(".sign-toggle input");
    if (signBox) {
      signBox.checked = signHolder(def)[def.key] < 0;
      signBox.setAttribute("aria-label", S.negativeAria[def.key]);
      signBox.addEventListener("change", () => { setSign(def, signBox.checked ? -1 : 1); update(); });
    }
    bindWheel(card, def, slider);
    controlRefs[def.key] = { field, slider, signBox };
    syncControl(def, true);
    return card;
  }
  // Mouse wheel and trackpad over a slider. A horizontal swipe changes the value at once (the
  // page never scrolls sideways). A vertical scroll keeps scrolling the page, unless the card
  // is in use (its slider or its field has the focus, after a click): then it changes the value.
  // Trackpads send many small deltas: they add up, one step per WHEEL_PIXELS_PER_STEP.
  function bindWheel(card, def, slider) {
    let pending = 0;
    let over = false;
    const engaged = () => card.contains(document.activeElement);
    const mark = () => card.classList.toggle("wheel-ready", over && engaged());
    slider.addEventListener("mouseenter", () => { over = true; pending = 0; mark(); });
    slider.addEventListener("mouseleave", () => { over = false; pending = 0; mark(); });
    card.addEventListener("focusin", mark);
    card.addEventListener("focusout", () => setTimeout(mark));
    slider.addEventListener("wheel", (event) => {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal && !engaged()) return; // the page scrolls
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 300 : 1; // lines, pages -> pixels
      pending += (horizontal ? event.deltaX : -event.deltaY) * scale;
      const notches = Math.trunc(pending / WHEEL_PIXELS_PER_STEP);
      if (!notches) return;
      pending -= notches * WHEEL_PIXELS_PER_STEP;
      const step = def.log || def.logZero ? WHEEL_LOG_STEPS : Number(slider.step);
      const next = Math.min(Number(slider.max), Math.max(Number(slider.min), Number(slider.value) + notches * step));
      if (next === Number(slider.value)) return;
      slider.value = String(next);
      setParam(def, round3(fromSlider(def, next)), "slider");
    }, { passive: false });
  }

  // Flipping a sign would put the whole curve outside fixed axes: reframe.
  function setSign(def, sign) {
    signHolder(def)[def.key] = sign;
    if (!def.group) state.seed = newSeedValue();
    const box = controlRefs[def.key]?.signBox;
    if (box) box.checked = sign < 0;
    reframe();
  }

  function commitField(def) {
    const { field } = controlRefs[def.key];
    let value = parseNumber(field.value);
    if (!Number.isFinite(value)) value = holder(def)[def.key];
    if (def.signed && value < 0) { setSign(def, -1); value = -value; }
    value = round3(clampToLimits(def, value));
    field.classList.remove("invalid");
    setParam(def, value, null);
  }

  function syncControl(def, updateField) {
    const refs = controlRefs[def.key];
    if (!refs) return; // card not shown
    const value = holder(def)[def.key];
    refs.slider.value = toSlider(def, value);
    updateProgress(refs.slider);
    if (updateField) refs.field.value = sig3Short.format(value);
    if (refs.signBox) refs.signBox.checked = signHolder(def)[def.key] < 0;
  }

  // A new process value draws a new noise realisation; the noise level keeps it (it scales).
  function setParam(def, value, source) {
    const target = holder(def);
    if ((!def.group || def.key === "tauC") && target[def.key] !== value) state.seed = newSeedValue();
    target[def.key] = value;
    if (!def.group && state.mode === 3 && enforceSRatio() && def.key !== "L") syncControl(PARAMS[3].find((d) => d.key === "L"), true);
    syncControl(def, source !== "field");
    update();
  }

  // « Aléatoire »: new values for the parameters of the active process type (signs and u0
  // stay), a new noise realisation, and axes fitted to the new curve.
  function randomize() {
    const p = state.params[state.mode];
    const draw = (range) => {
      if (range.pick) return range.pick[Math.floor(Math.random() * range.pick.length)];
      const scale = range.times ? p[range.times] : 1;
      if (range.log) return round3(range.min * Math.pow(range.max / range.min, Math.random()));
      return round3(scale * (range.min + (range.max - range.min) * Math.random()));
    };
    Object.entries(RANDOM[state.mode]).forEach(([key, range]) => { p[key] = draw(range); });
    if (state.mode === 2) p.xi = Math.min(RANDOM[2].xi.max, Math.max(RANDOM[2].xi.min, Math.round(p.xi * 100) / 100));
    if (state.mode === 3) enforceSRatio();
    state.seed = newSeedValue();
    state.loopSeed = newSeedValue();
    processDefs().forEach((def) => syncControl(def, true));
    reframe();
    update();
  }

  // « Réglage Z-N »: the row of the selected controller in the table of polycopié 4, with the
  // K, L, tau read on the reaction curve of the process (order n only).
  function znAvailability() {
    if (state.ctrl.type === "Hyst") return { ok: false, note: S.znHyst };
    const c = znReading();
    if (!c.applicable) return { ok: false, note: S.znNotApplicable };
    return { ok: true, c, note: state.sensor.tauC > 0 ? S.znFromChain : S.znFrom };
  }
  function applyZN() {
    const zn = znAvailability();
    if (!zn.ok) return;
    const tuning = znTuning(state.ctrl.type, zn.c);
    state.ctrlSign.Kp = tuning.Kp < 0 ? -1 : 1;
    state.ctrl.Kp = round3(Math.abs(tuning.Kp));
    if (tuning.Ti !== null) state.ctrl.Ti = round3(tuning.Ti);
    if (tuning.Td !== null) state.ctrl.Td = round3(tuning.Td);
    state.regulator = state.ctrl.type;
    $("#zn-details").open = true; // the row just applied, under the button
    CTRL_PARAMS.forEach((def) => syncControl(def, true));
    reframe();
    update();
  }

  // ---------------------------------------------------------------------------
  // Equations, characteristic values, Ziegler–Nichols tuning, loop indicators
  // ---------------------------------------------------------------------------
  // Equation panel: one block per block shown (the control law alone in the loop view).
  function renderEquation() {
    const blocks = state.view === "loop" ? [lawEquation()]
      : activeElements().map((el) => (el === "process" ? processEquation() : el === "sensor" ? sensorEquation() : lawEquation()));
    $("#equation-panel").replaceChildren(...blocks.map(equationBlock));
  }
  function equationBlock({ title, symbolic, numeric, label, value }) {
    const block = document.createElement("div");
    block.className = "equation-block";
    block.innerHTML = `<h2 class="kicker"></h2><div class="eq-box"><div class="eq-line"></div><div class="eq-line eq-numeric"></div></div>${value ? '<p class="regime"><span></span> <strong></strong></p>' : ""}`;
    block.querySelector("h2").textContent = title;
    const [a, b] = block.querySelectorAll(".eq-line");
    renderTex(a, symbolic);
    renderTex(b, numeric);
    if (value) { setRich(block.querySelector(".regime span"), label); setRich(block.querySelector(".regime strong"), value); }
    return block;
  }
  function sensorEquation() {
    const tauC = state.sensor.tauC;
    return {
      title: S.eqSensor,
      symbolic: "\\tau_c\\,\\dot{y}_m + y_m = y",
      numeric: tauC > 0 ? `${tex(tauC)}\\,\\dot{y}_m + y_m = y` : "y_m = y",
      label: S.sensorLabel,
      value: tauC > 0 ? S.sensorValue : S.perfectSensor,
    };
  }
  // Controller (alone or in the loop): the PID law of polycopié 4, or the on-off law with its
  // hysteresis band (polycopié 1) and its two thresholds on y_m.
  function lawEquation() {
    const k = controller();
    if (k.type === "Hyst") {
      const cases = (high, low, half) => `u = \\begin{cases} ${high} & \\text{${S.lawIf} } \\varepsilon \\ge ${half} \\\\ ${low} & \\text{${S.lawIf} } \\varepsilon \\le -${half} \\\\ \\text{${S.lawKeep}} & \\text{${S.lawElse}} \\end{cases}`;
      const r0 = state.loop.r0;
      return {
        title: S.eqLaw,
        symbolic: cases("u_{\\max}", "u_{\\min}", "\\Delta/2"),
        numeric: cases(tex(k.uHigh), tex(k.uLow), tex(k.band / 2)),
        label: S.thresholdsLabel,
        value: S.thresholds.replace("{lo}", fmt(r0 - k.band / 2)).replace("{hi}", fmt(r0 + k.band / 2)),
      };
    }
    const integral = (Ti) => `\\frac{1}{${Ti}}\\int_0^t \\varepsilon\\,dt`;
    const derivative = (Td) => `${Td}\\,\\frac{d\\varepsilon}{dt}`;
    const law = (Kp, Ti, Td) => {
      if (k.type === "P") return `u = ${Kp}\\,\\varepsilon`;
      const terms = [`\\varepsilon`, integral(Ti), ...(k.type === "PID" ? [derivative(Td)] : [])];
      return `u = ${Kp}\\left(${terms.join(" + ")}\\right)`;
    };
    return {
      title: S.eqLaw,
      symbolic: law("K_p", "T_i", "T_d"),
      numeric: law(tex(k.Kp), `${tex(k.Ti)}`, `${tex(k.Td)}`),
    };
  }

  // One TeX group: KaTeX does not break the line inside « u(t - L) ».
  const identifiedModelTex = ({ K, L, tau }) => `{${tex(tau)}\\,\\dot{y}(t) + y(t) = ${tex(K)}\\,u(t${L > 0 ? ` - ${tex(L)}` : ""})}`;

  function processEquation() {
    const p = current();
    const title = S.eqTitle[state.mode];
    if (state.mode === 1) {
      return { title, symbolic: "\\tau\\,\\dot{y} + y = K\\,u", numeric: `${tex(p.tau)}\\,\\dot{y} + y = ${tex(p.K)}\\,u` };
    }
    if (state.mode === 3) {
      // The identified model of polycopié 4 (approximate: the process itself is an S).
      return { title, symbolic: "\\tau\\,\\dot{y}(t) + y(t) = K\\,u(t - L)", numeric: identifiedModelTex(p) };
    }
    const damping = p.xi > 0 ? ` + ${tex(2 * p.xi * p.omega0)}\\,\\dot{y}` : "";
    return {
      title,
      symbolic: "\\ddot{y} + 2\\xi\\omega_0\\,\\dot{y} + \\omega_0^{2}\\,y = K\\omega_0^{2}\\,u",
      numeric: `\\ddot{y}${damping} + ${tex(p.omega0 * p.omega0)}\\,y = ${tex(p.K * p.omega0 * p.omega0)}\\,u`,
      label: S.regimeLabel,
      value: S.regimes[regimeOf(p.xi)],
    };
  }

  // A card holds a title and lines; a line is a TeX string, or { note } (plain text),
  // or { tag, tex } (a small plain-text tag in front of the formula).
  function valueCard(label, lines) {
    const card = document.createElement("div");
    card.className = "value-card";
    const title = document.createElement("span");
    title.textContent = label;
    card.append(title);
    lines.forEach((line) => {
      const row = document.createElement("div");
      if (typeof line === "object" && line.note) { row.className = "note"; row.textContent = line.note; }
      else {
        const expression = typeof line === "string" ? line : line.tex;
        if (line.tag) {
          const tag = document.createElement("small");
          tag.textContent = line.tag;
          const math = document.createElement("span");
          renderTex(math, `\\displaystyle ${expression}`);
          row.append(tag, math);
        } else renderTex(row, `\\displaystyle ${expression}`);
      }
      card.append(row);
    });
    return card;
  }

  // Theoretical formulas of the polycopiés (chapter 3; chapter 4 for the reaction curve),
  // evaluated, plus the settling time measured on the curve.
  function renderValues() {
    const p = current();
    const yInf = p.K * p.u0;
    const sec = "\\,\\mathrm{s}";
    const measured = (tr) => ({ tag: S.measured, tex: `t_r = ${tex(tr)}${sec}` });
    const cards = [valueCard(S.finalValue, [`y_\\infty = K\\,u_0 = ${tex(yInf)}`])];
    if (state.mode === 1) {
      cards.push(valueCard(S.valueAtTau, [`y(\\tau) = \\left(1-e^{-1}\\right) y_\\infty = ${tex(makeResponse(1, p)(p.tau))}`]));
      cards.push(valueCard(S.settling, [
        { tag: S.theory, tex: `t_r \\approx 3\\tau = ${tex(3 * p.tau)}${sec}` },
        measured(settlingTime(1, p)),
      ]));
    } else if (state.mode === 3) {
      const c = znConstruction(p);
      cards.push(valueCard(S.staticGain, [`K = \\frac{\\Delta y}{\\Delta u} = \\frac{${tex(c.yInf)}}{${tex(p.u0)}} = ${tex(c.K)}`]));
      cards.push(valueCard(S.steepest, [
        `t_i = ${tex(c.ti)}${sec}`,
        `y(t_i) = ${tex(c.yi)}`,
        `a = \\dot{y}(t_i) = ${tex(c.a)}\\,\\mathrm{s^{-1}}`,
      ]));
      cards.push(valueCard(S.apparentDelay, [`L = t_i - \\frac{y(t_i)}{a} = ${tex(c.L)}${sec}`]));
      cards.push(valueCard(S.timeConstant, [
        `y(t_{63}) = ${texConst(0.63)}\\,y_\\infty \\Rightarrow t_{63} = ${tex(c.t63)}${sec}`,
        `\\tau = t_{63} - L = ${tex(c.tau)}${sec}`,
      ]));
      cards.push(valueCard(S.identifiedModel, [
        "\\tau\\,\\dot{y}(t) + y(t) = K\\,u(t - L)",
        identifiedModelTex({ K: c.K, L: c.L, tau: c.tau }),
      ]));
    } else {
      const regime = regimeOf(p.xi);
      const root = "\\sqrt{1-\\xi^2}";
      if (regime === "under") {
        const overshoot = 100 * Math.exp(-Math.PI * p.xi / Math.sqrt(1 - p.xi * p.xi));
        const wd = p.omega0 * Math.sqrt(1 - p.xi * p.xi);
        cards.push(valueCard(S.overshoot, [
          `\\begin{aligned} D &= \\frac{y_{\\max} - y_\\infty}{y_\\infty} \\\\ &= e^{-\\pi\\xi/${root}} = ${tex(overshoot)}\\,\\% \\end{aligned}`,
          { tag: S.inverse, tex: `\\xi = \\frac{-\\ln D}{\\sqrt{\\pi^2 + \\ln^2 D}} = ${tex(p.xi)}` },
          { note: S.overshootFraction.replace("{D}", fmt(overshoot / 100)) },
        ]));
        cards.push(valueCard(S.dampedPeriod, [`T_d = \\frac{2\\pi}{\\omega_0${root}} = ${tex(2 * Math.PI / wd)}${sec}`]));
        cards.push(valueCard(S.dampedPulsation, [`\\omega_d = \\omega_0${root} = ${tex(wd)}\\,\\mathrm{rad/s}`]));
        cards.push(valueCard(S.settling, [
          { tag: S.theory, tex: `t_r \\approx \\frac{3}{\\xi\\omega_0} = ${tex(3 / (p.xi * p.omega0))}${sec}` },
          measured(settlingTime(2, p)),
        ]));
      } else if (regime === "undamped") {
        cards.push(valueCard(S.period, [`T_0 = \\frac{2\\pi}{\\omega_0} = ${tex(2 * Math.PI / p.omega0)}${sec}`]));
        cards.push(valueCard(S.settling, [{ note: S.settlingNone }]));
      } else {
        cards.push(valueCard(S.overshoot, ["D = 0\\,\\%", { note: S.noOvershoot }]));
        cards.push(valueCard(S.settling, [measured(settlingTime(2, p))]));
      }
    }
    $("#values-grid").replaceChildren(...cards);
  }

  // Ziegler–Nichols panel: the table of polycopié 4 (selected row in colour) and the
  // selected row evaluated with the K, L, tau of the construction.
  // The Ziegler–Nichols table of polycopié 4, the row of « regulator » in colour.
  function znTableTex(regulator) {
    const k = (v) => texConst(v);
    const rows = {
      P: ["\\text{P}", "\\dfrac{\\tau}{K\\,L}", "-", "-"],
      PI: ["\\text{PI}", `${k(0.9)}\\,\\dfrac{\\tau}{K\\,L}`, `${k(3.3)}\\,L`, "-"],
      PID: ["\\text{PID}", `${k(1.2)}\\,\\dfrac{\\tau}{K\\,L}`, "2\\,L", `${k(0.5)}\\,L`],
    };
    const accent = getComputedStyle(document.body).getPropertyValue("--trace-final").trim();
    const body = Object.entries(rows).map(([name, cells]) => (name === regulator
      ? cells.map((cell) => `{\\color{${accent}}${cell}}`) : cells).join(" & ")).join(" \\\\ ");
    return `\\def\\arraystretch{2.1} \\begin{array}{lccc} \\text{${S.znRegulator}} & K_p & T_i & T_d \\\\ \\hline ${body} \\end{array}`;
  }
  // Its row computed with the K, L, tau read on the reaction curve.
  function znNumericTex(regulator, c) {
    const k = (v) => texConst(v);
    const sec = "\\,\\mathrm{s}";
    const row = ZN_TABLE[regulator];
    const tuning = znTuning(regulator, c);
    const factor = row.kp === 1 ? "" : `${k(row.kp)}\\cdot`;
    const lines = [`K_p = ${factor}\\frac{${tex(c.tau)}}{${tex(c.K)}\\cdot ${tex(c.L)}} = ${tex(tuning.Kp)}`];
    if (tuning.Ti !== null) lines.push(`T_i = ${row.ti === 2 ? "2" : k(row.ti)}\\cdot ${tex(c.L)} = ${tex(tuning.Ti)}${sec}`);
    if (tuning.Td !== null) lines.push(`T_d = ${k(row.td)}\\cdot ${tex(c.L)} = ${tex(tuning.Td)}${sec}`);
    return `\\begin{gathered} ${lines.join(" \\\\ ")} \\end{gathered}`;
  }
  // « Réglage Ziegler–Nichols » panel of the process alone (S curve): its own row selector,
  // K, L, tau of the sliders.
  function renderTuning() {
    if (state.mode !== 3) return;
    document.querySelectorAll("#zn-switch [data-reg]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.reg === state.regulator)));
    renderTex($("#zn-table"), znTableTex(state.regulator));
    const host = $("#zn-numeric");
    const c = znFromSliders(current());
    if (!c.applicable) {
      host.textContent = S.znNotApplicable;
      host.classList.add("note");
      return;
    }
    host.classList.remove("note");
    renderTex(host, znNumericTex(state.regulator, c));
  }
  // Loop: the same table folded under the « Réglage Z-N » button, on the row of the controller
  // in use and with the K, L, tau read for the loop (process + sensor); unfolded by the button.
  function renderLoopTuning(zn = znAvailability()) {
    const details = $("#zn-details");
    details.hidden = state.view !== "loop" || !zn.ok;
    if (details.hidden) return;
    renderTex($("#zn-loop-table"), znTableTex(state.ctrl.type));
    renderTex($("#zn-loop-numeric"), znNumericTex(state.ctrl.type, zn.c));
  }

  // Panels, marks and controls of the current view; pressed state of the selectors.
  function renderVisibility() {
    document.querySelectorAll("[data-only]").forEach((el) => { el.hidden = !visibleIn(el.dataset.only); });
    if (activeElements().length > 1) document.querySelectorAll(".marks [data-only]").forEach((el) => { el.hidden = true; });
    const envelopeBox = markBoxes.find((box) => box.dataset.mark === "envelope");
    envelopeBox.disabled = state.mode !== 2 || regimeOf(state.params[2].xi) !== "under";
    const press = (selector, attribute, value) => document.querySelectorAll(selector).forEach((button) => button.setAttribute("aria-pressed", String(button.dataset[attribute] === String(value))));
    press("#view-switch [data-view]", "view", state.view);
    document.querySelectorAll("#element-switch [data-element]").forEach((button) => button.setAttribute("aria-pressed", String(state.elements[button.dataset.element])));
    $(".readout").hidden = !state.showCursors;
    $(".graph-panel").classList.toggle("cursors-off", !state.showCursors);
    $("#show-cursors").checked = state.showCursors;
    press("#mode-switch [data-mode]", "mode", state.mode);
    press("#ctrl-switch [data-ctrl]", "ctrl", state.ctrl.type);
    $("#saturation").checked = state.loop.sat;
    if (state.ctrl.type === "Hyst") { $(".sat-row").hidden = true; $("#sat-controls").hidden = true; } // u is already u_min or u_max
    const zn = znAvailability();
    // « Réglage Z-N » block: caption, K / L / tau read on the reaction curve, button naming the
    // row of the table it applies (or, without an S curve, a sentence and a disabled button).
    $(".zn-apply").classList.toggle("unavailable", !zn.ok);
    setRich($("#zn-info"), zn.note);
    const values = $("#zn-values");
    values.hidden = !zn.ok;
    if (zn.ok) {
      const sec = "\\,\\mathrm{s}";
      values.replaceChildren(...[`K = ${tex(zn.c.K)}`, `L = ${tex(zn.c.L)}${sec}`, `\\tau = ${tex(zn.c.tau)}${sec}`].map((expression) => {
        const cell = document.createElement("span");
        renderTex(cell, expression);
        return cell;
      }));
    }
    $("#zn-apply").disabled = !zn.ok;
    $("#zn-apply").textContent = S.znApply.replace("{type}", state.ctrl.type);
    renderLoopTuning(zn);
    const limit = $("#s-limit");
    // Shown only when L sits on its minimum (the student has run into it).
    const p3 = state.params[3];
    limit.hidden = state.mode !== 3 || !(state.view === "loop" || showing("process")) || p3.L > ceil3(S_RATIO_MIN * p3.tau);
    limit.textContent = S.sLimit.replace("{r}", fmt(ceil3(S_RATIO_MIN)));
  }

  // Closed-loop run of the current settings (cached: the draw, the readout and the
  // indicators share it). Base horizon: twice the open-loop frame of the process (12 tau for a
  // first order), long enough for a Ziegler–Nichols tuning to settle. The graph runs the loop
  // over its own time axis: with « Axes auto », about three settling times (a fast loop is not
  // squeezed against t = 0), otherwise the fixed axis (refitted by « Recadrer »).
  let loopCache = null;
  let assessmentCache = null;
  const baseDuration = () => 2 * frameDuration(state.mode, current());
  const loopDuration = () => (state.autoAxes || !(state.axes.tMax > 0) ? fittedDuration() : state.axes.tMax);
  function loopConfig(tEnd = loopDuration()) {
    return {
      mode: state.mode, p: current(), ctrl: controller(), tauC: state.sensor.tauC, r0: state.loop.r0,
      sat: state.loop.sat && state.ctrl.type !== "Hyst", uMax: state.loop.uMax, tEnd,
      // The noise is a function of time, on a grid set by the base horizon: the same whatever
      // the window shown or the settings.
      noise: state.sensor.sensorNoise / 100 * Math.abs(state.loop.r0), noisePeriod: baseDuration() / 20000, noiseSeed: state.loopSeed,
    };
  }
  function loopRun() {
    const cfg = loopConfig();
    const key = JSON.stringify(cfg);
    if (!loopCache || loopCache.key !== key) loopCache = { key, cfg, run: simulateLoop(cfg) };
    return loopCache.run;
  }
  // Time axis fitted to the response: three settling times, rounded up to 1, 2, 2,5 or 5 x 10^n,
  // within the horizon where the indicators found it settled (base horizon or 4, 16, 64 times
  // longer: a slow loop is shown until it settles). A loop that does not settle even there is
  // shown over that longest horizon. A diverging loop: twice the instant y leaves 3 |r|, the
  // start of the divergence. A loop oscillating for good (saturated, or on-off by design): the
  // base horizon.
  function fittedDuration() {
    const base = baseDuration();
    if (state.ctrl.type === "Hyst") return base;
    const ind = loopAssessment();
    const nice = (rough) => {
      const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
      return [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((v) => v >= rough * (1 - 1e-9));
    };
    if (ind.unstable) return ind.escape > 0 ? Math.min(base, nice(2 * ind.escape)) : base;
    if (!ind.settled || !(ind.settlingTime > 0)) return ind.horizon;
    return Math.min(ind.horizon, nice(3 * ind.settlingTime));
  }
  // Indicators of the loop « after a long time », on the base horizon: when it ends before the
  // response settles, the same loop is run again, 4, 16 then 64 times longer (in the background:
  // the graph keeps its window), until it settles or goes unstable. Static error, overshoot and
  // settling time belong to the dynamics of the loop: they are read without the measurement
  // noise (the graph shows it). The on-off loop is read as run, noise included: its switchings
  // on the noise are the point.
  function loopAssessment() {
    const base = loopConfig(baseDuration());
    const key = JSON.stringify(base);
    if (assessmentCache && assessmentCache.key === key) return assessmentCache.value;
    let value;
    if (base.ctrl.type === "Hyst") value = relayIndicators(simulateLoop(base), base);
    else {
      const cfg = { ...base, noise: 0 };
      let ind = loopIndicators(simulateLoop(cfg), cfg.r0);
      let horizon = cfg.tEnd;
      for (const factor of [4, 16, 64]) {
        if (ind.unstable || ind.settled) break;
        const longer = { ...cfg, tEnd: factor * cfg.tEnd };
        if (loopStepCount(longer) > MAX_LOOP_STEPS) break;
        ind = loopIndicators(simulateLoop(longer), cfg.r0);
        horizon = longer.tEnd;
      }
      value = { ...ind, horizon };
    }
    assessmentCache = { key, value };
    return value;
  }

  const percent = (fraction) => (Math.abs(fraction) < 5e-4 ? "0" : fmt(100 * fraction)); // below 0.05 %: 0
  function renderIndicators() {
    if (context() !== "loop") return;
    const ind = loopAssessment();
    const alert = $("#ind-unstable");
    if (ind.relay) {
      // On-off control: the oscillation is the expected behaviour; its size and pace are read.
      $("#ind-error-label").textContent = S.indAmplitude;
      $("#ind-overshoot-label").textContent = S.indPeriod;
      $("#ind-settling-label").textContent = S.indSwitches;
      $("#ind-error").textContent = fmt(ind.amplitude);
      $("#ind-overshoot").textContent = ind.period === null ? "—" : `${fmt(ind.period)} s`;
      $("#ind-settling").textContent = String(ind.switches);
      alert.hidden = ind.reachable && !ind.unstable;
      setRich(alert.querySelector("strong"), ind.unstable ? S.unstable : S.unreachable);
      return;
    }
    $("#ind-error-label").textContent = S.staticError;
    $("#ind-overshoot-label").textContent = S.overshootInd;
    $("#ind-settling-label").textContent = S.settling;
    alert.querySelector("strong").textContent = S.unstable;
    alert.hidden = !ind.unstable;
    $("#ind-settling").textContent = ind.settlingTime === null ? "—" : `${fmt(ind.settlingTime)} s`;
    $("#ind-error").textContent = ind.unstable ? "—" : ind.settled ? `${percent(ind.error)} % ${S.ofSetpoint}` : S.notSettled;
    $("#ind-overshoot").textContent = ind.unstable || ind.overshoot === null ? "—" : `${percent(ind.overshoot)} %`;
  }

  // Linear interpolation in a uniformly sampled run (NaN after its end, e.g. a run cut short).
  function interpolate(ts, vs, t) {
    const n = ts.length;
    if (n < 2) return NaN;
    const position = t / (ts[1] - ts[0]);
    const i = Math.floor(position);
    if (i >= n - 1) return Math.abs(t - ts[n - 1]) < 1e-9 * (ts[n - 1] || 1) ? vs[n - 1] : NaN;
    return vs[i] + (position - i) * (vs[i + 1] - vs[i]);
  }

  // The step response of a block, as a function of t.
  function curveOf(el) {
    if (el === "sensor") return sensorStep(state.sensor.tauC);
    if (el === "ctrl") return controllerStep(controller()).total;
    return makeResponse(state.mode, current());
  }

  // ---------------------------------------------------------------------------
  // Axes
  // ---------------------------------------------------------------------------
  // Axes fit the active curve(s) and, when it belongs to this view, the stored grey curve(s).
  function reframe() {
    const c = context();
    const memory = state.memory && state.memory.context === c ? state.memory : null;
    if (c === "loop") { reframeLoop(memory); return; }
    const p = current();
    const els = activeElements();
    let tMax = 0;
    els.forEach((el) => { tMax = Math.max(tMax, el === "sensor" ? sensorFrame() : frameDuration(state.mode, p)); });
    if (memory) memory.curves.forEach((m) => { tMax = Math.max(tMax, m.t[m.t.length - 1]); });
    state.axes = { ...state.axes, tMax, ...elementsRange(tMax, memory) };
    state.cursors.forEach((cursor, i) => { if (cursor.t > tMax) cursor.t = CURSOR_DEFAULTS[i] * tMax; });
  }

  // Vertical range of the block curves (and stored ones) over [0, tMax], with room for the
  // measurement noise of the sensor curve.
  function elementsRange(tMax, memory) {
    const p = current();
    let yMin = 0;
    let yMax = 0;
    let margin = 0;
    activeElements().forEach((el) => {
      if (el === "sensor") { yMax = Math.max(yMax, 1); margin = 3 * state.sensor.sensorNoise / 100; }
      const y = curveOf(el);
      const n = el === "process" ? sampleCount(state.mode, p, tMax, 2000) : 2000;
      for (let i = 0; i <= n; i += 1) { const v = y(tMax * i / n); yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
    });
    if (memory) memory.curves.forEach((m) => m.t.forEach((t, i) => { if (t <= tMax) { yMin = Math.min(yMin, m.y[i]); yMax = Math.max(yMax, m.y[i]); } }));
    yMin -= margin;
    yMax += margin;
    if (yMax === yMin) yMax = yMin + 1;
    return { yMin: 1.1 * yMin, yMax: 1.1 * yMax };
  }

  // Closed loop: r, y, y_m on top, u below (with ±u_max when saturated). A loop going unstable
  // is clipped: the axes keep the part of the run before y leaves 3 |r|.
  function reframeLoop(memory) {
    const tMax = fittedDuration();
    state.axes.tMax = tMax; // the run shown follows this axis
    state.axes = { tMax, ...loopRanges(memory) };
    state.cursors.forEach((cursor, i) => { if (cursor.t > tMax) cursor.t = CURSOR_DEFAULTS[i] * tMax; });
  }
  function loopRanges(memory) {
    const run = loopRun();
    const r0 = state.loop.r0;
    let cut = run.y.length;
    if (run.unstable) {
      const first = run.y.findIndex((v) => Math.abs(v) > 3 * Math.abs(r0));
      if (first > 10) cut = first;
    }
    let yLo = Math.min(0, r0);
    let yHi = Math.max(0, r0);
    let uLo = 0;
    let uHi = 0;
    for (let i = 0; i < cut; i += 1) {
      if (![run.y[i], run.ym[i], run.u[i]].every(Number.isFinite)) break;
      yLo = Math.min(yLo, run.y[i], run.ym[i]); yHi = Math.max(yHi, run.y[i], run.ym[i]);
      uLo = Math.min(uLo, run.u[i]); uHi = Math.max(uHi, run.u[i]);
    }
    if (memory) {
      memory.y.forEach((v) => { yLo = Math.min(yLo, v); yHi = Math.max(yHi, v); });
      memory.u.forEach((v) => { uLo = Math.min(uLo, v); uHi = Math.max(uHi, v); });
    }
    if (run.unstable) { yLo = Math.max(yLo, -3 * Math.abs(r0)); yHi = Math.min(yHi, 3 * Math.abs(r0)); }
    if (state.loop.sat && state.ctrl.type !== "Hyst") { uLo = Math.min(uLo, -state.loop.uMax); uHi = Math.max(uHi, state.loop.uMax); }
    if (uHi === uLo) { uLo -= 1; uHi += 1; }
    return { yMin: 1.1 * yLo, yMax: 1.1 * yHi, uMin: 1.1 * uLo, uMax: 1.1 * uHi };
  }

  // Double click on a graph with fixed axes (« Axes auto » unchecked): its vertical axis fits
  // the curves shown, the time axis stays. Loop: the area clicked, y above or u below.
  function fitVertical(index) {
    const c = context();
    const memory = state.memory && state.memory.context === c ? state.memory : null;
    if (c === "loop") {
      const r = loopRanges(memory);
      if (index === 1) { state.axes.uMin = r.uMin; state.axes.uMax = r.uMax; }
      else { state.axes.yMin = r.yMin; state.axes.yMax = r.yMax; }
    } else Object.assign(state.axes, elementsRange(state.axes.tMax, memory));
    update();
  }

  // Round tick values (1/2/2.5/5 x 10^n steps), as in the reference simulator.
  function axisTicks(minValue, maxValue) {
    const span = maxValue - minValue;
    if (!(span > 0)) return [];
    const rough = span / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    let step = magnitude * 10;
    for (const multiplier of [1, 2, 2.5, 5, 10]) { if (magnitude * multiplier >= rough) { step = magnitude * multiplier; break; } }
    const values = [];
    for (let i = Math.ceil(minValue / step - 1e-9); i * step <= maxValue + step * 1e-6; i += 1) values.push(Math.abs(i * step) < step * 1e-6 ? 0 : i * step);
    return { values, step };
  }
  // Large values (ticks of 100 000 and more, e.g. the command of a loop that diverges) are
  // written m·10^n, so that the labels keep a sensible width.
  const SUPERSCRIPTS = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function tickFormatter(step) {
    const exponent = Math.floor(Math.log10(step) + 1e-9);
    const mantissa = step / Math.pow(10, exponent);
    if (exponent >= 5) {
      const digits = new Intl.NumberFormat(S.locale, { maximumFractionDigits: 3 });
      return { format: (v) => {
        if (v === 0) return "0";
        const n = Math.floor(Math.log10(Math.abs(v)) + 1e-9);
        const power = `10${String(n).replace(/./g, (c) => SUPERSCRIPTS[c])}`;
        const m = v / Math.pow(10, n);
        return Math.abs(Math.abs(m) - 1) < 1e-9 ? `${m < 0 ? "−" : ""}${power}` : `${digits.format(m).replace("-", "−")}·${power}`;
      } };
    }
    const decimals = Math.max(0, -exponent + (Math.abs(mantissa - 2.5) < 1e-6 ? 1 : 0));
    return new Intl.NumberFormat(S.locale, { maximumFractionDigits: Math.min(decimals, 8) });
  }

  // ---------------------------------------------------------------------------
  // Plot (canvas, devicePixelRatio aware; technique from the reference simulator). One area
  // for the step response of a block, two stacked areas (y above, u below) for the loop.
  // ---------------------------------------------------------------------------
  let drawQueued = false;
  function scheduleDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => { drawQueued = false; draw(); });
  }

  // Name of the vertical axis of a single block (none when several are superposed: the legend
  // tells the curves apart) and colour of each block when superposed.
  const AXIS_NAMES = { process: ["y"], sensor: ["y", "m"], ctrl: ["u"], several: null };
  const ELEMENT_TINTS = { process: "--trace-y", sensor: "--trace-ym", ctrl: "--trace-u" };
  // Marks (repères) belong to one block: they are drawn, and offered, only for a block shown alone.
  const markOn = (key) => state.marks[key] && activeElements().length <= 1;

  function draw() {
    const css = getComputedStyle(document.body);
    const color = (name) => css.getPropertyValue(name).trim();
    const rect = screen.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.max(rect.width, 200);
    const height = Math.max(rect.height, 160);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const c = context();
    const loop = c === "loop";
    const ax = state.axes;
    const tMax = ax.tMax;
    const font = (size) => `500 ${size}px Inter, "Segoe UI", Arial, sans-serif`;
    const small = width < 520;

    // Areas and their ticks; a common left margin so that the time axes line up.
    const rows = loop
      ? [{ yMin: ax.yMin, yMax: ax.yMax, name: ["y"], weight: 0.62 }, { yMin: ax.uMin, yMax: ax.uMax, name: ["u"], weight: 0.38 }]
      : [{ yMin: ax.yMin, yMax: ax.yMax, name: AXIS_NAMES[activeElements().length === 1 ? activeElements()[0] : "several"], weight: 1 }];
    ctx.font = font(small ? 12 : 12.5);
    rows.forEach((row) => { row.ticks = axisTicks(row.yMin, row.yMax); row.format = tickFormatter(row.ticks.step); });
    const labelWidth = Math.max(10, ...rows.flatMap((row) => row.ticks.values.map((v) => ctx.measureText(row.format.format(v)).width)));
    const left = Math.ceil(labelWidth) + (small ? 14 : 20);
    const right = small ? 14 : 22;
    const top = 26;
    const bottom = small ? 40 : 44;
    const gap = 30;
    const plotWidth = width - left - right;
    const available = height - top - bottom - gap * (rows.length - 1);
    const xAt = (t) => left + t / tMax * plotWidth;
    let y0 = top;
    const areas = rows.map((row) => {
      const areaTop = y0;
      const areaHeight = available * row.weight;
      y0 += areaHeight + gap;
      return { ...row, top: areaTop, height: areaHeight, yAt: (v) => areaTop + (row.yMax - v) / (row.yMax - row.yMin) * areaHeight };
    });
    plotView = { left, plotWidth, tMax, areas: areas.map(({ top: areaTop, height: areaHeight }) => ({ top: areaTop, height: areaHeight })) };

    // Symbol with an optional subscript (canvas text in the KaTeX math font).
    const sym = (tint, [base, sub], x, y, align = "left", size = 16) => {
      ctx.fillStyle = tint; ctx.textAlign = "left";
      ctx.font = `italic ${size}px ${MATH_FONT}`;
      const wBase = ctx.measureText(base).width;
      ctx.font = `italic ${Math.round(size * 0.7)}px ${MATH_FONT}`;
      const wSub = sub ? ctx.measureText(sub).width + 1 : 0;
      const x0 = align === "right" ? x - wBase - wSub : align === "center" ? x - (wBase + wSub) / 2 : x;
      ctx.font = `italic ${size}px ${MATH_FONT}`;
      ctx.fillText(base, x0, y);
      if (sub) { ctx.font = `italic ${Math.round(size * 0.7)}px ${MATH_FONT}`; ctx.fillText(sub, x0 + wBase + 1, y + size * 0.28); }
      return wBase + wSub;
    };

    // Grids and tick labels.
    const xTicks = axisTicks(0, tMax);
    const xFormat = tickFormatter(xTicks.step);
    areas.forEach((area) => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = color("--scope-grid");
      xTicks.values.forEach((t) => { const x = Math.round(xAt(t)) + 0.5; ctx.beginPath(); ctx.moveTo(x, area.top); ctx.lineTo(x, area.top + area.height); ctx.stroke(); });
      area.ticks.values.forEach((v) => { const y = Math.round(area.yAt(v)) + 0.5; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + plotWidth, y); ctx.stroke(); });
      ctx.strokeStyle = color("--scope-zero");
      if (area.yMin <= 0 && area.yMax >= 0) { ctx.beginPath(); ctx.moveTo(left, Math.round(area.yAt(0)) + 0.5); ctx.lineTo(left + plotWidth, Math.round(area.yAt(0)) + 0.5); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(Math.round(left) + 0.5, area.top); ctx.lineTo(Math.round(left) + 0.5, area.top + area.height); ctx.stroke();
      ctx.fillStyle = color("--scope-text");
      ctx.font = font(small ? 12 : 12.5);
      ctx.textAlign = "right";
      area.ticks.values.forEach((v) => ctx.fillText(area.format.format(v), left - 7, area.yAt(v) + 4));
      if (area.name) sym(color("--scope-text"), area.name, left - Math.min(labelWidth + 6, left - 4), area.top - 9, "left", small ? 16 : 17);
    });
    const last = areas[areas.length - 1];
    const plotBottom = last.top + last.height;
    ctx.fillStyle = color("--scope-text");
    ctx.font = font(small ? 12 : 12.5);
    ctx.textAlign = "center";
    xTicks.values.forEach((t, i) => {
      if (small && xTicks.values.length > 7 && i % 2) return;
      ctx.fillText(xFormat.format(t), xAt(t), plotBottom + 16);
    });
    ctx.font = font(small ? 13 : 14);
    ctx.fillText(S.timeAxis, left + plotWidth / 2, plotBottom + (small ? 34 : 37));

    // Drawing helpers on an area (paths are clamped so that a diverging curve stays drawable).
    const clampY = (y) => Math.max(-1e5, Math.min(1e5, y));
    const pathFn = (area, fn, n) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= n; i += 1) {
        const t = tMax * i / n;
        const v = fn(t);
        if (!Number.isFinite(v)) continue;
        if (!started) { ctx.moveTo(xAt(t), clampY(area.yAt(v))); started = true; } else ctx.lineTo(xAt(t), clampY(area.yAt(v)));
      }
    };
    const pathData = (area, ts, vs) => {
      ctx.beginPath();
      for (let i = 0; i < ts.length; i += 1) { const x = xAt(ts[i]); const y = clampY(area.yAt(vs[i])); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    };
    const stroke = (tint, lineWidth, dash = []) => { ctx.setLineDash(dash); ctx.lineWidth = lineWidth; ctx.lineJoin = "round"; ctx.strokeStyle = tint; ctx.stroke(); ctx.setLineDash([]); };
    const clip = (area, paint) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(left, area.top - 1, plotWidth + 1, area.height + 2); ctx.clip();
      paint();
      ctx.restore();
    };
    const memory = state.memory && state.memory.context === c ? state.memory : null;

    // Legend in the margin above an area, right-aligned: [[symbol, tint, dash]].
    const legend = (area, items) => {
      let x = left + plotWidth;
      const y = area.top - 9;
      [...items].reverse().forEach(([name, tint, dash]) => {
        ctx.font = `italic 15px ${MATH_FONT}`;
        const w = sym("transparent", name, 0, -100, "left", 15);
        sym(tint, name, x - w, y, "left", 15);
        x -= w + 6;
        ctx.beginPath(); ctx.moveTo(x - 18, y - 5); ctx.lineTo(x, y - 5);
        stroke(tint, 2.4, dash);
        x -= 18 + 14;
      });
    };

    let cursorPoints; // (cursor) -> [{ area, t, v }] dots of a read cursor
    if (loop) {
      const run = loopRun();
      const [yArea, uArea] = areas;
      const showYm = state.sensor.tauC > 0 || state.sensor.sensorNoise > 0;
      // A loop going unstable: the traces stop shortly after y leaves the graph.
      let end = run.t.length;
      if (run.unstable) {
        const limit = 3 * Math.max(Math.abs(ax.yMin), Math.abs(ax.yMax));
        const first = run.y.findIndex((v) => Math.abs(v) > limit);
        if (first >= 0) end = first + 1;
      }
      const ts = run.t.slice(0, end);
      clip(yArea, () => {
        ctx.beginPath(); ctx.moveTo(xAt(0), yArea.yAt(state.loop.r0)); ctx.lineTo(xAt(tMax), yArea.yAt(state.loop.r0));
        stroke(color("--trace-r"), 1.6, [7, 5]);
        if (state.ctrl.type === "Hyst" && state.ctrl.band > 0) { // thresholds r ± Δ/2
          [1, -1].forEach((sign) => {
            const level = state.loop.r0 + sign * state.ctrl.band / 2;
            ctx.beginPath(); ctx.moveTo(xAt(0), yArea.yAt(level)); ctx.lineTo(xAt(tMax), yArea.yAt(level));
            stroke(color("--trace-final"), 1.2, [3, 4]);
          });
        }
        if (memory) { pathData(yArea, memory.t, memory.y); stroke(color("--trace-memory"), 1.5); }
        if (showYm) { pathData(yArea, ts, run.ym); stroke(color("--trace-ym"), 1.8); }
        pathData(yArea, ts, run.y); stroke(color("--trace-y"), 2.7);
      });
      clip(uArea, () => {
        if (state.loop.sat) {
          [1, -1].forEach((sign) => { ctx.beginPath(); ctx.moveTo(left, uArea.yAt(sign * state.loop.uMax)); ctx.lineTo(left + plotWidth, uArea.yAt(sign * state.loop.uMax)); stroke(color("--trace-tau"), 1.4, [6, 4]); });
        }
        if (memory) { pathData(uArea, memory.t, memory.u); stroke(color("--trace-memory"), 1.5); }
        pathData(uArea, ts, run.u); stroke(color("--trace-u"), 2.2);
      });
      legend(yArea, [[["r"], color("--trace-r"), [5, 4]], [["y"], color("--trace-y"), []], ...(showYm ? [[["y", "m"], color("--trace-ym"), []]] : [])]);
      legend(uArea, [[["u"], color("--trace-u"), []], ...(state.loop.sat ? [[["±u", "max"], color("--trace-tau"), [5, 4]]] : [])]);
      cursorPoints = (cursor) => [
        { area: yArea, t: cursor.t, v: interpolate(run.t, run.y, cursor.t) },
        { area: uArea, t: cursor.t, v: interpolate(run.t, run.u, cursor.t) },
      ];
    } else {
      // Step responses of the blocks, superposed on one area. A block alone keeps the colours
      // of its own view; superposed blocks take the colours of the loop view (y, y_m, u).
      const [area] = areas;
      const els = activeElements();
      const single = els.length === 1;
      const tintOf = (el) => color(single ? "--trace-y" : ELEMENT_TINTS[el]);
      const points = [];
      if (memory) clip(area, () => memory.curves.forEach((m) => { pathData(area, m.t, m.y); stroke(color("--trace-memory"), 1.5); }));
      if (showing("process")) {
        drawProcess(area, { color, font, xAt, left, plotWidth, tMax, pathFn, clip, pathData, stroke, tint: tintOf("process") });
        const response = curveOf("process");
        points.push((cursor) => ({ area, t: cursor.t, v: response(cursor.t) }));
      }
      if (showing("sensor")) {
        const tauC = state.sensor.tauC;
        const measured = measuredSamples(tMax); // noisy samples of y_m, or null
        clip(area, () => {
          if (single) {
            ctx.beginPath(); ctx.moveTo(xAt(0), area.yAt(0)); ctx.lineTo(xAt(0), area.yAt(1)); ctx.lineTo(xAt(tMax), area.yAt(1));
            stroke(color("--trace-r"), 1.6, [7, 5]);
          }
          if (measured) {
            ctx.fillStyle = tintOf("sensor");
            const r = measured.t.length > 900 ? 1.4 : 2;
            for (let i = 0; i < measured.t.length; i += 1) {
              ctx.beginPath(); ctx.arc(xAt(measured.t[i]), clampY(area.yAt(measured.v[i])), r, 0, 2 * Math.PI); ctx.fill();
            }
          } else {
            pathFn(area, sensorStep(tauC), Math.ceil(plotWidth * 2));
            if (tauC <= 0) { ctx.moveTo(xAt(0), area.yAt(0)); ctx.lineTo(xAt(0), area.yAt(1)); }
            stroke(tintOf("sensor"), 2.7);
          }
          if (markOn("tauc") && tauC > 0) {
            const tint = color("--trace-tau");
            ctx.beginPath(); ctx.moveTo(left, area.yAt(F63)); ctx.lineTo(xAt(tauC), area.yAt(F63)); ctx.lineTo(xAt(tauC), area.yAt(0));
            stroke(tint, 1.4, [5, 4]);
            ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(xAt(tauC), area.yAt(F63), 4.5, 0, 2 * Math.PI); ctx.fill();
            ctx.font = font(13); ctx.textAlign = "left"; ctx.fillText("63 %", left + 6, area.yAt(F63) - 6);
            sym(tint, ["τ", "c"], xAt(tauC) + 5, area.yAt(0) - 7);
          }
        });
        points.push((cursor) => { const read = reading(cursor, measured); return { area, t: read.t, v: read.y }; });
      }
      if (showing("ctrl")) {
        const step = controllerStep(controller());
        const tints = { P: color("--trace-final"), I: color("--trace-tau"), D: color("--trace-tangent") };
        clip(area, () => {
          if (markOn("actions")) {
            Object.entries(step.actions).forEach(([name, fn]) => { pathFn(area, fn, Math.ceil(plotWidth * 2)); stroke(tints[name], 1.8, [7, 5]); });
          }
          pathFn(area, step.total, Math.ceil(plotWidth * 4));
          stroke(tintOf("ctrl"), 2.7);
          if (markOn("actions")) {
            ctx.font = `700 14px Inter, "Segoe UI", Arial, sans-serif`;
            Object.entries(step.actions).forEach(([name, fn]) => {
              const t = name === "D" ? 2 * controller().Td / N_FILTER : tMax;
              ctx.fillStyle = tints[name]; ctx.textAlign = name === "D" ? "left" : "right";
              ctx.fillText(name, xAt(t) + (name === "D" ? 6 : -6), Math.max(area.top + 14, Math.min(area.top + area.height - 4, area.yAt(fn(t)) - 7)));
            });
          }
        });
        points.push((cursor) => ({ area, t: cursor.t, v: step.total(cursor.t) }));
      }
      if (!single) legend(area, els.map((el) => [AXIS_NAMES[el], tintOf(el), []]));
      else if (els[0] === "sensor") legend(area, [[["y"], color("--trace-r"), [5, 4]], [["y", "m"], tintOf("sensor"), []]]);
      else if (els[0] === "ctrl") legend(area, [[["u"], tintOf("ctrl"), []]]);
      cursorPoints = (cursor) => points.map((point) => point(cursor));
    }

    // Read cursors: vertical line across the areas, numbered tab at the top, dots on the curves.
    ctx.save();
    ctx.beginPath(); ctx.rect(left, top - 1, plotWidth + 1, plotBottom - top + 2); ctx.clip();
    state.cursors.forEach((cursor, i) => {
      if (!state.showCursors || !cursor.on || cursor.t > tMax) return;
      const points = cursorPoints(cursor);
      const tint = color(`--cursor-${i + 1}`);
      const x = Math.round(xAt(points[0].t)) + 0.5;
      ctx.lineWidth = 1.6; ctx.strokeStyle = tint;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, plotBottom); ctx.stroke();
      ctx.fillStyle = tint;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - 9, top, 18, 18, 5); else ctx.rect(x - 9, top, 18, 18); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = `700 12px Inter, "Segoe UI", Arial, sans-serif`; ctx.textAlign = "center";
      ctx.fillText(String(i + 1), x, top + 13.5);
      points.forEach(({ area, v }) => {
        if (!Number.isFinite(v)) return;
        ctx.beginPath(); ctx.arc(x, clampY(area.yAt(v)), 5.5, 0, 2 * Math.PI);
        ctx.fillStyle = tint; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = color("--scope-screen"); ctx.stroke();
      });
    });
    ctx.restore();
  }

  // Step response of the process: the curve y (no noise: the measurement noise is on y_m) and
  // the marks of polycopiés 3 and 4.
  function drawProcess(area, { color, font, xAt, left, plotWidth, tMax, pathFn, clip, stroke, tint: curveTint }) {
    const yAt = area.yAt;
    const top = area.top;
    const p = current();
    const yInf = p.K * p.u0;
    const samples = (mode, params) => sampleCount(mode, params, tMax, Math.ceil(plotWidth * 2));
    const dashed = (tint, width, dash, points) => {
      ctx.beginPath(); points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      stroke(tint, width, dash);
    };
    const dot = (tint, x, y, r = 4.5) => { ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); };
    const mathLabel = (tint, text, x, y, align = "left", sub = "") => {
      ctx.fillStyle = tint; ctx.font = `italic 16px ${MATH_FONT}`; ctx.textAlign = "left";
      const wBase = ctx.measureText(text).width;
      ctx.font = `italic 11px ${MATH_FONT}`;
      const wSub = sub ? ctx.measureText(sub).width + 1 : 0;
      const x0 = align === "right" ? x - wBase - wSub : align === "center" ? x - (wBase + wSub) / 2 : x;
      ctx.font = `italic 16px ${MATH_FONT}`; ctx.fillText(text, x0, y);
      if (sub) { ctx.font = `italic 11px ${MATH_FONT}`; ctx.fillText(sub, x0 + wBase + 1, y + 4); }
    };
    // Labels next to the time axis go above it for a rising curve, below it for a falling one.
    const axisLabelY = yInf >= 0 ? yAt(0) - 7 : yAt(0) + 18;
    const response = makeResponse(state.mode, p);

    clip(area, () => {
      // Final value and +/- 5 % band (orders 1 and 2), final value alone (order n).
      const showFinal = (state.mode !== 3 && markOn("band")) || (state.mode === 3 && markOn("final"));
      if (state.mode !== 3 && markOn("band")) {
        ctx.fillStyle = color("--trace-band");
        ctx.fillRect(left, yAt(1.05 * yInf), plotWidth, yAt(0.95 * yInf) - yAt(1.05 * yInf));
      }
      if (showFinal) dashed(color("--trace-final"), 1.6, [7, 5], [[left, yAt(yInf)], [left + plotWidth, yAt(yInf)]]);

      // Envelope (underdamped second order).
      if (state.mode === 2 && markOn("envelope") && regimeOf(p.xi) === "under") {
        const amp = 1 / Math.sqrt(1 - p.xi * p.xi);
        const n = Math.ceil(plotWidth);
        [1, -1].forEach((sign) => { pathFn(area, (t) => yInf * (1 + sign * amp * Math.exp(-p.xi * p.omega0 * t)), n); stroke(color("--trace-envelope"), 1.5, [6, 5]); });
      }

      // Reaction curve: construction of polycopié 4 on the noise-free model.
      const zn = state.mode === 3 ? znConstruction(p) : null;
      if (zn && markOn("model")) {
        pathFn(area, (t) => (t <= zn.L ? 0 : zn.yInf * (1 - Math.exp(-(t - zn.L) / zn.tau))), Math.ceil(plotWidth));
        stroke(color("--trace-model"), 2, [7, 5]);
      }

      // Active curve: y, the true output of the process (the noise is on y_m, see the sensor).
      pathFn(area, response, samples(state.mode, p));
      stroke(curveTint, 2.7);

      // 63 % and tau (first order).
      if (state.mode === 1 && markOn("tau")) {
        const y63 = response(p.tau);
        const tint = color("--trace-tau");
        dashed(tint, 1.4, [5, 4], [[left, yAt(y63)], [xAt(p.tau), yAt(y63)], [xAt(p.tau), yAt(0)]]);
        dot(tint, xAt(p.tau), yAt(y63));
        ctx.font = font(13);
        ctx.textAlign = "left";
        ctx.fillText("63 %", left + 6, yAt(y63) - 6);
        mathLabel(tint, "τ", xAt(p.tau) + 5, axisLabelY);
      }

      if (zn) {
        // Tangent at the steepest point, from the starting level to the final level (and a bit
        // beyond); it crosses the starting level at L.
        if (markOn("tangent")) {
          const tint = color("--trace-tangent");
          const tEnd = zn.L + zn.yInf / zn.a;
          const extra = 0.12 * (tEnd - zn.L);
          const tangent = (t) => zn.yi + zn.a * (t - zn.ti);
          ctx.beginPath(); ctx.moveTo(xAt(zn.L - extra), yAt(tangent(zn.L - extra))); ctx.lineTo(xAt(tEnd + extra), yAt(tangent(tEnd + extra)));
          stroke(tint, 1.8);
          dot(tint, xAt(zn.ti), yAt(zn.yi));
          ctx.lineWidth = 2; ctx.strokeStyle = color("--scope-screen"); ctx.stroke();
          dot(tint, xAt(zn.L), yAt(0), 4);
          mathLabel(tint, "L", xAt(zn.L) + (zn.L > 0 ? -6 : 6), axisLabelY, zn.L > 0 ? "right" : "left");
        }
        // 63 % of the rise and tau, counted from the end of the apparent delay.
        if (markOn("zntau")) {
          const tint = color("--trace-tau");
          dashed(tint, 1.4, [5, 4], [[left, yAt(zn.y63)], [xAt(zn.t63), yAt(zn.y63)], [xAt(zn.t63), yAt(0)]]);
          dot(tint, xAt(zn.t63), yAt(zn.y63));
          ctx.fillStyle = tint; ctx.font = font(13); ctx.textAlign = "left";
          ctx.fillText("63 %", left + 6, yAt(zn.y63) + (zn.yInf >= 0 ? -6 : 16));
          // Span L -> t63 along the time axis, with arrow heads.
          const yArrow = yAt(0) + (zn.yInf >= 0 ? -26 : 26);
          const x1 = xAt(zn.L);
          const x2 = xAt(zn.t63);
          dashed(tint, 1.3, [3, 3], [[x1, yAt(0)], [x1, yArrow]]);
          ctx.beginPath(); ctx.moveTo(x1, yArrow); ctx.lineTo(x2, yArrow);
          if (x2 - x1 > 14) {
            ctx.moveTo(x1 + 7, yArrow - 4); ctx.lineTo(x1, yArrow); ctx.lineTo(x1 + 7, yArrow + 4);
            ctx.moveTo(x2 - 7, yArrow - 4); ctx.lineTo(x2, yArrow); ctx.lineTo(x2 - 7, yArrow + 4);
          }
          stroke(tint, 1.6);
          mathLabel(tint, "τ", (x1 + x2) / 2, yArrow + (zn.yInf >= 0 ? -6 : 16), "center");
        }
      }

      if (showFinal) {
        const tint = color("--trace-final");
        const yLabel = state.mode === 3 ? yAt(yInf) + (yInf >= 0 ? -6 : 16) : Math.max(top + 14, Math.min(yAt(1.05 * yInf), yAt(0.95 * yInf)) - 5);
        mathLabel(tint, "y", left + plotWidth - 6, yLabel, "right", "∞");
      }
    });
  }

  // Readout of the cursors: time, then one column per curve, named as on the graph (y, y_m,
  // u). Loop: y, y_m (sensor not perfect) and u; elements: one column per block shown. On the
  // process, the noisy sample nearest to the cursor; a loop cut short reads « — » after its end.
  const DELTA_TEX = { y: "\\Delta y", ym: "\\Delta y_m", u: "\\Delta u" };
  const ELEMENT_COLUMNS = { process: "y", sensor: "ym", ctrl: "u" };
  function readoutColumns() {
    if (context() === "loop") {
      const run = loopRun();
      const at = (values) => (cursor) => ({ t: cursor.t, v: interpolate(run.t, values, cursor.t) });
      const ySpan = state.axes.yMax - state.axes.yMin;
      return [
        { key: "y", read: at(run.y), span: ySpan },
        ...(state.sensor.tauC > 0 || state.sensor.sensorNoise > 0 ? [{ key: "ym", read: at(run.ym), span: ySpan }] : []),
        { key: "u", read: at(run.u), span: state.axes.uMax - state.axes.uMin },
      ];
    }
    const measured = showing("sensor") ? measuredSamples(state.axes.tMax) : null;
    return activeElements().map((el) => ({
      key: ELEMENT_COLUMNS[el],
      span: state.axes.yMax - state.axes.yMin,
      read: el === "sensor"
        ? (cursor) => { const r = reading(cursor, measured); return { t: r.t, v: r.y }; }
        : (cursor) => ({ t: cursor.t, v: curveOf(el)(cursor.t) }),
    }));
  }

  // Values read on a curve: a fixed number of decimals set by the scale of its axis (about four
  // digits at full scale, as on a scope), so that a tiny difference stays short (0,001, not
  // 0,000728). Times keep three significant digits.
  function readFormatter(span) {
    if (!(span > 0)) return (v) => fmt(v);
    const decimals = Math.min(8, Math.max(0, 4 - Math.ceil(Math.log10(span))));
    const format = new Intl.NumberFormat(S.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return (v) => format.format(Math.abs(v) < 0.5 * Math.pow(10, -decimals) ? 0 : v);
  }

  // The readout grid is rebuilt when its columns (or the language) change: per cursor a
  // toggle, t and the values; then the differences.
  let readoutSignature = "";
  function buildReadout(keys) {
    const host = $(".readout");
    const cell = (labelTex, id) => `<div class="read-cell"><var data-tex="${labelTex}"></var><strong id="${id}">—</strong></div>`;
    const symbol = (key, n) => (key === "ym" ? `y_{m,${n}}` : `${key}_${n}`);
    host.style.setProperty("--read-columns", String(keys.length + 1));
    host.classList.toggle("dense", keys.length > 1); // three or four columns
    host.innerHTML = [1, 2].map((n) => `<button type="button" class="cursor-toggle" id="cursor-${n}" data-n="${n}" aria-pressed="false"><i aria-hidden="true"></i><span>${S[`cursor${n}`]}</span></button>`
      + cell(`t_${n}`, `read-t${n}`) + keys.map((key) => cell(symbol(key, n), `read-${key}${n}`)).join("")).join("")
      + `<div class="read-delta">${cell("\\Delta t", "read-dt")}${keys.map((key) => cell(DELTA_TEX[key], `read-d${key}`)).join("")}</div>`;
    host.querySelectorAll(".cursor-toggle").forEach((button) => button.setAttribute("aria-label", S[`cursor${button.dataset.n}`]));
    host.querySelectorAll("[data-tex]").forEach((el) => renderTex(el, el.dataset.tex));
  }
  function renderReadout() {
    const columns = readoutColumns();
    const keys = columns.map((column) => column.key);
    const signature = `${language}|${keys.join()}`;
    if (signature !== readoutSignature) { buildReadout(keys); readoutSignature = signature; }
    const formats = columns.map((column) => readFormatter(column.span));
    const show = (v, j) => (Number.isFinite(v) ? formats[j](v) : "—");
    const reads = state.cursors.map((cursor) => columns.map((column) => column.read(cursor)));
    const both = state.cursors.every((cursor) => cursor.on);
    state.cursors.forEach((cursor, i) => {
      const n = i + 1;
      $(`#cursor-${n}`).setAttribute("aria-pressed", String(cursor.on));
      $(`#read-t${n}`).textContent = cursor.on ? `${fmt(reads[i][0].t)} s` : "—";
      columns.forEach((column, j) => { $(`#read-${column.key}${n}`).textContent = cursor.on ? show(reads[i][j].v, j) : "—"; });
    });
    $("#read-dt").textContent = both ? `${fmt(reads[1][0].t - reads[0][0].t)} s` : "—";
    columns.forEach((column, j) => { $(`#read-d${column.key}`).textContent = both ? show(reads[1][j].v - reads[0][j].v, j) : "—"; });
  }

  // ---------------------------------------------------------------------------
  // Main update
  // ---------------------------------------------------------------------------
  function update() {
    if (state.autoAxes) reframe();
    renderVisibility();
    renderEquation();
    if (showing("process")) { renderValues(); renderTuning(); }
    renderIndicators();
    renderReadout();
    fitFormulas();
    scheduleDraw();
  }

  // A formula wider than its box (narrow column, long numbers) is set a little smaller, down to
  // 70 % of its size, instead of showing a scroll bar. Boxes not laid out (hidden) are skipped.
  function fitFormula(box) {
    const formula = box.querySelector(".katex");
    if (!formula) return;
    formula.style.fontSize = "";
    if (!box.clientWidth) return;
    let size = parseFloat(getComputedStyle(formula).fontSize);
    const smallest = 0.7 * size;
    while (box.scrollWidth > box.clientWidth + 1 && size > smallest) {
      size = Math.max(smallest, 0.94 * size);
      formula.style.fontSize = `${size}px`;
    }
  }
  const fitFormulas = () => document.querySelectorAll(".eq-line, .value-card > div").forEach(fitFormula);

  // After a change of view, block or process type: controls, axes, cursors at default places.
  function enterContext() {
    renderVisibility();
    renderControls();
    reframe();
    state.cursors.forEach((cursor, i) => { cursor.t = CURSOR_DEFAULTS[i] * state.axes.tMax; });
    update();
  }
  function setView(view) { state.view = view; enterContext(); }
  // Block buttons switch on and off independently; one block at least stays shown.
  function toggleElement(element) {
    if (state.elements[element] && activeElements().length === 1) return;
    state.elements[element] = !state.elements[element];
    enterContext();
  }
  function setMode(mode) { state.mode = mode; enterContext(); }
  function setControllerType(type) {
    state.ctrl.type = type;
    renderControls();
    if (showing("ctrl")) reframe();
    update();
  }

  // Language: rebuild every text, number and formula; parameters, cursors and curves stay.
  function setLanguage(lang) {
    if (!STRINGS[lang]) return;
    language = lang;
    S = STRINGS[lang];
    setNumberFormats();
    applyStrings();
    $("#language-current").textContent = lang.toUpperCase();
    languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.lang === lang)));
    themeButton.setAttribute("aria-label", state.dark ? S.themeLight : S.themeDark);
    renderControls();
    update();
  }

  const setLanguageMenu = (open) => { languageMenu.hidden = !open; languageTrigger.setAttribute("aria-expanded", String(open)); };
  languageTrigger.addEventListener("click", () => setLanguageMenu(languageMenu.hidden));
  languageButtons.forEach((button) => button.addEventListener("click", () => { setLanguage(button.dataset.lang); setLanguageMenu(false); languageTrigger.focus(); }));
  document.addEventListener("click", (event) => { if (!languageMenu.hidden && !event.target.closest(".language-switch")) setLanguageMenu(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !languageMenu.hidden) { setLanguageMenu(false); languageTrigger.focus(); } });

  // Opening a folded panel (« Réglage Ziegler–Nichols », « Valeurs caractéristiques », the
  // table under the Z-N button) scrolls it into view: it sits at the bottom of the column
  // (desktop) or of the page (mobile), where its content would stay hidden.
  document.querySelectorAll(".values-panel, .zn-details").forEach((details) => details.addEventListener("toggle", (event) => {
    const panel = event.target;
    if (!panel.open) return;
    panel.querySelectorAll(".eq-line, .value-card > div").forEach(fitFormula); // laid out only now
    requestAnimationFrame(() => {
      const side = $(".side");
      const scrollable = side.scrollHeight > side.clientHeight + 1 && getComputedStyle(side).overflowY !== "visible";
      const box = scrollable ? side.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const rect = panel.getBoundingClientRect();
      const margin = 8;
      const delta = rect.height + 2 * margin > box.bottom - box.top
        ? rect.top - box.top - margin // taller than the view: show its top
        : rect.bottom > box.bottom - margin ? rect.bottom - box.bottom + margin : 0;
      if (delta <= 0) return;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      (scrollable ? side : window).scrollBy({ top: delta, behavior: smooth ? "smooth" : "auto" });
    });
  }));

  function setTheme(dark) {
    state.dark = dark;
    document.body.classList.toggle("dark-theme", dark);
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.setAttribute("aria-label", dark ? S.themeLight : S.themeDark);
    renderTuning(); // the selected row is coloured with a theme colour
    renderLoopTuning();
    scheduleDraw();
  }

  // Pointer on the graph. Left button / touch: grabs the nearest active cursor (cursor 1 is
  // switched on if none is active) and drags it; right button: cursor 2. Cursors stay on release.
  let dragged = null;
  function timeAt(event) {
    const x = event.clientX - canvas.getBoundingClientRect().left;
    return Math.min(plotView.tMax, Math.max(0, (x - plotView.left) / plotView.plotWidth * plotView.tMax));
  }
  // Times the cursors snap to. Second order alone: the extrema are analytic, dy/dt is
  // proportional to sin(wd t), so they lie at k*pi/wd (wd = w0 when xi = 0); first order,
  // xi >= 1 and the reaction curve are monotonic: nothing to snap to. Closed loop: the extrema
  // of y found on the samples of the run (overshoot peak, undershoot, oscillation of the relay).
  function snapTargets(t) {
    if (context() === "loop") return loopExtrema();
    const p = state.params[state.mode];
    if (!showing("process") || state.mode !== 2 || p.xi >= 1 || Math.abs(p.xi - 1) < CRITICAL_TOL) return [];
    const halfPeriod = Math.PI / (p.omega0 * Math.sqrt(1 - p.xi * p.xi));
    return [Math.max(1, Math.round(t / halfPeriod)) * halfPeriod];
  }
  function snapTime(t, pointerType) {
    if (!state.snap) return t;
    const radius = (pointerType === "mouse" ? 14 : 24) / plotView.plotWidth * plotView.tMax;
    let best = t;
    let distance = radius;
    snapTargets(t).forEach((extremum) => {
      const d = Math.abs(extremum - t);
      if (extremum <= plotView.tMax && d <= distance) { best = extremum; distance = d; }
    });
    return best;
  }
  // Local extrema of y in the closed-loop run (cached with it). Ripples smaller than 0,1 % of
  // the swing of y (numerical residue once settled) are not extrema.
  let extremaCache = null;
  function loopExtrema() {
    const run = loopRun();
    if (extremaCache && extremaCache.run === run) return extremaCache.times;
    const y = run.y;
    let lo = Infinity;
    let hi = -Infinity;
    y.forEach((v) => { if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    const tol = 1e-3 * (hi - lo);
    const times = [];
    let last = y[0];
    for (let i = 1; i < y.length - 1; i += 1) {
      const v = y[i];
      const peak = (v >= y[i - 1] && v > y[i + 1]) || (v <= y[i - 1] && v < y[i + 1]);
      if (peak && Math.abs(v - last) > tol) { times.push(run.t[i]); last = v; }
    }
    extremaCache = { run, times };
    return times;
  }
  function moveCursor(index, t) {
    state.cursors[index].on = true;
    state.cursors[index].t = t;
    renderReadout();
    scheduleDraw();
  }
  // The two clicks of a double click would also move the read cursors: they are put back.
  let cursorsBeforeClicks = null;
  let lastPointerDown = 0;
  canvas.addEventListener("dblclick", (event) => {
    if (cursorsBeforeClicks) { state.cursors.forEach((cursor, i) => Object.assign(cursor, cursorsBeforeClicks[i])); renderReadout(); scheduleDraw(); }
    if (state.autoAxes || !plotView) return;
    const y = event.clientY - canvas.getBoundingClientRect().top;
    const below = plotView.areas.length > 1 && y > plotView.areas[1].top - 15; // the gap above u counts for u
    fitVertical(below ? 1 : 0);
  });
  canvas.addEventListener("pointerdown", (event) => {
    const now = performance.now();
    if (now - lastPointerDown > 500) cursorsBeforeClicks = state.cursors.map((cursor) => ({ ...cursor }));
    lastPointerDown = now;
    if (!plotView || !state.showCursors || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault();
    const t = timeAt(event);
    if (event.button === 2) dragged = 1;
    else {
      const active = state.cursors.map((c, i) => (c.on ? i : -1)).filter((i) => i >= 0);
      dragged = active.length ? active.reduce((best, i) => (Math.abs(state.cursors[i].t - t) < Math.abs(state.cursors[best].t - t) ? i : best)) : 0;
    }
    canvas.setPointerCapture(event.pointerId);
    moveCursor(dragged, snapTime(t, event.pointerType));
  });
  canvas.addEventListener("pointermove", (event) => { if (dragged !== null && canvas.hasPointerCapture(event.pointerId)) moveCursor(dragged, snapTime(timeAt(event), event.pointerType)); });
  $("#snap").addEventListener("change", (event) => { state.snap = event.target.checked; });
  ["pointerup", "pointercancel"].forEach((type) => canvas.addEventListener(type, () => { dragged = null; }));

  // Cursor buttons (rebuilt with the readout): switch a cursor on (at its default place if
  // outside the view) or off.
  $(".readout").addEventListener("click", (event) => {
    const button = event.target.closest(".cursor-toggle");
    if (!button) return;
    const i = Number(button.dataset.n) - 1;
    const cursor = state.cursors[i];
    cursor.on = !cursor.on;
    if (cursor.on && !(cursor.t > 0 && cursor.t <= state.axes.tMax)) cursor.t = CURSOR_DEFAULTS[i] * state.axes.tMax;
    renderReadout();
    scheduleDraw();
  });

  // No context menu (right button drives cursor 2), except in text fields.
  document.addEventListener("contextmenu", (event) => { if (!event.target.closest('input[type="text"]')) event.preventDefault(); });

  document.querySelectorAll("#view-switch [data-view]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.view !== state.view) setView(button.dataset.view);
  }));
  document.querySelectorAll("#element-switch [data-element]").forEach((button) => button.addEventListener("click", () => {
    toggleElement(button.dataset.element);
  }));
  document.querySelectorAll("#mode-switch [data-mode]").forEach((button) => button.addEventListener("click", () => {
    const mode = Number(button.dataset.mode);
    if (mode !== state.mode) setMode(mode);
  }));
  document.querySelectorAll("#ctrl-switch [data-ctrl]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.ctrl !== state.ctrl.type) setControllerType(button.dataset.ctrl);
  }));
  $("#zn-apply").addEventListener("click", applyZN);
  $("#show-cursors").addEventListener("change", (event) => { state.showCursors = event.target.checked; renderVisibility(); scheduleDraw(); });
  $("#saturation").addEventListener("change", (event) => { state.loop.sat = event.target.checked; renderControls(); update(); });
  document.querySelectorAll("#zn-switch [data-reg]").forEach((button) => button.addEventListener("click", () => {
    state.regulator = button.dataset.reg;
    renderTuning();
  }));
  themeButton.addEventListener("click", () => setTheme(!state.dark));
  $("#randomize").addEventListener("click", randomize);
  $("#reframe").addEventListener("click", () => { reframe(); update(); });
  autoAxesBox.addEventListener("change", () => { state.autoAxes = autoAxesBox.checked; if (state.autoAxes) reframe(); update(); });
  // « Mémoriser » keeps the curve(s) of the current view, sampled; shown in grey in that view.
  $("#memorize").addEventListener("click", () => {
    const c = context();
    if (c === "loop") {
      const run = loopRun();
      // A loop going unstable is kept until y leaves 3 |r| (as drawn), not up to its divergence.
      let end = run.t.length;
      if (run.unstable) {
        const first = run.y.findIndex((v) => Math.abs(v) > 3 * Math.abs(state.loop.r0));
        if (first >= 0) end = first + 1;
      }
      state.memory = { context: c, t: run.t.slice(0, end), y: run.y.slice(0, end), u: run.u.slice(0, end) };
    } else {
      const n = 1500;
      const t = Array.from({ length: n + 1 }, (_, i) => state.axes.tMax * i / n);
      state.memory = { context: c, curves: activeElements().map((el) => ({ element: el, t, y: t.map(curveOf(el)) })) };
    }
    clearButton.disabled = false;
    update();
  });
  clearButton.addEventListener("click", () => { state.memory = null; clearButton.disabled = true; update(); });
  markBoxes.forEach((box) => box.addEventListener("change", () => { state.marks[box.dataset.mark] = box.checked; scheduleDraw(); }));

  if ("ResizeObserver" in window) {
    new ResizeObserver(scheduleDraw).observe(screen);
    new ResizeObserver(() => requestAnimationFrame(fitFormulas)).observe($(".side"));
  }
  else window.addEventListener("resize", scheduleDraw);

  document.querySelectorAll("[data-tex]").forEach((el) => renderTex(el, el.dataset.tex));
  // Canvas symbols use the KaTeX math font: redraw once it is loaded.
  if (document.fonts) document.fonts.load(`italic 16px ${MATH_FONT}`).then(scheduleDraw, () => {});
  setLanguage("fr");
  setTheme(false); // always start in the light theme, as the reference simulator
  enterContext();

  // Read-only hook for automated checks: pure functions and getters, nothing to assign.
  window.pidTd3App = Object.freeze({
    get state() { return structuredClone(state); },
    current,
    controller,
    simulateLoop,
    loopIndicators,
    sensorStep,
    controllerStep,
    loopConfig,
    loopRun: () => loopRun(),
    loopExtrema: () => loopExtrema(),
    plotView: () => (plotView ? { ...plotView } : null),
    tickLabel: (value, step) => tickFormatter(step).format(value),
    indicators: () => loopAssessment(),
    cascadeOf,
    chainConstruction,
    znReading: () => znReading(),
    get S_CONSTANTS() { return structuredClone(S_CONSTANTS); },
    makeResponse,
    frameDuration,
    inflectionAnalytic,
    inflectionNumeric,
    znConstruction,
    znTuning,
    settlingTime,
    measuredSamples: () => measuredSamples(state.axes.tMax),
    reading: (index) => reading(state.cursors[index]),
    RANDOM,
  });
})();
