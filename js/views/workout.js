// ============================================================
// WORKOUT VIEW
// ============================================================

import { createWorkoutLog, createExerciseLog, createSetLog, workoutTotalVolume, workoutPRCount } from '../models.js';
import { StatsEngine } from '../statsEngine.js';
import { DataManager } from '../dataManager.js';
import { showToast, openModal, closeModal } from '../app.js';
import { emptyState } from './home.js';

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
        ? sorted.map(w => workoutRowHTML(w)).join('')
        : emptyState('🏋️', 'Sin entrenamientos', 'Pulsa + para registrar tu primer entreno')}
    </div>
  `;

  el.querySelectorAll('.workout-row[data-id]').forEach(row => {
    row.addEventListener('click', () => openWorkoutEditor(state, row.dataset.id));
  });
}

function workoutRowHTML(w) {
  const vol = Math.round(workoutTotalVolume(w));
  const prs = workoutPRCount(w);
  const isDraft = w.status === 'draft';
  return `<div class="workout-row" data-id="${w.id}">
    <div>
      <div class="wr-name">
        ${w.name}
        ${isDraft ? '<span class="draft-badge">En progreso</span>' : ''}
      </div>
      <div class="wr-meta">
        ${new Date(w.date).toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' })}
        ${w.sessionName ? ` · ${w.sessionName}` : ''}
        · ${w.exercises.length} ejercicios
      </div>
    </div>
    <div class="wr-right">
      <div class="wr-vol">${vol} kg</div>
      ${prs > 0 ? `<div class="wr-prs">🏆 ${prs} PR${prs > 1 ? 's' : ''}</div>` : ''}
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
      createAndOpenWorkout(state, { templateId: tid, templateName: tname, sessionId: sid, sessionName: sname, exercises: session?.exercises || [] });
    });
  });

  c.querySelector('.picker-free')?.addEventListener('click', () => {
    closeModal();
    createAndOpenWorkout(state, {});
  });
}

function createAndOpenWorkout(state, { templateId = null, templateName = null, sessionId = null, sessionName = null, exercises = [] }) {
  const name = templateId ? `${templateName} – ${sessionName}` : '';
  const workout = createWorkoutLog({ name, templateId, templateName, sessionId, sessionName });
  workout.exercises = exercises.map(n => createExerciseLog(n));
  state.workouts = DataManager.addWorkout(state.workouts, workout);
  renderWorkouts(state);
  setTimeout(() => openWorkoutEditor(state, workout.id), 50);
}

// ============================================================
// WORKOUT EDITOR (full screen, no modal)
// ============================================================

export function openWorkoutEditor(state, id) {
  const workout = state.workouts.find(w => w.id === id);
  if (!workout) return;

  // Hide tabbar and FAB
  document.getElementById('tabbar').style.display = 'none';
  document.getElementById('fab').style.display = 'none';

  const el = document.getElementById('page-workouts');
  el.innerHTML = workoutEditorHTML(workout, state.workouts);
  bindEditor(el, state, workout);
}

function workoutEditorHTML(w, allWorkouts) {
  const isDraft = w.status === 'draft';
  return `
    <div class="editor-header">
      <button class="back-btn" id="editor-back">‹ Volver</button>
      <div class="editor-header-center">
        <input class="editor-name-input" id="editor-name" value="${w.name}" placeholder="Nombre del entreno">
        ${w.sessionName ? `<div class="editor-session-label">${w.templateName} · ${w.sessionName}</div>` : ''}
      </div>
      <button class="editor-save-btn" id="editor-save">
        ${isDraft ? 'Finalizar' : 'Guardar'}
      </button>
    </div>

    <div id="editor-exercises">
      ${w.exercises.map((ex, ei) => exerciseSectionHTML(ex, ei, allWorkouts)).join('')}
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

function exerciseSectionHTML(ex, ei, allWorkouts) {
  const plateau = StatsEngine.detectPlateau(ex.name, allWorkouts);
  return `<div class="exercise-section" data-ei="${ei}">
    <div class="exercise-header">
      <span class="ex-title">${ex.name}</span>
      <div class="ex-meta">
        ${plateau ? '<span style="font-size:10px;color:var(--red);font-weight:600">⚠️ Plateau</span>' : ''}
        <button class="btn-remove-ex" data-ei="${ei}">×</button>
      </div>
    </div>
    <div class="exercise-body">
      <div class="set-rows-header">
        <span></span><span style="text-align:center;font-size:10px;color:var(--text3)">PESO</span><span></span>
      </div>
      ${ex.sets.map((s, si) => setRowHTML(ex, ei, si, s, allWorkouts)).join('')}
      <button class="btn-add-set" data-ei="${ei}">+ Añadir set</button>
    </div>
  </div>`;
}

function setRowHTML(ex, ei, si, set, allWorkouts) {
  const w = parseFloat(set.weight) || 0;
  const r = parseInt(set.reps) || 0;
  const isPR = w && r && StatsEngine.isNewPR(w, r, ex.name, allWorkouts);
  const isImp = w && r && StatsEngine.isImprovement(w, r, ex.name, allWorkouts);

  return `<div class="set-row" data-ei="${ei}" data-si="${si}">
    <div class="set-num">${si + 1}</div>
    <div class="set-main">
      <input class="set-weight-input" type="number" inputmode="decimal"
        placeholder="0" value="${set.weight}"
        data-field="weight" data-ei="${ei}" data-si="${si}">
      <span class="set-kg-label">kg</span>
    </div>
    <div class="set-right">
      <div class="set-badges">
        <span class="badge-pr ${isPR ? '' : 'hidden'}">🏆</span>
        <span class="badge-imp ${isImp ? '' : 'hidden'}">↑</span>
      </div>
      <input class="set-reps-input" type="number" inputmode="numeric"
        placeholder="0" value="${set.reps}"
        data-field="reps" data-ei="${ei}" data-si="${si}">
      <span class="set-reps-label">reps</span>
    </div>
  </div>`;
}

// ============================================================
// BIND EDITOR
// ============================================================

function bindEditor(el, state, workoutRef) {
  let workout = state.workouts.find(w => w.id === workoutRef.id);

  function getWorkout() { return state.workouts.find(w => w.id === workoutRef.id); }

  function refresh() {
    workout = getWorkout();
    document.getElementById('editor-exercises').innerHTML =
      workout.exercises.map((ex, ei) => exerciseSectionHTML(ex, ei, state.workouts)).join('');
    bindSetInputs();
    bindExerciseButtons();
  }

  function saveToState() {
    workout = getWorkout();
    const name = document.getElementById('editor-name')?.value.trim();
    const notes = document.getElementById('editor-notes')?.value.trim();
    if (name) workout.name = name;
    workout.notes = notes || '';
    state.workouts = DataManager.updateWorkout(state.workouts, workout);
  }

  // Back
  el.querySelector('#editor-back')?.addEventListener('click', () => {
    saveToState();
    document.getElementById('tabbar').style.display = 'flex';
    document.getElementById('fab').style.display = 'flex';
    renderWorkouts(state);
  });

  // Save / Finish
  el.querySelector('#editor-save')?.addEventListener('click', () => {
    saveToState();
    workout = getWorkout();
    // Mark PRs and improvements
    workout.exercises = workout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.filter(s => s.weight || s.reps).map(s => ({
        ...s,
        isPR: s.weight && s.reps && StatsEngine.isNewPR(parseFloat(s.weight), parseInt(s.reps), ex.name, state.workouts.filter(w => w.id !== workout.id)),
        isImprovement: s.weight && s.reps && StatsEngine.isImprovement(parseFloat(s.weight), parseInt(s.reps), ex.name, state.workouts.filter(w => w.id !== workout.id))
      }))
    })).filter(ex => ex.sets.length > 0);
    workout.status = 'done';
    state.workouts = DataManager.updateWorkout(state.workouts, workout);
    document.getElementById('tabbar').style.display = 'flex';
    document.getElementById('fab').style.display = 'flex';
    renderWorkouts(state);
    showToast('✅ Entreno guardado');
  });

  // Add exercise
  el.querySelector('#add-ex-btn')?.addEventListener('click', () => {
    const inp = el.querySelector('#new-ex-input');
    const name = inp.value.trim(); if (!name) return;
    workout = getWorkout();
    workout.exercises.push(createExerciseLog(name));
    state.workouts = DataManager.updateWorkout(state.workouts, workout);
    inp.value = '';
    refresh();
  });

  el.querySelector('#new-ex-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') el.querySelector('#add-ex-btn').click();
  });

  // Delete workout
  el.querySelector('#delete-workout-btn')?.addEventListener('click', () => {
    if (!confirm('¿Borrar este entreno?')) return;
    state.workouts = DataManager.deleteWorkout(state.workouts, workoutRef.id);
    document.getElementById('tabbar').style.display = 'flex';
    document.getElementById('fab').style.display = 'flex';
    renderWorkouts(state);
    showToast('Entreno borrado');
  });

  bindSetInputs();
  bindExerciseButtons();

  function bindSetInputs() {
    el.querySelectorAll('.set-weight-input, .set-reps-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const ei = parseInt(inp.dataset.ei), si = parseInt(inp.dataset.si);
        workout = getWorkout();
        workout.exercises[ei].sets[si][inp.dataset.field] = inp.value;
        state.workouts = DataManager.updateWorkout(state.workouts, workout);
        // Update badges live
        const s = workout.exercises[ei].sets[si];
        const exName = workout.exercises[ei].name;
        const othersWorkouts = state.workouts.filter(w => w.id !== workout.id);
        const w2 = parseFloat(s.weight) || 0, r = parseInt(s.reps) || 0;
        const isPR = w2 && r && StatsEngine.isNewPR(w2, r, exName, othersWorkouts);
        const isImp = w2 && r && StatsEngine.isImprovement(w2, r, exName, othersWorkouts);
        const row = inp.closest('.set-row');
        row?.querySelector('.badge-pr')?.classList.toggle('hidden', !isPR);
        row?.querySelector('.badge-imp')?.classList.toggle('hidden', !isImp);
      });
    });
  }

  function bindExerciseButtons() {
    el.querySelectorAll('.btn-remove-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        workout = getWorkout();
        workout.exercises.splice(parseInt(btn.dataset.ei), 1);
        state.workouts = DataManager.updateWorkout(state.workouts, workout);
        refresh();
      });
    });

    el.querySelectorAll('.btn-add-set').forEach(btn => {
      btn.addEventListener('click', () => {
        const ei = parseInt(btn.dataset.ei);
        workout = getWorkout();
        const last = workout.exercises[ei].sets.slice(-1)[0];
        workout.exercises[ei].sets.push(createSetLog({ weight: last?.weight || '', reps: last?.reps || '' }));
        state.workouts = DataManager.updateWorkout(state.workouts, workout);
        refresh();
      });
    });
  }
}
