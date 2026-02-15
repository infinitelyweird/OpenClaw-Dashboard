// seeds/widget-templates.js — Seed built-in widget templates
const { sql, getPool } = require('../db');

const templates = [
  // ── Monitoring ──
  { name: 'CPU Usage Gauge', desc: 'Real-time CPU utilization gauge', category: 'monitoring', type: 'gauge', icon: '🔥', dataSource: '/api/widgets/system/cpu', config: { valuePath: 'currentLoad', label: 'CPU', unit: '%', thresholds: { warning: 70, critical: 90 } } },
  { name: 'Memory Usage Gauge', desc: 'Real-time memory utilization gauge', category: 'monitoring', type: 'gauge', icon: '🧠', dataSource: '/api/widgets/system/memory', config: { valuePath: 'usedPercent', label: 'Memory', unit: '%', thresholds: { warning: 70, critical: 90 } } },
  { name: 'Disk Usage Bars', desc: 'Storage usage per mount point', category: 'monitoring', type: 'chart', icon: '💾', dataSource: '/api/widgets/system/storage', config: { chartType: 'bar', labelPath: 'mount', valuePath: 'usedPercent', unit: '%' } },
  { name: 'System Uptime', desc: 'System uptime display', category: 'monitoring', type: 'kpi', icon: '⏱️', dataSource: '/api/widgets/system/os', config: { valuePath: 'uptimeFormatted', label: 'Uptime' } },
  { name: 'Process Count', desc: 'Total running processes', category: 'monitoring', type: 'kpi', icon: '⚡', dataSource: '/api/widgets/system/processes', config: { valuePath: 'all', label: 'Processes' } },
  { name: 'CPU History Chart', desc: 'CPU usage over time', category: 'monitoring', type: 'chart', icon: '📈', dataSource: '/api/widgets/system/cpu', config: { chartType: 'line', history: true, maxPoints: 30, valuePath: 'currentLoad', label: 'CPU %' } },
  { name: 'Memory History Chart', desc: 'Memory usage over time', category: 'monitoring', type: 'chart', icon: '📉', dataSource: '/api/widgets/system/memory', config: { chartType: 'line', history: true, maxPoints: 30, valuePath: 'usedPercent', label: 'Mem %' } },
  { name: 'Top Processes Table', desc: 'Top CPU/memory consuming processes', category: 'monitoring', type: 'table', icon: '📋', dataSource: '/api/widgets/system/processes', config: { dataPath: 'topCpu', columns: ['name', 'pid', 'cpu', 'mem'] } },
  { name: 'Service Status Checker', desc: 'Check status of configured services', category: 'monitoring', type: 'status', icon: '🟢', dataSource: null, config: { services: [{ name: 'Web Server', url: '/api/widgets/openclaw/status' }] } },

  // ── Network ──
  { name: 'Speed Test Latest', desc: 'Latest speed test results', category: 'network', type: 'kpi', icon: '📶', dataSource: '/api/speedtest/latest', config: { valuePath: 'download', label: 'Download', unit: 'Mbps', secondaryPaths: [{ path: 'upload', label: 'Upload' }, { path: 'ping', label: 'Ping', unit: 'ms' }] } },
  { name: 'Speed Test History Chart', desc: 'Speed test trends over time', category: 'network', type: 'chart', icon: '📈', dataSource: '/api/speedtest/history', config: { chartType: 'line', labelPath: 'timestamp', series: [{ valuePath: 'download', label: 'Download' }, { valuePath: 'upload', label: 'Upload' }] } },
  { name: 'Bandwidth Monitor', desc: 'Real-time network rx/tx', category: 'network', type: 'chart', icon: '🌐', dataSource: '/api/widgets/system/network', config: { chartType: 'line', history: true, maxPoints: 30, series: [{ valuePath: '0.rxSec', label: 'RX' }, { valuePath: '0.txSec', label: 'TX' }] } },
  { name: 'Network Interfaces', desc: 'List of network interfaces and stats', category: 'network', type: 'list', icon: '🔌', dataSource: '/api/widgets/system/network', config: { itemTemplate: '{{iface}}: RX {{rxBytes}} / TX {{txBytes}}' } },
  { name: 'DNS Lookup Tool', desc: 'Interactive DNS lookup', category: 'network', type: 'api-poll', icon: '🔍', dataSource: null, config: { interactive: true, placeholder: 'Enter hostname...', endpoint: '/api/network/dns?host={{input}}' } },
  { name: 'External IP Display', desc: 'Your external IP address', category: 'network', type: 'kpi', icon: '🌍', dataSource: '/api/network/external-ip', config: { valuePath: 'ip', label: 'External IP' } },
  { name: 'Ping Monitor', desc: 'Ping latency to a configurable host', category: 'network', type: 'gauge', icon: '📡', dataSource: '/api/network/ping?host={{host}}', config: { valuePath: 'latency', label: 'Ping', unit: 'ms', max: 200, host: '8.8.8.8', thresholds: { warning: 50, critical: 150 } } },

  // ── Security ──
  { name: 'Security Score', desc: 'Overall security posture score', category: 'security', type: 'gauge', icon: '🛡️', dataSource: '/api/network-security/score', config: { valuePath: 'score', label: 'Security', max: 100, thresholds: { warning: 60, critical: 40 }, invertThresholds: true } },
  { name: 'Open Ports Scanner', desc: 'Table of open ports', category: 'security', type: 'table', icon: '🔓', dataSource: '/api/network-security/ports', config: { columns: ['port', 'protocol', 'service', 'state'] } },
  { name: 'Failed Login Attempts', desc: 'Failed login attempts over time', category: 'security', type: 'chart', icon: '⚠️', dataSource: '/api/admin/audit-logs?action=login_failed', config: { chartType: 'bar', labelPath: 'date', valuePath: 'count' } },
  { name: 'Recent Audit Events', desc: 'Latest audit log entries', category: 'security', type: 'list', icon: '📜', dataSource: '/api/admin/audit-logs?limit=10', config: { itemTemplate: '{{action}} by {{username}} at {{timestamp}}', dataPath: 'logs' } },
  { name: 'SSL Certificate Checker', desc: 'Check SSL cert expiry for URLs', category: 'security', type: 'status', icon: '🔒', dataSource: null, config: { urls: ['https://localhost'] } },
  { name: 'Firewall Status', desc: 'Firewall rules and status', category: 'security', type: 'status', icon: '🧱', dataSource: '/api/network-security/firewall', config: { statusPath: 'enabled', label: 'Firewall' } },

  // ── Tasks & Projects ──
  { name: 'Active Tasks Count', desc: 'Number of active tasks', category: 'tasks', type: 'kpi', icon: '✅', dataSource: '/api/widgets/openclaw/status', config: { valuePath: 'tasks.openTasks', label: 'Active Tasks' } },
  { name: 'Tasks by Status', desc: 'Task distribution by status', category: 'tasks', type: 'chart', icon: '🍩', dataSource: '/api/widgets/openclaw/status', config: { chartType: 'donut', dataMap: { 'Open': 'tasks.openTasks', 'In Progress': 'tasks.inProgressTasks', 'Completed': 'tasks.completedTasks' } } },
  { name: 'Tasks by Priority', desc: 'Task distribution by priority', category: 'tasks', type: 'chart', icon: '🎯', dataSource: '/api/widgets/openclaw/status', config: { chartType: 'bar', dataMap: { 'P1 Critical': 'tasks.p1Tasks', 'P2 High': 'tasks.p2Tasks', 'P3 Medium': 'tasks.p3Tasks', 'P4 Low': 'tasks.p4Tasks' } } },
  { name: 'My Tasks', desc: 'Your assigned tasks', category: 'tasks', type: 'list', icon: '📋', dataSource: '/api/tasks?assignedToMe=true', config: { itemTemplate: '{{Title}} — {{Status}}', dataPath: 'tasks' } },
  { name: 'Recent Task Activity', desc: 'Latest task updates', category: 'tasks', type: 'list', icon: '🔄', dataSource: '/api/tasks?sort=updated&limit=10', config: { itemTemplate: '{{Title}} updated {{UpdatedAt}}', dataPath: 'tasks' } },
  { name: 'Overdue Tasks', desc: 'Tasks past their due date', category: 'tasks', type: 'table', icon: '🚨', dataSource: '/api/tasks?overdue=true', config: { dataPath: 'tasks', columns: ['Title', 'DueDate', 'Priority', 'AssignedTo'] } },
  { name: 'Task Completion Rate', desc: 'Percentage of completed tasks', category: 'tasks', type: 'gauge', icon: '📊', dataSource: '/api/widgets/openclaw/status', config: { compute: 'tasks.completedTasks / tasks.totalTasks * 100', label: 'Completion', unit: '%' } },

  // ── Deployment ──
  { name: 'Recent Deployments', desc: 'Latest deployment history', category: 'deployment', type: 'list', icon: '🚀', dataSource: '/api/deployments?limit=10', config: { itemTemplate: '{{name}} → {{environment}} ({{status}})', dataPath: 'deployments' } },
  { name: 'Deployment Success Rate', desc: 'Deployment success percentage', category: 'deployment', type: 'gauge', icon: '✅', dataSource: '/api/deployments/stats', config: { valuePath: 'successRate', label: 'Success Rate', unit: '%' } },
  { name: 'Pipeline Status', desc: 'Current pipeline statuses', category: 'deployment', type: 'status', icon: '🔄', dataSource: '/api/deployments/pipelines', config: { namePath: 'name', statusPath: 'status' } },
  { name: 'Deploy Frequency', desc: 'Deployments per day/week', category: 'deployment', type: 'chart', icon: '📊', dataSource: '/api/deployments/frequency', config: { chartType: 'bar', labelPath: 'date', valuePath: 'count' } },

  // ── Custom / Utility ──
  { name: 'Markdown Note', desc: 'User-editable markdown note', category: 'custom', type: 'text', icon: '📝', dataSource: null, config: { content: '# My Note\n\nEdit this widget to add your content.', editable: true } },
  { name: 'Iframe Embed', desc: 'Embed any webpage', category: 'custom', type: 'iframe', icon: '🖼️', dataSource: null, config: { url: 'https://example.com', sandbox: 'allow-scripts allow-same-origin' } },
  { name: 'API Poller', desc: 'Poll any API endpoint and display result', category: 'custom', type: 'api-poll', icon: '🔗', dataSource: null, config: { endpoint: '', jsonPath: '', label: 'API Result', method: 'GET' } },
  { name: 'Clock / Timezone', desc: 'Current time in a timezone', category: 'custom', type: 'kpi', icon: '🕐', dataSource: null, config: { timezone: 'America/New_York', label: 'Local Time', format: 'time' } },
  { name: 'Countdown Timer', desc: 'Countdown to a target date', category: 'custom', type: 'kpi', icon: '⏳', dataSource: null, config: { targetDate: '2026-12-31T00:00:00', label: 'Countdown', format: 'countdown' } },
  { name: 'RSS Feed Reader', desc: 'Display items from an RSS feed', category: 'custom', type: 'list', icon: '📰', dataSource: null, config: { feedUrl: '', maxItems: 10 } },
  { name: 'Quick Links', desc: 'Configurable list of links', category: 'custom', type: 'list', icon: '🔗', dataSource: null, config: { links: [{ label: 'Google', url: 'https://google.com', icon: '🔍' }] } },
  { name: 'Custom KPI', desc: 'Display a value from any API', category: 'custom', type: 'kpi', icon: '🎯', dataSource: null, config: { endpoint: '', jsonPath: '', label: 'Custom KPI', unit: '' } },
];

async function seed() {
  const pool = await getPool();
  for (const t of templates) {
    // Check if already exists
    const exists = await pool.request()
      .input('name', sql.NVarChar, t.name)
      .query('SELECT TemplateID FROM WidgetTemplates WHERE Name = @name AND IsSystem = 1');
    if (exists.recordset.length > 0) continue;

    await pool.request()
      .input('name', sql.NVarChar, t.name)
      .input('desc', sql.NVarChar, t.desc)
      .input('category', sql.NVarChar, t.category)
      .input('type', sql.NVarChar, t.type)
      .input('icon', sql.NVarChar, t.icon)
      .input('config', sql.NVarChar, JSON.stringify(t.config))
      .input('dataSource', sql.NVarChar, t.dataSource)
      .query(`INSERT INTO WidgetTemplates (Name, Description, Category, Type, Icon, DefaultConfig, DataSource, IsSystem)
              VALUES (@name, @desc, @category, @type, @icon, @config, @dataSource, 1)`);
  }
  console.log(`Seeded ${templates.length} widget templates.`);
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seed, templates };
