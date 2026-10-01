(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // UI strings. Only French for now; add a sibling object to support a language.
  // ---------------------------------------------------------------------------
  const STRINGS = {
    fr: {
      locale: "fr-FR",
      documentTitle: "Réponse indicielle — TD2",
      title: "Réponse indicielle",
      modeAria: "Ordre du système",
      mode1: "1er ordre",
      mode2: "2e ordre",
      themeDark: "Activer le thème sombre",
      themeLight: "Activer le thème clair",
      reframe: "Recadrer",
      autoAxes: "Axes auto",
      memorize: "Mémoriser",
      clear: "Effacer",
      graphAria: "Réponse indicielle y(t). Glissez sur le graphe pour déplacer le curseur le plus proche.",
      cursor1: "Curseur 1",
      cursor2: "Curseur 2",
      cursorsAria: "Curseurs de lecture",
      snap: "Aimant extremums",
      marksAria: "Repères",
      markBand: "y∞ ± 5 %",
      markTau: "63 % et τ",
      markEnvelope: "Enveloppe",
      timeAxis: "t (s)",
      paramsTitle: "Paramètres",
      eqTitle: "Équation différentielle",
      regimeLabel: "Régime :",
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
      fieldAria: "valeur",
      negative: "nég.",
      negativeAria: { K: "Gain statique négatif", u0: "Échelon négatif" },
      sliderAria: "curseur",
      params: {
        K: "Gain statique",
        tau: "Constante de temps",
        omega0: "Pulsation propre",
        xi: "Amortissement",
        u0: "Amplitude de l’échelon",
      },
    },
  };
  const S = STRINGS.fr;

  // ---------------------------------------------------------------------------
  // Parameters per order. Log sliders map 0..LOG_STEPS onto [min, max].
  // ---------------------------------------------------------------------------
  const LOG_STEPS = 2000;
  const WHEEL_LOG_STEPS = 10; // log-slider positions per wheel notch
  const WHEEL_ARM_DELAY = 600; // ms the pointer must rest on a card before the wheel acts
  // Values typed in a field may leave the slider range (the slider then sits at its end),
  // within these physical limits. K and u0 are magnitudes: their sign is a separate box.
  const LIMITS = {
    K: { min: 1e-6, max: 1e6 },
    tau: { min: 1e-4, max: 1e4 },
    omega0: { min: 1e-3, max: 1e4 },
    xi: { min: 0, max: 100 },
    u0: { min: 1e-6, max: 1e6 },
  };
  function withinLimits(key, value) {
    const lim = LIMITS[key];
    return Number.isFinite(value) && value >= lim.min && value <= lim.max;
  }
  function clampToLimits(key, value) {
    const lim = LIMITS[key];
    return Math.min(lim.max, Math.max(lim.min, value));
  }

  const PARAMS = {
    1: [
      { key: "K", symbol: "K", signed: true, min: 0.01, max: 1000, log: true, value: 200 },
      { key: "tau", symbol: "τ", unit: "s", min: 0.05, max: 10, log: true, value: 0.4 },
      { key: "u0", symbol: "u", index: "0", signed: true, min: 0.1, max: 20, step: 0.1, value: 6 },
    ],
    2: [
      { key: "K", symbol: "K", signed: true, min: 0.01, max: 1000, log: true, value: 0.04 },
      { key: "omega0", symbol: "ω", index: "0", unit: "rad/s", min: 0.5, max: 50, log: true, value: 5 },
      { key: "xi", symbol: "ξ", min: 0, max: 3, step: 0.01, value: 0.2 },
      { key: "u0", symbol: "u", index: "0", signed: true, min: 0.1, max: 20, step: 0.1, value: 1 },
    ],
  };
  const CRITICAL_TOL = 1e-6;
  const MATH_FONT = '"KaTeX_Math", "Cambria Math", "Times New Roman", serif';
  const CURSOR_DEFAULTS = [0.25, 0.5]; // default cursor places, as fractions of the time axis

  const state = {
    mode: 2,
    params: { 1: defaults(1), 2: defaults(2) },
    marks: { band: false, tau: false, envelope: false },
    autoAxes: false,
    snap: true, // cursors snap to the extrema of the active curve
    sign: { 1: { K: 1, u0: 1 }, 2: { K: 1, u0: 1 } }, // signs of K and u0 (sliders set magnitudes)
    view: { tMax: 1, yMin: 0, yMax: 1 },
    cursors: [ // read cursors; t is a time (s)
      { on: false, t: 0 },
      { on: false, t: 0 },
    ],
    memory: null, // { mode, params } of the stored curve
    dark: false,
  };

  // Parameters actually simulated: K and u0 carry their signs.
  function current() {
    const p = state.params[state.mode];
    const sign = state.sign[state.mode];
    return { ...p, K: sign.K * p.K, u0: sign.u0 * p.u0 };
  }

  function defaults(mode) { return Object.fromEntries(PARAMS[mode].map((def) => [def.key, def.value])); }

  // ---------------------------------------------------------------------------
  // Number formatting (French, 3 significant digits).
  // ---------------------------------------------------------------------------
  const sig3 = new Intl.NumberFormat(S.locale, { minimumSignificantDigits: 3, maximumSignificantDigits: 3 });
  const sig3Short = new Intl.NumberFormat(S.locale, { maximumSignificantDigits: 3 });
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
  function parseNumber(text) {
    const cleaned = String(text).trim().replace(/[\s  ]/g, "").replace(",", ".");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(cleaned)) return NaN;
    return Number(cleaned);
  }

  // ---------------------------------------------------------------------------
  // Analytic step responses (zero initial conditions, step u0 at t = 0).
  // ---------------------------------------------------------------------------
  function regimeOf(xi) {
    if (xi === 0) return "undamped";
    if (Math.abs(xi - 1) < CRITICAL_TOL) return "critical";
    return xi < 1 ? "under" : "over";
  }

  function makeResponse(mode, p) {
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

  // Reframing horizon: 6 tau; 8/(xi w0); 4 periods; 6/|s1|.
  function frameDuration(mode, p) {
    if (mode === 1) return 6 * p.tau;
    const regime = regimeOf(p.xi);
    if (regime === "undamped") return 4 * 2 * Math.PI / p.omega0;
    if (regime === "under") return 8 / (p.xi * p.omega0);
    return 6 / slowPole(p);
  }

  // Number of samples so that oscillations stay smooth over [0, duration].
  function sampleCount(mode, p, duration, base) {
    if (mode === 1) return base;
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
  // DOM
  // ---------------------------------------------------------------------------
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#scope");
  const ctx = canvas.getContext("2d");
  const screen = $("#scope-screen");
  const controlsHost = $("#controls");
  const themeButton = $("#theme-toggle");
  const autoAxesBox = $("#auto-axes");
  const clearButton = $("#clear-memory");
  const markBoxes = [...document.querySelectorAll("[data-mark]")];
  let controlRefs = {};
  let plotView = null;

  function applyStrings() {
    document.title = S.documentTitle;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = S[el.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", S[el.dataset.i18nAria]));
  }

  function renderTex(element, expression) {
    if (window.katex) window.katex.render(expression, element, { throwOnError: false, output: "htmlAndMathml", strict: false });
    else element.textContent = expression;
  }

  // Slider position <-> parameter value.
  function toSlider(def, value) {
    value = Math.min(def.max, Math.max(def.min, value)); // out-of-range values pin the slider to an end
    if (!def.log) return value;
    return Math.round(Math.log(value / def.min) / Math.log(def.max / def.min) * LOG_STEPS);
  }
  function fromSlider(def, position) {
    if (!def.log) return Number(position);
    return round3(def.min * Math.pow(def.max / def.min, Number(position) / LOG_STEPS));
  }
  function updateProgress(input) {
    const share = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
    input.style.setProperty("--range-progress", `${share}%`);
  }

  function renderControls() {
    controlsHost.replaceChildren();
    controlRefs = {};
    PARAMS[state.mode].forEach((def) => {
      const name = S.params[def.key];
      const card = document.createElement("div");
      card.className = "control";
      card.innerHTML = `
        <span class="control-copy"><b>${def.symbol}${def.index ? `<span class="symbol-index">${def.index}</span>` : ""}</b><small>${name}</small></span>
        <span class="value-field"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" />${def.signed ? `<label class="sign-toggle"><span>${S.negative}</span><input type="checkbox" /></label>` : `<span class="unit">${def.unit || ""}</span>`}</span>
        <input type="range" />`;
      const field = card.querySelector('input[type="text"]');
      const slider = card.querySelector('input[type="range"]');
      field.setAttribute("aria-label", `${name} : ${S.fieldAria}`);
      slider.setAttribute("aria-label", `${name} : ${S.sliderAria}`);
      if (def.log) { slider.min = 0; slider.max = LOG_STEPS; slider.step = 1; }
      else { slider.min = def.min; slider.max = def.max; slider.step = def.step; }

      slider.addEventListener("input", () => setParam(def, fromSlider(def, slider.value), "slider"));
      field.addEventListener("input", () => {
        const value = parseNumber(field.value);
        const valid = withinLimits(def.key, value);
        field.classList.toggle("invalid", !valid && field.value.trim() !== "");
        if (valid) setParam(def, value, "field");
        else if (def.signed && withinLimits(def.key, -value)) { field.classList.remove("invalid"); setSign(def, -1); setParam(def, -value, "field"); }
      });
      field.addEventListener("change", () => commitField(def));
      field.addEventListener("keydown", (event) => { if (event.key === "Enter") { commitField(def); field.blur(); } });

      const signBox = card.querySelector(".sign-toggle input");
      if (signBox) {
        signBox.checked = state.sign[state.mode][def.key] < 0;
        signBox.setAttribute("aria-label", S.negativeAria[def.key]);
        signBox.addEventListener("change", () => { setSign(def, signBox.checked ? -1 : 1); update(); });
      }
      bindWheel(card, def, slider);
      controlRefs[def.key] = { field, slider, signBox };
      controlsHost.append(card);
      syncControl(def, true);
    });
  }

  // Mouse wheel changes a value once the pointer has rested on the card for a moment
  // (as in the reference simulator), so that scrolling the column past a card does nothing.
  function bindWheel(card, def, slider) {
    let timer = null;
    let armed = false;
    const disarm = () => { clearTimeout(timer); armed = false; card.classList.remove("wheel-ready"); };
    card.addEventListener("mouseenter", () => {
      disarm();
      timer = setTimeout(() => { armed = true; card.classList.add("wheel-ready"); }, WHEEL_ARM_DELAY);
    });
    card.addEventListener("mouseleave", disarm);
    card.addEventListener("wheel", (event) => {
      if (!armed) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      const step = def.log ? WHEEL_LOG_STEPS : Number(slider.step);
      const next = Math.min(Number(slider.max), Math.max(Number(slider.min), Number(slider.value) + direction * step));
      if (next === Number(slider.value)) return;
      slider.value = String(next);
      setParam(def, round3(fromSlider(def, next)), "slider");
    }, { passive: false });
  }

  // Flipping a sign would put the whole curve outside fixed axes: reframe.
  function setSign(def, sign) {
    state.sign[state.mode][def.key] = sign;
    const box = controlRefs[def.key]?.signBox;
    if (box) box.checked = sign < 0;
    reframe();
  }

  function commitField(def) {
    const { field } = controlRefs[def.key];
    let value = parseNumber(field.value);
    if (!Number.isFinite(value)) value = state.params[state.mode][def.key];
    if (def.signed && value < 0) { setSign(def, -1); value = -value; }
    value = round3(clampToLimits(def.key, value));
    field.classList.remove("invalid");
    setParam(def, value, null);
  }

  function syncControl(def, updateField) {
    const { field, slider } = controlRefs[def.key];
    const value = state.params[state.mode][def.key];
    slider.value = toSlider(def, value);
    updateProgress(slider);
    if (updateField) field.value = sig3Short.format(value);
  }

  function setParam(def, value, source) {
    state.params[state.mode][def.key] = value;
    syncControl(def, source !== "field");
    update();
  }

  // ---------------------------------------------------------------------------
  // Equation, regime, characteristic values
  // ---------------------------------------------------------------------------
  function renderEquation() {
    const p = current();
    if (state.mode === 1) {
      renderTex($("#eq-symbolic"), "\\tau\\,\\dot{y} + y = K\\,u");
      renderTex($("#eq-numeric"), `${tex(p.tau)}\\,\\dot{y} + y = ${tex(p.K)}\\,u`);
      $("#regime").hidden = true;
      return;
    }
    const damping = p.xi > 0 ? ` + ${tex(2 * p.xi * p.omega0)}\\,\\dot{y}` : "";
    renderTex($("#eq-symbolic"), "\\ddot{y} + 2\\xi\\omega_0\\,\\dot{y} + \\omega_0^{2}\\,y = K\\omega_0^{2}\\,u");
    renderTex($("#eq-numeric"), `\\ddot{y}${damping} + ${tex(p.omega0 * p.omega0)}\\,y = ${tex(p.K * p.omega0 * p.omega0)}\\,u`);
    $("#regime").hidden = false;
    $("#regime-value").textContent = S.regimes[regimeOf(p.xi)];
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

  // Theoretical formulas of the polycopié (chapter 3), evaluated, plus the settling time
  // measured on the curve.
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

  function renderMarkAvailability() {
    document.querySelectorAll(".marks [data-only]").forEach((label) => { label.hidden = Number(label.dataset.only) !== state.mode; });
    const envelopeBox = markBoxes.find((box) => box.dataset.mark === "envelope");
    envelopeBox.disabled = state.mode !== 2 || regimeOf(state.params[2].xi) !== "under";
  }

  // ---------------------------------------------------------------------------
  // Axes
  // ---------------------------------------------------------------------------
  // Axes fit the active curve and, when present, the stored grey curve.
  function reframe() {
    const curves = [{ mode: state.mode, params: current() }];
    if (state.memory) curves.push(state.memory);
    const tMax = Math.max(...curves.map((c) => frameDuration(c.mode, c.params)));
    let yMin = 0;
    let yMax = 0;
    curves.forEach((c) => {
      const y = makeResponse(c.mode, c.params);
      const n = sampleCount(c.mode, c.params, tMax, 2000);
      for (let i = 0; i <= n; i += 1) { const v = y(tMax * i / n); yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
    });
    if (yMax === yMin) yMax = 1;
    state.view = { tMax, yMin: 1.1 * yMin, yMax: 1.1 * yMax };
    state.cursors.forEach((cursor, i) => { if (cursor.t > tMax) cursor.t = CURSOR_DEFAULTS[i] * tMax; });
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
  function tickFormatter(step) {
    const exponent = Math.floor(Math.log10(step) + 1e-9);
    const mantissa = step / Math.pow(10, exponent);
    const decimals = Math.max(0, -exponent + (Math.abs(mantissa - 2.5) < 1e-6 ? 1 : 0));
    return new Intl.NumberFormat(S.locale, { maximumFractionDigits: Math.min(decimals, 8) });
  }

  // ---------------------------------------------------------------------------
  // Plot (canvas, devicePixelRatio aware; technique from the reference simulator)
  // ---------------------------------------------------------------------------
  let drawQueued = false;
  function scheduleDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => { drawQueued = false; draw(); });
  }

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

    const { tMax, yMin, yMax } = state.view;
    const font = (size) => `500 ${size}px Inter, "Segoe UI", Arial, sans-serif`;
    const small = width < 520;
    const yTicks = axisTicks(yMin, yMax);
    const xTicks = axisTicks(0, tMax);
    const yFormat = tickFormatter(yTicks.step);
    const xFormat = tickFormatter(xTicks.step);
    ctx.font = font(small ? 12 : 12.5);
    const yLabelWidth = Math.max(...yTicks.values.map((v) => ctx.measureText(yFormat.format(v)).width), 10);
    const left = Math.ceil(yLabelWidth) + (small ? 14 : 20);
    const right = small ? 14 : 22;
    const top = 26;
    const bottom = small ? 40 : 44;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xAt = (t) => left + t / tMax * plotWidth;
    const yAt = (v) => top + (yMax - v) / (yMax - yMin) * plotHeight;
    plotView = { left, plotWidth, tMax };

    // Grid and tick labels.
    ctx.lineWidth = 1;
    ctx.strokeStyle = color("--scope-grid");
    xTicks.values.forEach((t) => { const x = Math.round(xAt(t)) + 0.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + plotHeight); ctx.stroke(); });
    yTicks.values.forEach((v) => { const y = Math.round(yAt(v)) + 0.5; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + plotWidth, y); ctx.stroke(); });
    ctx.strokeStyle = color("--scope-zero");
    ctx.beginPath(); ctx.moveTo(left, Math.round(yAt(0)) + 0.5); ctx.lineTo(left + plotWidth, Math.round(yAt(0)) + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Math.round(left) + 0.5, top); ctx.lineTo(Math.round(left) + 0.5, top + plotHeight); ctx.stroke();
    ctx.fillStyle = color("--scope-text");
    ctx.textAlign = "right";
    yTicks.values.forEach((v) => ctx.fillText(yFormat.format(v), left - 7, yAt(v) + 4));
    ctx.textAlign = "center";
    xTicks.values.forEach((t, i) => {
      if (small && xTicks.values.length > 7 && i % 2) return;
      ctx.fillText(xFormat.format(t), xAt(t), top + plotHeight + 16);
    });
    ctx.font = font(small ? 13 : 14);
    ctx.fillText(S.timeAxis, left + plotWidth / 2, top + plotHeight + (small ? 34 : 37));
    ctx.textAlign = "left";
    ctx.font = `italic ${small ? 16 : 17}px ${MATH_FONT}`;
    ctx.fillText("y", left - Math.min(yLabelWidth + 6, left - 4), top - 9);

    // Everything below is clipped to the plot area.
    ctx.save();
    ctx.beginPath(); ctx.rect(left, top - 1, plotWidth + 1, plotHeight + 2); ctx.clip();

    const p = current();
    const yInf = p.K * p.u0;
    const samples = (mode, params) => sampleCount(mode, params, tMax, Math.ceil(plotWidth * 2));
    const path = (fn, n) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i += 1) {
        const t = tMax * i / n;
        const v = fn(t);
        if (!Number.isFinite(v)) continue;
        const y = Math.max(-1e5, Math.min(1e5, yAt(v)));
        if (i === 0) ctx.moveTo(xAt(t), y); else ctx.lineTo(xAt(t), y);
      }
    };

    // Final value and +/- 5 % band.
    if (state.marks.band) {
      ctx.fillStyle = color("--trace-band");
      ctx.fillRect(left, yAt(1.05 * yInf), plotWidth, yAt(0.95 * yInf) - yAt(1.05 * yInf));
      ctx.setLineDash([7, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = color("--trace-final");
      ctx.beginPath(); ctx.moveTo(left, yAt(yInf)); ctx.lineTo(left + plotWidth, yAt(yInf)); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Envelope (underdamped second order).
    if (state.mode === 2 && state.marks.envelope && regimeOf(p.xi) === "under") {
      const amp = 1 / Math.sqrt(1 - p.xi * p.xi);
      ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = color("--trace-envelope");
      const n = Math.ceil(plotWidth);
      [1, -1].forEach((sign) => { path((t) => yInf * (1 + sign * amp * Math.exp(-p.xi * p.omega0 * t)), n); ctx.stroke(); });
      ctx.setLineDash([]);
    }

    // Stored curve, thin and grey, behind the active one.
    if (state.memory) {
      ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.strokeStyle = color("--trace-memory");
      path(makeResponse(state.memory.mode, state.memory.params), samples(state.memory.mode, state.memory.params));
      ctx.stroke();
    }

    // Active curve.
    const response = makeResponse(state.mode, p);
    ctx.lineWidth = 2.7; ctx.lineJoin = "round"; ctx.strokeStyle = color("--trace-y");
    path(response, samples(state.mode, p));
    ctx.stroke();

    // 63 % and tau (first order).
    if (state.mode === 1 && state.marks.tau) {
      const y63 = response(p.tau);
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.strokeStyle = color("--trace-tau");
      ctx.beginPath(); ctx.moveTo(left, yAt(y63)); ctx.lineTo(xAt(p.tau), yAt(y63)); ctx.lineTo(xAt(p.tau), yAt(0)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color("--trace-tau");
      ctx.beginPath(); ctx.arc(xAt(p.tau), yAt(y63), 4.5, 0, 2 * Math.PI); ctx.fill();
      ctx.font = font(13);
      ctx.textAlign = "left";
      ctx.fillText("63 %", left + 6, yAt(y63) - 6);
      ctx.font = `italic 16px ${MATH_FONT}`;
      ctx.fillText("τ", xAt(p.tau) + 5, yAt(0) - 6);
    }
    if (state.marks.band) {
      ctx.fillStyle = color("--trace-final");
      ctx.font = `italic 16px ${MATH_FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("y∞", left + plotWidth - 6, Math.max(top + 14, Math.min(yAt(1.05 * yInf), yAt(0.95 * yInf)) - 5));
    }

    // Read cursors: vertical line, numbered tab at the top, dot on the curve.
    state.cursors.forEach((cursor, i) => {
      if (!cursor.on || cursor.t > tMax) return;
      const tint = color(`--cursor-${i + 1}`);
      const x = Math.round(xAt(cursor.t)) + 0.5;
      ctx.lineWidth = 1.6; ctx.strokeStyle = tint;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + plotHeight); ctx.stroke();
      ctx.fillStyle = tint;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - 9, top, 18, 18, 5); else ctx.rect(x - 9, top, 18, 18); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = `700 12px Inter, "Segoe UI", Arial, sans-serif`; ctx.textAlign = "center";
      ctx.fillText(String(i + 1), x, top + 13.5);
      ctx.beginPath(); ctx.arc(x, yAt(response(cursor.t)), 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = tint; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = color("--scope-screen"); ctx.stroke();
    });
    ctx.restore();
  }

  function renderReadout() {
    const y = makeResponse(state.mode, current());
    const [c1, c2] = state.cursors;
    state.cursors.forEach((cursor, i) => {
      const n = i + 1;
      $(`#cursor-${n}`).setAttribute("aria-pressed", String(cursor.on));
      $(`#read-t${n}`).textContent = cursor.on ? `${fmt(cursor.t)} s` : "—";
      $(`#read-y${n}`).textContent = cursor.on ? fmt(y(cursor.t)) : "—";
    });
    const both = c1.on && c2.on;
    $("#read-dt").textContent = both ? `${fmt(c2.t - c1.t)} s` : "—";
    $("#read-dy").textContent = both ? fmt(y(c2.t) - y(c1.t)) : "—";
  }

  // ---------------------------------------------------------------------------
  // Main update
  // ---------------------------------------------------------------------------
  function update() {
    if (state.autoAxes) reframe();
    renderEquation();
    renderValues();
    renderMarkAvailability();
    renderReadout();
    scheduleDraw();
  }

  function setMode(mode) {
    state.mode = mode;
    state.cursors.forEach((cursor, i) => { cursor.t = CURSOR_DEFAULTS[i] * frameDuration(mode, state.params[mode]); });
    document.querySelectorAll("#mode-switch [data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.mode) === mode)));
    renderControls();
    reframe();
    update();
  }

  function setTheme(dark) {
    state.dark = dark;
    document.body.classList.toggle("dark-theme", dark);
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.setAttribute("aria-label", dark ? S.themeLight : S.themeDark);
    scheduleDraw();
  }

  // Pointer on the graph. Left button / touch: grabs the nearest active cursor (cursor 1 is
  // switched on if none is active) and drags it; right button: cursor 2. Cursors stay on release.
  let dragged = null;
  function timeAt(event) {
    const x = event.clientX - canvas.getBoundingClientRect().left;
    return Math.min(plotView.tMax, Math.max(0, (x - plotView.left) / plotView.plotWidth * plotView.tMax));
  }
  // Extrema of the active curve are analytic: dy/dt is proportional to sin(wd t), so they lie
  // at k*pi/wd (wd = w0 when xi = 0). First order and xi >= 1 are monotonic: nothing to snap to.
  function snapTime(t, pointerType) {
    const p = state.params[state.mode];
    if (!state.snap || state.mode !== 2 || p.xi >= 1 || Math.abs(p.xi - 1) < CRITICAL_TOL) return t;
    const halfPeriod = Math.PI / (p.omega0 * Math.sqrt(1 - p.xi * p.xi));
    const k = Math.max(1, Math.round(t / halfPeriod));
    const extremum = k * halfPeriod;
    const radius = (pointerType === "mouse" ? 14 : 24) / plotView.plotWidth * plotView.tMax;
    return Math.abs(extremum - t) <= radius && extremum <= plotView.tMax ? extremum : t;
  }
  function moveCursor(index, t) {
    state.cursors[index].on = true;
    state.cursors[index].t = t;
    renderReadout();
    scheduleDraw();
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (!plotView || (event.button !== 0 && event.button !== 2)) return;
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

  // Cursor buttons: switch a cursor on (at its default place if outside the view) or off.
  state.cursors.forEach((cursor, i) => $(`#cursor-${i + 1}`).addEventListener("click", () => {
    cursor.on = !cursor.on;
    if (cursor.on && !(cursor.t > 0 && cursor.t <= state.view.tMax)) cursor.t = CURSOR_DEFAULTS[i] * state.view.tMax;
    renderReadout();
    scheduleDraw();
  }));

  // No context menu (right button drives cursor 2), except in text fields.
  document.addEventListener("contextmenu", (event) => { if (!event.target.closest('input[type="text"]')) event.preventDefault(); });

  document.querySelectorAll("#mode-switch [data-mode]").forEach((button) => button.addEventListener("click", () => {
    const mode = Number(button.dataset.mode);
    if (mode !== state.mode) setMode(mode);
  }));
  themeButton.addEventListener("click", () => setTheme(!state.dark));
  $("#reframe").addEventListener("click", () => { reframe(); update(); });
  autoAxesBox.addEventListener("change", () => { state.autoAxes = autoAxesBox.checked; if (state.autoAxes) reframe(); update(); });
  $("#memorize").addEventListener("click", () => {
    state.memory = { mode: state.mode, params: current() };
    clearButton.disabled = false;
    update();
  });
  clearButton.addEventListener("click", () => { state.memory = null; clearButton.disabled = true; update(); });
  markBoxes.forEach((box) => box.addEventListener("change", () => { state.marks[box.dataset.mark] = box.checked; scheduleDraw(); }));

  if ("ResizeObserver" in window) new ResizeObserver(scheduleDraw).observe(screen);
  else window.addEventListener("resize", scheduleDraw);

  applyStrings();
  document.querySelectorAll("[data-tex]").forEach((el) => renderTex(el, el.dataset.tex));
  // Canvas symbols use the KaTeX math font: redraw once it is loaded.
  if (document.fonts) document.fonts.load(`italic 16px ${MATH_FONT}`).then(scheduleDraw, () => {});
  setTheme(false); // always start in the light theme, as the reference simulator
  setMode(state.mode);

  // Read-only hook for automated checks.
  window.stepResponseApp = { state, makeResponse, settlingTime };
})();
