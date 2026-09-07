/* One-row rhythm intervention. UI gestures do not reset session totals. */
(function () {
  'use strict';
  const host = document.getElementById('demo');
  const nativeBars = new WeakMap();
  let gesture = null, message = '', messageUntil = 0, finishingTimer = null;
  const sequence = () => state.rhythmSequence || ['stimulation', 'expression', 'stimulation', 'expression'];
  const index = () => Math.max(0, Math.min(sequence().length - 1, Number(state.rhythmIndex) || 0));
  const blocked = () => !!(state.modal || state.severeLeak || state.leakAdjusting || state.air2CriticalBatteryActive || state.air2Offline);
  const active = () => state.page === 'control' && state.running && !!state.selectedProgram;
  const hand = '<img src="./assets/rhythm-hand.svg" alt="">';
  window.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#demo [data-v4="confirm"],#demo [data-v4="start"]')) {
      state.rhythmIndex = 0; state.rhythmStageStartedAt = 0;
    }
  }, true);
  function guide() {
    return '<div class="ri-guide"><span><i>← ' + hand + '</i><b>左滑</b><small>上一阶段</small></span><span><i>' + hand + '</i><b>点击</b><small>暂停</small></span><span><i>' + hand + ' →</i><b>右滑</b><small>下一阶段</small></span></div>';
  }
  function stage(delta) {
    if (!active() || state.paused || blocked()) return;
    const next = index() + delta;
    if (next < 0 || next >= sequence().length) return;
    state.rhythmSequence = sequence();
    state.rhythmIndex = next;
    state.mode = sequence()[next];
    state.rhythmStageStartedAt = state.timer;
    // Cancel pending let-down decisions from the phase being left.
    state.letdownPhase = 'baseline';
    state.letdownEventAt = null;
    state.letdownStableSince = null;
    state.noMilkSince = null;
    state.letdownSuggestionShown = false;
    state.manualEndSuggestionShown = false;
    state.controlNotice = null;
    state.air2LastPhysicsAt = Date.now();
    message = '已切换至第 ' + (next + 1) + ' / ' + sequence().length + ' 阶段';
    messageUntil = Date.now() + 1800;
    v4View(); sync();
  }
  function markup() {
    return '<button type="button" class="ri-stop" data-ri="stop" aria-label="长按两秒结束吸奶"><span>■</span></button><button type="button" class="ri-slider" data-ri="slider" aria-label="点击暂停，左滑上一阶段，右滑下一阶段"><span class="ri-rail"></span><span class="ri-left">‹</span><span class="ri-knob">Ⅱ</span><span class="ri-right">›</span><span class="ri-continue">▶ Tap to continue</span></button><div class="ri-tip" role="status" hidden></div>';
  }
  function sync() {
    const bar = host.querySelector('.v4-control .v4-actions');
    if (!active() || !bar) { if (gesture) { clearTimeout(finishingTimer); gesture = null; } if (bar && bar.classList.contains('ri-actions')) { bar.innerHTML = nativeBars.get(bar) || ''; bar.classList.remove('ri-actions'); } return; }
    if (!bar.classList.contains('ri-actions')) {
      nativeBars.set(bar, bar.innerHTML);
      bar.classList.add('ri-actions');
      bar.innerHTML = markup();
    }
    const slider = bar.querySelector('.ri-slider'), tip = bar.querySelector('.ri-tip');
    slider.classList.toggle('ri-paused', !!state.paused);
    slider.disabled = blocked();
    bar.querySelector('.ri-stop').disabled = !!state.air2CriticalBatteryActive;
    slider.setAttribute('aria-label', state.paused ? '点击继续' : '点击暂停，左滑上一阶段，右滑下一阶段');
    bar.querySelector('.ri-left').classList.toggle('ri-unavailable', index() === 0);
    bar.querySelector('.ri-right').classList.toggle('ri-unavailable', index() === sequence().length - 1);
    let text = '';
    if (gesture && (blocked() || gesture.paused !== !!state.paused)) { cancel(); return; }
    if (gesture && gesture.kind === 'stop') {
      text = 'Hold to finish';
      bar.querySelector('.ri-stop').style.setProperty('--hold', Math.min(1, (Date.now() - gesture.at) / 2000));
    } else if (gesture && !state.paused) {
      const dx = gesture.dx, bound = Math.max(0, slider.clientWidth / 2 - 33);
      bar.querySelector('.ri-knob').style.transform = 'translateX(' + Math.max(-bound, Math.min(bound, dx)) + 'px)';
      text = !gesture.moved ? guide() : Math.abs(dx) < 48 ? '松开取消' : dx > 0 ? (index() === sequence().length - 1 ? '已是最后阶段' : '松开进入下一阶段 →') : (index() === 0 ? '已是第一阶段' : '← 松开回到上一阶段');
    } else {
      bar.querySelector('.ri-knob').style.transform = '';
      bar.querySelector('.ri-stop').style.setProperty('--hold', 0);
      if (Date.now() < messageUntil) text = message;
    }
    tip.classList.toggle('ri-stop-tip', !!(gesture && gesture.kind === 'stop') || text === 'Hold to finish');
    tip.hidden = !text;
    if (tip.innerHTML !== text) tip.innerHTML = text;
  }
  function cancel() { clearTimeout(finishingTimer); finishingTimer = null; gesture = null; sync(); }
  function pause() {
    if (blocked()) return;
    state.paused = !state.paused;
    state.air2LastPhysicsAt = Date.now();
    message = ''; messageUntil = 0;
    v4View(); sync();
  }
  function finish() {
    if (!gesture || gesture.kind !== 'stop' || !active() || state.air2CriticalBatteryActive) return;
    gesture = null; finishingTimer = null;
    state.air2SessionSummaryKind = state.microLeakDuringSession ? 'minor-leak' : 'stable';
    state.air2ShowSessionSummary = true;
    state.running = false; state.paused = false; state.modal = 'log';
    message = ''; v4View();
  }
  window.addEventListener('pointerdown', function (e) {
    const el = e.target.closest && e.target.closest('#demo [data-ri]');
    if (!el || el.disabled || gesture) return;
    e.preventDefault(); e.stopImmediatePropagation();
    gesture = {kind: el.dataset.ri, id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, moved: false, paused: !!state.paused, at: Date.now()};
    // Capture on the stable root: existing demo renders replace buttons each second.
    try { host.setPointerCapture(e.pointerId); } catch (_) {}
    messageUntil = 0;
    if (gesture.kind === 'stop') finishingTimer = setTimeout(finish, 2000);
    sync();
  }, true);
  window.addEventListener('pointermove', function (e) {
    if (!gesture || e.pointerId !== gesture.id) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const dx = (e.clientX - gesture.x) / (host.getBoundingClientRect().width / host.offsetWidth || 1);
    if (Math.abs(e.clientY - gesture.y) > 55 || (gesture.kind === 'stop' && Math.abs(dx) > 35)) { cancel(); return; }
    gesture.dx = dx;
    if (Math.abs(dx) > 8) gesture.moved = true;
    sync();
  }, true);
  window.addEventListener('pointerup', function (e) {
    if (!gesture || e.pointerId !== gesture.id) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const g = gesture; clearTimeout(finishingTimer); gesture = null;
    if (g.kind === 'stop') { message = 'Hold to finish'; messageUntil = Date.now() + 1800; }
    else if (!blocked()) {
      if (!g.moved) pause();
      else if (!g.paused && Math.abs(g.dx) >= 48) stage(g.dx > 0 ? 1 : -1);
    }
    sync();
  }, true);
  window.addEventListener('pointercancel', cancel, true);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  window.addEventListener('click', function(e) {
    const el = e.target.closest && e.target.closest('#demo [data-ri]');
    if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.detail === 0 && !el.disabled) {
      if (el.dataset.ri === 'slider') pause();
      else { message = 'Hold to finish'; messageUntil = Date.now() + 1800; sync(); }
    }
  }, true);
  window.addEventListener('keydown', function(e) {
    const el = e.target.closest && e.target.closest('#demo [data-ri]');
    if (!el || el.disabled) return;
    if (el.dataset.ri === 'slider' && ['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); stage(e.key === 'ArrowRight' ? 1 : -1); }
    if (el.dataset.ri === 'stop' && [' ','Enter'].includes(e.key) && !e.repeat) {
      e.preventDefault(); gesture = {kind:'stop', paused:!!state.paused, at:Date.now()}; finishingTimer = setTimeout(finish,2000); sync();
    }
  }, true);
  window.addEventListener('keyup', function(e) { if (gesture && gesture.kind === 'stop' && gesture.id == null && [' ','Enter'].includes(e.key)) { e.preventDefault(); cancel(); } }, true);
  // Observe root replacements only; our descendant updates cannot create an observer loop.
  new MutationObserver(sync).observe(host, {childList:true});
  setInterval(sync, 80);
  sync();
})();
