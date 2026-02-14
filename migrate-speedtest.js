const { getPool } = require('./db');
(async () => {
  const p = await getPool();
  await p.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='SpeedTests')
    CREATE TABLE SpeedTests (
      TestID INT IDENTITY(1,1) PRIMARY KEY,
      DownloadMbps FLOAT,
      UploadMbps FLOAT,
      PingMs FLOAT,
      JitterMs FLOAT,
      ServerName NVARCHAR(200),
      ISP NVARCHAR(200),
      ExternalIP NVARCHAR(50),
      TestedAt DATETIME DEFAULT GETDATE()
    )
  `);
  console.log('SpeedTests table created.');
  process.exit();
})();
