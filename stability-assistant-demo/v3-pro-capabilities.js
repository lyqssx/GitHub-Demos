/* V3 Pro model-specific capability guards. */
(function () {
  if (window.V3ProCapabilities && window.V3ProCapabilities.version === 1) return;

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

  function boot() {
    enforce();
    if (root) new MutationObserver(enforce).observe(root, { childList: true, subtree: true });
  }

  window.V3ProCapabilities = { version: 1, enforce: enforce };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
