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

// --- 1 kHz avec C : ondulation et Δv_o ≈ I_o/(fC) ---
const filtered = model.calculate(state({ vinRms: 7, resistance: 10, capacitance: 1000 }, 1000), null, generator());
assert.equal(filtered.hasCapacitor, true);
assert.ok(filtered.vChMean > gen.vChMean && filtered.vChMean < filtered.amplitude, "C relève la tension moyenne");
assert.ok(relativeError(filtered.rippleApprox, filtered.iChMean / (1000 * 1e-6)) < 1e-9, "Δv_o ≈ I_o/(fC) avec C en nF et f = 1 kHz");
assert.ok(relativeError(filtered.vChRipple, filtered.rippleApprox) < .15, "Δv_o simulé proche de I_o/(fC)");
const filteredBridge = model.calculate(state({ vinRms: 7, resistance: 10, capacitance: 1000 }, 1000), null, generator({ montage: "bridge" }));
assert.ok(relativeError(filteredBridge.rippleApprox, filteredBridge.iChMean / (2 * 1000 * 1e-6)) < 1e-9, "pont : Δv_o ≈ I_o/(2fC)");

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

console.log("redresseur : tous les tests passent");
