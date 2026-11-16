/* ============================================================
   Dev Diwali Special Offer popup  (behaviour)
   - Opens automatically on page load.
   - Closes with the X button, a tap outside the card, or Esc.
   - Edit OPTIONS below (phone, taglines, how often it shows).
   - Reusable: DevDiwaliPopup.init({...}), .open(), .close()
   ============================================================ */
(function () {
  'use strict';

  // Safe if the script tag is ever included twice: only the first copy runs.
  if (window.DevDiwaliPopup) return;

  var DEFAULTS = {
    phoneDisplay: '8887936376',
    phoneIntl: '+918887936376',     // used in the tel: link
    delay: 700,                     // ms to wait before showing
    frequency: 'load',              // 'load' = every visit/refresh, 'session' = once per tab session, 'day' = once per 24h
    storageKey: 'ddp-dev-diwali',
    taglineInterval: 3200,          // ms between taglines
    taglines: [
      'This Dev Diwali, Let Your Journey Shine!',
      'Celebrate More, Travel More, Spend Less!',
      'Your Perfect Ride Is Just a Call Away!',
      'Ride Safe, Ride Smart – Get a FREE Helmet!',
      'Light Up Your Festival with an Amazing Ride!'
    ]
  };

  /* [left %, size px, duration s, delay s, character, sway px] */
  var PARTICLES = [
    [8,  22, 9,  0,   '🪔', 10],
    [24, 14, 7,  1.5, '✨',      -14],
    [42, 20, 10, 3,   '🪔', 12],
    [60, 13, 7.5, .8, '✨',       16],
    [76, 24, 11, 2.2, '🪔', -10],
    [90, 14, 8,  4,   '✨',      -12],
    [16, 16, 8.5, 5,  '✦',       14],
    [52, 15, 9.5, 6,  '✦',      -16],
    [84, 18, 10, 7,   '🪔', 10]
  ];

  var state = { opts: null, root: null, timers: [], tagIndex: 0, lastFocus: null, built: false };

  /* ---- tiny helpers ---- */
  function store(type) { try { return type === 'day' ? window.localStorage : window.sessionStorage; } catch (e) { return null; } }
  function alreadySeen(o) {
    if (o.frequency === 'load') return false;
    var s = store(o.frequency === 'day' ? 'day' : 'session');
    if (!s) return false;
    try {
      var v = s.getItem(o.storageKey);
      if (!v) return false;
      return o.frequency === 'session' ? true : (Date.now() - Number(v) < 864e5);
    } catch (e) { return false; }
  }
  function markSeen(o) {
    if (o.frequency === 'load') return;
    var s = store(o.frequency === 'day' ? 'day' : 'session');
    try { if (s) s.setItem(o.storageKey, String(Date.now())); } catch (e) {}
  }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---- build the DOM once ---- */
  function build(o) {
    var bulbs = new Array(11 + 1).join('<i></i>');
    var fx = PARTICLES.map(function (p) {
      return '<span style="--x:' + p[0] + '%;--s:' + p[1] + 'px;--d:' + p[2] + 's;--delay:' + p[3] + 's;--sway:' + p[5] + 'px">' + p[4] + '</span>';
    }).join('');
    var telHref = 'tel:' + o.phoneIntl;

    var root = document.createElement('div');
    root.className = 'ddp';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'ddp-title');
    root.setAttribute('aria-describedby', 'ddp-sub');
    root.innerHTML =
      '<div class="ddp__overlay" data-ddp-close></div>' +
      '<div class="ddp__card" tabindex="-1">' +
        '<div class="ddp__glow" aria-hidden="true"></div>' +
        '<div class="ddp__lights" aria-hidden="true">' + bulbs + '</div>' +
        '<div class="ddp__fx" aria-hidden="true">' + fx + '</div>' +
        '<button type="button" class="ddp__close" aria-label="Close offer popup" data-ddp-close>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>' +
        '</button>' +
        '<div class="ddp__scroll">' +
          '<p class="ddp__brand">Shri Kuber Travel<span class="ddp__loc"> · Varanasi</span></p>' +
          '<h2 class="ddp__title" id="ddp-title">' +
            '<span><span class="ddp__diya">🪔</span> DEV DIWALI</span>' +
            '<span>SPECIAL OFFER <span class="ddp__diya">🪔</span></span>' +
          '</h2>' +
          '<p class="ddp__sub" id="ddp-sub">Celebrate Dev Diwali with a ride full of freedom, comfort, and excitement!</p>' +
          '<ul class="ddp__offers">' +
            '<li><span class="ddp__ico" aria-hidden="true">🚗</span><span>All types of <strong>cars and scooters</strong> available for rent</span></li>' +
            '<li><span class="ddp__ico" aria-hidden="true">🪔</span><span>Special <strong>Dev Diwali</strong> rental offers</span></li>' +
            '<li class="ddp__hot"><span class="ddp__ico" aria-hidden="true">⛑️</span><span>Get a <strong>FREE HELMET</strong> with your scooter rental</span></li>' +
            '<li><span class="ddp__ico" aria-hidden="true">💰</span><span>Affordable rental prices and a hassle-free booking experience</span></li>' +
          '</ul>' +
        '</div>' +
        '<div class="ddp__foot">' +
          '<p class="ddp__tag" id="ddp-tag">' + esc(o.taglines[0]) + '</p>' +
          '<div class="ddp__ctawrap">' +
            '<a class="ddp__cta" href="' + esc(telHref) + '">' +
              '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z"/></svg>' +
              '<span>Book Your Ride Now</span>' +
            '</a>' +
          '</div>' +
          '<p class="ddp__call"><span aria-hidden="true">📞</span> Call Now: <a href="' + esc(telHref) + '">' + esc(o.phoneDisplay) + '</a></p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);

    root.addEventListener('click', function (e) {
      // X button, dark overlay, or the empty padding around the card
      if (e.target === root || e.target.closest('[data-ddp-close]')) close();
    });
    return root;
  }

  /* ---- tagline rotator ---- */
  function stopTaglines() { state.timers.forEach(clearTimeout); state.timers.forEach(clearInterval); state.timers = []; }
  function startTaglines() {
    stopTaglines();
    if (reducedMotion() || state.opts.taglines.length < 2) return;
    var el = state.root.querySelector('#ddp-tag');
    var iv = setInterval(function () {
      if (document.hidden) return;
      el.classList.add('is-out');
      state.timers.push(setTimeout(function () {
        state.tagIndex = (state.tagIndex + 1) % state.opts.taglines.length;
        el.textContent = state.opts.taglines[state.tagIndex];
        el.classList.remove('is-out');
      }, 350));
    }, state.opts.taglineInterval);
    state.timers.push(iv);
  }

  /* ---- keyboard: Esc closes, Tab stays inside the popup ---- */
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { close(); return; }
    if (e.key !== 'Tab') return;
    var f = state.root.querySelectorAll('button, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], active = document.activeElement;
    var onCard = active === state.root.querySelector('.ddp__card');
    if (onCard || !state.root.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  /* ---- public: open / close ---- */
  function open() {
    if (!state.opts) init();
    if (!state.root) { state.root = build(state.opts); state.built = true; }
    if (!state.root.hidden) return;
    state.lastFocus = document.activeElement;
    state.root.hidden = false;
    document.documentElement.classList.add('ddp-lock');
    document.addEventListener('keydown', onKey);
    markSeen(state.opts);
    startTaglines();
    // Move focus into the dialog (no visible ring); first Tab lands on the X button.
    var card = state.root.querySelector('.ddp__card');
    if (card) card.focus({ preventScroll: true });
  }

  function close() {
    if (!state.root || state.root.hidden) return;
    state.root.hidden = true;                 // closes instantly
    document.documentElement.classList.remove('ddp-lock');
    document.removeEventListener('keydown', onKey);
    stopTaglines();
    try { if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  function init(userOpts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    if (userOpts) for (k in userOpts) o[k] = userOpts[k];
    state.opts = o;
    return api;
  }

  var api = { init: init, open: open, close: close };
  window.DevDiwaliPopup = api;

  /* ---- auto-start ---- */
  function autoStart() {
    if (!state.opts) init();
    if (alreadySeen(state.opts)) return;
    setTimeout(open, state.opts.delay);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoStart);
  else autoStart();
})();