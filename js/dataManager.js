// ============================================================
// DATA MANAGER
// ============================================================

import { DEFAULT_TEMPLATES, createWorkoutTemplate, createSessionTemplate, uid } from './models.js';

const KEYS = { workouts: 'st_workouts', templates: 'st_templates' };

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export const DataManager = {

  // --- Workouts ---

  getWorkouts() { return load(KEYS.workouts, []); },
  saveWorkouts(w) { save(KEYS.workouts, w); },

  addWorkout(workouts, workout) {
    const updated = [...workouts, workout];
    this.saveWorkouts(updated);
    return updated;
  },

  updateWorkout(workouts, updated) {
    const list = workouts.map(w => w.id === updated.id ? updated : w);
    this.saveWorkouts(list);
    return list;
  },

  deleteWorkout(workouts, id) {
    const updated = workouts.filter(w => w.id !== id);
    this.saveWorkouts(updated);
    return updated;
  },

  // --- Templates ---

  getTemplates() {
    const stored = load(KEYS.templates, null);
    if (stored) return stored;
    const defaults = DEFAULT_TEMPLATES.map(t => createWorkoutTemplate({
      name: t.name,
      sessions: t.sessions.map(s => ({ ...createSessionTemplate(s.name), exercises: s.exercises })),
      isDefault: true
    }));
    save(KEYS.templates, defaults);
    return defaults;
  },

  saveTemplates(t) { save(KEYS.templates, t); },

  addTemplate(templates, template) {
    const updated = [...templates, template];
    this.saveTemplates(updated);
    return updated;
  },

  updateTemplate(templates, updated) {
    const list = templates.map(t => t.id === updated.id ? updated : t);
    this.saveTemplates(list);
    return list;
  },

  deleteTemplate(templates, id) {
    const updated = templates.filter(t => t.id !== id);
    this.saveTemplates(updated);
    return updated;
  },

  // --- Export / Import ---

  exportJSON(workouts, templates) {
    return JSON.stringify({ workouts, templates, exportDate: new Date().toISOString() }, null, 2);
  },

  importJSON(json) {
    const data = JSON.parse(json);
    if (data.workouts) this.saveWorkouts(data.workouts);
    if (data.templates) this.saveTemplates(data.templates);
    return {
      workouts: data.workouts || this.getWorkouts(),
      templates: data.templates || this.getTemplates()
    };
  },

  clearAll() {
    localStorage.removeItem(KEYS.workouts);
    localStorage.removeItem(KEYS.templates);
  }
};
