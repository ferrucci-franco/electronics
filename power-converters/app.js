(() => {
  "use strict";

  const WHEEL_ARM_DELAY = 200;
  const locales = { en: "en-US", fr: "fr-FR", es: "es-ES" };
  const translations = {
    en: {
      documentTitle: "Power Converter Simulator", metaDescription: "Interactive steady-state laboratory for power converters.", workspace: "Power converter simulator",
      changeTopology: "Change circuit", topologySelectorAria: "Choose a converter topology", topologyDialogKicker: "Power conversion laboratory", chooseTopology: "Choose a topology", closeTopology: "Close topology selector", comingSoon: "Coming soon",
      languageSelector: "Language", themeDark: "Switch to dark theme", themeLight: "Switch to light theme", advanced: "Advanced", reset: "Reset", upperSettings: "Upper controls", lowerSettings: "Lower controls", commutation: "Switching", commutationAria: "Choose the switching implementation", synchronousSwitch: "Synchronous", switchAndDiode: "Switch + diode", hideTrace: "Hide trace", showTrace: "Show trace",
      legend: "Legend", advancedLegend: "Advanced legend", scopeAria: "Steady-state converter waveforms", zoomAria: "Drag with the left button to zoom and with the right button to pan. Double-click or double-tap to reset the zoom.", mean: "Average", ripple: "Peak-to-peak ripple", period: "Period", currentAverage: "Average current", currentRipple: "Current ripple", currentRange: "Current range", currentRms: "RMS current", voltageRms: "Fundamental RMS voltage", phaseShift: "Phase shift", switchingRatio: "Switching ratio",
      outputVoltage: "Output voltage", conductionMode: "Conduction mode", minimumCurrent: "Minimum current", fundamentalFrequency: "Fundamental frequency", formula: "Formula", ratio: "Ratio", resonanceFrequency: "LC circuit resonant frequency", conversionLaw: "Conversion law", conversionLawCcm: "Conversion law · CCM", voltages: "Voltages", lcFilter: "LC filter", ripples: "Ripples",
      theoryButtonAria: "Open more information", theoryOpen: "More info", theoryKicker: "Electrical analysis", theoryTitle: "Steady state", closeTheory: "Close", balanceTitle: "Balances", numericalResidual: "Numerical residual", rippleTheoryTitle: "Ripple approximation", fundamentalTitle: "Fundamental component", loadTitle: "Series R–L load", simulation: "Simulation", approximation: "Approximation", relativeError: "Relative error", loadType: "Load", seriesRl: "Series resistance and inductance", criticalInductanceRatio: "Critical inductance ratio",
      approximationNote: "These approximations assume low ripple and a switching frequency well above the natural dynamics.", synchronousNote: "The synchronous switch always provides a current path; negative inductor current is therefore possible.", diodeNote: "The diode blocks reverse current, so the model can enter CCM or DCM. v<sub>D</sub> is measured from anode to cathode; ripple formulas are CCM estimates.", hBridgeNote: "The bridge is modeled with ideal complementary switches.", schematicPending: "Circuit SVG placeholder", schematicTomorrow: "The simulation is active. The final circuit drawing can be inserted here without changing the model.", time: "Time", voltage: "voltage", currentAxis: "current",
      singleDiode: "Single diode", diodeBridge: "Diode bridge", singleThyristor: "SCR", triac: "TRIAC", rectifierMontageAria: "Choose the rectifier circuit", thyristorMontageAria: "Choose SCR or TRIAC power control", rectifierViewAria: "Choose the rectifier time window", frequencyToggleAria: "Source frequency: {f} Hz. Switch to {g} Hz", frequencyToggleTitle: "Switch to {g} Hz", thyristorVoltageAria: "Choose the RMS mains voltage", rectifierSteady: "Steady", diodesIdeal: "Ideal", diodesReal: "0.6 V drop", rectifierDiodesAria: "Choose the diode model",
      bridgeApplication: "Application", inverter: "Inverter", dcMotor: "DC motor", grid: "Grid", modulationType: "PWM pattern", bipolar: "Bipolar", unipolar: "Unipolar", motorBipolar: "50% = stop", motorUnipolar: "Direction + coast", direction: "Direction", forward: "Forward", reverse: "Reverse", motorView: "Display", motorTransient: "Start-up", motorSteady: "Steady state", motorViewAria: "Choose the motor time window", bridgeApplicationAria: "Choose the H-bridge application", bridgeSwitchingAria: "Choose the PWM pattern", motorDirectionAria: "Choose motor direction", gridCurrentControlMode: "Current control", gridCurrentControlAria: "Choose the grid current-control algorithm", pwmControl: "PWM", hysteresisControl: "Hysteresis",
      filteredOutput: "Filtered output", filterQuality: "Output filter", voltageThd: "Voltage THD", motorCommand: "Manual command", motorResult: "Motor response", speed: "Speed", torque: "Torque", armatureCurrent: "Armature current", averageArmatureVoltage: "Average armature voltage", power: "Power", activePower: "Active power", reactivePower: "Reactive power", powerFactor: "Power factor", currentThd: "Current THD", trackingError: "Tracking error", setpoint: "Setpoint", electricalModel: "Electrical model", mechanicalModel: "Mechanical model", currentControl: "Current tracking", filterAndLoad: "Filter and load", measured: "Measured", expected: "Expected", dcBus: "DC bus", motorNote: "No speed controller is used: duty cycle and direction are set manually.", gridNote: "A stiff 50 Hz grid and a proportional current tracker with voltage feedforward are used. No PLL is required in this introductory model.", gridHysteresisNote: "The bridge changes state when the current reaches either limit. The switching frequency is therefore variable and is not imposed by a carrier.", standaloneNote: "The output LC filter includes a small damping resistance and supplies a fixed series R–L load.", percent: "Percent",
    },
    fr: {
      documentTitle: "Simulateur de convertisseurs", metaDescription: "Laboratoire interactif de convertisseurs de puissance en régime permanent.", workspace: "Simulateur de convertisseurs de puissance",
      changeTopology: "Changer de circuit", topologySelectorAria: "Choisir une topologie de convertisseur", topologyDialogKicker: "Laboratoire de conversion", chooseTopology: "Choisir une topologie", closeTopology: "Fermer le sélecteur de topologie", comingSoon: "Bientôt disponible",
      languageSelector: "Langue", themeDark: "Activer le thème sombre", themeLight: "Activer le thème clair", advanced: "Avancé", reset: "Réinitialiser", upperSettings: "Réglages supérieurs", lowerSettings: "Réglages inférieurs", commutation: "Commutation", commutationAria: "Choisir la réalisation de la commutation", synchronousSwitch: "Synchrone", switchAndDiode: "Interrupteur + diode", hideTrace: "Masquer la trace", showTrace: "Afficher la trace",
      legend: "Légende", advancedLegend: "Légende avancée", scopeAria: "Formes d’onde du convertisseur en régime permanent", zoomAria: "Faites glisser avec le bouton gauche pour zoomer et avec le bouton droit pour déplacer la vue. Double-cliquez ou touchez deux fois pour réinitialiser le zoom.", mean: "Moyenne", ripple: "Ondulation crête à crête", period: "Période", currentAverage: "Courant moyen", currentRipple: "Ondulation du courant", currentRange: "Plage du courant", currentRms: "Courant efficace", voltageRms: "Tension fondamentale efficace", phaseShift: "Déphasage", switchingRatio: "Rapport de fréquences",
      outputVoltage: "Tension de sortie", conductionMode: "Mode de conduction", minimumCurrent: "Courant minimal", fundamentalFrequency: "Fréquence fondamentale", formula: "Formule", ratio: "Rapport", resonanceFrequency: "Fréquence de résonance du circuit LC", conversionLaw: "Loi de conversion", conversionLawCcm: "Loi de conversion · CCM", voltages: "Tensions", lcFilter: "Filtre LC", ripples: "Ondulations",
      theoryButtonAria: "Ouvrir les informations complémentaires", theoryOpen: "Plus d’infos", theoryKicker: "Analyse électrique", theoryTitle: "Régime permanent", closeTheory: "Fermer", balanceTitle: "Équilibres", numericalResidual: "Résidu numérique", rippleTheoryTitle: "Approximation des ondulations", fundamentalTitle: "Composante fondamentale", loadTitle: "Charge R–L série", simulation: "Simulation", approximation: "Approximation", relativeError: "Écart relatif", loadType: "Charge", seriesRl: "Résistance et inductance en série", criticalInductanceRatio: "Rapport d’inductance critique",
      approximationNote: "Ces approximations supposent une faible ondulation et une fréquence de découpage nettement supérieure à la dynamique naturelle.", synchronousNote: "L’interrupteur synchrone offre toujours un chemin au courant ; le courant de l’inductance peut donc devenir négatif.", diodeNote: "La diode bloque le courant inverse : le modèle peut être en CCM ou DCM. v<sub>D</sub> est mesurée de l’anode vers la cathode ; les formules d’ondulation sont des estimations CCM.", hBridgeNote: "Le pont est modélisé avec des interrupteurs complémentaires idéaux.", schematicPending: "Emplacement du SVG du circuit", schematicTomorrow: "La simulation est active. Le dessin définitif pourra être inséré ici sans modifier le modèle.", time: "Temps", voltage: "tension", currentAxis: "courant",
      singleDiode: "Simple diode", diodeBridge: "Pont de diodes", singleThyristor: "SCR", triac: "TRIAC", rectifierMontageAria: "Choisir le montage du redresseur", thyristorMontageAria: "Choisir la commande de puissance SCR ou TRIAC", rectifierViewAria: "Choisir la fenêtre temporelle du redresseur", frequencyToggleAria: "Fréquence de la source : {f} Hz. Passer à {g} Hz", frequencyToggleTitle: "Passer à {g} Hz", thyristorVoltageAria: "Choisir la tension efficace du réseau", rectifierSteady: "Permanent", diodesIdeal: "Idéales", diodesReal: "Chute 0,6 V", rectifierDiodesAria: "Choisir le modèle de diode",
      bridgeApplication: "Application", inverter: "Onduleur", dcMotor: "Moteur CC", grid: "Réseau", modulationType: "Modulation PWM", bipolar: "Bipolaire", unipolar: "Unipolaire", motorBipolar: "50 % = arrêt", motorUnipolar: "Sens + roue libre", direction: "Sens", forward: "Avant", reverse: "Arrière", motorView: "Affichage", motorTransient: "Démarrage", motorSteady: "Régime permanent", motorViewAria: "Choisir la fenêtre temporelle du moteur", bridgeApplicationAria: "Choisir l’application du pont en H", bridgeSwitchingAria: "Choisir la modulation PWM", motorDirectionAria: "Choisir le sens de rotation", gridCurrentControlMode: "Commande du courant", gridCurrentControlAria: "Choisir l’algorithme de commande du courant réseau", pwmControl: "PWM", hysteresisControl: "Hystérésis",
      filteredOutput: "Sortie filtrée", filterQuality: "Filtre de sortie", voltageThd: "THD de la tension", motorCommand: "Commande manuelle", motorResult: "Réponse du moteur", speed: "Vitesse", torque: "Couple", armatureCurrent: "Courant d’induit", averageArmatureVoltage: "Tension moyenne d’induit", power: "Puissances", activePower: "Puissance active", reactivePower: "Puissance réactive", powerFactor: "Facteur de puissance", currentThd: "THD du courant", trackingError: "Erreur de suivi", setpoint: "Consigne", electricalModel: "Modèle électrique", mechanicalModel: "Modèle mécanique", currentControl: "Suivi du courant", filterAndLoad: "Filtre et charge", measured: "Mesuré", expected: "Attendu", dcBus: "Bus continu", motorNote: "Aucun régulateur de vitesse n’est utilisé : le rapport cyclique et le sens sont imposés manuellement.", gridNote: "Le réseau est supposé rigide à 50 Hz. Le suivi du courant utilise une action proportionnelle et une anticipation de tension, sans PLL dans ce modèle introductif.", gridHysteresisNote: "Le pont change d’état lorsque le courant atteint l’une des deux limites. La fréquence de commutation est donc variable et n’est pas imposée par une porteuse.", standaloneNote: "Le filtre LC de sortie inclut une faible résistance d’amortissement et alimente une charge R–L série fixe.", percent: "Pourcentage",
    },
    es: {
      documentTitle: "Simulador de convertidores", metaDescription: "Laboratorio interactivo de convertidores de potencia en régimen permanente.", workspace: "Simulador de convertidores de potencia",
      changeTopology: "Cambiar de circuito", topologySelectorAria: "Elegir una topología de convertidor", topologyDialogKicker: "Laboratorio de conversión", chooseTopology: "Elegir una topología", closeTopology: "Cerrar el selector de topología", comingSoon: "Próximamente",
      languageSelector: "Idioma", themeDark: "Activar el tema oscuro", themeLight: "Activar el tema claro", advanced: "Avanzado", reset: "Reinicializar", upperSettings: "Controles superiores", lowerSettings: "Controles inferiores", commutation: "Conmutación", commutationAria: "Elegir la implementación de la conmutación", synchronousSwitch: "Síncrono", switchAndDiode: "Interruptor + diodo", hideTrace: "Ocultar traza", showTrace: "Mostrar traza",
      legend: "Leyenda", advancedLegend: "Leyenda avanzada", scopeAria: "Formas de onda del convertidor en régimen permanente", zoomAria: "Arrastre con el botón izquierdo para ampliar y con el derecho para desplazar la vista. Haga doble clic o toque dos veces para restablecer el zoom.", mean: "Promedio", ripple: "Ondulación pico a pico", period: "Período", currentAverage: "Corriente media", currentRipple: "Ondulación de corriente", currentRange: "Rango de corriente", currentRms: "Corriente eficaz", voltageRms: "Tensión fundamental eficaz", phaseShift: "Desfase", switchingRatio: "Relación de frecuencias",
      outputVoltage: "Tensión de salida", conductionMode: "Modo de conducción", minimumCurrent: "Corriente mínima", fundamentalFrequency: "Frecuencia fundamental", formula: "Fórmula", ratio: "Relación", resonanceFrequency: "Frecuencia de resonancia del circuito LC", conversionLaw: "Ley de conversión", conversionLawCcm: "Ley de conversión · CCM", voltages: "Tensiones", lcFilter: "Filtro LC", ripples: "Ondulaciones",
      theoryButtonAria: "Abrir más información", theoryOpen: "Más info", theoryKicker: "Análisis eléctrico", theoryTitle: "Régimen permanente", closeTheory: "Cerrar", balanceTitle: "Equilibrios", numericalResidual: "Residuo numérico", rippleTheoryTitle: "Aproximación de las ondulaciones", fundamentalTitle: "Componente fundamental", loadTitle: "Carga R–L serie", simulation: "Simulación", approximation: "Aproximación", relativeError: "Error relativo", loadType: "Carga", seriesRl: "Resistencia e inductancia en serie", criticalInductanceRatio: "Relación de inductancia crítica",
      approximationNote: "Estas aproximaciones suponen una ondulación pequeña y una frecuencia de conmutación muy superior a la dinámica natural.", synchronousNote: "El interruptor síncrono siempre ofrece un camino para la corriente; por eso la corriente de la inductancia puede hacerse negativa.", diodeNote: "El diodo bloquea la corriente inversa: el modelo puede estar en CCM o DCM. v<sub>D</sub> se mide del ánodo al cátodo; las fórmulas de ondulación son estimaciones CCM.", hBridgeNote: "El puente se modela con interruptores complementarios ideales.", schematicPending: "Espacio para el SVG del circuito", schematicTomorrow: "La simulación está activa. El dibujo definitivo podrá insertarse aquí sin modificar el modelo.", time: "Tiempo", voltage: "tensión", currentAxis: "corriente",
      singleDiode: "Diodo simple", diodeBridge: "Puente de diodos", singleThyristor: "SCR", triac: "TRIAC", rectifierMontageAria: "Elegir el montaje del rectificador", thyristorMontageAria: "Elegir el control de potencia SCR o TRIAC", rectifierViewAria: "Elegir la ventana temporal del rectificador", frequencyToggleAria: "Frecuencia de la fuente: {f} Hz. Cambiar a {g} Hz", frequencyToggleTitle: "Cambiar a {g} Hz", thyristorVoltageAria: "Elegir la tensión eficaz de la red", rectifierSteady: "Permanente", diodesIdeal: "Ideales", diodesReal: "Caída 0,6 V", rectifierDiodesAria: "Elegir el modelo de diodo",
      bridgeApplication: "Aplicación", inverter: "Inversor", dcMotor: "Motor CC", grid: "Red", modulationType: "Modulación PWM", bipolar: "Bipolar", unipolar: "Unipolar", motorBipolar: "50 % = paro", motorUnipolar: "Sentido + rueda libre", direction: "Sentido", forward: "Adelante", reverse: "Atrás", motorView: "Visualización", motorTransient: "Arranque", motorSteady: "Régimen permanente", motorViewAria: "Elegir la ventana temporal del motor", bridgeApplicationAria: "Elegir la aplicación del puente H", bridgeSwitchingAria: "Elegir la modulación PWM", motorDirectionAria: "Elegir el sentido de giro", gridCurrentControlMode: "Control de corriente", gridCurrentControlAria: "Elegir el algoritmo de control de la corriente de red", pwmControl: "PWM", hysteresisControl: "Histéresis",
      filteredOutput: "Salida filtrada", filterQuality: "Filtro de salida", voltageThd: "THD de tensión", motorCommand: "Mando manual", motorResult: "Respuesta del motor", speed: "Velocidad", torque: "Par", armatureCurrent: "Corriente de armadura", averageArmatureVoltage: "Tensión media de armadura", power: "Potencias", activePower: "Potencia activa", reactivePower: "Potencia reactiva", powerFactor: "Factor de potencia", currentThd: "THD de corriente", trackingError: "Error de seguimiento", setpoint: "Consigna", electricalModel: "Modelo eléctrico", mechanicalModel: "Modelo mecánico", currentControl: "Seguimiento de corriente", filterAndLoad: "Filtro y carga", measured: "Medido", expected: "Esperado", dcBus: "Bus continuo", motorNote: "No se utiliza un regulador de velocidad: el ciclo de trabajo y el sentido se imponen manualmente.", gridNote: "La red se supone rígida a 50 Hz. El seguimiento de corriente usa una acción proporcional y anticipación de tensión, sin PLL en este modelo introductorio.", gridHysteresisNote: "El puente cambia de estado cuando la corriente alcanza uno de los dos límites. Por eso, la frecuencia de conmutación es variable y no la impone una portadora.", standaloneNote: "El filtro LC de salida incluye una pequeña resistencia de amortiguamiento y alimenta una carga R–L serie fija.", percent: "Porcentaje",
    },
  };

  const catalog = window.converterTopologies || [];
  const models = window.converterModels || {};
  const canvas = document.querySelector("#scope");
  const ctx = canvas.getContext("2d");
  const scopeScreen = document.querySelector(".scope-screen");
  const scopeLegends = document.querySelector("#scope-legends");
  const zoomSelection = document.querySelector("#zoom-selection");
  const diagram = document.querySelector(".circuit-diagram");
  const infoBand = document.querySelector(".lc-info");
  // Bandeau d'infos défilant horizontalement (pont en H, PV sur écran peu haut) : la molette et le
  // glissement vertical du pavé tactile le font avancer d'un bloc ; le glissement horizontal reste natif.
  let infoWheelDelta = 0; let infoWheelLock = 0;
  infoBand.addEventListener("wheel", (event) => {
    if (infoBand.scrollWidth <= infoBand.clientWidth + 1 || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = performance.now(); if (now < infoWheelLock) return;
    infoWheelDelta += event.deltaY;
    if (Math.abs(infoWheelDelta) < 30) return;
    const direction = Math.sign(infoWheelDelta); infoWheelDelta = 0; infoWheelLock = now + 220;
    const left = infoBand.scrollLeft; const origin = infoBand.getBoundingClientRect().left - left;
    const starts = [...infoBand.children].map((cell) => cell.getBoundingClientRect().left - origin);
    const target = direction > 0 ? starts.find((x) => x > left + 2) : starts.reverse().find((x) => x < left - 2);
    infoBand.scrollTo({ left: target ?? (direction > 0 ? infoBand.scrollWidth : 0), behavior: "smooth" });
  }, { passive: false });
  const topSlots = [...document.querySelectorAll(".controls-top .control")];
  const bottomSlots = [...document.querySelectorAll(".controls-bottom .control")];
  const languageButtons = [...document.querySelectorAll("[data-lang]")];
  const languageTrigger = document.querySelector("#language-trigger");
  const languageMenu = document.querySelector("#language-menu");
  const advancedButton = document.querySelector("#advanced-toggle");
  const theoryButton = document.querySelector("#theory-trigger");
  const themeButton = document.querySelector("#theme-toggle");
  const theoryDialog = document.querySelector("#theory-dialog");
  const theoryGrid = document.querySelector(".theory-grid");
  const topologyDialog = document.querySelector("#topology-dialog");
  const topologyGrid = document.querySelector("#topology-grid");
  const topologyName = document.querySelector("#topology-name");
  const commutationSelector = document.querySelector("#commutation-selector");
  const commutationLabel = document.querySelector("#commutation-label");
  const commutationOptions = document.querySelector("#commutation-options");
  const commutationButtons = [...document.querySelectorAll("[data-commutation]")];
  const bridgeApplicationPanel = document.querySelector("#bridge-application-panel");
  const bridgeModePanel = document.querySelector("#bridge-mode-panel");
  const bridgeApplicationButtons = [...document.querySelectorAll("[data-bridge-application]")];
  const bridgeSwitchingButtons = [...document.querySelectorAll("[data-bridge-switching]")];
  const bridgeSwitchingGroup = document.querySelector("#bridge-switching-group");
  const gridCurrentControlButtons = [...document.querySelectorAll("[data-grid-current-control]")];
  const gridCurrentControlGroup = document.querySelector("#grid-current-control-group");
  const motorDirectionButtons = [...document.querySelectorAll("[data-motor-direction]")];
  const motorDirectionGroup = document.querySelector("#motor-direction-group");
  const motorViewButtons = [...document.querySelectorAll("[data-motor-view]")];
  const motorViewGroup = document.querySelector("#motor-view-group");
  const rectifierPanel = document.querySelector("#rectifier-panel");
  const rectifierMontageButtons = [...document.querySelectorAll("[data-rectifier-montage]")];
  const rectifierFrequencyToggle = document.querySelector("#rectifier-frequency-toggle");
  const thyristorVoltageGroup = document.querySelector("#thyristor-voltage-group");
  const thyristorVoltageButtons = [...document.querySelectorAll("[data-thyristor-voltage]")];
  const rectifierViewGroup = document.querySelector("#rectifier-view-group");
  const rectifierViewButtons = [...document.querySelectorAll("[data-rectifier-view]")];
  const rectifierDiodesGroup = document.querySelector("#rectifier-diodes-group");
  const rectifierDiodesButtons = [...document.querySelectorAll("[data-rectifier-diodes]")];
  const wheelTimers = new WeakMap();
  const states = {};
  const commutationModes = { buck: "synchronous", boost: "synchronous" };
  const bridgeMode = { application: "standalone", switching: "bipolar", direction: "forward", motorView: "transient", currentControl: "pwm" };
  const rectifierMode = { montage: "single", view: "steady", diodes: "ideal", frequency: 60 };
  const thyristorMode = { montage: "single", frequency: 60 };
  const hiddenTraces = { buck: new Set(), boost: new Set(), "pont-h": new Set(), "pv-grid": new Set(models["pv-grid"]?.defaultHiddenTraces || []), redresseur: new Set(models.redresseur?.defaultHiddenTraces || []), thyristor: new Set(models.thyristor?.defaultHiddenTraces || []) };
  const zoomStates = {
    buck: { x: null, y: [null, null, null] },
    boost: { x: null, y: [null, null, null] },
    "pont-h": { x: null, y: [null, null, null] },
    "pv-grid": { x: null, y: [null, null, null] },
    redresseur: { x: null, y: [null, null, null] },
    thyristor: { x: null, y: [null, null, null] },
  };
  const ZOOM_BAND = 12;
  const ZOOM_MIN_DRAG = 8;
  let inputs = [];
  let language = "fr";
  let number = new Intl.NumberFormat(locales.fr, { maximumFractionDigits: 2 });
  let currentTopology = "buck";
  let advanced = false;
  let dark = false;
  let currentPoints = [];
  let plotView = null;
  let zoomDrag = null;
  let panDrag = null;
  let lastCanvasTap = null;

  const tr = () => translations[language];
  const activeModel = () => models[currentTopology];
  const commutationMode = () => commutationModes[currentTopology] || "synchronous";
  const isRectifierTopology = () => currentTopology === "redresseur" || currentTopology === "thyristor";
  const activeRectifierMode = () => currentTopology === "thyristor" ? thyristorMode : rectifierMode;
  const modelOptions = () => currentTopology === "pont-h" ? { ...bridgeMode } : isRectifierTopology() ? { ...activeRectifierMode(), advanced } : {};
  const activeControls = () => {
    const model = activeModel();
    if (typeof model.controlsFor !== "function") return model.controls;
    if (isRectifierTopology()) { const mode = activeRectifierMode(); return model.controlsFor(mode.montage, { ...mode, advanced }); }
    return model.controlsFor(bridgeMode.application, { ...bridgeMode, advanced });
  };
  const activePlots = () => {
    const model = activeModel();
    if (typeof model.plotsFor !== "function") return model.plots;
    if (isRectifierTopology()) { const mode = activeRectifierMode(); return model.plotsFor(mode.montage, mode.view, { ...model.defaults, ...(states[currentTopology] || {}) }); }
    return model.plotsFor(currentTopology === "pont-h" ? bridgeMode.application : commutationMode(), bridgeMode.switching, bridgeMode.motorView, bridgeMode.currentControl);
  };
  const activePlotGroups = () => {
    const model = activeModel();
    if (!advanced && typeof model.basicPlotsFor === "function") {
      const mode = activeRectifierMode();
      const basic = isRectifierTopology() ? model.basicPlotsFor(mode.montage, mode.view) : model.basicPlotsFor(bridgeMode.application, bridgeMode.motorView);
      if (basic) return basic;
    }
    const plots = activePlots();
    return advanced ? [plots.main, plots.second, plots.third].filter(Boolean) : [plots.main];
  };
  const activeAxes = () => {
    const model = activeModel();
    if (typeof model.axesFor === "function") return model.axesFor(isRectifierTopology() ? activeRectifierMode().montage : bridgeMode.application, advanced).map((axis) => ({ ...axis, label: localize(axis.label), rightLabel: localize(axis.rightLabel) }));
    return [{ label: tr().voltage, unit: "V" }, { label: tr().voltage, unit: "V" }, { label: tr().currentAxis, unit: "A" }];
  };
  const traceIsVisible = (trace) => !hiddenTraces[currentTopology]?.has(trace.legendKey || trace.key);
  const activeZoom = () => zoomStates[currentTopology];
  const localize = (value) => value?.[language] || value?.fr || value || "";
  const setText = (id, value) => { const element = document.querySelector(`#${id}`); if (element) element.textContent = value; };
  const sub = (value) => `<span class="symbol-index">${value}</span>`;

  function renderTex(element, expression) {
    if (window.katex && element) window.katex.render(expression, element, { throwOnError: false, output: "htmlAndMathml", strict: false });
  }
  function renderMath(root = document) {
    root.querySelectorAll("[data-tex]").forEach((element) => renderTex(element, element.dataset.tex));
  }
  function displayFrequency(value) { return value >= 1000 ? `${number.format(value / 1000)} kHz` : `${number.format(value)} Hz`; }
  function displayTime(value) { return value >= 1 ? `${number.format(value)} s` : value >= .001 ? `${number.format(value * 1000)} ms` : `${number.format(value * 1e6)} µs`; }
  function displayVoltage(value) { const v = Math.abs(value) < 1e-12 ? 0 : value; return Math.abs(v) < 1 ? `${number.format(v * 1000)} mV` : `${number.format(v)} V`; }
  function displayCurrent(value) { const i = Math.abs(value) < 1e-12 ? 0 : value; return Math.abs(i) < 1 ? `${number.format(i * 1000)} mA` : `${number.format(i)} A`; }
  function texNumber(value) {
    return number.formatToParts(value).map((part) => {
      if (part.type === "decimal") return part.value === "," ? "{,}" : part.value;
      if (part.type === "group") return "\\,";
      if (part.type === "minusSign") return "-";
      return part.value;
    }).join("");
  }
  function texFrequency(value) { return value >= 1000 ? `${texNumber(value / 1000)}\\,\\mathrm{kHz}` : `${texNumber(value)}\\,\\mathrm{Hz}`; }
  function texVoltage(value) { const v = Math.abs(value) < 1e-12 ? 0 : value; return Math.abs(v) < 1 ? `${texNumber(v * 1000)}\\,\\mathrm{mV}` : `${texNumber(v)}\\,\\mathrm{V}`; }
  function setInfoMath(id, expression) { renderTex(document.querySelector(`#${id}`), `\\displaystyle ${expression}`); }
  function displayControl(def, value) { return `${number.format(value * (def.scale || 1))} ${def.unit}`; }
  const outputMeasure = document.createElement("canvas").getContext("2d");
  function reserveOutputWidth(card, def) {
    const output = card.querySelector("output");
    if (!output) return;
    const style = getComputedStyle(output);
    outputMeasure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const step = Number(def.step) || 0;
    const candidates = [Number(def.min), Number(def.max), Number(def.min) + step, Number(def.max) - step];
    const widest = Math.max(...candidates.map((value) => outputMeasure.measureText(displayControl(def, value)).width));
    output.style.minWidth = `${Math.ceil(widest) + 2}px`;
    output.style.textAlign = "right";
  }
  function updateRange(input) {
    const value = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
    input.style.setProperty("--range-progress", `${value}%`);
  }
  function getState() { return { ...(states[currentTopology] || activeModel()?.defaults || {}), ...Object.fromEntries(inputs.map((input) => [input.dataset.key, Number(input.value)])) }; }
  function saveState() { if (inputs.length && activeModel()) states[currentTopology] = getState(); }

  function bindControl(card, input) {
    input.addEventListener("input", update);
    if (card._wheelBound) return;
    card._wheelBound = true;
    card.addEventListener("mouseenter", () => {
      clearTimeout(wheelTimers.get(card)); card.dataset.wheelReady = "false";
      wheelTimers.set(card, setTimeout(() => { card.dataset.wheelReady = "true"; card.classList.add("wheel-ready"); }, WHEEL_ARM_DELAY));
    });
    card.addEventListener("mouseleave", () => { clearTimeout(wheelTimers.get(card)); card.dataset.wheelReady = "false"; card.classList.remove("wheel-ready"); });
    card.addEventListener("wheel", (event) => {
      if (card.dataset.wheelReady !== "true") return;
      event.preventDefault();
      const activeInput = card.querySelector("input");
      const next = Math.min(Number(activeInput.max), Math.max(Number(activeInput.min), Number(activeInput.value) + (event.deltaY < 0 ? 1 : -1) * (Number(activeInput.step) || 1)));
      if (next !== Number(activeInput.value)) { activeInput.value = String(next); activeInput.dispatchEvent(new Event("input", { bubbles: true })); }
    }, { passive: false });
  }

  function renderControls() {
    const currentModel = activeModel();
    const values = { ...currentModel.defaults, ...(states[currentTopology] || {}) };
    const definitions = activeControls();
    // 2 × 2 seulement pour quatre cartes réellement visibles (une carte « avancée » est masquée en mode simple).
    const twoByTwoLayout = !advanced && definitions.top.filter((def) => !def.advanced).length === 4;
    topSlots[0].parentElement.classList.toggle("four-controls", twoByTwoLayout);
    const renderRow = (slots, rowDefinitions) => {
      slots.forEach((card, index) => {
        const def = rowDefinitions[index];
        if (!def) { card.hidden = true; card.classList.remove("advanced-control"); card.replaceChildren(); return; }
        const value = values[def.key] ?? currentModel.defaults[def.key];
        card.classList.toggle("advanced-control", Boolean(def.advanced));
        card.hidden = Boolean(def.advanced && !advanced);
        card.innerHTML = `<span class="control-copy"><b>${def.symbol}</b><small>${localize(def.label)}</small></span><output>${displayControl(def, value)}</output><input data-key="${def.key}" type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${value}" aria-label="${localize(def.aria)}" />`;
        const input = card.querySelector("input"); input._definition = def;
        if (currentTopology === "thyristor") { input.style.width = "100%"; input.style.justifySelf = "stretch"; }
        updateRange(input); bindControl(card, input); reserveOutputWidth(card, def);
      });
      slots[0].parentElement.hidden = !rowDefinitions.some((def) => !def.advanced || advanced);
      slots[0].parentElement.dataset.count = String(rowDefinitions.filter((def) => !def.advanced || advanced).length);
    };
    renderRow(topSlots, definitions.top); renderRow(bottomSlots, definitions.bottom);
    inputs = [...document.querySelectorAll(".control input[data-key]")];
  }

  function renderCommutationSelector() {
    const supported = currentTopology === "buck" || currentTopology === "boost";
    commutationSelector.hidden = !advanced || !supported;
    commutationLabel.textContent = tr().commutation;
    commutationOptions.setAttribute("aria-label", tr().commutationAria);
    commutationButtons.forEach((button) => {
      button.textContent = tr()[button.dataset.commutation === "diode" ? "switchAndDiode" : "synchronousSwitch"];
      button.setAttribute("aria-pressed", String(button.dataset.commutation === commutationMode()));
    });
  }

  function renderBridgeModePanel() {
    const visible = currentTopology === "pont-h";
    bridgeApplicationPanel.hidden = !visible;
    bridgeModePanel.hidden = !visible;
    if (!visible) return;
    document.querySelector("#bridge-application-label").textContent = tr().bridgeApplication;
    document.querySelector("#bridge-switching-label").textContent = tr().modulationType;
    document.querySelector("#grid-current-control-label").textContent = tr().gridCurrentControlMode;
    document.querySelector("#motor-direction-label").textContent = tr().direction;
    document.querySelector("#motor-view-label").textContent = tr().motorView;
    document.querySelector("#bridge-application-options").setAttribute("aria-label", tr().bridgeApplicationAria);
    document.querySelector("#bridge-switching-options").setAttribute("aria-label", tr().bridgeSwitchingAria);
    gridCurrentControlGroup.querySelector("div").setAttribute("aria-label", tr().gridCurrentControlAria);
    motorDirectionGroup.querySelector("div").setAttribute("aria-label", tr().motorDirectionAria);
    motorViewGroup.querySelector("div").setAttribute("aria-label", tr().motorViewAria);
    bridgeApplicationButtons.forEach((button) => { button.textContent = tr()[button.dataset.bridgeApplication === "standalone" ? "inverter" : button.dataset.bridgeApplication === "motor" ? "dcMotor" : "grid"]; button.setAttribute("aria-pressed", String(button.dataset.bridgeApplication === bridgeMode.application)); });
    const gridHysteresis = bridgeMode.application === "grid" && bridgeMode.currentControl === "hysteresis";
    bridgeSwitchingButtons.forEach((button) => {
      const motorKey = button.dataset.bridgeSwitching === "bipolar" ? "motorBipolar" : "motorUnipolar";
      button.textContent = tr()[bridgeMode.application === "motor" ? motorKey : button.dataset.bridgeSwitching];
      button.setAttribute("aria-pressed", String(button.dataset.bridgeSwitching === bridgeMode.switching));
      button.disabled = gridHysteresis;
    });
    gridCurrentControlGroup.hidden = bridgeMode.application !== "grid" || !advanced;
    gridCurrentControlButtons.forEach((button) => { button.textContent = tr()[button.dataset.gridCurrentControl === "hysteresis" ? "hysteresisControl" : "pwmControl"]; button.setAttribute("aria-pressed", String(button.dataset.gridCurrentControl === bridgeMode.currentControl)); });
    bridgeSwitchingGroup.hidden = bridgeMode.application === "grid" && !advanced;
    bridgeSwitchingGroup.classList.toggle("is-disabled", gridHysteresis);
    bridgeSwitchingGroup.setAttribute("aria-disabled", String(gridHysteresis));
    const motorDirectionDisabled = bridgeMode.application === "motor" && bridgeMode.switching !== "unipolar";
    motorDirectionGroup.hidden = bridgeMode.application !== "motor";
    motorDirectionGroup.classList.toggle("is-disabled", motorDirectionDisabled);
    motorDirectionGroup.setAttribute("aria-disabled", String(motorDirectionDisabled));
    motorDirectionButtons.forEach((button) => {
      button.textContent = tr()[button.dataset.motorDirection];
      button.setAttribute("aria-pressed", String(button.dataset.motorDirection === bridgeMode.direction));
      button.disabled = motorDirectionDisabled;
    });
    motorViewGroup.hidden = bridgeMode.application !== "motor";
    motorViewButtons.forEach((button) => { button.textContent = tr()[button.dataset.motorView === "steady" ? "motorSteady" : "motorTransient"]; button.setAttribute("aria-pressed", String(button.dataset.motorView === bridgeMode.motorView)); });
    bridgeModePanel.hidden = bridgeMode.application === "grid" && !advanced;
  }

  function renderRectifierPanel() {
    const visible = isRectifierTopology();
    rectifierPanel.hidden = !visible;
    if (!visible) return;
    const mode = activeRectifierMode();
    const controlled = currentTopology === "thyristor";
    if (!advanced && mode.view === "transient") mode.view = "steady";
    document.querySelector("#rectifier-montage-options").setAttribute("aria-label", tr()[controlled ? "thyristorMontageAria" : "rectifierMontageAria"]);
    thyristorVoltageGroup.setAttribute("aria-label", tr().thyristorVoltageAria);
    document.querySelector("#rectifier-view-options").setAttribute("aria-label", tr().rectifierViewAria);
    document.querySelector("#rectifier-diodes-options").setAttribute("aria-label", tr().rectifierDiodesAria);
    rectifierMontageButtons.forEach((button) => {
      const bridge = button.dataset.rectifierMontage === "bridge";
      const montage = controlled && bridge ? "triac" : button.dataset.rectifierMontage;
      button.textContent = tr()[controlled ? (bridge ? "triac" : "singleThyristor") : (bridge ? "diodeBridge" : "singleDiode")];
      button.setAttribute("aria-pressed", String(montage === mode.montage));
    });
    const otherFrequency = mode.frequency === 50 ? 60 : 50;
    document.querySelector("#rectifier-frequency-value").textContent = `${mode.frequency} Hz`;
    rectifierFrequencyToggle.setAttribute("aria-label", tr().frequencyToggleAria.replace("{f}", mode.frequency).replace("{g}", otherFrequency));
    rectifierFrequencyToggle.title = tr().frequencyToggleTitle.replace("{g}", otherFrequency);
    thyristorVoltageGroup.hidden = !controlled;
    const thyristorVoltage = { ...models.thyristor.defaults, ...(states.thyristor || {}) }.vinRms;
    thyristorVoltageButtons.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.thyristorVoltage) === thyristorVoltage)));
    rectifierViewGroup.hidden = controlled || !advanced;
    rectifierViewButtons.forEach((button) => { button.textContent = tr()[button.dataset.rectifierView === "transient" ? "motorTransient" : "rectifierSteady"]; button.setAttribute("aria-pressed", String(button.dataset.rectifierView === mode.view)); });
    rectifierDiodesGroup.hidden = controlled || !advanced;
    rectifierDiodesButtons.forEach((button) => {
      const real = button.dataset.rectifierDiodes === "real";
      button.textContent = tr()[real ? "diodesReal" : "diodesIdeal"];
      button.setAttribute("aria-pressed", String(button.dataset.rectifierDiodes === mode.diodes));
    });
  }

  function renderDiagram() {
    const currentModel = activeModel();
    diagram.setAttribute("aria-label", localize(currentModel.diagram.aria));
    diagram.classList.remove("has-mode-title");
    const previousMarkup = diagram._markup; diagram._markup = null;
    if (typeof currentModel.diagramFor === "function") {
      const modeTitle = typeof currentModel.diagramTitleFor === "function" ? currentModel.diagramTitleFor(bridgeMode.application, bridgeMode.switching, language, bridgeMode.currentControl) : "";
      diagram.classList.toggle("has-mode-title", Boolean(modeTitle));
      const mode = activeRectifierMode();
      const diagramMarkup = isRectifierTopology() ? currentModel.diagramFor(mode.montage, language, mode.frequency, mode) : currentModel.diagramFor(bridgeMode.application, bridgeMode.switching, language, bridgeMode.currentControl);
      const markup = `${modeTitle ? `<div class="diagram-mode-title">${modeTitle}</div>` : ""}${diagramMarkup}`;
      // Même schéma qu'avant : on garde les nœuds (pas de clignotement des calques estompés).
      if (previousMarkup !== markup) diagram.innerHTML = markup;
      diagram._markup = markup;
    } else if (currentModel.diagram.type === "svg") {
      const source = currentModel.diagrams?.[commutationMode()] || currentModel.diagram.src;
      diagram.innerHTML = `<div class="schematic-frame"><img class="converter-schematic" src="${source}" alt="" draggable="false" /><b class="schematic-vin-value" aria-hidden="true"><span id="vin-label-value">24</span> V</b></div>`;
    } else {
      const topology = catalog.find((item) => item.id === currentTopology);
      diagram.innerHTML = `<div class="schematic-placeholder"><span>${tr().schematicPending}</span><strong>${localize(topology.name)}</strong><p>${tr().schematicTomorrow}</p></div>`;
    }
  }

  function renderInfoBand() {
    const customModel = activeModel();
    if (typeof customModel.infoBandHtml === "function") {
      infoBand.classList.add("four-columns");
      infoBand.innerHTML = customModel.infoBandHtml(language, advanced);
      renderMath(infoBand);
      return;
    }
    infoBand.classList.toggle("four-columns", currentTopology === "buck" || (currentTopology === "pont-h" && bridgeMode.application !== "standalone"));
    if (currentTopology === "buck" || currentTopology === "boost") {
      const boost = currentTopology === "boost";
      const lawLabel = commutationMode() === "diode" ? tr().conversionLawCcm : tr().conversionLaw;
      const law = boost ? "\\displaystyle V_o=\\frac{V_{in}}{1-\\alpha}" : "\\displaystyle V_o=\\alpha V_{in}";
      const rippleCell = `<div><span>${tr().ripples}</span><div class="info-lines"><span class="math info-equation" id="info-current-ripple"></span><span class="math info-equation" id="info-voltage-ripple"></span></div></div>`;
      const filterCell = `<div><span>${tr().lcFilter}</span><div class="info-lines"><span class="math info-equation" id="info-resonance"></span><span class="math info-equation" id="info-secondary"></span></div></div>`;
      infoBand.innerHTML = `<div><span>${lawLabel}</span><strong class="math conversion-formula" data-tex="${law}"></strong></div><div><span>${tr().voltages}</span><div class="info-lines"><span class="math info-equation" id="info-vin"></span><span class="math info-equation" id="info-output"></span></div></div>${boost ? "" : filterCell}${rippleCell}`;
    } else if (bridgeMode.application === "motor") {
      const law = bridgeMode.switching === "bipolar" ? "\\displaystyle \\langle v_a\\rangle=(2\\alpha-1)V_{dc}" : "\\displaystyle \\langle v_a\\rangle=\\pm\\alpha V_{dc}";
      infoBand.innerHTML = `<div><span>${tr().motorCommand}</span><strong class="math conversion-formula" data-tex="${law}"></strong></div><div><span>${tr().averageArmatureVoltage}</span><strong class="math info-equation" id="info-primary"></strong></div><div><span>${tr().motorResult}</span><div class="info-lines"><span class="math info-equation" id="info-secondary"></span><span class="math info-equation" id="info-tertiary"></span></div></div><div><span>${tr().torque}</span><div class="info-lines"><span class="math info-equation" id="info-quaternary"></span><span class="math info-equation" id="info-quinary"></span></div></div>`;
    } else if (bridgeMode.application === "grid") {
      infoBand.innerHTML = `<div><span>${tr().setpoint}</span><div class="info-lines"><span class="math info-equation" id="info-primary"></span><span class="math info-equation" id="info-secondary"></span></div></div><div><span>${tr().power}</span><div class="info-lines"><span class="math info-equation" id="info-tertiary"></span><span class="math info-equation" id="info-quaternary"></span></div></div><div><span>${tr().powerFactor}</span><strong class="math info-equation" id="info-quinary"></strong></div><div><span>${tr().currentThd}</span><strong class="math info-equation" id="info-senary"></strong></div>`;
    } else {
      infoBand.innerHTML = `<div><span>${tr().filteredOutput}</span><div class="info-lines"><span class="math info-equation" id="info-secondary"></span><span class="math info-equation" id="info-tertiary"></span></div></div><div><span>${tr().filterQuality}</span><div class="info-lines"><span class="math info-equation" id="info-quaternary"></span><span class="math info-equation" id="info-quinary"></span></div></div><div><span>${tr().voltageThd}</span><strong class="math info-equation" id="info-senary"></strong></div>`;
    }
    renderMath(infoBand);
  }

  function renderLegendGroup(traces, classes, hidden) {
    const legend = document.createElement("div"); legend.className = `legend ${classes}`.trim(); legend.hidden = hidden;
    legend.setAttribute("aria-label", classes ? tr().advancedLegend : tr().legend);
    traces.forEach((trace) => {
      if (trace.legendHidden) return;
      const visible = traceIsVisible(trace);
      const item = document.createElement("button"); const line = document.createElement("i"); const label = document.createElement("b");
      item.type = "button"; item.className = "legend-trace"; item.dataset.traceKey = trace.key; item.setAttribute("aria-pressed", String(visible));
      line.style.setProperty("--legend-color", `var(${trace.color})`); if (trace.dash?.length) line.classList.add("dashed"); label.innerHTML = trace.label;
      const accessibleLabel = label.textContent.trim();
      item.setAttribute("aria-label", `${tr()[visible ? "hideTrace" : "showTrace"]}: ${accessibleLabel}`);
      item.addEventListener("click", () => {
        const hiddenSet = hiddenTraces[currentTopology];
        if (hiddenSet.has(trace.key)) hiddenSet.delete(trace.key); else hiddenSet.add(trace.key);
        renderLegends();
        if (currentPoints.length) draw(currentPoints);
      });
      item.append(line, label); legend.append(item);
    });
    scopeLegends.append(legend);
  }
  function renderLegends() {
    scopeLegends.replaceChildren();
    activePlotGroups().forEach((traces, index) => renderLegendGroup(traces, index === 0 ? "" : index === 1 ? "voltage-legend" : "current-legend", false));
  }

  function comparison(rows) { return `<div class="comparison-grid">${rows.map(([label, id]) => `<span>${label}</span><strong id="${id}"></strong>`).join("")}</div>`; }
  function balance(tex, id) { return `<div class="balance-equation"><strong class="math" data-tex="${tex}"></strong><div><span>${tr().numericalResidual}</span><b id="${id}"></b></div></div>`; }
  function renderTheoryShell() {
    const customModel = activeModel();
    if (typeof customModel.theoryHtml === "function") {
      theoryGrid.innerHTML = customModel.theoryHtml(language, advanced);
      renderMath(theoryGrid);
      return;
    }
    if (currentTopology === "buck" || currentTopology === "boost") {
      const boost = currentTopology === "boost";
      const diodeMode = commutationMode() === "diode";
      const currentFormula = boost ? "\\displaystyle \\Delta i_L\\simeq\\frac{V_{in}\\alpha}{Lf_s}" : "\\displaystyle \\Delta i_L\\simeq\\frac{(V_{in}-V_o)\\alpha}{Lf_s}";
      const voltageFormula = boost ? "\\displaystyle \\Delta v_o\\simeq\\frac{V_o\\alpha}{RCf_s}" : "\\displaystyle \\Delta v_o\\simeq\\frac{\\Delta i_L}{8Cf_s}";
      const note = diodeMode ? tr().diodeNote : `${tr().approximationNote} ${tr().synchronousNote}`;
      const conductionDetails = boost && diodeMode ? comparison([[tr().conductionMode, "theory-conduction-mode"], [tr().criticalInductanceRatio, "theory-critical-ratio"]]) : "";
      const resonanceDetails = !boost ? `<div class="balance-equation"><strong class="math" data-tex="\\displaystyle f_0=\\frac{1}{2\\pi\\sqrt{LC}}"></strong><div><span>${tr().resonanceFrequency}</span><b id="theory-resonance"></b></div></div>` : "";
      theoryGrid.innerHTML = `<section><h3>${tr().balanceTitle}</h3>${balance("\\left\\langle v_L\\right\\rangle=0", "balance-vl")}${balance("\\left\\langle i_C\\right\\rangle=0", "balance-ic")}${resonanceDetails}${conductionDetails}</section><section class="approximation-section"><h3>${tr().rippleTheoryTitle}</h3><div class="approximation-formula math" data-tex="${currentFormula}"></div>${comparison([[tr().simulation, "theory-il-sim"], [tr().approximation, "theory-il-approx"], [tr().relativeError, "theory-il-error"]])}<div class="approximation-formula math" data-tex="${voltageFormula}"></div>${comparison([[tr().simulation, "theory-vo-sim"], [tr().approximation, "theory-vo-approx"], [tr().relativeError, "theory-vo-error"]])}<p>${note}</p></section>`;
    } else if (bridgeMode.application === "motor") {
      const voltageLaw = bridgeMode.switching === "bipolar" ? "\\displaystyle \\langle v_a\\rangle=(2\\alpha-1)V_{dc}" : "\\displaystyle \\langle v_a\\rangle=\\pm\\alpha V_{dc}";
      theoryGrid.innerHTML = `<section><h3>${tr().electricalModel}</h3><div class="approximation-formula math" data-tex="${voltageLaw}"></div><div class="approximation-formula math" data-tex="\\displaystyle L_a\\frac{di_a}{dt}=v_a-R_ai_a-K_e\\omega"></div>${comparison([[tr().averageArmatureVoltage, "theory-motor-voltage"], [tr().armatureCurrent, "theory-motor-current"], [tr().dcBus, "theory-motor-bus"]])}</section><section class="approximation-section"><h3>${tr().mechanicalModel}</h3><div class="approximation-formula math" data-tex="\\displaystyle J\\frac{d\\omega}{dt}=K_ti_a-B\\omega-T_L"></div>${comparison([[tr().speed, "theory-motor-speed"], [tr().torque, "theory-motor-torque"], [tr().loadType, "theory-load"]])}<p>${tr().motorNote}</p></section>`;
    } else if (bridgeMode.application === "grid") {
      const controlFormula = bridgeMode.currentControl === "hysteresis" ? "\\displaystyle i_g^*-h_i\\leq i_g\\leq i_g^*+h_i" : "\\displaystyle L_g\\frac{di_g}{dt}=v_{ab}-v_g-R_gi_g";
      const controlNote = bridgeMode.currentControl === "hysteresis" ? tr().gridHysteresisNote : tr().gridNote;
      theoryGrid.innerHTML = `<section><h3>${tr().currentControl}</h3><div class="approximation-formula math" data-tex="\\displaystyle i_g^*=\\sqrt{2}I_g^*\\sin(\\omega_gt+\\varphi)"></div><div class="approximation-formula math" data-tex="${controlFormula}"></div>${comparison([[tr().currentRms, "theory-grid-current"], [tr().phaseShift, "theory-grid-phase"], [tr().trackingError, "theory-grid-error"]])}</section><section class="approximation-section"><h3>${tr().power}</h3><div class="approximation-formula math" data-tex="\\displaystyle P=V_gI_g\\cos\\varphi\\qquad Q=V_gI_g\\sin\\varphi"></div>${comparison([[tr().activePower, "theory-grid-p"], [tr().reactivePower, "theory-grid-q"], [tr().powerFactor, "theory-grid-pf"], [tr().currentThd, "theory-grid-thd"]])}<p>${controlNote}</p></section>`;
    } else {
      theoryGrid.innerHTML = `<section><h3>${tr().fundamentalTitle}</h3><div class="approximation-formula math" data-tex="\\displaystyle V_{1,\\mathrm{rms}}\\simeq\\frac{mV_{dc}}{\\sqrt{2}}"></div>${comparison([[tr().measured, "theory-v1-sim"], [tr().expected, "theory-v1-approx"], [tr().relativeError, "theory-v1-error"]])}<div class="approximation-formula math" data-tex="\\displaystyle f_0=\\frac{1}{2\\pi\\sqrt{L_fC_f}}"></div>${comparison([[tr().resonanceFrequency, "theory-filter-resonance"], [tr().voltageThd, "theory-filter-thd"]])}</section><section class="approximation-section"><h3>${tr().filterAndLoad}</h3><div class="approximation-formula math" data-tex="\\displaystyle L_f\\frac{di_f}{dt}=v_{ab}-v_o\\qquad C_f\\frac{dv_C}{dt}=i_f-i_o"></div>${comparison([[tr().currentRms, "theory-i1-sim"], [tr().expected, "theory-i1-approx"], [tr().phaseShift, "theory-phase"]])}${balance("\\left\\langle v_{L_f}\\right\\rangle=0", "balance-vl")}<p>${tr().standaloneNote} ${tr().hBridgeNote}</p></section>`;
    }
    renderMath(theoryGrid);
  }

  function renderCatalog() {
    const active = catalog.find((item) => item.id === currentTopology); topologyName.textContent = localize(active?.name); topologyGrid.replaceChildren();
    catalog.forEach((topology) => {
      const available = topology.status === "available" && Boolean(models[topology.id]);
      const card = document.createElement(available ? "button" : "article"); card.className = "topology-card";
      if (available) { card.type = "button"; card.setAttribute("aria-current", String(topology.id === currentTopology)); card.addEventListener("click", () => selectTopology(topology.id)); }
      else card.setAttribute("aria-disabled", "true");
      const name = document.createElement("h3"); name.textContent = localize(topology.name);
      const description = document.createElement("p"); description.textContent = localize(topology.description);
      if (topology.conversion) { const conversion = document.createElement("span"); conversion.className = "topology-conversion"; conversion.textContent = topology.conversion; card.append(conversion); }
      card.append(name, description);
      // Seules les topologies à venir portent un badge ; « Disponible » sur toutes n'apprenait rien.
      if (!available) { const status = document.createElement("span"); status.className = "topology-status"; status.textContent = tr().comingSoon; card.append(status); }
      topologyGrid.append(card);
    });
  }

  function syncRoute() {
    const hash = `#${currentTopology}`; if (window.location.hash === hash) return;
    try { history.replaceState(null, "", hash); } catch (_error) { window.location.hash = hash; }
  }
  function selectTopology(id, sync = true) {
    if (!models[id]) return; saveState();
    // Changer de circuit ramène au mode simple et à la configuration initiale du nouveau circuit.
    if (id !== currentTopology && advanced) { advanced = false; advancedButton.setAttribute("aria-pressed", "false"); document.body.classList.remove("advanced-mode"); }
    const changed = id !== currentTopology;
    currentTopology = id; if (changed) resetCurrentTopology(); if (sync) syncRoute(); renderCatalog(); renderTopology(); if (topologyDialog.open) topologyDialog.close();
  }
  function initializeRoute() { const requested = decodeURIComponent(window.location.hash.slice(1)); currentTopology = models[requested] ? requested : "buck"; syncRoute(); }

  function applyTranslations() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((element) => { const value = tr()[element.dataset.i18n]; if (value) element.textContent = value; });
    document.querySelectorAll("[data-i18n-aria]").forEach((element) => { const value = tr()[element.dataset.i18nAria]; if (value) element.setAttribute("aria-label", value); });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => { const value = tr()[element.dataset.i18nTitle]; if (value) element.setAttribute("title", value); });
    languageButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.lang === language)));
    document.querySelector("#language-current").textContent = language.toUpperCase();
    themeButton.setAttribute("aria-label", tr()[dark ? "themeLight" : "themeDark"]); renderCatalog();
  }
  function setLanguage(value) { if (!translations[value]) return; saveState(); language = value; number = new Intl.NumberFormat(locales[value], { maximumFractionDigits: 2 }); applyTranslations(); renderTopology(); }
  function setTheme(value) { dark = value; document.body.classList.toggle("dark-theme", dark); themeButton.setAttribute("aria-pressed", String(dark)); themeButton.setAttribute("aria-label", tr()[dark ? "themeLight" : "themeDark"]); if (currentPoints.length) draw(currentPoints); const themedModel = activeModel(); if (themedModel && typeof themedModel.onTheme === "function") themedModel.onTheme(dark); }

  function setMetric(index, label, value) { document.querySelector(`#metric-label-${index}`).innerHTML = label; document.querySelector(`#metric-value-${index}`).innerHTML = value; }
  function renderMeasurements(result, state) {
    const third = document.querySelector("#metric-3"); third.classList.remove("reverse-current");
    const customModel = activeModel();
    if (typeof customModel.metricsFor === "function") {
      customModel.metricsFor(result, state, advanced, language).slice(0, 3).forEach((metric, index) => setMetric(index + 1, metric.label, metric.value));
      return;
    }
    if (currentTopology === "pont-h") {
      if (bridgeMode.application === "motor") {
        setMetric(1, tr().speed, `${number.format(result.speedRpm)} tr/min`); setMetric(2, tr().armatureCurrent, displayCurrent(advanced ? result.currentRms : result.currentMean)); setMetric(3, tr().torque, `${number.format(result.electromagneticTorque)} N·m`);
      } else if (bridgeMode.application === "grid") {
        setMetric(1, tr().activePower, `${number.format(result.activePower)} W`); setMetric(2, tr().reactivePower, `${number.format(result.reactivePower)} var`); setMetric(3, advanced ? tr().trackingError : tr().powerFactor, advanced ? displayCurrent(result.trackingErrorRms) : number.format(result.powerFactor));
      } else if (!advanced) { setMetric(1, tr().voltageRms, displayVoltage(result.fundamentalVoltageRms)); setMetric(2, tr().currentRms, displayCurrent(result.currentRms)); setMetric(3, tr().period, displayTime(1 / state.fundamentalFrequency)); }
      else { setMetric(1, tr().currentRms, displayCurrent(result.currentRms)); setMetric(2, tr().phaseShift, `${number.format(result.phaseDegrees)}°`); setMetric(3, tr().switchingRatio, `f${sub("PWM")} / f${sub("1")} = ${number.format(result.switchingRatio)}`); }
      return;
    }
    const voltageLabel = `V${sub("o")}`;
    if (!advanced) { setMetric(1, `${tr().mean} ${voltageLabel}`, displayVoltage(result.mean)); setMetric(2, tr().ripple, displayVoltage(result.ripple)); setMetric(3, tr().period, displayTime(1 / state.frequency)); return; }
    setMetric(1, `${tr().currentAverage} I${sub("L")}`, displayCurrent(result.currentMean)); setMetric(2, `${tr().currentRipple} Δi${sub("L")}`, displayCurrent(result.currentRipple)); setMetric(3, `${tr().currentRange} i${sub("L")}`, `${displayCurrent(result.currentMin)} → ${displayCurrent(result.currentMax)}`);
    third.classList.toggle("reverse-current", commutationMode() === "synchronous" && result.currentMin < 0);
  }
  function relativeError(approximation, simulation) { return Math.abs(approximation - simulation) / Math.max(Math.abs(simulation), 1e-12) * 100; }
  const modelHelpers = () => ({ setText, setInfoMath, texNumber, texVoltage, texFrequency, number, displayVoltage, displayCurrent, displayFrequency, displayTime, relativeError, language, advanced });
  function renderTheoryValues(result, state) {
    const customModel = activeModel();
    if (typeof customModel.theoryValuesFor === "function") { customModel.theoryValuesFor(result, state, modelHelpers()); return; }
    setText("balance-vl", displayVoltage(result.voltageBalance));
    if (currentTopology !== "pont-h") {
      setText("balance-ic", displayCurrent(result.currentBalance)); setText("theory-il-sim", displayCurrent(result.currentRipple)); setText("theory-il-approx", displayCurrent(result.currentRippleApprox)); setText("theory-il-error", `${number.format(relativeError(result.currentRippleApprox, result.currentRipple))} %`); setText("theory-vo-sim", displayVoltage(result.ripple)); setText("theory-vo-approx", displayVoltage(result.voltageRippleApprox)); setText("theory-vo-error", `${number.format(relativeError(result.voltageRippleApprox, result.ripple))} %`);
      if (currentTopology === "buck") setText("theory-resonance", displayFrequency(result.resonance));
      if (currentTopology === "boost" && commutationMode() === "diode") {
        setText("theory-conduction-mode", result.mode);
        const criticalRatio = document.querySelector("#theory-critical-ratio");
        if (criticalRatio) criticalRatio.innerHTML = `L/L${sub("crit")} = ${number.format((state.inductance / 1e6) / result.criticalInductance)}`;
      }
      return;
    }
    if (bridgeMode.application === "motor") {
      setText("theory-motor-voltage", displayVoltage(result.averageVoltage)); setText("theory-motor-current", displayCurrent(result.currentMean)); setText("theory-motor-bus", displayVoltage(state.motorDcVoltage)); setText("theory-motor-speed", `${number.format(result.speedRpm)} tr/min`); setText("theory-motor-torque", `${number.format(result.electromagneticTorque)} N·m`); setText("theory-load", `${number.format(result.loadTorque)} N·m`); return;
    }
    if (bridgeMode.application === "grid") {
      setText("theory-grid-current", displayCurrent(result.currentRms)); setText("theory-grid-phase", `${number.format(result.measuredPhase)}°`); setText("theory-grid-error", displayCurrent(result.trackingErrorRms)); setText("theory-grid-p", `${number.format(result.activePower)} W`); setText("theory-grid-q", `${number.format(result.reactivePower)} var`); setText("theory-grid-pf", number.format(result.powerFactor)); setText("theory-grid-thd", `${number.format(result.currentThd)} %`); return;
    }
    setText("theory-v1-sim", displayVoltage(result.fundamentalVoltageRms)); setText("theory-v1-approx", displayVoltage(result.expectedVoltageRms)); setText("theory-v1-error", `${number.format(relativeError(result.expectedVoltageRms, result.fundamentalVoltageRms))} %`); setText("theory-filter-resonance", displayFrequency(result.resonance)); setText("theory-filter-thd", `${number.format(result.thd)} %`); setText("theory-i1-sim", displayCurrent(result.currentRms)); setText("theory-i1-approx", displayCurrent(result.expectedCurrentRms)); setText("theory-phase", `${number.format(result.phaseDegrees)}°`);
  }
  function renderInfoValues(result, state) {
    const customModel = activeModel();
    if (typeof customModel.infoValuesFor === "function") { customModel.infoValuesFor(result, state, modelHelpers()); return; }
    if (currentTopology === "buck" || currentTopology === "boost") {
      setInfoMath("info-vin", `V_{in}=${texVoltage(state.inputVoltage)}`);
      setInfoMath("info-output", `V_o=${texVoltage(result.mean)}`);
      const currentRipplePercent = result.currentRipple / Math.max(Math.abs(result.currentMean), 1e-12) * 100;
      const voltageRipplePercent = result.ripple / Math.max(Math.abs(result.mean), 1e-12) * 100;
      setInfoMath("info-current-ripple", `\\Delta i_L/I_L=${texNumber(currentRipplePercent)}\\,\\%`);
      setInfoMath("info-voltage-ripple", `\\Delta v_o/V_o=${texNumber(voltageRipplePercent)}\\,\\%`);
    }
    if (currentTopology === "buck") {
      setInfoMath("info-resonance", `f_0=${texFrequency(result.resonance)}`);
      setInfoMath("info-secondary", `f_s/f_0=${texNumber(result.ratio)}`);
      document.querySelector("#info-secondary")?.classList.toggle("warning", result.ratio >= .8 && result.ratio <= 1.2);
    }
    if (currentTopology === "buck" || currentTopology === "boost") { const vin = document.querySelector("#vin-label-value"); if (vin) vin.textContent = number.format(state.inputVoltage); }
    if (currentTopology === "pont-h") {
      if (bridgeMode.application === "motor") {
        setInfoMath("info-primary", `\\langle v_a\\rangle=${texVoltage(result.averageVoltage)}`);
        setInfoMath("info-secondary", `n=${texNumber(result.speedRpm)}\\,\\mathrm{tr/min}`);
        setInfoMath("info-tertiary", `\\langle i_a\\rangle=${texNumber(result.currentMean)}\\,\\mathrm{A}`);
        setInfoMath("info-quaternary", `T_e=${texNumber(result.electromagneticTorque)}\\,\\mathrm{N\\,m}`);
        setInfoMath("info-quinary", `T_L=${texNumber(result.loadTorque)}\\,\\mathrm{N\\,m}`);
      } else if (bridgeMode.application === "grid") {
        if (bridgeMode.currentControl === "hysteresis") {
          setInfoMath("info-primary", `h_i=${texNumber(result.hysteresisBand)}\\,\\mathrm{A}`);
          setInfoMath("info-secondary", `\\overline{f}_{sw}\\simeq${texFrequency(result.switchingFrequencyMeasured)}`);
        } else {
          setInfoMath("info-primary", `I_g^*=${texNumber(state.gridCurrentRms)}\\,\\mathrm{A_{rms}}`);
          setInfoMath("info-secondary", `\\varphi^*=${texNumber(state.gridPhase)}^\\circ`);
        }
        setInfoMath("info-tertiary", `P=${texNumber(result.activePower)}\\,\\mathrm{W}`);
        setInfoMath("info-quaternary", `Q=${texNumber(result.reactivePower)}\\,\\mathrm{var}`);
        setInfoMath("info-quinary", `\\mathrm{FP}=${texNumber(result.powerFactor)}`);
        setInfoMath("info-senary", `\\mathrm{THD}_i=${texNumber(result.currentThd)}\\,\\%`);
      } else {
        setInfoMath("info-secondary", `V_{o,1,\\mathrm{rms}}=${texVoltage(result.fundamentalVoltageRms)}`);
        setInfoMath("info-tertiary", `I_{o,\\mathrm{rms}}=${texNumber(result.currentRms)}\\,\\mathrm{A}`);
        setInfoMath("info-quaternary", `f_0=${texFrequency(result.resonance)}`);
        setInfoMath("info-quinary", `f_{PWM}/f_0=${texNumber(state.switchingFrequency / result.resonance)}`);
        setInfoMath("info-senary", `\\mathrm{THD}_V=${texNumber(result.thd)}\\,\\%`);
      }
    }
  }

  function paddedRange(values) {
    let rawMin = 0; let rawMax = 0;
    values.forEach((value) => { if (Number.isFinite(value)) { rawMin = Math.min(rawMin, value); rawMax = Math.max(rawMax, value); } });
    const span = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax), 1) * .04, .001);
    return { rawMin, rawMax, min: rawMin - span * .1, max: rawMax + span * .1 };
  }
  function resetZoom(topology = currentTopology) {
    zoomStates[topology] = { x: null, y: [null, null, null] };
    zoomDrag = null;
    panDrag = null;
    canvas.classList.remove("panning");
    zoomSelection.hidden = true;
  }
  function plotAtPosition(x, y) {
    if (!plotView || x < plotView.left || x > plotView.right) return null;
    return plotView.plots.find((plot) => y >= plot.top && y <= plot.top + plot.height) || null;
  }
  function selectionGeometry() {
    if (!zoomDrag || !plotView) return null;
    const plot = plotView.plots[zoomDrag.groupIndex];
    if (!plot) return null;
    const x0 = Math.max(plotView.left, Math.min(plotView.right, zoomDrag.x0));
    const x1 = Math.max(plotView.left, Math.min(plotView.right, zoomDrag.x1));
    const y0 = Math.max(plot.top, Math.min(plot.top + plot.height, zoomDrag.y0));
    const y1 = Math.max(plot.top, Math.min(plot.top + plot.height, zoomDrag.y1));
    const width = Math.abs(x1 - x0); const height = Math.abs(y1 - y0);
    if (width >= ZOOM_BAND && height < ZOOM_BAND) return { mode: "x", x: Math.min(x0, x1), y: plot.top, width, height: plot.height, plot, x0, x1, y0, y1 };
    if (height >= ZOOM_BAND && width < ZOOM_BAND) return { mode: "y", x: plotView.left, y: Math.min(y0, y1), width: plotView.plotWidth, height, plot, x0, x1, y0, y1 };
    return { mode: "xy", x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.max(width, 1), height: Math.max(height, 1), plot, x0, x1, y0, y1 };
  }
  function updateZoomSelection() {
    const selection = selectionGeometry();
    if (!selection) { zoomSelection.hidden = true; return; }
    zoomSelection.style.left = `${selection.x}px`; zoomSelection.style.top = `${selection.y}px`; zoomSelection.style.width = `${selection.width}px`; zoomSelection.style.height = `${selection.height}px`;
    zoomSelection.hidden = false;
  }
  function draw(points) {
    if (!points.length) return;
    const css = getComputedStyle(document.body); const color = (name) => css.getPropertyValue(name).trim(); const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); const width = Math.max(rect.width, 280); const height = Math.max(rect.height, 280);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height); ctx.font = '500 15px Inter, "Segoe UI", Arial, sans-serif';
    const groups = activePlotGroups(); const axes = activeAxes(); const hasRightAxis = groups.some((group) => group.some((trace) => trace.axis === "right")); const hasSpeedAxis = axes.some((axis) => axis.unit === "tr/min"); const axisInteger = new Intl.NumberFormat(locales[language], { maximumFractionDigits: 0 }); const axisOneDecimal = new Intl.NumberFormat(locales[language], { maximumFractionDigits: 1 }); const axisValue = (value, unit) => unit === "tr/min" || Math.abs(value) >= 100 ? axisInteger.format(value) : Math.abs(value) >= 10 ? axisOneDecimal.format(value) : number.format(value);
    const hasRightAxisLabel = axes.some((axis) => axis.rightLabel && !axis.hideRightAxis);
    const hasAxisMarks = typeof activeModel().axisMarksFor === "function";
    const left = width < 520 ? (hasSpeedAxis ? 72 : 64) : (hasSpeedAxis ? 84 : 78); const right = hasRightAxis ? (width < 520 ? 64 : hasRightAxisLabel ? 96 : 74) : hasAxisMarks ? (width < 520 ? 58 : 68) : 17; const top = 46; const bottom = currentTopology === "redresseur" ? 50 : currentTopology === "thyristor" ? 48 : 36; const gap = groups.length > 1 ? 54 : 0; const plotHeight = groups.length > 1 ? Math.max(72, (height - top - bottom - gap * (groups.length - 1)) / groups.length) : height - top - bottom; const plotWidth = width - left - right; const duration = points.at(-1).t;
    const zoom = activeZoom(); const xMinFraction = zoom.x?.min ?? 0; const xMaxFraction = zoom.x?.max ?? 1; const xMinTime = duration * xMinFraction; const xMaxTime = duration * xMaxFraction;
    const xAt = (time) => left + (time - xMinTime) / (xMaxTime - xMinTime) * plotWidth;
    const tops = groups.map((_, index) => top + index * (plotHeight + gap));
    // Round tick values (1/2/2.5/5 × 10^n steps) covering the axis range.
    const axisTicks = (minValue, maxValue) => {
      const span = maxValue - minValue;
      if (!(span > 1e-9)) return [];
      const rough = span / 5;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
      let step = magnitude * 10;
      for (const multiplier of [1, 2, 2.5, 5, 10]) { if (magnitude * multiplier >= rough) { step = magnitude * multiplier; break; } }
      const values = [];
      for (let index = Math.ceil(minValue / step - 1e-9); index * step <= maxValue + step * 1e-6; index += 1) {
        const value = index * step;
        values.push(Math.abs(value) < step * 1e-6 ? 0 : value);
      }
      return values;
    };
    const xTicks = axisTicks(xMinTime, xMaxTime, 8);
    let visibleStart = 0; while (visibleStart < points.length - 1 && points[visibleStart].t < xMinTime) visibleStart += 1;
    let visibleEnd = visibleStart; while (visibleEnd < points.length - 1 && points[visibleEnd].t <= xMaxTime) visibleEnd += 1;
    const visiblePoints = points.slice(Math.max(0, visibleStart - 1), Math.min(points.length, visibleEnd + 1));
    const grid = (plotTop, tickList, yAt, horizontalTicks, horizontalAt) => {
      ctx.lineWidth = 1; ctx.strokeStyle = color("--scope-grid");
      if (horizontalTicks.length > 1) horizontalTicks.forEach((tick) => { const x = horizontalAt(tick); ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotTop + plotHeight); ctx.stroke(); });
      else for (let column = 0; column <= 8; column += 1) { const x = left + column / 8 * plotWidth; ctx.beginPath(); ctx.moveTo(x, plotTop); ctx.lineTo(x, plotTop + plotHeight); ctx.stroke(); }
      if (tickList && tickList.length) tickList.forEach((value) => { const y = yAt(value); ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + plotWidth, y); ctx.stroke(); });
      else for (let row = 0; row <= 5; row += 1) { const y = plotTop + row / 5 * plotHeight; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + plotWidth, y); ctx.stroke(); }
    };
    const trace = (definition, yAt, series, horizontalAt, horizontalKey) => {
      const drawable = series.filter((point) => Number.isFinite(point[horizontalKey]) && Number.isFinite(point[definition.key]));
      if (definition.marker) {
        drawable.forEach((point) => {
          ctx.beginPath(); ctx.arc(horizontalAt(point[horizontalKey]), yAt(point[definition.key]), definition.radius || 5, 0, 2 * Math.PI);
          ctx.fillStyle = color("--scope-screen"); ctx.fill(); ctx.strokeStyle = color(definition.color); ctx.lineWidth = definition.width || 3; ctx.stroke();
        });
        return;
      }
      ctx.beginPath(); ctx.setLineDash(definition.dash || []); let previousY; let started = false;
      series.forEach((point) => {
        const horizontal = point[horizontalKey]; const value = point[definition.key];
        if (!Number.isFinite(horizontal) || !Number.isFinite(value)) { started = false; previousY = undefined; return; }
        const x = horizontalAt(horizontal); const y = yAt(value);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else if (definition.step) { ctx.lineTo(x, previousY); ctx.lineTo(x, y); }
        else ctx.lineTo(x, y);
        previousY = y;
      });
      ctx.strokeStyle = color(definition.color); ctx.lineWidth = definition.width || 2.7; ctx.lineJoin = definition.step ? "miter" : "round"; ctx.stroke(); ctx.setLineDash([]);
    };
    const drawXAxis = (plotTop, ticks, horizontalAt, axis) => {
      if (ticks.length <= 1) return;
      const scale = axis.xScale || 1; const values = ticks.map((tick) => tick * scale); const step = Math.abs(values[1] - values[0]);
      const decimals = Math.min(3, Math.max(0, Math.ceil(-Math.log10(step || 1) - 1e-9)));
      const tickFormat = new Intl.NumberFormat(locales[language], { maximumFractionDigits: decimals });
      ctx.save(); ctx.font = '500 12.5px Inter, "Segoe UI", Arial, sans-serif'; ctx.textAlign = "center"; ctx.fillStyle = color("--scope-text");
      ticks.forEach((tick, index) => ctx.fillText(tickFormat.format(values[index]), horizontalAt(tick), plotTop + plotHeight + 17));
      ctx.restore(); ctx.textAlign = "center"; ctx.fillStyle = color("--scope-text");
      ctx.fillText(`${localize(axis.xLabel)}${axis.xUnit ? ` (${axis.xUnit})` : ""}`, left + plotWidth / 2, plotTop + plotHeight + 33);
    };
    const mixedHorizontalAxes = axes.some((axis) => axis.xKey);
    const plotLayouts = [];
    groups.forEach((traces, groupIndex) => {
      const axis = axes[groupIndex] || {}; const plotTop = tops[groupIndex]; const visibleTraces = traces.filter(traceIsVisible); const hasVisibleTrace = visibleTraces.some((item) => !item.ghost);
      const independentX = Boolean(axis.xKey); const horizontalKey = axis.xKey || "t";
      const sourcePoints = typeof activeModel().plotPointsFor === "function" ? activeModel().plotPointsFor(groupIndex, points) : points;
      const horizontalMin = independentX ? axis.xMin ?? Math.min(...sourcePoints.map((point) => point[horizontalKey])) : xMinTime;
      const horizontalMax = independentX ? axis.xMax ?? Math.max(...sourcePoints.map((point) => point[horizontalKey])) : xMaxTime;
      const horizontalAt = independentX ? (value) => left + (value - horizontalMin) / (horizontalMax - horizontalMin) * plotWidth : xAt;
      const horizontalTicks = independentX ? axisTicks(horizontalMin, horizontalMax) : xTicks;
      const series = independentX ? sourcePoints.filter((point) => point[horizontalKey] >= horizontalMin && point[horizontalKey] <= horizontalMax) : visiblePoints;
      const scaleSeries = independentX ? series : points;
      // Ghost traces widen the scale but never appear as drawn curves or tick values.
      const scaledRange = (items, labelItems) => {
        if (!labelItems.length) return null;
        const scale = paddedRange(scaleSeries.flatMap((point) => items.map((item) => point[item.key])));
        const labels = paddedRange(scaleSeries.flatMap((point) => labelItems.map((item) => point[item.key])));
        return { min: scale.min, max: scale.max, rawMin: labels.rawMin, rawMax: labels.rawMax };
      };
      const leftScaleTraces = visibleTraces.filter((item) => item.axis !== "right"); const leftTraces = leftScaleTraces.filter((item) => !item.ghost);
      const rightScaleTraces = visibleTraces.filter((item) => item.axis === "right"); const rightTraces = rightScaleTraces.filter((item) => !item.ghost);
      const automaticRange = scaledRange(leftScaleTraces, leftTraces) || { rawMin: 0, rawMax: 0, min: -1, max: 1 };
      const automaticRightRange = scaledRange(rightScaleTraces, rightTraces);
      const yZoom = zoom.y[groupIndex]; const range = yZoom ? { rawMin: yZoom.min, rawMax: yZoom.max, min: yZoom.min, max: yZoom.max } : automaticRange;
      const rightRange = automaticRightRange && Number.isFinite(yZoom?.rightMin) && Number.isFinite(yZoom?.rightMax) ? { rawMin: yZoom.rightMin, rawMax: yZoom.rightMax, min: yZoom.rightMin, max: yZoom.rightMax } : automaticRightRange;
      const yAt = (value) => plotTop + (range.max - value) / (range.max - range.min) * plotHeight; const yAtRight = (value) => plotTop + (rightRange.max - value) / (rightRange.max - rightRange.min) * plotHeight; const ticks = hasVisibleTrace && Math.abs(range.rawMax - range.rawMin) >= 1e-12 ? axisTicks(range.min, range.max) : []; grid(plotTop, ticks, yAt, horizontalTicks, horizontalAt); const zero = yAt(0);
      plotLayouts.push({ groupIndex, top: plotTop, height: plotHeight, min: range.min, max: range.max, rightMin: rightRange?.min, rightMax: rightRange?.max, independentX });
      ctx.save(); ctx.beginPath(); ctx.rect(left, plotTop, plotWidth, plotHeight); ctx.clip();
      if (zero >= plotTop && zero <= plotTop + plotHeight) { ctx.beginPath(); ctx.moveTo(left, zero); ctx.lineTo(left + plotWidth, zero); ctx.strokeStyle = color("--scope-zero"); ctx.stroke(); }
      [...visibleTraces].sort((a, b) => (a.layer || 0) - (b.layer || 0)).forEach((item) => { if (item.ghost) return; trace(item, item.axis === "right" && rightRange ? yAtRight : yAt, series, horizontalAt, horizontalKey); }); ctx.restore(); const leftTickColor = axis.tint ? color(axis.tint) : groupIndex === 1 ? color("--trace-vl") : groupIndex === 2 ? color("--trace-il") : color("--scope-text"); ctx.fillStyle = leftTickColor; ctx.textAlign = "right";
      if (!hasVisibleTrace) ctx.fillText("—", left - 8, zero + 5);
      else {
        if (!ticks.length) ctx.fillText(`0 ${axes[groupIndex].unit}`, left - 8, zero + 5);
        else {
          ctx.save();
          ctx.font = '500 12.5px Inter, "Segoe UI", Arial, sans-serif';
          ticks.forEach((value) => { ctx.fillText(axisValue(value, axes[groupIndex].unit), left - 8, yAt(value) + 4); });
          ctx.restore();
        }
        if (rightRange && !axes[groupIndex].hideRightAxis) { ctx.fillStyle = color(rightTraces.at(-1)?.color || "--trace-vr"); ctx.textAlign = "left"; if (Math.abs(rightRange.rawMax - rightRange.rawMin) < 1e-12) ctx.fillText(`0 ${axes[groupIndex].rightUnit}`, left + plotWidth + 8, yAtRight(0) + 5); else { ctx.fillText(`${axisValue(rightRange.rawMax, axes[groupIndex].rightUnit)} ${axes[groupIndex].rightUnit}`, left + plotWidth + 8, yAtRight(rightRange.rawMax) + 5); ctx.fillText(`${axisValue(rightRange.rawMin, axes[groupIndex].rightUnit)} ${axes[groupIndex].rightUnit}`, left + plotWidth + 8, yAtRight(rightRange.rawMin) + 5); } }
      }
      const marksModel = activeModel();
      const rightAxisShown = rightRange && !axes[groupIndex].hideRightAxis;
      if (!rightAxisShown && typeof marksModel.axisMarksFor === "function") {
        let previousY = null;
        ctx.textAlign = "left";
        (marksModel.axisMarksFor(groupIndex, advanced) || []).forEach((mark) => {
          if (!Number.isFinite(mark.value)) return;
          let markY = Math.min(plotTop + plotHeight - 4, Math.max(plotTop + 9, yAt(mark.value)));
          if (previousY !== null && Math.abs(markY - previousY) < 14) markY = previousY + 14;
          previousY = markY;
          ctx.fillStyle = color(mark.color || "--scope-text");
          ctx.fillRect(left + plotWidth + 1, markY - 1, 6, 2);
          ctx.fillText(`${axisValue(mark.value, axes[groupIndex].unit)} ${axes[groupIndex].unit}`, left + plotWidth + 9, markY + 4);
        });
      }
      if (mixedHorizontalAxes && axis.showXLabels) drawXAxis(plotTop, horizontalTicks, horizontalAt, axis);
    });
    plotView = { left, right: left + plotWidth, plotWidth, duration, xMinFraction, xMaxFraction, xMinTime, xMaxTime, plots: plotLayouts };
    if (groups.length > 1) scopeScreen.style.setProperty("--voltage-legend-top", `${tops[1] - 38}px`);
    if (groups.length > 2) scopeScreen.style.setProperty("--current-legend-top", `${tops[2] - 38}px`);
    const plotBottom = tops.at(-1) + plotHeight; ctx.fillStyle = color("--scope-text");
    const timeUnit = xMaxTime >= 1 ? { label: "s", scale: 1 } : xMaxTime >= .001 ? { label: "ms", scale: 1e3 } : { label: "µs", scale: 1e6 };
    if (!mixedHorizontalAxes && xTicks.length > 1) {
      const stepInUnit = (xTicks[1] - xTicks[0]) * timeUnit.scale;
      const decimals = Math.min(3, Math.max(0, Math.ceil(-Math.log10(stepInUnit) - 1e-9)));
      const tickFormat = new Intl.NumberFormat(locales[language], { maximumFractionDigits: decimals });
      ctx.save(); ctx.font = '500 12.5px Inter, "Segoe UI", Arial, sans-serif'; ctx.textAlign = "center";
      xTicks.forEach((tickTime) => ctx.fillText(tickFormat.format(tickTime * timeUnit.scale), xAt(tickTime), plotBottom + 17));
      ctx.restore();
      ctx.textAlign = "center"; ctx.fillText(`${tr().time} (${timeUnit.label})`, left + plotWidth / 2, plotBottom + 33);
    } else if (!mixedHorizontalAxes) { ctx.textAlign = "center"; ctx.fillText(tr().time, left + plotWidth / 2, plotBottom + 25); }
    const labelInset = width < 520 ? 12 : 24;
    const axisLabel = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    groups.forEach((_, index) => { ctx.save(); ctx.translate(labelInset, tops[index] + plotHeight / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = axes[index].tint ? color(axes[index].tint) : index === 1 ? color("--trace-vl") : index === 2 ? color("--trace-il") : color("--scope-text"); ctx.fillText(`${axisLabel(axes[index].label)} (${axes[index].unit})`, 0, 0); ctx.restore(); if (axes[index].rightLabel && !axes[index].hideRightAxis) { ctx.save(); ctx.translate(width - labelInset, tops[index] + plotHeight / 2); ctx.rotate(Math.PI / 2); ctx.fillStyle = color(groups[index].filter((item) => item.axis === "right").at(-1)?.color || "--trace-vr"); ctx.fillText(`${axisLabel(axes[index].rightLabel)} (${axes[index].rightUnit})`, 0, 0); ctx.restore(); } });
  }

  let modelUpdateQueued = false;
  function scheduleModelUpdate() {
    if (modelUpdateQueued) return;
    modelUpdateQueued = true;
    requestAnimationFrame(() => { modelUpdateQueued = false; update(); });
  }
  let lastTraceSignature = "";
  function update() {
    const state = getState(); states[currentTopology] = state;
    inputs.forEach((input) => { input.closest(".control").querySelector("output").textContent = displayControl(input._definition, Number(input.value)); updateRange(input); });
    // Les traces peuvent dépendre des réglages (v_x du redresseur n'existe que si Lf > 0) : légendes à refaire si la liste change.
    const traceSignature = activePlotGroups().map((group) => group.map((trace) => trace.key).join()).join("|");
    if (traceSignature !== lastTraceSignature) { lastTraceSignature = traceSignature; renderLegends(); }
    const result = activeModel().calculate(state, commutationMode(), modelOptions()); currentPoints = result.points; renderInfoValues(result, state); renderMeasurements(result, state); renderTheoryValues(result, state); draw(currentPoints);
    if (typeof activeModel().onResult === "function") activeModel().onResult(result, state, { language, advanced, dark, requestUpdate: scheduleModelUpdate });
  }
  function renderTopology() {
    document.body.dataset.topology = currentTopology;
    const topology = catalog.find((item) => item.id === currentTopology); document.title = `${tr().documentTitle} — ${localize(topology?.name)}`; document.querySelector('meta[name="description"]').setAttribute("content", tr().metaDescription); canvas.setAttribute("aria-label", `${tr().scopeAria}: ${localize(topology?.name)}. ${tr().zoomAria}`);
    const curvesHost = document.querySelector("#pv-curves"); if (curvesHost) curvesHost.hidden = currentTopology !== "pv-grid";
    renderRectifierPanel(); renderControls(); renderCommutationSelector(); renderBridgeModePanel(); renderDiagram(); renderInfoBand(); renderLegends(); renderTheoryShell(); update();
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function finishZoom(event, cancelled = false) {
    if (!zoomDrag || (event && zoomDrag.pointerId !== event.pointerId)) return;
    if (event) { const point = canvasPoint(event); zoomDrag.x1 = point.x; zoomDrag.y1 = point.y; }
    const selection = cancelled ? null : selectionGeometry();
    if (selection && (selection.width >= ZOOM_MIN_DRAG || selection.height >= ZOOM_MIN_DRAG)) {
      const zoom = activeZoom();
      if (!selection.plot.independentX && (selection.mode === "x" || selection.mode === "xy") && selection.width >= ZOOM_MIN_DRAG) {
        const fractionAt = (x) => plotView.xMinFraction + (x - plotView.left) / plotView.plotWidth * (plotView.xMaxFraction - plotView.xMinFraction);
        zoom.x = { min: Math.max(0, Math.min(fractionAt(selection.x0), fractionAt(selection.x1))), max: Math.min(1, Math.max(fractionAt(selection.x0), fractionAt(selection.x1))) };
      }
      if ((selection.mode === "y" || selection.mode === "xy") && selection.height >= ZOOM_MIN_DRAG) {
        const valueAt = (y) => selection.plot.max - (y - selection.plot.top) / selection.plot.height * (selection.plot.max - selection.plot.min);
        const nextRange = { min: Math.min(valueAt(selection.y0), valueAt(selection.y1)), max: Math.max(valueAt(selection.y0), valueAt(selection.y1)) };
        if (Number.isFinite(selection.plot.rightMin) && Number.isFinite(selection.plot.rightMax)) {
          const rightValueAt = (y) => selection.plot.rightMax - (y - selection.plot.top) / selection.plot.height * (selection.plot.rightMax - selection.plot.rightMin);
          nextRange.rightMin = Math.min(rightValueAt(selection.y0), rightValueAt(selection.y1)); nextRange.rightMax = Math.max(rightValueAt(selection.y0), rightValueAt(selection.y1));
        }
        zoom.y[selection.plot.groupIndex] = nextRange;
      }
    }
    zoomDrag = null;
    zoomSelection.hidden = true;
    if (currentPoints.length) draw(currentPoints);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!plotView) return;
    const point = canvasPoint(event); const plot = plotAtPosition(point.x, point.y);
    if (!plot) return;
      if (event.button === 2) {
        const zoom = activeZoom();
        panDrag = {
          pointerId: event.pointerId, groupIndex: plot.groupIndex, x0: point.x, y0: point.y,
          independentX: plot.independentX,
        x: zoom.x ? { ...zoom.x } : { min: 0, max: 1 },
        y: zoom.y[plot.groupIndex] ? { ...zoom.y[plot.groupIndex] } : { min: plot.min, max: plot.max },
        yRight: Number.isFinite(plot.rightMin) && Number.isFinite(plot.rightMax) ? { min: plot.rightMin, max: plot.rightMax } : null,
      };
      canvas.classList.add("panning");
      event.preventDefault();
      try { canvas.setPointerCapture(event.pointerId); } catch (_error) {}
      return;
    }
    if (event.button !== 0) return;
    zoomDrag = { pointerId: event.pointerId, groupIndex: plot.groupIndex, x0: point.x, y0: point.y, x1: point.x, y1: point.y };
    event.preventDefault();
    try { canvas.setPointerCapture(event.pointerId); } catch (_error) {}
  });
  canvas.addEventListener("pointermove", (event) => {
    if (panDrag && panDrag.pointerId === event.pointerId) {
      const point = canvasPoint(event); const zoom = activeZoom();
      if (!panDrag.independentX) {
        const xSpan = panDrag.x.max - panDrag.x.min;
        const xShift = -(point.x - panDrag.x0) / plotView.plotWidth * xSpan;
        const xMin = Math.max(0, Math.min(1 - xSpan, panDrag.x.min + xShift));
        zoom.x = xSpan < 1 - 1e-9 ? { min: xMin, max: xMin + xSpan } : null;
      }
      const plot = plotView.plots[panDrag.groupIndex]; const ySpan = panDrag.y.max - panDrag.y.min;
      const yShift = (point.y - panDrag.y0) / plot.height * ySpan;
      const nextRange = { min: panDrag.y.min + yShift, max: panDrag.y.max + yShift };
      if (panDrag.yRight) { const rightSpan = panDrag.yRight.max - panDrag.yRight.min; const rightShift = (point.y - panDrag.y0) / plot.height * rightSpan; nextRange.rightMin = panDrag.yRight.min + rightShift; nextRange.rightMax = panDrag.yRight.max + rightShift; }
      zoom.y[panDrag.groupIndex] = nextRange;
      event.preventDefault(); draw(currentPoints); return;
    }
    if (!zoomDrag || zoomDrag.pointerId !== event.pointerId) return;
    const point = canvasPoint(event); zoomDrag.x1 = point.x; zoomDrag.y1 = point.y; event.preventDefault(); updateZoomSelection();
  });
  canvas.addEventListener("pointerup", (event) => {
    if (panDrag && panDrag.pointerId === event.pointerId) {
      panDrag = null; canvas.classList.remove("panning");
      try { canvas.releasePointerCapture(event.pointerId); } catch (_error) {}
      return;
    }
    const drag = zoomDrag; const point = canvasPoint(event); const moved = drag ? Math.hypot(point.x - drag.x0, point.y - drag.y0) >= ZOOM_MIN_DRAG : true;
    finishZoom(event);
    if (!moved) {
      const now = performance.now();
      if (lastCanvasTap && now - lastCanvasTap.time < 350 && Math.hypot(point.x - lastCanvasTap.x, point.y - lastCanvasTap.y) < 24) { resetZoom(); draw(currentPoints); lastCanvasTap = null; }
      else lastCanvasTap = { time: now, x: point.x, y: point.y };
    }
  });
  canvas.addEventListener("pointercancel", (event) => {
    if (panDrag && panDrag.pointerId === event.pointerId) { panDrag = null; canvas.classList.remove("panning"); return; }
    finishZoom(event, true);
  });
  canvas.addEventListener("dblclick", (event) => { if (!plotAtPosition(canvasPoint(event).x, canvasPoint(event).y)) return; resetZoom(); draw(currentPoints); });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (zoomDrag) finishZoom(null, true);
    if (panDrag) { panDrag = null; canvas.classList.remove("panning"); }
  });

  // Langue : un bouton « FR ▾ » ouvre le choix des trois langues (gain de place dans l'en-tête).
  const setLanguageMenu = (open) => { languageMenu.hidden = !open; languageTrigger.setAttribute("aria-expanded", String(open)); };
  languageTrigger.addEventListener("click", () => setLanguageMenu(languageMenu.hidden));
  languageButtons.forEach((button) => button.addEventListener("click", () => { setLanguage(button.dataset.lang); setLanguageMenu(false); languageTrigger.focus(); }));
  document.addEventListener("click", (event) => { if (!languageMenu.hidden && !event.target.closest(".language-switch")) setLanguageMenu(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !languageMenu.hidden) { setLanguageMenu(false); languageTrigger.focus(); } });
  commutationButtons.forEach((button) => button.addEventListener("click", () => {
    if (currentTopology !== "buck" && currentTopology !== "boost") return;
    saveState();
    commutationModes[currentTopology] = button.dataset.commutation;
    resetZoom();
    renderTopology();
  }));
  bridgeApplicationButtons.forEach((button) => button.addEventListener("click", () => {
    if (currentTopology !== "pont-h" || bridgeMode.application === button.dataset.bridgeApplication) return;
    saveState(); bridgeMode.application = button.dataset.bridgeApplication; resetZoom(); renderTopology();
  }));
  bridgeSwitchingButtons.forEach((button) => button.addEventListener("click", () => {
    if (currentTopology !== "pont-h" || bridgeMode.switching === button.dataset.bridgeSwitching) return;
    saveState(); bridgeMode.switching = button.dataset.bridgeSwitching; resetZoom(); renderTopology();
  }));
  gridCurrentControlButtons.forEach((button) => button.addEventListener("click", () => {
    if (currentTopology !== "pont-h" || bridgeMode.application !== "grid" || bridgeMode.currentControl === button.dataset.gridCurrentControl) return;
    saveState(); bridgeMode.currentControl = button.dataset.gridCurrentControl; resetZoom(); renderTopology();
  }));
  motorDirectionButtons.forEach((button) => button.addEventListener("click", () => {
    if (currentTopology !== "pont-h" || bridgeMode.direction === button.dataset.motorDirection) return;
    bridgeMode.direction = button.dataset.motorDirection; resetZoom(); renderTopology();
  }));
  motorViewButtons.forEach((button) => button.addEventListener("click", () => {
    if (currentTopology !== "pont-h" || bridgeMode.application !== "motor" || bridgeMode.motorView === button.dataset.motorView) return;
    bridgeMode.motorView = button.dataset.motorView; resetZoom(); renderTopology();
  }));
  rectifierMontageButtons.forEach((button) => button.addEventListener("click", () => {
    const mode = activeRectifierMode();
    const montage = currentTopology === "thyristor" && button.dataset.rectifierMontage === "bridge" ? "triac" : button.dataset.rectifierMontage;
    if (!isRectifierTopology() || mode.montage === montage) return;
    saveState(); mode.montage = montage; resetZoom(); renderTopology();
  }));
  rectifierFrequencyToggle.addEventListener("click", () => {
    if (!isRectifierTopology()) return;
    const mode = activeRectifierMode();
    saveState(); mode.frequency = mode.frequency === 50 ? 60 : 50; resetZoom(); renderTopology();
  });
  thyristorVoltageButtons.forEach((button) => button.addEventListener("click", () => {
    const voltage = Number(button.dataset.thyristorVoltage);
    if (currentTopology !== "thyristor" || getState().vinRms === voltage) return;
    saveState(); states.thyristor = { ...models.thyristor.defaults, ...(states.thyristor || {}), vinRms: voltage }; resetZoom(); renderTopology();
  }));
  rectifierViewButtons.forEach((button) => button.addEventListener("click", () => {
    const mode = activeRectifierMode();
    if (!isRectifierTopology() || mode.view === button.dataset.rectifierView) return;
    saveState(); mode.view = button.dataset.rectifierView; resetZoom(); renderTopology();
  }));
  rectifierDiodesButtons.forEach((button) => button.addEventListener("click", () => {
    const mode = activeRectifierMode();
    if (!isRectifierTopology() || mode.diodes === button.dataset.rectifierDiodes) return;
    saveState(); mode.diodes = button.dataset.rectifierDiodes; resetZoom(); renderTopology();
  }));
  themeButton.addEventListener("click", () => setTheme(!dark));
  theoryButton.addEventListener("click", () => theoryDialog.showModal());
  document.querySelector("#theory-close").addEventListener("click", () => theoryDialog.close());
  theoryDialog.addEventListener("click", (event) => { if (event.target === theoryDialog) theoryDialog.close(); });
  document.querySelector("#topology-trigger").addEventListener("click", () => topologyDialog.showModal());
  document.querySelector("#topology-close").addEventListener("click", () => topologyDialog.close());
  topologyDialog.addEventListener("click", (event) => { if (event.target === topologyDialog) topologyDialog.close(); });
  advancedButton.addEventListener("click", () => { advanced = !advanced; advancedButton.setAttribute("aria-pressed", String(advanced)); document.body.classList.toggle("advanced-mode", advanced); renderRectifierPanel(); renderControls(); renderCommutationSelector(); renderBridgeModePanel(); renderLegends(); update(); });
  // Configuration initiale du circuit courant (bouton ↺, et à chaque changement de circuit).
  function resetCurrentTopology() { states[currentTopology] = { ...activeModel().defaults }; hiddenTraces[currentTopology] = new Set(activeModel().defaultHiddenTraces || []); resetZoom(); if (currentTopology in commutationModes) commutationModes[currentTopology] = "synchronous"; if (currentTopology === "pont-h") { bridgeMode.switching = "bipolar"; bridgeMode.direction = "forward"; bridgeMode.motorView = "transient"; bridgeMode.currentControl = "pwm"; } if (currentTopology === "redresseur") { rectifierMode.montage = "single"; rectifierMode.view = "steady"; rectifierMode.diodes = "ideal"; rectifierMode.frequency = 60; } if (currentTopology === "thyristor") { thyristorMode.montage = "single"; thyristorMode.frequency = 60; } if (typeof activeModel().resetInteractive === "function") activeModel().resetInteractive(); }
  document.querySelector("#reset").addEventListener("click", () => { resetCurrentTopology(); renderTopology(); });
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("hashchange", () => { const requested = decodeURIComponent(window.location.hash.slice(1)); if (models[requested]) selectTopology(requested, false); else syncRoute(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => currentPoints.length && draw(currentPoints)).observe(canvas); else window.addEventListener("resize", () => currentPoints.length && draw(currentPoints));

  initializeRoute(); renderMath(); setTheme(false); setLanguage("fr");
})();
