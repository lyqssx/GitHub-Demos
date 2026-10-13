/* Figma 1842:19167 / 19030 / 19365. Preferences simulate device storage. */
(function () {
  var root = document.getElementById('demo');
  var storageKey = 'v3-pro-device-settings';
  var defaults = { leakAlerts: true, adaptive: false, nightAuto: false, brightness: 50, name: 'V3 Pro' };
  var preferences = Object.assign({}, defaults);
  try { Object.assign(preferences, JSON.parse(localStorage.getItem(storageKey) || '{}')); } catch (_) {}
  // Separate the simulated device's saved state from App presentation preferences.
  var deviceStorageKey = 'v3-pro-device-leak-detection';
  var deviceLeakEnabled = defaults.leakAlerts;
  var reportedLeakEnabled = null;
  var leakSettingPending = false;
  try {
    var savedDeviceState = JSON.parse(localStorage.getItem(deviceStorageKey) || 'null');
    deviceLeakEnabled = typeof savedDeviceState === 'boolean' ? savedDeviceState : preferences.leakAlerts !== false;
  } catch (_) {}
  delete preferences.leakAlerts;
  var returnPage = 'control';
  var dialog = null;
  var asset = './assets/settings-figma/';
  function escapeText(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function enabled() { return reportedLeakEnabled === true; }
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch (_) {} }
  function connected() { return state.connected !== false && state.bluetoothConnected !== false; }
  function pump(size) { return '<span class="ds-pump ds-pump-' + size + '"><img src="' + asset + 'pump.png" alt="V3 Pro pump"></span>'; }
  function toggle(key, label) { return '<button class="ds-switch" role="switch" aria-label="' + label + '" aria-checked="' + (key === 'leakAlerts' ? enabled() : !!preferences[key]) + '" data-settings-toggle="' + key + '" ' + (!connected() || (key === 'leakAlerts' && leakSettingPending) ? 'disabled' : '') + '><span></span></button>'; }
  function chrome() {
    return '<div class="ds-status"><span>7:41</span><span><img src="./assets/figma-v2/status-cellular.svg" alt=""><img src="./assets/figma-v2/status-wifi.svg" alt=""><img src="./assets/figma-v2/status-battery.svg" alt=""></span></div>' +
      '<header class="ds-toolbar"><button class="ds-back" data-settings-action="back" aria-label="Back"><img src="' + asset + 'back.svg" alt=""></button><h1>Setting</h1></header>';
  }
  function chevron() { return '<img class="ds-chevron" src="' + asset + 'chevron.svg" alt="">'; }
  function settings() {
    return '<main class="ds-content">' +
      '<button class="ds-device ds-card" data-settings-action="info">' + pump('small') + '<span class="ds-device-copy"><b>' + escapeText(preferences.name) + '</b><span class="ds-battery"><img src="' + asset + 'battery-80.svg" alt="Battery 80 percent"></span></span>' + chevron() + '</button>' +
      '<section class="ds-group"><h2>Behavior Detection</h2><div class="ds-card ds-controls"><div class="ds-brightness"><label for="ds-brightness">Screen/Button Brightness</label><input id="ds-brightness" type="range" min="0" max="100" value="' + preferences.brightness + '" style="--ds-progress:' + preferences.brightness + '%" ' + (!connected() ? 'disabled' : '') + '></div>' +
      '<div class="ds-setting-row"><div><b>Adaptive Brightness <em>Auto</em></b>' + (!preferences.adaptive ? '<p>Automatically adjusts screen, button, and night light brightness based on ambient light.</p>' : '') + '</div>' + toggle('adaptive', 'Adaptive Brightness') + '</div>' +
      '<div class="ds-setting-row"><div><b>Night Light Auto-on</b>' + (!preferences.nightAuto ? '<p>Turn on the night light automatically when the device powers on.</p>' : '') + '</div>' + toggle('nightAuto', 'Night Light Auto-on') + '</div></div>' +
      '<div class="ds-card ds-leak"><div class="ds-setting-row"><div><b>Leak Detection</b><p>Receive air leak alerts and fit guidance.</p></div>' + toggle('leakAlerts', 'Leak Detection') + '</div></div></section>' +
      '<section class="ds-group"><h2>General Settings</h2><div class="ds-card ds-general"><button data-settings-action="firmware"><b>Firmware Upgrade</b><span>New <i></i>' + chevron() + '</span></button><button data-settings-action="restore"><b>Restore Factory</b>' + chevron() + '</button></div></section>' +
      '<button class="ds-delete ds-card" data-settings-action="delete">Delete</button></main>';
  }
  function infoRow(label, value, copy) { return '<div class="ds-info-row"><b>' + label + '</b><span>' + escapeText(value) + (copy ? '<button aria-label="Copy ' + label + '" data-settings-copy="' + escapeText(value) + '"><img src="' + asset + 'copy.svg" alt=""></button>' : '') + '</span></div>'; }
  function deviceInfo() {
    return '<main class="ds-info-content"><div class="ds-device-hero">' + pump('large') + '<button class="ds-rename" data-settings-action="rename"><b>' + escapeText(preferences.name) + '</b><img src="' + asset + 'edit.svg" alt="Edit device name"></button></div>' +
      '<div class="ds-card ds-info-card">' + infoRow('Model', 'V3 Pro') + infoRow('SN', 'SN- DAC1101FDF49', true) + infoRow('MAC', 'SN- DAC1101FDF49', true) + infoRow('Firmware Version', '46') + '</div></main>';
  }
  function modal() {
    if (!dialog) return '';
    var title = dialog === 'restore' ? 'Restore Factory Settings?' : dialog === 'delete' ? 'Remove This Device?' : dialog === 'rename' ? 'Device Name' : 'Firmware Upgrade';
    var copy = dialog === 'restore' ? 'This will reset your device settings to their defaults.' : dialog === 'delete' ? 'Remove this device from the demo?' : dialog === 'firmware' ? 'Your demo is up to date.' : '';
    return '<div class="ds-dialog-backdrop"><section class="ds-dialog" role="dialog" aria-modal="true" aria-label="' + title + '"><h2>' + title + '</h2>' + (copy ? '<p>' + copy + '</p>' : '') + (dialog === 'rename' ? '<input data-settings-name maxlength="32" aria-label="Device name" value="' + escapeText(preferences.name) + '">' : '') + '<button data-settings-action="dialog-confirm">' + (dialog === 'rename' ? 'Save' : dialog === 'firmware' ? 'Done' : 'Confirm') + '</button>' + (dialog !== 'firmware' ? '<button data-settings-action="dialog-cancel">Cancel</button>' : '') + '</section></div>';
  }
  function render(force) {
    if (state.page !== 'settings' && state.page !== 'device-info') return false;
    if (!force && root.querySelector('.ds-page')) return true;
    var scroll = root.querySelector('.ds-content');
    var top = scroll ? scroll.scrollTop : 0;
    root.innerHTML = '<section class="v4 ds-page">' + chrome() + (state.page === 'settings' ? settings() : deviceInfo()) + '<i class="ds-home-indicator"></i>' + modal() + '</section>';
    scroll = root.querySelector('.ds-content'); if (scroll) scroll.scrollTop = top;
    return true;
  }
  function reportLeakState(on) {
    if (typeof on !== 'boolean') return false;
    deviceLeakEnabled = on;
    reportedLeakEnabled = on;
    try { localStorage.setItem(deviceStorageKey, JSON.stringify(on)); } catch (_) {}
    if (!on && window.V3ProLeakFlow) {
      var f = window.V3ProLeakFlow.state();
      if (['guide','complete','rechecking','unresolved_confirm'].indexOf(f.stage) >= 0) {
        f.stage = 'guide_closed'; f.backgroundMonitoring = false;
      }
    }
    if (!render(true)) window.v4View();
    return true;
  }
  function setLeakAlerts(on) {
    if (!connected() || leakSettingPending) return Promise.resolve(false);
    leakSettingPending = true;
    render(true);
    // Mock a device command acknowledgement/report. UI changes only on that report.
    return Promise.resolve().then(function () {
      leakSettingPending = false;
      if (!connected()) { render(true); return false; }
      return reportLeakState(!!on);
    });
  }
  function refreshDeviceState() {
    if (!connected()) return;
    try {
      var saved = JSON.parse(localStorage.getItem(deviceStorageKey) || 'null');
      if (typeof saved === 'boolean') deviceLeakEnabled = saved;
    } catch (_) {}
    reportLeakState(deviceLeakEnabled);
  }
  function install() {
    var baseView = window.v4View;
    window.v4View = v4View = function () { if (!render(false)) return baseView.apply(this, arguments); };
    window.view = window.v4View;
    document.addEventListener('click', function (event) {
      var el = event.target.closest('button'); if (!el || !root.contains(el)) return;
      var settingsGear = el.matches('.v4-control .v4-top > button:last-child') || (state.page === 'home' && /setting/i.test(el.innerHTML));
      var action = el.getAttribute('data-settings-action');
      var key = el.getAttribute('data-settings-toggle');
      var copy = el.getAttribute('data-settings-copy');
      if (!settingsGear && !action && !key && !copy) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (settingsGear) { returnPage = state.page; state.page = 'settings'; dialog = null; refreshDeviceState(); render(true); return; }
      if (key) {
        if (!connected()) return;
        if (key === 'leakAlerts') setLeakAlerts(!enabled());
        else { preferences[key] = !preferences[key]; save(); render(true); }
        return;
      }
      if (copy) { if (navigator.clipboard) navigator.clipboard.writeText(copy).then(function () { el.setAttribute('aria-label', 'Copied'); }).catch(function () {}); return; }
      if (action === 'back') {
        state.page = state.page === 'device-info' ? 'settings' : returnPage;
        dialog = null; if (!render(true)) window.v4View();
      } else if (action === 'info') { state.page = 'device-info'; render(true); }
      else if (action === 'dialog-cancel') { dialog = null; render(true); }
      else if (action === 'dialog-confirm') {
        if (dialog === 'rename') { var input = root.querySelector('[data-settings-name]'); preferences.name = input.value.trim() || 'V3 Pro'; save(); }
        if (dialog === 'restore') { preferences = Object.assign({}, defaults); delete preferences.leakAlerts; save(); reportLeakState(defaults.leakAlerts); }
        if (dialog === 'delete') { state.page = 'device'; }
        dialog = null; if (!render(true)) window.v4View();
      } else { dialog = action; render(true); }
    }, true);
    document.addEventListener('input', function (event) {
      if (event.target.id !== 'ds-brightness') return;
      preferences.brightness = Number(event.target.value); event.target.style.setProperty('--ds-progress', preferences.brightness + '%'); save();
    });
  }
  // Initial connection report comes from the simulated device, not the App default.
  reportedLeakEnabled = deviceLeakEnabled;
  window.V3ProSettings = {
    leakAlertsEnabled: enabled,
    setLeakAlerts: setLeakAlerts,
    reportLeakDetection: reportLeakState,
    refreshDeviceState: refreshDeviceState,
    pairNewDevice: function () { return reportLeakState(defaults.leakAlerts); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
}());
