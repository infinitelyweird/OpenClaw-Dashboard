const { sql, getPool } = require('../db');

async function logAudit(action, userId, details, req) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    userId: userId || null,
    ip: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null,
    userAgent: req ? req.headers['user-agent'] : null,
    details: typeof details === 'string' ? details : JSON.stringify(details)
  };

  // Always log to console
  console.log(`[AUDIT] ${entry.timestamp} | ${entry.action} | User:${entry.userId} | IP:${entry.ip} | ${entry.details}`);

  // Try to log to database (non-blocking, don't fail the request)
  try {
    const pool = await getPool();
    await pool.request()
      .input('Action', sql.NVarChar(100), entry.action)
      .input('UserID', sql.Int, entry.userId)
      .input('IPAddress', sql.NVarChar(45), entry.ip)
      .input('UserAgent', sql.NVarChar(500), entry.userAgent)
      .input('Details', sql.NVarChar(sql.MAX), entry.details)
      .input('CreatedAt', sql.DateTime, new Date())
      .query(`INSERT INTO AuditLog (Action, UserID, IPAddress, UserAgent, Details, CreatedAt) 
              VALUES (@Action, @UserID, @IPAddress, @UserAgent, @Details, @CreatedAt)`);
  } catch (err) {
    console.error('[AUDIT] Failed to write to database:', err.message);
  }
}

// Audit actions constants
const AUDIT = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_UNAPPROVED: 'LOGIN_UNAPPROVED',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  USER_APPROVED: 'USER_APPROVED',
  USER_DENIED: 'USER_DENIED',
  USER_UPDATED: 'USER_UPDATED',
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_DELETED: 'ROLE_DELETED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REMOVED: 'ROLE_REMOVED',
  GROUP_CREATED: 'GROUP_CREATED',
  GROUP_DELETED: 'GROUP_DELETED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  AVATAR_UPLOADED: 'AVATAR_UPLOADED',
};

module.exports = { logAudit, AUDIT };
