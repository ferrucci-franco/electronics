/* ============================================================
 * audio.js - Audio engine: microphone access, level metering and
 *            the synchronous "play sweep while recording" routine.
 *
 * Design notes
 * ------------
 * * ONE AudioContext for the whole page. Its sampleRate is imposed by
 *   the OS/driver and is simply read back (never forced).
 * * ONE MediaStream kept open between the mic test and the measurement:
 *   re-opening it would restart the audio route negotiation (and on iOS
 *   would change the audio session again mid-session).
 * * Capture goes through an AudioWorklet when available, with a
 *   ScriptProcessorNode fallback (older Safari, blob-worklet blocked).
 *   Both hand us raw Float32 samples that we serialise ourselves
 *   (see wav.js) - MediaRecorder is never used, it would give Opus/AAC.
 * * NO latency compensation and NO phase correction is attempted: the
 *   Bluetooth pipeline delay is unknown and drifting. The nominal
 *   playback offset is recorded in the metadata as an indication only.
 * ============================================================ */
(function (global) {
  'use strict';

  /* --------------------------------------------------------------
   * AudioWorklet processor source. Loaded from a Blob URL so the app
   * stays a plain set of files (also works from file://).
   * -------------------------------------------------------------- */
  var WORKLET_SRC = [
    'class RiraRecorder extends AudioWorkletProcessor {',
    '  process(inputs, outputs) {',
    '    const input = inputs[0];',
    '    if (input && input.length && input[0] && input[0].length) {',
    '      this.port.postMessage(new Float32Array(input[0]));',
    '    }',
    '    const out = outputs[0];',
    '    if (out) { for (let c = 0; c < out.length; c++) { out[c].fill(0); } }',
    '    return true;',                       // never let the node be GC'd
    '  }',
    '}',
    'registerProcessor("rira-recorder", RiraRecorder);'
  ].join('\n');

  var LEAD_S = 0.30;   // silence recorded before playback starts
  var TAIL_S = 0.25;   // extra recording after the signal has ended

  var ctx = null;                 // the single AudioContext
  var stream = null;              // the single MediaStream
  var streamDeviceId = null;      // deviceId actually granted
  var meter = null;               // active meter handle
  var workletPromise = null;      // cached addModule() promise
  var running = false;
  var abortRequested = false;

  /* ============================================================
   *  Context / permissions
   * ============================================================ */

  /**
   * Tell iOS (Safari 17+) that we both play and record, otherwise the
   * output can be re-routed to the tiny earpiece at low volume as soon
   * as the microphone opens. Silently ignored elsewhere.
   */
  function setAudioSession(type) {
    try {
      if (navigator.audioSession) { navigator.audioSession.type = type; }
    } catch (e) { /* not supported: nothing to do */ }
  }

  function getContext() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) { throw new Error('noaudiocontext'); }
      ctx = new AC({ latencyHint: 'interactive' });
    }
    return ctx;
  }

  /**
   * MUST be called synchronously from inside a user gesture handler
   * (click/touch) before any await: iOS and Chrome only unlock audio
   * from within the gesture task.
   */
  function unlock() {
    var c = getContext();
    setAudioSession('play-and-record');

    // Legacy iOS unlock: start a 1-frame silent buffer.
    try {
      var b = c.createBuffer(1, 1, c.sampleRate);
      var s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch (e) { /* ignore */ }

    return (c.state === 'suspended' ? c.resume() : Promise.resolve())
      .catch(function () { /* resume can reject if already running */ })
      .then(function () { return c; });
  }

  /** Map a getUserMedia DOMException onto an I18N error key. */
  function errorKey(err) {
    var name = err && err.name ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
      return 'err.denied';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      return 'err.notFound';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
      return 'err.busy';
    }
    return 'err.generic';
  }

  /**
   * Constraints for a *measurement* microphone: every browser-side
   * "improvement" must be off, they are non-linear and time-variant.
   */
  function micConstraints(deviceId, exact) {
    var audio = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      // Non-standard but honoured by Chrome / Safari respectively:
      googEchoCancellation: false,
      googAutoGainControl: false,
      googNoiseSuppression: false,
      voiceIsolation: false,
      channelCount: 1
    };
    if (deviceId) {
      audio.deviceId = exact ? { exact: deviceId } : { ideal: deviceId };
    }
    return { audio: audio, video: false };
  }

  /**
   * Open (or reuse) the microphone stream.
   * Falls back progressively so that an over-constrained request never
   * leaves the user without a microphone.
   */
  function openStream(deviceId) {
    if (stream && stream.active && (!deviceId || deviceId === streamDeviceId)) {
      return Promise.resolve(stream);
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(makeErr(global.isSecureContext === false ? 'err.https' : 'err.noGetUserMedia'));
    }

    closeStream();
    setAudioSession('play-and-record');

    var gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    return gum(micConstraints(deviceId, true))
      .catch(function () { return gum(micConstraints(deviceId, false)); })
      .catch(function () { return gum(micConstraints(null, false)); })
      .catch(function () { return gum({ audio: true }); })
      .then(function (s) {
        stream = s;
        var track = s.getAudioTracks()[0];
        var settings = (track && track.getSettings) ? track.getSettings() : {};
        streamDeviceId = settings.deviceId || deviceId || null;
        return s;
      })
      .catch(function (err) { throw makeErr(errorKey(err), err); });
  }

  function makeErr(key, cause) {
    var e = new Error(key);
    e.i18nKey = key;
    e.cause = cause;
    return e;
  }

  function closeStream() {
    if (stream) {
      stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { /* */ } });
      stream = null;
      streamDeviceId = null;
    }
  }

  /** Label + settings of the microphone currently in use. */
  function currentInputInfo() {
    if (!stream) { return null; }
    var track = stream.getAudioTracks()[0];
    if (!track) { return null; }
    var settings = track.getSettings ? track.getSettings() : {};
    return {
      label: track.label || '',
      deviceId: settings.deviceId || streamDeviceId || '',
      groupId: settings.groupId || '',
      sampleRate: settings.sampleRate || null,
      channelCount: settings.channelCount || null,
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl
    };
  }

  /**
   * List audio inputs. Labels are empty until permission is granted,
   * which is why the UI only populates this after the mic test.
   */
  function listInputs() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return Promise.resolve([]);
    }
    return navigator.mediaDevices.enumerateDevices().then(function (devs) {
      return devs.filter(function (d) { return d.kind === 'audioinput'; })
                 .map(function (d) { return { deviceId: d.deviceId, label: d.label || '' }; });
    }).catch(function () { return []; });
  }

  /* ============================================================
   *  Level meter (microphone check)
   * ============================================================ */

  /**
   * Start the input meter. `onLevel({peak, rms, hold})` is called on
   * every animation frame with linear amplitudes.
   */
  function startMeter(deviceId, onLevel) {
    return openStream(deviceId).then(function (s) {
      stopMeter();
      var c = getContext();

      var src = c.createMediaStreamSource(s);
      var analyser = c.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;

      // Zero-gain path to the destination: guarantees the graph is
      // pulled in every implementation, stays inaudible.
      var sink = c.createGain();
      sink.gain.value = 0;
      src.connect(analyser);
      analyser.connect(sink);
      sink.connect(c.destination);

      var buf = new Float32Array(analyser.fftSize);
      var byteBuf = new Uint8Array(analyser.fftSize);
      var hasFloat = typeof analyser.getFloatTimeDomainData === 'function';
      var hold = 0;
      var raf = 0;
      var alive = true;

      function tick() {
        if (!alive) { return; }
        var peak = 0, sumSq = 0, i, v;

        if (hasFloat) {
          analyser.getFloatTimeDomainData(buf);
          for (i = 0; i < buf.length; i++) {
            v = buf[i];
            var a = v < 0 ? -v : v;
            if (a > peak) { peak = a; }
            sumSq += v * v;
          }
        } else {
          // Safari < 14.1 fallback: 8-bit time domain, centred on 128.
          analyser.getByteTimeDomainData(byteBuf);
          for (i = 0; i < byteBuf.length; i++) {
            v = (byteBuf[i] - 128) / 128;
            var b = v < 0 ? -v : v;
            if (b > peak) { peak = b; }
            sumSq += v * v;
          }
        }

        var rms = Math.sqrt(sumSq / buf.length);
        hold = Math.max(peak, hold * 0.94);        // ~1 s peak-hold decay
        onLevel({ peak: peak, rms: rms, hold: hold });
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      meter = {
        stop: function () {
          alive = false;
          cancelAnimationFrame(raf);
          try { src.disconnect(); analyser.disconnect(); sink.disconnect(); } catch (e) { /* */ }
        }
      };
      return currentInputInfo();
    });
  }

  function stopMeter() {
    if (meter) { meter.stop(); meter = null; }
  }

  function isMetering() { return meter !== null; }

  /* ============================================================
   *  Capture node (AudioWorklet, ScriptProcessor fallback)
   * ============================================================ */

  function ensureWorklet(c) {
    if (workletPromise) { return workletPromise; }
    if (!c.audioWorklet || !global.AudioWorkletNode || !global.Blob || !global.URL) {
      workletPromise = Promise.reject(new Error('no-worklet'));
      return workletPromise;
    }
    var url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
    workletPromise = c.audioWorklet.addModule(url).then(function () {
      URL.revokeObjectURL(url);
    }, function (e) {
      URL.revokeObjectURL(url);
      throw e;
    });
    return workletPromise;
  }

  /** Resolves to { node, kind, dispose } ; `onChunk` receives Float32Array copies. */
  function createRecorderNode(c, onChunk) {
    return ensureWorklet(c).then(function () {
      var node = new AudioWorkletNode(c, 'rira-recorder', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });
      node.port.onmessage = function (ev) { onChunk(ev.data); };
      return {
        node: node,
        kind: 'audioworklet',
        dispose: function () {
          node.port.onmessage = null;
          try { node.port.close(); } catch (e) { /* */ }
          try { node.disconnect(); } catch (e) { /* */ }
        }
      };
    }).catch(function () {
      // Deprecated but universally available; runs on the main thread.
      var node = c.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = function (ev) {
        onChunk(new Float32Array(ev.inputBuffer.getChannelData(0)));
        var out = ev.outputBuffer.getChannelData(0);
        for (var i = 0; i < out.length; i++) { out[i] = 0; }
      };
      return {
        node: node,
        kind: 'scriptprocessor',
        dispose: function () {
          node.onaudioprocess = null;
          try { node.disconnect(); } catch (e) { /* */ }
        }
      };
    });
  }

  /* ============================================================
   *  Measurement
   * ============================================================ */

  function abort() { abortRequested = true; }
  function isRunning() { return running; }

  /**
   * Play the sweep through the current output device while recording
   * the microphone.
   *
   * @param {object} p      f1, f2, duration, amplitude, preSilence,
   *                        postSilence, deviceId
   * @param {object} hooks  onStatus(key), onProgress(elapsed, total)
   * @returns {Promise<object>} recording + signal + timing information
   */
  function runMeasurement(p, hooks) {
    if (running) { return Promise.reject(makeErr('err.busy')); }
    running = true;
    abortRequested = false;
    hooks = hooks || {};
    var status = hooks.onStatus || function () {};
    var progress = hooks.onProgress || function () {};

    var c, sig, recorder, micSrc, sink, playSrc, playGain;
    var chunks = [];
    var captured = 0;
    var startAt = 0, recStartCtxTime = 0;

    function cleanup() {
      try { if (playSrc) { playSrc.stop(); } } catch (e) { /* already stopped */ }
      try { if (playSrc) { playSrc.disconnect(); } } catch (e) { /* */ }
      try { if (playGain) { playGain.disconnect(); } } catch (e) { /* */ }
      try { if (micSrc) { micSrc.disconnect(); } } catch (e) { /* */ }
      try { if (sink) { sink.disconnect(); } } catch (e) { /* */ }
      if (recorder) { recorder.dispose(); }
    }

    status('status.preparing');

    return Promise.resolve()
      .then(function () { c = getContext(); return openStream(p.deviceId); })
      .then(function () {
        // The signal is generated at the *live* context sample rate,
        // so no resampling ever happens on playback.
        sig = Chirp.generateSweep({
          sampleRate: c.sampleRate,
          f1: p.f1, f2: p.f2, duration: p.duration,
          amplitude: p.amplitude,
          preSilence: p.preSilence, postSilence: p.postSilence
        });
        return createRecorderNode(c, function (chunk) {
          chunks.push(chunk);
          captured += chunk.length;
        });
      })
      .then(function (rec) {
        recorder = rec;

        /* ---- capture path: mic -> recorder -> 0 gain -> out ---- */
        micSrc = c.createMediaStreamSource(stream);
        sink = c.createGain();
        sink.gain.value = 0;
        micSrc.connect(recorder.node);
        recorder.node.connect(sink);
        sink.connect(c.destination);

        recStartCtxTime = c.currentTime;   // approximate origin of sample 0

        /* ---- playback path: buffer -> gain(1) -> out ---- */
        var buffer = c.createBuffer(1, sig.totalSamples, c.sampleRate);
        buffer.getChannelData(0).set(sig.data);
        playSrc = c.createBufferSource();
        playSrc.buffer = buffer;
        playGain = c.createGain();
        playGain.gain.value = 1;           // amplitude is already in the samples
        playSrc.connect(playGain);
        playGain.connect(c.destination);

        startAt = recStartCtxTime + LEAD_S;
        playSrc.start(startAt);

        var total = sig.totalDuration;
        var stopAt = startAt + total + TAIL_S;

        status('status.playing');

        /* ---- wait, polling the audio clock (not wall clock) ---- */
        return new Promise(function (resolve) {
          var timer = setInterval(function () {
            var elapsed = c.currentTime - startAt;
            progress(Math.max(0, Math.min(elapsed, total)), total);
            if (abortRequested || c.currentTime >= stopAt) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      })
      .then(function () {
        status('status.finishing');
        cleanup();

        if (abortRequested) { throw makeErr('aborted'); }
        if (captured === 0) { throw makeErr('err.empty'); }

        var data = WAV.concatChunks(chunks, captured);
        chunks = null;

        var levels = WAV.analyseLevels(data);
        var info = currentInputInfo();

        return {
          data: data,
          sampleRate: c.sampleRate,
          channels: 1,
          durationSeconds: data.length / c.sampleRate,
          levels: levels,
          signal: sig,
          recorderKind: recorder.kind,
          input: info,
          timing: {
            leadSeconds: LEAD_S,
            tailSeconds: TAIL_S,
            // Where the reference signal *nominally* starts inside the
            // recording, ignoring every latency in the chain.
            nominalSignalStartSeconds: LEAD_S,
            nominalSignalStartSample: Math.round(LEAD_S * c.sampleRate),
            nominalSweepStartSeconds: LEAD_S + sig.sweepStartSample / c.sampleRate,
            nominalSweepStartSample: Math.round(LEAD_S * c.sampleRate) + sig.sweepStartSample,
            latencyCompensated: false,
            phaseCorrected: false,
            baseLatencySeconds: (typeof c.baseLatency === 'number') ? c.baseLatency : null,
            outputLatencySeconds: (typeof c.outputLatency === 'number') ? c.outputLatency : null
          }
        };
      })
      .catch(function (err) {
        cleanup();
        throw err;
      })
      .then(function (res) { running = false; return res; },
            function (err) { running = false; throw err; });
  }

  /* ============================================================ */

  global.Engine = {
    unlock: unlock,
    getContext: getContext,
    sampleRate: function () { return ctx ? ctx.sampleRate : null; },
    openStream: openStream,
    closeStream: closeStream,
    listInputs: listInputs,
    currentInputInfo: currentInputInfo,
    startMeter: startMeter,
    stopMeter: stopMeter,
    isMetering: isMetering,
    runMeasurement: runMeasurement,
    abort: abort,
    isRunning: isRunning,
    setAudioSession: setAudioSession,
    LEAD_S: LEAD_S,
    TAIL_S: TAIL_S
  };

})(window);
