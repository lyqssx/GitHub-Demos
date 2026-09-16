/* V3 Pro stability assistant: reviewer-triggered severe leak flow. */
(function () {
  if (window.V3ProLeakFlow && window.V3ProLeakFlow.version === 1) return;

  var GUIDE_ASSETS = [
    './assets/stability-assistant/tubing-guide-black.png',
    './assets/stability-assistant/cup-check.png',
    './assets/stability-assistant/fit-check.png'
  ];
  var GUIDE_LABELS = ['Tubing connection', 'Cup assembly', 'Nipple positioning'];
  var GUIDE_TITLES = ['Check the tubing', 'Check cup assembly', 'Check your fit'];
  var GUIDE_COPY = [
    'Reinsert both tubing connectors firmly into the V3 Pro console.',
    'Snap the cup rim shut and make sure the duckbill valve is seated securely.',
    'Center the nipple in the tunnel and keep the flange sealed against the breast.'
  ];
  var root = document.getElementById('demo');
  var baseView;
  var baseFit;
  var baseLogged;
  var swipe = null;
  var resolvedTimer = null;

  function now() { return Date.now(); }

  function preloadGuides() {
    for (var i = 0; i < GUIDE_ASSETS.length; i += 1) {
      var image = new Image();
      image.src = GUIDE_ASSETS[i];
    }
  }

  function flow() {
    if (!state.v3LeakFlow) {
      state.v3LeakFlow = {
        status: 'none',
        stage: 'idle',
        source: null,
        guideIndex: 0,
        wasRunning: false,
        activeEventId: null,
        message: ''
      };
    }
    if (!Array.isArray(state.v3LeakEvents)) state.v3LeakEvents = [];
    return state.v3LeakFlow;
  }

  function activeEvent() {
    var f = flow();
    for (var i = state.v3LeakEvents.length - 1; i >= 0; i -= 1) {
      if (state.v3LeakEvents[i].eventId === f.activeEventId) return state.v3LeakEvents[i];
    }
    return null;
  }

  function setMessage(message) {
    flow().message = message || '';
    syncTriggerStatus();
  }

  function lockedStage(stage) {
    return stage === 'alert' || stage === 'guide' || stage === 'rechecking' ||
      stage === 'recheck_failed';
  }

  function enforceState() {
    var f = flow();
    if (window.air2DemoRun) window.air2DemoRun.leakTriggered = true;
    if (!lockedStage(f.stage)) return;
    state.paused = true;
    state.controlNotice = null;
    state.modal = null;
    if (f.source === 'self_check') state.running = false;
  }

  function repaint() {
    if (typeof window.v4View === 'function') window.v4View();
    else if (typeof window.view === 'function') window.view();
    enforceState();
    renderAddon();
  }

  function sourceCopy() {
    return flow().source === 'self_check'
      ? 'The fit check detected a serious air leak, but V3 Pro cannot identify the exact source. Check all three possible causes before starting.'
      : 'Pumping is paused. V3 Pro cannot identify the exact leak source, so check all three possible causes.';
  }

  function alertMarkup() {
    return '<div class="sa-layer sa-alert-layer" role="dialog" aria-modal="true" aria-labelledby="sa-alert-title">' +
      '<div class="sa-scrim"></div><section class="sa-sheet sa-alert-sheet">' +
        '<span class="sa-alert-icon" aria-hidden="true">!</span>' +
        '<p class="sa-eyebrow">Stability Assistant</p>' +
        '<h2 id="sa-alert-title">Serious air leak detected</h2>' +
        '<p class="sa-copy">' + sourceCopy() + '</p>' +
        '<div class="sa-actions">' +
          '<button class="sa-primary" type="button" data-sa-action="start-guide">Check now</button>' +
          '<button class="sa-secondary" type="button" data-sa-action="ignore-for-now">Ignore for now</button>' +
        '</div>' +
      '</section></div>';
  }

  function guideMarkup() {
    var f = flow();
    var index = Math.max(0, Math.min(GUIDE_ASSETS.length - 1, Number(f.guideIndex) || 0));
    return '<div class="sa-layer sa-guide-layer" role="dialog" aria-modal="true" aria-label="Air seal guidance">' +
      '<div class="sa-scrim"></div><section class="sa-fit-guide-panel">' +
        '<header class="sa-guide-header"><div><span>Air Seal Check</span><h2>' + GUIDE_TITLES[index] + '</h2></div>' +
          '<button class="sa-guide-close" type="button" data-sa-action="close-guide" aria-label="Close guidance">×</button></header>' +
        '<div class="sa-guide-status"><i>!</i><b>Suction seal needs attention</b><span>Step ' + (index + 1) + ' of 3</span></div>' +
        '<div class="sa-guide-media"><img class="sa-guide-image sa-guide-image-' + index + '" src="' + GUIDE_ASSETS[index] + '" alt="' + GUIDE_LABELS[index] + '"></div>' +
        '<p class="sa-guide-copy">' + GUIDE_COPY[index] + '</p>' +
        '<footer class="sa-guide-footer"><button class="sa-guide-prev" type="button" data-sa-action="guide-prev" aria-label="Previous guidance page" ' + (index === 0 ? 'disabled' : '') + '>‹</button>' +
          '<span class="sa-guide-dots" aria-hidden="true"><i class="' + (index === 0 ? 'is-active' : '') + '"></i><i class="' + (index === 1 ? 'is-active' : '') + '"></i><i class="' + (index === 2 ? 'is-active' : '') + '"></i></span>' +
          '<button class="sa-guide-next" type="button" data-sa-action="guide-next" aria-label="' + (index === GUIDE_ASSETS.length - 1 ? 'Finish guidance' : 'Next guidance page') + '">' + (index === GUIDE_ASSETS.length - 1 ? '✓' : '›') + '</button></footer>' +
      '</section>' +
      '<span class="sa-sr-only" aria-live="polite">Page ' + (index + 1) + ' of 3: ' + GUIDE_LABELS[index] + '</span>' +
    '</div>';
  }

  function recheckingMarkup() {
    return '<div class="sa-layer sa-decision-layer" role="dialog" aria-modal="true" aria-labelledby="sa-recheck-title">' +
      '<div class="sa-scrim"></div><section class="sa-sheet sa-decision-sheet sa-rechecking">' +
        '<span class="sa-spinner" aria-hidden="true"></span>' +
        '<p class="sa-eyebrow">Stability Assistant</p>' +
        '<h2 id="sa-recheck-title">Checking air seal</h2>' +
        '<p class="sa-copy">Use the Event Triggers panel to return the recheck result. This screen will not resolve automatically.</p>' +
        '<button class="sa-secondary" type="button" data-sa-action="review-again">Review the 3 checks again</button>' +
      '</section></div>';
  }

  function failedMarkup() {
    return '<div class="sa-layer sa-decision-layer" role="dialog" aria-modal="true" aria-labelledby="sa-failed-title">' +
      '<div class="sa-scrim"></div><section class="sa-sheet sa-decision-sheet">' +
        '<span class="sa-alert-icon" aria-hidden="true">!</span>' +
        '<p class="sa-eyebrow">Recheck complete</p>' +
        '<h2 id="sa-failed-title">Air leak is still detected</h2>' +
        '<p class="sa-copy">Review all three possible causes again, or ignore this warning and decide when to resume pumping.</p>' +
        '<div class="sa-actions">' +
          '<button class="sa-primary" type="button" data-sa-action="review-again">Review guidance</button>' +
          '<button class="sa-secondary" type="button" data-sa-action="ignore-for-now">Ignore for now</button>' +
        '</div>' +
      '</section></div>';
  }

  function statusMarkup(resolved) {
    if (resolved) {
      return '<section class="sa-status sa-status-resolved" role="status"><span class="sa-status-icon">✓</span>' +
        '<span><b>Suction restored</b><small>You can continue pumping.</small></span></section>';
    }
    var paused = !!state.paused;
    return '<section class="sa-status sa-status-active" role="status"><span class="sa-status-icon">!</span>' +
      '<span><b>Serious air leak detected</b><small>' + (paused ? 'Pumping is paused. Resume when you are ready.' : 'Pumping continues by your choice.') + '</small></span>' +
      '<button type="button" data-sa-action="start-guide">Check</button></section>';
  }

  function renderAddon() {
    var f = flow();
    var screen = root && root.querySelector('.v4-control');
    var existing;
    var i;
    if (!root) return;
    existing = root.querySelectorAll('.sa-layer, .sa-status');
    for (i = 0; i < existing.length; i += 1) existing[i].remove();
    if (f.stage === 'alert') root.insertAdjacentHTML('beforeend', alertMarkup());
    if (f.stage === 'guide') root.insertAdjacentHTML('beforeend', guideMarkup());
    if (f.stage === 'rechecking') root.insertAdjacentHTML('beforeend', recheckingMarkup());
    if (f.stage === 'recheck_failed') root.insertAdjacentHTML('beforeend', failedMarkup());
    if (screen && (f.stage === 'ignored_paused' || f.stage === 'ignored' || f.stage === 'resolved')) {
      screen.classList.add('sa-leak-running');
      screen.insertAdjacentHTML('beforeend', statusMarkup(f.stage === 'resolved'));
    }
    syncTriggerStatus();
  }

  function wrapRenderers() {
    if (window.__v3LeakFlowWrapped || typeof window.v4View !== 'function') return;
    baseView = window.v4View;
    window.v4View = v4View = function () {
      enforceState();
      baseView.apply(this, arguments);
      enforceState();
      renderAddon();
    };
    window.view = window.v4View;

    if (typeof window.v4RunFit === 'function') {
      baseFit = window.v4RunFit;
      window.v4RunFit = v4RunFit = function () {
        var result = baseFit.apply(this, arguments);
        if (window.air2DemoRun) window.air2DemoRun.leakTriggered = true;
        return result;
      };
    }

    if (typeof window.v4Logged === 'function') {
      baseLogged = window.v4Logged;
      window.v4Logged = v4Logged = function () {
        var html = baseLogged.apply(this, arguments);
        if (state.air2SessionSummaryKind !== 'major-leak') return html;
        var summary = '<div class="air2-logged-summary sa-major-summary"><div class="air2-logged-summary-main">' +
          '<b>Session issue recorded</b><p>A serious air leak was detected. Review all three checks before your next session.</p>' +
          '</div></div><button class="air2-logged-done" type="button" data-air2-logged-done>Got it</button>';
        return html.replace('v4-logged', 'v4-logged air2-abnormal-logged')
          .replace('<i class="v4-home-indicator"></i>', summary + '<i class="v4-home-indicator"></i>');
      };
    }
    window.__v3LeakFlowWrapped = true;
  }

  function beginSevere(source) {
    var f = flow();
    if (source === 'pumping' && (!state.running || state.paused || state.modal)) {
      setMessage('Start pumping before triggering an in-session serious leak.');
      return false;
    }
    if (source === 'self_check' && state.modal !== 'fit') {
      setMessage('Start Fit Check before triggering a self-check serious leak.');
      return false;
    }
    var eventId = 'leak-' + now();
    f.status = 'major_active';
    f.stage = 'guide';
    f.source = source;
    f.guideIndex = 0;
    f.wasRunning = source === 'pumping' ? !!state.running : false;
    f.activeEventId = eventId;
    f.message = '';
    state.v3LeakEvents.push({
      eventId: eventId,
      severity: 'major',
      side: 'unknown',
      source: source,
      pumpAction: 'paused',
      userAction: 'none',
      resolutionStatus: 'active',
      detectedAt: now(),
      resolvedAt: null
    });
    state.air2SessionSummaryKind = 'major-leak';
    state.controlNotice = null;
    state.modal = null;
    state.paused = true;
    if (source === 'self_check') state.running = false;
    repaint();
    return true;
  }

  function ignoreForNow() {
    var f = flow();
    var event = activeEvent();
    f.status = 'major_ignored';
    f.stage = 'ignored_paused';
    if (event) {
      event.userAction = 'ignore_for_now';
      event.pumpAction = 'paused';
      event.resolutionStatus = 'ignored';
    }
    state.modal = null;
    state.running = true;
    state.paused = true;
    repaint();
  }

  function markExplicitResume() {
    var f = flow();
    var event = activeEvent();
    if (f.stage !== 'ignored_paused' || !state.paused) return;
    f.stage = 'ignored';
    if (event) {
      event.userAction = 'ignore_continue';
      event.pumpAction = 'resumed';
    }
    state.air2LastPhysicsAt = now();
  }

  function resolveLeak() {
    var f = flow();
    var event = activeEvent();
    var previousStage = f.stage;
    if (f.status !== 'major_active' && f.status !== 'major_ignored') {
      setMessage('Trigger a normal result while a serious leak is active.');
      return false;
    }
    f.status = 'resolved';
    f.stage = 'resolved';
    if (event) {
      event.resolutionStatus = 'resolved';
      event.resolvedAt = now();
      if (previousStage === 'rechecking') event.userAction = 'retry';
    }
    state.running = true;
    state.paused = false;
    state.air2LastPhysicsAt = now();
    repaint();
    clearTimeout(resolvedTimer);
    var resolvedEventId = f.activeEventId;
    resolvedTimer = setTimeout(function () {
      var current = flow();
      if (current.stage !== 'resolved' || current.activeEventId !== resolvedEventId) return;
      current.stage = 'idle';
      repaint();
    }, 3000);
    return true;
  }

  function recheckFailed() {
    var f = flow();
    var event = activeEvent();
    if (f.stage !== 'rechecking') {
      setMessage('Open Recheck air seal before returning a failed result.');
      return false;
    }
    f.status = 'major_active';
    f.stage = 'recheck_failed';
    if (event) {
      event.userAction = 'retry';
      event.resolutionStatus = 'active';
    }
    repaint();
    return true;
  }

  function resetLeak() {
    var f = flow();
    clearTimeout(resolvedTimer);
    resolvedTimer = null;
    f.status = 'none';
    f.stage = 'idle';
    f.source = null;
    f.guideIndex = 0;
    f.activeEventId = null;
    f.message = '';
    state.paused = false;
    state.controlNotice = null;
    repaint();
  }

  function runLegacyTrigger(id, unavailableMessage) {
    if (!window.Air2DemoTriggers || typeof window.Air2DemoTriggers.trigger !== 'function') {
      setMessage('The original Demo trigger is not ready.');
      return false;
    }
    var result = window.Air2DemoTriggers.trigger(id);
    setMessage(result ? '' : unavailableMessage);
    return result;
  }

  function trigger(id) {
    var f = flow();
    if (id === 'suction-normal') {
      if (state.modal === 'fit') return runLegacyTrigger('fit-ok', 'Open Fit Check before returning a normal result.');
      if (f.status === 'major_active' || f.status === 'major_ignored') return resolveLeak();
      setMessage('Suction is already normal.');
      return true;
    }
    if (id === 'suction-failed') {
      if (state.modal === 'fit') return beginSevere('self_check');
      if (f.stage === 'rechecking') return recheckFailed();
      setMessage('Start Fit Check or Recheck before returning a failed result.');
      return false;
    }
    if (id === 'fit-check-passed') return runLegacyTrigger('fit-ok', 'Open Fit Check before returning a passed result.');
    if (id === 'minor-leak') return runLegacyTrigger('minor-leak', 'Start pumping before triggering a minor leak.');
    if (id === 'self-check-severe') return beginSevere('self_check');
    if (id === 'pumping-severe') return beginSevere('pumping');
    if (id === 'recheck-passed') return resolveLeak();
    if (id === 'recheck-failed') return recheckFailed();
    if (id === 'reset-leak') { resetLeak(); return true; }
    return false;
  }

  function guideDelta(delta) {
    var f = flow();
    var next = f.guideIndex + delta;
    if (next < 0) return;
    if (next >= GUIDE_ASSETS.length) {
      f.status = 'major_active';
      f.stage = 'rechecking';
      var event = activeEvent();
      if (event) event.userAction = 'retry';
    } else {
      f.guideIndex = next;
    }
    repaint();
  }

  function action(id) {
    var f = flow();
    var event = activeEvent();
    if (id === 'start-guide' || id === 'review-again') {
      f.stage = 'guide';
      f.guideIndex = 0;
      state.paused = true;
      if (event) event.userAction = 'troubleshoot';
    } else if (id === 'close-guide') {
      f.stage = 'alert';
    } else if (id === 'guide-prev') {
      guideDelta(-1); return;
    } else if (id === 'guide-next') {
      guideDelta(1); return;
    } else if (id === 'ignore-for-now') {
      ignoreForNow(); return;
    }
    repaint();
  }

  function decorateLatestRecord() {
    if (state.air2SessionSummaryKind !== 'major-leak' || !Array.isArray(state.air2SessionHistory)) return;
    var id = state.air2ActiveSessionId;
    var record = state.air2SessionHistory.find(function (item) { return item.id === id; });
    if (!record) record = state.air2SessionHistory[state.air2SessionHistory.length - 1];
    if (!record) return;
    record.hasAbnormality = true;
    record.maxLeakSeverity = 'major';
    record.leakSides = ['unknown'];
    record.leakEventCount = state.v3LeakEvents.length;
    record.majorLeakIgnored = state.v3LeakEvents.some(function (item) {
      return item.userAction === 'ignore_for_now' || item.userAction === 'ignore_continue';
    });
    record.leakEvents = state.v3LeakEvents.slice();
  }

  function triggerGroupMarkup() {
    return '<section class="demo-trigger-group sa-trigger-group"><h3>Stability Assistant</h3>' +
      '<div class="demo-trigger-grid">' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="suction-normal"><b>Suction normal</b></button>' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="suction-failed"><b>Suction check failed</b></button>' +
        '<button class="demo-trigger-action" type="button" data-sa-trigger="minor-leak"><b>Slight leak</b></button>' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="pumping-severe"><b>Serious leak</b></button>' +
      '</div><p class="sa-trigger-status" data-sa-trigger-status></p></section>';
  }

  function installTriggerGroup() {
    var host = document.querySelector('.demo-trigger-root');
    var content = host && host.querySelector('.demo-trigger-content');
    if (!content) return;
    var groups = content.querySelectorAll('.demo-trigger-group');
    for (var i = 0; i < groups.length; i += 1) groups[i].remove();
    content.insertAdjacentHTML('afterbegin', triggerGroupMarkup());
    syncTriggerStatus();
  }

  function syncTriggerStatus() {
    var target = document.querySelector('[data-sa-trigger-status]');
    var f = flow();
    if (!target) return;
    target.textContent = f.message || ('State: ' + f.status + (f.source ? ' · ' + f.source.replace('_', ' ') : ''));
  }

  function onClick(event) {
    var triggerButton = event.target.closest && event.target.closest('[data-sa-trigger]');
    var actionButton = event.target.closest && event.target.closest('#demo [data-sa-action]');
    var resumeButton = event.target.closest && event.target.closest('#demo [data-v4="pause"]');
    if (resumeButton) markExplicitResume();
    if (triggerButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      trigger(triggerButton.getAttribute('data-sa-trigger'));
      var host = triggerButton.closest('.demo-trigger-root');
      if (host) {
        host.classList.remove('is-open');
        var toggle = host.querySelector('.demo-trigger-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    if (actionButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      action(actionButton.getAttribute('data-sa-action'));
    }
  }

  function onPointerDown(event) {
    var guide = event.target.closest && event.target.closest('#demo .sa-guide-layer');
    if (guide) swipe = { id: event.pointerId, x: event.clientX };
    var finish = event.target.closest && event.target.closest('#demo [data-v4="finish"],#demo [data-action="finish"]');
    if (finish && state.v3LeakEvents && state.v3LeakEvents.length) state.air2SessionSummaryKind = 'major-leak';
  }

  function onPointerUp(event) {
    if (!swipe || swipe.id !== event.pointerId) return;
    var dx = event.clientX - swipe.x;
    swipe = null;
    if (Math.abs(dx) < 42) return;
    guideDelta(dx < 0 ? 1 : -1);
  }

  function onKeyDown(event) {
    if (flow().stage !== 'guide') return;
    if (event.key === 'ArrowRight') guideDelta(1);
    if (event.key === 'ArrowLeft') guideDelta(-1);
    if (event.key === 'Escape') action('close-guide');
  }

  function maintainAddon() {
    var f = flow();
    var needsLayer = f.stage === 'alert' || f.stage === 'guide' ||
      f.stage === 'rechecking' || f.stage === 'recheck_failed';
    var needsStatus = f.stage === 'ignored_paused' || f.stage === 'ignored' || f.stage === 'resolved';
    if ((needsLayer && !root.querySelector('.sa-layer')) ||
        (needsStatus && !root.querySelector('.sa-status'))) renderAddon();
  }

  function boot() {
    flow();
    preloadGuides();
    wrapRenderers();
    installTriggerGroup();
    if (window.air2DemoRun) window.air2DemoRun.leakTriggered = true;
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', function () { swipe = null; }, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('#demo [data-v4="save"]')) {
        state.air2SessionSummaryKind = state.v3LeakEvents.length ? 'major-leak' : state.air2SessionSummaryKind;
        setTimeout(decorateLatestRecord, 0);
      }
    }, true);
    repaint();
    setTimeout(installTriggerGroup, 800);
    setTimeout(installTriggerGroup, 1900);
    setInterval(maintainAddon, 250);
  }

  window.V3ProLeakFlow = { version: 1, trigger: trigger, state: flow };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
