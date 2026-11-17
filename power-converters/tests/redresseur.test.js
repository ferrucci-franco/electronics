"use strict";

const assert = require("node:assert/strict");

global.window = {};
require("../topologies/redresseur.js");

const model = window.converterModels.redresseur;
const options = (overrides = {}) => ({ montage: "single", view: "steady", diodes: "ideal", frequency: 60, ...overrides });
const generator = (overrides = {}) => options({ frequency: 1000, ...overrides });
const state = (overrides = {}, frequency = 60) => ({ ...model.defaultsFor({ frequency }), ...overrides });
const relativeError = (actual, expected) => Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12);

assert.equal(model.id, "redresseur");

// --- 50 / 60 Hz : comportement inchangé (R en Ω, C en µF) ---
assert.deepEqual(model.defaultsFor({ frequency: 60 }), model.defaults);
assert.equal(model.controlsFor("single", { frequency: 60 }).top[1].unit, "Ω");
assert.equal(model.controlsFor("single", { frequency: 50 }).top[2].unit, "µF");
assert.equal(model.axesFor("single", false, { frequency: 60 })[1].unit, "A");

const mains = model.calculate(state({ vinRms: 12, resistance: 20 }), null, options());
assert.equal(mains.frequency, 60);
assert.equal(model.calculate(state(), null, options({ frequency: 50 })).frequency, 50);
assert.equal(mains.generator, false);
assert.ok(relativeError(mains.vChMean, mains.idealMean) < .02, "50/60 Hz : ⟨v_o⟩ = V̂/π sans condensateur");
const mainsBridge = model.calculate(state(), null, options({ montage: "bridge" }));
assert.ok(relativeError(mainsBridge.vChMean, mainsBridge.idealMean) < .02, "50/60 Hz : ⟨v_o⟩ = 2V̂/π pour le pont");

// --- 1 kHz (générateur) : curseurs ---
const top = model.controlsFor("single", { frequency: 1000 }).top;
const [vin, resistance, capacitance] = top;
assert.deepEqual([vin.key, vin.min, vin.max, vin.step, vin.unit], ["vinRms", 1, 10, .5, "V"]);
assert.deepEqual([resistance.key, resistance.min, resistance.max, resistance.step, resistance.unit], ["resistance", 1, 20, 1, "kΩ"]);
assert.deepEqual([capacitance.key, capacitance.min, capacitance.max, capacitance.step, capacitance.unit], ["capacitance", 0, 2200, 100, "nF"]);
const advanced = model.controlsFor("single", { frequency: 1000, advanced: true });
assert.deepEqual(advanced.top.map((item) => item.key), ["vinRms", "resistance", "inductance"]);
assert.deepEqual(advanced.bottom.map((item) => [item.key, item.unit]), [["filterInductance", "mH"], ["capacitance", "nF"]]);
[vin, resistance, capacitance].forEach((item) => ["en", "fr", "es"].forEach((lang) => assert.ok(item.label[lang], `libellé ${item.key} en ${lang}`)));
assert.deepEqual(model.defaultsFor({ frequency: 1000 }), { ...model.defaults, vinRms: 7, resistance: 10, capacitance: 0 });
assert.equal(model.axesFor("single", false, { frequency: 1000 })[1].unit, "mA");

// --- 1 kHz : sans C, ⟨v_o⟩ = V̂/π (simple diode) et 2V̂/π (pont) ---
const gen = model.calculate(state({}, 1000), null, generator());
assert.equal(gen.frequency, 1000);
assert.equal(gen.generator, true);
assert.ok(relativeError(gen.amplitude, Math.SQRT2 * 7) < 1e-12);
assert.ok(relativeError(gen.vChMean, gen.amplitude / Math.PI) < .02, "1 kHz : ⟨v_o⟩ = V̂/π");
assert.ok(relativeError(gen.idealMean, gen.amplitude / Math.PI) < 1e-12);
// Courant moyen en A : ⟨i_o⟩ = ⟨v_o⟩/R avec R = 10 kΩ ; les traces sont en mA.
assert.ok(relativeError(gen.iChMean, gen.vChMean / 10e3) < .02, "1 kHz : ⟨i_o⟩ = ⟨v_o⟩/R");
const peakTrace = Math.max(...gen.points.map((point) => point.iCh));
assert.ok(relativeError(peakTrace, gen.amplitude / 10e3 * 1e3) < .02, "traces de courant en mA");
assert.ok(relativeError(gen.conductionDegrees, 180) < .03, "1 kHz : conduction sur une demi-période sans C");
assert.ok(relativeError(gen.duration, 2e-3) < 1e-3, "deux périodes de 1 ms enregistrées");

const genBridge = model.calculate(state({ vinRms: 5, resistance: 4 }, 1000), null, generator({ montage: "bridge" }));
assert.ok(relativeError(genBridge.vChMean, 2 * Math.SQRT2 * 5 / Math.PI) < .02, "1 kHz : ⟨v_o⟩ = 2V̂/π pour le pont");

// --- 1 kHz avec C : ondulation et Δv_o ≈ ⟨i_o⟩/(f_r·C) ---
// La formule du panneau ne dépend que des réglages : ⟨i_o⟩ ≈ v_o max / R, et f_r = f (simple
// alternance) ou 2f (pont). Comparer l'ondulation simulée à une formule qui reprendrait le
// courant simulé ne mesurerait plus l'erreur de la formule.
const filtered = model.calculate(state({ vinRms: 7, resistance: 10, capacitance: 1000 }, 1000), null, generator());
assert.equal(filtered.hasCapacitor, true);
assert.ok(filtered.vChMean > gen.vChMean && filtered.vChMean < filtered.amplitude, "C relève la tension moyenne");
assert.equal(filtered.rippleFrequency, 1000);
assert.ok(relativeError(filtered.meanCurrentFormula, filtered.peakFormula / 10e3) < 1e-12, "⟨i_o⟩ ≈ v_o max / R");
assert.ok(relativeError(filtered.rippleApprox, filtered.peakFormula / 10e3 / (1000 * 1e-6)) < 1e-9, "Δv_o ≈ ⟨i_o⟩/(fC) avec C en nF et f = 1 kHz");
assert.ok(relativeError(filtered.vChRipple, filtered.rippleApprox) < .15, "Δv_o simulé proche de ⟨i_o⟩/(fC)");
assert.ok(relativeError(filtered.timeConstant, 10e3 * 1e-6) < 1e-12, "RC en secondes");
const filteredBridge = model.calculate(state({ vinRms: 7, resistance: 10, capacitance: 1000 }, 1000), null, generator({ montage: "bridge" }));
assert.equal(filteredBridge.rippleFrequency, 2000);
assert.ok(relativeError(filteredBridge.rippleApprox, filteredBridge.peakFormula / 10e3 / (2 * 1000 * 1e-6)) < 1e-9, "pont : Δv_o ≈ ⟨i_o⟩/(2fC)");
assert.equal(gen.rippleApprox, null, "sans condensateur, pas d'ondulation à approcher");
assert.equal(gen.meanWithCapFormula, null, "sans condensateur, pas de ⟨v_o⟩ à mi-ondulation");
// Avec C : ⟨v_o⟩ ≈ v_o max − Δv_o/2, et la simulation s'en approche quand RC ≫ 1/f_r.
assert.ok(relativeError(filtered.meanWithCapFormula, filtered.peakFormula - filtered.rippleApprox / 2) < 1e-12);
assert.ok(relativeError(filtered.vChMean, filtered.meanWithCapFormula) < .05, "⟨v_o⟩ simulé proche de v_o max − Δv_o/2");

// --- Formules du panneau « Régime permanent » (V_D0 = seuil du modèle de diode) ---
// Valeurs de référence recoupées par la simulation indépendante du script Python
// (tests/verification-redresseur.py) : V̂ = 10 V, V_D0 = 0,6 V, charge R, sans condensateur.
{
  const vinRms = 10 / Math.SQRT2;
  const real = (overrides) => model.calculate(state({ vinRms, resistance: 10, capacitance: 0 }, 1000), null, generator({ diodes: "real", ...overrides }));
  const simpleReal = real({});
  assert.equal(simpleReal.threshold, .6);
  assert.ok(Math.abs(simpleReal.peakFormula - 9.4) < 1e-9, "v_o max = V̂ − V_D0");
  assert.ok(Math.abs(simpleReal.meanFormula - 2.883) < .001, `⟨v_o⟩ ≈ V̂/π − V_D0/2 = 2,883 V (obtenu ${simpleReal.meanFormula})`);
  assert.ok(Math.abs(simpleReal.vChMean - 2.889) < .002, `⟨v_o⟩ simulé = 2,889 V (obtenu ${simpleReal.vChMean})`);
  assert.ok(Math.abs(simpleReal.pivFormula - 10) < 1e-9, "sans C, simple alternance : V_inv = V̂");
  const bridgeReal = real({ montage: "bridge" });
  assert.ok(Math.abs(bridgeReal.peakFormula - 8.8) < 1e-9, "pont : v_o max = V̂ − 2V_D0");
  assert.ok(Math.abs(bridgeReal.meanFormula - 5.166) < .001, `pont : ⟨v_o⟩ ≈ 2V̂/π − 2V_D0 = 5,166 V (obtenu ${bridgeReal.meanFormula})`);
  assert.ok(Math.abs(bridgeReal.vChMean - 5.212) < .002, `pont : ⟨v_o⟩ simulé = 5,212 V (obtenu ${bridgeReal.vChMean})`);
  assert.ok(Math.abs(bridgeReal.pivFormula - 9.4) < 1e-9, "pont : V_inv = V̂ − V_D0");
  // Avec condensateur, la tension inverse double en simple alternance (2V̂ − V_D0) et reste
  // à V̂ − V_D0 dans le pont ; la simulation s'en approche quand l'ondulation est faible.
  const capacitor = (overrides) => model.calculate(state({ vinRms, resistance: 10, capacitance: 2200 }, 1000), null, generator({ diodes: "real", ...overrides }));
  const simpleCap = capacitor({});
  assert.ok(Math.abs(simpleCap.pivFormula - 19.4) < 1e-9, "avec C, simple alternance : V_inv = 2V̂ − V_D0");
  assert.ok(relativeError(Math.abs(simpleCap.piv), simpleCap.pivFormula) < .05, "V_inv simulée proche de 2V̂ − V_D0");
  const bridgeCap = capacitor({ montage: "bridge" });
  assert.ok(Math.abs(bridgeCap.pivFormula - 9.4) < 1e-9, "avec C, pont : V_inv = V̂ − V_D0");
  assert.ok(relativeError(Math.abs(bridgeCap.piv), bridgeCap.pivFormula) < .05, "pont : V_inv simulée proche de V̂ − V_D0");
  // Diodes idéales : les formules se réduisent aux lois classiques.
  const ideal = model.calculate(state({ vinRms, resistance: 10, capacitance: 0 }, 1000), null, generator());
  assert.equal(ideal.threshold, 0);
  assert.ok(Math.abs(ideal.peakFormula - 10) < 1e-9);
  assert.ok(relativeError(ideal.meanFormula, ideal.idealMean) < 1e-12, "modèle idéal : ⟨v_o⟩ = V̂/π");
  // Courant de crête dans la diode et maximum de v_o, lus par le panneau.
  assert.ok(relativeError(ideal.iD1Peak, 10 / 10e3) < .01, "sans C : i_D crête = V̂/R");
  assert.ok(relativeError(ideal.vChMax, 10) < 1e-3, "sans C : v_o max = V̂");
  assert.ok(simpleCap.iD1Peak > 10 * simpleCap.iChMean, "avec C : la recharge se fait par pointes");
}

// --- Charge inductive et vue Démarrage : signalées au panneau ---
assert.equal(mains.inductive, false);
assert.equal(model.calculate(state({ inductance: 50 }), null, options({ advanced: true })).inductive, true);
assert.equal(model.calculate(state({ filterInductance: 50 }), null, options({ advanced: true })).inductive, true);
assert.equal(model.calculate(state(), null, options({ advanced: true, view: "transient" })).view, "transient");

// --- Bandeau : valeurs lisibles avec les unités du mode ---
const fr = model.metricsFor(filtered, state({}, 1000), false, "fr").map((item) => item.value);
assert.match(fr[0], /V$/);
// ⟨i_o⟩ ≈ 0,95 mA : sous 1 mA, le bandeau passe en µA (valeur lue en fr : virgule décimale)
assert.ok(filtered.iChMean < 1e-3 && filtered.iChMean > 1e-4);
assert.match(fr[2], /µA$/);
assert.ok(relativeError(parseFloat(fr[2].replace(",", ".")), filtered.iChMean * 1e6) < .01, "µA cohérents avec ⟨i_o⟩ en A");
const texts = {};
model.infoValuesFor(filtered, {}, { setInfoMath: (id, tex) => { texts[id] = tex; }, texNumber: (value) => String(Number(value.toPrecision(4))), texVoltage: (value) => `${value}V` });
assert.match(texts["info-rect-imean"], /mathrm\{\\mu A\}$/);
assert.ok(relativeError(parseFloat(texts["info-rect-imean"].split("=")[1]), filtered.iChMean * 1e6) < .01);
assert.ok(filtered.pCh > 1e-3 && filtered.pCh < 1, "P_o de l'ordre du mW");
assert.match(texts["info-rect-power"], /mathrm\{mW\}$/);
assert.ok(relativeError(parseFloat(texts["info-rect-power"].split("=")[1]), filtered.pCh * 1e3) < .01);
const quiet = model.calculate(state({ vinRms: 1, resistance: 20 }, 1000), null, generator());
assert.ok(quiet.pCh < 1e-3 && quiet.pCh > 0, "1 V, 20 kΩ : P_o sous le mW");
const quietTexts = {};
model.infoValuesFor(quiet, {}, { setInfoMath: (id, tex) => { quietTexts[id] = tex; }, texNumber: (value) => String(Number(value.toPrecision(4))), texVoltage: (value) => `${value}V` });
assert.match(quietTexts["info-rect-power"], /mathrm\{\\mu W\}$/);
const loud = model.calculate(state({ vinRms: 10, resistance: 1 }, 1000), null, generator());
assert.ok(loud.iChMean > 1e-3, "1 kΩ, 10 V : ⟨i_o⟩ dépasse 1 mA");
const loudTexts = {};
model.infoValuesFor(loud, {}, { setInfoMath: (id, tex) => { loudTexts[id] = tex; }, texNumber: (value) => String(Number(value.toPrecision(4))), texVoltage: (value) => `${value}V` });
assert.match(loudTexts["info-rect-imean"], /mathrm\{mA\}$/);
const mainsTexts = {};
model.infoValuesFor(mains, {}, { setInfoMath: (id, tex) => { mainsTexts[id] = tex; }, texNumber: (value) => String(Number(value.toPrecision(4))), texVoltage: (value) => `${value}V` });
assert.match(mainsTexts["info-rect-imean"], /mathrm\{A\}$/);
assert.match(mainsTexts["info-rect-power"], /mathrm\{W\}$/);

// --- Panneau « Régime permanent » : trois langues et typographie française ---
["en", "fr", "es"].forEach((lang) => {
  const html = model.theoryHtml(lang);
  assert.ok(!/undefined/.test(html), `panneau sans libellé manquant en ${lang}`);
  ["theory-rect-case", "theory-rect-peak-single", "theory-rect-peak-bridge", "theory-rect-mean-single",
    "theory-rect-pivOpen-bridge", "theory-rect-ripple-single", "theory-rect-frequency-bridge",
    "theory-rect-meanCap-single", "theory-rect-meanCap-bridge",
    "theory-rect-pivCap-single", "theory-rect-notes", "theory-rect-form", "theory-rect-angle",
    "theory-rect-idpeak", "theory-rect-piv"].forEach((id) => assert.ok(html.includes(`id="${id}"`), `${id} présent en ${lang}`));
  assert.ok(html.includes('data-block="noCap"') && html.includes('data-block="withCap"'), "les deux blocs sont toujours affichés");
  assert.ok((html.match(/data-col="single"/g) || []).length === 8, "huit cellules par colonne (en-tête compris)");
  assert.ok(!html.includes("(D)"), "pas de « (D) » accolé à l'angle de conduction");
});
// En français, l'espace avant « : » est une fine insécable ; les autres langues n'en mettent pas.
assert.ok(model.theoryHtml("fr").includes("\u202f:"), "espace fine insécable avant le deux-points");
assert.ok(!model.theoryHtml("en").includes("\u202f"), "pas d'espace fine en anglais");

// --- Curseur d'instant : état des diodes ---
const angleOf = (result, point) => ((2 * Math.PI * result.frequency * point.t) * 180 / Math.PI) % 360;
const awayFromCrossing = (angle, margin = 2) => Math.min(angle % 180, 180 - angle % 180) > margin;
// Charge R, diodes idéales : D passante si et seulement si v_in > 0 (aux passages par zéro près).
[options(), generator()].forEach((opts) => {
  const result = model.calculate(state({}, opts.frequency), null, opts);
  result.points.forEach((point) => {
    const angle = angleOf(result, point);
    if (awayFromCrossing(angle)) assert.equal(model.diodeStates(point, result).d, angle < 180, `diode simple à ${angle.toFixed(1)}° (${opts.frequency} Hz)`);
  });
});
// Pont, charge R : D1 et D3 pendant l'alternance positive, D2 et D4 pendant la négative.
const bridgeR = model.calculate(state(), null, options({ montage: "bridge" }));
bridgeR.points.forEach((point) => {
  const angle = angleOf(bridgeR, point); const states = model.diodeStates(point, bridgeR);
  assert.equal(states.d1, states.d3); assert.equal(states.d2, states.d4);
  if (awayFromCrossing(angle)) assert.deepEqual([states.d1, states.d2], [angle < 180, angle >= 180], `pont à ${angle.toFixed(1)}°`);
});
// Pont avec C : les deux paires ne conduisent jamais ensemble, et toutes les diodes sont
// bloquées pendant la décharge du condensateur.
const bridgeC = model.calculate(state({ capacitance: 2200 }), null, options({ montage: "bridge" }));
const bridgeStates = bridgeC.points.map((point) => model.diodeStates(point, bridgeC));
assert.ok(bridgeStates.every((item) => !(item.d1 && item.d2)), "pont : jamais D1 et D2 ensemble");
assert.ok(bridgeStates.some((item) => item.d1) && bridgeStates.some((item) => item.d2), "pont avec C : chaque paire conduit");
assert.ok(bridgeStates.filter((item) => !item.d1 && !item.d2).length > bridgeStates.length / 2, "pont avec C : diodes bloquées la plupart du temps");
// Diode simple, charge R–L : la diode conduit au-delà de 180°, jusqu'à l'angle d'extinction β,
// racine de sin(β − φ) + sin(φ)·exp(−β/tan φ) = 0 avec tan φ = Lω/R.
{
  const frequency = 60; const resistance = 20; const inductance = 100;
  const phi = Math.atan(2 * Math.PI * frequency * inductance / 1000 / resistance);
  const f = (beta) => Math.sin(beta - phi) + Math.sin(phi) * Math.exp(-beta / Math.tan(phi));
  let low = Math.PI; let high = 2 * Math.PI;
  for (let iteration = 0; iteration < 60; iteration += 1) { const middle = (low + high) / 2; if (f(middle) > 0) low = middle; else high = middle; }
  const betaDegrees = low * 180 / Math.PI;
  const rl = model.calculate(state({ resistance, inductance }), null, options({ advanced: true }));
  const onAngles = rl.points.filter((point) => model.diodeStates(point, rl).d).map((point) => angleOf(rl, point));
  const extinction = Math.max(...onAngles);
  assert.ok(betaDegrees > 180 && Math.abs(extinction - betaDegrees) < 1, `charge R–L : β = ${betaDegrees.toFixed(1)}°, simulé ${extinction.toFixed(1)}°`);
}

console.log("redresseur : tous les tests passent");
