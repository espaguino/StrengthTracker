// ============================================================
// APP ENTRY POINT — equivalent to StrengthTrackerApp.swift
// ============================================================

import { DataManager } from './dataManager.js';
import { initRouter } from './router.js';

// --- Global state (shared across all views) ---
export const state = {
  workouts: DataManager.getWorkouts(),
  templates: DataManager.getTemplates(),
};

// --- Toast utility ---
let toastTimer = null;
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// --- Modal utility ---
export function openModal(html) {
  const container = document.getElementById('modal-container');
  container.innerHTML = html;
  requestAnimationFrame(() => {
    container.querySelector('.modal-overlay')?.classList.add('open');
  });
}

export function closeModal() {
  const overlay = document.getElementById('modal-container').querySelector('.modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => { document.getElementById('modal-container').innerHTML = ''; }, 300);
}

// Close modal on overlay click
document.getElementById('modal-container').addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal();
});

// --- Service Worker registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// --- Boot ---
initRouter(state);
