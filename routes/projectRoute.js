const express = require('express');
const { sql, getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// ─── PROJECTS ────────────────────────────────────────────

// List all projects (with member count, milestone progress)
router.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const { status } = req.query;
    const request = pool.request();
    let whereClause = '';

    if (status) {
      request.input('Status', sql.NVarChar, status);
      whereClause = 'WHERE p.Status = @Status';
    }

    const result = await request.query(`
      SELECT p.ProjectID, p.Name, p.Description, p.Status, p.Priority,
        p.StartDate, p.TargetDate, p.Progress, p.TeamLead, p.CreatedBy,
        p.CreatedAt, p.UpdatedAt,
        u1.Username AS TeamLeadName,
        u2.Username AS CreatedByName,
        (SELECT COUNT(*) FROM ProjectMembers pm WHERE pm.ProjectID = p.ProjectID) AS MemberCount,
        (SELECT COUNT(*) FROM ProjectMilestones ms WHERE ms.ProjectID = p.ProjectID) AS TotalMilestones,
        (SELECT COUNT(*) FROM ProjectMilestones ms WHERE ms.ProjectID = p.ProjectID AND ms.IsCompleted = 1) AS CompletedMilestones
      FROM Projects p
      LEFT JOIN Users u1 ON p.TeamLead = u1.UserID
      LEFT JOIN Users u2 ON p.CreatedBy = u2.UserID
      ${whereClause}
      ORDER BY p.CreatedAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load projects.' });
  }
});

// Get single project with members and milestones
router.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const projectId = parseInt(req.params.id);

    const project = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .query(`
        SELECT p.ProjectID, p.Name, p.Description, p.Status, p.Priority,
          p.StartDate, p.TargetDate, p.Progress, p.TeamLead, p.CreatedBy,
          p.CreatedAt, p.UpdatedAt,
          u1.Username AS TeamLeadName,
          u2.Username AS CreatedByName
        FROM Projects p
        LEFT JOIN Users u1 ON p.TeamLead = u1.UserID
        LEFT JOIN Users u2 ON p.CreatedBy = u2.UserID
        WHERE p.ProjectID = @ProjectID
      `);

    if (project.recordset.length === 0) return res.status(404).json({ message: 'Project not found.' });

    const members = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .query(`
        SELECT pm.UserID, pm.Role, pm.JoinedAt, u.Username
        FROM ProjectMembers pm
        INNER JOIN Users u ON pm.UserID = u.UserID
        WHERE pm.ProjectID = @ProjectID
        ORDER BY pm.Role, u.Username
      `);

    const milestones = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .query(`
        SELECT MilestoneID, Name, DueDate, IsCompleted, CompletedAt, CreatedAt
        FROM ProjectMilestones
        WHERE ProjectID = @ProjectID
        ORDER BY DueDate, CreatedAt
      `);

    res.json({
      ...project.recordset[0],
      members: members.recordset,
      milestones: milestones.recordset
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load project.' });
  }
});

// Create project
router.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, description, status, priority, startDate, targetDate, progress, teamLead } = req.body;
  if (!name) return res.status(400).json({ message: 'Project name is required.' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Name', sql.NVarChar, name)
      .input('Description', sql.NVarChar, description || null)
      .input('Status', sql.NVarChar, status || 'Active')
      .input('Priority', sql.NVarChar, priority || 'Medium')
      .input('StartDate', sql.Date, startDate || null)
      .input('TargetDate', sql.Date, targetDate || null)
      .input('Progress', sql.Int, progress || 0)
      .input('TeamLead', sql.Int, teamLead || null)
      .input('CreatedBy', sql.Int, req.user.userId)
      .query(`INSERT INTO Projects (Name, Description, Status, Priority, StartDate, TargetDate, Progress, TeamLead, CreatedBy, CreatedAt, UpdatedAt)
              OUTPUT INSERTED.ProjectID
              VALUES (@Name, @Description, @Status, @Priority, @StartDate, @TargetDate, @Progress, @TeamLead, @CreatedBy, GETDATE(), GETDATE())`);
    res.json({ message: 'Project created.', projectId: result.recordset[0].ProjectID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create project.' });
  }
});

// Update project
router.put('/api/projects/:id', authenticateToken, async (req, res) => {
  const { name, description, status, priority, startDate, targetDate, progress, teamLead } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('ProjectID', sql.Int, req.params.id)
      .input('Name', sql.NVarChar, name)
      .input('Description', sql.NVarChar, description || null)
      .input('Status', sql.NVarChar, status)
      .input('Priority', sql.NVarChar, priority)
      .input('StartDate', sql.Date, startDate || null)
      .input('TargetDate', sql.Date, targetDate || null)
      .input('Progress', sql.Int, progress || 0)
      .input('TeamLead', sql.Int, teamLead || null)
      .query(`UPDATE Projects SET Name = @Name, Description = @Description, Status = @Status,
              Priority = @Priority, StartDate = @StartDate, TargetDate = @TargetDate,
              Progress = @Progress, TeamLead = @TeamLead, UpdatedAt = GETDATE()
              WHERE ProjectID = @ProjectID`);
    res.json({ message: 'Project updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update project.' });
  }
});

// Delete project (creator only)
router.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const projectId = parseInt(req.params.id);

    // Check ownership
    const check = await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .input('UserID', sql.Int, req.user.userId)
      .query('SELECT CreatedBy FROM Projects WHERE ProjectID = @ProjectID');

    if (check.recordset.length === 0) return res.status(404).json({ message: 'Project not found.' });
    if (check.recordset[0].CreatedBy !== req.user.userId) {
      return res.status(403).json({ message: 'Only the project creator can delete this project.' });
    }

    await pool.request()
      .input('ProjectID', sql.Int, projectId)
      .query('DELETE FROM Projects WHERE ProjectID = @ProjectID');
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete project.' });
  }
});

// ─── PROJECT MEMBERS ─────────────────────────────────────

// Add member
router.post('/api/projects/:id/members', authenticateToken, async (req, res) => {
  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required.' });
  try {
    const pool = await getPool();
    await pool.request()
      .input('ProjectID', sql.Int, req.params.id)
      .input('UserID', sql.Int, userId)
      .input('Role', sql.NVarChar, role || 'Member')
      .query(`IF NOT EXISTS (SELECT 1 FROM ProjectMembers WHERE ProjectID = @ProjectID AND UserID = @UserID)
              INSERT INTO ProjectMembers (ProjectID, UserID, Role) VALUES (@ProjectID, @UserID, @Role)
              ELSE UPDATE ProjectMembers SET Role = @Role WHERE ProjectID = @ProjectID AND UserID = @UserID`);
    res.json({ message: 'Member added.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add member.' });
  }
});

// Remove member
router.delete('/api/projects/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('ProjectID', sql.Int, req.params.id)
      .input('UserID', sql.Int, req.params.userId)
      .query('DELETE FROM ProjectMembers WHERE ProjectID = @ProjectID AND UserID = @UserID');
    res.json({ message: 'Member removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove member.' });
  }
});

// ─── MILESTONES ──────────────────────────────────────────

// List milestones for a project
router.get('/api/projects/:id/milestones', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('ProjectID', sql.Int, req.params.id)
      .query(`SELECT MilestoneID, ProjectID, Name, DueDate, IsCompleted, CompletedAt, CreatedAt
              FROM ProjectMilestones WHERE ProjectID = @ProjectID
              ORDER BY DueDate, CreatedAt`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load milestones.' });
  }
});

// Create milestone
router.post('/api/projects/:id/milestones', authenticateToken, async (req, res) => {
  const { name, dueDate } = req.body;
  if (!name) return res.status(400).json({ message: 'Milestone name is required.' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('ProjectID', sql.Int, req.params.id)
      .input('Name', sql.NVarChar, name)
      .input('DueDate', sql.Date, dueDate || null)
      .query(`INSERT INTO ProjectMilestones (ProjectID, Name, DueDate)
              OUTPUT INSERTED.MilestoneID
              VALUES (@ProjectID, @Name, @DueDate)`);
    res.json({ message: 'Milestone created.', milestoneId: result.recordset[0].MilestoneID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create milestone.' });
  }
});

// Update milestone
router.put('/api/projects/milestones/:milestoneId', authenticateToken, async (req, res) => {
  const { name, dueDate, isCompleted } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('MilestoneID', sql.Int, req.params.milestoneId)
      .input('Name', sql.NVarChar, name)
      .input('DueDate', sql.Date, dueDate || null)
      .input('IsCompleted', sql.Bit, isCompleted ? 1 : 0)
      .query(`UPDATE ProjectMilestones SET Name = @Name, DueDate = @DueDate, IsCompleted = @IsCompleted,
              CompletedAt = CASE WHEN @IsCompleted = 1 THEN GETDATE() ELSE NULL END
              WHERE MilestoneID = @MilestoneID`);
    res.json({ message: 'Milestone updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update milestone.' });
  }
});

// Delete milestone
router.delete('/api/projects/milestones/:milestoneId', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('MilestoneID', sql.Int, req.params.milestoneId)
      .query('DELETE FROM ProjectMilestones WHERE MilestoneID = @MilestoneID');
    res.json({ message: 'Milestone deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete milestone.' });
  }
});

module.exports = router;
