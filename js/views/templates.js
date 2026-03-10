// ============================================================
// TEMPLATES VIEW — equivalent to TemplatesView.swift
// ============================================================

import { createTemplate } from '../models.js';
import { DataManager } from '../dataManager.js';
import { showToast, openModal, closeModal } from '../app.js';

let editingId = null;
let tempExercises = [];

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
      : `<div style="padding:12px 20px;color:var(--text3);font-size:14px">Sin templates personalizados</div>`
    }
    <button class="btn btn-secondary" id="new-template-btn" style="margin-top:4px">+ Nuevo template</button>
  `;

  el.querySelector('#new-template-btn').addEventListener('click', () => openTemplateModal(null, state));

  el.querySelectorAll('.edit-template-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openTemplateModal(btn.dataset.tid, state);
    });
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
      <div class="tr-name">
        ${t.name}
        ${t.isDefault ? '<span class="default-badge">Default</span>' : ''}
      </div>
      <div class="tr-exs">${t.exercises.join(' · ')}</div>
    </div>
    <div class="tr-actions">
      <button class="icon-btn edit-template-btn" data-tid="${t.id}">✏️</button>
      ${!t.isDefault ? `<button class="icon-btn delete-template-btn" data-tid="${t.id}">🗑️</button>` : ''}
    </div>
  </div>`;
}

function openTemplateModal(id, state) {
  editingId = id;
  if (id) {
    const t = state.templates.find(x => x.id === id);
    tempExercises = [...t.exercises];
    openModal(templateModalHTML(t.name));
  } else {
    tempExercises = [];
    openModal(templateModalHTML(''));
  }
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
        <label class="form-label">Nombre</label>
        <input class="form-input" id="template-name" value="${name}" placeholder="Ej: Upper Body A" type="text">
      </div>
      <div class="section-title" style="margin-top:0">Ejercicios</div>
      <div id="template-ex-list" style="padding:0 20px;margin-bottom:12px">
        ${exListHTML()}
      </div>
      <div class="add-ex-row">
        <input class="form-input" id="template-new-ex" placeholder="Añadir ejercicio" type="text">
        <button class="btn-add-ex" id="template-add-ex-btn">+</button>
      </div>
      <button class="btn btn-primary" id="save-template-btn">Guardar template</button>
      <button class="btn btn-secondary" id="cancel-template-btn">Cancelar</button>
    </div>
  </div>`;
}

function exListHTML() {
  return tempExercises.map((ex, i) => `
    <div class="template-ex-item">
      <span>${ex}</span>
      <button class="btn-remove-ex" data-i="${i}">×</button>
    </div>
  `).join('');
}

function bindTemplateModal(state) {
  const c = document.getElementById('modal-container');

  c.querySelector('#close-template-modal')?.addEventListener('click', closeModal);
  c.querySelector('#cancel-template-btn')?.addEventListener('click', closeModal);

  c.querySelector('#template-add-ex-btn')?.addEventListener('click', () => {
    const inp = c.querySelector('#template-new-ex');
    const v = inp.value.trim(); if (!v) return;
    tempExercises.push(v); inp.value = '';
    c.querySelector('#template-ex-list').innerHTML = exListHTML();
    bindRemoveButtons(c);
  });

  c.querySelector('#template-new-ex')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') c.querySelector('#template-add-ex-btn').click();
  });

  c.querySelector('#save-template-btn')?.addEventListener('click', () => {
    const name = c.querySelector('#template-name')?.value.trim();
    if (!name) { showToast('Escribe un nombre'); return; }
    if (editingId) {
      const t = state.templates.find(x => x.id === editingId);
      state.templates = DataManager.updateTemplate(state.templates, { ...t, name, exercises: [...tempExercises] });
    } else {
      const t = createTemplate({ name, exercises: [...tempExercises], isDefault: false });
      state.templates = DataManager.addTemplate(state.templates, t);
    }
    closeModal();
    renderTemplates(state);
    showToast('Template guardado');
  });

  bindRemoveButtons(c);
}

function bindRemoveButtons(c) {
  c.querySelectorAll('.btn-remove-ex').forEach(btn => {
    btn.addEventListener('click', () => {
      tempExercises.splice(parseInt(btn.dataset.i), 1);
      c.querySelector('#template-ex-list').innerHTML = exListHTML();
      bindRemoveButtons(c);
    });
  });
}
