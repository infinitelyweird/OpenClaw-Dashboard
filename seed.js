const bcrypt = require('bcrypt');
const { sql, getPool } = require('./db');

async function seed() {
  try {
    const pool = await getPool();

    // Seed roles
    const roles = ['Administrator', 'User', 'Manager', 'Viewer'];
    for (const role of roles) {
      await pool.request()
        .input('RoleName', sql.NVarChar, role)
        .query(`IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = @RoleName) INSERT INTO Roles (RoleName) VALUES (@RoleName)`);
    }
    console.log('Roles seeded:', roles.join(', '));

    // Seed default admin user
    const adminUsername = 'admin';
    const adminEmail = 'admin@infinitelyweird.com';
    const adminPassword = await bcrypt.hash('admin', 10);

    const existing = await pool.request()
      .input('Username', sql.NVarChar, adminUsername)
      .query('SELECT UserID FROM Users WHERE Username = @Username');

    let adminId;
    if (existing.recordset.length === 0) {
      const result = await pool.request()
        .input('Username', sql.NVarChar, adminUsername)
        .input('PasswordHash', sql.NVarChar, adminPassword)
        .input('Email', sql.NVarChar, adminEmail)
        .query(`INSERT INTO Users (Username, PasswordHash, Email, IsApproved, CreatedAt) 
                OUTPUT INSERTED.UserID
                VALUES (@Username, @PasswordHash, @Email, 1, GETDATE())`);
      adminId = result.recordset[0].UserID;
      console.log('Admin user created (username: admin, password: admin)');
    } else {
      adminId = existing.recordset[0].UserID;
      console.log('Admin user already exists.');
    }

    // Assign Administrator role to admin user
    const adminRole = await pool.request()
      .query("SELECT RoleID FROM Roles WHERE RoleName = 'Administrator'");
    if (adminRole.recordset.length > 0) {
      await pool.request()
        .input('UserID', sql.Int, adminId)
        .input('RoleID', sql.Int, adminRole.recordset[0].RoleID)
        .query('IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserID=@UserID AND RoleID=@RoleID) INSERT INTO UserRoles (UserID, RoleID) VALUES (@UserID, @RoleID)');
      console.log('Administrator role assigned to admin user.');
    }

    console.log('Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
