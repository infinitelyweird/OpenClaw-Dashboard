const sql = require('mssql');

const dbConfig = {
  user: 'openclaw',
  password: 'ix4bw4riEiDrDMxwmNoD',
  server: '192.168.0.100',
  database: 'TaskDashboard',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: 'MSSQLSERVER01'
  }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
  }
  return pool;
}

module.exports = { sql, dbConfig, getPool };
