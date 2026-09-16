/* V3 Pro model-specific capability guards. */
(function () {
  if (window.V3ProCapabilities && window.V3ProCapabilities.version === 4) return;

  var root = document.getElementById('demo');

  function currentState() {
    return typeof state !== 'undefined' ? state : (window.state || null);
  }

  function enforce() {
    var current = currentState();
    if (!current) return;
    current.v3ProCapabilities = current.v3ProCapabilities || {};
    current.v3ProCapabilities.autoSwitch = false;
    if (!Number.isInteger(current.v3ProCapabilities.nightLightLevel)) {
      current.v3ProCapabilities.nightLightLevel = 1;
    }
    if (!Number.isInteger(current.v3ProCapabilities.lastNightLightLevel) || current.v3ProCapabilities.lastNightLightLevel < 1) {
      current.v3ProCapabilities.lastNightLightLevel = 2;
    }

    /* Program sequencing remains available. Outside a selected program, the
       legacy state must not silently retain sensor-led automatic switching. */
    if (!current.selectedProgram && current.auto) current.auto = false;
  }

  function replaceProductVisuals() {
    if (!root) return;
    var pumpRow = root.querySelector('.v4-control > .v4-pump-row');
    if (pumpRow && !pumpRow.querySelector('.v3-pro-device-frame')) {
      pumpRow.className = 'v4-pump-row v3-pro-main-visual';
      pumpRow.innerHTML = '<div class="v3-pro-device-frame" aria-label="V3 Pro pump">' +
        '<span class="v3-pro-device-reflection" aria-hidden="true"><img src="./assets/v3-pro-device-reflection.png" alt=""></span>' +
        '<span class="v3-pro-device-main"><img src="./assets/v3-pro-main.png" alt=""></span>' +
      '</div>';
    }

    var dockPumps = root.querySelector('.v4-home-dock .h7-pump-pair, .v4-home-dock .v4-dock-pumps');
    if (dockPumps && !dockPumps.querySelector('[data-v3-pro-dock-device]')) {
      dockPumps.classList.add('v3-pro-dock-visual');
      dockPumps.innerHTML = '<img data-v3-pro-dock-device src="./assets/v3-pro-main.png" alt="V3 Pro pump">';
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
      '<div class="v3-pro-boost-flow"><div class="r49-boost__program" aria-label="Milk Boost program sequence">' +
        '<span class="v3-pro-boost-short" aria-label="Stimulation 2 minutes"></span><span class="v3-pro-boost-long" aria-label="Expression 8 minutes"></span>' +
        '<span class="v3-pro-boost-short" aria-label="Stimulation 2 minutes"></span><span class="v3-pro-boost-long" aria-label="Expression 8 minutes"></span>' +
      '</div><span class="v3-pro-boost-duration">20min</span></div>' +
    '</section>';
  }

  function nightLightCard() {
    var current = currentState();
    var capability = current.v3ProCapabilities;
    var level = Math.max(0, Math.min(3, capability.nightLightLevel));
    var isOn = level > 0;
    return '<section class="v3-pro-night-light ' + (isOn ? 'is-on' : 'is-off') + '" data-v3-light-card data-level="' + level + '">' +
      '<div class="v3-pro-night-light__header"><span class="v3-pro-night-light__title">' +
        '<img src="./assets/v3-pro-night-light.svg" alt=""><b>Night Light</b></span>' +
        '<button class="v3-pro-night-light__switch" data-v3-light-toggle role="switch" aria-checked="' + isOn + '" aria-label="Night Light"><i></i></button>' +
      '</div>' +
      (isOn ? '<button class="v3-pro-night-light__track" data-v3-light-track role="slider" aria-label="Night Light brightness" aria-valuemin="0" aria-valuemax="3" aria-valuenow="' + level + '" style="--night-light-level:' + level + '">' +
        '<span class="v3-pro-night-light__fill"></span>' +
        '<span class="v3-pro-night-light__marks"><i></i><i></i><i></i><i></i></span>' +
        '<span class="v3-pro-night-light__thumb">Auto</span>' +
      '</button>' : '') +
    '</section>';
  }

  function installNightLight() {
    if (!root) return;
    var existing = root.querySelector('[data-v3-light-card]');
    var current = currentState();
    if (existing && current) {
      var expectedLevel = String(current.v3ProCapabilities.nightLightLevel);
      if (existing.getAttribute('data-level') !== expectedLevel) existing.outerHTML = nightLightCard();
      return;
    }
    var speed = root.querySelector('.v4-control .v4-controls > .v4-speed');
    if (speed) speed.insertAdjacentHTML('afterend', nightLightCard());
  }

  function updateNightLight(level, restoreDefaultAfterOff) {
    var current = currentState();
    if (!current) return;
    enforce();
    var capability = current.v3ProCapabilities;
    level = Math.max(0, Math.min(3, Math.round(Number(level) || 0)));
    if (level === 0 && restoreDefaultAfterOff) capability.lastNightLightLevel = 2;
    if (level > 0) capability.lastNightLightLevel = level;
    capability.nightLightLevel = level;
    if (typeof window.v4View === 'function') window.v4View();
    refresh();
  }

  function installNightLightEvents() {
    if (window.__v3ProNightLightEvents) return;
    window.__v3ProNightLightEvents = true;

    document.addEventListener('click', function (event) {
      var toggle = event.target.closest && event.target.closest('[data-v3-light-toggle]');
      var track = event.target.closest && event.target.closest('[data-v3-light-track]');
      if (!toggle && !track) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var current = currentState();
      if (!current) return;
      enforce();
      var capability = current.v3ProCapabilities;
      if (toggle) {
        updateNightLight(capability.nightLightLevel > 0 ? 0 : capability.lastNightLightLevel, false);
        return;
      }
      var rect = track.getBoundingClientRect();
      updateNightLight(Math.round(((event.clientX - rect.left) / rect.width) * 3), true);
    }, true);

    document.addEventListener('keydown', function (event) {
      var track = event.target.closest && event.target.closest('[data-v3-light-track]');
      if (!track || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      var current = currentState();
      if (!current) return;
      updateNightLight(current.v3ProCapabilities.nightLightLevel + (event.key === 'ArrowRight' ? 1 : -1), true);
    }, true);
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
    installNightLight();
  }

  function boot() {
    installNightLightEvents();
    refresh();
    if (root) new MutationObserver(refresh).observe(root, { childList: true, subtree: true });
    var attempts = 0;
    var cardTimer = setInterval(function () {
      installCardOverride();
      attempts += 1;
      if (window.__v3ProCardOverride || attempts > 30) clearInterval(cardTimer);
    }, 200);
  }

  window.V3ProCapabilities = { version: 4, enforce: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
