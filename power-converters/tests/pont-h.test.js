"use strict";

const assert = require("node:assert/strict");

global.window = {};
require("../topologies/pont-h.js");

const model = window.converterModels["pont-h"];
const state = (overrides = {}) => ({ ...model.defaults, ...overrides });
const relativeError = (actual, expected) => Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12);

assert.equal(model.id, "pont-h");

// --- Pont + LC : la charge R–L n'est plus figée ---
const lc = model.controlsFor("standalone", { filter: "lc", advanced: true });
assert.deepEqual(lc.top.map((item) => item.key), ["fundamentalFrequency", "modulation", "switchingFrequency", "dcVoltage"]);
assert.deepEqual(lc.bottom.map((item) => [item.key, item.unit]), [["filterInductance", "mH"], ["filterCapacitance", "µF"], ["loadResistance", "Ω"], ["loadInductance", "mH"]]);
assert.deepEqual([model.defaults.loadResistance, model.defaults.loadInductance], [12, 20]);

// I_o,1 = V_o,1 / |R_o + jωL_o| (le filtre LC laisse passer le fondamental).
[{}, { loadResistance: 30, loadInductance: 5 }, { loadResistance: 6, loadInductance: 0 }, { loadResistance: 2, loadInductance: 0, switchingFrequency: 2000 }].forEach((overrides) => {
  const result = model.calculate(state(overrides), null, { application: "standalone", filter: "lc" });
  assert.equal(result.filter, "lc");
  assert.ok(Number.isFinite(result.currentRms), `LC ${JSON.stringify(overrides)} : simulation stable`);
  assert.ok(relativeError(result.currentRms, result.expectedCurrentRms) < .02, `LC ${JSON.stringify(overrides)} : I_o = V_o,1/|Z_o|`);
});
// L_o = 0 : charge résistive, courant en phase avec la tension.
assert.ok(Math.abs(model.calculate(state({ loadInductance: 0 }), null, { filter: "lc" }).phaseDegrees) < 1, "L_o = 0 : φ ≈ 0");

// --- Générateur + RC (TP) : curseurs ---
const rc = model.controlsFor("standalone", { filter: "rc", advanced: true });
assert.deepEqual(rc.bottom.map((item) => [item.key, item.unit]), [["rcResistance", "kΩ"], ["rcCapacitance", "µF"], ["generatorVoltage", "V"]]);
[...rc.top, ...rc.bottom].forEach((item) => ["en", "fr", "es"].forEach((lang) => assert.ok(item.label[lang], `libellé ${item.key} en ${lang}`)));
assert.equal(model.plotsFor("standalone", "bipolar", "transient", "pwm", "rc"), model.plotsFor("standalone", "unipolar", "transient", "pwm", "rc"));
assert.equal(model.axesFor("standalone", true, { filter: "rc" })[2].unit, "mA");
assert.match(model.diagramFor("standalone", "bipolar", "fr", "pwm", "rc"), /R<tspan class="sub">g<\/tspan> = 50 Ω/);

// Premier ordre : V_o,1 = (mV_in/√2)/√(1+(f_1/f_c)²), φ_1 = −arctan(f_1/f_c), f_c = 1/(2π(R_g+R)C).
[
  {},
  { rcResistance: 10, rcCapacitance: 10 },
  { rcResistance: .1, rcCapacitance: .1, switchingFrequency: 30000 },
  { fundamentalFrequency: 200, modulation: 100, generatorVoltage: 10 },
].forEach((overrides) => ["bipolar", "unipolar"].forEach((switching) => {
  const s = state(overrides); const label = `RC ${switching} ${JSON.stringify(overrides)}`;
  const result = model.calculate(s, null, { application: "standalone", filter: "rc", switching });
  const cutoff = 1 / (2 * Math.PI * (50 + s.rcResistance * 1000) * s.rcCapacitance * 1e-6);
  const ratio = s.fundamentalFrequency / cutoff;
  assert.equal(result.filter, "rc");
  assert.ok(relativeError(result.cutoff, cutoff) < 1e-12, `${label} : f_c`);
  assert.ok(relativeError(result.fundamentalVoltageRms, s.modulation / 100 * s.generatorVoltage / Math.SQRT2 / Math.hypot(1, ratio)) < .02, `${label} : V_o,1`);
  assert.ok(Math.abs(result.phaseDegrees + Math.atan(ratio) * 180 / Math.PI) < 1, `${label} : φ_1`);
  assert.ok(Math.abs(result.currentBalance) < 1e-3 * result.currentRms + 1e-9, `${label} : ⟨i_C⟩ = 0`);
}));

// Plus f_c est basse devant f_PWM, plus la sortie est propre.
const thdAt = (rcCapacitance) => model.calculate(state({ rcCapacitance }), null, { filter: "rc" }).thd;
assert.ok(thdAt(10) < thdAt(1) && thdAt(1) < thdAt(.1), "THD décroît quand C augmente");

console.log("pont-h : tous les tests passent");
