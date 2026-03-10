// ============================================================
// TEMPLATES VIEW
// ============================================================

import { createWorkoutTemplate, createSessionTemplate, uid } from '../models.js';
import { DataManager } from '../dataManager.js';
import { showToast, openModal, closeModal } from '../app.js';

let editingId = null;
let tempSessions = []; // [{ id, name, exercises[] }]
let activeSessionIdx = 0;

export function renderTemplates(state) {
  const el = document.getElementById('page-templates');
  const defaults = state.templates.filter(t => t.isDefault);
  const custom = state.templates.filter(t => !t.isDefault);

  el.innerHTML = `
    <div class="page-header"><h1>Templates</h1></div>
    <div class="section-title">Predefinidos</div>
    ${defaults.map(t => templateRowHTML(t)).join('')}
    <div class="section-title">Mis templates</div>
    ${custom.length
      ? custom.map(t => templateRowHTML(t)).join('')
      : `<div style="padding:12px 20px;color:var(--text3);font-size:14px">Sin templates personalizados</div>`}
    <button class="btn btn-secondary" id="new-template-btn" style="margin-top:4px">+ Nuevo template</button>
  `;

  el.querySelector('#new-template-btn').addEventListener('click', () => openTemplateModal(null, state));
  el.querySelectorAll('.edit-template-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openTemplateModal(btn.dataset.tid, state); });
  });
  el.querySelectorAll('.delete-template-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('¿Borrar este template?')) return;
      state.templates = DataManager.deleteTemplate(state.templates, btn.dataset.tid);
      renderTemplates(state);
      showToast('Template borrado');
    });
  });
}

function templateRowHTML(t) {
  return `<div class="template-row">
    <div style="flex:1;min-width:0">
      <div class="tr-name">${t.name} ${t.isDefault ? '<span class="default-badge">Default</span>' : ''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
        ${t.sessions.map(s => `<span class="session-tag">${s.name}</span>`).join('')}
      </div>
    </div>
    <div class="tr-actions">
      <button class="icon-btn edit-template-btn" data-tid="${t.id}">✏️</button>
      ${!t.isDefault ? `<button class="icon-btn delete-template-btn" data-tid="${t.id}">🗑️</button>` : ''}
    </div>
  </div>`;
}

// ============================================================
// TEMPLATE MODAL
// ============================================================

function openTemplateModal(id, state) {
  editingId = id;
  if (id) {
    const t = state.templates.find(x => x.id === id);
    tempSessions = t.sessions.map(s => ({ ...s, exercises: [...s.exercises] }));
    openModal(templateModalHTML(t.name));
  } else {
    tempSessions = [{ ...createSessionTemplate('Sesión 1'), exercises: [] }];
    openModal(templateModalHTML(''));
  }
  activeSessionIdx = 0;
  renderSessionEditor();
  bindTemplateModal(state);
}

function templateModalHTML(name) {
  return `<div class="modal-overlay">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2>${editingId ? 'Editar template' : 'Nuevo template'}</h2>
        <button class="modal-close" id="close-template-modal">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre del plan</label>
        <input class="form-input" id="template-name" value="${name}" placeholder="Ej: Push Pull Legs" type="text">
      </div>

      <div class="section-title" style="margin-top:0">Sesiones</div>
      <div id="session-tabs-row" style="display:flex;gap:8px;padding:0 16px;margin-bottom:12px;overflow-x:auto"></div>
      <button class="btn btn-secondary btn-sm" style="margin:0 16px 12px" id="add-session-btn">+ Nueva sesión</button>

      <div id="session-editor"></div>

      <button class="btn btn-primary" id="save-template-btn">Guardar template</button>
      <button class="btn btn-secondary" id="cancel-template-btn">Cancelar</button>
    </div>
  </div>`;
}

function renderSessionEditor() {
  const c = document.getElementById('modal-container');
  if (!c) return;

  // Session tabs
  const tabsRow = c.querySelector('#session-tabs-row');
  if (tabsRow) {
    tabsRow.innerHTML = tempSessions.map((s, i) => `
      <button class="session-tab ${i === activeSessionIdx ? 'active' : ''}" data-i="${i}">${s.name}</button>
    `).join('');
    tabsRow.querySelectorAll('.session-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeSessionIdx = parseInt(tab.dataset.i);
        renderSessionEditor();
      });
    });
  }

  // Session editor
  const session = tempSessions[activeSessionIdx];
  const editor = c.querySelector('#session-editor');
  if (!editor || !session) return;

  editor.innerHTML = `
    <div class="form-group">
      <label class="form-label">Nombre de la sesión</label>
      <div style="display:flex;gap:8px">
        <input class="form-input" id="session-name-input" value="${session.name}" placeholder="Ej: Push" type="text" style="flex:1">
        ${tempSessions.length > 1 ? `<button class="icon-btn" id="delete-session-btn" style="flex-shrink:0">🗑️</button>` : ''}
      </div>
    </div>
    <div class="section-title" style="margin-top:0">Ejercicios</div>
    <div id="session-ex-list" style="padding:0 20px;margin-bottom:12px">
      ${session.exercises.map((ex, i) => `
        <div class="template-ex-item">
          <span>${ex}</span>
          <button class="btn-remove-ex" data-i="${i}">×</button>
        </div>`).join('')}
    </div>
    <div class="add-ex-row">
      <input class="form-input" id="session-new-ex" placeholder="Añadir ejercicio" type="text">
      <button class="btn-add-ex" id="session-add-ex-btn">+</button>
    </div>
  `;

  // Session name input
  editor.querySelector('#session-name-input')?.addEventListener('input', e => {
    tempSessions[activeSessionIdx].name = e.target.value;
    const tab = c.querySelector(`.session-tab[data-i="${activeSessionIdx}"]`);
    if (tab) tab.textContent = e.target.value || 'Sesión';
  });

  // Delete session
  editor.querySelector('#delete-session-btn')?.addEventListener('click', () => {
    tempSessions.splice(activeSessionIdx, 1);
    activeSessionIdx = Math.max(0, activeSessionIdx - 1);
    renderSessionEditor();
  });

  // Add exercise
  editor.querySelector('#session-add-ex-btn')?.addEventListener('click', () => {
    const inp = editor.querySelector('#session-new-ex');
    const v = inp.value.trim(); if (!v) return;
    tempSessions[activeSessionIdx].exercises.push(v);
    inp.value = '';
    renderSessionEditor();
  });
  editor.querySelector('#session-new-ex')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') editor.querySelector('#session-add-ex-btn').click();
  });

  // Remove exercises
  editor.querySelectorAll('.btn-remove-ex').forEach(btn => {
    btn.addEventListener('click', () => {
      tempSessions[activeSessionIdx].exercises.splice(parseInt(btn.dataset.i), 1);
      renderSessionEditor();
    });
  });
}

function bindTemplateModal(state) {
  const c = document.getElementById('modal-container');
  c.querySelector('#close-template-modal')?.addEventListener('click', closeModal);
  c.querySelector('#cancel-template-btn')?.addEventListener('click', closeModal);

  c.querySelector('#add-session-btn')?.addEventListener('click', () => {
    tempSessions.push({ ...createSessionTemplate(`Sesión ${tempSessions.length + 1}`), exercises: [] });
    activeSessionIdx = tempSessions.length - 1;
    renderSessionEditor();
  });

  c.querySelector('#save-template-btn')?.addEventListener('click', () => {
    const name = c.querySelector('#template-name')?.value.trim();
    if (!name) { showToast('Escribe un nombre'); return; }
    if (editingId) {
      const t = state.templates.find(x => x.id === editingId);
      state.templates = DataManager.updateTemplate(state.templates, { ...t, name, sessions: tempSessions.map(s => ({ ...s })) });
    } else {
      const t = createWorkoutTemplate({ name, sessions: tempSessions.map(s => ({ ...s })), isDefault: false });
      state.templates = DataManager.addTemplate(state.templates, t);
    }
    closeModal();
    renderTemplates(state);
    showToast('Template guardado');
  });
}
