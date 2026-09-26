(() => {
  "use strict";

  const text = (en, fr, es) => Object.freeze({ en, fr, es });
  const periodicMean = (points, key) => {
    if (points.length < 2) return 0;
    let sum = (points[0][key] + points.at(-1)[key]) / 2;
    for (let index = 1; index < points.length - 1; index += 1) sum += points[index][key];
    return sum / (points.length - 1);
  };

  const model = {
    id: "buck",
    defaults: { frequency: 50000, duty: 50, inductance: 5, capacitance: 20, inputVoltage: 24, resistance: 10 },
    controls: {
      top: [
        { key: "frequency", symbol: "f<sub>s</sub>", label: text("Frequency", "Fréquence", "Frecuencia"), aria: text("Switching frequency", "Fréquence de découpage", "Frecuencia de conmutación"), min: 10000, max: 200000, step: 5000, scale: 0.001, unit: "kHz" },
        { key: "duty", symbol: "α", label: text("Duty cycle α", "Rapport cyclique α", "Ciclo de trabajo α"), aria: text("Duty cycle alpha", "Rapport cyclique alpha", "Ciclo de trabajo alfa"), min: 10, max: 90, step: 2, unit: "%" },
        { key: "inputVoltage", symbol: "V<sub>in</sub>", label: text("Input voltage", "Tension d’entrée", "Tensión de entrada"), aria: text("Input voltage", "Tension d’entrée", "Tensión de entrada"), min: 6, max: 48, step: 2, unit: "V", advanced: true },
      ],
      bottom: [
        { key: "inductance", symbol: "L", label: text("Inductance", "Inductance", "Inductancia"), aria: text("Inductance", "Inductance", "Inductancia"), min: 0.5, max: 15, step: 0.5, unit: "µH" },
        { key: "capacitance", symbol: "C", label: text("Capacitance", "Capacité", "Capacitancia"), aria: text("Capacitance", "Capacité", "Capacitancia"), min: 2, max: 100, step: 2, unit: "µF" },
        { key: "resistance", symbol: "R", label: text("Load", "Charge", "Carga"), aria: text("Load resistance", "Résistance de charge", "Resistencia de carga"), min: 1, max: 20, step: 1, unit: "Ω", advanced: true },
      ],
    },
    diagram: { type: "svg", aria: text("Buck converter diagram", "Schéma du convertisseur buck", "Esquema del convertidor buck") },
    diagrams: {
      synchronous: "assets/buck.svg",
      diode: "assets/buck_with_diode.svg",
    },
    plots: {
      main: [
        { key: "vin", label: "V<sub>in</sub>", color: "--trace-vin", dash: [8, 5] },
        { key: "vx", label: "v<sub>x</sub>", color: "--trace-vx", step: true },
        { key: "vr", label: "v<sub>o</sub>", color: "--trace-vr", width: 3 },
      ],
      second: [{ key: "vL", label: "v<sub>L</sub>", color: "--trace-vl" }],
      third: [
        { key: "iL", label: "i<sub>L</sub>", color: "--trace-il" },
        { key: "iC", label: "i<sub>C</sub>", color: "--trace-ic", dash: [7, 4] },
        { key: "iOut", label: "i<sub>o</sub>", color: "--trace-iout" },
      ],
    },
    plotsFor(commutation = "synchronous") {
      if (commutation !== "diode") return this.plots;
      return {
        main: this.plots.main,
        second: [...this.plots.second, { key: "vD", label: "v<sub>D</sub>", color: "--trace-vd", dash: [7, 4] }],
        third: [...this.plots.third, { key: "iD", label: "i<sub>D</sub>", color: "--trace-id", dash: [4, 4] }],
      };
    },
    calculate(state, commutation = "synchronous") {
      if (commutation === "diode") return this.calculateDiode(state);
      const l = state.inductance / 1_000_000;
      const c = state.capacitance / 1_000_000;
      const d = state.duty / 100;
      const inputVoltage = state.inputVoltage;
      const resistance = state.resistance;
      const resonance = 1 / (2 * Math.PI * Math.sqrt(l * c));
      const duration = 4 / state.frequency;
      const samples = 900;
      const harmonics = 120;
      const points = [];

      for (let sample = 0; sample < samples; sample += 1) {
        const t = sample / (samples - 1) * duration;
        const phaseInCycle = (t * state.frequency) % 1;
        const vx = phaseInCycle < d ? inputVoltage : 0;
        let vr = inputVoltage * d;
        let iL = inputVoltage * d / resistance;

        for (let harmonic = 1; harmonic <= harmonics; harmonic += 1) {
          const omega = 2 * Math.PI * harmonic * state.frequency;
          const pwmCoefficient = 2 * Math.sin(Math.PI * harmonic * d) / (Math.PI * harmonic);
          const real = 1 - l * c * omega * omega;
          const imaginary = l / resistance * omega;
          const filterMagnitude = 1 / Math.sqrt(real * real + imaginary * imaginary);
          const filterPhase = -Math.atan2(imaginary, real);
          const basePhase = omega * t - Math.PI * harmonic * d;
          vr += inputVoltage * pwmCoefficient * filterMagnitude * Math.cos(basePhase + filterPhase);

          const admittanceMagnitude = Math.hypot(1 / resistance, omega * c);
          const admittancePhase = Math.atan2(omega * c, 1 / resistance);
          iL += inputVoltage * pwmCoefficient * filterMagnitude * admittanceMagnitude *
            Math.cos(basePhase + filterPhase + admittancePhase);
        }

        const iOut = vr / resistance;
        const iC = iL - iOut;
        points.push({ t, vin: inputVoltage, vx, vr, vL: vx - vr, iL, iC, iOut });
      }

      const output = points.map((point) => point.vr);
      const inductorCurrent = points.map((point) => point.iL);
      const currentMin = Math.min(...inductorCurrent);
      const currentMax = Math.max(...inductorCurrent);
      const outputMean = inputVoltage * d;
      const currentRippleApprox = (inputVoltage - outputMean) * d / (l * state.frequency);
      const voltageRippleApprox = currentRippleApprox / (8 * c * state.frequency);
      return {
        points,
        resonance,
        ratio: state.frequency / resonance,
        duration,
        mean: outputMean,
        ripple: Math.max(...output) - Math.min(...output),
        currentMean: inputVoltage * d / resistance,
        currentMin,
        currentMax,
        currentRipple: currentMax - currentMin,
        currentRippleApprox,
        voltageRippleApprox,
        voltageBalance: periodicMean(points, "vL"),
        currentBalance: periodicMean(points, "iC"),
        commutation: "synchronous",
      };
    },
    calculateDiode(state) {
      const l = state.inductance / 1_000_000;
      const c = state.capacitance / 1_000_000;
      const d = state.duty / 100;
      const vin = state.inputVoltage;
      const r = state.resistance;
      const fs = state.frequency;
      const period = 1 / fs;
      const resonance = 1 / (2 * Math.PI * Math.sqrt(l * c));
      const stepsPerCycle = Math.min(1500, Math.ceil(Math.max(250, 40 * resonance / fs) / 50) * 50);
      const step = period / stepsPerCycle;
      let iL = Math.max(0, vin * d / r);
      let vo = vin * d;

      const discharge = (dt) => { vo *= Math.exp(-dt / (r * c)); };
      const conduct = (vx, dt) => {
        const nextCurrent = iL + (vx - vo) / l * dt;
        vo += (nextCurrent - vo / r) / c * dt;
        iL = nextCurrent;
      };
      const advance = (phase, dt) => {
        if (phase < d) {
          if (iL <= 1e-12 && vin <= vo) {
            iL = 0;
            discharge(dt);
            return;
          }
          const nextCurrent = iL + (vin - vo) / l * dt;
          if (nextCurrent > 0 || vin >= vo) {
            conduct(vin, dt);
            return;
          }
          const timeToZero = Math.min(dt, iL * l / Math.max(vo - vin, 1e-12));
          conduct(vin, timeToZero);
          iL = 0;
          discharge(dt - timeToZero);
          return;
        }
        if (iL <= 1e-12) {
          iL = 0;
          discharge(dt);
          return;
        }
        const nextCurrent = iL - vo / l * dt;
        if (nextCurrent > 0 || vo <= 0) {
          conduct(0, dt);
          return;
        }
        const timeToZero = Math.min(dt, iL * l / Math.max(vo, 1e-12));
        conduct(0, timeToZero);
        iL = 0;
        discharge(dt - timeToZero);
      };

      for (let cycle = 0; cycle < 2000; cycle += 1) {
        const startCurrent = iL;
        const startVoltage = vo;
        for (let index = 0; index < stepsPerCycle; index += 1) advance(index / stepsPerCycle, step);
        const error = Math.max(
          Math.abs(iL - startCurrent) / Math.max(Math.abs(iL), 1),
          Math.abs(vo - startVoltage) / Math.max(Math.abs(vo), 1),
        );
        if (cycle > 30 && error < 1e-9) break;
      }

      const duration = 4 / fs;
      const samples = stepsPerCycle * 4 + 1;
      const points = [];
      for (let sample = 0; sample < samples; sample += 1) {
        const t = sample * step;
        const phase = (sample % stepsPerCycle) / stepsPerCycle;
        const on = phase < d;
        const sourceConducting = on && (iL > 1e-9 || vin > vo);
        const diodeConducting = !on && iL > 1e-9;
        const vx = sourceConducting ? vin : diodeConducting ? 0 : vo;
        const iOut = vo / r;
        points.push({
          t,
          vin,
          vx,
          vr: vo,
          vL: vx - vo,
          vD: -vx,
          iL,
          iC: iL - iOut,
          iOut,
          iD: diodeConducting ? iL : 0,
        });
        if (sample < samples - 1) advance(phase, step);
      }

      const output = points.map((point) => point.vr);
      const inductorCurrent = points.map((point) => point.iL);
      const currentMin = Math.min(...inductorCurrent);
      const currentMax = Math.max(...inductorCurrent);
      const outputMean = periodicMean(points, "vr");
      const currentRippleApprox = Math.max(0, (vin - outputMean) * d / (l * fs));
      const voltageRippleApprox = currentRippleApprox / (8 * c * fs);
      const criticalInductance = (1 - d) * r / (2 * fs);
      return {
        points,
        resonance,
        ratio: fs / resonance,
        duration,
        mean: outputMean,
        ripple: Math.max(...output) - Math.min(...output),
        mode: currentMin <= 1e-4 ? "DCM" : "CCM",
        criticalInductance,
        currentMean: periodicMean(points, "iL"),
        currentMin,
        currentMax,
        currentRipple: currentMax - currentMin,
        currentRippleApprox,
        voltageRippleApprox,
        voltageBalance: periodicMean(points, "vL"),
        currentBalance: periodicMean(points, "iC"),
        commutation: "diode",
      };
    },
  };

  window.converterModels = window.converterModels || {};
  window.converterModels.buck = Object.freeze(model);
})();
