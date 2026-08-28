import 'dotenv/config';
import db, { initSchema } from './db.js';
import { seedData } from './auth.js';
const pool = db._pool;

async function test() {
  try {
    console.log('1. Testing connection...');
    const res = await pool.query('SELECT NOW() as now');
    console.log('   Connected:', res.rows[0].now);

    console.log('2. Initializing schema...');
    await initSchema();
    console.log('   Schema OK');

    console.log('3. Seeding data...');
    await seedData();
    console.log('   Seed OK');

    console.log('4. Querying paths...');
    const paths = await pool.query('SELECT * FROM paths ORDER BY id');
    console.log(`   ${paths.rows.length} paths:`, paths.rows.map(r => r.name).join(', '));

    console.log('5. Querying admin...');
    const admin = await pool.query("SELECT id, username, role FROM profiles WHERE username='admin'");
    console.log('   Admin:', admin.rows[0]);

    console.log('\nAll tests passed!');
    process.exit(0);
  } catch (e) {
    console.error('TEST FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}
test();
