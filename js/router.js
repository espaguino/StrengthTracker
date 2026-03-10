// ============================================================
// ROUTER — equivalent to RootTabView.swift
// ============================================================

import { renderHome } from './views/home.js';
import { renderWorkouts } from './views/workout.js';
import { renderStats } from './views/stats.js';
import { renderTemplates } from './views/templates.js';
import { renderSettings } from './views/settings.js';

const TABS = { home: renderHome, workouts: renderWorkouts, stats: renderStats, templates: renderTemplates, settings: renderSettings };
let currentTab = 'home';

export function initRouter(state) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, state));
  });
  // FAB only on workouts tab
  document.getElementById('fab').addEventListener('click', () => {
    import('./views/workout.js').then(m => m.openNewWorkout(state));
  });
  switchTab('home', state);
}

export function switchTab(tab, state) {
  currentTab = tab;
  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  // Update tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // FAB visibility
  document.getElementById('fab').classList.toggle('hidden', tab !== 'workouts');
  // Render
  TABS[tab](state);
}

export function getCurrentTab() { return currentTab; }
