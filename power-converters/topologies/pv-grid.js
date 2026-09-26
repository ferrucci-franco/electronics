(() => {
  "use strict";

  const text = (en, fr, es) => Object.freeze({ en, fr, es });
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const mean = (points, key) => points.reduce((sum, point) => sum + point[key], 0) / Math.max(points.length, 1);
  const rms = (points, key) => Math.sqrt(points.reduce((sum, point) => sum + point[key] ** 2, 0) / Math.max(points.length, 1));
  const triangle = (time, frequency) => { const phase = (time * frequency) % 1; return phase < .5 ? -1 + 4 * phase : 3 - 4 * phase; };
  const harmonic = (points, key, frequency) => {
    let sine = 0; let cosine = 0;
    points.forEach((point) => { sine += point[key] * Math.sin(2 * Math.PI * frequency * point.t); cosine += point[key] * Math.cos(2 * Math.PI * frequency * point.t); });
    return { rms: Math.SQRT2 * Math.hypot(sine, cosine) / Math.max(points.length, 1), phase: Math.atan2(cosine, sine) };
  };
  const thdOf = (points, key, frequency) => {
    const fundamental = harmonic(points, key, frequency).rms; const dc = mean(points, key); const totalAc2 = Math.max(0, rms(points, key) ** 2 - dc ** 2);
    return fundamental > 1e-9 ? Math.sqrt(Math.max(0, totalAc2 - fundamental ** 2)) / fundamental * 100 : 0;
  };

  // ------------------------------------------------------------------ i18n --
  const locales = { en: "en-US", fr: "fr-FR", es: "es-ES" };
  const dict = {
    en: {
      curvesTitle: "PV characteristics I–V · P–V", mppt: "MPPT", manual: "Manual", clouds: "Clouds", playDay: "Play the day", pause: "Pause",
      east: "East", west: "West", boostBox: "boost", bridgeBox: "H-bridge", gridBox: "grid", modules: "modules", kwc: "kWp",
      sunlight: "Sunlight", pvArray: "PV array", boostCol: "Boost · MPPT", gridCol: "Grid injection",
      pvPower: "PV power", acPower: "Injected power", gridCurrent: "Grid current (RMS)", vpvOp: "PV voltage", busRipple: "DC-bus ripple", thdI: "Current THD",
      pvModelTitle: "PV panel model", chainTitle: "Conversion chain", operatingPoint: "Operating point", openCircuit: "Open-circuit voltage", shortCircuit: "Short-circuit current", mppLabel: "Maximum power point",
      dutyLabel: "Boost duty cycle", simulation: "Simulation", approximation: "Approximation", relativeError: "Relative error", conversionEff: "P<sub>ac</sub> / P<sub>pv</sub>",
      pvNote: "Explicit single-diode model: the photocurrent scales with irradiance, the diode saturation current sets the temperature dependence of V<sub>oc</sub>, and the cell heats above ambient following the NOCT law.",
      chainNote: "The boost duty cycle pins the PV voltage to the selected operating point on the I–V curve. The H-bridge (unipolar PWM, 10 kHz) injects a sinusoidal current in phase with the grid; the 100 Hz power pulsation of a single-phase link explains the DC-bus voltage ripple. The displayed bus currents are averaged over the switching period: the instantaneous currents through the switches and diodes are chopped at the switching frequency.",
      sceneAria: "Interactive solar scene: drag the sun along its path, drag the clouds, and watch the PV array feed the grid.",
      curvesAria: "PV array characteristics. In manual mode, drag the operating point along the curve.",
      night: "night", wpm2: "W/m²",
    },
    fr: {
      curvesTitle: "Caractéristiques PV I–V · P–V", mppt: "MPPT", manual: "Manuel", clouds: "Nuages", playDay: "Faire défiler la journée", pause: "Pause",
      east: "Est", west: "Ouest", boostBox: "boost", bridgeBox: "pont en H", gridBox: "réseau", modules: "modules", kwc: "kWc",
      sunlight: "Ensoleillement", pvArray: "Champ PV", boostCol: "Boost · MPPT", gridCol: "Injection réseau",
      pvPower: "Puissance PV", acPower: "Puissance injectée", gridCurrent: "Courant réseau (eff.)", vpvOp: "Tension PV", busRipple: "Ondulation du bus", thdI: "THD du courant",
      pvModelTitle: "Modèle du panneau PV", chainTitle: "Chaîne de conversion", operatingPoint: "Point de fonctionnement", openCircuit: "Tension à vide", shortCircuit: "Courant de court-circuit", mppLabel: "Point de puissance maximale",
      dutyLabel: "Rapport cyclique du boost", simulation: "Simulation", approximation: "Approximation", relativeError: "Écart relatif", conversionEff: "P<sub>ac</sub> / P<sub>pv</sub>",
      pvNote: "Modèle à une diode explicite : le photocourant est proportionnel à l’éclairement, le courant de saturation de la diode fixe la dépendance de V<sub>oc</sub> à la température, et la cellule s’échauffe au-dessus de l’ambiante selon la loi NOCT.",
      chainNote: "Le rapport cyclique du boost impose la tension du champ PV, donc le point de fonctionnement sur la courbe I–V. Le pont en H (PWM unipolaire, 10 kHz) injecte un courant sinusoïdal en phase avec le réseau ; la pulsation de puissance à 100 Hz d’une liaison monophasée explique l’ondulation de la tension du bus continu. Les courants du bus affichés sont moyennés sur la période de découpage : les courants instantanés traversant interrupteurs et diodes sont hachés à la fréquence de commutation.",
      sceneAria: "Scène solaire interactive : faites glisser le soleil sur sa trajectoire, déplacez les nuages et observez le champ PV alimenter le réseau.",
      curvesAria: "Caractéristiques du champ PV. En mode manuel, faites glisser le point de fonctionnement le long de la courbe.",
      night: "nuit", wpm2: "W/m²",
    },
    es: {
      curvesTitle: "Características PV I–V · P–V", mppt: "MPPT", manual: "Manual", clouds: "Nubes", playDay: "Reproducir el día", pause: "Pausa",
      east: "Este", west: "Oeste", boostBox: "boost", bridgeBox: "puente H", gridBox: "red", modules: "módulos", kwc: "kWp",
      sunlight: "Irradiancia", pvArray: "Campo PV", boostCol: "Boost · MPPT", gridCol: "Inyección a red",
      pvPower: "Potencia PV", acPower: "Potencia inyectada", gridCurrent: "Corriente de red (ef.)", vpvOp: "Tensión PV", busRipple: "Rizado del bus", thdI: "THD de corriente",
      pvModelTitle: "Modelo del panel PV", chainTitle: "Cadena de conversión", operatingPoint: "Punto de operación", openCircuit: "Tensión de circuito abierto", shortCircuit: "Corriente de cortocircuito", mppLabel: "Punto de máxima potencia",
      dutyLabel: "Ciclo de trabajo del boost", simulation: "Simulación", approximation: "Aproximación", relativeError: "Error relativo", conversionEff: "P<sub>ac</sub> / P<sub>pv</sub>",
      pvNote: "Modelo explícito de un diodo: la fotocorriente es proporcional a la irradiancia, la corriente de saturación del diodo fija la dependencia de V<sub>oc</sub> con la temperatura y la celda se calienta sobre la ambiente según la ley NOCT.",
      chainNote: "El ciclo de trabajo del boost impone la tensión del campo PV, es decir, el punto de operación sobre la curva I–V. El puente H (PWM unipolar, 10 kHz) inyecta una corriente senoidal en fase con la red; la pulsación de potencia a 100 Hz de un enlace monofásico explica el rizado de tensión del bus continuo. Las corrientes del bus mostradas están promediadas sobre el período de conmutación: las corrientes instantáneas por interruptores y diodos son troceadas a la frecuencia de conmutación.",
      sceneAria: "Escena solar interactiva: arrastre el sol por su trayectoria, mueva las nubes y observe el campo PV alimentar la red.",
      curvesAria: "Características del campo PV. En modo manual, arrastre el punto de operación a lo largo de la curva.",
      night: "noche", wpm2: "W/m²",
    },
  };
  const lang = () => (dict[document.documentElement.lang] ? document.documentElement.lang : "fr");
  const t = (key) => dict[lang()][key];
  const fmt = (digits = 2) => new Intl.NumberFormat(locales[lang()], { maximumFractionDigits: digits });

  // ------------------------------------------------- PV module & irradiance --
  const MODULE = { voc: 49.2, isc: 10.9, cells: 72, ideality: 1.25, alphaIsc: .0005, betaVoc: -.0028, noct: 45 };
  const K_BOLTZ_Q = 8.617e-5;

  function pvParams(irradiance, cellTemp) {
    const kelvin = cellTemp + 273.15;
    const nVt = MODULE.ideality * MODULE.cells * K_BOLTZ_Q * kelvin;
    const dT = cellTemp - 25;
    const iphStc = MODULE.isc * (1 + MODULE.alphaIsc * dT);
    const iph = iphStc * Math.max(irradiance, 0) / 1000;
    const vocT = Math.max(1, MODULE.voc * (1 + MODULE.betaVoc * dT));
    const i0 = iphStc / Math.expm1(vocT / nVt);
    return { iph, i0, nVt };
  }
  function makeArray(irradiance, cellTemp, seriesCount, parallelCount) {
    const pars = pvParams(irradiance, cellTemp);
    const current = (voltage) => {
      const perModule = voltage / seriesCount;
      const diode = pars.i0 * Math.expm1(Math.min(perModule / pars.nVt, 60));
      return Math.max(parallelCount * (pars.iph - diode), -1);
    };
    const voc = pars.iph > 1e-7 ? seriesCount * pars.nVt * Math.log(pars.iph / pars.i0 + 1) : 0;
    return { current, voc, isc: parallelCount * pars.iph };
  }
  function sampleCurve(array, vocLimit, samples = 170) {
    const points = [];
    const top = Math.max(vocLimit, 1e-3);
    for (let index = 0; index <= samples; index += 1) {
      const v = top * index / samples;
      const i = Math.max(array.current(v), 0);
      points.push({ v, i, p: v * i });
    }
    return points;
  }
  function findMpp(array) {
    if (array.voc < .5) return { v: 0, i: 0, p: 0 };
    let best = { v: 0, i: 0, p: 0 };
    for (let index = 0; index <= 240; index += 1) {
      const v = array.voc * index / 240;
      const i = array.current(v);
      const p = v * i;
      if (p > best.p) best = { v, i, p };
    }
    return best;
  }

  // ----------------------------------------------------------- scene state --
  const sceneDefaults = () => ({ u: .34, cloudiness: .12, cloudShift: [0, 0, 0], mppt: true, manualV: null, playing: false });
  let scene = sceneDefaults();
  let requestUpdate = null;
  let lastResult = null;
  let lastState = null;

  // Scene geometry (SVG viewBox 1000 × 520, horizon at y = 400).
  const HORIZON = 400;
  const PANEL = { x: 540, y: 315 };
  const CLOUD_BASES = [{ x: 250, y: 122, s: 1.45 }, { x: 520, y: 86, s: 1.85 }, { x: 770, y: 138, s: 1.2 }];
  const sunPos = (u) => ({ x: 900 - 790 * u, y: HORIZON - 330 * Math.sin(Math.PI * u) });

  function cloudInfo(index) {
    const base = CLOUD_BASES[index];
    const c = scene.cloudiness;
    const scale = base.s * (.72 + .58 * c);
    const opacity = clamp((c - index * .1) * 5, 0, 1) * (.4 + .6 * c);
    return { x: clamp(base.x + scene.cloudShift[index], 60, 940), y: base.y, scale, opacity, radius: 62 * scale };
  }
  function occlusionFactor() {
    const sun = sunPos(scene.u);
    let total = 0;
    for (let index = 0; index < CLOUD_BASES.length; index += 1) {
      const cloud = cloudInfo(index);
      if (cloud.opacity < .05) continue;
      const dx = PANEL.x - sun.x; const dy = PANEL.y - sun.y;
      const length2 = dx * dx + dy * dy;
      const along = length2 > 1e-6 ? clamp(((cloud.x - sun.x) * dx + (cloud.y - sun.y) * dy) / length2, 0, 1) : 0;
      const px = sun.x + along * dx; const py = sun.y + along * dy;
      const distance = Math.hypot(cloud.x - px, cloud.y - py);
      total += clamp(1 - distance / (cloud.radius + 34), 0, 1) * clamp(cloud.opacity * 1.3, 0, 1);
    }
    return clamp(total, 0, 1);
  }
  function computeEnvironment(state) {
    const u = scene.u;
    const cloudiness = scene.cloudiness;
    const tilt = (state?.tiltAngle ?? 30) * Math.PI / 180;
    const elevation = 62 * Math.PI / 180 * Math.sin(Math.PI * u);
    const sinElevation = Math.max(Math.sin(elevation), 0);
    const airMass = 1 / Math.max(sinElevation, .075);
    const gNormal = 1361 * Math.pow(.7, Math.pow(airMass, .678));
    const theta = Math.PI * u;
    const incidence = Math.max(0, Math.cos(theta - (Math.PI / 2 - tilt)));
    const occlusion = occlusionFactor();
    const shade = clamp(.8 * cloudiness + occlusion, 0, 1);
    const attenuatedNormal = gNormal * (1 - .92 * shade);
    const beam = attenuatedNormal * incidence;
    const diffuse = 105 * Math.pow(sinElevation, .6) * (1 - .55 * cloudiness) + 55 * cloudiness * sinElevation;
    const irradiance = Math.max(0, beam + diffuse);
    const horizontal = Math.max(0, attenuatedNormal * Math.max(Math.sin(theta), 0) + diffuse);
    const ambient = state?.ambientTemp ?? 25;
    const cellTemp = ambient + (MODULE.noct - 20) / 800 * irradiance;
    return { g: irradiance, ghi: horizontal, dni: Math.max(0, attenuatedNormal), tc: cellTemp, ambient, elevation, incidence, shade, beamShare: clamp(incidence * (1 - .92 * shade) * clamp(gNormal / 750, 0, 1), 0, 1) };
  }

  // ------------------------------------------------------ chain simulation --
  function simulateChain(state, operating, array) {
    const gridRms = 230; const gridFrequency = 50; const omega = 2 * Math.PI * gridFrequency;
    const fsBoost = clamp(state.boostFrequency || 20000, 8000, 40000); const fsInverter = 10000;
    const boostInductance = 2.5e-3; const boostResistance = .25; const pvCapacitance = 200e-6;
    const gridInductance = 4e-3; const gridResistance = .3;
    const busCapacitance = (state.busCapacitance || 1500) / 1e6;
    const busReference = state.dcVoltage || 400;
    const duty = clamp(1 - operating.v / busReference, .02, .97);
    const standby = operating.p < 5;
    const targetPower = standby ? 0 : operating.p;
    const busGain = .25; const currentGain = 25; const filterTau = .02;
    const dt = 1 / (fsBoost * 24);
    const settle = .06; const window = .04;

    let vPv = operating.v; let iL = operating.i; let vDc = busReference; let iG = 0; let vDcFiltered = busReference;
    // Moyenne glissante du courant que le boost fournit au bus.
    const busTau = 6e-4;
    let busInFiltered = (1 - duty) * operating.i;
    const stepOnce = (time, record) => {
      const iAmp = standby ? 0 : clamp(targetPower / gridRms + busGain * (vDcFiltered - busReference), 0, 120);
      const sinWt = Math.sin(omega * time); const cosWt = Math.cos(omega * time);
      const gridVoltage = Math.SQRT2 * gridRms * sinWt;
      const reference = Math.SQRT2 * iAmp * sinWt;
      const command = clamp(gridVoltage + gridResistance * reference + gridInductance * omega * Math.SQRT2 * iAmp * cosWt + currentGain * (reference - iG), -vDc, vDc);
      const carrier = triangle(time, fsInverter);
      const normalized = vDc > 1 ? command / vDc : 0;
      const bridgeState = (normalized >= carrier ? 1 : 0) - (-normalized >= carrier ? 1 : 0);
      // Fraction of this step spent with the boost switch open (exact sub-step switching
      // avoids quantizing the duty cycle to the integration grid).
      const phase0 = (time * fsBoost) % 1;
      const stepPhase = dt * fsBoost;
      const offShare = phase0 >= duty ? 1 : phase0 + stepPhase <= duty ? 0 : (phase0 + stepPhase - duty) / stepPhase;
      const iPv = array.current(vPv);
      iL += dt * (vPv - boostResistance * iL - offShare * vDc) / boostInductance;
      iG += dt * (bridgeState * vDc - gridVoltage - gridResistance * iG) / gridInductance;
      vPv = clamp(vPv + dt * (iPv - iL) / pvCapacitance, 0, busReference * 1.05);
      vDc = Math.max(1, vDc + dt * (offShare * iL - bridgeState * iG) / busCapacitance);
      vDcFiltered += dt / filterTau * (vDc - vDcFiltered);
      busInFiltered += dt / busTau * (offShare * iL - busInFiltered);
      if (record) record({ t: time - settle, vGrid: gridVoltage, iGrid: iG, iRef: reference, vPv, vDc, iL, iPv, iBusIn: busInFiltered, iBusInRaw: offShare * iL });
    };
    const settleSteps = Math.round(settle / dt);
    for (let index = 0; index < settleSteps; index += 1) stepOnce(index * dt, null);
    const totalSteps = Math.round(window / dt);
    const points = [];
    for (let index = 0; index <= totalSteps; index += 1) stepOnce(settle + index * dt, (point) => points.push(point));

    const pvPower = points.reduce((sum, point) => sum + point.vPv * point.iPv, 0) / points.length;
    const activePower = points.reduce((sum, point) => sum + point.vGrid * point.iGrid, 0) / points.length;
    const currentFundamental = harmonic(points, "iGrid", gridFrequency);
    const voltageFundamental = harmonic(points, "vGrid", gridFrequency);
    const currentRms = rms(points, "iGrid");
    const apparent = gridRms * currentRms;
    const vDcValues = points.map((point) => point.vDc);
    const vDcMean = mean(points, "vDc");
    const vPvMean = mean(points, "vPv");
    const rippleSlice = points.filter((point) => point.t >= .0199 && point.t <= .0199 + 3 / fsBoost);
    const iLValues = rippleSlice.map((point) => point.iL);
    return {
      points, duration: window, duty, standby,
      pvPower, activePower,
      reactivePower: gridRms * currentFundamental.rms * Math.sin(currentFundamental.phase - voltageFundamental.phase),
      powerFactor: apparent > 1e-9 ? Math.abs(activePower) / apparent : 0,
      currentRms, currentThd: thdOf(points, "iGrid", gridFrequency),
      trackingErrorRms: Math.sqrt(points.reduce((sum, point) => sum + (point.iGrid - point.iRef) ** 2, 0) / points.length),
      vDcMean, vDcRipple: Math.max(...vDcValues) - Math.min(...vDcValues),
      vPvMean,
      iLMean: mean(points, "iL"),
      iLRipple: iLValues.length ? Math.max(...iLValues) - Math.min(...iLValues) : 0,
      busRippleApprox: Math.abs(activePower) / (omega * busCapacitance * Math.max(vDcMean, 1)),
      iLRippleApprox: mean(points, "vPv") * duty / (boostInductance * fsBoost),
      busReference,
    };
  }

  // ------------------------------------------------------------ scene SVG --
  const el = {};
  const lerpColor = (from, to, k) => {
    const parse = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    const [r1, g1, b1] = parse(from); const [r2, g2, b2] = parse(to);
    const mix = (a, b) => Math.round(a + (b - a) * k);
    return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
  };

  function arcPath() {
    const parts = [];
    for (let index = 0; index <= 40; index += 1) {
      const position = sunPos(.02 + .96 * index / 40);
      parts.push(`${index === 0 ? "M" : "L"} ${position.x.toFixed(1)} ${position.y.toFixed(1)}`);
    }
    return parts.join(" ");
  }
  function cloudShape() {
    return '<ellipse cx="0" cy="0" rx="46" ry="17"/><ellipse cx="-31" cy="6" rx="30" ry="13"/><ellipse cx="29" cy="7" rx="32" ry="14"/><ellipse cx="-3" cy="-13" rx="30" ry="14"/>';
  }
  // Texte SVG avec indices : une chaîne = texte normal, ["indice"] = tspan en indice.
  function setSubText(element, parts) {
    element.replaceChildren(...parts.map((part) => {
      if (typeof part === "string") return document.createTextNode(part);
      const sub = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      sub.setAttribute("baseline-shift", "sub"); sub.setAttribute("font-size", "72%"); sub.textContent = part[0];
      return sub;
    }));
  }

  // Textes de la scène lisibles sur petit écran : quand le dessin est réduit (portable), on les
  // grossit d'autant (facteur 0,72 / échelle, entre 1 et 1,3 ; étiquettes des boîtes et puissance inchangées) ; sur grand écran, taille d'origine.
  let textScaleObserver = null;
  function updateTextScale() {
    const svg = document.querySelector(".pv-scene > svg");
    if (!svg) return;
    // Échelle du dessin (meet) en px CSS, indépendante des zooms et transformations d'affichage.
    const scale = Math.min(svg.clientWidth / 1000, svg.clientHeight / 520);
    if (!scale) return;
    const k = Math.min(1.3, Math.max(1, .72 / scale));
    svg.style.setProperty("--pv-k", String(k));
    // Lignes jumelles : l'écart entre les deux lignes grandit comme le texte.
    const setY = (id, y) => { const node = svg.querySelector(`#${id}`); if (node) node.setAttribute("y", y.toFixed(1)); };
    setY("pv-tilt-text", 314 - 20 * k);
    setY("pv-temp-line", 428 + 22 * k);
    ["pv-duty-text", "pv-hz-text"].forEach((id) => setY(id, 428 + 26 * k)); // sous V_pv et V_bus, dont l'indice descend
    if (!textScaleObserver && typeof ResizeObserver === "function") { textScaleObserver = new ResizeObserver(() => updateTextScale()); window.addEventListener("resize", () => requestAnimationFrame(updateTextScale)); }
    if (textScaleObserver && svg._scaleObserved !== true) { textScaleObserver.disconnect(); textScaleObserver.observe(svg); svg._scaleObserved = true; }
  }

  function sceneMarkup() {
    const rays = Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4;
      return `<line x1="${(30 * Math.cos(angle)).toFixed(1)}" y1="${(30 * Math.sin(angle)).toFixed(1)}" x2="${(43 * Math.cos(angle)).toFixed(1)}" y2="${(43 * Math.sin(angle)).toFixed(1)}"/>`;
    }).join("");
    const clouds = CLOUD_BASES.map((base, index) => `<g id="pv-cloud-${index}" class="pv-cloud" fill="#ffffff">${cloudShape()}</g>`).join("");
    return `
    <svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMax meet" role="img" aria-label="">
      <style>
        .pv-txt { fill: #24405c; font-family: Inter, "Segoe UI", Arial, sans-serif; font-size: calc(15.5px * var(--pv-k, 1)); font-weight: 760; text-anchor: middle; paint-order: stroke; stroke: rgba(255,255,255,.72); stroke-width: 3.4px; }
        .pv-txt-small { font-size: calc(13px * var(--pv-k, 1)); font-weight: 720; }
        .pv-txt-end { text-anchor: end; }
        .pv-txt-big { font-size: 24px; font-weight: 850; fill: #0b6b62; }
        .pv-txt-dim { fill: rgba(28,44,64,.62); font-size: calc(13.5px * var(--pv-k, 1)); letter-spacing: .12em; font-weight: 850; }
        .pv-box { fill: rgba(255,253,248,.92); stroke: #33566f; stroke-width: 2.6; }
        .pv-box-label { font-size: 18px; font-weight: 850; fill: #16324a; }
        .pv-wire { stroke: #3d5266; stroke-width: 3; fill: none; stroke-linecap: round; }
        .pv-flow-wire { stroke: #f2c230; }
      </style>
      <rect id="pv-sky" x="-500" y="-320" width="2000" height="${HORIZON + 320}" fill="url(#pv-sky-gradient)"/>
      <defs>
        <linearGradient id="pv-sky-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop id="pv-sky-top" offset="0" stop-color="#5fa8dc"/>
          <stop id="pv-sky-bottom" offset="1" stop-color="#bfe3f2"/>
        </linearGradient>
        <radialGradient id="pv-sun-glow-gradient">
          <stop offset="0" stop-color="#ffdf8a" stop-opacity=".85"/>
          <stop offset="1" stop-color="#ffdf8a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <path id="pv-arc" d="${arcPath()}" fill="none" stroke="rgba(255,255,255,.66)" stroke-width="2.4" stroke-dasharray="3 9"/>
      <text id="pv-east" class="pv-txt pv-txt-dim" x="880" y="392">EST</text>
      <text id="pv-west" class="pv-txt pv-txt-dim" x="188" y="392">OUEST</text>
      <polygon id="pv-beam" points="" fill="#ffd45c" opacity="0"/>
      <g id="pv-sun" class="pv-sun-group">
        <circle r="58" fill="url(#pv-sun-glow-gradient)"/>
        <g class="pv-sun-rays" stroke="#ffca4d" stroke-width="3.4" stroke-linecap="round">${rays}</g>
        <circle r="24" fill="#ffd45c" stroke="#eda63a" stroke-width="2.4"/>
        <circle id="pv-sun-hit" r="50" fill="rgba(0,0,0,0)"/>
      </g>
      ${clouds}
      <text id="pv-g-text" class="pv-txt" x="0" y="0">— W/m²</text>
      <rect id="pv-ground" x="-500" y="${HORIZON}" width="2000" height="440" fill="#7fb46a"/>
      <ellipse cx="820" cy="${HORIZON + 6}" rx="330" ry="26" fill="rgba(0,0,0,.06)"/>
      <g id="pv-pylon" transform="translate(18 0)" stroke="#46647e" stroke-width="3.4" fill="none" stroke-linecap="round">
        <line x1="96" y1="400" x2="112" y2="248"/><line x1="132" y1="400" x2="116" y2="248"/>
        <line x1="100" y1="365" x2="128" y2="365"/><line x1="103" y1="330" x2="125" y2="330"/><line x1="106" y1="296" x2="122" y2="296"/><line x1="109" y1="264" x2="119" y2="264"/>
        <line x1="100" y1="365" x2="125" y2="330"/><line x1="128" y1="365" x2="103" y2="330"/><line x1="103" y1="330" x2="122" y2="296"/><line x1="125" y1="330" x2="106" y2="296"/>
        <line x1="72" y1="256" x2="156" y2="256"/>
        <line x1="80" y1="256" x2="80" y2="267"/><line x1="148" y1="256" x2="148" y2="267"/>
        <path d="M 80 267 C 34 279, -6 285, -40 288"/>
      </g>
      <g id="pv-panel-stand" fill="#5a6b7c"><rect x="534" y="330" width="12" height="72" rx="3"/><rect x="506" y="398" width="68" height="8" rx="4"/></g>
      <g id="pv-panel-rot">
        <rect x="428" y="286" width="224" height="52" fill="rgba(0,0,0,0)"/>
        <rect x="434" y="301" width="212" height="26" rx="3" fill="#0d2440"/>
        <rect x="438" y="305" width="204" height="18" fill="#1e4a7e"/>
        <g stroke="rgba(160,205,250,.6)" stroke-width="1.2">
          <line x1="455" y1="305" x2="455" y2="323"/><line x1="472" y1="305" x2="472" y2="323"/><line x1="489" y1="305" x2="489" y2="323"/><line x1="506" y1="305" x2="506" y2="323"/><line x1="523" y1="305" x2="523" y2="323"/><line x1="540" y1="305" x2="540" y2="323"/><line x1="557" y1="305" x2="557" y2="323"/><line x1="574" y1="305" x2="574" y2="323"/><line x1="591" y1="305" x2="591" y2="323"/><line x1="608" y1="305" x2="608" y2="323"/><line x1="625" y1="305" x2="625" y2="323"/>
          <line x1="438" y1="314" x2="642" y2="314"/>
        </g>
        <polygon points="438,305 520,305 478,323 438,323" fill="#ffffff" opacity=".13"/>
      </g>
      <path id="pv-tilt-arc" d="" fill="none" stroke="rgba(20,40,60,.5)" stroke-width="2" stroke-dasharray="4 4"/>
      <text id="pv-tilt-text" class="pv-txt pv-txt-small pv-txt-end" x="413" y="294">β = 30°</text>
      <text id="pv-gpanel-text" class="pv-txt pv-txt-end" x="413" y="314">—</text>
      <rect class="pv-box" x="380" y="332" width="90" height="52" rx="9"/>
      <text class="pv-box-label pv-txt" x="425" y="355">DC/DC</text>
      <text id="pv-boost-name" class="pv-txt pv-txt-small" x="425" y="374" style="font-size:13px">boost</text>
      <rect class="pv-box" x="235" y="332" width="90" height="52" rx="9"/>
      <text class="pv-box-label pv-txt" x="280" y="355">DC/AC</text>
      <text id="pv-bridge-name" class="pv-txt pv-txt-small" x="280" y="374" style="font-size:13px">pont en H</text>
      <path class="pv-wire" d="M 534 358 H 470 M 380 358 H 325 M 235 358 H 196 Q 172 356 166 267"/>
      <path id="pv-flow" class="pv-wire pv-flow-wire" d="M 534 358 H 470 M 380 358 H 325 M 235 358 H 196 Q 172 356 166 267" stroke="#f2c230" stroke-width="4.4"/>
      <text id="pv-array-line" class="pv-txt" x="660" y="428">—</text>
      <text id="pv-temp-line" class="pv-txt pv-txt-small" x="660" y="450">—</text>
      <text id="pv-vpv-text" class="pv-txt" x="412" y="428">—</text>
      <text id="pv-duty-text" class="pv-txt pv-txt-small" x="412" y="450">—</text>
      <text id="pv-vdc-text" class="pv-txt" x="262" y="428">—</text>
      <text id="pv-hz-text" class="pv-txt pv-txt-small" x="262" y="450">230 V ~ 50 Hz</text>
      <text id="pv-power-text" class="pv-txt pv-txt-big" x="160" y="436">—</text>
    </svg>
    <div class="pv-hud">
      <label class="pv-hud-card">
        <svg width="21" height="14" viewBox="0 0 26 16" aria-hidden="true"><path d="M6 15 a5.4 5.4 0 1 1 1.6-10.6 a6.4 6.4 0 0 1 12.2 1.9 a4.4 4.4 0 0 1 -.6 8.7 z" fill="#8fb6d8"/></svg>
        <input id="pv-cloud-slider" type="range" min="0" max="100" step="1" value="12" aria-label="" />
        <output id="pv-cloud-output">12 %</output>
      </label>
      <button id="pv-play" class="pv-play-button" type="button" aria-pressed="false"><span id="pv-play-glyph">▶</span><span id="pv-play-label"></span></button>
    </div>`;
  }

  function svgCoords(svg, event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
  }

  function mountScene() {
    const root = document.querySelector("#pv-scene-root");
    if (!root) return;
    if (root._pvMounted && root._pvLang === lang()) return;
    root._pvMounted = true; root._pvLang = lang();
    root.innerHTML = sceneMarkup();
    const svg = root.querySelector("svg");
    svg.setAttribute("aria-label", t("sceneAria"));
    el.svg = svg;
    el.skyTop = root.querySelector("#pv-sky-top"); el.skyBottom = root.querySelector("#pv-sky-bottom");
    el.ground = root.querySelector("#pv-ground");
    el.sun = root.querySelector("#pv-sun"); el.sunHit = root.querySelector("#pv-sun-hit");
    el.beam = root.querySelector("#pv-beam");
    el.gText = root.querySelector("#pv-g-text");
    el.clouds = CLOUD_BASES.map((_, index) => root.querySelector(`#pv-cloud-${index}`));
    el.panelRot = root.querySelector("#pv-panel-rot");
    el.tiltArc = root.querySelector("#pv-tilt-arc"); el.tiltText = root.querySelector("#pv-tilt-text"); el.gPanelText = root.querySelector("#pv-gpanel-text");
    el.arrayLine = root.querySelector("#pv-array-line"); el.tempLine = root.querySelector("#pv-temp-line");
    el.vpvText = root.querySelector("#pv-vpv-text"); el.dutyText = root.querySelector("#pv-duty-text");
    el.vdcText = root.querySelector("#pv-vdc-text");
    el.powerText = root.querySelector("#pv-power-text");
    el.flow = root.querySelector("#pv-flow");
    el.east = root.querySelector("#pv-east"); el.west = root.querySelector("#pv-west");
    el.boostName = root.querySelector("#pv-boost-name"); el.bridgeName = root.querySelector("#pv-bridge-name");
    el.cloudSlider = root.querySelector("#pv-cloud-slider"); el.cloudOutput = root.querySelector("#pv-cloud-output");
    el.playButton = root.querySelector("#pv-play"); el.playGlyph = root.querySelector("#pv-play-glyph"); el.playLabel = root.querySelector("#pv-play-label");
    el.east.textContent = t("east").toUpperCase(); el.west.textContent = t("west").toUpperCase();
    el.boostName.textContent = t("boostBox"); el.bridgeName.textContent = t("bridgeBox");
    el.playLabel.textContent = t("playDay");
    el.cloudSlider.value = String(Math.round(scene.cloudiness * 100));
    el.cloudSlider.setAttribute("aria-label", t("clouds"));

    el.cloudSlider.addEventListener("input", () => {
      scene.cloudiness = Number(el.cloudSlider.value) / 100;
      updateSceneVisual();
      if (requestUpdate) requestUpdate();
    });
    // Molette sur la carte des nuages, comme sur les cartes de réglage standard.
    const cloudCard = el.cloudSlider.closest(".pv-hud-card");
    let cloudWheelTimer = null; let cloudWheelReady = false;
    cloudCard.addEventListener("mouseenter", () => { clearTimeout(cloudWheelTimer); cloudWheelReady = false; cloudWheelTimer = setTimeout(() => { cloudWheelReady = true; }, 200); });
    cloudCard.addEventListener("mouseleave", () => { clearTimeout(cloudWheelTimer); cloudWheelReady = false; });
    cloudCard.addEventListener("wheel", (event) => {
      if (!cloudWheelReady) return;
      event.preventDefault();
      const next = clamp(Number(el.cloudSlider.value) + (event.deltaY < 0 ? 1 : -1) * 5, 0, 100);
      if (next !== Number(el.cloudSlider.value)) { el.cloudSlider.value = String(next); el.cloudSlider.dispatchEvent(new Event("input", { bubbles: true })); }
    }, { passive: false });
    el.playButton.addEventListener("click", () => { setPlaying(!scene.playing); });

    const dragState = { mode: null, cloudIndex: -1, pointerId: null };
    svg.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (target === el.sunHit || el.sun.contains(target)) { dragState.mode = "sun"; setPlaying(false); el.sun.classList.add("pv-dragging"); }
      else if (el.panelRot.contains(target)) { dragState.mode = "tilt"; el.panelRot.classList.add("pv-dragging"); }
      else {
        const cloudIndex = el.clouds.findIndex((cloud) => cloud.contains(target));
        if (cloudIndex < 0) return;
        dragState.mode = "cloud"; dragState.cloudIndex = cloudIndex; el.clouds[cloudIndex].classList.add("pv-dragging");
      }
      dragState.pointerId = event.pointerId;
      event.preventDefault();
      try { svg.setPointerCapture(event.pointerId); } catch (_error) {}
    });
    svg.addEventListener("pointermove", (event) => {
      if (!dragState.mode || dragState.pointerId !== event.pointerId) return;
      const point = svgCoords(svg, event);
      if (dragState.mode === "sun") scene.u = clamp((900 - point.x) / 790, .02, .98);
      else if (dragState.mode === "tilt") {
        let angle = Math.atan2(PANEL.y - point.y, PANEL.x - point.x) * 180 / Math.PI;
        if (angle > 90) angle -= 180; else if (angle < -90) angle += 180;
        const beta = clamp(Math.round(angle / 2) * 2, 0, 60);
        const tiltInput = document.querySelector('input[data-key="tiltAngle"]');
        if (tiltInput && Number(tiltInput.value) !== beta) { tiltInput.value = String(beta); tiltInput.dispatchEvent(new Event("input", { bubbles: true })); }
      }
      else {
        const base = CLOUD_BASES[dragState.cloudIndex];
        scene.cloudShift[dragState.cloudIndex] = clamp(point.x, 60, 940) - base.x;
      }
      event.preventDefault();
      updateSceneVisual();
      if (requestUpdate) requestUpdate();
    });
    const endDrag = (event) => {
      if (!dragState.mode || (event && dragState.pointerId !== event.pointerId)) return;
      if (dragState.mode === "sun") el.sun.classList.remove("pv-dragging");
      if (dragState.mode === "tilt") el.panelRot.classList.remove("pv-dragging");
      if (dragState.mode === "cloud" && dragState.cloudIndex >= 0) el.clouds[dragState.cloudIndex].classList.remove("pv-dragging");
      dragState.mode = null; dragState.cloudIndex = -1; dragState.pointerId = null;
      if (requestUpdate) requestUpdate();
    };
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);
    updateSceneVisual();
  }

  let playTimer = null; let playLastTs = null; let playLastSim = 0;
  function setPlaying(value) {
    scene.playing = value;
    if (el.playButton) {
      el.playButton.setAttribute("aria-pressed", String(value));
      el.playGlyph.textContent = value ? "❚❚" : "▶";
      el.playLabel.textContent = value ? t("pause") : t("playDay");
    }
    if (!value) {
      if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
      return;
    }
    if (playTimer !== null) return;
    playLastTs = performance.now();
    playTimer = setInterval(() => {
      if (!scene.playing || !el.svg || !el.svg.isConnected) { clearInterval(playTimer); playTimer = null; return; }
      const now = performance.now();
      const delta = Math.min(now - playLastTs, 1000);
      playLastTs = now;
      scene.u += delta / 42000;
      if (scene.u > .98) scene.u = .02;
      updateSceneVisual();
      if (now - playLastSim > 150 && requestUpdate) { playLastSim = now; requestUpdate(); }
    }, 33);
  }

  function panelCorners(tiltDegrees) {
    const angle = tiltDegrees * Math.PI / 180;
    const cos = Math.cos(angle); const sin = Math.sin(angle);
    const half = 106;
    const cx = PANEL.x; const cy = PANEL.y - 1.5;
    return [
      { x: cx - half * cos, y: cy - half * sin },
      { x: cx + half * cos, y: cy + half * sin },
    ];
  }

  function updateSceneVisual() {
    if (!el.svg || !el.svg.isConnected) return;
    const state = lastState || {};
    const tiltDegrees = state.tiltAngle ?? 30;
    const env = computeEnvironment(state);
    const sun = sunPos(scene.u);
    const daylight = clamp(Math.sin(Math.PI * scene.u), 0, 1) ** .7;
    el.skyTop.setAttribute("stop-color", lerpColor("#e89a6b", "#4f9fd8", daylight));
    el.skyBottom.setAttribute("stop-color", lerpColor("#f8cf94", "#bfe3f2", daylight));
    el.ground.setAttribute("fill", lerpColor("#6d9159", "#7fb46a", daylight));
    el.sun.setAttribute("transform", `translate(${sun.x.toFixed(1)} ${sun.y.toFixed(1)})`);
    el.gText.setAttribute("x", clamp(sun.x, 96, 904).toFixed(1));
    el.gText.setAttribute("y", Math.min(sun.y + 84, HORIZON - 14).toFixed(1));
    el.gText.textContent = `GHI = ${fmt(0).format(env.ghi)} ${t("wpm2")}`;
    el.clouds.forEach((cloud, index) => {
      const info = cloudInfo(index);
      cloud.setAttribute("transform", `translate(${info.x.toFixed(1)} ${info.y.toFixed(1)}) scale(${info.scale.toFixed(3)})`);
      cloud.setAttribute("opacity", info.opacity.toFixed(3));
      cloud.style.pointerEvents = info.opacity < .05 ? "none" : "auto";
    });
    el.panelRot.setAttribute("transform", `rotate(${tiltDegrees.toFixed(1)} ${PANEL.x} ${PANEL.y})`);
    el.tiltText.textContent = `β = ${fmt(0).format(tiltDegrees)}°`;
    const arcRadius = 118;
    const arcAngle = tiltDegrees * Math.PI / 180;
    el.tiltArc.setAttribute("d", `M ${PANEL.x - arcRadius} ${PANEL.y} A ${arcRadius} ${arcRadius} 0 0 1 ${(PANEL.x - arcRadius * Math.cos(arcAngle)).toFixed(1)} ${(PANEL.y - arcRadius * Math.sin(arcAngle)).toFixed(1)}`);
    el.gPanelText.textContent = `G = ${fmt(0).format(env.g)} ${t("wpm2")}`;
    const corners = panelCorners(tiltDegrees);
    el.beam.setAttribute("points", `${sun.x.toFixed(1)},${sun.y.toFixed(1)} ${corners[0].x.toFixed(1)},${corners[0].y.toFixed(1)} ${corners[1].x.toFixed(1)},${corners[1].y.toFixed(1)}`);
    el.beam.setAttribute("opacity", (0.3 * env.beamShare).toFixed(3));
    if (el.cloudSlider && document.activeElement !== el.cloudSlider) {
      el.cloudSlider.value = String(Math.round(scene.cloudiness * 100));
    }
    el.cloudSlider.style.setProperty("--range-progress", `${Math.round(scene.cloudiness * 100)}%`);
    el.cloudOutput.textContent = `${fmt(0).format(scene.cloudiness * 100)} %`;
    updateSceneReadouts();
  }

  function updateSceneReadouts() {
    if (!el.svg || !el.svg.isConnected || !lastResult) return;
    const result = lastResult;
    const format = fmt(1);
    el.arrayLine.textContent = `${result.ns} × ${result.np} = ${result.ns * result.np} ${t("modules")} · ${format.format(result.stc.pmp / 1000)} ${t("kwc")}`;
    setSubText(el.tempLine, ["T", ["amb"], ` ${fmt(0).format(result.env.ambient)} °C · T`, ["cell"], ` ${fmt(0).format(result.env.tc)} °C`]);
    setSubText(el.vpvText, ["V", ["pv"], ` ${fmt(0).format(result.vPvMean)} V`]);
    el.dutyText.textContent = `α = ${fmt(2).format(result.duty)}`;
    setSubText(el.vdcText, ["V", ["bus"], ` ${fmt(0).format(result.vDcMean)} V`]);
    const kw = result.activePower / 1000;
    el.powerText.textContent = result.standby ? `0 W · ${t("night")}` : (Math.abs(result.activePower) < 1000 ? `${fmt(0).format(result.activePower)} W` : `${format.format(kw)} kW`);
    const flowing = Math.abs(result.activePower) > 25;
    el.flow.classList.toggle("paused", !flowing);
    // Cadence douce et plafonnée : lisible sans jamais clignoter (photosensibilité).
    if (flowing) el.flow.style.animationDuration = `${clamp(16000 / Math.max(Math.abs(kw), .05), 3000, 20000).toFixed(0)}ms`;
  }

  // -------------------------------------------------------------- curves --
  const curves = { canvas: null, ctx: null, host: null, buttons: {}, dragging: false, layout: null, observer: null };
  function mountCurves() {
    const host = document.querySelector("#pv-curves");
    if (!host) return;
    if (host._pvMounted && host._pvLang === lang()) return;
    host._pvMounted = true; host._pvLang = lang();
    host.innerHTML = `
      <div class="pv-curves-header">
        <span class="pv-curves-title">${t("curvesTitle")}</span>
        <div class="pv-mode-toggle" role="group" aria-label="MPPT">
          <button type="button" data-pv-mode="mppt" aria-pressed="true">${t("mppt")}</button>
          <button type="button" data-pv-mode="manual" aria-pressed="false">${t("manual")}</button>
        </div>
      </div>
      <canvas class="pv-curves-canvas" aria-label="${t("curvesAria")}"></canvas>`;
    curves.host = host;
    curves.canvas = host.querySelector("canvas");
    curves.ctx = curves.canvas.getContext("2d");
    curves.buttons = {
      mppt: host.querySelector('[data-pv-mode="mppt"]'),
      manual: host.querySelector('[data-pv-mode="manual"]'),
    };
    const applyMode = (mppt) => {
      scene.mppt = mppt;
      if (!mppt && scene.manualV === null && lastResult) scene.manualV = lastResult.op.v;
      syncModeButtons();
      if (requestUpdate) requestUpdate();
    };
    curves.buttons.mppt.addEventListener("click", () => applyMode(true));
    curves.buttons.manual.addEventListener("click", () => applyMode(false));
    const pickVoltage = (event) => {
      if (!curves.layout || !lastResult) return null;
      const rect = curves.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const plot = curves.layout.plots.find((candidate) => x >= candidate.x - 14 && x <= candidate.x + candidate.width + 14 && y >= candidate.y - 10 && y <= candidate.y + candidate.height + 24);
      if (!plot) return null;
      const fraction = clamp((x - plot.x) / plot.width, 0, 1);
      return fraction * curves.layout.vMax;
    };
    curves.canvas.addEventListener("pointerdown", (event) => {
      const voltage = pickVoltage(event);
      if (voltage === null) return;
      curves.dragging = true;
      scene.mppt = false;
      scene.manualV = voltage;
      syncModeButtons();
      curves.canvas.style.cursor = "grabbing";
      event.preventDefault();
      try { curves.canvas.setPointerCapture(event.pointerId); } catch (_error) {}
      if (requestUpdate) requestUpdate();
    });
    curves.canvas.addEventListener("pointermove", (event) => {
      if (!curves.dragging) {
        if (!curves.layout) return;
        const rect = curves.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left; const y = event.clientY - rect.top;
        const nearPoint = curves.layout.plots.some((plot) => Number.isFinite(plot.opX) && Math.hypot(x - plot.opX, y - plot.opY) < 14);
        curves.canvas.style.cursor = nearPoint ? "grab" : "crosshair";
        return;
      }
      const voltage = pickVoltage(event);
      if (voltage === null) return;
      scene.manualV = voltage;
      event.preventDefault();
      if (requestUpdate) requestUpdate();
    });
    const endCurveDrag = () => { curves.dragging = false; curves.canvas.style.cursor = "crosshair"; };
    curves.canvas.addEventListener("pointerup", endCurveDrag);
    curves.canvas.addEventListener("pointercancel", endCurveDrag);
    if (curves.observer) curves.observer.disconnect();
    if ("ResizeObserver" in window) {
      curves.observer = new ResizeObserver(() => drawCurves());
      curves.observer.observe(curves.canvas);
    }
    syncModeButtons();
  }
  function syncModeButtons() {
    if (!curves.buttons.mppt) return;
    curves.buttons.mppt.setAttribute("aria-pressed", String(scene.mppt));
    curves.buttons.manual.setAttribute("aria-pressed", String(!scene.mppt));
  }

  function drawCurves() {
    if (!curves.canvas || !curves.canvas.isConnected || !lastResult) return;
    const result = lastResult;
    const css = getComputedStyle(document.body);
    const color = (name) => css.getPropertyValue(name).trim();
    const rect = curves.canvas.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    curves.canvas.width = Math.round(rect.width * dpr);
    curves.canvas.height = Math.round(rect.height * dpr);
    const ctx = curves.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.font = '600 12.5px Inter, "Segoe UI", Arial, sans-serif';
    const format = fmt(1);
    const vMax = Math.max(result.stc.voc * 1.05, 1);
    const iMax = Math.max(result.stc.isc * 1.14, .1);
    const pMax = Math.max(result.stc.pmp * 1.12, 1);
    const labelWidth = 56; const innerGap = 20; const marginRight = 12; const marginTop = 24; const marginBottom = 28;
    const plotWidth = (rect.width - labelWidth * 2 - innerGap - marginRight) / 2;
    const plotHeight = rect.height - marginTop - marginBottom;
    const plots = [
      { x: labelWidth, y: marginTop, width: plotWidth, height: plotHeight, key: "i", max: iMax, unit: "A", trace: color("--trace-il"), title: "I–V" },
      { x: labelWidth * 2 + plotWidth + innerGap, y: marginTop, width: plotWidth, height: plotHeight, key: "p", max: pMax, unit: pMax >= 1200 ? "kW" : "W", trace: color("--trace-vr"), title: "P–V" },
    ];
    curves.layout = { plots, vMax };
    const gridColor = color("--scope-grid");
    const textColor = color("--scope-text");
    plots.forEach((plot) => {
      ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
      for (let column = 0; column <= 4; column += 1) {
        const x = plot.x + column / 4 * plot.width;
        ctx.beginPath(); ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.height); ctx.stroke();
      }
      for (let row = 0; row <= 3; row += 1) {
        const y = plot.y + row / 3 * plot.height;
        ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.width, y); ctx.stroke();
      }
      const xAt = (v) => plot.x + v / vMax * plot.width;
      const yAt = (value) => plot.y + plot.height - clamp(value / plot.max, 0, 1.02) * plot.height;
      const scaleValue = (value) => plot.unit === "kW" ? value / 1000 : value;
      ctx.fillStyle = textColor; ctx.textAlign = "right";
      ctx.fillText(`${format.format(scaleValue(plot.max))} ${plot.unit}`, plot.x - 6, plot.y + 10);
      ctx.fillText("0", plot.x - 6, plot.y + plot.height + 1);
      ctx.textAlign = "center";
      ctx.fillText(`${fmt(0).format(vMax)} V`, Math.min(plot.x + plot.width, rect.width - 26), plot.y + plot.height + 17);
      ctx.fillText("0", plot.x, plot.y + plot.height + 17);
      ctx.textAlign = "left";
      ctx.font = '800 13px Inter, "Segoe UI", Arial, sans-serif';
      ctx.fillText(plot.title, plot.x + 2, plot.y - 9);
      ctx.font = '600 12.5px Inter, "Segoe UI", Arial, sans-serif';
      // Reference curve at STC (dashed).
      ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.strokeStyle = textColor; ctx.globalAlpha = .42; ctx.lineWidth = 1.6;
      result.stc.curve.forEach((point, index) => {
        const x = xAt(point.v); const y = yAt(point[plot.key]);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      // Area fill for the live P–V curve.
      if (plot.key === "p") {
        ctx.beginPath();
        ctx.moveTo(xAt(0), yAt(0));
        result.curve.forEach((point) => ctx.lineTo(xAt(point.v), yAt(point.p)));
        ctx.lineTo(xAt(result.curve.at(-1)?.v || 0), yAt(0));
        ctx.closePath();
        ctx.fillStyle = plot.trace; ctx.globalAlpha = .08; ctx.fill(); ctx.globalAlpha = 1;
      }
      // Live curve.
      ctx.beginPath(); ctx.strokeStyle = plot.trace; ctx.lineWidth = 2.6; ctx.lineJoin = "round";
      result.curve.forEach((point, index) => {
        const x = xAt(point.v); const y = yAt(point[plot.key]);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      // MPP marker.
      if (result.mpp.p > 1) {
        const mx = xAt(result.mpp.v); const my = yAt(plot.key === "i" ? result.mpp.i : result.mpp.p);
        ctx.strokeStyle = color("--trace-vin"); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(mx - 5, my); ctx.lineTo(mx + 5, my); ctx.moveTo(mx, my - 5); ctx.lineTo(mx, my + 5); ctx.stroke();
        if (plot.key === "p") {
          // Badge « MPP » : rectangle arrondi opaque, décalé pour ne pas couvrir la croix.
          ctx.save();
          ctx.font = '800 11.5px Inter, "Segoe UI", Arial, sans-serif';
          const badgeWidth = ctx.measureText("MPP").width + 12;
          const badgeHeight = 17;
          let badgeX = mx + 9;
          if (badgeX + badgeWidth > plot.x + plot.width - 2) badgeX = mx - 9 - badgeWidth;
          let badgeY = my - 9 - badgeHeight;
          if (badgeY < plot.y + 2) badgeY = my + 9;
          ctx.beginPath(); ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
          ctx.fillStyle = color("--scope-screen"); ctx.fill();
          ctx.lineWidth = 1.4; ctx.strokeStyle = color("--trace-vin"); ctx.stroke();
          ctx.fillStyle = color("--trace-vin"); ctx.textAlign = "center";
          ctx.fillText("MPP", badgeX + badgeWidth / 2, badgeY + badgeHeight - 5);
          ctx.restore();
        }
      }
      // Operating point.
      const opY = yAt(plot.key === "i" ? result.op.i : result.op.p);
      const opX = xAt(result.op.v);
      plot.opX = opX; plot.opY = opY;
      ctx.beginPath(); ctx.arc(opX, opY, 6.4, 0, Math.PI * 2);
      ctx.fillStyle = color("--trace-vx"); ctx.fill();
      ctx.lineWidth = 2.2; ctx.strokeStyle = color("--scope-screen"); ctx.stroke();
      ctx.beginPath(); ctx.arc(opX, opY, 10.5, 0, Math.PI * 2);
      ctx.strokeStyle = color("--trace-vx"); ctx.globalAlpha = .4; ctx.lineWidth = 1.6; ctx.stroke(); ctx.globalAlpha = 1;
    });
    // Environment caption in the strip above the I–V plot.
    ctx.fillStyle = textColor; ctx.textAlign = "right";
    ctx.fillText(`${fmt(0).format(result.env.g)} ${t("wpm2")} · ${fmt(0).format(result.env.tc)} °C`, plots[0].x + plots[0].width - 2, plots[0].y - 9);
  }

  // ------------------------------------------------------- model interface --
  const control = (key, symbol, labels, min, max, step, unit, extra = {}) => ({ key, symbol, label: text(...labels), aria: text(...labels), min, max, step, unit, ...extra });
  const controls = {
    top: [
      control("tiltAngle", "β", ["Panel tilt", "Inclinaison du panneau", "Inclinación del panel"], 0, 60, 2, "°"),
      control("panelsPerString", "N<sub>s</sub>", ["Panels per string", "Panneaux par string", "Paneles por string"], 2, 8, 1, ""),
      control("strings", "N<sub>p</sub>", ["Parallel strings", "Strings en parallèle", "Strings en paralelo"], 1, 4, 1, ""),
      control("ambientTemp", "T<sub>amb</sub>", ["Ambient temperature", "Température ambiante", "Temperatura ambiente"], -10, 45, 1, "°C"),
    ],
    bottom: [
      control("dcVoltage", "V<sub>bus DC</sub>", ["DC bus voltage", "Tension du bus continu", "Tensión del bus continuo"], 360, 600, 20, "V", { advanced: true }),
      control("boostFrequency", "f<sub>boost</sub>", ["Boost switching frequency", "Fréquence de découpage du boost", "Frecuencia de conmutación del boost"], 8000, 40000, 2000, "kHz", { scale: .001, advanced: true }),
    ],
  };

  const plots = {
    dc: [
      { key: "vPv", label: "v<sub>pv</sub>", color: "--trace-ic", width: 2.7 },
      { key: "vDc", label: "v<sub>bus DC</sub>", color: "--trace-vl", width: 3 },
    ],
    currents: [
      { key: "iPv", label: "i<sub>pv</sub>", color: "--trace-il", width: 2.4 },
      { key: "iBusInRaw", label: "i<sub>bus DC, in</sub>", color: "--trace-vx", step: true, width: 1.4 },
      { key: "iBusIn", label: "⟨i<sub>bus DC, in</sub>⟩", color: "--trace-ic", width: 2.6 },
    ],
    ac: [
      { key: "iRef", label: "i<sub>g</sub>*", color: "--trace-vx", dash: [8, 5] },
      { key: "iGrid", label: "i<sub>g</sub>", color: "--trace-vr", width: 3 },
      { key: "iBest", label: "i<sub>g</sub> (STC)", color: "--scope-text", dash: [6, 6], width: 1.7, layer: -2 },
      { key: "iPad", legendHidden: true, ghost: true, label: "", color: "--scope-text" },
      { key: "iPadNeg", legendHidden: true, ghost: true, label: "", color: "--scope-text" },
      { key: "vPad", legendHidden: true, ghost: true, axis: "right", label: "", color: "--scope-text" },
      { key: "vPadNeg", legendHidden: true, ghost: true, axis: "right", label: "", color: "--scope-text" },
      { key: "vGrid", label: "v<sub>g</sub>", color: "--trace-vin", axis: "right", width: 3, layer: -1 },
    ],
  };

  const texPower = (helpers, value) => Math.abs(value) >= 1000 ? `${helpers.texNumber(value / 1000)}\\,\\mathrm{kW}` : `${helpers.texNumber(value)}\\,\\mathrm{W}`;

  const model = {
    id: "pv-grid",
    defaults: { tiltAngle: 30, panelsPerString: 6, strings: 2, ambientTemp: 25, dcVoltage: 400, busCapacitance: 1500, boostFrequency: 20000 },
    defaultHiddenTraces: ["iBusInRaw"],
    controls,
    controlsFor(_application, options = {}) {
      // Toujours deux rangées de cartes : la scène garde la même taille
      // en mode simple (2 + 2) et en mode avancé (3 + 2).
      const ambient = controls.top.find((item) => item.key === "ambientTemp");
      if (!options.advanced) return { top: controls.top.slice(0, 2), bottom: controls.top.slice(2) };
      return { top: controls.top.filter((item) => item.key !== "ambientTemp"), bottom: [ambient, ...controls.bottom] };
    },
    diagram: { type: "inline", aria: text("Interactive PV-to-grid scene", "Scène interactive PV vers réseau", "Escena interactiva PV a red") },
    diagramFor() { return '<div class="pv-scene" id="pv-scene-root"></div>'; },
    plots: { main: plots.dc, second: plots.currents, third: plots.ac },
    plotsFor() { return { main: plots.dc, second: plots.currents, third: plots.ac }; },
    basicPlotsFor() { return [plots.dc, plots.ac]; },
    axesFor(_application, isAdvanced = false) {
      const dcAxis = { label: text("DC voltages", "tensions DC", "tensiones DC"), unit: "V" };
      const currentAxis = { label: text("DC currents", "courants DC", "corrientes DC"), unit: "A", tint: "--trace-il" };
      const acAxis = { label: text("AC grid", "réseau AC", "red AC"), unit: "A", rightUnit: "V", tint: "--scope-text" };
      return isAdvanced ? [dcAxis, currentAxis, acAxis] : [dcAxis, acAxis, acAxis];
    },
    axisMarksFor(groupIndex, isAdvanced = false) {
      if (!lastResult) return [];
      if (groupIndex === 0) {
        return [
          { value: lastResult.vDcMean, color: "--trace-vl" },
          { value: lastResult.vPvMean, color: "--trace-ic" },
        ];
      }
      if (isAdvanced && groupIndex === 1) return [{ value: lastResult.iLMean, color: "--trace-il" }];
      return [];
    },
    calculate(state) {
      const ns = Math.round(state.panelsPerString);
      const np = Math.round(state.strings);
      const env = computeEnvironment(state);
      const array = makeArray(env.g, env.tc, ns, np);
      const stcArray = makeArray(1000, 25, ns, np);
      const stcMpp = findMpp(stcArray);
      const stc = { voc: stcArray.voc, isc: stcArray.isc, pmp: stcMpp.p, curve: sampleCurve(stcArray, stcArray.voc) };
      const mpp = findMpp(array);
      const curve = sampleCurve(array, array.voc);
      const vLimit = Math.min(stcArray.voc * 1.02, (state.dcVoltage || 400) * .95);
      let opVoltage = scene.mppt || scene.manualV === null ? mpp.v : clamp(scene.manualV, 2, vLimit);
      opVoltage = clamp(opVoltage, 0, vLimit);
      const op = { v: opVoltage, i: Math.max(array.current(opVoltage), 0), p: 0 };
      op.p = op.v * op.i;
      const sim = simulateChain(state, op, array);
      // Sinusoïde de référence : courant qui correspondrait à la puissance STC du champ.
      // Traces fantômes : iPad écrase l'échelle des courants et vPad dilate v_g,
      // pour que la tension culmine nettement au-dessus de la référence STC.
      const iBestAmp = Math.SQRT2 * stc.pmp / 230;
      const iPadValue = iBestAmp * 1.5;
      sim.points.forEach((point) => { point.iBest = iBestAmp * Math.sin(100 * Math.PI * point.t); point.iPad = iPadValue; point.iPadNeg = -iPadValue; point.vPad = 355; point.vPadNeg = -355; });
      const outcome = { ...sim, env, ns, np, curve, stc, mpp, op, vocArr: array.voc, iscArr: array.isc };
      // Mémorisé avant le tracé : les repères d'axe (axisMarksFor) lisent lastResult.
      lastResult = outcome;
      lastState = state;
      return outcome;
    },
    onResult(result, state, context) {
      requestUpdate = context.requestUpdate;
      lastResult = result;
      lastState = state;
      mountScene();
      mountCurves();
      updateTextScale();
      updateSceneVisual();
      drawCurves();
    },
    onTheme() {
      if (lastResult) drawCurves();
    },
    resetInteractive() {
      setPlaying(false);
      scene = sceneDefaults();
      const host = document.querySelector("#pv-curves");
      if (host) host._pvMounted = false;
      const root = document.querySelector("#pv-scene-root");
      if (root) root._pvMounted = false;
    },
    metricsFor(result, _state, advanced) {
      const format = fmt(2);
      const power = (value) => Math.abs(value) >= 1000 ? `${format.format(value / 1000)} kW` : `${fmt(1).format(value)} W`;
      if (!advanced) {
        return [
          { label: `${t("pvPower")} P<span class="symbol-index">pv</span>`, value: power(result.pvPower) },
          { label: `${t("acPower")} P<span class="symbol-index">ac</span>`, value: power(result.activePower) },
          { label: `${t("gridCurrent")} I<span class="symbol-index">g</span>`, value: `${format.format(result.currentRms)} A` },
        ];
      }
      return [
        { label: `${t("vpvOp")} V<span class="symbol-index">pv</span>`, value: `${fmt(1).format(result.vPvMean)} V` },
        { label: `${t("busRipple")} ΔV<span class="symbol-index">bus DC</span>`, value: `${fmt(1).format(result.vDcRipple)} V` },
        { label: t("thdI"), value: `${format.format(result.currentThd)} %` },
      ];
    },
    infoBandHtml() {
      const lines = (ids) => `<div class="info-lines pv-info-lines">${ids.map((id) => `<span class="math info-equation" id="${id}"></span>`).join("")}</div>`;
      return `
        <div><span>${t("sunlight")}</span>${lines(["pv-info-ghi", "pv-info-g", "pv-info-tc"])}</div>
        <div><span>${t("pvArray")}</span>${lines(["pv-info-p", "pv-info-vpv", "pv-info-ipv"])}</div>
        <div><span>${t("boostCol")}</span>${lines(["pv-info-duty", "pv-info-eta"])}</div>
        <div><span>${t("gridCol")} · 230 V</span>${lines(["pv-info-pac", "pv-info-ig", "pv-info-thd"])}</div>`;
    },
    infoValuesFor(result, _state, helpers) {
      helpers.setInfoMath("pv-info-ghi", `\\mathrm{GHI}=${helpers.texNumber(result.env.ghi)}\\,\\mathrm{W/m^2}`);
      helpers.setInfoMath("pv-info-g", `G=${helpers.texNumber(result.env.g)}\\,\\mathrm{W/m^2}`);
      helpers.setInfoMath("pv-info-tc", `T_{cell}=${helpers.texNumber(result.env.tc)}\\,^{\\circ}\\mathrm{C}`);
      helpers.setInfoMath("pv-info-p", `P_{pv}=${texPower(helpers, result.pvPower)}`);
      helpers.setInfoMath("pv-info-vpv", `V_{pv}=${helpers.texNumber(result.vPvMean)}\\,\\mathrm{V}`);
      helpers.setInfoMath("pv-info-ipv", `I_{pv}=${helpers.texNumber(result.iLMean)}\\,\\mathrm{A}`);
      helpers.setInfoMath("pv-info-duty", `\\alpha=1-\\tfrac{V_{pv}}{V_{bus}}=${helpers.texNumber(result.duty)}`);
      const tracking = result.mpp.p > 1 ? clamp(result.pvPower / result.mpp.p * 100, 0, 100) : 100;
      helpers.setInfoMath("pv-info-eta", `\\eta_{MPPT}=${helpers.texNumber(tracking)}\\,\\%`);
      document.querySelector("#pv-info-eta")?.classList.toggle("warning", tracking < 96);
      helpers.setInfoMath("pv-info-pac", `P=${texPower(helpers, result.activePower)}`);
      helpers.setInfoMath("pv-info-ig", `I_{g,\\mathrm{eff}}=${helpers.texNumber(result.currentRms)}\\,\\mathrm{A}`);
      helpers.setInfoMath("pv-info-thd", `\\mathrm{THD}_i=${helpers.texNumber(result.currentThd)}\\,\\%`);
    },
    theoryHtml() {
      const comparison = (rows) => `<div class="comparison-grid">${rows.map(([label, id]) => `<span>${label}</span><strong id="${id}"></strong>`).join("")}</div>`;
      return `
        <section><h3>${t("pvModelTitle")}</h3>
          <div class="approximation-formula math" data-tex="\\displaystyle I=I_{ph}-I_0\\left(e^{V/(n\\,N_s V_T)}-1\\right)"></div>
          <div class="approximation-formula math" data-tex="\\displaystyle T_{cell}=T_{amb}+\\frac{NOCT-20}{800}\\,G"></div>
          ${comparison([[t("openCircuit"), "pv-th-voc"], [t("shortCircuit"), "pv-th-isc"], [t("mppLabel"), "pv-th-mpp"], [t("operatingPoint"), "pv-th-op"]])}
          <p>${t("pvNote")}</p>
        </section>
        <section class="approximation-section"><h3>${t("chainTitle")}</h3>
          <div class="approximation-formula math" data-tex="\\displaystyle V_{pv}=(1-\\alpha)\\,V_{bus}"></div>
          ${comparison([[t("dutyLabel"), "pv-th-duty"], [`V<sub>pv</sub> — ${t("simulation").toLowerCase()}`, "pv-th-vpv"], [`(1−α)·V<sub>bus DC</sub>`, "pv-th-vpv-law"]])}
          <div class="approximation-formula math" data-tex="\\displaystyle \\Delta V_{bus}\\simeq\\frac{P}{\\omega\\,C_{dc}\\,V_{bus}}"></div>
          ${comparison([[t("simulation"), "pv-th-ripple-sim"], [t("approximation"), "pv-th-ripple-approx"], [t("relativeError"), "pv-th-ripple-err"]])}
          <div class="approximation-formula math" data-tex="\\displaystyle P_{ac}=V_gI_g\\cos\\varphi\\simeq P_{pv}"></div>
          ${comparison([[`P<sub>pv</sub>`, "pv-th-ppv"], [`P<sub>ac</sub>`, "pv-th-pac"], [t("conversionEff"), "pv-th-eff"]])}
          <p>${t("chainNote")}</p>
        </section>`;
    },
    theoryValuesFor(result, _state, helpers) {
      const format = fmt(1);
      const power = (value) => Math.abs(value) >= 1000 ? `${fmt(2).format(value / 1000)} kW` : `${format.format(value)} W`;
      helpers.setText("pv-th-voc", helpers.displayVoltage(result.vocArr));
      helpers.setText("pv-th-isc", helpers.displayCurrent(result.iscArr));
      helpers.setText("pv-th-mpp", `${power(result.mpp.p)} @ ${format.format(result.mpp.v)} V`);
      helpers.setText("pv-th-op", `${power(result.op.p)} @ ${format.format(result.op.v)} V`);
      helpers.setText("pv-th-duty", helpers.number.format(result.duty));
      helpers.setText("pv-th-vpv", helpers.displayVoltage(result.vPvMean));
      helpers.setText("pv-th-vpv-law", helpers.displayVoltage((1 - result.duty) * result.vDcMean));
      helpers.setText("pv-th-ripple-sim", helpers.displayVoltage(result.vDcRipple));
      helpers.setText("pv-th-ripple-approx", helpers.displayVoltage(result.busRippleApprox));
      helpers.setText("pv-th-ripple-err", `${helpers.number.format(helpers.relativeError(result.busRippleApprox, result.vDcRipple))} %`);
      helpers.setText("pv-th-ppv", power(result.pvPower));
      helpers.setText("pv-th-pac", power(result.activePower));
      helpers.setText("pv-th-eff", result.pvPower > 1 ? `${format.format(clamp(result.activePower / result.pvPower * 100, 0, 120))} %` : "—");
    },
  };

  window.converterModels = window.converterModels || {};
  window.converterModels["pv-grid"] = Object.freeze(model);
})();
