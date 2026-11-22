#!/usr/bin/env node
// Browser check of the plot-interaction conventions on any app page (Playwright + Chromium).
//
//   node check-plot-interactions.js <url> <plotId> [linkedPlotId]
//   PLOTLY_JS=/path/plotly.min.js SETUP_JS=fill.js node check-plot-interactions.js http://127.0.0.1:8765/bode-measure/ bodeMag bodePhase
//
// SETUP_JS (optional): a file whose JavaScript runs in the page after load, e.g. to type measurements so the
// plot has points (the tooltip, Fit Y and legend checks need some; they are skipped on an empty plot).
//
// PLOTLY_JS: a local copy of the Plotly build the page loads from cdn.plot.ly (the cloud container's proxy
// refuses that host): `npm pack plotly.js-dist-min@2.32.0` and point to package/plotly.min.js.
// The page should already have points on <plotId> (a markers trace) for the tooltip check; scroll checks are
// skipped when the page cannot scroll (one-screen desktop layout). Exit code = number of failures.
const { chromium, devices } = require('playwright');
const [url, A, B] = process.argv.slice(2);
if(!url || !A){ console.error('usage: node check-plot-interactions.js <url> <plotId> [linkedPlotId]'); process.exit(2); }
const PLOTLY = process.env.PLOTLY_JS;
const SETUP = process.env.SETUP_JS ? require('fs').readFileSync(process.env.SETUP_JS, 'utf8') : null;
let fails = 0;
const check = (name, ok, extra = '') => { if(ok === null){ console.log('SKIP ' + name + (extra ? '  ' + extra : '')); return; } if(!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

async function open(browser, opts){
  const ctx = await browser.newContext(opts);
  if(PLOTLY) await ctx.route(/cdn\.plot\.ly/, r => r.fulfill({ path: PLOTLY, contentType: 'application/javascript' }));
  await ctx.route(/gc\.zgo\.at/, r => r.fulfill({ status: 204, body: '' }));   // visit counter
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(id => { const el = document.getElementById(id); return window.Plotly && el && el._fullLayout && el._fullLayout.xaxis; }, A, { timeout: 20000 });
  if(SETUP){ await page.evaluate(SETUP); await page.waitForTimeout(400); }
  await page.waitForTimeout(500);
  return { page, errors, ctx };
}
const view = (p, id) => p.$eval('#' + id, el => ({ x: el.layout.xaxis.range.map(v => +(+v).toFixed(3)), y: el.layout.yaxis.range.map(v => +(+v).toFixed(2)) }));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const centre = (p, id) => p.$eval('#' + id, el => { const r = el.getBoundingClientRect(), xa = el._fullLayout.xaxis, ya = el._fullLayout.yaxis;
  return { x: r.left + xa._offset + xa._length / 2, y: r.top + ya._offset + ya._length / 2, top: r.top + 12, w: xa._length, h: ya._length }; });
const bring = (p, id) => p.evaluate(id => { const el = document.getElementById(id); scrollTo(0, el.getBoundingClientRect().top + scrollY - 20); }, id);
const canScroll = p => p.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 50);
const fitBtn = (id, k) => `xpath=//*[@id="${id}"]/ancestor::*[.//button[@data-fit="${k}"]][1]//button[@data-fit="${k}"]`;
const legendBtn = id => `xpath=//*[@id="${id}"]/ancestor::*[.//*[contains(@class,"legend-toggle-btn") or contains(@class,"pi-legend-btn")]][1]//*[contains(@class,"legend-toggle-btn") or contains(@class,"pi-legend-btn")]`;

(async () => {
  const browser = await chromium.launch();

  // ================= phone =================
  const { page, errors, ctx } = await open(browser, { ...devices['iPhone 13'] });
  const cdp = await ctx.newCDPSession(page);   // CDP touch events: they also drive the browser's native scroll
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const wait = ms => page.waitForTimeout(ms);
  const drag = async (x, y, sx, sy, n, dt, hold = 0) => { await T('touchStart', [{ x, y }]); if(hold) await wait(hold);
    for(let i = 1; i <= n; i++){ await wait(dt); await T('touchMove', [{ x: x + sx * i, y: y + sy * i }]); } await T('touchEnd', []); await wait(100); };
  const tap = async (x, y) => { await T('touchStart', [{ x, y }]); await wait(60); await T('touchEnd', []); };
  const fitAll = async () => { await page.locator(fitBtn(A, 'all')).first().tap(); await wait(300); };
  const scrolls = await canScroll(page);
  await bring(page, A); await wait(400);
  let c = await centre(page, A);
  await fitAll();
  const v0 = await view(page, A);

  if(scrolls){
    const s0 = await page.evaluate(() => scrollY);
    await drag(c.x, c.y - 60, 0, 25, 8, 8);
    const sA = await page.evaluate(() => scrollY); await wait(500); const sB = await page.evaluate(() => scrollY);
    check('fast vertical flick scrolls the page natively, with inertia', sA < s0 && sB < sA && same(await view(page, A), v0), `${s0}→${sA}→${sB}`);
    await wait(1200); await bring(page, A); await wait(400); c = await centre(page, A);
  }else check('fast vertical flick scrolls the page', null, 'page does not scroll');
  const s1 = await page.evaluate(() => scrollY);
  await drag(c.x, c.y, 3, 2, 30, 16);
  let v = await view(page, A);
  check('slow drag pans both axes, page still', v.x[0] < v0.x[0] && v.y[0] > v0.y[0] && s1 === await page.evaluate(() => scrollY));
  if(B) check('x pan reaches the linked plot', same(v.x, (await view(page, B)).x));
  const vB0 = B ? null : null;
  await tap(c.x, c.y); await wait(120); await tap(c.x, c.y); await wait(500);
  check('quick double tap: back to the initial view', same(await view(page, A), v0));
  await wait(900);
  await drag(c.x - 60, c.y, 8, 0, 15, 16, 450); v = await view(page, A);
  check('hold, then sideways drag: x zoom only', v.x[1] - v.x[0] < v0.x[1] - v0.x[0] && same(v.y, v0.y)); await fitAll();
  await drag(c.x, c.y - 50, 0, 7, 14, 16, 450); v = await view(page, A);
  check('hold, then vertical drag: y zoom only', v.y[1] - v.y[0] < v0.y[1] - v0.y[0] && same(v.x, v0.x)); await fitAll();
  await drag(c.x - 50, c.y - 40, 7, 6, 14, 16, 450); v = await view(page, A);
  check('hold, then diagonal drag: window zoom', v.x[1] - v.x[0] < v0.x[1] - v0.x[0] && v.y[1] - v.y[0] < v0.y[1] - v0.y[0]); await fitAll();
  await tap(c.x - 60, c.y); await wait(450); await tap(c.x - 60, c.y); await wait(250);
  const hint = await page.evaluate(() => [...document.querySelectorAll('.zoom-hint, .pi-zoom-hint')].some(el => el.style.display === 'block'));
  await wait(1200); await drag(c.x - 80, c.y, 12, 0, 12, 16); v = await view(page, A);
  check('slow double tap: hint, then the next drag zooms', hint && v.x[1] - v.x[0] < v0.x[1] - v0.x[0]); await fitAll();
  await T('touchStart', [{ x: c.x - 30, y: c.y, id: 1 }, { x: c.x + 30, y: c.y, id: 2 }]);
  for(let i = 1; i <= 10; i++){ await wait(16); await T('touchMove', [{ x: c.x - 30 - 6 * i, y: c.y, id: 1 }, { x: c.x + 30 + 6 * i, y: c.y, id: 2 }]); }
  await T('touchEnd', []); await wait(300); v = await view(page, A);
  const span0 = v0.x[1] - v0.x[0], span = v.x[1] - v.x[0];
  check('pinch ×3 sideways: x ×3, y kept, page not zoomed', Math.abs(span - span0 / 3) < 0.02 * span0 && same(v.y, v0.y) && await page.evaluate(() => visualViewport.scale) === 1,
        `x span ${span0.toFixed(3)} → ${span.toFixed(3)}`);
  await fitAll();
  if(scrolls){
    await drag(c.x, c.y - 60, 0, 25, 8, 8); await wait(120);
    const sm = await page.evaluate(() => scrollY), vm = await view(page, A);
    await drag(c.x, c.y, 2, 3, 15, 16);
    check('slow drag while the page still moves: scroll, not pan', (await page.evaluate(() => scrollY)) !== sm && same(await view(page, A), vm));
    await wait(1500); await bring(page, A); await wait(400); c = await centre(page, A);
    const st = await page.evaluate(() => scrollY);
    const up = st > (await page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight)) / 2;   // scroll toward the room there is
    await drag(c.x, c.top, 0, up ? 3 : -3, 20, 16);
    check('drag starting outside the plotting area scrolls', (await page.evaluate(() => scrollY)) !== st);
    await bring(page, A); await wait(400); c = await centre(page, A);
  }
  // tooltip: tap the first measured point
  const pt = await page.$eval('#' + A, el => {
    const t = el._fullData.find(d => d.mode && d.mode.includes('markers') && d.x && d.x.length && d.visible === true);
    if(!t) return null;
    const xa = el._fullLayout.xaxis, ya = el._fullLayout.yaxis, r = el.getBoundingClientRect();
    const i = Math.floor(t.x.length / 2), xv = xa.type === 'log' ? Math.log10(t.x[i]) : t.x[i];
    return { x: r.left + xa._offset + xa.l2p(xv), y: r.top + ya._offset + ya.l2p(t.y[i]) };
  });
  if(pt){ await tap(pt.x, pt.y); await wait(400); check('tap shows the point tooltip (and it stays)', (await page.$eval('#' + A + ' .hoverlayer', el => el.textContent)).length > 0); }
  else check('tap shows the point tooltip', null, 'no markers trace with points');
  const btn = await page.locator(fitBtn(A, 'all')).first().boundingBox();
  check('fit buttons are 36 px on touch', btn && Math.round(btn.width) === 36);
  const lb = page.locator(legendBtn(A)).first();
  if(await lb.count()){
    const hidden0 = await page.$eval('#' + A, el => /legend-collapsed/.test(el.className.baseVal || el.className));
    await lb.tap(); await wait(300);
    const hidden1 = await page.$eval('#' + A, el => /legend-collapsed/.test(el.className.baseVal || el.className));
    check('legend starts hidden on a phone, its button opens it', hidden0 && !hidden1);
  }else check('legend button', null, 'no legend button found');
  await page.evaluate(([id, x]) => Plotly.relayout(id, { 'xaxis.range': x }), [A, [v0.x[0] + 0.55 * span0, v0.x[0] + 0.85 * span0]]); await wait(200);
  await page.locator(fitBtn(A, 'y')).first().tap(); await wait(300); v = await view(page, A);
  if(pt) check('Fit Y fits what is drawn in the x window', v.y[1] - v.y[0] < v0.y[1] - v0.y[0], JSON.stringify(v.y));
  else check('Fit Y fits what is drawn in the x window', null, 'nothing drawn: Fit Y keeps the initial range ' + JSON.stringify(v.y));
  await page.locator(fitBtn(A, 'x')).first().tap(); await wait(300);
  check('Fit X restores x' + (B ? ' on the linked plot too' : ''), same((await view(page, A)).x, v0.x) && (!B || same((await view(page, B)).x, v0.x)));
  check('no page errors (phone)', errors.length === 0, errors.join(' | '));

  // ================= desktop =================
  const d = await open(browser, { viewport: { width: 1400, height: 900 } });
  const p = d.page;
  await bring(p, A); await p.waitForTimeout(300);
  await p.locator(fitBtn(A, 'all')).first().click(); await p.waitForTimeout(300);
  let dc = await centre(p, A); const d0 = await view(p, A);
  await p.mouse.move(dc.x, dc.y); await p.mouse.down({ button: 'right' }); await p.mouse.move(dc.x + 100, dc.y + 40, { steps: 5 }); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(250);
  let a = await view(p, A);
  check('right drag pans' + (B ? ', linked x follows' : ''), a.x[0] < d0.x[0] && (!B || same(a.x, (await view(p, B)).x)));
  const before = await view(p, A);
  await p.mouse.wheel(0, 120); await p.waitForTimeout(300);
  check('mouse wheel never zooms or moves the plot', same(await view(p, A), before));
  await p.mouse.wheel(0, -120); await p.waitForTimeout(300);
  await bring(p, A); await p.waitForTimeout(300); dc = await centre(p, A);
  await p.mouse.move(dc.x, dc.y); const b4 = await view(p, A); await p.mouse.wheel(-80, 0); await p.waitForTimeout(300);
  check('sideways trackpad swipe pans', (await view(p, A)).x[0] !== b4.x[0]);
  await p.waitForTimeout(900);
  await p.mouse.dblclick(dc.x, dc.y); await p.waitForTimeout(500);
  check('double-click: back to the initial view', same(await view(p, A), d0));
  const hov = await p.locator(fitBtn(A, 'all')).first();
  check('fit buttons semi-transparent at rest', Math.abs(+(await hov.evaluate(b => getComputedStyle(b).opacity)) - 0.5) < 0.06);
  check('no page errors (desktop)', d.errors.length === 0, d.errors.join(' | '));

  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close();
  process.exit(fails);
})().catch(e => { console.error(e); process.exit(99); });
