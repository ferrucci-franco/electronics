/* Canvas drawing of the schematic, the results and the editor overlays. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, U = DCS.units;

  let col = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue(n).trim();
    col = {
      bg: g('--canvas'), grid: g('--grid-dot'), fg: g('--sym'), wire: g('--wire'), muted: g('--muted'),
      accent: g('--accent'), sel: g('--sel'), volt: g('--c-volt'), cur: g('--c-cur'), pabs: g('--c-pabs'),
      pgen: g('--c-pgen'), tagBg: g('--tag-bg'), port: g('--c-port'), dot: g('--c-dot'), vpos: g('--c-vpos'),
      vneg: g('--c-vneg'), meterBg: g('--meter-bg'), meterFg: g('--meter-fg'), err: g('--c-err'), hover: g('--hover')
    };
  }

  // local -> world affine matrix [a, b, c, d, e, f] (x' = a x + c y + e, y' = b x + d y + f)
  function localMatrix(c) {
    let a, b, cc, d;
    switch (((c.rot || 0) % 4 + 4) % 4) {
      case 1: a = 0; b = 1; cc = -1; d = 0; break;
      case 2: a = -1; b = 0; cc = 0; d = -1; break;
      case 3: a = 0; b = -1; cc = 1; d = 0; break;
      default: a = 1; b = 0; cc = 0; d = 1;
    }
    if (c.flip) { cc = -cc; d = -d; }
    return [a, b, cc, d, c.x, c.y];
  }

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.w = 0; this.h = 0;
  }

  Renderer.prototype.resize = function () {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
  };

  /* A pen drawing a symbol in the component's local frame */
  function makePen(R, comp, view, color0, lwPx) {
    let color = color0;
    const ctx = R.ctx, dpr = R.dpr, s = view.scale;
    const m = localMatrix(comp);
    const setLocal = () => ctx.setTransform(dpr * s * m[0], dpr * s * m[1], dpr * s * m[2], dpr * s * m[3], dpr * (s * m[4] + view.ox), dpr * (s * m[5] + view.oy));
    const screen = (lx, ly) => {
      const wx = m[0] * lx + m[2] * ly + m[4], wy = m[1] * lx + m[3] * ly + m[5];
      return [wx * s + view.ox, wy * s + view.oy];
    };
    const lw = lwPx / s;
    const P = {
      // temporary colour (LED light, RGB channels); `force` keeps it also on a selected or ghost symbol
      tint(c, force) { color = c && (force || color0 === col.fg) ? c : color0; },
      line(pts) {
        setLocal(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      },
      thick(pts) {
        setLocal(); ctx.strokeStyle = color; ctx.lineWidth = lw * 2.2; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
      },
      // fill: true (pen colour) or a CSS colour; fillAlpha: opacity of the fill only
      poly(pts, fill, fillAlpha) {
        setLocal(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round';
        ctx.fillStyle = typeof fill === 'string' ? fill : color;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        if (fill) { ctx.globalAlpha = fillAlpha == null ? 1 : fillAlpha; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.stroke();
      },
      circle(x, y, r, fill) {
        setLocal(); ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
        if (fill) { ctx.fillStyle = color; ctx.fill(); }
        ctx.stroke();
      },
      head(x1, y1, x2, y2, size) { // filled arrow head at (x2, y2) pointing from (x1, y1)
        setLocal(); ctx.fillStyle = color;
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        ctx.beginPath(); ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux * size - uy * size * 0.5, y2 - uy * size + ux * size * 0.5);
        ctx.lineTo(x2 - ux * size + uy * size * 0.5, y2 - uy * size - ux * size * 0.5);
        ctx.closePath(); ctx.fill();
      },
      arrow(x1, y1, x2, y2, size) {
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
        P.line([[x1, y1], [x2 - dx / L * size * 0.8, y2 - dy / L * size * 0.8]]);
        P.head(x1, y1, x2, y2, size);
      },
      plus(x, y, size) {
        const [sx, sy] = screen(x, y), h = size * s / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2, lwPx * 0.9); ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(sx - h, sy); ctx.lineTo(sx + h, sy); ctx.moveTo(sx, sy - h); ctx.lineTo(sx, sy + h); ctx.stroke();
      },
      minus(x, y, size) {
        const [sx, sy] = screen(x, y), h = size * s / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2, lwPx * 0.9); ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(sx - h, sy); ctx.lineTo(sx + h, sy); ctx.stroke();
      },
      text(x, y, str, size) {
        const [sx, sy] = screen(x, y);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = color;
        ctx.font = `600 ${Math.max(7, size * s)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(str, sx, sy + 0.5);
      }
    };
    return P;
  }

  function drawSymbol(R, comp, view, color, style, lwPx, lit) {
    const P = makePen(R, comp, view, color, lwPx);
    P.lit = lit;   // brightness of the RGB LED channels (0..1), when solved
    C.SYM[comp.type](P, comp, style !== 'iec');
  }

  /* ---------- label layout ---------- */
  const HALF = { resistor: 0.4, vsource: 0.9, isource: 0.9, ammeter: 0.9, voltmeter: 0.9, diode: 0.6, schottky: 0.6, led: 0.6 };

  function worldDir(comp, dx, dy) {
    const m = localMatrix(comp);
    return [m[0] * dx + m[2] * dy, m[1] * dx + m[3] * dy];
  }

  // lines: [{text, color, bold, mono, box}]
  function drawBlock(R, view, wx, wy, dir, lines, fontPx) {
    if (!lines.length) return;
    const ctx = R.ctx, dpr = R.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = wx * view.scale + view.ox, sy = wy * view.scale + view.oy;
    const lh = fontPx * 1.22;
    const H = lh * lines.length;
    let align, top;
    if (!dir[0] && !dir[1]) { align = 'center'; top = sy - H / 2; }
    else if (Math.abs(dir[0]) > Math.abs(dir[1])) { align = dir[0] > 0 ? 'left' : 'right'; top = sy - H / 2; }
    else { align = 'center'; top = dir[1] < 0 ? sy - H : sy; }
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    lines.forEach((ln, i) => {
      const y = top + lh * (i + 0.5);
      ctx.font = `${ln.bold ? 700 : 500} ${fontPx}px ${ln.mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'ui-sans-serif, system-ui, sans-serif'}`;
      if (ln.box) {
        const w = ctx.measureText(ln.text).width + 8;
        let x0 = align === 'left' ? sx - 2 : align === 'right' ? sx - w + 2 : sx - w / 2;
        ctx.fillStyle = col.meterBg; ctx.strokeStyle = ln.color || col.fg; ctx.lineWidth = 1;
        roundRect(ctx, x0, y - lh / 2 + 1, w, lh - 2, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col.meterFg;
        ctx.fillText(ln.text, align === 'left' ? sx + 2 : align === 'right' ? sx - 2 : sx, y + 0.5);
        return;
      }
      // halo for legibility over wires
      ctx.lineWidth = 3; ctx.strokeStyle = col.bg; ctx.lineJoin = 'round';
      ctx.strokeText(ln.text, sx, y + 0.5);
      ctx.fillStyle = ln.color || col.fg;
      ctx.fillText(ln.text, sx, y + 0.5);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function arrowScreen(R, view, x1, y1, x2, y2, color, px) {
    const ctx = R.ctx, dpr = R.dpr, s = view.scale;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const a = [x1 * s + view.ox, y1 * s + view.oy], b = [x2 * s + view.ox, y2 * s + view.oy];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const hs = Math.max(6, Math.min(10, s * 0.38));
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = px; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] - ux * hs * 0.7, b[1] - uy * hs * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] - ux * hs - uy * hs * 0.45, b[1] - uy * hs + ux * hs * 0.45);
    ctx.lineTo(b[0] - ux * hs + uy * hs * 0.45, b[1] - uy * hs - ux * hs * 0.45);
    ctx.closePath(); ctx.fill();
  }

  function signGlyph(R, view, wx, wy, plus, color, px) {
    const ctx = R.ctx, dpr = R.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = wx * view.scale + view.ox, sy = wy * view.scale + view.oy, h = px / 2;
    ctx.lineWidth = 3.2; ctx.strokeStyle = col.bg; ctx.lineCap = 'butt';
    const path = () => { ctx.beginPath(); ctx.moveTo(sx - h, sy); ctx.lineTo(sx + h, sy); if (plus) { ctx.moveTo(sx, sy - h); ctx.lineTo(sx, sy + h); } };
    path(); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = color; path(); ctx.stroke();
  }

  /* ---------- main draw ---------- */
  Renderer.prototype.draw = function (S) {
    const ctx = this.ctx, dpr = this.dpr, view = S.view, s = view.scale;
    const st = S.settings, res = S.result && S.result.ok ? S.result : null;
    const fmt = (v, u) => U.format(v, u, { digits: st.digits });
    this.hits = [];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // grid
    if (st.grid && s >= 7) {
      const x0 = Math.floor(-view.ox / s), x1 = Math.ceil((this.w - view.ox) / s);
      const y0 = Math.floor(-view.oy / s), y1 = Math.ceil((this.h - view.oy) / s);
      const step = s < 12 ? 2 : 1;
      ctx.fillStyle = col.grid;
      const r = Math.max(0.8, Math.min(1.6, s / 18));
      for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
        for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) {
          const big = (x % 5 === 0 && y % 5 === 0);
          const rr = big ? r * 1.5 : r;
          ctx.fillRect(x * s + view.ox - rr / 2, y * s + view.oy - rr / 2, rr, rr);
        }
      }
    }

    const lw = Math.max(1.4, Math.min(3, s * 0.1));
    const net = S.net;
    // voltage colouring of the wires
    let vmax = 0;
    if (res) for (const v of res.v) vmax = Math.max(vmax, Math.abs(v));
    const voltColor = (node) => {
      if (!res || !st.colorV || vmax < 1e-9) return col.wire;
      const v = res.v[node] / vmax;
      return mix(col.wire, v >= 0 ? col.vpos : col.vneg, Math.min(1, Math.abs(v)));
    };

    // wires
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * view.ox, dpr * view.oy);
    ctx.lineCap = 'round';
    for (const w of S.circuit.wires) {
      const selected = S.sel.has(w.id);
      const hov = S.hover && S.hover.id === w.id;
      const node = net && net.wireNode.get(w.id);
      const hiNode = S.hiNode != null && node === S.hiNode;
      if (selected || hov || hiNode) {
        ctx.strokeStyle = selected ? col.sel : hiNode ? col.port : col.hover; ctx.globalAlpha = selected ? 0.35 : 0.3; ctx.lineWidth = (lw + 7) / s;
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = selected ? col.sel : voltColor(node);
      ctx.lineWidth = lw / s;
      ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
    }

    // light of the LEDs, under the symbols
    if (res) this.drawGlow(S, res);
    // components
    for (const c of S.circuit.comps) {
      const selected = S.sel.has(c.id);
      const hov = S.hover && S.hover.id === c.id;
      const bad = S.badIds && S.badIds.has(c.id);
      if (selected || hov || bad) {
        const b = C.TYPES[c.type].box;
        const m = localMatrix(c);
        ctx.setTransform(dpr * s * m[0], dpr * s * m[1], dpr * s * m[2], dpr * s * m[3], dpr * (s * m[4] + view.ox), dpr * (s * m[5] + view.oy));
        ctx.fillStyle = bad ? col.err : selected ? col.sel : col.hover;
        ctx.globalAlpha = bad ? 0.16 : selected ? 0.14 : 0.1;
        roundRect(ctx, b[0] - 0.15, b[1] - 0.15, b[2] - b[0] + 0.3, b[3] - b[1] + 0.3, 0.35); ctx.fill();
        ctx.globalAlpha = 1;
      }
      let lit;
      if (c.type === 'rgbled' && res && res.el[c.id] && res.el[c.id].ch) lit = res.el[c.id].ch.map(q => Math.max(0, Math.min(1, q.i / c.props.Imax)));
      drawSymbol(this, c, view, selected ? col.sel : bad ? col.err : col.fg, st.style, lw, lit);
    }

    // junction dots and open terminals
    if (net) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const jr = Math.max(2.6, s * 0.17);
      for (const [x, y] of net.junctions) {
        ctx.fillStyle = col.wire;
        ctx.beginPath(); ctx.arc(x * s + view.ox, y * s + view.oy, jr, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.strokeStyle = col.muted; ctx.lineWidth = 1.3;
      for (const [x, y] of net.openTerms) {
        ctx.beginPath(); ctx.arc(x * s + view.ox, y * s + view.oy, Math.max(2.5, s * 0.16), 0, 2 * Math.PI); ctx.stroke();
      }
    }

    // current flow dots
    if (st.animate && res && S.flow) this.drawFlow(S);


    // labels and results
    const fontPx = S.fontPx || Math.max(10, Math.min(15, s * 0.6));
    this.drawAllLabels(S, res, fmt, fontPx);
    // current in the wires: the selected / hovered wire, or every wire when asked
    if (res && S.wireCur && (st.showI || st.showWireI)) this.drawWireCurrents(S, fmt);

    // node voltage tags
    if (res && st.showNodes && net) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `600 ${fontPx - 1}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (const nd of net.nodes) {
        if (!nd.best || nd.id === 0) continue;
        const txt = nd.name + ' = ' + fmt(res.v[nd.id], 'V');
        const sx = nd.best.x * s + view.ox + 5, sy = nd.best.y * s + view.oy - 5 - fontPx * 0.6;
        const w = ctx.measureText(txt).width + 8, h = fontPx + 4;
        ctx.fillStyle = col.tagBg; ctx.strokeStyle = voltColorTag(res.v[nd.id], vmax); ctx.lineWidth = 1.2;
        roundRect(ctx, sx, sy - h / 2, w, h, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col.fg; ctx.fillText(txt, sx + 4, sy + 0.5);
      }
    }

    // Thevenin port
    if (S.port) {
      for (const [p, lab] of [[S.port.a, 'A'], [S.port.b, 'B']]) {
        if (!p) continue;
        const sx = p[0] * s + view.ox, sy = p[1] * s + view.oy;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const r = Math.max(9, s * 0.45);
        ctx.fillStyle = col.port; ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(sx, sy, r * 1.6, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = col.port; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `700 ${r * 1.1}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, sx, sy + 1);
      }
    }

    // overlays: wire preview, ghost, rubber band, snap marker
    const O = S.overlay || {};
    if (O.snap) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sx = O.snap[0] * s + view.ox, sy = O.snap[1] * s + view.oy;
      ctx.strokeStyle = O.snapHot ? col.port : col.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(5, s * 0.3), 0, 2 * Math.PI); ctx.stroke();
    }
    if (O.wirePath && O.wirePath.length > 1) {
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * view.ox, dpr * view.oy);
      ctx.strokeStyle = col.accent; ctx.lineWidth = lw / s; ctx.setLineDash([0.35, 0.25]);
      ctx.beginPath(); ctx.moveTo(O.wirePath[0][0], O.wirePath[0][1]);
      for (let i = 1; i < O.wirePath.length; i++) ctx.lineTo(O.wirePath[i][0], O.wirePath[i][1]);
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (O.ghost) {
      ctx.globalAlpha = 0.55;
      drawSymbol(this, O.ghost, view, col.accent, st.style, lw);
      ctx.globalAlpha = 1;
    }
    if (O.band) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [x0, y0, x1, y1] = O.band;
      ctx.fillStyle = col.accent; ctx.globalAlpha = 0.1;
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.globalAlpha = 1; ctx.strokeStyle = col.accent; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
      ctx.strokeRect(Math.min(x0, x1) + 0.5, Math.min(y0, y1) + 0.5, Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.setLineDash([]);
    }
  };

  function voltColorTag(v, vmax) {
    if (vmax < 1e-9) return col.muted;
    return mix(col.muted, v >= 0 ? col.vpos : col.vneg, Math.min(1, Math.abs(v) / vmax));
  }

  function parseColor(c) {
    c = c.trim();
    if (c[0] === '#') {
      if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    }
    const m = c.match(/\d+(\.\d+)?/g);
    return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  }
  function mix(a, b, t) {
    const A = parseColor(a), B = parseColor(b);
    return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
  }

  /* Label options of a component: each option is a list of text blocks plus extra marks (arrows, signs).
   * The layout keeps, for every component, the option that overlaps the least with what is already drawn. */
  Renderer.prototype.labelOptions = function (S, c, res, fmt) {
    const st = S.settings;
    const T = C.TYPES[c.type];
    const tr = S.tr;
    const r = res ? res.el[c.id] : null;
    const nameLines = [];
    if (st.showNames && c.name) nameLines.push({ text: c.name, bold: true });
    if (st.showValues && T.valueText) nameLines.push({ text: T.valueText(c, (v, u) => U.format(v, u, { digits: 4, trim: true }), tr), color: col.muted });
    const opts = [];

    if (T.terms.length === 2) {
      const hw = HALF[c.type] || 0.6;
      const [t0, t1] = C.terminals(c);
      const cx = (t0[0] + t1[0]) / 2, cy = (t0[1] + t1[1]) / 2;
      const horiz = t0[1] === t1[1];
      const ax = (t1[0] - t0[0]) / 4, ay = (t1[1] - t0[1]) / 4;
      const sides = horiz ? [[0, -1], [0, 1]] : [[1, 0], [-1, 0]];
      for (const [nd, gap] of [[sides[0], 0], [sides[1], 0], [sides[0], 0.9], [sides[1], 0.9]]) {
        const rd = [-nd[0], -nd[1]];
        const blocks = [{ wx: cx + nd[0] * (hw + 0.35 + gap), wy: cy + nd[1] * (hw + 0.35 + gap), dir: nd, lines: nameLines }];
        // the strip next to the body where the reference marks and arrows go
        const ex = Math.abs(ax) * 1.9 + Math.abs(rd[0]) * (hw + 0.95), ey = Math.abs(ay) * 1.9 + Math.abs(rd[1]) * (hw + 0.95);
        const mx = cx + rd[0] * (hw + 0.95) / 2, my = cy + rd[1] * (hw + 0.95) / 2;
        const extra = [[mx - ex / 2 - (rd[0] ? 0 : 0), my - ey / 2, mx + ex / 2, my + ey / 2]];
        const marks = [];
        if (r) {
          const lines = [];
          let off = hw + 0.35;
          const meter = c.type === 'ammeter' || c.type === 'voltmeter';
          if (meter) {
            // a meter with a loose terminal has nothing to measure
            const open = S.net && S.net.openTerms.some(t => t[2] === c.id);
            const txt = open ? '—' : c.type === 'ammeter' ? fmt(r.i, 'A') : fmt(r.v, 'V');
            lines.push({ text: txt, mono: true, box: true, color: c.type === 'ammeter' ? col.cur : col.volt });
          } else if (!st.realDir) {
            this.refMarks(S, c, r, rd, hw, cx, cy, ax, ay, marks, lines, fmt);
          } else {
            const showI = st.showI && c.type !== 'isource', showV = st.showV && c.type !== 'vsource';
            if (showI) {
              const i = r.i, dirS = i >= 0 ? 1 : -1, o = off;
              if (Math.abs(i) > 1e-12) marks.push(() => arrowScreen(this, S.view, cx + rd[0] * o - ax * 0.65 * dirS, cy + rd[1] * o - ay * 0.65 * dirS, cx + rd[0] * o + ax * 0.65 * dirS, cy + rd[1] * o + ay * 0.65 * dirS, col.cur, 1.8));
              off += 0.5;
            }
            if (showV) {
              const v = r.v, o2 = hw + 0.35;
              if (Math.abs(v) > 1e-9) marks.push(() => {
                const px = Math.max(7, Math.min(11, S.view.scale * 0.42));
                signGlyph(this, S.view, cx - ax * 1.55 + rd[0] * o2, cy - ay * 1.55 + rd[1] * o2, v > 0, col.volt, px);
                signGlyph(this, S.view, cx + ax * 1.55 + rd[0] * o2, cy + ay * 1.55 + rd[1] * o2, v < 0, col.volt, px);
              });
              lines.push({ text: fmt(Math.abs(v), 'V'), color: col.volt, mono: true });
            }
            if (showI) lines.push({ text: fmt(Math.abs(r.i), 'A'), color: col.cur, mono: true });
            if (st.showP) lines.push({ text: fmt(r.p, 'W'), color: r.p < -1e-15 ? col.pgen : col.pabs, mono: true });
            if (C.isDiode(c) && c.props.model !== 'exact' && st.showState) lines.push({ text: tr('state_' + r.state), color: col.muted });
          }
          blocks.push({ wx: cx + rd[0] * ((lines.refOff || off) + gap), wy: cy + rd[1] * ((lines.refOff || off) + gap), dir: rd, lines });
        } else if (!st.realDir && C.flippable(c)) {
          const lines = [];
          this.refMarks(S, c, null, rd, hw, cx, cy, ax, ay, marks, lines, fmt);
          blocks.push({ wx: cx + rd[0] * (lines.refOff + gap), wy: cy + rd[1] * (lines.refOff + gap), dir: rd, lines });
        }
        opts.push({ blocks, marks, extra: marks.length ? extra : [], penalty: gap ? 3 : 0 });
      }
      return opts;
    }

    if (c.type === 'opamp') {
      const lines = [];
      if (r) {
        if (st.showV) lines.push({ text: 'Vo ' + fmt(r.vout, 'V'), color: col.volt, mono: true });
        if (st.showI) lines.push({ text: 'Io ' + fmt(r.iout, 'A'), color: col.cur, mono: true });
        if (st.showP) lines.push({ text: 'P ' + fmt(-r.p, 'W'), color: col.pgen, mono: true });
        if (r.state && r.state !== 'lin') lines.push({ text: r.state === 'sp' ? 'SAT +' : 'SAT −', color: col.err, bold: true });
      }
      const marks = [];
      if (r && st.showI && (!st.realDir || Math.abs(r.iout) > 1e-12)) marks.push(() => {
        const a = C.toWorld(c, 2.05, 0.45), b = C.toWorld(c, 2.95, 0.45);
        if (!st.realDir || r.iout > 0) arrowScreen(this, S.view, a[0], a[1], b[0], b[1], col.cur, 1.8);
        else arrowScreen(this, S.view, b[0], b[1], a[0], a[1], col.cur, 1.8);
      });
      const blk = (lx, ly, dx, dy, lines) => { const p = C.toWorld(c, lx, ly); return { wx: p[0], wy: p[1], dir: worldDir(c, dx, dy), lines }; };
      const names = [blk(-1.2, -2.25, 0, -1, nameLines), blk(-1.2, 2.25, 0, 1, nameLines), blk(1.2, -1.35, 0, -1, nameLines)];
      const results = [blk(1.6, 1.1, 0, 1, lines), blk(1.6, -1.1, 0, -1, lines), blk(3.3, 0.4, 1, 0, lines), blk(-0.6, 2.3, 0, 1, lines), blk(-0.6, -2.3, 0, -1, lines)];
      names.forEach((nb, i) => results.forEach((rb, j) => {
        if ((i === 0 && j === 4) || (i === 1 && j === 3) || (i === 2 && j === 1)) return;
        opts.push({ blocks: [nb, rb], marks, penalty: (i + j) * 0.3 });
      }));
      return opts;
    }

    if (c.type === 'rgbled') {
      const lines = nameLines.slice();
      if (r) {
        ['R', 'G', 'B'].forEach((n, k) => {
          const q = r.ch[k];
          const parts = [];
          if (st.showI) parts.push(fmt(q.i, 'A'));
          if (st.showV) parts.push(fmt(q.v, 'V'));
          if (parts.length) lines.push({ text: n + ' ' + parts.join(' '), color: st.showI ? col.cur : col.volt, mono: true });
        });
        if (st.showP) lines.push({ text: 'P ' + fmt(r.p, 'W'), color: col.pabs, mono: true });
      }
      for (const [lx, ly, dx, dy] of [[0.2, -2.6, 0, -1], [0.2, 2.6, 0, 1], [3.3, 0.6, 1, 0]]) {
        const p = C.toWorld(c, lx, ly);
        opts.push({ blocks: [{ wx: p[0], wy: p[1], dir: worldDir(c, dx, dy), lines }], marks: [] });
      }
      return opts;
    }

    if (c.type === 'bjt') {
      const lines = nameLines.slice();
      if (r) {
        if (st.showI) {
          lines.push({ text: 'IC ' + fmt(r.ic, 'A'), color: col.cur, mono: true });
          lines.push({ text: 'IB ' + fmt(r.ib, 'A'), color: col.cur, mono: true });
        }
        if (st.showV) lines.push({ text: (c.props.pol === 'pnp' ? 'VEC ' : 'VCE ') + fmt(r.vce, 'V'), color: col.volt, mono: true });
        if (st.showP) lines.push({ text: 'P ' + fmt(r.p, 'W'), color: col.pabs, mono: true });
        lines.push({ text: tr('region_' + r.state), color: r.state === 'act' ? col.muted : col.err, bold: r.state !== 'act' });
      }
      const marks = [];
      if (r && st.showI) marks.push(() => {
        const pnp = c.props.pol === 'pnp';
        const arr = (l1, l2, positive) => {
          const a = C.toWorld(c, l1[0], l1[1]), b = C.toWorld(c, l2[0], l2[1]);
          if (positive) arrowScreen(this, S.view, a[0], a[1], b[0], b[1], col.cur, 1.6);
          else arrowScreen(this, S.view, b[0], b[1], a[0], a[1], col.cur, 1.6);
        };
        // reference mode: arrows in the normal directions of the device, the values carry the sign
        const real = !!st.realDir;
        if (!real || Math.abs(r.ib) > 1e-12) arr([-1.85, -0.35], [-1.05, -0.35], real ? (r.ib > 0) !== pnp : !pnp);
        if (!real || Math.abs(r.ic) > 1e-12) arr([1.35, -1.95], [1.35, -1.25], real ? (r.ic > 0) !== pnp : !pnp);
        if (!real || Math.abs(r.ie) > 1e-12) arr([1.35, 1.25], [1.35, 1.95], real ? (r.ie > 0) !== pnp : !pnp);
      });
      for (const [lx, ly, dx, dy] of [[2.0, 0, 1, 0], [-1.2, -1.0, -1, 0], [-1.2, 1.0, -1, 0]]) {
        const p = C.toWorld(c, lx, ly);
        opts.push({ blocks: [{ wx: p[0], wy: p[1], dir: worldDir(c, dx, dy), lines }], marks });
      }
      return opts;
    }
    return opts;
  };

  /* reference marks of a two-terminal element: + and − of V at the chosen terminals, the arrow of I in the
   * chosen direction (both can be tapped to flip them), and the values with their sign */
  Renderer.prototype.refMarks = function (S, c, r, rd, hw, cx, cy, ax, ay, marks, lines, fmt) {
    const st = S.settings;
    const f = C.refs(c), sV = f.refV ? -1 : 1, sI = f.refI ? -1 : 1;
    let off = hw + 0.35;
    if (st.showI) {
      const o = off;
      marks.push(() => {
        const x1 = cx + rd[0] * o - ax * 0.65 * sI, y1 = cy + rd[1] * o - ay * 0.65 * sI, x2 = cx + rd[0] * o + ax * 0.65 * sI, y2 = cy + rd[1] * o + ay * 0.65 * sI;
        arrowScreen(this, S.view, x1, y1, x2, y2, col.cur, 1.8);
        this.addHit(S, c.id, 'i', (x1 + x2) / 2, (y1 + y2) / 2, 0.6);
      });
      off += 0.5;
    }
    if (st.showV) {
      const o2 = hw + 0.35;
      marks.push(() => {
        const px = Math.max(8, Math.min(12, S.view.scale * 0.45));
        const p0 = [cx - ax * 1.55 * sV + rd[0] * o2, cy - ay * 1.55 * sV + rd[1] * o2], p1 = [cx + ax * 1.55 * sV + rd[0] * o2, cy + ay * 1.55 * sV + rd[1] * o2];
        signGlyph(this, S.view, p0[0], p0[1], true, col.volt, px);
        signGlyph(this, S.view, p1[0], p1[1], false, col.volt, px);
        this.addHit(S, c.id, 'v', p0[0], p0[1], 0.5);
        this.addHit(S, c.id, 'v', p1[0], p1[1], 0.5);
      });
    }
    if (r) {
      const sg = C.signed(c, r);
      if (st.showV) lines.push({ text: fmt(sg.v, 'V'), color: col.volt, mono: true });
      if (st.showI) lines.push({ text: fmt(sg.i, 'A'), color: col.cur, mono: true });
      if (st.showP) lines.push({ text: fmt(r.p, 'W'), color: r.p < -1e-15 ? col.pgen : col.pabs, mono: true });
      if (C.isDiode(c) && c.props.model !== 'exact' && st.showState) lines.push({ text: S.tr('state_' + r.state), color: col.muted });
    }
    lines.refOff = off;
  };
  // tappable areas (screen rectangles) of the reference marks
  Renderer.prototype.addHit = function (S, id, kind, wx, wy, half) {
    const s = S.view.scale, h = Math.max(9, half * s);
    const x = wx * s + S.view.ox, y = wy * s + S.view.oy;
    this.hits.push({ id, kind, r: [x - h, y - h, x + h, y + h] });
  };
  Renderer.prototype.markAt = function (sx, sy, pad) {
    let best = null, bd = Infinity;
    for (const h of this.hits || []) {
      if (sx < h.r[0] - pad || sx > h.r[2] + pad || sy < h.r[1] - pad || sy > h.r[3] + pad) continue;
      const d = Math.hypot(sx - (h.r[0] + h.r[2]) / 2, sy - (h.r[1] + h.r[3]) / 2);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  };

  // brightness grows with the forward current, full at I_max
  Renderer.prototype.drawGlow = function (S, res) {
    const ctx = this.ctx, dpr = this.dpr, view = S.view, s = view.scale;
    for (const c of S.circuit.comps) {
      if (c.type !== 'led' && c.type !== 'rgbled') continue;
      const r = res.el[c.id];
      if (!r) continue;
      let rgb, b;
      if (c.type === 'led') {
        b = Math.max(0, Math.min(1, r.i / c.props.Imax));
        rgb = (C.LED_COLORS[c.props.color] || C.LED_COLORS.red).rgb;
      } else {
        const ch = r.ch.map(q => Math.max(0, Math.min(1, q.i / c.props.Imax)));
        b = Math.max(...ch);
        const m = [[255, 30, 30], [30, 255, 60], [40, 110, 255]];
        rgb = [0, 1, 2].map(j => ch.reduce((sum, v, k) => sum + v * m[k][j], 0));
        const top = Math.max(1, ...rgb);
        rgb = rgb.map(v => Math.round(255 * v / top));
      }
      if (b < 0.005) continue;
      // white light does not show on a light background: warm it up and give the halo a faint edge
      const lightBg = !document.documentElement.classList.contains('dark');
      const whiteish = Math.min(...rgb) > 200;
      if (lightBg && whiteish) rgb = [255, 226, 140];
      const [wx, wy] = C.toWorld(c, c.type === 'led' ? 0 : 0.2, 0);
      const x = wx * s + view.ox, y = wy * s + view.oy, R0 = s * (c.type === 'led' ? 1.9 : 2.8);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R0);
      const a = 0.25 + 0.65 * Math.sqrt(b);
      g.addColorStop(0, `rgba(${rgb.join(',')},${a})`);
      g.addColorStop(0.45, `rgba(${rgb.join(',')},${a * 0.45})`);
      g.addColorStop(1, `rgba(${rgb.join(',')},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, R0, 0, 2 * Math.PI); ctx.fill();
      if (lightBg && whiteish) {
        ctx.strokeStyle = `rgba(150,120,40,${0.25 * a})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, R0 * 0.62, 0, 2 * Math.PI); ctx.stroke();
      }
    }
  };

  function blockRect(R, view, b, fontPx) {
    if (!b.lines.length) return null;
    const ctx = R.ctx;
    const sx = b.wx * view.scale + view.ox, sy = b.wy * view.scale + view.oy;
    const lh = fontPx * 1.22, H = lh * b.lines.length;
    let W = 0;
    for (const ln of b.lines) {
      ctx.font = `${ln.bold ? 700 : 500} ${fontPx}px ${ln.mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'ui-sans-serif, system-ui, sans-serif'}`;
      W = Math.max(W, ctx.measureText(ln.text).width + (ln.box ? 8 : 0));
    }
    const d = b.dir;
    if (!d[0] && !d[1]) return [sx - W / 2, sy - H / 2, sx + W / 2, sy + H / 2];
    if (Math.abs(d[0]) > Math.abs(d[1])) return d[0] > 0 ? [sx, sy - H / 2, sx + W, sy + H / 2] : [sx - W, sy - H / 2, sx, sy + H / 2];
    return d[1] < 0 ? [sx - W / 2, sy - H, sx + W / 2, sy] : [sx - W / 2, sy, sx + W / 2, sy + H];
  }
  const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

  Renderer.prototype.drawAllLabels = function (S, res, fmt, fontPx) {
    const view = S.view, s = view.scale;
    const toS = (x, y) => [x * s + view.ox, y * s + view.oy];
    // obstacles: component bodies and wires
    const obst = [];
    for (const c of S.circuit.comps) {
      const b = C.bounds(c), p = toS(b[0], b[1]), q = toS(b[2], b[3]);
      obst.push({ r: [p[0], p[1], q[0], q[1]], id: c.id, w: 40 });
    }
    for (const w of S.circuit.wires) {
      const p = toS(w.x1, w.y1), q = toS(w.x2, w.y2);
      obst.push({ r: [Math.min(p[0], q[0]) - 3, Math.min(p[1], q[1]) - 3, Math.max(p[0], q[0]) + 3, Math.max(p[1], q[1]) + 3], w: 4 });
    }
    const W = this.w, H = this.h;
    const items = [];
    for (const c of S.circuit.comps) {
      if (c.type === 'ground') continue;
      const opts = this.labelOptions(S, c, res, fmt);
      if (!opts.length) continue;
      for (const o of opts) {
        o.rects = o.blocks.map(b => blockRect(this, view, b, fontPx)).filter(Boolean);
        // marks strip: kept clear of other labels, but it may touch wires and its own body
        o.marks2 = (o.extra || []).map(e => { const p = toS(e[0], e[1]), q = toS(e[2], e[3]); return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]; });
      }
      items.push({ c, opts, pick: 0, two: C.TYPES[c.type].terms.length === 2 });
    }
    const cost = (it, k) => {
      const o = it.opts[k];
      let score = k * 0.5 + (o.penalty || 0) * 100; // mild preference for the conventional option
      for (const r of o.rects) {
        // the own body counts too for two-terminal elements (their box is their symbol)
        for (const ob of obst) if (ob.id !== it.c.id || (ob.w > 10 && it.two)) score += overlap(r, ob.r) * ob.w;
        for (const other of items) {
          if (other === it || other.pick < 0) continue;
          const oo = other.opts[other.pick];
          for (const pr of oo.rects) score += overlap(r, pr) * 40;
          for (const pr of oo.marks2) score += overlap(r, pr) * 20;
        }
        const area = (r[2] - r[0]) * (r[3] - r[1]);
        score += (area - overlap(r, [0, 0, W, H])) * 0.3;
      }
      for (const m of o.marks2) {
        for (const other of items) {
          if (other === it || other.pick < 0) continue;
          for (const pr of other.opts[other.pick].rects) score += overlap(m, pr) * 20;
        }
        for (const ob of obst) if (ob.id !== it.c.id && ob.w > 10) score += overlap(m, ob.r) * 10;
      }
      return score;
    };
    // greedy placement, then two passes where each label moves if another option is better
    for (const it of items) it.pick = -1;
    for (const it of items) { let b = 0, bs = Infinity; it.opts.forEach((_, k) => { const sc = cost(it, k); if (sc < bs) { bs = sc; b = k; } }); it.pick = b; }
    for (let pass = 0; pass < 2; pass++) {
      for (const it of items) { let b = it.pick, bs = cost(it, it.pick); it.opts.forEach((_, k) => { const sc = cost(it, k); if (sc < bs - 1e-6) { bs = sc; b = k; } }); it.pick = b; }
    }
    this.placed = [];
    for (const it of items) for (const r of it.opts[it.pick].rects.concat(it.opts[it.pick].marks2)) this.placed.push(r);
    this.compBoxes = obst.filter(o => o.w > 10).map(o => o.r);
    for (const it of items) {
      const best = it.opts[it.pick];
      for (const m of best.marks) m();
      for (const b of best.blocks) drawBlock(this, view, b.wx, b.wy, b.dir, b.lines, fontPx);
    }
  };

  Renderer.prototype.drawWireCurrents = function (S, fmt) {
    const st = S.settings, view = S.view, s = view.scale, ctx = this.ctx, dpr = this.dpr;
    const fontPx = Math.max(10, Math.min(13, s * 0.52));
    // one label per branch (pieces in series carry the same current), on its longest piece
    const best = new Map();
    for (const [id, pieces] of S.wireCur) {
      const on = st.showWireI || S.sel.has(id) || (S.hover && S.hover.id === id);
      if (!on) continue;
      for (const p of pieces) {
        const L = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
        if (L < 0.9 || (Math.abs(p.i) < 1e-12 && !p.loop)) continue;
        const b = best.get(p.chain);
        if (!b || L > b.L) best.set(p.chain, { p, L });
      }
    }
    const taken = (this.placed || []).concat(this.compBoxes || []);
    ctx.font = `500 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    for (const { p, L } of best.values()) {
      const ux = (p.x2 - p.x1) / L, uy = (p.y2 - p.y1) / L, d = p.i >= 0 ? 1 : -1;
      const mx = (p.x1 + p.x2) / 2, my = (p.y1 + p.y2) / 2;
      const horiz = uy === 0, h = Math.min(0.5, L / 3), off = 0.42;
      const txt = p.loop ? 'I ?' : fmt(Math.abs(p.i), 'A');
      const tw = ctx.measureText(txt).width + 4, th = fontPx + 2;
      // try both sides of the wire, keep the free one
      let pick = null;
      for (const sgn of [1, -1]) {
        const sx = horiz ? 0 : sgn, sy = horiz ? -sgn : 0;
        const tx = (mx + sx * (off + 0.45)) * s + view.ox, ty = (my + sy * (off + 0.45)) * s + view.oy;
        const r = horiz ? [tx - tw / 2, sy < 0 ? ty - th : ty, tx + tw / 2, sy < 0 ? ty : ty + th] : (sx > 0 ? [tx, ty - th / 2, tx + tw, ty + th / 2] : [tx - tw, ty - th / 2, tx, ty + th / 2]);
        const ar = [(mx + sx * off - Math.abs(ux) * h) * s + view.ox - 5, (my + sy * off - Math.abs(uy) * h) * s + view.oy - 5, (mx + sx * off + Math.abs(ux) * h) * s + view.ox + 5, (my + sy * off + Math.abs(uy) * h) * s + view.oy + 5];
        const hitT = taken.some(q => overlap(r, q) > 4), hitA = taken.some(q => overlap(ar, q) > 4);
        if (!hitA) { pick = { sx, sy, tx, ty, r, ar, text: !hitT }; if (!hitT) break; }
      }
      if (!pick) continue;
      const { sx, sy, tx, ty } = pick;
      if (!p.loop) arrowScreen(this, view, mx - ux * h * d + sx * off, my - uy * h * d + sy * off, mx + ux * h * d + sx * off, my + uy * h * d + sy * off, col.cur, 1.6);
      taken.push(pick.ar);
      if (!pick.text && !p.loop) continue;
      taken.push(pick.r);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = horiz ? 'center' : (sx > 0 ? 'left' : 'right'); ctx.textBaseline = horiz ? (sy < 0 ? 'bottom' : 'top') : 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = col.bg; ctx.lineJoin = 'round';
      ctx.strokeText(txt, tx, ty); ctx.fillStyle = col.cur; ctx.fillText(txt, tx, ty);
    }
  };

  /* current flow animation: dots travel along wires and through components */
  Renderer.prototype.drawFlow = function (S) {
    const ctx = this.ctx, dpr = this.dpr, view = S.view, s = view.scale;
    const F = S.flow;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.dot;
    const r = Math.max(1.8, Math.min(3.4, s * 0.12));
    const spacing = 1.0;
    for (const seg of F.segs) {
      if (!seg.speed) continue;
      const L = seg.len;
      let ph = seg.phase % spacing; if (ph < 0) ph += spacing;
      for (let d = ph; d < L; d += spacing) {
        const u = d / L;
        const x = seg.x1 + (seg.x2 - seg.x1) * u, y = seg.y1 + (seg.y2 - seg.y1) * u;
        ctx.beginPath(); ctx.arc(x * s + view.ox, y * s + view.oy, r, 0, 2 * Math.PI); ctx.fill();
      }
    }
  };

  /* palette icon: the symbol fitted in a small canvas */
  function drawIcon(canvas, type, props, style, color) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 44, h = canvas.clientHeight || 30;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const R = { ctx: canvas.getContext('2d'), dpr };
    R.ctx.clearRect(0, 0, canvas.width, canvas.height);
    const b = C.TYPES[type].box;
    const bw = b[2] - b[0], bh = b[3] - b[1];
    const scale = Math.min((w - 4) / bw, (h - 4) / bh);
    const comp = { type, x: 0, y: 0, rot: 0, flip: false, props: props || C.defaults(type) };
    const view = { scale, ox: w / 2 - (b[0] + bw / 2) * scale, oy: h / 2 - (b[1] + bh / 2) * scale };
    drawSymbol(R, comp, view, color || col.fg, style, Math.max(1.2, scale * 0.11));
  }

  DCS.render = { Renderer, readColors, drawIcon, colors: () => col };
})(window);
