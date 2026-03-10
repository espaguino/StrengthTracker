// ============================================================
// HOME VIEW — equivalent to HomeView.swift
// ============================================================

import { StatsEngine } from '../statsEngine.js';
import { workoutTotalVolume, workoutPRCount } from '../models.js';

export function renderHome(state) {
  const el = document.getElementById('page-home');
  const { workouts } = state;
  const names = StatsEngine.allNames(workouts);

  const now = new Date();
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0,0,0,0);
  const thisWeek = workouts.filter(w => w.date >= weekStart.getTime()).length;
  const recent = [...workouts].sort((a,b) => b.date - a.date).slice(0, 5);

  el.innerHTML = `
    <div class="page-header">
      <h1>💪 StrengthTracker</h1>
      <div class="subtitle">${days[now.getDay()]}, ${now.toLocaleDateString('es-ES', { day:'numeric', month:'long' })}</div>
    </div>

    <div class="summary-grid">
      ${summaryCard('🏋️', workouts.length, 'Entrenos')}
      ${summaryCard('📋', names.length, 'Ejercicios')}
      ${summaryCard('🗓️', thisWeek, 'Esta semana')}
    </div>

    ${names.length > 0 ? `
      <div class="section-title">Progreso por ejercicio</div>
      <div class="sparkline-grid" id="sparkline-grid">
        ${names.slice(0,6).map(n => sparklineCard(n, workouts)).join('')}
      </div>
    ` : ''}

    <div class="section-title">Últimos entrenamientos</div>
    ${recent.length ? recent.map(w => workoutRow(w)).join('') : emptyState('🏋️','Sin entrenamientos','Pulsa + para empezar')}
  `;

  // Bind workout rows
  el.querySelectorAll('.workout-row[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      import('../router.js').then(m => {
        import('./workout.js').then(wm => {
          m.switchTab('workouts', state);
          setTimeout(() => wm.showWorkoutDetail(state, row.dataset.id), 50);
        });
      });
    });
  });

  // Draw sparklines after DOM is ready
  requestAnimationFrame(() => drawSparklines(names.slice(0, 6), workouts));
}

function summaryCard(icon, val, lbl) {
  return `<div class="summary-card">
    <div class="s-icon">${icon}</div>
    <div class="s-val">${val}</div>
    <div class="s-lbl">${lbl}</div>
  </div>`;
}

function sparklineCard(name, workouts) {
  const pr = StatsEngine.prWeight(name, workouts);
  const t = StatsEngine.trend(name, workouts);
  const plateau = StatsEngine.detectPlateau(name, workouts);
  const sym = trendSymbol(t); const cls = trendClass(t);
  return `<div class="sparkline-card">
    <div class="sp-name">${name}</div>
    <div class="sp-pr">PR: ${pr} kg</div>
    <canvas id="spark-${cssId(name)}" height="38"></canvas>
    <div class="sp-footer">
      <span class="${cls}">${sym}</span>
      ${plateau ? '<span class="plateau-badge">Plateau</span>' : ''}
    </div>
  </div>`;
}

function drawSparklines(names, workouts) {
  names.forEach(name => {
    const data = StatsEngine.sparkline(name, workouts);
    if (data.length < 2) return;
    const canvas = document.getElementById('spark-' + cssId(name));
    if (!canvas) return;
    new Chart(canvas, {
      type: 'line',
      data: { labels: data.map((_,i)=>i), datasets: [{ data, borderColor: '#ff6b2b', borderWidth: 2, tension: 0.4, pointRadius: 0, fill: false }] },
      options: { animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
  });
}

function workoutRow(w) {
  const vol = Math.round(workoutTotalVolume(w));
  const prs = workoutPRCount(w);
  return `<div class="workout-row" data-id="${w.id}">
    <div>
      <div class="wr-name">${w.name}</div>
      <div class="wr-meta">${new Date(w.date).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})} · ${w.exercises.length} ejercicios</div>
    </div>
    <div class="wr-right">
      <div class="wr-vol">${vol} kg</div>
      ${prs > 0 ? `<div class="wr-prs">🏆 ${prs} PR${prs>1?'s':''}</div>` : ''}
    </div>
  </div>`;
}

export function emptyState(icon, title, sub) {
  return `<div class="empty-state">
    <div class="e-icon">${icon}</div>
    <h3>${title}</h3>
    <p>${sub}</p>
  </div>`;
}

export function trendSymbol(t) { return t==='up'?'↑':t==='down'?'↓':t==='stable'?'→':'—'; }
export function trendClass(t)  { return t==='up'?'trend-up':t==='down'?'trend-down':t==='stable'?'trend-stable':'trend-none'; }
export function cssId(name)    { return name.replace(/[^a-zA-Z0-9]/g,'_'); }
