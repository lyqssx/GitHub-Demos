/* Approved 2026-09-21 scope. This owns the V2 control/report flow; legacy
   renderers remain available only for Device and Home. */
(function () {
  'use strict';
  const { Session, CONFIG, ML_PER_OZ } = window.Air2PDCP;
  const originalControl = window.v4Control;
  const originalHardware = window.v4Hardware;
  const originalList = window.v4List;
  const modeNames = { stimulation: 'Stimulation', expression: 'Expression', mixed: 'Mixed' };
  const methodNames = { auto: 'Auto', manual: 'Manual', preset: 'Preset' };
  const presets = { 'Milk Boost': [60, 300, 120, 720], 'Cozy Flow': [90, 360, 120, 720], 'Power Pumping': [120, 900, 480, 1200] };
  let session = null, report = null, method = 'auto', manualMode = 'stimulation', preset = 'Milk Boost';
  let sheet = null, fit = null, fitTimer = null, notice = '', timerAt = performance.now(), holding = null, signature = '';
  const unit = 'oz';
  let triggersOpen = false, exportBusy = false, simulationRemainder = 0;
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
    state.mode = session && !session.finished ? session.mode : (method === 'manual' ? manualMode : 'stimulation');
    state.running = !!(session && !session.finished); state.paused = !!(session && session.paused);
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
      : 'Let-down detected. You can switch to Expression when you are ready.');
    else remind(method === 'auto' ? 'ending' : 'suggestion', method === 'auto'
      ? 'Let-down has eased. Switched to Mixed mode.'
      : 'Milk flow has slowed. You can finish pumping when you are ready.');
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
    const currentMode = session && !session.finished ? session.mode : (method === 'manual' ? manualMode : 'stimulation');
    if (method === 'manual') return `<section class="pdcp-plan pdcp-manual-plan"><div class="pdcp-manual-head"><img src="./assets/pdcp-manual-header.svg" alt=""><h2>Manual</h2>${btn('methods','<img src="./assets/figma-r106-arrow.svg" alt="">','pdcp-text-button','aria-label="Change pumping method"')}</div><div class="pdcp-manual-tabs" role="group" aria-label="Manual mode">${['stimulation','expression','mixed'].map(mode=>btn('mode',`<img src="./assets/pdcp-mode-${mode}.svg" alt=""><span>${modeNames[mode]}</span>`,'',`data-value="${mode}" aria-pressed="${currentMode === mode}"`)).join('')}</div></section>`;
    return `<section class="pdcp-plan"><div class="pdcp-plan-head"><h2>${method === 'auto' ? 'Auto Switch' : method === 'preset' ? esc(preset) : 'Manual'}</h2><span class="pdcp-plan-time" data-live="timer">${clock(session ? session.elapsed : 0)}</span>${btn('methods', '<img src="./assets/figma-r106-arrow.svg" alt="">', 'pdcp-text-button', 'aria-label="Change pumping method"')}</div><div class="pdcp-mode-status"><div class="pdcp-mode-window"><div class="pdcp-mode-item" data-mode="${currentMode}"><img src="./assets/pdcp-mode-${currentMode}.svg" alt=""><b data-live="mode">${modeNames[currentMode]}</b></div></div><span>Current mode</span></div><div class="pdcp-metric-table"><div class="pdcp-metric-row pdcp-metric-labels"><span></span><span>Flow <small>oz/min</small></span><span>Let-downs</span><span>Peak <small>oz/min</small></span></div>${['l','r'].map(k=>{const v=nowSide(k);return `<div class="pdcp-metric-row"><span>${sideLabel(k)}</span><strong data-live="${k}-flow">${flow(session?.paused?0:v.flow)}</strong><strong data-live="${k}-count">${v.count}</strong><strong data-live="${k}-peak">${flow(v.peak)}</strong></div>`;}).join('')}</div></section>`;
  }
  function metricsSheet() {
    return `<div class="pdcp-sheet-backdrop"><section class="pdcp-sheet pdcp-flow-details" role="dialog" aria-modal="true" aria-label="Session details"><header><h2>Session details</h2>${btn('close-sheet', '×', 'pdcp-icon', 'aria-label="Close details"')}</header>${liveMetrics()}</section></div>`;
  }
  // Reuse original r50 markup, assets and CSS; only the check list changes.
function guide(adjust){return'<div class="r50-guide '+(adjust?'is-adjusting':'')+'" aria-label="Pump alignment guide"><div class="r50-pump-unit"><span class="r50-hardware"><img src="'+r2Asset('control-pumps.png')+'" alt="Left pump"></span><b>L</b></div><div class="r50-pump-unit right">'+(adjust?'<img class="r50-angle-guide" src="'+r2Asset('fit-guide.svg')+'" alt="Rotate the right pump to align">':'')+'<span class="r50-hardware"><img src="'+r2Asset('control-pumps.png')+'" alt="Right pump"></span><b>R</b></div></div>';}
function skipButton(){return'<button class="r50-skip" data-pdcp="fit-skip" type="button">Skip</button>';}
function panel(place){var raw=fit==='angle'?1:fit==='battery'?4:fit==='ready'?5:6,list=raw===1?[['Wearing angle','adjust']]:raw===4?[['Wearing angle','done'],['Battery','checking']]:[['Wearing angle','done'],['Battery','done']],adjust=list.some(function(x){return x[1]==='adjust';}),starting=raw>=6;if(starting)return'<section class="r50-fit-panel r50-'+place+' is-starting" data-r50-place="'+place+'" role="status" aria-live="polite">'+skipButton()+'<div class="r50-start-ceremony"><i></i><strong>START</strong><span>Pumping begins now</span></div><div class="r50-progress"><i style="--r50-progress:100%"></i></div></section>';var copy=adjust?'<strong>Adjust the right pump angle</strong><span>Rotate it slightly until it matches the guide</span>':raw>=5?'<strong>Everything looks good</strong><span>Your pumps are positioned correctly</span>':'<strong>Fit Check</strong><span>Keep still while we check your fit</span>';return'<section class="r50-fit-panel r50-'+place+'" data-r50-place="'+place+'" role="status" aria-live="polite"><header class="r50-fit-head"><div class="r50-fit-copy">'+copy+'</div>'+skipButton()+'</header><div class="r50-fit-checks">'+list.map(function(x){return'<span class="r50-fit-item is-'+x[1]+'"><i class="r50-check-icon">'+(x[1]==='done'?'✓':'<b></b>')+'</i>'+x[0]+'</span>';}).join('')+'</div>'+guide(adjust)+'<div class="r50-progress"><i style="--r50-progress:'+Math.min(100,Math.max(8,raw*20))+'%"></i></div></section>';}
  function fitPanel() { return panel(state.page === 'home' ? 'home' : 'control'); }
  function originalPump(k) {
    const side = nowSide(k), paused = state.paused, kind = state.flowKind;
    state.paused = paused || side.stopped;
    state.flowKind = state.paused ? 'paused' : side.flow < 1 ? 'low' : side.flow < 8 ? 'medium' : 'high';
    const template = document.createElement('template');
    template.innerHTML = originalHardware(k, side.volume / ML_PER_OZ);
    state.paused = paused; state.flowKind = kind;
    const pump = template.content.firstElementChild;
    pump.dataset.pdcpPump = k;
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
    if (settings) { settings.dataset.pdcp = 'methods'; settings.setAttribute('aria-label','Pumping settings'); }
    if (fit) {
      screen.querySelector('.v4-start')?.remove();
      screen.insertAdjacentHTML('beforeend', fitPanel());
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
    const pad = { l: 34, r: 12, t: 18, b: 30 }, end = Math.max(1, r.elapsed);
    const maxFlow = Math.max(1, ...r.samples.flatMap(p => [p.l, p.r]));
    const maxY = Math.ceil(maxFlow / ML_PER_OZ * 10) / 10 * ML_PER_OZ;
    const x = t => pad.l + t / end * (width - pad.l - pad.r), y = v => height - pad.b - v / maxY * (height - pad.t - pad.b);
    const paths = ['l', 'r'].map(k => `<path d="${r.samples.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(2)},${y(p[k]).toFixed(2)}`).join(' ')}" fill="none" stroke="${k === 'l' ? '#97002d' : '#f2a9bb'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    const grid = [0, .5, 1].map(f => `<line x1="${pad.l}" y1="${y(maxY * f)}" x2="${width - pad.r}" y2="${y(maxY * f)}" stroke="#eae2df" stroke-dasharray="3 4"/><text x="${pad.l - 7}" y="${y(maxY * f) + 3}" text-anchor="end" fill="#96838a" font-size="9">${flow(maxY * f)}</text>`).join('');
    const peaks = ['l', 'r'].map(k => { const s = r.sides[k]; if (s.peakAt === null || !s.peak) return ''; return `<circle cx="${x(s.peakAt)}" cy="${y(s.peak)}" r="3.5" fill="${k === 'l' ? '#97002d' : '#f2a9bb'}" stroke="white" stroke-width="1.5"/>`; }).join('');
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="This session's left and right milk flow in oz per minute"><text x="${pad.l}" y="10" fill="#96838a" font-size="9">oz/min</text>${grid}${paths}${peaks}${[0, .5, 1].map(f => `<text x="${x(end * f)}" y="${height - 9}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}" fill="#96838a" font-size="9">${clock(end * f)}</text>`).join('')}</svg>`;
  }
  function reportCard() {
    const r = report, date = new Date(r.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const full = ['l', 'r'].filter(k => r.sides[k].stopReason === 'full');
    const stages = r.segments.filter(s => s.duration > 0);
    return `<section class="pdcp-screen pdcp-report" role="dialog" aria-modal="true" aria-label="Pumping report"><header class="pdcp-header v4-top">${btn('close-report', '<img src="./assets/pdcp-report-close-glyph.svg" alt="">', 'pdcp-icon v4-circle', 'aria-label="Close report"')}<span class="pdcp-saved"><i>${r.valid ? '✓' : '○'}</i> ${r.valid ? 'Recorded automatically' : 'Session ended'}</span>${btn('share', '↗', 'pdcp-icon', 'aria-label="Export report image"')}</header><div class="pdcp-scroll pdcp-report-body"><div class="pdcp-report-heading"><h1>Report</h1><p>${esc(date)}</p></div>${full.length ? `<div class="pdcp-notice">${full.length === 2 ? 'Both bowls are full.' : sideLabel(full[0]) + ' bowl is full.'} Your session has ended and been recorded. Empty your bowls before starting again.</div>` : r.endReason === 'battery' ? '<div class="pdcp-notice">Battery is too low. Your session has ended and been recorded. Please charge both pumps.</div>' : ''}${!r.valid ? '<div class="pdcp-notice">No milk was recorded and pumping lasted 5 minutes or less. This is not counted as a pumping record.</div>' : ''}<section class="pdcp-total-card"><div class="pdcp-total-top"><span>Total milk</span></div><div class="pdcp-total">${amount(r.total)}<small>${unit}</small></div><div class="pdcp-report-duration"><span>Session duration</span><strong>${clock(r.elapsed)}</strong></div><div class="pdcp-split-bar"><i style="width:${percentage('l') ?? 50}%"></i></div><div class="pdcp-volume-sides">${['l', 'r'].map(k => `<div><span><i class="pdcp-dot ${k}"></i>${sideLabel(k)} <small>${percentage(k) !== null ? percentage(k) + '%' : '—'}</small></span><strong>${amount(r.sides[k].volume)} <small>${unit}</small></strong></div>`).join('')}</div>${btn('edit', 'Edit milk amounts', 'pdcp-text-button')}${r.edited ? '<span class="pdcp-edited">Edited</span>' : ''}</section><section class="pdcp-report-section"><div class="pdcp-section-heading"><h2>Your let-downs</h2><span>This session only</span></div><div class="pdcp-report-sides">${['l', 'r'].map(k => { const s = r.sides[k]; return `<section><h3><i class="pdcp-dot ${k}"></i>${sideLabel(k)}</h3><div class="pdcp-letdown-count">${s.count}<small>let-down${s.count === 1 ? '' : 's'}</small></div><dl><div><dt>First let-down</dt><dd>${s.first === null ? 'Not detected' : clock(s.first)}</dd></div><div><dt>Peak flow</dt><dd>${flow(s.peak)} <small>oz/min</small></dd></div><div><dt>Peak reached at</dt><dd>${s.peakAt === null ? '—' : clock(s.peakAt)}</dd></div></dl></section>`; }).join('')}</div></section><section class="pdcp-report-section"><div class="pdcp-section-heading"><h2>Your pumping pattern</h2><div class="pdcp-legend"><span><i class="pdcp-dot l"></i>L</span><span><i class="pdcp-dot r"></i>R</span></div></div>${curveSvg(r)}<p class="pdcp-caption">Flow throughout this session. Dots mark each side’s peak.</p></section><section class="pdcp-report-section"><div class="pdcp-section-heading"><h2>How your session flowed</h2></div><div class="pdcp-timeline">${stages.map(s => `<i class="${s.mode}" style="flex:${s.duration}" title="${modeNames[s.mode]} ${clock(s.duration)}"></i>`).join('')}</div><div class="pdcp-stage-head"><span>Mode / method</span><span>Duration</span><span>Milk · ${unit}</span></div>${stages.length ? stages.map(s => `<div class="pdcp-stage-row"><div><b><i class="pdcp-stage-dot ${s.mode}"></i>${modeNames[s.mode]}</b><small>${methodNames[s.method]}${s.method === 'preset' ? ' · ' + esc(s.preset) : ''} · ${clock(s.start)}</small></div><strong>${clock(s.duration)}</strong><strong>${amount(s.l + s.r)}</strong></div>`).join('') : '<p class="pdcp-caption">No pumping time recorded.</p>'}${r.edited ? '<p class="pdcp-caption">Stage milk and the flow curve reflect original sensor data. Your edited amounts are shown in the total above.</p>' : ''}</section><p class="pdcp-report-foot">A closer look at your own rhythm.<br>Every session has its own pattern.</p><p class="pdcp-demo-note">Illustrative sensor data · duration excludes pauses.<br>Demo record is kept until this page is reloaded.</p><div class="pdcp-report-bottom">${btn('share', exportBusy ? 'Preparing image…' : 'Save report image', 'pdcp-secondary', exportBusy ? 'disabled' : '')}${btn('close-report', 'Done', 'pdcp-primary')}</div></div>${sheet === 'edit' ? editSheet() : ''}<div class="pdcp-toast" role="status" aria-live="polite"></div></section>`;
  }
  function editSheet() {
    return `<div class="pdcp-sheet-backdrop"><section class="pdcp-sheet" role="dialog" aria-modal="true" aria-label="Edit milk amounts"><header><h2>Edit milk amounts</h2>${btn('close-sheet', '×', 'pdcp-icon', 'aria-label="Cancel editing"')}</header><p class="pdcp-sheet-help">Only change these if the measured amounts need correcting. Your session timing and sensor pattern stay the same.</p><form id="pdcp-edit-form"><div class="pdcp-edit-fields">${['l', 'r'].map(k => `<label>${sideLabel(k)} · ${unit}<input name="${k}" type="number" inputmode="decimal" min="0" max="${amount(CONFIG.demo.bowlCapacityMl)}" step="any" value="${amount(report.sides[k].volume)}" required></label>`).join('')}</div><p class="pdcp-form-error" role="alert"></p><button class="pdcp-primary" type="submit">Apply changes</button>${btn('close-sheet', 'Cancel', 'pdcp-text-button')}</form></section></div>`;
  }
  let lastModeWindow = null;
  function render(force = true) {
    syncLegacy();
    if (!force && state.page === 'control' && !sheet && !fit && !report) { patchLive(); return; }
    const previousMode = root.querySelector('.pdcp-mode-window') || lastModeWindow;
    const previousScroll = root.querySelector('.pdcp-scroll,.v4-controls')?.scrollTop || 0;
    const oldPage = root.firstElementChild?.className || '';
    root.innerHTML = report ? `<div class="pdcp-report-overlay"><div class="pdcp-report-underlay" inert aria-hidden="true">${v4Home()}</div><div class="pdcp-report-dim"></div>${reportCard()}</div>` : state.page === 'device' ? v4Device() : state.page === 'home' ? v4Home() : state.page === 'list' ? programList() : control();
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
    if (nextMode) lastModeWindow = root.querySelector('.pdcp-mode-window');
    if (oldPage === (root.firstElementChild?.className || '')) { const scroll = root.querySelector('.pdcp-scroll,.v4-controls'); if (scroll) scroll.scrollTop = previousScroll; }
    if (fit && state.page === 'home') { const dock = root.querySelector('.v4-home-dock'); if (dock) dock.outerHTML = fitPanel(); }
    if (state.page === 'home') {
      const dock = root.querySelector('.v4-dock-mode,.h7-dock-mode');
      if (dock) { const copy = dock.querySelector('span'); if (copy) copy.innerHTML = '<b>' + methodNames[method] + '</b>' + (session && !session.finished ? '<em>' + clock(session.elapsed) + '</em>' : ''); }
    }
    signature = session ? [session.mode, session.paused, session.sides.l.stopped, session.sides.r.stopped, state.controlNotice?.id || ''].join('|') : '';
  }
  function patchLive() {
    const values = { 'preset-time': presetTime(), timer: clock(session ? session.elapsed : 0), mode: modeNames[session && !session.finished ? session.mode : (method === 'manual' ? manualMode : 'stimulation')] };
    ['l', 'r'].forEach(k => { const s = nowSide(k); Object.assign(values, { [k + '-volume']: amount(s.volume), [k + '-flow']: flow(session && session.paused ? 0 : s.flow), [k + '-count']: s.count, [k + '-peak']: flow(s.peak) }); const fill = root.querySelector(`[data-fill="${k}"]`); if (fill) fill.style.height = Math.min(80, s.volume / CONFIG.demo.bowlCapacityMl * 80) + '%'; });
    root.querySelectorAll('[data-pdcp-pump]').forEach(el => { const k = el.dataset.pdcpPump; const side = nowSide(k); const kind = session?.paused || side.stopped ? 'paused' : side.flow < 1 ? 'low' : side.flow < 8 ? 'medium' : 'high'; if (el.dataset.pdcpFlow !== kind) { el.outerHTML = originalPump(k); return; } const label = el.querySelector('.amount'); if (label) label.textContent = amount(side.volume) + ' oz'; const liquid = el.querySelector('.c32-liquid'); if (liquid) { const height = Math.min(94, side.volume / CONFIG.demo.bowlCapacityMl * 94); liquid.style.height = height + 'px'; liquid.style.setProperty('--liquid-height', height + 'px'); } });
    root.querySelectorAll('[data-live]').forEach(el => { const next = String(values[el.dataset.live] ?? ''); if (el.textContent !== next) el.textContent = next; });
  }
  function startFit() {
    if (session && !session.finished) { state.page = 'control'; render(); return; }
    clearTimeout(reminderTimer); state.controlNotice = null; state.leakAdjusting = false; state.leakSide = null;
    report = null; session = null; sheet = null; fit = 'angle'; notice = ''; render();
    clearTimeout(fitTimer); fitTimer = setTimeout(fitOk, 2100);
  }
  function beginPumping() {
    if (!fit) return;
    if (Math.min(state.batteryL ?? 80, state.batteryR ?? 75) <= 3) { fit = null; state.page = 'control'; notice = 'Battery is too low to start. Please charge your pumps.'; render(); return; }
    fit = null; finishReminderShown = false; session = new Session({ method, mode: manualMode, preset }); report = null; notice = '';
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
  function settle(reason = 'manual') {
    if (!session || report) return;
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
    const record = { id: report.id, left: state.lastSessionL, right: state.lastSessionR, total: state.lastSessionTotal };
    if (report.valid) { if (index >= 0) state.air2SessionHistory[index] = record; else state.air2SessionHistory.push(record); }
    else if (index >= 0) state.air2SessionHistory.splice(index, 1);
    state.hasLogged = state.air2SessionHistory.length > 0;
  }
  // Illustrative, independent sensor traces. These are not learned patterns or
  // threshold-based firmware decisions. Events can still be forced via Triggers.
  function mockSensor(k, t) {
    const sample = window.Air2PDCP.demoSensor(k, t);
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
    else if (!finishReminderShown) { finishReminderShown = true; remind('ending', 'No new let-down for 2 minutes. Ready to finish? Hold to finish when you are ready.'); }
    const stopped = ['l', 'r'].filter(k => session.sides[k].stopped);
    if (stopped.length === 1 && previousStops === 0) remind('complete', sideLabel(stopped[0]) + ' bowl is full and has stopped. The other side is still pumping. One report will be ready when both sides finish.');
    syncLegacy(); const next = [session.mode, session.paused, session.sides.l.stopped, session.sides.r.stopped, state.controlNotice?.id || ''].join('|');
    if (!sheet && state.page === 'control') render(next !== signature);
  }
  function cancelHold() { if (holding) clearTimeout(holding); holding = null; root.querySelector('[data-pdcp="finish"]')?.classList.remove('holding'); }
  window.addEventListener('pointerdown', e => {
    if (!e.target.closest('[data-pdcp="finish"]')) return;
    e.preventDefault(); e.stopImmediatePropagation(); cancelHold(); e.target.closest('button').classList.add('holding');
    holding = setTimeout(() => { holding = null; settle(); }, 1600);
  }, true);
  ['pointerup', 'pointercancel', 'blur'].forEach(name => window.addEventListener(name, cancelHold, true));
  window.addEventListener('keydown', e => { if (e.target.closest('[data-pdcp="finish"]') && ['Enter', ' '].includes(e.key)) { e.preventDefault(); sheet = 'finish-confirm'; render(); const screen = root.querySelector('.pdcp-screen,.pdcp-legacy-control'); screen.insertAdjacentHTML('beforeend', `<div class="pdcp-sheet-backdrop"><section class="pdcp-sheet" role="dialog" aria-modal="true" aria-label="Finish session"><h2>Finish this session?</h2>${btn('finish-confirm', 'Finish and view report', 'pdcp-primary')}${btn('close-sheet', 'Keep pumping', 'pdcp-text-button')}</section></div>`); } if (e.key === 'Escape' && sheet) { sheet = null; render(); } }, true);
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
    const factor = ML_PER_OZ;
    const toMl = value => { const max = Number(amount(CONFIG.demo.bowlCapacityMl)); return Number(value) <= max ? Math.min(CONFIG.demo.bowlCapacityMl, Number(value) * factor) : NaN; };
    const left = l === amount(report.sides.l.volume) ? report.sides.l.volume : toMl(l);
    const right = r === amount(report.sides.r.volume) ? report.sides.r.volume : toMl(r);
    if (l.trim() === '' || r.trim() === '' || !session.editVolumes(left, right)) { form.querySelector('.pdcp-form-error').textContent = `Enter an amount from 0 to ${amount(CONFIG.demo.bowlCapacityMl)} ${unit} for each side.`; return; }
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
    if (a === 'start') { startFit(); return; }
    if (a === 'fit-skip') { clearTimeout(fitTimer); beginPumping(); return; }
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
    if (a === 'toggle-triggers') { triggersOpen = !triggersOpen; mountTriggers(); return; }
    if (a === 'trigger') { trigger(value); triggersOpen = false; mountTriggers(); return; }
    render();
  }, true);
  function trigger(id) {
    if (id === 'fit-ok') {
      if (state.leakAdjusting && session && !session.finished) {
        state.leakAdjusting = false; state.leakSide = null; session.paused = false;
        timerAt = performance.now(); simulationRemainder = 0;
        state.controlNotice = {kind:'leak', phase:'recovered', id:Date.now()};
        clearTimeout(reminderTimer);
        const recovered = state.controlNotice;
        reminderTimer = setTimeout(() => {
          if (state.controlNotice !== recovered) return;
          recovered.phase = 'closing-recovered'; render();
          reminderTimer = setTimeout(() => { if (state.controlNotice === recovered) { state.controlNotice = null; render(); } }, 340);
        }, 3000);
        render();
      } else fitOk();
      return;
    }
    if (!session || session.finished) { notice = 'Start pumping to try this event.'; if (!report) render(); return; }
    if (id === 'angle-error') {
      clearTimeout(reminderTimer); state.leakAdjusting = true; state.leakSide = 'r';
      session.paused = true; simulationRemainder = 0;
      state.controlNotice = {kind:'leak', phase:'warning', id:Date.now()};
      render(); return;
    }
    if (state.leakAdjusting && id !== 'critical-battery') return;
    if (id === 'letdown-start' || id === 'letdown-end') { const wasActive = ['l', 'r'].some(k => session.sides[k].active); for (const k of ['l', 'r']) { overrides[k] = id === 'letdown-start'; session.letdown(k, overrides[k]); } letdownReminder(wasActive); }
    if (id === 'low-battery') { state.batteryL = 12; state.batteryR = 10; remind('low-battery', 'Battery is running low. You can finish this session, then charge Air 2 soon.'); }
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
  function mountTriggers() {
    let host = document.querySelector('.pdcp-triggers'); if (!host) { host = document.createElement('aside'); host.className = 'pdcp-triggers'; document.body.appendChild(host); }
    host.innerHTML = `${triggersOpen ? `<section class="pdcp-trigger-panel"><h2>Event triggers</h2><p>Demo only · ${CONFIG.demo.secondsPerRealSecond}× playback</p><h3>Wearing angle</h3>${btn('trigger', 'Wearing angle incorrect', '', 'data-value="angle-error"')}${btn('trigger', 'Wearing OK', '', 'data-value="fit-ok"')}<h3>Let-down</h3>${btn('trigger', 'Let-down starts', '', 'data-value="letdown-start"')}${btn('trigger', 'Let-down ends', '', 'data-value="letdown-end"')}<h3>Battery</h3>${btn('trigger', 'Low battery', '', 'data-value="low-battery"')}${btn('trigger', 'Critical low battery', '', 'data-value="critical-battery"')}</section>` : ''}${btn('toggle-triggers', triggersOpen ? 'Close triggers' : 'Triggers', 'pdcp-trigger-toggle', `aria-expanded="${triggersOpen}"`)}`;
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
      text('Your pumping report.', 60, 130, 35, '#240f1b', 600);
      text(new Date(report.startedAt).toLocaleString('en-US'), 60, 170, 20, '#998b92');
      text(amount(report.total) + ' ' + unit, 60, 260, 64, '#97002d', 600);
      text('Total milk  ·  Duration ' + clock(report.elapsed), 60, 300, 22);
      ['l', 'r'].forEach((k, i) => { const s = report.sides[k], x = 60 + i * 370;
        text(sideLabel(k) + '   ' + amount(s.volume) + ' ' + unit, x, 365, 28, '#240f1b', 600);
        text(s.count + ' let-downs' + (percentage(k) !== null ? '  ·  ' + percentage(k) + '%' : ''), x, 410, 26);
        text('First: ' + (s.first === null ? 'Not detected' : clock(s.first)), x, 450, 22);
        text('Peak: ' + flow(s.peak) + ' ' + 'oz/min', x, 490, 22);
        text('At: ' + (s.peakAt === null ? '—' : clock(s.peakAt)), x, 530, 22);
      });
      text('Your pumping pattern', 60, 600, 30, '#240f1b', 600);
      const svg = curveSvg(report, 720, 270).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      try { const img = new Image(); await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; }); ctx.drawImage(img, 60, 630, 720, 270); } finally { URL.revokeObjectURL(url); }
      text('Left', 80, 920, 20, '#97002d'); text('Right', 170, 920, 20, '#f2a9bb');
      text('How your session flowed', 60, 985, 30, '#240f1b', 600);
      report.segments.forEach((s, i) => { const y = 1040 + i * 70; text(modeNames[s.mode] + ' · ' + methodNames[s.method], 60, y, 22); text(clock(s.duration), 440, y, 22); text(amount(s.l + s.r) + ' ' + unit, 580, y, 22); });
      const y = 1080 + report.segments.length * 70;
      text('Illustrative sensor data · this session only.', 60, y, 20, '#998b92');
      text(report.edited ? 'Edited total; pattern and stages retain original sensor data.' : 'Recorded automatically. Duration excludes pauses.', 60, y + 35, 20, '#998b92');
      const blob = await new Promise(resolve => c.toBlob(resolve, 'image/png')); if (!blob) throw new Error('Image export unavailable');
      const download = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = download; a.download = 'Air2-session-' + new Date(report.startedAt).toISOString().slice(0, 10) + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(download), 1000);
      const toast = root.querySelector('.pdcp-toast'); if (toast) toast.textContent = 'Report image ready to save.';
    } catch (_) { const toast = root.querySelector('.pdcp-toast'); if (toast) toast.textContent = 'Image export is unavailable. You can still take a screenshot of this report.'; }
    finally { exportBusy = false; }
  }
  // A single session clock; legacy intervals are gated by state.pdcpV2.
  window.v4View = v4View = render; window.view = view = render; window.v4RunFit = v4RunFit = startFit;
  state.pdcpV2 = true; state.auto = true;
  mountTriggers(); render();
  setInterval(() => { const now = performance.now(); const dt = Math.min(1, Math.max(0, (now - timerAt) / 1000)); timerAt = now; if (!session || session.finished || session.paused) { simulationRemainder = 0; return; } simulationRemainder += dt * CONFIG.demo.secondsPerRealSecond; const seconds = Math.floor(simulationRemainder); simulationRemainder -= seconds; if (seconds) step(seconds); }, 250);
}());
