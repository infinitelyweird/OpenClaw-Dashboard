const { getPool, sql } = require('./db');

(async () => {
  const p = await getPool();

  // Add profile columns to Users table
  await p.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'DisplayName')
      ALTER TABLE Users ADD DisplayName NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Bio')
      ALTER TABLE Users ADD Bio NVARCHAR(500) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Phone')
      ALTER TABLE Users ADD Phone NVARCHAR(30) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Location')
      ALTER TABLE Users ADD Location NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'JobTitle')
      ALTER TABLE Users ADD JobTitle NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Department')
      ALTER TABLE Users ADD Department NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'AvatarPath')
      ALTER TABLE Users ADD AvatarPath NVARCHAR(255) NULL;
  `);
  console.log('Profile columns added to Users table.');
  process.exit();
})();
