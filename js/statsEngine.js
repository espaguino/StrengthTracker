// ============================================================
// STATS ENGINE — equivalent to StatsEngine.swift
// ============================================================

export const StatsEngine = {

  // --- Private helpers ---

  _allSets(name, workouts) {
    return workouts.flatMap(w => w.exercises.filter(e => e.name === name).flatMap(e => e.sets));
  },

  _workoutsFor(name, workouts) {
    return workouts
      .filter(w => w.exercises.some(e => e.name === name))
      .sort((a, b) => a.date - b.date);
  },

  // --- PR ---

  prWeight(name, workouts) {
    return Math.max(0, ...this._allSets(name, workouts).map(s => parseFloat(s.weight) || 0));
  },

  prReps(name, workouts) {
    const sets = this._allSets(name, workouts);
    const maxW = this.prWeight(name, workouts);
    return Math.max(0, ...sets.filter(s => parseFloat(s.weight) === maxW).map(s => parseInt(s.reps) || 0));
  },

  bestVolume(name, workouts) {
    return Math.max(0, ...this._allSets(name, workouts).map(s => (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)));
  },

  isNewPR(weight, reps, name, workouts) {
    const pr = this.prWeight(name, workouts);
    if (weight > pr) return true;
    if (weight === pr && reps > this.prReps(name, workouts)) return true;
    return false;
  },

  // --- Progress data for charts ---

  weightProgress(name, workouts) {
    return this._workoutsFor(name, workouts).map(w => ({
      date: w.date,
      value: Math.max(0, ...w.exercises
        .filter(e => e.name === name)
        .flatMap(e => e.sets)
        .map(s => parseFloat(s.weight) || 0))
    }));
  },

  volumeProgress(name, workouts) {
    return this._workoutsFor(name, workouts).map(w => ({
      date: w.date,
      value: w.exercises
        .filter(e => e.name === name)
        .reduce((sum, e) => sum + e.sets.reduce((s2, s) => s2 + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0)
    }));
  },

  // --- Sparkline ---

  sparkline(name, workouts, n = 8) {
    return this.weightProgress(name, workouts).slice(-n).map(p => p.value);
  },

  // --- Plateau detection ---

  detectPlateau(name, workouts, sessions = 4) {
    const data = this.weightProgress(name, workouts);
    if (data.length < sessions) return false;
    const last = data.slice(-sessions).map(p => p.value);
    return last.every(v => v <= last[0]);
  },

  // --- Trend ---

  trend(name, workouts, sessions = 5) {
    const data = this.weightProgress(name, workouts);
    if (data.length < 3) return 'none';
    const last = data.slice(-sessions).map(p => p.value);
    const diff = last[last.length - 1] - last[0];
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'stable';
  },

  // --- All exercise names ---

  allNames(workouts) {
    return [...new Set(workouts.flatMap(w => w.exercises.map(e => e.name)))].sort();
  },

  // --- Sessions count ---

  sessionCount(name, workouts) {
    return this._workoutsFor(name, workouts).length;
  },

  lastDate(name, workouts) {
    const wks = this._workoutsFor(name, workouts);
    return wks.length ? wks[wks.length - 1].date : null;
  }
};
