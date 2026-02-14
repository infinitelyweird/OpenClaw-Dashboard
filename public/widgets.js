// widgets.js — Dashboard widget engine with drag, resize, and live data
(function () {
  const token = localStorage.getItem('token');
  const grid = document.getElementById('widget-grid');
  const STORAGE_KEY = 'iw-dashboard-layout';
  const REFRESH_MS = 10000;

  // ─── WIDGET REGISTRY ─────────────────────────────────
  const WIDGETS = {
    // System Monitoring
    'cpu-usage': { icon: '🔥', label: 'CPU Usage', category: 'system', size: '1x1', render: renderCpu },
    'cpu-cores': { icon: '🧮', label: 'CPU Cores', category: 'system', size: '2x1', render: renderCpuCores },
    'memory': { icon: '🧠', label: 'Memory Usage', category: 'system', size: '1x1', render: renderMemory },
    'storage': { icon: '💾', label: 'Storage', category: 'system', size: '2x1', render: renderStorage },
    'network': { icon: '🌐', label: 'Network I/O', category: 'system', size: '2x1', render: renderNetwork },
    'os-info': { icon: '🖥️', label: 'System Info', category: 'system', size: '1x1', render: renderOsInfo },
    'processes': { icon: '⚡', label: 'Top Processes', category: 'system', size: '2x2', render: renderProcesses },
    // User Management
    'user-stats': { icon: '👥', label: 'User Overview', category: 'users', size: '1x1', render: renderUserStats },
    'recent-users': { icon: '🆕', label: 'Recent Registrations', category: 'users', size: '2x1', render: renderRecentUsers },
    'user-breakdown': { icon: '📊', label: 'User Breakdown', category: 'users', size: '1x1', render: renderUserBreakdown },
    // OpenClaw
    'oc-status': { icon: '🐾', label: 'OpenClaw Status', category: 'openclaw', size: '1x1', render: renderOcStatus },
    'oc-server': { icon: '🖧', label: 'Server Health', category: 'openclaw', size: '1x1', render: renderOcServer },
    'oc-tasks': { icon: '✅', label: 'Task Summary', category: 'openclaw', size: '2x1', render: renderOcTasks },
    'oc-priority': { icon: '🎯', label: 'Priority Breakdown', category: 'openclaw', size: '1x1', render: renderOcPriority },
  };

  const SIZES = ['1x1', '2x1', '3x1', '4x1', '1x2', '2x2'];

  // ─── API HELPER ───────────────────────────────────────
  async function api(path) {
    try {
      const res = await fetch(path, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (err) {
      console.error(`Widget API error (${path}):`, err);
      return null;
    }
  }

  function fmtBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function barColor(pct) {
    if (pct < 50) return 'green';
    if (pct < 75) return 'blue';
    if (pct < 90) return 'orange';
    return 'red';
  }

  function coreColor(pct) {
    if (pct < 30) return 'rgba(52,211,153,0.3)';
    if (pct < 60) return 'rgba(96,165,250,0.3)';
    if (pct < 85) return 'rgba(251,191,36,0.3)';
    return 'rgba(248,113,113,0.3)';
  }

  // ─── WIDGET RENDERERS ─────────────────────────────────

  async function renderCpu(body) {
    const d = await api('/api/widgets/system/cpu');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = `
      <div class="stat-row"><span class="stat-value">${d.currentLoad}%</span></div>
      <div class="stat-label">${d.model} · ${d.cores} cores @ ${d.speed}GHz</div>
      <div class="progress-bar"><div class="progress-fill ${barColor(d.currentLoad)}" style="width:${d.currentLoad}%"></div></div>
    `;
  }

  async function renderCpuCores(body) {
    const d = await api('/api/widgets/system/cpu');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = `
      <div class="stat-label">${d.cores} cores · Overall: ${d.currentLoad}%</div>
      <div class="core-grid">
        ${d.perCore.map(c => `<div class="core-cell" style="background:${coreColor(c.load)}">${c.load}%</div>`).join('')}
      </div>
    `;
  }

  async function renderMemory(body) {
    const d = await api('/api/widgets/system/memory');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = `
      <div class="stat-row"><span class="stat-value">${d.usedPercent}%</span></div>
      <div class="stat-label">${fmtBytes(d.used)} / ${fmtBytes(d.total)}</div>
      <div class="progress-bar"><div class="progress-fill ${barColor(d.usedPercent)}" style="width:${d.usedPercent}%"></div></div>
      ${d.swapTotal > 0 ? `<div class="stat-label" style="margin-top:0.5rem;">Swap: ${fmtBytes(d.swapUsed)} / ${fmtBytes(d.swapTotal)}</div>` : ''}
    `;
  }

  async function renderStorage(body) {
    const d = await api('/api/widgets/system/storage');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = d.map(disk => `
      <div class="disk-row">
        <div class="disk-label">${disk.mount}</div>
        <div class="disk-bar-wrap">
          <div class="progress-bar" style="margin:0"><div class="progress-fill ${barColor(disk.usedPercent)}" style="width:${disk.usedPercent}%"></div></div>
        </div>
        <div class="disk-percent">${disk.usedPercent}%</div>
      </div>
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.4rem;padding-left:66px;">${fmtBytes(disk.used)} / ${fmtBytes(disk.size)}</div>
    `).join('');
  }

  async function renderNetwork(body) {
    const d = await api('/api/widgets/system/network');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    const active = d.filter(n => n.rxBytes > 0 || n.txBytes > 0);
    body.innerHTML = `
      <table class="mini-table">
        <tr><th>Interface</th><th>↓ RX</th><th>↑ TX</th><th>↓/s</th><th>↑/s</th></tr>
        ${active.map(n => `<tr>
          <td>${n.iface}</td>
          <td>${fmtBytes(n.rxBytes)}</td>
          <td>${fmtBytes(n.txBytes)}</td>
          <td>${n.rxSec >= 0 ? fmtBytes(n.rxSec) + '/s' : '—'}</td>
          <td>${n.txSec >= 0 ? fmtBytes(n.txSec) + '/s' : '—'}</td>
        </tr>`).join('')}
      </table>
    `;
  }

  async function renderOsInfo(body) {
    const d = await api('/api/widgets/system/os');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = `
      <div style="font-size:0.85rem;display:flex;flex-direction:column;gap:0.35rem;">
        <div><strong>${d.hostname}</strong></div>
        <div style="color:var(--muted)">${d.distro} ${d.release}</div>
        <div style="color:var(--muted)">${d.arch} · ${d.platform}</div>
        <div style="margin-top:0.3rem;"><span class="status-dot green"></span>Uptime: ${d.uptimeFormatted}</div>
      </div>
    `;
  }

  async function renderProcesses(body) {
    const d = await api('/api/widgets/system/processes');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = `
      <div class="stat-label" style="margin-bottom:0.5rem;">Total: ${d.all} · Running: ${d.running} · Sleeping: ${d.sleeping}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>
          <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.3rem;color:var(--accent);">Top CPU</div>
          <table class="mini-table">
            <tr><th>Process</th><th>CPU%</th><th>Mem%</th></tr>
            ${d.topCpu.map(p => `<tr><td>${p.name}</td><td>${p.cpu}</td><td>${p.mem}</td></tr>`).join('')}
          </table>
        </div>
        <div>
          <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.3rem;color:var(--accent-2);">Top Memory</div>
          <table class="mini-table">
            <tr><th>Process</th><th>CPU%</th><th>Mem%</th></tr>
            ${d.topMem.map(p => `<tr><td>${p.name}</td><td>${p.cpu}</td><td>${p.mem}</td></tr>`).join('')}
          </table>
        </div>
      </div>
    `;
  }

  async function renderUserStats(body) {
    const d = await api('/api/widgets/users/stats');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = `
      <div class="stat-row"><span class="stat-value">${d.totalUsers}</span><span class="stat-unit">users</span></div>
      <div style="display:flex;gap:1rem;margin-top:0.6rem;font-size:0.85rem;">
        <div><span class="status-dot green"></span>${d.approvedUsers} active</div>
        <div><span class="status-dot yellow"></span>${d.pendingUsers} pending</div>
      </div>
      <div style="display:flex;gap:1rem;margin-top:0.4rem;font-size:0.85rem;color:var(--muted);">
        <div>🛡️ ${d.totalRoles} roles</div>
        <div>📁 ${d.totalGroups} groups</div>
      </div>
    `;
  }

  async function renderRecentUsers(body) {
    const d = await api('/api/widgets/users/stats');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    body.innerHTML = d.recentUsers.map(u => `
      <div class="user-item">
        <div>
          <strong>${u.Username}</strong>
          <span style="color:var(--muted);font-size:0.8rem;margin-left:0.4rem;">${u.Email}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="badge-sm ${u.IsApproved ? 'approved' : 'pending'}">${u.IsApproved ? 'Active' : 'Pending'}</span>
          <span style="font-size:0.75rem;color:var(--muted);">${new Date(u.CreatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  }

  async function renderUserBreakdown(body) {
    const d = await api('/api/widgets/users/stats');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    const approved = d.approvedUsers || 0;
    const pending = d.pendingUsers || 0;
    const total = d.totalUsers || 1;
    body.innerHTML = `
      <div style="display:flex;gap:0.8rem;align-items:center;">
        <div style="position:relative;width:80px;height:80px;">
          <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg);">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#34d399" stroke-width="3"
              stroke-dasharray="${(approved/total)*100} ${100-(approved/total)*100}" stroke-linecap="round"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:600;">${Math.round((approved/total)*100)}%</div>
        </div>
        <div style="font-size:0.85rem;">
          <div><span class="status-dot green"></span>Approved: ${approved}</div>
          <div style="margin-top:0.3rem;"><span class="status-dot yellow"></span>Pending: ${pending}</div>
        </div>
      </div>
    `;
  }

  async function renderOcStatus(body) {
    const d = await api('/api/widgets/openclaw/status');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    const dbStatus = d.database.status === 'connected';
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.85rem;">
        <div><span class="status-dot ${d.server.status === 'operational' ? 'green' : 'red'}"></span>Server: ${d.server.status}</div>
        <div><span class="status-dot ${dbStatus ? 'green' : 'red'}"></span>Database: ${d.database.status}</div>
        <div style="color:var(--muted);margin-top:0.3rem;">Node ${d.server.nodeVersion} · PID ${d.server.pid}</div>
        <div style="color:var(--muted);">Uptime: ${d.server.uptime}</div>
      </div>
    `;
  }

  async function renderOcServer(body) {
    const d = await api('/api/widgets/openclaw/status');
    if (!d) { body.innerHTML = '<p style="color:var(--muted)">Unable to load</p>'; return; }
    const s = d.server;
    const memPct = s.memoryTotal > 0 ? Math.round((s.memoryUsed / s.memoryTotal) * 100) : 0;
    body.innerHTML = `
      <div class="stat-row"><span class="stat-value">${s.memoryUsed}</span><span class="stat-unit">MB heap</span></div>
      <div class="stat-label">${s.memoryUsed} / ${s.memoryTotal} MB allocated</div>
      <div class="progress-bar"><div class="progress-fill purple" style="width:${memPct}%"></div></div>
      <div style="margin-top:0.5rem;font-size:0.8rem;color:var(--muted);">Uptime: ${s.uptime}</div>
    `;
  }

  async function renderOcTasks(body) {
    const d = await api('/api/widgets/openclaw/status');
    if (!d || !d.tasks) { body.innerHTML = '<p style="color:var(--muted)">No task data</p>'; return; }
    const t = d.tasks;
    body.innerHTML = `
      <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
        <div><div class="stat-value" style="font-size:1.6rem;">${t.totalTasks || 0}</div><div class="stat-label">Total</div></div>
        <div><div class="stat-value" style="font-size:1.6rem;color:#60a5fa;">${t.openTasks || 0}</div><div class="stat-label">Open</div></div>
        <div><div class="stat-value" style="font-size:1.6rem;color:#fbbf24;">${t.inProgressTasks || 0}</div><div class="stat-label">In Progress</div></div>
        <div><div class="stat-value" style="font-size:1.6rem;color:#34d399;">${t.completedTasks || 0}</div><div class="stat-label">Completed</div></div>
      </div>
    `;
  }

  async function renderOcPriority(body) {
    const d = await api('/api/widgets/openclaw/status');
    if (!d || !d.tasks) { body.innerHTML = '<p style="color:var(--muted)">No task data</p>'; return; }
    const t = d.tasks;
    const items = [
      { label: 'P1 Critical', count: t.p1Tasks || 0, color: '#f87171' },
      { label: 'P2 High', count: t.p2Tasks || 0, color: '#fb923c' },
      { label: 'P3 Medium', count: t.p3Tasks || 0, color: '#fbbf24' },
      { label: 'P4 Low', count: t.p4Tasks || 0, color: '#34d399' },
    ];
    body.innerHTML = items.map(p => `
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;font-size:0.85rem;">
        <div style="width:10px;height:10px;border-radius:3px;background:${p.color};"></div>
        <div style="flex:1;">${p.label}</div>
        <div style="font-weight:600;">${p.count}</div>
      </div>
    `).join('');
  }

  // ─── LAYOUT ENGINE ────────────────────────────────────

  const DEFAULT_LAYOUT = [
    { id: 'cpu-usage', size: '1x1' },
    { id: 'memory', size: '1x1' },
    { id: 'os-info', size: '1x1' },
    { id: 'oc-status', size: '1x1' },
    { id: 'cpu-cores', size: '2x1' },
    { id: 'storage', size: '2x1' },
    { id: 'user-stats', size: '1x1' },
    { id: 'user-breakdown', size: '1x1' },
    { id: 'oc-server', size: '1x1' },
    { id: 'oc-priority', size: '1x1' },
    { id: 'network', size: '2x1' },
    { id: 'oc-tasks', size: '2x1' },
    { id: 'recent-users', size: '2x1' },
    { id: 'processes', size: '2x2' },
  ];

  function loadLayout() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_LAYOUT.map(w => ({ ...w }));
  }

  function saveLayout(layout) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }

  let layout = loadLayout();

  function createWidgetEl(item) {
    const def = WIDGETS[item.id];
    if (!def) return null;
    const size = item.size || def.size;

    const widget = document.createElement('div');
    widget.className = `widget widget-${size}`;
    widget.dataset.widgetId = item.id;
    widget.dataset.size = size;
    widget.innerHTML = `
      <div class="widget-header" draggable="true">
        <div class="widget-title">
          <span class="widget-icon">${def.icon}</span>
          ${def.label}
        </div>
        <div class="widget-actions">
          <button class="widget-btn resize-btn" title="Resize">↔</button>
          <button class="widget-btn remove-btn" title="Remove">✕</button>
        </div>
      </div>
      <div class="widget-body"><div style="color:var(--muted);font-size:0.85rem;">Loading…</div></div>
      <div class="widget-resize"></div>
    `;

    // Remove
    widget.querySelector('.remove-btn').addEventListener('click', () => {
      layout = layout.filter(l => l !== item);
      saveLayout(layout);
      widget.remove();
    });

    // Resize cycle
    widget.querySelector('.resize-btn').addEventListener('click', () => {
      const curIdx = SIZES.indexOf(widget.dataset.size);
      const nextSize = SIZES[(curIdx + 1) % SIZES.length];
      widget.className = `widget widget-${nextSize}`;
      widget.dataset.size = nextSize;
      item.size = nextSize;
      saveLayout(layout);
    });

    // Drag
    const header = widget.querySelector('.widget-header');
    header.addEventListener('dragstart', (e) => {
      widget.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
      window._dragItem = item;
      window._dragWidget = widget;
    });
    header.addEventListener('dragend', () => {
      widget.classList.remove('dragging');
      window._dragItem = null;
      window._dragWidget = null;
    });

    // Drop zone
    widget.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      widget.style.borderColor = 'var(--accent)';
    });
    widget.addEventListener('dragleave', () => {
      widget.style.borderColor = '';
    });
    widget.addEventListener('drop', (e) => {
      e.preventDefault();
      widget.style.borderColor = '';
      const dragItem = window._dragItem;
      const dragWidget = window._dragWidget;
      if (!dragItem || dragItem === item) return;

      // Swap positions in layout
      const fromIdx = layout.indexOf(dragItem);
      const toIdx = layout.indexOf(item);
      if (fromIdx !== -1 && toIdx !== -1) {
        layout[fromIdx] = item;
        layout[toIdx] = dragItem;
        saveLayout(layout);
        renderGrid();
      }
    });

    // Mouse resize
    const resizeHandle = widget.querySelector('.widget-resize');
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = widget.offsetWidth;
      const onMove = (e2) => {
        const diff = e2.clientX - startX;
        const newW = startW + diff;
        const colW = grid.offsetWidth / 12;
        let spans = Math.round(newW / colW);
        spans = Math.max(3, Math.min(12, spans));
        const nearest = SIZES.find(s => parseInt(s) * 3 === spans) || SIZES[0];
        if (widget.dataset.size !== nearest) {
          widget.className = `widget widget-${nearest}`;
          widget.dataset.size = nearest;
          item.size = nearest;
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveLayout(layout);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    return widget;
  }

  async function refreshWidget(widget) {
    const id = widget.dataset.widgetId;
    const def = WIDGETS[id];
    if (!def) return;
    const body = widget.querySelector('.widget-body');
    await def.render(body);
  }

  async function renderGrid() {
    grid.innerHTML = '';
    for (const item of layout) {
      const el = createWidgetEl(item);
      if (el) {
        grid.appendChild(el);
        refreshWidget(el);
      }
    }
  }

  // ─── WIDGET PICKER ────────────────────────────────────

  document.getElementById('add-widget-btn').addEventListener('click', () => {
    const categories = { system: '🖥️ System Monitoring', users: '👥 User Management', openclaw: '🐾 OpenClaw' };
    const container = document.getElementById('widget-picker-container');

    let html = `<div class="widget-picker" onclick="if(event.target===this)this.remove()">
      <div class="widget-picker-panel">
        <h2 style="margin-top:0;">Add Widget</h2>`;

    for (const [cat, catLabel] of Object.entries(categories)) {
      const items = Object.entries(WIDGETS).filter(([, w]) => w.category === cat);
      html += `<div class="widget-category">${catLabel}</div><div class="widget-picker-grid">`;
      for (const [id, w] of items) {
        const alreadyAdded = layout.some(l => l.id === id);
        html += `<div class="widget-picker-item ${alreadyAdded ? 'already' : ''}" data-add-widget="${id}" style="${alreadyAdded ? 'opacity:0.4;' : ''}">
          <div class="picker-icon">${w.icon}</div>
          <div class="picker-label">${w.label}</div>
          <div class="picker-desc">${alreadyAdded ? 'Already added' : w.size}</div>
        </div>`;
      }
      html += '</div>';
    }

    html += `<div style="margin-top:1.5rem;text-align:right;"><button class="ghost" onclick="this.closest('.widget-picker').remove()" style="border-radius:12px;padding:0.5rem 1.2rem;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;font-family:inherit;">Close</button></div>`;
    html += '</div></div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-add-widget]').forEach(el => {
      el.addEventListener('click', () => {
        const wid = el.dataset.addWidget;
        if (layout.some(l => l.id === wid)) return;
        const def = WIDGETS[wid];
        const item = { id: wid, size: def.size };
        layout.push(item);
        saveLayout(layout);
        container.innerHTML = '';
        renderGrid();
      });
    });
  });

  // Reset layout
  document.getElementById('reset-layout-btn').addEventListener('click', () => {
    if (!confirm('Reset dashboard to default layout?')) return;
    layout = DEFAULT_LAYOUT.map(w => ({ ...w }));
    saveLayout(layout);
    renderGrid();
  });

  // ─── AUTO REFRESH ─────────────────────────────────────
  setInterval(() => {
    grid.querySelectorAll('.widget').forEach(w => refreshWidget(w));
  }, REFRESH_MS);

  // ─── INIT ─────────────────────────────────────────────
  renderGrid();
})();
