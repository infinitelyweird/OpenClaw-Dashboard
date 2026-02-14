const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const router = express.Router();

router.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!email.endsWith('@infinitelyweird.com')) {
    return res.status(400).json({ message: 'Invalid email domain. Must be @infinitelyweird.com.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const pool = await sql.connect({
      user: 'openclaw',
      password: 'ix4bw4riEiDrDMxwmNoD',
      server: '192.168.0.100',
      database: 'TaskDashboard',
    });

    await pool.request()
      .input('Username', sql.NVarChar, username)
      .input('PasswordHash', sql.NVarChar, hashedPassword)
      .input('Email', sql.NVarChar, email)
      .query(`INSERT INTO Users (Username, PasswordHash, Email, IsApproved, CreatedAt) 
              VALUES (@Username, @PasswordHash, @Email, 0, GETDATE())`);

    res.status(200).json({ message: 'Registration successful! Pending admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error during registration process.' });
  }
});

module.exports = router;