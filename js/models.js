// ============================================================
// MODELS
// ============================================================

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Sets & Exercises ---

export function createSetLog({ weight = '', reps = '', isPR = false, isImprovement = false } = {}) {
  return { id: uid(), weight, reps, isPR, isImprovement };
}

export function createExerciseLog(name) {
  return { id: uid(), name, sets: [createSetLog()] };
}

// --- WorkoutLog (a recorded training day) ---

export function createWorkoutLog({ name = '', templateId = null, templateName = null, sessionId = null, sessionName = null } = {}) {
  return {
    id: uid(),
    name: name || `Entreno ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
    date: Date.now(),
    notes: '',
    status: 'draft',
    templateId,
    templateName,
    sessionId,
    sessionName,
    exercises: []
  };
}

// --- SessionTemplate ---

export function createSessionTemplate(name = '') {
  return { id: uid(), name, exercises: [] };
}

// --- WorkoutTemplate (plan with sessions) ---

export function createWorkoutTemplate({ name = '', sessions = [], isDefault = false } = {}) {
  return { id: uid(), name, sessions, isDefault };
}

// --- Helpers ---

export function workoutTotalVolume(workout) {
  return workout.exercises.reduce((sum, ex) =>
    sum + ex.sets.reduce((s2, s) => s2 + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0
  );
}

export function workoutPRCount(workout) {
  return workout.exercises.flatMap(e => e.sets).filter(s => s.isPR).length;
}

// --- Default templates (with sessions) ---

export const DEFAULT_TEMPLATES = [
  {
    name: 'Push Pull Legs',
    sessions: [
      { name: 'Push', exercises: ['Press banca', 'Press militar', 'Press inclinado', 'Tríceps polea', 'Elevaciones laterales'] },
      { name: 'Pull', exercises: ['Peso muerto', 'Dominadas', 'Remo barra', 'Face pull', 'Curl bíceps'] },
      { name: 'Legs', exercises: ['Sentadilla', 'Peso muerto rumano', 'Prensa', 'Curl femoral', 'Elevación talones'] },
    ]
  },
  {
    name: 'Full Body',
    sessions: [
      { name: 'Full Body A', exercises: ['Sentadilla', 'Press banca', 'Remo barra'] },
      { name: 'Full Body B', exercises: ['Peso muerto', 'Press militar', 'Dominadas'] },
    ]
  },
  {
    name: 'Upper / Lower',
    sessions: [
      { name: 'Upper', exercises: ['Press banca', 'Remo barra', 'Press militar', 'Curl bíceps', 'Tríceps polea'] },
      { name: 'Lower', exercises: ['Sentadilla', 'Peso muerto rumano', 'Prensa', 'Curl femoral', 'Elevación talones'] },
    ]
  },
];
