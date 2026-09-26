"use strict";

const assert = require("node:assert/strict");

global.window = {};
require("../topologies/thyristor.js");

const model = window.converterModels.thyristor;
const options = (overrides = {}) => ({ montage: "single", frequency: 50, ...overrides });
const state = (overrides = {}) => ({ ...model.defaults, ...overrides });
const relativeError = (actual, expected) => Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12);

assert.equal(model.id, "thyristor");
assert.equal(model.defaults.vinRms, 230);
assert.deepEqual(model.controlsFor().top.map((item) => item.key), ["alpha", "resistance", "inductance"]);
assert.equal(model.axesFor("single", false)[1].label.es, "corrientes");
assert.equal(model.axesFor("triac", true)[1].label.fr, "courants");

const singleR = model.calculate(state({ alpha: 60, inductance: 0 }), null, options());
const expectedSingleR = Math.SQRT2 * model.defaults.vinRms * (1 + Math.cos(Math.PI / 3)) / (2 * Math.PI);
assert.ok(relativeError(singleR.vChMean, expectedSingleR) < .02, "single-SCR R-load mean voltage follows the closed-form law");
assert.ok(relativeError(singleR.vChRms, singleR.analyticalRms) < .02, "single-SCR RMS voltage follows the alpha-only resistive law");
assert.equal("betaDegrees" in singleR, false);
assert.equal("conductionDegrees" in singleR, false);

const single110 = model.calculate(state({ vinRms: 110, alpha: 60, inductance: 0 }), null, options());
assert.ok(relativeError(single110.vChRms / singleR.vChRms, 110 / 230) < .01, "RMS load voltage scales with the selected mains voltage");
assert.ok(relativeError(single110.pCh / singleR.pCh, (110 / 230) ** 2) < .02, "active power scales with the square of the selected mains voltage");

const triacR = model.calculate(state({ alpha: 60, inductance: 0 }), null, options({ montage: "triac" }));
assert.ok(Math.abs(triacR.vChMean) < .1, "the symmetric TRIAC output has zero average voltage");
assert.ok(relativeError(triacR.vChRms, triacR.analyticalRms) < .02, "TRIAC RMS voltage follows the alpha-only resistive law");
assert.ok(relativeError(triacR.vChRms / singleR.vChRms, Math.SQRT2) < .01, "controlling both half-cycles increases RMS voltage by sqrt(2)");
assert.ok(relativeError(triacR.pCh / singleR.pCh, 2) < .01, "TRIAC R-load power is twice the half-wave SCR power");
assert.ok(triacR.points.some((point) => point.vCh > 0) && triacR.points.some((point) => point.vCh < 0));

const singleRl = model.calculate(state({ alpha: 60, inductance: 100 }), null, options());
assert.ok(singleRl.points.some((point) => point.vCh < 0 && point.iCh > 0), "stored energy produces a negative-voltage conduction tail");

const triacRl = model.calculate(state({ alpha: 60, inductance: 100 }), null, options({ montage: "triac" }));
assert.ok(triacRl.points.some((point) => point.iCh > 0) && triacRl.points.some((point) => point.iCh < 0), "TRIAC carries both current polarities");
assert.ok(triacRl.points.some((point) => point.vCh < 0 && point.iCh > 0), "R-L current can persist after a source zero crossing");

const lateFiring = model.calculate(state({ alpha: 150, inductance: 0 }), null, options({ montage: "triac" }));
assert.ok(lateFiring.vChRms < triacR.vChRms, "delaying alpha reduces TRIAC RMS voltage");
assert.ok(lateFiring.pCh < triacR.pCh, "delaying alpha reduces active load power");

assert.equal(singleRl.characteristicPoints.length, 35);
assert.equal(singleRl.characteristicPoints.filter((point) => Number.isFinite(point.pOperating)).length, 1);
assert.equal(singleRl.characteristicPoints.filter((point) => Number.isFinite(point.vOperating)).length, 1);
assert.ok(singleRl.characteristicPoints[0].pActive > singleRl.characteristicPoints.at(-1).pActive);
assert.ok(singleRl.characteristicPoints.every((point) => Number.isFinite(point.pActive) && Number.isFinite(point.vRms)));

const singleAdvanced = model.plotsFor("single");
assert.ok(singleAdvanced.second.some((trace) => trace.key === "iCh"));
assert.ok(!singleAdvanced.second.some((trace) => trace.key === "iIn"));
assert.ok(!singleAdvanced.second.some((trace) => trace.key === "iT1" || trace.key === "iT34"));
assert.ok(model.plotsFor("triac").main.some((trace) => trace.label === "v<sub>TRIAC</sub>"));
assert.ok(!model.plotsFor("triac").second.some((trace) => trace.key === "iT1" || trace.key === "iT34" || trace.key === "g34"));
assert.equal(model.basicPlotsFor().length, 3);

for (const result of [singleR, single110, triacR, singleRl, triacRl, lateFiring]) {
  assert.ok(result.points.length > 1000);
  assert.ok(result.points.every((point) => [point.t, point.vIn, point.vCh, point.vT1, point.iCh, point.iIn].every(Number.isFinite)));
  assert.ok(Number.isFinite(result.powerFactor) && Math.abs(result.powerFactor) <= 1);
  assert.ok(Number.isFinite(result.vChRms));
}

console.log("thyristor model: all tests passed");
