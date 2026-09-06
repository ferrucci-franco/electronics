/* ============================================================
 * chirp.js - Exponential (logarithmic) sine sweep generator.
 *
 * Instantaneous frequency grows exponentially from f1 to f2 over T
 * seconds, so every octave receives the same amount of energy-time.
 * This is the standard excitation for room / loudspeaker measurement
 * (Farina 2000): it is robust to harmonic distortion, which ends up
 * *before* the linear impulse response after deconvolution.
 *
 *   L     = T / ln(f2/f1)                    (time constant)
 *   K     = 2*pi*f1*L
 *   phi(t)= K * (exp(t/L) - 1)               (instantaneous phase)
 *   x(t)  = A * w(t) * sin(phi(t))           (w = fade window)
 *
 * The returned array is the *complete timeline*:
 *     [ leading silence | faded sweep | trailing silence ]
 * The same array is played back and offered as the reference file,
 * so the reference and the recording share one common time origin
 * (up to the unknown, uncompensated Bluetooth/output latency).
 * ============================================================ */
(function (global) {
  'use strict';

  // Raised-cosine fades. 20 ms is short enough not to disturb the
  // 20 Hz end (< half a period) and long enough to kill the click.
  var FADE_IN_S  = 0.02;
  var FADE_OUT_S = 0.02;

  /**
   * @param {object} o
   *   o.sampleRate  Hz (taken from the live AudioContext)
   *   o.f1, o.f2    start / end frequency in Hz (f2 > f1 > 0)
   *   o.duration    sweep length in seconds
   *   o.amplitude   digital peak amplitude, 0 < A <= 1
   *   o.preSilence  leading silence in seconds
   *   o.postSilence trailing silence in seconds
   * @returns {object} { data, sampleRate, totalSamples, sweepStartSample,
   *                     sweepEndSample, totalDuration, fadeInS, fadeOutS, formula }
   */
  function generateSweep(o) {
    var sr    = o.sampleRate;
    var f1    = o.f1;
    var f2    = o.f2;
    var T     = o.duration;
    var A     = o.amplitude;

    var preN   = Math.round((o.preSilence  || 0) * sr);
    var postN  = Math.round((o.postSilence || 0) * sr);
    var sweepN = Math.round(T * sr);
    var totalN = preN + sweepN + postN;

    var data = new Float32Array(totalN);        // zero-filled => silence

    // Exponential sweep constants.
    var L = T / Math.log(f2 / f1);
    var K = 2 * Math.PI * f1 * L;

    var fadeInN  = Math.min(Math.round(FADE_IN_S  * sr), Math.floor(sweepN / 2));
    var fadeOutN = Math.min(Math.round(FADE_OUT_S * sr), Math.floor(sweepN / 2));

    for (var n = 0; n < sweepN; n++) {
      var t = n / sr;
      var s = Math.sin(K * (Math.exp(t / L) - 1));

      // Raised-cosine (Hann half-window) fade in / out.
      var w = 1;
      if (n < fadeInN) {
        w = 0.5 * (1 - Math.cos(Math.PI * n / fadeInN));
      } else if (n >= sweepN - fadeOutN) {
        w = 0.5 * (1 - Math.cos(Math.PI * (sweepN - n) / fadeOutN));
      }

      data[preN + n] = A * w * s;
    }

    return {
      data: data,
      sampleRate: sr,
      totalSamples: totalN,
      totalDuration: totalN / sr,
      sweepStartSample: preN,
      sweepEndSample: preN + sweepN,
      sweepSamples: sweepN,
      fadeInS: fadeInN / sr,
      fadeOutS: fadeOutN / sr,
      formula: 'x(t) = A * w(t) * sin(K * (exp(t/L) - 1)),  L = T / ln(f2/f1),  K = 2*pi*f1*L'
    };
  }

  /**
   * Validate user parameters against the live sample rate.
   * Returns null when valid, otherwise { key, vars } for I18N.t().
   */
  function validate(p, sampleRate) {
    var nyquist = sampleRate / 2;
    var maxF2   = Math.floor(nyquist * 0.95);   // keep away from the very edge

    if (!isFinite(p.f1) || !isFinite(p.f2) || !isFinite(p.duration) ||
        !isFinite(p.amplitude) || !isFinite(p.preSilence) || !isFinite(p.postSilence)) {
      return { key: 'err.range', vars: {} };
    }
    if (p.f1 < 1 || p.f2 < 2 || p.duration < 0.5 || p.duration > 600 ||
        p.amplitude <= 0 || p.amplitude > 1 ||
        p.preSilence < 0 || p.preSilence > 10 ||
        p.postSilence < 0 || p.postSilence > 10) {
      return { key: 'err.range', vars: {} };
    }
    if (p.f2 <= p.f1) { return { key: 'err.f1f2', vars: {} }; }
    if (p.f2 > maxF2) { return { key: 'err.nyquist', vars: { max: maxF2 } }; }
    return null;
  }

  global.Chirp = {
    generateSweep: generateSweep,
    validate: validate,
    FADE_IN_S: FADE_IN_S,
    FADE_OUT_S: FADE_OUT_S
  };

})(window);
