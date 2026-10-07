import 'dotenv/config';
import * as sql from 'mssql';

async function testConnection() {
  const server = process.env.DB_SERVER || 'localhost';
  const port = Number(process.env.DB_PORT || 1433);
  const database = process.env.DB_NAME || 'TmoGradingQueue';
  const user = process.env.DB_USER || 'tmo_app';
  const password = process.env.DB_PASSWORD || '';
  const encrypt = process.env.DB_ENCRYPT !== 'false';
  const trustServerCertificate = process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false';

  console.log('==============================================');
  console.log('  TMO Grading Queue - DB Connection Check');
  console.log('==============================================');
  console.log(`Server:   ${server}:${port}`);
  console.log(`Database: ${database}`);
  console.log(`User:     ${user}`);
  console.log(`Encrypt:  ${encrypt}`);
  console.log(`TrustCert:${trustServerCertificate}`);
  console.log('----------------------------------------------');
  console.log('Attempting to connect to SQL Server...');

  try {
    const pool = await new sql.ConnectionPool({
      server,
      port,
      database,
      user,
      password,
      options: {
        encrypt,
        trustServerCertificate,
        connectTimeout: 5000,
      },
    }).connect();

    console.log('SUCCESS: Connected to database successfully!');

    const result = await pool.request().query`
      SELECT @@VERSION AS [Version], DB_NAME() AS [CurrentDb], GETDATE() AS [ServerTime]
    `;
    console.log(`Current DB:   ${result.recordset[0].CurrentDb}`);
    console.log(`Server Time:  ${result.recordset[0].ServerTime}`);

    const tables = await pool.request().query<{ TABLE_NAME: string }>`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
    `;
    console.log(`Tables found (${tables.recordset.length}):`);
    for (const t of tables.recordset) {
      console.log(`  - ${t.TABLE_NAME}`);
    }

    await pool.close();
    console.log('----------------------------------------------');
    console.log('Connection test completed with SUCCESS.');
    process.exit(0);
  } catch (err: any) {
    console.error('ERROR: Failed to connect to SQL Server!');
    console.error(`Code:    ${err.code || 'N/A'}`);
    console.error(`Message: ${err.message}`);
    console.log('----------------------------------------------');
    console.log('Checklist:');
    console.log('1. Ensure SQL Server service (MSSQLSERVER) is running:');
    console.log('   In Admin PowerShell run: Start-Service MSSQLSERVER');
    console.log('2. Check TCP/IP protocol is enabled in SQL Server Configuration Manager (Port 1433).');
    console.log('3. Verify credentials in backend/.env match SQL Server logins.');
    process.exit(1);
  }
}

testConnection();
