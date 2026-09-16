/* V3 Pro model-specific capability guards. */
(function () {
  if (window.V3ProCapabilities && window.V3ProCapabilities.version === 2) return;

  var root = document.getElementById('demo');

  function currentState() {
    return typeof state !== 'undefined' ? state : (window.state || null);
  }

  function enforce() {
    var current = currentState();
    if (!current) return;
    current.v3ProCapabilities = current.v3ProCapabilities || {};
    current.v3ProCapabilities.autoSwitch = false;

    /* Program sequencing remains available. Outside a selected program, the
       legacy state must not silently retain sensor-led automatic switching. */
    if (!current.selectedProgram && current.auto) current.auto = false;
  }

  function replaceProductVisuals() {
    if (!root) return;
    var pumpRow = root.querySelector('.v4-control > .v4-pump-row');
    if (pumpRow && !pumpRow.classList.contains('v3-pro-main-visual')) {
      pumpRow.className = 'v4-pump-row v3-pro-main-visual';
      pumpRow.innerHTML = '<img src="./assets/v3-pro-main.png" alt="V3 Pro pump">';
    }

    var dockPumps = root.querySelector('.v4-home-dock .v4-dock-pumps');
    if (dockPumps && !dockPumps.classList.contains('v3-pro-dock-visual')) {
      dockPumps.className = 'v4-dock-pumps v3-pro-dock-visual';
      dockPumps.innerHTML = '<img src="./assets/v3-pro-main.png" alt="V3 Pro pump">';
    }

    var deviceArt = root.querySelector('.v4-device-card .art');
    if (deviceArt && !deviceArt.classList.contains('v3-pro-device-art')) {
      deviceArt.classList.add('v3-pro-device-art');
      deviceArt.src = './assets/v3-pro-main.png';
      deviceArt.alt = 'V3 Pro pump';
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var textNode;
    while ((textNode = walker.nextNode())) {
      if (/Air\s*2/.test(textNode.nodeValue)) textNode.nodeValue = textNode.nodeValue.replace(/Air\s*2/g, 'V3 Pro');
    }
  }

  function clock(seconds) {
    var value = Math.max(0, Math.floor(Number(seconds) || 0));
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }

  function milkBoostCard() {
    var timer = state.running ? clock(state.timer) : '00:00';
    return '<section class="r49-boost-card v3-pro-boost-card" data-r49-boost-state="manual">' +
      '<div class="r49-boost__header"><span class="r49-boost__title">Milk Boost</span>' +
      '<em class="r49-boost__timer">' + timer + '</em></div>' +
      '<button class="r49-boost__arrow" data-v4="list" aria-label="Open list"><img src="./assets/v3-pro-chevron.svg" alt=""></button>' +
      '<div class="r49-boost__program" aria-label="Milk Boost program sequence"><i></i><b></b></div>' +
    '</section>';
  }

  function installCardOverride() {
    if (window.__v3ProCardOverride || typeof window.v4AutoCard !== 'function') return;
    if (!document.querySelector('link[data-auto-switch-decoupled]')) return;
    var baseAutoCard = window.v4AutoCard;
    window.v4AutoCard = v4AutoCard = function () {
      return state.selectedProgram === 'Milk Boost' ? milkBoostCard() : baseAutoCard.apply(this, arguments);
    };
    window.__v3ProCardOverride = true;
    if (typeof window.v4View === 'function') window.v4View();
  }

  function refresh() {
    enforce();
    replaceProductVisuals();
  }

  function boot() {
    refresh();
    if (root) new MutationObserver(refresh).observe(root, { childList: true, subtree: true });
    var attempts = 0;
    var cardTimer = setInterval(function () {
      installCardOverride();
      attempts += 1;
      if (window.__v3ProCardOverride || attempts > 30) clearInterval(cardTimer);
    }, 200);
  }

  window.V3ProCapabilities = { version: 2, enforce: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
