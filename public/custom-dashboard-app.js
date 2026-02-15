// custom-dashboard-app.js — Custom Dashboard frontend logic
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const dashboardId = params.get('id');
  if (!dashboardId) { location.href = 'dashboards.html'; return; }

  let dashboard = null;
  let widgets = [];
  let templates = [];
  let variables = [];
  let editMode = false;
  let refreshTimers = {};

  const grid = document.getElementById('cd-grid');
  const emptyEl = document.getElementById('cd-empty');

  // ── Init ──
  async function init() {
    await Promise.all([loadDashboard(), loadTemplates(), loadVariables()]);
    renderWidgets();
    setupEventListeners();
  }

  async function loadDashboard() {
    const res = await window.apiFetch(`/api/dashboards/${dashboardId}`);
    if (!res || !res.ok) { location.href = 'dashboards.html'; return; }
    dashboard = await res.json();
    widgets = dashboard.widgets || [];
    document.getElementById('cd-title').textContent = dashboard.Name;
    document.getElementById('cd-icon').textContent = dashboard.Icon || '📊';
    document.getElementById('cd-desc').textContent = dashboard.Description || '';
    document.title = `${dashboard.Name} — Infinitely Weird`;
  }

  async function loadTemplates() {
    const res = await window.apiFetch('/api/widgets/templates');
    if (res && res.ok) {
      const data = await res.json();
      templates = data.templates || [];
    }
  }

  async function loadVariables() {
    const res = await window.apiFetch('/api/widgets/variables');
    if (res && res.ok) variables = await res.json();
  }

  // ── Render Widgets ──
  function renderWidgets() {
    clearRefreshTimers();
    grid.innerHTML = '';
    if (!widgets.length) { emptyEl.style.display = ''; grid.style.display = 'none'; return; }
    emptyEl.style.display = 'none';
    grid.style.display = '';

    widgets.forEach(w => {
      const el = createWidgetElement(w);
      grid.appendChild(el);
      renderWidgetContent(el, w);
      setupAutoRefresh(el, w);
    });
  }

  function createWidgetElement(w) {
    const el = document.createElement('div');
    el.className = 'cd-widget';
    el.dataset.instanceId = w.InstanceID;
    el.style.gridColumn = `${w.PositionX + 1} / span ${w.Width || 2}`;
    el.style.gridRow = `${w.PositionY + 1} / span ${w.Height || 2}`;
    el.draggable = editMode;

    const title = w.Title || w.TemplateName || 'Widget';
    const icon = w.TemplateIcon || '📦';
    el.innerHTML = `
      <div class="cd-widget-header">
        <div class="cd-widget-title"><span class="icon">${icon}</span>${title}</div>
        <div class="cd-widget-actions">
          <button class="cd-widget-action" onclick="widgetConfigure(${w.InstanceID})" title="Configure">⚙️</button>
          <button class="cd-widget-action danger" onclick="widgetRemove(${w.InstanceID})" title="Remove">✕</button>
        </div>
      </div>
      <div class="cd-widget-body" id="wb-${w.InstanceID}"></div>
      <div class="cd-resize-handle" data-instance="${w.InstanceID}"></div>
    `;
    return el;
  }

  async function renderWidgetContent(el, w) {
    const body = el.querySelector('.cd-widget-body');
    try {
      await window.WidgetRenderers.render(body, w);
    } catch (err) {
      body.innerHTML = `<p class="wr-empty">Error: ${err.message}</p>`;
    }
  }

  function setupAutoRefresh(el, w) {
    const interval = w.RefreshInterval;
    if (!interval || interval <= 0) return;
    refreshTimers[w.InstanceID] = setInterval(() => renderWidgetContent(el, w), interval * 1000);
    if (interval < 10 && window.RefreshIndicator) RefreshIndicator.set(true);
  }

  function clearRefreshTimers() {
    Object.values(refreshTimers).forEach(clearInterval);
    refreshTimers = {};
  }

  // ── Edit Mode ──
  function toggleEditMode() {
    editMode = !editMode;
    const btn = document.getElementById('btn-edit-mode');
    btn.textContent = editMode ? '✅ Done' : '✏️ Edit';
    btn.classList.toggle('active', editMode);
    document.getElementById('btn-add-widget').style.display = editMode ? '' : 'none';
    document.getElementById('btn-save-layout').style.display = editMode ? '' : 'none';
    grid.classList.toggle('edit-mode', editMode);

    grid.querySelectorAll('.cd-widget').forEach(el => { el.draggable = editMode; });
  }

  // ── Drag & Drop ──
  let draggedEl = null;

  grid.addEventListener('dragstart', e => {
    if (!editMode) return;
    const widget = e.target.closest('.cd-widget');
    if (!widget) return;
    draggedEl = widget;
    widget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  grid.addEventListener('dragend', e => {
    if (draggedEl) draggedEl.classList.remove('dragging');
    grid.querySelectorAll('.cd-widget').forEach(el => el.classList.remove('drag-over'));
    draggedEl = null;
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.cd-widget');
    if (target && target !== draggedEl) {
      grid.querySelectorAll('.cd-widget').forEach(el => el.classList.remove('drag-over'));
      target.classList.add('drag-over');
    }
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.cd-widget');
    if (!target || !draggedEl || target === draggedEl) return;
    // Swap positions in grid
    const draggedStyle = { col: draggedEl.style.gridColumn, row: draggedEl.style.gridRow };
    draggedEl.style.gridColumn = target.style.gridColumn;
    draggedEl.style.gridRow = target.style.gridRow;
    target.style.gridColumn = draggedStyle.col;
    target.style.gridRow = draggedStyle.row;
    target.classList.remove('drag-over');
  });

  // ── Resize ──
  let resizing = null;
  document.addEventListener('mousedown', e => {
    if (!editMode) return;
    const handle = e.target.closest('.cd-resize-handle');
    if (!handle) return;
    e.preventDefault();
    const widget = handle.closest('.cd-widget');
    resizing = { widget, startX: e.clientX, startY: e.clientY, origW: widget.offsetWidth, origH: widget.offsetHeight };
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const dx = e.clientX - resizing.startX;
    const dy = e.clientY - resizing.startY;
    const cellW = grid.offsetWidth / 12;
    const cellH = 100; // grid-auto-rows
    const newW = Math.max(1, Math.round((resizing.origW + dx) / cellW));
    const newH = Math.max(1, Math.round((resizing.origH + dy) / cellH));
    const col = resizing.widget.style.gridColumn;
    const startCol = parseInt(col) || 1;
    resizing.widget.style.gridColumn = `${startCol} / span ${newW}`;
    const row = resizing.widget.style.gridRow;
    const startRow = parseInt(row) || 1;
    resizing.widget.style.gridRow = `${startRow} / span ${newH}`;
  });
  document.addEventListener('mouseup', () => { resizing = null; });

  // ── Save Layout ──
  async function saveLayout() {
    const items = [];
    grid.querySelectorAll('.cd-widget').forEach(el => {
      const instanceId = parseInt(el.dataset.instanceId);
      const col = el.style.gridColumn || '1 / span 2';
      const row = el.style.gridRow || '1 / span 2';
      const [colStart, colSpan] = parseGridValue(col);
      const [rowStart, rowSpan] = parseGridValue(row);
      items.push({ instanceId, x: colStart - 1, y: rowStart - 1, width: colSpan, height: rowSpan });
    });
    const res = await window.apiFetch(`/api/dashboards/${dashboardId}/layout`, {
      method: 'PUT', body: JSON.stringify({ layout: items })
    });
    if (res && res.ok) toast('Layout saved!');
    else toast('Failed to save layout');
  }

  function parseGridValue(val) {
    const m = val.match(/(\d+)\s*\/\s*span\s+(\d+)/);
    if (m) return [parseInt(m[1]), parseInt(m[2])];
    return [1, 2];
  }

  // ── Add Widget Store ──
  function openStore() {
    document.getElementById('modal-add-widget').style.display = '';
    renderStore();
  }

  let storeCategory = 'all';

  function renderStore(search = '') {
    const cats = ['all', ...new Set(templates.map(t => t.Category))];
    const catEl = document.getElementById('store-categories');
    catEl.innerHTML = cats.map(c =>
      `<button class="cd-store-cat ${c === storeCategory ? 'active' : ''}" onclick="setStoreCategory('${c}')">${c === 'all' ? '🏪 All' : c}</button>`
    ).join('');

    let filtered = templates;
    if (storeCategory !== 'all') filtered = filtered.filter(t => t.Category === storeCategory);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => t.Name.toLowerCase().includes(q) || (t.Description || '').toLowerCase().includes(q));
    }

    document.getElementById('store-grid').innerHTML = filtered.map(t => `
      <div class="cd-store-card" onclick="addWidgetFromTemplate(${t.TemplateID})">
        <div class="cd-store-card-icon">${t.Icon || '📦'}</div>
        <div class="cd-store-card-name">${t.Name}</div>
        <div class="cd-store-card-desc">${t.Description || ''}</div>
        <span class="cd-store-card-type">${t.Type}</span>
      </div>
    `).join('') || '<p class="wr-empty">No widgets found</p>';
  }

  window.setStoreCategory = function (cat) {
    storeCategory = cat;
    renderStore(document.getElementById('widget-search').value);
  };

  window.addWidgetFromTemplate = async function (templateId) {
    const template = templates.find(t => t.TemplateID === templateId);
    if (!template) return;
    // Open config modal
    openConfigModal(template);
  };

  // ── Config Modal ──
  let configState = {};

  function openConfigModal(template, existingWidget = null) {
    configState = { template, existingWidget };
    document.getElementById('config-modal-title').textContent = existingWidget ? `Configure: ${existingWidget.Title || template.Name}` : `Add: ${template.Name}`;

    let defaultConfig = {};
    try { defaultConfig = JSON.parse(template.DefaultConfig || '{}'); } catch {}
    if (existingWidget) {
      try { defaultConfig = { ...defaultConfig, ...JSON.parse(existingWidget.ConfigJSON || '{}') }; } catch {}
    }

    const body = document.getElementById('config-modal-body');
    body.innerHTML = `
      <div class="cd-form-grid">
        <label>Title <input type="text" id="cfg-title" value="${existingWidget?.Title || template.Name}" /></label>
        <label>Refresh Interval (seconds) <input type="number" id="cfg-refresh" value="${existingWidget?.RefreshInterval || 60}" min="0" /></label>
        <label>Width (grid columns, 1-12) <input type="number" id="cfg-width" value="${existingWidget?.Width || getDefaultSize(template.Type).w}" min="1" max="12" /></label>
        <label>Height (grid rows) <input type="number" id="cfg-height" value="${existingWidget?.Height || getDefaultSize(template.Type).h}" min="1" max="8" /></label>
        <label>Configuration (JSON)
          <div class="cd-var-input-wrap">
            <textarea id="cfg-json" rows="6">${JSON.stringify(defaultConfig, null, 2)}</textarea>
            <div class="cd-var-autocomplete" id="cfg-autocomplete"></div>
          </div>
        </label>
      </div>
    `;

    // Setup variable autocomplete on the JSON textarea
    setupVariableAutocomplete(document.getElementById('cfg-json'));

    closeModal('modal-add-widget');
    document.getElementById('modal-widget-config').style.display = '';
  }

  function getDefaultSize(type) {
    const sizes = {
      kpi: { w: 2, h: 2 }, gauge: { w: 2, h: 3 }, chart: { w: 4, h: 3 },
      table: { w: 4, h: 3 }, list: { w: 3, h: 3 }, status: { w: 3, h: 2 },
      text: { w: 3, h: 3 }, iframe: { w: 4, h: 4 }, 'api-poll': { w: 3, h: 2 }
    };
    return sizes[type] || { w: 2, h: 2 };
  }

  document.getElementById('btn-save-config').addEventListener('click', async () => {
    const title = document.getElementById('cfg-title').value;
    const refresh = parseInt(document.getElementById('cfg-refresh').value) || 60;
    const width = parseInt(document.getElementById('cfg-width').value) || 2;
    const height = parseInt(document.getElementById('cfg-height').value) || 2;
    let config;
    try { config = JSON.parse(document.getElementById('cfg-json').value); } catch { toast('Invalid JSON config'); return; }

    if (configState.existingWidget) {
      // Update existing
      const res = await window.apiFetch(`/api/widgets/instances/${configState.existingWidget.InstanceID}`, {
        method: 'PUT', body: JSON.stringify({ title, config, refreshInterval: refresh })
      });
      if (res && res.ok) { toast('Widget updated!'); closeModal('modal-widget-config'); await loadDashboard(); renderWidgets(); }
    } else {
      // Add new
      const nextY = widgets.length ? Math.max(...widgets.map(w => w.PositionY + (w.Height || 2))) : 0;
      const res = await window.apiFetch(`/api/dashboards/${dashboardId}/widgets`, {
        method: 'POST', body: JSON.stringify({
          templateId: configState.template.TemplateID, title, config, x: 0, y: nextY, width, height, refreshInterval: refresh
        })
      });
      if (res && res.ok) { toast('Widget added!'); closeModal('modal-widget-config'); await loadDashboard(); renderWidgets(); }
    }
  });

  // ── Widget Actions ──
  window.widgetConfigure = function (instanceId) {
    const w = widgets.find(wi => wi.InstanceID === instanceId);
    if (!w) return;
    const tmpl = templates.find(t => t.TemplateID === w.TemplateID) || { Name: w.TemplateName, Type: w.Type, DefaultConfig: w.DefaultConfig };
    openConfigModal(tmpl, w);
  };

  window.widgetRemove = async function (instanceId) {
    if (!confirm('Remove this widget?')) return;
    const res = await window.apiFetch(`/api/widgets/instances/${instanceId}`, { method: 'DELETE' });
    if (res && res.ok) { toast('Widget removed'); await loadDashboard(); renderWidgets(); }
  };

  // ── Variable Autocomplete ──
  function setupVariableAutocomplete(textarea) {
    const acEl = document.getElementById('cfg-autocomplete');
    textarea.addEventListener('input', () => {
      const val = textarea.value;
      const cursorPos = textarea.selectionStart;
      const before = val.substring(0, cursorPos);
      const match = before.match(/\{\{(\w*)$/);

      if (match) {
        const query = match[1].toLowerCase();
        const filtered = variables.filter(v => v.Name.toLowerCase().includes(query));
        let html = filtered.map(v =>
          `<div class="cd-var-ac-item" data-name="${v.Name}"><span class="name">{{${v.Name}}}</span><span class="val">${v.Type === 'secret' ? '••••' : v.Value}</span></div>`
        ).join('');

        if (query && !variables.find(v => v.Name.toLowerCase() === query)) {
          html += `<div class="cd-var-ac-create" data-name="${query}">＋ Create variable "${query}"</div>`;
        }

        acEl.innerHTML = html;
        acEl.classList.add('open');

        // Click handlers
        acEl.querySelectorAll('.cd-var-ac-item').forEach(item => {
          item.onclick = () => {
            const name = item.dataset.name;
            const afterCursor = val.substring(cursorPos);
            const newBefore = before.replace(/\{\{\w*$/, `{{${name}}}`);
            textarea.value = newBefore + afterCursor;
            textarea.selectionStart = textarea.selectionEnd = newBefore.length;
            acEl.classList.remove('open');
            textarea.focus();
          };
        });
        acEl.querySelectorAll('.cd-var-ac-create').forEach(item => {
          item.onclick = () => {
            acEl.classList.remove('open');
            // Quick create variable
            quickCreateVariable(item.dataset.name);
          };
        });
      } else {
        acEl.classList.remove('open');
      }
    });

    textarea.addEventListener('blur', () => { setTimeout(() => acEl.classList.remove('open'), 200); });
  }

  async function quickCreateVariable(name) {
    const value = prompt(`Enter value for variable "${name}":`);
    if (value == null) return;
    const res = await window.apiFetch('/api/widgets/variables', {
      method: 'POST', body: JSON.stringify({ name, displayName: name, value, type: 'text' })
    });
    if (res && res.ok) { toast(`Variable "${name}" created!`); await loadVariables(); }
  }

  // ── Variables Modal ──
  function openVariablesModal() {
    document.getElementById('modal-variables').style.display = '';
    renderVariablesList();
  }

  function renderVariablesList(search = '') {
    let filtered = variables;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(v => v.Name.toLowerCase().includes(q) || (v.DisplayName || '').toLowerCase().includes(q));
    }

    const grouped = {};
    filtered.forEach(v => {
      const cat = v.Category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(v);
    });

    let html = '';
    for (const [cat, vars] of Object.entries(grouped)) {
      html += `<h4 style="margin:1rem 0 0.5rem;color:var(--text-secondary);font-size:0.8rem;text-transform:uppercase">${cat}</h4>`;
      html += `<table class="cd-var-table"><thead><tr><th>Name</th><th>Value</th><th>Type</th><th>Refs</th><th></th></tr></thead><tbody>`;
      vars.forEach(v => {
        const displayVal = v.Type === 'secret' ? '••••••' : (v.Value.length > 40 ? v.Value.slice(0, 40) + '…' : v.Value);
        html += `<tr>
          <td><span class="cd-var-name-pill">{{${v.Name}}}</span></td>
          <td title="${v.Value}">${displayVal}</td>
          <td><span class="cd-var-cat">${v.Type}</span></td>
          <td class="cd-var-refs">${v.ReferenceCount || 0} widget${(v.ReferenceCount || 0) !== 1 ? 's' : ''}</td>
          <td class="cd-var-actions">
            <button class="cd-widget-action" onclick="editVariable(${v.VariableID})">✏️</button>
            <button class="cd-widget-action danger" onclick="deleteVariable(${v.VariableID})">🗑️</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
    }

    if (!filtered.length) html = '<p class="wr-empty">No variables yet. Create one to get started.</p>';
    document.getElementById('var-list').innerHTML = html;
  }

  window.editVariable = function (id) {
    const v = variables.find(vr => vr.VariableID === id);
    if (!v) return;
    const form = document.getElementById('var-form');
    form.style.display = '';
    document.getElementById('var-form-title').textContent = 'Edit Variable';
    document.getElementById('var-name').value = v.Name;
    document.getElementById('var-name').disabled = true;
    document.getElementById('var-display').value = v.DisplayName;
    document.getElementById('var-value').value = v.Value;
    document.getElementById('var-type').value = v.Type;
    document.getElementById('var-category').value = v.Category || '';
    document.getElementById('var-description').value = v.Description || '';
    form.dataset.editId = id;
  };

  window.deleteVariable = async function (id) {
    if (!confirm('Delete this variable?')) return;
    const res = await window.apiFetch(`/api/widgets/variables/${id}`, { method: 'DELETE' });
    if (res && res.ok) { toast('Variable deleted'); await loadVariables(); renderVariablesList(document.getElementById('var-search').value); }
  };

  // ── Event Listeners ──
  function setupEventListeners() {
    document.getElementById('btn-edit-mode').addEventListener('click', toggleEditMode);
    document.getElementById('btn-add-widget').addEventListener('click', openStore);
    document.getElementById('btn-save-layout').addEventListener('click', saveLayout);
    document.getElementById('btn-variables').addEventListener('click', openVariablesModal);
    document.getElementById('widget-search').addEventListener('input', e => renderStore(e.target.value));
    document.getElementById('var-search').addEventListener('input', e => renderVariablesList(e.target.value));

    document.getElementById('btn-add-var').addEventListener('click', () => {
      const form = document.getElementById('var-form');
      form.style.display = '';
      form.dataset.editId = '';
      document.getElementById('var-form-title').textContent = 'New Variable';
      document.getElementById('var-name').value = '';
      document.getElementById('var-name').disabled = false;
      document.getElementById('var-display').value = '';
      document.getElementById('var-value').value = '';
      document.getElementById('var-type').value = 'text';
      document.getElementById('var-category').value = '';
      document.getElementById('var-description').value = '';
    });

    document.getElementById('btn-save-var').addEventListener('click', async () => {
      const form = document.getElementById('var-form');
      const editId = form.dataset.editId;
      const data = {
        name: document.getElementById('var-name').value.trim(),
        displayName: document.getElementById('var-display').value.trim(),
        value: document.getElementById('var-value').value,
        type: document.getElementById('var-type').value,
        category: document.getElementById('var-category').value.trim() || null,
        description: document.getElementById('var-description').value.trim() || null,
      };
      if (!data.name || !data.displayName) { toast('Name and display name are required'); return; }

      let res;
      if (editId) {
        res = await window.apiFetch(`/api/widgets/variables/${editId}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        res = await window.apiFetch('/api/widgets/variables', { method: 'POST', body: JSON.stringify(data) });
      }
      if (res && res.ok) {
        toast(editId ? 'Variable updated!' : 'Variable created!');
        form.style.display = 'none';
        await loadVariables();
        renderVariablesList(document.getElementById('var-search').value);
      } else {
        const err = await res?.json().catch(() => ({}));
        toast(err.message || 'Failed to save variable');
      }
    });
  }

  // ── Utils ──
  function toast(msg) {
    let el = document.querySelector('.cd-toast');
    if (!el) { el = document.createElement('div'); el.className = 'cd-toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }

  window.closeModal = function (id) {
    document.getElementById(id).style.display = 'none';
  };

  // Close modal on overlay click
  document.querySelectorAll('.cd-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
  });

  // Toast style
  const style = document.createElement('style');
  style.textContent = `.cd-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:var(--color-accent);color:#fff;padding:0.6rem 1.5rem;border-radius:var(--radius-md);font-weight:600;font-size:0.85rem;z-index:9999;opacity:0;transition:all 0.3s ease;pointer-events:none}.cd-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}`;
  document.head.appendChild(style);

  // Boot
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
