const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const router = express.Router();

router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await getPool();
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

    // Check if user is admin
    const adminCheck = await pool.request()
      .input('UserID', sql.Int, user.UserID)
      .query(`
        SELECT r.RoleName FROM Roles r
        INNER JOIN UserRoles ur ON r.RoleID = ur.RoleID
        WHERE ur.UserID = @UserID AND r.RoleName = 'Administrator'
        UNION
        SELECT r.RoleName FROM Roles r
        INNER JOIN GroupRoles gr ON r.RoleID = gr.RoleID
        INNER JOIN UserGroups ug ON gr.GroupID = ug.GroupID
        WHERE ug.UserID = @UserID AND r.RoleName = 'Administrator'
      `);

    const isAdmin = adminCheck.recordset.length > 0;

    const token = jwt.sign(
      { userId: user.UserID, username: user.Username, isAdmin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(200).json({ message: 'Login successful!', token, isAdmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
