// ============================================================
// STATS VIEW — equivalent to StatsView.swift
// ============================================================

import { StatsEngine } from '../statsEngine.js';
import { emptyState, trendSymbol, trendClass } from './home.js';

let selectedExercise = null;
export function setSelectedExercise(name) { selectedExercise = name; }
let chartMode = 'weight';
let mainChart = null;

export function renderStats(state) {
  const { workouts } = state;
  const names = StatsEngine.allNames(workouts);
  const el = document.getElementById('page-stats');

  if (names.length === 0) {
    el.innerHTML = `
      <div class="page-header"><h1>Estadísticas</h1></div>
      ${emptyState('📊','Sin datos','Registra entrenamientos para ver estadísticas')}
    `;
    return;
  }

  if (!selectedExercise || !names.includes(selectedExercise)) selectedExercise = names[0];

  el.innerHTML = `
    <div class="page-header"><h1>Estadísticas</h1></div>
    <div class="exercise-pill-row" id="stats-pills">
      ${names.map(n => `<button class="exercise-pill ${n===selectedExercise?'selected':''}" data-name="${n}">${n}</button>`).join('')}
    </div>
    <div id="stats-tooltip"></div>
    <div class="seg-control">
      <button class="seg-btn ${chartMode==='weight'?'active':''}" data-mode="weight">Peso máx.</button>
      <button class="seg-btn ${chartMode==='volume'?'active':''}" data-mode="volume">Volumen</button>
    </div>
    <div class="chart-container">
      <div class="chart-title" id="chart-title">${chartMode==='weight'?'Peso máximo':'Volumen total'}</div>
      <canvas id="main-chart"></canvas>
    </div>
    <div class="section-title">Todos los ejercicios</div>
    <div id="stats-all">${names.map(n => allExRow(n, workouts)).join('')}</div>
  `;

  renderTooltip(workouts);
  renderChart(workouts);

  // Bind pills
  el.querySelectorAll('.exercise-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      selectedExercise = pill.dataset.name;
      renderStats(state);
    });
  });

  // Bind seg control
  el.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chartMode = btn.dataset.mode;
      renderStats(state);
    });
  });

  // Bind all-exercises rows
  el.querySelectorAll('.workout-row[data-name]').forEach(row => {
    row.addEventListener('click', () => {
      selectedExercise = row.dataset.name;
      document.getElementById('content').scrollTop = 0;
      renderStats(state);
    });
  });
}

function renderTooltip(workouts) {
  const name = selectedExercise;
  const pr = StatsEngine.prWeight(name, workouts);
  const prR = StatsEngine.prReps(name, workouts);
  const bv = StatsEngine.bestVolume(name, workouts);
  const t = StatsEngine.trend(name, workouts);
  const plateau = StatsEngine.detectPlateau(name, workouts);
  const sessions = StatsEngine.sessionCount(name, workouts);
  const lastD = StatsEngine.lastDate(name, workouts);
  const lastStr = lastD ? new Date(lastD).toLocaleDateString('es-ES',{day:'numeric',month:'short'}) : '—';
  const sym = trendSymbol(t); const cls = trendClass(t);

  document.getElementById('stats-tooltip').innerHTML = `
    <div class="stats-tooltip">
      <div class="tt-header">
        <div class="tt-name">${name}</div>
        ${plateau ? '<span class="plateau-badge" style="font-size:11px;padding:4px 10px">⚠️ Plateau</span>' : ''}
      </div>
      <div class="stats-grid">
        <div class="stat-item"><div class="stat-val">${pr}<span> kg</span></div><div class="stat-lbl">PR peso</div></div>
        <div class="stat-item"><div class="stat-val">${prR}<span> reps</span></div><div class="stat-lbl">PR reps</div></div>
        <div class="stat-item"><div class="stat-val">${Math.round(bv)}</div><div class="stat-lbl">Mejor vol.</div></div>
        <div class="stat-item"><div class="stat-val ${cls}">${sym}</div><div class="stat-lbl">Tendencia</div></div>
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--text2)">Último: ${lastStr} · ${sessions} sesiones</div>
    </div>
  `;
}

function renderChart(workouts) {
  if (mainChart) { mainChart.destroy(); mainChart = null; }
  const data = chartMode === 'weight'
    ? StatsEngine.weightProgress(selectedExercise, workouts)
    : StatsEngine.volumeProgress(selectedExercise, workouts);

  const canvas = document.getElementById('main-chart');
  if (!canvas) return;

  if (data.length < 2) {
    document.getElementById('chart-title').textContent = 'Se necesitan al menos 2 sesiones';
    return;
  }

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  mainChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map(p => new Date(p.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})),
      datasets: [{
        data: data.map(p => p.value),
        borderColor: '#ff6b2b', backgroundColor: 'rgba(255,107,43,0.1)',
        borderWidth: 2.5, tension: 0.4, pointRadius: 4,
        pointBackgroundColor: '#ff6b2b', fill: true
      }]
    },
    options: {
      animation: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw} ${chartMode==='weight'?'kg':'kg·reps'}` } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 5, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } }
      }
    }
  });
}

function allExRow(name, workouts) {
  const pr = StatsEngine.prWeight(name, workouts);
  const t = StatsEngine.trend(name, workouts);
  const plateau = StatsEngine.detectPlateau(name, workouts);
  const sessions = StatsEngine.sessionCount(name, workouts);
  return `<div class="workout-row" data-name="${name}">
    <div>
      <div class="wr-name">${name}</div>
      <div class="wr-meta">PR: ${pr} kg · ${sessions} sesiones</div>
    </div>
    <div class="wr-right" style="display:flex;align-items:center;gap:8px">
      ${plateau ? '<span style="color:var(--red);font-size:12px">⚠️</span>' : ''}
      <span class="${trendClass(t)}" style="font-size:20px">${trendSymbol(t)}</span>
    </div>
  </div>`;
}

// ============================================================
// EXERCISE STATS MODAL (from workout editor)
// ============================================================

let modalChart = null;

export function openExerciseStatsModal(name, workouts) {
  // Remove any existing modal
  document.getElementById('ex-stats-modal')?.remove();

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  const pr = StatsEngine.prWeight(name, workouts);
  const prR = StatsEngine.prReps(name, workouts);
  const bv = StatsEngine.bestVolume(name, workouts);
  const t = StatsEngine.trend(name, workouts);
  const sessions = StatsEngine.sessionCount(name, workouts);
  const plateau = StatsEngine.detectPlateau(name, workouts);
  const lastD = StatsEngine.lastDate(name, workouts);
  const lastStr = lastD ? new Date(lastD).toLocaleDateString('es-ES',{day:'numeric',month:'short'}) : '—';
  const sym = trendSymbol(t); const cls = trendClass(t);

  const overlay = document.createElement('div');
  overlay.id = 'ex-stats-modal';
  overlay.className = 'ex-stats-overlay';
  overlay.innerHTML = `
    <div class="ex-stats-sheet">
      <div class="ex-stats-header">
        <span class="ex-stats-title">${name}</span>
        <button class="ex-stats-close" id="ex-stats-close-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      ${plateau ? '<div style="padding:0 16px 8px"><span class="plateau-badge">⚠️ Plateau</span></div>' : ''}
      <div class="stats-grid" style="padding:0 16px 12px">
        <div class="stat-item"><div class="stat-val">${pr}<span> kg</span></div><div class="stat-lbl">PR peso</div></div>
        <div class="stat-item"><div class="stat-val">${prR}<span> reps</span></div><div class="stat-lbl">PR reps</div></div>
        <div class="stat-item"><div class="stat-val">${Math.round(bv)}</div><div class="stat-lbl">Mejor vol.</div></div>
        <div class="stat-item"><div class="stat-val ${cls}">${sym}</div><div class="stat-lbl">Tendencia</div></div>
      </div>
      <div style="padding:0 16px 6px;font-size:12px;color:var(--text2)">Último: ${lastStr} · ${sessions} sesiones</div>
      <div class="ex-stats-seg" id="ex-stats-seg">
        <button class="seg-btn active" data-mode="weight">Peso máx.</button>
        <button class="seg-btn" data-mode="volume">Volumen</button>
      </div>
      <div class="chart-container" style="margin:0 16px 16px">
        <canvas id="ex-stats-canvas"></canvas>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  let modalMode = 'weight';

  function drawChart() {
    if (modalChart) { modalChart.destroy(); modalChart = null; }
    const data = modalMode === 'weight'
      ? StatsEngine.weightProgress(name, workouts)
      : StatsEngine.volumeProgress(name, workouts);
    const canvas = document.getElementById('ex-stats-canvas');
    if (!canvas) return;
    if (data.length < 2) { canvas.parentElement.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px">Se necesitan al menos 2 sesiones</div>'; return; }
    modalChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(p => new Date(p.date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})),
        datasets: [{ data: data.map(p => p.value), borderColor: '#ff6b2b', backgroundColor: 'rgba(255,107,43,0.1)', borderWidth: 2.5, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ff6b2b', fill: true }]
      },
      options: {
        animation: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw} ${modalMode==='weight'?'kg':'kg·reps'}` } } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 5, font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } }
        }
      }
    });
  }

  drawChart();

  // Seg control
  overlay.querySelectorAll('#ex-stats-seg .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalMode = btn.dataset.mode;
      overlay.querySelectorAll('#ex-stats-seg .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      drawChart();
    });
  });

  // Close
  const close = () => {
    if (modalChart) { modalChart.destroy(); modalChart = null; }
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 280);
  };
  document.getElementById('ex-stats-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}
