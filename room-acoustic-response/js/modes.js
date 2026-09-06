/* ============================================================
 * modes.js - Fréquences propres (modes) d'une salle rectangulaire.
 *
 * Modèle de Rayleigh pour un parallélépipède à parois parfaitement
 * rigides. C'est le modèle classique enseigné en acoustique des salles :
 *
 *              c    ( nx )^2   ( ny )^2   ( nz )^2
 *   f       = --- * sqrt( ---- ) + ( ---- ) + ( ---- )
 *    nx,ny,nz  2      ( L  )     ( W  )     ( H  )
 *
 *   nx, ny, nz entiers >= 0, non tous nuls.
 *
 * Trois familles de modes, d'énergie décroissante :
 *   - axial      (un seul indice non nul)  : 2 surfaces, les plus forts
 *   - tangentiel (deux indices non nuls)   : 4 surfaces, ~3 dB plus faibles
 *   - oblique    (trois indices non nuls)  : 6 surfaces, les plus faibles
 *
 * Module pur : aucune dépendance, aucun accès au DOM, testable en Node.
 * ============================================================ */
(function (global) {
  'use strict';

  /** Célérité du son dans l'air à 20 °C, en m/s. */
  var SPEED_OF_SOUND = 343;

  var TYPES = ['', 'axial', 'tangential', 'oblique'];

  /**
   * Célérité du son en fonction de la température (formule usuelle,
   * valable pour l'air sec autour des températures ambiantes).
   * Fournie pour la documentation : l'interface utilise 20 °C.
   */
  function speedOfSound(celsius) {
    return 331.3 * Math.sqrt(1 + celsius / 273.15);
  }

  /**
   * Fréquence d'un mode donné.
   * @param {number[]} n  triplet [nx, ny, nz]
   * @param {number[]} d  dimensions [L, W, H] en mètres
   * @param {number}   c  célérité du son en m/s
   */
  function modeFrequency(n, d, c) {
    var sx = n[0] / d[0];
    var sy = n[1] / d[1];
    var sz = n[2] / d[2];
    return (c / 2) * Math.sqrt(sx * sx + sy * sy + sz * sz);
  }

  /**
   * Énumère les modes propres et renvoie les plus bas, triés.
   *
   * @param {number} L  longueur (profondeur) en m
   * @param {number} W  largeur en m
   * @param {number} H  hauteur en m
   * @param {object} [opts] { c, maxOrder, limit }
   * @returns {object} {
   *   c, dims, volume,
   *   axial:  { L, W, H },        fondamentales axiales, en Hz
   *   lowest: number,             la plus basse fréquence propre, en Hz
   *   modes:  [{ f, n:[nx,ny,nz], type }],   triés par fréquence croissante
   *   truncated: boolean          true si la liste a été tronquée
   * }
   * @throws {Error} si une dimension n'est pas un nombre fini > 0
   */
  function compute(L, W, H, opts) {
    opts = opts || {};
    var c = isFinite(opts.c) && opts.c > 0 ? opts.c : SPEED_OF_SOUND;
    var maxOrder = isFinite(opts.maxOrder) && opts.maxOrder >= 1
      ? Math.floor(opts.maxOrder) : 6;
    var limit = isFinite(opts.limit) && opts.limit >= 1
      ? Math.floor(opts.limit) : 12;

    var d = [L, W, H];
    for (var i = 0; i < 3; i++) {
      if (!isFinite(d[i]) || d[i] <= 0) {
        throw new Error('modes: dimension ' + i + ' invalide (' + d[i] + ')');
      }
    }

    var all = [];
    for (var nx = 0; nx <= maxOrder; nx++) {
      for (var ny = 0; ny <= maxOrder; ny++) {
        for (var nz = 0; nz <= maxOrder; nz++) {
          if (nx === 0 && ny === 0 && nz === 0) { continue; }
          var nonZero = (nx > 0 ? 1 : 0) + (ny > 0 ? 1 : 0) + (nz > 0 ? 1 : 0);
          all.push({
            f: modeFrequency([nx, ny, nz], d, c),
            n: [nx, ny, nz],
            type: TYPES[nonZero]
          });
        }
      }
    }

    // Tri par fréquence croissante ; à fréquence égale (salle cubique,
    // par exemple), on met d'abord les modes les plus énergétiques.
    var ORDER = { axial: 0, tangential: 1, oblique: 2 };
    all.sort(function (a, b) {
      if (a.f !== b.f) { return a.f - b.f; }
      return ORDER[a.type] - ORDER[b.type];
    });

    return {
      c: c,
      dims: { L: L, W: W, H: H },
      volume: L * W * H,
      axial: { L: c / (2 * L), W: c / (2 * W), H: c / (2 * H) },
      lowest: all[0].f,
      modes: all.slice(0, limit),
      truncated: all.length > limit
    };
  }

  global.Modes = {
    SPEED_OF_SOUND: SPEED_OF_SOUND,
    speedOfSound: speedOfSound,
    modeFrequency: modeFrequency,
    compute: compute
  };

})(typeof window !== 'undefined' ? window : globalThis);
