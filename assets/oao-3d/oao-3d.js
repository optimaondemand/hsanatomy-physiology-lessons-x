/*
 * OAO 3D model card: click-to-load, spin-only 3D viewer for lesson, reading and assignment pages.
 * Follows "How We Embed 3D Models in OAO Lessons": the viewer script and the model load only
 * after a student taps the button, and nothing loads from outside sites.
 *
 * ONE MODEL (paths are relative to the page):
 *   <div class="oao-3d" data-title="The heart and its great vessels"
 *        data-src="../../assets/models/07-05-heart-great-vessels.glb"
 *        data-poster="../../assets/models/07-05-heart-great-vessels.webp"
 *        data-alt="3D model of the heart and great vessels"
 *        data-orbit="0deg 80deg auto"          optional starting angle (and distance)
 *        data-target="0m 1.2m 0.1m"            optional starting focus point (default: middle of the model)
 *        data-spin="off"                       optional: start without spinning (default: spins, unless data-target is set)
 *        data-planes="on"                      optional: plane toggle buttons (models with plane materials)
 *        data-identify="off">                  optional: turn off tap-to-name
 *   </div>
 *   <script src="../../assets/oao-3d/oao-3d.js" defer></script>
 *
 * GALLERY (several models in one card; only one is ever loaded at a time):
 *   <div class="oao-3d" data-title="Bones of the skull" data-models='[
 *     {"label":"Whole skull","src":"...glb","poster":"...webp","orbit":"30deg 75deg auto"},
 *     {"label":"Lateral view","src":"...glb","orbit":"90deg 85deg 0.5m","target":"0m 1.55m 0.1m"}
 *   ]'></div>
 *   Each entry takes the same options as the one-model card (src, poster, alt, orbit, target, spin, planes, identify).
 *   If an entry has no poster, the .webp beside its .glb is used.
 *
 * Only one card on a page is open at a time: opening another closes the first (saves memory on Chromebooks).
 * Authors: add ?author=1 to the page address to see the current view as orbit/target text you can paste.
 */
(function () {
  'use strict';
  if (window.__oao3d) return; window.__oao3d = true;

  var me = document.currentScript || document.querySelector('script[src*="oao-3d.js"]');
  var BASE = me ? me.src.replace(/oao-3d\/oao-3d\.js.*$/, '') : '';
  var VIEWER = BASE + 'vendor/model-viewer-umd.min.js';
  var AUTHOR = /[?&]author=1\b/.test(location.search);
  var NAVY = '#0E1C42', CYAN = '#55C8E8', GOLD = '#C7922C';
  var H = 440; // same height closed and open, so the page never jumps

  var css = [
    '.oao-3d{border:1px solid #D0D9E8;border-top:4px solid ' + GOLD + ';border-radius:8px;overflow:hidden;margin:0 0 16px;background:#fff;font-family:inherit}',
    '.oao-3d-head{display:flex;align-items:center;gap:12px;padding:12px 18px;background:#FDF3E3;border-bottom:1px solid #EBD7B0}',
    '.oao-3d-head .ic{font-size:26px;line-height:1}',
    '.oao-3d-head .k{font-size:11px;color:' + GOLD + ';letter-spacing:.04em}',
    '.oao-3d-head .t{font-size:18px;color:' + NAVY + '}',
    '.oao-3d-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:8px 14px;background:#F6F8FC;border-bottom:1px solid #E3E8F2}',
    '.oao-3d-tabs button{font:inherit;font-size:14px;border:1px solid #C9D2E3;background:#fff;color:' + NAVY + ';padding:5px 12px;border-radius:16px;cursor:pointer}',
    '.oao-3d-tabs button[aria-selected="true"]{background:' + NAVY + ';border-color:' + NAVY + ';color:#fff}',
    '.oao-3d-stage{position:relative;height:' + H + 'px;background:radial-gradient(ellipse at 50% 40%,#ffffff 0%,#EEF1F8 70%,#DDE3EF 100%)}',
    '.oao-3d-stage model-viewer{width:100%;height:100%;--poster-color:transparent;--progress-bar-color:' + CYAN + '}',
    '.oao-3d-cover{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;border:0;padding:0;background:transparent;width:100%}',
    '.oao-3d-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}',
    '.oao-3d-play{position:relative;display:inline-flex;align-items:center;gap:10px;background:' + NAVY + ';color:#fff;font-size:17px;padding:13px 22px;border-radius:30px;box-shadow:0 4px 14px rgba(14,28,66,.35)}',
    '.oao-3d-play .tri{display:inline-block;width:0;height:0;border-left:13px solid ' + CYAN + ';border-top:8px solid transparent;border-bottom:8px solid transparent}',
    '.oao-3d-cover:hover .oao-3d-play,.oao-3d-cover:focus .oao-3d-play{background:#1b2f66}',
    '.oao-3d-bar{position:absolute;right:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}',
    '.oao-3d-bar button,.oao-3d-planes button{font:inherit;font-size:13px;border:1px solid #C9D2E3;background:rgba(255,255,255,.92);color:' + NAVY + ';padding:6px 11px;border-radius:16px;cursor:pointer}',
    '.oao-3d-bar button:hover,.oao-3d-planes button:hover{background:#fff;border-color:' + NAVY + '}',
    '.oao-3d-planes{position:absolute;left:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap}',
    '.oao-3d-planes button[aria-pressed="false"]{opacity:.55;text-decoration:line-through}',
    '.oao-3d-planes .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}',
    '.oao-3d-name{position:absolute;left:50%;top:12px;transform:translateX(-50%);max-width:90%;background:' + NAVY + ';color:#fff;font-size:15px;padding:7px 14px;border-radius:18px;box-shadow:0 3px 10px rgba(0,0,0,.2);pointer-events:none;opacity:0;transition:opacity .15s;text-align:center}',
    '.oao-3d-name.on{opacity:1}',
    '.oao-3d-author{position:absolute;left:10px;top:10px;font:12px/1.4 monospace;background:rgba(255,255,255,.95);border:1px dashed ' + GOLD + ';padding:6px 8px;border-radius:6px;color:#333;max-width:70%}',
    '.oao-3d-author button{font:inherit;margin-top:4px;cursor:pointer}',
    '.oao-3d-msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:' + NAVY + ';font-size:16px;text-align:center;padding:20px}',
    '.oao-3d-foot{padding:9px 18px;font-size:13px;color:#5a6785;border-top:1px solid #E3E8F2;background:#FAFBFD}',
    '.oao-3d-stage:fullscreen{height:100%}',
    '@media (max-width:600px){.oao-3d-stage{height:360px}.oao-3d-head .t{font-size:16px}}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var loading = null;
  function loadViewer() {
    if (window.customElements && customElements.get('model-viewer')) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = VIEWER; s.onload = ok;
      s.onerror = function () { loading = null; bad(); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  var PLANES = [
    { match: /sagittal/i, label: 'Sagittal', color: '#D93333' },
    { match: /frontal|coronal/i, label: 'Frontal', color: '#3373D9' },
    { match: /transverse/i, label: 'Transverse', color: '#F2CC33' }
  ];

  // The list of models a card shows: a gallery (data-models) or a single model (data-src).
  function modelsOf(card) {
    var d = card.dataset, list = null;
    if (d.models) { try { list = JSON.parse(d.models); } catch (e) { list = null; } }
    if (!list || !list.length) list = [{ src: d.src, poster: d.poster, alt: d.alt, orbit: d.orbit, target: d.target, spin: d.spin, planes: d.planes, identify: d.identify }];
    list.forEach(function (m) {
      if (!m.poster && m.src) m.poster = m.src.replace(/\.glb$/i, '.webp');
      if (m.identify == null) m.identify = d.identify;
      if (m.planes == null) m.planes = d.planes;
      if (m.spin == null) m.spin = d.spin || (m.target ? 'off' : 'on'); // a preset close-up view stays still
    });
    return list;
  }

  var openCard = null; // only one viewer open per page

  function build(card) {
    var d = card.dataset, title = d.title || 'Look closer';
    card.__models = modelsOf(card);
    card.__index = 0;
    card.innerHTML = '';
    var head = el('div', { 'class': 'oao-3d-head' },
      '<span class="ic" aria-hidden="true">&#129482;</span><div><div class="k">LOOK CLOSER IN 3D</div><div class="t"></div></div>');
    head.querySelector('.t').textContent = title;
    card.appendChild(head);

    if (card.__models.length > 1) {
      var tabs = el('div', { 'class': 'oao-3d-tabs', role: 'tablist', 'aria-label': 'Choose a model' });
      card.__models.forEach(function (m, i) {
        var b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(i === 0) });
        b.textContent = m.label || ('Model ' + (i + 1));
        b.addEventListener('click', function () { choose(card, i); });
        tabs.appendChild(b);
      });
      card.appendChild(tabs);
    }

    var stage = el('div', { 'class': 'oao-3d-stage' });
    card.__stage = stage;
    card.appendChild(stage);
    showCover(card);

    var anyId = card.__models.some(function (m) { return m.identify !== 'off'; });
    card.appendChild(el('div', { 'class': 'oao-3d-foot' },
      'Drag to turn it. Scroll or pinch to zoom. <strong>Double-click (or double-tap) any spot to center on it and zoom in</strong>; ' +
      'right-drag or two-finger drag to slide it. Reset view goes back to the start.' +
      (anyId ? ' <strong>Tap any part to see its name.</strong>' : '') +
      (d.credit ? ' ' + d.credit : ' 3D models by Alensia.')));
  }

  function showCover(card) {
    var stage = card.__stage, m = card.__models[card.__index];
    stage.innerHTML = '';
    var label = card.__models.length > 1 && m.label ? ': ' + m.label : '';
    var cover = el('button', { 'class': 'oao-3d-cover', type: 'button', 'aria-label': 'Open the 3D model: ' + (card.dataset.title || '') + label });
    if (m.poster) { var im = el('img', { src: m.poster, alt: '' }); im.onerror = function () { im.remove(); }; cover.appendChild(im); }
    cover.appendChild(el('span', { 'class': 'oao-3d-play' }, '<span class="tri" aria-hidden="true"></span>Open the 3D model'));
    cover.addEventListener('click', function () { open(card, cover); });
    stage.appendChild(cover);
  }

  function choose(card, i) {
    if (i === card.__index) return;
    card.__index = i;
    Array.prototype.forEach.call(card.querySelectorAll('.oao-3d-tabs button'), function (b, j) { b.setAttribute('aria-selected', String(j === i)); });
    if (card.__mv) open(card, null); else showCover(card);
  }

  function close(card) {
    if (!card || !card.__mv) return;
    if (document.fullscreenElement && card.contains(document.fullscreenElement)) { try { document.exitFullscreen(); } catch (e) {} }
    card.__mv = null;
    showCover(card);
    if (openCard === card) openCard = null;
  }

  function open(card, cover) {
    if (openCard && openCard !== card) close(openCard);
    openCard = card;
    var stage = card.__stage, m = card.__models[card.__index];
    if (cover) {
      var play = cover.querySelector('.oao-3d-play');
      cover.disabled = true; play.lastChild.textContent = 'Loading the 3D model…';
    }
    loadViewer().then(function () {
      if (openCard !== card) return; // another card was opened while the viewer script loaded
      var mv = el('model-viewer', {
        src: m.src, alt: m.alt || m.label || card.dataset.title || '3D model',
        'camera-controls': '', 'auto-rotate-delay': '2500', 'rotation-per-second': '20deg',
        'touch-action': 'pan-y', 'shadow-intensity': '1', 'exposure': '1.05', 'interaction-prompt': 'none',
        'interpolation-decay': '120', 'disable-tap': '',
        'min-camera-orbit': 'auto auto 2%', 'max-camera-orbit': 'auto auto 250%'
      });
      if (m.spin !== 'off') mv.setAttribute('auto-rotate', '');
      if (m.orbit) mv.setAttribute('camera-orbit', m.orbit);
      if (m.target) mv.setAttribute('camera-target', m.target);
      card.__mv = mv;
      var name = el('div', { 'class': 'oao-3d-name', 'aria-live': 'polite' });
      var bar = el('div', { 'class': 'oao-3d-bar' });
      var spinning = m.spin !== 'off';
      var spin = el('button', { type: 'button', 'aria-pressed': String(spinning) }, spinning ? 'Pause spin' : 'Spin');
      var reset = el('button', { type: 'button' }, 'Reset view');
      var full = el('button', { type: 'button' }, 'Full screen');
      var shut = el('button', { type: 'button' }, 'Close');
      bar.appendChild(spin); bar.appendChild(reset);
      if (stage.requestFullscreen) bar.appendChild(full);
      bar.appendChild(shut);

      mv.addEventListener('error', function () {
        stage.innerHTML = '<div class="oao-3d-msg">The 3D model couldn’t load. Reload the page to try again.</div>';
        card.__mv = null; if (openCard === card) openCard = null;
      });
      mv.addEventListener('load', function () { if (m.planes === 'on') addPlanes(mv, stage); });

      function stopSpin() {
        if (mv.hasAttribute('auto-rotate')) { mv.removeAttribute('auto-rotate'); spin.textContent = 'Spin'; spin.setAttribute('aria-pressed', 'false'); }
      }
      spin.addEventListener('click', function () {
        var on = mv.hasAttribute('auto-rotate');
        if (on) mv.removeAttribute('auto-rotate'); else mv.setAttribute('auto-rotate', '');
        spin.textContent = on ? 'Spin' : 'Pause spin'; spin.setAttribute('aria-pressed', String(!on));
      });
      reset.addEventListener('click', function () {
        mv.cameraOrbit = m.orbit || '0deg 75deg auto'; mv.cameraTarget = m.target || 'auto auto auto'; mv.fieldOfView = 'auto';
        clearPick();
      });
      full.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(function () {});
      });
      shut.addEventListener('click', function () { close(card); });

      // Taps (pointer events, not 'click': on touch screens the viewer swallows the click)
      //   single tap -> show the part's name (each part's material is named after the structure)
      //   double tap -> move the turning point to that spot and zoom in on it
      var picked = null, down = null, timer = null, lastTap = 0, lastXY = null;
      function clearPick() {
        if (picked) { try { picked.setEmissiveFactor([0, 0, 0]); } catch (e) {} picked = null; }
        name.classList.remove('on');
      }
      function focusAt(x, y) {
        var hit = mv.positionAndNormalFromPoint(x, y);
        if (!hit) return;
        var p = hit.position, o = mv.getCameraOrbit();
        stopSpin();
        mv.cameraTarget = p.x + 'm ' + p.y + 'm ' + p.z + 'm';
        mv.cameraOrbit = o.theta + 'rad ' + o.phi + 'rad ' + (o.radius * 0.35) + 'm';
      }
      function identify(x, y) {
        var mat = mv.materialFromPoint(x, y);
        if (!mat || mat.__oaoHidden) { clearPick(); return; }
        if (picked && picked !== mat) { try { picked.setEmissiveFactor([0, 0, 0]); } catch (er) {} }
        picked = mat;
        try { mat.setEmissiveFactor([0.28, 0.2, 0.02]); } catch (er) {}
        name.textContent = mat.name || 'Unnamed part';
        name.classList.add('on');
        clearTimeout(timer); timer = setTimeout(function () { name.classList.remove('on'); }, 6000);
      }
      mv.addEventListener('pointerdown', function (e) { if (e.isPrimary) down = [e.clientX, e.clientY, Date.now()]; });
      mv.addEventListener('pointerup', function (e) {
        if (!e.isPrimary || !down) return;
        var moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]), held = Date.now() - down[2];
        down = null;
        if (moved > 8 || held > 500 || e.button > 0) return; // a drag, a long press or a right-click
        var now = Date.now();
        if (now - lastTap < 400 && lastXY && Math.hypot(e.clientX - lastXY[0], e.clientY - lastXY[1]) < 30) {
          lastTap = 0; focusAt(e.clientX, e.clientY); return;
        }
        lastTap = now; lastXY = [e.clientX, e.clientY];
        if (m.identify !== 'off') identify(e.clientX, e.clientY);
      });
      mv.addEventListener('pointercancel', function () { down = null; });

      stage.innerHTML = '';
      stage.appendChild(mv); stage.appendChild(name); stage.appendChild(bar);
      if (AUTHOR) addAuthor(mv, stage);
    }, function () {
      if (openCard === card) openCard = null;
      showCover(card);
      var p = stage.querySelector('.oao-3d-play'); if (p) p.lastChild.textContent = 'The 3D model couldn’t load. Tap to try again.';
    });
  }

  function addPlanes(mv, stage) {
    var mats = (mv.model && mv.model.materials) || [];
    var wrap = el('div', { 'class': 'oao-3d-planes', role: 'group', 'aria-label': 'Show or hide body planes' });
    PLANES.forEach(function (p) {
      var m = mats.filter(function (x) { return p.match.test(x.name); })[0];
      if (!m) return;
      var base = m.pbrMetallicRoughness.baseColorFactor.slice();
      var b = el('button', { type: 'button', 'aria-pressed': 'true' }, '<span class="sw" style="background:' + p.color + '"></span>' + p.label);
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') === 'true';
        m.pbrMetallicRoughness.setBaseColorFactor([base[0], base[1], base[2], on ? 0 : base[3]]);
        m.__oaoHidden = on;
        b.setAttribute('aria-pressed', String(!on));
      });
      wrap.appendChild(b);
    });
    if (wrap.children.length) stage.appendChild(wrap);
  }

  // ?author=1: shows the current view so a curriculum writer can copy it into data-orbit / data-target.
  function addAuthor(mv, stage) {
    var box = el('div', { 'class': 'oao-3d-author' });
    var txt = el('div'); var copy = el('button', { type: 'button' }, 'Copy view');
    box.appendChild(txt); box.appendChild(copy); stage.appendChild(box);
    function r(n, k) { return Number(n).toFixed(k); }
    function now() {
      var o = mv.getCameraOrbit(), t = mv.getCameraTarget();
      return 'data-orbit="' + r(o.theta * 180 / Math.PI, 0) + 'deg ' + r(o.phi * 180 / Math.PI, 0) + 'deg ' + r(o.radius, 2) + 'm" ' +
             'data-target="' + r(t.x, 3) + 'm ' + r(t.y, 3) + 'm ' + r(t.z, 3) + 'm"';
    }
    function upd() { txt.textContent = now(); }
    mv.addEventListener('camera-change', upd); upd();
    copy.addEventListener('click', function () {
      try { navigator.clipboard.writeText(now()); copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy view'; }, 1500); } catch (e) {}
    });
  }

  function init() { Array.prototype.forEach.call(document.querySelectorAll('.oao-3d'), build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
