/* ============================================================
 * decay.js - Décroissance de la salle à partir d'une impulsion.
 *
 * Un claquement de mains EST une impulsion : ce qui est
 * enregistré est déjà la réponse impulsionnelle, aucune
 * déconvolution n'est nécessaire. C'est aussi la limite du
 * procédé, et elle est structurelle :
 *
 *   - On NE PEUT PAS en tirer une réponse en fréquence. Le
 *     spectre mesuré est celui de la salle MULTIPLIÉ par celui du
 *     claquement, et ce dernier est inconnu et différent à chaque
 *     fois. Rien ne permet de les séparer sans référence.
 *   - On PEUT en tirer la DÉCROISSANCE. La pente à laquelle
 *     l'énergie retombe est une propriété de la salle seule, tant
 *     que la source est brève devant cette décroissance. C'est
 *     exactement ce qu'on entend « vibrer » après un claquement.
 *
 * Méthode : intégration inverse de Schroeder (1965). Au lieu de
 * lire la décroissance sur le signal brut, très bruité, on trace
 *
 *      EDC(t) = 10 log10 ( integrale de t a T de h²(x) dx )
 *
 * qui est lisse par construction, puis on ajuste une droite.
 *   EDT : de 0 a -10 dB,  RT60 = 6 x pente
 *   T20 : de -5 a -25 dB, RT60 = 3 x pente
 *   T30 : de -5 a -35 dB, RT60 = 2 x pente
 *
 * Module pur : aucune dépendance, aucun accès au DOM, testable
 * en Node.
 * ============================================================ */
(function (global) {
  'use strict';

  /** Onset per ISO 3382: first sample rising above -20 dB of the peak. */
  function findOnset(h, peakAbs) {
    var thr = peakAbs * 0.1;                 // -20 dB
    for (var i = 0; i < h.length; i++) {
      if (Math.abs(h[i]) >= thr) { return i; }
    }
    return 0;
  }

  /** Mean square over [from, to). */
  function meanSquare(h, from, to) {
    var s = 0;
    for (var i = from; i < to; i++) { s += h[i] * h[i]; }
    return (to > from) ? s / (to - from) : 0;
  }

  /**
   * Where to stop integrating.
   *
   * Schroeder's integral over a tail that is pure noise does not decay,
   * it flattens — and a flat tail drags the fitted slope towards zero,
   * inflating RT60. So the integration is truncated where the signal
   * envelope sinks to the noise floor plus a margin. This is the simple
   * form of the idea Lundeby's iterative method refines.
   */
  function truncationPoint(h, onset, noisePower, marginDb, blockLen) {
    var thr = noisePower * Math.pow(10, marginDb / 10);
    var last = onset;
    for (var b = onset; b + blockLen <= h.length; b += blockLen) {
      if (meanSquare(h, b, b + blockLen) > thr) { last = b + blockLen; }
    }
    return Math.min(h.length, Math.max(last, onset + blockLen));
  }

  /**
   * Least-squares fit of dB against time over the samples whose EDC lies
   * inside [hiDb, loDb] (hiDb the less negative of the two).
   * @returns {object|null} { slopeDbPerS, rt60, r2, fromT, toT, points }
   */
  function fitRange(edcDb, sampleRate, onset, hiDb, loDb, factor) {
    var n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    var first = -1, last = -1;

    for (var i = onset; i < edcDb.length; i++) {
      var y = edcDb[i];
      if (!isFinite(y)) { break; }
      if (y > hiDb) { continue; }
      if (y < loDb) { break; }
      var x = (i - onset) / sampleRate;
      if (first < 0) { first = i; }
      last = i;
      n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    if (n < 8) { return null; }

    var den = n * sxx - sx * sx;
    if (!(Math.abs(den) > 1e-12)) { return null; }
    var slope = (n * sxy - sx * sy) / den;
    if (!(slope < 0)) { return null; }                 // must actually decay

    // Coefficient of determination, as a fit-quality flag.
    var mean = sy / n;
    var inter = (sy - slope * sx) / n;
    var ssRes = 0, ssTot = 0;
    for (i = first; i <= last; i++) {
      var yy = edcDb[i];
      var xx = (i - onset) / sampleRate;
      var e = yy - (inter + slope * xx);
      ssRes += e * e;
      ssTot += (yy - mean) * (yy - mean);
    }

    return {
      slopeDbPerS: slope,
      intercept: inter,
      rt60: -60 / slope,
      r2: ssTot > 0 ? 1 - ssRes / ssTot : 0,
      fromT: (first - onset) / sampleRate,
      toT: (last - onset) / sampleRate,
      points: n,
      factor: factor
    };
  }

  /**
   * Analyse an impulse response.
   *
   * @param {Float32Array|Float64Array} h  recorded impulse response
   * @param {number} sampleRate
   * @param {object} [opts] { noiseTailFraction, marginDb, blockSeconds,
   *                          curvePoints }
   * @returns {object|null} null when there is nothing usable in `h`.
   */
  function analyse(h, sampleRate, opts) {
    opts = opts || {};
    if (!h || !h.length || !(sampleRate > 0)) { return null; }

    var noiseTail   = opts.noiseTailFraction || 0.10;
    var marginDb    = opts.marginDb === undefined ? 10 : opts.marginDb;
    var blockLen    = Math.max(16, Math.round((opts.blockSeconds || 0.02) * sampleRate));
    var curvePoints = opts.curvePoints || 400;

    // Peak and onset.
    var peakAbs = 0, peakIdx = 0;
    for (var i = 0; i < h.length; i++) {
      var a = Math.abs(h[i]);
      if (a > peakAbs) { peakAbs = a; peakIdx = i; }
    }
    if (!(peakAbs > 0)) { return null; }
    var onset = findOnset(h, peakAbs);

    // Noise floor from the tail, and where to stop integrating.
    var tailFrom = Math.max(onset + blockLen, Math.floor(h.length * (1 - noiseTail)));
    var noisePower = meanSquare(h, tailFrom, h.length);
    var trunc = truncationPoint(h, onset, noisePower, marginDb, blockLen);
    if (trunc - onset < blockLen * 4) { return null; }   // nothing to fit

    // Schroeder backward integration, onset..trunc.
    var edc = new Float64Array(trunc - onset + 1);
    var acc = 0;
    for (i = trunc - 1; i >= onset; i--) {
      acc += h[i] * h[i];
      edc[i - onset] = acc;
    }
    var total = edc[0];
    if (!(total > 0)) { return null; }

    var edcDb = new Float64Array(edc.length);
    for (i = 0; i < edc.length; i++) {
      edcDb[i] = edc[i] > 0 ? 10 * Math.log10(edc[i] / total) : -Infinity;
    }

    // Dynamic range available for the fits: how far the impulse sits above
    // the noise floor. NOT the last value of the EDC — a backward integral
    // always collapses towards -inf at its final samples, whatever the
    // noise, so reading the range off the curve's end would report tens of
    // dB of headroom that do not exist and would never flag a bad fit.
    var onsetPower = meanSquare(h, onset, Math.min(h.length, onset + blockLen));
    var usable = (noisePower > 0 && onsetPower > 0)
      ? 10 * Math.log10(onsetPower / noisePower)
      : Infinity;

    var edt = fitRange(edcDb, sampleRate, 0,  0,  -10, 6);
    var t20 = fitRange(edcDb, sampleRate, 0, -5,  -25, 3);
    var t30 = fitRange(edcDb, sampleRate, 0, -5,  -35, 2);

    // A fit is only trustworthy with headroom BEYOND its nominal range:
    // the decay has to stay clear of the noise floor over the whole fit,
    // not merely touch it at the end. The usual requirements are 10 dB of
    // margin on top of the range being fitted. Measured on synthetic decays,
    // a T30 read at 39 dB of range is already 11 % low while T20 is 4 %.
    if (edt && usable < 20) { edt.short = true; }
    if (t20 && usable < 35) { t20.short = true; }
    if (t30 && usable < 45) { t30.short = true; }

    var best = (t30 && !t30.short) ? 't30'
             : (t20 && !t20.short) ? 't20'
             : (edt && !edt.short) ? 'edt'
             : (t20 ? 't20' : (edt ? 'edt' : null));

    // Decimated curve for plotting: keep the minimum of each block so the
    // drawn line never hides a steep section.
    var step = Math.max(1, Math.floor(edcDb.length / curvePoints));
    var pts = Math.ceil(edcDb.length / step);
    var ct = new Float64Array(pts), cd = new Float64Array(pts);
    for (var p = 0; p < pts; p++) {
      var a0 = p * step, a1 = Math.min(edcDb.length, a0 + step);
      var lo = Infinity;
      for (i = a0; i < a1; i++) { if (edcDb[i] < lo) { lo = edcDb[i]; } }
      ct[p] = a0 / sampleRate;
      cd[p] = isFinite(lo) ? lo : -Infinity;
    }

    return {
      sampleRate: sampleRate,
      onsetSample: onset,
      peakSample: peakIdx,
      peakDbfs: 20 * Math.log10(peakAbs),
      noiseFloorDbfs: noisePower > 0 ? 10 * Math.log10(noisePower) : -Infinity,
      truncSample: trunc,
      decaySeconds: (trunc - onset) / sampleRate,
      usableRangeDb: usable,
      curve: { t: ct, db: cd },
      edt: edt, t20: t20, t30: t30,
      best: best,
      rt60: best ? ({ edt: edt, t20: t20, t30: t30 })[best].rt60 : null
    };
  }

  global.Decay = {
    analyse: analyse,
    findOnset: findOnset,
    fitRange: fitRange,
    truncationPoint: truncationPoint,
    meanSquare: meanSquare
  };

})(typeof window !== 'undefined' ? window : globalThis);
