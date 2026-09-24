/* ============================================================
   MOTEUR DE SIMULATION — appli « Douche »
   ------------------------------------------------------------
   Module PUR : aucune dépendance au DOM, aucune ressource réseau.
   Conçu pour être copié tel quel dans l'appli « thermostat »
   (§10 de la spec) — la partie réutilisable est :
     · PRNG mulberry32 (déterminisme par graine)
     · système du 1er ordre + retard pur par tampon circulaire
     · perturbations
     · lois de commande (intégrale simple, PID anti-windup)
     · calcul de score
   Seule la fonction `sRobinet` est spécifique à la douche.

   Testable en Node : `require('./douche-sim.js')`.
   Chargé en <script> classique dans le navigateur (file:// OK).
   ============================================================ */
(function (racine) {
  'use strict';

  /* ==========================================================
     1. PRNG déterministe — mulberry32
     Deux postes à graine égale voient le même monde (§9).
     ========================================================== */
  function mulberry32(graine) {
    var a = graine >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ==========================================================
     2. Robinet — la non-linéarité centrale (§4.1)
     ----------------------------------------------------------
     s(θ) : zone morte, montée douce, MÉSETA, falaise, saturation.
     Vaut exactement 0 avant θ_zm et 1 après θ_sat.
     Voir CONFIG.PHYSIQUE.robinet pour le pourquoi de cette forme
     (une sigmoïde simple était quasi droite dans la bande utile).
     ========================================================== */
  function sRobinet(theta, par) {
    var x = (theta - par.theta_zm) / (par.theta_sat - par.theta_zm);
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Somme de deux logistiques bien séparées : montée douce, méséta,
    // falaise. Normalisée pour valoir exactement 0 en x = 0 et 1 en
    // x = 1. Le gain reste strictement positif partout, donc la courbe
    // est toujours inversible (indispensable au feedforward du N2).
    var sig = function (v, k, c) { return 1 / (1 + Math.exp(-k * (v - c))); };
    var brut = function (v) {
      return par.poids * sig(v, par.k1, par.c1) + (1 - par.poids) * sig(v, par.k2, par.c2);
    };
    var b0 = brut(0), b1 = brut(1);
    return (brut(x) - b0) / (b1 - b0);
  }

  /* Paramètres du robinet tirés du numéro de douche : zone morte,
     raideur et position de la falaise (§4.1) → la calibration du
     voisin ne sert à rien. */
  function parametresRobinet(cfg, graineDouche) {
    var rnd = mulberry32(graineDouche ^ 0x9E3779B9);
    var PH = cfg.PHYSIQUE;
    var base = PH.robinet;
    var f = function (amp) {
      return 1 + (rnd() * 2 - 1) * (amp === undefined ? PH.variabilite : amp);
    };
    return {
      theta_zm: base.theta_zm * f(),
      theta_sat: base.theta_sat,
      poids: base.poids,
      k1: base.k1,
      c1: base.c1,
      k2: base.k2 * f(),                          // raideur de la falaise
      c2: base.c2 * f(PH.variabilite_position)    // position de la falaise
    };
  }

  /* ==========================================================
     3. Profil de consigne (§4.7)
     Séquence de créneaux reproductible par graine, identique sur
     tous les postes d'une même graine → compétition équitable.
     ========================================================== */
  function construireProfil(cfg, graine) {
    var pr = cfg.PEDAGO.profil;
    var rnd = mulberry32(graine ^ 0x51ED2701);
    var paliers = [];
    var t = 0;
    var precedent = null;
    var total = pr.duree_totale;
    // On remplit une durée TOTALE imposée au lieu de compter les
    // paliers : tous les essais durent exactement le même temps et
    // tiennent entiers dans la fenêtre du graphe.
    for (var i = 0; t < total - 1e-9; i++) {
      var valeur;
      if (i === 0 && pr.premier_palier != null) {
        valeur = pr.premier_palier;
      } else {
        // On n'écarte pas seulement la répétition : on impose un SAUT
        // MINIMAL. Sans ça le tirage enchaînait des 38→40→35→40, des
        // écarts de 2 à 5 °C qu'on distingue à peine à l'écran.
        var candidats = pr.paliers_possibles.filter(function (v) {
          return Math.abs(v - precedent) >= (pr.amplitude_min || 0.001);
        });
        if (!candidats.length) {
          // aucun palier assez éloigné : on prend le plus éloigné.
          // (pas de boucle d'attente : le tirage doit rester borné)
          candidats = [pr.paliers_possibles.reduce(function (a, b) {
            return Math.abs(b - precedent) > Math.abs(a - precedent) ? b : a;
          })];
        }
        valeur = candidats[Math.floor(rnd() * candidats.length)];
      }
      precedent = valeur;
      var duree = pr.duree_min + rnd() * (pr.duree_max - pr.duree_min);
      // Si le reliquat était trop court pour un palier, on l'absorbe
      // dans celui-ci plutôt que de finir sur un palier ridicule.
      if ((total - t) - duree < pr.duree_min) duree = total - t;
      paliers.push({ t0: t, t1: t + duree, Tc: valeur });
      t += duree;
    }
    return { paliers: paliers, duree: total };
  }

  function consigneA(profil, t) {
    for (var i = 0; i < profil.paliers.length; i++) {
      if (t < profil.paliers[i].t1) return profil.paliers[i].Tc;
    }
    return profil.paliers[profil.paliers.length - 1].Tc;
  }

  /* Instants de perturbation cachés (mode « défi » N3 et manches N6). */
  function construireAutoPerturbations(cfg, graine, dureeProfil) {
    var ap = cfg.PEDAGO.auto_perturbations;
    var rnd = mulberry32(graine ^ 0x27D4EB2F);
    var t0 = dureeProfil * ap.debut_fraction;
    var t1 = dureeProfil * ap.fin_fraction;
    var evenements = [];
    for (var i = 0; i < ap.nb; i++) {
      // une fenêtre par tiers pour éviter les chevauchements
      var a = t0 + (t1 - t0) * (i / ap.nb);
      var b = t0 + (t1 - t0) * ((i + 1) / ap.nb);
      var debut = a + rnd() * Math.max(0, (b - a) * 0.4);
      var duree = ap.duree_min + rnd() * (ap.duree_max - ap.duree_min);
      evenements.push({
        type: rnd() < 0.6 ? 'voisin' : 'saison',
        debut: debut,
        fin: Math.min(debut + duree, b)
      });
    }
    return evenements;
  }

  /* ==========================================================
     4. Table de calibration → f⁻¹ (§4.6)
     Interpolation linéaire entre points, extrapolation PLATE aux
     bords. La table de l'étudiant est une liste de {theta, T}.
     ========================================================== */
  function inverserTable(points, T) {
    if (!points || points.length === 0) return null;
    // tri par température croissante (s(θ) est monotone ⇒ T l'est aussi)
    var p = points.slice().sort(function (a, b) { return a.T - b.T; });
    if (T <= p[0].T) return p[0].theta;                         // extrapolation plate
    if (T >= p[p.length - 1].T) return p[p.length - 1].theta;   // extrapolation plate
    for (var i = 0; i < p.length - 1; i++) {
      if (T <= p[i + 1].T) {
        var dT = p[i + 1].T - p[i].T;
        if (Math.abs(dT) < 1e-9) return p[i].theta;
        var k = (T - p[i].T) / dT;
        return p[i].theta + k * (p[i + 1].theta - p[i].theta);
      }
    }
    return p[p.length - 1].theta;
  }

  /* ==========================================================
     5. Simulateur
     ========================================================== */
  /* DEUX graines, et pas une seule.
     ------------------------------------------------------------
     La spec demande deux choses incompatibles avec un nombre unique :
       · §4.1 — chaque poste doit avoir une douche DIFFÉRENTE, sinon
         on recopie la calibration du voisin ;
       · §4.7/§8 — tous les postes doivent avoir le MÊME profil de
         consigne et les mêmes perturbations, sinon la compétition
         n'est pas équitable.
     Avec une graine unique, fixer la même valeur partout (pour
     l'équité) donne aussi la même courbe partout (donc recopiable).
     On sépare donc :
       graineDouche  → la courbe du robinet   (propre à chaque poste)
       graineSeance  → profil + perturbations (commun à la classe)
     Si graineSeance est omise, on retombe sur l'ancien comportement. */
  function creerSimulateur(cfg, graineDouche, graineSeance, angleInitial) {
    var PH = cfg.PHYSIQUE;
    var CM = cfg.COMMANDE;
    var SC = cfg.PEDAGO.score;

    var sim = {
      cfg: cfg,
      graineDouche: graineDouche,
      graineSeance: (graineSeance === undefined) ? graineDouche : graineSeance,
      par: null,        // paramètres du robinet (issus du numéro de douche)
      profil: null,
      autoPerturbations: [],
      // état
      t: 0,
      T: 0,             // température vraie en sortie
      theta: 0,         // angle réel du robinet
      thetaCible: 0,    // θ* produit par la loi de commande
      u: 50,            // potentiomètre (%)
      p: 1,             // pression relative (perturbation « voisin »)
      T_froid: 0,
      T_chaud: 0,
      // retard pur
      tampon: null,
      tamponIdx: 0,
      td: 0,
      // état des correcteurs
      integrale: 0,
      derniereTmes: 0,
      deriveeFiltree: 0,
      // score
      score: { integrale: 0, brulures: 0, gels: 0, total: 0 },
      _armeBrulure: true,
      _armeGel: true,
      // perturbations actives
      pertVoisin: false,
      pertSaison: false,
      termine: false
    };

    /* --- Remise à zéro complète -------------------------------- */
    /* `angleInitial` : la manche démarre AVEC le robinet là où il est
       (position du curseur, ou angle produit par la loi de commande),
       et la température part de l'équilibre correspondant. Sans ça on
       affichait « 90° » avec de l'eau à 24 °C, ce qui n'a pas de sens
       physique : à 90° l'eau est déjà tiède. */
    sim.reinitialiser = function (nouvelleDouche, nouvelleSeance, angleInitial) {
      if (nouvelleDouche !== undefined) sim.graineDouche = nouvelleDouche;
      if (nouvelleSeance !== undefined) sim.graineSeance = nouvelleSeance;
      sim.par = parametresRobinet(cfg, sim.graineDouche);
      sim.profil = construireProfil(cfg, sim.graineSeance);
      sim.autoPerturbations = construireAutoPerturbations(cfg, sim.graineSeance, sim.profil.duree);
      sim.t = 0;
      sim.T_froid = PH.T_froid;
      sim.T_chaud = PH.T_chaud;
      sim.p = PH.p_nominal;
      // À remettre à zéro AVANT de calculer la température initiale :
      // sinon une réinitialisation faite pendant « saison fraîche »
      // partait des arrivées froides.
      sim.pertVoisin = false;
      sim.pertSaison = false;
      var a0 = (typeof angleInitial === 'number' && isFinite(angleInitial)) ? angleInitial : 0;
      sim.theta = Math.max(PH.theta_min, Math.min(PH.theta_max, a0));
      sim.thetaCible = sim.theta;
      sim.u = 50;
      sim.T = sim.temperatureEquilibre(sim.theta);
      // tampon circulaire dimensionné pour le retard maximal
      var n = Math.ceil(PH.td_max / PH.dt) + 2;
      sim.tampon = new Float64Array(n);
      for (var i = 0; i < n; i++) sim.tampon[i] = sim.T;
      sim.tamponIdx = 0;
      sim.integrale = 0;
      sim.derniereTmes = sim.T;
      sim.deriveeFiltree = 0;
      sim.score = { integrale: 0, brulures: 0, gels: 0, total: 0 };
      // Un « événement » est une ENTRÉE dans la zone. Si la manche
      // démarre déjà dans une zone (robinet fermé ⇒ eau froide), on
      // désarme : sinon tout le monde écope d'un gel fantôme à t = 0.
      sim._armeBrulure = sim.T <= SC.seuil_brulure;
      sim._armeGel = sim.T >= SC.seuil_gel;
      sim.termine = false;
      return sim;
    };

    /* --- Modèle statique --------------------------------------- */
    sim.s = function (theta) { return sRobinet(theta, sim.par); };

    sim.temperatureEquilibre = function (theta) {
      var Tf = sim.pertSaison ? PH.perturbations.saison_T_froid : PH.T_froid;
      var Tc = sim.pertSaison ? PH.perturbations.saison_T_chaud : PH.T_chaud;
      return Tf + (Tc - Tf) * sRobinet(theta, sim.par) * sim.p;
    };

    /* --- Lecture retardée -------------------------------------- */
    sim.temperatureMesuree = function () {
      var n = sim.tampon.length;
      var retard = Math.round(sim.td / PH.dt);
      if (retard <= 0) return sim.T;
      if (retard >= n) retard = n - 1;
      var idx = (sim.tamponIdx - retard + n * 2) % n;
      return sim.tampon[idx];
    };

    /* --- Un pas de simulation ----------------------------------
       `e` (entrées) :
         mode        : 'angle' | 'ff' | 'fb' | 'pid'
         u           : potentiomètre 0–100 %
         td          : retard capteur (s)
         Kf          : gain de la loi intégrale (mode 'fb')
         pid         : {kp, ki, kd} (mode 'pid')
         table       : table de calibration (mode 'ff')
         voisin      : bool  — bouton de perturbation
         saison      : bool  — bouton de perturbation
         auto        : bool  — appliquer les perturbations cachées
         suivreProfil: bool  — la consigne vient du profil
         Tc          : consigne imposée si suivreProfil = false
       ---------------------------------------------------------- */
    sim.pas = function (e) {
      // `e.dt` permet de sous-échantillonner (niveau 0 : le curseur peut
      // sauter de 100° entre deux pas de 50 ms). Le tampon de retard est
      // indexé sur PH.dt, donc un dt personnalisé n'est valide que si
      // t_d = 0 — ce qui est le cas du niveau 0.
      var dt = (typeof e.dt === 'number' && e.dt > 0) ? e.dt : PH.dt;
      sim.td = Math.max(PH.td_min, Math.min(PH.td_max, e.td || 0));

      /* -- perturbations : boutons + instants cachés -- */
      var voisin = !!e.voisin, saison = !!e.saison;
      if (e.auto) {
        for (var i = 0; i < sim.autoPerturbations.length; i++) {
          var ev = sim.autoPerturbations[i];
          if (sim.t >= ev.debut && sim.t < ev.fin) {
            if (ev.type === 'voisin') voisin = true; else saison = true;
          }
        }
      }
      sim.pertSaison = saison;
      // « voisin » : p glisse vers sa cible en ~1 s (§4.5)
      var pCible = voisin ? PH.perturbations.voisin_p : PH.p_nominal;
      var pasP = (PH.p_nominal - PH.perturbations.voisin_p) / PH.perturbations.voisin_duree_rampe * dt;
      if (sim.p < pCible) sim.p = Math.min(pCible, sim.p + pasP);
      else if (sim.p > pCible) sim.p = Math.max(pCible, sim.p - pasP);

      /* -- consigne -- */
      var Tc = e.suivreProfil ? consigneA(sim.profil, sim.t) : e.Tc;

      /* -- température mesurée (retardée) -- */
      var Tmes = sim.temperatureMesuree();

      /* -- loi de commande → θ* -- */
      sim.u = e.u;
      if (e.mode === 'angle') {
        // N1 : le curseur EST l'angle, pas de moteur.
        sim.thetaCible = PH.theta_min + (PH.theta_max - PH.theta_min) * e.u / 100;
        sim.theta = sim.thetaCible;
      } else {
        if (e.mode === 'ff') {
          // N2–N3 : le potentiomètre demande une température, la
          // table inverse de l'étudiant donne l'angle.
          var Tdemande = CM.pot_T_min + (CM.pot_T_max - CM.pot_T_min) * e.u / 100;
          var th = inverserTable(e.table, Tdemande);
          sim.thetaCible = (th === null) ? sim.thetaCible : th;
        } else if (e.mode === 'fb') {
          // N4–N5 : loi intégrale naturelle dθ*/dt = K_f·(T_c − T_mes)
          sim.thetaCible += (e.Kf || CM.Kf_defaut) * (Tc - Tmes) * dt;
        } else if (e.mode === 'pid') {
          var g = e.pid || CM.pid_prof;
          var err = Tc - Tmes;
          // dérivée sur la MESURE (pas sur l'erreur) : pas de coup
          // de fouet au changement de consigne. Filtrée.
          var brute = (Tmes - sim.derniereTmes) / dt;
          var alpha = dt / (CM.pid_tau_derivee + dt);
          sim.deriveeFiltree += alpha * (brute - sim.deriveeFiltree);
          var integraleEssai = sim.integrale + err * dt;
          var sortie = g.kp * err + g.ki * integraleEssai - g.kd * sim.deriveeFiltree;
          if (sortie > PH.theta_max || sortie < PH.theta_min) {
            // anti-windup : on gèle l'intégrale à la butée (§4.6)
            sortie = g.kp * err + g.ki * sim.integrale - g.kd * sim.deriveeFiltree;
          } else {
            sim.integrale = integraleEssai;
          }
          sim.thetaCible = sortie;
        }
        sim.thetaCible = Math.max(PH.theta_min, Math.min(PH.theta_max, sim.thetaCible));
        // moteur à vitesse limitée (§4.4)
        var dmax = PH.vitesse_moteur_max * dt;
        var ecart = sim.thetaCible - sim.theta;
        if (ecart > dmax) sim.theta += dmax;
        else if (ecart < -dmax) sim.theta -= dmax;
        else sim.theta = sim.thetaCible;
      }
      sim.theta = Math.max(PH.theta_min, Math.min(PH.theta_max, sim.theta));

      /* -- dynamique de sortie : τ_mix · dT/dt = T_eq(θ) − T --
         `instantane` (niveau 0, « canalisation idéale ») court-circuite
         la dynamique : T colle à T_eq. C'est ce qui rend visible, par
         comparaison, ce que τ_mix fait vraiment. */
      var Teq = sim.temperatureEquilibre(sim.theta);
      if (e.instantane) sim.T = Teq;
      else sim.T += (Teq - sim.T) * dt / PH.tau_mix;

      /* -- alimentation du tampon de retard -- */
      sim.tamponIdx = (sim.tamponIdx + 1) % sim.tampon.length;
      sim.tampon[sim.tamponIdx] = sim.T;
      sim.derniereTmes = Tmes;

      /* -- score (§7) : on note la température VRAIE, c'est elle
            qui brûle. Pas de consigne (niveau 0, calibration) ⇒ pas de
            score : sans ce garde-fou l'intégrale devient NaN. -- */
      if (isFinite(Tc)) {
        sim.score.integrale += Math.abs(sim.T - Tc) * dt;
        if (sim._armeBrulure && sim.T > SC.seuil_brulure) {
          sim.score.brulures++; sim._armeBrulure = false;
        } else if (!sim._armeBrulure && sim.T < SC.seuil_brulure - SC.hysteresis) {
          sim._armeBrulure = true;
        }
        if (sim._armeGel && sim.T < SC.seuil_gel) {
          sim.score.gels++; sim._armeGel = false;
        } else if (!sim._armeGel && sim.T > SC.seuil_gel + SC.hysteresis) {
          sim._armeGel = true;
        }
        sim.score.total = sim.score.integrale
          + sim.score.brulures * SC.penalite_brulure
          + sim.score.gels * SC.penalite_gel;
      }

      sim.t += dt;
      if (e.suivreProfil && sim.t >= sim.profil.duree) sim.termine = true;

      return {
        t: sim.t, Tc: Tc, T: sim.T, Tmes: Tmes,
        theta: sim.theta, thetaCible: sim.thetaCible,
        u: sim.u, p: sim.p, T_froid: sim.pertSaison ? PH.perturbations.saison_T_froid : PH.T_froid
      };
    };

    sim.reinitialiser(undefined, undefined, angleInitial);
    return sim;
  }

  /* ==========================================================
     6. Export
     ========================================================== */
  var API = {
    mulberry32: mulberry32,
    sRobinet: sRobinet,
    parametresRobinet: parametresRobinet,
    construireProfil: construireProfil,
    consigneA: consigneA,
    construireAutoPerturbations: construireAutoPerturbations,
    inverserTable: inverserTable,
    creerSimulateur: creerSimulateur
  };

  racine.DoucheSim = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

})(typeof globalThis !== 'undefined' ? globalThis : this);
