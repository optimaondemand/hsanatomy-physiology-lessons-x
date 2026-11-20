/*
 * OAO 3D model card — click-to-load, spin-only 3D viewer for lesson pages.
 * Follows "How We Embed 3D Models in OAO Lessons": the viewer script and the model
 * load only after a student taps the button, and nothing loads from outside sites.
 *
 * Markup (paste where the card should appear; paths are relative to the page):
 *   <div class="oao-3d" data-src="../../assets/models/07-05-heart-great-vessels.glb"
 *        data-poster="../../assets/models/07-05-heart-great-vessels.webp"
 *        data-alt="3D model of the heart and great vessels"
 *        data-orbit="0deg 80deg auto"          (optional starting view)
 *        data-planes="on"                      (optional: show plane toggle buttons)
 *        data-identify="on">                   (optional: tap a part to see its name; default on)
 *   </div>
 *   <script src="../../assets/oao-3d/oao-3d.js" defer></script>
 */
(function () {
  'use strict';
  if (window.__oao3d) return; window.__oao3d = true;

  var me = document.currentScript || document.querySelector('script[src*="oao-3d.js"]');
  var BASE = me ? me.src.replace(/oao-3d\/oao-3d\.js.*$/, '') : '';
  var VIEWER = BASE + 'vendor/model-viewer-umd.min.js';
  var NAVY = '#0E1C42', CYAN = '#55C8E8', GOLD = '#C7922C';
  var H = 440; // same height closed and open, so the page never jumps

  var css = [
    '.oao-3d{border:1px solid #D0D9E8;border-top:4px solid ' + GOLD + ';border-radius:8px;overflow:hidden;margin:0 0 16px;background:#fff;font-family:inherit}',
    '.oao-3d-head{display:flex;align-items:center;gap:12px;padding:12px 18px;background:#FDF3E3;border-bottom:1px solid #EBD7B0}',
    '.oao-3d-head .ic{font-size:26px;line-height:1}',
    '.oao-3d-head .k{font-size:11px;color:' + GOLD + ';letter-spacing:.04em}',
    '.oao-3d-head .t{font-size:18px;color:' + NAVY + '}',
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
    { key: 'sagittal', match: /sagittal/i, label: 'Sagittal', color: '#D93333' },
    { key: 'frontal', match: /frontal|coronal/i, label: 'Frontal', color: '#3373D9' },
    { key: 'transverse', match: /transverse/i, label: 'Transverse', color: '#F2CC33' }
  ];

  function build(card) {
    if (card.__built) return; card.__built = true;
    var d = card.dataset;
    var title = d.title || 'Look closer';
    card.innerHTML = '';
    var head = el('div', { 'class': 'oao-3d-head' },
      '<span class="ic" aria-hidden="true">&#129482;</span><div><div class="k">LOOK CLOSER IN 3D</div><div class="t"></div></div>');
    head.querySelector('.t').textContent = title;
    var stage = el('div', { 'class': 'oao-3d-stage' });
    var cover = el('button', { 'class': 'oao-3d-cover', type: 'button', 'aria-label': 'Open the 3D model: ' + title });
    if (d.poster) { var im = el('img', { src: d.poster, alt: '' }); cover.appendChild(im); }
    cover.appendChild(el('span', { 'class': 'oao-3d-play' }, '<span class="tri" aria-hidden="true"></span>Open the 3D model'));
    stage.appendChild(cover);
    var foot = el('div', { 'class': 'oao-3d-foot' },
      'Drag to turn it. Scroll or pinch to zoom. Right-drag or two-finger drag to move it.' +
      (d.identify === 'off' ? '' : ' <strong>Tap any part to see its name.</strong>') +
      (d.credit ? ' ' + d.credit : ' 3D model by Alensia.'));
    card.appendChild(head); card.appendChild(stage); card.appendChild(foot);
    cover.addEventListener('click', function () { open(card, stage, cover); });
  }

  function open(card, stage, cover) {
    var d = card.dataset;
    var play = cover.querySelector('.oao-3d-play');
    cover.disabled = true; play.lastChild.textContent = 'Loading the 3D model…';
    loadViewer().then(function () {
      var mv = el('model-viewer', {
        src: d.src, alt: d.alt || d.title || '3D model',
        'camera-controls': '', 'auto-rotate': '', 'auto-rotate-delay': '2500', 'rotation-per-second': '20deg',
        'touch-action': 'pan-y', 'shadow-intensity': '1', 'exposure': '1.05', 'interaction-prompt': 'none',
        'min-camera-orbit': 'auto auto 5%', 'max-camera-orbit': 'auto auto 250%'
      });
      if (d.orbit) { mv.setAttribute('camera-orbit', d.orbit); }
      var name = el('div', { 'class': 'oao-3d-name', 'aria-live': 'polite' });
      var bar = el('div', { 'class': 'oao-3d-bar' });
      var spin = el('button', { type: 'button', 'aria-pressed': 'true' }, 'Pause spin');
      var reset = el('button', { type: 'button' }, 'Reset view');
      var full = el('button', { type: 'button' }, 'Full screen');
      bar.appendChild(spin); bar.appendChild(reset);
      if (stage.requestFullscreen) bar.appendChild(full);

      mv.addEventListener('error', function () {
        stage.innerHTML = '<div class="oao-3d-msg">The 3D model couldn’t load. Reload the page to try again.</div>';
      });
      mv.addEventListener('load', function () {
        if (d.planes === 'on') addPlanes(mv, stage);
      });

      spin.addEventListener('click', function () {
        var on = mv.hasAttribute('auto-rotate');
        if (on) mv.removeAttribute('auto-rotate'); else mv.setAttribute('auto-rotate', '');
        spin.textContent = on ? 'Spin' : 'Pause spin'; spin.setAttribute('aria-pressed', String(!on));
      });
      reset.addEventListener('click', function () {
        mv.cameraOrbit = d.orbit || '0deg 75deg 105%'; mv.cameraTarget = 'auto auto auto'; mv.fieldOfView = 'auto';
        mv.jumpCameraToGoal && mv.jumpCameraToGoal(); clearPick();
      });
      full.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(function () {});
      });

      // Tap to identify (Sketchfab-style): each part's material is named after the structure.
      var picked = null, down = null, timer = null;
      function clearPick() {
        if (picked) { try { picked.setEmissiveFactor([0, 0, 0]); } catch (e) {} picked = null; }
        name.classList.remove('on');
      }
      if (d.identify !== 'off') {
        mv.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
        mv.addEventListener('click', function (e) {
          if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; // that was a drag
          var m = mv.materialFromPoint(e.clientX, e.clientY);
          if (!m || (m.__oaoHidden)) { clearPick(); return; }
          if (picked && picked !== m) { try { picked.setEmissiveFactor([0, 0, 0]); } catch (er) {} }
          picked = m;
          try { m.setEmissiveFactor([0.28, 0.2, 0.02]); } catch (er) {}
          name.textContent = m.name || 'Unnamed part';
          name.classList.add('on');
          clearTimeout(timer); timer = setTimeout(function () { name.classList.remove('on'); }, 6000);
        });
      }

      stage.innerHTML = '';
      stage.appendChild(mv); stage.appendChild(name); stage.appendChild(bar);
    }, function () {
      cover.disabled = false; play.lastChild.textContent = 'The 3D model couldn’t load. Tap to try again.';
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

  function init() { Array.prototype.forEach.call(document.querySelectorAll('.oao-3d'), build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
