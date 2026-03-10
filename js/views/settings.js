// ============================================================
// SETTINGS VIEW — equivalent to SettingsView.swift
// ============================================================

import { StatsEngine } from '../statsEngine.js';
import { DataManager } from '../dataManager.js';
import { workoutTotalVolume } from '../models.js';
import { showToast } from '../app.js';

export function renderSettings(state) {
  const { workouts, templates } = state;
  const names = StatsEngine.allNames(workouts);
  const totalVol = Math.round(workouts.reduce((s, w) => s + workoutTotalVolume(w), 0));

  const el = document.getElementById('page-settings');
  el.innerHTML = `
    <div class="page-header"><h1>Ajustes</h1></div>

    <div class="section-title">Resumen</div>
    <div class="card">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${statItem(workouts.length, 'Entrenamientos')}
        ${statItem(names.length, 'Ejercicios')}
        ${statItem(templates.length, 'Templates')}
        ${statItem(totalVol.toLocaleString(), 'kg·reps totales')}
      </div>
    </div>

    <div class="section-title">Datos</div>
    <div class="settings-section">
      <div class="settings-row" id="export-btn">
        <div class="sr-left">
          <div class="sr-icon" style="background:rgba(255,107,43,0.15)">📤</div>
          <span class="sr-label">Exportar entrenamientos</span>
        </div>
        <span class="sr-chevron">›</span>
      </div>
      <div class="settings-row" id="import-row">
        <div class="sr-left">
          <div class="sr-icon" style="background:rgba(0,122,255,0.15)">📥</div>
          <span class="sr-label">Importar entrenamientos</span>
        </div>
        <span class="sr-chevron">›</span>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </div>
    </div>

    <div class="section-title">Peligro</div>
    <div class="settings-section">
      <div class="settings-row" id="delete-all-btn">
        <div class="sr-left">
          <div class="sr-icon" style="background:rgba(255,59,48,0.15)">🗑️</div>
          <span class="sr-label" style="color:var(--red)">Borrar todos los datos</span>
        </div>
      </div>
    </div>

    <div class="section-title">Acerca de</div>
    <div class="settings-section">
      <div class="settings-row" style="cursor:default">
        <span class="sr-label">StrengthTracker v1.0</span>
        <span style="font-size:12px;color:var(--text3)">PWA</span>
      </div>
    </div>
  `;

  el.querySelector('#export-btn').addEventListener('click', () => exportData(state));

  const importRow = el.querySelector('#import-row');
  const importFile = el.querySelector('#import-file');
  importRow.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', e => importData(e, state));

  el.querySelector('#delete-all-btn').addEventListener('click', () => {
    if (!confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
    DataManager.clearAll();
    state.workouts = [];
    state.templates = DataManager.getTemplates(); // Reseeds defaults
    renderSettings(state);
    showToast('🗑️ Datos borrados');
  });
}

function statItem(val, lbl) {
  return `<div>
    <div style="font-size:22px;font-weight:700">${val}</div>
    <div style="font-size:12px;color:var(--text2);margin-top:2px">${lbl}</div>
  </div>`;
}

function exportData(state) {
  const json = DataManager.exportJSON(state.workouts, state.templates);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `StrengthTracker_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Exportado correctamente');
}

function importData(e, state) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const result = DataManager.importJSON(ev.target.result);
      state.workouts = result.workouts;
      state.templates = result.templates;
      renderSettings(state);
      showToast('📥 Importado correctamente');
    } catch {
      showToast('❌ Error al importar el archivo');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
