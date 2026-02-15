const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const { sql, getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { profileUpdateRules, changePasswordRules } = require('../middleware/validate');
const { logAudit, AUDIT } = require('../middleware/audit');
const router = express.Router();

// Avatar upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.userId}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// Get own profile
router.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .query(`SELECT UserID, Username, Email, DisplayName, Bio, Phone, Location, JobTitle, Department, AvatarPath, CreatedAt
              FROM Users WHERE UserID = @UserID`);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'User not found.' });

    // Get roles and groups
    const roles = await pool.request().input('UserID', sql.Int, req.user.userId)
      .query('SELECT r.RoleName FROM Roles r INNER JOIN UserRoles ur ON r.RoleID = ur.RoleID WHERE ur.UserID = @UserID');
    const groups = await pool.request().input('UserID', sql.Int, req.user.userId)
      .query('SELECT g.GroupName FROM Groups g INNER JOIN UserGroups ug ON g.GroupID = ug.GroupID WHERE ug.UserID = @UserID');

    res.json({
      ...result.recordset[0],
      roles: roles.recordset.map(r => r.RoleName),
      groups: groups.recordset.map(g => g.GroupName)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load profile.' });
  }
});

// Update own profile
router.put('/api/profile', authenticateToken, ...profileUpdateRules, async (req, res) => {
  const { displayName, bio, phone, location, jobTitle, department } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .input('DisplayName', sql.NVarChar, displayName || null)
      .input('Bio', sql.NVarChar, bio || null)
      .input('Phone', sql.NVarChar, phone || null)
      .input('Location', sql.NVarChar, location || null)
      .input('JobTitle', sql.NVarChar, jobTitle || null)
      .input('Department', sql.NVarChar, department || null)
      .query(`UPDATE Users SET DisplayName=@DisplayName, Bio=@Bio, Phone=@Phone,
              Location=@Location, JobTitle=@JobTitle, Department=@Department
              WHERE UserID=@UserID`);
    logAudit(AUDIT.PROFILE_UPDATED, req.user.userId, 'Profile updated', req);
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

// Upload avatar
router.post('/api/profile/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  try {
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .input('AvatarPath', sql.NVarChar, avatarPath)
      .query('UPDATE Users SET AvatarPath=@AvatarPath WHERE UserID=@UserID');
    logAudit(AUDIT.AVATAR_UPLOADED, req.user.userId, 'Avatar uploaded', req);
    res.json({ message: 'Avatar uploaded.', avatarPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload avatar.' });
  }
});

// Change own password
router.post('/api/profile/change-password', authenticateToken, ...changePasswordRules, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .query('SELECT PasswordHash FROM Users WHERE UserID=@UserID');
    const valid = await bcrypt.compare(currentPassword, result.recordset[0].PasswordHash);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .input('PasswordHash', sql.NVarChar, hashed)
      .query('UPDATE Users SET PasswordHash=@PasswordHash, ForcePasswordChange=0 WHERE UserID=@UserID');
    logAudit(AUDIT.PASSWORD_CHANGE, req.user.userId, 'Password changed', req);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to change password.' });
  }
});

module.exports = router;
