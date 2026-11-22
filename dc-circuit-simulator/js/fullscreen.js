/* copy of .claude/skills/plot-interactions/assets/fullscreen.js */
/* fullscreen.js — full-screen button and exit pill for ferrucci-lab.com apps (skill plot-interactions).
 *
 * F11 is the browser's own full screen: hovering the top edge brings its tab and address bars back, and a
 * page cannot change that. This uses the page's Fullscreen API instead, where hovering the top shows no
 * browser bar; the app shows its own semi-transparent pill there to leave full screen.
 *
 *   const fs = AppFullscreen.install({button: document.getElementById('fsBtn'), texts: () => TXT[LANG]});
 *   fs.refresh();   // after a language change
 *
 * The button's content is replaced by the icon, unless it holds a `.fs-icon` element (the icon goes there)
 * and possibly a `.fs-label` element (the text goes there): for headers whose buttons carry a label shown in
 * a menu on small screens (dc-circuit-simulator).
 *
 * texts(): {fullscreen, exitFullscreen, exitPill}. The button gets its icon and title from here; style it as
 * the theme button next to it. Where the browser has no page full screen (iPhone Safari), the button is hidden.
 * F11 is caught (best effort): where the browser lets a page take that key, F11 enters this mode instead;
 * where it does not, F11 keeps doing what the browser does. On entry the browser still shows its own short
 * "press Esc to exit" notice, and some browsers a small ✕ of their own on top hover: a page cannot remove them.
 */
(function(global){
  'use strict';
  const ICON_ENTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M4 4l6 6M20 9V4h-5M20 4l-6 6M4 15v5h5M4 20l6-6M20 15v5h-5M20 20l-6-6"/></svg>';
  const ICON_EXIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M9 9L3 3M15 4v5h5M15 9l6-6M9 20v-5H4M9 15l-6 6M15 20v-5h5M15 15l6 6"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const CSS = `
.fs-btn .fs-icon{display:inline-flex}
.fs-btn svg{width:18px; height:18px; display:block; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round}
.fs-pill{position:fixed; top:10px; left:50%; z-index:100; transform:translate(-50%, -6px); display:flex; align-items:center; gap:8px;
  padding:8px 16px 8px 12px; border-radius:999px; border:1px solid rgba(214,168,0,.75);
  background:rgba(255,236,140,.82); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px);
  color:#3d2f00; font:inherit; font-size:14px; line-height:1.2; cursor:pointer; box-shadow:0 6px 22px rgba(0,0,0,.18);
  opacity:0; pointer-events:none; transition:opacity .2s, transform .2s}
html.dark .fs-pill, html[data-theme="dark"] .fs-pill{background:rgba(120,92,8,.78); color:#fff3c4; box-shadow:0 6px 22px rgba(0,0,0,.45)}
.fs-pill.show{opacity:.92; transform:translate(-50%, 0); pointer-events:auto}
.fs-pill:hover, .fs-pill:focus-visible{opacity:1}
.fs-pill svg{width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round}
`;
  const DEFAULT_TEXTS = {fullscreen:'Full screen', exitFullscreen:'Exit full screen', exitPill:'Exit full screen (Esc)'};

  function install({button, texts} = {}){
    const d = document, root = d.documentElement;
    const T = () => Object.assign({}, DEFAULT_TEXTS, typeof texts === 'function' ? texts() : (texts || {}));
    if(!d.getElementById('fs-style')){ const st = d.createElement('style'); st.id = 'fs-style'; st.textContent = CSS; d.head.appendChild(st); }
    const enabled = !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
    if(!enabled || !(root.requestFullscreen || root.webkitRequestFullscreen)){
      if(button) button.hidden = true;
      return {refresh(){}, isFullscreen:() => false};
    }
    const isFs = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
    const swallow = r => { if(r && typeof r.catch === 'function') r.catch(() => {}); };
    const enter = () => swallow(root.requestFullscreen ? root.requestFullscreen({navigationUI:'hide'}) : root.webkitRequestFullscreen());
    const exit = () => swallow(d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen());
    const toggle = () => { try{ isFs() ? exit() : enter(); }catch(_){} };

    const pill = d.createElement('button');
    pill.type = 'button'; pill.className = 'fs-pill';
    d.body.appendChild(pill);
    let hideTimer = 0;
    const show = ms => {
      clearTimeout(hideTimer); hideTimer = 0;
      pill.classList.add('show');
      if(ms) hideTimer = setTimeout(hide, ms);
    };
    const hide = () => { clearTimeout(hideTimer); hideTimer = 0; pill.classList.remove('show'); };

    function refresh(){
      const t = T(), on = isFs();
      if(button){
        button.classList.add('fs-btn');
        const slot = button.querySelector('.fs-icon'), label = button.querySelector('.fs-label');
        if(slot) slot.innerHTML = on ? ICON_EXIT : ICON_ENTER; else button.innerHTML = on ? ICON_EXIT : ICON_ENTER;
        if(label) label.textContent = on ? t.exitFullscreen : t.fullscreen;
        button.title = on ? t.exitFullscreen : t.fullscreen;
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-pressed', String(on));
      }
      pill.innerHTML = ICON_CLOSE + '<span></span>';
      pill.lastChild.textContent = t.exitPill;
      pill.setAttribute('aria-label', t.exitFullscreen);
    }
    if(button) button.addEventListener('click', e => { toggle(); if(e.detail) button.blur(); });
    pill.addEventListener('click', () => { hide(); exit(); });
    const onChange = () => { refresh(); if(isFs()) show(2500); else hide(); };
    d.addEventListener('fullscreenchange', onChange);
    d.addEventListener('webkitfullscreenchange', onChange);
    // the top edge brings the pill back, as the browser would bring its bar back in F11 mode
    d.addEventListener('mousemove', e => {
      if(!isFs()) return;
      if(e.clientY <= 48) show(0);
      else if(e.clientY > 110 && pill.classList.contains('show') && !pill.matches(':hover')) hideTimer = hideTimer || setTimeout(hide, 600);
    }, {passive:true});
    d.addEventListener('touchstart', e => { if(isFs() && e.touches[0] && e.touches[0].clientY <= 48) show(3000); }, {passive:true});
    // F11: this full screen instead of the browser's, where the browser lets a page take the key
    d.addEventListener('keydown', e => {
      if(e.key !== 'F11' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      toggle();
    }, true);
    refresh();
    return {refresh, isFullscreen:isFs};
  }

  global.AppFullscreen = {install};
})(window);
