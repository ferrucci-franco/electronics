/* Component catalogue: terminals, properties and symbols (USA and IEC/European styles).
 * Geometry is in grid units, in the component's local frame; the editor rotates (0..3 quarter turns,
 * clockwise on screen) and mirrors (flip: y -> -y, before the rotation) that frame. */
(function (root) {
  'use strict';

  // LED colours: typical forward voltage at about 10 mA and the colour of the light
  const LED_COLORS = {
    red: { vf: 1.8, rgb: [255, 45, 45] }, orange: { vf: 2.0, rgb: [255, 140, 20] }, yellow: { vf: 2.1, rgb: [255, 215, 0] },
    green: { vf: 2.2, rgb: [40, 220, 70] }, blue: { vf: 3.0, rgb: [50, 120, 255] }, white: { vf: 3.1, rgb: [255, 255, 255] }
  };
  const isDiode = (c) => c.type === 'diode' || c.type === 'schottky' || c.type === 'led';

  const TYPES = {
    resistor: {
      prefix: 'R', terms: [[-2, 0], [2, 0]], box: [-2, -0.75, 2, 0.75],
      props: [{ key: 'R', unit: 'Ω', def: 1000, min: 1e-3, max: 1e10 }],
      valueText: (c, f) => f(c.props.R, 'Ω')
    },
    vsource: {
      prefix: 'V', terms: [[-2, 0], [2, 0]], box: [-2, -1, 2, 1], defRot: 1,
      props: [{ key: 'V', unit: 'V', def: 5, min: -1e6, max: 1e6 }],
      valueText: (c, f) => f(c.props.V, 'V')
    },
    isource: {
      prefix: 'I', terms: [[-2, 0], [2, 0]], box: [-2, -1, 2, 1], defRot: 3,
      props: [{ key: 'I', unit: 'A', def: 1e-3, min: -1e3, max: 1e3 }],
      valueText: (c, f) => f(c.props.I, 'A')
    },
    ammeter: { prefix: 'AM', terms: [[-2, 0], [2, 0]], box: [-2, -1, 2, 1], props: [] },
    voltmeter: { prefix: 'VM', terms: [[-2, 0], [2, 0]], box: [-2, -1, 2, 1], defRot: 1, props: [] },
    diode: {
      prefix: 'D', terms: [[-2, 0], [2, 0]], box: [-2, -0.8, 2, 0.8],
      props: [
        { key: 'model', type: 'select', options: ['ideal', 'cvd', 'exact'], def: 'cvd' },
        { key: 'Vf', unit: 'V', def: 0.7, min: 0, max: 10, show: c => c.props.model === 'cvd' },
        { key: 'rd', unit: 'Ω', def: 0, min: 0, max: 1e6, show: c => c.props.model === 'cvd' },
        { key: 'Is', unit: 'A', def: 1e-14, min: 1e-20, max: 1e-3, show: c => c.props.model === 'exact' },
        { key: 'N', unit: '', def: 1, min: 0.5, max: 5, show: c => c.props.model === 'exact' }
      ],
      valueText: (c, f, t) => t('model_' + c.props.model + '_short')
    },
    schottky: {
      prefix: 'D', terms: [[-2, 0], [2, 0]], box: [-2, -0.8, 2, 0.8],
      props: [
        { key: 'model', type: 'select', options: ['ideal', 'cvd', 'exact'], def: 'cvd' },
        { key: 'Vf', unit: 'V', def: 0.3, min: 0, max: 10, show: c => c.props.model === 'cvd' },
        { key: 'rd', unit: 'Ω', def: 0, min: 0, max: 1e6, show: c => c.props.model === 'cvd' },
        { key: 'Is', unit: 'A', def: 1e-8, min: 1e-20, max: 1e-3, show: c => c.props.model === 'exact' },
        { key: 'N', unit: '', def: 1.05, min: 0.5, max: 5, show: c => c.props.model === 'exact' }
      ],
      valueText: (c, f, t) => t('model_' + c.props.model + '_short')
    },
    led: {
      prefix: 'LED', terms: [[-2, 0], [2, 0]], box: [-2, -1.25, 2, 0.8],
      props: [
        { key: 'color', type: 'select', options: ['red', 'orange', 'yellow', 'green', 'blue', 'white'], def: 'red', onChange: c => { c.props.Vf = LED_COLORS[c.props.color].vf; } },
        { key: 'model', type: 'select', options: ['cvd', 'exact'], def: 'cvd' },
        { key: 'Vf', unit: 'V', def: 1.8, min: 0.5, max: 6 },
        { key: 'rd', unit: 'Ω', def: 0, min: 0, max: 1e6, show: c => c.props.model === 'cvd' },
        { key: 'Imax', unit: 'A', def: 0.02, min: 1e-4, max: 10 }
      ],
      valueText: (c, f, t) => t(c.props.color) + ' · ' + f(c.props.Vf, 'V')
    },
    rgbled: {
      prefix: 'LED', terms: [[-3, -2], [-3, 0], [-3, 2], [3, 0]], termNames: ['R', 'G', 'B', 'COM'], box: [-3, -2.4, 3, 2.4],
      props: [
        { key: 'common', type: 'select', options: ['cc', 'ca'], def: 'cc' },
        { key: 'model', type: 'select', options: ['cvd', 'exact'], def: 'cvd' },
        { key: 'VfR', unit: 'V', def: 2.0, min: 0.5, max: 6 },
        { key: 'VfG', unit: 'V', def: 3.0, min: 0.5, max: 6 },
        { key: 'VfB', unit: 'V', def: 3.1, min: 0.5, max: 6 },
        { key: 'Imax', unit: 'A', def: 0.02, min: 1e-4, max: 10 }
      ],
      valueText: (c, f, t) => 'RGB · ' + t(c.props.common)
    },
    ground: { prefix: 'GND', terms: [[0, 0]], box: [-0.9, -0.2, 0.9, 1.6], props: [] },
    opamp: {
      prefix: 'U', terms: [[-3, 1], [-3, -1], [3, 0]], termNames: ['+', '−', 'out'], box: [-3, -2.2, 3, 2.2],
      props: [
        { key: 'sat', type: 'bool', def: true },
        { key: 'Vpos', unit: 'V', def: 15, min: -1e4, max: 1e4, show: c => c.props.sat },
        { key: 'Vneg', unit: 'V', def: -15, min: -1e4, max: 1e4, show: c => c.props.sat }
      ]
    },
    bjt: {
      prefix: 'Q', terms: [[-2, 0], [1, -2], [1, 2]], termNames: ['B', 'C', 'E'], box: [-2, -2, 1.8, 2],
      props: [
        { key: 'pol', type: 'select', options: ['npn', 'pnp'], def: 'npn' },
        { key: 'model', type: 'select', options: ['simple', 'em'], def: 'simple' },
        { key: 'beta', unit: '', def: 100, min: 1, max: 1e5 },
        { key: 'Vbe', unit: 'V', def: 0.7, min: 0, max: 5, show: c => c.props.model !== 'em' },
        { key: 'Vcesat', unit: 'V', def: 0.2, min: 0, max: 5, show: c => c.props.model !== 'em' },
        { key: 'Is', unit: 'A', def: 1e-14, min: 1e-20, max: 1e-6, show: c => c.props.model === 'em' },
        { key: 'betaR', unit: '', def: 1, min: 0.01, max: 1e3, show: c => c.props.model === 'em' },
        { key: 'VA', unit: 'V', def: 100, min: 0, max: 1e4, show: c => c.props.model === 'em' }
      ],
      valueText: (c, f, t) => 'β = ' + c.props.beta + (c.props.model === 'em' ? ' · ' + t('model_em_short') : '')
    }
  };

  function defaults(type) {
    const p = {};
    for (const d of TYPES[type].props) p[d.key] = d.def;
    return p;
  }

  /* ---------- reference directions chosen by the user ----------
   * refV: terminal marked + for the voltage (0 = terminal 1, 1 = terminal 2)
   * refI: reference arrow of the current (0 = from terminal 1 to terminal 2 through the element, 1 = reverse)
   * Defaults: passive convention, except the sources (generator convention, positive values when they deliver).
   * Meters keep the reference of their own + terminal. */
  function defRef(type) {
    if (type === 'vsource') return { refV: 0, refI: 1 };
    if (type === 'isource') return { refV: 1, refI: 0 };
    return { refV: 0, refI: 0 };
  }
  const flippable = (c) => TYPES[c.type].terms.length === 2 && c.type !== 'ground' && c.type !== 'ammeter' && c.type !== 'voltmeter';
  function refs(c) {
    const d = defRef(c.type);
    if (!flippable(c)) return d;
    return { refV: c.refV === 1 || c.refV === 0 ? c.refV : d.refV, refI: c.refI === 1 || c.refI === 0 ? c.refI : d.refI };
  }
  // values in the user's reference directions (passive convention values r.v, r.i come from the solver)
  function signed(c, r) {
    const f = refs(c);
    return { v: (f.refV ? -1 : 1) * r.v, i: (f.refI ? -1 : 1) * r.i, passive: f.refV === f.refI };
  }

  /* ---------- frame transform ---------- */
  function toWorld(c, lx, ly) {
    if (c.flip) ly = -ly;
    let x, y;
    switch (((c.rot || 0) % 4 + 4) % 4) {
      case 1: x = -ly; y = lx; break;
      case 2: x = -lx; y = -ly; break;
      case 3: x = ly; y = -lx; break;
      default: x = lx; y = ly;
    }
    return [c.x + x, c.y + y];
  }
  function toLocal(c, wx, wy) {
    let x = wx - c.x, y = wy - c.y, lx, ly;
    switch (((c.rot || 0) % 4 + 4) % 4) {
      case 1: lx = y; ly = -x; break;
      case 2: lx = -x; ly = -y; break;
      case 3: lx = -y; ly = x; break;
      default: lx = x; ly = y;
    }
    if (c.flip) ly = -ly;
    return [lx, ly];
  }
  function terminals(c) { return TYPES[c.type].terms.map(([x, y]) => toWorld(c, x, y)); }
  function hit(c, wx, wy, pad) {
    const [lx, ly] = toLocal(c, wx, wy);
    const b = TYPES[c.type].box;
    pad = pad || 0;
    return lx >= b[0] - pad && lx <= b[2] + pad && ly >= b[1] - pad && ly <= b[3] + pad;
  }
  function bounds(c) {
    const b = TYPES[c.type].box;
    const pts = [toWorld(c, b[0], b[1]), toWorld(c, b[2], b[3])];
    return [Math.min(pts[0][0], pts[1][0]), Math.min(pts[0][1], pts[1][1]), Math.max(pts[0][0], pts[1][0]), Math.max(pts[0][1], pts[1][1])];
  }

  /* ---------- symbols ---------- */
  // P is a pen in the local frame: P.line(pts), P.poly(pts, fill), P.circle(x, y, r, fill), P.plus(x, y, s),
  // P.minus(x, y, s), P.text(x, y, str, size), P.arrow(x1, y1, x2, y2, head). Glyphs stay upright on screen.
  const SYM = {
    resistor(P, c, us) {
      if (us) {
        P.line([[-2, 0], [-1.2, 0], [-1, -0.4], [-0.6, 0.4], [-0.2, -0.4], [0.2, 0.4], [0.6, -0.4], [1, 0.4], [1.2, 0], [2, 0]]);
      } else {
        P.line([[-2, 0], [-1.2, 0]]); P.line([[1.2, 0], [2, 0]]);
        P.poly([[-1.2, -0.4], [1.2, -0.4], [1.2, 0.4], [-1.2, 0.4]], false);
      }
    },
    vsource(P, c, us) {
      P.circle(0, 0, 0.9, false);
      if (us) {
        P.line([[-2, 0], [-0.9, 0]]); P.line([[0.9, 0], [2, 0]]);
        P.plus(-0.42, 0, 0.36); P.minus(0.42, 0, 0.36);
      } else {
        P.line([[-2, 0], [2, 0]]);
        P.plus(-1.45, -0.7, 0.36);
      }
    },
    isource(P, c, us) {
      P.circle(0, 0, 0.9, false);
      P.line([[-2, 0], [-0.9, 0]]); P.line([[0.9, 0], [2, 0]]);
      if (us) P.arrow(-0.55, 0, 0.55, 0, 0.32);
      else { P.line([[0, -0.9], [0, 0.9]]); P.arrow(1.1, 0, 1.75, 0, 0.32); }
    },
    ammeter(P) {
      P.circle(0, 0, 0.9, false);
      P.line([[-2, 0], [-0.9, 0]]); P.line([[0.9, 0], [2, 0]]);
      P.text(0, 0, 'A', 1.05);
      P.plus(-1.45, -0.6, 0.32);
    },
    voltmeter(P) {
      P.circle(0, 0, 0.9, false);
      P.line([[-2, 0], [-0.9, 0]]); P.line([[0.9, 0], [2, 0]]);
      P.text(0, 0, 'V', 1.05);
      P.plus(-1.45, -0.6, 0.32);
    },
    diode(P, c, us) {
      P.line([[-2, 0], [-0.6, 0]]); P.line([[0.6, 0], [2, 0]]);
      P.poly([[-0.6, -0.6], [-0.6, 0.6], [0.6, 0]], us);
      if (!us) P.line([[-0.6, 0], [0.6, 0]]);
      P.line([[0.6, -0.6], [0.6, 0.6]]);
    },
    schottky(P, c, us) {
      P.line([[-2, 0], [-0.6, 0]]); P.line([[0.6, 0], [2, 0]]);
      P.poly([[-0.6, -0.6], [-0.6, 0.6], [0.6, 0]], us);
      if (!us) P.line([[-0.6, 0], [0.6, 0]]);
      P.line([[0.35, -0.42], [0.35, -0.6], [0.6, -0.6], [0.6, 0.6], [0.85, 0.6], [0.85, 0.42]]);
    },
    led(P, c, us) {
      SYM.diode(P, c, us);
      // light arrows in the colour of the LED
      const rgb = (LED_COLORS[c.props.color] || LED_COLORS.red).rgb;
      P.tint(`rgb(${rgb.join(',')})`, true);
      P.arrow(-0.05, -0.75, 0.55, -1.3, 0.28);
      P.arrow(0.45, -0.6, 1.05, -1.15, 0.28);
      P.tint(null);
    },
    rgbled(P, c) {
      const ca = c.props.common === 'ca';
      P.circle(0.2, 0, 1.95, false);
      const cols = [[255, 45, 45], [40, 200, 70], [50, 120, 255]];
      [-1.1, 0, 1.1].forEach((y, k) => {
        const yt = [-2, 0, 2][k];
        P.line([[-3, yt], [-1.6, yt], [-1.25, y], [-0.75, y]]);
        // small diode, anode on the channel side (common cathode) or on the common side (common anode)
        const a = ca ? 0.25 : -0.75, b = ca ? -0.75 : 0.25;
        P.tint(`rgb(${cols[k].join(',')})`, true);
        P.poly([[a, y - 0.32], [a, y + 0.32], [b, y]], true);
        P.tint(null);
        P.line([[b, y - 0.32], [b, y + 0.32]]);
        P.line([[0.25, y], [0.95, y]]);
      });
      P.line([[0.95, -1.1], [0.95, 1.1]]);
      P.line([[0.95, 0], [3, 0]]);
    },
    ground(P) {
      P.line([[0, 0], [0, 0.8]]);
      P.line([[-0.8, 0.8], [0.8, 0.8]]);
      P.line([[-0.5, 1.12], [0.5, 1.12]]);
      P.line([[-0.2, 1.44], [0.2, 1.44]]);
    },
    opamp(P) {
      P.poly([[-2, -2], [-2, 2], [2, 0]], false);
      P.line([[-3, 1], [-2, 1]]); P.line([[-3, -1], [-2, -1]]); P.line([[2, 0], [3, 0]]);
      P.plus(-1.45, 1, 0.42); P.minus(-1.45, -1, 0.42);
    },
    bjt(P, c, us) {
      const pnp = c.props.pol === 'pnp';
      if (us) P.circle(0.3, 0, 1.4, false);
      P.line([[-2, 0], [-0.45, 0]]);
      P.thick([[-0.45, -0.85], [-0.45, 0.85]]);
      P.line([[-0.45, -0.4], [1, -1.15], [1, -2]]);
      P.line([[-0.45, 0.4], [1, 1.15], [1, 2]]);
      if (!pnp) P.head(-0.45, 0.4, 0.85, 1.07, 0.38);
      else P.head(1, 1.15, -0.3, 0.48, 0.38);
    }
  };

  const api = { TYPES, LED_COLORS, isDiode, defaults, defRef, refs, signed, flippable, toWorld, toLocal, terminals, hit, bounds, SYM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.DCS = root.DCS || {}).comp = api;
})(typeof window !== 'undefined' ? window : globalThis);
