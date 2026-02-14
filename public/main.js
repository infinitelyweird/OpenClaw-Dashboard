const loginCard = document.getElementById('login-card');
const dashboardSection = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const cardsContainer = document.getElementById('cards');
const summaryBtn = document.getElementById('summary-btn');
const summaryPanel = document.getElementById('summary-panel');
const newDashboardBtn = document.getElementById('new-dashboard-btn');
const createPanel = document.getElementById('create-panel');
const dashboardForm = document.getElementById('dashboard-form');
const cancelCreate = document.getElementById('cancel-create');

let loggedIn = false;

const statusEmoji = {
  operational: '🟢',
  degraded: '🟠',
  flaky: '🟡',
  down: '🔴',
  unknown: '⚪️',
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

function renderDashboards(dashboards) {
  if (!dashboards.length) {
    cardsContainer.innerHTML = '<p class="muted">No dashboards yet.</p>';
    return;
  }

  cardsContainer.innerHTML = dashboards
    .map((dash) => {
      const metrics = dash.metrics
        ?.map(
          (metric) => `<span class="metric">${metric.label}: <strong>${metric.value}</strong></span>`
        )
        .join('') || '<span class="metric">No metrics</span>';

      const indicator = `background: linear-gradient(120deg, ${dash.color}, rgba(255,255,255,0.1));`;

      return `
        <article class="dashboard-card" style="${indicator}">
          <div class="status-pill">
            ${statusEmoji[dash.status] || '🟣'} ${dash.status || 'unknown'}
          </div>
          <h3>${dash.name}</h3>
          <p>${dash.agent}</p>
          <p class="notes">${dash.notes || ''}</p>
          <div class="metric-list">${metrics}</div>
          <small>Updated ${new Date(dash.updatedAt).toLocaleString()}</small>
        </article>
      `;
    })
    .join('');
}

async function loadDashboards() {
  const dashboards = await api('/api/dashboards');
  renderDashboards(dashboards);
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));

  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify(data) });
    loggedIn = true;
    loginCard.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    await loadDashboards();
  } catch (err) {
    loginError.classList.remove('hidden');
  }
});

summaryBtn.addEventListener('click', async () => {
  try {
    const summary = await api('/api/summary');
    summaryPanel.innerHTML = `
      <div class="summary-header">
        <h2>Summary</h2>
        <p>Generated ${new Date(summary.generatedAt).toLocaleTimeString()}</p>
      </div>
      <div class="summary-line"><span>Total Dashboards</span><strong>${summary.totalDashboards}</strong></div>
      ${Object.entries(summary.statusBuckets)
        .map(
          ([status, count]) => `<div class="summary-line"><span>${status}</span><strong>${count}</strong></div>`
        )
        .join('')}
      <div class="summary-highlights">
        ${summary.highlights
          .map(
            (item) => `
              <div class="highlight">
                <p><strong>${item.name}</strong> — ${item.status}</p>
                <small>${item.agent} · ${new Date(item.updatedAt).toLocaleString()}</small>
                <p>${item.notes || ''}</p>
              </div>
            `
          )
          .join('')}
      </div>
    `;
    summaryPanel.classList.remove('hidden');
  } catch (err) {
    summaryPanel.innerHTML = '<p class="error">Unable to load summary.</p>';
    summaryPanel.classList.remove('hidden');
  }
});

newDashboardBtn.addEventListener('click', () => {
  createPanel.classList.toggle('hidden');
});

cancelCreate.addEventListener('click', () => {
  createPanel.classList.add('hidden');
  dashboardForm.reset();
});

dashboardForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(dashboardForm);
  const payload = Object.fromEntries(formData);

  if (payload.metrics) {
    payload.metrics = payload.metrics.split(',').map((entry) => {
      const [label, value] = entry.split(':').map((part) => part.trim());
      return { label, value };
    });
  }

  try {
    await api('/api/dashboards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    dashboardForm.reset();
    createPanel.classList.add('hidden');
    await loadDashboards();
  } catch (err) {
    alert('Could not save dashboard.');
  }
});

if (loggedIn) {
  loadDashboards();
}
