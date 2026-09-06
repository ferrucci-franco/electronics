/* ============================================================
 * wav.js - Build an uncompressed RIFF/WAVE file from raw PCM
 *          samples held in Float32Array(s), entirely in JS.
 *
 * We deliberately do NOT use MediaRecorder: on Android it yields
 * Opus/WebM and on iOS AAC/MP4, both lossy and both unsuitable for
 * spectral analysis. Instead we capture Float32 samples from the
 * Web Audio graph and serialise them ourselves.
 *
 * Supported output formats:
 *   16 -> WAVE_FORMAT_PCM        (fmt code 1), signed 16-bit LE
 *   32 -> WAVE_FORMAT_IEEE_FLOAT (fmt code 3), float32 LE
 *
 * Both are read natively by MATLAB (audioread), Python
 * (scipy.io.wavfile / soundfile), Audacity, REW, Octave, etc.
 * ============================================================ */
(function (global) {
  'use strict';

  /** Write an ASCII string into a DataView at `offset`. */
  function writeString(view, offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i) & 0x7f);
    }
  }

  /**
   * Interleave N channels of equal length into one Float32Array.
   * Mono input is returned as-is (no copy needed).
   */
  function interleave(channels) {
    if (channels.length === 1) { return channels[0]; }
    var frames = channels[0].length;
    var out = new Float32Array(frames * channels.length);
    var w = 0;
    for (var i = 0; i < frames; i++) {
      for (var c = 0; c < channels.length; c++) { out[w++] = channels[c][i]; }
    }
    return out;
  }

  /**
   * Encode samples as a WAV Blob.
   *
   * @param {Float32Array[]} channels   one Float32Array per channel, same length
   * @param {number}         sampleRate sampling frequency in Hz
   * @param {number}         bitDepth   16 (integer PCM) or 32 (IEEE float)
   * @returns {Blob} audio/wav
   */
  function encodeWAV(channels, sampleRate, bitDepth) {
    bitDepth = (bitDepth === 32) ? 32 : 16;

    var numChannels  = channels.length;
    var samples      = interleave(channels);
    var bytesPerSamp = bitDepth / 8;
    var dataBytes    = samples.length * bytesPerSamp;
    var formatCode   = (bitDepth === 32) ? 3 : 1;   // 3 = IEEE float, 1 = PCM

    var buffer = new ArrayBuffer(44 + dataBytes);
    var view   = new DataView(buffer);

    /* ---- RIFF chunk descriptor ---- */
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);        // file size - 8
    writeString(view, 8, 'WAVE');

    /* ---- fmt sub-chunk (16 bytes, canonical form) ---- */
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);                                    // sub-chunk size
    view.setUint16(20, formatCode, true);                            // audio format
    view.setUint16(22, numChannels, true);                           // channels
    view.setUint32(24, sampleRate, true);                            // sample rate
    view.setUint32(28, sampleRate * numChannels * bytesPerSamp, true);// byte rate
    view.setUint16(32, numChannels * bytesPerSamp, true);            // block align
    view.setUint16(34, bitDepth, true);                              // bits per sample

    /* ---- data sub-chunk ---- */
    writeString(view, 36, 'data');
    view.setUint32(40, dataBytes, true);

    var offset = 44;
    var i;
    if (bitDepth === 16) {
      for (i = 0; i < samples.length; i++) {
        // Hard-clip to [-1, 1) then scale. 32767/-32768 asymmetry handled
        // by clamping the positive side to 0x7FFF.
        var s = samples[i];
        if (s > 1) { s = 1; } else if (s < -1) { s = -1; }
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    } else {
      // Float32: no scaling, no clipping - values above 1.0 survive intact,
      // which is why this format is preferable when headroom is uncertain.
      for (i = 0; i < samples.length; i++) {
        view.setFloat32(offset, samples[i], true);
        offset += 4;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /** Concatenate an array of Float32Array chunks into a single array. */
  function concatChunks(chunks, totalLength) {
    if (totalLength === undefined) {
      totalLength = 0;
      for (var k = 0; k < chunks.length; k++) { totalLength += chunks[k].length; }
    }
    var out = new Float32Array(totalLength);
    var pos = 0;
    for (var i = 0; i < chunks.length && pos < totalLength; i++) {
      var c = chunks[i];
      if (pos + c.length > totalLength) { c = c.subarray(0, totalLength - pos); }
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  }

  /** Peak / RMS / clipping statistics, used for quality feedback. */
  function analyseLevels(data) {
    var peak = 0, sumSq = 0, clipped = 0;
    for (var i = 0; i < data.length; i++) {
      var v = data[i];
      var a = v < 0 ? -v : v;
      if (a > peak) { peak = a; }
      if (a >= 0.999) { clipped++; }
      sumSq += v * v;
    }
    var rms = data.length ? Math.sqrt(sumSq / data.length) : 0;
    return {
      peak: peak,
      rms: rms,
      peakDbfs: toDbfs(peak),
      rmsDbfs: toDbfs(rms),
      clippedSamples: clipped,
      clipped: clipped > 0
    };
  }

  /** Linear amplitude -> dBFS, floored at -120 dB. */
  function toDbfs(x) {
    if (!(x > 0)) { return -Infinity; }
    var db = 20 * Math.log10(x);
    return db < -120 ? -120 : db;
  }

  global.WAV = {
    encodeWAV: encodeWAV,
    concatChunks: concatChunks,
    analyseLevels: analyseLevels,
    toDbfs: toDbfs
  };

})(window);
