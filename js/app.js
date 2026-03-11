// ============================================================
// APP ENTRY POINT
// ============================================================

import { DataManager } from './dataManager.js';
import { initRouter } from './router.js';

// --- Global state ---
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

// ============================================================
// VISUAL VIEWPORT — keyboard handling
// Adjusts #content padding when keyboard appears/disappears
// and auto-saves + dismisses keyboard on outside tap
// ============================================================

let onKeyboardHide = null; // callback set by workout editor

export function setKeyboardHideCallback(fn) {
  onKeyboardHide = fn;
}

export function clearKeyboardHideCallback() {
  onKeyboardHide = null;
}

if (window.visualViewport) {
  let lastHeight = window.visualViewport.height;

  window.visualViewport.addEventListener('resize', () => {
    const content = document.getElementById('content');
    const vvHeight = window.visualViewport.height;
    const windowHeight = window.innerHeight;
    const keyboardHeight = windowHeight - vvHeight;
    const isKeyboardOpen = keyboardHeight > 100;

    if (isKeyboardOpen) {
      // Push content up so active input stays visible
      content.style.paddingBottom = `${keyboardHeight + 8}px`;
      // Scroll active element into view
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        setTimeout(() => active.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      }
    } else {
      // Keyboard closed — restore padding and trigger save
      content.style.paddingBottom = '';
      if (onKeyboardHide) onKeyboardHide();
    }

    lastHeight = vvHeight;
  });
}

// Tap outside input → blur (which triggers visualViewport resize → save)
document.getElementById('content').addEventListener('touchstart', e => {
  const active = document.activeElement;
  if (!active) return;
  if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA') return;
  if (!e.target.closest('input, textarea')) {
    active.blur();
  }
}, { passive: true });

// --- Service Worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/StrengthTracker/service-worker.js').catch(() => {});
  });
}

// --- Boot ---
initRouter(state);
