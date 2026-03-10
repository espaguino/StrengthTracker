// ============================================================
// WORKOUT VIEW — equivalent to WorkoutView.swift
// ============================================================

import { createWorkout, createExerciseLog, createSetLog, workoutTotalVolume, workoutPRCount } from '../models.js';
import { StatsEngine } from '../statsEngine.js';
import { DataManager } from '../dataManager.js';
import { showToast, openModal, closeModal } from '../app.js';
import { emptyState } from './home.js';

let activeWorkout = null;

// ---- LIST VIEW ----

export function renderWorkouts(state) {
  const el = document.getElementById('page-workouts');
  showWorkoutList(el, state);
}

function showWorkoutList(el, state) {
  const sorted = [...state.workouts].sort((a,b) => b.date - a.date);
  el.innerHTML = `
    <div class="page-header"><h1>Entrenamientos</h1></div>
    <div id="workout-list">
      ${sorted.length ? sorted.map(w => workoutRowHTML(w)).join('') : emptyState('🏋️','Sin entrenamientos','Pulsa + para registrar tu primer entreno')}
    </div>
  `;
  el.querySelectorAll('.workout-row[data-id]').forEach(row => {
    row.addEventListener('click', () => showWorkoutDetail(state, row.dataset.id));
  });
}

export function showWorkoutDetail(state, id) {
  const w = state.workouts.find(x => x.id === id);
  if (!w) return;
  const el = document.getElementById('page-workouts');
  const vol = Math.round(workoutTotalVolume(w));
  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;gap:8px">
      <button class="back-btn" id="back-btn">‹ Volver</button>
      <h1 style="font-size:22px">${w.name}</h1>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:13px;color:var(--text2)">${new Date(w.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          <div style="font-size:26px;font-weight:700;margin-top:4px">${vol} kg·reps</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">Volumen total</div>
        </div>
        <button id="delete-workout-btn" style="background:rgba(255,59,48,0.1);border:none;border-radius:10px;padding:8px 12px;color:var(--red);font-size:13px;font-weight:600;cursor:pointer">Borrar</button>
      </div>
      ${w.notes ? `<div style="margin-top:10px;font-size:13px;color:var(--text2);border-top:1px solid var(--border);padding-top:10px">${w.notes}</div>` : ''}
    </div>
    ${w.exercises.map(ex => `
      <div class="detail-ex">
        <div class="detail-ex-header">${ex.name}</div>
        <div class="detail-set-head"><span>#</span><span>Peso</span><span>Reps</span><span></span></div>
        ${ex.sets.map((s,i) => `<div class="detail-set">
          <span style="color:var(--text2);font-weight:600">${i+1}</span>
          <span>${s.weight} kg</span>
          <span>${s.reps} reps</span>
          <span>${s.isPR ? '🏆' : ''}</span>
        </div>`).join('')}
      </div>
    `).join('')}
  `;
  document.getElementById('back-btn').addEventListener('click', () => renderWorkouts(state));
  document.getElementById('delete-workout-btn').addEventListener('click', () => {
    if (!confirm('¿Borrar este entreno?')) return;
    state.workouts = DataManager.deleteWorkout(state.workouts, id);
    renderWorkouts(state);
    showToast('Entreno borrado');
  });
}

function workoutRowHTML(w) {
  const vol = Math.round(workoutTotalVolume(w));
  const prs = workoutPRCount(w);
  return `<div class="workout-row" data-id="${w.id}">
    <div>
      <div class="wr-name">${w.name}</div>
      <div class="wr-meta">${new Date(w.date).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})} · ${w.exercises.length} ejercicios</div>
    </div>
    <div class="wr-right">
      <div class="wr-vol">${vol} kg</div>
      ${prs > 0 ? `<div class="wr-prs">🏆 ${prs} PR${prs>1?'s':''}</div>` : ''}
    </div>
  </div>`;
}

// ---- NEW WORKOUT ----

export function openNewWorkout(state) {
  // Show template picker first
  openModal(templatePickerHTML(state.templates));
  document.getElementById('modal-container').querySelectorAll('.template-pick-row').forEach(row => {
    row.addEventListener('click', () => {
      const tId = row.dataset.tid;
      const tmpl = tId ? state.templates.find(t => t.id === tId) : null;
      closeModal();
      setTimeout(() => startActiveWorkout(state, tmpl), 320);
    });
  });
}

function templatePickerHTML(templates) {
  return `<div class="modal-overlay">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-header"><h2>Elegir template</h2><button class="modal-close" id="close-picker">✕</button></div>
      ${templates.map(t => `
        <div class="template-row template-pick-row" data-tid="${t.id}" style="cursor:pointer">
          <div>
            <div class="tr-name">${t.name} ${t.isDefault ? '<span class="default-badge">Default</span>' : ''}</div>
            <div class="tr-exs">${t.exercises.join(' · ')}</div>
          </div>
        </div>`).join('')}
      <div class="template-row template-pick-row" data-tid="" style="cursor:pointer">
        <div><div class="tr-name" style="color:var(--accent)">+ Sin template</div></div>
      </div>
    </div>
  </div>`;
}

function startActiveWorkout(state, template) {
  activeWorkout = createWorkout(template?.name || '');
  if (template) activeWorkout.exercises = template.exercises.map(n => createExerciseLog(n));
  openModal(activeWorkoutHTML(state.workouts));
  bindActiveWorkout(state);
}

function activeWorkoutHTML(existingWorkouts) {
  if (!activeWorkout) return '';
  return `<div class="modal-overlay">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>Nuevo entreno</h2>
        <button class="modal-close" id="close-workout">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre</label>
        <input class="form-input" id="workout-name" value="${activeWorkout.name}" placeholder="Ej: Push Day" type="text">
      </div>
      <div id="active-exercises">${renderActiveExercises(existingWorkouts)}</div>
      <div class="add-ex-row">
        <input class="form-input" id="new-ex-input" placeholder="Nombre del ejercicio" type="text">
        <button class="btn-add-ex" id="add-ex-btn">+</button>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-input" id="workout-notes" rows="2" placeholder="Notas opcionales...">${activeWorkout.notes}</textarea>
      </div>
      <button class="btn btn-primary" id="save-workout-btn">Guardar entreno</button>
      <button class="btn btn-secondary" id="cancel-workout-btn">Cancelar</button>
    </div>
  </div>`;
}

function renderActiveExercises(existingWorkouts) {
  if (!activeWorkout) return '';
  return activeWorkout.exercises.map((ex, ei) => `
    <div class="exercise-section" data-ei="${ei}">
      <div class="exercise-header">
        <span class="ex-title">${ex.name}</span>
        <div class="ex-meta">
          ${StatsEngine.detectPlateau(ex.name, existingWorkouts) ? '<span style="font-size:10px;color:var(--red);font-weight:600">⚠️ Plateau</span>' : ''}
          <button class="btn-remove-ex" data-ei="${ei}" style="background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;line-height:1">×</button>
        </div>
      </div>
      <div class="exercise-body">
        ${ex.sets.map((s, si) => setRowHTML(ei, si, s, ex.name, existingWorkouts)).join('')}
        <button class="btn-add-set" data-ei="${ei}">+ Añadir set</button>
      </div>
    </div>
  `).join('');
}

function setRowHTML(ei, si, set, exName, existingWorkouts) {
  const isPR = set.weight && set.reps && StatsEngine.isNewPR(parseFloat(set.weight), parseInt(set.reps), exName, existingWorkouts);
  return `<div class="set-row" data-ei="${ei}" data-si="${si}">
    <div class="set-num">${si+1}</div>
    <input class="set-input" type="number" inputmode="decimal" placeholder="kg" value="${set.weight}" data-field="weight" data-ei="${ei}" data-si="${si}">
    <input class="set-input" type="number" inputmode="numeric" placeholder="reps" value="${set.reps}" data-field="reps" data-ei="${ei}" data-si="${si}">
    <div class="pr-badge ${isPR ? '' : 'hidden'}">🏆</div>
  </div>`;
}

function bindActiveWorkout(state) {
  const c = document.getElementById('modal-container');

  c.querySelector('#close-workout')?.addEventListener('click', () => { closeModal(); activeWorkout = null; });
  c.querySelector('#cancel-workout-btn')?.addEventListener('click', () => { closeModal(); activeWorkout = null; });
  c.querySelector('#close-picker')?.addEventListener('click', closeModal);

  c.querySelector('#save-workout-btn')?.addEventListener('click', () => saveActiveWorkout(state));

  c.querySelector('#add-ex-btn')?.addEventListener('click', () => {
    const inp = c.querySelector('#new-ex-input');
    const name = inp.value.trim(); if (!name) return;
    activeWorkout.exercises.push(createExerciseLog(name));
    inp.value = '';
    refreshExercises(state.workouts);
  });

  c.querySelector('#new-ex-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') c.querySelector('#add-ex-btn').click();
  });

  bindExerciseEvents(state.workouts);
}

function bindExerciseEvents(existingWorkouts) {
  const c = document.getElementById('modal-container');

  c.querySelectorAll('.btn-remove-ex').forEach(btn => {
    btn.addEventListener('click', () => {
      activeWorkout.exercises.splice(parseInt(btn.dataset.ei), 1);
      refreshExercises(existingWorkouts);
    });
  });

  c.querySelectorAll('.btn-add-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const ei = parseInt(btn.dataset.ei);
      const last = activeWorkout.exercises[ei].sets.slice(-1)[0];
      activeWorkout.exercises[ei].sets.push(createSetLog({ weight: last?.weight||'', reps: last?.reps||'' }));
      refreshExercises(existingWorkouts);
    });
  });

  c.querySelectorAll('.set-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const ei = parseInt(inp.dataset.ei), si = parseInt(inp.dataset.si);
      const field = inp.dataset.field;
      activeWorkout.exercises[ei].sets[si][field] = inp.value;
      // Update PR badge
      const s = activeWorkout.exercises[ei].sets[si];
      const exName = activeWorkout.exercises[ei].name;
      const isPR = s.weight && s.reps && StatsEngine.isNewPR(parseFloat(s.weight), parseInt(s.reps), exName, existingWorkouts);
      const row = inp.closest('.set-row');
      row?.querySelector('.pr-badge')?.classList.toggle('hidden', !isPR);
    });
  });
}

function refreshExercises(existingWorkouts) {
  const c = document.getElementById('modal-container');
  const container = c.querySelector('#active-exercises');
  if (!container) return;
  // Preserve name input value
  const nameVal = c.querySelector('#workout-name')?.value;
  const notesVal = c.querySelector('#workout-notes')?.value;
  container.innerHTML = renderActiveExercises(existingWorkouts);
  if (nameVal !== undefined && c.querySelector('#workout-name')) c.querySelector('#workout-name').value = nameVal;
  if (notesVal !== undefined && c.querySelector('#workout-notes')) c.querySelector('#workout-notes').value = notesVal;
  bindExerciseEvents(existingWorkouts);
}

function saveActiveWorkout(state) {
  if (!activeWorkout) return;
  const c = document.getElementById('modal-container');
  activeWorkout.name = c.querySelector('#workout-name')?.value.trim() || activeWorkout.name;
  activeWorkout.notes = c.querySelector('#workout-notes')?.value.trim() || '';

  // Filter empty sets and mark PRs
  activeWorkout.exercises = activeWorkout.exercises.map(ex => ({
    ...ex,
    sets: ex.sets
      .filter(s => s.weight || s.reps)
      .map(s => ({
        ...s,
        isPR: s.weight && s.reps && StatsEngine.isNewPR(parseFloat(s.weight), parseInt(s.reps), ex.name, state.workouts)
      }))
  })).filter(ex => ex.sets.length > 0);

  if (activeWorkout.exercises.length === 0) { showToast('Añade al menos un ejercicio con datos'); return; }

  state.workouts = DataManager.addWorkout(state.workouts, activeWorkout);
  activeWorkout = null;
  closeModal();
  renderWorkouts(state);
  showToast('✅ Entreno guardado');
}
