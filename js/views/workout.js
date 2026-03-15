// ============================================================
// WORKOUT VIEW
// ============================================================

import { createWorkoutLog, createExerciseLog, createSetLog, workoutTotalVolume, workoutPRCount } from '../models.js';
import { StatsEngine } from '../statsEngine.js';
import { DataManager } from '../dataManager.js';
import { showToast, openModal, closeModal, setKeyboardHideCallback, clearKeyboardHideCallback } from '../app.js';
import { emptyState } from './home.js';

// ============================================================
// CYCLE/WEEK CALCULATION
// ============================================================

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.getTime();
}

function calcCycleWeek(templateId, workouts, workoutId) {
  if (!templateId) return null;
  // All workouts for this template sorted ascending by date
  const all = workouts
    .filter(w => w.templateId === templateId)
    .sort((a, b) => a.date - b.date);
  if (!all.length) return 1;
  const idx = workoutId ? all.findIndex(w => w.id === workoutId) : all.length;
  return (idx < 0 ? all.length : idx) + 1;
}

// ============================================================
// LIST VIEW
// ============================================================

export function renderWorkouts(state) {
  const el = document.getElementById('page-workouts');
  const sorted = [...state.workouts].sort((a, b) => b.date - a.date);

  el.innerHTML = `
    <div class="page-header"><h1>Entrenamientos</h1></div>
    <div id="workout-list">
      ${sorted.length
        ? sorted.map(w => workoutRowHTML(w, state)).join('')
        : emptyState('🏋️', 'Sin entrenamientos', 'Pulsa + para registrar tu primer entreno')}
    </div>
  `;

  el.querySelectorAll('.workout-row[data-id]').forEach(row => {
    row.addEventListener('click', () => openWorkoutEditor(state, row.dataset.id));
  });
}

function workoutRowHTML(w, state) {
  const vol = Math.round(workoutTotalVolume(w));
  const prs = workoutPRCount(w);
  const isDraft = w.status === 'draft';
  const week = w.templateId ? calcCycleWeek(w.templateId, state.workouts, w.id) : null;
  const dateStr = new Date(w.date).toLocaleDateString('es-ES', { day:'numeric', month:'short' });
  return `<div class="workout-row" data-id="${w.id}">
    <div class="wr-left">
      <div class="wr-name-row">
        <span class="wr-name">${w.templateName || w.name}</span>
        ${isDraft ? '<span class="draft-badge">En progreso</span>' : ''}
      </div>
      <div class="wr-sub-row">
        <span class="wr-date">${dateStr}</span>
        ${week ? `<span class="wr-week-badge">Sem. ${week}</span>` : ''}
        ${w.sessionName ? `<span class="wr-session">${w.sessionName}</span>` : ''}
      </div>
      <div class="wr-meta">${w.exercises.length} ejercicios</div>
    </div>
    <div class="wr-right">
      <div class="wr-vol">${vol} kg</div>
      ${prs > 0 ? `<div class="wr-prs">🏆 ${prs}</div>` : ''}
    </div>
  </div>`;
}

// ============================================================
// FAB → CREATE WORKOUT
// ============================================================

export function openNewWorkout(state) {
  openModal(pickerHTML(state.templates));
  bindPicker(state);
}

function pickerHTML(templates) {
  return `<div class="modal-overlay">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>Nuevo entreno</h2>
        <button class="modal-close" id="close-picker">✕</button>
      </div>
      <div class="section-title" style="margin-top:0">Desde template</div>
      ${templates.map(t => `
        <div class="template-row picker-template" data-tid="${t.id}" style="cursor:pointer;flex-direction:column;align-items:flex-start">
          <div class="tr-name">${t.name} ${t.isDefault ? '<span class="default-badge">Default</span>' : ''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
            ${t.sessions.map(s => `
              <button class="session-pill picker-session" data-tid="${t.id}" data-sid="${s.id}" data-tname="${t.name}" data-sname="${s.name}">
                ${s.name}
              </button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="section-title">Entreno libre</div>
      <div class="template-row picker-free" style="cursor:pointer">
        <div class="tr-name" style="color:var(--accent)">+ Sin template</div>
      </div>
    </div>
  </div>`;
}

function bindPicker(state) {
  const c = document.getElementById('modal-container');
  c.querySelector('#close-picker')?.addEventListener('click', closeModal);

  c.querySelectorAll('.picker-session').forEach(btn => {
    btn.addEventListener('click', () => {
      const { tid, sid, tname, sname } = btn.dataset;
      const tmpl = state.templates.find(t => t.id === tid);
      const session = tmpl?.sessions.find(s => s.id === sid);
      closeModal();
      createAndOpenWorkout(state, { templateId: tid, templateName: tname, sessionId: sid, sessionName: sname, exercises: session?.exercises || [], template: tmpl });
    });
  });

  c.querySelector('.picker-free')?.addEventListener('click', () => {
    closeModal();
    createAndOpenWorkout(state, {});
  });
}

function createAndOpenWorkout(state, { templateId = null, templateName = null, sessionId = null, sessionName = null, exercises = [], template = null }) {
  const name = templateId ? `${templateName} – ${sessionName}` : '';
  const workout = createWorkoutLog({ name, templateId, templateName, sessionId, sessionName });
  workout.exercises = exercises.map(n => createExerciseLog(n));
  state.workouts = DataManager.addWorkout(state.workouts, workout);
  renderWorkouts(state);
  setTimeout(() => openWorkoutEditor(state, workout.id, template), 50);
}

// ============================================================
// WORKOUT EDITOR (full screen, no modal)
// ============================================================

export function openWorkoutEditor(state, id, templateOverride) {
  const workout = state.workouts.find(w => w.id === id);
  if (!workout) return;

  const template = templateOverride || (workout.templateId
    ? state.templates.find(t => t.id === workout.templateId)
    : null);

  document.getElementById('tabbar').style.display = 'none';
  document.getElementById('fab').style.display = 'none';

  const el = document.getElementById('page-workouts');
  el.innerHTML = workoutEditorHTML(workout, state, template);
  bindEditor(el, state, workout, template);
}

function workoutEditorHTML(w, state, template) {
  const isDraft = w.status === 'draft';
  const week = w.templateId ? calcCycleWeek(w.templateId, state.workouts, w.id) : null;
  const sessions = template?.sessions || [];

  const d = new Date(w.date);
  const dateVal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `
    <div class="editor-header">
      <button class="back-btn" id="editor-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="editor-header-center">
        <div class="editor-title-row">
          <input class="editor-name-input" id="editor-name" value="${w.templateName || w.name}" placeholder="Nombre del entreno">
          ${week ? `<span class="editor-week-badge">Sem. ${week}</span>` : ''}
        </div>
        <input class="editor-date-input" id="editor-date" type="date" value="${dateVal}" data-dirty="false">
      </div>
      <button class="editor-save-btn" id="editor-save">${isDraft ? 'Finalizar' : 'Guardar'}</button>
    </div>

    ${sessions.length > 1 ? `
      <div class="session-seg-row" id="session-seg">
        ${sessions.map(s => `
          <button class="session-seg-btn ${s.id === w.sessionId ? 'active' : ''}"
            data-sid="${s.id}" data-sname="${s.name}">
            ${s.name}
          </button>`).join('')}
      </div>` : ''}

    <div id="editor-exercises">
      ${w.exercises.map((ex, ei) => exerciseSectionHTML(ex, ei, state.workouts)).join('')}
    </div>

    <div class="add-ex-row" style="margin-top:4px">
      <input class="form-input" id="new-ex-input" placeholder="Añadir ejercicio" type="text">
      <button class="btn-add-ex" id="add-ex-btn">+</button>
    </div>

    <div class="form-group" style="margin-top:8px">
      <label class="form-label">Notas</label>
      <textarea class="form-input" id="editor-notes" rows="2" placeholder="Notas opcionales...">${w.notes || ''}</textarea>
    </div>

    ${!isDraft ? `<button class="btn btn-danger" id="delete-workout-btn">Borrar entreno</button>` : ''}
  `;
}

// ============================================================
// EXERCISE & SET HTML
// ============================================================

function lastSessionSets(exName, allWorkouts) {
  // Find the most recent DONE workout containing this exercise
  const past = allWorkouts
    .filter(w => w.status === 'done' && w.exercises.some(e => e.name === exName))
    .sort((a, b) => b.date - a.date);
  if (!past.length) return [];
  return past[0].exercises.find(e => e.name === exName)?.sets || [];
}

function exerciseSectionHTML(ex, ei, allWorkouts) {
  const plateau = StatsEngine.detectPlateau(ex.name, allWorkouts);
  const prevSets = lastSessionSets(ex.name, allWorkouts);
  return `<div class="exercise-section" data-ei="${ei}">
    <div class="exercise-header">
      <span class="ex-title">${ex.name}</span>
      <div class="ex-meta">
        ${plateau ? '<span style="font-size:10px;color:var(--red);font-weight:600">⚠️ Plateau</span>' : ''}
            ${prevSets.length ? `<button class="btn-eye-ex dim" data-ei="${ei}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>` : ''}
        <button class="btn-collapse-ex" data-ei="${ei}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
      </div>
    </div>
    ${prevSets.length ? `
    <div class="exercise-prev hidden" data-ei="${ei}">
      <div class="sets-grid">
        ${prevSets.map(s => `
          <div class="set-card set-card-prev">
            <div class="set-card-weight-row">
              <span class="set-card-weight-prev">${s.weight || '–'}</span>
            </div>
            <div class="set-card-divider"></div>
            <div class="set-card-bottom">
              <div class="set-card-reps-side">
                <span class="set-card-x">x</span>
                <span class="set-card-reps-prev">${s.reps || '–'}</span>
              </div>
              <div class="set-card-badges-side">
                ${s.isPR ? '<span class="badge-pr">🏆</span>' : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}
    <div class="exercise-body" data-ei="${ei}">
      <div class="sets-grid">
        ${ex.sets.map((s, si) => setCardHTML(ex, ei, si, s, allWorkouts)).join('')}
        <button class="set-add-card" data-ei="${ei}">＋</button>
      </div>
    </div>
  </div>`;
}

function setCardHTML(ex, ei, si, set, allWorkouts) {
  const w = parseFloat(set.weight) || 0;
  const r = parseInt(set.reps) || 0;
  const isPR = w && r && StatsEngine.isNewPR(w, r, ex.name, allWorkouts);
  const isImp = w && r && StatsEngine.isImprovement(w, r, ex.name, allWorkouts);
  const hasBadge = isPR || isImp;

  return `<div class="set-card" data-ei="${ei}" data-si="${si}">
    <div class="set-card-weight-row">
      <input class="set-card-weight" type="number" inputmode="decimal"
        placeholder="–" value="${set.weight}"
        data-field="weight" data-ei="${ei}" data-si="${si}">
    </div>
    <div class="set-card-divider"></div>
    <div class="set-card-bottom">
      <div class="set-card-reps-side">
        <span class="set-card-x">x</span>
        <input class="set-card-reps" type="number" inputmode="numeric"
          placeholder="–" value="${set.reps}"
          data-field="reps" data-ei="${ei}" data-si="${si}">
      </div>
      <div class="set-card-badges-side">
        <span class="badge-pr ${isPR ? '' : 'hidden'}">🏆</span>
        <span class="badge-imp ${isImp ? '' : 'hidden'}">↑</span>
      </div>
    </div>
  </div>`;
}

// ============================================================
// BIND EDITOR
// ============================================================

function bindEditor(el, state, workoutRef, template) {
  function getWorkout() { return state.workouts.find(w => w.id === workoutRef.id); }

  function refresh() {
    const w = getWorkout();
    document.getElementById('editor-exercises').innerHTML =
      w.exercises.map((ex, ei) => exerciseSectionHTML(ex, ei, state.workouts)).join('');
    bindSetInputs();
    bindExerciseButtons();
  }

  function saveToState() {
    const w = getWorkout();
    const name = document.getElementById('editor-name')?.value.trim();
    const notes = document.getElementById('editor-notes')?.value.trim();
    if (name) w.name = name;
    w.notes = notes || '';
    const dateEl = document.getElementById('editor-date');
    if (dateEl?.value && dateEl.dataset.dirty === 'true') {
      // Parse local date without timezone shift
      const [year, month, day] = dateEl.value.split('-').map(Number);
      const existing = new Date(w.date);
      const nd = new Date(year, month - 1, day,
        existing.getHours(), existing.getMinutes(), existing.getSeconds());
      w.date = nd.getTime();
    }
    state.workouts = DataManager.updateWorkout(state.workouts, w);
  }

  setKeyboardHideCallback(() => saveToState());

  function leaveEditor() {
    clearKeyboardHideCallback();
    document.getElementById('tabbar').style.display = 'flex';
    document.getElementById('fab').style.display = 'flex';
  }

  // Session segmented control
  el.querySelectorAll('.session-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveToState();
      const w = getWorkout();
      const sid = btn.dataset.sid;
      const sname = btn.dataset.sname;
      const session = template?.sessions.find(s => s.id === sid);

      // Save current session's exercises before switching
      if (!w._sessionExercises) w._sessionExercises = {};
      w._sessionExercises[w.sessionId] = w.exercises;

      // Restore exercises for the new session if previously visited, else init fresh
      if (w._sessionExercises[sid]) {
        w.exercises = w._sessionExercises[sid];
      } else if (session) {
        w.exercises = session.exercises.map(n => createExerciseLog(n));
      }

      w.sessionId = sid;
      w.sessionName = sname;
      w.name = `${w.templateName} – ${sname}`;
      state.workouts = DataManager.updateWorkout(state.workouts, w);

      // Re-render editor with new session selected
      el.innerHTML = workoutEditorHTML(w, state, template);
      bindEditor(el, state, w, template);
    });
  });

  // Date — mark dirty only on user change
  el.querySelector('#editor-date')?.addEventListener('change', (e) => {
    e.target.dataset.dirty = 'true';
    saveToState();
  });

  // Back
  el.querySelector('#editor-back')?.addEventListener('click', () => {
    saveToState();
    leaveEditor();
    renderWorkouts(state);
  });

  // Save / Finish
  el.querySelector('#editor-save')?.addEventListener('click', () => {
    saveToState();
    const w = getWorkout();
    w.exercises = w.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.filter(s => s.weight || s.reps).map(s => ({
        ...s,
        isPR: s.weight && s.reps && StatsEngine.isNewPR(parseFloat(s.weight), parseInt(s.reps), ex.name, state.workouts.filter(x => x.id !== w.id)),
        isImprovement: s.weight && s.reps && StatsEngine.isImprovement(parseFloat(s.weight), parseInt(s.reps), ex.name, state.workouts.filter(x => x.id !== w.id))
      }))
    })).filter(ex => ex.sets.length > 0);
    w.status = 'done';
    state.workouts = DataManager.updateWorkout(state.workouts, w);
    leaveEditor();
    renderWorkouts(state);
    showToast('✅ Entreno guardado');
  });

  // Add exercise
  el.querySelector('#add-ex-btn')?.addEventListener('click', () => {
    const inp = el.querySelector('#new-ex-input');
    const name = inp.value.trim(); if (!name) return;
    const w = getWorkout();
    w.exercises.push(createExerciseLog(name));
    state.workouts = DataManager.updateWorkout(state.workouts, w);
    inp.value = '';
    refresh();
  });

  el.querySelector('#new-ex-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') el.querySelector('#add-ex-btn').click();
  });

  // Delete — modal de confirmación
  el.querySelector('#delete-workout-btn')?.addEventListener('click', () => {
    openModal(`
      <div class="modal-overlay">
        <div class="modal-sheet" style="padding:24px 20px 20px;text-align:center">
          <div style="font-size:32px;margin-bottom:12px">🗑️</div>
          <div style="font-size:17px;font-weight:700;margin-bottom:8px">Borrar entreno</div>
          <div style="font-size:14px;color:var(--text2);margin-bottom:24px">Esta acción no se puede deshacer.</div>
          <button id="modal-confirm-delete" style="width:100%;padding:14px;background:var(--red);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:10px">Borrar</button>
          <button id="modal-cancel-delete" style="width:100%;padding:14px;background:var(--bg3);color:var(--text);border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
        </div>
      </div>
    `);
    document.getElementById('modal-confirm-delete')?.addEventListener('click', () => {
      closeModal();
      state.workouts = DataManager.deleteWorkout(state.workouts, workoutRef.id);
      leaveEditor();
      renderWorkouts(state);
      showToast('Entreno borrado');
    });
    document.getElementById('modal-cancel-delete')?.addEventListener('click', closeModal);
  });

  bindSetInputs();
  bindExerciseButtons();

  function bindSetInputs() {
    el.querySelectorAll('.set-card-weight, .set-card-reps').forEach(inp => {
      inp.addEventListener('input', () => {
        const ei = parseInt(inp.dataset.ei), si = parseInt(inp.dataset.si);
        const w = getWorkout();
        w.exercises[ei].sets[si][inp.dataset.field] = inp.value;
        state.workouts = DataManager.updateWorkout(state.workouts, w);
        const s = w.exercises[ei].sets[si];
        const exName = w.exercises[ei].name;
        const others = state.workouts.filter(x => x.id !== w.id);
        const wv = parseFloat(s.weight) || 0, rv = parseInt(s.reps) || 0;
        const isPR = wv && rv && StatsEngine.isNewPR(wv, rv, exName, others);
        const isImp = wv && rv && StatsEngine.isImprovement(wv, rv, exName, others);
        const card = inp.closest('.set-card');
        card?.querySelector('.badge-pr')?.classList.toggle('hidden', !isPR);
        card?.querySelector('.badge-imp')?.classList.toggle('hidden', !isImp);
      });
    });

    // Long press to delete set card
    el.querySelectorAll('.set-card').forEach(card => {
      let pressTimer = null;
      const startPress = (e) => {
        pressTimer = setTimeout(() => {
          pressTimer = null;
          const ei = parseInt(card.dataset.ei), si = parseInt(card.dataset.si);
          // Show context menu
          showSetContextMenu(card, ei, si);
        }, 500);
      };
      const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      card.addEventListener('touchstart', startPress, { passive: true });
      card.addEventListener('touchend', cancelPress);
      card.addEventListener('touchmove', cancelPress);
      card.addEventListener('mousedown', startPress);
      card.addEventListener('mouseup', cancelPress);
      card.addEventListener('mouseleave', cancelPress);
    });
  }

  function showSetContextMenu(card, ei, si) {
    // Remove any existing menu
    document.querySelector('.set-context-menu')?.remove();
    const menu = document.createElement('div');
    menu.className = 'set-context-menu';
    menu.innerHTML = `<button class="set-ctx-delete">Borrar serie</button>`;
    document.body.appendChild(menu);

    // Position near card
    const rect = card.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    menu.style.left = (rect.left + window.scrollX) + 'px';

    // Haptic feedback if available
    navigator.vibrate?.(30);

    menu.querySelector('.set-ctx-delete').addEventListener('click', () => {
      menu.remove();
      if (!confirm('¿Borrar esta serie?')) return;
      const w = getWorkout();
      w.exercises[ei].sets.splice(si, 1);
      state.workouts = DataManager.updateWorkout(state.workouts, w);
      refresh();
    });

    // Close on outside tap
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 10);
  }

  function bindExerciseButtons() {
    el.querySelectorAll('.btn-remove-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = getWorkout();
        w.exercises.splice(parseInt(btn.dataset.ei), 1);
        state.workouts = DataManager.updateWorkout(state.workouts, w);
        refresh();
      });
    });

    el.querySelectorAll('.set-add-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const ei = parseInt(btn.dataset.ei);
        const w = getWorkout();
        const last = w.exercises[ei].sets.slice(-1)[0];
        w.exercises[ei].sets.push(createSetLog({ weight: last?.weight || '', reps: last?.reps || '' }));
        state.workouts = DataManager.updateWorkout(state.workouts, w);
        refresh();
      });
    });

    // Collapse/expand
    el.querySelectorAll('.btn-collapse-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        const ei = btn.dataset.ei;
        const body = el.querySelector(`.exercise-body[data-ei="${ei}"]`);
        const isCollapsed = body.classList.toggle('hidden');
        btn.classList.toggle('collapsed', isCollapsed);
        if (isCollapsed) {
          el.querySelector(`.exercise-prev[data-ei="${ei}"]`)?.classList.add('hidden');
          const eyeBtn = el.querySelector(`.btn-eye-ex[data-ei="${ei}"]`);
          if (eyeBtn) eyeBtn.classList.add('dim');
        }
      });
    });

    // Eye toggle — show/hide previous session (hidden by default)
    el.querySelectorAll('.btn-eye-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        const ei = btn.dataset.ei;
        const prev = el.querySelector(`.exercise-prev[data-ei="${ei}"]`);
        if (!prev) return;
        const isHidden = prev.classList.toggle('hidden');
        btn.classList.toggle('dim', isHidden);
      });
    });
  }
}
