const express = require('express');
const { sql, getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ─── TASKS ───────────────────────────────────────────────

// List all tasks (with tags, filterable)
router.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const { status, priority, assignedTo, tag } = req.query;
    let where = [];
    const request = pool.request();

    if (status) {
      request.input('Status', sql.NVarChar, status);
      where.push('t.Status = @Status');
    }
    if (priority) {
      request.input('Priority', sql.NVarChar, priority);
      where.push('t.Priority = @Priority');
    }
    if (assignedTo) {
      request.input('AssignedTo', sql.Int, parseInt(assignedTo));
      where.push('t.AssignedTo = @AssignedTo');
    }
    if (tag) {
      request.input('TagName', sql.NVarChar, tag);
      where.push(`t.TaskID IN (SELECT tt.TaskID FROM TaskTags tt INNER JOIN Tags tg ON tt.TagID = tg.TagID WHERE tg.TagName = @TagName)`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const result = await request.query(`
      SELECT t.TaskID, t.Title, t.Description, t.Status, t.Priority,
        t.AssignedTo, t.CreatedBy, t.CreatedAt, t.UpdatedAt,
        u1.Username AS AssignedToName,
        u2.Username AS CreatedByName,
        (SELECT STRING_AGG(tg.TagName, ', ') FROM Tags tg
         INNER JOIN TaskTags tt ON tg.TagID = tt.TagID WHERE tt.TaskID = t.TaskID) AS Tags,
        (SELECT STRING_AGG(CAST(tg.TagID AS VARCHAR), ',') FROM Tags tg
         INNER JOIN TaskTags tt ON tg.TagID = tt.TagID WHERE tt.TaskID = t.TaskID) AS TagIDs
      FROM Tasks t
      LEFT JOIN Users u1 ON t.AssignedTo = u1.UserID
      LEFT JOIN Users u2 ON t.CreatedBy = u2.UserID
      ${whereClause}
      ORDER BY t.CreatedAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load tasks.' });
  }
});

// Get single task with tags
router.get('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('TaskID', sql.Int, req.params.id)
      .query(`
        SELECT t.TaskID, t.Title, t.Description, t.Status, t.Priority,
          t.AssignedTo, t.CreatedBy, t.CreatedAt, t.UpdatedAt,
          u1.Username AS AssignedToName,
          u2.Username AS CreatedByName
        FROM Tasks t
        LEFT JOIN Users u1 ON t.AssignedTo = u1.UserID
        LEFT JOIN Users u2 ON t.CreatedBy = u2.UserID
        WHERE t.TaskID = @TaskID
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Task not found.' });

    const tags = await pool.request()
      .input('TaskID', sql.Int, req.params.id)
      .query('SELECT tg.TagID, tg.TagName FROM Tags tg INNER JOIN TaskTags tt ON tg.TagID = tt.TagID WHERE tt.TaskID = @TaskID');

    res.json({ ...result.recordset[0], tags: tags.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load task.' });
  }
});

// Create task
router.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, status, priority, assignedTo } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required.' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Title', sql.NVarChar, title)
      .input('Description', sql.NVarChar, description || '')
      .input('Status', sql.NVarChar, status || 'Open')
      .input('Priority', sql.NVarChar, priority || 'Medium')
      .input('AssignedTo', sql.Int, assignedTo || null)
      .input('CreatedBy', sql.Int, req.user.userId)
      .query(`INSERT INTO Tasks (Title, Description, Status, Priority, AssignedTo, CreatedBy, CreatedAt, UpdatedAt)
              OUTPUT INSERTED.TaskID
              VALUES (@Title, @Description, @Status, @Priority, @AssignedTo, @CreatedBy, GETDATE(), GETDATE())`);
    res.json({ message: 'Task created.', taskId: result.recordset[0].TaskID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create task.' });
  }
});

// Update task
router.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { title, description, status, priority, assignedTo } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('TaskID', sql.Int, req.params.id)
      .input('Title', sql.NVarChar, title)
      .input('Description', sql.NVarChar, description || '')
      .input('Status', sql.NVarChar, status)
      .input('Priority', sql.NVarChar, priority)
      .input('AssignedTo', sql.Int, assignedTo || null)
      .query(`UPDATE Tasks SET Title = @Title, Description = @Description, Status = @Status,
              Priority = @Priority, AssignedTo = @AssignedTo, UpdatedAt = GETDATE()
              WHERE TaskID = @TaskID`);
    res.json({ message: 'Task updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update task.' });
  }
});

// Delete task
router.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);
    await pool.request().input('TaskID', sql.Int, id).query('DELETE FROM TaskTags WHERE TaskID = @TaskID');
    await pool.request().input('TaskID', sql.Int, id).query('DELETE FROM Tasks WHERE TaskID = @TaskID');
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete task.' });
  }
});

// ─── TASK TAGS ───────────────────────────────────────────

// Assign tag to task
router.post('/api/tasks/:id/tags/:tagId', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('TaskID', sql.Int, req.params.id)
      .input('TagID', sql.Int, req.params.tagId)
      .query('IF NOT EXISTS (SELECT 1 FROM TaskTags WHERE TaskID=@TaskID AND TagID=@TagID) INSERT INTO TaskTags (TaskID, TagID) VALUES (@TaskID, @TagID)');
    res.json({ message: 'Tag assigned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to assign tag.' });
  }
});

// Remove tag from task
router.delete('/api/tasks/:id/tags/:tagId', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('TaskID', sql.Int, req.params.id)
      .input('TagID', sql.Int, req.params.tagId)
      .query('DELETE FROM TaskTags WHERE TaskID=@TaskID AND TagID=@TagID');
    res.json({ message: 'Tag removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove tag.' });
  }
});

// ─── TAGS ────────────────────────────────────────────────

// List all tags
router.get('/api/tags', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TagID, TagName FROM Tags ORDER BY TagName');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load tags.' });
  }
});

// Create tag
router.post('/api/tags', authenticateToken, async (req, res) => {
  const { tagName } = req.body;
  if (!tagName) return res.status(400).json({ message: 'Tag name is required.' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('TagName', sql.NVarChar, tagName)
      .query('INSERT INTO Tags (TagName) OUTPUT INSERTED.TagID VALUES (@TagName)');
    res.json({ message: 'Tag created.', tagId: result.recordset[0].TagID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create tag.' });
  }
});

// Delete tag (admin only)
router.delete('/api/tags/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);
    await pool.request().input('TagID', sql.Int, id).query('DELETE FROM TaskTags WHERE TagID = @TagID');
    await pool.request().input('TagID', sql.Int, id).query('DELETE FROM Tags WHERE TagID = @TagID');
    res.json({ message: 'Tag deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete tag.' });
  }
});

// ─── USERS (for assignment dropdown) ─────────────────────

router.get('/api/tasks/users/list', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT UserID, Username FROM Users WHERE IsApproved = 1 ORDER BY Username');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load users.' });
  }
});

module.exports = router;
