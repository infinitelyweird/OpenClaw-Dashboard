const express = require('express');
const si = require('systeminformation');
const os = require('os');
const { sql, getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use('/api/widgets', authenticateToken);

// ─── SYSTEM STATS ────────────────────────────────────────

router.get('/api/widgets/system/cpu', async (req, res) => {
  try {
    const load = await si.currentLoad();
    const cpuInfo = await si.cpu();
    res.json({
      currentLoad: Math.round(load.currentLoad * 10) / 10,
      cores: os.cpus().length,
      model: cpuInfo.brand,
      speed: cpuInfo.speed,
      perCore: load.cpus.map((c, i) => ({ core: i, load: Math.round(c.load * 10) / 10 }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get CPU stats.' });
  }
});

router.get('/api/widgets/system/memory', async (req, res) => {
  try {
    const mem = await si.mem();
    res.json({
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      usedPercent: Math.round((mem.used / mem.total) * 1000) / 10,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get memory stats.' });
  }
});

router.get('/api/widgets/system/storage', async (req, res) => {
  try {
    const disks = await si.fsSize();
    res.json(disks.map(d => ({
      fs: d.fs,
      mount: d.mount,
      type: d.type,
      size: d.size,
      used: d.used,
      available: d.available,
      usedPercent: Math.round(d.use * 10) / 10
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get storage stats.' });
  }
});

router.get('/api/widgets/system/network', async (req, res) => {
  try {
    const nets = await si.networkStats();
    res.json(nets.map(n => ({
      iface: n.iface,
      rxBytes: n.rx_bytes,
      txBytes: n.tx_bytes,
      rxSec: n.rx_sec,
      txSec: n.tx_sec
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get network stats.' });
  }
});

router.get('/api/widgets/system/os', async (req, res) => {
  try {
    const osInfo = await si.osInfo();
    const time = await si.time();
    res.json({
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch,
      hostname: os.hostname(),
      uptime: os.uptime(),
      uptimeFormatted: formatUptime(os.uptime()),
      timezone: time.timezone
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get OS info.' });
  }
});

router.get('/api/widgets/system/processes', async (req, res) => {
  try {
    const procs = await si.processes();
    res.json({
      all: procs.all,
      running: procs.running,
      blocked: procs.blocked,
      sleeping: procs.sleeping,
      topCpu: procs.list.sort((a, b) => b.cpu - a.cpu).slice(0, 5).map(p => ({
        name: p.name, pid: p.pid, cpu: Math.round(p.cpu * 10) / 10, mem: Math.round(p.mem * 10) / 10
      })),
      topMem: procs.list.sort((a, b) => b.mem - a.mem).slice(0, 5).map(p => ({
        name: p.name, pid: p.pid, cpu: Math.round(p.cpu * 10) / 10, mem: Math.round(p.mem * 10) / 10
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get process info.' });
  }
});

// ─── USER MANAGEMENT STATS ──────────────────────────────

router.get('/api/widgets/users/stats', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN IsApproved = 1 THEN 1 ELSE 0 END) AS approvedUsers,
        SUM(CASE WHEN IsApproved = 0 THEN 1 ELSE 0 END) AS pendingUsers,
        (SELECT COUNT(*) FROM Roles) AS totalRoles,
        (SELECT COUNT(*) FROM Groups) AS totalGroups
      FROM Users
    `);
    const recent = await pool.request().query(`
      SELECT TOP 5 Username, Email, IsApproved, CreatedAt
      FROM Users ORDER BY CreatedAt DESC
    `);
    res.json({ ...result.recordset[0], recentUsers: recent.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get user stats.' });
  }
});

// ─── OPENCLAW STATUS ────────────────────────────────────

router.get('/api/widgets/openclaw/status', async (req, res) => {
  try {
    const pool = await getPool();
    const taskStats = await pool.request().query(`
      SELECT
        COUNT(*) AS totalTasks,
        SUM(CASE WHEN Status = 'Open' THEN 1 ELSE 0 END) AS openTasks,
        SUM(CASE WHEN Status = 'In Progress' THEN 1 ELSE 0 END) AS inProgressTasks,
        SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) AS completedTasks,
        SUM(CASE WHEN Priority = 1 THEN 1 ELSE 0 END) AS p1Tasks,
        SUM(CASE WHEN Priority = 2 THEN 1 ELSE 0 END) AS p2Tasks,
        SUM(CASE WHEN Priority = 3 THEN 1 ELSE 0 END) AS p3Tasks,
        SUM(CASE WHEN Priority = 4 THEN 1 ELSE 0 END) AS p4Tasks
      FROM Tasks
    `);

    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    res.json({
      server: {
        status: 'operational',
        uptime: formatUptime(uptime),
        uptimeSeconds: Math.floor(uptime),
        nodeVersion: process.version,
        memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        pid: process.pid
      },
      tasks: taskStats.recordset[0],
      database: { status: 'connected', name: 'TaskDashboard' }
    });
  } catch (err) {
    console.error(err);
    res.json({
      server: { status: 'operational', uptime: formatUptime(process.uptime()), nodeVersion: process.version, pid: process.pid },
      tasks: {},
      database: { status: 'error', message: err.message }
    });
  }
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

module.exports = router;
