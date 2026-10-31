/* DOM side of the application: palette, header, side panel / bottom sheet, menus and dialogs. */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const C = DCS.comp, U = DCS.units, I = DCS.i18n, R = DCS.render;

  const PALETTE = [
    { type: 'resistor', key: 'resistor' }, { type: 'vsource', key: 'vsource' }, { type: 'isource', key: 'isource' },
    { type: 'ground', key: 'ground' }, { type: 'ammeter', key: 'ammeter' }, { type: 'voltmeter', key: 'voltmeter' },
    { type: 'diode', key: 'diode' }, { type: 'schottky', key: 'schottky' }, { type: 'opamp', key: 'opamp' },
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
    function drawPalette() {
      const col = R.colors().fg;
      for (const p of palButtons) {
        p.span.textContent = t('cs_' + p.it.key);
        p.b.title = app.tp('c_' + p.it.key);
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
    $('redoBtn').addEventListener('click', () => app.redo());
    ui.updateHistory = function () {
      $('undoBtn').disabled = !app.undoStack.length;
      $('redoBtn').disabled = !app.redoStack.length;
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
      requestAnimationFrame(() => { drawPalette(); app.renderer.resize(); app.fit(); });
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
      const dg = row(t('set_digits'), select([[3, '3'], [4, '4'], [5, '5']], s.digits));
      dg.addEventListener('change', () => { s.digits = +dg.value; changed(); });
      for (const [k, lab] of [['showNames', 'set_names'], ['showValues', 'set_values'], ['showState', 'set_state'], ['grid', 'set_grid'], ['colorV', 'colorV']]) {
        const c = row(t(lab), check(s[k]));
        c.addEventListener('change', () => { s[k] = c.checked; changed(); });
      }
      const tmp = row(t('set_temp'), el('input', { type: 'text', value: String(s.tempC) + ' °C', inputmode: 'decimal' }));
      tmp.addEventListener('change', () => { const v = parseFloat(tmp.value.replace(',', '.')); if (isFinite(v) && v > -100 && v < 300) { s.tempC = v; changed(true); } tmp.value = s.tempC + ' °C'; });
      const dm = row(t('set_defmodel'), select([['ideal', t('model_ideal')], ['cvd', t('model_cvd')], ['exact', t('model_exact')]], s.defModel));
      dm.addEventListener('change', () => { s.defModel = dm.value; app.saveSettings(); });
      const all = el('div', { class: 'btnrow' });
      const sel = select([['ideal', t('model_ideal')], ['cvd', t('model_cvd')], ['exact', t('model_exact')]], s.defModel);
      const ap = el('button', { type: 'button', class: 'btn primary' }, t('apply'));
      ap.addEventListener('click', () => {
        app.checkpoint();
        for (const c of app.circuit.comps) if (c.type === 'diode' || c.type === 'schottky') c.props.model = sel.value;
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
        case 'rotate': app.rotateSel(); break;
        case 'flip': app.flipSel(); break;
        case 'edit': app.openProps(true); break;
        case 'dup': app.duplicateSel(); break;
        case 'del': app.deleteSel(); break;
        case 'thev': { const c = app.selectedComps()[0]; if (c) app.portFromComp(c); break; }
      }
    });
    function syncSelbar() {
      const bar = $('selbar');
      const cs = app.selectedComps();
      bar.hidden = !(app.tool === 'select' && app.sel.size);
      const one = cs.length === 1 && app.sel.size === 1 ? cs[0] : null;
      bar.querySelector('[data-act=rotate]').hidden = !cs.length;
      bar.querySelector('[data-act=flip]').hidden = !cs.length;
      bar.querySelector('[data-act=edit]').hidden = app.sel.size !== 1;
      bar.querySelector('[data-act=thev]').hidden = !(one && C.TYPES[one.type].terms.length === 2);
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
      if (!h || !p || !res || isMobile()) { tip.hidden = true; return; }
      let html = '';
      if (h.kind === 'wire' || h.kind === 'wend') {
        const nd = app.net.wireNode.get(h.wire.id);
        html = `${t('node_voltage')}: <b>${fmt(res.v[nd], 'V')}</b>`;
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
    ui.showTab = function (name, open) {
      tab = name;
      document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
      for (const n of ['props', 'results', 'thev']) $('pane-' + n).hidden = n !== name;
      if (open && isMobile()) $('side').classList.add('open');
      ui.update();
    };
    $('sheetBtn').addEventListener('click', () => $('side').classList.toggle('open'));
    {
      // drag the grip down to close the sheet
      const grip = $('sheetGrip');
      let y0 = null;
      grip.addEventListener('pointerdown', (e) => { y0 = e.clientY; grip.setPointerCapture(e.pointerId); });
      grip.addEventListener('pointerup', (e) => { if (y0 != null && (e.clientY - y0 > 40 || Math.abs(e.clientY - y0) < 5)) $('side').classList.remove('open'); y0 = null; });
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
        const card = el('div', { class: 'card' }, `<h3>${t('wire_sel')}</h3>`);
        if (res) card.appendChild(el('dl', { class: 'kv' }, `<dt>${t('node_voltage')}</dt><dd class="v">${fmt(res.v[nd], 'V')}</dd><dt>${t('node')}</dt><dd>${nd === 0 ? '0 (⏚)' : 'N' + nd}</dd>`));
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
            app.commit();
          });
          field(propLabel(c, d), s);
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
        }
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
    function ivCard(pane) {
      let spec;
      try { spec = DCS.iv.build(app); } catch (e) { console.error(e); return; }
      if (!spec) return;
      const card = el('div', { class: 'card' });
      const head = el('div', { class: 'ivhead' });
      head.appendChild(el('h3', null, esc(spec.title)));
      card.appendChild(head);
      if (spec.series.length) {
        const big = el('button', { type: 'button', class: 'btn', title: plainText(t('iv_expand')) }, '⤢');
        big.addEventListener('click', () => {
          const box = el('div', { class: 'card' });
          openModal(esc(spec.title), box);
          DCS.iv.mount(box, spec, { big: true });
          if (spec.note) box.appendChild(el('div', { class: 'hint' }, spec.note));
          if (spec.conv) box.appendChild(el('div', { class: 'hint' }, spec.conv));
        });
        head.appendChild(big);
        DCS.iv.mount(card, spec);
      }
      if (spec.note) card.appendChild(el('div', { class: 'hint' }, spec.note));
      if (spec.conv) card.appendChild(el('div', { class: 'hint' }, spec.conv));
      pane.appendChild(card);
    }
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
      } else if (c.type === 'bjt') {
        const pnp = c.props.pol === 'pnp';
        html = `<dt>${t('res_region')}</dt><dd>${t('region_' + r.state)}</dd>` +
          `<dt>${t('ic')}</dt><dd class="i">${fmt(r.ic, 'A')}</dd><dt>${t('ib')}</dt><dd class="i">${fmt(r.ib, 'A')}</dd><dt>${t('ie')}</dt><dd class="i">${fmt(r.ie, 'A')}</dd>` +
          `<dt>${t(pnp ? 'veb' : 'vbe')}</dt><dd class="v">${fmt(r.vbe, 'V')}</dd><dt>${t(pnp ? 'vec' : 'vce')}</dt><dd class="v">${fmt(r.vce, 'V')}</dd>` +
          (r.state === 'act' && r.ib > 0 ? `<dt>I<sub>C</sub>/I<sub>B</sub></dt><dd>${(r.ic / r.ib).toFixed(1)}</dd>` : '') + pRow(r.p);
      } else {
        html = `<dt>${t('res_v')}</dt><dd class="v">${fmt(r.v, 'V')}</dd><dt>${t('res_i')}</dt><dd class="i">${fmt(r.i, 'A')}</dd>` + pRow(r.p);
        if ((c.type === 'diode' || c.type === 'schottky') && r.state) html += `<dt>${t('res_state')}</dt><dd>${t('state_' + r.state)}</dd>`;
        if (c.type === 'resistor') html += `<dt>V/R</dt><dd>${fmt(r.v / c.props.R, 'A')}</dd>`;
      }
      card.appendChild(el('dl', { class: 'kv' }, html));
      if (C.TYPES[c.type].terms.length === 2 && c.type !== 'ammeter' && c.type !== 'voltmeter') card.appendChild(el('div', { class: 'hint' }, t('conv')));
      // terminal voltages
      const nodes = app.net.compNodes.get(c.id);
      const names = C.TYPES[c.type].termNames || (c.type === 'diode' || c.type === 'schottky' ? ['A', 'K'] : ['1', '2']);
      card.appendChild(el('div', { class: 'hint' }, t('terminal_voltages') + ': ' + nodes.map((n, j) => `${names[j]} = ${fmt(res.v[n], 'V')}`).join(' · ')));
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
      const order = ['vsource', 'isource', 'resistor', 'diode', 'schottky', 'bjt', 'opamp', 'ammeter', 'voltmeter'];
      const comps = app.circuit.comps.filter(c => c.type !== 'ground').sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
      const tbl = el('table', { class: 'res' });
      let rows = `<tr><th>${t('tbl_comp')}</th><th>${t('tbl_v')}</th><th>${t('tbl_i')}</th><th>${t('tbl_p')}</th></tr>`;
      let pGen = 0, pAbs = 0;
      for (const c of comps) {
        const r = res.el[c.id];
        if (!r) continue;
        let v = r.v, i = r.i, p = r.p;
        if (c.type === 'opamp') { v = r.vout; i = r.iout; p = r.p; }
        if (c.type === 'bjt') { v = r.vce; i = r.ic; }
        if (c.type === 'opamp') { if (p > 0) pAbs += p; else pGen -= p; }
        else if (p >= 0) pAbs += p; else pGen -= p;
        const meter = c.type === 'ammeter' || c.type === 'voltmeter';
        rows += `<tr data-id="${esc(c.id)}"><td>${esc(c.name || '')}</td><td class="v">${c.type === 'ammeter' ? '' : fmt(v, 'V')}</td><td class="i">${c.type === 'voltmeter' ? '' : fmt(i, 'A')}</td>` +
          `<td class="${p < -1e-15 ? 'pg' : 'pa'}">${meter ? '' : fmt(p, 'W')}</td></tr>`;
      }
      tbl.innerHTML = rows;
      tbl.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) { app.select([tr.dataset.id]); ui.showTab('props', false); } });
      const card = el('div', { class: 'card' });
      card.appendChild(el('div', { class: 'hint' }, `V: ${t('v_ref')} · I: ${t('i_ref')} · P &gt; 0: ${t('absorbs')}, P &lt; 0: ${t('delivers')}`));
      card.appendChild(tbl);
      pane.appendChild(card);
      const bal = el('div', { class: 'card' }, `<h3>${t('balance')}</h3><dl class="kv"><dt>${t('p_gen')}</dt><dd class="pg">${fmt(pGen, 'W')}</dd><dt>${t('p_abs')}</dt><dd class="pa">${fmt(pAbs, 'W')}</dd><dt>${t('p_sum')}</dt><dd>${fmt(res.pSum, 'W')}</dd></dl>`);
      pane.appendChild(bal);
      // node voltages
      const nd = el('div', { class: 'card' }, `<h3>${t('nodes_title')}</h3>`);
      const nt = el('table', { class: 'res' });
      let nr = `<tr><th>${t('node')}</th><th>V</th></tr>`;
      for (const n of app.net.nodes) {
        if (n.id === 0 || !n.points.length) continue;
        const names = [];
        for (const p of n.points) for (const [cc, j] of p.terms) if (cc.type !== 'ground') names.push((cc.name || '') + (C.TYPES[cc.type].termNames ? '.' + C.TYPES[cc.type].termNames[j] : ''));
        nr += `<tr data-node="${n.id}"><td>N${n.id} <span class="muted" style="font-weight:400">${esc(Array.from(new Set(names)).slice(0, 4).join(', '))}</span></td><td class="v">${fmt(res.v[n.id], 'V')}</td></tr>`;
      }
      nt.innerHTML = nr;
      nt.addEventListener('pointerover', (e) => { const tr = e.target.closest('tr[data-node]'); app.hiNode = tr ? +tr.dataset.node : null; app.requestRender(); });
      nt.addEventListener('pointerleave', () => { app.hiNode = null; app.requestRender(); });
      nt.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-node]'); if (tr) { app.hiNode = +tr.dataset.node; app.requestRender(); } });
      nd.appendChild(nt);
      pane.appendChild(nd);
    }

    /* ---------- Thévenin pane ---------- */
    function renderThev() {
      const pane = $('pane-thev');
      pane.innerHTML = '';
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
      if (th.err) { pane.appendChild(el('div', { class: 'issue error' }, t(th.err))); return; }
      if (!th.res) return;
      const r = th.res;
      const load = th.loadId ? app.circuit.comps.find(c => c.id === th.loadId) : null;
      const card = el('div', { class: 'card' });
      card.appendChild(el('div', { class: 'hint' }, load ? t('thev_load', { name: `<b>${esc(load.name)}</b>`}) : t('thev_port')));
      const eq = el('div', { class: 'eq' });
      const fin = (x) => x !== undefined && isFinite(x);
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
      if (r.nonlinear) {
        card.appendChild(el('div', { class: 'issue warn' }, t('thev_nonlinear')));
        if (fin(r.isc) && fin(r.in) && Math.abs(r.isc - r.in) > 0.01 * Math.max(Math.abs(r.in), 1e-12)) {
          card.appendChild(el('div', { class: 'hint' }, t('thev_isc_check', { isc: fmt(r.isc, 'A'), calc: fmt(r.in, 'A') })));
        }
      }
      pane.appendChild(card);
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
    };
    // light refresh while dragging: status only, the panel follows on release
    ui.updateLive = function () { syncStatus(); };

    translate();
    ui.syncControls();
    ui.showTab('props', false);
    return ui;
  }

  DCS.UI = UI;
})(window);
