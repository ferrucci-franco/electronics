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
  // rotary track: radius and angles (degrees, y downwards) of the ends A (α = 0) and B (α = 1): a half circle
  // below the pivot, so that the leads come in straight and the wiper lead comes from the top
  const ROT = { R: 1.3, a0: 180, a1: 0 };
  const potAngle = (c) => ROT.a0 + (ROT.a1 - ROT.a0) * Math.max(0, Math.min(1, c.props.alpha));
  const potX = (c) => -1.2 + 2.4 * Math.max(0, Math.min(1, c.props.alpha));
  // fraction of the resistance between A and the wiper: linear, or logarithmic (audio) taper
  const potFrac = (c) => { const a = Math.max(0, Math.min(1, c.props.alpha)); return c.props.taper === 'log' ? (Math.pow(10, 2 * a) - 1) / 99 : a; };
  const isDiode = (c) => c.type === 'diode' || c.type === 'schottky' || c.type === 'led' || c.type === 'zener';
  // switches: the toggle switch keeps its position; the push button is closed only while it is held down
  // (normally open) or opened while held (normally closed). Held buttons live here, never in the saved circuit.
  const pressed = new Set();
  const isSwitch = (c) => c.type === 'switch' || c.type === 'button';
  // meters and control sensors: 'A' reads a current (0 Ω), 'V' a voltage (open circuit)
  const meterKind = (c) => (c.type === 'ammeter' || c.type === 'isense' ? 'A' : c.type === 'voltmeter' || c.type === 'vsense' ? 'V' : null);
  const isDep = (c) => c.type === 'depv' || c.type === 'depi';
  // the control of a dependent source: the sensor (or meter) named in props.ctrl
  const ctrlOf = (c, circuit) => (c.props.ctrl ? circuit.comps.find(s => meterKind(s) && s.name === c.props.ctrl) || null : null);
  // gain symbol and unit by the kind of source: VCVS μ, CCVS r_m, VCCS g_m, CCCS β
  function depKind(c, circuit) {
    const s = ctrlOf(c, circuit), cur = s && meterKind(s) === 'A';
    if (c.type === 'depv') return cur ? { sym: 'r<sub>m</sub>', unit: 'Ω', code: 'ccvs', x: 'i' } : { sym: 'μ', unit: 'V/V', code: 'vcvs', x: 'v' };
    return cur ? { sym: 'β', unit: 'A/A', code: 'cccs', x: 'i' } : { sym: 'g<sub>m</sub>', unit: 'S', code: 'vccs', x: 'v' };
  }
  const isClosed = (c) => (c.type === 'switch' ? !!c.props.closed : c.type === 'button' ? (c.props.nc === 'nc') !== pressed.has(c.id) : false);

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
    lamp: {
      prefix: 'LP', terms: [[-2, 0], [2, 0]], box: [-2, -2.1, 2, 1.0],
      props: [
        { key: 'Vn', unit: 'V', def: 12, min: 0.1, max: 1e4 },
        { key: 'Pn', unit: 'W', def: 5, min: 1e-3, max: 1e5 },
        { key: 'look', type: 'select', options: ['lamp_sym', 'lamp_bulb'], def: 'lamp_sym' }
      ],
      valueText: (c, f) => f(c.props.Vn, 'V') + ' · ' + f(c.props.Pn, 'W')
    },
    // dependent sources: value = k · (control variable); the control is a sensor anywhere in the circuit
    depv: {
      prefix: 'E', terms: [[-2, 0], [2, 0]], box: [-2, -1.05, 2, 1.05], defRot: 1,
      props: [{ key: 'ctrl', type: 'select', def: '' }, { key: 'k', unit: (c, ckt) => depKind(c, ckt).unit, def: 2, min: -1e9, max: 1e9 }],
      valueText: (c, f) => depText(c)
    },
    depi: {
      prefix: 'G', terms: [[-2, 0], [2, 0]], box: [-2, -1.05, 2, 1.05], defRot: 3,
      props: [{ key: 'ctrl', type: 'select', def: '' }, { key: 'k', unit: (c, ckt) => depKind(c, ckt).unit, def: 0.01, min: -1e9, max: 1e9 }],
      valueText: (c, f) => depText(c)
    },
    // control sensors: a small ammeter (a wire that measures i_x) and a small voltmeter (open, measures v_x)
    isense: { prefix: 'ix', terms: [[-1, 0], [1, 0]], box: [-1, -0.75, 1, 0.6], props: [] },
    vsense: { prefix: 'vx', terms: [[-1, 0], [1, 0]], box: [-1, -0.6, 1, 0.6], defRot: 1, props: [] },
    ammeter: { prefix: 'AM', terms: [[-2, 0], [2, 0]], box: [-2, -1, 2, 1], props: [] },
    voltmeter: { prefix: 'VM', terms: [[-2, 0], [2, 0]], box: [-2, -1, 2, 1], defRot: 1, props: [] },
    switch: {
      prefix: 'S', terms: [[-2, 0], [2, 0]], box: [-2, -1.15, 2, 0.45],
      props: [{ key: 'closed', type: 'bool', def: false }],
      valueText: (c, f, t) => t(c.props.closed ? 'sw_closed' : 'sw_open')
    },
    button: {
      prefix: 'S', terms: [[-2, 0], [2, 0]], box: [-2, -1.6, 2, 0.75],
      props: [{ key: 'nc', type: 'select', options: ['no', 'nc'], def: 'no' }],
      valueText: (c, f, t) => t('pb_' + c.props.nc)
    },
    diode: {
      prefix: 'D', terms: [[-2, 0], [2, 0]], box: [-2, -0.8, 2, 0.8],
      props: [
        { key: 'model', type: 'select', options: ['ideal', 'cvd', 'exact'], def: 'cvd' },
        { key: 'Vf', unit: 'V', def: 0.7, min: 0, max: 10, show: c => c.props.model === 'cvd' },
        { key: 'rd', unit: 'Ω', def: 0, min: 0, max: 1e6, show: c => c.props.model === 'cvd' },
        { key: 'Is', unit: 'A', def: 1e-14, min: 1e-20, max: 1e-3, show: c => c.props.model === 'exact' },
        { key: 'N', unit: '', def: 1, min: 0.5, max: 5, show: c => c.props.model === 'exact' },
        { key: 'bd', type: 'bool', def: false },
        { key: 'Vbr', unit: 'V', def: 100, min: 0.1, max: 1e5, show: c => c.props.bd }
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
        { key: 'N', unit: '', def: 1.05, min: 0.5, max: 5, show: c => c.props.model === 'exact' },
        { key: 'bd', type: 'bool', def: false },
        { key: 'Vbr', unit: 'V', def: 40, min: 0.1, max: 1e5, show: c => c.props.bd }
      ],
      valueText: (c, f, t) => t('model_' + c.props.model + '_short')
    },
    // Zener diode: conducts forward like a diode and, reverse biased, holds −V_Z (breakdown), with r_z
    zener: {
      prefix: 'DZ', terms: [[-2, 0], [2, 0]], box: [-2, -0.8, 2, 0.8],
      props: [
        { key: 'model', type: 'select', options: ['ideal', 'cvd', 'exact'], def: 'cvd' },
        { key: 'Vz', unit: 'V', def: 5.1, min: 0.1, max: 1e4 },
        { key: 'rz', unit: 'Ω', def: 0, min: 0, max: 1e6, show: c => c.props.model === 'cvd' },
        { key: 'Vf', unit: 'V', def: 0.7, min: 0, max: 10, show: c => c.props.model === 'cvd' },
        { key: 'rd', unit: 'Ω', def: 0, min: 0, max: 1e6, show: c => c.props.model === 'cvd' },
        { key: 'Is', unit: 'A', def: 1e-14, min: 1e-20, max: 1e-3, show: c => c.props.model === 'exact' },
        { key: 'N', unit: '', def: 1, min: 0.5, max: 5, show: c => c.props.model === 'exact' }
      ],
      valueText: (c, f) => 'Vz = ' + f(c.props.Vz, 'V')
    },
    led: {
      prefix: 'LED', terms: [[-2, 0], [2, 0]], box: [-2, -1.25, 2, 0.8],
      props: [
        { key: 'color', type: 'select', options: ['red', 'orange', 'yellow', 'green', 'blue', 'white'], def: 'red', onChange: c => { c.props.Vf = LED_COLORS[c.props.color].vf; } },
        { key: 'model', type: 'select', options: ['cvd', 'exact'], def: 'cvd' },
        { key: 'Vf', unit: 'V', def: 1.8, min: 0.5, max: 6 },
        { key: 'rd', unit: 'Ω', def: 0, min: 0, max: 1e6, show: c => c.props.model === 'cvd' },
        { key: 'Imax', unit: 'A', def: 0.02, min: 1e-4, max: 10 },
        { key: 'bd', type: 'bool', def: false },
        { key: 'Vbr', unit: 'V', def: 5, min: 0.1, max: 1e3, show: c => c.props.bd }
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
    pot: {
      prefix: 'P', terms: [[-2, 0], [2, 0], [0, -2]], termNames: ['A', 'B', 'W'], box: [-2, -2, 2, 1.65],
      props: [
        { key: 'R', unit: 'Ω', def: 10000, min: 1, max: 1e10 },
        { key: 'alpha', type: 'slider', def: 0.5 },
        { key: 'ctl', type: 'select', options: ['slider', 'knob'], def: 'slider' },
        { key: 'taper', type: 'select', options: ['lin', 'log'], def: 'lin' }
      ],
      valueText: (c, f) => f(c.props.R, 'Ω') + ' · ' + Math.round(c.props.alpha * 100) + ' %'
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

  function depText(c) {
    const k = +c.props.k;
    const ks = Math.abs(k) >= 1e4 || (Math.abs(k) < 1e-3 && k !== 0) ? k.toExponential(2).replace(/\.?0+e/, 'e') : String(+k.toPrecision(4));
    return ks + '·' + (c.props.ctrl || '?');
  }

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
    if (type === 'vsource' || type === 'depv') return { refV: 0, refI: 1 };
    if (type === 'isource' || type === 'depi') return { refV: 1, refI: 0 };
    // a Zener works reverse biased: + on the cathode, so that V_Z and the current read positive
    if (type === 'zener') return { refV: 1, refI: 1 };
    return { refV: 0, refI: 0 };
  }
  const flippable = (c) => TYPES[c.type].terms.length === 2 && c.type !== 'ground' && !meterKind(c);
  // passive elements always use the passive convention (the current arrow enters through +): flipping the
  // voltage reference flips the current reference with it. Only the sources can take the generator convention.
  const passiveOnly = (c) => c.type === 'resistor' || c.type === 'lamp' || isDiode(c) || isSwitch(c);
  // incandescent lamp: a resistance V_n²/P_n; brightness ~ P/P_n; above about 1.1 V_n it overheats
  const lampState = (c, r) => {
    if (!r) return null;
    const b = Math.abs(r.p) / Math.max(1e-12, c.props.Pn);
    return { b, state: b > 1.21 ? 'hot' : b > 0.5 ? 'on' : b > 0.02 ? 'dim' : 'off' };
  };
  function refs(c) {
    let d = defRef(c.type);
    if (c.type === 'resistor' || c.type === 'lamp') {
      // a resistor has no polarity: by default + is the upper (or left) terminal, passive convention
      const [t0, t1] = terminals(c);
      const first = t0[1] < t1[1] || (t0[1] === t1[1] && t0[0] <= t1[0]);
      d = { refV: first ? 0 : 1, refI: first ? 0 : 1 };
    }
    if (!flippable(c)) return d;
    const refV = c.refV === 1 || c.refV === 0 ? c.refV : d.refV;
    if (passiveOnly(c)) return { refV, refI: refV };
    return { refV, refI: c.refI === 1 || c.refI === 0 ? c.refI : d.refI };
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
    // lamp: the classic symbol (USA: a filament loop in a circle; IEC: a cross in a circle) or a drawing of a
    // bulb in its socket; the glass takes the colour of the light (P.lit = [brightness, overheated])
    lamp(P, c, us) {
      const b = P.lit ? P.lit[0] : 0, hot = P.lit && P.lit[1];
      const glow = hot ? '255,90,40' : '255,205,40';
      if (c.props.look === 'lamp_bulb') {
        // a bulb standing on its socket: both leads come in straight, in line with the pins, to the two sides
        // of the base; the glass rises to one side of the line
        const cy = -1.25, R = 0.8;
        const pts = [];
        for (let k = 0; k <= 28; k++) { const a = Math.PI * (0.75 + 1.5 * k / 28); pts.push([Math.cos(a) * R, cy + Math.sin(a) * R]); }
        pts.push([0.32, -0.3], [-0.32, -0.3]);
        P.poly(pts, b > 0.01 ? `rgb(${glow})` : false, b > 0.01 ? 0.15 + 0.75 * Math.sqrt(Math.min(1, b)) : 1);
        // the base with its threads
        P.poly([[-0.42, -0.3], [0.42, -0.3], [0.42, 0.3], [-0.42, 0.3]], false);
        P.line([[-0.42, -0.1], [0.42, -0.1]]); P.line([[-0.42, 0.1], [0.42, 0.1]]);
        // filament: two supports and a coil
        P.line([[-0.16, -0.3], [-0.3, -1.3]]); P.line([[0.16, -0.3], [0.3, -1.3]]);
        const coil = [[-0.3, -1.3]];
        for (let k = 1; k < 8; k++) coil.push([-0.3 + 0.6 * k / 8, -1.3 + (k % 2 ? -0.15 : 0)]);
        coil.push([0.3, -1.3]);
        P.line(coil);
        P.line([[-2, 0], [-0.42, 0]]); P.line([[0.42, 0], [2, 0]]);
        return;
      }
      P.circle(0, 0, 0.9, b > 0.01 ? `rgb(${glow})` : false, b > 0.01 ? 0.15 + 0.75 * Math.sqrt(Math.min(1, b)) : 1);
      P.line([[-2, 0], [-0.9, 0]]); P.line([[0.9, 0], [2, 0]]);
      if (us) {
        // the filament: a loop between the two leads
        const f = [[-0.9, 0], [-0.45, 0]];
        for (let k = 0; k <= 16; k++) { const a = Math.PI * k / 16; f.push([-0.45 * Math.cos(a), -0.5 * Math.sin(a)]); }
        f.push([0.9, 0]);
        P.line(f);
      } else {
        const d = 0.9 / Math.SQRT2;
        P.line([[-d, -d], [d, d]]); P.line([[-d, d], [d, -d]]);
      }
    },
    // dependent sources: a diamond (USA); IEC: the same diamond with the conventions of the independent sources
    depv(P, c, us) {
      const d = [[-0.95, 0], [0, -0.95], [0.95, 0], [0, 0.95]];
      P.poly(d, false);
      if (us) {
        P.line([[-2, 0], [-0.95, 0]]); P.line([[0.95, 0], [2, 0]]);
        P.plus(-0.45, 0, 0.32); P.minus(0.45, 0, 0.32);
      } else {
        P.line([[-2, 0], [2, 0]]);
        P.plus(-1.45, -0.7, 0.36);
      }
    },
    depi(P, c, us) {
      P.poly([[-0.95, 0], [0, -0.95], [0.95, 0], [0, 0.95]], false);
      P.line([[-2, 0], [-0.95, 0]]); P.line([[0.95, 0], [2, 0]]);
      if (us) P.arrow(-0.55, 0, 0.55, 0, 0.3);
      else { P.line([[0, -0.95], [0, 0.95]]); P.arrow(1.1, 0, 1.75, 0, 0.32); }
    },
    isense(P) {
      P.circle(0, 0, 0.5, false);
      P.line([[-1, 0], [-0.5, 0]]); P.line([[0.5, 0], [1, 0]]);
      P.text(0, 0, 'A', 0.62);
      P.arrow(-0.5, -0.72, 0.5, -0.72, 0.22);
    },
    vsense(P) {
      P.circle(0, 0, 0.5, false);
      P.line([[-1, 0], [-0.5, 0]]); P.line([[0.5, 0], [1, 0]]);
      P.text(0, 0, 'V', 0.62);
      P.plus(-0.8, -0.42, 0.2); P.minus(0.8, -0.42, 0.2);
    },
    diode(P, c, us) {
      P.line([[-2, 0], [-0.6, 0]]); P.line([[0.6, 0], [2, 0]]);
      P.poly([[-0.6, -0.6], [-0.6, 0.6], [0.6, 0]], us);
      if (!us) P.line([[-0.6, 0], [0.6, 0]]);
      P.line([[0.6, -0.6], [0.6, 0.6]]);
    },
    zener(P, c, us) {
      P.line([[-2, 0], [-0.6, 0]]); P.line([[0.6, 0], [2, 0]]);
      P.poly([[-0.6, -0.6], [-0.6, 0.6], [0.6, 0]], us);
      if (!us) P.line([[-0.6, 0], [0.6, 0]]);
      // cathode bar with bent ends (a Z); IEC: a single bent end
      if (us) P.line([[0.32, -0.78], [0.6, -0.6], [0.6, 0.6], [0.88, 0.78]]);
      else P.line([[0.6, 0.6], [0.6, -0.6], [0.88, -0.78]]);
    },
    schottky(P, c, us) {
      P.line([[-2, 0], [-0.6, 0]]); P.line([[0.6, 0], [2, 0]]);
      P.poly([[-0.6, -0.6], [-0.6, 0.6], [0.6, 0]], us);
      if (!us) P.line([[-0.6, 0], [0.6, 0]]);
      P.line([[0.35, -0.42], [0.35, -0.6], [0.6, -0.6], [0.6, 0.6], [0.85, 0.6], [0.85, 0.42]]);
    },
    led(P, c, us) {
      // the body has the colour of the LED: dull when it is off, brighter with the current (P.lit = I/I_max);
      // without a solution (palette, placing) a middle brightness
      const rgb = (LED_COLORS[c.props.color] || LED_COLORS.red).rgb;
      const b = P.lit ? P.lit[0] : 0.5;
      const k = 0.3 + 0.7 * Math.sqrt(b);
      const body = `rgb(${rgb.map(v => Math.round(v * k)).join(',')})`;
      P.line([[-2, 0], [-0.6, 0]]); P.line([[0.6, 0], [2, 0]]);
      P.poly([[-0.6, -0.6], [-0.6, 0.6], [0.6, 0]], body, 1);
      if (!us) P.line([[-0.6, 0], [0.6, 0]]);
      P.line([[0.6, -0.6], [0.6, 0.6]]);
      // light arrows in the colour of the LED
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
        // outlined like the rest of the symbol, filled with the channel colour as it lights up
        // (a faint tint when off, or when there is no solution yet, e.g. in the palette)
        const lit = P.lit ? P.lit[k] : 0.35;
        P.poly([[a, y - 0.32], [a, y + 0.32], [b, y]], `rgb(${cols[k].join(',')})`, 0.15 + 0.85 * Math.sqrt(lit));
        P.line([[b, y - 0.32], [b, y + 0.32]]);
        P.line([[0.25, y], [0.95, y]]);
      });
      P.line([[0.95, -1.1], [0.95, 1.1]]);
      P.line([[0.95, 0], [3, 0]]);
    },
    pot(P, c, us) {
      if (c.props.ctl === 'knob') { SYM.potRotary(P, c, us); return; }
      SYM.resistor(P, c, us);
      // the wiper arrow sits at the position α along the resistor (A at α = 0, B at α = 1)
      const x = potX(c);
      P.line([[0, -2], [0, -1.3], [x, -1.3], [x, -0.85]]);
      P.head(x, -1.3, x, -0.45, 0.4);
    },
    // rotary potentiometer: the resistance is a circular track (zigzag in USA style, a band in IEC style)
    // and the wiper turns around the centre; same terminals as the straight one (A left, B right, W top)
    potRotary(P, c, us) {
      const R = ROT.R, a0 = ROT.a0, a1 = ROT.a1, rad = Math.PI / 180;
      const pt = (deg, r) => [Math.cos(deg * rad) * r, Math.sin(deg * rad) * r];
      if (us) {
        // zigzag along the arc (like the straight resistor), straight bits at both ends
        const n = 20, pts = [pt(a0, R), pt(a0 + (a1 - a0) * 0.05, R)];
        for (let k = 1; k < n; k++) pts.push(pt(a0 + (a1 - a0) * (0.05 + 0.9 * k / n), R + (k % 2 ? 0.2 : -0.2)));
        pts.push(pt(a0 + (a1 - a0) * 0.95, R), pt(a1, R));
        P.line(pts);
      } else {
        const inner = [], outer = [];
        for (let k = 0; k <= 24; k++) { const d = a0 + (a1 - a0) * k / 24; inner.push(pt(d, R - 0.2)); outer.push(pt(d, R + 0.2)); }
        P.poly(inner.concat(outer.reverse()), false);
      }
      // leads from the terminals to the ends of the track
      P.line([[-2, 0], pt(a0, R)]);
      P.line([[2, 0], pt(a1, R)]);
      // wiper: from the W terminal down to the pivot, then the arrow towards the track
      P.line([[0, -2], [0, 0]]);
      P.circle(0, 0, 0.13, true);
      const d = potAngle(c), tip = pt(d, R - 0.3), base = pt(d, 0.15);
      P.line([base, pt(d, R - 0.62)]);
      P.head(base[0], base[1], tip[0], tip[1], 0.38);
    },
    // toggle switch: the blade pivots on the left contact
    // USA: contacts drawn as small circles; IEC 60617: the blade leaves the lead itself, no circles
    switch(P, c, us) {
      if (!us) {
        P.line([[-2, 0], [-0.9, 0]]); P.line([[0.9, 0], [2, 0]]);
        P.line(c.props.closed ? [[-0.9, 0], [1.15, -0.2]] : [[-0.9, 0], [1, -0.95]]);
        return;
      }
      P.line([[-2, 0], [-1, 0]]); P.line([[1, 0], [2, 0]]);
      P.circle(-1, 0, 0.14, true); P.circle(1, 0, 0.14, true);
      P.line(c.props.closed ? [[-1, 0], [1.05, -0.2]] : [[-1, 0], [0.75, -0.95]]);
    },
    // push button with its return spring. USA: a bar on a plunger; normally open = bar above the contacts,
    // normally closed = bar under them; pressing pushes the bar down. IEC 60617: a make (NO) or break (NC,
    // with its stop on the fixed contact) contact worked through a dashed link by the push operator ⊓.
    button(P, c, us) {
      const nc = c.props.nc === 'nc', down = pressed.has(c.id);
      if (!us) {
        P.line([[-2, 0], [-0.9, 0]]); P.line([[0.9, 0], [2, 0]]);
        if (nc) P.line([[0.9, 0], [0.9, -0.75]]);     // the stop of the break contact
        // blade end: NO open up / closed down on the contact; NC resting on the stop / lifted away from it
        const tip = nc ? (down ? [0.6, -1.15] : [1.15, -0.78]) : (down ? [1.15, -0.2] : [1, -0.95]);
        P.line([[-0.9, 0], tip]);
        const mx = (tip[0] - 0.9) / 2, my = tip[1] / 2, top = my - 0.95;
        for (let y = my - 0.08; y > top + 0.12; y -= 0.3) P.line([[mx, y], [mx, Math.max(top + 0.08, y - 0.16)]]);
        P.line([[mx - 0.42, top + 0.26], [mx - 0.42, top], [mx + 0.42, top], [mx + 0.42, top + 0.26]]);
        return;
      }
      P.line([[-2, 0], [-1, 0]]); P.line([[1, 0], [2, 0]]);
      P.circle(-1, 0, 0.14, true); P.circle(1, 0, 0.14, true);
      const y = nc ? (down ? 0.6 : 0.2) : (down ? -0.2 : -0.6);
      P.line([[-1.2, y], [1.2, y]]);
      const top = y - (nc ? 1.55 : 0.75);
      P.line([[0, y], [0, top]]);
      P.line([[-0.45, top], [0.45, top]]);
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

  const api = { TYPES, LED_COLORS, lampState, meterKind, isDep, ctrlOf, depKind, depText, isDiode, pressed, isSwitch, isClosed, passiveOnly, potX, potFrac, ROT, defaults, defRef, refs, signed, flippable, toWorld, toLocal, terminals, hit, bounds, SYM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.DCS = root.DCS || {}).comp = api;
})(typeof window !== 'undefined' ? window : globalThis);
