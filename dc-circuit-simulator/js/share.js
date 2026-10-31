/* Sharing a circuit in class with a QR code: the share link (#c=…) drawn as a QR code, big enough to be
 * projected, plus the system share sheet; and a scanner (phone camera, or a photo) that opens a shared circuit
 * in a new tab. The QR libraries are loaded only when needed: js/vendor/qrcode.js (Kazuhiko Arase, MIT) to
 * make the code, js/vendor/jsQR.js (Cosmo Wolfe, Apache 2.0) to read it where the browser has no
 * BarcodeDetector (iPhone). */
(function (root) {
  'use strict';
  const DCS = root.DCS;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = src; s.onload = () => ok(); s.onerror = () => { loaded[src] = null; ko(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  const el = (tag, attrs, html) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  };
  function btn(label, fn, cls) {
    const b = el('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : '') }, label);
    b.addEventListener('click', fn);
    return b;
  }

  /* ---------- QR code of the share link ---------- */
  // the smallest code for the text (error correction L: fewer, larger modules, easier to read from the back of
  // a classroom; a projected or on-screen code is clean)
  function makeQR(text) {
    for (const ecc of ['L']) {
      try { const q = root.qrcode(0, ecc); q.addData(text, 'Byte'); q.make(); return q; } catch (e) { /* too long */ }
    }
    return null;
  }
  // black modules on white with the 4-module quiet zone, sharp at any size
  function drawQR(cv, q, cssSize) {
    const n = q.getModuleCount(), quiet = 4, tot = n + 2 * quiet;
    const dpr = Math.max(1, root.devicePixelRatio || 1);
    const m = Math.max(1, Math.floor(cssSize * dpr / tot));
    cv.width = cv.height = m * tot;
    cv.style.width = cv.style.height = (m * tot / dpr) + 'px';
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect((c + quiet) * m, (r + quiet) * m, m, m);
  }

  async function showQR(app, ui) {
    const t = app.t;
    const url = await app.shareLink();
    try { await loadScript('js/vendor/qrcode.js'); } catch (e) { app.toast(t('qr_libfail')); return; }
    const q = makeQR(url);
    const name = (app.tabs && app.tabs[app.tabIdx] && app.tabs[app.tabIdx].name) || '';
    const box = el('div', { class: 'qrbox' });
    if (!q) {
      box.appendChild(el('p', null, t('qr_toolong')));
      ui.openModal(t('qr_title'), box);
      return;
    }
    const cv = el('canvas', { class: 'qr-cv', title: app.tp('qr_full') });
    box.appendChild(cv);
    box.appendChild(el('div', { class: 'hint' }, t('qr_hint')));
    const row = el('div', { class: 'btnrow' });
    if (navigator.share) row.appendChild(btn('⇪ ' + t('qr_share'), async () => {
      try { await navigator.share({ title: name || app.tp('title'), text: app.tp('qr_share_text', { name }), url }); } catch (e) { /* cancelled */ }
    }, 'primary'));
    row.appendChild(btn(t('file_link'), async () => {
      try { await navigator.clipboard.writeText(url); app.toast(t('link_copied')); }
      catch (e) { const ta = el('textarea', { readonly: '', class: 'qr-url' }); ta.value = url; box.appendChild(ta); ta.select(); }
    }));
    row.appendChild(btn('⛶ ' + t('qr_full'), () => fullScreen(app, q, name)));
    box.appendChild(row);
    ui.openModal(t('qr_title') + (name ? ' · ' + esc(name) : ''), box);
    requestAnimationFrame(() => drawQR(cv, q, Math.min(320, box.clientWidth || 320)));
    cv.addEventListener('click', () => fullScreen(app, q, name));
  }

  // the code as large as the screen allows, to be projected in the classroom; a tap or Esc closes it
  function fullScreen(app, q, name) {
    const ov = el('div', { class: 'qrfull', role: 'dialog' });
    const cv = el('canvas');
    ov.appendChild(cv);
    ov.appendChild(el('div', { class: 'qrfull-cap' }, (name ? '<b>' + esc(name) + '</b> · ' : '') + app.t('qr_hint')));
    document.body.appendChild(ov);
    const size = () => drawQR(cv, q, Math.min(window.innerWidth * 0.92, window.innerHeight * 0.82));
    size();
    const close = () => { ov.remove(); window.removeEventListener('resize', size); document.removeEventListener('keydown', key, true); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    ov.addEventListener('click', close);
    window.addEventListener('resize', size);
    document.addEventListener('keydown', key, true);
  }

  /* ---------- scanner ---------- */
  async function scan(app, ui) {
    const t = app.t;
    const box = el('div', { class: 'scanbox' });
    const vwrap = el('div', { class: 'scan-video' });
    const video = el('video', { playsinline: '', muted: '', autoplay: '' });
    video.muted = true; video.playsInline = true;
    vwrap.appendChild(video);
    vwrap.appendChild(el('div', { class: 'scan-frame' }));
    const status = el('div', { class: 'hint' }, t('scan_hint'));
    const photo = el('input', { type: 'file', accept: 'image/*', hidden: '' });
    const row = el('div', { class: 'btnrow' });
    row.appendChild(btn(t('scan_photo'), () => photo.click()));
    box.appendChild(vwrap); box.appendChild(status); box.appendChild(row); box.appendChild(photo);

    let stream = null, timer = 0, done = false, detector = null;
    const stop = () => {
      done = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach(tr => tr.stop());
      stream = null;
    };
    ui.openModal(t('scan_title'), box, stop);

    // what was read: a circuit opens in a new tab; anything else is shown and the scan goes on
    let lastOther = '';
    async function found(text) {
      if (done || !text) return false;
      if (/#c=[zj]/.test(text)) {
        stop();
        const ok = await app.openShared(text);
        app.closeModal();
        app.toast(t(ok ? 'loaded' : 'load_err'));
        return true;
      }
      if (text !== lastOther) {
        lastOther = text;
        status.innerHTML = t('scan_other') + '<br><span class="qr-other">' + esc(text.slice(0, 200)) + '</span>';
      }
      return false;
    }
    const work = el('canvas');
    async function decode(src, w, h) {
      if (detector) {
        try { const r = await detector.detect(src); return r.length ? r[0].rawValue : null; } catch (e) { detector = null; }
      }
      await loadScript('js/vendor/jsQR.js');
      // downscaled: faster, and plenty for a code that fills part of the picture
      const k = Math.min(1, 800 / Math.max(w, h));
      work.width = Math.max(1, Math.round(w * k)); work.height = Math.max(1, Math.round(h * k));
      const ctx = work.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0, work.width, work.height);
      const img = ctx.getImageData(0, 0, work.width, work.height);
      const r = root.jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      return r ? r.data : null;
    }
    if ('BarcodeDetector' in root) {
      try {
        const f = await root.BarcodeDetector.getSupportedFormats();
        if (f.includes('qr_code')) detector = new root.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) { detector = null; }
    }

    // a photo of the code (when the camera cannot be used here, or a screenshot received in a chat)
    photo.addEventListener('change', async () => {
      const file = photo.files[0];
      photo.value = '';
      if (!file) return;
      try {
        const bmp = await createImageBitmap(file);
        const text = await decode(bmp, bmp.width, bmp.height);
        if (!text) { status.innerHTML = t('scan_none'); return; }
        await found(text);
      } catch (e) { status.innerHTML = t('scan_none'); }
    });

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      vwrap.hidden = true;
      status.innerHTML = t('scan_nocam');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      vwrap.hidden = true;
      status.innerHTML = t('scan_nocam');
      return;
    }
    if (done) { stop(); return; }
    video.srcObject = stream;
    try { await video.play(); } catch (e) { /* autoplay */ }
    const tick = async () => {
      if (done) return;
      if (video.readyState >= 2 && video.videoWidth) {
        try { if (await found(await decode(video, video.videoWidth, video.videoHeight))) return; } catch (e) { /* next frame */ }
      }
      if (!done) timer = setTimeout(tick, 120);
    };
    tick();
  }

  DCS.share = { showQR, scan, makeQR };
})(window);
