// widget-renderers.js — Render engine for custom dashboard widgets
(function () {
  'use strict';

  // ── Helpers ──
  function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
  }

  function fmtBytes(b) {
    if (!b) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
  }

  function statusColor(val, thresholds, invert) {
    if (!thresholds) return 'var(--color-accent)';
    if (invert) {
      if (val <= thresholds.critical) return 'var(--color-danger)';
      if (val <= thresholds.warning) return 'var(--color-warning)';
      return 'var(--color-success)';
    }
    if (val >= thresholds.critical) return 'var(--color-danger)';
    if (val >= thresholds.warning) return 'var(--color-warning)';
    return 'var(--color-success)';
  }

  // ── Variable resolution ──
  async function resolveVariables(text) {
    if (!text || !text.includes('{{')) return text;
    try {
      const res = await window.apiFetch('/api/widgets/variables/resolve', {
        method: 'POST', body: JSON.stringify({ text })
      });
      if (res && res.ok) {
        const data = await res.json();
        return data.resolved || text;
      }
    } catch (e) { }
    return text;
  }

  async function resolveConfig(config) {
    if (!config) return config;
    const resolved = {};
    for (const [k, v] of Object.entries(config)) {
      if (typeof v === 'string') resolved[k] = await resolveVariables(v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) resolved[k] = await resolveConfig(v);
      else resolved[k] = v;
    }
    return resolved;
  }

  // ── Fetch data ──
  async function fetchWidgetData(dataSource, config) {
    if (!dataSource) return null;
    let url = await resolveVariables(dataSource);
    try {
      const res = await window.apiFetch(url);
      if (!res || !res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  // ═══════════════════════════════════════════════════════
  // RENDERERS
  // ═══════════════════════════════════════════════════════

  // ── KPI ──
  function renderKPI(container, data, config) {
    let value = '';
    if (config.format === 'time') {
      const tz = config.timezone || 'UTC';
      value = new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else if (config.format === 'countdown') {
      const target = new Date(config.targetDate);
      const diff = target - Date.now();
      if (diff <= 0) { value = 'Expired'; }
      else {
        const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000);
        value = `${d}d ${h}h ${m}m`;
      }
    } else if (data && config.valuePath) {
      value = getNestedValue(data, config.valuePath);
      if (typeof value === 'number') value = Math.round(value * 10) / 10;
    } else if (config.value != null) {
      value = config.value;
    }

    const unit = config.unit || '';
    const label = config.label || '';
    let secondaryHtml = '';
    if (config.secondaryPaths && data) {
      secondaryHtml = '<div class="wr-kpi-secondary">' +
        config.secondaryPaths.map(s => {
          const v = getNestedValue(data, s.path);
          return `<span class="wr-kpi-sub"><span class="wr-kpi-sub-val">${v != null ? (typeof v === 'number' ? Math.round(v * 10) / 10 : v) : '—'}</span><span class="wr-kpi-sub-label">${s.label}${s.unit ? ' ' + s.unit : ''}</span></span>`;
        }).join('') + '</div>';
    }

    container.innerHTML = `
      <div class="wr-kpi">
        <div class="wr-kpi-value">${value != null ? value : '—'}<span class="wr-kpi-unit">${unit}</span></div>
        <div class="wr-kpi-label">${label}</div>
        ${secondaryHtml}
      </div>`;
  }

  // ── Gauge ──
  function renderGauge(container, data, config) {
    let value = 0;
    if (config.compute && data) {
      try {
        const expr = config.compute.replace(/([a-zA-Z_][\w.]*)/g, (m) => {
          const v = getNestedValue(data, m);
          return v != null ? v : 0;
        });
        value = Math.round(eval(expr) * 10) / 10;
      } catch { value = 0; }
    } else if (data && config.valuePath) {
      value = getNestedValue(data, config.valuePath) || 0;
      if (typeof value === 'number') value = Math.round(value * 10) / 10;
    }

    const max = config.max || 100;
    const pct = Math.min(value / max, 1);
    const color = statusColor(value, config.thresholds, config.invertThresholds);
    const r = 54, c = 2 * Math.PI * r;
    const offset = c * (1 - pct * 0.75); // 270 degree arc

    container.innerHTML = `
      <div class="wr-gauge">
        <svg viewBox="0 0 120 120" class="wr-gauge-svg">
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"
            stroke-dasharray="${c * 0.75} ${c * 0.25}" stroke-linecap="round" transform="rotate(135 60 60)"/>
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10"
            stroke-dasharray="${c * 0.75 * pct} ${c}" stroke-linecap="round" transform="rotate(135 60 60)"
            style="transition: stroke-dasharray 0.6s ease"/>
        </svg>
        <div class="wr-gauge-text">
          <div class="wr-gauge-value">${value}<span class="wr-gauge-unit">${config.unit || ''}</span></div>
          <div class="wr-gauge-label">${config.label || ''}</div>
        </div>
      </div>`;
  }

  // ── Chart ──
  const historyCache = {};

  function renderChart(container, data, config, instanceId) {
    const chartType = config.chartType || 'line';

    if (chartType === 'donut' || chartType === 'pie') {
      renderDonut(container, data, config);
      return;
    }

    if (chartType === 'bar' && config.dataMap) {
      renderBarFromMap(container, data, config);
      return;
    }

    // Line or bar chart with canvas
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    container.innerHTML = '';
    container.appendChild(canvas);

    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      const w = rect.width, h = rect.height;

      if (config.history && data) {
        // Accumulate history
        const key = instanceId || 'default';
        if (!historyCache[key]) historyCache[key] = [];
        const val = config.valuePath ? getNestedValue(data, config.valuePath) : 0;
        historyCache[key].push(val);
        if (historyCache[key].length > (config.maxPoints || 30)) historyCache[key].shift();
        drawLineChart(ctx, w, h, historyCache[key], config.label || '', 'rgba(167,139,250,0.8)');
      } else if (Array.isArray(data)) {
        // Bar chart from array
        const labels = data.map(d => getNestedValue(d, config.labelPath || 'label') || '');
        const values = data.map(d => getNestedValue(d, config.valuePath || 'value') || 0);
        drawBarChart(ctx, w, h, labels, values);
      }
    });
  }

  function drawLineChart(ctx, w, h, points, label, color) {
    if (!points.length) return;
    const pad = { t: 10, r: 10, b: 25, l: 40 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const max = Math.max(...points, 1);

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(max - (max / 4) * i), pad.l - 5, y + 3);
    }

    // Line
    const stepX = cw / Math.max(points.length - 1, 1);
    ctx.beginPath();
    points.forEach((v, i) => {
      const x = pad.l + i * stepX;
      const y = pad.t + ch - (v / max) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill
    const lastX = pad.l + (points.length - 1) * stepX;
    ctx.lineTo(lastX, pad.t + ch);
    ctx.lineTo(pad.l, pad.t + ch);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
    grad.addColorStop(0, color.replace('0.8', '0.3'));
    grad.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, h - 5);
  }

  function drawBarChart(ctx, w, h, labels, values) {
    const pad = { t: 10, r: 10, b: 40, l: 40 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const max = Math.max(...values, 1);
    const barW = Math.max(cw / values.length - 6, 8);
    const colors = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#38bdf8'];

    ctx.clearRect(0, 0, w, h);
    values.forEach((v, i) => {
      const x = pad.l + (cw / values.length) * i + (cw / values.length - barW) / 2;
      const bh = (v / max) * ch;
      const y = pad.t + ch - bh;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]);
      ctx.fill();
      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '9px Inter';
      ctx.textAlign = 'center';
      const lbl = labels[i].length > 8 ? labels[i].slice(0, 7) + '…' : labels[i];
      ctx.fillText(lbl, x + barW / 2, h - pad.b + 14);
    });
  }

  function renderDonut(container, data, config) {
    if (!config.dataMap || !data) { container.innerHTML = '<p class="wr-empty">No data</p>'; return; }
    const entries = Object.entries(config.dataMap).map(([label, path]) => ({
      label, value: getNestedValue(data, path) || 0
    }));
    const total = entries.reduce((s, e) => s + e.value, 0);
    if (!total) { container.innerHTML = '<p class="wr-empty">No data</p>'; return; }

    const colors = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc'];
    const size = 100;
    const r = 38, cx = 50, cy = 50, sw = 12;
    let startAngle = -Math.PI / 2;
    let arcs = '';

    entries.forEach((e, i) => {
      const angle = (e.value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
      const large = angle > Math.PI ? 1 : 0;
      arcs += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" 
               fill="none" stroke="${colors[i % colors.length]}" stroke-width="${sw}" stroke-linecap="round"/>`;
      startAngle = endAngle;
    });

    const legend = entries.map((e, i) =>
      `<div class="wr-donut-item"><span class="wr-donut-dot" style="background:${colors[i % colors.length]}"></span>${e.label}: ${e.value}</div>`
    ).join('');

    container.innerHTML = `
      <div class="wr-donut">
        <svg viewBox="0 0 ${size} ${size}" class="wr-donut-svg">${arcs}
          <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="var(--text-primary)" font-size="14" font-weight="700">${total}</text>
        </svg>
        <div class="wr-donut-legend">${legend}</div>
      </div>`;
  }

  function renderBarFromMap(container, data, config) {
    if (!config.dataMap || !data) { container.innerHTML = '<p class="wr-empty">No data</p>'; return; }
    const entries = Object.entries(config.dataMap).map(([label, path]) => ({
      label, value: getNestedValue(data, path) || 0
    }));
    const max = Math.max(...entries.map(e => e.value), 1);
    const colors = ['#f87171', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa', '#c084fc'];

    container.innerHTML = `<div class="wr-bars">${entries.map((e, i) => `
      <div class="wr-bar-row">
        <span class="wr-bar-label">${e.label}</span>
        <div class="wr-bar-track"><div class="wr-bar-fill" style="width:${(e.value / max) * 100}%;background:${colors[i % colors.length]}">${e.value}</div></div>
      </div>`).join('')}</div>`;
  }

  // ── Table ──
  function renderTable(container, data, config) {
    let rows = data;
    if (config.dataPath) rows = getNestedValue(data, config.dataPath);
    if (!Array.isArray(rows) || !rows.length) { container.innerHTML = '<p class="wr-empty">No data available</p>'; return; }

    const cols = config.columns || Object.keys(rows[0]);
    container.innerHTML = `
      <div class="wr-table-wrap">
        <table class="wr-table">
          <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${rows.slice(0, 50).map(r => `<tr>${cols.map(c => `<td>${r[c] != null ? r[c] : '—'}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  // ── List ──
  function renderList(container, data, config) {
    // Quick Links
    if (config.links) {
      container.innerHTML = `<div class="wr-list">${config.links.map(l =>
        `<a href="${l.url}" target="_blank" rel="noopener" class="wr-list-item wr-list-link">${l.icon || '🔗'} ${l.label}</a>`
      ).join('')}</div>`;
      return;
    }

    let items = data;
    if (config.dataPath) items = getNestedValue(data, config.dataPath);
    if (!Array.isArray(items) || !items.length) { container.innerHTML = '<p class="wr-empty">No items</p>'; return; }

    const tpl = config.itemTemplate || '{{.}}';
    container.innerHTML = `<div class="wr-list">${items.slice(0, 20).map(item => {
      let text = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => item[k] != null ? item[k] : '');
      return `<div class="wr-list-item">${text}</div>`;
    }).join('')}</div>`;
  }

  // ── Status ──
  function renderStatus(container, data, config) {
    if (config.services) {
      // Fetch each service
      const checks = config.services.map(async s => {
        try {
          const res = await window.apiFetch(s.url);
          return { name: s.name, ok: res && res.ok };
        } catch { return { name: s.name, ok: false }; }
      });
      Promise.all(checks).then(results => {
        container.innerHTML = `<div class="wr-status-list">${results.map(r =>
          `<div class="wr-status-item"><span class="wr-status-dot ${r.ok ? 'green' : 'red'}"></span>${r.name}</div>`
        ).join('')}</div>`;
      });
      return;
    }

    if (data && config.statusPath != null) {
      const val = getNestedValue(data, config.statusPath);
      const ok = val === true || val === 'enabled' || val === 'active' || val === 'operational';
      container.innerHTML = `<div class="wr-status-list"><div class="wr-status-item"><span class="wr-status-dot ${ok ? 'green' : 'red'}"></span>${config.label || 'Status'}: ${ok ? 'Active' : 'Inactive'}</div></div>`;
      return;
    }

    if (Array.isArray(data)) {
      container.innerHTML = `<div class="wr-status-list">${data.map(d => {
        const name = getNestedValue(d, config.namePath || 'name') || '—';
        const status = getNestedValue(d, config.statusPath || 'status') || 'unknown';
        const color = status === 'success' || status === 'active' || status === 'running' ? 'green' :
                      status === 'warning' || status === 'pending' ? 'yellow' : 'red';
        return `<div class="wr-status-item"><span class="wr-status-dot ${color}"></span>${name}: ${status}</div>`;
      }).join('')}</div>`;
      return;
    }

    container.innerHTML = '<p class="wr-empty">No status data</p>';
  }

  // ── Text (Markdown-lite) ──
  function renderText(container, data, config) {
    let content = config.content || '';
    // Simple markdown: headers, bold, italic, links, code, lists
    content = content
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
    container.innerHTML = `<div class="wr-text">${content}</div>`;
  }

  // ── Iframe ──
  function renderIframe(container, data, config) {
    const url = config.url || '';
    if (!url) { container.innerHTML = '<p class="wr-empty">No URL configured</p>'; return; }
    container.innerHTML = `<iframe src="${url}" class="wr-iframe" sandbox="${config.sandbox || 'allow-scripts allow-same-origin'}" loading="lazy"></iframe>`;
  }

  // ── API Poll ──
  function renderApiPoll(container, data, config) {
    if (config.interactive) {
      if (!container.querySelector('.wr-poll-input')) {
        container.innerHTML = `
          <div class="wr-poll">
            <div class="wr-poll-form">
              <input type="text" class="wr-poll-input" placeholder="${config.placeholder || 'Enter value...'}" />
              <button class="wr-poll-btn">Go</button>
            </div>
            <div class="wr-poll-result"></div>
          </div>`;
        const btn = container.querySelector('.wr-poll-btn');
        const input = container.querySelector('.wr-poll-input');
        const resultDiv = container.querySelector('.wr-poll-result');
        btn.onclick = async () => {
          const val = input.value.trim();
          if (!val) return;
          const url = (config.endpoint || '').replace('{{input}}', encodeURIComponent(val));
          try {
            const res = await window.apiFetch(url);
            if (res && res.ok) {
              const d = await res.json();
              resultDiv.textContent = config.jsonPath ? (getNestedValue(d, config.jsonPath) || JSON.stringify(d)) : JSON.stringify(d, null, 2);
            } else {
              resultDiv.textContent = 'Error fetching data';
            }
          } catch { resultDiv.textContent = 'Request failed'; }
        };
      }
      return;
    }

    // Non-interactive: show fetched data
    if (data != null) {
      const val = config.jsonPath ? getNestedValue(data, config.jsonPath) : data;
      const display = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
      container.innerHTML = `<div class="wr-kpi"><div class="wr-kpi-value">${display}</div><div class="wr-kpi-label">${config.label || ''}</div></div>`;
    } else {
      container.innerHTML = '<p class="wr-empty">No endpoint configured</p>';
    }
  }

  // ═══════════════════════════════════════════════════════
  // MAIN RENDER DISPATCHER
  // ═══════════════════════════════════════════════════════

  const renderers = {
    kpi: renderKPI,
    gauge: renderGauge,
    chart: renderChart,
    table: renderTable,
    list: renderList,
    status: renderStatus,
    text: renderText,
    iframe: renderIframe,
    'api-poll': renderApiPoll,
  };

  async function renderWidget(container, widget) {
    const type = widget.Type || widget.type;
    const renderer = renderers[type];
    if (!renderer) { container.innerHTML = `<p class="wr-empty">Unknown type: ${type}</p>`; return; }

    let config = {};
    try { config = JSON.parse(widget.DefaultConfig || '{}'); } catch {}
    try {
      const overrides = JSON.parse(widget.ConfigJSON || '{}');
      config = { ...config, ...overrides };
    } catch {}

    config = await resolveConfig(config);

    const dataSource = widget.DataSource || config.endpoint;
    let data = null;
    if (dataSource) data = await fetchWidgetData(dataSource, config);

    renderer(container, data, config, widget.InstanceID || widget.instanceId);
  }

  // Expose
  window.WidgetRenderers = {
    render: renderWidget,
    renderers,
    resolveVariables,
    resolveConfig,
    getNestedValue,
  };
})();
