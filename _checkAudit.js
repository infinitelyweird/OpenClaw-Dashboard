require('dotenv').config();
const { getPool } = require('./db');
const { sql } = require('mssql');
(async () => {
  const pool = await getPool();
  const token = '<AUTH_TOKEN>'; // Replace with your valid authentication token if required

  try {
    const result = await pool.request()
      .query(`
        SELECT TOP 10 Action, UserID, IPAddress, UserAgent, Details, CreatedAt 
        FROM AuditLog 
        WHERE Action = 'LOGIN_FAILED'
        ORDER BY CreatedAt DESC
      `);

    console.log(result.recordset);
  } catch (err) {
    console.error('Error fetching audit log entries:', err.message);
  } finally {
    process.exit();
  }
})();
