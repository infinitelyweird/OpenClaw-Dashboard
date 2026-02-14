const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const { sql, getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use('/api/speedtest', authenticateToken);

const SPEEDTEST_BIN = path.join(__dirname, '..', 'bin', 'speedtest.exe');
let isRunning = false;
let intervalTimer = null;
let intervalMinutes = 30; // default

// Run a speed test
function runSpeedTest() {
  return new Promise((resolve, reject) => {
    if (isRunning) return reject(new Error('Speed test already in progress.'));
    isRunning = true;
    execFile(SPEEDTEST_BIN, ['--accept-license', '--accept-gdpr', '--format=json'], { timeout: 120000 }, async (err, stdout) => {
      isRunning = false;
      if (err) return reject(err);
      try {
        const data = JSON.parse(stdout);
        const result = {
          downloadMbps: Math.round((data.download.bandwidth * 8 / 1000000) * 100) / 100,
          uploadMbps: Math.round((data.upload.bandwidth * 8 / 1000000) * 100) / 100,
          pingMs: Math.round(data.ping.latency * 100) / 100,
          jitterMs: Math.round((data.ping.jitter || 0) * 100) / 100,
          serverName: `${data.server.name} (${data.server.location})`,
          isp: data.isp,
          externalIP: data.interface.externalIp
        };

        // Store in DB
        const pool = await getPool();
        await pool.request()
          .input('DownloadMbps', sql.Float, result.downloadMbps)
          .input('UploadMbps', sql.Float, result.uploadMbps)
          .input('PingMs', sql.Float, result.pingMs)
          .input('JitterMs', sql.Float, result.jitterMs)
          .input('ServerName', sql.NVarChar, result.serverName)
          .input('ISP', sql.NVarChar, result.isp)
          .input('ExternalIP', sql.NVarChar, result.externalIP)
          .query(`INSERT INTO SpeedTests (DownloadMbps, UploadMbps, PingMs, JitterMs, ServerName, ISP, ExternalIP)
                  VALUES (@DownloadMbps, @UploadMbps, @PingMs, @JitterMs, @ServerName, @ISP, @ExternalIP)`);

        resolve(result);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

// Get latest result + history
router.get('/api/speedtest/history', async (req, res) => {
  try {
    const pool = await getPool();
    const limit = parseInt(req.query.limit) || 50;
    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .query('SELECT TOP (@Limit) * FROM SpeedTests ORDER BY TestedAt DESC');
    res.json({
      results: result.recordset,
      isRunning,
      intervalMinutes,
      autoEnabled: intervalTimer !== null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load speed test history.' });
  }
});

// Trigger a manual speed test
router.post('/api/speedtest/run', async (req, res) => {
  try {
    res.json({ message: 'Speed test started.', status: 'running' });
    // Run async — don't block the response
    runSpeedTest().then(() => console.log('Speed test completed.')).catch(e => console.error('Speed test error:', e.message));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get status (is running, interval, etc.)
router.get('/api/speedtest/status', (req, res) => {
  res.json({ isRunning, intervalMinutes, autoEnabled: intervalTimer !== null });
});

// Configure auto-polling interval
router.post('/api/speedtest/configure', (req, res) => {
  const { minutes, enabled } = req.body;

  if (minutes !== undefined) {
    const m = parseInt(minutes);
    if (m < 1 || m > 1440) return res.status(400).json({ message: 'Interval must be 1–1440 minutes.' });
    intervalMinutes = m;
  }

  if (enabled === false) {
    if (intervalTimer) { clearInterval(intervalTimer); intervalTimer = null; }
    return res.json({ message: 'Auto speed test disabled.', intervalMinutes, autoEnabled: false });
  }

  // (Re)start interval
  if (intervalTimer) clearInterval(intervalTimer);
  intervalTimer = setInterval(() => {
    runSpeedTest().then(() => console.log('Auto speed test completed.')).catch(e => console.error('Auto speed test error:', e.message));
  }, intervalMinutes * 60 * 1000);

  res.json({ message: `Auto speed test enabled every ${intervalMinutes} minutes.`, intervalMinutes, autoEnabled: true });
});

module.exports = router;
