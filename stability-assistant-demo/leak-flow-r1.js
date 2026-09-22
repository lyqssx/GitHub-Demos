/* V3 Pro stability assistant: reviewer-triggered severe leak flow. */
(function () {
  if (window.V3ProLeakFlow && window.V3ProLeakFlow.version === 7) return;

  var TUBING_STEPS = {
    left: {
      kind: 'tube-left',
      title: 'Check Left Tubing',
      label: 'Left tubing air seal',
      copy: 'Reinsert tubing firmly',
      assets: ['./assets/stability-assistant/figma-tubing-left.svg']
    },
    right: {
      kind: 'tube-right',
      title: 'Check Right Tubing',
      label: 'Right tubing air seal',
      copy: 'Reinsert tubing firmly',
      assets: ['./assets/stability-assistant/figma-tubing-right.svg']
    },
    both: {
      kind: 'tube-both',
      title: 'Check Tubing',
      label: 'Left and right tubing air seal',
      copy: 'Reinsert both tubes firmly',
      assets: ['./assets/stability-assistant/figma-tubing-both.svg']
    }
  };
  var LOG_TUBING_STEP = {
    kind: 'tube-both',
    title: 'Check Tubing',
    label: 'Left and right tubing air seal',
    copy: 'Reinsert both tubes firmly',
    assets: ['./assets/stability-assistant/figma-tubing-both.svg']
  };
  var COMMON_GUIDE_STEPS = [
    {
      kind: 'cup',
      title: 'Check Cup',
      label: 'Cup and flange assembly',
      copy: 'Snap rim shut<br>Seat duckbill valve',
      assets: ['./assets/stability-assistant/figma-cup-guide-crop.png']
    },
    {
      kind: 'fit',
      title: 'Check Fit',
      label: 'Center the nipple in the tunnel',
      copy: 'Center the nipple<br>Seal flange firmly',
      assets: ['./assets/stability-assistant/figma-fit-center-original.png']
    }
  ];
  var root = document.getElementById('demo');
  var baseView;
  var baseFit;
  var baseLogged;
  var baseHome;
  var swipe = null;
  var loggedSwipe = null;
  var resolvedTimer = null;
  var recheckTimer = null;
  var loggedAutoCloseTimer = null;

  function now() { return Date.now(); }

  function preloadGuides() {
    var steps = Object.keys(TUBING_STEPS).map(function (key) { return TUBING_STEPS[key]; }).concat([LOG_TUBING_STEP], COMMON_GUIDE_STEPS);
    for (var i = 0; i < steps.length; i += 1) {
      for (var j = 0; j < steps[i].assets.length; j += 1) {
        var image = new Image();
        image.src = steps[i].assets[j];
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
        statusDismissed: false,
        side: 'right',
        result: null,
        backgroundMonitoring: false,
        confirmOrigin: null,
        message: '',
        guideShownInSession: false,
        skipWarningShownInSession: false,
        guideMode: 'leak',
        guideStatusKind: 'detected'
      };
    }
    if (typeof state.v3LeakFlow.guideNotice !== 'string') state.v3LeakFlow.guideNotice = '';
    if (typeof state.v3LeakFlow.statusDismissed !== 'boolean') state.v3LeakFlow.statusDismissed = false;
    if (typeof state.v3LeakFlow.backgroundMonitoring !== 'boolean') state.v3LeakFlow.backgroundMonitoring = false;
    if (typeof state.v3LeakFlow.confirmOrigin !== 'string') state.v3LeakFlow.confirmOrigin = '';
    if (typeof state.v3LeakFlow.guideShownInSession !== 'boolean') state.v3LeakFlow.guideShownInSession = false;
    if (typeof state.v3LeakFlow.skipWarningShownInSession !== 'boolean') state.v3LeakFlow.skipWarningShownInSession = false;
    if (typeof state.v3LeakFlow.guideMode !== 'string') state.v3LeakFlow.guideMode = 'leak';
    if (!/^(detected|leak)$/.test(state.v3LeakFlow.guideStatusKind || '')) state.v3LeakFlow.guideStatusKind = 'detected';
    if (!/^(left|right|both)$/.test(state.v3LeakFlow.side || '')) state.v3LeakFlow.side = 'right';
    if (!Array.isArray(state.v3LeakEvents)) state.v3LeakEvents = [];
    return state.v3LeakFlow;
  }

  function guideSteps() {
    var side = flow().side;
    return [TUBING_STEPS[side] || TUBING_STEPS.right].concat(COMMON_GUIDE_STEPS);
  }

  function loggedGuideSteps() {
    return [LOG_TUBING_STEP].concat(COMMON_GUIDE_STEPS);
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

  function clearLoggedAutoCloseTimer() {
    clearTimeout(loggedAutoCloseTimer);
    loggedAutoCloseTimer = null;
  }

  function closeLoggedSummary() {
    clearLoggedAutoCloseTimer();
    state.air2ShowLoggedSummary = false;
    state.modal = null;
    state.running = false;
    state.paused = false;
    state.controlNotice = null;
    if (state.air2ShutdownAfterSave) {
      state.page = 'control';
      state.air2Offline = true;
    } else {
      state.page = 'home';
    }
    state.v3HomeLeakNoticeVisible = sessionSummaryKind() === 'minor-leak' && state.v3FitGuideConsumed !== true;
    repaint();
  }

  function scheduleLoggedAutoClose(delay) {
    clearLoggedAutoCloseTimer();
    loggedAutoCloseTimer = setTimeout(function () {
      if (state.modal !== 'logged') return;
      closeLoggedSummary();
    }, Number(delay) || 2000);
  }

  function scheduleResolvedDismissal(eventId) {
    clearTimeout(resolvedTimer);
    resolvedTimer = setTimeout(function () {
      var current = flow();
      if (current.stage !== 'resolved' || current.activeEventId !== eventId) return;
      current.stage = 'idle';
      resolvedTimer = null;
      repaint();
    }, 3000);
  }

  function resetSessionLeakTracking() {
    var f = flow();
    clearTimeout(resolvedTimer);
    resolvedTimer = null;
    clearRecheckTimer();
    clearLoggedAutoCloseTimer();
    f.status = 'none';
    f.stage = 'idle';
    f.source = null;
    f.guideIndex = 0;
    f.wasRunning = false;
    f.activeEventId = null;
    f.guideNotice = '';
    f.statusDismissed = false;
    f.side = 'right';
    f.result = null;
    f.backgroundMonitoring = false;
    f.confirmOrigin = '';
    f.message = '';
    f.guideShownInSession = false;
    f.skipWarningShownInSession = false;
    f.guideMode = 'leak';
    f.guideStatusKind = 'detected';
    state.v3LeakEvents = [];
    state.air2SessionSummaryKind = null;
    state.air2ShowSessionSummary = false;
    state.air2ShowLoggedSummary = false;
    state.microLeakDuringSession = false;
    state.v3LoggedGuideOpen = false;
    state.v3LoggedGuideIndex = 0;
    state.v3HomeGuideIndex = 0;
    state.v3LoggedGuideSource = '';
    state.v3FitGuideConsumed = false;
    state.v3HomeLeakNoticeVisible = false;
    state.air2ActiveSessionId = null;
  }

  function lockedStage(stage) {
    return stage === 'guide' || stage === 'rechecking' || stage === 'complete' || stage === 'unresolved_confirm';
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

  function dotsMarkup(index, className, steps) {
    var dots = '';
    steps = steps || guideSteps();
    for (var i = 0; i < steps.length; i += 1) {
      dots += '<i class="' + (i === index ? 'is-active' : '') + '"></i>';
    }
    return '<span class="' + className + '" aria-hidden="true">' + dots + '</span>';
  }

  function guideArtMarkup(index, steps) {
    steps = steps || guideSteps();
    var step = steps[index];
    var asset = step.assets[0];
    var sideIndicators = step.kind.indexOf('tube-') === 0
      ? '<span class="sa-guide-sides" aria-hidden="true"><i class="' + (step.kind === 'tube-left' || step.kind === 'tube-both' ? 'is-active' : '') + '">L</i><i class="' + (step.kind === 'tube-right' || step.kind === 'tube-both' ? 'is-active' : '') + '">R</i></span>'
      : '';
    return '<span class="sa-guide-art sa-guide-art-' + step.kind + '" role="img" aria-label="' + step.label + '">' +
      sideIndicators +
      '<img class="sa-guide-art-image" src="' + asset + '" alt="">' +
    '</span>';
  }

  function guideArrow(direction) {
    return '<img src="./assets/stability-assistant/guide-arrow-' + direction + '.svg" alt="">';
  }

  function guideMarkup() {
    var f = flow();
    var steps = guideSteps();
    var index = Math.max(0, Math.min(steps.length - 1, Number(f.guideIndex) || 0));
    var step = steps[index];
    var fitNotDetected = f.guideMode === 'fit-not-detected';
    var guideTitle = fitNotDetected ? 'Fit Not Detected' : 'Self-Check';
    var guideCopy = fitNotDetected ? 'Check cup placement<br>Start pumping when ready.' : step.copy;
    return '<div class="sa-layer sa-guide-layer' + (fitNotDetected ? ' is-fit-not-detected' : '') + '" role="dialog" aria-modal="true" aria-label="Air seal guidance">' +
      '<div class="sa-scrim"></div><section class="sa-fit-guide-panel">' +
        '<header class="sa-guide-header"><div class="sa-guide-title"><h2>' + guideTitle + '</h2></div>' +
          (fitNotDetected ? '' : '<button class="sa-guide-skip" type="button" data-sa-action="ignore-for-now">Skip</button>') + '</header>' +
        '<p class="sa-guide-copy">' + guideCopy + '</p>' +
        '<div class="sa-guide-stage">' + (fitNotDetected ? '' : '<button class="sa-guide-prev" type="button" data-sa-action="guide-prev" aria-label="Previous guidance page" ' + (index === 0 ? 'disabled' : '') + '>' + guideArrow('left') + '</button>') +
          '<div class="sa-guide-media">' + guideArtMarkup(index) + '</div>' +
          (fitNotDetected ? '' : '<button class="sa-guide-next" type="button" data-sa-action="guide-next" aria-label="' + (index === steps.length - 1 ? 'Finish guidance and check the seal' : 'Next guidance page') + '">' + (index === steps.length - 1 ? '<span class="sa-guide-confirm">✓</span>' : guideArrow('right')) + '</button>') + '</div>' +
        (fitNotDetected ? '<button class="sa-fit-resume" type="button" data-sa-action="resume-fit-not-detected">Start Pumping</button>' : '<footer class="sa-guide-footer">' + dotsMarkup(index, 'sa-guide-dots') + '</footer>') +
      '</section>' +
      '<span class="sa-sr-only" aria-live="polite">' + (fitNotDetected ? step.label : 'Page ' + (index + 1) + ' of ' + steps.length + ': ' + step.label) + '</span>' +
    '</div>';
  }

  function loggedGuideStepMarkup(index) {
    var steps = loggedGuideSteps();
    index = Math.max(0, Math.min(steps.length - 1, Number(index) || 0));
    var step = steps[index];
    return '<div class="sa-log-guide-step" data-sa-log-guide-step="' + index + '">' +
      '<header class="sa-log-guide-header"><div class="sa-log-guide-heading"><span>Fit Guide</span><h2>' + step.title + '</h2></div>' +
        '<button class="sa-log-guide-close" type="button" data-sa-log-guide-back aria-label="Close fit guide"><img src="./assets/stability-assistant/figma-r4/close.svg" alt=""></button></header>' +
      '<div class="sa-log-guide-progress" aria-label="Page ' + (index + 1) + ' of ' + steps.length + '">' + (index + 1) + '/' + steps.length + '</div>' +
      '<p class="sa-log-guide-copy">' + step.copy + '</p>' +
      '<div class="sa-log-guide-stage"><button class="sa-log-guide-nav sa-log-guide-prev" type="button" data-sa-log-guide="prev" aria-label="Previous air seal guide step" ' + (index === 0 ? 'disabled' : '') + '>' + guideArrow('left') + '</button>' +
        '<div class="sa-log-guide-media">' + guideArtMarkup(index, steps) + '</div>' +
        '<button class="sa-log-guide-nav sa-log-guide-next" type="button" data-sa-log-guide="next" aria-label="Next air seal guide step" ' + (index === steps.length - 1 ? 'disabled' : '') + '>' + guideArrow('right') + '</button></div>' +
      '<footer class="sa-log-guide-footer">' + dotsMarkup(index, 'sa-log-guide-dots', steps) + '</footer>' +
    '</div>';
  }

  function sessionSummaryKind() {
    var hasMajorLeak = Array.isArray(state.v3LeakEvents) && state.v3LeakEvents.some(function (event) {
      return event && event.severity === 'major';
    });
    if (hasMajorLeak) return 'major-leak';
    return state.air2SessionSummaryKind;
  }

  function hasUnresolvedMajorLeak() {
    return Array.isArray(state.v3LeakEvents) && state.v3LeakEvents.some(function (event) {
      return event && event.severity === 'major' && event.resolutionStatus !== 'resolved';
    });
  }

  function loggedSummaryMarkup() {
    var kind = sessionSummaryKind();
    var unresolvedMajor = kind === 'major-leak' && hasUnresolvedMajorLeak();
    var steps = loggedGuideSteps();
    var guideIndex = Math.max(0, Math.min(steps.length - 1, Number(state.v3LoggedGuideIndex) || 0));
    var guideOpen = !!state.v3LoggedGuideOpen;
    var guideConsumed = !!state.v3FitGuideConsumed;
    var copy;
    if (unresolvedMajor) {
      copy = 'Suction was adjusted as much as possible by Stability Assistant for an air seal issue just now.';
    } else if (kind === 'major-leak') {
      copy = 'Suction was adjusted as much as possible by Stability Assistant for an air seal issue just now.';
    } else if (kind === 'minor-leak') {
      copy = 'Suction was automatically adjusted by Stability Assistant for a minor air seal change just now.';
    } else {
      copy = 'Check your setup before your next pumping session.';
    }
    if (kind === 'minor-leak') {
      copy = 'A minor air leak was detected. Suction was just compensated to your target level.<br>For worry-free pumping, check for air leaks.';
    }
    return '<img class="sa-logged-bg" src="./assets/stability-assistant/figma-r4/logged-bg.svg" alt="">' +
      '<button class="sa-logged-close" type="button" data-air2-logged-done aria-label="Close and return home"><img src="./assets/stability-assistant/figma-r4/close.svg" alt=""></button>' +
      '<div class="air2-logged-summary sa-major-summary' + (kind === 'minor-leak' ? ' is-minor-leak' : '') + (guideOpen ? ' is-guide-open' : '') + (guideConsumed ? ' is-guide-consumed' : '') + '"><div class="air2-logged-summary-main">' +
        '<span class="sa-logged-ip" aria-hidden="true"><img class="sa-logged-ip-main" src="./assets/stability-assistant/figma-r4/logged-ip-main.png" alt=""><img class="sa-logged-ip-overlay-a" src="./assets/stability-assistant/figma-r4/logged-ip-overlay-a.png" alt=""><img class="sa-logged-ip-overlay-b" src="./assets/stability-assistant/figma-r4/logged-ip-overlay-b.png" alt=""><img class="sa-logged-ip-highlight sa-logged-ip-highlight-left" src="./assets/stability-assistant/figma-r4/logged-ip-highlight.svg" alt=""><img class="sa-logged-ip-highlight sa-logged-ip-highlight-right" src="./assets/stability-assistant/figma-r4/logged-ip-highlight.svg" alt=""></span>' +
        '<div class="sa-logged-logo"><h1>Logged</h1><img src="./assets/stability-assistant/figma-r4/logged-underline.svg" alt=""></div>' +
        '<div class="sa-logged-actions"><p>' + copy + '</p>' +
        (guideConsumed ? '' : '<button type="button" data-air2-wear-guide>Learn to fit it better</button>') + '</div></div>' +
        '<div class="air2-logged-guide sa-log-guide">' + loggedGuideStepMarkup(guideIndex) + '</div></div>';
  }

  function homeLeakNoticeMarkup() {
    var steps = loggedGuideSteps();
    var index = Math.max(0, Math.min(steps.length - 1, Number(state.v3HomeGuideIndex) || 0));
    var step = steps[index];
    return '<section class="sa-home-leak-notice" role="region" aria-label="Fit Guide after a slight air leak">' +
      '<header class="sa-home-guide-header"><h2>Fit Guide</h2>' +
      '<button class="sa-home-leak-notice-close" type="button" data-sa-action="dismiss-home-leak-notice" aria-label="Dismiss air leak notice">' +
        '<img src="./assets/stability-assistant/figma-r4/home-notice-close.svg" alt="">' +
      '</button></header>' +
      '<p class="sa-home-guide-intro">A slight air leak was detected last session. Check your fit before the next session.</p>' +
      '<div class="sa-home-guide-step"><h3>' + step.title + '</h3><p>' + step.copy + '</p></div>' +
      '<div class="sa-home-guide-stage">' +
        '<button class="sa-home-guide-nav" type="button" data-sa-action="home-guide-prev" aria-label="Previous Fit Guide step" ' + (index === 0 ? 'disabled' : '') + '>' + guideArrow('left') + '</button>' +
        '<div class="sa-home-guide-media">' + guideArtMarkup(index, steps) + '</div>' +
        '<button class="sa-home-guide-nav" type="button" data-sa-action="home-guide-next" aria-label="Next Fit Guide step" ' + (index === steps.length - 1 ? 'disabled' : '') + '>' + guideArrow('right') + '</button>' +
      '</div>' +
      '<footer class="sa-home-guide-footer">' + dotsMarkup(index, 'sa-home-guide-dots', steps) + '</footer>' +
    '</section>';
  }

  function shouldShowHomeLeakNotice() {
    return state.page === 'home' &&
      sessionSummaryKind() === 'minor-leak' &&
      state.v3HomeLeakNoticeVisible === true &&
      state.v3FitGuideConsumed !== true;
  }

  function markFitGuideConsumed(source) {
    state.v3FitGuideConsumed = true;
    state.v3HomeLeakNoticeVisible = false;
    state.v3LoggedGuideSource = source || '';
  }

  function renderLoggedGuideStep(card, index) {
    var guide = card && card.querySelector('.sa-log-guide');
    if (!guide) return;
    index = Math.max(0, Math.min(loggedGuideSteps().length - 1, Number(index) || 0));
    guide.innerHTML = loggedGuideStepMarkup(index);
  }

  function setLoggedGuideOpen(open, card) {
    var sheet = card && card.closest('.v4-logged.air2-abnormal-logged');
    clearLoggedAutoCloseTimer();
    state.v3LoggedGuideOpen = !!open;
    if (!open && state.v3LoggedGuideSource === 'home-notice') {
      state.v3LoggedGuideSource = '';
      state.air2ShowLoggedSummary = false;
      state.modal = null;
      state.page = 'home';
      repaint();
      return;
    }
    if (!open && state.v3FitGuideConsumed) {
      state.v3LoggedGuideSource = '';
      repaint();
      scheduleLoggedAutoClose(2000);
      return;
    }
    if (!card || !sheet) {
      repaint();
      return;
    }
    card.classList.toggle('is-guide-open', !!open);
    sheet.classList.toggle('sa-guide-open', !!open);
    if (open) renderLoggedGuideStep(card, state.v3LoggedGuideIndex);
  }

  function checkCompleteMarkup() {
    return '<div class="sa-layer sa-result-layer" role="dialog" aria-modal="true" aria-labelledby="sa-result-title">' +
      '<div class="sa-scrim"></div><section class="sa-fit-guide-panel sa-check-result">' +
        '<h2 id="sa-result-title">Self-Check Complete</h2>' +
        '<p class="sa-result-description">We\'ll check the air seal again. If a leak remains,<br>suction will adjust automatically.</p>' +
        '<div class="sa-result-actions"><button class="sa-primary" type="button" data-sa-action="resume-after-check">Start Pumping</button>' +
          '<button class="sa-secondary" type="button" data-sa-action="end-after-check">End Session</button></div>' +
      '</section></div>';
  }

  function unresolvedConfirmMarkup() {
    return '<div class="sa-layer sa-unresolved-layer" role="dialog" aria-modal="true" aria-labelledby="sa-unresolved-title">' +
      '<div class="sa-scrim"></div><section class="sa-sheet sa-start-confirm">' +
        '<span class="sa-alert-icon" aria-hidden="true">!</span>' +
        '<h2 id="sa-unresolved-title">Start pumping anyway?</h2>' +
        '<p class="sa-copy">A serious air leak is still detected. Continuing may reduce pumping performance.</p>' +
        '<div class="sa-actions"><button class="sa-primary" type="button" data-sa-action="continue-unresolved">Continue Pumping</button>' +
          '<button class="sa-secondary" type="button" data-sa-action="cancel-unresolved">Learn to fit better</button></div>' +
      '</section></div>';
  }

  function statusMarkup(kind) {
    var closeButton = '<button class="sa-status-close" type="button" data-sa-action="dismiss-status" aria-label="Dismiss notification"><img src="./assets/figma-r72/notice-close-v3.svg" alt=""></button>';
    if (kind === 'checking') {
      return '<section class="sa-status sa-status-checking" role="status"><div class="sa-status-content">' +
        '<span class="sa-status-head"><i class="sa-status-icon sa-status-spinner" aria-hidden="true"></i><b>Checking Seal</b></span>' +
        '<small>Checking cup placement and air seal...</small></div></section>';
    }
    if (kind === 'passed') {
      return '<section class="sa-status sa-status-resolved" role="status"><div class="sa-status-content">' +
        '<span class="sa-status-head"><i class="sa-status-icon">✓</i><b>Seal check passed</b></span>' +
        '<small>Pumping is ready to continue.</small></div></section>';
    }
    if (kind === 'resolved') {
      return '<section class="sa-status sa-status-resolved" role="status"><div class="sa-status-content">' +
        '<span class="sa-status-head"><i class="sa-status-icon">✓</i><b>Air seal restored</b></span>' +
        '<small>You can continue pumping.</small></div></section>';
    }
    if (kind === 'detected') {
      return '<section class="sa-status sa-status-active sa-status-detected" role="status"><button class="sa-status-content" type="button" data-sa-action="start-guide" aria-label="Open air leak adjustment guide">' +
        '<span class="sa-status-alert" aria-hidden="true"><i class="sa-status-icon">!</i></span>' +
        '<span class="sa-status-copy"><b>Air leak detected</b><small>Follow the on-screen guide to solve it</small></span></button></section>';
    }
    return '<section class="sa-status sa-status-active" role="status"><button class="sa-status-content" type="button" data-sa-action="start-guide" aria-label="Open air leak adjustment guide">' +
      '<span class="sa-status-progress" aria-hidden="true"><img class="sa-status-progress-ring" src="./assets/stability-assistant/figma-r4/leak-spinner-ring.png" alt=""><img class="sa-status-progress-center" src="./assets/stability-assistant/figma-r4/leak-spinner-center.svg" alt=""></span>' +
      '<span class="sa-status-copy"><b>Air leak</b><small>Suction adjusting...</small></span></button>' + closeButton + '</section>';
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
    if (f.stage === 'rechecking' || f.stage === 'complete') root.insertAdjacentHTML('beforeend', checkCompleteMarkup());
    if (f.stage === 'unresolved_confirm') root.insertAdjacentHTML('beforeend', unresolvedConfirmMarkup());
    if (screen && state.running && !f.statusDismissed && ((f.stage === 'guide' && f.guideMode === 'leak') || f.stage === 'initial_checking' || f.stage === 'initial_passed' || f.stage === 'checking_running' || f.stage === 'failed' || f.stage === 'ignored_paused' || f.stage === 'ignored' || f.stage === 'resolved')) {
      screen.classList.add('sa-leak-running');
      screen.insertAdjacentHTML('beforeend', statusMarkup((f.stage === 'initial_checking' || f.stage === 'checking_running') ? 'checking' : (f.stage === 'initial_passed' ? 'passed' : (f.stage === 'resolved' ? 'resolved' : (f.stage === 'guide' ? f.guideStatusKind : 'leak')))));
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

    if (typeof window.v4Home === 'function') {
      baseHome = window.v4Home;
      window.v4Home = v4Home = function () {
        var html = baseHome.apply(this, arguments);
        if (!shouldShowHomeLeakNotice()) return html;
        return html.replace('</section><section class="v4-home-card v4-lactation">', '</section>' + homeLeakNoticeMarkup() + '<section class="v4-home-card v4-lactation">');
      };
    }

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
        var previousSummaryState = state.air2ShowLoggedSummary;
        var html;
        state.air2ShowLoggedSummary = false;
        html = baseLogged.apply(this, arguments);
        state.air2ShowLoggedSummary = previousSummaryState;
        return html;
      };
    }
    window.__v3LeakFlowWrapped = true;
  }

  function beginSevere(source, side) {
    var f = flow();
    if (source === 'pumping' && (!state.running || state.paused || state.modal)) {
      setMessage('Start pumping before triggering an in-session serious leak.');
      return false;
    }
    if (source === 'self_check' && state.modal !== 'fit') {
      setMessage('Start Fit Check before triggering a self-check serious leak.');
      return false;
    }
    if (source === 'pumping' && f.guideShownInSession) return beginRepeatedSevere(side);
    clearRecheckTimer();
    var eventId = 'leak-' + now();
    f.status = 'major_active';
    f.stage = 'guide';
    f.source = source;
    f.side = /^(left|right|both)$/.test(side || '') ? side : 'right';
    f.result = null;
    f.backgroundMonitoring = false;
    f.guideIndex = 0;
    f.wasRunning = source === 'pumping' ? !!state.running : false;
    f.activeEventId = eventId;
    f.guideNotice = '';
    f.statusDismissed = false;
    f.message = '';
    f.guideShownInSession = true;
    f.guideMode = 'leak';
    f.guideStatusKind = 'detected';
    state.v3LeakEvents.push({
      eventId: eventId,
      severity: 'major',
      side: f.side,
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

  function beginRepeatedSevere(side) {
    var f = flow();
    var eventId = 'leak-' + now();
    clearRecheckTimer();
    clearTimeout(resolvedTimer);
    resolvedTimer = null;
    f.status = 'major_active';
    f.stage = 'ignored';
    f.source = 'pumping';
    f.side = /^(left|right|both)$/.test(side || '') ? side : 'right';
    f.result = 'failed';
    f.backgroundMonitoring = true;
    f.guideIndex = 0;
    f.wasRunning = true;
    f.activeEventId = eventId;
    f.guideNotice = '';
    f.guideMode = 'leak';
    f.statusDismissed = false;
    f.message = 'Repeated serious leak: compact reminder shown; pumping continues.';
    state.v3LeakEvents.push({
      eventId: eventId,
      severity: 'major',
      side: f.side,
      source: 'pumping',
      pumpAction: 'continued',
      userAction: 'repeat_notification',
      resolutionStatus: 'active',
      detectedAt: now(),
      resolvedAt: null
    });
    state.air2SessionSummaryKind = 'major-leak';
    state.controlNotice = null;
    state.modal = null;
    state.running = true;
    state.paused = false;
    state.air2LastPhysicsAt = now();
    repaint();
    return true;
  }

  function ignoreForNow() {
    var f = flow();
    var event = activeEvent();
    if (f.skipWarningShownInSession) {
      clearRecheckTimer();
      f.status = 'major_ignored';
      f.stage = 'ignored';
      f.result = 'failed';
      f.backgroundMonitoring = true;
      f.confirmOrigin = '';
      f.statusDismissed = false;
      if (event) {
        event.userAction = 'repeat_skip_continue';
        event.pumpAction = f.source === 'self_check' ? 'started_with_unresolved_leak' : 'resumed_with_unresolved_leak';
        event.resolutionStatus = 'ignored';
      }
      state.modal = null;
      state.running = true;
      state.paused = false;
      state.air2LastPhysicsAt = now();
      repaint();
      return;
    }
    f.skipWarningShownInSession = true;
    openUnresolvedConfirm('skip');
  }

  function openUnresolvedConfirm(origin) {
    var f = flow();
    var event = activeEvent();
    if (f.status === 'resolved' || f.result === 'passed') return false;
    clearRecheckTimer();
    f.status = 'major_active';
    f.stage = 'unresolved_confirm';
    f.result = 'failed';
    f.backgroundMonitoring = false;
    f.confirmOrigin = origin || 'timeout';
    f.statusDismissed = true;
    if (event) {
      event.userAction = f.confirmOrigin === 'skip' ? 'skip_warning_shown' : 'unresolved_warning_shown';
      event.resolutionStatus = 'active';
    }
    state.page = 'control';
    state.modal = null;
    state.paused = true;
    if (f.source === 'self_check') state.running = false;
    repaint();
    return true;
  }

  function continueWithUnresolvedLeak() {
    var f = flow();
    var event = activeEvent();
    if (f.stage !== 'unresolved_confirm') return;
    clearRecheckTimer();
    f.status = 'major_ignored';
    f.stage = 'ignored';
    f.result = 'failed';
    f.backgroundMonitoring = true;
    f.confirmOrigin = '';
    f.statusDismissed = false;
    if (event) {
      event.userAction = 'continue_unresolved';
      event.pumpAction = f.source === 'self_check' ? 'started_with_unresolved_leak' : 'resumed_with_unresolved_leak';
      event.resolutionStatus = 'ignored';
    }
    state.modal = null;
    state.running = true;
    state.paused = false;
    state.air2LastPhysicsAt = now();
    repaint();
  }

  function cancelUnresolvedLeak() {
    var f = flow();
    var event = activeEvent();
    if (f.stage !== 'unresolved_confirm') return;
    clearRecheckTimer();
    f.stage = 'guide';
    f.result = null;
    f.backgroundMonitoring = false;
    f.confirmOrigin = '';
    f.statusDismissed = true;
    f.guideIndex = 0;
    f.guideNotice = '';
    f.guideMode = 'leak';
    if (event) event.userAction = 'return_to_guide';
    state.modal = null;
    state.paused = true;
    if (f.source === 'self_check') state.running = false;
    repaint();
  }

  function completeCheck(passed, action) {
    var f = flow();
    var event = activeEvent();
    clearRecheckTimer();
    f.status = passed ? 'resolved' : 'major_active';
    f.stage = 'complete';
    f.result = passed ? 'passed' : 'failed';
    f.backgroundMonitoring = false;
    f.statusDismissed = false;
    if (event) {
      event.userAction = action || 'checked';
      event.resolutionStatus = passed ? 'resolved' : 'active';
      if (passed) event.resolvedAt = now();
    }
    state.page = 'control';
    state.modal = null;
    state.paused = true;
    if (f.source === 'self_check') state.running = false;
    repaint();
  }

  function resumeAfterCheck() {
    var f = flow();
    var event = activeEvent();
    if (f.stage !== 'complete' && f.stage !== 'rechecking') return;
    var passed = f.result === 'passed';
    clearRecheckTimer();
    if (!passed) {
      f.backgroundMonitoring = true;
      f.status = 'major_active';
      f.stage = 'checking_running';
      f.result = 'failed';
      f.statusDismissed = false;
    } else {
      f.backgroundMonitoring = false;
      f.status = 'resolved';
      f.stage = 'idle';
      f.statusDismissed = true;
    }
    if (event) {
      event.userAction = passed ? 'resume_after_pass' : 'start_with_background_check';
      event.pumpAction = f.source === 'self_check' ? 'started_after_check' : 'resumed';
      event.resolutionStatus = passed ? 'resolved' : 'active';
    }
    state.modal = null;
    state.running = true;
    state.paused = false;
    state.air2LastPhysicsAt = now();
    repaint();
  }

  function completeBackgroundCheck(passed, action) {
    var f = flow();
    var event = activeEvent();
    clearTimeout(resolvedTimer);
    resolvedTimer = null;
    clearRecheckTimer();
    f.result = passed ? 'passed' : 'failed';
    f.backgroundMonitoring = !passed;
    f.status = passed ? 'resolved' : 'major_ignored';
    f.stage = passed ? 'resolved' : 'ignored';
    f.statusDismissed = false;
    if (event) {
      event.userAction = action || (passed ? 'background_check_passed' : 'background_check_failed');
      event.resolutionStatus = passed ? 'resolved' : 'ignored';
      if (passed) event.resolvedAt = now();
    }
    state.modal = null;
    state.running = true;
    state.paused = false;
    state.air2LastPhysicsAt = now();
    repaint();
    if (passed) scheduleResolvedDismissal(f.activeEventId);
  }

  function endAfterCheck() {
    var f = flow();
    var event = activeEvent();
    if (f.stage !== 'complete' && f.stage !== 'rechecking') return;
    clearRecheckTimer();
    if (event) {
      event.userAction = 'end_session';
      event.pumpAction = 'ended';
      if (f.result !== 'passed') event.resolutionStatus = 'unresolved';
    }
    f.stage = 'idle';
    f.backgroundMonitoring = false;
    f.statusDismissed = true;
    state.page = 'control';
    state.running = false;
    state.paused = false;
    state.modal = 'log';
    state.air2SessionEnded = true;
    state.air2SessionSummaryKind = 'major-leak';
    state.air2ShowSessionSummary = true;
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
    if (f.backgroundMonitoring || previousStage === 'checking_running') {
      completeBackgroundCheck(true, 'background_check_passed');
      return true;
    }
    if (previousStage === 'rechecking') {
      completeCheck(true, 'checked');
      return true;
    }
    if (previousStage === 'complete') {
      clearRecheckTimer();
      f.status = 'resolved';
      f.result = 'passed';
      f.backgroundMonitoring = false;
      f.statusDismissed = true;
      if (event) {
        event.resolutionStatus = 'resolved';
        event.resolvedAt = now();
        event.userAction = 'check_passed_before_timeout';
      }
      repaint();
      return true;
    }
    f.status = 'resolved';
    f.stage = 'resolved';
    f.statusDismissed = false;
    if (event) {
      event.resolutionStatus = 'resolved';
      event.resolvedAt = now();
      if (previousStage === 'rechecking') event.userAction = 'retry';
    }
    state.running = true;
    state.paused = false;
    state.air2LastPhysicsAt = now();
    repaint();
    scheduleResolvedDismissal(f.activeEventId);
    return true;
  }

  function recheckFailed() {
    var f = flow();
    var event = activeEvent();
    if (f.stage === 'checking_running') {
      f.status = 'major_active';
      f.stage = 'failed';
      f.result = 'failed';
      f.backgroundMonitoring = true;
      f.statusDismissed = false;
      if (event) {
        event.userAction = 'background_check_failed';
        event.resolutionStatus = 'active';
      }
      repaint();
      return true;
    }
    if (f.backgroundMonitoring) {
      completeBackgroundCheck(false, 'background_check_failed');
      return true;
    }
    if (f.stage === 'complete') {
      f.status = 'major_active';
      f.result = 'failed';
      if (event) {
        event.userAction = 'check_failed_before_start';
        event.resolutionStatus = 'active';
      }
      repaint();
      return true;
    }
    if (f.stage !== 'rechecking') {
      setMessage('Open Recheck air seal before returning a failed result.');
      return false;
    }
    completeCheck(false, 'checked');
    return true;
  }

  function startRecheck() {
    var f = flow();
    clearRecheckTimer();
    f.status = 'major_active';
    f.stage = 'complete';
    f.result = 'failed';
    f.backgroundMonitoring = false;
    f.confirmOrigin = '';
    f.guideNotice = '';
    var event = activeEvent();
    if (event) event.userAction = 'self_check_complete';
    repaint();
  }

  function beginFitNotDetectedGuide() {
    var f = flow();
    if (!state.running || state.paused || state.modal) {
      setMessage('Start pumping before triggering Fit not detected.');
      return false;
    }
    clearRecheckTimer();
    f.status = 'none';
    f.stage = 'guide';
    f.source = 'pumping';
    f.guideMode = 'fit-not-detected';
    f.guideIndex = 2;
    f.result = null;
    f.backgroundMonitoring = false;
    f.statusDismissed = true;
    f.message = '';
    state.controlNotice = null;
    state.modal = null;
    state.paused = true;
    repaint();
    return true;
  }

  function finishFitNotDetectedGuide() {
    var f = flow();
    f.stage = 'initial_checking';
    f.guideMode = 'leak';
    f.statusDismissed = false;
    state.running = true;
    state.paused = false;
    state.air2LastPhysicsAt = now();
    repaint();
  }

  function beginInitialSealCheck() {
    var f = flow();
    f.status = 'checking';
    f.stage = 'initial_checking';
    f.source = 'session_start';
    f.result = null;
    f.backgroundMonitoring = false;
    f.statusDismissed = false;
    f.message = '';
    repaint();
  }

  function passInitialSealCheck() {
    var f = flow();
    f.status = 'resolved';
    f.stage = 'initial_passed';
    f.result = 'passed';
    f.statusDismissed = false;
    repaint();
    clearTimeout(resolvedTimer);
    resolvedTimer = setTimeout(function () {
      var current = flow();
      if (current.stage !== 'initial_passed') return;
      current.stage = 'idle';
      current.status = 'none';
      current.statusDismissed = true;
      resolvedTimer = null;
      repaint();
    }, 3000);
    return true;
  }

  function previewHomeLeakNotice() {
    clearLoggedAutoCloseTimer();
    state.air2SessionSummaryKind = 'minor-leak';
    state.v3FitGuideConsumed = false;
    state.v3HomeLeakNoticeVisible = true;
    state.v3LoggedGuideOpen = false;
    state.v3HomeGuideIndex = 0;
    state.v3LoggedGuideSource = '';
    state.air2ShowLoggedSummary = false;
    state.modal = null;
    state.page = 'home';
    state.running = false;
    state.paused = false;
    repaint();
    return true;
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
    f.statusDismissed = false;
    f.backgroundMonitoring = false;
    f.confirmOrigin = '';
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

  function startProgramFitCheck() {
    state.page = 'control';
    state.modal = null;
    state.selectedProgram = 'Milk Boost';
    state.mode = 'stimulation';
    state.auto = true;
    state.timer = 0;
    state.running = false;
    state.paused = false;
    state.air2SessionEnded = false;
    state.air2ActiveSessionId = 'session-' + now();
    if (typeof window.v4RunFit === 'function') {
      window.v4RunFit();
      return true;
    }
    setMessage('Fit Check is not ready.');
    repaint();
    return false;
  }

  function trigger(id) {
    var f = flow();
    if (id === 'suction-normal') {
      if (f.stage === 'initial_checking') return passInitialSealCheck();
      if (state.modal === 'fit') return runLegacyTrigger('fit-ok', 'Open Fit Check before returning a normal result.');
      if (f.status === 'major_active' || f.status === 'major_ignored') return resolveLeak();
      setMessage('Seal check has already passed.');
      return true;
    }
    if (id === 'suction-failed') {
      if (state.modal === 'fit') return beginSevere('self_check', 'right');
      if (f.stage === 'complete' || f.stage === 'rechecking' || f.stage === 'checking_running' || f.backgroundMonitoring) return recheckFailed();
      setMessage('Start Fit Check or Recheck before returning a failed result.');
      return false;
    }
    if (id === 'fit-check-passed') return runLegacyTrigger('fit-ok', 'Open Fit Check before returning a passed result.');
    if (id === 'minor-leak') return runLegacyTrigger('minor-leak', 'Start pumping before triggering a minor leak.');
    if (id === 'fit-not-detected-20s') return beginFitNotDetectedGuide();
    if (id === 'home-leak-reminder') return previewHomeLeakNotice();
    if (id.indexOf('serious-leak-') === 0) {
      var side = id.replace('serious-leak-', '');
      if (state.modal === 'fit') return beginSevere('self_check', side);
      return beginSevere('pumping', side);
    }
    if (id === 'recheck-passed') return resolveLeak();
    if (id === 'recheck-failed') return recheckFailed();
    if (id === 'reset-leak') { resetLeak(); return true; }
    return false;
  }

  function guideDelta(delta) {
    var f = flow();
    var next = f.guideIndex + delta;
    if (f.guideMode === 'fit-not-detected') {
      if (delta > 0) finishFitNotDetectedGuide();
      return;
    }
    if (next < 0) return;
    if (next >= guideSteps().length) {
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
    if (id === 'dismiss-home-leak-notice') {
      markFitGuideConsumed('home-inline');
      state.v3HomeGuideIndex = 0;
      repaint();
      return;
    } else if (id === 'home-guide-prev' || id === 'home-guide-next') {
      var homeSteps = loggedGuideSteps();
      var homeDelta = id === 'home-guide-next' ? 1 : -1;
      var homeScreen = root.querySelector('.h7-home .v4-home-cards');
      var homeScrollTop = homeScreen ? homeScreen.scrollTop : 0;
      state.v3HomeGuideIndex = Math.max(0, Math.min(homeSteps.length - 1, (Number(state.v3HomeGuideIndex) || 0) + homeDelta));
      repaint();
      homeScreen = root.querySelector('.h7-home .v4-home-cards');
      if (homeScreen) homeScreen.scrollTop = homeScrollTop;
      return;
    } else if (id === 'start-guide' || id === 'review-again') {
      clearRecheckTimer();
      f.guideStatusKind = f.stage === 'guide' ? f.guideStatusKind : 'leak';
      f.stage = 'guide';
      f.guideIndex = 0;
      f.guideNotice = '';
      f.guideMode = 'leak';
      state.paused = true;
      if (event) event.userAction = 'troubleshoot';
    } else if (id === 'guide-prev') {
      guideDelta(-1); return;
    } else if (id === 'guide-next') {
      guideDelta(1); return;
    } else if (id === 'ignore-for-now') {
      if (f.guideMode === 'fit-not-detected') { finishFitNotDetectedGuide(); return; }
      ignoreForNow(); return;
    } else if (id === 'resume-after-check') {
      resumeAfterCheck(); return;
    } else if (id === 'end-after-check') {
      endAfterCheck(); return;
    } else if (id === 'continue-unresolved') {
      continueWithUnresolvedLeak(); return;
    } else if (id === 'cancel-unresolved') {
      cancelUnresolvedLeak(); return;
    } else if (id === 'resume-fit-not-detected') {
      finishFitNotDetectedGuide(); return;
    } else if (id === 'dismiss-status') {
      f.statusDismissed = true;
      repaint(); return;
    }
    repaint();
  }

  function decorateLatestRecord() {
    if (sessionSummaryKind() !== 'major-leak' || !Array.isArray(state.air2SessionHistory)) return;
    var id = state.air2ActiveSessionId;
    var record = state.air2SessionHistory.find(function (item) { return item.id === id; });
    if (!record) record = state.air2SessionHistory[state.air2SessionHistory.length - 1];
    if (!record) return;
    record.hasAbnormality = true;
    record.maxLeakSeverity = 'major';
    record.leakSides = [flow().side];
    record.leakEventCount = state.v3LeakEvents.length;
    record.majorLeakIgnored = state.v3LeakEvents.some(function (item) {
      return item.userAction === 'ignore_for_now' || item.userAction === 'ignore_continue';
    });
    record.leakEvents = state.v3LeakEvents.slice();
  }

  function triggerGroupMarkup() {
    return '<section class="demo-trigger-group sa-trigger-group"><h3>Stability Assistant</h3>' +
      '<div class="demo-trigger-grid">' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="suction-normal"><b>Seal check passed</b></button>' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="suction-failed"><b>Air leak remains</b></button>' +
        '<button class="demo-trigger-action" type="button" data-sa-trigger="minor-leak"><b>Slight leak</b></button>' +
        '<button class="demo-trigger-action" type="button" data-sa-trigger="home-leak-reminder"><b>Post-session reminder</b></button>' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="serious-leak-left"><b>Serious leak · Left</b></button>' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="serious-leak-right"><b>Serious leak · Right</b></button>' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="serious-leak-both"><b>Serious leak · Both</b></button>' +
        '<button class="demo-trigger-action is-primary" type="button" data-sa-trigger="fit-not-detected-20s"><b>Fit not detected · 20s</b></button>' +
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
    var saveButton = event.target.closest && event.target.closest('#demo [data-v4="save"]');
    var programConfirmButton = event.target.closest && event.target.closest('#demo [data-v4="confirm"]');
    var triggerButton = event.target.closest && event.target.closest('[data-sa-trigger]');
    var actionButton = event.target.closest && event.target.closest('#demo [data-sa-action]');
    var resumeButton = event.target.closest && event.target.closest('#demo [data-v4="pause"]');
    var loggedGuideButton = event.target.closest && event.target.closest('#demo [data-sa-log-guide]');
    var loggedGuideBack = event.target.closest && event.target.closest('#demo [data-sa-log-guide-back]');
    var loggedOpen = event.target.closest && event.target.closest('#demo [data-air2-wear-guide]');
    var pageNavigation = event.target.closest && event.target.closest('#demo [data-v4]');
    if (programConfirmButton && state.modal === 'confirm') {
      event.preventDefault();
      event.stopImmediatePropagation();
      startProgramFitCheck();
      return;
    }
    if (sessionStartButton) {
      resetSessionLeakTracking();
      setTimeout(beginInitialSealCheck, 0);
    }
    if (saveButton) scheduleLoggedAutoClose(2000);
    if (resumeButton) markExplicitResume();
    if (state.page === 'home' && pageNavigation && pageNavigation.getAttribute('data-v4') !== 'home') {
      state.v3HomeLeakNoticeVisible = false;
    }
    if (loggedOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
      markFitGuideConsumed('logged');
      state.v3LoggedGuideIndex = 0;
      setLoggedGuideOpen(true, loggedOpen.closest('.air2-logged-summary'));
      return;
    }
    if (loggedGuideBack) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setLoggedGuideOpen(false, loggedGuideBack.closest('.air2-logged-summary'));
      return;
    }
    if (loggedGuideButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var card = loggedGuideButton.closest('.air2-logged-summary');
      var currentStep = card && card.querySelector('[data-sa-log-guide-step]');
      var index = Number(currentStep && currentStep.getAttribute('data-sa-log-guide-step')) || 0;
      state.v3LoggedGuideOpen = true;
      state.v3LoggedGuideIndex = Math.max(0, Math.min(loggedGuideSteps().length - 1, index + (loggedGuideButton.getAttribute('data-sa-log-guide') === 'next' ? 1 : -1)));
      renderLoggedGuideStep(card, state.v3LoggedGuideIndex);
      return;
    }
    if (triggerButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var triggered = trigger(triggerButton.getAttribute('data-sa-trigger'));
      var host = triggerButton.closest('.demo-trigger-root');
      if (host && triggered !== false) {
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
    var save = event.target.closest && event.target.closest('#demo [data-v4="save"]');
    if (save) scheduleLoggedAutoClose(2000);
    var loggedCard = event.target.closest && event.target.closest('#demo .air2-logged-summary');
    if (loggedCard && state.v3LoggedGuideOpen) loggedSwipe = { id: event.pointerId, x: event.clientX, card: loggedCard };
    var finish = event.target.closest && event.target.closest('#demo [data-v4="finish"],#demo [data-action="finish"]');
    if (finish && state.v3LeakEvents && state.v3LeakEvents.length) state.air2SessionSummaryKind = 'major-leak';
    var loggedDone = event.target.closest && event.target.closest('#demo [data-air2-logged-done]');
    if (loggedDone) {
      clearLoggedAutoCloseTimer();
      state.v3HomeLeakNoticeVisible = sessionSummaryKind() === 'minor-leak' && state.v3FitGuideConsumed !== true;
    }
  }

  function onPointerUp(event) {
    if (loggedSwipe && loggedSwipe.id === event.pointerId) {
      var loggedDx = event.clientX - loggedSwipe.x;
      var loggedCard = loggedSwipe.card;
      loggedSwipe = null;
      if (Math.abs(loggedDx) >= 42) {
        state.v3LoggedGuideIndex = Math.max(0, Math.min(loggedGuideSteps().length - 1, state.v3LoggedGuideIndex + (loggedDx < 0 ? 1 : -1)));
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
      f.stage === 'rechecking' ||
      f.stage === 'complete' ||
      f.stage === 'unresolved_confirm';
    var needsStatus = state.running && !f.statusDismissed && (f.stage === 'initial_checking' || f.stage === 'initial_passed' || f.stage === 'checking_running' || f.stage === 'failed' || f.stage === 'ignored_paused' || f.stage === 'ignored' || f.stage === 'resolved');
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

  window.V3ProLeakFlow = { version: 7, trigger: trigger, state: flow, resetSession: resetSessionLeakTracking };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
