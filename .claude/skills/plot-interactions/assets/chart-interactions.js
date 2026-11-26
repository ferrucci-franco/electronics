/* chart-interactions.js — mouse, trackpad and touch behaviour for Chart.js plots, as in the Plotly apps of
 * ferrucci-lab.com (skill plot-interactions), without chartjs-plugin-zoom or Hammer:
 *
 *   mouse      left drag = zoom (x band, y band or window, by the direction of the drag); right or middle
 *              drag = pan every axis; wheel = page scroll, never zoom (unless the app sets wheelZoom); double-click = every visible plot
 *              back to its initial view
 *   trackpad   two-finger swipe that starts sideways = pan (latched 800 ms); vertical = page scroll
 *   finger     fast and mostly vertical = native page scroll; slower = pan; held still then moved = zoom
 *              (x, y or window by direction); tap = tooltip; quick double tap = every plot to its initial
 *              view; slow double tap = the next drag within 4 s draws the zoom window (hint shown);
 *              two fingers = pinch (each axis scales by the fingers' spread along it)
 *   buttons    Fit X / Fit Y / Fit all, semi-transparent, top-right of each plot
 * The touch rules and their thresholds are those of plot-interactions.js (Plotly apps): keep them the same.
 *
 *   const ci = ChartInteractions.attach(canvas, {
 *     getChart: () => charts.acqChart,          // the chart may be destroyed and rebuilt on the same canvas
 *     texts: () => ({fitX, fitY, fitAll, zoomHint}),   // in the current language
 *     onViewChange: chart => {},                // after any change of view (linked x axes)
 *     all: () => [chart, ...],                  // charts reset together by a double-click
 *     wheelZoom: true                           // optional: the wheel zooms around the pointer (default: never)
 *   });
 *   ci.sync();      // after the chart is created or destroyed: remembers its initial view, shows the buttons
 *   ci.refresh();   // after a language change
 *
 * "Initial view" is what the app put in options.scales[id].min/max when it built the chart (undefined = autoscale).
 * chart.resetZoom() is defined on every synced chart and returns to it.
 */
(function(global){
  'use strict';
  const ICONS = {
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/></svg>',
    y:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4"/></svg>',
    all:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  const CSS = `
.ci-fit-btns{position:absolute; top:6px; right:8px; z-index:5; display:flex; gap:4px}
.ci-fit-btns[hidden]{display:none}
.ci-fit-btns button{width:28px; height:28px; padding:4px; border-radius:7px; border:1px solid var(--border2,#d7e2f4); background:var(--card,#eef4ff);
  color:var(--text,#0f1222); opacity:.5; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:opacity .15s}
.ci-fit-btns button:focus-visible{opacity:1}
.ci-fit-btns svg{width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round}
@media (hover:hover){ .ci-fit-btns button:hover{opacity:1} }
@media (pointer:coarse){
  .ci-fit-btns{gap:6px}
  .ci-fit-btns button{width:36px; height:36px; border-radius:10px}
  .ci-fit-btns svg{width:20px; height:20px}
}
.ci-zoom-sel{position:fixed; display:none; pointer-events:none; z-index:40; box-sizing:border-box;
  background:color-mix(in srgb, var(--accent,#2f6fde) 16%, transparent); border-left:2px solid var(--accent,#2f6fde); border-right:2px solid var(--accent,#2f6fde)}
.ci-zoom-sel.is-y{border:none; border-top:2px solid var(--accent,#2f6fde); border-bottom:2px solid var(--accent,#2f6fde)}
.ci-zoom-sel.is-xy{border:2px solid var(--accent,#2f6fde)}
canvas.ci-canvas{touch-action:manipulation; -webkit-user-select:none; user-select:none; -webkit-touch-callout:none}
.ci-touch-ring{position:fixed; display:none; pointer-events:none; z-index:41; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%;
  border:2px solid var(--accent,#2f6fde); background:color-mix(in srgb, var(--accent,#2f6fde) 14%, transparent)}
.ci-zoom-hint{position:fixed; display:none; pointer-events:none; z-index:42; transform:translate(-50%, -100%); max-width:min(90vw, 360px);
  padding:6px 12px; border-radius:12px; border:1px solid var(--accent,#2f6fde); background:color-mix(in srgb, var(--card,#fff) 92%, transparent);
  color:var(--text,#0f1222); font-size:13px; line-height:1.3; text-align:center; box-shadow:0 4px 16px rgba(0,0,0,.18)}
body.ci-panning, body.ci-panning *{cursor:grabbing !important}
`;
  const MINDRAG = 8, MINZOOM = 20;     // zoom direction thresholds, as Plotly's zoom box
  const T = {                          // touch, as in plot-interactions.js
    SLOP:8,          // px a finger may wander before a touch is a drag
    HOLD_MS:350,     // still this long: zoom armed (ring under the finger)
    FAST:0.6,        // px/ms over the first SLOP px: faster and mostly vertical = page scroll
    MOVING_MS:150,   // a scroll event this recent: the page is still moving, any drag scrolls it
    TAP_MS:350,      // longest tap
    FOLLOW_MS:700,   // a second touch this soon after a tap belongs to it...
    NEAR:60,         // ...if it lands this close
    QUICK_MS:300,    // two taps closer than this: quick double tap (fit)
    ARMED_MS:4000,   // after a slow double tap, how long the plot waits for the drag
    MINDRAG:14, MINZOOM:36,
    PINCH_MIN:24, PINCH_MAX:50,
    WHEEL_LATCH_MS:800
  };
  const touchScroll = {last:0};
  document.addEventListener('scroll', () => { touchScroll.last = performance.now(); }, true);
  const FIT_MARGIN = 0.08;
  let sel = null;

  function ensureGlobals(){
    const d = document;
    if(!d.getElementById('ci-style')){ const st = d.createElement('style'); st.id = 'ci-style'; st.textContent = CSS; d.head.appendChild(st); }
    if(!sel){ sel = d.createElement('div'); sel.className = 'ci-zoom-sel'; d.body.appendChild(sel); }
  }
  const scalesOf = chart => Object.values(chart.scales || {});
  const optOf = (chart, id) => chart.options.scales[id];
  function setRange(chart, id, min, max){ const o = optOf(chart, id); if(o){ o.min = min; o.max = max; } }
  function freeze(chart, sc){ setRange(chart, sc.id, sc.min, sc.max); }
  function zoomKind(ax, ay, minDrag, minZoom){
    minDrag = minDrag || MINDRAG; minZoom = minZoom || MINZOOM;
    if(ax < minDrag && ay < minDrag) return null;
    if(ay < Math.min(Math.max(ax * 0.6, minDrag), minZoom)) return 'x';
    if(ax < Math.min(Math.max(ay * 0.6, minDrag), minZoom)) return 'y';
    return 'xy';
  }
  const snapshot = chart => scalesOf(chart).map(s => ({id:s.id, min:s.min, max:s.max, horizontal:s.isHorizontal()}));
  function clearTooltip(chart){
    try{
      chart.setActiveElements([]);
      if(chart.tooltip) chart.tooltip.setActiveElements([], {x:0, y:0});
    }catch(_){}
  }

  function attach(canvas, opts){
    ensureGlobals();
    opts = opts || {};
    const getChart = opts.getChart;
    const changed = chart => { if(opts.onViewChange) opts.onViewChange(chart); };
    canvas.classList.add('ci-canvas');
    const cell = canvas.parentElement;
    if(getComputedStyle(cell).position === 'static') cell.style.position = 'relative';

    // ---------- views ----------
    function resetScales(chart, horizontal){
      const init = chart.$ciInit || {};
      for(const sc of scalesOf(chart)){
        if(horizontal !== undefined && sc.isHorizontal() !== horizontal) continue;
        const v = init[sc.id] || {};
        setRange(chart, sc.id, v.min, v.max);
      }
    }
    function reset(chart){ resetScales(chart); clearTooltip(chart); chart.update('none'); }
    function fitX(chart){ resetScales(chart, true); chart.update('none'); changed(chart); }
    function fitAll(chart){ reset(chart); changed(chart); }
    function fitY(chart){
      for(const sc of scalesOf(chart)){
        if(sc.isHorizontal()) continue;
        let lo = Infinity, hi = -Infinity;
        chart.data.datasets.forEach((ds, i) => {
          if(!chart.isDatasetVisible(i)) return;
          const meta = chart.getDatasetMeta(i);
          if(meta.yAxisID !== sc.id) return;
          const xs = chart.scales[meta.xAxisID], pts = meta._parsed || [];
          for(let k = 0; k < pts.length; k++){
            const p = pts[k];
            if(!p || !isFinite(p.y) || !isFinite(p.x)) continue;
            if(xs && (p.x < xs.min || p.x > xs.max)) continue;
            if(p.y < lo) lo = p.y;
            if(p.y > hi) hi = p.y;
          }
        });
        if(lo > hi){ const v = (chart.$ciInit || {})[sc.id] || {}; setRange(chart, sc.id, v.min, v.max); continue; }
        let span = hi - lo;
        if(span <= 0) span = Math.abs(hi) > 0 ? Math.abs(hi) * 0.2 : 1;
        const m = span * FIT_MARGIN;
        setRange(chart, sc.id, lo - m, hi + m);
      }
      chart.update('none');
      changed(chart);
    }

    const texts = () => Object.assign({fitX:'Fit X', fitY:'Fit Y', fitAll:'Fit all',
      zoomHint:'Drag sideways to zoom on X, up or down to zoom on Y, diagonally for a window'}, typeof opts.texts === 'function' ? opts.texts() : opts.texts);
    // ---------- buttons ----------
    const box = document.createElement('div');
    box.className = 'ci-fit-btns'; box.hidden = true;
    const btns = {};
    [['x', 'fitX', fitX], ['y', 'fitY', fitY], ['all', 'fitAll', fitAll]].forEach(([icon, key, fn]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.innerHTML = ICONS[icon];
      b.addEventListener('click', () => { const ch = getChart(); if(ch){ fn(ch); clearTooltip(ch); } b.blur(); });
      box.appendChild(b); btns[key] = b;
    });
    cell.appendChild(box);
    function refresh(){
      const tx = texts();
      for(const k in btns){ btns[k].title = tx[k]; btns[k].setAttribute('aria-label', tx[k]); }
    }
    function sync(){
      const chart = getChart();
      box.hidden = !chart;
      if(!chart) return;
      const init = {};
      for(const sc of scalesOf(chart)){ const o = optOf(chart, sc.id); if(o) init[sc.id] = {min:o.min, max:o.max}; }
      chart.$ciInit = init;
      chart.resetZoom = () => { reset(chart); changed(chart); };
    }
    refresh();

    // ---------- mouse: zoom box (left), pan (right / middle) ----------
    let drag = null, raf = 0;
    const local = e => { const r = canvas.getBoundingClientRect(); return {x:e.clientX - r.left, y:e.clientY - r.top, r}; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function frame(){
      raf = 0;
      if(!drag) return;
      const chart = drag.chart, a = drag.area;
      const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
      if(drag.mode === 'pan'){
        panBy(chart, drag.scales, a, dx, dy);
        return;
      }
      const kind = zoomKind(Math.abs(dx), Math.abs(dy));
      if(!kind){ sel.style.display = 'none'; return; }
      const x1 = clamp(drag.x, a.left, a.right), y1 = clamp(drag.y, a.top, a.bottom);
      const L = kind === 'y' ? a.left : Math.min(drag.x0, x1), R = kind === 'y' ? a.right : Math.max(drag.x0, x1);
      const T = kind === 'x' ? a.top : Math.min(drag.y0, y1), B = kind === 'x' ? a.bottom : Math.max(drag.y0, y1);
      sel.className = 'ci-zoom-sel' + (kind === 'y' ? ' is-y' : kind === 'xy' ? ' is-xy' : '');
      sel.style.left = (drag.r.left + L) + 'px'; sel.style.top = (drag.r.top + T) + 'px';
      sel.style.width = (R - L) + 'px'; sel.style.height = (B - T) + 'px';
      sel.style.display = 'block';
      drag.box = {kind, L, R, T, B};
    }
    canvas.addEventListener('pointerdown', e => {
      if(e.pointerType === 'touch' || e.pointerType === 'pen' || drag) return;
      const chart = getChart();
      if(!chart || !chart.chartArea) return;
      const p = local(e), a = chart.chartArea;
      const inside = p.x >= a.left && p.x <= a.right && p.y >= a.top && p.y <= a.bottom;
      let mode = null;
      if(e.button === 0 && inside && !e.ctrlKey) mode = 'zoom';
      else if(e.button === 1 || e.button === 2 || (e.button === 0 && e.ctrlKey && inside)) mode = 'pan';
      if(!mode) return;
      if(mode === 'pan'){ e.preventDefault(); document.body.classList.add('ci-panning'); }
      drag = {mode, chart, area:a, r:p.r, x0:p.x, y0:p.y, x:p.x, y:p.y, id:e.pointerId, box:null,
        scales:snapshot(chart)};
      try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
    });
    canvas.addEventListener('pointermove', e => {
      if(!drag || e.pointerId !== drag.id) return;
      const p = local(e);
      drag.x = p.x; drag.y = p.y; drag.r = p.r;
      if(!raf) raf = requestAnimationFrame(frame);
    });
    function end(e){
      if(!drag || (e && e.pointerId !== drag.id)) return;
      if(raf){ cancelAnimationFrame(raf); frame(); }
      const d = drag; drag = null;
      sel.style.display = 'none';
      document.body.classList.remove('ci-panning');
      try{ canvas.releasePointerCapture(d.id); }catch(_){}
      if(d.mode !== 'zoom' || !d.box || (e && e.type === 'pointercancel')) return;
      if(d.chart !== getChart()) return;
      applyBox(d.chart, d.box);
    }
    // box in canvas pixels; the axis an x-only (y-only) zoom leaves alone is frozen where it is
    function applyBox(chart, b){
      for(const sc of scalesOf(chart)){
        const h = sc.isHorizontal();
        if((h && b.kind === 'y') || (!h && b.kind === 'x')){ freeze(chart, sc); continue; }
        const v1 = sc.getValueForPixel(h ? b.L : b.T), v2 = sc.getValueForPixel(h ? b.R : b.B);
        if(isFinite(v1) && isFinite(v2) && v1 !== v2) setRange(chart, sc.id, Math.min(v1, v2), Math.max(v1, v2));
      }
      chart.update('none');
      changed(chart);
    }
    function panBy(chart, scales, area, dx, dy){
      for(const s of scales){
        const span = s.max - s.min;
        const d = s.horizontal ? -dx * span / area.width : dy * span / area.height;
        setRange(chart, s.id, s.min + d, s.max + d);
      }
      chart.update('none');
      changed(chart);
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('auxclick', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => { if(e.button === 1) e.preventDefault(); });   // no middle-click autoscroll

    function resetAll(){
      const list = (opts.all ? opts.all() : [getChart()]).filter(ch => ch && ch.canvas && ch.canvas.offsetParent !== null && ch.resetZoom);
      list.forEach(ch => ch.resetZoom());
    }
    canvas.addEventListener('dblclick', resetAll);

    // ---------- trackpad: a two-finger swipe that starts sideways pans; the wheel stays a page scroll ----------
    (function(){
      let base = null, endTimer = 0, wraf = 0, pdx = 0, pdy = 0;
      const unit = e => e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? (canvas.clientHeight || 800) : 1;
      function flush(){
        wraf = 0;
        if(!base || base.chart !== getChart()) return;
        base.dx -= pdx; base.dy -= pdy; pdx = 0; pdy = 0;
        panBy(base.chart, base.scales, base.area, base.dx, base.dy);
      }
      // opts.wheelZoom: the wheel zooms every axis in or out around the pointer (an app's own choice; off by
      // default, where the wheel never zooms and stays a page scroll)
      let zacc = 0, zpt = null, zraf = 0;
      function zoomFlush(){
        zraf = 0;
        const chart = getChart(), p = zpt, f = Math.exp(zacc * 0.0015);
        zacc = 0;
        if(!chart || !chart.chartArea || !p) return;
        for(const sc of scalesOf(chart)){
          const v = sc.getValueForPixel(sc.isHorizontal() ? p.x : p.y);
          if(!isFinite(v)) continue;
          setRange(chart, sc.id, v - (v - sc.min) * f, v + (sc.max - v) * f);
        }
        clearTooltip(chart);
        chart.update('none');
        changed(chart);
      }
      canvas.addEventListener('wheel', e => {
        if(!base){
          if(opts.wheelZoom && !e.ctrlKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)){
            const chart = getChart(), p = local(e), a = chart && chart.chartArea;
            if(!a || p.x < a.left || p.x > a.right || p.y < a.top || p.y > a.bottom) return;
            e.preventDefault();
            zacc += Math.max(-400, Math.min(400, e.deltaY * unit(e))); zpt = p;
            if(!zraf) zraf = requestAnimationFrame(zoomFlush);
            return;
          }
          if(e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   // mouse wheel, vertical swipe, pinch
          const chart = getChart();
          if(!chart || !chart.chartArea) return;
          base = {chart, area:chart.chartArea, scales:snapshot(chart), dx:0, dy:0};
        }
        clearTimeout(endTimer);
        endTimer = setTimeout(() => { base = null; pdx = 0; pdy = 0; }, T.WHEEL_LATCH_MS);
        e.preventDefault();
        pdx += e.deltaX * unit(e); pdy += e.deltaY * unit(e);
        if(!wraf) wraf = requestAnimationFrame(flush);
      }, {passive:false});
    })();

    // ---------- touch (same rules as plot-interactions.js) ----------
    (function(){
      const BLOCKING = {pan:1, zoom:1, armed:1, second:1};
      const ring = document.createElement('div'); ring.className = 'ci-touch-ring'; document.body.appendChild(ring);
      const hint = document.createElement('div'); hint.className = 'ci-zoom-hint'; document.body.appendChild(hint);
      let g = null, lastTap = null, traf = 0, armedUntil = 0, armedTimer = 0;
      let pinch = null, pinchRaf = 0, twoFingers = false, lastTouchEnd = -Infinity;
      const isTouch = e => e.pointerType === 'touch' || e.pointerType === 'pen';
      // plotting area in client coordinates
      function plotArea(){
        const chart = getChart();
        if(!chart || !chart.chartArea) return null;
        const r = canvas.getBoundingClientRect(), a = chart.chartArea;
        return {chart, area:a, r, left:r.left + a.left, top:r.top + a.top, w:a.width, h:a.height};
      }
      const inside = (a, x, y) => x >= a.left && x <= a.left + a.w && y >= a.top && y <= a.top + a.h;
      const hideRing = () => { ring.style.display = 'none'; };
      function arm(){
        if(!g) return;
        if(g.mode === 'pending') g.mode = 'armed';
        Object.assign(ring.style, {display:'block', left:g.x + 'px', top:g.y + 'px'});
        if(g.a){ clearTooltip(g.a.chart); g.a.chart.draw(); }
      }
      function disarm(){ armedUntil = 0; clearTimeout(armedTimer); armedTimer = 0; hint.style.display = 'none'; }
      function armWindow(){
        const a = plotArea();
        if(!a) return;
        disarm(); clearTooltip(a.chart); a.chart.draw();
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
        sel.className = 'ci-zoom-sel' + (z.zmode === 'y' ? ' is-y' : z.zmode === 'xy' ? ' is-xy' : '');
        Object.assign(sel.style, {display:'block', left:x0 + 'px', top:y0 + 'px', width:(x1 - x0) + 'px', height:(y1 - y0) + 'px'});
        z.box = {kind:z.zmode, L:x0 - a.r.left, R:x1 - a.r.left, T:y0 - a.r.top, B:y1 - a.r.top};
      }
      function applyPan(){
        traf = 0;
        if(!g || g.mode !== 'pan' || g.a.chart !== getChart()) return;
        panBy(g.a.chart, g.scales, g.a.area, g.x - g.x0, g.y - g.y0);
      }
      function startPan(){ g.mode = 'pan'; g.scales = snapshot(g.a.chart); clearTooltip(g.a.chart); }
      function startZoom(){
        hideRing(); disarm();
        g.mode = 'zoom';
        g.zx0 = clamp(g.x0, g.a.left, g.a.left + g.a.w); g.zy0 = clamp(g.y0, g.a.top, g.a.top + g.a.h);
        clearTooltip(g.a.chart);
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
        if(g) clearTimeout(g.hold);
        g = null; hideRing(); sel.style.display = 'none';
      }
      // pinch: each axis scales by the fingers' spread along it; the values under them stay under them
      const pinchPoints = e => Array.from(e.touches).filter(t => t.target === canvas).slice(0, 2).map(t => ({x:t.clientX, y:t.clientY}));
      function pinchStart(pts){
        const a = plotArea();
        if(!a) return;
        if(g) end();
        disarm(); lastTap = null;
        pinch = {pts, a, scales:snapshot(a.chart), now:pts};
        clearTooltip(a.chart);
      }
      function pinchFrame(){
        pinchRaf = 0;
        if(!pinch || pinch.a.chart !== getChart()) return;
        const p = pinch, a = p.a, pts = p.now;
        for(const s of p.scales){
          const k = s.horizontal ? 'x' : 'y';
          const from = Math.abs(p.pts[0][k] - p.pts[1][k]), to = Math.abs(pts[0][k] - pts[1][k]);
          const f = (from < T.PINCH_MIN || to < T.PINCH_MIN) ? 1 : clamp(to / from, 1 / T.PINCH_MAX, T.PINCH_MAX);
          const c0 = (p.pts[0][k] + p.pts[1][k]) / 2, c = (pts[0][k] + pts[1][k]) / 2;
          const frac0 = s.horizontal ? (c0 - a.left) / a.w : 1 - (c0 - a.top) / a.h;
          const frac = s.horizontal ? (c - a.left) / a.w : 1 - (c - a.top) / a.h;
          const span0 = s.max - s.min, span = span0 / f, anchor = s.min + frac0 * span0;
          setRange(a.chart, s.id, anchor - frac * span, anchor - frac * span + span);
        }
        a.chart.update('none');
        changed(a.chart);
      }
      function pinchEnd(){
        if(pinchRaf){ cancelAnimationFrame(pinchRaf); pinchFrame(); }
        pinch = null;
      }
      // Chart.js's own touch handling (tooltip following the finger) never sees a finger; a tap still shows
      // its tooltip through the emulated mouse events, because touchstart is not cancelled
      canvas.addEventListener('touchstart', e => {
        e.stopImmediatePropagation();
        if(e.touches.length >= 2){
          twoFingers = true;
          const pts = pinchPoints(e);
          if(pts.length === 2 && !pinch && !(g && g.mode === 'native')) pinchStart(pts);
        }
      }, {capture:true, passive:true});
      canvas.addEventListener('touchmove', e => {
        e.stopImmediatePropagation();
        const pts = pinchPoints(e);
        if(pts.length === 2 && e.cancelable){
          if(!pinch) pinchStart(pts);
          if(pinch){ e.preventDefault(); pinch.now = pts; if(!pinchRaf) pinchRaf = requestAnimationFrame(pinchFrame); }
          return;
        }
        if(pinch){ if(e.cancelable) e.preventDefault(); return; }
        if(g && e.touches.length === 1) decide(e.touches[0].clientX, e.touches[0].clientY, performance.now());
        if(g && BLOCKING[g.mode] && e.cancelable) e.preventDefault();
      }, {capture:true, passive:false});
      const touchDone = e => {
        e.stopImmediatePropagation();
        if(pinch && e.touches.length < 2) pinchEnd();
        if(e.touches.length === 0){ twoFingers = false; lastTouchEnd = performance.now(); }
      };
      canvas.addEventListener('touchend', touchDone, {capture:true});
      canvas.addEventListener('touchcancel', touchDone, {capture:true});
      // a tap's emulated mouse events can end with a mouseout, which would remove the tooltip the tap just showed
      canvas.addEventListener('mouseout', e => { if(performance.now() - lastTouchEnd < 700) e.stopImmediatePropagation(); }, true);

      canvas.addEventListener('pointerdown', e => {
        if(!isTouch(e)) return;
        if(g || pinch || twoFingers){ end(); return; }
        const now = performance.now(), a = plotArea();
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
      canvas.addEventListener('pointermove', e => {
        if(!g || e.pointerId !== g.id) return;
        decide(e.clientX, e.clientY, performance.now());
        if(g.mode === 'pan'){
          if(!traf) traf = requestAnimationFrame(applyPan);
        }else if(g.mode === 'zoom'){
          const a = g.a;
          g.zx1 = clamp(g.x, a.left, a.left + a.w); g.zy1 = clamp(g.y, a.top, a.top + a.h);
          g.zmode = zoomKind(Math.abs(g.zx1 - g.zx0), Math.abs(g.zy1 - g.zy0), T.MINDRAG, T.MINZOOM);
          drawBox();
        }
      }, true);
      canvas.addEventListener('pointerup', e => {
        if(!g || e.pointerId !== g.id) return;
        const now = performance.now(), dt = now - g.t0, mode = g.mode, gap = g.gap, x0 = g.x0, y0 = g.y0, z = g;
        if(mode === 'pan'){ if(traf){ cancelAnimationFrame(traf); applyPan(); } }
        else if(mode === 'zoom' && z.zmode && z.box && z.a.chart === getChart()) applyBox(z.a.chart, z.box);
        end();
        if(mode === 'pan' || mode === 'zoom'){ lastTouchEnd = -Infinity; swallowMouse = now; return; }
        if(mode === 'second' && dt < T.TAP_MS){ swallowMouse = now; if(gap < T.QUICK_MS) resetAll(); else armWindow(); }
        else if(mode === 'pending' && dt < T.TAP_MS) lastTap = {t:now, x:x0, y:y0};
      }, true);
      canvas.addEventListener('pointercancel', e => { if(g && e.pointerId === g.id) end(); }, true);
      // after a gesture (not a plain tap) the emulated mouse events must not bring a tooltip back
      let swallowMouse = -Infinity;
      ['mousemove', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach(type => canvas.addEventListener(type, e => {
        if(performance.now() - swallowMouse < 500) e.stopImmediatePropagation();
      }, true));
    })();

    return {sync, refresh, reset:() => { const ch = getChart(); if(ch) ch.resetZoom(); }};
  }

  global.ChartInteractions = {attach};
})(window);
