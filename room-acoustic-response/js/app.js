/* ============================================================
 * app.js - UI controller: state machine, parameters, downloads.
 *
 * States: idle -> (mic test) -> measuring -> done
 * Every user-visible string goes through I18N.t().
 * ============================================================ */
(function (global) {
  'use strict';

  var APP_NAME    = 'room-impulse-response-app';
  var APP_VERSION = '1.0.0';

  /* ---------- tiny DOM helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function show(el, on) { el.hidden = !on; }

  var el = {};
  var wakeLock = null;
  var urls = [];                 // object URLs to revoke on the next run
  var lastResult = null;         // last measurement, kept for the summary
  var lastBits = 16;             // format used for the last WAV
  var lastWavSize = 0;           // size of the last WAV, for the summary
  var busy = false;

  /* ---------- default parameters (keyed like the slider elements) ---------- */
  var DEFAULTS = {
    f1: 20, f2: 2000, dur: 30, amp: 0.5, pre: 0, post: 0, bits: 16,
    clapdur: 5, clapthr: -20, clappre: 50
  };

  var mode = 'sweep';                  // 'sweep' | 'clap'
  var MODE_KEY = 'rira.mode';

  /* ----------------------------------------------------------------
   * Slider specifications.
   *
   * The two frequency sliders are LOGARITHMIC: their DOM value is an
   * abstract position 0..LOG_STEPS, mapped here onto [min, max]. A
   * linear Hz slider would spend 90 % of its travel above 2 kHz, which
   * is useless for room measurement. Times and amplitude are linear and
   * carry their own min/max/step in the HTML.
   * ---------------------------------------------------------------- */
  var LOG_STEPS = 1000;
  var SPEC = {
    f1:   { log: true,  min: 10,  max: 2000  },
    f2:   { log: true,  min: 100, max: 20000 },
    dur:  { log: false },
    amp:  { log: false },
    pre:  { log: false },
    post: { log: false },
    clapdur: { log: false },
    clapthr: { log: false },
    clappre: { log: false }
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /** Snap a frequency to a readable value: 1 / 5 / 10 Hz per decade. */
  function roundFreq(f) {
    if (f < 100)  { return Math.round(f); }
    if (f < 1000) { return Math.round(f / 5) * 5; }
    return Math.round(f / 10) * 10;
  }

  /** Slider position -> physical value. */
  function readSlider(key) {
    var spec = SPEC[key];
    var v = parseFloat(el[key].value);
    if (!isFinite(v)) { return DEFAULTS[key]; }
    if (!spec.log) { return v; }
    return roundFreq(spec.min * Math.pow(spec.max / spec.min, v / LOG_STEPS));
  }

  /** Physical value -> slider position. */
  function writeSlider(key, value) {
    var spec = SPEC[key];
    if (!isFinite(value)) { value = DEFAULTS[key]; }
    if (spec.log) {
      var f = clamp(value, spec.min, spec.max);
      el[key].value = Math.round(
        LOG_STEPS * Math.log(f / spec.min) / Math.log(spec.max / spec.min));
    } else {
      el[key].value = clamp(value, parseFloat(el[key].min), parseFloat(el[key].max));
    }
  }

  /* ----------------------------------------------------------------
   * Wheel / trackpad control for range inputs.
   *
   * Scrolling a page full of sliders must not nudge every slider the
   * pointer crosses, so the wheel only takes over once the pointer has
   * RESTED on one for WHEEL_ARM_MS. While armed the slider shows a ring
   * and swallows the wheel event; leaving it hands scrolling back.
   * ---------------------------------------------------------------- */
  var WHEEL_ARM_MS      = 300;
  var WHEEL_PX_PER_STEP = 100;   // one mouse notch in Chrome ~ one step
  var WHEEL_SAVE_MS     = 250;   // debounce before persisting

  /** Move `input` by `n` steps, snapped to its own step grid. */
  function bumpSlider(input, n) {
    var step = parseFloat(input.step) || 1;
    var lo   = parseFloat(input.min);
    var hi   = parseFloat(input.max);
    var v    = parseFloat(input.value) + n * step;
    // Re-snap: 0.1 and 0.05 steps accumulate binary drift otherwise.
    v = Math.round(v / step) * step;
    v = clamp(v, lo, hi);
    if (v === parseFloat(input.value)) { return false; }
    input.value = v;
    return true;
  }

  function attachWheel(input) {
    var armTimer = null, saveTimer = null, armed = false, acc = 0;

    function disarm() {
      if (armTimer) { clearTimeout(armTimer); armTimer = null; }
      armed = false; acc = 0;
      input.classList.remove('wheel-armed');
    }

    input.addEventListener('pointerenter', function (ev) {
      if (ev.pointerType === 'touch') { return; }   // no hover on a phone
      armTimer = setTimeout(function () {
        armed = true;
        input.classList.add('wheel-armed');
      }, WHEEL_ARM_MS);
    });
    input.addEventListener('pointerleave', disarm);
    input.addEventListener('pointerdown', disarm);  // dragging takes priority

    // passive:false so the page does not scroll while we consume the wheel.
    input.addEventListener('wheel', function (ev) {
      if (!armed) { return; }
      ev.preventDefault();

      var d = ev.deltaY || ev.deltaX;
      if (!d) { return; }

      var steps;
      if (ev.deltaMode === 0) {          // pixels: accumulate to a whole step
        acc += d;
        steps = (acc / WHEEL_PX_PER_STEP) | 0;
        if (!steps) { return; }
        acc -= steps * WHEEL_PX_PER_STEP;
      } else {                           // lines or pages: one step each
        steps = d > 0 ? 1 : -1;
        acc = 0;
      }

      // Wheel down (positive delta) lowers the value, as everywhere else.
      if (!bumpSlider(input, -steps)) { return; }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (saveTimer) { clearTimeout(saveTimer); }
      saveTimer = setTimeout(function () {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, WHEEL_SAVE_MS);
    }, { passive: false });
  }

  /**
   * Keep f2 strictly above f1 by pushing the *other* slider, so the
   * pair can never reach an invalid state from the UI.
   */
  function enforceFreqOrder(changed) {
    var f1 = readSlider('f1');
    var f2 = readSlider('f2');
    if (f2 > f1 * 1.05) { return; }
    if (changed === 'f1') {
      writeSlider('f2', Math.min(f1 * 1.2, SPEC.f2.max));
    } else {
      writeSlider('f1', Math.max(f2 / 1.2, SPEC.f1.min));
    }
  }

  /* ============================================================
   *  Status bar
   * ============================================================ */
  var statusState = { key: 'status.idle', vars: null, kind: '' };

  function setStatus(key, vars, kind) {
    statusState = { key: key, vars: vars || null, kind: kind || '' };
    renderStatus();
  }

  function renderStatus() {
    el.statusText.textContent = I18N.t(statusState.key, statusState.vars);
    el.statusbar.className = 'statusbar' + (statusState.kind ? ' is-' + statusState.kind : '');
  }

  function setError(keyOrErr) {
    var key = (typeof keyOrErr === 'string') ? keyOrErr
            : (keyOrErr && keyOrErr.i18nKey) ? keyOrErr.i18nKey
            : 'err.generic';
    setStatus('status.error', { msg: I18N.t(key) }, 'error');
    if (keyOrErr && keyOrErr.cause) { console.error(keyOrErr.cause); }
    else if (typeof keyOrErr !== 'string') { console.error(keyOrErr); }
  }

  /* ============================================================
   *  Parameters
   * ============================================================ */
  /** Physical parameters, as consumed by Chirp and Engine. */
  function readParams() {
    return {
      f1:          readSlider('f1'),
      f2:          readSlider('f2'),
      duration:    readSlider('dur'),
      amplitude:   readSlider('amp'),
      preSilence:  readSlider('pre'),
      postSilence: readSlider('post'),
      bits:        parseInt(el.bits.value, 10) === 32 ? 32 : 16,
      deviceId:    el.micSelect.value || null,

      // Clap mode. preRoll is stored in ms on the slider, seconds here.
      duration_clap:  readSlider('clapdur'),
      thresholdDbfs:  readSlider('clapthr'),
      preRoll:        readSlider('clappre') / 1000
    };
  }

  /** The subset Engine.runClapCapture expects. */
  function clapParams() {
    var p = readParams();
    return {
      duration: p.duration_clap,
      thresholdDbfs: p.thresholdDbfs,
      preRoll: p.preRoll,
      waitSeconds: 60,
      bits: p.bits,
      deviceId: p.deviceId
    };
  }

  /** `d` is keyed like DEFAULTS (f1, f2, dur, amp, pre, post, bits). */
  function writeParams(d) {
    writeSlider('f1', d.f1);   writeSlider('f2', d.f2);
    writeSlider('dur', d.dur); writeSlider('amp', d.amp);
    writeSlider('pre', d.pre); writeSlider('post', d.post);
    writeSlider('clapdur', d.clapdur);
    writeSlider('clapthr', d.clapthr);
    writeSlider('clappre', d.clappre);
    el.bits.value = String(d.bits === 32 ? 32 : 16);
  }

  function saveParams() {
    try {
      var p = readParams();
      localStorage.setItem('rira.params', JSON.stringify({
        f1: p.f1, f2: p.f2, dur: p.duration, amp: p.amplitude,
        pre: p.preSilence, post: p.postSilence, bits: p.bits,
        clapdur: p.duration_clap, clapthr: p.thresholdDbfs,
        clappre: Math.round(p.preRoll * 1000)
      }));
    } catch (e) { /* private mode */ }
  }

  function loadParams() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem('rira.params') || 'null'); } catch (e) { /* */ }
    var d = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      d[k] = (s && typeof s === 'object' && isFinite(s[k])) ? s[k] : DEFAULTS[k];
    });
    writeParams(d);
  }

  /** Live value displayed next to each slider. */
  function updateOutputs() {
    var p = readParams();
    el.outF1.textContent   = fmtHz(p.f1);
    el.outF2.textContent   = fmtHz(p.f2);
    el.outDur.textContent  = fmt(p.duration) + ' s';
    el.outAmp.textContent  = p.amplitude.toFixed(2) +
                             ' (' + fmtDb(20 * Math.log10(p.amplitude)) + ' dBFS)';
    el.outPre.textContent  = fmt(p.preSilence) + ' s';
    el.outPost.textContent = fmt(p.postSilence) + ' s';
    el.outClapDur.textContent = fmt(p.duration_clap) + ' s';
    el.outClapThr.textContent = fmt(p.thresholdDbfs) + ' dBFS';
    el.outClapPre.textContent = Math.round(p.preRoll * 1000) + ' ms';
  }

  function fmtHz(f) {
    if (f < 1000) { return f + ' Hz'; }
    return (f / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kHz';
  }

  /** "Sweep 20 -> 2000 Hz. Total duration ..." under the big button. */
  function updateRunHelp() {
    var p = readParams();
    if (mode === 'clap') {
      el.runHelp.textContent = I18N.t('clap.help');
      var srClap = Engine.sampleRate();
      el.sr.textContent = srClap ? (srClap + ' Hz') : '\u2014';
      return;
    }
    var total = p.preSilence + p.duration + p.postSilence;
    // With no padding (the default) the silence breakdown is just noise.
    var key = (p.preSilence + p.postSilence) > 0 ? 'step2.help' : 'step2.helpPlain';
    el.runHelp.textContent = I18N.t(key, {
      f1: fmt(p.f1), f2: fmt(p.f2), dur: fmt(p.duration),
      pre: fmt(p.preSilence), post: fmt(p.postSilence), total: fmt(total)
    });
    var sr = Engine.sampleRate();
    el.sr.textContent = sr ? (sr + ' Hz') : '—';
  }

  function fmt(x) {
    return (Math.round(x * 100) / 100).toString();
  }

  function fmtDb(db) {
    if (!isFinite(db)) { return '-∞'; }
    return (Math.round(db * 10) / 10).toFixed(1);
  }

  /* Binary units (KiB/MiB) are language-neutral, so they need no translation. */
  function fmtBytes(b) {
    if (b < 1024) { return b + ' B'; }
    if (b < 1024 * 1024) { return (b / 1024).toFixed(0) + ' KiB'; }
    return (b / 1024 / 1024).toFixed(1) + ' MiB';
  }

  /* ============================================================
   *  Theme (light / dark)
   *
   *  The palette class lives on <html> and is set by the inline
   *  bootstrap in index.html, before the stylesheet paints, so the page
   *  never flashes the wrong theme. Here we only flip it, persist the
   *  choice and keep the button in sync.
   * ============================================================ */
  var THEME_KEY = 'rira.theme';

  function isDark() {
    return document.documentElement.classList.contains('theme-dark');
  }

  /** The icon shows the ACTION, not the current state: moon = go dark. */
  function renderTheme() {
    var dark = isDark();
    el.themeIcon.textContent = dark ? '☀️' : '🌙';
    var label = I18N.t(dark ? 'theme.toLight' : 'theme.toDark');
    el.themeToggle.title = label;
    el.themeToggle.setAttribute('aria-label', label);
  }

  function setTheme(dark) {
    var cl = document.documentElement.classList;
    cl.toggle('theme-dark', dark);
    cl.toggle('theme-light', !dark);
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* private mode */ }
    renderTheme();
  }

  /** Highlight the pill matching the active language. */
  function renderLangPills() {
    var cur = I18N.getLang();
    for (var i = 0; i < el.langBtns.length; i++) {
      var b = el.langBtns[i];
      var on = b.getAttribute('data-lang') === cur;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* ============================================================
   *  Room modes (prediction card)
   *
   *  Pure presentation on top of js/modes.js: three dimension sliders
   *  in, a volume, the axial fundamentals, a log-scale strip and a
   *  table of the lowest eigenfrequencies out.
   * ============================================================ */
  var ROOM_KEY      = 'rira.room';
  var ROOM_DEFAULTS = { L: 5, W: 4, H: 2.7 };
  var MODE_LIMIT    = 12;
  // Fixed log axis, deliberately not adaptive: keeping it still makes rooms
  // comparable ("a bigger room pushes everything left"). The bounds cover
  // every setting the sliders allow — 8.6 Hz for a 20 m room at one end,
  // ~350 Hz for the 12th mode of the smallest room at the other.
  var STRIP_MIN     = 8;                        // Hz, left edge of the strip
  var STRIP_MAX     = 500;                      // Hz, right edge
  var STRIP_TICKS   = [10, 20, 50, 100, 200, 500];

  function readRoom() {
    return { L: parseFloat(el.rL.value), W: parseFloat(el.rW.value), H: parseFloat(el.rH.value) };
  }

  function saveRoom() {
    try { localStorage.setItem(ROOM_KEY, JSON.stringify(readRoom())); } catch (e) { /* */ }
  }

  function loadRoom() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(ROOM_KEY) || 'null'); } catch (e) { /* */ }
    ['L', 'W', 'H'].forEach(function (k) {
      var input = el['r' + k];
      var v = (s && typeof s === 'object' && isFinite(s[k])) ? s[k] : ROOM_DEFAULTS[k];
      input.value = clamp(v, parseFloat(input.min), parseFloat(input.max));
    });
  }

  /* TeX source of the mode formula. Pure symbols — nothing to translate. */
  var MODE_TEX =
    'f_{n_x n_y n_z} = \\frac{c}{2}\\sqrt{' +
    '\\left(\\frac{n_x}{L}\\right)^{2} + ' +
    '\\left(\\frac{n_y}{W}\\right)^{2} + ' +
    '\\left(\\frac{n_z}{H}\\right)^{2}}';

  /**
   * Typeset the formula with KaTeX. Called once: the formula never changes.
   * If the library did not load (offline, file://, blocked CDN), the plain
   * HTML/CSS fallback already sitting in the container simply stays.
   */
  function renderFormula() {
    if (!global.katex || !el.modesFormula) { return; }
    try {
      global.katex.render(MODE_TEX, el.modesFormula, {
        displayMode: true,
        throwOnError: false
      });
      el.modesFormula.classList.add('is-katex');
    } catch (e) { /* keep the fallback markup */ }
  }

  /** One decimal is the honest precision for this idealised model. */
  function fmtF(f) { return (Math.round(f * 10) / 10).toFixed(1); }

  /** Horizontal position of `f` on the logarithmic strip, in percent. */
  function stripPos(f) {
    return 100 * Math.log(f / STRIP_MIN) / Math.log(STRIP_MAX / STRIP_MIN);
  }

  function renderModes() {
    var r = readRoom();
    el.outL.textContent = fmt(r.L) + ' m';
    el.outW.textContent = fmt(r.W) + ' m';
    el.outH.textContent = fmt(r.H) + ' m';

    var res = Modes.compute(r.L, r.W, r.H, { limit: MODE_LIMIT });

    el.modesVol.textContent = fmt(res.volume) + ' m³';
    el.axL.textContent = fmtF(res.axial.L) + ' Hz';
    el.axW.textContent = fmtF(res.axial.W) + ' Hz';
    el.axH.textContent = fmtF(res.axial.H) + ' Hz';

    // Strip: one tick per mode. Modes outside [STRIP_MIN, STRIP_MAX] are
    // simply not drawn — the table below still lists them.
    var ticks = '';
    var rows = '';
    for (var i = 0; i < res.modes.length; i++) {
      var m = res.modes[i];
      var p = stripPos(m.f);
      if (p >= 0 && p <= 100) {
        ticks += '<span class="m t-' + m.type + '" style="left:' + p.toFixed(2) + '%"></span>';
      }
      rows += '<tr>' +
        '<td class="c-f">' + fmtF(m.f) + ' Hz</td>' +
        '<td class="c-n">(' + m.n.join(', ') + ')</td>' +
        '<td class="c-t t-' + m.type + '">' + I18N.t('modes.' + m.type) + '</td>' +
        '</tr>';
    }
    el.strip.innerHTML = ticks;
    el.modesTbody.innerHTML = rows;

    // Axis labels: those near an edge are pulled inside so they stay visible.
    var axis = '';
    for (var j = 0; j < STRIP_TICKS.length; j++) {
      var last = (j === STRIP_TICKS.length - 1);
      var q = stripPos(STRIP_TICKS[j]);
      var tr = q < 8 ? 'none' : (q > 92 ? 'translateX(-100%)' : 'translateX(-50%)');
      axis += '<span style="left:' + q.toFixed(2) + '%;transform:' + tr + '">' +
              STRIP_TICKS[j] + (last ? ' Hz' : '') + '</span>';
    }
    el.stripAxis.innerHTML = axis;

    el.modesHint.textContent = I18N.t('modes.hint', { f: fmtF(res.lowest) });
  }

  /* ============================================================
   *  Amplitude response preview
   *
   *  Drawn as inline SVG so it inherits the theme colours and stays
   *  crisp at any zoom, with no plotting library. The maths lives in
   *  js/spectrum.js; everything here is presentation.
   * ============================================================ */
  var SPEC_M = { l: 46, r: 12, t: 12, b: 30 };
  var lastSpectrum = null;             // kept so a language switch can redraw
  var lastSpecWidth = 0;               // to skip redraws that change nothing

  /** 1-2-5 ticks inside [f1, f2]. */
  function decadeTicks(f1, f2) {
    var out = [];
    for (var e = Math.floor(Math.log(f1) / Math.LN10); Math.pow(10, e) <= f2; e++) {
      for (var m = 0; m < 3; m++) {
        var v = [1, 2, 5][m] * Math.pow(10, e);
        if (v >= f1 && v <= f2) { out.push(v); }
      }
    }
    return out;
  }

  function fmtTickHz(f) {
    return f >= 1000 ? (f / 1000) + 'k' : String(f);
  }

  /**
   * Build the SVG for one analysed curve, at the exact pixel size of its
   * container. Drawing 1:1 rather than scaling a fixed viewBox is what keeps
   * the tick labels at their true size: a stretched viewBox would squash the
   * text horizontally, and a uniformly scaled one would shrink it to a few
   * pixels on a phone.
   */
  function spectrumSvg(r, w, h) {
    var x0 = SPEC_M.l, x1 = w - SPEC_M.r;
    var y0 = SPEC_M.t, y1 = h - SPEC_M.b;
    var lf1 = Math.log(r.f1), lf2 = Math.log(r.f2);
    var X = function (f) { return x0 + (x1 - x0) * (Math.log(f) - lf1) / (lf2 - lf1); };

    // Symmetric dB window, rounded outwards, wide enough to be honest and
    // narrow enough that small ripples stay visible.
    var span = Math.max(Math.abs(r.minDb), Math.abs(r.maxDb));
    var lim = Math.min(48, Math.max(12, Math.ceil(span / 6) * 6));
    var Y = function (db) { return y1 - (y1 - y0) * (clamp(db, -lim, lim) + lim) / (2 * lim); };

    var svg = '';

    // Horizontal grid + dB labels.
    var dbStep = lim <= 12 ? 6 : (lim <= 24 ? 12 : (lim <= 36 ? 12 : 24));
    for (var db = -lim; db <= lim; db += dbStep) {
      var gy = Y(db).toFixed(1);
      svg += '<line class="sp-grid" x1="' + x0 + '" y1="' + gy + '" x2="' + x1 + '" y2="' + gy + '"/>';
      svg += '<text class="sp-lbl sp-lbl-y" x="' + (x0 - 6) + '" y="' + gy + '">' +
             (db > 0 ? '+' : '') + db + '</text>';
    }

    // Vertical grid + frequency labels.
    var ticks = decadeTicks(r.f1, r.f2);
    for (var i = 0; i < ticks.length; i++) {
      var gx = X(ticks[i]).toFixed(1);
      svg += '<line class="sp-grid" x1="' + gx + '" y1="' + y0 + '" x2="' + gx + '" y2="' + y1 + '"/>';
      svg += '<text class="sp-lbl sp-lbl-x" x="' + gx + '" y="' + (y1 + 16) + '">' +
             fmtTickHz(ticks[i]) + '</text>';
    }

    // The 0 dB reference (the median of the curve) drawn a little stronger.
    svg += '<line class="sp-zero" x1="' + x0 + '" y1="' + Y(0).toFixed(1) +
           '" x2="' + x1 + '" y2="' + Y(0).toFixed(1) + '"/>';

    // The curve itself. NaN points are gaps, so the path is lifted there
    // rather than bridged across data we do not have.
    var d = '', pen = false;
    for (i = 0; i < r.freqs.length; i++) {
      if (!isFinite(r.db[i])) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + X(r.freqs[i]).toFixed(1) + ' ' + Y(r.db[i]).toFixed(1) + ' ';
      pen = true;
    }
    svg += '<path class="sp-curve" d="' + d.trim() + '"/>';
    svg += '<rect class="sp-frame" x="' + x0 + '" y="' + y0 +
           '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '"/>';

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
           '" role="img" aria-label="' + I18N.t('spec.title') + '">' + svg + '</svg>';
  }

  /** Redraw the plot and its captions from the stored analysis. */
  function renderSpectrum() {
    if (!lastSpectrum) { show(el.specBox, false); return; }
    if (lastSpectrum.pending) {
      el.specPlot.textContent = I18N.t('spec.computing');
      el.specNote.textContent = '';
      el.specMic.textContent = '';
      show(el.specBox, true);
      return;
    }
    if (!lastSpectrum.result) {
      el.specPlot.textContent = I18N.t('spec.none');
      el.specNote.textContent = '';
    } else {
      var w = Math.max(280, Math.round(el.specPlot.clientWidth) || 320);
      var h = w < 420 ? 190 : 240;
      lastSpecWidth = w;
      el.specPlot.innerHTML = spectrumSvg(lastSpectrum.result, w, h);
      el.specNote.textContent = I18N.t('spec.note', {
        bin: fmt(lastSpectrum.result.binHz),
        seg: lastSpectrum.result.segments
      });
    }
    el.specMic.textContent = I18N.t('spec.mic', {
      device: lastSpectrum.device || I18N.t('spec.micUnknown')
    });
    show(el.specBox, true);
  }

  /**
   * Analyse the measurement and draw it. The FFT work takes a few hundred
   * milliseconds on a desktop and a few seconds on a phone, so it runs on a
   * later task: the downloads appear first and the placeholder says what is
   * happening, instead of the page freezing on a blank card.
   */
  function analyseSpectrum(res, p) {
    var info = Engine.currentInputInfo();
    lastSpectrum = {
      pending: true,
      device: (info && info.label) || null,
      result: null
    };
    renderSpectrum();

    setTimeout(function () {
      var r = null;
      try {
        r = Spectrum.analyse(res.data, res.signal.data, res.sampleRate,
                             { f1: p.f1, f2: p.f2 });
      } catch (e) {
        r = null;                       // a broken preview must never break the app
      }
      lastSpectrum.pending = false;
      lastSpectrum.result = r;
      renderSpectrum();
    }, 60);
  }


  /* ============================================================
   *  Mode switch (sweep / clap)
   * ============================================================ */
  function setMode(next) {
    mode = (next === 'clap') ? 'clap' : 'sweep';
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* private mode */ }
    renderMode();
    updateRunHelp();
  }

  function renderMode() {
    for (var i = 0; i < el.modeBtns.length; i++) {
      var b = el.modeBtns[i];
      var on = b.getAttribute('data-mode') === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    show(el.sweepParams, mode === 'sweep');
    show(el.clapParams, mode === 'clap');
    el.btnStart.textContent = I18N.t(mode === 'clap' ? 'btn.startClap' : 'btn.start');
  }

  /* ============================================================
   *  Decay preview (clap mode)
   * ============================================================ */
  var DECAY_M = { l: 46, r: 12, t: 12, b: 30 };
  var DECAY_FLOOR = -60;                  // bottom of the dB axis
  var lastDecay = null;

  function niceTimeStep(tMax) {
    var raw = tMax / 5;
    var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var m = raw / pow;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
  }

  function decaySvg(r, w, h) {
    var x0 = DECAY_M.l, x1 = w - DECAY_M.r;
    var y0 = DECAY_M.t, y1 = h - DECAY_M.b;
    var tMax = Math.max(0.05, r.curve.t[r.curve.t.length - 1]);
    var X = function (t) { return x0 + (x1 - x0) * clamp(t, 0, tMax) / tMax; };
    var Y = function (db) {
      return y1 - (y1 - y0) * (clamp(db, DECAY_FLOOR, 0) - DECAY_FLOOR) / -DECAY_FLOOR;
    };

    var svg = '', db, gy, i;

    for (db = 0; db >= DECAY_FLOOR; db -= 10) {
      gy = Y(db).toFixed(1);
      svg += '<line class="sp-grid" x1="' + x0 + '" y1="' + gy + '" x2="' + x1 + '" y2="' + gy + '"/>';
      svg += '<text class="sp-lbl sp-lbl-y" x="' + (x0 - 6) + '" y="' + gy + '">' + db + '</text>';
    }

    var step = niceTimeStep(tMax);
    for (var t = 0; t <= tMax + 1e-9; t += step) {
      var gx = X(t).toFixed(1);
      svg += '<line class="sp-grid" x1="' + gx + '" y1="' + y0 + '" x2="' + gx + '" y2="' + y1 + '"/>';
      svg += '<text class="sp-lbl sp-lbl-x" x="' + gx + '" y="' + (y1 + 16) + '">' +
             (Math.round(t * 100) / 100) + '</text>';
    }

    // The fitted straight line, extended down to the floor, so the eye can
    // judge how straight the decay really was.
    var fit = r.best ? r[r.best] : null;
    if (fit && isFinite(fit.intercept)) {
      var tA = fit.fromT;
      var tB = (DECAY_FLOOR - fit.intercept) / fit.slopeDbPerS;
      tB = Math.min(tB, tMax);
      if (tB > tA) {
        svg += '<line class="dc-fit" x1="' + X(tA).toFixed(1) +
               '" y1="' + Y(fit.intercept + fit.slopeDbPerS * tA).toFixed(1) +
               '" x2="' + X(tB).toFixed(1) +
               '" y2="' + Y(fit.intercept + fit.slopeDbPerS * tB).toFixed(1) + '"/>';
      }
    }

    var d = '', pen = false;
    for (i = 0; i < r.curve.t.length; i++) {
      var v = r.curve.db[i];
      if (!isFinite(v)) { break; }
      d += (pen ? 'L' : 'M') + X(r.curve.t[i]).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
      pen = true;
    }
    svg += '<path class="sp-curve" d="' + d.trim() + '"/>';
    svg += '<rect class="sp-frame" x="' + x0 + '" y="' + y0 +
           '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '"/>';

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
           '" role="img" aria-label="' + I18N.t('decay.title') + '">' + svg + '</svg>';
  }

  function rtTile(labelKey, fit, big) {
    var value = fit ? fmt(Math.round(fit.rt60 * 100) / 100) + ' s' : '\u2014';
    var warn = (fit && fit.short) ? ' is-short' : '';
    return '<div class="tile' + (big ? ' tile-big' : '') + warn + '">' +
           '<span class="tile-label">' + I18N.t(labelKey) + '</span>' +
           '<strong>' + value + '</strong></div>';
  }

  function renderDecay() {
    if (!lastDecay) { show(el.decayBox, false); return; }
    if (lastDecay.pending) {
      el.decayPlot.textContent = I18N.t('decay.computing');
      el.decayTiles.innerHTML = '';
      el.decayNote.textContent = '';
      el.decayMic.textContent = '';
      show(el.decayBox, true);
      return;
    }

    var r = lastDecay.result;
    if (!r) {
      el.decayPlot.textContent = I18N.t('decay.none');
      el.decayTiles.innerHTML = '';
      el.decayNote.textContent = '';
    } else {
      var w = Math.max(280, Math.round(el.decayPlot.clientWidth) || 320);
      var h = w < 420 ? 190 : 240;
      el.decayPlot.innerHTML = decaySvg(r, w, h);

      var best = r.best ? r[r.best] : null;
      el.decayTiles.innerHTML =
        '<div class="tile tile-big"><span class="tile-label">' + I18N.t('decay.rt60') +
        '</span><strong>' + (best ? fmt(Math.round(best.rt60 * 100) / 100) + ' s' : '\u2014') +
        '</strong></div>' +
        rtTile('decay.edt', r.edt) + rtTile('decay.t20', r.t20) + rtTile('decay.t30', r.t30) +
        '<div class="tile"><span class="tile-label">' + I18N.t('decay.range') +
        '</span><strong>' + (isFinite(r.usableRangeDb) ? Math.round(r.usableRangeDb) : '\u221e') +
        ' dB</strong></div>';

      var note = I18N.t('decay.note', {
        best: r.best ? I18N.t('decay.' + r.best) : '\u2014',
        r2: best ? 'r\u00b2 ' + (Math.round(best.r2 * 1000) / 1000) : '\u2014',
        range: isFinite(r.usableRangeDb) ? Math.round(r.usableRangeDb) : '\u221e'
      });
      if (best && best.short) {
        note = I18N.t('decay.short', {
          range: isFinite(r.usableRangeDb) ? Math.round(r.usableRangeDb) : '\u221e',
          name: I18N.t('decay.' + r.best)
        }) + ' ' + note;
      }
      el.decayNote.textContent = note;
    }
    el.decayMic.textContent = I18N.t('decay.mic', {
      device: lastDecay.device || I18N.t('spec.micUnknown')
    });
    show(el.decayBox, true);
  }

  /** Analyse the captured impulse, off the current task like the spectrum. */
  function analyseDecay(res) {
    var info = Engine.currentInputInfo();
    lastDecay = { pending: true, device: (info && info.label) || null, result: null };
    renderDecay();

    setTimeout(function () {
      var r = null;
      try {
        r = Decay.analyse(res.data, res.sampleRate);
      } catch (e) { r = null; }
      lastDecay.pending = false;
      lastDecay.result = r;
      renderDecay();
    }, 60);
  }

  /* ============================================================
   *  Microphone test
   * ============================================================ */
  var metering = false;

  function renderMeter(lv) {
    var peakDb = WAV.toDbfs(lv.peak);
    var rmsDb  = WAV.toDbfs(lv.rms);
    var holdDb = WAV.toDbfs(lv.hold);

    el.valPeak.textContent = fmtDb(peakDb);
    el.valRms.textContent  = fmtDb(rmsDb);
    el.meterFill.style.width = pct(peakDb) + '%';
    el.meterHold.style.left  = pct(holdDb) + '%';

    if (lv.peak >= 0.999) {
      el.meterMsg.textContent = I18N.t('meter.clip');
    } else if (lv.hold < 0.0015) {              // about -56 dBFS
      el.meterMsg.textContent = I18N.t('meter.silent');
    } else {
      el.meterMsg.textContent = I18N.t('meter.ok');
    }
  }

  /** Map dBFS in [-60, 0] onto [0, 100] % of the bar. */
  function pct(db) {
    if (!isFinite(db)) { return 0; }
    var v = (db + 60) / 60 * 100;
    return Math.max(0, Math.min(100, v));
  }

  function resetMeter() {
    el.meterFill.style.width = '0%';
    el.meterHold.style.left = '0%';
    el.valPeak.textContent = '-∞';
    el.valRms.textContent = '-∞';
    el.meterMsg.textContent = I18N.t('meter.hint');
  }

  function startMicTest() {
    setStatus('status.permission', null, 'busy');
    el.btnMic.disabled = true;

    Engine.unlock()
      .then(function () { return Engine.startMeter(readParams().deviceId, renderMeter); })
      .then(function (info) {
        metering = true;
        el.btnMic.disabled = false;
        el.btnMic.textContent = I18N.t('btn.stopTest');
        el.btnMic.classList.add('is-active');
        showInputInfo(info);
        return refreshDeviceList();
      })
      .then(function () {
        updateRunHelp();
        setStatus('status.micOn', null, 'busy');
      })
      .catch(function (err) {
        metering = false;
        el.btnMic.disabled = false;
        el.btnMic.textContent = I18N.t('btn.testMic');
        el.btnMic.classList.remove('is-active');
        setError(err);
      });
  }

  function stopMicTest() {
    Engine.stopMeter();
    metering = false;
    el.btnMic.textContent = I18N.t('btn.testMic');
    el.btnMic.classList.remove('is-active');
    resetMeter();
    setStatus('status.micOff', null, '');
  }

  function showInputInfo(info) {
    if (info && info.label) {
      el.micName.textContent = info.label;
    } else if (info) {
      el.micName.textContent = I18N.t('mic.unknown');
    } else {
      el.micName.textContent = '—';
    }
  }

  /** Populate the device <select>; labels only exist after permission. */
  function refreshDeviceList() {
    return Engine.listInputs().then(function (devs) {
      var current = Engine.currentInputInfo();
      var selected = (current && current.deviceId) || el.micSelect.value || '';
      el.micSelect.innerHTML = '';

      var optDefault = document.createElement('option');
      optDefault.value = '';
      optDefault.textContent = I18N.t('mic.default');
      el.micSelect.appendChild(optDefault);

      devs.forEach(function (d, i) {
        var o = document.createElement('option');
        o.value = d.deviceId;
        o.textContent = d.label || (I18N.t('mic.selectLabel') + ' ' + (i + 1));
        el.micSelect.appendChild(o);
      });

      el.micSelect.disabled = devs.length === 0;
      if (selected) { el.micSelect.value = selected; }
    });
  }

  /* ============================================================
   *  Measurement
   * ============================================================ */
  function startMeasurement() {
    if (busy) { return; }

    // Must run inside the gesture, before any await.
    var unlocking = Engine.unlock();

    busy = true;
    lastResult = null;
    hideDownloads();
    setStatus('status.preparing', null, 'busy');
    el.btnStart.disabled = true;
    show(el.btnAbort, true);
    show(el.progress, true);
    show(el.countdown, true);
    el.progressFill.style.width = '0%';
    if (metering) { stopMicTest(); }
    acquireWakeLock();
    global.addEventListener('beforeunload', warnOnUnload);

    var p;
    unlocking
      .then(function (c) {
        p = readParams();

        if (mode === 'clap') {
          // Nothing is played: we arm, then wait for the user's own impulse.
          updateRunHelp();
          return Engine.runClapCapture(clapParams(), {
            onStatus: function (key) {
              setStatus(key, null, key === 'status.waitClap' ? 'rec' : 'busy');
            },
            onProgress: function (elapsed, total) {
              if (elapsed <= 0) {
                el.progressFill.style.width = '0%';
                el.countdown.textContent = I18N.t('clap.armed');
                return;
              }
              el.progressFill.style.width = (elapsed / total * 100).toFixed(1) + '%';
              el.countdown.textContent = I18N.t('progress.remaining', {
                s: Math.max(0, Math.ceil(total - elapsed))
              });
            }
          });
        }

        var bad = Chirp.validate(p, c.sampleRate);
        if (bad) {
          var e = new Error('params');
          e.i18nKey = 'params';
          e.paramsMsg = I18N.t(bad.key, bad.vars);
          throw e;
        }
        updateRunHelp();
        return Engine.runMeasurement(p, {
          onStatus: function (key) {
            setStatus(key, null, key === 'status.playing' ? 'rec' : 'busy');
          },
          onProgress: function (elapsed, total) {
            el.progressFill.style.width = (elapsed / total * 100).toFixed(1) + '%';
            el.countdown.textContent = I18N.t('progress.remaining', {
              s: Math.max(0, Math.ceil(total - elapsed))
            });
          }
        });
      })
      .then(function (res) {
        lastResult = res;
        buildDownloads(res, p);
        setStatus('status.done', null, 'ok');
        el.stepDl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (err) {
        if (err && err.message === 'aborted') {
          setStatus('status.aborted', null, '');
        } else if (err && err.i18nKey === 'params') {
          setStatus('status.error', { msg: I18N.t('err.params', { msg: err.paramsMsg }) }, 'error');
        } else {
          setError(err);
        }
      })
      .then(function () {
        busy = false;
        el.btnStart.disabled = false;
        show(el.btnAbort, false);
        show(el.countdown, false);
        releaseWakeLock();
        global.removeEventListener('beforeunload', warnOnUnload);
        updateRunHelp();
      });
  }

  function warnOnUnload(e) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }

  function acquireWakeLock() {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; },
                                                  function () { /* denied */ });
      }
    } catch (e) { /* unsupported */ }
  }

  function releaseWakeLock() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) { /* */ } wakeLock = null; }
  }

  /* ============================================================
   *  Downloads (WAV + JSON metadata + reference signal)
   * ============================================================ */
  function hideDownloads() {
    show(el.dlWav, false); show(el.dlJson, false); show(el.dlRef, false);
    show(el.dlHint, false);
    lastSpectrum = null;
    lastDecay = null;
    show(el.specBox, false);
    show(el.decayBox, false);
    el.summary.textContent = I18N.t('step3.empty');
  }

  function revokeUrls() {
    urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { /* */ } });
    urls = [];
  }

  function link(anchor, blob, filename) {
    var url = URL.createObjectURL(blob);
    urls.push(url);
    anchor.href = url;
    anchor.download = filename;
    show(anchor, true);
    return blob.size;
  }

  function buildDownloads(res, p) {
    revokeUrls();

    var id = timestampId();
    var bits = p.bits;

    /* --- recording --- */
    var wavBlob = WAV.encodeWAV([res.data], res.sampleRate, bits);
    var wavSize = link(el.dlWav, wavBlob, 'mesure_' + id + '.wav');

    /* --- reference signal: sweep mode only, a clap has none --- */
    if (res.signal) {
      var refBlob = WAV.encodeWAV([res.signal.data], res.sampleRate, bits);
      link(el.dlRef, refBlob, 'reference_' + id + '.wav');
    }

    /* --- metadata --- */
    var meta = buildMetadata(res, p, id, bits, wavSize);
    var jsonBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    link(el.dlJson, jsonBlob, 'mesure_' + id + '.json');

    show(el.dlHint, true);
    lastBits = bits;
    lastWavSize = wavSize;
    renderSummary(res, bits, wavSize);
    if (res.mode === 'clap') { analyseDecay(res); } else { analyseSpectrum(res, p); }
  }

  function renderSummary(res, bits, wavSize) {
    var txt = I18N.t('res.summary', {
      dur: fmt(res.durationSeconds),
      sr: res.sampleRate,
      bits: bits === 32 ? 'float32' : 'PCM 16',
      size: fmtBytes(wavSize),
      peak: fmtDb(res.levels.peakDbfs)
    });
    if (res.levels.clipped) {
      txt += ' — ' + I18N.t('res.clipped');
    } else if (res.levels.peakDbfs < -45) {
      txt += ' — ' + I18N.t('res.low', { peak: fmtDb(res.levels.peakDbfs) });
    }
    el.summary.textContent = txt;
  }

  /** Local timestamp, filename-safe: 20260827-142530 */
  function timestampId() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate()) +
           '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  /**
   * The JSON companion file. Everything an analysis script needs to
   * rebuild the excitation and to know what was NOT compensated.
   */
  function buildMetadata(res, p, id, bits, wavSize) {
    var now = new Date();
    var info = res.input || {};
    var clap = (res.mode === 'clap');

    // A clap has no reference signal and no playback, so the sweep and
    // timing blocks are replaced by what actually describes the capture.
    var signalBlock = clap ? {
      type: 'hand-clap-impulse',
      excitation: 'acoustic impulse produced by the user, not by the application',
      referenceFile: null,
      note: 'The spectrum of a clap is unknown and varies from one clap to the ' +
            'next, so NO frequency response can be derived from this file. The ' +
            'decay rate can: it is a property of the room alone as long as the ' +
            'source is short compared with the decay.',
      triggerThresholdDbfs: res.trigger.thresholdDbfs,
      preRollSeconds: round2(res.trigger.preRollSeconds),
      preRollSamples: res.trigger.preRollSamples,
      requestedDurationSeconds: res.trigger.requestedSeconds,
      waitedForClapSeconds: round2(res.trigger.waitedSeconds)
    } : {
      type: 'exponential-sine-sweep',
      startFrequencyHz: p.f1,
      endFrequencyHz: p.f2,
      sweepDurationSeconds: p.duration,
      preSilenceSeconds: p.preSilence,
      postSilenceSeconds: p.postSilence,
      totalDurationSeconds: res.signal.totalDuration,
      digitalAmplitude: p.amplitude,
      fadeInSeconds: res.signal.fadeInS,
      fadeOutSeconds: res.signal.fadeOutS,
      fadeWindow: 'raised-cosine',
      formula: res.signal.formula,
      referenceFile: 'reference_' + id + '.wav',
      sweepStartSampleInReference: res.signal.sweepStartSample,
      sweepEndSampleInReference: res.signal.sweepEndSample
    };

    var timingBlock = clap ? {
      note: 'Impulse mode: nothing is played, so there is no playback latency ' +
            'to compensate. The impulse sits just after the pre-roll.',
      latencyCompensated: false,
      phaseCorrected: false,
      preRollSeconds: round2(res.trigger.preRollSeconds)
    } : null;

    return {
      schema: clap ? 'acoustic-impulse-measurement/1' : 'acoustic-sweep-measurement/1',
      mode: clap ? 'clap' : 'sweep',
      application: { name: APP_NAME, version: APP_VERSION },
      measurement: {
        id: id,
        timestampLocal: now.toString(),
        timestampUTC: now.toISOString(),
        timezoneOffsetMinutes: now.getTimezoneOffset()
      },
      signal: signalBlock,
      recording: {
        file: 'mesure_' + id + '.wav',
        container: 'RIFF/WAVE',
        encoding: bits === 32 ? 'IEEE float 32-bit little-endian'
                              : 'PCM signed 16-bit little-endian',
        bitDepth: bits,
        sampleRateHz: res.sampleRate,
        channels: res.channels,
        samples: res.data.length,
        durationSeconds: res.durationSeconds,
        fileSizeBytes: wavSize,
        peakDbfs: isFinite(res.levels.peakDbfs) ? round2(res.levels.peakDbfs) : null,
        rmsDbfs: isFinite(res.levels.rmsDbfs) ? round2(res.levels.rmsDbfs) : null,
        clipped: res.levels.clipped,
        clippedSamples: res.levels.clippedSamples,
        captureBackend: res.recorderKind
      },
      timing: timingBlock || {
        note: 'Nominal values only. The acoustic round trip (Bluetooth encoding, ' +
              'speaker buffering, microphone input latency) is NOT measured and NOT ' +
              'compensated. Align the recording with the reference by cross-correlation ' +
              'before any phase-sensitive analysis.',
        latencyCompensated: res.timing.latencyCompensated,
        phaseCorrected: res.timing.phaseCorrected,
        leadSilenceSeconds: res.timing.leadSeconds,
        tailSilenceSeconds: res.timing.tailSeconds,
        nominalReferenceStartSample: res.timing.nominalSignalStartSample,
        nominalReferenceStartSeconds: res.timing.nominalSignalStartSeconds,
        nominalSweepStartSample: res.timing.nominalSweepStartSample,
        nominalSweepStartSeconds: res.timing.nominalSweepStartSeconds,
        audioContextBaseLatencySeconds: res.timing.baseLatencySeconds,
        audioContextOutputLatencySeconds: res.timing.outputLatencySeconds
      },
      device: {
        microphoneLabel: info.label || null,
        microphoneDeviceId: info.deviceId || null,
        microphoneGroupId: info.groupId || null,
        trackSampleRateHz: info.sampleRate || null,
        trackChannelCount: info.channelCount || null,
        echoCancellation: info.echoCancellation !== undefined ? info.echoCancellation : null,
        noiseSuppression: info.noiseSuppression !== undefined ? info.noiseSuppression : null,
        autoGainControl: info.autoGainControl !== undefined ? info.autoGainControl : null,
        outputDevice: 'unknown (the browser does not expose the active output device)',
        userAgent: navigator.userAgent || null,
        platform: navigator.platform || null,
        language: navigator.language || null,
        uiLanguage: I18N.getLang()
      }
    };
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  /* ============================================================
   *  Wiring
   * ============================================================ */
  function init() {
    el = {
      langBtns: document.querySelectorAll('.lang-btn'),
      themeToggle: $('theme-toggle'),
      themeIcon: $('theme-icon'),
      rL: $('p-L'), rW: $('p-W'), rH: $('p-H'),
      outL: $('out-L'), outW: $('out-W'), outH: $('out-H'),
      modesVol: $('modes-vol'),
      axL: $('ax-L'), axW: $('ax-W'), axH: $('ax-H'),
      strip: $('modes-strip'), stripAxis: $('modes-axis'),
      modesTbody: $('modes-tbody'), modesHint: $('modes-hint'),
      modesFormula: $('modes-formula'),
      btnMic: $('btn-mic'),
      micName: $('mic-name'),
      micSelect: $('mic-select'),
      meterFill: $('meter-fill'),
      meterHold: $('meter-hold'),
      valPeak: $('val-peak'),
      valRms: $('val-rms'),
      meterMsg: $('meter-msg'),
      runHelp: $('run-help'),
      btnStart: $('btn-start'),
      btnAbort: $('btn-abort'),
      progress: $('progress'),
      progressFill: $('progress-fill'),
      countdown: $('countdown'),
      stepDl: $('step-dl'),
      summary: $('result-summary'),
      dlWav: $('dl-wav'),
      dlJson: $('dl-json'),
      dlRef: $('dl-ref'),
      dlHint: $('dl-hint'),
      specBox: $('spec-box'), specPlot: $('spec-plot'),
      specMic: $('spec-mic'), specNote: $('spec-note'),
      decayBox: $('decay-box'), decayPlot: $('decay-plot'),
      decayMic: $('decay-mic'), decayNote: $('decay-note'),
      decayTiles: $('decay-tiles'),
      modeBtns: document.querySelectorAll('.mode-btn'),
      sweepParams: $('sweep-params'), clapParams: $('clap-params'),
      clapdur: $('p-clapdur'), clapthr: $('p-clapthr'), clappre: $('p-clappre'),
      outClapDur: $('out-clapdur'), outClapThr: $('out-clapthr'),
      outClapPre: $('out-clappre'),
      f1: $('p-f1'), f2: $('p-f2'), dur: $('p-dur'), amp: $('p-amp'),
      pre: $('p-pre'), post: $('p-post'), bits: $('p-bits'), sr: $('p-sr'),
      outF1: $('out-f1'), outF2: $('out-f2'), outDur: $('out-dur'),
      outAmp: $('out-amp'), outPre: $('out-pre'), outPost: $('out-post'),
      btnReset: $('btn-reset'),
      statusbar: $('statusbar'),
      statusText: $('status-text')
    };

    /* ---- language ---- */
    I18N.setLang(I18N.detect());
    for (var i = 0; i < el.langBtns.length; i++) {
      el.langBtns[i].addEventListener('click', function () {
        I18N.setLang(this.getAttribute('data-lang'));
      });
    }
    document.addEventListener('i18n:changed', function () {
      renderLangPills();
      renderTheme();
      renderMode();
      renderModes();
      renderSpectrum();
      renderDecay();
      renderStatus();
      updateOutputs();
      updateRunHelp();
      el.btnMic.textContent = I18N.t(metering ? 'btn.stopTest' : 'btn.testMic');
      el.btnStart.textContent = I18N.t(mode === 'clap' ? 'btn.startClap' : 'btn.start');
      if (!metering) { resetMeter(); }
      if (lastResult) {
        renderSummary(lastResult, lastBits, lastWavSize);
      } else {
        el.summary.textContent = I18N.t('step3.empty');
      }
      showInputInfo(Engine.currentInputInfo());
    });

    /* ---- theme ---- */
    el.themeToggle.addEventListener('click', function () { setTheme(!isDark()); });

    /* ---- measurement mode ---- */
    try {
      var storedMode = localStorage.getItem(MODE_KEY);
      if (storedMode === 'clap' || storedMode === 'sweep') { mode = storedMode; }
    } catch (e) { /* private mode */ }
    for (var m = 0; m < el.modeBtns.length; m++) {
      el.modeBtns[m].addEventListener('click', function () {
        if (busy) { return; }
        setMode(this.getAttribute('data-mode'));
      });
    }

    /* ---- room modes ---- */
    loadRoom();
    ['L', 'W', 'H'].forEach(function (k) {
      el['r' + k].addEventListener('input', renderModes);
      el['r' + k].addEventListener('change', saveRoom);
    });

    /* ---- wheel / trackpad on every slider ---- */
    ['f1', 'f2', 'dur', 'amp', 'pre', 'post', 'clapdur', 'clapthr', 'clappre',
     'rL', 'rW', 'rH'].forEach(function (k) {
      attachWheel(el[k]);
    });

    /* ---- parameters ---- */
    loadParams();
    ['f1', 'f2', 'dur', 'amp', 'pre', 'post', 'clapdur', 'clapthr', 'clappre']
      .forEach(function (key) {
      // 'input' fires continuously while dragging: refresh the readouts.
      el[key].addEventListener('input', function () {
        if (key === 'f1' || key === 'f2') { enforceFreqOrder(key); }
        updateOutputs();
        updateRunHelp();
      });
      // 'change' fires when the thumb is released: persist then.
      el[key].addEventListener('change', saveParams);
    });
    el.bits.addEventListener('change', function () { saveParams(); updateRunHelp(); });
    el.btnReset.addEventListener('click', function () {
      writeParams(DEFAULTS); saveParams(); updateOutputs(); updateRunHelp();
    });

    /* ---- microphone ---- */
    el.btnMic.addEventListener('click', function () {
      if (metering) { stopMicTest(); } else { startMicTest(); }
    });
    el.micSelect.addEventListener('change', function () {
      if (metering) { Engine.stopMeter(); metering = false; startMicTest(); }
    });
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', function () {
        if (metering) { refreshDeviceList(); }
      });
    }

    /* ---- redraw the plot when the column width really changes ---- */
    var specResizeTimer = null;
    global.addEventListener('resize', function () {
      var haveSpec = lastSpectrum && lastSpectrum.result;
      var haveDecay = lastDecay && lastDecay.result;
      if (!haveSpec && !haveDecay) { return; }
      if (specResizeTimer) { clearTimeout(specResizeTimer); }
      specResizeTimer = setTimeout(function () {
        // Both plots are drawn at their container's pixel size, so both have
        // to be rebuilt when that width changes (phone rotation, split view).
        if (haveSpec) {
          var w = Math.max(280, Math.round(el.specPlot.clientWidth) || 320);
          if (Math.abs(w - lastSpecWidth) > 8) { renderSpectrum(); }
        }
        if (haveDecay) {
          var svg = el.decayPlot.querySelector('svg');
          var dw = Math.max(280, Math.round(el.decayPlot.clientWidth) || 320);
          if (!svg || Math.abs(dw - parseFloat(svg.getAttribute('width'))) > 8) {
            renderDecay();
          }
        }
      }, 200);
    });

    /* ---- measurement ---- */
    el.btnStart.addEventListener('click', startMeasurement);
    el.btnAbort.addEventListener('click', function () { Engine.abort(); });

    /* ---- initial render ---- */
    renderLangPills();
    renderTheme();
    renderMode();
    renderFormula();
    renderModes();
    hideDownloads();
    resetMeter();
    updateOutputs();
    updateRunHelp();
    el.micSelect.title = I18N.t('mic.needTest');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(global.isSecureContext === false ? 'err.https' : 'err.noGetUserMedia');
      el.btnMic.disabled = true;
      el.btnStart.disabled = true;
    } else {
      setStatus('status.idle', null, '');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
