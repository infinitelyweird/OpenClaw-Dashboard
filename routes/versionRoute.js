const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const versionPath = path.join(__dirname, '..', 'version.json');

router.get('/api/version', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read version info' });
  }
});

router.get('/api/health', (req, res) => {
  let version = '0.0.0';
  try { version = JSON.parse(fs.readFileSync(versionPath, 'utf-8')).version; } catch(e) {}
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: version,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
