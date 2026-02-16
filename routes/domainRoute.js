const express = require('express');
const { sql, getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use('/api/domains', authenticateToken);

const MONITORED_DOMAINS_TABLE = `
CREATE TABLE MonitoredDomains (
  DomainID INT IDENTITY(1,1) PRIMARY KEY,
  DomainName NVARCHAR(255) NOT NULL,
  Enabled BIT NOT NULL DEFAULT 1,
  CheckFrequency INT NOT NULL DEFAULT 60,
  CreatedAt DATETIME DEFAULT GETDATE(),
  UpdatedAt DATETIME DEFAULT GETDATE()
);
`;

// Endpoint to get all monitored domains
router.get('/api/domains', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM MonitoredDomains ORDER BY CreatedAt DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve domain list', error: err.message });
  }
});

// Endpoint to add a domain
router.post('/api/domains', requireAdmin, async (req, res) => {
  try {
    const { domainName, enabled = true, checkFrequency = 60 } = req.body;
    if (!domainName) return res.status(400).json({ message: 'Domain name is required.' });

    const pool = await getPool();
    const result = await pool.request()
      .input('DomainName', sql.NVarChar, domainName)
      .input('Enabled', sql.Bit, enabled)
      .input('CheckFrequency', sql.Int, checkFrequency)
      .query(`INSERT INTO MonitoredDomains (DomainName, Enabled, CheckFrequency)
              OUTPUT INSERTED.*
              VALUES (@DomainName, @Enabled, @CheckFrequency)`);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add domain', error: err.message });
  }
});

// Endpoint to update a domain
router.put('/api/domains/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { domainName, enabled, checkFrequency } = req.body;

    const pool = await getPool();
    const result = await pool.request()
      .input('DomainID', sql.Int, id)
      .input('DomainName', sql.NVarChar, domainName || null)
      .input('Enabled', sql.Bit, enabled == null ? null : enabled)
      .input('CheckFrequency', sql.Int, checkFrequency || null)
      .query(`UPDATE MonitoredDomains 
              SET DomainName = ISNULL(@DomainName, DomainName),
                  Enabled = ISNULL(@Enabled, Enabled),
                  CheckFrequency = ISNULL(@CheckFrequency, CheckFrequency),
                  UpdatedAt = GETDATE()
              OUTPUT INSERTED.*
              WHERE DomainID = @DomainID`);

    if (!result.recordset.length) return res.status(404).json({ message: 'Domain not found.' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update domain', error: err.message });
  }
});

// Endpoint to delete a domain
router.delete('/api/domains/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    await pool.request()
      .input('DomainID', sql.Int, id)
      .query('DELETE FROM MonitoredDomains WHERE DomainID = @DomainID');

    res.json({ message: 'Domain deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete domain', error: err.message });
  }
});

module.exports = router;
