/* Rhythm recording review flow layered onto the existing Air 2 demo. */
(function () {
  'use strict';

  var host = document.getElementById('demo');
  var originalLogged = window.v4Logged;

  state.rrListTab = state.rrListTab || 'momcozy';
  state.rrPanel = state.rrPanel || null;
  state.rrExpandedCreated = state.rrExpandedCreated || null;
  state.rrHabitInviteOpen = false;
  state.rrCreatedRecords = state.rrCreatedRecords || [
    {
      id: 'evening-rhythm', name: 'Evening Rhythm', duration: '18:20', description: 'Recorded from a manual session', source: '',
      parts: [['stim', 2], ['expr', 5], ['mix', 2], ['expr', 3]],
      phases: [
        { name: 'Stimulation', duration: '03:00', suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '07:40', suction: '5', speed: '3', kind: 'expr' },
        { name: 'Mixed', duration: '03:10', suction: '4', speed: '2', kind: 'mix' },
        { name: 'Expression', duration: '04:30', suction: '5', speed: '3', kind: 'expr' }
      ]
    },
    {
      id: 'my-milk-boost', name: 'My Milk Boost', duration: '19:30', description: 'Adjusted for a steadier let-down', source: 'Milk Boost',
      parts: [['stim', 2], ['expr', 6], ['stim', 1], ['expr', 4]],
      phases: [
        { name: 'Stimulation', duration: '03:00', suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '09:00', suction: '5', speed: '3', kind: 'expr' },
        { name: 'Stimulation', duration: '01:30', suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '06:00', suction: '5', speed: '3', kind: 'expr' }
      ]
    },
    {
      id: 'night-quick-rhythm', name: 'Night Quick Rhythm', duration: '16:40', description: 'A shorter evening sequence', source: 'Cozy Flow',
      parts: [['stim', 2], ['expr', 6], ['mix', 3]],
      phases: [
        { name: 'Stimulation', duration: '03:20', suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '09:00', suction: '5', speed: '3', kind: 'expr' },
        { name: 'Mixed', duration: '04:20', suction: '4', speed: '2', kind: 'mix' }
      ]
    },
    {
      id: 'my-own-rhythm', name: 'My Own Rhythm', duration: '17:10', description: 'Created from scratch', source: '',
      parts: [['stim', 3], ['expr', 7], ['mix', 2]],
      phases: [
        { name: 'Stimulation', duration: '04:00', suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '09:30', suction: '5', speed: '3', kind: 'expr' },
        { name: 'Mixed', duration: '03:40', suction: '4', speed: '2', kind: 'mix' }
      ]
    }
  ];
  state.rrInsight = state.rrInsight || {
    sessions: 8,
    duration: '18:20',
    source: '',
    phases: [
      { name: 'Stimulation', duration: '03:20', seconds: 200, suction: '3', speed: '2', kind: 'stim' },
      { name: 'Expression', duration: '09:10', seconds: 550, suction: '5', speed: '3', kind: 'expr' },
      { name: 'Mixed', duration: '05:50', seconds: 350, suction: '4', speed: '2', kind: 'mix' }
    ]
  };
  state.rrInsightStatus = state.rrInsightStatus || 'new';
  state.rrSessionLogs = state.rrSessionLogs || [
    {
      id: 'log-sep-9', date: 'Sep 9', time: '10:32 PM', duration: '18:20', device: 'Mobile Flow', note: 'Manual', source: '',
      summary: 'Stimulation · Expression · 3 more',
      parts: [['stim', 160], ['expr', 260], ['stim', 110], ['mix', 190], ['expr', 380]],
      phases: [
        { name: 'Stimulation', duration: '02:40', seconds: 160, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '04:20', seconds: 260, suction: '5', speed: '3', kind: 'expr' },
        { name: 'Stimulation', duration: '01:50', seconds: 110, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Mixed', duration: '03:10', seconds: 190, suction: '4', speed: '2', kind: 'mix' },
        { name: 'Expression', duration: '06:20', seconds: 380, suction: '5', speed: '3', kind: 'expr' }
      ]
    },
    {
      id: 'log-sep-8', date: 'Sep 8', time: '9:15 PM', duration: '20:05', device: 'Mobile Flow', note: 'Program', source: 'Milk Boost',
      summary: 'Milk Boost', parts: [['stim', 180], ['expr', 480], ['stim', 120], ['expr', 425]],
      phases: [
        { name: 'Stimulation', duration: '03:00', seconds: 180, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '08:00', seconds: 480, suction: '5', speed: '3', kind: 'expr' },
        { name: 'Stimulation', duration: '02:00', seconds: 120, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '07:05', seconds: 425, suction: '5', speed: '3', kind: 'expr' }
      ]
    },
    {
      id: 'log-sep-6', date: 'Sep 6', time: '8:47 PM', duration: '16:40', device: 'Mobile Flow', note: 'Manual', source: '',
      summary: 'Stimulation · Expression', parts: [['stim', 220], ['expr', 780]],
      phases: [
        { name: 'Stimulation', duration: '03:40', seconds: 220, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '13:00', seconds: 780, suction: '5', speed: '3', kind: 'expr' }
      ]
    },
    {
      id: 'log-sep-4', date: 'Sep 4', time: '7:28 AM', duration: '19:10', device: 'Mobile Flow', note: 'Program', source: 'Cozy Flow',
      summary: 'Cozy Flow', parts: [['stim', 210], ['expr', 620], ['mix', 320]],
      phases: [
        { name: 'Stimulation', duration: '03:30', seconds: 210, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '10:20', seconds: 620, suction: '5', speed: '3', kind: 'expr' },
        { name: 'Mixed', duration: '05:20', seconds: 320, suction: '4', speed: '2', kind: 'mix' }
      ]
    }
  ];
  var manualFinishTimer = null;
  var manualFinishPointer = null;

  var manualPhasePresets = [
    { duration: '02:40', seconds: 160, suction: '3', speed: '2' },
    { duration: '04:20', seconds: 260, suction: '5', speed: '3' },
    { duration: '01:50', seconds: 110, suction: '3', speed: '2' },
    { duration: '03:10', seconds: 190, suction: '4', speed: '2' },
    { duration: '06:20', seconds: 380, suction: '5', speed: '3' }
  ];

  function icon(name, alt) {
    return '<img src="' + r2Asset(name) + '" alt="' + (alt || '') + '">';
  }

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function pageHeader(title, action) {
    return '<header class="v4-top rr-page-header"><button class="v4-circle" type="button" data-rr="' + action + '" aria-label="Back">' + icon('control-back.svg') + '</button><h1>' + title + '</h1><span></span></header>';
  }

  function tabs() {
    return '<div class="rr-program-nav" role="tablist" aria-label="Programs and records"><div class="rr-tabs">' +
      '<button type="button" role="tab" aria-selected="' + (state.rrListTab === 'momcozy') + '" class="' + (state.rrListTab === 'momcozy' ? 'active' : '') + '" data-rr="tab" data-tab="momcozy">Recommended</button>' +
      '<button type="button" role="tab" aria-selected="' + (state.rrListTab === 'created') + '" class="' + (state.rrListTab === 'created' ? 'active' : '') + '" data-rr="tab" data-tab="created">Customize</button>' +
      '</div><button type="button" role="tab" aria-selected="' + (state.rrListTab === 'log') + '" class="rr-record-link ' + (state.rrListTab === 'log' ? 'active' : '') + '" data-rr="tab" data-tab="log"><span>Record</span></button>' +
    '</div>';
  }

  function timeline(parts) {
    return '<span class="rr-timeline" aria-hidden="true">' + parts.map(function (part) {
      return '<i class="' + part[0] + '" style="flex:' + part[1] + '"></i>';
    }).join('') + '</span>';
  }

  function officialPrograms() {
    var expanded = state.listExpanded === 'Milk Boost';
    return ['Cozy Flow|21:30','Milk Boost|20:00','Power Pumping|45:00'].map(function (item) {
      var values = item.split('|'), name = values[0], duration = values[1];
      if (name === 'Milk Boost' && expanded) {
        return '<section class="r2-program-expanded" data-v4="toggle-program"><div><b>' + name + ' <em>' + duration + '</em></b><button type="button" data-v4="choose-program" aria-label="Start Milk Boost">' + icon('list-play.svg', 'Start') + '</button></div><small>Designed for steady daily pumping after let-down.</small>' + timeline([['stim',2],['expr',6],['stim',1],['expr',4]]) + '<footer><span>● Stimulate</span><span>● Expression</span></footer></section>';
      }
      return '<button class="r2-program-row" type="button" ' + (name === 'Milk Boost' ? 'data-v4="toggle-program"' : 'data-rr="start-program" data-program="' + name + '"') + '><b>' + name + ' <em>' + duration + '</em></b>' + icon('list-play.svg', 'Start') + '</button>';
    }).join('');
  }

  function sourceLine(source) {
    if (!source) return '';
    var safeSource = escapeHTML(source);
    return '<button type="button" class="rr-source" data-rr="open-source" data-program="' + safeSource + '" aria-label="View source rhythm ' + safeSource + '"><span>Adapted from</span><strong>' + safeSource + '</strong><b aria-hidden="true">›</b></button>';
  }

  function conclusionSourceProgram() {
    if (state.riConclusionSource !== 'rhythm-record') return '';
    return state.rrConclusionProgram || '';
  }

  function createdCard(record) {
    var expanded = state.rrExpandedCreated === record.id;
    var safeName = escapeHTML(record.name);
    var details = expanded ? '<div class="rr-created-details">' + sourceLine(record.source) + timeline(record.parts) + '<div class="rr-timeline-key"><span class="stim">Stimulation</span><span class="expr">Expression</span><span class="mix">Mixed</span></div></div>' : '';
    return '<article class="rr-created-card ' + (expanded ? 'expanded' : '') + '" data-created-id="' + record.id + '"><div class="rr-created-title"><button class="rr-created-toggle" type="button" data-rr="toggle-created" data-created-id="' + record.id + '" aria-expanded="' + expanded + '"><b>' + safeName + ' <em>' + escapeHTML(record.duration) + '</em></b>' + (expanded ? '<small>' + escapeHTML(record.description) + '</small>' : '') + '</button><span class="rr-created-actions">' + (expanded ? '<button class="rr-created-edit" type="button" data-rr="edit-created" data-created-id="' + record.id + '" aria-label="Edit ' + safeName + '">' + icon('personal-rhythm-edit.svg') + '</button>' : '') + '<button class="rr-created-play" type="button" data-rr="start-program" data-program="' + safeName + '" aria-label="Start ' + safeName + '">' + icon('list-play.svg', 'Start') + '</button></span></div>' + details + '</article>';
  }

  function createdPrograms() {
    return state.rrCreatedRecords.map(createdCard).join('');
  }

  function logInsight() {
    var insight = state.rrInsight;
    if (!insight) return '';
    if (state.rrInsightStatus === 'saved') {
      return '<section class="rr-log-insight is-saved"><header><span>Rhythm Insight</span><em>Saved</em></header><b>Personal rhythm created</b><p>This insight is now available in Customize.</p><button type="button" data-rr="view-saved-insight">View in Customize <span aria-hidden="true">›</span></button></section>';
    }
    return '<section class="rr-log-insight"><header><span>Rhythm Insight</span><em>New</em></header><b>A familiar rhythm is taking shape</b><p>We found a pattern you use consistently across ' + insight.sessions + ' sessions.</p><div class="rr-insight-summary"><strong>About ' + escapeHTML(roundDurationToTen(insight.duration)) + '</strong><span>average · ' + insight.phases.length + ' stable phases</span></div><button type="button" data-rr="review-habit">Review &amp; Create <span aria-hidden="true">›</span></button></section>';
  }

  function recordDurationLabel(duration) {
    return Math.max(1, Math.round(durationSeconds(duration) / 60)) + ' min';
  }

  function roundDurationToTen(duration) {
    return formatDuration(Math.round(durationSeconds(duration) / 10) * 10);
  }

  function logRow(record) {
    var device = record.device || 'Mobile Flow';
    var kind = record.source ? 'Program' : 'Manual';
    var title = 'Pumping with ' + device + ' for ' + recordDurationLabel(record.duration) + '.';
    return '<button class="rr-log-row" type="button" data-rr="open-log" data-log-id="' + escapeHTML(record.id) + '"><span class="rr-log-date"><b>' + escapeHTML(record.date) + '</b><small>' + escapeHTML(record.time) + '</small></span><span class="rr-log-main"><b>' + escapeHTML(title) + '</b><small>' + kind + '</small>' + timeline(record.parts) + '</span><i aria-hidden="true">›</i></button>';
  }

  function logPrograms() {
    return logInsight() + '<p class="rr-log-label">Sessions</p><div class="rr-log-list" aria-label="Pumping session logs">' + state.rrSessionLogs.map(logRow).join('') + '</div>';
  }

  function programList() {
    var manual = r2ListCard('Stimulation','Gentle and comfortable','list-heart.svg',!state.selectedProgram && state.mode === 'stimulation','', 'data-v4="manual" data-mode="stimulation"') +
      r2ListCard('Expression','Fast-paced and intense','list-expression.svg',!state.selectedProgram && state.mode === 'expression','02:01', 'data-v4="manual" data-mode="expression"') +
      r2ListCard('Mixed','A balanced blend of both modes','../figma-v2/icon-mixed.svg',!state.selectedProgram && state.mode === 'mixed','', 'data-v4="manual" data-mode="mixed"');
    var programs = state.rrListTab === 'momcozy' ? officialPrograms() : (state.rrListTab === 'created' ? createdPrograms() : logPrograms());
    var createAction = state.rrListTab === 'log' ? '' : '<button type="button" data-rr="create">' + icon('list-create.svg') + ' Create</button>';
    var pending = state.rrPendingProgram ? confirmProgram() : '';
    return '<section class="v4 v4-list r2-list rr-list">' + v4Status() + '<header class="v4-top">' + v4Back('control') + '</header><h1>List</h1><div class="v4-list-auto">Auto Switch ' + v4Switch() + '</div><main class="rr-list-content"><p>Manual</p>' + manual + '<header class="rr-program-head"><span>Programs</span>' + createAction + '</header>' + tabs() + '<section class="rr-program-list rr-program-list-' + state.rrListTab + '">' + programs + '</section></main>' + pending + '</section>';
  }

  function confirmProgram() {
    return '<div class="v4-overlay"><section class="v4-confirm rr-confirm"><h2>Switch to ' + escapeHTML(state.rrPendingProgram) + '?</h2><p>Your current session timer will reset.</p><button type="button" data-rr="confirm-program">Confirm Switch</button><button type="button" data-rr="cancel-program">Not Now</button></section></div>';
  }

  function phaseRow(name, duration, suction, speed, kind) {
    return '<div class="rr-phase-row"><i class="' + kind + '"></i><span><b>' + name + '</b><small>Suction ' + suction + ' · Speed ' + speed + '</small></span><em>' + duration + '</em></div>';
  }

  function modeName(mode) {
    return mode === 'expression' ? 'Expression' : mode === 'mixed' ? 'Mixed' : 'Stimulation';
  }

  function modeKind(mode) {
    return mode === 'expression' ? 'expr' : mode === 'mixed' ? 'mix' : 'stim';
  }

  function formatDuration(seconds) {
    var value = Math.max(0, Math.round(Number(seconds) || 0));
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }

  function mockManualPhases(trace) {
    return trace.map(function (mode, phaseIndex) {
      var preset = manualPhasePresets[Math.min(phaseIndex, manualPhasePresets.length - 1)];
      return { name: modeName(mode), duration: preset.duration, seconds: preset.seconds, suction: preset.suction, speed: preset.speed, kind: modeKind(mode) };
    });
  }

  function beginManualRecording(initialMode) {
    state.rrManualRecording = true;
    state.rrManualTrace = [initialMode || state.mode || 'stimulation'];
    state.rrCurrentLogCaptured = false;
    state.rrConclusionPhases = null;
    state.rrConclusionProgram = null;
    state.rrConclusionMeta = null;
    state.riConclusionLevel = null;
    state.riConclusionSource = 'manual-record';
  }

  function recordManualMode(mode) {
    if (!state.running || state.selectedProgram) return;
    if (!state.rrManualRecording || !Array.isArray(state.rrManualTrace)) beginManualRecording(state.mode || 'stimulation');
    if (state.rrManualTrace[state.rrManualTrace.length - 1] !== mode) state.rrManualTrace.push(mode);
  }

  function finalizeManualRecording() {
    if (!state.rrManualRecording || !Array.isArray(state.rrManualTrace)) return;
    var phases = mockManualPhases(state.rrManualTrace);
    state.rrConclusionPhases = phases;
    state.rrConclusionDuration = phases.length >= 5 ? '18:20' : formatDuration(phases.reduce(function (total, phase) { return total + phase.seconds; }, 0));
    state.rrConclusionProgram = null;
    state.riConclusionSource = 'manual-record';
    state.riConclusionLevel = phases.length >= 3 ? 'L1' : 'L0';
    state.rrManualRecording = false;
  }

  function saveSheet() {
    if (!state.rrSaveOpen) return '';
    return '<div class="v4-overlay"><section class="rr-save-sheet"><h2>Save as a Personal Rhythm</h2><label for="rr-rhythm-name">Rhythm name</label><input id="rr-rhythm-name" value="My Refined Rhythm" maxlength="32"><button class="rr-save-primary" type="button" data-rr="confirm-save">Save Rhythm</button><button type="button" data-rr="cancel-save">Cancel</button></section></div>';
  }

  function clonePhases(phases) {
    return (phases || []).map(function (phase) { return Object.assign({}, phase); });
  }

  function loadInsightConclusion() {
    var insight = state.rrInsight;
    if (!insight) return false;
    state.rrConclusionPhases = clonePhases(insight.phases);
    state.rrConclusionDuration = insight.duration;
    state.rrConclusionMeta = 'Built from ' + insight.sessions + ' similar sessions';
    state.rrConclusionProgram = insight.source || null;
    state.riConclusionSource = insight.source ? 'rhythm-record' : 'manual-record';
    return true;
  }

  function loadLogConclusion(record) {
    state.rrConclusionPhases = clonePhases(record.phases);
    state.rrConclusionDuration = record.duration;
    state.rrConclusionMeta = record.date + ' · ' + record.time + ' · ' + record.duration;
    state.rrConclusionProgram = record.source || null;
    state.riConclusionSource = record.source ? 'rhythm-record' : 'manual-record';
  }

  function detailPage(kind) {
    var multi = kind === 'multi';
    var title = multi ? 'Your Rhythm Insight' : "This Session's Rhythm";
    var meta = state.rrConclusionMeta || (multi ? 'Built from 8 similar sessions' : 'Sep 8 · ' + (state.rrConclusionDuration || '18:20'));
    var source = conclusionSourceProgram();
    var phases = state.rrConclusionPhases || [
      { name: 'Stimulation', duration: '03:20', suction: '3', speed: '2', kind: 'stim' },
      { name: 'Expression', duration: '09:10', suction: '5', speed: '3', kind: 'expr' },
      { name: 'Mixed', duration: '05:50', suction: '4', speed: '2', kind: 'mix' }
    ];
    var back = state.rrReturn === 'logged' ? 'back-logged' : (state.rrReturn === 'log' ? 'back-log' : 'back-created');
    var pending = state.rrPendingProgram ? confirmProgram() : '';
    return '<section class="v4 rr-page rr-detail">' + v4Status() + pageHeader(title, back) + '<main><div class="rr-detail-meta ' + (source ? '' : 'no-source') + '">' + sourceLine(source) + '<small>' + meta + '</small></div><h2>Stable rhythm</h2><section class="rr-phase-list">' + phases.map(function (phase) {
      return phaseRow(phase.name, phase.duration, phase.suction, phase.speed, phase.kind);
    }).join('') + '</section><p class="rr-clean-note">Brief adjustments, pauses, and interruptions were excluded.</p><div class="rr-detail-actions"><button class="rr-detail-save" type="button" data-rr="open-save">Save to Customize</button><button class="rr-detail-run" type="button" data-rr="start-recorded" aria-label="Run this rhythm">' + icon('list-play.svg', 'Run') + '</button></div></main>' + saveSheet() + pending + '</section>';
  }

  function sourceDetailPage() {
    var program = state.rrSourceProgram || 'Milk Boost';
    var duration = program === 'Cozy Flow' ? '21:30' : '20:00';
    return '<section class="v4 rr-page rr-source-detail">' + v4Status() + pageHeader(program, 'back-source') + '<main><div class="rr-source-heading"><i class="rr-source-tag momcozy">Momcozy Original</i><small>Original rhythm · ' + duration + '</small></div><h2>' + escapeHTML(program) + '</h2><p class="rr-page-intro">Designed by Momcozy for a steady, guided pumping session.</p><section class="rr-phase-list">' +
      phaseRow('Stimulation','03:00','3','2','stim') +
      phaseRow('Expression','08:00','5','3','expr') +
      phaseRow('Stimulation','02:00','3','2','stim') +
      phaseRow('Expression', program === 'Cozy Flow' ? '08:30' : '07:00','5','3','expr') +
      '</section></main></section>';
  }

  function editPhaseRow(phase, index) {
    var options = ['Stimulation', 'Expression', 'Mixed'].map(function (name) {
      return '<option value="' + name + '" ' + (phase.name === name ? 'selected' : '') + '>' + name + '</option>';
    }).join('');
    return '<div class="rr-edit-phase" data-phase-index="' + index + '"><i class="' + phase.kind + '"></i><span class="rr-edit-index">' + String(index + 1).padStart(2, '0') + '</span><select aria-label="Phase ' + (index + 1) + ' mode">' + options + '</select><input type="text" inputmode="numeric" value="' + escapeHTML(phase.duration) + '" aria-label="Phase ' + (index + 1) + ' duration"></div>';
  }

  function deleteSheet() {
    if (!state.rrDeleteOpen) return '';
    return '<div class="v4-overlay rr-delete-overlay"><section class="rr-delete-sheet" role="alertdialog" aria-modal="true" aria-labelledby="rr-delete-title"><h2 id="rr-delete-title">Delete this rhythm?</h2><p>This action can\'t be undone.</p><button class="rr-delete-primary" type="button" data-rr="confirm-delete">Delete</button><button type="button" data-rr="cancel-delete">Cancel</button></section></div>';
  }

  function editPage() {
    var record = state.rrCreatedRecords.find(function (item) { return item.id === state.rrEditingId; });
    if (!record) {
      state.rrPanel = null;
      return programList();
    }
    var phases = state.rrEditDraft || record.phases;
    return '<section class="v4 rr-page rr-edit-page">' + v4Status() + '<header class="v4-top rr-page-header"><button class="v4-circle" type="button" data-rr="back-edit" aria-label="Back">' + icon('control-back.svg') + '</button><h1>Edit</h1><button class="rr-delete-action" type="button" data-rr="open-delete" aria-label="Delete ' + escapeHTML(record.name) + '"><span aria-hidden="true">Delete</span></button></header><main><p class="rr-edit-label">Run in Sequence</p><section class="rr-edit-phases">' + phases.map(editPhaseRow).join('') + '</section><button class="rr-add-phase" type="button" data-rr="add-phase"><b aria-hidden="true">+</b> Add Section</button><button class="rr-edit-save" type="button" data-rr="save-edit">Save</button></main>' + deleteSheet() + '</section>';
  }

  window.v4List = v4List = function () {
    if (state.rrPanel === 'session-detail') return detailPage('session');
    if (state.rrPanel === 'habit-detail') return detailPage('multi');
    if (state.rrPanel === 'source-detail') return sourceDetailPage();
    if (state.rrPanel === 'edit-rhythm') return editPage();
    return programList();
  };

  function phaseKind(name) {
    return name === 'Expression' ? 'expr' : name === 'Mixed' ? 'mix' : 'stim';
  }

  function durationSeconds(value) {
    var match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return 300;
    return Number(match[1]) * 60 + Math.min(59, Number(match[2]));
  }

  function collectEditPhases() {
    return Array.prototype.map.call(host.querySelectorAll('.rr-edit-phase'), function (row) {
      var name = row.querySelector('select').value;
      var duration = row.querySelector('input').value;
      var seconds = durationSeconds(duration);
      return { name: name, duration: formatDuration(seconds), seconds: seconds, suction: name === 'Expression' ? '5' : (name === 'Mixed' ? '4' : '3'), speed: name === 'Expression' ? '3' : '2', kind: phaseKind(name) };
    });
  }

  function currentSessionSummary(phases, source) {
    if (source) return source;
    var names = phases.map(function (phase) { return phase.name; });
    if (names.length <= 2) return names.join(' · ');
    return names.slice(0, 2).join(' · ') + ' · ' + (names.length - 2) + ' more';
  }

  function captureCurrentSessionLog() {
    if (state.rrCurrentLogCaptured) return;
    var source = state.riConclusionSource === 'rhythm-record' ? (state.rrConclusionProgram || state.selectedProgram || '') : '';
    var phases = clonePhases(state.rrConclusionPhases);
    if (!phases.length) {
      phases = [
        { name: 'Stimulation', duration: '03:20', seconds: 200, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '09:10', seconds: 550, suction: '5', speed: '3', kind: 'expr' },
        { name: 'Mixed', duration: '05:50', seconds: 350, suction: '4', speed: '2', kind: 'mix' }
      ];
    }
    state.rrSessionLogs.unshift({
      id: 'log-' + Date.now(),
      date: 'Today',
      time: 'Just now',
      duration: state.rrConclusionDuration || '18:20',
      device: 'Mobile Flow',
      note: source ? 'Program' : 'Manual',
      source: source,
      summary: currentSessionSummary(phases, source),
      parts: phases.map(function (phase) { return [phase.kind, phase.seconds || 1]; }),
      phases: phases
    });
    state.rrCurrentLogCaptured = true;
  }

  window.v4Logged = v4Logged = function () {
    var html = originalLogged.apply(this, arguments);
    if (!state.rrLoggedConclusion || state.riConclusionLevel !== 'L1') return html;
    var conclusion = '<button class="rr-logged-entry" type="button" data-rr="open-log-tab"><span>Session added to Record</span><b>View Record&nbsp; ›</b></button><button class="rr-logged-done" type="button" data-rr="done-logged">Done</button>';
    return html.replace('v4-logged', 'v4-logged rr-logged').replace('<i class="v4-home-indicator"></i>', conclusion + '<i class="v4-home-indicator"></i>');
  };

  function repaint() {
    if (typeof window.v4View === 'function') window.v4View();
  }

  function finishLogged() {
    state.modal = null;
    state.page = 'home';
    state.running = false;
    state.paused = false;
    state.selectedProgram = null;
    state.rrLoggedConclusion = false;
    state.rrReturn = null;
    repaint();
  }

  window.addEventListener('click', function (event) {
    var start = event.target.closest && event.target.closest('#demo [data-v4="start"]');
    if (start && !state.selectedProgram) beginManualRecording(state.mode || 'stimulation');

    var manualMode = event.target.closest && event.target.closest('#demo [data-v4="mode"],#demo [data-v4="manual"]');
    if (manualMode && !state.selectedProgram) recordManualMode(manualMode.dataset.mode || 'stimulation');

    var save = event.target.closest && event.target.closest('#demo [data-v4="save"]');
    if (save) captureCurrentSessionLog();
    if (save && state.riConclusionLevel === 'L1') {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.hasLogged = true;
      state.running = false;
      state.paused = false;
      state.modal = 'logged';
      state.rrLoggedConclusion = true;
      repaint();
      return;
    }

    var openList = event.target.closest && event.target.closest('#demo [data-v4="list"]');
    if (openList) {
      state.rrPanel = null;
      state.rrPendingProgram = null;
    }

    var action = event.target.closest && event.target.closest('#demo [data-rr]');
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    var name = action.dataset.rr;
    if (name === 'tab') {
      state.rrListTab = action.dataset.tab;
      state.rrPanel = null;
      state.rrExpandedCreated = null;
    }
    if (name === 'toggle-created') {
      state.rrExpandedCreated = state.rrExpandedCreated === action.dataset.createdId ? null : action.dataset.createdId;
    }
    if (name === 'edit-created') {
      var editRecord = state.rrCreatedRecords.find(function (item) { return item.id === action.dataset.createdId; });
      if (editRecord) {
        state.rrEditingId = editRecord.id;
        state.rrEditDraft = editRecord.phases.map(function (phase) { return Object.assign({}, phase); });
        state.rrDeleteOpen = false;
        state.rrPanel = 'edit-rhythm';
      }
    }
    if (name === 'back-edit') {
      state.rrPanel = null;
      state.rrDeleteOpen = false;
      state.rrEditDraft = null;
      state.rrListTab = 'created';
    }
    if (name === 'add-phase') {
      state.rrEditDraft = collectEditPhases();
      state.rrEditDraft.push({ name: 'Stimulation', duration: '05:00', seconds: 300, suction: '3', speed: '2', kind: 'stim' });
    }
    if (name === 'save-edit') {
      var updatedPhases = collectEditPhases();
      var updatedRecord = state.rrCreatedRecords.find(function (item) { return item.id === state.rrEditingId; });
      if (updatedRecord && updatedPhases.length) {
        updatedRecord.phases = updatedPhases;
        updatedRecord.duration = formatDuration(updatedPhases.reduce(function (total, phase) { return total + phase.seconds; }, 0));
        updatedRecord.parts = updatedPhases.map(function (phase) { return [phase.kind, phase.seconds]; });
      }
      state.rrPanel = null;
      state.rrEditDraft = null;
      state.rrListTab = 'created';
    }
    if (name === 'open-delete') state.rrDeleteOpen = true;
    if (name === 'cancel-delete') state.rrDeleteOpen = false;
    if (name === 'confirm-delete') {
      state.rrCreatedRecords = state.rrCreatedRecords.filter(function (item) { return item.id !== state.rrEditingId; });
      state.rrExpandedCreated = null;
      state.rrEditingId = null;
      state.rrEditDraft = null;
      state.rrDeleteOpen = false;
      state.rrPanel = null;
      state.rrListTab = 'created';
    }
    if (name === 'open-source') {
      state.rrSourceProgram = action.dataset.program;
      state.rrSourceReturn = state.rrPanel || 'created';
      state.rrPanel = 'source-detail';
    }
    if (name === 'review-habit') {
      if (loadInsightConclusion()) {
        state.rrPanel = 'habit-detail';
        state.rrListTab = 'log';
        state.rrReturn = 'log';
      }
    }
    if (name === 'open-log') {
      var logRecord = state.rrSessionLogs.find(function (item) { return item.id === action.dataset.logId; });
      if (logRecord) {
        loadLogConclusion(logRecord);
        state.rrActiveLogId = logRecord.id;
        state.rrPanel = 'session-detail';
        state.rrListTab = 'log';
        state.rrReturn = 'log';
      }
    }
    if (name === 'view-saved-insight') {
      state.rrPanel = null;
      state.rrListTab = 'created';
      state.rrExpandedCreated = state.rrInsightSavedId || null;
    }
    if (name === 'open-log-tab') {
      state.modal = null;
      state.page = 'list';
      state.rrPanel = null;
      state.rrListTab = 'log';
      state.rrReturn = null;
    }
    if (name === 'back-created') {
      state.rrPanel = null;
      state.rrListTab = 'created';
      state.rrReturn = null;
    }
    if (name === 'back-log') {
      state.rrPanel = null;
      state.rrListTab = 'log';
      state.rrReturn = null;
    }
    if (name === 'back-source') {
      state.rrPanel = state.rrSourceReturn === 'session-detail' || state.rrSourceReturn === 'habit-detail' ? state.rrSourceReturn : null;
      if (!state.rrPanel) state.rrListTab = 'created';
      state.rrSourceReturn = null;
    }
    if (name === 'back-logged') {
      state.page = 'control';
      state.modal = 'logged';
      state.rrPanel = null;
    }
    if (name === 'done-logged') {
      finishLogged();
      return;
    }
    if (name === 'start-program') state.rrPendingProgram = action.dataset.program;
    if (name === 'start-recorded') {
      state.rrPendingProgram = 'Recorded Rhythm';
      state.rrPendingPhases = clonePhases(state.rrConclusionPhases);
      state.rrPendingDuration = state.rrConclusionDuration || '18:20';
    }
    if (name === 'cancel-program') {
      state.rrPendingProgram = null;
      state.rrPendingPhases = null;
      state.rrPendingDuration = null;
    }
    if (name === 'confirm-program') {
      var pendingPhases = clonePhases(state.rrPendingPhases);
      var pendingDuration = state.rrPendingDuration;
      state.selectedProgram = state.rrPendingProgram;
      state.rrPendingProgram = null;
      state.rrPendingPhases = null;
      state.rrPendingDuration = null;
      state.page = 'control';
      state.modal = null;
      state.running = true;
      state.paused = false;
      state.auto = true;
      state.timer = 0;
      state.mode = 'stimulation';
      state.rhythmIndex = 0;
      state.rhythmSequence = pendingPhases.length ? pendingPhases.map(function (phase) { return phase.kind === 'expr' ? 'expression' : (phase.kind === 'mix' ? 'mixed' : 'stimulation'); }) : ['stimulation','expression','stimulation','expression'];
      state.rhythmDurations = pendingPhases.length ? pendingPhases.map(function (phase) { return phase.seconds || durationSeconds(phase.duration); }) : null;
      state.programTotal = pendingDuration || '20:00';
      state.riInterventionCount = 0;
      state.riConclusionLevel = null;
      state.rrConclusionProgram = state.selectedProgram;
      state.rrConclusionMeta = null;
      state.rrCurrentLogCaptured = false;
      state.rrManualRecording = false;
      state.rrManualTrace = [];
    }
    if (name === 'open-save') {
      state.rrSaveOpen = true;
      state.rrSaveKind = state.rrPanel;
      state.rrSaveSource = conclusionSourceProgram();
      state.rrSavePhases = state.rrConclusionPhases;
    }
    if (name === 'cancel-save') state.rrSaveOpen = false;
    if (name === 'confirm-save') {
      var savingInsight = state.rrSaveKind === 'habit-detail';
      var input = host.querySelector('#rr-rhythm-name');
      state.rrSavedName = input && input.value.trim() ? input.value.trim() : 'My Refined Rhythm';
      state.rrSavedSource = state.rrSaveSource || '';
      state.rrSavedDuration = state.rrConclusionDuration || '18:20';
      state.rrSavedParts = Array.isArray(state.rrSavePhases) ? state.rrSavePhases.map(function (phase) { return [phase.kind, phase.seconds || 1]; }) : [['stim',2],['expr',6],['mix',3]];
      var savedPhases = Array.isArray(state.rrSavePhases) && state.rrSavePhases.length ? state.rrSavePhases.map(function (phase) { return Object.assign({}, phase); }) : [
        { name: 'Stimulation', duration: '03:20', seconds: 200, suction: '3', speed: '2', kind: 'stim' },
        { name: 'Expression', duration: '09:10', seconds: 550, suction: '5', speed: '3', kind: 'expr' },
        { name: 'Mixed', duration: '05:50', seconds: 350, suction: '4', speed: '2', kind: 'mix' }
      ];
      var savedId = 'saved-' + Date.now();
      state.rrCreatedRecords.unshift({
        id: savedId, name: state.rrSavedName, duration: state.rrSavedDuration, description: state.rrSavedSource ? 'Shaped by your rhythm adjustments' : (savingInsight ? 'Created from your recurring sessions' : 'Recorded from a manual session'), source: state.rrSavedSource, parts: state.rrSavedParts, phases: savedPhases
      });
      if (savingInsight) {
        state.rrInsightStatus = 'saved';
        state.rrInsightSavedId = savedId;
      }
      state.rrSaveOpen = false;
      state.rrSaveKind = null;
      state.rrPanel = null;
      state.rrListTab = 'created';
      state.rrExpandedCreated = null;
      state.rrReturn = null;
      state.page = 'list';
      state.modal = null;
    }
    repaint();
  }, true);

  window.addEventListener('pointerdown', function (event) {
    var finish = event.target.closest && event.target.closest('#demo [data-v4="finish"]');
    if (!finish || state.selectedProgram || !state.rrManualRecording) return;
    clearTimeout(manualFinishTimer);
    manualFinishPointer = event.pointerId;
    manualFinishTimer = setTimeout(function () {
      manualFinishTimer = null;
      manualFinishPointer = null;
      finalizeManualRecording();
    }, 2000);
  }, true);

  function cancelManualFinish(event) {
    if (manualFinishPointer == null || event.pointerId !== manualFinishPointer) return;
    clearTimeout(manualFinishTimer);
    manualFinishTimer = null;
    manualFinishPointer = null;
  }

  window.addEventListener('pointerup', cancelManualFinish, true);
  window.addEventListener('pointercancel', cancelManualFinish, true);

  repaint();
}());
