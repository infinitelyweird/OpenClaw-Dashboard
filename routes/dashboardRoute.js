const express = require('express');
const { sql, getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All routes require auth
router.use('/api/dashboards', authenticateToken);
router.use('/api/widgets/templates', authenticateToken);
router.use('/api/widgets/instances', authenticateToken);
router.use('/api/widgets/variables', authenticateToken);

// ═══════════════════════════════════════════════════════════
// DASHBOARDS
// ═══════════════════════════════════════════════════════════

// List user's dashboards + shared
router.get('/api/dashboards', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`SELECT d.*, 
              (SELECT COUNT(*) FROM WidgetInstances WHERE DashboardID = d.DashboardID) AS WidgetCount,
              u.Username AS CreatedByName
              FROM Dashboards d
              LEFT JOIN Users u ON d.CreatedBy = u.UserID
              WHERE d.CreatedBy = @userId OR d.IsShared = 1
              ORDER BY d.IsDefault DESC, d.UpdatedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dashboards.' });
  }
});

// Create dashboard
router.post('/api/dashboards', async (req, res) => {
  try {
    const { name, description, icon, isShared } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('desc', sql.NVarChar, description || null)
      .input('icon', sql.NVarChar, icon || '📊')
      .input('shared', sql.Bit, isShared ? 1 : 0)
      .input('userId', sql.Int, req.user.userId)
      .query(`INSERT INTO Dashboards (Name, Description, Icon, IsShared, CreatedBy)
              OUTPUT INSERTED.*
              VALUES (@name, @desc, @icon, @shared, @userId)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create dashboard.' });
  }
});

// Get dashboard with widget instances
router.get('/api/dashboards/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const dash = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.userId)
      .query(`SELECT d.*, u.Username AS CreatedByName FROM Dashboards d
              LEFT JOIN Users u ON d.CreatedBy = u.UserID
              WHERE d.DashboardID = @id AND (d.CreatedBy = @userId OR d.IsShared = 1)`);
    if (!dash.recordset.length) return res.status(404).json({ message: 'Dashboard not found.' });

    const widgets = await pool.request()
      .input('dashId', sql.Int, req.params.id)
      .query(`SELECT wi.*, wt.Name AS TemplateName, wt.Type, wt.Icon AS TemplateIcon,
              wt.Category, wt.DefaultConfig, wt.DataSource
              FROM WidgetInstances wi
              JOIN WidgetTemplates wt ON wi.TemplateID = wt.TemplateID
              WHERE wi.DashboardID = @dashId
              ORDER BY wi.PositionY, wi.PositionX`);

    res.json({ ...dash.recordset[0], widgets: widgets.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dashboard.' });
  }
});

// Update dashboard
router.put('/api/dashboards/:id', async (req, res) => {
  try {
    const { name, description, icon, isShared } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.userId)
      .input('name', sql.NVarChar, name)
      .input('desc', sql.NVarChar, description || null)
      .input('icon', sql.NVarChar, icon || '📊')
      .input('shared', sql.Bit, isShared ? 1 : 0)
      .query(`UPDATE Dashboards SET Name=@name, Description=@desc, Icon=@icon, IsShared=@shared, UpdatedAt=GETDATE()
              WHERE DashboardID=@id AND CreatedBy=@userId`);
    res.json({ message: 'Updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update dashboard.' });
  }
});

// Delete dashboard (owner only)
router.delete('/api/dashboards/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.userId)
      .query('DELETE FROM Dashboards WHERE DashboardID=@id AND CreatedBy=@userId');
    if (!result.rowsAffected[0]) return res.status(403).json({ message: 'Not authorized or not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete dashboard.' });
  }
});

// Save layout (widget positions/sizes)
router.put('/api/dashboards/:id/layout', async (req, res) => {
  try {
    const { layout } = req.body; // array of { instanceId, x, y, width, height }
    const pool = await getPool();
    // Verify ownership
    const check = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT DashboardID FROM Dashboards WHERE DashboardID=@id AND (CreatedBy=@userId OR IsShared=1)');
    if (!check.recordset.length) return res.status(403).json({ message: 'Not authorized.' });

    for (const item of layout) {
      await pool.request()
        .input('instanceId', sql.Int, item.instanceId)
        .input('dashId', sql.Int, req.params.id)
        .input('x', sql.Int, item.x)
        .input('y', sql.Int, item.y)
        .input('w', sql.Int, item.width)
        .input('h', sql.Int, item.height)
        .query(`UPDATE WidgetInstances SET PositionX=@x, PositionY=@y, Width=@w, Height=@h
                WHERE InstanceID=@instanceId AND DashboardID=@dashId`);
    }
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE Dashboards SET UpdatedAt=GETDATE() WHERE DashboardID=@id');
    res.json({ message: 'Layout saved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save layout.' });
  }
});

// ═══════════════════════════════════════════════════════════
// WIDGET TEMPLATES
// ═══════════════════════════════════════════════════════════

router.get('/api/widgets/templates', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM WidgetTemplates ORDER BY Category, Name');
    // Group by category
    const grouped = {};
    result.recordset.forEach(t => {
      if (!grouped[t.Category]) grouped[t.Category] = [];
      grouped[t.Category].push(t);
    });
    res.json({ templates: result.recordset, grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch templates.' });
  }
});

router.get('/api/widgets/templates/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM WidgetTemplates WHERE TemplateID=@id');
    if (!result.recordset.length) return res.status(404).json({ message: 'Not found.' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch template.' });
  }
});

router.post('/api/widgets/templates', async (req, res) => {
  try {
    const { name, description, category, type, icon, defaultConfig, dataSource } = req.body;
    if (!name || !category || !type) return res.status(400).json({ message: 'Name, category, and type are required.' });
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('desc', sql.NVarChar, description || null)
      .input('category', sql.NVarChar, category)
      .input('type', sql.NVarChar, type)
      .input('icon', sql.NVarChar, icon || '📦')
      .input('config', sql.NVarChar, defaultConfig ? JSON.stringify(defaultConfig) : null)
      .input('ds', sql.NVarChar, dataSource || null)
      .input('userId', sql.Int, req.user.userId)
      .query(`INSERT INTO WidgetTemplates (Name, Description, Category, Type, Icon, DefaultConfig, DataSource, IsSystem, CreatedBy)
              OUTPUT INSERTED.*
              VALUES (@name, @desc, @category, @type, @icon, @config, @ds, 0, @userId)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create template.' });
  }
});

// ═══════════════════════════════════════════════════════════
// WIDGET INSTANCES
// ═══════════════════════════════════════════════════════════

router.post('/api/dashboards/:id/widgets', async (req, res) => {
  try {
    const { templateId, title, config, x, y, width, height, refreshInterval } = req.body;
    if (!templateId) return res.status(400).json({ message: 'templateId is required.' });
    const pool = await getPool();
    const result = await pool.request()
      .input('dashId', sql.Int, req.params.id)
      .input('templateId', sql.Int, templateId)
      .input('title', sql.NVarChar, title || null)
      .input('config', sql.NVarChar, config ? JSON.stringify(config) : null)
      .input('x', sql.Int, x || 0)
      .input('y', sql.Int, y || 0)
      .input('w', sql.Int, width || 2)
      .input('h', sql.Int, height || 2)
      .input('refresh', sql.Int, refreshInterval != null ? refreshInterval : 60)
      .query(`INSERT INTO WidgetInstances (DashboardID, TemplateID, Title, ConfigJSON, PositionX, PositionY, Width, Height, RefreshInterval)
              OUTPUT INSERTED.*
              VALUES (@dashId, @templateId, @title, @config, @x, @y, @w, @h, @refresh)`);
    // Also fetch template info
    const inst = result.recordset[0];
    const tmpl = await pool.request()
      .input('tid', sql.Int, templateId)
      .query('SELECT Name AS TemplateName, Type, Icon AS TemplateIcon, Category, DefaultConfig, DataSource FROM WidgetTemplates WHERE TemplateID=@tid');
    res.status(201).json({ ...inst, ...tmpl.recordset[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add widget.' });
  }
});

router.put('/api/widgets/instances/:instanceId', async (req, res) => {
  try {
    const { title, config, refreshInterval } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.instanceId)
      .input('title', sql.NVarChar, title || null)
      .input('config', sql.NVarChar, config ? JSON.stringify(config) : null)
      .input('refresh', sql.Int, refreshInterval != null ? refreshInterval : 60)
      .query('UPDATE WidgetInstances SET Title=@title, ConfigJSON=@config, RefreshInterval=@refresh WHERE InstanceID=@id');
    res.json({ message: 'Updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update widget instance.' });
  }
});

router.delete('/api/widgets/instances/:instanceId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.instanceId)
      .query('DELETE FROM WidgetInstances WHERE InstanceID=@id');
    res.json({ message: 'Removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove widget.' });
  }
});

// ═══════════════════════════════════════════════════════════
// WIDGET VARIABLES
// ═══════════════════════════════════════════════════════════

router.get('/api/widgets/variables', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT wv.*, u.Username AS CreatedByName,
              (SELECT COUNT(*) FROM WidgetInstances WHERE ConfigJSON LIKE '%{{' + wv.Name + '}}%') AS ReferenceCount
              FROM WidgetVariables wv
              LEFT JOIN Users u ON wv.CreatedBy = u.UserID
              ORDER BY wv.Category, wv.Name`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch variables.' });
  }
});

router.post('/api/widgets/variables', async (req, res) => {
  try {
    const { name, displayName, value, type, category, description } = req.body;
    if (!name || !displayName || value == null) return res.status(400).json({ message: 'Name, displayName, and value are required.' });
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('display', sql.NVarChar, displayName)
      .input('value', sql.NVarChar, value)
      .input('type', sql.NVarChar, type || 'text')
      .input('category', sql.NVarChar, category || null)
      .input('desc', sql.NVarChar, description || null)
      .input('userId', sql.Int, req.user.userId)
      .query(`INSERT INTO WidgetVariables (Name, DisplayName, Value, Type, Category, Description, CreatedBy)
              OUTPUT INSERTED.*
              VALUES (@name, @display, @value, @type, @category, @desc, @userId)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message?.includes('UQ_WidgetVariables_Name')) return res.status(409).json({ message: 'Variable name already exists.' });
    console.error(err);
    res.status(500).json({ message: 'Failed to create variable.' });
  }
});

router.put('/api/widgets/variables/:id', async (req, res) => {
  try {
    const { displayName, value, type, category, description } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('display', sql.NVarChar, displayName)
      .input('value', sql.NVarChar, value)
      .input('type', sql.NVarChar, type || 'text')
      .input('category', sql.NVarChar, category || null)
      .input('desc', sql.NVarChar, description || null)
      .query(`UPDATE WidgetVariables SET DisplayName=@display, Value=@value, Type=@type, Category=@category, Description=@desc, UpdatedAt=GETDATE()
              WHERE VariableID=@id`);
    res.json({ message: 'Updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update variable.' });
  }
});

router.delete('/api/widgets/variables/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM WidgetVariables WHERE VariableID=@id');
    res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete variable.' });
  }
});

// Resolve variables in text
router.post('/api/widgets/variables/resolve', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.json({ resolved: '' });
    const pool = await getPool();
    const vars = await pool.request().query('SELECT Name, Value FROM WidgetVariables');
    let resolved = text;
    vars.recordset.forEach(v => {
      resolved = resolved.replace(new RegExp(`\\{\\{${v.Name}\\}\\}`, 'g'), v.Value);
    });
    res.json({ resolved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resolve variables.' });
  }
});

module.exports = router;
