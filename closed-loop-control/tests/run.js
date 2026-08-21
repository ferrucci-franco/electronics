'use strict';
/* Banc d'essai des fonctions pures — `node tests/run.js` depuis apps/laplace-explorer.
   Aucune dépendance : Node charge model.js et tex.js dans un contexte vide, ces
   deux fichiers ne touchant pas au DOM. Les panneaux, eux, ne sont pas testables
   ici — ils dessinent, et c'est l'œil qui juge.

   Chaque cas porte sur quelque chose qui s'est déjà cassé ou qui se casserait en
   silence : les coefficients des polynômes, la valeur de H(jω), la fenêtre du
   Bode, et l'écriture TeX, qu'aucun test de rendu ne rattraperait. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------- chargement ----------
const js = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(js('model.js') + '\nglobalThis.Model = Model;', ctx);
vm.runInContext(js('tex.js') + '\nglobalThis.TeX = TeX;', ctx);
// time.js garde son simulateur pur derrière une fine couche DOM. Des éléments
// minimaux suffisent à le charger ici et permettent de tester la saturation et
// la DDE sans navigateur.
const fakeEls = new Map();
const fakeClassList = { add(){}, remove(){}, toggle(){} };
const fakeEl = id => {
  if (!fakeEls.has(id)) fakeEls.set(id, {
    id, value: '', checked: false, disabled: false, title: '', clientWidth: 600, clientHeight: 300,
    classList: fakeClassList, style: {}, addEventListener(){}, closest(){ return this; },
    setAttribute(){}, appendChild(){}, querySelectorAll(){ return []; }, innerHTML: ''
  });
  return fakeEls.get(id);
};
ctx.document = { getElementById: fakeEl, querySelectorAll: () => [] };
ctx.t = key => key;
ctx.App = { render(){} };
vm.runInContext(js('time.js') + '\nglobalThis.TimeResp = TimeResp;', ctx);
const { Model, TeX, TimeResp } = ctx;

// ---------- harnais ----------
let vus = 0, ratés = [];
function cas(nom, fn){
  vus++;
  try { fn(); }
  catch (e){ ratés.push({ nom, msg: e.message }); }
}
function eq(obtenu, attendu, quoi){
  const a = JSON.stringify(obtenu), b = JSON.stringify(attendu);
  if (a !== b) throw new Error(`${quoi || ''}\n      obtenu  : ${a}\n      attendu : ${b}`);
}
function proche(obtenu, attendu, tol, quoi){
  if (!(Math.abs(obtenu - attendu) <= tol))
    throw new Error(`${quoi || ''} obtenu ${obtenu}, attendu ${attendu} ± ${tol}`);
}
const arrondi = (a, n) => a.map(v => +v.toFixed(n));

// ---------- fabrique d'états ----------
// On écrit directement dans state : addElement place les éléments à des
// positions par défaut, on veut des valeurs choisies. Et reset() recharge
// l'exemple d'accueil au lieu de vider — on vide donc à la main.
function vide(){
  Model.reset();
  Model.state.poles.length = 0;
  Model.state.zeros.length = 0;
  // État neutre pour les tests unitaires : l'exemple d'accueil peut avoir des
  // gains non unitaires sans contaminer les cas qui construisent leur propre H.
  Model.state.K = 1;
  Model.state.blockGains = { controller: 1, sensor: 1 };
  Model.state.controller.mode = 'free';
}
function pose({ poles = [], zeros = [], K = null } = {}){
  vide();
  let i = 0;
  const el = (o, kind) => ({ id: kind + (++i), type: o.omega === undefined ? 'real' : 'pair',
                             sigma: o.sigma, omega: o.omega, mult: o.mult || 1 });
  for (const p of poles) Model.state.poles.push(el(p, 'p'));
  for (const z of zeros) Model.state.zeros.push(el(z, 'z'));
  if (K === null) Model.setKAuto(true); else Model.setK(K);
}

// ================= exemple d'accueil =================

cas('accueil : plante −1 ± j4,9, contrôleur P et réponse temporelle seule', () => {
  Model.reset();
  eq(Model.counts(), { n: 2, m: 0 });
  const plant = Model.state.poles.find(p => p.owner === 'plant');
  proche(plant.sigma, -1, 1e-12);
  proche(plant.omega, 4.9, 1e-12);
  proche(Model.evalTransferHjw('P', 0).mag, 1, 1e-12);
  eq(Model.state.controller.mode, 'pid');
  eq(Model.state.controller.pid.structure, 'P');
  proche(Model.state.controller.pid.Kp, 1, 1e-12);
  if (!Model.closedLoopPoles().every(p => p.sigma < 0)) throw new Error('la boucle initiale doit être stable');
  eq(Model.state.view.showBode, false);
  eq(Model.state.view.showTime, true);
  eq(Model.state.view.bodeFunctions, ['L']);
  eq(Model.state.view.bodeMode, 'bode');
  eq(Model.state.view.bodeShowPhase, true);
  eq(Model.state.view.timeSignals, ['r', 'y']);
  eq(Model.state.view.timeExperiment, 'closed');
  eq(Model.state.view.timePlantSignals, ['r', 'y']);
});

cas('marges : elles appartiennent à L(s) et ne dépendent pas de la fenêtre affichée', () => {
  Model.reset();
  const a = Model.stabilityMargins();
  Model.setPlaneWindow(-20, 3, -30, 30);
  const b = Model.stabilityMargins();
  if (a.pm === null) throw new Error('la boucle initiale doit avoir une marge de phase finie');
  eq(a.gm, null);
  proche(a.pm, b.pm, 1e-9);
  proche(a.wc, b.wc, 1e-9);
  eq(b.gm, null);
  eq(a.w180, b.w180);
});

// ================= polynômes =================

cas('polys : une paire conjuguée donne s² − 2σs + (σ²+ω²)', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }] });
  eq(Model.polys().den, [1, 2, 5]);
});

cas('polys : un pôle réel double donne (s+3)² = s² + 6s + 9', () => {
  pose({ poles: [{ sigma: -3, mult: 2 }] });
  eq(Model.polys().den, [1, 6, 9]);
});

cas('polys : numérateur vide = 1, l\'ordre est décroissant en s', () => {
  pose({ poles: [{ sigma: -1 }] });
  eq(Model.polys().num, [1]);
  eq(Model.polys().den, [1, 1]);
});

cas('polys : produit de deux paires, degré 4', () => {
  pose({ poles: [{ sigma: -1, omega: 1 }, { sigma: -2, omega: 3 }] });
  // (s²+2s+2)(s²+4s+13) = s⁴+6s³+23s²+34s+26
  eq(Model.polys().den, [1, 6, 23, 34, 26]);
});

cas('counts : une paire compte pour deux, la multiplicité multiplie', () => {
  pose({ poles: [{ sigma: -1, omega: 1, mult: 2 }, { sigma: -3 }], zeros: [{ sigma: -2 }] });
  eq(Model.counts(), { n: 5, m: 1 });
});

// ================= appartenance P / C / S =================

cas('propriétaire : les racines historiques sans propriétaire restent dans la plante', () => {
  pose({ poles: [{ sigma: -1 }], zeros: [{ sigma: -2 }] });
  eq(Model.inventoryData().map(row => row.owner), ['plant', 'plant']);
});

cas('propriétaire : le bloc actif reçoit les nouvelles racines', () => {
  vide();
  Model.setActiveBlock('controller');
  const res = Model.addElement('pole', 'real');
  eq(res.ok, true);
  eq(Model.find(res.id).el.owner, 'controller');
});

cas('interface : la saturation peut être le bloc actif sans devenir propriétaire de racines', () => {
  vide();
  Model.setActiveBlock('saturation');
  eq(Model.ui.activeBlock, 'saturation');
  eq(Model.ACTIVE_BLOCKS.includes('saturation'), true);
  eq(Model.OWNERS.includes('saturation'), false);
  Model.setActiveBlock('inconnu');
  eq(Model.ui.activeBlock, 'saturation');
});

cas('propriétaire : l’édition réassigne une racine sans changer H(s)', () => {
  pose({ poles: [{ sigma: -2 }], K: 3 });
  const id = Model.state.poles[0].id;
  const avant = Model.polys().den.slice();
  const res = Model.editElement(id, { sigma: -2, omega: 0, mult: 1, owner: 'sensor' });
  eq(res.ok, true);
  eq(Model.find(id).el.owner, 'sensor');
  eq(Model.polys().den, avant);
});

cas('propriétaire : deux racines de blocs différents ne fusionnent pas', () => {
  pose({ poles: [{ sigma: -1 }, { sigma: -2 }] });
  const [a, b] = Model.state.poles;
  a.owner = 'plant'; b.owner = 'controller';
  Model.dragTo(a.id, b.sigma, 0, 100, 100);
  const res = Model.endDrag(a.id, 100, 100);
  eq(res.fused, undefined);
  eq(Model.state.poles.length, 2);
});

cas('multibloc : chaque bloc possède une gain indépendant', () => {
  vide();
  Model.setK(3);
  Model.setActiveBlock('controller'); Model.setK(4);
  Model.setActiveBlock('sensor'); Model.setK(5);
  proche(Model.gainOf('plant'), 3, 1e-12);
  proche(Model.gainOf('controller'), 4, 1e-12);
  proche(Model.gainOf('sensor'), 5, 1e-12);
});

cas('multibloc : L = C·P·S et T = CP/(1+CPS)', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.poles.push({ id: 'ps', owner: 'sensor', type: 'real', sigma: -2, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 2;
  Model.state.blockGains.sensor = 1;
  eq(Model.transferPolys('P'), { num: [1], den: [1, 1] });
  eq(Model.transferPolys('C'), { num: [2], den: [1] });
  eq(Model.transferPolys('S'), { num: [1], den: [1, 2] });
  eq(Model.transferPolys('L'), { num: [2], den: [1, 3, 2] });
  eq(Model.transferPolys('T'), { num: [2, 4], den: [1, 3, 4] });
});

cas('multibloc : les signaux internes partagent le dénominateur en boucle fermée', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.poles.push({ id: 'ps', owner: 'sensor', type: 'real', sigma: -2, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 2;
  Model.state.blockGains.sensor = 1;
  eq(Model.signalTransferPolys('e'), { num: [1, 3, 2], den: [1, 3, 4] });
  eq(Model.signalTransferPolys('ucmd'), { num: [2, 6, 4], den: [1, 3, 4] });
  eq(Model.signalTransferPolys('u'), { num: [2, 6, 4], den: [1, 3, 4] });
  eq(Model.signalTransferPolys('y'), { num: [2, 4], den: [1, 3, 4] });
  eq(Model.signalTransferPolys('ym'), { num: [2], den: [1, 3, 4] });
});

// ================= contrôleur PID lié =================

cas('PID : les quatre structures donnent la fonction parallèle filtrée', () => {
  vide();
  Model.resetPid('P');
  Model.setPidParams({ Kp: 2 });
  eq(Model.transferPolys('C'), { num: [2], den: [1] });
  Model.setPidStructure('PI');
  Model.setPidParams({ Kp: 2, Ki: 3 });
  eq(Model.transferPolys('C'), { num: [2, 3], den: [1, 0] });
  Model.setPidStructure('PD');
  Model.setPidParams({ Kp: 2, Kd: 0.5, N: 10 });
  eq(Model.transferPolys('C'), { num: [7, 20], den: [1, 10] });
  Model.setPidStructure('PID');
  Model.setPidParams({ Kp: 2, Ki: 3, Kd: 0.5, N: 10 });
  eq(Model.transferPolys('C'), { num: [7, 23, 30], den: [1, 10, 0] });
});

cas('PID canonique : Kp multiplie tout le contrôleur et Ti/Td fixent sa forme', () => {
  vide();
  Model.resetPid('PID');
  Model.setPidCanonicalParams({ Kp: 2, Ti: 4, Td: 0.25 });
  proche(Model.state.controller.pid.Ki, 0.5, 1e-12);
  proche(Model.state.controller.pid.Kd, 0.5, 1e-12);
  eq(Model.transferPolys('C'), { num: [7, 20.5, 5], den: [1, 10, 0] });
  Model.setPidCanonicalParams({ Kp: 4 });
  proche(Model.state.controller.pid.Ki, 1, 1e-12);
  proche(Model.state.controller.pid.Kd, 1, 1e-12);
  eq(Model.transferPolys('C'), { num: [14, 41, 10], den: [1, 10, 0] });
  eq(Model.pidCanonicalParams(), { Kp: 4, Ti: 4, Td: 0.25, N: 10 });
});

cas('PID : passer en libre puis revenir conserve exactement C(s)', () => {
  vide();
  Model.resetPid('PID');
  Model.setPidParams({ Kp: 2, Ki: 3, Kd: 0.5, N: 10 });
  const avant = Model.transferPolys('C');
  eq(Model.setControllerMode('free').ok, true);
  eq(arrondi(Model.transferPolys('C').num, 9), arrondi(avant.num, 9));
  eq(arrondi(Model.transferPolys('C').den, 9), arrondi(avant.den, 9));
  eq(Model.setControllerMode('pid').ok, true);
  eq(arrondi(Model.transferPolys('C').num, 8), arrondi(avant.num, 8));
  eq(arrondi(Model.transferPolys('C').den, 8), arrondi(avant.den, 8));
});

cas('PID : déplacer le zéro d’un PI recalcule Ki et conserve Kp', () => {
  vide();
  Model.resetPid('PI');
  Model.setPidParams({ Kp: 2, Ki: 4 });
  const zero = Model.state.zeros.find(el => el.owner === 'controller');
  Model.dragTo(zero.id, -3, 0, 100, 100);
  Model.endDrag(zero.id, 100, 100);
  proche(Model.state.controller.pid.Kp, 2, 1e-12);
  proche(Model.state.controller.pid.Ki, 6, 1e-12);
  proche(Model.pidCanonicalParams().Ti, 1 / 3, 1e-12);
  eq(Model.transferPolys('C'), { num: [2, 6], den: [1, 0] });
});

cas('PID : déplacer une paire de zéros recalcule Kp, Ki et Kd', () => {
  vide();
  Model.resetPid('PID');
  Model.setPidParams({ Kp: 1, Ki: 10, Kd: 1, N: 10 });
  const pair = Model.state.zeros.find(el => el.owner === 'controller' && el.type === 'pair');
  Model.dragTo(pair.id, -2, 1, 100, 100);
  Model.endDrag(pair.id, 100, 100);
  proche(Model.state.controller.pid.Kp, 3.85, 1e-10);
  proche(Model.state.controller.pid.Ki, 5.5, 1e-10);
  proche(Model.state.controller.pid.Kd, 0.715, 1e-10);
  eq(arrondi(Model.transferPolys('C').num, 9), [11, 44, 55]);
});

cas('PID : déplacer le pôle du filtre met à jour N sans déplacer l’intégrateur', () => {
  vide();
  Model.resetPid('PID');
  const filter = Model.state.poles.find(el => el.structuralRole === 'filter');
  const integrator = Model.state.poles.find(el => el.structuralRole === 'integrator');
  Model.dragTo(filter.id, -5, 0, 100, 100);
  Model.endDrag(filter.id, 100, 100);
  proche(Model.state.controller.pid.N, 5, 1e-12);
  proche(Model.find(integrator.id).el.sigma, 0, 1e-12);
  eq(Model.transferPolys('C').den, [1, 5, 0]);
});

cas('PID : une conversion non réalisable est refusée sans modifier le mode libre', () => {
  vide();
  Model.setActiveBlock('controller');
  Model.state.poles.push({ id: 'pc1', owner: 'controller', type: 'pair', sigma: -1, omega: 2, mult: 1 });
  Model.state.blockGains.controller = 1;
  const avant = Model.transferPolys('C');
  eq(Model.setControllerMode('pid').ok, false);
  eq(Model.state.controller.mode, 'free');
  eq(Model.transferPolys('C'), avant);
});

cas('multibloc : evalTransferHjw(T) vérifie CP/(1+L)', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 2;
  const t0 = Model.evalTransferHjw('T', 0);
  proche(t0.re, 2 / 3, 1e-12);
  proche(t0.im, 0, 1e-12);
});

cas('multibloc : los polos calculados de T salen de su ecuación característica', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.poles.push({ id: 'ps', owner: 'sensor', type: 'real', sigma: -2, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 2;
  const roots = Model.closedLoopPoles();
  eq(roots.length, 2);
  for (const z of roots){
    proche(z.sigma, -1.5, 1e-8);
    proche(Math.abs(z.omega), Math.sqrt(7) / 2, 1e-8);
  }
  const zeros = Model.closedLoopZeros();
  eq(zeros.length, 1);
  proche(zeros[0].sigma, -2, 1e-10);
  proche(zeros[0].omega, 0, 1e-10);
});

cas('multibloc : evalTransferComplex applique le retard hors de l’axe jω', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  Model.setDelay(0.5);
  const h = Model.evalTransferComplex('P', 1, 0);
  proche(h.re, Math.exp(-0.5) / 2, 1e-12);
  proche(h.im, 0, 1e-12);
});

cas('root locus : κ=1 coïncide avec les pôles de T', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  const locus = Model.rootLocus();
  eq(locus.length, 1);
  const atOne = locus[0].find(p => Math.abs(p.kappa - 1) < 1e-12);
  proche(atOne.sigma, -2, 1e-9);
  proche(atOne.omega, 0, 1e-9);
  proche(Model.closedLoopPoles()[0].sigma, atOne.sigma, 1e-9);
});

cas('root locus : κ exploré ne modifie pas C avant application', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 2;
  const avant = Model.transferPolys('C').num.slice();
  eq(Model.setRootLocusKappa(3).ok, true);
  eq(Model.transferPolys('C').num, avant);
  proche(Model.rootLocusPoles()[0].sigma, -7, 1e-9);
});

cas('root locus : appliquer κ multiplie le contrôleur libre et recentre κ à 1', () => {
  vide();
  Model.state.blockGains.controller = 2;
  Model.setRootLocusKappa(3);
  eq(Model.applyRootLocusKappa().ok, true);
  proche(Model.state.blockGains.controller, 6, 1e-12);
  proche(Model.state.exploration.kappa, 1, 1e-12);
});

cas('root locus : appliquer κ multiplie ensemble Kp, Ki et Kd du PID', () => {
  vide();
  Model.resetPid('PID');
  const N = Model.state.controller.pid.N;
  Model.setRootLocusKappa(2.5);
  Model.applyRootLocusKappa();
  proche(Model.state.controller.pid.Kp, 2.5, 1e-12);
  proche(Model.state.controller.pid.Ki, 2.5, 1e-12);
  proche(Model.state.controller.pid.Kd, 0.25, 1e-12);
  proche(Model.state.controller.pid.N, N, 1e-12);
});

cas('root locus : branches denses et continues autour d’un point de rupture', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'pair', sigma: -1.73, omega: 1.9, mult: 1 });
  Model.state.zeros.push({ id: 'zp', owner: 'plant', type: 'real', sigma: -1.41, mult: 1 });
  Model.state.K = 1.38;
  const branches = Model.rootLocus();
  eq(branches.length, 2);
  for (const branch of branches){
    let maxCurvedStep = 0;
    for (let i = 1; i < branch.length; i++){
      const a = branch[i - 1], b = branch[i];
      if (Math.abs(a.sigma) > 6 || Math.abs(b.sigma) > 6) continue;
      if (Math.abs(a.omega) < 1e-8 && Math.abs(b.omega) < 1e-8) continue;
      maxCurvedStep = Math.max(maxCurvedStep, Math.hypot(b.sigma - a.sigma, b.omega - a.omega));
    }
    eq(maxCurvedStep < 0.3, true, 'pas trop grand près de la rupture');
  }
});

cas('multibloc : la causalité se vérifie por bloque', () => {
  vide();
  eq(Model.addElement('pole', 'real').ok, true);
  Model.setActiveBlock('controller');
  eq(Model.addElement('zero', 'real').ok, false, 'un polo de planta no habilita un cero de controlador');
});

// ================= gain automatique =================

cas('K auto : H(0) = 1 pour une paire (|p|² = 5)', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }] });
  proche(Model.state.K, 5, 1e-12);
  proche(Model.evalHjw(0).mag, 1, 1e-12, 'H(0)');
});

cas('K auto : avec un zéro, H(0) = 1 aussi', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], zeros: [{ sigma: -4 }] });
  proche(Model.evalHjw(0).mag, 1, 1e-12, 'H(0)');
});

cas('K auto : un pôle à l\'origine désactive la normalisation sans changer K', () => {
  vide();
  Model.state.K = 7;
  Model.state.poles.push({ id: 'p0', owner: 'plant', type: 'real', sigma: 0, mult: 1 });
  eq(Model.setKAuto(true).ok, false);
  proche(Model.state.K, 7, 1e-12);
  eq(Model.kAutoOf('plant'), false);
  eq(Model.canNormalizeDc('plant'), false);
});

cas('K auto : un zéro à l\'origine empêche aussi une valeur statique unitaire', () => {
  vide();
  Model.state.K = 4;
  Model.state.zeros.push({ id: 'z0', owner: 'plant', type: 'real', sigma: 0, mult: 1 });
  eq(Model.setKAuto(true).ok, false);
  proche(Model.state.K, 4, 1e-12);
  eq(Model.kAutoOf('plant'), false);
});

cas('K auto : le capteur peut maintenir S(0) = 1', () => {
  vide();
  Model.state.poles.push({ id: 'ps', owner: 'sensor', type: 'real', sigma: -2, mult: 1 });
  Model.setActiveBlock('sensor');
  eq(Model.setKAuto(true).ok, true);
  proche(Model.state.blockGains.sensor, 2, 1e-12);
  proche(Model.evalTransferHjw('S', 0).mag, 1, 1e-12);
});

cas('K auto : le contrôleur reste toujours manuel', () => {
  vide();
  Model.setActiveBlock('controller');
  Model.state.blockGains.controller = 3;
  eq(Model.setKAuto(true).ok, false);
  proche(Model.state.blockGains.controller, 3, 1e-12);
  eq(Model.kAutoOf('controller'), false);
});

// ================= saturation et retard dans la boucle =================

const sampleSignal = (sim, name, tv) => {
  let i = 0;
  while (i + 1 < sim.t.length && sim.t[i + 1] <= tv) i++;
  return sim.signals[name][i];
};

cas('entrée trapézoïdale : la référence monte linéairement puis reste à 1', () => {
  vide();
  Model.state.view.timeT = 4;
  Model.setInput({ type: 'trapezoid', riseTime: 2 });
  const sim = TimeResp.simulate();
  eq(sim.type, 'trapezoid');
  proche(sampleSignal(sim, 'r', 1), 0.5, 3e-3);
  proche(sampleSignal(sim, 'r', 3), 1, 1e-12);
  proche(sampleSignal(sim, 'y', 1), 0.25, 3e-3);
  proche(sim.steady.y, 0.5, 1e-12);
});

cas('entrée trapézoïdale : la durée automatique inclut le temps de montée', () => {
  vide();
  Model.setInput({ type: 'trapezoid', riseTime: 3 });
  Model.state.view.timeT = null;
  const sim = TimeResp.simulate();
  eq(sim.T >= 3, true);
  proche(sim.signals.r[sim.signals.r.length - 1], 1, 1e-12);
});

cas('entrée trapézoïdale : elle reste correcte dans la simulation saturée', () => {
  vide();
  Model.state.view.timeT = 2;
  Model.setInput({ type: 'trapezoid', riseTime: 1 });
  Model.setSaturation({ enabled: true, min: -0.2, max: 0.2 });
  const sim = TimeResp.simulate();
  proche(sampleSignal(sim, 'r', 0.5), 0.5, 3e-3);
  eq(Math.max(...sim.signals.u) <= 0.2 + 1e-12, true);
});

cas('échelon : amplitude et second palier définissent toute la consigne', () => {
  vide();
  Model.state.view.timeT = 6;
  Model.setInput({ type: 'step', amplitude: 2, secondEnabled: true,
    secondTime: 3, secondValue: -1 });
  const sim = TimeResp.simulate();
  proche(sampleSignal(sim, 'r', 1), 2, 1e-12);
  proche(sampleSignal(sim, 'r', 4), -1, 1e-12);
  proche(sampleSignal(sim, 'y', 1), 1, 1e-12);
  proche(sampleSignal(sim, 'y', 4), -0.5, 1e-12);
  proche(sim.steady.r, -1, 1e-12);
  proche(sim.steady.y, -0.5, 1e-12);
});

cas('échelon trapézoïdal : le second palier utilise le même temps de montée', () => {
  vide();
  Model.state.view.timeT = 4;
  Model.setInput({ type: 'trapezoid', amplitude: 2, riseTime: 1,
    secondEnabled: true, secondTime: 2, secondValue: 0 });
  const sim = TimeResp.simulate();
  proche(sampleSignal(sim, 'r', 0.5), 1, 4e-3);
  proche(sampleSignal(sim, 'r', 1.5), 2, 1e-12);
  proche(sampleSignal(sim, 'r', 2.5), 1, 4e-3);
  proche(sampleSignal(sim, 'r', 3.5), 0, 1e-12);
  proche(sim.steady.r, 0, 1e-12);
});

cas('sinusoïde : l’amplitude multiplie la référence et sa réponse fréquentielle', () => {
  vide();
  Model.state.view.timeT = 2 * Math.PI;
  Model.setInput({ type: 'sine', omegaIn: 1, amplitude: -3 });
  const sim = TimeResp.simulate();
  proche(sampleSignal(sim, 'r', Math.PI / 2), -3, 4e-3);
  proche(sim.frequency.r.mag, 3, 1e-12);
  proche(sim.frequency.y.mag, 1.5, 1e-12);
});

cas('impulsion : l’amplitude représente son aire', () => {
  vide();
  Model.state.view.timeT = 2;
  Model.setInput({ type: 'impulse', amplitude: 2 });
  const sim = TimeResp.simulate();
  proche(sim.direct.r, 2, 1e-12);
  proche(sim.direct.y, 1, 1e-12);
});

cas('second palier : la durée automatique inclut la seconde transition', () => {
  vide();
  Model.state.view.timeT = null;
  Model.setInput({ type: 'trapezoid', riseTime: 2, secondEnabled: true,
    secondTime: 7, secondValue: 0 });
  const sim = TimeResp.simulate();
  eq(sim.T >= 9, true);
});

cas('essai de plante : P(s) reçoit directement l’entrée sans C(s) ni S(s)', () => {
  vide();
  Model.state.K = 3;
  Model.state.blockGains.controller = 40;
  Model.state.blockGains.sensor = 7;
  Model.state.view.timeExperiment = 'plant';
  Model.state.view.timeT = 2;
  Model.setInput({ type: 'step', amplitude: 2 });
  const sim = TimeResp.simulate();
  proche(sampleSignal(sim, 'r', 1), 2, 1e-12);
  proche(sampleSignal(sim, 'y', 1), 6, 1e-12);
  proche(sim.steady.y, 6, 1e-12);
});

cas('essai de plante : le retard de P reste actif et la saturation est ignorée', () => {
  vide();
  Model.state.view.timeExperiment = 'plant';
  Model.state.view.timeT = 3;
  Model.setInput({ type: 'step', amplitude: 2 });
  Model.setDelay(1);
  Model.setSaturation({ enabled: true, min: -0.2, max: 0.2 });
  const sim = TimeResp.simulate();
  proche(sampleSignal(sim, 'r', 0.5), 2, 1e-12);
  proche(sampleSignal(sim, 'y', 0.5), 0, 1e-12);
  proche(sampleSignal(sim, 'y', 1.5), 2, 1e-12);
});

cas('essai de plante : l’impulsion conserve son aire malgré la saturation globale', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.view.timeExperiment = 'plant';
  Model.state.view.timeT = 2;
  Model.setSaturation({ enabled: true, min: -0.2, max: 0.2 });
  Model.setInput({ type: 'impulse', amplitude: 2 });
  const sim = TimeResp.simulate();
  eq(sim.type, 'impulse');
  proche(sim.signals.y[0], 2, 1e-12);
});

cas('saturation : les limites invalides sont refusées sans modifier l’état', () => {
  vide();
  const before = { ...Model.state.saturation };
  eq(Model.setSaturation({ min: 2, max: -2 }).ok, false);
  eq(Model.state.saturation, before);
});

cas('saturation : u reste borné tandis que u_cmd peut dépasser la limite', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 10;
  Model.state.view.timeT = 3;
  Model.setSaturation({ enabled: true, min: -0.5, max: 0.5 });
  const sim = TimeResp.simulate();
  eq(Math.max(...sim.signals.u) <= 0.5 + 1e-12, true);
  eq(Math.min(...sim.signals.u) >= -0.5 - 1e-12, true);
  eq(Math.max(...sim.signals.ucmd) > 0.5, true);
  eq(sim.type, 'step');
});

cas('saturation : le PI utilise le clamping et ne laisse pas croître son intégrale', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  Model.resetPid('PI');
  Model.state.view.timeT = 8;
  Model.setSaturation({ enabled: true, min: -0.2, max: 0.2 });
  const sim = TimeResp.simulate();
  eq(Math.max(...sim.signals.ucmd) < 1.05, true, 'commande sans windup croissant');
  eq(Math.max(...sim.signals.u) <= 0.2 + 1e-12, true);
});

cas('saturation : activer la limite remplace une impulsion par un échelon', () => {
  vide();
  Model.setInput({ type: 'impulse' });
  Model.setSaturation({ enabled: true, min: -1, max: 1 });
  eq(Model.state.input.type, 'step');
});

cas('retard de plante : le signal retardé entre réellement dans P', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 2;
  Model.state.view.timeT = 3;
  Model.setDelay(1);
  const sim = TimeResp.simulate();
  eq(sim.signals.y.every((v, i) => sim.t[i] <= 1 ? Math.abs(v) < 2e-3 : true), true);
  proche(sampleSignal(sim, 'y', 1.5), 2 * (1 - Math.exp(-0.5)), 0.035,
    'avant le premier retour retardé, P reçoit une commande constante égale à 2');
});

cas('cancelación : un facteur exact est simplifié dans P et dans T', () => {
  vide();
  Model.state.poles.push({ id: 'p1', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.zeros.push({ id: 'z1', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.K = 1;
  eq(Model.transferPolys('P'), { num: [1], den: [1] });
  eq(Model.transferPolys('T'), { num: [1], den: [2] });
  eq(Model.closedLoopPoles().length, 0);
  eq(Model.cancellationInfo('P').length, 1);
});

cas('cancelación : une paire presque exacte est signalée et simplifiée par tolérance', () => {
  vide();
  Model.state.poles.push({ id: 'p1', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.zeros.push({ id: 'z1', owner: 'plant', type: 'real', sigma: -1.0000005, mult: 1 });
  const info = Model.cancellationInfo('P');
  eq(info.length, 1);
  eq(info[0].near, true);
  eq(Model.transferPolys('P').den, [1]);
});

cas('cancelación : un mode interne instable annulé reste averti', () => {
  vide();
  Model.state.poles.push({ id: 'p1', owner: 'plant', type: 'real', sigma: 1, mult: 1 });
  Model.state.zeros.push({ id: 'z1', owner: 'plant', type: 'real', sigma: 1, mult: 1 });
  Model.state.K = 1;
  const info = Model.allCancellationInfo();
  eq(info.some(c => c.which === 'P' && c.unstable), true);
  eq(Model.transferPolys('P'), { num: [1], den: [1] });
});

cas('robustesse : une réponse instable est arrêtée au seuil numérique', () => {
  vide();
  Model.state.poles.push({ id: 'pu', owner: 'plant', type: 'real', sigma: 1, mult: 1 });
  Model.state.K = 1;
  Model.state.blockGains.controller = 0.1;
  Model.state.view.timeT = 30;
  const sim = TimeResp.simulate();
  eq(sim.diverged, true);
  eq(sim.T < 30, true);
});

cas('robustesse : l’ordre total du lazo est borné à 12', () => {
  vide();
  for (let i = 0; i < 4; i++)
    Model.state.poles.push({ id: 'pp' + i, owner: 'plant', type: 'pair', sigma: -1-i, omega: 1, mult: 1 });
  for (let i = 0; i < 2; i++)
    Model.state.poles.push({ id: 'ps' + i, owner: 'sensor', type: 'pair', sigma: -5-i, omega: 1, mult: 1 });
  eq(Model.counts().n, 12);
  Model.setActiveBlock('controller');
  const add = Model.addElement('pole', 'real');
  eq(add.ok, false);
  eq(add.msg, 'msgLoopNmax');
  const pid = Model.resetPid('PID');
  eq(pid.ok, false);
  eq(pid.msg, 'msgLoopNmax');
});

// ================= évaluation en jω =================

cas('evalHjw : premier ordre, |H| = 1/√(1+ω²) et φ = −arctan ω', () => {
  pose({ poles: [{ sigma: -1 }], K: 1 });
  for (const w of [0, 0.5, 1, 3, 20]){
    const h = Model.evalHjw(w);
    proche(h.mag, 1 / Math.sqrt(1 + w * w), 1e-12, `|H| en ω=${w}`);
    proche(Math.atan2(h.im, h.re), -Math.atan(w), 1e-12, `φ en ω=${w}`);
  }
});

cas('evalHjw : à la pulsation propre, la phase d\'un second ordre vaut −90°', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], K: 1 });     // ωₙ² = 5
  const h = Model.evalHjw(Math.sqrt(5));
  proche(Math.atan2(h.im, h.re) * 180 / Math.PI, -90, 1e-9);
});

cas('evalHjw : un pôle sur l\'axe jω fait diverger |H| à sa pulsation', () => {
  pose({ poles: [{ sigma: 0, omega: 3 }], K: 1 });
  eq(Model.evalHjw(3).mag, Infinity);
});

cas('evalHjw : un zéro sur l\'axe jω annule |H| à sa pulsation', () => {
  pose({ poles: [{ sigma: -1, omega: 1 }], zeros: [{ sigma: 0, omega: 2 }], K: 1 });
  proche(Model.evalHjw(2).mag, 0, 1e-12);
});

cas('evalHjw : le signe de K bascule la phase de 180°', () => {
  pose({ poles: [{ sigma: -1 }], K: -1 });
  const h = Model.evalHjw(0);
  // atan2 rend ±180° sur le demi-axe réel négatif : c'est le même angle
  proche(Math.abs(Math.atan2(h.im, h.re) * 180 / Math.PI), 180, 1e-12);
});

// ================= fenêtre du Bode =================

cas('bodeWindow : en linéaire, min = 0 et max = le rang partagé', () => {
  pose({ poles: [{ sigma: -1 }] });
  Model.setView({ logScale: false });
  Model.setPlaneWindow(-5, 5, -10, 40);
  const w = Model.bodeWindow();
  eq([w.log, w.min, w.max], [false, 0, 40]);
});

cas('bodeWindow : en log, min = max/10^décades', () => {
  pose({ poles: [{ sigma: -1 }] });
  Model.setView({ logScale: true, omegaLogDecades: 3 });
  Model.setPlaneWindow(-5, 5, -10, 200);
  const w = Model.bodeWindow();
  eq([w.log, w.dec], [true, 3]);
  proche(w.min, 0.2, 1e-12);
});

cas('bodeWindow : les décades sont bornées à [1, 8]', () => {
  pose({ poles: [{ sigma: -1 }] });
  Model.setView({ logScale: true, omegaLogDecades: 42 });
  eq(Model.bodeWindow().dec, 8);
  Model.setView({ omegaLogDecades: 0 });
  eq(Model.bodeWindow().dec, 1);
});

cas('bodeWindow : ω_max ≤ 0 ne produit pas de fenêtre absurde', () => {
  pose({ poles: [{ sigma: -1 }] });
  Model.setView({ logScale: true, omegaLogDecades: 2 });
  Model.setPlaneWindow(-5, 5, -10, 0);
  const w = Model.bodeWindow();
  if (!(w.max > 0 && w.min > 0 && w.min < w.max))
    throw new Error(`fenêtre [${w.min}, ${w.max}]`);
});

// ================= racines dessinées =================

cas('rootPoints : une paire donne deux points conjugués, un réel en ω = 0', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], zeros: [{ sigma: -3 }] });
  const pts = Model.rootPoints();
  eq(pts.map(p => [p.kind, p.sigma, p.omega]),
     [['zero', -3, 0], ['pole', -1, 2], ['pole', -1, -2]]);
});

// ================= édition depuis l'inventaire =================

cas('editElement : un champ vidé est refusé (Number("") vaut 0)', () => {
  pose({ poles: [{ sigma: -2, omega: 3 }] });
  const id = Model.state.poles[0].id;
  const r = Model.editElement(id, { sigma: '', omega: '3', mult: '1' });
  eq(r.ok, false);
  eq(Model.state.poles[0].sigma, -2, 'le pôle n\'a pas bougé');
});

cas('editElement : un pôle peut être placé dans le semiplano derecho', () => {
  pose({ poles: [{ sigma: -2 }] });
  const id = Model.state.poles[0].id;
  Model.editElement(id, { sigma: '5', omega: '0', mult: '1' });
  eq(Model.state.poles[0].sigma, 5);
});

cas('editElement : pas de multiplicité > 1 sur l\'axe jω', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }] });
  const id = Model.state.poles[0].id;
  eq(Model.editElement(id, { sigma: '0', omega: '2', mult: '2' }).ok, false);
});

cas('editElement : m ≤ n est protégé', () => {
  pose({ poles: [{ sigma: -1 }], zeros: [{ sigma: -2 }] });
  const id = Model.state.zeros[0].id;
  eq(Model.editElement(id, { sigma: '-2', omega: '0', mult: '3' }).ok, false);
});

cas('addElement : n ≤ N_MAX et m ≤ n', () => {
  vide();
  for (let k = 0; k < Model.N_MAX / 2; k++) eq(Model.addElement('pole', 'pair').ok, true);
  eq(Model.addElement('pole', 'real').ok, false, 'au-delà de N_MAX');
  vide();
  eq(Model.addElement('zero', 'real').ok, false, 'un zéro sans pôle');
});

// ================= écriture TeX =================
// Ces chaînes sont ce que l'étudiant lit. Une régression y serait muette :
// KaTeX rend sans broncher une formule fausse.

cas('TeX factorisée : paire conjuguée, gain omis quand K = 1', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], K: 1 });
  eq(TeX.all().fact, 'H(s) = \\dfrac{1}{(s + 1 - 2j)(s + 1 + 2j)}');
});

cas('TeX multibloc : P et S n’affichent que leurs propres racines', () => {
  vide();
  Model.state.poles.push({ id: 'pp', owner: 'plant', type: 'real', sigma: -1, mult: 1 });
  Model.state.poles.push({ id: 'ps', owner: 'sensor', type: 'real', sigma: -2, mult: 1 });
  Model.state.K = 3;
  Model.state.blockGains.sensor = 4;
  eq(TeX.all('P').fact, 'P(s) = 3 \\cdot \\dfrac{1}{(s + 1)}');
  eq(TeX.all('S').fact, 'S(s) = 4 \\cdot \\dfrac{1}{(s + 2)}');
  eq(TeX.all('T').fact, 'T(s) = \\dfrac{C(s)P(s)}{1 + C(s)P(s)S(s)}');
});

cas('TeX factorisée : multiplicité en exposant, gain affiché', () => {
  pose({ poles: [{ sigma: -3, mult: 2 }], K: 4 });
  eq(TeX.all().fact, 'H(s) = 4 \\cdot \\dfrac{1}{(s + 3)^{2}}');
});

cas('TeX factorisée : paire dégénérée (ω = 0) = un facteur au carré', () => {
  pose({ poles: [{ sigma: -2, omega: 0 }], K: 1 });
  eq(TeX.all().fact, 'H(s) = \\dfrac{1}{(s + 2)^{2}}');
});

cas('TeX développée : coefficient 1 omis, s¹ sans exposant', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], K: 1 });
  eq(TeX.all().expd, 'H(s) = \\dfrac{1}{s^{2} + 2s + 5}');
});

cas('TeX équation différentielle : points jusqu\'à 3, puis y^(4)', () => {
  pose({ poles: [{ sigma: -1, omega: 1 }, { sigma: -2, omega: 3 }], K: 1 });
  eq(TeX.all().ode, 'y^{(4)} + 6\\dddot{y} + 23\\ddot{y} + 34\\dot{y} + 26y = u');
});

cas('TeX module : produit de racines carrées, dénominateur factorisé', () => {
  pose({ poles: [{ sigma: -1, omega: 7 }], zeros: [{ sigma: -5 }], K: 1 });
  eq(TeX.all().mod,
     '\\left|H(j\\omega)\\right| = \\dfrac{\\sqrt{\\omega^{2} + 25}}' +
     '{\\sqrt{(\\omega - 7)^{2} + 1}\\,\\sqrt{(\\omega + 7)^{2} + 1}}');
});

cas('TeX phase : la fraction reste écrite même quand a = 1', () => {
  // régression : simplifier « /1 » faisait passer les deux facteurs de la paire
  // pour des termes laissés en plan à côté de leurs voisins
  pose({ poles: [{ sigma: -1, omega: 7 }], zeros: [{ sigma: -5 }], K: 1 });
  const arg = TeX.all().arg;
  const n = s => (arg.match(new RegExp(s, 'g')) || []).length;
  eq([n('arctan'), n('\\\\dfrac')], [3, 3], 'autant de fractions que d\'arctangentes');
  eq(arg, '\\arg H(j\\omega) = \\arctan \\dfrac{\\omega}{5}' +
          ' - \\arctan \\dfrac{\\omega - 7}{1} - \\arctan \\dfrac{\\omega + 7}{1}');
});

cas('TeX phase : multiplicité = coefficient, pas exposant', () => {
  pose({ poles: [{ sigma: -3, mult: 2 }], K: 1 });
  eq(TeX.all().arg, '\\arg H(j\\omega) = -2\\,\\arctan \\dfrac{\\omega}{3}');
  eq(TeX.all().mod,
     '\\left|H(j\\omega)\\right| = \\dfrac{1}{\\left(\\sqrt{\\omega^{2} + 9}\\right)^{2}}');
});

cas('TeX : pôle à l\'origine → module ω, phase 90°', () => {
  pose({ poles: [{ sigma: 0 }, { sigma: -4 }], K: 1 });
  eq(TeX.all().mod,
     '\\left|H(j\\omega)\\right| = \\dfrac{1}{\\omega\\,\\sqrt{\\omega^{2} + 16}}');
  eq(TeX.all().arg,
     '\\arg H(j\\omega) = -90^\\circ - \\arctan \\dfrac{\\omega}{4}');
});

cas('TeX : paire sur l\'axe jω → sgn(ω − ω₀)·90°, le signe dépend de ω', () => {
  pose({ poles: [{ sigma: 0, omega: 5 }], K: 1 });
  eq(TeX.all().arg,
     '\\arg H(j\\omega) = -\\mathrm{sgn}(\\omega - 5)\\,90^\\circ' +
     ' - \\mathrm{sgn}(\\omega + 5)\\,90^\\circ');
});

cas('TeX : zéro à déphasage non minimal → 180° − arctan', () => {
  pose({ poles: [{ sigma: -2 }], zeros: [{ sigma: 3 }], K: 1 });
  eq(TeX.all().arg,
     '\\arg H(j\\omega) = \\left(180^\\circ - \\arctan \\dfrac{\\omega}{3}\\right)' +
     ' - \\arctan \\dfrac{\\omega}{2}');
});

cas('TeX : K < 0 met |K| au module et ouvre la phase par +180°', () => {
  pose({ poles: [{ sigma: -3 }], K: -2 });
  eq(TeX.all().mod, '\\left|H(j\\omega)\\right| = 2 \\cdot \\dfrac{1}{\\sqrt{\\omega^{2} + 9}}');
  eq(TeX.all().arg, '\\arg H(j\\omega) = 180^\\circ - \\arctan \\dfrac{\\omega}{3}');
});

cas('TeX : système vide', () => {
  pose({ K: -4 });
  eq(TeX.all().fact, 'H(s) = -4');
  eq(TeX.all().mod, '\\left|H(j\\omega)\\right| = 4');
  eq(TeX.all().arg, '\\arg H(j\\omega) = 180^\\circ');
});

cas('TeX fmtC : 3 chiffres significatifs, notation scientifique aux extrêmes', () => {
  eq(TeX.fmtC(1234.5678), '1230');
  eq(TeX.fmtC(0.00012345), '1.23 \\cdot 10^{-4}');
  eq(TeX.fmtC(-45678), '-4.57 \\cdot 10^{4}');
  eq(TeX.fmtC(1e-15), '0');
});

// ================= retard pur (cahier §1 bis) =================

cas('retard : le module de H(jω) est strictement inchangé', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], zeros: [{ sigma: -5 }], K: 3 });
  const sans = [0, 0.5, 2, 7, 30].map(w => Model.evalHjw(w).mag);
  for (const T of [0.1, 0.5, 2]){
    Model.setDelay(T);
    [0, 0.5, 2, 7, 30].forEach((w, i) =>
      proche(Model.evalHjw(w).mag, sans[i], 1e-12 * Math.max(1, sans[i]), `T=${T}, ω=${w}`));
  }
});

cas('retard : la phase perd exactement 57,3·T·ω degrés', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], K: 1 });
  const deg = h => Math.atan2(h.im, h.re) * 180 / Math.PI;
  const sans = [0.3, 1, 4].map(w => deg(Model.evalHjw(w)));
  const T = 0.35;
  Model.setDelay(T);
  [0.3, 1, 4].forEach((w, i) => {
    const attendu = sans[i] - w * T * 180 / Math.PI;
    const obtenu = deg(Model.evalHjw(w));
    // comparaison modulo 360° : atan2 replie
    const e = Math.atan2(Math.sin((obtenu - attendu) * Math.PI / 180),
                         Math.cos((obtenu - attendu) * Math.PI / 180));
    proche(e, 0, 1e-12, `ω=${w}`);
  });
});

cas('retard : H(0) = 1 tient toujours, le gain auto n\'est pas touché', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }] });          // K auto
  Model.setDelay(1.5);
  proche(Model.evalHjw(0).mag, 1, 1e-12);
});

cas('retard : le déroulement de la phase est décoché à la première valeur', () => {
  pose({ poles: [{ sigma: -1 }], K: 1 });
  Model.setView({ bodeUnwrap: true });
  Model.setDelay(0.5);
  eq(Model.state.view.bodeUnwrap, false);
  Model.setView({ bodeUnwrap: true });                 // l'utilisateur le recoche
  Model.setDelay(0.8);                                 // on ne force qu'une fois
  eq(Model.state.view.bodeUnwrap, true);
});

cas('retard : valeurs négatives ramenées à 0, reset l\'efface', () => {
  pose({ poles: [{ sigma: -1 }], K: 1 });
  Model.setDelay(-3);
  eq(Model.state.delay, 0);
  Model.setDelay(2);
  Model.reset();
  eq(Model.state.delay, 0);
});

cas('TeX retard : e^(−Ts) devant la fraction, jamais dedans', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], K: 1 });
  Model.setDelay(0.5);
  eq(TeX.all().fact, 'H(s) = e^{-0.5s} \\cdot \\dfrac{1}{(s + 1 - 2j)(s + 1 + 2j)}');
  eq(TeX.all().expd, 'H(s) = e^{-0.5s} \\cdot \\dfrac{1}{s^{2} + 2s + 5}');
});

cas('TeX retard : équation différentielle en forme directe', () => {
  pose({ poles: [{ sigma: -1, omega: 2 }], K: 1 });
  Model.setDelay(0.5);
  eq(TeX.all().ode,
     '\\ddot{y}(t) + 2\\dot{y}(t) + 5y(t) = u(t - 0.5)');
});

cas('TeX retard : le module ne gagne pas un seul facteur', () => {
  pose({ poles: [{ sigma: -3 }], K: 1 });
  const sans = TeX.all().mod;
  Model.setDelay(1.2);
  eq(TeX.all().mod, sans);
});

cas('TeX retard : la phase gagne un terme linéaire en ω', () => {
  pose({ poles: [{ sigma: -3 }], K: 1 });
  Model.setDelay(0.5);
  eq(TeX.all().arg, '\\arg H(j\\omega) = -\\arctan \\dfrac{\\omega}{3} - 28.6\\,\\omega');
});

// ================= cohérence entre les deux écritures =================
// Le module écrit à la ligne du dessous doit valoir |H(jω)| calculé par le
// modèle : c'est le seul lien qui garantit que la formule affichée est vraie.

cas('cohérence : la formule du module redonne |H(jω)| numériquement', () => {
  const configs = [
    { poles: [{ sigma: -1, omega: 2 }], zeros: [{ sigma: -5 }], K: 3 },
    { poles: [{ sigma: -0.5, omega: 7 }, { sigma: -4 }], K: -2 },
    { poles: [{ sigma: -3, mult: 2 }], K: 1 },
    { poles: [{ sigma: -1 }, { sigma: -2, omega: 6 }], zeros: [{ sigma: 3 }], K: 1 }
  ];
  for (const cfg of configs){
    pose(cfg);
    // module reconstruit à la main depuis les facteurs, comme la formule l'écrit
    const facteur = (el, w) => {
      const a = -el.sigma, m = (el.type === 'pair' && el.omega === 0) ? el.mult * 2 : el.mult;
      const parts = (el.type === 'pair' && el.omega !== 0)
        ? [w - el.omega, w + el.omega] : [w];
      return parts.reduce((p, im) => p * Math.pow(Math.hypot(a, im), m), 1);
    };
    for (const w of [0, 0.3, 1, 2.5, 7, 30]){
      const num = Model.state.zeros.reduce((p, el) => p * facteur(el, w), 1);
      const den = Model.state.poles.reduce((p, el) => p * facteur(el, w), 1);
      const attendu = Math.abs(Model.state.K) * num / den;
      proche(Model.evalHjw(w).mag, attendu, 1e-9 * Math.max(1, attendu),
             `|H| en ω=${w} pour ${JSON.stringify(cfg)}`);
    }
  }
});

cas('cohérence : la somme des arctangentes redonne arg H(jω)', () => {
  const configs = [
    { poles: [{ sigma: -1, omega: 2 }], zeros: [{ sigma: -5 }], K: 3 },
    { poles: [{ sigma: -0.5, omega: 7 }, { sigma: -4 }], K: 1 },
    { poles: [{ sigma: -3, mult: 2 }], zeros: [{ sigma: -1 }], K: 1 }
  ];
  const rad = d => d * Math.PI / 180;
  for (const cfg of configs){
    pose(cfg);
    const somme = (el, w) => {
      const a = -el.sigma, m = (el.type === 'pair' && el.omega === 0) ? el.mult * 2 : el.mult;
      const parts = (el.type === 'pair' && el.omega !== 0)
        ? [w - el.omega, w + el.omega] : [w];
      return parts.reduce((s, im) => s + m * Math.atan(im / a), 0);
    };
    for (const w of [0.3, 1, 2.5, 7, 30]){
      const phi = Model.state.zeros.reduce((s, el) => s + somme(el, w), 0)
                - Model.state.poles.reduce((s, el) => s + somme(el, w), 0)
                + (Model.state.K < 0 ? rad(180) : 0);
      const h = Model.evalHjw(w);
      const ecart = Math.atan2(Math.sin(Math.atan2(h.im, h.re) - phi),
                               Math.cos(Math.atan2(h.im, h.re) - phi));
      proche(ecart, 0, 1e-9, `φ en ω=${w} pour ${JSON.stringify(cfg)}`);
    }
  }
});

// ---------- verdict ----------
for (const r of ratés) console.log(`  ✗ ${r.nom}\n      ${r.msg}`);
console.log(`\n${vus - ratés.length}/${vus} cas passés` +
            (ratés.length ? ` — ${ratés.length} en échec\n` : '\n'));
process.exit(ratés.length ? 1 : 0);
