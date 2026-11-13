/* A keypad of the app for typing a value on a touch screen (instead of the system keyboard, which covers a third
 * of the screen and has no SI prefixes): digits, decimal separator, ±, ⌫, and a row of units with prefixes for
 * the kind of value (µV mV V kV, nA µA mA A, Ω kΩ MΩ…). A unit key applies the value in that unit at once; OK
 * applies it in the unit shown. It floats over everything, can be moved by its top bar (the place is kept),
 * and also takes a physical keyboard (digits, , . − Backspace Delete Enter Esc, and the prefixes k M m u n).
 *   DCS.keypad.open({ title, value, unit, min, max, apply(v) → true if accepted, anchor (element) })
 */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const U = DCS.units;
  const MULT = { G: 1e9, M: 1e6, k: 1e3, '': 1, m: 1e-3, 'µ': 1e-6, n: 1e-9, p: 1e-12 };
  const SETS = { V: ['µ', 'm', '', 'k'], A: ['n', 'µ', 'm', ''], 'Ω': ['', 'k', 'M'], W: ['µ', 'm', '', 'k'], S: ['µ', 'm', ''] };
  const KEYP = { k: 'k', K: 'k', M: 'M', m: 'm', u: 'µ', 'µ': 'µ', n: 'n', G: 'G', p: 'p' };

  let box = null, st = null;
  const comma = () => DCS.i18n && DCS.i18n.getLang() !== 'en';
  const tr = (k) => (DCS.app ? DCS.app.tp(k) : k);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // the prefix to show a value in: the largest of the set not above it (else the smallest)
  function prefixFor(v, set) {
    const a = Math.abs(v);
    if (!a) return set.includes('') ? '' : set[0];
    let best = null;
    for (const p of set) if (MULT[p] <= a * 1.0005 && (best === null || MULT[p] > MULT[best])) best = p;
    return best === null ? set.reduce((x, y) => (MULT[y] < MULT[x] ? y : x)) : best;
  }
  const num = (v) => { let s = String(Number(v.toPrecision(6))); if (/e/.test(s)) s = v.toFixed(6).replace(/0+$/, '').replace(/\.$/, ''); return s; };

  function build() {
    box = el('div', 'kpad');
    box.setAttribute('role', 'dialog');
    box.hidden = true;
    box.innerHTML = '<div class="kp-bar"><span class="kp-grip"></span><span class="kp-title"></span><button type="button" class="kp-x" aria-label="×">✕</button></div>' +
      '<div class="kp-disp"><span class="kp-val"></span><span class="kp-unit"></span></div><div class="kp-info"></div><div class="kp-keys"></div><div class="kp-units"></div>';
    document.body.appendChild(box);
    box.querySelector('.kp-x').addEventListener('click', close);
    // moved by its bar, kept inside the window; the place is remembered
    const bar = box.querySelector('.kp-bar');
    let d = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const r = box.getBoundingClientRect();
      d = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
      try { bar.setPointerCapture(e.pointerId); } catch (_) { /* (none) */ }
      box.classList.add('moving');
    });
    bar.addEventListener('pointermove', (e) => {
      if (!d || d.id !== e.pointerId) return;
      place(e.clientX - d.dx, e.clientY - d.dy);
    });
    const up = () => {
      if (!d) return;
      d = null; box.classList.remove('moving');
      try { localStorage.setItem('dcs.kpadPos', JSON.stringify({ x: box.offsetLeft / innerWidth, y: box.offsetTop / innerHeight })); } catch (_) { /* (private mode) */ }
    };
    bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    // (taps on the keys never take the focus from the page: no system keyboard)
    box.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    window.addEventListener('resize', () => { if (!box.hidden) place(box.offsetLeft, box.offsetTop); });
  }
  function place(x, y) {
    const w = box.offsetWidth, h = box.offsetHeight;
    x = Math.max(4, Math.min(innerWidth - w - 4, x));
    y = Math.max(4, Math.min(innerHeight - h - 4, y));
    box.style.left = x + 'px'; box.style.top = y + 'px';
  }
  function key(label, fn, cls) {
    const b = el('button', 'kp-k' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function render() {
    const disp = box.querySelector('.kp-val');
    const sep = comma() ? ',' : '.';
    disp.textContent = (st.neg ? '−' : '') + (st.txt || '0').replace('.', sep);
    disp.classList.toggle('fresh', st.fresh);
    box.querySelector('.kp-unit').textContent = st.prefix + st.unit;
    const v = value();
    const bad = !isFinite(v) || v < st.min || v > st.max;
    box.querySelector('.kp-disp').classList.toggle('bad', bad && !st.fresh);
    box.querySelectorAll('.kp-units .kp-k').forEach((b) => b.classList.toggle('on', b.dataset.p === st.prefix));
  }
  const value = (p) => {
    const m = parseFloat(st.txt || '0');
    return (st.neg ? -1 : 1) * m * MULT[p === undefined ? st.prefix : p];
  };
  function type(ch) {
    if (st.fresh) { st.txt = ''; st.neg = false; st.fresh = false; }
    if (ch === '.') { if (st.txt.includes('.')) return; if (!st.txt) st.txt = '0'; }
    else if (st.txt === '0') st.txt = '';
    if (st.txt.replace('.', '').length >= 9) return;
    st.txt += ch;
    render();
  }
  function back() {
    if (st.fresh) { st.txt = ''; st.neg = false; st.fresh = false; }
    else st.txt = st.txt.slice(0, -1);
    render();
  }
  function clear() { st.txt = ''; st.neg = false; st.fresh = false; render(); }
  function sign() { if (st.min >= 0) return; st.fresh = false; st.neg = !st.neg; render(); }
  function commit(p) {
    if (p !== undefined) st.prefix = p;
    const v = value();
    if (!isFinite(v) || v < st.min || v > st.max || st.apply(v) === false) {
      const d = box.querySelector('.kp-disp');
      d.classList.add('bad', 'shake'); setTimeout(() => d.classList.remove('shake'), 400);
      return;
    }
    close();
  }
  function onKey(e) {
    if (!st) return;
    const k = e.key;
    let done = true;
    if (/^[0-9]$/.test(k)) type(k);
    else if (k === '.' || k === ',') type('.');
    else if (k === 'Backspace') back();
    else if (k === 'Delete') clear();
    else if (k === '-' || k === '−') sign();
    else if (k === 'Enter') commit();
    else if (k === 'Escape') close();
    else if (KEYP[k] && st.set.includes(KEYP[k])) { st.prefix = KEYP[k]; st.fresh = false; render(); }
    else done = false;
    // (no key reaches the circuit behind while the keypad is open: no rotation, no deletion…)
    e.stopPropagation();
    if (done) e.preventDefault();
  }

  function open(o) {
    if (!box) build();
    const set = (SETS[o.unit] || ['']).slice();
    const v = +o.value || 0;
    const prefix = prefixFor(v, set);
    st = { unit: o.unit || '', set, prefix, txt: num(Math.abs(v) / MULT[prefix]), neg: v < 0, fresh: true,
      min: o.min != null ? o.min : -Infinity, max: o.max != null ? o.max : Infinity, apply: o.apply };
    box.querySelector('.kp-title').innerHTML = o.title || '';
    const f = (x) => U.format(x, st.unit, { digits: 4, trim: true });
    box.querySelector('.kp-info').textContent = isFinite(st.min) && isFinite(st.max) ? f(st.min) + ' … ' + f(st.max) : isFinite(st.min) ? '≥ ' + f(st.min) : '';
    const keys = box.querySelector('.kp-keys');
    keys.innerHTML = '';
    const sep = comma() ? ',' : '.';
    for (const r of [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3']]) {
      for (const c of r) keys.appendChild(key(c, () => type(c)));
      if (r[0] === '7') keys.appendChild(key('⌫', back, 'fn'));
      if (r[0] === '4') keys.appendChild(key('C', clear, 'fn'));
      if (r[0] === '1') keys.appendChild(st.min < 0 ? key('±', sign, 'fn') : el('span', 'kp-gap'));
    }
    keys.appendChild(key('0', () => type('0'), 'wide'));
    keys.appendChild(key(sep, () => type('.')));
    keys.appendChild(key('OK', () => commit(), 'ok'));
    const units = box.querySelector('.kp-units');
    units.innerHTML = '';
    // the unit keys: the value is applied in that unit (a value without a unit: no row)
    if (st.unit && !/\//.test(st.unit)) {
      units.hidden = false;
      units.style.gridTemplateColumns = `repeat(${set.length}, 1fr)`;
      for (const p of set) { const b = key(p + st.unit, () => commit(p), 'unit'); b.dataset.p = p; units.appendChild(b); }
    } else units.hidden = true;
    box.hidden = false;
    render();
    // where it was left last time; else at the bottom of the screen on a phone, next to the value elsewhere
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem('dcs.kpadPos') || 'null'); } catch (_) { /* none */ }
    if (pos) place(pos.x * innerWidth, pos.y * innerHeight);
    else if (innerWidth < 600 || !o.anchor) place((innerWidth - box.offsetWidth) / 2, innerHeight - box.offsetHeight - 12);
    else { const r = o.anchor.getBoundingClientRect(); place(r.left, r.bottom + 8); }
    document.addEventListener('keydown', onKey, true);
  }
  function close() {
    if (!box || box.hidden) return;
    box.hidden = true; st = null;
    document.removeEventListener('keydown', onKey, true);
  }

  DCS.keypad = { open, close, isOpen: () => !!(box && !box.hidden) };
})(window);
