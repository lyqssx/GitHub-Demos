/* V3 Pro stability assistant: reviewer-triggered severe leak flow. */
(function () {
  if (window.V3ProLeakFlow && window.V3ProLeakFlow.version === 2) return;

  var GUIDE_STEPS = [
    {
      kind: 'tube-left',
      title: 'Check Left Tubing',
      label: 'Left tubing connection',
      copy: 'Push the left tubing connector in firmly.',
      assets: ['./assets/stability-assistant/figma-tubing-left-guide-crop.png']
    },
    {
      kind: 'tube-right',
      title: 'Check Right Tubing',
      label: 'Right tubing connection',
      copy: 'Push the right tubing connector in firmly.',
      assets: ['./assets/stability-assistant/figma-tubing-right-guide-crop.png']
    },
    {
      kind: 'cup',
      title: 'Check Cup Assembly',
      label: 'Cup and flange assembly',
      copy: 'Snap the rim shut and seat the duckbill valve securely.',
      assets: ['./assets/stability-assistant/figma-cup-guide-crop.png']
    },
    {
      kind: 'fit',
      title: 'Check Your Fit',
      label: 'Center the nipple in the tunnel',
      copy: 'Center the nipple in the tunnel and press the flange firmly against the breast.',
      assets: ['./assets/stability-assistant/figma-fit-center-original.png']
    }
  ];
  var RECHECK_TIMEOUT_MS = 10000;
  var root = document.getElementById('demo');
  var baseView;
  var baseFit;
  var baseLogged;
  var swipe = null;
  var loggedSwipe = null;
  var resolvedTimer = null;
  var recheckTimer = null;

  function now() { return Date.now(); }

  function preloadGuides() {
    for (var i = 0; i < GUIDE_STEPS.length; i += 1) {
      for (var j = 0; j < GUIDE_STEPS[i].assets.length; j += 1) {
        var image = new Image();
        image.src = GUIDE_STEPS[i].assets[j];
      }
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
        guideNotice: '',
        message: ''
      };
    }
    if (typeof state.v3LeakFlow.guideNotice !== 'string') state.v3LeakFlow.guideNotice = '';
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

  function clearRecheckTimer() {
    clearTimeout(recheckTimer);
    recheckTimer = null;
  }

  function resetSessionLeakTracking() {
    var f = flow();
    clearTimeout(resolvedTimer);
    resolvedTimer = null;
    clearRecheckTimer();
    f.status = 'none';
    f.stage = 'idle';
    f.source = null;
    f.guideIndex = 0;
    f.wasRunning = false;
    f.activeEventId = null;
    f.guideNotice = '';
    f.message = '';
    state.v3LeakEvents = [];
    state.air2SessionSummaryKind = null;
    state.air2ShowSessionSummary = false;
    state.air2ShowLoggedSummary = false;
    state.microLeakDuringSession = false;
    state.v3LoggedGuideOpen = false;
    state.v3LoggedGuideIndex = 0;
    state.air2ActiveSessionId = null;
  }

  function lockedStage(stage) {
    return stage === 'guide' || stage === 'rechecking';
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

  function dotsMarkup(index, className) {
    var dots = '';
    for (var i = 0; i < GUIDE_STEPS.length; i += 1) {
      dots += '<i class="' + (i === index ? 'is-active' : '') + '"></i>';
    }
    return '<span class="' + className + '" aria-hidden="true">' + dots + '</span>';
  }

  function guideArtMarkup(index) {
    var step = GUIDE_STEPS[index];
    var asset = step.assets[0];
    return '<span class="sa-guide-art sa-guide-art-' + step.kind + '" role="img" aria-label="' + step.label + '">' +
      '<img class="sa-guide-art-image" src="' + asset + '" alt="">' +
    '</span>';
  }

  function guideMarkup() {
    var f = flow();
    var index = Math.max(0, Math.min(GUIDE_STEPS.length - 1, Number(f.guideIndex) || 0));
    var step = GUIDE_STEPS[index];
    var notice = f.guideNotice
      ? '<div class="sa-guide-notice" role="status"><i>!</i><span><b>Air leak is still detected</b><small>Continue troubleshooting each step.</small></span></div>'
      : '';
    return '<div class="sa-layer sa-guide-layer" role="dialog" aria-modal="true" aria-label="Air seal guidance">' +
      '<div class="sa-scrim"></div><section class="sa-fit-guide-panel' + (f.guideNotice ? ' has-notice' : '') + '">' +
        '<header class="sa-guide-header"><div><span>Air Seal Check</span><h2>' + step.title + '</h2></div>' +
          '<button class="sa-guide-skip" type="button" data-sa-action="ignore-for-now">Skip</button></header>' +
        '<div class="sa-guide-status"><i>!</i><b>Air seal needs attention</b><span>Step ' + (index + 1) + ' of ' + GUIDE_STEPS.length + '</span></div>' +
        notice +
        '<div class="sa-guide-media">' + guideArtMarkup(index) + '</div>' +
        '<p class="sa-guide-copy">' + step.copy + '</p>' +
        '<footer class="sa-guide-footer"><button class="sa-guide-prev" type="button" data-sa-action="guide-prev" aria-label="Previous guidance page" ' + (index === 0 ? 'disabled' : '') + '>‹</button>' +
          dotsMarkup(index, 'sa-guide-dots') +
          '<button class="sa-guide-next" type="button" data-sa-action="guide-next" aria-label="' + (index === GUIDE_STEPS.length - 1 ? 'Finish guidance and check the seal' : 'Next guidance page') + '">' + (index === GUIDE_STEPS.length - 1 ? '✓' : '›') + '</button></footer>' +
      '</section>' +
      '<span class="sa-sr-only" aria-live="polite">Page ' + (index + 1) + ' of ' + GUIDE_STEPS.length + ': ' + step.label + '</span>' +
    '</div>';
  }

  function loggedGuideStepMarkup(index) {
    index = Math.max(0, Math.min(GUIDE_STEPS.length - 1, Number(index) || 0));
    var step = GUIDE_STEPS[index];
    return '<div class="sa-log-guide-step" data-sa-log-guide-step="' + index + '">' +
      '<header class="sa-log-guide-header"><div><span>Fit Guide</span><h2>' + step.title + '</h2></div>' +
        '<button class="sa-log-guide-close" type="button" data-sa-log-guide-back aria-label="Close fit guide">×</button></header>' +
      '<div class="sa-log-guide-progress"><span>Step ' + (index + 1) + ' of ' + GUIDE_STEPS.length + '</span></div>' +
      '<div class="sa-guide-media">' + guideArtMarkup(index) + '</div>' +
      '<p class="sa-guide-copy">' + step.copy + '</p>' +
      '<footer class="sa-guide-footer"><button class="sa-guide-prev" type="button" data-sa-log-guide="prev" aria-label="Previous air seal guide step" ' + (index === 0 ? 'disabled' : '') + '>‹</button>' +
        dotsMarkup(index, 'sa-guide-dots') +
        '<button class="sa-guide-next" type="button" data-sa-log-guide="next" aria-label="Next air seal guide step" ' + (index === GUIDE_STEPS.length - 1 ? 'disabled' : '') + '>›</button></footer>' +
    '</div>';
  }

  function loggedSummaryMarkup() {
    var kind = state.air2SessionSummaryKind;
    var guideIndex = Math.max(0, Math.min(GUIDE_STEPS.length - 1, Number(state.v3LoggedGuideIndex) || 0));
    var guideOpen = !!state.v3LoggedGuideOpen;
    var copy = kind === 'major-leak'
      ? 'A serious air leak was detected. Check your setup before your next session.'
      : kind === 'minor-leak'
        ? 'A slight air leak was detected and corrected automatically. Check your setup before your next session.'
        : 'Check your setup before your next pumping session.';
    return '<div class="air2-logged-summary sa-major-summary' + (guideOpen ? ' is-guide-open' : '') + '"><div class="air2-logged-summary-main">' +
      '<b>Session issue recorded</b><p>' + copy + '</p>' +
      '<button type="button" data-air2-wear-guide>Learn how to get a secure fit</button></div>' +
      '<div class="air2-logged-guide sa-log-guide">' + loggedGuideStepMarkup(guideIndex) + '</div></div>' +
      '<button class="air2-logged-done" type="button" data-air2-logged-done>Got it</button>';
  }

  function renderLoggedGuideStep(card, index) {
    var guide = card && card.querySelector('.sa-log-guide');
    if (!guide) return;
    index = Math.max(0, Math.min(GUIDE_STEPS.length - 1, Number(index) || 0));
    guide.innerHTML = loggedGuideStepMarkup(index);
  }

  function recheckingMarkup() {
    return '<div class="sa-layer sa-decision-layer" role="dialog" aria-modal="true" aria-labelledby="sa-recheck-title">' +
      '<div class="sa-scrim"></div><section class="sa-fit-guide-panel sa-rechecking">' +
        '<header class="sa-guide-header"><div><span>Air Seal Check</span><h2 id="sa-recheck-title">Checking seal...</h2></div>' +
          '<button class="sa-recheck-skip" type="button" data-sa-action="ignore-for-now">Skip</button></header>' +
        '<div class="sa-guide-status sa-recheck-status"><i aria-hidden="true">•</i><b>Monitoring suction seal</b><span>Live</span></div>' +
        '<div class="sa-recheck-body"><span class="sa-seal-spinner" aria-hidden="true"><i></i></span>' +
          '<strong>Checking for a stable seal</strong><p>Pumping stays paused while V3 Pro checks suction and the air seal for up to 10 seconds.</p>' +
          '<span class="sa-recheck-progress" aria-hidden="true"><i></i></span></div>' +
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
    if (f.stage === 'guide') root.insertAdjacentHTML('beforeend', guideMarkup());
    if (f.stage === 'rechecking') root.insertAdjacentHTML('beforeend', recheckingMarkup());
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
        resetSessionLeakTracking();
        var result = baseFit.apply(this, arguments);
        if (window.air2DemoRun) window.air2DemoRun.leakTriggered = true;
        return result;
      };
    }

    if (typeof window.v4Logged === 'function') {
      baseLogged = window.v4Logged;
      window.v4Logged = v4Logged = function () {
        var summaryKind = state.air2SessionSummaryKind;
        var needsSummary = summaryKind === 'minor-leak' || summaryKind === 'major-leak';
        var previousSummaryState = state.air2ShowLoggedSummary;
        var html;
        state.air2ShowLoggedSummary = false;
        html = baseLogged.apply(this, arguments);
        state.air2ShowLoggedSummary = previousSummaryState;
        if (!needsSummary) return html;
        return html.replace('v4-logged', 'v4-logged air2-abnormal-logged' + (state.v3LoggedGuideOpen ? ' sa-guide-open' : ''))
          .replace('<i class="v4-home-indicator"></i>', loggedSummaryMarkup() + '<i class="v4-home-indicator"></i>');
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
    clearRecheckTimer();
    var eventId = 'leak-' + now();
    f.status = 'major_active';
    f.stage = 'guide';
    f.source = source;
    f.guideIndex = 0;
    f.wasRunning = source === 'pumping' ? !!state.running : false;
    f.activeEventId = eventId;
    f.guideNotice = '';
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
    clearRecheckTimer();
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
    clearRecheckTimer();
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
    clearRecheckTimer();
    f.status = 'major_active';
    f.stage = 'guide';
    f.guideIndex = 0;
    f.guideNotice = 'Air leak is still detected. Continue troubleshooting each step.';
    if (event) {
      event.userAction = 'retry';
      event.resolutionStatus = 'active';
    }
    repaint();
    return true;
  }

  function startRecheck() {
    var f = flow();
    clearRecheckTimer();
    f.status = 'major_active';
    f.stage = 'rechecking';
    f.guideNotice = '';
    var event = activeEvent();
    if (event) event.userAction = 'retry';
    repaint();
    var eventId = f.activeEventId;
    recheckTimer = setTimeout(function () {
      var current = flow();
      if (current.stage !== 'rechecking' || current.activeEventId !== eventId) return;
      recheckFailed();
    }, RECHECK_TIMEOUT_MS);
  }

  function resetLeak() {
    var f = flow();
    clearTimeout(resolvedTimer);
    resolvedTimer = null;
    clearRecheckTimer();
    f.status = 'none';
    f.stage = 'idle';
    f.source = null;
    f.guideIndex = 0;
    f.activeEventId = null;
    f.guideNotice = '';
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
    if (next >= GUIDE_STEPS.length) {
      startRecheck();
      return;
    } else {
      f.guideIndex = next;
    }
    repaint();
  }

  function action(id) {
    var f = flow();
    var event = activeEvent();
    if (id === 'start-guide' || id === 'review-again') {
      clearRecheckTimer();
      f.stage = 'guide';
      f.guideIndex = 0;
      f.guideNotice = '';
      state.paused = true;
      if (event) event.userAction = 'troubleshoot';
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
    var sessionStartButton = event.target.closest && event.target.closest('#demo [data-v4="start"]');
    var triggerButton = event.target.closest && event.target.closest('[data-sa-trigger]');
    var actionButton = event.target.closest && event.target.closest('#demo [data-sa-action]');
    var resumeButton = event.target.closest && event.target.closest('#demo [data-v4="pause"]');
    var loggedGuideButton = event.target.closest && event.target.closest('#demo [data-sa-log-guide]');
    var loggedGuideBack = event.target.closest && event.target.closest('#demo [data-sa-log-guide-back]');
    var loggedOpen = event.target.closest && event.target.closest('#demo [data-air2-wear-guide]');
    if (sessionStartButton) resetSessionLeakTracking();
    if (resumeButton) markExplicitResume();
    if (loggedOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.v3LoggedGuideOpen = true;
      state.v3LoggedGuideIndex = 0;
      repaint();
      return;
    }
    if (loggedGuideBack) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.v3LoggedGuideOpen = false;
      repaint();
      return;
    }
    if (loggedGuideButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var card = loggedGuideButton.closest('.air2-logged-summary');
      var currentStep = card && card.querySelector('[data-sa-log-guide-step]');
      var index = Number(currentStep && currentStep.getAttribute('data-sa-log-guide-step')) || 0;
      state.v3LoggedGuideOpen = true;
      state.v3LoggedGuideIndex = Math.max(0, Math.min(GUIDE_STEPS.length - 1, index + (loggedGuideButton.getAttribute('data-sa-log-guide') === 'next' ? 1 : -1)));
      renderLoggedGuideStep(card, state.v3LoggedGuideIndex);
      return;
    }
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
    var loggedCard = event.target.closest && event.target.closest('#demo .air2-logged-summary');
    if (loggedCard && state.v3LoggedGuideOpen) loggedSwipe = { id: event.pointerId, x: event.clientX, card: loggedCard };
    var finish = event.target.closest && event.target.closest('#demo [data-v4="finish"],#demo [data-action="finish"]');
    if (finish && state.v3LeakEvents && state.v3LeakEvents.length) state.air2SessionSummaryKind = 'major-leak';
  }

  function onPointerUp(event) {
    if (loggedSwipe && loggedSwipe.id === event.pointerId) {
      var loggedDx = event.clientX - loggedSwipe.x;
      var loggedCard = loggedSwipe.card;
      loggedSwipe = null;
      if (Math.abs(loggedDx) >= 42) {
        state.v3LoggedGuideIndex = Math.max(0, Math.min(GUIDE_STEPS.length - 1, state.v3LoggedGuideIndex + (loggedDx < 0 ? 1 : -1)));
        renderLoggedGuideStep(loggedCard, state.v3LoggedGuideIndex);
      }
    }
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
    if (event.key === 'Escape') action('ignore-for-now');
  }

  function maintainAddon() {
    var f = flow();
    var needsLayer = f.stage === 'guide' ||
      f.stage === 'rechecking';
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
    document.addEventListener('pointercancel', function () { swipe = null; loggedSwipe = null; }, true);
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

  window.V3ProLeakFlow = { version: 2, trigger: trigger, state: flow, resetSession: resetSessionLeakTracking };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
