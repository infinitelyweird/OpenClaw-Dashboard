const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = 'iw-devops-secret-key-change-in-production';

const dbConfig = {
  user: 'openclaw',
  password: 'ix4bw4riEiDrDMxwmNoD',
  server: '192.168.0.100',
  database: 'TaskDashboard',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: 'MSSQLSERVER01'
  }
};

router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query('SELECT UserID, Username, PasswordHash, IsApproved FROM Users WHERE Username = @Username');

    if (result.recordset.length === 0) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    const user = result.recordset[0];

    if (!user.IsApproved) {
      return res.status(403).json({ message: 'Your account is awaiting Administrator approval.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign({ userId: user.UserID, username: user.Username }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ message: 'Login successful!', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
