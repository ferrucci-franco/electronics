(() => {
  "use strict";

  const text = (en, fr, es) => Object.freeze({ en, fr, es });
  const mean = (points, key) => points.reduce((sum, point) => sum + point[key], 0) / points.length;

  const model = {
    id: "boost",
    defaults: { frequency: 50000, duty: 50, inductance: 100, capacitance: 100, inputVoltage: 24, resistance: 20 },
    controls: {
      top: [
        { key: "frequency", symbol: "f<sub>s</sub>", label: text("Frequency", "Fréquence", "Frecuencia"), aria: text("Switching frequency", "Fréquence de découpage", "Frecuencia de conmutación"), min: 20000, max: 200000, step: 5000, scale: 0.001, unit: "kHz" },
        { key: "duty", symbol: "α", label: text("Duty cycle α", "Rapport cyclique α", "Ciclo de trabajo α"), aria: text("Duty cycle alpha", "Rapport cyclique alpha", "Ciclo de trabajo alfa"), min: 10, max: 80, step: 2, unit: "%" },
        { key: "inputVoltage", symbol: "V<sub>in</sub>", label: text("Input voltage", "Tension d’entrée", "Tensión de entrada"), aria: text("Input voltage", "Tension d’entrée", "Tensión de entrada"), min: 6, max: 48, step: 2, unit: "V", advanced: true },
      ],
      bottom: [
        { key: "inductance", symbol: "L", label: text("Inductance", "Inductance", "Inductancia"), aria: text("Inductance", "Inductance", "Inductancia"), min: 20, max: 500, step: 20, unit: "µH" },
        { key: "capacitance", symbol: "C", label: text("Capacitance", "Capacité", "Capacitancia"), aria: text("Capacitance", "Capacité", "Capacitancia"), min: 10, max: 470, step: 10, unit: "µF" },
        { key: "resistance", symbol: "R", label: text("Load", "Charge", "Carga"), aria: text("Load resistance", "Résistance de charge", "Resistencia de carga"), min: 5, max: 100, step: 5, unit: "Ω", advanced: true },
      ],
    },
    diagram: { type: "svg", aria: text("Boost converter diagram", "Schéma du convertisseur boost", "Esquema del convertidor boost") },
    diagrams: {
      synchronous: "assets/boost.svg",
      diode: "assets/boost_with_diode.svg",
    },
    plots: {
      main: [
        { key: "vin", label: "V<sub>in</sub>", color: "--trace-vin", dash: [8, 5] },
        { key: "vSwitch", label: "v<sub>x</sub>", color: "--trace-vx", step: true },
        { key: "vo", label: "v<sub>o</sub>", color: "--trace-vr", width: 3 },
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
      const l = state.inductance / 1_000_000;
      const c = state.capacitance / 1_000_000;
      const d = state.duty / 100;
      const vin = state.inputVoltage;
      const r = state.resistance;
      const fs = state.frequency;
      const period = 1 / fs;
      const stepsPerCycle = 250;
      const step = period / stepsPerCycle;
      const diodeMode = commutation === "diode";
      let iL = vin / (r * (1 - d) ** 2);
      let vo = vin / (1 - d);

      const discharge = (dt) => { vo *= Math.exp(-dt / (r * c)); };
      const conductToOutput = (dt) => {
        const nextCurrent = iL + (vin - vo) / l * dt;
        vo += (nextCurrent - vo / r) / c * dt;
        iL = nextCurrent;
      };
      const advance = (phase, dt) => {
        const on = phase < d;
        if (on) {
          iL += vin / l * dt;
          discharge(dt);
        } else if (!diodeMode) {
          conductToOutput(dt);
        } else if (iL > 0 || vin > vo) {
          const nextCurrent = iL + (vin - vo) / l * dt;
          if (nextCurrent <= 0) {
            const timeToZero = Math.min(dt, iL * l / Math.max(vo - vin, 1e-12));
            conductToOutput(timeToZero);
            iL = 0;
            discharge(dt - timeToZero);
          } else {
            conductToOutput(dt);
          }
        } else {
          iL = 0;
          discharge(dt);
        }
        vo = Math.max(0, vo);
      };

      for (let cycle = 0; cycle < 2000; cycle += 1) {
        const startCurrent = iL;
        const startVoltage = vo;
        for (let index = 0; index < stepsPerCycle; index += 1) advance(index / stepsPerCycle, step);
        const error = Math.max(Math.abs(iL - startCurrent) / Math.max(Math.abs(iL), 1),
          Math.abs(vo - startVoltage) / Math.max(Math.abs(vo), 1));
        if (cycle > 30 && error < 1e-8) break;
      }

      const duration = 4 / fs;
      const samples = stepsPerCycle * 4 + 1;
      const points = [];
      for (let sample = 0; sample < samples; sample += 1) {
        const t = sample * step;
        const phase = (sample % stepsPerCycle) / stepsPerCycle;
        const on = phase < d;
        const outputPathConducting = !on && (!diodeMode || iL > 1e-9);
        const diodeCurrent = diodeMode && outputPathConducting ? iL : 0;
        const iOut = vo / r;
        const vSwitch = on ? 0 : outputPathConducting ? vo : vin;
        points.push({
          t,
          vin,
          vSwitch,
          vo,
          vL: vin - vSwitch,
          vD: vSwitch - vo,
          iL,
          iC: (outputPathConducting ? iL : 0) - iOut,
          iOut,
          iD: diodeCurrent,
        });
        if (sample < samples - 1) advance(phase, step);
      }

      const outputValues = points.map((point) => point.vo);
      const currentValues = points.map((point) => point.iL);
      const currentMin = Math.min(...currentValues);
      const currentMax = Math.max(...currentValues);
      const outputMean = mean(points, "vo");
      const idealGain = 1 / (1 - d);
      const currentRippleApprox = vin * d / (l * fs);
      const voltageRippleApprox = outputMean * d / (r * c * fs);
      const criticalInductance = d * (1 - d) ** 2 * r / (2 * fs);
      return {
        points,
        duration,
        mean: outputMean,
        ripple: Math.max(...outputValues) - Math.min(...outputValues),
        gain: outputMean / vin,
        idealGain,
        mode: diodeMode ? (currentMin <= 1e-4 ? "DCM" : "CCM") : "SYNC",
        criticalInductance,
        currentMean: mean(points, "iL"),
        currentMin,
        currentMax,
        currentRipple: currentMax - currentMin,
        currentRippleApprox,
        voltageRippleApprox,
        voltageBalance: mean(points, "vL"),
        currentBalance: mean(points, "iC"),
        commutation: diodeMode ? "diode" : "synchronous",
      };
    },
  };

  window.converterModels = window.converterModels || {};
  window.converterModels.boost = Object.freeze(model);
})();
