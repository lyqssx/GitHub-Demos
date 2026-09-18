/* Figma-backed level control with mode-specific ranges. */
(function () {
  var drag = null;
  var TRAVEL = 134;

  function maximum() {
    return state.mode === 'stimulation' ? 5 : 15;
  }

  function clamp(value, max) {
    return Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
  }

  function tickMarkup(max) {
    return Array.from({ length: max + 1 }, function () { return '<i></i>'; }).join('');
  }

  function position(value, max) {
    return max ? Math.round((max - value) / max * TRAVEL) : TRAVEL;
  }

  function sideMarkup(side, value, max) {
    var label = side === 'l' ? 'L' : 'R';
    return '<section class="v57-side">' +
      '<div class="v57-side-label">' + label + '</div>' +
      '<button class="v57-track" type="button" data-v57-level="' + side + '" role="slider" aria-label="' +
        (label === 'L' ? 'Left' : 'Right') + ' suction level" aria-valuemin="0" aria-valuemax="' + max +
        '" aria-valuenow="' + value + '">' +
        '<span class="v57-ticks" aria-hidden="true">' + tickMarkup(max) + '</span>' +
        '<span class="v57-value" style="--v57-top:' + position(value, max) + 'px">' + value + '</span>' +
      '</button>' +
    '</section>';
  }

  function speedMarkup() {
    return '<section class="v4-speed"><h2>Speed</h2><div class="v4-speed-list">' +
      [1, 2, 3, 4, 5].map(function (number) {
        return '<button data-v4="speed" data-speed="' + number + '" class="' +
          (state.speed === number ? 'active' : '') + '">' + number + '</button>';
      }).join('') + '</div></section>';
  }

  window.v4Controls = function () {
    var max = maximum();
    state.levelL = clamp(state.levelL, max);
    state.levelR = clamp(state.levelR, max);
    return '<section class="v4-levels v57-levels ' + (max === 5 ? 'is-stimulation' : 'is-expression') + '">' +
      '<header class="v57-level-head"><img src="./assets/figma-level-v57/gauge.svg?v=2" alt="">' +
        'Level <span>0~' + max + '</span></header>' +
      '<div class="v57-level-body">' +
        sideMarkup('l', state.levelL, max) +
        '<section class="v57-both">' +
          '<div class="v57-both-label"><img src="./assets/figma-level-v57/link.svg?v=2" alt="">Both</div>' +
          '<button class="v57-both-track" type="button" data-v57-both role="slider" aria-label="Adjust both suction levels" aria-valuemin="-' + max + '" aria-valuemax="' + max + '" aria-valuenow="0">' +
            '<span class="v57-both-lines" aria-hidden="true">' +
              '<i style="--line-width:32px"></i><i style="--line-width:24px"></i><i style="--line-width:18px"></i>' +
              '<i style="--line-width:12px"></i><i style="--line-width:14px"></i><i style="--line-width:8px"></i>' +
              '<i style="--line-width:4px"></i>' +
            '</span>' +
            '<span class="v57-both-knob"><img src="./assets/figma-level-v57/both-adjust.svg?v=2" alt=""></span>' +
          '</button>' +
        '</section>' +
        sideMarkup('r', state.levelR, max) +
      '</div>' +
    '</section>' + speedMarkup();
  };

  function updateRailDom(side) {
    var max = maximum();
    var key = side === 'r' ? 'levelR' : 'levelL';
    var rail = document.querySelector('#demo [data-v57-level="' + side + '"]');
    if (!rail) return;
    var value = clamp(state[key], max);
    var pill = rail.querySelector('.v57-value');
    rail.setAttribute('aria-valuemax', String(max));
    rail.setAttribute('aria-valuenow', String(value));
    if (pill) {
      pill.textContent = String(value);
      pill.style.setProperty('--v57-top', position(value, max) + 'px');
    }
  }

  function renderValues() {
    updateRailDom('l');
    updateRailDom('r');
  }

  function setRailFromPointer(event) {
    if (!drag || drag.kind !== 'rail' || event.pointerId !== drag.id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var rect = drag.element.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (event.clientY - rect.top - 18) / TRAVEL));
    state[drag.key] = clamp((1 - ratio) * drag.max, drag.max);
    updateRailDom(drag.side);
  }

  function setBothDelta(delta) {
    if (!drag || drag.kind !== 'both') return;
    delta = Math.max(-3, Math.min(3, delta));
    if (delta === drag.delta) return;
    drag.delta = delta;
    state.levelL = clamp(drag.baseL + delta, drag.max);
    state.levelR = clamp(drag.baseR + delta, drag.max);
    drag.element.setAttribute('aria-valuenow', String(delta));
    var knob = drag.element.querySelector('.v57-both-knob');
    if (knob) knob.style.transform = 'translateY(' + (-delta * 15) + 'px)';
    renderValues();
  }

  function setBothFromPointer(event) {
    if (!drag || drag.kind !== 'both' || event.pointerId !== drag.id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var distance = drag.startY - event.clientY;
    var delta = distance === 0 ? 0 : Math.sign(distance) * Math.min(3, Math.floor(Math.abs(distance) / 18));
    setBothDelta(delta);
  }

  window.addEventListener('pointerdown', function (event) {
    if (document.body.classList.contains('review-static')) return;
    var rail = event.target.closest && event.target.closest('#demo [data-v57-level]');
    var both = event.target.closest && event.target.closest('#demo [data-v57-both]');
    if (!rail && !both) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var max = maximum();
    var element = rail || both;
    element.classList.add('is-dragging');
    element.setPointerCapture && element.setPointerCapture(event.pointerId);
    if (rail) {
      var side = rail.dataset.v57Level;
      drag = { kind: 'rail', id: event.pointerId, element: rail, side: side,
        key: side === 'r' ? 'levelR' : 'levelL', max: max };
      setRailFromPointer(event);
    } else {
      drag = { kind: 'both', id: event.pointerId, element: both, startY: event.clientY,
        baseL: clamp(state.levelL, max), baseR: clamp(state.levelR, max), max: max, delta: 0, moved: false };
    }
  }, true);

  window.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.kind === 'rail') setRailFromPointer(event);
    else {
      if (Math.abs(drag.startY - event.clientY) > 4) drag.moved = true;
      setBothFromPointer(event);
    }
  }, true);

  function release(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    var active = drag;
    if (active.kind === 'both' && !active.moved && event) {
      var rect = active.element.getBoundingClientRect();
      setBothDelta(event.clientY < rect.top + rect.height / 2 ? 1 : -1);
    }
    active.element.classList.remove('is-dragging');
    if (active.kind === 'both') {
      var knob = active.element.querySelector('.v57-both-knob');
      if (knob) knob.style.transform = '';
      active.element.setAttribute('aria-valuenow', '0');
    }
    drag = null;
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (typeof v4View === 'function') v4View();
  }

  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);

  window.addEventListener('keydown', function (event) {
    var rail = event.target.closest && event.target.closest('#demo [data-v57-level]');
    var both = event.target.closest && event.target.closest('#demo [data-v57-both]');
    if (!rail && !both) return;
    var direction = (event.key === 'ArrowUp' || event.key === 'ArrowRight') ? 1 :
      (event.key === 'ArrowDown' || event.key === 'ArrowLeft') ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var max = maximum();
    if (rail) {
      var side = rail.dataset.v57Level;
      var key = side === 'r' ? 'levelR' : 'levelL';
      state[key] = clamp(state[key] + direction, max);
    } else {
      state.levelL = clamp(state.levelL + direction, max);
      state.levelR = clamp(state.levelR + direction, max);
    }
    if (typeof v4View === 'function') v4View();
  }, true);
})();
