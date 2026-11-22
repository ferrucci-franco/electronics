/* plot-interactions.js — mouse, trackpad and touch interaction for Plotly plots (ferrucci-lab.com apps).
 *
 * Extracted from bode-measure/index.html and generalised. Plain script, no build step: inline it in a
 * single-file app (the repo's convention) or load it with <script src>. Needs Plotly 2.x on the page.
 *
 *   const pi = PlotInteractions.install([gdGain, gdPhase], {
 *     linkX: true,                       // the plots share their x axis (zoom / pan / fit move all of them)
 *     texts: () => TXT[LANG],            // {fitX, fitY, fitAll, legendShow, legendHide, zoomHint}
 *   });
 *   // after every Plotly.react of a plot: its "initial view", used by Fit X / Fit all / double tap
 *   pi.setFitView(gd, {x:[xmin, xmax], y:[ymin, ymax]});   // in Plotly range units (log10 on a log axis)
 *   pi.refresh();                        // after a language change: button titles
 *
 * Plot config must include  doubleClick:false  (Plotly's own reset would run after ours and autoscale),
 * scrollZoom:false and displayModeBar:false. Each plot div must sit alone in a container element that this
 * module positions (position:relative) to hold the Fit buttons and the legend button.
 *
 * What the reader gets (see SKILL.md for the reasons):
 *   mouse      left drag = Plotly zoom box; right (or middle) drag = pan; wheel = page scroll, never zoom;
 *              double-click = every plot back to its initial view
 *   trackpad   two-finger swipe that starts sideways = pan (latched 800 ms); vertical = page scroll
 *   finger     fast and mostly vertical = native page scroll; slower = pan; held still then moved = zoom
 *              (x, y or window by direction); tap = tooltip; quick double tap = fit all plots; slow double
 *              tap = the next drag within 4 s draws the zoom window (hint shown); two fingers = pinch
 *   buttons    Fit X / Fit Y / Fit all, semi-transparent, top-right of each plot; Fit Y fits what is drawn
 *              in the current x window
 *   legend     inside the plot, in its emptiest corner, with a show/hide button (hidden at start on phones)
 */
(function(global){
  'use strict';

  const T = {
    SLOP:8,          // px a finger may wander before a touch is a drag
    HOLD_MS:350,     // still this long: zoom armed (ring under the finger)
    FAST:0.6,        // px/ms over the first SLOP px: faster and mostly vertical = page scroll
    MOVING_MS:150,   // a scroll event this recent: the page is still moving, any drag scrolls it
    TAP_MS:350,      // longest tap
    FOLLOW_MS:700,   // a second touch this soon after a tap belongs to it...
    NEAR:60,         // ...if it lands this close
    QUICK_MS:300,    // two taps closer than this: quick double tap (fit)
    ARMED_MS:4000,   // after a slow double tap, how long the plot waits for the drag
    MINDRAG:14, MINZOOM:36,     // zoom direction thresholds (as Plotly's own zoom box)
    PINCH_MIN:24, PINCH_MAX:50, // pinch: ignore an axis when fingers are this close along it; max factor
    WHEEL_LATCH_MS:800,         // trackpad pan stays latched through short pauses
    LEGEND_WIDE_SHARE:0.4       // a legend wider than this share of the plot starts hidden on a computer
  };

  const DEFAULT_TEXTS = {
    fitX:'Fit X', fitY:'Fit Y', fitAll:'Fit all', legendShow:'Show legend', legendHide:'Minimize legend',
    zoomHint:'Drag sideways to zoom on X, up or down to zoom on Y, diagonally for a window'
  };

  const ICONS = {
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/></svg>',
    y:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4"/></svg>',
    all:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    legend:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><line x1="4" y1="7" x2="7" y2="7"/><line x1="10" y1="7" x2="20" y2="7"/>'
      + '<line x1="4" y1="12" x2="7" y2="12"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="7" y2="17"/><line x1="10" y1="17" x2="17" y2="17"/></svg>'
  };

  // Colours come from the app's CSS variables when it has them (--accent, --paper, --card, --fg, --border).
  const CSS = `
.pi-fit-btns{position:absolute; top:8px; right:10px; z-index:5; display:flex; gap:4px}
.pi-fit-btns button{width:28px; height:28px; padding:4px; border-radius:7px; border:1px solid var(--border,#d7e2f4); background:var(--card,#eef4ff);
  color:var(--fg,#0f1222); opacity:.5; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:opacity .15s}
.pi-fit-btns button:focus-visible{opacity:1}
.pi-fit-btns svg{width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round}
.js-plotly-plot.pi-legend-collapsed .infolayer .legend{display:none}
.pi-legend-btn{position:absolute; z-index:6; display:flex; align-items:center; justify-content:center; width:22px; height:22px; padding:0;
  border:1px solid color-mix(in srgb, var(--border,#d7e2f4) 70%, transparent); border-radius:5px;
  background:color-mix(in srgb, var(--paper,#fff) 80%, transparent); color:var(--fg,#0f1222); opacity:.6; cursor:pointer; touch-action:manipulation}
.pi-legend-btn[hidden]{display:none}
.pi-legend-btn:focus-visible{opacity:1}
.pi-legend-btn.is-open{color:var(--accent,#2f6fde)}
.pi-legend-btn svg{width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round}
@media (hover:hover){ .pi-fit-btns button:hover, .pi-legend-btn:hover{opacity:1} }
@media (pointer:coarse){
  .pi-fit-btns{gap:6px}
  .pi-fit-btns button{width:36px; height:36px; border-radius:10px; background:color-mix(in srgb, var(--card,#eef4ff) 70%, transparent)}
  .pi-fit-btns svg{width:20px; height:20px}
  .pi-legend-btn{width:36px; height:36px; border-radius:10px}
  .pi-legend-btn svg{width:20px; height:20px}
  .pi-legend-btn.is-open{opacity:.9; background:color-mix(in srgb, var(--accent,#2f6fde) 14%, var(--paper,#fff))}
}
.pi-zoom-sel{position:fixed; display:none; pointer-events:none; z-index:40; box-sizing:border-box;
  background:color-mix(in srgb, var(--accent,#2f6fde) 16%, transparent); border-left:2px solid var(--accent,#2f6fde); border-right:2px solid var(--accent,#2f6fde)}
.pi-zoom-sel.is-y{border:none; border-top:2px solid var(--accent,#2f6fde); border-bottom:2px solid var(--accent,#2f6fde)}
.pi-zoom-sel.is-xy{border:2px solid var(--accent,#2f6fde)}
.pi-touch-ring{position:fixed; display:none; pointer-events:none; z-index:41; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%;
  border:2px solid var(--accent,#2f6fde); background:color-mix(in srgb, var(--accent,#2f6fde) 14%, transparent)}
.pi-zoom-hint{position:fixed; display:none; pointer-events:none; z-index:42; transform:translate(-50%, -100%); max-width:min(90vw, 360px);
  padding:6px 12px; border-radius:12px; border:1px solid var(--accent,#2f6fde); background:color-mix(in srgb, var(--paper,#fff) 92%, transparent);
  color:var(--fg,#0f1222); font-size:13px; line-height:1.3; text-align:center; box-shadow:0 4px 16px rgba(0,0,0,.18)}
.js-plotly-plot.pi-touch-gesture .hoverlayer{display:none}
body.pi-panning, body.pi-panning *{cursor:grabbing !important}
`;
  function injectCss(){
    if(document.getElementById('pi-style')) return;
    const st = document.createElement('style');
    st.id = 'pi-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const COARSE_MQ = global.matchMedia ? global.matchMedia('(pointer:coarse)') : {matches:false};

  // Plotly redraws the last hover label after every relayout until a mouseout, which a finger never sends
  function clearHover(gd){
    if(gd && gd._fullLayout) gd._fullLayout._hoversubplot = null;
    if(global.Plotly && Plotly.Fx) Plotly.Fx.unhover(gd);
  }
  // pointer position inside the plotting area: {xa, ya, px, py}, or null outside it
  function plotAreaPoint(gd, clientX, clientY){
    const fl = gd._fullLayout;
    if(!fl || !fl.xaxis || !fl.yaxis || !fl.xaxis._length) return null;
    const xa = fl.xaxis, ya = fl.yaxis, r = gd.getBoundingClientRect();
    const px = clientX - r.left - xa._offset, py = clientY - r.top - ya._offset;
    if(px < 0 || px > xa._length || py < 0 || py > ya._length) return null;
    return {xa, ya, px, py};
  }
  function plotArea(gd){
    const fl = gd._fullLayout;
    if(!fl || !fl.xaxis || !fl.yaxis || !fl.xaxis._length) return null;
    const r = gd.getBoundingClientRect();
    return {xa:fl.xaxis, ya:fl.yaxis, left:r.left + fl.xaxis._offset, top:r.top + fl.yaxis._offset, w:fl.xaxis._length, h:fl.yaxis._length};
  }

  // ---------- helpers an app uses when it builds its layout ----------

  // The corner of the plotting area (about a third of its width and height) with the least drawn in it.
  // series: [{x:[...], y:[...], w:weight}] in data units; xLog: the x axis is logarithmic.
  // Ties: top left, top right, bottom left, bottom right.
  function emptiestCorner(xRange, yRange, series, xLog){
    const corners = [{left:true, top:true}, {left:false, top:true}, {left:true, top:false}, {left:false, top:false}];
    let best = corners[0], bestScore = Infinity;
    corners.forEach(cn => {
      let score = 0;
      series.forEach(sr => (sr.x || []).forEach((xv, i) => {
        const y = sr.y[i];
        if(y == null || !Number.isFinite(y) || (xLog && !(xv > 0))) return;
        const fx = ((xLog ? Math.log10(xv) : xv) - xRange[0]) / (xRange[1] - xRange[0]);
        const fy = (y - yRange[0]) / (yRange[1] - yRange[0]);
        if((cn.left ? fx <= 0.38 : fx >= 0.62) && (cn.top ? fy >= 0.66 : fy <= 0.34)) score += (sr.w || 1);
      }));
      if(score < bestScore){ bestScore = score; best = cn; }
    });
    return best;
  }
  const withAlpha = (hex, a) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if(!m) return hex;
    const n = parseInt(m[1], 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  // Plotly legend object for an in-plot legend at a corner
  function overlayLegend(corner, {paper = '#ffffff', grid = '#e6ebf3', fontSize = 12} = {}){
    return {orientation:'v', x:corner.left ? 0.01 : 0.99, xanchor:corner.left ? 'left' : 'right',
            y:corner.top ? 0.99 : 0.01, yanchor:corner.top ? 'top' : 'bottom',
            bgcolor:withAlpha(paper, 0.85), bordercolor:grid, borderwidth:1, font:{size:fontSize}};
  }

  // ---------- install ----------
  function install(gds, options = {}){
    gds = (Array.isArray(gds) ? gds : [gds]).filter(Boolean);
    injectCss();
    const opts = Object.assign({linkX:gds.length > 1, fitButtons:true, legendToggle:true, touch:true, wheel:true, mousePan:true,
                                isNarrow:gd => gd.clientWidth > 0 && gd.clientWidth < 520}, options);
    const texts = () => Object.assign({}, DEFAULT_TEXTS, typeof opts.texts === 'function' ? opts.texts() : (opts.texts || {}));
    const legendChoices = new Map();

    // ----- fit -----
    // Fit X: x back to the initial view (every linked plot follows). Fit Y: y fitted to what is drawn in the
    // current x window, 8 % margin; initial view when nothing is there. Fit all: the plot's initial view.
    function dataYRange(gd){
      const fl = gd._fullLayout;
      if(!fl || !fl.xaxis) return null;
      const xa = fl.xaxis, xr = xa.range.map(Number), lo = Math.min(xr[0], xr[1]), hi = Math.max(xr[0], xr[1]);
      const isLog = xa.type === 'log';
      let ymin = Infinity, ymax = -Infinity;
      (gd.data || []).forEach(t => {
        if(t.visible === false || t.visible === 'legendonly') return;
        (t.x || []).forEach((x, i) => {
          const y = t.y && t.y[i];
          if(y == null || !Number.isFinite(y)) return;
          const lx = isLog ? (x > 0 ? Math.log10(x) : NaN) : Number(x);
          if(!(lx >= lo && lx <= hi)) return;
          if(y < ymin) ymin = y;
          if(y > ymax) ymax = y;
        });
      });
      if(!Number.isFinite(ymin)) return null;
      const minSpan = (opts.minYSpan && opts.minYSpan(gd)) || Math.max(1e-9, Math.abs(ymax) * 0.05) || 1;
      if(ymax - ymin < minSpan){ const c = (ymin + ymax) / 2; ymin = c - minSpan / 2; ymax = c + minSpan / 2; }
      const pad = 0.08 * (ymax - ymin);
      return [ymin - pad, ymax + pad];
    }
    function fitPlot(gd, which){
      const v = gd._piFitView;
      const upd = {};
      if(which !== 'y'){ if(v) upd['xaxis.range'] = v.x.slice(); else upd['xaxis.autorange'] = true; }
      if(which === 'y'){ const r = dataYRange(gd); if(r) upd['yaxis.range'] = r; else if(v) upd['yaxis.range'] = v.y.slice(); else upd['yaxis.autorange'] = true; }
      if(which === 'all'){ if(v) upd['yaxis.range'] = v.y.slice(); else upd['yaxis.autorange'] = true; }
      clearHover(gd);
      return Plotly.relayout(gd, upd);
    }
    const fitAll = () => Promise.all(gds.map(gd => fitPlot(gd, 'all')));

    // ----- linked x axes -----
    let linking = false;
    if(opts.linkX && gds.length > 1){
      gds.forEach(src => src.on('plotly_relayout', ev => {
        if(linking) return;
        let range = null;
        if('xaxis.range[0]' in ev) range = [ev['xaxis.range[0]'], ev['xaxis.range[1]']];
        else if(ev['xaxis.autorange'] || ev['xaxis.range']) range = src.layout.xaxis.range;
        if(!range) return;
        linking = true;
        Promise.all(gds.filter(g => g !== src).map(g => Plotly.relayout(g, {'xaxis.range':range.slice()})))
          .then(() => { linking = false; }, () => { linking = false; });
      }));
    }

    // ----- double-click (mouse) and the emulated one of a quick double tap: every plot to its initial view -----
    // Plotly still reports the double-click with doubleClick:false; the DOM dblclick lands on its drag cover.
    gds.forEach(gd => gd.on('plotly_doubleclick', fitAll));

    // ----- fit buttons -----
    function renderButtons(){
      const t = texts(), titles = {x:t.fitX, y:t.fitY, all:t.fitAll};
      gds.forEach(gd => {
        if(!opts.fitButtons) return;
        const cell = gd.parentElement;
        let box = cell.querySelector(':scope > .pi-fit-btns');
        if(!box){
          if(getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
          box = document.createElement('div'); box.className = 'pi-fit-btns';
          box.addEventListener('click', e => {
            const b = e.target.closest('button');
            if(!b) return;
            fitPlot(gd, b.dataset.fit);
            if(e.detail) b.blur();
          });
          cell.appendChild(box);
        }
        box.innerHTML = ['x', 'y', 'all'].map(k => `<button type="button" data-fit="${k}" title="${titles[k]}" aria-label="${titles[k]}">${ICONS[k]}</button>`).join('');
      });
      gds.forEach(syncLegend);
    }

    // ----- legend show/hide button -----
    const compact = gd => opts.isNarrow(gd) || COARSE_MQ.matches;
    const legendKey = gd => (gd.id || gds.indexOf(gd)) + '|' + (compact(gd) ? 'compact' : 'wide');
    function legendBox(legendEl){
      const bg = legendEl.querySelector(':scope > rect.bg');
      const width = Number(bg && bg.getAttribute('width')), height = Number(bg && bg.getAttribute('height'));
      const m = /translate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)\s*\)/.exec(legendEl.getAttribute('transform') || '');
      if(!(width > 0) || !(height > 0) || !m) return null;
      return {left:Number(m[1]), top:Number(m[2]), width, height};
    }
    function syncLegend(gd){
      if(!opts.legendToggle) return;
      const cell = gd.parentElement, fl = gd._fullLayout;
      let btn = cell.querySelector(':scope > .pi-legend-btn');
      const legendEl = gd.querySelector('.infolayer .legend');
      const lg = fl && fl.legend;
      const inside = lg && lg.orientation !== 'h' && lg.x >= 0 && lg.x <= 1 && lg.y >= 0 && lg.y <= 1;
      const box = fl && fl.showlegend && inside && legendEl && legendEl.querySelector('.traces') ? legendBox(legendEl) : null;
      if(!box){ if(btn) btn.hidden = true; gd.classList.remove('pi-legend-collapsed'); return; }
      const cmp = compact(gd), own = legendChoices.get(legendKey(gd));
      const collapsed = typeof own === 'boolean' ? own : (cmp || box.width > T.LEGEND_WIDE_SHARE * ((fl._size && fl._size.w) || Infinity));
      if(!btn){
        if(getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
        btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'pi-legend-btn'; btn.innerHTML = ICONS.legend;
        btn.addEventListener('click', e => {
          e.preventDefault();
          legendChoices.set(legendKey(gd), !gd.classList.contains('pi-legend-collapsed'));
          syncLegend(gd);
          if(e.detail) btn.blur();
        });
        cell.appendChild(btn);
      }
      btn.hidden = false;
      btn.classList.toggle('is-open', !collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      const label = texts()[collapsed ? 'legendShow' : 'legendHide'];
      btn.title = label; btn.setAttribute('aria-label', label);
      const left = lg.xanchor === 'left' || (lg.xanchor === 'auto' && lg.x < 0.5), top = lg.yanchor === 'top' || (lg.yanchor === 'auto' && lg.y >= 0.5);
      const size = btn.offsetWidth || (cmp ? 36 : 22), step = size + (cmp ? 6 : 4);
      // the button's offset inside the cell = the plot div's offset + the legend's place in the plot
      const ox = gd.offsetLeft, oy = gd.offsetTop;
      btn.style.left = Math.round(ox + (left ? box.left : box.left + box.width - size)) + 'px';
      btn.style.top = Math.round(oy + (top ? box.top : box.top + box.height - size)) + 'px';
      gd.classList.toggle('pi-legend-collapsed', collapsed);
      legendEl.style.translate = collapsed ? '' : (cmp ? `0px ${top ? step : -step}px` : `${left ? step : -step}px 0px`);
    }
    gds.forEach(gd => gd.on('plotly_afterplot', () => syncLegend(gd)));

    // ----- mouse: right (or middle) drag pans -----
    // Plotly would read a right-button drag as a zoom box it never draws and collapse the axes on release.
    function setupMousePan(gd){
      let pan = null, raf = 0;
      const isPanButton = e => e.pointerType !== 'touch' && e.pointerType !== 'pen' && (e.button === 1 || e.button === 2);
      function apply(){
        raf = 0;
        if(!pan) return;
        const {x0, y0, kx, ky, dx, dy} = pan;
        Plotly.relayout(gd, {'xaxis.autorange':false, 'xaxis.range':[x0[0] - dx*kx, x0[1] - dx*kx],
                             'yaxis.autorange':false, 'yaxis.range':[y0[0] + dy*ky, y0[1] + dy*ky]});
      }
      gd.addEventListener('pointerdown', e => {
        if(pan || !isPanButton(e)) return;
        const p = plotAreaPoint(gd, e.clientX, e.clientY);
        if(!p) return;
        e.preventDefault(); e.stopPropagation();
        const x0 = p.xa.range.map(Number), y0 = p.ya.range.map(Number);
        pan = {id:e.pointerId, sx:e.clientX, sy:e.clientY, dx:0, dy:0, x0, y0, kx:(x0[1]-x0[0])/p.xa._length, ky:(y0[1]-y0[0])/p.ya._length};
        try{ gd.setPointerCapture(e.pointerId); }catch(_){}
        clearHover(gd);
        document.body.classList.add('pi-panning');
      }, true);
      gd.addEventListener('pointermove', e => {
        if(!pan || e.pointerId !== pan.id) return;
        e.preventDefault(); e.stopPropagation();
        pan.dx = e.clientX - pan.sx; pan.dy = e.clientY - pan.sy;
        if(!raf) raf = requestAnimationFrame(apply);
      }, true);
      const end = e => {
        if(!pan || e.pointerId !== pan.id) return;
        e.stopPropagation();
        if(raf){ cancelAnimationFrame(raf); apply(); }
        pan = null;
        try{ gd.releasePointerCapture(e.pointerId); }catch(_){}
        document.body.classList.remove('pi-panning');
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => gd.addEventListener(t, end, true));
      ['mousedown', 'mouseup', 'auxclick'].forEach(type => gd.addEventListener(type, e => {
        if(e.button === 1 || e.button === 2){ e.stopPropagation(); if(e.cancelable) e.preventDefault(); }
      }, true));
      gd.addEventListener('contextmenu', e => e.preventDefault());
    }

    // ----- trackpad: a two-finger swipe that starts sideways pans; the mouse wheel stays a page scroll -----
    function setupWheelPan(gd){
      let base = null, endTimer = 0, raf = 0, pdx = 0, pdy = 0;
      const scale = e => e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? (gd.clientHeight || 800) : 1;
      function flush(){
        raf = 0;
        if(!base) return;
        const xs = pdx / base.xLen * base.xSpan, ys = -pdy / base.yLen * base.ySpan;
        pdx = 0; pdy = 0;
        base.x = [base.x[0] + xs, base.x[1] + xs];
        base.y = [base.y[0] + ys, base.y[1] + ys];
        Plotly.relayout(gd, {'xaxis.autorange':false, 'xaxis.range':base.x.slice(), 'yaxis.autorange':false, 'yaxis.range':base.y.slice()});
      }
      gd.addEventListener('wheel', e => {
        if(!base){
          if(e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   // mouse wheel, vertical swipe, pinch
          const p = plotAreaPoint(gd, e.clientX, e.clientY);
          if(!p) return;
          const x = p.xa.range.map(Number), y = p.ya.range.map(Number);
          base = {xLen:p.xa._length, yLen:p.ya._length, xSpan:x[1]-x[0], ySpan:y[1]-y[0], x, y};
        }
        clearTimeout(endTimer);
        endTimer = setTimeout(() => { base = null; pdx = 0; pdy = 0; }, T.WHEEL_LATCH_MS);
        e.preventDefault(); e.stopPropagation();
        pdx += e.deltaX * scale(e); pdy += e.deltaY * scale(e);
        if(!raf) raf = requestAnimationFrame(flush);
      }, {capture:true, passive:false});
    }

    // ----- touch -----
    const touchScroll = global.__piTouchScroll || (global.__piTouchScroll = {last:0});
    if(!global.__piScrollListener){
      global.__piScrollListener = true;
      document.addEventListener('scroll', () => { touchScroll.last = performance.now(); }, true);
    }
    function setupTouch(gd){
      gd.style.touchAction = 'manipulation';   // native scroll allowed, browser double-tap zoom off
      const BLOCKING = {pan:1, zoom:1, armed:1, second:1};
      const sel = document.createElement('div'); sel.className = 'pi-zoom-sel'; document.body.appendChild(sel);
      const ring = document.createElement('div'); ring.className = 'pi-touch-ring'; document.body.appendChild(ring);
      const hint = document.createElement('div'); hint.className = 'pi-zoom-hint'; document.body.appendChild(hint);
      let g = null, lastTap = null, raf = 0, armedUntil = 0, armedTimer = 0;
      let pinch = null, pinchRaf = 0, pinchPending = null, twoFingers = false;
      const isTouch = e => e.pointerType === 'touch' || e.pointerType === 'pen';
      const inside = (a, x, y) => x >= a.left && x <= a.left + a.w && y >= a.top && y <= a.top + a.h;
      const hideRing = () => { ring.style.display = 'none'; };
      const gestureOn = on => gd.classList.toggle('pi-touch-gesture', on);
      function zoomMode(dx, dy){
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if(ax < T.MINDRAG && ay < T.MINDRAG) return null;
        if(ay < Math.min(Math.max(ax * 0.6, T.MINDRAG), T.MINZOOM)) return 'x';
        if(ax < Math.min(Math.max(ay * 0.6, T.MINDRAG), T.MINZOOM)) return 'y';
        return 'xy';
      }
      function arm(){
        if(!g) return;
        if(g.mode === 'pending') g.mode = 'armed';
        Object.assign(ring.style, {display:'block', left:g.x + 'px', top:g.y + 'px'});
        clearHover(gd);
      }
      function disarm(){ armedUntil = 0; clearTimeout(armedTimer); armedTimer = 0; hint.style.display = 'none'; }
      function armWindow(){
        const a = plotArea(gd);
        if(!a) return;
        disarm(); clearHover(gd);
        armedUntil = performance.now() + T.ARMED_MS;
        armedTimer = setTimeout(disarm, T.ARMED_MS);
        hint.textContent = texts().zoomHint;
        Object.assign(hint.style, {display:'block', left:(a.left + a.w / 2) + 'px', top:(a.top + a.h - 10) + 'px',
                                   maxWidth:Math.max(160, Math.min(360, a.w - 16)) + 'px'});
      }
      function drawBox(){
        const z = g, a = z.a;
        if(!z.zmode){ sel.style.display = 'none'; return; }
        let x0 = Math.min(z.zx0, z.zx1), x1 = Math.max(z.zx0, z.zx1), y0 = Math.min(z.zy0, z.zy1), y1 = Math.max(z.zy0, z.zy1);
        if(z.zmode === 'y'){ x0 = a.left; x1 = a.left + a.w; }
        if(z.zmode === 'x'){ y0 = a.top; y1 = a.top + a.h; }
        sel.classList.toggle('is-y', z.zmode === 'y');
        sel.classList.toggle('is-xy', z.zmode === 'xy');
        Object.assign(sel.style, {display:'block', left:x0 + 'px', top:y0 + 'px', width:(x1 - x0) + 'px', height:(y1 - y0) + 'px'});
      }
      function applyZoom(){
        const z = g, {xa, ya, left, top} = z.a, upd = {};
        if(!z.zmode) return;
        if(z.zmode !== 'y') upd['xaxis.range'] = [xa.p2r(Math.min(z.zx0, z.zx1) - left), xa.p2r(Math.max(z.zx0, z.zx1) - left)];
        if(z.zmode !== 'x') upd['yaxis.range'] = [ya.p2r(Math.max(z.zy0, z.zy1) - top), ya.p2r(Math.min(z.zy0, z.zy1) - top)];
        Plotly.relayout(gd, upd);
      }
      function applyPan(){
        raf = 0;
        if(!g || g.mode !== 'pan') return;
        const dx = g.x - g.x0, dy = g.y - g.y0, p = g.pan;
        Plotly.relayout(gd, {'xaxis.range':[p.x[0] - dx * p.kx, p.x[1] - dx * p.kx], 'yaxis.range':[p.y[0] + dy * p.ky, p.y[1] + dy * p.ky]});
      }
      function startPan(){
        const a = g.a, x = a.xa.range.map(Number), y = a.ya.range.map(Number);
        g.mode = 'pan';
        g.pan = {x, y, kx:(x[1] - x[0]) / a.w, ky:(y[1] - y[0]) / a.h};
        gestureOn(true);
      }
      function startZoom(){
        hideRing(); disarm();
        g.mode = 'zoom';
        g.zx0 = clamp(g.x0, g.a.left, g.a.left + g.a.w); g.zy0 = clamp(g.y0, g.a.top, g.a.top + g.a.h);
        gestureOn(true);
      }
      // the first movement past SLOP decides; called from pointermove and touchmove, whichever comes first
      function decide(x, y, now){
        if(!g) return;
        g.x = x; g.y = y;
        const dx = x - g.x0, dy = y - g.y0, dist = Math.hypot(dx, dy);
        if(dist <= T.SLOP) return;
        if(g.mode === 'pending'){
          clearTimeout(g.hold);
          const speed = dist / Math.max(1, now - g.t0);
          if(speed > T.FAST && Math.abs(dy) >= Math.abs(dx)){ g.mode = 'native'; lastTap = null; } else startPan();
        }else if(g.mode === 'armed' || g.mode === 'second'){
          startZoom();
        }
      }
      function end(){
        if(g){ clearTimeout(g.hold); try{ gd.releasePointerCapture(g.id); }catch(_){} }
        g = null; hideRing(); sel.style.display = 'none';
        if(!pinch) gestureOn(false);
      }
      function showTapValue(x, y){
        const target = document.elementFromPoint(x, y);
        if(!target || !gd.contains(target) || !Plotly.Fx || typeof Plotly.Fx.hover !== 'function') return;
        try{ Plotly.Fx.hover(gd, {clientX:x, clientY:y, target}, 'xy'); }catch(_){}
      }
      // pinch: each axis scales by the fingers' spread along it; the values under them stay under them
      const pinchPoints = e => Array.from(e.touches).filter(t => gd.contains(t.target)).slice(0, 2).map(t => ({x:t.clientX, y:t.clientY}));
      function pinchStart(pts){
        const a = plotArea(gd);
        if(!a) return;
        if(g) end();
        disarm(); lastTap = null;
        const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
        pinch = {pts, a, x:a.xa.range.map(Number), y:a.ya.range.map(Number), ax:a.xa.p2l(cx - a.left), ay:a.ya.p2l(cy - a.top)};
        clearHover(gd); gestureOn(true);
      }
      function pinchMove(pts){
        const p = pinch, a = p.a;
        const scale = key => {
          const from = Math.abs(p.pts[0][key] - p.pts[1][key]), to = Math.abs(pts[0][key] - pts[1][key]);
          if(from < T.PINCH_MIN || to < T.PINCH_MIN) return 1;
          return clamp(to / from, 1 / T.PINCH_MAX, T.PINCH_MAX);
        };
        const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
        const range = (r, anchor, fraction, s) => { const span = (r[1] - r[0]) / s, lo = anchor - fraction * span; return [lo, lo + span]; };
        pinchPending = {'xaxis.range':range(p.x, p.ax, (cx - a.left) / a.w, scale('x')), 'yaxis.range':range(p.y, p.ay, 1 - (cy - a.top) / a.h, scale('y'))};
        if(!pinchRaf) pinchRaf = requestAnimationFrame(() => { pinchRaf = 0; if(pinchPending){ Plotly.relayout(gd, pinchPending); pinchPending = null; } });
      }
      function pinchEnd(){
        if(pinchRaf){ cancelAnimationFrame(pinchRaf); pinchRaf = 0; if(pinchPending){ Plotly.relayout(gd, pinchPending); pinchPending = null; } }
        pinch = null;
        gestureOn(false); clearHover(gd);
      }
      // Plotly's own touch handling never sees a finger
      gd.addEventListener('touchstart', e => {
        e.stopPropagation();
        if(e.touches.length >= 2){
          twoFingers = true;
          const pts = pinchPoints(e);
          if(pts.length === 2 && !pinch && !(g && g.mode === 'native')) pinchStart(pts);
        }
      }, {capture:true});
      gd.addEventListener('touchmove', e => {
        e.stopPropagation();
        const pts = pinchPoints(e);
        if(pts.length === 2 && e.cancelable){
          if(!pinch) pinchStart(pts);
          if(pinch){ e.preventDefault(); pinchMove(pts); }
          return;
        }
        if(pinch){ if(e.cancelable) e.preventDefault(); return; }
        if(g && e.touches.length === 1) decide(e.touches[0].clientX, e.touches[0].clientY, performance.now());
        if(g && BLOCKING[g.mode] && e.cancelable) e.preventDefault();
      }, {capture:true, passive:false});
      const touchDone = e => {
        e.stopPropagation();
        if(pinch && e.touches.length < 2) pinchEnd();
        if(e.touches.length === 0){ twoFingers = false; lastTouchEnd = performance.now(); }
      };
      // a tap's emulated mouse events can end with a mouseout from the plot, and Plotly answers it by removing
      // the tooltip the tap just showed: a finger has no pointer to leave with, so that mouseout is not passed on
      let lastTouchEnd = -Infinity;
      gd.addEventListener('mouseout', e => { if(performance.now() - lastTouchEnd < 700) e.stopPropagation(); }, true);
      gd.addEventListener('touchend', touchDone, {capture:true});
      gd.addEventListener('touchcancel', touchDone, {capture:true});

      gd.addEventListener('pointerdown', e => {
        if(!isTouch(e)) return;
        if(e.target.closest && e.target.closest('.legend')) return;   // the legend's items belong to the legend
        if(g || pinch || twoFingers){ end(); return; }
        const now = performance.now(), a = plotArea(gd);
        g = {id:e.pointerId, t0:now, x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, a, mode:'pending', hold:0, gap:null};
        if(now - touchScroll.last < T.MOVING_MS || !a || !inside(a, e.clientX, e.clientY)){
          g.mode = 'native'; lastTap = null; disarm(); return;
        }
        if(armedUntil && now < armedUntil){ g.mode = 'armed'; lastTap = null; return; }
        if(lastTap && now - lastTap.t < T.FOLLOW_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < T.NEAR){
          g.mode = 'second'; g.gap = now - lastTap.t; lastTap = null; arm(); return;
        }
        g.hold = setTimeout(arm, T.HOLD_MS);
      }, true);
      gd.addEventListener('pointermove', e => {
        if(!g || e.pointerId !== g.id) return;
        decide(e.clientX, e.clientY, performance.now());
        if(g.mode === 'pan'){
          if(!raf) raf = requestAnimationFrame(applyPan);
        }else if(g.mode === 'zoom'){
          const a = g.a;
          g.zx1 = clamp(g.x, a.left, a.left + a.w); g.zy1 = clamp(g.y, a.top, a.top + a.h);
          g.zmode = zoomMode(g.zx1 - g.zx0, g.zy1 - g.zy0);
          drawBox();
        }
      }, true);
      gd.addEventListener('pointerup', e => {
        if(!g || e.pointerId !== g.id) return;
        const now = performance.now(), dt = now - g.t0, mode = g.mode, gap = g.gap, x0 = g.x0, y0 = g.y0;
        if(mode === 'pan'){ if(raf){ cancelAnimationFrame(raf); applyPan(); } }
        else if(mode === 'zoom') applyZoom();
        end();
        if(mode === 'pan' || mode === 'zoom'){ clearHover(gd); return; }
        if(mode === 'second' && dt < T.TAP_MS){ if(gap < T.QUICK_MS) fitAll(); else armWindow(); }
        else if(mode === 'pending' && dt < T.TAP_MS){ lastTap = {t:now, x:x0, y:y0}; showTapValue(x0, y0); }
      }, true);
      gd.addEventListener('pointercancel', e => { if(g && e.pointerId === g.id) end(); }, true);
    }

    gds.forEach(gd => {
      if(gd._piInstalled) return;
      gd._piInstalled = true;
      if(opts.mousePan) setupMousePan(gd);
      if(opts.wheel) setupWheelPan(gd);
      if(opts.touch) setupTouch(gd);
    });
    renderButtons();

    return {
      setFitView(gd, view){ gd._piFitView = {x:view.x.slice(), y:view.y.slice()}; },
      fitPlot, fitAll,
      refresh(){ renderButtons(); },
      syncLegend
    };
  }

  global.PlotInteractions = {install, emptiestCorner, overlayLegend, withAlpha, clearHover, constants:T};
})(window);
