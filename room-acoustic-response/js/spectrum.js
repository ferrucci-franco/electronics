/* ============================================================
 * spectrum.js - Aperçu de la réponse en amplitude.
 *
 * On NE fait PAS de déconvolution : on compare deux densités
 * spectrales de puissance, estimées par la méthode de Welch.
 *
 *   |H(f)|^2  ~  Pyy(f) / Pxx(f)
 *
 * avec y = enregistrement au microphone et x = signal de
 * référence effectivement joué. Deux propriétés en découlent :
 *
 *  1. Le rapport élimine la coloration du balayage lui-même
 *     (un balayage exponentiel dépose une énergie en 1/f), donc
 *     ce qui reste est bien la réponse du système mesuré.
 *  2. Le module est INSENSIBLE AU RETARD : un décalage temporel
 *     n'agit que sur la phase. La latence Bluetooth inconnue, que
 *     l'application ne cherche jamais à corriger, ne fausse donc
 *     pas cette courbe. C'est la raison du choix de cette méthode.
 *
 * Ce que la courbe contient, en revanche : le haut-parleur, la
 * pièce ET le microphone. Ce n'est pas une mesure calibrée, c'est
 * un coup d'oeil pour repérer les résonances.
 *
 * Module pur : aucune dépendance, aucun accès au DOM, testable en
 * Node. FFT itérative radix-2 avec table de twiddles précalculée.
 * ============================================================ */
(function (global) {
  'use strict';

  /** Largest power of two <= n (0 if n < 1). */
  function pow2Floor(n) {
    var p = 1;
    while (p * 2 <= n) { p *= 2; }
    return n >= 1 ? p : 0;
  }

  /** Twiddle table for an n-point FFT: n/2 complex roots of unity. */
  function makeTwiddles(n) {
    var half = n >> 1;
    var cos = new Float64Array(half);
    var sin = new Float64Array(half);
    for (var i = 0; i < half; i++) {
      var a = -2 * Math.PI * i / n;
      cos[i] = Math.cos(a);
      sin[i] = Math.sin(a);
    }
    return { n: n, cos: cos, sin: sin };
  }

  /**
   * In-place iterative Cooley-Tukey FFT, radix 2, decimation in time.
   * `re` and `im` must both have length tw.n, a power of two.
   */
  function fft(re, im, tw) {
    var n = re.length;
    var i, j, bit, t;

    // Bit-reversal permutation.
    for (i = 1, j = 0; i < n; i++) {
      bit = n >> 1;
      for (; j & bit; bit >>= 1) { j ^= bit; }
      j ^= bit;
      if (i < j) {
        t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }

    for (var len = 2; len <= n; len <<= 1) {
      var half = len >> 1;
      var step = n / len;                  // stride into the twiddle table
      for (var base = 0; base < n; base += len) {
        for (var k = 0; k < half; k++) {
          var ti = k * step;
          var cr = tw.cos[ti], ci = tw.sin[ti];
          var a = base + k, b = a + half;
          var vr = re[b] * cr - im[b] * ci;
          var vi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - vr; im[b] = im[a] - vi;
          re[a] = re[a] + vr; im[a] = im[a] + vi;
        }
      }
    }
  }

  /** Periodic Hann window. Kept for reference and for the tests. */
  function hann(n) {
    var w = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / n));
    }
    return w;
  }

  /**
   * Sine window, w[i] = sin(pi*i/n). Its SQUARE is exactly a Hann window,
   * and Hann adds up to 1 on a half-window grid — so Welch, which weights
   * by w², reaches constant-overlap-add already at 50 % overlap. Hann
   * itself would need 75 % for the same guarantee, i.e. twice the FFTs for
   * an identical result. That is the whole reason for this window.
   */
  function sineWindow(n) {
    var w = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      w[i] = Math.sin(Math.PI * i / n);
    }
    return w;
  }

  /**
   * Welch power spectrum estimate: sine window, 50 % overlap.
   *
   * The overlap is NOT a quality knob here, it is a correctness one. Welch
   * weights every sample by the SQUARE of the window, so that square must
   * add up to a constant across overlapping segments; otherwise the energy
   * it measures depends on where the segment grid happens to fall. A sweep
   * crosses its top octave in a fraction of one window, so up there that
   * dependence is severe: with a Hann window at 50 % overlap, delaying the
   * recording by 200 ms moved the top of the curve by 30 dB.
   *
   * The sine window squares to a Hann, and Hann is constant-overlap-add on
   * a half-window grid, so 50 % is already exact here — half the FFTs a
   * Hann window would need (it would want 75 %) for the same result. That
   * comes to about 2·len/fftSize segments, ~180 for the default 30 s at
   * 48 kHz. The segment count is deliberately NOT capped: capping means
   * stretching the hop, which is exactly what breaks the property above.
   *
   * @returns {Float64Array|null} power per bin, length fftSize/2 + 1
   */
  function welchPower(x, fftSize, tw, hop) {
    if (!x || x.length < fftSize) { return null; }
    hop = hop || (fftSize >> 1);

    var win = sineWindow(fftSize);
    var winPower = 0;
    for (var i = 0; i < fftSize; i++) { winPower += win[i] * win[i]; }

    var bins = (fftSize >> 1) + 1;
    var acc = new Float64Array(bins);
    var re = new Float64Array(fftSize);
    var im = new Float64Array(fftSize);
    var segments = 0;

    // Start before the first sample and finish after the last, treating the
    // outside as silence. Constant-overlap-add only holds where a sample is
    // seen by every phase of the window; without this the first and last
    // fftSize samples are under-counted. That matters here because a sweep
    // puts its highest frequencies at the very end of the array, exactly in
    // that blind spot — which is what still moved the top of the curve when
    // the recording was delayed with respect to the reference.
    for (var start = -(fftSize - hop); start < x.length; start += hop) {
      for (i = 0; i < fftSize; i++) {
        var idx = start + i;
        re[i] = (idx >= 0 && idx < x.length) ? x[idx] * win[i] : 0;
        im[i] = 0;
      }
      fft(re, im, tw);
      for (var k = 0; k < bins; k++) {
        acc[k] += re[k] * re[k] + im[k] * im[k];
      }
      segments++;
    }
    if (!segments) { return null; }

    var norm = 1 / (segments * winPower);
    for (k = 0; k < bins; k++) { acc[k] *= norm; }
    acc.segments = segments;
    return acc;
  }

  /**
   * Amplitude response preview.
   *
   * @param {Float32Array} recorded   microphone signal
   * @param {Float32Array} reference  sweep actually played
   * @param {number} sampleRate
   * @param {object} [opts] { f1, f2, fftSize, hop, points,
   *                          octaveFraction, floorDb }
   * @returns {object|null} {
   *   freqs, db,          log-spaced curve, dB, median-normalised
   *   minDb, maxDb,       range actually spanned by `db`
   *   fftSize, segments, binHz, f1, f2
   * }  or null when there is not enough signal to say anything.
   */
  function analyse(recorded, reference, sampleRate, opts) {
    opts = opts || {};
    if (!recorded || !reference || !(sampleRate > 0)) { return null; }

    var nyquist = sampleRate / 2;
    var f1 = Math.max(opts.f1 > 0 ? opts.f1 : 20, 1);
    var f2 = Math.min(opts.f2 > 0 ? opts.f2 : 2000, nyquist * 0.98);
    if (!(f2 > f1)) { return null; }

    // Big enough for useful resolution at the bottom of the band, small
    // enough to stay quick; always a power of two the signal can hold.
    var wanted = opts.fftSize || 16384;
    var fftSize = Math.min(pow2Floor(Math.min(recorded.length, reference.length)), wanted);
    if (fftSize < 256) { return null; }

    var tw = makeTwiddles(fftSize);
    // The same hop for both signals, so the segment grid marches through
    // each at the same rate and the two estimates stay comparable.
    var hop = opts.hop || (fftSize >> 1);
    var pyy = welchPower(recorded, fftSize, tw, hop);
    var pxx = welchPower(reference, fftSize, tw, hop);
    if (!pyy || !pxx) { return null; }

    var bins = pyy.length;
    var binHz = sampleRate / fftSize;

    // Only trust bins where the excitation actually put energy; elsewhere
    // the ratio is noise over noise.
    var maxPxx = 0;
    for (var k = 0; k < bins; k++) { if (pxx[k] > maxPxx) { maxPxx = pxx[k]; } }
    if (!(maxPxx > 0)) { return null; }
    var floorDb = opts.floorDb === undefined ? -60 : opts.floorDb;
    var gate = maxPxx * Math.pow(10, floorDb / 10);

    var ratio = new Float64Array(bins);
    var valid = new Uint8Array(bins);
    for (k = 0; k < bins; k++) {
      var f = k * binHz;
      if (f >= f1 && f <= f2 && pxx[k] > gate) {
        ratio[k] = pyy[k] / pxx[k];
        valid[k] = 1;
      }
    }

    // Fractional-octave smoothing, averaged in the power domain, sampled
    // on a log frequency grid.
    var points = opts.points || 300;
    var frac = opts.octaveFraction || 6;
    var halfBand = Math.pow(2, 1 / (2 * frac));
    var ratioStep = Math.pow(f2 / f1, 1 / (points - 1));

    var freqs = new Float64Array(points);
    var db = new Float64Array(points);
    var kept = 0;
    var minDb = Infinity, maxDb = -Infinity;

    for (var p = 0; p < points; p++) {
      var fc = f1 * Math.pow(ratioStep, p);
      freqs[p] = fc;

      // Only average where the WHOLE smoothing band sits inside the excited
      // range. At the very edges it would otherwise lean on one or two bins
      // that the sweep barely excited (and that its fades smeared), which
      // produced wild excursions of tens of dB. Such points stay NaN and are
      // simply not drawn: the curve is trimmed by half a smoothing band at
      // each end rather than ending in noise.
      if (fc / halfBand < f1 || fc * halfBand > f2) { db[p] = NaN; continue; }

      var lo = Math.max(0, Math.ceil((fc / halfBand) / binHz));
      var hi = Math.min(bins - 1, Math.floor((fc * halfBand) / binHz));
      if (hi < lo) { lo = hi = Math.round(fc / binHz); }   // narrower than a bin

      var sum = 0, count = 0;
      for (k = lo; k <= hi; k++) {
        if (valid[k]) { sum += ratio[k]; count++; }
      }
      if (count) {
        db[p] = 10 * Math.log10(sum / count);
        kept++;
        if (db[p] < minDb) { minDb = db[p]; }
        if (db[p] > maxDb) { maxDb = db[p]; }
      } else {
        db[p] = NaN;
      }
    }
    if (kept < points / 4) { return null; }

    // Normalise on the median: only the SHAPE of the curve means anything,
    // its absolute level depends on the volume knob and on the microphone.
    var finite = [];
    for (p = 0; p < points; p++) { if (isFinite(db[p])) { finite.push(db[p]); } }
    finite.sort(function (a, b) { return a - b; });
    var median = finite[finite.length >> 1];
    for (p = 0; p < points; p++) { db[p] -= median; }

    return {
      freqs: freqs,
      db: db,
      minDb: minDb - median,
      maxDb: maxDb - median,
      fftSize: fftSize,
      segments: pyy.segments,
      binHz: binHz,
      f1: f1,
      f2: f2
    };
  }

  global.Spectrum = {
    analyse: analyse,
    // exported for the tests
    fft: fft,
    hann: hann,
    sineWindow: sineWindow,
    makeTwiddles: makeTwiddles,
    welchPower: welchPower,
    pow2Floor: pow2Floor
  };

})(typeof window !== 'undefined' ? window : globalThis);
