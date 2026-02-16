const express = require('express');
const si = require('systeminformation');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use('/api/network', authenticateToken);
router.use('/api/security', authenticateToken);

// --- NETWORK ---

// GET /api/network/interfaces — all network interfaces with stats
router.get('/api/network/interfaces', async (req, res) => {
  try {
    const [interfaces, stats] = await Promise.all([
      si.networkInterfaces(), si.networkStats()
    ]);
    res.json({ interfaces, stats });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/network/connections — active network connections
router.get('/api/network/connections', async (req, res) => {
  try {
    const connections = await si.networkConnections();
    res.json(connections.slice(0, 200)); // limit to 200
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/network/gateway — default gateway info
router.get('/api/network/gateway', async (req, res) => {
  try {
    const gw = await si.networkGatewayDefault();
    res.json(gw);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/network/stats — real-time rx/tx stats
router.get('/api/network/stats', async (req, res) => {
  try {
    const stats = await si.networkStats();
    res.json(stats);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- SECURITY ---

// GET /api/security/failed-logins — failed login attempts
router.get('/api/security/failed-logins', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT TOP 10 Action, UserID, IPAddress, UserAgent, Details, CreatedAt 
              FROM AuditLog 
              WHERE Action = 'LOGIN_FAILED'
              ORDER BY CreatedAt DESC`);
    const logins = result.recordset.map(row => ({
      username: JSON.parse(row.Details)?.username || 'Unknown',
      ipAddress: row.IPAddress,
      userAgent: row.UserAgent,
      timestamp: row.CreatedAt
    }));
    res.json({ count: logins.length, logins });
  } catch (err) {
    console.error('[SECURITY] Failed to fetch failed logins:', err.message);
    res.status(500).json({ message: 'Failed to get failed logins.' });
  }
});

// GET /api/security/open-ports — listening ports
router.get('/api/security/open-ports', async (req, res) => {
  try {
    const connections = await si.networkConnections();
    const listening = connections.filter(c => c.state === 'LISTEN' || c.state === 'LISTENING');
    res.json(listening);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/security/processes — running processes (for suspicious process detection)
router.get('/api/security/processes', async (req, res) => {
  try {
    const procs = await si.processes();
    res.json({ all: procs.all, running: procs.running, list: procs.list.slice(0, 100) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/security/system — OS info, firewall-relevant data
router.get('/api/security/system', async (req, res) => {
  try {
    const [os, users, versions] = await Promise.all([
      si.osInfo(), si.users(), si.versions()
    ]);
    res.json({ os, loggedInUsers: users, versions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/security/services — running services
router.get('/api/security/services', async (req, res) => {
  try {
    const services = await si.services('*');
    res.json(services.slice(0, 100));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
