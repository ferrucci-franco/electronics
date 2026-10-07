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
// Plages étendues (montage au générateur : L_f jusqu'à 100 mH, C_f de 100 nF à 100 µF, R_o jusqu'à 1 kΩ,
// L_o jusqu'à 100 mH, V_dc dès 3 V) : la simulation reste stable aux extrêmes et le fondamental suit
// V_o,1 = |H(jω_1)| mV_dc/√2.
const ranges = Object.fromEntries([...lc.top, ...lc.bottom].map((item) => [item.key, [item.min, item.max]]));
assert.deepEqual([ranges.filterInductance[1], ranges.filterCapacitance, ranges.loadResistance[1], ranges.loadInductance[1], ranges.dcVoltage[0]], [100, [.1, 100], 1000, 100, 3]);
const lcFirstOrder = (s) => {
  // |H| pour L_o = 0 : v_o / v_ab avec Z_C = r_d + 1/(jωC_f) parallèle à R_o, puis diviseur par jωL_f.
  const w = 2 * Math.PI * s.fundamentalFrequency; const lf = s.filterInductance / 1000; const cf = s.filterCapacitance / 1e6; const rd = 1.5;
  const zc = [rd, -1 / (w * cf)]; const r = s.loadResistance; const den = [r + zc[0], zc[1]]; const dd = den[0] ** 2 + den[1] ** 2;
  const zp = [(r * zc[0] * den[0] + r * zc[1] * den[1]) / dd, (r * zc[1] * den[0] - r * zc[0] * den[1]) / dd];
  const total = [zp[0], zp[1] + w * lf];
  return Math.hypot(...zp) / Math.hypot(...total) * s.modulation / 100 * s.dcVoltage / Math.SQRT2;
};
[
  { filterInductance: 100, filterCapacitance: 1, loadResistance: 1000, loadInductance: 0, dcVoltage: 5 },
  { filterInductance: 100, filterCapacitance: 100, loadResistance: 1000, loadInductance: 0 },
  { filterInductance: .5, filterCapacitance: .1, loadResistance: 2, loadInductance: 0, switchingFrequency: 2000 },
  { filterInductance: 100, filterCapacitance: .1, loadResistance: 1000, loadInductance: 0, dcVoltage: 3 },
].forEach((overrides) => {
  const s = state(overrides); const result = model.calculate(s, null, { filter: "lc" }); const label = `LC ${JSON.stringify(overrides)}`;
  assert.ok(relativeError(result.expectedVoltageRms, lcFirstOrder(s)) < 1e-6, `${label} : |H| des phaseurs`);
  assert.ok(relativeError(result.fundamentalVoltageRms, result.expectedVoltageRms) < .02, `${label} : V_o,1 simulée`);
});
[{ loadResistance: 1000, loadInductance: 1 }, { filterInductance: .5, filterCapacitance: .1, loadResistance: 1000, loadInductance: 1, switchingFrequency: 2000 }, { fundamentalFrequency: 20, switchingFrequency: 30000, filterInductance: 100, filterCapacitance: 100, loadResistance: 2, loadInductance: 100 }].forEach((overrides) => {
  const result = model.calculate(state(overrides), null, { filter: "lc" });
  assert.ok(Number.isFinite(result.fundamentalVoltageRms) && Number.isFinite(result.currentRms), `LC ${JSON.stringify(overrides)} : stable`);
  // I_o efficace ≈ fondamental seulement si le filtre coupe sous f_PWM (sinon les harmoniques MLI passent).
  if (result.resonance < (overrides.switchingFrequency || model.defaults.switchingFrequency) / 2) assert.ok(relativeError(result.currentRms, result.expectedCurrentRms) < .02, `LC ${JSON.stringify(overrides)} : I_o = V_o,1/|Z_o|`);
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

// --- Générateur + LC (TP) : R_g = 50 Ω et R_L du bobinage en série avec L_f, C_f ∥ R_o ---
const glc = model.controlsFor("standalone", { filter: "glc", advanced: true });
assert.deepEqual(glc.top.map((item) => item.key), ["fundamentalFrequency", "modulation", "switchingFrequency", "generatorVoltage"]);
assert.deepEqual(glc.bottom.map((item) => [item.key, item.unit, item.min, item.max]), [["glcInductance", "mH", .5, 100], ["glcCapacitance", "µF", .1, 100], ["glcLoadResistance", "kΩ", .1, 10], ["glcWindingResistance", "Ω", 0, 200]]);
assert.deepEqual([model.defaults.glcInductance, model.defaults.glcCapacitance, model.defaults.glcLoadResistance, model.defaults.glcWindingResistance], [100, 1, 1, 0]);
[...glc.top, ...glc.bottom].forEach((item) => ["en", "fr", "es"].forEach((lang) => assert.ok(item.label[lang], `libellé ${item.key} en ${lang}`)));
assert.equal(model.axesFor("standalone", true, { filter: "glc" })[2].unit, "mA");
assert.match(model.diagramFor("standalone", "bipolar", "fr", "pwm", "glc"), /generator-schematic/);
// V_o,1 = |Z_p / (Z_p + R_g + R_L + jωL_f)| mV_in/√2, Z_p = R_o ∥ 1/(jωC_f).
const glcFundamental = (s) => {
  const w = 2 * Math.PI * s.fundamentalFrequency; const r = s.glcLoadResistance * 1000; const c = s.glcCapacitance * 1e-6; const lf = s.glcInductance / 1000;
  const zp = [r / (1 + (w * r * c) ** 2), -w * r * r * c / (1 + (w * r * c) ** 2)];
  const total = [zp[0] + 50 + s.glcWindingResistance, zp[1] + w * lf];
  return Math.hypot(...zp) / Math.hypot(...total) * s.modulation / 100 * s.generatorVoltage / Math.SQRT2;
};
[{}, { glcWindingResistance: 120 }, { glcLoadResistance: 10, glcCapacitance: 100 }, { glcInductance: .5, glcCapacitance: .1, switchingFrequency: 2000 }].forEach((overrides) => ["bipolar", "unipolar"].forEach((switching) => {
  const s = state(overrides); const result = model.calculate(s, null, { filter: "glc", switching }); const label = `GLC ${switching} ${JSON.stringify(overrides)}`;
  assert.equal(result.filter, "glc");
  assert.equal(result.sourceResistance, 50 + s.glcWindingResistance);
  assert.ok(relativeError(result.expectedVoltageRms, glcFundamental(s)) < 1e-6, `${label} : |H| des phaseurs`);
  assert.ok(relativeError(result.fundamentalVoltageRms, result.expectedVoltageRms) < .02, `${label} : V_o,1 simulée`);
  assert.ok(Math.abs(result.voltageBalance) < .02 * s.generatorVoltage, `${label} : ⟨v_Lf⟩ = 0`);
}));
// R_L amortit : la résonance (100 mH + 100 µF ≈ 50 Hz) est moins haute avec un bobinage résistif.
const peak = (glcWindingResistance) => model.calculate(state({ glcCapacitance: 100, glcLoadResistance: 10, glcWindingResistance }), null, { filter: "glc" }).fundamentalVoltageRms;
assert.ok(peak(100) < peak(0), "R_L amortit la résonance");

// Plus f_c est basse devant f_PWM, plus la sortie est propre.
const thdAt = (rcCapacitance) => model.calculate(state({ rcCapacitance }), null, { filter: "rc" }).thd;
assert.ok(thdAt(10) < thdAt(1) && thdAt(1) < thdAt(.1), "THD décroît quand C augmente");

console.log("pont-h : tous les tests passent");
