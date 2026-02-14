const { getPool, sql } = require('./db');

(async () => {
  const p = await getPool();

  // Create Permissions + RolePermissions tables
  await p.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='Permissions')
    CREATE TABLE Permissions (
      PermissionID INT IDENTITY(1,1) PRIMARY KEY,
      PermissionName NVARCHAR(100) NOT NULL UNIQUE,
      Description NVARCHAR(255)
    );
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='RolePermissions')
    CREATE TABLE RolePermissions (
      RoleID INT NOT NULL FOREIGN KEY REFERENCES Roles(RoleID),
      PermissionID INT NOT NULL FOREIGN KEY REFERENCES Permissions(PermissionID),
      PRIMARY KEY (RoleID, PermissionID)
    );
  `);
  console.log('Tables created.');

  // Seed permissions
  const perms = [
    ['users.view', 'View user list'],
    ['users.create', 'Create new users'],
    ['users.update', 'Edit user details'],
    ['users.delete', 'Delete users'],
    ['users.approve', 'Approve/deny registrations'],
    ['users.reset-password', 'Reset user passwords'],
    ['roles.view', 'View roles'],
    ['roles.create', 'Create roles'],
    ['roles.update', 'Update roles'],
    ['roles.delete', 'Delete roles'],
    ['groups.view', 'View groups'],
    ['groups.create', 'Create groups'],
    ['groups.update', 'Update groups and membership'],
    ['groups.delete', 'Delete groups'],
    ['permissions.view', 'View permissions'],
    ['permissions.assign', 'Assign permissions to roles'],
    ['permissions.revoke', 'Revoke permissions from roles'],
    ['tasks.view', 'View tasks'],
    ['tasks.create', 'Create tasks'],
    ['tasks.update', 'Update tasks'],
    ['tasks.delete', 'Delete tasks'],
    ['dashboard.view', 'View dashboard'],
  ];
  for (const [name, desc] of perms) {
    await p.request()
      .input('N', sql.NVarChar, name)
      .input('D', sql.NVarChar, desc)
      .query("IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionName=@N) INSERT INTO Permissions (PermissionName, Description) VALUES (@N, @D)");
  }
  console.log('Permissions seeded:', perms.length);

  // Assign ALL permissions to Administrator role
  await p.request().query(`
    INSERT INTO RolePermissions (RoleID, PermissionID)
    SELECT r.RoleID, p.PermissionID FROM Roles r CROSS JOIN Permissions p
    WHERE r.RoleName = 'Administrator'
    AND NOT EXISTS (SELECT 1 FROM RolePermissions rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID)
  `);
  console.log('All permissions assigned to Administrator.');

  // Assign basic permissions to User role
  const userPerms = ['tasks.view', 'tasks.create', 'tasks.update', 'dashboard.view'];
  for (const pn of userPerms) {
    await p.request()
      .input('P', sql.NVarChar, pn)
      .query(`
        INSERT INTO RolePermissions (RoleID, PermissionID)
        SELECT r.RoleID, p.PermissionID FROM Roles r, Permissions p
        WHERE r.RoleName = 'User' AND p.PermissionName = @P
        AND NOT EXISTS (SELECT 1 FROM RolePermissions rp WHERE rp.RoleID = r.RoleID AND rp.PermissionID = p.PermissionID)
      `);
  }
  console.log('Basic permissions assigned to User role.');

  // Create Standard User group with User role
  await p.request().query("IF NOT EXISTS (SELECT 1 FROM Groups WHERE GroupName='Standard User') INSERT INTO Groups (GroupName) VALUES ('Standard User')");
  await p.request().query(`
    INSERT INTO GroupRoles (GroupID, RoleID)
    SELECT g.GroupID, r.RoleID FROM Groups g, Roles r
    WHERE g.GroupName = 'Standard User' AND r.RoleName = 'User'
    AND NOT EXISTS (SELECT 1 FROM GroupRoles gr WHERE gr.GroupID = g.GroupID AND gr.RoleID = r.RoleID)
  `);
  console.log('Standard User group created with User role.');

  process.exit();
})();
