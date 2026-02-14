const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');

const JWT_SECRET = 'iw-devops-secret-key-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = decoded;
    next();
  });
}

async function requireAdmin(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.userId)
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

    if (result.recordset.length === 0) {
      return res.status(403).json({ message: 'Administrator access required.' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { authenticateToken, requireAdmin, JWT_SECRET };
