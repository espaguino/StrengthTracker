// ============================================================
// MODELS — equivalent to Models.swift
// ============================================================

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createSetLog({ weight = '', reps = '', isPR = false } = {}) {
  return { id: uid(), weight, reps, isPR };
}

export function createExerciseLog(name) {
  return { id: uid(), name, sets: [createSetLog()] };
}

export function createWorkout(name = '') {
  return {
    id: uid(),
    name: name || `Entreno ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
    date: Date.now(),
    notes: '',
    exercises: []
  };
}

export function createTemplate({ name = '', exercises = [], isDefault = false } = {}) {
  return { id: uid(), name, exercises, isDefault };
}

export function workoutTotalVolume(workout) {
  return workout.exercises.reduce((sum, ex) =>
    sum + ex.sets.reduce((s2, s) => s2 + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0
  );
}

export function workoutPRCount(workout) {
  return workout.exercises.flatMap(e => e.sets).filter(s => s.isPR).length;
}

export const DEFAULT_TEMPLATES = [
  { name: 'Push Day',  exercises: ['Press banca', 'Press militar', 'Press inclinado', 'Tríceps polea', 'Elevaciones laterales'] },
  { name: 'Pull Day',  exercises: ['Peso muerto', 'Dominadas', 'Remo barra', 'Face pull', 'Curl bíceps'] },
  { name: 'Leg Day',   exercises: ['Sentadilla', 'Peso muerto rumano', 'Prensa', 'Curl femoral', 'Elevación talones'] },
  { name: 'Full Body', exercises: ['Sentadilla', 'Press banca', 'Remo barra', 'Press militar', 'Peso muerto'] },
];
