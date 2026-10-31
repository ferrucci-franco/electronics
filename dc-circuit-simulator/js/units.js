/* Engineering notation: formatting with SI prefixes and parsing of user input (4k7, 2.2M, 10m, 100µ ...). */
(function (root) {
  'use strict';

  const PREFIX = [
    [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']
  ];

  let decimalComma = false;
  function setDecimalComma(on) { decimalComma = !!on; }

  function fixed(x, digits) {
    // `digits` significant digits for a mantissa in [1, 1000)
    const intDigits = x >= 100 ? 3 : x >= 10 ? 2 : 1;
    const dec = Math.max(0, digits - intDigits);
    return x.toFixed(dec);
  }

  // format(value, unit, {digits, trim, sign})
  function format(v, unit, opts) {
    opts = opts || {};
    const digits = opts.digits || 3;
    unit = unit || '';
    if (v === Infinity) return '∞' + (unit ? ' ' + unit : '');
    if (v === -Infinity) return '−∞' + (unit ? ' ' + unit : '');
    if (v == null || isNaN(v)) return '—';
    const neg = v < 0;
    let a = Math.abs(v);
    // below these the values are numerical leakage (the 1 pS of open junctions), not physics: shown as 0
    const ZERO = { A: 5e-11, V: 1e-9, W: 1e-9 };
    if (a < (opts.zero != null ? opts.zero : ZERO[unit] || 1e-15)) return (opts.trim ? '0' : fixed(0, digits)) + (unit ? ' ' + unit : '');
    let k = PREFIX.length - 1;
    for (let i = 0; i < PREFIX.length; i++) { if (a >= PREFIX[i][0] * 0.9995) { k = i; break; } }
    let m = Number((a / PREFIX[k][0]).toPrecision(digits));
    if (m >= 1000 && k > 0) { k--; m = Number((a / PREFIX[k][0]).toPrecision(digits)); }
    let s = fixed(m, digits);
    if (opts.trim && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (decimalComma) s = s.replace('.', ',');
    const sign = neg ? '−' : (opts.sign && a > 0 ? '+' : '');
    return sign + s + ' ' + PREFIX[k][1] + unit;
  }

  const scale = (v, p) => (p < 1 ? v / Math.round(1 / p) : v * p);
  const MULT = { T: 1e12, G: 1e9, M: 1e6, MEG: 1e6, K: 1e3, k: 1e3, m: 1e-3, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, n: 1e-9, p: 1e-12, f: 1e-15 };

  // parse("4k7") = 4700, parse("2,2 MΩ") = 2.2e6, parse("-5") = -5. Returns NaN when invalid.
  function parse(str) {
    if (typeof str === 'number') return str;
    let s = String(str || '').trim().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(',', '.');
    s = s.replace(/(ohms?|Ω|V|A|W)$/i, '');
    if (!s) return NaN;
    // 4k7 style: digits, prefix, digits
    let m = s.match(/^([+-]?)(\d+)(meg|[TGMKkmuµμnpf])(\d+)$/i);
    if (m) {
      const p = m[3].toLowerCase() === 'meg' ? 1e6 : MULT[m[3]];
      return (m[1] === '-' ? -1 : 1) * scale(parseFloat(m[2] + '.' + m[4]), p);
    }
    m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(meg|[TGMKkmuµμnpf])?$/i);
    if (!m) return NaN;
    let v = parseFloat(m[1]);
    if (m[2]) v = scale(v, m[2].toLowerCase() === 'meg' ? 1e6 : MULT[m[2]]);
    return v;
  }

  const api = { format, parse, setDecimalComma };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.DCS = root.DCS || {}).units = api;
})(typeof window !== 'undefined' ? window : globalThis);
