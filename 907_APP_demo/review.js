(() => {
  const STORAGE_KEY = 'air2-v2-review';
  const params = new URLSearchParams(location.search);
  const notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  let selecting = false;
  let startPoint = null;
  let pendingRect = null;
  let selectionLayer = null;
  let draft = null;
  let rendering = false;

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'review-launcher';
  launcher.innerHTML = '<span aria-hidden="true">⌗</span> Review';
  launcher.setAttribute('aria-label', 'Open page review tools');

  const tools = document.createElement('aside');
  tools.className = 'review-tools';
  tools.hidden = params.get('review') !== '1';
  tools.innerHTML = `
    <div class="review-tools__head">
      <div><b>Page Review</b><small data-review-count></small></div>
      <button type="button" class="review-close" data-review="close" aria-label="Close review tools">×</button>
    </div>
    <button type="button" class="review-primary" data-review="mark">Mark an Area</button>
    <button type="button" data-review="copy">Copy Review JSON</button>
    <button type="button" data-review="export">Export JSON</button>
    <button type="button" data-review="clear">Clear Reviews</button>
    <p class="review-status" aria-live="polite">Drag over an area, then add your feedback.</p>
  `;

  const editor = document.createElement('section');
  editor.className = 'review-editor';
  editor.hidden = true;
  editor.innerHTML = `
    <b>Add Feedback</b>
    <textarea rows="4" placeholder="For example: Match this container height to Figma."></textarea>
    <div>
      <button type="button" data-editor="cancel">Cancel</button>
      <button type="button" class="review-editor__save" data-editor="save">Save Mark</button>
    </div>
  `;

  document.body.append(launcher, tools, editor);

  const status = tools.querySelector('.review-status');
  const count = tools.querySelector('[data-review-count]');
  const markButton = tools.querySelector('[data-review="mark"]');
  const textarea = editor.querySelector('textarea');

  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  const currentPage = () => typeof state === 'undefined' ? null : state.page;
  const currentModal = () => typeof state === 'undefined' ? null : state.modal;
  const matchesCurrentView = note => note.page === currentPage() && (note.modal || null) === (currentModal() || null);

  function setStatus(message) {
    status.textContent = message;
  }

  function refreshCount() {
    const visible = notes.filter(matchesCurrentView).length;
    count.textContent = `${notes.length} total · ${visible} on this page`;
  }

  function renderAnnotations() {
    if (rendering) return;
    rendering = true;
    observer.disconnect();
    root.querySelectorAll('.review-annotation').forEach(node => node.remove());

    notes.filter(matchesCurrentView).forEach((note, index) => {
      const annotation = document.createElement(note.width && note.height ? 'div' : 'i');
      annotation.className = note.width && note.height
        ? 'review-annotation review-box'
        : 'review-annotation review-pin';
      annotation.style.left = `${note.x}%`;
      annotation.style.top = `${note.y}%`;
      annotation.title = note.note || '';

      if (note.width && note.height) {
        annotation.style.width = `${note.width}%`;
        annotation.style.height = `${note.height}%`;
        annotation.innerHTML = `<span>${index + 1}</span>`;
      } else {
        annotation.textContent = index + 1;
      }
      root.append(annotation);
    });

    observer.observe(root, { childList: true });
    refreshCount();
    rendering = false;
  }

  function removeSelectionLayer() {
    selectionLayer?.remove();
    selectionLayer = null;
    draft = null;
    startPoint = null;
  }

  function finishSelectionMode({ keepEditor = false } = {}) {
    selecting = false;
    removeSelectionLayer();
    markButton.classList.remove('marking');
    markButton.textContent = 'Mark an Area';
    if (!keepEditor) {
      pendingRect = null;
      editor.hidden = true;
      textarea.value = '';
    }
  }

  function localPoint(event) {
    const box = root.getBoundingClientRect();
    return {
      x: Math.min(box.width, Math.max(0, event.clientX - box.left)),
      y: Math.min(box.height, Math.max(0, event.clientY - box.top)),
      width: box.width,
      height: box.height,
      left: box.left,
      top: box.top
    };
  }

  function updateDraft(point) {
    if (!startPoint || !draft) return;
    const left = Math.min(startPoint.x, point.x);
    const top = Math.min(startPoint.y, point.y);
    const width = Math.abs(point.x - startPoint.x);
    const height = Math.abs(point.y - startPoint.y);
    Object.assign(draft.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    });
  }

  function openEditor(point) {
    editor.hidden = false;
    const editorWidth = 316;
    const left = Math.min(window.innerWidth - editorWidth - 12, Math.max(12, point.left + point.x));
    const top = Math.min(window.innerHeight - 210, Math.max(12, point.top + point.y + 12));
    editor.style.left = `${left}px`;
    editor.style.top = `${top}px`;
    requestAnimationFrame(() => textarea.focus());
  }

  function startSelection() {
    finishSelectionMode();
    selecting = true;
    markButton.classList.add('marking');
    markButton.textContent = 'Selecting…';
    setStatus('Press and drag over the area you want to review.');

    selectionLayer = document.createElement('div');
    selectionLayer.className = 'review-selection-layer review-ui-in-root';
    selectionLayer.setAttribute('aria-label', 'Drag to select a review area');
    root.append(selectionLayer);

    selectionLayer.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      selectionLayer.setPointerCapture(event.pointerId);
      startPoint = localPoint(event);
      draft = document.createElement('div');
      draft.className = 'review-selection-draft';
      selectionLayer.append(draft);
      updateDraft(startPoint);
    });

    selectionLayer.addEventListener('pointermove', event => {
      if (!startPoint) return;
      event.preventDefault();
      updateDraft(localPoint(event));
    });

    selectionLayer.addEventListener('pointerup', event => {
      if (!startPoint) return;
      event.preventDefault();
      event.stopPropagation();
      const end = localPoint(event);
      const left = Math.min(startPoint.x, end.x);
      const top = Math.min(startPoint.y, end.y);
      const width = Math.abs(end.x - startPoint.x);
      const height = Math.abs(end.y - startPoint.y);
      if (width < 6 || height < 6) {
        draft?.remove();
        draft = null;
        startPoint = null;
        setStatus('The selected area is too small. Press and drag a larger area.');
        return;
      }

      pendingRect = {
        x: +(left / end.width * 100).toFixed(2),
        y: +(top / end.height * 100).toFixed(2),
        width: +(width / end.width * 100).toFixed(2),
        height: +(height / end.height * 100).toFixed(2)
      };
      openEditor({ ...end, x: left, y: top + height });
      setStatus('Add feedback and save. Cancel will discard this mark.');
    });
  }

  function savePendingNote() {
    const noteText = textarea.value.trim();
    if (!pendingRect || !noteText) {
      textarea.focus();
      setStatus('Add feedback before saving.');
      return;
    }

    const snapshot = typeof state === 'undefined' ? {} : {
      running: state.running,
      mode: state.mode,
      auto: state.auto,
      selectedProgram: state.selectedProgram
    };
    notes.push({
      kind: 'rect',
      page: currentPage(),
      modal: currentModal(),
      ...pendingRect,
      note: noteText,
      state: snapshot,
      viewport: { width: Math.round(root.clientWidth), height: Math.round(root.clientHeight) },
      createdAt: new Date().toISOString()
    });
    persist();
    finishSelectionMode();
    renderAnnotations();
    setStatus('Mark saved. You can add another or copy/export the JSON.');
  }

  async function copyNotes() {
    const json = JSON.stringify(notes, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setStatus('Review JSON copied to the clipboard.');
    } catch (_) {
      const helper = document.createElement('textarea');
      helper.value = json;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.append(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      setStatus('Review JSON copied to the clipboard.');
    }
  }

  const observer = new MutationObserver(records => {
    if (rendering) return;
    const appChanged = records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => {
      return node.nodeType !== Node.ELEMENT_NODE || !node.classList.contains('review-ui-in-root');
    }));
    if (!appChanged) return;
    if (selecting) {
      finishSelectionMode();
      setStatus('The page changed. Select the area again.');
    }
    renderAnnotations();
  });

  launcher.addEventListener('click', () => {
    tools.hidden = !tools.hidden;
    launcher.classList.toggle('active', !tools.hidden);
    if (!tools.hidden) refreshCount();
  });

  tools.addEventListener('click', event => {
    const action = event.target.closest('[data-review]')?.dataset.review;
    if (!action) return;
    if (action === 'mark') selecting ? finishSelectionMode() : startSelection();
    if (action === 'copy') copyNotes();
    if (action === 'export') {
      const url = URL.createObjectURL(new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'air2-review-notes.json';
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Exported air2-review-notes.json.');
    }
    if (action === 'clear' && confirm('Clear all saved reviews?')) {
      notes.length = 0;
      persist();
      finishSelectionMode();
      renderAnnotations();
      setStatus('All reviews cleared.');
    }
    if (action === 'close') {
      finishSelectionMode();
      tools.hidden = true;
      launcher.classList.remove('active');
    }
  });

  editor.addEventListener('click', event => {
    const action = event.target.closest('[data-editor]')?.dataset.editor;
    if (action === 'save') savePendingNote();
    if (action === 'cancel') {
      finishSelectionMode();
      setStatus('Mark canceled.');
    }
  });

  textarea.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') savePendingNote();
    if (event.key === 'Escape') {
      finishSelectionMode();
      setStatus('Mark canceled.');
    }
  });

  observer.observe(root, { childList: true });
  launcher.classList.toggle('active', !tools.hidden);
  renderAnnotations();
})();
