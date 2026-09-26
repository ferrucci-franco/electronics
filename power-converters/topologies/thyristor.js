(() => {
  "use strict";

  const text = (en, fr, es) => Object.freeze({ en, fr, es });
  const localizeText = (value, language) => value?.[language] || value?.fr || "";
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const wrap = (angle) => ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const control = (key, symbol, labels, min, max, step, unit, extra = {}) => ({ key, symbol, label: text(...labels), aria: text(...labels), min, max, step, unit, ...extra });

  const i18n = {
    law: text("Phase-control law", "Loi de commande en phase", "Ley de control de fase"),
    command: text("Gate command", "Commande de gâchette", "Mando de compuerta"),
    voltages: text("Load voltage", "Tension de charge", "Tensión de carga"),
    currents: text("Load current", "Courant de charge", "Corriente de carga"),
    inputQuality: text("Power and quality", "Puissance et qualité", "Potencia y calidad"),
    voltageAxis: text("voltages", "tensions", "tensiones"),
    currentsAxis: text("currents", "courants", "corrientes"),
    gateAxis: text("gate pulse", "impulsion de gâchette", "pulso de compuerta"),
    activePowerAxis: text("active power", "puissance active", "potencia activa"),
    rmsVoltageAxis: text("RMS load voltage", "tension efficace de charge", "tensión eficaz de carga"),
    firingAngleAxis: text("firing angle", "angle d’amorçage", "ángulo de disparo"),
    meanVoltage: text("Average voltage", "Tension moyenne", "Tensión media"),
    meanCurrent: text("Average current", "Courant moyen", "Corriente media"),
    rmsCurrent: text("RMS current", "Courant efficace", "Corriente eficaz"),
    firingAngle: text("Firing angle", "Angle d’amorçage", "Ángulo de disparo"),
    firingDelay: text("Firing delay", "Retard à l’amorçage", "Retardo de disparo"),
    characteristic: text("Characteristic values", "Grandeurs caractéristiques", "Magnitudes características"),
    analyticalModel: text("Ideal resistive reference", "Référence résistive idéale", "Referencia resistiva ideal"),
    simulation: text("Simulation", "Simulation", "Simulación"),
    analytical: text("From α", "À partir de α", "A partir de α"),
    relativeGap: text("Relative gap", "Écart relatif", "Diferencia relativa"),
    powerFactor: text("Power factor", "Facteur de puissance", "Factor de potencia"),
    currentThd: text("Current THD", "THD du courant", "THD de corriente"),
    singleName: text("SCR · one half-cycle", "SCR · une alternance", "SCR · un semiciclo"),
    triacName: text("TRIAC · two half-cycles", "TRIAC · deux alternances", "TRIAC · dos semiciclos"),
    theoryNote: text(
      "The sinusoid starts at each zero crossing and α is measured from that point. The SCR controls one half-cycle; the TRIAC is triggered after both zero crossings and controls both half-cycles. The displayed equation is the ideal resistive reference; the simulation also includes the effect of L on current extinction.",
      "La sinusoïde commence à chaque passage par zéro et α est mesuré depuis ce point. Le SCR commande une alternance ; le TRIAC est amorcé après chaque passage par zéro et commande les deux alternances. L’équation affichée est la référence résistive idéale ; la simulation tient aussi compte de l’effet de L sur l’extinction du courant.",
      "La senoidal comienza en cada cruce por cero y α se mide desde ese punto. El SCR controla un semiciclo; el TRIAC se dispara después de ambos cruces por cero y controla los dos semiciclos. La ecuación mostrada es la referencia resistiva ideal; la simulación también incluye el efecto de L sobre la extinción de la corriente.",
    ),
    schematic: text("SCR or TRIAC phase-angle power control", "Commande de puissance par angle de phase avec SCR ou TRIAC", "Control de potencia por ángulo de fase con SCR o TRIAC"),
  };

  const controls = {
    alpha: control("alpha", "α", ["Firing angle", "Angle d’amorçage", "Ángulo de disparo"], 0, 170, 5, "°"),
    resistance: control("resistance", "R", ["Load resistance", "Résistance de charge", "Resistencia de carga"], 2, 50, 1, "Ω"),
    inductance: control("inductance", "L", ["Load inductance", "Inductance de charge", "Inductancia de carga"], 0, 500, 5, "mH"),
  };

  const tracesMain = [
    { key: "vIn", label: "v<sub>in</sub>", color: "--trace-vin", width: 1.8 },
    { key: "vCh", label: "v<sub>o</sub>", color: "--trace-vr", width: 3 },
  ];
  const tracesMainAdvancedFor = (montage) => [
    ...tracesMain,
    { key: "vT1", label: montage === "triac" ? "v<sub>TRIAC</sub>" : "v<sub>SCR</sub>", color: "--trace-vl", dash: [7, 4], width: 2 },
  ];
  const tracesLoad = [{ key: "iCh", label: "i<sub>o</sub>", color: "--trace-il", width: 3 }];
  const tracesCurrentsFor = (montage) => {
    const traces = [...tracesLoad];
    traces.push({ key: "g1", label: montage === "triac" ? "g<sub>TRIAC</sub>" : "g<sub>SCR</sub>", color: "--trace-vr", width: 1.8, axis: "right", layer: -1 });
    return traces;
  };
  const tracesCharacteristic = [
    { key: "pActive", label: "P<sub>o</sub>(α)", color: "--trace-vr", width: 2.8 },
    { key: "vRms", label: "V<sub>o,eff</sub>(α)", color: "--trace-vin", width: 2.8, axis: "right" },
    { key: "pOperating", legendKey: "pActive", label: "", color: "--trace-vr", width: 3, radius: 5.5, marker: true, legendHidden: true },
    { key: "vOperating", legendKey: "vRms", label: "", color: "--trace-vin", width: 3, radius: 5.5, marker: true, legendHidden: true, axis: "right" },
  ];
  const characteristicCache = new Map();

  // Switched-device model. The SCR is fired on the positive half-cycle only;
  // the TRIAC is fired after both zero crossings. Either device stays latched
  // until the load current naturally reaches zero.
  function simulate(state, options) {
    const montage = options.montage === "triac" ? "triac" : "single";
    const characteristicRun = Boolean(options.characteristicRun);
    const frequency = options.frequency === 60 ? 60 : 50;
    const omega = 2 * Math.PI * frequency;
    const period = 1 / frequency;
    const amplitude = Math.SQRT2 * state.vinRms;
    const alpha = clamp(state.alpha, 0, 170) * Math.PI / 180;
    const r = Math.max(.25, state.resistance);
    const l = Math.max(0, state.inductance) / 1000;
    const rs = .2;
    const dt = period / (characteristicRun ? 1200 : 4000);
    const gateWidth = 8 * Math.PI / 180;
    let current = 0;
    let activePair = 0;

    const source = (time) => amplitude * Math.sin(omega * time);
    const gateState = (phase) => {
      const positive = wrap(phase - alpha) < gateWidth;
      const negative = montage === "triac" && wrap(phase - alpha - Math.PI) < gateWidth;
      return { positive, negative, g1: positive || negative };
    };

    const advance = (time) => {
      const phase = wrap(omega * time);
      const vin = source(time);
      const gates = gateState(phase);
      if (!activePair && gates.positive && vin >= 0) activePair = 1;
      if (!activePair && gates.negative && vin <= 0) activePair = -1;

      if (l <= 0) {
        if (!activePair) current = 0;
        else {
          current = vin / (r + rs);
          if (activePair * current <= 0) { current = 0; activePair = 0; }
        }
        const vCh = r * current;
        return { phase, vin, vCh, current, activePair, ...gates };
      }

      if (!activePair) return { phase, vin, vCh: 0, current: 0, activePair: 0, ...gates };

      const previous = current;
      current = (current + dt * vin / l) / (1 + dt * (r + rs) / l);
      if (activePair * current <= 0) {
        current = 0;
        activePair = 0;
        return { phase, vin, vCh: 0, current, activePair, ...gates };
      }
      const slope = (current - previous) / dt;
      const vCh = r * current + l * slope;
      return { phase, vin, vCh, current, activePair, ...gates };
    };

    const tau = l > 0 ? l / r : 0;
    const settleCycles = clamp(Math.ceil(7 * tau / period), 6, 60);
    const stepsPerPeriod = Math.round(period / dt);
    for (let index = 0; index < settleCycles * stepsPerPeriod; index += 1) advance(index * dt);

    const recordCycles = characteristicRun ? 1 : 2;
    const startTime = settleCycles * period;
    const totalSteps = recordCycles * stepsPerPeriod;
    const keepEvery = Math.max(1, Math.ceil(totalSteps / 22000));
    const points = [];
    for (let index = 0; index <= totalSteps; index += 1) {
      const sample = advance(startTime + index * dt);
      if (index % keepEvery !== 0 && index !== totalSteps) continue;
      const deviceOn = sample.activePair !== 0;
      points.push({
        t: index * dt,
        vIn: sample.vin,
        vCh: sample.vCh,
        vT1: deviceOn ? 0 : sample.vin,
        iCh: sample.current,
        iIn: sample.current,
        g1: sample.g1 ? 1 : 0,
      });
    }

    const metricCount = Math.max(2, Math.round(points.length / recordCycles));
    const metricPoints = points.slice(-metricCount);
    const mean = (key) => metricPoints.reduce((sum, point) => sum + point[key], 0) / metricPoints.length;
    const rms = (key) => Math.sqrt(metricPoints.reduce((sum, point) => sum + point[key] ** 2, 0) / metricPoints.length);
    const vChMean = montage === "triac" ? 0 : mean("vCh");
    const vChRms = rms("vCh");
    const iChMean = montage === "triac" ? 0 : mean("iCh");
    const iChRms = rms("iCh");
    const iInRms = rms("iIn");
    const iInMean = montage === "triac" ? 0 : mean("iIn");
    const rmsNumerator = Math.PI - alpha + .5 * Math.sin(2 * alpha);
    const analyticalRms = state.vinRms * Math.sqrt(Math.max(0, rmsNumerator / (montage === "triac" ? Math.PI : 2 * Math.PI)));
    const pCh = metricPoints.reduce((sum, point) => sum + point.vCh * point.iCh, 0) / metricPoints.length;
    const pIn = metricPoints.reduce((sum, point) => sum + point.vIn * point.iIn, 0) / metricPoints.length;
    let fundSin = 0;
    let fundCos = 0;
    metricPoints.forEach((point) => {
      const angle = omega * point.t;
      fundSin += point.iIn * Math.sin(angle);
      fundCos += point.iIn * Math.cos(angle);
    });
    const fundamentalRms = Math.SQRT2 * Math.hypot(fundSin, fundCos) / metricPoints.length;
    const distortion = Math.max(0, iInRms ** 2 - iInMean ** 2 - fundamentalRms ** 2);
    const thdI = fundamentalRms > 1e-8 ? Math.sqrt(distortion) / fundamentalRms * 100 : 0;
    const apparent = state.vinRms * iInRms;

    const result = {
      points,
      montage,
      amplitude,
      frequency,
      duration: points.at(-1).t,
      alphaDegrees: state.alpha,
      firingDelay: state.alpha / 360 / frequency,
      vChMean,
      vChRms,
      iChMean,
      iChRms,
      iInRms,
      pCh,
      pIn,
      apparent,
      powerFactor: apparent > 1e-9 ? pIn / apparent : 0,
      thdI,
      analyticalRms,
      piv: Math.abs(Math.min(0, ...metricPoints.map((point) => point.vT1))),
    };
    if (!characteristicRun) {
      const cacheKey = [montage, frequency, state.vinRms, state.resistance, state.inductance].join("|");
      let characteristic = characteristicCache.get(cacheKey);
      if (!characteristic) {
        characteristic = [];
        for (let angle = 0; angle <= 170; angle += 5) {
          const sample = simulate({ ...state, alpha: angle }, { ...options, characteristicRun: true });
          characteristic.push({ alpha: angle, pActive: sample.pCh, vRms: sample.vChRms });
        }
        characteristicCache.set(cacheKey, characteristic);
        if (characteristicCache.size > 12) characteristicCache.delete(characteristicCache.keys().next().value);
      }
      result.characteristicPoints = characteristic.map((point) => {
        const operating = Math.abs(point.alpha - state.alpha) < 1e-9;
        return { ...point, pOperating: operating ? result.pCh : Number.NaN, vOperating: operating ? result.vChRms : Number.NaN };
      });
    }
    return result;
  }

  // SCR et TRIAC : un seul schéma dessiné dans Inkscape (app/scr.svg), empilé par
  // tools/empiler-calques-svg.py ; un calque = une <img> du même fichier, dans le même cadre,
  // réglé par onResult. Le balisage ne dépend d'aucun réglage (montage compris) : app.js garde
  // les mêmes nœuds d'un calcul à l'autre, et seul le composant central change.
  const schematicLayers = ["base", "scr", "triac", "50hz", "60hz", "load-r", "load-rl"];
  function schematic(language) {
    const aria = localizeText(i18n.schematic, language);
    return `<div class="thy-schematic rect-layered" role="img" aria-label="${aria}">${schematicLayers.map((layer) => `<img class="converter-schematic" data-layer="${layer}" src="assets/scr.svg#${layer}" alt="" draggable="false"${layer === "base" ? "" : ' style="display:none"'} />`).join("")}</div>`;
  }

  const analyticalRmsTex = (montage) => `V_{o,\\mathrm{eff}}=V_{in,\\mathrm{eff}}\\sqrt{\\dfrac{\\pi-\\alpha+\\tfrac12\\sin(2\\alpha)}{${montage === "triac" ? "\\pi" : "2\\pi"}}}`;

  const model = {
    id: "thyristor",
    defaults: { vinRms: 230, alpha: 60, resistance: 15, inductance: 0 },
    controlsFor() {
      return { top: [controls.alpha, controls.resistance, controls.inductance], bottom: [] };
    },
    diagram: { type: "inline", aria: text("SCR or TRIAC phase-angle power controller with R-L load", "Commande de puissance par angle de phase avec SCR ou TRIAC et charge R–L", "Control de potencia por ángulo de fase con SCR o TRIAC y carga R–L") },
    diagramFor(_montage, language) { return schematic(language); },
    onResult(result, state) {
      const layered = document.querySelector(".thy-schematic.rect-layered");
      if (!layered) return;
      const show = (layer, visible) => { const image = layered.querySelector(`[data-layer="${layer}"]`); if (image) image.style.display = visible ? "" : "none"; };
show("scr", result.montage !== "triac");
      show("triac", result.montage === "triac");
            show("50hz", result.frequency !== 60);
      show("60hz", result.frequency === 60);
      show("load-r", !(state.inductance > 0));
      show("load-rl", state.inductance > 0);
    },
    plotsFor(montage) { return { main: tracesMainAdvancedFor(montage), second: tracesCurrentsFor(montage), third: tracesCharacteristic }; },
    basicPlotsFor() { return [tracesMain, tracesLoad, tracesCharacteristic]; },
    axesFor(_montage, isAdvanced = false) {
      return [
        { label: i18n.voltageAxis, unit: "V", tint: "--scope-text" },
        { label: i18n.currentsAxis, unit: "A", tint: "--trace-il", rightLabel: isAdvanced ? i18n.gateAxis : null, rightUnit: "", xLabel: text("time", "temps", "tiempo"), xUnit: "ms", xScale: 1000, showXLabels: true },
        { label: i18n.activePowerAxis, unit: "W", tint: "--trace-vr", rightLabel: i18n.rmsVoltageAxis, rightUnit: "V", xKey: "alpha", xMin: 0, xMax: 170, xLabel: i18n.firingAngleAxis, xUnit: "°", showXLabels: true },
      ];
    },
    plotPointsFor(groupIndex, points) { return groupIndex === 2 ? this.lastResult?.characteristicPoints || [] : points; },
    axisMarksFor(groupIndex) {
      if (!this.lastResult) return [];
      if (groupIndex === 0) return [{ value: this.lastResult.vChMean, color: "--trace-vr" }];
      if (groupIndex === 1) return [{ value: this.lastResult.iChMean, color: "--trace-il" }];
      return [];
    },
    calculate(state, _commutation, options = {}) {
      const result = simulate(state, options);
      this.lastResult = result;
      return result;
    },
    metricsFor(result, _state, advanced, language) {
      const t = (value) => localizeText(value, language);
      const format = new Intl.NumberFormat({ en: "en-US", fr: "fr-FR", es: "es-ES" }[language] || "fr-FR", { maximumFractionDigits: 2 });
      const volts = (value) => `${format.format(value)} V`;
      const amps = (value) => Math.abs(value) < 1 ? `${format.format(value * 1000)} mA` : `${format.format(value)} A`;
      if (!advanced) return [
        { label: `${t(i18n.meanVoltage)} ⟨v<span class="symbol-index">o</span>⟩`, value: volts(result.vChMean) },
        { label: `${t(i18n.meanCurrent)} ⟨i<span class="symbol-index">o</span>⟩`, value: amps(result.iChMean) },
        { label: t(i18n.rmsVoltageAxis), value: volts(result.vChRms) },
      ];
      return [
        { label: `${t(i18n.rmsCurrent)} I<span class="symbol-index">o,eff</span>`, value: amps(result.iChRms) },
        { label: t(i18n.activePowerAxis), value: `${format.format(result.pCh)} W` },
        { label: t(i18n.powerFactor), value: format.format(result.powerFactor) },
      ];
    },
    infoBandHtml(language) {
      const t = (value) => localizeText(value, language);
      const lines = (ids) => `<div class="info-lines pv-info-lines">${ids.map((id) => `<span class="math info-equation" id="${id}"></span>`).join("")}</div>`;
      return `<div><span>${t(i18n.command)}</span>${lines(["info-thy-alpha", "info-thy-delay"])}</div>
<div><span>${t(i18n.voltages)}</span>${lines(["info-thy-vmean", "info-thy-vrms"])}</div>
<div><span>${t(i18n.currents)}</span>${lines(["info-thy-imean", "info-thy-irms"])}</div>
<div><span>${t(i18n.inputQuality)}</span>${lines(["info-thy-power", "info-thy-pf", "info-thy-thd"])}</div>`;
    },
    infoValuesFor(result, _state, helpers) {
      const { setInfoMath, texNumber, texVoltage } = helpers;
      setInfoMath("info-thy-alpha", `\\alpha=${texNumber(result.alphaDegrees)}^\\circ`);
      setInfoMath("info-thy-delay", `t_\\alpha=${texNumber(result.firingDelay * 1000)}\\,\\mathrm{ms}`);
      setInfoMath("info-thy-vmean", `\\langle v_{o}\\rangle=${texVoltage(result.vChMean)}`);
      setInfoMath("info-thy-vrms", `V_{o,eff}=${texVoltage(result.vChRms)}`);
      setInfoMath("info-thy-imean", `\\langle i_{o}\\rangle=${texNumber(result.iChMean)}\\,\\mathrm{A}`);
      setInfoMath("info-thy-irms", `I_{o,eff}=${texNumber(result.iChRms)}\\,\\mathrm{A}`);
      setInfoMath("info-thy-power", `P_{o}=${texNumber(result.pCh)}\\,\\mathrm{W}`);
      setInfoMath("info-thy-pf", `\\mathrm{FP}_{in}=${texNumber(result.powerFactor)}`);
      setInfoMath("info-thy-thd", `\\mathrm{THD}_{i}=${texNumber(result.thdI)}\\,\\%`);
    },
    theoryHtml(language) {
      const t = (value) => localizeText(value, language);
      const comparison = (rows) => `<div class="comparison-grid">${rows.map(([label, id]) => `<span>${label}</span><strong id="${id}"></strong>`).join("")}</div>`;
      return `<section><h3>${t(i18n.characteristic)} · <span id="theory-thy-montage"></span></h3>
<div class="approximation-formula math" id="theory-thy-law"></div>
<div class="approximation-formula math" id="theory-thy-power-law"></div>
${comparison([[t(i18n.firingAngle), "theory-thy-alpha"], [t(i18n.firingDelay), "theory-thy-delay"]])}</section>
<section class="approximation-section"><h3>${t(i18n.analyticalModel)}</h3>
${comparison([[t(i18n.meanVoltage), "theory-thy-vmean"], [t(i18n.rmsVoltageAxis), "theory-thy-vrms"], [t(i18n.analytical), "theory-thy-vmodel"], [t(i18n.relativeGap), "theory-thy-verror"], [t(i18n.powerFactor), "theory-thy-pf"], [t(i18n.currentThd), "theory-thy-thd"]])}
<p>${t(i18n.theoryNote)}</p></section>`;
    },
    theoryValuesFor(result, _state, helpers) {
      const { setText, number, displayVoltage, relativeError } = helpers;
      setText("theory-thy-montage", localizeText(result.montage === "triac" ? i18n.triacName : i18n.singleName, helpers.language));
      const lawElement = document.querySelector("#theory-thy-law");
      if (lawElement && window.katex) window.katex.render(`\\displaystyle ${analyticalRmsTex(result.montage)}`, lawElement, { throwOnError: false });
      const powerLawElement = document.querySelector("#theory-thy-power-law");
      if (powerLawElement && window.katex) window.katex.render("\\displaystyle P_{o}=\\dfrac{V_{o,\\mathrm{eff}}^2}{R}", powerLawElement, { throwOnError: false });
      setText("theory-thy-alpha", `${number.format(result.alphaDegrees)}°`);
      setText("theory-thy-delay", `${number.format(result.firingDelay * 1000)} ms`);
      setText("theory-thy-vmean", displayVoltage(result.vChMean));
      setText("theory-thy-vrms", displayVoltage(result.vChRms));
      setText("theory-thy-vmodel", displayVoltage(result.analyticalRms));
      setText("theory-thy-verror", `${number.format(relativeError(result.analyticalRms, result.vChRms))} %`);
      setText("theory-thy-pf", number.format(result.powerFactor));
      setText("theory-thy-thd", `${number.format(result.thdI)} %`);
    },
  };

  window.converterModels = window.converterModels || {};
  window.converterModels.thyristor = model;
})();
