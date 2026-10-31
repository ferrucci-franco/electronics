/* DOM side of the application: palette, header, side panel / bottom sheet, menus and dialogs. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, U = DCS.units, I = DCS.i18n, R = DCS.render;

  const PALETTE = [
    { type: 'resistor', key: 'resistor' }, { type: 'pot', key: 'pot' }, { type: 'vsource', key: 'vsource' }, { type: 'isource', key: 'isource' },
    { type: 'ground', key: 'ground' }, { type: 'ammeter', key: 'ammeter' }, { type: 'voltmeter', key: 'voltmeter' },
    { type: 'switch', key: 'switch' }, { type: 'button', key: 'button' },
    { type: 'diode', key: 'diode' }, { type: 'schottky', key: 'schottky' }, { type: 'led', key: 'led' }, { type: 'rgbled', key: 'rgbled' }, { type: 'opamp', key: 'opamp' },
    { type: 'bjt', key: 'npn', props: { pol: 'npn' } }, { type: 'bjt', key: 'pnp', props: { pol: 'pnp' } }
  ];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (tag, attrs, html) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  };

  function UI(app) {
    const t = app.t;
    const isMobile = () => document.documentElement.classList.contains('layout-mobile');
    const fmt = (v, u, d) => U.format(v, u, { digits: d || app.settings.digits });
    let tab = 'props';
    const ui = {};

    /* ---------- palette ---------- */
    const palComps = $('palComps');
    const palButtons = [];
    for (const it of PALETTE) {
      const b = el('button', { type: 'button', class: 'comp' });
      const cv = el('canvas');
      const span = el('span');
      b.appendChild(cv); b.appendChild(span);
      palComps.appendChild(b);
      palButtons.push({ b, cv, span, it });
      app.editor.bindPaletteButton(b, it.type, it.props || null);
    }
    // faded edges on the phone strip when there is more to scroll
    function syncPalFade() {
      const p = $('palette'), mob = isMobile();
      p.classList.toggle('more-l', mob && p.scrollLeft > 4);
      p.classList.toggle('more-r', mob && p.scrollLeft + p.clientWidth < p.scrollWidth - 4);
    }
    $('palette').addEventListener('scroll', syncPalFade, { passive: true });
    window.addEventListener('resize', syncPalFade);
    ui.syncPalFade = syncPalFade;
    function drawPalette() {
      const col = R.colors().fg;
      for (const p of palButtons) {
        p.span.textContent = t('cs_' + p.it.key);
        const sc = { ground: 'G', resistor: 'R', vsource: 'V', isource: 'I', opamp: 'A', diode: 'D', npn: 'T', pnp: 'T T', switch: 'S' }[p.it.key];
        p.b.title = app.tp('c_' + p.it.key) + (sc ? ` (${sc})` : '');
        const props = Object.assign(C.defaults(p.it.type), p.it.props || {});
        R.drawIcon(p.cv, p.it.type, props, app.settings.style, col);
      }
    }
    document.querySelectorAll('#palTools .tool').forEach((b) => {
      b.addEventListener('click', () => {
        const tool = b.dataset.tool;
        app.setTool(tool === app.tool && tool !== 'select' ? 'select' : tool);
      });
    });
    function syncTools() {
      document.querySelectorAll('#palTools .tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === app.tool));
      for (const p of palButtons) {
        const on = app.tool === 'place' && app.place && app.place.type === p.it.type && (!p.it.props || app.place.props.pol === p.it.props.pol);
        p.b.classList.toggle('active', !!on);
      }
    }

    /* ---------- header ---------- */
    $('undoBtn').addEventListener('click', () => app.undo());
    $('undoBtn2').addEventListener('click', () => app.undo());
    $('redoBtn2').addEventListener('click', () => app.redo());
    $('tidyBtn').addEventListener('click', () => {
      const r = DCS.tidy.prettify(app);
      app.toast(t(!r.ok ? 'tidy_fail' : r.changed ? 'tidy_done' : 'tidy_none', { a: r.before, b: r.after }));
    });
    $('redoBtn').addEventListener('click', () => app.redo());
    ui.updateHistory = function () {
      $('undoBtn').disabled = $('undoBtn2').disabled = !app.undoStack.length;
      $('redoBtn').disabled = $('redoBtn2').disabled = !app.redoStack.length;
    };
    document.querySelectorAll('.app-header [data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
    function setLang(l) {
      I.setLang(l);
      U.setDecimalComma(l !== 'en');
      app.LS.set('dcs.lang', l);
      translate();
      app.circuitChanged();
    }
    function translate() {
      const l = I.getLang();
      document.documentElement.lang = l;
      document.title = app.tp('title');
      document.querySelectorAll('[data-i18n]').forEach((e) => { e.innerHTML = t(e.dataset.i18n); });
      document.querySelectorAll('[data-i18n-title]').forEach((e) => { const s = app.tp(e.dataset.i18nTitle); e.title = s; e.setAttribute('aria-label', s); });
      document.querySelectorAll('#palTools .tool').forEach((b) => { b.title = app.tp('tool_' + b.dataset.tool + '_tip'); });
      syncEdgeBtns();
      document.querySelectorAll('.app-header [data-lang]').forEach((b) => b.classList.toggle('active', b.dataset.lang === l));
      syncLayoutBtn();
      drawPalette();
    }
    $('themeBtn').addEventListener('click', () => {
      const h = document.documentElement;
      const dark = h.classList.contains('dark');
      h.classList.toggle('dark', !dark); h.classList.toggle('light', dark);
      R.readColors(); drawPalette(); app.requestRender(); ui.update();
    });
    function syncLayoutBtn() {
      const b = $('layoutBtn');
      const s = app.tp(isMobile() ? 'layout_to_desktop' : 'layout_to_mobile');
      b.title = s; b.setAttribute('aria-label', s);
    }
    $('layoutBtn').addEventListener('click', () => {
      const h = document.documentElement;
      const mob = !isMobile();
      h.classList.toggle('layout-mobile', mob); h.classList.toggle('layout-desktop', !mob);
      app.LS.set('dcs.layout', mob ? 'mobile' : 'desktop');
      $('side').classList.remove('open');
      syncLayoutBtn();
      requestAnimationFrame(() => { drawPalette(); syncPalFade(); app.renderer.resize(); app.fit(); });
    });

    // file menu
    const menu = $('fileMenu');
    $('fileBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!menu.hidden) { menu.hidden = true; return; }
      menu.hidden = false;
      const r = $('fileBtn').getBoundingClientRect();
      const mw = menu.offsetWidth;
      menu.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.left)) + 'px';
      menu.style.top = (r.bottom + 6) + 'px';
    });
    document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== $('fileBtn')) menu.hidden = true; });
    menu.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-file]');
      if (!b) return;
      menu.hidden = true;
      switch (b.dataset.file) {
        case 'new':
          if (app.circuit.comps.length && !confirm(app.tp('confirm_new'))) return;
          app.loadCircuit({ comps: [], wires: [] }, { checkpoint: true });
          break;
        case 'open': $('fileInput').click(); break;
        case 'save': app.saveFile(); break;
        case 'png': app.exportPNG(); break;
        case 'link': {
          const url = await app.shareLink();
          try { await navigator.clipboard.writeText(url); app.toast(t('link_copied')); }
          catch (err) { openModal(t('file_link'), `<p>${t('link_failed')}</p><textarea style="width:100%;height:120px" readonly>${esc(url)}</textarea>`); }
          break;
        }
      }
    });
    $('fileInput').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) app.openFile(f); e.target.value = ''; });

    /* ---------- modal ---------- */
    const modal = $('modal');
    function openModal(title, html) {
      $('modalTitle').innerHTML = title;
      const body = $('modalBody');
      body.innerHTML = '';
      if (typeof html === 'string') body.innerHTML = html; else body.appendChild(html);
      modal.classList.add('open');
    }
    function closeModal() { modal.classList.remove('open'); }
    app.modalOpen = () => modal.classList.contains('open');
    app.closeModal = closeModal;
    $('modalClose').addEventListener('click', closeModal);
    modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });

    $('helpBtn').addEventListener('click', () => openModal(t('help_title'), t('help_html')));
    $('examplesBtn').addEventListener('click', () => {
      const g = el('div', { class: 'ex-grid' });
      for (const ex of DCS.examples.list(I.getLang())) {
        const b = el('button', { type: 'button', class: 'ex-card' }, `<b>${esc(ex.title)}</b><span>${esc(ex.desc)}</span>`);
        b.addEventListener('click', () => {
          closeModal();
          app.loadCircuit(DCS.examples.get(ex.key), { fit: true, checkpoint: true });
          if (app.thev) ui.showTab('thev', false);
        });
        g.appendChild(b);
      }
      openModal(t('ex_title'), g);
    });
    $('settingsBtn').addEventListener('click', () => openModal(t('set_title'), settingsForm()));

    function settingsForm() {
      const s = app.settings;
      const f = el('div', { class: 'card' });
      const row = (label, input) => { const r = el('div', { class: 'field' }); const l = el('label', null, label); r.appendChild(l); r.appendChild(input); f.appendChild(r); return input; };
      const select = (opts, val) => { const e = el('select'); for (const [v, l] of opts) { const o = el('option', { value: v }, l); if (String(v) === String(val)) o.selected = true; e.appendChild(o); } return e; };
      const check = (val) => { const e = el('input', { type: 'checkbox' }); e.checked = !!val; return e; };
      const sym = row(t('symbols'), select([['us', t('sym_us')], ['iec', t('sym_iec')]], s.style));
      sym.addEventListener('change', () => { s.style = sym.value; changed(); });
      const wd = row(t('wheel_dir'), select([['auto', t('wheel_auto')], ['normal', t('wheel_normal')], ['inverted', t('wheel_inverted')]], s.wheelDir || 'auto'));
      wd.addEventListener('change', () => { s.wheelDir = wd.value; app.saveSettings(); });
      const fs = row(t('flow_scale'), select([['lin', t('flow_lin')], ['log', t('flow_log')]], s.flowScale));
      fs.addEventListener('change', () => { s.flowScale = fs.value; changed(true); });
      const dg = row(t('set_digits'), select([[3, '3'], [4, '4'], [5, '5']], s.digits));
      dg.addEventListener('change', () => { s.digits = +dg.value; changed(); });
      for (const [k, lab] of [['ivLoad', 'set_ivload'], ['showWireI', 'set_wirei'], ['rubber', 'set_rubber'], ['realDir', 'set_realdir'], ['showNames', 'set_names'], ['showValues', 'set_values'], ['showState', 'set_state'], ['grid', 'set_grid'], ['colorV', 'colorV']]) {
        const c = row(t(lab), check(s[k]));
        c.addEventListener('change', () => { s[k] = c.checked; changed(); });
      }
      // the temperature: a number in the box, the unit fixed beside it
      const tmp = el('input', { type: 'text', value: String(s.tempC), inputmode: 'decimal' });
      const tw = el('div', { class: 'unit-in' }); tw.appendChild(tmp); tw.appendChild(el('span', null, '°C'));
      row(t('set_temp'), tw);
      tmp.addEventListener('change', () => { const v = parseFloat(tmp.value.replace(',', '.')); if (isFinite(v) && v > -100 && v < 300) { s.tempC = v; changed(true); } tmp.value = String(s.tempC); });
      const dm = row(t('set_defmodel'), select([['ideal', t('model_ideal')], ['cvd', t('model_cvd')], ['exact', t('model_exact')]], s.defModel));
      dm.addEventListener('change', () => { s.defModel = dm.value; app.saveSettings(); });
      const all = el('div', { class: 'btnrow' });
      const sel = select([['ideal', t('model_ideal')], ['cvd', t('model_cvd')], ['exact', t('model_exact')]], s.defModel);
      const ap = el('button', { type: 'button', class: 'btn primary' }, t('apply'));
      ap.addEventListener('click', () => {
        app.checkpoint();
        for (const c of app.circuit.comps) {
          if (c.type === 'diode' || c.type === 'schottky') c.props.model = sel.value;
          else if ((c.type === 'led' || c.type === 'rgbled') && sel.value !== 'ideal') c.props.model = sel.value;
        }
        app.commit();
      });
      all.appendChild(sel); all.appendChild(ap);
      row(t('set_diodes'), all);
      return f;
    }
    function changed(resolve) {
      app.saveSettings();
      ui.syncControls();
      if (resolve) app.circuitChanged(); else { ui.update(); app.requestRender(); }
    }

    /* ---------- view chips and symbols ---------- */
    document.querySelectorAll('#viewbar [data-show]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.show;
      app.settings[k] = !app.settings[k];
      app.saveSettings();
      ui.syncControls();
      if (k === 'animate') app.circuitChanged();
      app.requestRender();
    }));
    document.querySelectorAll('#symSeg [data-sym]').forEach((b) => b.addEventListener('click', () => {
      app.settings.style = b.dataset.sym;
      app.saveSettings(); ui.syncControls(); ui.update(); app.requestRender();
    }));
    ui.syncControls = function () {
      document.querySelectorAll('#viewbar [data-show]').forEach((b) => b.classList.toggle('on', !!app.settings[b.dataset.show]));
      document.querySelectorAll('#symSeg [data-sym]').forEach((b) => b.classList.toggle('active', b.dataset.sym === app.settings.style));
      drawPalette();
    };

    /* ---------- zoom buttons ---------- */
    $('zoomIn').addEventListener('click', () => app.zoomAt(1.25, app.renderer.w / 2, app.renderer.h / 2));
    $('zoomOut').addEventListener('click', () => app.zoomAt(0.8, app.renderer.w / 2, app.renderer.h / 2));
    $('zoomFit').addEventListener('click', () => app.fit());

    /* ---------- selection toolbar ---------- */
    $('selbar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      switch (b.dataset.act) {
        case 'rotate': if (app.tool === 'place') app.rotatePlace(); else app.rotateSel(); break;
        case 'flip': if (app.tool === 'place') app.flipPlace(); else app.flipSel(); break;
        case 'cancel': app.setTool('select'); break;
        case 'rubber':
          app.settings.rubber = !app.settings.rubber;
          app.saveSettings();
          app.toast(t(app.settings.rubber ? 'rubber_on' : 'rubber_off'));
          syncSelbar();
          break;
        case 'edit': app.openProps(true); break;
        case 'dup': app.duplicateSel(); break;
        case 'del': app.deleteSel(); break;
        case 'thev': { const c = app.selectedComps()[0]; if (c) app.portFromComp(c); break; }
        case 'swop': {
          const c = app.selectedComps()[0];
          if (c && c.type === 'switch') { app.checkpoint(); c.props.closed = !c.props.closed; app.commit(); }
          break;
        }
      }
    });
    function syncSelbar() {
      const bar = $('selbar');
      const cs = app.selectedComps();
      const placing = app.tool === 'place';
      bar.hidden = !((app.tool === 'select' && app.sel.size) || placing);
      bar.querySelector('[data-act=cancel]').hidden = !placing;
      for (const a of ['edit', 'thev', 'dup', 'del', 'rubber']) bar.querySelector(`[data-act=${a}]`).hidden = placing;
      bar.querySelector('[data-act=rubber]').classList.toggle('off', !app.settings.rubber);
      if (placing) {
        bar.querySelector('[data-act=rotate]').hidden = false;
        bar.querySelector('[data-act=flip]').hidden = false;
        return;
      }
      bar.querySelector('[data-act=dup]').hidden = false;
      bar.querySelector('[data-act=del]').hidden = false;
      const one = cs.length === 1 && app.sel.size === 1 ? cs[0] : null;
      bar.querySelector('[data-act=rotate]').hidden = !cs.length;
      bar.querySelector('[data-act=flip]').hidden = !cs.length;
      bar.querySelector('[data-act=edit]').hidden = app.sel.size !== 1;
      bar.querySelector('[data-act=thev]').hidden = !(one && C.TYPES[one.type].terms.length === 2);
      // a selected switch: open / close it (push button: held while the button is pressed)
      const sw = bar.querySelector('[data-act=swop]');
      sw.hidden = !(one && C.isSwitch(one));
      if (one && C.isSwitch(one)) {
        const s = app.tp(one.type === 'switch' ? (one.props.closed ? 'sw_do_open' : 'sw_do_close') : 'pb_do_press');
        sw.title = s; sw.setAttribute('aria-label', s);
        sw.classList.toggle('on', C.isClosed(one));
      }
    }
    {
      // the push button stays pressed while the toolbar button is held
      const b = $('selbar').querySelector('[data-act=swop]');
      let held = null;
      const up = () => { if (held) { C.pressed.delete(held); held = null; app.circuitChanged(false); } };
      b.addEventListener('pointerdown', (e) => {
        const c = app.selectedComps()[0];
        if (!c || c.type !== 'button') return;
        held = c.id; C.pressed.add(c.id); app.circuitChanged(true);
        try { b.setPointerCapture(e.pointerId); } catch (_) {}
      });
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    }

    /* ---------- hints, tips, toasts ---------- */
    app.hint = function (text) { const h = $('hintbar'); h.hidden = !text; h.textContent = text || ''; };
    let toastTimer = 0;
    app.toast = function (text) {
      const e = $('toast');
      e.textContent = text; e.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { e.hidden = true; }, 2200);
    };
    app.tip = function (h, p) {
      const tip = $('tip');
      const res = app.result && app.result.ok ? app.result : null;
      if (!h || !p || (!res && h.kind !== 'mark') || isMobile()) { tip.hidden = true; return; }
      let html = '';
      if (h.kind === 'mark') html = esc(app.tp('tip_flip'));
      else if (h.kind === 'wire' || h.kind === 'wend') {
        const nd = app.net.wireNode.get(h.wire.id);
        html = `${t('node')} ${esc(app.net.nodes[nd].name)}: <b>${fmt(res.v[nd], 'V')}</b>`;
        const pieces = (app.wireCur && app.wireCur.get(h.wire.id)) || [];
        if (pieces.length === 1) html += ` · I ${pieces[0].loop ? '?' : fmt(Math.abs(pieces[0].i), 'A')}`;
      } else if (h.kind === 'term') {
        const nd = app.net.compNodes.get(h.comp.id)[h.idx];
        html = `${esc(h.comp.name || '')} ${C.TYPES[h.comp.type].termNames ? C.TYPES[h.comp.type].termNames[h.idx] : ''} : <b>${fmt(res.v[nd], 'V')}</b>`;
      } else if (h.kind === 'comp') {
        const r = res.el[h.comp.id];
        if (!r) { tip.hidden = true; return; }
        html = `<b>${esc(h.comp.name || app.tp('c_' + h.comp.type))}</b>`;
        if (r.v !== undefined) html += ` · V ${fmt(r.v, 'V')} · I ${fmt(r.i, 'A')} · P ${fmt(r.p, 'W')}`;
        if (h.comp.type === 'opamp') html += ` · Vo ${fmt(r.vout, 'V')}`;
        if (h.comp.type === 'bjt') html += ` · I<sub>C</sub> ${fmt(r.ic, 'A')} · V<sub>CE</sub> ${fmt(r.vce, 'V')}`;
      }
      if (!html) { tip.hidden = true; return; }
      tip.innerHTML = html;
      tip.hidden = false;
      const st = $('stage').getBoundingClientRect();
      let x = p.sx + 14, y = p.sy + 16;
      if (x + tip.offsetWidth > st.width - 6) x = p.sx - tip.offsetWidth - 10;
      if (y + tip.offsetHeight > st.height - 6) y = p.sy - tip.offsetHeight - 10;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };

    /* ---------- side panel / bottom sheet ---------- */
    document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => ui.showTab(b.dataset.tab, false)));
    /* desktop: hide or show the palette and the side panel; the circuit stays where it is on screen */
    function syncEdgeBtns() {
      const h = document.documentElement;
      for (const [id, cls, k] of [['palToggle', 'hide-pal', 'pal'], ['sideToggle', 'hide-side', 'side']]) {
        const s = app.tp((h.classList.contains(cls) ? 'show_' : 'hide_') + k);
        $(id).title = s; $(id).setAttribute('aria-label', s);
      }
    }
    ui.setPanelHidden = function (which, hide) {
      const h = document.documentElement, cls = which === 'pal' ? 'hide-pal' : 'hide-side';
      if (h.classList.contains(cls) === hide) return;
      const x0 = $('cv').getBoundingClientRect().left;
      h.classList.toggle(cls, hide);
      app.LS.set(which === 'pal' ? 'dcs.hidePal' : 'dcs.hideSide', hide ? '1' : '0');
      const dx = x0 - $('cv').getBoundingClientRect().left;
      app.view.ox += dx;
      app.renderer.resize(); app.requestRender();
      syncEdgeBtns();
      if (which === 'pal' && !hide) drawPalette();
      if (which === 'side' && !hide) ui.update();
    };
    $('palToggle').addEventListener('click', () => ui.setPanelHidden('pal', !document.documentElement.classList.contains('hide-pal')));
    $('sideToggle').addEventListener('click', () => ui.setPanelHidden('side', !document.documentElement.classList.contains('hide-side')));
    syncEdgeBtns();

    ui.showTab = function (name, open) {
      tab = name;
      if (name !== 'thev' && app.overlay.hl) { app.overlay.hl = null; app.requestRender(); }
      if (open && !isMobile()) ui.setPanelHidden('side', false);
      document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
      for (const n of ['props', 'results', 'thev']) $('pane-' + n).hidden = n !== name;
      if (open && isMobile()) $('side').classList.add('open');
      ui.update();
    };
    $('sheetBtn').addEventListener('click', () => $('side').classList.toggle('open'));
    // phone: close the bottom sheet (button, tap on the grip, drag it down, tap on the empty circuit)
    ui.closeSheet = function () {
      const s = $('side');
      s.classList.remove('open', 'dragging'); s.style.transform = '';
    };
    $('sheetClose').addEventListener('click', (e) => { e.stopPropagation(); ui.closeSheet(); });
    {
      // the sheet follows the finger when its grip or its tab bar is dragged down; a short tap on the grip closes it
      const side = $('side');
      let d = null;
      const start = (e, el, isGrip) => {
        if (!isMobile() || e.target.closest('.sheet-close')) return;
        d = { id: e.pointerId, y0: e.clientY, dy: 0, el, isGrip, drag: false };
      };
      const move = (e) => {
        if (!d || d.id !== e.pointerId) return;
        d.dy = e.clientY - d.y0;
        if (!d.drag && d.dy > 8) { d.drag = true; side.classList.add('dragging'); try { d.el.setPointerCapture(e.pointerId); } catch (_) {} }
        if (d.drag) side.style.transform = `translateY(${Math.max(0, d.dy)}px)`;
      };
      const end = (e) => {
        if (!d || d.id !== e.pointerId) return;
        const close = d.drag ? d.dy > Math.min(90, side.offsetHeight * 0.2) : d.isGrip;
        const dragged = d.drag;
        d = null;
        side.classList.remove('dragging'); side.style.transform = '';
        if (close) ui.closeSheet();
        // a drag on the tab bar must not also switch tabs
        if (dragged) { const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, true), 50); }
      };
      for (const [el, isGrip] of [[$('sheetGrip'), true], [side.querySelector('.tabs'), false]]) {
        el.addEventListener('pointerdown', (e) => start(e, el, isGrip));
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
      }
    }
    app.openProps = function (focus) {
      ui.showTab('props', true);
      if (focus && !isMobile()) {
        const inp = $('pane-props').querySelector('input[data-prop], select[data-prop]');
        if (inp) { inp.focus(); if (inp.select) inp.select(); }
      }
    };

    /* status chip */
    $('status').addEventListener('click', () => ui.showTab('results', true));
    function syncStatus() {
      const s = $('status');
      const res = app.result;
      let cls = 'ok', txt = '';
      const issues = app.issues();
      if (!app.circuit.comps.length) { cls = 'empty'; txt = t('st_empty'); }
      else if (!res || !res.ok) { cls = 'err'; const e = issues.find(i => i.level === 'error'); txt = e ? plainText(e.text) : t('st_err'); }
      else {
        const w = issues.filter(i => i.level === 'warn');
        cls = w.length ? 'warn' : 'ok';
        txt = w.length ? plainText(w[0].text) : t('st_ok');
      }
      s.className = 'status ' + cls;
      s.innerHTML = `<span class="ic"></span><span class="txt">${esc(txt)}</span>`;
      s.title = txt;
    }
    const plainText = (h) => String(h).replace(/<sub>(.*?)<\/sub>/g, '$1').replace(/<[^>]+>/g, '');

    /* ---------- properties pane ---------- */
    function propLabel(c, d) {
      if (d.key === 'model' || d.key === 'pol' || d.key === 'sat') return t('p_' + d.key);
      return t('p_' + d.key);
    }
    function renderProps() {
      const pane = $('pane-props');
      pane.innerHTML = '';
      const cs = app.selectedComps();
      const ws = app.circuit.wires.filter(w => app.sel.has(w.id));
      const res = app.result && app.result.ok ? app.result : null;
      if (app.sel.size === 0) {
        pane.appendChild(el('div', { class: 'card' }, `<div class="hint">${t('quick_help')}</div>`));
        issuesInto(pane);
        return;
      }
      if (app.sel.size > 1) {
        const card = el('div', { class: 'card' }, `<h3>${t('sel_count', { n: app.sel.size })}</h3>`);
        const row = el('div', { class: 'btnrow' });
        row.appendChild(button(t('rotate'), () => app.rotateSel()));
        row.appendChild(button(t('duplicate'), () => app.duplicateSel()));
        row.appendChild(button(t('del'), () => app.deleteSel(), 'warn'));
        card.appendChild(row);
        pane.appendChild(card);
        ivCard(pane);
        return;
      }
      if (ws.length) {
        const w = ws[0];
        const nd = app.net.wireNode.get(w.id);
        const node = app.net.nodes[nd];
        const card = el('div', { class: 'card' }, `<h3>${t('wire_sel')} · ${t('node')} ${esc(node.name)}</h3>`);
        if (nd !== 0) {
          const r = el('div', { class: 'field' });
          r.appendChild(el('label', null, t('node_name')));
          const inp = el('input', { type: 'text', value: node.name, 'data-prop': 'nodename', autocomplete: 'off', spellcheck: 'false' });
          inp.addEventListener('change', () => app.setNodeName([w.x1, w.y1], inp.value === 'N' + nd ? '' : inp.value));
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
          r.appendChild(inp);
          card.appendChild(r);
        }
        if (res) {
          const pieces = (app.wireCur && app.wireCur.get(w.id)) || [];
          let kv = `<dt>${t('node_voltage')} V<sub>${esc(node.name)}</sub></dt><dd class="v">${fmt(res.v[nd], 'V')}</dd>`;
          pieces.forEach((p, k) => {
            const dir = Math.abs(p.i) < 1e-12 ? '' : arrowOf(p.i >= 0 ? p.x2 - p.x1 : p.x1 - p.x2, p.i >= 0 ? p.y2 - p.y1 : p.y1 - p.y2);
            kv += `<dt>${t('wire_i')}${pieces.length > 1 ? ' (' + (k + 1) + ')' : ''}</dt><dd class="i">${p.loop ? t('wire_i_loop_s') : fmt(Math.abs(p.i), 'A') + ' ' + dir}</dd>`;
          });
          card.appendChild(el('dl', { class: 'kv' }, kv));
          if (pieces.some(p => p.loop)) card.appendChild(el('div', { class: 'hint' }, t('wire_i_loop')));
        }
        card.appendChild(el('div', { class: 'hint' }, t('node_hint')));
        const row = el('div', { class: 'btnrow' });
        row.appendChild(button(t('del'), () => app.deleteSel(), 'warn'));
        card.appendChild(row);
        pane.appendChild(card);
        return;
      }
      const c = cs[0];
      const T = C.TYPES[c.type];
      const typeKey = c.type === 'bjt' ? (c.props.pol === 'pnp' ? 'pnp' : 'npn') : c.type;
      const card = el('div', { class: 'card' });
      const h3 = el('h3');
      const icon = el('canvas');
      h3.appendChild(icon);
      h3.appendChild(el('span', null, esc(c.name ? c.name + ' · ' : '') + t('c_' + typeKey)));
      card.appendChild(h3);
      requestAnimationFrame(() => R.drawIcon(icon, c.type, c.props, app.settings.style, R.colors().fg));

      const field = (label, input, unit) => {
        const r = el('div', { class: 'field' });
        r.appendChild(el('label', null, label));
        if (unit != null) { const w = el('div', { class: 'unit-in' }); w.appendChild(input); w.appendChild(el('span', null, unit)); r.appendChild(w); }
        else r.appendChild(input);
        card.appendChild(r);
      };
      if (c.type !== 'ground') {
        const nm = el('input', { type: 'text', value: c.name || '', 'data-prop': 'name', autocomplete: 'off', spellcheck: 'false' });
        nm.addEventListener('change', () => { const v = nm.value.trim().slice(0, 16); if (v && v !== c.name) { app.checkpoint(); c.name = v; app.commit(); } else nm.value = c.name; });
        nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') nm.blur(); });
        field(t('p_name'), nm);
      }
      for (const d of T.props) {
        if (d.show && !d.show(c)) continue;
        if (d.type === 'select') {
          const s = el('select', { 'data-prop': d.key });
          for (const o of d.options) {
            const opt = el('option', { value: o }, d.key === 'model' ? plainText(t('model_' + o)) : t(o));
            if (c.props[d.key] === o) opt.selected = true;
            s.appendChild(opt);
          }
          s.addEventListener('change', () => {
            app.checkpoint();
            c.props[d.key] = s.value;
            if (d.key === 'pol') c.flip = !c.flip;
            if (d.onChange) d.onChange(c);
            app.commit();
          });
          field(propLabel(c, d), s);
        } else if (d.type === 'slider') {
          // potentiometer position: the circuit follows the slider while it moves
          const w = el('div', { class: 'slider-row' });
          const sl = el('input', { type: 'range', min: '0', max: '100', step: '1', 'data-prop': d.key });
          sl.value = String(Math.round(c.props[d.key] * 100));
          const out = el('span', { class: 'slider-val' }, sl.value + ' %');
          let cp = false;
          sl.addEventListener('input', () => {
            if (!cp) { app.checkpoint(); cp = true; }
            c.props[d.key] = (+sl.value) / 100;
            out.textContent = sl.value + ' %';
            app.circuitChanged(true);
          });
          sl.addEventListener('change', () => { cp = false; app.commit(); });
          w.appendChild(sl); w.appendChild(out);
          field(propLabel(c, d), w);
        } else if (d.type === 'bool') {
          const b = el('input', { type: 'checkbox', 'data-prop': d.key });
          b.checked = !!c.props[d.key];
          b.addEventListener('change', () => { app.checkpoint(); c.props[d.key] = b.checked; app.commit(); });
          field(propLabel(c, d), b);
        } else {
          const inp = el('input', { type: 'text', 'data-prop': d.key, inputmode: 'text', autocomplete: 'off', spellcheck: 'false' });
          inp.value = d.unit ? U.format(c.props[d.key], '', { digits: 6, trim: true, zero: 1e-30 }).trim() : String(c.props[d.key]).replace('.', I.getLang() === 'en' ? '.' : ',');
          const apply = () => {
            const v = U.parse(inp.value);
            if (!isFinite(v) || v < d.min || v > d.max) { inp.classList.add('bad'); return false; }
            inp.classList.remove('bad');
            if (v !== c.props[d.key]) { app.checkpoint(); c.props[d.key] = v; app.commit(); }
            return true;
          };
          inp.addEventListener('change', apply);
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { if (apply()) inp.blur(); }
            if (e.key === 'Escape') { inp.blur(); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              // step through the E12-like 1-2-5 values for resistances, ±1 % otherwise
              e.preventDefault();
              const v0 = U.parse(inp.value);
              if (!isFinite(v0)) return;
              const up = e.key === 'ArrowUp';
              let v = d.key === 'R' ? step125(v0, up) : (Math.abs(v0) < 1e-12 ? (up ? 0.1 : -0.1) : v0 + (up ? 1 : -1) * stepOf(v0));
              v = Math.max(d.min, Math.min(d.max, v));
              inp.value = U.format(v, '', { digits: 6, trim: true, zero: 1e-30 }).trim();
              apply();
              requestAnimationFrame(() => { const i2 = $('pane-props').querySelector(`input[data-prop="${d.key}"]`); if (i2) { i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } });
            }
          });
          field(propLabel(c, d), inp, d.unit);
          if (LIVE_KEYS.has(d.key)) liveSlider(c, d, inp);
        }
      }
      if (C.flippable(c) && !app.settings.realDir) {
        const f = C.refs(c);
        const rr = el('div', { class: 'field' });
        const fixed = C.passiveOnly(c);
        rr.appendChild(el('label', null, `${t('ref_title')}<br><span class="muted" style="font-size:12.5px">${t(fixed ? 'ref_passive_fixed' : f.refV === f.refI ? 'ref_passive_s' : 'ref_active_s')}</span>`));
        const bw = el('div', { class: 'btnrow' });
        if (fixed) bw.appendChild(button('⇅ ' + t('ref_flip_both'), () => app.flipRef(c.id, 'v')));
        else {
          bw.appendChild(button('⇅ V', () => app.flipRef(c.id, 'v')));
          bw.appendChild(button('⇄ I', () => app.flipRef(c.id, 'i')));
        }
        rr.appendChild(bw);
        card.appendChild(rr);
      }
      const row = el('div', { class: 'btnrow' });
      if (c.type !== 'ground') row.appendChild(button('⟳ ' + plainText(t('rotate')).replace(/ \(.*\)/, ''), () => app.rotateSel()));
      if (T.terms.length === 2 && c.type !== 'ground') row.appendChild(button(t('thev_seen'), () => app.portFromComp(c)));
      row.appendChild(button(t('del'), () => app.deleteSel(), 'warn'));
      card.appendChild(row);
      pane.appendChild(card);

      // results of this element
      if (res && res.el[c.id] && c.type !== 'ground') pane.appendChild(resultsCard(c, res.el[c.id], res));
      ivCard(pane);
      issuesInto(pane, c.id);
    }
    // I–V characteristic of the selection, with its operating point and load line
    /* a slider under the main value of a component: dragging it solves the circuit at every step (the pinned
     * plot and the drawing follow); a logarithmic range ×1/10 … ×10 for positive values, linear ±2× for the
     * signed ones (sources). The range is centred again on the value each time the panel is drawn. */
    const LIVE_KEYS = new Set(['R', 'V', 'I', 'beta', 'Vf']);
    function liveSlider(c, d, inp) {
      const v0 = c.props[d.key];
      const signed = d.min < 0;
      let toV, toS;
      if (signed) {
        const span = Math.abs(v0) > 0 ? 2 * Math.abs(v0) : (d.key === 'I' ? 0.01 : 10);
        toV = (s) => -span + 2 * span * s / 1000; toS = (v) => Math.round((v + span) / (2 * span) * 1000);
      } else {
        const base = v0 > 0 ? v0 : (d.key === 'R' ? 1000 : 1);
        const lo = Math.max(d.min, base / 10), hi = Math.min(d.max, base * 10);
        toV = (s) => lo * Math.pow(hi / lo, s / 1000); toS = (v) => Math.round(Math.log(v / lo) / Math.log(hi / lo) * 1000);
      }
      const nice = (v) => { if (v === 0) return 0; const e = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 2); return Math.round(v / e) * e; };
      const sl = el('input', { type: 'range', min: '0', max: '1000', step: '1', class: 'live-slider', title: plainText(t('live_tip')) });
      sl.value = String(Math.max(0, Math.min(1000, toS(v0))));
      let cp = false;
      sl.addEventListener('input', () => {
        if (!cp) { app.checkpoint(); cp = true; }
        const v = Math.max(d.min, Math.min(d.max, nice(toV(+sl.value))));
        c.props[d.key] = v;
        inp.value = U.format(v, '', { digits: 6, trim: true, zero: 1e-30 }).trim();
        app.circuitChanged(true);
      });
      sl.addEventListener('change', () => { cp = false; app.commit(); });
      const r = el('div', { class: 'field live-row' });
      r.appendChild(sl);
      inp.closest('.field').after(r);
    }
    function ivCard(pane) {
      let specs;
      try { specs = DCS.iv.build(app); } catch (e) { console.error(e); return; }
      if (!specs) return;
      (Array.isArray(specs) ? specs : [specs]).forEach((spec, k) => ivCardOne(pane, spec, k));
    }
    function ivCardOne(pane, spec, k) {
      const card = el('div', { class: 'card' });
      const head = el('div', { class: 'ivhead' });
      const title = spec.titleHtml || DCS.iv.subHtml(spec.title);
      head.appendChild(el('h3', null, `<span>${title}</span>`));   // one flex item: the subscripts stay in the text
      card.appendChild(head);
      if (spec.series.length) {
        const big = el('button', { type: 'button', class: 'btn', title: plainText(t('iv_expand')) }, '⤢');
        big.addEventListener('click', () => {
          const box = el('div', { class: 'card' });
          openModal(title, box);
          DCS.iv.mount(box, spec, { big: true });
          if (spec.note) box.appendChild(el('div', { class: 'hint' }, spec.note));
          if (spec.conv) box.appendChild(el('div', { class: 'hint' }, spec.conv));
        });
        head.appendChild(big);
        // pin: the plot stays over the circuit and follows the changes of any value, live
        if (k !== undefined) {
          const pin = el('button', { type: 'button', class: 'btn', title: plainText(t('iv_pin')) }, '📌');
          pin.addEventListener('click', () => app.pinPlot(k));
          head.insertBefore(pin, big);
        }
        DCS.iv.mount(card, spec);
      }
      if (spec.note) card.appendChild(el('div', { class: 'hint' }, spec.note));
      if (spec.conv) card.appendChild(el('div', { class: 'hint' }, spec.conv));
      pane.appendChild(card);
    }
    const arrowOf = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? '→' : '←') : (dy > 0 ? '↓' : '↑'));
    function step125(v, up) {
      const e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e);
      const seq = [1, 2.2, 4.7, 10];
      if (up) { for (const s of seq) if (s > m + 1e-9) return s * Math.pow(10, e); return 22 * Math.pow(10, e); }
      for (let i = seq.length - 1; i >= 0; i--) if (seq[i] < m - 1e-9) return seq[i] * Math.pow(10, e);
      return 4.7 * Math.pow(10, e - 1);
    }
    function stepOf(v) { const a = Math.abs(v); return Math.pow(10, Math.floor(Math.log10(a)) - 1); }
    function button(label, fn, cls) { const b = el('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : '') }, label); b.addEventListener('click', fn); return b; }

    function resultsCard(c, r, res) {
      const card = el('div', { class: 'card' });
      let html = '';
      const pRow = (p, label) => {
        const del = p < -1e-15;
        return `<dt>${label || t('res_p')}</dt><dd class="${del ? 'pg' : 'pa'}">${fmt(Math.abs(p), 'W')} ${del ? t('delivers') : t('absorbs')}</dd>`;
      };
      if (c.type === 'ammeter') html = `<dt>${t('reading')}</dt><dd class="i big">${fmt(r.i, 'A', 4)}</dd>`;
      else if (c.type === 'voltmeter') html = `<dt>${t('reading')}</dt><dd class="v big">${fmt(r.v, 'V', 4)}</dd>`;
      else if (c.type === 'opamp') {
        html = `<dt>${t('vout')}</dt><dd class="v">${fmt(r.vout, 'V')}</dd><dt>${t('iout')}</dt><dd class="i">${fmt(r.iout, 'A')}</dd>` +
          `<dt>${t('vdiff')}</dt><dd>${fmt(r.vd, 'V')}</dd><dt>${t('res_state')}</dt><dd>${r.state === 'lin' ? 'linear' : r.state === 'sp' ? 'SAT +' : 'SAT −'}</dd>` +
          `<dt>${t('supply_p')}</dt><dd class="pg">${fmt(-r.p, 'W')}</dd>`;
      } else if (c.type === 'pot') {
        const f = C.potFrac(c);
        html = `<dt>R<sub>AW</sub> / R<sub>WB</sub></dt><dd>${fmt(c.props.R * f, 'Ω')} / ${fmt(c.props.R * (1 - f), 'Ω')}</dd>` +
          `<dt>V<sub>AW</sub> · I<sub>AW</sub></dt><dd><span class="v">${fmt(r.aw.v, 'V')}</span> · <span class="i">${fmt(r.aw.i, 'A')}</span></dd>` +
          `<dt>V<sub>WB</sub> · I<sub>WB</sub></dt><dd><span class="v">${fmt(r.wb.v, 'V')}</span> · <span class="i">${fmt(r.wb.i, 'A')}</span></dd>` +
          `<dt>I<sub>W</sub> (${t('wiper')})</dt><dd class="i">${fmt(r.tc[2], 'A')}</dd>` + pRow(r.p);
      } else if (c.type === 'rgbled') {
        html = ['R', 'G', 'B'].map((n, k) => { const q = r.ch[k]; return `<dt>${n}: V / I</dt><dd><span class="v">${fmt(q.v, 'V')}</span> · <span class="i">${fmt(q.i, 'A')}</span> · ${Math.round(100 * Math.max(0, Math.min(1, q.i / c.props.Imax)))} %</dd>`; }).join('') + pRow(r.p);
      } else if (c.type === 'bjt') {
        const pnp = c.props.pol === 'pnp';
        html = `<dt>${t('res_region')}</dt><dd>${t('region_' + r.state)}</dd>` +
          `<dt>${t('ic')}</dt><dd class="i">${fmt(r.ic, 'A')}</dd><dt>${t('ib')}</dt><dd class="i">${fmt(r.ib, 'A')}</dd><dt>${t('ie')}</dt><dd class="i">${fmt(r.ie, 'A')}</dd>` +
          `<dt>${t(pnp ? 'veb' : 'vbe')}</dt><dd class="v">${fmt(r.vbe, 'V')}</dd><dt>${t(pnp ? 'vec' : 'vce')}</dt><dd class="v">${fmt(r.vce, 'V')}</dd>` +
          (r.state === 'act' && r.ib > 0 ? `<dt>I<sub>C</sub>/I<sub>B</sub></dt><dd>${(r.ic / r.ib).toFixed(1)}</dd>` : '') + pRow(r.p);
      } else {
        const sg = app.settings.realDir ? { v: r.v, i: r.i } : C.signed(c, r);
        const nm = esc(c.name || '');
        html = `<dt>V<sub>${nm}</sub></dt><dd class="v">${fmt(sg.v, 'V')}</dd><dt>I<sub>${nm}</sub></dt><dd class="i">${fmt(sg.i, 'A')}</dd>` + pRow(r.p);
        if (C.isDiode(c) && r.state) html += `<dt>${t('res_state')}</dt><dd>${t('state_' + r.state)}</dd>`;
        if (c.type === 'led') html += `<dt>${t('brightness')}</dt><dd>${Math.round(100 * Math.max(0, Math.min(1, r.i / c.props.Imax)))} %</dd>`;
        if (c.type === 'resistor') html += `<dt>V/R</dt><dd>${fmt(r.v / c.props.R, 'A')}</dd>`;
      }
      card.appendChild(el('dl', { class: 'kv' }, html));
      return card;
    }

    function issuesInto(pane, onlyId) {
      for (const iss of app.issues()) {
        if (onlyId && !iss.ids.includes(onlyId)) continue;
        if (iss.level === 'info' && onlyId) continue;
        pane.appendChild(el('div', { class: 'issue ' + iss.level }, iss.text));
      }
    }

    /* ---------- results pane ---------- */
    function renderResults() {
      const pane = $('pane-results');
      pane.innerHTML = '';
      issuesInto(pane);
      const res = app.result && app.result.ok ? app.result : null;
      if (!res) return;
      // node voltages
      const nd = el('div', { class: 'card' }, `<h3>${t('nodes_title')}</h3>`);
      const nt = el('table', { class: 'res' });
      let nr = `<tr><th>${t('node')}</th><th>V</th></tr>`;
      for (const n of app.net.nodes) {
        if (n.id === 0 || !n.points.length) continue;
        const names = [];
        for (const p of n.points) for (const [cc, j] of p.terms) if (cc.type !== 'ground') names.push((cc.name || '') + (C.TYPES[cc.type].termNames ? '.' + C.TYPES[cc.type].termNames[j] : ''));
        nr += `<tr data-node="${n.id}"><td>${esc(n.name)} <span class="muted" style="font-weight:400">${esc(Array.from(new Set(names)).slice(0, 4).join(', '))}</span></td><td class="v">${fmt(res.v[n.id], 'V')}</td></tr>`;
      }
      nt.innerHTML = nr;
      nt.addEventListener('pointerover', (e) => { const tr = e.target.closest('tr[data-node]'); app.hiNode = tr ? +tr.dataset.node : null; app.requestRender(); });
      nt.addEventListener('pointerleave', () => { app.hiNode = null; app.requestRender(); });
      nt.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-node]'); if (tr) { app.hiNode = +tr.dataset.node; app.requestRender(); } });
      nd.appendChild(el('div', { class: 'hint' }, t('nodes_hint')));
      nd.appendChild(nt);
      pane.appendChild(nd);
      const order = ['vsource', 'isource', 'resistor', 'pot', 'diode', 'schottky', 'led', 'rgbled', 'bjt', 'opamp', 'ammeter', 'voltmeter'];
      const comps = app.circuit.comps.filter(c => c.type !== 'ground').sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
      const tbl = el('table', { class: 'res' });
      let rows = `<tr><th>${t('tbl_comp')}</th><th>${t('tbl_v')}</th><th>${t('tbl_i')}</th><th>${t('tbl_p')}</th></tr>`;
      let pGen = 0, pAbs = 0;
      for (const c of comps) {
        const r = res.el[c.id];
        if (!r) continue;
        let v = r.v, i = r.i, p = r.p;
        if (!app.settings.realDir && C.flippable(c)) { const sg = C.signed(c, r); v = sg.v; i = sg.i; }
        if (c.type === 'opamp') { v = r.vout; i = r.iout; p = r.p; }
        if (c.type === 'bjt') { v = r.vce; i = r.ic; }
        if (c.type === 'rgbled') { v = NaN; i = r.tc[3]; }
        if (c.type === 'pot') { v = r.aw.v + r.wb.v; i = r.tc[0]; }
        if (c.type === 'opamp') { if (p > 0) pAbs += p; else pGen -= p; }
        else if (p >= 0) pAbs += p; else pGen -= p;
        const meter = c.type === 'ammeter' || c.type === 'voltmeter';
        rows += `<tr data-id="${esc(c.id)}"><td>${esc(c.name || '')}</td><td class="v">${c.type === 'ammeter' ? '' : fmt(v, 'V')}</td><td class="i">${c.type === 'voltmeter' ? '' : fmt(i, 'A')}</td>` +
          `<td class="${p < -1e-15 ? 'pg' : 'pa'}">${meter ? '' : fmt(p, 'W')}</td></tr>`;
      }
      tbl.innerHTML = rows;
      tbl.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) { app.select([tr.dataset.id]); ui.showTab('props', false); } });
      const card = el('div', { class: 'card' });
      card.appendChild(el('div', { class: 'hint' }, (app.settings.realDir ? `V: ${t('v_ref')} · I: ${t('i_ref')}` : t('tbl_refs')) + ` · P &gt; 0: ${t('absorbs')}, P &lt; 0: ${t('delivers')}`));
      card.appendChild(tbl);
      pane.appendChild(card);
      pane.appendChild(kirchhoffCard(res));
      const bal = el('div', { class: 'card' }, `<h3>${t('balance')}</h3><dl class="kv"><dt>${t('p_gen')}</dt><dd class="pg">${fmt(pGen, 'W')}</dd><dt>${t('p_abs')}</dt><dd class="pa">${fmt(pAbs, 'W')}</dd><dt>${t('p_sum')}</dt><dd>${fmt(res.pSum, 'W')}</dd></dl>`);
      pane.appendChild(bal);
    }

    /* KCL at every node and KVL around every independent loop, written with the reference directions */
    function kirchhoffCard(res) {
      const card = el('div', { class: 'card' }, `<h3>${t('eq_title')}</h3>`);
      const net = app.net;
      const nodeName = (n) => esc(net.nodes[n].name);
      const sub = (s, name) => `${s}<sub>${esc(name)}</sub>`;
      const tolOk = (sum, terms) => Math.abs(sum) <= 1e-9 * Math.max(1e-6, ...terms.map(x => Math.abs(x.val))) + 1e-12;
      const fmtEq = (terms, unit) => {
        if (!terms.length) return '';
        const sym = terms.map((x, k) => (x.sign < 0 ? ' − ' : k ? ' + ' : '') + x.sym).join('');
        const num = terms.map((x, k) => { const v = x.sign * x.val; return (k ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : '')) + U.format(Math.abs(v), unit, { digits: app.settings.digits }); }).join('');
        const sum = terms.reduce((s, x) => s + x.sign * x.val, 0);
        return `<div class="eq-line"><span class="eq-sym">${sym} = 0</span><span class="eq-num">${num} = ${U.format(sum, unit, { digits: 2, zero: 1e-9, trim: true })} ${tolOk(sum, terms) ? '<b class="ok">✓</b>' : '<b class="bad">✗</b>'}</span></div>`;
      };
      // KCL: currents leaving each node through the elements, with their reference arrows
      const kcl = new Map();
      const addI = (node, sign, sym, val) => { if (node === 0) return; if (!kcl.has(node)) kcl.set(node, []); kcl.get(node).push({ sign, sym, val }); };
      let multi = false;
      const branches = [];
      for (const c of app.circuit.comps) {
        const r = res.el[c.id];
        if (!r || c.type === 'ground') continue;
        const n = net.compNodes.get(c.id);
        if (C.TYPES[c.type].terms.length === 2) {
          if (n[0] === n[1]) continue;
          const f = C.refs(c);
          const sg = C.signed(c, r);
          const from = f.refI ? n[1] : n[0], to = f.refI ? n[0] : n[1];
          if (c.type !== 'voltmeter') { addI(from, 1, sub('I', c.name), sg.i); addI(to, -1, sub('I', c.name), sg.i); }
          branches.push({ c, plus: f.refV ? n[1] : n[0], minus: f.refV ? n[0] : n[1], v: sg.v });
        } else if (c.type === 'bjt') {
          multi = true;
          const s = c.props.pol === 'pnp' ? -1 : 1;
          addI(n[0], s, sub('I', 'B,' + c.name), r.ib); addI(n[1], s, sub('I', 'C,' + c.name), r.ic); addI(n[2], -s, sub('I', 'E,' + c.name), r.ie);
        } else if (c.type === 'pot') {
          // the two halves are ordinary resistors in KCL and KVL (passive convention A → W → B)
          addI(n[0], 1, sub('I', c.name + '.AW'), r.aw.i); addI(n[2], -1, sub('I', c.name + '.AW'), r.aw.i);
          addI(n[2], 1, sub('I', c.name + '.WB'), r.wb.i); addI(n[1], -1, sub('I', c.name + '.WB'), r.wb.i);
          if (n[0] !== n[2]) branches.push({ c: { name: c.name + '.AW' }, plus: n[0], minus: n[2], v: r.aw.v });
          if (n[2] !== n[1]) branches.push({ c: { name: c.name + '.WB' }, plus: n[2], minus: n[1], v: r.wb.v });
        } else if (c.type === 'rgbled') {
          multi = true;
          ['R', 'G', 'B', 'COM'].forEach((tn, j) => addI(n[j], 1, sub('I', tn + ',' + c.name), r.tc[j]));
        } else if (c.type === 'opamp') {
          multi = true;
          addI(n[2], -1, sub('I', 'o,' + c.name), r.iout);
        }
      }
      let html = `<div class="hint">${t('eq_kcl')}</div>`;
      for (const nd of net.nodes) {
        const terms = kcl.get(nd.id);
        if (!terms || nd.id === 0) continue;
        html += `<div class="kq"><b>${t('node')} ${nodeName(nd.id)}</b>${fmtEq(terms, 'A')}</div>`;
      }
      // KVL: fundamental loops of a spanning tree over the two-terminal elements
      const adj = new Map();
      for (const b of branches) for (const [p, q] of [[b.plus, b.minus], [b.minus, b.plus]]) { if (!adj.has(p)) adj.set(p, []); adj.get(p).push([q, b]); }
      const parent = new Map(), depth = new Map(), used = new Set();
      for (const root of [0].concat(Array.from(adj.keys()))) {
        if (parent.has(root) || !adj.has(root)) continue;
        parent.set(root, null); depth.set(root, 0);
        const q = [root];
        while (q.length) {
          const u = q.shift();
          for (const [v, b] of adj.get(u) || []) if (!parent.has(v)) { parent.set(v, [u, b]); depth.set(v, depth.get(u) + 1); used.add(b); q.push(v); }
        }
      }
      const drop = (b, from) => ({ sign: from === b.plus ? 1 : -1, sym: sub('V', b.c.name), val: b.v });
      const loops = [];
      for (const b of branches) {
        if (used.has(b)) continue;
        // loop: through b from plus to minus, then back along the tree from minus to plus
        const terms = [drop(b, b.plus)];
        let x = b.minus, y = b.plus;
        const up = [], down = [];
        while (x !== y) {
          if (depth.get(x) >= depth.get(y)) { const [px, bx] = parent.get(x); up.push(drop(bx, x)); x = px; }
          else { const [py, by] = parent.get(y); down.unshift(drop(by, py)); y = py; }
        }
        loops.push(terms.concat(up, down));
      }
      html += `<div class="hint" style="margin-top:6px">${t('eq_kvl')}</div>`;
      loops.forEach((terms, k) => { html += `<div class="kq"><b>${t('loop')} ${k + 1}</b>${fmtEq(terms, 'V')}</div>`; });
      if (!loops.length) html += `<div class="hint">${t('eq_none')}</div>`;
      if (multi) html += `<div class="hint">${t('eq_skip')}</div>`;
      card.insertAdjacentHTML('beforeend', html);
      return card;
    }

    /* ---------- Thévenin pane ---------- */
    function renderThev() {
      const pane = $('pane-thev');
      pane.innerHTML = '';
      if (app.overlay.hl) { app.overlay.hl = null; app.requestRender(); }
      const intro = el('div', { class: 'card' }, `<div class="hint">${t('thev_intro')}</div>`);
      const row = el('div', { class: 'btnrow' });
      row.appendChild(button(t('thev_pick'), () => app.setTool('port'), 'primary'));
      const one = app.selectedComps().length === 1 ? app.selectedComps()[0] : null;
      if (one && C.TYPES[one.type].terms.length === 2) row.appendChild(button(t('thev_use_sel'), () => app.portFromComp(one)));
      if (app.thev) row.appendChild(button(t('thev_clear'), () => app.clearThevenin()));
      intro.appendChild(row);
      pane.appendChild(intro);
      const th = app.thev;
      if (!th) return;
      // A–B cuts the circuit in two: which side to look into
      if (th.cut) {
        const sr = el('div', { class: 'thev-side' });
        sr.appendChild(el('div', { class: 'hint' }, t('thev_side')));
        const br = el('div', { class: 'btnrow' });
        th.cut.sides.forEach((sd, k) => {
          const names = sd.names.length ? sd.names.slice(0, 4).map(esc).join(', ') + (sd.names.length > 4 ? '…' : '') : t('thev_side_empty');
          const b = button('→ ' + names, () => app.setThevSide(k), th.side === k ? 'primary' : '');
          br.appendChild(b);
        });
        sr.appendChild(br);
        intro.appendChild(sr);
      }
      if (th.err) { pane.appendChild(el('div', { class: 'issue error' }, t(th.err))); return; }
      if (!th.res) return;
      const r = th.res;
      const load = th.loadId ? app.circuit.comps.find(c => c.id === th.loadId) : null;
      const card = el('div', { class: 'card' });
      card.appendChild(el('div', { class: 'hint' }, load ? t('thev_load', { name: `<b>${esc(load.name)}</b>`}) : t('thev_port')));
      // a nonlinear circuit has no Thévenin equivalent: say it first, the numbers below are only a tangent
      const fin = (x) => x !== undefined && isFinite(x);
      if (r.nonlinear) {
        // only the open-circuit voltage, the short-circuit current and the real curve make sense
        card.appendChild(el('div', { class: 'issue warn' }, t('thev_nonlinear', { ids: esc(DCS.iv.nlNames(app, r)) }) + (r.pwl ? ' ' + t('thev_pwl') : '')));
        const big = (x) => !fin(x) || Math.abs(x) > 1e3;
        let kv = `<dt>${t('thev_voc')}</dt><dd class="v">${fin(r.voc) ? fmt(r.voc, 'V', 4) : '—'}</dd>`;
        kv += `<dt>${t('thev_isc')}</dt><dd class="i">${big(r.isc) ? '∞' : fmt(r.isc, 'A', 4)}</dd>`;
        card.appendChild(el('dl', { class: 'kv' }, kv));
        pane.appendChild(card);
        try { ivCardOne(pane, DCS.iv.portSpec(app, r, th.loadId)); } catch (e) { console.error(e); }
        return;
      }
      const eq = el('div', { class: 'eq' });
      const isFr = I.getLang() === 'fr';
      const lab = { vth: isFr ? 'Eₜₕ' : 'Vₜₕ', rth: 'Rₜₕ', in: 'Iₙ', rn: 'Rₙ' };
      // Thévenin drawing
      const d1 = el('div');
      d1.appendChild(el('h4', null, t('thevenin')));
      if (r.rth !== Infinity && fin(r.vth)) {
        const cv = el('canvas'); d1.appendChild(cv);
        requestAnimationFrame(() => drawEquivalent(cv, 'thev', r, lab));
      } else d1.appendChild(el('div', { class: 'hint' }, t('thev_none')));
      eq.appendChild(d1);
      const d2 = el('div');
      d2.appendChild(el('h4', null, t('norton')));
      if (r.rth !== 0 && fin(r.in)) {
        const cv = el('canvas'); d2.appendChild(cv);
        requestAnimationFrame(() => drawEquivalent(cv, 'norton', r, lab));
      } else d2.appendChild(el('div', { class: 'hint' }, t('thev_nonorton')));
      eq.appendChild(d2);
      card.appendChild(eq);
      const vthKey = isFr ? 'E<sub>Th</sub>' : 'V<sub>Th</sub>';
      let kv = '';
      kv += `<dt>${vthKey}</dt><dd class="v">${fin(r.vth) ? fmt(r.vth, 'V', 4) : '—'}</dd>`;
      kv += `<dt>R<sub>Th</sub> = R<sub>N</sub></dt><dd>${fmt(r.rth, 'Ω', 4)}</dd>`;
      kv += `<dt>I<sub>N</sub></dt><dd class="i">${fin(r.in) ? fmt(r.in, 'A', 4) : (r.in === Infinity ? '∞' : '—')}</dd>`;
      card.appendChild(el('dl', { class: 'kv' }, kv));
      card.appendChild(el('div', { class: 'hint' }, t('thev_method')));
      if (r.rth < 0) card.appendChild(el('div', { class: 'issue warn' }, t('thev_negr')));
      pane.appendChild(card);
      // equivalent resistance, step by step
      try { reqCard(pane, th); } catch (e) { console.error(e); }
      // with the load
      if (load && load.type === 'resistor' && fin(r.vth) && fin(r.rth) && r.rth > 0) {
        const RL = load.props.R;
        const IL = r.vth / (r.rth + RL), VL = IL * RL, PL = VL * IL;
        const c2 = el('div', { class: 'card' });
        c2.appendChild(el('div', { class: 'hint' }, `${t('thev_loadcalc', { name: `<b>${esc(load.name)}</b>` })}I = ${vthKey}/(R<sub>Th</sub> + R<sub>L</sub>) = <b>${fmt(IL, 'A')}</b>, V = <b>${fmt(VL, 'V')}</b>, P = <b>${fmt(PL, 'W')}</b>`));
        c2.appendChild(el('div', { class: 'hint' }, t('thev_maxp', { r: fmt(r.rth, 'Ω'), p: fmt(r.vth * r.vth / (4 * r.rth), 'W') })));
        pane.appendChild(c2);
      }
    }

    /* R_eq between A and B: sources set to zero, reduction steps (a tap highlights the resistors of a step,
     * on the circuit and on the small drawing of the network), check with a test source */
    function reqCard(pane, th) {
      const q = DCS.req.compute(app, th);
      if (q.kind === 'nonlinear') return;
      const R_ = (v) => (v === Infinity ? '∞' : v === undefined || !isFinite(v) ? '—' : fmt(v, 'Ω', 4));
      const card = el('div', { class: 'card' });
      card.appendChild(el('h3', null, t('req_title')));
      if (q.kind === 'dep') { card.appendChild(el('div', { class: 'hint' }, t('req_dep', { v: R_(q.rtest) }))); pane.appendChild(card); return; }
      card.appendChild(el('div', { class: 'hint' }, '<b>1.</b> ' + t('req_passive')));
      const cv = el('canvas', { class: 'req-cv' });
      card.appendChild(cv);
      const redraw = (hl) => drawPassive(cv, th, hl);
      requestAnimationFrame(() => redraw(null));
      card.appendChild(el('div', { class: 'hint' }, '<b>2.</b> ' + t(q.steps.length ? 'req_reduce' : 'req_reduce_none')));
      const list = el('ol', { class: 'req-steps' });
      let on = null;
      const show = (li, st) => {
        if (on) on.classList.remove('on');
        on = li && st ? li : null;
        if (on) on.classList.add('on');
        app.overlay.hl = st ? new Set(st.ids) : null;
        app.requestRender(); redraw(app.overlay.hl);
      };
      for (const st of q.steps) {
        const li = el('li', null, stepHtml(st, R_));
        li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(li, st); });
        li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && on === li) show(null, null); });
        // mouse: hovering shows the step and a click keeps it; finger: a tap shows it, a second tap hides it
        let ptr = 'mouse';
        li.addEventListener('pointerdown', (e) => { ptr = e.pointerType; });
        li.addEventListener('click', () => { if (ptr === 'mouse' || on !== li) show(li, st); else show(null, null); });
        list.appendChild(li);
      }
      if (q.steps.length) card.appendChild(list);
      let res;
      if (q.zero) res = t('req_zero');
      else if (q.open) res = t('req_open');
      else if (q.stuck) res = t('req_stuck');
      else res = `R<sub>eq</sub> = ${q.last} = <b>${R_(q.req)}</b>`;
      card.appendChild(el('div', { class: 'req-result' }, res));
      const same = q.req !== undefined && q.rtest !== undefined && (q.req === q.rtest || (isFinite(q.req) && isFinite(q.rtest) && Math.abs(q.req - q.rtest) <= 1e-6 * Math.max(Math.abs(q.rtest), 1e-9)));
      card.appendChild(el('div', { class: 'hint' }, '<b>3.</b> ' + t('req_verify', { v: R_(q.rtest) }) + (same ? ' <b class="ok">✓</b>' : '')));
      pane.appendChild(card);
    }
    function stepHtml(st, R_) {
      if (st.code === 'req_par') return `${st.r} = ${st.a} ∥ ${st.b} = (${R_(st.va)} · ${R_(st.vb)}) / (${R_(st.va)} + ${R_(st.vb)}) = <b>${R_(st.v)}</b>`;
      if (st.code === 'req_ser') return `${st.r} = ${st.a} + ${st.b} = ${R_(st.va)} + ${R_(st.vb)} = <b>${R_(st.v)}</b>`;
      if (st.code === 'req_dy') return t('req_dy', { a: st.a, b: st.b, c: st.c, s: R_(st.va + st.vb + st.vc) }) + ' ' + st.y.map(y => `${y.name} = <b>${R_(y.v)}</b>`).join(', ');
      return t(st.code, { a: st.a });
    }
    // the network seen from A–B with the sources set to zero and the load removed
    function drawPassive(cv, th, hl) {
      const src = th.circuit || app.circuit;
      const comps = [], wires = src.wires.slice();
      for (const c of src.comps) {
        if (c.id === th.loadId) continue;
        const ts = C.terminals(c);
        if (c.type === 'vsource' || c.type === 'ammeter' || (C.isSwitch(c) && C.isClosed(c))) { wires.push({ id: 'p' + c.id, x1: ts[0][0], y1: ts[0][1], x2: ts[1][0], y2: ts[1][1] }); continue; }
        if (c.type === 'isource' || c.type === 'voltmeter' || C.isSwitch(c)) continue;
        comps.push(c);
      }
      const circuit = { comps, wires };
      const rd = new R.Renderer(cv);
      rd.resize();
      if (!rd.w || !rd.h) return;
      const view = app.fitView({ comps, wires: wires.concat([{ x1: th.a[0], y1: th.a[1], x2: th.b[0], y2: th.b[1] }]) }, rd.w, rd.h, 1.15, 14);
      rd.draw({
        circuit, view, sel: new Set(), net: DCS.netlist.build(circuit), result: null, overlay: { hl }, port: { a: th.a, b: th.b }, flow: null, fontPx: 11,
        settings: Object.assign({}, app.settings, { grid: false, showNames: true, showValues: true, animate: false, realDir: true }), tr: app.tp
      });
    }

    function drawEquivalent(cv, kind, r, lab) {
      const mk = (type, name, x, y, rot, props) => ({ id: name, type, name, x, y, rot, flip: false, props: Object.assign(C.defaults(type), props) });
      let circuit;
      if (kind === 'thev') {
        circuit = {
          comps: [mk('vsource', lab.vth, 0, 3, 1, { V: r.vth }), mk('resistor', lab.rth, 4, -1, 0, { R: r.rth })],
          wires: [{ id: 'a', x1: 0, y1: 1, x2: 0, y2: -1 }, { id: 'b', x1: 0, y1: -1, x2: 2, y2: -1 }, { id: 'c', x1: 6, y1: -1, x2: 9, y2: -1 }, { id: 'd', x1: 0, y1: 5, x2: 0, y2: 7 }, { id: 'e', x1: 0, y1: 7, x2: 9, y2: 7 }]
        };
      } else {
        circuit = {
          comps: [mk('isource', lab.in, 0, 3, 3, { I: r.in }), mk('resistor', lab.rn, 5, 3, 1, { R: r.rth })],
          wires: [{ id: 'a', x1: 0, y1: 1, x2: 0, y2: -1 }, { id: 'b', x1: 0, y1: -1, x2: 9, y2: -1 }, { id: 'c', x1: 5, y1: -1, x2: 5, y2: 1 }, { id: 'd', x1: 0, y1: 5, x2: 0, y2: 7 }, { id: 'e', x1: 0, y1: 7, x2: 9, y2: 7 }, { id: 'f', x1: 5, y1: 5, x2: 5, y2: 7 }]
        };
      }
      const rd = new R.Renderer(cv);
      rd.resize();
      const view = app.fitView({ comps: circuit.comps, wires: circuit.wires.concat([{ x1: -6, y1: 0, x2: -6, y2: 0 }]) }, rd.w, rd.h, 1.2, 18);
      rd.draw({
        circuit, view, sel: new Set(), net: DCS.netlist.build(circuit), result: null, overlay: {}, port: { a: [9, -1], b: [9, 7] }, flow: null, fontPx: 12,
        settings: Object.assign({}, app.settings, { grid: false, showNames: true, showValues: true, animate: false }), tr: app.tp
      });
    }

    /* ---------- refresh ---------- */
    ui.update = function () {
      syncTools();
      syncSelbar();
      syncStatus();
      ui.updateHistory();
      if (tab === 'props') renderProps();
      else if (tab === 'results') renderResults();
      else renderThev();
      ui.updateMonitor();
    };
    // light refresh while dragging: status and pinned plot only, the panel follows on release
    ui.updateLive = function () { syncStatus(); ui.updateMonitor(); };

    /* ---------- pinned plot: a small window over the circuit that follows every change live ----------
     * app.monitor = { ids, idx, win: [], trail: [] }: the axes stay put while values change (they only grow
     * when Q leaves them) and Q leaves a trail, so its motion can be seen. */
    const mon = el('div', { class: 'monitor' });
    mon.hidden = true;
    const mhead = el('div', { class: 'mon-head' });
    const mtitle = el('span', { class: 'mon-title' });
    const mswap = button('⇄', () => { const m = app.monitor; if (m) { m.idx = m.idx ? 0 : 1; ui.updateMonitor(); } });
    const mreset = button('⟲', () => { const m = app.monitor; if (m) { m.win = []; m.trail = []; m.levels = null; ui.updateMonitor(); } });
    const mclose = button('✕', () => { app.monitor = null; ui.updateMonitor(); });
    mhead.appendChild(mtitle); mhead.appendChild(mswap); mhead.appendChild(mreset); mhead.appendChild(mclose);
    const mcv = el('canvas', { class: 'mon-cv' });
    mon.appendChild(mhead); mon.appendChild(mcv);
    $('stage').appendChild(mon);
    {
      // the window can be moved by its title bar
      let d = null;
      mhead.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        const r = mon.getBoundingClientRect(), s = $('stage').getBoundingClientRect();
        d = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, s };
        mhead.setPointerCapture(e.pointerId);
      });
      mhead.addEventListener('pointermove', (e) => {
        if (!d || d.id !== e.pointerId) return;
        const x = Math.max(0, Math.min(d.s.width - mon.offsetWidth, e.clientX - d.s.left - d.dx));
        const y = Math.max(0, Math.min(d.s.height - mon.offsetHeight, e.clientY - d.s.top - d.dy));
        Object.assign(mon.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
      });
      mhead.addEventListener('pointerup', () => { d = null; });
    }
    app.pinPlot = function (k) {
      app.monitor = { ids: app.selectedComps().map(c => c.id), idx: k || 0, win: [], trail: [] };
      ui.updateMonitor();
    };
    ui.updateMonitor = function () {
      const m = app.monitor;
      if (!m) { mon.hidden = true; return; }
      if (!m.ids.every(id => app.circuit.comps.some(c => c.id === id))) { app.monitor = null; mon.hidden = true; return; }
      let specs = null;
      try { specs = DCS.iv.build(app, m.ids, { levels: m.levels }); } catch (e) { console.error(e); }
      if (!specs) return;   // no solution right now: keep the last drawing
      specs = Array.isArray(specs) ? specs : [specs];
      // the transistor output curves stay those of the moment the plot was pinned: Q moves among them
      if (!m.levels) { const o = specs.find(s => s.levels); if (o) m.levels = o.levels; }
      const k = Math.min(m.idx, specs.length - 1), spec = specs[k];
      mon.hidden = false;
      mswap.hidden = specs.length < 2;
      mswap.title = t('mon_swap'); mreset.title = t('mon_reset'); mclose.title = t('close');
      mtitle.innerHTML = (spec.titleHtml || DCS.iv.subHtml(spec.title));
      const q = spec.points.find(p => p.label);
      const w = m.win[k] || (m.win[k] = Object.assign({}, spec.win));
      if (q) {
        const dv = w.v1 - w.v0, di = w.i1 - w.i0;
        if (q.v < w.v0) w.v0 = q.v - 0.1 * dv; if (q.v > w.v1) w.v1 = q.v + 0.1 * dv;
        if (q.i < w.i0) w.i0 = q.i - 0.1 * di; if (q.i > w.i1) w.i1 = q.i + 0.1 * di;
      }
      spec.win = w;
      const tr = m.trail[k] || (m.trail[k] = []);
      if (q) {
        const last = tr[tr.length - 1];
        if (!last || Math.abs(last[0] - q.v) > 2e-3 * (w.v1 - w.v0) || Math.abs(last[1] - q.i) > 2e-3 * (w.i1 - w.i0)) { tr.push([q.v, q.i]); if (tr.length > 120) tr.shift(); }
      }
      spec.trail = tr;
      DCS.iv.draw(mcv, spec, null);
    };

    translate();
    requestAnimationFrame(syncPalFade);
    ui.syncControls();
    ui.showTab('props', false);
    return ui;
  }

  DCS.UI = UI;
})(window);
