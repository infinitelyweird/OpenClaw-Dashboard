const express = require('express');
const { sql, getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All notification routes require auth
router.use('/api/notifications', authenticateToken);

// ── GET /api/notifications — list notifications (recent, with unread count) ──
router.get('/api/notifications', async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    // Unread count
    const countResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT COUNT(*) AS unreadCount FROM Notifications WHERE UserId = @userId AND IsRead = 0');

    // Recent notifications
    const notifs = await pool.request()
      .input('userId', sql.Int, userId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) Id, Type, Title, Message, Link, IsRead, CreatedAt
        FROM Notifications
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
      `);

    res.json({
      unreadCount: countResult.recordset[0].unreadCount,
      notifications: notifs.recordset
    });
  } catch (err) {
    console.error('[NOTIFICATIONS]', err.message);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});

// ── POST /api/notifications/read/:id — mark one as read ──
router.post('/api/notifications/read/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('userId', sql.Int, req.user.userId)
      .query('UPDATE Notifications SET IsRead = 1 WHERE Id = @id AND UserId = @userId');
    res.json({ ok: true });
  } catch (err) {
    console.error('[NOTIFICATIONS]', err.message);
    res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
});

// ── POST /api/notifications/read-all — mark all as read ──
router.post('/api/notifications/read-all', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('UPDATE Notifications SET IsRead = 1 WHERE UserId = @userId AND IsRead = 0');
    res.json({ ok: true });
  } catch (err) {
    console.error('[NOTIFICATIONS]', err.message);
    res.status(500).json({ message: 'Failed to mark all as read.' });
  }
});

// ── DELETE /api/notifications/:id — delete one ──
router.delete('/api/notifications/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('userId', sql.Int, req.user.userId)
      .query('DELETE FROM Notifications WHERE Id = @id AND UserId = @userId');
    res.json({ ok: true });
  } catch (err) {
    console.error('[NOTIFICATIONS]', err.message);
    res.status(500).json({ message: 'Failed to delete notification.' });
  }
});

// ── POST /api/notifications — create notification (admin or internal use) ──
router.post('/api/notifications', async (req, res) => {
  try {
    const { userId, type, title, message, link } = req.body;
    if (!userId || !title) return res.status(400).json({ message: 'userId and title are required.' });

    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('type', sql.NVarChar(50), type || 'info')
      .input('title', sql.NVarChar(200), title)
      .input('message', sql.NVarChar(sql.MAX), message || null)
      .input('link', sql.NVarChar(500), link || null)
      .query(`
        INSERT INTO Notifications (UserId, Type, Title, Message, Link)
        OUTPUT INSERTED.Id
        VALUES (@userId, @type, @title, @message, @link)
      `);

    res.status(201).json({ ok: true, id: result.recordset[0].Id });
  } catch (err) {
    console.error('[NOTIFICATIONS]', err.message);
    res.status(500).json({ message: 'Failed to create notification.' });
  }
});

// ── Helper: create notification from other server-side code ──
async function createNotification(userId, type, title, message, link) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('type', sql.NVarChar(50), type)
      .input('title', sql.NVarChar(200), title)
      .input('message', sql.NVarChar(sql.MAX), message || null)
      .input('link', sql.NVarChar(500), link || null)
      .query('INSERT INTO Notifications (UserId, Type, Title, Message, Link) VALUES (@userId, @type, @title, @message, @link)');
  } catch (err) {
    console.error('[NOTIFICATION CREATE]', err.message);
  }
}

router.createNotification = createNotification;
module.exports = router;
