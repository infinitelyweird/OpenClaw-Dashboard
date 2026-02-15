const express = require('express');
const { sql, getPool } = require('../db');
const router = express.Router();

// Get a random snark phrase by category
router.get('/api/snark/random', async (req, res) => {
  try {
    const category = req.query.category || 'login_fail';
    const pool = await getPool();
    const result = await pool.request()
      .input('Category', sql.NVarChar, category)
      .query('SELECT TOP 1 Phrase FROM SnarkPhrases WHERE Category = @Category ORDER BY NEWID()');
    
    if (result.recordset.length === 0) {
      return res.json({ phrase: 'Wrong. Just... wrong.' });
    }
    res.json({ phrase: result.recordset[0].Phrase });
  } catch (err) {
    console.error(err);
    res.json({ phrase: 'Something went wrong. Probably your fault.' });
  }
});

module.exports = router;
