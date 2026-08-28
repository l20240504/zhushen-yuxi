$env:DATABASE_URL = "postgresql://postgres:gwT7zIXzFIcNXdIq@db.wgezgzrudevhbrkivwwx.supabase.co:5432/postgres"
$env:DATABASE_SSL = "true"
node -e "import('./db.js').then(async m => { await m.initSchema(); console.log('Schema initialized OK'); process.exit(0); })"
