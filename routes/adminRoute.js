const express = require('express');
const bcrypt = require('bcrypt');
const { sql, getPool } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// All admin routes require auth + admin role
router.use('/api/admin', authenticateToken, requireAdmin);

// ─── USERS ───────────────────────────────────────────────

// List all users (with roles and groups)
router.get('/api/admin/users', async (req, res) => {
  try {
    const pool = await getPool();
    const users = await pool.request().query(`
      SELECT u.UserID, u.Username, u.Email, u.IsApproved, u.CreatedAt,
        (SELECT STRING_AGG(r.RoleName, ', ') FROM Roles r
         INNER JOIN UserRoles ur ON r.RoleID = ur.RoleID WHERE ur.UserID = u.UserID) AS Roles,
        (SELECT STRING_AGG(g.GroupName, ', ') FROM Groups g
         INNER JOIN UserGroups ug ON g.GroupID = ug.GroupID WHERE ug.UserID = u.UserID) AS Groups
      FROM Users u ORDER BY u.CreatedAt DESC
    `);
    res.json(users.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load users.' });
  }
});

// Get pending (unapproved) users
router.get('/api/admin/users/pending', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT UserID, Username, Email, CreatedAt FROM Users WHERE IsApproved = 0 ORDER BY CreatedAt DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load pending users.' });
  }
});

// Approve user
router.post('/api/admin/users/:id/approve', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.params.id)
      .query('UPDATE Users SET IsApproved = 1 WHERE UserID = @UserID');

    // Assign default "User" role if not already assigned
    await pool.request()
      .input('UserID2', sql.Int, req.params.id)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM UserRoles ur INNER JOIN Roles r ON ur.RoleID = r.RoleID WHERE ur.UserID = @UserID2 AND r.RoleName = 'User')
        BEGIN
          INSERT INTO UserRoles (UserID, RoleID) SELECT @UserID2, RoleID FROM Roles WHERE RoleName = 'User'
        END
      `);

    // Assign to "Standard User" group by default
    await pool.request()
      .input('UserID3', sql.Int, req.params.id)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM UserGroups ug INNER JOIN Groups g ON ug.GroupID = g.GroupID WHERE ug.UserID = @UserID3 AND g.GroupName = 'Standard User')
        BEGIN
          INSERT INTO UserGroups (UserID, GroupID) SELECT @UserID3, GroupID FROM Groups WHERE GroupName = 'Standard User'
        END
      `);

    res.json({ message: 'User approved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to approve user.' });
  }
});

// Deny (delete) user
router.post('/api/admin/users/:id/deny', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);

    // Prevent deleting the admin account
    const check = await pool.request().input('UserID', sql.Int, id)
      .query("SELECT Username FROM Users WHERE UserID = @UserID");
    if (check.recordset.length > 0 && check.recordset[0].Username === 'admin') {
      return res.status(403).json({ message: 'The admin account cannot be deleted.' });
    }

    await pool.request().input('UserID', sql.Int, id).query('DELETE FROM UserRoles WHERE UserID = @UserID');
    await pool.request().input('UserID', sql.Int, id).query('DELETE FROM UserGroups WHERE UserID = @UserID');
    await pool.request().input('UserID', sql.Int, id).query('DELETE FROM Users WHERE UserID = @UserID');
    res.json({ message: 'User denied and removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to deny user.' });
  }
});

// Update user (username, email)
router.put('/api/admin/users/:id', async (req, res) => {
  const { username, email } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.params.id)
      .input('Username', sql.NVarChar, username)
      .input('Email', sql.NVarChar, email)
      .query('UPDATE Users SET Username = @Username, Email = @Email WHERE UserID = @UserID');
    res.json({ message: 'User updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update user.' });
  }
});

// Reset user password
router.post('/api/admin/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  try {
    const pool = await getPool();
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('UserID', sql.Int, req.params.id)
      .input('PasswordHash', sql.NVarChar, hashed)
      .query('UPDATE Users SET PasswordHash = @PasswordHash WHERE UserID = @UserID');
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
});

// Toggle user approval status
router.post('/api/admin/users/:id/toggle-approval', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.params.id)
      .query('UPDATE Users SET IsApproved = CASE WHEN IsApproved = 1 THEN 0 ELSE 1 END WHERE UserID = @UserID');
    res.json({ message: 'User approval toggled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to toggle approval.' });
  }
});

// ─── ROLES ───────────────────────────────────────────────

// List all roles
router.get('/api/admin/roles', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT RoleID, RoleName FROM Roles ORDER BY RoleName');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load roles.' });
  }
});

// Create role
router.post('/api/admin/roles', async (req, res) => {
  const { roleName } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('RoleName', sql.NVarChar, roleName)
      .query('INSERT INTO Roles (RoleName) VALUES (@RoleName)');
    res.json({ message: 'Role created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create role.' });
  }
});

// Delete role
router.delete('/api/admin/roles/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);
    await pool.request().input('RoleID', sql.Int, id).query('DELETE FROM UserRoles WHERE RoleID = @RoleID');
    await pool.request().input('RoleID', sql.Int, id).query('DELETE FROM GroupRoles WHERE RoleID = @RoleID');
    await pool.request().input('RoleID', sql.Int, id).query('DELETE FROM Roles WHERE RoleID = @RoleID');
    res.json({ message: 'Role deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete role.' });
  }
});

// Assign role to user
router.post('/api/admin/users/:userId/roles/:roleId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.params.userId)
      .input('RoleID', sql.Int, req.params.roleId)
      .query('IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserID=@UserID AND RoleID=@RoleID) INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID)');
    res.json({ message: 'Role assigned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to assign role.' });
  }
});

// Remove role from user
router.delete('/api/admin/users/:userId/roles/:roleId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.params.userId)
      .input('RoleID', sql.Int, req.params.roleId)
      .query('DELETE FROM UserRoles WHERE UserID=@UserID AND RoleID=@RoleID');
    res.json({ message: 'Role removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove role.' });
  }
});

// ─── GROUPS ──────────────────────────────────────────────

// List all groups (with their roles)
router.get('/api/admin/groups', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT g.GroupID, g.GroupName,
        (SELECT STRING_AGG(r.RoleName, ', ') FROM Roles r
         INNER JOIN GroupRoles gr ON r.RoleID = gr.RoleID WHERE gr.GroupID = g.GroupID) AS Roles
      FROM Groups g ORDER BY g.GroupName
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load groups.' });
  }
});

// Create group
router.post('/api/admin/groups', async (req, res) => {
  const { groupName } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('GroupName', sql.NVarChar, groupName)
      .query('INSERT INTO Groups (GroupName) VALUES (@GroupName)');
    res.json({ message: 'Group created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create group.' });
  }
});

// Delete group
router.delete('/api/admin/groups/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);
    await pool.request().input('GroupID', sql.Int, id).query('DELETE FROM UserGroups WHERE GroupID = @GroupID');
    await pool.request().input('GroupID', sql.Int, id).query('DELETE FROM GroupRoles WHERE GroupID = @GroupID');
    await pool.request().input('GroupID', sql.Int, id).query('DELETE FROM Groups WHERE GroupID = @GroupID');
    res.json({ message: 'Group deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete group.' });
  }
});

// Add user to group
router.post('/api/admin/users/:userId/groups/:groupId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.params.userId)
      .input('GroupID', sql.Int, req.params.groupId)
      .query('IF NOT EXISTS (SELECT 1 FROM UserGroups WHERE UserID=@UserID AND GroupID=@GroupID) INSERT INTO UserGroups (UserID, GroupID) VALUES (@UserID, @GroupID)');
    res.json({ message: 'User added to group.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add user to group.' });
  }
});

// Remove user from group
router.delete('/api/admin/users/:userId/groups/:groupId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.params.userId)
      .input('GroupID', sql.Int, req.params.groupId)
      .query('DELETE FROM UserGroups WHERE UserID=@UserID AND GroupID=@GroupID');
    res.json({ message: 'User removed from group.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove user from group.' });
  }
});

// Add role to group
router.post('/api/admin/groups/:groupId/roles/:roleId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('GroupID', sql.Int, req.params.groupId)
      .input('RoleID', sql.Int, req.params.roleId)
      .query('IF NOT EXISTS (SELECT 1 FROM GroupRoles WHERE GroupID=@GroupID AND RoleID=@RoleID) INSERT INTO GroupRoles (GroupID, RoleID) VALUES (@GroupID, @RoleID)');
    res.json({ message: 'Role added to group.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add role to group.' });
  }
});

// Remove role from group
router.delete('/api/admin/groups/:groupId/roles/:roleId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('GroupID', sql.Int, req.params.groupId)
      .input('RoleID', sql.Int, req.params.roleId)
      .query('DELETE FROM GroupRoles WHERE GroupID=@GroupID AND RoleID=@RoleID');
    res.json({ message: 'Role removed from group.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove role from group.' });
  }
});

// ─── USER DETAIL (roles + groups for a specific user) ────

router.get('/api/admin/users/:id/details', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);

    const user = await pool.request().input('UserID', sql.Int, id)
      .query('SELECT UserID, Username, Email, IsApproved, CreatedAt FROM Users WHERE UserID = @UserID');

    const roles = await pool.request().input('UserID', sql.Int, id)
      .query('SELECT r.RoleID, r.RoleName FROM Roles r INNER JOIN UserRoles ur ON r.RoleID = ur.RoleID WHERE ur.UserID = @UserID');

    const groups = await pool.request().input('UserID', sql.Int, id)
      .query('SELECT g.GroupID, g.GroupName FROM Groups g INNER JOIN UserGroups ug ON g.GroupID = ug.GroupID WHERE ug.UserID = @UserID');

    if (user.recordset.length === 0) return res.status(404).json({ message: 'User not found.' });

    res.json({
      ...user.recordset[0],
      roles: roles.recordset,
      groups: groups.recordset
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load user details.' });
  }
});

// ─── PERMISSIONS ─────────────────────────────────────────

// List all permissions
router.get('/api/admin/permissions', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT PermissionID, PermissionName, Description FROM Permissions ORDER BY PermissionName');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load permissions.' });
  }
});

// Get permissions for a role
router.get('/api/admin/roles/:id/permissions', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('RoleID', sql.Int, req.params.id)
      .query(`SELECT p.PermissionID, p.PermissionName, p.Description
              FROM Permissions p INNER JOIN RolePermissions rp ON p.PermissionID = rp.PermissionID
              WHERE rp.RoleID = @RoleID ORDER BY p.PermissionName`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load role permissions.' });
  }
});

// Assign permission to role
router.post('/api/admin/roles/:roleId/permissions/:permId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('RoleID', sql.Int, req.params.roleId)
      .input('PermissionID', sql.Int, req.params.permId)
      .query('IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleID=@RoleID AND PermissionID=@PermissionID) INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (@RoleID, @PermissionID)');
    res.json({ message: 'Permission assigned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to assign permission.' });
  }
});

// Revoke permission from role
router.delete('/api/admin/roles/:roleId/permissions/:permId', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('RoleID', sql.Int, req.params.roleId)
      .input('PermissionID', sql.Int, req.params.permId)
      .query('DELETE FROM RolePermissions WHERE RoleID=@RoleID AND PermissionID=@PermissionID');
    res.json({ message: 'Permission revoked.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to revoke permission.' });
  }
});

// Get effective permissions for a user (direct roles + group roles)
router.get('/api/admin/users/:id/permissions', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.params.id)
      .query(`
        SELECT DISTINCT p.PermissionID, p.PermissionName, p.Description
        FROM Permissions p
        INNER JOIN RolePermissions rp ON p.PermissionID = rp.PermissionID
        WHERE rp.RoleID IN (
          SELECT RoleID FROM UserRoles WHERE UserID = @UserID
          UNION
          SELECT gr.RoleID FROM GroupRoles gr INNER JOIN UserGroups ug ON gr.GroupID = ug.GroupID WHERE ug.UserID = @UserID
        )
        ORDER BY p.PermissionName
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load user permissions.' });
  }
});

module.exports = router;
