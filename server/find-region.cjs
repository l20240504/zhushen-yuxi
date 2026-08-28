const { Pool } = require('pg');

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-central-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'ap-south-1', 'sa-east-1', 'ca-central-1'
];

const password = 'gwT7zIXzFIcNXdIq';
const projectId = 'wgezgzrudevhbrkivwwx';

(async () => {
  for (const region of regions) {
    const connStr = `postgresql://postgres.${projectId}:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const pool = new Pool({
      connectionString: connStr,
      max: 1,
      connectionTimeoutMillis: 8000,
      ssl: { rejectUnauthorized: false }
    });
    try {
      const res = await pool.query('SELECT 1 as ok');
      console.log(`SUCCESS: region=${region}`);
      console.log(`CONN_STR=${connStr}`);
      await pool.end();
      process.exit(0);
    } catch (e) {
      console.log(`FAIL: region=${region} err=${e.message.substring(0,80)}`);
      await pool.end();
    }
  }
  console.log('No region worked');
  process.exit(1);
})();
