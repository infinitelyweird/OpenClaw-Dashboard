const express = require('express');
const bcrypt = require('bcrypt');
const { sql, getPool } = require('../db');
const { registerRules } = require('../middleware/validate');
const { logAudit, AUDIT } = require('../middleware/audit');
const router = express.Router();

router.post('/api/register', ...registerRules, async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const pool = await getPool();

    // Check for duplicate username or email
    const existing = await pool.request()
      .input('Username', sql.NVarChar, username)
      .input('Email', sql.NVarChar, email)
      .query('SELECT UserID FROM Users WHERE Username = @Username OR Email = @Email');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.request()
      .input('Username2', sql.NVarChar, username)
      .input('PasswordHash', sql.NVarChar, hashedPassword)
      .input('Email2', sql.NVarChar, email)
      .query(`INSERT INTO Users (Username, PasswordHash, Email, IsApproved, CreatedAt) 
              VALUES (@Username2, @PasswordHash, @Email2, 0, GETDATE())`);

    logAudit(AUDIT.REGISTER, null, { username, email }, req);
    res.status(200).json({ message: 'Registration successful! Pending admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error during registration process.' });
  }
});

module.exports = router;
