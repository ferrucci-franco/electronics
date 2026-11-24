/* chart-interactions.js — mouse, trackpad and touch behaviour for Chart.js plots, as in the Plotly apps of
 * ferrucci-lab.com (skill plot-interactions), without chartjs-plugin-zoom or Hammer:
 *
 *   left drag            zoom: x band, y band or window, by the direction of the drag
 *   right / middle drag  pan every axis
 *   wheel                never zooms (the page scrolls)
 *   double-click         every visible plot back to its initial view
 *   two fingers          pinch: each axis scales by the fingers' spread along it; quick double tap = reset
 *   Fit X / Fit Y / Fit all   three semi-transparent buttons in the top-right corner of the plot
 *
 *   const ci = ChartInteractions.attach(canvas, {
 *     getChart: () => charts.acqChart,          // the chart may be destroyed and rebuilt on the same canvas
 *     texts: () => ({fitX, fitY, fitAll}),      // button titles in the current language
 *     onViewChange: chart => {},                // after any change of view (linked x axes)
 *     all: () => [chart, ...]                   // charts reset together by a double-click
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
canvas.ci-canvas{touch-action:pan-x pan-y}
body.ci-panning, body.ci-panning *{cursor:grabbing !important}
`;
  const MINDRAG = 8, MINZOOM = 20;     // zoom direction thresholds, as Plotly's zoom box
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
  function zoomKind(ax, ay){
    if(ax < MINDRAG && ay < MINDRAG) return null;
    if(ay < Math.min(Math.max(ax * 0.6, MINDRAG), MINZOOM)) return 'x';
    if(ax < Math.min(Math.max(ay * 0.6, MINDRAG), MINZOOM)) return 'y';
    return 'xy';
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
    function reset(chart){ resetScales(chart); chart.update('none'); }
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

    // ---------- buttons ----------
    const box = document.createElement('div');
    box.className = 'ci-fit-btns'; box.hidden = true;
    const btns = {};
    [['x', 'fitX', fitX], ['y', 'fitY', fitY], ['all', 'fitAll', fitAll]].forEach(([icon, key, fn]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.innerHTML = ICONS[icon];
      b.addEventListener('click', () => { const ch = getChart(); if(ch) fn(ch); b.blur(); });
      box.appendChild(b); btns[key] = b;
    });
    cell.appendChild(box);
    function refresh(){
      const T = Object.assign({fitX:'Fit X', fitY:'Fit Y', fitAll:'Fit all'}, typeof opts.texts === 'function' ? opts.texts() : opts.texts);
      for(const k in btns){ btns[k].title = T[k]; btns[k].setAttribute('aria-label', T[k]); }
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
        for(const s of drag.scales){
          const span = s.max - s.min;
          const d = s.horizontal ? -dx * span / a.width : dy * span / a.height;
          setRange(chart, s.id, s.min + d, s.max + d);
        }
        chart.update('none');
        changed(chart);
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
      if(e.pointerType === 'touch' || drag) return;
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
        scales:scalesOf(chart).map(s => ({id:s.id, min:s.min, max:s.max, horizontal:s.isHorizontal()}))};
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
      const chart = d.chart, b = d.box;
      if(chart !== getChart()) return;
      for(const sc of scalesOf(chart)){
        const h = sc.isHorizontal();
        if((h && b.kind === 'y') || (!h && b.kind === 'x')){ freeze(chart, sc); continue; }
        const v1 = sc.getValueForPixel(h ? b.L : b.T), v2 = sc.getValueForPixel(h ? b.R : b.B);
        if(isFinite(v1) && isFinite(v2) && v1 !== v2) setRange(chart, sc.id, Math.min(v1, v2), Math.max(v1, v2));
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

    // ---------- touch: two-finger pinch, quick double tap = reset ----------
    let pinch = null, praf = 0, lastTap = null;
    const pts = e => { const r = canvas.getBoundingClientRect(); return [0, 1].map(i => ({x:e.touches[i].clientX - r.left, y:e.touches[i].clientY - r.top})); };
    function pinchFrame(){
      praf = 0;
      if(!pinch) return;
      const chart = pinch.chart, a = pinch.area, [p, q] = pinch.now, [p0, q0] = pinch.start;
      for(const s of pinch.scales){
        const k = s.horizontal ? 'x' : 'y';
        const spread0 = Math.abs(p0[k] - q0[k]), spread = Math.abs(p[k] - q[k]);
        const f = spread0 > 30 && spread > 10 ? spread0 / spread : 1;
        const size = s.horizontal ? a.width : a.height, origin = s.horizontal ? a.left : a.bottom, sign = s.horizontal ? 1 : -1;
        const span0 = s.max - s.min, span = span0 * f;
        const mid0 = sign * ((p0[k] + q0[k]) / 2 - origin) / size, mid = sign * ((p[k] + q[k]) / 2 - origin) / size;
        const v = s.min + mid0 * span0;                  // the value under the fingers stays under them
        setRange(chart, s.id, v - mid * span, v - mid * span + span);
      }
      chart.update('none');
      changed(chart);
    }
    canvas.addEventListener('touchstart', e => {
      const chart = getChart();
      if(!chart || !chart.chartArea) return;
      if(e.touches.length === 2){
        e.preventDefault();
        const start = pts(e);
        pinch = {chart, area:chart.chartArea, start, now:start,
          scales:scalesOf(chart).map(s => ({id:s.id, min:s.min, max:s.max, horizontal:s.isHorizontal()}))};
        lastTap = null;
      }
    }, {passive:false});
    canvas.addEventListener('touchmove', e => {
      if(!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      pinch.now = pts(e);
      if(!praf) praf = requestAnimationFrame(pinchFrame);
    }, {passive:false});
    canvas.addEventListener('touchend', e => {
      if(pinch){ if(e.touches.length < 2) pinch = null; return; }
      if(e.touches.length || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0], now = performance.now();
      if(lastTap && now - lastTap.t < 300 && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 40){ lastTap = null; e.preventDefault(); resetAll(); }
      else lastTap = {t:now, x:t.clientX, y:t.clientY};
    }, {passive:false});
    canvas.addEventListener('touchcancel', () => { pinch = null; });

    return {sync, refresh, reset:() => { const ch = getChart(); if(ch) ch.resetZoom(); }};
  }

  global.ChartInteractions = {attach};
})(window);
