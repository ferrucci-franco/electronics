#!/usr/bin/env node
// Browser check of the touch and mouse conventions on a Chart.js plot driven by assets/chart-interactions.js
// (Playwright + Chromium). The Plotly apps use check-plot-interactions.js instead.
//
//   node check-chart-interactions.js <url> <canvasId>
//   SETUP_JS=fill.js WHEEL_ZOOM=1 node check-chart-interactions.js http://127.0.0.1:8765/pendulum/ acqChart
//
// WHEEL_ZOOM=1: the app attached its plots with wheelZoom:true (pendulum/), so the wheel is expected to zoom.
//
// SETUP_JS (optional): a file whose JavaScript runs in the page after load, to show the plot and put data on
// it (open its tab, run a simulation…); it may return a promise. The plot needs a first dataset with points.
// Runs on an emulated iPhone 13 (CDP touch events, which also drive native scrolling), then with a mouse on
// a 1400 px desktop. Exit code = number of failures. The scroll check is skipped when nothing can scroll.
const { chromium, devices } = require('playwright');
const [url, ID] = process.argv.slice(2);
if(!url || !ID){ console.error('usage: node check-chart-interactions.js <url> <canvasId>'); process.exit(2); }
const SETUP = process.env.SETUP_JS ? require('fs').readFileSync(process.env.SETUP_JS, 'utf8') : null;
let fails = 0;
const check = (name, ok, extra = '') => { if(ok === null){ console.log('SKIP ' + name + '  ' + extra); return; } if(!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + '  ' + extra); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function open(browser, opts){
  const ctx = await browser.newContext(opts);
  await ctx.route(/gc\.zgo\.at|goatcounter|fonts\.g/, r => r.abort());
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.Chart && window.ChartInteractions, null, { timeout: 20000 });
  if(SETUP){ await page.evaluate(`(async () => { ${SETUP} })()`); }
  await page.waitForFunction(id => { const c = Chart.getChart(id); return c && c.chartArea && c.canvas.offsetParent !== null; }, ID, { timeout: 20000 });
  await page.waitForTimeout(400);
  return { page, errors, ctx };
}
const helpers = page => ({
  wait: ms => page.waitForTimeout(ms),
  view: () => page.evaluate(id => { const c = Chart.getChart(id); return [c.scales.x.min, c.scales.x.max, c.scales.y.min, c.scales.y.max].map(v => +v.toPrecision(6)); }, ID),
  centre: () => page.evaluate(id => { const c = Chart.getChart(id), r = c.canvas.getBoundingClientRect(), a = c.chartArea; return { x: r.left + (a.left + a.right) / 2, y: r.top + (a.top + a.bottom) / 2, w: a.width, h: a.height }; }, ID),
  reset: async () => { await page.evaluate(id => Chart.getChart(id).resetZoom(), ID); await page.waitForTimeout(120); },
  // the nearest ancestor that really scrolls (or the page), with the plot brought to the middle of the screen
  bring: () => page.evaluate(id => { const el = Chart.getChart(id).canvas; el.scrollIntoView({ block: 'center' }); }, ID),
  scrollPos: () => page.evaluate(id => { let e = Chart.getChart(id).canvas.parentElement; while(e && e !== document.body){ if(e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)) return e.scrollTop; e = e.parentElement; } return document.scrollingElement.scrollHeight > innerHeight + 20 ? scrollY : null; }, ID),
});

(async () => {
  const browser = await chromium.launch();

  // ================= phone =================
  {
    const { page, errors, ctx } = await open(browser, { ...devices['iPhone 13'] });
    const { wait, view, centre, reset, bring, scrollPos } = helpers(page);
    const cdp = await ctx.newCDPSession(page);
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const drag = async (x, y, sx, sy, n, dt, hold = 0) => { await T('touchStart', [{ x, y }]); if(hold) await wait(hold);
      for(let i = 1; i <= n; i++){ await wait(dt); await T('touchMove', [{ x: x + sx * i, y: y + sy * i }]); } await T('touchEnd', []); await wait(150); };
    const tap = async (x, y) => { await T('touchStart', [{ x, y }]); await wait(60); await T('touchEnd', []); };
    await bring(); await wait(400); await reset();
    let c = await centre(); const v0 = await view(); const xs = v0[1] - v0[0], ys = v0[3] - v0[2];
    let v;

    await drag(c.x, c.y, -6, 0, 12, 30); v = await view();
    check('phone: slow sideways drag pans x', v[0] > v0[0] && Math.abs((v[1] - v[0]) - xs) < xs * 1e-4, JSON.stringify(v)); await reset();
    await drag(c.x, c.y, 0, 4, 12, 40); v = await view();
    check('phone: slow vertical drag pans y', v[2] > v0[2] && same(v.slice(0, 2), v0.slice(0, 2)), JSON.stringify(v)); await reset();

    const s0 = await scrollPos();
    if(s0 === null) check('phone: fast flick scrolls the page', null, 'nothing scrolls here');
    else{
      const dir = s0 > 30 ? 1 : -1;     // flick toward the side with room to scroll
      await drag(c.x, c.y - 40 * dir, 0, 30 * dir, 5, 8); await wait(500);
      const s1 = await scrollPos(); v = await view();
      check('phone: fast flick scrolls the page, view unchanged', s1 !== s0 && same(v, v0), `scroll ${s0} -> ${s1}`);
      await bring(); await wait(500); c = await centre();
    }

    await T('touchStart', [{ x: c.x - 60, y: c.y }]); await wait(450);
    const ring = await page.evaluate(() => [...document.querySelectorAll('.ci-touch-ring')].some(r => getComputedStyle(r).display === 'block'));
    for(let i = 1; i <= 10; i++){ await wait(20); await T('touchMove', [{ x: c.x - 60 + 12 * i, y: c.y }]); } await T('touchEnd', []); await wait(150);
    v = await view(); check('phone: hold then drag zooms x only (ring shown)', ring && (v[1] - v[0]) < xs * 0.7 && same(v.slice(2), v0.slice(2)), JSON.stringify(v));

    await tap(c.x, c.y); await wait(120); await tap(c.x, c.y); await wait(300); v = await view();
    check('phone: quick double tap resets', same(v, v0), JSON.stringify(v));

    await wait(800); await tap(c.x, c.y); await wait(420); await tap(c.x, c.y); await wait(200);
    const hint = await page.evaluate(() => [...document.querySelectorAll('.ci-zoom-hint')].some(h => getComputedStyle(h).display === 'block'));
    await drag(c.x - 60, c.y - 60, 12, 12, 10, 20); v = await view();
    check('phone: slow double tap arms the zoom window (hint shown)', hint && (v[1] - v[0]) < xs * 0.7 && (v[3] - v[2]) < ys * 0.7, JSON.stringify(v)); await reset(); await wait(800);

    await tap(c.x, c.y); await wait(250); await drag(c.x, c.y - 50, 0, 10, 10, 20); v = await view();
    check('phone: tap then drag zooms y only', (v[3] - v[2]) < ys * 0.7 && same(v.slice(0, 2), v0.slice(0, 2)), JSON.stringify(v)); await reset(); await wait(800);

    await T('touchStart', [{ x: c.x - 40, y: c.y, id: 0 }, { x: c.x + 40, y: c.y, id: 1 }]);
    for(let i = 1; i <= 8; i++){ await wait(20); await T('touchMove', [{ x: c.x - 40 - 8 * i, y: c.y, id: 0 }, { x: c.x + 40 + 8 * i, y: c.y, id: 1 }]); }
    await T('touchEnd', []); await wait(200); v = await view();
    check('phone: pinch zooms x, y kept', (v[1] - v[0]) < xs * 0.6 && Math.abs((v[3] - v[2]) - ys) < ys * 1e-4, JSON.stringify(v)); await reset(); await wait(800);

    const pt = await page.evaluate(id => { const ch = Chart.getChart(id), a = ch.chartArea, r = ch.canvas.getBoundingClientRect();
      const i = ch.data.datasets.findIndex((d, k) => ch.isDatasetVisible(k) && ch.getDatasetMeta(k).data.length);
      if(i < 0) return null;
      const els = ch.getDatasetMeta(i).data.filter(e => e.x > a.left + 20 && e.x < a.right - 20 && e.y > a.top + 20 && e.y < a.bottom - 20);
      const e = els[Math.floor(els.length / 2)]; return e ? { x: r.left + e.x, y: r.top + e.y } : null; }, ID);
    if(!pt) check('phone: tap shows a tooltip that stays', null, 'no point on the plot');
    else{ await tap(pt.x, pt.y); await wait(900);
      const tt = await page.evaluate(id => { const t = Chart.getChart(id).tooltip; return t ? t.opacity : -1; }, ID);
      check('phone: tap shows a tooltip that stays', tt === -1 ? null : tt > 0, 'opacity ' + tt); }

    await drag(c.x, c.y, -6, 0, 12, 30);
    await page.locator(`xpath=//*[@id="${ID}"]/following-sibling::*[contains(@class,"ci-fit-btns")]//button`).nth(2).tap(); await wait(200); v = await view();
    check('phone: Fit all button', same(v, v0), JSON.stringify(v));
    check('phone: no page error', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ================= desktop =================
  {
    const { page, errors, ctx } = await open(browser, { viewport: { width: 1400, height: 850 } });
    const { wait, view, centre, reset, bring } = helpers(page);
    await bring(); await wait(300); await reset();
    const c = await centre(); const v0 = await view(); const xs = v0[1] - v0[0], ys = v0[3] - v0[2];
    const mdrag = async (dx0, dy0, dx1, dy1, button = 'left') => { await page.mouse.move(c.x + dx0, c.y + dy0); await page.mouse.down({ button });
      await page.mouse.move(c.x + dx1, c.y + dy1, { steps: 6 }); await page.mouse.up({ button }); await wait(120); };
    const dx = Math.min(120, c.w / 3), dy = Math.min(80, c.h / 3);
    let v;
    await mdrag(-dx, 0, dx, 2); v = await view(); check('mouse: sideways left drag zooms x only', (v[1] - v[0]) < xs * 0.9 && same(v.slice(2), v0.slice(2)), JSON.stringify(v)); await reset();
    await mdrag(0, -dy, 2, dy); v = await view(); check('mouse: vertical left drag zooms y only', (v[3] - v[2]) < ys * 0.9 && same(v.slice(0, 2), v0.slice(0, 2)), JSON.stringify(v)); await reset();
    await mdrag(-dx, -dy, dx, dy); v = await view(); check('mouse: diagonal left drag zooms a window', (v[1] - v[0]) < xs * 0.9 && (v[3] - v[2]) < ys * 0.9, JSON.stringify(v));
    await mdrag(0, 0, 60, 30, 'right'); const vp = await view(); check('mouse: right drag pans', vp[0] < v[0] && vp[2] > v[2], JSON.stringify(vp));
    await page.mouse.dblclick(c.x, c.y); await wait(150); v = await view(); check('mouse: double-click resets', same(v, v0), JSON.stringify(v));
    await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, -300); await wait(150); v = await view();
    if(process.env.WHEEL_ZOOM){ check('mouse: wheel zooms in around the pointer (app set wheelZoom)', (v[1] - v[0]) < xs * 0.9 && (v[3] - v[2]) < ys * 0.9, JSON.stringify(v)); await reset(); }
    else check('mouse: wheel does not zoom', same(v, v0), JSON.stringify(v));
    const btn = page.locator(`xpath=//*[@id="${ID}"]/following-sibling::*[contains(@class,"ci-fit-btns")]//button`);
    await mdrag(-dx, -dy, dx, dy); await btn.nth(0).click(); await wait(120); v = await view(); check('mouse: Fit X restores x, keeps y', same(v.slice(0, 2), v0.slice(0, 2)) && (v[3] - v[2]) < ys * 0.9, JSON.stringify(v));
    await btn.nth(2).click(); await wait(120); v = await view(); check('mouse: Fit all', same(v, v0), JSON.stringify(v));
    check('desktop: no page error', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `${fails} failure(s)` : 'all checks passed');
  process.exit(fails);
})();
