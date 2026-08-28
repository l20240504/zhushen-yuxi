$env:DATABASE_URL = "postgresql://postgres.wgezgzrudevhbrkivwwx:gwT7zIXzFIcNXdIq@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
$env:DATABASE_SSL = "true"
node -e "import('./db.js').then(async m => { await m.initSchema(); console.log('Schema OK'); const db = (await import('./db.js')).default; const r = await db.prepare('SELECT COUNT(*) as c FROM paths').get(); console.log('Paths count:', r.c); const r2 = await db.prepare('SELECT COUNT(*) as c FROM game_settings').get(); console.log('Settings count:', r2.c); process.exit(0); })"
