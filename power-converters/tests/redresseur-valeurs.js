"use strict";
/* Valeurs du modèle du redresseur, en JSON, pour la vérification indépendante
   (tests/verification-redresseur.py) : un objet par cas, avec les grandeurs simulées et les
   formules affichées par le panneau « Régime permanent ». Les unités sont celles du modèle
   (SI), pas celles des curseurs.

     node tests/redresseur-valeurs.js */

const assert = require("node:assert/strict");

global.window = {};
require("../topologies/redresseur.js");

const model = window.converterModels.redresseur;

// Les deux familles de l'énoncé : le montage de TP au générateur (1 kHz) et un cas réseau.
// Les capacités sont données en nanofarads, comme dans la clé partagée avec le script Python.
const familles = [
  { amplitude: 10, frequency: 1000, resistance: 10e3, nanofarads: [0, 100, 1000] },
  { amplitude: 17, frequency: 50, resistance: 100, nanofarads: [0, 1e6] },
];

const cas = [];
familles.forEach(({ amplitude, frequency, resistance, nanofarads }) => {
  nanofarads.forEach((nf) => {
    ["simple", "pont"].forEach((montage) => {
      [0, .6].forEach((vd0) => {
        const generateur = frequency === 1000;
        // Mode générateur : les curseurs portent R en kΩ et C en nF ; sinon Ω et µF.
        const state = {
          ...model.defaultsFor({ frequency }),
          vinRms: amplitude / Math.SQRT2,
          resistance: generateur ? resistance / 1e3 : resistance,
          capacitance: generateur ? nf : nf / 1e3,
        };
        const options = {
          montage: montage === "pont" ? "bridge" : "single",
          view: "steady",
          diodes: vd0 > 0 ? "real" : "ideal",
          frequency,
        };
        const result = model.calculate(state, null, options);
        assert.ok(Math.abs(result.threshold - vd0) < 1e-12, "seuil de diode conforme au modèle choisi");
        assert.ok(Math.abs(result.resistance - resistance) / resistance < 1e-12, "R converti en ohms");
        assert.ok(Math.abs(result.capacitance - nf / 1e9) <= 1e-18, "C converti en farads");
        cas.push({
          cle: [montage, `${vd0}`, `${amplitude}`, `${frequency}`, `${resistance}`, `${nf}`].join("|"),
          simulation: {
            voMax: result.vChMax,
            voMoyen: result.vChMean,
            ondulation: result.vChRipple,
            ioMoyen: result.iChMean,
            ioEfficace: result.iChRms,
            facteurDeForme: result.formFactor,
            angleDeConduction: result.conductionDegrees,
            tensionInverse: Math.abs(result.piv),
            courantDeCrete: result.iD1Peak,
          },
          formules: {
            voMaxFormule: result.peakFormula,
            voMoyenFormule: result.meanFormula,
            tensionInverseFormule: result.pivFormula,
            ondulationFormule: result.rippleApprox,
            moyenneAvecCFormule: result.meanWithCapFormula,
            frequenceOndulation: result.rippleFrequency,
            hypotheseRC: result.hasCapacitor && result.timeConstant >= 5 / result.rippleFrequency,
          },
        });
      });
    });
  });
});

console.log(JSON.stringify(cas, null, 1));
