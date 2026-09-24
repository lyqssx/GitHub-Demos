/* Approved 2026-09-21 scope. This owns the V2 control/report flow; legacy
   renderers remain available only for Device and Home. */
(function () {
  'use strict';
  const { Session, CONFIG, ML_PER_OZ } = window.Air2PDCP;
  const originalControl = window.v4Control;
  const originalHardware = window.v4Hardware;
  const originalList = window.v4List;
  const modeNames = { stimulation: 'Stimulation', expression: 'Expression', mixed: 'Mixed' };
  const methodNames = { auto: 'Auto Switch', manual: 'Manual', preset: 'Preset' };
  const presets = { 'Milk Boost': [60, 300, 120, 720], 'Cozy Flow': [90, 360, 120, 720], 'Power Pumping': [120, 900, 480, 1200] };
  let session = null, report = null, method = 'auto', manualMode = 'stimulation', preset = 'Milk Boost';
  let sheet = null, fit = null, fitTimer = null, notice = '', timerAt = performance.now(), holding = null, signature = '';
  const unit = 'oz';
  let prePumpingCheck = localStorage.getItem('air2-pre-pumping-check') !== 'false';
  let settingsReturn = 'control';
  let triggerDrag = null, suppressTriggerClickUntil = 0;
  let dataExpanded = false, angleDemo = null, angleAnimation = null, endingPending = false;
  let triggersOpen = false, exportBusy = false, simulationRemainder = 0;
  let triggerEnd = null;
  const overrides = { l: null, r: null };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = s => Math.floor(Math.max(0, s) / 60).toString().padStart(2, '0') + ':' + Math.floor(Math.max(0, s) % 60).toString().padStart(2, '0');
  const amount = ml => (ml / ML_PER_OZ).toFixed(2);
  const flow = ml => (ml / ML_PER_OZ).toFixed(2);
  const btn = (action, label, cls = '', extras = '') => `<button class="${cls}" data-pdcp="${action}" ${extras}>${label}</button>`;
  const sideLabel = k => k === 'l' ? 'Left' : 'Right';
  const nowSide = k => session ? session.sides[k] : { volume: 0, flow: 0, count: 0, peak: 0, stopped: false, active: false };
  function syncLegacy() {
    state.auto = method === 'auto'; state.selectedProgram = method === 'preset' ? preset : null;
    state.mode = session && (!session.finished || endingPending) ? session.mode : (method === 'manual' ? manualMode : 'stimulation');
    state.running = !!(session && (!session.finished || endingPending)); state.paused = !!(session && (session.paused || endingPending));
    state.timer = session ? session.elapsed : 0;
    if (session) { state.milkL = session.sides.l.volume / ML_PER_OZ; state.milkR = session.sides.r.volume / ML_PER_OZ; }
    state.modal = null;
  }
  let reminderTimer;
  function remind(kind, text, warm = true) {
    clearTimeout(reminderTimer);
    const id = Date.now();
    state.controlNotice = {kind, text, id, startedAt:id, duration:5000, backdrop:warm};
    reminderTimer = setTimeout(() => {
      if (state.controlNotice?.id === id) { state.controlNotice = null; render(); }
    }, 5000);
  }
  function letdownReminder(wasActive) {
    const active = ['l', 'r'].some(k => session.sides[k].active);
    if (active === wasActive) return;
    if (active) remind(method === 'auto' ? 'auto' : 'suggestion', method === 'auto'
      ? 'Let-down detected. Switched to Expression mode.'
      : 'Let-down detected. Try Expression.');
    else remind(method === 'auto' ? 'ending' : 'suggestion', method === 'auto'
      ? 'Let-down has eased. Switched to Mixed mode.'
      : 'Milk flow has slowed. You can finish pumping when you are ready.');
  }
  // Trigger-driven finish uses real, unpaused seconds, not the 10× sensor clock.
  function cancelTriggerEnd() {
    if (triggerEnd?.noticeId === state.controlNotice?.id) {
      clearTimeout(reminderTimer); state.controlNotice = null;
    }
    triggerEnd = null;
  }
  function advanceTriggerEnd(seconds) {
    if (!triggerEnd) return;
    if (session !== triggerEnd.session || !session || session.finished || method !== 'auto' ||
        ['l', 'r'].some(k => session.sides[k].active && !session.sides[k].stopped)) {
      cancelTriggerEnd(); return;
    }
    if (session.paused) return;
    triggerEnd.elapsed += seconds;
    if (triggerEnd.elapsed >= 65) {
      cancelTriggerEnd(); settle('auto', true); return;
    }
    if (triggerEnd.elapsed >= 60) {
      const left = Math.ceil(65 - triggerEnd.elapsed);
      if (left !== triggerEnd.lastSecond) {
        triggerEnd.lastSecond = left;
        state.page = 'control';
        remind('ending', `Pumping will end in ${left} ${left === 1 ? 'second' : 'seconds'}.`);
        triggerEnd.noticeId = state.controlNotice.id;
        render();
      }
    }
  }
  function stat(k, name, label, value, suffix = '') {
    return `<div class="pdcp-stat"><span>${label}</span><strong data-live="${k}-${name}">${value}</strong>${suffix ? `<small>${suffix}</small>` : ''}</div>`;
  }
  function liveMetrics() {
    return `<div class="pdcp-side-metrics">${['l', 'r'].map(k => { const s = nowSide(k); return `<section><h3><i class="pdcp-dot ${k}"></i>${sideLabel(k)}</h3>${stat(k, 'flow', 'Current flow', flow(session && session.paused ? 0 : s.flow), 'oz/min')}${stat(k, 'count', 'Let-downs', s.count)}${stat(k, 'peak', 'Peak flow', flow(s.peak), 'oz/min')}</section>`; }).join('')}</div>`;
  }
  function presetTime() { return clock(session ? session.presetElapsed : 0) + ' / ' + clock(presets[preset].reduce((a,b)=>a+b,0)); }
  function presetCard() {
    return `<section class="pdcp-preset-card"><div class="pdcp-preset-head"><h2>${esc(preset)}</h2><span data-live="preset-time">${presetTime()}</span>${btn('methods','<img src="./assets/pdcp-preset-arrow.svg" alt="">','pdcp-preset-more','aria-label="Change pumping method"')}</div><img class="pdcp-preset-stages" src="./assets/pdcp-preset-stages.svg" alt="Pumping rhythm stages"><div class="pdcp-preset-footer"><span>Auto Switch</span>${btn('select-auto','<i></i>','pdcp-preset-toggle','role="switch" aria-checked="false" aria-label="Auto Switch"')}</div></section>`;
  }
  function planCard() {
    const currentMode = session && (!session.finished || endingPending) ? session.mode : (method === 'manual' ? manualMode : 'stimulation');
    if (method === 'manual') return `<section class="pdcp-plan pdcp-manual-plan"><div class="pdcp-manual-head"><img src="./assets/pdcp-manual-header.svg" alt=""><h2>Manual</h2>${btn('methods','<img src="./assets/figma-r106-arrow.svg" alt="">','pdcp-text-button','aria-label="Change pumping method"')}</div><div class="pdcp-manual-tabs" role="group" aria-label="Manual mode">${['stimulation','expression','mixed'].map(mode=>btn('mode',`<img src="./assets/pdcp-mode-${mode}.svg" alt=""><span>${modeNames[mode]}</span>`,'',`data-value="${mode}" aria-pressed="${currentMode === mode}"`)).join('')}</div></section>`;
    return `<section class="pdcp-plan"><div class="pdcp-plan-head"><h2>${method === 'auto' ? 'Auto Switch' : method === 'preset' ? esc(preset) : 'Manual'}</h2><span class="pdcp-plan-time" data-live="timer">${clock(session ? session.elapsed : 0)}</span>${btn('methods', '<img src="./assets/figma-r106-arrow.svg" alt="">', 'pdcp-text-button', 'aria-label="Change pumping method"')}</div><div class="pdcp-mode-status"><div class="pdcp-mode-window"><div class="pdcp-mode-item" data-mode="${currentMode}"><img src="./assets/pdcp-mode-${currentMode}.svg" alt=""><b data-live="mode">${modeNames[currentMode]}</b></div></div></div></section>`;
  }
  function dataDisclosure() {
    return `<section class="pdcp-data-disclosure ${dataExpanded?'is-expanded':''}" aria-label="Session measurements"><button type="button" class="pdcp-milk-row" data-pdcp="toggle-data" aria-label="${dataExpanded?'Collapse':'Expand'} session details" aria-expanded="${dataExpanded}" aria-controls="pdcp-live-details"><span></span>${['l','r'].map(k=>`<span class="pdcp-milk-value" aria-label="${sideLabel(k)} milk">${state.running?`<strong data-live="${k}-volume">${amount(nowSide(k).volume)}</strong><small>oz</small>`:`<strong>${k.toUpperCase()}</strong>`}</span>`).join('')}<span class="pdcp-data-toggle" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></span></button>${dataExpanded?`<div id="pdcp-live-details" class="pdcp-live-grid">${[['Flow rate','flow','oz/min'],['Let-downs','count','']].map(([label,key,unit])=>`<span class="pdcp-metric-label">${label}</span>${['l','r'].map(k=>`<div class="pdcp-metric-value"><strong data-live="${k}-${key}">${key==='flow'?flow(session?.paused?0:nowSide(k).flow):nowSide(k).count}</strong>${unit?`<small>${unit}</small>`:''}</div>`).join('')}`).join('')}</div>`:''}</section>`;
  }
  function angleGuide() {
    const angles=angleDemo ?? {l:0,r:45}, allAligned=['l','r'].every(k=>Math.abs(angles[k])<=2);
    return `<section class="pdcp-angle-guide" role="status"><div class="pdcp-angle-pair">${['l','r'].map(k=>{
      const value=angles[k],aligned=Math.abs(value)<=2,rad=value*Math.PI/180;
      return `<div class="pdcp-angle-side ${aligned?'is-aligned':''}"><header><b>${k==='l'?'Left':'Right'}</b><span>${Math.round(Math.abs(value))}°</span></header><svg viewBox="0 0 150 175" role="img" aria-label="${k==='l'?'Left':'Right'} pump ${Math.round(Math.abs(value))} degrees. ${aligned?'Aligned':value>0?'Rotate left':'Rotate right'}"><line x1="75" y1="8" x2="75" y2="153" stroke="#9d9298" stroke-width="1.3" stroke-dasharray="4 3"/><g transform="rotate(${value} 75 83)"><svg x="30" y="37" width="90" height="92" viewBox="0 0 100 102" overflow="hidden"><image href="${r2Asset('control-pumps.png')}" x="${k==='r'?-107:0}" y="-2" width="210" height="102"/></svg><line x1="75" y1="17" x2="75" y2="145" stroke="currentColor" stroke-width="2"/></g>${aligned?'<circle cx="75" cy="83" r="9" fill="currentColor"/><path d="m70 83 3 3 6-7" fill="none" stroke="white" stroke-width="1.7"/>':`<path d="M75 55 A28 28 0 0 ${value>0?1:0} ${75+28*Math.sin(rad)} ${83-28*Math.cos(rad)}" fill="none" stroke="currentColor" stroke-width="1.5"/><g transform="${value>0?'':'translate(150 0) scale(-1 1)'}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M140 36 A16 16 0 0 0 114 24"/><path d="m114 18 0 6 6 0"/></g>`}</svg><p>${aligned?'Aligned ✓':value>0?'Rotate left':'Rotate right'}</p></div>`;
    }).join('')}</div></section>`;
  }
  function playAngleDemo() {
    if(!state.leakAdjusting && fit!=='angle') return;
    if(angleAnimation) cancelAnimationFrame(angleAnimation);
    const began=performance.now(), initial={...(angleDemo ?? {l:0,r:45})};
    const frames=[[0,1],[2000,.66],[3800,.33],[5300,-.22],[6700,-.09],[8000,0],[9500,0]];
    function frame(now){
      if((!state.leakAdjusting && fit!=='angle') || session?.finished){angleAnimation=null;return;}
      const elapsed=now-began;
      angleDemo={};
      for(const k of ['l','r']){
        const t=Math.max(0,elapsed-(k==='r'&&initial.l!==0?900:0));
        let i=1;while(i<frames.length-1&&t>frames[i][0])i++;
        const [a,b]=[frames[i-1],frames[i]],u=Math.min(1,(t-a[0])/(b[0]-a[0]));
        angleDemo[k]=initial[k]*(a[1]+(b[1]-a[1])*(u*u*(3-2*u)));
      }
      root.querySelectorAll('.pdcp-angle-guide').forEach(guide=>guide.outerHTML=angleGuide());
      if(elapsed>=10400){angleAnimation=null;if(fit==='angle'){angleDemo=null;fitOk();}else trigger('fit-confirmed');return;}
      angleAnimation=requestAnimationFrame(frame);
    }
    angleAnimation=requestAnimationFrame(frame);
  }
  function metricsSheet() {
    return `<div class="pdcp-sheet-backdrop"><section class="pdcp-sheet pdcp-flow-details" role="dialog" aria-modal="true" aria-label="Session details"><header><h2>Session details</h2>${btn('close-sheet', '×', 'pdcp-icon', 'aria-label="Close details"')}</header>${liveMetrics()}</section></div>`;
  }
  // Reuse original r50 markup, assets and CSS; only the check list changes.
function guide(adjust){return adjust?angleGuide():'';}
function skipButton(){return'<button class="r50-skip" data-pdcp="fit-skip" type="button">Skip</button>';}
function panel(place){var raw=(fit==='angle'||state.leakAdjusting)?1:fit==='battery'?4:fit==='ready'?5:6,list=raw===1?[['Wearing angle','adjust']]:raw===4?[['Wearing angle','done'],['Battery','checking']]:[['Wearing angle','done'],['Battery','done']],adjust=list.some(function(x){return x[1]==='adjust';}),starting=raw>=6;if(starting)return'<section class="r50-fit-panel r50-'+place+' is-starting" data-r50-place="'+place+'" role="status" aria-live="polite">'+skipButton()+'<div class="r50-start-ceremony"><i></i><strong>START</strong><span>Pumping begins now</span></div><div class="r50-progress"><i style="--r50-progress:100%"></i></div></section>';var copy=adjust?'<strong>Check pump alignment</strong>':raw>=5?'<strong>Everything looks good</strong>':'<strong>Fit Check</strong>';return'<section class="r50-fit-panel r50-'+place+'" data-r50-place="'+place+'" role="status" aria-live="polite"><header class="r50-fit-head"><div class="r50-fit-copy">'+copy+'</div>'+skipButton()+'</header><div class="r50-fit-checks">'+list.map(function(x){return'<span class="r50-fit-item is-'+x[1]+'"><i class="r50-check-icon">'+(x[1]==='done'?'✓':'<b></b>')+'</i>'+x[0]+'</span>';}).join('')+'</div>'+guide(adjust)+'<div class="r50-progress"><i style="--r50-progress:'+Math.min(100,Math.max(8,raw*20))+'%"></i></div></section>';}
  function fitPanel() { return panel('control'); }
  function fitOverlay() { return '<div class="pdcp-fit-backdrop"></div><div class="pdcp-fit-overlay" role="dialog" aria-modal="true" aria-label="Pump alignment check">' + fitPanel() + '</div>'; }
  function milkVisualHeight(volume) { return Math.min(88, Math.max(0, volume / CONFIG.demo.bowlCapacityMl * 94)); }
  function originalPump(k) {
    const side = nowSide(k), paused = state.paused, kind = state.flowKind;
    state.paused = paused || side.stopped;
    state.flowKind = state.paused ? 'paused' : side.flow < 1 ? 'low' : side.flow < 8 ? 'medium' : 'high';
    const template = document.createElement('template');
    template.innerHTML = originalHardware(k, side.volume / ML_PER_OZ);
    state.paused = paused; state.flowKind = kind;
    const pump = template.content.firstElementChild;
    pump.dataset.pdcpPump = k;
    const liquid = pump.querySelector('.c32-liquid');
    if (liquid) { const height = milkVisualHeight(side.volume) + 'px'; liquid.style.height = height; liquid.style.setProperty('--liquid-height', height); }
    const amountLabel = pump.querySelector('.amount');
    if (amountLabel) amountLabel.textContent = state.running ? amount(side.volume) + ' oz' : k.toUpperCase();
    pump.classList.toggle('pdcp-idle-pump', !state.running);
    pump.dataset.pdcpFlow = (paused || side.stopped) ? 'paused' : side.flow < 1 ? 'low' : side.flow < 8 ? 'medium' : 'high';
    pump.querySelectorAll('.r60-flow-readout').forEach(el => el.remove());
    if (side.stopped) pump.insertAdjacentHTML('beforeend', '<span class="pdcp-native-stop">' + (side.stopReason === 'full' ? 'Full · stopped' : 'Finished') + '</span>');
    return pump.outerHTML;
  }
  const speedIcons = ['https://www.figma.com/api/mcp/asset/13c19845-5766-4b3d-bf83-b23e82f5092a.svg','https://www.figma.com/api/mcp/asset/331e4bca-4fd3-4383-8037-895ce44527d8.svg','https://www.figma.com/api/mcp/asset/5c5faa2a-f247-4f2e-973c-29f5de76ac72.svg'];
  function speedCard() {
    const labels = ['Slow','Regular','Fast'];
    state.speed = Math.min(3, Math.max(1, Number(state.speed) || 3));
    return `<section class="v4-speed pdcp-speed-three"><h2><img src="https://www.figma.com/api/mcp/asset/2df0d269-2d6f-49be-9709-d9c005c2cc98.svg" alt="">Speed</h2><div class="pdcp-speed-track">${labels.map((label,i)=>`<button data-pdcp="speed" data-value="${i+1}" aria-label="${label}" aria-pressed="${state.speed===i+1}"><img src="${speedIcons[i]}" alt=""></button>`).join('')}</div><div class="pdcp-speed-labels">${labels.map((label,i)=>`<button data-pdcp="speed" data-value="${i+1}" class="${state.speed===i+1?'active':''}">${label}</button>`).join('')}</div></section>`;
  }
  function control() {
    // Render the locked source design, then change only the approved plan slot.
    const template = document.createElement('template');
    template.innerHTML = originalControl();
    const screen = template.content.firstElementChild;
    screen.classList.add('pdcp-legacy-control');
    const warning = screen.querySelector('.r72-leak-warning');
    const recovered = screen.querySelector('.r72-leak-recovered');
    if (warning) { warning.querySelector('b').textContent = 'Check wearing angle'; warning.querySelector('small').textContent = 'Follow the guide to adjust it'; }
    if (recovered) { recovered.querySelector('b').textContent = 'Wearing angle restored'; recovered.querySelector('small').textContent = 'Pumping has resumed'; }
    const controls = screen.querySelector('.v4-controls');
    controls.querySelectorAll('.v4-manual-card,.v4-auto-card,.r49-boost-card,.auto-switch-component').forEach(el => el.remove());
    controls.insertAdjacentHTML('afterbegin', method === 'preset' ? presetCard() : planCard());
    screen.dataset.pdcpMethod = method;
    controls.insertAdjacentHTML('beforebegin', dataDisclosure());
    screen.classList.toggle('pdcp-details-expanded', dataExpanded);
    if(angleDemo && state.leakAdjusting) screen.insertAdjacentHTML('beforeend',fitOverlay());
    const levels = controls.querySelector('.v4-levels');
    levels.classList.add('pdcp-level-card');
    levels.insertAdjacentHTML('afterbegin', '<h2 class="pdcp-level-title"><img src="./assets/pdcp-level-gauge.svg" alt="">Level <span>0~15</span></h2>');
    levels.querySelectorAll('.v4-level').forEach(el => {
      const track = el.querySelector('.v4-track');
      el.querySelector('label').textContent = track.dataset.side.toUpperCase();
      const value = track.dataset.side === 'r' ? state.levelR : state.levelL;
      track.querySelectorAll('.ticks i').forEach((tick,i) => tick.classList.toggle('pdcp-tick-active', i >= 15 - value));
    });
    levels.querySelector('.v4-both label img').src = './assets/pdcp-level-link.svg';
    levels.querySelector('.v4-both-knob img').src = './assets/pdcp-level-knob.svg';
    const speed = controls.querySelector('.v4-speed');
    if (speed) speed.outerHTML = speedCard();
    screen.querySelector('.v4-pump-row').innerHTML = originalPump('l') + originalPump('r');

    screen.querySelectorAll('.v4-switch-note').forEach(el => el.remove());
    screen.classList.toggle('air2-warm-notice', !!state.controlNotice?.backdrop);
    if (notice) controls.insertAdjacentHTML('afterbegin', '<div class="pdcp-notice" role="status">' + esc(notice) + '</div>');
    for (const [old, action, label] of [['start', 'start', 'Start pumping'], ['finish', 'finish', 'Hold to finish pumping'], ['pause', 'pause', state.paused ? 'Resume pumping' : 'Pause pumping']]) {
      const el = screen.querySelector('[data-v4="' + old + '"]');
      if (el) { el.removeAttribute('data-v4'); el.dataset.pdcp = action; el.setAttribute('aria-label', label); }
    }
    const settings = screen.querySelector('.v4-top > button:last-child');
    if (state.leakAdjusting) { const pause = screen.querySelector('[data-pdcp="pause"]'); if (pause) pause.disabled = true; }
    if (settings) { settings.removeAttribute('data-v4'); settings.dataset.pdcp = 'settings'; settings.setAttribute('aria-label','Device settings'); }
    if (fit) {
      screen.querySelector('.v4-start')?.remove();
      screen.insertAdjacentHTML('beforeend',fitOverlay());
    }
    if (sheet === 'metrics') screen.insertAdjacentHTML('beforeend', metricsSheet());
    return screen.outerHTML;
  }
  function programList() {
    const template = document.createElement('template');
    template.innerHTML = originalList();
    const screen = template.content.firstElementChild;
    screen.classList.add('pdcp-native-list');
    screen.querySelector('.v4-list-auto')?.remove();
    const content = screen.querySelector('.r2-list-content');
    const autoRunning = method === 'auto' && session && !session.finished && !session.paused;
    content.insertAdjacentHTML('afterbegin', `<button class="pdcp-auto-exclusive" data-pdcp="select-auto" aria-pressed="${method === 'auto'}"><span class="pdcp-auto-top"><span class="pdcp-auto-name">Auto Switch</span></span><span class="pdcp-auto-description">Modes adapt to your milk flow</span><span class="pdcp-auto-indicator ${autoRunning ? 'is-running' : ''}"><img src="${autoRunning ? './assets/pdcp-running-wave.svg' : r2Asset('list-play.svg')}" alt="${autoRunning ? 'Running' : 'Select Auto Switch'}"></span></button>`);
    const oldManual = [...screen.querySelectorAll('[data-v4="manual"]')];
    const descriptions = {stimulation:'Gentle and comfortable', expression:'Fast-paced and intense', mixed:'Stimulation and Expression loop running'};
    const manualCards = ['stimulation','expression','mixed'].map(mode => {
      const selected = method === 'manual' && mode === manualMode;
      const running = selected && session && !session.finished && !session.paused;
      return `<button class="pdcp-manual-option ${selected ? 'selected' : ''}" data-pdcp="select-manual" data-mode="${mode}" aria-pressed="${selected}"><img class="pdcp-manual-icon" src="./assets/pdcp-manual-${mode}.svg" alt=""><span class="pdcp-manual-copy"><b>${modeNames[mode]}</b><small>${descriptions[mode]}</small></span><span class="pdcp-manual-indicator ${running ? 'is-running' : ''}"><img src="./assets/pdcp-manual-${running ? 'wave' : 'play'}.svg" alt="${running ? 'Running' : 'Select '+modeNames[mode]}"></span></button>`;
    }).join('');
    oldManual[0]?.insertAdjacentHTML('beforebegin', manualCards);
    oldManual.forEach(el => el.remove());
    screen.querySelectorAll('[data-v4="toggle-program"],[data-v4="choose-program"]').forEach(el => { el.dataset.pdcp = el.dataset.v4; el.removeAttribute('data-v4'); });
    return screen.outerHTML + (sheet === 'program-confirm' ? v4Confirm().replace('The timer will reset.', 'Your session data will be kept.').replace('data-v4="confirm"', 'data-pdcp="confirm-program"').replace('data-v4="cancel"', 'data-pdcp="cancel-program"') : '');
  }
  function percentage(k) {
    // Use the same two-decimal oz precision as the visible side amounts.
    const left = Number(amount(report.sides.l.volume));
    const right = Number(amount(report.sides.r.volume));
    if (left + right === 0) return null;
    const leftPercent = Math.round(left / (left + right) * 100);
    return k === 'l' ? leftPercent : 100 - leftPercent;
  }
  function curveSvg(r, width = 336, height = 172) {
    const pad = { l: 34, r: 12, t: 18, b: 26 }, end = Math.max(1, r.elapsed);
    const maxFlow = Math.max(1, ...r.samples.flatMap(p => [p.l, p.r]));
    const maxY = Math.ceil(maxFlow / ML_PER_OZ * 10) / 10 * ML_PER_OZ;
    const x = t => pad.l + t / end * (width - pad.l - pad.r), y = v => height - pad.b - v / maxY * (height - pad.t - pad.b);
    const paths = ['l', 'r'].map(k => `<path d="${r.samples.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(2)},${y(p[k]).toFixed(2)}`).join(' ')}" fill="none" stroke="${k === 'l' ? '#97002d' : '#f2a9bb'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    const grid = [0, .5, 1].map(f => `<line x1="${pad.l}" y1="${y(maxY * f)}" x2="${width - pad.r}" y2="${y(maxY * f)}" stroke="#eae2df" stroke-dasharray="3 4"/><text x="${pad.l - 7}" y="${y(maxY * f) + 3}" text-anchor="end" fill="#96838a" font-size="9">${flow(maxY * f)}</text>`).join('');
    const peaks = ['l','r'].map(k=>(r.sides[k].events||[]).filter(e=>e.peakAt!==null&&e.peak>0).map(e=>`<line x1="${x(e.peakAt)}" y1="${y(e.peak)}" x2="${x(e.peakAt)}" y2="${y(0)}" stroke="${k==='l'?'#97002d':'#f2a9bb'}" opacity=".45" stroke-dasharray="3 3"/><circle cx="${x(e.peakAt)}" cy="${y(e.peak)}" r="3" fill="${k==='l'?'#97002d':'#f2a9bb'}" stroke="white" stroke-width="1"/>`).join('')).join('');
    return `<svg class="pdcp-flow-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="This session's left and right milk flow in oz per minute"><text x="${pad.l}" y="10" fill="#96838a" font-size="9">oz/min</text>${grid}${paths}${peaks}${[0, .5, 1].map(f => `<text x="${x(end * f)}" y="${height - 9}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}" fill="#96838a" font-size="9">${clock(end * f)}</text>`).join('')}</svg>`;
  }
  function settingsPage() {
    const arrow='<img class="pdcp-settings-chevron" src="./assets/settings/chevron.svg" alt="">';
    const modal=sheet?.startsWith('settings-') ? `<div class="pdcp-sheet-backdrop"><section class="pdcp-sheet" role="dialog" aria-modal="true"><header><h2>${{'settings-info':'Air 2','settings-firmware':'Firmware Upgrade','settings-reset':'Restore Factory','settings-delete':'Delete device'}[sheet]}</h2>${btn('close-sheet','×','pdcp-icon','aria-label="Close"')}</header>${sheet==='settings-info'?'<p>Model <strong>Air 2</strong></p>':sheet==='settings-firmware'?'<p>Firmware updates require a connected pump.</p>':`<p>${sheet==='settings-reset'?'Restore the demo’s device settings to their defaults?':'Return to the device list? No physical device will be removed in this demo.'}</p>${btn(sheet==='settings-reset'?'confirm-settings-reset':'confirm-settings-delete',sheet==='settings-reset'?'Restore':'Done','pdcp-primary')}`}</section></div>`:'';
    return `<section class="v4-screen pdcp-settings"><header class="v4-top">${btn('settings-back','<img src="./assets/settings/back.svg" alt="">','v4-circle','aria-label="Back"')}<h1>Settings</h1></header><div class="pdcp-settings-body">${btn('settings-info',`<span class="pdcp-settings-pumps"><img src="${r2Asset('control-pumps.png')}" alt="Air 2 pumps"></span><span class="pdcp-settings-device-copy"><strong>Air 2</strong><span class="pdcp-settings-batteries">${['l','r'].map(k=>`<span>${k.toUpperCase()} <b><img src="./assets/settings/battery.svg" alt=""><i>${k==='l'?(state.batteryL??80):(state.batteryR??75)}</i></b></span>`).join('')}</span></span>${arrow}`,'pdcp-settings-device')}<section><h2>Device Functions</h2><div class="pdcp-settings-function"><div><strong>Pre-Pumping Check</strong>${btn('toggle-precheck','<i></i>','pdcp-settings-switch',`role="switch" aria-label="Pre-Pumping Check" aria-checked="${prePumpingCheck}"`)}</div><p>Automatically check pump alignment and device status before each session.</p></div></section><section><h2>General Settings</h2><div class="pdcp-settings-general">${btn('settings-firmware',`<span>Firmware Upgrade</span><span class="pdcp-settings-new">New<i></i>${arrow}</span>`)}${btn('settings-reset',`<span>Restore Factory</span>${arrow}`)}</div></section>${btn('settings-delete','Delete','pdcp-settings-delete')}</div>${modal}</section>`;
  }
  function bindFlowChart() {
    const wrap=root.querySelector('.pdcp-chart-wrap'); if(!wrap || !report)return;
    const svg=wrap.querySelector('svg'), tip=wrap.querySelector('.pdcp-chart-tooltip'), line=wrap.querySelector('.pdcp-chart-cursor');
    let pointer=null;
    const hide=()=>{pointer=null;tip.hidden=true;line.hidden=true;};
    const show=e=>{
      const box=svg.getBoundingClientRect(), fraction=Math.max(0,Math.min(1,(e.clientX-box.left-box.width*34/336)/(box.width*290/336)));
      const time=fraction*report.elapsed, samples=report.samples;
      if(!samples.length)return;
      let i=1;while(i<samples.length && samples[i].t<time)i++;
      const a=samples[Math.max(0,i-1)],b=samples[Math.min(i,samples.length-1)],u=b.t===a.t?0:Math.max(0,Math.min(1,(time-a.t)/(b.t-a.t)));
      tip.innerHTML=`<b>${clock(time)}</b><span><i class="pdcp-dot l"></i>${flow(a.l+(b.l-a.l)*u)} <small>oz/min</small></span><span><i class="pdcp-dot r"></i>${flow(a.r+(b.r-a.r)*u)} <small>oz/min</small></span>`;
      line.hidden=tip.hidden=false;line.style.left=((34+fraction*290)/336*100)+'%';
      tip.style.left=Math.max(24,Math.min(76,(34+fraction*290)/336*100))+'%';
    };
    svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointer=e.pointerId;svg.setPointerCapture(pointer);show(e);});
    svg.addEventListener('pointermove',e=>{if(pointer===e.pointerId)show(e);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(event=>svg.addEventListener(event,hide));
  }
  function reportCard() {
    const r = report, date = new Date(r.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const full = ['l', 'r'].filter(k => r.sides[k].stopReason === 'full');
    const stages = r.segments.filter(s => s.duration > 0);
    return `<section class="pdcp-screen pdcp-report" role="dialog" aria-modal="true" aria-label="Pumping report"><header class="pdcp-header v4-top">${btn('close-report', '<img src="./assets/pdcp-report-close-glyph.svg" alt="">', 'pdcp-icon v4-circle', 'aria-label="Close report"')}<span class="pdcp-report-date">${esc(date)}</span>${btn('share', '↗', 'pdcp-icon', 'aria-label="Export report image"')}</header><div class="pdcp-scroll pdcp-report-body">${full.length ? `<div class="pdcp-notice">${full.length === 2 ? 'Both bowls are full.' : sideLabel(full[0]) + ' bowl is full.'} The session has ended and been recorded. Empty the bowls before starting again.</div>` : r.endReason === 'battery' ? '<div class="pdcp-notice">Battery is too low. The session has ended and been recorded. Please charge both pumps.</div>' : ''}${!r.valid ? '<div class="pdcp-notice">No milk was recorded and pumping lasted 5 minutes or less. This is not counted as a pumping record.</div>' : ''}<section class="pdcp-report-section"><div class="pdcp-section-heading"><h2>Pumping pattern</h2><div class="pdcp-legend"><span><i class="pdcp-dot l"></i>L</span><span><i class="pdcp-dot r"></i>R</span></div></div><div class="pdcp-chart-wrap">${curveSvg(r)}<div class="pdcp-chart-cursor" hidden></div><div class="pdcp-chart-tooltip" role="status" hidden></div></div></section><section class="pdcp-total-card"><div class="pdcp-total-top"><span>Total milk</span>${btn('edit','<img src="./assets/figma-review-r2/lactation-edit.svg" alt="">','pdcp-report-edit','aria-label="Edit session"')}</div><div class="pdcp-total">${amount(r.total)}<small>${unit}</small></div><div class="pdcp-report-duration"><span>Session duration</span><strong>${clock(r.reportedDuration ?? r.elapsed)}</strong></div><div class="pdcp-split-bar"><i style="width:${percentage('l') ?? 50}%"></i></div><div class="pdcp-volume-sides">${['l', 'r'].map(k => `<div><span><i class="pdcp-dot ${k}"></i>${sideLabel(k)} <small>${percentage(k) !== null ? percentage(k) + '%' : '—'}</small></span><strong>${amount(r.sides[k].volume)} <small>${unit}</small></strong></div>`).join('')}</div>${r.edited ? '<span class="pdcp-edited">Edited</span>' : ''}</section><section class="pdcp-report-section"><div class="pdcp-section-heading"><h2>Let-downs</h2></div><div class="pdcp-summary-grid"><span></span><b>Left</b><b>Right</b>${[['Let-downs',k=>r.sides[k].count],['Average flow',k=>flow((r.originalVolumes?.[k]??r.sides[k].volume)/Math.max(1,r.sides[k].seconds)*60)],['Peak flow',k=>flow(r.sides[k].peak)]].map(([label,value])=>`<span>${label}${label!=='Let-downs'?'<small>oz/min</small>':''}</span>${['l','r'].map(k=>`<strong>${value(k)}</strong>`).join('')}`).join('')}</div></section><section class="pdcp-report-section"><div class="pdcp-section-heading"><h2>Session stages</h2></div><div class="pdcp-timeline">${stages.map(s => `<i class="${s.mode}" style="flex:${s.duration}" title="${modeNames[s.mode]} ${clock(s.duration)}"></i>`).join('')}</div><div class="pdcp-stage-head"><span>Mode / method</span><span>Duration</span><span>Milk · ${unit}</span></div>${stages.length ? stages.map(s => `<div class="pdcp-stage-row"><div><b><i class="pdcp-stage-dot ${s.mode}"></i>${modeNames[s.mode]}</b><small>${methodNames[s.method]}${s.method === 'preset' ? ' · ' + esc(s.preset) : ''} · ${clock(s.start)}</small></div><strong>${clock(s.duration)}</strong><strong>${amount(s.l + s.r)}</strong></div>`).join('') : '<p class="pdcp-caption">No pumping time recorded.</p>'}${r.edited ? '<p class="pdcp-caption">Stage milk and the flow curve reflect original sensor data. Corrected milk amounts and duration are shown above.</p>' : ''}</section><div class="pdcp-report-bottom">${btn('share', exportBusy ? 'Preparing image…' : 'Save report image', 'pdcp-secondary', exportBusy ? 'disabled' : '')}${btn('close-report', 'Done', 'pdcp-primary')}</div></div>${sheet === 'edit' ? editSheet() : ''}<div class="pdcp-toast" role="status" aria-live="polite"></div></section>`;
  }
  function editSheet() {
    return `<div class="pdcp-sheet-backdrop"><section class="pdcp-sheet" role="dialog" aria-modal="true" aria-label="Edit session"><header><h2>Edit session</h2>${btn('close-sheet', '×', 'pdcp-icon', 'aria-label="Cancel editing"')}</header><form id="pdcp-edit-form"><div class="pdcp-edit-fields">${['l', 'r'].map(k => `<label>${sideLabel(k)}<span class="pdcp-milk-input-wrap"><input class="pdcp-milk-editor" name="${k}" type="number" inputmode="decimal" min="0" max="${amount(CONFIG.demo.bowlCapacityMl)}" step="any" value="${amount(report.sides[k].volume)}" required><small>${unit}</small></span></label>`).join('')}</div><div class="pdcp-edit-duration"><span>Session duration</span><div class="pdcp-duration-wheels">${[['minutes',999,Math.floor((report.reportedDuration ?? report.elapsed)/60),'min'],['seconds',59,Math.floor((report.reportedDuration ?? report.elapsed)%60),'sec']].map(([name,max,value,label])=>`<div class="pdcp-wheel-column"><input type="hidden" name="${name}" value="${value}"><div class="pdcp-time-wheel" data-wheel="${name}" role="spinbutton" tabindex="0" aria-label="${name==='minutes'?'Minutes':'Seconds'}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">${Array.from({length:max+1},(_,i)=>`<div class="pdcp-wheel-option" data-wheel-value="${i}">${String(i).padStart(2,'0')}</div>`).join('')}</div><span class="pdcp-wheel-unit">${label}</span></div>`).join('')}</div></div><p class="pdcp-form-error" role="alert"></p><button class="pdcp-primary" type="submit">Apply changes</button>${btn('close-sheet', 'Cancel', 'pdcp-text-button')}</form></section></div>`;
  }
  let lastModeWindow = null;
  function bindMilkEditors() {
    const form=root.querySelector('#pdcp-edit-form');
    form?.querySelectorAll('.pdcp-milk-editor').forEach(input=>{
      const max=Number(input.max);let drag=null,suppressClick=false;
      const paint=()=>input.style.setProperty('--milk-fill',Math.max(0,Math.min(100,Number(input.value)/max*100))+'%');
      paint();input.addEventListener('input',paint);
      input.addEventListener('change',()=>{if(input.value!==''&&Number.isFinite(Number(input.value)))input.value=Math.max(0,Math.min(max,Number(input.value))).toFixed(2);paint();});
      input.addEventListener('pointerdown',e=>{if(e.button!==0||document.activeElement===input)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,value:Number(input.value)||0,width:input.getBoundingClientRect().width,moved:false};input.setPointerCapture(e.pointerId);});
      input.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(!drag.moved&&Math.abs(dx)<6)return;drag.moved=true;input.value=Math.max(0,Math.min(max,drag.value+dx/drag.width*max)).toFixed(2);paint();});
      input.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;suppressClick=moved;if(moved)input.blur();else{input.focus();input.select();}});
      input.addEventListener('pointercancel',()=>{drag=null;});
      input.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false;input.blur();}});
    });
  }
  function bindDurationWheels() {
    root.querySelectorAll('[data-wheel]').forEach(wheel=>{
      const input=wheel.closest('form').elements[wheel.dataset.wheel], row=36;
      wheel.scrollTop=Number(input.value)*row;
      const update=()=>{const value=Math.max(0,Math.min(Number(wheel.getAttribute('aria-valuemax')),Math.round(wheel.scrollTop/row)));input.value=value;const form=wheel.closest('form');form.querySelector('[type=submit]').disabled=Number(form.elements.minutes.value)*60+Number(form.elements.seconds.value)<1;wheel.setAttribute('aria-valuenow',value);wheel.querySelectorAll('.pdcp-wheel-option').forEach((el,i)=>el.classList.toggle('selected',i===value));};
      update();wheel.addEventListener('scroll',update,{passive:true});
      wheel.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const max=Number(wheel.getAttribute('aria-valuemax')),current=Number(input.value);const next=e.key==='Home'?0:e.key==='End'?max:Math.max(0,Math.min(max,current+(e.key==='ArrowDown'?1:-1)));wheel.scrollTo({top:next*row,behavior:'smooth'});});
      wheel.addEventListener('click',e=>{const option=e.target.closest('[data-wheel-value]');if(option)wheel.scrollTo({top:Number(option.dataset.wheelValue)*row,behavior:'smooth'});});
    });
  }
  function render(force = true) {
    syncLegacy();
    if (!force && state.page === 'control' && !sheet && !fit && !report) { patchLive(); return; }
    const editForm = root.querySelector('#pdcp-edit-form');
    const editDraft = sheet === 'edit' && editForm ? Object.fromEntries(new FormData(editForm)) : null;
    const previousMode = root.querySelector('.pdcp-mode-window') || lastModeWindow;
    const previousScroll = root.querySelector('.pdcp-scroll,.v4-controls')?.scrollTop || 0;
    const oldPage = root.firstElementChild?.className || '';
    root.innerHTML = report ? `<div class="pdcp-report-overlay"><div class="pdcp-report-underlay" inert aria-hidden="true">${v4Home()}</div><div class="pdcp-report-dim"></div>${reportCard()}</div>` : state.page === 'device' ? v4Device() : state.page === 'home' ? v4Home() : state.page === 'list' ? programList() : state.page === 'settings' ? settingsPage() : control();
    if (report) bindFlowChart();
    if (report && sheet === 'edit') {
      if(editDraft) for(const [name,value] of Object.entries(editDraft)) { const input=root.querySelector(`#pdcp-edit-form [name="${name}"]`); if(input)input.value=value; }
      bindDurationWheels(); bindMilkEditors();
    }
    if (report && oldPage.includes('pdcp-report-overlay')) root.querySelector('.pdcp-report').style.animation = 'none';
    const nextMode = root.querySelector('.pdcp-mode-window');
    if (previousMode && nextMode) {
      const outgoing = previousMode.querySelector('.pdcp-mode-item:not(.is-leaving)');
      const incoming = nextMode.querySelector('.pdcp-mode-item');
      if (outgoing?.dataset.mode === incoming.dataset.mode) nextMode.replaceWith(previousMode);
      else if (outgoing && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const ghost = outgoing.cloneNode(true);
        ghost.classList.remove('is-entering'); ghost.classList.add('is-leaving');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.querySelector('[data-live]')?.removeAttribute('data-live');
        nextMode.appendChild(ghost); incoming.classList.add('is-entering');
        ghost.addEventListener('animationend', () => ghost.remove(), {once:true});
        incoming.addEventListener('animationend', () => incoming.classList.remove('is-entering'), {once:true});
      }
    }
    syncDeepVisual();
    if (nextMode) lastModeWindow = root.querySelector('.pdcp-mode-window');
    if (oldPage === (root.firstElementChild?.className || '')) { const scroll = root.querySelector('.pdcp-scroll,.v4-controls'); if (scroll) scroll.scrollTop = previousScroll; }
    if (fit && state.page === 'home') { const dock = root.querySelector('.v4-home-dock'); if (dock) dock.outerHTML = fitOverlay(); }
    if (state.page === 'home') {
      const dock = root.querySelector('.v4-dock-mode,.h7-dock-mode');
      const toggle = dock?.querySelector('button');
      if (toggle) {
        const active = !!session && !session.finished;
        const pumping = active && !session.paused && !endingPending;
        toggle.removeAttribute('data-quick-start'); toggle.removeAttribute('data-v4'); toggle.removeAttribute('data-action');
        toggle.dataset.pdcp = active ? 'pause' : 'start';
        toggle.setAttribute('aria-label', pumping ? 'Pause pumping' : active ? 'Resume pumping' : 'Start pumping');
        toggle.disabled = !!state.leakAdjusting || endingPending;
        toggle.innerHTML = '<img src="' + (pumping ? r2Asset('pause.svg') : h7Asset('dock-play.svg')) + '" alt="">';
      }
      if (dock) { const copy = dock.querySelector('span'); if (copy) copy.innerHTML = '<b>' + methodNames[method] + '</b>' + (session && !session.finished ? '<em>' + clock(session.elapsed) + '</em>' : ''); }
    }
    signature = session ? [session.mode, session.paused, session.sides.l.stopped, session.sides.r.stopped, state.controlNotice?.id || ''].join('|') : '';
  }
  let deepVisual = {session:null, active:false, start:0, exit:0, frame:null};
  function syncDeepVisual() {
    const now = performance.now();
    const active = !!session?.deep && !session.paused && !session.finished;
    if (deepVisual.session !== session) {
      if (deepVisual.frame) cancelAnimationFrame(deepVisual.frame);
      deepVisual = {session, active:false, start:now, exit:0, frame:null};
    }
    if (active !== deepVisual.active) {
      if (active && !deepVisual.exit) deepVisual.start = now;
      deepVisual.exit = active ? 0 : now;
      deepVisual.active = active;
    }
    const draw = () => {
      deepVisual.frame = null;
      const t = performance.now();
      const progress = deepVisual.exit ? Math.min(1,(t-deepVisual.exit)/3200) : 0;
      const strength = deepVisual.active ? 1 : deepVisual.exit ? 1-progress*progress*(3-2*progress) : 0;
      const phase = (1-Math.cos((t-deepVisual.start)/4800*Math.PI*2))/2;
      const card = root.querySelector('.pdcp-plan');
      const mode = card?.querySelector('.pdcp-mode-window');
      mode?.classList.toggle('pdcp-deep', strength > 0);
      if (card) {
        card.style.setProperty('--pdcp-breath-phase',String(phase));
        card.style.setProperty('--pdcp-deep-strength',String(strength));
      }
      if (deepVisual.active || progress < 1 && deepVisual.exit) deepVisual.frame = requestAnimationFrame(draw);
      else deepVisual.exit = 0;
    };
    if (deepVisual.frame) cancelAnimationFrame(deepVisual.frame);
    draw();
  }
  function patchLive() {
    syncDeepVisual();
    const values = { 'preset-time': presetTime(), timer: clock(session ? session.elapsed : 0), mode: modeNames[session && (!session.finished || endingPending) ? session.mode : (method === 'manual' ? manualMode : 'stimulation')] };
    ['l', 'r'].forEach(k => { const s = nowSide(k); Object.assign(values, { [k + '-volume']: amount(s.volume), [k + '-flow']: flow(session && session.paused ? 0 : s.flow), [k + '-count']: s.count, [k + '-peak']: flow(s.peak) }); const fill = root.querySelector(`[data-fill="${k}"]`); if (fill) fill.style.height = Math.min(80, s.volume / CONFIG.demo.bowlCapacityMl * 80) + '%'; });
    root.querySelectorAll('[data-pdcp-pump]').forEach(el => { const k = el.dataset.pdcpPump; const side = nowSide(k); const kind = session?.paused || side.stopped ? 'paused' : side.flow < 1 ? 'low' : side.flow < 8 ? 'medium' : 'high'; if (el.dataset.pdcpFlow !== kind) { el.outerHTML = originalPump(k); return; } const label = el.querySelector('.amount'); if (label) label.textContent = amount(side.volume) + ' oz'; const liquid = el.querySelector('.c32-liquid'); if (liquid) { const height = milkVisualHeight(side.volume); liquid.style.height = height + 'px'; liquid.style.setProperty('--liquid-height', height + 'px'); } });
    root.querySelectorAll('[data-live]').forEach(el => { const next = String(values[el.dataset.live] ?? ''); if (el.textContent !== next) el.textContent = next; });
  }
  function startFit() {
    if (session && !session.finished) { state.page = 'control'; render(); return; }
    clearTimeout(reminderTimer); state.controlNotice = null; state.leakAdjusting = false; state.leakSide = null;
    report = null; session = null; sheet = null; fit = 'angle'; notice = ''; render();
    clearTimeout(fitTimer);
    if (!prePumpingCheck) { beginPumping(); return; }
    angleDemo={l:0,r:45}; render(); playAngleDemo();
  }
  function beginPumping() {
    if (!fit) return;
    if (Math.min(state.batteryL ?? 80, state.batteryR ?? 75) <= 3) { fit = null; state.page = 'control'; notice = ''; remind('low-battery', 'Battery too low to start. Please charge.'); render(); return; }
    cancelTriggerEnd(); fit = null; finishReminderShown = false; session = new Session({ method, mode: manualMode, preset }); report = null; notice = '';
    overrides.l = overrides.r = null; simulationRemainder = 0; timerAt = performance.now(); render();
  }
  function fitOk() {
    if (fit !== 'angle') return;
    fit = 'battery'; render(); clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
      if (fit !== 'battery') return;
      fit = 'ready'; render();
      fitTimer = setTimeout(() => {
        if (fit !== 'ready') return;
        fit = 'starting'; render();
        fitTimer = setTimeout(beginPumping, 1100);
      }, 700);
    }, 1200);
  }
  function settle(reason = 'manual', afterNotice = false) {
    if (!session || report) return;
    cancelTriggerEnd();
    if(!afterNotice && reason !== 'manual'){
      if(endingPending)return; endingPending=true;
      if(!session.finished)session.finish(reason);
      state.leakAdjusting=false;angleDemo=null;state.page='control';
      remind(reason==='full'?'complete':'ending',reason==='full'?'Both bowls are full. Pumping has finished.':'Pumping has finished. Your session is complete.');
      render();setTimeout(()=>settle(reason,true),5000);return;
    }
    endingPending=false;
    if (!session.finished) session.finish(reason);
    report = session.snapshot(); sheet = null; state.hasLogged = true;
    updateHomeRecord();
    clearTimeout(reminderTimer); state.controlNotice = null; state.leakAdjusting = false; state.leakSide = null;
    notice = ''; render();
  }
  function updateHomeRecord() {
    state.lastSessionL = report.sides.l.volume / ML_PER_OZ; state.lastSessionR = report.sides.r.volume / ML_PER_OZ;
    state.lastSessionTotal = report.total / ML_PER_OZ;
    if (!Array.isArray(state.air2SessionHistory)) state.air2SessionHistory = [];
    const index = state.air2SessionHistory.findIndex(x => x.id === report.id);
    const record = { id: report.id, left: state.lastSessionL, right: state.lastSessionR, total: state.lastSessionTotal, duration: report.reportedDuration ?? report.elapsed };
    if (report.valid) { if (index >= 0) state.air2SessionHistory[index] = record; else state.air2SessionHistory.push(record); }
    else if (index >= 0) state.air2SessionHistory.splice(index, 1);
    state.hasLogged = state.air2SessionHistory.length > 0;
  }
  // Illustrative, independent sensor traces. These are not learned patterns or
  // threshold-based firmware decisions. Events can still be forced via Triggers.
  function mockSensor(k, t) {
    const sample = window.Air2PDCP.demoSensor(k, t);
    if (typeof overrides[k] === 'number') return {active:overrides[k]>0,flow:overrides[k]};
    if (overrides[k] !== null) return {active:overrides[k], flow:overrides[k] ? Math.max(4,sample.flow) : 0};
    return sample;
  }
  let finishReminderShown = false;
  function step(seconds) {
    if (!session || session.finished || session.paused) return;
    // Small steps preserve peaks, mode boundaries and side-stop accounting.
    const wasActive = ['l', 'r'].some(k => session.sides[k].active);
    const previousStops = ['l', 'r'].filter(k => session.sides[k].stopped).length;
    let remaining = seconds;
    while (remaining > 0 && !session.finished) {
      const dt = Math.min(1, remaining), flows = {};
      for (const k of ['l', 'r']) { const v = mockSensor(k, session.elapsed); session.letdown(k, v.active); flows[k] = v.flow; }
      if (session.method === 'preset') {
        const durations = presets[session.preset]; const cycle = durations.reduce((a, b) => a + b, 0);
        let p = session.presetElapsed % cycle, index = 0; while (index < durations.length - 1 && p >= durations[index]) { p -= durations[index++]; }
        session.mode = ['stimulation', 'expression', 'mixed', 'expression'][index];
      }
      session.advance(dt, flows); remaining -= dt;
    }
    if (session.finished) { settle('full'); return; }
    letdownReminder(wasActive);
    if (!session.readyToFinish) finishReminderShown = false;
    else if (!triggerEnd && !finishReminderShown) { finishReminderShown = true; if (method === 'auto') { triggerEnd = { session, elapsed: 60, lastSecond: 5, noticeId: null }; remind('ending', 'Pumping will end in 5 seconds.'); triggerEnd.noticeId = state.controlNotice.id; } else remind('suggestion', 'Milk flow has eased. You can finish now.'); }
    const stopped = ['l', 'r'].filter(k => session.sides[k].stopped);
    if (stopped.length === 1 && previousStops === 0) remind('complete', sideLabel(stopped[0]) + ' bowl full. This side has stopped.');
    syncLegacy(); const next = [session.mode, session.paused, session.sides.l.stopped, session.sides.r.stopped, state.controlNotice?.id || ''].join('|');
    if (!sheet && state.page === 'control') render(next !== signature);
    if(state.page==='home'){root.querySelectorAll('.v4-dock-mode em,.h7-dock-mode em').forEach(el=>el.textContent=clock(session.elapsed));}
  }
  const HOLD_DURATION_MS = 2000;
  function cancelHold() {
    if (!holding) return;
    cancelAnimationFrame(holding.frame);
    holding = null;
    const button=root.querySelector('[data-pdcp="finish"]');
    button?.classList.remove('holding');button?.style.removeProperty('--hold-progress');
  }
  window.addEventListener('pointerdown', e => {
    if (endingPending || !e.target.closest('[data-pdcp="finish"]')) return;
    e.preventDefault(); e.stopImmediatePropagation(); cancelHold();
    const button=e.target.closest('button');button.classList.add('holding');button.style.setProperty('--hold-progress','0');button.setPointerCapture?.(e.pointerId);
    const hold={start:performance.now(),frame:0};holding=hold;
    function frame(now){
      if(holding!==hold)return;
      const progress=Math.min(1,(now-hold.start)/HOLD_DURATION_MS);
      const current=root.querySelector('[data-pdcp="finish"]');
      if(!current){cancelHold();return;}
      current.classList.add('holding');current.style.setProperty('--hold-progress',String(progress));
      if(progress<1){hold.frame=requestAnimationFrame(frame);return;}
      // Commit completion only after the fully filled bar has had a paint frame.
      holding=null;
      requestAnimationFrame(()=>requestAnimationFrame(()=>settle()));
    }
    hold.frame=requestAnimationFrame(frame);
  }, true);
  ['pointerup', 'pointercancel', 'blur'].forEach(name => window.addEventListener(name, cancelHold, true));
  window.addEventListener('keydown', e => { if (e.target.closest('[data-pdcp="finish"]') && ['Enter', ' '].includes(e.key)) { e.preventDefault(); if (!e.repeat) settle(); } if (e.key === 'Escape' && sheet) { sheet = null; render(); } }, true);
  window.addEventListener('input', e => {
    const k = e.target.dataset.level; if (!k) return;
    const value = Number(e.target.value); const target = k === 'l' ? 'levelL' : 'levelR'; state[target] = value;
    if (state.both) { if (!nowSide('l').stopped) state.levelL = value; if (!nowSide('r').stopped) state.levelR = value; }
    root.querySelectorAll('[data-level]').forEach(el => { el.value = state[el.dataset.level === 'l' ? 'levelL' : 'levelR']; });
    root.querySelectorAll('[data-level-value]').forEach(el => { el.textContent = state[el.dataset.levelValue === 'l' ? 'levelL' : 'levelR']; });
    // Level adjustment intentionally does not change pumping method.
  }, true);
  window.addEventListener('submit', e => {
    if (e.target.id !== 'pdcp-edit-form') return; e.preventDefault(); e.stopImmediatePropagation();
    const form = e.target, l = form.elements.l.value, r = form.elements.r.value;
    const minutes = Number(form.elements.minutes.value), seconds = Number(form.elements.seconds.value);
    const duration = minutes * 60 + seconds;
    if (!form.elements.minutes.value.trim() || !form.elements.seconds.value.trim() || !Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || minutes > 999 || seconds < 0 || seconds > 59 || duration < 1) { return; }
    const factor = ML_PER_OZ;
    const toMl = value => { const max = Number(amount(CONFIG.demo.bowlCapacityMl)); return Number(value) <= max ? Math.min(CONFIG.demo.bowlCapacityMl, Number(value) * factor) : NaN; };
    const left = l === amount(report.sides.l.volume) ? report.sides.l.volume : toMl(l);
    const right = r === amount(report.sides.r.volume) ? report.sides.r.volume : toMl(r);
    if (l.trim() === '' || r.trim() === '' || !session.editVolumes(left, right)) { form.querySelector('.pdcp-form-error').textContent = `Enter an amount from 0 to ${amount(CONFIG.demo.bowlCapacityMl)} ${unit} for each side.`; return; }
    session.editDuration(duration);
    report = session.snapshot(); updateHomeRecord();
    sheet = null; render();
  }, true);
  window.addEventListener('click', e => {
    const el = e.target.closest('[data-pdcp]');
    // Consume known Home/Device navigation before legacy capture handlers.
    const legacy = !el && e.target.closest('#demo [data-v4],#demo [data-action],#demo [data-quick-start]');
    const legacyAction = legacy && (legacy.dataset.v4 || legacy.dataset.action || legacy.dataset.quickStart);
    if (!el && !['home', 'device', 'control', 'start', 'pause', 'list', 'speed'].includes(legacyAction)) return;
    e.preventDefault(); e.stopImmediatePropagation(); const a = el ? el.dataset.pdcp : legacyAction; const value = el && el.dataset.value;
    if(endingPending && ['start','pause','finish','finish-confirm','methods','mode'].includes(a)) return;
    if (a === 'start') { startFit(); return; }
    if (a === 'fit-skip') {
      clearTimeout(fitTimer); if(angleAnimation) cancelAnimationFrame(angleAnimation); angleAnimation=null;
      if(state.leakAdjusting) { angleDemo=null; trigger('fit-confirmed'); }
      else { angleDemo=null; beginPumping(); } return;
    }
    if (a === 'settings') { settingsReturn=state.page; state.page='settings'; }
    if (a === 'settings-back') { state.page=settingsReturn; sheet=null; }
    if (a === 'toggle-precheck') { prePumpingCheck=!prePumpingCheck; localStorage.setItem('air2-pre-pumping-check',String(prePumpingCheck)); }
    if (a === 'settings-info' || a === 'settings-firmware' || a === 'settings-reset' || a === 'settings-delete') sheet=a;
    if (a === 'confirm-settings-reset') { prePumpingCheck=true;localStorage.setItem('air2-pre-pumping-check','true');state.levelL=state.levelR=5;state.speed=2;sheet=null; }
    if (a === 'confirm-settings-delete') { sheet=null;state.page='device'; }
    if (a === 'fit-ok') { fitOk(); return; }
    if (a === 'cancel-fit') { clearTimeout(fitTimer); fit = null; }
    if (a === 'home' || a === 'device' || a === 'control') { state.page = a; fit = null; clearTimeout(fitTimer); sheet = null; }
    if (a === 'methods' || a === 'list') { state.page = 'list'; state.listExpanded = null; sheet = null; }
    if (a === 'select-auto' || a === 'select-manual') {
      method = a === 'select-auto' ? 'auto' : 'manual';
      if (method === 'manual') manualMode = el.dataset.mode;
      if (session && !session.finished) session.setMethod(method, manualMode, preset);
      state.page = 'control'; sheet = null;
    }
    if (a === 'toggle-program') state.listExpanded = state.listExpanded === 'Milk Boost' ? null : 'Milk Boost';
    if (a === 'choose-program') sheet = 'program-confirm';
    if (a === 'cancel-program') sheet = null;
    if (a === 'confirm-program') {
      preset = 'Milk Boost'; method = 'preset';
      if (session && !session.finished) session.setMethod('preset', 'stimulation', preset);
      state.page = 'control'; sheet = null;
    }
    if (a === 'method') { method = value; if (method === 'auto') manualMode = 'stimulation'; if (session && !session.finished) session.setMethod(method, manualMode, preset); }
    if (a === 'mode') { method = 'manual'; manualMode = value; if (session && !session.finished) session.setMethod('manual', value); }
    if (a === 'preset') { preset = value; method = 'preset'; if (session && !session.finished) session.setMethod('preset', 'stimulation', preset); }
    if (a === 'toggle-data') {dataExpanded=!dataExpanded;}
    if (a === 'metrics') sheet = 'metrics';
    if (a === 'close-sheet') sheet = null;
    if (a === 'pause' && session && !session.finished && !state.leakAdjusting) { session.paused = !session.paused; timerAt = performance.now(); }
    if (a === 'speed') state.speed = Math.min(3, Math.max(1, Number(value || legacy?.dataset.speed) || 3));
    if (a === 'both') state.both = !state.both;
    if (a === 'finish') return;
    if (a === 'finish-confirm') { settle(); return; }
    if (a === 'edit') sheet = 'edit';
    if (a === 'close-report') { report = null; sheet = null; state.page = 'home'; method = 'auto'; manualMode = 'stimulation'; session = null; state.milkL = 0; state.milkR = 0; }
    if (a === 'share') { exportReport(); return; }
    if (a === 'toggle-triggers' && performance.now() < suppressTriggerClickUntil) return;
    if (a === 'toggle-triggers') { triggersOpen = !triggersOpen; mountTriggers(); return; }
    if (a === 'trigger') { trigger(value); triggersOpen = false; mountTriggers(); return; }
    render();
  }, true);
  function trigger(id) {
    if (id === 'fit-ok' && (state.leakAdjusting || fit==='angle')) {
      if(angleAnimation)cancelAnimationFrame(angleAnimation);angleAnimation=null;
      angleDemo={l:0,r:0};render();clearTimeout(fitTimer);
      fitTimer=setTimeout(()=>{if(fit==='angle'){angleDemo=null;fitOk();}else if(state.leakAdjusting)trigger('fit-confirmed');},1500);return;
    }
    if (id === 'fit-confirmed' && angleDemo && !['l','r'].every(k=>Math.abs(angleDemo[k])<=2)) return;
    if (id === 'fit-confirmed' || id === 'fit-ok') {
      if (state.leakAdjusting && session && !session.finished) {
        angleDemo=null; if(angleAnimation)cancelAnimationFrame(angleAnimation); angleAnimation=null;
        state.leakAdjusting = false; state.leakSide = null; session.paused = false;
        timerAt = performance.now(); simulationRemainder = 0;
        state.controlNotice = {kind:'leak', phase:'recovered', id:Date.now()};
        clearTimeout(reminderTimer);
        const recovered = state.controlNotice;
        reminderTimer = setTimeout(() => {
          if (state.controlNotice !== recovered) return;
          recovered.phase = 'closing-recovered'; render();
          reminderTimer = setTimeout(() => { if (state.controlNotice === recovered) { state.controlNotice = null; render(); } }, 340);
        }, 5000);
        render();
      } else fitOk();
      return;
    }
    if (!session || session.finished) { notice = ''; if (!report) render(); return; }
    if (['angle-error','angle-left','angle-both'].includes(id)) {
      clearTimeout(reminderTimer); state.leakAdjusting = true; state.leakSide = 'r';
      session.paused = true; simulationRemainder = 0; angleDemo=id==='angle-both'?{l:-45,r:50}:id==='angle-left'?{l:-45,r:0}:{l:0,r:45}; state.leakSide=id==='angle-both'?'both':id==='angle-left'?'l':'r'; state.page='control';
      state.controlNotice = {kind:'leak', phase:'warning', id:Date.now()};
      render(); playAngleDemo(); return;
    }
    if(id==='angle-demo'){playAngleDemo();return;}
    if (state.leakAdjusting && id !== 'critical-battery') return;
    if (id === 'letdown-start' || id === 'letdown-end') {
      cancelTriggerEnd();
      const wasActive = ['l', 'r'].some(k => session.sides[k].active);
      for (const k of ['l', 'r']) { overrides[k] = id === 'letdown-start'; session.letdown(k, overrides[k]); }
      letdownReminder(wasActive);
      if (id === 'letdown-end') {
        state.page = 'control';
        if (method === 'auto') {
          triggerEnd = { session, elapsed: 0, lastSecond: null, noticeId: null };
          finishReminderShown = true;
        } else remind('suggestion', 'Let-down has ended. You can finish pumping now.');
      }
    }
    if(id==='deep-peak'||id==='deep-half') { cancelTriggerEnd(); for(const k of ['l','r']) {overrides[k]=id==='deep-peak'?30:15;session.letdown(k,true);} step(1); }
    if(id==='full-left'||id==='full-right') {const k=id==='full-left'?'l':'r'; session.sides[k].volume=session.capacity;session.stopSide(k,'full');if(session.finished){settle('full');return;} remind('complete',sideLabel(k)+' bowl is full. This side has stopped; the other side continues.');}
    if (id === 'low-battery') { state.batteryL = 12; state.batteryR = 10; remind('low-battery', 'Low battery. Charge after this session.'); }
    if (id === 'critical-battery') {
      state.batteryL = 3; state.batteryR = 2; session.paused = true;
      const endingSession = session;
      remind('critical-battery', 'Battery is too low. Pumping has stopped. Your session will be recorded in 5 seconds.');
      render();
      setTimeout(() => { if (session === endingSession && !report) settle('battery'); }, 5000);
      return;
    }
    render();
  }
  function placeTriggers(host, x, y) {
    const button = host.querySelector('.pdcp-trigger-toggle');
    const w = button.offsetWidth, h = button.offsetHeight;
    host.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px';
    host.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + 'px';
    host.style.right = 'auto'; host.style.bottom = 'auto';
    const panel = host.querySelector('.pdcp-trigger-panel');
    if (panel) {
      const r = button.getBoundingClientRect();
      panel.style.left = Math.max(8-r.left, Math.min(0, innerWidth-r.left-panel.offsetWidth-8)) + 'px';
      panel.style.bottom = r.top > innerHeight/2 ? (h+10)+'px' : 'auto';
      panel.style.top = r.top > innerHeight/2 ? 'auto' : (h+10)+'px';
      panel.style.maxHeight = Math.max(80,(r.top > innerHeight/2 ? r.top : innerHeight-r.bottom)-18)+'px';
    }
  }
  window.addEventListener('pointerdown', e => {
    const button = e.target.closest('.pdcp-trigger-toggle');
    if (!button || e.button !== 0) return;
    const host = button.parentElement, r = button.getBoundingClientRect();
    triggerDrag = { host, id:e.pointerId, x:e.clientX, y:e.clientY, left:r.left, top:r.top, moved:false };
    button.setPointerCapture(e.pointerId);
  }, true);
  window.addEventListener('pointermove', e => {
    const d = triggerDrag; if (!d || d.id !== e.pointerId) return;
    const dx=e.clientX-d.x, dy=e.clientY-d.y;
    if (!d.moved && Math.hypot(dx,dy)<5) return;
    d.moved=true; e.preventDefault();
    d.host.classList.add('is-dragging');
    placeTriggers(d.host,d.left+dx,d.top+dy);
  }, {capture:true,passive:false});
  function endTriggerDrag() {
    if (!triggerDrag) return;
    if (triggerDrag.moved) suppressTriggerClickUntil=performance.now()+500;
    triggerDrag.host.classList.remove('is-dragging'); triggerDrag=null;
  }
  window.addEventListener('pointerup',endTriggerDrag,true);
  window.addEventListener('pointercancel',endTriggerDrag,true);
  window.addEventListener('resize',()=>{
    const host=document.querySelector('.pdcp-triggers');
    if(host){const r=host.querySelector('.pdcp-trigger-toggle').getBoundingClientRect();placeTriggers(host,r.left,r.top);}
  });
  function mountTriggers() {
    let host = document.querySelector('.pdcp-triggers'); if (!host) { host = document.createElement('aside'); host.className = 'pdcp-triggers'; document.body.appendChild(host); }
    host.innerHTML = `${triggersOpen ? `<section class="pdcp-trigger-panel"><h2>Event triggers</h2><p>Demo only · ${CONFIG.demo.secondsPerRealSecond}× playback</p><h3>Wearing angle</h3>${btn('trigger', 'Right pump tilted', '', 'data-value="angle-error"')}${btn('trigger', 'Left pump tilted', '', 'data-value="angle-left"')}${btn('trigger', 'Both pumps tilted', '', 'data-value="angle-both"')}${btn('trigger', 'Simulate angle adjustment', '', 'data-value="angle-demo"')}${btn('trigger','Wearing OK','','data-value="fit-ok"')}<h3>Let-down</h3>${btn('trigger', 'Let-down starts', '', 'data-value="letdown-start"')}${btn('trigger', 'Let-down ends', '', 'data-value="letdown-end"')}<h3>Expression</h3>${btn('trigger','First peak · 0.5 mL/s','','data-value="deep-peak"')}${btn('trigger','Half peak · 0.25 mL/s','','data-value="deep-half"')}<h3>Full bowl</h3>${btn('trigger','Left bowl full','','data-value="full-left"')}${btn('trigger','Right bowl full','','data-value="full-right"')}<h3>Battery</h3>${btn('trigger', 'Low battery', '', 'data-value="low-battery"')}${btn('trigger', 'Critical low battery', '', 'data-value="critical-battery"')}</section>` : ''}${btn('toggle-triggers', triggersOpen ? 'Close triggers' : 'Triggers', 'pdcp-trigger-toggle', `aria-expanded="${triggersOpen}"`)}`;
    const r = host.querySelector('.pdcp-trigger-toggle').getBoundingClientRect();
    placeTriggers(host, r.left, r.top);
  }
  async function exportReport() {
    if (!report || exportBusy) return;
    exportBusy = true;
    try {
      // Native Canvas export avoids external services, font fetches or screenshots.
      const c = document.createElement('canvas'); c.width = 840; c.height = 1250 + report.segments.length * 70;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff9fa'; ctx.fillRect(0, 0, c.width, c.height);
      const text = (str, x, y, size = 24, color = '#240f1b', weight = 400) => { ctx.fillStyle = color; ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`; ctx.fillText(str, x, y); };
      text('AIR 2  /  SESSION REPORT', 60, 70, 20, '#998b92', 600);
      text('Pumping report.', 60, 130, 35, '#240f1b', 600);
      text(new Date(report.startedAt).toLocaleString('en-US'), 60, 170, 20, '#998b92');
      text(amount(report.total) + ' ' + unit, 60, 260, 64, '#97002d', 600);
      text('Total milk  ·  Duration ' + clock(report.reportedDuration ?? report.elapsed), 60, 300, 22);
      ['l', 'r'].forEach((k, i) => { const s = report.sides[k], x = 60 + i * 370;
        text(sideLabel(k) + '   ' + amount(s.volume) + ' ' + unit, x, 365, 28, '#240f1b', 600);
        text(s.count + ' let-downs' + (percentage(k) !== null ? '  ·  ' + percentage(k) + '%' : ''), x, 410, 26);
        text('Average: ' + flow((report.originalVolumes?.[k]??s.volume)/Math.max(1,s.seconds)*60) + ' oz/min', x, 450, 22);
        text('Peak: ' + flow(s.peak) + ' ' + 'oz/min', x, 490, 22);

      });
      text('Pumping pattern', 60, 600, 30, '#240f1b', 600);
      const svg = curveSvg(report, 720, 270).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      try { const img = new Image(); await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; }); ctx.drawImage(img, 60, 630, 720, 270); } finally { URL.revokeObjectURL(url); }
      text('Left', 80, 920, 20, '#97002d'); text('Right', 170, 920, 20, '#f2a9bb');
      text('Session stages', 60, 985, 30, '#240f1b', 600);
      report.segments.forEach((s, i) => { const y = 1040 + i * 70; text(modeNames[s.mode] + ' · ' + methodNames[s.method], 60, y, 22); text(clock(s.duration), 440, y, 22); text(amount(s.l + s.r) + ' ' + unit, 580, y, 22); });
      const y = 1080 + report.segments.length * 70;
      text('Illustrative sensor data · this session only.', 60, y, 20, '#998b92');
      text(report.edited ? 'Edited total; pattern and stages retain original sensor data.' : 'Recorded automatically. Duration excludes pauses.', 60, y + 35, 20, '#998b92');
      const blob = await new Promise(resolve => c.toBlob(resolve, 'image/png')); if (!blob) throw new Error('Image export unavailable');
      const download = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = download; a.download = 'Air2-session-' + new Date(report.startedAt).toISOString().slice(0, 10) + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(download), 1000);
      // Successful export needs no additional toast.
    } catch (_) { const toast = root.querySelector('.pdcp-toast'); if (toast) toast.textContent = 'Image export is unavailable. You can still take a screenshot of this report.'; }
    finally { exportBusy = false; }
  }
  // A single session clock; legacy intervals are gated by state.pdcpV2.
  window.v4View = v4View = render; window.view = view = render; window.v4RunFit = v4RunFit = startFit;
  state.pdcpV2 = true; state.auto = true;
  mountTriggers(); render();
  setInterval(() => { const now = performance.now(); const dt = Math.min(1, Math.max(0, (now - timerAt) / 1000)); timerAt = now; advanceTriggerEnd(dt); if (!session || session.finished || session.paused) { simulationRemainder = 0; return; } simulationRemainder += dt * CONFIG.demo.secondsPerRealSecond; const seconds = Math.floor(simulationRemainder); simulationRemainder -= seconds; if (seconds) step(seconds); }, 250);
}());
